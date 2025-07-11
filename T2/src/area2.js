// environment.js
import * as THREE from 'three';
import { createGroundPlaneXZ } from '../../libs/util/util.js';
import { buildKey, createPlatformWithKey, raisePlatform, updateObject, key, addRectangleWithKey } from './key.js';
import { controls } from './player.js';
import { Group } from '../../build/three.module.js';

export const elevatorState = {
  moving: false,
  goingDown: false,
  goingUp: false,
  waiting: false,
  targetY: 0,
  base: null 
};
export let yellowKey, rectangleWithYellowKey;
let doorIsOpening = false;
const doorOpenSpeed = 0.01;
let doorStartPosition = new THREE.Vector3();
let doorTargetPosition = new THREE.Vector3();
let elevatorBaseStartPosition = new THREE.Vector3();
let elevatorBaseTargetPosition = new THREE.Vector3();
let keyFading = false;
let keyFadeSpeed = 0.02;
let emissiveBoost = 0.05;

// AREA 2 ---------------------------------------------------------------------------
// Esta seção contém funções relacionadas à Área 2, incluindo a criação da plataforma com elevador

//Cria molde geral da area 2: Plataforma com elevador
export function buildPlatformWithElevator(scene, sideSize, frontSize, height, position, elevatorLength, elevatorDepth, color, receivedKey) {

  const platform = new THREE.Group();
  platform.userData.elevatorLength = elevatorLength;

  //Elevador no centro frontal
  const elevator = new THREE.Group();
  elevator.position.set(0, 0, -sideSize / 2 + elevatorDepth / 2);

  //Base do elevador (chão)
  const elevatorBase = new THREE.Mesh(
    new THREE.BoxGeometry(elevatorLength, height, elevatorDepth - 0.1),
    new THREE.MeshLambertMaterial({ color: 0x2F4F4F })
  );
  elevatorBase.name = "elevatorBase";
  elevatorState.base = elevatorBase; 
  elevatorBase.position.set(0, height / 2, 0);
  elevator.add(elevatorBase);

  //Porta do elevador
  const elevatorDoor = createElevatorDoor(0, height / 2, -elevatorDepth / 2 + 0.1, elevatorLength, height, 0.2);
  elevator.add(elevatorDoor);

  const frontalWidth = (frontSize - elevatorLength) / 2;

  //Frontais esquerda e direita
  const frontal1 = new THREE.Mesh(
    new THREE.BoxGeometry(frontalWidth, height, elevatorDepth),
    new THREE.MeshLambertMaterial({ color: color })
  );
  frontal1.position.set(- (elevatorLength / 2 + frontalWidth / 2), height / 2, elevator.position.z);

  const frontal2 = new THREE.Mesh(
    new THREE.BoxGeometry(frontalWidth, height, elevatorDepth),
    new THREE.MeshLambertMaterial({ color: color })
  );
  frontal2.position.set(elevatorLength / 2 + frontalWidth / 2, height / 2, elevator.position.z);

  //Traseira
  const traseira = new THREE.Mesh(
    new THREE.BoxGeometry(frontSize, height, sideSize - elevatorDepth),
    new THREE.MeshLambertMaterial({ color: color })
  );
  traseira.position.set(0, height / 2, sideSize / 2 - (sideSize - elevatorDepth) / 2);

  //Grupo
  platform.add(elevator, frontal1, frontal2, traseira);
  platform.position.set(position.x, position.y, position.z);
  scene.add(platform);

  for (let i = 0; i < 20; i++) {
    let randomX = THREE.MathUtils.randFloat(-frontSize / 2, frontSize / 2);
    let randomZ = THREE.MathUtils.randFloat(-sideSize / 2, sideSize / 2);
    let randomY = THREE.MathUtils.randFloat(2, 4);
    let randomHeight = THREE.MathUtils.randFloat(4, 15);
    platform.add(addRectangle(4, randomHeight, 4, { x: randomX, y: position.y + height + randomY, z: randomZ + 10 }, "red")); // Base da plataforma
  }

  //retangulos de onde sairão os inimigos
  let rectangleEnemieOne = platform.add(addRectangle(4, 2, 4, { x: 0, y: 10, z: 40 }, "yellow")); // Esquerda
  let rectangleEnemieTwo = platform.add(addRectangle(4, 2, 4, { x: 40, y: 15, z: 0 }, "yellow")); // Direita
  let rectangleEnemieThree = platform.add(addRectangle(4, 2, 4, { x: -30, y: 18, z: 30 }, "yellow")); // Traseira

  // cria o retangulo que vai ficar com a chave
  let blockMesh = addRectangle(4, 2, 4, { x: 0, y: 0, z: 0 }, "blue");
  let rectangleWithYellowKey = addRectangleWithKey(blockMesh, receivedKey, platform);

  return platform;

}



