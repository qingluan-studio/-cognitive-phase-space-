export interface SwerveParticle {
  id: string;
  position: number;
  velocity: number;
  mass: number;
  swerveAngle: number;
}

export interface SwerveState {
  chaosLevel: number;
  bifurcationParameter: number;
  entropy: number;
}

export class ClinamenSwerve {
  private _particles: Map<string, SwerveParticle> = new Map();
  private _state: SwerveState;
  private _trajectory: number[] = [];
  private _lyapunovSum: number = 0;
  private _iterationCount: number = 0;
  private _attractorBasin: number[] = [];

  constructor(initial: SwerveState) {
    this._state = { ...initial };
  }

  get particleCount(): number {
    return this._particles.size;
  }

  get chaosLevel(): number {
    return this._state.chaosLevel;
  }

  spawn(id: string, position: number, velocity: number, mass: number = 1): SwerveParticle {
    const particle: SwerveParticle = { id, position, velocity, mass, swerveAngle: 0 };
    this._particles.set(id, particle);
    return particle;
  }

  iterate(): void {
    const mu = this._state.bifurcationParameter;
    for (const particle of this._particles.values()) {
      const logistic = mu * particle.position * (1 - particle.position);
      const swerve = this._generateSwerve();
      const newPosition = logistic + swerve * 0.01;
      const sensitivity = Math.abs(newPosition - particle.position);
      if (sensitivity > 0) {
        this._lyapunovSum += Math.log(sensitivity + 0.001);
      }
      particle.velocity = (newPosition - particle.position) / 0.01;
      particle.position = newPosition;
      particle.swerveAngle = Math.atan2(swerve, logistic) * 180 / Math.PI;
      this._trajectory.push(particle.position);
      if (this._trajectory.length > 200) this._trajectory.shift();
    }
    this._iterationCount++;
    this._updateState();
    this._attractorBasin.push(this._computeAttractorCentroid());
    if (this._attractorBasin.length > 50) this._attractorBasin.shift();
  }

  private _generateSwerve(): number {
    const gaussian = this._boxMuller();
    return gaussian * this._state.chaosLevel;
  }

  private _boxMuller(): number {
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1 + 0.001)) * Math.cos(2 * Math.PI * u2);
  }

  private _updateState(): void {
    if (this._trajectory.length < 2) return;
    const values = this._trajectory.slice(-this._particles.size);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
    this._state.entropy = 0.5 * Math.log(2 * Math.PI * Math.E * (variance + 0.001));
  }

  private _computeAttractorCentroid(): number {
    const values = Array.from(this._particles.values()).map(p => p.position);
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  perturb(id: string, magnitude: number): boolean {
    const particle = this._particles.get(id);
    if (!particle) return false;
    particle.position += magnitude * (Math.random() - 0.5);
    particle.velocity += magnitude * (Math.random() - 0.5);
    return true;
  }

  setBifurcationParameter(mu: number): void {
    this._state.bifurcationParameter = Math.max(0, Math.min(4, mu));
  }

  setChaosLevel(level: number): void {
    this._state.chaosLevel = Math.max(0, level);
  }

  computeLyapunovExponent(): number {
    if (this._iterationCount === 0) return 0;
    return this._lyapunovSum / this._iterationCount;
  }

  getTrajectory(): number[] {
    return [...this._trajectory];
  }

  getBifurcationDiagram(): { mu: number; x: number }[] {
    const points: { mu: number; x: number }[] = [];
    const originalMu = this._state.bifurcationParameter;
    for (let mu = 2.5; mu <= 4; mu += 0.01) {
      this._state.bifurcationParameter = mu;
      for (let i = 0; i < 100; i++) this.iterate();
      for (const p of this._particles.values()) {
        points.push({ mu, x: p.position });
      }
    }
    this._state.bifurcationParameter = originalMu;
    return points;
  }

  getAttractorBasin(): number[] {
    return [...this._attractorBasin];
  }

  computeFractalDimension(): number {
    if (this._trajectory.length < 10) return 0;
    const N = this._trajectory.length;
    const boxSizes = [0.1, 0.05, 0.025];
    const counts: number[] = [];
    for (const epsilon of boxSizes) {
      const boxes = new Set<string>();
      for (const x of this._trajectory) {
        boxes.add(`${Math.floor(x / epsilon)}`);
      }
      counts.push(boxes.size);
    }
    let slope = 0;
    for (let i = 1; i < boxSizes.length; i++) {
      slope += (Math.log(counts[i]) - Math.log(counts[i - 1])) /
        (Math.log(boxSizes[i]) - Math.log(boxSizes[i - 1]));
    }
    return -slope / (boxSizes.length - 1);
  }

  getParticles(): SwerveParticle[] {
    return Array.from(this._particles.values());
  }

  reset(): void {
    this._trajectory = [];
    this._lyapunovSum = 0;
    this._iterationCount = 0;
    this._attractorBasin = [];
  }
}
