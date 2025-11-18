/* Rebote inelástico — ping-pong (p5.js)
   Panel izquierdo: simulación (altura vs tiempo real)
   Panel derecho : gráfica h(t)
   Barra superior: ▶/❚❚  ↺  ↑  ↓ (ajustan r)
   Controles: [ESPACIO]=Play/Pause, R=Reset, ↑/↓=r ±0.01
*/

// -------- Parámetros físicos --------
let ppm = 110;      // píxeles por metro
let g   = 9.81;     // m/s²
let r   = 0.90;     // coef. restitución típico ping-pong
let h0  = 1.40;     // altura inicial (m)
// Nota: radio aumentado solo para que se vea mejor en pantalla
let radio = 0.05;   // m (ping-pong real ~0.02 m)

// Altura máxima que se marca en el eje del panel de simulación
let H_AXIS_MAX = 2.0; // metros

// -------- Estado --------
let running = false;
let groundY;
let ball = { x:0, y:0, vy:0 };
let lastMS = 0;
let bounceCount = 0;

// Para detectar picos y estimar r_exp
let prevVy = 0;
let peakHeights = [];
let rEst = null;

// -------- Layout / UI --------
let PAD = 16;
let topBar, panelSim, panelPlot;
let btnPlayPause, btnReset, btnRUp, btnRDown;

// -------- Buffer de señal h(t) --------
let N = 600;
let tbuf = Array(N).fill(-1);
let hbuf = Array(N).fill(0);
let idx = 0, tNow = 0, plotTWindow = 10;
let maxHSeen = 0;

// -------- SETUP --------
function setup(){
  createCanvas(900, 560);
  layout();
  initButtons();
  groundY = panelSim.y + panelSim.h - 40; // suelo un poco más arriba para ver la franja
  resetSim();
}

// -------- Layout gráfico --------
function layout(){
  topBar   = rectObj(PAD, PAD, width-2*PAD, 60);
  const wPanel = (width - 3*PAD);
  const hPanel = height - topBar.h - 3*PAD;
  const wLeft  = int(wPanel * 0.55);
  panelSim  = rectObj(PAD, topBar.y+topBar.h+PAD, wLeft, hPanel);
  panelPlot = rectObj(panelSim.x+panelSim.w+PAD, panelSim.y, width - (panelSim.x+panelSim.w+2*PAD), hPanel);
}

// -------- Botones --------
function initButtons(){
  const bw = 46;
  const bh = topBar.h - 20;
  const gap = 14;
  const groupW = 4*bw + 3*gap;

  let bx = topBar.x + (topBar.w - groupW)/2;
  let by = topBar.y + (topBar.h - bh)/2;

  btnPlayPause = buttonObj(bx, by, bw, bh, "playpause");
  bx += bw + gap;
  btnReset     = buttonObj(bx, by, bw, bh, "reset");
  bx += bw + gap;
  btnRUp       = buttonObj(bx, by, bw, bh, "rup");
  bx += bw + gap;
  btnRDown     = buttonObj(bx, by, bw, bh, "rdown");
}

// -------- Reset Física --------
function resetSim(){
  ball.x = panelSim.x + panelSim.w * 0.45;
  ball.y = yFromMeters(h0);
  ball.vy = 0;
  running = false;
  lastMS = millis();
  tNow = 0;
  idx = 0;
  tbuf.fill(-1);
  hbuf.fill(0);
  maxHSeen = h0;
  bounceCount = 0;
  prevVy = 0;
  peakHeights = [];
  rEst = null;
}

// -------- DRAW --------
function draw(){
  background(250);

  // dt crudo (tiempo real del sistema)
  let now = millis();
  let dt = constrain((now - lastMS)/1000, 0, 0.05);
  lastMS = now;

  // Física y tiempo de simulación SOLO si está corriendo
  if (running) {
    stepPhysics(dt);
    tNow += dt;  // ← el tiempo solo avanza en PLAY

    let hRun = metersFromPixels(groundY - (ball.y + metersToPixels(radio)));
    pushSample(tNow, max(0, hRun));
  }

  // altura instantánea solo para mostrar (no altera el tiempo)
  let h = metersFromPixels(groundY - (ball.y + metersToPixels(radio)));

  // UI
  drawTopBar(h);    // info numérica en la barra superior
  drawSimPanel();
  drawPlotPanel();
}

