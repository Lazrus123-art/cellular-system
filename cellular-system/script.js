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

// 手势识别坐标对象
const handPosition = { x: width / 2, y: height / 2, active: false };
let lastSpawnTime = 0;

class Cell {
    constructor(x, y, type = 'normal', cellStyle = 0) {
        this.x = x;
        this.y = y;
        this.z = (Math.random() - 0.5) * 200; // 限制3D深度，防止跑太远
        this.baseX = x;
        this.baseY = y;
        this.vx = (Math.random() - 0.5) * 0.6;
        this.vy = (Math.random() - 0.5) * 0.6;
        
        this.type = type;
        this.cellStyle = cellStyle;
        this.radius = type === 'master' ? 45 : (Math.random() * 10 + 12);
        this.targetRadius = this.radius;
        this.id = Math.floor(Math.random() * 900) + 100;
        
        this.pulsePhase = Math.random() * Math.PI * 2;
        this.dnaHelixOffset = Math.random() * Math.PI * 2;
        this.lobes = Array.from({length: 5}, () => Math.random() * 0.3 + 0.85);
    }

    update(targetX, targetY) {
        this.pulsePhase += 0.03;
        this.radius += (this.targetRadius - this.radius) * 0.1;

        if (this.type === 'master') {
            // 主神经元平滑跟随手势或鼠标兜底
            this.x += (targetX - this.x) * 0.15;
            this.y += (targetY - this.y) * 0.15;
            // 限制在屏幕内
            this.x = Math.max(60, Math.min(width - 60, this.x));
            this.y = Math.max(60, Math.min(height - 60, this.y));
        } else {
            // 规整的阵列计算
            if (currentLayout === 'chessboard') {
                this.x += (this.baseX - this.x) * 0.08;
                this.y += (this.baseY - this.y) * 0.08;
            } else if (currentLayout === 'dna') {
                this.dnaHelixOffset += 0.025;
                let targetX = this.baseX;
                let targetY = this.baseY + Math.sin(this.dnaHelixOffset) * 25;
                this.x += (targetX - this.x) * 0.08;
                this.y += (targetY - this.y) * 0.08;
            } else if (currentLayout === 'circular') {
                let cx = width / 2, cy = height / 2;
                let dist = Math.hypot(this.baseX - cx, this.baseY - cy);
                let currentAngle = Math.atan2(this.baseY - cy, this.baseX - cx) + 0.002;
                let targetX = cx + Math.cos(currentAngle) * dist;
                let targetY = cy + Math.sin(currentAngle) * dist;
                this.baseX = targetX;
                this.baseY = targetY;
                this.x += (targetX - this.x) * 0.08;
                this.y += (targetY - this.y) * 0.08;
            } else {
                this.x += this.vx;
                this.y += this.vy;
                if (this.x < 60 || this.x > width - 60) this.vx *= -1;
                if (this.y < 60 || this.y > height - 60) this.vy *= -1;
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
        let currentRadius = this.radius * scale + Math.sin(this.pulsePhase) * 1.5;

        ctx.translate(drawX, drawY);

        if (this.type === 'master') {
            // 主神经元渲染
            let grad = ctx.createRadialGradient(0, 0, 0, 0, 0, currentRadius * 2);
            grad.addColorStop(0, 'rgba(0, 240, 255, 0.75)');
            grad.addColorStop(0.4, 'rgba(168, 85, 247, 0.3)');
            grad.addColorStop(1, 'transparent');
            
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(0, 0, currentRadius * 2, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = '#00f0ff';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(0, 0, currentRadius, 0, Math.PI * 2);
            ctx.stroke();

            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.beginPath();
            ctx.arc(0, 0, currentRadius * 0.3, 0, Math.PI * 2);
            ctx.fill();

            const masterTag = document.getElementById('masterTag');
            masterTag.style.left = `${drawX + 50}px`;
            masterTag.style.top = `${drawY - 30}px`;
            masterTag.classList.remove('hidden');
            document.getElementById('tagScale').innerText = (this.radius / 45).toFixed(2) + 'x';
        } else {
            // 参考图中的规整科技细胞样式
            if (this.cellStyle === 0) {
                // 有机质膜伪足细胞
                ctx.strokeStyle = 'rgba(0, 240, 255, 0.85)';
                ctx.fillStyle = 'rgba(0, 240, 255, 0.12)';
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
                // 烟花神经突触细胞
                ctx.strokeStyle = 'rgba(236, 72, 153, 0.85)';
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
                // 多核线粒体细胞
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
                // 科技感矩形框观察细胞（参考图中的标准 HUD 框）
                ctx.strokeStyle = 'rgba(0, 240, 255, 0.6)';
                ctx.lineWidth = 1;
                let boxSize = currentRadius * 2.2;
                ctx.strokeRect(-boxSize/2, -boxSize/2, boxSize, boxSize);
                ctx.fillStyle = 'rgba(0, 240, 255, 0.85)';
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

// 严格规整的阵列初始化
function initCells() {
    cells = [];
    if (isMasterActive) {
        masterNeuron = new Cell(width / 2, height / 2, 'master');
        cells.push(masterNeuron);
    }
    
    let count = 40;
    let cols = 8, rows = 5;
    
    for (let i = 0; i < count; i++) {
        let x, y;
        if (currentLayout === 'chessboard') {
            // 严格对齐的网格矩阵
            let col = i % cols;
            let row = Math.floor(i / cols);
            x = (width / (cols + 1)) * (col + 1);
            y = (height / (rows + 2)) * (row + 1) + 40;
        } else if (currentLayout === 'dna') {
            // 规整对称的标准 DNA 双螺旋
            let p = i / count;
            let strand = i % 2 === 0 ? 1 : -1;
            x = width * 0.2 + p * (width * 0.6);
            y = height / 2 + strand * Math.sin(p * Math.PI * 4) * 120;
        } else if (currentLayout === 'circular') {
            // 规整同心圆
            let angle = (i / count) * Math.PI * 2;
            let radius = Math.min(width, height) * 0.3;
            x = width / 2 + Math.cos(angle) * radius;
            y = height / 2 + Math.sin(angle) * radius;
        } else {
            x = Math.random() * (width - 200) + 100;
            y = Math.random() * (height - 200) + 100;
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
        this.alpha -= 0.03;
    }
    draw() {
        ctx.save();
        ctx.globalAlpha = Math.max(this.alpha, 0);
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.size, this.size);
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
        const landmarks = results.multiHandLandmarks[0];
        const indexTip = landmarks[8];
        const indexPip = landmarks[6]; // 用于判断食指向上指
        const thumbTip = landmarks[4];

        // 映射坐标
        handPosition.x = (1 - indexTip.x) * width;
        handPosition.y = indexTip.y * height;
        handPosition.active = true;

        // 【核心恢复】：食指向上指（Point Up）在空中新增小细胞
        if (indexTip.y < indexPip.y - 0.05) {
            let now = performance.now();
            if (now - lastSpawnTime > 500) {
                spawnCellAt(handPosition.x, handPosition.y);
                document.getElementById('gestureStatus').innerText = '手势向上：已生成新细胞！';
                lastSpawnTime = now;
            }
        } else {
            document.getElementById('gestureStatus').innerText = '手势追踪中 [Tracking]';
        }

        // 捏合判断 -> 360 度旋转视角
        let pinchDist = Math.hypot(indexTip.x - thumbTip.x, indexTip.y - thumbTip.y);
        if (pinchDist < 0.06) {
            targetRotationAngleY += 0.04;
            document.getElementById('gestureStatus').innerText = '捏合：360°视角旋转';
        }
    } else {
        document.getElementById('gestureStatus').innerText = '未检测到手势（鼠标控制模式）';
        handPosition.active = false;
    }
});

const camera = new Camera(videoElement, {
    onFrame: async () => { await hands.send({ image: videoElement }); },
    width: 640, height: 480
});

camera.start().catch(() => {
    document.getElementById('gestureStatus').innerText = '无摄像头（鼠标交互模式）';
});

// 鼠标与触控兜底控制
window.addEventListener('mousemove', (e) => {
    if (!handPosition.active) {
        handPosition.x = e.clientX;
        handPosition.y = e.clientY;
    }
    if (isDragging) {
        let deltaX = e.clientX - previousMouseX;
        targetRotationAngleY += deltaX * 0.005;
        previousMouseX = e.clientX;
    }
});

window.addEventListener('mousedown', (e) => {
    isDragging = true;
    previousMouseX = e.clientX;
});
window.addEventListener('mouseup', () => { isDragging = false; });

// 鼠标点击空白处也可以新增细胞
window.addEventListener('click', (e) => {
    if (!handPosition.active) {
        spawnCellAt(e.clientX, e.clientY);
    }
});

// 吞噬逻辑
function checkCellConsumption() {
    if (!masterNeuron) return;
    for (let i = cells.length - 1; i >= 0; i--) {
        let cell = cells[i];
        if (cell.type === 'master') continue;

        let dist = Math.hypot(masterNeuron.x - cell.x, masterNeuron.y - cell.y);
        if (dist < masterNeuron.radius + cell.radius * 0.5) {
            for (let p = 0; p < 15; p++) {
                particles.push(new Spark(cell.x, cell.y, '#00f0ff'));
            }
            masterNeuron.targetRadius = Math.min(masterNeuron.targetRadius + 1.5, 90);
            cells.splice(i, 1);
            eatenCount++;

            document.getElementById('eatenCounter').innerText = eatenCount;
            document.getElementById('tagState').innerText = 'Consuming!';
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

    // 绘制连线
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

    let targetX = handPosition.x;
    let targetY = handPosition.y;

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