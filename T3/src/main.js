import * as THREE from 'three';
import { Clock } from 'three';
import { initRenderer, initCamera, initDefaultBasicLight, setDefaultMaterial, onWindowResize, createGroundPlaneXZ } from "../../libs/util/util.js";
import { setupEnvironment } from './environment.js';
import { key, platform, checkKeyPickup, updatePlatformMovement, raisePlatformTo, yellowKey, redKey } from './key.js';
import { setupHealthBar, setupPlayer, updatePlayer, controls, player } from './player.js';
import { bullets, setupLauncher, shootAction, setupCrosshair, shoot, updateBullets, handleShootingState, canShootNow, markShotFired, setupChaingun, setupWeaponSwitching, updateFireRate, currentWeapon } from './guns.js';
import { placeKeyAndUnlockDoor, openDoor, updateDoor, updateElevator, isPlayerOnTop, elevatorState, yellowKeyPlatform, canUseElevator } from './area2.js';
import { area4Wall, blueKey, updateWall, placeBlueKeyAndLowerWall } from './area4.js'
import { sunLight, ambientLight } from './light.js';
import { createEnemy, updateEnemies, allEnemies, checkDefeatedEnemies, updateEnemyProjectiles } from './enemies/enemies.js';
import { SpriteMixer } from "../../libs/sprites/SpriteMixer.js";
import {CubeTextureLoaderSingleFile} from "../../libs/util/CubeTextureLoaderSingleFile.js";
// --- Cena Básica ---
export let scene = new THREE.Scene()
let renderer = initRenderer();
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
//renderer.setClearColor("rgb(8, 79, 150)");

// GARANTE QUE TODOS OS OBJETOS USAM SOMBRA
scene.traverse(obj => {
   if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
   }
});

let cubeMapTexture = new CubeTextureLoaderSingleFile().loadSingle('assets/textures/skybox/sky01.png', 1);
scene.background = cubeMapTexture;

//Luzes
scene.add(ambientLight);
scene.add(sunLight);

export let camera = initCamera(new THREE.Vector3(0.0, 0.0, -10));
const clock = new Clock();
let spriteMixer = SpriteMixer();

let collisionObjects = [];
let collisionEnemies = [];
setupEnvironment(scene, collisionObjects, sunLight);

// Setup do personagem e câmera
setupPlayer(camera, scene, renderer);
setupWeaponSwitching();
setupLauncher(camera, spriteMixer)
setupChaingun(camera, spriteMixer)
setupCrosshair();
handleShootingState();
controls.getObject().userData.isPlayer = true;

// Setup dos inimigos
createEnemy('lost_soul', new THREE.Vector3(115, 15, 190), scene, collisionEnemies);
createEnemy('lost_soul', new THREE.Vector3(205, 18, 190), scene, collisionEnemies);
createEnemy('lost_soul', new THREE.Vector3(160, 8, 150), scene, collisionEnemies);
createEnemy('lost_soul', new THREE.Vector3(120, 12, 120), scene, collisionEnemies);
createEnemy('lost_soul', new THREE.Vector3(200, 14, 120), scene, collisionEnemies);
createEnemy('cacodemon', new THREE.Vector3(5, 25, 190), scene, collisionEnemies);
createEnemy('cacodemon', new THREE.Vector3(40, 30, 145), scene, collisionEnemies);
createEnemy('cacodemon', new THREE.Vector3(-25, 25, 180), scene, collisionEnemies);

let inimigosCriados = false;

export function novosInimigos() {
   if (!inimigosCriados){
      createEnemy('cacodemon', new THREE.Vector3(-160, 10, -135), scene, collisionEnemies);
      createEnemy('cacodemon', new THREE.Vector3(-80, 10, -135), scene, collisionEnemies);
      createEnemy('painElemental', new THREE.Vector3(-100, 25, -150), scene, collisionEnemies);
      createEnemy('cacodemon', new THREE.Vector3(80, 10, -135), scene, collisionEnemies);
      createEnemy('cacodemon', new THREE.Vector3(160, 10, -130), scene, collisionEnemies);
      inimigosCriados = true;
   }
}

export function createLostSoulEnemies(position) {
   createEnemy('lost_soul', position);
}

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

