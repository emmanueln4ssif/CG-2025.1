// area4.js
import * as THREE from 'three';
import { CSG } from '../../libs/other/CSGMesh.js';
import { buildKey } from './key.js';
import {novosInimigos} from "./main.js";

export let area4Wall, blueKey;
let lockerHole;

// Variáveis para controle do muro
export let wallIsLowering = false;
let wallTargetY = 0;
const wallLoweringSpeed = 0.5;

const textureLoader = new THREE.TextureLoader();
const wallTexture = {
    colorMap: textureLoader.load('assets/textures/floor/grayBricks/PavingStones081_1K-PNG_Color.png'),
    aoMap: textureLoader.load('assets/textures/floor/grayBricks/PavingStones081_1K-PNG_AmbientOcclusion.png'),
    normalMap: textureLoader.load('assets/textures/floor/grayBricks/PavingStones081_1K-PNG_NormalGL.png'),
    displacementMap: textureLoader.load('assets/textures/floor/grayBricks/PavingStones081_1K-PNG_Displacement.png')
};

export function buildArea4(scene, collisionObjects) {
    // Chave azul
    blueKey = buildKey({ x: 10, y: 1, z: -150 }, scene, "Blue", "0x0000ff", 50, collisionObjects);
    blueKey.name = "blueKey";

    // --- Muro alto ---
    const wallHeight = 20;
    const wallMaterial = createRepeatingMaterial(20, 2, wallTexture);
    
    area4Wall = new THREE.Mesh(
        new THREE.BoxGeometry(500, wallHeight, 5),
        wallMaterial
    );
    area4Wall.position.set(0, wallHeight / 2, -100);
    area4Wall.userData = {
        initialY: area4Wall.position.y,
        targetY: area4Wall.position.y - wallHeight,
        isMoving: false
    };
    scene.add(area4Wall);
    collisionObjects.push(area4Wall);

    // --- Buraco para a chave (círculo no centro do muro) ---
    const holeGroup = new THREE.Group();
    holeGroup.name = "lockerHole";
    holeGroup.position.set(0, 2, -97); // Posição ajustada
    
    // Furo circular (buraco)
    const holeGeometry = new THREE.CylinderGeometry(1.2, 1.2, 1, 32);
    const holeMaterial = new THREE.MeshStandardMaterial({
        color: 0x111111,
        metalness: 0.8,
        roughness: 0.2
    });
    
    const hole = new THREE.Mesh(holeGeometry, holeMaterial);
    hole.rotation.x = Math.PI / 2;
    holeGroup.add(hole);
    
    // Anel de destaque
    const ringGeometry = new THREE.RingGeometry(1.3, 1.5, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x0000ff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7
    });
    
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = Math.PI / 2;
    ring.position.z = 0.1;
    holeGroup.add(ring);
    
    scene.add(holeGroup);

    // --- Pirâmide com túneis usando CSG ---
    createPyramidWithTunnels(scene, collisionObjects);
}

// Função para criar a pirâmide com túneis
function createPyramidWithTunnels(scene, collisionObjects) {
    const pyramidSize = 20;
    const pyramidHeight = 15;
    const pyramidPosition = new THREE.Vector3(0, pyramidHeight/2, -150); // Mais perto do jogador
    
    // Criar base da pirâmide
    const pyramidBase = new THREE.Mesh(
        new THREE.CylinderGeometry(0.01, pyramidSize, pyramidHeight, 4, 1),
        new THREE.MeshStandardMaterial({ 
            color: 0xFFFF00, // Amarelo mais vibrante
            metalness: 0.3,
            roughness: 0.7
        })
    );
    pyramidBase.rotation.y = Math.PI / 4; // Rotacionar para alinhar as faces
    
    // Criar CSG
    const pyramidCSG = CSG.fromMesh(pyramidBase);
    
    // Criar túneis
    const tunnelRadius = 1.5;
    const tunnelLength = pyramidSize * 2; // Comprimento suficiente para atravessar
    
    // Túneis laterais (4 direções)
    for (let i = 0; i < 4; i++) {
        const tunnel = new THREE.Mesh(
            new THREE.CylinderGeometry(tunnelRadius, tunnelRadius, tunnelLength, 16),
            new THREE.MeshBasicMaterial()
        );
        tunnel.rotation.y = i * Math.PI / 2;
        tunnel.position.copy(pyramidPosition);
        
        const tunnelCSG = CSG.fromMesh(tunnel);
        pyramidCSG.subtract(tunnelCSG);
    }
    
    // Túnel vertical
    const verticalTunnel = new THREE.Mesh(
        new THREE.CylinderGeometry(tunnelRadius, tunnelRadius, pyramidHeight * 2, 16),
        new THREE.MeshBasicMaterial()
    );
    verticalTunnel.rotation.x = Math.PI / 2;
    verticalTunnel.position.copy(pyramidPosition);
    verticalTunnel.position.y = pyramidHeight/2;
    
    const verticalTunnelCSG = CSG.fromMesh(verticalTunnel);
    pyramidCSG.subtract(verticalTunnelCSG);
    
    // Converter para mesh
    const pyramidMesh = CSG.toMesh(pyramidCSG, new THREE.Matrix4());
    pyramidMesh.material = pyramidBase.material;
    pyramidMesh.position.copy(pyramidPosition);
    pyramidMesh.castShadow = true;
    pyramidMesh.receiveShadow = true;
    
    scene.add(pyramidMesh);
    collisionObjects.push(pyramidMesh);
}

// Função para atualizar a posição do muro
export function updateWall(delta) {
    if (!wallIsLowering || !area4Wall) return;

    area4Wall.position.y -= wallLoweringSpeed * delta;

    if (area4Wall.position.y <= wallTargetY) {
        area4Wall.position.y = wallTargetY;
        wallIsLowering = false;
    }
}

// Função para colocar a chave e abaixar o muro
export function placeBlueKeyAndLowerWall(scene, controls) {
    const lockerHole = scene.getObjectByName("lockerHole");
    if (!lockerHole || !blueKey) return;

    const blockPosition = new THREE.Vector3();
    lockerHole.getWorldPosition(blockPosition);

    const distanceToHole = controls.getObject().position.distanceTo(blockPosition);

    if (distanceToHole < 3 && controls.getObject().hasBlueKey) {
        // Coloca a chave no buraco
        blueKey.visible = true;
        lockerHole.add(blueKey);
        blueKey.position.set(0, 0, 0);
        blueKey.rotation.set(0, 0, 0);
        blueKey.scale.set(0.7, 0.7, 0.7);

        // Marca a chave como fixa para não ser movida com 'C'
        blueKey.userData.isFixed = true;

        // Inicia a descida do muro
        lowerWall();
        novosInimigos();
    }
}

// Função para iniciar a descida do muro
export function lowerWall() {
    if (wallIsLowering) return;
    wallIsLowering = true;
    wallTargetY = area4Wall.userData.initialY - area4Wall.geometry.parameters.height;
}

function createRepeatingMaterial(repeatX, repeatY, maps) {
    const setupTexture = (map) => {
        if (!map) return null;
        const texture = map.clone();
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(repeatX, repeatY);
        return texture;
    };

    return new THREE.MeshLambertMaterial({
        map: setupTexture(maps.colorMap),
        aoMap: setupTexture(maps.aoMap),
        displacementMap: setupTexture(maps.displacementMap),
        displacementScale: 0.1,
        displacementBias: -0.05,
        normalMap: setupTexture(maps.normalMap),
    });
}