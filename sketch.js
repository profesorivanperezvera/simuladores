// --- Configuración Global de Paneles ---
let W = 800; // Ancho total
let H = 500; // Altura total (un poco menos alto que antes)
let SIM_PANEL_W = 400; // Ancho panel simulación (mitad izquierda)
let GRAPH_PANEL_W = 400; // Ancho panel gráfica (mitad derecha)

// --- Definición de la escala y física ---
let alturaSimulacion_cm = 100.0; // 1 metro de simulación
let gravedad_cm_s2 = 980.0;     
let coeficienteRestitucion = 0.8; 

// --- Variables Globales (se inicializan en setup) ---
let pixelesPorCM;
let gravedad; // Gravedad en píxeles/frame^2

// --- Propiedades de la pelota ---
let x_px, y_px;                  
let vy_px;                       
let radio_cm = 2.0;              
let radio_px;                    

// --- Variables de Control de Simulación ---
let simulacionPausada = false;
let tiempoSimulado = 0;
let alturaDePartida_cm = 90.0; 

// --- Almacenamiento de datos para la gráfica ---
let historialDatos = []; // Array de JS (reemplaza al ArrayList)

// --- SETUP (se ejecuta una vez) ---
function setup() {
  createCanvas(W, H); // El lienzo
  
  // --- Inicializar variables dependientes del tamaño ---
  pixelesPorCM = H / alturaSimulacion_cm; 
  radio_px = radio_cm * pixelesPorCM;
  
  // --- Inicializar el resto de las variables ---
  let fps = 60; 
  frameRate(fps); // Poner los frames por segundo
  let gravedad_cm_frame2 = gravedad_cm_s2 / (fps * fps);
  gravedad = gravedad_cm_frame2 * pixelesPorCM; 
  
  // Configuración de dibujo
  ellipseMode(RADIUS); 
  textFont("Arial");
  
  // Iniciar la simulación por primera vez
  reiniciarSimulacion();
}

// --- FUNCIÓN DE REINICIO ---
function reiniciarSimulacion() {
  // Poner la pelota en la altura de partida
  y_px = H - (alturaDePartida_cm * pixelesPorCM);
  x_px = SIM_PANEL_W / 2; // Centro del panel izquierdo
  
  vy_px = 0; // Sin velocidad inicial
  tiempoSimulado = 0;
  historialDatos = []; // Limpiar el historial
  simulacionPausada = false; 
}


// --- DRAW (El bucle principal) ---
function draw() {
  
  // --- 1. Lógica de la simulación ---
  if (!simulacionPausada) {
    actualizarSimulacion();
  }
  
  // --- 2. Dibujar los componentes visuales ---
  dibujarSimulacion();
  dibujarGrafica();
  mostrarInstrucciones();
  
  // Mostrar mensaje de "PAUSADO"
  if (simulacionPausada) {
    fill(255, 0, 0, 200); 
    textAlign(CENTER, CENTER);
    textSize(40);
    text("PAUSADO", SIM_PANEL_W / 2, H / 2);
    textSize(16); 
  }
}

// --- Interacción con el Teclado ---
function keyPressed() {
  if (key === 'p' || key === 'P') {
    simulacionPausada = !simulacionPausada; 
  }
  if (key === 'r' || key === 'R') {
    reiniciarSimulacion();
  }
}

// --- LÓGICA DE LA SIMULACIÓN ---
function actualizarSimulacion() {
  // 1. Aplicar gravedad
  vy_px += gravedad; 
  
  // 2. Actualizar posición
  y_px += vy_px;
  
  // 3. Actualizar tiempo
  tiempoSimulado += (1.0 / 60.0); // Asumiendo 60 fps
  
  // 4. Detección de colisión con el suelo (fondo de la ventana)
  if (y_px + radio_px >= H) {
    y_px = H - radio_px; // Reposicionar en el suelo
    vy_px *= -coeficienteRestitucion; // Rebote inelástico
    
    // Pausar si la velocidad es muy baja
    if (abs(vy_px) < 0.2) {
      vy_px = 0;
      simulacionPausada = true; 
    }
  }
  
  // 5. Almacenar datos para la gráfica
  let alturaActual_cm = (H - y_px) / pixelesPorCM; // Altura desde el suelo
  // Usamos un objeto JS en lugar de PVector
  historialDatos.push({ t: tiempoSimulado, h: alturaActual_cm });
}


// --- FUNCIONES DE DIBUJO (SIMULACIÓN) ---

function dibujarSimulacion() {
  // Dibuja el panel izquierdo
  noStroke();
  fill(200, 230, 255);
  rect(0, 0, SIM_PANEL_W, H);
  
  dibujarReferencias_cm();
  dibujarSuelo();
  dibujarPelota();
}

