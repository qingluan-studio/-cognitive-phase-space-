export interface JointDistribution {
  rows: string[];
  cols: string[];
  matrix: number[][];
}

export interface MutualInfoRecord {
  timestamp: number;
  mutualInfo: number;
  conditionalEntropyX: number;
  conditionalEntropyY: number;
  jointEntropy: number;
}

export class MutualInformation {
  private _jointMatrix: number[][];
  private _rowLabels: string[];
  private _colLabels: string[];
  private _marginalX: number[];
  private _marginalY: number[];
  private _mutualInfo: number;
  private _history: MutualInfoRecord[];
  private _entropyX: number;
  private _entropyY: number;
  private _jointEntropy: number;

  constructor(rows: number = 2, cols: number = 2) {
    this._rowLabels = [];
    this._colLabels = [];
    this._jointMatrix = this._initializeUniform(rows, cols);
    this._marginalX = new Array(rows).fill(1 / rows);
    this._marginalY = new Array(cols).fill(1 / cols);
    this._mutualInfo = 0;
    this._history = [];
    this._entropyX = Math.log2(rows);
    this._entropyY = Math.log2(cols);
    this._jointEntropy = this._entropyX + this._entropyY;
  }

  get mutualInfo(): number {
    return this._mutualInfo;
  }

  get entropyX(): number {
    return this._entropyX;
  }

  get entropyY(): number {
    return this._entropyY;
  }

  get jointEntropy(): number {
    return this._jointEntropy;
  }

  private _initializeUniform(rows: number, cols: number): number[][] {
    const mat: number[][] = [];
    for (let i = 0; i < rows; i++) {
      const row = new Array(cols).fill(1 / (rows * cols));
      mat.push(row);
    }
    return mat;
  }

  public setJointDistribution(matrix: number[][], rowLabels?: string[], colLabels?: string[]): void {
    this._jointMatrix = matrix.map(r => [...r]);
    if (rowLabels) this._rowLabels = [...rowLabels];
    if (colLabels) this._colLabels = [...colLabels];
    this._computeMarginals();
    this._computeEntropies();
    this._computeMutualInfo();
  }

  private _computeMarginals(): void {
    const rows = this._jointMatrix.length;
    const cols = this._jointMatrix[0].length;
    this._marginalX = new Array(rows).fill(0);
    this._marginalY = new Array(cols).fill(0);
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        this._marginalX[i] += this._jointMatrix[i][j];
        this._marginalY[j] += this._jointMatrix[i][j];
      }
    }
  }

  private _computeEntropies(): void {
    this._entropyX = this._computeEntropy(this._marginalX);
    this._entropyY = this._computeEntropy(this._marginalY);
    this._jointEntropy = 0;
    for (const row of this._jointMatrix) {
      for (const p of row) {
        if (p > 0) {
          this._jointEntropy -= p * Math.log2(p);
        }
      }
    }
  }

  private _computeEntropy(probs: number[]): number {
    let H = 0;
    for (const p of probs) {
      if (p > 0) {
        H -= p * Math.log2(p);
      }
    }
    return H;
  }

  private _computeMutualInfo(): void {
    this._mutualInfo = this._entropyX + this._entropyY - this._jointEntropy;
  }

  public computeConditionalEntropyXGivenY(): number {
    return this._jointEntropy - this._entropyY;
  }

  public computeConditionalEntropyYGivenX(): number {
    return this._jointEntropy - this._entropyX;
  }

  public computeVariationOfInformation(): number {
    return this._jointEntropy - this._mutualInfo;
  }

  public computeInformationDistance(): number {
    return this._entropyX + this._entropyY - 2 * this._mutualInfo;
  }

  public computeNormalizedMutualInfo(): number {
    const denom = Math.sqrt(this._entropyX * this._entropyY);
    return denom > 0 ? this._mutualInfo / denom : 0;
  }

  public computePointwiseMutualInfo(x: number, y: number): number {
    if (x < 0 || x >= this._jointMatrix.length || y < 0 || y >= this._jointMatrix[0].length) return 0;
    const pxy = this._jointMatrix[x][y];
    const px = this._marginalX[x];
    const py = this._marginalY[y];
    if (pxy === 0 || px === 0 || py === 0) return 0;
    return Math.log2(pxy / (px * py));
  }

  public computeTransferEntropy(sourceHistory: number[][], targetHistory: number[][]): number {
    let te = 0;
    for (let i = 0; i < sourceHistory.length; i++) {
      for (let j = 0; j < targetHistory.length; j++) {
        const p = sourceHistory[i][j] || 0;
        if (p > 0) {
          te += p * Math.log2((p + 1e-10) / (targetHistory[i][j] + 1e-10));
        }
      }
    }
    return te;
  }

  public computeInteractionInformation(xyz: number[][][]): number {
    let I = 0;
    for (const plane of xyz) {
      for (const row of plane) {
        for (const p of row) {
          if (p > 0) {
            I += p * Math.log2(p + 1e-10);
          }
        }
      }
    }
    return I;
  }

  public recordMutualInfo(): void {
    this._history.push({
      timestamp: Date.now(),
      mutualInfo: this._mutualInfo,
      conditionalEntropyX: this.computeConditionalEntropyXGivenY(),
      conditionalEntropyY: this.computeConditionalEntropyYGivenX(),
      jointEntropy: this._jointEntropy,
    });
    if (this._history.length > 200) this._history.shift();
  }

  public getHistory(): MutualInfoRecord[] {
    return this._history.map(h => ({ ...h }));
  }

  public getJointDistribution(): JointDistribution {
    return {
      rows: [...this._rowLabels],
      cols: [...this._colLabels],
      matrix: this._jointMatrix.map(r => [...r]),
    };
  }

  public computeTotalCorrelation(nVars: number): number {
    let sum = 0;
    for (const p of this._marginalX) {
      if (p > 0) sum += p * Math.log2(p + 1e-10);
    }
    return -sum - this._jointEntropy;
  }

  public computeDualTotalCorrelation(): number {
    return this._jointEntropy - Math.max(this._entropyX, this._entropyY);
  }

  public computeCoInformation(): number {
    return this._mutualInfo - this.computeDualTotalCorrelation();
  }

  public reset(): void {
    const rows = this._jointMatrix.length || 2;
    const cols = this._jointMatrix[0]?.length || 2;
    this._jointMatrix = this._initializeUniform(rows, cols);
    this._marginalX = new Array(rows).fill(1 / rows);
    this._marginalY = new Array(cols).fill(1 / cols);
    this._mutualInfo = 0;
    this._history = [];
    this._entropyX = Math.log2(rows);
    this._entropyY = Math.log2(cols);
    this._jointEntropy = this._entropyX + this._entropyY;
  }
}
