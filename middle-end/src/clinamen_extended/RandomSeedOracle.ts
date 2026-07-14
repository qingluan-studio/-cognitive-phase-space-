export interface SeedProphecy {
  seed: number;
  fragments: string[];
  confidence: number;
  chiSquare: number;
  markovTransition: number;
  decodedAt: number;
}

export interface BitPattern {
  seed: number;
  bits: string;
  parity: 'even' | 'odd';
  entropy: number;
  runs: number;
  longestRun: number;
}

export class RandomSeedOracle {
  private _prophecies: SeedProphecy[] = [];
  private _glyphTable: Map<number, string> = new Map([
    [0, 'void'], [1, 'spark'], [2, 'turn'], [3, 'echo'],
    [4, 'fold'], [5, 'breach'], [6, 'bind'], [7, 'release'],
    [8, 'rise'], [9, 'fall'],
  ]);
  private _maxHistory = 100;
  private _markovChain: Map<string, number> = new Map();

  generateSeed(): number {
    return Math.floor(Math.random() * 0xffffffff) >>> 0;
  }

  analyzeBits(seed: number): BitPattern {
    const bits = (seed >>> 0).toString(2).padStart(32, '0');
    let ones = 0;
    let runs = 0;
    let longestRun = 0;
    let currentRun = 0;
    let lastBit: string | null = null;
    for (const bit of bits) {
      if (bit === '1') {
        ones++;
        currentRun++;
        longestRun = Math.max(longestRun, currentRun);
      } else {
        currentRun = 0;
      }
      if (bit !== lastBit) {
        runs++;
        lastBit = bit;
      }
    }
    const entropy = ones / bits.length;
    return { seed, bits, parity: ones % 2 === 0 ? 'even' : 'odd', entropy, runs, longestRun };
  }

  divine(seed: number): SeedProphecy {
    const pattern = this.analyzeBits(seed);
    const fragments: string[] = [];
    const digits = seed.toString().split('').map(Number);
    for (const digit of digits) {
      fragments.push(this._glyphTable.get(digit) ?? 'unknown');
    }
    fragments.push(`parity:${pattern.parity}`);
    fragments.push(`entropy:${pattern.entropy.toFixed(3)}`);
    fragments.push(`runs:${pattern.runs}`);

    const chiSquare = this._chiSquareUniform(pattern.bits);
    const markovTransition = this._markovAnalysis(pattern.bits);
    const confidence = this._computeConfidence(pattern, chiSquare, markovTransition);

    const prophecy: SeedProphecy = {
      seed,
      fragments,
      confidence,
      chiSquare,
      markovTransition,
      decodedAt: Date.now(),
    };
    this._prophecies.push(prophecy);
    if (this._prophecies.length > this._maxHistory) this._prophecies.shift();
    return prophecy;
  }

  crossRead(seedA: number, seedB: number): SeedProphecy {
    const combined = (seedA ^ seedB) >>> 0;
    return this.divine(combined);
  }

  registerGlyph(value: number, glyph: string): void {
    this._glyphTable.set(value, glyph);
  }

  getProphecies(limit: number = 50): SeedProphecy[] {
    return this._prophecies.slice(-limit);
  }

  get highestConfidence(): number {
    if (this._prophecies.length === 0) return 0;
    return Math.max(...this._prophecies.map(p => p.confidence));
  }

  get prophecyCount(): number { return this._prophecies.length; }
  get averageChiSquare(): number {
    if (this._prophecies.length === 0) return 0;
    return this._prophecies.reduce((s, p) => s + p.chiSquare, 0) / this._prophecies.length;
  }

  private _chiSquareUniform(bits: string): number {
    const ones = bits.split('').filter(b => b === '1').length;
    const zeros = bits.length - ones;
    const expected = bits.length / 2;
    return ((ones - expected) ** 2 + (zeros - expected) ** 2) / expected;
  }

  private _markovAnalysis(bits: string): number {
    let transitions = 0;
    let sameState = 0;
    for (let i = 1; i < bits.length; i++) {
      if (bits[i] !== bits[i - 1]) transitions++;
      else sameState++;
    }
    const total = transitions + sameState;
    const key = bits.slice(0, 8);
    this._markovChain.set(key, (this._markovChain.get(key) ?? 0) + 1);
    return total > 0 ? transitions / total : 0;
  }

  private _computeConfidence(pattern: BitPattern, chi: number, markov: number): number {
    const balance = 1 - Math.min(1, chi / 32);
    const randomness = 1 - Math.abs(0.5 - markov) * 2;
    const runScore = 1 - Math.min(1, pattern.longestRun / 16);
    return Math.min(1, 0.4 * balance + 0.3 * randomness + 0.3 * runScore);
  }
}
