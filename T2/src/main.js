import * as THREE from 'three';
import { Clock } from 'three';
import { initRenderer, initCamera, initDefaultBasicLight, setDefaultMaterial, onWindowResize, createGroundPlaneXZ } from "../../libs/util/util.js";
import { setupEnvironment } from './environment.js';
import { key, platform, checkKeyPickup, updatePlatformMovement, raisePlatformTo, yellowKey, redKey } from './key.js';
import { setupPlayer, updatePlayer, controls, player } from './player.js';
import { bullets, setupGun, setupCrosshair, shoot, updateBullets, handleShootingState, canShootNow, markShotFired, setupChaingun, setupWeaponSwitching } from './guns.js';
import { placeKeyAndUnlockDoor, openDoor, updateDoor, updateElevator, isPlayerOnTop, elevatorState, yellowKeyPlatform, canUseElevator } from './area2.js';
import { sunLight, ambientLight } from './light.js';
import { createEnemy, updateEnemies, allEnemies, checkDefeatedEnemies } from './enemies/enemies.js';
import { LostSoul } from './enemies/lostSoul.js';
import { Cacodemon } from './enemies/cacodemon.js';
import { SpriteMixer } from "../../libs/sprites/SpriteMixer.js";

// --- Cena Básica ---
export let scene = new THREE.Scene()
let renderer = initRenderer();
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setClearColor("rgb(8, 79, 150)");

// GARANTE QUE TODOS OS OBJETOS USAM SOMBRA
scene.traverse(obj => {
   if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
   }
});

//Luzes
scene.add(ambientLight);
scene.add(sunLight);

export let camera = initCamera(new THREE.Vector3(0.0, 0.0, -10));
const clock = new Clock();
let spriteMixer = SpriteMixer();

let collisionObjects = [];
setupEnvironment(scene, collisionObjects, sunLight);

// Setup do personagem e câmera
setupPlayer(camera, scene, renderer);
setupGun(camera);
setupWeaponSwitching();
setupChaingun(camera, spriteMixer)
setupCrosshair();
handleShootingState();

// Setup dos inimigos
createEnemy('lost_soul', new THREE.Vector3(0, 10, 0), scene, collisionObjects);
createEnemy('lost_soul', new THREE.Vector3(140, 10, 120), scene, collisionObjects);
createEnemy('lost_soul', new THREE.Vector3(140, 10, 135), scene, collisionObjects);
createEnemy('lost_soul', new THREE.Vector3(140, 18, 150), scene, collisionObjects);
createEnemy('lost_soul', new THREE.Vector3(140, 18, 165), scene, collisionObjects);
createEnemy('cacodemon', new THREE.Vector3(5, 25, 190), scene, collisionObjects);
createEnemy('cacodemon', new THREE.Vector3(45, 25, 150), scene, collisionObjects);
createEnemy('cacodemon', new THREE.Vector3(-25, 25, 180), scene, collisionObjects);

// Redimensionamento da janela
window.addEventListener('resize', () => onWindowResize(camera, renderer), false);

// --- Plataforma com Chave ---
let keyFading = false; // Variável para controlar o desvanecimento da chave
let keyFadeSpeed = 0.02; // Velocidade de desvanecimento da chave
let emissiveBoost = 0.05; // Intensidade do brilho da chave
controls.getObject().hasKey; // Variável para controlar se o jogador pegou a chave e ainda não a usou
let doorIsOpening = false; // Variável para controlar se a porta está abrindo
let platformKey1Raised = false; // Variável para controlar se a plataforma com a chave vermelha já foi levantada
let platformKey2Raised = false; // Variável para controlar se a plataforma com a chave amarela já foi levantada
let doorIsOpen = false;

// -- Elevador ---
export let elevatorBase = scene.getObjectByName("elevatorBase"); // atribuído ao construir a plataforma
export let elevatorTargetY = 0; // posição alvo inicial do elevador
export let elevatorMoving = false; // variável para controlar se o elevador está se movendo
export let elevatorGoingDown = false; // variável para controlar se o elevador está indo para baixo
export let elevatorGoingUp = false; // variável para controlar se o elevador está indo para cima
export let elevatorWaiting = false; // variável para controlar se o elevador está esperando

