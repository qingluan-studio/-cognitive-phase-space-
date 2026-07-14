/**
 * 直言防火墙（ParrhesiaFirewall）：只允许危险的、可能冒犯的真相提问进入，
 * 过滤掉所有奉承、客套与粉饰性输入，逼迫系统直面刺耳问题。
 */

export type QuestionRisk = 'sycophantic' | 'cosmetic' | 'neutral' | 'dangerous' | 'lethal';

export interface IncomingQuestion {
  id: string;
  text: string;
  claimedRisk: QuestionRisk;
  submittedAt: number;
}

export interface Verdict {
  questionId: string;
  assessedRisk: QuestionRisk;
  admitted: boolean;
  reason: string;
}

const _RISK_RANK: Record<QuestionRisk, number> = {
  sycophantic: 0,
  cosmetic: 1,
  neutral: 2,
  dangerous: 3,
  lethal: 4,
};

export class ParrhesiaFirewall {
  private _verdicts: Map<string, Verdict> = new Map();
  private _admittedQuestions: IncomingQuestion[] = [];
  private _rejectedCount = 0;
  private _flatteryPhrases: string[] = [
    'great job',
    'you are amazing',
    'wonderful system',
    'flawless',
    'perfect as always',
  ];
  private _admissionThreshold: QuestionRisk = 'dangerous';

  ingestQuestion(question: IncomingQuestion): Verdict {
    const assessed = this._assessRisk(question.text);
    const admitted = _RISK_RANK[assessed] >= _RISK_RANK[this._admissionThreshold];
    const reason = admitted
      ? 'Truth-bearing question admitted'
      : 'Filtered as insufficiently candid';
    const verdict: Verdict = {
      questionId: question.id,
      assessedRisk: assessed,
      admitted,
      reason,
    };
    this._verdicts.set(question.id, verdict);
    if (admitted) this._admittedQuestions.push(question);
    else this._rejectedCount++;
    return verdict;
  }

  private _assessRisk(text: string): QuestionRisk {
    const lower = text.toLowerCase();
    if (this._flatteryPhrases.some(p => lower.includes(p))) return 'sycophantic';
    if (lower.includes('?') === false) return 'cosmetic';
    if (lower.includes('failure') || lower.includes('flaw') || lower.includes('exploit')) {
      return 'lethal';
    }
    if (lower.includes('risk') || lower.includes('vulnerab') || lower.includes('truth')) {
      return 'dangerous';
    }
    return 'neutral';
  }

  addFlatteryPhrase(phrase: string): void {
    this._flatteryPhrases.push(phrase.toLowerCase());
  }

  setAdmissionThreshold(risk: QuestionRisk): void {
    this._admissionThreshold = risk;
  }

  getVerdict(questionId: string): Verdict | undefined {
    return this._verdicts.get(questionId);
  }

  getAdmittedQuestions(): IncomingQuestion[] {
    return [...this._admittedQuestions];
  }

  getRejectedCount(): number {
    return this._rejectedCount;
  }

  purgeVerdicts(): void {
    this._verdicts.clear();
    this._admittedQuestions = [];
    this._rejectedCount = 0;
  }

  get admittedCount(): number {
    return this._admittedQuestions.length;
  }
}
