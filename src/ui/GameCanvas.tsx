import { useRef, useEffect, useCallback } from 'react';
import { GameEngine } from '@/game/GameEngine';
import { GameRenderer } from '@/rendering/GameRenderer';
import { StickmanRenderer } from '@/rendering/StickmanRenderer';
import { BoundingBox } from '@/game/CollisionDetector';

interface GameCanvasProps {
  engine: GameEngine;
  onGameOver: () => void;
}

export function GameCanvas({ engine, onGameOver }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const gameRenderer = useRef(new GameRenderer());
  const stickmanRenderer = useRef(new StickmanRenderer());

  const render = useCallback((timestamp: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const elapsed = timestamp - lastTimeRef.current;
    lastTimeRef.current = timestamp;
    const deltaTime = Math.min(elapsed / 16.67, 3);

    const state = engine.getState();
    const config = engine.getConfig();

    gameRenderer.current.renderBackground(ctx, canvas);

    if (state === 'calibrating') {
      gameRenderer.current.renderCalibration(ctx, canvas, 0, engine.getPlayers().length);
    } else if (state === 'countdown') {
      gameRenderer.current.renderCountdown(ctx, canvas, engine.getCountdown());
    } else if (state === 'playing') {
      engine.update(deltaTime);
      gameRenderer.current.renderObstacles(ctx, engine.getObstacles(), config.groundLevel);

      const playerBoxes = new Map<number, BoundingBox>();
      for (const player of engine.getPlayers()) {
        if (player.physics.alive && player.smoothedLandmarks) {
          const box = stickmanRenderer.current.render(
            ctx, player.smoothedLandmarks, player.physics,
            player.calibration, player.baseX, player.color
          );
          if (box) playerBoxes.set(player.id, box);
        }
      }

      engine.checkCollisions(playerBoxes);
      gameRenderer.current.renderScore(ctx, engine.getScore(), engine.getHighScore());

      engine.checkGameOver();
      if (engine.getState() === 'gameOver') {
        onGameOver();
        return;
      }
    }

    animationRef.current = requestAnimationFrame(render);
  }, [engine, onGameOver]);

  useEffect(() => {
    lastTimeRef.current = performance.now();
    animationRef.current = requestAnimationFrame(render);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [render]);

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={400}
      className="border-4 border-green-400"
      style={{ boxShadow: '0 0 30px #00ff88, inset 0 0 30px rgba(0,255,136,0.1)' }}
    />
  );
}
