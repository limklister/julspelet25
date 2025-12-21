// tests/unit/rendering/GameRenderer.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameRenderer } from '@/rendering/GameRenderer';
import { Obstacle } from '@/core/types';

describe('GameRenderer', () => {
  let renderer: GameRenderer;
  let mockCtx: CanvasRenderingContext2D;
  let mockCanvas: HTMLCanvasElement;

  beforeEach(() => {
    renderer = new GameRenderer();
    mockCtx = {
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      font: '',
      textAlign: 'left',
      shadowBlur: 0,
      shadowColor: '',
      globalAlpha: 1,
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      fillText: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      arc: vi.fn(),
      ellipse: vi.fn(),
      closePath: vi.fn(),
      createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    } as unknown as CanvasRenderingContext2D;
    mockCanvas = { width: 800, height: 400 } as HTMLCanvasElement;
  });

  it('should render background', () => {
    renderer.renderBackground(mockCtx, mockCanvas);
    expect(mockCtx.fillRect).toHaveBeenCalled();
    expect(mockCtx.createLinearGradient).toHaveBeenCalled();
  });

  it('should render obstacles', () => {
    const obstacles: Obstacle[] = [
      { x: 500, type: 'low', width: 30, height: 25 },
      { x: 600, type: 'high', width: 30, height: 25 },
    ];
    renderer.renderObstacles(mockCtx, obstacles, 340);
    // Now renders snow piles (ellipse) and gift boxes (fillRect + ribbons)
    expect(mockCtx.ellipse).toHaveBeenCalled();
    expect(mockCtx.fillRect).toHaveBeenCalled();
  });

  it('should render score', () => {
    renderer.renderScore(mockCtx, 100, 500);
    expect(mockCtx.fillText).toHaveBeenCalledWith('⭐ POÄNG: 100', 20, 40);
    expect(mockCtx.fillText).toHaveBeenCalledWith('🏆 REKORD: 500', 20, 70);
  });

  it('should render calibration', () => {
    renderer.renderCalibration(mockCtx, mockCanvas, 0.5, 1);
    expect(mockCtx.fillText).toHaveBeenCalled();
    expect(mockCtx.fillRect).toHaveBeenCalled();
  });

  it('should render countdown', () => {
    renderer.renderCountdown(mockCtx, mockCanvas, 3);
    expect(mockCtx.fillText).toHaveBeenCalledWith('3', 400, 240);
  });
});
