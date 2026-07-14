export interface SporeGenome {
  id: string;
  bits: number[];
  redundancy: number;
  errorRate: number;
  survivalProbability: number;
}

export interface SurvivalResult {
  genomeId: string;
  errorsCorrected: number;
  errorsUncorrected: number;
  survived: boolean;
  informationEntropy: number;
}

export class SporeSurvival {
  private _genomes: Map<string, SporeGenome> = new Map();
  private _results: SurvivalResult[] = [];
  private _state: Record<string, unknown> = {};
  private _hammingDistanceMatrix: Map<string, Map<string, number>> = new Map();

  constructor() {}

  get genomeCount(): number {
    return this._genomes.size;
  }

  encodeGenome(id: string, bits: number[], redundancy: number): SporeGenome {
    const errorRate = 0.01 / (redundancy + 1);
    const survivalProbability = Math.pow(1 - errorRate, bits.length);
    const genome: SporeGenome = { id, bits: [...bits], redundancy, errorRate, survivalProbability };
    this._genomes.set(id, genome);
    this._hammingDistanceMatrix.set(id, new Map());
    return genome;
  }

  addHammingRedundancy(id: string, parityBits: number): void {
    const genome = this._genomes.get(id);
    if (!genome) return;
    const originalLength = genome.bits.length;
    const newBits = [...genome.bits];
    for (let i = 0; i < parityBits; i++) {
      let parity = 0;
      for (let j = 0; j < originalLength; j++) {
        if ((j & (1 << i)) !== 0) parity ^= genome.bits[j];
      }
      newBits.push(parity);
    }
    genome.bits = newBits;
    genome.redundancy = parityBits;
    genome.errorRate = 0.01 / (genome.redundancy + 1);
    genome.survivalProbability = Math.pow(1 - genome.errorRate, originalLength);
  }

  simulateErrors(id: string, errorCount: number): SurvivalResult {
    const genome = this._genomes.get(id);
    if (!genome) {
      return { genomeId: id, errorsCorrected: 0, errorsUncorrected: errorCount, survived: false, informationEntropy: 0 };
    }
    const corrupted = [...genome.bits];
    const errorPositions = new Set<number>();
    for (let i = 0; i < errorCount; i++) {
      const pos = Math.floor(Math.random() * corrupted.length);
      errorPositions.add(pos);
      corrupted[pos] = corrupted[pos] === 1 ? 0 : 1;
    }
    let corrected = 0;
    if (genome.redundancy > 0) {
      for (let i = 0; i < genome.redundancy; i++) {
        let syndrome = 0;
        for (let j = 0; j < corrupted.length; j++) {
          if ((j & (1 << i)) !== 0) syndrome ^= corrupted[j];
        }
        if (syndrome !== 0) {
          const errorPos = syndrome;
          if (errorPos < corrupted.length) {
            corrupted[errorPos] = corrupted[errorPos] === 1 ? 0 : 1;
            corrected++;
          }
        }
      }
    }
    const uncorrected = errorCount - corrected;
    const survived = uncorrected <= genome.redundancy;
    const p = survived ? genome.survivalProbability : 1 - genome.survivalProbability;
    const informationEntropy = -p * Math.log2(p) - (1 - p) * Math.log2(1 - p);
    const result: SurvivalResult = { genomeId: id, errorsCorrected: corrected, errorsUncorrected: uncorrected, survived, informationEntropy };
    this._results.push(result);
    if (this._results.length > 100) this._results.shift();
    return result;
  }

  survivalRate(): number {
    if (this._results.length === 0) return 0;
    return this._results.filter((r) => r.survived).length / this._results.length;
  }

  computeHammingDistance(aId: string, bId: string): number {
    const a = this._genomes.get(aId);
    const b = this._genomes.get(bId);
    if (!a || !b) return Infinity;
    const len = Math.max(a.bits.length, b.bits.length);
    let dist = 0;
    for (let i = 0; i < len; i++) {
      if ((a.bits[i] ?? 0) !== (b.bits[i] ?? 0)) dist++;
    }
    this._hammingDistanceMatrix.get(aId)!.set(bId, dist);
    this._hammingDistanceMatrix.get(bId)!.set(aId, dist);
    return dist;
  }

  redundancyAllocation(): { id: string; redundancy: number; bits: number }[] {
    return Array.from(this._genomes.values()).map((g) => ({ id: g.id, redundancy: g.redundancy, bits: g.bits.length }));
  }

  entropyOfLoss(): number {
    const rates = Array.from(this._genomes.values()).map((g) => g.errorRate);
    const total = rates.reduce((s, v) => s + v, 0);
    if (total === 0) return 0;
    return -rates.reduce((s, v) => {
      const p = v / total;
      return p > 0 ? s + p * Math.log2(p) : s;
    }, 0);
  }

  report(): Record<string, unknown> {
    return {
      genomes: this._genomes.size,
      survivalRate: this.survivalRate(),
      entropyOfLoss: this.entropyOfLoss(),
      state: this._state,
    };
  }
}
