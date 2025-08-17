import * as THREE from 'three';
import { LostSoul } from './lostSoul.js';
import { Cacodemon } from './cacodemon.js'; // Descomente quando for adicionar
import { camera,  scene, collisionObjects } from '../main.js';
import { takeDamage, player } from '../player.js';

export const allEnemies = [];
const allEnemyProjectiles = [];
const raycaster = new THREE.Raycaster();

export function createHealthBar() {
    const barHeight = 0.2;
    const barWidth = 5;

    // Barra de vida (verde)
    const healthBarMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(barWidth, barHeight),
        new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true })
    );

    const healthBar = new THREE.Group();
    healthBar.add(healthBarMesh);
 
    // Adiciona uma referência à malha da vida para ser facilmente acessada depois
    healthBar.healthMesh = healthBarMesh;

    // Para a barra de vida sempre olhar para o player e ficar visível
    healthBar.lookAt(camera.position);

    return healthBar;
}

export function updateHealthBar(healthBar, hp, maxHp) {
    if (!healthBar) return;

    const healthPercentage = hp / maxHp;
    healthBar.healthMesh.scale.x = Math.max(0, healthPercentage);

    const healthColor = healthBar.healthMesh.material.color;
    if (healthPercentage < 0.3) healthColor.set(0xff0000);
    else if (healthPercentage < 0.6) healthColor.set(0xffff00);
    else healthColor.set(0x00ff00);

    // Faz a barra virar para onde o jogador está olhand
    healthBar.lookAt(camera.position);
}

// Função "Fábrica": Cria um inimigo do tipo e posição especificados
export function createEnemy(type, position, scene, collisionEnemies, playerObject) {
    let enemy;
    switch (type) {
        case 'lost_soul':
            enemy = new LostSoul(position, scene, collisionEnemies, playerObject);
            break;
        case 'cacodemon':
            enemy = new Cacodemon(position, scene, collisionEnemies, playerObject);
            break;
        default:
            console.error("Tipo de inimigo desconhecido:", type);
            return;
    }
    allEnemies.push(enemy);
}

// Função "Gerente": Atualiza todos os inimigos na cena
export function updateEnemies(delta, playerObject, camera, scene, collisionEnemies, playerBullets) {
    for (let i = allEnemies.length - 1; i >= 0; i--) {
        const enemy = allEnemies[i];

        // Se o inimigo ainda não carregou seu modelo, pule este ciclo.
        if (!enemy.mesh) continue;

        // Atualiza a lógica individual do inimigo
        enemy.update(delta, playerObject, camera);
        updateHealthBar(enemy.healthBar, enemy.hp, enemy.maxHp);
        // Verifica se o inimigo deve ser removido
        if (enemy.isReadyToRemove()) {
            scene.remove(enemy.mesh);
            const indexInCollision = collisionEnemies.indexOf(enemy.mesh);
            if (indexInCollision > -1) {
                collisionEnemies.splice(indexInCollision, 1);
            }
            allEnemies.splice(i, 1);
            continue;
        }

        // Verifica colisão com as balas do jogador
        checkBulletCollision(enemy, playerBullets, scene);
    }
}

function checkBulletCollision(enemy, playerBullets, scene) {
    if (enemy.hp <= 0) return; // Não checa colisão se o inimigo já está morrendo

    const enemyBox = new THREE.Box3().setFromObject(enemy.mesh);

    for (let i = playerBullets.length - 1; i >= 0; i--) {
        const bulletData = playerBullets[i];
        const bulletMesh = bulletData.mesh;
        //console.log("Verificando colisão com a bala");
        
        // Cria colisão para a bala
        const bulletBox = new THREE.Box3().setFromObject(bulletMesh);

        // Verifica se a caixa da bala intercepta a caixa do inimigo
        if (enemyBox.intersectsBox(bulletBox)) {
            //console.log("HP do inimigo:", enemy.hp - bulletMesh.userData.damage);

            updateHealthBar(enemy.healthBar, enemy.hp - bulletMesh.userData.damage, enemy.maxHp);
            // Causa dano no inimigo
            if (enemy.takeDamage && bulletMesh.userData.damage) {
                enemy.takeDamage(bulletMesh.userData.damage);
            }

            // Remove a bala da cena e do array
            scene.remove(bulletMesh);
            playerBullets.splice(i, 1);

            // Sai do loop, pois a bala já atingiu um alvo
            break;
        }
    }
}

export function addEnemyProjectile(projectileData) {
    allEnemyProjectiles.push(projectileData);
}

// Função para verificar se o jogador derrotou os inimigos de cada área
// Retorna um objeto com as propriedades defeatedEnemiesArea1 e defeatedEnemiesArea2
export function checkDefeatedEnemies(player) {
    let hasLostSoul = false;
    let hasCacodemon = false;

    // Reset temporário
    player.defeatedEnemiesArea1 = false;
    player.defeatedEnemiesArea2 = false;

    for (let enemy of allEnemies) {
        if (enemy.constructor.name === 'LostSoul') hasLostSoul = true;
        if (enemy.constructor.name === 'Cacodemon') hasCacodemon = true;
    }

    if (!hasLostSoul) player.defeatedEnemiesArea1 = true;
    if (!hasCacodemon) player.defeatedEnemiesArea2 = true;

    return { defeatedEnemiesArea1: player.defeatedEnemiesArea1, defeatedEnemiesArea2: player.defeatedEnemiesArea2 };
}

// Adicione essa função para atualizar os projéteis
export function updateEnemyProjectiles(delta) {
    // Itera pelo array de trás para frente para poder remover itens com segurança
    for (let i = allEnemyProjectiles.length - 1; i >= 0; i--) {
        const projData = allEnemyProjectiles[i];
        const projectile = projData.mesh;

        const moveStep = projData.direction.clone().multiplyScalar(projData.speed * delta);
        projectile.position.add(moveStep);
        projData.traveled += moveStep.length();

        let shouldBeRemoved = false;

        // 1. Verifica se viajou a distância máxima
        if (projData.traveled >= projData.maxDistance) {
            shouldBeRemoved = true;
        }

        const projBox = new THREE.Box3().setFromObject(projectile);

        // 2. Verifica colisão com o ambiente (paredes, etc.)
        if (!shouldBeRemoved) {
            for (const obstacle of collisionObjects) {
                // Ignora outros inimigos e a si mesmo
                if (obstacle.userData.enemyInstance) continue;

                const obstacleBox = new THREE.Box3().setFromObject(obstacle);
                if (projBox.intersectsBox(obstacleBox)) {
                    shouldBeRemoved = true;
                    break;
                }
            }
        }

        // 3. Verifica colisão com o jogador
        if (!shouldBeRemoved && player && player.mesh) { // Verifica se player.mesh existe
            const playerBox = new THREE.Box3().setFromObject(player.mesh); 
            if (projBox.intersectsBox(playerBox)) {
                console.log("Projétil atingiu o jogador!");
                takeDamage(projData.mesh.userData.damage);
                shouldBeRemoved = true;
            }
        }

        // 4. Se deve ser removido, limpa tudo da memória e da cena
        if (shouldBeRemoved) {
            // Remove a luz se ela existir
            if(projectile.children.length > 0) {
                const light = projectile.children[0];
                projectile.remove(light);
            }
            scene.remove(projectile); // Remove da cena
            allEnemyProjectiles.splice(i, 1); // Remove do array de gerenciamento
        }
    }
}