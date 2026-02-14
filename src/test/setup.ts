import '@testing-library/jest-dom'
import { vi } from 'vitest'

class ResizeObserverMock {
  observe(): void {}

  unobserve(): void {}

  disconnect(): void {}
}

if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = ResizeObserverMock as typeof ResizeObserver
}

if (globalThis.HTMLMediaElement) {
  Object.defineProperty(globalThis.HTMLMediaElement.prototype, 'play', {
    configurable: true,
    writable: true,
    value: vi.fn().mockResolvedValue(undefined),
  })

  Object.defineProperty(globalThis.HTMLMediaElement.prototype, 'pause', {
    configurable: true,
    writable: true,
    value: vi.fn(),
  })
}

if (globalThis.HTMLCanvasElement) {
  const canvasContextStub = {
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    fillRect: vi.fn(),
    getImageData: vi.fn(),
    putImageData: vi.fn(),
    setTransform: vi.fn(),
    createImageData: vi.fn(),
  }

  Object.defineProperty(globalThis.HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    writable: true,
    value: vi.fn(() => canvasContextStub),
  })
}
