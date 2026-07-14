export type HysteresisThresholds = {
  upper: number;
  lower: number;
  deadband: number;
};

export type ControlState = 'below' | 'inside' | 'above';

export type TransitionEvent = {
  timestamp: number;
  from: ControlState;
  to: ControlState;
  value: number;
};

export class HysteresisController {
  private thresholds: HysteresisThresholds = {
    upper: 80,
    lower: 20,
    deadband: 5,
  };

  private currentState: ControlState = 'inside';
  private transitions: TransitionEvent[] = [];
  private lastTransitionTime = 0;
  private cooldownPeriod = 1000;

  setThresholds(thresholds: Partial<HysteresisThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }

  setCooldown(ms: number): void {
    this.cooldownPeriod = ms;
  }

  evaluate(value: number): ControlState {
    const now = Date.now();
    
    if (now - this.lastTransitionTime < this.cooldownPeriod) {
      return this.currentState;
    }

    const { upper, lower, deadband } = this.thresholds;
    const upperBoundary = upper + deadband;
    const lowerBoundary = lower - deadband;

    let newState = this.currentState;

    if (this.currentState !== 'above' && value >= upperBoundary) {
      newState = 'above';
    } else if (this.currentState !== 'below' && value <= lowerBoundary) {
      newState = 'below';
    } else if (value > lower && value < upper) {
      newState = 'inside';
    }

    if (newState !== this.currentState) {
      this.transitions.push({
        timestamp: now,
        from: this.currentState,
        to: newState,
        value,
      });
      this.currentState = newState;
      this.lastTransitionTime = now;
    }

    return this.currentState;
  }

  getState(): ControlState {
    return this.currentState;
  }

  getTransitionHistory(): TransitionEvent[] {
    return [...this.transitions];
  }

  clearHistory(): void {
    this.transitions = [];
  }

  isStable(): boolean {
    if (this.transitions.length < 2) return true;
    
    const recent = this.transitions.slice(-3);
    const avgInterval = recent.reduce((acc, t, i, arr) => 
      i > 0 ? acc + (t.timestamp - arr[i-1].timestamp) : acc, 0) / (recent.length - 1);
    
    return avgInterval > this.cooldownPeriod * 3;
  }

  calculateBandwidth(): number {
    return this.thresholds.upper - this.thresholds.lower;
  }
}