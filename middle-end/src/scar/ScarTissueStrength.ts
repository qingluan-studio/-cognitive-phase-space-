/**
 * 疤组织强度模块：修复后的部位比原始结构更强韧，
 * 通过加固伤口区域形成致密疤痕组织，提供额外保护。
 */

export interface TissueRegion {
  id: string;
  originalStrength: number;
  currentStrength: number;
  scarred: boolean;
  scarLayers: number;
  reinforcedAt: number | null;
}

export interface RepairResult {
  regionId: string;
  newStrength: number;
  layersAdded: number;
  reinforced: boolean;
  repairedAt: number;
}

export class ScarTissueStrength {
  private _regions: Map<string, TissueRegion> = new Map();
  private _repairs: RepairResult[] = [];
  private _scarMultiplier = 1.5;
  private _maxLayers = 5;
  private _maxStrength = 10.0;

  registerRegion(region: TissueRegion): void {
    if (region.currentStrength === 0) region.currentStrength = region.originalStrength;
    this._regions.set(region.id, region);
  }

  damage(regionId: string, amount: number): boolean {
    const region = this._regions.get(regionId);
    if (!region) return false;
    region.currentStrength = Math.max(0, region.currentStrength - amount);
    return true;
  }

  repair(regionId: string): RepairResult | null {
    const region = this._regions.get(regionId);
    if (!region) return null;
    if (region.currentStrength >= region.originalStrength) {
      return {
        regionId,
        newStrength: region.currentStrength,
        layersAdded: 0,
        reinforced: false,
        repairedAt: Date.now(),
      };
    }
    region.scarLayers = Math.min(this._maxLayers, region.scarLayers + 1);
    const newStrength = Math.min(
      this._maxStrength,
      region.originalStrength * Math.pow(this._scarMultiplier, region.scarLayers)
    );
    region.currentStrength = newStrength;
    region.scarred = true;
    region.reinforcedAt = Date.now();
    const result: RepairResult = {
      regionId,
      newStrength,
      layersAdded: 1,
      reinforced: true,
      repairedAt: Date.now(),
    };
    this._repairs.push(result);
    if (this._repairs.length > 200) this._repairs.shift();
    return result;
  }

  isReinforced(regionId: string): boolean {
    const region = this._regions.get(regionId);
    return !!region && region.scarred;
  }

  computeDefensiveBonus(): number {
    let bonus = 0;
    for (const region of this._regions.values()) {
      if (region.scarred) {
        bonus += (region.currentStrength - region.originalStrength);
      }
    }
    return bonus;
  }

  findStrongestScar(): TissueRegion | null {
    let max = 0;
    let result: TissueRegion | null = null;
    for (const region of this._regions.values()) {
      if (region.scarred && region.currentStrength > max) {
        max = region.currentStrength;
        result = region;
      }
    }
    return result;
  }

  setScarMultiplier(value: number): void {
    this._scarMultiplier = Math.max(1, value);
  }

  setMaxLayers(value: number): void {
    this._maxLayers = Math.max(1, value);
  }

  getRepairHistory(limit: number = 50): RepairResult[] {
    return this._repairs.slice(-limit);
  }

  getRegion(regionId: string): TissueRegion | null {
    return this._regions.get(regionId) ?? null;
  }

  get regionCount(): number {
    return this._regions.size;
  }

  get scarredCount(): number {
    return Array.from(this._regions.values()).filter(r => r.scarred).length;
  }
}
