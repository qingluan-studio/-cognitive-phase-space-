export interface MeaningAssessment {
  targetId: string; score: number; factors: Record<string, unknown>;
  assessedAt: number; entropy: number; dimensionality: number;
}

export interface ShackleRecord {
  id: string; targetId: string; constraint: string;
  released: boolean; releasedAt: number | null; severity: number;
}

export interface RadicalExperiment {
  id: string; targetId: string; description: string;
  riskLevel: number; authorized: boolean; nihilAlignment: number;
}

export interface CertificationRecord {
  targetId: string; meaningScore: number; shacklesReleased: number;
  experimentsAuthorized: number; certifiedAt: number; nihilConfidence: number;
}

export class NihilCertifier {
  private _assessments: Map<string, MeaningAssessment> = new Map();
  private _shackles: Map<string, ShackleRecord[]> = new Map();
  private _experiments: Map<string, RadicalExperiment[]> = new Map();
  private _certRecords: CertificationRecord[] = [];
  private _threshold = 0.2;
  private _idCounter = 0;
  private _weights: Map<string, number> = new Map();
  private _history: Map<string, number[]> = new Map();
  private _posIdeal: Map<string, number> = new Map();
  private _negIdeal: Map<string, number> = new Map();

  get certificationRecords(): CertificationRecord[] { return [...this._certRecords]; }
  get meaningThreshold(): number { return this._threshold; }
  get totalAssessments(): number { return this._assessments.size; }

  assessMeaning(targetId: string, factors: Record<string, unknown>): MeaningAssessment {
    const numeric = this._toNumeric(factors);
    const names = Object.keys(numeric);
    const norm = this._normalize(numeric);
    this._updateIdeals(norm);
    this._updateWeights(names, norm);
    const entropy = this._entropy(norm);
    const topsis = this._topsis(norm);
    const distance = this._nihilDistance(norm);
    const hist = this._historyBonus(targetId, topsis);
    const score = Math.max(0, Math.min(1, topsis * 0.4 + distance * 0.35 + (1 - entropy) * 0.15 + hist * 0.1));
    const assessment: MeaningAssessment = { targetId, score, factors, assessedAt: Date.now(), entropy, dimensionality: names.length };
    this._assessments.set(targetId, assessment);
    const h = this._history.get(targetId) || [];
    h.push(score);
    if (h.length > 15) h.shift();
    this._history.set(targetId, h);
    return { ...assessment, factors: { ...factors } };
  }

  registerShackle(targetId: string, constraint: string): ShackleRecord {
    const severity = this._shackleSeverity(constraint);
    const shackle: ShackleRecord = {
      id: `shackle-${++this._idCounter}-${Date.now().toString(36)}`,
      targetId, constraint, released: false, releasedAt: null, severity,
    };
    const list = this._shackles.get(targetId) || [];
    list.push(shackle);
    this._shackles.set(targetId, list);
    return { ...shackle };
  }

  releaseShackles(targetId: string): ShackleRecord[] {
    const a = this._assessments.get(targetId);
    if (!a || a.score > this._threshold) return [];
    const shackles = this._shackles.get(targetId) || [];
    const depth = 1 - a.score;
    for (const s of shackles) {
      if (!s.released) {
        const p = depth * (1 - s.severity * 0.3);
        if (Math.random() < p || s.severity < 0.3) { s.released = true; s.releasedAt = Date.now(); }
      }
    }
    return shackles.map(s => ({ ...s }));
  }

  authorizeRadicalExperiment(targetId: string, description: string, riskLevel: number): RadicalExperiment {
    const a = this._assessments.get(targetId);
    if (!a || a.score > this._threshold) throw new Error(`Target ${targetId} not certified as nihil`);
    if (riskLevel < 0 || riskLevel > 1) throw new Error('Risk level must be between 0 and 1');
    const alignment = this._nihilAlignment(a, riskLevel);
    const exp: RadicalExperiment = {
      id: `exp-${++this._idCounter}-${Date.now().toString(36)}`,
      targetId, description, riskLevel, authorized: true, nihilAlignment: alignment,
    };
    const list = this._experiments.get(targetId) || [];
    list.push(exp);
    this._experiments.set(targetId, list);
    return { ...exp };
  }

  certify(targetId: string): CertificationRecord {
    const a = this._assessments.get(targetId);
    if (!a) throw new Error(`No assessment for target: ${targetId}`);
    const shackles = this.releaseShackles(targetId);
    const h = this._history.get(targetId) || [];
    const confidence = this._nihilConfidence(h, a);
    const record: CertificationRecord = {
      targetId, meaningScore: a.score,
      shacklesReleased: shackles.filter(s => s.released).length,
      experimentsAuthorized: (this._experiments.get(targetId) || []).length,
      certifiedAt: Date.now(), nihilConfidence: confidence,
    };
    this._certRecords.push(record);
    return { ...record };
  }

  setMeaningThreshold(threshold: number): void {
    if (threshold < 0 || threshold > 1) throw new Error('Threshold must be between 0 and 1');
    this._threshold = threshold;
  }

  getAssessment(targetId: string): MeaningAssessment | undefined {
    const a = this._assessments.get(targetId);
    return a ? { ...a, factors: { ...a.factors } } : undefined;
  }

