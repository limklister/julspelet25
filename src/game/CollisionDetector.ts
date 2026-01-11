import { GameObject, CollisionResult, PhysicsState } from '@/core/types';

export interface BoundingBox {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface CollisionConfig {
  groundLevel: number;
}

const DEFAULT_CONFIG: CollisionConfig = {
  groundLevel: 340,
};

export class CollisionDetector {
  private config: CollisionConfig;

  constructor(config: Partial<CollisionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  updateConfig(config: Partial<CollisionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  boxesOverlap(a: BoundingBox, b: BoundingBox): boolean {
    return (
      a.left < b.right &&
      a.right > b.left &&
      a.top < b.bottom &&
      a.bottom > b.top
    );
  }

  getObjectBox(obj: GameObject): BoundingBox {
    return {
      left: obj.x - obj.width / 2,
      right: obj.x + obj.width / 2,
      top: obj.y - obj.height / 2,
      bottom: obj.y + obj.height / 2,
    };
  }

  /**
   * Check collision between player and game object
   * Returns collision result based on player state and object type
   */
  checkObject(
    playerBox: BoundingBox,
    physics: PhysicsState,
    obj: GameObject,
    currentLevel: number
  ): CollisionResult | null {
    const objectBox = this.getObjectBox(obj);

    // Check if boxes overlap
    if (!this.boxesOverlap(playerBox, objectBox)) {
      return null;
    }

    const isDucking = physics.isDucking;
    const isJumping = physics.y > 20; // Threshold for being "in the air"

    switch (obj.type) {
      case 'package':
        // Packages: catch if standing/jumping, miss if ducking
        if (isDucking) {
          // Don't count as collision - package passes over
          return null;
        }
        return { type: 'catch', object: obj };

      case 'flyingSnowball':
        // Flying snowballs: dodge if ducking, hit if standing/jumping
        if (isDucking) {
          return { type: 'dodge', object: obj };
        }
        return { type: 'hit', object: obj, packagesLost: currentLevel };

      case 'rollingSnowball':
        // Rolling snowballs: dodge if jumping, hit if on ground
        if (isJumping) {
          return { type: 'dodge', object: obj };
        }
        return { type: 'hit', object: obj, packagesLost: currentLevel };
    }
  }

  /**
   * Check all objects for collisions with player
   * Returns array of collision results
   */
  checkAllObjects(
    playerBox: BoundingBox,
    physics: PhysicsState,
    objects: GameObject[],
    currentLevel: number
  ): CollisionResult[] {
    const results: CollisionResult[] = [];

    for (const obj of objects) {
      if (obj.consumed) continue;

      const result = this.checkObject(playerBox, physics, obj, currentLevel);
      if (result) {
        results.push(result);
      }
    }

    return results;
  }
}
