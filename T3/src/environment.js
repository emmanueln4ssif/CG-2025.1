// environment.js
import * as THREE from 'three';
import { createGroundPlaneXZ } from '../../libs/util/util.js';
import { buildKey, createPlatformWithKey, updateObject, key, addRectangleWithKey } from './key.js';
import { controls } from './player.js';
import { Group } from '../../build/three.module.js';
import { addGreekColumnsToPlatform, createGreekFrontColumns, buildPlatformArea1, pillarTextures } from './area1.js';
import { buildPlatformWithElevator, createRepeatingMaterial } from './area2.js';
import { buildArea4, updateWall } from './area4.js';


export let elevatorBase, yellowKey, rectangleWithYellowKey, area2;

const textureLoader = new THREE.TextureLoader();
const wallTextures = {
  colorMap: textureLoader.load('assets/textures/floor/plane/Tiles091_1K-PNG_Color.png'),
  aoMap: textureLoader.load('assets/textures/floor/plane/Tiles091_1K-PNG_AmbientOcclusion.png'),
  normalMap: textureLoader.load('assets/textures/floor/plane/Tiles091_1K-PNG_NormalGL.png'),
  displacementMap: textureLoader.load('assets/textures/floor/plane/Tiles091_1K-PNG_Displacement.png'),
};

const bricksTexture = {
  colorMap: textureLoader.load('assets/textures/floor/grayBricks/PavingStones081_1K-PNG_Color.png'),
  aoMap: textureLoader.load('assets/textures/floor/grayBricks/PavingStones081_1K-PNG_AmbientOcclusion.png'),
  normalMap: textureLoader.load('assets/textures/floor/grayBricks/PavingStones081_1K-PNG_NormalGL.png'),
  displacementMap: textureLoader.load('assets/textures/floor/grayBricks/PavingStones081_1K-PNG_Displacement.png'),
};

//Cria o plano geral do jogo
function createPlane() {

  // Aplica textura definida

  const floorMaterial = createRepeatingMaterial(150, 150, bricksTexture);

  let plane = createGroundPlaneXZ(500, 500);
  plane.userData.isPlatform = true;
  plane.material = floorMaterial;
  plane.receiveShadow = true;

  return plane;
}

export function setupEnvironment(scene, collisionObjects, light) {
  
  // Gera o plano
  const plane = createPlane();
  scene.add(light);
  scene.add(plane);
  collisionObjects.push(plane);

  // Adiciona plataformas
  // Área 1: Plataforma com escada e colunas gregas
  const area1 = buildPlatformArea1(scene, 100, 120, 4, { x: 160, y: 0.1, z: 150 }, 15, 8, 0.8, 0x383838);
  addPlatformToScene(scene, area1, collisionObjects);
  addGreekColumnsToPlatform(area1, collisionObjects);
  createGreekFrontColumns(scene, { x: 160, y: 4, z: 107 }, 0.45, collisionObjects);
  createPlatformWithKey(scene, area1, 1, 0xE2725B, "Red", collisionObjects, pillarTextures); // Cria plataforma com chave vermelha

  // Area 2: Plataforma com porta e parte elevatória
  yellowKey = buildKey({ x: 0, y: 0, z: 0 }, scene, "Yellow", "0xffd700", 80, collisionObjects); // Cria a chave amarela
  yellowKey.name = "yellowKey";

  area2 = buildPlatformWithElevator(scene, 100, 120, 8, { x: 5, y: -0.1, z: 150 }, 10, 10, 0x654321, yellowKey); // Cria plataforma com elevador e plataforma chave amarela
  area2.name = "area2";
  addPlatformToScene(scene, area2, collisionObjects);

  // Área 3: Plataforma simples
  const area3 = buildPlatform(scene, 100, 120, 4, { x: -150, y: 0, z: 150 }, 15, 8, 0.8, 0xC3D3F1);
  addPlatformToScene(scene, area3, collisionObjects);

  // Área 4: Muro
  buildArea4(scene, collisionObjects); // Isso cria blueKey

  // Paredes
  addWallsAroundPlane(scene, collisionObjects, 495, 15, 5, 0x8B4513);

}

