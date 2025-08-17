// area4.js
import * as THREE from 'three';
import { GLTFLoader } from '../../build/jsm/loaders/GLTFLoader.js';
import { buildKey } from './key.js';
import { novosInimigos } from './main.js';

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
    blueKey = buildKey({ x: -135, y: 2, z: 150 }, scene, "Blue", "0x0000ff", 50, collisionObjects);
    blueKey.name = "blueKey";

    // --- Muro alto ---
    const wallHeight = 14;
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
    lockerHole = new THREE.Group();
    lockerHole.name = "lockerHole";
    
    // Furo circular (buraco)
    const holeGeometry = new THREE.CylinderGeometry(1.2, 1.2, 1, 32);
    const holeMaterial = new THREE.MeshStandardMaterial({
        color: 0x111111,
        metalness: 0.8,
        roughness: 0.2
    });
    
    const hole = new THREE.Mesh(holeGeometry, holeMaterial);
    hole.rotation.x = Math.PI / 2;
    lockerHole.add(hole);
    
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
    lockerHole.add(ring);
    
    // Posiciona o lockerHole no mundo
    lockerHole.position.set(0, 2, -97);
    scene.add(lockerHole);

    // --- Pirâmide com metade do tamanho ---
    createPyramid(scene, collisionObjects);
}

// Função para criar a pirâmide (tamanho reduzido pela metade)
function createPyramid(scene, collisionObjects) {
    const loader = new GLTFLoader();
    loader.load('assets/pyramid/scene.gltf', (gltf) => {
        const pyramid = gltf.scene;
        pyramid.position.set(0, 0, -150);
        pyramid.scale.set(1.5, 1.5, 1.5); // Metade do tamanho original (3/2=1.5)
        scene.add(pyramid);

        // Adiciona colisão para a pirâmide
        pyramid.traverse((child) => {
            if (child.isMesh) {
                collisionObjects.push(child);
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
    });
}

// Função para atualizar a posição do muro e do locker
export function updateWall(delta) {
    if (!wallIsLowering || !area4Wall || !lockerHole) return;

    // Move o muro
    area4Wall.position.y -= wallLoweringSpeed * delta;
    
    // Move o locker junto com o muro
    lockerHole.position.y = area4Wall.position.y - 8; // Mantém a posição relativa

    if (area4Wall.position.y <= wallTargetY) {
        area4Wall.position.y = wallTargetY;
        wallIsLowering = false;
    }
}

// Função para colocar a chave e abaixar o muro
export function placeBlueKeyAndLowerWall(scene, controls) {
    if (!lockerHole || !blueKey) return false;

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
        
        return true;
    }
    return false;
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