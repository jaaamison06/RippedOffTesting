// Biden Game - p5.js sketch with parallax background

// Mobile Audio Optimization System
let audioContext = null;
let audioUnlocked = false;
let audioBuffers = {}; // Store audio buffers for Web Audio API
let hasUserInteracted = false; // Track if user has interacted with the page
let gameInteractionStarted = false; // Track if actual game interaction has started

// Initialize mobile-optimized audio system
function initializeMobileAudio() {
    try {
        // Create Web Audio Context for better mobile support
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        if (window.AudioContext) {
            audioContext = new AudioContext();
        }
        
        // Setup mobile audio unlock
        setupMobileAudioUnlock();
        
        
    } catch (error) {
    }
}

// Setup mobile audio unlock mechanism - lightweight approach
function setupMobileAudioUnlock() {
    const unlockAudio = () => {
        if (audioUnlocked) return;
        
        // Only unlock audio context, don't set hasUserInteracted yet
        
        // Just resume the audio context, don't play any sounds yet
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume().then(() => {
                audioUnlocked = true;
            }).catch(e => {
            });
        } else {
            audioUnlocked = true;
        }
        
        // Remove event listeners after unlock
        document.removeEventListener('touchstart', unlockAudio);
        document.removeEventListener('touchend', unlockAudio);
        document.removeEventListener('click', unlockAudio);
        document.removeEventListener('keydown', unlockAudio);
    };
    
    // Add listeners for various mobile interaction events
    document.addEventListener('touchstart', unlockAudio, { once: true, passive: true });
    document.addEventListener('touchend', unlockAudio, { once: true, passive: true });
    document.addEventListener('click', unlockAudio, { once: true, passive: true });
    document.addEventListener('keydown', unlockAudio, { once: true, passive: true });
}

// Lazy unlock individual audio elements when first needed
async function unlockAndPlaySound(audioId, volume = 0.7) {
    const sound = document.getElementById(audioId);
    if (!sound) {
        return false;
    }
    
    // Check if this is a conditional sound that should only play during gameplay
    const conditionalSounds = ['ouch-sound', 'bell-sound', 'change-bet-sound'];
    const isConditionalSound = conditionalSounds.includes(audioId);
    
    // For conditional sounds, require both audio unlock AND game interaction
    if (isConditionalSound && (!hasUserInteracted || !gameInteractionStarted)) {
        return false;
    }
    
    // For background music and game sounds, only require audio context unlock
    if (!audioUnlocked) {
        return false;
    }
    
    // Check mute state
    const isMuted = localStorage.getItem('bidenGameMuted') === 'true';
    if (isMuted) {
        return false;
    }
    
    // Detect mobile vs desktop and adjust volume accordingly
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                     ('ontouchstart' in window) || 
                     (navigator.maxTouchPoints > 0);
    
    // Apply platform-specific volume adjustments
    let adjustedVolume = volume;
    if (audioId === 'ouch-sound' || audioId === 'bell-sound') {
        // These sounds need different volumes for mobile vs desktop
        adjustedVolume = isMobile ? volume : volume * 0.2; // Keep mobile unchanged, much lower on desktop
    }
    
    // Ensure audio context is ready
    await ensureAudioContextReady();
    
    // Try to unlock this specific audio if not already done
    if (!sound.unlocked) {
        try {
            sound.volume = 0; // Mute temporarily for unlock
            await sound.play();
            sound.pause();
            sound.currentTime = 0;
            sound.unlocked = true;
        } catch (e) {
        }
    }
    
    // Now play the sound normally with platform-adjusted volume
    try {
        sound.volume = adjustedVolume;
        sound.currentTime = 0;
        await sound.play();
        return true;
    } catch (error) {
        return false;
    }
}

// Resume audio context before playing any sound (mobile optimization)
async function ensureAudioContextReady() {
    if (audioContext && audioContext.state === 'suspended') {
        try {
            await audioContext.resume();
        } catch (e) {
        }
    }
}

// Preload and prepare all audio elements for mobile
function preloadAllAudio() {
    const audioElements = ['changebet-sound', 'ouch-sound', 'bell-sound', 'betsound', 'game-music'];
    
    audioElements.forEach(id => {
        const sound = document.getElementById(id);
        if (sound) {
            // Force preload the audio file
            sound.preload = 'auto';
            sound.load();
            
            // Set up event listeners to track loading
            sound.addEventListener('canplaythrough', () => {
            });
            
            sound.addEventListener('error', (e) => {
            });
        }
    });
}

// Global audio functions - mobile-compatible approach
async function playChangeBetSound() {
    await unlockAndPlaySound('changebet-sound', 0.7);
}

async function playBetSound() {
    await unlockAndPlaySound('betsound', 0.7);
}

async function playOuchSound() {
    // Higher volume for mobile - this should make it more audible
    await unlockAndPlaySound('ouch-sound', 0.9);
}

async function playBellSound() {
    // Higher volume for mobile - this should make it more audible  
    await unlockAndPlaySound('bell-sound', 0.9);
}

async function playGameMusic() {
    // Check mute state
    const isMuted = localStorage.getItem('bidenGameMuted') === 'true';
    if (isMuted) return;
    
    // Background music only requires audio context to be unlocked, not user interaction flags
    if (!audioUnlocked) {
        return;
    }
    
    // Ensure audio context is ready (mobile optimization)
    await ensureAudioContextReady();
    
    // For background music, we'll use HTML5 Audio since it needs to loop
    // and Web Audio API requires more complex setup for looping music
    const music = document.getElementById('game-music');
    if (music) {
        music.volume = 0.05; // Default to 5% volume when not muted
        
        // Ensure audio context is running for better mobile compatibility
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume().then(() => {
                music.play().catch(err => {
                });
            }).catch(e => {
                // Fallback if audio context fails
                music.play().catch(err => {
                })
            });
        } else {
            music.play().catch(err => {
            });
        }
    }
}
let gameStarted = false;
let lastWinAmount = 0; // Track the last win amount for display
let lossDisplayCheckerInterval = null; // Interval to ensure loss display stays at 0

// Constants - declare these first
const INITIAL_SCROLL_SPEED = 2; // Initial scroll speed when positioned
const SCROLL_ACCELERATION = 0.04; // Additive acceleration per frame (pixels/frame per frame)

// Game state to store URL parameters and other data
let gameState = {
    sessionID: null,
    rgsUrl: null,
    lang: null,
    currency: null,
    device: null,
    social: null,
    demo: null,
    // First bet tracking
    isFirstBet: true,
    // Authentication response fields
    authenticated: false,
    balance: 100.00, // Default fallback
    balanceCurrency: 'USD',
    config: null,
    round: null,
    pendingActiveRound: null, // Active round to resume after intro screens
    minBet: null,
    maxBet: null,
    stepBet: null,
    defaultBetLevel: null,
    betLevels: [],
    jurisdiction: null,
    // Game state
    currentBet: 1000000, // Default bet 1.00 in micro-units (will be overridden by defaultBetLevel from auth)
    bonusBetAmount: 1.00, // Bonus buy bet amount
    gameSpeed: 1, // Current game speed multiplier (1x, 2x, 3x)
    turboMode: false, // Turbo mode state (2x speed when active)
    playRequestInProgress: false, // Flag to prevent multiple simultaneous play requests
    baseParallaxSpeed: INITIAL_SCROLL_SPEED, // Base parallax speed
    parallaxSpeed: INITIAL_SCROLL_SPEED, // Current parallax speed
    lastSpeedFactor: 1, // Last speed factor for consistent animation
    // Game status flags
    gameOver: false,
    inSuspense: false,
    bidenFell: false,
    // Multiplier animation properties
    targetMultiplier: 0,
    currentMultiplier: 0,
    multiplierAnimationStarted: false,
    multiplierAnimationComplete: false,
    multiplierAnimationStartTime: 0,
    animationProgress: 0,
    isWinningGame: false,
    newBetPlaced: false, // Flag to indicate when a new bet has been placed
    lossConfirmed: false, // Flag to indicate when a loss has been confirmed and payout should stay at zero
    // Biden fall mechanic
    doesFall: false,
    fallTriggered: false,
    // Suspense period
    suspensePeriodStarted: false,
    suspensePeriodComplete: false,
    suspensePeriodDuration: 2000, // 2 seconds suspense delay
    suspenseStartTime: 0
};

// Parse and store URL parameters
function parseURLParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Extract all the parameters
    gameState.sessionID = urlParams.get('sessionID');
    gameState.rgsUrl = urlParams.get('rgs_url');
    gameState.lang = urlParams.get('lang');
    gameState.currency = urlParams.get('currency');
    gameState.device = urlParams.get('device');
    gameState.social = urlParams.get('social') === 'true'; // Convert to boolean
    gameState.demo = urlParams.get('demo') === 'true'; // Convert to boolean
    
    // Make gameState available globally
    window.gameState = gameState;
    
    return gameState;
}

