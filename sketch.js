// ===================== CONFIGURACIÓN GLOBAL (limpia) =====================
let W = 800, H = 500;
let SIM_PANEL_W = 400, GRAPH_PANEL_W = 400;

// ====== Constantes físicas (teóricas) ======
const RADIO_CM = 2.0;       // ping-pong (⌀ 40 mm)
const G_CM_S2   = 981.0;    // gravedad Tierra
const R_COR     = 0.90;     // coef. restitución ping-pong en superficie rígida

// ====== Unidades de estado (en cm / s) ======
let alturaSimulacion_cm = 100.0;   // ajustable por slider
let alturaDePartida_cm  = 90.0;    // ajustable por slider
let y_cm, vy_cm_s = 0;
let tiempoSimulado_s = 0;

// ====== Conversión dibujo ======
let pxPorCM, radio_px;

// ====== Sim ======
let simulacionPausada = false;
let ventanaTiempo_s = 5.0;
let historialDatos = [];

// ====== UI (p5 DOM) ======
let ui = {};
let uiWrap, uiTopBar, uiSliders;

// ===================== SETUP =====================
function setup() {
  const cnv = createCanvas(W, H);
  frameRate(60);
  ellipseMode(RADIUS);
  textFont('Arial');

  recalcularEscala();
  reiniciarSimulacion();

  // ---------- UI limpia ----------
  // Contenedor
  uiWrap = createDiv().style('position','absolute')
                      .style('width', (GRAPH_PANEL_W - 24)+'px')
                      .style('padding','10px')
                      .style('border','1px solid #ddd')
                      .style('border-radius','12px')
                      .style('background','#fff')
                      .style('box-shadow','0 4px 12px rgba(0,0,0,.08)')
                      .style('font-family','Arial, sans-serif')
                      .style('font-size','13px');

  // Posición arriba del panel derecho
  const pos = cnv.position();
  uiWrap.position(pos.x + SIM_PANEL_W + 12, pos.y + 12);

  // Top bar (botonera)
  uiTopBar = createDiv().parent(uiWrap)
                        .style('display','flex')
                        .style('gap','8px')
                        .style('align-items','center')
                        .style('margin-bottom','8px');

  crearBoton('⏯ Pausar/Reanudar', () => simulacionPausada = !simulacionPausada, uiTopBar);
  crearBoton('↻ Reiniciar', () => reiniciarSimulacion(), uiTopBar);
  crearBoton('🧹 Limpiar gráfica', () => historialDatos = [], uiTopBar);

  // Info fija (radio, g, r) — solo lectura
  const info = createSpan(`Radio: ${RADIO_CM.toFixed(1)} cm · g: ${G_CM_S2.toFixed(0)} cm/s² · r: ${R_COR.toFixed(2)}`);
  info.parent(uiTopBar).style('margin-left','auto').style('opacity','.8');

  // Sliders (solo alturas)
  uiSliders = createDiv().parent(uiWrap).style('display','grid').style('gap','6px');

  ui.alturaSim = crearSliderLabeled(
    'Altura simulación (cm)', 40, 200, alturaSimulacion_cm, 1, v => {
      alturaSimulacion_cm = v;
      // ajustar partida si quedó fuera
      alturaDePartida_cm = constrain(alturaDePartida_cm, 0, alturaSimulacion_cm - 2*RADIO_CM);
      recalcularEscala();
    }
  );

  ui.altura0 = crearSliderLabeled(
    'Altura de partida (cm)', 0, () => alturaSimulacion_cm - 2*RADIO_CM, alturaDePartida_cm, 1, v => {
      alturaDePartida_cm = constrain(v, 0, max(0, alturaSimulacion_cm - 2*RADIO_CM));
      y_cm = alturaDePartida_cm;
    }
  );
}

// ===================== UTILIDADES UI =====================
function crearBoton(txt, onClick, parent) {
  const b = createButton(txt).parent(parent);
  b.style('padding','6px 10px')
   .style('border','1px solid #ccc')
   .style('border-radius','8px')
   .style('background','#f5f5f5')
   .mousePressed(onClick);
  return b;
}

function crearSliderLabeled(label, min, max, value, step, oninput) {
  const wrap = createDiv().parent(uiSliders);
  const lab  = createElement('label', label).parent(wrap).style('display','block');
  const s = createSlider(
    typeof min === 'function' ? min() : min,
    typeof max === 'function' ? max() : max,
    value, step
  ).parent(wrap).style('width','100%');
  const out = createSpan(String(value)).parent(wrap).style('float','right').style('opacity','.7');

  s.input(() => {
    if (typeof max === 'function') s.elt.max = max();
    const v = Number(s.value());
    out.html(v.toFixed(0));
    oninput(v);
  });
  return s;
}

// ===================== SIM CORE =====================
function recalcularEscala() {
  pxPorCM = H / alturaSimulacion_cm;
  radio_px = RADIO_CM * pxPorCM;
}

function reiniciarSimulacion() {
  y_cm = constrain(alturaDePartida_cm, 0, max(0, alturaSimulacion_cm - 2*RADIO_CM));
  vy_cm_s = 0;
  tiempoSimulado_s = 0;
  historialDatos = [];
  simulacionPausada = false;
}

