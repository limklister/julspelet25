import { describe, it, expect } from 'vitest';
import { CollisionDetector, BoundingBox } from '@/game/CollisionDetector';
import { Obstacle } from '@/core/types';

describe('CollisionDetector', () => {
  const detector = new CollisionDetector({ groundLevel: 340 });

  describe('Box Collision', () => {
    it('should detect overlapping boxes', () => {
      const box1: BoundingBox = { left: 100, right: 150, top: 200, bottom: 300 };
      const box2: BoundingBox = { left: 120, right: 180, top: 250, bottom: 350 };

      expect(detector.boxesOverlap(box1, box2)).toBe(true);
    });

    it('should not detect non-overlapping boxes', () => {
      const box1: BoundingBox = { left: 100, right: 150, top: 200, bottom: 300 };
      const box2: BoundingBox = { left: 200, right: 250, top: 200, bottom: 300 };

      expect(detector.boxesOverlap(box1, box2)).toBe(false);
    });

    it('should not detect adjacent boxes', () => {
      const box1: BoundingBox = { left: 100, right: 150, top: 200, bottom: 300 };
      const box2: BoundingBox = { left: 150, right: 200, top: 200, bottom: 300 };

      expect(detector.boxesOverlap(box1, box2)).toBe(false);
    });
  });

  describe('Obstacle Collision', () => {
    it('should detect collision with low obstacle', () => {
      const playerBox: BoundingBox = { left: 140, right: 160, top: 240, bottom: 340 };
      const obstacle: Obstacle = { x: 145, type: 'low', width: 30, height: 25 };

      expect(detector.checkObstacle(playerBox, obstacle)).toBe(true);
    });

    it('should not detect collision when jumping over low obstacle', () => {
      const playerBox: BoundingBox = { left: 140, right: 160, top: 200, bottom: 280 };
      const obstacle: Obstacle = { x: 145, type: 'low', width: 30, height: 25 };

      expect(detector.checkObstacle(playerBox, obstacle)).toBe(false);
    });

    it('should detect collision with high obstacle when standing', () => {
      const playerBox: BoundingBox = { left: 140, right: 160, top: 240, bottom: 340 };
      const obstacle: Obstacle = { x: 145, type: 'high', width: 30, height: 25 };

      expect(detector.checkObstacle(playerBox, obstacle)).toBe(true);
    });

    it('should not detect collision when ducking under high obstacle', () => {
      const playerBox: BoundingBox = { left: 140, right: 160, top: 290, bottom: 340 };
      const obstacle: Obstacle = { x: 145, type: 'high', width: 30, height: 25 };

      expect(detector.checkObstacle(playerBox, obstacle)).toBe(false);
    });
  });
});
