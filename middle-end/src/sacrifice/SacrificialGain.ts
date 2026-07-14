/**
 * 牺牲收益模块：通过牺牲得到不成比例的巨大回报，
 * 在系统濒临崩溃时启动倍率机制，使微小牺牲也能换取显著增益。
 */

export interface SacrificeDeal {
  id: string;
  cost: number;
  baseGain: number;
  multiplier: number;
  netGain: number;
  accepted: boolean;
}

export interface GainMilestone {
  threshold: number;
  bonusMultiplier: number;
  reached: boolean;
}

export class SacrificialGain {
  private _deals: Map<string, SacrificeDeal> = new Map();
  private _milestones: GainMilestone[] = [];
  private _totalSacrifice = 0;
  private _totalGain = 0;
  private _defaultMultiplier = 2.0;
  private _crisisMode = false;

  addMilestone(milestone: GainMilestone): void {
    this._milestones.push(milestone);
    this._milestones.sort((a, b) => a.threshold - b.threshold);
  }

  proposeDeal(cost: number): SacrificeDeal {
    const baseGain = cost * this._defaultMultiplier;
    const multiplier = this._computeMultiplier();
    const netGain = baseGain * multiplier;
    const deal: SacrificeDeal = {
      id: `deal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      cost,
      baseGain,
      multiplier,
      netGain,
      accepted: false,
    };
    this._deals.set(deal.id, deal);
    return deal;
  }

  private _computeMultiplier(): number {
    let multiplier = this._defaultMultiplier;
    for (const milestone of this._milestones) {
      if (this._totalSacrifice >= milestone.threshold) {
        multiplier += milestone.bonusMultiplier;
      }
    }
    if (this._crisisMode) multiplier *= 1.5;
    return multiplier;
  }

  acceptDeal(dealId: string): SacrificeDeal | null {
    const deal = this._deals.get(dealId);
    if (!deal || deal.accepted) return null;
    deal.accepted = true;
    this._totalSacrifice += deal.cost;
    this._totalGain += deal.netGain;
    this._checkMilestones();
    return deal;
  }

  private _checkMilestones(): void {
    for (const milestone of this._milestones) {
      if (!milestone.reached && this._totalSacrifice >= milestone.threshold) {
        milestone.reached = true;
      }
    }
  }

  enterCrisisMode(): void {
    this._crisisMode = true;
  }

  exitCrisisMode(): void {
    this._crisisMode = false;
  }

  calculateROI(): number {
    if (this._totalSacrifice === 0) return 0;
    return (this._totalGain - this._totalSacrifice) / this._totalSacrifice;
  }

  findBestDeal(): SacrificeDeal | null {
    const pending = Array.from(this._deals.values()).filter(d => !d.accepted);
    if (pending.length === 0) return null;
    return pending.reduce((best, d) => (d.netGain / d.cost > best.netGain / best.cost ? d : best));
  }

  listAcceptedDeals(): SacrificeDeal[] {
    return Array.from(this._deals.values()).filter(d => d.accepted);
  }

  getMilestoneProgress(): GainMilestone[] {
    return [...this._milestones];
  }

  setDefaultMultiplier(value: number): void {
    this._defaultMultiplier = Math.max(1, value);
  }

  get totalSacrifice(): number {
    return this._totalSacrifice;
  }

  get totalGain(): number {
    return this._totalGain;
  }

  get dealCount(): number {
    return this._deals.size;
  }

  get inCrisisMode(): boolean {
    return this._crisisMode;
  }
}
