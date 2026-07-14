/**
 * 移码创新：大块代码位移产生新阅读框。
 * 模拟基因移码突变，在源串中插入或删除一段，导致后续解读全部偏移产生新语义。
 */

export interface FrameShiftRecord {
  id: string;
  source: string;
  shiftType: 'insertion' | 'deletion';
  position: number;
  segment: string;
  newFrame: string;
  createdAt: number;
}

export class FrameShiftInnovation {
  private _records: FrameShiftRecord[] = [];
  private _insertPool = ['xyz', 'abc', '123', 'qq', 'zz', 'rr'];
  private _maxRecords = 200;

  insertShift(source: string, position?: number): FrameShiftRecord | null {
    if (source.length === 0) return null;
    const pos = Math.min(source.length, position ?? Math.floor(Math.random() * source.length));
    const segment = this._insertPool[Math.floor(Math.random() * this._insertPool.length)];
    const newFrame = source.slice(0, pos) + segment + source.slice(pos);
    const record: FrameShiftRecord = {
      id: `fs-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      source,
      shiftType: 'insertion',
      position: pos,
      segment,
      newFrame,
      createdAt: Date.now(),
    };
    this._records.push(record);
    if (this._records.length > this._maxRecords) this._records.shift();
    return record;
  }

  deleteShift(source: string, length?: number): FrameShiftRecord | null {
    if (source.length < 2) return null;
    const delLen = Math.min(source.length - 1, length ?? Math.floor(Math.random() * 3) + 1);
    const pos = Math.floor(Math.random() * (source.length - delLen + 1));
    const segment = source.slice(pos, pos + delLen);
    const newFrame = source.slice(0, pos) + source.slice(pos + delLen);
    const record: FrameShiftRecord = {
      id: `fs-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      source,
      shiftType: 'deletion',
      position: pos,
      segment,
      newFrame,
      createdAt: Date.now(),
    };
    this._records.push(record);
    if (this._records.length > this._maxRecords) this._records.shift();
    return record;
  }

  compareFrames(original: string, shifted: string): number {
    const minLen = Math.min(original.length, shifted.length);
    let diffs = 0;
    for (let i = 0; i < minLen; i++) {
      if (original[i] !== shifted[i]) diffs++;
    }
    diffs += Math.abs(original.length - shifted.length);
    return diffs;
  }

  setInsertPool(segments: string[]): void {
    this._insertPool = segments;
  }

  getRecord(id: string): FrameShiftRecord | null {
    return this._records.find(r => r.id === id) ?? null;
  }

  getRecords(limit: number = 50): FrameShiftRecord[] {
    return this._records.slice(-limit);
  }

  get totalShifts(): number {
    return this._records.length;
  }
}
