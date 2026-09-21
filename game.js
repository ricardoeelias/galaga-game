const canvas = document.querySelector('#game');
const ctx = canvas.getContext('2d');
const titleScreen = document.querySelector('#title-screen');
const gameOver = document.querySelector('#game-over');
const pauseScreen = document.querySelector('#pause-screen');
const finalScore = document.querySelector('#final-score');
const highScoreElement = document.querySelector('#high-score');
const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const keys = new Set();
const images = {};
const assetPaths = {
  player: 'images/player-nave-galaga.png',
  enemyA: 'images/combat spacecraft-1.png',
  enemyB: 'images/combat spacecraft-2.png',
  enemyC: 'images/combat spacecraft-5.png'
};
let state = 'title';
let score = 0;
let highScore = Number(localStorage.getItem('galagaHighScore') || 0);
let lives = 3;
let level = 1;
let lastTime = 0;
let shotCooldown = 0;
let enemyShotCooldown = 2;
let waveOffset = 0;
let waveDirection = 1;
let player;
let shots = [];
let enemyShots = [];
let enemies = [];
let stars = [];
let audio;

highScoreElement.textContent = String(highScore).padStart(6, '0');
Object.entries(assetPaths).forEach(([name, path]) => { images[name] = new Image(); images[name].src = path; });
for (let i = 0; i < 90; i++) stars.push({ x: Math.random() * WIDTH, y: Math.random() * HEIGHT, speed: 10 + Math.random() * 30, size: Math.random() > .8 ? 2 : 1 });

