/**
 * 随机种子神谕：将随机数种子解释为隐藏的未来线索。
 * 把种子视为加密的未来预言，通过解构种子的位模式提取隐含的"未来提示"。
 */

export interface SeedProphecy {
  seed: number;
  fragments: string[];
  confidence: number;
  decodedAt: number;
}

export interface BitPattern {
  seed: number;
  bits: string;
  parity: 'even' | 'odd';
  entropy: number;
}

export class RandomSeedOracle {
  private _prophecies: SeedProphecy[] = [];
  private _glyphTable: Map<number, string> = new Map([
    [0, 'void'], [1, 'spark'], [2, 'turn'], [3, 'echo'],
    [4, 'fold'], [5, 'breach'], [6, 'bind'], [7, 'release'],
    [8, 'rise'], [9, 'fall'],
  ]);
  private _maxHistory = 100;

  generateSeed(): number {
    return Math.floor(Math.random() * 0xffffffff);
  }

  analyzeBits(seed: number): BitPattern {
    const bits = (seed >>> 0).toString(2).padStart(32, '0');
    let ones = 0;
    for (const bit of bits) if (bit === '1') ones++;
    const entropy = ones / bits.length;
    return {
      seed,
      bits,
      parity: ones % 2 === 0 ? 'even' : 'odd',
      entropy,
    };
  }

  divine(seed: number): SeedProphecy {
    const pattern = this.analyzeBits(seed);
    const fragments: string[] = [];
    const digits = seed.toString().split('').map(Number);
    for (const digit of digits) {
      const glyph = this._glyphTable.get(digit) ?? 'unknown';
      fragments.push(glyph);
    }
    fragments.push(`parity:${pattern.parity}`);
    fragments.push(`entropy:${pattern.entropy.toFixed(3)}`);

    const confidence = Math.min(1, pattern.entropy * 2);
    const prophecy: SeedProphecy = {
      seed,
      fragments,
      confidence,
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

  get prophecyCount(): number {
    return this._prophecies.length;
  }
}
