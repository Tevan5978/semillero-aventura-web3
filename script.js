//Elementos dinamicos HTML
const board = document.getElementById("board");
const scoreBoard = document.getElementById("scoreBoard");
const startButton = document.getElementById("start");
const gameOverSign = document.getElementById("gameOver");

//Nuevos Elementos
const bestBoard = document.getElementById("bestBoard");
const lengthBoard = document.getElementById("lengthBoard");
const levelBoard = document.getElementById('levelBoard');
const speedBoard = document.getElementById('speedBoard');
const timeBoard = document.getElementById('timeBoard');
const pauseButton = document.getElementById('pause');
const restartButton = document.getElementById('restart');
const finalScore = document.getElementById('finalScore');
const finalBest = document.getElementById('finalBest');
const sizeSelect = document.getElementById('sizeSelect');
const speedSelect = document.getElementById('speedSelect');
const modeSelect = document.getElementById('modeSelect');
const skinSelect = document.getElementById('skinSelect');
const volumeSlider = document.getElementById('volumeSlider');

//Configuraciones del juego
let boardSize = 10;
let gameSpeed = 100;
let gameMode = "walls"; //Puede ser wrap
let skin = "classic";//"" ''
let masterVolume = 0.4;
const squareTypes = {
    emptySquare: 0,
    snakeSquare: 1,
    foodSquare: 2
};

//Direcciones 
const directions = {
    ArrowUp: (size)=>-size,
    ArrowDown: (size)=>size,
    ArrowRight: ()=>1,
    ArrowLeft: ()=>2,
}

//Variables del juego
let snake;
let score;
let direction;
let boardSquares;
let emptySquares;
let moveInterval;
let paused = false;
let startTimestamp;
let elapsedMs = 0;
let timerInterval;
let level = 1;
let bestScore = Number(localStorage.getItem('snake_best_score')|| 0);

//Audio
let audioCtx;
const playBeep = (freq = 600, duration = 100, type = "sine", gainValue = 0.03)=>{
    try {
        audioCtx = audioCtx || new (window.AudioContext || window.webKitAudioContext)();
        const o = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        o.type = type;
        o.frequency.value = freq;
        g.gain.value = gainValue * masterVolume;
        o.connect(g);
        g.connect(audioCtx.destination);
        o.start();
        setTimeout(()=>{
            o.stop(); o.disconnect(); g.disconnect();
        }, duration)
    } catch (error) {
        console.log("Ocurrió un error" + error);
    }
}

const playEat = () =>{ playBeep(740, 80, 'square', 0.2)}
const playGameOver = () =>{
    playBeep(200,180, 'sawtooth', 0.25);
    setTimeout(()=> playBeep(160, 220, 'sawtooth', 0.25), 100)
}

const playPause = () =>{playBeep(500,80, 'triangle', 0.15)}
const playResume = () =>{playBeep(720,80, 'triangle', 0.15)}

//Dibuajr el cuerpo de la serpiente
const drawSnake = () =>{
    snake.forEach( square => drawSquare(square, 'snakeSquare'))
    updateLength()
}

//Dibuajr los cuadrados
const drawSquare = (square, type) => {
    const row = Math.floor(square / boardSize)
    const column = square % boardSize
    boardSquares[row][column] = squareTypes[type]
    const squareElement = document.getElementById(String(square).padStart(2, '0'))
    squareElement.setAttribute('class', `square ${type}`)
}

//Prsonalizar el skin
const setSkin = (name) => {
    skin = name
    let color
    switch (name) {
        case 'neon': color = getComputedStyle(
            document.documentElement
        ).getPropertyValue('--snake-color-neon').trim()
            break;
        case 'retro': color = getComputedStyle(
            document.documentElement
        ).getPropertyValue('--snake-color-retro').trim()
            break;
        case 'matrix': color = getComputedStyle(
            document.documentElement
        ).getPropertyValue('--snake-color-matrix').trim()
            break;
        default: color = getComputedStyle(
            document.documentElement
        ).getPropertyValue('--snake-color-classic').trim()
            break;
    }
    document.documentElement.style.setProperty('--grid-snake', color)
}

