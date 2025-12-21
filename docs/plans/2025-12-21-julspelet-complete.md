# Julspelet Complete Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete the Julspelet game - a pose-controlled endless runner with 1-2 player support.

**Architecture:** Modular TypeScript with React UI. Pose detection modules (already complete) feed into physics/gesture systems. Canvas-based game rendering with React overlay for menus. State machine manages game flow.

**Tech Stack:** React, TypeScript, Vite, MediaPipe Tasks-Vision, Canvas 2D, Vitest

---

## Current Status

### Already Complete:
- `src/pose/PoseDetector.ts` - Interface
- `src/pose/MediaPipePoseDetector.ts` - MediaPipe implementation
- `src/pose/LandmarkProcessor.ts` - Smoothing, validation
- `src/pose/BodyModel.ts` - Body measurements
- `src/pose/CalibrationService.ts` - Calibration with outlier rejection
- `src/pose/GestureDetector.ts` - Jump/duck with hysteresis
- `src/pose/config.ts` - Configuration
- `src/pose/MockPoseDetector.ts` - Test mocks
- `src/core/types.ts` - All type definitions

### To Implement:
1. PhysicsEngine (physics)
2. ObstacleManager (game)
3. CollisionDetector (game)
4. GameEngine (game)
5. StickmanRenderer (rendering)
6. React UI Components (ui)
7. Integration & Main App

---

## Task 1: PhysicsEngine

**Files:**
- Create: `src/physics/PhysicsEngine.ts`
- Create: `tests/unit/physics/PhysicsEngine.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/unit/physics/PhysicsEngine.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { PhysicsEngine } from '@/physics/PhysicsEngine';
import { PhysicsState } from '@/core/types';

describe('PhysicsEngine', () => {
  let engine: PhysicsEngine;
  let state: PhysicsState;

  beforeEach(() => {
    engine = new PhysicsEngine();
    state = {
      y: 0,
      jumpVelocity: 0,
      isDucking: false,
      alive: true,
    };
  });

  describe('Gravity', () => {
    it('should apply gravity when in air', () => {
      state.y = 50;
      state.jumpVelocity = 0;

      engine.update(state, 1);

      expect(state.jumpVelocity).toBeLessThan(0);
      expect(state.y).toBeLessThan(50);
    });

    it('should not go below ground', () => {
      state.y = 5;
      state.jumpVelocity = -10;

      engine.update(state, 1);

      expect(state.y).toBe(0);
      expect(state.jumpVelocity).toBe(0);
    });
  });

  describe('Jumping', () => {
    it('should apply jump velocity', () => {
      engine.applyJump(state);

      expect(state.jumpVelocity).toBeGreaterThan(0);
    });

    it('should not jump when already in air', () => {
      state.y = 50;
      const initialVelocity = state.jumpVelocity;

      engine.applyJump(state);

      expect(state.jumpVelocity).toBe(initialVelocity);
    });
  });

  describe('Fast Fall', () => {
    it('should apply double gravity when ducking in air', () => {
      state.y = 50;
      state.jumpVelocity = 0;
      state.isDucking = true;

      engine.update(state, 1);

      // Fast fall = 2x gravity
      expect(state.jumpVelocity).toBeLessThan(-1);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/physics/PhysicsEngine.test.ts`
Expected: FAIL - module not found

**Step 3: Write minimal implementation**

```typescript
// src/physics/PhysicsEngine.ts
import { PhysicsState } from '@/core/types';

export interface PhysicsConfig {
  gravity: number;
  fastFallMultiplier: number;
  jumpVelocity: number;
}

const DEFAULT_PHYSICS_CONFIG: PhysicsConfig = {
  gravity: 0.7,
  fastFallMultiplier: 2.0,
  jumpVelocity: 18,
};

export class PhysicsEngine {
  private config: PhysicsConfig;

  constructor(config: Partial<PhysicsConfig> = {}) {
    this.config = { ...DEFAULT_PHYSICS_CONFIG, ...config };
  }

  update(state: PhysicsState, deltaTime: number): void {
    if (!state.alive) return;

    // Apply gravity (double if ducking in air = fast fall)
    const gravityMultiplier = state.isDucking && state.y > 0
      ? this.config.fastFallMultiplier
      : 1;

    state.jumpVelocity -= this.config.gravity * gravityMultiplier * deltaTime;
    state.y += state.jumpVelocity * deltaTime;

    // Ground collision
    if (state.y <= 0) {
      state.y = 0;
      state.jumpVelocity = 0;
    }
  }

  applyJump(state: PhysicsState): boolean {
    // Can only jump from ground
    if (state.y > 0) return false;

    state.jumpVelocity = this.config.jumpVelocity;
    return true;
  }

  isOnGround(state: PhysicsState): boolean {
    return state.y === 0;
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/physics/PhysicsEngine.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/physics/PhysicsEngine.ts tests/unit/physics/PhysicsEngine.test.ts
git commit -m "feat(physics): add PhysicsEngine with gravity and jumping"
```

---

## Task 2: ObstacleManager

**Files:**
- Create: `src/game/ObstacleManager.ts`
- Create: `tests/unit/game/ObstacleManager.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/unit/game/ObstacleManager.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { ObstacleManager } from '@/game/ObstacleManager';
import { Obstacle } from '@/core/types';

describe('ObstacleManager', () => {
  let manager: ObstacleManager;

  beforeEach(() => {
    manager = new ObstacleManager({
      canvasWidth: 800,
      spawnInterval: 100,
      highObstacleProbability: 0.4,
    });
  });

  describe('Spawning', () => {
    it('should spawn obstacle at canvas edge', () => {
      const obstacle = manager.spawn();

      expect(obstacle.x).toBe(800);
      expect(obstacle.width).toBeGreaterThan(0);
      expect(obstacle.height).toBeGreaterThan(0);
    });

    it('should spawn low or high obstacles', () => {
      const types = new Set<string>();
      for (let i = 0; i < 20; i++) {
        types.add(manager.spawn().type);
      }

      expect(types.has('low')).toBe(true);
      expect(types.has('high')).toBe(true);
    });
  });

  describe('Movement', () => {
    it('should move obstacles left', () => {
      const obstacle = manager.spawn();
      const initialX = obstacle.x;

      manager.update([obstacle], 5, 1);

      expect(obstacle.x).toBe(initialX - 5);
    });

    it('should remove obstacles that exit screen', () => {
      const obstacles: Obstacle[] = [
        { x: -50, type: 'low', width: 30, height: 25 },
        { x: 500, type: 'high', width: 30, height: 25 },
      ];

      const remaining = manager.update(obstacles, 5, 1);

      expect(remaining.length).toBe(1);
      expect(remaining[0].x).toBe(495);
    });
  });

  describe('Spawn Timing', () => {
    it('should track spawn readiness based on frame count', () => {
      expect(manager.shouldSpawn(0)).toBe(false);
      expect(manager.shouldSpawn(100)).toBe(true);
      expect(manager.shouldSpawn(101)).toBe(false);
      expect(manager.shouldSpawn(200)).toBe(true);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/game/ObstacleManager.test.ts`
