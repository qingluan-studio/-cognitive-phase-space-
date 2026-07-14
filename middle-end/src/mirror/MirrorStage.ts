export interface DevelopmentPhase {
  phase: number;
  recognition: number;
  motorCoordination: number;
  symbolicCapacity: number;
}

export type StageTransition = {
  from: number;
  to: number;
  thresholdCrossed: boolean;
  regressionRisk: number;
};

export interface MirrorStageConfig {
  phases: number;
  recognitionThreshold: number;
  motorThreshold: number;
  symbolicThreshold: number;
}

export class MirrorStage {
  private _config: MirrorStageConfig;
  private _phases: DevelopmentPhase[] = [];
  private _transitions: StageTransition[] = [];
  private _state: Record<string, unknown> = {};
  private _bifurcationDiagram: number[][] = [];
  private _orderParameter: number = 0;
  private _controlParameter: number = 0;

  constructor(config: MirrorStageConfig) {
    this._config = config;
    this._initPhases();
  }

  get phaseCount(): number {
    return this._phases.length;
  }

  get currentPhase(): DevelopmentPhase | null {
    return this._phases.length > 0 ? this._phases[this._phases.length - 1] : null;
  }

  get orderParameter(): number {
    return this._orderParameter;
  }

  private _initPhases(): void {
    this._phases = [];
    for (let i = 0; i < this._config.phases; i++) {
      this._phases.push({
        phase: i,
        recognition: 0,
        motorCoordination: 0,
        symbolicCapacity: 0,
      });
    }
  }

  private _computeOrderParameter(): void {
    const last = this.currentPhase;
    if (!last) return;
    this._orderParameter =
      (last.recognition + last.motorCoordination + last.symbolicCapacity) / 3;
  }

  private _logisticGrowth(r: number, x: number): number {
    return r * x * (1 - x);
  }

  advance(recognitionDelta: number, motorDelta: number, symbolicDelta: number): DevelopmentPhase {
    const current = this.currentPhase;
    if (!current) return { phase: 0, recognition: 0, motorCoordination: 0, symbolicCapacity: 0 };
    current.recognition = Math.min(1, current.recognition + recognitionDelta);
    current.motorCoordination = Math.min(1, current.motorCoordination + motorDelta);
    current.symbolicCapacity = Math.min(1, current.symbolicCapacity + symbolicDelta);
    this._controlParameter += 0.01;
    const nextPhaseValue = this._logisticGrowth(2 + this._controlParameter * 2, current.recognition);
    if (nextPhaseValue > 0.8 && current.phase < this._config.phases - 1) {
      const nextPhase = this._phases[current.phase + 1];
      const transition: StageTransition = {
        from: current.phase,
        to: nextPhase.phase,
        thresholdCrossed: true,
        regressionRisk: 1 - current.motorCoordination,
      };
      this._transitions.push(transition);
      if (this._transitions.length > 20) this._transitions.shift();
      this._state.lastTransition = transition;
    }
    this._computeOrderParameter();
    this._bifurcationDiagram.push([this._controlParameter, this._orderParameter]);
    if (this._bifurcationDiagram.length > 50) this._bifurcationDiagram.shift();
    return current;
  }

  currentStage(): number {
    const current = this.currentPhase;
    if (!current) return 0;
    if (current.symbolicCapacity >= this._config.symbolicThreshold) return 3;
    if (current.motorCoordination >= this._config.motorThreshold) return 2;
    if (current.recognition >= this._config.recognitionThreshold) return 1;
    return 0;
  }

  isRecognizing(): boolean {
    const current = this.currentPhase;
    return current ? current.recognition >= this._config.recognitionThreshold : false;
  }

  regressionProbability(): number {
    const lastTransition = this._transitions[this._transitions.length - 1];
    return lastTransition ? lastTransition.regressionRisk : 0;
  }

  computeBifurcationEntropy(): number {
    if (this._bifurcationDiagram.length === 0) return 0;
    const values = this._bifurcationDiagram.map(([, y]) => y);
    const bins = new Array(10).fill(0);
    for (const v of values) {
      const idx = Math.min(9, Math.floor(v * 10));
      bins[idx]++;
    }
    const total = values.length;
    let entropy = 0;
    for (const b of bins) {
      const p = b / total;
      if (p > 0) entropy -= p * Math.log2(p);
    }
    return entropy;
  }

  reset(): void {
    this._initPhases();
    this._transitions = [];
    this._bifurcationDiagram = [];
    this._orderParameter = 0;
    this._controlParameter = 0;
    this._state = {};
  }

  report(): Record<string, unknown> {
    return {
      phases: this._phases.length,
      currentStage: this.currentStage(),
      transitions: this._transitions.length,
      recognizing: this.isRecognizing(),
      state: this._state,
      orderParameter: this._orderParameter.toFixed(4),
      bifurcationEntropy: this.computeBifurcationEntropy().toFixed(4),
    };
  }
}
