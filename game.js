const TILEWIDTH = 24;
const TILEHEIGHT = 16;

const LEVEL0Y = 166;
const LEVEL1Y = 287;
const LEVEL2Y = 408;

const SCREENWIDTH = 635;

const SCALE = 2;

const RAMP_START = 100;

let fps, fpsInterval, startTime, now, then, elapsed;

let canvas;
let ctx;
let sprites;

let playerLevel = 0;
let playerX = 0;
let playerY = 0;
let playerDrawX = 0;
let playerXSpeed = 0;
let playerXSpeedLast = 0;
let playerYSpeed = 0;

let numBuses = 0;

let rampWidth = 132;

let jumping = false;
let wheelie = 0;
let crashing = false;
let landed = false;

let throttle = 0;
let waitingForThrottle = false;

let spriteToggleTimer = 0;
let spriteToggleWhich = 0;

let spriteCrashTimer = 0;
let crashSpriteWhich = 12;

const crashSprites = [
    12,13,14,15,18,19
];

const track = document.getElementById('track');
const thumb = document.getElementById('thumb');
const score = document.getElementById('score');
const restart = document.getElementById('restart');
const throttleMessage = document.getElementById('throttleMessage');

const trackRect = track.getBoundingClientRect();
const thumbRect = thumb.getBoundingClientRect();

let draggingThrottle = false;

let gameOver = true;

let crashCount = 0;

let sndMotorLow = new Howl({
    src: ['sounds/motorlow.wav'],
    autoplay: false,
    loop: true,
    volume: 0.2
});
let sndMotorMed = new Howl({
    src: ['sounds/motormed.wav'],
    autoplay: false,
    loop: true,
    volume: 0.2
});
let sndMotorHigh = new Howl({
    src: ['sounds/motorhi.wav'],
    autoplay: false,
    loop: true,
    volume: 0.2
});
let sndCrash = new Howl({
    src: ['sounds/crash.wav'],
    autoplay: false,
    loop: false
});   
let sndSkid = new Howl({
    src: ['sounds/skid.wav'],
    autoplay: false,
    loop: false
});   
let sndCheers = new Howl({
    src: ['sounds/cheers.wav'],
    autoplay: false,
    loop: false
});   
let sndMotorJump = new Howl({
    src: ['sounds/motorjump.wav'],
    autoplay: false,
    loop: false
});   
let sndBounce = new Howl({
    src: ['sounds/bounce.wav'],
    autoplay: false,
    loop: false
});   

(function init() {

    thumb.style.top = trackRect.height - thumbRect.height + 'px';

    thumb.addEventListener('mousedown', (event) => {
        draggingThrottle = true;
        event.stopPropagation();
        event.preventDefault();        
    })
    document.addEventListener('mouseup', (event) => {
        draggingThrottle = false;
        throttle = 0;
        thumb.style.top = trackRect.height - thumbRect.height + 'px';
    })
    document.addEventListener('mousemove', (event) => {
        event.stopPropagation();
        event.preventDefault();
        if (draggingThrottle) {
            let dragPos = event.clientY - trackRect.top - thumbRect.height / 2;
            if (dragPos < 0) {
                dragPos = 0;
            } else if (dragPos > trackRect.height - thumbRect.height) {
                dragPos = trackRect.height - thumbRect.height;
            }
            thumb.style.top = dragPos + 'px';
            throttle = 1 - (dragPos / (trackRect.height - thumbRect.height));
        }
    })
    thumb.addEventListener('touchstart', (event) => {
        draggingThrottle = true;
        event.stopPropagation();
        event.preventDefault();        
    })
    document.addEventListener('touchend', (event) => {
        draggingThrottle = false;
        throttle = 0;
        thumb.style.top = trackRect.height - thumbRect.height + 'px';
    })
    document.body.addEventListener('touchmove', (event) => {
        event.stopPropagation();
        event.preventDefault();
    })    
    document.addEventListener('touchmove', (event) => {
        event.stopPropagation();
        event.preventDefault();
        if (draggingThrottle) {
            let dragPos = event.touches[0].clientY - trackRect.top - thumbRect.height / 2;
            if (dragPos < 0) {
                dragPos = 0;
            } else if (dragPos > trackRect.height - thumbRect.height) {
                dragPos = trackRect.height - thumbRect.height;
            }
            thumb.style.top = dragPos + 'px';
            throttle = 1 - (dragPos / (trackRect.height - thumbRect.height));
        }
    })
    restart.addEventListener('click', () => {
        gameOver = false;
        initGame();
        initLevel();
    })

    initGame();
    initLevel();
    initTimer(60);
})();


function initTimer(fps) {
    canvas = document.getElementById("myCanvas");
    ctx = canvas.getContext("2d"); // Get the 2D rendering context

    sprites = new Image();
    sprites.src = './images/sprites.png';    

    fpsInterval = 1000 / fps;
    then = Date.now();
    startTime = then;
    tick();
}

