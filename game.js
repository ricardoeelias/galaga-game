const canvas = document.querySelector('#game');
const ctx = canvas.getContext('2d');
const titleScreen = document.querySelector('#title-screen');
const gameOver = document.querySelector('#game-over');
const pauseScreen = document.querySelector('#pause-screen');
const finalScore = document.querySelector('#final-score');
const finalTime = document.querySelector('#final-time');
const highScoreElement = document.querySelector('#high-score');
const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const keys = new Set();
const images = {};
const assetPaths = {
  player: 'images/player-nave-galaga.png',
  playerCaptured: 'images/spacecrafts-galaga/player-nave-captured-galaga.png',
  enemyA: 'images/spacecrafts-galaga/combat spacecraft-1.png',
  enemyB: 'images/spacecrafts-galaga/combat spacecraft-2.png',
  leader1: 'images/spacecrafts-galaga/leader spacecraft-1.png',
  leader2: 'images/spacecrafts-galaga/leader spacecraft-2.png',
  tractorBeam1: 'images/spacecrafts-galaga/traktor-ray-leader-spacecraft-1.png',
  tractorBeam2: 'images/spacecrafts-galaga/traktor-ray-leader-spacecraft-2.png',
  tractorBeam3: 'images/spacecrafts-galaga/traktor-ray-leader-spacecraft-3.png'
};
let state = 'title';
let score = 0;
let highScore = Number(localStorage.getItem('galagaHighScore') || 0);
let lives = 3;
let level = 1;
let lastTime = 0;
let shotCooldown = 0;
let enemyShotCooldown = 2;
let captureCooldown = 7;
let leaderLaunchCooldown = 5;
let waveOffset = 0;
let waveDirection = 1;
let stageTransitionTimer = 0;
let captureTarget = null;
let capturedShip = null;
let playerLossTimer = 0;
let destroyedPlayer = null;
let gameStartTime = 0;
let player;
let shots = [];
let enemyShots = [];
let enemies = [];
let stars = [];
let audio;
let playerShotSound = 0;
const startMusic = new Audio('sounds/02_start_music.mp3');
const inGameAmbience = new Audio('sounds/03_in_game_ambience.mp3');
const alienFlying = new Audio('sounds/04_alien_flying.mp3');
const tractorBeamShot = new Audio('sounds/10_tractor_beam_shot.mp3');
const tractorBeamCapture = new Audio('sounds/11_tractor_beam_capture.mp3');
const captureMusic = new Audio('sounds/12_capture_music.mp3');
const rescueMusic = new Audio('sounds/15_rescue_music.mp3');
const mistakeSound = new Audio('sounds/16_mistake_music.mp3');
const missSound = new Audio('sounds/22_miss.mp3');
const stageStartSound = new Audio('sounds/21_stage_flag_appearance.mp3');
const playerShotSounds = [
  new Audio('sounds/13_ighter_shot_1.mp3'),
  new Audio('sounds/14_fighter_shot_2.mp3')
];
const alienShotSounds = {
  enemyA: new Audio('sounds/05_zako_stricken.mp3'),
  enemyB: new Audio('sounds/06_goei_stricken.mp3'),
  leader: [
    new Audio('sounds/07_boss_stricken_1.mp3'),
    new Audio('sounds/08_boss_stricken_2.mp3')
  ]
};
startMusic.loop = true;
inGameAmbience.loop = true;
alienFlying.loop = true;

highScoreElement.textContent = String(highScore).padStart(6, '0');
Object.entries(assetPaths).forEach(([name, path]) => { images[name] = new Image(); images[name].src = path; });
for (let i = 0; i < 90; i++) stars.push({ x: Math.random() * WIDTH, y: Math.random() * HEIGHT, speed: 10 + Math.random() * 30, size: Math.random() > .8 ? 2 : 1 });

