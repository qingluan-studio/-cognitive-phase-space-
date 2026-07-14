/**
 * ExocytosisBurst - 胞吐爆发
 * 一次性释放大量预先储备的信息包/神经递质，模拟细胞通过
 * 胞吐作用将囊泡内容物批量释放到细胞外的瞬间过程。
 */

export interface ExocytosisBurstData {
  readonly burstId: string;
  vesicleCount: number;
  payloadPerVesicle: number;
  triggerThreshold: number;
  readiness: number;
}

export interface BurstEvent {
  vesiclesReleased: number;
  totalPayload: number;
  timestamp: number;
  complete: boolean;
}

export class ExocytosisBurst {
  private _data: ExocytosisBurstData;
  private _events: BurstEvent[] = [];
  private _accumulatedSignal: number = 0;
  private _releasedTotal: number = 0;
  private _replenishTimer: number = 0;

  constructor(data: ExocytosisBurstData) {
    this._data = { ...data };
  }

  get burstId(): string {
    return this._data.burstId;
  }

  get vesicleCount(): number {
    return this._data.vesicleCount;
  }

  get readiness(): number {
    return this._data.readiness;
  }

  public accumulateSignal(intensity: number): boolean {
    this._accumulatedSignal += intensity;
    if (this._accumulatedSignal >= this._data.triggerThreshold && this._data.readiness > 0.5) {
      this.triggerBurst(Date.now());
      return true;
    }
    return false;
  }

  public triggerBurst(timestamp: number): BurstEvent {
    const available = this._data.vesicleCount;
    const released = Math.floor(available * this._data.readiness);
    const payload = released * this._data.payloadPerVesicle;
    this._data.vesicleCount -= released;
    this._releasedTotal += payload;
    this._data.readiness = Math.max(0, this._data.readiness - 0.5);
    this._accumulatedSignal = 0;
    this._replenishTimer = 10;
    const event: BurstEvent = {
      vesiclesReleased: released,
      totalPayload: payload,
      timestamp,
      complete: released === available,
    };
    this._events.push(event);
    if (this._events.length > 20) {
      this._events.shift();
    }
    return event;
  }

  public replenishVesicles(count: number): void {
    if (this._replenishTimer > 0) {
      this._replenishTimer--;
      return;
    }
    this._data.vesicleCount += count;
    this._data.readiness = Math.min(1, this._data.readiness + 0.1);
  }

  public primeReadiness(amount: number): void {
    this._data.readiness = Math.min(1, this._data.readiness + amount);
  }

  public adjustThreshold(newThreshold: number): void {
    this._data.triggerThreshold = Math.max(0, newThreshold);
  }

  public partialRelease(fraction: number): number {
    const release = Math.floor(this._data.vesicleCount * fraction);
    this._data.vesicleCount -= release;
    const payload = release * this._data.payloadPerVesicle;
    this._releasedTotal += payload;
    return payload;
  }

  public isDepleted(): boolean {
    return this._data.vesicleCount === 0 || this._data.readiness < 0.1;
  }

  public burstReport(): Record<string, unknown> {
    const lastBurst = this._events[this._events.length - 1];
    return {
      burstId: this.burstId,
      vesicleCount: this._data.vesicleCount,
      payloadPerVesicle: this._data.payloadPerVesicle,
      triggerThreshold: this._data.triggerThreshold,
      readiness: this._data.readiness.toFixed(3),
      accumulatedSignal: this._accumulatedSignal.toFixed(2),
      releasedTotal: this._releasedTotal.toFixed(2),
      eventCount: this._events.length,
      lastBurstVesicles: lastBurst?.vesiclesReleased ?? 0,
      depleted: this.isDepleted(),
      replenishTimer: this._replenishTimer,
    };
  }
}
