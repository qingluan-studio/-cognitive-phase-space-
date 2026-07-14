export type ProphecyTone = 'cryptic' | 'evasive' | 'dual' | 'conditional';

export interface DelphicProphecy {
  id: string;
  text: string;
  tone: ProphecyTone;
  interpretations: string[];
  deliveredAt: number;
  resolved: boolean;
  ambiguityIndex: number;
}

export interface ResolutionRecord {
  prophecyId: string;
  outcome: string;
  chosenInterpretation: string;
  resolvedAt: number;
  posteriorProbability: number;
}

export class DelphiInterface {
  private _prophecies: Map<string, DelphicProphecy> = new Map();
  private _resolutions: ResolutionRecord[] = [];
  private _templates: Map<ProphecyTone, string[]> = new Map();
  private _maxInterpretations = 4;
  private _beliefNetwork: Map<string, Map<string, number>> = new Map();
  private _priorDistribution: Map<string, number> = new Map();

  constructor() {
    this._templates.set('cryptic', ['当双头蛇咬住自身，城邦将易主', '木墙将庇护舰队，或为船，或为篱']);
    this._templates.set('evasive', ['此事或将如此，亦或如彼', '时机未明，时机已至']);
    this._templates.set('dual', ['胜败皆由同一人所决', '你将归乡，亦将永不归乡']);
    this._templates.set('conditional', ['若渡河，帝国将亡；若不渡，亦亡', '若问则失，不问亦失']);
  }

  deliver(tone: ProphecyTone): DelphicProphecy {
    const templates = this._templates.get(tone) ?? ['预言模糊'];
    const text = templates[Math.floor(Math.random() * templates.length)];
    const interpretations = this._generateInterpretations(text);
    const ambiguity = this._computeAmbiguity(text, interpretations);
    const prophecy: DelphicProphecy = {
      id: `prophecy-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      text,
      tone,
      interpretations,
      deliveredAt: Date.now(),
      resolved: false,
      ambiguityIndex: ambiguity,
    };
    this._prophecies.set(prophecy.id, prophecy);
    return prophecy;
  }

  private _generateInterpretations(text: string): string[] {
    const interpretations: string[] = [];
    const directions = ['正向解读：', '反向解读：', '隐喻解读：', '历史解读：'];
    for (let i = 0; i < this._maxInterpretations; i++) {
      interpretations.push(`${directions[i]} ${text.slice(0, 4)} → 结果${i + 1}`);
    }
    return interpretations;
  }

  private _computeAmbiguity(text: string, interpretations: string[]): number {
    const uniqueWords = new Set(text.split(''));
    const entropy = Math.log2(uniqueWords.size + 1) / Math.log2(text.length + 1);
    return Math.min(1, entropy + interpretations.length * 0.05);
  }

  addCustomInterpretation(prophecyId: string, interpretation: string): boolean {
    const prophecy = this._prophecies.get(prophecyId);
    if (!prophecy) return false;
    if (prophecy.interpretations.length >= this._maxInterpretations * 2) return false;
    prophecy.interpretations.push(interpretation);
    prophecy.ambiguityIndex = this._computeAmbiguity(prophecy.text, prophecy.interpretations);
    return true;
  }

  resolve(prophecyId: string, outcome: string): ResolutionRecord | null {
    const prophecy = this._prophecies.get(prophecyId);
    if (!prophecy || prophecy.resolved) return null;
    const chosen = this._bayesianSelectInterpretation(prophecy, outcome);
    const posterior = this._computePosterior(prophecy.text, outcome);
    const record: ResolutionRecord = {
      prophecyId,
      outcome,
      chosenInterpretation: chosen,
      resolvedAt: Date.now(),
      posteriorProbability: posterior,
    };
    prophecy.resolved = true;
    this._resolutions.push(record);
    if (this._resolutions.length > 200) this._resolutions.shift();
    return record;
  }

  private _bayesianSelectInterpretation(prophecy: DelphicProphecy, outcome: string): string {
    let best = prophecy.interpretations[0] ?? '';
    let maxPosterior = -1;
    for (const interp of prophecy.interpretations) {
      const posterior = this._computePosterior(interp, outcome);
      if (posterior > maxPosterior) {
        maxPosterior = posterior;
        best = interp;
      }
    }
    return best;
  }

  private _computePosterior(hypothesis: string, evidence: string): number {
    const prior = 1 / (hypothesis.length + 1);
    let likelihood = 1;
    for (const word of evidence.split('')) {
      likelihood *= this._fitInterpretation(hypothesis, word);
    }
    return Math.min(1, prior * likelihood);
  }

  private _fitInterpretation(interpretation: string, outcome: string): number {
    let score = 0;
    for (const word of outcome.split('')) {
      if (interpretation.includes(word)) score++;
    }
    return score / Math.max(1, outcome.length);
  }

  findBestFittingInterpretation(prophecyId: string, outcome: string): string | null {
    const prophecy = this._prophecies.get(prophecyId);
    if (!prophecy) return null;
    let best = prophecy.interpretations[0] ?? '';
    let bestScore = -1;
    for (const interp of prophecy.interpretations) {
      const score = this._fitInterpretation(interp, outcome);
      if (score > bestScore) {
        bestScore = score;
        best = interp;
      }
    }
    return best;
  }

  computeSystemAmbiguity(): number {
    const values = Array.from(this._prophecies.values());
    if (values.length === 0) return 0;
    return values.reduce((s, p) => s + p.ambiguityIndex, 0) / values.length;
  }

  updateBelief(prophecyId: string, outcome: string, probability: number): void {
    if (!this._beliefNetwork.has(prophecyId)) {
      this._beliefNetwork.set(prophecyId, new Map());
    }
    this._beliefNetwork.get(prophecyId)!.set(outcome, probability);
    const total = Array.from(this._beliefNetwork.get(prophecyId)!.values()).reduce((s, v) => s + v, 0);
    this._priorDistribution.set(prophecyId, total > 0 ? probability / total : 0);
  }

  addTemplate(tone: ProphecyTone, template: string): void {
    const list = this._templates.get(tone) ?? [];
    list.push(template);
    this._templates.set(tone, list);
  }

  getProphecy(prophecyId: string): DelphicProphecy | null {
    return this._prophecies.get(prophecyId) ?? null;
  }

  getResolutionHistory(limit: number = 50): ResolutionRecord[] {
    return this._resolutions.slice(-limit);
  }

  get prophecyCount(): number {
    return this._prophecies.size;
  }

  get resolvedCount(): number {
    return this._prophecies.size > 0
      ? Array.from(this._prophecies.values()).filter((p) => p.resolved).length
      : 0;
  }

  get averageAmbiguity(): number {
    return this.computeSystemAmbiguity();
  }
}
