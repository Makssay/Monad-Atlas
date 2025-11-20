const canvas = document.getElementById("galaxy-canvas");
const ctx = canvas.getContext("2d");

let w, h;
let particles = [];
let cosmonauts = [];

const NUM_PARTICLES = 90;
const MAX_DISTANCE = 140;

let mouse = { x: null, y: null };

function resize() {
  w = canvas.width = window.innerWidth;
  h = canvas.height = window.innerHeight;
}
window.addEventListener("resize", resize);
resize();


const colors = [
  [110, 80, 255],   // violet
  [62, 234, 255],   // cyan
  [200, 80, 255]    // magenta
];

function getNeonColor(t) {
  const i = Math.floor(t) % colors.length;
  const j = (i + 1) % colors.length;
  const f = t % 1;

  return `rgb(
    ${colors[i][0] * (1 - f) + colors[j][0] * f},
    ${colors[i][1] * (1 - f) + colors[j][1] * f},
    ${colors[i][2] * (1 - f) + colors[j][2] * f}
  )`;
}


class Particle {
  constructor() {
    this.reset();
    this.colorOffset = Math.random() * 3;
  }

  reset() {
    this.x = Math.random() * w;
    this.y = Math.random() * h;
    this.vx = (Math.random() - 0.5) * 0.3;
    this.vy = (Math.random() - 0.5) * 0.3;
    this.size = 1 + Math.random() * 2;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;

    if (this.x < 0 || this.x > w) this.vx *= -1;
    if (this.y < 0 || this.y > h) this.vy *= -1;
  }

  draw(t) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);

    const c = getNeonColor(t + this.colorOffset);
    ctx.fillStyle = c;

    ctx.shadowBlur = 12;
    ctx.shadowColor = c;
    ctx.fill();

    ctx.shadowBlur = 0;
  }
}


const imgRich = new Image();
const imgSpam = new Image();
imgRich.src = "icons/rich.png";
imgSpam.src = "icons/spam.png";

class Cosmonaut {
  constructor(img) {
    this.img = img;
    this.size = 140;
    this.angle = Math.random() * 360;
    this.va = (Math.random() - 0.5) * 0.001;
    this.reset();
  }

  reset() {
    this.x = Math.random() * w;
    this.y = Math.random() * h;
    this.vx = (Math.random() - 0.5) * 0.08;
    this.vy = (Math.random() - 0.5) * 0.08;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.angle += this.va;

    const padding = 100;  


    if (this.x < padding) {
      this.x = padding;
      this.vx *= -1;
    }

    if (this.x > w - padding) {
      this.x = w - padding;
      this.vx *= -1;
    }

    if (this.y < padding) {
      this.y = padding;
      this.vy *= -1;
    }

    if (this.y > h - padding) {
      this.y = h - padding;
      this.vy *= -1;
    }

    if (mouse.x !== null) {
      const dx = this.x - mouse.x;
      const dy = this.y - mouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 80) {
        this.x += dx * 0.01;
        this.y += dy * 0.01;
      }
    }
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    ctx.shadowBlur = 35;
    ctx.shadowColor = "rgba(120,80,255,0.55)";

    const half = this.size / 2;
    ctx.drawImage(this.img, -half, -half, this.size, this.size);

    ctx.restore();
  }
}


function init() {
  particles = [];
  cosmonauts = [];

  for (let i = 0; i < NUM_PARTICLES; i++) particles.push(new Particle());

  cosmonauts.push(new Cosmonaut(imgRich));
  cosmonauts.push(new Cosmonaut(imgSpam));
}

init();


function drawLines(t) {
  for (let a = 0; a < particles.length; a++) {
    for (let b = a + 1; b < particles.length; b++) {
      const dx = particles[a].x - particles[b].x;
      const dy = particles[a].y - particles[b].y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < MAX_DISTANCE) {
        ctx.beginPath();
        ctx.strokeStyle = getNeonColor(t + a * 0.02);
        ctx.globalAlpha = (1 - dist / MAX_DISTANCE) * 0.3;
        ctx.moveTo(particles[a].x, particles[a].y);
        ctx.lineTo(particles[b].x, particles[b].y);
        ctx.stroke();
      }
    }
  }
  ctx.globalAlpha = 1;
}


let t = 0;

function animate() {
  t += 0.01;

  ctx.clearRect(0, 0, w, h);

  particles.forEach(p => {
    p.update();
    p.draw(t);
  });

  drawLines(t);

  cosmonauts.forEach(c => {
    c.update();
    c.draw();
  });

  requestAnimationFrame(animate);
}

animate();


window.addEventListener("mousemove", e => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});

window.addEventListener("mouseout", () => {
  mouse.x = null;
  mouse.y = null;
});
