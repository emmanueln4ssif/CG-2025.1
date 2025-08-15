// area3.js
import * as THREE from 'three';
import {GLTFLoader} from '/build/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from '/build/jsm/loaders/OBJLoader.js';
import { MTLLoader } from '/build/jsm/loaders/MTLLoader.js';
import { getMaxSize } from "/libs/util/util.js";

export function buildHangarPlatform(scene, sideSize, frontSize, height, position) {
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
      hangarModel.scale.set(2, 2, 2); // Ajuste esses valores conforme necessário
      hangarModel.position.set(position.x, height, position.z);
      
      // Rotacionar se necessário (ajuste o ângulo conforme necessário)
      hangarModel.rotation.y = Math.PI / 2;

      areaGroup.add(hangarModel);
    },
    function (xhr) {
      console.log((xhr.loaded / xhr.total * 100) + '% carregado');
    },
    function (error) {
      console.error('Erro ao carregar o modelo:', error);
    }
  );

  // Carrega o avião (mantido do código original)
  loadOBJFile('../assets/objects/', 'plane', 20.0, 0, true);

  function loadOBJFile(modelPath, modelName, desiredScale, angle, visibility) {
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
