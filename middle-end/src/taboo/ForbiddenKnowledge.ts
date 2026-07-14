export type DangerLevel = 'mild' | 'severe' | 'forbidden' | 'abyssal';

export interface ForbiddenEntry {
  id: string;
  content: Record<string, unknown>;
  danger: DangerLevel;
  sealedAt: number;
  accessCount: number;
  entropy: number;
}

export interface AccessAttempt {
  entryId: string;
  requester: string;
  granted: boolean;
  attemptedAt: number;
  decayRisk: number;
}

export class ForbiddenKnowledge {
  private _entries: Map<string, ForbiddenEntry> = new Map();
  private _attempts: AccessAttempt[] = [];
  private _authorized: Set<string> = new Set();
  private _maxDanger: DangerLevel = 'severe';
  private _rankMap: Record<DangerLevel, number> = { mild: 1, severe: 2, forbidden: 3, abyssal: 4 };
  private _decayRate = 0.02;
  private _breachPressure = 0;

  seal(entry: ForbiddenEntry): void {
    const capped: ForbiddenEntry = { ...entry, entropy: entry.entropy ?? 0 };
    if (this._dangerRank(capped.danger) > this._dangerRank(this._maxDanger)) {
      capped.danger = this._maxDanger;
    }
    capped.accessCount = 0;
    this._entries.set(capped.id, capped);
  }

  private _dangerRank(level: DangerLevel): number {
    return this._rankMap[level];
  }

  authorize(entity: string): void {
    this._authorized.add(entity);
  }

  revoke(entity: string): boolean {
    return this._authorized.delete(entity);
  }

  private _computeDecayRisk(entry: ForbiddenEntry, requester: string): number {
    const dangerWeight = this._dangerRank(entry.danger) / 4;
    const accessWeight = Math.min(1, entry.accessCount / 50);
    const requesterEntropy = this._requesterEntropy(requester);
    return Math.min(1, dangerWeight * 0.5 + accessWeight * 0.3 + requesterEntropy * 0.2);
  }

  private _requesterEntropy(requester: string): number {
    const recent = this._attempts.filter(a => a.requester === requester).slice(-20);
    if (recent.length === 0) return 0;
    const granted = recent.filter(a => a.granted).length;
    const p = granted / recent.length;
    if (p === 0 || p === 1) return 0;
    return -p * Math.log2(p) - (1 - p) * Math.log2(1 - p);
  }

  requestAccess(entryId: string, requester: string): Record<string, unknown> | null {
    const entry = this._entries.get(entryId);
    const decayRisk = entry ? this._computeDecayRisk(entry, requester) : 0;
    const granted = !!entry
      && this._authorized.has(requester)
      && this._dangerRank(entry.danger) <= this._dangerRank(this._maxDanger)
      && decayRisk < 0.9;
    const attempt: AccessAttempt = {
      entryId,
      requester,
      granted,
      attemptedAt: Date.now(),
      decayRisk,
    };
    this._attempts.push(attempt);
    if (this._attempts.length > 300) this._attempts.shift();
    if (!granted) {
      this._breachPressure = Math.min(1, this._breachPressure + decayRisk * 0.05);
      return null;
    }
    entry!.accessCount++;
    entry!.entropy = Math.max(0, entry!.entropy - this._decayRate);
    this._breachPressure = Math.max(0, this._breachPressure - 0.02);
    return { ...entry!.content };
  }

  escalateMaxDanger(level: DangerLevel): void {
    this._maxDanger = level;
  }

  sealAllAbove(level: DangerLevel): number {
    let sealed = 0;
    for (const entry of this._entries.values()) {
      if (this._dangerRank(entry.danger) > this._dangerRank(level)) {
        entry.danger = level;
        sealed++;
      }
    }
    return sealed;
  }

  listSealedEntries(): ForbiddenEntry[] {
    return Array.from(this._entries.values());
  }

  getAttemptLog(limit: number = 50): AccessAttempt[] {
    return this._attempts.slice(-limit);
  }

  getFailedAttempts(): AccessAttempt[] {
    return this._attempts.filter(a => !a.granted);
  }

  purgeEntry(entryId: string): boolean {
    return this._entries.delete(entryId);
  }

  measureDangerDistribution(): Record<DangerLevel, number> {
    const dist: Record<DangerLevel, number> = { mild: 0, severe: 0, forbidden: 0, abyssal: 0 };
    for (const entry of this._entries.values()) dist[entry.danger]++;
    return dist;
  }

  computeBreachRisk(): number {
    const total = this._entries.size;
    if (total === 0) return 0;
    const dangerSum = Array.from(this._entries.values())
      .reduce((s, e) => s + this._dangerRank(e.danger) * (1 + e.accessCount * 0.01), 0);
    const avgDanger = dangerSum / total;
    return Math.min(1, (avgDanger / 4) * 0.6 + this._breachPressure * 0.4);
  }

  get entryCount(): number {
    return this._entries.size;
  }

  get authorizedCount(): number {
    return this._authorized.size;
  }

  get breachPressure(): number {
    return this._breachPressure;
  }
}
