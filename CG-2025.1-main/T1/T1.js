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


// Configuração do jogador
const player = {
   position: new THREE.Vector3(0, 8, 0),
   velocity: new THREE.Vector3(),
   speed: 50,
   height: 8,
   radius: 0.5,
   jumpForce: 20,
   gravity: -20,
   isOnGround: false,
   canJump: true, // Controla se o jogador pode pular
   moveForward: false,
   moveBackward: false,
   moveLeft: false,
   moveRight: false,
};


// Controles da câmera e de primeira pessoa
let orbit = new OrbitControls(camera, renderer.domElement);
orbit.enabled = false;
const controls = new PointerLockControls(camera, renderer.domElement);
scene.add(controls.getObject());


// Raycasting
const raycaster = new THREE.Raycaster();
const rayDirections = {
 down: new THREE.Vector3(0, -1, 0),
 up: new THREE.Vector3(0, 1, 0),
 front: new THREE.Vector3(0, 0, -1),
 back: new THREE.Vector3(0, 0, 1),
 left: new THREE.Vector3(-1, 0, 0),
 right: new THREE.Vector3(1, 0, 0)
};


// Objetos de colisão
const collisionObjects = [];


// Armas e disparos
const bullets = [];
let isShooting = false;
let lastShotTime = 0;
const fireRate = 500; // A função está pegando 1 = 0,1 milésimo de segundo, então 500 = 0,5 segundo
const bulletSpeed = 25;
const maxDistance = 100; //Distância máxima que a bala atinge após ser disparada
const gunGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.3, 32);
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


// Redimensionamento da janela
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
       } else {
           controls.enabled = false;
           orbit.enabled = true;
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


// Adicionando plataformas (mantido conforme seu original)
function addPlatformToScene(platform) {
   scene.add(platform);
   platform.traverse(child => {
       if (child.isMesh) {
           collisionObjects.push(child);
       }
addWallsAroundPlane(scene, 490, 15, 5, 0x8B4513);


   });
}


const area1 = buildPlatform(scene, 100, 120, 6, { x: 160, y: 0, z: 150 }, 15, 8, 0.8, 0x7FFFD4);
addPlatformToScene(area1);
const area2 = buildPlatform(scene, 100, 120, 6, { x: 10, y: 0, z: 150 }, 15, 8, 0.8, 0xE1A4A0);
addPlatformToScene(area2);
const area3 = buildPlatform(scene, 100, 120, 6, { x: -150, y: 0, z: 150 }, 15, 8, 0.8, 0xC3D3F1);
addPlatformToScene(area3);
const area4 = buildPlatform(scene, 100, 320, 6, { x: 10, y: 0, z: -150 }, 25, 8, 0.8, 0xB9D7A9);
area4.rotateY(-Math.PI);
area4.position.set(10, 0, -300);
addPlatformToScene(area4);


// Adicionando paredes (mantido conforme seu original)
function addWallsAroundPlane(scene, plane_size, wall_height, wall_thickness, color) {
   const half = plane_size / 2;


   const walls = [
       { size: [plane_size + 10, wall_height, wall_thickness], pos: [0, wall_height/2, half + wall_thickness/2] },
       { size: [plane_size + 10, wall_height, wall_thickness], pos: [0, wall_height/2, -half - wall_thickness/2] },
       { size: [wall_thickness, wall_height, plane_size], pos: [-half - wall_thickness/2, wall_height/2, 0] },
       { size: [wall_thickness, wall_height, plane_size], pos: [half + wall_thickness/2, wall_height/2, 0] } 
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
addWallsAroundPlane(scene, 500, 15, 5, 0x8B4513);


// Função para construir as plataformas
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
       escadaGroup.add(degrau);
   }


   escadaGroup.position.set(position.x, 0, position.z - (side_size / 2) + (step_depth / 2));


   const boundingBox = new THREE.Box3().setFromObject(escadaGroup);
   const center = boundingBox.getCenter(new THREE.Vector3());


   const rampLength = Math.sqrt(stair_depth * stair_depth + height * height);
   const rampAngle = Math.atan(height / stair_depth);
  
   const rampGeometry = new THREE.BoxGeometry(step_size, 0.1, rampLength);
  
   const rampMaterial = new THREE.MeshBasicMaterial({
       visible: true, 
       transparent: false,
       opacity: 0.0
   });
  
   const ramp = new THREE.Mesh(rampGeometry, rampMaterial);
   ramp.rotation.x = -rampAngle;
   ramp.position.set(center.x, height / 2, center.z - stair_depth / 2 + rampLength / 2.5 * Math.cos(rampAngle) - 0.5);
   ramp.userData.isRamp = true;
   ramp.userData.rampLength = rampLength;
   ramp.userData.rampHeight = height;
   ramp.userData.rampAngle = rampAngle;
   ramp.userData.rampDirection = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(1, 0, 0), rampAngle);
   ramp.visible = false
  
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


   platform.add(escadaGroup, frontal1, frontal2, traseira, ramp); //rampa
  
   return platform;
}


