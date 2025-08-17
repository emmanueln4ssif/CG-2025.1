import * as THREE from 'three';
import { GLTFLoader } from '../../../build/jsm/loaders/GLTFLoader.js';
import { createHealthBar } from './enemies.js'; 
import { collisionObjects, createLostSoulEnemies } from '../main.js';

export class PainElemental {
    constructor(position, scene, collisionEnemies) {
        this.hp = 80;
        this.maxHp = 80;
        this.baseSpeed = 2.0;
        this.speed = 0;
        this.state = 'idle'; // Estados: 'idle', 'patrolling', 'attacking'
        this.isActive = false;
        this.isDying = false;
        this.readyToRemove = false;
        this.mesh = null;
        this.healthBar = null;
        this.collisionEnemies = collisionEnemies;
        this.scene = scene;
        
        // --- NOVAS PROPRIEDADES PARA CONTROLE DE ATAQUE ---
        this.lostSoulsSummoned = 0; // Contador para os Lost Souls invocados
        this.maxLostSouls = 5;      // Limite máximo de Lost Souls
        this.attackCooldown = 0;    // Tempo de espera entre invocações

        // Propriedades de movimento e patrulha
        this.floatSpeed = 1.2;
        this.floatHeight = 0.6;
        this.floatTime = 0;
        this.initialY = position.y;
        this.patrolDirection = new THREE.Vector3();
        this.patrolTimer = 0;
        this.targetRotation = new THREE.Quaternion();
        this.detectionDistance = 40; // Distância para detectar o jogador e atacar
        
        this.loadModel(position);
    }

    loadModel(position) {
        const loader = new GLTFLoader();
        loader.load('../../../0_assetsT3/objects/pain/painElemental.glb', (gltf) => {
            this.mesh = new THREE.Group();
            this.mesh.position.copy(position);
            this.initialY = position.y;

            const visualModel = gltf.scene;
            visualModel.scale.set(1.5, 1.5, 1.5); 
            
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
            this.healthBar.position.set(0, 5, 0); // Ajuste a altura da barra de vida se necessário
            this.collisionEnemies.push(this.mesh);
            this.mesh.add(this.healthBar);
        }, undefined, (error) => {
            console.error('Um erro ocorreu ao carregar o Pain Elemental:', error);
        });
    }

    update(delta, playerObject, camera) {
        if (!this.mesh || this.isDying) {
            if (this.isDying) this.updateDyingAnimation(delta);
            return;
        }

        // Ativa o inimigo quando o jogador se aproxima pela primeira vez
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

        // --- LÓGICA DE ESTADO APRIMORADA (BASEADA NO CACODEMON) ---
        // Decide se deve patrulhar ou atacar com base na distância e no limite de invocações
        if (distanceToPlayer <= this.detectionDistance && this.lostSoulsSummoned < this.maxLostSouls) {
            this.state = 'attacking';
        } else {
            this.state = 'patrolling';
        }

        let lookDirection = new THREE.Vector3();

        if (this.state === 'patrolling') {
            this.speed = this.baseSpeed;
            this.patrolTimer -= delta;
            if (this.patrolTimer <= 0) {
                this.changePatrolDirection();
            }
            const moveStep = this.patrolDirection.clone().multiplyScalar(this.speed * delta);
            
            // Verifica colisão antes de mover
            if (this.checkCollision(moveStep)) {
                this.changePatrolDirection(); // Se vai colidir, muda de direção
            } else {
                this.mesh.position.add(moveStep);
            }
            lookDirection.copy(this.patrolDirection);

        } else { // 'attacking'
            this.speed = 0; // Para de se mover para invocar
            const directionToPlayer = new THREE.Vector3().subVectors(playerObject.position, this.mesh.position).normalize();
            lookDirection.copy(directionToPlayer);

            // Verifica se o cooldown do ataque acabou
            if (this.attackCooldown <= 0) {
                this.summonLostSoul();
                this.lostSoulsSummoned++; // Incrementa o contador
                this.attackCooldown = 2.5; // Define um cooldown de 2.5 segundos para a próxima invocação
            }
        }
        
        // Inverte a direção do olhar porque o modelo está virado para -Z
        lookDirection.negate();
        this.setTargetRotation(lookDirection);

        // Animação de flutuação
        this.floatTime += delta;
        this.mesh.position.y = this.initialY + Math.sin(this.floatTime * this.floatSpeed) * this.floatHeight;

        // Atualizações finais
        this.mesh.quaternion.slerp(this.targetRotation, 5 * delta);
        if (this.attackCooldown > 0) this.attackCooldown -= delta;
        if (this.healthBar && camera) this.healthBar.quaternion.copy(camera.quaternion);
    }

    // --- NOVA FUNÇÃO PARA INVOCAR UM ÚNICO LOST SOUL ---
    summonLostSoul() {
        if (!this.mesh) return;
        
        // Define uma posição inicial em frente ao Pain Elemental
        const spawnOffset = new THREE.Vector3(0, 0, -4); // Ajuste a distância conforme necessário
        spawnOffset.applyQuaternion(this.mesh.quaternion); // Rotaciona o offset para a direção do inimigo
        const spawnPosition = this.mesh.position.clone().add(spawnOffset);
        
        createLostSoulEnemies(spawnPosition);
    }

    checkCollision(moveStep) {
        if (!this.mesh) return false;
        // Cria uma "bounding box" (caixa delimitadora) para a posição futura do inimigo
        const futureBoundingBox = new THREE.Box3().setFromObject(this.mesh.children[0]); // Pega o modelo visual
        futureBoundingBox.applyMatrix4(this.mesh.matrixWorld); // Aplica a posição/rotação do grupo
        futureBoundingBox.translate(moveStep);

        for (const obstacle of collisionObjects) {
            if (obstacle === this.mesh) continue; // Não checar colisão com si mesmo
            const obstacleBox = new THREE.Box3().setFromObject(obstacle);
            if (futureBoundingBox.intersectsBox(obstacleBox)) {
                return true; // Colisão detectada
            }
        }
        return false; // Caminho livre
    }
    
    setTargetRotation(direction) {
        if (direction.lengthSq() === 0) return;
        const lookAtMatrix = new THREE.Matrix4();
        // A direção "up" (para cima) do inimigo é o eixo Y
        lookAtMatrix.lookAt(this.mesh.position, this.mesh.position.clone().add(direction), this.mesh.up);
        this.targetRotation.setFromRotationMatrix(lookAtMatrix);
    }

    changePatrolDirection() {
        this.patrolDirection.set(
            Math.random() * 2 - 1, 
            Math.random() * 0.5 - 0.25, // Varia um pouco a altura para um voo mais natural
            Math.random() * 2 - 1
        ).normalize();
        this.patrolTimer = Math.random() * 3 + 3; // Patrulha por 3 a 6 segundos
    }

    takeDamage(amount) {
        if (this.isDying) return;
        this.hp -= amount;
        if (this.hp < 0) this.hp = 0;
        
        // Atualiza a barra de vida
        if (this.healthBar) {
            const healthPercentage = this.hp / this.maxHp;
            this.healthBar.scale.x = healthPercentage;
        }

        if (this.hp <= 0) {
            this.isDying = true;
            this.state = 'dying';
            if (this.healthBar) this.mesh.remove(this.healthBar);
        }
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
