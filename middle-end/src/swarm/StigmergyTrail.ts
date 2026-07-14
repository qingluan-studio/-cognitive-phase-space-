/**
 * 共识自动路径模块：通过环境标记实现间接通信协作，
 * 个体在环境中留下信号，其他个体感知后调整自己的行为路径。
 */

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
  stepAt: number;
}

export class StigmergyTrail {
  private _marks: Map<string, StigmergyMark> = new Map();
  private _trails: Map<string, TrailStep[]> = new Map();
  private _decayRate = 0.05;
  private _minStrength = 0.1;

  depositMark(mark: StigmergyMark): void {
    this._marks.set(mark.id, mark);
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

  reinforceMark(markId: string, amount: number): boolean {
    const mark = this._marks.get(markId);
    if (!mark) return false;
    mark.strength += amount;
    return true;
  }

  senseMarks(location: string, signal: string): StigmergyMark[] {
    return Array.from(this._marks.values())
      .filter(m => m.location === location && m.signal === signal)
      .sort((a, b) => b.strength - a.strength);
  }

  followTrail(agentId: string, signal: string, maxSteps: number): TrailStep[] {
    const steps: TrailStep[] = [];
    let currentLocation = 'origin';
    for (let i = 0; i < maxSteps; i++) {
      const sensed = this.senseMarks(currentLocation, signal);
      if (sensed.length === 0) break;
      const step: TrailStep = {
        location: currentLocation,
        followedSignal: signal,
        stepAt: Date.now(),
      };
      steps.push(step);
      currentLocation = `${currentLocation}->next`;
    }
    this._trails.set(agentId, steps);
    return steps;
  }

  identifyPopularSignals(): { signal: string; count: number }[] {
    const counter = new Map<string, number>();
    for (const mark of this._marks.values()) {
      counter.set(mark.signal, (counter.get(mark.signal) ?? 0) + 1);
    }
    return Array.from(counter.entries())
      .map(([signal, count]) => ({ signal, count }))
      .sort((a, b) => b.count - a.count);
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

  get markCount(): number {
    return this._marks.size;
  }

  get activeTrailCount(): number {
    return this._trails.size;
  }
}
