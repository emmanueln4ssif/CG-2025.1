import * as THREE from 'three';
import { OrbitControls } from '../../build/jsm/controls/OrbitControls.js';
import { PointerLockControls } from '../../build/jsm/controls/PointerLockControls.js';
import { Clock } from 'three';
import KeyboardState from '../../libs/util/KeyboardState.js';

import {
   initRenderer,
   initCamera,
   initDefaultBasicLight,
   setDefaultMaterial,
   onWindowResize,
   createGroundPlaneXZ
} from "../../libs/util/util.js";

import { setupEnvironment } from './environment.js';
import { setupPlayer, updatePlayer, controls } from './player.js';
import {
   setupGun,
   setupCrosshair,
   shoot,
   updateBullets,
   handleShootingState,
   canShootNow,
   markShotFired
} from './guns.js';

// --- Cena Básica ---
let scene = new THREE.Scene();
let renderer = initRenderer();
renderer.setClearColor("rgb(70, 151, 198)");
let camera = initCamera(new THREE.Vector3(0.0, 0.0, -10));
let material = setDefaultMaterial();
let light = initDefaultBasicLight(scene);
const clock = new Clock();

let collisionObjects = [];
setupEnvironment(scene, collisionObjects, light);

// Setup do personagem e câmera
setupPlayer(camera, scene, renderer);
setupGun(camera);
setupCrosshair();
handleShootingState();

// Redimensionamento da janela
window.addEventListener('resize', () => onWindowResize(camera, renderer), false);

// --- Renderização ---
function render() {
   const delta = Math.min(clock.getDelta(), 0.1);

   // Atualização do personagem
   updatePlayer(delta, collisionObjects);

   // Tiro
   const currentTime = performance.now();
   if (canShootNow(currentTime)) {
      shoot(scene, camera);
      markShotFired(currentTime);
   }

   // Atualização das balas
   updateBullets(clock, scene, collisionObjects);

   // Renderização da cena
   renderer.render(scene, camera);
   requestAnimationFrame(render);
}

// Iniciar o loop de renderização
render();
