export interface SimulationConfig {
  generations: number;
  mutationsPerGeneration: number;
  selectionPressure: number;
}

export interface SimulatedDescendant {
  id: string;
  generation: number;
  traits: Record<string, number>;
  fitness: number;
}

export class DescendantSimulator {
  private _ancestors: Map<string, Record<string, number>> = new Map();
  private _simulated: SimulatedDescendant[] = [];
  private _config: SimulationConfig = {
    generations: 5,
    mutationsPerGeneration: 2,
    selectionPressure: 0.5,
  };
  private _entropySeries: number[] = [];
  private _markovTransition: Map<number, Map<number, number>> = new Map();
  private _convergenceHistory: number[] = [];

  seedAncestor(id: string, traits: Record<string, number>): void {
    this._ancestors.set(id, { ...traits });
  }

  simulate(ancestorId: string): SimulatedDescendant[] {
    const baseTraits = this._ancestors.get(ancestorId);
    if (!baseTraits) {
      return [];
    }
    const results: SimulatedDescendant[] = [];
    let current: SimulatedDescendant = {
      id: `${ancestorId}-g0`,
      generation: 0,
      traits: { ...baseTraits },
      fitness: this._computeFitness(baseTraits),
    };
    results.push(current);
    let prevFitness = current.fitness;
    for (let g = 1; g <= this._config.generations; g++) {
      const next = this._mutate(current, g);
      const threshold = prevFitness * (1 - this._config.selectionPressure);
      if (next.fitness < threshold) {
        this._updateMarkovTransition(g - 1, g, 0);
        continue;
      }
      this._updateMarkovTransition(g - 1, g, 1);
      results.push(next);
      current = next;
      prevFitness = next.fitness;
    }
    this._simulated.push(...results);
    if (this._simulated.length > 500) {
      this._simulated.splice(0, this._simulated.length - 500);
    }
    this._computeEntropySeries(results);
    this._convergenceHistory.push(this._computeConvergenceRate(results));
    if (this._convergenceHistory.length > 100) {
      this._convergenceHistory.shift();
    }
    return results;
  }

  private _mutate(parent: SimulatedDescendant, gen: number): SimulatedDescendant {
    const traits: Record<string, number> = { ...parent.traits };
    const keys = Object.keys(traits);
    if (keys.length === 0) {
      return {
        id: `${parent.id}-g${gen}`,
        generation: gen,
        traits,
        fitness: 0,
      };
    }
    for (let i = 0; i < this._config.mutationsPerGeneration; i++) {
      const key = keys[Math.floor(Math.random() * keys.length)];
      const mutationFactor = 0.8 + Math.random() * 0.4;
      traits[key] = traits[key] * mutationFactor;
    }
    return {
      id: `${parent.id}-g${gen}`,
      generation: gen,
      traits,
      fitness: this._computeFitness(traits),
    };
  }

  private _computeFitness(traits: Record<string, number>): number {
    const values = Object.values(traits);
    if (values.length === 0) {
      return 0;
    }
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
    return mean * (1 - variance / (mean * mean + 1));
  }

  setConfig(config: Partial<SimulationConfig>): void {
    this._config = { ...this._config, ...config };
  }

  getBestDescendant(): SimulatedDescendant | null {
    if (this._simulated.length === 0) {
      return null;
    }
    return [...this._simulated].sort((a, b) => b.fitness - a.fitness)[0];
  }

  getSimulated(limit: number = 100): SimulatedDescendant[] {
    return this._simulated.slice(-limit);
  }

  get ancestorCount(): number {
    return this._ancestors.size;
  }

  get entropySeries(): number[] {
    return [...this._entropySeries];
  }

  get convergenceRate(): number {
    if (this._convergenceHistory.length === 0) {
      return 0;
    }
    return this._convergenceHistory.reduce((s, v) => s + v, 0) / this._convergenceHistory.length;
  }

  computeTraitCorrelation(traitA: string, traitB: string): number {
    const points: Array<[number, number]> = [];
    for (const d of this._simulated) {
      if (traitA in d.traits && traitB in d.traits) {
        points.push([d.traits[traitA], d.traits[traitB]]);
      }
    }
    if (points.length < 2) {
      return 0;
    }
    const meanA = points.reduce((s, p) => s + p[0], 0) / points.length;
    const meanB = points.reduce((s, p) => s + p[1], 0) / points.length;
    let num = 0;
    let denA = 0;
    let denB = 0;
    for (const [a, b] of points) {
      num += (a - meanA) * (b - meanB);
      denA += (a - meanA) ** 2;
      denB += (b - meanB) ** 2;
    }
    const den = Math.sqrt(denA * denB);
    return den === 0 ? 0 : num / den;
  }

  predictNextGenerationFitness(ancestorId: string): number {
    const lineage = this._simulated.filter((d) => d.id.startsWith(`${ancestorId}-g`));
    if (lineage.length < 2) {
      return 0;
    }
    const n = lineage.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;
    for (let i = 0; i < n; i++) {
      sumX += lineage[i].generation;
      sumY += lineage[i].fitness;
      sumXY += lineage[i].generation * lineage[i].fitness;
      sumXX += lineage[i].generation * lineage[i].generation;
    }
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    return slope * (lineage[lineage.length - 1].generation + 1) + intercept;
  }

  private _computeEntropySeries(results: SimulatedDescendant[]): void {
    const traitValues: Record<string, number[]> = {};
    for (const r of results) {
      for (const [k, v] of Object.entries(r.traits)) {
        if (!traitValues[k]) {
          traitValues[k] = [];
        }
        traitValues[k].push(v);
      }
    }
    let totalEntropy = 0;
    for (const values of Object.values(traitValues)) {
      const mean = values.reduce((s, v) => s + v, 0) / values.length;
      const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
      if (variance > 0) {
        totalEntropy += 0.5 * Math.log2(2 * Math.PI * Math.E * variance);
      }
    }
    this._entropySeries.push(totalEntropy);
    if (this._entropySeries.length > 200) {
      this._entropySeries.shift();
    }
  }

  private _updateMarkovTransition(from: number, to: number, accepted: number): void {
    const map = this._markovTransition.get(from) ?? new Map<number, number>();
    map.set(to, (map.get(to) ?? 0) + accepted);
    this._markovTransition.set(from, map);
  }

  private _computeConvergenceRate(results: SimulatedDescendant[]): number {
    if (results.length < 2) {
      return 0;
    }
    const improvements = results.slice(1).filter((r, i) => r.fitness > results[i].fitness).length;
    return improvements / (results.length - 1);
  }
}
