/**
 * Test file for JWT Background Manager
 * Demonstrates usage of the invalidateToken functionality
 */

import { 
	backgroundJWTManager, 
	createJWTForUser, 
	invalidateJWT, 
	getJWTForAPI,
	clearJWTBlacklist 
} from './jwt-background';

// Example: Create and invalidate a token
async function testTokenInvalidation() {
	console.log('=== Testing JWT Token Invalidation ===');
	
	// 1. Create a new token
	const token = await createJWTForUser(
		'user123',
		'testuser',
		'profile456',
		'yakkl_pro'
	);
	console.log('Created token:', token.substring(0, 50) + '...');
	
	// 2. Verify token is valid
	const isValid = await backgroundJWTManager.validateToken(token);
	console.log('Token valid before invalidation:', isValid);
	
	// 3. Invalidate the token
	await invalidateJWT(token);
	console.log('Token invalidated');
	
	// 4. Verify token is no longer valid
	const isValidAfter = await backgroundJWTManager.validateToken(token);
	console.log('Token valid after invalidation:', isValidAfter);
	
	// 5. Try to get current token (should be null if it was the active token)
	const currentToken = await getJWTForAPI();
	console.log('Current token after invalidation:', currentToken);
}

// Example: Lock wallet with token invalidation
async function testWalletLock() {
	console.log('\n=== Testing Wallet Lock with Token Invalidation ===');
	
	// Import the lock function
	const { setLocks } = await import('../common/locks');
	
	// 1. Create a token for the user session
	const token = await createJWTForUser(
		'user789',
		'walletuser',
		'profile789',
		'explorer_member'
	);
	console.log('Created session token');
	
	// 2. Lock the wallet (this will invalidate the current token)
	await setLocks(true);
	console.log('Wallet locked - token should be invalidated');
	
	// 3. Verify the token is no longer valid
	const isValid = await backgroundJWTManager.validateToken(token);
	console.log('Token valid after lock:', isValid);
}

// Example: Multiple tokens with selective invalidation
async function testMultipleTokens() {
	console.log('\n=== Testing Multiple Tokens ===');
	
	// 1. Create multiple tokens (e.g., for different sessions/devices)
	const token1 = await createJWTForUser('user1', 'alice', 'profile1', 'yakkl_pro');
	const token2 = await createJWTForUser('user2', 'bob', 'profile2', 'explorer_member');
	
	console.log('Created token1 for alice');
	console.log('Created token2 for bob');
	
	// 2. Invalidate only token1
	await invalidateJWT(token1);
	console.log('Invalidated token1');
	
	// 3. Check validity
	const isValid1 = await backgroundJWTManager.validateToken(token1);
	const isValid2 = await backgroundJWTManager.validateToken(token2);
	
	console.log('Token1 valid:', isValid1); // Should be false
	console.log('Token2 valid:', isValid2); // Should be true
}

// Example: Clear blacklist (for maintenance)
async function testBlacklistMaintenance() {
	console.log('\n=== Testing Blacklist Maintenance ===');
	
	// Clear all blacklisted tokens (use with caution)
	await clearJWTBlacklist();
	console.log('Blacklist cleared');
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
	(async () => {
		try {
			await testTokenInvalidation();
			await testWalletLock();
			await testMultipleTokens();
			// await testBlacklistMaintenance(); // Uncomment to test
		} catch (error) {
			console.error('Test failed:', error);
		}
	})();
}

export { testTokenInvalidation, testWalletLock, testMultipleTokens, testBlacklistMaintenance };