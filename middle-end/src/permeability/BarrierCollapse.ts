/**
 * BarrierCollapse - 屏障崩溃
 * 临时完全开放边界，使原本隔离的两侧发生剧烈的物质交换，
 * 通常作为应急机制或异常事件触发。
 */

export interface BarrierCollapseData {
  readonly barrierId: string;
  integrity: number;
  collapseThreshold: number;
  rebuildRate: number;
}

export interface CollapseEvent {
  timestamp: number;
  integrityBefore: number;
  integrityAfter: number;
  exchangeVolume: number;
}

export class BarrierCollapse {
  private _data: BarrierCollapseData;
  private _events: CollapseEvent[] = [];
  private _collapsed: boolean = false;
  private _exchangeTotal: number = 0;
  private _rebuildProgress: number = 0;

  constructor(data: BarrierCollapseData) {
    this._data = { ...data };
  }

  get barrierId(): string {
    return this._data.barrierId;
  }

  get integrity(): number {
    return this._data.integrity;
  }

  get collapsed(): boolean {
    return this._collapsed;
  }

  public applyStress(stress: number): boolean {
    this._data.integrity = Math.max(0, this._data.integrity - stress);
    if (this._data.integrity <= this._data.collapseThreshold && !this._collapsed) {
      this.triggerCollapse(Date.now());
      return true;
    }
    return false;
  }

  public triggerCollapse(timestamp: number): CollapseEvent {
    const before = this._data.integrity;
    this._data.integrity = 0;
    this._collapsed = true;
    const exchange = 100 * (1 + Math.random());
    this._exchangeTotal += exchange;
    this._rebuildProgress = 0;
    const event: CollapseEvent = {
      timestamp,
      integrityBefore: before,
      integrityAfter: 0,
      exchangeVolume: exchange,
    };
    this._events.push(event);
    if (this._events.length > 15) {
      this._events.shift();
    }
    return event;
  }

  public rebuild(): number {
    if (!this._collapsed) {
      return this._data.integrity;
    }
    this._rebuildProgress += this._data.rebuildRate;
    this._data.integrity = Math.min(1, this._data.integrity + this._data.rebuildRate);
    if (this._data.integrity >= 0.8) {
      this._collapsed = false;
    }
    return this._data.integrity;
  }

  public reinforce(amount: number): void {
    this._data.integrity = Math.min(1, this._data.integrity + amount);
    if (this._data.integrity > this._data.collapseThreshold) {
      this._collapsed = false;
    }
  }

  public adjustCollapseThreshold(newThreshold: number): void {
    this._data.collapseThreshold = Math.max(0, Math.min(1, newThreshold));
  }

  public measureVulnerability(): number {
    const margin = this._data.integrity - this._data.collapseThreshold;
    return Math.max(0, 1 - margin);
  }

  public emergencySeal(): boolean {
    if (this._rebuildProgress < 0.3) {
      return false;
    }
    this._data.integrity = Math.max(0.5, this._data.integrity);
    this._collapsed = false;
    return true;
  }

  public collapseReport(): Record<string, unknown> {
    return {
      barrierId: this.barrierId,
      integrity: this._data.integrity.toFixed(3),
      collapseThreshold: this._data.collapseThreshold.toFixed(3),
      rebuildRate: this._data.rebuildRate.toFixed(3),
      collapsed: this._collapsed,
      rebuildProgress: this._rebuildProgress.toFixed(3),
      vulnerability: this.measureVulnerability().toFixed(3),
      collapseEvents: this._events.length,
      exchangeTotal: this._exchangeTotal.toFixed(2),
    };
  }
}
