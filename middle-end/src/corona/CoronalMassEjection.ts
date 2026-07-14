export interface EjectionBurst {
  id: number;
  mass: number;
  velocity: number;
  energy: number;
  timestamp: number;
}

export type EjectionSummary = {
  bursts: number;
  totalMass: number;
  totalEnergy: number;
  peakVelocity: number;
};

export interface CoronalMassEjectionConfig {
  triggerThreshold: number;
  massQuanta: number;
  velocityScale: number;
  maxBursts: number;
}

export class CoronalMassEjection {
  private _config: CoronalMassEjectionConfig;
  private _bursts: EjectionBurst[] = [];
  private _nextId: number = 0;
  private _summary: EjectionSummary | null = null;
  private _accumulated: number = 0;
  private _state: Record<string, unknown> = {};
  private _markovState: number = 0;
  private _transitionMatrix: number[][] = [[0.7, 0.3], [0.4, 0.6]];
  private _powerLawIndex: number = 2.5;
  private _shockFrontRadius: number = 0;

  constructor(config: CoronalMassEjectionConfig) {
    this._config = config;
  }

  get burstCount(): number {
    return this._bursts.length;
  }

  get accumulated(): number {
    return this._accumulated;
  }

  get shockFrontRadius(): number {
    return this._shockFrontRadius;
  }

  charge(amount: number): void {
    this._accumulated += amount;
    this._state.chargedAt = Date.now();
    this._markovState = this._advanceMarkov(this._markovState);
  }

  private _advanceMarkov(current: number): number {
    const row = this._transitionMatrix[current];
    const roll = Math.random();
    return roll < row[0] ? 0 : 1;
  }

  tryRelease(): EjectionBurst | null {
    if (this._accumulated < this._config.triggerThreshold) return null;
    const mass = this._accumulated * this._config.massQuanta;
    const velocity = this._config.velocityScale * Math.sqrt(this._accumulated);
    const energy = 0.5 * mass * velocity * velocity;
    const burst: EjectionBurst = {
      id: this._nextId++,
      mass,
      velocity,
      energy,
      timestamp: Date.now(),
    };
    this._bursts.push(burst);
    if (this._bursts.length > this._config.maxBursts) {
      this._bursts.shift();
    }
    this._accumulated = 0;
    this._state.lastRelease = burst.id;
    this._updateShockFront(burst);
    return burst;
  }

  private _updateShockFront(burst: EjectionBurst): void {
    const timeElapsed = (Date.now() - burst.timestamp) / 1000;
    this._shockFrontRadius = burst.velocity * timeElapsed * 0.1;
  }

  computeSummary(): EjectionSummary {
    const totalMass = this._bursts.reduce((acc, b) => acc + b.mass, 0);
    const totalEnergy = this._bursts.reduce((acc, b) => acc + b.energy, 0);
    const peakVelocity =
      this._bursts.length > 0 ? Math.max(...this._bursts.map((b) => b.velocity)) : 0;
    this._summary = {
      bursts: this._bursts.length,
      totalMass,
      totalEnergy,
      peakVelocity,
    };
    return this._summary;
  }

  isCharged(): boolean {
    return this._accumulated >= this._config.triggerThreshold;
  }

  strongestBurst(): EjectionBurst | null {
    if (this._bursts.length === 0) return null;
    return this._bursts.reduce((best, b) => (b.energy > best.energy ? b : best));
  }

  averageVelocity(): number {
    if (this._bursts.length === 0) return 0;
    return this._bursts.reduce((acc, b) => acc + b.velocity, 0) / this._bursts.length;
  }

  computeVelocityDistribution(): Record<string, number> {
    const dist: Record<string, number> = {};
    for (const b of this._bursts) {
      const bucket = Math.floor(b.velocity / 10) * 10;
      dist[bucket] = (dist[bucket] ?? 0) + 1;
    }
    return dist;
  }

  computePowerLawFit(): number {
    if (this._bursts.length < 2) return 0;
    const energies = this._bursts.map((b) => b.energy).sort((a, b) => a - b);
    const logE = energies.map((e) => Math.log(e + 1));
    const logN = energies.map((_, i) => Math.log(energies.length - i));
    const n = logE.length;
    const sumX = logE.reduce((a, b) => a + b, 0);
    const sumY = logN.reduce((a, b) => a + b, 0);
    const sumXY = logE.reduce((s, x, i) => s + x * logN[i], 0);
    const sumX2 = logE.reduce((s, x) => s + x * x, 0);
    return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  }

  setTrigger(threshold: number): void {
    this._config.triggerThreshold = threshold;
    this._state.triggerUpdated = threshold;
  }

  recentBursts(count: number): EjectionBurst[] {
    return this._bursts.slice(-count);
  }

  report(): Record<string, unknown> {
    return {
      burstCount: this._bursts.length,
      accumulated: this._accumulated,
      summary: this._summary,
      state: this._state,
      markovState: this._markovState,
      powerLawIndex: this._powerLawIndex.toFixed(2),
      shockFrontRadius: this._shockFrontRadius.toFixed(3),
      velocityDistribution: this.computeVelocityDistribution(),
    };
  }
}