Expected: FAIL - module not found

**Step 3: Write minimal implementation**

```typescript
// src/game/ObstacleManager.ts
import { Obstacle, ObstacleType } from '@/core/types';

export interface ObstacleManagerConfig {
  canvasWidth: number;
  spawnInterval: number;
  highObstacleProbability: number;
  obstacleWidth: number;
  obstacleHeight: number;
}

const DEFAULT_CONFIG: ObstacleManagerConfig = {
  canvasWidth: 800,
  spawnInterval: 130,
  highObstacleProbability: 0.4,
  obstacleWidth: 30,
  obstacleHeight: 25,
};

export class ObstacleManager {
  private config: ObstacleManagerConfig;

  constructor(config: Partial<ObstacleManagerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  spawn(): Obstacle {
    const type: ObstacleType = Math.random() < this.config.highObstacleProbability
      ? 'high'
      : 'low';

    return {
      x: this.config.canvasWidth,
      type,
      width: this.config.obstacleWidth,
      height: this.config.obstacleHeight,
    };
  }

  update(obstacles: Obstacle[], speed: number, deltaTime: number): Obstacle[] {
    return obstacles.filter(obstacle => {
      obstacle.x -= speed * deltaTime;
      return obstacle.x > -obstacle.width;
    });
  }

  shouldSpawn(frameCount: number): boolean {
    return frameCount > 0 && frameCount % this.config.spawnInterval === 0;
  }

  getObstacleY(obstacle: Obstacle, groundLevel: number): { top: number; bottom: number } {
    if (obstacle.type === 'low') {
      return {
        bottom: groundLevel,
        top: groundLevel - obstacle.height,
      };
    } else {
      // High obstacle: player must duck under
      const bottom = groundLevel - 70;
      return {
        bottom,
        top: bottom - obstacle.height,
      };
    }
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/game/ObstacleManager.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/game/ObstacleManager.ts tests/unit/game/ObstacleManager.test.ts
git commit -m "feat(game): add ObstacleManager for spawning and movement"
```

---

## Task 3: CollisionDetector

**Files:**
- Create: `src/game/CollisionDetector.ts`
- Create: `tests/unit/game/CollisionDetector.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/unit/game/CollisionDetector.test.ts
import { describe, it, expect } from 'vitest';
import { CollisionDetector, BoundingBox } from '@/game/CollisionDetector';
import { Obstacle } from '@/core/types';

describe('CollisionDetector', () => {
  const detector = new CollisionDetector({ groundLevel: 340 });

  describe('Box Collision', () => {
    it('should detect overlapping boxes', () => {
      const box1: BoundingBox = { left: 100, right: 150, top: 200, bottom: 300 };
      const box2: BoundingBox = { left: 120, right: 180, top: 250, bottom: 350 };

      expect(detector.boxesOverlap(box1, box2)).toBe(true);
    });

    it('should not detect non-overlapping boxes', () => {
      const box1: BoundingBox = { left: 100, right: 150, top: 200, bottom: 300 };
      const box2: BoundingBox = { left: 200, right: 250, top: 200, bottom: 300 };

      expect(detector.boxesOverlap(box1, box2)).toBe(false);
    });

    it('should not detect adjacent boxes', () => {
      const box1: BoundingBox = { left: 100, right: 150, top: 200, bottom: 300 };
      const box2: BoundingBox = { left: 150, right: 200, top: 200, bottom: 300 };

      expect(detector.boxesOverlap(box1, box2)).toBe(false);
    });
  });

  describe('Obstacle Collision', () => {
    it('should detect collision with low obstacle', () => {
      const playerBox: BoundingBox = { left: 140, right: 160, top: 240, bottom: 340 };
      const obstacle: Obstacle = { x: 145, type: 'low', width: 30, height: 25 };

      expect(detector.checkObstacle(playerBox, obstacle)).toBe(true);
    });

    it('should not detect collision when jumping over low obstacle', () => {
      // Player is in air (top is above obstacle)
      const playerBox: BoundingBox = { left: 140, right: 160, top: 200, bottom: 280 };
      const obstacle: Obstacle = { x: 145, type: 'low', width: 30, height: 25 };

      expect(detector.checkObstacle(playerBox, obstacle)).toBe(false);
    });

    it('should detect collision with high obstacle when standing', () => {
      const playerBox: BoundingBox = { left: 140, right: 160, top: 240, bottom: 340 };
      const obstacle: Obstacle = { x: 145, type: 'high', width: 30, height: 25 };

      expect(detector.checkObstacle(playerBox, obstacle)).toBe(true);
    });

    it('should not detect collision when ducking under high obstacle', () => {
      // Player is ducking (top is below obstacle bottom)
      const playerBox: BoundingBox = { left: 140, right: 160, top: 290, bottom: 340 };
      const obstacle: Obstacle = { x: 145, type: 'high', width: 30, height: 25 };

      expect(detector.checkObstacle(playerBox, obstacle)).toBe(false);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/game/CollisionDetector.test.ts`
Expected: FAIL - module not found

**Step 3: Write minimal implementation**

