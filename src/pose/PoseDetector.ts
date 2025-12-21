/**
 * PoseDetector interface
 * Abstraction for pose detection, allowing for different implementations
 * (MediaPipe, mock for testing, etc.)
 */

import { PoseLandmarks } from '@/core/types';

/**
 * Result from pose detection
 */
export interface PoseDetectionResult {
  // Array of detected poses (0-2 for multiplayer)
  poses: PoseLandmarks[];

  // Timestamp when detection occurred
  timestamp: number;

  // Optional: processing time in milliseconds
  processingTime?: number;
}

/**
 * Callback type for pose detection results
 */
export type PoseDetectionCallback = (result: PoseDetectionResult) => void;

/**
 * Configuration for pose detector
 */
export interface PoseDetectorConfig {
  // Number of poses to detect (1 or 2)
  numPoses: number;

  // Detection interval in milliseconds (default: 33ms for ~30fps)
  detectionIntervalMs: number;

  // Minimum confidence threshold (0-1)
  minDetectionConfidence?: number;

  // Minimum tracking confidence (0-1)
  minTrackingConfidence?: number;
}

/**
 * PoseDetector interface
 * All pose detection implementations must implement this interface
 */
export interface PoseDetector {
  /**
   * Initialize the pose detector
   * Must be called before start()
   */
  initialize(): Promise<void>;

  /**
   * Start pose detection
   * Calls the callback with detection results at regular intervals
   */
  start(videoElement: HTMLVideoElement, callback: PoseDetectionCallback): void;

  /**
   * Stop pose detection
   */
  stop(): void;

  /**
   * Check if detector is running
   */
  isRunning(): boolean;

  /**
   * Check if detector is initialized
   */
  isInitialized(): boolean;

  /**
   * Clean up resources
   */
  dispose(): void;
}

/**
 * Default pose detector configuration
 */
export const DEFAULT_POSE_DETECTOR_CONFIG: PoseDetectorConfig = {
  numPoses: 2,
  detectionIntervalMs: 33, // ~30fps
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5,
};
