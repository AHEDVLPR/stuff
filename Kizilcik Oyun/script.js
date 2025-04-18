const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const difficultySelect = document.getElementById('difficulty');
const startButton = document.getElementById('start-button');
const levelDisplay = document.getElementById('level-display');
const timerDisplay = document.getElementById('timer-display');
const scoreTargetDisplay = document.getElementById('score-target-display');

// --- Touch Control Elements ---
const touchUp = document.getElementById('touch-up');
const touchDown = document.getElementById('touch-down');
const touchLeft = document.getElementById('touch-left');
const touchRight = document.getElementById('touch-right');
const touchShoot = document.getElementById('touch-shoot');

// Game settings
const canvasWidth = 800;
const canvasHeight = 600;
canvas.width = canvasWidth;
canvas.height = canvasHeight;

// --- Game State Variables ---
let score = 0;
let gameRunning = false;
let difficulty = 'normal'; // Default difficulty (influences initial spawn counts)
let gameOver = false;
let gameWon = false;
let currentLevel = 1;
const maxLevel = 5;
let levelScoreTarget = 0;
const baseLevelScoreTarget = 20;
const scoreTargetIncreasePerLevel = 5;
const LEVEL_DURATION = 30; // seconds
let levelStartTime = 0;
let timeLeft = LEVEL_DURATION;
let gameTimerInterval = null;

// --- Keyboard Input State ---
const keysPressed = {
    ArrowLeft: false,
    ArrowRight: false,
    ArrowUp: false,
    ArrowDown: false,
    Space: false
};

// Character settings
const characterSize = 50; // Example size, adjust as needed

// --- Character Data ---
let apo = {
    x: canvasWidth / 2 - characterSize / 2,
    y: canvasHeight - characterSize - 10,
    width: characterSize,
    height: characterSize,
    baseSpeed: 5,
    speed: 5,
    img: null
};

let loveArrows = [];
const arrowSpeed = 7;
const arrowWidth = 10;
const arrowHeight = 20;

let targets = []; // Array to hold ON-SCREEN target characters
let currentObstacles = []; // Array to hold ON-SCREEN obstacle characters
const baseTargetSpeed = 2;
const baseObstacleSpeed = 3;
let currentTargetSpeed = baseTargetSpeed;
let currentObstacleSpeed = baseObstacleSpeed;
const speedIncreaseFactor = 1.25; // 25% increase per level

// --- Character Lists ---
const characterImages = {}; // To store loaded images
const allCharacterNames = [
    'Apo', 'Fatih', 'Mustafa', 'Defne', 'Meri', 'Nursema', 'Nilay', 'Kıvılcım', 'Işıl', 'Doğa',
    'Sönmez' // Added Boss
];
const allTargetNames = ['Defne', 'Meri', 'Kıvılcım', 'Işıl', 'Doğa'];
const allObstacleNames = ['Fatih', 'Mustafa', 'Nilay', 'Nursema'];

let availableObstacles = []; // List of obstacles not yet spawned in this game

// --- Floating Text Effect ---
let floatingTexts = []; // To show +1, etc.
const textEffectDuration = 1000; // milliseconds

// --- Target Speech Phrases ---
const targetPhrases = ["Yala beni", "Tırmala beni", "Kaşı beni"];

// --- Boss State ---
let bossCharacter = null;
let bossHealth = 0;
const BOSS_SIZE_MULTIPLIER = 2.5;
const BOSS_BASE_HEALTH = 3; // Hits per level
const BOSS_SPEED_FACTOR = 0.8; // Relative to obstacle speed
const NAME_TEXT_OFFSET = 15; // Pixels below character image
const NAME_FONT = '10px sans-serif';
const NAME_COLOR = 'black';

// --- Image Loading ---
let imagesLoaded = 0;
function preloadImages(callback) {
    // Use allCharacterNames for preloading
    let totalImagesToLoad = allCharacterNames.length;
    if (totalImagesToLoad === 0) {
        console.log("No character names defined for preloading.");
        callback();
        return;
    }
    imagesLoaded = 0; // Reset counter

    allCharacterNames.forEach(name => {
        const img = new Image();
        const encodedName = encodeURIComponent(name);
        img.src = `Karakterler/${encodedName}.png`;
        img.onload = () => {
            imagesLoaded++;
            characterImages[name] = img;
            if (imagesLoaded === totalImagesToLoad) {
                console.log("All images loaded.");
                if (characterImages['Apo']) {
                    apo.img = characterImages['Apo'];
                } else {
                    console.error("Apo image failed to load!");
                }
                callback();
            }
        };
        img.onerror = () => {
            console.error(`Failed to load image: Karakterler/${encodedName}.png`);
            imagesLoaded++; // Count error as loaded to not block callback
             if (imagesLoaded === totalImagesToLoad) {
                console.log("Finished loading images (with errors).");
                 if (characterImages['Apo']) {
                    apo.img = characterImages['Apo'];
                } else {
                     console.error("Apo image failed to load during error handling!");
                }
                callback();
            }
        };
    });
}

