// src/rendering/GameRenderer.ts
import { Obstacle } from '@/core/types';

export interface GameRendererConfig {
  groundLevel: number;
  snowHeight: number;
  highObstacleOffset: number;
}

const DEFAULT_CONFIG: GameRendererConfig = {
  groundLevel: 340,
  snowHeight: 60,
  highObstacleOffset: 70,
};

interface Snowflake {
  x: number;
  y: number;
  size: number;
  speed: number;
  wobble: number;
}

interface Tree {
  x: number;
  scale: number;
}

export class GameRenderer {
  private config: GameRendererConfig;
  private snowflakes: Snowflake[] = [];
  private trees: Tree[] = [];
  private frameCount = 0;

  constructor(config: Partial<GameRendererConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initSnowflakes();
    this.initTrees();
  }

  private initSnowflakes(): void {
    for (let i = 0; i < 50; i++) {
      this.snowflakes.push({
        x: Math.random() * 800,
        y: Math.random() * 400,
        size: Math.random() * 3 + 1,
        speed: Math.random() * 1 + 0.5,
        wobble: Math.random() * Math.PI * 2,
      });
    }
  }

  private initTrees(): void {
    // Background trees at fixed positions
    this.trees = [
      { x: 50, scale: 0.6 },
      { x: 150, scale: 0.8 },
      { x: 650, scale: 0.7 },
      { x: 750, scale: 0.5 },
    ];
  }

  renderBackground(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
    this.frameCount++;

    // Night sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height - this.config.snowHeight);
    skyGrad.addColorStop(0, '#0a1628'); // Dark blue at top
    skyGrad.addColorStop(0.5, '#1a3a5c'); // Mid blue
    skyGrad.addColorStop(1, '#2d5a87'); // Lighter blue near horizon
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Stars
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 20; i++) {
      const x = (i * 47 + this.frameCount * 0.1) % canvas.width;
      const y = (i * 23) % (canvas.height - 150);
      const twinkle = Math.sin(this.frameCount * 0.05 + i) * 0.5 + 0.5;
      ctx.globalAlpha = 0.3 + twinkle * 0.7;
      ctx.beginPath();
      ctx.arc(x, y, 1 + twinkle, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Background trees
    for (const tree of this.trees) {
      this.renderTree(ctx, tree.x, canvas.height - this.config.snowHeight, tree.scale);
    }

    // Snow ground gradient
    const snowGrad = ctx.createLinearGradient(
      0, canvas.height - this.config.snowHeight,
      0, canvas.height
    );
    snowGrad.addColorStop(0, '#e8f4f8'); // Light snow
    snowGrad.addColorStop(0.3, '#d4e9ed');
    snowGrad.addColorStop(1, '#b8d4dc'); // Slightly darker at bottom
    ctx.fillStyle = snowGrad;
    ctx.fillRect(0, canvas.height - this.config.snowHeight, canvas.width, this.config.snowHeight);

    // Snow texture (small bumps)
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < canvas.width; i += 30) {
      const height = Math.sin(i * 0.1) * 5 + 8;
      ctx.beginPath();
      ctx.ellipse(i + 15, canvas.height - this.config.snowHeight, 20, height, 0, Math.PI, 0);
      ctx.fill();
    }

    // Snow sparkles
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 15; i++) {
      const x = (i * 57 + this.frameCount * 0.3) % canvas.width;
      const y = canvas.height - this.config.snowHeight + 10 + (i * 3) % 40;
      const sparkle = Math.sin(this.frameCount * 0.1 + i * 2) * 0.5 + 0.5;
      ctx.globalAlpha = sparkle * 0.8;
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Ground line (subtle)
    ctx.strokeStyle = '#a0c4d0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height - this.config.snowHeight);
    ctx.lineTo(canvas.width, canvas.height - this.config.snowHeight);
    ctx.stroke();

    // Render falling snow
    this.renderSnow(ctx, canvas);
  }