// -------- Barra superior (título + botones + datos) --------
function drawTopBar(hCurrent){
  noStroke();
  fill(255);
  rect(topBar.x, topBar.y, topBar.w, topBar.h, 18);

  // título a la izquierda
  fill(0,150);
  textAlign(LEFT, CENTER);
  textSize(13);
  text("Rebote inelástico · ping-pong", topBar.x + 20, topBar.y + topBar.h/2);

  // botones centrados
  drawButton(btnPlayPause);
  drawButton(btnReset);
  drawButton(btnRUp);
  drawButton(btnRDown);

  // tira de datos a la derecha
  let rEstText = (rEst === null ? "—" : nf(rEst,1,3));

  let info = "t=" + nf(tNow,1,2) + " s   " +
             "h=" + nf(hCurrent,1,3) + " m   " +
             "vᵧ=" + nf(ball.vy,1,2) + " m/s   " +
             "reb=" + bounceCount + "   " +
             "r=" + nf(r,1,2) + "   " +
             "rₑxp≈" + rEstText;

  fill(0,170);
  textSize(11);
  textAlign(RIGHT, CENTER);
  text(info, topBar.x + topBar.w - 20, topBar.y + topBar.h/2 + 1);
}

// -------- Panel Simulación --------
function drawSimPanel(){
  noStroke(); 
  fill(255);
  rect(panelSim.x, panelSim.y, panelSim.w, panelSim.h, 18);

  // Ejes y rejilla de alturas
  drawSimAxes();

  // Suelo como franja
  let simBottom = panelSim.y + panelSim.h;
  noStroke();
  fill(245);
  rect(panelSim.x+8, groundY, panelSim.w-16, simBottom-groundY, 10);
  stroke(180);
  strokeWeight(2);
  line(panelSim.x+20, groundY, panelSim.x+panelSim.w-20, groundY);
  strokeWeight(1);

  // Tiempo en el panel (además de la barra)
  noStroke();
  fill(0,140);
  textSize(11);
  textAlign(LEFT, TOP);
  text("t = " + nf(tNow,1,2) + " s", panelSim.x + 18, panelSim.y + 12);

  // sombra de la pelota
  let rpx = metersToPixels(radio);
  let dist = max(0, groundY - (ball.y + rpx));
  let s = map(dist, 0, 240, 1.6, 0.25);
  noStroke(); 
  fill(0,30);
  ellipse(ball.x + 12, groundY + 6, rpx*2.4*s, rpx*0.9*s);

  // pelota (más grande visualmente)
  stroke(40); 
  fill(255,180,0);
  ellipse(ball.x, ball.y, rpx*2.2, rpx*2.2);
  noFill(); 
  stroke(255,255,255,150);
  arc(ball.x, ball.y, rpx*1.8, rpx*1.8, -PI/6, PI/2);
}

// Dibuja el eje de alturas y la rejilla del panel de simulación
function drawSimAxes(){
  let axisX = panelSim.x + 40;
  let simTop = panelSim.y + 16;
  let simBottom = panelSim.y + panelSim.h;

  // eje vertical
  stroke(120);
  line(axisX, simTop, axisX, groundY);

  // marcas de altura
  textSize(11);
  textAlign(RIGHT, CENTER);
  for (let hTick = 0; hTick <= H_AXIS_MAX + 0.0001; hTick += 0.5){
    let yTick = yFromMeters(hTick);
    if (yTick < simTop || yTick > simBottom) continue;

    // línea horizontal suave
    stroke(230);
    line(axisX+2, yTick, panelSim.x + panelSim.w - 18, yTick);

    // marca corta y etiqueta
    stroke(120);
    line(axisX-4, yTick, axisX, yTick);
    noStroke();
    fill(0,150);
    text(nf(hTick,1,1), axisX-6, yTick);
  }

  // etiqueta eje
  push();
  translate(axisX-24, (simTop+groundY)/2);
  rotate(-HALF_PI);
  textAlign(CENTER, CENTER);
  fill(0,160);
  text("altura h (m)", 0, 0);
  pop();
}

