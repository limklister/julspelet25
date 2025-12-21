// tests/unit/rendering/StickmanRenderer.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StickmanRenderer } from '@/rendering/StickmanRenderer';
import { createStandingPose, createDuckingPose } from '@/pose/MockPoseDetector';
import { PhysicsState, CalibrationData } from '@/core/types';

describe('StickmanRenderer', () => {
  let renderer: StickmanRenderer;
  let mockCtx: CanvasRenderingContext2D;
  const calibration: CalibrationData = {
    baselineShoulderY: 0.35,
    baselineHeight: 0.75,
    baselineTorsoLength: 0.35,
    ankleX: 0.5,
    ankleY: 0.95,
    bodyScale: 120,
    shoulderVelocity: 0,
    lastJumpTime: null,
    isCalibrated: true,
  };

  beforeEach(() => {
    renderer = new StickmanRenderer({ groundLevel: 340 });
    mockCtx = {
      strokeStyle: '',
      fillStyle: '',
      lineWidth: 0,
      lineCap: 'butt',
      shadowBlur: 0,
      shadowColor: '',
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
    } as unknown as CanvasRenderingContext2D;
  });

  describe('Rendering', () => {
    it('should return bounding box when rendering', () => {
      const landmarks = createStandingPose();
      const physics: PhysicsState = { y: 0, jumpVelocity: 0, isDucking: false, alive: true };

      const box = renderer.render(mockCtx, landmarks, physics, calibration, 150, '#00ff88');

      expect(box).not.toBeNull();
      expect(box!.left).toBeLessThan(box!.right);
      expect(box!.top).toBeLessThan(box!.bottom);
    });

    it('should return null for invalid landmarks', () => {
      const box = renderer.render(mockCtx, [], { y: 0, jumpVelocity: 0, isDucking: false, alive: true }, calibration, 150, '#00ff88');
      expect(box).toBeNull();
    });

    it('should offset by jump height', () => {
      const landmarks = createStandingPose();
      const ground: PhysicsState = { y: 0, jumpVelocity: 0, isDucking: false, alive: true };
      const air: PhysicsState = { y: 50, jumpVelocity: 0, isDucking: false, alive: true };

      const boxGround = renderer.render(mockCtx, landmarks, ground, calibration, 150, '#00ff88');
      const boxAir = renderer.render(mockCtx, landmarks, air, calibration, 150, '#00ff88');

      expect(boxAir!.bottom).toBeLessThan(boxGround!.bottom);
    });

    it('should compress when ducking', () => {
      const landmarks = createStandingPose();
      const stand: PhysicsState = { y: 0, jumpVelocity: 0, isDucking: false, alive: true };
      const duck: PhysicsState = { y: 0, jumpVelocity: 0, isDucking: true, alive: true };

      const boxStand = renderer.render(mockCtx, landmarks, stand, calibration, 150, '#00ff88');
      const boxDuck = renderer.render(mockCtx, landmarks, duck, calibration, 150, '#00ff88');

      const standHeight = boxStand!.bottom - boxStand!.top;
      const duckHeight = boxDuck!.bottom - boxDuck!.top;
      expect(duckHeight).toBeLessThan(standHeight);
    });

    it('should call canvas drawing methods', () => {
      const landmarks = createStandingPose();
      const physics: PhysicsState = { y: 0, jumpVelocity: 0, isDucking: false, alive: true };

      renderer.render(mockCtx, landmarks, physics, calibration, 150, '#00ff88');

      expect(mockCtx.beginPath).toHaveBeenCalled();
      expect(mockCtx.stroke).toHaveBeenCalled();
      expect(mockCtx.arc).toHaveBeenCalled();
    });
  });
});
