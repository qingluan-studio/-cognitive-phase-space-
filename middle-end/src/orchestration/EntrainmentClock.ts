export type ClockState = {
  phase: number;
  frequency: number;
  amplitude: number;
  offset: number;
};

export type EntrainmentStatus = {
  isEntrained: boolean;
  phaseDifference: number;
  frequencyRatio: number;
  convergenceRate: number;
};

export class EntrainmentClock {
  private internalClock: ClockState = {
    phase: 0,
    frequency: 1,
    amplitude: 1,
    offset: 0,
  };

  private externalClock: ClockState = {
    phase: 0,
    frequency: 1,
    amplitude: 1,
    offset: 0,
  };

  private entrainmentRate = 0.01;
  private running = false;
  private lastTick = 0;

  setEntrainmentRate(rate: number): void {
    this.entrainmentRate = Math.min(1, Math.max(0, rate));
  }

  setExternalClock(clock: Partial<ClockState>): void {
    this.externalClock = { ...this.externalClock, ...clock };
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTick = Date.now();
    this.tick();
  }

  stop(): void {
    this.running = false;
  }

  private tick(): void {
    if (!this.running) return;

    const now = Date.now();
    const delta = (now - this.lastTick) / 1000;
    this.lastTick = now;

    this.internalClock.phase += this.internalClock.frequency * delta;
    this.internalClock.phase %= 2 * Math.PI;

    this.entrain();

    setTimeout(() => this.tick(), 16);
  }

  private entrain(): void {
    const phaseDiff = this.externalClock.phase - this.internalClock.phase;
    const freqDiff = this.externalClock.frequency - this.internalClock.frequency;

    this.internalClock.phase += phaseDiff * this.entrainmentRate;
    this.internalClock.frequency += freqDiff * this.entrainmentRate * 0.1;
  }

  getStatus(): EntrainmentStatus {
    const phaseDiff = Math.abs(this.externalClock.phase - this.internalClock.phase);
    const freqRatio = this.internalClock.frequency / this.externalClock.frequency;
    
    return {
      isEntrained: phaseDiff < 0.1 && Math.abs(freqRatio - 1) < 0.01,
      phaseDifference: phaseDiff,
      frequencyRatio: freqRatio,
      convergenceRate: this.entrainmentRate,
    };
  }

  getInternalClock(): ClockState {
    return { ...this.internalClock };
  }

  reset(): void {
    this.internalClock = {
      phase: 0,
      frequency: 1,
      amplitude: 1,
      offset: 0,
    };
    this.lastTick = Date.now();
  }

  sync(): void {
    this.internalClock = { ...this.externalClock };
  }
}