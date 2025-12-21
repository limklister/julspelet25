/**
 * CalibrationService - Collect baseline measurements for gesture detection
 *
 * CRITICAL FIX #4: Outlier Rejection
 * Original problem: Simple average - one bad frame ruins baseline
 * Solution: Median with outlier rejection using standard deviation
 */

import { PoseLandmarks, CalibrationData } from '@/core/types';
import { BodyModel } from './BodyModel';
import { CalibrationConfig, DEFAULT_CALIBRATION_CONFIG } from './config';

/**
 * Sample collected during calibration
 */
interface CalibrationSample {
  shoulderY: number;
  fullHeight: number;
  torsoLength: number;
  ankleX: number;
  ankleY: number;
  bodyScale: number;
}

/**
 * Calibration result
 */
export interface CalibrationResult {
  success: boolean;
  data?: CalibrationData;
  error?: string;
  stability?: number; // 0-1, how stable was the calibration
}

/**
 * CalibrationService class
 * Handles collection and validation of baseline pose measurements
 */
export class CalibrationService {
  private config: CalibrationConfig;
  private samples: CalibrationSample[] = [];
  private frameCount = 0;

  constructor(config: Partial<CalibrationConfig> = {}) {
    this.config = { ...DEFAULT_CALIBRATION_CONFIG, ...config };
  }

  /**
   * Add a frame to calibration
   * Returns true if calibration is complete
   */
  addFrame(landmarks: PoseLandmarks): boolean {
    if (!BodyModel.isValid(landmarks)) {
      // Skip invalid frames
      return false;
    }

    const measurements = BodyModel.getMeasurements(landmarks);

    // Collect sample
    this.samples.push({
      shoulderY: measurements.shoulderY,
      fullHeight: measurements.fullHeight,
      torsoLength: measurements.torsoLength,
      ankleX: measurements.ankleCenter.x,
      ankleY: measurements.ankleCenter.y,
      bodyScale: BodyModel.calculateBodyScale(landmarks),
    });

    this.frameCount++;

    return this.frameCount >= this.config.calibrationFrames;
  }

  /**
   * Finalize calibration and return result
   * CRITICAL FIX: Uses median with outlier rejection instead of simple average
   */
  finalize(): CalibrationResult {
    if (this.samples.length < this.config.calibrationFrames) {
      return {
        success: false,
        error: `Not enough samples: ${this.samples.length}/${this.config.calibrationFrames}`,
      };
    }

    // Validate stability (check variance)
    const shoulderYVariance = this.calculateVariance(
      this.samples.map(s => s.shoulderY)
    );

    if (shoulderYVariance > this.config.maxVariance) {
      return {
        success: false,
        error: 'Too much movement during calibration. Please stand still.',
        stability: 1 - Math.min(shoulderYVariance / this.config.maxVariance, 1),
      };
    }

    // Calculate baseline with outlier rejection
    const baselineShoulderY = this.calculateBaseline(
      this.samples.map(s => s.shoulderY)
    );

    const baselineHeight = this.calculateBaseline(
      this.samples.map(s => s.fullHeight)
    );

    const baselineTorsoLength = this.calculateBaseline(
      this.samples.map(s => s.torsoLength)
    );

    const ankleX = this.calculateBaseline(
      this.samples.map(s => s.ankleX)
    );

    const ankleY = this.calculateBaseline(
      this.samples.map(s => s.ankleY)
    );

    const bodyScale = this.calculateBaseline(
      this.samples.map(s => s.bodyScale)
    );

    // Create calibration data
    const data: CalibrationData = {
      baselineShoulderY,
      baselineHeight,
      baselineTorsoLength,
      ankleX,
      ankleY,
      bodyScale,
      shoulderVelocity: 0,
      lastJumpTime: null,
      isCalibrated: true,
    };

    return {
      success: true,
      data,
      stability: 1 - (shoulderYVariance / this.config.maxVariance),
    };
  }

  /**
   * CRITICAL FIX: Calculate baseline with outlier rejection
   * Uses median instead of mean for robustness
   * Removes outliers beyond N standard deviations
   */
  private calculateBaseline(samples: number[]): number {
    if (samples.length === 0) return 0;

    // Step 1: Calculate mean and standard deviation
    const mean = samples.reduce((sum, val) => sum + val, 0) / samples.length;

    const variance = samples.reduce((sum, val) => {
      return sum + Math.pow(val - mean, 2);
    }, 0) / samples.length;

    const stdDev = Math.sqrt(variance);

    // Step 2: Filter outliers (values beyond N std deviations)
    const filtered = samples.filter(val => {
      const deviation = Math.abs(val - mean);
      return deviation <= this.config.outlierStdDevThreshold * stdDev;
    });

    // If too many outliers, use original samples
    if (filtered.length < samples.length * 0.7) {
      return this.median(samples);
    }

    // Step 3: Return median of filtered samples
    return this.median(filtered);
  }

  /**
   * Calculate median (robust against outliers)
   */
  private median(values: number[]): number {
    if (values.length === 0) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);

    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2;
    } else {
      return sorted[mid];
    }
  }

  /**
   * Calculate variance
   */
  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;

    return values.reduce((sum, val) => {
      return sum + Math.pow(val - mean, 2);
    }, 0) / values.length;
  }

  /**
   * Get current progress (0-1)
   */
  getProgress(): number {
    return this.frameCount / this.config.calibrationFrames;
  }

  /**
   * Get number of collected samples
   */
  getSampleCount(): number {
    return this.samples.length;
  }

  /**
   * Reset calibration
   */
  reset(): void {
    this.samples = [];
    this.frameCount = 0;
  }

  /**
   * Get stability score (0-1)
   * 1 = perfectly stable, 0 = too much movement
   */
  getStability(): number {
    if (this.samples.length === 0) return 1;

    const variance = this.calculateVariance(
      this.samples.map(s => s.shoulderY)
    );

    return 1 - Math.min(variance / this.config.maxVariance, 1);
  }
}
