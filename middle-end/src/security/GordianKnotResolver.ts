/**
 * 戈尔迪乌姆结解决器：面对无法拆解的复杂攻击链不解之，
 * 一剑劈开（强制终止+隔离）并吸收其动能转化为系统能量储备。
 */

export interface GordianKnot {
  id: string;
  entangledLayers: number;
  complexity: number;
  apparentUnsolvable: boolean;
  createdAt: number;
}

export interface CleaveResult {
  knotId: string;
  severed: boolean;
  absorbedEnergy: number;
  residualRisk: number;
  timestamp: number;
}

export interface EnergyReserve {
  total: number;
  source: string[];
  lastCappedAt: number;
}

export class GordianKnotResolver {
  private _knots: Map<string, GordianKnot> = new Map();
  private _cleavages: CleaveResult[] = [];
  private _reserve: EnergyReserve = { total: 0, source: [], lastCappedAt: 0 };
  private _severedIds: Set<string> = new Set();
  private _maxReserve = 1000;

  submitKnot(knot: GordianKnot): void {
    this._knots.set(knot.id, knot);
  }

  assess(knotId: string): { solvable: boolean; estimatedCost: number } {
    const knot = this._knots.get(knotId);
    if (!knot) return { solvable: false, estimatedCost: 0 };
    const solvable = !knot.apparentUnsolvable && knot.complexity < 50;
    const estimatedCost = solvable ? knot.complexity * 2 : knot.complexity * 100;
    return { solvable, estimatedCost };
  }

  cleave(knotId: string, force: number): CleaveResult {
    const knot = this._knots.get(knotId);
    if (!knot) throw new Error(`Unknown knot: ${knotId}`);
    const requiredForce = knot.complexity * 0.5;
    const severed = force >= requiredForce;
    const absorbedEnergy = severed ? knot.complexity * knot.entangledLayers * 0.3 : 0;
    const capped = Math.min(this._maxReserve, this._reserve.total + absorbedEnergy);
    const actualAbsorbed = capped - this._reserve.total;
    if (actualAbsorbed > 0) {
      this._reserve.total = capped;
      this._reserve.source.push(knotId);
      this._reserve.lastCappedAt = Date.now();
    }
    const result: CleaveResult = {
      knotId,
      severed,
      absorbedEnergy: actualAbsorbed,
      residualRisk: severed ? knot.complexity * 0.05 : knot.complexity,
      timestamp: Date.now(),
    };
    if (severed) this._severedIds.add(knotId);
    this._cleavages.push(result);
    return result;
  }

  quarantine(knotId: string): boolean {
    const knot = this._knots.get(knotId);
    if (!knot) return false;
    knot.apparentUnsolvable = true;
    knot.complexity = 0;
    return true;
  }

  recycleEnergy(amount: number): number {
    const drawn = Math.min(this._reserve.total, amount);
    this._reserve.total -= drawn;
    return drawn;
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
}
