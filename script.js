const canvas = document.getElementById('neuralCanvas');
const ctx = canvas.getContext('2d');

let width, height;
function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// 核心系统状态
let currentLayout = 'circular';
let cells = [];
let particles = [];
let explosionParticles = [];
let lockedCell = null;        // 被手势/点击锁定的细胞
let isViewModel = false;      // 【查看模型】状态（全景缩放旋转模式）
let globalScale = 1.0;
let globalRotation = 0.0;
let frameCount = 0;
let lastTime = performance.now();
let fps = 60;

const handPos = { x: width / 2, y: height / 2, active: false, isPinching: false, isOpenPalm: false };

// 高保真细胞类：支持多种生物形态（植物切片多边形、神经元突触、复合细胞膜）
class Cell {
    constructor(x, y, type = 'normal', subType = 0) {
        this.x = x;
        this.y = y;
        this.baseX = x;
        this.baseY = y;
        this.vx = (Math.random() - 0.5) * 0.6;
        this.vy = (Math.random() - 0.5) * 0.6;
        this.radius = type === 'master' ? 55 : (Math.random() * 18 + 14);
        this.type = type; // 'master', 'normal'
        this.subType = subType; // 0: 神经元细胞, 1: 植物细胞切片(多边形), 2: 膜状复合细胞
        this.id = Math.floor(Math.random() * 900) + 100;
        this.age = Math.floor(Math.random() * 60) + 10;
        this.scaleAnim = 1.0;
        this.targetScale = 1.0;
        this.pulsePhase = Math.random() * Math.PI * 2;
        this.angle = Math.random() * Math.PI * 2;
        this.dnaOffset = Math.random() * Math.PI * 2;
    }

