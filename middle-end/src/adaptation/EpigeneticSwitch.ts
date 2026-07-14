export type MarkKind = 'methylation' | 'acetylation' | 'phosphorylation';

export interface EpigeneticMark {
  locus: string;
  kind: MarkKind;
  level: number;
  appliedAt: number;
  stability: number;
  diffusionRate: number;
}

export interface GeneLocus {
  id: string;
  name: string;
  defaultExpression: boolean;
  description: string;
  position: number;
  regulatoryRegion: boolean;
}

export interface SwitchState {
  expressed: boolean;
  marks: EpigeneticMark[];
  lastToggledAt: number | null;
  expressionLevel: number;
  chromatinState: 'euchromatin' | 'heterochromatin';
}

export interface InheritanceEvent {
  parentLocus: string;
  childLocus: string;
  retention: number;
  transferredMarks: number;
  timestamp: number;
}

export class EpigeneticSwitch {
  private _loci: Map<string, GeneLocus> = new Map();
  private _states: Map<string, SwitchState> = new Map();
  private _inherited: Map<string, InheritanceEvent> = new Map();
  private _toggleCount = 0;
  private _driftRate = 0.001;
  private _generation = 0;

  registerLocus(locus: GeneLocus): void {
    this._loci.set(locus.id, locus);
    this._states.set(locus.id, {
      expressed: locus.defaultExpression,
      marks: [],
      lastToggledAt: null,
      expressionLevel: locus.defaultExpression ? 1 : 0,
      chromatinState: locus.defaultExpression ? 'euchromatin' : 'heterochromatin',
    });
  }

  methylate(locusId: string, level: number, stability: number = 0.5): EpigeneticMark {
    const state = this._states.get(locusId);
    if (!state) throw new Error(`Unknown locus: ${locusId}`);

    const effectiveLevel = Math.max(0, Math.min(1, level));
    const mark: EpigeneticMark = {
      locus: locusId,
      kind: 'methylation',
      level: effectiveLevel,
      appliedAt: Date.now(),
      stability,
      diffusionRate: 0.1 * (1 - stability),
    };

    state.marks.push(mark);
    this._updateExpression(locusId);
    return mark;
  }

  acetylate(locusId: string, level: number): EpigeneticMark {
    const state = this._states.get(locusId);
    if (!state) throw new Error(`Unknown locus: ${locusId}`);

    const effectiveLevel = Math.max(0, Math.min(1, level));
    const mark: EpigeneticMark = {
      locus: locusId,
      kind: 'acetylation',
      level: effectiveLevel,
      appliedAt: Date.now(),
      stability: 0.8,
      diffusionRate: 0.05,
    };

    state.marks.push(mark);
    this._updateExpression(locusId);
    return mark;
  }

  demethylate(locusId: string): void {
    const state = this._states.get(locusId);
    if (!state) return;
    state.marks = state.marks.filter(m => m.kind !== 'methylation');
    const locus = this._loci.get(locusId);
    if (locus) {
      state.expressed = locus.defaultExpression;
      state.expressionLevel = locus.defaultExpression ? 1 : 0;
    }
  }

  private _updateExpression(locusId: string): void {
    const state = this._states.get(locusId);
    const locus = this._loci.get(locusId);
    if (!state || !locus) return;

    let methylationSum = 0;
    let acetylationSum = 0;

    for (const mark of state.marks) {
      if (mark.kind === 'methylation') methylationSum += mark.level;
      if (mark.kind === 'acetylation') acetylationSum += mark.level;
    }

    const methylationFactor = Math.exp(-2 * methylationSum);
    const acetylationFactor = 1 + acetylationSum;
    const regulatoryBonus = locus.regulatoryRegion ? 1.2 : 1;

    state.expressionLevel = Math.max(0, Math.min(1,
      (locus.defaultExpression ? 1 : 0) * methylationFactor * acetylationFactor * regulatoryBonus
    ));

    state.expressed = state.expressionLevel > 0.5;
    state.chromatinState = state.expressed ? 'euchromatin' : 'heterochromatin';
  }

  toggleExpression(locusId: string): boolean {
    const state = this._states.get(locusId);
    if (!state) throw new Error(`Unknown locus: ${locusId}`);
    state.expressed = !state.expressed;
    state.expressionLevel = state.expressed ? 1 : 0;
    state.lastToggledAt = Date.now();
    state.chromatinState = state.expressed ? 'euchromatin' : 'heterochromatin';
    this._toggleCount++;
    return state.expressed;
  }

  isExpressed(locusId: string): boolean {
    return this._states.get(locusId)?.expressed ?? false;
  }

  getExpressionLevel(locusId: string): number {
    return this._states.get(locusId)?.expressionLevel ?? 0;
  }

  getMarkProfile(locusId: string): EpigeneticMark[] {
    const state = this._states.get(locusId);
    return state ? [...state.marks] : [];
  }

  inheritMarks(parentLocus: string, childLocus: string, retention: number): void {
    const parentState = this._states.get(parentLocus);
    const childState = this._states.get(childLocus);
    if (!parentState || !childState) return;

    let transferred = 0;
    for (const mark of parentState.marks) {
      const transferredLevel = mark.level * retention * mark.stability;
      if (transferredLevel > 0.01) {
        childState.marks.push({ ...mark, level: transferredLevel, appliedAt: Date.now() });
        transferred++;
      }
    }

    this._inherited.set(`${parentLocus}->${childLocus}`, {
      parentLocus,
      childLocus,
      retention,
      transferredMarks: transferred,
      timestamp: Date.now(),
    });

    this._updateExpression(childLocus);
  }

  applyGeneticDrift(): void {
    this._generation++;
    for (const [locusId, state] of this._states) {
      for (const mark of state.marks) {
        const drift = (Math.random() - 0.5) * 2 * this._driftRate;
        mark.level = Math.max(0, Math.min(1, mark.level + drift));
      }
      this._updateExpression(locusId);
    }
  }

  diffuseMarks(): void {
    const lociArray = Array.from(this._loci.values()).sort((a, b) => a.position - b.position);

    for (let i = 0; i < lociArray.length; i++) {
      const current = this._states.get(lociArray[i].id);
      if (!current) continue;

      for (let j = i - 1; j <= i + 1; j++) {
        if (j < 0 || j >= lociArray.length || j === i) continue;

        const neighbor = this._states.get(lociArray[j].id);
        if (!neighbor) continue;

        const distance = Math.abs(lociArray[i].position - lociArray[j].position);
        const diffusionFactor = Math.exp(-distance * 0.5);

        for (const mark of current.marks) {
          const diffusedLevel = mark.level * mark.diffusionRate * diffusionFactor;
          const existingMark = neighbor.marks.find(m => m.kind === mark.kind);
          if (existingMark) {
            existingMark.level = Math.min(1, existingMark.level + diffusedLevel);
          } else {
            neighbor.marks.push({ ...mark, level: diffusedLevel, appliedAt: Date.now() });
          }
        }
      }
    }

    for (const locus of lociArray) {
      this._updateExpression(locus.id);
    }
  }

  getActiveGenes(): string[] {
    const active: string[] = [];
    for (const [id, state] of this._states) {
      if (state.expressed) active.push(id);
    }
    return active;
  }

  getLocus(id: string): GeneLocus | undefined {
    return this._loci.get(id);
  }

  get locusCount(): number {
    return this._loci.size;
  }

  get toggleCount(): number {
    return this._toggleCount;
  }

  get generation(): number {
    return this._generation;
  }

  setDriftRate(rate: number): void {
    this._driftRate = Math.max(0, Math.min(0.1, rate));
  }
}