// PORTA ---------------------------------------------------------------------------
// Esta seção contém funções relacionadas à porta do elevador, incluindo sua criação, animação e interação com o jogador


//Cria porta do elevador intercalando cores das ripas
// Esta função é chamada quando o elevador é criado, para adicionar a porta com ripas de madeira
export function createElevatorDoor(x, y, z, doorWidth, doorHeight, doorDepth) {

  let doorGroup = new THREE.Group();

  const ripaWidth = 1;
  const numRipas = Math.floor(doorWidth / ripaWidth);

  const colors = [0x8B4513, 0xA0522D];

  for (let i = 0; i < numRipas; i++) {
    const color = colors[i % 2];

    const ripa = new THREE.Mesh(
      new THREE.BoxGeometry(ripaWidth, doorHeight, doorDepth),
      new THREE.MeshLambertMaterial({ color })
    );

    const offsetX = -doorWidth / 2 + ripaWidth / 2 + i * ripaWidth;
    ripa.position.set(offsetX, doorHeight / 2, 0);

    doorGroup.add(ripa);
  }

  //bloco que vai ficar com a chave
  const activationBlock = new THREE.Mesh(
    new THREE.BoxGeometry(3, 0.5, 1),
    new THREE.MeshLambertMaterial({ color: 0x4B3621 })
  );
  activationBlock.position.set(doorGroup.position.x, 1, doorGroup.position.z - 0.5);
  doorGroup.add(activationBlock);
  activationBlock.name = "activationBlock";

  doorGroup.position.set(x, 0, z);
  doorGroup.name = "elevatorDoor";

  return doorGroup;

}


