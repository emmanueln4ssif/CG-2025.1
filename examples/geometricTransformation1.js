import * as THREE from 'three';
import { OrbitControls } from '../build/jsm/controls/OrbitControls.js';
import KeyboardState from '../libs/util/KeyboardState.js';
import {
   initRenderer,
   initCamera,
   initDefaultBasicLight,
   setDefaultMaterial,
   InfoBox,
   SecondaryBox,
   onWindowResize,
   createGroundPlaneXZ
} from "../libs/util/util.js";

let scene, renderer, camera, material, light, orbit;; // Initial variables
scene = new THREE.Scene();    // Create main scene
renderer = initRenderer();    // Init a basic renderer
camera = initCamera(new THREE.Vector3(0, 15, 30)); // Init camera in this position
material = setDefaultMaterial(); // create a basic material
light = initDefaultBasicLight(scene); // Create a basic light to illuminate the scene
orbit = new OrbitControls(camera, renderer.domElement); // Enable mouse rotation, pan, zoom etc.

// Listen window size changes
window.addEventListener('resize', function () { onWindowResize(camera, renderer) }, false);

// Use to scale the cube
var scale = 1.0;

// Posiciona a câmera (exemplo: um pouco acima e atrás do centro do plano)
camera.position.set(0, 800, 0);

// Faz a câmera olhar para o centro do plano no eixo Z = 0
camera.lookAt(0, 0, 0);


// Show text information onscreen
showInformation();

// To use the keyboard
var keyboard = new KeyboardState();

// Show axes (parameter is size of each axis)
var axesHelper = new THREE.AxesHelper(1200);
scene.add(axesHelper);

// create a plane
let plane = createGroundPlaneXZ(500, 500);
scene.add(plane);

// create a cube
var cubeGeometry = new THREE.BoxGeometry(4, 4, 4);
var cube = new THREE.Mesh(cubeGeometry, material);
// position the cube

// add the cube to the scene
//scene.add(cube);

var cubeAxesHelper = new THREE.AxesHelper(9);
cube.add(cubeAxesHelper);

var positionMessage = new SecondaryBox("");
positionMessage.changeStyle("rgba(0,0,0,0)", "lightgray", "16px", "ubuntu")

const area1 = buildPlatform(scene, 100, 120, 8, { x: 160, y: 0, z: 150 }, 15, 8, 1, 0x7FFFD4);
const area2 = buildPlatform(scene, 100, 120, 10, { x: 10, y: 0, z: 150 }, 15, 8, 1, 0x0FF7F7F);
const area3 = buildPlatform(scene, 100, 120, 8, { x: -150, y: 0, z: 150 }, 15, 8, 1, 0xadd8e6);
const area4 = buildPlatform(scene, 100, 320, 8, { x: 10, y: 0, z: -150 }, 15, 8, 1, 0x006400);

//Rotação da area 4 para escada se adequar a plataforma (rever isso!)
const box = new THREE.Box3().setFromObject(area4);
const center = box.getCenter(new THREE.Vector3());
area4.rotateY(-Math.PI);
area4.position.set(10, center.y, -300);

//Adicionando as paredes (depois precisa aperfeiçoar isso)
const wall_height = 30;
const wall_thickness = 5;
const wallColor = 0x8B4513;
addWallsAroundPlane(scene, 500, wall_height, wall_thickness, wallColor);

render();

function keyboardUpdate() {
   keyboard.update();
   if (keyboard.pressed("left")) camera.position.x += 1;
   if (keyboard.pressed("right")) camera.position.x -= 1;
   if (keyboard.pressed("up")) camera.position.z += 1;
   if (keyboard.pressed("down")) camera.position.z -= 1;
   if (keyboard.pressed("pagedown")) camera.position.y -= 1;
   if (keyboard.pressed("pageup")) camera.position.y += 1;
   if (keyboard.pressed("pagedown")) cube.translateZ(-1);

   let angle = THREE.MathUtils.degToRad(10);
   if (keyboard.pressed("A")) cube.rotateY(angle);
   if (keyboard.pressed("D")) cube.rotateY(-angle);

   if (keyboard.pressed("W")) {
      scale += .1;
      cube.scale.set(scale, scale, scale);
   }
   if (keyboard.pressed("S")) {
      scale -= .1;
      cube.scale.set(scale, scale, scale);
   }
   updatePositionMessage();
}

