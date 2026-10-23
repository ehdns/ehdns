const canvas = document.getElementById("game-canvas");
const context = canvas.getContext("2d");
const scoreOutput = document.getElementById("score");
const livesOutput = document.getElementById("lives");
const levelOutput = document.getElementById("level");
const overlay = document.getElementById("game-overlay");
const overlayTitle = document.getElementById("overlay-title");
const overlayMessage = document.getElementById("overlay-message");
const startButton = document.getElementById("start-button");

const width = canvas.width;
const height = canvas.height;
const keys = new Set();
const touchControls = new Set();
const stars = Array.from({ length: 80 }, () => ({
  x: Math.random() * width,
  y: Math.random() * height,
  size: 1 + Math.random() * 2,
  speed: 25 + Math.random() * 70
}));

const player = {
  x: width / 2,
  y: height - 70,
  radius: 16,
  speed: 260,
  cooldown: 0,
  invulnerable: 0
};

let shots = [];
let enemyShots = [];
let enemies = [];
let score = 0;
let lives = 3;
let spawnTimer = 0;
let gameState = "ready";
let lastFrameTime = 0;
let canvasPointerId = null;

function currentDifficultyLevel() {
  return Math.min(2, Math.floor(score / 500));
}

const difficultyNames = ["쉬움", "중간", "어려움"];
const enemySpawnIntervals = [1.05, 0.8, 0.6];

function currentSpeedMultiplier() {
  return [1, 1.25, 1.5][currentDifficultyLevel()];
}

function updateDifficultyDisplay() {
  levelOutput.value = difficultyNames[currentDifficultyLevel()];
}

function damagePlayer() {
  if (player.invulnerable > 0) return;

  lives -= 1;
  livesOutput.value = String(lives);
  player.invulnerable = 1.2;
  if (lives <= 0) {
    finishGame();
  }
}

function movePlayerToPointer(event) {
  const bounds = canvas.getBoundingClientRect();
  const x = (event.clientX - bounds.left) * width / bounds.width;
  const y = (event.clientY - bounds.top) * height / bounds.height;

  player.x = Math.max(player.radius, Math.min(width - player.radius, x));
  player.y = Math.max(height * 0.48, Math.min(height - player.radius - 8, y));
}

function startGame() {
  keys.clear();
  touchControls.clear();
  canvasPointerId = null;
  score = 0;
  lives = 3;
  spawnTimer = 0.5;
  shots = [];
  enemyShots = [];
  enemies = [];
  player.x = width / 2;
  player.y = height - 70;
  player.cooldown = 0;
  player.invulnerable = 0;
  scoreOutput.value = "0";
  livesOutput.value = "3";
  updateDifficultyDisplay();
  gameState = "playing";
  overlay.hidden = true;
  lastFrameTime = performance.now();
  requestAnimationFrame(gameLoop);
}

function finishGame() {
  gameState = "over";
  overlayTitle.textContent = "순찰 종료!";
  overlayMessage.textContent = `최종 점수는 ${score}점입니다. 다시 출격해 볼까요?`;
  startButton.textContent = "다시 시작";
  overlay.hidden = false;
}

function drawShip(x, y, size, color, facingUp = true) {
  context.save();
  context.translate(x, y);
  if (!facingUp) {
    context.rotate(Math.PI);
  }
  context.fillStyle = color;
  context.beginPath();
  context.moveTo(0, -size);
  context.lineTo(size * 0.75, size);
  context.lineTo(0, size * 0.55);
  context.lineTo(-size * 0.75, size);
  context.closePath();
  context.fill();
  context.restore();
}

function drawBackground(deltaTime) {
  context.fillStyle = "#050b16";
  context.fillRect(0, 0, width, height);

  for (const star of stars) {
    star.y += star.speed * deltaTime;
    if (star.y > height) {
      star.y = 0;
      star.x = Math.random() * width;
    }

    context.fillStyle = `rgba(190, 220, 255, ${0.35 + star.size * 0.2})`;
    context.fillRect(star.x, star.y, star.size, star.size);
  }
}

function spawnEnemy() {
  const x = 34 + Math.random() * (width - 68);
  enemies.push({
    x,
    baseX: x,
    y: -30,
    radius: 17,
    speed: (70 + Math.random() * 35) * currentSpeedMultiplier(),
    wave: Math.random() * Math.PI * 2,
    fireTimer: 1 + Math.random() * 1.5
  });
}

