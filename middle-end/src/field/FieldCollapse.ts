/**
 * FieldCollapse - 场坍缩
 * 从叠加态变为确定态的过程，类似量子测量导致的波函数坍缩，
 * 多种可能性在观测瞬间缩减为单一确定结果。
 */

export interface FieldCollapseData {
  readonly collapseId: string;
  superpositionStates: string[];
  probabilityWeights: number[];
  collapsed: boolean;
}

export interface CollapseResult {
  finalState: string;
  probability: number;
  timestamp: number;
  observerId: string;
}

export class FieldCollapse {
  private _data: FieldCollapseData;
  private _collapsedState: string | null = null;
  private _collapseHistory: CollapseResult[] = [];
  private _measurementCount: number = 0;
  private _decoherenceTime: number = 0;

  constructor(data: FieldCollapseData) {
    this._data = {
      ...data,
      superpositionStates: [...data.superpositionStates],
      probabilityWeights: [...data.probabilityWeights],
    };
  }

  get collapseId(): string {
    return this._data.collapseId;
  }

  get collapsed(): boolean {
    return this._data.collapsed;
  }

  get superpositionSize(): number {
    return this._data.superpositionStates.length;
  }

  get collapsedState(): string | null {
    return this._collapsedState;
  }

  public measure(observerId: string, timestamp: number): CollapseResult | null {
    if (this._data.collapsed) {
      return this._collapseHistory[this._collapseHistory.length - 1] ?? null;
    }
    this._measurementCount++;
    const totalWeight = this._data.probabilityWeights.reduce((s, w) => s + w, 0);
    if (totalWeight === 0) {
      return null;
    }
    const roll = Math.random() * totalWeight;
    let cumulative = 0;
    let chosenIdx = 0;
    for (let i = 0; i < this._data.probabilityWeights.length; i++) {
      cumulative += this._data.probabilityWeights[i];
      if (roll <= cumulative) {
        chosenIdx = i;
        break;
      }
    }
    this._collapsedState = this._data.superpositionStates[chosenIdx];
    this._data.collapsed = true;
    const probability = this._data.probabilityWeights[chosenIdx] / totalWeight;
    const result: CollapseResult = {
      finalState: this._collapsedState,
      probability,
      timestamp,
      observerId,
    };
    this._collapseHistory.push(result);
    if (this._collapseHistory.length > 20) {
      this._collapseHistory.shift();
    }
    return result;
  }

  public adjustWeights(newWeights: number[]): void {
    if (newWeights.length !== this._data.probabilityWeights.length) {
      return;
    }
    this._data.probabilityWeights = [...newWeights];
  }

  public addState(state: string, weight: number): void {
    if (this._data.collapsed) {
      return;
    }
    this._data.superpositionStates.push(state);
    this._data.probabilityWeights.push(weight);
  }

  public decohere(timeDelta: number): void {
    this._decoherenceTime += timeDelta;
    const decay = Math.exp(-this._decoherenceTime * 0.01);
    this._data.probabilityWeights = this._data.probabilityWeights.map((w) => w * decay);
  }

  public reconstitute(): void {
    this._data.collapsed = false;
    this._collapsedState = null;
    this._decoherenceTime = 0;
    const uniform = 1 / this._data.superpositionStates.length;
    this._data.probabilityWeights = this._data.superpositionStates.map(() => uniform);
  }

  public biasState(state: string, biasAmount: number): void {
    const idx = this._data.superpositionStates.indexOf(state);
    if (idx >= 0) {
      this._data.probabilityWeights[idx] += biasAmount;
    }
  }

  public getStateProbability(state: string): number {
    const idx = this._data.superpositionStates.indexOf(state);
    if (idx < 0) {
      return 0;
    }
    const total = this._data.probabilityWeights.reduce((s, w) => s + w, 0);
    return total === 0 ? 0 : this._data.probabilityWeights[idx] / total;
  }

  public collapseReport(): Record<string, unknown> {
    return {
      collapseId: this.collapseId,
      collapsed: this._data.collapsed,
      collapsedState: this._collapsedState,
      superpositionSize: this.superpositionSize,
      measurementCount: this._measurementCount,
      decoherenceTime: this._decoherenceTime.toFixed(2),
      collapseHistory: this._collapseHistory.length,
      stateWeights: this._data.probabilityWeights.map((w) => w.toFixed(3)),
    };
  }
}
