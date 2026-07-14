/**
 * 超立方折叠：将数据向第四维折叠，突破三维信息密度极限。
 * 把三维数据结构向第四维空间折叠，突破三维的信息密度
 * 上限，从而在等价体积内容纳更高密度信息。
 */

export interface FoldOperation {
  id: string;
  dimension: number;
  dataKeys: string[];
  foldedAt: number;
  compressionRatio: number;
}

export interface Hypercell {
  id: string;
  coords4d: number[];
  payload: Record<string, unknown>;
}

export class TesseractFold {
  private _folds: FoldOperation[] = [];
  private _cells: Map<string, Hypercell> = new Map();
  private _currentDimension: number = 3;
  private _maxDimension: number = 4;

  /** 把数据沿第四维折叠一次。 */
  fold(dataKeys: string[]): FoldOperation {
    if (this._currentDimension >= this._maxDimension) {
      this._currentDimension = 3;
    }
    this._currentDimension++;
    const compressionRatio = this._currentDimension / 3;
    const op: FoldOperation = {
      id: `fold-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      dimension: this._currentDimension,
      dataKeys,
      foldedAt: Date.now(),
      compressionRatio,
    };
    this._folds.push(op);
    return op;
  }

  /** 把已折叠的数据展开回三维。 */
  unfold(foldId: string): boolean {
    const op = this._folds.find(f => f.id === foldId);
    if (!op) return false;
    this._currentDimension = Math.max(3, this._currentDimension - 1);
    return true;
  }

  /** 在四维超立方体中存入一个超胞。 */
  storeHypercell(cell: Hypercell): Hypercell {
    this._cells.set(cell.id, cell);
    return cell;
  }

  /** 取出四维超胞。 */
  getHypercell(id: string): Hypercell | null {
    return this._cells.get(id) ?? null;
  }

  /** 沿第四维压缩数据：返回压缩比。 */
  compress(payload: Record<string, unknown>): number {
    const keys = Object.keys(payload);
    const op = this.fold(keys);
    return op.compressionRatio;
  }

  /** 沿第四维展开数据。 */
  expand(foldId: string): boolean {
    return this.unfold(foldId);
  }

  get currentDimension(): number {
    return this._currentDimension;
  }

  get folds(): FoldOperation[] {
    return [...this._folds];
  }

  get cellCount(): number {
    return this._cells.size;
  }

  /** 估算当前信息密度上限。 */
  get densityLimit(): number {
    return Math.pow(2, this._currentDimension);
  }
}
