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
   setupEnvironment
} from './environment.js';

import {
   createPlatformWithKey,
   raisePlatform,
   updatePlatform,
   key,
   platform,
   checkKeyPickup
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

import { placeKeyAndUnlockDoor, openDoor, updateDoor, raiseRectangleWithKey } from './area2.js';

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
//let redKey, yellowKey;

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

   //raisePlatform(key)

   // ajustar com parte do Emerson [...] derrotou os inimigos da area 1...
   controls.getObject().defeatedEnemiesArea1 = true; 
   
   // Verifica colisão com chave
   if (key) {
      key.rotation.x += 0.01;
      checkKeyPickup(controls, platform, key, scene);
   }

   // Verifica se o jogador pegou a chave, se sim, coloca a chave no bloco de ativação e desbloqueia a porta
   if (controls.getObject().hasKey) {
      placeKeyAndUnlockDoor(scene, controls);
   }

   // Verifica se a porta está desbloqueada, aí começa a abrir a porta e descer o elevador
   if (controls.getObject().hasKey && controls.getObject().unlockedDoor && !doorIsOpening) {
      openDoor(scene);
      doorIsOpening = true;
      elevatorGoingDown = true;
      elevatorTargetY = - (elevatorBase.geometry.parameters.height/2) + 0.1;
      elevatorMoving = true;
      controls.getObject().hasKey = false; // Reseta a chave após abrir a porta
   }

   updateDoor(scene);
   updateElevator();

   // Verifica se o elevador já chegou no chão e o jogador está em cima dele
   if (elevatorWaiting && !elevatorMoving && isPlayerOnTop(controls.getObject(), elevatorBase)) {
      elevatorTargetY = elevatorBase.geometry.parameters.height/2; // ou altura original do elevador
      elevatorMoving = true;
      elevatorGoingUp = true;
      elevatorWaiting = false;
      //console.log("jogador está em cima do elevador, subindo...");
   }

   // ajustar com parte do Emerson [...] derrotou os inimigos da area 2...
   controls.getObject().defeatedEnemiesArea2 = true; // Simulando que o jogador derrotou os inimigos da área 2
   
   let rectangle = scene.getObjectByName("rectangleWithKey"); // Torna o bloco de ativação visível   
   if(controls.getObject().unlockedDoor && controls.getObject().defeatedEnemiesArea2) {
      raiseRectangleWithKey(rectangle);
   }

   // Renderização da cena
   renderer.render(scene, camera);
   requestAnimationFrame(render);
}


//teste para levantar a plataforma com a tecla 'E'
window.addEventListener('keydown', (event) => {
   if (event.key == 'e') {
      console.log("⏫ Tecla 'E' pressionada: plataforma com chave vermelha subindo");
      raisePlatform(key);
   }
});


//MODULARIZAR ESSAS FUNÇÕES PARA OUTRO ARQUIVO - TA DANDO ERRO QUANDO COLOCA EM OUTRO ARQUIVO
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
