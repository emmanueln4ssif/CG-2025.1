import * as THREE from 'three';
import { OBJLoader } from '../../../build/jsm/loaders/OBJLoader.js';
import { MTLLoader } from '../../../build/jsm/loaders/MTLLoader.js';
import { createHealthBar, updateHealthBar } from './enemies.js';
import { takeDamage, player } from '../player.js';
import {collisionObjects} from '../main.js';

export class LostSoul {
    constructor(position, scene, collisionEnemies) {
        this.hp = 20;
        this.maxHp = 20;
        this.baseSpeed = 3;
        this.baseChargeSpeed = 20;
        this.speed = 0; 
        this.chargeSpeed = 0;
        this.state = 'idle'; 
        this.isActive = false;
        this.patrolDirection = new THREE.Vector3();
        this.patrolTimer = 0;
        this.isDying = false;
        this.readyToRemove = false;
        this.mesh = null;
        this.healthBar = null;
        this.collisionEnemies = collisionEnemies;
        this.chargeStartPosition = new THREE.Vector3();
        this.chargeDirection = new THREE.Vector3();
        this.chargeMaxDistance = 35; 
        this.aleatorio = false;

        // Cooldowns
        this.hitCooldown = 0;
        this.attackCooldown = 0; 
        
        this.activationArea = new THREE.Box3(
            new THREE.Vector3(100, -10, 100),
            new THREE.Vector3(220, 50, 200)
        );

        this.loadModel(position, scene);
        this.loadSounds();
    }

