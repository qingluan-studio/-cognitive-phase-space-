/**
 * 星风模块：从恒星持续流出的高速带电粒子流。
 * 用于刻画系统中持续向外辐射的高速粒子流。
 */

export interface StellarWindParticle {
  id: number;
  velocity: number;
  energy: number;
  charge: number;
}

export type WindFlux = {
  particleCount: number;
  totalEnergy: number;
  averageVelocity: number;
  fluxDensity: number;
};

export interface StellarWindConfig {
  baseVelocity: number;
  emissionRate: number;
  maxParticles: number;
}

export class StellarWind {
  private _config: StellarWindConfig;
  private _particles: StellarWindParticle[] = [];
  private _nextId: number = 0;
  private _flux: WindFlux | null = null;
  private _state: Record<string, unknown> = {};

  constructor(config: StellarWindConfig) {
    this._config = config;
  }

  get particleCount(): number {
    return this._particles.length;
  }

  get emissionRate(): number {
    return this._config.emissionRate;
  }

  emit(count: number): StellarWindParticle[] {
    const newParticles: StellarWindParticle[] = [];
    for (let i = 0; i < count; i++) {
      const velocity = this._config.baseVelocity * (0.8 + Math.random() * 0.4);
      const energy = 0.5 * velocity * velocity;
      const charge = Math.random() > 0.5 ? 1 : -1;
      const particle: StellarWindParticle = {
        id: this._nextId++,
        velocity,
        energy,
        charge,
      };
      newParticles.push(particle);
    }
    this._particles.push(...newParticles);
    if (this._particles.length > this._config.maxParticles) {
      this._particles.splice(0, this._particles.length - this._config.maxParticles);
    }
    return newParticles;
  }

  computeFlux(): WindFlux {
    const totalEnergy = this._particles.reduce((acc, p) => acc + p.energy, 0);
    const averageVelocity =
      this._particles.length > 0
        ? this._particles.reduce((acc, p) => acc + p.velocity, 0) / this._particles.length
        : 0;
    this._flux = {
      particleCount: this._particles.length,
      totalEnergy,
      averageVelocity,
      fluxDensity: this._particles.length * this._config.emissionRate,
    };
    return this._flux;
  }

  isBlowing(): boolean {
    return this._particles.length > 0;
  }

  fastestParticle(): StellarWindParticle | null {
    if (this._particles.length === 0) return null;
    return this._particles.reduce((best, p) => (p.velocity > best.velocity ? p : best));
  }

  totalEnergy(): number {
    return this._particles.reduce((acc, p) => acc + p.energy, 0);
  }

  setVelocity(velocity: number): void {
    this._config.baseVelocity = velocity;
    this._state.velocityUpdated = velocity;
  }

  filterByCharge(charge: number): StellarWindParticle[] {
    return this._particles.filter((p) => p.charge === charge);
  }

  disperse(): void {
    this._particles = [];
    this._state.dispersedAt = Date.now();
  }

  report(): Record<string, unknown> {
    return {
      particleCount: this._particles.length,
      flux: this._flux,
      state: this._state,
    };
  }
}
