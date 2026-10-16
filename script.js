const canvas = document.getElementById('neuralCanvas');
const ctx = canvas.getContext('2d');

let width, height;
function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// 系统核心变量
let currentLayout = 'circular';
let cells = [];
let particles = [];
let explosionParticles = [];
let globalScale = 1.0;
let globalRotation = 0.0;
let frameCount = 0;
let lastTime = performance.now();
let fps = 60;

// 左右手状态追踪
const leftHand = { x: width * 0.3, y: height / 2, active: false };
const rightHand = { x: width * 0.7, y: height / 2, active: false, isPinching: false };

// 高保真细胞类：支持多种生物形态与五彩斑斓的生命色彩
class Cell {
    constructor(x, y, type = 'normal', subType = 0) {
        this.x = x;
        this.y = y;
        this.baseX = x;
        this.baseY = y;
        this.vx = (Math.random() - 0.5) * 1.2;
        this.vy = (Math.random() - 0.5) * 1.2;
        this.radius = type === 'master' ? 60 : (Math.random() * 22 + 12);
        this.type = type; // 'master', 'normal'
        this.subType = subType; // 0: 神经元, 1: 植物细胞切片多边形, 2: 荧光干细胞, 3: 腺体细胞
        this.id = Math.floor(Math.random() * 900) + 100;
        this.energy = 100;
        
        // 丰富的高保真生物配色
        const colors = ['#00f0ff', '#a855f7', '#38bdf8', '#f472b6', '#4ade80', '#fbbf24'];
        this.primaryColor = colors[Math.floor(Math.random() * colors.length)];
        this.pulsePhase = Math.random() * Math.PI * 2;
        this.angle = Math.random() * Math.PI * 2;
        this.dnaOffset = Math.random() * Math.PI * 2;
    }