//Mover la serpiente
const moveSnake = () =>{
    if(paused) return
    const head = snake[snake.length -1]//en prom las listas y arrays comienzan con 0
    const delta = directions[direction](boardSize)
    let newSquare = head + delta
    let newRow = Math.floor(newSquare / boardSize)
    let newCol = newSquare % boardSize
    const oldCol = head % boardSize

    if (gameMode === 'wrap') {
		if (direction === 'ArrowRight' && newCol === 0 && oldCol === boardSize - 1) {
			newSquare = head - (boardSize - 1)
		} else if (direction === 'ArrowLeft' && newCol === boardSize - 1 && oldCol === 0) {
			newSquare = head + (boardSize - 1)
		} else if (newSquare < 0) {
			newSquare = boardSize * boardSize + newSquare
		} else if (newSquare >= boardSize * boardSize) {
			newSquare = newSquare - boardSize * boardSize
		}
		newRow = Math.floor(newSquare / boardSize)
		newCol = newSquare % boardSize
	}

    const outOfBounds = newSquare < 0 || newSquare >= boardSize * boardSize
	const crossingRight = direction === 'ArrowRight' && newCol === 0 && oldCol === boardSize - 1
	const crossingLeft = direction === 'ArrowLeft' && newCol === boardSize - 1 && oldCol === 0

    if( (gameMode === 'walls' && (outOfBounds || crossingRight || crossingLeft)) ||
		boardSquares[newRow]?.[newCol] === squareTypes.snakeSquare) {
		gameOver()
	} else {
		snake.push(newSquare);
		if(boardSquares[newRow][newCol] === squareTypes.foodSquare) {
			addFood()
			playEat()
		} else {
			const emptySquare = snake.shift()
			drawSquare(emptySquare, 'emptySquare')
		}
		drawSnake()
	}

}

//Funcion para agregar puntos tras comer
const addFood = () => {
	score++;
	updateScore();
	levelUpIfNeeded();
	createRandomFood();
}

//Función para juego perdido
const gameOver = () => {
	gameOverSign.style.display = 'flex';
	clearInterval(moveInterval)
	clearInterval(timerInterval)
	startButton.disabled = false;
	pauseButton && (pauseButton.disabled = true);
	updateBest();
	finalScore && (finalScore.innerText = score);
	finalBest && (finalBest.innerText = bestScore);
	playGameOver();
}

//Establecer las direcciones
const setDirection = newDirection => {
	direction = newDirection;
}

//Casos para las direcciones de la serpiente
const directionEvent = key => {
	switch (key.code) {
		case 'ArrowUp':
			direction != 'ArrowDown' && setDirection(key.code)
			break;
		case 'ArrowDown':
			direction != 'ArrowUp' && setDirection(key.code)
			break;
		case 'ArrowLeft':
			direction != 'ArrowRight' && setDirection(key.code)
			break;
		case 'ArrowRight':
			direction != 'ArrowLeft' && setDirection(key.code)
			break;
		case 'Space':
			key.preventDefault();
			togglePause();
			break;
		case 'KeyR':
			restartGame();
			break;
		case 'Enter':
			if (startButton && !startButton.disabled) startGame();
			break;
	}
}

//Crear comida de forma aleatoria(manzanas)
const createRandomFood = () => {
	const randomEmptySquare = emptySquares[Math.floor(Math.random() * emptySquares.length)];
	drawSquare(randomEmptySquare, 'foodSquare');
	// mantener emptySquares sin el food
	const idx = emptySquares.indexOf(randomEmptySquare);
	if (idx !== -1) emptySquares.splice(idx, 1);
}

//Actualizar el marcador del puntaje
const updateScore = () => {
	scoreBoard.innerText = score;
}

const updateLength = () => {
	if (lengthBoard) lengthBoard.innerText = snake.length;
}

const updateBest = () => {
	if (score > bestScore) {
		bestScore = score;
		localStorage.setItem('snake_best_score', String(bestScore));
	}
	if (bestBoard) bestBoard.innerText = bestScore;
}

const updateLevelAndSpeed = () => {
	if (levelBoard) levelBoard.innerText = level;
	if (speedBoard) speedBoard.innerText = `${gameSpeed}ms`;
}

