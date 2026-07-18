export type HormoneType = 'cortisol' | 'oxytocin' | 'melatonin' | 'adrenaline';

export interface HormoneLevel {
  type: HormoneType;
  current: number;
  target: number;
  min: number;
  max: number;
  decayRate: number;
  productionRate: number;
}

export interface FeedbackConnection {
  source: HormoneType;
  target: HormoneType;
  weight: number;
  threshold: number;
  delay: number;
}

export interface SystemState {
  hormones: Record<HormoneType, HormoneLevel>;
  stabilityScore: number;
  isBalanced: boolean;
  cyclePhase: number;
  lastUpdate: number;
}

export interface CouplingMatrix {
  cortisol: Record<HormoneType, number>;
  oxytocin: Record<HormoneType, number>;
  melatonin: Record<HormoneType, number>;
  adrenaline: Record<HormoneType, number>;
}

export class HormoneFeedbackLoop {
  private _hormones: Record<HormoneType, HormoneLevel> = {
    cortisol: { type: 'cortisol', current: 0.2, target: 0.3, min: 0, max: 1, decayRate: 0.02, productionRate: 0.1 },
    oxytocin: { type: 'oxytocin', current: 0.5, target: 0.5, min: 0, max: 1, decayRate: 0.03, productionRate: 0.08 },
    melatonin: { type: 'melatonin', current: 0.1, target: 0.2, min: 0, max: 1, decayRate: 0.015, productionRate: 0.12 },
    adrenaline: { type: 'adrenaline', current: 0.15, target: 0.2, min: 0, max: 1, decayRate: 0.05, productionRate: 0.15 },
  };

  private _feedbackConnections: FeedbackConnection[] = [
    { source: 'cortisol', target: 'adrenaline', weight: 0.3, threshold: 0.5, delay: 100 },
    { source: 'adrenaline', target: 'cortisol', weight: 0.2, threshold: 0.4, delay: 200 },
    { source: 'cortisol', target: 'oxytocin', weight: -0.25, threshold: 0.4, delay: 300 },
    { source: 'oxytocin', target: 'cortisol', weight: -0.3, threshold: 0.3, delay: 200 },
    { source: 'melatonin', target: 'adrenaline', weight: -0.4, threshold: 0.3, delay: 150 },
    { source: 'adrenaline', target: 'melatonin', weight: -0.35, threshold: 0.5, delay: 100 },
    { source: 'melatonin', target: 'oxytocin', weight: 0.15, threshold: 0.4, delay: 250 },
    { source: 'oxytocin', target: 'melatonin', weight: 0.2, threshold: 0.3, delay: 300 },
  ];

  private _connectionTimestamps: Map<string, number> = new Map();
  private _cyclePhase = 0;
  private _stabilityHistory: number[] = [];
  private _lastUpdate = 0;
  private _couplingStrength = 0.8;

  update(deltaTime: number): void {
    const now = Date.now();
    const timeSinceLast = now - this._lastUpdate;
    this._lastUpdate = now;

    this._cyclePhase = (this._cyclePhase + deltaTime / 1000 * 0.001) % (2 * Math.PI);

    const influences = this._computeInfluences();

    const hormoneTypes: HormoneType[] = ['cortisol', 'oxytocin', 'melatonin', 'adrenaline'];
    for (const type of hormoneTypes) {
      const hormone = this._hormones[type];
      const totalInfluence = influences[type];
      const phaseInfluence = this._computeCircadianInfluence(type);

      const error = hormone.target - hormone.current;
      const proportional = error * 0.05;
      const integral = this._computeIntegral(type) * 0.01;

      let change = proportional + integral + totalInfluence + phaseInfluence;
      change *= deltaTime / 1000;

      hormone.current += change;
      hormone.current = Math.max(hormone.min, Math.min(hormone.max, hormone.current));

      hormone.current *= (1 - hormone.decayRate * deltaTime / 1000);
    }

    this._updateStability();
  }

  private _computeInfluences(): Record<HormoneType, number> {
    const influences: Record<HormoneType, number> = {
      cortisol: 0,
      oxytocin: 0,
      melatonin: 0,
      adrenaline: 0,
    };

    for (const connection of this._feedbackConnections) {
      const key = `${connection.source}-${connection.target}`;
      const lastTime = this._connectionTimestamps.get(key) ?? 0;
      const now = Date.now();

      if (now - lastTime >= connection.delay) {
        const source = this._hormones[connection.source];

        if (source.current >= connection.threshold) {
          const normalizedSource = (source.current - connection.threshold) / (source.max - connection.threshold);
          influences[connection.target] += connection.weight * normalizedSource * this._couplingStrength;
        }

        this._connectionTimestamps.set(key, now);
      }
    }

    return influences;
  }

  private _computeCircadianInfluence(type: HormoneType): number {
    const hour = new Date().getHours();
    const minute = new Date().getMinutes();
    const totalMinutes = hour * 60 + minute;

    const phaseMap: Record<HormoneType, number> = {
      cortisol: this._cortisolCircadian(totalMinutes),
      oxytocin: this._oxytocinCircadian(totalMinutes),
      melatonin: this._melatoninCircadian(totalMinutes),
      adrenaline: this._adrenalineCircadian(totalMinutes),
    };

    return phaseMap[type];
  }

