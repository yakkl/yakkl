export type AnimationType = 'wave' | 'glitch' | 'pulse' | 'scramble';

export interface AnimationConfig {
  type: AnimationType;
  speed: number; // 1-10, where 1 is slowest
  intensity: number; // 0-1, subtle to intense
  phaseShift: boolean; // Offset animation per character
}

export interface AnimatedChar {
  char: string;
  index: number;
  style: string;
  transform?: string;
  opacity?: number;
}

/**
 * Handles the calculation of animated placeholder characters
 * to disrupt OCR and screenshot-based text extraction
 */
export class PlaceholderAnimator {
  private readonly baseStyles = {
    display: 'inline-block',
    willChange: 'transform, opacity',
    transition: 'none', // We'll handle animation in JS for security
  };
  
  /**
   * Calculate animated character positions/styles for a given time
   */
  calculate(
    text: string, 
    time: number, 
    config: AnimationConfig
  ): AnimatedChar[] {
    const chars = text.split('');
    
    switch (config.type) {
      case 'wave':
        return this.calculateWave(chars, time, config);
      case 'glitch':
        return this.calculateGlitch(chars, time, config);
      case 'pulse':
        return this.calculatePulse(chars, time, config);
      case 'scramble':
        return this.calculateScramble(chars, time, config);
      default:
        return this.calculateWave(chars, time, config);
    }
  }
  
  /**
   * Wave animation - characters undulate like water
   */
  private calculateWave(chars: string[], time: number, config: AnimationConfig): AnimatedChar[] {
    const speedFactor = config.speed * 0.0005;
    const amplitude = config.intensity * 4; // Max 4px movement
    
    return chars.map((char, index) => {
      const phase = config.phaseShift ? index * 0.5 : 0;
      const yOffset = Math.sin((time * speedFactor) + phase) * amplitude;
      const xOffset = Math.cos((time * speedFactor * 0.7) + phase) * (amplitude * 0.3);
      
      return {
        char,
        index,
        style: this.buildStyle({
          transform: `translate(${xOffset}px, ${yOffset}px)`,
        })
      };
    });
  }
  
  /**
   * Glitch animation - random displacement and distortion
   */
  private calculateGlitch(chars: string[], time: number, config: AnimationConfig): AnimatedChar[] {
    const speedFactor = config.speed * 0.1;
    const intensity = config.intensity;
    
    return chars.map((char, index) => {
      // Use time and index to create pseudo-random but deterministic movement
      const glitchSeed = Math.sin(time * 0.001 + index * 13.37) * 43758.5453;
      const glitchValue = glitchSeed - Math.floor(glitchSeed);
      
      // Glitch only occurs intermittently
      const isGlitching = glitchValue > 0.7;
      
      if (!isGlitching) {
        return { char, index, style: this.buildStyle({}) };
      }
      
      // Calculate glitch offsets
      const xOffset = (Math.random() - 0.5) * intensity * 5;
      const yOffset = (Math.random() - 0.5) * intensity * 3;
      const skew = (Math.random() - 0.5) * intensity * 10;
      const scale = 1 + (Math.random() - 0.5) * intensity * 0.2;
      
      // RGB split effect
      const rgbOffset = intensity * 2;
      const textShadow = `${rgbOffset}px 0 0 rgba(255,0,0,0.5), ${-rgbOffset}px 0 0 rgba(0,255,255,0.5)`;
      
      return {
        char,
        index,
        style: this.buildStyle({
          transform: `translate(${xOffset}px, ${yOffset}px) skewX(${skew}deg) scale(${scale})`,
          textShadow,
          filter: `brightness(${1 + glitchValue * intensity})`,
        })
      };
    });
  }
  
  /**
   * Pulse animation - opacity and scale changes
   */
  private calculatePulse(chars: string[], time: number, config: AnimationConfig): AnimatedChar[] {
    const speedFactor = config.speed * 0.001;
    const minOpacity = 1 - (config.intensity * 0.7); // Never fully transparent
    const maxScale = 1 + (config.intensity * 0.2);
    
    return chars.map((char, index) => {
      const phase = config.phaseShift ? index * 0.8 : 0;
      const pulse = (Math.sin((time * speedFactor) + phase) + 1) / 2; // 0 to 1
      
      const opacity = minOpacity + (1 - minOpacity) * pulse;
      const scale = 1 + (maxScale - 1) * pulse;
      
      // Add slight color shift for extra OCR disruption
      const hueRotate = pulse * config.intensity * 30;
      
      return {
        char,
        index,
        style: this.buildStyle({
          opacity,
          transform: `scale(${scale})`,
          filter: `hue-rotate(${hueRotate}deg)`,
        })
      };
    });
  }
  
  /**
   * Scramble animation - characters swap positions continuously
   */
  private calculateScramble(chars: string[], time: number, config: AnimationConfig): AnimatedChar[] {
    const speedFactor = config.speed * 0.0001;
    const scrambleAmount = Math.floor(config.intensity * chars.length * 0.3);
    
    // Create a copy to scramble
    const scrambled = [...chars];
    const animTime = time * speedFactor;
    
    // Use time-based seed for consistent scrambling
    const seed = Math.floor(animTime) % 100;
    
    // Perform deterministic scrambles based on time
    for (let i = 0; i < scrambleAmount; i++) {
      const idx1 = Math.abs(Math.floor(Math.sin(seed + i) * 10000)) % chars.length;
      const idx2 = Math.abs(Math.floor(Math.cos(seed + i) * 10000)) % chars.length;
      
      // Swap with smooth transition
      const progress = (animTime % 1); // 0 to 1 progress
      
      if (progress < 0.5) {
        // Moving phase
        const moveProgress = progress * 2;
        const distance = idx2 - idx1;
        const xOffset = distance * 10 * moveProgress; // Assuming ~10px per character
        
        if (i === 0) { // Only animate the first swap for performance
          scrambled[idx1] = chars[idx1];
          scrambled[idx2] = chars[idx2];
        }
      } else {
        // Swap complete
        [scrambled[idx1], scrambled[idx2]] = [scrambled[idx2], scrambled[idx1]];
      }
    }
    
    return scrambled.map((char, index) => ({
      char,
      index,
      style: this.buildStyle({
        transition: 'transform 0.3s ease-in-out',
      })
    }));
  }
  
  /**
   * Build CSS style string from properties
   */
  private buildStyle(props: Record<string, any>): string {
    const combined = { ...this.baseStyles, ...props };
    
    return Object.entries(combined)
      .filter(([_, value]) => value !== undefined && value !== null)
      .map(([key, value]) => {
        const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
        return `${cssKey}: ${value}`;
      })
      .join('; ');
  }
  
  /**
   * Get a random animation type (useful for extra confusion)
   */
  static getRandomType(): AnimationType {
    const types: AnimationType[] = ['wave', 'glitch', 'pulse', 'scramble'];
    return types[Math.floor(Math.random() * types.length)];
  }
  
  /**
   * Calculate optimal config based on text length
   */
  static getOptimalConfig(textLength: number): AnimationConfig {
    // Longer text should animate slower to prevent overwhelming movement
    const speed = Math.max(1, 5 - Math.floor(textLength / 10));
    const intensity = Math.min(0.5, 0.3 + (10 / textLength) * 0.2);
    
    return {
      type: 'wave', // Default to wave as it's most subtle
      speed,
      intensity,
      phaseShift: true
    };
  }
}