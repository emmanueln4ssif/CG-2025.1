// area3.js
import * as THREE from 'three';
import {GLTFLoader} from '/build/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from '/build/jsm/loaders/OBJLoader.js';
import { MTLLoader } from '/build/jsm/loaders/MTLLoader.js';
import { getMaxSize } from "/libs/util/util.js";

export function buildHangarPlatform(scene, sideSize, frontSize, height, position, collisionObjects, player) {
  const areaGroup = new THREE.Group();
  areaGroup.name = "Area3";

  // Piso
  const textureLoader = new THREE.TextureLoader();
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
  const loader = new GLTFLoader();
  loader.load(
    'assets/hangar/scene.gltf', 
    function (gltf) {
      const hangarModel = gltf.scene;
      
      // Configurar sombras para todos os meshes do modelo
      hangarModel.traverse(function(node) {
        if (node.isMesh) {
          node.castShadow = true;
          node.receiveShadow = true;
        }
      });

      // Ajustar escala e posição do hangar
      hangarModel.scale.set(2, 2, 2);
      hangarModel.position.set(position.x, height, position.z);
      hangarModel.rotation.y = Math.PI / 2;

      // Adicionar colisão para o hangar
      hangarModel.traverse(function(node) {
        if (node.isMesh) {
          collisionObjects.push(node);
        }
      });

      // Adiciona o hangar ao grupo da área
      areaGroup.add(hangarModel);

      // Atualiza bounding box com base no modelo carregado
      hangarBox.setFromObject(hangarModel);

      // Criar a porta do hangar
      const doorTexture = textureLoader.load('assets/door.jpg');
      const doorGeometry = new THREE.BoxGeometry(0.5, 15, 25);
      const doorMaterial = new THREE.MeshLambertMaterial({ map: doorTexture });
      const hangarDoor = new THREE.Mesh(doorGeometry, doorMaterial);
      doorTexture.wrapS = doorTexture.wrapT = THREE.RepeatWrapping;
      doorTexture.repeat.set(3, 3);

      hangarDoor.position.set(position.x - 15, height + 7.5, position.z - 18);
      hangarDoor.rotation.y = Math.PI / 2;
      
      hangarDoor.castShadow = true;
      hangarDoor.receiveShadow = true;
      hangarDoor.name = "hangarDoor";
      
      collisionObjects.push(hangarDoor);
      areaGroup.add(hangarDoor);
    },
    function (xhr) {
      console.log((xhr.loaded / xhr.total * 100) + '% carregado');
    },
    function (error) {
      console.error('Erro ao carregar o modelo:', error);
    }
  );

  const assetManager = [];
  loadOBJFile('../assets/objects/', 'plane', 20.0, 0, true, collisionObjects);

  function loadOBJFile(modelPath, modelName, desiredScale, angle, visibility, collisionObjects) {
    var mtlLoader = new MTLLoader();
    mtlLoader.setPath(modelPath);
    mtlLoader.load(modelName + '.mtl', function (materials) {
      materials.preload();

      var objLoader = new OBJLoader();
      objLoader.setMaterials(materials);
      objLoader.setPath(modelPath);
      objLoader.load(modelName + ".obj", function (obj) {
        obj.visible = visibility;
        obj.name = modelName;
        obj.traverse(function (child) {
          if (child.isMesh) child.castShadow = true;
          if (child.material) child.material.side = THREE.DoubleSide;
        });

        var obj = normalizeAndRescale(obj, desiredScale);
        var obj = fixPosition(obj);
        obj.rotateY(THREE.MathUtils.degToRad(angle));

        obj.position.set(position.x, height + 0.5, position.z);
        obj.rotation.y = Math.PI / 2;

        scene.add(obj);
        assetManager[modelName] = obj;
      });
    });
  }

  function normalizeAndRescale(obj, newScale) {
    var scale = getMaxSize(obj);
    obj.scale.set(newScale * (1.0 / scale),
      newScale * (1.0 / scale),
      newScale * (1.0 / scale));
    return obj;
  }

  function fixPosition(obj) {
    var box = new THREE.Box3().setFromObject(obj);
    if (box.min.y > 0)
      obj.translateY(-box.min.y);
    else
      obj.translateY(-1 * box.min.y);
    return obj;
  }

  return areaGroup;
}
