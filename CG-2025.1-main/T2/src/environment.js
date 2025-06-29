// environment.js
import * as THREE from 'three';
import { setDefaultMaterial, createGroundPlaneXZ } from '../../libs/util/util.js';

export function setupEnvironment(scene, collisionObjects, light) {
    // Plano do chão
    let plane = createGroundPlaneXZ(500, 500);
    plane.userData.isPlatform = true;
    plane.material.color.set(0xFFF1C1);
    scene.add(light);
    scene.add(plane);
    collisionObjects.push(plane);

    // Adiciona plataformas
    const area1 = buildPlatform(scene, 100, 120, 6, { x: 160, y: 0, z: 150 }, 15, 8, 0.8, 0x7FFFD4);
    addPlatformToScene(scene, area1, collisionObjects);

    const area2 = buildPlatform(scene, 100, 120, 6, { x: 10, y: 0, z: 150 }, 15, 8, 0.8, 0xE1A4A0);
    addPlatformToScene(scene, area2, collisionObjects);

    const area3 = buildPlatform(scene, 100, 120, 6, { x: -150, y: 0, z: 150 }, 15, 8, 0.8, 0xC3D3F1);
    addPlatformToScene(scene, area3, collisionObjects);

    const area4 = buildPlatform(scene, 100, 320, 6, { x: 10, y: 0, z: -150 }, 25, 8, 0.8, 0xB9D7A9);
    area4.rotateY(-Math.PI);
    area4.position.set(10, 0, -300);
    addPlatformToScene(scene, area4, collisionObjects);

    // Paredes
    addWallsAroundPlane(scene, collisionObjects, 495, 15, 5, 0x8B4513);
}

function addPlatformToScene(scene, platform, collisionObjects) {
    scene.add(platform);
    platform.traverse(child => {
        if (child.isMesh) collisionObjects.push(child);
    });
}

function addWallsAroundPlane(scene, collisionObjects, plane_size, wall_height, wall_thickness, color) {
    const half = plane_size / 2;
    const walls = [
        { size: [plane_size + 10, wall_height, wall_thickness], pos: [0, wall_height / 2, half + wall_thickness / 2] },
        { size: [plane_size + 10, wall_height, wall_thickness], pos: [0, wall_height / 2, -half - wall_thickness / 2] },
        { size: [wall_thickness, wall_height, plane_size], pos: [-half - wall_thickness / 2, wall_height / 2, 0] },
        { size: [wall_thickness, wall_height, plane_size], pos: [half + wall_thickness / 2, wall_height / 2, 0] }
    ];

    walls.forEach(wall => {
        const wallMesh = new THREE.Mesh(
            new THREE.BoxGeometry(...wall.size),
            setDefaultMaterial(color)
        );
        wallMesh.position.set(...wall.pos);
        scene.add(wallMesh);
        collisionObjects.push(wallMesh);
    });
}

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
    const boundingBox = new THREE.Box3().setFromObject(escadaGroup);
    const center = boundingBox.getCenter(new THREE.Vector3());

    const rampLength = Math.sqrt(stair_depth * stair_depth + height * height);
    const rampAngle = Math.atan(height / stair_depth);

    const ramp = new THREE.Mesh(
        new THREE.BoxGeometry(step_size, 0.1, rampLength),
        new THREE.MeshBasicMaterial({ visible: true, transparent: false, opacity: 0.0 })
    );
    ramp.rotation.x = -rampAngle;
    ramp.position.set(center.x, height / 2, center.z - stair_depth / 2 + rampLength / 2.5 * Math.cos(rampAngle) - 0.5);
    ramp.userData = {
        isRamp: true,
        rampLength,
        rampHeight: height,
        rampAngle,
        rampDirection: new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(1, 0, 0), rampAngle)
    };
    ramp.visible = false;

    const frontal1 = new THREE.Mesh(
        new THREE.BoxGeometry((front_size - step_size) / 2, height, depth),
        setDefaultMaterial(color)
    );
    frontal1.position.set(center.x - (front_size - step_size) / 4 - step_size / 2, height / 2, center.z);

    const frontal2 = new THREE.Mesh(
        new THREE.BoxGeometry((front_size - step_size) / 2, height, depth),
        setDefaultMaterial(color)
    );
    frontal2.position.set(center.x + (front_size - step_size) / 4 + step_size / 2, height / 2, center.z);

    const traseira = new THREE.Mesh(
        new THREE.BoxGeometry(front_size, height, side_size - stair_depth),
        setDefaultMaterial(color)
    );
    traseira.position.set(center.x, height / 2, center.z + (side_size / 2) - (step_depth / 2));

    platform.add(escadaGroup, frontal1, frontal2, traseira, ramp);
    return platform;
}
