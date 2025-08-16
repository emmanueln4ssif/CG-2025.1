// environment.js
import * as THREE from 'three';
import { createGroundPlaneXZ } from '../../libs/util/util.js';
import { buildKey, createPlatformWithKey, updateObject, key, addRectangleWithKey } from './key.js';
import { controls } from './player.js';
import { Group } from '../../build/three.module.js';
import { manager } from './loadingManager.js';

// Sons
let doorSound, elevatorSound;

async function loadSound(paths) {
  for (const path of paths) {
    try {
      const response = await fetch(path);
      if (response.ok) {
        return new Audio(path);
      }
    } catch (e) {
    }
  }
  console.error("Nenhum caminho válido encontrado para o som:", paths);
  return null;
}

(async () => {
  doorSound = await loadSound([
    './0_assetsT3/sounds/doorOpening.wav',
    '../0_assetsT3/sounds/doorOpening.wav'
  ]);

  elevatorSound = await loadSound([
    './0_assetsT3/sounds/plataformaMovendo.wav',
    '../0_assetsT3/sounds/plataformaMovendo.wav'
  ]);
})();

// Exemplo de uso:
  if (doorSound) doorSound.play();
  if (elevatorSound) elevatorSound.play();

export const elevatorState = {
  moving: false,
  goingDown: false,
  goingUp: false,
  waiting: false,
  targetY: 0,
  base: null,
  nextStep: null
};

export let yellowKey, rectangleWithYellowKey, yellowKeyPlatform;

const doorOpenSpeed = 0.01;
let doorIsOpening = false;
let doorStartPosition = new THREE.Vector3();
let doorTargetPosition = new THREE.Vector3();

let keyFadeSpeed = 0.02;

let lastElevatorUse = 0;
const elevatorCooldown = 5000;
const loader = new THREE.TextureLoader(manager);

//TEXTURAS DE METAL:
const metalTextures = {
  colorMap: loader.load('assets/textures/area2/metal/MetalPlates001_1K-PNG_Color.png'),
  metalnessMap: loader.load('assets/textures/area2/metal/MetalPlates001_1K-PNG_Metalness.png'),
  displacementMap: loader.load('assets/textures/area2/metal/MetalPlates001_1K-PNG_Displacement.png'),
  normalMap: loader.load('assets/textures/area2/metal/MetalPlates001_1K-PNG_NormalGL.png')
};

const floorMetalTextures = {
  colorMap: loader.load('assets/textures/area2/floor/floor_Color.png'),
  metalnessMap: loader.load('assets/textures/area2/floor/floor_Metalness.png'),
  displacementMap: loader.load('assets/textures/area2/floor/floor_Displacement.png'),
  normalMap: loader.load('assets/textures/area2/floor/floor_NormalGL.png')
};

const fenceMetalTextures = {
  colorMap: loader.load('assets/textures/area2/fence/MetalWalkway005_1K-PNG_Color.png'),
  displacementMap: loader.load('assets/textures/area2/fence/MetalWalkway005_1K-PNG_Displacement.png'),
  normalMap: loader.load('assets/textures/area2/fence/MetalWalkway005_1K-PNG_NormalGL.png'),
  alphaMap: loader.load('assets/textures/area2/fence/MetalWalkway005_1K-PNG_Opacity.png')
};

const elevatorBaseTextures = {
  colorMap: loader.load('assets/textures/area2/elevator/MetalPlates005_1K-PNG_Color.png'),
  metalnessMap: loader.load('assets/textures/area2/elevator/MetalPlates005_1K-PNG_Metalness.png'),
  displacementMap: loader.load('assets/textures/area2/elevator/MetalPlates005_1K-PNG_Displacement.png'),
  normalMap: loader.load('assets/textures/area2/elevator/MetalPlates005_1K-PNG_NormalGL.png')
};

const blockTextures = {
  colorMap: loader.load('assets/textures/area2/elevatorBase/Metal056C_1K-PNG_Color.png'),
  metalnessMap: loader.load('assets/textures/area2/elevatorBase/Metal056C_1K-PNG_Metalness.png'),
  displacementMap: loader.load('assets/textures/area2/elevatorBase/Metal056C_1K-PNG_Displacement.png'),
  normalMap: loader.load('assets/textures/area2/elevatorBase/Metal056C_1K-PNG_NormalGL.png')
};

