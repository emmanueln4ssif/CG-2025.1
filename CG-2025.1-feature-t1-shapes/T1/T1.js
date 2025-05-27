


import * as THREE from 'three';
import { OrbitControls } from '../build/jsm/controls/OrbitControls.js';
import { PointerLockControls } from '../build/jsm/controls/PointerLockControls.js';
import { Clock } from 'three';
import KeyboardState from '../libs/util/KeyboardState.js';
import {
    initRenderer,
    initCamera,
    initDefaultBasicLight,
    setDefaultMaterial,
    onWindowResize,
    createGroundPlaneXZ
} from "../libs/util/util.js";

// --- Cena Básica ---
let scene = new THREE.Scene();
let renderer = initRenderer();
renderer.setClearColor("rgb(70, 151, 198)");
let camera = initCamera(new THREE.Vector3(0.0, 0.0, -10));
let material = setDefaultMaterial();
let light = initDefaultBasicLight(scene);
const clock = new Clock();
const keyboard = new KeyboardState();

// --- Configuração do Jogador ---
const player = {
    position: new THREE.Vector3(0, 2, 0),
    velocity: new THREE.Vector3(),
    speed: 50,
    isOnGround: false,
    height: 2,
    radius: 0.5,
    jumpForce: 10,
    gravity: 25
};

// Controles da câmera e de primeira pessoa
let orbit = new OrbitControls(camera, renderer.domElement);
orbit.enabled = false;
const controls = new PointerLockControls(camera, renderer.domElement);
scene.add(controls.getObject());

// Colisão
const collisionObjects = [];
const playerBox = new THREE.Box3();
const tempVector = new THREE.Vector3();

// Armas e disparos
const bullets = [];
let isShooting = false;
let lastShotTime = 0;
const fireRate = 500; 
const bulletSpeed = 30;
const maxDistance = 100;
const gunGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.3, 20);
const gunMaterial = setDefaultMaterial(0x555555);
const gun = new THREE.Mesh(gunGeometry, gunMaterial);

gun.scale.set(2, 2, 2);
gun.position.set(0, -0.4, -1); 
gun.rotation.set(Math.PI / 2, 0, 0); 
camera.add(gun);

const crosshair = document.createElement('img');
crosshair.src = 'assets/crosshair.png'; 
crosshair.style.position = 'absolute';
crosshair.style.width = '100px'; 
crosshair.style.height = '100px';
crosshair.style.top = '50%';
crosshair.style.left = '50%';
crosshair.style.transform = 'translate(-50%, -50%)';
crosshair.style.pointerEvents = 'none';
crosshair.style.zIndex = '1000';

document.body.appendChild(crosshair);

// Evento de redimensionamento
window.addEventListener('resize', () => onWindowResize(camera, renderer), false);

// Configuração do Pointer Lock
function setupPointerLock() {
    const element = renderer.domElement;
    
    // Verificar suporte
    const havePointerLock = 'pointerLockElement' in document || 
                          'mozPointerLockElement' in document || 
                          'webkitPointerLockElement' in document;
    
    if (!havePointerLock) {
        console.warn("Pointer Lock API not supported");
        orbit.enabled = true;
        return;
    }

    // Função para solicitar o pointer lock
    const requestPointerLock = () => {
        element.requestPointerLock = element.requestPointerLock ||
                                   element.mozRequestPointerLock ||
                                   element.webkitRequestPointerLock;
        element.requestPointerLock().catch(e => {
            console.error("PointerLock error:", e);
        });
    };

    // Evento de clique
    element.addEventListener('click', () => {
        if (!document.pointerLockElement) {
            requestPointerLock();
        }
    }, false);

    // Eventos de mudança de estado
    const pointerlockchange = () => {
        if (document.pointerLockElement === element) {
            controls.enabled = true;
            orbit.enabled = false;
            console.log("PointerLock engaged");
        } else {
            controls.enabled = false;
            orbit.enabled = true;
            console.log("PointerLock released");
        }
    };

    // Adicionar listeners
    document.addEventListener('pointerlockchange', pointerlockchange, false);
    document.addEventListener('mozpointerlockchange', pointerlockchange, false);
    document.addEventListener('webkitpointerlockchange', pointerlockchange, false);
}

