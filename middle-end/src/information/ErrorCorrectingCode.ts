export interface Codeword {
  bits: number[];
  weight: number;
  syndrome: number[];
}

export interface DecodeResult {
  decoded: number[];
  errorsCorrected: number;
  success: boolean;
}

export class ErrorCorrectingCode {
  private _generatorMatrix: number[][];
  private _parityCheckMatrix: number[][];
  private _codewords: Codeword[];
  private _codeLength: number;
  private _messageLength: number;
  private _minDistance: number;
  private _errorCapability: number;
  private _syndromeTable: Map<string, number[]>;
  private _history: DecodeResult[];

  constructor(n: number = 7, k: number = 4) {
    this._codeLength = n;
    this._messageLength = k;
    this._generatorMatrix = this._initializeGeneratorMatrix();
    this._parityCheckMatrix = this._initializeParityCheckMatrix();
    this._codewords = [];
    this._minDistance = 3;
    this._errorCapability = Math.floor((this._minDistance - 1) / 2);
    this._syndromeTable = new Map();
    this._history = [];
    this._generateCodewords();
    this._buildSyndromeTable();
  }

  get codeLength(): number {
    return this._codeLength;
  }

  get messageLength(): number {
    return this._messageLength;
  }

  get minDistance(): number {
    return this._minDistance;
  }

  get errorCapability(): number {
    return this._errorCapability;
  }

  private _initializeGeneratorMatrix(): number[][] {
    const G: number[][] = [];
    for (let i = 0; i < this._messageLength; i++) {
      const row = new Array(this._codeLength).fill(0);
      row[i] = 1;
      for (let j = this._messageLength; j < this._codeLength; j++) {
        row[j] = Math.random() < 0.5 ? 0 : 1;
      }
      G.push(row);
    }
    return G;
  }

  private _initializeParityCheckMatrix(): number[][] {
    const H: number[][] = [];
    for (let i = 0; i < this._codeLength - this._messageLength; i++) {
      const row = new Array(this._codeLength).fill(0);
      for (let j = 0; j < this._messageLength; j++) {
        row[j] = this._generatorMatrix[j][this._messageLength + i];
      }
      row[this._messageLength + i] = 1;
      H.push(row);
    }
    return H;
  }

  private _generateCodewords(): void {
    this._codewords = [];
    const total = Math.pow(2, this._messageLength);
    for (let i = 0; i < total; i++) {
      const message = new Array(this._messageLength).fill(0);
      let val = i;
      for (let j = this._messageLength - 1; j >= 0; j--) {
        message[j] = val % 2;
        val = Math.floor(val / 2);
      }
      const bits = this.encode(message);
      const weight = bits.reduce((sum, b) => sum + b, 0);
      const syndrome = this.computeSyndrome(bits);
      this._codewords.push({ bits, weight, syndrome });
    }
    this._computeMinDistance();
  }

  private _computeMinDistance(): void {
    let min = this._codeLength;
    for (let i = 0; i < this._codewords.length; i++) {
      for (let j = i + 1; j < this._codewords.length; j++) {
        const dist = this._hammingDistance(this._codewords[i].bits, this._codewords[j].bits);
        if (dist < min) min = dist;
      }
    }
    this._minDistance = min;
    this._errorCapability = Math.floor((min - 1) / 2);
  }

  private _hammingDistance(a: number[], b: number[]): number {
    let dist = 0;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) dist++;
    }
    return dist;
  }

  public encode(message: number[]): number[] {
    if (message.length !== this._messageLength) return [];
    const codeword = new Array(this._codeLength).fill(0);
    for (let j = 0; j < this._codeLength; j++) {
      let sum = 0;
      for (let i = 0; i < this._messageLength; i++) {
        sum += message[i] * this._generatorMatrix[i][j];
      }
      codeword[j] = sum % 2;
    }
    return codeword;
  }

  public computeSyndrome(received: number[]): number[] {
    const syndrome: number[] = [];
    for (const row of this._parityCheckMatrix) {
      let sum = 0;
      for (let i = 0; i < received.length; i++) {
        sum += received[i] * row[i];
      }
      syndrome.push(sum % 2);
    }
    return syndrome;
  }

  private _buildSyndromeTable(): void {
    this._syndromeTable.clear();
    for (let i = 0; i < this._codeLength; i++) {
      const errorPattern = new Array(this._codeLength).fill(0);
      errorPattern[i] = 1;
      const syndrome = this.computeSyndrome(errorPattern);
      this._syndromeTable.set(syndrome.join(','), errorPattern);
    }
  }

  public decode(received: number[]): DecodeResult {
    if (received.length !== this._codeLength) {
      return { decoded: [], errorsCorrected: 0, success: false };
    }
    const syndrome = this.computeSyndrome(received);
    const syndromeKey = syndrome.join(',');
    let errorsCorrected = 0;
    let corrected = [...received];
    if (this._syndromeTable.has(syndromeKey)) {
      const errorPattern = this._syndromeTable.get(syndromeKey)!;
      for (let i = 0; i < corrected.length; i++) {
        corrected[i] = (corrected[i] + errorPattern[i]) % 2;
      }
      errorsCorrected = errorPattern.reduce((sum, b) => sum + b, 0);
    }
    const success = this._isValidCodeword(corrected);
    const result: DecodeResult = { decoded: corrected, errorsCorrected, success };
    this._history.push(result);
    if (this._history.length > 200) this._history.shift();
    return result;
  }

  private _isValidCodeword(bits: number[]): boolean {
    const syndrome = this.computeSyndrome(bits);
    return syndrome.every(s => s === 0);
  }

  public addNoise(codeword: number[], errorProbability: number): number[] {
    const noisy = [...codeword];
    for (let i = 0; i < noisy.length; i++) {
      if (Math.random() < errorProbability) {
        noisy[i] = 1 - noisy[i];
      }
    }
    return noisy;
  }

  public simulateTransmission(message: number[], errorProb: number): DecodeResult {
    const codeword = this.encode(message);
    const received = this.addNoise(codeword, errorProb);
    return this.decode(received);
  }

  public computeCodeRate(): number {
    return this._messageLength / this._codeLength;
  }

  public computeHammingBound(): number {
    let sum = 0;
    for (let i = 0; i <= this._errorCapability; i++) {
      sum += this._binomial(this._codeLength, i);
    }
    return Math.pow(2, this._codeLength) / sum;
  }

  private _binomial(n: number, k: number): number {
    if (k > n) return 0;
    let res = 1;
    for (let i = 0; i < k; i++) {
      res *= (n - i) / (i + 1);
    }
    return res;
  }

  public getCodewords(): Codeword[] {
    return this._codewords.map(c => ({ bits: [...c.bits], weight: c.weight, syndrome: [...c.syndrome] }));
  }

  public getHistory(): DecodeResult[] {
    return this._history.map(h => ({ ...h }));
  }

  public computeSingletonBound(): number {
    return this._codeLength - this._messageLength + 1;
  }

  public computeGilbertVarshamovBound(): number {
    let sum = 0;
    for (let i = 0; i < this._minDistance - 1; i++) {
      sum += this._binomial(this._codeLength - 1, i);
    }
    return Math.pow(2, this._codeLength) / sum;
  }

  public reset(): void {
    this._generatorMatrix = this._initializeGeneratorMatrix();
    this._parityCheckMatrix = this._initializeParityCheckMatrix();
    this._codewords = [];
    this._minDistance = 3;
    this._errorCapability = 1;
    this._syndromeTable = new Map();
    this._history = [];
    this._generateCodewords();
    this._buildSyndromeTable();
  }
}
