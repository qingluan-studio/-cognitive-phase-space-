export interface AttentionHead {
  queryWeights: number[][];
  keyWeights: number[][];
  valueWeights: number[][];
}

export interface AttentionOutput {
  output: number[][];
  weights: number[][];
  entropy: number;
}

export class AttentionMechanism {
  private _embedDim: number;
  private _numHeads: number;
  private _seqLength: number;
  private _heads: AttentionHead[];
  private _history: AttentionOutput[];

  constructor(embedDim: number, numHeads: number = 1, seqLength: number = 10) {
    this._embedDim = embedDim;
    this._numHeads = numHeads;
    this._seqLength = seqLength;
    this._heads = [];
    this._history = [];
    const headDim = embedDim / numHeads;
    for (let h = 0; h < numHeads; h++) {
      this._heads.push({
        queryWeights: this._randomMatrix(embedDim, headDim),
        keyWeights: this._randomMatrix(embedDim, headDim),
        valueWeights: this._randomMatrix(embedDim, headDim)
      });
    }
  }

  get embedDim(): number { return this._embedDim; }
  get numHeads(): number { return this._numHeads; }
  get seqLength(): number { return this._seqLength; }
  get history(): AttentionOutput[] { return this._history; }

  private _randomMatrix(rows: number, cols: number): number[][] {
    return Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => (Math.random() * 2 - 1) / Math.sqrt(rows))
    );
  }

  private _matMul(A: number[][], B: number[][]): number[][] {
    const result: number[][] = [];
    for (let i = 0; i < A.length; i++) {
      result[i] = [];
      for (let j = 0; j < B[0].length; j++) {
        let sum = 0;
        for (let k = 0; k < B.length; k++) {
          sum += A[i][k] * B[k][j];
        }
        result[i][j] = sum;
      }
    }
    return result;
  }

  private _transpose(A: number[][]): number[][] {
    return A[0].map((_, j) => A.map(row => row[j]));
  }

  private _softmax(rows: number[][]): number[][] {
    return rows.map(row => {
      const maxVal = Math.max(...row);
      const exps = row.map(v => Math.exp(v - maxVal));
      const sumExps = exps.reduce((a, b) => a + b, 0);
      return exps.map(v => v / sumExps);
    });
  }

  private _scale(matrix: number[][], factor: number): number[][] {
    return matrix.map(row => row.map(v => v * factor));
  }

  public computeAttention(input: number[][]): AttentionOutput {
    const headDim = this._embedDim / this._numHeads;
    const allHeadOutputs: number[][][] = [];
    const allAttentionWeights: number[][][] = [];
    for (let h = 0; h < this._numHeads; h++) {
      const Q = this._matMul(input, this._heads[h].queryWeights);
      const K = this._matMul(input, this._heads[h].keyWeights);
      const V = this._matMul(input, this._heads[h].valueWeights);
      const KT = this._transpose(K);
      const scores = this._matMul(Q, KT);
      const scaledScores = this._scale(scores, 1 / Math.sqrt(headDim));
      const attentionWeights = this._softmax(scaledScores);
      const headOutput = this._matMul(attentionWeights, V);
      allHeadOutputs.push(headOutput);
      allAttentionWeights.push(attentionWeights);
    }
    const output = allHeadOutputs[0];
    const weights = allAttentionWeights[0];
    let entropy = 0;
    for (const row of weights) {
      for (const p of row) {
        if (p > 0) entropy -= p * Math.log2(p);
      }
    }
    entropy /= weights.length;
    const result: AttentionOutput = { output, weights, entropy };
    this._history.push(result);
    return result;
  }

  public computeCrossAttention(query: number[][], keyValue: number[][]): AttentionOutput {
    const headDim = this._embedDim / this._numHeads;
    const h = 0;
    const Q = this._matMul(query, this._heads[h].queryWeights);
    const K = this._matMul(keyValue, this._heads[h].keyWeights);
    const V = this._matMul(keyValue, this._heads[h].valueWeights);
    const KT = this._transpose(K);
    const scores = this._matMul(Q, KT);
    const scaledScores = this._scale(scores, 1 / Math.sqrt(headDim));
    const attentionWeights = this._softmax(scaledScores);
    const output = this._matMul(attentionWeights, V);
    let entropy = 0;
    for (const row of attentionWeights) {
      for (const p of row) {
        if (p > 0) entropy -= p * Math.log2(p);
      }
    }
    entropy /= attentionWeights.length;
    return { output, weights: attentionWeights, entropy };
  }

  public computeSparseAttention(input: number[][], sparsityPattern: number[][]): AttentionOutput {
    const headDim = this._embedDim / this._numHeads;
    const h = 0;
    const Q = this._matMul(input, this._heads[h].queryWeights);
    const K = this._matMul(input, this._heads[h].keyWeights);
    const V = this._matMul(input, this._heads[h].valueWeights);
    const KT = this._transpose(K);
    const scores = this._matMul(Q, KT);
    const maskedScores = scores.map((row, i) =>
      row.map((v, j) => sparsityPattern[i][j] > 0 ? v / Math.sqrt(headDim) : -1e9)
    );
    const attentionWeights = this._softmax(maskedScores);
    const output = this._matMul(attentionWeights, V);
    let entropy = 0;
    for (const row of attentionWeights) {
      for (const p of row) {
        if (p > 0) entropy -= p * Math.log2(p);
      }
    }
    entropy /= attentionWeights.length;
    return { output, weights: attentionWeights, entropy };
  }

  public computeLocalAttention(input: number[][], windowSize: number = 3): AttentionOutput {
    const pattern = Array.from({ length: input.length }, (_, i) =>
      Array.from({ length: input.length }, (_, j) => Math.abs(i - j) <= windowSize ? 1 : 0)
    );
    return this.computeSparseAttention(input, pattern);
  }

  public computeAttentionEntropy(weights: number[][]): number {
    let entropy = 0;
    for (const row of weights) {
      for (const p of row) {
        if (p > 0) entropy -= p * Math.log2(p);
      }
    }
    return entropy / weights.length;
  }

  public computeAttentionSparsity(weights: number[][], threshold: number = 0.01): number {
    let sparse = 0;
    let total = 0;
    for (const row of weights) {
      for (const p of row) {
        if (p < threshold) sparse++;
        total++;
      }
    }
    return total > 0 ? sparse / total : 0;
  }

  public getAttentionPattern(): number[][] {
    if (this._history.length === 0) return [];
    return this._history[this._history.length - 1].weights.map(row => [...row]);
  }

  public computeGradientWrtInput(outputGrad: number[][], input: number[][]): number[][] {
    const headDim = this._embedDim / this._numHeads;
    const h = 0;
    const Q = this._matMul(input, this._heads[h].queryWeights);
    const K = this._matMul(input, this._heads[h].keyWeights);
    const V = this._matMul(input, this._heads[h].valueWeights);
    const KT = this._transpose(K);
    const scores = this._matMul(Q, KT);
    const scaledScores = this._scale(scores, 1 / Math.sqrt(headDim));
    const attentionWeights = this._softmax(scaledScores);
    const dV = this._matMul(this._transpose(attentionWeights), outputGrad);
    const dW = this._matMul(outputGrad, this._transpose(V));
    const gradInput = this._matMul(dV, this._transpose(this._heads[h].valueWeights));
    return gradInput;
  }

  public visualizeAttention(tokens: string[]): string {
    if (this._history.length === 0) return '';
    const weights = this._history[this._history.length - 1].weights;
    let result = '';
    for (let i = 0; i < tokens.length; i++) {
      result += tokens[i] + ': ';
      for (let j = 0; j < tokens.length; j++) {
        result += weights[i][j].toFixed(2) + ' ';
      }
      result += '\n';
    }
    return result;
  }

  public resetHistory(): void {
    this._history = [];
  }

  public resetWeights(): void {
    const headDim = this._embedDim / this._numHeads;
    for (let h = 0; h < this._numHeads; h++) {
      this._heads[h] = {
        queryWeights: this._randomMatrix(this._embedDim, headDim),
        keyWeights: this._randomMatrix(this._embedDim, headDim),
        valueWeights: this._randomMatrix(this._embedDim, headDim)
      };
    }
    this._history = [];
  }

  public exportHeads(): AttentionHead[] {
    return this._heads.map(h => ({
      queryWeights: h.queryWeights.map(row => [...row]),
      keyWeights: h.keyWeights.map(row => [...row]),
      valueWeights: h.valueWeights.map(row => [...row])
    }));
  }
}