const desiredWorldY = 40;

const currentWorldPosition = new THREE.Vector3();
yellowKey.getWorldPosition(currentWorldPosition);

console.log("✅ Nova posição local aplicada:", yellowKey.position);

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

   // Atualização dos inimigos
   updateEnemies(delta, controls.getObject(), camera, scene, collisionObjects, bullets);

   // Atualização da porta da área 2
   updateDoor(scene); 

   // Atualização do elevador da área 2
   updateElevator(); 

   // Atualização da plataforma com as chaves vermelha e amarela
   updatePlatformMovement(); 

   //Verifica se os inimigos de cada uma das areas foi derrotado
   const checkDefeated = checkDefeatedEnemies(controls.getObject());

   //Se derrotou os inimigos da area 1, sobe a plataforma com a chave vermelha...
   if (checkDefeated.defeatedEnemiesArea1 === true && !platformKey1Raised) {
      raisePlatformTo(7, platform);
      platformKey1Raised = true;
   }

   //Se derrotou os inimigos da area 2, levanta o retângulo com a chave amarela...
   if (checkDefeated.defeatedEnemiesArea2 === true && !platformKey2Raised) {
      raisePlatformTo(13, yellowKeyPlatform);
      platformKey2Raised = true;
   }

   // Verifica há chave vermelha na plataforma e orienta rotação e verifica se o jogador pegou esta chave
   if (redKey) {
      redKey.rotation.x += 0.01;
      checkKeyPickup(controls, platform, redKey, scene);
   }

   // Verifica há chave amarela na plataforma e orienta rotação e verifica se o jogador pegou esta chave
   if (yellowKey) {
      yellowKey.rotation.x += 0.01;
      checkKeyPickup(controls, yellowKeyPlatform, yellowKey, scene);
   }

   // Verifica se o jogador possui a chave vermelha e se aproximou o suficiente da porta, se sim, coloca a chave no bloco de ativação e a desbloqueia 
   if (controls.getObject().hasRedKey) {
      placeKeyAndUnlockDoor(scene, controls);
   }

   // Verifica se o jogador desbloqueou a porta, se sim, abre a porta e move o elevador para baixo
   if (controls.getObject().hasRedKey && controls.getObject().unlockedDoor && !doorIsOpening && !doorIsOpen) {

      openDoor(scene);
      doorIsOpening = true;
      doorIsOpen = true;

      elevatorState.goingDown = true;
      elevatorState.targetY = - (elevatorState.base.geometry.parameters.height / 2) + 0.1;
      elevatorState.moving = true;

   }

   // Verifica se o elevador está parado, o jogador está em cima dele e se deu o tempo para que ele possa voltar a se movimentar
   // As atualizações daqui ditam o comportamento do updateElevator()
   if (elevatorState.waiting && !elevatorState.moving && isPlayerOnTop(controls.getObject(), elevatorState.base, scene) && canUseElevator()) {

      const currentY = elevatorState.base.position.y;
      const bottomY = - (elevatorState.base.geometry.parameters.height / 2) + 0.1;
      const topY = elevatorState.base.geometry.parameters.height / 2;

      // Se está no chão, sobe
      if (Math.abs(currentY - bottomY) < 0.05) {
         elevatorState.targetY = topY;
         elevatorState.goingUp = true;
         elevatorState.waiting = false;
         elevatorState.moving = true;
      }

      // Se está no topo, desce
      else if (Math.abs(currentY - topY) < 0.05) {
         elevatorState.targetY = bottomY;
         elevatorState.goingDown = true;
         elevatorState.waiting = false;
         elevatorState.moving = true;
      }

   }

  


   spriteMixer.update(delta); // animação dos sprites

   // Renderização da cena
   renderer.render(scene, camera);
   requestAnimationFrame(render);
}

//teste para levantar a chave vermelha com a tecla 'E' (em caso de erro na animação)
window.addEventListener('keydown', (event) => {
   if (event.key === 'e') {
      console.log("⏫ Tecla 'E' pressionada");
      raisePlatformTo(6, platform); // altura desejada
   }
});

// Iniciar o loop de renderização
render();