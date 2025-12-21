import { describe, it, expect, beforeEach } from 'vitest';
import { PhysicsEngine } from '@/physics/PhysicsEngine';
import { PhysicsState } from '@/core/types';

describe('PhysicsEngine', () => {
  let engine: PhysicsEngine;
  let state: PhysicsState;

  beforeEach(() => {
    engine = new PhysicsEngine();
    state = {
      y: 0,
      jumpVelocity: 0,
      isDucking: false,
      alive: true,
    };
  });

  describe('Gravity', () => {
    it('should apply gravity when in air', () => {
      state.y = 50;
      state.jumpVelocity = 0;

      engine.update(state, 1);

      expect(state.jumpVelocity).toBeLessThan(0);
      expect(state.y).toBeLessThan(50);
    });

    it('should not go below ground', () => {
      state.y = 5;
      state.jumpVelocity = -10;

      engine.update(state, 1);

      expect(state.y).toBe(0);
      expect(state.jumpVelocity).toBe(0);
    });
  });

  describe('Jumping', () => {
    it('should apply jump velocity', () => {
      engine.applyJump(state);

      expect(state.jumpVelocity).toBeGreaterThan(0);
    });

    it('should not jump when already in air', () => {
      state.y = 50;
      const initialVelocity = state.jumpVelocity;

      engine.applyJump(state);

      expect(state.jumpVelocity).toBe(initialVelocity);
    });
  });

  describe('Fast Fall', () => {
    it('should apply double gravity when ducking in air', () => {
      state.y = 50;
      state.jumpVelocity = 0;
      state.isDucking = true;

      engine.update(state, 1);

      // Fast fall = 2x gravity
      expect(state.jumpVelocity).toBeLessThan(-1);
    });
  });
});