function updatePositionMessage() {
   var str = "POS {" + cube.position.x.toFixed(1) + ", " + cube.position.y.toFixed(1) + ", " + cube.position.z.toFixed(1) + "} " +
      "| SCL {" + cube.scale.x.toFixed(1) + ", " + cube.scale.y.toFixed(1) + ", " + cube.scale.z.toFixed(1) + "} " +
      "| ROT {" + cube.rotation.x.toFixed(1) + ", " + cube.rotation.y.toFixed(1) + ", " + cube.rotation.z.toFixed(1) + "}";
   positionMessage.changeMessage(str);
}


function showInformation() {
   // Use this to show information onscreen
   var controls = new InfoBox();
   controls.add("Geometric Transformation");
   controls.addParagraph();
   controls.add("Use keyboard arrows to move the cube in XY.");
   controls.add("Press Page Up or Page down to move the cube over the Z axis");
   controls.add("Press 'A' and 'D' to rotate.");
   controls.add("Press 'W' and 'S' to change scale");
   controls.show();
}

function render() {
   keyboardUpdate();
   requestAnimationFrame(render); // Show events
   renderer.render(scene, camera) // Render scene
}

///////////////////////////////////////////////////////////////////////////////
//degrau n acompanha altura da plataforma: ok
//interseção entre primeiro degrau e plataforma
//mudança de lado da escada
//mudança de orientação da plataforma


function buildPlatform(scene, side_size, front_size, height, position, step_size, number_of_steps, step_depth, color) {
   const stair_depth = number_of_steps * step_depth;
   const step_height = height / number_of_steps;
   const depth = height;
   const platform = new THREE.Group();
   const escadaGroup = new THREE.Group();

   for (let i = 0; i < number_of_steps; i++) {

      const degrau = new THREE.Mesh(
         new THREE.BoxGeometry(step_size, step_height, step_depth),
         setDefaultMaterial('white')
      );

      degrau.position.set(0, (i + 0.5) * step_height, (i + 0.5) * step_depth);
      escadaGroup.add(degrau);
   }

   escadaGroup.position.set(position.x, 0, position.z - (side_size / 2) + (step_depth / 2));
   //console.log(escadaGroup.position);

   const boundingBox = new THREE.Box3().setFromObject(escadaGroup);
   const size = boundingBox.getSize(new THREE.Vector3());
   const center = boundingBox.getCenter(new THREE.Vector3());

   const frontal1 = new THREE.Mesh(
      new THREE.BoxGeometry((front_size - step_size) / 2, height, depth),
      setDefaultMaterial(color)
   );

   const boundingBox1 = new THREE.Box3().setFromObject(frontal1);
   const size1 = boundingBox1.getSize(new THREE.Vector3());

   frontal1.position.set(center.x - size1.x / 2 - step_size / 2, height / 2, center.z);

   const frontal2 = new THREE.Mesh(
      new THREE.BoxGeometry((front_size - step_size) / 2, height, depth),
      setDefaultMaterial(color)
   );

   const boundingBox2 = new THREE.Box3().setFromObject(frontal2);
   const size2 = boundingBox2.getSize(new THREE.Vector3());
   frontal2.position.set(center.x + size2.x / 2 + step_size / 2, height / 2, center.z);

   const traseira = new THREE.Mesh(
      new THREE.BoxGeometry(front_size, height, side_size - stair_depth),
      setDefaultMaterial(color)
   );

   traseira.position.set(center.x, height / 2, center.z + (side_size / 2) - (step_depth / 2));

   platform.add(escadaGroup, frontal1, frontal2, traseira);
   scene.add(platform);

   return platform;

}

function createWall(width, height, depth, color) {

   const geometry = new THREE.BoxGeometry(width, height, depth);
   const material = setDefaultMaterial(color);
   const wall = new THREE.Mesh(geometry, material);

   return wall;
}

function addWallsAroundPlane(scene, plane_size, wall_height, wall_thickness, color) {

   const half = plane_size/2;

   const wall_front = createWall(plane_size, wall_height, wall_thickness, color);
   wall_front.position.set(0, wall_height/2, half + wall_thickness/2);

   const wall_back = createWall(plane_size, wall_height, wall_thickness, color);
   wall_back.position.set(0, wall_height/2, -half - wall_thickness/2);

   const wall_left = createWall(wall_thickness, wall_height, plane_size, color);
   wall_left.position.set(-half - wall_thickness/2, wall_height/2, 0);

   const wall_right = createWall(wall_thickness, wall_height, plane_size, color);
   wall_right.position.set(half + wall_thickness/2, wall_height/2, 0);

   scene.add(wall_front, wall_back, wall_left, wall_right);  

}