function tick() {

    // request another frame
    requestAnimationFrame(tick);

    // calc elapsed time since last loop
    now = Date.now();
    elapsed = now - then;

    // if enough time has elapsed, draw the next frame
    if (elapsed > fpsInterval) {

        // Get ready for next frame by setting then = now, but also adjust for the
        // specified fpsInterval not being a multiple of RAF's interval (16.7ms)
        then = now - (elapsed % fpsInterval);

        run();
        draw();
    }
}

function initGame() {
    numBuses = 5;
    landed = false;
    gameOver = false;
    crashCount = 0;

    sndMotorLow.stop();
    sndMotorMed.stop();
    sndMotorHigh.stop();
}

function initLevel() {
    playerLevel = 0;
    playerX = 50;
    playerY = 0;
    playerXSpeed = 3;
    playerYSpeed = 0;
    jumping = false;
    wheelie = 0;
    playerXSpeedLast = playerXSpeed;
    crashSpriteWhich = 12;
    crashSpriteWhich = 18;

    if (landed) {
        landed = false;
        ++numBuses;
        if (numBuses > 18) {
            numBuses = 18;
        }
    } else if (crashing) {
        ++crashCount;
        if (crashCount >= 3) {
            gameOver = true;
        }
    }
    score.innerText = numBuses;

    crashing = false;
    landed = false;

    waitingForThrottle = true;
}

function blitSprite(tileIndex, destX, destY) {
    const srcX = (tileIndex % 4) * TILEWIDTH;
    const srcY = (Math.floor(tileIndex / 4)) * TILEHEIGHT;
    ctx.drawImage(sprites, srcX, srcY, TILEWIDTH, TILEHEIGHT, destX, destY, TILEWIDTH * SCALE, TILEHEIGHT * SCALE);
}

function drawGround(yPos) {
    ctx.fillStyle = '#000000';
    for (let x=0; x < SCREENWIDTH; x+=4) {
        ctx.fillRect(x, yPos, 2, 2);
    }
}

function run() {

    if (gameOver) {
        sndMotorLow.stop();
        sndMotorMed.stop();
        sndMotorHigh.stop();
        return;
    }

    if (waitingForThrottle) {
        if (throttle < .01) {
            waitingForThrottle = false;
        } else {
            sndMotorLow.stop();
            sndMotorMed.stop();
            sndMotorHigh.stop();            
            throttleMessage.style.display = 'block';
        }
        return;
    }
    else {
        throttleMessage.style.display = 'none'
    }

    playerXSpeedLast = playerXSpeed;

    if (crashing) {
        playerX += playerXSpeed;
    }
    else {
        playerXSpeed += .2 * throttle;
        if (playerXSpeed < 3) playerXSpeed = 3;
        else if (playerXSpeed > 9) playerXSpeed = 9;
        playerXSpeed *= .998; // drag
        playerX += playerXSpeed;

        if (playerXSpeed - playerXSpeedLast > .08) {
            crashing = true;
            sndCrash.play();
            sndSkid.play();
        } else if (playerXSpeed - playerXSpeedLast > .04) {
            wheelie = 2;
        } else if (playerXSpeed - playerXSpeedLast > .02) {
            wheelie = 1;
        } else {
            wheelie = 0;
        }
    }

    if (throttle > .1)
    {
        sndMotorLow.stop();
        sndMotorMed.stop();
        if (!sndMotorHigh.playing()) {
            sndMotorHigh.play();
        }
    } else if (throttle > .05)
    {
        sndMotorLow.stop();
        sndMotorHigh.stop();
        if (!sndMotorMed.playing()) {
            sndMotorMed.play();
        }        
    } else {
        sndMotorMed.stop();
        sndMotorHigh.stop();
        if (!sndMotorLow.playing()) {
            sndMotorLow.play();
        }
    }

    playerY -= playerYSpeed;

    const gapStart = RAMP_START + 32 + TILEWIDTH * SCALE
    const gapEnd = numBuses * 16 + RAMP_START + 16 + TILEWIDTH * SCALE
    const rightRampStart = gapEnd;
    const rightRampEnd = gapEnd + 48 + TILEWIDTH * SCALE;
    let groundLevel = playerLevel === 2 && playerX > gapStart && playerX < gapEnd ? -20 : 0;
    if (playerLevel === 2 && playerX > rightRampStart && playerX < rightRampEnd) {
        const percent = (playerX - rightRampStart) / (rightRampEnd - rightRampStart)
        groundLevel = ((-28 * (1 - percent)) + (0 * percent)) / 2;
    }
    if (playerY > groundLevel) {
        playerY = groundLevel;
        if (jumping) {
            jumping = false;
            const rampLong = (numBuses + 7) * 16 + RAMP_START + 32 + TILEWIDTH * SCALE
            const rampShort = (numBuses + 2) * 16 + RAMP_START + 32 + TILEWIDTH * SCALE
            if (playerX > rampLong) {
                // overshoot
                crashing = true;
                playerYSpeed = 0;
                landed = false;
                sndMotorLow.stop();
                sndMotorMed.stop();
                sndMotorHigh.stop();
                sndCrash.play();
            }
            else if (playerX < rampShort) {
                // bounce
                crashing = true;
                playerYSpeed = -playerYSpeed;
                landed = false;
                sndMotorLow.stop();
                sndMotorMed.stop();
                sndMotorHigh.stop();
                sndBounce.play();
            }
            else {
                // Landed
                playerYSpeed = 0;
                landed = true;
                sndMotorLow.stop();
                sndMotorMed.stop();
                sndMotorHigh.stop();                
                sndCheers.play();
            }
        }
    }

    if (playerX >= SCREENWIDTH + TILEWIDTH) {
        if (crashing) {
            initLevel();
            return;
        }
        ++playerLevel;
        if (playerLevel >= 3) {
            initLevel();
        } else {
            playerX = -TILEWIDTH;
        }
    }
    playerDrawX = playerLevel === 1 ? (SCREENWIDTH - TILEWIDTH) - playerX : playerX;

    if (playerLevel === 2 && playerX > RAMP_START + 6 && playerX < RAMP_START + TILEWIDTH * 2) {
        // *** Going up ramp ***
        jumping = true;
        playerYSpeed = 4 * playerXSpeed / 7;
        if (!sndMotorJump.playing()) {
            sndMotorJump.play();
        }
    } else {
        playerYSpeed -= .25; // gravity
    }

    spriteToggleTimer += playerXSpeed;
    if (spriteToggleTimer > 5) {
        spriteToggleTimer = 0;
        spriteToggleWhich = spriteToggleWhich === 0 ? 1 : 0;
    }

    if (crashing) {
        ++spriteCrashTimer;
        if (spriteCrashTimer > 5) {
            spriteCrashTimer = 0;
            crashSpriteWhich = crashSprites[Math.floor(Math.random() * 6)]
        }
    }
}

