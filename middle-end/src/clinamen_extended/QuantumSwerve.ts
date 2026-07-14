/**
 * 量子偏斜：引入量子不确定性式的随机偏斜。
 * 模拟量子态叠加与坍缩，在确定路径上施加不可预测的偏斜，产生创造性分叉。
 */

export interface QuantumState {
  amplitude: number;
  phase: number;
  superposition: number[];
  collapsed: boolean;
}

export interface SwerveEvent {
  timestamp: number;
  originalVector: number;
  swervedVector: number;
  uncertainty: number;
}

export class QuantumSwerve {
  private _state: QuantumState;
  private _events: SwerveEvent[] = [];
  private _uncertaintyConstant: number;
  private _collapseThreshold = 0.5;

  constructor(uncertainty: number = 0.3) {
    this._uncertaintyConstant = uncertainty;
    this._state = {
      amplitude: 1,
      phase: 0,
      superposition: [],
      collapsed: false,
    };
  }

  prepareSuperposition(values: number[]): void {
    this._state.superposition = [...values];
    this._state.collapsed = false;
    this._state.amplitude = Math.sqrt(1 / values.length);
  }

  swerve(vector: number): number {
    const uncertainty = Math.random() * this._uncertaintyConstant;
    const delta = (Math.random() - 0.5) * uncertainty * 2 * vector;
    const swerved = vector + delta;
    this._events.push({
      timestamp: Date.now(),
      originalVector: vector,
      swervedVector: swerved,
      uncertainty,
    });
    if (this._events.length > 100) this._events.shift();
    return swerved;
  }

  collapse(): number {
    if (this._state.collapsed) return this._state.amplitude;
    if (this._state.superposition.length === 0) {
      this._state.collapsed = true;
      return 0;
    }
    const pick = this._state.superposition[
      Math.floor(Math.random() * this._state.superposition.length)
    ];
    this._state.amplitude = pick;
    this._state.collapsed = true;
    return pick;
  }

  entangle(other: QuantumSwerve): void {
    const avgUncertainty = (this._uncertaintyConstant + other._uncertaintyConstant) / 2;
    this._uncertaintyConstant = avgUncertainty;
    other._uncertaintyConstant = avgUncertainty;
  }

  measure(): { probability: number; value: number } {
    if (this._state.superposition.length === 0) {
      return { probability: 0, value: 0 };
    }
    const idx = Math.floor(Math.random() * this._state.superposition.length);
    const value = this._state.superposition[idx];
    const probability = this._state.amplitude ** 2;
    return { probability, value };
  }

  getEvents(): SwerveEvent[] {
    return [...this._events];
  }

  get isCollapsed(): boolean {
    return this._state.collapsed;
  }

  get uncertainty(): number {
    return this._uncertaintyConstant;
  }

  setCollapseThreshold(value: number): void {
    this._collapseThreshold = Math.max(0, Math.min(1, value));
  }
}
