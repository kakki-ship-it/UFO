const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game State Enum
const STATE = {
    TITLE: 0,
    PLAYING: 1,
    RESULT: 2
};

let currentState = STATE.TITLE;

// Assets
const images = {};
const imageSources = {
    girl: 'girl.png',
    tails: 'tails.png',
    crane: 'crane.png',
    complete: 'complete.png'
};

let assetsLoaded = 0;
const totalAssets = Object.keys(imageSources).length;

function loadAssets() {
    for (let key in imageSources) {
        images[key] = new Image();
        images[key].src = imageSources[key];
        images[key].onload = () => {
            assetsLoaded++;
            if (assetsLoaded === totalAssets) {
                initGame();
            }
        };
    }
}

// Game Variables
let crane = {
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    speedX: 5,
    speedY: 5,
    direction: 1,
    maxY: 0
};

let girl = {
    x: 0,
    y: 0,
    width: 200,
    height: 300,
    scale: 1
};

let score = 0;
let animationId;
let aUsed = false;
let bUsed = false;

// UI Elements
const titleScreen = document.getElementById('title-screen');
const resultScreen = document.getElementById('result-screen');
const scoreDisplay = document.getElementById('score-display');
const scoreVal = document.getElementById('score-val');
const finalScore = document.getElementById('final-score');
const resultMessage = document.getElementById('result-message');
const btnA = document.getElementById('btn-a');
const btnB = document.getElementById('btn-b');
const retryBtn = document.getElementById('retry-btn');

// Input State
let isHoldingA = false;
let isHoldingB = false;

// Resize handling
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    if (currentState === STATE.TITLE) {
        resetPositions();
    }
}

window.addEventListener('resize', resize);

function resetPositions() {
    if (!images.girl || !images.girl.complete) return;

    // Calculate Global Scale based on Girl's desired height
    // Target: Girl takes up 50% of screen height
    const targetGirlHeight = canvas.height * 0.5;
    const scale = targetGirlHeight / images.girl.naturalHeight;
    girl.scale = scale;

    // Girl Setup
    girl.width = images.girl.naturalWidth * scale;
    girl.height = images.girl.naturalHeight * scale;
    girl.x = (canvas.width - girl.width) / 2;
    girl.y = canvas.height - girl.height - 120;

    // Crane Setup
    // Use a consistent size for crane, but ensure aspect ratio is correct
    const craneAspect = images.crane.naturalWidth / images.crane.naturalHeight;
    crane.width = 120;
    crane.height = crane.width / craneAspect;

    crane.x = 0;
    crane.y = 50;
    crane.direction = 1;

    // Max Y for crane
    // Allow crane to go down enough to touch the girl's head area
    crane.maxY = girl.y + girl.height * 0.5;
}

function initGame() {
    resize();
    resetPositions();
    setupControls();
    loop();
}

function setupControls() {
    // Helper to handle input start/end
    const startA = (e) => {
        if (e) e.preventDefault();
        if (currentState === STATE.PLAYING && !aUsed && !bUsed && !isHoldingB) isHoldingA = true;
    };
    const endA = (e) => {
        if (e) e.preventDefault();
        if (isHoldingA) {
            isHoldingA = false;
            aUsed = true;
        }
    };

    const startB = (e) => {
        if (e) e.preventDefault();
        if (currentState === STATE.PLAYING && !bUsed && !isHoldingA) {
            isHoldingB = true;
        }
    };
    const endB = (e) => {
        if (e) e.preventDefault();
        if (currentState === STATE.PLAYING && isHoldingB) {
            isHoldingB = false;
            bUsed = true;
            finishGame();
        }
    };

    // Mouse
    btnA.addEventListener('mousedown', startA);
    window.addEventListener('mouseup', () => isHoldingA = false);
    btnA.addEventListener('mouseup', endA);

    btnB.addEventListener('mousedown', startB);
    window.addEventListener('mouseup', () => { if (isHoldingB) endB(); });
    btnB.addEventListener('mouseup', endB);

    // Touch
    btnA.addEventListener('touchstart', startA);
    btnA.addEventListener('touchend', endA);

    btnB.addEventListener('touchstart', startB);
    btnB.addEventListener('touchend', endB);

    // Title Screen
    titleScreen.addEventListener('click', startGame);
    titleScreen.addEventListener('touchstart', startGame);

    // Retry
    retryBtn.addEventListener('click', resetGame);
    retryBtn.addEventListener('touchstart', resetGame);
}

