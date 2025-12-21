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

  getState(): GameStateType { return this.state; }
  forceState(state: GameStateType): void { this.state = state; }

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

  getCountdown(): number { return this.countdownValue; }

  endGame(): void {
    this.state = 'gameOver';
    if (this.countdownTimer) clearInterval(this.countdownTimer);
    const maxScore = Math.max(...this.players.map(p => p.score), 0);
    if (maxScore > this.highScore) this.highScore = maxScore;
  }

  checkGameOver(): void {
    if (this.players.length === 0) return;
    const alivePlayers = this.players.filter(p => p.physics.alive);
    if (alivePlayers.length === 0) this.endGame();
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

    for (const player of this.players) {
      if (player.physics.alive) {
        this.physicsEngine.update(player.physics, deltaTime);
        player.score++;
      }
    }

    if (this.obstacleManager.shouldSpawn(this.frameCount)) {
      this.obstacles.push(this.obstacleManager.spawn());
    }
    this.obstacles = this.obstacleManager.update(this.obstacles, this.speed, deltaTime);

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
      if (collision) player.physics.alive = false;
    }
  }

  applyJump(playerId: number): void {
    const player = this.players.find(p => p.id === playerId);
    if (player && player.physics.alive) {
      this.physicsEngine.applyJump(player.physics);
    }
  }

  getObstacles(): Obstacle[] { return this.obstacles; }
  getFrameCount(): number { return this.frameCount; }
  getSpeed(): number { return this.speed; }
  getScore(): number { return Math.max(...this.players.map(p => p.score), 0); }
  getHighScore(): number { return this.highScore; }
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
}
