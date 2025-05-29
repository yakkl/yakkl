import { log } from "$lib/plugins/Logger";

// messageAnalyzer.ts - A utility to help understand message patterns
export class MessageAnalyzer {
  private patterns: Map<string, number> = new Map();

  analyze(message: any): void {
    const pattern = this.getMessagePattern(message);
    const count = this.patterns.get(pattern) || 0;
    this.patterns.set(pattern, count + 1);

    // Log unusual patterns
    if (count === 0) {
      log.info('New message pattern detected:', false, {
        pattern,
        example: message
      });
    }
  }

  private getMessagePattern(message: any): string {
    const keys = Object.keys(message || {}).sort();
    const types = keys.map(key => `${key}:${typeof message[key]}`);
    return types.join(',');
  }

  reportPatterns(): void {
    log.info('Message patterns analysis:', false, {
      patterns: Array.from(this.patterns.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([pattern, count]) => ({ pattern, count }))
    });
  }
}