    update() {
        this.pulsePhase += 0.04;

        if (this.type === 'master') {
            // 主神经元跟随右手食指实时移动
            if (rightHand.active) {
                this.x += (rightHand.x - this.x) * 0.15;
                this.y += (rightHand.y - this.y) * 0.15;
            }
        } else {
            // 阵列形态运动学计算
            if (currentLayout === 'chessboard') {
                this.x += (this.baseX - this.x) * 0.06;
                this.y += (this.baseY - this.y) * 0.06;
            } else if (currentLayout === 'dna') {
                // 真正的双螺旋基因链结构
                this.dnaOffset += 0.03;
                let targetX = this.baseX;
                let targetY = this.baseY + Math.sin(this.dnaOffset) * 40;
                this.x += (targetX - this.x) * 0.08;
                this.y += (targetY - this.y) * 0.08;
            } else if (currentLayout === 'circular') {
                let cx = width / 2, cy = height / 2;
                this.angle += 0.005;
                let dist = Math.hypot(this.baseX - cx, this.baseY - cy);
                let tx = cx + Math.cos(this.angle) * dist;
                let ty = cy + Math.sin(this.angle) * dist;
                this.x += (tx - this.x) * 0.06;
                this.y += (ty - this.y) * 0.06;
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
        ctx.translate(this.x, this.y);
        let r = this.radius + Math.sin(this.pulsePhase) * 2;

        if (this.type === 'master' || this.subType === 0) {
            // 主神经元 / 神经元突触细胞
            let grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 2);
            grad.addColorStop(0, 'rgba(0, 240, 255, 0.7)');
            grad.addColorStop(0.5, 'rgba(168, 85, 247, 0.3)');
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(0, 0, r * 2, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = this.primaryColor;
            ctx.lineWidth = this.type === 'master' ? 3 : 1.5;
            ctx.beginPath();
            ctx.arc(0, 0, r * 0.75, 0, Math.PI * 2);
            ctx.stroke();

            // 发散纤维突触
            for (let i = 0; i < 8; i++) {
                let a = (i / 8) * Math.PI * 2 + this.pulsePhase * 0.3;
                ctx.strokeStyle = 'rgba(0, 240, 255, 0.6)';
                ctx.lineWidth = 1.2;
                ctx.beginPath();
                ctx.moveTo(Math.cos(a) * (r * 0.75), Math.sin(a) * (r * 0.75));
                ctx.lineTo(Math.cos(a) * (r * 1.8), Math.sin(a) * (r * 1.8));
                ctx.stroke();
            }
        } else if (this.subType === 1) {
            // 植物切片多边形细胞
            ctx.strokeStyle = this.primaryColor;
            ctx.lineWidth = 1.5;
            ctx.fillStyle = 'rgba(14, 116, 144, 0.3)';
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

            // 核心染色体
            ctx.fillStyle = '#f472b6';
            ctx.beginPath();
            ctx.arc(0, 0, r * 0.25, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // 荧光干细胞与膜结构
            ctx.strokeStyle = this.primaryColor;
            ctx.lineWidth = 2;
            ctx.fillStyle = 'rgba(168, 85, 247, 0.25)';
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#00f0ff';
            ctx.beginPath();
            ctx.arc(r * 0.3, -r * 0.25, 3, 0, Math.PI * 2);
            ctx.arc(-r * 0.25, r * 0.25, 2.5, 0, Math.PI * 2);
            ctx.fill();
        }

        // 高保真生物数据标签
        if (this.id % 4 === 0 || this.type === 'master') {
            ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
            ctx.strokeRect(r + 6, -12, 54, 20);
            ctx.fillStyle = 'rgba(0, 240, 255, 0.9)';
            ctx.font = '9px "Share Tech Mono", monospace';
            ctx.fillText(`ID:${this.id}`, r + 10, 2);
        }

        ctx.restore();
    }
}

// 粒子爆发类
class ExplosionParticle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        let angle = Math.random() * Math.PI * 2;
        let speed = Math.random() * 7 + 2;
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
        ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// 初始化 120+ 壮观细胞与 DNA 结构
function initCells() {
    cells = [];
    // 默认生成主神经元
    cells.push(new Cell(width / 2, height / 2, 'master', 0));

    let count = 120;
    for (let i = 0; i < count; i++) {
        let x, y;
        let subT = i % 3;
        if (currentLayout === 'chessboard') {
            let cols = 15, rows = 8;
            let col = i % cols, row = Math.floor(i / cols);
            x = (width / (cols + 1)) * (col + 1) + (Math.random() - 0.5) * 20;
            y = (height / (rows + 2)) * (row + 1) + (Math.random() - 0.5) * 20;
        } else if (currentLayout === 'dna') {
            // 真实双螺旋梯状排列
            let p = i / count;
            let strand = i % 2 === 0 ? 1 : -1;
            x = width * 0.15 + p * (width * 0.7);
            y = height / 2 + strand * Math.sin(p * Math.PI * 8) * 140;
        } else if (currentLayout === 'circular') {
            let angle = (i / count) * Math.PI * 2;
            let radius = Math.min(width, height) * 0.38;
            x = width / 2 + Math.cos(angle) * radius;
            y = height / 2 + Math.sin(angle) * radius;
        } else {
            x = Math.random() * (width - 100) + 50;
            y = Math.random() * (height - 100) + 50;
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

function spawnMasterNeuron() {
    cells.push(new Cell(rightHand.x, rightHand.y, 'master', 0));
    updateNodeCounter();
}

function spawnCellAt(x, y) {
    if (cells.length > 200) return;
    cells.push(new Cell(x, y, 'normal', Math.floor(Math.random() * 3)));
    updateNodeCounter();
}

function clearScreen() {
    cells = [];
    updateNodeCounter();
}

function updateNodeCounter() {
    document.getElementById('nodeCounter').innerText = cells.length;
}

// MediaPipe 双手识别核心算法
const videoElement = document.getElementById('webcamVideo');
const hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});

hands.setOptions({
    maxNumHands: 2, // 开启双手识别
    modelComplexity: 1,
    minDetectionConfidence: 0.65,
    minTrackingConfidence: 0.65
});

hands.onResults((results) => {
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        let leftDetected = false;
        let rightDetected = false;

        results.multiHandLandmarks.forEach((landmarks, index) => {
            const handedness = results.multiHandedness[index].label; // Left 或 Right
            const indexTip = landmarks[8];
            const thumbTip = landmarks[4];
            const wrist = landmarks[0];

            let px = (1 - indexTip.x) * width;
            let py = indexTip.y * height;

            if (handedness === 'Left') {
                // 【左手】控制整体 3D 视角观察、旋转、缩放
                leftHand.x = px;
                leftHand.y = py;
                leftHand.active = true;
                leftDetected = true;
                
                globalRotation = (indexTip.x - 0.5) * Math.PI * 1.5;
                globalScale = 0.7 + (1 - indexTip.y) * 0.8;
                document.getElementById('leftHandStatus').innerText = '左手视角激活 [Active]';
            } else {
                // 【右手】控制神经元、拖动撒种新细胞
                rightHand.x = px;
                rightHand.y = py;
                rightHand.active = true;
                rightDetected = true;
                document.getElementById('rightHandStatus').innerText = '右手神经元互动 [Active]';

                // 右手滑动时实时撒种生成新细胞
                if (Math.random() < 0.25) {
                    spawnCellAt(rightHand.x, rightHand.y);
                }

                // 右手捏合触发吞噬或粒子爆发
                let pinchDist = Math.hypot(indexTip.x - thumbTip.x, indexTip.y - thumbTip.y);
                if (pinchDist < 0.045) {
                    if (!rightHand.isPinching) {
                        rightHand.isPinching = true;
                        // 吞噬最近的细胞并爆发粒子
                        let closest = null;
                        let minDist = 100;
                        cells.forEach(c => {
                            let d = Math.hypot(c.x - rightHand.x, c.y - rightHand.y);
                            if (d < minDist && c.type !== 'master') {
                                minDist = d;
                                closest = c;
                            }
                        });
                        if (closest) {
                            for (let k = 0; k < 25; k++) {
                                explosionParticles.push(new ExplosionParticle(closest.x, closest.y));
                            }
                            cells = cells.filter(c => c !== closest);
                            updateNodeCounter();
                        }
                    }
                } else {
                    rightHand.isPinching = false;
                }
            }
        });

        if (!leftDetected) {
            leftHand.active = false;
            document.getElementById('leftHandStatus').innerText = '未检测 [Standby]';
        }
        if (!rightDetected) {
            rightHand.active = false;
            document.getElementById('rightHandStatus').innerText = '未检测 [Standby]';
        }

    } else {
        leftHand.active = false;
        rightHand.active = false;
        document.getElementById('leftHandStatus').innerText = '未检测 [Standby]';
        document.getElementById('rightHandStatus').innerText = '未检测 [Standby]';
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

// 主宇宙渲染循环
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

    ctx.save();
    // 应用左手控制的全景旋转与缩放矩阵
    ctx.translate(width / 2, height / 2);
    ctx.rotate(globalRotation);
    ctx.scale(globalScale, globalScale);
    ctx.translate(-width / 2, -height / 2);

    // 绘制清晰震撼的神经元网络突触连线
    for (let i = 0; i < cells.length; i++) {
        for (let j = i + 1; j < cells.length; j++) {
            let c1 = cells[i], c2 = cells[j];
            let dist = Math.hypot(c1.x - c2.x, c1.y - c2.y);
            let threshold = c1.type === 'master' || c2.type === 'master' ? 220 : 150;

            if (dist < threshold) {
                let opacity = (1 - dist / threshold) * 0.6;
                ctx.strokeStyle = c1.type === 'master' || c2.type === 'master' ? `rgba(0, 240, 255, ${opacity * 1.5})` : `rgba(168, 85, 247, ${opacity})`;
                ctx.lineWidth = c1.type === 'master' || c2.type === 'master' ? 1.8 : 0.9;
                
                ctx.beginPath();
                ctx.moveTo(c1.x, c1.y);
                let midX = (c1.x + c2.x) / 2 + Math.sin(currentTime * 0.002 + i) * 14;
                let midY = (c1.y + c2.y) / 2 + Math.cos(currentTime * 0.002 + j) * 14;
                ctx.quadraticCurveTo(midX, midY, c2.x, c2.y);
                ctx.stroke();

                // 主神经元突触电信号放电粒子
                if ((c1.type === 'master' || c2.type === 'master') && Math.random() < 0.04) {
                    particles.push(new ExplosionParticle(midX, midY));
                }
            }
        }
    }

    // 更新与绘制所有细胞
    cells.forEach(cell => {
        cell.update();
        cell.draw();
    });

    // 更新与绘制放电及爆发粒子
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