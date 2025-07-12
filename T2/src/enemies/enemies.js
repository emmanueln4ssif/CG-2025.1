import * as THREE from 'three';
import { LostSoul } from './lostSoul.js';
import { Cacodemon } from './cacodemon.js'; // Descomente quando for adicionar

export const allEnemies = [];
const raycaster = new THREE.Raycaster();

export function createHealthBar() {
    const barHeight = 0.2;
    const barWidth = 5;

    // Fundo preto da barra
    const bgBar = new THREE.Mesh(
        new THREE.PlaneGeometry(barWidth + 0.1, barHeight + 0.1),
        new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true })
    );

    // Barra de vida (verde)
    const healthBarMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(barWidth, barHeight),
        new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true })
    );

    const healthBar = new THREE.Group();
    healthBar.add(bgBar);
    healthBar.add(healthBarMesh);

    // Adiciona uma referência à malha da vida para ser facilmente acessada depois
    healthBar.healthMesh = healthBarMesh;

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

    // Faz a barra virar para a câmera
    //healthBar.lookAt(camera.position);
}


// Função "Fábrica": Cria um inimigo do tipo e posição especificados
export function createEnemy(type, position, scene, collisionObjects) {
    let enemy;
    switch (type) {
        case 'lost_soul':
            enemy = new LostSoul(position, scene, collisionObjects);
            break;
        case 'cacodemon':
            enemy = new Cacodemon(position, scene, collisionObjects);
            break;
        default:
            console.error("Tipo de inimigo desconhecido:", type);
            return;
    }
    allEnemies.push(enemy);
}

// Função "Gerente": Atualiza todos os inimigos na cena
export function updateEnemies(delta, playerObject, camera, scene, collisionObjects, playerBullets) {
    for (let i = allEnemies.length - 1; i >= 0; i--) {
        const enemy = allEnemies[i];

        // Se o inimigo ainda não carregou seu modelo, pule este ciclo.
        if (!enemy.mesh) continue;

        // Atualiza a lógica individual do inimigo
        enemy.update(delta, playerObject, camera);

        // Verifica se o inimigo deve ser removido
        if (enemy.isReadyToRemove()) {
            scene.remove(enemy.mesh);
            const indexInCollision = collisionObjects.indexOf(enemy.mesh);
            if (indexInCollision > -1) {
                collisionObjects.splice(indexInCollision, 1);
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
        console.log(`%cVerificando colisão com a bala: ${bulletMesh.uuid}`, 'color: orange; font-weight: bold;');

        // Cria uma caixa de colisão para a bala
        const bulletBox = new THREE.Box3().setFromObject(bulletMesh);

        // Verifica se a caixa da bala intercepta a caixa do inimigo
        if (enemyBox.intersectsBox(bulletBox)) {
            console.log(`%cACERTOU! HP do inimigo: ${enemy.hp - bulletMesh.userData.damage}`, 'color: yellow; font-weight: bold;');

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

export function hasLineOfSight(start, end, colliders, selfMesh) {
    const direction = new THREE.Vector3().subVectors(end, start).normalize();
    raycaster.set(start, direction);
    const intersects = raycaster.intersectObjects(colliders, true);

    for (const intersect of intersects) {
        // Ignora a si mesmo
        if (intersect.object === selfMesh || intersect.object.parent === selfMesh) {
            continue;
        }
        // Se o primeiro obstáculo encontrado estiver mais perto que o jogador, não há linha de visão
        if (intersect.distance < start.distanceTo(end)) {
            return false;
        }
    }
    // Se o loop terminar, significa que não há obstáculos no caminho
    return true;
}

// Função para verificar se o jogador derrotou os inimigos de cada área
// Retorna um objeto com as propriedades defeatedEnemiesArea1 e defeatedEnemiesArea2
export function checkDefeatedEnemies(player) {
    
    let hasLostSoul = false;
    let hasCacodemon = false;

    for (let enemy of allEnemies) {
        if (enemy.constructor.name === 'LostSoul') hasLostSoul = true;
        if (enemy.constructor.name === 'Cacodemon') hasCacodemon = true;
    }

    if (!hasLostSoul) player.defeatedEnemiesArea1 = true;
    if (!hasCacodemon) player.defeatedEnemiesArea2 = true;


    //console.log("derrotados:");
    //console.log("area 1:", player.defeatedEnemiesArea1);
    //console.log("area 2:", player.defeatedEnemiesArea2);

    return { defeatedEnemiesArea1: player.defeatedEnemiesArea1, defeatedEnemiesArea2: player.defeatedEnemiesArea2 };
}