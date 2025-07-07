import * as THREE from 'three';
import { OrbitControls } from '../../build/jsm/controls/OrbitControls.js';
import { PointerLockControls } from '../../build/jsm/controls/PointerLockControls.js';
import KeyboardState from '../../libs/util/KeyboardState.js';
import { updateCharacter } from './characterBody.js';

let controls, orbit, rendererElement;
let keyboard = new KeyboardState();

export const player = {
   position: new THREE.Vector3(0, 8, 0),
   velocity: new THREE.Vector3(),
   speed: 50,
   height: 2,
   radius: 0.5,
   jumpForce: 20,
   gravity: -20,
   isOnGround: false,
   canJump: true,
   moveForward: false,
   moveBackward: false,
   moveLeft: false,
   moveRight: false,
   jumpRequested: false
};

function setupPlayer(camera, scene, renderer) {
   orbit = new OrbitControls(camera, renderer.domElement);
   orbit.enabled = false;

   controls = new PointerLockControls(camera, renderer.domElement);
   scene.add(controls.getObject());

   rendererElement = renderer.domElement;
   setupPointerLock();

   window.addEventListener('keydown', (event) => movementControls(event.keyCode, true));
   window.addEventListener('keyup', (event) => movementControls(event.keyCode, false));   window.addEventListener('mousedown', () => isShooting = true);
   window.addEventListener('mouseup', () => isShooting = false);
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
    }
  }

function updatePlayer(delta, collisionObjects) {
   if (!controls || !controls.isLocked) return;

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

export { setupPlayer, updatePlayer, controls };