const caixa = {
  colorMap: loader.load('assets/textures/area2/box/box.jpg'),
  displacementMap: loader.load('assets/textures/area2/box/box_displacement.png'),
  normalMap: loader.load('assets/textures/area2/box/box_normal.png'),
  specularMap: loader.load('assets/textures/area2/box/box_specular.png')
}

const ironPlateTextures = {
  colorMap: loader.load('assets/textures/area2/iron_plate/iron_plate.jpg'),
  displacementMap: loader.load('assets/textures/area2/iron_plate/iron_plate_displacement.png'),
  normalMap: loader.load('assets/textures/area2/iron_plate/iron_plate_normal.png')
};

// AREA 2 ---------------------------------------------------------------------------
// Esta seção contém funções relacionadas à Área 2, incluindo a criação da plataforma com elevador

//Cria molde geral da area 2: Plataforma com elevador
export function buildPlatformWithElevator(scene, sideSize, frontSize, height, position, elevatorLength, elevatorDepth, color, receivedKey) {

  const platform = new THREE.Group();
  platform.userData.elevatorLength = elevatorLength;

  //Elevador no centro frontal
  const elevator = new THREE.Group();
  elevator.position.set(0, 0, -sideSize / 2 + elevatorDepth / 2);

  const elevatorMaterial = createRepeatingMaterial(1, 1, elevatorBaseTextures);

  //Base do elevador (chão)
  const elevatorBase = new THREE.Mesh(
    new THREE.BoxGeometry(elevatorLength, height, elevatorDepth - 2),
    elevatorMaterial
  );
  elevatorBase.name = "elevatorBase";
  elevatorState.base = elevatorBase;
  elevatorBase.position.set(0, height / 2, 1);
  elevator.add(elevatorBase);

  //Porta do elevador
  const elevatorDoor = createElevatorDoor(0, height / 2, -elevatorDepth / 2 + 0.1, elevatorLength, height, 0.2);
  elevator.add(elevatorDoor);

  //Geometrias da base da área
  // Cria os materiais para cada tipo de face, pensando na repetição
  const sideMaterial = createRepeatingMetalMaterial(1, 1, metalTextures);
  const mainMaterial = createRepeatingMetalMaterial(4, 1, metalTextures);

  // Materiais da traseira
  const backMaterial = createRepeatingMetalMaterial(4, 1, metalTextures);
  const sideTraseiraMaterial = createRepeatingMetalMaterial(9, 1, metalTextures);
  const frontTraseiraMaterial = createRepeatingMetalMaterial(12, 1, metalTextures);
  const floorTraseiraMaterial = createRepeatingMaterial(32.59, 20, floorMetalTextures);
  const floorMainMaterial = createRepeatingMaterial(13.5, 3.2, floorMetalTextures);
  const ironPlateMaterial = createRepeatingMaterial(22, 4, ironPlateTextures, 0.8, -0.4);
  //100-5.6 = 94.4; 5.6 para 0,5 assim como 94.4 para x = 8,43
  //120-15 = 85; 42.5 para 8 assim como 120 para x = 22.59

  // Cria um array de materiais na ordem correta do boxgeometry, para cada uma das faces
  const frontMaterials = [
    sideMaterial, // dir
    sideMaterial, // esq 
    floorMainMaterial, // cima
    mainMaterial, // baixo
    ironPlateMaterial, // trás
    ironPlateMaterial  // frente
  ];

  const traseiraMaterials = [
    sideTraseiraMaterial,
    sideTraseiraMaterial,
    floorTraseiraMaterial,
    floorTraseiraMaterial,
    frontTraseiraMaterial,
    frontTraseiraMaterial
  ];


  const frontalWidth = (frontSize - elevatorLength) / 2;

  //Frontais esquerda e direita
  const frontal1 = new THREE.Mesh(
    new THREE.BoxGeometry(frontalWidth, height, elevatorDepth),
    frontMaterials
  );
  frontal1.position.set(- (elevatorLength / 2 + frontalWidth / 2), height / 2, elevator.position.z);

  const frontal2 = new THREE.Mesh(
    new THREE.BoxGeometry(frontalWidth, height, elevatorDepth),
    frontMaterials
  );
  frontal2.position.set(elevatorLength / 2 + frontalWidth / 2, height / 2, elevator.position.z);

  //Traseira
  const traseira = new THREE.Mesh(
    new THREE.BoxGeometry(frontSize, height, sideSize - elevatorDepth),
    traseiraMaterials
  );
  traseira.position.set(0, height / 2, sideSize / 2 - (sideSize - elevatorDepth) / 2);

  //Grupo
  platform.add(elevator, frontal1, frontal2, traseira);
  platform.position.set(position.x, position.y, position.z);
  platform.receiveShadow = true;
  platform.castShadow = true;
  scene.add(platform);


  //Adiciona os retângulos de diferentes alturas
  addMultipleRectangles(platform, sideSize, frontSize, height);

  //Retangulos com posições dos inimigos
  let rectangleEnemieOne = platform.add(addRectangle(4, 2, 4, { x: 0, y: 10, z: 40 }, 0x4B3621)); // Esquerda
  let rectangleEnemieTwo = platform.add(addRectangle(4, 2, 4, { x: 40, y: 15, z: 0 }, 0x4B3621)); // Direita
  let rectangleEnemieThree = platform.add(addRectangle(4, 2, 4, { x: -30, y: 18, z: 30 }, 0x4B3621)); // Traseira

  // Cria o retângulo com suporte para a chave
  const keySupport = createKeySupport(new THREE.Vector3(0, 0, 0));
  keySupport.name = "keySupport";

  let rectangleWithYellowKey = addRectangleWithKey(keySupport, receivedKey, platform);
  yellowKeyPlatform = keySupport;

  keySupport.add(rectangleWithYellowKey);
  keySupport.position.set(0, 0, 0);

  platform.add(keySupport);

  return platform;

}

