// environment.js
import * as THREE from 'three';
import { createGroundPlaneXZ } from '../../libs/util/util.js';
import { buildKey, createPlatformWithKey, raisePlatform, updateObject, key, addRectangleWithKey } from './key.js';
import { controls } from './player.js';
import { Group } from '../../build/three.module.js';

//Adiciona colunas gregas à plataforma
export function addGreekColumnsToPlatform(platformGroup, collisionObjects) {

    //Parâmetros das colunas
    const columnHeight = 15;
    const columnRadius = 1.5;
    const columnColor = 0xcccccc;

    //Parâmetros da plataforma
    const width = platformGroup.userData.width;
    const depth = platformGroup.userData.depth;
    const height = platformGroup.userData.height;

    //Posição base da plataforma
    const baseX = platformGroup.userData.x;
    const baseY = platformGroup.userData.y + 0.1;
    const baseZ = platformGroup.userData.z;

    //Cria o grupo de colunas
    const spacing = 12; // Espaçamento entre colunas
    const material = new THREE.MeshLambertMaterial({
        color: columnColor,
        emissive: 0x222222,
        emissiveIntensity: 0.1
    });

    //Parte frontal da plataforma
    const y = baseY + height; // Altura da plataforma

    function createColumn(broken = false) {

        const column = new THREE.Group();

        //Fator de escala e ângulo para colunas quebradas
        // --> Se quebrada, aplica um fator de escala e um ângulo aleatório
        // --> Se não quebrada, fator de escala é 1 e ângulo é 0
        const brokenFactor = broken ? THREE.MathUtils.randFloat(0.3, 0.6) : 1.0;
        const brokenAngle = broken ? THREE.MathUtils.degToRad(THREE.MathUtils.randFloat(-15, 15)) : 0;

        //Cria o cilindro da coluna
        const shaftHeight = columnHeight * brokenFactor;
        const shaft = new THREE.Mesh(
            new THREE.CylinderGeometry(columnRadius, columnRadius, shaftHeight, 16),
            material
        );
        shaft.castShadow = true;
        shaft.receiveShadow = true;
        shaft.position.y = shaftHeight / 2;
        column.add(shaft);

        //Cria o capitel da coluna
        if (!broken || Math.random() > 0.5) {
            const top = new THREE.Mesh(
                new THREE.CylinderGeometry(columnRadius * 1.3, columnRadius * 1.3, 1.5, 16),
                material
            );
            top.position.y = shaftHeight + 0.75;
            column.add(top);
        }

        //Cria a base da coluna
        if (!broken || Math.random() > 0.3) {
            const base = new THREE.Mesh(
                new THREE.CylinderGeometry(columnRadius * 1.3, columnRadius * 1.3, 1.5, 8),
                material
            );
            base.position.y = 0 - 0.75;
            column.add(base);
        }

        //Inclinar um pouco se for quebrada
        if (broken) {
            column.rotation.x = brokenAngle * Math.random();
            column.rotation.z = brokenAngle * Math.random();
        }

        column.castShadow = true; // Habilita sombras
        column.receiveShadow = true; // Habilita recebimento de sombras
        return column;

    }

    const numFrontColumnsTotal = 10;
    const escadaHalfWidth = 20; // ajuste para a largura da escada

    const numColumnsEachSide = numFrontColumnsTotal / 2;

    const leftSpacing = (width / 2 - escadaHalfWidth + 10) / (numColumnsEachSide + 1);
    const rightSpacing = (width / 2 - escadaHalfWidth) / (numColumnsEachSide + 1);

    const leftStartX = baseX - width / 2;
    const rightStartX = baseX + escadaHalfWidth;

    const frontZ = baseZ - depth / 2 + 2;

    for (let i = 1; i <= numColumnsEachSide; i++) {
        // colunas à esquerda da escada
        const xLeft = leftStartX + leftSpacing * i;
        const colLeft = createColumn(Math.random() < 0.3);
        colLeft.position.set(xLeft, y, frontZ + 5);
        platformGroup.add(colLeft);

        // colunas à direita da escada
        const xRight = rightStartX + rightSpacing * i;
        const colRight = createColumn(Math.random() < 0.3);
        colRight.position.set(xRight, y, frontZ + 5);
        platformGroup.add(colRight);
    }


    //Traseira
    const backZ = baseZ + depth / 2 - 2;
    const columns = [];
    let xStart = baseX - width / 2 + spacing;
    let xEnd = xStart;

    for (let x = xStart; x < baseX + width / 2; x += spacing) {
        const col = createColumn();
        col.position.set(x, y + 1, backZ);
        platformGroup.add(col);
        columns.push(col);
        xEnd = x; // atualiza xEnd para o último valor
    }

    //Adiciona a viga horizontal conectando as colunas
    const beamLength = xEnd - xStart + 8;
    const beamHeight = 0.5;
    const beamDepth = 4;

    const beamGeometry = new THREE.BoxGeometry(beamLength, beamHeight, beamDepth);
    const beamMaterial = new THREE.MeshStandardMaterial({ color: 0xaaaaaa });
    const beam = new THREE.Mesh(beamGeometry, beamMaterial);

    //Posiciona a viga no meio entre primeira e última coluna e no topo das colunas
    beam.position.set((xStart + xEnd) / 2, y + columnHeight + 2, backZ); // ajuste Y conforme altura da coluna
    platformGroup.add(beam);

    //Adiciona a viga horizontal conectando as colunas
    const topBeamLength = xEnd - xStart + 12;
    const topBeamHeight = 0.8;
    const topBeamDepth = 4;

    const topBeamGeometry = new THREE.BoxGeometry(topBeamLength, topBeamHeight, topBeamDepth);
    const topBeamMaterial = new THREE.MeshStandardMaterial({ color: 0xaaaaaa });
    const topBeam = new THREE.Mesh(topBeamGeometry, topBeamMaterial);

    //Posiciona a viga no meio entre primeira e última coluna e no topo das colunas
    topBeam.position.set((xStart + xEnd) / 2, y + columnHeight + 3, backZ); // ajuste Y conforme altura da coluna
    platformGroup.add(topBeam);


    //Laterais
    for (let z = baseZ - depth / 2 + spacing; z < baseZ + depth / 2; z += spacing) {
        //Esquerda
        const leftX = baseX - width / 2 + 2;
        const colLeft = createColumn(Math.random() < 0.9);
        colLeft.position.set(leftX, y, z);
        platformGroup.add(colLeft);

        //Direita
        const rightX = baseX + width / 2 - 2;
        const colRight = createColumn(Math.random() < 0.3);
        colRight.position.set(rightX, y, z);
        platformGroup.add(colRight);
    }

    // Adiciona as colunas ao array de colisão
    platformGroup.traverse(child => {
        if (child.isMesh) {
            collisionObjects.push(child);
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });

    platformGroup.castShadow = true; // Habilita sombras para o grupo de colunas
    platformGroup.receiveShadow = true; // Habilita recebimento de sombras para o grupo de colunas

}

// Cria colunas gregas na frente da plataforma
export function createGreekFrontColumns(scene, position, scale, collisionObjects) {
    const group = new THREE.Group();
    const material = new THREE.MeshLambertMaterial({ color: 0xaaaaaa, emissive: 0x222222, emissiveIntensity: 0.1 });
    const rubyshMaterial = new THREE.MeshLambertMaterial({ color: 0x444444, emissive: 0x222222, emissiveIntensity: 0.1}); //cinza escuro
    const goldMaterial = new THREE.MeshLambertMaterial({ color: 0x888888, emissive: 0x222222, emissiveIntensity: 0.1 }); //cinza mais escuro

    const columnHeight = 40 * scale;
    const columnRadius = 4 * scale;
    const spacing = 30 * scale;

    //Cria uma coluna  simples
    function createColumn(xOffset) {

        const column = new THREE.Group();

        const shaft = new THREE.Mesh(
            new THREE.CylinderGeometry(columnRadius, columnRadius, columnHeight, 8),
            material
        );

        shaft.position.y = columnHeight / 2;
        column.add(shaft);

        const capital = new THREE.Mesh(
            new THREE.CylinderGeometry(columnRadius * 1.5, columnRadius * 1.5, 2 * scale, 16),
            material
        );

        capital.position.y = columnHeight + 1 * scale;
        column.add(capital);

        column.position.x = xOffset;
        column.castShadow = true;
        column.receiveShadow = true;

        return column;
    }

    //Coluna esquerda e direita
    const leftCol = createColumn(-spacing);
    leftCol.castShadow = true;
    leftCol.receiveShadow = true;

    const rightCol = createColumn(spacing);
    rightCol.castShadow = true;
    rightCol.receiveShadow = true;
    group.add(leftCol);
    group.add(rightCol);

    //Viga horizontal
    const beam = new THREE.Mesh(
        new THREE.BoxGeometry(spacing * 2 + columnRadius * 2, 2 * scale, 4 * scale),
        rubyshMaterial
    );
    beam.position.y = columnHeight + 2.5 * scale;
    beam.castShadow = true;
    beam.receiveShadow = true;
    group.add(beam);

    //viga vertical no meio da viga horizontal
    const verticalBeam = new THREE.Mesh(
        new THREE.BoxGeometry(2 * scale, 3, 4 * scale),
        rubyshMaterial
    );
    verticalBeam.castShadow = true;
    verticalBeam.receiveShadow = true;
    group.add(verticalBeam);
    verticalBeam.position.set(0, columnHeight + 7 * scale, 0);

    //Frontão 
    const roof = new THREE.Mesh(
        new THREE.ConeGeometry(spacing * scale, 5 * scale, 5),
        goldMaterial
    );

    //deixar em pé
    roof.position.y = columnHeight + 10 * scale;
    roof.rotation.x = -Math.PI / 2;
    roof.castShadow = true;
    roof.receiveShadow = true;
    group.add(roof);

    // Posiciona o conjunto
    group.position.set(position.x, position.y, position.z);
    collisionObjects.push(group);
    scene.add(group);

    group.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });

}