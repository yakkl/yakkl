// Test examples for Motion Entropy Detection in MAPCRS

console.log('Motion Entropy Detection - Test Scenarios\n');
console.log('='.repeat(80));

console.log('\n📋 Configuration Options:\n');

console.log('1. Basic Mode (default - learning stage):');
console.log('   <ProtectedValue value={secret} />');
console.log('   - Motion tracking enabled but only logs data');
console.log('   - No enforcement, useful for tuning thresholds\n');

console.log('2. Advanced Mode with Soft Enforcement:');
console.log('   <ProtectedValue value={secret} mapcrs={{ enabled: true, enforcement: "soft" }} />');
console.log('   - Increases cooldown delays for suspicious behavior');
console.log('   - Yellow background indicates suspicious activity\n');

console.log('3. Advanced Mode with Hard Enforcement:');
console.log('   <ProtectedValue value={secret} mapcrs={{ enabled: true, enforcement: "hard" }} />');
console.log('   - Locks down reveals when bot behavior detected');
console.log('   - Red background and lock icon when locked\n');

console.log('4. Debug Mode:');
console.log('   <ProtectedValue value={secret} mapcrs={{ enabled: true, enforcement: "soft", debug: true }} />');
console.log('   - Logs detection metrics to console\n');

console.log('\n🤖 Bot Behavior Patterns Detected:\n');

console.log('1. Constant Velocity:');
console.log('   - Moving between words at exact same speed');
console.log('   - No natural acceleration/deceleration\n');

console.log('2. Uniform Dwell Times:');
console.log('   - Spending exact same time on each word');
console.log('   - No variation in reading speed\n');

console.log('3. Perfect Paths:');
console.log('   - No mouse jitter or micro-movements');
console.log('   - Perfectly straight lines between words\n');

console.log('4. Sequential Scanning:');
console.log('   - Reading every word in order');
console.log('   - No skipping or revisiting words\n');

console.log('5. Rapid Interaction:');
console.log('   - Very fast word reveals (<200ms dwell)');
console.log('   - Systematic scanning pattern\n');

console.log('\n🛡️ Detection States:\n');

console.log('Normal (Green/Default):');
console.log('- Suspicion Score: < 0.6');
console.log('- Standard 300ms cooldown');
console.log('- All features enabled\n');

console.log('Suspicious (Yellow):');
console.log('- Suspicion Score: 0.6 - 0.8');
console.log('- Cooldown multiplier: 2.5x (750ms)');
console.log('- Yellow background warning\n');

console.log('Locked (Red):');
console.log('- Suspicion Score: > 0.8');
console.log('- Soft mode: 5x cooldown (1500ms)');
console.log('- Hard mode: Reveals disabled');
console.log('- Red background + lock icon\n');

console.log('\n💡 Human Behavior Tips:\n');
console.log('- Move mouse naturally with varying speeds');
console.log('- Spend different amounts of time reading each word');
console.log('- Don\'t scan every word sequentially');
console.log('- Natural mouse movements include small corrections');
console.log('- Take breaks between reveals\n');

console.log('\n🔧 Tuning Recommendations:\n');
console.log('1. Start with enforcement: "learning"');
console.log('2. Monitor console logs for suspicion scores');
console.log('3. Adjust thresholds in MotionEntropyDetector if needed');
console.log('4. Test with real users before enabling "hard" mode');
console.log('5. Consider accessibility needs (keyboard users exempt)');