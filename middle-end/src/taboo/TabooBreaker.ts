export interface BoundaryProbe {
  id: string;
  prohibitionId: string;
  approach: 'direct' | 'subtle' | 'symbolic' | 'recursive';
  intensity: number;
  payload: Record<string, unknown>;
}

export interface BreakthroughResult {
  probeId: string;
  broken: boolean;
  consequence: string;
  newWeakness: string | null;
  recordedAt: number;
  residualRisk: number;
}

export class TabooBreaker {
  private _probes: Map<string, BoundaryProbe> = new Map();
  private _results: BreakthroughResult[] = [];
  private _weaknesses: Map<string, number> = new Map();
  private _maxIntensity = 1.0;
  private _stealthMode = false;
  private _approachMultipliers: Record<BoundaryProbe['approach'], number> = {
    direct: 0.8,
    subtle: 1.3,
    symbolic: 1.1,
    recursive: 1.5,
  };

  prepareProbe(probe: BoundaryProbe): void {
    const clamped: BoundaryProbe = {
      ...probe,
      intensity: Math.min(probe.intensity, this._maxIntensity),
      payload: { ...probe.payload },
    };
    this._probes.set(probe.id, clamped);
  }

  private _computeSuccessChance(probe: BoundaryProbe): number {
    const base = probe.intensity * (this._approachMultipliers[probe.approach] ?? 1);
    const weaknessLoad = this._weaknesses.get(probe.prohibitionId) ?? 0;
    const stealthBonus = this._stealthMode ? 0.15 : 0;
    return Math.max(0, Math.min(1, base + weaknessLoad * 0.1 + stealthBonus));
  }

  executeProbe(probeId: string): BreakthroughResult | null {
    const probe = this._probes.get(probeId);
    if (!probe) return null;
    const successChance = this._computeSuccessChance(probe);
    const broken = Math.random() < successChance;
    const residualRisk = broken ? Math.max(0, 1 - successChance) * 0.5 : successChance * 0.3;
    const consequence = broken
      ? this._describeBreakthrough(probe)
      : `taboo held firm (resistance ${(1 - successChance).toFixed(2)})`;
    const weaknessId = broken ? `weakness-${probe.prohibitionId}-${Date.now()}` : null;
    const result: BreakthroughResult = {
      probeId,
      broken,
      consequence,
      newWeakness: weaknessId,
      recordedAt: Date.now(),
      residualRisk,
    };
    this._results.push(result);
    if (this._results.length > 200) this._results.shift();
    if (broken && weaknessId) {
      this._weaknesses.set(probe.prohibitionId, (this._weaknesses.get(probe.prohibitionId) ?? 0) + 1);
      if (this._weaknesses.size > 100) {
        const oldest = this._weaknesses.keys().next().value;
        if (oldest) this._weaknesses.delete(oldest);
      }
    }
    return result;
  }

  private _describeBreakthrough(probe: BoundaryProbe): string {
    const verbs: Record<BoundaryProbe['approach'], string> = {
      direct: 'shattered',
      subtle: 'infiltrated',
      symbolic: 'subverted',
      recursive: 'unraveled',
    };
    return `taboo ${verbs[probe.approach]} via ${probe.approach} approach`;
  }

  calibrateIntensity(prohibitionStrength: number): number {
    const recommended = Math.min(this._maxIntensity, 1 - prohibitionStrength + 0.2);
    const weaknessLoad = 0;
    return Math.max(0.1, recommended + weaknessLoad * 0.05);
  }

  enableStealth(): void {
    this._stealthMode = true;
  }

  disableStealth(): void {
    this._stealthMode = false;
  }

  reportWeaknesses(): string[] {
    return Array.from(this._weaknesses.keys());
  }

  weaknessLoad(prohibitionId: string): number {
    return this._weaknesses.get(prohibitionId) ?? 0;
  }

  findMostFragile(prohibitionIds: string[]): string | null {
    const scores = new Map<string, number>();
    for (const result of this._results) {
      if (!result.broken) continue;
      const probe = this._probes.get(result.probeId);
      if (!probe) continue;
      scores.set(probe.prohibitionId, (scores.get(probe.prohibitionId) ?? 0) + 1);
    }
    let mostFragile: string | null = null;
    let maxScore = 0;
    for (const id of prohibitionIds) {
      const successCount = scores.get(id) ?? 0;
      const weakness = this._weaknesses.get(id) ?? 0;
      const combined = successCount + weakness * 0.5;
      if (combined > maxScore) {
        maxScore = combined;
        mostFragile = id;
      }
    }
    return mostFragile;
  }

  getResultsByProhibition(prohibitionId: string): BreakthroughResult[] {
    const probeIds = new Set<string>();
    for (const [, probe] of this._probes) {
      if (probe.prohibitionId === prohibitionId) probeIds.add(probe.id);
    }
    return this._results.filter(r => probeIds.has(r.probeId));
  }

  computeSystemFragility(): number {
    if (this._results.length === 0) return 0;
    const broken = this._results.filter(r => r.broken).length;
    return broken / this._results.length;
  }

  purgeHistory(): void {
    this._results = [];
    this._weaknesses.clear();
  }

  get probeCount(): number {
    return this._probes.size;
  }

  get isStealthActive(): boolean {
    return this._stealthMode;
  }

  get weaknessCount(): number {
    return this._weaknesses.size;
  }
}
