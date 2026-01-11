/**
 * Core type definitions for the game
 * All interfaces and types used across the application
 */

// ============================================================================
// MediaPipe Pose Types
// ============================================================================

/**
 * 3D landmark position from MediaPipe
 * Coordinates are normalized (0-1) relative to image dimensions
 */
export interface Landmark {
  x: number; // Horizontal position (0 = left, 1 = right)
  y: number; // Vertical position (0 = top, 1 = bottom)
  z: number; // Depth (relative to hips, negative = closer to camera)
}

/**
 * Landmark with optional visibility score
 */
export interface NormalizedLandmark extends Landmark {
  visibility?: number; // 0-1, confidence that landmark is visible
}

/**
 * Array of all 33 pose landmarks from MediaPipe
 * See: https://developers.google.com/mediapipe/solutions/vision/pose_landmarker
 */
export type PoseLandmarks = NormalizedLandmark[];

// ============================================================================
// Player State
// ============================================================================

/**
 * Calibration data collected during the calibration phase
 * Used as baseline for gesture detection
 */
export interface CalibrationData {
  // Shoulder position baseline
  baselineShoulderY: number;

  // Full body height (nose to ankles)
  baselineHeight: number;

  // Torso length (shoulders to hips)
  baselineTorsoLength: number;

  // Reference ankle X position for horizontal alignment
  ankleX: number;

  // Reference ankle Y position for vertical alignment
  ankleY: number;

  // Body scale factor for rendering (pixels per normalized unit)
  bodyScale: number;

  // Current shoulder velocity (for jump detection)
  shoulderVelocity: number;

  // Last jump timestamp (for cooldown)
  lastJumpTime: number | null;

  // Calibration completed successfully
  isCalibrated: boolean;
}

/**
 * Physics state for a player
 */
export interface PhysicsState {
  // Vertical position (0 = on ground, positive = in air)
  y: number;

  // Vertical velocity (positive = moving up)
  jumpVelocity: number;

  // Is player currently ducking
  isDucking: boolean;

  // Is player alive (not hit by obstacle)
  alive: boolean;
}

/**
 * Complete player state
 */
export interface Player {
  // Unique player ID (0 or 1 for 2-player mode)
  id: number;

  // Player color for rendering
  color: string;

  // Current pose landmarks (null if not detected)
  landmarks: PoseLandmarks | null;

  // Smoothed landmarks for rendering
  smoothedLandmarks: PoseLandmarks | null;

  // Calibration data
  calibration: CalibrationData;

  // Physics state
  physics: PhysicsState;

  // Current score
  score: number;

  // Base X position on screen (for multiplayer separation)
  baseX: number;
}

// ============================================================================
// Game State
// ============================================================================

/**
 * Game state enum
 */
export type GameStateType = 'menu' | 'calibrating' | 'countdown' | 'playing' | 'levelComplete' | 'win' | 'gameOver';

/**
 * Game object type
 */
export type GameObjectType = 'package' | 'flyingSnowball' | 'rollingSnowball';

/**
 * Game object (package or snowball)
 */
export interface GameObject {
  // Unique ID for tracking
  id: number;

  // Horizontal position
  x: number;

  // Vertical position
  y: number;

  // Object type
  type: GameObjectType;

  // Object dimensions
  width: number;
  height: number;

  // Whether this object has been collected/hit (for removal)
  consumed: boolean;

  // Visual variant (for packages: 0=red, 1=green)
  variant: number;
}

/**
 * Level state
 */
export interface LevelState {
  // Current level (1-5)
  level: number;

  // Packages collected this level
  packagesCollected: number;

  // Packages required to complete level
  packagesRequired: number;

  // Speed multiplier for this level
  speedMultiplier: number;

  // Total packages collected (across all levels, for display)
  totalPackages: number;
}

/**
 * Collision result types
 */
export type CollisionResultType = 'catch' | 'hit' | 'miss' | 'dodge';

export interface CollisionResult {
  type: CollisionResultType;
  object: GameObject;
  packagesLost?: number;
}

