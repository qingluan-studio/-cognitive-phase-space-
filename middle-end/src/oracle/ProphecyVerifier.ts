/**
 * 预言验证器模块：检查曾经的预言是否在事后实现，
 * 对预言准确性进行评分，识别真预言与假预言。
 */

export type VerificationVerdict = 'fulfilled' | 'failed' | 'partial' | 'ambiguous' | 'pending';

export interface VerificationCase {
  id: string;
  prophecyId: string;
  prophecyText: string;
  actualOutcome: string;
  verdict: VerificationVerdict;
  score: number;
  verifiedAt: number | null;
}

export class ProphecyVerifier {
  private _cases: Map<string, VerificationCase> = new Map();
  private _keywords: Map<string, string[]> = new Map();
  private _scoringRules: Map<VerificationVerdict, number> = new Map();
  private _minFulfilledScore = 0.6;

  constructor() {
    this._scoringRules.set('fulfilled', 1.0);
    this._scoringRules.set('partial', 0.5);
    this._scoringRules.set('ambiguous', 0.3);
    this._scoringRules.set('failed', 0.0);
    this._scoringRules.set('pending', 0.0);
  }

  registerCase(verificationCase: VerificationCase): void {
    verificationCase.verdict = 'pending';
    verificationCase.verifiedAt = null;
    this._cases.set(verificationCase.id, verificationCase);
  }

  registerKeywords(prophecyId: string, words: string[]): void {
    this._keywords.set(prophecyId, words);
  }

  private _scoreMatch(prophecyText: string, outcome: string): number {
    const keywords = this._keywords.get(prophecyText) ?? prophecyText.split(/\s+/);
    let matched = 0;
    for (const word of keywords) {
      if (outcome.includes(word)) matched++;
    }
    return keywords.length === 0 ? 0 : matched / keywords.length;
  }

  verify(caseId: string, actualOutcome: string): VerificationCase | null {
    const verificationCase = this._cases.get(caseId);
    if (!verificationCase) return null;
    verificationCase.actualOutcome = actualOutcome;
    const score = this._scoreMatch(verificationCase.prophecyText, actualOutcome);
    verificationCase.score = score;
    let verdict: VerificationVerdict;
    if (score >= this._minFulfilledScore) verdict = 'fulfilled';
    else if (score >= 0.3) verdict = 'partial';
    else if (score > 0) verdict = 'ambiguous';
    else verdict = 'failed';
    verificationCase.verdict = verdict;
    verificationCase.verifiedAt = Date.now();
    return verificationCase;
  }

  getAccuracy(): number {
    const verified = Array.from(this._cases.values()).filter(c => c.verifiedAt !== null);
    if (verified.length === 0) return 0;
    const totalScore = verified.reduce((sum, c) => sum + c.score, 0);
    return totalScore / verified.length;
  }

  findByVerdict(verdict: VerificationVerdict): VerificationCase[] {
    return Array.from(this._cases.values()).filter(c => c.verdict === verdict);
  }

  findFalseProphets(): string[] {
    return this.findByVerdict('failed').map(c => c.prophecyId);
  }

  findTrueProphets(): string[] {
    return this.findByVerdict('fulfilled').map(c => c.prophecyId);
  }

  setMinFulfilledScore(value: number): void {
    this._minFulfilledScore = Math.max(0, Math.min(1, value));
  }

  getVerifiedCount(): number {
    return Array.from(this._cases.values()).filter(c => c.verifiedAt !== null).length;
  }

  listAllCases(): VerificationCase[] {
    return Array.from(this._cases.values());
  }

  purgeUnverified(): number {
    let removed = 0;
    for (const [id, c] of this._cases) {
      if (c.verifiedAt === null) {
        this._cases.delete(id);
        removed++;
      }
    }
    return removed;
  }

  get caseCount(): number {
    return this._cases.size;
  }
}
