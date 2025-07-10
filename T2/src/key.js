import * as THREE from 'three';
import { CSG } from '../../libs/other/CSGMesh.js';

export let platform, key, redKey, yellowKey;
export let platformRising = false;
let platformGoalY = 0;
let keyFading = false;
let keyFadeSpeed = 0.02;
let emissiveBoost = 0.02;

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
        emissive: brightnessColor, // vermelho
        emissiveIntensity: 0.3,
        shininess: shininess
    });
    mesh.position.set(position.x, position.y, position.z);

    scene.add(mesh);
    collisionObjects.push(mesh);

    return mesh;
}

//Função para criar uma plataforma com uma chave na Area 1
export function createPlatformWithKey(scene, area, size, color, colorName, collisionObjects, reflectiveColor) {

    // Cria a plataforma
    platform = new THREE.Mesh(
        new THREE.CylinderGeometry(1.5, 1.5, 0.4, 24),
        new THREE.MeshLambertMaterial({ color: color })
    );
    //console.log("nome da cor:", colorName);

    //Posiciona a plataforma em orientação a área que veio como parametro
    platform.position.set(area.userData.x, area.userData.y - 2, area.userData.z);
    platform.name = "platformWithKeyColor" + colorName; // nome da plataforma com a cor

    //Adiciona a chave, criada no centro da plataforma
    key = buildKey({ x: 0, y: -10, z: 0 }, scene, colorName, "0xff6699", 60, collisionObjects);
    platform.add(key);
    key.position.set(0, 1.5, 0); // posiciona de acordo com a plataforma
    key.name = colorName + "KeyOnPlatform";

    scene.add(platform);
    collisionObjects.push(platform);

    return platform;
}

// Função para criar uma plataforma com uma chave na Area 2
export function addRectangleWithKey(blockMesh, receivedKey, platform) {

    let keyBlock = new THREE.Group();
    keyBlock.add(blockMesh);

    // Ajusta a posição da chave para ficar sobre o bloco
    //console.log("dados do blockMesh:", blockMesh);
    receivedKey.position.set(0, blockMesh.userData.height / 2 + 1, 0);

    keyBlock.add(receivedKey);
    platform.add(keyBlock);
    receivedKey.visible = false; // Torna a chave visível

    // Posiciona o grupo todo (bloco + chave)
    keyBlock.position.set(0, 12, 0);

    keyBlock.name = "rectangleWithKey";

    return keyBlock;

}

// Função para levantar a plataforma
// Esta função é chamada quando a tecla 'E' é pressionada, mas eh teste
export function raisePlatform() {
    if (!platform) return;
    platformGoalY = platform.position.y + 7;
    platformRising = true;
    if (key) key.visible = true;
}

// Função para atualizar o ambiente, incluindo a animação da plataforma
// Chamada no loop de renderização, verifica se a plataforma está subindo e atualiza sua posição
export function updatePlatform() {
    if (!platform) return;

    if (platformRising) {
        platform.position.y = THREE.MathUtils.lerp(platform.position.y, platformGoalY, 0.05);
        if (Math.abs(platform.position.y - platformGoalY) < 0.01) {
            platform.position.y = platformGoalY;
            platformRising = false;
        }
    }
}

// Função para atualizar a matriz de um objeto
export function updateObject(mesh) {
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();
}

// Função para verificar se o jogador está próximo da chave e pode coletá-la
export function checkKeyPickup(controls, platform, key, scene) {

    if (!key) return;

    let player = controls.getObject();
    const distance = player.position.distanceTo(platform.position);
    const pickupDistance = 8;

    if (!keyFading && distance < pickupDistance && key.visible) {
        //console.log("Chave encontrada!");
        //mostrar que o jogador pegou a chave
        controls.getObject().hasKey = true;
        //key.visible = false; 
        keyFading = true;
    }

    if (keyFading) {
        //console.log("Opacidade atual:", key.material.opacity);
        key.material.opacity -= keyFadeSpeed;
        key.material.emissiveIntensity = Math.max(0, key.material.emissiveIntensity - emissiveBoost);

        if (key.material.opacity <= 0) {
            key.visible = false;
            keyFading = false;
            //console.log("Chave desapareceu.");
        }
    }
}

