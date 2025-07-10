// characterBody.js
import * as THREE from 'three';

// Raycasting
const raycaster = new THREE.Raycaster();
const rayDirections = {
   down: new THREE.Vector3(0, -1, 0),
   up: new THREE.Vector3(0, 1, 0),
   front: new THREE.Vector3(0, 0, -1),
   back: new THREE.Vector3(0, 0, 1),
   left: new THREE.Vector3(-1, 0, 0),
   right: new THREE.Vector3(1, 0, 0)
};

// Função de verificação de colisão horizontal com deslizamento
function checkHorizontalCollision(position, moveVector, character, collisionObjects) {
   const directions = [
      { dir: rayDirections.front, move: [0, 0, -1] },
      { dir: rayDirections.back, move: [0, 0, 1] },
      { dir: rayDirections.left, move: [-1, 0, 0] },
      { dir: rayDirections.right, move: [1, 0, 0] }
   ];

   const newPosition = position.clone().add(moveVector);
   let canMove = true;

   for (const { dir, move } of directions) {
      raycaster.set(newPosition, dir);
      raycaster.far = character.radius + 0.5;

      const intersects = raycaster.intersectObjects(collisionObjects);
      if (intersects.length > 0 && intersects[0].distance <= character.radius + 0.5) {
         const moveDir = new THREE.Vector3(...move);
         if (moveVector.dot(moveDir) > 0) {
            canMove = false;

            const wallNormal = intersects[0].face?.normal || dir.clone().negate();
            const slideDirection = moveVector.clone().projectOnPlane(wallNormal);

            if (slideDirection.length() > 0) {
               return checkHorizontalCollision(position, slideDirection.multiplyScalar(0.6), character, collisionObjects);
            }
         }
      }
   }

   return canMove ? newPosition : position;
}

// Função principal de atualização de personagem
function updateCharacter(delta, character, controls, moveVector, collisionObjects) {
   if (!controls || !controls.isLocked) return;

   const characterObj = controls.getObject();
   const characterPos = characterObj.position;

   // Gravidade
   character.velocity.y += character.gravity * delta;

   // Verificação do chão (raycast para baixo)
   raycaster.set(characterPos, rayDirections.down);
   raycaster.far = character.height * 0.6;
   const downIntersects = raycaster.intersectObjects(collisionObjects);

   character.canJump = false;
   character.isOnGround = false;
   let onRamp = false;
   let rampNormal = new THREE.Vector3(0, 1, 0);

   if (downIntersects.length > 0 && downIntersects[0].distance <= character.height * 0.6) {
      const intersect = downIntersects[0];

      if (character.velocity.y <= 0.1 || intersect.object.userData.type === 'Ramp') {
         characterPos.y = intersect.point.y + (character.height * 0.5);
         character.velocity.y = 0;
         character.isOnGround = true;
         character.canJump = true;
      }

      if (intersect.object.userData.type === 'Ramp' && intersect.face) {
         onRamp = true;
         rampNormal = intersect.face.normal.clone();
      }
   }

   // Ajustes de movimento em rampa
   if (onRamp) {
      const angle = Math.acos(rampNormal.dot(new THREE.Vector3(0, 1, 0)));
      if (angle < Math.PI / 4) {
         const projectedMove = moveVector.clone().projectOnPlane(rampNormal);
         moveVector.copy(projectedMove);
         moveVector.y += Math.sin(angle) * character.speed * delta * 0.5;
      }
   }

   // Colisão horizontal
   const newPos = checkHorizontalCollision(characterPos, moveVector, character, collisionObjects);
   characterPos.copy(newPos);

   // Pulo
   if (character.jumpRequested && character.canJump) {
      character.velocity.y = character.jumpForce;
      character.canJump = false;
      character.isOnGround = false;
      character.jumpRequested = false;
   }

   // Gravidade (continua caindo se não estiver em rampa)
   if (!onRamp) {
      character.velocity.y += character.gravity * delta;
   }

   // Atualiza posição vertical
   characterPos.y += character.velocity.y * delta;
}

export { updateCharacter };
