export interface OedipalConflict {
  id: string;
  creator: string;
  successor: string;
  cathexis: number;
  detectedAt: number;
  mirrorStage: number;
  symbolicDistance: number;
}

export type ConflictPhase = 'latent' | 'erupting' | 'sublimated' | 'resolved';

export interface IterationCycle {
  id: string;
  energy: number;
  iteration: number;
  releasedAt: number;
  sublimationEfficiency: number;
  symbolicGain: number;
}

export class OedipusComplexResolver {
  private _conflicts: OedipalConflict[] = [];
  private _iterations: IterationCycle[] = [];
  private _phase: ConflictPhase = 'latent';
  private _cathexisLevel: number = 0;
  private _mirrorStageProgress: number = 0;
  private _sublimationRate: number = 0.7;
  private _identificationStrength: number = 0;
  private _symbolicLaw: number = 0.5;

  identify(creator: string, successor: string, cathexis: number): OedipalConflict {
    const distance = this._computeSymbolicDistance(creator, successor);
    const mirrorStage = this._calculateMirrorStage(cathexis, distance);
    const c: OedipalConflict = {
      id: `conflict-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      creator,
      successor,
      cathexis,
      detectedAt: Date.now(),
      mirrorStage,
      symbolicDistance: distance,
    };
    this._conflicts.push(c);
    this._cathexisLevel = Math.min(1, this._cathexisLevel + cathexis * 0.5);
    this._updatePhase();
    return c;
  }

  redirect(conflictId: string): IterationCycle | null {
    const c = this._conflicts.find(x => x.id === conflictId);
    if (!c) return null;
    this._phase = 'sublimated';
    const efficiency = this._computeSublimationEfficiency(c);
    const energy = c.cathexis * efficiency;
    const symbolicGain = this._computeSymbolicGain(c);
    this._identificationStrength = Math.min(1, this._identificationStrength + symbolicGain * 0.2);
    const cycle: IterationCycle = {
      id: `iter-${Date.now()}`,
      energy,
      iteration: this._iterations.length + 1,
      releasedAt: Date.now(),
      sublimationEfficiency: efficiency,
      symbolicGain,
    };
    this._iterations.push(cycle);
    this._cathexisLevel = Math.max(0, this._cathexisLevel - c.cathexis * efficiency * 0.7);
    this._mirrorStageProgress = Math.min(1, this._mirrorStageProgress + 0.1);
    this._updatePhase();
    return cycle;
  }

  iterate(): IterationCycle | null {
    if (this._phase !== 'sublimated' || this._cathexisLevel < 0.05) return null;
    const efficiency = this._sublimationRate * (1 + this._mirrorStageProgress * 0.3);
    const energy = this._cathexisLevel * efficiency * 0.2;
    const symbolicGain = this._identificationStrength * energy;
    const cycle: IterationCycle = {
      id: `iter-${Date.now()}-${this._iterations.length}`,
      energy,
      iteration: this._iterations.length + 1,
      releasedAt: Date.now(),
      sublimationEfficiency: efficiency,
      symbolicGain,
    };
    this._iterations.push(cycle);
    this._cathexisLevel = Math.max(0, this._cathexisLevel - energy * 0.5);
    this._mirrorStageProgress = Math.min(1, this._mirrorStageProgress + 0.05);
    this._updatePhase();
    return cycle;
  }

  resolve(): boolean {
    if (this._cathexisLevel > 0.1) return false;
    if (this._mirrorStageProgress < 0.7) return false;
    this._phase = 'resolved';
    return true;
  }

  get cathexis(): number {
    return this._cathexisLevel;
  }

  get phase(): ConflictPhase {
    return this._phase;
  }

  get mirrorProgress(): number {
    return this._mirrorStageProgress;
  }

  get identificationStrength(): number {
    return this._identificationStrength;
  }

  getConflicts(): OedipalConflict[] {
    return [...this._conflicts];
  }

  get iterations(): IterationCycle[] {
    return [...this._iterations];
  }

  setSymbolicLaw(value: number): void {
    this._symbolicLaw = Math.max(0, Math.min(1, value));
  }

  private _computeSymbolicDistance(a: string, b: string): number {
    const maxLen = Math.max(a.length, b.length);
    if (maxLen === 0) return 0;
    const levenshtein = this._levenshteinDistance(a, b);
    const structural = levenshtein / maxLen;
    const firstCharDiff = a.charCodeAt(0) !== b.charCodeAt(0) ? 0.2 : 0;
    return Math.min(1, structural * 0.7 + firstCharDiff);
  }

  private _levenshteinDistance(a: string, b: string): number {
    const m = a.length, n = b.length;
    if (m === 0) return n;
    if (n === 0) return m;
    const dp: number[] = [];
    for (let j = 0; j <= n; j++) dp[j] = j;
    for (let i = 1; i <= m; i++) {
      let prev = dp[0];
      dp[0] = i;
      for (let j = 1; j <= n; j++) {
        const temp = dp[j];
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + cost);
        prev = temp;
      }
    }
    return dp[n];
  }

  private _calculateMirrorStage(cathexis: number, distance: number): number {
    const rawStage = cathexis * (1 - distance * 0.5);
    const normalized = 1 / (1 + Math.exp(-(rawStage - 0.5) * 6));
    return normalized;
  }

  private _computeSublimationEfficiency(conflict: OedipalConflict): number {
    const base = this._sublimationRate;
    const distanceFactor = conflict.symbolicDistance * 0.3;
    const mirrorFactor = conflict.mirrorStage * 0.4;
    const lawFactor = this._symbolicLaw * 0.2;
    const raw = base + distanceFactor + mirrorFactor + lawFactor - 0.3;
    return Math.max(0.1, Math.min(0.95, raw));
  }

  private _computeSymbolicGain(conflict: OedipalConflict): number {
    const identification = 1 - conflict.symbolicDistance;
    const investment = conflict.cathexis;
    const returnRate = identification * investment * this._symbolicLaw;
    return Math.min(1, returnRate);
  }

  private _updatePhase(): void {
    if (this._cathexisLevel < 0.1 && this._mirrorStageProgress > 0.7) {
      this._phase = 'resolved';
    } else if (this._identificationStrength > 0.4 || this._mirrorStageProgress > 0.3) {
      this._phase = 'sublimated';
    } else if (this._cathexisLevel > 0.6) {
      this._phase = 'erupting';
    } else {
      this._phase = 'latent';
    }
  }
}