function dibujarPelota() {
  fill(255, 255, 255);
  stroke(0);
  strokeWeight(1);
  ellipse(x_px, y_px, radio_px, radio_px);
}

function dibujarSuelo() {
  fill(100, 150, 50); 
  noStroke();
  rect(0, H - 5, SIM_PANEL_W, 5); // Suelo en la parte inferior
}

function dibujarReferencias_cm() {
  stroke(150, 150, 150, 100); 
  strokeWeight(1);
  
  for (let h_cm = 10; h_cm < alturaSimulacion_cm; h_cm += 10) {
    let y_linea_px = H - (h_cm * pixelesPorCM); 
    line(0, y_linea_px, SIM_PANEL_W, y_linea_px);
    
    fill(100); 
    textAlign(LEFT, BOTTOM); 
    textSize(12);
    // .toFixed(0) reemplaza a nf(..., 0, 0)
    text(h_cm.toFixed(0) + " cm", 10, y_linea_px - 2);
  }
}

function mostrarInstrucciones() {
  fill(50);
  textAlign(LEFT, TOP);
  textSize(14);
  text("[R] Reiniciar", 10, 20);
  text("[P] Pausar", 10, 40);
  
  // Mostrar datos
  let alturaActual_cm = (H - y_px) / pixelesPorCM;
  alturaActual_cm = max(0, alturaActual_cm);
  
  // .toFixed() reemplaza a nf()
  text("Tiempo: " + tiempoSimulado.toFixed(2) + " s", 10, 70);
  text("Altura: " + alturaActual_cm.toFixed(1) + " cm", 10, 90);
}


// --- FUNCIONES DE DIBUJO (GRÁFICA) ---

function dibujarGrafica() {
  // Dibuja el panel derecho
  fill(255); 
  noStroke();
  rect(SIM_PANEL_W, 0, GRAPH_PANEL_W, H);
  
  // --- 1. Definir el área de la gráfica ---
  let graphX1 = SIM_PANEL_W + 50; 
  let graphY1 = 50;              
  let graphX2 = W - 50;      
  let graphY2 = H - 50;     
  
  // --- 2. Dibujar los ejes ---
  stroke(0); 
  strokeWeight(2);
  line(graphX1, graphY1, graphX1, graphY2); // Eje Y
  line(graphX1, graphY2, graphX2, graphY2); // Eje X
  
  // --- 3. Dibujar etiquetas de los ejes ---
  fill(0);
  noStroke();
  textSize(14);
  textAlign(CENTER, CENTER);
  text("Tiempo (s)", (graphX1 + graphX2) / 2, graphY2 + 30);
  
  push(); // Guardar estado
  translate(graphX1 - 35, (graphY1 + graphY2) / 2);
  rotate(-HALF_PI); // Rotar texto
  text("Altura (cm)", 0, 0);
  pop(); // Restaurar estado
  
  // --- 4. Marcas del Eje Y (Altura) ---
  textAlign(RIGHT, CENTER);
  textSize(12);
  for (let h_cm = 0; h_cm <= alturaSimulacion_cm; h_cm += 20) {
    let y_plot = map(h_cm, 0, alturaSimulacion_cm, graphY2, graphY1); // Y está invertido
    text(h_cm.toFixed(0), graphX1 - 5, y_plot);
    stroke(220); 
    strokeWeight(1);
    line(graphX1, y_plot, graphX2, y_plot);
  }
  
  // --- 5. Marcas del Eje X (Tiempo) - Gráfica deslizante ---
  let tiempoVisible_s = 5.0; // Mostrar 5 segundos
  let minTiempoVisible = max(0, tiempoSimulado - tiempoVisible_s);
  let maxTiempoVisible = minTiempoVisible + tiempoVisible_s;
  
  textAlign(CENTER, TOP);
  for (let t = ceil(minTiempoVisible); t <= maxTiempoVisible; t += 1.0) {
    let x_plot = map(t, minTiempoVisible, maxTiempoVisible, graphX1, graphX2);
    text(t.toFixed(0), x_plot, graphY2 + 5);
    stroke(220);
    strokeWeight(1);
    line(x_plot, graphY1, x_plot, graphY2);
  }
  
  // --- 6. Dibujar la línea de datos ---
  if (historialDatos.length < 2) {
    return; // No hay nada que dibujar
  }
  
  stroke(255, 0, 0); // Línea roja
  strokeWeight(2);
  noFill();
  beginShape(); 
  
  for (let punto of historialDatos) {
    if (punto.t >= minTiempoVisible) {
      let x_plot = map(punto.t, minTiempoVisible, maxTiempoVisible, graphX1, graphX2);
      let y_plot = map(punto.h, 0, alturaSimulacion_cm, graphY2, graphY1); 
      vertex(x_plot, y_plot);
    }
  }
  endShape(); 
}
