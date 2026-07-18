import { DataPacket, ParadoxResult, Signal } from '../shared/types';

export interface PredictabilityState {
  horizon: number;
  currentAccuracy: number;
  maxHorizon: number;
  complexity: number;
  informationDensity: number;
  timestamp: number;
}

export interface HorizonEstimate {
  lyapunovTime: number;
  informationDecayRate: number;
  predictionHorizon: number;
  confidenceDecay: number[];
}

export interface ComplexityMeasure {
  kolmogorovComplexity: number;
  logicalDepth: number;
  effectiveComplexity: number;
  sophistication: number;
}

export interface EmergentBoundary {
  upperEdge: number;
  lowerEdge: number;
  edgeOfChaos: number;
  phaseTransitionWidth: number;
}

export class ComplexityHorizon {
  private _timeSeries: number[];
  private _predictionHorizon: number;
  private _currentAccuracy: number;
  private _maxHorizon: number;
  private _informationDecayRate: number;
  private _history: PredictabilityState[];
  private _timeStep: number;
  private _lyapunovExponent: number;
  private _noiseFloor: number;
  private _compressionRatio: number;

  constructor() {
    this._timeSeries = [];
    this._predictionHorizon = 10;
    this._currentAccuracy = 0.9;
    this._maxHorizon = 100;
    this._informationDecayRate = 0.1;
    this._history = [];
    this._timeStep = 0;
    this._lyapunovExponent = 0.05;
    this._noiseFloor = 0.01;
    this._compressionRatio = 0.5;
  }

  get predictionHorizon(): number { return this._predictionHorizon; }
  get currentAccuracy(): number { return this._currentAccuracy; }
  get maxHorizon(): number { return this._maxHorizon; }
  get lyapunovExponent(): number { return this._lyapunovExponent; }
  get informationDecayRate(): number { return this._informationDecayRate; }

  public setLyapunovExponent(exponent: number): void {
    this._lyapunovExponent = Math.max(0, exponent);
  }

  public setNoiseFloor(floor: number): void {
    this._noiseFloor = Math.max(0, Math.min(1, floor));
  }

  public setMaxHorizon(horizon: number): void {
    this._maxHorizon = Math.max(1, horizon);
  }

  public addObservation(value: number): void {
    this._timeSeries.push(value);
    this._timeStep++;
    if (this._timeSeries.length > 1000) {
      this._timeSeries.shift();
    }
    this._updateHorizon();
    this._recordState();
  }

  private _updateHorizon(): void {
    if (this._timeSeries.length < 10) return;

    const recent = this._timeSeries.slice(-50);
    const autocorr = this._autocorrelation(recent);
    const decayTime = this._estimateDecayTime(autocorr);

    this._informationDecayRate = decayTime > 0 ? 1 / decayTime : 0.1;

    if (this._lyapunovExponent > 0) {
      const lyapunovHorizon = Math.log(1 / this._noiseFloor) / this._lyapunovExponent;
      this._predictionHorizon = Math.min(this._maxHorizon,
        Math.min(decayTime, lyapunovHorizon));
    } else {
      this._predictionHorizon = Math.min(this._maxHorizon, decayTime);
    }

    this._currentAccuracy = Math.exp(-this._informationDecayRate * this._predictionHorizon * 0.1);
  }

  private _autocorrelation(series: number[]): number[] {
    const n = series.length;
    const mean = series.reduce((a, b) => a + b, 0) / n;
    const variance = series.reduce((s, v) => s + (v - mean) ** 2, 0) / n;

    if (variance === 0) return new Array(n).fill(1);

    const result: number[] = [];
    for (let lag = 0; lag < Math.floor(n / 2); lag++) {
      let cov = 0;
      for (let i = 0; i < n - lag; i++) {
        cov += (series[i] - mean) * (series[i + lag] - mean);
      }
      result.push(cov / ((n - lag) * variance));
    }
    return result;
  }

  private _estimateDecayTime(autocorr: number[]): number {
    const threshold = 1 / Math.E;
    for (let i = 0; i < autocorr.length; i++) {
      if (autocorr[i] < threshold) {
        return i;
      }
    }
    return autocorr.length;
  }

  public estimateHorizon(): HorizonEstimate {
    const lyapunovTime = this._lyapunovExponent > 0 ? 1 / this._lyapunovExponent : Infinity;

    const confidenceDecay: number[] = [];
    for (let t = 0; t <= this._maxHorizon; t += 5) {
      const decay = Math.exp(-this._informationDecayRate * t);
      confidenceDecay.push(decay);
    }

    return {
      lyapunovTime: isFinite(lyapunovTime) ? lyapunovTime : this._maxHorizon,
      informationDecayRate: this._informationDecayRate,
      predictionHorizon: this._predictionHorizon,
      confidenceDecay
    };
  }

  public predict(steps: number): { predictions: number[]; confidence: number[] } {
    if (this._timeSeries.length < 5) {
      return { predictions: [], confidence: [] };
    }

    const recent = this._timeSeries.slice(-20);
    const predictions: number[] = [];
    const confidence: number[] = [];

    let lastValue = recent[recent.length - 1];
    let trend = 0;
    if (recent.length >= 2) {
      trend = recent[recent.length - 1] - recent[recent.length - 2];
    }

    for (let t = 0; t < steps; t++) {
      const noise = (Math.random() * 2 - 1) * this._noiseFloor * (1 + t * 0.1);
      lastValue += trend * 0.5 + noise;
      predictions.push(lastValue);

      const conf = Math.exp(-this._informationDecayRate * (t + 1));
      confidence.push(Math.max(0, conf));
    }

    return { predictions, confidence };
  }

