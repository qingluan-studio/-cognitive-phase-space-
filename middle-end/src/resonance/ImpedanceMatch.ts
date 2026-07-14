/**
 * 阻抗匹配模块：当源端与负载端阻抗相等时能量传输最大。
 * 用于在模块之间寻找最优耦合条件以最大化信号传递效率。
 */

export interface ImpedancePair {
  source: number;
  load: number;
  frequency: number;
}

export type MatchQuality = {
  reflectionCoeff: number;
  transmission: number;
  vswr: number;
};

export interface ImpedanceConfig {
  baseImpedance: number;
  tolerance: number;
  maxFrequency: number;
}

export class ImpedanceMatch {
  private _config: ImpedanceConfig;
  private _pairs: ImpedancePair[] = [];
  private _current: ImpedancePair | null = null;
  private _tuningLog: Record<string, unknown> = {};

  constructor(config: ImpedanceConfig) {
    this._config = config;
  }

  get pairCount(): number {
    return this._pairs.length;
  }

  get current(): ImpedancePair | null {
    return this._current;
  }

  setPair(source: number, load: number, frequency: number): ImpedancePair {
    const pair: ImpedancePair = { source, load, frequency };
    this._current = pair;
    this._pairs.push(pair);
    if (this._pairs.length > 50) this._pairs.shift();
    return pair;
  }

  evaluate(): MatchQuality {
    if (!this._current) {
      return { reflectionCoeff: 1, transmission: 0, vswr: Infinity };
    }
    const { source, load } = this._current;
    const reflection = Math.abs((load - source) / (load + source));
    const transmission = 1 - reflection * reflection;
    const vswr = (1 + reflection) / (1 - reflection);
    return { reflectionCoeff: reflection, transmission, vswr };
  }

  tuneLoad(target: number): number {
    if (!this._current) return 0;
    const step = (target - this._current.load) * 0.3;
    this._current.load += step;
    this._tuningLog.lastStep = step;
    return step;
  }

  isMatched(): boolean {
    const q = this.evaluate();
    return q.reflectionCoeff <= this._config.tolerance;
  }

  bestPair(): ImpedancePair | null {
    let best: ImpedancePair | null = null;
    let bestRef = Infinity;
    for (const p of this._pairs) {
      const r = Math.abs((p.load - p.source) / (p.load + p.source));
      if (r < bestRef) {
        bestRef = r;
        best = p;
      }
    }
    return best;
  }

  sweepFrequency(start: number, end: number, steps: number): MatchQuality[] {
    const results: MatchQuality[] = [];
    for (let i = 0; i <= steps; i++) {
      const f = start + (i / steps) * (end - start);
      if (this._current) {
        this._current.frequency = f;
        this._current.load = this._config.baseImpedance * (1 + 0.1 * Math.sin(f));
      }
      results.push(this.evaluate());
    }
    return results;
  }

  report(): Record<string, unknown> {
    return {
      pairs: this._pairs.length,
      current: this._current,
      matched: this.isMatched(),
      tuningLog: this._tuningLog,
    };
  }
}
