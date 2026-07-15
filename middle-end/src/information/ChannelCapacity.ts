export interface ChannelMatrix {
  inputSymbols: string[];
  outputSymbols: string[];
  probabilities: number[][];
}

export interface CapacityRecord {
  inputDistribution: number[];
  mutualInformation: number;
  capacity: number;
}

export class ChannelCapacity {
  private _inputSymbols: string[];
  private _outputSymbols: string[];
  private _channelMatrix: number[][];
  private _inputDistribution: number[];
  private _mutualInformation: number;
  private _capacity: number;
  private _history: CapacityRecord[];
  private _noiseVariance: number;
  private _signalPower: number;
  private _bandwidth: number;

  constructor(inputSize: number = 2, outputSize: number = 2) {
    this._inputSymbols = [];
    this._outputSymbols = [];
    this._channelMatrix = this._initializeMatrix(inputSize, outputSize);
    this._inputDistribution = new Array(inputSize).fill(1 / inputSize);
    this._mutualInformation = 0;
    this._capacity = 0;
    this._history = [];
    this._noiseVariance = 1;
    this._signalPower = 1;
    this._bandwidth = 1;
  }

  get mutualInformation(): number {
    return this._mutualInformation;
  }

  get capacity(): number {
    return this._capacity;
  }

  get signalToNoiseRatio(): number {
    return this._signalPower / this._noiseVariance;
  }

  private _initializeMatrix(rows: number, cols: number): number[][] {
    const mat: number[][] = [];
    for (let i = 0; i < rows; i++) {
      const row = new Array(cols).fill(0);
      row[i % cols] = 0.9;
      for (let j = 0; j < cols; j++) {
        if (j !== i % cols) {
          row[j] = 0.1 / (cols - 1);
        }
      }
      mat.push(row);
    }
    return mat;
  }

  public setChannelMatrix(matrix: number[][], inputSymbols?: string[], outputSymbols?: string[]): void {
    this._channelMatrix = matrix.map(row => [...row]);
    if (inputSymbols) this._inputSymbols = [...inputSymbols];
    if (outputSymbols) this._outputSymbols = [...outputSymbols];
    this._computeMutualInformation();
  }

  private _computeOutputDistribution(): number[] {
    const cols = this._channelMatrix[0].length;
    const outputDist = new Array(cols).fill(0);
    for (let j = 0; j < cols; j++) {
      for (let i = 0; i < this._channelMatrix.length; i++) {
        outputDist[j] += this._inputDistribution[i] * this._channelMatrix[i][j];
      }
    }
    return outputDist;
  }

  private _computeMutualInformation(): void {
    const outputDist = this._computeOutputDistribution();
    let I = 0;
    for (let i = 0; i < this._channelMatrix.length; i++) {
      for (let j = 0; j < this._channelMatrix[0].length; j++) {
        const joint = this._inputDistribution[i] * this._channelMatrix[i][j];
        if (joint > 0 && outputDist[j] > 0) {
          I += joint * Math.log2(joint / (this._inputDistribution[i] * outputDist[j]));
        }
      }
    }
    this._mutualInformation = I;
  }

  public computeCapacityBlahutArimoto(epsilon: number = 1e-5, maxIter: number = 1000): number {
    const m = this._channelMatrix.length;
    const n = this._channelMatrix[0].length;
    let p = new Array(m).fill(1 / m);
    for (let iter = 0; iter < maxIter; iter++) {
      const q: number[][] = [];
      for (let j = 0; j < n; j++) {
        const denom = p.reduce((sum, pi, i) => sum + pi * this._channelMatrix[i][j], 0);
        const row: number[] = [];
        for (let i = 0; i < m; i++) {
          row.push(denom > 0 ? (p[i] * this._channelMatrix[i][j]) / denom : 0);
        }
        q.push(row);
      }
      const newP = new Array(m).fill(0);
      for (let i = 0; i < m; i++) {
        let sum = 0;
        for (let j = 0; j < n; j++) {
          sum += this._channelMatrix[i][j] * Math.log2(q[j][i] + 1e-10);
        }
        newP[i] = Math.exp(sum);
      }
      const norm = newP.reduce((a, b) => a + b, 0);
      const normalized = newP.map(v => v / norm);
      const diff = normalized.reduce((sum, v, i) => sum + Math.abs(v - p[i]), 0);
      p = normalized;
      if (diff < epsilon) break;
    }
    this._inputDistribution = p;
    this._computeMutualInformation();
    this._capacity = this._mutualInformation;
    return this._capacity;
  }

  public computeShannonCapacity(): number {
    const snr = this._signalPower / this._noiseVariance;
    return this._bandwidth * Math.log2(1 + snr);
  }

  public setGaussianChannelParameters(signalPower: number, noiseVariance: number, bandwidth: number): void {
    this._signalPower = Math.max(0, signalPower);
    this._noiseVariance = Math.max(1e-10, noiseVariance);
    this._bandwidth = Math.max(0, bandwidth);
  }

  public computeErrorProbability(): number {
    const snr = this._signalPower / this._noiseVariance;
    return 0.5 * Math.erfc(Math.sqrt(snr));
  }

  public computeRateDistortion(distortion: number): number {
    const sigma2 = this._noiseVariance;
    const D = Math.min(distortion, sigma2);
    if (D === 0) return Infinity;
    return 0.5 * Math.log2(sigma2 / D);
  }

  public setInputDistribution(dist: number[]): void {
    if (dist.length !== this._channelMatrix.length) return;
    const sum = dist.reduce((a, b) => a + b, 0);
    if (Math.abs(sum - 1) > 0.01) return;
    this._inputDistribution = [...dist];
    this._computeMutualInformation();
  }

  public getChannelMatrix(): number[][] {
    return this._channelMatrix.map(row => [...row]);
  }

  public getCapacityRecord(): CapacityRecord {
    return {
      inputDistribution: [...this._inputDistribution],
      mutualInformation: this._mutualInformation,
      capacity: this._capacity,
    };
  }

  public getHistory(): CapacityRecord[] {
    return this._history.map(h => ({ ...h }));
  }

  public recordCapacity(): void {
    this._history.push(this.getCapacityRecord());
    if (this._history.length > 200) this._history.shift();
  }

  public computeSymmetricCapacity(): number {
    const m = this._channelMatrix.length;
    const capacity = Math.log2(m) + this._channelMatrix[0].reduce((sum, p) => sum + p * Math.log2(p + 1e-10), 0);
    return Math.max(0, capacity);
  }

  public computeBinaryEntropy(p: number): number {
    if (p <= 0 || p >= 1) return 0;
    return -p * Math.log2(p) - (1 - p) * Math.log2(1 - p);
  }

  public computeBinaryChannelCapacity(errorProb: number): number {
    const H2 = this.computeBinaryEntropy(errorProb);
    return 1 - H2;
  }

  public reset(): void {
    const inputSize = this._channelMatrix.length || 2;
    const outputSize = this._channelMatrix[0]?.length || 2;
    this._channelMatrix = this._initializeMatrix(inputSize, outputSize);
    this._inputDistribution = new Array(inputSize).fill(1 / inputSize);
    this._mutualInformation = 0;
    this._capacity = 0;
    this._history = [];
    this._noiseVariance = 1;
    this._signalPower = 1;
    this._bandwidth = 1;
  }
}
