# type: ignore
import pygame
import random
import sys
from enum import Enum
from dataclasses import dataclass

pygame.init()

# ============================================
# CONSTANTS
# ============================================
WIDTH = 800
HEIGHT = 600
SNAKE_SIZE = 20
INITIAL_SPEED = 10
MAX_SPEED = 20

# ============================================
# COLORS
# ============================================
class Colors:
    WHITE = (209, 209, 209)
    BLACK = (20, 20, 20)
    RED = (255, 50, 50)
    GREEN = (150, 200, 60)
    DARK_GREEN = (100, 150, 40)
    BLUE = (100, 150, 255)
    GRAY = (100, 100, 100)
    YELLOW = (255, 215, 0)

# ============================================
# DIRECTION ENUM
# ============================================
class Direction(Enum):
    UP = (0, -1)
    DOWN = (0, 1)
    LEFT = (-1, 0)
    RIGHT = (1, 0)

    @property
    def opposite(self):
        """Return the opposite direction (prevents 180° turns)."""
        opposites = {
            Direction.UP: Direction.DOWN,
            Direction.DOWN: Direction.UP,
            Direction.LEFT: Direction.RIGHT,
            Direction.RIGHT: Direction.LEFT
        }
        return opposites[self]

# ============================================
# POSITION CLASS
# Represents a grid cell, not pixel coordinates.
# ============================================
@dataclass
class Position:
    x: int
    y: int

    def __eq__(self, other):
        return self.x == other.x and self.y == other.y

    def __hash__(self):
        return hash((self.x, self.y))

    def to_pixel(self):
        """Convert grid position to screen pixel coordinates."""
        return (self.x * SNAKE_SIZE, self.y * SNAKE_SIZE)

    def move(self, direction):
        dx, dy = direction.value
        return Position(self.x + dx, self.y + dy)

# ============================================
# FOOD CLASS
# ============================================
class Food:
    def __init__(self, grid_width, grid_height):
        self.position = None
        self._generate_position(grid_width, grid_height)

    def _generate_position(self, grid_width, grid_height):
        """Pick a random grid position."""
        self.position = Position(
            random.randrange(0, grid_width),
            random.randrange(0, grid_height)
        )

    def respawn(self, snake_body, grid_width, grid_height):
        """
        Place food in a free cell.
        If the grid is nearly full, give up after 1000 attempts to avoid infinite loops.
        """
        attempts = 0
        max_attempts = 1000
        while attempts < max_attempts:
            self._generate_position(grid_width, grid_height)
            if self.position not in snake_body:
                break
            attempts += 1
        else:
            # No free cell found – place at (0,0) and hope; the snake will eat it immediately.
            self.position = Position(0, 0)

    def draw(self, surface):
        x, y = self.position.to_pixel()
        pygame.draw.rect(surface, Colors.RED, pygame.Rect(x, y, SNAKE_SIZE, SNAKE_SIZE))

# ============================================
# SNAKE CLASS
# ============================================
class Snake:
    def __init__(self):
        pass

    def reset(self, grid_width, grid_height):
        start_x, start_y = grid_width // 4, grid_height // 2
        self.body = [
            Position(start_x, start_y),
            Position(start_x - 1, start_y),
            Position(start_x - 2, start_y)
        ]
        self.direction = Direction.RIGHT
        self.next_direction = Direction.RIGHT
        self.grow_pending = 0

    @property
    def head(self):
        return self.body[0]

    def change_direction(self, new_direction):
        if new_direction != self.direction.opposite:
            self.next_direction = new_direction

    def update(self):
        self.direction = self.next_direction
        new_head = self.head.move(self.direction)
        self.body.insert(0, new_head)

        if self.grow_pending > 0:
            self.grow_pending -= 1
        else:
            self.body.pop()

    def grow(self, amount=1):
        self.grow_pending += amount

    def check_collision(self, grid_width, grid_height):
        # Wall collision
        if (self.head.x < 0 or self.head.x >= grid_width or
            self.head.y < 0 or self.head.y >= grid_height):
            return True
        # Self collision
        return self.head in self.body[1:]

    def draw(self, surface):
        for i, pos in enumerate(self.body):
            x, y = pos.to_pixel()
            rect = pygame.Rect(x, y, SNAKE_SIZE, SNAKE_SIZE)

            # Head is brighter, body gradually darker
            if i == 0:
                color = Colors.GREEN
            else:
                factor = 1 - (i / len(self.body)) * 0.3
                color = tuple(int(c * factor) for c in Colors.GREEN)

            # Draw segment
            pygame.draw.rect(surface, color, rect)

            # Draw eyes on head (after the body, so they are on top)
            if i == 0:
                eye_offset = 5
                eye_size = 3
                if self.direction == Direction.RIGHT:
                    pygame.draw.circle(surface, Colors.BLACK, (x + SNAKE_SIZE - eye_offset, y + eye_offset), eye_size)
                    pygame.draw.circle(surface, Colors.BLACK, (x + SNAKE_SIZE - eye_offset, y + SNAKE_SIZE - eye_offset), eye_size)
                elif self.direction == Direction.LEFT:
                    pygame.draw.circle(surface, Colors.BLACK, (x + eye_offset, y + eye_offset), eye_size)
                    pygame.draw.circle(surface, Colors.BLACK, (x + eye_offset, y + SNAKE_SIZE - eye_offset), eye_size)
                elif self.direction == Direction.UP:
                    pygame.draw.circle(surface, Colors.BLACK, (x + eye_offset, y + eye_offset), eye_size)
                    pygame.draw.circle(surface, Colors.BLACK, (x + SNAKE_SIZE - eye_offset, y + eye_offset), eye_size)
                else:  # DOWN
                    pygame.draw.circle(surface, Colors.BLACK, (x + eye_offset, y + SNAKE_SIZE - eye_offset), eye_size)
                    pygame.draw.circle(surface, Colors.BLACK, (x + SNAKE_SIZE - eye_offset, y + SNAKE_SIZE - eye_offset), eye_size)

            # Border for definition
            pygame.draw.rect(surface, Colors.DARK_GREEN, rect, 1)

