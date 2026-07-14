/**
 * 自身免疫抑制器：防止攻击自身。
 * 监测免疫系统对自身模块的误攻击行为，及时抑制以防止自损。
 */

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

  markSelf(id: string, pattern: string): SelfMarker {
    const marker: SelfMarker = { id, pattern, markedAt: Date.now() };
    this._selfMarkers.set(id, marker);
    return marker;
  }

  detectAttack(attackId: string, targetPattern: string): boolean {
    for (const marker of this._selfMarkers.values()) {
      if (this._matchScore(marker.pattern, targetPattern) >= this._sensitivity) {
        this._activeAttacks.set(attackId, marker.id);
        return true;
      }
    }
    return false;
  }

  suppress(attackId: string): SuppressionAction | null {
    const selfId = this._activeAttacks.get(attackId);
    if (!selfId) return null;
    const action: SuppressionAction = {
      id: `sup-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      selfId,
      attackId,
      suppressed: true,
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

  setSensitivity(value: number): void {
    this._sensitivity = Math.max(0, Math.min(1, value));
  }

  isSelf(targetPattern: string): boolean {
    for (const marker of this._selfMarkers.values()) {
      if (this._matchScore(marker.pattern, targetPattern) >= this._sensitivity) return true;
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