// --- Character Spawning (Unique Obstacles, Random Targets) ---
function spawnCharacter(isTarget) {
    if (isTarget) {
        console.error("spawnCharacter(true) should not be called. Use respawnRandomTarget instead.");
        respawnRandomTarget();
        return;
    }

    // --- Obstacle Spawning Logic ---
    const availableList = availableObstacles;
    const onScreenList = currentObstacles;

    if (availableList.length === 0) {
        console.log(`No more unique obstacles available to spawn.`);
        return; // No more unique characters of this type
    }

    // Select and remove a random character from the available list
    const randomIndex = Math.floor(Math.random() * availableList.length);
    const name = availableList.splice(randomIndex, 1)[0]; // Remove the name

    const img = characterImages[name];
    if (!img) {
        console.error(`Image for ${name} not loaded, cannot spawn.`);
        return;
    }

    const speed = currentObstacleSpeed;
    // Calculate Y position for MIDDLE band
    const obstacleMinY = canvasHeight / 3;
    const obstacleMaxY = (2 * canvasHeight / 3) - characterSize;
    const obstacleSpawnHeight = obstacleMaxY - obstacleMinY;
    const spawnY = obstacleMinY + Math.random() * obstacleSpawnHeight;

    const character = {
        x: Math.random() * (canvasWidth - characterSize),
        y: spawnY, // Spawn in the MIDDLE third
        width: characterSize,
        height: characterSize,
        baseSpeed: baseObstacleSpeed,
        speed: speed,
        img: img,
        name: name,
        dx: (Math.random() < 0.5 ? 1 : -1) * speed // Initial horizontal direction
    };

    onScreenList.push(character);
    console.log(`Spawned Obstacle: ${name}. Available Obstacles: ${availableList.length}`);

    // Simple anti-overlap nudge (within obstacles)
    for (let i = 0; i < onScreenList.length -1; i++) {
        const other = onScreenList[i];
         if (Math.abs(character.x - other.x) < characterSize && Math.abs(character.y - other.y) < characterSize) {
             character.x += characterSize * (Math.random() < 0.5 ? 1 : -1);
             character.x = Math.max(0, Math.min(canvasWidth - characterSize, character.x));
             break; // Nudge once is enough for this simple check
         }
    }
}

// --- Target Respawning ---
function respawnRandomTarget() {
    if (allTargetNames.length === 0) {
        console.error("No target names defined in allTargetNames.");
        return;
    }
    const name = allTargetNames[Math.floor(Math.random() * allTargetNames.length)];
    const img = characterImages[name];
    if (!img) {
        console.error(`Image for target ${name} not loaded, cannot respawn.`);
        return;
    }

    const speed = currentTargetSpeed;
    // Spawn in the TOP band
    const spawnY = Math.random() * (canvasHeight / 3);

    // Select a random phrase
    const phrase = targetPhrases[Math.floor(Math.random() * targetPhrases.length)];

    const character = {
        x: Math.random() * (canvasWidth - characterSize),
        y: spawnY,
        width: characterSize,
        height: characterSize,
        baseSpeed: baseTargetSpeed,
        speed: speed,
        img: img,
        name: name,
        dx: (Math.random() < 0.5 ? 1 : -1) * speed, // Initial horizontal direction
        speechText: phrase // Assign random phrase
    };

    targets.push(character); // Add to the targets array
    // console.log(`Respawned Target: ${name}`);

    // Simple anti-overlap nudge (within targets)
    for (let i = 0; i < targets.length -1; i++) {
        const other = targets[i];
         if (Math.abs(character.x - other.x) < characterSize && Math.abs(character.y - other.y) < characterSize) {
             character.x += characterSize * (Math.random() < 0.5 ? 1 : -1);
             character.x = Math.max(0, Math.min(canvasWidth - characterSize, character.x));
             break;
         }
    }
}