  public kolmogorovComplexity(data: string): number {
    let compressed = 0;
    let i = 0;
    while (i < data.length) {
      let maxRepeat = 0;
      for (let j = 0; j < i; j++) {
        let repeat = 0;
        while (i + repeat < data.length && data[j + repeat] === data[i + repeat]) {
          repeat++;
          if (j + repeat >= i) break;
        }
        if (repeat > maxRepeat) maxRepeat = repeat;
      }
      if (maxRepeat > 2) {
        compressed += Math.log2(i) + Math.log2(maxRepeat);
        i += maxRepeat;
      } else {
        compressed += 8;
        i++;
      }
    }
    return compressed;
  }

  public estimateEffectiveComplexity(series: number[]): ComplexityMeasure {
    const dataStr = series.map(v => Math.floor(v * 1000).toString()).join(',');
    const rawSize = dataStr.length * 8;
    const compressed = this.kolmogorovComplexity(dataStr);

    this._compressionRatio = rawSize > 0 ? compressed / rawSize : 1;

    const logicalDepth = this._estimateLogicalDepth(series);
    const sophistication = this._estimateSophistication(series);

    return {
      kolmogorovComplexity: compressed,
      logicalDepth,
      effectiveComplexity: compressed * (1 - this._compressionRatio),
      sophistication
    };
  }

  private _estimateLogicalDepth(series: number[]): number {
    let complexity = 0;
    for (let i = 1; i < series.length; i++) {
      const diff = Math.abs(series[i] - series[i - 1]);
      if (diff > this._noiseFloor) {
        complexity++;
      }
    }
    return complexity;
  }

  private _estimateSophistication(series: number[]): number {
    const fft = this._approximateSpectrum(series);
    let entropy = 0;
    const total = fft.reduce((a, b) => a + b, 0);

    if (total === 0) return 0;

    for (const power of fft) {
      if (power > 0) {
        const p = power / total;
        entropy -= p * Math.log(p);
      }
    }

    return entropy / Math.log(fft.length);
  }

  private _approximateSpectrum(series: number[]): number[] {
    const n = series.length;
    const spectrum: number[] = [];
    const mean = series.reduce((a, b) => a + b, 0) / n;

    for (let k = 0; k < Math.floor(n / 2); k++) {
      let real = 0;
      let imag = 0;
      for (let t = 0; t < n; t++) {
        const angle = 2 * Math.PI * k * t / n;
        real += (series[t] - mean) * Math.cos(angle);
        imag += (series[t] - mean) * Math.sin(angle);
      }
      spectrum.push(Math.sqrt(real * real + imag * imag));
    }

    return spectrum;
  }

  public findEdgeOfChaos(
    controlParameter: number[],
    complexity: number[]
  ): EmergentBoundary {
    if (controlParameter.length < 3 || complexity.length < 3) {
      return { upperEdge: 0, lowerEdge: 0, edgeOfChaos: 0, phaseTransitionWidth: 0 };
    }

    let maxComplexity = 0;
    let edgeIndex = 0;
    for (let i = 0; i < complexity.length; i++) {
      if (complexity[i] > maxComplexity) {
        maxComplexity = complexity[i];
        edgeIndex = i;
      }
    }

    const threshold = maxComplexity * 0.5;

    let lowerEdge = controlParameter[0];
    for (let i = 0; i < edgeIndex; i++) {
      if (complexity[i] >= threshold) {
        lowerEdge = controlParameter[i];
        break;
      }
    }

    let upperEdge = controlParameter[controlParameter.length - 1];
    for (let i = controlParameter.length - 1; i > edgeIndex; i--) {
      if (complexity[i] >= threshold) {
        upperEdge = controlParameter[i];
        break;
      }
    }

    return {
      upperEdge,
      lowerEdge,
      edgeOfChaos: controlParameter[edgeIndex],
      phaseTransitionWidth: upperEdge - lowerEdge
    };
  }

  public informationHorizon(): ParadoxResult<number> {
    const horizon = this._predictionHorizon;
    const knowable = this._currentAccuracy;
    const unknowable = 1 - knowable;

    return {
      resolved: false,
      output: horizon,
      contradictionEnergy: unknowable,
      fuelUsed: knowable
    };
  }

  public calculateComputationalIrreducibility(steps: number): number {
    let irreducibility = 0;
    const series = this._timeSeries.slice(-steps);

    for (let i = 2; i < series.length; i++) {
      const predicted = 2 * series[i - 1] - series[i - 2];
      const error = Math.abs(series[i] - predicted);
      irreducibility += Math.min(1, error);
    }

    return series.length > 2 ? irreducibility / (series.length - 2) : 0;
  }

  public horizonToPacket(): DataPacket<Signal> {
    return {
      id: `complexity-horizon-${Date.now()}`,
      payload: {
        source: 'complexity-horizon',
        magnitude: this._predictionHorizon,
        entropy: 1 - this._currentAccuracy,
        timestamp: Date.now()
      },
      metadata: {
        createdAt: Date.now(),
        route: ['complexity', 'horizon'],
        priority: 0.7,
        phase: 'exploration'
      }
    };
  }

  private _recordState(): void {
    const state: PredictabilityState = {
      horizon: this._predictionHorizon,
      currentAccuracy: this._currentAccuracy,
      maxHorizon: this._maxHorizon,
      complexity: 1 - this._currentAccuracy,
      informationDensity: this._informationDecayRate,
      timestamp: this._timeStep
    };
    this._history.push(state);
  }

  public reset(): void {
    this._timeSeries = [];
    this._predictionHorizon = 10;
    this._currentAccuracy = 0.9;
    this._informationDecayRate = 0.1;
    this._history = [];
    this._timeStep = 0;
  }

  public getHistory(): PredictabilityState[] {
    return [...this._history];
  }

  public getTimeSeries(): number[] {
    return [...this._timeSeries];
  }
}
