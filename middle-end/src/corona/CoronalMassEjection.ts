/**
 * 日冕物质抛射模块：从日冕突然释放巨大能量与物质的事件。
 * 用于刻画系统中突发性的大规模能量爆发过程。
 */

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

  constructor(config: CoronalMassEjectionConfig) {
    this._config = config;
  }

  get burstCount(): number {
    return this._bursts.length;
  }

  get accumulated(): number {
    return this._accumulated;
  }

  charge(amount: number): void {
    this._accumulated += amount;
    this._state.chargedAt = Date.now();
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
    return burst;
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
    };
  }
}
