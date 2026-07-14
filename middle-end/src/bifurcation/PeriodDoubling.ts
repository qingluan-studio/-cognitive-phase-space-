/**
 * PeriodDoubling - 周期倍分
 * 振荡周期每次翻倍，是通往混沌的倍周期分岔路径，
 * 每次分岔使周期T变为2T，最终导致混沌。
 */

export interface PeriodDoublingData {
  readonly doublingId: string;
  controlParameter: number;
  currentPeriod: number;
  bifurcationCount: number;
}

export interface DoublingEvent {
  beforePeriod: number;
  afterPeriod: number;
  controlValue: number;
  bifurcationNumber: number;
}

export class PeriodDoubling {
  private _data: PeriodDoublingData;
  private _events: DoublingEvent[] = [];
  private _orbit: number[] = [];
  private _approachingChaos: boolean = false;
  private _feigenbaumEstimate: number = 4.669;

  constructor(data: PeriodDoublingData) {
    this._data = { ...data };
  }

  get doublingId(): string {
    return this._data.doublingId;
  }

  get currentPeriod(): number {
    return this._data.currentPeriod;
  }

  get bifurcationCount(): number {
    return this._data.bifurcationCount;
  }

  get approachingChaos(): boolean {
    return this._approachingChaos;
  }

  public triggerDoubling(controlValue: number): DoublingEvent | null {
    if (this._approachingChaos) {
      return null;
    }
    const before = this._data.currentPeriod;
    this._data.currentPeriod *= 2;
    this._data.bifurcationCount++;
    this._data.controlParameter = controlValue;
    const event: DoublingEvent = {
      beforePeriod: before,
      afterPeriod: this._data.currentPeriod,
      controlValue,
      bifurcationNumber: this._data.bifurcationCount,
    };
    this._events.push(event);
    if (this._data.bifurcationCount >= 5) {
      this._approachingChaos = true;
    }
    return event;
  }

  public generateOrbit(iterations: number): number[] {
    this._orbit = [];
    const r = this._data.controlParameter;
    let x = 0.5;
    for (let i = 0; i < iterations; i++) {
      x = r * x * (1 - x);
      this._orbit.push(x);
      if (this._orbit.length > 200) {
        this._orbit.shift();
      }
    }
    return [...this._orbit];
  }

  public setControlParameter(value: number): void {
    this._data.controlParameter = Math.max(0, Math.min(4, value));
  }

  public detectPeriod(): number {
    if (this._orbit.length < 20) {
      return 0;
    }
    const tail = this._orbit.slice(-20);
    for (let p = 1; p <= 16; p++) {
      let matches = true;
      for (let i = 0; i < tail.length - p; i++) {
        if (Math.abs(tail[i] - tail[i + p]) > 0.01) {
          matches = false;
          break;
        }
      }
      if (matches) {
        return p;
      }
    }
    return 0;
  }

  public computeFeigenbaumRatio(): number {
    if (this._events.length < 2) {
      return 0;
    }
    const recent = this._events.slice(-2);
    const diff1 = recent[1].controlValue - recent[0].controlValue;
    if (this._events.length >= 3) {
      const diff0 = this._events[this._events.length - 2].controlValue
        - this._events[this._events.length - 3].controlValue;
      if (diff1 === 0) {
        return 0;
      }
      return diff0 / diff1;
    }
    return diff1;
  }

  public resetToFixedPoint(): void {
    this._data.currentPeriod = 1;
    this._data.bifurcationCount = 0;
    this._approachingChaos = false;
    this._orbit = [];
  }

  public isChaotic(): boolean {
    return this._approachingChaos && this.detectPeriod() === 0;
  }

  public doublingReport(): Record<string, unknown> {
    return {
      doublingId: this.doublingId,
      controlParameter: this._data.controlParameter.toFixed(4),
      currentPeriod: this._data.currentPeriod,
      bifurcationCount: this._data.bifurcationCount,
      approachingChaos: this._approachingChaos,
      detectedPeriod: this.detectPeriod(),
      chaotic: this.isChaotic(),
      feigenbaumRatio: this.computeFeigenbaumRatio().toFixed(3),
      feigenbaumConstant: this._feigenbaumEstimate,
      eventCount: this._events.length,
      orbitLength: this._orbit.length,
    };
  }
}
