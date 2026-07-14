/**
 * ToxoplasmaGondii - 弓形虫效应
 * 微妙地改变宿主的行为倾向，不直接控制而是通过调整
 * 风险偏好、恐惧阈值与探索欲望，使宿主做出更冒险的选择。
 */

export interface ToxoplasmaGondiiRecord {
  readonly agentId: string;
  hostId: string;
  infectionLoad: number;
  riskBiasDelta: number;
  fearThreshold: number;
}

export interface BehavioralShift {
  trait: string;
  before: number;
  after: number;
  magnitude: number;
}

export class ToxoplasmaGondii {
  private _record: ToxoplasmaGondiiRecord;
  private _shifts: BehavioralShift[] = [];
  private _neurotransmitterBalance: Record<string, number> = {
    dopamine: 1.0,
    serotonin: 1.0,
    gaba: 1.0,
  };
  private _predatorAttraction: number = 0;

  constructor(record: ToxoplasmaGondiiRecord) {
    this._record = { ...record };
  }

  get agentId(): string {
    return this._record.agentId;
  }

  get infectionLoad(): number {
    return this._record.infectionLoad;
  }

  get predatorAttraction(): number {
    return this._predatorAttraction;
  }

  public alterRiskTendency(originalRisk: number): number {
    const shifted = originalRisk + this._record.riskBiasDelta * this._record.infectionLoad;
    const clamped = Math.max(0, Math.min(1, shifted));
    this._shifts.push({
      trait: 'risk_tendency',
      before: originalRisk,
      after: clamped,
      magnitude: Math.abs(clamped - originalRisk),
    });
    return clamped;
  }

  public modulateFear(originalFear: number): number {
    const reduced = originalFear * (1 - this._record.fearThreshold * this._record.infectionLoad);
    const clamped = Math.max(0, reduced);
    this._shifts.push({
      trait: 'fear_response',
      before: originalFear,
      after: clamped,
      magnitude: originalFear - clamped,
    });
    return clamped;
  }

  public adjustNeurotransmitter(name: string, delta: number): void {
    const current = this._neurotransmitterBalance[name] ?? 1.0;
    this._neurotransmitterBalance[name] = Math.max(0, Math.min(2, current + delta));
    if (name === 'dopamine') {
      this._predatorAttraction = Math.min(1, this._predatorAttraction + delta * 0.3);
    }
  }

  public increaseExploration(baseline: number): number {
    const boost = baseline * (1 + this._record.infectionLoad * 0.2);
    this._shifts.push({
      trait: 'exploration_drive',
      before: baseline,
      after: boost,
      magnitude: boost - baseline,
    });
    return boost;
  }

  public attenuateCaution(cautionLevel: number): number {
    const attenuated = cautionLevel * (1 - this._record.infectionLoad * 0.15);
    return Math.max(0, attenuated);
  }

  public spreadTo(newHostId: string, transferRate: number): ToxoplasmaGondii | null {
    if (this._record.infectionLoad < 0.3) {
      return null;
    }
    const transferred = this._record.infectionLoad * transferRate;
    this._record.infectionLoad *= (1 - transferRate);
    return new ToxoplasmaGondii({
      agentId: `${this._record.agentId}_spawn`,
      hostId: newHostId,
      infectionLoad: transferred,
      riskBiasDelta: this._record.riskBiasDelta,
      fearThreshold: this._record.fearThreshold,
    });
  }

  public reduceLoad(amount: number): void {
    this._record.infectionLoad = Math.max(0, this._record.infectionLoad - amount);
  }

  public effectReport(): Record<string, unknown> {
    const totalShift = this._shifts.reduce((s, sh) => s + sh.magnitude, 0);
    return {
      agentId: this.agentId,
      hostId: this._record.hostId,
      infectionLoad: this._record.infectionLoad.toFixed(3),
      riskBiasDelta: this._record.riskBiasDelta.toFixed(3),
      fearThreshold: this._record.fearThreshold.toFixed(3),
      predatorAttraction: this._predatorAttraction.toFixed(3),
      neurotransmitters: { ...this._neurotransmitterBalance },
      shiftCount: this._shifts.length,
      totalShiftMagnitude: totalShift.toFixed(3),
    };
  }
}