// Renamed function to reflect it only runs at the very start
function spawnInitialGameCharacters() {
    // Determine initial counts based on difficulty (example)
    const numTargets = difficulty === 'easy' ? 3 : difficulty === 'normal' ? 2 : 2;
    const numObstacles = difficulty === 'easy' ? 1 : difficulty === 'normal' ? 2 : 3;

    console.log(`Spawning initial characters: ${numTargets} targets, ${numObstacles} obstacles`);

    // Spawn initial targets (allowing repeats from the start)
    for (let i = 0; i < numTargets; i++) {
        respawnRandomTarget(); // Use the new respawn function
    }
    // Spawn initial unique obstacles
    for (let i = 0; i < numObstacles && availableObstacles.length > 0; i++) {
        spawnCharacter(false); // Still use this for unique obstacles
    }
}

// --- Update Speeds Based on Level ---
function updateSpeedsForLevel(level) {
    console.log(`%cupdateSpeedsForLevel called for level ${level}`, 'color: orange; font-weight: bold;');
    currentTargetSpeed = baseTargetSpeed * Math.pow(speedIncreaseFactor, level - 1);
    currentObstacleSpeed = baseObstacleSpeed * Math.pow(speedIncreaseFactor, level - 1);
    apo.speed = apo.baseSpeed * Math.pow(speedIncreaseFactor, level - 1); // Apo also speeds up?

    console.log(`Level ${level}: Target Speed=${currentTargetSpeed.toFixed(2)}, Obstacle Speed=${currentObstacleSpeed.toFixed(2)}`);

    // Update speed of existing on-screen characters
    targets.forEach(t => { t.speed = currentTargetSpeed; t.dx = Math.sign(t.dx) * currentTargetSpeed; });
    currentObstacles.forEach(o => { o.speed = currentObstacleSpeed; o.dx = Math.sign(o.dx) * currentObstacleSpeed; });
}

// --- Timer Functions ---
function updateTimerDisplay() {
    timerDisplay.textContent = `Süre: ${timeLeft}`;
}

function stopTimer() {
    if (gameTimerInterval) {
        clearInterval(gameTimerInterval);
        gameTimerInterval = null;
    }
}

function startTimer() {
    stopTimer(); // Ensure no multiple timers run
    timeLeft = LEVEL_DURATION;
    levelStartTime = Date.now();
    updateTimerDisplay();

    gameTimerInterval = setInterval(() => {
        const elapsedSeconds = Math.floor((Date.now() - levelStartTime) / 1000);
        timeLeft = LEVEL_DURATION - elapsedSeconds;
        updateTimerDisplay();

        if (timeLeft <= 0) {
            stopTimer();
            if (score < levelScoreTarget) {
                triggerGameOver("Süre doldu!");
            } else {
                // This case should ideally be handled by level progression check
                // but as a fallback, if timer ends exactly when score is met.
                console.log("Timer ended, but score target met just in time?");
                 // Force level progression check again maybe? Or let collision handle it.
            }
        }
    }, 1000); // Update every second
}

// --- Level Management ---
function calculateScoreTarget(level) {
    return baseLevelScoreTarget + (level - 1) * scoreTargetIncreasePerLevel;
}

function startLevel(level) {
    currentLevel = level;
    levelScoreTarget = calculateScoreTarget(level);

    console.log(`Starting Level ${level}. Target Score: ${levelScoreTarget}`);
    levelDisplay.textContent = `Seviye: ${currentLevel}`;
    scoreTargetDisplay.textContent = `Hedef: ${levelScoreTarget}`; // Update target display

    updateSpeedsForLevel(level);

    // Start the timer for the level
    startTimer();
}

function advanceLevel() {
    console.log(`%cadvanceLevel called. Current Level: ${currentLevel}, Score: ${score}, Target: ${levelScoreTarget}`, 'color: green; font-weight: bold;');
    stopTimer(); // Stop regular level timer
    // Score is NOT reset here anymore
    
    // Instead of starting next level, spawn the boss
    spawnBoss(); 

    // currentLevel++; // Level increments AFTER boss defeat
    // if (currentLevel > maxLevel) { ... } // Win check happens AFTER boss defeat
    // else { startLevel(currentLevel); ... } // Next level starts AFTER boss defeat
}

// --- Game State Management ---
function triggerGameOver(reason) {
    console.log(`Game Over: ${reason}`);
    gameOver = true;
    gameRunning = false;
    stopTimer();
    startButton.textContent = "Başlat"; // Reset button text
    // Display Game Over message on canvas
    drawOverlayMessage(`Oyun Bitti!\n${reason}\nSkor: ${score}`);
    // Ensure timer/target displays are visible again if game ended
    timerDisplay.style.visibility = 'visible';
    scoreTargetDisplay.style.visibility = 'visible';
}

