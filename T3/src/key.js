import * as THREE from 'three';
import { CSG } from '../../libs/other/CSGMesh.js';

export let platform, key, redKey, yellowKey, yellowKeySupport, redKeySupport;
export let platformRising = false;
let platformTargetY;
let platformToElevate;
let keyFading = false;
let keyFadeSpeed = 0.02;
let emissiveBoost = 0.02;

// Som da chave
const keySound = new Audio('../0_assetsT3/sounds/chave.wav');
keySound.load(); // Pré-carrega o som para evitar delay

// CONSTRUÇÃO DE OBJETO CHAVE -------------------------------------------------------------------------------

// Função para construir uma chave usando CSG
export function buildKey(position, scene, color, brightnessColor, shininess, collisionObjects) {

    //Cria uma matriz 4x4, que representa: posicao, rotacao, escala e transformações no espaço 3D
    //Aqui, ela é uma matriz identidade pq nao se aplica as transformações ao mesh inicial
    let auxMatrix = new THREE.Matrix4();

    //Cria as formas básicas para a chave: um cubo e três cilindros (x, y, z)
    const cubeMesh = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2));
    updateObject(cubeMesh);

    const cylinderX = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 2, 32));
    cylinderX.rotation.z = Math.PI / 2;
    updateObject(cylinderX);

    const cylinderY = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 2, 32));
    cylinderY.rotation.x = Math.PI / 2;
    updateObject(cylinderY);

    const cylinderZ = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 2, 32));
    cylinderZ.rotation.x = 0;
    updateObject(cylinderZ);

    //Converte as malhas para CSG, ou seja, para uma representação de CSG
    let csgCube = CSG.fromMesh(cubeMesh);
    let csgCylinderX = CSG.fromMesh(cylinderX);
    let csgCylinderY = CSG.fromMesh(cylinderY);
    let csgCylinderZ = CSG.fromMesh(cylinderZ);

    //Realiza as operações de subtração para criar a forma da chave
    let csgObject = csgCube.subtract(csgCylinderX);
    csgObject = csgObject.subtract(csgCylinderY);
    csgObject = csgObject.subtract(csgCylinderZ);

    //Cria a malha final da chave a partir do objeto CSG, converte para uma malha
    let mesh = CSG.toMesh(csgObject, auxMatrix);
    mesh.material = new THREE.MeshPhongMaterial({
        color: color,
        transparent: true,
        opacity: 1,
        emissive: brightnessColor, 
        emissiveIntensity: 0.3,
        shininess: shininess
    });
    mesh.position.set(position.x, position.y, position.z);

    scene.add(mesh);

    collisionObjects.push(mesh);

    mesh.userData = {
        fading: false
    };

    return mesh;
}


// Função para atualizar a matriz de um objeto
export function updateObject(mesh) {
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();
}



// CONSTRUÇÃO DE PEQUENAS PLATAFORMAS COM CHAVE -----------------------------------------------------------------

//Função para criar uma plataforma com uma chave (Area 1)
export function createPlatformWithKey(scene, area, size, color, colorName, collisionObjects, reflectiveColor) {

    // Cria a plataforma
    platform = new THREE.Mesh(
        new THREE.CylinderGeometry(1.5, 1.5, 0.4, 24),
        new THREE.MeshLambertMaterial({ color: color })
    );

    //Posiciona a plataforma em orientação a área que veio como parametro
    platform.position.set(area.userData.x, area.userData.y - 2, area.userData.z);
    platform.name = "platformWithKeyColor" + colorName; // nome da plataforma com a cor

    //Adiciona a chave, criada no centro da plataforma
    key = buildKey({ x: 0, y: -10, z: 0 }, scene, colorName, "0xff6699", 60, collisionObjects);
    platform.add(key);
    key.position.set(0, 1.5, 0); // posiciona de acordo com a plataforma
    key.name = colorName + "KeyOnPlatform";
    key.userData.fading = false; // para controle de fading da chave
    
    if (key.name === "RedKeyOnPlatform") {
        redKey = key; // guarda a chave vermelha 
    }

    scene.add(platform);
    collisionObjects.push(platform);
    platform.castShadow = true;
    platform.receiveShadow = true;
    redKeySupport = platform;

    return platform;
}

// Função para criar uma plataforma, recebendo uma chave (Area 2)
export function addRectangleWithKey(blockMesh, receivedKey, platform) {

    let keyBlock = new THREE.Group();
    yellowKey = receivedKey;

    keyBlock.add(blockMesh);
    keyBlock.add(receivedKey);
    receivedKey.position.set(0, blockMesh.children[1].geometry.parameters.height - 4, 0);
    platform.add(keyBlock);
    receivedKey.visible = true;
    keyBlock.castShadow = true;
    keyBlock.receiveShadow = true;

    // Posiciona o grupo todo (bloco + chave)
    keyBlock.position.set(0, 0, 0);

    keyBlock.name = "rectangleWithKey";

    return keyBlock;

}



// FUNÇÕES DE COMPORTAMENTO DE PLATAFORMA E CHAVE -----------------------------------------------------------------

// Função para levantar a plataforma até uma certa altura
// Ativar a subida de fora
export function raisePlatformTo(y, receivedPlatform) {
    platformRising = true;
    platformTargetY = y;
    platformToElevate = receivedPlatform;
}

// Função para atualizar o ambiente, incluindo a animação da plataforma
// Chamada no loop de renderização, verifica se a plataforma está subindo e atualiza sua posição
export function updatePlatformMovement() {
    if (!platformToElevate || !platformRising) return;

    platformToElevate.position.y = THREE.MathUtils.lerp(platformToElevate.position.y, platformTargetY, 0.05);

    if (Math.abs(platformToElevate.position.y - platformTargetY) < 0.01) {
        platformToElevate.position.y = platformTargetY;
        platformRising = false;
    }
}



// FUNÇÕES DE COMPORTAMENTO JOGADOR E CHAVE -----------------------------------------------------------------

// Função para verificar se o jogador está próximo o suficiente da chave e pode coletá-la
export function checkKeyPickup(controls, platform, receivedKey, scene) {

    if (!receivedKey) return;

    const playerWorldPos = new THREE.Vector3();
    const platWorldPos = new THREE.Vector3();

    controls.getObject().getWorldPosition(playerWorldPos);
    platform.getWorldPosition(platWorldPos);

    const distance = playerWorldPos.distanceTo(platWorldPos);

    const pickupDistance = 8;

    if (!receivedKey.userData.fading && distance < pickupDistance && receivedKey.visible) {

        //Setar que o jogador pegou a chave
        if (receivedKey.name === "RedKeyOnPlatform") {
            controls.getObject().hasRedKey = true;

        } else if (receivedKey.name === "yellowKey") {
            controls.getObject().hasYellowKey = true;
        }
        
        // Toca o som de pegar a chave
        keySound.play();
        
        //Começa o processo de fading da chave
        receivedKey.userData.fading = true;
    }


    // Se a chave está em fading, diminui a opacidade e a intensidade do brilho individualmente, sem afetar as outras
    if (receivedKey.userData.fading) {
        receivedKey.material.opacity -= keyFadeSpeed; //reduz conforme a velocidade de fading
        receivedKey.material.emissiveIntensity = Math.max(0, receivedKey.material.emissiveIntensity - emissiveBoost); // reduz a intensidade do brilho

        if (receivedKey.material.opacity <= 0) { // se a opacidade chegar a 0, remove visualmente a chave da cena
            receivedKey.visible = false;
            receivedKey.userData.fading = false;
        }
    }


}