function startGame() {
    if (currentState === STATE.TITLE) {
        currentState = STATE.PLAYING;
        titleScreen.classList.remove('active');
        titleScreen.classList.add('hidden');
        scoreDisplay.classList.remove('hidden');
        aUsed = false;
        bUsed = false;
        resetPositions();
    }
}

function resetGame() {
    currentState = STATE.TITLE;
    resultScreen.classList.add('hidden');
    resultScreen.classList.remove('active');
    titleScreen.classList.remove('hidden');
    titleScreen.classList.add('active');
    scoreDisplay.classList.add('hidden');
    score = 0;
    scoreVal.innerText = score;
    aUsed = false;
    bUsed = false;
    particles = [];
}

function finishGame() {
    currentState = STATE.RESULT;
    calculateScore();
}

function calculateScore() {
    // Target Y for crane to align tails with girl
    // We want the tails to look like they are on the girl's head.
    // Visually, the crane holds the tails.
    // Let's assume the "perfect" spot is when the crane is just above the girl's head.
    const targetY = girl.y - crane.height + 20;
    const diff = Math.abs(crane.y - targetY);

    // Stricter scoring: 100 - diff * 2
    // If diff is 0 (perfect), score is 100.
    // If diff is 10px, score is 80.
    // If diff is 50px, score is 0.
    let rawScore = 100 - (diff * 2);
    if (rawScore < 0) rawScore = 0;
    score = Math.floor(rawScore);

    scoreVal.innerText = score;
    finalScore.innerText = score;

    if (score >= 90) {
        resultMessage.innerText = "PERFECT!!";
        resultMessage.style.color = "#ff00ff";
        createParticles(canvas.width / 2, canvas.height / 2);
    } else if (score >= 60) {
        resultMessage.innerText = "GREAT!";
        resultMessage.style.color = "#39c5bb";
        createParticles(canvas.width / 2, canvas.height / 2);
    } else {
        resultMessage.innerText = "GOOD";
        resultMessage.style.color = "#333";
    }

    setTimeout(() => {
        resultScreen.classList.remove('hidden');
        resultScreen.classList.add('active');
    }, 1000);
}

function update() {
    if (currentState === STATE.PLAYING) {
        if (isHoldingA) {
            crane.x += crane.speedX * crane.direction;
            if (crane.x + crane.width > canvas.width || crane.x < 0) {
                crane.direction *= -1;
                crane.x = Math.max(0, Math.min(crane.x, canvas.width - crane.width));
            }
        }
        if (isHoldingB) {
            crane.y += crane.speedY;
            if (crane.y > crane.maxY) {
                crane.y = crane.maxY;
            }
        }
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Draw Rope
    ctx.beginPath();
    ctx.moveTo(crane.x + crane.width / 2, 0);
    ctx.lineTo(crane.x + crane.width / 2, crane.y);
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 4;
    ctx.stroke();

    // 2. Draw Assets
    if (girl.scale) {
        const tailsWidth = images.tails.naturalWidth * girl.scale;
        const tailsHeight = images.tails.naturalHeight * girl.scale;

        // Center tails on crane
        const tailsX = crane.x + (crane.width / 2) - (tailsWidth / 2);
        const tailsY = crane.y + crane.height - 55; // Increased overlap to fix gap

        if (currentState === STATE.RESULT && score >= 80) {
            // Draw Complete Image
            const completeWidth = images.complete.naturalWidth * girl.scale;
            const completeHeight = images.complete.naturalHeight * girl.scale;
            const completeX = (canvas.width - completeWidth) / 2;

            ctx.drawImage(images.crane, crane.x, crane.y, crane.width, crane.height);
            ctx.drawImage(images.complete, completeX, girl.y, completeWidth, completeHeight);
        } else {
            // Draw Tails (Behind Girl)
            // Wait, user said "Girl in front".
            // So order: Tails -> Crane -> Girl

            ctx.drawImage(images.tails, tailsX, tailsY, tailsWidth, tailsHeight);
            ctx.drawImage(images.crane, crane.x, crane.y, crane.width, crane.height);
            ctx.drawImage(images.girl, girl.x, girl.y, girl.width, girl.height);
        }
    }

    handleParticles();
}

// Particle System
let particles = [];
function createParticles(x, y) {
    for (let i = 0; i < 100; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 15,
            vy: (Math.random() - 0.5) * 15,
            life: 150,
            color: `hsl(${Math.random() * 360}, 80%, 60%)`
        });
    }
}

function handleParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        p.vy += 0.2;

        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, 6, 6);

        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

function loop() {
    update();
    draw();
    animationId = requestAnimationFrame(loop);
}

loadAssets();
