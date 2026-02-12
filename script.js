(function () {
    "use strict";

    // ============================================
    // CONSTANTS – grid & appearance
    // ============================================
    const GRID_WIDTH = 40;          // 800/20
    const GRID_HEIGHT = 30;         // 600/20
    const CELL_SIZE = 20;           // pixel per cell
    const INITIAL_SPEED = 10;       // moves per second (interval)
    const MAX_SPEED = 20;           // max moves per second
    const MAX_ATTEMPTS = 1000;      // food respawn attempts

    // ============================================
    // COLORS – same vibe as pygame version
    // ============================================
    const Colors = {
        WHITE: '#d1d1d1',
        BLACK: '#141414',
        RED: '#ff3232',
        GREEN: '#96c83c',
        DARK_GREEN: '#649628',
        BLUE: '#6496ff',
        GRAY: '#646464',
        YELLOW: '#ffd700',
        GRID_LINE: '#1e1e1e'
    };

    // ============================================
    // DIRECTION – using strings + vector map
    // ============================================
    const Direction = {
        UP: 'UP',
        DOWN: 'DOWN',
        LEFT: 'LEFT',
        RIGHT: 'RIGHT'
    };

    const DirectionVector = {
        [Direction.UP]: { x: 0, y: -1 },
        [Direction.DOWN]: { x: 0, y: 1 },
        [Direction.LEFT]: { x: -1, y: 0 },
        [Direction.RIGHT]: { x: 1, y: 0 }
    };

    const OppositeDirection = {
        [Direction.UP]: Direction.DOWN,
        [Direction.DOWN]: Direction.UP,
        [Direction.LEFT]: Direction.RIGHT,
        [Direction.RIGHT]: Direction.LEFT
    };

    // ============================================
    // POSITION class – grid cell
    // ============================================
    class Position {
        constructor(x, y) {
            this.x = x;
            this.y = y;
        }

        // compare two positions
        equals(other) {
            return this.x === other.x && this.y === other.y;
        }

        // convert to pixel coordinates
        toPixel() {
            return [this.x * CELL_SIZE, this.y * CELL_SIZE];
        }

        // return new position moved in direction (string)
        move(direction) {
            const vec = DirectionVector[direction];
            return new Position(this.x + vec.x, this.y + vec.y);
        }
    }

    // ============================================
    // FOOD class
    // ============================================
    class Food {
        constructor() {
            this.position = null;
            this._generatePosition();
        }

        _generatePosition() {
            this.position = new Position(
                Math.floor(Math.random() * GRID_WIDTH),
                Math.floor(Math.random() * GRID_HEIGHT)
            );
        }

        // respawn avoiding snake body
        respawn(snakeBody) {
            let attempts = 0;
            while (attempts < MAX_ATTEMPTS) {
                this._generatePosition();
                if (!snakeBody.some(segment => segment.equals(this.position))) {
                    break;
                }
                attempts++;
            }
            // if grid almost full – fallback (0,0) – snake will eat immediately
            if (attempts === MAX_ATTEMPTS) {
                this.position = new Position(0, 0);
            }
        }

        draw(ctx) {
            const [x, y] = this.position.toPixel();
            ctx.fillStyle = Colors.RED;
            ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
            // subtle inner glow
            ctx.fillStyle = '#ff8888';
            ctx.fillRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
        }
    }

    // ============================================
    // SNAKE class
    // ============================================
    class Snake {
        constructor() {
            this.body = [];
            this.direction = Direction.RIGHT;
            this.nextDirection = Direction.RIGHT;
            this.growPending = 0;
        }

        // reset to starting position (like pygame version)
        reset() {
            const startX = Math.floor(GRID_WIDTH / 4);
            const startY = Math.floor(GRID_HEIGHT / 2);
            this.body = [
                new Position(startX, startY),
                new Position(startX - 1, startY),
                new Position(startX - 2, startY)
            ];
            this.direction = Direction.RIGHT;
            this.nextDirection = Direction.RIGHT;
            this.growPending = 0;
        }

        get head() {
            return this.body[0];
        }

        changeDirection(newDir) {
            // prevent 180° turn
            if (newDir !== OppositeDirection[this.direction]) {
                this.nextDirection = newDir;
            }
        }

        // move snake one step
        update() {
            this.direction = this.nextDirection;
            const newHead = this.head.move(this.direction);
            this.body.unshift(newHead);

            if (this.growPending > 0) {
                this.growPending--;
            } else {
                this.body.pop();
            }
        }

        grow(amount = 1) {
            this.growPending += amount;
        }

        checkCollision() {
            // wall collision
            if (this.head.x < 0 || this.head.x >= GRID_WIDTH ||
                this.head.y < 0 || this.head.y >= GRID_HEIGHT) {
                return true;
            }
            // self collision (head collides with body)
            return this.body.slice(1).some(segment => segment.equals(this.head));
        }

        draw(ctx) {
            for (let i = 0; i < this.body.length; i++) {
                const pos = this.body[i];
                const [x, y] = pos.toPixel();

                // head bright, body gradually darker
                let fillColor;
                if (i === 0) {
                    fillColor = Colors.GREEN;
                } else {
                    const factor = 1 - (i / this.body.length) * 0.3;
                    // parse hex or use rgb – we use rgb for factor
                    // Colors.GREEN = 'rgb(150,200,60)' approximate
                    const base = [150, 200, 60];
                    const darkened = base.map(c => Math.floor(c * factor));
                    fillColor = `rgb(${darkened[0]}, ${darkened[1]}, ${darkened[2]})`;
                }

                // draw segment
                ctx.fillStyle = fillColor;
                ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
                // dark border
                ctx.strokeStyle = Colors.DARK_GREEN;
                ctx.lineWidth = 1;
                ctx.strokeRect(x + 0.5, y + 0.5, CELL_SIZE - 1, CELL_SIZE - 1);

                // 👀 EYES on head (only if head)
                if (i === 0) {
                    ctx.fillStyle = Colors.BLACK;
                    const eyeOffset = 5;
                    const eyeSize = 3;
                    if (this.direction === Direction.RIGHT) {
                        ctx.beginPath();
                        ctx.arc(x + CELL_SIZE - eyeOffset, y + eyeOffset, eyeSize, 0, 2 * Math.PI);
                        ctx.arc(x + CELL_SIZE - eyeOffset, y + CELL_SIZE - eyeOffset, eyeSize, 0, 2 * Math.PI);
                        ctx.fill();
                    } else if (this.direction === Direction.LEFT) {
                        ctx.beginPath();
                        ctx.arc(x + eyeOffset, y + eyeOffset, eyeSize, 0, 2 * Math.PI);
                        ctx.arc(x + eyeOffset, y + CELL_SIZE - eyeOffset, eyeSize, 0, 2 * Math.PI);
                        ctx.fill();
                    } else if (this.direction === Direction.UP) {
                        ctx.beginPath();
                        ctx.arc(x + eyeOffset, y + eyeOffset, eyeSize, 0, 2 * Math.PI);
                        ctx.arc(x + CELL_SIZE - eyeOffset, y + eyeOffset, eyeSize, 0, 2 * Math.PI);
                        ctx.fill();
                    } else { // DOWN
                        ctx.beginPath();
                        ctx.arc(x + eyeOffset, y + CELL_SIZE - eyeOffset, eyeSize, 0, 2 * Math.PI);
                        ctx.arc(x + CELL_SIZE - eyeOffset, y + CELL_SIZE - eyeOffset, eyeSize, 0, 2 * Math.PI);
                        ctx.fill();
                    }
                }
            }
        }
    }

    // ============================================
    // GAME class – orchestrator
    // ============================================
    class Game {
        constructor(canvasId) {
            this.canvas = document.getElementById(canvasId);
            this.ctx = this.canvas.getContext('2d');

            // game objects
            this.snake = new Snake();
            this.food = new Food();

            // state flags
            this.ready = true;          // start screen
            this.gameOver = false;
            this.paused = false;
            this.firstLaunch = true;    // for ready screen persistence

            // scores
            this.score = 0;
            this.highScore = 0;

            // speed & interval
            this.speed = INITIAL_SPEED;
            this.loopInterval = null;

            // initial placement
            this.snake.reset();
            this.food.respawn(this.snake.body);   // ensure food not on snake

            // start the game loop with initial speed
            this._startLoop();
        }

        // ---------- interval management ----------
        _startLoop() {
            if (this.loopInterval) clearInterval(this.loopInterval);
            this.loopInterval = setInterval(() => this.tick(), 1000 / this.speed);
        }

        // change speed, reset interval
        setSpeed(newSpeed) {
            newSpeed = Math.min(MAX_SPEED, Math.max(1, newSpeed));
            if (newSpeed === this.speed) return;
            this.speed = newSpeed;
            this._startLoop(); // clears old and sets new
        }

        // ---------- core game tick (update + draw) ----------
        tick() {
            // update only if game is active
            if (!this.ready && !this.gameOver && !this.paused) {
                this.update();
            }
            this.draw();
        }

        // update logic: move, eat, collision, speed
        update() {
            this.snake.update();

            // food eaten?
            if (this.snake.head.equals(this.food.position)) {
                this.score++;
                this.snake.grow(1);
                this.food.respawn(this.snake.body);

                // increase speed every 5 points
                const newSpeed = INITIAL_SPEED + Math.floor(this.score / 5);
                this.setSpeed(Math.min(MAX_SPEED, newSpeed));
            }

            // collision?
            if (this.snake.checkCollision()) {
                this.gameOver = true;
                if (this.score > this.highScore) {
                    this.highScore = this.score;
                }
            }
        }

        // ---------- reset game (keep highscore) ----------
        resetGame() {
            this.snake.reset();
            this.food.respawn(this.snake.body);
            this.score = 0;
            this.gameOver = false;
            this.paused = false;
            this.ready = false;       // go directly to playing
            this.firstLaunch = false;
            this.setSpeed(INITIAL_SPEED);
        }

        // ---------- drawing ----------
        drawGrid() {
            const w = this.canvas.width;
            const h = this.canvas.height;
            this.ctx.strokeStyle = Colors.GRID_LINE;
            this.ctx.lineWidth = 0.5;
            // vertical
            for (let x = 0; x <= w; x += CELL_SIZE) {
                this.ctx.beginPath();
                this.ctx.moveTo(x, 0);
                this.ctx.lineTo(x, h);
                this.ctx.stroke();
            }
            // horizontal
            for (let y = 0; y <= h; y += CELL_SIZE) {
                this.ctx.beginPath();
                this.ctx.moveTo(0, y);
                this.ctx.lineTo(w, y);
                this.ctx.stroke();
            }
        }

        drawUI() {
            // score (top-left)
            this.ctx.font = 'bold 20px "Arial", sans-serif';
            this.ctx.fillStyle = Colors.WHITE;
            this.ctx.fillText(`Score: ${this.score}`, 14, 36);

            // highscore – yellow if equal and >0
            const highColor = (this.score === this.highScore && this.score > 0) ? Colors.YELLOW : Colors.WHITE;
            this.ctx.fillStyle = highColor;
            this.ctx.font = 'bold 18px "Arial", sans-serif';
            this.ctx.fillText(`Best: ${this.highScore}`, 14, 68);
        }

        drawReadyScreen() {
            // dark overlay
            this.ctx.fillStyle = 'rgba(20,20,20,0.85)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            this.ctx.font = 'bold 50px "Arial", sans-serif';
            this.ctx.fillStyle = Colors.GREEN;
            this.ctx.textAlign = 'center';
            this.ctx.fillText('SNAKE', this.canvas.width / 2, this.canvas.height / 2 - 40);
        }

        drawGameOver() {
            // semi-transparent overlay
            this.ctx.fillStyle = 'rgba(10,10,10,0.8)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            this.ctx.textAlign = 'center';
            this.ctx.font = 'bold 48px "Arial", sans-serif';
            this.ctx.fillStyle = Colors.RED;
            this.ctx.fillText('GAME OVER', this.canvas.width / 2, this.canvas.height / 2 - 60);

            this.ctx.font = '28px "Arial", sans-serif';
            this.ctx.fillStyle = Colors.WHITE;
            this.ctx.fillText(`Final Score: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2 + 20);

            const highColor = (this.score === this.highScore && this.score > 0) ? Colors.YELLOW : Colors.WHITE;
            this.ctx.fillStyle = highColor;
            this.ctx.font = '24px "Arial", sans-serif';
            this.ctx.fillText(`Best: ${this.highScore}`, this.canvas.width / 2, this.canvas.height / 2 + 70);
        }

        drawPause() {
            this.ctx.fillStyle = 'rgba(0,0,0,0.7)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.textAlign = 'center';
            this.ctx.font = 'bold 48px "Arial", sans-serif';
            this.ctx.fillStyle = Colors.WHITE;
            this.ctx.fillText('PAUSED', this.canvas.width / 2, this.canvas.height / 2);
            this.ctx.textAlign = 'left';
        }

        draw() {
            // clear canvas
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = Colors.BLACK;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            // background grid
            this.drawGrid();

            // objects
            this.food.draw(this.ctx);
            this.snake.draw(this.ctx);

            // overlays (priority order)
            if (this.ready) {
                this.drawReadyScreen();
            } else if (this.gameOver) {
                this.drawGameOver();
            } else {
                this.drawUI();
                if (this.paused) {
                    this.drawPause();
                }
            }
        }
    }

    // ============================================
    // INITIALISE GAME AND EVENT LISTENERS
    // ============================================
    let game;

    function init() {
        game = new Game('snakeCanvas');

        // ---------- KEYBOARD ----------
        window.addEventListener('keydown', (e) => {
            const key = e.key;
            // prevent default scrolling / space click
            const preventKeys = [
                ' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
                'w', 'a', 's', 'd', 'W', 'A', 'S', 'D',
                'p', 'P'
            ];
            if (preventKeys.includes(key) || key === ' ') {
                e.preventDefault();
            }

            // ----- GLOBAL ACTIONS -----
            // SPACE: start
            if (key === ' ' || key === 'Space') {
                if (game.ready) {
                    game.ready = false;
                    game.firstLaunch = false;
                    game.gameOver = false;
                } else if (game.gameOver) {
                    game.resetGame();
                }
                // if paused and space? we keep space only for start – ignore in game
                return;
            }

            // P : pause toggle (only if game active)
            if (key === 'p' || key === 'P') {
                if (!game.ready && !game.gameOver) {
                    game.paused = !game.paused;
                }
                return;
            }

            // ----- DIRECTION (only if game active) -----
            if (!game.ready && !game.gameOver && !game.paused) {
                let newDir = null;
                if (key === 'ArrowUp' || key === 'w' || key === 'W') newDir = Direction.UP;
                else if (key === 'ArrowDown' || key === 's' || key === 'S') newDir = Direction.DOWN;
                else if (key === 'ArrowLeft' || key === 'a' || key === 'A') newDir = Direction.LEFT;
                else if (key === 'ArrowRight' || key === 'd' || key === 'D') newDir = Direction.RIGHT;

                if (newDir) {
                    game.snake.changeDirection(newDir);
                }
            }
        });

        // optional: focus canvas to capture key events, but window listener works.
        // also prevent context menu on canvas
        game.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    // start everything when page loads
    window.addEventListener('load', init);

})();


