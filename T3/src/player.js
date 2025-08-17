import * as THREE from 'three';
import { OrbitControls } from '../../build/jsm/controls/OrbitControls.js';
import { PointerLockControls } from '../../build/jsm/controls/PointerLockControls.js';
import KeyboardState from '../../libs/util/KeyboardState.js';
import { updateCharacter } from './characterBody.js';
import { isShooting } from './guns.js';
import { updateHealthBar } from './enemies/enemies.js';
import { playerMorreu } from './main.js';

let controls, orbit, rendererElement;
let keyboard = new KeyboardState();

export function setupHealthBar(scene, camera) {
   const barWidth = 0.1;
   const barHeight = 1;

   // fundo preto
   const bgGeometry = new THREE.PlaneGeometry(barWidth, barHeight *1.02);
   const bgMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
   const healthBarBg = new THREE.Mesh(bgGeometry, bgMaterial);

   // barra vermelha
   const barGeometry = new THREE.PlaneGeometry(barWidth, barHeight);
   const barMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
   const healthBar = new THREE.Mesh(barGeometry, barMaterial);

   const hud = new THREE.Group();
   hud.add(healthBarBg);
   hud.add(healthBar);

   // ajusta posição na câmera
   hud.position.set(-1.5, 0, -2); 

   // deixa a barra vermelha ligeiramente na frente
   healthBar.position.z = 0.01; 

   // adiciona o HUD como filho da câmera
   camera.add(hud);

   player.healthBar = healthBar;
}

function updatePlayerHealthBar() {
   if (player.healthBar == null) return;

   const healthPercent = player.health / player.maxHealth;
   player.healthBar.scale.y = healthPercent;  // encolhe verticalmente
   player.healthBar.position.y = -(1 - healthPercent)/2; // ajusta pra não sair da base
}

export const player = {
   type: 'player',
   position: new THREE.Vector3(0, 8, 0),
   velocity: new THREE.Vector3(),
   baseSpeed: 50,
   speed: 50,
   height: 4,
   radius: 0.5,
   jumpForce: 20,
   gravity: -10,
   isOnGround: false,
   canJump: true,
   moveForward: false,
   moveBackward: false,
   moveLeft: false,
   moveRight: false,
   jumpRequested: false,
   healthBarExist: false,
   healthBar: null,

   isRunning: false,
   health: 200,
   maxHealth: 200,

   godLike: false
};

function setupPlayer(camera, scene, renderer) {
   orbit = new OrbitControls(camera, renderer.domElement);
   orbit.enabled = false;

   controls = new PointerLockControls(camera, renderer.domElement);
   scene.add(controls.getObject());

   if (!player.healthBarExist) {
      setupHealthBar(scene, camera);
      player.healthBarExist = true;
   }

   rendererElement = renderer.domElement;
   setupPointerLock();

   window.addEventListener('keydown', (event) => movementControls(event.keyCode, true));
   window.addEventListener('keyup', (event) => movementControls(event.keyCode, false));   
   window.addEventListener('mousedown', () => isShooting == true);
   window.addEventListener('mouseup', () => isShooting == false);
}

function setupPointerLock() {
   if (!rendererElement) return;

   const havePointerLock = 'pointerLockElement' in document;
   if (!havePointerLock) {
      console.warn("Pointer Lock API not supported");
      orbit.enabled = true;
      return;
   }

   const requestPointerLock = () => {
      rendererElement.requestPointerLock?.();
   };

   rendererElement.addEventListener('click', () => {
      if (!document.pointerLockElement) requestPointerLock();
   });

   const pointerlockchange = () => {
      if (document.pointerLockElement === rendererElement) {
         controls.enabled = true;
         orbit.enabled = false;
      } else {
         controls.enabled = false;
         orbit.enabled = true;
      }
   };

   document.addEventListener('pointerlockchange', pointerlockchange, false);
}

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
         case 16: // Shift
            player.isRunning = value;
            break;
    }
  }

function updatePlayer(delta, collisionObjects) {
   if (!controls || !controls.isLocked) return;

   if (player.isRunning) {
      player.speed = player.baseSpeed * 2;
   } else{
      player.speed = player.baseSpeed;
   }

   const moveDirection = new THREE.Vector3(
      (player.moveLeft ? -1 : 0) + (player.moveRight ? 1 : 0),
      0,
      (player.moveForward ? -1 : 0) + (player.moveBackward ? 1 : 0)
   ).normalize();

   const cameraQuaternion = new THREE.Quaternion();
   controls.getObject().getWorldQuaternion(cameraQuaternion);
   moveDirection.applyQuaternion(cameraQuaternion);
   moveDirection.y = 0;
   moveDirection.normalize();

   const moveVector = moveDirection.multiplyScalar(player.speed * delta);

   updateCharacter(delta, player, controls, moveVector, collisionObjects);
}

export function takeDamage(amount) {
   if (player.godLike) return; // se for invencível, não toma dano

   player.health -= amount;
   if (player.health < 0) player.health = 0;

   updatePlayerHealthBar();

   if (player.health <= 0) {
      playerMorreu(); 

      if (controls && controls.lock) {
            controls.unlock();
      }

   }
}

export { setupPlayer, updatePlayer, controls };

