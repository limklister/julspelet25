/**
 * GestureDetector - Detect jumps and ducks from pose landmarks
 *
 * CRITICAL FIX #5: Jump Detection - Remove Magic Numbers
 * CRITICAL FIX #6: Duck Detection - Add Hysteresis
 *
 * Original problems:
 * - Unexplained constants (0.93, 0.006, 18)
 * - No hysteresis for duck → flickering
 * - No debouncing → single-frame noise triggers actions
 *
 * Solutions:
 * - All thresholds documented and configurable
 * - Hysteresis state machine for duck
 * - Debounce timer for stability
 */

import { PoseLandmarks, CalibrationData, PhysicsState } from '@/core/types';
import { BodyModel } from './BodyModel';
import { GestureConfig, DEFAULT_GESTURE_CONFIG } from '../core/types';

/**
 * Gesture detection result
 */
export interface GestureResult {
  shouldJump: boolean;
  isDucking: boolean;
  canJump: boolean;
}

/**
 * Internal state for gesture detection
 */
interface GestureState {
  // Velocity calculation
  velocityHistory: number[];
  currentVelocity: number;
  previousLandmarks: PoseLandmarks | null;

  // Jump state
  canJump: boolean;
  lastJumpTime: number | null;

  // Duck state (with hysteresis)
  isDucking: boolean;
  duckStateStartMs: number | null;
}

/**
 * GestureDetector class
 * Detects jump and duck gestures with proper thresholds and hysteresis
 */
export class GestureDetector {
  private config: GestureConfig;
  private state: GestureState;

  constructor(config: Partial<GestureConfig> = {}) {
    this.config = { ...DEFAULT_GESTURE_CONFIG, ...config };

    this.state = {
      velocityHistory: [],
      currentVelocity: 0,
      previousLandmarks: null,
      canJump: true,
      lastJumpTime: null,
      isDucking: false,
      duckStateStartMs: null,
    };
  }

  /**
   * Detect gestures from current landmarks and calibration data
   */
  detect(
    landmarks: PoseLandmarks,
    calibration: CalibrationData,
    physics: PhysicsState
  ): GestureResult {
    // Update velocity
    this.updateVelocity(landmarks);

    // Detect jump (only if on ground)
    const shouldJump = physics.y === 0 && this.detectJump(landmarks, calibration);

    // Detect duck
    const isDucking = this.detectDuck(landmarks, calibration, physics);

    // Update jump cooldown
    this.updateJumpCooldown(landmarks, calibration);

    return {
      shouldJump,
      isDucking,
      canJump: this.state.canJump,
    };
  }

  /**
   * Update velocity calculation
   */
  private updateVelocity(landmarks: PoseLandmarks): void {
    if (!this.state.previousLandmarks) {
      this.state.previousLandmarks = landmarks;
      return;
    }

    // Calculate raw velocity (positive = moving up)
    const prevShoulderY = BodyModel.getShoulderY(this.state.previousLandmarks);
    const currShoulderY = BodyModel.getShoulderY(landmarks);
    const rawVelocity = prevShoulderY - currShoulderY; // Inverted Y axis

    // Add to history (keep last 3 frames)
    this.state.velocityHistory.push(rawVelocity);
    if (this.state.velocityHistory.length > 3) {
      this.state.velocityHistory.shift();
    }

    // Calculate smoothed velocity (average of last 3 frames)
    this.state.currentVelocity =
      this.state.velocityHistory.reduce((sum, v) => sum + v, 0) /
      this.state.velocityHistory.length;

    this.state.previousLandmarks = landmarks;
  }

  /**
   * CRITICAL FIX #5: Jump Detection with Clear Thresholds
   *
   * Original magic numbers:
   * - 0.93: Shoulder position threshold (inverted - 7% above baseline)
   * - 0.006: Velocity threshold
   * - 18: Jump velocity
   *
   * New approach:
   * - Clear percentage-based threshold (7% above baseline)
   * - Documented velocity threshold
   * - Requires BOTH position AND velocity
   * - Cooldown to prevent double-trigger
   */
  private detectJump(
    landmarks: PoseLandmarks,
    calibration: CalibrationData
  ): boolean {
    if (!this.state.canJump) {
      return false;
    }

    const currentShoulderY = BodyModel.getShoulderY(landmarks);
    const baselineShoulderY = calibration.baselineShoulderY;

    // Position check: shoulders above baseline
    // Positive delta = shoulders higher than baseline
    const positionDelta = (baselineShoulderY - currentShoulderY) / baselineShoulderY;
    const isAboveThreshold =
      positionDelta > this.config.jumpPositionThresholdPercent;

    // Velocity check: moving upward
    const hasUpwardVelocity = this.state.currentVelocity > this.config.jumpVelocityThreshold;

    // Require BOTH conditions to prevent false triggers
    if (isAboveThreshold && hasUpwardVelocity) {
      // Trigger jump!
      this.state.canJump = false;
      this.state.lastJumpTime = performance.now();
      return true;
    }

    return false;
  }

