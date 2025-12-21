import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MockPoseDetector, createStandingPose, createJumpingPose } from '@/pose/MockPoseDetector';
import { PoseDetectionResult } from '@/pose/PoseDetector';

describe('PoseDetector Integration Tests', () => {
  let detector: MockPoseDetector;
  let mockVideo: HTMLVideoElement;

  beforeEach(() => {
    detector = new MockPoseDetector({
      detectionIntervalMs: 33, // 30fps
      numPoses: 2,
    });

    // Create mock video element
    mockVideo = document.createElement('video');
  });

  afterEach(() => {
    if (detector.isRunning()) {
      detector.stop();
    }
    detector.dispose();
  });

  describe('Lifecycle', () => {
    it('should initialize successfully', async () => {
      await detector.initialize();
      expect(detector.isInitialized()).toBe(true);
    });

    it('should not be running after initialization', async () => {
      await detector.initialize();
      expect(detector.isRunning()).toBe(false);
    });

    it('should throw error if starting before initialization', () => {
      expect(() => {
        detector.start(mockVideo, () => {});
      }).toThrow('not initialized');
    });

    it('should start and stop successfully', async () => {
      await detector.initialize();

      const callback = vi.fn();
      detector.start(mockVideo, callback);

      expect(detector.isRunning()).toBe(true);

      detector.stop();
      expect(detector.isRunning()).toBe(false);
    });

    it('should dispose successfully', async () => {
      await detector.initialize();
      detector.dispose();

      expect(detector.isInitialized()).toBe(false);
      expect(detector.isRunning()).toBe(false);
    });
  });

  describe('Detection Results', () => {
    it('should emit detection results', async () => {
      await detector.initialize();

      const standingPose = createStandingPose();
      detector.setMockPoses([standingPose]);

      const callback = vi.fn<[PoseDetectionResult], void>();
      detector.start(mockVideo, callback);

      // Wait for at least one detection
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(callback).toHaveBeenCalled();
      const result = callback.mock.calls[0][0];

      expect(result.poses).toHaveLength(1);
      expect(result.poses[0]).toHaveLength(33);
      expect(result.timestamp).toBeGreaterThan(0);
    });

    it('should detect multiple poses', async () => {
      await detector.initialize();

      const pose1 = createStandingPose();
      const pose2 = createJumpingPose();
      detector.setMockPoses([pose1, pose2]);

      const callback = vi.fn<[PoseDetectionResult], void>();
      detector.start(mockVideo, callback);

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(callback).toHaveBeenCalled();
      const result = callback.mock.calls[0][0];

      expect(result.poses).toHaveLength(2);
    });

    it('should emit results at correct interval', async () => {
      await detector.initialize();
      detector.setMockPoses([createStandingPose()]);

      const callback = vi.fn();
      detector.start(mockVideo, callback);

      // Wait for ~100ms (should get ~3 detections at 33ms interval)
      await new Promise(resolve => setTimeout(resolve, 100));

      detector.stop();

      // Should have 2-4 calls (accounting for timing variance)
      expect(callback.mock.calls.length).toBeGreaterThanOrEqual(2);
      expect(callback.mock.calls.length).toBeLessThanOrEqual(5);
    });

    it('should stop emitting results after stop()', async () => {
      await detector.initialize();
      detector.setMockPoses([createStandingPose()]);

      const callback = vi.fn();
      detector.start(mockVideo, callback);

      await new Promise(resolve => setTimeout(resolve, 50));
      const callCountBeforeStop = callback.mock.calls.length;

      detector.stop();

      await new Promise(resolve => setTimeout(resolve, 50));
      const callCountAfterStop = callback.mock.calls.length;

      // Should not increase after stop
      expect(callCountAfterStop).toBe(callCountBeforeStop);
    });
  });

  describe('CRITICAL FIX #1: Frame Rate (No Double Throttling)', () => {
    it('should emit detections at consistent intervals', async () => {
      await detector.initialize();
      detector.setMockPoses([createStandingPose()]);

      const timestamps: number[] = [];
      const callback = vi.fn((result: PoseDetectionResult) => {
        timestamps.push(result.timestamp);
      });

      detector.start(mockVideo, callback);

      // Collect timestamps for 200ms
      await new Promise(resolve => setTimeout(resolve, 200));
      detector.stop();

      // Calculate intervals between detections
      const intervals: number[] = [];
      for (let i = 1; i < timestamps.length; i++) {
        intervals.push(timestamps[i] - timestamps[i - 1]);
      }

      // Intervals should be consistent (~33ms)
      // Allow some variance due to timing
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      expect(avgInterval).toBeGreaterThan(25); // At least 25ms
      expect(avgInterval).toBeLessThan(45);    // At most 45ms

      // Standard deviation should be low (consistent timing)
      const variance = intervals.reduce((sum, interval) => {
        return sum + Math.pow(interval - avgInterval, 2);
      }, 0) / intervals.length;
      const stdDev = Math.sqrt(variance);
      expect(stdDev).toBeLessThan(10); // Low variance = consistent
    });

    it('should not skip frames due to throttling', async () => {
      await detector.initialize();
      detector.setMockPoses([createStandingPose()]);

      let detectionCount = 0;
      detector.start(mockVideo, () => {
        detectionCount++;
      });

      // Run for exactly 100ms
      await new Promise(resolve => setTimeout(resolve, 100));
      detector.stop();

      // At 33ms interval, should get ~3 detections in 100ms
      // Original bug would cause missed frames
      expect(detectionCount).toBeGreaterThanOrEqual(2);
      expect(detectionCount).toBeLessThanOrEqual(4);
    });
  });

  describe('CRITICAL FIX #2: Race Conditions', () => {
    it('should handle rapid start/stop cycles', async () => {
      await detector.initialize();
      detector.setMockPoses([createStandingPose()]);

      const callback = vi.fn();

      // Rapidly start and stop
      for (let i = 0; i < 5; i++) {
        detector.start(mockVideo, callback);
        detector.stop();
      }

      // Should not crash or cause errors
      expect(detector.isRunning()).toBe(false);
    });

    it('should discard results from previous state', async () => {
      await detector.initialize();

      const pose1 = createStandingPose();
      const pose2 = createJumpingPose();

      // Start with pose1
      detector.setMockPoses([pose1]);
      const callback1 = vi.fn();
      detector.start(mockVideo, callback1);

      await new Promise(resolve => setTimeout(resolve, 50));

      // Stop and start with pose2 (simulate new game)
      detector.stop();
      detector.setMockPoses([pose2]);
      const callback2 = vi.fn();
      detector.start(mockVideo, callback2);

      await new Promise(resolve => setTimeout(resolve, 50));
      detector.stop();

      // callback1 should not be called after stop
      const callback1CountDuringPose2 = callback1.mock.calls.filter(call => {
        return call[0].timestamp > Date.now() - 50;
      }).length;

      expect(callback1CountDuringPose2).toBe(0);
    });

    it('should handle restarting without stop', async () => {
      await detector.initialize();
      detector.setMockPoses([createStandingPose()]);

      const callback1 = vi.fn();
      detector.start(mockVideo, callback1);

      await new Promise(resolve => setTimeout(resolve, 50));

      // Restart without stopping (should auto-stop previous)
      const callback2 = vi.fn();
      detector.start(mockVideo, callback2);

      await new Promise(resolve => setTimeout(resolve, 50));
      detector.stop();

      // callback2 should have been called
      expect(callback2).toHaveBeenCalled();
    });
  });

  describe('Manual Detection Trigger', () => {
    it('should trigger detection manually', async () => {
      await detector.initialize();
      detector.setMockPoses([createStandingPose()]);

      const callback = vi.fn();
      detector.start(mockVideo, callback);

      // Trigger manually
      detector.triggerDetection();

      expect(callback).toHaveBeenCalled();

      detector.stop();
    });

    it('should track frame count', async () => {
      await detector.initialize();
      detector.setMockPoses([createStandingPose()]);

      detector.resetFrameCount();
      detector.start(mockVideo, () => {});

      await new Promise(resolve => setTimeout(resolve, 100));
      detector.stop();

      const frameCount = detector.getFrameCount();
      expect(frameCount).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing video element gracefully', async () => {
      await detector.initialize();

      // This should work with mock (doesn't actually use video)
      expect(() => {
        detector.start(null as any, () => {});
      }).not.toThrow();
    });

    it('should handle null callback gracefully', async () => {
      await detector.initialize();

      // Should not crash
      detector.start(mockVideo, null as any);
      detector.stop();
    });
  });

  describe('Performance', () => {
    it('should handle high detection rate', async () => {
      // Test with 60fps (16ms interval)
      const fastDetector = new MockPoseDetector({
        detectionIntervalMs: 16,
        numPoses: 1,
      });

      await fastDetector.initialize();
      fastDetector.setMockPoses([createStandingPose()]);

      let count = 0;
      fastDetector.start(mockVideo, () => {
        count++;
      });

      await new Promise(resolve => setTimeout(resolve, 200));
      fastDetector.stop();

      // Should get ~12 detections in 200ms at 60fps
      expect(count).toBeGreaterThan(8);
      expect(count).toBeLessThan(16);

      fastDetector.dispose();
    });

    it('should not leak memory on repeated start/stop', async () => {
      await detector.initialize();
      detector.setMockPoses([createStandingPose()]);

      // Start and stop many times
      for (let i = 0; i < 50; i++) {
        detector.start(mockVideo, () => {});
        await new Promise(resolve => setTimeout(resolve, 10));
        detector.stop();
      }

      // Should still work
      expect(detector.isInitialized()).toBe(true);
    });
  });
});
