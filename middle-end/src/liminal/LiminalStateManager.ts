export interface StressSnapshot {
  load: number;
  temperature: number;
  contradiction: number;
  timestamp: number;
  lyapunov: number;
  criticalSlowing: number;
}

export type LiminalZone = 'stable' | 'edge' | 'collapse' | 'recovery';

export interface CreativityBurst {
  id: string;
  intensity: number;
  triggeredAt: number;
  source: string;
  edgeDistance: number;
}

export class LiminalStateManager {
  private _load: number = 0.2;
  private _temperature: number = 0.3;
  private _contradiction: number = 0.1;
  private _zone: LiminalZone = 'stable';
  private _bursts: CreativityBurst[] = [];
  private _maxStress: number = 0.92;
  private _edgeLower: number = 0.8;
  private _history: StressSnapshot[] = [];
  private _maxHistory: number = 64;
  private _sandpileGrains: number = 0;
  private _sandpileCritical: number = 100;
  private _recoveryRate: number = 0.02;

  increaseStress(delta: number): StressSnapshot {
    const coupledDelta = this._coupledResponse(delta);
    this._load = Math.min(1, Math.max(0, this._load + coupledDelta * 0.4));
    this._temperature = Math.min(1, Math.max(0, this._temperature + coupledDelta * 0.3));
    this._contradiction = Math.min(1, Math.max(0, this._contradiction + coupledDelta * 0.3));
    this._sandpileGrains += delta * this._sandpileCritical;
    if (this._sandpileGrains >= this._sandpileCritical) {
      this._avalanche();
    }
    const snap = this.snapshot();
    this._history.push(snap);
    if (this._history.length > this._maxHistory) this._history.shift();
    this._updateZone();
    return snap;
  }

  decreaseStress(delta: number): StressSnapshot {
    this._load = Math.max(0, this._load - delta * 0.4);
    this._temperature = Math.max(0, this._temperature - delta * 0.3);
    this._contradiction = Math.max(0, this._contradiction - delta * 0.3);
    this._sandpileGrains = Math.max(0, this._sandpileGrains - delta * this._sandpileCritical);
    const snap = this.snapshot();
    this._history.push(snap);
    if (this._history.length > this._maxHistory) this._history.shift();
    this._updateZone();
    return snap;
  }

  snapshot(): StressSnapshot {
    return {
      load: this._load,
      temperature: this._temperature,
      contradiction: this._contradiction,
      timestamp: Date.now(),
      lyapunov: this._lyapunovExponent(),
      criticalSlowing: this._criticalSlowing(),
    };
  }

  checkEdge(): boolean {
    const stress = this._aggregateStress();
    return stress >= this._edgeLower && stress < this._maxStress;
  }

  provokeCreativity(source: string): CreativityBurst | null {
    if (!this.checkEdge()) return null;
    const stress = this._aggregateStress();
    const edgeDistance = Math.min(1, Math.abs(stress - (this._edgeLower + this._maxStress) / 2) / ((this._maxStress - this._edgeLower) / 2));
    const intensity = stress * (1 + this._lyapunovExponent() * 0.5);
    const burst: CreativityBurst = {
      id: `burst-${Date.now()}`,
      intensity: Math.min(1, intensity),
      triggeredAt: Date.now(),
      source,
      edgeDistance,
    };
    this._bursts.push(burst);
    return burst;
  }

  stabilize(): void {
    const stress = this._aggregateStress();
    if (stress >= this._maxStress) {
      this._zone = 'collapse';
      this.decreaseStress(0.2);
      this._zone = 'recovery';
    } else if (this._zone === 'recovery' && stress < 0.5) {
      this._zone = 'stable';
    } else if (this.checkEdge()) {
      const target = (this._edgeLower + this._maxStress) / 2;
      const diff = target - stress;
      if (Math.abs(diff) > 0.02) {
        if (diff > 0) this.increaseStress(this._recoveryRate);
        else this.decreaseStress(this._recoveryRate);
      }
      this._zone = 'edge';
    }
  }

  get zone(): LiminalZone {
    return this._zone;
  }

  get stressLevel(): number {
    return this._aggregateStress();
  }

  get lyapunovExponent(): number {
    return this._lyapunovExponent();
  }

  getBursts(): CreativityBurst[] {
    return [...this._bursts];
  }

  private _coupledResponse(delta: number): number {
    const stress = this._aggregateStress();
    const feedback = Math.pow(stress, 2);
    return delta * (1 + feedback * 0.5);
  }

  private _aggregateStress(): number {
    return (this._load + this._temperature + this._contradiction) / 3;
  }

  private _updateZone(): void {
    const s = this._aggregateStress();
    if (s >= this._maxStress) this._zone = 'collapse';
    else if (s >= this._edgeLower) this._zone = 'edge';
    else if (this._zone === 'collapse') this._zone = 'recovery';
    else this._zone = 'stable';
  }

  private _lyapunovExponent(): number {
    if (this._history.length < 4) return 0;
    const values = this._history.map(h => this._snapshotStress(h));
    const n = values.length;
    let divergenceSum = 0;
    let pairs = 0;
    for (let i = 1; i < n; i++) {
      const diff = Math.abs(values[i] - values[i - 1]);
      if (diff > 1e-10) {
        divergenceSum += Math.log(diff / Math.max(1e-10, Math.abs(values[i - 1])));
        pairs++;
      }
    }
    if (pairs === 0) return 0;
    const lambda = divergenceSum / pairs;
    return Math.max(-2, Math.min(2, lambda));
  }

  private _criticalSlowing(): number {
    if (this._history.length < 8) return 0;
    const values = this._history.slice(-16).map(h => this._snapshotStress(h));
    if (values.length < 4) return 0;
    let autocorr = 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    let variance = 0;
    for (const v of values) variance += (v - mean) ** 2;
    variance /= values.length;
    if (variance === 0) return 0;
    for (let i = 1; i < values.length; i++) {
      autocorr += (values[i] - mean) * (values[i - 1] - mean);
    }
    autocorr /= (values.length - 1) * variance;
    return Math.max(0, Math.min(1, autocorr));
  }

  private _snapshotStress(s: StressSnapshot): number {
    return (s.load + s.temperature + s.contradiction) / 3;
  }

  private _avalanche(): void {
    const size = Math.random() * 0.3;
    this._temperature = Math.min(1, this._temperature + size);
    this._sandpileGrains = this._sandpileGrains * 0.6;
    if (this._sandpileGrains >= this._sandpileCritical * 0.8) {
      this._avalanche();
    }
  }
}
