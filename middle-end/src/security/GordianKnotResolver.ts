export interface GordianKnot {
  id: string;
  entangledLayers: number;
  complexity: number;
  apparentUnsolvable: boolean;
  createdAt: number;
  tension: number;
  entropy: number;
  decayRate: number;
}

export interface CleaveResult {
  knotId: string;
  severed: boolean;
  absorbedEnergy: number;
  residualRisk: number;
  timestamp: number;
  efficiency: number;
  cascadeLevel: number;
}

export interface EnergyReserve {
  total: number;
  source: string[];
  lastCappedAt: number;
  efficiency: number;
  volatility: number;
}

export interface SeveranceAnalysis {
  solvable: boolean;
  estimatedCost: number;
  successProbability: number;
  energyYield: number;
  riskAssessment: number;
}

export class GordianKnotResolver {
  private _knots: Map<string, GordianKnot> = new Map();
  private _cleavages: CleaveResult[] = [];
  private _reserve: EnergyReserve = { total: 0, source: [], lastCappedAt: 0, efficiency: 0.8, volatility: 0.1 };
  private _severedIds: Set<string> = new Set();
  private _maxReserve = 1000;
  private _cleaveEfficiencyDecay = 0.95;
  private _tensionThreshold = 0.8;

  submitKnot(knot: GordianKnot): void {
    const enriched: GordianKnot = {
      ...knot,
      tension: Math.min(1, knot.complexity * 0.02 + knot.entangledLayers * 0.05),
      entropy: knot.entropy ?? Math.random() * 0.3,
      decayRate: Math.max(0.001, 0.01 - knot.complexity * 0.0001),
    };
    this._knots.set(knot.id, enriched);
  }

  assess(knotId: string): SeveranceAnalysis {
    const knot = this._knots.get(knotId);
    if (!knot) return { solvable: false, estimatedCost: 0, successProbability: 0, energyYield: 0, riskAssessment: 1 };

    const baseDifficulty = knot.complexity * knot.entangledLayers * 0.1;
    const solvable = !knot.apparentUnsolvable && baseDifficulty < 50;
    const estimatedCost = solvable ? baseDifficulty * 2 : baseDifficulty * 100;

    const tensionFactor = Math.min(1, knot.tension / this._tensionThreshold);
    const entropyFactor = 1 - knot.entropy * 0.5;
    const successProbability = solvable ? (0.7 + tensionFactor * 0.2) * entropyFactor : 0.1;

    const energyYield = knot.complexity * knot.entangledLayers * (0.3 + tensionFactor * 0.2);
    const riskAssessment = knot.apparentUnsolvable ? 0.9 : 1 - successProbability;

    return { solvable, estimatedCost, successProbability, energyYield, riskAssessment };
  }

  cleave(knotId: string, force: number): CleaveResult {
    const knot = this._knots.get(knotId);
    if (!knot) throw new Error(`Unknown knot: ${knotId}`);

    const analysis = this.assess(knotId);
    const requiredForce = analysis.estimatedCost * 0.5;
    const severed = force >= requiredForce && Math.random() < analysis.successProbability;

    let absorbedEnergy = 0;
    let cascadeLevel = 0;

    if (severed) {
      absorbedEnergy = analysis.energyYield * this._reserve.efficiency;
      cascadeLevel = this._triggerCascade(knot);

      const capped = Math.min(this._maxReserve, this._reserve.total + absorbedEnergy);
      const actualAbsorbed = capped - this._reserve.total;

      if (actualAbsorbed > 0) {
        this._reserve.total = capped;
        this._reserve.source.push(knotId);
        this._reserve.lastCappedAt = Date.now();
        this._reserve.volatility = Math.min(0.5, this._reserve.volatility + actualAbsorbed * 0.001);
      }

      absorbedEnergy = actualAbsorbed;
    }

    const efficiency = severed ? 1 - (force - requiredForce) / force : 0;
    const residualRisk = severed ? knot.complexity * 0.05 * (1 - cascadeLevel * 0.1) : knot.complexity;

    const result: CleaveResult = {
      knotId,
      severed,
      absorbedEnergy,
      residualRisk,
      timestamp: Date.now(),
      efficiency,
      cascadeLevel,
    };

    if (severed) {
      this._severedIds.add(knotId);
      this._reserve.efficiency = Math.min(1, this._reserve.efficiency + 0.02);
    } else {
      this._reserve.efficiency *= this._cleaveEfficiencyDecay;
    }

    this._cleavages.push(result);
    this._updateKnotState(knot, severed);
    return result;
  }

  private _triggerCascade(knot: GordianKnot): number {
    if (knot.tension < this._tensionThreshold) return 0;

    let cascade = 0;
    const releaseEnergy = knot.tension * 0.5;

    for (const other of this._knots.values()) {
      if (other.id === knot.id || other.apparentUnsolvable) continue;

      const distance = Math.abs(other.complexity - knot.complexity) / 100;
      const coupling = Math.max(0, 1 - distance) * other.entropy;

      if (coupling > 0.3) {
        other.tension = Math.min(1, other.tension + releaseEnergy * coupling);
        cascade++;
      }
    }

    return cascade;
  }

  private _updateKnotState(knot: GordianKnot, severed: boolean): void {
    if (severed) {
      knot.apparentUnsolvable = false;
      knot.complexity = 0;
      knot.tension = 0;
      knot.entropy = 0;
    } else {
      knot.tension = Math.min(1, knot.tension + 0.1);
      knot.entropy = Math.min(1, knot.entropy + 0.05);
      knot.complexity = Math.min(100, knot.complexity + knot.decayRate * 10);
    }
  }

  quarantine(knotId: string): boolean {
    const knot = this._knots.get(knotId);
    if (!knot) return false;

    knot.apparentUnsolvable = true;
    knot.tension = Math.min(1, knot.tension + 0.2);
    knot.decayRate *= 0.5;

    return true;
  }

  recycleEnergy(amount: number): number {
    const drawn = Math.min(this._reserve.total, amount);
    const actual = drawn * this._reserve.efficiency;
    this._reserve.total -= drawn;
    this._reserve.volatility = Math.max(0.01, this._reserve.volatility - drawn * 0.0001);
    return actual;
  }

  consolidateReserve(): void {
    const stability = 1 - this._reserve.volatility;
    const consolidation = this._reserve.total * (1 - stability) * 0.3;
    this._reserve.total = Math.max(0, this._reserve.total - consolidation);
    this._reserve.efficiency = Math.min(1, this._reserve.efficiency + consolidation * 0.001);
    this._reserve.volatility = Math.max(0.01, this._reserve.volatility - 0.1);
  }

  getCleavageHistory(): CleaveResult[] {
    return [...this._cleavages];
  }

  getKnot(knotId: string): GordianKnot | undefined {
    const k = this._knots.get(knotId);
    return k ? { ...k } : undefined;
  }

  isSevered(knotId: string): boolean {
    return this._severedIds.has(knotId);
  }

  get energyReserve(): number {
    return this._reserve.total;
  }

  get severedCount(): number {
    return this._severedIds.size;
  }

  get reserveEfficiency(): number {
    return this._reserve.efficiency;
  }

  get reserveVolatility(): number {
    return this._reserve.volatility;
  }
}