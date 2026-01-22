const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('high-score');
const lengthElement = document.getElementById('length');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const restartBtn = document.getElementById('restartBtn');
const gameOverlay = document.getElementById('gameOverlay');

// Настройки игры
const gridSize = 20;
const tileCount = canvas.width / gridSize;

let snake = [{ x: 10, y: 10 }];
let direction = { x: 0, y: 0 };
let food = {};
let score = 0;
let highScore = localStorage.getItem('snakeHighScore') || 0;
let gameRunning = false;
let gameLoop;

// Инициализация
highScoreElement.textContent = highScore;
generateFood();
drawGame();

// Генерация еды
function generateFood() {
    food = {
        x: Math.floor(Math.random() * tileCount),
        y: Math.floor(Math.random() * tileCount)
    };
    
    // Проверка, чтобы еда не появилась на змейке
    for (let segment of snake) {
        if (segment.x === food.x && segment.y === food.y) {
            generateFood();
            return;
        }
    }
}

// Отрисовка игры
function drawGame() {
    // Очистка поля
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Рисуем сетку
    ctx.strokeStyle = '#eee';
    ctx.lineWidth = 0.5;
    
    // Вертикальные линии
    for (let x = 0; x <= canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    
    // Горизонтальные линии
    for (let y = 0; y <= canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
    
    // Рисуем змейку (зелёную)
    snake.forEach((segment, index) => {
        if (index === 0) {
            // Голова змейки - тёмно-зелёная
            ctx.fillStyle = '#006400';
        } else {
            // Тело змейки - зелёное
            ctx.fillStyle = '#00a000';
        }
        
        const x = segment.x * gridSize;
        const y = segment.y * gridSize;
        ctx.fillRect(x + 1, y + 1, gridSize - 2, gridSize - 2);
        
        // Чёрная рамка для змейки
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 1, y + 1, gridSize - 2, gridSize - 2);
    });
    
    // Рисуем еду (красную)
    ctx.fillStyle = '#ff0000';
    const foodX = food.x * gridSize;
    const foodY = food.y * gridSize;
    ctx.fillRect(foodX + 2, foodY + 2, gridSize - 4, gridSize - 4);
    
    // Чёрная рамка для еды
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.strokeRect(foodX + 2, foodY + 2, gridSize - 4, gridSize - 4);
}

// Обновление игры
function updateGame() {
    if (!gameRunning) return;
    
    // Двигаем змейку
    const head = { ...snake[0] };
    head.x += direction.x;
    head.y += direction.y;
    
    // Проверка на столкновение со стенами
    if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount) {
        gameOver();
        return;
    }
    
    // Проверка на столкновение с собой
    for (let segment of snake) {
        if (head.x === segment.x && head.y === segment.y) {
            gameOver();
            return;
        }
    }
    
    snake.unshift(head);
    
    // Проверка, съела ли змейка еду
    if (head.x === food.x && head.y === food.y) {
        score += 10;
        scoreElement.textContent = score;
        lengthElement.textContent = snake.length;
        generateFood();
    } else {
        snake.pop();
    }
    
    drawGame();
}

// Начать игру
function startGame() {
    if (gameRunning) return;
    
    gameRunning = true;
    gameOverlay.style.display = 'none';
    
    if (direction.x === 0 && direction.y === 0) {
        direction = { x: 1, y: 0 };
    }
    
    clearInterval(gameLoop);
    gameLoop = setInterval(updateGame, 150);
}

// Пауза
function pauseGame() {
    gameRunning = !gameRunning;
    
    if (gameRunning) {
        gameLoop = setInterval(updateGame, 150);
    } else {
        clearInterval(gameLoop);
    }
}

// Перезапуск
function restartGame() {
    clearInterval(gameLoop);
    snake = [{ x: 10, y: 10 }];
    direction = { x: 0, y: 0 };
    score = 0;
    scoreElement.textContent = score;
    lengthElement.textContent = 1;
    gameRunning = false;
    gameOverlay.style.display = 'flex';
    generateFood();
    drawGame();
}

// Конец игры
function gameOver() {
    gameRunning = false;
    clearInterval(gameLoop);
    
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('snakeHighScore', highScore);
        highScoreElement.textContent = highScore;
    }
    
    gameOverlay.innerHTML = `
        <h2>Игра окончена</h2>
        <p>Счёт: ${score}</p>
        <p>Нажмите "Сброс" чтобы начать заново</p>
    `;
    gameOverlay.style.display = 'flex';
}

// Управление с клавиатуры
document.addEventListener('keydown', (e) => {
    switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
            if (direction.y === 0) direction = { x: 0, y: -1 };
            break;
        case 'ArrowDown':
        case 's':
        case 'S':
            if (direction.y === 0) direction = { x: 0, y: 1 };
            break;
        case 'ArrowLeft':   
        case 'a':
        case 'A':
            if (direction.x === 0) direction = { x: -1, y: 0 };
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            if (direction.x === 0) direction = { x: 1, y: 0 };
            break;
        case ' ':
            if (gameRunning) pauseGame();
            break;
        case 'Escape':
            restartGame();
            break;
    }
});

// События кнопок
startBtn.addEventListener('click', startGame);
pauseBtn.addEventListener('click', pauseGame);
restartBtn.addEventListener('click', restartGame);