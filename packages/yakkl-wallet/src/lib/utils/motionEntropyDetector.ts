export type EnforcementStage = 'learning' | 'soft' | 'hard';
export type DetectionState = 'normal' | 'suspicious' | 'locked';

export interface MotionEvent {
  timestamp: number;
  wordId: string;
  position: { x: number; y: number };
  eventType: 'enter' | 'leave' | 'move';
}

export interface BehaviorMetrics {
  velocities: number[];
  dwellTimes: number[];
  pathSmoothness: number;
  revisitCount: number;
  sequentialScans: number;
  microMovements: number;
  totalWords: number;
  uniqueWords: number;
}

export interface DetectionResult {
  suspicionScore: number;
  state: DetectionState;
  cooldownMultiplier: number;
  isLocked: boolean;
  metrics?: BehaviorMetrics;
}

export class MotionEntropyDetector {
  private events: MotionEvent[] = [];
  private wordVisits: Map<string, number> = new Map();
  private lastPosition: { x: number; y: number } | null = null;
  private dwellStartTime: number | null = null;
  private currentWordId: string | null = null;
  
  // Configuration
  private stage: EnforcementStage;
  private debug: boolean;
  
  // Thresholds
  private readonly VELOCITY_VARIANCE_MIN = 0.15; // Minimum variance in movement speed
  private readonly DWELL_TIME_VARIANCE_MIN = 0.25; // Minimum variance in dwell times
  private readonly MICRO_MOVEMENT_MIN = 3; // Minimum micro-movements per word
  private readonly SUSPICIOUS_THRESHOLD = 0.6;
  private readonly LOCKDOWN_THRESHOLD = 0.8;
  private readonly MAX_EVENTS = 100; // Sliding window size
  
  constructor(stage: EnforcementStage = 'learning', debug: boolean = false) {
    this.stage = stage;
    this.debug = debug;
  }
  
  trackMouseEnter(wordId: string, position: { x: number; y: number }) {
    this.addEvent({
      timestamp: Date.now(),
      wordId,
      position,
      eventType: 'enter'
    });
    
    // Track dwell time start
    this.dwellStartTime = Date.now();
    this.currentWordId = wordId;
    
    // Track visits
    this.wordVisits.set(wordId, (this.wordVisits.get(wordId) || 0) + 1);
  }
  
  trackMouseLeave(wordId: string, position: { x: number; y: number }) {
    this.addEvent({
      timestamp: Date.now(),
      wordId,
      position,
      eventType: 'leave'
    });
    
    // Reset dwell tracking
    this.dwellStartTime = null;
    this.currentWordId = null;
  }
  
  trackMouseMove(position: { x: number; y: number }) {
    if (!this.currentWordId || !this.lastPosition) return;
    
    // Only track significant movements (micro-movements)
    const distance = this.calculateDistance(this.lastPosition, position);
    if (distance > 2 && distance < 20) {
      this.addEvent({
        timestamp: Date.now(),
        wordId: this.currentWordId,
        position,
        eventType: 'move'
      });
    }
    
    this.lastPosition = position;
  }
  
  private addEvent(event: MotionEvent) {
    this.events.push(event);
    
    // Maintain sliding window
    if (this.events.length > this.MAX_EVENTS) {
      this.events.shift();
    }
    
    this.lastPosition = event.position;
  }
  
  analyzePattern(): DetectionResult {
    const metrics = this.calculateMetrics();
    const suspicionScore = this.calculateSuspicionScore(metrics);
    
    if (this.debug) {
      console.log('[MAPCRS Detection]', {
        stage: this.stage,
        suspicionScore,
        metrics
      });
    }
    
    // Determine state and enforcement
    let state: DetectionState = 'normal';
    let cooldownMultiplier = 1;
    let isLocked = false;
    
    if (suspicionScore >= this.LOCKDOWN_THRESHOLD) {
      state = 'locked';
      if (this.stage === 'hard') {
        isLocked = true;
      } else if (this.stage === 'soft') {
        cooldownMultiplier = 5; // 1500ms cooldown
      }
    } else if (suspicionScore >= this.SUSPICIOUS_THRESHOLD) {
      state = 'suspicious';
      if (this.stage !== 'learning') {
        cooldownMultiplier = 2.5; // 750ms cooldown
      }
    }
    
    return {
      suspicionScore,
      state,
      cooldownMultiplier,
      isLocked,
      metrics: this.debug ? metrics : undefined
    };
  }
  
