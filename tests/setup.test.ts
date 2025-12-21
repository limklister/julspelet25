import { describe, it, expect } from 'vitest';

describe('Test Setup', () => {
  it('should run basic tests', () => {
    expect(true).toBe(true);
  });

  it('should have performance.now() available', () => {
    expect(typeof performance.now).toBe('function');
    expect(performance.now()).toBeGreaterThan(0);
  });

  it('should have canvas context mocked', () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    expect(ctx).toBeDefined();
    expect(typeof ctx?.fillRect).toBe('function');
  });
});
