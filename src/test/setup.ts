import "@testing-library/jest-dom";
import { beforeEach, vi } from "vitest";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

// Mock Canvas for signature tests
HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4) })),
  canvas: { toDataURL: vi.fn(() => "data:image/png;base64,test") },
})) as any;

// Reset localStorage before each test
beforeEach(() => {
  localStorage.clear();
});

// Mock window.print for PDF tests
Object.defineProperty(window, "print", {
  value: vi.fn(),
});

// Mock URL.createObjectURL (robust if the property already exists and is non-configurable)
try {
  Object.defineProperty(URL, "createObjectURL", {
    value: vi.fn(() => "blob:test-url"),
    configurable: true,
  });
} catch (e) {
  // If defining the property failed (already defined and non-configurable),
  // attempt to overwrite or spy on the existing function. Silently ignore
  // if none of the strategies work (test environment will handle accordingly).
  try {
    (URL as any).createObjectURL = vi.fn(() => "blob:test-url");
  } catch (e2) {
    try {
      vi.spyOn(URL as any, "createObjectURL").mockImplementation(
        () => "blob:test-url"
      );
    } catch (e3) {
      // ignore
    }
  }
}

// Mock document.createElement for download tests
const originalCreateElement = document.createElement;
document.createElement = vi.fn((tagName: string) => {
  if (tagName === "a") {
    const element = originalCreateElement.call(
      document,
      tagName
    ) as HTMLAnchorElement;
    element.click = vi.fn();
    return element;
  }
  return originalCreateElement.call(document, tagName);
});
