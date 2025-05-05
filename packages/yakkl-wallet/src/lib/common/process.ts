export function ensureProcessPolyfill() {
  if (typeof globalThis.process === 'undefined') {
    globalThis.process = {} as any;
  }

  if (typeof globalThis.process.nextTick !== 'function') {
    globalThis.process.nextTick = (cb: (...args: any[]) => void, ...args: any[]) => {
      Promise.resolve().then(() => cb(...args));
    };
  }
}
