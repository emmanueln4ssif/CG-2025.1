// area3.js
import * as THREE from 'three';
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

  // Estrutura do hangar (cilindro deitado e cortado ao meio)
  const hangarRadius = Math.min(frontSize, sideSize) / 2.5;
  const hangarLength = frontSize * 0.8;
  const hangarSegments = 32;

  // Criar geometria de cilindro cortado ao meio
  const hangarGeometry = new THREE.CylinderGeometry(
    hangarRadius, // radiusTop
    hangarRadius, // radiusBottom
    hangarLength, // height (comprimento)
    hangarSegments, // radialSegments
    1, // heightSegments
    true, // openEnded
    0, // thetaStart
    Math.PI // thetaLength (meia circunferência)
  );

  // Rotacionar para deitar o cilindro
  hangarGeometry.rotateZ(Math.PI / 2);
  hangarGeometry.rotateY(Math.PI / 2);

  // Material do hangar
  const hangarMaterial = new THREE.MeshLambertMaterial({
    color: 0x888888,
    side: THREE.DoubleSide
  });

  // Mesh do hangar
  const hangarMesh = new THREE.Mesh(hangarGeometry, hangarMaterial);
  hangarMesh.castShadow = true;

  // Posicionar o hangar sobre o piso
  hangarMesh.position.set(
    position.x,
    height,
    position.z
  );

  // ---- FACE TRASEIRA (MEIA-LUA) ---- //
  const faceShape = new THREE.Shape();
  faceShape.moveTo(-hangarRadius, 0);
  faceShape.absarc(0, 0, hangarRadius, Math.PI, 0, false);

  const faceGeometry = new THREE.ShapeGeometry(faceShape);
  const faceMaterial = new THREE.MeshLambertMaterial({ color: 0x888888, side: THREE.DoubleSide });
  const backFace = new THREE.Mesh(faceGeometry, faceMaterial);

  // Posiciona a face atrás do hangar (pegando o ponto final do cilindro)
  backFace.position.set(position.x, height, position.z + hangarLength / 2);
  backFace.castShadow = true;
  // backFace.rotation.y = Math.PI;
  backFace.rotation.x = Math.PI;
  backFace.receiveShadow = true;

  areaGroup.add(backFace);

  areaGroup.add(hangarMesh);

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
