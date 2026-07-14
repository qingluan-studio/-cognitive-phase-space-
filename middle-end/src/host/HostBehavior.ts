/**
 * HostBehavior - 宿主行为
 * 模拟宿主被寄生后表现出的异常行为模式，包括行为偏移、
 * 反应迟钝、异常活跃等症状，反映寄生对宿主决策的影响。
 */

export interface HostBehaviorData {
  readonly hostId: string;
  baselineActivity: number;
  reactivity: number;
  parasitized: boolean;
  parasiteLoad: number;
}

export interface BehaviorSymptom {
  name: string;
  severity: number;
  duration: number;
}

export class HostBehavior {
  private _data: HostBehaviorData;
  private _symptoms: BehaviorSymptom[] = [];
  private _activityHistory: number[] = [];
  private _deviationScore: number = 0;
  private _suppressedReflexes: Set<string> = new Set();

  constructor(data: HostBehaviorData) {
    this._data = { ...data };
  }

  get hostId(): string {
    return this._data.hostId;
  }

  get parasitized(): boolean {
    return this._data.parasitized;
  }

  get deviationScore(): number {
    return this._deviationScore;
  }

  get currentActivity(): number {
    if (this._activityHistory.length === 0) {
      return this._data.baselineActivity;
    }
    return this._activityHistory[this._activityHistory.length - 1];
  }

  public recordActivity(actual: number): void {
    this._activityHistory.push(actual);
    if (this._activityHistory.length > 50) {
      this._activityHistory.shift();
    }
    this._updateDeviation();
  }

  private _updateDeviation(): void {
    if (this._activityHistory.length < 2) {
      return;
    }
    const recent = this._activityHistory.slice(-10);
    const mean = recent.reduce((a, b) => a + b, 0) / recent.length;
    this._deviationScore = Math.abs(mean - this._data.baselineActivity) / this._data.baselineActivity;
  }

  public exhibitSymptom(name: string, severity: number): void {
    if (!this._data.parasitized) {
      return;
    }
    const amplified = severity * (1 + this._data.parasiteLoad * 0.1);
    this._symptoms.push({ name, severity: amplified, duration: 0 });
  }

  public suppressReflex(reflex: string): void {
    this._suppressedReflexes.add(reflex);
  }

  public reactToStimulus(stimulus: string, intensity: number): number {
    if (this._suppressedReflexes.has(stimulus)) {
      return 0;
    }
    const factor = this._data.parasitized ? this._data.reactivity * 0.6 : this._data.reactivity;
    const response = intensity * factor;
    this.recordActivity(this._data.baselineActivity + response);
    return response;
  }

  public tickSymptoms(): void {
    this._symptoms.forEach((s) => {
      s.duration++;
      s.severity *= 0.95;
    });
    this._symptoms = this._symptoms.filter((s) => s.severity > 0.05);
  }

  public recover(amount: number): void {
    this._data.parasiteLoad = Math.max(0, this._data.parasiteLoad - amount);
    if (this._data.parasiteLoad === 0) {
      this._data.parasitized = false;
      this._suppressedReflexes.clear();
    }
  }

  public behaviorReport(): Record<string, unknown> {
    return {
      hostId: this.hostId,
      parasitized: this._data.parasitized,
      parasiteLoad: this._data.parasiteLoad.toFixed(2),
      baseline: this._data.baselineActivity,
      current: this.currentActivity.toFixed(2),
      deviation: this._deviationScore.toFixed(3),
      activeSymptoms: this._symptoms.length,
      suppressedReflexes: this._suppressedReflexes.size,
    };
  }
}
