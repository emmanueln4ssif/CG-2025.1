// area3.js
import * as THREE from 'three';

export function buildHangarPlatform() {
  const areaGroup = new THREE.Group();
  areaGroup.name = "Area3";
  
  // Piso
  const textureLoader = new THREE.TextureLoader();
  const floorTexture = textureLoader.load('assets/floor.jpg');
  floorTexture.wrapS = floorTexture.wrapT = THREE.RepeatWrapping;
  floorTexture.repeat.set(4, 4); 

  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(100, 1, 120),
    new THREE.MeshLambertMaterial({ map: floorTexture })
  );

  floor.position.set(-150, 0.5, 150);
  floor.receiveShadow = true;
  areaGroup.add(floor);
  
  return areaGroup; 
}
