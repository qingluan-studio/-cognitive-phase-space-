export interface CompressionStats {
  originalSize: number;
  compressedSize: number;
  ratio: number;
  entropyBound: number;
}

export interface SymbolCode {
  symbol: string;
  code: string;
  frequency: number;
}

export class CompressionAlgorithm {
  private _frequencies: Map<string, number>;
  private _huffmanCodes: Map<string, string>;
  private _dictionary: Map<string, number>;
  private _originalSize: number;
  private _compressedSize: number;
  private _history: CompressionStats[];
  private _codebook: SymbolCode[];
  private _lz77Window: number;
  private _lz77Buffer: string;

  constructor() {
    this._frequencies = new Map();
    this._huffmanCodes = new Map();
    this._dictionary = new Map();
    this._originalSize = 0;
    this._compressedSize = 0;
    this._history = [];
    this._codebook = [];
    this._lz77Window = 4096;
    this._lz77Buffer = '';
  }

  get compressionRatio(): number {
    return this._originalSize > 0 ? this._compressedSize / this._originalSize : 1;
  }

  get originalSize(): number {
    return this._originalSize;
  }

  get compressedSize(): number {
    return this._compressedSize;
  }

  public analyzeFrequencies(data: string): void {
    this._frequencies.clear();
    this._originalSize = data.length * 8;
    for (const char of data) {
      this._frequencies.set(char, (this._frequencies.get(char) || 0) + 1);
    }
  }

  public buildHuffmanTree(): void {
    interface Node {
      symbol?: string;
      freq: number;
      left?: Node;
      right?: Node;
    }
    const nodes: Node[] = [];
    for (const [symbol, freq] of this._frequencies) {
      nodes.push({ symbol, freq });
    }
    while (nodes.length > 1) {
      nodes.sort((a, b) => a.freq - b.freq);
      const left = nodes.shift()!;
      const right = nodes.shift()!;
      nodes.push({ freq: left.freq + right.freq, left, right });
    }
    this._huffmanCodes.clear();
    this._codebook = [];
    if (nodes.length === 0) return;
    const traverse = (node: Node, code: string) => {
      if (node.symbol !== undefined) {
        this._huffmanCodes.set(node.symbol, code || '0');
        this._codebook.push({ symbol: node.symbol, code: code || '0', frequency: node.freq });
      } else {
        if (node.left) traverse(node.left, code + '0');
        if (node.right) traverse(node.right, code + '1');
      }
    };
    traverse(nodes[0], '');
  }

  public huffmanEncode(data: string): string {
    this.analyzeFrequencies(data);
    this.buildHuffmanTree();
    let encoded = '';
    for (const char of data) {
      encoded += this._huffmanCodes.get(char) || '';
    }
    this._compressedSize = encoded.length;
    const stats: CompressionStats = {
      originalSize: this._originalSize,
      compressedSize: this._compressedSize,
      ratio: this.compressionRatio,
      entropyBound: this._computeEntropyBound(),
    };
    this._history.push(stats);
    if (this._history.length > 200) this._history.shift();
    return encoded;
  }

  private _computeEntropyBound(): number {
    let entropy = 0;
    const total = Array.from(this._frequencies.values()).reduce((a, b) => a + b, 0);
    for (const freq of this._frequencies.values()) {
      const p = freq / total;
      entropy -= p * Math.log2(p);
    }
    return entropy * total;
  }

  public lz77Compress(data: string): Array<{ offset: number; length: number; next: string }> {
    const tokens: Array<{ offset: number; length: number; next: string }> = [];
    let i = 0;
    while (i < data.length) {
      let bestLength = 0;
      let bestOffset = 0;
      const windowStart = Math.max(0, i - this._lz77Window);
      for (let j = windowStart; j < i; j++) {
        let length = 0;
        while (i + length < data.length && data[j + length] === data[i + length] && length < 255) {
          length++;
        }
        if (length > bestLength) {
          bestLength = length;
          bestOffset = i - j;
        }
      }
      const nextChar = data[i + bestLength] || '';
      tokens.push({ offset: bestOffset, length: bestLength, next: nextChar });
      i += bestLength + 1;
    }
    return tokens;
  }

  public lz77Decompress(tokens: Array<{ offset: number; length: number; next: string }>): string {
    let result = '';
    for (const token of tokens) {
      const start = result.length - token.offset;
      for (let i = 0; i < token.length; i++) {
        result += result[start + i];
      }
      result += token.next;
    }
    return result;
  }

  public runLengthEncode(data: number[]): Array<{ value: number; count: number }> {
    const runs: Array<{ value: number; count: number }> = [];
    if (data.length === 0) return runs;
    let current = data[0];
    let count = 1;
    for (let i = 1; i < data.length; i++) {
      if (data[i] === current && count < 255) {
        count++;
      } else {
        runs.push({ value: current, count });
        current = data[i];
        count = 1;
      }
    }
    runs.push({ value: current, count });
    return runs;
  }

  public runLengthDecode(runs: Array<{ value: number; count: number }>): number[] {
    const data: number[] = [];
    for (const run of runs) {
      for (let i = 0; i < run.count; i++) {
        data.push(run.value);
      }
    }
    return data;
  }

  public arithmeticEncode(symbols: string[], probabilities: number[]): number {
    let low = 0;
    let high = 1;
    for (const sym of symbols) {
      const idx = Array.from(this._frequencies.keys()).indexOf(sym);
      if (idx < 0) continue;
      const p = probabilities[idx] || 1 / probabilities.length;
      const range = high - low;
      high = low + range * (idx + 1) / probabilities.length;
      low = low + range * idx / probabilities.length;
    }
    return (low + high) / 2;
  }

  public getHuffmanCodes(): SymbolCode[] {
    return this._codebook.map(c => ({ ...c }));
  }

  public getHistory(): CompressionStats[] {
    return this._history.map(h => ({ ...h }));
  }

  public computeKraftInequality(): number {
    let sum = 0;
    for (const code of this._codebook) {
      sum += Math.pow(2, -code.code.length);
    }
    return sum;
  }

  public isPrefixFree(): boolean {
    const codes = this._codebook.map(c => c.code).sort((a, b) => a.length - b.length);
    for (let i = 0; i < codes.length; i++) {
      for (let j = i + 1; j < codes.length; j++) {
        if (codes[j].startsWith(codes[i])) return false;
      }
    }
    return true;
  }

  public setLZ77Window(size: number): void {
    this._lz77Window = Math.max(1, size);
  }

  public reset(): void {
    this._frequencies.clear();
    this._huffmanCodes.clear();
    this._dictionary.clear();
    this._originalSize = 0;
    this._compressedSize = 0;
    this._history = [];
    this._codebook = [];
    this._lz77Buffer = '';
  }
}