  getShackles(targetId: string): ShackleRecord[] {
    return (this._shackles.get(targetId) || []).map(s => ({ ...s }));
  }

  getExperiments(targetId: string): RadicalExperiment[] {
    return (this._experiments.get(targetId) || []).map(e => ({ ...e }));
  }

  isCertifiedNihil(targetId: string): boolean {
    const a = this._assessments.get(targetId);
    return !!a && a.score <= this._threshold;
  }

  getFactorWeights(): Record<string, number> {
    const r: Record<string, number> = {};
    for (const [k, v] of this._weights) r[k] = v;
    return r;
  }

  private _toNumeric(factors: Record<string, unknown>): Record<string, number> {
    const r: Record<string, number> = {};
    for (const [k, v] of Object.entries(factors)) {
      if (typeof v === 'number') r[k] = v;
      else if (typeof v === 'boolean') r[k] = v ? 1 : 0;
      else if (typeof v === 'string') r[k] = this._hashNorm(v);
    }
    return r;
  }

  private _hashNorm(str: string): number {
    let h = 0;
    for (let i = 0; i < str.length; i++) { h = ((h << 5) - h) + str.charCodeAt(i); h |= 0; }
    return (Math.sin(h) + 1) / 2;
  }

  private _normalize(factors: Record<string, number>): Record<string, number> {
    const r: Record<string, number> = {};
    const vals = Object.values(factors);
    const min = Math.min(...vals, 0), max = Math.max(...vals, 1), range = max - min || 1;
    for (const [k, v] of Object.entries(factors)) r[k] = (v - min) / range;
    return r;
  }

  private _updateIdeals(norm: Record<string, number>): void {
    for (const [k, v] of Object.entries(norm)) {
      this._posIdeal.set(k, Math.max(this._posIdeal.get(k) ?? -Infinity, v));
      this._negIdeal.set(k, Math.min(this._negIdeal.get(k) ?? Infinity, v));
    }
  }

  private _updateWeights(names: string[], norm: Record<string, number>): void {
    for (const name of names) {
      const w = this._weights.get(name) || 0.5;
      const v = norm[name];
      const ent = v > 0 && v < 1 ? -v * Math.log(v) - (1 - v) * Math.log(1 - v) : 0;
      this._weights.set(name, w * 0.9 + ent * 0.1);
    }
    this._normWeights();
  }

  private _normWeights(): void {
    const vals = [...this._weights.values()];
    const sum = vals.reduce((a, b) => a + b, 0);
    if (sum > 0) for (const [k] of this._weights) this._weights.set(k, this._weights.get(k)! / sum);
  }

  private _entropy(norm: Record<string, number>): number {
    const vals = Object.values(norm);
    if (vals.length === 0) return 0;
    const n = vals.length;
    let e = 0;
    for (const v of vals) if (v > 0 && v < 1) e += -v * Math.log(v) / Math.log(n);
    return Math.min(1, e / n);
  }

  private _topsis(norm: Record<string, number>): number {
    let dPlus = 0, dMinus = 0;
    const keys = Object.keys(norm);
    for (const k of keys) {
      const w = this._weights.get(k) || 1 / keys.length;
      const pos = this._posIdeal.get(k) ?? norm[k], neg = this._negIdeal.get(k) ?? norm[k];
      dPlus += w * Math.pow(norm[k] - pos, 2);
      dMinus += w * Math.pow(norm[k] - neg, 2);
    }
    const d = Math.sqrt(dPlus) + Math.sqrt(dMinus);
    return d > 0 ? Math.sqrt(dMinus) / d : 0.5;
  }

  private _nihilDistance(norm: Record<string, number>): number {
    const vals = Object.values(norm);
    if (vals.length === 0) return 0;
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const variance = vals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / vals.length;
    const std = Math.sqrt(variance);
    return Math.max(0, Math.min(1, Math.abs(mean) * 0.7 + (1 - Math.min(1, std * 2)) * 0.3));
  }

  private _historyBonus(targetId: string, score: number): number {
    const h = this._history.get(targetId) || [];
    if (h.length < 2) return score;
    const recent = h.slice(-5);
    const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const stability = 1 - Math.min(1, Math.abs(score - avg) * 3);
    return avg * stability + score * (1 - stability);
  }

  private _shackleSeverity(constraint: string): number {
    const lower = constraint.toLowerCase();
    let s = 0.3;
    const kws = ['critical', 'fatal', 'must', 'required', 'essential', 'core', 'fundamental'];
    for (const kw of kws) if (lower.includes(kw)) s += 0.1;
    return Math.max(0.1, Math.min(0.95, s + Math.min(0.3, constraint.length / 200)));
  }

  private _nihilAlignment(a: MeaningAssessment, risk: number): number {
    const nd = 1 - a.score;
    return Math.max(0, Math.min(1, nd * 0.5 + (1 - Math.abs(nd - risk)) * 0.3 + a.entropy * 0.2));
  }

  private _nihilConfidence(history: number[], current: MeaningAssessment): number {
    if (history.length < 2) return 0.5;
    const mean = history.reduce((a, b) => a + b, 0) / history.length;
    const variance = history.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / history.length;
    const stability = 1 - Math.min(1, Math.sqrt(variance) * 5);
    return Math.min(0.98, stability * 0.7 + (current.dimensionality > 3 ? 0.2 : 0) + 0.1);
  }
}
