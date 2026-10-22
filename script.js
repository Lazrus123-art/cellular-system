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
        ctx.fillStyle = '#00f0ff';
        ctx.fillRect(this.x, this.y, this.size, this.size);
        ctx.restore();
    }
}

// MediaPipe 手势识别集成
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
        const landmarks = results.multiHandLandmarks[0];
        
        const indexTip = landmarks[8];
        const indexPip = landmarks[6]; // 食指第二关节
        const thumbTip = landmarks[4];
        const wrist = landmarks[0];

        // 手势镜像映射到 Canvas
        handPosition.x = (1 - indexTip.x) * width;
        handPosition.y = indexTip.y * height;
        handPosition.active = true;

        document.getElementById('gestureStatus').innerText = '手势追踪中 [Active]';
        document.getElementById('camStatus').innerText = 'TRACKING';

        // 【新增手势检测】：食指指尖显著高于第二关节且高于手腕 (Point Up)
        if (indexTip.y < indexPip.y - 0.03 && indexTip.y < wrist.y) {
            let now = performance.now();
            if (now - lastSpawnTime > 400) {
                spawnCellAt(handPosition.x, handPosition.y);
                document.getElementById('gestureStatus').innerText = '手势向上：生成新细胞！';
                lastSpawnTime = now;
            }
        }

        // 【360°视角旋转手势】：拇指与食指捏合 (Pinch)
        let pinchDist = Math.hypot(indexTip.x - thumbTip.x, indexTip.y - thumbTip.y);
        if (pinchDist < 0.05) {
            targetRotationAngleY += 0.04;
            document.getElementById('gestureStatus').innerText = '捏合中：360°旋转视角';
        }
    } else {
        document.getElementById('gestureStatus').innerText = '寻找手势中...';
        document.getElementById('camStatus').innerText = 'SEARCHING';
        handPosition.active = false;
    }
});

// 启动 Camera 工具
const camera = new Camera(videoElement, {
    onFrame: async () => { await hands.send({ image: videoElement }); },
    width: 640, height: 480
});

camera.start().catch((err) => {
    console.error(err);
    document.getElementById('camStatus').innerText = 'OFFLINE';
    document.getElementById('gestureStatus').innerText = '摄像头未连线';
});

// 大神经元吞噬逻辑
function checkCellConsumption() {
    if (!masterNeuron) return;
    
    // 手势未激活时，主神经元停在屏幕正中心
    let targetX = handPosition.active ? handPosition.x : width / 2;
    let targetY = handPosition.active ? handPosition.y : height / 2;

    for (let i = cells.length - 1; i >= 0; i--) {
        let cell = cells[i];
        if (cell.type === 'master') continue;

        let dist = Math.hypot(masterNeuron.x - cell.x, masterNeuron.y - cell.y);
        if (dist < masterNeuron.radius + cell.radius * 0.5) {
            for (let p = 0; p < 12; p++) {
                particles.push(new Spark(cell.x, cell.y));
            }
            masterNeuron.targetRadius = Math.min(masterNeuron.targetRadius + 1.5, 90);
            cells.splice(i, 1);
            eatenCount++;

            document.getElementById('eatenCounter').innerText = eatenCount;
            document.getElementById('tagState').innerText = 'Consuming!';
            updateNodeCounter();

            setTimeout(() => {
                if (document.getElementById('tagState')) {
                    document.getElementById('tagState').innerText = 'Tracking';
                }
            }, 700);
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
        masterNeuron = new Cell(width / 2, height / 2, 'master');
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
    if (masterNeuron) masterNeuron.targetRadius = 45;
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

    // TouchDesigner 神经连线
    for (let i = 0; i < cells.length; i++) {
        for (let j = i + 1; j < cells.length; j++) {
            let c1 = cells[i], c2 = cells[j];
            let dist = Math.hypot(c1.x - c2.x, c1.y - c2.y);
            let threshold = (c1.type === 'master' || c2.type === 'master') ? 240 : 120;

            if (dist < threshold) {
                let opacity = (1 - dist / threshold) * 0.45;
                ctx.strokeStyle = (c1.type === 'master' || c2.type === 'master') 
                    ? `rgba(0, 240, 255, ${opacity * 1.5})` 
                    : `rgba(168, 85, 247, ${opacity})`;
                ctx.lineWidth = (c1.type === 'master' || c2.type === 'master') ? 1.5 : 0.7;
                
                ctx.beginPath();
                ctx.moveTo(c1.x, c1.y);
                let midX = (c1.x + c2.x) / 2 + (Math.sin(currentTime * 0.002 + i) * 6);
                let midY = (c1.y + c2.y) / 2 + (Math.cos(currentTime * 0.002 + j) * 6);
                ctx.quadraticCurveTo(midX, midY, c2.x, c2.y);
                ctx.stroke();
            }
        }
    }

    checkCellConsumption();

    let targetX = handPosition.active ? handPosition.x : width / 2;
    let targetY = handPosition.active ? handPosition.y : height / 2;

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
    setLayout('dna');
    requestAnimationFrame(animate);
};
