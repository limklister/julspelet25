import { GameObject, GameObjectType } from '@/core/types';

export interface ObjectManagerConfig {
  canvasWidth: number;
  groundLevel: number;
  baseSpawnInterval: number;
  packageProbability: number;
  flyingSnowballProbability: number;
  // rollingSnowballProbability is the remainder
}

const DEFAULT_CONFIG: ObjectManagerConfig = {
  canvasWidth: 800,
  groundLevel: 340,
  baseSpawnInterval: 80,
  packageProbability: 0.6,
  flyingSnowballProbability: 0.2,
};

export class ObjectManager {
  private config: ObjectManagerConfig;
  private nextId = 0;

  constructor(config: Partial<ObjectManagerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  updateConfig(config: Partial<ObjectManagerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  spawn(): GameObject {
    const rand = Math.random();
    let type: GameObjectType;

    if (rand < this.config.packageProbability) {
      type = 'package';
    } else if (rand < this.config.packageProbability + this.config.flyingSnowballProbability) {
      type = 'flyingSnowball';
    } else {
      type = 'rollingSnowball';
    }

    return this.createObject(type);
  }

  private createObject(type: GameObjectType): GameObject {
    const id = this.nextId++;
    const groundLevel = this.config.groundLevel;

    switch (type) {
      case 'package':
        return {
          id,
          x: this.config.canvasWidth + 50,
          y: groundLevel - 115, // Upper body height - where packages fly
          type: 'package',
          width: 40,
          height: 40,
          consumed: false,
          variant: Math.random() < 0.5 ? 0 : 1, // Red or green
        };

      case 'flyingSnowball':
        return {
          id,
          x: this.config.canvasWidth + 30,
          y: groundLevel - 150, // Head height - need to duck
          type: 'flyingSnowball',
          width: 25,
          height: 25,
          consumed: false,
          variant: 0,
        };

      case 'rollingSnowball':
        return {
          id,
          x: this.config.canvasWidth + 30,
          y: groundLevel - 20, // Ground level - need to jump
          type: 'rollingSnowball',
          width: 30,
          height: 30,
          consumed: false,
          variant: 0,
        };
    }
  }

  update(objects: GameObject[], speed: number, deltaTime: number): GameObject[] {
    return objects.filter(obj => {
      if (obj.consumed) return false;
      obj.x -= speed * deltaTime;
      return obj.x > -obj.width - 50;
    });
  }

  shouldSpawn(frameCount: number, speedMultiplier: number): boolean {
    // Spawn more frequently at higher speeds
    const interval = Math.max(40, Math.floor(this.config.baseSpawnInterval / speedMultiplier));
    return frameCount > 0 && frameCount % interval === 0;
  }

  getObjectBounds(obj: GameObject): { left: number; right: number; top: number; bottom: number } {
    return {
      left: obj.x - obj.width / 2,
      right: obj.x + obj.width / 2,
      top: obj.y - obj.height / 2,
      bottom: obj.y + obj.height / 2,
    };
  }
}
