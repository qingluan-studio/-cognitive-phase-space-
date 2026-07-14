export interface TolerantEntry {
  id: string;
  stimulus: string;
  toleranceLevel: number;
  inducedAt: number;
  verified: boolean;
}

export interface ToleranceInduction {
  entryId: string;
  previousLevel: number;
  newLevel: number;
  inducedAt: number;
}

export class ToleranceInducer {
  private _entries: Map<string, TolerantEntry> = new Map();
  private _stimulusIndex: Map<string, string> = new Map();
  private _inductions: ToleranceInduction[] = [];
  private _stepSize = 0.1;
  private _maxLevel = 1.0;
  private _exposureHistory: Map<string, number[]> = new Map();
  private _windowSize = 5;

  registerStimulus(stimulus: string): TolerantEntry {
    const existingId = this._stimulusIndex.get(stimulus);
    if (existingId) {
      return this._entries.get(existingId)!;
    }
    const entry: TolerantEntry = {
      id: `tol-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      stimulus,
      toleranceLevel: 0,
      inducedAt: Date.now(),
      verified: false,
    };
    this._entries.set(entry.id, entry);
    this._stimulusIndex.set(stimulus, entry.id);
    this._exposureHistory.set(entry.id, []);
    return entry;
  }

  induce(entryId: string): ToleranceInduction | null {
    const entry = this._entries.get(entryId);
    if (!entry) return null;
    const previousLevel = entry.toleranceLevel;
    const adaptiveStep = this._computeAdaptiveStep(entryId);
    entry.toleranceLevel = Math.min(this._maxLevel, entry.toleranceLevel + adaptiveStep);
    if (entry.toleranceLevel >= this._maxLevel) entry.verified = true;
    this._recordExposure(entryId, entry.toleranceLevel);
    const induction: ToleranceInduction = {
      entryId,
      previousLevel,
      newLevel: entry.toleranceLevel,
      inducedAt: Date.now(),
    };
    this._inductions.push(induction);
    if (this._inductions.length > 200) this._inductions.shift();
    return induction;
  }

  private _computeAdaptiveStep(entryId: string): number {
    const history = this._exposureHistory.get(entryId) ?? [];
    if (history.length < 2) return this._stepSize;
    const recent = history.slice(-this._windowSize);
    const trend = recent[recent.length - 1] - recent[0];
    const trendFactor = 1 + Math.max(-0.5, Math.min(0.5, trend));
    return this._stepSize * trendFactor;
  }

  private _recordExposure(entryId: string, level: number): void {
    const history = this._exposureHistory.get(entryId) ?? [];
    history.push(level);
    if (history.length > this._windowSize * 2) history.shift();
    this._exposureHistory.set(entryId, history);
  }

  isTolerant(stimulus: string): boolean {
    const entryId = this._stimulusIndex.get(stimulus);
    if (!entryId) return false;
    const entry = this._entries.get(entryId);
    return entry ? entry.verified : false;
  }

  breakTolerance(entryId: string): TolerantEntry | null {
    const entry = this._entries.get(entryId);
    if (!entry) return null;
    entry.toleranceLevel = 0;
    entry.verified = false;
    this._exposureHistory.set(entryId, []);
    return entry;
  }

  computeToleranceGradient(entryId: string): number {
    const history = this._exposureHistory.get(entryId) ?? [];
    if (history.length < 2) return 0;
    const recent = history.slice(-this._windowSize);
    const sum = recent.reduce((s, v) => s + v, 0);
    return sum / recent.length;
  }

  computeToleranceCoverage(): number {
    if (this._entries.size === 0) return 0;
    const verified = Array.from(this._entries.values()).filter(e => e.verified);
    return verified.length / this._entries.size;
  }

  identifyStableTolerances(): TolerantEntry[] {
    return Array.from(this._entries.values())
      .filter(e => e.verified && this.computeToleranceGradient(e.id) > 0.8);
  }

  setStepSize(value: number): void {
    this._stepSize = Math.max(0, Math.min(1, value));
  }

  getEntry(id: string): TolerantEntry | null {
    return this._entries.get(id) ?? null;
  }

  getInductions(limit: number = 50): ToleranceInduction[] {
    return this._inductions.slice(-limit);
  }

  get entryCount(): number {
    return this._entries.size;
  }
}
