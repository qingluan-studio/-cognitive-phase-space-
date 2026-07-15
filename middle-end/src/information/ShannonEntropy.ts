export interface ProbabilityDistribution {
  symbols: string[];
  probabilities: number[];
}

export interface EntropyRecord {
  timestamp: number;
  entropyValue: number;
  maxEntropy: number;
  redundancy: number;
}

export class ShannonEntropy {
  private _probabilities: number[];
  private _symbols: string[];
  private _entropy: number;
  private _maxEntropy: number;
  private _redundancy: number;
  private _history: EntropyRecord[];
  private _sourceRate: number;
  private _alphabetSize: number;
  private _conditionalProbabilities: number[][];

  constructor(alphabetSize: number = 2) {
    this._alphabetSize = Math.max(2, alphabetSize);
    this._symbols = [];
    this._probabilities = new Array(this._alphabetSize).fill(1 / this._alphabetSize);
    this._entropy = Math.log2(this._alphabetSize);
    this._maxEntropy = Math.log2(this._alphabetSize);
    this._redundancy = 0;
    this._history = [];
    this._sourceRate = 1;
    this._conditionalProbabilities = [];
  }

  get entropy(): number {
    return this._entropy;
  }

  get maxEntropy(): number {
    return this._maxEntropy;
  }

  get redundancy(): number {
    return this._redundancy;
  }

  get alphabetSize(): number {
    return this._alphabetSize;
  }

  public setDistribution(probabilities: number[], symbols?: string[]): void {
    if (probabilities.length !== this._alphabetSize) return;
    const sum = probabilities.reduce((a, b) => a + b, 0);
    if (Math.abs(sum - 1) > 0.01) return;
    this._probabilities = [...probabilities];
    if (symbols && symbols.length === this._alphabetSize) {
      this._symbols = [...symbols];
    }
    this._computeEntropy();
  }

  private _computeEntropy(): void {
    let H = 0;
    for (const p of this._probabilities) {
      if (p > 0) {
        H -= p * Math.log2(p);
      }
    }
    this._entropy = H;
    this._maxEntropy = Math.log2(this._alphabetSize);
    this._redundancy = this._maxEntropy > 0 ? 1 - this._entropy / this._maxEntropy : 0;
  }

  public computeJointEntropy(jointProbs: number[][]): number {
    let H = 0;
    for (const row of jointProbs) {
      for (const p of row) {
        if (p > 0) {
          H -= p * Math.log2(p);
        }
      }
    }
    return H;
  }

  public computeConditionalEntropy(givenProbs: number[][]): number {
    let H = 0;
    for (let i = 0; i < givenProbs.length; i++) {
      const pX = this._probabilities[i];
      for (const p of givenProbs[i]) {
        if (p > 0) {
          H -= pX * p * Math.log2(p);
        }
      }
    }
    return H;
  }

  public computeEntropyRate(order: number): number {
    return this._entropy / order;
  }

  public generateSourceSequence(length: number): string[] {
    const seq: string[] = [];
    for (let i = 0; i < length; i++) {
      const rand = Math.random();
      let cumulative = 0;
      let chosen = 0;
      for (let j = 0; j < this._alphabetSize; j++) {
        cumulative += this._probabilities[j];
        if (rand < cumulative) {
          chosen = j;
          break;
        }
      }
      seq.push(this._symbols[chosen] || String.fromCharCode(65 + chosen));
    }
    return seq;
  }

  public estimateEntropyFromSequence(sequence: string[]): number {
    const counts: Record<string, number> = {};
    for (const sym of sequence) {
      counts[sym] = (counts[sym] || 0) + 1;
    }
    let H = 0;
    const n = sequence.length;
    for (const sym of Object.keys(counts)) {
      const p = counts[sym] / n;
      H -= p * Math.log2(p);
    }
    return H;
  }

  public computeRelativeEntropy(other: number[]): number {
    if (other.length !== this._alphabetSize) return 0;
    let D = 0;
    for (let i = 0; i < this._alphabetSize; i++) {
      if (this._probabilities[i] > 0 && other[i] > 0) {
        D += this._probabilities[i] * Math.log2(this._probabilities[i] / other[i]);
      }
    }
    return D;
  }

  public computeCrossEntropy(other: number[]): number {
    if (other.length !== this._alphabetSize) return 0;
    let H = 0;
    for (let i = 0; i < this._alphabetSize; i++) {
      if (other[i] > 0) {
        H -= this._probabilities[i] * Math.log2(other[i]);
      }
    }
    return H;
  }

  public setConditionalProbabilities(matrix: number[][]): void {
    this._conditionalProbabilities = matrix.map(row => [...row]);
  }

  public computeMarkovEntropy(): number {
    if (this._conditionalProbabilities.length === 0) return this._entropy;
    let H = 0;
    for (let i = 0; i < this._alphabetSize; i++) {
      const row = this._conditionalProbabilities[i];
      let Hi = 0;
      for (const p of row) {
        if (p > 0) {
          Hi -= p * Math.log2(p);
        }
      }
      H += this._probabilities[i] * Hi;
    }
    return H;
  }

  public recordEntropy(): void {
    this._history.push({
      timestamp: Date.now(),
      entropyValue: this._entropy,
      maxEntropy: this._maxEntropy,
      redundancy: this._redundancy,
    });
    if (this._history.length > 200) this._history.shift();
  }

  public getHistory(): EntropyRecord[] {
    return this._history.map(h => ({ ...h }));
  }

  public computeTypicalSetSize(epsilon: number): number {
    return Math.pow(2, this._entropy + epsilon);
  }

  public computeAsymptoticEquipartition(n: number): { lower: number; upper: number } {
    const lower = Math.pow(2, n * (this._entropy - 0.1));
    const upper = Math.pow(2, n * (this._entropy + 0.1));
    return { lower, upper };
  }

  public getDistribution(): ProbabilityDistribution {
    return {
      symbols: [...this._symbols],
      probabilities: [...this._probabilities],
    };
  }

  public reset(): void {
    this._probabilities = new Array(this._alphabetSize).fill(1 / this._alphabetSize);
    this._entropy = Math.log2(this._alphabetSize);
    this._maxEntropy = Math.log2(this._alphabetSize);
    this._redundancy = 0;
    this._history = [];
    this._conditionalProbabilities = [];
  }
}
