import * as THREE from 'three';
import { GLTFLoader } from '../../../build/jsm/loaders/GLTFLoader.js';
import { createHealthBar, updateHealthBar, hasLineOfSight } from './enemies.js';

export const cacodemonProjectiles = [];

export class Cacodemon {
    constructor(position, scene, collisionObjects) {
        this.hp = 50;
        this.maxHp = 50;
        this.baseSpeed = 4;
        this.speed = 0; // Começa parado
        this.state = 'idle'; // 'idle', 'patrolling', 'attacking', 'dying'
        this.isActive = false;
        this.isDying = false;
        this.readyToRemove = false;
        this.attackCooldown = 0;
        this.minAttackDistance = 15;
        this.maxAttackDistance = 40;
        this.mesh = null; // Será a hitbox invisível
        this.healthBar = null;
        this.collisionObjects = collisionObjects;
        this.scene = scene;
        
        // Define a área de ativação para este inimigo (Área 2)
        // Valores de exemplo, ajuste conforme o seu cenário
        this.activationArea = new THREE.Box3(

            new THREE.Vector3(-55, -10, 100), // Ponto mínimo (x, y, z)
            new THREE.Vector3(65, 50, 200)   // Ponto máximo (x, y, z)
        );

        this.loadModel(position);
    }

    loadModel(position) {
        const loader = new GLTFLoader();
        loader.load('./assets/cacodemon.glb', (gltf) => {
            // --- CRIAÇÃO DA HITBOX MAIOR ---
            // 1. Cria uma geometria invisível maior que o modelo
            const hitboxGeometry = new THREE.SphereGeometry(2.5, 8, 8); // Raio de 2.5
            const hitboxMaterial = new THREE.MeshBasicMaterial({ visible: false });
            this.mesh = new THREE.Mesh(hitboxGeometry, hitboxMaterial); // this.mesh agora é a hitbox
            this.mesh.position.copy(position);

            // 2. O modelo visual é adicionado como FILHO da hitbox
            const visualModel = gltf.scene;
            visualModel.scale.set(0.01, 0.01, 0.01);
            visualModel.position.y = -1.5; // Ajusta a posição do modelo dentro da hitbox
            this.mesh.add(visualModel);

            visualModel.traverse(child => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            this.scene.add(this.mesh);
            this.collisionObjects.push(this.mesh);

            this.healthBar = createHealthBar();
            this.healthBar.position.set(0, 3.5, 0);
            this.mesh.add(this.healthBar);
        });
    }

    update(delta, playerObject, camera) {
        this.checkActivation(playerObject.position);

        if (this.isDying) {
            this.updateDyingAnimation(delta);
            return;
        }
        if (this.healthBar && camera) {
            this.healthBar.quaternion.copy(camera.quaternion);
        }
        if (this.attackCooldown > 0) this.attackCooldown -= delta;
        
        if (!this.isActive) return;

        switch (this.state) {
            case 'attacking':
                this.updateAttackState(delta, playerObject);
                break;
        }
    }
    
    checkActivation(playerPosition) {
        const isPlayerInArea = this.activationArea.containsPoint(playerPosition);
        if (isPlayerInArea && !this.isActive) {
            this.isActive = true;
            this.state = 'attacking'; // Cacodemon já começa a atacar
            this.speed = this.baseSpeed;
            console.log("Cacodemon ativado!");
        } else if (!isPlayerInArea && this.isActive) {
            this.isActive = false;
            this.state = 'idle';
            this.speed = 0;
            console.log("Cacodemon desativado!");
        }
    }

    takeDamage(amount) {
        if (this.isDying) return;
        this.hp -= amount;
        if (this.hp < 0) this.hp = 0;
        updateHealthBar(this.healthBar, this.hp, this.maxHp);
        if (this.hp <= 0) {
            this.isDying = true;
            this.state = 'dying';
            if (this.healthBar) this.mesh.remove(this.healthBar);
        }
    }

    updateAttackState(delta, playerObject) {
        const playerPosition = playerObject.position;
        this.mesh.lookAt(playerPosition);
        const distanceToPlayer = this.mesh.position.distanceTo(playerPosition);
        const lineOfSight = hasLineOfSight(this.mesh.position, playerPosition, this.collisionObjects, this.mesh);

        if (distanceToPlayer < this.minAttackDistance) {
            const direction = new THREE.Vector3().subVectors(this.mesh.position, playerPosition).normalize();
            this.mesh.position.add(direction.multiplyScalar(this.speed * delta));
        } else if (distanceToPlayer > this.maxAttackDistance) {
            const direction = new THREE.Vector3().subVectors(playerPosition, this.mesh.position).normalize();
            this.mesh.position.add(direction.multiplyScalar(this.speed * delta));
        }

        if (this.attackCooldown <= 0 && lineOfSight) {
            this.shootProjectile(playerPosition);
            this.attackCooldown = Math.random() * 2 + 1.5;
        }

        if (distanceToPlayer > this.maxAttackDistance * 1.5 || !lineOfSight) {
            // Se perdeu o jogador de vista, poderia voltar a patrulhar, mas por enquanto fica parado
        }
    }

    shootProjectile(playerPosition) {
        const projectile = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffff00 }));
        const startPosition = this.mesh.position.clone();
        const direction = new THREE.Vector3().subVectors(playerPosition, startPosition).normalize();
        startPosition.add(direction.multiplyScalar(3)); // Começa um pouco à frente da hitbox
        projectile.position.copy(startPosition);
        this.scene.add(projectile);
        cacodemonProjectiles.push({ mesh: projectile, direction: direction, speed: 25, traveled: 0, maxDistance: 100 });
    }
    
    // ... (O resto das funções como updateDyingAnimation, isReadyToRemove, etc. permanecem iguais) ...
    updateDyingAnimation(delta) { this.mesh.traverse(c => { if(c.material) { c.material.transparent=true; c.material.opacity-=delta*1.5; if(c.material.opacity<=0) this.readyToRemove=true; } }); }
    isReadyToRemove() { return this.readyToRemove; }
}
