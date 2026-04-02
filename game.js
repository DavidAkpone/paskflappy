const players = {
  Adam: [
    "Fågel - *fisk* - mittimellan",
    "Temperatur",
    "Pringleslock"
  ],
  Isac: [
    "*Fågel* - fisk - mittimellan",
    "Öppna dörren",
    "Fläckar i tak"
  ],
  Leon: [
    "Fågel - fisk - *mittimellan*",
    "Öppna dörren",
    "Fläckar på lakan i en garderob"
  ]
};

let chosenPlayer = null;
let playerClueIndex = 0;
let gameRunning = false;
let gameOver = false;
let score = 0;

const selectSection = document.getElementById("select-section");
const statusEl = document.getElementById("status");
const clueListSection = document.getElementById("clue-list-section");
const clueList = document.getElementById("clueList");
const gameArea = document.getElementById("game-area");
const endSection = document.getElementById("end-section");
const endAvatar = document.getElementById("endAvatar");
const endTitle = document.getElementById("endTitle");
const clueText = document.getElementById("clueText");
const clueOverlay = document.getElementById("clueOverlay");
const clueTextBig = document.getElementById("clueTextBig");
const clueOkBtn = document.getElementById("clueOkBtn");
const clueAvatar = document.getElementById("clueAvatar");
const restartBtn = document.getElementById("restartBtn");
const changePlayerBtn = document.getElementById("changePlayerBtn");
const resetCluesBtn = document.getElementById("resetCluesBtn");
const scoreText = document.getElementById("scoreText");
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let birdImage = new Image();
const eggImagePaths = [
  "images/bla.png",
  "images/blarod.png",
  "images/Gult.png",
  "images/lila.png",
  "images/rodgul.png",
  "images/rodstripes.png"
];
const eggImages = eggImagePaths.map(path => {
  const image = new Image();
  image.src = path;
  return image;
});

const playerImagePaths = {
  Adam: "images/adam.png",
  Isac: "images/i.png",
  Leon: "images/leon.png"
};

const targetScore = 5;

const playerButtons = Array.from(document.getElementsByClassName("player-btn"));
playerButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    chosenPlayer = btn.dataset.player;
    playerClueIndex = parseInt(localStorage.getItem(`clueIndex_${chosenPlayer}`) || "0", 10);
    startGameScreen();
  });
});

restartBtn.addEventListener("click", () => startNewRun());

changePlayerBtn.addEventListener("click", () => {
  setGameMode(false);
  endSection.classList.add("hidden");
  clueListSection.classList.add("hidden");
  endAvatar.classList.add("hidden");
  selectSection.classList.remove("hidden");
  statusEl.classList.add("hidden");
  scrollToSection(selectSection);
});

resetCluesBtn.addEventListener("click", () => {
  localStorage.setItem(`clueIndex_${chosenPlayer}`, "0");
  playerClueIndex = 0;
  endAvatar.classList.add("hidden");
  renderClueList();
  statusEl.textContent = `Ledtrådar för ${chosenPlayer} har startats om.`;
  endTitle.textContent = "Återställt!";
  clueText.textContent = "Nu börjar ledtrådarna från början för detta barn.";
});

let bird = { x: 90, y: 240, vy: 0, radius: 14 };
let gravity = 0.38;
let jumpForce = -7.5;
let pipes = [];
let pipeSpawnTimer = 0;
let pipeGap = 200;
let safeZoneFrames = 160;
let pipeSpeed = 2.5;
let pipeWidth = 46;
let safeZoneRemaining = safeZoneFrames;

function setGameMode(active) {
  document.body.classList.toggle("game-active", active);
}

function getPlayerImagePath(player) {
  return playerImagePaths[player] || `images/${player.toLowerCase()}.png`;
}

