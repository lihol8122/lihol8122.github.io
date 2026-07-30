(() => {
  'use strict';

  const canvas = document.querySelector('#game-board');
  const startButton = document.querySelector('#start-game');
  const pauseButton = document.querySelector('#pause-game');
  const restartButton = document.querySelector('#restart-game');
  const status = document.querySelector('#game-status');
  const scoreElement = document.querySelector('#score');
  const highScoreElement = document.querySelector('#high-score');
  const directionButtons = document.querySelectorAll('[data-direction]');

  if (!canvas || !startButton || !pauseButton || !restartButton || !status) return;

  const context = canvas.getContext('2d');
  const columns = 24;
  const rows = 16;
  const cellSize = canvas.width / columns;
  const tickRate = 150;
  const directions = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 }
  };
  const opposite = { up: 'down', down: 'up', left: 'right', right: 'left' };
  const startSnake = [{ x: 5, y: 8 }, { x: 4, y: 8 }, { x: 3, y: 8 }];
  let snake = [];
  let food = null;
  let obstacles = [];
  let direction = 'right';
  let nextDirection = 'right';
  let score = 0;
  let highScore = readHighScore();
  let timerId = null;
  let running = false;
  let paused = false;

  highScoreElement.textContent = String(highScore);
  drawBoard();

  function readHighScore() {
    try {
      return Number.parseInt(window.localStorage.getItem('hyunki-snake-high-score') || '0', 10) || 0;
    } catch (error) {
      return 0;
    }
  }

  function saveHighScore() {
    try {
      window.localStorage.setItem('hyunki-snake-high-score', String(highScore));
    } catch (error) {
      // Storage is optional; the current score still works for this session.
    }
  }

  function startGame() {
    stopTimer();
    snake = startSnake.map((cell) => ({ ...cell }));
    direction = 'right';
    nextDirection = 'right';
    score = 0;
    obstacles = generateObstacles();
    food = createFood();
    running = true;
    paused = false;
    updateScore();
    setControls(true);
    status.textContent = '게임 진행 중입니다.';
    timerId = window.setInterval(tick, tickRate);
    drawBoard();
  }

  function stopTimer() {
    if (timerId !== null) {
      window.clearInterval(timerId);
      timerId = null;
    }
  }

  function setControls(gameActive) {
    pauseButton.disabled = !gameActive;
    restartButton.disabled = !gameActive;
    startButton.disabled = gameActive;
    pauseButton.textContent = paused ? '계속하기' : '일시정지';
  }

  function tick() {
    if (!running || paused) return;
    direction = nextDirection;
    const vector = directions[direction];
    const head = snake[0];
    const nextHead = { x: head.x + vector.x, y: head.y + vector.y };
    const ateFood = sameCell(nextHead, food);
    const bodyToCheck = ateFood ? snake : snake.slice(0, -1);

    if (isOutside(nextHead) || contains(obstacles, nextHead) || contains(bodyToCheck, nextHead)) {
      endGame();
      return;
    }

    snake.unshift(nextHead);
    if (ateFood) {
      score += 1;
      if (score > highScore) {
        highScore = score;
        saveHighScore();
      }
      food = createFood();
      updateScore();
    } else {
      snake.pop();
    }
    drawBoard();
  }

  function endGame() {
    running = false;
    paused = false;
    stopTimer();
    setControls(false);
    startButton.disabled = false;
    status.textContent = `게임 오버입니다. 점수는 ${score}점입니다.`;
    drawBoard(true);
  }

  function updateScore() {
    scoreElement.textContent = String(score);
    highScoreElement.textContent = String(highScore);
  }

  function setDirection(requested) {
    if (!running || paused || !directions[requested] || requested === opposite[direction]) return;
    nextDirection = requested;
  }

  function generateObstacles() {
    const safe = new Set(snake.map((cell) => key(cell)));
    for (let x = 2; x <= 7; x += 1) safe.add(key({ x, y: 8 }));

    for (let attempt = 0; attempt < 100; attempt += 1) {
      const blocked = [];
      while (blocked.length < 18) {
        const candidate = { x: Math.floor(Math.random() * columns), y: Math.floor(Math.random() * rows) };
        if (!safe.has(key(candidate)) && !contains(blocked, candidate)) blocked.push(candidate);
      }
      if (hasReachableCell(blocked)) return blocked;
    }
    return [];
  }

  function createFood() {
    const available = [];
    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < columns; x += 1) {
        const cell = { x, y };
        if (!contains(snake, cell) && !contains(obstacles, cell) && hasPath(snake[0], cell, obstacles)) available.push(cell);
      }
    }
    return available.length ? available[Math.floor(Math.random() * available.length)] : null;
  }

  function hasReachableCell(blocked) {
    const candidate = { x: columns - 2, y: rows - 2 };
    return !contains(blocked, candidate) && hasPath(snake[0], candidate, blocked);
  }

  function hasPath(start, target, blocked) {
    if (!start || !target || contains(blocked, target)) return false;
    const queue = [start];
    const visited = new Set([key(start)]);
    while (queue.length) {
      const current = queue.shift();
      if (sameCell(current, target)) return true;
      for (const vector of Object.values(directions)) {
        const next = { x: current.x + vector.x, y: current.y + vector.y };
        const nextKey = key(next);
        if (!isOutside(next) && !visited.has(nextKey) && !contains(blocked, next)) {
          visited.add(nextKey);
          queue.push(next);
        }
      }
    }
    return false;
  }

  function drawBoard(gameOver = false) {
    context.fillStyle = '#1f211f';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = 'rgba(247, 247, 242, .08)';
    context.lineWidth = 1;
    for (let x = 0; x <= columns; x += 1) {
      context.beginPath();
      context.moveTo(x * cellSize, 0);
      context.lineTo(x * cellSize, canvas.height);
      context.stroke();
    }
    for (let y = 0; y <= rows; y += 1) {
      context.beginPath();
      context.moveTo(0, y * cellSize);
      context.lineTo(canvas.width, y * cellSize);
      context.stroke();
    }
    obstacles.forEach((cell) => drawCell(cell, '#68752f'));
    if (food) drawCell(food, '#c8e56a', true);
    snake.forEach((cell, index) => drawCell(cell, index === 0 ? '#f7f7f2' : '#b7ce5d'));
    if (gameOver) {
      context.fillStyle = 'rgba(31, 33, 31, .68)';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = '#f7f7f2';
      context.font = '700 22px Arial';
      context.textAlign = 'center';
      context.fillText('GAME OVER', canvas.width / 2, canvas.height / 2);
    }
  }

  function drawCell(cell, color, round = false) {
    const inset = 2;
    context.fillStyle = color;
    if (round) {
      context.beginPath();
      context.arc(cell.x * cellSize + cellSize / 2, cell.y * cellSize + cellSize / 2, cellSize / 3, 0, Math.PI * 2);
      context.fill();
    } else {
      context.fillRect(cell.x * cellSize + inset, cell.y * cellSize + inset, cellSize - inset * 2, cellSize - inset * 2);
    }
  }

  function isOutside(cell) {
    return cell.x < 0 || cell.x >= columns || cell.y < 0 || cell.y >= rows;
  }

  function contains(cells, target) {
    return cells.some((cell) => sameCell(cell, target));
  }

  function sameCell(first, second) {
    return Boolean(first && second && first.x === second.x && first.y === second.y);
  }

  function key(cell) {
    return `${cell.x},${cell.y}`;
  }

  startButton.addEventListener('click', startGame);
  restartButton.addEventListener('click', startGame);
  pauseButton.addEventListener('click', () => {
    if (!running) return;
    paused = !paused;
    pauseButton.textContent = paused ? '계속하기' : '일시정지';
    status.textContent = paused ? '일시정지 상태입니다.' : '게임 진행 중입니다.';
  });

  directionButtons.forEach((button) => {
    button.addEventListener('click', () => setDirection(button.dataset.direction));
  });

  document.addEventListener('keydown', (event) => {
    const keyMap = { ArrowUp: 'up', w: 'up', W: 'up', ArrowDown: 'down', s: 'down', S: 'down', ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right' };
    if (event.code === 'Space') {
      if (running) {
        event.preventDefault();
        pauseButton.click();
      }
      return;
    }
    const requested = keyMap[event.key];
    if (requested) {
      event.preventDefault();
      setDirection(requested);
    }
  });
})();
