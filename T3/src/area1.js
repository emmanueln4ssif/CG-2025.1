// environment.js
import * as THREE from 'three';
import { createGroundPlaneXZ } from '../../libs/util/util.js';
import { buildKey, createPlatformWithKey, updateObject, key, addRectangleWithKey } from './key.js';
import { controls } from './player.js';
import { BufferGeometry, Group } from '../../build/three.module.js';

const loader = new THREE.TextureLoader();

export function buildPlatformArea1(scene, side_size, front_size, height, position, step_size, number_of_steps, step_depth, color) {

    // Carrega texturas da plataforma
    const colorMap = loader.load('assets/textures/area1/dirty_stone/Rock051_1K-PNG_Color.png');
    const aoMap = loader.load('assets/textures/area1/dirty_stone/Rock051_1K-PNG_AmbientOcclusion.png');
    const displacementMap = loader.load('assets/textures/area1/dirty_stone/Rock051_1K-PNG_Displacement.png');
    const normalMap = loader.load('assets/textures/area1/dirty_stone/Rock051_1K-PNG_NormalGL.png');
    const roughnessMap = loader.load('assets/textures/area1/dirty_stone/Rock051_1K-PNG_Roughness.png'); //não funciona?

    const stair_depth = number_of_steps * step_depth;
    const step_height = height / number_of_steps;
    const depth = step_depth * (number_of_steps);
    const platform = new THREE.Group();
    const escadaGroup = new THREE.Group();

    // Constroi escadas
    const escadaMaterial = createRepeatingMaterial(8, height / number_of_steps / 2, { colorMap, aoMap, displacementMap, normalMap });
    for (let i = 0; i < number_of_steps; i++) {
        const degrau = new THREE.Mesh(
            new THREE.BoxGeometry(step_size, step_height, step_depth),
            escadaMaterial
        );
        degrau.position.set(0, (i + 0.5) * step_height, (i + 0.5) * step_depth);
        escadaGroup.add(degrau);
    }
    escadaGroup.position.set(position.x, 0, position.z - (side_size / 2) + (step_depth / 2));


    //Lógica da rampa
    const boundingBox = new THREE.Box3().setFromObject(escadaGroup);
    const center = boundingBox.getCenter(new THREE.Vector3());

    const rampLength = Math.sqrt(stair_depth * stair_depth + height * height);
    const rampAngle = Math.atan(height / stair_depth);

    const ramp = new THREE.Mesh(
        new THREE.BoxGeometry(step_size, 0.1, rampLength),
        new THREE.MeshBasicMaterial({ visible: true, transparent: false, opacity: 0.0 })
    );
    ramp.rotation.x = -rampAngle;
    ramp.position.set(center.x, height / 2, center.z - stair_depth / 2 + rampLength / 2.5 * Math.cos(rampAngle) - 0.5 + 0.4);
    ramp.userData = {
        isRamp: true,
        rampLength,
        rampHeight: height,
        rampAngle,
        rampDirection: new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(1, 0, 0), rampAngle)
    };
    ramp.visible = false;


    //Geometrias da base da área
    // Crie a geometria normalmente, sem modificar os UVs.
    const frontalGeometry = new THREE.BoxGeometry((front_size - step_size) / 2, height, depth);
    const traseiraGeometry = new THREE.BoxGeometry(front_size, height, side_size - stair_depth);

    // Cria os materiais para cada tipo de face, pensando na repetição
    const sideMaterial = createRepeatingMaterial(1, 0.5, { colorMap, aoMap, displacementMap, normalMap });
    const mainMaterial = createRepeatingMaterial(4, 0.25, { colorMap, aoMap, displacementMap, normalMap });

    // Materiais da traseira
    const backMaterial = createRepeatingMaterial(22.59, 8.43, { colorMap, aoMap, displacementMap, normalMap });
    const sideTraseiraMaterial = createRepeatingMaterial(18, 0.5, { colorMap, aoMap, displacementMap, normalMap });
    const frontTraseiraMaterial = createRepeatingMaterial(22.59, 0.5, { colorMap, aoMap, displacementMap, normalMap });
    //100-5.6 = 94.4; 5.6 para 0,5 assim como 94.4 para x = 8,43
    //120-15 = 85; 42.5 para 8 assim como 120 para x = 22.59

    // Cria um array de materiais na ordem correta do boxgeometry, para cada uma das faces
    const frontMaterials = [
        sideMaterial, // dir
        sideMaterial, // esq 
        mainMaterial, // cima
        mainMaterial, // baixo
        mainMaterial, // frente
        mainMaterial  // trás
    ];

    const traseiraMaterials = [
        sideTraseiraMaterial,
        sideTraseiraMaterial,
        backMaterial,
        backMaterial,
        frontTraseiraMaterial,
        frontTraseiraMaterial
    ];

    // Crie o Mesh .
    const frontal1 = new THREE.Mesh(frontalGeometry, frontMaterials);
    frontal1.position.set(center.x - (front_size - step_size) / 4 - step_size / 2, height / 2, center.z);

    const frontal2 = new THREE.Mesh(frontalGeometry, frontMaterials);
    frontal2.position.set(center.x + (front_size - step_size) / 4 + step_size / 2, height / 2, center.z);

    const traseira = new THREE.Mesh(traseiraGeometry, traseiraMaterials);
    traseira.position.set(center.x, height / 2, center.z + (side_size / 2) - (step_depth / 2) + 0.4);

    platform.add(escadaGroup, frontal1, frontal2, traseira, ramp);

    platform.userData.width = front_size;
    platform.userData.depth = side_size;
    platform.userData.height = height;

    platform.userData.x = position.x;
    platform.userData.y = position.y;
    platform.userData.z = position.z;

    return platform;
}



