// --- Variables de la Pelota ---
let x, y;          // Posición
let xSpeed, ySpeed; // Velocidad
let radio = 25;    // Radio (mitad del diámetro)

// --- SETUP (se ejecuta una vez) ---
function setup() {
  createCanvas(400, 400); // El lienzo
  
  // Posición inicial (centro)
  x = width / 2;
  y = height / 2;
  
  // Velocidad inicial aleatoria
  xSpeed = random(-4, 4);
  ySpeed = random(-4, 4);
}

// --- DRAW (se ejecuta en bucle) ---
function draw() {
  background(240); // Fondo gris claro

  // 1. Mover la pelota
  x = x + xSpeed;
  y = y + ySpeed;

  // 2. Comprobar rebotes en los bordes
  // Si golpea el borde derecho O el izquierdo
  if (x > width - radio || x < radio) {
    xSpeed = xSpeed * -1; // Invertir velocidad X
  }
  // Si golpea el borde inferior O el superior
  if (y > height - radio || y < radio) {
    ySpeed = ySpeed * -1; // Invertir velocidad Y
  }

  // 3. Dibujar la pelota
  fill(255, 0, 0); // Color rojo
  noStroke();
  ellipse(x, y, radio * 2, radio * 2); // Diámetro = radio * 2
}

// --- INTERACCIÓN ---
// Se ejecuta cada vez que haces clic
function mousePressed() {
  // Le da una nueva velocidad aleatoria
  xSpeed = random(-5, 5);
  ySpeed = random(-5, 5);
}
