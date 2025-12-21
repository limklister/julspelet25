import { useRef, useEffect, useCallback } from 'react';

export function useGameLoop(callback: (deltaTime: number) => void, isRunning: boolean) {
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  const loop = useCallback((timestamp: number) => {
    const elapsed = timestamp - lastTimeRef.current;
    lastTimeRef.current = timestamp;
    const deltaTime = Math.min(elapsed / 16.67, 3);
    callback(deltaTime);
    animationRef.current = requestAnimationFrame(loop);
  }, [callback]);

  useEffect(() => {
    if (isRunning) {
      lastTimeRef.current = performance.now();
      animationRef.current = requestAnimationFrame(loop);
    }
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isRunning, loop]);
}
