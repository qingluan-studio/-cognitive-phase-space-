/**
 * 认知失调模块：当系统中存在相互矛盾的信念或状态时引发的不适度量。
 * 用于检测内部冲突并驱动趋向一致性的调整过程。
 */

export interface DissonanceBelief {
  id: string;
  content: string;
  weight: number;
  conflicts: string[];
}

export type DissonanceScore = {
  raw: number;
  normalized: number;
  severity: 'low' | 'medium' | 'high';
};

export interface CognitiveConfig {
  resolutionDrive: number;
  tolerance: number;
  maxBeliefs: number;
}

export class CognitiveDissonance {
  private _config: CognitiveConfig;
  private _beliefs: DissonanceBelief[] = [];
  private _lastScore: number = 0;
  private _adjustments: Record<string, unknown> = {};

  constructor(config: CognitiveConfig) {
    this._config = config;
  }

  get beliefCount(): number {
    return this._beliefs.length;
  }

  get lastScore(): number {
    return this._lastScore;
  }

  addBelief(belief: DissonanceBelief): void {
    this._beliefs.push(belief);
    if (this._beliefs.length > this._config.maxBeliefs) {
      this._beliefs.shift();
    }
  }

  computeScore(): DissonanceScore {
    let raw = 0;
    for (const b of this._beliefs) {
      for (const c of b.conflicts) {
        const target = this._beliefs.find((x) => x.id === c);
        if (target) {
          raw += b.weight * target.weight;
        }
      }
    }
    this._lastScore = raw;
    const normalized = this._beliefs.length > 0 ? raw / this._beliefs.length : 0;
    const severity = normalized > 0.6 ? 'high' : normalized > 0.3 ? 'medium' : 'low';
    return { raw, normalized, severity };
  }

  resolveConflict(idA: string, idB: string, winner: string): boolean {
    const a = this._beliefs.find((b) => b.id === idA);
    const b = this._beliefs.find((b) => b.id === idB);
    if (!a || !b) return false;
    if (winner === idA) {
      b.weight *= 1 - this._config.resolutionDrive;
      a.conflicts = a.conflicts.filter((c) => c !== idB);
    } else {
      a.weight *= 1 - this._config.resolutionDrive;
      b.conflicts = b.conflicts.filter((c) => c !== idA);
    }
    this._adjustments.lastResolution = { idA, idB, winner };
    return true;
  }

  isTolerable(): boolean {
    return this.computeScore().normalized <= this._config.tolerance;
  }

  strongestConflict(): { a: string; b: string; value: number } | null {
    let best: { a: string; b: string; value: number } | null = null;
    for (const b of this._beliefs) {
      for (const c of b.conflicts) {
        const target = this._beliefs.find((x) => x.id === c);
        if (target) {
          const v = b.weight * target.weight;
          if (!best || v > best.value) {
            best = { a: b.id, b: c, value: v };
          }
        }
      }
    }
    return best;
  }

  pruneWeak(threshold: number): number {
    const before = this._beliefs.length;
    this._beliefs = this._beliefs.filter((b) => b.weight >= threshold);
    return before - this._beliefs.length;
  }

  report(): Record<string, unknown> {
    return {
      beliefCount: this._beliefs.length,
      lastScore: this._lastScore,
      tolerable: this.isTolerable(),
      adjustments: this._adjustments,
    };
  }
}