// Authenticate with RGS server
async function authenticateWithRGS() {
    if (!gameState.sessionID || !gameState.rgsUrl) {
        throw new Error('Missing required authentication parameters');
    }

    try {
        const authUrl = `https://${gameState.rgsUrl}/wallet/authenticate`;
        const requestBody = {
            sessionID: gameState.sessionID
        };

        const response = await fetch(authUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        // Try to get response text for better error diagnosis
        const responseText = await response.text();

        if (!response.ok) {
            throw new Error(`Authentication failed: ${response.status} ${response.statusText} - ${responseText}`);
        }

        // Parse the response
        let authData;
        try {
            authData = JSON.parse(responseText);
        } catch (parseError) {
            throw new Error(`Invalid JSON response: ${responseText}`);
        }
        
        // Store authentication response in gameState
        gameState.authenticated = true;
        gameState.balance = authData.balance.amount;
        gameState.balanceCurrency = authData.balance.currency;
        gameState.config = authData.config;
        gameState.round = authData.round;

        // Extract config values for easy access
        if (authData.config) {
            gameState.gameID = authData.config.gameID;  // Add gameID extraction
            gameState.minBet = authData.config.minBet;
            gameState.maxBet = authData.config.maxBet;
            gameState.stepBet = authData.config.stepBet;
            gameState.defaultBetLevel = authData.config.defaultBetLevel;
            gameState.betLevels = authData.config.betLevels;
            gameState.jurisdiction = authData.config.jurisdiction;
            
            // Set current bet to the default bet level from config
            if (authData.config.defaultBetLevel) {
                gameState.currentBet = authData.config.defaultBetLevel;
            } else if (authData.config.minBet) {
                // Fallback to minimum bet if no default is provided
                gameState.currentBet = authData.config.minBet;
            }
            // If neither defaultBetLevel nor minBet is available, keep the initial value
            
            // Also update the bonus bet amount to match (convert from micro-units to display format)
            gameState.bonusBetAmount = gameState.currentBet / 1000000;
        }

        // Check if there's an active round and handle accordingly
        if (gameState.round) {
            // Check if the round is actually active
            if (gameState.round.active) {
                // Resume the active round instead of ending it
                const resumeResult = await resumeActiveRound(gameState.round);
                if (!resumeResult.success) {
                    // If resume fails, try to end the round to clean up
                    await endCurrentRound().then(result => {
                        if (!result.success) {
                        }
                    });
                }
            } else {
                await endCurrentRound().then(result => {
                    if (!result.success) {
                    }
                });
            }
        }

        // Update the UI with the new balance and bet amount
        updateBalanceDisplay();
        updateBetInput();

        return authData;

    } catch (error) {
        throw error; // Re-throw to prevent game from continuing without auth
    }
}

// Background image
let backgroundImg;
let backgroundX = 0;

// Eagle animation
let eagleImg;
let eagle = {
    x: -200, // Start off-screen
    y: 0, // Will be randomized
    width: 0, // Will be calculated based on random size
    height: 0, // Will be calculated based on random size
    speed: 0, // Random speed
    direction: 1, // 1 = right, -1 = left
    size: 0, // Random size factor (0.5 to 1.5)
    flipped: false // Whether image is flipped horizontally
};

// Floating chair animation
let chairImg;
let chair = {
    x: -200, // Start off-screen
    y: 0, // Will be randomized
    width: 0, // Will be calculated based on random size
    height: 0, // Will be calculated based on random size
    speed: 0, // Random speed
    direction: 1, // 1 = right, -1 = left
    size: 0, // Random size factor (0.5 to 1.5)
    flipped: false, // Whether image is flipped horizontally
    floatOffset: 0, // Current position in the floating animation cycle
    floatSpeed: 0, // Speed of floating animation
    floatAmplitude: 0 // Height of floating animation
};

// Cart character sprite (previously Biden)
let bidenImg;
let bidenSprite = {
    x: 0,
    y: 0,
    width: 64,  // Will be updated based on actual sprite dimensions
    height: 64, // Will be updated based on actual sprite dimensions
    frameWidth: 0,
    frameHeight: 0,
    currentFrame: 0,
    totalFrames: 2, // Cart now has two frames for animation
    frameTimer: 0,
    fallTimer: 0, // Timer for fall animation
    lockFrame: false, // Whether to lock animation on current frame (during flips/falls)
    animationSpeed: 12, // Frames to wait before changing sprite frame (start slower)
    state: 'offscreen', // 'offscreen', 'entering', 'positioned', 'falling', 'fallen', 'leaving'
    targetX: 0, // Will be set to the center position
    speed: 0,
    maxSpeed: 4, // Maximum movement speed (matching Biden game)
    acceleration: 0.15, // Increased acceleration (was 0.05) to make cart appear faster
    backgroundAcceleration: 0.05, // How quickly background speeds up after cart is positioned
    currentScrollSpeed: 0, // Tracks current scroll speed for smooth acceleration
    // Cart now has two frames (0 and 1)
    normalFrameStart: 0,
    normalFrameEnd: 1,
    suspenseFrameStart: 0,
    suspenseFrameEnd: 1
};

// Parallax scroll offsets
let scrollX = 0;
let scrollSpeed = 0; // Start with 0 speed

// Biden speech bubble phrases (now handled by translations.js)
// This will be dynamically populated based on the current language
let bidenPhrases = [];

let speechBubble = {
    active: false,
    text: "",
    x: 0,
    y: 0,
    offsetX: 30, // Position relative to Biden
    offsetY: -80
};

// Proper layout system (matching the sophisticated approach)
const CANVAS_RATIO_TYPE_BREAK_POINTS = {
    wideSquare: 1.3, // Min ratio of long width canvas
    narrowSquare: 0.8, // Portrait threshold
};

const CANVAS_SIZE_TYPE_BREAK_POINTS = {
    smallMobile: 375, // Max size of small mobile layouts e.g. iPhone SE
    mobile: 480, // Max size of common mobile layouts e.g. iPhone XR
    tablet: 820, // Max size of tablets layouts, e.g. iPad Air
    largeTablet: 1024, // Max size of large tablets layouts, e.g. iPad Pro
};

const STANDARD_MAIN_SIZES_MAP = {
    desktop: { width: 1920, height: 1080 },
    tablet: { width: 1920, height: 1920 },
    landscape: { width: 1920, height: 1080 },
    portrait: { width: 1080, height: 1920 },
};

// Game layout state
let layoutInfo = {
    canvasSizes: { width: 800, height: 600 },
    canvasRatio: 1.33,
    canvasRatioType: 'longWidth',
    canvasSizeType: 'desktop',
    layoutType: 'desktop',
    isStacked: false,
    mainLayout: null,
    scale: 1
};

let gameWidth = 800;
let gameHeight = 600;

function preload() {
    // Initialize mobile audio optimization first
    initializeMobileAudio();
    
    // Load single background image with higher priority for smoother transitions
    backgroundImg = loadImage('assets/background.png');
    
    // Load cart sprite instead of Biden
    bidenImg = loadImage('assets/cart.png');
    
    // Load eagle sprite
    eagleImg = loadImage('assets/eagle.png');
    
    // Load floating chair sprite
    chairImg = loadImage('assets/chair.png');
}

// Helper functions for layout calculation
function getRatio(sizes) {
    return sizes.width / (sizes.height || 1);
}

function getCanvasSizes() {
    return { width: window.innerWidth, height: window.innerHeight };
}

function getCanvasRatio() {
    return getRatio(getCanvasSizes());
}

function getCanvasRatioType() {
    const ratio = getCanvasRatio();
    if (ratio >= CANVAS_RATIO_TYPE_BREAK_POINTS.wideSquare) return 'longWidth';
    if (ratio <= CANVAS_RATIO_TYPE_BREAK_POINTS.narrowSquare) return 'longHeight';
    return 'almostSquare';
}

function getCanvasSizeType() {
    const canvasSizes = getCanvasSizes();
    const deviceWidth = Math.min(canvasSizes.width, canvasSizes.height);
    if (deviceWidth <= CANVAS_SIZE_TYPE_BREAK_POINTS.smallMobile) return 'smallMobile';
    if (deviceWidth <= CANVAS_SIZE_TYPE_BREAK_POINTS.mobile) return 'mobile';
    if (deviceWidth <= CANVAS_SIZE_TYPE_BREAK_POINTS.tablet) return 'tablet';
    if (deviceWidth <= CANVAS_SIZE_TYPE_BREAK_POINTS.largeTablet) return 'largeTablet';
    return 'desktop';
}

function getLayoutType() {
    const ratioType = getCanvasRatioType();
    const sizeType = getCanvasSizeType();
    
    if (ratioType === 'almostSquare') return 'tablet';
    if (ratioType === 'longHeight') return 'portrait';
    if (sizeType === 'mobile' || sizeType === 'smallMobile') return 'landscape';
    return 'desktop';
}

function getIsStacked() {
    const layoutType = getLayoutType();
    return ['portrait', 'tablet'].includes(layoutType);
}

function createMainLayout() {
    const canvasSizes = getCanvasSizes();
    const layoutType = getLayoutType();
    const mainSizes = STANDARD_MAIN_SIZES_MAP[layoutType];
    
    const x = canvasSizes.width * 0.5;
    const y = canvasSizes.height * 0.5;
    const widthScale = canvasSizes.width / mainSizes.width;
    const heightScale = canvasSizes.height / mainSizes.height;
    const scale = Math.min(widthScale, heightScale);
    
    return {
        x,
        y,
        scale,
        width: mainSizes.width,
        height: mainSizes.height,
        anchor: 0.5,
    };
}

// Main layout detection and sizing function
function detectScreenSize() {
    // Update layout info
    layoutInfo.canvasSizes = getCanvasSizes();
    layoutInfo.canvasRatio = getCanvasRatio();
    layoutInfo.canvasRatioType = getCanvasRatioType();
    layoutInfo.canvasSizeType = getCanvasSizeType();
    layoutInfo.layoutType = getLayoutType();
    layoutInfo.isStacked = getIsStacked();
    layoutInfo.mainLayout = createMainLayout();
    layoutInfo.scale = layoutInfo.mainLayout.scale;
    
    // Calculate actual game dimensions (include toolbar in total height)
    gameWidth = Math.floor(layoutInfo.mainLayout.width * layoutInfo.scale);
    gameHeight = Math.floor(layoutInfo.mainLayout.height * layoutInfo.scale);
    
    // Calculate canvas dimensions (85% of game height)
    const canvasHeight = Math.floor(gameHeight * 0.85);
    
    // Ensure minimum playable size
    gameWidth = Math.max(gameWidth, 320);
    gameHeight = Math.max(gameHeight, 240);
    
    // Make dimensions available to HTML
    window.gameWidth = gameWidth;
    window.gameHeight = gameHeight;
    window.canvasHeight = canvasHeight;
}

function setup() {
    // Detect screen size first
    detectScreenSize();
    
    // Set up a safety checker interval that will ensure losses always display as $0.00
    // This runs every 100ms to catch any race conditions that might change the display
    if (lossDisplayCheckerInterval) {
        clearInterval(lossDisplayCheckerInterval);
    }
    
    lossDisplayCheckerInterval = setInterval(() => {
        if (gameState && gameState.lossConfirmed) {
            const payoutElement = document.getElementById('payout-value');
            if (payoutElement) {
                const currency = getCurrentCurrency();
                const currentText = payoutElement.textContent;
                const correctZeroText = formatCurrency(0, currency);
                // Only update if not showing the correct zero value
                if (currentText !== correctZeroText) {
                    payoutElement.textContent = correctZeroText;
                }
            }
        }
    }, 100);
    
    // Only create canvas when game starts
    if (gameStarted) {
        // Set the game container dimensions using CSS variables
        const gameContainer = document.querySelector('.game-container');
        gameContainer.style.setProperty('--game-width', `100vw`);
        gameContainer.style.setProperty('--game-height', `${gameHeight}px`);
        
        // Create the canvas with 100% viewport width, but 85% of game height
        let canvas = createCanvas(windowWidth, window.canvasHeight);
        canvas.parent('sketch-holder');
        
        // Reset background position
        backgroundX = 0;
        
        // Set pixel density to 1 to prevent scaling issues that can cause artifacts
        pixelDensity(1);
        
        // Use image interpolation for smoother rendering between tiles
        smooth();
        
        // Initialize Biden character
        initializeBidenCharacter();
        
        // Initialize eagle
        resetEagle();
        
        // Initialize floating chair
        resetChair();
        
        // Start with no scrolling
        scrollSpeed = 0;
    }
}

function initializeBidenCharacter() {
    if (bidenImg) {
        // Cart is now a sprite sheet with 2 frames side by side
        bidenSprite.frameWidth = bidenImg.width / bidenSprite.totalFrames;
        bidenSprite.frameHeight = bidenImg.height;
        
        // Calculate the aspect ratio of the cart image
        const originalAspectRatio = bidenSprite.frameWidth / bidenSprite.frameHeight;
        
        let targetWidth;
        if (windowWidth <= 600) {
            // Small screens (≤600px) - make cart more prominent
            targetWidth = .3*window.canvasHeight;
        } else if (windowWidth <= 799) {
            // Medium screens (601px-799px)
            targetWidth = .3*window.canvasHeight;
        } else {
            // Large screens (≥800px)
            targetWidth = .35*window.canvasHeight;
        }
        
        // Calculate height based on original aspect ratio to prevent distortion
        // Round dimensions to prevent sub-pixel rendering artifacts
        bidenSprite.width = Math.round(targetWidth);
        bidenSprite.height = Math.round(targetWidth / originalAspectRatio);
        
        // Position cart initially offscreen to the left (matching Biden game)
        bidenSprite.targetX = Math.round(windowWidth / 2); // Center position (target)
        bidenSprite.x = -bidenSprite.width; // Start fully offscreen like in Biden game
        
        // Fixed positioning: place cart closer to the bottom of the screen
        // Increased the multiplier to move the cart lower (0.9 -> 0.95)
        bidenSprite.y = Math.round(height * 0.95);
        bidenSprite.state = 'offscreen'; // Initial state
        bidenSprite.speed = 0; // Start with no speed (matching Biden game)
        bidenSprite.lockFrame = false; // Initialize with frames unlocked for normal animation
        
        // Make sure play button state matches cart's state
        updatePlayButtonState();
        updateBetButtonState();
    }
}

// This function is no longer needed since we're using a single background image

function draw() {
    if (!gameStarted) return;
    
    // Clear background
    background(0);
    
    // Persistent loss check - make sure loss display is always correct
    if (gameState.lossConfirmed) {
        const payoutElement = document.getElementById('payout-value');
        if (payoutElement) {
            const currency = getCurrentCurrency();
            const currentText = payoutElement.textContent;
            const correctZeroText = formatCurrency(0, currency);
            // Only update if not showing the correct zero value
            if (currentText !== correctZeroText) {
                payoutElement.textContent = correctZeroText;
            }
        }
    }
    
    // Update multiplier animation
    animateMultiplier();
    
    // Update background position
    updateBackgroundPosition();
    
    // Draw background
    drawBackground();
    
    // Update and draw eagle
    updateEagle();
    drawEagle();
    
    // Update and draw floating chair
    updateChair();
    drawChair();
    
    // Update and draw Biden character
    updateBidenAnimation();
    drawBidenCharacter();
    
    // Update speech bubble if active
    if (speechBubble.active) {
        updateSpeechBubble();
    }
    
    // Draw UI overlay
    drawUI();
}

function updateBackgroundPosition() {
    // Move background by the scroll speed
    backgroundX -= scrollSpeed;
    
    // Reset position when background has scrolled completely off screen
    if (backgroundImg) {
        let imgScale = height / backgroundImg.height;
        let scaledWidth = backgroundImg.width * imgScale;
        
        // Reset when the background has moved one full width
        if (backgroundX <= -scaledWidth) {
            // Reset to exactly 0 to avoid accumulated floating point errors
            // that might cause slight offsets between tiles over time
            backgroundX += scaledWidth;
            
            // Ensure we're dealing with a clean number (no floating point artifacts)
            backgroundX = Math.round(backgroundX * 100) / 100;
        }
    }
}

function updateBidenAnimation() {
    // Apply game speed factor to movement
    const baseSpeed = gameState.gameSpeed || 1;
    const effectiveSpeed = getEffectiveGameSpeed(); // Includes turbo multiplier
    
    // Only animate frames if we're not in a state where frame should be locked
    if (!bidenSprite.lockFrame) {
        // Cart now has two frames to animate
        // Animation speed increases with game speed and scroll speed
        const animationSpeedFactor = Math.max(1, (scrollSpeed / INITIAL_SCROLL_SPEED) * 2 + 1);
        bidenSprite.frameTimer += effectiveSpeed * animationSpeedFactor;
        
        // Reset timer occasionally to prevent it from getting too large
        if (bidenSprite.frameTimer >= 60) {
            bidenSprite.frameTimer = 0;
        }
        
        // Update animation frame based on timer
        const frameDelay = Math.max(1, Math.floor(8 / animationSpeedFactor)); // Animation gets faster with speed, minimum 1 frame delay
        if (bidenSprite.frameTimer % frameDelay === 0) {
            bidenSprite.currentFrame = (bidenSprite.currentFrame + 1) % bidenSprite.totalFrames;
        }
    }
    
    // Handle different states
    switch(bidenSprite.state) {
        case 'entering':
            // Gradually increase speed, apply effective game speed factor (includes turbo)
            bidenSprite.speed = Math.min(bidenSprite.speed + (bidenSprite.acceleration * effectiveSpeed), bidenSprite.maxSpeed);
            
            // Move Biden toward the target position (apply effective speed to movement)
            bidenSprite.x += bidenSprite.speed * effectiveSpeed;
            
            // Update scroll speed to match Biden's speed
            scrollSpeed = (bidenSprite.speed / bidenSprite.maxSpeed) * INITIAL_SCROLL_SPEED * effectiveSpeed;
            
            // Check if Biden has reached the target position
            if (bidenSprite.x >= bidenSprite.targetX) {
                bidenSprite.x = bidenSprite.targetX;
                bidenSprite.state = 'positioned';
                
                // Preserve the scroll speed that was achieved during entering
                // This keeps the animation consistent with the speed built up during entry
                // scrollSpeed is already set correctly from the line above, so don't change it
                
                // Don't re-enable the play button here - keep it disabled until the round is complete
                // The play button will be re-enabled in animateMultiplier() when the round finishes
            }
            break;
            
        case 'positioned':
            // During suspense period, maintain the current speed; otherwise continuously accelerate
            if (gameState.suspensePeriodStarted && !gameState.suspensePeriodComplete) {
                // Keep the suspense speed set in animateMultiplier function
                // Don't override the scrollSpeed here
            } else {
                // Continuously accelerate the background scroll speed with no maximum limit
                // Apply turbo multiplier to acceleration for visibly faster speed increase when turbo is active
                const turboAccelerationMultiplier = gameState.turboMode ? 2.5 : 1.0;
                const currentAcceleration = SCROLL_ACCELERATION * turboAccelerationMultiplier;
                scrollSpeed += currentAcceleration;
            }
            
            // This check is no longer needed since we're setting the state directly in animateMultiplier()
            // Visual reversal is handled there now
            break;
            
        case 'falling':
            // Biden falls animation with more dramatic timing
            scrollSpeed = 0;
            
            // Don't set lossConfirmed flag until the fall animation is halfway through
            // This keeps the payout visible until the cart is actually flipping
            
            // Lock the animation frame during falling
            bidenSprite.lockFrame = true;
            
            // Initialize fall timer if needed
            if (!bidenSprite.fallTimer) {
                bidenSprite.fallTimer = 0;
                bidenSprite.currentFrame = 0; // Ensure we're on first frame
                
                // Play ouch sound effect
                playOuchSound();
            }
            
            bidenSprite.fallTimer++;
            
            // Mark as a confirmed loss when the cart is halfway through its fall animation
            // This ensures the payout remains visible until the cart is clearly flipping
            if (bidenSprite.fallTimer === 40 && !gameState.isWinningGame) {
                gameState.lossConfirmed = true;
                
                // Set multiplier to 0 for losses to prevent it from showing the target multiplier
                gameState.currentMultiplier = 0;
                
                // Update payout value to zero at this point in the fall animation
                const payoutElement = document.getElementById('payout-value');
                if (payoutElement) {
                    const currency = getCurrentCurrency();
                    const zeroCurrency = formatCurrency(0, currency);
                    payoutElement.textContent = zeroCurrency;
                }
            }
            
            // Show impact effect near the end of the animation
            if (bidenSprite.fallTimer === 50) {
                // Create a screen shake effect
                const gameCanvas = document.getElementById('defaultCanvas0');
                if (gameCanvas) {
                    gameCanvas.classList.add('screen-shake');
                    setTimeout(() => gameCanvas.classList.remove('screen-shake'), 500);
                }
                
                // Trigger UI feedback for winning
                const multiplierContainer = document.getElementById('multiplier-container');
                if (multiplierContainer) {
                    // Highlight the multiplier with a pulse effect
                    multiplierContainer.classList.add('pulse-highlight');
                    setTimeout(() => multiplierContainer.classList.remove('pulse-highlight'), 2000);
                }
            }
            
            // After 1.5 seconds (90 frames at 60fps), transition to fallen state
            if (bidenSprite.fallTimer > 90) {
                bidenSprite.state = 'fallen';
                bidenSprite.fallTimer = 0;
                
                // VISUAL REVERSAL: When Biden has fallen, it's now a loss
                // We need to check isWinningGame instead of lastWinAmount
                if (!gameState.isWinningGame) {
                    gameState.lossConfirmed = true; // Mark the loss as confirmed
                    
                    // Set multiplier to 0 for losses to prevent it from showing the target multiplier
                    gameState.currentMultiplier = 0;
                    
                    updateGameMessage(t('youLost'), false, true);
                    
                    // Update payout value to zero immediately when the cart falls
                    const payoutElement = document.getElementById('payout-value');
                    if (payoutElement) {
                        gameState.lossConfirmed = true; // Ensure loss is confirmed
                        const currency = getCurrentCurrency();
                        const zeroCurrency = formatCurrency(0, currency);
                        payoutElement.textContent = zeroCurrency;
                        
                        // Also update the container to show red for loss
                        const multiplierContainer = document.getElementById('multiplier-container');
                        if (multiplierContainer) {
                            multiplierContainer.classList.remove('winning-multiplier');
                            multiplierContainer.classList.add('losing-multiplier');
                        }
                    }
                }
                
                // Play button was already re-enabled when outcome was revealed
                // No need to re-enable it again here
            }
            break;
            
        case 'fallen':
            // Biden has fallen and stays on screen
            scrollSpeed = 0;
            
            // After a delay, reset the game and move Biden off-screen
            if (!bidenSprite.resetTimer) {
                bidenSprite.resetTimer = 0;
            }
            
            bidenSprite.resetTimer++;
            
            // After 1 second (60 frames at 60fps), reset the game
            if (bidenSprite.resetTimer > 60) {
                bidenSprite.state = 'offscreen';
                bidenSprite.x = -bidenSprite.width; // Reset position offscreen (matching Biden game)
                bidenSprite.resetTimer = 0;
                bidenSprite.currentFrame = bidenSprite.normalFrameStart; // Reset to normal frame range
                bidenSprite.lockFrame = false; // Unlock frames for next game
                scrollSpeed = 0;
                
                // Reset the game state
                resetMultiplierState();
                
                // Re-enable the play button
                const playButton = document.getElementById('play-button');
                if (playButton) {
                    updatePlayButtonState(); // Use centralized function instead of direct enable
                    updateBetButtonState();
                }
            }
            break;
            
        case 'leaving':
            // Accelerate Biden as he leaves the screen, apply game speed factor
            // Start with normal speed and gradually accelerate
            if (!bidenSprite.leaveAcceleration) {
                bidenSprite.leaveAcceleration = 1.0; // Initial acceleration factor
                bidenSprite.maxLeaveAcceleration = 3.0; // Maximum acceleration
                bidenSprite.leaveAccelerationRate = 0.05; // How quickly to accelerate
            }
            
            // Increase acceleration until reaching max
            bidenSprite.leaveAcceleration = Math.min(
                bidenSprite.leaveAcceleration + bidenSprite.leaveAccelerationRate,
                bidenSprite.maxLeaveAcceleration
            );
            
            // Apply the acceleration to Biden's movement but keep background speed constant
            bidenSprite.x += bidenSprite.speed * effectiveSpeed * bidenSprite.leaveAcceleration;
            
            // Show speech bubble if it's not already active
            // NOTE: We're removing the condition on gameState.doesFall to make speech bubble appear more often
            if (!speechBubble.active) {
                // Play bell sound
                playBellSound();
                showRandomSpeechBubble();
            }
            
            // Update speech bubble position
            if (speechBubble.active) {
                updateSpeechBubble();
            }
            
            // Check if Biden has left the screen
            if (bidenSprite.x > width + bidenSprite.width) {
                bidenSprite.state = 'offscreen';
                // Position cart offscreen to the left (matching Biden game)
                bidenSprite.x = -bidenSprite.width; // Reset position offscreen (matching Biden game)
                bidenSprite.leaveAcceleration = null; // Reset acceleration for next time
                bidenSprite.currentFrame = bidenSprite.normalFrameStart; // Reset to normal frame range
                bidenSprite.lockFrame = false; // Ensure frames are unlocked for next game
                scrollSpeed = 0;
                
                // VISUAL REVERSAL: When Biden leaves, show win message (now happens when doesFall is true)
                if (gameState.isWinningGame) {
                    const currency = getCurrentCurrency();
                    const formattedWinAmount = formatCurrency(lastWinAmount, currency);
                    updateGameMessage(t('youWon', { amount: formattedWinAmount }), true, false);
                }
                
                // Keep speech bubble visible until next bet (don't hide here)
                // Speech bubble will be hidden when placeBet is called
                
                // Reset multiplier when Biden leaves
                resetMultiplierState();
                
                // Enable the play button since animation is complete
                const playButton = document.getElementById('play-button');
                if (playButton) {
                    updatePlayButtonState(); // Use centralized function instead of direct enable
                    updateBetButtonState();
                }
            }
            break;
            
        case 'offscreen':
            // No movement until animation starts
            scrollSpeed = 0;
            break;
    }
}

function drawBidenCharacter() {
    if (bidenImg && bidenSprite.frameWidth > 0) {
        // Cart is now a sprite sheet with 2 frames side by side
        let srcX = bidenSprite.currentFrame * bidenSprite.frameWidth;
        let srcY = 0;
        let srcW = bidenSprite.frameWidth;
        let srcH = bidenSprite.frameHeight;
        
        // Draw the current frame centered at Biden's position
        let drawX = bidenSprite.x - bidenSprite.width / 2;
        let drawY = bidenSprite.y - bidenSprite.height;
        
        // Special handling for falling/fallen state
        if (bidenSprite.state === 'falling') {
            // Create a fall animation with rotation and vertical movement
            push(); // Save the current drawing state
            
            // Calculate falling progress (0-1) - faster fall timing
            let fallProgress = Math.min(1, bidenSprite.fallTimer / 80);
            
            // Calculate rotation angle - single forward rotation (one full turn)
            let rotationAngle = fallProgress * 8;
            
            // Calculate vertical movement with initial upward momentum
            // Create a parabolic trajectory: starts going up, then falls down
            let upwardMomentum = -350; // Initial upward velocity (negative is up)
            let gravity = 1600; // Gravity acceleration downward
            let fallDrop = upwardMomentum * fallProgress + 0.5 * gravity * fallProgress * fallProgress;
            
            // Calculate horizontal forward movement during fall - more forward momentum
            let forwardMovement = fallProgress * width*.6; // Move 400 pixels rightward during fall
            
            // Calculate Biden's visual center point for proper rotation
            let centerX = bidenSprite.x + forwardMovement;
            let centerY = bidenSprite.y - bidenSprite.height / 2;
            
            // Set the origin to Biden's visual center (including forward movement)
            translate(centerX, centerY + fallDrop);
            
            // Rotate clockwise around the center point
            rotate(rotationAngle);
            
            // Draw Biden centered on the rotation point with corrected aspect ratio
            const sourceAspectRatio = srcW / srcH;
            const targetWidth = bidenSprite.width;
            const targetHeight = targetWidth / sourceAspectRatio;
            
            // Round coordinates to prevent sub-pixel artifacts
            const roundedTargetWidth = Math.round(targetWidth);
            const roundedTargetHeight = Math.round(targetHeight);
            const roundedSrcX = Math.round(srcX);
            const roundedSrcY = Math.round(srcY);
            const roundedSrcW = Math.round(srcW);
            const roundedSrcH = Math.round(srcH);
            
            // Use copy() to select only the first frame during falling
            copy(
                bidenImg,
                0, 0, roundedSrcW, roundedSrcH, // always use first frame (index 0)
                -roundedTargetWidth / 2, -roundedTargetHeight / 2, // centered around rotation point
                roundedTargetWidth, roundedTargetHeight  // destination size with corrected aspect ratio
            );
            
            // Add impact effect when fall is almost complete
            if (fallProgress > 0.8 && fallProgress < 0.9) {
                // Draw impact lines or dust cloud using corrected dimensions
                fill(255, 255, 255, 100);
                for (let i = 0; i < 5; i++) {
                    let lineAngle = random(PI, TWO_PI);
                    let lineLength = random(10, 30);
                    let startX = random(-targetWidth/3, targetWidth/3);
                    let startY = random(-10, 10);
                    line(startX, startY, 
                         startX + cos(lineAngle) * lineLength, 
                         startY + sin(lineAngle) * lineLength);
                }
            }
            
            pop(); // Restore the drawing state
            
            // Skip the normal drawing since we've handled it in the rotated context
            return;
            
        } else if (bidenSprite.state === 'fallen') {
            // Cart has fallen off screen - don't draw it at all
            // This prevents the visual glitch where cart appears to teleport back to center
            return;
        }
        
        // Normal drawing for other states
        // IMPORTANT: Ensure destination maintains same aspect ratio as source to prevent distortion
        const sourceAspectRatio = srcW / srcH;
        const targetWidth = bidenSprite.width;
        const targetHeight = targetWidth / sourceAspectRatio; // Ensure same aspect ratio
        
        // Recalculate drawY to account for the potentially different height
        drawY = bidenSprite.y - targetHeight;
        
        // Round all coordinates to prevent sub-pixel rendering artifacts
        const roundedDrawX = Math.round(drawX);
        const roundedDrawY = Math.round(drawY);
        const roundedTargetWidth = Math.round(targetWidth);
        const roundedTargetHeight = Math.round(targetHeight);
        const roundedSrcX = Math.round(srcX);
        const roundedSrcY = Math.round(srcY);
        const roundedSrcW = Math.round(srcW);
        const roundedSrcH = Math.round(srcH);
        
        // Ensure we don't draw outside canvas bounds
        if (roundedDrawX + roundedTargetWidth > 0 && roundedDrawX < width && 
            roundedDrawY + roundedTargetHeight > 0 && roundedDrawY < height) {
            
            // Use copy() for the sprite sheet animation
            copy(
                bidenImg, 
                roundedSrcX, roundedSrcY, roundedSrcW, roundedSrcH,  // source rectangle
                roundedDrawX, roundedDrawY, roundedTargetWidth, roundedTargetHeight  // destination rectangle
            );
        }
    }
}

function drawBackground() {
    if (backgroundImg) {
        // Scale image to fit canvas height while maintaining aspect ratio
        let imgScale = height / backgroundImg.height;
        let scaledWidth = backgroundImg.width * imgScale;
        
        // Add a small overlap between tiles (1 pixel) to prevent any gaps
        const overlap = 1;
        
        // Draw three copies of the background side by side with slight overlap for seamless scrolling
        // Using Math.round instead of floor for more precise positioning
        image(backgroundImg, Math.round(backgroundX), 0, scaledWidth + overlap, height);
        image(backgroundImg, Math.round(backgroundX + scaledWidth) - overlap, 0, scaledWidth + overlap, height);
        // Add a third copy to ensure there's always a background ready when scrolling fast
        image(backgroundImg, Math.round(backgroundX + (scaledWidth * 2) - overlap * 2), 0, scaledWidth + overlap, height);
    }
}

// Reset eagle with new random position and size
function resetEagle() {
    if (eagleImg) {
        // Randomize size (depth effect) between 50% and 150% of original
        eagle.size = random(0.5, 1.5);
        
        // Calculate dimensions based on the size factor
        eagle.width = Math.round(eagleImg.width * eagle.size);
        eagle.height = Math.round(eagleImg.height * eagle.size);
        
        // Randomize speed based on size (smaller eagles move slower giving depth perception)
        eagle.speed = map(eagle.size, 0.5, 1.5, 2, 5);
        
        // Randomize Y position within the top 30% of the screen
        eagle.y = random(height * 0.05, height * 0.3);
        
        // Set position based on direction
        if (eagle.direction === 1) {
            // Moving right, start from left side
            eagle.x = -eagle.width;
            eagle.flipped = false;
        } else {
            // Moving left, start from right side
            eagle.x = width + eagle.width;
            eagle.flipped = true;
        }
    }
}

// Update eagle position and check boundaries
function updateEagle() {
    if (eagleImg) {
        // Move eagle based on its speed and direction
        eagle.x += eagle.speed * eagle.direction;
        
        // Check if eagle has gone off-screen
        if ((eagle.direction === 1 && eagle.x > width + eagle.width) || 
            (eagle.direction === -1 && eagle.x < -eagle.width)) {
            // Reverse direction for next time
            eagle.direction *= -1;
            // Reset with new random properties
            resetEagle();
        }
    }
}

// Draw the eagle
function drawEagle() {
    if (eagleImg) {
        push(); // Save current drawing state
        
        if (eagle.flipped) {
            // Draw flipped eagle when flying left
            scale(-1, 1); // Flip horizontally
            image(eagleImg, -eagle.x - eagle.width, eagle.y, eagle.width, eagle.height);
        } else {
            // Draw normal eagle when flying right
            image(eagleImg, eagle.x, eagle.y, eagle.width, eagle.height);
        }
        
        pop(); // Restore drawing state
    }
}

// Reset chair with new random position and size
function resetChair() {
    if (chairImg) {
        // Randomize size (depth effect) between 50% and 150% of original
        chair.size = random(0.5, 1.5);
        
        // Calculate dimensions based on the size factor
        chair.width = Math.round(chairImg.width * chair.size);
        chair.height = Math.round(chairImg.height * chair.size);
        
        // Randomize speed based on size but keep it much slower overall
        chair.speed = map(chair.size, 0.5, 1.5, 0.5, 1.5);
        
        // Randomize Y position within the top 20% of the screen
        chair.y = random(height * 0.05, height * 0.2);
        
        // Set floating animation parameters - slower, gentler floating
        chair.floatSpeed = random(0.01, 0.03);
        chair.floatAmplitude = random(5, 15);
        chair.floatOffset = random(0, TWO_PI);
        
        // Set position based on direction
        if (chair.direction === 1) {
            // Moving right, start from left side
            chair.x = -chair.width;
            chair.flipped = false;
        } else {
            // Moving left, start from right side
            chair.x = width + chair.width;
            chair.flipped = true;
        }
    }
}

// Update chair position and check boundaries
function updateChair() {
    if (chairImg) {
        // Move chair based on its speed and direction
        chair.x += chair.speed * chair.direction;
        
        // Apply floating animation
        chair.floatOffset += chair.floatSpeed;
        let floatY = sin(chair.floatOffset) * chair.floatAmplitude;
        chair.y += floatY * 0.02; // Even smaller incremental changes for smoother floating
        
        // Keep chair within reasonable vertical bounds in the top 20% of the screen
        chair.y = constrain(chair.y, height * 0.05, height * 0.2);
        
        // Check if chair has gone off-screen
        if ((chair.direction === 1 && chair.x > width + chair.width) || 
            (chair.direction === -1 && chair.x < -chair.width)) {
            // Reverse direction for next time
            chair.direction *= -1;
            // Reset with new random properties
            resetChair();
        }
    }
}

// Draw the chair
function drawChair() {
    if (chairImg) {
        push(); // Save current drawing state
        
        if (chair.flipped) {
            // Draw flipped chair when moving left
            scale(-1, 1); // Flip horizontally
            image(chairImg, -chair.x - chair.width, chair.y, chair.width, chair.height);
        } else {
            // Draw normal chair when moving right
            image(chairImg, chair.x, chair.y, chair.width, chair.height);
        }
        
        pop(); // Restore drawing state
    }
}

function drawUI() {
    // No UI overlay - clean parallax background
}

// Add mouse interaction to control scroll speed
function mousePressed() {
    // Removed scroll speed boost on click
    // Background now scrolls at constant speed regardless of clicks
}

function startGame() {
    // Initialize mobile audio first
    if (!audioUnlocked) {
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume();
        }
        audioUnlocked = true;
    }
    
    // Preload all audio files for better mobile performance
    preloadAllAudio();
    
    // Fade out intro overlay
    const introOverlay = document.getElementById('intro-overlay');
    introOverlay.style.opacity = '0';
    
    // Prepare game screen but keep it invisible
    const gameScreen = document.getElementById('game-screen');
    gameScreen.style.display = 'flex';
    gameScreen.style.opacity = '0';
    
    // Initialize payout display to show $0.00
    const payoutElement = document.getElementById('payout-value');
    if (payoutElement) {
        const currency = getCurrentCurrency();
        const zeroAmount = formatCurrency(0, currency);
        payoutElement.textContent = zeroAmount;
    }
    
    // Start background music
    playGameMusic();
    
    // After intro fades out, remove it and fade in game
    setTimeout(() => {
        introOverlay.style.display = 'none';
        
        // Mark game as started and fade it in
        gameStarted = true;
        gameScreen.style.opacity = '1';
        
        // Initialize the game
        setup(); // Initialize the canvas
        
        // Initialize speech bubble
        hideSpeechBubble();
        
        // Check if we have a pending active round to resume
        if (gameState.pendingActiveRound) {
            const pendingRound = gameState.pendingActiveRound;
            gameState.pendingActiveRound = null; // Clear the pending state
            
            // Wait a moment for game to fully initialize, then resume the active round
            setTimeout(async () => {
                const resumeResult = await performActiveRoundResumption(pendingRound);
                if (!resumeResult.success) {
                    // If resume fails, update button states to allow new bet
                    updatePlayButtonState();
                    updateBetButtonState();
                }
            }, 100);
        } else {
            // Normal game start - update play button state based on game and Biden state
            updatePlayButtonState();
            updateBetButtonState();
        }
        
    }, 550); // Match the CSS transition time plus a little extra for smoothness
}

