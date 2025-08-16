import * as THREE from 'three';

export const manager = new THREE.LoadingManager();

// botão que vai iniciar o jogo
const startButton = document.getElementById("start-button");

// chamado quando tudo terminou de carregar
manager.onLoad = function () {
  console.log("✅ Todos os recursos carregados!");
  startButton.style.display = "inline-block"; // mostra o botão
};

// chamado a cada progresso
manager.onProgress = function (url, itemsLoaded, itemsTotal) {
  console.log(`Progresso: ${itemsLoaded} de ${itemsTotal} (${url})`);
};

// chamado em caso de erro
manager.onError = function (url) {
  console.error("Erro ao carregar " + url);
};

