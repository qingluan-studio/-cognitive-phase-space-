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
  fitness: number;
}

export interface RoutingDecision {
  destination: string;
  selectedRoute: string;
  confidence: number;
  alternatives: number;
  decidedAt: number;
}

export class BeeDanceRouter {
  private _dances: DanceMessage[] = [];
  private _decisions: RoutingDecision[] = [];
  private _audience: Map<string, string[]> = new Map();
  private _distanceScale = 10;
  private _minConfidence = 0.5;
  private _decayHalfLifeMs = 60000;
  private _angleNoise = 0.05;

  performDance(msg: DanceMessage): void {
    this._dances.push(msg);
    if (this._dances.length > 300) this._dances.shift();
  }

  encodeDance(dancer: string, target: string, distance: number, angle: number, fitness: number = 0.5): DanceMessage {
    const danceType: DanceType = distance < this._distanceScale
      ? 'round'
      : distance < this._distanceScale * 3 ? 'sickle' : 'waggle';
    const duration = Math.floor(distance * 10 * (0.5 + fitness));
    const noisyAngle = angle + (Math.random() - 0.5) * this._angleNoise * Math.PI;
    const msg: DanceMessage = {
      id: `dance-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      dancer,
      danceType,
      targetNode: target,
      distance,
      angle: noisyAngle,
      duration,
      performedAt: Date.now(),
      fitness,
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

  decodeDance(dance: DanceMessage): { target: string; distance: number; angle: number; vector: { dx: number; dy: number } } {
    const rad = (dance.angle * Math.PI) / 180;
    return {
      target: dance.targetNode,
      distance: dance.distance,
      angle: dance.angle,
      vector: { dx: Math.cos(rad) * dance.distance, dy: Math.sin(rad) * dance.distance },
    };
  }

  private _danceScore(dance: DanceMessage): number {
    const now = Date.now();
    const age = now - dance.performedAt;
    const decay = Math.pow(0.5, age / this._decayHalfLifeMs);
    const audienceSize = this._audience.get(dance.id)?.length ?? 0;
    const durationNorm = dance.duration / 1000;
    return (durationNorm + audienceSize * 0.5 + dance.fitness * 2) * decay;
  }

  decideRoute(destination: string): RoutingDecision {
    const candidates = this._dances.filter(d => d.targetNode === destination);
    if (candidates.length === 0) {
      return {
        destination,
        selectedRoute: 'unknown',
        confidence: 0,
        alternatives: 0,
        decidedAt: Date.now(),
      };
    }
    const scored = candidates.map(d => ({ dance: d, score: this._danceScore(d) }));
    scored.sort((a, b) => b.score - a.score);
    const top = scored[0];
    const totalScore = scored.reduce((sum, s) => sum + s.score, 0);
    const confidence = totalScore > 0 ? top.score / totalScore : 0;
    const decision: RoutingDecision = {
      destination,
      selectedRoute: top.dance.dancer,
      confidence,
      alternatives: scored.length,
      decidedAt: Date.now(),
    };
    if (confidence >= this._minConfidence) {
      this._decisions.push(decision);
      if (this._decisions.length > 100) this._decisions.shift();
    }
    return decision;
  }

  computeRouteEntropy(destination: string): number {
    const candidates = this._dances.filter(d => d.targetNode === destination);
    if (candidates.length === 0) return 1;
    const scores = candidates.map(d => this._danceScore(d));
    const total = scores.reduce((s, v) => s + v, 0);
    if (total === 0) return 1;
    let h = 0;
    for (const s of scores) {
      const p = s / total;
      if (p > 0) h -= p * Math.log2(p);
    }
    const max = Math.log2(scores.length);
    return max === 0 ? 0 : h / max;
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
    const stale = new Set(this._dances.filter(d => d.performedAt < cutoff).map(d => d.id));
    this._dances = this._dances.filter(d => d.performedAt >= cutoff);
    for (const id of stale) this._audience.delete(id);
    return before - this._dances.length;
  }

  setMinConfidence(value: number): void {
    this._minConfidence = Math.max(0, Math.min(1, value));
  }

  setDecayHalfLife(ms: number): void {
    this._decayHalfLifeMs = Math.max(1000, ms);
  }

  setAngleNoise(value: number): void {
    this._angleNoise = Math.max(0, Math.min(1, value));
  }

  get decisionHistory(): RoutingDecision[] {
    return [...this._decisions];
  }

  get danceCount(): number {
    return this._dances.length;
  }

  get averageFitness(): number {
    if (this._dances.length === 0) return 0;
    return this._dances.reduce((s, d) => s + d.fitness, 0) / this._dances.length;
  }
}