setupPointerLock();

// Cenário
let plane = createGroundPlaneXZ(500, 500);
plane.userData.isPlatform = true;
plane.material.color.set(0xFFF1C1);
scene.add(light);
scene.add(plane);
collisionObjects.push(plane);

// Adicionando plataformas
function addPlatformToScene(platform) {
    scene.add(platform);
    platform.traverse(child => {
        if (child.isMesh) {
            collisionObjects.push(child);
        }
    });
}

const area1 = buildPlatform(scene, 100, 120, 4, { x: 160, y: 0, z: 150 }, 15, 8, 0.5, 0x7FFFD4);
addPlatformToScene(area1);
const area2 = buildPlatform(scene, 100, 120, 4, { x: 10, y: 0, z: 150 }, 15, 8, 0.5, 0xE1A4A0);
addPlatformToScene(area2);
const area3 = buildPlatform(scene, 100, 120, 4, { x: -150, y: 0, z: 150 }, 15, 8, 0.5, 0xC3D3F1);
addPlatformToScene(area3);
const area4 = buildPlatform(scene, 100, 320, 8, { x: 10, y: 0, z: -150 }, 25, 8, 0.5, 0xB9D7A9);
area4.rotateY(-Math.PI);
area4.position.set(10, 0, -300);
addPlatformToScene(area4);

// Adicionando paredes
function addWallsAroundPlane(scene, plane_size, wall_height, wall_thickness, color) {
    const half = plane_size / 2;

    const walls = [
        { size: [plane_size + 10, wall_height, wall_thickness], pos: [0, wall_height/2, half + wall_thickness/2] }, // front
        { size: [plane_size + 10, wall_height, wall_thickness], pos: [0, wall_height/2, -half - wall_thickness/2] }, // back
        { size: [wall_thickness, wall_height, plane_size], pos: [-half - wall_thickness/2, wall_height/2, 0] }, // left
        { size: [wall_thickness, wall_height, plane_size], pos: [half + wall_thickness/2, wall_height/2, 0] }  // right
    ];

    walls.forEach(wall => {
        const wallMesh = new THREE.Mesh(
            new THREE.BoxGeometry(...wall.size),
            setDefaultMaterial(color)
        );
        wallMesh.position.set(...wall.pos);
        scene.add(wallMesh);
        collisionObjects.push(wallMesh);
    });
}
addWallsAroundPlane(scene, 500, 40, 5, 0x8B4513);

function buildPlatform(scene, side_size, front_size, height, position, step_size, number_of_steps, step_depth, color) {
    const stair_depth = number_of_steps * step_depth;
    const step_height = height / number_of_steps;
    const depth = height;
    const platform = new THREE.Group();
    const escadaGroup = new THREE.Group();
    
    for (let i = 0; i < number_of_steps; i++) {
        const degrau = new THREE.Mesh(
            new THREE.BoxGeometry(step_size, step_height, step_depth),
            setDefaultMaterial('white')
        );
        degrau.position.set(0, (i + 0.5) * step_height, (i + 0.5) * step_depth);
        degrau.userData.isRamp = true;
        escadaGroup.add(degrau);
    }

    escadaGroup.position.set(position.x, 0, position.z - (side_size / 2) + (step_depth / 2));

    const boundingBox = new THREE.Box3().setFromObject(escadaGroup);
    const center = boundingBox.getCenter(new THREE.Vector3());

    const frontal1 = new THREE.Mesh(
        new THREE.BoxGeometry((front_size - step_size) / 2, height, depth),
        setDefaultMaterial(color)
    );
    frontal1.position.set(center.x - (front_size - step_size)/4 - step_size/2, height/2, center.z);

    const frontal2 = new THREE.Mesh(
        new THREE.BoxGeometry((front_size - step_size) / 2, height, depth),
        setDefaultMaterial(color)
    );
    frontal2.position.set(center.x + (front_size - step_size)/4 + step_size/2, height/2, center.z);

    const traseira = new THREE.Mesh(
        new THREE.BoxGeometry(front_size, height, side_size - stair_depth),
        setDefaultMaterial(color)
    );
    traseira.position.set(center.x, height/2, center.z + (side_size/2) - (step_depth/2));

    const rampaShape = new THREE.Shape();
    const rampaWidth = step_size;
    const rampaDepth = stair_depth;

    rampaShape.moveTo(-rampaWidth/2, 0);
    rampaShape.lineTo(rampaWidth/2, 0);
    rampaShape.lineTo(0, height);
    rampaShape.lineTo(-rampaWidth/2, 0);

    const extrudeSettings = {
        steps: 1,
        depth: rampaDepth,
        bevelEnabled: false
    };

    const rampaGeometry = new THREE.ExtrudeGeometry(rampaShape, extrudeSettings);
    const rampa = new THREE.Mesh(rampaGeometry, setDefaultMaterial(0xAAAAAA));

    rampa.rotation.x = -Math.PI / 2;
    rampa.rotation.y = -Math.PI / 2;
    rampa.position.set(center.x, 0, center.z - rampaDepth/2);

    platform.add(escadaGroup, frontal1, frontal2, traseira, rampa);
    return platform;
}

