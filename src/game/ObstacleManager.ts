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
      const bottom = groundLevel - 70;
      return {
        bottom,
        top: bottom - obstacle.height,
      };
    }
  }
}
