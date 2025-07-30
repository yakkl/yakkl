export interface Token {
  type: 'word' | 'space';
  value: string;
  redacted: string;
  id?: string;
}

/**
 * Tokenizes text while preserving word boundaries, emails, URLs, and currency formats
 * @param text - The text to tokenize
 * @returns Array of tokens
 */
export function tokenizeProtectedText(text: string): Token[] {
  const tokens: Token[] = [];
  
  // Regex that matches:
  // - Email addresses: word@domain.tld
  // - URLs: http(s)://...
  // - Currency amounts: $1,234.56
  // - IP addresses: 192.168.1.1
  // - Words with attached punctuation
  // - Whitespace
  const regex = /(\S+@\S+\.\S+|https?:\/\/\S+|www\.\S+|\$[\d,]+\.?\d*|\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}|\S+|\s+)/g;
  
  let match;
  while ((match = regex.exec(text)) !== null) {
    const value = match[0];
    const isWhitespace = /^\s+$/.test(value);
    
    tokens.push({
      type: isWhitespace ? 'space' : 'word',
      value: value,
      redacted: isWhitespace ? value : redactWord(value)
    });
  }
  
  return tokens;
}

/**
 * Redacts alphanumeric characters while preserving structure
 * @param word - The word to redact
 * @returns Redacted version with preserved punctuation and symbols
 */
function redactWord(word: string): string {
  return word.replace(/[A-Za-z0-9]/g, '*');
}

/**
 * For future enhancement: Human verification through mouse movement analysis
 * This is a placeholder for bot detection logic
 * 
 * @pseudocode
 * function verifyHumanInteraction(mouseEvents: MouseEvent[]): boolean {
 *   // Analyze mouse movement patterns:
 *   // 1. Calculate velocity between hover events
 *   // 2. Check for natural mouse jitter (humans don't move perfectly)
 *   // 3. Measure time between word reveals
 *   // 4. Detect linear/robotic patterns
 *   // 5. Look for acceleration/deceleration curves
 *   
 *   // Red flags for bot behavior:
 *   // - Perfect linear movement
 *   // - Consistent timing between reveals
 *   // - No natural overshooting or corrections
 *   // - Instantaneous direction changes
 *   
 *   // Implementation would track:
 *   // - timestamps: number[]
 *   // - positions: {x: number, y: number}[]
 *   // - velocities: number[]
 *   // - accelerations: number[]
 *   
 *   // Return true if behavior seems human-like
 * }
 */