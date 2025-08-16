import * as THREE from 'three';
import { GLTFLoader } from '../../../build/jsm/loaders/GLTFLoader.js';
import { createHealthBar, hasLineOfSight, addEnemyProjectile } from './enemies.js';

export class Cacodemon {
    constructor(position, scene, collisionObjects) {
        this.hp = 50;
        this.maxHp = 50;
        this.baseSpeed = 4;
        this.speed = 0;
        this.state = 'idle';
        this.isActive = false;

        this.patrolDirection = new THREE.Vector3();
        this.patrolTimer = 0;
        this.detectionDistance = 40;
        this.minAttackDistance = 15;
        this.maxAttackDistance = 40;

        this.isDying = false;
        this.readyToRemove = false;
        this.mesh = null;
        this.healthBar = null;
        this.collisionObjects = collisionObjects;
        this.attackCooldown = 0;
        this.scene = scene;

        this.activationArea = new THREE.Box3(
            new THREE.Vector3(-55, 0, 100),
            new THREE.Vector3(65, 50, 200)
        );
        this.loadSounds();
        this.loadModel(position);
    }

    async loadSounds() {
        const soundPaths = {
            attack: [
                './0_assetsT3/sounds/cacoDemon/cacodemonAttack.wav',
                '../0_assetsT3/sounds/cacoDemon/cacodemonAttack.wav'
            ],
            injured: [
                './0_assetsT3/sounds/cacoDemon/cacodemonInjured.wav',
                '../0_assetsT3/sounds/cacoDemon/cacodemonInjured.wav'
            ],
            death: [
                './0_assetsT3/sounds/cacoDemon/cacodemonDeath.wav',
                '../0_assetsT3/sounds/cacoDemon/cacodemonDeath.wav'
            ],
            nearby: [
                './0_assetsT3/sounds/cacoDemon/cacodemonNearby.wav',
                '../0_assetsT3/sounds/cacoDemon/cacodemonNearby.wav'
            ],
            sight: [
                './0_assetsT3/sounds/cacoDemon/cacodemonSight.wav',
                '../0_assetsT3/sounds/cacoDemon/cacodemonSight.wav'
            ]
        };

        this.sounds = {};

        const loadAudio = async (paths) => {
            for (const path of paths) {
                try {
                    const response = await fetch(path);
                    if (response.ok) {
                        const audio = new Audio(path);
                        audio.load(); // pré-carrega o som
                        return audio;
                    }
                } catch (e) {
                    // ignora e tenta o próximo caminho
                }
            }
            console.error("Nenhum caminho válido encontrado para o áudio:", paths);
            return null;
        };

        for (const key in soundPaths) {
            this.sounds[key] = await loadAudio(soundPaths[key]);
        }
    }

    loadModel(position) {
        const loader = new GLTFLoader();
        loader.load('./assets/cacodemon.glb', (gltf) => {
            this.mesh = new THREE.Group();
            this.mesh.position.copy(position);

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
            this.collisionObjects.push(this.mesh);
            this.mesh.userData.enemyInstance = this;
            this.healthBar = createHealthBar();
            this.healthBar.position.set(0, 3.5, 0);
            this.mesh.add(this.healthBar);
        });
    }

    update(delta, playerObject, camera) {
        if (!this.mesh) return;

        // Verifica ativação normal por área
        this.checkActivation(playerObject.position);

        const distanceToPlayer = this.mesh.position.distanceTo(playerObject.position);
        if (!this.isActive && distanceToPlayer <= 100) {
            this.isActive = true;
            this.state = 'attacking';
            this.speed = this.baseSpeed;
            this.changePatrolDirection(); // caso queira ele começar se mexendo
        }

        if (!this.isActive) return;
        if (this.isDying) {
            this.updateDyingAnimation(delta);
            return;
        }

        if (this.healthBar && camera) {
            this.healthBar.quaternion.copy(camera.quaternion);
        }
        if (this.attackCooldown > 0) this.attackCooldown -= delta;

        switch (this.state) {
            case 'patrolling':
                this.updatePatrolState(delta, playerObject);
                break;
            case 'attacking':
                this.updateAttackState(delta, playerObject);
                break;
        }
    }

    checkActivation(playerPosition) {
        const isPlayerInArea = this.activationArea.containsPoint(playerPosition);
        const distanceToPlayer = this.mesh.position.distanceTo(playerPosition);

        if ((isPlayerInArea || distanceToPlayer <= 100) && !this.isActive) {
            this.isActive = true;
            this.state = 'attacking';
            this.speed = this.baseSpeed;
            this.sounds.sight.play();
            this.changePatrolDirection(); // opcional
        }
    }

