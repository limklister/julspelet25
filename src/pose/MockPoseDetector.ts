/**
 * MockPoseDetector - Mock implementation for testing
 * Allows testing without real camera or MediaPipe
 */

import {
  PoseDetector,
  PoseDetectorConfig,
  PoseDetectionCallback,
  PoseDetectionResult,
  DEFAULT_POSE_DETECTOR_CONFIG,
} from './PoseDetector';
import { PoseLandmarks } from '@/core/types';

/**
 * Mock pose detector for testing
 */
export class MockPoseDetector implements PoseDetector {
  private config: PoseDetectorConfig;
  private initialized = false;
  private running = false;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private callback: PoseDetectionCallback | null = null;

  // Mock data to return
  private mockPoses: PoseLandmarks[] = [];
  private frameCount = 0;

  constructor(config: Partial<PoseDetectorConfig> = {}) {
    this.config = { ...DEFAULT_POSE_DETECTOR_CONFIG, ...config };
  }

  /**
   * Set mock pose data to return
   */
  setMockPoses(poses: PoseLandmarks[]): void {
    this.mockPoses = poses;
  }

  /**
   * Initialize (instant for mock)
   */
  async initialize(): Promise<void> {
    this.initialized = true;
  }

  /**
   * Start mock detection
   */
  start(_videoElement: HTMLVideoElement, callback: PoseDetectionCallback): void {
    if (!this.initialized) {
      throw new Error('Detector not initialized');
    }

    if (this.running) {
      this.stop();
    }

    this.callback = callback;
    this.running = true;
    this.frameCount = 0;

    // Emit mock results at configured interval
    this.intervalId = setInterval(() => {
      this.emitMockResult();
    }, this.config.detectionIntervalMs);
  }

  /**
   * Emit a mock detection result
   */
  private emitMockResult(): void {
    if (!this.callback || !this.running) return;

    const result: PoseDetectionResult = {
      poses: this.mockPoses.map(pose => [...pose]), // Clone
      timestamp: performance.now(),
      processingTime: 1, // Instant for mock
    };

    this.frameCount++;
    this.callback(result);
  }

  /**
   * Manually trigger detection (for testing)
   */
  triggerDetection(): void {
    this.emitMockResult();
  }

  /**
   * Stop detection
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.running = false;
    this.callback = null;
  }

  /**
   * Check if running
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Check if initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Clean up
   */
  dispose(): void {
    this.stop();
    this.initialized = false;
  }

  /**
   * Get frame count (for testing)
   */
  getFrameCount(): number {
    return this.frameCount;
  }

  /**
   * Reset frame count
   */
  resetFrameCount(): void {
    this.frameCount = 0;
  }
}

/**
 * Helper: Create a standing pose (default neutral position)
 */
export function createStandingPose(): PoseLandmarks {
  // Create 33 landmarks for a standing person
  // Simplified for testing - just key points with reasonable positions
  const landmarks: PoseLandmarks = [];

  // Nose (0)
  landmarks[0] = { x: 0.5, y: 0.2, z: 0, visibility: 1.0 };

  // Eyes (1-4)
  for (let i = 1; i <= 4; i++) {
    landmarks[i] = { x: 0.5, y: 0.18, z: 0, visibility: 1.0 };
  }

  // Ears (7, 8)
  landmarks[7] = { x: 0.45, y: 0.18, z: 0, visibility: 1.0 };
  landmarks[8] = { x: 0.55, y: 0.18, z: 0, visibility: 1.0 };

  // Mouth (9, 10)
  landmarks[9] = { x: 0.48, y: 0.22, z: 0, visibility: 1.0 };
  landmarks[10] = { x: 0.52, y: 0.22, z: 0, visibility: 1.0 };

  // Shoulders (11, 12)
  landmarks[11] = { x: 0.4, y: 0.35, z: 0, visibility: 1.0 };
  landmarks[12] = { x: 0.6, y: 0.35, z: 0, visibility: 1.0 };

  // Elbows (13, 14)
  landmarks[13] = { x: 0.35, y: 0.5, z: 0, visibility: 1.0 };
  landmarks[14] = { x: 0.65, y: 0.5, z: 0, visibility: 1.0 };

  // Wrists (15, 16)
  landmarks[15] = { x: 0.3, y: 0.65, z: 0, visibility: 1.0 };
  landmarks[16] = { x: 0.7, y: 0.65, z: 0, visibility: 1.0 };

  // Hands (17-22) - simplified
  for (let i = 17; i <= 22; i++) {
    const isLeft = i < 20;
    landmarks[i] = { x: isLeft ? 0.3 : 0.7, y: 0.68, z: 0, visibility: 1.0 };
  }

  // Hips (23, 24)
  landmarks[23] = { x: 0.45, y: 0.7, z: 0, visibility: 1.0 };
  landmarks[24] = { x: 0.55, y: 0.7, z: 0, visibility: 1.0 };

  // Knees (25, 26)
  landmarks[25] = { x: 0.45, y: 0.85, z: 0, visibility: 1.0 };
  landmarks[26] = { x: 0.55, y: 0.85, z: 0, visibility: 1.0 };

  // Ankles (27, 28)
  landmarks[27] = { x: 0.45, y: 0.95, z: 0, visibility: 1.0 };
  landmarks[28] = { x: 0.55, y: 0.95, z: 0, visibility: 1.0 };

  // Feet (29-32)
  landmarks[29] = { x: 0.44, y: 0.98, z: 0, visibility: 1.0 };
  landmarks[30] = { x: 0.54, y: 0.98, z: 0, visibility: 1.0 };
  landmarks[31] = { x: 0.43, y: 0.99, z: 0, visibility: 1.0 };
  landmarks[32] = { x: 0.56, y: 0.99, z: 0, visibility: 1.0 };

  return landmarks;
}

/**
 * Helper: Create a jumping pose (shoulders raised)
 */
export function createJumpingPose(): PoseLandmarks {
  const pose = createStandingPose();

  // Raise shoulders, arms, and head (7% higher for jump detection)
  const raiseAmount = 0.07;

  // Raise upper body
  pose[0].y -= raiseAmount;  // Nose
  pose[11].y -= raiseAmount; // Left shoulder
  pose[12].y -= raiseAmount; // Right shoulder
  pose[13].y -= raiseAmount; // Left elbow
  pose[14].y -= raiseAmount; // Right elbow
  pose[15].y -= raiseAmount; // Left wrist
  pose[16].y -= raiseAmount; // Right wrist

  return pose;
}

/**
 * Helper: Create a ducking pose (compressed height)
 * Standing height: ankle(0.95) - nose(0.2) = 0.75
 * Duck trigger is 85% of baseline, so we need height < 0.75 * 0.85 = 0.6375
 * We'll set nose at 0.4 giving height = 0.95 - 0.4 = 0.55 (73% of standing)
 */
export function createDuckingPose(): PoseLandmarks {
  const pose = createStandingPose();

  // Move nose down significantly (simulating crouching)
  pose[0].y = 0.4; // Was 0.2, now 0.4 (ducking)

  // Move shoulders down to match crouching posture
  pose[11].y = 0.55; // Was 0.35, now 0.55
  pose[12].y = 0.55;

  // Move elbows down
  pose[13].y = 0.65; // Was 0.5
  pose[14].y = 0.65;

  return pose;
}