  /**
   * Update jump cooldown and reset canJump flag
   */
  private updateJumpCooldown(
    landmarks: PoseLandmarks,
    calibration: CalibrationData
  ): void {
    if (this.state.canJump) {
      return; // Already can jump
    }

    const currentShoulderY = BodyModel.getShoulderY(landmarks);
    const baselineShoulderY = calibration.baselineShoulderY;

    // Check if shoulders returned near baseline
    const positionDelta = (baselineShoulderY - currentShoulderY) / baselineShoulderY;
    const nearBaseline = Math.abs(positionDelta) < this.config.jumpResetThresholdPercent;

    // Check if cooldown expired
    const timeSinceJump = this.state.lastJumpTime
      ? performance.now() - this.state.lastJumpTime
      : Infinity;
    const cooldownExpired = timeSinceJump > this.config.jumpCooldownMs;

    // Reset canJump if BOTH conditions met
    if (nearBaseline && cooldownExpired) {
      this.state.canJump = true;
    }
  }

  /**
   * CRITICAL FIX #6: Duck Detection with Hysteresis
   *
   * Uses TORSO compression (shoulders to hips) instead of full body height.
   * This works better across different body proportions (adults vs children)
   * because the torso compression ratio is more consistent when ducking.
   *
   * New approach:
   * - Measure torso length (shoulders to hips) ratio
   * - Two thresholds with hysteresis gap
   * - State machine for stable transitions
   * - Debounce timer to ignore momentary noise
   * - Only duck when on ground
   */
  private detectDuck(
    landmarks: PoseLandmarks,
    calibration: CalibrationData,
    physics: PhysicsState
  ): boolean {
    // Can only duck when on ground
    if (physics.y > 0) {
      this.state.duckStateStartMs = null;
      return false;
    }

    // Use torso length for more consistent detection across body sizes
    const currentTorso = BodyModel.getTorsoLength(landmarks);
    const baselineTorso = calibration.baselineTorsoLength;

    // Also check full height as a secondary signal
    const currentHeight = BodyModel.getFullHeight(landmarks);
    const baselineHeight = calibration.baselineHeight;

    // Calculate both ratios
    const torsoRatio = currentTorso / baselineTorso;
    const heightRatio = currentHeight / baselineHeight;

    // Use the more compressed ratio (lower value = more ducking)
    // This catches both "bending at waist" and "crouching down" styles
    const duckRatio = Math.min(torsoRatio, heightRatio);

    const now = performance.now();

    // State machine with hysteresis
    if (!this.state.isDucking) {
      // NOT DUCKING → check if should start ducking

      if (duckRatio < this.config.duckTriggerRatio) {
        // Below trigger threshold - start timer
        if (!this.state.duckStateStartMs) {
          this.state.duckStateStartMs = now;
        } else if (now - this.state.duckStateStartMs > this.config.duckDebounceMs) {
          // Debounce passed - confirm duck
          this.state.isDucking = true;
          return true;
        }
      } else {
        // Above trigger threshold - reset timer
        this.state.duckStateStartMs = null;
      }

      return false;
    } else {
      // DUCKING → check if should stop ducking

      if (duckRatio > this.config.duckReleaseRatio) {
        // Above release threshold (with hysteresis) - stop ducking
        this.state.isDucking = false;
        this.state.duckStateStartMs = null;
        return false;
      }

      // Still ducking
      return true;
    }
  }

  /**
   * Get current velocity (for debugging/display)
   */
  getVelocity(): number {
    return this.state.currentVelocity;
  }

  /**
   * Check if can jump
   */
  canJump(): boolean {
    return this.state.canJump;
  }

  /**
   * Reset detector state
   */
  reset(): void {
    this.state = {
      velocityHistory: [],
      currentVelocity: 0,
      previousLandmarks: null,
      canJump: true,
      lastJumpTime: null,
      isDucking: false,
      duckStateStartMs: null,
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<GestureConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