    takeDamage(amount) {
        if (this.isDying) return;
        this.hp -= amount;
        if (this.hp < 0) this.hp = 0;
        if (this.hp <= 0) {
            this.isDying = true;
            this.state = 'dying';
            this.sounds.death.play();
            if (this.healthBar) this.mesh.remove(this.healthBar);
        } else {
            this.sounds.injured.play();
        }
    }

    updatePatrolState(delta, playerObject) {
        const playerPosition = playerObject.position;
        if (this.mesh.position.distanceTo(playerPosition) < this.detectionDistance &&
            hasLineOfSight(this.mesh.position, playerPosition, this.collisionObjects, this.mesh)) {
            this.state = 'attacking';
            return;
        }

        this.patrolTimer -= delta;
        if (this.patrolTimer <= 0) this.changePatrolDirection();

        const moveStep = this.patrolDirection.clone().multiplyScalar(this.speed * delta);
        if (this.checkCollision(moveStep)) {
            this.changePatrolDirection();
        } else {
            this.mesh.position.add(moveStep);
            this.mesh.lookAt(this.mesh.position.clone().add(this.patrolDirection));
        }
    }

    updateAttackState(delta, playerObject) {
        const playerPosition = playerObject.position;
        const distance = this.mesh.position.distanceTo(playerPosition);
        const lineOfSight = hasLineOfSight(this.mesh.position, playerPosition, this.collisionObjects, this.mesh);

        // Olha para o jogador
        this.mesh.lookAt(playerPosition);

        // Verifica se perdeu visão do jogador
        if (!lineOfSight || distance > this.detectionDistance) {
            this.state = 'patrolling';
            return;
        }

        // Movimento inteligente (aproxima/recuar) mesmo enquanto ataca
        let moveDir = null;
        if (distance > this.maxAttackDistance) {
            moveDir = new THREE.Vector3().subVectors(playerPosition, this.mesh.position).normalize();
        } else if (distance < this.minAttackDistance) {
            moveDir = new THREE.Vector3().subVectors(this.mesh.position, playerPosition).normalize();
        } else {
            // Patrulhamento lateral enquanto ataca (como o Lost Soul)
            const sideVector = new THREE.Vector3().subVectors(playerPosition, this.mesh.position).normalize();
            sideVector.cross(new THREE.Vector3(0, 1, 0)).normalize(); // lateral perpendicular
            moveDir = sideVector;
        }

        const moveStep = moveDir.multiplyScalar(this.speed * delta);
        if (!this.checkCollision(moveStep)) {
            this.mesh.position.add(moveStep);
        } else {
            console.log("[Cacodemon] Impedido por colisão.");
        }

        // Atira se possível
        if (this.attackCooldown <= 0 && distance <= this.maxAttackDistance) {
            this.shootProjectile(playerPosition);
            this.attackCooldown = Math.random() * 2 + 1.5;
        }
    }

    shootProjectile(playerPosition) {
        this.sounds.attack.play();
        const projectile = new THREE.Mesh(
            new THREE.SphereGeometry(0.3, 8, 8),
            new THREE.MeshBasicMaterial({ color: 0xffff00 })
        );
        projectile.castShadow = true;
        projectile.userData.damage = 10;

        const startPosition = this.mesh.position.clone();
        const direction = new THREE.Vector3().subVectors(playerPosition, startPosition).normalize();
        startPosition.add(direction.clone().multiplyScalar(3));

        projectile.position.copy(startPosition);
        this.scene.add(projectile);

        addEnemyProjectile({
            mesh: projectile,
            direction: direction,
            speed: 25,
            traveled: 0,
            maxDistance: 100,
            startPosition: startPosition.clone()
        });
    }

    changePatrolDirection() {
        this.patrolDirection.set(
            Math.random() * 2 - 1,
            Math.random() * 0.5 - 0.25,
            Math.random() * 2 - 1
        ).normalize();
        this.patrolTimer = Math.random() * 3 + 2;
    }

    checkCollision(moveStep) {
        const enemyBox = new THREE.Box3().setFromObject(this.mesh);
        enemyBox.translate(moveStep);
        for (const obj of this.collisionObjects) {
            if (obj === this.mesh) continue;
            const objBox = new THREE.Box3().setFromObject(obj);
            if (enemyBox.intersectsBox(objBox)) return true;
        }
        return false;
    }

    updateDyingAnimation(delta) {
        this.mesh.traverse(c => {
            if (c.material) {
                c.material.transparent = true;
                c.material.opacity -= delta * 1.5;
                if (c.material.opacity <= 0) this.readyToRemove = true;
            }
        });
    }

    isReadyToRemove() {
        return this.readyToRemove;
    }
}