# ============================================
# GAME CLASS
# ============================================
class Game:
    def __init__(self):
        self.window = pygame.display.set_mode((WIDTH, HEIGHT), pygame.RESIZABLE)
        pygame.display.set_caption("Snake - Enhanced Edition")
        self.clock = pygame.time.Clock()

        # Fonts
        self.font_large = pygame.font.SysFont('arial', 50)
        self.font_medium = pygame.font.SysFont('arial', 30)
        self.font_small = pygame.font.SysFont('arial', 20)

        # Game objects
        self.snake = Snake()
        self.snake.reset(self.grid_width, self.grid_height)
        self.food = Food(self.grid_width, self.grid_height)
        # Ensure food is not on the snake at start
        self.food.respawn(self.snake.body, self.grid_width, self.grid_height)

        # Game state
        self.score = 0
        self.high_score = 0          # Best score of the current session
        self.game_over = False
        self.paused = False
        self.ready = True           # Show start screen
        self.first_launch = True
        self.speed = INITIAL_SPEED

    @property
    def grid_width(self):
        return self.window.get_width() // SNAKE_SIZE

    @property
    def grid_height(self):
        return self.window.get_height() // SNAKE_SIZE

    # ------------------------------------------------------------------
    # Event handling
    # ------------------------------------------------------------------
    def handle_events(self):
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                return False

            elif event.type == pygame.VIDEORESIZE:
                # Enforce minimum size
                new_width = max(event.w, 400)
                new_height = max(event.h, 300)
                self.window = pygame.display.set_mode((new_width, new_height), pygame.RESIZABLE)

            elif event.type == pygame.KEYDOWN:
                if event.key == pygame.K_ESCAPE:
                    return False

                # Ready screen: SPACE to start
                if self.ready:
                    if event.key == pygame.K_SPACE:
                        self.ready = False
                        self.first_launch = False

                # Game over: SPACE to restart
                elif self.game_over:
                    if event.key == pygame.K_SPACE:
                        self.reset_game()

                # In-game controls
                else:
                    if event.key in (pygame.K_UP, pygame.K_w):
                        self.snake.change_direction(Direction.UP)
                    elif event.key in (pygame.K_DOWN, pygame.K_s):
                        self.snake.change_direction(Direction.DOWN)
                    elif event.key in (pygame.K_LEFT, pygame.K_a):
                        self.snake.change_direction(Direction.LEFT)
                    elif event.key in (pygame.K_RIGHT, pygame.K_d):
                        self.snake.change_direction(Direction.RIGHT)
                    elif event.key == pygame.K_p:
                        self.paused = not self.paused

        return True

    # ------------------------------------------------------------------
    # Game reset
    # ------------------------------------------------------------------
    def reset_game(self):
        self.snake.reset(self.grid_width, self.grid_height)
        self.food.respawn(self.snake.body, self.grid_width, self.grid_height)
        self.score = 0
        self.game_over = False
        self.paused = False
        self.speed = INITIAL_SPEED

        if self.first_launch:
            self.ready = True
            self.first_launch = False
        else:
            self.ready = False

    # ------------------------------------------------------------------
    # Update logic
    # ------------------------------------------------------------------
    def update(self):
        if self.game_over or self.paused or self.ready:
            return

        self.snake.update()

        # Food eaten?
        if self.snake.head == self.food.position:
            self.score += 1
            self.snake.grow(1)
            self.food.respawn(self.snake.body, self.grid_width, self.grid_height)

            # Increase speed every 5 points
            self.speed = min(MAX_SPEED, INITIAL_SPEED + self.score // 5)

        # Collision?
        if self.snake.check_collision(self.grid_width, self.grid_height):
            self.game_over = True
            if self.score > self.high_score:
                self.high_score = self.score   # Update session high score

    # ------------------------------------------------------------------
    # Drawing methods
    # ------------------------------------------------------------------
    def draw_grid(self):
        w = self.window.get_width()
        h = self.window.get_height()
        # Vertical lines
        for x in range(0, w, SNAKE_SIZE):
            pygame.draw.line(self.window, (30, 30, 30), (x, 0), (x, h))
        # Horizontal lines
        for y in range(0, h, SNAKE_SIZE):
            pygame.draw.line(self.window, (30, 30, 30), (0, y), (w, y))

    def draw_ready_screen(self):
        w = self.window.get_width()
        h = self.window.get_height()

        overlay = pygame.Surface((w, h))
        overlay.set_alpha(200)
        overlay.fill(Colors.BLACK)
        self.window.blit(overlay, (0, 0))

        title = self.font_large.render('SNAKE', True, Colors.GREEN)
        title_rect = title.get_rect(center=(w // 2, h // 3))
        self.window.blit(title, title_rect)

        start = self.font_medium.render('Press SPACE to start', True, Colors.WHITE)
        start_rect = start.get_rect(center=(w // 2, h // 2))
        self.window.blit(start, start_rect)

        controls = self.font_small.render('Arrow Keys or WASD to move | P to pause', True, Colors.GRAY)
        controls_rect = controls.get_rect(center=(w // 2, h // 2 + 50))
        self.window.blit(controls, controls_rect)

    def draw_ui(self):
        # Score and high score
        score_text = self.font_small.render(f'Score: {self.score}', True, Colors.WHITE)
        self.window.blit(score_text, (10, 10))
        
        # High score turns YELLOW if you've tied or beaten the record
        high_score_color = Colors.YELLOW if (self.score == self.high_score and self.score > 0) else Colors.WHITE
        high_text = self.font_small.render(f'Best: {self.high_score}', True, high_score_color)
        self.window.blit(high_text, (10, 35))

        # Pause overlay
        if self.paused:
            w = self.window.get_width()
            h = self.window.get_height()
            pause = self.font_large.render('PAUSED', True, Colors.WHITE)
            pause_rect = pause.get_rect(center=(w // 2, h // 2))
            self.window.blit(pause, pause_rect)
            resume = self.font_small.render('Press P to resume', True, Colors.GRAY)
            resume_rect = resume.get_rect(center=(w // 2, h // 2 + 50))
            self.window.blit(resume, resume_rect)

    def draw_game_over(self):
        w = self.window.get_width()
        h = self.window.get_height()

        overlay = pygame.Surface((w, h))
        overlay.set_alpha(180)
        overlay.fill(Colors.BLACK)
        self.window.blit(overlay, (0, 0))

        # Main text
        game_over = self.font_large.render('GAME OVER', True, Colors.RED)
        game_over_rect = game_over.get_rect(center=(w // 2, h // 3))
        self.window.blit(game_over, game_over_rect)

        # Scores
        score = self.font_medium.render(f'Final Score: {self.score}', True, Colors.WHITE)
        score_rect = score.get_rect(center=(w // 2, h // 2))
        self.window.blit(score, score_rect)

        # High score – YELLOW if this is a new record, otherwise white
        high_score_color = Colors.YELLOW if (self.score == self.high_score and self.score > 0) else Colors.WHITE
        best = self.font_medium.render(f'Best: {self.high_score}', True, high_score_color)
        best_rect = best.get_rect(center=(w // 2, h // 2 + 40))
        self.window.blit(best, best_rect)

        # Restart/quit instructions 
        restart = self.font_small.render('Press SPACE to restart', True, Colors.GRAY)
        restart_rect = restart.get_rect(center=(w // 2, h // 2 + 115))
        self.window.blit(restart, restart_rect)

        quit_text = self.font_small.render('Press ESC to quit', True, Colors.GRAY)
        quit_rect = quit_text.get_rect(center=(w // 2, h // 2 + 145))
        self.window.blit(quit_text, quit_rect)

    def draw(self):
        # Clear and draw background grid
        self.window.fill(Colors.BLACK)
        self.draw_grid()

        # Draw game objects (always visible)
        self.food.draw(self.window)
        self.snake.draw(self.window)

        # Overlays
        if self.ready:
            self.draw_ready_screen()
        elif self.game_over:
            self.draw_game_over()
        else:
            self.draw_ui()

        pygame.display.flip()

    # ------------------------------------------------------------------
    # Main loop
    # ------------------------------------------------------------------
    def run(self):
        running = True
        while running:
            running = self.handle_events()
            self.update()
            self.draw()
            self.clock.tick(self.speed)

        pygame.quit()
        sys.exit()

# ============================================
# START THE GAME
# ============================================
if __name__ == "__main__":
    game = Game()
    game.run()
