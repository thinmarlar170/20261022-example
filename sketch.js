// Fruit Slicer - paste into sketch.js in the p5.js web editor (editor.p5js.org)
// PC: hold the mouse button and drag across the fruits.
// Phone: swipe your finger across the fruits.
// Slice fruits = +1 point. Missing a fruit = lose a life. Slice a bomb = game over.

// ----- Settings -----
const START_LIVES = 3;
const BOMB_CHANCE = 0.12;   // 12% of throws are bombs

const FRUITS = [
  { skin: [46, 139, 61],   flesh: [229, 67, 79]   },  // watermelon
  { skin: [242, 140, 26],  flesh: [255, 192, 101] },  // orange
  { skin: [214, 47, 47],   flesh: [246, 232, 181] },  // apple
  { skin: [242, 210, 27],  flesh: [255, 243, 160] },  // lemon
  { skin: [122, 92, 46],   flesh: [143, 209, 79]  }   // kiwi
];

let state = 'start';        // 'start', 'play', or 'over'
let fruits, halves, drops, trail, prev;
let score, best = 0, lives, nextThrow, g, lastTouch = -1000, stateTime = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  textAlign(CENTER, CENTER);
  g = height * 0.00045;     // gravity, scaled to screen size
  resetGame();
}

function resetGame() {
  fruits = []; halves = []; drops = []; trail = [];
  prev = null;
  score = 0;
  lives = START_LIVES;
  nextThrow = 30;
}

function startGame() {
  resetGame();
  state = 'play';
  stateTime = millis();
}

function endGame() {
  state = 'over';
  stateTime = millis();
  best = max(best, score);
}

// ----- Throwing fruits and bombs -----
function throwItem() {
  const r = min(width, height) * 0.075;
  const x = random(width * 0.15, width * 0.85);
  const vy = -random(0.023, 0.028) * height;
  const flightFrames = (2 * -vy) / g;
  const vx = ((width / 2 - x) / flightFrames) * random(0.3, 0.9);
  const bomb = random() < BOMB_CHANCE;
  fruits.push({
    x, y: height + r, vx, vy, r,
    bomb,
    type: bomb ? null : random(FRUITS),
    rot: random(TWO_PI),
    vrot: random(-0.05, 0.05)
  });
}

// ----- Slicing -----
function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / len2;
  t = constrain(t, 0, 1);
  return dist(px, py, ax + t * dx, ay + t * dy);
}

function sliceCheck(a, b) {
  if (dist(a.x, a.y, b.x, b.y) < 4) return; // finger barely moved
  const angle = atan2(b.y - a.y, b.x - a.x);
  for (let i = fruits.length - 1; i >= 0; i--) {
    const f = fruits[i];
    if (distToSegment(f.x, f.y, a.x, a.y, b.x, b.y) <= f.r) {
      if (f.bomb) {
        spawnDrops(f.x, f.y, [255, 120, 40], 30);
        endGame();
        return;
      }
      score++;
      spawnHalves(f, angle);
      spawnDrops(f.x, f.y, f.type.flesh, 14);
      fruits.splice(i, 1);
    }
  }
}

function spawnHalves(f, angle) {
  for (const side of [-1, 1]) {
    const nx = cos(angle + HALF_PI) * side;
    const ny = sin(angle + HALF_PI) * side;
    halves.push({
      x: f.x, y: f.y,
      vx: f.vx + nx * 2.5, vy: f.vy * 0.4 + ny * 2.5,
      r: f.r, type: f.type, side,
      rot: angle - HALF_PI,
      vrot: side * random(0.03, 0.08)
    });
  }
}

function spawnDrops(x, y, col, n) {
  for (let i = 0; i < n; i++) {
    const a = random(TWO_PI), s = random(1, 6);
    drops.push({ x, y, vx: cos(a) * s, vy: sin(a) * s - 2, life: 40, col });
  }
}

// ----- Pointer (mouse or finger) -----
function getPointer() {
  if (touches.length > 0) return { x: touches[0].x, y: touches[0].y };
  if (mouseIsPressed) return { x: mouseX, y: mouseY };
  return null;
}

function tapToStart() {
  if (state !== 'play' && millis() - stateTime > 400) startGame();
}

function mousePressed() {
  if (millis() - lastTouch < 600) return false; // ignore the mouse event a touch also creates
  tapToStart();
  return false;
}

function touchStarted() {
  lastTouch = millis();
  tapToStart();
  return false;
}

function touchMoved() { return false; } // stop the page from scrolling