```typescript
// src/game/CollisionDetector.ts
import { Obstacle } from '@/core/types';

export interface BoundingBox {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface CollisionConfig {
  groundLevel: number;
  highObstacleOffset: number;
}

const DEFAULT_CONFIG: CollisionConfig = {
  groundLevel: 340,
  highObstacleOffset: 70,
};

export class CollisionDetector {
  private config: CollisionConfig;

  constructor(config: Partial<CollisionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  boxesOverlap(a: BoundingBox, b: BoundingBox): boolean {
    return (
      a.left < b.right &&
      a.right > b.left &&
      a.top < b.bottom &&
      a.bottom > b.top
    );
  }

  getObstacleBox(obstacle: Obstacle): BoundingBox {
    const left = obstacle.x;
    const right = obstacle.x + obstacle.width;

    if (obstacle.type === 'low') {
      return {
        left,
        right,
        top: this.config.groundLevel - obstacle.height,
        bottom: this.config.groundLevel,
      };
    } else {
      const bottom = this.config.groundLevel - this.config.highObstacleOffset;
      return {
        left,
        right,
        top: bottom - obstacle.height,
        bottom,
      };
    }
  }

  checkObstacle(playerBox: BoundingBox, obstacle: Obstacle): boolean {
    const obstacleBox = this.getObstacleBox(obstacle);
    return this.boxesOverlap(playerBox, obstacleBox);
  }

  checkAllObstacles(playerBox: BoundingBox, obstacles: Obstacle[]): Obstacle | null {
    for (const obstacle of obstacles) {
      if (this.checkObstacle(playerBox, obstacle)) {
        return obstacle;
      }
    }
    return null;
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/game/CollisionDetector.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/game/CollisionDetector.ts tests/unit/game/CollisionDetector.test.ts
git commit -m "feat(game): add CollisionDetector for player-obstacle collision"
```

---

## Task 4: StickmanRenderer

**Files:**
- Create: `src/rendering/StickmanRenderer.ts`
- Create: `tests/unit/rendering/StickmanRenderer.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/unit/rendering/StickmanRenderer.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StickmanRenderer } from '@/rendering/StickmanRenderer';
import { createStandingPose, createDuckingPose } from '@/pose/MockPoseDetector';
import { PhysicsState, CalibrationData } from '@/core/types';

describe('StickmanRenderer', () => {
  let renderer: StickmanRenderer;
  let mockCtx: CanvasRenderingContext2D;

  beforeEach(() => {
    renderer = new StickmanRenderer({ groundLevel: 340 });

    // Mock canvas context
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

  describe('Transform Coordinates', () => {
    it('should transform normalized coords to screen coords', () => {
      const landmarks = createStandingPose();
      const physics: PhysicsState = { y: 0, jumpVelocity: 0, isDucking: false, alive: true };
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

      const box = renderer.render(mockCtx, landmarks, physics, calibration, 150, '#00ff88');

      expect(box).toBeDefined();
      expect(box!.left).toBeLessThan(box!.right);
      expect(box!.top).toBeLessThan(box!.bottom);
    });

    it('should offset Y by jump height', () => {
      const landmarks = createStandingPose();
      const physicsGround: PhysicsState = { y: 0, jumpVelocity: 0, isDucking: false, alive: true };
      const physicsAir: PhysicsState = { y: 50, jumpVelocity: 0, isDucking: false, alive: true };
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

      const boxGround = renderer.render(mockCtx, landmarks, physicsGround, calibration, 150, '#00ff88');
      const boxAir = renderer.render(mockCtx, landmarks, physicsAir, calibration, 150, '#00ff88');

      expect(boxAir!.top).toBeLessThan(boxGround!.top);
      expect(boxAir!.bottom).toBeLessThan(boxGround!.bottom);
    });
  });

  describe('Ducking', () => {
    it('should compress upper body when ducking', () => {
      const landmarks = createStandingPose();
      const physicsStand: PhysicsState = { y: 0, jumpVelocity: 0, isDucking: false, alive: true };
      const physicsDuck: PhysicsState = { y: 0, jumpVelocity: 0, isDucking: true, alive: true };
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

      const boxStand = renderer.render(mockCtx, landmarks, physicsStand, calibration, 150, '#00ff88');
      const boxDuck = renderer.render(mockCtx, landmarks, physicsDuck, calibration, 150, '#00ff88');

      // Ducking should result in lower height (top closer to bottom)
      const standHeight = boxStand!.bottom - boxStand!.top;
      const duckHeight = boxDuck!.bottom - boxDuck!.top;
      expect(duckHeight).toBeLessThan(standHeight);
    });
  });

  describe('Drawing', () => {
    it('should call drawing methods', () => {
      const landmarks = createStandingPose();
      const physics: PhysicsState = { y: 0, jumpVelocity: 0, isDucking: false, alive: true };
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

      renderer.render(mockCtx, landmarks, physics, calibration, 150, '#00ff88');

      // Should draw multiple lines (limbs) and arc (head)
      expect(mockCtx.beginPath).toHaveBeenCalled();
      expect(mockCtx.stroke).toHaveBeenCalled();
      expect(mockCtx.arc).toHaveBeenCalled();
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/rendering/StickmanRenderer.test.ts`
Expected: FAIL - module not found

**Step 3: Write minimal implementation**

```typescript
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
```

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/rendering/StickmanRenderer.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/rendering/StickmanRenderer.ts tests/unit/rendering/StickmanRenderer.test.ts
git commit -m "feat(rendering): add StickmanRenderer for player visualization"
```

---

## Task 5: GameRenderer

**Files:**
- Create: `src/rendering/GameRenderer.ts`
- Create: `tests/unit/rendering/GameRenderer.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/unit/rendering/GameRenderer.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameRenderer } from '@/rendering/GameRenderer';
import { GameState, Obstacle } from '@/core/types';