function triggerGameWin() {
    console.log("Game Won!");
    gameWon = true;
    gameRunning = false;
    stopTimer();
     startButton.textContent = "Başlat"; // Reset button text
    // Display Win message on canvas
    drawOverlayMessage(`Tebrikler!\nOyunu Kazandın!\nFinal Skoru: ${score}`);
    // Ensure timer/target displays are visible again if game ended
    timerDisplay.style.visibility = 'visible';
    scoreTargetDisplay.style.visibility = 'visible';
}

function drawOverlayMessage(message) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    ctx.fillStyle = 'white';
    ctx.font = 'bold 40px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Handle multi-line messages
    const lines = message.split('\n');
    const lineHeight = 50;
    const startY = canvasHeight / 2 - (lines.length - 1) * lineHeight / 2;
    lines.forEach((line, index) => {
        ctx.fillText(line, canvasWidth / 2, startY + index * lineHeight);
    });
     ctx.textAlign = 'start'; // Reset alignment
     ctx.textBaseline = 'alphabetic'; // Reset baseline
}

// --- Game Logic ---
function updateGame() {
    if (!gameRunning) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // --- Handle Input & Move Apo ---
    if (keysPressed.ArrowLeft && apo.x > 0) {
        apo.x -= apo.speed;
    }
    if (keysPressed.ArrowRight && apo.x < canvasWidth - apo.width) {
        apo.x += apo.speed;
    }
    if (keysPressed.ArrowUp && apo.y > canvasHeight / 2) { // Limit Apo to bottom half
        apo.y -= apo.speed;
    }
    if (keysPressed.ArrowDown && apo.y < canvasHeight - apo.height) {
        apo.y += apo.speed;
    }
    // --- Handle Shooting ---
    if (keysPressed.Space) {
        shootArrow();
        keysPressed.Space = false; // Fire one arrow per key press registration
    }

    // --- Boss Stage Logic ---
    if (bossCharacter) {
        // Move Boss (simple horizontal bounce for now)
        bossCharacter.x += bossCharacter.dx;
        if (bossCharacter.x <= 0 || bossCharacter.x + bossCharacter.width >= canvasWidth) {
            bossCharacter.dx *= -1;
        }
        // Potentially move arrows, but not targets/obstacles?
        moveArrows(); 
        // Check collisions (already handled in checkCollisions based on bossCharacter)
        checkCollisions(); 

    } else {
        // --- Regular Level Logic (No Boss) ---
        moveArrows();
        moveTargets();
        moveObstacles();
        checkCollisions();
        // Timer check is handled by the interval itself
    }

    // --- Draw Apo ---
    if (apo.img) {
        ctx.drawImage(apo.img, apo.x, apo.y, apo.width, apo.height);
        drawCharacterName(apo); // Draw Apo's name
    }

    // --- Draw Arrows ---
    loveArrows.forEach(arrow => {
        drawHeart(arrow.x, arrow.y, arrowWidth, arrowHeight);
    });

    // --- Draw Targets ---
    targets.forEach(target => {
        if (target.img) {
            ctx.drawImage(target.img, target.x, target.y, target.width, target.height);
            drawSpeechBubble(ctx, target.speechText || "...?", target.x + target.width / 2, target.y);
            drawCharacterName(target); // Draw target's name
        } else {
            ctx.fillStyle = 'green';
            ctx.fillRect(target.x, target.y, target.width, target.height);
        }
    });

    // --- Draw Obstacles ---
     currentObstacles.forEach(obstacle => {
        if (obstacle.img) {
            ctx.drawImage(obstacle.img, obstacle.x, obstacle.y, obstacle.width, obstacle.height);
            drawCharacterName(obstacle); // Draw obstacle's name
        } else {
            ctx.fillStyle = 'purple';
            ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        }
    });

    // --- Draw Boss (if exists) ---
    if (bossCharacter && bossCharacter.img) {
        ctx.drawImage(bossCharacter.img, bossCharacter.x, bossCharacter.y, bossCharacter.width, bossCharacter.height);
        drawCharacterName(bossCharacter); // Draw Boss's name
        drawBossHealthBar(); // Draw health bar
    }

    // --- Update and Draw Floating Texts ---
    updateAndDrawFloatingTexts();

    // Request next frame
    requestAnimationFrame(updateGame);
}

// --- Shooting Logic ---
function shootArrow() {
    const arrowX = apo.x + apo.width / 2 - arrowWidth / 2;
    const arrowY = apo.y;
    loveArrows.push({ x: arrowX, y: arrowY });
}

