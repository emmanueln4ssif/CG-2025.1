// environment.js
import * as THREE from 'three';
import { setDefaultMaterial, createGroundPlaneXZ } from '../../libs/util/util.js';
import { CSG } from '../../libs/other/CSGMesh.js';
import { buildKey, createPlatformWithKey, raisePlatform, updateObject, key } from './key.js';
import { controls } from './player.js';

let doorIsOpening = false;
const doorOpenSpeed = 0.01;
let doorStartPosition = new THREE.Vector3();
let doorTargetPosition = new THREE.Vector3();

export let elevatorBase;
let elevatorMoving = false;
let elevatorBaseStartPosition = new THREE.Vector3();
let elevatorBaseTargetPosition = new THREE.Vector3();


export function setupEnvironment(scene, collisionObjects, light) {
  // Plano do chão
  let plane = createGroundPlaneXZ(500, 500);
  plane.userData.isPlatform = true;
  plane.material.color.set(0xFFF1A9);
  scene.add(light);
  scene.add(plane);
  collisionObjects.push(plane);

  // Adiciona plataformas
  // Área 1: Plataforma com escada e colunas gregas
  const area1 = buildPlatform(scene, 100, 120, 4, { x: 160, y: 0, z: 150 }, 15, 8, 0.8, 0x383838);
  addPlatformToScene(scene, area1, collisionObjects);
  addGreekColumnsToPlatform(area1, collisionObjects);
  createGreekFrontColumns(scene, { x: 160, y: 4, z: 107 }, 0.45, collisionObjects);
  console.log(area1.userData.x, area1.userData.y, area1.userData.z);
  createPlatformWithKey(scene, area1, 1, 0xE2725B, collisionObjects);

  // Area 2: Plataforma com porta e parte elevatória
  //const area2 = buildPlatform(scene, 100, 120, 4, { x: 5, y: 0, z: 150 }, 15, 8, 0.5, 0xE1A4A0);
  const area2 = buildPlatformWithElevator(scene, 100, 120, 8, { x: 5, y: 0, z: 150 }, 10, 10, 0x654321);
  addPlatformToScene(scene, area2, collisionObjects);

  const area3 = buildPlatform(scene, 100, 120, 4, { x: -150, y: 0, z: 150 }, 15, 8, 0.8, 0xC3D3F1);
  addPlatformToScene(scene, area3, collisionObjects);

  const area4 = buildPlatform(scene, 100, 320, 4, { x: 10, y: 0, z: -150 }, 25, 8, 0.8, 0xB9D7A9);
  area4.rotateY(-Math.PI);
  area4.position.set(10, 0, -300);
  addPlatformToScene(scene, area4, collisionObjects);

  // Paredes
  addWallsAroundPlane(scene, collisionObjects, 495, 15, 5, 0x8B4513);

}

//area 2: Plataforma com elevador
function buildPlatformWithElevator(scene, sideSize, frontSize, height, position, elevatorLength, elevatorDepth, color) {

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
  elevatorBase.position.set(0, height/2, 0);
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

  platform.add(addRectangle(8, 6, 10, {x: 40, y: position.y + height*1.5 - 1, z:42}, "gray")); // Base da plataforma
  platform.add(addRectangle(8, 7, 10, {x: -52, y:position.y + height*1.5 - 1, z:15}, "gray"));
  platform.add(addRectangle(8, 8, 10, {x: 15, y: position.y + height*1.5 - 1, z:-5}, "gray"));
  platform.add(addRectangle(8, 9, 10, {x: 26, y: position.y + height*1.5 - 1, z:-28}, "gray"));
  platform.add(addRectangle(8, 10, 10, {x: 48, y: position.y + height*1.5 - 1, z:-35}, "gray"));
  platform.add(addRectangle(8, 11, 10, {x: -45, y: position.y + height*1.5 - 1, z:-44}, "gray"));
  platform.add(addRectangle(8, 11, 10, {x: -25, y: position.y + height*1.5 -1, z:-44}, "gray"));
  platform.add(addRectangle(8, 12, 10, {x: -20, y: position.y + height*1.5 - 1, z:-15}, "gray"));
  platform.add(addRectangle(8, 13, 10, {x: -2, y: position.y + height*1.5 -1, z:35}, "gray"));
  platform.add(addRectangle(8, 14, 10, {x: -29, y: position.y + height*1.5 - 1, z:5}, "gray"));
  platform.add(addRectangle(8, 15, 10, {x: 2, y: position.y + height*1.5 - 1, z:42}, "gray"));
  platform.add(addRectangle(8, 17, 10, {x: -46, y: position.y + height*1.5 - 1, z:40}, "gray"));
  platform.add(addRectangle(8, 10, 10, {x: -46, y: position.y + height*1.5 - 1, z:0}, "gray"));
  platform.add(addRectangle(8, 10, 10, {x: 0, y: position.y + height*1.5 -1, z:0}, "gray"));

  return platform;
  
}

