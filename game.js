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
const gameArea = document.getElementById("game-area");
const endSection = document.getElementById("end-section");
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
  selectSection.classList.remove("hidden");
  statusEl.classList.add("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
});

resetCluesBtn.addEventListener("click", () => {
  localStorage.setItem(`clueIndex_${chosenPlayer}`, "0");
  playerClueIndex = 0;
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
let safeZoneFrames = 160; // cirka 2.5–3 sekunder
let pipeSpeed = 2.5;
let pipeWidth = 46;
let safeZoneRemaining = safeZoneFrames;

function setGameMode(active) {
  document.body.classList.toggle("game-active", active);
}

function startGameScreen() {
  setGameMode(true);
  selectSection.classList.add("hidden");
  endSection.classList.add("hidden");
  clueOverlay.classList.add("hidden");
  statusEl.classList.remove("hidden");
  gameArea.classList.remove("hidden");
  statusEl.innerHTML = `Aktiv spelare: <strong>${chosenPlayer}</strong> - nästa ledtråd: ${playerClueIndex + 1} av 3`;
  window.scrollTo({ top: 0, behavior: "smooth" });

  // Ladda bilden för fågeln
  birdImage.src = `images/${chosenPlayer.toLowerCase()}.png`;
  birdImage.onload = () => {
    startNewRun();
  };
  birdImage.onerror = () => {
    // Om bilden inte finns, använd standard gul cirkel
    startNewRun();
  };
}

function startNewRun() {
  score = 0;
  bird = { x: 90, y: 240, vy: 0, radius: 14 };
  pipes = [];
  pipeSpawnTimer = 0;
  safeZoneRemaining = safeZoneFrames;
  gameOver = false;
  gameRunning = true;
  clueOverlay.classList.add("hidden");
  endSection.classList.add("hidden");
  gameArea.classList.remove("hidden");
  statusEl.textContent = "Spelet har börjat! Säker zon i början - hoppa med mellanslag eller klick.";
  scoreText.textContent = `Poäng: ${score}`;
  requestAnimationFrame(gameLoop);
}

function showClue() {
  const clues = players[chosenPlayer];
  const clueIndex = Math.min(playerClueIndex, clues.length - 1);
  clueTextBig.textContent = `Ledtråd ${clueIndex + 1}: ${clues[clueIndex]}`;
  clueAvatar.src = `images/${chosenPlayer.toLowerCase()}.png`;
  clueOverlay.classList.remove("hidden");
  endSection.classList.add("hidden");
  gameArea.classList.add("hidden");

  if (playerClueIndex < clues.length - 1) {
    playerClueIndex += 1;
  }
  localStorage.setItem(`clueIndex_${chosenPlayer}`, playerClueIndex.toString());
  statusEl.innerHTML = `Senaste run färdig. Nästa ledtråd: ${Math.min(playerClueIndex + 1, clues.length)} av 3`;
}

function failRun(message) {
  gameOver = true;
  gameRunning = false;
  clueOverlay.classList.add("hidden");
  statusEl.textContent = message;
  endTitle.textContent = `Försök igen, ${chosenPlayer}`;
  clueText.textContent = "Du får ledtråd när du klarar banan. Försök igen!";
  endSection.classList.remove("hidden");
  gameArea.classList.add("hidden");
}

function completeRun() {
  gameOver = true;
  gameRunning = false;
  statusEl.textContent = "Grattis! Du avslutade banan och får en ledtråd.";
  showClue();
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
    if (score >= 5) {
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
    statusEl.textContent = `Spela på! Poäng: ${score}`;
    pipeSpawnTimer -= 1;
    if (pipeSpawnTimer <= 0) {
      const topHeight = Math.random() * (canvas.height - pipeGap - 140) + 40;
      pipes.push({ x: canvas.width, top: topHeight, width: pipeWidth });
      pipeSpawnTimer = 110;
    }

    pipes.forEach(pipe => {
      pipe.x -= pipeSpeed;
      if (!pipe.passed && pipe.x + pipe.width < bird.x) {
        pipe.passed = true;
        score += 1;
        scoreText.textContent = `Poäng: ${score}`;

        if (score >= 5) {
          completeRun();
        }
      }

      if (!gameOver && bird.x + bird.radius > pipe.x && bird.x - bird.radius < pipe.x + pipe.width) {
        if (bird.y - bird.radius < pipe.top || bird.y + bird.radius > pipe.top + pipeGap) {
          failRun("Du kraschade i ett påskrör! Försök igen.");
        }
      }
    });

    pipes = pipes.filter(pipe => pipe.x + pipe.width > -20);
  }
}

function drawFrame() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Himmel bakgrund
  const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  skyGradient.addColorStop(0, "#a9e1ff");
  skyGradient.addColorStop(1, "#9dd8a9");
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Mark
  ctx.fillStyle = "#76c043";
  ctx.fillRect(0, canvas.height - 50, canvas.width, 50);

  // Pipes
  pipes.forEach(pipe => {
    ctx.fillStyle = "#2c8c38";
    ctx.fillRect(pipe.x, 0, pipe.width, pipe.top);
    ctx.fillRect(pipe.x, pipe.top + pipeGap, pipe.width, canvas.height - pipe.top - pipeGap - 50);

    // ägg extra
    ctx.fillStyle = "#f7ff43";
    ctx.beginPath();
    ctx.ellipse(pipe.x + pipe.width / 2, pipe.top + pipeGap - 20, 8, 12, 0, 0, Math.PI * 2);
    ctx.fill();
  });

  // Bird
  if (birdImage.complete && birdImage.naturalHeight !== 0) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(bird.x, bird.y, 20, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(birdImage, bird.x - 20, bird.y - 20, 40, 40);
    ctx.restore();
  } else {
    // Fallback: gul cirkel om bilden inte laddas
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

function jump() {
  if (!gameRunning || gameOver) return;
  bird.vy = jumpForce;
}

window.addEventListener("keydown", (event) => {
  if (event.code === "Space") {
    event.preventDefault();
    if (!gameRunning || gameOver) return;
    jump();
  }
});

canvas.addEventListener("click", () => { jump(); });

clueOkBtn.addEventListener("click", () => {
  clueOverlay.classList.add("hidden");
  endSection.classList.remove("hidden");
  gameArea.classList.add("hidden");
  statusEl.textContent = `Bra jobbat, ${chosenPlayer}! Välj spela igen eller nytt barn.`;
});
