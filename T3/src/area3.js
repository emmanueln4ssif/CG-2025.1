// area3.js
import * as THREE from 'three';
import { GLTFLoader } from '../../build/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from '../../build/jsm/loaders/OBJLoader.js';
import { MTLLoader } from '../../build/jsm/loaders/MTLLoader.js';
import { getMaxSize } from "../../libs/util/util.js";
import { manager } from './loadingManager.js';

export let hangarDoorIsOpen = false;
export let hangarLight;
export let hangarArea;

export function buildHangarPlatform(scene, sideSize, frontSize, height, position, collisionObjects) {
  const areaGroup = new THREE.Group();
  areaGroup.name = "Area3";

  // Piso
  const textureLoader = new THREE.TextureLoader(manager);
  const floorTexture = textureLoader.load('assets/floor.jpg');
  floorTexture.wrapS = floorTexture.wrapT = THREE.RepeatWrapping;
  floorTexture.repeat.set(frontSize / 5, sideSize / 5);

  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(frontSize, height, sideSize),
    new THREE.MeshLambertMaterial({ map: floorTexture })
  );

  floor.position.set(position.x, height / 2, position.z);
  floor.receiveShadow = true;
  areaGroup.add(floor);

  // Carregar o modelo do hangar
  const loader = new GLTFLoader(manager);
  loader.load(
    'assets/hangar/scene.gltf',
    function (gltf) {
      const hangarModel = gltf.scene;

      // Configurar sombras para todos os meshes do modelo
      hangarModel.traverse(function (node) {
        if (node.isMesh) {
          node.castShadow = true;
          node.receiveShadow = true;
        }
      });

      // Ajustar escala e posição do hangar
      hangarModel.scale.set(2, 2, 2); // Ajuste esses valores conforme necessário
      hangarModel.position.set(position.x, height, position.z);

      // Rotacionar se necessário (ajuste o ângulo conforme necessário)
      hangarModel.rotation.y = Math.PI / 2;

      // Adicionar colisão para o hangar
      hangarModel.traverse(function (node) {
        if (node.isMesh) {
          collisionObjects.push(node);
        }
      });

      // Adiciona o hangar ao grupo da área
      areaGroup.add(hangarModel);

      // Criar a porta do hangar como um objeto independente
      const doorTexture = textureLoader.load('assets/door.jpg');
      const doorGeometry = new THREE.BoxGeometry(0.5, 14, 15);
      const frontDoorGeometry = new THREE.BoxGeometry(0.5, 14, 12);
      const doorMaterial = new THREE.MeshLambertMaterial({
        map: doorTexture,
        // side: THREE.DoubleSide 
      });
      const rightHangarDoor = new THREE.Mesh(doorGeometry, doorMaterial);
      doorTexture.wrapS = doorTexture.wrapT = THREE.RepeatWrapping;
      doorTexture.repeat.set(3, 3);

      // Posiciona a porta na lateral direita do hangar
      rightHangarDoor.position.set(position.x + 18, height + 7, position.z - 18);
      rightHangarDoor.rotation.y = Math.PI / 2;
      rightHangarDoor.castShadow = true;
      rightHangarDoor.receiveShadow = true;
      rightHangarDoor.name = "hangarDoor";

      const leftHangarDoor = new THREE.Mesh(doorGeometry, doorMaterial);
      leftHangarDoor.position.set(position.x - 16, height + 7, position.z - 18);
      leftHangarDoor.rotation.y = Math.PI / 2;
      leftHangarDoor.castShadow = true;
      leftHangarDoor.receiveShadow = true;

      const rightFrontHangarDoor = new THREE.Mesh(frontDoorGeometry, doorMaterial);
      rightFrontHangarDoor.position.set(position.x - 6, height + 6, position.z - 18.5);
      rightFrontHangarDoor.rotation.y = Math.PI / 2;
      rightFrontHangarDoor.castShadow = true;
      rightFrontHangarDoor.receiveShadow = true;
      rightFrontHangarDoor.name = "rightHangarFrontDoor";

      const leftFrontHangarDoor = new THREE.Mesh(frontDoorGeometry, doorMaterial);
      leftFrontHangarDoor.position.set(position.x + 6, height + 6, position.z - 18.5);
      leftFrontHangarDoor.rotation.y = Math.PI / 2;
      leftFrontHangarDoor.castShadow = true;
      leftFrontHangarDoor.receiveShadow = true;
      leftFrontHangarDoor.name = "leftHangarFrontDoor";

      // Adiciona a porta aos objetos de colisão
      collisionObjects.push(rightHangarDoor);
      collisionObjects.push(leftHangarDoor);
      collisionObjects.push(rightFrontHangarDoor);
      collisionObjects.push(leftFrontHangarDoor);

      // Adiciona a porta diretamente ao grupo da área
      areaGroup.add(rightHangarDoor);
      areaGroup.add(leftHangarDoor);
      areaGroup.add(rightFrontHangarDoor);
      areaGroup.add(leftFrontHangarDoor);

      // Dentro do loader.load, após adicionar o hangar ao grupo
      hangarLight = new THREE.DirectionalLight(0xe0e0e0, 0.3); // luz secundária
      hangarLight.position.set(position.x, height + 5, position.z);
      hangarLight.castShadow = false;
      scene.add(hangarLight);

      // Desliga inicialmente a luz do hangar
      hangarLight.visible = false;

      // Define a área do hangar como um Box3
      hangarArea = new THREE.Box3(
        new THREE.Vector3(position.x - frontSize / 2, position.y, position.z - sideSize / 2), // mínimo
        new THREE.Vector3(position.x + frontSize / 2, position.y + height, position.z + sideSize / 2) // máximo
      );


    },
    function (xhr) {
      console.log((xhr.loaded / xhr.total * 100) + '% carregado');
    },
    function (error) {
      console.error('Erro ao carregar o modelo:', error);
    }
  );

  const assetManager = [];

  // Carrega o avião (mantido do código original), testa dois caminhos por causa do gitpages
  const path1 = './assets/objects/plane.obj';
  const path2 = '../assets/objects/plane.obj';

  fetch(path1)
    .then(response => {
      if (response.ok) {
        loadOBJFile('./assets/objects/', 'plane', 20.0, 0, true, collisionObjects);
      } else {
        loadOBJFile('../assets/objects/', 'plane', 20.0, 0, true, collisionObjects);
      }
    })
    .catch(() => {
      loadOBJFile('../assets/objects/', 'plane', 20.0, 0, true, collisionObjects);
    });


  function loadOBJFile(modelPath, modelName, desiredScale, angle, visibility, collisionObjects) {
    var mtlLoader = new MTLLoader(manager);
    mtlLoader.setPath(modelPath);
    mtlLoader.load(modelName + '.mtl', function (materials) {
      materials.preload();

      var objLoader = new OBJLoader(manager);
      objLoader.setMaterials(materials);
      objLoader.setPath(modelPath);
      objLoader.load(modelName + ".obj", function (obj) {
        obj.visible = visibility;
        obj.name = modelName;
        // Set 'castShadow' property for each children of the group
        obj.traverse(function (child) {
          if (child.isMesh) child.castShadow = true;
          if (child.material) child.material.side = THREE.DoubleSide;
        });

        var obj = normalizeAndRescale(obj, desiredScale);
        var obj = fixPosition(obj);
        obj.rotateY(THREE.MathUtils.degToRad(angle));

        obj.position.set(position.x, height + 0.5, position.z);

        // Virar o avião para frente da porta
        obj.rotation.y = Math.PI / 2;

        scene.add(obj);
        assetManager[modelName] = obj;
      });
    });
  }

  function normalizeAndRescale(obj, newScale) {
    var scale = getMaxSize(obj); // Available in 'utils.js'
    obj.scale.set(newScale * (1.0 / scale),
      newScale * (1.0 / scale),
      newScale * (1.0 / scale));
    return obj;
  }

  function fixPosition(obj) {
    // Fix position of the object over the ground plane
    var box = new THREE.Box3().setFromObject(obj);
    if (box.min.y > 0)
      obj.translateY(-box.min.y);
    else
      obj.translateY(-1 * box.min.y);
    return obj;
  }

  return areaGroup;
}

