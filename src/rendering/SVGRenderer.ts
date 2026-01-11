// src/rendering/SVGRenderer.ts
// Simple vector graphics renderer for Santa using canvas drawing primitives

import { PoseLandmarks, PhysicsState, CalibrationData } from '@/core/types';
import { BoundingBox } from '@/game/CollisionDetector';

export interface SVGRendererConfig {
  groundLevel: number;
  scale: number;
}

const DEFAULT_CONFIG: SVGRendererConfig = {
  groundLevel: window.innerHeight - 60,
  scale: 1.0,
};

// Santa colors
const COLORS = {
  skin: '#FDBF8F',
  red: '#CC2936',
  redDark: '#A61C28',
  white: '#FFFFFF',
  black: '#1A1A1A',
  belt: '#2D2D2D',
  beltBuckle: '#FFD700',
  boot: '#1A1A1A',
};

export class SVGRenderer {
  private config: SVGRendererConfig;

  constructor(config: Partial<SVGRendererConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  render(
    ctx: CanvasRenderingContext2D,
    landmarks: PoseLandmarks,
    physics: PhysicsState,
    _calibration: CalibrationData,
    baseX: number,
    _color: string
  ): BoundingBox | null {
    if (!landmarks || landmarks.length < 33) {
      return null;
    }

    const feetY = this.config.groundLevel - physics.y;

    // Get key landmark positions
    const ankleCenterX = (landmarks[27].x + landmarks[28].x) / 2;
    const ankleCenterY = (landmarks[27].y + landmarks[28].y) / 2;
    const shoulderCenterY = (landmarks[11].y + landmarks[12].y) / 2;
    const hipCenterY = (landmarks[23].y + landmarks[24].y) / 2;
    const actualBodyHeight = ankleCenterY - shoulderCenterY;

    // Fixed height for consistent rendering
    const fixedHeight = 160;

    // Duck compression factor - more aggressive compression
    const duckCompression = physics.isDucking ? 0.35 : 1.0;

    // Transform landmark to screen coordinates
    const transform = (lm: { x: number; y: number }): { x: number; y: number } => {
      const relX = (lm.x - ankleCenterX) * 300;
      const normalizedY = (lm.y - ankleCenterY) / actualBodyHeight;
      let relY = normalizedY * fixedHeight;

      // Compress upper body when ducking - more aggressive
      if (physics.isDucking && lm.y < hipCenterY) {
        relY = relY * duckCompression;
      }

      return {
        x: baseX + relX,
        y: feetY + relY,
      };
    };

    // Transform key points
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

    // Calculate midpoints
    const shoulderMid = {
      x: (leftShoulder.x + rightShoulder.x) / 2,
      y: (leftShoulder.y + rightShoulder.y) / 2,
    };
    const hipMid = {
      x: (leftHip.x + rightHip.x) / 2,
      y: (leftHip.y + rightHip.y) / 2,
    };

    ctx.save();

    // === DRAW ORDER: Back to front ===

    // 1. Back leg (left)
    this.drawLeg(ctx, leftHip, leftKnee, leftAnkle, true);

    // 2. Back arm (left)
    this.drawArm(ctx, leftShoulder, leftElbow, leftWrist);

    // 3. Torso (Santa jacket)
    this.drawTorso(ctx, shoulderMid, hipMid, leftShoulder, rightShoulder, leftHip, rightHip);

    // 4. Front leg (right)
    this.drawLeg(ctx, rightHip, rightKnee, rightAnkle, false);

    // 5. Front arm (right)
    this.drawArm(ctx, rightShoulder, rightElbow, rightWrist);

    // 6. Head with Santa hat
    const headSize = physics.isDucking ? 18 : 25;
    this.drawHead(ctx, nose, shoulderMid, headSize);

    ctx.restore();

    // Calculate bounding box for collision - much tighter when ducking
    const headOffset = physics.isDucking ? 15 : 35;

    return {
      left: Math.min(leftShoulder.x, rightShoulder.x, hipMid.x) - 15,
      right: Math.max(leftShoulder.x, rightShoulder.x, hipMid.x) + 15,
      top: nose.y - headOffset,
      bottom: feetY - 5,
    };
  }

  private drawLeg(
    ctx: CanvasRenderingContext2D,
    hip: { x: number; y: number },
    knee: { x: number; y: number },
    ankle: { x: number; y: number },
    isBack: boolean
  ): void {
    const legWidth = isBack ? 10 : 12;
    const bootWidth = isBack ? 12 : 14;

    // Thigh (red pants)
    ctx.strokeStyle = COLORS.red;
    ctx.lineWidth = legWidth;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(hip.x, hip.y);
    ctx.lineTo(knee.x, knee.y);
    ctx.stroke();

    // Shin (red pants)
    ctx.beginPath();
    ctx.moveTo(knee.x, knee.y);
    ctx.lineTo(ankle.x, ankle.y);
    ctx.stroke();

    // Boot
    ctx.fillStyle = COLORS.boot;
    ctx.beginPath();
    ctx.ellipse(ankle.x + 5, ankle.y + 3, bootWidth, 6, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawArm(
    ctx: CanvasRenderingContext2D,
    shoulder: { x: number; y: number },
    elbow: { x: number; y: number },
    wrist: { x: number; y: number }
  ): void {
    const armWidth = 8;

    // Upper arm (red sleeve)
    ctx.strokeStyle = COLORS.red;
    ctx.lineWidth = armWidth;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(shoulder.x, shoulder.y);
    ctx.lineTo(elbow.x, elbow.y);
    ctx.stroke();

    // White cuff
    ctx.strokeStyle = COLORS.white;
    ctx.lineWidth = armWidth + 2;
    ctx.beginPath();
    ctx.moveTo(elbow.x, elbow.y);
    const cuffEnd = {
      x: elbow.x + (wrist.x - elbow.x) * 0.3,
      y: elbow.y + (wrist.y - elbow.y) * 0.3,
    };
    ctx.lineTo(cuffEnd.x, cuffEnd.y);
    ctx.stroke();

    // Lower arm/hand (skin)
    ctx.strokeStyle = COLORS.skin;
    ctx.lineWidth = armWidth;
    ctx.beginPath();
    ctx.moveTo(cuffEnd.x, cuffEnd.y);
    ctx.lineTo(wrist.x, wrist.y);
    ctx.stroke();

    // Hand (mitten - red)
    ctx.fillStyle = COLORS.red;
    ctx.beginPath();
    ctx.arc(wrist.x, wrist.y, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawTorso(
    ctx: CanvasRenderingContext2D,
    shoulderMid: { x: number; y: number },
    hipMid: { x: number; y: number },
    leftShoulder: { x: number; y: number },
    rightShoulder: { x: number; y: number },
    leftHip: { x: number; y: number },
    rightHip: { x: number; y: number }
  ): void {
    // Red jacket body
    ctx.fillStyle = COLORS.red;
    ctx.beginPath();
    ctx.moveTo(leftShoulder.x - 5, leftShoulder.y);
    ctx.lineTo(rightShoulder.x + 5, rightShoulder.y);
    ctx.lineTo(rightHip.x + 3, rightHip.y);
    ctx.lineTo(leftHip.x - 3, leftHip.y);
    ctx.closePath();
    ctx.fill();

    // White trim at bottom
    const bottomY = hipMid.y;
    ctx.fillStyle = COLORS.white;
    ctx.beginPath();
    ctx.moveTo(leftHip.x - 5, bottomY - 5);
    ctx.lineTo(rightHip.x + 5, bottomY - 5);
    ctx.lineTo(rightHip.x + 5, bottomY + 3);
    ctx.lineTo(leftHip.x - 5, bottomY + 3);
    ctx.closePath();
    ctx.fill();

    // Belt
    const beltY = hipMid.y - 8;
    ctx.fillStyle = COLORS.belt;
    ctx.fillRect(leftHip.x - 3, beltY - 4, rightHip.x - leftHip.x + 6, 8);

    // Belt buckle
    ctx.fillStyle = COLORS.beltBuckle;
    ctx.fillRect(hipMid.x - 5, beltY - 3, 10, 6);

    // Buttons (3 white circles)
    ctx.fillStyle = COLORS.white;
    const buttonX = shoulderMid.x;
    const torsoHeight = hipMid.y - shoulderMid.y;
    for (let i = 0; i < 3; i++) {
      const buttonY = shoulderMid.y + torsoHeight * (0.25 + i * 0.2);
      ctx.beginPath();
      ctx.arc(buttonX, buttonY, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // White collar/trim at top
    ctx.strokeStyle = COLORS.white;
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(leftShoulder.x, leftShoulder.y);
    ctx.lineTo(shoulderMid.x, shoulderMid.y + 5);
    ctx.lineTo(rightShoulder.x, rightShoulder.y);
    ctx.stroke();
  }

  private drawHead(
    ctx: CanvasRenderingContext2D,
    nose: { x: number; y: number },
    _shoulderMid: { x: number; y: number },
    size: number
  ): void {
    // Calculate head center (slightly above nose)
    const headCenter = {
      x: nose.x,
      y: nose.y - size * 0.3,
    };

    // Face (skin colored circle)
    ctx.fillStyle = COLORS.skin;
    ctx.beginPath();
    ctx.arc(headCenter.x, headCenter.y, size, 0, Math.PI * 2);
    ctx.fill();

    // Beard (white, covers lower half of face)
    ctx.fillStyle = COLORS.white;
    ctx.beginPath();
    ctx.arc(headCenter.x, headCenter.y + size * 0.3, size * 0.9, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.lineTo(headCenter.x - size * 0.7, headCenter.y + size * 1.2);
    ctx.quadraticCurveTo(headCenter.x, headCenter.y + size * 1.5, headCenter.x + size * 0.7, headCenter.y + size * 1.2);
    ctx.closePath();
    ctx.fill();

    // Eyes (small black dots)
    ctx.fillStyle = COLORS.black;
    const eyeY = headCenter.y - size * 0.1;
    ctx.beginPath();
    ctx.arc(headCenter.x - size * 0.3, eyeY, 2, 0, Math.PI * 2);
    ctx.arc(headCenter.x + size * 0.3, eyeY, 2, 0, Math.PI * 2);
    ctx.fill();

    // Rosy cheeks
    ctx.fillStyle = '#FF9999';
    ctx.beginPath();
    ctx.arc(headCenter.x - size * 0.5, headCenter.y + size * 0.1, 4, 0, Math.PI * 2);
    ctx.arc(headCenter.x + size * 0.5, headCenter.y + size * 0.1, 4, 0, Math.PI * 2);
    ctx.fill();

    // Nose (small red circle)
    ctx.fillStyle = '#E88888';
    ctx.beginPath();
    ctx.arc(headCenter.x, headCenter.y + size * 0.15, 4, 0, Math.PI * 2);
    ctx.fill();

    // Santa hat
    const hatTop = headCenter.y - size * 1.3;
    const hatBase = headCenter.y - size * 0.5;

    // Hat (red triangle-ish shape)
    ctx.fillStyle = COLORS.red;
    ctx.beginPath();
    ctx.moveTo(headCenter.x - size * 1.1, hatBase);
    ctx.lineTo(headCenter.x + size * 0.3, hatTop);
    ctx.quadraticCurveTo(headCenter.x + size * 0.8, hatTop - size * 0.2, headCenter.x + size * 1.2, hatTop + size * 0.3);
    ctx.lineTo(headCenter.x + size * 1.1, hatBase);
    ctx.closePath();
    ctx.fill();

    // Hat white trim
    ctx.fillStyle = COLORS.white;
    ctx.beginPath();
    ctx.moveTo(headCenter.x - size * 1.2, hatBase - 3);
    ctx.lineTo(headCenter.x + size * 1.2, hatBase - 3);
    ctx.lineTo(headCenter.x + size * 1.2, hatBase + 5);
    ctx.lineTo(headCenter.x - size * 1.2, hatBase + 5);
    ctx.closePath();
    ctx.fill();

    // Hat pompom
    ctx.beginPath();
    ctx.arc(headCenter.x + size * 1.2, hatTop + size * 0.3, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  isReady(): boolean {
    // No images to load, always ready
    return true;
  }
}
