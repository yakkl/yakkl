// Animation Control Examples for ProtectedValue Placeholder Animations

console.log('Placeholder Animation Control System\n');
console.log('='.repeat(80));

console.log('\n🎬 Animation Types:\n');

console.log('1. Wave Animation (Default):');
console.log('   <ProtectedValue value={secret} placeholderAnimation={{ enabled: true, type: "wave" }} />');
console.log('   - Smooth undulating motion like water');
console.log('   - Most subtle and performance-friendly\n');

console.log('2. Glitch Animation:');
console.log('   <ProtectedValue value={secret} placeholderAnimation={{ enabled: true, type: "glitch" }} />');
console.log('   - Random displacement with RGB splitting');
console.log('   - Intermittent effect for maximum confusion\n');

console.log('3. Pulse Animation:');
console.log('   <ProtectedValue value={secret} placeholderAnimation={{ enabled: true, type: "pulse" }} />');
console.log('   - Opacity and scale changes');
console.log('   - Includes subtle color shifting\n');

console.log('4. Scramble Animation:');
console.log('   <ProtectedValue value={secret} placeholderAnimation={{ enabled: true, type: "scramble" }} />');
console.log('   - Characters swap positions continuously');
console.log('   - Most disruptive to OCR\n');

console.log('\n🎛️ Global Animation Control (via Store):\n');

console.log('// Import the control store');
console.log('import { animationControlStore } from "$lib/common/stores/animationControlStore";\n');

console.log('// Disable ALL animations globally');
console.log('animationControlStore.disableAll();\n');

console.log('// Enable ALL animations globally');
console.log('animationControlStore.enableAll();\n');

console.log('// Disable specific component');
console.log('animationControlStore.disableComponent(componentId);\n');

console.log('// Set performance mode');
console.log('animationControlStore.setPerformanceMode("auto"); // auto | force-on | force-off\n');

console.log('// Set max simultaneous animations');
console.log('animationControlStore.setMaxAnimations(10);\n');

console.log('\n⚙️ Component Configuration:\n');

console.log('// Basic usage with default wave animation');
console.log('<ProtectedValue value={secret} />;\n');

console.log('// Custom animation configuration');
console.log(`<ProtectedValue 
  value={secret}
  placeholder="[CLASSIFIED]"
  placeholderAnimation={{
    enabled: true,
    type: "glitch",
    speed: 5,        // 1-10 (slow to fast)
    intensity: 0.5,  // 0-1 (subtle to intense)
    phaseShift: true // Offset animation per character
  }}
/>\n`);

console.log('// Disable animation for specific component');
console.log('<ProtectedValue value={secret} placeholderAnimation={{ enabled: false }} />;\n');

console.log('\n🛡️ Security Benefits:\n');

console.log('1. OCR Disruption:');
console.log('   - Continuous motion prevents stable text capture');
console.log('   - Different animation types confuse different OCR algorithms\n');

console.log('2. Screenshot Protection:');
console.log('   - Any single frame shows distorted/displaced text');
console.log('   - Wave: Characters at different Y positions');
console.log('   - Glitch: RGB split and random displacement');
console.log('   - Pulse: Varying opacity makes capture timing critical');
console.log('   - Scramble: Characters in wrong positions\n');

console.log('3. Video Analysis Resistance:');
console.log('   - Extracting stable text from video is computationally expensive');
console.log('   - Phase-shifted animations prevent simple frame averaging\n');

console.log('\n🔧 Performance Monitoring:\n');

console.log('// Get animation scheduler metrics');
console.log('import { animationScheduler } from "$lib/utils/animationScheduler";');
console.log('const metrics = animationScheduler.getPerformanceMetrics();');
console.log('console.log(metrics); // { fps, frameTime, droppedFrames }\n');

console.log('\n♿ Accessibility:\n');

console.log('// Animations automatically disabled if user prefers reduced motion');
console.log('// CSS: @media (prefers-reduced-motion: reduce)');
console.log('// Store respects this by default with respectMotionPreference: true\n');

console.log('\n📊 Performance Guidelines:\n');

console.log('- 1-10 components: All animation types work well');
console.log('- 10-20 components: Consider using "wave" or "pulse" only');
console.log('- 20+ components: Auto mode will start throttling');
console.log('- 50+ components: Consider disabling animations');
console.log('- Mobile devices: Reduce intensity and speed for battery life\n');

console.log('\n💡 Best Practices:\n');

console.log('1. Start with wave animation (most performant)');
console.log('2. Use intersection observer (automatic) for off-screen components');
console.log('3. Monitor FPS in development with debug mode');
console.log('4. Test on lower-end devices');
console.log('5. Provide user settings to disable animations');
console.log('6. Use different animation types for different security levels');