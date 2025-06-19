// SSR-safe utilities that don't import browser APIs
export function isServerSide(): boolean {
  return typeof window === 'undefined' ||
         typeof document === 'undefined';
}

export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}