//Cria suporte para a chave
function createKeySupport(position) {
  const group = new THREE.Group();

  // Material padrão
  const texture = createRepeatingMaterial(1, 3, caixa, -0.15, -0.1);
  const downTexture = createRepeatingMaterial(1, 1, caixa, -0.15, -0.1);

  // Bloco superior (tampa)
  const topGeometry = new THREE.BoxGeometry(5, 14, 5);
  const top = new THREE.Mesh(topGeometry, texture);
  top.name = "topBlock";
  top.position.y = 9.5;
  group.add(top);

  // Bloco inferior (base de apoio)
  const bottomGeometry = new THREE.BoxGeometry(5, 4, 5);
  const bottom = new THREE.Mesh(bottomGeometry, downTexture);
  bottom.name = "bottomBlock";
  bottom.position.y = -4;
  group.add(bottom);

  group.position.copy(position);

  return group;
}


// PORTA DO ELEVADOR ---------------------------------------------------------------------------
// Esta seção contém funções relacionadas à porta do elevador, incluindo sua criação, animação e interação com o jogador


//Cria porta do elevador intercalando cores das ripas
// Esta função é chamada quando o elevador é criado, para adicionar a porta com ripas de madeira
export function createElevatorDoor(x, y, z, doorWidth, doorHeight, doorDepth) {

  let doorGroup = new THREE.Group();

  const ripaWidth = 1;
  const numRipas = Math.floor(doorWidth / ripaWidth);
  const material = createRepeatingMaterial(0.2, 1, fenceMetalTextures);
  const materialBlock = createRepeatingMaterial(0.25, 0.1, blockTextures, 0, 0)
  material.transparent = true;
  material.opacity = 0.8;

  const colors = [0x8B4513, 0xA0522D];

  for (let i = 0; i < numRipas; i++) {
    const color = colors[i % 2];

    const ripa = new THREE.Mesh(
      new THREE.BoxGeometry(ripaWidth, doorHeight, doorDepth),
      material
    );

    const offsetX = -doorWidth / 2 + ripaWidth / 2 + i * ripaWidth;
    ripa.position.set(offsetX, doorHeight / 2);

    doorGroup.add(ripa);
  }

  //bloco que vai ficar com a chave
  const activationBlock = new THREE.Mesh(
    new THREE.BoxGeometry(3, 0.5, 2),
    materialBlock

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
  doorSound.play(); // Toca o som da porta abrindo

  let doorOpenDistance = doorGroup.parent.parent.userData.elevatorLength;

  doorStartPosition.copy(doorGroup.position);
  doorTargetPosition.set(doorGroup.position.x - doorOpenDistance, doorGroup.position.y, doorGroup.position.z - 1);

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


//Função para atualizar o comportamento do elevador
//Esta função é chamada no loop de renderização e obedece ao estado do elevador
export function updateElevator() {

  const { moving, base, targetY } = elevatorState;

  if (!moving || !base) return;

  // Se o elevador acabou de começar a se mover
  if (Math.abs(base.position.y - targetY) > 1) {
    elevatorSound.play();
  }

  base.position.y = THREE.MathUtils.lerp(base.position.y, targetY, 0.015);

  if (Math.abs(base.position.y - targetY) < 0.05) {
    base.position.y = targetY;
    elevatorState.moving = false;

    if (elevatorState.goingDown) {
      elevatorState.goingDown = false;
      elevatorState.waiting = true;
    } else if (elevatorState.goingUp) {
      elevatorState.goingUp = false;
      elevatorState.waiting = true;
    }

    //console.log("elevador chegou ao destino:", targetY);
  }
}


//Função para verificar se o jogador está em cima do elevador a partir de uma caixa delimitadora
export function isPlayerOnTop(playerObject, base, scene) {

  const playerPos = playerObject.position.clone(); // Posição do jogador

  const baseBox = new THREE.Box3().setFromObject(base); // Cria uma caixa delimitadora para a base do elevador

  //const helper = new THREE.Box3Helper(baseBox, new THREE.Color(0xff0000));
  //scene.add(helper);

  // Boxes que vão simular os pés do jogador
  const feetBox = new THREE.Box3(
    new THREE.Vector3(playerPos.x - 0.4, playerPos.y - 2.0, playerPos.z - 0.4),
    new THREE.Vector3(playerPos.x + 0.4, playerPos.y - 2.0, playerPos.z + 0.4)
  );

  //const helper2 = new THREE.Box3Helper(feetBox, new THREE.Color(0x00ff00));
  //scene.add(helper2);

  return baseBox.intersectsBox(feetBox); // se o "pé" intersecta o elevador, retorna true
}


// Função para verificar se o jogador pode usar o elevador dado um intervalo definido 
export function canUseElevator() {

  const now = performance.now();

  if (now - lastElevatorUse > elevatorCooldown) {
    lastElevatorUse = now;
    return true;
  }

  return false;
}



// RETANGULOS ---------------------------------------------------------------------------
// Esta seção contém funções relacionadas a retângulos que são usados como obstáculos na Area 2


// Função para adicionar um retângulo simples ao cenário
// Esta função é usada para criar retângulos que podem ser usados como plataformas ou obstáculos na Area 2
export function addRectangle(width, height, depth, position, color) {

  //const rectangleMaterial = createRepeatingMaterial(3/6, height/6, caixa);
  const texture = createRepeatingMaterial(width / 4, height / 4, caixa, -0.15, -0.1);
  texture.normalScale.set(0.1, 0.1);
  const geometry = new THREE.BoxGeometry(width, height, depth);
  geometry.attributes.uv2 = geometry.attributes.uv;

  const rectangle = new THREE.Mesh(
    geometry,
    texture
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

function addMultipleRectangles(platform, sideSize, frontSize, height) {

  platform.add(addRectangle(4, 10, 4, { x: (-frontSize / 2 + 5) + 6, y: height + 5, z: (-sideSize / 2 + 5) + 8 }, 0x4B3621));
  platform.add(addRectangle(4, 20, 4, { x: (-frontSize / 2 + 5) + 10, y: height + 10, z: (-sideSize / 2 + 5) + 25 }, 0x4B3621));
  platform.add(addRectangle(4, 16, 4, { x: (-frontSize / 2 + 5) + 5, y: height + 8, z: (-sideSize / 2 + 5) + 38 }, 0x4B3621));
  platform.add(addRectangle(4, 18, 4, { x: (-frontSize / 2 + 5) + 18, y: height + 5, z: (-sideSize / 2 + 9) + 55 }, 0x4B3621));
  platform.add(addRectangle(4, 13, 4, { x: (-frontSize / 2 + 5) + 23, y: height + 6, z: (-sideSize / 2 + 5) + 10 }, 0x4B3621));
  platform.add(addRectangle(4, 14, 4, { x: (-frontSize / 2 + 5) + 29, y: height + 7, z: (-sideSize / 2 + 5) + 32 }, 0x4B3621));
  platform.add(addRectangle(4, 6, 4, { x: (-frontSize / 2 + 5) + 36, y: height + 3, z: (-sideSize / 2 + 5) + 48 }, 0x4B3621));
  platform.add(addRectangle(4, 14, 4, { x: (-frontSize / 2 + 5) + 47, y: height + 7, z: (-sideSize / 2 + 5) }, 0x4B3621));
  platform.add(addRectangle(4, 10, 4, { x: (-frontSize / 2 + 5) + 33, y: height + 5, z: (-sideSize / 2 + 5) }, 0x4B3621));

  platform.add(addRectangle(4, 10, 4, { x: (-frontSize / 2 + 5) + 1, y: height + 5, z: (-sideSize / 2 + 5) + 22 }, 0x4B3621));
  platform.add(addRectangle(4, 20, 4, { x: (-frontSize / 2 + 5) + 10, y: height + 10, z: (-sideSize / 2 + 5) + 55 }, 0x4B3621));
  platform.add(addRectangle(4, 16, 4, { x: (-frontSize / 2 + 5) + 5, y: height + 8, z: (-sideSize / 2 + 5) + 68 }, 0x4B3621));
  platform.add(addRectangle(4, 18, 4, { x: (-frontSize / 2 + 5) + 18, y: height + 9, z: (-sideSize / 2 + 9) + 85 }, 0x4B3621));
  platform.add(addRectangle(4, 18, 4, { x: (-frontSize / 2 + 5) + 40, y: height + 9, z: (-sideSize / 2 + 9) + 75 }, 0x4B3621));
  platform.add(addRectangle(4, 13, 4, { x: (-frontSize / 2 + 5) + 23, y: height + 6, z: (-sideSize / 2 + 5) + 40 }, 0x4B3621));
  platform.add(addRectangle(4, 6, 4, { x: (-frontSize / 2 + 5) + 22, y: height + 3, z: (-sideSize / 2 + 5) + 62 }, 0x4B3621));
  platform.add(addRectangle(4, 6, 4, { x: (-frontSize / 2 + 5) + 30, y: height + 3, z: (-sideSize / 2 + 5) + 78 }, 0x4B3621));
  platform.add(addRectangle(4, 10, 4, { x: (-frontSize / 2 + 5) + 47, y: height + 5, z: (-sideSize / 2 + 5) }, 0x4B3621));
  platform.add(addRectangle(4, 10, 4, { x: (-frontSize / 2 + 5) + 33, y: height + 5, z: (-sideSize / 2 + 5) }, 0x4B3621));
  platform.add(addRectangle(4, 18, 4, { x: (-frontSize / 2 + 5) + 40, y: height + 9, z: (-sideSize / 2 + 9) + 88 }, 0x4B3621));
  platform.add(addRectangle(4, 24, 4, { x: (-frontSize / 2 + 5), y: height + 12, z: (-sideSize / 2 + 9) + 88 }, 0x4B3621));
  platform.add(addRectangle(4, 14, 4, { x: (-frontSize / 2 + 5), y: height + 7, z: (-sideSize / 2 + 9) + 70 }, 0x4B3621));

  platform.add(addRectangle(4, 10, 4, { x: -((-frontSize / 2 + 5) + 6), y: height + 5, z: (-sideSize / 2 + 5) + 8 }, 0x4B3621));
  platform.add(addRectangle(4, 20, 4, { x: -((-frontSize / 2 + 5) + 10), y: height + 10, z: (-sideSize / 2 + 5) + 25 }, 0x4B3621));
  platform.add(addRectangle(4, 16, 4, { x: -((-frontSize / 2 + 5) + 5), y: height + 8, z: (-sideSize / 2 + 5) + 38 }, 0x4B3621));
  platform.add(addRectangle(4, 18, 4, { x: -((-frontSize / 2 + 5) + 18), y: height + 5, z: (-sideSize / 2 + 9) + 55 }, 0x4B3621));
  platform.add(addRectangle(4, 18, 4, { x: -((-frontSize / 2 + 5) + 23), y: height + 9, z: (-sideSize / 2 + 5) + 10 }, 0x4B3621));
  platform.add(addRectangle(4, 14, 4, { x: -((-frontSize / 2 + 5) + 29), y: height + 7, z: (-sideSize / 2 + 5) + 32 }, 0x4B3621));
  platform.add(addRectangle(4, 6, 4, { x: -((-frontSize / 2 + 5) + 36), y: height + 3, z: (-sideSize / 2 + 5) + 48 }, 0x4B3621));
  platform.add(addRectangle(4, 10, 4, { x: -((-frontSize / 2 + 5) + 47), y: height + 5, z: (-sideSize / 2 + 5) }, 0x4B3621));
  platform.add(addRectangle(4, 10, 4, { x: -((-frontSize / 2 + 5) + 33), y: height + 5, z: (-sideSize / 2 + 5) }, 0x4B3621));

  platform.add(addRectangle(4, 10, 4, { x: -((-frontSize / 2 + 5)), y: height + 5, z: ((-sideSize / 2 + 5) + 20) }, 0x4B3621));
  platform.add(addRectangle(4, 20, 4, { x: -((-frontSize / 2 + 5) + 10), y: height + 10, z: (-sideSize / 2 + 5) + 45 }, 0x4B3621));
  platform.add(addRectangle(4, 16, 4, { x: -((-frontSize / 2 + 5) + 5), y: height + 8, z: (-sideSize / 2 + 5) + 68 }, 0x4B3621));
  platform.add(addRectangle(4, 18, 4, { x: -((-frontSize / 2 + 5) + 18), y: height + 9, z: (-sideSize / 2 + 9) + 85 }, 0x4B3621));
  platform.add(addRectangle(4, 18, 4, { x: -((-frontSize / 2 + 5) + 40), y: height + 9, z: (-sideSize / 2 + 9) + 75 }, 0x4B3621));
  platform.add(addRectangle(4, 13, 4, { x: -((-frontSize / 2 + 5) + 23), y: height + 6, z: (-sideSize / 2 + 5) + 40 }, 0x4B3621));
  platform.add(addRectangle(4, 6, 4, { x: -((-frontSize / 2 + 5) + 22), y: height + 3, z: (-sideSize / 2 + 5) + 62 }, 0x4B3621));
  platform.add(addRectangle(4, 6, 4, { x: -((-frontSize / 2 + 5) + 30), y: height + 3, z: (-sideSize / 2 + 5) + 78 }, 0x4B3621));
  platform.add(addRectangle(4, 10, 4, { x: -((-frontSize / 2 + 5) + 47), y: height + 5, z: (-sideSize / 2 + 5) }, 0x4B3621));
  platform.add(addRectangle(4, 10, 4, { x: -((-frontSize / 2 + 5) + 33), y: height + 5, z: (-sideSize / 2 + 5) }, 0x4B3621));
  platform.add(addRectangle(4, 18, 4, { x: -((-frontSize / 2 + 5) + 40), y: height + 9, z: (-sideSize / 2 + 9) + 88 }, 0x4B3621));
  platform.add(addRectangle(4, 22, 4, { x: -(-frontSize / 2 + 5), y: height + 11, z: (-sideSize / 2 + 9) + 88 }, 0x4B3621));
  platform.add(addRectangle(4, 14, 4, { x: -(-frontSize / 2 + 5), y: height + 7, z: (-sideSize / 2 + 9) + 70 }, 0x4B3621));

}

// Função para definir o quanto um material se repete:
export function createRepeatingMaterial(repeatX, repeatY, maps, displacement, displacementBias) {
  const setupTexture = (map) => {
    if (!map) return null;
    const texture = map.clone();
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeatX, repeatY);
    return texture;
  };

  return new THREE.MeshLambertMaterial({
    map: setupTexture(maps.colorMap),
    aoMap: setupTexture(maps.aoMap),
    displacementMap: setupTexture(maps.displacementMap),
    displacementScale: displacement || 0.3,
    displacementBias: displacementBias || -0.15,
    normalMap: setupTexture(maps.normalMap),
    alphaMap: setupTexture(maps.alphaMap),
    specularMap: setupTexture(maps.specularMap),
    reflectivity: 0.5
  });
}

// Função para definir o quanto um material se repete:
function createRepeatingMetalMaterial(repeatX, repeatY, maps) {

  const setupTexture = (map) => {
    if (!map) return null;
    const texture = map.clone();
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeatX, repeatY);
    return texture;
  };

  return new THREE.MeshStandardMaterial({
    map: setupTexture(maps.colorMap),
    aoMap: setupTexture(maps.aoMap),
    displacementMap: setupTexture(maps.displacementMap),
    displacementScale: 0.8,
    displacementBias: -0.15,
    normalMap: setupTexture(maps.normalMap),
    metalnessMap: setupTexture(maps.metalnessMap),
    roughnessMap: setupTexture(maps.roughnessMap),
    metalness: 0.7,
    roughness: 0.05
  });
}
