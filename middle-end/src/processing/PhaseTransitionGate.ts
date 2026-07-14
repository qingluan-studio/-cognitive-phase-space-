/**
 * 相变门模块：控制数据从一种处理形态突变到另一种形态的临界点，
 * 当系统参数越过临界阈值时触发相变，切换处理范式。
 */

export type ProcessingPhase = 'solid' | 'liquid' | 'gas' | 'plasma';

export interface PhaseThreshold {
  from: ProcessingPhase;
  to: ProcessingPhase;
  temperature: number;
  pressure: number;
}

export interface PhaseTransition {
  id: string;
  from: ProcessingPhase;
  to: ProcessingPhase;
  triggeredAt: number;
  energyReleased: number;
  dataPayload: Record<string, unknown>;
}

export class PhaseTransitionGate {
  private _currentPhase: ProcessingPhase = 'solid';
  private _thresholds: Map<string, PhaseThreshold> = new Map();
  private _transitions: PhaseTransition[] = [];
  private _temperature = 0;
  private _pressure = 0;
  private _transitionCount = 0;

  constructor() {
    this._thresholds.set('solid->liquid', { from: 'solid', to: 'liquid', temperature: 30, pressure: 1 });
    this._thresholds.set('liquid->gas', { from: 'liquid', to: 'gas', temperature: 70, pressure: 1 });
    this._thresholds.set('gas->plasma', { from: 'gas', to: 'plasma', temperature: 90, pressure: 0.5 });
    this._thresholds.set('plasma->gas', { from: 'plasma', to: 'gas', temperature: 85, pressure: 1 });
    this._thresholds.set('gas->liquid', { from: 'gas', to: 'liquid', temperature: 65, pressure: 1 });
    this._thresholds.set('liquid->solid', { from: 'liquid', to: 'solid', temperature: 25, pressure: 1 });
  }

  setThreshold(key: string, threshold: PhaseThreshold): void {
    this._thresholds.set(key, threshold);
  }

  setConditions(temperature: number, pressure: number): void {
    this._temperature = temperature;
    this._pressure = pressure;
  }

  evaluate(data: Record<string, unknown>): PhaseTransition | null {
    const candidates = Array.from(this._thresholds.values()).filter(t => t.from === this._currentPhase);
    for (const threshold of candidates) {
      if (this._temperature >= threshold.temperature && this._pressure >= threshold.pressure) {
        return this._trigger(threshold.to, data);
      }
    }
    return null;
  }

  private _trigger(newPhase: ProcessingPhase, data: Record<string, unknown>): PhaseTransition {
    const energyReleased = Math.abs(this._temperature - this._currentPhase.length * 20);
    const transition: PhaseTransition = {
      id: `trans-${this._transitionCount++}`,
      from: this._currentPhase,
      to: newPhase,
      triggeredAt: Date.now(),
      energyReleased,
      dataPayload: { ...data, _phase: newPhase, _transitionEnergy: energyReleased },
    };
    this._currentPhase = newPhase;
    this._transitions.push(transition);
    return transition;
  }

  forceTransition(target: ProcessingPhase, data: Record<string, unknown>): PhaseTransition {
    return this._trigger(target, data);
  }

  transitionHistory(): PhaseTransition[] {
    return [...this._transitions];
  }

  isCritical(): boolean {
    const candidates = Array.from(this._thresholds.values()).filter(t => t.from === this._currentPhase);
    return candidates.some(t => Math.abs(this._temperature - t.temperature) < 5);
  }

  energyBudget(): number {
    return this._transitions.reduce((s, t) => s + t.energyReleased, 0);
  }

  reset(): void {
    this._currentPhase = 'solid';
    this._transitions = [];
    this._temperature = 0;
    this._pressure = 0;
  }

  get currentPhase(): ProcessingPhase {
    return this._currentPhase;
  }

  get temperature(): number {
    return this._temperature;
  }

  get pressure(): number {
    return this._pressure;
  }

  get transitionCount(): number {
    return this._transitions.length;
  }

  get thresholdCount(): number {
    return this._thresholds.size;
  }
}
