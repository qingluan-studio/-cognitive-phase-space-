/**
 * 无原件的复制：拟像本身成为原件。
 * 复制品脱离原件独立存在，并反过来定义新的"原件"标准。
 */

export interface CopyRecord {
  id: string;
  sourceId: string | null;
  promotedToOriginal: boolean;
  createdAt: number;
  content: Record<string, unknown>;
}

export class CopyWithoutOriginal {
  private _copies: Map<string, CopyRecord> = new Map();
  private _originals: Set<string> = new Set();
  private _promotionLog: string[] = [];

  addCopy(id: string, sourceId: string | null, content: Record<string, unknown>): CopyRecord {
    const record: CopyRecord = {
      id,
      sourceId,
      promotedToOriginal: false,
      createdAt: Date.now(),
      content,
    };
    this._copies.set(id, record);
    return record;
  }

  promoteToOriginal(id: string): CopyRecord | null {
    const record = this._copies.get(id);
    if (!record) return null;
    record.promotedToOriginal = true;
    record.sourceId = null;
    this._originals.add(id);
    this._promotionLog.push(`${id} promoted at ${Date.now()}`);
    return record;
  }

  deriveOriginal(copyId: string, newId: string): CopyRecord | null {
    const source = this._copies.get(copyId);
    if (!source || !source.promotedToOriginal) return null;
    return this.addCopy(newId, copyId, { ...source.content });
  }

  verifyOriginality(id: string): boolean {
    return this._originals.has(id);
  }

  removeCopy(id: string): boolean {
    if (!this._copies.delete(id)) return false;
    this._originals.delete(id);
    return true;
  }

  countDerivatives(originalId: string): number {
    let count = 0;
    for (const copy of this._copies.values()) {
      if (copy.sourceId === originalId) count++;
    }
    return count;
  }

  listSelfMadeOriginals(): CopyRecord[] {
    return Array.from(this._originals).map(id => this._copies.get(id)).filter((r): r is CopyRecord => !!r);
  }

  getPromotionLog(limit: number = 50): string[] {
    return this._promotionLog.slice(-limit);
  }

  getCopy(id: string): CopyRecord | null {
    return this._copies.get(id) ?? null;
  }

  getAllCopies(): CopyRecord[] {
    return Array.from(this._copies.values());
  }

  get copyCount(): number {
    return this._copies.size;
  }

  get originalCount(): number {
    return this._originals.size;
  }
}
