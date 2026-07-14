/**
 * 折纸数据：通过折叠数据产生新的结构。
 * 以折纸为隐喻，通过对数据序列的折叠操作生成具有层级性的新数据结构。
 */

export type FoldAxis = 'horizontal' | 'vertical' | 'diagonal' | 'reverse';

export interface FoldOperation {
  axis: FoldAxis;
  layers: number;
  appliedAt: number;
}

export interface FoldedStructure {
  id: string;
  original: number[];
  folded: number[][];
  operations: FoldOperation[];
  depth: number;
}

export class OrigamiData {
  private _structures: FoldedStructure[] = [];
  private _maxDepth = 8;

  fold(data: number[], axis: FoldAxis = 'horizontal'): FoldedStructure {
    const operations: FoldOperation[] = [];
    let working: number[] = [...data];
    let depth = 0;
    let folded: number[][] = [working];

    while (working.length > 1 && depth < this._maxDepth) {
      const foldedLayer = this._applyFold(working, axis);
      operations.push({ axis, layers: depth + 1, appliedAt: Date.now() });
      folded = this._mergeLayers(folded, foldedLayer);
      working = foldedLayer.flat();
      depth++;
    }

    const structure: FoldedStructure = {
      id: `origami-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      original: [...data],
      folded,
      operations,
      depth,
    };
    this._structures.push(structure);
    if (this._structures.length > 100) this._structures.shift();
    return structure;
  }

  private _applyFold(data: number[], axis: FoldAxis): number[][] {
    const half = Math.ceil(data.length / 2);
    const first = data.slice(0, half);
    const second = data.slice(half);
    if (axis === 'reverse') {
      return [second, first];
    }
    if (axis === 'diagonal') {
      const padded = first.length === second.length
        ? first
        : [...first, ...new Array(second.length - first.length).fill(0)];
      return [padded.map((v, i) => v + (second[i] ?? 0))];
    }
    if (axis === 'vertical') {
      return [second.map((v, i) => v + (first[i] ?? 0))];
    }
    return [first, second];
  }

  private _mergeLayers(existing: number[][], newLayer: number[][]): number[][] {
    return [...existing, ...newLayer];
  }

  refold(structureId: string, axis: FoldAxis): FoldedStructure | null {
    const original = this._structures.find(s => s.id === structureId);
    if (!original) return null;
    return this.fold(original.original, axis);
  }

  setMaxDepth(depth: number): void {
    this._maxDepth = Math.max(1, depth);
  }

  getStructures(): FoldedStructure[] {
    return [...this._structures];
  }

  getStructure(id: string): FoldedStructure | null {
    return this._structures.find(s => s.id === id) ?? null;
  }

  get structureCount(): number {
    return this._structures.length;
  }
}
