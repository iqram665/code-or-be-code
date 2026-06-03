const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Ground level
const GROUND_Y = 380;

// Game objects
const player = {
    x: 250, y: GROUND_Y,
    speed: 4, state: 'idle', // states: idle, walking, attack, hit, backFlip
    dir: 1, frame: 0, animTimer: 0
};

const ai = {
    x: 550, y: GROUND_Y,
    speed: 3, state: 'idle',
    dir: -1, frame: 0, animTimer: 0,
    cooldown: 0
};

// Keyboard input listener
const keys = {};
window.addEventListener('keydown', e => keys[e.code] = true);
window.addEventListener('keyup', e => keys[e.code] = false);

// 🔄 Game loop
function gameLoop() {
    update();
    render();
    requestAnimationFrame(gameLoop);
}

// 🛠️ Logic update
function update() {
    // --- Human (Player) movement ---
    if (player.state === 'idle' || player.state === 'walking') {
        if (keys['ArrowLeft']) {
            player.x -= player.speed;
            player.dir = -1;
            player.state = 'walking';
        } else if (keys['ArrowRight']) {
            player.x += player.speed;
            player.dir = 1;
            player.state = 'walking';
        } else {
            player.state = 'idle';
        }

        if (keys['Space']) {
            player.state = 'attack';
            player.frame = 0;
        }
    }

    // Player animation timing handler
    if (player.state === 'attack' || player.state === 'hit') {
        player.animTimer++;
        if (player.animTimer > 6) {
            player.animTimer = 0;
            player.state = 'idle'; // Attack finished, return to normal
        }
    }

    // --- 🤖 AI's decision making (exact logic from screenshot) ---
    let dist = Math.abs(player.x - ai.x);
    ai.dir = ai.x < player.x ? 1 : -1;

    // Idle state - move towards the player
    if (ai.state === 'idle' || ai.state === 'walking') {
        if (dist > 50) {
            ai.x += ai.speed * ai.dir;
            ai.state = 'walking';
        } else {
            ai.state = 'idle';
        }
    }

    // 🔴 the exact AI if-else condition from the screenshot:
    if (dist < 60 && ai.cooldown === 0) {
        const oppAttacking = player.state === 'attack';
        const oppStunned = player.state === 'hit';

        if (oppAttacking) {
            const r = Math.random();
            ai.cooldown = 40; // Decision Cooldown Lock
            
            if (r < 0.32) {
                startAction(ai, 'backFlip');
            } else if (r < 0.60) {
                startAction(ai, 'pickShadow'); // Dodge
            } else if (r < 0.88) {
                startAction(ai, 'pickAttack'); // Strike back
            } else {
                startAction(ai, 'idle');
            }
        } else if (oppStunned) {
            startAction(ai, 'pickAttack'); // Player is vulnerable, attack!
        }
    }

    if (ai.cooldown > 0) ai.cooldown--;

    // AI animation and physics handler
    if (ai.state === 'backFlip') {
        ai.animTimer++;
        ai.x -= ai.dir * 4; // backFlip movement
        if (ai.animTimer > 25) {
            ai.state = 'idle';
            ai.animTimer = 0;
        }
    } else if (ai.state === 'attack') {
        ai.animTimer++;
        if (ai.animTimer > 15) {
            // Hit detection (if player is in range, take damage)
            if (dist < 50 && player.state !== 'hit') {
                player.state = 'hit';
                player.animTimer = 0;
                player.x += ai.dir * 25; // Knockback
            }
            ai.state = 'idle';
            ai.animTimer = 0;
        }
    }

    // Player's attack connects, AI takes hit
    if (player.state === 'attack' && dist < 50 && ai.state !== 'backFlip' && ai.state !== 'hit') {
        ai.state = 'hit';
        ai.animTimer = 0;
        ai.x += player.dir * 20;
    }
    if (ai.state === 'hit') {
        ai.animTimer++;
        if (ai.animTimer > 10) ai.state = 'idle';
    }

    // Boundary lock (preventing going outside the screen)
    player.x = Math.max(50, Math.min(canvas.width - 50, player.x));
    ai.x = Math.max(50, Math.min(canvas.width - 50, ai.x));
}

