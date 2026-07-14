export type ExistenceIndicator = 'registered' | 'active' | 'responsive' | 'referenced' | 'persistent';

export interface ModuleSignature {
  id: string;
  registeredAt: number;
  lastSeen: number;
  indicators: Set<ExistenceIndicator>;
  referenceCount: number;
  responsivenessLatency: number;
  activityFrequency: number;
}

export interface DetectionResult {
  moduleId: string;
  exists: boolean;
  score: number;
  confirmedIndicators: ExistenceIndicator[];
  assessedAt: number;
  confidence: number;
}

const INDICATOR_WEIGHTS: Record<ExistenceIndicator, number> = {
  registered: 0.2, active: 0.25, responsive: 0.25, referenced: 0.15, persistent: 0.15,
};

export class IsnessDetector {
  private _modules: Map<string, ModuleSignature> = new Map();
  private _results: DetectionResult[] = [];
  private _threshold = 0.6;
  private _staleAfterMs = 60_000;
  private _activityWindow: Map<string, number[]> = new Map();

  register(moduleId: string): ModuleSignature {
    const sig: ModuleSignature = {
      id: moduleId,
      registeredAt: Date.now(),
      lastSeen: Date.now(),
      indicators: new Set<ExistenceIndicator>(['registered']),
      referenceCount: 0,
      responsivenessLatency: 0,
      activityFrequency: 0,
    };
    this._modules.set(moduleId, sig);
    this._activityWindow.set(moduleId, [Date.now()]);
    return sig;
  }

  markActive(moduleId: string): boolean {
    const sig = this._modules.get(moduleId);
    if (!sig) return false;
    sig.lastSeen = Date.now();
    sig.indicators.add('active');
    const window = this._activityWindow.get(moduleId) ?? [];
    window.push(Date.now());
    if (window.length > 32) window.shift();
    this._activityWindow.set(moduleId, window);
    sig.activityFrequency = this._computeFrequency(window);
    return true;
  }

  markResponsive(moduleId: string, latencyMs: number = 0): boolean {
    const sig = this._modules.get(moduleId);
    if (!sig) return false;
    sig.indicators.add('responsive');
    sig.lastSeen = Date.now();
    sig.responsivenessLatency = latencyMs;
    return true;
  }

  addReference(moduleId: string): boolean {
    const sig = this._modules.get(moduleId);
    if (!sig) return false;
    sig.referenceCount++;
    if (sig.referenceCount >= 1) sig.indicators.add('referenced');
    return true;
  }

  detect(moduleId: string): DetectionResult {
    const sig = this._modules.get(moduleId);
    if (!sig) {
      const result: DetectionResult = {
        moduleId, exists: false, score: 0, confirmedIndicators: [],
        assessedAt: Date.now(), confidence: 0,
      };
      this._results.push(result);
      if (this._results.length > 200) this._results.shift();
      return result;
    }

    const now = Date.now();
    const ageMs = now - sig.lastSeen;
    if (ageMs < this._staleAfterMs) {
      sig.indicators.add('persistent');
    } else {
      sig.indicators.delete('persistent');
      if (ageMs > this._staleAfterMs * 4) sig.indicators.delete('active');
    }

    const confirmed = Array.from(sig.indicators);
    const score = this._weightedScore(confirmed);
    const temporalConfidence = Math.exp(-ageMs / this._staleAfterMs);
    const confidence = score * temporalConfidence;
    const result: DetectionResult = {
      moduleId,
      exists: score >= this._threshold,
      score,
      confirmedIndicators: confirmed,
      assessedAt: now,
      confidence,
    };
    this._results.push(result);
    if (this._results.length > 200) this._results.shift();
    return result;
  }

  detectAll(): DetectionResult[] {
    const results: DetectionResult[] = [];
    for (const id of this._modules.keys()) {
      results.push(this.detect(id));
    }
    return results;
  }

  setThreshold(value: number): void {
    this._threshold = Math.max(0, Math.min(1, value));
  }

  getResults(limit: number = 50): DetectionResult[] {
    return this._results.slice(-limit);
  }

  get moduleCount(): number { return this._modules.size; }
  get activeCount(): number {
    let count = 0;
    for (const sig of this._modules.values()) {
      if (sig.indicators.has('active')) count++;
    }
    return count;
  }

  private _weightedScore(indicators: ExistenceIndicator[]): number {
    let score = 0;
    for (const ind of indicators) score += INDICATOR_WEIGHTS[ind];
    return Math.min(1, score);
  }

  private _computeFrequency(window: number[]): number {
    if (window.length < 2) return 0;
    const span = Math.max(1, window[window.length - 1] - window[0]);
    return window.length / (span / 1000);
  }
}
