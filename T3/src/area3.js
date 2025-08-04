// area3.js
import * as THREE from 'three';

export function buildArea3(scene, collisionObjects) {
  const areaGroup = new THREE.Group();
  areaGroup.name = "Area3";
  
  // Piso
  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(100, 1, 120),
    new THREE.MeshLambertMaterial({ color: 0x888888, map: floorTexture })
  );
  floor.position.set(-150, 0.5, 150);
  floor.receiveShadow = true;
  areaGroup.add(floor);
  collisionObjects.push(floor);

  // Hangar
  const hangarMaterial = new THREE.MeshLambertMaterial({ color: 0x4B5320 });
  const hangarWidth = 60;
  const hangarHeight = 30;
  const hangarDepth = 80;

  const curveShape = new THREE.Shape();
  curveShape.absarc(0, 0, hangarWidth / 2, Math.PI, 0, false);
  curveShape.lineTo(hangarWidth / 2, -hangarHeight / 2);
  curveShape.lineTo(-hangarWidth / 2, -hangarHeight / 2);
  curveShape.lineTo(-hangarWidth / 2, 0);

  const extrudeSettings = {
    steps: 1,
    depth: hangarDepth,
    bevelEnabled: false
  };

  const hangarGeometry = new THREE.ExtrudeGeometry(curveShape, extrudeSettings);
  const hangarMesh = new THREE.Mesh(hangarGeometry, hangarMaterial);
  hangarMesh.position.set(-150, 0, 150 - hangarDepth / 2);
  hangarMesh.castShadow = true;
  hangarMesh.receiveShadow = true;
  hangarMesh.rotation.x = Math.PI;
  hangarMesh.rotation.y = Math.PI; 

  areaGroup.add(hangarMesh);
  collisionObjects.push(hangarMesh);

  return areaGroup; 
}
