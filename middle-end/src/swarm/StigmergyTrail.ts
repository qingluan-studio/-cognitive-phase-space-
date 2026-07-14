export interface StigmergyMark {
  id: string;
  location: string;
  signal: string;
  strength: number;
  depositor: string;
  depositedAt: number;
}

export interface TrailStep {
  location: string;
  followedSignal: string;
  strength: number;
  stepAt: number;
}

export interface SignalField {
  signal: string;
  totalStrength: number;
  spread: number;
}

export class StigmergyTrail {
  private _marks: Map<string, StigmergyMark> = new Map();
  private _trails: Map<string, TrailStep[]> = new Map();
  private _decayRate = 0.05;
  private _minStrength = 0.1;
  private _reinforcementGain = 0.15;
  private _adjacency: Map<string, Set<string>> = new Map();
  private _diffusionCoefficient = 0.08;

  depositMark(mark: StigmergyMark): void {
    const clamped: StigmergyMark = { ...mark, strength: Math.max(0, mark.strength) };
    this._marks.set(mark.id, clamped);
    this._linkLocations(mark.location);
  }

  linkLocations(a: string, b: string): void {
    this._adjacency.set(a, this._adjacency.get(a) ?? new Set());
    this._adjacency.set(b, this._adjacency.get(b) ?? new Set());
    this._adjacency.get(a)!.add(b);
    this._adjacency.get(b)!.add(a);
  }

  private _linkLocations(loc: string): void {
    if (!this._adjacency.has(loc)) this._adjacency.set(loc, new Set());
  }

  decayMarks(): number {
    let removed = 0;
    for (const [id, mark] of this._marks) {
      mark.strength = Math.max(0, mark.strength - this._decayRate);
      if (mark.strength < this._minStrength) {
        this._marks.delete(id);
        removed++;
      }
    }
    return removed;
  }

  diffuse(): void {
    const additions: { id: string; loc: string; signal: string; strength: number; depositor: string }[] = [];
    for (const mark of this._marks.values()) {
      const neighbors = this._adjacency.get(mark.location);
      if (!neighbors) continue;
      const perNeighbor = mark.strength * this._diffusionCoefficient / Math.max(1, neighbors.size);
      for (const n of neighbors) {
        additions.push({
          id: `${mark.id}>${n}`,
          loc: n,
          signal: mark.signal,
          strength: perNeighbor,
          depositor: mark.depositor,
        });
      }
    }
    for (const add of additions) {
      const existing = this._findMark(add.loc, add.signal);
      if (existing) existing.strength += add.strength;
      else if (add.strength >= this._minStrength) {
        this._marks.set(add.id, {
          id: add.id,
          location: add.loc,
          signal: add.signal,
          strength: add.strength,
          depositor: add.depositor,
          depositedAt: Date.now(),
        });
      }
    }
  }

  private _findMark(location: string, signal: string): StigmergyMark | null {
    for (const m of this._marks.values()) {
      if (m.location === location && m.signal === signal) return m;
    }
    return null;
  }

  reinforceMark(markId: string, amount: number): boolean {
    const mark = this._marks.get(markId);
    if (!mark) return false;
    mark.strength += amount + this._reinforcementGain;
    return true;
  }

  senseMarks(location: string, signal: string): StigmergyMark[] {
    return Array.from(this._marks.values())
      .filter(m => m.location === location && m.signal === signal)
      .sort((a, b) => b.strength - a.strength);
  }

  followTrail(agentId: string, signal: string, maxSteps: number): TrailStep[] {
    const steps: TrailStep[] = [];
    let currentLocation = this._pickStrongestLocation(signal) ?? 'origin';
    const visited = new Set<string>();
    for (let i = 0; i < maxSteps; i++) {
      if (visited.has(currentLocation)) break;
      visited.add(currentLocation);
      const sensed = this.senseMarks(currentLocation, signal);
      if (sensed.length === 0) break;
      const top = sensed[0];
      steps.push({
        location: currentLocation,
        followedSignal: signal,
        strength: top.strength,
        stepAt: Date.now(),
      });
      const neighbors = this._adjacency.get(currentLocation);
      if (!neighbors) break;
      const next = this._pickNextStep(neighbors, signal, visited);
      if (!next) break;
      currentLocation = next;
    }
    this._trails.set(agentId, steps);
    return steps;
  }

  private _pickStrongestLocation(signal: string): string | null {
    let best: string | null = null;
    let max = 0;
    for (const m of this._marks.values()) {
      if (m.signal === signal && m.strength > max) { max = m.strength; best = m.location; }
    }
    return best;
  }

  private _pickNextStep(neighbors: Set<string>, signal: string, visited: Set<string>): string | null {
    let best: string | null = null;
    let max = 0;
    for (const n of neighbors) {
      if (visited.has(n)) continue;
      const marks = this.senseMarks(n, signal);
      const total = marks.reduce((s, m) => s + m.strength, 0);
      if (total > max) { max = total; best = n; }
    }
    return best;
  }

  identifyPopularSignals(): SignalField[] {
    const counter = new Map<string, { total: number; locs: Set<string> }>();
    for (const mark of this._marks.values()) {
      const cur = counter.get(mark.signal) ?? { total: 0, locs: new Set() };
      cur.total += mark.strength;
      cur.locs.add(mark.location);
      counter.set(mark.signal, cur);
    }
    return Array.from(counter.entries())
      .map(([signal, v]) => ({ signal, totalStrength: v.total, spread: v.locs.size }))
      .sort((a, b) => b.totalStrength - a.totalStrength);
  }

  getTrail(agentId: string): TrailStep[] {
    return this._trails.get(agentId) ?? [];
  }

  clearWeakMarks(): number {
    let removed = 0;
    for (const [id, mark] of this._marks) {
      if (mark.strength < this._minStrength * 2) {
        this._marks.delete(id);
        removed++;
      }
    }
    return removed;
  }

  setDecayRate(rate: number): void {
    this._decayRate = Math.max(0, Math.min(1, rate));
  }

  setDiffusionCoefficient(value: number): void {
    this._diffusionCoefficient = Math.max(0, Math.min(0.5, value));
  }

  get markCount(): number {
    return this._marks.size;
  }

  get activeTrailCount(): number {
    return this._trails.size;
  }

  get locationCount(): number {
    return this._adjacency.size;
  }
}
