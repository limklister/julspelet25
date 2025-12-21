/**
 * 2D Vector class for position, velocity, and math operations
 */
export class Vector2D {
  constructor(
    public x: number,
    public y: number
  ) {}

  /**
   * Create a new Vector2D from another vector
   */
  static from(v: { x: number; y: number }): Vector2D {
    return new Vector2D(v.x, v.y);
  }

  /**
   * Create a zero vector (0, 0)
   */
  static zero(): Vector2D {
    return new Vector2D(0, 0);
  }

  /**
   * Create a unit vector (1, 1)
   */
  static one(): Vector2D {
    return new Vector2D(1, 1);
  }

  /**
   * Add another vector to this one (returns new vector)
   */
  add(other: Vector2D): Vector2D {
    return new Vector2D(this.x + other.x, this.y + other.y);
  }

  /**
   * Subtract another vector from this one (returns new vector)
   */
  subtract(other: Vector2D): Vector2D {
    return new Vector2D(this.x - other.x, this.y - other.y);
  }

  /**
   * Multiply by a scalar (returns new vector)
   */
  multiply(scalar: number): Vector2D {
    return new Vector2D(this.x * scalar, this.y * scalar);
  }

  /**
   * Divide by a scalar (returns new vector)
   */
  divide(scalar: number): Vector2D {
    if (scalar === 0) {
      throw new Error('Division by zero');
    }
    return new Vector2D(this.x / scalar, this.y / scalar);
  }

  /**
   * Calculate magnitude (length) of the vector
   */
  magnitude(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  /**
   * Calculate squared magnitude (faster, avoids sqrt)
   */
  magnitudeSquared(): number {
    return this.x * this.x + this.y * this.y;
  }

  /**
   * Normalize the vector (return unit vector)
   * Returns zero vector if magnitude is zero
   */
  normalize(): Vector2D {
    const mag = this.magnitude();
    if (mag === 0) {
      return Vector2D.zero();
    }
    return this.divide(mag);
  }

  /**
   * Calculate distance to another vector
   */
  distanceTo(other: Vector2D): number {
    const dx = other.x - this.x;
    const dy = other.y - this.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Calculate squared distance (faster, avoids sqrt)
   */
  distanceToSquared(other: Vector2D): number {
    const dx = other.x - this.x;
    const dy = other.y - this.y;
    return dx * dx + dy * dy;
  }

  /**
   * Calculate dot product with another vector
   */
  dot(other: Vector2D): number {
    return this.x * other.x + this.y * other.y;
  }

  /**
   * Calculate cross product (returns scalar for 2D)
   */
  cross(other: Vector2D): number {
    return this.x * other.y - this.y * other.x;
  }

  /**
   * Linear interpolation to another vector
   * @param other Target vector
   * @param t Interpolation factor (0-1)
   */
  lerp(other: Vector2D, t: number): Vector2D {
    return new Vector2D(
      this.x + (other.x - this.x) * t,
      this.y + (other.y - this.y) * t
    );
  }

  /**
   * Clamp vector components between min and max
   */
  clamp(min: Vector2D, max: Vector2D): Vector2D {
    return new Vector2D(
      Math.max(min.x, Math.min(max.x, this.x)),
      Math.max(min.y, Math.min(max.y, this.y))
    );
  }

  /**
   * Create a copy of this vector
   */
  clone(): Vector2D {
    return new Vector2D(this.x, this.y);
  }

  /**
   * Check if two vectors are equal
   */
  equals(other: Vector2D, epsilon = 0.0001): boolean {
    return (
      Math.abs(this.x - other.x) < epsilon &&
      Math.abs(this.y - other.y) < epsilon
    );
  }

  /**
   * Convert to string for debugging
   */
  toString(): string {
    return `Vector2D(${this.x.toFixed(2)}, ${this.y.toFixed(2)})`;
  }

  /**
   * Convert to plain object
   */
  toObject(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }
}