function draw() {

    ctx.imageSmoothingEnabled = false; 

    // Clear the canvas
    ctx.fillStyle = '#7f7f7f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw the ground lines
    drawGround(LEVEL0Y);
    drawGround(LEVEL1Y);
    drawGround(LEVEL2Y);

    // Draw the buses
    let rightRampX;
    for (let n = 0; n < numBuses; n++) {
        blitSprite(spriteToggleWhich ? 16 : 17, n * 16 + RAMP_START + 32 + TILEWIDTH * SCALE, LEVEL2Y - TILEHEIGHT * SCALE);
        rightRampX = (n + 2) * 16 + RAMP_START + 32 + TILEWIDTH * SCALE
    }

    // Draw the ramps
    blitSprite(20, RAMP_START, LEVEL2Y - TILEHEIGHT * SCALE);
    blitSprite(21, RAMP_START + TILEWIDTH * SCALE, LEVEL2Y - TILEHEIGHT * SCALE);
    blitSprite(22, rightRampX, LEVEL2Y - TILEHEIGHT * SCALE);
    blitSprite(23, rightRampX + TILEWIDTH * SCALE, LEVEL2Y - TILEHEIGHT * SCALE);

    // Draw the player bike
    if (!gameOver) {
        let whichSprite;
        if (crashing) {
            whichSprite = crashSpriteWhich;
        } else if (jumping) {
            whichSprite = 4 + (spriteToggleWhich ? 2 : 3);
        } else {
            if (wheelie > 1) {
                if (playerLevel === 0) {
                    whichSprite = 8 + (spriteToggleWhich ? 2 : 3);
                } else if (playerLevel === 1) {
                    whichSprite = 8 + (spriteToggleWhich ? 0 : 1);
                } else {
                    whichSprite = 8 + (spriteToggleWhich ? 2 : 3);
                }
            }
            else if (wheelie > 0) {
                if (playerLevel === 0) {
                    whichSprite = 4 + (spriteToggleWhich ? 2 : 3);
                } else if (playerLevel === 1) {
                    whichSprite = 4 + (spriteToggleWhich ? 0 : 1);
                } else {
                    whichSprite = 4 + (spriteToggleWhich ? 2 : 3);
                }
            }        
            else {
                if (playerLevel === 0) {
                    whichSprite = spriteToggleWhich ? 2 : 3;
                } else if (playerLevel === 1) {
                    whichSprite = spriteToggleWhich ? 0 : 1;
                } else {
                    whichSprite = spriteToggleWhich ? 2 : 3;
                }
            }
        }
        let level;
        switch (playerLevel) {
            case 0:
                level = LEVEL0Y;
                break;
            case 1:
                level = LEVEL1Y;
                break;
            case 2:
                level = LEVEL2Y;
                break;
        }
        blitSprite(whichSprite, playerDrawX, playerY + level - TILEHEIGHT * SCALE);
    }
}
