export interface LogicGate {
  id: string;
  inputA: number;
  inputB: number;
  output: number;
  gateType: 'and' | 'or' | 'xor' | 'not';
}

export type LogicEvaluation = {
  correct: boolean;
  errorRate: number;
  throughput: number;
};

export interface PhotonLogicConfig {
  photonEnergy: number;
  noiseFloor: number;
  gateDelay: number;
}

export class PhotonLogic {
  private _config: PhotonLogicConfig;
  private _gates: LogicGate[] = [];
  private _evaluation: LogicEvaluation | null = null;
  private _state: Record<string, unknown> = {};
  private _photonStatistics: number[] = [];
  private _shotNoise: number = 0;
  private _fanOutMatrix: number[][] = [];

  constructor(config: PhotonLogicConfig) {
    this._config = config;
    this._initFanOut();
  }

  get gateCount(): number {
    return this._gates.length;
  }

  get shotNoise(): number {
    return this._shotNoise;
  }

  private _initFanOut(): void {
    this._fanOutMatrix = [];
    for (let i = 0; i < 4; i++) {
      const row: number[] = [];
      for (let j = 0; j < 4; j++) {
        row.push(i === j ? 1 : 0);
      }
      this._fanOutMatrix.push(row);
    }
  }

  private _computeShotNoise(intensity: number): number {
    return Math.sqrt(intensity);
  }

  private _evaluateGate(gate: LogicGate): number {
    const a = gate.inputA > this._config.noiseFloor ? 1 : 0;
    const b = gate.inputB > this._config.noiseFloor ? 1 : 0;
    switch (gate.gateType) {
      case 'and': return a & b;
      case 'or': return a | b;
      case 'xor': return a ^ b;
      case 'not': return a ? 0 : 1;
      default: return 0;
    }
  }

  addGate(id: string, type: 'and' | 'or' | 'xor' | 'not', inputA: number, inputB: number = 0): LogicGate {
    const gate: LogicGate = { id, inputA, inputB, output: 0, gateType: type };
    gate.output = this._evaluateGate(gate);
    this._gates.push(gate);
    if (this._gates.length > 30) this._gates.shift();
    this._shotNoise = this._computeShotNoise(inputA + inputB);
    this._photonStatistics.push(inputA + inputB);
    if (this._photonStatistics.length > 30) this._photonStatistics.shift();
    return gate;
  }

  evaluateAll(): LogicEvaluation {
    let errors = 0;
    let totalThroughput = 0;
    for (const gate of this._gates) {
      const expected = this._evaluateGate(gate);
      const noisyOutput = Math.random() < this._config.noiseFloor ? 1 - expected : expected;
      if (noisyOutput !== expected) errors++;
      totalThroughput += this._config.photonEnergy / (this._config.gateDelay + 0.001);
    }
    const errorRate = this._gates.length > 0 ? errors / this._gates.length : 0;
    const correct = errors === 0;
    this._evaluation = { correct, errorRate, throughput: totalThroughput };
    return this._evaluation;
  }

  isCorrect(): boolean {
    return this.evaluateAll().correct;
  }

  fanOut(gateId: string, targets: number): number[] {
    const gate = this._gates.find((g) => g.id === gateId);
    if (!gate) return [];
    const outputs: number[] = [];
    for (let i = 0; i < targets; i++) {
      const attenuated = gate.output * (1 / (i + 1));
      outputs.push(attenuated > this._config.noiseFloor ? 1 : 0);
    }
    return outputs;
  }

  computePhotonStatistics(): { mean: number; variance: number } {
    if (this._photonStatistics.length === 0) return { mean: 0, variance: 0 };
    const mean = this._photonStatistics.reduce((a, b) => a + b, 0) / this._photonStatistics.length;
    const variance = this._photonStatistics.reduce((a, b) => a + (b - mean) * (b - mean), 0) / this._photonStatistics.length;
    return { mean, variance };
  }

  reset(): void {
    this._gates = [];
    this._evaluation = null;
    this._photonStatistics = [];
    this._shotNoise = 0;
    this._state = {};
  }

  report(): Record<string, unknown> {
    const stats = this.computePhotonStatistics();
    return {
      gates: this._gates.length,
      evaluation: this._evaluation,
      state: this._state,
      shotNoise: this._shotNoise.toFixed(4),
      photonMean: stats.mean.toFixed(4),
      photonVariance: stats.variance.toFixed(4),
    };
  }
}
