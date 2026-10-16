const canvas = document.getElementById('neuralCanvas');
const ctx = canvas.getContext('2d');

let width, height;
function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// 核心状态变量
let currentLayout = 'circular';
let cells = [];
let particles = [];
let masterNeuron = null;
let isMasterActive = true;
let frameCount = 0;
let lastTime = performance.now();
let fps = 60;

// 手势识别坐标对象
const handPosition = { x: width / 2, y: height / 2, active: false, isPinching: false };

// 细胞类定义
class Cell {
    constructor(x, y, type = 'normal') {
        this.x = x;
        this.y = y;
        this.baseX = x;
        this.baseY = y;
        this.vx = (Math.random() - 0.5) * 0.8;
        this.vy = (Math.random() - 0.5) * 0.8;
        this.radius = type === 'master' ? 45 : (Math.random() * 12 + 8);
        this.type = type;
        this.id = Math.floor(Math.random() * 900) + 10;
        this.color = type === 'master' ? '#00f0ff' : (Math.random() > 0.4 ? '#00f0ff' : '#a855f7');
        this.pulsePhase = Math.random() * Math.PI * 2;
        this.angle = Math.random() * Math.PI * 2;
        this.dnaHelixOffset = Math.random() * Math.PI * 2;
    }

    update(targetX, targetY) {
        this.pulsePhase += 0.04;

        if (this.type === 'master') {
            // 平滑跟随手势定位
            this.x += (targetX - this.x) * 0.15;
            this.y += (targetY - this.y) * 0.15;
        } else {
            if (currentLayout === 'chessboard') {
                this.x += (this.baseX - this.x) * 0.05;
                this.y += (this.baseY - this.y) * 0.05;
            } else if (currentLayout === 'dna') {
                this.dnaHelixOffset += 0.03;
                let targetX = this.baseX + Math.sin(this.dnaHelixOffset) * 45;
                this.x += (targetX - this.x) * 0.08;
                this.y += (this.baseY - this.y) * 0.08;
            } else if (currentLayout === 'circular') {
                let cx = width / 2, cy = height / 2;
                this.angle += 0.005;
                let dist = Math.hypot(this.baseX - cx, this.baseY - cy);
                let targetX = cx + Math.cos(this.angle) * dist;
                let targetY = cy + Math.sin(this.angle) * dist;
                this.x += (targetX - this.x) * 0.05;
                this.y += (targetY - this.y) * 0.05;
            } else {
                this.x += this.vx;
                this.y += this.vy;
                if (this.x < 50 || this.x > width - 50) this.vx *= -1;
                if (this.y < 50 || this.y > height - 50) this.vy *= -1;
            }
        }
    }