// Keep old Obstacle type for backwards compatibility during transition
export type ObstacleType = 'low' | 'high';

export interface Obstacle {
  x: number;
  type: ObstacleType;
  width: number;
  height: number;
}

/**
 * Game configuration
 */
export interface GameConfig {
  // Canvas dimensions
  canvasWidth: number;
  canvasHeight: number;

  // Ground level Y position
  groundLevel: number;

  // Initial obstacle speed (pixels per frame at 60fps)
  initialSpeed: number;

  // Speed increase per difficulty level
  speedIncrement: number;

  // Frames between obstacle spawns
  obstacleSpawnInterval: number;

  // Probability of high obstacle (vs low)
  highObstacleProbability: number;
}

/**
 * Complete game state
 */
export interface GameState {
  // Current state
  state: GameStateType;

  // All players
  players: Player[];

  // All obstacles
  obstacles: Obstacle[];

  // Current game speed
  speed: number;

  // Frame counter
  frameCount: number;

  // High score
  highScore: number;

  // Current score (max of all players)
  score: number;
}

// ============================================================================
// Gesture Detection Configuration
// ============================================================================

/**
 * Configuration for gesture detection thresholds
 * All values are documented with rationale
 */
export interface GestureConfig {
  // Jump detection

  // Jump triggers when shoulders rise this % above baseline
  // Rationale: Average person's shoulder rises 5-10% during jump prep
  jumpPositionThresholdPercent: number; // Default: 0.07 (7%)

  // Velocity threshold in normalized coords/frame
  // Rationale: Based on 30fps capture, real jump = ~0.006-0.01/frame
  jumpVelocityThreshold: number; // Default: 0.006

  // Jump velocity applied to physics (pixels/frame at 60fps)
  // Results in ~100px jump height
  jumpInitialVelocity: number; // Default: 18

  // Cooldown prevents double-trigger (milliseconds)
  jumpCooldownMs: number; // Default: 400

  // Reset threshold (more generous than trigger)
  jumpResetThresholdPercent: number; // Default: 0.10 (10%)

  // Duck detection

  // Duck triggers when height < this ratio of baseline
  duckTriggerRatio: number; // Default: 0.85 (85%)

  // Duck releases when height > this ratio (hysteresis)
  duckReleaseRatio: number; // Default: 0.90 (90%)

  // Debounce: must maintain state for this duration
  duckDebounceMs: number; // Default: 100
}

/**
 * Default gesture configuration
 * Tuned for real-world use with webcam at typical distances
 */
export const DEFAULT_GESTURE_CONFIG: GestureConfig = {
  // Jump - made more sensitive for easier triggering
  jumpPositionThresholdPercent: 0.04, // Was 0.07, now 4% - easier to trigger
  jumpVelocityThreshold: 0.003,       // Was 0.006, now half - more responsive
  jumpInitialVelocity: 18,
  jumpCooldownMs: 300,                // Was 400, now 300ms - faster recovery
  jumpResetThresholdPercent: 0.08,    // Was 0.10, now 8% - easier reset

  // Duck - made more sensitive for easier triggering
  duckTriggerRatio: 0.92,             // Was 0.85, now 92% - barely need to duck
  duckReleaseRatio: 0.95,             // Was 0.90, now 95% - keeps hysteresis gap
  duckDebounceMs: 50,                 // Was 100, now 50ms - more responsive
};

// ============================================================================
// Rendering Types
// ============================================================================

/**
 * Sprite paths for future sprite-based rendering
 */
export interface SpritePaths {
  head: string;
  torso: string;
  upperArm: string;
  lowerArm: string;
  upperLeg: string;
  lowerLeg: string;
}

/**
 * Transformed landmark (from normalized to screen coordinates)
 */
export interface TransformedLandmark {
  x: number; // Screen X coordinate
  y: number; // Screen Y coordinate
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Player colors (for multiplayer)
 */
export const PLAYER_COLORS = ['#87CEEB', '#FFD700'] as const; // Ice blue, Christmas gold

/**
 * Player X offsets (for multiplayer separation)
 */
export const PLAYER_OFFSETS = [-30, 30] as const;
