/**
 * 通过仪式模块：新模块必须通过考验才能被系统接纳，
 * 考验包含功能测试、压力测试、伦理测试等多重关卡。
 */

export type TrialOutcome = 'pending' | 'passed' | 'failed' | 'conditional';

export interface TrialStep {
  id: string;
  name: string;
  description: string;
  required: boolean;
  passed: boolean;
  score: number;
}

export interface PassageCandidate {
  id: string;
  moduleName: string;
  steps: TrialStep[];
  outcome: TrialOutcome;
  initiatedAt: number;
  completedAt: number | null;
}

export class RiteOfPassage {
  private _candidates: Map<string, PassageCandidate> = new Map();
  private _template: TrialStep[] = [];
  private _minPassScore = 0.7;
  private _graduated: Set<string> = new Set();

  setTrialTemplate(steps: TrialStep[]): void {
    this._template = steps.map(s => ({ ...s, passed: false, score: 0 }));
  }

  initiate(moduleName: string): PassageCandidate {
    const candidate: PassageCandidate = {
      id: `cand-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      moduleName,
      steps: this._template.map(s => ({ ...s })),
      outcome: 'pending',
      initiatedAt: Date.now(),
      completedAt: null,
    };
    this._candidates.set(candidate.id, candidate);
    return candidate;
  }

  evaluateStep(candidateId: string, stepId: string, score: number): TrialStep | null {
    const candidate = this._candidates.get(candidateId);
    if (!candidate) return null;
    const step = candidate.steps.find(s => s.id === stepId);
    if (!step) return null;
    step.score = Math.max(0, Math.min(1, score));
    step.passed = step.score >= this._minPassScore;
    return step;
  }

  private _computeOutcome(candidate: PassageCandidate): TrialOutcome {
    const requiredSteps = candidate.steps.filter(s => s.required);
    const allRequiredPassed = requiredSteps.every(s => s.passed);
    if (!allRequiredPassed) return 'failed';
    const totalScore = candidate.steps.reduce((sum, s) => sum + s.score, 0);
    const averageScore = candidate.steps.length > 0 ? totalScore / candidate.steps.length : 0;
    if (averageScore >= this._minPassScore) return 'passed';
    return 'conditional';
  }

  conclude(candidateId: string): PassageCandidate | null {
    const candidate = this._candidates.get(candidateId);
    if (!candidate || candidate.outcome !== 'pending') return null;
    candidate.outcome = this._computeOutcome(candidate);
    candidate.completedAt = Date.now();
    if (candidate.outcome === 'passed') {
      this._graduated.add(candidate.moduleName);
    }
    return candidate;
  }

  hasGraduated(moduleName: string): boolean {
    return this._graduated.has(moduleName);
  }

  setMinPassScore(value: number): void {
    this._minPassScore = Math.max(0, Math.min(1, value));
  }

  getCandidate(candidateId: string): PassageCandidate | null {
    return this._candidates.get(candidateId) ?? null;
  }

  getCandidateByModule(moduleName: string): PassageCandidate | null {
    for (const c of this._candidates.values()) {
      if (c.moduleName === moduleName) return c;
    }
    return null;
  }

  findPending(): PassageCandidate[] {
    return Array.from(this._candidates.values()).filter(c => c.outcome === 'pending');
  }

  findByOutcome(outcome: TrialOutcome): PassageCandidate[] {
    return Array.from(this._candidates.values()).filter(c => c.outcome === outcome);
  }

  listGraduates(): string[] {
    return Array.from(this._graduated);
  }

  revokeGraduation(moduleName: string): boolean {
    return this._graduated.delete(moduleName);
  }

  get candidateCount(): number {
    return this._candidates.size;
  }

  get graduateCount(): number {
    return this._graduated.size;
  }
}
