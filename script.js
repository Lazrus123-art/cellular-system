const canvas = document.getElementById('neuralCanvas');
const ctx = canvas.getContext('2d');

let width, height;
function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

let currentLayout = 'circular';
let cells = [];
let particles = [];
let masterNeuron = null;
let isMasterActive = true;
let frameCount = 0;
let lastTime = performance.now();
let fps = 60;
let eatenCount = 0;

let rotationAngleY = 0;
let targetRotationAngleY = 0;
let isDragging = false;
let previousMouseX = 0;

const handPosition = { x: width / 2, y: height / 2, active: false, isPinching: false };

class Cell {
    constructor(x, y, type = 'normal', cellStyle = 0) {
        this.x = x;
        this.y = y;
        this.z = (Math.random() - 0.5) * 400;
        this.baseX = x;
        this.baseY = y;
        this.baseZ = this.z;
        this.vx = (Math.random() - 0.5) * 0.8;
        this.vy = (Math.random() - 0.5) * 0.8;
        
        this.type = type;
        this.cellStyle = cellStyle;
        this.radius = type === 'master' ? 50 : (Math.random() * 12 + 10);
        this.targetRadius = this.radius;
        this.id = Math.floor(Math.random() * 900) + 100;
        
        this.pulsePhase = Math.random() * Math.PI * 2;
        this.angle = Math.random() * Math.PI * 2;
        this.dnaHelixOffset = Math.random() * Math.PI * 2;
        this.lobes = Array.from({length: 5}, () => Math.random() * 0.4 + 0.8);
    }

    update(targetX, targetY) {
        this.pulsePhase += 0.03;
        this.radius += (this.targetRadius - this.radius) * 0.1;

        if (this.type === 'master') {
            this.x += (targetX - this.x) * 0.12;
            this.y += (targetY - this.y) * 0.12;
        } else {
            if (currentLayout === 'chessboard') {
                this.x += (this.baseX - this.x) * 0.05;
                this.y += (this.baseY - this.y) * 0.05;
            } else if (currentLayout === 'dna') {
                this.dnaHelixOffset += 0.02;
                let targetX = this.baseX + Math.sin(this.dnaHelixOffset) * 60;
                this.x += (targetX - this.x) * 0.06;
                this.y += (targetY - this.y) * 0.06;
            } else if (currentLayout === 'circular') {
                let cx = width / 2, cy = height / 2;
                this.angle += 0.003;
                let dist = Math.hypot(this.baseX - cx, this.baseY - cy);
                let targetX = cx + Math.cos(this.angle) * dist;
                let targetY = cy + Math.sin(this.angle) * dist;
                this.x += (targetX - this.x) * 0.04;
                this.y += (targetY - this.y) * 0.04;
            } else {
                this.x += this.vx;
                this.y += this.vy;
                if (this.x < 80 || this.x > width - 80) this.vx *= -1;
                if (this.y < 80 || this.y > height - 80) this.vy *= -1;
            }
        }
    }