function windowResized() {
    if (gameStarted) {
        // Store comprehensive game state before resize
        const gameStateSnapshot = {
            bidenState: bidenSprite.state,
            bidenPosition: { x: bidenSprite.x, y: bidenSprite.y },
            bidenSpeed: bidenSprite.speed,
            bidenFrame: bidenSprite.currentFrame,
            bidenFrameTimer: bidenSprite.frameTimer,
            bidenFallTimer: bidenSprite.fallTimer,
            bidenResetTimer: bidenSprite.resetTimer,
            bidenLeaveAcceleration: bidenSprite.leaveAcceleration,
            eaglePosition: { x: eagle.x, y: eagle.y },
            eagleDirection: eagle.direction,
            eagleSize: eagle.size,
            scrollSpeed: scrollSpeed,
            backgroundPosition: backgroundX,
            multiplierState: {
                current: gameState.currentMultiplier,
                target: gameState.targetMultiplier,
                animationStarted: gameState.multiplierAnimationStarted,
                animationComplete: gameState.multiplierAnimationComplete,
                animationStartTime: gameState.multiplierAnimationStartTime,
                suspensePeriodStarted: gameState.suspensePeriodStarted,
                suspensePeriodComplete: gameState.suspensePeriodComplete,
                lastSpeedFactor: gameState.lastSpeedFactor,
                suspenseSpeedFactor: gameState.suspenseSpeedFactor
            },
            gameFlags: {
                doesFall: gameState.doesFall,
                fallTriggered: gameState.fallTriggered,
                isWinningGame: gameState.isWinningGame,
                playRequestInProgress: gameState.playRequestInProgress
            }
        };
        
        // Detect new screen dimensions
        detectScreenSize();
        
        // Update the game container dimensions
        const gameContainer = document.querySelector('.game-container');
        gameContainer.style.setProperty('--game-width', `100vw`);
        gameContainer.style.setProperty('--game-height', `${gameHeight}px`);
        
        // Resize canvas to match the full viewport width
        resizeCanvas(windowWidth, window.canvasHeight);
        
        // Restore background position
        backgroundX = gameStateSnapshot.backgroundPosition;
        
        // Reinitialize Biden character for new dimensions
        const oldTargetX = bidenSprite.targetX;
        initializeBidenCharacter();
        
        // Restore eagle position and properties
        if (eagleImg) {
            eagle.direction = gameStateSnapshot.eagleDirection;
            eagle.size = gameStateSnapshot.eagleSize;
            eagle.width = Math.round(eagleImg.width * eagle.size);
            eagle.height = Math.round(eagleImg.height * eagle.size);
            
            // Adjust x position proportionally to new screen width
            const xRatio = eagle.x / gameStateSnapshot.eaglePosition.x;
            eagle.x = gameStateSnapshot.eaglePosition.x * xRatio;
            
            // Adjust y position to stay in the top 30%
            eagle.y = Math.min(gameStateSnapshot.eaglePosition.y, height * 0.3);
        }
        
        // Restore Biden's comprehensive state
        if (gameStateSnapshot.bidenState !== 'offscreen') {
            bidenSprite.state = gameStateSnapshot.bidenState;
            bidenSprite.speed = gameStateSnapshot.bidenSpeed;
            bidenSprite.currentFrame = gameStateSnapshot.bidenFrame;
            bidenSprite.frameTimer = gameStateSnapshot.bidenFrameTimer;
            bidenSprite.fallTimer = gameStateSnapshot.bidenFallTimer;
            bidenSprite.resetTimer = gameStateSnapshot.bidenResetTimer;
            bidenSprite.leaveAcceleration = gameStateSnapshot.bidenLeaveAcceleration;
            
            // Restore position proportionally for different states
            switch (gameStateSnapshot.bidenState) {
                case 'entering':
                    // Maintain the same relative progress towards target
                    const progressToTarget = (gameStateSnapshot.bidenPosition.x + bidenSprite.width) / (oldTargetX + bidenSprite.width);
                    bidenSprite.x = Math.round((bidenSprite.targetX + bidenSprite.width) * progressToTarget - bidenSprite.width);
                    break;
                case 'positioned':
                    // Keep Biden centered
                    bidenSprite.x = Math.round(bidenSprite.targetX);
                    break;
                case 'falling':
                case 'fallen':
                    // Maintain the same relative position from center for falling states
                    const offsetFromCenter = gameStateSnapshot.bidenPosition.x - (oldTargetX || windowWidth / 2);
                    bidenSprite.x = Math.round(bidenSprite.targetX + offsetFromCenter);
                    break;
                case 'leaving':
                    // Maintain the same relative progress leaving the screen
                    const progressLeaving = (gameStateSnapshot.bidenPosition.x - (oldTargetX || windowWidth / 2)) / (windowWidth + bidenSprite.width);
                    bidenSprite.x = Math.round(bidenSprite.targetX + progressLeaving * (windowWidth + bidenSprite.width));
                    break;
                default:
                    bidenSprite.x = Math.round(gameStateSnapshot.bidenPosition.x);
            }
            
            // Update Y position to match new screen proportions
            bidenSprite.y = Math.round(height * 0.975); // Maintain bottom positioning
        }
        
        // Restore scroll speed
        scrollSpeed = gameStateSnapshot.scrollSpeed;
        
        // Restore multiplier state
        gameState.currentMultiplier = gameStateSnapshot.multiplierState.current;
        gameState.targetMultiplier = gameStateSnapshot.multiplierState.target;
        gameState.multiplierAnimationStarted = gameStateSnapshot.multiplierState.animationStarted;
        gameState.multiplierAnimationComplete = gameStateSnapshot.multiplierState.animationComplete;
        gameState.multiplierAnimationStartTime = gameStateSnapshot.multiplierState.animationStartTime;
        gameState.suspensePeriodStarted = gameStateSnapshot.multiplierState.suspensePeriodStarted;
        gameState.suspensePeriodComplete = gameStateSnapshot.multiplierState.suspensePeriodComplete;
        gameState.lastSpeedFactor = gameStateSnapshot.multiplierState.lastSpeedFactor;
        gameState.suspenseSpeedFactor = gameStateSnapshot.multiplierState.suspenseSpeedFactor;
        
        // Restore game flags
        gameState.doesFall = gameStateSnapshot.gameFlags.doesFall;
        gameState.fallTriggered = gameStateSnapshot.gameFlags.fallTriggered;
        gameState.isWinningGame = gameStateSnapshot.gameFlags.isWinningGame;
        gameState.playRequestInProgress = gameStateSnapshot.gameFlags.playRequestInProgress;
        
        // Update UI to reflect current state
        updateMultiplierDisplay();
        updatePlayButtonState();
        updateBetButtonState();
    }
}

