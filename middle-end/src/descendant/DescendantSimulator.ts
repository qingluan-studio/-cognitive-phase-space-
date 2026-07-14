/**
 * 后代模拟器：模拟未来可能的后代。
 * 基于当前模块的演化参数与变异规则，前瞻性地模拟若干代后代的可能形态。
 */

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

  seedAncestor(id: string, traits: Record<string, number>): void {
    this._ancestors.set(id, { ...traits });
  }

  simulate(ancestorId: string): SimulatedDescendant[] {
    const baseTraits = this._ancestors.get(ancestorId);
    if (!baseTraits) return [];
    const results: SimulatedDescendant[] = [];
    let current: SimulatedDescendant = {
      id: `${ancestorId}-g0`,
      generation: 0,
      traits: { ...baseTraits },
      fitness: this._computeFitness(baseTraits),
    };
    results.push(current);
    for (let g = 1; g <= this._config.generations; g++) {
      const next = this._mutate(current, g);
      if (next.fitness < current.fitness * (1 - this._config.selectionPressure)) {
        continue;
      }
      results.push(next);
      current = next;
    }
    this._simulated.push(...results);
    if (this._simulated.length > 500) this._simulated.splice(0, this._simulated.length - 500);
    return results;
  }

  private _mutate(parent: SimulatedDescendant, gen: number): SimulatedDescendant {
    const traits: Record<string, number> = { ...parent.traits };
    for (let i = 0; i < this._config.mutationsPerGeneration; i++) {
      const keys = Object.keys(traits);
      if (keys.length === 0) break;
      const key = keys[Math.floor(Math.random() * keys.length)];
      traits[key] = traits[key] * (0.8 + Math.random() * 0.4);
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
    if (values.length === 0) return 0;
    return values.reduce((s, v) => s + v, 0) / values.length;
  }

  setConfig(config: Partial<SimulationConfig>): void {
    this._config = { ...this._config, ...config };
  }

  getBestDescendant(): SimulatedDescendant | null {
    if (this._simulated.length === 0) return null;
    return [...this._simulated].sort((a, b) => b.fitness - a.fitness)[0];
  }

  getSimulated(limit: number = 100): SimulatedDescendant[] {
    return this._simulated.slice(-limit);
  }

  get ancestorCount(): number {
    return this._ancestors.size;
  }
}
