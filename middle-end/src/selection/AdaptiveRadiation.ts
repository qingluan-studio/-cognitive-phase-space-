export interface RadiationLineage {
  id: string;
  parentId: string | null;
  nicheIndex: number;
  characterState: number[];
  divergenceTime: number;
  fitness: number;
}

export interface NicheOverlap {
  lineageA: string;
  lineageB: string;
  overlapIndex: number;
  competitiveExclusion: boolean;
}

export class AdaptiveRadiation {
  private _lineages: Map<string, RadiationLineage> = new Map();
  private _nicheSpace: number[][] = [];
  private _state: Record<string, unknown> = {};
  private _phylogeneticDiversity: number = 0;
  private _characterDisplacementMatrix: Map<string, Map<string, number>> = new Map();

  constructor(nicheDimensions: number = 3) {
    this._nicheSpace = Array.from({ length: 20 }, () =>
      Array.from({ length: nicheDimensions }, () => Math.random())
    );
  }

  get lineageCount(): number {
    return this._lineages.size;
  }

  get nicheDimensions(): number {
    return this._nicheSpace[0]?.length ?? 0;
  }

  addLineage(id: string, parentId: string | null, nicheIndex: number): RadiationLineage {
    const characterState = this._nicheSpace[nicheIndex % this._nicheSpace.length] ?? [];
    const lineage: RadiationLineage = {
      id,
      parentId,
      nicheIndex,
      characterState: [...characterState],
      divergenceTime: Date.now(),
      fitness: 1,
    };
    this._lineages.set(id, lineage);
    this._characterDisplacementMatrix.set(id, new Map());
    this._updatePhylogeneticDiversity();
    return lineage;
  }

  private _updatePhylogeneticDiversity(): void {
    let sum = 0;
    const lineages = Array.from(this._lineages.values());
    for (let i = 0; i < lineages.length; i++) {
      for (let j = i + 1; j < lineages.length; j++) {
        const dist = this._euclideanDistance(lineages[i].characterState, lineages[j].characterState);
        sum += dist;
      }
    }
    this._phylogeneticDiversity = sum;
  }

  private _euclideanDistance(a: number[], b: number[]): number {
    const len = Math.max(a.length, b.length);
    let sum = 0;
    for (let i = 0; i < len; i++) {
      sum += Math.pow((a[i] ?? 0) - (b[i] ?? 0), 2);
    }
    return Math.sqrt(sum);
  }

  nicheOverlap(aId: string, bId: string): NicheOverlap | null {
    const a = this._lineages.get(aId);
    const b = this._lineages.get(bId);
    if (!a || !b) return null;
    const dist = this._euclideanDistance(a.characterState, b.characterState);
    const overlapIndex = 1 / (1 + dist);
    const competitiveExclusion = overlapIndex > 0.8;
    return { lineageA: aId, lineageB: bId, overlapIndex, competitiveExclusion };
  }

  characterDisplacement(aId: string, bId: string): number {
    const overlap = this.nicheOverlap(aId, bId);
    if (!overlap) return 0;
    const a = this._lineages.get(aId)!;
    const b = this._lineages.get(bId)!;
    const displacement = overlap.overlapIndex * 0.1;
    for (let i = 0; i < a.characterState.length; i++) {
      a.characterState[i] += displacement * (a.characterState[i] - b.characterState[i]);
      b.characterState[i] -= displacement * (a.characterState[i] - b.characterState[i]);
    }
    this._characterDisplacementMatrix.get(aId)!.set(bId, displacement);
    this._characterDisplacementMatrix.get(bId)!.set(aId, displacement);
    this._updatePhylogeneticDiversity();
    return displacement;
  }

  competitiveExclusion(): string[][] {
    const excluded: string[][] = [];
    const lineages = Array.from(this._lineages.values());
    for (let i = 0; i < lineages.length; i++) {
      for (let j = i + 1; j < lineages.length; j++) {
        const overlap = this.nicheOverlap(lineages[i].id, lineages[j].id);
        if (overlap && overlap.competitiveExclusion) {
          excluded.push([lineages[i].id, lineages[j].id]);
        }
      }
    }
    return excluded;
  }

  radiationTree(): Record<string, string[]> {
    const tree: Record<string, string[]> = {};
    for (const lineage of this._lineages.values()) {
      const parent = lineage.parentId ?? 'root';
      if (!tree[parent]) tree[parent] = [];
      tree[parent].push(lineage.id);
    }
    return tree;
  }

  phylogeneticDiversity(): number {
    return this._phylogeneticDiversity;
  }

  totalCharacterVariance(): number {
    const lineages = Array.from(this._lineages.values());
    if (lineages.length === 0) return 0;
    const dim = lineages[0].characterState.length;
    let totalVar = 0;
    for (let d = 0; d < dim; d++) {
      const values = lineages.map((l) => l.characterState[d]);
      const mean = values.reduce((s, v) => s + v, 0) / values.length;
      totalVar += values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length;
    }
    return totalVar;
  }

  report(): Record<string, unknown> {
    return {
      lineages: this._lineages.size,
      phylogeneticDiversity: this._phylogeneticDiversity,
      characterVariance: this.totalCharacterVariance(),
      competitivePairs: this.competitiveExclusion().length,
      state: this._state,
    };
  }
}
