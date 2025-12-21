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
