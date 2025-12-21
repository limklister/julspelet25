// Vitest setup file
// This file runs before all tests

// Mock MediaPipe - it requires WebGL and won't work in test environment
global.HTMLCanvasElement.prototype.getContext = function() {
  return {
    fillRect: () => {},
    clearRect: () => {},
    getImageData: () => ({ data: [] }),
    putImageData: () => {},
    createImageData: () => ([]),
    setTransform: () => {},
    drawImage: () => {},
    save: () => {},
    fillText: () => {},
    restore: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    closePath: () => {},
    stroke: () => {},
    translate: () => {},
    scale: () => {},
    rotate: () => {},
    arc: () => {},
    fill: () => {},
    measureText: () => ({ width: 0 }),
    transform: () => {},
    rect: () => {},
    clip: () => {},
  } as any;
};

// Mock performance.now() for consistent timing in tests
if (typeof performance === 'undefined') {
  global.performance = {
    now: () => Date.now(),
  } as any;
}

// Mock requestAnimationFrame for tests
if (typeof requestAnimationFrame === 'undefined') {
  global.requestAnimationFrame = (callback: FrameRequestCallback) => {
    return setTimeout(() => callback(Date.now()), 16) as unknown as number;
  };
}

if (typeof cancelAnimationFrame === 'undefined') {
  global.cancelAnimationFrame = (id: number) => {
    clearTimeout(id);
  };
}