// -------- Panel del Gráfico --------
function drawPlotPanel(){
  noStroke(); 
  fill(255);
  rect(panelPlot.x, panelPlot.y, panelPlot.w, panelPlot.h, 18);

  let left = panelPlot.x + 50;
  let right = panelPlot.x + panelPlot.w - 16;
  let bottom = panelPlot.y + panelPlot.h - 28;
  let top = panelPlot.y + 16;

  stroke(230);
  for (let y=bottom; y>=top; y-=40) line(left, y, right, y);
  for (let x=left; x<=right; x+=60) line(x, top, x, bottom);

  stroke(30); strokeWeight(1.2);
  line(left, top, left, bottom);
  line(left, bottom, right, bottom);
  strokeWeight(1);

  fill(0); 
  noStroke();
  textAlign(CENTER, TOP); 
  text("x: tiempo (s)", (left+right)/2, bottom+6);

  push();
  translate(left-30, (top+bottom)/2);
  rotate(-HALF_PI);
  textAlign(CENTER, CENTER);
  text("y: h (m)", 0, 0);
  pop();

  // escala vertical suave
  let hmax = 0.1;
  for (let i=0;i<N;i++) hmax = max(hmax, hbuf[i]);
  maxHSeen = lerp(maxHSeen, max(hmax, 0.2), 0.08);
  let yscale = (bottom - top) / max(0.15, maxHSeen*1.15);

  noFill(); 
  stroke(0);
  beginShape();
  for (let k=0;k<N;k++){
    let i = (idx + k) % N;
    if (tbuf[i] < 0) continue;
    let tx = map(tbuf[i], tNow - plotTWindow, tNow, left, right);
    if (tx < left) continue;
    if (tx > right) break;
    let ty = bottom - hbuf[i]*yscale;
    vertex(tx, ty);
  }
  endShape();
}

// -------- Interacción --------
function mousePressed(){
  if (hit(btnPlayPause)) running = !running;
  else if (hit(btnReset)) resetSim();
  else if (hit(btnRUp))   r = constrain(r + 0.01, 0, 1);
  else if (hit(btnRDown)) r = constrain(r - 0.01, 0, 1);
}

function keyPressed(){
  if (key === ' ') running = !running;
  else if (key === 'r' || key === 'R') resetSim();
  else if (keyCode === UP_ARROW)   r = constrain(r + 0.01, 0, 1);
  else if (keyCode === DOWN_ARROW) r = constrain(r - 0.01, 0, 1);
}

// -------- Física --------
function stepPhysics(dt){
  prevVy = ball.vy;

  ball.vy += g * dt;
  ball.y  += ball.vy * ppm * dt;

  detectPeak();

  let rpx = metersToPixels(radio);
  if (ball.y + rpx >= groundY){
    ball.y = groundY - rpx;
    ball.vy = -r * ball.vy;
    bounceCount++;
  }
}

// Detecta pico y actualiza r_est
function detectPeak(){
  // vy<0 sube, vy>0 baja (eje y hacia abajo)
  if (prevVy < 0 && ball.vy >= 0){
    let h_peak = metersFromPixels(groundY - (ball.y + metersToPixels(radio)));
    if (h_peak > 0.001){
      peakHeights.push(h_peak);
      if (peakHeights.length >= 2){
        let n = peakHeights.length;
        rEst = sqrt(peakHeights[n-1] / peakHeights[n-2]);
      }
    }
  }
}

// -------- Utilidades --------
function metersToPixels(m){ return m * ppm; }
function metersFromPixels(px){ return px / ppm; }
function yFromMeters(m){ return groundY - metersToPixels(m); }

function pushSample(t, h){
  tbuf[idx] = t;
  hbuf[idx] = h;
  idx = (idx + 1) % N;
}

function rectObj(x,y,w,h){ return {x,y,w,h}; }
function buttonObj(x,y,w,h,kind){ return {x,y,w,h,kind}; }
function hit(b){ return mouseX>=b.x && mouseX<=b.x+b.w && mouseY>=b.y && mouseY<=b.y+b.h; }

// -------- Dibujo de botones --------
function drawButton(b){
  let over = hit(b);

  noStroke();
  fill(0, 18);
  rect(b.x, b.y+2, b.w, b.h, 14);

  if (b.kind === "playpause" && running) {
    fill(over ? 230 : 236);
  } else {
    fill(over ? 242 : 250);
  }
  rect(b.x, b.y, b.w, b.h, 14);

  noFill();
  stroke(220);
  rect(b.x, b.y, b.w, b.h, 14);

  push();
  translate(b.x + b.w/2, b.y + b.h/2);
  stroke(20); strokeWeight(2); noFill();

  if (b.kind === "playpause"){
    if (running){
      line(-6,-10,-6,10);
      line(6,-10,6,10);
    } else {
      noStroke(); fill(20);
      triangle(-6,-12,-6,12,10,0);
    }
  } else if (b.kind === "reset"){
    noFill(); stroke(20);
    arc(0,0,20,20, PI*0.2, TWO_PI*0.85);
    line(8,-2,12,-6);
    line(8,-2,13,1);
  } else if (b.kind === "rup"){
    line(0,-10,0,10);
    line(0,-10,-6,-2);
    line(0,-10,6,-2);
  } else if (b.kind === "rdown"){
    line(0,-10,0,10);
    line(0,10,-6,2);
    line(0,10,6,2);
  }
  pop();
}
