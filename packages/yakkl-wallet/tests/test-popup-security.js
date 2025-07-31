/**
 * Test script to verify PopupSecurityManager functionality
 * Run this in the browser console while the extension is loaded
 */

// Test function to simulate different security scenarios
async function testPopupSecurity() {
  console.log('🔐 Testing PopupSecurityManager...');

  try {
    // Import the PopupSecurityManager
    const { popupSecurityManager } = await import('../src/lib/managers/PopupSecurityManager.ts');

    console.log('✅ PopupSecurityManager imported successfully');

    // Test 1: Get current security state
    console.log('\n📊 Test 1: Getting security state...');
    const securityState = await popupSecurityManager.getSecurityState();
    console.log('Security State:', securityState);

    // Test 2: Get session info
    console.log('\n📊 Test 2: Getting session info...');
    const sessionInfo = await popupSecurityManager.getSessionInfo();
    console.log('Session Info:', sessionInfo);

    // Test 3: Validate JWT token
    console.log('\n📊 Test 3: Validating JWT token...');
    const jwtValid = await popupSecurityManager.validateJWTToken();
    console.log('JWT Valid:', jwtValid);

    // Test 4: Check popup exists
    console.log('\n📊 Test 4: Checking if popup exists...');
    const popupExists = await popupSecurityManager.checkPopupExists();
    console.log('Popup Exists:', popupExists);

    // Test 5: External popup request (simulated)
    console.log('\n📊 Test 5: Testing external popup request...');
    await popupSecurityManager.handlePopupRequest('', '0', 'external');
    console.log('✅ External popup request handled');

    // Test 6: Internal popup request (simulated)
    console.log('\n📊 Test 6: Testing internal popup request...');
    await popupSecurityManager.handlePopupRequest('', '0', 'internal');
    console.log('✅ Internal popup request handled');

    console.log('\n🎉 All PopupSecurityManager tests completed successfully!');

  } catch (error) {
    console.error('❌ PopupSecurityManager test failed:', error);
  }
}

// Test function for the enhanced showPopup function
async function testEnhancedShowPopup() {
  console.log('\n🔧 Testing enhanced showPopup function...');

  try {
    // Import the enhanced showPopup function
    const { showPopup } = await import('../src/contexts/background/extensions/chrome/ui.ts');

    console.log('✅ Enhanced showPopup imported successfully');

    // Test external popup request
    console.log('\n📊 Testing external popup request...');
    await showPopup('', '0', 'external');
    console.log('✅ External showPopup completed');

    // Test internal popup request
    console.log('\n📊 Testing internal popup request...');
    await showPopup('', '0', 'internal');
    console.log('✅ Internal showPopup completed');

    console.log('\n🎉 Enhanced showPopup tests completed successfully!');

  } catch (error) {
    console.error('❌ Enhanced showPopup test failed:', error);
  }
}

// Security scenarios to test
const securityScenarios = [
  {
    name: 'Authenticated User with Valid JWT',
    description: 'User is logged in with valid session',
    expectedBehavior: 'Should focus existing popup or open home.html'
  },
  {
    name: 'Authenticated User with Expired JWT',
    description: 'User was logged in but JWT expired',
    expectedBehavior: 'Should lock wallet and route to login.html'
  },
  {
    name: 'Locked Wallet',
    description: 'Wallet is explicitly locked',
    expectedBehavior: 'Should route to login.html'
  },
  {
    name: 'Uninitialized Wallet',
    description: 'First time user',
    expectedBehavior: 'Should route to register.html'
  },
  {
    name: 'Terms Not Accepted',
    description: 'User initialized but not accepted terms',
    expectedBehavior: 'Should route to legal.html'
  }
];

// Display security scenarios
console.log('\n📋 Security Scenarios to Test:');
securityScenarios.forEach((scenario, index) => {
  console.log(`${index + 1}. ${scenario.name}`);
  console.log(`   Description: ${scenario.description}`);
  console.log(`   Expected: ${scenario.expectedBehavior}\n`);
});

// Run tests
console.log('🚀 Starting PopupSecurityManager tests...');
testPopupSecurity();

// Uncomment to test enhanced showPopup (only run in background context)
// testEnhancedShowPopup();

console.log(`
🔐 PopupSecurityManager Implementation Summary:

✅ Session-Based Security: Validates JWT tokens for external requests
✅ Request Source Detection: Distinguishes internal vs external popup requests
✅ Smart Routing: Routes to appropriate page based on security state
✅ Session Preservation: Keeps users on current page when session is valid
✅ Lock State Management: Respects explicit wallet locks
✅ Fallback Security: Falls back to basic popup creation if enhanced security fails

Key Benefits:
• Better UX: No unnecessary re-logins for active users
• Enhanced Security: JWT validation for external access
• Session Preservation: Users stay on their current page
• Intelligent Routing: Appropriate page based on security state
`);
