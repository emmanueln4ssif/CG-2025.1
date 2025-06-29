import * as THREE from 'three';
import { setDefaultMaterial } from "../../libs/util/util.js";

const bullets = [];
let isShooting = false;
let lastShotTime = 0;
const fireRate = 500;
const bulletSpeed = 50;
const maxDistance = 100;
let gun, crosshairElement;

function setupGun(camera) {
   const gunGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.3, 32);
   const gunMaterial = setDefaultMaterial(0x555555);
   gun = new THREE.Mesh(gunGeometry, gunMaterial);
   gun.scale.set(2, 2, 2);
   gun.position.set(0, -0.4, -1);
   gun.rotation.set(Math.PI / 2, 0, 0);
   camera.add(gun);
}

function setupCrosshair() {
   crosshairElement = document.createElement('img');
   crosshairElement.src = '././assets/crosshair.png';
   crosshairElement.style.position = 'absolute';
   crosshairElement.style.width = '100px';
   crosshairElement.style.height = '100px';
   crosshairElement.style.top = '50%';
   crosshairElement.style.left = '50%';
   crosshairElement.style.transform = 'translate(-50%, -50%)';
   crosshairElement.style.pointerEvents = 'none';
   crosshairElement.style.zIndex = '1000';

   document.body.appendChild(crosshairElement);
}

function shoot(scene, camera) {
   const bulletGeometry = new THREE.SphereGeometry(0.25, 8, 8);
   const bulletMaterial = setDefaultMaterial('black');
   const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);

   const gunWorldPosition = new THREE.Vector3();
   gun.getWorldPosition(gunWorldPosition);

   const barrelOffset = new THREE.Vector3(0, 0, 2);
   barrelOffset.applyQuaternion(gun.quaternion);
   bullet.position.copy(gunWorldPosition).add(barrelOffset);

   const direction = new THREE.Vector3();
   camera.getWorldDirection(direction);

   bullets.push({
      mesh: bullet,
      direction: direction.clone().normalize(),
      startPosition: bullet.position.clone()
   });

   scene.add(bullet);
}

function checkBulletCollision(position, collisionObjects) {
   const bulletRadius = 0.05;
   for (const object of collisionObjects) {
      if (!object) continue;
      const box = new THREE.Box3();
      try {
         box.setFromObject(object);
      } catch {
         continue;
      }

      const closest = new THREE.Vector3();
      box.clampPoint(position, closest);
      const distance = position.distanceTo(closest);
      if (distance < bulletRadius) return true;
   }
   return false;
}

function updateBullets(clock, scene, collisionObjects) {
   const toRemove = [];
   bullets.forEach((bulletData, index) => {
      const { mesh, direction, startPosition } = bulletData;
      mesh.position.add(direction.clone().multiplyScalar(bulletSpeed * clock.getDelta() * 200));

      const traveled = mesh.position.distanceTo(startPosition);
      if (traveled > maxDistance || checkBulletCollision(mesh.position, collisionObjects)) {
         toRemove.push(index);
      }
   });

   toRemove.reverse().forEach(i => {
      scene.remove(bullets[i].mesh);
      bullets.splice(i, 1);
   });
}

function handleShootingState() {
   window.addEventListener('mousedown', () => isShooting = true);
   window.addEventListener('mouseup', () => isShooting = false);
}

function canShootNow(currentTime) {
   return isShooting && (currentTime - lastShotTime >= fireRate);
}

function markShotFired(currentTime) {
   lastShotTime = currentTime;
}

export {
   setupGun,
   setupCrosshair,
   shoot,
   updateBullets,
   handleShootingState,
   canShootNow,
   markShotFired
};
