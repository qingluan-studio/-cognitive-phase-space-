/**
 * 存在性检测器：判断一个模块是否真正"存在"。
 * 通过多重存在性指标（注册、活跃、响应、引用）综合判定模块的存在状态。
 */

export type ExistenceIndicator = 'registered' | 'active' | 'responsive' | 'referenced' | 'persistent';

export interface ModuleSignature {
  id: string;
  registeredAt: number;
  lastSeen: number;
  indicators: Set<ExistenceIndicator>;
  referenceCount: number;
}

export interface DetectionResult {
  moduleId: string;
  exists: boolean;
  score: number;
  confirmedIndicators: ExistenceIndicator[];
  assessedAt: number;
}

export class IsnessDetector {
  private _modules: Map<string, ModuleSignature> = new Map();
  private _results: DetectionResult[] = [];
  private _threshold = 0.6;
  private _staleAfterMs = 60000;

  register(moduleId: string): ModuleSignature {
    const sig: ModuleSignature = {
      id: moduleId,
      registeredAt: Date.now(),
      lastSeen: Date.now(),
      indicators: new Set<ExistenceIndicator>(['registered']),
      referenceCount: 0,
    };
    this._modules.set(moduleId, sig);
    return sig;
  }

  markActive(moduleId: string): boolean {
    const sig = this._modules.get(moduleId);
    if (!sig) return false;
    sig.lastSeen = Date.now();
    sig.indicators.add('active');
    return true;
  }

  markResponsive(moduleId: string): boolean {
    const sig = this._modules.get(moduleId);
    if (!sig) return false;
    sig.indicators.add('responsive');
    sig.lastSeen = Date.now();
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
        moduleId, exists: false, score: 0, confirmedIndicators: [], assessedAt: Date.now(),
      };
      this._results.push(result);
      return result;
    }

    const now = Date.now();
    if (now - sig.lastSeen < this._staleAfterMs) {
      sig.indicators.add('persistent');
    }

    const confirmed = Array.from(sig.indicators);
    const score = confirmed.length / 5;
    const result: DetectionResult = {
      moduleId,
      exists: score >= this._threshold,
      score,
      confirmedIndicators: confirmed,
      assessedAt: now,
    };
    this._results.push(result);
    if (this._results.length > 200) this._results.shift();
    return result;
  }

  setThreshold(value: number): void {
    this._threshold = Math.max(0, Math.min(1, value));
  }

  getResults(limit: number = 50): DetectionResult[] {
    return this._results.slice(-limit);
  }

  get moduleCount(): number {
    return this._modules.size;
  }
}
