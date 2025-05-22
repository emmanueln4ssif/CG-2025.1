import * as THREE from 'three';
import { OrbitControls } from '../build/jsm/controls/OrbitControls.js';
import { PointerLockControls } from '../build/jsm/controls/PointerLockControls.js';
import { Clock } from 'three';
import KeyboardState from '../libs/util/KeyboardState.js';
import {
  initRenderer,
  initCamera,
  initDefaultBasicLight,
  setDefaultMaterial,
  InfoBox,
  onWindowResize,
  createGroundPlaneXZ
} from "../libs/util/util.js";

let scene, renderer, camera, material, light, orbit; // Initial variables
scene = new THREE.Scene();    // Create main scene
renderer = initRenderer();    // Init a basic renderer
renderer.setClearColor("rgb(70, 151, 198)");
camera = initCamera(new THREE.Vector3(10, 0, -100)); // Init camera in this position
material = setDefaultMaterial(); // create a basic material
light = initDefaultBasicLight(scene); // Create a basic light to illuminate the scene
orbit = new OrbitControls(camera, renderer.domElement); // Enable mouse rotation, pan, zoom etc.
const clock = new Clock(); // Create a clock to manage time
var keyboard = new KeyboardState();

// Listen window size changes
window.addEventListener('resize', function () { onWindowResize(camera, renderer) }, false);

//Creating the plane  
let plane = createGroundPlaneXZ(500, 500)
plane.material.color.set(0xFFF1C1);
scene.add(light)
scene.add(plane);

//Adicionando plataformas
const area1 = buildPlatform(scene, 100, 120, 8, { x: 160, y: 0, z: 150 }, 15, 8, 1, 0x7FFFD4);
const area2 = buildPlatform(scene, 100, 120, 8, { x: 10, y: 0, z: 150 }, 15, 8, 1, 0xE1A4A0);
const area3 = buildPlatform(scene, 100, 120, 8, { x: -150, y: 0, z: 150 }, 15, 8, 1, 0xC3D3F1);
const area4 = buildPlatform(scene, 100, 320, 8, { x: 10, y: 0, z: -150 }, 25, 8, 1, 0xB9D7A9);

//Rotação da area 4 para escada se adequar a plataforma (rever isso!)
const box = new THREE.Box3().setFromObject(area4);
const center = box.getCenter(new THREE.Vector3());
area4.rotateY(-Math.PI);
area4.position.set(10, 0, -300);

//Adicionando as paredes (depois precisa aperfeiçoar isso)
const wall_height = 40;
const wall_thickness = 5;
const wallColor = 0x8B4513;
addWallsAroundPlane(scene, 500, wall_height, wall_thickness, wallColor);

render();

function render() {
  keyboardUpdate();
  requestAnimationFrame(render);
  renderer.render(scene, camera)
}

///////////////////////////////////////////////////////////////////////////////
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
  const wall = new THREE.Mesh(geometry, setDefaultMaterial(color));

  return wall;
}

function addWallsAroundPlane(scene, plane_size, wall_height, wall_thickness, color) {

  const half = plane_size / 2;

  const wall_front = createWall(plane_size + 10, wall_height, wall_thickness, color);
  wall_front.position.set(0, wall_height / 2, half + wall_thickness / 2);

  const wall_back = createWall(plane_size + 10, wall_height, wall_thickness, color);
  wall_back.position.set(0, wall_height / 2, -half - wall_thickness / 2);

  const wall_left = createWall(wall_thickness, wall_height, plane_size, color);
  wall_left.position.set(-half - wall_thickness / 2, wall_height / 2, 0);

  const wall_right = createWall(wall_thickness, wall_height, plane_size, color);
  wall_right.position.set(half + wall_thickness / 2, wall_height / 2, 0);

  scene.add(wall_front, wall_back, wall_left, wall_right);

}

//provisório 
function keyboardUpdate() {
  keyboard.update();
  if (keyboard.pressed("left")) camera.position.x += 1;
  if (keyboard.pressed("right")) camera.position.x -= 1;
  if (keyboard.pressed("up")) camera.position.z += 1;
  if (keyboard.pressed("down")) camera.position.z -= 1;
  if (keyboard.pressed("pagedown")) camera.position.y -= 1;
  if (keyboard.pressed("pageup")) camera.position.y += 1;

}







