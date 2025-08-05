// area3.js
import * as THREE from 'three';

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

  floor.position.set(position.x, height/2, position.z);
  floor.receiveShadow = true;
  areaGroup.add(floor);
  
  return areaGroup; 
}
