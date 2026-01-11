// src/rendering/GameRenderer.ts
import { GameObject, LevelState } from '@/core/types';

export interface GameRendererConfig {
  groundLevel: number;
  snowHeight: number;
}

const DEFAULT_CONFIG: GameRendererConfig = {
  groundLevel: 340,
  snowHeight: 60,
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

// Visual feedback for events
interface FeedbackEffect {
  x: number;
  y: number;
  text: string;
  color: string;
  frame: number;
  maxFrames: number;
}

export class GameRenderer {
  private config: GameRendererConfig;
  private snowflakes: Snowflake[] = [];
  private trees: Tree[] = [];
  private frameCount = 0;
  private canvasWidth = 800;
  private canvasHeight = 400;
  private feedbackEffects: FeedbackEffect[] = [];

  constructor(config: Partial<GameRendererConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  private initSnowflakes(width: number, height: number): void {
    this.snowflakes = [];
    const snowCount = Math.floor(width / 16);
    for (let i = 0; i < snowCount; i++) {
      this.snowflakes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 3 + 1,
        speed: Math.random() * 1 + 0.5,
        wobble: Math.random() * Math.PI * 2,
      });
    }
  }

  private initTrees(width: number): void {
    this.trees = [];
    const treePositions = [0.06, 0.19, 0.81, 0.94];
    const treeScales = [0.6, 0.8, 0.7, 0.5];
    for (let i = 0; i < treePositions.length; i++) {
      this.trees.push({
        x: width * treePositions[i],
        scale: treeScales[i],
      });
    }
  }

  addFeedback(x: number, y: number, text: string, color: string): void {
    this.feedbackEffects.push({
      x,
      y,
      text,
      color,
      frame: 0,
      maxFrames: 60,
    });
  }

  renderBackground(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
    this.frameCount++;

    if (this.canvasWidth !== canvas.width || this.canvasHeight !== canvas.height) {
      this.canvasWidth = canvas.width;
      this.canvasHeight = canvas.height;
      this.initSnowflakes(canvas.width, canvas.height);
      this.initTrees(canvas.width);
    }

    // Night sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height - this.config.snowHeight);
    skyGrad.addColorStop(0, '#0a1628');
    skyGrad.addColorStop(0.5, '#1a3a5c');
    skyGrad.addColorStop(1, '#2d5a87');
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

    // Snow ground
    const snowGrad = ctx.createLinearGradient(
      0, canvas.height - this.config.snowHeight,
      0, canvas.height
    );
    snowGrad.addColorStop(0, '#e8f4f8');
    snowGrad.addColorStop(0.3, '#d4e9ed');
    snowGrad.addColorStop(1, '#b8d4dc');
    ctx.fillStyle = snowGrad;
    ctx.fillRect(0, canvas.height - this.config.snowHeight, canvas.width, this.config.snowHeight);

    // Snow texture
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < canvas.width; i += 30) {
      const height = Math.sin(i * 0.1) * 5 + 8;
      ctx.beginPath();
      ctx.ellipse(i + 15, canvas.height - this.config.snowHeight, 20, height, 0, Math.PI, 0);
      ctx.fill();
    }

    // Ground line
    ctx.strokeStyle = '#a0c4d0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height - this.config.snowHeight);
    ctx.lineTo(canvas.width, canvas.height - this.config.snowHeight);
    ctx.stroke();

    this.renderSnow(ctx, canvas);
  }

  private renderTree(ctx: CanvasRenderingContext2D, x: number, groundY: number, scale: number): void {
    const baseWidth = 50 * scale;

    ctx.fillStyle = '#4a3728';
    ctx.fillRect(x - 5 * scale, groundY - 15 * scale, 10 * scale, 15 * scale);

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

    ctx.fillStyle = '#ffd700';
    const starY = groundY - 80 * scale - 10 * scale;
    ctx.beginPath();
    ctx.arc(x, starY, 4 * scale, 0, Math.PI * 2);
    ctx.fill();
  }

  private renderSnow(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
    ctx.fillStyle = '#ffffff';
    for (const flake of this.snowflakes) {
      flake.y += flake.speed;
      flake.x += Math.sin(this.frameCount * 0.02 + flake.wobble) * 0.5;

      if (flake.y > canvas.height - this.config.snowHeight) {
        flake.y = -5;
        flake.x = Math.random() * canvas.width;
      }
      if (flake.x < 0) flake.x = canvas.width;
      if (flake.x > canvas.width) flake.x = 0;

      ctx.globalAlpha = 0.6 + flake.size * 0.1;
      ctx.beginPath();
      ctx.arc(flake.x, flake.y, flake.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  renderObjects(ctx: CanvasRenderingContext2D, objects: GameObject[]): void {
    for (const obj of objects) {
      if (obj.consumed) continue;

      switch (obj.type) {
        case 'package':
          this.renderPackage(ctx, obj.x, obj.y, obj.width, obj.height, obj.variant);
          break;
        case 'flyingSnowball':
          this.renderSnowball(ctx, obj.x, obj.y, obj.width, true);
          break;
        case 'rollingSnowball':
          this.renderSnowball(ctx, obj.x, obj.y, obj.width, false);
          break;
      }
    }
  }

  private renderPackage(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, variant: number): void {
    const isRed = variant === 0;
    const mainColor = isRed ? '#c0392b' : '#27ae60';
    const darkColor = isRed ? '#922b21' : '#1e8449';
    const ribbonColor = isRed ? '#f1c40f' : '#e74c3c';
    const ribbonDark = isRed ? '#d4a507' : '#c0392b';

    ctx.save();
    ctx.translate(x, y);

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(0, height / 2 + 5, width / 2, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Box body
    ctx.fillStyle = mainColor;
    ctx.fillRect(-width / 2, -height / 2, width, height);

    // Box shading (right side darker)
    ctx.fillStyle = darkColor;
    ctx.fillRect(width / 4, -height / 2, width / 4, height);

    // Ribbon vertical
    ctx.fillStyle = ribbonColor;
    ctx.fillRect(-4, -height / 2, 8, height);

    // Ribbon horizontal
    ctx.fillRect(-width / 2, -4, width, 8);

    // Ribbon shading
    ctx.fillStyle = ribbonDark;
    ctx.fillRect(-4, -height / 2, 3, height);
    ctx.fillRect(-width / 2, -4, width, 3);

    // Bow loops
    ctx.fillStyle = ribbonColor;
    ctx.beginPath();
    ctx.ellipse(-12, -height / 2 - 8, 12, 8, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(12, -height / 2 - 8, 12, 8, 0.4, 0, Math.PI * 2);
    ctx.fill();

    // Bow center
    ctx.fillStyle = ribbonDark;
    ctx.beginPath();
    ctx.arc(0, -height / 2 - 5, 6, 0, Math.PI * 2);
    ctx.fill();

    // Highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(-width / 2 + 3, -height / 2 + 3, width / 3, height / 4);

    ctx.restore();
  }

  private renderSnowball(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, isFlying: boolean): void {
    ctx.save();
    ctx.translate(x, y);

    const radius = size / 2;

    // Motion blur for flying snowballs
    if (isFlying) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      for (let i = 1; i <= 3; i++) {
        ctx.beginPath();
        ctx.arc(i * 8, 0, radius - i * 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.beginPath();
    ctx.ellipse(0, radius + 3, radius, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Main snowball with gradient
    const grad = ctx.createRadialGradient(-radius / 3, -radius / 3, 0, 0, 0, radius);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.7, '#e8f4f8');
    grad.addColorStop(1, '#c8dce4');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();

    // Outline
    ctx.strokeStyle = '#a0c4d0';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.beginPath();
    ctx.arc(-radius / 3, -radius / 3, radius / 4, 0, Math.PI * 2);
    ctx.fill();

    // Snow texture dots
    ctx.fillStyle = 'rgba(200, 220, 228, 0.6)';
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      const dotX = Math.cos(angle) * radius * 0.5;
      const dotY = Math.sin(angle) * radius * 0.5;
      ctx.beginPath();
      ctx.arc(dotX, dotY, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  renderHUD(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, levelState: LevelState, _highestLevel: number, timeRemaining?: number): void {
    ctx.save();

    // Level indicator (top left)
    this.renderLevelBadge(ctx, 25, 35, levelState.level);

    // Package counter (top center)
    const centerX = canvas.width / 2;
    this.renderPackageCounter(ctx, centerX, 40, levelState.packagesCollected, levelState.packagesRequired);

    // Timer (top right area)
    if (timeRemaining !== undefined) {
      this.renderTimer(ctx, canvas.width - 80, 35, timeRemaining);
    }

    ctx.restore();
  }

  private renderTimer(ctx: CanvasRenderingContext2D, x: number, y: number, timeRemaining: number): void {
    const seconds = Math.ceil(timeRemaining);
    const isLow = seconds <= 10;

    ctx.font = 'bold 22px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = isLow ? '#e74c3c' : '#ffffff';
    ctx.shadowBlur = 3;
    ctx.shadowColor = '#000000';

    // Pulse effect when low
    if (isLow) {
      const pulse = Math.sin(this.frameCount * 0.2) * 0.2 + 0.8;
      ctx.globalAlpha = pulse;
    }

    ctx.fillText(`${seconds}s`, x, y);
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.textAlign = 'left';
  }

  private renderLevelBadge(ctx: CanvasRenderingContext2D, x: number, y: number, level: number): void {
    // Badge background
    ctx.fillStyle = '#c0392b';
    ctx.beginPath();
    ctx.roundRect(x - 5, y - 22, 90, 32, 8);
    ctx.fill();

    // Badge border
    ctx.strokeStyle = '#f1c40f';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Star decoration
    this.drawStar(ctx, x + 8, y - 6, 8, 5, 0.5);

    // Text
    ctx.font = 'bold 18px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.fillText(`Nivå ${level}`, x + 22, y + 2);
  }

  private renderPackageCounter(ctx: CanvasRenderingContext2D, x: number, y: number, collected: number, required: number): void {
    ctx.textAlign = 'center';

    // Mini package icon
    ctx.save();
    ctx.translate(x - 50, y - 5);
    ctx.scale(0.5, 0.5);
    this.renderPackage(ctx, 0, 0, 30, 30, 0);
    ctx.restore();

    // Counter text
    ctx.font = 'bold 24px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 3;
    ctx.shadowColor = '#000000';
    ctx.fillText(`${collected} / ${required}`, x + 10, y + 5);
    ctx.shadowBlur = 0;

    // Progress bar
    const barWidth = 100;
    const barHeight = 6;
    const progress = collected / required;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.roundRect(x - barWidth / 2, y + 15, barWidth, barHeight, 3);
    ctx.fill();

    ctx.fillStyle = '#27ae60';
    ctx.beginPath();
    ctx.roundRect(x - barWidth / 2, y + 15, barWidth * progress, barHeight, 3);
    ctx.fill();
  }

  private drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, outerRadius: number, points: number, innerRatio: number): void {
    const innerRadius = outerRadius * innerRatio;
    ctx.fillStyle = '#f1c40f';
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (i * Math.PI) / points - Math.PI / 2;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  }

  renderLevelComplete(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, level: number): void {
    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Celebration stars
    ctx.save();
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + this.frameCount * 0.02;
      const dist = 100 + Math.sin(this.frameCount * 0.1 + i) * 20;
      const x = centerX + Math.cos(angle) * dist;
      const y = centerY + Math.sin(angle) * dist;
      this.drawStar(ctx, x, y, 15, 5, 0.5);
    }
    ctx.restore();

    // Main text
    ctx.font = 'bold 48px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#27ae60';
    ctx.fillText(`Nivå ${level} klar!`, centerX, centerY);
    ctx.shadowBlur = 0;

    // Subtext
    ctx.font = '24px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#87ceeb';
    ctx.fillText('Gör dig redo för nästa nivå...', centerX, centerY + 50);
    ctx.textAlign = 'left';
  }

  renderFeedback(ctx: CanvasRenderingContext2D): void {
    this.feedbackEffects = this.feedbackEffects.filter(effect => {
      const progress = effect.frame / effect.maxFrames;
      const y = effect.y - progress * 50;
      const alpha = 1 - progress;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = 'bold 24px "Segoe UI", Arial, sans-serif';
      ctx.fillStyle = effect.color;
      ctx.textAlign = 'center';
      ctx.shadowBlur = 3;
      ctx.shadowColor = '#000000';
      ctx.fillText(effect.text, effect.x, y);
      ctx.restore();

      effect.frame++;
      return effect.frame < effect.maxFrames;
    });
  }

  renderCalibration(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, progress: number, playerCount: number): void {
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#000000';
    ctx.fillText('Stå still för kalibrering...', canvas.width / 2, canvas.height / 2 - 50);

    // Christmas tree decorations
    this.drawStar(ctx, canvas.width / 2 - 200, canvas.height / 2 - 45, 15, 5, 0.5);
    this.drawStar(ctx, canvas.width / 2 + 200, canvas.height / 2 - 45, 15, 5, 0.5);

    // Progress bar
    ctx.strokeStyle = '#c0392b';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(canvas.width / 2 - 150, canvas.height / 2, 300, 30, 8);
    ctx.stroke();

    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.roundRect(canvas.width / 2 - 148, canvas.height / 2 + 2, 296 * progress, 26, 6);
    ctx.fill();

    ctx.font = '24px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#87ceeb';
    ctx.fillText(`${playerCount} spelare redo`, canvas.width / 2, canvas.height / 2 + 80);
    ctx.textAlign = 'left';
    ctx.shadowBlur = 0;
  }

  renderCountdown(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, count: number): void {
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 120px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowBlur = 30;
    ctx.shadowColor = '#e74c3c';
    ctx.fillText(count.toString(), canvas.width / 2, canvas.height / 2 + 40);
    ctx.shadowBlur = 0;
    ctx.textAlign = 'left';
  }
}
