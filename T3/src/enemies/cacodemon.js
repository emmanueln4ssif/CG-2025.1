import * as THREE from 'three';
import { GLTFLoader } from '../../../build/jsm/loaders/GLTFLoader.js';
import { createHealthBar, addEnemyProjectile } from './enemies.js';
import { collisionObjects } from '../main.js';

export class Cacodemon {
    constructor(position, scene, collisionEnemies) {
        this.hp = 50;
        this.maxHp = 50;
        this.baseSpeed = 2.5;
        this.speed = 0;
        this.state = 'idle';
        this.isActive = false;
        this.isDying = false;
        this.readyToRemove = false;
        this.mesh = null;
        this.healthBar = null;
        this.collisionEnemies = collisionEnemies;
        this.attackCooldown = 0;
        this.scene = scene;
        
        this.floatSpeed = 1.5;
        this.floatHeight = 0.5;
        this.floatTime = 0;
        this.initialY = position.y;

        this.patrolDirection = new THREE.Vector3();
        this.patrolTimer = 0;
        this.targetRotation = new THREE.Quaternion();
        
        this.detectionDistance = 45;
        
        this.loadModel(position);
    }

    loadModel(position) {
        const loader = new GLTFLoader();
        loader.load('./assets/cacodemon.glb', (gltf) => {
            this.mesh = new THREE.Group();
            this.mesh.position.copy(position);
            this.initialY = position.y;

            const visualModel = gltf.scene;
            visualModel.scale.set(0.01, 0.01, 0.01);
            const box = new THREE.Box3().setFromObject(visualModel);
            const center = box.getCenter(new THREE.Vector3());
            visualModel.position.sub(center);
            this.mesh.add(visualModel);

            visualModel.traverse(child => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            this.scene.add(this.mesh);
            this.mesh.userData.enemyInstance = this;
            this.healthBar = createHealthBar();
            this.healthBar.position.set(0, 3.5, 0);
            this.collisionEnemies.push(this.mesh);
            this.mesh.add(this.healthBar);
        });
    }

    update(delta, playerObject, camera) {
        if (!this.mesh || this.isDying) {
            if (this.isDying) this.updateDyingAnimation(delta);
            return;
        }

        if (!this.isActive) {
            if (this.mesh.position.distanceTo(playerObject.position) <= 100) {
                this.isActive = true;
                this.state = 'patrolling';
                this.speed = this.baseSpeed;
                this.changePatrolDirection();
            } else {
                return;
            }
        }

        const distanceToPlayer = this.mesh.position.distanceTo(playerObject.position);

        // Decide o estado principal (Patrulha ou Ataque)
        if (distanceToPlayer > this.detectionDistance + 5 && this.state !== 'attacking') {
            this.state = 'patrolling';
        } else if (distanceToPlayer <= this.detectionDistance) {
            this.state = 'attacking';
        }

        let lookDirection = new THREE.Vector3();

        if (this.state === 'patrolling') {
            this.speed = this.baseSpeed;
            this.patrolTimer -= delta;
            if (this.patrolTimer <= 0) {
                this.changePatrolDirection();
            }
            const moveStep = this.patrolDirection.clone().multiplyScalar(this.speed * delta);
            if (this.checkCollision(moveStep)) {
                this.changePatrolDirection();
            } else {
                this.mesh.position.add(moveStep);
            }
            lookDirection.copy(this.patrolDirection);
        } else { // 'attacking'
            this.speed = this.baseSpeed * 1.8;
            const directionToPlayer = new THREE.Vector3().subVectors(playerObject.position, this.mesh.position).normalize();
            const moveStep = directionToPlayer.clone().multiplyScalar(this.speed * delta);

            if (this.checkCollision(moveStep)) {
                // COLIDIU! Volta a patrulhar para encontrar um novo caminho.
                this.state = 'patrolling';
                this.changePatrolDirection();
            } else {
                // Caminho livre, continua a perseguição.
                this.mesh.position.add(moveStep);
            }
            
            lookDirection.copy(directionToPlayer);

            if (this.attackCooldown <= 0) {
                this.shootProjectile(playerObject.position);
                this.attackCooldown = Math.random() * 1.5 + 1.0;
            }
        }
        
        lookDirection.negate();
        this.setTargetRotation(lookDirection);

        this.floatTime += delta;
        this.mesh.position.y = this.initialY + Math.sin(this.floatTime * this.floatSpeed) * this.floatHeight;

        this.mesh.quaternion.slerp(this.targetRotation, 5 * delta);
        if (this.attackCooldown > 0) this.attackCooldown -= delta;
        if (this.healthBar && camera) this.healthBar.quaternion.copy(camera.quaternion);
    }

    checkCollision(moveStep) {
        if (!this.mesh) return false;
        const futureBoundingBox = new THREE.Box3().setFromObject(this.mesh);
        futureBoundingBox.translate(moveStep);
        for (const obstacle of collisionObjects) {
            if (obstacle === this.mesh) continue;
            const obstacleBox = new THREE.Box3().setFromObject(obstacle);
            if (futureBoundingBox.intersectsBox(obstacleBox)) {
                return true;
            }
        }
        return false;
    }
    
    setTargetRotation(direction) {
        if (direction.lengthSq() === 0) return;
        const lookAtMatrix = new THREE.Matrix4();
        lookAtMatrix.lookAt(this.mesh.position, this.mesh.position.clone().add(direction), this.mesh.up);
        this.targetRotation.setFromRotationMatrix(lookAtMatrix);
    }

    changePatrolDirection() {
        this.patrolDirection.set(
            Math.random() * 2 - 1, 
            Math.random() * 0.5 - 0.25,
            Math.random() * 2 - 1
        ).normalize();
        this.patrolTimer = Math.random() * 3 + 3;
    }

    takeDamage(amount) {
        if (this.isDying) return;
        this.hp -= amount;
        if (this.hp < 0) this.hp = 0;
        if (this.hp <= 0) {
            this.isDying = true;
            this.state = 'dying';
            if (this.healthBar) this.mesh.remove(this.healthBar);
        }
    }

    shootProjectile(playerPosition) {
        const projectile = new THREE.Mesh(
            new THREE.SphereGeometry(0.4, 16, 16),
            new THREE.MeshBasicMaterial({ color: 0xff2222 })
        );
        projectile.castShadow = true;
        projectile.receiveShadow = true;
        projectile.userData.damage = 15;
        const startPosition = this.mesh.position.clone();
        const direction = new THREE.Vector3().subVectors(playerPosition, startPosition).normalize();
        startPosition.add(direction.clone().multiplyScalar(2));
        projectile.position.copy(startPosition);
        const pointLight = new THREE.PointLight(0xff0000, 1.5, 8);
        projectile.add(pointLight);
        this.scene.add(projectile);
        addEnemyProjectile({
            mesh: projectile,
            direction: direction,
            speed: 25,
            traveled: 0,
            maxDistance: 150,
            startPosition: startPosition.clone()
        });
    }

    updateDyingAnimation(delta) {
        this.mesh.traverse(c => {
            if (c.material) {
                if(!c.material.transparent) c.material.transparent = true;
                c.material.opacity -= delta * 1.5;
                if (c.material.opacity <= 0) this.readyToRemove = true;
            }
        });
    }

    isReadyToRemove() {
        return this.readyToRemove;
    }
}