export interface Particle {
  id: string;
  position: number[];
  velocity: number[];
  energy: number;
  mass: number;
}

export interface InnovationPath {
  id: string;
  waypoints: number[][];
  novelty: number;
  fractalDimension: number;
  totalDisplacement: number;
  createdAt: number;
}

export class BrownianInnovator {
  private _particles: Map<string, Particle> = new Map();
  private _paths: InnovationPath[] = [];
  private _dimensions: number;
  private _temperature: number;
  private _damping: number;
  private _stepCount = 0;
  private _collisionCount = 0;

  constructor(dimensions: number = 3, temperature: number = 1.0, damping: number = 0.9) {
    this._dimensions = Math.max(1, dimensions);
    this._temperature = Math.max(0, temperature);
    this._damping = Math.max(0, Math.min(1, damping));
  }

  spawnParticle(id: string, initialPosition: number[] = [], mass: number = 1): Particle {
    const position = initialPosition.length === this._dimensions
      ? [...initialPosition]
      : Array.from({ length: this._dimensions }, () => Math.random() * 2 - 1);
    const particle: Particle = {
      id,
      position,
      velocity: Array.from({ length: this._dimensions }, () => 0),
      energy: this._temperature,
      mass: Math.max(0.01, mass),
    };
    this._particles.set(id, particle);
    return particle;
  }

  step(): void {
    for (const particle of this._particles.values()) {
      const sigma = Math.sqrt(2 * this._temperature * this._damping / Math.max(0.01, particle.mass));
      for (let d = 0; d < this._dimensions; d++) {
        const kick = this._gaussian() * sigma;
        particle.velocity[d] = particle.velocity[d] * this._damping + kick;
        particle.position[d] += particle.velocity[d];
      }
      const kinetic = 0.5 * particle.mass * particle.velocity.reduce((s, v) => s + v * v, 0);
      particle.energy = Math.max(0, kinetic);
    }
    this._stepCount++;
  }

  tracePath(particleId: string, steps: number = 10): InnovationPath | null {
    const particle = this._particles.get(particleId);
    if (!particle) return null;
    const waypoints: number[][] = [[...particle.position]];
    for (let i = 0; i < steps; i++) {
      this.step();
      waypoints.push([...particle.position]);
    }
    const novelty = this._computeNovelty(waypoints);
    const fractalDimension = this._hurstExponent(waypoints);
    const totalDisplacement = this._displacement(waypoints);
    const path: InnovationPath = {
      id: `path-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      waypoints,
      novelty,
      fractalDimension,
      totalDisplacement,
      createdAt: Date.now(),
    };
    this._paths.push(path);
    if (this._paths.length > 100) this._paths.shift();
    return path;
  }

  collide(idA: string, idB: string): Particle | null {
    const a = this._particles.get(idA);
    const b = this._particles.get(idB);
    if (!a || !b) return null;
    const m1 = a.mass, m2 = b.mass;
    const totalMass = m1 + m2;
    const newPosition = a.position.map((v, i) => (m1 * v + m2 * (b.position[i] ?? 0)) / totalMass);
    const newVelocity = a.velocity.map((v, i) =>
      ((m1 - m2) * v + 2 * m2 * (b.velocity[i] ?? 0)) / totalMass
    );
    const offspring: Particle = {
      id: `${idA}-${idB}-${this._stepCount}`,
      position: newPosition,
      velocity: newVelocity,
      energy: a.energy + b.energy,
      mass: totalMass,
    };
    this._particles.set(offspring.id, offspring);
    this._collisionCount++;
    return offspring;
  }

  setTemperature(t: number): void {
    this._temperature = Math.max(0, t);
  }

  getPaths(): InnovationPath[] { return [...this._paths]; }
  get particleCount(): number { return this._particles.size; }
  get stepCount(): number { return this._stepCount; }
  get collisionCount(): number { return this._collisionCount; }

  private _computeNovelty(waypoints: number[][]): number {
    if (waypoints.length < 2) return 0;
    let total = 0;
    for (let i = 1; i < waypoints.length; i++) {
      total += this._euclidean(waypoints[i - 1], waypoints[i]);
    }
    return total / (waypoints.length - 1);
  }

  private _displacement(waypoints: number[][]): number {
    if (waypoints.length < 2) return 0;
    return this._euclidean(waypoints[0], waypoints[waypoints.length - 1]);
  }

  private _hurstExponent(waypoints: number[][]): number {
    if (waypoints.length < 4) return 0.5;
    const series = waypoints.map(p => p.reduce((s, v) => s + v, 0) / p.length);
    const mean = series.reduce((s, v) => s + v, 0) / series.length;
    let cumDev = 0;
    let range = 0;
    let stdSum = 0;
    for (let i = 0; i < series.length; i++) {
      cumDev += series[i] - mean;
      range = Math.max(range, Math.abs(cumDev));
      stdSum += (series[i] - mean) ** 2;
    }
    const std = Math.sqrt(stdSum / series.length);
    if (std === 0) return 0.5;
    const rs = range / std;
    return Math.max(0, Math.min(1, Math.log(rs) / Math.log(series.length)));
  }

  private _euclidean(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      const diff = a[i] - (b[i] ?? 0);
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }

  private _gaussian(): number {
    const u1 = Math.max(1e-9, Math.random());
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }
}