function formatScore(value) { return String(value).padStart(6, '0'); }
function initAudio() {
  if (audio) { audio.resume(); return; }
  audio = new (window.AudioContext || window.webkitAudioContext)();
  const master = audio.createGain(); master.gain.value = .035; master.connect(audio.destination);
  const notes = [110, 138.59, 164.81, 220, 164.81, 138.59, 123.47, 164.81];
  let index = 0;
  const play = () => {
    if (state !== 'playing') return;
    const osc = audio.createOscillator(); const gain = audio.createGain();
    osc.type = 'square'; osc.frequency.value = notes[index++ % notes.length]; gain.gain.setValueAtTime(.35, audio.currentTime); gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + .18); osc.connect(gain); gain.connect(master); osc.start(); osc.stop(audio.currentTime + .19);
    window.setTimeout(play, 190);
  };
  play();
}
function sfx(frequency, duration = .08, type = 'square') {
  if (!audio) return;
  const osc = audio.createOscillator(); const gain = audio.createGain(); osc.type = type; osc.frequency.value = frequency; gain.gain.setValueAtTime(.08, audio.currentTime); gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + duration); osc.connect(gain); gain.connect(audio.destination); osc.start(); osc.stop(audio.currentTime + duration);
}
function resetWave() {
  player = { x: WIDTH / 2 - 28, y: HEIGHT - 82, width: 56, height: 56, invincible: 0 };
  shots = []; enemyShots = []; enemies = [];
  const rows = Math.min(5, 4 + Math.floor(level / 3));
  for (let row = 0; row < rows; row++) for (let col = 0; col < 10; col++) enemies.push({ x: 138 + col * 70, y: 108 + row * 54, homeX: 138 + col * 70, homeY: 108 + row * 54, width: 38, height: 38, type: row === 0 ? 'enemyC' : row < 2 ? 'enemyB' : 'enemyA', alive: true, phase: row * .7 + col * .15 });
}
function startGame() { initAudio(); state = 'playing'; score = 0; lives = 3; level = 1; waveOffset = 0; titleScreen.classList.add('hidden'); gameOver.classList.add('hidden'); resetWave(); }
function pauseGame() { if (state === 'playing') { state = 'paused'; pauseScreen.classList.remove('hidden'); } }
function resumeGame() { if (state === 'paused') { state = 'playing'; pauseScreen.classList.add('hidden'); initAudio(); } }
function quitGame() { state = 'title'; pauseScreen.classList.add('hidden'); titleScreen.classList.remove('hidden'); shots = []; enemyShots = []; }
function endGame() { state = 'over'; finalScore.textContent = formatScore(score); gameOver.classList.remove('hidden'); if (score > highScore) { highScore = score; localStorage.setItem('galagaHighScore', highScore); highScoreElement.textContent = formatScore(highScore); } }
function fire() { if (state !== 'playing' || shotCooldown > 0) return; shots.push({ x: player.x + player.width / 2 - 2, y: player.y - 4, width: 4, height: 18, speed: 530 }); shotCooldown = .22; sfx(740, .07); }
function hit(a, b) { return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y; }
function loseLife() { if (player.invincible > 0) return; lives--; player.invincible = 1.5; sfx(90, .28, 'sawtooth'); if (lives <= 0) endGame(); }
function update(dt) {
  if (state !== 'playing') return;
  if (keys.has('ArrowLeft')) player.x -= 360 * dt; if (keys.has('ArrowRight')) player.x += 360 * dt; player.x = Math.max(20, Math.min(WIDTH - player.width - 20, player.x));
  shotCooldown = Math.max(0, shotCooldown - dt); player.invincible = Math.max(0, player.invincible - dt);
  waveOffset += waveDirection * dt * (18 + level * 2); if (Math.abs(waveOffset) > 44) waveDirection *= -1;
  shots.forEach(shot => shot.y -= shot.speed * dt); shots = shots.filter(shot => shot.y > -30);
  enemies.forEach(enemy => { enemy.x = enemy.homeX + waveOffset; enemy.y = enemy.homeY + Math.sin(performance.now() / 700 + enemy.phase) * 5; });
  enemyShotCooldown -= dt; if (enemyShotCooldown <= 0) { const alive = enemies.filter(enemy => enemy.alive); if (alive.length) { const enemy = alive[Math.floor(Math.random() * alive.length)]; enemyShots.push({ x: enemy.x + enemy.width / 2, y: enemy.y + enemy.height, width: 4, height: 14, speed: 210 + level * 12 }); } enemyShotCooldown = Math.max(.45, 1.5 - level * .04); }
  enemyShots.forEach(shot => shot.y += shot.speed * dt); enemyShots = enemyShots.filter(shot => shot.y < HEIGHT + 20);
  shots.forEach(shot => enemies.forEach(enemy => { if (enemy.alive && hit(shot, enemy)) { enemy.alive = false; shot.y = -100; score += enemy.type === 'enemyC' ? 160 : enemy.type === 'enemyB' ? 100 : 50; sfx(180 + score % 300, .1, 'triangle'); } }));
  enemyShots.forEach(shot => { if (hit(shot, player)) { shot.y = HEIGHT + 100; loseLife(); } });
  enemies.forEach(enemy => { if (enemy.alive && enemy.y > HEIGHT - 150 && hit(enemy, player)) { enemy.alive = false; loseLife(); } });
  if (enemies.every(enemy => !enemy.alive)) { level++; sfx(880, .25, 'triangle'); resetWave(); }
}
function drawSprite(image, x, y, width, height, flip = false) { if (!image.complete) return; ctx.save(); if (flip) { ctx.translate(x + width, y); ctx.scale(-1, 1); ctx.drawImage(image, 0, 0, width, height); } else ctx.drawImage(image, x, y, width, height); ctx.restore(); }
function draw() {
  ctx.fillStyle = '#030313'; ctx.fillRect(0, 0, WIDTH, HEIGHT);
  stars.forEach(star => { star.y = (star.y + star.speed / 60) % HEIGHT; ctx.fillStyle = star.size === 2 ? '#8299cf' : '#384878'; ctx.fillRect(star.x, star.y, star.size, star.size); });
  if (state === 'playing' || state === 'over') { ctx.fillStyle = '#b8c7ed'; ctx.font = 'bold 18px Orbitron'; ctx.fillText(`SCORE ${formatScore(score)}`, 26, 35); ctx.fillStyle = '#f8d866'; ctx.fillText(`LEVEL ${String(level).padStart(2, '0')}`, 385, 35); ctx.fillStyle = '#ff72b6'; ctx.fillText(`LIVES ${lives}`, 755, 35); }
  if (state === 'playing' || state === 'paused') { enemies.forEach(enemy => { if (enemy.alive) drawSprite(images[enemy.type], enemy.x, enemy.y, enemy.width, enemy.height); }); shots.forEach(shot => { ctx.fillStyle = '#fff27d'; ctx.shadowColor = '#fff27d'; ctx.shadowBlur = 12; ctx.fillRect(shot.x, shot.y, shot.width, shot.height); ctx.shadowBlur = 0; }); enemyShots.forEach(shot => { ctx.fillStyle = '#ff4e9a'; ctx.fillRect(shot.x, shot.y, shot.width, shot.height); }); if (player.invincible <= 0 || Math.floor(player.invincible * 10) % 2) drawSprite(images.player, player.x, player.y, player.width, player.height); }
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
requestAnimationFrame(loop);