// Intro screen management
let introState = {
    currentScreen: 0,
    loadingComplete: false,
    screens: [
        { id: 'stake-screen', duration: 2080 },    // First loading screen - 1 second
        { id: 'paradice-screen', duration: 3000 }, // Second loading screen - 3 seconds
        { id: 'gamelogo-screen', duration: null }  // Final screen - stays until user clicks
    ]
};

function showIntroScreen(screenIndex) {
    // Hide all screens
    document.querySelectorAll('.intro-screen').forEach(screen => {
        screen.style.opacity = '0';
        screen.style.visibility = 'hidden';
    });
    
    // Show the current screen
    const currentScreen = document.getElementById(introState.screens[screenIndex].id);
    currentScreen.style.opacity = '1';
    currentScreen.style.visibility = 'visible';
    
    // If this is the game logo screen, start the loading bar
    if (screenIndex === 2) {
        // Reset the logo animation by removing and reapplying it
        const gameLogo = document.getElementById('game-logo');
        if (gameLogo) {
            // Reset the animation by removing the element and re-adding it
            const parent = gameLogo.parentNode;
            const logoClone = gameLogo.cloneNode(true);
            parent.removeChild(gameLogo);
            
            // Slight delay before adding the logo back to ensure the animation triggers
            setTimeout(() => {
                parent.appendChild(logoClone);
            }, 50);
        }
        
        setTimeout(() => {
            const loadingBar = document.getElementById('loading-bar');
            const loadingBarContainer = document.getElementById('loading-bar-container');
            loadingBar.style.width = '100%';
            
            // After loading completes, hide loading bar and show "Click to continue"
            setTimeout(() => {
                introState.loadingComplete = true;
                loadingBarContainer.style.opacity = '0'; // Hide the loading bar
                
                // After the loading bar fades out, show the continue text
                setTimeout(() => {
                    const continueText = document.getElementById('continue-text');
                    continueText.style.opacity = '1';
                    continueText.style.visibility = 'visible';
                }, 500); // Wait for loading bar to fade out
            }, 3000); // Loading bar animation duration
        }, 1200); // Delay the loading bar start until after the logo animation completes
    }
}

function advanceIntroScreen() {
    // If we're on the last screen and loading is complete, start the game
    if (introState.currentScreen === introState.screens.length - 1 && introState.loadingComplete) {
        startGame();
        return;
    }
    
    // If we're not on the last screen, advance to the next one
    if (introState.currentScreen < introState.screens.length - 1) {
        introState.currentScreen++;
        showIntroScreen(introState.currentScreen);
        
        // If the next screen has a duration, set a timer to advance
        const duration = introState.screens[introState.currentScreen].duration;
        if (duration) {
            // Add the transition duration to ensure the fade-in completes before starting the next fade-out
            setTimeout(advanceIntroScreen, duration + 550); 
        }
    }
}

// Handle click events for the intro screens
document.addEventListener('click', function(event) {
    // Only respond to clicks if game hasn't started yet, we're on the last screen, and loading is complete
    if (!gameStarted && introState.currentScreen === introState.screens.length - 1 && introState.loadingComplete) {
        startGame();
    }
});

// Handle click on start screen
document.addEventListener('DOMContentLoaded', function() {
    // Initialize translations first
    initializeLanguage();
    
    // Set game container dimensions for intro screens
    detectScreenSize();
    document.documentElement.style.setProperty('--game-width', `100vw`);
    document.documentElement.style.setProperty('--game-height', `${gameHeight}px`);
    
    // Parse URL parameters immediately when DOM loads
    parseURLParameters();
    
    // Update UI with translations
    updateUITranslations();
    
    // Setup toolbar handlers and keyboard events
    setupStartScreen();
    
    // Start the intro sequence
    showIntroScreen(0);
    // Since first screen already starts visible, we just need the duration without adding extra transition time
    setTimeout(advanceIntroScreen, introState.screens[0].duration);
    
    // If we have sessionID and rgsUrl, authenticate with RGS
    if (gameState.sessionID && gameState.rgsUrl) {
        authenticateWithRGS().then(() => {
            // We'll start the game after intro screens
        }).catch((error) => {
            // Fall back to demo mode instead of showing error
            console.log('Authentication failed, running in demo mode:', error);
            gameState.authenticated = true;
            gameState.balance = 1000000; // Demo balance
            gameState.balanceCurrency = 'USD';
            gameState.currentBet = 100000; // Demo bet amount
            gameState.minBet = 100000;
            gameState.maxBet = 10000000;
            gameState.stepBet = 100000;
        });
    } else {
        // Run in demo mode when no authentication parameters
        console.log('No authentication parameters, running in demo mode');
        gameState.authenticated = true;
        gameState.balance = 1000000; // Demo balance
        gameState.balanceCurrency = 'USD';
        gameState.currentBet = 100000; // Demo bet amount
        gameState.minBet = 100000;
        gameState.maxBet = 10000000;
        gameState.stepBet = 100000;
    }
});

function setupStartScreen() {
    // Setup toolbar functionality when DOM is ready
    setupToolbarHandlers();
    
    // We've replaced the old start screen with intro screens,
    // so we don't need to add click handlers here
    
    // Also allow spacebar to advance/start when appropriate
    document.addEventListener('keydown', function(event) {
        if (event.code === 'Space') {
            // During intro screens, allow spacebar to advance/start
            if (introState.currentScreen === introState.screens.length - 1 && introState.loadingComplete && !gameStarted) {
                event.preventDefault();
                startGame();
            } 
            // During gameplay, allow spacebar to place bet if conditions are met
            else if (gameStarted && isBettingAllowed()) {
                event.preventDefault();
                placeBet();
            }
        }
    });
}

function setupToolbarHandlers() {
    // Initialize displays
    updateBalanceDisplay();
    updateBetInput();

    // Set default game speed
    setGameSpeed('normal');
    
    // Set up volume control
    setupVolumeControl();
    
    // Add event listeners for speed buttons
    const speedButtons = document.querySelectorAll('.speed-btn');
    speedButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            // Extract the speed value from the onclick attribute
            const onclickAttr = this.getAttribute('onclick');
            if (onclickAttr) {
                const speedMatch = onclickAttr.match(/setGameSpeed\('([^']+)'\)/);
                if (speedMatch && speedMatch[1]) {
                    setGameSpeed(speedMatch[1]);
                }
            }
        });
    });
    
    // Make sure play button is properly setup
    const playButton = document.getElementById('play-button');
    if (playButton) {
        playButton.addEventListener('click', placeBet);
    }
    
    // Setup bonus buy button
    const bonusBuyButton = document.getElementById('bonus-buy-button');
    if (bonusBuyButton) {
        bonusBuyButton.addEventListener('click', openBonusBuyModal);
        
        // Update initial bonus prices
        updateBonusBetInput();
        updateBonusPrices();
    }
    
    // Setup bonus buy buttons in modal
    const bonusBuyButtons = document.querySelectorAll('.bonus-buy-button');
    bonusBuyButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const multiplier = parseInt(this.getAttribute('data-multiplier'));
            if (multiplier) {
                buyBonus(multiplier);
            }
        });
    });
    
    // Setup close modal button
    const closeModalButton = document.querySelector('.close-modal');
    if (closeModalButton) {
        closeModalButton.addEventListener('click', closeBonusBuyModal);
    }
    
    // Setup click outside modal to close
    const modal = document.getElementById('bonus-buy-modal');
    if (modal) {
        window.addEventListener('click', function(event) {
            if (event.target === modal) {
                closeBonusBuyModal();
            }
        });
    }
    
    // Setup turbo button
    const turboButton = document.getElementById('turbo-btn');
    if (turboButton) {
        turboButton.addEventListener('click', toggleTurboMode);
    }
    
    // Setup info button
    const infoButton = document.getElementById('info-btn');
    if (infoButton) {
        infoButton.addEventListener('click', openInfoModal);
    }
}

// Bonus Buy Functions
function openBonusBuyModal() {
    // Don't open modal if game is in progress
    if (gameState.playRequestInProgress || 
        (bidenSprite && bidenSprite.state !== 'offscreen')) {
        return;
    }
    
    const modal = document.getElementById('bonus-buy-modal');
    if (modal) {
        // Ensure bonus bet amount matches the current bet amount
        gameState.bonusBetAmount = gameState.currentBet / 1000000;
        updateBonusBetInput();
        
        // Update prices before showing modal
        updateBonusPrices();
        modal.style.display = 'flex';
        
        // Play bet change sound
        playChangeBetSound();
    }
}