    update() {
        this.pulsePhase += 0.03;
        this.scaleAnim += (this.targetScale - this.scaleAnim) * 0.1;

        if (this.type === 'master') {
            if (handPos.active && !lockedCell) {
                this.x += (handPos.x - this.x) * 0.1;
                this.y += (handPos.y - this.y) * 0.1;
            }
        } else if (this === lockedCell) {
            // 被锁定的细胞跟随手势移动并放大
            this.targetScale = 2.2;
            this.x += (handPos.x - this.x) * 0.15;
            this.y += (handPos.y - this.y) * 0.15;
        } else {
            this.targetScale = 1.0;
            if (currentLayout === 'chessboard') {
                this.x += (this.baseX - this.x) * 0.05;
                this.y += (this.baseY - this.y) * 0.05;
            } else if (currentLayout === 'dna') {
                this.dnaOffset += 0.025;
                let targetX = this.baseX + Math.sin(this.dnaOffset) * 50;
                this.x += (targetX - this.x) * 0.08;
                this.y += (this.baseY - this.y) * 0.08;
            } else if (currentLayout === 'circular') {
                let cx = width / 2, cy = height / 2;
                this.angle += 0.004;
                let dist = Math.hypot(this.baseX - cx, this.baseY - cy);
                let tx = cx + Math.cos(this.angle) * dist;
                let ty = cy + Math.sin(this.angle) * dist;
                this.x += (tx - this.x) * 0.05;
                this.y += (ty - this.y) * 0.05;
            } else {
                this.x += this.vx;
                this.y += this.vy;
                if (this.x < 60 || this.x > width - 60) this.vx *= -1;
                if (this.y < 60 || this.y > height - 60) this.vy *= -1;
            }
        }
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(this.scaleAnim, this.scaleAnim);

        let r = this.radius;

        if (this.type === 'master' || this.subType === 0) {
            // 样式 0：发光神经元细胞（带多条纤维突触）
            let grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 1.8);
            grad.addColorStop(0, 'rgba(0, 240, 255, 0.6)');
            grad.addColorStop(0.5, 'rgba(168, 85, 247, 0.25)');
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(0, 0, r * 1.8, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = '#00f0ff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, r * 0.7, 0, Math.PI * 2);
            ctx.stroke();

            // 神经元突触线条
            for (let i = 0; i < 6; i++) {
                let angle = (i / 6) * Math.PI * 2 + this.pulsePhase * 0.2;
                ctx.strokeStyle = 'rgba(0, 240, 255, 0.5)';
                ctx.beginPath();
                ctx.moveTo(Math.cos(angle) * (r * 0.7), Math.sin(angle) * (r * 0.7));
                ctx.lineTo(Math.cos(angle) * (r * 1.6), Math.sin(angle) * (r * 1.6));
                ctx.stroke();
            }
        } else if (this.subType === 1) {
            // 样式 1：植物细胞切片风格（多边形蜂窝状 + 细胞核）
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 1.5;
            ctx.fillStyle = 'rgba(14, 116, 144, 0.35)';
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                let a = (i / 6) * Math.PI * 2;
                let px = Math.cos(a) * r;
                let py = Math.sin(a) * r;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // 内部细胞核
            ctx.fillStyle = '#f472b6';
            ctx.beginPath();
            ctx.arc(0, 0, r * 0.3, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // 样式 2：圆润细胞膜结构（类似高倍镜下的活细胞）
            ctx.strokeStyle = '#a855f7';
            ctx.lineWidth = 2;
            ctx.fillStyle = 'rgba(168, 85, 247, 0.2)';
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // 内部微小颗粒
            ctx.fillStyle = '#00f0ff';
            ctx.beginPath();
            ctx.arc(r * 0.3, -r * 0.2, 3, 0, Math.PI * 2);
            ctx.arc(-r * 0.2, r * 0.3, 2, 0, Math.PI * 2);
            ctx.fill();
        }

        // 数据悬浮框
        if (this.id % 2 === 0 || this.type === 'master') {
            ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
            ctx.strokeRect(r + 6, -12, 50, 20);
            ctx.fillStyle = 'rgba(0, 240, 255, 0.9)';
            ctx.font = '9px "Share Tech Mono", monospace';
            ctx.fillText(`ID:${this.id}`, r + 10, 2);
        }

        ctx.restore();
    }
}

// 爆炸粒子（用于手掌张开时的细胞粒子爆发效果）
class ExplosionParticle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        let angle = Math.random() * Math.PI * 2;
        let speed = Math.random() * 6 + 2;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.alpha = 1.0;
        this.color = Math.random() > 0.5 ? '#00f0ff' : '#f472b6';
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
        ctx.beginPath();
        ctx.arc(this.x, this.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// 初始化布局
function initCells() {
    cells = [];
    let master = new Cell(width / 2, height / 2, 'master', 0);
    cells.push(master);

    let count = 35;
    for (let i = 0; i < count; i++) {
        let x, y;
        let subT = i % 3;
        if (currentLayout === 'chessboard') {
            let cols = 8, rows = 5;
            let col = i % cols, row = Math.floor(i / cols);
            x = (width / (cols + 1)) * (col + 1) + (Math.random() - 0.5) * 30;
            y = (height / (rows + 2)) * (row + 1) + (Math.random() - 0.5) * 30;
        } else if (currentLayout === 'dna') {
            // DNA 双螺旋结构严密排列
            let p = i / count;
            let strand = i % 2 === 0 ? 1 : -1;
            x = width * 0.2 + p * (width * 0.6);
            y = height / 2 + strand * Math.sin(p * Math.PI * 6) * 90;
        } else if (currentLayout === 'circular') {
            let angle = (i / count) * Math.PI * 2;
            let radius = Math.min(width, height) * 0.32;
            x = width / 2 + Math.cos(angle) * radius;
            y = height / 2 + Math.sin(angle) * radius;
        } else {
            x = Math.random() * (width - 120) + 60;
            y = Math.random() * (height - 120) + 60;
        }
        cells.push(new Cell(x, y, 'normal', subT));
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

// 【查看模型】开关（全景缩放与旋转控制）
function toggleViewModel() {
    isViewModel = !isViewModel;
    const btn = document.getElementById('btn-view');
    if (isViewModel) {
        btn.classList.add('active');
        document.getElementById('modeStatus').innerText = '模型全景漫游 [View Model]';
    } else {
        btn.classList.remove('active');
        globalScale = 1.0;
        globalRotation = 0.0;
        document.getElementById('modeStatus').innerText = '自由漂移 [Free]';
    }
}

function toggleSeedMaster() {
    initCells();
}

function clearScreen() {
    cells = [];
    lockedCell = null;
    updateNodeCounter();
}

function updateNodeCounter() {
    document.getElementById('nodeCounter').innerText = cells.length;
}

// MediaPipe 手势识别与交互控制逻辑
const videoElement = document.getElementById('webcamVideo');
const hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});

hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.7
});

