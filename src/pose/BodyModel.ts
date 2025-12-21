/**
 * BodyModel - Measurements and calculations for body landmarks
 * Provides utilities for extracting meaningful data from pose landmarks
 */

import { PoseLandmarks, NormalizedLandmark } from '@/core/types';
import { Vector2D } from '@/core/Vector2D';

/**
 * Key body points extracted from landmarks
 */
export interface BodyPoints {
  nose: NormalizedLandmark;
  leftShoulder: NormalizedLandmark;
  rightShoulder: NormalizedLandmark;
  leftHip: NormalizedLandmark;
  rightHip: NormalizedLandmark;
  leftAnkle: NormalizedLandmark;
  rightAnkle: NormalizedLandmark;
}

/**
 * Calculated body measurements
 */
export interface BodyMeasurements {
  shoulderY: number;        // Average shoulder Y position
  hipY: number;             // Average hip Y position
  ankleY: number;           // Average ankle Y position
  noseY: number;            // Nose Y position

  shoulderCenter: Vector2D; // Midpoint between shoulders
  hipCenter: Vector2D;      // Midpoint between hips
  ankleCenter: Vector2D;    // Midpoint between ankles

  torsoLength: number;      // Distance from shoulders to hips
  fullHeight: number;       // Distance from nose to ankles
  bodyHeight: number;       // Distance from shoulders to ankles
}

/**
 * BodyModel class
 * Utility class for extracting body measurements from landmarks
 */
export class BodyModel {
  /**
   * Extract key body points from landmarks
   */
  static getBodyPoints(landmarks: PoseLandmarks): BodyPoints {
    return {
      nose: landmarks[0],
      leftShoulder: landmarks[11],
      rightShoulder: landmarks[12],
      leftHip: landmarks[23],
      rightHip: landmarks[24],
      leftAnkle: landmarks[27],
      rightAnkle: landmarks[28],
    };
  }

  /**
   * Calculate all body measurements from landmarks
   */
  static getMeasurements(landmarks: PoseLandmarks): BodyMeasurements {
    const points = this.getBodyPoints(landmarks);

    // Average Y positions
    const shoulderY = (points.leftShoulder.y + points.rightShoulder.y) / 2;
    const hipY = (points.leftHip.y + points.rightHip.y) / 2;
    const ankleY = (points.leftAnkle.y + points.rightAnkle.y) / 2;
    const noseY = points.nose.y;

    // Center points
    const shoulderCenter = new Vector2D(
      (points.leftShoulder.x + points.rightShoulder.x) / 2,
      shoulderY
    );
    const hipCenter = new Vector2D(
      (points.leftHip.x + points.rightHip.x) / 2,
      hipY
    );
    const ankleCenter = new Vector2D(
      (points.leftAnkle.x + points.rightAnkle.x) / 2,
      ankleY
    );

    // Lengths
    const torsoLength = hipY - shoulderY;
    const fullHeight = ankleY - noseY;
    const bodyHeight = ankleY - shoulderY;

    return {
      shoulderY,
      hipY,
      ankleY,
      noseY,
      shoulderCenter,
      hipCenter,
      ankleCenter,
      torsoLength,
      fullHeight,
      bodyHeight,
    };
  }

  /**
   * Calculate velocity between two sets of landmarks
   * Returns average movement of key points
   */
  static calculateVelocity(
    previous: PoseLandmarks,
    current: PoseLandmarks
  ): number {
    const prevPoints = this.getBodyPoints(previous);
    const currPoints = this.getBodyPoints(current);

    // Calculate movement for key points
    const movements = [
      this.distance(prevPoints.nose, currPoints.nose),
      this.distance(prevPoints.leftShoulder, currPoints.leftShoulder),
      this.distance(prevPoints.rightShoulder, currPoints.rightShoulder),
      this.distance(prevPoints.leftHip, currPoints.leftHip),
      this.distance(prevPoints.rightHip, currPoints.rightHip),
    ];

    // Return average movement
    return movements.reduce((sum, m) => sum + m, 0) / movements.length;
  }

  /**
   * Calculate distance between two landmarks
   */
  private static distance(a: NormalizedLandmark, b: NormalizedLandmark): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Get shoulder Y position (average of left and right)
   */
  static getShoulderY(landmarks: PoseLandmarks): number {
    return (landmarks[11].y + landmarks[12].y) / 2;
  }

  /**
   * Get full body height (nose to ankles)
   */
  static getFullHeight(landmarks: PoseLandmarks): number {
    const noseY = landmarks[0].y;
    const ankleY = (landmarks[27].y + landmarks[28].y) / 2;
    return ankleY - noseY;
  }

  /**
   * Get torso length (shoulders to hips)
   */
  static getTorsoLength(landmarks: PoseLandmarks): number {
    const shoulderY = (landmarks[11].y + landmarks[12].y) / 2;
    const hipY = (landmarks[23].y + landmarks[24].y) / 2;
    return hipY - shoulderY;
  }

  /**
   * Check if landmarks are valid (all key points present with good visibility)
   */
  static isValid(landmarks: PoseLandmarks, minVisibility = 0.5): boolean {
    if (!landmarks || landmarks.length !== 33) {
      return false;
    }

    // Check key landmarks
    const keyIndices = [0, 11, 12, 23, 24, 27, 28];

    for (const idx of keyIndices) {
      const landmark = landmarks[idx];

      if (!landmark) return false;

      // Check visibility if available
      if (landmark.visibility !== undefined && landmark.visibility < minVisibility) {
        return false;
      }

      // Check coordinates are in valid range
      if (landmark.x < 0 || landmark.x > 1 || landmark.y < 0 || landmark.y > 1) {
        return false;
      }
    }

    return true;
  }

  /**
   * Calculate body scale factor for rendering
   * Returns pixels per normalized unit
   */
  static calculateBodyScale(landmarks: PoseLandmarks, targetHeight = 120): number {
    const measurements = this.getMeasurements(landmarks);
    return targetHeight / measurements.bodyHeight;
  }
}