function closeBonusBuyModal(skipSound = false) {
    const modal = document.getElementById('bonus-buy-modal');
    if (modal) {
        modal.style.display = 'none';
        
        // Play bet change sound only if not skipped
        if (!skipSound) {
            playChangeBetSound();
        }
    }
}

// Info Modal Functions
function openInfoModal() {
    const modal = document.getElementById('info-modal');
    if (modal) {
        modal.style.display = 'flex';
        
        // Setup close modal button
        const closeModalButton = document.getElementById('close-info-modal');
        if (closeModalButton) {
            closeModalButton.addEventListener('click', closeInfoModal);
        }
        
        // Setup click outside modal to close
        modal.addEventListener('click', function(event) {
            if (event.target === modal) {
                closeInfoModal();
            }
        });
        
        // Play sound
        playChangeBetSound();
    }
}

function closeInfoModal() {
    const modal = document.getElementById('info-modal');
    if (modal) {
        modal.style.display = 'none';
        
        // Play sound
        playChangeBetSound();
    }
}

function updateBonusBetInput() {
    const bonusBetInput = document.getElementById('bonus-bet-input');
    if (bonusBetInput) {
        bonusBetInput.value = gameState.bonusBetAmount.toFixed(2);
    }
}

function adjustBonusBet(action) {
    // Play change bet sound
    playChangeBetSound();
    
    let currentBet = gameState.currentBet; // Use micro-units like main adjustBet function
    const minBet = gameState.minBet || 100000; // Default to 0.10
    const maxBet = gameState.maxBet || 1000000000; // Default to 1000.00

    if (gameState.betLevels && gameState.betLevels.length > 0) {
        // Use betLevels array for proper bet level navigation (same as main adjustBet)
        let currentIndex = gameState.betLevels.indexOf(currentBet);
        
        // If current bet is not found in array, find the closest one
        if (currentIndex === -1) {
            // Find the closest bet level
            for (let i = 0; i < gameState.betLevels.length; i++) {
                if (gameState.betLevels[i] >= currentBet) {
                    currentIndex = i;
                    break;
                }
            }
            // If still not found, use the last (highest) bet level
            if (currentIndex === -1) {
                currentIndex = gameState.betLevels.length - 1;
            }
        }
        
        if (action === 'increase') {
            // Move to next higher bet level
            if (currentIndex < gameState.betLevels.length - 1) {
                const newBetAmount = gameState.betLevels[currentIndex + 1];
                
                // Check if new bet amount exceeds balance
                // Convert balance to micro-units for comparison (balance * 1000000)
                const balanceInMicroUnits = gameState.balance * 1000000;
                if (balanceInMicroUnits < newBetAmount) {
                    // Show warning message and don't change bet
                    updateGameMessage(t('playTooHighDecrease'), false, true);
                    return;
                }
                
                currentBet = newBetAmount;
            }
            // If already at max, stay at current bet
        } else if (action === 'decrease') {
            // Move to next lower bet level
            if (currentIndex > 0) {
                currentBet = gameState.betLevels[currentIndex - 1];
            }
            // If already at min, stay at current bet
        }
    } else {
        // Fallback to step-based adjustment if betLevels not available
        const step = gameState.stepBet || 100000; // Default to 0.10 in micro-units
        
        if (action === 'increase') {
            const newBetAmount = Math.min(currentBet + step, maxBet);
            
            // Check if new bet amount exceeds balance
            // Convert balance to micro-units for comparison (balance * 1000000)
            const balanceInMicroUnits = gameState.balance * 1000000;
            if (balanceInMicroUnits < newBetAmount) {
                // Show warning message and don't change bet
                updateGameMessage(t('playTooHighDecrease'), false, true);
                return;
            }
            
            currentBet = newBetAmount;
        } else if (action === 'decrease') {
            currentBet = Math.max(currentBet - step, minBet);
        }
    }

    // Update both main bet and bonus bet to keep them in sync
    gameState.currentBet = currentBet;
    gameState.bonusBetAmount = currentBet / 1000000; // Convert from micro-units
    
    updateBetInput(); // Update the main bet input
    updateBonusBetInput(); // Update the bonus bet input
    updateBonusPrices(); // Update the bonus prices
}

function updateBonusPrices() {
    const baseBet = gameState.bonusBetAmount;
    const bonusPriceElements = document.querySelectorAll('.bonus-price');
    const currency = getCurrentCurrency();
    
    bonusPriceElements.forEach((element) => {
        // Display price as 100x the bet amount for UI, using proper currency formatting
        const price = baseBet * 100;
        element.textContent = formatCurrency(price, currency);
    });
}

function buyBonus(multiplier) {
    // Calculate the price based on multiplier and bet amount
    const price = gameState.bonusBetAmount * multiplier;
    
    // Bonus costs 100x the bet amount, so compare 100x bet to balance
    const bonusCost = gameState.bonusBetAmount * 100;
    if (gameState.balance < bonusCost * 1000000) { // Convert to micro-units
        updateGameMessage(t('insufficientBalanceForPlay'), false, true);
        return;
    }
    
    // Close the modal without playing change bet sound
    closeBonusBuyModal(true);
    
    // Play bet sound since user is placing a bet
    playBetSound();
    
    // Start a bonus game (target multiplier will come from server response)
    startBonusGame(price);
}

