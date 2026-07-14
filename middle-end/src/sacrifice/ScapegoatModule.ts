export interface ScapegoatAssignment {
  id: string;
  moduleId: string;
  assignedAt: number;
  blameCount: number;
  isActive: boolean;
  endurance: number;
}

export interface BlameRecord {
  scapegoatId: string;
  actualCulprit: string;
  errorType: string;
  redirectedAt: number;
  absorptionRate: number;
}

export class ScapegoatModule {
  private _scapegoats: Map<string, ScapegoatAssignment> = new Map();
  private _blameRecords: BlameRecord[] = [];
  private _activeScapegoat: string | null = null;
  private _maxBlameCapacity = 100;
  private _fatigueFactor = 0.01;
  private _culpritScores: Map<string, number> = new Map();

  designate(moduleId: string): ScapegoatAssignment {
    if (this._activeScapegoat) {
      const previous = this._scapegoats.get(this._activeScapegoat);
      if (previous) previous.isActive = false;
    }
    const assignment: ScapegoatAssignment = {
      id: `scapegoat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      moduleId,
      assignedAt: Date.now(),
      blameCount: 0,
      isActive: true,
      endurance: 1.0,
    };
    this._scapegoats.set(assignment.id, assignment);
    this._activeScapegoat = assignment.id;
    return assignment;
  }

  private _computeAbsorptionRate(scapegoat: ScapegoatAssignment): number {
    const loadFactor = scapegoat.blameCount / this._maxBlameCapacity;
    const fatigue = scapegoat.blameCount * this._fatigueFactor;
    return Math.max(0, scapegoat.endurance * (1 - loadFactor) - fatigue);
  }

  redirectBlame(actualCulprit: string, errorType: string): BlameRecord | null {
    if (!this._activeScapegoat) return null;
    const scapegoat = this._scapegoats.get(this._activeScapegoat);
    if (!scapegoat) return null;
    if (scapegoat.blameCount >= this._maxBlameCapacity) return null;
    const absorptionRate = this._computeAbsorptionRate(scapegoat);
    if (absorptionRate <= 0) return null;
    scapegoat.blameCount++;
    scapegoat.endurance = Math.max(0, scapegoat.endurance - this._fatigueFactor);
    this._culpritScores.set(actualCulprit, (this._culpritScores.get(actualCulprit) ?? 0) + 1);
    const record: BlameRecord = {
      scapegoatId: this._activeScapegoat,
      actualCulprit,
      errorType,
      redirectedAt: Date.now(),
      absorptionRate,
    };
    this._blameRecords.push(record);
    if (this._blameRecords.length > 300) this._blameRecords.shift();
    return record;
  }

  isOverloaded(scapegoatId: string): boolean {
    const scapegoat = this._scapegoats.get(scapegoatId);
    if (!scapegoat) return false;
    return scapegoat.blameCount >= this._maxBlameCapacity || scapegoat.endurance <= 0;
  }

  pardon(scapegoatId: string): boolean {
    const scapegoat = this._scapegoats.get(scapegoatId);
    if (!scapegoat) return false;
    scapegoat.isActive = false;
    scapegoat.blameCount = 0;
    scapegoat.endurance = 1.0;
    if (this._activeScapegoat === scapegoatId) this._activeScapegoat = null;
    return true;
  }

  rotateScapegoat(newModuleId: string): ScapegoatAssignment {
    return this.designate(newModuleId);
  }

  revealActualCulprits(scapegoatId: string): BlameRecord[] {
    return this._blameRecords.filter(r => r.scapegoatId === scapegoatId);
  }

  getCumulativeBlame(): number {
    let total = 0;
    for (const s of this._scapegoats.values()) total += s.blameCount;
    return total;
  }

  findTrueCulprit(): string | null {
    let max = 0;
    let culprit: string | null = null;
    for (const [id, score] of this._culpritScores) {
      if (score > max) { max = score; culprit = id; }
    }
    return culprit;
  }

  setMaxBlameCapacity(value: number): void {
    this._maxBlameCapacity = Math.max(1, value);
  }

  setFatigueFactor(value: number): void {
    this._fatigueFactor = Math.max(0, Math.min(0.1, value));
  }

  getBlameLog(limit: number = 50): BlameRecord[] {
    return this._blameRecords.slice(-limit);
  }

  measureSystemInjustice(): number {
    if (this._blameRecords.length === 0) return 0;
    const distinct = new Set(this._blameRecords.map(r => r.actualCulprit)).size;
    const scapegoats = new Set(this._blameRecords.map(r => r.scapegoatId)).size;
    return Math.min(1, scapegoats / Math.max(1, distinct));
  }

  get activeScapegoatId(): string | null {
    return this._activeScapegoat;
  }

  get scapegoatCount(): number {
    return this._scapegoats.size;
  }

  get activeEndurance(): number {
    if (!this._activeScapegoat) return 0;
    return this._scapegoats.get(this._activeScapegoat)?.endurance ?? 0;
  }
}
