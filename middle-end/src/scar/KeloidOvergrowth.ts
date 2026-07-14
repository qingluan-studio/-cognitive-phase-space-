/**
 * 疤痕增生模块：防御反应过度，疤痕组织异常增厚，
 * 反而成为新的弱点，限制原本功能的灵活性。
 */

export interface KeloidRegion {
  id: string;
  originalFunction: string;
  overgrowthFactor: number;
  flexibilityLoss: number;
  rigidity: number;
  detected: boolean;
}

export interface OvergrowthAlert {
  regionId: string;
  severity: number;
  recommendation: string;
  triggeredAt: number;
}

export class KeloidOvergrowth {
  private _regions: Map<string, KeloidRegion> = new Map();
  private _alerts: OvergrowthAlert[] = [];
  private _growthRate = 0.2;
  private _criticalThreshold = 3.0;
  private _flexibilityCeiling = 0.9;

  detect(region: KeloidRegion): void {
    region.detected = true;
    this._regions.set(region.id, region);
  }

  stimulate(regionId: string): KeloidRegion | null {
    const region = this._regions.get(regionId);
    if (!region) return null;
    region.overgrowthFactor += this._growthRate;
    region.flexibilityLoss = Math.min(this._flexibilityCeiling, region.flexibilityLoss + this._growthRate * 0.5);
    region.rigidity = Math.min(1, region.rigidity + this._growthRate * 0.3);
    if (region.overgrowthFactor >= this._criticalThreshold) {
      this._raiseAlert(region);
    }
    return region;
  }

  private _raiseAlert(region: KeloidRegion): void {
    const severity = Math.min(1, region.overgrowthFactor / (this._criticalThreshold * 2));
    const recommendation = region.overgrowthFactor > this._criticalThreshold * 1.5
      ? 'Surgical removal required'
      : 'Anti-inflammatory intervention recommended';
    const alert: OvergrowthAlert = {
      regionId: region.id,
      severity,
      recommendation,
      triggeredAt: Date.now(),
    };
    this._alerts.push(alert);
    if (this._alerts.length > 200) this._alerts.shift();
  }

  isOvergrown(regionId: string): boolean {
    const region = this._regions.get(regionId);
    return !!region && region.overgrowthFactor >= this._criticalThreshold;
  }

  calculateFlexibilityLoss(): number {
    let total = 0;
    for (const region of this._regions.values()) {
      total += region.flexibilityLoss;
    }
    return Math.min(1, total);
  }

  findMostOvergrown(): KeloidRegion | null {
    let max = 0;
    let result: KeloidRegion | null = null;
    for (const region of this._regions.values()) {
      if (region.overgrowthFactor > max) {
        max = region.overgrowthFactor;
        result = region;
      }
    }
    return result;
  }

  excise(regionId: string, reduction: number): boolean {
    const region = this._regions.get(regionId);
    if (!region) return false;
    region.overgrowthFactor = Math.max(0, region.overgrowthFactor - reduction);
    region.flexibilityLoss = Math.max(0, region.flexibilityLoss - reduction * 0.5);
    region.rigidity = Math.max(0, region.rigidity - reduction * 0.3);
    return true;
  }

  setGrowthRate(rate: number): void {
    this._growthRate = Math.max(0, Math.min(1, rate));
  }

  setCriticalThreshold(value: number): void {
    this._criticalThreshold = Math.max(1, value);
  }

  getActiveAlerts(): OvergrowthAlert[] {
    return this._alerts.slice(-20);
  }

  getRegion(regionId: string): KeloidRegion | null {
    return this._regions.get(regionId) ?? null;
  }

  listOvergrownRegions(): KeloidRegion[] {
    return Array.from(this._regions.values()).filter(r => r.overgrowthFactor >= this._criticalThreshold);
  }

  get regionCount(): number {
    return this._regions.size;
  }

  get overgrownCount(): number {
    return this.listOvergrownRegions().length;
  }
}
