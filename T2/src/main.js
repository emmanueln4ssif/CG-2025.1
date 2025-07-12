import * as THREE from 'three';
import { Clock } from 'three';
import { initRenderer, initCamera, initDefaultBasicLight, setDefaultMaterial, onWindowResize, createGroundPlaneXZ } from "../../libs/util/util.js";
import { setupEnvironment } from './environment.js';
import { raisePlatform, updatePlatform, key, platform, checkKeyPickup } from './key.js';
import { setupPlayer, updatePlayer, controls, player } from './player.js';
import { bullets, setupGun, setupCrosshair, shoot, updateBullets, handleShootingState, canShootNow, markShotFired, setupChaingun, setupWeaponSwitching } from './guns.js';
import { placeKeyAndUnlockDoor, openDoor, updateDoor, raiseRectangleWithKey, updateElevator, isPlayerOnTop, elevatorState } from './area2.js';
import { sunLight, ambientLight } from './light.js';
import { createEnemy, updateEnemies } from './enemies/enemies.js';
//import { getEnemyProjectiles } from './enemies/cacodemon.js'
import { SpriteMixer } from "../sprites/SpriteMixer.js";

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

   // Atualização dos inimigos
   updateEnemies(delta, controls.getObject(), camera, scene, collisionObjects, bullets);

   // Atualiza ambiente (inclui animação da plataforma)
   updatePlatform(collisionObjects);

   // ajustar com parte do Emerson [...] derrotou os inimigos da area 1...
   controls.getObject().defeatedEnemiesArea1 = true;
   //raisePlatform(key)

   // Verifica colisão com chave
   if (key) {
      key.rotation.x += 0.01;
      checkKeyPickup(controls, platform, key, scene);
   }

   // Verifica se o jogador pegou a chave, se sim, coloca a chave no bloco de ativação e desbloqueia a porta
   if (controls.getObject().hasKey) {
      placeKeyAndUnlockDoor(scene, controls);
   }

   // Verifica se o jogador desbloqueou a porta, se sim, abre a porta e move o elevador para baixo
   if (controls.getObject().hasKey && controls.getObject().unlockedDoor && !doorIsOpening) {

      openDoor(scene);
      doorIsOpening = true;
      elevatorState.goingDown = true;
      elevatorState.targetY = - (elevatorState.base.geometry.parameters.height / 2) + 0.1;
      elevatorState.moving = true;

      controls.getObject().hasKey = false; // chave já foi utilizada, seta como falsa para organizar o comportamento da chave 2
   }

   updateDoor(scene);
   updateElevator();

   // Verifica se o elevador está parado no chão e se o jogador está em cima dele, se sim, sobe o elevador até o nível da plataforma
   if (elevatorState.waiting && !elevatorState.moving && isPlayerOnTop(controls.getObject(), elevatorState.base)) {
      
      elevatorState.targetY = elevatorState.base.geometry.parameters.height / 2;
      elevatorState.moving = true;
      elevatorState.goingUp = true;
      elevatorState.waiting = false;
      
      //console.log("jogador está em cima do elevador. subindo...");
      // //verifica se quer subir o elevador pela pos y da base
      // console.log(elevatorBase.position.y);

      // if(elevatorBase.position.y < 2){
      //    elevatorState.targetY = elevatorState.base.geometry.parameters.height / 2;
      //    elevatorState.goingUp = true;
      //    elevatorState.goingDown = false;
      // } else {
      //    elevatorState.targetY = -3.9; // volta para o chão
      //    elevatorState.goingUp = false;
      //    elevatorState.goingDown = true;
      // }
      // elevatorState.moving = true;
      // elevatorState.waiting = false;
   }

   // ajustar com parte do Emerson [...] derrotou os inimigos da area 2...
   controls.getObject().defeatedEnemiesArea2 = true; // Simulando que o jogador derrotou os inimigos da área 2

   // Levanta o retângulo com a chave amarela se o jogador desbloqueou a porta e derrotou os inimigos da área 2
   let rectangle = scene.getObjectByName("rectangleWithKey");

   if (controls.getObject().unlockedDoor && controls.getObject().defeatedEnemiesArea2) {
      raiseRectangleWithKey(rectangle);
   }

   spriteMixer.update(delta); // animação dos sprites

   // Renderização da cena
   renderer.render(scene, camera);
   requestAnimationFrame(render);
}

//teste para levantar a plataforma com a tecla 'E' (APAGAR DEPOIS)
window.addEventListener('keydown', (event) => {
   if (event.key == 'e') {
      console.log("⏫ Tecla 'E' pressionada: plataforma com chave vermelha subindo");
      raisePlatform(key, 7);
   }
});


// Iniciar o loop de renderização
render();