const canvas = document.getElementById('neuralCanvas');
const ctx = canvas.getContext('2d');

let width, height;
function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// 核心变量
let currentLayout = 'dna';
let cells = [];
let particles = [];
let masterNeuron = null;
let isMasterActive = true;
let frameCount = 0;
let lastTime = performance.now();
let fps = 60;
let eatenCount = 0;

// 360 度视角旋转
let rotationAngleY = 0;
let targetRotationAngleY = 0;

// 手势识别坐标对象
const handPosition = { x: width / 2, y: height / 2, active: false };
let lastSpawnTime = 0;

// 细胞类定义
class Cell {
    constructor(x, y, type = 'normal', cellStyle = 0) {
        this.x = x;
        this.y = y;
        this.z = (Math.random() - 0.5) * 150; // 限制Z轴，避免越界
        this.baseX = x;
        this.baseY = y;
        this.vx = (Math.random() - 0.5) * 0.6;
        this.vy = (Math.random() - 0.5) * 0.6;
        
        this.type = type; // 'master' 或 'normal'
        this.cellStyle = cellStyle; // 0:伪足, 1:烟花, 2:多核线粒体, 3:科幻观察框
        this.radius = type === 'master' ? 45 : (Math.random() * 8 + 12);
        this.targetRadius = this.radius;
        this.id = Math.floor(Math.random() * 900) + 100;
        
        this.pulsePhase = Math.random() * Math.PI * 2;
        this.dnaOffset = Math.random() * Math.PI * 2;
        this.lobes = Array.from({length: 5}, () => Math.random() * 0.3 + 0.85);
    }