// --- Renderização ---
function render() {
   const delta = Math.min(clock.getDelta(), 0.1);

   // Atualização do personagem
   updatePlayer(delta, collisionObjects);

   // Tiro
   updateFireRate(); // Atualiza a taxa de disparo com base na arma atual
   // const currentTime = performance.now();
   // if (canShootNow(currentTime)) {
   //    shoot(scene, camera);
   //    markShotFired(currentTime);
   // }

   const deltaMs = delta * 1000; // converter para milissegundos

   // Atualiza o mixer das sprites (importante!)
   spriteMixer.update(deltaMs);

   // Verifica se pode disparar
   const currentTime = performance.now();
   if (canShootNow(currentTime)) {
      shoot(scene, camera, collisionEnemies);
      markShotFired(currentTime);

      // Exibe a animação da chaingun (foguinho) a cada tiro
      if (currentWeapon === 'chaingun' && shootAction) {
         shootAction.playOnce(); // mostra o frame animado por 100ms
      }
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
      raisePlatformTo(4.5, platform);
      platformKey1Raised = true;
   }

   //Se derrotou os inimigos da area 2, levanta o retângulo com a chave amarela...
   if (checkDefeated.defeatedEnemiesArea2 === true && !platformKey2Raised) {
      raisePlatformTo(12, yellowKeyPlatform);
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

// Chave azul (integração direta)
    if (blueKey) {
        blueKey.rotation.x += 0.01;
        
        // Usa a própria chave como "plataforma" para compatibilidade
        checkKeyPickup(controls, blueKey, blueKey, scene);
    }

    // Atualização do muro
    updateWall(delta);

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

   if (blueKey && controls.getObject().hasBlueKey) {
      placeBlueKeyAndLowerWall(scene, controls);
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
   //Define comportamento do elevador acaso o usuário caia da plataforma e precise voltar para o topo
   const isElevatorAtTop = Math.abs(elevatorState.base.position.y - (elevatorState.base.geometry.parameters.height / 2)) < 0.05;

     //Se o elevador está no topo, parado, e o jogador está no chão
   if (isElevatorAtTop && !elevatorState.moving && controls.getObject().position.y < 2 && doorIsOpen) {
      elevatorState.targetY = - (elevatorState.base.geometry.parameters.height / 2) + 0.1;
      elevatorState.moving = true;
      elevatorState.goingDown = true;
      elevatorState.waiting = false;
   }

   spriteMixer.update(delta); // animação dos sprites
   updateEnemyProjectiles(delta);

   // Renderização da cena
   renderer.render(scene, camera);
   renderer.toneMapping = THREE.ACESFilmicToneMapping;
   renderer.toneMappingExposure = 1.0;
   requestAnimationFrame(render);
}

//teste para levantar a chave vermelha com a tecla 'E' (em caso de erro na animação)
window.addEventListener('keydown', (event) => {
   if (event.key === 'e') {
      raisePlatformTo(4.5, platform); // altura desejada
   }
});

export function playerMorreu() {
    console.log("O jogador morreu!");

    // 1. Cria uma DIV cobrindo a tela toda
    const gameOverDiv = document.createElement('div');
    gameOverDiv.style.position = 'fixed';
    gameOverDiv.style.top = 0;
    gameOverDiv.style.left = 0;
    gameOverDiv.style.width = '100%';
    gameOverDiv.style.height = '100%';
    gameOverDiv.style.backgroundColor = 'rgba(255, 0, 0, 0)'; // começa transparente
    gameOverDiv.style.display = 'flex';
    gameOverDiv.style.flexDirection = 'column';
    gameOverDiv.style.justifyContent = 'center';
    gameOverDiv.style.alignItems = 'center';
    gameOverDiv.style.zIndex = 1000;
    gameOverDiv.style.transition = 'background-color 2s'; // fade
    document.body.appendChild(gameOverDiv);

    // 2. Texto principal "Você morreu"
    const deathText = document.createElement('div');
    deathText.innerText = "Você morreu";
    deathText.style.color = 'yellow';
    deathText.style.fontSize = '48px';
    deathText.style.fontFamily = 'Arial, sans-serif';
    deathText.style.marginBottom = '20px';
    gameOverDiv.appendChild(deathText);

    // 3. Texto secundário "Enter para tentar novamente"
    const retryText = document.createElement('div');
    retryText.innerText = "Enter para tentar novamente";
    retryText.style.color = 'white';
    retryText.style.fontSize = '24px';
    retryText.style.fontFamily = 'Arial, sans-serif';
    gameOverDiv.appendChild(retryText);

    // 4. Inicia o fade vermelho
    setTimeout(() => {
        gameOverDiv.style.backgroundColor = 'rgba(255, 0, 0, 0.7)';
    }, 100); // pequeno delay pra pegar o transition

    // 5. Função para reiniciar o jogo
    function reloadGame(e) {
        if (e.key === 'Enter') {
            window.location.reload(); // recarrega a página
        }
    }

    window.addEventListener('keydown', reloadGame);

    // Atualiza projéteis inimigos
    updateAllEnemyProjectiles(delta, scene, player, environmentObjects);
}

// Iniciar o loop de renderização
render();

export {collisionObjects};

window.addEventListener('keydown', (event) => {
    if (event.key.toLowerCase() === 'c') {
        scene.traverse((obj) => {
            if (obj.name && obj.name.includes("Key")) {
                obj.position.set(
                    camera.position.x,
                    camera.position.y -8,
                    camera.position.z
                );
            }
        });
    }
});


window.addEventListener('keydown', (event) => {
        if (event.key.toLowerCase() === 'g') {
            player.godLike = true;
        }      
});

window.addEventListener('keydown', (event) => {
        if (event.key.toLowerCase() === 'p') {
            console.log("Posição do jogador:", camera.position);
        }      
});