// --- Heart Drawing Function ---
function drawHeart(x, y, width, height) {
  ctx.fillStyle = 'red';
  ctx.beginPath();
  const topCurveHeight = height * 0.3;
  ctx.moveTo(x, y + topCurveHeight);
  // Top left curve
  ctx.bezierCurveTo(
    x, y,
    x - width / 2, y,
    x - width / 2, y + topCurveHeight
  );
  // Bottom left curve
  ctx.bezierCurveTo(
    x - width / 2, y + (height + topCurveHeight) / 2,
    x, y + (height + topCurveHeight) / 2,
    x, y + height
  );
  // Bottom right curve
  ctx.bezierCurveTo(
    x, y + (height + topCurveHeight) / 2,
    x + width / 2, y + (height + topCurveHeight) / 2,
    x + width / 2, y + topCurveHeight
  );
  // Top right curve
  ctx.bezierCurveTo(
    x + width / 2, y,
    x, y,
    x, y + topCurveHeight
  );
  ctx.closePath();
  ctx.fill();
}

// --- Draw Character Name Function ---
function drawCharacterName(character) {
    if (!character || !character.name) return;
    ctx.fillStyle = NAME_COLOR;
    ctx.font = NAME_FONT;
    ctx.textAlign = 'center';
    ctx.fillText(
        character.name, 
        character.x + character.width / 2, 
        character.y + character.height + NAME_TEXT_OFFSET
    );
     ctx.textAlign = 'start'; // Reset alignment
}

// --- Draw Boss Health Bar ---
function drawBossHealthBar() {
    if (!bossCharacter) return;
    const barWidth = 100;
    const barHeight = 10;
    const barX = canvasWidth / 2 - barWidth / 2;
    const barY = 10; // Position near top
    const healthPercentage = Math.max(0, bossHealth / (currentLevel * BOSS_BASE_HEALTH));

    // Background
    ctx.fillStyle = '#555';
    ctx.fillRect(barX, barY, barWidth, barHeight);
    // Health fill
    ctx.fillStyle = 'red';
    ctx.fillRect(barX, barY, barWidth * healthPercentage, barHeight);
    // Border
    ctx.strokeStyle = 'black';
    ctx.strokeRect(barX, barY, barWidth, barHeight);
}

// --- Speech Bubble Drawing Function ---
function drawSpeechBubble(ctx, text, x, y, bubbleWidth = 80, bubbleHeight = 20) {
    const bubblePadding = 5;
    const arrowHeight = 5;
    const bubbleY = y - bubbleHeight - arrowHeight - 5; // Position above the character
    const bubbleX = x - bubbleWidth / 2;

    // Bubble background
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(bubbleX, bubbleY);
    ctx.lineTo(bubbleX + bubbleWidth, bubbleY);
    ctx.lineTo(bubbleX + bubbleWidth, bubbleY + bubbleHeight);
    // Speech bubble arrow pointing down
    ctx.lineTo(x + 5, bubbleY + bubbleHeight); // Right side of arrow base
    ctx.lineTo(x, bubbleY + bubbleHeight + arrowHeight); // Arrow point
    ctx.lineTo(x - 5, bubbleY + bubbleHeight); // Left side of arrow base
    ctx.lineTo(bubbleX, bubbleY + bubbleHeight);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Text inside bubble
    ctx.fillStyle = 'black';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, bubbleY + bubbleHeight / 2);
}

// --- Collision Detection ---
function checkCollisions() {
    // --- Boss Collisions (Priority if Boss exists) ---
    if (bossCharacter) {
        checkBossCollisions();
    } else {
        // --- Regular Collisions (No Boss) ---
        checkRegularCollisions();
    }
}

