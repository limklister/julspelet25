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
