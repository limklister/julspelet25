import { describe, it, expect, beforeEach } from 'vitest';
import { CalibrationService } from '@/pose/CalibrationService';
import { createStandingPose } from '@/pose/MockPoseDetector';
import { PoseLandmarks } from '@/core/types';

describe('CalibrationService', () => {
  let service: CalibrationService;

  beforeEach(() => {
    service = new CalibrationService({
      calibrationFrames: 10, // Use fewer frames for faster tests
      maxVariance: 0.001,
      outlierStdDevThreshold: 2.0,
    });
  });

  describe('Initialization', () => {
    it('should create with default config', () => {
      const defaultService = new CalibrationService();
      expect(defaultService).toBeDefined();
    });

    it('should start with zero progress', () => {
      expect(service.getProgress()).toBe(0);
      expect(service.getSampleCount()).toBe(0);
    });
  });

  describe('Frame Collection', () => {
    it('should collect valid frames', () => {
      const pose = createStandingPose();
      const complete = service.addFrame(pose);

      expect(service.getSampleCount()).toBe(1);
      expect(complete).toBe(false);
    });

    it('should skip invalid frames', () => {
      const invalidPose = createStandingPose().slice(0, 20) as PoseLandmarks; // Only 20 landmarks
      const complete = service.addFrame(invalidPose);

      expect(service.getSampleCount()).toBe(0);
      expect(complete).toBe(false);
    });

    it('should complete after collecting enough frames', () => {
      const pose = createStandingPose();

      for (let i = 0; i < 9; i++) {
        const complete = service.addFrame(pose);
        expect(complete).toBe(false);
      }

      const complete = service.addFrame(pose);
      expect(complete).toBe(true);
      expect(service.getSampleCount()).toBe(10);
    });

    it('should track progress', () => {
      const pose = createStandingPose();

      for (let i = 0; i < 5; i++) {
        service.addFrame(pose);
      }

      expect(service.getProgress()).toBe(0.5);
    });
  });

  describe('Finalization', () => {
    it('should fail if not enough samples', () => {
      const pose = createStandingPose();
      service.addFrame(pose);

      const result = service.finalize();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Not enough samples');
    });

    it('should succeed with stable poses', () => {
      const pose = createStandingPose();

      for (let i = 0; i < 10; i++) {
        service.addFrame(pose);
      }

      const result = service.finalize();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.isCalibrated).toBe(true);
    });

    it('should calculate baseline values', () => {
      const pose = createStandingPose();

      for (let i = 0; i < 10; i++) {
        service.addFrame(pose);
      }

      const result = service.finalize();

      expect(result.data!.baselineShoulderY).toBeCloseTo(0.35, 2);
      expect(result.data!.baselineHeight).toBeGreaterThan(0);
      expect(result.data!.bodyScale).toBeGreaterThan(0);
    });

    it('should reject calibration with too much movement', () => {
      const pose1 = createStandingPose();
      const pose2 = createStandingPose();

      // Significantly different pose (simulating movement)
      pose2[11].y = 0.5; // Move shoulder down
      pose2[12].y = 0.5;

      // Alternate between poses
      for (let i = 0; i < 10; i++) {
        service.addFrame(i % 2 === 0 ? pose1 : pose2);
      }

      const result = service.finalize();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Too much movement');
      expect(result.stability).toBeDefined();
      expect(result.stability!).toBeLessThan(1);
    });
  });

  describe('CRITICAL FIX #4: Outlier Rejection', () => {
    it('should use median instead of mean', () => {
      // Use higher maxVariance to allow outliers without failing variance check
      const outlierService = new CalibrationService({
        calibrationFrames: 10,
        maxVariance: 0.1, // Higher tolerance for this test
        outlierStdDevThreshold: 2.0,
      });

      const pose = createStandingPose();

      // Add 8 normal frames
      for (let i = 0; i < 8; i++) {
        outlierService.addFrame(pose);
      }

      // Add 2 outlier frames
      const outlierPose = createStandingPose();
      outlierPose[11].y = 0.8; // Way off
      outlierPose[12].y = 0.8;
      outlierService.addFrame(outlierPose);
      outlierService.addFrame(outlierPose);

      const result = outlierService.finalize();

      expect(result.success).toBe(true);
      // Baseline should be close to normal pose (0.35), not affected by outliers
      expect(result.data!.baselineShoulderY).toBeCloseTo(0.35, 1);
      expect(Math.abs(result.data!.baselineShoulderY - 0.8)).toBeGreaterThan(0.2);
    });

    it('should filter values beyond 2 std deviations', () => {
      // Use higher maxVariance to allow outliers without failing variance check
      const outlierService = new CalibrationService({
        calibrationFrames: 10,
        maxVariance: 0.1, // Higher tolerance for this test
        outlierStdDevThreshold: 2.0,
      });

      const normalPose = createStandingPose();
      const extremePose = createStandingPose();
      extremePose[11].y = 0.9;
      extremePose[12].y = 0.9;

      // Add mostly normal with one extreme
      for (let i = 0; i < 9; i++) {
        outlierService.addFrame(normalPose);
      }
      outlierService.addFrame(extremePose);

      const result = outlierService.finalize();

      // Should ignore the extreme value
      expect(result.success).toBe(true);
      expect(result.data!.baselineShoulderY).toBeCloseTo(0.35, 2);
    });

    it('should handle all identical values', () => {
      const pose = createStandingPose();

      for (let i = 0; i < 10; i++) {
        const clonedPose = createStandingPose(); // Exact same pose
        service.addFrame(clonedPose);
      }

      const result = service.finalize();

      expect(result.success).toBe(true);
      expect(result.stability).toBeCloseTo(1, 1); // Perfect stability
    });

    it('should compare to original simple average (bug demonstration)', () => {
      // Use higher maxVariance to allow outliers without failing variance check
      const outlierService = new CalibrationService({
        calibrationFrames: 10,
        maxVariance: 0.1, // Higher tolerance for this test
        outlierStdDevThreshold: 2.0,
      });

      const pose = createStandingPose();
      const badPose = createStandingPose();
      badPose[11].y = 0.9; // Extreme outlier
      badPose[12].y = 0.9;

      // Collect samples: 9 good + 1 bad
      const samples: number[] = [];
      for (let i = 0; i < 9; i++) {
        samples.push(0.35); // Normal shoulder Y
      }
      samples.push(0.9); // Bad frame

      // Original approach (simple average)
      const simpleAverage = samples.reduce((a, b) => a + b) / samples.length;
      // = (9 * 0.35 + 0.9) / 10 = 4.05 / 10 = 0.405

      // Our approach (add to service and finalize)
      for (let i = 0; i < 9; i++) {
        outlierService.addFrame(pose);
      }
      outlierService.addFrame(badPose);

      const result = outlierService.finalize();
      const ourBaseline = result.data!.baselineShoulderY;

      // Our baseline should be much closer to 0.35 than simple average
      expect(Math.abs(ourBaseline - 0.35)).toBeLessThan(Math.abs(simpleAverage - 0.35));
      expect(simpleAverage).toBeCloseTo(0.405, 3);
      expect(ourBaseline).toBeCloseTo(0.35, 1);
    });
  });

  describe('Stability Score', () => {
    it('should return 1 for perfectly stable calibration', () => {
      const pose = createStandingPose();

      for (let i = 0; i < 10; i++) {
        service.addFrame(pose);
      }

      const stability = service.getStability();
      expect(stability).toBeCloseTo(1, 1);
    });

    it('should return lower score for unstable calibration', () => {
      const pose1 = createStandingPose();
      const pose2 = createStandingPose();
      pose2[11].y = 0.36; // Slight variation
      pose2[12].y = 0.36;

      for (let i = 0; i < 10; i++) {
        service.addFrame(i % 2 === 0 ? pose1 : pose2);
      }

      const stability = service.getStability();
      expect(stability).toBeLessThan(1);
      expect(stability).toBeGreaterThan(0);
    });
  });

  describe('Reset', () => {
    it('should clear all samples', () => {
      const pose = createStandingPose();

      for (let i = 0; i < 5; i++) {
        service.addFrame(pose);
      }

      service.reset();

      expect(service.getSampleCount()).toBe(0);
      expect(service.getProgress()).toBe(0);
    });

    it('should allow recalibration after reset', () => {
      const pose = createStandingPose();

      // First calibration
      for (let i = 0; i < 10; i++) {
        service.addFrame(pose);
      }

      service.reset();

      // Second calibration
      for (let i = 0; i < 10; i++) {
        service.addFrame(pose);
      }

      const result = service.finalize();
      expect(result.success).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle poses with missing landmarks gracefully', () => {
      const badPose = createStandingPose();
      delete (badPose as any)[11]; // Remove shoulder

      service.addFrame(badPose);

      expect(service.getSampleCount()).toBe(0); // Should skip
    });

    it('should handle poses with low visibility', () => {
      const lowVisPose = createStandingPose();
      lowVisPose[11].visibility = 0.1; // Very low

      service.addFrame(lowVisPose);

      expect(service.getSampleCount()).toBe(0); // Should skip
    });

    it('should handle extreme variance', () => {
      const poses = [];
      for (let i = 0; i < 10; i++) {
        const pose = createStandingPose();
        pose[11].y = 0.3 + i * 0.1; // Wildly different
        pose[12].y = 0.3 + i * 0.1;
        poses.push(pose);
      }

      poses.forEach(pose => service.addFrame(pose));

      const result = service.finalize();
      expect(result.success).toBe(false);
    });
  });
});
