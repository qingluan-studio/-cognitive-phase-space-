export interface MirrorSignifier {
  id: string;
  symbol: string;
  signified: string;
  chainPosition: number;
}

export type DesireVector = {
  lack: number;
  jouissance: number;
  objetA: string;
};

export interface LacanConfig {
  symbolicDensity: number;
  imaginaryThreshold: number;
  realTolerance: number;
}

export class LacanMirror {
  private _config: LacanConfig;
  private _signifiers: MirrorSignifier[] = [];
  private _desire: DesireVector | null = null;
  private _state: Record<string, unknown> = {};
  private _chainEntropy: number = 0;
  private _synchronicMatrix: number[][] = [];
  private _objetADistance: number = 0;

  constructor(config: LacanConfig) {
    this._config = config;
  }

  get signifierCount(): number {
    return this._signifiers.length;
  }

  get chainEntropy(): number {
    return this._chainEntropy;
  }

  get objetADistance(): number {
    return this._objetADistance;
  }

  private _computeChainEntropy(): void {
    const counts: Record<string, number> = {};
    for (const s of this._signifiers) {
      counts[s.symbol] = (counts[s.symbol] || 0) + 1;
    }
    const total = this._signifiers.length;
    let entropy = 0;
    for (const key of Object.keys(counts)) {
      const p = counts[key] / total;
      if (p > 0) {
        entropy -= p * Math.log2(p);
      }
    }
    this._chainEntropy = entropy;
  }

  private _updateSynchronicMatrix(): void {
    const n = this._signifiers.length;
    this._synchronicMatrix = [];
    for (let i = 0; i < n; i++) {
      const row: number[] = [];
      for (let j = 0; j < n; j++) {
        if (i === j) {
          row.push(1);
        } else {
          const overlap = this._signifiers[i].signified === this._signifiers[j].symbol ? 0.5 : 0;
          row.push(overlap);
        }
      }
      this._synchronicMatrix.push(row);
    }
  }

  registerSignifier(symbol: string, signified: string): MirrorSignifier {
    const signifier: MirrorSignifier = {
      id: `sig-${this._signifiers.length}`,
      symbol,
      signified,
      chainPosition: this._signifiers.length,
    };
    this._signifiers.push(signifier);
    if (this._signifiers.length > 30) this._signifiers.shift();
    this._computeChainEntropy();
    this._updateSynchronicMatrix();
    this._objetADistance = Math.sqrt(this._signifiers.length) / (1 + this._config.symbolicDensity);
    return signifier;
  }

  desireVector(): DesireVector {
    const lack = 1 - this._config.imaginaryThreshold;
    const jouissance = this._chainEntropy / (1 + this._signifiers.length * 0.1);
    const objetA = this._signifiers.length > 0
      ? this._signifiers[Math.floor(Math.random() * this._signifiers.length)].symbol
      : 'void';
    this._desire = { lack, jouissance, objetA };
    return this._desire;
  }

  isAlienated(): boolean {
    return this._signifiers.length > 0 && this._chainEntropy < 0.5;
  }

  isSplit(): boolean {
    return this._objetADistance > this._config.realTolerance;
  }

  metonymyChain(): string[] {
    return this._signifiers.map((s) => s.symbol);
  }

  metaphorAxis(): string[] {
    return this._signifiers.map((s) => s.signified);
  }

  computeSymbolicEfficiency(): number {
    if (this._signifiers.length === 0) return 0;
    return this._chainEntropy / Math.log2(this._signifiers.length + 1);
  }

  traceObjetA(): string | null {
    if (this._signifiers.length === 0) return null;
    const chain = this.metonymyChain();
    return chain[chain.length - 1];
  }

  reset(): void {
    this._signifiers = [];
    this._desire = null;
    this._chainEntropy = 0;
    this._synchronicMatrix = [];
    this._objetADistance = 0;
    this._state = {};
  }

  report(): Record<string, unknown> {
    return {
      signifiers: this._signifiers.length,
      desire: this._desire,
      alienated: this.isAlienated(),
      split: this.isSplit(),
      state: this._state,
      chainEntropy: this._chainEntropy.toFixed(4),
      symbolicEfficiency: this.computeSymbolicEfficiency().toFixed(4),
    };
  }
}