async function startBonusGame(price) {
    // Prevent multiple clicks by disabling all interactive buttons
    updatePlayButtonState();
    updateBetButtonState();
    
    // Start the game with the bonus multiplier
    if (!gameStarted) {
        startGame();
    }
    
    try {
        // We'll keep the current multiplier value until a new bet is placed
        // Only reset other multiplier-related flags
        gameState.multiplierAnimationStarted = false;
        gameState.multiplierAnimationComplete = false;
        
        // Reset suspense period flags
        gameState.suspensePeriodStarted = false;
        gameState.suspensePeriodComplete = false;
        gameState.fallTriggered = false;
        gameState.doesFall = false;
        gameState.isWinningGame = false;
        
        // Reset Biden state for new round
        if (bidenSprite.state !== 'offscreen') {
            bidenSprite.state = 'offscreen';
            bidenSprite.x = -bidenSprite.width;
            bidenSprite.speed = 0;
            bidenSprite.fallTimer = 0;
            bidenSprite.resetTimer = 0;
            bidenSprite.leaveAcceleration = null;
            bidenSprite.currentFrame = bidenSprite.normalFrameStart; // Reset to normal frame range
        }
        
        // Update UI
        updateMultiplierDisplay();
        
        // Clear any existing message but don't show "Good luck" text
        hideGameMessage(); // Hide message instead of showing "Good luck"
        
        // Hide any existing speech bubble when a bonus round is started
        // This ensures the speech bubble from previous win is cleared
        speechBubble.active = false;
        updateSpeechBubble();
        
        // Start Biden's entrance animation
        bidenSprite.state = 'entering';
        
        // Keep play button disabled during game
        updatePlayButtonState();
        updateBetButtonState();

        // Make real API call to wallet/play with BONUS mode
        const playUrl = `https://${gameState.rgsUrl}/wallet/play`;
        const requestBody = {
            sessionID: gameState.sessionID,
            amount: gameState.bonusBetAmount * 1000000, // Send only bet amount, server handles 100x cost
            mode: "BONUS" // Bonus mode for bonus buy
        };

        const response = await fetch(playUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Bonus play request failed: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const playData = await response.json();
        
        // Track the bonus bet event
        trackGameEvent('bonus_bet_placed');
        
        // Update game state with the response
        gameState.balance = playData.balance.amount;
        gameState.round = playData.round;
        
        // Extract fall state from event data if available
        gameState.doesFall = false; // Default to false (Biden doesn't fall)
        gameState.fallTriggered = false; // Reset fall trigger
        
        // Check for event data that contains the fall state
        if (playData.round && playData.round.event && playData.round.event.doesFall !== undefined) {
            gameState.doesFall = playData.round.event.doesFall;
        } else if (playData.round && playData.round.state && playData.round.state.length > 0) {
            // Alternative location for event data
            const stateData = playData.round.state[0];
            if (stateData.doesFall !== undefined) {
                gameState.doesFall = stateData.doesFall;
            }
        }
        
        // Extract target multiplier from the response
        // Prioritize targetMultiplier from different possible locations
        if (playData.book && playData.book.events && playData.book.events.length > 0 && playData.book.events[0].targetMultiplier !== undefined) {
            // If targetMultiplier is in the book's events array (new format)
            gameState.targetMultiplier = playData.book.events[0].targetMultiplier / 100; // Convert from percentage to decimal
            gameState.isWinningGame = gameState.doesFall; // Win when Biden falls regardless of multiplier
            
        } else if (playData.round && playData.round.state && playData.round.state.length > 0 && playData.round.state[0].targetMultiplier !== undefined) {
            // Check for targetMultiplier in round state array (server response format)
            gameState.targetMultiplier = playData.round.state[0].targetMultiplier / 100; // Convert from percentage to decimal
            gameState.isWinningGame = gameState.doesFall; // Win when Biden falls regardless of multiplier
            
        } else if (playData.round && playData.round.payoutMultiplier !== undefined) {
            // Fallback to round object's direct payoutMultiplier property
            gameState.targetMultiplier = playData.round.payoutMultiplier;
            gameState.isWinningGame = gameState.doesFall; // Win when Biden falls regardless of multiplier
            
        } else if (playData.book && playData.book.payoutMultiplier !== undefined) {
            // Last fallback to book's payoutMultiplier if no other source found
            gameState.targetMultiplier = playData.book.payoutMultiplier / 100; // Convert from percentage to decimal
            gameState.isWinningGame = gameState.doesFall; // Win when Biden falls regardless of multiplier
            
        } else {
            // Default fallback multiplier for testing if not provided by server
            gameState.targetMultiplier = 100; // Default 100x for bonus
            gameState.isWinningGame = gameState.doesFall; // Only win if Biden falls
        }

        updateBalanceDisplay();
                
        // Start the multiplier animation when Biden is positioned
        if (bidenSprite.state === 'positioned') {
            startMultiplierAnimation();
        } else {
            // If Biden is still entering, start animation when positioned
            const checkBidenInterval = setInterval(() => {
                if (bidenSprite.state === 'positioned') {
                    startMultiplierAnimation();
                    clearInterval(checkBidenInterval);
                }
            }, 100);
        }
        
    } catch (error) {
        // Re-enable buttons on error
        updatePlayButtonState();
        updateBetButtonState();
        
        // Restore balance if the API call failed (since we haven't deducted it from server yet)
        updateBalanceDisplay();
    }
}

// Currency formatting utility (now handled by translations.js formatCurrency function)

function updateBalanceDisplay() {
    const balanceDisplay = document.getElementById('balance-display');
    if (balanceDisplay) {
        const currency = getCurrentCurrency();
        if (gameState.authenticated && gameState.balance && gameState.balanceCurrency) {
            // Convert from micro-units to regular units for display
            const amount = gameState.balance / 1000000;
            balanceDisplay.textContent = formatCurrency(amount, gameState.balanceCurrency);
        } else {
            // Fallback for demo mode - balance is already in regular units
            balanceDisplay.textContent = formatCurrency(gameState.balance, currency);
        }
    }
}

function updateBetInput() {
    const betInput = document.getElementById('bet-input');
    if (betInput) {
        // Use currency formatting from translations.js for consistent display
        const currency = getCurrentCurrency();
        const amount = gameState.currentBet / 1000000; // Convert from micro-units
        betInput.value = formatCurrency(amount, currency);
    }
}

function updateBonusBetInput() {
    const bonusBetInput = document.getElementById('bonus-bet-input');
    if (bonusBetInput) {
        // Use currency formatting from translations.js for consistent display
        const currency = getCurrentCurrency();
        bonusBetInput.value = formatCurrency(gameState.bonusBetAmount, currency);
    }
}

// Function to update the payout display
//trying to push
function updateMultiplierDisplay() {
    const payoutElement = document.getElementById('payout-value');
    const multiplierContainer = document.getElementById('multiplier-container');
    
    if (payoutElement) {
        const currency = getCurrentCurrency();
        
        // First check - is this a confirmed loss?
        if (gameState.lossConfirmed) {
            // Always show zero for confirmed losses - highest priority check
            const zeroCurrency = formatCurrency(0, currency);
            payoutElement.textContent = zeroCurrency;
            return; // Exit early to prevent any other logic from running
        }
        
        // If we have a non-winning game situation, show zero
        if ((bidenSprite && bidenSprite.state === 'falling' && !gameState.isWinningGame) ||
            (!gameState.isWinningGame && gameState.suspensePeriodComplete)) {
            const zeroCurrency = formatCurrency(0, currency);
            payoutElement.textContent = zeroCurrency;
            
            // Confirm the loss to ensure it stays at zero
            gameState.lossConfirmed = true;
            
            // Set multiplier to 0 for losses to prevent it from showing the target multiplier
            gameState.currentMultiplier = 0;
        } else {
            // Only calculate and show potential win if not a loss
            // Calculate potential win amount (bet * current multiplier)
            const potentialWinAmount = (gameState.currentBet * gameState.currentMultiplier) / 1000000;
            const formattedWinAmount = formatCurrency(potentialWinAmount, currency);
            
            // Show the payout amount
            payoutElement.textContent = formattedWinAmount;
        }
        
        // Apply different styles based on game state
        if (gameState.multiplierAnimationComplete) {
            // Animation complete, but only apply winning/losing styles after suspense period
            
            // First remove all possible classes
            multiplierContainer.classList.remove('winning-multiplier');
            multiplierContainer.classList.remove('losing-multiplier');
            multiplierContainer.classList.remove('zero-multiplier');
            
            // Only apply color styles if suspense period is over
            if (gameState.suspensePeriodComplete) {
                // First check - is this a confirmed loss or non-winning game?
                if (!gameState.isWinningGame || gameState.lossConfirmed) {
                    // If it's a losing game, show red and confirm the loss
                    multiplierContainer.classList.add('losing-multiplier');
                    gameState.lossConfirmed = true;
                    
                    // Set multiplier to 0 for losses to prevent it from showing the target multiplier
                    gameState.currentMultiplier = 0;
                    
                    // Show $0.00 for a loss
                    const currency = getCurrentCurrency();
                    const zeroCurrency = formatCurrency(0, currency);
                    payoutElement.textContent = zeroCurrency;
                    
                    // Add a safety timeout to ensure loss display sticks
                    setTimeout(() => {
                        if (gameState.lossConfirmed) {
                            const payoutElement = document.getElementById('payout-value');
                            if (payoutElement) {
                                payoutElement.textContent = zeroCurrency;
                            }
                        }
                    }, 50);
                } else if (gameState.isWinningGame) {
                    // If it's a winning game, show green
                    multiplierContainer.classList.add('winning-multiplier');
                    
                    // Show final payout value (bet * multiplier)
                    const currency = getCurrentCurrency();
                    const formattedWinAmount = formatCurrency(lastWinAmount, currency);
                    payoutElement.textContent = formattedWinAmount;
                }
            }
        } else {
            // Animation in progress, no special styling yet
            multiplierContainer.classList.remove('winning-multiplier');
            multiplierContainer.classList.remove('losing-multiplier');
            multiplierContainer.classList.remove('zero-multiplier');
            
            // If cart is falling, immediately apply losing style
            if (bidenSprite && bidenSprite.state === 'falling' && !gameState.isWinningGame) {
                multiplierContainer.classList.add('losing-multiplier');
            }
        }
    }
}

// Function to animate the multiplier
function animateMultiplier() {
    if (!gameState.multiplierAnimationStarted || gameState.multiplierAnimationComplete) {
        return;
    }
    
    // If we have a confirmed loss, don't update the multiplier animation
    // This ensures the payout display stays at zero
    if (gameState.lossConfirmed) {
        // Just make sure the payout is showing zero
        const payoutElement = document.getElementById('payout-value');
        if (payoutElement) {
            const currency = getCurrentCurrency();
            payoutElement.textContent = formatCurrency(0, currency);
        }
        return;
    }
    
    // Don't set loss flag early during animation, keep payout visible
    // until the cart actually starts flipping
    if (!gameState.isWinningGame && gameState.targetMultiplier && gameState.currentMultiplier >= gameState.targetMultiplier) {
        // Only proceed with animation, don't set lossConfirmed yet
        // We'll set it during the falling animation
        return;
    }
    
    const currentTime = Date.now();
    const elapsedTime = currentTime - gameState.multiplierAnimationStartTime;
    
    // Constants for exponential growth (affected by turbo mode)
    const baseGrowthRate = 0.008; // Base multiplier growth rate per frame
    const GROWTH_RATE = baseGrowthRate * (gameState.turboMode ? 2 : 1); // Double speed in turbo mode
    const BASE_SPEED = 1.0; // Starting speed factor
    const baseSpeedMultiplier = 1.003; // Base speed increase factor per frame
    const SPEED_MULTIPLIER = baseSpeedMultiplier + (gameState.turboMode ? 0.003 : 0); // Faster speed increase in turbo mode
    
    // Initialize if this is the first frame
    if (!gameState.exponentialState) {
        gameState.exponentialState = {
            currentSpeedFactor: BASE_SPEED,
            lastMultiplier: 0.0
        };
    }
    
    // Calculate exponential growth - multiplier increases by constant percentage each frame
    const growthFactor = 1 + GROWTH_RATE;
    
    // Handle starting from 0 - add a small base amount to get the growth started
    if (gameState.exponentialState.lastMultiplier === 0) {
        gameState.currentMultiplier = GROWTH_RATE * 10; // Start with a small base amount
    } else {
        gameState.currentMultiplier = gameState.exponentialState.lastMultiplier * growthFactor;
    }
    
    // Check if we've reached the target
    if (gameState.currentMultiplier >= gameState.targetMultiplier) {
        gameState.currentMultiplier = gameState.targetMultiplier;
        gameState.multiplierAnimationComplete = true;
    } else {
        // Update state for next frame
        gameState.exponentialState.lastMultiplier = gameState.currentMultiplier;
        
        // Speed increases by constant factor each frame (true exponential growth)
        gameState.exponentialState.currentSpeedFactor *= SPEED_MULTIPLIER;
        
        // Apply the speed factor to visual elements
        adjustGameSpeed(gameState.exponentialState.currentSpeedFactor);
    }
    
    // Check if animation is complete, but don't set loss confirmed yet
    // We'll set lossConfirmed during the falling animation
    if (!gameState.isWinningGame && gameState.currentMultiplier >= gameState.targetMultiplier) {
        gameState.multiplierAnimationComplete = true;
        // Don't set lossConfirmed or update payout here
        // This keeps the payout visible until the cart is actually flipping
    }
    
    // Update display, but only if not a confirmed loss (extra safety check)
    if (!gameState.lossConfirmed) {
        updateMultiplierDisplay();
    }
    
    // Check if animation is complete
    if (gameState.multiplierAnimationComplete) {
        // Reset exponential state for next round
        gameState.exponentialState = null; // Ensure exact final value
        
        // Store win amount for later reference (but don't show message yet)
        if (gameState.isWinningGame) {
            // Calculate win amount (bet * multiplier)
            const winAmount = (gameState.currentBet * gameState.targetMultiplier) / 1000000;
            lastWinAmount = winAmount; // Store for later reference
        } else {
            lastWinAmount = 0; // Store zero win amount
            // Don't set lossConfirmed yet - we'll set it during the falling animation
            // This keeps the payout visible until the cart is actually flipping
        }
        
        // Update display one final time (after setting loss flag)
        updateMultiplierDisplay();
        
        // Don't force payout to zero yet for losses
        // We'll set it during the falling animation
        // This keeps the payout visible until the cart is actually flipping
        
        
        // Start the suspense period - Biden continues riding at the same speed while player waits
        if (bidenSprite.state === 'positioned' && !gameState.suspensePeriodStarted) {
            gameState.suspensePeriodStarted = true;
            
            // Use the last speed factor to maintain the same speed during suspense
            const turboMultiplier = gameState.turboMode ? 2 : 1;
            const suspenseSpeedFactor = (gameState.lastSpeedFactor || 1) * (gameState.gameSpeed || 1) * turboMultiplier;
            
            // Store the suspense speed factor for consistent use across animation frames
            gameState.suspenseSpeedFactor = suspenseSpeedFactor;
            
            // Keep the current scroll speed during suspense (don't multiply it)
            // This preserves the linear acceleration that was achieved
            // scrollSpeed remains unchanged during suspense
            bidenSprite.animationSpeed = Math.max(3, Math.floor(8 / suspenseSpeedFactor));
            
            // Add some anticipation through UI
            const multiplierContainer = document.getElementById('multiplier-container');
            if (multiplierContainer) {
                // Add a subtle pulsing effect during suspense
                multiplierContainer.classList.add('suspense-pulse');
            }
            
            // After the suspense period, reveal the outcome
            setTimeout(() => {
                // Don't set the loss status yet - we'll only set it during the falling animation
                // This ensures payout remains visible until the cart is actually flipping
                
                gameState.suspensePeriodComplete = true;
                
                // Remove suspense effect
                if (multiplierContainer) {
                    multiplierContainer.classList.remove('suspense-pulse');
                }
                
                // Don't force loss display to zero yet
                // We'll set it during the falling animation
                // This keeps the payout visible until the cart is actually flipping
                
                // For non-winning games, don't set loss confirmed yet
                // We'll set it during the falling animation
                // This keeps the payout visible until the cart is actually flipping
                
                // Update the multiplier display with final colors
                updateMultiplierDisplay();
                
                // Now make Biden fall or leave based on the game outcome BUT VISUAL REVERSAL
                if (gameState.doesFall) {
                    // VISUAL REVERSAL: When doesFall is true, we make Biden leave (continue riding) instead
                    bidenSprite.state = 'leaving';
                } else {
            // VISUAL REVERSAL: When doesFall is false, we make Biden fall instead
            // The fall will be triggered below by setting state directly
            bidenSprite.state = 'falling';
            bidenSprite.currentFrame = 0; // Reset to first frame during falling and keep it there
            bidenSprite.lockFrame = true; // Lock the frame during falling animation
            gameState.fallTriggered = true;
            // We'll set lossConfirmed during the falling animation instead of here
            // This keeps the payout visible until the cart is actually flipping                    // VISUAL REVERSAL: When doesFall is true, biker keeps riding (which means win)
                    // Keep the multiplier as is to show win
                    setTimeout(() => {
                        // Play a sound effect if available
                        // TODO: Add sound effect for win
                        
                        // Drop the multiplier to 0 with a visual effect
                        if (multiplierContainer) {
                            // Add a quick shake animation
                            multiplierContainer.classList.add('shake');
                            
                            // Ensure the payout stays at zero if it's a loss
                            if (!gameState.isWinningGame) {
                                gameState.lossConfirmed = true;
                                const payoutElement = document.getElementById('payout-value');
                                if (payoutElement) {
                                    const currency = getCurrentCurrency();
                                    payoutElement.textContent = formatCurrency(0, currency);
                                }
                            }
                            
                            setTimeout(() => multiplierContainer.classList.remove('shake'), 500);
                        }
                        
                        // Update the display with the current multiplier
                        updateMultiplierDisplay();
                    }, 500); // 500ms delay for dramatic effect
                }
                
            }, gameState.turboMode ? gameState.suspensePeriodDuration / 2 : gameState.suspensePeriodDuration);
        }
        
        // End the current round
        endCurrentRound().then(result => {
            if (result.success) {
                
                // Don't re-enable play button here - let Biden finish his animation first
                // The button will be re-enabled when Biden completes his exit animation
                // in updateBidenAnimation() (either 'fallen' or 'leaving' states)
            } else {
                
                // Even if end-round failed, don't re-enable button here
                // Let Biden finish his animation sequence properly
            }
        });
    }
}

// Function to update the speech bubble position and text
function updateSpeechBubble() {
    const bubbleElement = document.getElementById('biden-speech-bubble');
    const tailElement = document.getElementById('speech-bubble-tail');
    
    if (!bubbleElement || !tailElement) return;
    
    if (speechBubble.active) {
        // Fixed position in center of screen for the bubble
        bubbleElement.textContent = speechBubble.text;
        bubbleElement.classList.add('speech-bubble-visible');
        
        // Check if Biden is within the screen bounds
        if (bidenSprite.state !== 'offscreen' && bidenSprite.x > -bidenSprite.width && bidenSprite.x < width + bidenSprite.width) {
            // Update tail position based on Biden's position
            const canvasRect = document.getElementById('sketch-holder').getBoundingClientRect();
            const adjustedX = canvasRect.left + bidenSprite.x;
            const adjustedY = canvasRect.top + bidenSprite.y - 20; // Position above Biden
            
            tailElement.style.left = `${adjustedX}px`;
            tailElement.style.top = `${adjustedY}px`;
            tailElement.classList.add('tail-visible');
        } else {
            // If Biden is offscreen, keep the bubble visible but hide the tail
            tailElement.classList.remove('tail-visible');
        }
    } else {
        bubbleElement.classList.remove('speech-bubble-visible');
        tailElement.classList.remove('tail-visible');
    }
}

// Function to show a random speech bubble
function showRandomSpeechBubble() {
    // Get translated Biden phrases
    bidenPhrases = getBidenPhrases();
    
    if (bidenPhrases.length === 0) return;
    
    // Pick a random phrase
    const randomIndex = Math.floor(Math.random() * bidenPhrases.length);
    speechBubble.text = bidenPhrases[randomIndex];
    speechBubble.active = true;
    
    // Force update the speech bubble visibility
    const bubbleElement = document.getElementById('biden-speech-bubble');
    const tailElement = document.getElementById('speech-bubble-tail');
    
    if (bubbleElement && tailElement) {
        bubbleElement.textContent = speechBubble.text;
        bubbleElement.classList.add('speech-bubble-visible');
        
        // Position bubble and tail
        updateSpeechBubble();
    }
    
    // No longer automatically hide the speech bubble - it will stay visible until next bet
    // setTimeout(hideSpeechBubble, 8000);
}

// Function to hide the speech bubble
function hideSpeechBubble(forceHide = false) {
    // We need to track if this is called during game reset vs. new bet
    if (forceHide === true || gameState.newBetPlaced === true) {
        speechBubble.active = false;
        updateSpeechBubble();
        
        // Reset the flag after hiding
        if (gameState.newBetPlaced) {
            gameState.newBetPlaced = false;
        }
    }
}

// Function to adjust game speed during multiplier animation
function adjustGameSpeed(speedFactor) {
    // Store the last speed factor for use during suspense period
    if (speedFactor > 0) {
        gameState.lastSpeedFactor = speedFactor;
    }
    
    // Get effective speed (includes turbo multiplier)
    const effectiveSpeed = getEffectiveGameSpeed();
    
    // DON'T modify scroll speed here - let the linear acceleration in 'positioned' state handle it
    // This prevents the exponential multiplier system from overriding our simple acceleration
    
    // Only adjust cart animation speed
    const baseFrameDelay = 12;  // Starting slow (higher delay = slower animation)
    const minFrameDelay = 3;    // Fastest possible animation
    
    // Use square root to make pedaling increase more gradually than the exponential multiplier
    // This creates a nice visual balance - background speeds up exponentially, pedaling more gradually
    const dampedSpeedFactor = Math.sqrt(speedFactor) * effectiveSpeed;
    
    // Calculate frame delay that decreases more gradually with speed factor
    const frameDelay = Math.max(minFrameDelay, Math.floor(baseFrameDelay / dampedSpeedFactor));
    
    // Update Biden's animation timing
    bidenSprite.animationSpeed = frameDelay;
}

// Function to update play button state based on game state
// Helper function to check if betting is allowed (same conditions as play button)
function isBettingAllowed() {
    if (!gameStarted) {
        return false; // No betting during intro screens
    }
    
    return !gameState.round && 
           !gameState.playRequestInProgress &&
           !gameState.multiplierAnimationStarted;
}

function updatePlayButtonState() {
    const playButton = document.getElementById('play-button');
    const bonusBuyButton = document.getElementById('bonus-buy-button');
    
    if (playButton) {
        if (!gameStarted) {
            // Enable button if game hasn't started
            playButton.disabled = false;
        } else if (!gameState.round && 
                   !gameState.playRequestInProgress &&
                   !gameState.multiplierAnimationStarted &&
                   bidenSprite.state === 'offscreen') {
            // Enable button if:
            // - No active round exists (round has been ended)
            // - No play request is in progress
            // - No multiplier animation is running
            // - Biden is offscreen (game is ready for next round)
            playButton.disabled = false;
        } else {
            // Disable button during animation, gameplay, or round processing
            playButton.disabled = true;
        }
    }
    
    // Also handle bonus buy button with the same logic
    if (bonusBuyButton) {
        if (!gameStarted) {
            // Enable button if game hasn't started
            bonusBuyButton.disabled = false;
        } else if (!gameState.round && 
                   !gameState.playRequestInProgress &&
                   !gameState.multiplierAnimationStarted &&
                   bidenSprite.state === 'offscreen') {
            // Enable bonus buy button if:
            // - No active round exists (round has been ended)
            // - No play request is in progress
            // - No multiplier animation is running
            // - Biden is offscreen (game is ready for next round)
            bonusBuyButton.disabled = false;
        } else {
            // Disable button during animation, gameplay, or round processing
            bonusBuyButton.disabled = true;
        }
    }
}

// Function to update bet adjustment button states based on game state
function updateBetButtonState() {
    // Get all bet adjustment buttons
    const betDecreaseButtons = document.querySelectorAll('.bet-adjust-btn[onclick*="adjustBet(\'decrease\')"], .bet-adjust-btn[onclick*="adjustBonusBet(\'decrease\')"]');
    const betIncreaseButtons = document.querySelectorAll('.bet-adjust-btn[onclick*="adjustBet(\'increase\')"], .bet-adjust-btn[onclick*="adjustBonusBet(\'increase\')"]');
    
    // Combine all bet adjustment buttons
    const allBetButtons = [...betDecreaseButtons, ...betIncreaseButtons];
    
    allBetButtons.forEach(button => {
        if (!gameStarted) {
            // Enable buttons if game hasn't started
            button.disabled = false;
        } else if (!gameState.round && 
                   !gameState.playRequestInProgress &&
                   !gameState.multiplierAnimationStarted &&
                   bidenSprite.state === 'offscreen') {
            // Enable buttons if:
            // - No active round exists (round has been ended)
            // - No play request is in progress
            // - No multiplier animation is running
            // - Biden is offscreen (game is ready for next round)
            button.disabled = false;
        } else {
            // Disable buttons during animation, gameplay, or round processing
            button.disabled = true;
        }
    });
}

function adjustBet(action) {
    // Play change bet sound
    playChangeBetSound();
    
    let currentBet = gameState.currentBet;
    const minBet = gameState.minBet || 100000; // Default to 0.10
    const maxBet = gameState.maxBet || 1000000000; // Default to 1000.00

    if (gameState.betLevels && gameState.betLevels.length > 0) {
        // Use betLevels array for proper bet level navigation
        let currentIndex = gameState.betLevels.indexOf(currentBet);
        
        // If current bet is not found in array, find the closest one
        if (currentIndex === -1) {
            // Find the closest bet level
            for (let i = 0; i < gameState.betLevels.length; i++) {
                if (gameState.betLevels[i] >= currentBet) {
                    currentIndex = i;
                    break;
                }
            }
            // If still not found, use the last (highest) bet level
            if (currentIndex === -1) {
                currentIndex = gameState.betLevels.length - 1;
            }
        }
        
        if (action === 'increase') {
            // Move to next higher bet level
            if (currentIndex < gameState.betLevels.length - 1) {
                const newBetAmount = gameState.betLevels[currentIndex + 1];
                
                // Check if new bet amount exceeds balance
                // Convert balance to micro-units for comparison (balance * 1000000)
                const balanceInMicroUnits = gameState.balance * 1000000;
                if (balanceInMicroUnits < newBetAmount) {
                    // Show warning message and don't change bet
                    updateGameMessage(t('playTooHighDecrease'), false, true);
                    return;
                }
                
                currentBet = newBetAmount;
            }
            // If already at max, stay at current bet
        } else if (action === 'decrease') {
            // Move to next lower bet level
            if (currentIndex > 0) {
                currentBet = gameState.betLevels[currentIndex - 1];
            }
            // If already at min, stay at current bet
        }
    } else {
        // Fallback to step-based adjustment if betLevels not available
        const step = gameState.stepBet || 100000; // Default to 0.10 in micro-units
        
        if (action === 'increase') {
            const newBetAmount = Math.min(currentBet + step, maxBet);
            
            // Check if new bet amount exceeds balance
            // Convert balance to micro-units for comparison (balance * 1000000)
            const balanceInMicroUnits = gameState.balance * 1000000;
            if (balanceInMicroUnits < newBetAmount) {
                // Show warning message and don't change bet
                updateGameMessage(t('playTooHighDecrease'), false, true);
                return;
            }
            
            currentBet = newBetAmount;
        } else if (action === 'decrease') {
            currentBet = Math.max(currentBet - step, minBet);
        }
    }

    gameState.currentBet = currentBet;
    
    // Also update the bonus bet amount to match the main bet amount
    gameState.bonusBetAmount = currentBet / 1000000; // Convert from micro-units
    updateBonusBetInput(); // Update the bonus bet input
    updateBonusPrices(); // Update the bonus prices
    
    updateBetInput();
    const currency = getCurrentCurrency();
}

// Function for setting game speed from the UI
function setGameSpeed(speed) {
    // Play change bet sound when speed is changed
    playChangeBetSound();
    
    // Get current active button and target button
    const currentActiveButton = document.querySelector('.speed-btn.active');
    const targetButton = document.querySelector(`.speed-btn[onclick*="setGameSpeed('${speed}')"]`);
    
    // If the clicked button is already active, do nothing
    if (!targetButton || targetButton === currentActiveButton) {
        return;
    }
    
    // Set the game speed first
    let newSpeed;
    switch(speed.toLowerCase()) {
        case 'normal':
            newSpeed = 1;
            break;
        case 'fast':
            newSpeed = 2;
            break;
        case 'faster':
            newSpeed = 3;
            break;
        default:
            newSpeed = 1;
    }
    
    // Update game speed
    gameState.gameSpeed = newSpeed;
    
    // Use requestAnimationFrame to ensure smooth class transitions
    requestAnimationFrame(() => {
        if (currentActiveButton) {
            currentActiveButton.classList.remove('active');
        }
        
        // Small delay before adding active class to new button
        setTimeout(() => {
            targetButton.classList.add('active');
        }, 5);
    });
}

// Function to toggle turbo mode
function toggleTurboMode() {
    
    // Play change bet sound when turbo is toggled
    playChangeBetSound();
    
    gameState.turboMode = !gameState.turboMode;
    
    const turboBtn = document.getElementById('turbo-btn');
    const turboIcon = document.getElementById('turbo-icon');
    
    if (gameState.turboMode) {
        // Enable turbo mode
        turboBtn.classList.add('active');
        turboIcon.src = 'assets/turbo_active.png';
        turboBtn.title = t('turboModeOn');
    } else {
        // Disable turbo mode
        turboBtn.classList.remove('active');
        turboIcon.src = 'assets/turbo_innactive.png';
        turboBtn.title = t('turboModeOff');
    }
}

// Function to get the effective game speed (includes turbo multiplier)
function getEffectiveGameSpeed() {
    const baseSpeed = gameState.gameSpeed || 1;
    const turboMultiplier = gameState.turboMode ? 2 : 1;
    return baseSpeed * turboMultiplier;
}

async function placeBet() {
    // Set user interaction flags for mobile audio
    hasUserInteracted = true;
    gameInteractionStarted = true;
    
    // Prevent multiple simultaneous play requests
    if (gameState.playRequestInProgress) {
        return;
    }
    
    // Set flag to prevent additional requests
    gameState.playRequestInProgress = true;
    
    // Play change bet sound when button is clicked
    playBetSound();
    
    // Clear any existing win message but don't show "Good luck" text
    hideGameMessage(); // Hide message instead of showing "Good luck"
    
    // After first bet is placed, set isFirstBet to false so we don't show guidance again
    if (gameState.isFirstBet) {
        gameState.isFirstBet = false;
    }
    
    // Disable interactive buttons to prevent multiple clicks
    updatePlayButtonState();
    updateBetButtonState();
        
    // Check various game states before proceeding
    if (!gameStarted) {
    } else if (bidenSprite.state !== 'offscreen') {
    } else {
    }

    if (!gameStarted) {
        gameState.playRequestInProgress = false; // Reset flag
        startGame();
        return;
    }

    if (!gameState.authenticated) {
        gameState.playRequestInProgress = false; // Reset flag
        // Re-enable the button if there's an error
        updatePlayButtonState();
        updateBetButtonState();
        return;
    }

    // Check if there's an active round and end it first
    if (gameState.round) {
        const endResult = await endCurrentRound();
        
        if (!endResult.success) {
            gameState.playRequestInProgress = false; // Reset flag
            // Re-enable button on error
            updatePlayButtonState();
            updateBetButtonState();
            return;
        }
        
    }

    if (gameState.balance < gameState.currentBet) {
        updateGameMessage(t('insufficientBalanceForPlay'), false, true);
        gameState.playRequestInProgress = false; // Reset flag
        // Re-enable button if balance is insufficient
        updatePlayButtonState();
        updateBetButtonState();
        return;
    }

    try {
        
        // Reset multiplier values for new game
        gameState.currentMultiplier = 0;
        gameState.targetMultiplier = 0;
        gameState.multiplierAnimationStarted = false;
        gameState.multiplierAnimationComplete = false;
        
        // Reset all suspense period flags from previous round
        gameState.suspensePeriodStarted = false;
        gameState.suspensePeriodComplete = false;
        gameState.fallTriggered = false;
        gameState.doesFall = false;
        gameState.isWinningGame = false;
        
        // Reset Biden state completely for new round
        // If Biden is still animating from previous round, reset him to start fresh
        if (bidenSprite.state !== 'offscreen') {
            bidenSprite.state = 'offscreen';
            bidenSprite.x = -bidenSprite.width; // Reset position offscreen (matching Biden game)
            bidenSprite.speed = 0; // Reset speed
            bidenSprite.fallTimer = 0; // Reset fall timer
            bidenSprite.resetTimer = 0; // Reset any other timers
            bidenSprite.leaveAcceleration = null; // Reset leave acceleration
            bidenSprite.currentFrame = bidenSprite.normalFrameStart; // Reset to normal frame range
        }
        
        // Ensure the cart is positioned offscreen even if it was already in offscreen state
        if (bidenSprite.state === 'offscreen') {
            bidenSprite.x = -bidenSprite.width; // Reset position offscreen (matching Biden game)
        }
        
        // Reset multiplier values for new game
        gameState.currentMultiplier = 0;
        gameState.targetMultiplier = 0;
        
        // Set flag to indicate a new bet is placed (used to hide speech bubble)
        gameState.newBetPlaced = true;
        
        // Update UI immediately
        updateMultiplierDisplay();
        
        // Hide game message when a bet is placed
        hideGameMessage();
        
        // Hide any existing speech bubble when a new bet is placed
        // This ensures the speech bubble from previous win is cleared
        speechBubble.active = false;
        updateSpeechBubble();
        
        // Start Biden's entrance animation (matching Biden game)
        bidenSprite.state = 'entering';
        
        // Keep the play button disabled while Biden is entering
        updatePlayButtonState();
        updateBetButtonState();

        // Use wallet/play instead of wallet/bet
        const playUrl = `https://${gameState.rgsUrl}/wallet/play`;
        const requestBody = {
            sessionID: gameState.sessionID,
            amount: gameState.currentBet,
            mode: "BASE" // Standard mode for game play
        };


        const response = await fetch(playUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Play request failed: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const playData = await response.json();
        
        // Track the bet event after successful play request
        trackGameEvent('bet_placed');
        
        // Update game state with the response
        gameState.balance = playData.balance.amount;
        gameState.round = playData.round;
        
        // Extract fall state from event data if available
        gameState.doesFall = false; // Default to false (Biden doesn't fall)
        gameState.fallTriggered = false; // Reset fall trigger
        
        // Check for event data that contains the fall state
        if (playData.round && playData.round.event && playData.round.event.doesFall !== undefined) {
            gameState.doesFall = playData.round.event.doesFall;
        } else if (playData.round && playData.round.state && playData.round.state.length > 0) {
            // Alternative location for event data
            const stateData = playData.round.state[0];
            if (stateData.doesFall !== undefined) {
                gameState.doesFall = stateData.doesFall;
            }
        }
        
        // Extract target multiplier from the response
        // Prioritize targetMultiplier from different possible locations
        if (playData.book && playData.book.events && playData.book.events.length > 0 && playData.book.events[0].targetMultiplier !== undefined) {
            // If targetMultiplier is in the book's events array (new format)
            gameState.targetMultiplier = playData.book.events[0].targetMultiplier / 100; // Convert from percentage to decimal
            gameState.isWinningGame = gameState.doesFall; // Win when Biden falls regardless of multiplier
            
        } else if (playData.round && playData.round.state && playData.round.state.length > 0 && playData.round.state[0].targetMultiplier !== undefined) {
            // Check for targetMultiplier in round state array (server response format)
            gameState.targetMultiplier = playData.round.state[0].targetMultiplier / 100; // Convert from percentage to decimal
            gameState.isWinningGame = gameState.doesFall; // Win when Biden falls regardless of multiplier
            
        } else if (playData.round && playData.round.payoutMultiplier !== undefined) {
            // Fallback to round object's direct payoutMultiplier property
            gameState.targetMultiplier = playData.round.payoutMultiplier;
            gameState.isWinningGame = gameState.doesFall; // Win when Biden falls regardless of multiplier
            
        } else if (playData.book && playData.book.payoutMultiplier !== undefined) {
            // Last fallback to book's payoutMultiplier if no other source found
            gameState.targetMultiplier = playData.book.payoutMultiplier / 100; // Convert from percentage to decimal
            gameState.isWinningGame = gameState.doesFall; // Win when Biden falls regardless of multiplier
            
        } else {
            // Default fallback multiplier for testing if not provided by server
            gameState.targetMultiplier = 0.5;
            gameState.isWinningGame = gameState.doesFall; // Only win if Biden falls
        }

        updateBalanceDisplay();

        
        // Start the multiplier animation when Biden is positioned
        if (bidenSprite.state === 'positioned') {
            startMultiplierAnimation();
        } else {
            // If Biden is still entering, we'll start the animation when he reaches position
            // Set up an interval to check Biden's state
            const checkBidenInterval = setInterval(() => {
                if (bidenSprite.state === 'positioned') {
                    startMultiplierAnimation();
                    clearInterval(checkBidenInterval);
                }
            }, 100);
        }
        
        // Reset the flag after successful completion
        gameState.playRequestInProgress = false;

    } catch (error) {
        gameState.playRequestInProgress = false; // Reset flag on error
        // Re-enable button only on error
        updatePlayButtonState();
        updateBetButtonState();
    }
}

// Function to start multiplier animation
function startMultiplierAnimation() {
    gameState.multiplierAnimationStarted = true;
    gameState.multiplierAnimationComplete = false;
    gameState.multiplierAnimationStartTime = Date.now();
    gameState.currentMultiplier = 0;
    
    // Initial update of the display will set the payout to 0
    updateMultiplierDisplay();
}

// Function to reset multiplier state
function resetMultiplierState() {
    // Clear the loss display checker interval to prevent it from running when not needed
    if (lossDisplayCheckerInterval) {
        clearInterval(lossDisplayCheckerInterval);
        lossDisplayCheckerInterval = null;
    }
    
    gameState.targetMultiplier = gameState.currentMultiplier; // Preserve the current multiplier
    // Don't reset currentMultiplier - keep it displayed until the next bet
    gameState.multiplierProgress = 0; // Reset multiplier progress
    gameState.multiplierAnimationStarted = false;
    gameState.multiplierAnimationComplete = false;
    gameState.lastSpeedFactor = 1; // Reset the last speed factor
    gameState.suspenseSpeedFactor = null; // Clear the suspense speed factor
    gameState.isWinningGame = false;
    gameState.doesFall = false;
    gameState.fallTriggered = false;
    gameState.lossConfirmed = false; // Reset loss confirmation
    gameState.suspensePeriodStarted = false;
    gameState.suspensePeriodComplete = false;
    
    // Also reset cart animation state
    if (bidenSprite) {
        bidenSprite.lockFrame = false; // Ensure frames are unlocked for next game
        bidenSprite.currentFrame = 0; // Reset to first frame
    }
    
    // Reset payout to $0.00
    const payoutElement = document.getElementById('payout-value');
    if (payoutElement) {
        const currency = getCurrentCurrency();
        const zeroAmount = formatCurrency(0, currency);
        payoutElement.textContent = zeroAmount;
    }
    
    // Reset Biden sprite state
    if (bidenSprite) {
        bidenSprite.leaveAcceleration = null; // Reset leave acceleration
    }
    
    // Clear the round data to prevent unnecessary end-round requests
    gameState.round = null;
    
    // Reset Biden's timers if they exist
    if (bidenSprite.fallTimer) {
        bidenSprite.fallTimer = 0;
    }
    
    // Only show "Place your bet" message on first load
    // After first bet, we don't show this guidance message anymore
    if (gameState.isFirstBet) {
        updateGameMessage(t('comeAndPlay'));
    } else {
        // Hide message container after first bet
        hideGameMessage();
    }
    
    if (bidenSprite.resetTimer) {
        bidenSprite.resetTimer = 0;
    }
    
    // Keep the speech bubble visible until next bet (don't reset it)
    // No need to call hideSpeechBubble() here
    
    // Update the multiplier display to show current value
    updateMultiplierDisplay();
    
}

// Function to get comprehensive game state for resumption
function getGameStateSnapshot() {
    try {
        return {
            // Biden state
            bidenPosition: {
                x: bidenSprite ? bidenSprite.x : 0,
                y: bidenSprite ? bidenSprite.y : 0,
                state: bidenSprite ? bidenSprite.state : 'entering',
                speed: bidenSprite ? bidenSprite.speed : 0,
                frameIndex: bidenSprite ? bidenSprite.frameIndex : 0,
                frameCounter: bidenSprite ? bidenSprite.frameCounter : 0
            },
            
            // Game progression
            multiplier: {
                current: gameState.currentMultiplier,
                target: gameState.targetMultiplier,
                animationStarted: gameState.multiplierAnimationStarted,
                animationCompleted: gameState.multiplierAnimationComplete,
                animationProgress: gameState.animationProgress || 0
            },
            
            // Game state flags
            gameFlags: {
                gameStarted: typeof gameStarted !== 'undefined' ? gameStarted : false,
                gameOver: gameState.gameOver,
                inSuspense: gameState.inSuspense,
                turboMode: gameState.turboMode,
                bidenFell: gameState.bidenFell,
                roundActive: gameState.round ? true : false
            },
            
            // Timing and speed
            timing: {
                scrollSpeed: typeof scrollSpeed !== 'undefined' ? scrollSpeed : 0,
                initialScrollSpeed: INITIAL_SCROLL_SPEED,
                suspenseStartTime: gameState.suspenseStartTime,
                suspenseDuration: gameState.suspenseDuration,
                effectiveGameSpeed: typeof getEffectiveGameSpeed === 'function' ? getEffectiveGameSpeed() : 1
            },
            
            // Background layers (for visual continuity)
            backgroundState: {
                layerPositions: layers ? layers.map(layer => ({
                    layerNumber: layer.layerNumber,
                    x: layer.x,
                    speed: layer.speed
                })) : [],
                scrollSpeed: typeof scrollSpeed !== 'undefined' ? scrollSpeed : 0
            },
            
            // Betting info
            betInfo: {
                currentBet: gameState.currentBet,
                lastWinAmount: typeof lastWinAmount !== 'undefined' ? lastWinAmount : 0
            },
            
            // Round data if available
            roundData: gameState.round ? {
                id: gameState.round.id,
                amount: gameState.round.amount,
                targetMultiplier: gameState.round.targetMultiplier
            } : null
        };
    } catch (error) {
        // Return a minimal snapshot in case of error
        return {
            error: 'Snapshot creation failed',
            timestamp: Date.now(),
            basic: {
                gameStarted: typeof gameStarted !== 'undefined' ? gameStarted : false,
                turboMode: gameState.turboMode || false,
                currentBet: gameState.currentBet || 0
            }
        };
    }
}

// Function to track game events
async function trackGameEvent(eventType, eventData = {}) {
    if (!gameState.sessionID || !gameState.rgsUrl) {
        return { success: false, error: 'Missing required parameters' };
    }

    try {
        // Simple event string as required by the API
        const eventString = "in_progress";


        const response = await fetch(`https://${gameState.rgsUrl}/bet/event`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                sessionID: gameState.sessionID,
                event: eventString
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            return { success: false, error: errorText };
        }

        const responseData = await response.json();
        return { success: true, data: responseData };

    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Function to resume game from checkpoint data
function resumeGameFromCheckpoint(checkpoint) {
    if (!checkpoint) {
        return false;
    }

    try {

        // Restore Biden state
        if (checkpoint.bidenPosition && bidenSprite) {
            bidenSprite.x = checkpoint.bidenPosition.x;
            bidenSprite.y = checkpoint.bidenPosition.y;
            bidenSprite.state = checkpoint.bidenPosition.state;
            bidenSprite.speed = checkpoint.bidenPosition.speed;
            bidenSprite.frameIndex = checkpoint.bidenPosition.frameIndex;
            bidenSprite.frameCounter = checkpoint.bidenPosition.frameCounter;
        }

        // Restore multiplier state
        if (checkpoint.multiplier) {
            gameState.currentMultiplier = checkpoint.multiplier.current;
            gameState.targetMultiplier = checkpoint.multiplier.target;
            gameState.multiplierAnimationStarted = checkpoint.multiplier.animationStarted;
            gameState.multiplierAnimationComplete = checkpoint.multiplier.animationCompleted;
            gameState.animationProgress = checkpoint.multiplier.animationProgress;
        }

        // Restore game flags
        if (checkpoint.gameFlags) {
            gameStarted = checkpoint.gameFlags.gameStarted;
            gameState.gameOver = checkpoint.gameFlags.gameOver;
            gameState.inSuspense = checkpoint.gameFlags.inSuspense;
            gameState.turboMode = checkpoint.gameFlags.turboMode;
            gameState.bidenFell = checkpoint.gameFlags.bidenFell;
        }

        // Restore timing and speed
        if (checkpoint.timing) {
            scrollSpeed = checkpoint.timing.scrollSpeed;
            gameState.suspenseStartTime = checkpoint.timing.suspenseStartTime;
            gameState.suspenseDuration = checkpoint.timing.suspenseDuration;
        }

        // Restore background state
        if (checkpoint.backgroundState && checkpoint.backgroundState.layerPositions) {
            // Restore layer positions if layers are initialized
            if (layers && layers.length > 0) {
                checkpoint.backgroundState.layerPositions.forEach(savedLayer => {
                    const layer = layers.find(l => l.layerNumber === savedLayer.layerNumber);
                    if (layer) {
                        layer.x = savedLayer.x;
                    }
                });
            }
            
            // Restore scroll speed
            if (checkpoint.backgroundState.scrollSpeed !== undefined) {
                scrollSpeed = checkpoint.backgroundState.scrollSpeed;
            }
        }

        // Restore betting info
        if (checkpoint.betInfo) {
            gameState.currentBet = checkpoint.betInfo.currentBet;
            lastWinAmount = checkpoint.betInfo.lastWinAmount;
        }

        // Restore round data
        if (checkpoint.roundData) {
            gameState.round = {
                id: checkpoint.roundData.id,
                amount: checkpoint.roundData.amount,
                targetMultiplier: checkpoint.roundData.targetMultiplier
            };
        }

        return true;

    } catch (error) {
        return false;
    }
}

// Function to resume an active round
async function resumeActiveRound(roundData) {
    if (!roundData || !roundData.active) {
        return { success: false, error: 'Round is not active' };
    }


    try {
        // Don't start the game immediately - let intro screens complete first
        // Instead, mark that we need to resume an active round after intro
        gameState.pendingActiveRound = roundData;
        
        // If game is already started (unlikely during initial load), handle resumption
        if (gameStarted) {
            // Game is already started, but we need to ensure music is playing for resumed rounds
            playGameMusic();
            
            // Proceed with immediate resumption
            return await performActiveRoundResumption(roundData);
        }
        
        // For initial load with active round, we'll let intro screens complete
        // and handle resumption in startGame() when intro is done
        return { success: true, message: 'Active round will be resumed after intro screens' };

    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Function to actually perform the active round resumption (extracted from original logic)
async function performActiveRoundResumption(roundData) {
    try {
        // Set up game state for resumption
        gameState.currentBet = roundData.amount;
        gameState.round = roundData;
        
        // Extract the fall state and multiplier from round data
        if (roundData.event && roundData.event.doesFall !== undefined) {
            gameState.doesFall = roundData.event.doesFall;
        } else if (roundData.state && roundData.state.length > 0 && roundData.state[0].doesFall !== undefined) {
            gameState.doesFall = roundData.state[0].doesFall;
        }

        // Extract target multiplier for resumption
        if (roundData.payoutMultiplier !== undefined) {
            gameState.targetMultiplier = roundData.payoutMultiplier;
            gameState.isWinningGame = gameState.doesFall; // Win when Biden falls
        }

        // Update current bet in the UI
        updateBetInput();
        updateBalanceDisplay();

        // Set game state for active round
        gameState.multiplierAnimationStarted = false;
        gameState.multiplierAnimationComplete = false;
        gameState.suspensePeriodStarted = false;
        gameState.suspensePeriodComplete = false;
        gameState.fallTriggered = false;
        gameState.currentMultiplier = 0;

        // Initialize multiplier display
        updateMultiplierDisplay();

        // Position Biden and start the game animation
        if (bidenSprite.state === 'offscreen') {
            bidenSprite.state = 'entering';
        }

        // Update the UI to show the round is in progress
        updateGameMessage(t('resumingGame'), false, false);
        
        // Disable play and bonus buy buttons during active round
        const playButton = document.getElementById('play-button');
        const bonusBuyButton = document.getElementById('bonus-buy-button');
        
        if (playButton) {
            playButton.disabled = true;
        }
        if (bonusBuyButton) {
            bonusBuyButton.disabled = true;
        }

        // Start the multiplier animation when Biden reaches position
        const waitForBidenPosition = setInterval(() => {
            if (bidenSprite.state === 'positioned') {
                startMultiplierAnimation();
                updateGameMessage(t('welcomeBack'), false, false);
                clearInterval(waitForBidenPosition);
            }
        }, 100);

        return { success: true, message: 'Round resumed successfully' };

    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Function to end the current round
async function endCurrentRound() {
    if (!gameState.sessionID || !gameState.rgsUrl) {
        return { success: false, error: 'Missing required parameters' };
    }

    // Only end the round if there's an active round
    if (!gameState.round) {
        return { success: true, message: 'No active round' };
    }

    // Only make the API call if the player is winning (Biden falls)
    // If Biden doesn't fall (player loses), the round is already complete on server
    if (!gameState.doesFall) {
        // Clear the round data since the round is complete
        gameState.round = null;
        return { success: true, message: 'Round complete (loss)' };
    }

    try {

        const response = await fetch(`https://${gameState.rgsUrl}/wallet/end-round`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                sessionID: gameState.sessionID,
                gameID: gameState.gameID, 
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            return { success: false, error: errorText };
        }

        const endRoundData = await response.json();
        
        // Update balance from response
        if (endRoundData.balance && endRoundData.balance.amount !== undefined) {
            gameState.balance = endRoundData.balance.amount;
            updateBalanceDisplay();
        }
        
        // Clear the round data
        gameState.round = null;
        
        return { success: true, data: endRoundData };

    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Game message functions
function updateGameMessage(message, isWin = false, isLoss = false) {
    const messageContainer = document.getElementById('game-message-container');
    const messageElement = document.getElementById('game-message');
    if (!messageElement || !messageContainer) return;
    
    // Clear any existing win message timeout
    if (window.winMessageTimeout) {
        clearTimeout(window.winMessageTimeout);
        window.winMessageTimeout = null;
    }
    
    // Make container visible
    messageContainer.style.display = 'flex';
    
    // Clear any existing classes
    messageElement.className = '';
    
    // Add win class if this is a win message
    if (isWin) {
        messageElement.classList.add('win-message');
        // Keep win message visible longer (8 seconds)
        window.winMessageTimeout = setTimeout(() => {
            // Only clear if it's still showing the win message
            if (messageElement.classList.contains('win-message')) {
                // Only show "Place your bet" on first launch, otherwise hide the message
                if (gameState.isFirstBet) {
                    updateGameMessage(t('comeAndPlay'));
                } else {
                    hideGameMessage();
                }
            }
        }, 8000);
    }
    
    // Add loss class if this is a loss message
    if (isLoss) {
        messageElement.classList.add('loss-message');
        // Add CSS for loss message if it doesn't exist
        if (!document.getElementById('loss-message-style')) {
            const style = document.createElement('style');
            style.id = 'loss-message-style';
            style.textContent = `
                .loss-message {
                    color: #ff8e8e !important;
                    text-shadow: 0 0 10px rgba(255, 0, 0, 0.5) !important;
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    // Set the message text
    messageElement.textContent = message;
    
    // Apply a small animation effect
    messageElement.style.transform = 'scale(1.1)';
    setTimeout(() => {
        messageElement.style.transform = 'scale(1)';
    }, 200);
}

// Function to hide game message
function hideGameMessage() {
    const messageContainer = document.getElementById('game-message-container');
    if (messageContainer) {
        messageContainer.style.display = 'none';
    }
}

// Make sure all UI elements are set up correctly
window.addEventListener('DOMContentLoaded', () => {
    // Set up volume controls
    setupVolumeControl();
    
    // Only show "Place your bet" on the very first launch
    updateGameMessage(t('comeAndPlay'));
    
    // Set isFirstBet flag to true on initial load
    gameState.isFirstBet = true;
    
});

// Volume control setup
function setupVolumeControl() {
    const volumeBtn = document.getElementById('volume-btn');
    
    if (!volumeBtn) {
        return;
    }
    
    // Load saved mute state or use default (not muted)
    const savedMuteState = localStorage.getItem('bidenGameMuted');
    // Default to unmuted if no saved state exists
    const isMuted = savedMuteState === 'true';
    
    // Ensure we always start unmuted if no saved preference exists
    if (savedMuteState === null) {
        // First time - set default to unmuted
        localStorage.setItem('bidenGameMuted', 'false');
    }
    
    // Set initial volume based on mute state
    const volume = isMuted ? 0 : 0.3; // Default to 30% when not muted
    applyVolumeToAllAudio(volume);
    
    // Clean up any existing event listeners to prevent duplicates
    const oldToggleFunction = volumeBtn._toggleFunction;
    if (oldToggleFunction) {
        volumeBtn.removeEventListener('click', oldToggleFunction);
    }
    
    // Function to toggle mute/unmute
    function toggleMute(e) {
        e.stopPropagation();
        
        // Get current mute state
        const currentlyMuted = localStorage.getItem('bidenGameMuted') === 'true';
        const newMuteState = !currentlyMuted;
        
        // Update volume based on new mute state
        const newVolume = newMuteState ? 0 : 0.3; // 30% when unmuted
        applyVolumeToAllAudio(newVolume);
        
        // Save mute state
        localStorage.setItem('bidenGameMuted', newMuteState.toString());
        
        // Update icon
        updateVolumeIcon(newVolume);
        
        // Play a sound to demonstrate the new volume level (only if unmuting)
        if (!newMuteState) {
            const changeBetSound = document.getElementById('changebet-sound');
            if (changeBetSound) {
                changeBetSound.play().catch(e => {});
            }
        }
    }
    
    // Store the function reference for future cleanup
    volumeBtn._toggleFunction = toggleMute;
    
    // Toggle mute when volume button is clicked
    volumeBtn.addEventListener('click', toggleMute);
    
    // Initialize volume icon
    updateVolumeIcon(volume);
}

// Apply volume to all audio elements
function applyVolumeToAllAudio(volume) {
    const audioElements = document.querySelectorAll('audio');
    audioElements.forEach(audio => {
        audio.volume = volume;
    });
    
    // Make volume globally accessible
    window.soundVolume = volume;
    window.soundOn = volume > 0;
}

// Update volume icon based on volume level
function updateVolumeIcon(volume) {
    const volumeBtn = document.getElementById('volume-btn');
    if (!volumeBtn) return;
    
    const volumeIcon = volumeBtn.querySelector('svg');
    if (!volumeIcon) return;
    
    // Clear existing icon paths
    while (volumeIcon.firstChild) {
        volumeIcon.removeChild(volumeIcon.firstChild);
    }
    
    // Create SVG path element
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    
    if (volume === 0) {
        // Muted icon
        path.setAttribute('d', 'M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z');
    } else if (volume < 0.5) {
        // Low volume icon
        path.setAttribute('d', 'M3 10v4h4l5 5V5L7 10H3z');
    } else {
        // High volume icon
        path.setAttribute('d', 'M3 10v4h4l5 5V5L7 10H3zm13.5 2c0-1.77-1.02-3.29-2.5-4.03v8.06c1.48-.74 2.5-2.26 2.5-4.03zM14 4.45v.2c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v.2c3.89-.9 6.84-4.27 6.84-8.57 0-4.3-2.95-7.67-6.84-8.57z');
    }
    
    volumeIcon.appendChild(path);
}

// Function to show authentication error to user
function showAuthenticationError(error) {
    
    // Hide intro overlay and show error message
    const introOverlay = document.getElementById('intro-overlay');
    if (introOverlay) {
        introOverlay.style.display = 'none';
    }
    
    // Show error screen
    const gameScreen = document.getElementById('game-screen');
    if (gameScreen) {
        gameScreen.style.display = 'flex';
        gameScreen.style.opacity = '1';
        
        // Update game message to show error
        updateGameMessage('Authentication failed. Please reload the page.', false, true);
    }
}
