/**
 * MediaPipePoseDetector - MediaPipe implementation of PoseDetector
 *
 * CRITICAL FIXES:
 * Fix #1: Frame Rate - Remove double throttling (setInterval + manual check)
 * Fix #2: Race Conditions - Validate state before processing async results
 */

import {
  PoseLandmarker,
  FilesetResolver,
  PoseLandmarkerResult,
} from '@mediapipe/tasks-vision';
import {
  PoseDetector,
  PoseDetectorConfig,
  PoseDetectionCallback,
  PoseDetectionResult,
  DEFAULT_POSE_DETECTOR_CONFIG,
} from './PoseDetector';
import { PoseLandmarks } from '@/core/types';

/**
 * MediaPipe pose detector implementation
 */
export class MediaPipePoseDetector implements PoseDetector {
  private config: PoseDetectorConfig;
  private poseLandmarker: PoseLandmarker | null = null;
  private initialized = false;
  private running = false;

  // CRITICAL FIX #1: Single timer instead of double throttling
  private detectionIntervalId: ReturnType<typeof setInterval> | null = null;

  // CRITICAL FIX #2: State ID for race condition prevention
  private currentStateId = 0;

  // Video element and callback
  private videoElement: HTMLVideoElement | null = null;
  private callback: PoseDetectionCallback | null = null;

  constructor(config: Partial<PoseDetectorConfig> = {}) {
    this.config = { ...DEFAULT_POSE_DETECTOR_CONFIG, ...config };
  }

  /**
   * Initialize MediaPipe pose landmarker
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Load MediaPipe vision tasks
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm'
      );

      // Create pose landmarker
      this.poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numPoses: this.config.numPoses,
        minPoseDetectionConfidence: this.config.minDetectionConfidence,
        minPosePresenceConfidence: this.config.minTrackingConfidence,
        minTrackingConfidence: this.config.minTrackingConfidence,
      });

      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize MediaPipe pose detector:', error);
      throw new Error('MediaPipe initialization failed');
    }
  }

  /**
   * CRITICAL FIX #1 & #2: Start detection with single timer and state validation
   */
  start(videoElement: HTMLVideoElement, callback: PoseDetectionCallback): void {
    if (!this.initialized || !this.poseLandmarker) {
      throw new Error('Detector not initialized. Call initialize() first.');
    }

    if (this.running) {
      this.stop();
    }

    this.videoElement = videoElement;
    this.callback = callback;
    this.running = true;

    // Increment state ID to invalidate any pending detections
    this.currentStateId++;

    // FIX #1: Single consistent timer (no manual throttling)
    // Original had: setInterval(detectPose, 33) + manual "if (now - lastTime < 33) return"
    // Now: Just setInterval, runs exactly every 33ms
    this.detectionIntervalId = setInterval(() => {
      this.detectFrame();
    }, this.config.detectionIntervalMs);
  }

  /**
   * Detect pose for current video frame
   * FIX #2: Validates state before processing results
   */
  private detectFrame(): void {
    if (!this.running || !this.videoElement || !this.poseLandmarker || !this.callback) {
      return;
    }

    // Capture current state ID BEFORE async detection
    // This prevents race conditions when game state changes
    const stateIdAtDetection = this.currentStateId;

    const startTime = performance.now();
    const nowMs = performance.now();

    try {
      // MediaPipe detection (synchronous in VIDEO mode, but we treat as potentially async)
      const result = this.poseLandmarker.detectForVideo(this.videoElement, nowMs);

      // FIX #2: Validate state hasn't changed during detection
      // If user started new game, stateIdAtDetection !== currentStateId
      if (stateIdAtDetection !== this.currentStateId) {
        // State changed - discard this result
        return;
      }

      // Process result
      this.processResult(result, startTime);
    } catch (error) {
      console.error('Pose detection error:', error);
    }
  }

  /**
   * Process MediaPipe result and call callback
   */
  private processResult(result: PoseLandmarkerResult, startTime: number): void {
    if (!this.callback) return;

    // Convert MediaPipe landmarks to our format
    const poses: PoseLandmarks[] = [];

    if (result.landmarks && result.landmarks.length > 0) {
      for (const landmarks of result.landmarks) {
        // Convert to our NormalizedLandmark format
        const pose: PoseLandmarks = landmarks.map((lm) => ({
          x: lm.x,
          y: lm.y,
          z: lm.z,
          visibility: lm.visibility,
        }));

        poses.push(pose);
      }
    }

    // Create result
    const detectionResult: PoseDetectionResult = {
      poses,
      timestamp: performance.now(),
      processingTime: performance.now() - startTime,
    };

    // Call callback
    this.callback(detectionResult);
  }

  /**
   * Stop detection
   */
  stop(): void {
    if (this.detectionIntervalId) {
      clearInterval(this.detectionIntervalId);
      this.detectionIntervalId = null;
    }

    this.running = false;
    this.videoElement = null;
    this.callback = null;

    // Increment state ID to invalidate any pending detections
    this.currentStateId++;
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
   * Clean up resources
   */
  dispose(): void {
    this.stop();

    if (this.poseLandmarker) {
      this.poseLandmarker.close();
      this.poseLandmarker = null;
    }

    this.initialized = false;
  }

  /**
   * Update configuration
   * Note: Requires re-initialization to take effect
   */
  updateConfig(config: Partial<PoseDetectorConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
