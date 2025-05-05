// File: src/lib/common/duplexShim.ts
import { browserSvelte } from '$lib/common/environment';

export async function getDuplex(): Promise<any> {
  if (browserSvelte) {
    const mod = await import('stream-browserify');
    return mod.Duplex;
  } else {
    const mod = await import('readable-stream');
    return mod.Duplex;
  }
}