//Cria porta do elevador intercalando cores das ripas
function createElevatorDoor(x, y, z, doorWidth, doorHeight, doorDepth) {

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

export function openDoor(scene) {

  let doorGroup = scene.getObjectByName("elevatorDoor");
  if (doorIsOpening) return;

  doorIsOpening = true;

  let doorOpenDistance = doorGroup.parent.parent.userData.elevatorLength;

  doorStartPosition.copy(doorGroup.position);
  doorTargetPosition.set(doorGroup.position.x - doorOpenDistance, doorGroup.position.y, doorGroup.position.z - 0.25);

}

export function updateDoor(scene) {

  let doorGroup = scene.getObjectByName("elevatorDoor");
  
  if (!doorIsOpening) return;

  //Movimenta suavemente a porta na direção do alvo
  doorGroup.position.lerp(doorTargetPosition, doorOpenSpeed);

  //Para animação quando chegou perto
  if (doorGroup.position.distanceTo(doorTargetPosition) < 0.01) {
    doorGroup.position.copy(doorTargetPosition);
    doorIsOpening = false;
  }
}

export function downElevator(scene) {

  let elevatorBase = scene.getObjectByName("elevatorBase");
  if (!elevatorBase) return;

  elevatorMoving = true;

  let elevatorTargetY = 0.1; // ele vai até o chão

  elevatorBaseStartPosition.copy(elevatorBase.position);
  elevatorBaseTargetPosition.set(elevatorBase.position.x, elevatorTargetY, elevatorBase.position.z);
  //console.log("Dados do elevador:", JSON.stringify(elevatorBase));

}

export function updateElevatorBase(scene) {
  let elevatorBase = scene.getObjectByName("elevatorBase");
  if (!elevatorBase || !elevatorMoving) return;

  //Movimenta suavemente a base do elevador na direção do alvo
  elevatorBase.position.lerp(elevatorBaseTargetPosition, doorOpenSpeed);
  //console.log("Elevador:", elevatorBase.position);

  //Para animação quando chegou perto
  if (elevatorBase.position.distanceTo(elevatorBaseTargetPosition) < 0.01) {
    elevatorBase.position.copy(elevatorBaseTargetPosition);
    elevatorMoving = false;
    //console.log("Elevador parado na posição:", elevatorBase.position);
  }
}

function addRectangle(width, height, depth, position, color) {
  
  const rectangle = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    new THREE.MeshLambertMaterial({ color: color })
  );
  rectangle.position.set(position.x, position.y, position.z);
  rectangle.castShadow = true;
  rectangle.receiveShadow = true;
  
  return rectangle;

}

















function addPlatformToScene(scene, platform, collisionObjects) {
  scene.add(platform);
  platform.traverse(child => {
    if (child.isMesh) collisionObjects.push(child);
  });
}

function addWallsAroundPlane(scene, collisionObjects, plane_size, wall_height, wall_thickness, color) {
  const half = plane_size / 2;
  const walls = [
    { size: [plane_size + 10, wall_height, wall_thickness], pos: [0, wall_height / 2, half + wall_thickness / 2] },
    { size: [plane_size + 10, wall_height, wall_thickness], pos: [0, wall_height / 2, -half - wall_thickness / 2] },
    { size: [wall_thickness, wall_height, plane_size], pos: [-half - wall_thickness / 2, wall_height / 2, 0] },
    { size: [wall_thickness, wall_height, plane_size], pos: [half + wall_thickness / 2, wall_height / 2, 0] }
  ];

  walls.forEach(wall => {
    const wallMesh = new THREE.Mesh(
      new THREE.BoxGeometry(...wall.size),
      setDefaultMaterial(color)
    );
    wallMesh.position.set(...wall.pos);
    scene.add(wallMesh);
    collisionObjects.push(wallMesh);
  });
}