//Cria plataforma básica com escada (Areas 3 e 4)
function buildPlatform(scene, side_size, front_size, height, position, step_size, number_of_steps, step_depth, color) {
  
  const stair_depth = number_of_steps * step_depth;
  const step_height = height / number_of_steps;
  const depth = step_depth * (number_of_steps);
  const platform = new THREE.Group();
  const escadaGroup = new THREE.Group();

  for (let i = 0; i < number_of_steps; i++) {
    const degrau = new THREE.Mesh(
      new THREE.BoxGeometry(step_size, step_height, step_depth),
      new THREE.MeshLambertMaterial({ color: "white" })
    );
    degrau.position.set(0, (i + 0.5) * step_height, (i + 0.5) * step_depth);
    escadaGroup.add(degrau);
  }

  escadaGroup.position.set(position.x, 0, position.z - (side_size / 2) + (step_depth / 2));
  const boundingBox = new THREE.Box3().setFromObject(escadaGroup);
  const center = boundingBox.getCenter(new THREE.Vector3());

  const rampLength = Math.sqrt(stair_depth * stair_depth + height * height);
  const rampAngle = Math.atan(height / stair_depth);

  const ramp = new THREE.Mesh(
    new THREE.BoxGeometry(step_size, 0.1, rampLength),
    new THREE.MeshBasicMaterial({ visible: true, transparent: false, opacity: 0.0 })
  );
  ramp.rotation.x = -rampAngle;
  ramp.position.set(center.x, height / 2, center.z - stair_depth / 2 + rampLength / 2.5 * Math.cos(rampAngle) - 0.5 + 0.4);
  ramp.userData = {
    isRamp: true,
    rampLength,
    rampHeight: height,
    rampAngle,
    rampDirection: new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(1, 0, 0), rampAngle)
  };
  ramp.visible = false;

  const frontal1 = new THREE.Mesh(
    new THREE.BoxGeometry((front_size - step_size) / 2, height, depth),
    new THREE.MeshLambertMaterial({ color: color })
  );
  frontal1.position.set(center.x - (front_size - step_size) / 4 - step_size / 2, height / 2, center.z);

  const frontal2 = new THREE.Mesh(
    new THREE.BoxGeometry((front_size - step_size) / 2, height, depth),
    new THREE.MeshLambertMaterial({ color: color })
  );
  frontal2.position.set(center.x + (front_size - step_size) / 4 + step_size / 2, height / 2, center.z);

  const traseira = new THREE.Mesh(
    new THREE.BoxGeometry(front_size, height, side_size - stair_depth),
    new THREE.MeshLambertMaterial({ color: color })
  );
  traseira.position.set(center.x, height / 2, center.z + (side_size / 2) - (step_depth / 2));

  platform.add(escadaGroup, frontal1, frontal2, traseira, ramp);

  platform.userData.width = front_size;
  platform.userData.depth = side_size;
  platform.userData.height = height;

  platform.userData.x = position.x;
  platform.userData.y = position.y;
  platform.userData.z = position.z;

  return platform;
}

//Adiciona a plataforma ao cenário e coleta os objetos de colisão
function addPlatformToScene(scene, platform, collisionObjects) {
  scene.add(platform);
  platform.traverse(child => {
    if (child.isMesh) {
      collisionObjects.push(child);
      child.castShadow = true; // Habilita sombras
      child.receiveShadow = true; // Habilita recebimento de sombras
    }
  });
}

// Adiciona paredes ao redor do plano
function addWallsAroundPlane(scene, collisionObjects, plane_size, wall_height, wall_thickness, color) {

  const floorMaterial = createRepeatingMaterial(50, 2, wallTextures);
  floorMaterial.displacementScale = 0.2;
  floorMaterial.displacementBias = -0.1;

  const half = plane_size / 2;
  const walls = [
    { size: [plane_size + 10, wall_height, wall_thickness], pos: [0, wall_height / 2 - 1, half + wall_thickness / 2] },
    { size: [plane_size + 10, wall_height, wall_thickness], pos: [0, wall_height / 2 - 1, -half - wall_thickness / 2] },
    { size: [wall_thickness, wall_height, plane_size], pos: [-half - wall_thickness / 2, wall_height / 2 - 1, 0] },
    { size: [wall_thickness, wall_height, plane_size], pos: [half + wall_thickness / 2, wall_height / 2 - 1, 0] }
  ];

  walls.forEach(wall => {
    const wallMesh = new THREE.Mesh(
      new THREE.BoxGeometry(...wall.size),
      floorMaterial
    );
    wallMesh.position.set(...wall.pos);
    scene.add(wallMesh);
    collisionObjects.push(wallMesh);
  });
}


