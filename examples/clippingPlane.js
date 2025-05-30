import * as THREE from 'three';
import GUI from '../libs/util/dat.gui.module.js'
import { OrbitControls } from '../build/jsm/controls/OrbitControls.js';

import {initRenderer, 
        initCamera,
        initDefaultBasicLight,
        onWindowResize,
        createGroundPlaneXZ} from "../libs/util/util.js";

let camera, scene, renderer, orbit, light, object, geometry, material;

//---------------------------------------------------------
// Renderer
renderer = initRenderer();    // Init a basic renderer
renderer.localClippingEnabled = true;
camera = initCamera(new THREE.Vector3(0, 1.5, 3)); // Init 
scene = new THREE.Scene();
light = initDefaultBasicLight(scene, true); // Create a basic 
window.addEventListener( 'resize', function(){onWindowResize(camera, renderer)}, false );
orbit = new OrbitControls( camera, renderer.domElement ); // Enable mouse rotation, pan, zoom etc.
orbit.target.set( 0, 1, 0 );
orbit.update();

// Clipping plane
let localPlane = new THREE.Plane( new THREE.Vector3( 0, - 1, 0 ), 1.0 );

//-- Material with clipping plane
material = new THREE.MeshPhongMaterial( {
   color:  "rgb(255,150,20)",
   shininess: 300,
   side: THREE.DoubleSide,

   // ***** Clipping setup (material): *****
   clippingPlanes: [ localPlane ],
   clipShadows: true,
} );

//-- Geometries -------------------------------------------------
geometry = new THREE.SphereGeometry( 0.6, 20, 20);
object = new THREE.Mesh( geometry, material );
object.castShadow = true;
object.position.set(-1.5, 0.5, 0.0)
scene.add( object );

geometry = new THREE.TorusKnotGeometry( 0.4, 0.08, 95, 20 );
let material2 = material.clone();
    material2.color.set("rgb(150,255,20)");
    material2.clippingPlanes = [ localPlane ];
object = new THREE.Mesh( geometry, material2 );
object.castShadow = true;
object.position.set(0.0, 0.6, 0.0)
scene.add( object);

geometry = new THREE.CapsuleGeometry( 0.4, 0.6, 20, 30 );
let material3 = material.clone();
    material3.color.set("rgb(116, 158, 221)");
    material3.clippingPlanes = [ localPlane ];
object = new THREE.Mesh( geometry, material3 );
object.castShadow = true;
object.position.set(1.5, 0.6, 0.0)
scene.add( object);

//-- Ground plane ---------------------------------------------
let plane = createGroundPlaneXZ(10, 10)
scene.add(plane);

//-- Build interface and render!
buildInterface();
render();

function buildInterface() {
   const gui = new GUI(),
      folderLocal = gui.addFolder( 'Local Clipping' ),
      propsLocal = {
         get 'Enabled'() {
            return renderer.localClippingEnabled;
         },
         set 'Enabled'( v ) {
            renderer.localClippingEnabled = v;
         },
         get 'Plane'() {
            return localPlane.constant;
         },
         set 'Plane'( v ) {
            localPlane.constant = v;
         }
      };
   folderLocal.open();
   folderLocal.add( propsLocal, 'Enabled' );
   folderLocal.add( propsLocal, 'Plane', 0.0, 1.5 );
}

function render() {
   requestAnimationFrame(render);
   renderer.render( scene, camera );
}