function formatScore(value) { return String(value).padStart(6, '0'); }
function formatDuration(seconds) { const totalSeconds = Math.max(0, Math.floor(seconds)); return `${String(Math.floor(totalSeconds / 60)).padStart(2, '0')}:${String(totalSeconds % 60).padStart(2, '0')}`; }
function initAudio() {
  if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
  if (audio.state === 'suspended') audio.resume();
}
function playTitleMusic() {
  inGameAmbience.pause();
  inGameAmbience.currentTime = 0;
  startMusic.play().catch(() => {});
}
function playInGameAmbience() {
  startMusic.pause();
  startMusic.currentTime = 0;
  inGameAmbience.play().catch(() => {});
  alienFlying.play().catch(() => {});
}
function pauseGameplaySounds() { inGameAmbience.pause(); alienFlying.pause(); }
function playSound(sound) { const instance = sound.cloneNode(); instance.play().catch(() => {}); }
function playAlienShotSound(type) { const sound = alienShotSounds[type]; playSound(Array.isArray(sound) ? sound[Math.floor(Math.random() * sound.length)] : sound); }
function stopCaptureSounds() { captureMusic.pause(); captureMusic.currentTime = 0; }
function beginStageTransition() { state = 'stageTransition'; stageTransitionTimer = 2.5; playSound(stageStartSound); }
function finishStageTransition() { level++; state = 'playing'; resetWave(); }
function destroyEnemy(enemy) {
  if (!enemy.alive) return;
  if (enemy.type === 'leader' && enemy.hitsRemaining > 1) {
    enemy.hitsRemaining--;
    enemy.imageKey = 'leader2';
    score += 80;
    if (enemy === captureTarget && !capturedShip) {
      enemy.captureState = null;
      captureTarget = null;
      stopCaptureSounds();
    }
    return;
  }
  enemy.alive = false;
  score += enemy.type === 'leader' ? 160 : enemy.type === 'enemyB' ? 100 : 50;
  if (enemy === captureTarget) {
    if (capturedShip) rescueCapturedShip();
    else captureTarget = null;
  }
}
function rescueCapturedShip() {
  if (!capturedShip) return;
  capturedShip = null;
  player.rescuedPartner = true;
  captureTarget = null;
  stopCaptureSounds();
  playSound(rescueMusic);
}
function loseCapturedShip() {
  if (!capturedShip) return;
  capturedShip = null;
  player.rescuedPartner = false;
  captureTarget = null;
  stopCaptureSounds();
  beginPlayerDestroyed();
}
function beginPlayerDestroyed() {
  if (playerLossTimer > 0) return;
  lives = Math.max(0, lives - 1);
  destroyedPlayer = { x: player.x, y: player.y, timer: 2.5 };
  playerLossTimer = 2.5;
  player.invincible = 0;
  playSound(missSound);
}
function startCapture(enemy) {
  if (capturedShip || enemy.captureState || captureCooldown > 0 || !enemy.launching) return;
  enemy.captureState = 'beaming';
  enemy.captureTimer = 1.6;
  enemy.beamFrame = 0;
  enemy.beamFrameTimer = 0;
  captureTarget = enemy;
  captureCooldown = 10;
  playSound(tractorBeamShot);
}
function updateCapture(dt) {
  captureCooldown = Math.max(0, captureCooldown - dt);
  if (captureTarget?.captureState === 'beaming' || captureTarget?.captureState === 'captured') {
    captureTarget.beamFrameTimer += dt;
    if (captureTarget.beamFrameTimer >= .12) {
      captureTarget.beamFrameTimer = 0;
      captureTarget.beamFrame = (captureTarget.beamFrame + 1) % 3;
    }
  }
  if (captureTarget?.captureState === 'beaming') {
    captureTarget.captureTimer -= dt;
    if (captureTarget.captureTimer <= 0) {
      captureTarget.captureState = 'captured';
      lives = Math.max(0, lives - 1);
      capturedShip = { x: captureTarget.x, y: captureTarget.y - 50, width: 56, height: 56, imageKey: 'playerCaptured' };
      player.rescuedPartner = false;
      playSound(tractorBeamCapture);
      captureMusic.currentTime = 0;
      captureMusic.play().catch(() => {});
    }
  }
  if (capturedShip && captureTarget?.alive) {
    capturedShip.x = captureTarget.x + captureTarget.width / 2 - capturedShip.width / 2;
    capturedShip.y = captureTarget.y - capturedShip.height - 12;
  }
}
function sfx(frequency, duration = .08, type = 'square') {
  if (!audio) return;
  const osc = audio.createOscillator(); const gain = audio.createGain(); osc.type = type; osc.frequency.value = frequency; gain.gain.setValueAtTime(.08, audio.currentTime); gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + duration); osc.connect(gain); gain.connect(audio.destination); osc.start(); osc.stop(audio.currentTime + duration);
}
function resetWave() {
  const rescuedPartner = player?.rescuedPartner || false;
  player = { x: WIDTH / 2 - 28, y: HEIGHT - 82, width: 56, height: 56, invincible: 0, captured: false, rescuedPartner };
  shots = []; enemyShots = []; enemies = [];
  captureTarget = null;
  capturedShip = null;
  const rows = Math.min(5, 4 + Math.floor(level / 3));
  const formation = [
    { type: 'leader', imageKey: 'leader1', count: 2, spacing: 70 },
    { type: 'enemyB', imageKey: 'enemyB', count: 6, spacing: 70 },
    { type: 'enemyA', imageKey: 'enemyA', count: 8, spacing: 62 },
    { type: 'enemyA', imageKey: 'enemyA', count: 10, spacing: 58 },
    { type: 'enemyB', imageKey: 'enemyB', count: 10, spacing: 58 }
  ].slice(0, rows);
  formation.forEach((line, row) => {
    const startX = WIDTH / 2 - ((line.count - 1) * line.spacing) / 2;
    for (let col = 0; col < line.count; col++) enemies.push({ x: startX + col * line.spacing, y: 108 + row * 54, homeX: startX + col * line.spacing, homeY: 108 + row * 54, width: 38, height: 38, type: line.type, imageKey: line.imageKey, hitsRemaining: line.type === 'leader' ? 2 : 1, alive: true, phase: row * .7 + col * .15, captureState: null, captureTimer: 0, launching: false, attackState: 'formation', launchTimer: 0, beamFrame: 0, beamFrameTimer: 0, usesTractorBeam: false });
  });
}
function startGame() { initAudio(); playInGameAmbience(); state = 'playing'; score = 0; lives = 3; level = 1; waveOffset = 0; captureCooldown = 7; leaderLaunchCooldown = 5; playerLossTimer = 0; destroyedPlayer = null; capturedShip = null; gameStartTime = performance.now(); player = null; titleScreen.classList.add('hidden'); gameOver.classList.add('hidden'); resetWave(); }
function pauseGame() { if (state === 'playing') { state = 'paused'; pauseGameplaySounds(); captureMusic.pause(); pauseScreen.classList.remove('hidden'); } }
function resumeGame() { if (state === 'paused') { state = 'playing'; pauseScreen.classList.add('hidden'); initAudio(); inGameAmbience.play().catch(() => {}); alienFlying.play().catch(() => {}); if (capturedShip) captureMusic.play().catch(() => {}); } }
function quitGame() { state = 'title'; pauseGameplaySounds(); stopCaptureSounds(); inGameAmbience.currentTime = 0; alienFlying.currentTime = 0; pauseScreen.classList.add('hidden'); titleScreen.classList.remove('hidden'); shots = []; enemyShots = []; playTitleMusic(); }
function endGame() { state = 'over'; pauseGameplaySounds(); stopCaptureSounds(); playSound(mistakeSound); finalScore.textContent = formatScore(score); finalTime.textContent = `TIEMPO ${formatDuration((performance.now() - gameStartTime) / 1000)}`; gameOver.classList.remove('hidden'); if (score > highScore) { highScore = score; localStorage.setItem('galagaHighScore', highScore); highScoreElement.textContent = formatScore(highScore); } }
function fire() { if (state !== 'playing' || shotCooldown > 0) return; shots.push({ x: player.x + player.width / 2 - 2, y: player.y - 4, width: 4, height: 18, speed: 530 }); shotCooldown = .22; playSound(playerShotSounds[playerShotSound]); playerShotSound = (playerShotSound + 1) % playerShotSounds.length; }
function hit(a, b) { return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y; }
function loseLife() { if (playerLossTimer > 0 || player.invincible > 0) return; beginPlayerDestroyed(); }
function update(dt) {
  if (state === 'stageTransition') {
    stageTransitionTimer -= dt;
    if (stageTransitionTimer <= 0) finishStageTransition();
    return;
  }
  if (state !== 'playing') return;
  if (playerLossTimer > 0) {
    playerLossTimer = Math.max(0, playerLossTimer - dt);
    if (destroyedPlayer) destroyedPlayer.timer = playerLossTimer;
    if (playerLossTimer === 0) {
      if (lives <= 0) endGame();
      else { player.x = WIDTH / 2 - 28; player.y = HEIGHT - 82; player.invincible = 1.5; }
    }
    return;
  }
  if (keys.has('ArrowLeft')) player.x -= 360 * dt; if (keys.has('ArrowRight')) player.x += 360 * dt; player.x = Math.max(20, Math.min(WIDTH - player.width - 20, player.x));
  shotCooldown = Math.max(0, shotCooldown - dt); player.invincible = Math.max(0, player.invincible - dt);
  leaderLaunchCooldown -= dt;
  waveOffset += waveDirection * dt * (18 + level * 2); if (Math.abs(waveOffset) > 44) waveDirection *= -1;
  shots.forEach(shot => shot.y -= shot.speed * dt); shots = shots.filter(shot => shot.y > -30);
  enemies.forEach(enemy => {
    if (!enemy.alive) return;
    if (enemy.launching) {
      if (enemy.attackState === 'attack') {
        enemy.launchTimer -= dt;
        enemy.y += 180 * dt;
        enemy.x += Math.sin(performance.now() / 240 + enemy.phase) * 95 * dt;
        if (enemy.launchTimer <= 0 || enemy.y >= HEIGHT - 230) enemy.attackState = 'return';
      }
      if (enemy.attackState === 'return') {
        const homeX = enemy.homeX + waveOffset;
        const homeY = enemy.homeY + Math.sin(performance.now() / 700 + enemy.phase) * 5;
        enemy.x += (homeX - enemy.x) * Math.min(1, dt * 2.4);
        enemy.y += (homeY - enemy.y) * Math.min(1, dt * 2.4);
        if (Math.abs(enemy.x - homeX) < 2 && Math.abs(enemy.y - homeY) < 2) {
          enemy.x = homeX; enemy.y = homeY; enemy.launching = false; enemy.attackState = 'formation';
        }
      }
    } else {
      enemy.x = enemy.homeX + waveOffset;
      enemy.y = enemy.homeY + Math.sin(performance.now() / 700 + enemy.phase) * 5;
    }
  });
  updateCapture(dt);
  if (leaderLaunchCooldown <= 0) {
    const leader = enemies.find(enemy => enemy.alive && enemy.type === 'leader' && !enemy.launching && !enemy.captureState);
    if (leader) {
      leader.launching = true;
      leader.attackState = 'attack';
      leader.launchTimer = 1.2;
      leader.usesTractorBeam = !capturedShip && !captureTarget && captureCooldown <= 0 && Math.random() < .4;
      if (leader.usesTractorBeam) startCapture(leader);
      leaderLaunchCooldown = 4 + Math.random() * 3;
    }
  }
  enemyShotCooldown -= dt; if (enemyShotCooldown <= 0) { const alive = enemies.filter(enemy => enemy.alive); if (alive.length) { const enemy = alive[Math.floor(Math.random() * alive.length)]; enemyShots.push({ x: enemy.x + enemy.width / 2, y: enemy.y + enemy.height, width: 4, height: 14, speed: 210 + level * 12, type: enemy.type }); playAlienShotSound(enemy.type); } enemyShotCooldown = Math.max(.45, 1.5 - level * .04); }
  enemyShots.forEach(shot => shot.y += shot.speed * dt); enemyShots = enemyShots.filter(shot => shot.y < HEIGHT + 20);
  shots = shots.filter(shot => {
    const enemy = enemies.find(candidate => candidate.alive && hit(shot, candidate));
    if (!enemy) return true;
    destroyEnemy(enemy);
    sfx(180 + score % 300, .1, 'triangle');
    return false;
  });
  enemyShots.forEach(shot => { if (hit(shot, player)) { shot.y = HEIGHT + 100; loseLife(); } });
  enemies.forEach(enemy => { if (enemy.alive && enemy.y > HEIGHT - 150 && hit(enemy, player)) { destroyEnemy(enemy); loseLife(); } });
  if (enemies.every(enemy => !enemy.alive)) { sfx(880, .25, 'triangle'); beginStageTransition(); }
}
function drawSprite(image, x, y, width, height, flip = false) { if (!image.complete) return; ctx.save(); if (flip) { ctx.translate(x + width, y); ctx.scale(-1, 1); ctx.drawImage(image, 0, 0, width, height); } else ctx.drawImage(image, x, y, width, height); ctx.restore(); }
function draw() {
  ctx.fillStyle = '#030313'; ctx.fillRect(0, 0, WIDTH, HEIGHT);
  stars.forEach(star => { star.y = (star.y + star.speed / 60) % HEIGHT; ctx.fillStyle = star.size === 2 ? '#8299cf' : '#384878'; ctx.fillRect(star.x, star.y, star.size, star.size); });
  if (state === 'playing' || state === 'over') { ctx.fillStyle = '#b8c7ed'; ctx.font = 'bold 18px Orbitron'; ctx.fillText(`SCORE ${formatScore(score)}`, 26, 35); ctx.fillStyle = '#f8d866'; ctx.fillText(`LEVEL ${String(level).padStart(2, '0')}`, 385, 35); ctx.fillStyle = '#ff72b6'; ctx.fillText(`LIVES ${lives}`, 755, 35); }
  if ((state === 'playing' || state === 'over') && player) {
    for (let life = 0; life < lives; life++) drawSprite(images.player, 755 + life * 34, 46, 26, 20);
  }
  if (state === 'playing' || state === 'paused' || state === 'stageTransition') {
    enemies.forEach(enemy => {
      if (!enemy.alive) return;
      drawSprite(images[enemy.imageKey], enemy.x, enemy.y, enemy.width, enemy.height);
      if (enemy.captureState === 'beaming') {
        const beamImage = images[`tractorBeam${enemy.beamFrame + 1}`];
        drawSprite(beamImage, enemy.x + enemy.width / 2 - 29, enemy.y + enemy.height - 4, 58, 145);
      }
    });
    shots.forEach(shot => { ctx.fillStyle = '#fff27d'; ctx.shadowColor = '#fff27d'; ctx.shadowBlur = 12; ctx.fillRect(shot.x, shot.y, shot.width, shot.height); ctx.shadowBlur = 0; });
    enemyShots.forEach(shot => { ctx.fillStyle = '#ff4e9a'; ctx.fillRect(shot.x, shot.y, shot.width, shot.height); });
    if (player && !playerLossTimer && (!player.invincible || Math.floor(player.invincible * 10) % 2)) {
      drawSprite(images.player, player.x, player.y, player.width, player.height);
      if (capturedShip) drawSprite(images[capturedShip.imageKey], capturedShip.x, capturedShip.y, capturedShip.width, capturedShip.height);
      if (player.rescuedPartner) drawSprite(images.player, player.x - 46, player.y, player.width, player.height);
    }
  }
  if (playerLossTimer > 0 && destroyedPlayer) {
    const progress = 1 - destroyedPlayer.timer / 2.5;
    const radius = 18 + progress * 58;
    ctx.fillStyle = 'rgba(255, 66, 95, .16)'; ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.save();
    ctx.translate(destroyedPlayer.x + player.width / 2, destroyedPlayer.y + player.height / 2);
    ctx.globalAlpha = Math.max(.25, 1 - progress);
    ctx.strokeStyle = '#ffe66d'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#ff425f'; ctx.lineWidth = 3;
    for (let ray = 0; ray < 8; ray++) { const angle = ray * Math.PI / 4; ctx.beginPath(); ctx.moveTo(Math.cos(angle) * 12, Math.sin(angle) * 12); ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius); ctx.stroke(); }
    ctx.restore();
    ctx.textAlign = 'center'; ctx.fillStyle = '#ff425f'; ctx.font = 'bold 28px Orbitron'; ctx.fillText('NAVE DESTRUIDA', WIDTH / 2, HEIGHT / 2 - 34); ctx.fillStyle = '#ffe66d'; ctx.font = 'bold 18px Orbitron'; ctx.fillText(`NAVES DISPONIBLES: ${lives}`, WIDTH / 2, HEIGHT / 2 + 10); ctx.textAlign = 'start';
  }
  if (state === 'stageTransition') {
    ctx.fillStyle = 'rgba(1, 1, 8, .72)'; ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.textAlign = 'center'; ctx.fillStyle = '#45d8ff'; ctx.font = 'bold 28px Orbitron'; ctx.fillText('STAGE CLEAR', WIDTH / 2, HEIGHT / 2 - 26); ctx.fillStyle = '#ffe66d'; ctx.font = 'bold 44px Orbitron'; ctx.fillText(`STAGE ${level + 1}`, WIDTH / 2, HEIGHT / 2 + 32); ctx.textAlign = 'start';
  }
}
function loop(time) { const dt = Math.min(.04, (time - lastTime) / 1000 || 0); lastTime = time; update(dt); draw(); requestAnimationFrame(loop); }
window.addEventListener('keydown', event => {
  if (['ArrowLeft', 'ArrowRight', 'Enter', 'Space', 'Escape'].includes(event.code)) event.preventDefault();
  if (event.code === 'Escape') { if (state === 'playing') pauseGame(); else if (state === 'paused') quitGame(); return; }
  if (event.code === 'Enter' && state === 'paused') { resumeGame(); return; }
  if (event.code === 'Space') { if (!event.repeat) fire(); return; }
  keys.add(event.code);
  if ((state === 'title' || state === 'over') && event.code === 'Enter') startGame();
});
window.addEventListener('keyup', event => keys.delete(event.code));
playTitleMusic();
requestAnimationFrame(loop);
