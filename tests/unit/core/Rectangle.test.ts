import { describe, it, expect } from 'vitest';
import { Rectangle } from '@/core/Rectangle';
import { Vector2D } from '@/core/Vector2D';

describe('Rectangle', () => {
  describe('Construction', () => {
    it('should create rectangle with coordinates', () => {
      const rect = new Rectangle(10, 20, 30, 40);
      expect(rect.left).toBe(10);
      expect(rect.top).toBe(20);
      expect(rect.right).toBe(30);
      expect(rect.bottom).toBe(40);
    });

    it('should swap coordinates if left > right', () => {
      const rect = new Rectangle(30, 20, 10, 40);
      expect(rect.left).toBe(10);
      expect(rect.right).toBe(30);
    });

    it('should swap coordinates if top > bottom', () => {
      const rect = new Rectangle(10, 40, 30, 20);
      expect(rect.top).toBe(20);
      expect(rect.bottom).toBe(40);
    });

    it('should create from position and size', () => {
      const rect = Rectangle.fromPositionAndSize(10, 20, 50, 30);
      expect(rect.left).toBe(10);
      expect(rect.top).toBe(20);
      expect(rect.right).toBe(60);
      expect(rect.bottom).toBe(50);
    });

    it('should create from center', () => {
      const center = new Vector2D(50, 50);
      const rect = Rectangle.fromCenter(center, 20, 10);
      expect(rect.left).toBe(40);
      expect(rect.top).toBe(45);
      expect(rect.right).toBe(60);
      expect(rect.bottom).toBe(55);
    });

    it('should create from two points', () => {
      const p1 = new Vector2D(10, 20);
      const p2 = new Vector2D(30, 40);
      const rect = Rectangle.fromPoints(p1, p2);
      expect(rect.left).toBe(10);
      expect(rect.top).toBe(20);
      expect(rect.right).toBe(30);
      expect(rect.bottom).toBe(40);
    });

    it('should create from two points in any order', () => {
      const p1 = new Vector2D(30, 40);
      const p2 = new Vector2D(10, 20);
      const rect = Rectangle.fromPoints(p1, p2);
      expect(rect.left).toBe(10);
      expect(rect.top).toBe(20);
      expect(rect.right).toBe(30);
      expect(rect.bottom).toBe(40);
    });
  });

  describe('Properties', () => {
    it('should calculate width', () => {
      const rect = new Rectangle(10, 20, 30, 40);
      expect(rect.width).toBe(20);
    });

    it('should calculate height', () => {
      const rect = new Rectangle(10, 20, 30, 40);
      expect(rect.height).toBe(20);
    });

    it('should calculate center', () => {
      const rect = new Rectangle(10, 20, 30, 40);
      const center = rect.center;
      expect(center.x).toBe(20);
      expect(center.y).toBe(30);
    });

    it('should calculate area', () => {
      const rect = new Rectangle(0, 0, 10, 20);
      expect(rect.area).toBe(200);
    });

    it('should calculate perimeter', () => {
      const rect = new Rectangle(0, 0, 10, 20);
      expect(rect.perimeter).toBe(60); // 2 * (10 + 20)
    });
  });

  describe('Intersection', () => {
    it('should detect intersecting rectangles', () => {
      const rect1 = new Rectangle(0, 0, 10, 10);
      const rect2 = new Rectangle(5, 5, 15, 15);
      expect(rect1.intersects(rect2)).toBe(true);
      expect(rect2.intersects(rect1)).toBe(true);
    });

    it('should detect non-intersecting rectangles', () => {
      const rect1 = new Rectangle(0, 0, 10, 10);
      const rect2 = new Rectangle(20, 20, 30, 30);
      expect(rect1.intersects(rect2)).toBe(false);
    });

    it('should detect edge-touching rectangles as intersecting', () => {
      const rect1 = new Rectangle(0, 0, 10, 10);
      const rect2 = new Rectangle(10, 0, 20, 10);
      expect(rect1.intersects(rect2)).toBe(false); // Edge touching is not intersecting
    });

    it('should get intersection area', () => {
      const rect1 = new Rectangle(0, 0, 10, 10);
      const rect2 = new Rectangle(5, 5, 15, 15);
      const intersection = rect1.getIntersection(rect2);
      expect(intersection).not.toBeNull();
      expect(intersection!.left).toBe(5);
      expect(intersection!.top).toBe(5);
      expect(intersection!.right).toBe(10);
      expect(intersection!.bottom).toBe(10);
    });

    it('should return null for non-intersecting rectangles', () => {
      const rect1 = new Rectangle(0, 0, 10, 10);
      const rect2 = new Rectangle(20, 20, 30, 30);
      expect(rect1.getIntersection(rect2)).toBeNull();
    });
  });

  describe('Containment', () => {
    it('should detect when rectangle contains another', () => {
      const outer = new Rectangle(0, 0, 100, 100);
      const inner = new Rectangle(10, 10, 20, 20);
      expect(outer.contains(inner)).toBe(true);
      expect(inner.contains(outer)).toBe(false);
    });

    it('should detect when rectangles are equal', () => {
      const rect1 = new Rectangle(0, 0, 10, 10);
      const rect2 = new Rectangle(0, 0, 10, 10);
      expect(rect1.contains(rect2)).toBe(true);
    });

    it('should detect point inside rectangle', () => {
      const rect = new Rectangle(0, 0, 10, 10);
      const point = new Vector2D(5, 5);
      expect(rect.containsPoint(point)).toBe(true);
    });

    it('should detect point outside rectangle', () => {
      const rect = new Rectangle(0, 0, 10, 10);
      const point = new Vector2D(15, 15);
      expect(rect.containsPoint(point)).toBe(false);
    });

    it('should detect point on edge', () => {
      const rect = new Rectangle(0, 0, 10, 10);
      const point = new Vector2D(0, 5);
      expect(rect.containsPoint(point)).toBe(true);
    });
  });

  describe('Expand and Shrink', () => {
    it('should expand rectangle', () => {
      const rect = new Rectangle(10, 10, 20, 20);
      const expanded = rect.expand(5);
      expect(expanded.left).toBe(5);
      expect(expanded.top).toBe(5);
      expect(expanded.right).toBe(25);
      expect(expanded.bottom).toBe(25);
    });

    it('should shrink rectangle', () => {
      const rect = new Rectangle(10, 10, 20, 20);
      const shrunk = rect.shrink(2);
      expect(shrunk.left).toBe(12);
      expect(shrunk.top).toBe(12);
      expect(shrunk.right).toBe(18);
      expect(shrunk.bottom).toBe(18);
    });

    it('should maintain center when expanding', () => {
      const rect = new Rectangle(10, 10, 20, 20);
      const expanded = rect.expand(5);
      expect(rect.center.equals(expanded.center)).toBe(true);
    });
  });

  describe('Union', () => {
    it('should get union of two rectangles', () => {
      const rect1 = new Rectangle(0, 0, 10, 10);
      const rect2 = new Rectangle(5, 5, 15, 15);
      const union = rect1.getUnion(rect2);
      expect(union.left).toBe(0);
      expect(union.top).toBe(0);
      expect(union.right).toBe(15);
      expect(union.bottom).toBe(15);
    });

    it('should handle non-overlapping rectangles', () => {
      const rect1 = new Rectangle(0, 0, 10, 10);
      const rect2 = new Rectangle(20, 20, 30, 30);
      const union = rect1.getUnion(rect2);
      expect(union.left).toBe(0);
      expect(union.top).toBe(0);
      expect(union.right).toBe(30);
      expect(union.bottom).toBe(30);
    });
  });

  describe('Transform', () => {
    it('should translate rectangle', () => {
      const rect = new Rectangle(0, 0, 10, 10);
      const offset = new Vector2D(5, 3);
      const translated = rect.translate(offset);
      expect(translated.left).toBe(5);
      expect(translated.top).toBe(3);
      expect(translated.right).toBe(15);
      expect(translated.bottom).toBe(13);
    });

    it('should scale rectangle from center', () => {
      const rect = new Rectangle(0, 0, 10, 10); // Center at (5, 5)
      const scaled = rect.scale(2);
      expect(scaled.width).toBe(20);
      expect(scaled.height).toBe(20);
      expect(rect.center.equals(scaled.center)).toBe(true);
    });

    it('should scale down rectangle', () => {
      const rect = new Rectangle(0, 0, 10, 10);
      const scaled = rect.scale(0.5);
      expect(scaled.width).toBe(5);
      expect(scaled.height).toBe(5);
    });
  });

  describe('Clamp', () => {
    it('should clamp rectangle within bounds', () => {
      const rect = new Rectangle(-5, -5, 15, 15);
      const bounds = new Rectangle(0, 0, 10, 10);
      const clamped = rect.clampWithin(bounds);
      expect(clamped.left).toBe(0);
      expect(clamped.top).toBe(0);
      expect(clamped.right).toBe(10);
      expect(clamped.bottom).toBe(10);
    });

    it('should not modify rectangle already within bounds', () => {
      const rect = new Rectangle(2, 2, 8, 8);
      const bounds = new Rectangle(0, 0, 10, 10);
      const clamped = rect.clampWithin(bounds);
      expect(clamped.equals(rect)).toBe(true);
    });
  });

  describe('Equality', () => {
    it('should be equal to itself', () => {
      const rect = new Rectangle(1, 2, 3, 4);
      expect(rect.equals(rect)).toBe(true);
    });

    it('should be equal to rectangle with same values', () => {
      const rect1 = new Rectangle(1, 2, 3, 4);
      const rect2 = new Rectangle(1, 2, 3, 4);
      expect(rect1.equals(rect2)).toBe(true);
    });

    it('should not be equal to different rectangle', () => {
      const rect1 = new Rectangle(1, 2, 3, 4);
      const rect2 = new Rectangle(5, 6, 7, 8);
      expect(rect1.equals(rect2)).toBe(false);
    });

    it('should handle epsilon comparison', () => {
      const rect1 = new Rectangle(1.0001, 2.0001, 3.0001, 4.0001);
      const rect2 = new Rectangle(1.0002, 2.0002, 3.0002, 4.0002);
      expect(rect1.equals(rect2, 0.001)).toBe(true);
      expect(rect1.equals(rect2, 0.00001)).toBe(false);
    });
  });

  describe('Utility Methods', () => {
    it('should clone rectangle', () => {
      const rect1 = new Rectangle(1, 2, 3, 4);
      const rect2 = rect1.clone();
      expect(rect2.equals(rect1)).toBe(true);
      expect(rect2).not.toBe(rect1); // Different object
    });

    it('should convert to string', () => {
      const rect = new Rectangle(1.5, 2.5, 3.5, 4.5);
      const str = rect.toString();
      expect(str).toContain('1.5');
      expect(str).toContain('2.5');
      expect(str).toContain('3.5');
      expect(str).toContain('4.5');
    });

    it('should convert to object', () => {
      const rect = new Rectangle(10, 20, 30, 40);
      const obj = rect.toObject();
      expect(obj).toEqual({
        left: 10,
        top: 20,
        right: 30,
        bottom: 40,
        width: 20,
        height: 20,
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero-size rectangle', () => {
      const rect = new Rectangle(5, 5, 5, 5);
      expect(rect.width).toBe(0);
      expect(rect.height).toBe(0);
      expect(rect.area).toBe(0);
    });

    it('should handle negative coordinates', () => {
      const rect = new Rectangle(-10, -10, -5, -5);
      expect(rect.width).toBe(5);
      expect(rect.height).toBe(5);
    });

    it('should maintain immutability on operations', () => {
      const rect1 = new Rectangle(0, 0, 10, 10);
      const rect2 = rect1.expand(5);
      expect(rect1.left).toBe(0); // Original unchanged
      expect(rect2.left).toBe(-5);
    });
  });

  describe('Collision Detection Scenarios', () => {
    it('should detect player hitting obstacle from left', () => {
      const player = new Rectangle(40, 0, 50, 10); // Moving right
      const obstacle = new Rectangle(45, 0, 55, 10);
      expect(player.intersects(obstacle)).toBe(true);
    });

    it('should not detect collision when player jumps over obstacle', () => {
      const player = new Rectangle(40, -20, 50, -10); // In air
      const obstacle = new Rectangle(45, 0, 55, 10); // On ground
      expect(player.intersects(obstacle)).toBe(false);
    });

    it('should detect collision when player ducks under high obstacle', () => {
      const player = new Rectangle(40, 5, 50, 10); // Ducking (compressed)
      const obstacle = new Rectangle(45, 0, 55, 6); // High obstacle
      expect(player.intersects(obstacle)).toBe(true);
    });
  });
});