const levelUpIfNeeded = () => {
	// Sube de nivel cada 5 puntos y aumenta la velocidad hasta un mínimo
	const newLevel = Math.floor((score - 1) / 5) + 1;
	if (newLevel !== level) {
		level = newLevel;
		const newSpeed = Math.max(40, Number(speedSelect?.value || 100) - (level - 1) * 10);
		if (newSpeed !== gameSpeed) {
			gameSpeed = newSpeed;
			restartInterval();
			updateLevelAndSpeed();
		}
	}
}

const restartInterval = () => {
	clearInterval(moveInterval);
	moveInterval = setInterval(() => moveSnake(), gameSpeed);
}

const formatTime = (ms) => {
	const totalSeconds = Math.floor(ms / 1000);
	const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
	const seconds = String(totalSeconds % 60).padStart(2, '0');
	return `${minutes}:${seconds}`;
}

const startTimer = () => {
	startTimestamp = Date.now() - elapsedMs;
	clearInterval(timerInterval);
	timerInterval = setInterval(() => {
		elapsedMs = Date.now() - startTimestamp;
		if (timeBoard) timeBoard.innerText = formatTime(elapsedMs);
	}, 250);
}

const stopTimer = () => {
	clearInterval(timerInterval);
}

const togglePause = () => {
	if (gameOverSign.style.display === 'flex') return;
	paused = !paused;
	if (paused) {
		stopTimer();
		pauseButton && (pauseButton.textContent = 'Resume ▶️');
		playPause();
	} else {
		startTimer();
		pauseButton && (pauseButton.textContent = 'Pause ⏸️');
		playResume();
	}
}

//Función para pintar el tablero
const createBoard = () => {
	boardSquares.forEach( (row, rowIndex) => {
		row.forEach( (column, columnindex) => {
			const squareValue = rowIndex * boardSize + columnindex;
			const squareElement = document.createElement('div');
			squareElement.setAttribute('class', 'square emptySquare');
			squareElement.setAttribute('id', String(squareValue).padStart(2, '0'));
			board.appendChild(squareElement);
			emptySquares.push(squareValue);
		})
	})
}

//Condiciones del juego
const setGame = () => {
	// lee selects
	boardSize = Number(sizeSelect?.value || 10);
	gameSpeed = Number(speedSelect?.value || 100);
	gameMode = modeSelect?.value || 'walls';
	setSkin(skinSelect?.value || 'classic');
	masterVolume = (Number(volumeSlider?.value || 40) / 100);
	// aplica columnas dinámicas
	board.style.gridTemplateColumns = `repeat(${boardSize}, 1fr)`;

	// serpiente inicial horizontal en la fila 0
	snake = [0, 1, 2, 3];
	score = snake.length;
	direction = 'ArrowRight';
	boardSquares = Array.from(Array(boardSize), () => new Array(boardSize).fill(squareTypes.emptySquare));
	board.innerHTML = '';
	emptySquares = [];
	createBoard();
	level = 1;
	elapsedMs = 0;
	updateBest();
	updateScore();
	updateLength();
	updateLevelAndSpeed();
	if (timeBoard) timeBoard.innerText = '00:00';
}

//Iniciar el juego
const startGame = () => {
	setGame();
	gameOverSign.style.display = 'none';
	startButton.disabled = true;
	pauseButton && (pauseButton.disabled = false);
	snake.forEach(sq => drawSquare(sq, 'snakeSquare'));
	createRandomFood();
	document.addEventListener('keydown', directionEvent);
	restartInterval();
	paused = false;
	pauseButton && (pauseButton.textContent = 'Pause ⏸️');
	startTimer();
}

const restartGame = () => {
	if (startButton.disabled) {
		paused = true;
		stopTimer();
	}
	startGame();
}

//boton para iniciar el juego
startButton.addEventListener('click', startGame);

// nuevos eventos
if (pauseButton) pauseButton.addEventListener('click', togglePause);
if (restartButton) restartButton.addEventListener('click', () => restartGame());

if (sizeSelect) sizeSelect.addEventListener('change', () => {
	if (!startButton.disabled) {
		const size = Number(sizeSelect.value);
		board.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
	}
});

if (skinSelect) skinSelect.addEventListener('change', () => {
	setSkin(skinSelect.value);
});

if (volumeSlider) volumeSlider.addEventListener('input', () => {
	masterVolume = Number(volumeSlider.value) / 100;
});


