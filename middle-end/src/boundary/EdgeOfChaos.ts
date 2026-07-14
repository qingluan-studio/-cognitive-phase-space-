export interface EdgeOfChaosData {
  readonly edgeId: string;
  orderParameter: number;
  entropyLevel: number;
  complexityIndex: number;
}

export interface PhaseReading {
  order: number;
  entropy: number;
  region: 'ordered' | 'chaotic' | 'edge';
  timestamp: number;
}

export class EdgeOfChaos {
  private _data: EdgeOfChaosData;
  private _readings: PhaseReading[] = [];
  private _adaptationRate: number = 0.1;
  private _emergenceEvents: number = 0;
  private _stabilityWindow: number = 0;
  private _cellularAutomaton: number[] = [];
  private _ruleTable: number[] = [];
  private _mutualInfoHistory: number[] = [];
  private _kolmogorovEstimate: number = 0;

  constructor(data: EdgeOfChaosData) {
    this._data = { ...data };
    this._initAutomaton();
  }

  get edgeId(): string {
    return this._data.edgeId;
  }

  get complexityIndex(): number {
    return this._data.complexityIndex;
  }

  get currentRegion(): 'ordered' | 'chaotic' | 'edge' {
    return this._classifyRegion(this._data.orderParameter, this._data.entropyLevel);
  }

  get kolmogorovComplexity(): number {
    return this._kolmogorovEstimate;
  }

  private _classifyRegion(order: number, entropy: number): 'ordered' | 'chaotic' | 'edge' {
    const ratio = entropy / (order + 0.001);
    if (ratio < 0.3) {
      return 'ordered';
    }
    if (ratio > 3) {
      return 'chaotic';
    }
    return 'edge';
  }

  private _initAutomaton(): void {
    this._cellularAutomaton = [];
    for (let i = 0; i < 64; i++) {
      this._cellularAutomaton.push(Math.random() < 0.5 ? 1 : 0);
    }
    this._ruleTable = [];
    for (let i = 0; i < 8; i++) {
      this._ruleTable.push(Math.random() < 0.5 ? 1 : 0);
    }
  }

  private _stepAutomaton(): void {
    const next: number[] = [];
    const n = this._cellularAutomaton.length;
    for (let i = 0; i < n; i++) {
      const left = this._cellularAutomaton[(i - 1 + n) % n];
      const center = this._cellularAutomaton[i];
      const right = this._cellularAutomaton[(i + 1) % n];
      const ruleIndex = left * 4 + center * 2 + right;
      next.push(this._ruleTable[ruleIndex] ?? 0);
    }
    this._cellularAutomaton = next;
  }

  private _computeShannonEntropy(bits: number[]): number {
    const counts = [0, 0];
    for (const b of bits) {
      counts[b]++;
    }
    let entropy = 0;
    for (const c of counts) {
      const p = c / bits.length;
      if (p > 0) {
        entropy -= p * Math.log2(p);
      }
    }
    return entropy;
  }

  private _computeMutualInfo(x: number[], y: number[]): number {
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

  private _estimateKolmogorov(source: number[]): number {
    let runLength = 0;
    let changes = 0;
    for (let i = 1; i < source.length; i++) {
      if (source[i] !== source[i - 1]) {
        changes++;
        runLength += 1;
      }
    }
    return changes + runLength / source.length;
  }

  public takeReading(timestamp: number): PhaseReading {
    this._stepAutomaton();
    const caEntropy = this._computeShannonEntropy(this._cellularAutomaton);
    const region = this._classifyRegion(this._data.orderParameter, this._data.entropyLevel);
    const reading: PhaseReading = {
      order: this._data.orderParameter,
      entropy: this._data.entropyLevel + caEntropy * 0.1,
      region,
      timestamp,
    };
    this._readings.push(reading);
    if (this._readings.length > 60) {
      this._readings.shift();
    }
    if (region === 'edge') {
      this._stabilityWindow++;
      if (this._stabilityWindow > 5) {
        this._emergenceEvents++;
        this._data.complexityIndex += 0.1;
      }
    } else {
      this._stabilityWindow = 0;
    }
    if (this._readings.length >= 2) {
      const prev = this._readings[this._readings.length - 2];
      const curr = this._readings[this._readings.length - 1];
      const mi = this._computeMutualInfo(
        [prev.order > 0.5 ? 1 : 0, prev.entropy > 0.5 ? 1 : 0],
        [curr.order > 0.5 ? 1 : 0, curr.entropy > 0.5 ? 1 : 0]
      );
      this._mutualInfoHistory.push(mi);
      if (this._mutualInfoHistory.length > 30) {
        this._mutualInfoHistory.shift();
      }
    }
    this._kolmogorovEstimate = this._estimateKolmogorov(this._cellularAutomaton);
    return reading;
  }

  public perturb(orderDelta: number, entropyDelta: number): void {
    this._data.orderParameter = Math.max(0, this._data.orderParameter + orderDelta);
    this._data.entropyLevel = Math.max(0, this._data.entropyLevel + entropyDelta);
  }

  public selfOrganize(): void {
    if (this.currentRegion === 'chaotic') {
      this._data.orderParameter += this._adaptationRate;
    } else if (this.currentRegion === 'ordered') {
      this._data.entropyLevel += this._adaptationRate;
    }
  }

  public tuneAdaptation(rate: number): void {
    this._adaptationRate = Math.max(0, Math.min(1, rate));
  }

  public detectEmergence(): boolean {
    const recent = this._readings.slice(-10);
    const edgeCount = recent.filter((r) => r.region === 'edge').length;
    return edgeCount >= 7;
  }

  public driftFromEdge(): number {
    if (this._readings.length === 0) {
      return 0;
    }
    const recent = this._readings[this._readings.length - 1];
    const idealRatio = 1.0;
    const actualRatio = recent.entropy / (recent.order + 0.001);
    return Math.abs(actualRatio - idealRatio);
  }

  public averageMutualInformation(): number {
    if (this._mutualInfoHistory.length === 0) {
      return 0;
    }
    return this._mutualInfoHistory.reduce((a, b) => a + b, 0) / this._mutualInfoHistory.length;
  }

  public edgeReport(): Record<string, unknown> {
    return {
      edgeId: this.edgeId,
      orderParameter: this._data.orderParameter.toFixed(3),
      entropyLevel: this._data.entropyLevel.toFixed(3),
      complexityIndex: this._data.complexityIndex.toFixed(3),
      currentRegion: this.currentRegion,
      emergenceEvents: this._emergenceEvents,
      stabilityWindow: this._stabilityWindow,
      readingCount: this._readings.length,
      drift: this.driftFromEdge().toFixed(3),
      kolmogorovEstimate: this._kolmogorovEstimate.toFixed(3),
      averageMutualInfo: this.averageMutualInformation().toFixed(4),
    };
  }
}