// Colisão
function checkCollision(newPos) {
    try {
        playerBox.setFromCenterAndSize(
            newPos,
            new THREE.Vector3(player.radius * 2, player.height, player.radius * 2)
        );
        
        for (const object of collisionObjects) {
            if (!object) continue;
            
            const objectBox = new THREE.Box3();
            try {
                objectBox.setFromObject(object);
            } catch (e) {
                console.warn("Error setting object box:", e);
                continue;
            }
            
            if (playerBox.intersectsBox(objectBox)) {
                if (newPos.y > objectBox.max.y) {
                    return { 
                        collision: true, 
                        isGround: true, 
                        groundY: objectBox.max.y 
                    };
                }
                
                // Calcula a direção da colisão
                const overlap = new THREE.Vector3();
                playerBox.getCenter(overlap);
                objectBox.getCenter(tempVector);
                overlap.sub(tempVector).normalize();
                
                return { 
                    collision: true, 
                    isGround: false,
                    direction: overlap 
                };
            }
        }
        return { collision: false };
    } catch (e) {
        console.error("Collision check error:", e);
        return { collision: false };
    }
}

// Atualização do jogador
function updatePlayer(delta) {
    if (!controls.isLocked) return;

    const moveAmount = player.speed * delta;
    const direction = new THREE.Vector3();

    if (keyboard.pressed("W") || keyboard.pressed("up")) direction.z += 1;
    if (keyboard.pressed("S") || keyboard.pressed("down")) direction.z -= 1;
    if (keyboard.pressed("A") || keyboard.pressed("left")) direction.x += 1;
    if (keyboard.pressed("D") || keyboard.pressed("right")) direction.x -= 1;

    if (direction.length() > 0) {
        direction.normalize();
        
        const cameraDirection = new THREE.Vector3();
        controls.getDirection(cameraDirection);
        cameraDirection.y = 0;
        cameraDirection.normalize();
        
        const right = new THREE.Vector3();
        right.crossVectors(new THREE.Vector3(0, 1, 0), cameraDirection).normalize();
        
        const moveX = right.multiplyScalar(direction.x * moveAmount);
        const moveZ = cameraDirection.multiplyScalar(direction.z * moveAmount);
        
        const newPos = player.position.clone().add(moveX).add(moveZ);
        const collision = checkCollision(newPos);
        
        if (collision.collision) {
            if (collision.isGround) {
                player.position.x = newPos.x;
                player.position.z = newPos.z;
            } else {
                const slideDirection = new THREE.Vector3();
                slideDirection.copy(collision.direction);
                slideDirection.y = 0;
                slideDirection.normalize();
                
                const slideAmount = moveAmount * 0.3;
                const slidePos = player.position.clone().add(slideDirection.multiplyScalar(slideAmount));
                
                if (!checkCollision(slidePos).collision) {
                    player.position.copy(slidePos);
                }
            }
        } else {
            player.position.x = newPos.x;
            player.position.z = newPos.z;
        }
    }

    // Gravidade
    player.velocity.y -= player.gravity * delta;
    const newPosY = player.position.clone();
    newPosY.y += player.velocity.y * delta;
    
    const collisionY = checkCollision(newPosY);
    
    if (collisionY.collision) {
        if (collisionY.isGround) {
            player.position.y = collisionY.groundY + player.height/2;
            player.velocity.y = 0;
            player.isOnGround = true;
        } else {
            player.velocity.y = 0;
        }
    } else {
        player.position.y = newPosY.y;
        player.isOnGround = false;
    }

    // Pulo
    if (keyboard.pressed("space") && player.isOnGround) {
        player.velocity.y = player.jumpForce;
        player.isOnGround = false;
    }

    // Reset se cair
    if (player.position.y < -100) {
        player.position.set(0, 3, 0);
        player.velocity.set(0, 0, 0);
        player.isOnGround = true;
    }

    controls.getObject().position.copy(player.position);
}