  private renderTree(ctx: CanvasRenderingContext2D, x: number, groundY: number, scale: number): void {
    const baseHeight = 80 * scale;
    const baseWidth = 50 * scale;

    // Tree trunk
    ctx.fillStyle = '#4a3728';
    ctx.fillRect(x - 5 * scale, groundY - 15 * scale, 10 * scale, 15 * scale);

    // Tree layers (dark green)
    ctx.fillStyle = '#1a4d2e';
    for (let layer = 0; layer < 3; layer++) {
      const layerY = groundY - 15 * scale - layer * 20 * scale;
      const layerWidth = baseWidth - layer * 10 * scale;
      ctx.beginPath();
      ctx.moveTo(x, layerY - 25 * scale);
      ctx.lineTo(x - layerWidth / 2, layerY);
      ctx.lineTo(x + layerWidth / 2, layerY);
      ctx.closePath();
      ctx.fill();
    }

    // Snow on tree
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.7;
    for (let layer = 0; layer < 3; layer++) {
      const layerY = groundY - 15 * scale - layer * 20 * scale;
      const layerWidth = (baseWidth - layer * 10 * scale) * 0.6;
      ctx.beginPath();
      ctx.ellipse(x, layerY - 20 * scale, layerWidth / 2, 5 * scale, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Star on top (small)
    ctx.fillStyle = '#ffd700';
    const starY = groundY - baseHeight - 10 * scale;
    ctx.beginPath();
    ctx.arc(x, starY, 4 * scale, 0, Math.PI * 2);
    ctx.fill();
  }

  private renderSnow(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
    ctx.fillStyle = '#ffffff';
    for (const flake of this.snowflakes) {
      // Update position
      flake.y += flake.speed;
      flake.x += Math.sin(this.frameCount * 0.02 + flake.wobble) * 0.5;

      // Reset if off screen
      if (flake.y > canvas.height - this.config.snowHeight) {
        flake.y = -5;
        flake.x = Math.random() * canvas.width;
      }
      if (flake.x < 0) flake.x = canvas.width;
      if (flake.x > canvas.width) flake.x = 0;

      // Draw snowflake
      ctx.globalAlpha = 0.6 + flake.size * 0.1;
      ctx.beginPath();
      ctx.arc(flake.x, flake.y, flake.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  renderObstacles(ctx: CanvasRenderingContext2D, obstacles: Obstacle[], groundLevel: number): void {
    for (const obs of obstacles) {
      let top: number;
      if (obs.type === 'low') {
        top = groundLevel - obs.height;
        this.renderSnowPile(ctx, obs.x, top, obs.width, obs.height);
      } else {
        top = groundLevel - this.config.highObstacleOffset - obs.height;
        this.renderGiftBox(ctx, obs.x, top, obs.width, obs.height);
      }
    }
  }

  private renderSnowPile(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number): void {
    // Snow pile (low obstacle to jump over)
    const gradient = ctx.createLinearGradient(x, y, x, y + height);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(1, '#c8e0e8');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(x + width / 2, y + height, width / 2 + 5, height, 0, Math.PI, 0);
    ctx.fill();

    // Ice crystals
    ctx.fillStyle = '#a0d8ef';
    ctx.globalAlpha = 0.6;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(x + width * 0.25 + i * width * 0.25, y + height * 0.6, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private renderGiftBox(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number): void {
    // Gift box (high obstacle to duck under)
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#e74c3c';

    // Box body (red)
    ctx.fillStyle = '#c0392b';
    ctx.fillRect(x, y, width, height);

    // Ribbon vertical
    ctx.fillStyle = '#f1c40f';
    ctx.fillRect(x + width / 2 - 4, y, 8, height);

    // Ribbon horizontal
    ctx.fillRect(x, y + height / 2 - 4, width, 8);

    // Bow
    ctx.fillStyle = '#f39c12';
    ctx.beginPath();
    ctx.ellipse(x + width / 2 - 8, y - 5, 10, 6, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + width / 2 + 8, y - 5, 10, 6, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + width / 2, y - 2, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
  }

  renderScore(ctx: CanvasRenderingContext2D, score: number, highScore: number): void {
    ctx.font = 'bold 24px "Courier New", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 5;
    ctx.shadowColor = '#000000';
    ctx.fillText(`⭐ POÄNG: ${score}`, 20, 40);
    ctx.fillText(`🏆 REKORD: ${highScore}`, 20, 70);
    ctx.shadowBlur = 0;
  }

  renderCalibration(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, progress: number, playerCount: number): void {
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#000000';
    ctx.fillText('🎄 STÅ STILL FÖR KALIBRERING... 🎄', canvas.width / 2, canvas.height / 2 - 50);

    // Progress bar background
    ctx.strokeStyle = '#c0392b';
    ctx.lineWidth = 4;
    ctx.strokeRect(canvas.width / 2 - 150, canvas.height / 2, 300, 30);

    // Progress bar fill (solid red)
    ctx.fillStyle = '#e74c3c';
    ctx.shadowBlur = 5;
    ctx.shadowColor = '#e74c3c';
    ctx.fillRect(canvas.width / 2 - 148, canvas.height / 2 + 2, 296 * progress, 26);
    ctx.shadowBlur = 0;

    ctx.font = '24px "Courier New", monospace';
    ctx.fillStyle = '#87ceeb';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#000000';
    ctx.fillText(`${playerCount} SPELARE REDO${playerCount > 1 ? ' 🎅🎅' : ' 🎅'}`, canvas.width / 2, canvas.height / 2 + 80);
    ctx.textAlign = 'left';
    ctx.shadowBlur = 0;
  }

  renderCountdown(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, count: number): void {
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 120px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.shadowBlur = 30;
    ctx.shadowColor = '#e74c3c';
    ctx.fillText(count.toString(), canvas.width / 2, canvas.height / 2 + 40);
    ctx.shadowBlur = 0;
    ctx.textAlign = 'left';
  }
}
