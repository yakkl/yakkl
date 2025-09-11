// background/hash-store-reactivity.test.ts

import { setMiscStore, getMiscStore, subscribeToHashChanges } from './secure-hash-store';

/**
 * Test reactivity - any function can react to changes
 */
export function testHashStoreReactivity() {
	console.log('Testing hash store reactivity...');

	// Test 1: Basic subscription
	const unsubscribe1 = subscribeToHashChanges((hash) => {
		console.log('Hash changed to:', hash);
	});

	// Test 2: Multiple subscribers (all will be called)
	const unsubscribe2 = subscribeToHashChanges((hash) => {
		console.log('Another listener got hash:', hash);
	});

	// Test 3: Async reaction
	const unsubscribe3 = subscribeToHashChanges(async (hash) => {
		// Do async work when hash changes
		await chrome.storage.local.set({ lastHash: hash });
		console.log('Saved hash to storage');
	});

	// Trigger changes
	setMiscStore('test-hash-1'); // All 3 callbacks fire
	setMiscStore('test-hash-2'); // All 3 callbacks fire again

	// Cleanup
	unsubscribe1();
	unsubscribe2();
	unsubscribe3();
}