function scrollToSection(element) {
  requestAnimationFrame(() => {
    element.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function getNextClueText() {
  const clueCount = players[chosenPlayer].length;
  if (playerClueIndex >= clueCount) {
    return `alla ${clueCount} av ${clueCount} hittade`;
  }

  return `${playerClueIndex + 1} av ${clueCount}`;
}

function renderClueList() {
  if (!chosenPlayer) {
    clueListSection.classList.add("hidden");
    clueList.innerHTML = "";
    return;
  }

  const clues = players[chosenPlayer];
  const unlockedCount = Math.min(playerClueIndex, clues.length);
  clueList.innerHTML = "";

  if (unlockedCount === 0) {
    const emptyItem = document.createElement("li");
    emptyItem.className = "clue-list-empty";
    emptyItem.textContent = "Inga ledtrådar ännu. Klara banan för att samla din första.";
    clueList.appendChild(emptyItem);
  } else {
    clues.slice(0, unlockedCount).forEach((clue, index) => {
      const item = document.createElement("li");
      item.textContent = `Ledtråd ${index + 1}: ${clue}`;
      clueList.appendChild(item);
    });
  }

  clueListSection.classList.remove("hidden");
}

function startGameScreen() {
  setGameMode(true);
  selectSection.classList.add("hidden");
  endSection.classList.add("hidden");
  clueOverlay.classList.add("hidden");
  endAvatar.classList.add("hidden");
  statusEl.classList.remove("hidden");
  gameArea.classList.remove("hidden");
  statusEl.innerHTML = `Aktiv spelare: <strong>${chosenPlayer}</strong> - nästa ledtråd: ${getNextClueText()}`;
  renderClueList();
  scrollToSection(gameArea);

  birdImage.src = getPlayerImagePath(chosenPlayer);
  birdImage.onload = () => {
    startNewRun();
  };
  birdImage.onerror = () => {
    startNewRun();
  };
}

function startNewRun() {
  setGameMode(true);
  score = 0;
  bird = { x: 90, y: 240, vy: 0, radius: 14 };
  pipes = [];
  pipeSpawnTimer = 0;
  safeZoneRemaining = safeZoneFrames;
  gameOver = false;
  gameRunning = true;
  clueOverlay.classList.add("hidden");
  endSection.classList.add("hidden");
  endAvatar.classList.add("hidden");
  clueListSection.classList.remove("hidden");
  gameArea.classList.remove("hidden");
  statusEl.textContent = "Spelet har börjat! Säker zon i början - hoppa med mellanslag eller klick.";
  scoreText.textContent = `Poäng: ${score}`;
  scrollToSection(gameArea);
  requestAnimationFrame(gameLoop);
}

function showClue() {
  setGameMode(false);
  const clues = players[chosenPlayer];
  const clueIndex = Math.min(playerClueIndex, clues.length - 1);
  clueTextBig.textContent = `Ledtråd ${clueIndex + 1}: ${clues[clueIndex]}`;
  clueAvatar.src = getPlayerImagePath(chosenPlayer);
  clueOverlay.classList.remove("hidden");
  endSection.classList.add("hidden");
  gameArea.classList.add("hidden");

  if (playerClueIndex < clues.length) {
    playerClueIndex += 1;
  }

  localStorage.setItem(`clueIndex_${chosenPlayer}`, playerClueIndex.toString());
  renderClueList();
  statusEl.innerHTML = `Senaste run färdig. Nästa ledtråd: ${getNextClueText()}`;
}

function failRun(message) {
  gameOver = true;
  gameRunning = false;
  setGameMode(false);
  clueOverlay.classList.add("hidden");
  endAvatar.classList.add("hidden");
  statusEl.textContent = message;
  endTitle.textContent = `Försök igen, ${chosenPlayer}`;
  clueText.textContent = "Du får ledtråd när du klarar banan. Försök igen!";
  endSection.classList.remove("hidden");
  gameArea.classList.add("hidden");
  scrollToSection(statusEl);
}

function completeRun() {
  gameOver = true;
  gameRunning = false;
  setGameMode(false);
  statusEl.textContent = "Grattis! Du avslutade banan och får en ledtråd.";
  showClue();
}

function hasGoalPipe() {
  return pipes.some(pipe => pipe.isGoal && !pipe.passed);
}

function gameLoop() {
  if (!gameRunning || gameOver) return;

  updatePhysics();
  drawFrame();

  if (!gameOver) {
    requestAnimationFrame(gameLoop);
  }
}

function updatePhysics() {
  bird.vy += gravity;
  bird.y += bird.vy;

  if (bird.y + bird.radius > canvas.height) {
    bird.y = canvas.height - bird.radius;
    if (score >= targetScore) {
      completeRun();
    } else {
      failRun("Du kraschade i marken! Försök igen.");
    }
    return;
  }

  if (bird.y - bird.radius < 0) {
    bird.y = bird.radius;
    bird.vy = 0;
  }

  if (safeZoneRemaining > 0) {
    safeZoneRemaining -= 1;
    const secLeft = Math.ceil(safeZoneRemaining / 60);
    statusEl.textContent = `Säker zon: inga rör just nu. Klar om ${secLeft}s`;
  } else {
    statusEl.textContent = score === targetScore - 1
      ? "Sista hindret! Flyg genom målet."
      : `Spela på! Poäng: ${score}`;

    pipeSpawnTimer -= 1;
    if (pipeSpawnTimer <= 0 && !hasGoalPipe()) {
      const topHeight = Math.random() * (canvas.height - pipeGap - 140) + 40;
      pipes.push({
        x: canvas.width,
        top: topHeight,
        width: pipeWidth,
        isGoal: score === targetScore - 1
      });
      pipeSpawnTimer = 110;
    }

    pipes.forEach(pipe => {
      pipe.x -= pipeSpeed;
      if (!pipe.passed && pipe.x + pipe.width < bird.x) {
        pipe.passed = true;
        score += 1;
        scoreText.textContent = `Poäng: ${score}`;

        if (pipe.isGoal || score >= targetScore) {
          completeRun();
        }
      }

      if (!gameOver && bird.x + bird.radius > pipe.x && bird.x - bird.radius < pipe.x + pipe.width) {
        if (bird.y - bird.radius < pipe.top || bird.y + bird.radius > pipe.top + pipeGap) {
          failRun(pipe.isGoal ? "Du missade målet! Försök igen." : "Du kraschade i ett påskrör! Försök igen.");
        }
      }
    });

    pipes = pipes.filter(pipe => pipe.x + pipe.width > -20);
  }
}

function drawFrame() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  skyGradient.addColorStop(0, "#a9e1ff");
  skyGradient.addColorStop(1, "#9dd8a9");
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#76c043";
  ctx.fillRect(0, canvas.height - 50, canvas.width, 50);

  pipes.forEach(pipe => {
    if (pipe.isGoal) {
      drawGoalPipe(pipe);
    } else {
      drawEggPipe(pipe.x, 0, pipe.width, pipe.top);
      drawEggPipe(
        pipe.x,
        pipe.top + pipeGap,
        pipe.width,
        canvas.height - pipe.top - pipeGap - 50
      );
    }
  });

  if (birdImage.complete && birdImage.naturalHeight !== 0) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(bird.x, bird.y, 20, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(birdImage, bird.x - 20, bird.y - 20, 40, 40);
    ctx.restore();
  } else {
    ctx.fillStyle = "#ffea00";
    ctx.beginPath();
    ctx.arc(bird.x, bird.y, bird.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#333";
    ctx.beginPath();
    ctx.arc(bird.x + 8, bird.y - 4, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#555";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(bird.x + 3, bird.y + 2, 4, 0.4, 1.8);
    ctx.stroke();
  }
}

function drawEggPipe(x, y, width, height) {
  if (height <= 0) return;

  const loadedEggImages = eggImages.filter(image => image.complete && image.naturalWidth > 0);
  if (loadedEggImages.length === 0) {
    ctx.fillStyle = "#f7d84b";
    ctx.fillRect(x, y, width, height);
    return;
  }

  const eggSize = Math.max(width + 10, 54);
  const columns = Math.max(1, Math.ceil(width / (eggSize * 0.72)));
  const horizontalStep = columns === 1 ? 0 : (width - eggSize) / (columns - 1);

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, width, height);
  ctx.clip();

  let row = 0;
  for (let eggY = y - eggSize * 0.15; eggY < y + height; eggY += eggSize * 0.78) {
    for (let column = 0; column < columns; column += 1) {
      const eggImage = loadedEggImages[(row + column) % loadedEggImages.length];
      const baseX = columns === 1 ? x + (width - eggSize) / 2 : x + column * horizontalStep;
      const offsetX = row % 2 === 0 ? 0 : Math.min(8, width * 0.08);
      ctx.drawImage(eggImage, baseX + offsetX, eggY, eggSize, eggSize);
    }
    row += 1;
  }

  ctx.restore();
}

function drawGoalPipe(pipe) {
  drawEggPipe(pipe.x, 0, pipe.width, pipe.top);
  drawEggPipe(
    pipe.x,
    pipe.top + pipeGap,
    pipe.width,
    canvas.height - pipe.top - pipeGap - 50
  );

  const bannerTop = Math.max(18, pipe.top + 18);
  const bannerBottom = Math.min(canvas.height - 68, pipe.top + pipeGap - 18);
  const centerY = (bannerTop + bannerBottom) / 2;

  ctx.save();

  ctx.fillStyle = "rgba(255, 234, 130, 0.25)";
  ctx.fillRect(pipe.x - 22, bannerTop - 20, pipe.width + 44, bannerBottom - bannerTop + 40);

  ctx.fillStyle = "#ffe066";
  ctx.fillRect(pipe.x - 10, bannerTop, pipe.width + 20, 12);
  ctx.fillRect(pipe.x - 10, bannerBottom - 12, pipe.width + 20, 12);

  ctx.strokeStyle = "#b47d00";
  ctx.lineWidth = 3;
  ctx.strokeRect(pipe.x - 10, bannerTop, pipe.width + 20, 12);
  ctx.strokeRect(pipe.x - 10, bannerBottom - 12, pipe.width + 20, 12);

  ctx.fillStyle = "#d94f2b";
  ctx.fillRect(pipe.x + pipe.width / 2 - 4, bannerTop + 12, 8, bannerBottom - bannerTop - 24);

  ctx.font = "bold 18px Segoe UI";
  ctx.textAlign = "center";
  ctx.lineWidth = 4;
  ctx.strokeStyle = "rgba(91, 54, 0, 0.4)";
  ctx.strokeText("MÅL", pipe.x + pipe.width / 2, centerY + 6);
  ctx.fillStyle = "#fff8dc";
  ctx.fillText("MÅL", pipe.x + pipe.width / 2, centerY + 6);

  ctx.restore();
}

function jump() {
  if (!gameRunning || gameOver) return;
  bird.vy = jumpForce;
}

window.addEventListener("keydown", event => {
  if (event.code === "Space") {
    event.preventDefault();
    if (!gameRunning || gameOver) return;
    jump();
  }
});

canvas.addEventListener("click", () => {
  jump();
});

clueOkBtn.addEventListener("click", () => {
  setGameMode(false);
  clueOverlay.classList.add("hidden");
  endSection.classList.remove("hidden");
  gameArea.classList.add("hidden");
  endAvatar.src = getPlayerImagePath(chosenPlayer);
  endAvatar.classList.remove("hidden");
  statusEl.textContent = `Bra jobbat, ${chosenPlayer}! Välj spela igen eller nytt barn.`;
  scrollToSection(statusEl);
});