//Adiciona colunas gregas à plataforma
export function addGreekColumnsToPlatform(platformGroup, collisionObjects) {

    //Parâmetros das colunas
    const columnHeight = 15;
    const columnRadius = 1.5;
    const spacing = 12; // Espaçamento entre colunas

    //Parâmetros da plataforma
    const width = platformGroup.userData.width;
    const depth = platformGroup.userData.depth;
    const height = platformGroup.userData.height;

    //Posição base da plataforma
    const baseX = platformGroup.userData.x;
    const baseY = platformGroup.userData.y + 0.1;
    const baseZ = platformGroup.userData.z;
    const y = baseY + height;

    //Criar texturas
    const colorMap = loader.load('assets/textures/area1/pillars/Tiles083_2K-PNG_Color.png');
    const aoMap = loader.load('assets/textures/area1/pillars/Tiles083_2K-PNG_AmbientOcclusion.png');
    const displacementMap = loader.load('assets/textures/area1/pillars/Tiles083_2K-PNG_Displacement.png');
    const normalMap = loader.load('assets/textures/area1/pillars/Tiles083_2K-PNG_NormalGL.png');

    //Materiais necessários
    const columnMaterial = createRepeatingMaterial(1, 1, { colorMap, aoMap, displacementMap, normalMap });
    const beamMaterial = createRepeatingMaterial(25, 2, { colorMap, aoMap, displacementMap, normalMap });
    const topBeamMaterial = createRepeatingMaterial(25, 0.25, { colorMap, aoMap, displacementMap, normalMap });


    function createColumn(broken = false) {

        const column = new THREE.Group();

        // Fator de escala e ângulo para colunas quebradas
        const brokenFactor = broken ? THREE.MathUtils.randFloat(0.3, 0.6) : 1.0;
        const brokenAngle = broken ? THREE.MathUtils.degToRad(THREE.MathUtils.randFloat(-15, 15)) : 0;

        // --- Geometria do Fuste (Shaft) com mais detalhes ---
        // Adicionamos 64 segmentos de altura para o displacement funcionar
        const shaftHeight = columnHeight * brokenFactor;
        const shaftGeometry = new THREE.CylinderGeometry(columnRadius, columnRadius, shaftHeight, 16, 64);
        const shaft = new THREE.Mesh(shaftGeometry, columnMaterial);
        shaft.castShadow = true;
        shaft.receiveShadow = true;
        shaft.position.y = shaftHeight / 2;
        column.add(shaft);

        // --- Capitel (Top) ---
        if (!broken || Math.random() > 0.5) {
            const overlap = 0.4;
            const topGeometry = new THREE.CylinderGeometry(columnRadius * 1.3, columnRadius * 1.3, 1.5, 16, 4);
            const top = new THREE.Mesh(topGeometry, columnMaterial); // Use o novo material
            top.position.y = shaftHeight + 0.75 - overlap;
            column.add(top);
        }

        // --- Base ---
        if (!broken || Math.random() > 0.3) {
            const overlap = 0.4;
            const baseGeometry = new THREE.CylinderGeometry(columnRadius * 1.3, columnRadius * 1.3, 1.5, 8, 4);
            const base = new THREE.Mesh(baseGeometry, columnMaterial); // Use o novo material
            base.position.y = -0.75 + overlap; // Corrigido para posicionar abaixo do fuste
            column.add(base);
        }

        // Inclinar um pouco se for quebrada
        if (broken) {
            column.rotation.x = brokenAngle * Math.random();
            column.rotation.z = brokenAngle * Math.random();
        }

        // Não é necessário definir cast/receive shadow para o Group se você já define nos Meshes internos
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
        xEnd = x;
    }

    //Adiciona as vigas horizontais conectando as colunas
    //Viga menor
    const beamLength = xEnd - xStart + 8;
    const beamHeight = 0.5;
    const beamDepth = 4;
    const beamGeometry = new THREE.BoxGeometry(beamLength, beamHeight, beamDepth);
    const beam = new THREE.Mesh(beamGeometry, beamMaterial);
    beam.position.set((xStart + xEnd) / 2, y + columnHeight + 2, backZ);
    platformGroup.add(beam);

    //Viga maior
    const topBeamLength = xEnd - xStart + 12;
    const topBeamHeight = 0.8;
    const topBeamDepth = 4;
    const topBeamGeometry = new THREE.BoxGeometry(topBeamLength, topBeamHeight, topBeamDepth);
    const topBeam = new THREE.Mesh(topBeamGeometry, topBeamMaterial);
    topBeam.position.set((xStart + xEnd) / 2, y + columnHeight + 3, backZ);
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
    const columnHeight = 40 * scale;
    const columnRadius = 4 * scale;
    const spacing = 30 * scale;

    //Criar texturas
    const colorMap = loader.load('assets/textures/area1/pillars/Tiles083_2K-PNG_Color.png');
    const aoMap = loader.load('assets/textures/area1/pillars/Tiles083_2K-PNG_AmbientOcclusion.png');
    const displacementMap = loader.load('assets/textures/area1/pillars/Tiles083_2K-PNG_Displacement.png');
    const normalMap = loader.load('assets/textures/area1/pillars/Tiles083_2K-PNG_NormalGL.png');
    const columnMaterial = createRepeatingMaterial(1, 2, { colorMap, aoMap, displacementMap, normalMap });
    const topBeamMaterial = createRepeatingMaterial(6, 0.25, { colorMap, aoMap, displacementMap, normalMap });
    const roofMaterial = createRepeatingMaterial(3, 0.25, { colorMap, aoMap, displacementMap, normalMap });

    //Cria uma coluna  simples
    function createColumn(xOffset) {

        const column = new THREE.Group();

        const shaft = new THREE.Mesh(
            new THREE.CylinderGeometry(columnRadius, columnRadius, columnHeight, 8),
            columnMaterial
        );

        shaft.position.y = columnHeight / 2;
        column.add(shaft);

        const capital = new THREE.Mesh(
            new THREE.CylinderGeometry(columnRadius * 1.5, columnRadius * 1.5, 2 * scale, 16),
            topBeamMaterial
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
        topBeamMaterial
    );
    beam.position.y = columnHeight + 2.5 * scale;
    beam.castShadow = true;
    beam.receiveShadow = true;
    group.add(beam);

    //viga vertical no meio da viga horizontal
    const verticalBeam = new THREE.Mesh(
        new THREE.BoxGeometry(2 * scale, 3, 4 * scale),
        columnMaterial
    );
    verticalBeam.castShadow = true;
    verticalBeam.receiveShadow = true;
    group.add(verticalBeam);
    verticalBeam.position.set(0, columnHeight + 7 * scale, 0);

    //Frontão 
    const roof = new THREE.Mesh(
        new THREE.ConeGeometry(spacing * scale, 5 * scale, 5),
        roofMaterial
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

// Função para definir o quanto um material se repete:
function createRepeatingMaterial(repeatX, repeatY, maps) {
    // Função auxiliar para clonar e configurar cada textura
    const setupTexture = (map) => {
        if (!map) return null;
        const texture = map.clone();
        //texture.needsUpdate = true;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(repeatX, repeatY);
        return texture;
    };

    return new THREE.MeshLambertMaterial({
        map: setupTexture(maps.colorMap),
        aoMap: setupTexture(maps.aoMap),
        displacementMap: setupTexture(maps.displacementMap),
        displacementScale: 0.3,
        displacementBias: -0.15,
        normalMap: setupTexture(maps.normalMap),
    });
}