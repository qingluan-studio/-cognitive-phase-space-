/**
 * 耐受诱导器：诱导对良性刺激的耐受。
 * 对被识别为良性的刺激逐步诱导耐受，使免疫系统不再对其产生攻击反应。
 */

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
  private _inductions: ToleranceInduction[] = [];
  private _stepSize = 0.1;
  private _maxLevel = 1.0;

  registerStimulus(stimulus: string): TolerantEntry {
    const existing = Array.from(this._entries.values()).find(e => e.stimulus === stimulus);
    if (existing) return existing;
    const entry: TolerantEntry = {
      id: `tol-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      stimulus,
      toleranceLevel: 0,
      inducedAt: Date.now(),
      verified: false,
    };
    this._entries.set(entry.id, entry);
    return entry;
  }

  induce(entryId: string): ToleranceInduction | null {
    const entry = this._entries.get(entryId);
    if (!entry) return null;
    const previousLevel = entry.toleranceLevel;
    entry.toleranceLevel = Math.min(this._maxLevel, entry.toleranceLevel + this._stepSize);
    if (entry.toleranceLevel >= this._maxLevel) entry.verified = true;
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

  isTolerant(stimulus: string): boolean {
    const entry = Array.from(this._entries.values()).find(e => e.stimulus === stimulus);
    return entry ? entry.verified : false;
  }

  breakTolerance(entryId: string): TolerantEntry | null {
    const entry = this._entries.get(entryId);
    if (!entry) return null;
    entry.toleranceLevel = 0;
    entry.verified = false;
    return entry;
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
