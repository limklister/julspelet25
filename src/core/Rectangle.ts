import { Vector2D } from './Vector2D';

/**
 * Rectangle class for collision detection and bounding boxes
 * Represents an axis-aligned bounding box (AABB)
 */
export class Rectangle {
  /**
   * Create a rectangle from left, top, right, bottom coordinates
   */
  constructor(
    public left: number,
    public top: number,
    public right: number,
    public bottom: number
  ) {
    // Ensure left < right and top < bottom
    if (left > right) {
      [this.left, this.right] = [right, left];
    }
    if (top > bottom) {
      [this.top, this.bottom] = [bottom, top];
    }
  }

  /**
   * Create rectangle from position and size
   */
  static fromPositionAndSize(x: number, y: number, width: number, height: number): Rectangle {
    return new Rectangle(x, y, x + width, y + height);
  }

  /**
   * Create rectangle from center point and size
   */
  static fromCenter(center: Vector2D, width: number, height: number): Rectangle {
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    return new Rectangle(
      center.x - halfWidth,
      center.y - halfHeight,
      center.x + halfWidth,
      center.y + halfHeight
    );
  }

  /**
   * Create rectangle from two corner points
   */
  static fromPoints(p1: Vector2D, p2: Vector2D): Rectangle {
    return new Rectangle(
      Math.min(p1.x, p2.x),
      Math.min(p1.y, p2.y),
      Math.max(p1.x, p2.x),
      Math.max(p1.y, p2.y)
    );
  }

  /**
   * Get width of rectangle
   */
  get width(): number {
    return this.right - this.left;
  }

  /**
   * Get height of rectangle
   */
  get height(): number {
    return this.bottom - this.top;
  }

  /**
   * Get center point of rectangle
   */
  get center(): Vector2D {
    return new Vector2D(
      (this.left + this.right) / 2,
      (this.top + this.bottom) / 2
    );
  }

  /**
   * Get area of rectangle
   */
  get area(): number {
    return this.width * this.height;
  }

  /**
   * Get perimeter of rectangle
   */
  get perimeter(): number {
    return 2 * (this.width + this.height);
  }

  /**
   * Check if this rectangle intersects with another rectangle
   * Uses Axis-Aligned Bounding Box (AABB) collision detection
   */
  intersects(other: Rectangle): boolean {
    return (
      this.left < other.right &&
      this.right > other.left &&
      this.top < other.bottom &&
      this.bottom > other.top
    );
  }

  /**
   * Check if this rectangle fully contains another rectangle
   */
  contains(other: Rectangle): boolean {
    return (
      this.left <= other.left &&
      this.right >= other.right &&
      this.top <= other.top &&
      this.bottom >= other.bottom
    );
  }

  /**
   * Check if a point is inside this rectangle
   */
  containsPoint(point: Vector2D): boolean {
    return (
      point.x >= this.left &&
      point.x <= this.right &&
      point.y >= this.top &&
      point.y <= this.bottom
    );
  }

  /**
   * Expand rectangle by a given amount (padding)
   */
  expand(amount: number): Rectangle {
    return new Rectangle(
      this.left - amount,
      this.top - amount,
      this.right + amount,
      this.bottom + amount
    );
  }

  /**
   * Shrink rectangle by a given amount
   */
  shrink(amount: number): Rectangle {
    return this.expand(-amount);
  }

  /**
   * Get the intersection rectangle (overlapping area)
   * Returns null if rectangles don't intersect
   */
  getIntersection(other: Rectangle): Rectangle | null {
    if (!this.intersects(other)) {
      return null;
    }

    return new Rectangle(
      Math.max(this.left, other.left),
      Math.max(this.top, other.top),
      Math.min(this.right, other.right),
      Math.min(this.bottom, other.bottom)
    );
  }

  /**
   * Get the union rectangle (smallest rectangle containing both)
   */
  getUnion(other: Rectangle): Rectangle {
    return new Rectangle(
      Math.min(this.left, other.left),
      Math.min(this.top, other.top),
      Math.max(this.right, other.right),
      Math.max(this.bottom, other.bottom)
    );
  }

  /**
   * Translate rectangle by a vector
   */
  translate(offset: Vector2D): Rectangle {
    return new Rectangle(
      this.left + offset.x,
      this.top + offset.y,
      this.right + offset.x,
      this.bottom + offset.y
    );
  }

  /**
   * Scale rectangle from its center
   */
  scale(factor: number): Rectangle {
    const center = this.center;
    const halfWidth = (this.width * factor) / 2;
    const halfHeight = (this.height * factor) / 2;

    return new Rectangle(
      center.x - halfWidth,
      center.y - halfHeight,
      center.x + halfWidth,
      center.y + halfHeight
    );
  }

  /**
   * Clamp this rectangle within bounds
   */
  clampWithin(bounds: Rectangle): Rectangle {
    return new Rectangle(
      Math.max(bounds.left, Math.min(bounds.right, this.left)),
      Math.max(bounds.top, Math.min(bounds.bottom, this.top)),
      Math.max(bounds.left, Math.min(bounds.right, this.right)),
      Math.max(bounds.top, Math.min(bounds.bottom, this.bottom))
    );
  }

  /**
   * Create a copy of this rectangle
   */
  clone(): Rectangle {
    return new Rectangle(this.left, this.top, this.right, this.bottom);
  }

  /**
   * Check if two rectangles are equal
   */
  equals(other: Rectangle, epsilon = 0.0001): boolean {
    return (
      Math.abs(this.left - other.left) < epsilon &&
      Math.abs(this.top - other.top) < epsilon &&
      Math.abs(this.right - other.right) < epsilon &&
      Math.abs(this.bottom - other.bottom) < epsilon
    );
  }

  /**
   * Convert to string for debugging
   */
  toString(): string {
    return `Rectangle(L:${this.left.toFixed(1)}, T:${this.top.toFixed(1)}, R:${this.right.toFixed(1)}, B:${this.bottom.toFixed(1)})`;
  }

  /**
   * Convert to plain object
   */
  toObject(): { left: number; top: number; right: number; bottom: number; width: number; height: number } {
    return {
      left: this.left,
      top: this.top,
      right: this.right,
      bottom: this.bottom,
      width: this.width,
      height: this.height,
    };
  }
}