let leftDoorTargetX = null;
let rightDoorTargetX = null;
let doorSpeed = 0.01;

export function openHangarDoor(scene, controls) {

  const leftDoor = scene.getObjectByName("leftHangarFrontDoor");
  const rightDoor = scene.getObjectByName("rightHangarFrontDoor");

  //Se o bloco de ativação existir
  if (leftDoor && rightDoor && hangarDoorIsOpen === false) {

    const blockPosition = new THREE.Vector3();
    leftDoor.getWorldPosition(blockPosition);

    const distanceToDoor = controls.getObject().position.distanceTo(blockPosition);

    // Se o jogador estiver próximo, define o alvo da porta
    if (distanceToDoor < 15 && leftDoorTargetX === null && rightDoorTargetX === null) {
      doorSound.play();
      leftDoorTargetX = leftDoor.position.x + 6;
      rightDoorTargetX = rightDoor.position.x - 6;
    }

    // Se o alvo está definido, move a porta suavemente
    if (leftDoorTargetX !== null && rightDoorTargetX !== null) {
      // Calcula o novo X com Lerp
      leftDoor.position.x = THREE.MathUtils.lerp(leftDoor.position.x, leftDoorTargetX, doorSpeed);
      rightDoor.position.x = THREE.MathUtils.lerp(rightDoor.position.x, rightDoorTargetX, doorSpeed);

      // Se a porta estiver próxima o suficiente do alvo, para
      if (Math.abs(leftDoor.position.x - leftDoorTargetX) < 0.01) {
        leftDoor.position.x = leftDoorTargetX;
        leftDoorTargetX = null;
      }
      if (Math.abs(rightDoor.position.x - rightDoorTargetX) < 0.01) {
        rightDoor.position.x = rightDoorTargetX;
        rightDoorTargetX = null;
      }

      // Marca a porta como aberta quando ambos os alvos forem atingidos
      if (leftDoorTargetX === null && rightDoorTargetX === null) {
        hangarDoorIsOpen = true;
      }

    }
  }
}

export function userIsOnHangar(playerObject, hangarArea) {
  if (!hangarArea || !playerObject) return false;

  const playerPos = playerObject.position;

  // Caixa do hangar
  const baseBox = new THREE.Box3().setFromObject(hangarArea);

  // Caixa simulando os pés do jogador
  const feetBox = new THREE.Box3(
    new THREE.Vector3(playerPos.x - 0.4, playerPos.y - 2.0, playerPos.z - 0.4),
    new THREE.Vector3(playerPos.x + 0.4, playerPos.y - 2.0, playerPos.z + 0.4)
  );

  return baseBox.intersectsBox(feetBox);
}

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

//luzes hangar


