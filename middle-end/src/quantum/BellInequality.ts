export interface BellExperiment {
  settingA: number;
  settingB: number;
  correlation: number;
  sampleSize: number;
}

export interface CHSHResult {
  sValue: number;
  violated: boolean;
  confidence: number;
  localHiddenVariableBound: number;
}

export class BellInequality {
  private _correlations: BellExperiment[];
  private _settings: number[];
  private _sampleSize: number;
  private _detectionEfficiency: number;
  private _localityLoopHole: boolean;
  private _detectionLoopHole: boolean;
  private _history: CHSHResult[];
  private _hiddenVariableLambda: number;
  private _polarizationAngleA: number;
  private _polarizationAngleB: number;

  constructor() {
    this._correlations = [];
    this._settings = [0, Math.PI / 4, Math.PI / 2, 3 * Math.PI / 4];
    this._sampleSize = 10000;
    this._detectionEfficiency = 0.85;
    this._localityLoopHole = false;
    this._detectionLoopHole = false;
    this._history = [];
    this._hiddenVariableLambda = 0;
    this._polarizationAngleA = 0;
    this._polarizationAngleB = 0;
  }

  get sampleSize(): number {
    return this._sampleSize;
  }

  get detectionEfficiency(): number {
    return this._detectionEfficiency;
  }

  get localityLoopHoleClosed(): boolean {
    return !this._localityLoopHole;
  }

  get detectionLoopHoleClosed(): boolean {
    return !this._detectionLoopHole;
  }

  public setSettings(angles: number[]): void {
    if (angles.length < 4) return;
    this._settings = angles.slice(0, 4);
  }

  public setSampleSize(n: number): void {
    this._sampleSize = Math.max(100, n);
  }

  public computeQuantumCorrelation(thetaA: number, thetaB: number): number {
    return -Math.cos(thetaA - thetaB);
  }

  public computeClassicalCorrelation(thetaA: number, thetaB: number): number {
    const hiddenVars = this._generateHiddenVariables();
    let sum = 0;
    for (const lambda of hiddenVars) {
      const a = this._measureWithHiddenVar(thetaA, lambda);
      const b = this._measureWithHiddenVar(thetaB, lambda);
      sum += a * b;
    }
    return sum / hiddenVars.length;
  }

  private _generateHiddenVariables(): number[] {
    const vars: number[] = [];
    for (let i = 0; i < this._sampleSize; i++) {
      vars.push(Math.random() * 2 * Math.PI);
    }
    return vars;
  }

  private _measureWithHiddenVar(angle: number, lambda: number): number {
    const diff = Math.abs(angle - lambda);
    return Math.cos(diff) > 0 ? 1 : -1;
  }

  public runCHSHExperiment(): CHSHResult {
    const a0 = this._settings[0];
    const a1 = this._settings[1];
    const b0 = this._settings[2];
    const b1 = this._settings[3];
    const E00 = this._estimateCorrelation(a0, b0);
    const E01 = this._estimateCorrelation(a0, b1);
    const E10 = this._estimateCorrelation(a1, b0);
    const E11 = this._estimateCorrelation(a1, b1);
    const s = E00 - E01 + E10 + E11;
    const sValue = Math.abs(s);
    const violated = sValue > 2;
    const confidence = violated ? Math.min(1, (sValue - 2) / (2 * Math.sqrt(2) - 2)) : 0;
    const result: CHSHResult = {
      sValue,
      violated,
      confidence,
      localHiddenVariableBound: 2,
    };
    this._history.push(result);
    if (this._history.length > 200) this._history.shift();
    return result;
  }

  private _estimateCorrelation(thetaA: number, thetaB: number): number {
    let matches = 0;
    let total = 0;
    for (let i = 0; i < this._sampleSize; i++) {
      if (Math.random() > this._detectionEfficiency) {
        continue;
      }
      const lambda = Math.random() * 2 * Math.PI;
      const a = this._quantumMeasure(thetaA, lambda);
      const b = this._quantumMeasure(thetaB, lambda);
      matches += a * b;
      total++;
    }
    return total > 0 ? matches / total : 0;
  }

  private _quantumMeasure(angle: number, lambda: number): number {
    const probPlus = Math.cos((angle - lambda) / 2) ** 2;
    return Math.random() < probPlus ? 1 : -1;
  }

  public runQuantumCHSH(): CHSHResult {
    const a0 = this._settings[0];
    const a1 = this._settings[1];
    const b0 = this._settings[2];
    const b1 = this._settings[3];
    const E00 = this.computeQuantumCorrelation(a0, b0);
    const E01 = this.computeQuantumCorrelation(a0, b1);
    const E10 = this.computeQuantumCorrelation(a1, b0);
    const E11 = this.computeQuantumCorrelation(a1, b1);
    const s = E00 - E01 + E10 + E11;
    const sValue = Math.abs(s);
    return {
      sValue,
      violated: sValue > 2,
      confidence: 1.0,
      localHiddenVariableBound: 2,
    };
  }

  public computeTsirelsonBound(): number {
    return 2 * Math.sqrt(2);
  }

  public setPolarizationAngles(angleA: number, angleB: number): void {
    this._polarizationAngleA = angleA;
    this._polarizationAngleB = angleB;
  }

  public simulateEntangledPhotonPair(): { a: number; b: number } {
    const lambda = Math.random() * 2 * Math.PI;
    const a = this._quantumMeasure(this._polarizationAngleA, lambda);
    const b = this._quantumMeasure(this._polarizationAngleB, lambda + Math.PI);
    return { a, b };
  }

  public estimateDetectionLoopHole(): number {
    const requiredEfficiency = 2 / (1 + Math.sqrt(2));
    return this._detectionEfficiency / requiredEfficiency;
  }

  public setEfficiency(efficiency: number): void {
    this._detectionEfficiency = Math.max(0, Math.min(1, efficiency));
    this._detectionLoopHole = this._detectionEfficiency < (2 / (1 + Math.sqrt(2)));
  }

  public getOptimalAngles(): number[] {
    return [0, Math.PI / 4, Math.PI / 2, 3 * Math.PI / 4];
  }

  public computeFineGrainedCorrelation(settingCombo: number): number {
    const angles = this.getOptimalAngles();
    const a = angles[Math.floor(settingCombo / 2) % 2];
    const b = angles[settingCombo % 2 + 2];
    return this.computeQuantumCorrelation(a, b);
  }

  public getHistory(): CHSHResult[] {
    return this._history.map(h => ({ ...h }));
  }

  public reset(): void {
    this._correlations = [];
    this._settings = [0, Math.PI / 4, Math.PI / 2, 3 * Math.PI / 4];
    this._sampleSize = 10000;
    this._detectionEfficiency = 0.85;
    this._localityLoopHole = false;
    this._detectionLoopHole = false;
    this._history = [];
    this._hiddenVariableLambda = 0;
    this._polarizationAngleA = 0;
    this._polarizationAngleB = 0;
  }
}
