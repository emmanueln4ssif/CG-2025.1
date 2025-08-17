import * as THREE from 'three';
import { SpriteMixer } from "../../libs/sprites/SpriteMixer.js";
import { manager } from './loadingManager.js';

const bullets = [];
let isShooting = false;
let lastShotTime = 0;
let fireRate = 500;
const bulletSpeed = 30;
const maxDistance = 100;

let crosshairElement;
let shootAction;
let weapons = {};
let currentWeapon = 'launcher';

const hud = new THREE.Group();
hud.renderOrder = 999;
hud.frustumCulled = false;

const soundLoader = new THREE.AudioLoader();
let chaingunSound, launcherSound;

// Sprites
let chaingunSprite, launcherSprite;
let launcherShootAction;

function setupLauncher(camera, spriteMixer) {
   const loader = new THREE.TextureLoader();
   loader.load('assets/rocketlauncher.png', (texture) => {
      texture.minFilter = THREE.NearestFilter; 
      texture.magFilter = THREE.NearestFilter;

      launcherSprite = spriteMixer.ActionSprite(texture, 3, 1);
      launcherSprite.scale.set(1.8, 1.2, 1);
      launcherSprite.position.set(0, -0.9, -3.5);
      launcherSprite.renderOrder = 999;
      launcherSprite.material.depthTest = false;

      launcherShootAction = spriteMixer.Action(launcherSprite, 250, 1, 1, 1, 2);
      launcherSprite.setFrame(0,0);

      const hud = new THREE.Object3D();
      camera.add(hud);
      hud.add(launcherSprite);

      launcherSprite.visible = false;
      weapons.launcher = launcherSprite;
   });
}

function updateFireRate() {
   if (currentWeapon === 'chaingun') {
      fireRate = 100;
   } else if (currentWeapon === 'launcher') {
      fireRate = 500;
   }
}

function setupChaingun(camera, spriteMixer) {
   const loader = new THREE.TextureLoader(manager);
   loader.load('assets/chaingun.png', (texture) => {
      texture.minFilter = THREE.NearestFilter;
      texture.magFilter = THREE.NearestFilter;

      chaingunSprite = spriteMixer.ActionSprite(texture, 3, 1);
      chaingunSprite.scale.set(1.5, 0.9, 1);
      chaingunSprite.position.set(0, -1.3, -3.5);
      chaingunSprite.renderOrder = 999;
      chaingunSprite.material.depthTest = false;

      shootAction = spriteMixer.Action(chaingunSprite, 100, 0, 1, 0, 2);
      chaingunSprite.setFrame(0, 0);

      camera.add(hud);
      hud.add(chaingunSprite);

      chaingunSprite.visible = false;
      weapons.chaingun = chaingunSprite;
   });
}

function switchWeapon(to) {
   if (chaingunSprite) {
      chaingunSprite.visible = false;
      if (shootAction) shootAction.stop();
      chaingunSprite.setFrame(0, 0);
   }

   if (launcherSprite) {
      launcherSprite.visible = false;
      if (launcherShootAction) launcherShootAction.stop();
      launcherSprite.setFrame(0, 0);
   }

   currentWeapon = to;
   updateFireRate();

   if (to === 'launcher' && launcherSprite) {
      launcherSprite.visible = true;
      launcherSprite.setFrame(0, 0);
   } else if (to === 'chaingun' && chaingunSprite) {
      chaingunSprite.visible = true;
      chaingunSprite.setFrame(0, 0);
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

function performRaycastDamage(camera, collisionObjects, damage) {
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
            enemyInstance.takeDamage(damage);
            console.log(`Acertou ${hitObject.name}, HP restante: ${enemyInstance.hp}`);
        } else {
            console.log("Acertou objeto sem enemyInstance");
        }
    }
}

function shoot(scene, camera, collisionEnemies) {
   if (currentWeapon === 'chaingun') {

      if (chaingunSound && chaingunSound.isPlaying) chaingunSound.stop();
      if (chaingunSound) chaingunSound.play();

      if (launcherSound && launcherSound.isPlaying) launcherSound.stop();
      if (launcherSound) launcherSound.play();

      shootAction.playOnce();
      performRaycastDamage(camera, collisionEnemies, 2);
      return;
   }

   if (currentWeapon === 'launcher') {
      // animação de disparo dos frames
      launcherShootAction.playOnce();
      performRaycastDamage(camera, collisionEnemies, 10);

      // --- Rebote da arma ---
      const originalY = launcherSprite.position.y;
      launcherSprite.position.y -= 0.2; // recuo rápido
      setTimeout(() => {
         launcherSprite.position.y = originalY;
         launcherSprite.setFrame(0, 0); // volta pro frame inicial
      }, 200);

      // --- Criação do projétil ---
      const bulletGeometry = new THREE.SphereGeometry(0.5, 8, 8);
      const bulletMaterial = new THREE.MeshLambertMaterial({ color: 'white' });
      const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);

      bullet.castShadow = true;
      bullet.receiveShadow = true;
      bullet.userData.type = 'bullet';
      bullet.userData.damage = 10;

      const gunWorldPosition = new THREE.Vector3();
      camera.getWorldPosition(gunWorldPosition);

      bullet.position.copy(gunWorldPosition);
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
        chaingunSprite.setFrame(0,0); 
    }
    if (currentWeapon === 'launcher' && launcherShootAction) {
        launcherShootAction.stop(); 
        launcherSprite.setFrame(0,0); 
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

async function setupWeaponSounds(camera) {
   const listener = new THREE.AudioListener();
   camera.add(listener);

   chaingunSound = new THREE.Audio(listener);
   launcherSound = new THREE.Audio(listener);

   const loadBufferWithFallback = async (paths, audio) => {
      for (const path of paths) {
         try {
            const response = await fetch(path);
            if (response.ok) {
               soundLoader.load(path, (buffer) => {
                  audio.setBuffer(buffer);
                  audio.setLoop(false);
                  audio.setVolume(0.5);
               });
               return;
            }
         } catch (e) {
         }
      }
      console.error("Nenhum caminho válido encontrado para o áudio:", paths);
   };

   await loadBufferWithFallback([
      './0_assetsT3/sounds/chaingunFiring.wav',
      '../0_assetsT3/sounds/chaingunFiring.wav'
   ], chaingunSound);

   await loadBufferWithFallback([
      './0_assetsT3/sounds/rocketFiring.wav',
      '../0_assetsT3/sounds/rocketFiring.wav'
   ], launcherSound);
}


export {
   setupLauncher,
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
