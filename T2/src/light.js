import * as THREE from 'three';
import { CSG } from '../../libs/other/CSGMesh.js';
import {scene} from './main.js';

// Luz do ambiente
export const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);

//Luz principal com sombras
export const sunLight = new THREE.DirectionalLight(0xffffff, 3);
sunLight.position.set(100, 170, -100);
sunLight.castShadow = true;


//Configurações da sombra
sunLight.shadow.mapSize.width = 4096;
sunLight.shadow.mapSize.height = 4096;
sunLight.shadow.camera.left = -300;
sunLight.shadow.camera.right = 300;
sunLight.shadow.camera.top = 300;
sunLight.shadow.camera.bottom = -300;
sunLight.shadow.camera.near = 0.5;
sunLight.shadow.camera.far = 1000;
sunLight.shadow.bias = 0.0001; //corrige artefatos de sombra
sunLight.shadow.radius = 4; 

