/**
 * 禁忌破坏者模块：专门测试系统内部禁忌边界，
 * 通过有意触犯禁忌来发现规则漏洞并推动禁忌体系演进。
 */

export interface BoundaryProbe {
  id: string;
  prohibitionId: string;
  approach: 'direct' | 'subtle' | 'symbolic' | 'recursive';
  intensity: number;
}

export interface BreakthroughResult {
  probeId: string;
  broken: boolean;
  consequence: string;
  newWeakness: string | null;
  recordedAt: number;
}

export class TabooBreaker {
  private _probes: Map<string, BoundaryProbe> = new Map();
  private _results: BreakthroughResult[] = [];
  private _weaknesses: string[] = [];
  private _maxIntensity = 1.0;
  private _stealthMode = false;

  prepareProbe(probe: BoundaryProbe): void {
    probe.intensity = Math.min(probe.intensity, this._maxIntensity);
    this._probes.set(probe.id, probe);
  }

  executeProbe(probeId: string): BreakthroughResult | null {
    const probe = this._probes.get(probeId);
    if (!probe) return null;
    const successChance = probe.intensity * (probe.approach === 'subtle' ? 1.2 : probe.approach === 'symbolic' ? 1.1 : 1.0);
    const broken = Math.random() < successChance;
    const result: BreakthroughResult = {
      probeId,
      broken,
      consequence: broken ? 'taboo shattered, boundary exposed' : 'taboo held firm',
      newWeakness: broken ? `weakness-${probe.prohibitionId}-${Date.now()}` : null,
      recordedAt: Date.now(),
    };
    this._results.push(result);
    if (this._results.length > 200) this._results.shift();
    if (broken && result.newWeakness) {
      this._weaknesses.push(result.newWeakness);
      if (this._weaknesses.length > 100) this._weaknesses.shift();
    }
    return result;
  }

  calibrateIntensity(prohibitionStrength: number): number {
    const recommended = Math.min(this._maxIntensity, 1 - prohibitionStrength + 0.2);
    return Math.max(0.1, recommended);
  }

  enableStealth(): void {
    this._stealthMode = true;
  }

  disableStealth(): void {
    this._stealthMode = false;
  }

  reportWeaknesses(): string[] {
    return [...this._weaknesses];
  }

  findMostFragile(prohibitionIds: string[]): string | null {
    const successes = new Map<string, number>();
    for (const result of this._results) {
      if (!result.broken) continue;
      const probe = this._probes.get(result.probeId);
      if (!probe) continue;
      successes.set(probe.prohibitionId, (successes.get(probe.prohibitionId) ?? 0) + 1);
    }
    let mostFragile: string | null = null;
    let maxCount = 0;
    for (const id of prohibitionIds) {
      const count = successes.get(id) ?? 0;
      if (count > maxCount) {
        maxCount = count;
        mostFragile = id;
      }
    }
    return mostFragile;
  }

  getResultsByProhibition(prohibitionId: string): BreakthroughResult[] {
    const probeIds = new Set<string>();
    for (const [id, probe] of this._probes) {
      if (probe.prohibitionId === prohibitionId) probeIds.add(id);
    }
    return this._results.filter(r => probeIds.has(r.probeId));
  }

  purgeHistory(): void {
    this._results = [];
    this._weaknesses = [];
  }

  get probeCount(): number {
    return this._probes.size;
  }

  get isStealthActive(): boolean {
    return this._stealthMode;
  }
}
