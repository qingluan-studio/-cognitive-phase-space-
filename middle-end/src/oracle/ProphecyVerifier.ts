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
  private _confusionMatrix: { tp: number; fp: number; tn: number; fn: number } = { tp: 0, fp: 0, tn: 0, fn: 0 };
  private _rocPoints: Array<{ fpr: number; tpr: number }> = [];

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
    this._updateConfusionMatrix(verdict, score);
    return verificationCase;
  }

  getAccuracy(): number {
    const verified = Array.from(this._cases.values()).filter((c) => c.verifiedAt !== null);
    if (verified.length === 0) return 0;
    const totalScore = verified.reduce((sum, c) => sum + c.score, 0);
    return totalScore / verified.length;
  }

  computePrecision(): number {
    const tp = this._confusionMatrix.tp;
    const fp = this._confusionMatrix.fp;
    return tp + fp === 0 ? 0 : tp / (tp + fp);
  }

  computeRecall(): number {
    const tp = this._confusionMatrix.tp;
    const fn = this._confusionMatrix.fn;
    return tp + fn === 0 ? 0 : tp / (tp + fn);
  }

  computeF1Score(): number {
    const p = this.computePrecision();
    const r = this.computeRecall();
    return p + r === 0 ? 0 : (2 * p * r) / (p + r);
  }

  computeCohenKappa(): number {
    const total = this._cases.size || 1;
    const observed = this.getAccuracy();
    const pYes = (this._confusionMatrix.tp + this._confusionMatrix.fp) / total;
    const pNo = (this._confusionMatrix.tn + this._confusionMatrix.fn) / total;
    const pYesExpected = pYes * pYes + pNo * pNo;
    return (observed - pYesExpected) / (1 - pYesExpected + 1e-9);
  }

  computeAUC(): number {
    if (this._rocPoints.length < 2) return 0.5;
    const sorted = [...this._rocPoints].sort((a, b) => a.fpr - b.fpr);
    let auc = 0;
    for (let i = 1; i < sorted.length; i++) {
      const dx = sorted[i].fpr - sorted[i - 1].fpr;
      const avgY = (sorted[i].tpr + sorted[i - 1].tpr) / 2;
      auc += dx * avgY;
    }
    return Math.max(0, Math.min(1, auc));
  }

  findByVerdict(verdict: VerificationVerdict): VerificationCase[] {
    return Array.from(this._cases.values()).filter((c) => c.verdict === verdict);
  }

  findFalseProphets(): string[] {
    return this.findByVerdict('failed').map((c) => c.prophecyId);
  }

  findTrueProphets(): string[] {
    return this.findByVerdict('fulfilled').map((c) => c.prophecyId);
  }

  setMinFulfilledScore(value: number): void {
    this._minFulfilledScore = Math.max(0, Math.min(1, value));
  }

  getVerifiedCount(): number {
    return Array.from(this._cases.values()).filter((c) => c.verifiedAt !== null).length;
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

  get confusionMatrix(): Record<string, number> {
    return { ...this._confusionMatrix };
  }

  private _updateConfusionMatrix(verdict: VerificationVerdict, score: number): void {
    if (verdict === 'fulfilled') {
      this._confusionMatrix.tp++;
      this._rocPoints.push({ fpr: 0, tpr: 1 });
    } else if (verdict === 'failed') {
      this._confusionMatrix.fn++;
      this._rocPoints.push({ fpr: 1, tpr: 0 });
    } else if (score > 0.3) {
      this._confusionMatrix.fp++;
      this._rocPoints.push({ fpr: 1, tpr: score });
    } else {
      this._confusionMatrix.tn++;
      this._rocPoints.push({ fpr: 0, tpr: score });
    }
  }
}
