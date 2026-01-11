import {
  GameStateType,
  Player,
  GameObject,
  PhysicsState,
  CalibrationData,
  LevelState,
  CollisionResult,
  PLAYER_COLORS,
  PLAYER_OFFSETS,
} from '@/core/types';
import { PhysicsEngine } from '@/physics/PhysicsEngine';
import { ObjectManager } from './ObjectManager';
import { CollisionDetector, BoundingBox } from './CollisionDetector';

export interface GameEngineConfig {
  canvasWidth: number;
  canvasHeight: number;
  groundLevel: number;
  initialSpeed: number;
  speedMultiplierPerLevel: number;
  packagesPerLevel: number;
  totalLevels: number;
  baseX: number;
  levelTimeoutSeconds: number;
  packagesLostOnHit: number;
}

const DEFAULT_CONFIG: GameEngineConfig = {
  canvasWidth: 800,
  canvasHeight: 400,
  groundLevel: 340,
  initialSpeed: 4,
  speedMultiplierPerLevel: 1.15,
  packagesPerLevel: 10,
  totalLevels: 5,
  baseX: 150,
  levelTimeoutSeconds: 45,
  packagesLostOnHit: 1,
};

export interface GameEvent {
  type: 'catch' | 'hit' | 'levelComplete' | 'win' | 'timeout';
  packagesLost?: number;
  level?: number;
}

export class GameEngine {
  private config: GameEngineConfig;
  private state: GameStateType = 'menu';
  private players: Player[] = [];
  private objects: GameObject[] = [];
  private frameCount = 0;
  private levelState: LevelState;
  private highestLevel = 1;
  private countdownValue = 3;
  private countdownTimer: ReturnType<typeof setInterval> | null = null;
  private levelCompleteTimer: ReturnType<typeof setTimeout> | null = null;
  private levelTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
  private levelStartTime = 0;
  private pendingEvents: GameEvent[] = [];

  private physicsEngine: PhysicsEngine;
  private objectManager: ObjectManager;
  private collisionDetector: CollisionDetector;

  constructor(config: Partial<GameEngineConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.levelState = this.createDefaultLevelState();
    this.physicsEngine = new PhysicsEngine();
    this.objectManager = new ObjectManager({
      canvasWidth: this.config.canvasWidth,
      groundLevel: this.config.groundLevel,
    });
    this.collisionDetector = new CollisionDetector({
      groundLevel: this.config.groundLevel,
    });
  }

  getState(): GameStateType { return this.state; }
  forceState(state: GameStateType): void { this.state = state; }
  getLevelState(): LevelState { return this.levelState; }
  getHighestLevel(): number { return this.highestLevel; }

  // Get and clear pending events (for UI feedback)
  popEvents(): GameEvent[] {
    const events = this.pendingEvents;
    this.pendingEvents = [];
    return events;
  }

  startGame(): void {
    this.state = 'calibrating';
    this.players = [];
    this.objects = [];
    this.frameCount = 0;
    this.levelState = this.createDefaultLevelState();
  }

  completeCalibration(): void {
    this.state = 'countdown';
    this.countdownValue = 3;
    this.countdownTimer = setInterval(() => {
      this.countdownValue--;
      if (this.countdownValue <= 0) {
        if (this.countdownTimer) clearInterval(this.countdownTimer);
        this.state = 'playing';
        this.startLevelTimer();
      }
    }, 1000);
  }

  private startLevelTimer(): void {
    this.levelStartTime = Date.now();
    if (this.levelTimeoutTimer) clearTimeout(this.levelTimeoutTimer);
    this.levelTimeoutTimer = setTimeout(() => {
      if (this.state === 'playing') {
        this.pendingEvents.push({ type: 'timeout', level: this.levelState.level });
        this.endGame();
      }
    }, this.config.levelTimeoutSeconds * 1000);
  }

  getLevelTimeRemaining(): number {
    if (this.state !== 'playing') return this.config.levelTimeoutSeconds;
    const elapsed = (Date.now() - this.levelStartTime) / 1000;
    return Math.max(0, this.config.levelTimeoutSeconds - elapsed);
  }

  getCountdown(): number { return this.countdownValue; }