    draw(rotAngle) {
        ctx.save();
        let cx = width / 2;
        let dx = this.x - cx;
        let rx = dx * Math.cos(rotAngle) - this.z * Math.sin(rotAngle);
        let rz = dx * Math.sin(rotAngle) + this.z * Math.cos(rotAngle);
        
        let scale = 600 / (600 + rz);
        let drawX = cx + rx * scale;
        let drawY = this.y * scale + (1 - scale) * (height / 2);
        let currentRadius = this.radius * scale + Math.sin(this.pulsePhase) * 2;

        ctx.translate(drawX, drawY);

        if (this.type === 'master') {
            let grad = ctx.createRadialGradient(0, 0, 0, 0, 0, currentRadius * 2);
            grad.addColorStop(0, 'rgba(0, 240, 255, 0.7)');
            grad.addColorStop(0.4, 'rgba(168, 85, 247, 0.3)');
            grad.addColorStop(1, 'transparent');
            
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(0, 0, currentRadius * 2, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = '#00f0ff';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            let points = 12;
            for (let i = 0; i < points; i++) {
                let a = (i / points) * Math.PI * 2;
                let r = currentRadius + Math.sin(this.pulsePhase + i) * 6;
                let px = Math.cos(a) * r;
                let py = Math.sin(a) * r;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.stroke();

            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.beginPath();
            ctx.arc(0, 0, currentRadius * 0.3, 0, Math.PI * 2);
            ctx.fill();

            const masterTag = document.getElementById('masterTag');
            masterTag.style.left = `${drawX + 50}px`;
            masterTag.style.top = `${drawY - 30}px`;
            masterTag.classList.remove('hidden');
            document.getElementById('tagScale').innerText = (this.radius / 50).toFixed(2) + 'x';
        } else {
            if (this.cellStyle === 0) {
                ctx.strokeStyle = 'rgba(0, 240, 255, 0.8)';
                ctx.fillStyle = 'rgba(0, 240, 255, 0.15)';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                for (let i = 0; i < 5; i++) {
                    let a = (i / 5) * Math.PI * 2 + this.pulsePhase * 0.2;
                    let r = currentRadius * this.lobes[i];
                    let px = Math.cos(a) * r;
                    let py = Math.sin(a) * r;
                    if (i === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                ctx.fillStyle = '#a855f7';
                ctx.fillRect(-2, -2, 4, 4);
            } else if (this.cellStyle === 1) {
                ctx.strokeStyle = 'rgba(236, 72, 153, 0.8)';
                ctx.lineWidth = 1.2;
                let rays = 8;
                for (let i = 0; i < rays; i++) {
                    let a = (i / rays) * Math.PI * 2;
                    let r1 = currentRadius * 0.3;
                    let r2 = currentRadius * (1.2 + Math.sin(this.pulsePhase + i) * 0.3);
                    ctx.beginPath();
                    ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
                    ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
                    ctx.stroke();
                }
                ctx.fillStyle = '#00f0ff';
                ctx.beginPath();
                ctx.arc(0, 0, 3, 0, Math.PI * 2);
                ctx.fill();
            } else if (this.cellStyle === 2) {
                ctx.fillStyle = 'rgba(168, 85, 247, 0.2)';
                ctx.strokeStyle = '#a855f7';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(0, 0, currentRadius, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                ctx.fillStyle = '#00f0ff';
                ctx.beginPath();
                ctx.arc(-currentRadius * 0.3, 0, currentRadius * 0.25, 0, Math.PI * 2);
                ctx.arc(currentRadius * 0.3, 0, currentRadius * 0.2, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.strokeStyle = 'rgba(0, 240, 255, 0.5)';
                ctx.lineWidth = 1;
                let boxSize = currentRadius * 2.2;
                ctx.strokeRect(-boxSize/2, -boxSize/2, boxSize, boxSize);
                ctx.fillStyle = 'rgba(0, 240, 255, 0.8)';
                ctx.font = '9px "Share Tech Mono", monospace';
                ctx.fillText(`ID:${this.id}`, -boxSize/2 + 3, -boxSize/2 - 3);
                ctx.fillStyle = '#ec4899';
                ctx.beginPath();
                ctx.arc(0, 0, currentRadius * 0.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.restore();
    }
}

function initCells() {
    cells = [];
    if (isMasterActive) {
        masterNeuron = new Cell(width / 2, height / 2, 'master');
        cells.push(masterNeuron);
    }
    let count = 48;
    for (let i = 0; i < count; i++) {
        let x, y;
        if (currentLayout === 'chessboard') {
            let cols = 8, rows = 6;
            let col = i % cols, row = Math.floor(i / cols);
            x = (width / (cols + 1)) * (col + 1) + (Math.random() - 0.5) * 20;
            y = (height / (rows + 1)) * (row + 1) + (Math.random() - 0.5) * 20;
        } else if (currentLayout === 'dna') {
            let p = i / count;
            x = width * 0.15 + p * (width * 0.7);
            y = height / 2 + Math.sin(p * Math.PI * 4) * 140;
        } else if (currentLayout === 'circular') {
            let angle = (i / count) * Math.PI * 2;
            let radius = Math.min(width, height) * 0.32;
            x = width / 2 + Math.cos(angle) * radius;
            y = height / 2 + Math.sin(angle) * radius;
        } else {
            x = Math.random() * (width - 160) + 80;
            y = Math.random() * (height - 160) + 80;
        }
        cells.push(new Cell(x, y, 'normal', i % 4));
    }
    updateNodeCounter();
}

class Spark {
    constructor(x, y, color = '#00f0ff') {
        this.x = x;
        this.y = y;
        let angle = Math.random() * Math.PI * 2;
        let speed = Math.random() * 5 + 2;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.alpha = 1;
        this.color = color;
        this.size = Math.random() * 3 + 1;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.alpha -= 0.025;
    }
    draw() {
        ctx.save();
        ctx.globalAlpha = Math.max(this.alpha, 0);
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.size, this.size);
        ctx.restore();
    }
}

const videoElement = document.getElementById('webcamVideo');
const hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});

hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.65,
    minTrackingConfidence: 0.65
});

hands.onResults((results) => {
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        document.getElementById('gestureStatus').innerText = '手势正常 [Tracking]';
        const landmarks = results.multiHandLandmarks[0];
        const indexTip = landmarks[8];
        const thumbTip = landmarks[4];

        handPosition.x = (1 - indexTip.x) * width;
        handPosition.y = indexTip.y * height;
        handPosition.active = true;

        let pinchDist = Math.hypot(indexTip.x - thumbTip.x, indexTip.y - thumbTip.y);
        if (pinchDist < 0.06) {
            targetRotationAngleY += 0.04;
            document.getElementById('gestureStatus').innerText = '手势捏合：360°旋转中';
        }
    } else {
        document.getElementById('gestureStatus').innerText = '未检测到手势 (鼠标兜底)';
        handPosition.active = false;
    }
});

const camera = new Camera(videoElement, {
    onFrame: async () => { await hands.send({ image: videoElement }); },
    width: 640, height: 480
});

camera.start().catch(() => {
    document.getElementById('gestureStatus').innerText = '无摄像头 (鼠标交互模式)';
});

window.addEventListener('mousedown', (e) => {
    isDragging = true;
    previousMouseX = e.clientX;
});
window.addEventListener('mousemove', (e) => {
    if (isDragging) {
        let deltaX = e.clientX - previousMouseX;
        targetRotationAngleY += deltaX * 0.005;
        previousMouseX = e.clientX;
    }
    if (!handPosition.active) {
        handPosition.x = e.clientX;
        handPosition.y = e.clientY;
    }
});
window.addEventListener('mouseup', () => { isDragging = false; });

function checkCellConsumption() {
    if (!masterNeuron) return;
    for (let i = cells.length - 1; i >= 0; i--) {
        let cell = cells[i];
        if (cell.type === 'master') continue;

        let dist = Math.hypot(masterNeuron.x - cell.x, masterNeuron.y - cell.y);
        if (dist < masterNeuron.radius + cell.radius * 0.5) {
            for (let p = 0; p < 15; p++) {
                particles.push(new Spark(cell.x, cell.y, cell.cellStyle === 1 ? '#ec4899' : '#00f0ff'));
            }
            masterNeuron.targetRadius = Math.min(masterNeuron.targetRadius + 1.8, 110);
            cells.splice(i, 1);
            eatenCount++;

            document.getElementById('eatenCounter').innerText = eatenCount;
            document.getElementById('tagState').innerText = 'Consuming Cell!';
            updateNodeCounter();

            setTimeout(() => {
                if (document.getElementById('tagState')) {
                    document.getElementById('tagState').innerText = 'Seeking Cells';
                }
            }, 800);
        }
    }
}

function setLayout(layout) {
    currentLayout = layout;
    ['circular', 'dna', 'chessboard', 'random'].forEach(l => {
        const btn = document.getElementById(`btn-${l}`);
        if (btn) {
            if (l === layout) btn.classList.add('active');
            else btn.classList.remove('active');
        }
    });
    initCells();
}

function toggleSeedMaster() {
    isMasterActive = !isMasterActive;
    const btn = document.getElementById('btn-seed');
    if (isMasterActive) {
        btn.classList.add('active');
        masterNeuron = new Cell(handPosition.x, handPosition.y, 'master');
        cells.unshift(masterNeuron);
    } else {
        btn.classList.remove('active');
        cells = cells.filter(c => c.type !== 'master');
        masterNeuron = null;
        document.getElementById('masterTag').classList.add('hidden');
    }
    updateNodeCounter();
}

function resetView() {
    targetRotationAngleY = 0;
    if (masterNeuron) masterNeuron.targetRadius = 50;
}

function clearScreen() {
    cells = [];
    masterNeuron = null;
    isMasterActive = false;
    document.getElementById('btn-seed').classList.remove('active');
    document.getElementById('masterTag').classList.add('hidden');
    updateNodeCounter();
}

function updateNodeCounter() {
    document.getElementById('nodeCounter').innerText = cells.length;
}

function animate(currentTime) {
    frameCount++;
    if (currentTime - lastTime >= 1000) {
        fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        document.getElementById('fpsCounter').innerText = fps;
        frameCount = 0;
        lastTime = currentTime;
    }

    rotationAngleY += (targetRotationAngleY - rotationAngleY) * 0.08;
    let displayAngle = Math.round(((rotationAngleY % (Math.PI * 2)) * 180 / Math.PI) % 360);
    if (displayAngle < 0) displayAngle += 360;
    document.getElementById('angleCounter').innerText = `${displayAngle}°`;

    ctx.fillStyle = 'rgba(2, 5, 14, 0.35)';
    ctx.fillRect(0, 0, width, height);

    for (let i = 0; i < cells.length; i++) {
        for (let j = i + 1; j < cells.length; j++) {
            let c1 = cells[i], c2 = cells[j];
            let dist = Math.hypot(c1.x - c2.x, c1.y - c2.y);
            let threshold = (c1.type === 'master' || c2.type === 'master') ? 260 : 130;

            if (dist < threshold) {
                let opacity = (1 - dist / threshold) * 0.4;
                ctx.strokeStyle = (c1.type === 'master' || c2.type === 'master') 
                    ? `rgba(0, 240, 255, ${opacity * 1.5})` 
                    : `rgba(168, 85, 247, ${opacity})`;
                ctx.lineWidth = (c1.type === 'master' || c2.type === 'master') ? 1.5 : 0.7;
                
                ctx.beginPath();
                ctx.moveTo(c1.x, c1.y);
                let midX = (c1.x + c2.x) / 2 + (Math.sin(currentTime * 0.002 + i) * 8);
                let midY = (c1.y + c2.y) / 2 + (Math.cos(currentTime * 0.002 + j) * 8);
                ctx.quadraticCurveTo(midX, midY, c2.x, c2.y);
                ctx.stroke();
            }
        }
    }

    checkCellConsumption();

    let targetX = handPosition.active || true ? handPosition.x : width / 2;
    let targetY = handPosition.active || true ? handPosition.y : height / 2;

    cells.forEach(cell => {
        if (cell.type === 'master') cell.update(targetX, targetY);
        else cell.update(0, 0);
        cell.draw(rotationAngleY);
    });

    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        particles[i].draw();
        if (particles[i].alpha <= 0) particles.splice(i, 1);
    }

    requestAnimationFrame(animate);
}

window.onload = function() {
    setLayout('circular');
    requestAnimationFrame(animate);
};