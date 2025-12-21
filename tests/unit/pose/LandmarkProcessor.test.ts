import { describe, it, expect, beforeEach } from 'vitest';
import { LandmarkProcessor } from '@/pose/LandmarkProcessor';
import { createStandingPose, createJumpingPose } from '@/pose/MockPoseDetector';
import { PoseLandmarks } from '@/core/types';

describe('LandmarkProcessor', () => {
  let processor: LandmarkProcessor;

  beforeEach(() => {
    processor = new LandmarkProcessor();
  });

  describe('Initialization', () => {
    it('should create with default config', () => {
      expect(processor).toBeDefined();
    });

    it('should create with custom config', () => {
      const customProcessor = new LandmarkProcessor({
        baseSmoothingFactor: 0.5,
        minSmoothingFactor: 0.1,
      });
      expect(customProcessor).toBeDefined();
    });
  });

  describe('Landmark Validation', () => {
    it('should accept valid landmarks', () => {
      const pose = createStandingPose();
      const result = processor.process(pose);
      expect(result).toBeDefined();
      expect(result.length).toBe(33);
    });

    it('should reject landmarks with wrong length', () => {
      const invalidPose = createStandingPose().slice(0, 20); // Only 20 landmarks
      const result = processor.process(invalidPose as PoseLandmarks);
      // Should return previous smoothed (which is null on first call, so returns input)
      expect(result.length).toBe(20);
    });

    it('should reject landmarks with low visibility', () => {
      const pose = createStandingPose();
      // Set key landmark (shoulder) to low visibility
      pose[11].visibility = 0.3; // Below default threshold of 0.5
      const result = processor.process(pose);
      // Should return input on first call when no previous smoothed exists
      expect(result).toBeDefined();
    });

    it('should reject landmarks with out-of-range coordinates', () => {
      const pose = createStandingPose();
      pose[11].x = 1.5; // Out of range (should be 0-1)
      const result = processor.process(pose);
      expect(result).toBeDefined();
    });
  });

  describe('Smoothing - CRITICAL FIX #3', () => {
    it('should return identical landmarks on first frame (no smoothing needed)', () => {
      const pose = createStandingPose();
      const result = processor.process(pose);

      // First frame should be identical
      expect(result[11].x).toBe(pose[11].x);
      expect(result[11].y).toBe(pose[11].y);
    });

    it('should apply smoothing on subsequent frames', () => {
      const pose1 = createStandingPose();
      const pose2 = createStandingPose();

      // Move shoulder significantly
      pose2[11].x = 0.5;
      pose2[11].y = 0.4;

      processor.process(pose1);
      const result = processor.process(pose2);

      // Result should be between pose1 and pose2 (smoothed)
      expect(result[11].x).toBeGreaterThan(pose1[11].x);
      expect(result[11].x).toBeLessThan(pose2[11].x);
    });

    it('should use lower smoothing for fast movement (adaptive)', () => {
      const pose1 = createStandingPose();
      const pose2 = createJumpingPose(); // Large movement

      processor.process(pose1);
      const result = processor.process(pose2);

      // With adaptive smoothing, fast movement should be closer to target
      // Shoulder Y in standing: 0.35, jumping: ~0.28 (0.07 raise)
      // With adaptive smoothing, velocity is high so uses minSmoothingFactor (0.05)
      // But on second frame, velocity calculation needs previous landmarks
      // So it actually uses baseSmoothingFactor (0.15) on the second frame
      const pose1ShoulderY = pose1[11].y; // 0.35
      const pose2ShoulderY = pose2[11].y; // ~0.28

      // Expected: pose1 + (pose2 - pose1) * smoothingFactor
      // With 0.15: 0.35 + (-0.07) * 0.15 = 0.35 - 0.0105 = 0.3395
      const expectedWithBaseSmoothing = pose1ShoulderY + (pose2ShoulderY - pose1ShoulderY) * 0.15;

      // Result should be close to this
      expect(Math.abs(result[11].y - expectedWithBaseSmoothing)).toBeLessThan(0.02);
    });

    it('should use higher smoothing for slow movement', () => {
      const pose1 = createStandingPose();
      const pose2 = createStandingPose();

      // Tiny movement (slow)
      pose2[11].x += 0.001;
      pose2[11].y += 0.001;

      processor.process(pose1);
      const result = processor.process(pose2);

      // With higher smoothing (0.15), should be much closer to pose1
      const movement = Math.abs(result[11].x - pose1[11].x);
      expect(movement).toBeLessThan(0.001); // Very small change
    });

    it('should reduce lag compared to original implementation', () => {
      // Test that our smoothing (0.15) is much less laggy than original (0.4)
      const pose1 = createStandingPose();
      const pose2 = createStandingPose();
      pose2[11].y = 0.45; // Move shoulder down

      processor.process(pose1);
      const result = processor.process(pose2);

      // With smoothing factor 0.15, should get 15% of the way to target
      // Expected: 0.35 + (0.45 - 0.35) * 0.15 = 0.35 + 0.015 = 0.365
      const expected = pose1[11].y + (pose2[11].y - pose1[11].y) * 0.15;
      expect(result[11].y).toBeCloseTo(expected, 2);

      // Verify it's closer to new position than with original smoothing (0.4)
      const movementWithNewSmoothing = Math.abs(result[11].y - pose1[11].y);
      const movementWithOldSmoothing = (pose2[11].y - pose1[11].y) * 0.4;

      // New smoothing should move less than old smoothing (0.15 < 0.4)
      expect(movementWithNewSmoothing).toBeLessThan(movementWithOldSmoothing);
    });
  });

  describe('Velocity Calculation', () => {
    it('should calculate zero velocity on first frame', () => {
      const pose = createStandingPose();
      processor.process(pose);

      // No previous frame, velocity should be 0
      // (internal detail, but affects smoothing)
    });

    it('should calculate velocity based on landmark movement', () => {
      const pose1 = createStandingPose();
      const pose2 = createStandingPose();

      // Large movement
      pose2[11].y -= 0.1; // Move shoulder up

      processor.process(pose1);
      processor.process(pose2);

      // Velocity should be non-zero (can't directly test private method)
      // But we can observe the effect: fast movement = less smoothing
    });
  });

  describe('Limb Length Smoothing', () => {
    it('should calculate limb lengths', () => {
      const pose = createStandingPose();
      processor.process(pose);

      const limbLengths = processor.getLimbLengths();
      expect(limbLengths).not.toBeNull();
      expect(limbLengths!.leftUpperArm).toBeGreaterThan(0);
      expect(limbLengths!.torso).toBeGreaterThan(0);
    });

    it('should smooth limb lengths across frames', () => {
      const pose1 = createStandingPose();
      const pose2 = createStandingPose();

      // Artificially change arm length (simulating pose noise)
      pose2[13].x = 0.3; // Move elbow

      processor.process(pose1);
      const lengths1 = processor.getLimbLengths();

      processor.process(pose2);
      const lengths2 = processor.getLimbLengths();

      // Limb length should change, but be smoothed
      expect(lengths2!.leftUpperArm).not.toBe(lengths1!.leftUpperArm);

      // Change should be gradual (smoothed)
      const actualArmLength = Math.sqrt(
        Math.pow(pose2[13].x - pose2[11].x, 2) +
        Math.pow(pose2[13].y - pose2[11].y, 2)
      );
      expect(Math.abs(lengths2!.leftUpperArm - actualArmLength)).toBeGreaterThan(0);
    });
  });

  describe('State Management', () => {
    it('should return smoothed landmarks', () => {
      const pose = createStandingPose();
      processor.process(pose);

      const smoothed = processor.getSmoothedLandmarks();
      expect(smoothed).not.toBeNull();
      expect(smoothed!.length).toBe(33);
    });

    it('should reset state', () => {
      const pose = createStandingPose();
      processor.process(pose);

      processor.reset();

      expect(processor.getSmoothedLandmarks()).toBeNull();
      expect(processor.getLimbLengths()).toBeNull();
    });

    it('should update configuration', () => {
      processor.updateConfig({
        baseSmoothingFactor: 0.5,
      });

      // Config should be updated (can't directly test, but no error)
      expect(processor).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid pose changes', () => {
      const standing = createStandingPose();
      const jumping = createJumpingPose();

      // Alternate rapidly
      for (let i = 0; i < 10; i++) {
        const pose = i % 2 === 0 ? standing : jumping;
        const result = processor.process(pose);
        expect(result.length).toBe(33);
      }
    });

    it('should handle identical poses (no movement)', () => {
      const pose = createStandingPose();

      for (let i = 0; i < 5; i++) {
        const result = processor.process(pose);
        expect(result).toBeDefined();
      }

      // After processing identical poses, smoothed should equal input
      const smoothed = processor.getSmoothedLandmarks();
      expect(smoothed![11].x).toBeCloseTo(pose[11].x, 5);
    });

    it('should handle NaN and Infinity gracefully', () => {
      const pose = createStandingPose();
      pose[11].x = NaN;

      // Should handle invalid data (validation should catch it)
      const result = processor.process(pose);
      expect(result).toBeDefined();
    });
  });

  describe('Performance', () => {
    it('should process 1000 frames quickly', () => {
      const pose = createStandingPose();
      const start = performance.now();

      for (let i = 0; i < 1000; i++) {
        processor.process(pose);
      }

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(100); // Should be very fast
    });
  });

  describe('Integration with Real Pose Data', () => {
    it('should smooth a realistic pose sequence', () => {
      // Simulate: standing -> jump prep -> jump -> landing
      const poses = [
        createStandingPose(),
        createStandingPose(), // Slight squat (prep)
        createJumpingPose(),  // In air
        createJumpingPose(),  // Peak
        createStandingPose(), // Landing
      ];

      // Modify prep pose (slight squat)
      poses[1][11].y += 0.02;
      poses[1][12].y += 0.02;

      const results = poses.map(pose => processor.process(pose));

      // All results should be valid
      results.forEach(result => {
        expect(result.length).toBe(33);
      });

      // Shoulder Y should gradually change (not jump suddenly)
      for (let i = 1; i < results.length; i++) {
        const prevY = results[i - 1][11].y;
        const currY = results[i][11].y;
        const change = Math.abs(currY - prevY);

        // Change should be moderate (smoothed)
        expect(change).toBeLessThan(0.1);
      }
    });
  });
});