// ----- Drawing helpers -----
function drawFruit(f) {
  push();
  translate(f.x, f.y);
  rotate(f.rot);
  noStroke();
  if (f.bomb) {
    fill(30);
    circle(0, 0, f.r * 2);
    fill(70);
    circle(-f.r * 0.3, -f.r * 0.3, f.r * 0.5);
    stroke(150, 110, 60); strokeWeight(f.r * 0.1);
    line(0, -f.r, f.r * 0.3, -f.r * 1.35);
    noStroke();
    fill(255, 80 + 100 * abs(sin(frameCount * 0.3)), 30);
    circle(f.r * 0.3, -f.r * 1.35, f.r * 0.3);
  } else {
    fill(f.type.skin);
    circle(0, 0, f.r * 2);
    fill(255, 255, 255, 90);
    ellipse(-f.r * 0.35, -f.r * 0.4, f.r * 0.5, f.r * 0.3);
  }
  pop();
}

function drawHalf(h) {
  push();
  translate(h.x, h.y);
  rotate(h.rot);
  noStroke();
  const a0 = h.side === 1 ? -HALF_PI : HALF_PI;
  fill(h.type.skin);
  arc(0, 0, h.r * 2, h.r * 2, a0, a0 + PI, CHORD);
  fill(h.type.flesh);
  arc(0, 0, h.r * 1.7, h.r * 1.7, a0, a0 + PI, CHORD);
  pop();
}

function drawTrail() {
  for (let i = 1; i < trail.length; i++) {
    const t = trail[i];
    stroke(255, 255, 255, 255 * (i / trail.length));
    strokeWeight(2 + 8 * (i / trail.length));
    line(trail[i - 1].x, trail[i - 1].y, t.x, t.y);
  }
}

function drawHud() {
  noStroke();
  fill(255);
  textStyle(BOLD);
  textAlign(LEFT, TOP);
  textSize(min(width * 0.07, 32));
  text('Score: ' + score, 16, 14);
  textAlign(RIGHT, TOP);
  text('♥'.repeat(max(lives, 0)), width - 16, 14);
  textAlign(CENTER, CENTER);
}

function drawMessage(title, line1, line2) {
  fill(0, 0, 0, 150);
  noStroke();
  rect(0, 0, width, height);
  fill(255);
  textStyle(BOLD);
  textSize(min(width * 0.11, 52));
  text(title, width / 2, height / 2 - 60);
  textStyle(NORMAL);
  textSize(min(width * 0.05, 22));
  text(line1, width / 2, height / 2);
  text(line2, width / 2, height / 2 + 36);
}

// ----- Main loop -----
function draw() {
  background(34, 52, 70);

  if (state === 'play') {
    // Throw new items, a little faster as the score grows
    nextThrow--;
    if (nextThrow <= 0) {
      const n = random() < 0.35 ? 2 : 1;
      for (let i = 0; i < n; i++) throwItem();
      nextThrow = max(25, 70 - score * 1.2);
    }

    // Slice with the pointer
    const p = getPointer();
    if (p && prev) sliceCheck(prev, p);
    if (p) trail.push(p);
    prev = p;
  }
  // The trail fades away: keep at most 10 points, and shrink it when no pointer is down
  if (!prev && trail.length > 0) trail.shift();
  while (trail.length > 10) trail.shift();

  // Move fruits
  for (let i = fruits.length - 1; i >= 0; i--) {
    const f = fruits[i];
    f.vy += g; f.x += f.vx; f.y += f.vy; f.rot += f.vrot;
    if (f.y > height + f.r * 1.5 && f.vy > 0) {
      if (!f.bomb && state === 'play') {      // missed fruit
        lives--;
        if (lives <= 0) endGame();
      }
      fruits.splice(i, 1);
    }
  }
  for (const f of fruits) drawFruit(f);

  // Fruit halves
  for (let i = halves.length - 1; i >= 0; i--) {
    const h = halves[i];
    h.vy += g; h.x += h.vx; h.y += h.vy; h.rot += h.vrot;
    if (h.y > height + h.r * 2) halves.splice(i, 1);
  }
  for (const h of halves) drawHalf(h);

  // Juice drops
  noStroke();
  for (let i = drops.length - 1; i >= 0; i--) {
    const d = drops[i];
    d.vy += g * 2; d.x += d.vx; d.y += d.vy; d.life--;
    fill(d.col[0], d.col[1], d.col[2], d.life * 6);
    circle(d.x, d.y, 7);
    if (d.life <= 0) drops.splice(i, 1);
  }

  drawTrail();
  drawHud();

  if (state === 'start') {
    drawMessage('Fruit Slicer', 'Swipe across the fruits to cut them.', 'Avoid the bombs. Tap to start.');
  } else if (state === 'over') {
    drawMessage('Game over', 'Score: ' + score + '    Best: ' + best, 'Tap to play again');
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  g = height * 0.00045;
}
