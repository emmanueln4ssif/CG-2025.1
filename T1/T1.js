import * as THREE from  'three';
import { OrbitControls } from '../build/jsm/controls/OrbitControls.js';
import { PointerLockControls } from '../build/jsm/controls/PointerLockControls.js';
import { Clock } from 'three';
import {initRenderer, 
        initCamera,
        initDefaultBasicLight,
        setDefaultMaterial,
        InfoBox,
        onWindowResize,
        createGroundPlaneXZ} from "../libs/util/util.js";

let scene, renderer, camera, material, light, orbit; // Initial variables
scene = new THREE.Scene();    // Create main scene
renderer = initRenderer();    // Init a basic renderer
camera = initCamera(new THREE.Vector3(0, 15, 30)); // Init camera in this position
material = setDefaultMaterial(); // create a basic material
light = initDefaultBasicLight(scene); // Create a basic light to illuminate the scene
orbit = new OrbitControls( camera, renderer.domElement ); // Enable mouse rotation, pan, zoom etc.
const clock = new Clock(); // Create a clock to manage time

// Listen window size changes
window.addEventListener( 'resize', function(){onWindowResize(camera, renderer)}, false );

// ** Creating the plane ** 
let plane = createGroundPlaneXZ(500, 500)
scene.add(plane);

const area1 = buildPlatform(100, 120, 8, {x: 160, y: 0 , z: 150}, 8, 1, 1);
const area2 = buildPlatform(100, 120, 8, {x: -160, y: 0 , z: 150}, 8, 1, 1);
const area3 = buildPlatform(100, 120, 8, {x: 0, y: 0 , z: 150}, 8, 1, 1);
const area4 = buildPlatform(120, 30, 8, {x: 120, y: 0 , z: -150}, 8, 1, 1);


render();

function render()
{
  requestAnimationFrame(render);
  renderer.render(scene, camera) // Render scene
}

///////////////////////////////////////////////////////////////////////////////



// Plataforma traseira

function buildPlatform(side_size, front_size, height, position, number_of_steps, step_height, step_depth) 
{
   const stair_depth = number_of_steps * step_depth; 
   const escadaGroup = new THREE.Group();
   const step_size = 16;
   const depth = height;

   for (let i = 0; i < number_of_steps; i++) {
      
      const degrau = new THREE.Mesh(
         new THREE.BoxGeometry(step_size, step_height, step_depth),
         new THREE.MeshStandardMaterial({ color: 0xaaaaaa })
      );

      degrau.position.set(0, (i + 0.5) * step_height, (i + 0.5) * step_depth);
      escadaGroup.add(degrau);
   }

   escadaGroup.position.set(position.x, 0, position.z - (side_size / 2) + (step_depth / 2)); 
   console.log(escadaGroup.position);

   const boundingBox = new THREE.Box3().setFromObject(escadaGroup);
   const size = boundingBox.getSize(new THREE.Vector3());
   const center = boundingBox.getCenter(new THREE.Vector3());
   
   scene.add(escadaGroup);

   // Plataforma frontal 1
   const frontal1 = new THREE.Mesh(
      new THREE.BoxGeometry((front_size - step_size)/2, height, depth),
      material
   );

   const boundingBox1 = new THREE.Box3().setFromObject(frontal1);
   const size1 = boundingBox1.getSize(new THREE.Vector3());
    
   frontal1.position.set(center.x - size1.x/2 - step_size/2, height / 2, center.z);
   console.log(frontal1.position);
   scene.add(frontal1);
   
    // Plataforma frontal 2
    const frontal2 = new THREE.Mesh(
      new THREE.BoxGeometry((front_size - step_size)/2, height, depth),
      material
    );

   const boundingBox2 = new THREE.Box3().setFromObject(frontal2);
   const size2 = boundingBox2.getSize(new THREE.Vector3());

   frontal2.position.set(center.x + size2.x/2 + step_size/2, height / 2, center.z);
   scene.add(frontal2);

   const traseira = new THREE.Mesh(
      new THREE.BoxGeometry(front_size, height, side_size - stair_depth),
      material
   );

   traseira.position.set(center.x, height / 2, center.z + (side_size / 2) - (step_depth / 2));
   scene.add(traseira);
   
}