    async loadSounds() {
        const soundPaths = {
            attack: [
                './0_assetsT3/sounds/lostSoul/lost_soul_attack.wav',
                '../0_assetsT3/sounds/lostSoul/lost_soul_attack.wav'
            ],
            injured: [
                './0_assetsT3/sounds/lostSoul/injured.wav',
                '../0_assetsT3/sounds/lostSoul/injured.wav'
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


    loadModel(position, scene) {
        const mtlLoader = new MTLLoader();
        const objLoader = new OBJLoader();
        mtlLoader.load('./assets/skull/skull.mtl', (materials) => {
            materials.preload();
            objLoader.setMaterials(materials);
            objLoader.load('./assets/skull.obj', (object) => {
                this.mesh = object;
                this.mesh.scale.set(0.2, 0.2, 0.2);
                this.mesh.position.copy(position);
                this.mesh.traverse(child => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                        
                    }
                });
                scene.add(this.mesh);
                this.healthBar = createHealthBar();
                this.healthBar.position.set(0, 8, 0);
                this.mesh.add(this.healthBar);
                this.mesh.userData.enemyInstance = this;
                this.collisionEnemies.push(this.mesh);
                this.changePatrolDirection();
            });
        });
    }

    update(delta, playerObject, camera) {
        if (!this.mesh) return; // espera carregar modelo
        if (!playerObject) return; // evita undefined

        // Atualiza cooldowns
        if (this.hitCooldown > 0) this.hitCooldown -= delta;
        if (this.attackCooldown > 0) this.attackCooldown -= delta;

        this.checkActivation(playerObject.position);

        if (this.isDying) {
            this.updateDyingAnimation(delta);
            return;
        }

        if (this.healthBar && camera) {
            this.healthBar.quaternion.copy(camera.quaternion);
        }

        if (!this.isActive) return;

        // Ataque aleatório quando player está próximo (<200)
        const distanceToPlayer = this.mesh.position.distanceTo(playerObject.position);
        if (distanceToPlayer <= 200 && this.attackCooldown <= 0) {
            this.state = 'charging';
            this.chargeStartPosition.copy(this.mesh.position);
            this.chargeDirection.subVectors(playerObject.position, this.chargeStartPosition).normalize();
            this.attackCooldown = Math.random() * 10; // próximo ataque aleatório 0–15s
        }

        // Se player estiver distante (>500), aproxima-se devagar
        if (distanceToPlayer > 500) {
            const dir = new THREE.Vector3().subVectors(playerObject.position, this.mesh.position).normalize();
            this.mesh.position.add(dir.multiplyScalar(this.baseSpeed * delta));
        }

        switch (this.state) {
            case 'patrolling':
                this.updatePatrolState(delta, playerObject);
                break;
            case 'charging':
                this.updateChargeState(delta, playerObject);
                break;
        }
    }

    checkActivation(playerPosition) {
        const isPlayerInArea = this.activationArea.containsPoint(playerPosition);
        if (isPlayerInArea && !this.isActive) {
            this.isActive = true;
            this.state = 'patrolling';
            this.speed = this.baseSpeed;
            this.chargeSpeed = this.baseChargeSpeed;
        }
    }

    takeDamage(amount) {
        if (this.isDying) return;

        // Som de dano
        this.sounds.injured.currentTime = 0;
        this.sounds.injured.play();

        this.hp -= amount;
        if (this.hp < 0) this.hp = 0;
        updateHealthBar(this.healthBar, this.hp, this.maxHp);
        if (this.hp <= 0) {
            this.isDying = true;
            this.state = 'dying';
            if (this.healthBar) this.mesh.remove(this.healthBar);
        }
    }

    updatePatrolState(delta, playerObject) {
        const playerPosition = playerObject.position;

            // som do ataque
            this.sounds.attack.currentTime = 0;
            this.sounds.attack.play();

            
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

    updateChargeState(delta, playerObject) {
        this.mesh.lookAt(this.mesh.position.clone().add(this.chargeDirection));
        const moveStep = this.chargeDirection.clone().multiplyScalar(this.chargeSpeed * delta);

        // Checa colisão antes de mover
        if (this.checkCollision(moveStep)) {
            this.state = 'patrolling'; // bateu em algo, volta a patrulha
        } else {
            this.mesh.position.add(moveStep);

            // Causa dano se atingiu o player (cooldown)
            if (this.hitCooldown <= 0 && this.mesh.position.distanceTo(playerObject.position) < 2.5) {
                takeDamage(5);
                this.hitCooldown = 1.0;
            }

            // Se percorreu a distância máxima, volta para patrulha
            if (this.mesh.position.distanceTo(this.chargeStartPosition) >= this.chargeMaxDistance) {
                this.state = 'patrolling';
            }
        }
    }

    changePatrolDirection() {
        this.patrolDirection.set(Math.random()*2-1, Math.random()*0.5-0.25, Math.random()*2-1).normalize();
        this.patrolTimer = Math.random()*3 + 2;
    }
        
    checkCollision(moveStep) {
        const b = new THREE.Box3().setFromObject(this.mesh); // ✅ só a mesh
        b.translate(moveStep);

        for (const o of collisionObjects) {
            if (o === this.mesh) continue;
            const oBox = new THREE.Box3().setFromObject(o); // ✅ cada objeto individual
            if (b.intersectsBox(oBox)) return true;
        }
        return false;
    }

    isReadyToRemove() { return this.readyToRemove; }
        
    updateDyingAnimation(delta) {
        this.mesh.traverse(c => {
            if (c.isMesh && c.material) {
                // Se o material ainda não for transparente, ativamos a transparência
                // e avisamos o renderizador que ele precisa ser atualizado.
                if (!c.material.transparent) {
                    c.material.transparent = true;
                    c.material.needsUpdate = true; // <-- A CORREÇÃO ESSENCIAL
                }

                // Diminui a opacidade
                c.material.opacity -= delta * 1.5;

                // Quando a animação terminar, remove o objeto da cena
                if (c.material.opacity <= 0) {
                    if (this.mesh && this.mesh.parent) {
                        this.mesh.parent.remove(this.mesh);
                    }
                    this.readyToRemove = true;
                }
            }
        });
    }

}