// Sistema de colisão horizontal melhorado
function checkHorizontalCollision(position, moveVector) {
 const directions = [
   { dir: rayDirections.front, move: [0, 0, -1] },
   { dir: rayDirections.back, move: [0, 0, 1] },
   { dir: rayDirections.left, move: [-1, 0, 0] },
   { dir: rayDirections.right, move: [1, 0, 0] }
 ];


 const newPosition = position.clone().add(moveVector);
 let canMove = true;


 for (const { dir, move } of directions) {
   raycaster.set(newPosition, dir);
   raycaster.far = player.radius + 0.5;


   const intersects = raycaster.intersectObjects(collisionObjects);
  
   if (intersects.length > 0 && intersects[0].distance <= player.radius + 0.5) {
     const moveDir = new THREE.Vector3(...move);
     if (moveVector.dot(moveDir) > 0) {
       canMove = false;
      
       const wallNormal = intersects[0].face?.normal || dir.clone().negate();
       const slideDirection = moveVector.clone().projectOnPlane(wallNormal);
      
       if (slideDirection.length() > 0) {
         return checkHorizontalCollision(position, slideDirection.multiplyScalar(0.6));
       }
     }
   }
 }


 return canMove ? newPosition : position;
}


// Jogador
function updatePlayer(delta) {
   if (!controls.isLocked) return;


   const playerObj = controls.getObject();
   const playerPos = playerObj.position;


   // Gravidade
   player.velocity.y += player.gravity * delta;


   // Verificação de chão
   raycaster.set(playerPos, rayDirections.down);
   raycaster.far = player.height * 0.6;
   const downIntersects = raycaster.intersectObjects(collisionObjects);
  
   player.canJump = false;
   player.isOnGround = false;
   let onRamp = false;
   let rampNormal = new THREE.Vector3(0, 1, 0);
  
   if (downIntersects.length > 0 && downIntersects[0].distance <= player.height * 0.6) {
       const intersect = downIntersects[0];


       if (player.velocity.y <= 0.1 || intersect.object.userData.type === 'Ramp') {
           playerPos.y = intersect.point.y + (player.height * 0.5);
           player.velocity.y = 0;
           player.isOnGround = true;
           player.canJump = true;
       }


       if (intersect.object.userData.type === 'Ramp' && intersect.face) {
           onRamp = true;
           rampNormal = intersect.face.normal.clone();
       }
   }


   // Câmera
   const moveDirection = new THREE.Vector3(
       (player.moveLeft ? -1 : 0) + (player.moveRight ? 1 : 0),
       0,
       (player.moveForward ? -1 : 0) + (player.moveBackward ? 1 : 0)
   ).normalize();


   const cameraQuaternion = new THREE.Quaternion();
   camera.getWorldQuaternion(cameraQuaternion);
   moveDirection.applyQuaternion(cameraQuaternion);
   moveDirection.y = 0; // Remove qualquer inclinação vertical
   moveDirection.normalize();


   let moveVector = moveDirection.multiplyScalar(player.speed * delta);


   // Ajuste rampas
   if (onRamp) {
       const angle = Math.acos(rampNormal.dot(new THREE.Vector3(0, 1, 0)));
       if (angle < Math.PI/4) {
           const projectedMove = moveVector.clone().projectOnPlane(rampNormal);
           moveVector.copy(projectedMove);
           moveVector.y += Math.sin(angle) * player.speed * delta * 0.5;
       }
   }
   const newPos = checkHorizontalCollision(playerPos, moveVector);
   playerPos.copy(newPos);


   // Pulo
   if (player.jumpRequested && player.canJump) {
       player.velocity.y = player.jumpForce;
       player.canJump = false;
       player.isOnGround = false;
       player.jumpRequested = false;
   }
  
   if (!onRamp) {
       player.velocity.y += player.gravity * delta;
   }
   playerPos.y += player.velocity.y * delta;
}


// Controles
window.addEventListener('keydown', (event) => movementControls(event.keyCode, true));
window.addEventListener('keyup', (event) => movementControls(event.keyCode, false));


function movementControls(key, value) {
   switch (key) {
       case 87: // W
       case 38: // Up Arrow
           player.moveForward = value;
           break;
       case 83: // S
       case 40: // Down Arrow
           player.moveBackward = value;
           break;
       case 65: // A
       case 37: // Left Arrow
           player.moveLeft = value;
           break;
       case 68: // W
       case 39: // Right Arrow
           player.moveRight = value;
           break;
       case 32: // Espaço
           if (value && player.canJump && player.isOnGround) {
               player.velocity.y = player.jumpForce;
               player.isOnGround = false;
               player.canJump = false; // Impede pulos no ar
           }
           break;
   }
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
   const bulletGeometry = new THREE.SphereGeometry(0.25, 8, 8);
   const bulletMaterial = setDefaultMaterial('black');
   const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);


   const gunWorldPosition = new THREE.Vector3();
   gun.getWorldPosition(gunWorldPosition);
  
   const barrelOffset = new THREE.Vector3(0, 0, 2);
   bullet.position.copy(gunWorldPosition);
  
   barrelOffset.applyQuaternion(gun.quaternion);
   bullet.position.add(barrelOffset);


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
   updatePlayer(delta);


   // Balas
   const currentTime = performance.now();
   // console.log(currentTime) //Se quiser verificar o tempo que é passado 
   if (isShooting && (currentTime - lastShotTime >= fireRate)) {
       shoot();
       lastShotTime = currentTime;
   }
   updateBullets();


   renderer.render(scene, camera);
   requestAnimationFrame(render);
}


// Iniciar o loop de renderização
render();