// Armas e disparos
function checkBulletCollision(bulletPosition) {
    const bulletRadius = 0.05;

    for (const object of collisionObjects) {
        if (!object) continue;

        const objectBox = new THREE.Box3();
        try {
            objectBox.setFromObject(object);
        } catch (e) {
            console.warn("Error setting object box for bullet:", e);
            continue;
        }

        const closestPoint = new THREE.Vector3();
        objectBox.clampPoint(bulletPosition, closestPoint);
        const distance = bulletPosition.distanceTo(closestPoint);

        if (distance < bulletRadius) {
            return true;
        }
    }
    return false;
}

window.addEventListener('mousedown', () => isShooting = true);
window.addEventListener('mouseup', () => isShooting = false);

function shoot() {
    const bulletGeometry = new THREE.SphereGeometry(0.09, 8, 8);
    const bulletMaterial = setDefaultMaterial('black');
    const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);

    // posição inicial - Agora relativa à arma
    const gunWorldPosition = new THREE.Vector3();
    gun.getWorldPosition(gunWorldPosition); // Pega a posição global da arma
    
    // Ponto de saída do cano 
    const barrelOffset = new THREE.Vector3(0, 0, 0.5); 
    bullet.position.copy(gunWorldPosition);
    
    // Aplica a rotação da arma/câmera ao offset
    barrelOffset.applyQuaternion(gun.quaternion);
    bullet.position.add(barrelOffset);

    // Direção do projétil (mantém a direção da câmera)
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    
    bullets.push({
        mesh: bullet,
        direction: direction.clone().normalize(),
        startPosition: bullet.position.clone()
    });
    
    scene.add(bullet);

}

function updateBullets() {
    const toRemove = [];

    bullets.forEach((bulletData, index) => {
        const { mesh, direction, startPosition } = bulletData;

        mesh.position.add(direction.clone().multiplyScalar(bulletSpeed * clock.getDelta() * 200));

        const traveled = mesh.position.distanceTo(startPosition);
        if (traveled > maxDistance) {
            toRemove.push(index);
            return;
        }

        if (checkBulletCollision(mesh.position)) {
            toRemove.push(index);
            return;
        }
    });

    toRemove.reverse().forEach(i => {
        scene.remove(bullets[i].mesh);
        bullets.splice(i, 1);
    });
}

// Renderização
function render() {
    const delta = Math.min(clock.getDelta(), 0.1);
    keyboard.update();
    updatePlayer(delta);

    // Balas
    const currentTime = performance.now();
    if (isShooting && (currentTime - lastShotTime > fireRate)) {
        shoot();
        lastShotTime = currentTime;
    }
    updateBullets();

    // Arma
    // const offset = new THREE.Vector3(0, -0.13, 0.35);
    // gun.position.copy(camera.position).add(offset);
    // gun.quaternion.copy(camera.quaternion);
    // gun.rotateX(Math.PI/2);

    renderer.render(scene, camera);
    requestAnimationFrame(render);
}

// Iniciar o loop de renderização
render();