//Função chamada no render()
//Tem como objetivo colocar a chave no bloco de ativação e setar a porta como desbloqueada
//Esta função é chamada no loop de renderização, quando o jogador está próximo da porta e tem chave da Área 1
export function placeKeyAndUnlockDoor(scene, controls) {
    const activationBlock = scene.getObjectByName("activationBlock");

    //Se o bloco de ativação existir
    if (activationBlock) {

        const blockPosition = new THREE.Vector3();
        activationBlock.getWorldPosition(blockPosition);

        const platformWithKey = scene.getObjectByName("platformWithKeyColorRed");

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


//Função para delimitar a abertura da porta da plataforma do elevador
//Esta função é chamada no loop de renderização
export function openDoor(scene) {

    let doorGroup = scene.getObjectByName("elevatorDoor");
    if (doorIsOpening) return;

    doorIsOpening = true;

    let doorOpenDistance = doorGroup.parent.parent.userData.elevatorLength;

    doorStartPosition.copy(doorGroup.position);
    doorTargetPosition.set(doorGroup.position.x - doorOpenDistance, doorGroup.position.y, doorGroup.position.z - 0.25);

}

//Função para atualizar a posição da porta do elevador com o lerp de animação
//Esta função é chamada no loop de renderização
export function updateDoor(scene) {

    let doorGroup = scene.getObjectByName("elevatorDoor");

    if (!doorIsOpening) return;

    //Movimenta suavemente a porta na direção do alvo
    doorGroup.position.lerp(doorTargetPosition, doorOpenSpeed);

    //Para animação quando chega perto do alvo e atualiza a posição final
    if (doorGroup.position.distanceTo(doorTargetPosition) < 0.01) {
        doorGroup.position.copy(doorTargetPosition);
        doorIsOpening = false;
    }
}



// ELEVADOR ---------------------------------------------------------------------------
// Esta seção contém funções relacionadas ao elevador da Área 2, incluindo sua movimentação e interação com o jogador


//Função para atualizar o elevador
//Esta função é chamada no loop de renderização
export function updateElevator() {
  const { moving, base, targetY } = elevatorState;

  if (!moving || !base) return;

  base.position.y = THREE.MathUtils.lerp(
    base.position.y,
    targetY,
    0.015
  );

  if (Math.abs(base.position.y - targetY) < 0.05) {
    base.position.y = targetY;
    elevatorState.moving = false;

    if (elevatorState.goingDown) {
      elevatorState.goingDown = false;
      elevatorState.waiting = true;
    } else if (elevatorState.goingUp) {
      elevatorState.goingUp = false;
    }

    console.log("🚀 Elevador chegou ao destino:", targetY);
  }
}


//Função para descer o elevador
//Chamada no render() assim que o jogador abre a porta do elevador
export function downElevator(scene) {

  let elevatorBase = scene.getObjectByName("elevatorBase");
  if (!elevatorBase) return;

  elevatorMoving = true;

  let elevatorTargetY = 0.1; // ele vai até o chão

  elevatorBaseStartPosition.copy(elevatorBase.position);
  elevatorBaseTargetPosition.set(elevatorBase.position.x, elevatorTargetY, elevatorBase.position.z);
  //console.log("Dados do elevador:", JSON.stringify(elevatorBase));

}


// Função para verificar se o jogador está em cima do elevador
export function isPlayerOnTop(playerObject, base) {

   const playerPos = playerObject.position.clone(); // Posição do jogador
   const baseBox = new THREE.Box3().setFromObject(base); // Cria uma caixa delimitadora para a base do elevador

   // Pequeno box nos pés do jogador (altura baixa para evitar falsos positivos)
   const feetBox = new THREE.Box3(
      new THREE.Vector3(playerPos.x - 0.4, playerPos.y - 1.9, playerPos.z - 0.4),
      new THREE.Vector3(playerPos.x + 0.4, playerPos.y - 1.7, playerPos.z + 0.4)
   );

   return baseBox.intersectsBox(feetBox);
}



// RETANGULOS ---------------------------------------------------------------------------
// Esta seção contém funções relacionadas a retângulos que são usados como plataformas ou obstáculos na Area


// Função para adicionar um retângulo ao cenário
// Esta função é usada para criar retângulos que podem ser usados como plataformas ou obstáculos na Area 2
export function addRectangle(width, height, depth, position, color) {

  const rectangle = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    new THREE.MeshLambertMaterial({ color: color })
  );
  rectangle.position.set(position.x, position.y, position.z);
  rectangle.castShadow = true;
  rectangle.receiveShadow = true;
  rectangle.userData = {
    isRectangle: true,
    width: width,
    height: height,
    depth: depth
  };


  return rectangle;

}

//Função que ergue o retangulo com a chave da area 2
// Esta função é chamada quando o jogador derrota os inimigos da área 2 e desbloqueia a chave
export function raiseRectangleWithKey(rectangle) {
    if (!rectangle) return;
    rectangle.children[1].visible = true; // Torna a chave invisível após ser coletada
    rectangle.children[1].rotateX(0.01); // Animação de rotação da chave
    rectangle.position.y = THREE.MathUtils.lerp(rectangle.position.y, 20, 0.05);
}



//APAGAR DEPOIS DE CONFERIR
// export function updateElevatorBase(scene) {
//   let elevatorBase = scene.getObjectByName("elevatorBase");
//   if (!elevatorBase || !elevatorMoving) return;

//   //Movimenta suavemente a base do elevador na direção do alvo
//   elevatorBase.position.lerp(elevatorBaseTargetPosition, doorOpenSpeed);
//   //console.log("Elevador:", elevatorBase.position);

//   //Para animação quando chegou perto
//   if (elevatorBase.position.distanceTo(elevatorBaseTargetPosition) < 0.01) {
//     elevatorBase.position.copy(elevatorBaseTargetPosition);
//     elevatorMoving = false;
//     //console.log("Elevador parado na posição:", elevatorBase.position);
//   }
// }