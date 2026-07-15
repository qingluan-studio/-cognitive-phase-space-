export interface Particle {
  position: number[];
  velocity: number[];
  bestPosition: number[];
  bestFitness: number;
}

export interface PSOHistory {
  iteration: number;
  globalBestFitness: number;
  meanFitness: number;
  diversity: number;
}

export class SwarmIntelligence {
  private _particles: Particle[];
  private _dimensions: number;
  private _particleCount: number;
  private _globalBestPosition: number[];
  private _globalBestFitness: number;
  private _cognitiveCoeff: number;
  private _socialCoeff: number;
  private _inertia: number;
  private _history: PSOHistory[];
  private _bounds: { min: number; max: number }[];
  private _fitnessFunction: (x: number[]) => number;

  constructor(dimensions: number, particleCount: number, bounds?: { min: number; max: number }[]) {
    this._dimensions = dimensions;
    this._particleCount = particleCount;
    this._particles = [];
    this._globalBestPosition = new Array(dimensions).fill(0);
    this._globalBestFitness = Infinity;
    this._cognitiveCoeff = 2.0;
    this._socialCoeff = 2.0;
    this._inertia = 0.7;
    this._history = [];
    this._bounds = bounds || Array.from({ length: dimensions }, () => ({ min: -10, max: 10 }));
    this._fitnessFunction = (x) => x.reduce((sum, v) => sum + v * v, 0);
  }

  get dimensions(): number { return this._dimensions; }
  get particleCount(): number { return this._particleCount; }
  get globalBestFitness(): number { return this._globalBestFitness; }
  get globalBestPosition(): number[] { return [...this._globalBestPosition]; }
  get inertia(): number { return this._inertia; }
  get history(): PSOHistory[] { return this._history; }

  public setFitnessFunction(fn: (x: number[]) => number): void {
    this._fitnessFunction = fn;
  }

  public setCoefficients(cognitive: number, social: number, inertia: number): void {
    this._cognitiveCoeff = cognitive;
    this._socialCoeff = social;
    this._inertia = inertia;
  }

  public initialize(): void {
    this._particles = [];
    this._globalBestFitness = Infinity;
    for (let i = 0; i < this._particleCount; i++) {
      const position: number[] = [];
      const velocity: number[] = [];
      const bestPosition: number[] = [];
      for (let d = 0; d < this._dimensions; d++) {
        const range = this._bounds[d].max - this._bounds[d].min;
        const pos = this._bounds[d].min + Math.random() * range;
        position.push(pos);
        velocity.push((Math.random() - 0.5) * range * 0.1);
        bestPosition.push(pos);
      }
      const fitness = this._fitnessFunction(position);
      this._particles.push({
        position: [...position],
        velocity: [...velocity],
        bestPosition: [...bestPosition],
        bestFitness: fitness
      });
      if (fitness < this._globalBestFitness) {
        this._globalBestFitness = fitness;
        this._globalBestPosition = [...position];
      }
    }
  }

  public step(): void {
    for (const p of this._particles) {
      for (let d = 0; d < this._dimensions; d++) {
        const r1 = Math.random();
        const r2 = Math.random();
        p.velocity[d] = this._inertia * p.velocity[d]
          + this._cognitiveCoeff * r1 * (p.bestPosition[d] - p.position[d])
          + this._socialCoeff * r2 * (this._globalBestPosition[d] - p.position[d]);
        p.position[d] += p.velocity[d];
        if (p.position[d] < this._bounds[d].min) {
          p.position[d] = this._bounds[d].min;
          p.velocity[d] *= -0.5;
        }
        if (p.position[d] > this._bounds[d].max) {
          p.position[d] = this._bounds[d].max;
          p.velocity[d] *= -0.5;
        }
      }
      const fitness = this._fitnessFunction(p.position);
      if (fitness < p.bestFitness) {
        p.bestFitness = fitness;
        p.bestPosition = [...p.position];
      }
      if (fitness < this._globalBestFitness) {
        this._globalBestFitness = fitness;
        this._globalBestPosition = [...p.position];
      }
    }
    this._recordHistory();
  }

  public optimize(iterations: number): number[] {
    if (this._particles.length === 0) this.initialize();
    for (let i = 0; i < iterations; i++) {
      this.step();
    }
    return [...this._globalBestPosition];
  }

