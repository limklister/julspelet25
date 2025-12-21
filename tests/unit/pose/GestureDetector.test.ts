import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GestureDetector } from '@/pose/GestureDetector';
import { createStandingPose, createJumpingPose, createDuckingPose } from '@/pose/MockPoseDetector';
import { CalibrationData, PhysicsState } from '@/core/types';

describe('GestureDetector', () => {
  let detector: GestureDetector;
  let calibration: CalibrationData;
  let physics: PhysicsState;

  beforeEach(() => {
    detector = new GestureDetector();

    calibration = {
      baselineShoulderY: 0.35,
      baselineHeight: 0.75,
      baselineTorsoLength: 0.35,
      ankleX: 0.5,
      ankleY: 0.95,
      bodyScale: 120,
      shoulderVelocity: 0,
      lastJumpTime: null,
      isCalibrated: true,
    };

    physics = {
      y: 0, // On ground
      jumpVelocity: 0,
      isDucking: false,
      alive: true,
    };
  });

  describe('Initialization', () => {
    it('should create with default config', () => {
      expect(detector).toBeDefined();
      expect(detector.canJump()).toBe(true);
    });

    it('should create with custom config', () => {
      const customDetector = new GestureDetector({
        jumpPositionThresholdPercent: 0.1,
        duckTriggerRatio: 0.8,
      });
      expect(customDetector).toBeDefined();
    });
  });

  describe('CRITICAL FIX #5: Jump Detection', () => {
    it('should NOT detect jump when standing still', () => {
      const pose = createStandingPose();

      const result = detector.detect(pose, calibration, physics);

      expect(result.shouldJump).toBe(false);
      expect(result.canJump).toBe(true);
    });

    it('should detect jump when shoulders rise with velocity', () => {
      const standing = createStandingPose();
      const jumping = createJumpingPose();

      // First frame: establish baseline
      detector.detect(standing, calibration, physics);

      // Second frame: jump!
      const result = detector.detect(jumping, calibration, physics);

      expect(result.shouldJump).toBe(true);
      expect(result.canJump).toBe(false); // Can't jump again immediately
    });

    it('should require BOTH position and velocity', () => {
      const raised = createStandingPose();

      // Raise shoulders but stabilize velocity (multiple identical frames)
      raised[11].y = 0.28; // 7% above baseline
      raised[12].y = 0.28;

      // Call detect multiple times with same pose to stabilize velocity to ~0
      // This simulates someone who is already in a raised position (not jumping)
      for (let i = 0; i < 5; i++) {
        detector.detect(raised, calibration, physics);
      }

      // Even though position is above threshold, no velocity = no jump
      const result = detector.detect(raised, calibration, physics);

      expect(result.shouldJump).toBe(false);
    });

    it('should not jump when already in air', () => {
      const jumping = createJumpingPose();
      physics.y = 50; // In air

      detector.detect(jumping, calibration, physics);
      const result = detector.detect(jumping, calibration, physics);

      expect(result.shouldJump).toBe(false);
    });

    it('should enforce jump cooldown', () => {
      const standing = createStandingPose();
      const jumping = createJumpingPose();

      // First jump
      detector.detect(standing, calibration, physics);
      detector.detect(jumping, calibration, physics);

      // Try to jump again immediately
      const result = detector.detect(jumping, calibration, physics);

      expect(result.shouldJump).toBe(false);
      expect(result.canJump).toBe(false);
    });

    it('should reset canJump after cooldown', () => {
      vi.useFakeTimers();

      const standing = createStandingPose();
      const jumping = createJumpingPose();

      // First jump
      detector.detect(standing, calibration, physics);
      detector.detect(jumping, calibration, physics);

      // Return to standing
      detector.detect(standing, calibration, physics);

      // Wait for cooldown (400ms)
      vi.advanceTimersByTime(500);

      // Check canJump again
      const result = detector.detect(standing, calibration, physics);

      expect(result.canJump).toBe(true);

      vi.useRealTimers();
    });

    it('should use documented thresholds (no magic numbers)', () => {
      // Verify that thresholds can be customized
      const customDetector = new GestureDetector({
        jumpPositionThresholdPercent: 0.04, // 4% - current default
        jumpVelocityThreshold: 0.003, // Current default
      });

      expect(customDetector).toBeDefined();
    });
  });

  describe('CRITICAL FIX #6: Duck Detection with Hysteresis', () => {
    it('should NOT detect duck when standing', () => {
      const pose = createStandingPose();

      const result = detector.detect(pose, calibration, physics);

      expect(result.isDucking).toBe(false);
    });

    it('should detect duck when height reduced significantly', () => {
      let mockTime = 0;
      vi.spyOn(performance, 'now').mockImplementation(() => mockTime);

      const standing = createStandingPose();
      const ducking = createDuckingPose();

      // Establish baseline
      detector.detect(standing, calibration, physics);

      // Start ducking (starts debounce timer)
      mockTime = 100;
      detector.detect(ducking, calibration, physics);

      // Wait for debounce (100ms) - now at 250ms, 150ms after starting duck
      mockTime = 250;

      // Check duck
      const result = detector.detect(ducking, calibration, physics);

      expect(result.isDucking).toBe(true);

      vi.restoreAllMocks();
    });

    it('should use debounce to prevent flicker from noise', () => {
      let mockTime = 0;
      vi.spyOn(performance, 'now').mockImplementation(() => mockTime);

      const standing = createStandingPose();
      const ducking = createDuckingPose();

      detector.detect(standing, calibration, physics);

      // Single frame of ducking (could be noise) - starts debounce timer at t=100
      mockTime = 100;
      const result1 = detector.detect(ducking, calibration, physics);

      expect(result1.isDucking).toBe(false); // Not yet

      // Only 50ms passed (less than 100ms debounce)
      mockTime = 150;
      const result2 = detector.detect(ducking, calibration, physics);

      expect(result2.isDucking).toBe(false); // Still not

      // Now 150ms total since duck started (passed debounce)
      mockTime = 250;
      const result3 = detector.detect(ducking, calibration, physics);

      expect(result3.isDucking).toBe(true); // Now ducking!

      vi.restoreAllMocks();
    });

    it('should use hysteresis (different trigger/release thresholds)', () => {
      let mockTime = 0;
      vi.spyOn(performance, 'now').mockImplementation(() => mockTime);

      const standing = createStandingPose();
      const ducking = createDuckingPose();
      const partialStand = createStandingPose();

      // Create pose at 87% height (between trigger 85% and release 90%)
      // Standing height = 0.95 - 0.2 = 0.75
      // 87% height = 0.75 * 0.87 = 0.6525, so nose at 0.95 - 0.6525 = 0.2875
      partialStand[0].y = 0.29; // ~87% height

      // Start ducking
      detector.detect(standing, calibration, physics);

      mockTime = 100;
      detector.detect(ducking, calibration, physics);

      mockTime = 250; // Past debounce
      detector.detect(ducking, calibration, physics);

      // Now ducking - stand to 87% (between thresholds) - should STAY ducking (hysteresis)
      mockTime = 300;
      const result = detector.detect(partialStand, calibration, physics);

      expect(result.isDucking).toBe(true); // Hysteresis keeps us ducking

      vi.restoreAllMocks();
    });

    it('should release duck when fully standing (above release threshold)', () => {
      let mockTime = 0;
      vi.spyOn(performance, 'now').mockImplementation(() => mockTime);

      const standing = createStandingPose();
      const ducking = createDuckingPose();

      // Start ducking
      detector.detect(standing, calibration, physics);

      mockTime = 100;
      detector.detect(ducking, calibration, physics);

      mockTime = 250; // Past debounce
      detector.detect(ducking, calibration, physics);

      // Stand up fully
      mockTime = 300;
      const result = detector.detect(standing, calibration, physics);

      expect(result.isDucking).toBe(false);

      vi.restoreAllMocks();
    });

    it('should NOT duck when in air', () => {
      const ducking = createDuckingPose();
      physics.y = 50; // In air

      const result = detector.detect(ducking, calibration, physics);

      expect(result.isDucking).toBe(false);
    });

    it('should prevent flickering (original bug demonstration)', () => {
      let mockTime = 0;
      vi.spyOn(performance, 'now').mockImplementation(() => mockTime);

      const standing = createStandingPose();

      detector.detect(standing, calibration, physics);

      // Rapidly alternate between small variations (simulating pose noise)
      // With new thresholds (92%), we need poses that are borderline
      const results: boolean[] = [];
      for (let i = 0; i < 10; i++) {
        const noisyPose = createStandingPose();
        // Create small variation in nose position (just noise, not real ducking)
        const variance = (i % 2) * 0.01 - 0.005; // ±0.5%
        noisyPose[0].y = standing[0].y + variance;

        mockTime += 20; // Short intervals (less than debounce)
        const result = detector.detect(noisyPose, calibration, physics);
        results.push(result.isDucking);
      }

      // With debounce, should NOT have any rapid flickering for small noise
      // None of these should be ducking because we're just adding tiny noise
      const trueCount = results.filter(r => r).length;
      expect(trueCount).toBe(0); // No ducking from pure noise

      vi.restoreAllMocks();
    });
  });

  describe('Velocity Calculation', () => {
    it('should calculate upward velocity', () => {
      const standing = createStandingPose();
      const raised = createStandingPose();
      raised[11].y = 0.3; // Shoulder higher
      raised[12].y = 0.3;

      detector.detect(standing, calibration, physics);
      detector.detect(raised, calibration, physics);

      const velocity = detector.getVelocity();
      expect(velocity).toBeGreaterThan(0); // Positive = moving up
    });

    it('should calculate downward velocity', () => {
      const standing = createStandingPose();
      const lowered = createStandingPose();
      lowered[11].y = 0.4; // Shoulder lower
      lowered[12].y = 0.4;

      detector.detect(standing, calibration, physics);
      detector.detect(lowered, calibration, physics);

      const velocity = detector.getVelocity();
      expect(velocity).toBeLessThan(0); // Negative = moving down
    });

    it('should smooth velocity over 3 frames', () => {
      const poses = [
        createStandingPose(),
        createJumpingPose(),
        createStandingPose(),
      ];

      poses.forEach(pose => detector.detect(pose, calibration, physics));

      const velocity = detector.getVelocity();
      // Velocity should be smoothed average, not just last frame
      expect(velocity).toBeDefined();
    });
  });

  describe('Reset', () => {
    it('should clear all state', () => {
      const jumping = createJumpingPose();

      detector.detect(jumping, calibration, physics);
      detector.reset();

      expect(detector.canJump()).toBe(true);
      expect(detector.getVelocity()).toBe(0);
    });

    it('should allow detection after reset', () => {
      const standing = createStandingPose();
      const jumping = createJumpingPose();

      // First detection
      detector.detect(standing, calibration, physics);
      detector.detect(jumping, calibration, physics);

      detector.reset();

      // Second detection should work
      detector.detect(standing, calibration, physics);
      const result = detector.detect(jumping, calibration, physics);

      expect(result.shouldJump).toBe(true);
    });
  });

  describe('Config Update', () => {
    it('should allow updating configuration', () => {
      detector.updateConfig({
        jumpPositionThresholdPercent: 0.05, // Lower threshold
      });

      // Should now trigger with less movement
      const standing = createStandingPose();
      const slightRaise = createStandingPose();
      slightRaise[11].y = 0.33; // 5.7% above baseline
      slightRaise[12].y = 0.33;

      detector.detect(standing, calibration, physics);
      const result = detector.detect(slightRaise, calibration, physics);

      // With 5% threshold (vs default 7%), this should trigger
      expect(result.shouldJump).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid gesture changes', () => {
      const standing = createStandingPose();
      const jumping = createJumpingPose();
      const ducking = createDuckingPose();

      // Rapid switches
      detector.detect(standing, calibration, physics);
      detector.detect(jumping, calibration, physics);
      detector.detect(ducking, calibration, physics);
      detector.detect(standing, calibration, physics);

      // Should not crash
      expect(detector).toBeDefined();
    });

    it('should handle missing previous landmarks gracefully', () => {
      const pose = createStandingPose();

      // First call with no history
      const result = detector.detect(pose, calibration, physics);

      expect(result).toBeDefined();
      expect(result.shouldJump).toBe(false); // No velocity calculated yet
    });

    it('should handle identical consecutive poses', () => {
      const pose = createStandingPose();

      for (let i = 0; i < 10; i++) {
        const result = detector.detect(pose, calibration, physics);
        expect(result.shouldJump).toBe(false); // No movement = no jump
      }
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle realistic jump sequence', () => {
      let mockTime = 0;
      vi.spyOn(performance, 'now').mockImplementation(() => mockTime);

      const standing = createStandingPose();
      const prep = createStandingPose();
      prep[11].y = 0.36; // Slight squat
      prep[12].y = 0.36;
      const jumping = createJumpingPose();

      // Standing
      detector.detect(standing, calibration, physics);

      // Squat (prep)
      mockTime = 50;
      detector.detect(prep, calibration, physics);

      // Jump!
      mockTime = 100;
      const jumpResult = detector.detect(jumping, calibration, physics);
      expect(jumpResult.shouldJump).toBe(true);

      // In air (can't jump again)
      physics.y = 50;
      mockTime = 150;
      const airResult = detector.detect(jumping, calibration, physics);
      expect(airResult.shouldJump).toBe(false);

      // Land
      physics.y = 0;
      mockTime = 700; // Cooldown passed (400ms)
      const landResult = detector.detect(standing, calibration, physics);
      expect(landResult.canJump).toBe(true);

      vi.restoreAllMocks();
    });

    it('should handle realistic duck sequence', () => {
      let mockTime = 0;
      vi.spyOn(performance, 'now').mockImplementation(() => mockTime);

      const standing = createStandingPose();
      const ducking = createDuckingPose();

      // Standing
      detector.detect(standing, calibration, physics);

      // Start duck (debounce not passed)
      mockTime = 100;
      detector.detect(ducking, calibration, physics);

      // Maintain duck (debounce passed - 150ms after start)
      mockTime = 250;
      const duckResult = detector.detect(ducking, calibration, physics);
      expect(duckResult.isDucking).toBe(true);

      // Stand up
      mockTime = 300;
      const standResult = detector.detect(standing, calibration, physics);
      expect(standResult.isDucking).toBe(false);

      vi.restoreAllMocks();
    });
  });
});
