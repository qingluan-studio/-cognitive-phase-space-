/**
 * 表观遗传开关：通过甲基化/去甲基化标记在不改动核心代码的前提下
 * 开启或关闭功能表达，实现可遗传却可逆的调控层。
 */

export type MarkKind = 'methylation' | 'acetylation' | 'phosphorylation';

export interface EpigeneticMark {
  locus: string;
  kind: MarkKind;
  level: number;
  appliedAt: number;
}

export interface GeneLocus {
  id: string;
  name: string;
  defaultExpression: boolean;
  description: string;
}

export interface SwitchState {
  expressed: boolean;
  marks: EpigeneticMark[];
  lastToggledAt: number | null;
}

export class EpigeneticSwitch {
  private _loci: Map<string, GeneLocus> = new Map();
  private _states: Map<string, SwitchState> = new Map();
  private _inherited: Map<string, number> = new Map();
  private _toggleCount = 0;

  registerLocus(locus: GeneLocus): void {
    this._loci.set(locus.id, locus);
    this._states.set(locus.id, {
      expressed: locus.defaultExpression,
      marks: [],
      lastToggledAt: null,
    });
  }

  methylate(locusId: string, level: number): EpigeneticMark {
    const state = this._states.get(locusId);
    if (!state) throw new Error(`Unknown locus: ${locusId}`);
    const mark: EpigeneticMark = {
      locus: locusId,
      kind: 'methylation',
      level: Math.max(0, Math.min(1, level)),
      appliedAt: Date.now(),
    };
    state.marks.push(mark);
    if (mark.level > 0.5) state.expressed = false;
    return mark;
  }

  demethylate(locusId: string): void {
    const state = this._states.get(locusId);
    if (!state) return;
    state.marks = state.marks.filter(m => m.kind !== 'methylation');
    const locus = this._loci.get(locusId);
    if (locus) state.expressed = locus.defaultExpression;
  }

  toggleExpression(locusId: string): boolean {
    const state = this._states.get(locusId);
    if (!state) throw new Error(`Unknown locus: ${locusId}`);
    state.expressed = !state.expressed;
    state.lastToggledAt = Date.now();
    this._toggleCount++;
    return state.expressed;
  }

  isExpressed(locusId: string): boolean {
    return this._states.get(locusId)?.expressed ?? false;
  }

  getMarkProfile(locusId: string): EpigeneticMark[] {
    const state = this._states.get(locusId);
    return state ? [...state.marks] : [];
  }

  inheritMarks(parentLocus: string, childLocus: string, retention: number): void {
    const parentState = this._states.get(parentLocus);
    const childState = this._states.get(childLocus);
    if (!parentState || !childState) return;
    for (const mark of parentState.marks) {
      childState.marks.push({ ...mark, level: mark.level * retention });
    }
    this._inherited.set(`${parentLocus}->${childLocus}`, Date.now());
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
}
