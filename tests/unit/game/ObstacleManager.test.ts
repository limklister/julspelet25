import { describe, it, expect, beforeEach } from 'vitest';
import { ObstacleManager } from '@/game/ObstacleManager';
import { Obstacle } from '@/core/types';

describe('ObstacleManager', () => {
  let manager: ObstacleManager;

  beforeEach(() => {
    manager = new ObstacleManager({
      canvasWidth: 800,
      spawnInterval: 100,
      highObstacleProbability: 0.4,
    });
  });

  describe('Spawning', () => {
    it('should spawn obstacle at canvas edge', () => {
      const obstacle = manager.spawn();

      expect(obstacle.x).toBe(800);
      expect(obstacle.width).toBeGreaterThan(0);
      expect(obstacle.height).toBeGreaterThan(0);
    });

    it('should spawn low or high obstacles', () => {
      const types = new Set<string>();
      for (let i = 0; i < 20; i++) {
        types.add(manager.spawn().type);
      }

      expect(types.has('low')).toBe(true);
      expect(types.has('high')).toBe(true);
    });
  });

  describe('Movement', () => {
    it('should move obstacles left', () => {
      const obstacle = manager.spawn();
      const initialX = obstacle.x;

      manager.update([obstacle], 5, 1);

      expect(obstacle.x).toBe(initialX - 5);
    });

    it('should remove obstacles that exit screen', () => {
      const obstacles: Obstacle[] = [
        { x: -50, type: 'low', width: 30, height: 25 },
        { x: 500, type: 'high', width: 30, height: 25 },
      ];

      const remaining = manager.update(obstacles, 5, 1);

      expect(remaining.length).toBe(1);
      expect(remaining[0].x).toBe(495);
    });
  });

  describe('Spawn Timing', () => {
    it('should track spawn readiness based on frame count', () => {
      expect(manager.shouldSpawn(0)).toBe(false);
      expect(manager.shouldSpawn(100)).toBe(true);
      expect(manager.shouldSpawn(101)).toBe(false);
      expect(manager.shouldSpawn(200)).toBe(true);
    });
  });
});