// --- Separated Collision Logic ---
function checkRegularCollisions() {
     // Arrow - Target Collisions
     for (let i = loveArrows.length - 1; i >= 0; i--) {
        if (!loveArrows[i]) continue; // Skip if arrow was already removed in this loop
        const arrow = loveArrows[i];

        for (let j = targets.length - 1; j >= 0; j--) {
            const target = targets[j];
            if (
                arrow.x < target.x + target.width &&
                arrow.x + arrowWidth > target.x &&
                arrow.y < target.y + target.height &&
                arrow.y + arrowHeight > target.y
            ) {
                score++;
                scoreElement.textContent = `Puan: ${score}`;
                floatingTexts.push({
                    text: '+1',
                    x: target.x + target.width / 2,
                    y: target.y,
                    startTime: Date.now(),
                    duration: textEffectDuration // Use existing duration
                });

                // Remove arrow and target
                loveArrows.splice(i, 1);
                targets.splice(j, 1);

                // Spawn a new random target to replace the hit one
                respawnRandomTarget();

                // Check for level progression
                if (score >= levelScoreTarget) {
                    advanceLevel();
                }

                break; // Arrow hits only one target
            }
        }
    }

    // Arrow - Obstacle Collisions (Block arrow, maybe remove obstacle?)
     for (let i = loveArrows.length - 1; i >= 0; i--) {
         if (!loveArrows[i]) continue; // Skip if arrow was already removed
         const arrow = loveArrows[i];
         for (let k = currentObstacles.length - 1; k >= 0; k--) {
             const obstacle = currentObstacles[k];
             if (
                 arrow.x < obstacle.x + obstacle.width &&
                 arrow.x + arrowWidth > obstacle.x &&
                 arrow.y < obstacle.y + obstacle.height &&
                 arrow.y + arrowHeight > obstacle.y
             ) {
                 // Arrow hits obstacle
                 loveArrows.splice(i, 1); // Remove the arrow
                 // Optional: Add a "blocked" effect?
                 // Optional: Damage/remove obstacle?
                  floatingTexts.push({
                     text: 'X', x: obstacle.x + obstacle.width/2, y: obstacle.y, startTime: Date.now(), duration: 500, color: 'grey'
                 });

                 // Obstacles currently persist
                 break; // Arrow hits only one obstacle
             }
         }
     }

    // Apo - Obstacle Collisions (Game Over?)
    // (To be implemented - how should this work?)
}

function checkBossCollisions() {
     // Arrow - Boss Collisions
    for (let i = loveArrows.length - 1; i >= 0; i--) {
        if (!loveArrows[i]) continue;
        const arrow = loveArrows[i];

        if (
            arrow.x < bossCharacter.x + bossCharacter.width &&
            arrow.x + arrowWidth > bossCharacter.x &&
            arrow.y < bossCharacter.y + bossCharacter.height &&
            arrow.y + arrowHeight > bossCharacter.y
        ) {
            // Hit Boss!
            loveArrows.splice(i, 1); // Remove arrow
            bossHealth--;
            console.log(`Boss Hit! Health: ${bossHealth}`);

            // Add hit effect (e.g., flash boss or text)
            floatingTexts.push({
                text: '-1', x: bossCharacter.x + bossCharacter.width / 2, y: bossCharacter.y + bossCharacter.height / 2, startTime: Date.now(), duration: 300, color: 'orange', fontSize: '20px'
            });

            if (bossHealth <= 0) {
                defeatBoss();
                break; // Boss defeated, no need to check more arrows
            }
        }
    }

    // Apo - Boss Collision (Implement if needed - e.g., game over)
    // if (checkAABBCollision(apo, bossCharacter)) { ... triggerGameOver ... }
}

// Helper for collision check (optional but cleaner)
function checkAABBCollision(rect1, rect2) {
    return (
        rect1.x < rect2.x + rect2.width &&
        rect1.x + rect1.width > rect2.x &&
        rect1.y < rect2.y + rect2.height &&
        rect1.y + rect1.height > rect2.y
    );
}

// --- Defeat Boss Logic ---
function defeatBoss() {
    console.log("%cBOSS DEFEATED!", 'color: red; font-size: 20px;');
    floatingTexts.push({
        text: 'Boss Gitti!', x: canvasWidth / 2, y: canvasHeight / 2, startTime: Date.now(), duration: 2000, color: 'red', fontSize: '30px'
    });
    bossCharacter = null; // Remove boss
    
    currentLevel++; // Advance level AFTER boss
    if (currentLevel > maxLevel) {
        triggerGameWin();
    } else {
        // Reset score only AFTER boss is defeated
        score = 0;
        scoreElement.textContent = `Puan: ${score}`;
        console.log("%cScore reset to 0 for level start (post-boss)", 'color: blue;');
        
        startLevel(currentLevel); // Start the next actual level
        // Make timer/target visible again
        timerDisplay.style.visibility = 'visible';
        scoreTargetDisplay.style.visibility = 'visible';
    }
}

// --- Floating Text Update/Draw ---
function updateAndDrawFloatingTexts() {
    const now = Date.now();
    ctx.textAlign = 'center'; // Ensure center alignment

    for (let i = floatingTexts.length - 1; i >= 0; i--) {
        const ft = floatingTexts[i];
        const duration = ft.duration || textEffectDuration; // Allow custom duration
        const elapsedTime = now - ft.startTime;

        if (elapsedTime > duration) {
            floatingTexts.splice(i, 1); // Remove expired text
            continue;
        }

        const progress = elapsedTime / duration;
        const currentY = ft.y - progress * 30; // Float upwards
        ctx.globalAlpha = 1 - progress; // Fade out

        // Use custom color/font if provided
        ctx.fillStyle = ft.color || 'gold';
        ctx.font = ft.fontSize || 'bold 16px sans-serif';

        ctx.fillText(ft.text, ft.x, currentY);

        ctx.globalAlpha = 1; // Reset alpha
    }
     ctx.textAlign = 'start'; // Reset alignment
}

