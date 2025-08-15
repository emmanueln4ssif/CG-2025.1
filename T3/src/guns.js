import * as THREE from 'three';
import {SpriteMixer} from "../../libs/sprites/SpriteMixer.js"; 

const bullets = [];
let isShooting = false;
let lastShotTime = 0;
let fireRate = 500;
const bulletSpeed = 30;
const maxDistance = 100;
let gun, crosshairElement;
let chaingunSprite, shootAction;
let weapons = {};
let currentWeapon = 'launcher';

const soundLoader = new THREE.AudioLoader();
let chaingunSound, launcherSound;

function setupGun(camera) {
   const gunGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.3, 32);
   const gunMaterial =  new THREE.MeshLambertMaterial({color: 0x555555});
   gun = new THREE.Mesh(gunGeometry, gunMaterial);
   gun.castShadow = true;
   gun.receiveShadow = true;
   gun.scale.set(2, 2, 2);
   gun.position.set(0, -0.4, -1);
   gun.rotation.set(Math.PI / 2, 0, 0);
   camera.add(gun);

   weapons.launcher = gun; 
}

function updateFireRate() {
   if (currentWeapon === 'chaingun') {
      fireRate = 100;
   } else if (currentWeapon === 'launcher') {
      fireRate = 500;
   }
}

function setupChaingun(camera, spriteMixer) {
   const loader = new THREE.TextureLoader();
   loader.load('assets/chaingun.png', (texture) => {
      texture.minFilter = THREE.NearestFilter; 
      texture.magFilter = THREE.NearestFilter;
      
      chaingunSprite = spriteMixer.ActionSprite(texture, 3, 1);
      chaingunSprite.scale.set(1.5, 0.9, 1);
      chaingunSprite.position.set(0, -1.3, -3.5);
      chaingunSprite.renderOrder = 999;
      chaingunSprite.material.depthTest = false;

      shootAction = spriteMixer.Action(chaingunSprite, 1, 2, 100); 
      chaingunSprite.setFrame(0);

      const hud = new THREE.Object3D();
      camera.add(hud);
      hud.add(chaingunSprite);

      chaingunSprite.visible = false;
      weapons.chaingun = chaingunSprite;
   });
}

function switchWeapon(to) {
   if (gun) gun.visible = false;
   if (chaingunSprite) {
      chaingunSprite.visible = false;
      if (shootAction) shootAction.stop();
      chaingunSprite.setFrame(0);
   }

   currentWeapon = to;
   updateFireRate();

   if (to === 'launcher' && gun) {
      gun.visible = true;
   } else if (to === 'chaingun' && chaingunSprite) {
      chaingunSprite.visible = true;
      chaingunSprite.setFrame(0);
   }
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

function performRaycastDamage(camera, collisionObjects) {
    const raycaster = new THREE.Raycaster();
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    raycaster.set(camera.position, direction);

    const intersects = raycaster.intersectObjects(collisionObjects, true); // <-- true para pegar os filhos também
    if (intersects.length > 0) {
        let hitObject = intersects[0].object;

        // Sobe na hierarquia até achar o userData.enemyInstance
        while (hitObject && !hitObject.userData.enemyInstance && hitObject.parent) {
            hitObject = hitObject.parent;
        }

        if (hitObject && hitObject.userData.enemyInstance) {
            const enemyInstance = hitObject.userData.enemyInstance;
            enemyInstance.takeDamage(2);
            console.log(`Acertou ${hitObject.name}, HP restante: ${enemyInstance.hp}`);
        } else {
            console.log("Acertou objeto sem enemyInstance");
        }
    }
}



function shoot(scene, camera, collisionObjects) {
   if (currentWeapon === 'chaingun') {

      if (chaingunSound && chaingunSound.isPlaying) chaingunSound.stop();
      if (chaingunSound) chaingunSound.play();

      shootAction.playOnce();
      performRaycastDamage(camera, collisionObjects);
      return; // Não cria projétil visual.
   }

   if (currentWeapon === 'launcher') {
      if (launcherSound && launcherSound.isPlaying) launcherSound.stop();
      if (launcherSound) launcherSound.play();
   }

   // Apenas para o launcher:
   const bulletGeometry = new THREE.SphereGeometry(0.5, 8, 8);
   const bulletMaterial = new THREE.MeshLambertMaterial({color: 'white'});
   const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);

   bullet.castShadow = true;
   bullet.receiveShadow = true;
   bullet.userData.type = 'bullet';
   bullet.userData.damage = 10; // Dano fixo para o launcher

   const gunWorldPosition = new THREE.Vector3();
   gun.getWorldPosition(gunWorldPosition);

   const barrelOffset = new THREE.Vector3(0, 0, -0.1);
   barrelOffset.applyQuaternion(gun.quaternion);
   bullet.position.copy(gunWorldPosition).add(barrelOffset);
   bullet.scale.set(1, 1, 1); 

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
   const delta = clock.getDelta();

   for (let i = bullets.length - 1; i >= 0; i--) {
      const bulletData = bullets[i];
      bulletData.mesh.position.add(bulletData.direction.clone().multiplyScalar(bulletSpeed * delta * 200));

      const traveled = bulletData.mesh.position.distanceTo(bulletData.startPosition);
      if (traveled > maxDistance || checkBulletCollision(bulletData.mesh.position, collisionObjects)) {
         scene.remove(bulletData.mesh);
         bulletData.mesh.geometry.dispose();
         bulletData.mesh.material.dispose();
         bullets.splice(i, 1);
      }
   }
}

function handleShootingState() {
   window.addEventListener('mousedown', () => {
    isShooting = true;
});

window.addEventListener('mouseup', () => {
    isShooting = false;
    if (currentWeapon === 'chaingun' && shootAction) {
        shootAction.stop(); 
        chaingunSprite.setFrame(0); 
    }
});
}

function canShootNow(currentTime) {
   return isShooting && (currentTime - lastShotTime >= fireRate);
}

function markShotFired(currentTime) {
   lastShotTime = currentTime;
}

function setupWeaponSwitching() {
   document.addEventListener('keydown', (e) => {
      if (e.key === '1') switchWeapon('chaingun');
      if (e.key === '2') switchWeapon('launcher');
   });

   document.addEventListener('wheel', () => {
      switchWeapon(currentWeapon === 'launcher' ? 'chaingun' : 'launcher');
   });
}

function setupWeaponSounds(camera) {
   const listener = new THREE.AudioListener();
   camera.add(listener);

   chaingunSound = new THREE.Audio(listener);
   launcherSound = new THREE.Audio(listener);

   soundLoader.load('../0_assetsT3/sounds/chaingunFiring.wav', (buffer) => {
      chaingunSound.setBuffer(buffer);
      chaingunSound.setLoop(false);
      chaingunSound.setVolume(0.5);
   });

   soundLoader.load('../0_assetsT3/sounds/rocketFiring.wav', (buffer) => {
      launcherSound.setBuffer(buffer);
      launcherSound.setLoop(false);
      launcherSound.setVolume(0.5);
   });
}

export {
   setupGun,
   setupChaingun,
   setupCrosshair,
   shoot,
   updateBullets,
   handleShootingState,
   canShootNow,
   markShotFired,
   switchWeapon,
   setupWeaponSwitching,
   isShooting,
   bullets,
   updateFireRate,
   currentWeapon,
   shootAction,
   setupWeaponSounds 
};