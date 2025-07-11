document.addEventListener('DOMContentLoaded', () => {
  const inputMapSize = document.getElementById('input-map-size');
  const inputNumPits = document.getElementById('input-num-pits');
  const inputNumWumpus = document.getElementById('input-num-wumpus');
  const inputArrows = document.getElementById('input-arrows');
  const inputMoves = document.getElementById('input-moves');

  const startBtn = document.getElementById('start-btn');
  const clearScoreBtn = document.getElementById('clear-score-btn');
  const backBtn = document.getElementById('back-btn');
  const resetBtn = document.getElementById('reset');
  const moveBtns = {
    up: document.getElementById('move-up'),
    left: document.getElementById('move-left'),
    right: document.getElementById('move-right'),
    down: document.getElementById('move-down'),
  };
  const shootBtn = document.getElementById('shoot');

  const startScreen = document.getElementById('start-screen');
  const gameScreen = document.getElementById('game-screen');
  const gameBoard = document.getElementById('game-board');
  const scoreGold = document.getElementById('gold-count');
  const scorePit = document.getElementById('pit-count');
  const scoreDev = document.getElementById('devoured-count');
  const arrowCount = document.getElementById('arrow-count');
  const moveCount = document.getElementById('move-count');
  const perceptsDisplay = document.getElementById('percepts');
  const statusMessage = document.getElementById('status-message');

  let mapSize, numPits, numWumpus, arrows, maxMoves, moveCounter;
  let agentPosition, wumpusPositions = [], pitPositions = [], goldPosition;
  let gameOver = false;
  let cntGold = 0, cntPit = 0, cntDevored = 0;

  document.querySelectorAll('.spin-btn').forEach(btn => {
    btn.addEventListener('mousedown', () => {
      const input = document.getElementById('input-' + btn.dataset.target);
      const step = btn.dataset.dir === 'up' ? +input.step || 1 : -(+input.step || 1);
      input.value = Math.min(input.max, Math.max(input.min, +input.value + step));
    });
  });

  clearScoreBtn.addEventListener('click', () => {
    localStorage.removeItem('cntGold');
    localStorage.removeItem('cntPit');
    localStorage.removeItem('cntDevoured');
    cntGold = cntPit = cntDevored = 0;
    updateScoreboard();
  });

  function loadScores() {
    cntGold = +localStorage.getItem('cntGold') || 0;
    cntPit = +localStorage.getItem('cntPit') || 0;
    cntDevored = +localStorage.getItem('cntDevoured') || 0;
    updateScoreboard();
  }

  function saveScores() {
    localStorage.setItem('cntGold', cntGold);
    localStorage.setItem('cntPit', cntPit);
    localStorage.setItem('cntDevoured', cntDevored);
  }

  function updateScoreboard() {
    scoreGold.textContent = cntGold;
    scorePit.textContent = cntPit;
    scoreDev.textContent = cntDevored;
  }

  function updateCounters() {
    arrowCount.textContent = `Flechas: ${arrows}`;
    moveCount.textContent = `Mov.: ${moveCounter}/${maxMoves}`;
  }

  function createBoard() {
    gameBoard.innerHTML = '';
    gameBoard.style.gridTemplateColumns = `repeat(${mapSize}, 50px)`;
    for (let y = 0; y < mapSize; y++) {
      for (let x = 0; x < mapSize; x++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.x = x;
        cell.dataset.y = y;
        gameBoard.appendChild(cell);
      }
    }
  }

  function placeEntities() {
    wumpusPositions = [];
    pitPositions = [];
    for (let i = 0; i < numWumpus; i++) {
      let pos;
      do {
        pos = { x: Math.floor(Math.random() * mapSize), y: Math.floor(Math.random() * mapSize) };
      } while ((pos.x === 0 && pos.y === 0) || wumpusPositions.some(w => w.x === pos.x && w.y === pos.y));
      wumpusPositions.push(pos);
    }

    for (let i = 0; i < numPits; i++) {
      let pos;
      do {
        pos = { x: Math.floor(Math.random() * mapSize), y: Math.floor(Math.random() * mapSize) };
      } while ((pos.x === 0 && pos.y === 0) || pitPositions.some(p => p.x === pos.x && p.y === pos.y));
      pitPositions.push(pos);
    }

    do {
      goldPosition = { x: Math.floor(Math.random() * mapSize), y: Math.floor(Math.random() * mapSize) };
    } while (
      (goldPosition.x === 0 && goldPosition.y === 0) ||
      wumpusPositions.some(w => w.x === goldPosition.x && w.y === goldPosition.y) ||
      pitPositions.some(p => p.x === goldPosition.x && p.y === goldPosition.y)
    );
  }

  function clearBoard() {
    document.querySelectorAll('.cell').forEach(cell => {
      cell.style.backgroundImage = '';
      cell.replaceChildren();
    });
  }

  function updateBoard() {
    clearBoard();
    const img = new Image();
    img.src = 'assets/agent.png';
    img.alt = 'Agente';
    const { x, y } = agentPosition;
    const cell = document.querySelector(`.cell[data-x="${x}"][data-y="${y}"]`);
    if (cell) cell.appendChild(img);
  }

  function revealAll() {
    document.querySelectorAll('.cell').forEach(cell => {
      const x = +cell.dataset.x;
      const y = +cell.dataset.y;
      if (wumpusPositions.some(w => w.x === x && w.y === y)) {
        cell.style.backgroundImage = 'url("assets/wumpus.png")';
      } else if (pitPositions.some(p => p.x === x && p.y === y)) {
        cell.style.backgroundImage = 'url("assets/pit.png")';
      } else if (goldPosition.x === x && goldPosition.y === y) {
        cell.style.backgroundImage = 'url("assets/gold.png")';
      }
    });
  }

  function isAdjacentTo(x, y, list) {
    return list.some(p => Math.abs(p.x - x) + Math.abs(p.y - y) === 1);
  }

  function updatePercepts() {
    const { x, y } = agentPosition;
    const per = [];
    if (isAdjacentTo(x, y, wumpusPositions)) per.push('Fedor');
    if (isAdjacentTo(x, y, pitPositions)) per.push('Brisa');
    if (isAdjacentTo(x, y, [goldPosition])) per.push('Brilho!');
    perceptsDisplay.textContent = per.join(' • ') || 'Nada perceptível';
  }

  function checkCell() {
    const { x, y } = agentPosition;
    let end = false;

    if (wumpusPositions.some(w => w.x === x && w.y === y)) {
      statusMessage.textContent = 'Você foi devorado pelo Wumpus!';
      cntDevored++;
      end = true;
    } else if (pitPositions.some(p => p.x === x && p.y === y)) {
      statusMessage.textContent = 'Você caiu em um poço!';
      cntPit++;
      end = true;
    } else if (goldPosition.x === x && goldPosition.y === y) {
      statusMessage.textContent = 'Você encontrou o ouro!';
      cntGold++;
      end = true;
    }

    if (end) {
      gameOver = true;
      saveScores();
      updateScoreboard();
      revealAll();
    }
    updatePercepts();
  }

  function moveAgent(dx, dy) {
    if (gameOver) return;
    const nx = agentPosition.x + dx;
    const ny = agentPosition.y + dy;
    if (nx >= 0 && nx < mapSize && ny >= 0 && ny < mapSize) {
      agentPosition = { x: nx, y: ny };
      moveCounter++;
      updateCounters();
      updateBoard();
      checkCell();
      if (!gameOver && moveCounter >= maxMoves) {
        statusMessage.textContent = 'Limite de movimentos alcançado!';
        gameOver = true;
        revealAll();
      }
    }
  }

  function shootArrow() {
    if (gameOver) return alert('O jogo acabou!');
    if (arrows <= 0) return alert('Sem flechas!');
    arrows--;
    updateCounters();
    const dir = prompt('Direção: cima/baixo/esquerda/direita');
    const deltas = {
      cima: { dx: 0, dy: -1 },
      baixo: { dx: 0, dy: 1 },
      esquerda: { dx: -1, dy: 0 },
      direita: { dx: 1, dy: 0 },   
    };
    const d = deltas[dir.toLowerCase()];
    if (!d) return alert('Direção inválida!');
    let { x, y } = agentPosition;
    while (x >= 0 && x < mapSize && y >= 0 && y < mapSize) {
      if (wumpusPositions.some(w => w.x === x && w.y === y)) {
        alert('Wumpus morto!');
        wumpusPositions = wumpusPositions.filter(w => !(w.x === x && w.y === y));
        updateBoard();
        return;
      }
      x += d.dx;
      y += d.dy;
    }
    alert('Flecha não atingiu nada!');
  }

  function resetGame() {
    agentPosition = { x: 0, y: 0 };
    moveCounter = 0;
    gameOver = false;
    createBoard();
    placeEntities();
    updateBoard();
    updatePercepts();
    updateCounters();
    statusMessage.textContent = '';
  }

  startBtn.addEventListener('click', () => {
    mapSize = +inputMapSize.value;
    numPits = +inputNumPits.value;
    numWumpus = +inputNumWumpus.value;
    arrows = +inputArrows.value;
    maxMoves = +inputMoves.value;

    if (mapSize < 3 || numPits + numWumpus > mapSize * mapSize - 1) {
      return alert('Configuração inválida');
    }

    loadScores();
    resetGame();
    startScreen.hidden = true;
    gameScreen.hidden = false;
  });

  backBtn.addEventListener('click', () => {
    gameScreen.hidden = true;
    startScreen.hidden = false;
  });

  Object.entries(moveBtns).forEach(([dir, btn]) => {
    btn.addEventListener('click', () => {
      const deltas = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
      moveAgent(...deltas[dir]);
    });
  });
  shootBtn.addEventListener('click', shootArrow);
  resetBtn.addEventListener('click', resetGame);

  // Bloquear zoom por toque duplo
  document.addEventListener('dblclick', e => e.preventDefault(), { passive: false });
  let lastTouchEnd = 0;
  document.addEventListener('touchend', e => {
    const now = Date.now();
    if (now - lastTouchEnd < 300) e.preventDefault();
    lastTouchEnd = now;
  }, { passive: false });
  
});