hands.onResults((results) => {
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];
        const indexTip = landmarks[8];
        const thumbTip = landmarks[4];
        const wrist = landmarks[0];

        handPos.x = (1 - indexTip.x) * width;
        handPos.y = indexTip.y * height;
        handPos.active = true;

        // 检测双指捏合（锁定/放大细胞）
        let pinchDist = Math.hypot(indexTip.x - thumbTip.x, indexTip.y - thumbTip.y);
        if (pinchDist < 0.05) {
            if (!handPos.isPinching) {
                handPos.isPinching = true;
                if (!lockedCell) {
                    // 寻找最近的细胞进行锁定放大
                    let closest = null;
                    let minDist = 120;
                    cells.forEach(c => {
                        let d = Math.hypot(c.x - handPos.x, c.y - handPos.y);
                        if (d < minDist) {
                            minDist = d;
                            closest = c;
                        }
                    });
                    if (closest) {
                        lockedCell = closest;
                        document.getElementById('masterTag').classList.remove('hidden');
                        document.getElementById('tagName').innerText = `Cell ID: ${lockedCell.id}`;
                        document.getElementById('tagState').innerText = `Status: Locked & Expanded`;
                    }
                }
            }
        } else {
            handPos.isPinching = false;
        }

        // 检测手掌张开（触发粒子爆炸散开效果）
        let spreadDist = Math.hypot(indexTip.x - wrist.x, indexTip.y - wrist.y);
        if (spreadDist > 0.35) {
            if (!handPos.isOpenPalm) {
                handPos.isOpenPalm = true;
                if (lockedCell) {
                    // 解除锁定并产生粒子爆发
                    for (let k = 0; k < 40; k++) {
                        explosionParticles.push(new ExplosionParticle(lockedCell.x, lockedCell.y));
                    }
                    cells = cells.filter(c => c !== lockedCell);
                    lockedCell = null;
                    document.getElementById('masterTag').classList.add('hidden');
                    updateNodeCounter();
                }
            }
        } else {
            handPos.isOpenPalm = false;
        }

        // 如果在【查看模型】模式下，手势左右移动可以控制整体旋转与缩放
        if (isViewModel) {
            globalRotation = (indexTip.x - 0.5) * Math.PI;
            globalScale = 0.8 + (1 - indexTip.y) * 0.6;
        }

    } else {
        handPos.active = false;
    }
});

const camera = new Camera(videoElement, {
    onFrame: async () => {
        await hands.send({ image: videoElement });
    },
    width: 640,
    height: 480
});
camera.start().catch(() => {});

// 主渲染循环
function animate(currentTime) {
    frameCount++;
    if (currentTime - lastTime >= 1000) {
        fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        document.getElementById('fpsCounter').innerText = fps;
        frameCount = 0;
        lastTime = currentTime;
    }

    ctx.fillStyle = 'rgba(2, 5, 14, 0.4)';
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    if (isViewModel) {
        ctx.translate(width / 2, height / 2);
        ctx.rotate(globalRotation);
        ctx.scale(globalScale, globalScale);
        ctx.translate(-width / 2, -height / 2);
    }

    // 绘制高保真神经元连线
    for (let i = 0; i < cells.length; i++) {
        for (let j = i + 1; j < cells.length; j++) {
            let c1 = cells[i], c2 = cells[j];
            let dist = Math.hypot(c1.x - c2.x, c1.y - c2.y);
            let threshold = 160;

            if (dist < threshold) {
                let opacity = (1 - dist / threshold) * 0.5;
                ctx.strokeStyle = `rgba(0, 240, 255, ${opacity})`;
                ctx.lineWidth = 1.2;
                
                ctx.beginPath();
                ctx.moveTo(c1.x, c1.y);
                let midX = (c1.x + c2.x) / 2 + Math.sin(currentTime * 0.002 + i) * 12;
                let midY = (c1.y + c2.y) / 2 + Math.cos(currentTime * 0.002 + j) * 12;
                ctx.quadraticCurveTo(midX, midY, c2.x, c2.y);
                ctx.stroke();
            }
        }
    }

    // 更新与绘制细胞
    cells.forEach(cell => {
        cell.update();
        cell.draw();
    });

    // 更新与绘制粒子爆发
    for (let i = explosionParticles.length - 1; i >= 0; i--) {
        explosionParticles[i].update();
        explosionParticles[i].draw();
        if (explosionParticles[i].alpha <= 0) explosionParticles.splice(i, 1);
    }

    ctx.restore();
    requestAnimationFrame(animate);
}

window.onload = function() {
    setLayout('circular');
    requestAnimationFrame(animate);
};