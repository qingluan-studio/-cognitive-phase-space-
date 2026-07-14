export interface SelfMarker {
  id: string;
  pattern: string;
  markedAt: number;
}

export interface SuppressionAction {
  id: string;
  selfId: string;
  attackId: string;
  suppressed: boolean;
  suppressedAt: number;
}

export class AutoimmuneSuppressor {
  private _selfMarkers: Map<string, SelfMarker> = new Map();
  private _suppressions: SuppressionAction[] = [];
  private _activeAttacks: Map<string, string> = new Map();
  private _sensitivity = 0.6;
  private _regulatoryTCells: Map<string, number> = new Map();
  private _falsePositiveCount = 0;
  private _truePositiveCount = 0;
  private _markerIndex: Map<string, Set<string>> = new Map();
  private _ngramSize = 3;

  markSelf(id: string, pattern: string): SelfMarker {
    const marker: SelfMarker = { id, pattern, markedAt: Date.now() };
    this._selfMarkers.set(id, marker);
    this._indexMarker(id, pattern);
    this._regulatoryTCells.set(id, 1.0);
    return marker;
  }

  private _indexMarker(id: string, pattern: string): void {
    for (let i = 0; i <= pattern.length - this._ngramSize; i++) {
      const ngram = pattern.slice(i, i + this._ngramSize);
      if (!this._markerIndex.has(ngram)) {
        this._markerIndex.set(ngram, new Set());
      }
      this._markerIndex.get(ngram)!.add(id);
    }
  }

  detectAttack(attackId: string, targetPattern: string): boolean {
    const candidates = this._candidateMarkers(targetPattern);
    for (const markerId of candidates) {
      const marker = this._selfMarkers.get(markerId);
      if (!marker) continue;
      if (this._matchScore(marker.pattern, targetPattern) >= this._sensitivity) {
        this._activeAttacks.set(attackId, marker.id);
        this._truePositiveCount++;
        return true;
      }
    }
    if (this._selfMarkers.size > 0) {
      this._falsePositiveCount++;
    }
    return false;
  }

  private _candidateMarkers(pattern: string): Set<string> {
    const candidates = new Set<string>();
    for (let i = 0; i <= pattern.length - this._ngramSize; i++) {
      const ngram = pattern.slice(i, i + this._ngramSize);
      const markers = this._markerIndex.get(ngram);
      if (markers) {
        for (const m of markers) candidates.add(m);
      }
    }
    return candidates.size > 0 ? candidates : new Set(this._selfMarkers.keys());
  }

  suppress(attackId: string): SuppressionAction | null {
    const selfId = this._activeAttacks.get(attackId);
    if (!selfId) return null;
    const tregLevel = this._regulatoryTCells.get(selfId) ?? 1.0;
    const suppressionStrength = Math.min(1, tregLevel);
    this._regulatoryTCells.set(selfId, Math.max(0.3, tregLevel * 0.9));
    const action: SuppressionAction = {
      id: `sup-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      selfId,
      attackId,
      suppressed: suppressionStrength > 0.5,
      suppressedAt: Date.now(),
    };
    this._suppressions.push(action);
    if (this._suppressions.length > 200) this._suppressions.shift();
    this._activeAttacks.delete(attackId);
    return action;
  }

  private _matchScore(a: string, b: string): number {
    const setA = new Set(a);
    const setB = new Set(b);
    let common = 0;
    for (const ch of setA) if (setB.has(ch)) common++;
    return common / Math.max(setA.size, setB.size);
  }

  computeSpecificity(): number {
    const total = this._truePositiveCount + this._falsePositiveCount;
    return total === 0 ? 1 : this._truePositiveCount / total;
  }

  computeTregBalance(): { mean: number; min: number; max: number } {
    if (this._regulatoryTCells.size === 0) return { mean: 0, min: 0, max: 0 };
    const levels = Array.from(this._regulatoryTCells.values());
    const mean = levels.reduce((s, v) => s + v, 0) / levels.length;
    return { mean, min: Math.min(...levels), max: Math.max(...levels) };
  }

  boostRegulatoryT(selfId: string, amount: number): void {
    const current = this._regulatoryTCells.get(selfId) ?? 1.0;
    this._regulatoryTCells.set(selfId, Math.min(2, current + amount));
  }

  setSensitivity(value: number): void {
    this._sensitivity = Math.max(0, Math.min(1, value));
  }

  isSelf(targetPattern: string): boolean {
    const candidates = this._candidateMarkers(targetPattern);
    for (const markerId of candidates) {
      const marker = this._selfMarkers.get(markerId);
      if (marker && this._matchScore(marker.pattern, targetPattern) >= this._sensitivity) return true;
    }
    return false;
  }

  getSelfMarker(id: string): SelfMarker | null {
    return this._selfMarkers.get(id) ?? null;
  }

  getSuppressions(limit: number = 50): SuppressionAction[] {
    return this._suppressions.slice(-limit);
  }

  get selfMarkerCount(): number {
    return this._selfMarkers.size;
  }
}