  private calculateMetrics(): BehaviorMetrics {
    const velocities: number[] = [];
    const dwellTimes: number[] = [];
    let microMovements = 0;
    let sequentialScans = 0;
    
    // Calculate velocities between word transitions
    for (let i = 1; i < this.events.length; i++) {
      const prev = this.events[i - 1];
      const curr = this.events[i];
      
      if (prev.eventType === 'leave' && curr.eventType === 'enter') {
        const distance = this.calculateDistance(prev.position, curr.position);
        const timeDiff = curr.timestamp - prev.timestamp;
        if (timeDiff > 0) {
          velocities.push(distance / timeDiff);
        }
      }
      
      // Count micro-movements
      if (curr.eventType === 'move') {
        microMovements++;
      }
    }
    
    // Calculate dwell times
    let currentDwellStart: number | null = null;
    for (const event of this.events) {
      if (event.eventType === 'enter') {
        currentDwellStart = event.timestamp;
      } else if (event.eventType === 'leave' && currentDwellStart) {
        dwellTimes.push(event.timestamp - currentDwellStart);
        currentDwellStart = null;
      }
    }
    
    // Check for sequential scanning
    const wordSequence = this.events
      .filter(e => e.eventType === 'enter')
      .map(e => e.wordId);
    
    for (let i = 1; i < wordSequence.length; i++) {
      if (this.isSequential(wordSequence[i - 1], wordSequence[i])) {
        sequentialScans++;
      }
    }
    
    // Calculate path smoothness (variance in velocities)
    const pathSmoothness = velocities.length > 1 
      ? this.calculateVariance(velocities) 
      : 1;
    
    return {
      velocities,
      dwellTimes,
      pathSmoothness,
      revisitCount: this.calculateRevisits(),
      sequentialScans,
      microMovements,
      totalWords: wordSequence.length,
      uniqueWords: this.wordVisits.size
    };
  }
  
  private calculateSuspicionScore(metrics: BehaviorMetrics): number {
    let score = 0;
    
    // 1. Velocity consistency (25%)
    if (metrics.velocities.length > 2) {
      const velocityVariance = this.calculateVariance(metrics.velocities);
      if (velocityVariance < this.VELOCITY_VARIANCE_MIN) {
        score += 0.25;
      } else {
        score += 0.25 * (1 - Math.min(velocityVariance / 0.5, 1));
      }
    }
    
    // 2. Dwell time uniformity (25%)
    if (metrics.dwellTimes.length > 2) {
      const dwellVariance = this.calculateVariance(metrics.dwellTimes);
      if (dwellVariance < this.DWELL_TIME_VARIANCE_MIN) {
        score += 0.25;
      } else {
        score += 0.25 * (1 - Math.min(dwellVariance / 1000, 1));
      }
    }
    
    // 3. Path perfection (20%)
    const microMovementRate = metrics.totalWords > 0 
      ? metrics.microMovements / metrics.totalWords 
      : 0;
    if (microMovementRate < this.MICRO_MOVEMENT_MIN) {
      score += 0.20 * (1 - microMovementRate / this.MICRO_MOVEMENT_MIN);
    }
    
    // 4. Sequential behavior (20%)
    if (metrics.totalWords > 3) {
      const sequentialRate = metrics.sequentialScans / (metrics.totalWords - 1);
      score += 0.20 * sequentialRate;
    }
    
    // 5. Interaction speed (10%)
    if (metrics.dwellTimes.length > 0) {
      const avgDwell = metrics.dwellTimes.reduce((a, b) => a + b, 0) / metrics.dwellTimes.length;
      if (avgDwell < 200) { // Very fast interaction
        score += 0.10;
      } else if (avgDwell < 400) {
        score += 0.05;
      }
    }
    
    return Math.min(score, 1);
  }
  
  private calculateDistance(p1: { x: number; y: number }, p2: { x: number; y: number }): number {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  }
  
  private calculateVariance(values: number[]): number {
    if (values.length < 2) return 0;
    
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  }
  
  private calculateRevisits(): number {
    let revisits = 0;
    this.wordVisits.forEach(count => {
      if (count > 1) revisits += count - 1;
    });
    return revisits;
  }
  
  private isSequential(wordId1: string, wordId2: string): boolean {
    // Simple check - you might want to make this more sophisticated
    // based on actual word positions in the DOM
    return true; // Placeholder - implement based on DOM structure
  }
  
  reset() {
    this.events = [];
    this.wordVisits.clear();
    this.lastPosition = null;
    this.dwellStartTime = null;
    this.currentWordId = null;
  }
  
  setStage(stage: EnforcementStage) {
    this.stage = stage;
  }
}