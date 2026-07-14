/**
 * 矛盾收割机：从矛盾中提取创新假设。
 * 矛盾点不是终点，而是新假设的起点。本模块扫描矛盾并自动生成可测试的假设。
 */

export interface ContradictionPoint {
  id: string;
  claimA: string;
  claimB: string;
  intensity: number;
  harvested: boolean;
}

export interface InnovationHypothesis {
  id: string;
  sourceContradictionId: string;
  statement: string;
  testability: number;
  novelty: number;
  createdAt: number;
}

export class ContradictionHarvester {
  private _contradictions: Map<string, ContradictionPoint> = new Map();
  private _hypotheses: InnovationHypothesis[] = [];
  private _threshold = 0.3;
  private _maxHypotheses = 100;

  addContradiction(point: ContradictionPoint): void {
    this._contradictions.set(point.id, point);
  }

  scan(): ContradictionPoint[] {
    const candidates: ContradictionPoint[] = [];
    for (const c of this._contradictions.values()) {
      if (!c.harvested && c.intensity >= this._threshold) candidates.push(c);
    }
    return candidates.sort((a, b) => b.intensity - a.intensity);
  }

  harvest(id: string): InnovationHypothesis | null {
    const c = this._contradictions.get(id);
    if (!c || c.harvested) return null;
    const hypothesis: InnovationHypothesis = {
      id: `hyp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sourceContradictionId: id,
      statement: `假设：在「${c.claimA}」与「${c.claimB}」之间存在未观察到的第三变量。`,
      testability: Math.random(),
      novelty: c.intensity,
      createdAt: Date.now(),
    };
    this._hypotheses.push(hypothesis);
    if (this._hypotheses.length > this._maxHypotheses) this._hypotheses.shift();
    c.harvested = true;
    return hypothesis;
  }

  rankHypotheses(): InnovationHypothesis[] {
    return [...this._hypotheses].sort(
      (a, b) => b.novelty * b.testability - a.novelty * a.testability
    );
  }

  refineHypothesis(hypId: string): InnovationHypothesis | null {
    const h = this._hypotheses.find(x => x.id === hypId);
    if (!h) return null;
    h.testability = Math.min(1, h.testability + 0.1);
    h.novelty = Math.min(1, h.novelty + 0.05);
    return h;
  }

  setThreshold(value: number): void {
    this._threshold = Math.max(0, Math.min(1, value));
  }

  getHypotheses(): InnovationHypothesis[] {
    return [...this._hypotheses];
  }

  get contradictionCount(): number {
    return this._contradictions.size;
  }
}
