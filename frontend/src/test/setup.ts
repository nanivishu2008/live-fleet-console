import "@testing-library/jest-dom";

// Mock requestAnimationFrame for tests if needed
if (typeof window !== "undefined") {
  window.requestAnimationFrame = (callback: FrameRequestCallback): number => {
    return setTimeout(() => callback(Date.now()), 0) as unknown as number;
  };
  window.cancelAnimationFrame = (id: number): void => {
    clearTimeout(id);
  };
}