// ===================== LOOP =====================
function draw() {
  if (!simulacionPausada) stepFisica();
  dibujarSimulacion();
  dibujarGrafica();
  mostrarTextoPanel();
}

function keyPressed() {
  if (key === 'p' || key === 'P') simulacionPausada = !simulacionPausada;
  if (key === 'r' || key === 'R') reiniciarSimulacion();
}

// ===================== FÍSICA =====================
function stepFisica() {
  const dt = min(0.05, deltaTime / 1000); // s

  // Convención: y_cm es altura desde el suelo; arriba positivo
  vy_cm_s -= G_CM_S2 * dt;      // gravedad hacia abajo
  y_cm += vy_cm_s * dt;

  // Choque con suelo
  if (y_cm <= 0) {
    y_cm = 0;
    vy_cm_s = -vy_cm_s * R_COR;
    if (abs(vy_cm_s) < 5) { vy_cm_s = 0; simulacionPausada = true; } // reposo práctico
  }

  // Techo (para mantener dentro del mundo visible)
  const yMax = max(0, alturaSimulacion_cm - 2*RADIO_CM);
  if (y_cm > yMax) { y_cm = yMax; vy_cm_s = 0; }

  tiempoSimulado_s += dt;
  historialDatos.push({ t: tiempoSimulado_s, h: y_cm });
}

// ===================== DIBUJO: SIMULACIÓN =====================
function dibujarSimulacion() {
  // Panel izquierdo
  noStroke(); fill(200,230,255); rect(0,0,SIM_PANEL_W,H);

  // Referencias cada 10 cm
  stroke(150,150,150,100); strokeWeight(1);
  for (let h=10; h<alturaSimulacion_cm; h+=10){
    const y = H - 5 - h*pxPorCM;
    line(0,y,SIM_PANEL_W,y);
    noStroke(); fill(100); textSize(12); textAlign(LEFT,BOTTOM);
    text(h+' cm',10,y-2);
    stroke(150,150,150,100);
  }

  // Suelo
  noStroke(); fill(100,150,50); rect(0,H-5,SIM_PANEL_W,5);

  // Pelota
  const sueloYpx = H - 5;
  const cy = sueloYpx - (y_cm + RADIO_CM)*pxPorCM; // centro
  const cx = SIM_PANEL_W/2;
  fill(255); stroke(0); strokeWeight(1); ellipse(cx, cy, radio_px, radio_px);
}

function mostrarTextoPanel() {
  fill(50); noStroke(); textAlign(LEFT,TOP); textSize(14);
  text('[R] Reiniciar',10,20);
  text('[P] Pausar',10,40);
  text('Tiempo: ' + tiempoSimulado_s.toFixed(2) + ' s', 10, 70);
  text('Altura: ' + max(0,y_cm).toFixed(1) + ' cm', 10, 90);

  if (simulacionPausada){
    fill(255,0,0,200); textAlign(CENTER,CENTER); textSize(40);
    text('PAUSADO', SIM_PANEL_W/2, H/2); textSize(16);
  }
}

// ===================== DIBUJO: GRÁFICA =====================
function dibujarGrafica() {
  // Panel derecho
  fill(255); noStroke(); rect(SIM_PANEL_W,0,GRAPH_PANEL_W,H);

  const x1 = SIM_PANEL_W + 50, y1 = 50, x2 = W - 50, y2 = H - 50;

  // Ejes
  stroke(0); strokeWeight(2);
  line(x1,y1,x1,y2); line(x1,y2,x2,y2);

  // Etiquetas
  noStroke(); fill(0); textSize(14); textAlign(CENTER,CENTER);
  text('Tiempo (s)', (x1+x2)/2, y2+30);
  push(); translate(x1-35,(y1+y2)/2); rotate(-HALF_PI); text('Altura (cm)',0,0); pop();

  // Marcas Y cada 20 cm
  textAlign(RIGHT,CENTER); textSize(12);
  for (let h=0; h<=alturaSimulacion_cm; h+=20){
    const yy = map(h,0,alturaSimulacion_cm,y2,y1);
    noStroke(); fill(0); text(h.toFixed(0), x1-5, yy);
    stroke(220); line(x1,yy,x2,yy);
  }

  // Ventana X deslizante
  const minT = max(0, tiempoSimulado_s - ventanaTiempo_s);
  const maxT = minT + ventanaTiempo_s;
  textAlign(CENTER,TOP);
  for (let t = ceil(minT); t <= maxT; t += 1){
    const xx = map(t, minT, maxT, x1, x2);
    noStroke(); fill(0); text(t.toFixed(0), xx, y2+5);
    stroke(220); line(xx,y1,xx,y2);
  }

  // Serie
  if (historialDatos.length < 2) return;
  noFill(); stroke(255,0,0); strokeWeight(2);
  beginShape();
  for (const p of historialDatos){
    if (p.t >= minT){
      const xx = map(p.t, minT, maxT, x1, x2);
      const yy = map(p.h, 0, alturaSimulacion_cm, y2, y1);
      vertex(xx, yy);
    }
  }
  endShape();
}
