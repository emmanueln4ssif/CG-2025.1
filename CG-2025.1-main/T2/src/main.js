import * as THREE from 'three';
import { OrbitControls } from '../../build/jsm/controls/OrbitControls.js';
import { PointerLockControls } from '../../build/jsm/controls/PointerLockControls.js';
import { Clock } from 'three';
import KeyboardState from '../../libs/util/KeyboardState.js';

import {
   initRenderer,
   initCamera,
   initDefaultBasicLight,
   setDefaultMaterial,
   onWindowResize,
   createGroundPlaneXZ
} from "../../libs/util/util.js";

import {
   setupEnvironment,
   openDoor,
   updateDoor,
} from './environment.js';

import {
   createPlatformWithKey,
   raisePlatform,
   updatePlatform,
   key,
   platform,
   checkKeyPickup,
} from './key.js';

import { setupPlayer, updatePlayer, controls, player } from './player.js';

import {
   setupGun,
   setupCrosshair,
   shoot,
   updateBullets,
   handleShootingState,
   canShootNow,
   markShotFired
} from './guns.js';

// --- Cena Básica ---
let scene = new THREE.Scene();
let renderer = initRenderer();
renderer.setClearColor("rgb(13, 1, 35)");
let camera = initCamera(new THREE.Vector3(0.0, 0.0, -10));
let material = setDefaultMaterial();
let light = initDefaultBasicLight(scene);
const clock = new Clock();

let collisionObjects = [];
setupEnvironment(scene, collisionObjects, light);
//createPlatformWithKey(scene, area1, 0xE2725B, 1, collisionObjects);

// Setup do personagem e câmera
setupPlayer(camera, scene, renderer);
setupGun(camera);
setupCrosshair();
handleShootingState();

// Redimensionamento da janela
window.addEventListener('resize', () => onWindowResize(camera, renderer), false);

// --- Plataforma com Chave ---
let keyFading = false;
let keyFadeSpeed = 0.02;
let emissiveBoost = 0.05;
controls.getObject().hasKey;
let doorIsOpening = false;

// --- Renderização ---
function render() {
   const delta = Math.min(clock.getDelta(), 0.1);

   // Atualização do personagem
   updatePlayer(delta, collisionObjects);

   // Tiro
   const currentTime = performance.now();
   if (canShootNow(currentTime)) {
      shoot(scene, camera);
      markShotFired(currentTime);
   }

   // Atualização das balas
   updateBullets(clock, scene, collisionObjects);

   // Atualiza ambiente (inclui animação da plataforma)
   updatePlatform(collisionObjects);

   if (key) {
      key.rotation.x += 0.01;
   }

   // Verifica colisão com chave
   if (key) {
      checkKeyPickup(controls, platform, key, scene);
   }

   if (controls.getObject().hasKey) {
      const activationBlock = scene.getObjectByName("activationBlock");

      if (activationBlock) {
         const blockPosition = new THREE.Vector3();
         activationBlock.getWorldPosition(blockPosition);

         const platformWithKey = scene.getObjectByName("platformWithKey");

         const distanceToDoor = controls.getObject().position.distanceTo(blockPosition);
         //console.log("Distância até a porta:", distanceToDoor);

         if (distanceToDoor < 5) {
            key.visible = true;
            platformWithKey.remove(key);
            activationBlock.add(key);
            key.scale.set(0.5, 0.5, 0.5);
            key.position.set(0, 1, -0.5);

            while (key.material.opacity < 1) {
               key.material.opacity += keyFadeSpeed;
            }

            controls.getObject().unlockedDoor = true; //demonstra que a porta foi desbloqueada
         }
      }
   }


   if (controls.getObject().hasKey && controls.getObject().unlockedDoor && !doorIsOpening) {
      openDoor(scene);
      doorIsOpening = true;

      const elevatorBase = scene.getObjectByName("elevatorBase");
      

   }
   updateDoor(scene);
  
   
   

   // Renderização da cena
   renderer.render(scene, camera);
   requestAnimationFrame(render);
}

window.addEventListener('keydown', (event) => {
   if (event.key === 'e') {
      console.log("⏫ Tecla 'E' pressionada: plataforma subindo");
      raisePlatform(key);
   }
});


// Iniciar o loop de renderização
render();
