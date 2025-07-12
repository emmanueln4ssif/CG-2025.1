import * as THREE from 'three';
import { OBJLoader } from '../../../build/jsm/loaders/OBJLoader.js';
import { MTLLoader } from '../../../build/jsm/loaders/MTLLoader.js';
// Importa as funções utilitárias do gerenciador
import { createHealthBar, updateHealthBar, hasLineOfSight } from './enemies.js';

export class LostSoul {
    constructor(position, scene, collisionObjects) {
        this.hp = 20;
        this.maxHp = 20;
        this.baseSpeed = 3;
        this.baseChargeSpeed = 10;
        this.speed = 0; // Começa parado
        this.chargeSpeed = 0; // Começa parado
        this.state = 'idle'; // Novo estado inicial: 'idle', 'patrolling', 'charging', 'dying'
        this.isActive = false;
        this.patrolDirection = new THREE.Vector3();
        this.patrolTimer = 0;
        this.isDying = false;
        this.readyToRemove = false;
        this.mesh = null;
        this.healthBar = null;
        this.collisionObjects = collisionObjects;
        
        // Define a área de ativação para este inimigo (Área 1)
        // Valores de exemplo, ajuste conforme o seu cenário
        this.activationArea = new THREE.Box3(
            new THREE.Vector3(100, -10, 100),
            new THREE.Vector3(220, 50, 200)
        );

        this.loadModel(position, scene);
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
                this.collisionObjects.push(this.mesh);
                this.healthBar = createHealthBar();
                this.healthBar.position.set(0, 8, 0);
                this.mesh.add(this.healthBar);
                this.changePatrolDirection();
            });
        });
    }

    update(delta, playerObject, camera) {
        // Verifica se o jogador está na área de ativação
        this.checkActivation(playerObject.position);
        
        if (this.isDying) {
            this.updateDyingAnimation(delta);
            return;
        }
        if (this.healthBar && camera) {
            this.healthBar.quaternion.copy(camera.quaternion);
        }

        // Só executa a lógica de IA se estiver ativo
        if (!this.isActive) return;

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
            // Ativa o inimigo
            this.isActive = true;
            this.state = 'patrolling';
            this.speed = this.baseSpeed;
            this.chargeSpeed = this.baseChargeSpeed;
            console.log("Lost Soul ativado!");
        } 
    }

    takeDamage(amount) {
        if (this.isDying) return;
        this.hp -= amount;
        if (this.hp < 0) this.hp = 0;
        
        // Chama a função utilitária para atualizar a barra de vida
        updateHealthBar(this.healthBar, this.hp, this.maxHp);

        if (this.hp <= 0) {
            this.isDying = true;
            this.state = 'dying';
            if (this.healthBar) this.mesh.remove(this.healthBar);
        }
    }

    updatePatrolState(delta, playerObject) {
        const playerPosition = playerObject.position;
        if (this.mesh.position.distanceTo(playerPosition) < 40 && hasLineOfSight(this.mesh.position, playerPosition, this.collisionObjects, this.mesh)) {
            this.state = 'charging';
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

    updateChargeState(delta, playerObject) {
        const playerPosition = playerObject.position;
        this.mesh.lookAt(playerPosition);
        const direction = new THREE.Vector3().subVectors(playerPosition, this.mesh.position).normalize();
        this.mesh.position.add(direction.multiplyScalar(this.chargeSpeed * delta));
        if (this.mesh.position.distanceTo(playerPosition) > 50 || !hasLineOfSight(this.mesh.position, playerPosition, this.collisionObjects, this.mesh)) {
            this.state = 'patrolling';
        }
    }
    
    // ... (O resto das funções como updateDyingAnimation, checkCollision, etc. permanecem iguais) ...
    updateDyingAnimation(delta) { this.mesh.traverse(c => { if(c.isMesh && c.material) { c.material.transparent=true; c.material.opacity-=delta*1.5; if(c.material.opacity<=0) this.readyToRemove=true; } }); }
    changePatrolDirection() { this.patrolDirection.set(Math.random()*2-1, Math.random()*0.5-0.25, Math.random()*2-1).normalize(); this.patrolTimer=Math.random()*3+2; }
    checkCollision(s) { const b=new THREE.Box3().setFromObject(this.mesh); b.translate(s); for(const o of this.collisionObjects) { if(o===this.mesh) continue; if(b.intersectsBox(new THREE.Box3().setFromObject(o))) return true; } return false; }
    isReadyToRemove() { return this.readyToRemove; }
}
