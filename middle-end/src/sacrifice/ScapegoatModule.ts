/**
 * 替罪羊模块：指定一个模块承担全部错误惩罚，
 * 让其他模块得以免于追责，维持系统表面稳定性。
 */

export interface ScapegoatAssignment {
  id: string;
  moduleId: string;
  assignedAt: number;
  blameCount: number;
  isActive: boolean;
}

export interface BlameRecord {
  scapegoatId: string;
  actualCulprit: string;
  errorType: string;
  redirectedAt: number;
}

export class ScapegoatModule {
  private _scapegoats: Map<string, ScapegoatAssignment> = new Map();
  private _blameRecords: BlameRecord[] = [];
  private _activeScapegoat: string | null = null;
  private _maxBlameCapacity = 100;

  designate(moduleId: string): ScapegoatAssignment {
    if (this._activeScapegoat) {
      const previous = this._scapegoats.get(this._activeScapegoat);
      if (previous) previous.isActive = false;
    }
    const assignment: ScapegoatAssignment = {
      id: `scapegoat-${Date.now()}`,
      moduleId,
      assignedAt: Date.now(),
      blameCount: 0,
      isActive: true,
    };
    this._scapegoats.set(assignment.id, assignment);
    this._activeScapegoat = assignment.id;
    return assignment;
  }

  redirectBlame(actualCulprit: string, errorType: string): BlameRecord | null {
    if (!this._activeScapegoat) return null;
    const scapegoat = this._scapegoats.get(this._activeScapegoat);
    if (!scapegoat) return null;
    if (scapegoat.blameCount >= this._maxBlameCapacity) return null;
    scapegoat.blameCount++;
    const record: BlameRecord = {
      scapegoatId: this._activeScapegoat,
      actualCulprit,
      errorType,
      redirectedAt: Date.now(),
    };
    this._blameRecords.push(record);
    if (this._blameRecords.length > 300) this._blameRecords.shift();
    return record;
  }

  isOverloaded(scapegoatId: string): boolean {
    const scapegoat = this._scapegoats.get(scapegoatId);
    if (!scapegoat) return false;
    return scapegoat.blameCount >= this._maxBlameCapacity;
  }

  pardon(scapegoatId: string): boolean {
    const scapegoat = this._scapegoats.get(scapegoatId);
    if (!scapegoat) return false;
    scapegoat.isActive = false;
    scapegoat.blameCount = 0;
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

  setMaxBlameCapacity(value: number): void {
    this._maxBlameCapacity = Math.max(1, value);
  }

  getBlameLog(limit: number = 50): BlameRecord[] {
    return this._blameRecords.slice(-limit);
  }

  get activeScapegoatId(): string | null {
    return this._activeScapegoat;
  }

  get scapegoatCount(): number {
    return this._scapegoats.size;
  }
}
