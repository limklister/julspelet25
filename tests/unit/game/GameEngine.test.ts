import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameEngine } from '@/game/GameEngine';

describe('GameEngine', () => {
  let engine: GameEngine;

  beforeEach(() => {
    engine = new GameEngine();
  });

  describe('State Management', () => {
    it('should start in menu state', () => {
      expect(engine.getState()).toBe('menu');
    });

    it('should transition to calibrating on start', () => {
      engine.startGame();
      expect(engine.getState()).toBe('calibrating');
    });

    it('should transition to countdown when calibration complete', () => {
      engine.startGame();
      engine.completeCalibration();
      expect(engine.getState()).toBe('countdown');
    });

    it('should transition to playing after countdown', () => {
      vi.useFakeTimers();
      engine.startGame();
      engine.completeCalibration();
      vi.advanceTimersByTime(4000);
      expect(engine.getState()).toBe('playing');
      vi.useRealTimers();
    });

    it('should transition to gameOver when all players dead', () => {
      engine.startGame();
      engine.forceState('playing');
      const player = engine.addPlayer();
      player!.physics.alive = false;
      engine.checkGameOver();
      expect(engine.getState()).toBe('gameOver');
    });
  });

  describe('Player Management', () => {
    it('should add players during calibration', () => {
      engine.startGame();
      const player = engine.addPlayer();
      expect(player!.id).toBe(0);
      expect(engine.getPlayers().length).toBe(1);
    });

    it('should support up to 2 players', () => {
      engine.startGame();
      engine.addPlayer();
      engine.addPlayer();
      const third = engine.addPlayer();
      expect(engine.getPlayers().length).toBe(2);
      expect(third).toBeNull();
    });
  });

  describe('Game Loop', () => {
    it('should update frame count', () => {
      engine.startGame();
      engine.forceState('playing');
      engine.update(1);
      expect(engine.getFrameCount()).toBe(1);
    });

    it('should increase speed over time', () => {
      engine.startGame();
      engine.forceState('playing');
      const initialSpeed = engine.getSpeed();
      for (let i = 0; i < 300; i++) engine.update(1);
      expect(engine.getSpeed()).toBeGreaterThan(initialSpeed);
    });
  });

  describe('Scoring', () => {
    it('should increase score for alive players', () => {
      engine.startGame();
      engine.forceState('playing');
      const player = engine.addPlayer();
      engine.update(1);
      expect(player!.score).toBe(1);
    });
  });
});
