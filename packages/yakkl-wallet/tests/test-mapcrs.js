// Test examples for MAPCRS functionality
// Run this to see how different text formats are tokenized and redacted

import { tokenizeProtectedText } from '../src/lib/utils/tokenizer.js';

const testCases = [
  'hello@example.com',
  'USD $1,500.09 dollars are spent',
  'Visit https://example.com now!',
  'IP: 192.168.1.1',
  'my-secret-key_123',
  'Contact john.doe@company.org for details',
  'The price is $99.99 (USD)',
  'Check www.example.com or http://test.org',
  'Order #12345 confirmed!',
  'Temperature: 72.5°F',
  'API_KEY=sk-1234567890abcdef',
];

console.log('MAPCRS Tokenization Test Results\n');
console.log('='.repeat(80));

testCases.forEach(text => {
  console.log(`\nOriginal: "${text}"`);
  
  const tokens = tokenizeProtectedText(text);
  
  // Build redacted display
  const redacted = tokens.map(token => token.redacted).join('');
  console.log(`Redacted: "${redacted}"`);
  
  // Show tokens
  console.log('Tokens:');
  tokens.forEach((token, index) => {
    if (token.type === 'word') {
      console.log(`  [${index}] Word: "${token.value}" → "${token.redacted}"`);
    }
  });
  
  console.log('-'.repeat(40));
});

console.log('\nHover Behavior - Anti-Screenshot Protection:');
console.log('- Hover over any redacted word to reveal it');
console.log('- 300ms delay before reveal (prevents accidental reveals)');
console.log('- Only ONE word can be visible at a time');
console.log('- When moving to a new word:');
console.log('  • Previous word hides immediately');
console.log('  • 300ms cooldown enforced between reveals');
console.log('  • Cannot reveal new words during cooldown');
console.log('  • Cursor shows "not-allowed" during cooldown');
console.log('- Fast scanning/screenshots are ineffective');
console.log('- Values stored securely in memory, not in DOM');
console.log('\nSecurity Features:');
console.log('- Enforced cooldown prevents rapid word reveals');
console.log('- No auto-hide timer (words hide immediately on new hover)');
console.log('- Visual feedback shows when cooldown is active');
console.log('- Makes automated scanning extremely slow');