import '@testing-library/jest-dom'

// jsdom kennt ResizeObserver nicht; Radix-Bausteine (Switch, Select) brauchen ihn.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}
