// src/rendering/GameRenderer.ts
import { Obstacle } from '@/core/types';

export interface GameRendererConfig {
  groundLevel: number;
  lavaHeight: number;
  highObstacleOffset: number;
}

const DEFAULT_CONFIG: GameRendererConfig = {
  groundLevel: 340,
  lavaHeight: 60,
  highObstacleOffset: 70,
};

export class GameRenderer {
  private config: GameRendererConfig;

  constructor(config: Partial<GameRendererConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  renderBackground(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
    // Dark background
    ctx.fillStyle = '#1a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Lava gradient
    const lavaGrad = ctx.createLinearGradient(
      0, canvas.height - this.config.lavaHeight,
      0, canvas.height
    );
    lavaGrad.addColorStop(0, '#ff4500');
    lavaGrad.addColorStop(0.5, '#ff6b00');
    lavaGrad.addColorStop(1, '#ff8800');
    ctx.fillStyle = lavaGrad;
    ctx.fillRect(0, canvas.height - this.config.lavaHeight, canvas.width, this.config.lavaHeight);

    // Lava glow
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#ff4500';
    ctx.fillStyle = '#ff4500';
    for (let i = 0; i < 5; i++) {
      ctx.fillRect(Math.random() * canvas.width, canvas.height - this.config.lavaHeight, 30, 10);
    }
    ctx.shadowBlur = 0;

    // Ground line
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height - this.config.lavaHeight);
    ctx.lineTo(canvas.width, canvas.height - this.config.lavaHeight);
    ctx.stroke();
  }

  renderObstacles(ctx: CanvasRenderingContext2D, obstacles: Obstacle[], groundLevel: number): void {
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ff0066';
    ctx.fillStyle = '#ff0066';

    for (const obs of obstacles) {
      let top: number;
      if (obs.type === 'low') {
        top = groundLevel - obs.height;
      } else {
        top = groundLevel - this.config.highObstacleOffset - obs.height;
      }
      ctx.fillRect(obs.x, top, obs.width, obs.height);
    }
    ctx.shadowBlur = 0;
  }

  renderScore(ctx: CanvasRenderingContext2D, score: number, highScore: number): void {
    ctx.font = 'bold 24px "Courier New", monospace';
    ctx.fillStyle = '#00ff88';
    ctx.fillText(`SCORE: ${score}`, 20, 40);
    ctx.fillText(`HIGH: ${highScore}`, 20, 70);
  }

  renderCalibration(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, progress: number, playerCount: number): void {
    ctx.fillStyle = '#ff8800';
    ctx.font = 'bold 32px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('STA STILL FOR KALIBRERING...', canvas.width / 2, canvas.height / 2 - 50);

    // Progress bar
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 4;
    ctx.strokeRect(canvas.width / 2 - 150, canvas.height / 2, 300, 30);
    ctx.fillStyle = '#00ff88';
    ctx.fillRect(canvas.width / 2 - 148, canvas.height / 2 + 2, 296 * progress, 26);

    ctx.font = '24px "Courier New", monospace';
    ctx.fillText(`${playerCount} SPELARE DETEKTERAD${playerCount > 1 ? 'E' : ''}`, canvas.width / 2, canvas.height / 2 + 80);
    ctx.textAlign = 'left';
  }

  renderCountdown(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, count: number): void {
    ctx.fillStyle = '#ff8800';
    ctx.font = 'bold 120px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.shadowBlur = 30;
    ctx.shadowColor = '#ff8800';
    ctx.fillText(count.toString(), canvas.width / 2, canvas.height / 2 + 40);
    ctx.shadowBlur = 0;
    ctx.textAlign = 'left';
  }
}
