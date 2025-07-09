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
   downElevator,
   updateElevatorBase,
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

// -- Elevador ---
export let elevatorBase = scene.getObjectByName("elevatorBase"); // atribuído ao construir a plataforma
export let elevatorTargetY = 0;
export let elevatorMoving = false;
export let elevatorGoingDown = false;
export let elevatorGoingUp = false;
export let elevatorWaiting = false;


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

   // Verifica colisão com chave
   if (key) {
      key.rotation.x += 0.01;
      checkKeyPickup(controls, platform, key, scene);
   }

   // Verifica se o jogador pegou a chave, se sim, ativa a porta
   if (controls.getObject().hasKey) {

      const activationBlock = scene.getObjectByName("activationBlock");

      //Se o bloco de ativação existir
      if (activationBlock) {

         const blockPosition = new THREE.Vector3();
         activationBlock.getWorldPosition(blockPosition);

         const platformWithKey = scene.getObjectByName("platformWithKey");

         const distanceToDoor = controls.getObject().position.distanceTo(blockPosition);
         //console.log("Distância até a porta:", distanceToDoor);

         // Se o jogador estiver próximo o suficiente da porta, ativa a chave
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
      elevatorGoingDown = true;
      elevatorTargetY = - (elevatorBase.geometry.parameters.height/2) + 0.1;
      elevatorMoving = true;
   }

   updateDoor(scene);
   updateElevator();

   if (elevatorWaiting && !elevatorMoving && isPlayerOnTop(controls.getObject(), elevatorBase)) {
      elevatorTargetY = elevatorBase.geometry.parameters.height/2; // ou altura original do elevador
      elevatorMoving = true;
      elevatorGoingUp = true;
      elevatorWaiting = false;
      console.log("jogador está em cima do elevador, subindo...");
   }

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

// Função para verificar se o jogador está em cima do elevador
function isPlayerOnTop(playerObject, base) {

   const playerPos = playerObject.position.clone(); // Posição do jogador
   const baseBox = new THREE.Box3().setFromObject(base); // Cria uma caixa delimitadora para a base do elevador

   // Pequeno box nos pés do jogador (altura baixa para evitar falsos positivos)
   const feetBox = new THREE.Box3(
      new THREE.Vector3(playerPos.x - 0.4, playerPos.y - 1.9, playerPos.z - 0.4),
      new THREE.Vector3(playerPos.x + 0.4, playerPos.y - 1.7, playerPos.z + 0.4)
   );

   return baseBox.intersectsBox(feetBox);
}

export function updateElevator() {
   if (!elevatorMoving || !elevatorBase) return;

   elevatorBase.position.y = THREE.MathUtils.lerp(
      elevatorBase.position.y,
      elevatorTargetY,
      0.015
   );

   if (Math.abs(elevatorBase.position.y - elevatorTargetY) < 0.05) {
      elevatorBase.position.y = elevatorTargetY;
      elevatorMoving = false;

      if (elevatorGoingDown) {
         elevatorGoingDown = false;
         elevatorWaiting = true;
      } else if (elevatorGoingUp) {
         elevatorGoingUp = false;
      }

      console.log("elevador chegou ao destino:", elevatorTargetY);
   }
}

// Iniciar o loop de renderização
render();
