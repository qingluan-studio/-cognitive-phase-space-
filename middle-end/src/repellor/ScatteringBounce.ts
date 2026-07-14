export interface ScatteringParticle {
  id: string;
  mass: number;
  charge: number;
  position: { x: number; y: number };
  velocity: { x: number; y: number };
}

export interface ScatteringEvent {
  particleId: string;
  angle: number;
  crossSection: number;
  momentumTransfer: number;
  energyLoss: number;
}

export class ScatteringBounce {
  private _particles: Map<string, ScatteringParticle> = new Map();
  private _events: ScatteringEvent[] = [];
  private _state: Record<string, unknown> = {};
  private _coulombConstant: number = 8.9875517923e9;

  constructor() {}

  get particleCount(): number {
    return this._particles.size;
  }

  get eventCount(): number {
    return this._events.length;
  }

  addParticle(id: string, mass: number, charge: number, x: number, y: number, vx: number, vy: number): void {
    this._particles.set(id, { id, mass, charge, position: { x, y }, velocity: { x: vx, y: vy } });
  }

  scatter(particleId: string, targetCharge: number, impactParameter: number): ScatteringEvent | null {
    const p = this._particles.get(particleId);
    if (!p) return null;
    const v = Math.sqrt(p.velocity.x ** 2 + p.velocity.y ** 2);
    if (v === 0) return null;
    const k = this._coulombConstant;
    const numerator = k * p.charge * targetCharge;
    const denominator = p.mass * v * v;
    const cotHalfTheta = (impactParameter * denominator) / numerator;
    const theta = 2 * Math.atan(1 / Math.abs(cotHalfTheta));
    const crossSection = Math.PI * impactParameter * impactParameter;
    const pInitial = p.mass * v;
    const pFinal = p.mass * v * Math.cos(theta);
    const momentumTransfer = Math.abs(pFinal - pInitial);
    const energyLoss = 0.5 * p.mass * v * v * (1 - Math.cos(theta) ** 2);
    const event: ScatteringEvent = { particleId, angle: theta, crossSection, momentumTransfer, energyLoss };
    this._events.push(event);
    if (this._events.length > 50) this._events.shift();
    return event;
  }

  differentialCrossSection(theta: number, particleId: string, targetCharge: number, energy: number): number {
    const p = this._particles.get(particleId);
    if (!p) return 0;
    const k = this._coulombConstant;
    const numerator = k * p.charge * targetCharge;
    const denominator = 4 * energy;
    return Math.pow(numerator / (4 * denominator * Math.sin(theta / 2) ** 2), 2);
  }

  totalCrossSection(particleId: string, maxImpact: number): number {
    return Math.PI * maxImpact * maxImpact;
  }

  kineticEnergyDistribution(): Record<number, number> {
    const dist: Record<number, number> = {};
    for (const p of this._particles.values()) {
      const ke = 0.5 * p.mass * (p.velocity.x ** 2 + p.velocity.y ** 2);
      const bin = Math.floor(ke * 10) / 10;
      dist[bin] = (dist[bin] ?? 0) + 1;
    }
    return dist;
  }

  averageMomentumTransfer(): number {
    if (this._events.length === 0) return 0;
    return this._events.reduce((s, e) => s + e.momentumTransfer, 0) / this._events.length;
  }

  momentumDistribution(): Record<number, number> {
    const dist: Record<number, number> = {};
    for (const e of this._events) {
      const bin = Math.floor(e.momentumTransfer * 10) / 10;
      dist[bin] = (dist[bin] ?? 0) + 1;
    }
    return dist;
  }

  scatterAngleDistribution(): Record<number, number> {
    const dist: Record<number, number> = {};
    for (const e of this._events) {
      const bin = Math.floor((e.angle * 180 / Math.PI) / 10) * 10;
      dist[bin] = (dist[bin] ?? 0) + 1;
    }
    return dist;
  }

  totalScatteredEnergy(): number {
    return this._events.reduce((s, e) => s + e.energyLoss, 0);
  }

  impactParameterDistribution(): Record<number, number> {
    const dist: Record<number, number> = {};
    for (const e of this._events) {
      const bin = Math.floor(Math.sqrt(e.crossSection / Math.PI) * 10) / 10;
      dist[bin] = (dist[bin] ?? 0) + 1;
    }
    return dist;
  }

  report(): Record<string, unknown> {
    return {
      particles: this._particles.size,
      events: this._events.length,
      avgMomentumTransfer: this.averageMomentumTransfer(),
      state: this._state,
    };
  }
}
