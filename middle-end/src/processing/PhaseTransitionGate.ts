export type ProcessingPhase = 'solid' | 'liquid' | 'gas' | 'plasma';

export interface PhaseThreshold {
  from: ProcessingPhase;
  to: ProcessingPhase;
  temperature: number;
  pressure: number;
  enthalpy: number;
}

export interface PhaseTransition {
  id: string;
  from: ProcessingPhase;
  to: ProcessingPhase;
  triggeredAt: number;
  energyReleased: number;
  dataPayload: Record<string, unknown>;
  hysteresisOffset: number;
}

export class PhaseTransitionGate {
  private _currentPhase: ProcessingPhase = 'solid';
  private _thresholds: Map<string, PhaseThreshold> = new Map();
  private _transitions: PhaseTransition[] = [];
  private _temperature = 0;
  private _pressure = 0;
  private _transitionCount = 0;
  private _hysteresis = 5;
  private _lastTransitionAt = 0;
  private _phaseEntropy: Map<ProcessingPhase, number> = new Map();
  private _freeEnergy = 0;

  constructor() {
    this._thresholds.set('solid->liquid', { from: 'solid', to: 'liquid', temperature: 30, pressure: 1, enthalpy: 40 });
    this._thresholds.set('liquid->gas', { from: 'liquid', to: 'gas', temperature: 70, pressure: 1, enthalpy: 80 });
    this._thresholds.set('gas->plasma', { from: 'gas', to: 'plasma', temperature: 90, pressure: 0.5, enthalpy: 120 });
    this._thresholds.set('plasma->gas', { from: 'plasma', to: 'gas', temperature: 85, pressure: 1, enthalpy: -100 });
    this._thresholds.set('gas->liquid', { from: 'gas', to: 'liquid', temperature: 65, pressure: 1, enthalpy: -70 });
    this._thresholds.set('liquid->solid', { from: 'liquid', to: 'solid', temperature: 25, pressure: 1, enthalpy: -35 });
    this._phaseEntropy.set('solid', 0.1);
    this._phaseEntropy.set('liquid', 0.4);
    this._phaseEntropy.set('gas', 0.7);
    this._phaseEntropy.set('plasma', 0.95);
  }

  setThreshold(key: string, threshold: PhaseThreshold): void {
    this._thresholds.set(key, threshold);
  }

  setConditions(temperature: number, pressure: number): void {
    this._temperature = temperature;
    this._pressure = pressure;
    this._updateFreeEnergy();
  }

  setHysteresis(h: number): void {
    this._hysteresis = Math.max(0, h);
  }

  private _updateFreeEnergy(): void {
    const entropy = this._phaseEntropy.get(this._currentPhase) ?? 0.5;
    this._freeEnergy = this._temperature * (1 - entropy) - this._pressure * 0.1;
  }

  evaluate(data: Record<string, unknown>): PhaseTransition | null {
    const now = Date.now();
    if (now - this._lastTransitionAt < 100) return null;

    const candidates = Array.from(this._thresholds.values()).filter(t => t.from === this._currentPhase);
    for (const threshold of candidates) {
      const effectiveTemp = threshold.to === this._currentPhase
        ? threshold.temperature + this._hysteresis
        : threshold.temperature - this._hysteresis;

      if (this._temperature >= threshold.temperature && this._pressure >= threshold.pressure) {
        const gibbsFree = this._computeGibbsFreeEnergy(threshold);
        if (gibbsFree < 0) {
          return this._trigger(threshold.to, data, threshold);
        }
      }
    }
    return null;
  }

  private _computeGibbsFreeEnergy(threshold: PhaseThreshold): number {
    const deltaH = threshold.enthalpy;
    const deltaS = ((this._phaseEntropy.get(threshold.to) ?? 0.5) - (this._phaseEntropy.get(threshold.from) ?? 0.5));
    return deltaH - this._temperature * deltaS * 10;
  }

  private _trigger(
    newPhase: ProcessingPhase,
    data: Record<string, unknown>,
    threshold: PhaseThreshold
  ): PhaseTransition {
    const energyReleased = Math.abs(threshold.enthalpy) * (1 + Math.abs(this._temperature - threshold.temperature) / 50);
    const hysteresisOffset = this._hysteresis * Math.sign(this._temperature - threshold.temperature);

    const transition: PhaseTransition = {
      id: `trans-${this._transitionCount++}`,
      from: this._currentPhase,
      to: newPhase,
      triggeredAt: Date.now(),
      energyReleased,
      dataPayload: {
        ...data,
        _phase: newPhase,
        _transitionEnergy: energyReleased,
        _freeEnergy: this._freeEnergy,
      },
      hysteresisOffset,
    };

    this._currentPhase = newPhase;
    this._lastTransitionAt = Date.now();
    this._transitions.push(transition);
    this._updateFreeEnergy();
    return transition;
  }

  forceTransition(target: ProcessingPhase, data: Record<string, unknown>): PhaseTransition {
    const threshold = Array.from(this._thresholds.values()).find(
      t => t.from === this._currentPhase && t.to === target
    );
    const defaultThreshold: PhaseThreshold = {
      from: this._currentPhase, to: target,
      temperature: 50, pressure: 1, enthalpy: 50,
    };
    return this._trigger(target, data, threshold ?? defaultThreshold);
  }

  transitionHistory(): PhaseTransition[] {
    return [...this._transitions];
  }

  isCritical(): boolean {
    const candidates = Array.from(this._thresholds.values()).filter(t => t.from === this._currentPhase);
    return candidates.some(t => Math.abs(this._temperature - t.temperature) < this._hysteresis);
  }

  energyBudget(): number {
    return this._transitions.reduce((s, t) => s + t.energyReleased, 0);
  }

  phaseStability(): number {
    if (this._transitions.length < 2) return 1;
    const intervals: number[] = [];
    for (let i = 1; i < this._transitions.length; i++) {
      intervals.push(this._transitions[i].triggeredAt - this._transitions[i - 1].triggeredAt);
    }
    const avgInterval = intervals.reduce((s, x) => s + x, 0) / intervals.length;
    const variance = intervals.reduce((s, x) => s + (x - avgInterval) ** 2, 0) / intervals.length;
    return Math.max(0, 1 - Math.sqrt(variance) / avgInterval);
  }

  phaseDiagramPoint(): { temperature: number; pressure: number; phase: ProcessingPhase; freeEnergy: number } {
    return {
      temperature: this._temperature,
      pressure: this._pressure,
      phase: this._currentPhase,
      freeEnergy: this._freeEnergy,
    };
  }

  reset(): void {
    this._currentPhase = 'solid';
    this._transitions = [];
    this._temperature = 0;
    this._pressure = 0;
    this._lastTransitionAt = 0;
    this._freeEnergy = 0;
  }

  get currentPhase(): ProcessingPhase { return this._currentPhase; }
  get temperature(): number { return this._temperature; }
  get pressure(): number { return this._pressure; }
  get transitionCount(): number { return this._transitions.length; }
  get thresholdCount(): number { return this._thresholds.size; }
  get freeEnergy(): number { return this._freeEnergy; }
  get hysteresis(): number { return this._hysteresis; }
}