  private _cortisolCircadian(minutes: number): number {
    if (minutes >= 300 && minutes < 540) return 0.15;
    if (minutes >= 540 && minutes < 720) return 0.05;
    if (minutes >= 720 && minutes < 1200) return -0.05;
    if (minutes >= 1200 || minutes < 300) return -0.1;
    return 0;
  }

  private _oxytocinCircadian(minutes: number): number {
    if (minutes >= 900 && minutes < 1140) return 0.1;
    if (minutes >= 420 && minutes < 600) return 0.05;
    return -0.02;
  }

  private _melatoninCircadian(minutes: number): number {
    if (minutes >= 1080 || minutes < 420) return 0.2;
    if (minutes >= 900 && minutes < 1080) return 0.1;
    if (minutes >= 420 && minutes < 600) return -0.1;
    return -0.05;
  }

  private _adrenalineCircadian(minutes: number): number {
    if (minutes >= 420 && minutes < 600) return 0.1;
    if (minutes >= 900 && minutes < 1080) return 0.05;
    if (minutes >= 0 && minutes < 300) return -0.1;
    return -0.03;
  }

  private _computeIntegral(type: HormoneType): number {
    const hormone = this._hormones[type];
    return hormone.target - hormone.current;
  }

  private _updateStability(): void {
    let totalDeviation = 0;
    let maxDeviation = 0;

    for (const hormone of Object.values(this._hormones)) {
      const deviation = Math.abs(hormone.current - hormone.target) / (hormone.max - hormone.min);
      totalDeviation += deviation;
      maxDeviation = Math.max(maxDeviation, deviation);
    }

    const avgDeviation = totalDeviation / 4;
    const stability = 1 - (0.7 * avgDeviation + 0.3 * maxDeviation);

    this._stabilityHistory.push(stability);
    if (this._stabilityHistory.length > 100) {
      this._stabilityHistory.shift();
    }
  }

  setTarget(type: HormoneType, value: number): void {
    const hormone = this._hormones[type];
    hormone.target = Math.max(hormone.min, Math.min(hormone.max, value));
  }

  adjustProduction(type: HormoneType, delta: number): void {
    const hormone = this._hormones[type];
    hormone.productionRate = Math.max(0, Math.min(1, hormone.productionRate + delta));
  }

  inject(type: HormoneType, amount: number): void {
    const hormone = this._hormones[type];
    hormone.current = Math.min(hormone.max, hormone.current + amount);
  }

  getState(): SystemState {
    const avgStability = this._stabilityHistory.length > 0
      ? this._stabilityHistory.reduce((a, b) => a + b, 0) / this._stabilityHistory.length
      : 1;

    return {
      hormones: { ...this._hormones },
      stabilityScore: avgStability,
      isBalanced: avgStability > 0.7,
      cyclePhase: this._cyclePhase,
      lastUpdate: this._lastUpdate,
    };
  }

  getCouplingMatrix(): CouplingMatrix {
    const matrix: CouplingMatrix = {
      cortisol: { cortisol: 0, oxytocin: 0, melatonin: 0, adrenaline: 0 },
      oxytocin: { cortisol: 0, oxytocin: 0, melatonin: 0, adrenaline: 0 },
      melatonin: { cortisol: 0, oxytocin: 0, melatonin: 0, adrenaline: 0 },
      adrenaline: { cortisol: 0, oxytocin: 0, melatonin: 0, adrenaline: 0 },
    };

    for (const connection of this._feedbackConnections) {
      matrix[connection.source][connection.target] = connection.weight;
    }

    return matrix;
  }

  setCouplingStrength(strength: number): void {
    this._couplingStrength = Math.max(0, Math.min(1, strength));
  }

  setDecayRate(type: HormoneType, rate: number): void {
    const hormone = this._hormones[type];
    hormone.decayRate = Math.max(0, Math.min(0.1, rate));
  }

  get hormoneLevels(): Record<HormoneType, number> {
    return {
      cortisol: this._hormones.cortisol.current,
      oxytocin: this._hormones.oxytocin.current,
      melatonin: this._hormones.melatonin.current,
      adrenaline: this._hormones.adrenaline.current,
    };
  }

  get stabilityScore(): number {
    if (this._stabilityHistory.length === 0) return 1;
    return this._stabilityHistory[this._stabilityHistory.length - 1];
  }

  get isBalanced(): boolean {
    return this.stabilityScore > 0.7;
  }

  simulateStep(steps: number = 100, deltaTime: number = 100): SystemState[] {
    const states: SystemState[] = [];

    for (let i = 0; i < steps; i++) {
      this.update(deltaTime);
      states.push(this.getState());
    }

    return states;
  }

  reset(): void {
    this._hormones = {
      cortisol: { type: 'cortisol', current: 0.2, target: 0.3, min: 0, max: 1, decayRate: 0.02, productionRate: 0.1 },
      oxytocin: { type: 'oxytocin', current: 0.5, target: 0.5, min: 0, max: 1, decayRate: 0.03, productionRate: 0.08 },
      melatonin: { type: 'melatonin', current: 0.1, target: 0.2, min: 0, max: 1, decayRate: 0.015, productionRate: 0.12 },
      adrenaline: { type: 'adrenaline', current: 0.15, target: 0.2, min: 0, max: 1, decayRate: 0.05, productionRate: 0.15 },
    };

    this._connectionTimestamps.clear();
    this._cyclePhase = 0;
    this._stabilityHistory = [];
    this._lastUpdate = Date.now();
  }
}