describe('GameRenderer', () => {
  let renderer: GameRenderer;
  let mockCtx: CanvasRenderingContext2D;
  let mockCanvas: HTMLCanvasElement;

  beforeEach(() => {
    renderer = new GameRenderer();

    mockCtx = {
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      font: '',
      textAlign: 'left',
      shadowBlur: 0,
      shadowColor: '',
      globalAlpha: 1,
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      fillText: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      createLinearGradient: vi.fn(() => ({
        addColorStop: vi.fn(),
      })),
    } as unknown as CanvasRenderingContext2D;

    mockCanvas = {
      width: 800,
      height: 400,
      getContext: vi.fn(() => mockCtx),
    } as unknown as HTMLCanvasElement;
  });

  describe('Background', () => {
    it('should render background', () => {
      renderer.renderBackground(mockCtx, mockCanvas);

      expect(mockCtx.fillRect).toHaveBeenCalled();
    });
  });

  describe('Obstacles', () => {
    it('should render obstacles', () => {
      const obstacles: Obstacle[] = [
        { x: 500, type: 'low', width: 30, height: 25 },
        { x: 600, type: 'high', width: 30, height: 25 },
      ];

      renderer.renderObstacles(mockCtx, obstacles, 340);

      expect(mockCtx.fillRect).toHaveBeenCalledTimes(2);
    });
  });

  describe('UI', () => {
    it('should render score', () => {
      renderer.renderScore(mockCtx, 100, 500);

      expect(mockCtx.fillText).toHaveBeenCalled();
    });

    it('should render calibration screen', () => {
      renderer.renderCalibration(mockCtx, mockCanvas, 0.5, 1);

      expect(mockCtx.fillText).toHaveBeenCalled();
      expect(mockCtx.fillRect).toHaveBeenCalled(); // Progress bar
    });

    it('should render countdown', () => {
      renderer.renderCountdown(mockCtx, mockCanvas, 3);

      expect(mockCtx.fillText).toHaveBeenCalledWith('3', 400, 240);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/rendering/GameRenderer.test.ts`
Expected: FAIL - module not found

**Step 3: Write minimal implementation**

```typescript
// src/rendering/GameRenderer.ts
import { Obstacle } from '@/core/types';

export interface GameRendererConfig {
  groundLevel: number;
  lavaHeight: number;
  highObstacleOffset: number;
}

const DEFAULT_CONFIG: GameRendererConfig = {
  groundLevel: 340,
  lavaHeight: 60,
  highObstacleOffset: 70,
};

export class GameRenderer {
  private config: GameRendererConfig;

  constructor(config: Partial<GameRendererConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  renderBackground(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
    // Dark background
    ctx.fillStyle = '#1a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Lava gradient
    const lavaGrad = ctx.createLinearGradient(
      0, canvas.height - this.config.lavaHeight,
      0, canvas.height
    );
    lavaGrad.addColorStop(0, '#ff4500');
    lavaGrad.addColorStop(0.5, '#ff6b00');
    lavaGrad.addColorStop(1, '#ff8800');
    ctx.fillStyle = lavaGrad;
    ctx.fillRect(0, canvas.height - this.config.lavaHeight, canvas.width, this.config.lavaHeight);

    // Lava glow effect
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#ff4500';
    ctx.fillStyle = '#ff4500';
    for (let i = 0; i < 5; i++) {
      ctx.fillRect(
        Math.random() * canvas.width,
        canvas.height - this.config.lavaHeight,
        30, 10
      );
    }
    ctx.shadowBlur = 0;

    // Ground line
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height - this.config.lavaHeight);
    ctx.lineTo(canvas.width, canvas.height - this.config.lavaHeight);
    ctx.stroke();
  }

  renderObstacles(ctx: CanvasRenderingContext2D, obstacles: Obstacle[], groundLevel: number): void {
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ff0066';
    ctx.fillStyle = '#ff0066';

    for (const obs of obstacles) {
      let top: number;
      if (obs.type === 'low') {
        top = groundLevel - obs.height;
      } else {
        top = groundLevel - this.config.highObstacleOffset - obs.height;
      }
      ctx.fillRect(obs.x, top, obs.width, obs.height);
    }

    ctx.shadowBlur = 0;
  }

  renderScore(ctx: CanvasRenderingContext2D, score: number, highScore: number): void {
    ctx.font = 'bold 24px "Courier New", monospace';
    ctx.fillStyle = '#00ff88';
    ctx.fillText(`SCORE: ${score}`, 20, 40);
    ctx.fillText(`HIGH: ${highScore}`, 20, 70);
  }

  renderCalibration(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    progress: number,
    playerCount: number
  ): void {
    ctx.fillStyle = '#ff8800';
    ctx.font = 'bold 32px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('STA STILL FOR KALIBRERING...', canvas.width / 2, canvas.height / 2 - 50);

    // Progress bar
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 4;
    ctx.strokeRect(canvas.width / 2 - 150, canvas.height / 2, 300, 30);
    ctx.fillStyle = '#00ff88';
    ctx.fillRect(canvas.width / 2 - 148, canvas.height / 2 + 2, 296 * progress, 26);

    // Player count
    ctx.font = '24px "Courier New", monospace';
    ctx.fillStyle = '#00ff88';
    ctx.fillText(
      `${playerCount} SPELARE DETEKTERAD${playerCount > 1 ? 'E' : ''}`,
      canvas.width / 2,
      canvas.height / 2 + 80
    );
    ctx.textAlign = 'left';
  }

  renderCountdown(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, count: number): void {
    ctx.fillStyle = '#ff8800';
    ctx.font = 'bold 120px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.shadowBlur = 30;
    ctx.shadowColor = '#ff8800';
    ctx.fillText(count.toString(), canvas.width / 2, canvas.height / 2 + 40);
    ctx.shadowBlur = 0;
    ctx.textAlign = 'left';
  }

  renderDebugInfo(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    info: { playerCount: number; aliveCount: number }
  ): void {
    ctx.fillStyle = '#666';
    ctx.font = '12px "Courier New", monospace';
    ctx.fillText(
      `Players: ${info.playerCount}, Alive: ${info.aliveCount}`,
      20, canvas.height - 10
    );
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/rendering/GameRenderer.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/rendering/GameRenderer.ts tests/unit/rendering/GameRenderer.test.ts
git commit -m "feat(rendering): add GameRenderer for background, obstacles, UI"
```

---

## Task 6: GameEngine

**Files:**
- Create: `src/game/GameEngine.ts`
- Create: `tests/unit/game/GameEngine.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/unit/game/GameEngine.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameEngine } from '@/game/GameEngine';
import { GameStateType, Player } from '@/core/types';

describe('GameEngine', () => {
  let engine: GameEngine;

  beforeEach(() => {
    engine = new GameEngine();
  });

  describe('State Management', () => {
    it('should start in menu state', () => {
      expect(engine.getState()).toBe('menu');
    });

    it('should transition to calibrating on start', () => {
      engine.startGame();
      expect(engine.getState()).toBe('calibrating');
    });

    it('should transition to countdown when calibration complete', () => {
      engine.startGame();
      engine.completeCalibration();
      expect(engine.getState()).toBe('countdown');
    });

    it('should transition to playing after countdown', () => {
      vi.useFakeTimers();
      engine.startGame();
      engine.completeCalibration();

      vi.advanceTimersByTime(4000); // 3 second countdown + buffer

      expect(engine.getState()).toBe('playing');
      vi.useRealTimers();
    });

    it('should transition to gameOver when all players dead', () => {
      engine.startGame();
      engine.completeCalibration();
      engine.forceState('playing');

      // Add a player and kill them
      const player = engine.addPlayer();
      player.physics.alive = false;

      engine.checkGameOver();

      expect(engine.getState()).toBe('gameOver');
    });
  });

  describe('Player Management', () => {
    it('should add players during calibration', () => {
      engine.startGame();
      const player = engine.addPlayer();

      expect(player.id).toBe(0);
      expect(player.physics.alive).toBe(true);
      expect(engine.getPlayers().length).toBe(1);
    });

    it('should support up to 2 players', () => {
      engine.startGame();
      engine.addPlayer();
      engine.addPlayer();
      const third = engine.addPlayer();

      expect(engine.getPlayers().length).toBe(2);
      expect(third).toBeNull();
    });
  });

  describe('Game Loop', () => {
    it('should update frame count', () => {
      engine.startGame();
      engine.forceState('playing');

      engine.update(1);
      expect(engine.getFrameCount()).toBe(1);

      engine.update(1);
      expect(engine.getFrameCount()).toBe(2);
    });

    it('should increase speed over time', () => {
      engine.startGame();
      engine.forceState('playing');

      const initialSpeed = engine.getSpeed();

      for (let i = 0; i < 300; i++) {
        engine.update(1);
      }

      expect(engine.getSpeed()).toBeGreaterThan(initialSpeed);
    });
  });

  describe('Scoring', () => {
    it('should increase score for alive players', () => {
      engine.startGame();
      engine.forceState('playing');
      const player = engine.addPlayer();

      engine.update(1);

      expect(player.score).toBe(1);
    });

    it('should not increase score for dead players', () => {
      engine.startGame();
      engine.forceState('playing');
      const player = engine.addPlayer();
      player.physics.alive = false;

      engine.update(1);

      expect(player.score).toBe(0);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/game/GameEngine.test.ts`
Expected: FAIL - module not found

**Step 3: Write minimal implementation**

```typescript
// src/game/GameEngine.ts
import {
  GameStateType,
  Player,
  Obstacle,
  PhysicsState,
  CalibrationData,
  PLAYER_COLORS,
  PLAYER_OFFSETS,
} from '@/core/types';
import { PhysicsEngine } from '@/physics/PhysicsEngine';
import { ObstacleManager } from './ObstacleManager';
import { CollisionDetector, BoundingBox } from './CollisionDetector';

export interface GameEngineConfig {
  canvasWidth: number;
  canvasHeight: number;
  groundLevel: number;
  initialSpeed: number;
  speedIncrement: number;
  speedIncreaseInterval: number;
  baseX: number;
}

const DEFAULT_CONFIG: GameEngineConfig = {
  canvasWidth: 800,
  canvasHeight: 400,
  groundLevel: 340,
  initialSpeed: 3,
  speedIncrement: 0.3,
  speedIncreaseInterval: 300,
  baseX: 150,
};

export class GameEngine {
  private config: GameEngineConfig;
  private state: GameStateType = 'menu';
  private players: Player[] = [];
  private obstacles: Obstacle[] = [];
  private frameCount = 0;
  private speed: number;
  private highScore = 0;
  private countdownValue = 3;
  private countdownTimer: ReturnType<typeof setInterval> | null = null;

  private physicsEngine: PhysicsEngine;
  private obstacleManager: ObstacleManager;
  private collisionDetector: CollisionDetector;

  constructor(config: Partial<GameEngineConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.speed = this.config.initialSpeed;

    this.physicsEngine = new PhysicsEngine();
    this.obstacleManager = new ObstacleManager({ canvasWidth: this.config.canvasWidth });
    this.collisionDetector = new CollisionDetector({ groundLevel: this.config.groundLevel });
  }

  // State management
  getState(): GameStateType {
    return this.state;
  }

  forceState(state: GameStateType): void {
    this.state = state;
  }

  startGame(): void {
    this.state = 'calibrating';
    this.players = [];
    this.obstacles = [];
    this.frameCount = 0;
    this.speed = this.config.initialSpeed;
  }

  completeCalibration(): void {
    this.state = 'countdown';
    this.countdownValue = 3;

    this.countdownTimer = setInterval(() => {
      this.countdownValue--;
      if (this.countdownValue <= 0) {
        if (this.countdownTimer) clearInterval(this.countdownTimer);
        this.state = 'playing';
      }
    }, 1000);
  }

  getCountdown(): number {
    return this.countdownValue;
  }

  endGame(): void {
    this.state = 'gameOver';
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
    }

    const maxScore = Math.max(...this.players.map(p => p.score), 0);
    if (maxScore > this.highScore) {
      this.highScore = maxScore;
    }
  }

  checkGameOver(): void {
    if (this.players.length === 0) return;

    const alivePlayers = this.players.filter(p => p.physics.alive);
    if (alivePlayers.length === 0) {
      this.endGame();
    }
  }

  // Player management
  addPlayer(): Player | null {
    if (this.players.length >= 2) return null;

    const id = this.players.length;
    const player: Player = {
      id,
      color: PLAYER_COLORS[id],
      landmarks: null,
      smoothedLandmarks: null,
      calibration: this.createDefaultCalibration(),
      physics: this.createDefaultPhysics(),
      score: 0,
      baseX: this.config.baseX + PLAYER_OFFSETS[id],
    };

    this.players.push(player);
    return player;
  }

  removePlayer(id: number): void {
    this.players = this.players.filter(p => p.id !== id);
  }

  getPlayers(): Player[] {
    return this.players;
  }

  // Game loop
  update(deltaTime: number): void {
    if (this.state !== 'playing') return;

    this.frameCount++;

    // Update physics for each player
    for (const player of this.players) {
      if (player.physics.alive) {
        this.physicsEngine.update(player.physics, deltaTime);
        player.score++;
      }
    }

    // Spawn obstacles
    if (this.obstacleManager.shouldSpawn(this.frameCount)) {
      this.obstacles.push(this.obstacleManager.spawn());
    }

    // Update obstacles
    this.obstacles = this.obstacleManager.update(this.obstacles, this.speed, deltaTime);

    // Increase difficulty
    if (this.frameCount % this.config.speedIncreaseInterval === 0) {
      this.speed += this.config.speedIncrement;
    }
  }

  checkCollisions(playerBoxes: Map<number, BoundingBox>): void {
    for (const player of this.players) {
      if (!player.physics.alive) continue;

      const box = playerBoxes.get(player.id);
      if (!box) continue;

      const collision = this.collisionDetector.checkAllObstacles(box, this.obstacles);
      if (collision) {
        player.physics.alive = false;
      }
    }
  }

  applyJump(playerId: number): void {
    const player = this.players.find(p => p.id === playerId);
    if (player && player.physics.alive) {
      this.physicsEngine.applyJump(player.physics);
    }
  }

  // Getters
  getObstacles(): Obstacle[] {
    return this.obstacles;
  }

  getFrameCount(): number {
    return this.frameCount;
  }

  getSpeed(): number {
    return this.speed;
  }

  getScore(): number {
    return Math.max(...this.players.map(p => p.score), 0);
  }

  getHighScore(): number {
    return this.highScore;
  }

  getConfig(): GameEngineConfig {
    return this.config;
  }

  // Helpers
  private createDefaultPhysics(): PhysicsState {
    return {
      y: 0,
      jumpVelocity: 0,
      isDucking: false,
      alive: true,
    };
  }

  private createDefaultCalibration(): CalibrationData {
    return {
      baselineShoulderY: 0,
      baselineHeight: 0,
      baselineTorsoLength: 0,
      ankleX: 0,
      ankleY: 0,
      bodyScale: 0,
      shoulderVelocity: 0,
      lastJumpTime: null,
      isCalibrated: false,
    };
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/game/GameEngine.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/game/GameEngine.ts tests/unit/game/GameEngine.test.ts
git commit -m "feat(game): add GameEngine state machine and game loop"
```

---

## Task 7: React Components - GameCanvas

**Files:**
- Create: `src/ui/GameCanvas.tsx`
- Create: `src/ui/useGameLoop.ts`

**Step 1: Create the GameCanvas component**

```typescript
// src/ui/GameCanvas.tsx
import { useRef, useEffect, useCallback } from 'react';
import { GameEngine } from '@/game/GameEngine';
import { GameRenderer } from '@/rendering/GameRenderer';
import { StickmanRenderer } from '@/rendering/StickmanRenderer';
import { BoundingBox } from '@/game/CollisionDetector';

interface GameCanvasProps {
  engine: GameEngine;
  onGameOver: () => void;
}

export function GameCanvas({ engine, onGameOver }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const gameRenderer = useRef(new GameRenderer());
  const stickmanRenderer = useRef(new StickmanRenderer());

  const render = useCallback((timestamp: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Calculate delta time
    const elapsed = timestamp - lastTimeRef.current;
    lastTimeRef.current = timestamp;
    const deltaTime = Math.min(elapsed / 16.67, 3); // Normalize to 60fps

    const state = engine.getState();
    const config = engine.getConfig();

    // Render background
    gameRenderer.current.renderBackground(ctx, canvas);

    if (state === 'calibrating') {
      // Render calibration UI
      const progress = 0; // TODO: Get from calibration service
      gameRenderer.current.renderCalibration(ctx, canvas, progress, engine.getPlayers().length);
    } else if (state === 'countdown') {
      gameRenderer.current.renderCountdown(ctx, canvas, engine.getCountdown());
    } else if (state === 'playing') {
      // Update game state
      engine.update(deltaTime);

      // Render obstacles
      gameRenderer.current.renderObstacles(ctx, engine.getObstacles(), config.groundLevel);

      // Render players and collect collision boxes
      const playerBoxes = new Map<number, BoundingBox>();
      for (const player of engine.getPlayers()) {
        if (player.physics.alive && player.smoothedLandmarks) {
          const box = stickmanRenderer.current.render(
            ctx,
            player.smoothedLandmarks,
            player.physics,
            player.calibration,
            player.baseX,
            player.color
          );
          if (box) {
            playerBoxes.set(player.id, box);
          }
        }
      }

      // Check collisions
      engine.checkCollisions(playerBoxes);

      // Render score
      gameRenderer.current.renderScore(ctx, engine.getScore(), engine.getHighScore());

      // Check game over
      engine.checkGameOver();
      if (engine.getState() === 'gameOver') {
        onGameOver();
        return;
      }
    }

    animationRef.current = requestAnimationFrame(render);
  }, [engine, onGameOver]);

  useEffect(() => {
    lastTimeRef.current = performance.now();
    animationRef.current = requestAnimationFrame(render);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [render]);

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={400}
      className="border-4 border-christmas-green"
      style={{
        boxShadow: '0 0 30px #00ff88, inset 0 0 30px rgba(0, 255, 136, 0.1)',
      }}
    />
  );
}
```

**Step 2: Create hook file (placeholder)**

```typescript
// src/ui/useGameLoop.ts
import { useRef, useEffect, useCallback } from 'react';

export function useGameLoop(callback: (deltaTime: number) => void, isRunning: boolean) {
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  const loop = useCallback((timestamp: number) => {
    const elapsed = timestamp - lastTimeRef.current;
    lastTimeRef.current = timestamp;
    const deltaTime = Math.min(elapsed / 16.67, 3);

    callback(deltaTime);

    animationRef.current = requestAnimationFrame(loop);
  }, [callback]);

  useEffect(() => {
    if (isRunning) {
      lastTimeRef.current = performance.now();
      animationRef.current = requestAnimationFrame(loop);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRunning, loop]);
}
```

**Step 3: Commit**

```bash
git add src/ui/GameCanvas.tsx src/ui/useGameLoop.ts
git commit -m "feat(ui): add GameCanvas component and useGameLoop hook"
```

---

## Task 8: React Components - Menu and GameOver

**Files:**
- Create: `src/ui/Menu.tsx`
- Create: `src/ui/GameOver.tsx`

**Step 1: Create Menu component**

```typescript
// src/ui/Menu.tsx
interface MenuProps {
  isLoading: boolean;
  loadingText: string;
  onStart: () => void;
}

export function Menu({ isLoading, loadingText, onStart }: MenuProps) {
  return (
    <div className="text-center">
      <h1
        className="text-7xl font-bold mb-2"
        style={{
          textShadow: '0 0 20px #ff4500, 0 0 40px #ff4500',
          letterSpacing: '8px',
          color: '#00ff88',
        }}
      >
        JULSPELET
      </h1>

      <p className="text-2xl mt-8 text-orange-500">
        Styrs med Pose Detection!
      </p>

      <div className="mt-10 text-lg text-green-400 space-y-2">
        <p>HOPPA: Hoppa pa riktigt!</p>
        <p>DUCKA: Boj dig ner / satt dig pa huk</p>
        <p>1-2 spelare stods!</p>
      </div>

      {isLoading && (
        <p className="mt-5 text-orange-500">{loadingText}</p>
      )}

      <button
        onClick={onStart}
        disabled={isLoading}
        className="mt-12 px-16 py-5 text-3xl font-bold text-white border-4 border-green-400 rounded-none cursor-pointer disabled:bg-gray-600 disabled:cursor-not-allowed"
        style={{
          background: isLoading ? '#333' : 'linear-gradient(45deg, #ff4500, #ff6b00)',
          boxShadow: isLoading ? 'none' : '0 0 20px #ff4500, 0 0 40px #ff4500',
          transition: 'all 0.3s',
        }}
      >
        {isLoading ? 'VANTAR...' : 'START'}
      </button>
    </div>
  );
}
```

**Step 2: Create GameOver component**

```typescript
// src/ui/GameOver.tsx
interface GameOverProps {
  score: number;
  isNewRecord: boolean;
  onRestart: () => void;
}

export function GameOver({ score, isNewRecord, onRestart }: GameOverProps) {
  return (
    <div className="text-center">
      <h1
        className="text-7xl font-bold mb-8"
        style={{
          color: '#ff0066',
          textShadow: '0 0 20px #ff0066, 0 0 40px #ff0066',
        }}
      >
        GAME OVER
      </h1>

      <p className="text-5xl text-green-400 mb-4">
        SCORE: {score}
      </p>

      {isNewRecord && (
        <p
          className="text-3xl mb-8 animate-pulse"
          style={{
            color: '#ff8800',
            textShadow: '0 0 15px #ff8800',
          }}
        >
          NYTT REKORD!
        </p>
      )}

      <button
        onClick={onRestart}
        className="mt-8 px-16 py-5 text-3xl font-bold text-white border-4 border-green-400 rounded-none cursor-pointer"
        style={{
          background: 'linear-gradient(45deg, #ff4500, #ff6b00)',
          boxShadow: '0 0 20px #ff4500, 0 0 40px #ff4500',
        }}
      >
        SPELA IGEN
      </button>
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add src/ui/Menu.tsx src/ui/GameOver.tsx
git commit -m "feat(ui): add Menu and GameOver components"
```

---

## Task 9: Main App Integration

**Files:**
- Modify: `src/App.tsx`
- Create: `src/hooks/usePoseDetection.ts`
- Create: `src/hooks/useCamera.ts`

**Step 1: Create camera hook**

```typescript
// src/hooks/useCamera.ts
import { useState, useRef, useCallback } from 'react';

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialize = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await new Promise<void>((resolve) => {
          videoRef.current!.onloadedmetadata = () => {
            videoRef.current!.play();
            resolve();
          };
        });
        setIsReady(true);
      }
    } catch (err) {
      setError('Kameran kravs for att spela!');
      console.error('Camera error:', err);
    }
  }, []);

  const stop = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsReady(false);
  }, []);

  return {
    videoRef,
    isReady,
    error,
    initialize,
    stop,
  };
}
```

**Step 2: Create pose detection hook**

```typescript
// src/hooks/usePoseDetection.ts
import { useState, useRef, useCallback, useEffect } from 'react';
import { MediaPipePoseDetector } from '@/pose/MediaPipePoseDetector';
import { LandmarkProcessor } from '@/pose/LandmarkProcessor';
import { CalibrationService } from '@/pose/CalibrationService';
import { GestureDetector } from '@/pose/GestureDetector';
import { Player } from '@/core/types';

interface UsePoseDetectionOptions {
  videoElement: HTMLVideoElement | null;
  players: Player[];
  isCalibrating: boolean;
  isPlaying: boolean;
  onCalibrationComplete: () => void;
  onGesture: (playerId: number, gesture: { shouldJump: boolean; isDucking: boolean }) => void;
}

export function usePoseDetection({
  videoElement,
  players,
  isCalibrating,
  isPlaying,
  onCalibrationComplete,
  onGesture,
}: UsePoseDetectionOptions) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [calibrationProgress, setCalibrationProgress] = useState(0);

  const detectorRef = useRef<MediaPipePoseDetector | null>(null);
  const processorsRef = useRef<Map<number, LandmarkProcessor>>(new Map());
  const calibrationRef = useRef<Map<number, CalibrationService>>(new Map());
  const gestureRef = useRef<Map<number, GestureDetector>>(new Map());

  const initialize = useCallback(async () => {
    detectorRef.current = new MediaPipePoseDetector({ numPoses: 2 });
    await detectorRef.current.initialize();
    setIsInitialized(true);
  }, []);

  const startDetection = useCallback(() => {
    if (!detectorRef.current || !videoElement) return;

    detectorRef.current.start(videoElement, (result) => {
      if (result.poses.length === 0) return;

      // Sort poses left-to-right
      const sortedPoses = [...result.poses].sort((a, b) => {
        const hipXA = (a[23].x + a[24].x) / 2;
        const hipXB = (b[23].x + b[24].x) / 2;
        return hipXA - hipXB;
      });

      // Process each detected player
      for (let i = 0; i < Math.min(sortedPoses.length, players.length); i++) {
        const player = players[i];
        const landmarks = sortedPoses[i];

        // Get or create processor
        if (!processorsRef.current.has(player.id)) {
          processorsRef.current.set(player.id, new LandmarkProcessor());
        }
        const processor = processorsRef.current.get(player.id)!;
        const smoothed = processor.process(landmarks);
        player.landmarks = landmarks;
        player.smoothedLandmarks = smoothed;

        if (isCalibrating) {
          // Calibration mode
          if (!calibrationRef.current.has(player.id)) {
            calibrationRef.current.set(player.id, new CalibrationService());
          }
          const calibration = calibrationRef.current.get(player.id)!;
          const complete = calibration.addFrame(landmarks);
          setCalibrationProgress(calibration.getProgress());

          if (complete) {
            const result = calibration.finalize();
            if (result.success && result.data) {
              player.calibration = result.data;
            }
          }
        } else if (isPlaying && player.calibration.isCalibrated) {
          // Game mode - detect gestures
          if (!gestureRef.current.has(player.id)) {
            gestureRef.current.set(player.id, new GestureDetector());
          }
          const detector = gestureRef.current.get(player.id)!;
          const gesture = detector.detect(landmarks, player.calibration, player.physics);
          onGesture(player.id, gesture);
        }
      }

      // Check if all players calibrated
      if (isCalibrating) {
        const allCalibrated = players.every(p => p.calibration.isCalibrated);
        if (allCalibrated && players.length > 0) {
          onCalibrationComplete();
        }
      }
    });
  }, [videoElement, players, isCalibrating, isPlaying, onCalibrationComplete, onGesture]);

  const stopDetection = useCallback(() => {
    detectorRef.current?.stop();
  }, []);

  const reset = useCallback(() => {
    processorsRef.current.clear();
    calibrationRef.current.clear();
    gestureRef.current.clear();
    setCalibrationProgress(0);
  }, []);

  useEffect(() => {
    return () => {
      detectorRef.current?.dispose();
    };
  }, []);

  return {
    isInitialized,
    calibrationProgress,
    initialize,
    startDetection,
    stopDetection,
    reset,
  };
}
```

**Step 3: Update App.tsx**

```typescript
// src/App.tsx
import { useState, useRef, useEffect, useCallback } from 'react';
import { GameEngine } from '@/game/GameEngine';
import { GameCanvas } from '@/ui/GameCanvas';
import { Menu } from '@/ui/Menu';
import { GameOver } from '@/ui/GameOver';
import { useCamera } from '@/hooks/useCamera';
import { usePoseDetection } from '@/hooks/usePoseDetection';

function App() {
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameOver'>('menu');
  const [isLoading, setIsLoading] = useState(true);
  const [loadingText, setLoadingText] = useState('Laddar AI-modell...');
  const [finalScore, setFinalScore] = useState(0);
  const [isNewRecord, setIsNewRecord] = useState(false);

  const engineRef = useRef<GameEngine>(new GameEngine());
  const camera = useCamera();

  const pose = usePoseDetection({
    videoElement: camera.videoRef.current,
    players: engineRef.current.getPlayers(),
    isCalibrating: engineRef.current.getState() === 'calibrating',
    isPlaying: engineRef.current.getState() === 'playing',
    onCalibrationComplete: () => {
      engineRef.current.completeCalibration();
    },
    onGesture: (playerId, gesture) => {
      if (gesture.shouldJump) {
        engineRef.current.applyJump(playerId);
      }
      const player = engineRef.current.getPlayers().find(p => p.id === playerId);
      if (player) {
        player.physics.isDucking = gesture.isDucking;
      }
    },
  });

  // Initialize on mount
  useEffect(() => {
    const init = async () => {
      setLoadingText('Laddar AI-modell...');
      await pose.initialize();
      setLoadingText('Startar kamera...');
      await camera.initialize();
      setLoadingText('Redo!');
      setIsLoading(false);
    };
    init();

    return () => {
      camera.stop();
    };
  }, []);

  const handleStart = useCallback(() => {
    engineRef.current = new GameEngine();
    engineRef.current.startGame();
    pose.reset();
    pose.startDetection();
    setGameState('playing');
  }, [pose]);

  const handleGameOver = useCallback(() => {
    pose.stopDetection();
    setFinalScore(engineRef.current.getScore());
    setIsNewRecord(engineRef.current.getScore() > 0 &&
      engineRef.current.getScore() >= engineRef.current.getHighScore());
    setGameState('gameOver');
  }, [pose]);

  const handleRestart = useCallback(() => {
    handleStart();
  }, [handleStart]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-red-950 flex flex-col items-center justify-center font-mono text-green-400">
      {/* Hidden video element for camera */}
      <video
        ref={camera.videoRef}
        className="hidden"
        width={640}
        height={480}
        autoPlay
        playsInline
      />

      {gameState === 'menu' && (
        <Menu
          isLoading={isLoading}
          loadingText={loadingText}
          onStart={handleStart}
        />
      )}

      {gameState === 'playing' && (
        <GameCanvas
          engine={engineRef.current}
          onGameOver={handleGameOver}
        />
      )}

      {gameState === 'gameOver' && (
        <GameOver
          score={finalScore}
          isNewRecord={isNewRecord}
          onRestart={handleRestart}
        />
      )}
    </div>
  );
}

export default App;
```

**Step 4: Commit**

```bash
git add src/App.tsx src/hooks/useCamera.ts src/hooks/usePoseDetection.ts
git commit -m "feat: integrate all components in App with camera and pose detection"
```

---

## Task 10: Run All Tests and Verify

**Step 1: Run all tests**

Run: `npm test`
Expected: All tests pass

**Step 2: Run build**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete julspelet implementation"
```

---

## Summary

This plan implements the complete game with:

1. **PhysicsEngine** - Gravity, jumping, fast-fall
2. **ObstacleManager** - Spawning, movement, removal
3. **CollisionDetector** - AABB collision detection
4. **GameEngine** - State machine, game loop, scoring
5. **StickmanRenderer** - Player visualization with ducking
6. **GameRenderer** - Background, obstacles, UI
7. **React Components** - Menu, GameCanvas, GameOver
8. **Hooks** - useCamera, usePoseDetection, useGameLoop
9. **Integration** - Complete App with all systems

Total: ~10 tasks, each with TDD approach (test first, implement, verify, commit).