  private _recordHistory(): void {
    const meanFitness = this._particles.reduce((sum, p) => sum + this._fitnessFunction(p.position), 0) / this._particles.length;
    let diversity = 0;
    const center = new Array(this._dimensions).fill(0);
    for (const p of this._particles) {
      for (let d = 0; d < this._dimensions; d++) {
        center[d] += p.position[d];
      }
    }
    for (let d = 0; d < this._dimensions; d++) center[d] /= this._particles.length;
    for (const p of this._particles) {
      for (let d = 0; d < this._dimensions; d++) {
        diversity += (p.position[d] - center[d]) ** 2;
      }
    }
    diversity = Math.sqrt(diversity / this._particles.length);
    this._history.push({
      iteration: this._history.length,
      globalBestFitness: this._globalBestFitness,
      meanFitness,
      diversity
    });
  }

  public computeConvergenceRate(): number {
    if (this._history.length < 2) return 0;
    const initial = this._history[0].globalBestFitness;
    const final = this._history[this._history.length - 1].globalBestFitness;
    return initial > 0 ? (initial - final) / initial : 0;
  }

  public computeSwarmDiversity(): number {
    if (this._particles.length === 0) return 0;
    const center = new Array(this._dimensions).fill(0);
    for (const p of this._particles) {
      for (let d = 0; d < this._dimensions; d++) {
        center[d] += p.position[d];
      }
    }
    for (let d = 0; d < this._dimensions; d++) center[d] /= this._particles.length;
    let sum = 0;
    for (const p of this._particles) {
      for (let d = 0; d < this._dimensions; d++) {
        sum += (p.position[d] - center[d]) ** 2;
      }
    }
    return Math.sqrt(sum / this._particles.length);
  }

  public runAntColonyOptimization(graph: number[][], iterations: number = 100, ants: number = 20, evaporation: number = 0.5): number[] {
    const n = graph.length;
    const pheromone = Array.from({ length: n }, () => new Array(n).fill(1.0));
    let bestTour: number[] = [];
    let bestLength = Infinity;
    for (let iter = 0; iter < iterations; iter++) {
      for (let a = 0; a < ants; a++) {
        const tour = [Math.floor(Math.random() * n)];
        const visited = new Set(tour);
        while (visited.size < n) {
          const current = tour[tour.length - 1];
          const probs: { node: number; prob: number }[] = [];
          let total = 0;
          for (let next = 0; next < n; next++) {
            if (!visited.has(next) && graph[current][next] > 0) {
              const prob = Math.pow(pheromone[current][next], 1.0) * Math.pow(1.0 / graph[current][next], 2.0);
              probs.push({ node: next, prob });
              total += prob;
            }
          }
          if (probs.length === 0) break;
          let r = Math.random() * total;
          let chosen = probs[0].node;
          for (const p of probs) {
            r -= p.prob;
            if (r <= 0) {
              chosen = p.node;
              break;
            }
          }
          tour.push(chosen);
          visited.add(chosen);
        }
        let length = 0;
        for (let i = 0; i < tour.length - 1; i++) {
          length += graph[tour[i]][tour[i + 1]];
        }
        if (length < bestLength) {
          bestLength = length;
          bestTour = [...tour];
        }
        for (let i = 0; i < tour.length - 1; i++) {
          pheromone[tour[i]][tour[i + 1]] += 1.0 / length;
          pheromone[tour[i + 1]][tour[i]] += 1.0 / length;
        }
      }
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          pheromone[i][j] *= evaporation;
        }
      }
    }
    return bestTour;
  }

  public computeNeighborhoodTopology(radius: number = 2): Map<number, number[]> {
    const topology = new Map<number, number[]>();
    for (let i = 0; i < this._particles.length; i++) {
      const neighbors: number[] = [];
      for (let j = -radius; j <= radius; j++) {
        const idx = (i + j + this._particles.length) % this._particles.length;
        if (idx !== i) neighbors.push(idx);
      }
      topology.set(i, neighbors);
    }
    return topology;
  }

  public adaptiveInertia(iteration: number, maxIterations: number): void {
    this._inertia = 0.9 - (0.5 * iteration / maxIterations);
  }

  public computeParticleVelocities(): number[] {
    return this._particles.map(p => Math.sqrt(p.velocity.reduce((sum, v) => sum + v * v, 0)));
  }

  public reset(): void {
    this._particles = [];
    this._globalBestPosition = new Array(this._dimensions).fill(0);
    this._globalBestFitness = Infinity;
    this._history = [];
  }

  public exportParticles(): Particle[] {
    return this._particles.map(p => ({
      position: [...p.position],
      velocity: [...p.velocity],
      bestPosition: [...p.bestPosition],
      bestFitness: p.bestFitness
    }));
  }
}
