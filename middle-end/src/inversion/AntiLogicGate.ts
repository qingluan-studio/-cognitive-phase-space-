export interface GateState {
  inputA: boolean;
  inputB: boolean;
  output: boolean;
  inversionDepth: number;
}

export type GateTruthTable = {
  a: boolean;
  b: boolean;
  normal: boolean;
  inverted: boolean;
};

export interface AntiLogicConfig {
  baseInversion: number;
  noiseLevel: number;
  feedbackGain: number;
}

export class AntiLogicGate {
  private _config: AntiLogicConfig;
  private _states: GateState[] = [];
  private _truthTable: GateTruthTable[] = [];
  private _state: Record<string, unknown> = {};
  private _entropyOfInputs: number = 0;
  private _markovChain: number[][] = [[0.5, 0.5], [0.5, 0.5]];
  private _currentState: number = 0;

  constructor(config: AntiLogicConfig) {
    this._config = config;
    this._buildTruthTable();
  }

  get stateCount(): number {
    return this._states.length;
  }

  get entropyOfInputs(): number {
    return this._entropyOfInputs;
  }

  private _buildTruthTable(): void {
    this._truthTable = [];
    for (const a of [false, true]) {
      for (const b of [false, true]) {
        const normal = a && b;
        const inverted = !(a && b);
        this._truthTable.push({ a, b, normal, inverted });
      }
    }
  }

  private _computeInputEntropy(inputs: boolean[]): void {
    const counts = [0, 0];
    for (const v of inputs) {
      counts[v ? 1 : 0]++;
    }
    const total = inputs.length;
    let entropy = 0;
    for (const c of counts) {
      const p = c / total;
      if (p > 0) {
        entropy -= p * Math.log2(p);
      }
    }
    this._entropyOfInputs = entropy;
  }

  private _stepMarkov(): number {
    const probs = this._markovChain[this._currentState];
    const roll = Math.random();
    let cum = 0;
    for (let i = 0; i < probs.length; i++) {
      cum += probs[i];
      if (roll <= cum) {
        this._currentState = i;
        return i;
      }
    }
    this._currentState = probs.length - 1;
    return this._currentState;
  }

  compute(inputA: boolean, inputB: boolean): GateState {
    const markovBit = this._stepMarkov() === 1;
    const noise = Math.random() < this._config.noiseLevel;
    const normal = inputA && inputB;
    const anti = !(inputA && inputB);
    const output = markovBit ? anti : (noise ? !normal : normal);
    const inversionDepth = this._config.baseInversion + (anti ? 1 : 0);
    const gateState: GateState = {
      inputA,
      inputB,
      output,
      inversionDepth,
    };
    this._states.push(gateState);
    if (this._states.length > 40) this._states.shift();
    this._computeInputEntropy(this._states.map((s) => s.inputA));
    this._state.lastComputed = { inputA, inputB, output };
    return gateState;
  }

  feedback(output: boolean): void {
    const gain = this._config.feedbackGain;
    if (output) {
      this._markovChain[0][1] = Math.min(1, this._markovChain[0][1] + gain);
      this._markovChain[0][0] = 1 - this._markovChain[0][1];
    } else {
      this._markovChain[1][0] = Math.min(1, this._markovChain[1][0] + gain);
      this._markovChain[1][1] = 1 - this._markovChain[1][0];
    }
  }

  invertAll(): void {
    for (const s of this._states) {
      s.output = !s.output;
    }
  }

  isStable(): boolean {
    if (this._states.length < 2) return true;
    const last = this._states[this._states.length - 1];
    const prev = this._states[this._states.length - 2];
    return last.output === prev.output;
  }

  oscillationFrequency(): number {
    if (this._states.length < 2) return 0;
    let changes = 0;
    for (let i = 1; i < this._states.length; i++) {
      if (this._states[i].output !== this._states[i - 1].output) {
        changes++;
      }
    }
    return changes / this._states.length;
  }

  computeMutualInformation(): number {
    if (this._states.length < 2) return 0;
    const x = this._states.map((s) => (s.inputA ? 1 : 0));
    const y = this._states.map((s) => (s.output ? 1 : 0));
    const joint: Record<string, number> = {};
    for (let i = 0; i < x.length; i++) {
      const key = `${x[i]},${y[i]}`;
      joint[key] = (joint[key] || 0) + 1;
    }
    let mi = 0;
    for (const key of Object.keys(joint)) {
      const pXY = joint[key] / x.length;
      const [vx, vy] = key.split(',').map(Number);
      const pX = x.filter((v) => v === vx).length / x.length;
      const pY = y.filter((v) => v === vy).length / y.length;
      if (pXY > 0 && pX > 0 && pY > 0) {
        mi += pXY * Math.log2(pXY / (pX * pY));
      }
    }
    return mi;
  }

  reset(): void {
    this._states = [];
    this._entropyOfInputs = 0;
    this._markovChain = [[0.5, 0.5], [0.5, 0.5]];
    this._currentState = 0;
    this._state = {};
  }

  report(): Record<string, unknown> {
    return {
      states: this._states.length,
      stable: this.isStable(),
      entropy: this._entropyOfInputs.toFixed(4),
      state: this._state,
      oscillationFreq: this.oscillationFrequency().toFixed(4),
      mutualInformation: this.computeMutualInformation().toFixed(4),
    };
  }
}