    draw() {
        ctx.save();
        let currentRadius = this.radius + Math.sin(this.pulsePhase) * 2;

        if (this.type === 'master') {
            let grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, currentRadius * 2);
            grad.addColorStop(0, 'rgba(0, 240, 255, 0.6)');
            grad.addColorStop(0.5, 'rgba(168, 85, 247, 0.2)');
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(this.x, this.y, currentRadius * 2, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = '#00f0ff';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(this.x, this.y, currentRadius, 0, Math.PI * 2);
            ctx.stroke();

            for (let i = 0; i < 8; i++) {
                let angle = (i / 8) * Math.PI * 2 + this.pulsePhase * 0.2;
                let x2 = this.x + Math.cos(angle) * (currentRadius * 1.8);
                let y2 = this.y + Math.sin(angle) * (currentRadius * 1.8);
                ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(this.x + Math.cos(angle) * currentRadius, this.y + Math.sin(angle) * currentRadius);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            }

            const masterTag = document.getElementById('masterTag');
            masterTag.style.left = `${this.x + 55}px`;
            masterTag.style.top = `${this.y - 30}px`;
            masterTag.classList.remove('hidden');
        } else {
            ctx.fillStyle = this.color;
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(this.x, this.y, currentRadius * 0.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;

            if (this.id % 3 === 0) {
                ctx.strokeStyle = 'rgba(0, 240, 255, 0.3)';
                ctx.strokeRect(this.x + 8, this.y - 14, 54, 22);
                ctx.fillStyle = 'rgba(0, 240, 255, 0.8)';
                ctx.font = '9px "Share Tech Mono", monospace';
                ctx.fillText(`ID:${this.id}`, this.x + 11, this.y - 2);
            }
        }
        ctx.restore();
    }
}

// 初始化细胞
function initCells() {
    cells = [];
    if (isMasterActive) {
        masterNeuron = new Cell(width / 2, height / 2, 'master');
        cells.push(masterNeuron);
    }
    let count = 45;
    for (let i = 0; i < count; i++) {
        let x, y;
        if (currentLayout === 'chessboard') {
            let cols = 9, rows = 5;
            let col = i % cols, row = Math.floor(i / cols);
            x = (width / (cols + 1)) * (col + 1) + (Math.random() - 0.5) * 20;
            y = (height / (rows + 2)) * (row + 1) + (Math.random() - 0.5) * 20;
        } else if (currentLayout === 'dna') {
            let p = i / count;
            x = width * 0.2 + p * (width * 0.6);
            y = height / 2 + Math.sin(p * Math.PI * 4) * 120;
        } else if (currentLayout === 'circular') {
            let angle = (i / count) * Math.PI * 2;
            let radius = Math.min(width, height) * 0.32;
            x = width / 2 + Math.cos(angle) * radius;
            y = height / 2 + Math.sin(angle) * radius;
        } else {
            x = Math.random() * (width - 100) + 50;
            y = Math.random() * (height - 100) + 50;
        }
        cells.push(new Cell(x, y, 'normal'));
    }
    updateNodeCounter();
}

function setLayout(layout) {
    currentLayout = layout;
    ['chessboard', 'dna', 'circular', 'random'].forEach(l => {
        const btn = document.getElementById(`btn-${l}`);
        if (l === layout) btn.classList.add('active');
        else btn.classList.remove('active');
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

function clearScreen() {
    cells = [];
    masterNeuron = null;
    isMasterActive = false;
    document.getElementById('btn-seed').classList.remove('active');
    document.getElementById('masterTag').classList.add('hidden');
    updateNodeCounter();
}

function spawnCellAt(x, y) {
    if (cells.length > 120) return;
    cells.push(new Cell(x, y, 'normal'));
    updateNodeCounter();
}

function updateNodeCounter() {
    document.getElementById('nodeCounter').innerText = cells.length;
}

// 放电粒子
class Spark {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        let angle = Math.random() * Math.PI * 2;
        let speed = Math.random() * 4 + 1;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.alpha = 1;
        this.color = Math.random() > 0.5 ? '#00f0ff' : '#ec4899';
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.alpha -= 0.03;
    }
    draw() {
        ctx.save();
        ctx.globalAlpha = Math.max(this.alpha, 0);
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, 2, 2);
        ctx.restore();
    }
}

// MediaPipe 手势识别初始化
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
        document.getElementById('gestureStatus').innerText = '手势已连接 [Connected]';
        const landmarks = results.multiHandLandmarks[0];
        
        // 获取食指指尖 (第 8 号关节)
        const indexTip = landmarks[8];
        // 获取拇指指尖 (第 4 号关节)
        const thumbTip = landmarks[4];

        // 坐标映射并左右镜像反转
        handPosition.x = (1 - indexTip.x) * width;
        handPosition.y = indexTip.y * height;
        handPosition.active = true;

        // 检测捏合手势（拇指与食指距离过近）
        let pinchDist = Math.hypot(indexTip.x - thumbTip.x, indexTip.y - thumbTip.y);
        if (pinchDist < 0.05) {
            if (!handPosition.isPinching) {
                handPosition.isPinching = true;
                spawnCellAt(handPosition.x, handPosition.y); // 捏合时在空中生成小细胞
            }
        } else {
            handPosition.isPinching = false;
        }
    } else {
        document.getElementById('gestureStatus').innerText = '寻找手势中...';
        handPosition.active = false;
    }
});

const camera = new Camera(videoElement, {
    onFrame: async () => {
        await hands.send({ image: videoElement });
    },
    width: 640,
    height: 480
});
camera.start().catch(err => {
    console.log("摄像头启动提示：若未连接摄像头，系统将使用默认居中坐标。");
});

// 主循环
function animate(currentTime) {
    frameCount++;
    if (currentTime - lastTime >= 1000) {
        fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        document.getElementById('fpsCounter').innerText = fps;
        frameCount = 0;
        lastTime = currentTime;
    }

    ctx.fillStyle = 'rgba(2, 5, 14, 0.35)';
    ctx.fillRect(0, 0, width, height);

    // 绘制神经元连线
    for (let i = 0; i < cells.length; i++) {
        for (let j = i + 1; j < cells.length; j++) {
            let c1 = cells[i], c2 = cells[j];
            let dist = Math.hypot(c1.x - c2.x, c1.y - c2.y);
            let threshold = (c1.type === 'master' || c2.type === 'master') ? 240 : 130;

            if (dist < threshold) {
                let opacity = (1 - dist / threshold) * 0.45;
                ctx.strokeStyle = c1.type === 'master' || c2.type === 'master' ? `rgba(0, 240, 255, ${opacity * 1.5})` : `rgba(168, 85, 247, ${opacity})`;
                ctx.lineWidth = c1.type === 'master' || c2.type === 'master' ? 1.5 : 0.8;
                
                ctx.beginPath();
                ctx.moveTo(c1.x, c1.y);
                let midX = (c1.x + c2.x) / 2 + (Math.sin(currentTime * 0.002 + i) * 10);
                let midY = (c1.y + c2.y) / 2 + (Math.cos(currentTime * 0.002 + j) * 10);
                ctx.quadraticCurveTo(midX, midY, c2.x, c2.y);
                ctx.stroke();

                if ((c1.type === 'master' || c2.type === 'master') && Math.random() < 0.03) {
                    particles.push(new Spark(midX, midY));
                }
            }
        }
    }

    // 更新细胞跟随手势坐标
    let targetX = handPosition.active ? handPosition.x : width / 2;
    let targetY = handPosition.active ? handPosition.y : height / 2;

    cells.forEach(cell => {
        if (cell.type === 'master') {
            cell.update(targetX, targetY);
        } else {
            cell.update(0, 0);
        }
        cell.draw();
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