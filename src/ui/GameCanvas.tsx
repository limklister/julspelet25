import { useRef, useEffect, useCallback } from 'react';
import { GameEngine } from '@/game/GameEngine';
import { GameRenderer } from '@/rendering/GameRenderer';
import { SVGRenderer } from '@/rendering/SVGRenderer';
import { BoundingBox } from '@/game/CollisionDetector';
import { soundManager } from '@/audio/SoundManager';

interface GameCanvasProps {
  engine: GameEngine;
  onGameOver: () => void;
  onWin: () => void;
  calibrationProgress?: number;
}

export function GameCanvas({ engine, onGameOver, onWin, calibrationProgress = 0 }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const gameRenderer = useRef<GameRenderer | null>(null);
  const svgRenderer = useRef<SVGRenderer | null>(null);

  // Set canvas size to fill viewport and initialize renderers
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      canvas.width = width;
      canvas.height = height;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      canvas.style.position = 'fixed';
      canvas.style.top = '0';
      canvas.style.left = '0';

      const groundLevel = height - 60;
      gameRenderer.current = new GameRenderer({ groundLevel });
      svgRenderer.current = new SVGRenderer({ groundLevel });
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  const render = useCallback((timestamp: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!gameRenderer.current || !svgRenderer.current) return;

    const elapsed = timestamp - lastTimeRef.current;
    lastTimeRef.current = timestamp;
    const deltaTime = Math.min(elapsed / 16.67, 3);

    const state = engine.getState();

    // Always render background
    gameRenderer.current.renderBackground(ctx, canvas);

    if (state === 'calibrating') {
      gameRenderer.current.renderCalibration(ctx, canvas, calibrationProgress, engine.getPlayers().length);
    } else if (state === 'countdown') {
      gameRenderer.current.renderCountdown(ctx, canvas, engine.getCountdown());
    } else if (state === 'playing' || state === 'levelComplete') {
      // Update game if playing
      if (state === 'playing') {
        engine.update(deltaTime);
      }

      // Render game objects (packages and snowballs)
      gameRenderer.current.renderObjects(ctx, engine.getObjects());

      // Render players and collect bounding boxes
      const playerBoxes = new Map<number, BoundingBox>();
      for (const player of engine.getPlayers()) {
        if (player.physics.alive && player.smoothedLandmarks) {
          const box = svgRenderer.current.render(
            ctx, player.smoothedLandmarks, player.physics,
            player.calibration, player.baseX, player.color
          );
          if (box) playerBoxes.set(player.id, box);
        }
      }

      // Check collisions and process events
      if (state === 'playing') {
        engine.checkCollisions(playerBoxes);

        // Process game events for visual and audio feedback
        const events = engine.popEvents();
        for (const event of events) {
          const player = engine.getPlayers()[0];
          const feedbackX = player?.baseX || canvas.width / 2;
          const feedbackY = canvas.height / 2 - 50;

          if (event.type === 'catch') {
            gameRenderer.current.addFeedback(feedbackX, feedbackY, '+1', '#27ae60');
            soundManager.play('catch');
          } else if (event.type === 'hit' && event.packagesLost) {
            gameRenderer.current.addFeedback(feedbackX, feedbackY, `-${event.packagesLost}`, '#e74c3c');
            soundManager.play('hit');
          } else if (event.type === 'levelComplete') {
            soundManager.play('levelComplete');
          } else if (event.type === 'win') {
            soundManager.play('win');
            onWin();
            return;
          }
        }
      }

      // Render HUD
      gameRenderer.current.renderHUD(ctx, canvas, engine.getLevelState(), engine.getHighestLevel(), engine.getLevelTimeRemaining());

      // Render feedback effects
      gameRenderer.current.renderFeedback(ctx);

      // Render level complete overlay
      if (state === 'levelComplete') {
        gameRenderer.current.renderLevelComplete(ctx, canvas, engine.getLevelState().level);
      }
    } else if (state === 'win') {
      // Win state is handled by parent component
      onWin();
      return;
    } else if (state === 'gameOver') {
      onGameOver();
      return;
    }

    animationRef.current = requestAnimationFrame(render);
  }, [engine, onGameOver, onWin, calibrationProgress]);

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
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        display: 'block',
        margin: 0,
        padding: 0,
      }}
    />
  );
}