// --- Move Arrows (extracted function) ---
function moveArrows() {
     for (let i = loveArrows.length - 1; i >= 0; i--) {
        loveArrows[i].y -= arrowSpeed;
        if (loveArrows[i].y + arrowHeight < 0) {
            loveArrows.splice(i, 1); // Remove arrows that go off-screen
        }
    }
}

// --- Move Targets (extracted function) ---
function moveTargets() {
    targets.forEach(target => {
        target.x += target.dx;
        if (target.x <= 0 || target.x + target.width >= canvasWidth) {
            target.dx *= -1; // Reverse direction
        }
    });
}

// --- Move Obstacles (extracted function) ---
function moveObstacles() {
     currentObstacles.forEach(obstacle => { // Use renamed array
        obstacle.x += obstacle.dx;
        if (obstacle.x <= 0 || obstacle.x + obstacle.width >= canvasWidth) {
            obstacle.dx *= -1; // Reverse direction
        }
    });
}

// --- Spawn Boss ---
function spawnBoss() {
    const name = 'Sönmez';
    const img = characterImages[name];
    if (!img) {
        console.error(`Image for Boss ${name} not loaded, cannot spawn.`);
        // Optionally trigger level advance anyway or handle error
        return;
    }

    const bossWidth = characterSize * BOSS_SIZE_MULTIPLIER;
    const bossHeight = characterSize * BOSS_SIZE_MULTIPLIER;
    const bossSpeed = currentObstacleSpeed * BOSS_SPEED_FACTOR; // Based on current level's obstacle speed
    bossHealth = currentLevel * BOSS_BASE_HEALTH;

     // Spawn in the middle horizontally, slightly lower than regular obstacles?
    const spawnX = canvasWidth / 2 - bossWidth / 2;
    const spawnY = (canvasHeight / 2) - bossHeight / 2; // Center vertically for impact?

    bossCharacter = {
        x: spawnX,
        y: spawnY,
        width: bossWidth,
        height: bossHeight,
        speed: bossSpeed,
        img: img,
        name: name,
        dx: (Math.random() < 0.5 ? 1 : -1) * bossSpeed
    };
    console.log(`%cBOSS SPAWNED! Level: ${currentLevel}, Health: ${bossHealth}`, 'color: red; font-weight: bold;');
    // Optionally clear existing obstacles/targets?
    // currentObstacles = []; 
    // targets = [];
    // Optionally display a BOSS message
    floatingTexts.push({
        text: 'BOSS!', x: canvasWidth / 2, y: canvasHeight / 2 - 50, startTime: Date.now(), duration: 2500, color: 'red', fontSize: '40px'
    });
     // Hide regular timer/target during boss fight
    timerDisplay.style.visibility = 'hidden';
    scoreTargetDisplay.style.visibility = 'hidden';
}

// --- Game Start Function ---
function startGame() {
    // Removed the check if game is running here, handled by listener
    console.log("Starting game...");

    // Reset Game State
    score = 0;
    currentLevel = 1;
    gameOver = false;
    gameWon = false;
    gameRunning = true;
    bossCharacter = null; // Ensure no boss at start
    scoreElement.textContent = `Puan: ${score}`;
    floatingTexts = [];
    loveArrows = [];
    targets = [];
    currentObstacles = []; // Use renamed array
    keysPressed.Space = false;

    // Prepare unique character lists for this game session
    availableObstacles = [...allObstacleNames]; // Reset available obstacles
    console.log("Unique obstacles reset for new game:", availableObstacles);

    // Reset Apo position
    apo.x = canvasWidth / 2 - apo.width / 2;
    apo.y = canvasHeight - apo.height - 10;

    // Change button text and remove focus
    startButton.textContent = "Bitir";
    startButton.blur(); // VERY IMPORTANT: Remove focus to prevent spacebar trigger

    // Spawn initial characters for level 1
    spawnInitialGameCharacters(); // Uses the freshly reset available lists

    // Start Level 1
    startLevel(1);
     // Ensure timer/target displays are visible at start
    timerDisplay.style.visibility = 'visible';
    scoreTargetDisplay.style.visibility = 'visible';

    // Start the game loop
    updateGame();
}