function buildPlatform(scene, side_size, front_size, height, position, step_size, number_of_steps, step_depth, color) {
  const stair_depth = number_of_steps * step_depth;
  const step_height = height / number_of_steps;
  const depth = step_depth * (number_of_steps);
  const platform = new THREE.Group();
  const escadaGroup = new THREE.Group();

  for (let i = 0; i < number_of_steps; i++) {
    const degrau = new THREE.Mesh(
      new THREE.BoxGeometry(step_size, step_height, step_depth),
      setDefaultMaterial('white')
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
    setDefaultMaterial(color)
  );
  frontal1.position.set(center.x - (front_size - step_size) / 4 - step_size / 2, height / 2, center.z);

  const frontal2 = new THREE.Mesh(
    new THREE.BoxGeometry((front_size - step_size) / 2, height, depth),
    setDefaultMaterial(color)
  );
  frontal2.position.set(center.x + (front_size - step_size) / 4 + step_size / 2, height / 2, center.z);

  const traseira = new THREE.Mesh(
    new THREE.BoxGeometry(front_size, height, side_size - stair_depth),
    setDefaultMaterial(color)
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

function addGreekColumnsToPlatform(platformGroup, collisionObjects) {

  //Parâmetros das colunas
  const columnHeight = 15;
  const columnRadius = 1.5;
  const columnColor = 0xcccccc;

  //Parâmetros da plataforma
  const width = platformGroup.userData.width;
  const depth = platformGroup.userData.depth;
  const height = platformGroup.userData.height;

  //Posição base da plataforma
  const baseX = platformGroup.userData.x;
  const baseY = platformGroup.userData.y;
  const baseZ = platformGroup.userData.z;

  //Cria o grupo de colunas
  const spacing = 12; // Espaçamento entre colunas
  const material = new THREE.MeshLambertMaterial({ color: columnColor });

  //Parte frontal da plataforma
  const y = baseY + height; // Altura da plataforma

  function createColumn(broken = false) {

    const column = new THREE.Group();

    //Fator de escala e ângulo para colunas quebradas
    // --> Se quebrada, aplica um fator de escala e um ângulo aleatório
    // --> Se não quebrada, fator de escala é 1 e ângulo é 0
    const brokenFactor = broken ? THREE.MathUtils.randFloat(0.3, 0.6) : 1.0;
    const brokenAngle = broken ? THREE.MathUtils.degToRad(THREE.MathUtils.randFloat(-15, 15)) : 0;

    //Cria o cilindro da coluna
    const shaftHeight = columnHeight * brokenFactor;
    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(columnRadius, columnRadius, shaftHeight, 16),
      material
    );
    shaft.castShadow = true;
    shaft.position.y = shaftHeight / 2;
    column.add(shaft);

    //Cria o capitel da coluna
    if (!broken || Math.random() > 0.5) {
      const top = new THREE.Mesh(
        new THREE.CylinderGeometry(columnRadius * 1.3, columnRadius * 1.3, 1.5, 16),
        material
      );
      top.position.y = shaftHeight + 0.75;
      column.add(top);
    }

    //Cria a base da coluna
    if (!broken || Math.random() > 0.3) {
      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(columnRadius * 1.3, columnRadius * 1.3, 1.5, 8),
        material
      );
      base.position.y = 0 - 0.75;
      column.add(base);
    }

    //Inclinar um pouco se for quebrada
    if (broken) {
      column.rotation.x = brokenAngle * Math.random();
      column.rotation.z = brokenAngle * Math.random();
    }

    return column;

  }

  const numFrontColumnsTotal = 10;
  const escadaHalfWidth = 20; // ajuste para a largura da escada

  const numColumnsEachSide = numFrontColumnsTotal / 2;

  const leftSpacing = (width / 2 - escadaHalfWidth + 10) / (numColumnsEachSide + 1);
  const rightSpacing = (width / 2 - escadaHalfWidth) / (numColumnsEachSide + 1);

  const leftStartX = baseX - width / 2;
  const rightStartX = baseX + escadaHalfWidth;

  const frontZ = baseZ - depth / 2 + 2;

  for (let i = 1; i <= numColumnsEachSide; i++) {
    // colunas à esquerda da escada
    const xLeft = leftStartX + leftSpacing * i;
    const colLeft = createColumn(Math.random() < 0.3);
    colLeft.position.set(xLeft, y, frontZ + 5);
    platformGroup.add(colLeft);

    // colunas à direita da escada
    const xRight = rightStartX + rightSpacing * i;
    const colRight = createColumn(Math.random() < 0.3);
    colRight.position.set(xRight, y, frontZ + 5);
    platformGroup.add(colRight);
  }


  //Traseira
  const backZ = baseZ + depth / 2 - 2;
  const columns = [];
  let xStart = baseX - width / 2 + spacing;
  let xEnd = xStart;

  for (let x = xStart; x < baseX + width / 2; x += spacing) {
    const col = createColumn();
    col.position.set(x, y + 1, backZ);
    platformGroup.add(col);
    columns.push(col);
    xEnd = x; // atualiza xEnd para o último valor
  }

  //Adiciona a viga horizontal conectando as colunas
  const beamLength = xEnd - xStart + 8;
  const beamHeight = 0.5;
  const beamDepth = 4;

  const beamGeometry = new THREE.BoxGeometry(beamLength, beamHeight, beamDepth);
  const beamMaterial = new THREE.MeshStandardMaterial({ color: 0xaaaaaa });
  const beam = new THREE.Mesh(beamGeometry, beamMaterial);

  //Posiciona a viga no meio entre primeira e última coluna e no topo das colunas
  beam.position.set((xStart + xEnd) / 2, y + columnHeight + 2, backZ); // ajuste Y conforme altura da coluna
  platformGroup.add(beam);

  //Adiciona a viga horizontal conectando as colunas
  const topBeamLength = xEnd - xStart + 12;
  const topBeamHeight = 0.8;
  const topBeamDepth = 4;

  const topBeamGeometry = new THREE.BoxGeometry(topBeamLength, topBeamHeight, topBeamDepth);
  const topBeamMaterial = new THREE.MeshStandardMaterial({ color: 0xaaaaaa });
  const topBeam = new THREE.Mesh(topBeamGeometry, topBeamMaterial);

  //Posiciona a viga no meio entre primeira e última coluna e no topo das colunas
  topBeam.position.set((xStart + xEnd) / 2, y + columnHeight + 3, backZ); // ajuste Y conforme altura da coluna
  platformGroup.add(topBeam);


  //Laterais
  for (let z = baseZ - depth / 2 + spacing; z < baseZ + depth / 2; z += spacing) {
    //Esquerda
    const leftX = baseX - width / 2 + 2;
    const colLeft = createColumn(Math.random() < 0.9);
    colLeft.position.set(leftX, y, z);
    platformGroup.add(colLeft);

    //Direita
    const rightX = baseX + width / 2 - 2;
    const colRight = createColumn(Math.random() < 0.3);
    colRight.position.set(rightX, y, z);
    platformGroup.add(colRight);
  }

  // Adiciona as colunas ao array de colisão
  platformGroup.traverse(child => {
    if (child.isMesh) {
      collisionObjects.push(child);
    }
  });

}

function createGreekFrontColumns(scene, position, scale, collisionObjects) {
  const group = new THREE.Group();
  const material = new THREE.MeshLambertMaterial({ color: 0xaaaaaa });
  const rubyshMaterial = new THREE.MeshLambertMaterial({ color: 0x444444 }); //cinza escuro
  const goldMaterial = new THREE.MeshLambertMaterial({ color: 0x888888 }); //cinza mais escuro

  const columnHeight = 40 * scale;
  const columnRadius = 4 * scale;
  const spacing = 30 * scale;

  //Cria uma coluna  simples
  function createColumn(xOffset) {

    const column = new THREE.Group();

    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(columnRadius, columnRadius, columnHeight, 8),
      material
    );

    shaft.position.y = columnHeight / 2;
    column.add(shaft);

    const capital = new THREE.Mesh(
      new THREE.CylinderGeometry(columnRadius * 1.5, columnRadius * 1.5, 2 * scale, 16),
      material
    );

    capital.position.y = columnHeight + 1 * scale;
    column.add(capital);

    column.position.x = xOffset;
    return column;
  }

  //Coluna esquerda e direita
  const leftCol = createColumn(-spacing);
  const rightCol = createColumn(spacing);
  group.add(leftCol);
  group.add(rightCol);

  //Viga horizontal
  const beam = new THREE.Mesh(
    new THREE.BoxGeometry(spacing * 2 + columnRadius * 2, 2 * scale, 4 * scale),
    rubyshMaterial
  );
  beam.position.y = columnHeight + 2.5 * scale;
  group.add(beam);

  //viga vertical no meio da viga horizontal
  const verticalBeam = new THREE.Mesh(
    new THREE.BoxGeometry(2 * scale, 3, 4 * scale),
    rubyshMaterial
  );
  group.add(verticalBeam);
  verticalBeam.position.set(0, columnHeight + 7 * scale, 0);

  //Frontão 
  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(spacing * scale, 5 * scale, 5),
    goldMaterial
  );

  //deixar em pé
  roof.position.y = columnHeight + 10 * scale;
  roof.rotation.x = -Math.PI / 2;
  group.add(roof);

  // Posiciona o conjunto
  group.position.set(position.x, position.y, position.z);
  scene.add(group);

  collisionObjects.push(group);

}
