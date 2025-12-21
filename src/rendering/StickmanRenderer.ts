// src/rendering/StickmanRenderer.ts
import { PoseLandmarks, PhysicsState, CalibrationData, TransformedLandmark } from '@/core/types';
import { BoundingBox } from '@/game/CollisionDetector';

export interface StickmanConfig {
  groundLevel: number;
  fixedScale: number;
  fixedHeight: number;
  headRadius: number;
  lineWidth: number;
  duckCompression: number;
}

const DEFAULT_CONFIG: StickmanConfig = {
  groundLevel: 340,
  fixedScale: 280,
  fixedHeight: 100,
  headRadius: 12,
  lineWidth: 4,
  duckCompression: 0.5,
};

export class StickmanRenderer {
  private config: StickmanConfig;

  constructor(config: Partial<StickmanConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  render(
    ctx: CanvasRenderingContext2D,
    landmarks: PoseLandmarks,
    physics: PhysicsState,
    calibration: CalibrationData,
    baseX: number,
    color: string
  ): BoundingBox | null {
    if (!landmarks || landmarks.length < 33) return null;

    const feetY = this.config.groundLevel - physics.y;

    // Reference points
    const ankleCenterX = (landmarks[27].x + landmarks[28].x) / 2;
    const shoulderCenterY = (landmarks[11].y + landmarks[12].y) / 2;
    const ankleCenterY = (landmarks[27].y + landmarks[28].y) / 2;
    const hipCenterY = (landmarks[23].y + landmarks[24].y) / 2;
    const actualBodyHeight = ankleCenterY - shoulderCenterY;

    // Transform function
    const transform = (lm: { x: number; y: number }): TransformedLandmark => {
      const relX = (lm.x - ankleCenterX) * this.config.fixedScale;
      const normalizedY = (lm.y - ankleCenterY) / actualBodyHeight;
      let relY = normalizedY * this.config.fixedHeight;

      // Compress upper body when ducking
      if (physics.isDucking && lm.y < hipCenterY) {
        relY = relY * this.config.duckCompression;
      }

      return {
        x: baseX + relX,
        y: feetY + relY,
      };
    };

    // Transform landmarks
    const nose = transform(landmarks[0]);
    const leftShoulder = transform(landmarks[11]);
    const rightShoulder = transform(landmarks[12]);
    const leftElbow = transform(landmarks[13]);
    const rightElbow = transform(landmarks[14]);
    const leftWrist = transform(landmarks[15]);
    const rightWrist = transform(landmarks[16]);
    const leftHip = transform(landmarks[23]);
    const rightHip = transform(landmarks[24]);
    const leftKnee = transform(landmarks[25]);
    const rightKnee = transform(landmarks[26]);
    const leftAnkle = transform(landmarks[27]);
    const rightAnkle = transform(landmarks[28]);

    // Midpoints
    const shoulderMid = {
      x: (leftShoulder.x + rightShoulder.x) / 2,
      y: (leftShoulder.y + rightShoulder.y) / 2,
    };
    const hipMid = {
      x: (leftHip.x + rightHip.x) / 2,
      y: (leftHip.y + rightHip.y) / 2,
    };

    // Set glow effect
    ctx.shadowBlur = 10;
    ctx.shadowColor = color;

    // Draw torso
    this.drawLine(ctx, shoulderMid.x, shoulderMid.y, hipMid.x, hipMid.y, color, 5);

    // Draw shoulders
    this.drawLine(ctx, leftShoulder.x, leftShoulder.y, rightShoulder.x, rightShoulder.y, color);

    // Draw arms
    this.drawLine(ctx, leftShoulder.x, leftShoulder.y, leftElbow.x, leftElbow.y, color);
    this.drawLine(ctx, leftElbow.x, leftElbow.y, leftWrist.x, leftWrist.y, color);
    this.drawLine(ctx, rightShoulder.x, rightShoulder.y, rightElbow.x, rightElbow.y, color);
    this.drawLine(ctx, rightElbow.x, rightElbow.y, rightWrist.x, rightWrist.y, color);

    // Draw hips
    this.drawLine(ctx, leftHip.x, leftHip.y, rightHip.x, rightHip.y, color);

    // Draw legs
    this.drawLine(ctx, leftHip.x, leftHip.y, leftKnee.x, leftKnee.y, color);
    this.drawLine(ctx, leftKnee.x, leftKnee.y, leftAnkle.x, leftAnkle.y, color);
    this.drawLine(ctx, rightHip.x, rightHip.y, rightKnee.x, rightKnee.y, color);
    this.drawLine(ctx, rightKnee.x, rightKnee.y, rightAnkle.x, rightAnkle.y, color);

    // Draw head
    this.drawHead(ctx, nose.x, nose.y, this.config.headRadius, color);

    // Reset shadow
    ctx.shadowBlur = 0;

    // Calculate bounding box
    const coreX = [shoulderMid.x, hipMid.x, nose.x];
    const coreY = [nose.y - this.config.headRadius, shoulderMid.y, hipMid.y];

    return {
      left: Math.min(...coreX) - 10,
      right: Math.max(...coreX) + 10,
      top: Math.min(...coreY) + 5,
      bottom: feetY - 5,
    };
  }

  private drawLine(
    ctx: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: string,
    lineWidth = this.config.lineWidth
  ): void {
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  private drawHead(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    color: string
  ): void {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}
