export interface BugSignature {
  id: string;
  pattern: string;
  stack: string;
  severity: number;
  hash: string;
}

export interface Scar {
  id: string;
  signature: BugSignature;
  immunizedAt: number;
  killCount: number;
  potency: number;
  mutationCount: number;
}

export interface ImmunityReport {
  totalScars: number;
  totalKills: number;
  immunePatterns: string[];
  avgPotency: number;
  adaptationRate: number;
}

export class ScarDebugger {
  private _scars: Map<string, Scar> = new Map();
  private _detected: BugSignature[] = [];
  private _killCount: number = 0;
  private _similarityThreshold: number = 0.7;
  private _potencyDecay: number = 0.98;
  private _adaptationRate: number = 0;
  private _lastKillTime: number = 0;
  private _killIntervals: number[] = [];

  get detectedCount(): number { return this._detected.length; }
  get scarCount(): number { return this._scars.size; }
  get totalKills(): number { return this._killCount; }
  get similarityThreshold(): number { return this._similarityThreshold; }
  get adaptationRate(): number { return this._adaptationRate; }

  identify(signature: BugSignature): boolean {
    const hash = this._hashSignature(signature);
    const sig = { ...signature, hash };
    this._detected.push(sig);
    return this._matchesScar(sig);
  }

  solidify(signature: BugSignature): Scar {
    const hash = this._hashSignature(signature);
    const sig = { ...signature, hash };
    const scar: Scar = {
      id: `scar-${sig.id}`, signature: sig, immunizedAt: Date.now(),
      killCount: 0, potency: 1.0, mutationCount: 0,
    };
    this._scars.set(scar.id, scar);
    return scar;
  }

  immunize(input: { pattern: string; stack: string }): { killed: boolean; scarId: string | null } {
    const inputHash = this._hashString(input.pattern + input.stack);
    let bestMatch: Scar | null = null;
    let bestScore = 0;
    for (const scar of this._scars.values()) {
      const patSim = this._levenshteinSim(scar.signature.pattern, input.pattern);
      const stkSim = this._jaccardSim(scar.signature.stack, input.stack);
      const score = (patSim * 0.6 + stkSim * 0.4) * scar.potency;
      if (score > this._similarityThreshold && score > bestScore) {
        bestScore = score; bestMatch = scar;
      }
      if (scar.signature.hash === inputHash) { bestScore = 1; bestMatch = scar; break; }
    }
    if (bestMatch) {
      bestMatch.killCount++;
      bestMatch.potency = Math.min(1, bestMatch.potency + 0.02);
      this._killCount++;
      this._updateAdaptation();
      this._mutateScarIfNeeded(bestMatch, input);
      return { killed: true, scarId: bestMatch.id };
    }
    return { killed: false, scarId: null };
  }

  detectSimilar(input: { pattern: string; stack: string }): Scar | null {
    let bestMatch: Scar | null = null;
    let bestScore = 0;
    for (const scar of this._scars.values()) {
      const score = this._overallSim(scar.signature, input);
      if (score > bestScore) { bestScore = score; bestMatch = scar; }
    }
    return bestScore > this._similarityThreshold ? bestMatch : null;
  }

  getImmunity(): ImmunityReport {
    const scars = [...this._scars.values()];
    const avgPotency = scars.length > 0
      ? scars.reduce((s, sc) => s + sc.potency, 0) / scars.length : 0;
    return {
      totalScars: this._scars.size, totalKills: this._killCount,
      immunePatterns: scars.map(s => s.signature.pattern),
      avgPotency, adaptationRate: this._adaptationRate,
    };
  }

  getScars(): Scar[] { return [...this._scars.values()]; }
  setSimilarityThreshold(t: number): void {
    this._similarityThreshold = Math.max(0, Math.min(1, t));
  }
  setPotencyDecay(d: number): void {
    this._potencyDecay = Math.max(0.9, Math.min(1, d));
  }
  decayPotency(): void {
    for (const scar of this._scars.values()) scar.potency *= this._potencyDecay;
  }

  private _matchesScar(signature: BugSignature): boolean {
    for (const scar of this._scars.values()) {
      if (scar.signature.hash === signature.hash) return true;
      if (this._overallSim(scar.signature, signature) > this._similarityThreshold) return true;
    }
    return false;
  }

  private _overallSim(a: BugSignature, b: { pattern: string; stack: string }): number {
    return this._levenshteinSim(a.pattern, b.pattern) * 0.6
      + this._jaccardSim(a.stack, b.stack) * 0.4;
  }

  private _levenshteinSim(a: string, b: string): number {
    if (a === b) return 1;
    if (a.length === 0 || b.length === 0) return 0;
    const m: number[][] = [];
    for (let i = 0; i <= b.length; i++) m[i] = [i];
    for (let j = 0; j <= a.length; j++) m[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) m[i][j] = m[i - 1][j - 1];
        else m[i][j] = Math.min(m[i - 1][j - 1] + 1, m[i][j - 1] + 1, m[i - 1][j] + 1);
      }
    }
    return 1 - m[b.length][a.length] / Math.max(a.length, b.length);
  }

  private _jaccardSim(a: string, b: string): number {
    const sa = new Set(a.split(/\s+/).filter(s => s.length > 0));
    const sb = new Set(b.split(/\s+/).filter(s => s.length > 0));
    if (sa.size === 0 && sb.size === 0) return 1;
    let inter = 0;
    for (const item of sa) if (sb.has(item)) inter++;
    const union = sa.size + sb.size - inter;
    return union === 0 ? 0 : inter / union;
  }

  private _hashSignature(sig: BugSignature): string {
    return this._hashString(sig.pattern + sig.stack);
  }

  private _hashString(s: string): string {
    let hash = 0;
    for (let i = 0; i < s.length; i++) {
      hash = ((hash << 5) - hash) + s.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  private _updateAdaptation(): void {
    const now = Date.now();
    if (this._lastKillTime > 0) {
      this._killIntervals.push(now - this._lastKillTime);
      if (this._killIntervals.length > 10) this._killIntervals.shift();
      if (this._killIntervals.length >= 3) {
        const avg = this._killIntervals.reduce((s, v) => s + v, 0) / this._killIntervals.length;
        this._adaptationRate = Math.min(1, 10000 / Math.max(avg, 1000));
      }
    }
    this._lastKillTime = now;
  }

  private _mutateScarIfNeeded(scar: Scar, input: { pattern: string; stack: string }): void {
    const sim = this._overallSim(scar.signature, input);
    if (sim < 0.9 && sim > this._similarityThreshold) {
      const longer = scar.signature.pattern.length >= input.pattern.length
        ? scar.signature.pattern : input.pattern;
      const shorter = scar.signature.pattern.length >= input.pattern.length
        ? input.pattern : scar.signature.pattern;
      if (!longer.includes(shorter)) {
        let maxOverlap = 0;
        for (let i = 1; i <= Math.min(shorter.length, longer.length); i++) {
          if (shorter.slice(-i) === longer.slice(0, i)) maxOverlap = i;
        }
        scar.signature.pattern = shorter + longer.slice(maxOverlap);
      }
      scar.signature.hash = this._hashSignature(scar.signature);
      scar.mutationCount++;
    }
  }
}
