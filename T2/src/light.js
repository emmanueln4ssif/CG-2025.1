import * as THREE from 'three';
import { CSG } from '../../libs/other/CSGMesh.js';
import {scene} from './main.js';


// LUZ AMBIENTE (preenche sombras escuras)
export const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);


// SOL (luz principal com sombras)
export const sunLight = new THREE.DirectionalLight(0xffffff, 2.2);
sunLight.position.set(100, 170, -100);
sunLight.castShadow = true;
//sunLight.shadow.radius = 1000; // Raio da sombra


// CONFIGURAR SOMBRAS
sunLight.shadow.mapSize.width = 4096;
sunLight.shadow.mapSize.height = 4096;
sunLight.shadow.camera.left = -300;
sunLight.shadow.camera.right = 300;
sunLight.shadow.camera.top = 300;
sunLight.shadow.camera.bottom = -300;
sunLight.shadow.camera.near = 0.5;
sunLight.shadow.camera.far = 1000;
sunLight.shadow.bias = 0.0001;

