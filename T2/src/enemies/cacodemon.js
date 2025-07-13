import * as THREE from 'three';
import { GLTFLoader } from '../../../build/jsm/loaders/GLTFLoader.js';
// Importa as funções utilitárias do gerenciador
import { createHealthBar, hasLineOfSight, addEnemyProjectile } from './enemies.js';

export class Cacodemon {
    constructor(position, scene, collisionObjects) {
        // ID único para distinguirmos cada Cacodemon na consola
        this.id = `Cacodemon-${Math.random().toString(16).slice(2, 8)}`;
        console.log(`%c[${this.id}] CONSTRUINDO na posição:`, 'font-weight: bold; color: green;', position);

        this.hp = 50;
        this.maxHp = 50;
        this.baseSpeed = 4;
        this.speed = 0;
        this.state = 'idle';
        this.isActive = false;
        this.patrolDirection = new THREE.Vector3();
        this.patrolTimer = 0;
        this.detectionDistance = 40;
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

        this.loadModel(position);
    }

    loadModel(position) {
        const loader = new GLTFLoader();
        loader.load('./assets/cacodemon.glb', (gltf) => {
            console.log(`%c[${this.id}] -> Modelo 3D (.glb) carregado com sucesso.`, 'color: #888');

            const hitboxGeometry = new THREE.SphereGeometry(6, 8, 8);
            // Deixei a hitbox visível para podermos ver o alinhamento
            const hitboxMaterial = new THREE.MeshBasicMaterial({ visible: true, wireframe: true, color: 0xff00ff });
            this.mesh = new THREE.Mesh(hitboxGeometry, hitboxMaterial);
            this.mesh.position.copy(position);

            const visualModel = gltf.scene;
            visualModel.scale.set(0.01, 0.01, 0.01);
            
            const box = new THREE.Box3().setFromObject(visualModel);
            const center = box.getCenter(new THREE.Vector3());
            console.log(`%c[${this.id}] -> Centro calculado do modelo visual:`, 'color: #888', center);
            
            visualModel.position.sub(center);
            console.log(`%c[${this.id}] -> Posição do modelo visual ajustada para:`, 'color: #888', visualModel.position);
            
            this.mesh.add(visualModel);

            visualModel.traverse(child => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    // LOG para ver o que está a ser adicionado aos colisores
                    console.log(`%c[${this.id}] -> Adicionando parte do modelo ('${child.name}') aos collisionObjects.`, 'color: #888');
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
        if (!this.mesh) {
            // Se o mesh ainda não carregou, não faz nada.
            return;
        }

        this.checkActivation(playerObject.position);
        
        if (!this.isActive) {
            // Se não está ativo, não faz nada.
            return;
        }

        console.log(`%c[${this.id}] Loop de UPDATE. Estado: ${this.state}, Ativo: ${this.isActive}`, 'color: cyan');

        if (this.isDying) { this.updateDyingAnimation(delta); return; }
        if (this.healthBar && camera) { this.healthBar.quaternion.copy(camera.quaternion); }
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
        if (isPlayerInArea && !this.isActive) {
            this.isActive = true;
            this.state = 'attacking'; // Como no seu código, começa a atacar
            this.speed = this.baseSpeed;
            console.log(`%c[${this.id}] JOGADOR ENTROU NA ÁREA! Ativando. Novo estado: '${this.state}'`, 'background: #222; color: #bada55');
        }
    }

    takeDamage(amount) {
        if (this.isDying) return;
        this.hp -= amount;
        if (this.hp < 0) this.hp = 0;
        // updateHealthBar(this.healthBar, this.hp, this.maxHp); // Supondo que enemies.js faz isto
        if (this.hp <= 0) {
            this.isDying = true;
            this.state = 'dying';
            if (this.healthBar) this.mesh.remove(this.healthBar);
        }
    }

    updatePatrolState(delta, playerObject) {
        console.log(`%c[${this.id}] -> EXECUTANDO LÓGICA DE PATRULHA.`, 'color: lightblue');
        // Este estado não está a ser chamado no seu código atual, mas os logs estão aqui caso seja ativado.
        const playerPosition = playerObject.position;
        if (this.mesh.position.distanceTo(playerPosition) < 40 && hasLineOfSight(this.mesh.position, playerPosition, this.collisionObjects, this.mesh)) {
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
        console.log(`%c[${this.id}] -> EXECUTANDO LÓGICA DE ATAQUE.`, 'color: lightcoral');
        const playerPosition = playerObject.position;
        this.mesh.lookAt(playerPosition);

        const lineOfSight = hasLineOfSight(this.mesh.position, playerPosition, this.collisionObjects, this.mesh);
        console.log(`%c[${this.id}] -> Verificando linha de visão... Resultado: ${lineOfSight}`, 'color: #ddd');

        if (this.attackCooldown <= 0 && lineOfSight) {
            console.log(`%c[${this.id}] CONDIÇÕES DE TIRO CUMPRIDAS! A ATIRAR!`, 'background: #222; color: #ff00ff; font-size: 14px;');
            this.shootProjectile(playerPosition);
            this.attackCooldown = Math.random() * 2 + 1.5;
        } else if (this.attackCooldown > 0) {
            console.log(`%c[${this.id}] -> Não atirou. Motivo: Cooldown ativo (${this.attackCooldown.toFixed(2)}s).`, 'color: #aaa');
        } else if (!lineOfSight) {
            console.log(`%c[${this.id}] -> Não atirou. Motivo: Sem linha de visão.`, 'color: #aaa');
        }

        // A sua lógica de movimento original (comentada) não foi incluída, pois não estava a ser usada.
        // Se quiser que ele se mova, a lógica precisa de ser adicionada aqui.
    }

    shootProjectile(playerPosition) {
        const projectile = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffff00 }));
        projectile.castShadow = true;
        projectile.userData.damage = 10;
        const startPosition = this.mesh.position.clone();
        const direction = new THREE.Vector3().subVectors(playerPosition, startPosition).normalize();
        startPosition.add(direction.clone().multiplyScalar(3));
        projectile.position.copy(startPosition);
        this.scene.add(projectile);
        addEnemyProjectile({ mesh: projectile, direction: direction, speed: 25, traveled: 0, maxDistance: 100 });
    }
    
    // As suas funções auxiliares que faltavam no código que me mandou
    changePatrolDirection() {
        this.patrolDirection.set(Math.random() * 2 - 1, Math.random() * 0.5 - 0.25, Math.random() * 2 - 1).normalize();
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

    updateDyingAnimation(delta) { this.mesh.traverse(c => { if(c.material) { c.material.transparent=true; c.material.opacity-=delta*1.5; if(c.material.opacity<=0) this.readyToRemove=true; } }); }
    isReadyToRemove() { return this.readyToRemove; }
}