function updateGame(deltaTime) {
  const moveLeft = keys.has("ArrowLeft") || keys.has("a") || touchControls.has("left");
  const moveRight = keys.has("ArrowRight") || keys.has("d") || touchControls.has("right");
  const moveUp = keys.has("ArrowUp") || keys.has("w") || touchControls.has("up");
  const moveDown = keys.has("ArrowDown") || keys.has("s") || touchControls.has("down");

  if (moveLeft) player.x -= player.speed * deltaTime;
  if (moveRight) player.x += player.speed * deltaTime;
  if (moveUp) player.y -= player.speed * deltaTime;
  if (moveDown) player.y += player.speed * deltaTime;

  player.x = Math.max(player.radius, Math.min(width - player.radius, player.x));
  player.y = Math.max(height * 0.48, Math.min(height - player.radius - 8, player.y));
  player.cooldown -= deltaTime;
  player.invulnerable = Math.max(0, player.invulnerable - deltaTime);

  if ((keys.has(" ") || touchControls.has("fire")) && player.cooldown <= 0) {
    shots.push({ x: player.x, y: player.y - 20, speed: 420 });
    player.cooldown = 0.2;
  }

  spawnTimer -= deltaTime;
  if (spawnTimer <= 0) {
    spawnEnemy();
    spawnTimer = enemySpawnIntervals[currentDifficultyLevel()];
  }

  for (const enemy of enemies) {
    enemy.y += enemy.speed * deltaTime;
    enemy.x = enemy.baseX + Math.sin(enemy.y / 48 + enemy.wave) * 34;

    if (enemy.y - enemy.radius > height) {
      enemy.removed = true;
      damagePlayer();
      if (gameState !== "playing") return;
      continue;
    }

    enemy.fireTimer -= deltaTime;

    if (enemy.fireTimer <= 0) {
      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const distance = Math.hypot(dx, dy) || 1;
      enemyShots.push({
        x: enemy.x,
        y: enemy.y + 12,
        vx: dx / distance * 145,
        vy: dy / distance * 145
      });
      enemy.fireTimer = 1.4 + Math.random() * 1.2;
    }
  }

  for (const shot of shots) {
    shot.y -= shot.speed * deltaTime;
  }
  for (const shot of enemyShots) {
    shot.x += shot.vx * deltaTime;
    shot.y += shot.vy * deltaTime;
  }

  for (const shot of shots) {
    if (shot.removed) continue;
    for (const enemy of enemies) {
      if (enemy.removed) continue;
      if (Math.hypot(shot.x - enemy.x, shot.y - enemy.y) < enemy.radius + 5) {
        shot.removed = true;
        enemy.removed = true;
        score += 100;
        scoreOutput.value = String(score);
        updateDifficultyDisplay();
        break;
      }
    }
  }

  for (const shot of enemyShots) {
    if (Math.hypot(shot.x - player.x, shot.y - player.y) < player.radius + 7) {
      shot.removed = true;
      damagePlayer();
      if (gameState !== "playing") {
        return;
      }
    }
  }

  shots = shots.filter(shot => !shot.removed && shot.y > -12);
  enemyShots = enemyShots.filter(shot =>
    !shot.removed && shot.y < height + 12 && shot.x > -12 && shot.x < width + 12
  );
  enemies = enemies.filter(enemy => !enemy.removed && enemy.y < height + 30);
}

function drawGame() {
  for (const shot of shots) {
    context.fillStyle = "#ffe082";
    context.fillRect(shot.x - 3, shot.y - 10, 6, 15);
  }

  for (const shot of enemyShots) {
    context.fillStyle = "#ff6b6b";
    context.beginPath();
    context.arc(shot.x, shot.y, 5, 0, Math.PI * 2);
    context.fill();
  }

  for (const enemy of enemies) {
    drawShip(enemy.x, enemy.y, enemy.radius, "#ff6685", false);
  }

  if (player.invulnerable === 0 || Math.floor(player.invulnerable * 12) % 2 === 0) {
    drawShip(player.x, player.y, player.radius, "#68e1fd");
  }
}

function gameLoop(now) {
  if (gameState !== "playing") return;

  const deltaTime = Math.min((now - lastFrameTime) / 1000, 0.04);
  lastFrameTime = now;
  drawBackground(deltaTime);
  updateGame(deltaTime);

  if (gameState === "playing") {
    drawGame();
    requestAnimationFrame(gameLoop);
  }
}

function setControl(buttonId, controlName) {
  const button = document.getElementById(buttonId);

  button.addEventListener("pointerdown", event => {
    event.preventDefault();
    touchControls.add(controlName);
    button.setPointerCapture(event.pointerId);
  });

  const release = event => {
    event.preventDefault();
    touchControls.delete(controlName);
  };
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("lostpointercapture", () => touchControls.delete(controlName));
  button.addEventListener("contextmenu", event => event.preventDefault());
}

canvas.addEventListener("pointerdown", event => {
  if (gameState !== "playing") return;

  event.preventDefault();
  canvasPointerId = event.pointerId;
  movePlayerToPointer(event);
  touchControls.add("fire");
  canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener("pointermove", event => {
  if (event.pointerId === canvasPointerId && gameState === "playing") {
    event.preventDefault();
    movePlayerToPointer(event);
  }
});

function releaseCanvasPointer(event) {
  if (event.pointerId !== canvasPointerId) return;

  canvasPointerId = null;
  touchControls.delete("fire");
}

canvas.addEventListener("pointerup", releaseCanvasPointer);
canvas.addEventListener("pointercancel", releaseCanvasPointer);
canvas.addEventListener("lostpointercapture", releaseCanvasPointer);

startButton.addEventListener("click", startGame);

document.addEventListener("keydown", event => {
  if (event.target instanceof HTMLElement && event.target.closest("button")) {
    return;
  }

  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].includes(key)) {
    event.preventDefault();
  }
  keys.add(key);
});

document.addEventListener("keyup", event => {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  keys.delete(key);
});

window.addEventListener("blur", () => {
  keys.clear();
  touchControls.clear();
});

setControl("move-left", "left");
setControl("move-right", "right");
setControl("move-up", "up");
setControl("move-down", "down");
setControl("fire-button", "fire");

drawBackground(0);
