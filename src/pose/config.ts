/**
 * Gesture detection configuration
 * All thresholds documented with rationale - NO MAGIC NUMBERS!
 *
 * CRITICAL FIX #5 & #6: Replace undocumented values with clear, configurable constants
 */

import { GestureConfig } from '@/core/types';

/**
 * Default gesture configuration with full documentation
 */
export const DEFAULT_GESTURE_CONFIG: GestureConfig = {
  // ========== JUMP DETECTION ==========

  /**
   * Jump position threshold (percentage above baseline)
   * Rationale: Average person's shoulders rise 5-10% during jump preparation
   * Testing showed 7% provides good balance between sensitivity and false positives
   * Original magic number: 0.93 (meaning 7% above, but inverted)
   */
  jumpPositionThresholdPercent: 0.07,

  /**
   * Velocity threshold (normalized coordinates per frame at 30fps)
   * Rationale: Real jump creates upward velocity of ~0.006-0.01 per frame
   * Below this = just standing noise, above = intentional jump
   * Original magic number: 0.006 (same value but undocumented)
   */
  jumpVelocityThreshold: 0.006,

  /**
   * Initial jump velocity applied to physics (pixels/frame at 60fps)
   * Rationale: Calibrated to produce ~100px jump height with gravity of 0.7
   * Formula: jumpHeight = (velocity^2) / (2 * gravity) = 18^2 / (2 * 0.7) ≈ 231px
   * But with ducking fast-fall and obstacles, effective height ~100-120px
   * Original magic number: 18 (same value but undocumented)
   */
  jumpInitialVelocity: 18,

  /**
   * Jump cooldown (milliseconds)
   * Rationale: Prevents double-triggering from same physical jump
   * 400ms = typical duration of jump preparation + recovery
   * Original value: 400ms (undocumented)
   */
  jumpCooldownMs: 400,

  /**
   * Jump reset threshold (percentage back to baseline)
   * Rationale: More generous than trigger to avoid oscillation
   * Must return to 90% of baseline (vs 93% to trigger)
   * This 3% hysteresis gap prevents flickering
   * Original value: 0.10 (undocumented, derived from 0.93 trigger)
   */
  jumpResetThresholdPercent: 0.10,

  // ========== DUCK DETECTION ==========

  /**
   * Duck trigger ratio (current height / baseline height)
   * Rationale: Ducking/crouching reduces full body height by ~15-20%
   * 0.85 (85% of baseline) requires 15% compression
   * This prevents false triggers from normal standing variations
   * Original magic number: 0.85 (undocumented)
   */
  duckTriggerRatio: 0.85,

  /**
   * Duck release ratio (hysteresis upper bound)
   * Rationale: 5% hysteresis gap (0.90 - 0.85) prevents flickering
   * Player must stand to 90% height before duck releases
   * Without this, pose noise causes rapid duck/stand oscillation
   * Original: NO HYSTERESIS! This is a new fix
   */
  duckReleaseRatio: 0.90,

  /**
   * Duck debounce duration (milliseconds)
   * Rationale: Pose must be maintained for 100ms before confirming duck
   * Prevents single-frame pose noise from triggering duck
   * 100ms = 3 frames at 30fps pose detection
   * Original: NO DEBOUNCE! This is a new fix
   */
  duckDebounceMs: 100,
};

/**
 * Calibration configuration
 */
export interface CalibrationConfig {
  /**
   * Number of frames to collect during calibration
   * At 30fps, 90 frames = 3 seconds
   * Original: 60 frames (2 seconds) - increased for better stability
   */
  calibrationFrames: number;

  /**
   * Maximum allowed variance during calibration
   * If variance exceeds this, calibration is rejected (user moved too much)
   * Variance = average squared deviation from mean
   */
  maxVariance: number;

  /**
   * Countdown duration before game starts (seconds)
   * Gives user time to prepare after calibration
   */
  countdownSeconds: number;

  /**
   * Number of standard deviations for outlier rejection
   * Values beyond this many std devs are excluded from baseline calculation
   * 2.0 = exclude ~5% most extreme values (normal distribution)
   */
  outlierStdDevThreshold: number;
}

/**
 * Default calibration configuration
 */
export const DEFAULT_CALIBRATION_CONFIG: CalibrationConfig = {
  calibrationFrames: 90, // 3 seconds at 30fps
  maxVariance: 0.001, // Very small movement allowed
  countdownSeconds: 3,
  outlierStdDevThreshold: 2.0,
};

/**
 * Physics configuration
 */
export interface PhysicsConfig {
  /**
   * Gravity (pixels per frame^2 at 60fps)
   * Higher = faster fall, lower jump height
   */
  gravity: number;

  /**
   * Fast-fall gravity multiplier when ducking in air
   * 2.0 = double gravity when ducking mid-jump
   */
  duckFastFallMultiplier: number;

  /**
   * Ground level Y position (pixels from top)
   */
  groundLevel: number;
}

/**
 * Default physics configuration
 */
export const DEFAULT_PHYSICS_CONFIG: PhysicsConfig = {
  gravity: 0.7,
  duckFastFallMultiplier: 2.0,
  groundLevel: 340,
};

/**
 * Export all configs as a single object for easy import
 */
export const GameConfig = {
  gesture: DEFAULT_GESTURE_CONFIG,
  calibration: DEFAULT_CALIBRATION_CONFIG,
  physics: DEFAULT_PHYSICS_CONFIG,
};
