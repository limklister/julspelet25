import { describe, it, expect } from 'vitest';
import { Vector2D } from '@/core/Vector2D';

describe('Vector2D', () => {
  describe('Construction', () => {
    it('should create vector with x and y', () => {
      const v = new Vector2D(3, 4);
      expect(v.x).toBe(3);
      expect(v.y).toBe(4);
    });

    it('should create from another vector', () => {
      const v1 = { x: 5, y: 10 };
      const v2 = Vector2D.from(v1);
      expect(v2.x).toBe(5);
      expect(v2.y).toBe(10);
    });

    it('should create zero vector', () => {
      const v = Vector2D.zero();
      expect(v.x).toBe(0);
      expect(v.y).toBe(0);
    });

    it('should create one vector', () => {
      const v = Vector2D.one();
      expect(v.x).toBe(1);
      expect(v.y).toBe(1);
    });
  });

  describe('Math Operations', () => {
    it('should add vectors', () => {
      const v1 = new Vector2D(1, 2);
      const v2 = new Vector2D(3, 4);
      const result = v1.add(v2);
      expect(result.x).toBe(4);
      expect(result.y).toBe(6);
    });

    it('should subtract vectors', () => {
      const v1 = new Vector2D(5, 8);
      const v2 = new Vector2D(2, 3);
      const result = v1.subtract(v2);
      expect(result.x).toBe(3);
      expect(result.y).toBe(5);
    });

    it('should multiply by scalar', () => {
      const v = new Vector2D(2, 3);
      const result = v.multiply(3);
      expect(result.x).toBe(6);
      expect(result.y).toBe(9);
    });

    it('should divide by scalar', () => {
      const v = new Vector2D(6, 9);
      const result = v.divide(3);
      expect(result.x).toBe(2);
      expect(result.y).toBe(3);
    });

    it('should throw on division by zero', () => {
      const v = new Vector2D(1, 2);
      expect(() => v.divide(0)).toThrow('Division by zero');
    });
  });

  describe('Magnitude', () => {
    it('should calculate magnitude', () => {
      const v = new Vector2D(3, 4);
      expect(v.magnitude()).toBe(5); // 3-4-5 triangle
    });

    it('should calculate magnitude squared', () => {
      const v = new Vector2D(3, 4);
      expect(v.magnitudeSquared()).toBe(25);
    });

    it('should handle zero magnitude', () => {
      const v = Vector2D.zero();
      expect(v.magnitude()).toBe(0);
    });

    it('should normalize vector', () => {
      const v = new Vector2D(3, 4);
      const normalized = v.normalize();
      expect(normalized.magnitude()).toBeCloseTo(1, 5);
      expect(normalized.x).toBeCloseTo(0.6, 5);
      expect(normalized.y).toBeCloseTo(0.8, 5);
    });

    it('should return zero vector when normalizing zero vector', () => {
      const v = Vector2D.zero();
      const normalized = v.normalize();
      expect(normalized.equals(Vector2D.zero())).toBe(true);
    });
  });

  describe('Distance', () => {
    it('should calculate distance between vectors', () => {
      const v1 = new Vector2D(0, 0);
      const v2 = new Vector2D(3, 4);
      expect(v1.distanceTo(v2)).toBe(5);
    });

    it('should calculate squared distance', () => {
      const v1 = new Vector2D(0, 0);
      const v2 = new Vector2D(3, 4);
      expect(v1.distanceToSquared(v2)).toBe(25);
    });

    it('should have zero distance to itself', () => {
      const v = new Vector2D(5, 10);
      expect(v.distanceTo(v)).toBe(0);
    });
  });

  describe('Dot and Cross Product', () => {
    it('should calculate dot product', () => {
      const v1 = new Vector2D(2, 3);
      const v2 = new Vector2D(4, 5);
      expect(v1.dot(v2)).toBe(23); // 2*4 + 3*5 = 8 + 15 = 23
    });

    it('should calculate cross product', () => {
      const v1 = new Vector2D(2, 3);
      const v2 = new Vector2D(4, 5);
      expect(v1.cross(v2)).toBe(-2); // 2*5 - 3*4 = 10 - 12 = -2
    });

    it('should have zero dot product for perpendicular vectors', () => {
      const v1 = new Vector2D(1, 0);
      const v2 = new Vector2D(0, 1);
      expect(v1.dot(v2)).toBe(0);
    });
  });

  describe('Lerp', () => {
    it('should interpolate at t=0', () => {
      const v1 = new Vector2D(0, 0);
      const v2 = new Vector2D(10, 10);
      const result = v1.lerp(v2, 0);
      expect(result.equals(v1)).toBe(true);
    });

    it('should interpolate at t=1', () => {
      const v1 = new Vector2D(0, 0);
      const v2 = new Vector2D(10, 10);
      const result = v1.lerp(v2, 1);
      expect(result.equals(v2)).toBe(true);
    });

    it('should interpolate at t=0.5', () => {
      const v1 = new Vector2D(0, 0);
      const v2 = new Vector2D(10, 20);
      const result = v1.lerp(v2, 0.5);
      expect(result.x).toBe(5);
      expect(result.y).toBe(10);
    });
  });

  describe('Clamp', () => {
    it('should clamp vector within bounds', () => {
      const v = new Vector2D(15, -5);
      const min = new Vector2D(0, 0);
      const max = new Vector2D(10, 10);
      const result = v.clamp(min, max);
      expect(result.x).toBe(10);
      expect(result.y).toBe(0);
    });

    it('should not modify vector already within bounds', () => {
      const v = new Vector2D(5, 5);
      const min = new Vector2D(0, 0);
      const max = new Vector2D(10, 10);
      const result = v.clamp(min, max);
      expect(result.equals(v)).toBe(true);
    });
  });

  describe('Equality', () => {
    it('should be equal to itself', () => {
      const v = new Vector2D(1.5, 2.5);
      expect(v.equals(v)).toBe(true);
    });

    it('should be equal to vector with same values', () => {
      const v1 = new Vector2D(1.5, 2.5);
      const v2 = new Vector2D(1.5, 2.5);
      expect(v1.equals(v2)).toBe(true);
    });

    it('should not be equal to different vector', () => {
      const v1 = new Vector2D(1, 2);
      const v2 = new Vector2D(3, 4);
      expect(v1.equals(v2)).toBe(false);
    });

    it('should handle epsilon comparison', () => {
      const v1 = new Vector2D(1.0001, 2.0001);
      const v2 = new Vector2D(1.0002, 2.0002);
      expect(v1.equals(v2, 0.001)).toBe(true);
      expect(v1.equals(v2, 0.00001)).toBe(false);
    });
  });

  describe('Utility Methods', () => {
    it('should clone vector', () => {
      const v1 = new Vector2D(3, 4);
      const v2 = v1.clone();
      expect(v2.equals(v1)).toBe(true);
      expect(v2).not.toBe(v1); // Different object
    });

    it('should convert to string', () => {
      const v = new Vector2D(3.456, 7.891);
      const str = v.toString();
      expect(str).toContain('3.46');
      expect(str).toContain('7.89');
    });

    it('should convert to object', () => {
      const v = new Vector2D(5, 10);
      const obj = v.toObject();
      expect(obj).toEqual({ x: 5, y: 10 });
    });
  });

  describe('Edge Cases', () => {
    it('should handle negative values', () => {
      const v = new Vector2D(-3, -4);
      expect(v.magnitude()).toBe(5);
    });

    it('should handle very small values', () => {
      const v = new Vector2D(0.0001, 0.0001);
      expect(v.magnitude()).toBeGreaterThan(0);
    });

    it('should handle very large values', () => {
      const v = new Vector2D(1000000, 1000000);
      expect(v.magnitude()).toBeGreaterThan(0);
    });

    it('should maintain immutability on operations', () => {
      const v1 = new Vector2D(1, 2);
      const v2 = new Vector2D(3, 4);
      v1.add(v2);
      expect(v1.x).toBe(1); // Original unchanged
      expect(v1.y).toBe(2);
    });
  });
});