// --- Event Listeners ---
startButton.addEventListener('click', () => {
    // Check the state *before* changing it
    if (gameRunning) { // If game is running, button acts as "Bitir"
        console.log("Bitir button clicked.");
        stopGameManually();
    } else { // If game is not running (initial state or after game over/manual stop), button acts as "Başlat"
        console.log("Başlat button clicked.");
        // Ensure images are loaded before starting
        if (imagesLoaded === allCharacterNames.length) {
            startGame(); // This will set text to "Bitir" and blur
        } else {
            console.log("Waiting for images to load...");
            // Button should still be disabled if loading
        }
    }
    // Removed the complex logic from previous version
});

difficultySelect.addEventListener('change', (e) => {
    if (!gameRunning) {
        difficulty = e.target.value;
        console.log(`Difficulty set to: ${difficulty}`);
        // Difficulty now mainly affects initial spawn counts
    }
});

// Keyboard Listeners (remain mostly the same)
window.addEventListener('keydown', (e) => {
    if (e.code === 'ArrowLeft') keysPressed.ArrowLeft = true;
    if (e.code === 'ArrowRight') keysPressed.ArrowRight = true;
    if (e.code === 'ArrowUp') keysPressed.ArrowUp = true;
    if (e.code === 'ArrowDown') keysPressed.ArrowDown = true;
    if (e.code === 'Space') {
        if (gameRunning && !gameOver && !gameWon) { // Only allow shooting if game is active
             keysPressed.Space = true;
             e.preventDefault(); // Prevent default browser scroll on Space press
        }
    }
});

window.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowLeft') keysPressed.ArrowLeft = false;
    if (e.code === 'ArrowRight') keysPressed.ArrowRight = false;
    if (e.code === 'ArrowUp') keysPressed.ArrowUp = false;
    if (e.code === 'ArrowDown') keysPressed.ArrowDown = false;
     if (e.code === 'Space') {
        keysPressed.Space = false;
     }
});

// --- Add function to stop game via button ---
function stopGameManually() {
    console.log("Stopping game manually via Bitir button.");
    if (gameRunning) {
        triggerGameOver("Oyun Durduruldu"); // Use GameOver state for consistency
    }
}

// --- Touch Event Listeners ---
function handleTouch(event, key, isPressed) {
    event.preventDefault(); // Prevent scrolling/zooming
    keysPressed[key] = isPressed;
}

// Add listeners for each button
if (touchUp) touchUp.addEventListener('touchstart', (e) => handleTouch(e, 'ArrowUp', true), { passive: false });
if (touchUp) touchUp.addEventListener('touchend', (e) => handleTouch(e, 'ArrowUp', false), { passive: false });

if (touchDown) touchDown.addEventListener('touchstart', (e) => handleTouch(e, 'ArrowDown', true), { passive: false });
if (touchDown) touchDown.addEventListener('touchend', (e) => handleTouch(e, 'ArrowDown', false), { passive: false });

if (touchLeft) touchLeft.addEventListener('touchstart', (e) => handleTouch(e, 'ArrowLeft', true), { passive: false });
if (touchLeft) touchLeft.addEventListener('touchend', (e) => handleTouch(e, 'ArrowLeft', false), { passive: false });

if (touchRight) touchRight.addEventListener('touchstart', (e) => handleTouch(e, 'ArrowRight', true), { passive: false });
if (touchRight) touchRight.addEventListener('touchend', (e) => handleTouch(e, 'ArrowRight', false), { passive: false });

if (touchShoot) touchShoot.addEventListener('touchstart', (e) => {
    if (gameRunning && !gameOver && !gameWon) {
        handleTouch(e, 'Space', true);
    }
}, { passive: false });
if (touchShoot) touchShoot.addEventListener('touchend', (e) => handleTouch(e, 'Space', false), { passive: false });

// --- Initialization ---
function initialize() {
    console.log("Initializing game...");
    startButton.disabled = true;
    startButton.textContent = "Yükleniyor...";

    preloadImages(() => {
        console.log("Preloading complete. Ready to start.");
        startButton.disabled = false;
        startButton.textContent = "Başlat"; // Ensure it starts as Başlat
        // Draw initial static scene (Apo, maybe background?)
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        if (apo.img) {
            ctx.drawImage(apo.img, apo.x, apo.y, apo.width, apo.height);
            drawCharacterName(apo); // Draw name in initial state too
        }
        // Display initial level/target
         levelDisplay.textContent = `Seviye: 1`;
         scoreTargetDisplay.textContent = `Hedef: ${calculateScoreTarget(1)}`;
         timerDisplay.textContent = `Süre: ${LEVEL_DURATION}`; // Show initial time
         // Ensure timer/target displays are visible initially
        timerDisplay.style.visibility = 'visible';
        scoreTargetDisplay.style.visibility = 'visible';
    });
}

initialize(); 