  private advanceLevel(): void {
    if (this.levelState.level >= this.config.totalLevels) {
      // Won the game!
      this.state = 'win';
      if (this.levelState.level > this.highestLevel) {
        this.highestLevel = this.levelState.level;
      }
      this.pendingEvents.push({ type: 'win' });
      return;
    }

    // Show level complete state briefly
    this.state = 'levelComplete';
    this.pendingEvents.push({
      type: 'levelComplete',
      level: this.levelState.level,
    });

    this.levelCompleteTimer = setTimeout(() => {
      this.levelState.level++;
      this.levelState.packagesCollected = 0;
      this.levelState.speedMultiplier =
        Math.pow(this.config.speedMultiplierPerLevel, this.levelState.level - 1);

      if (this.levelState.level > this.highestLevel) {
        this.highestLevel = this.levelState.level;
      }

      // Clear objects and restart
      this.objects = [];
      this.state = 'playing';
      this.startLevelTimer();
    }, 2000);
  }

  endGame(): void {
    this.state = 'gameOver';
    if (this.countdownTimer) clearInterval(this.countdownTimer);
    if (this.levelCompleteTimer) clearTimeout(this.levelCompleteTimer);
    if (this.levelTimeoutTimer) clearTimeout(this.levelTimeoutTimer);
  }

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

  getPlayers(): Player[] { return this.players; }

  update(deltaTime: number): void {
    if (this.state !== 'playing') return;
    this.frameCount++;

    // Update physics for all players
    for (const player of this.players) {
      if (player.physics.alive) {
        this.physicsEngine.update(player.physics, deltaTime);
      }
    }

    // Spawn new objects
    if (this.objectManager.shouldSpawn(this.frameCount, this.levelState.speedMultiplier)) {
      this.objects.push(this.objectManager.spawn());
    }

    // Update object positions
    const currentSpeed = this.config.initialSpeed * this.levelState.speedMultiplier;
    this.objects = this.objectManager.update(this.objects, currentSpeed, deltaTime);
  }

  checkCollisions(playerBoxes: Map<number, BoundingBox>): void {
    if (this.state !== 'playing') return;

    for (const player of this.players) {
      if (!player.physics.alive) continue;
      const box = playerBoxes.get(player.id);
      if (!box) continue;

      const results = this.collisionDetector.checkAllObjects(
        box,
        player.physics,
        this.objects,
        this.levelState.level
      );

      this.processCollisionResults(results);
    }

    // Check for level completion
    if (this.levelState.packagesCollected >= this.levelState.packagesRequired) {
      this.advanceLevel();
    }
  }

  private processCollisionResults(results: CollisionResult[]): void {
    for (const result of results) {
      // Mark object as consumed
      result.object.consumed = true;

      switch (result.type) {
        case 'catch':
          this.levelState.packagesCollected++;
          this.levelState.totalPackages++;
          this.pendingEvents.push({ type: 'catch' });
          break;

        case 'hit':
          // Use config value instead of level-based loss
          const lost = Math.min(
            this.config.packagesLostOnHit,
            this.levelState.packagesCollected
          );
          this.levelState.packagesCollected -= lost;
          this.pendingEvents.push({ type: 'hit', packagesLost: lost });
          break;

        case 'dodge':
          // No effect, just mark as consumed so it doesn't trigger again
          break;
      }
    }
  }

  applyJump(playerId: number): void {
    const player = this.players.find(p => p.id === playerId);
    if (player && player.physics.alive) {
      this.physicsEngine.applyJump(player.physics);
    }
  }

  getObjects(): GameObject[] { return this.objects; }
  getFrameCount(): number { return this.frameCount; }
  getSpeed(): number { return this.config.initialSpeed * this.levelState.speedMultiplier; }
  getConfig(): GameEngineConfig { return this.config; }

  private createDefaultPhysics(): PhysicsState {
    return { y: 0, jumpVelocity: 0, isDucking: false, alive: true };
  }

  private createDefaultCalibration(): CalibrationData {
    return {
      baselineShoulderY: 0, baselineHeight: 0, baselineTorsoLength: 0,
      ankleX: 0, ankleY: 0, bodyScale: 0, shoulderVelocity: 0,
      lastJumpTime: null, isCalibrated: false,
    };
  }

  private createDefaultLevelState(): LevelState {
    return {
      level: 1,
      packagesCollected: 0,
      packagesRequired: this.config.packagesPerLevel,
      speedMultiplier: 1.0,
      totalPackages: 0,
    };
  }
}
