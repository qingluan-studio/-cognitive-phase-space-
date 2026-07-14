/**
 * 自然选择器：优胜劣汰的决策者。
 * 根据适应度对候选模块进行排序与筛选，保留高分者淘汰低分者。
 */

export interface Candidate {
  id: string;
  fitness: number;
  age: number;
  traits: Record<string, unknown>;
}

export interface SelectionResult {
  survivors: string[];
  eliminated: string[];
  averageFitness: number;
  selectedAt: number;
}

export class NaturalSelector {
  private _candidates: Map<string, Candidate> = new Map();
  private _history: SelectionResult[] = [];
  private _survivalRatio = 0.5;
  private _maxAge = 100;

  registerCandidate(candidate: Candidate): void {
    this._candidates.set(candidate.id, candidate);
  }

  select(): SelectionResult {
    const sorted = Array.from(this._candidates.values()).sort((a, b) => b.fitness - a.fitness);
    const survivorCount = Math.max(1, Math.floor(sorted.length * this._survivalRatio));
    const survivors: string[] = [];
    const eliminated: string[] = [];
    for (let i = 0; i < sorted.length; i++) {
      if (i < survivorCount && sorted[i].age < this._maxAge) {
        survivors.push(sorted[i].id);
      } else {
        eliminated.push(sorted[i].id);
        this._candidates.delete(sorted[i].id);
      }
    }
    const averageFitness = sorted.length > 0
      ? survivors.reduce((s, id) => s + (this._candidates.get(id)?.fitness ?? 0), 0) / Math.max(survivors.length, 1)
      : 0;
    const result: SelectionResult = {
      survivors,
      eliminated,
      averageFitness,
      selectedAt: Date.now(),
    };
    this._history.push(result);
    if (this._history.length > 100) this._history.shift();
    return result;
  }

  ageAll(): void {
    for (const c of this._candidates.values()) c.age++;
  }

  setSurvivalRatio(value: number): void {
    this._survivalRatio = Math.max(0, Math.min(1, value));
  }

  setMaxAge(age: number): void {
    this._maxAge = Math.max(1, age);
  }

  getCandidate(id: string): Candidate | null {
    return this._candidates.get(id) ?? null;
  }

  getHistory(limit: number = 20): SelectionResult[] {
    return this._history.slice(-limit);
  }

  get candidateCount(): number {
    return this._candidates.size;
  }
}
