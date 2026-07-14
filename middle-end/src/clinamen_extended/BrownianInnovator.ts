/**
 * 布朗创新者：用布朗运动产生创新路径。
 * 在多维概念空间中模拟粒子布朗运动，碰撞与游走产生偶然的创新组合。
 */

export interface Particle {
  id: string;
  position: number[];
  velocity: number[];
  energy: number;
}

export interface InnovationPath {
  id: string;
  waypoints: number[][];
  novelty: number;
  createdAt: number;
}

export class BrownianInnovator {
  private _particles: Map<string, Particle> = new Map();
  private _paths: InnovationPath[] = [];
  private _dimensions: number;
  private _temperature: number;
  private _stepCount = 0;

  constructor(dimensions: number = 3, temperature: number = 1.0) {
    this._dimensions = dimensions;
    this._temperature = temperature;
  }

  spawnParticle(id: string, initialPosition: number[] = []): Particle {
    const position = initialPosition.length === this._dimensions
      ? [...initialPosition]
      : Array.from({ length: this._dimensions }, () => Math.random() * 2 - 1);
    const particle: Particle = {
      id,
      position,
      velocity: Array.from({ length: this._dimensions }, () => 0),
      energy: this._temperature,
    };
    this._particles.set(id, particle);
    return particle;
  }

  step(): void {
    for (const particle of this._particles.values()) {
      for (let d = 0; d < this._dimensions; d++) {
        const kick = (Math.random() - 0.5) * 2 * this._temperature;
        particle.velocity[d] = particle.velocity[d] * 0.9 + kick * 0.1;
        particle.position[d] += particle.velocity[d];
      }
      particle.energy = Math.max(0, particle.energy - 0.001);
    }
    this._stepCount++;
  }

  tracePath(particleId: string, steps: number = 10): InnovationPath | null {
    const particle = this._particles.get(particleId);
    if (!particle) return null;
    const waypoints: number[][] = [];
    waypoints.push([...particle.position]);
    for (let i = 0; i < steps; i++) {
      this.step();
      waypoints.push([...particle.position]);
    }
    const novelty = this._computeNovelty(waypoints);
    const path: InnovationPath = {
      id: `path-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      waypoints,
      novelty,
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
    const offspring: Particle = {
      id: `${idA}-${idB}-${this._stepCount}`,
      position: a.position.map((v, i) => (v + b.position[i]) / 2),
      velocity: a.velocity.map((v, i) => (v + b.velocity[i]) / 2),
      energy: a.energy + b.energy,
    };
    this._particles.set(offspring.id, offspring);
    return offspring;
  }

  setTemperature(t: number): void {
    this._temperature = Math.max(0, t);
  }

  getPaths(): InnovationPath[] {
    return [...this._paths];
  }

  get particleCount(): number {
    return this._particles.size;
  }

  private _computeNovelty(waypoints: number[][]): number {
    if (waypoints.length < 2) return 0;
    let total = 0;
    for (let i = 1; i < waypoints.length; i++) {
      const prev = waypoints[i - 1];
      const curr = waypoints[i];
      let dist = 0;
      for (let d = 0; d < prev.length; d++) {
        dist += (curr[d] - prev[d]) ** 2;
      }
      total += Math.sqrt(dist);
    }
    return total / (waypoints.length - 1);
  }
}