function startAction(character, actionName) {
    if (actionName === 'backFlip') {
        character.state = 'backFlip';
        character.animTimer = 0;
    } else if (actionName === 'pickAttack') {
        character.state = 'attack';
        character.animTimer = 0;
    } else if (actionName === 'pickShadow') {
        // দ্রুত ডজ ইফেক্ট
        character.x -= character.dir * 40;
    } else {
        character.state = 'idle';
    }
}

// 🎨 Canvas rendering (visual design)
function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Background gradient sky
    let skyGrd = ctx.createLinearGradient(0, 0, 0, canvas.height);
    skyGrd.addColorStop(0, '#484f58');
    skyGrd.addColorStop(1, '#161b22');
    ctx.fillStyle = skyGrd;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Large retro moon (Moon)
    ctx.fillStyle = '#f0f6fc';
    ctx.beginPath();
    ctx.arc(650, 110, 45, 0, Math.PI * 2);
    ctx.fill();

    // 3. 3-layer pixel mountain (parallax effect)
    drawMountainLayer(280, '#30363d', 40, 0.005);
    drawMountainLayer(320, '#21262d', 25, 0.01);
    drawMountainLayer(350, '#161b22', 15, 0.02);

    // 4. Ground platform line
    ctx.strokeStyle = '#30363d';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(canvas.width, GROUND_Y);
    ctx.stroke();

    // 5. Stickman character drawing
    drawStickman(player, '#58a6ff'); // Blue human player
    drawStickman(ai, '#ff7b72');     // Red AI opponent
}

// Mountain generator math function
function drawMountainLayer(yBase, color, amplitude, frequency) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height);
    for (let i = 0; i <= canvas.width; i += 10) {
        let y = yBase + Math.sin(i * frequency) * amplitude + Math.cos(i * frequency * 2) * (amplitude/3);
        ctx.lineTo(i, y);
    }
    ctx.lineTo(canvas.width, canvas.height);
    ctx.fill();
}

// 🧍 Custom animated stickman renderer
function drawStickman(char, color) {
    ctx.save();
    ctx.translate(char.x, char.y);
    ctx.scale(char.dir, 1);

    // If hit, flash red
    ctx.strokeStyle = char.state === 'hit' ? '#ff3838' : color;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';

    // Rotating the entire body during a backflip
    if (char.state === 'backFlip') {
        let angle = (char.animTimer / 25) * Math.PI * 2;
        ctx.rotate(-angle);
    }

    // 1 Head
    ctx.beginPath();
    ctx.arc(0, -60, 10, 0, Math.PI * 2);
    ctx.stroke();

    // 2. Torso
    ctx.beginPath();
    ctx.moveTo(0, -50);
    ctx.lineTo(0, -20);
    ctx.stroke();

    // 3. Arms
    ctx.beginPath();
    if (char.state === 'attack') {
        // Strike pose
        ctx.moveTo(0, -45);
        ctx.lineTo(25, -45);
        ctx.moveTo(0, -45);
        ctx.lineTo(20, -35);
    } else {
        // Normal position
        ctx.moveTo(0, -45);
        ctx.lineTo(12, -30);
        ctx.moveTo(0, -45);
        ctx.lineTo(-12, -30);
    }
    ctx.stroke();

    // 4. Legs
    ctx.beginPath();
    if (char.state === 'walking' && char.animTimer % 20 < 10) {
        ctx.moveTo(0, -20);
        ctx.lineTo(12, 0);
        ctx.moveTo(0, -20);
        ctx.lineTo(-12, 0);
    } else {
        ctx.moveTo(0, -20);
        ctx.lineTo(10, 0);
        ctx.moveTo(0, -20);
        ctx.lineTo(-10, 0);
    }
    ctx.stroke();

    ctx.restore();
}

// Game start
gameLoop();