    update(targetX, targetY) {
        this.pulsePhase += 0.03;
        this.radius += (this.targetRadius - this.radius) * 0.1;

        if (this.type === 'master') {
            // 平滑跟随手势或居中
            this.x += (targetX - this.x) * 0.12;
            this.y += (targetY - this.y) * 0.12;
            this.x = Math.max(80, Math.min(width - 80, this.x));
            this.y = Math.max(80, Math.min(height - 80, this.y));
        } else {
            // 规整阵列移动，严格参照画面中心
            if (currentLayout === 'chessboard') {
                this.x += (this.baseX - this.x) * 0.08;
                this.y += (this.baseY - this.y) * 0.08;
            } else if (currentLayout === 'dna') {
                this.dnaOffset += 0.025;
                let targetX = this.baseX;
                let targetY = this.baseY + Math.sin(this.dnaOffset) * 20;
                this.x += (targetX - this.x) * 0.08;
                this.y += (targetY - this.y) * 0.08;
            } else if (currentLayout === 'circular') {
                let cx = width / 2, cy = height / 2;
                let dist = Math.hypot(this.baseX - cx, this.baseY - cy);
                let currentAngle = Math.atan2(this.baseY - cy, this.baseX - cx) + 0.0025;
                let targetX = cx + Math.cos(currentAngle) * dist;
                let targetY = cy + Math.sin(currentAngle) * dist;
                this.baseX = targetX;
                this.baseY = targetY;
                this.x += (targetX - this.x) * 0.08;
                this.y += (targetY - this.y) * 0.08;
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
        
        // 修正后的 3D 透视转换公式：以画布精确中央 (width/2, height/2) 为旋转原点
        let cx = width / 2;
        let cy = height / 2;
        
        let dx = this.x - cx;
        let dy = this.y - cy;
        
        let rx = dx * Math.cos(rotAngle) - this.z * Math.sin(rotAngle);
        let rz = dx * Math.sin(rotAngle) + this.z * Math.cos(rotAngle);
        
        let scale = 600 / (600 + rz);
        let drawX = cx + rx * scale;
        let drawY = cy + dy * scale; // 完美垂直居中！
        
        let currentRadius = this.radius * scale + Math.sin(this.pulsePhase) * 1.5;

        ctx.translate(drawX, drawY);

        if (this.type === 'master') {
            // 大神经元
            let grad = ctx.createRadialGradient(0, 0, 0, 0, 0, currentRadius * 2.2);
            grad.addColorStop(0, 'rgba(0, 240, 255, 0.85)');
            grad.addColorStop(0.4, 'rgba(168, 85, 247, 0.35)');
            grad.addColorStop(1, 'transparent');
            
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(0, 0, currentRadius * 2.2, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = '#00f0ff';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(0, 0, currentRadius, 0, Math.PI * 2);
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(0, 0, currentRadius * 0.3, 0, Math.PI * 2);
            ctx.fill();

            // 悬浮 HUD 标签跟随
            const masterTag = document.getElementById('masterTag');
            if (masterTag) {
                masterTag.style.left = `${drawX + 50}px`;
                masterTag.style.top = `${drawY - 20}px`;
                masterTag.classList.remove('hidden');
                document.getElementById('tagScale').innerText = (this.radius / 45).toFixed(2) + 'x';
            }
        } else {
            // 小细胞 (Hajime Kutsuwada 风格)
            if (this.cellStyle === 0) {
                ctx.strokeStyle = 'rgba(0, 240, 255, 0.9)';
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
            } else if (this.cellStyle === 1) {
                ctx.strokeStyle = 'rgba(236, 72, 153, 0.9)';
                ctx.lineWidth = 1.2;
                let rays = 8;
                for (let i = 0; i < rays; i++) {
                    let a = (i / rays) * Math.PI * 2;
                    let r1 = currentRadius * 0.2;
                    let r2 = currentRadius * (1.1 + Math.sin(this.pulsePhase + i) * 0.2);
                    ctx.beginPath();
                    ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
                    ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
                    ctx.stroke();
                }
            } else if (this.cellStyle === 2) {
                ctx.fillStyle = 'rgba(168, 85, 247, 0.25)';
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
                ctx.strokeStyle = 'rgba(0, 240, 255, 0.7)';
                ctx.lineWidth = 1;
                let boxSize = currentRadius * 2.2;
                ctx.strokeRect(-boxSize/2, -boxSize/2, boxSize, boxSize);
                ctx.fillStyle = 'rgba(0, 240, 255, 0.9)';
                ctx.font = '9px "Share Tech Mono", monospace';
                ctx.fillText(`ID:${this.id}`, -boxSize/2 + 3, -boxSize/2 - 3);
                ctx.fillStyle = '#ec4899';
                ctx.beginPath();
                ctx.arc(0, 0, currentRadius * 0.4, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.restore();
    }
}

// 严谨居中的阵列算法
function initCells() {
    cells = [];
    if (isMasterActive) {
        masterNeuron = new Cell(width / 2, height / 2, 'master');
        cells.push(masterNeuron);
    }
    
    let count = 40;
    let cx = width / 2;
    let cy = height / 2;

    for (let i = 0; i < count; i++) {
        let x, y;
        if (currentLayout === 'chessboard') {
            // 完美居中的 8x5 网格矩阵
            let cols = 8, rows = 5;
            let col = i % cols;
            let row = Math.floor(i / cols);
            let spacingX = 110;
            let spacingY = 85;
            let startX = cx - ((cols - 1) * spacingX) / 2;
            let startY = cy - ((rows - 1) * spacingY) / 2;
            x = startX + col * spacingX;
            y = startY + row * spacingY;
        } else if (currentLayout === 'dna') {
            // 完美居中的 DNA 双螺旋
            let p = (i / count) - 0.5; // -0.5 到 0.5 保证以屏幕中心为中轴
            let strand = i % 2 === 0 ? 1 : -1;
            x = cx + p * (width * 0.65);
            y = cy + strand * Math.sin(p * Math.PI * 4) * 110;
        } else if (currentLayout === 'circular') {
            // 居中同心圆
            let angle = (i / count) * Math.PI * 2;
            let radius = Math.min(width, height) * 0.28;
            x = cx + Math.cos(angle) * radius;
            y = cy + Math.sin(angle) * radius;
        } else {
            x = Math.random() * (width - 300) + 150;
            y = Math.random() * (height - 300) + 150;
        }
        cells.push(new Cell(x, y, 'normal', i % 4));
    }
    updateNodeCounter();
}

function spawnCellAt(x, y) {
    if (cells.length > 120) return;
    let style = Math.floor(Math.random() * 4);
    cells.push(new Cell(x, y, 'normal', style));
    updateNodeCounter();
}

class Spark {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        let angle = Math.random() * Math.PI * 2;
        let speed = Math.random() * 5 + 2;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.alpha = 1;
        this.size = Math.random() * 3 + 1;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.alpha -= 0.03;
    }
    draw() {
        ctx.save();
        ctx.globalAlpha = Math.max(this.alpha, 0);
        ctx.fillStyle = '#00f