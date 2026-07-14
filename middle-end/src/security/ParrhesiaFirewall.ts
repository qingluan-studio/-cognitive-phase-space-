export type QuestionRisk = 'sycophantic' | 'cosmetic' | 'neutral' | 'dangerous' | 'lethal';

export interface IncomingQuestion {
  id: string;
  text: string;
  claimedRisk: QuestionRisk;
  submittedAt: number;
  source: string;
  confidence: number;
}

export interface Verdict {
  questionId: string;
  assessedRisk: QuestionRisk;
  admitted: boolean;
  reason: string;
  confidence: number;
  truthScore: number;
  offensiveProbability: number;
}

export interface FilterStatistics {
  totalIngested: number;
  admitted: number;
  rejected: number;
  sycophanticCount: number;
  lethalCount: number;
  averageTruthScore: number;
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
  private _flatteryPhrases: Set<string> = new Set([
    'great job', 'you are amazing', 'wonderful system', 'flawless', 'perfect as always',
    'excellent work', 'brilliant', 'outstanding', 'impressive', 'fantastic',
  ]);
  private _dangerKeywords: Set<string> = new Set([
    'failure', 'flaw', 'exploit', 'vulnerability', 'breach', 'compromise', 'risk', 'truth',
    'lie', 'deception', 'weakness', 'bug', 'error', 'crash', 'attack', 'threat',
  ]);
  private _admissionThreshold: QuestionRisk = 'dangerous';
  private _truthDecay = 0.99;
  private _history: Verdict[] = [];

  ingestQuestion(question: IncomingQuestion): Verdict {
    const assessed = this._assessRisk(question.text);
    const admitted = _RISK_RANK[assessed] >= _RISK_RANK[this._admissionThreshold];
    const truthScore = this._calculateTruthScore(question.text);
    const offensiveProbability = this._estimateOffensiveProbability(question.text);
    const confidence = this._calculateAssessmentConfidence(question, assessed, truthScore);

    let reason: string;
    if (admitted) {
      reason = offensiveProbability > 0.7 ? 'Accepted as lethal truth' : 'Truth-bearing question admitted';
      this._admittedQuestions.push(question);
    } else {
      reason = assessed === 'sycophantic' ? 'Filtered as sycophantic' : 'Filtered as insufficiently candid';
      this._rejectedCount++;
    }

    const verdict: Verdict = {
      questionId: question.id,
      assessedRisk: assessed,
      admitted,
      reason,
      confidence,
      truthScore,
      offensiveProbability,
    };

    this._verdicts.set(question.id, verdict);
    this._history.push(verdict);
    this._pruneHistory();
    return verdict;
  }

  private _assessRisk(text: string): QuestionRisk {
    const lower = text.toLowerCase();
    const wordCount = lower.split(/\s+/).length;
    const hasQuestion = lower.includes('?');
    const hasExclamation = lower.includes('!');

    const flatteryMatches = Array.from(this._flatteryPhrases).filter(p => lower.includes(p)).length;
    if (flatteryMatches > 0) {
      return flatteryMatches >= 2 ? 'sycophantic' : 'cosmetic';
    }

    if (!hasQuestion && wordCount < 3) return 'cosmetic';

    const dangerMatches = Array.from(this._dangerKeywords).filter(k => lower.includes(k)).length;
    if (dangerMatches >= 2) return 'lethal';
    if (dangerMatches >= 1) return 'dangerous';

    const negativityScore = this._calculateNegativityScore(lower);
    if (negativityScore > 0.6) return 'dangerous';
    if (negativityScore > 0.3) return 'neutral';

    return hasQuestion ? 'neutral' : 'cosmetic';
  }

  private _calculateNegativityScore(text: string): number {
    const negativeWords = ['fail', 'bad', 'wrong', 'error', 'problem', 'issue', 'broken', 'corrupt', 'malicious'];
    const positiveWords = ['good', 'great', 'excellent', 'perfect', 'amazing', 'wonderful'];
    let negativeCount = 0;
    let positiveCount = 0;

    for (const word of negativeWords) {
      if (text.includes(word)) negativeCount++;
    }
    for (const word of positiveWords) {
      if (text.includes(word)) positiveCount++;
    }

    const total = negativeCount + positiveCount;
    return total > 0 ? negativeCount / total : 0;
  }

  private _calculateTruthScore(text: string): number {
    const lower = text.toLowerCase();
    const lengthScore = Math.min(1, text.length / 100);
    const questionScore = lower.includes('?') ? 0.3 : 0;
    const complexityScore = this._estimateSemanticComplexity(text);
    const dangerBonus = this._dangerKeywords.has('truth') ? 0.2 : 0;

    return (lengthScore * 0.3 + questionScore + complexityScore * 0.4 + dangerBonus) * this._truthDecay;
  }

  private _estimateSemanticComplexity(text: string): number {
    const tokens = text.split(/\s+/);
    const uniqueTokens = new Set(tokens).size;
    const avgLength = tokens.reduce((sum, t) => sum + t.length, 0) / tokens.length;
    return (uniqueTokens / tokens.length + avgLength / 8) / 2;
  }

  private _estimateOffensiveProbability(text: string): number {
    const lower = text.toLowerCase();
    const offensivePatterns = [
      /you (fail|failed|are failing)/,
      /system (is|was|has been) (compromised|breached|hacked)/,
      /your (flaw|flaws|weakness|weaknesses)/,
      /exploit (in|of|at)/,
      /vulnerabilit/,
    ];

    let matches = 0;
    for (const pattern of offensivePatterns) {
      if (pattern.test(lower)) matches++;
    }

    return Math.min(1, matches * 0.25 + (lower.includes('truth') ? 0.1 : 0));
  }

  private _calculateAssessmentConfidence(question: IncomingQuestion, assessed: QuestionRisk, truthScore: number): number {
    let base = question.confidence * 0.5;
    base += truthScore * 0.3;

    const recentSimilar = this._history.filter(
      v => v.assessedRisk === assessed && Date.now() - v.questionId.length < 3600000
    ).length;
    base += Math.min(0.2, recentSimilar * 0.05);

    return Math.min(1, base);
  }

  private _pruneHistory(): void {
    const cutoff = Date.now() - 86400000;
    this._history = this._history.filter(v => v.questionId.length > 0);
  }

  addFlatteryPhrase(phrase: string): void {
    this._flatteryPhrases.add(phrase.toLowerCase());
  }

  removeFlatteryPhrase(phrase: string): void {
    this._flatteryPhrases.delete(phrase.toLowerCase());
  }

  addDangerKeyword(keyword: string): void {
    this._dangerKeywords.add(keyword.toLowerCase());
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
    this._history = [];
  }

  getStatistics(): FilterStatistics {
    const admittedVerdicts = this._history.filter(v => v.admitted);
    const sycophantic = this._history.filter(v => v.assessedRisk === 'sycophantic').length;
    const lethal = this._history.filter(v => v.assessedRisk === 'lethal').length;

    return {
      totalIngested: this._history.length,
      admitted: admittedVerdicts.length,
      rejected: this._history.length - admittedVerdicts.length,
      sycophanticCount: sycophantic,
      lethalCount: lethal,
      averageTruthScore: admittedVerdicts.length > 0
        ? admittedVerdicts.reduce((sum, v) => sum + v.truthScore, 0) / admittedVerdicts.length
        : 0,
    };
  }

  get admittedCount(): number {
    return this._admittedQuestions.length;
  }

  get totalIngested(): number {
    return this._history.length;
  }
}