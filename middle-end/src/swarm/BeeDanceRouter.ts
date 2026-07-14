/**
 * 蜜蜂舞蹈路由模块：模仿蜜蜂8字舞编码食物源位置与距离，
 * 通过舞蹈模式传递路由信息，实现去中心化的路径发现。
 */

export type DanceType = 'waggle' | 'round' | 'sickle';

export interface DanceMessage {
  id: string;
  dancer: string;
  danceType: DanceType;
  targetNode: string;
  distance: number;
  angle: number;
  duration: number;
  performedAt: number;
}

export interface RoutingDecision {
  destination: string;
  selectedRoute: string;
  confidence: number;
  decidedAt: number;
}

export class BeeDanceRouter {
  private _dances: DanceMessage[] = [];
  private _decisions: RoutingDecision[] = [];
  private _audience: Map<string, string[]> = new Map();
  private _distanceScale = 10;
  private _minConfidence = 0.5;

  performDance(msg: DanceMessage): void {
    this._dances.push(msg);
    if (this._dances.length > 300) this._dances.shift();
  }

  encodeDance(dancer: string, target: string, distance: number, angle: number): DanceMessage {
    const danceType: DanceType = distance < this._distanceScale ? 'round' : distance < this._distanceScale * 3 ? 'sickle' : 'waggle';
    const duration = Math.floor(distance * 10);
    const msg: DanceMessage = {
      id: `dance-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      dancer,
      danceType,
      targetNode: target,
      distance,
      angle,
      duration,
      performedAt: Date.now(),
    };
    this.performDance(msg);
    return msg;
  }

  watchDance(watcherId: string, danceId: string): boolean {
    const dance = this._dances.find(d => d.id === danceId);
    if (!dance) return false;
    const audience = this._audience.get(danceId) ?? [];
    if (!audience.includes(watcherId)) audience.push(watcherId);
    this._audience.set(danceId, audience);
    return true;
  }

  decodeDance(dance: DanceMessage): { target: string; distance: number; angle: number } {
    return {
      target: dance.targetNode,
      distance: dance.distance,
      angle: dance.angle,
    };
  }

  decideRoute(destination: string): RoutingDecision {
    const candidates = this._dances.filter(d => d.targetNode === destination);
    if (candidates.length === 0) {
      const empty: RoutingDecision = {
        destination,
        selectedRoute: 'unknown',
        confidence: 0,
        decidedAt: Date.now(),
      };
      return empty;
    }
    const scored = candidates.map(d => ({
      dance: d,
      score: d.duration / 100 + this._audience.get(d.id)!.length,
    }));
    scored.sort((a, b) => b.score - a.score);
    const top = scored[0];
    const totalScore = scored.reduce((sum, s) => sum + s.score, 0);
    const confidence = totalScore > 0 ? top.score / totalScore : 0;
    const decision: RoutingDecision = {
      destination,
      selectedRoute: top.dance.dancer,
      confidence,
      decidedAt: Date.now(),
    };
    if (confidence >= this._minConfidence) {
      this._decisions.push(decision);
      if (this._decisions.length > 100) this._decisions.shift();
    }
    return decision;
  }

  getDancesByTarget(target: string): DanceMessage[] {
    return this._dances.filter(d => d.targetNode === target);
  }

  getAudienceSize(danceId: string): number {
    return this._audience.get(danceId)?.length ?? 0;
  }

  forgetStaleDances(maxAgeMs: number): number {
    const cutoff = Date.now() - maxAgeMs;
    const before = this._dances.length;
    this._dances = this._dances.filter(d => d.performedAt >= cutoff);
    return before - this._dances.length;
  }

  setMinConfidence(value: number): void {
    this._minConfidence = Math.max(0, Math.min(1, value));
  }

  get decisionHistory(): RoutingDecision[] {
    return [...this._decisions];
  }

  get danceCount(): number {
    return this._dances.length;
  }
}
