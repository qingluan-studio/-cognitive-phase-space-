/**
 * 德尔斐接口模块：产生模棱两可但可事后解释的预言，
 * 预言措辞保持多重解读空间，使其在任何结果下都能自圆其说。
 */

export type ProphecyTone = 'cryptic' | 'evasive' | 'dual' | 'conditional';

export interface DelphicProphecy {
  id: string;
  text: string;
  tone: ProphecyTone;
  interpretations: string[];
  deliveredAt: number;
  resolved: boolean;
}

export interface ResolutionRecord {
  prophecyId: string;
  outcome: string;
  chosenInterpretation: string;
  resolvedAt: number;
}

export class DelphiInterface {
  private _prophecies: Map<string, DelphicProphecy> = new Map();
  private _resolutions: ResolutionRecord[] = [];
  private _templates: Map<ProphecyTone, string[]> = new Map();
  private _maxInterpretations = 4;

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
    const prophecy: DelphicProphecy = {
      id: `prophecy-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      text,
      tone,
      interpretations,
      deliveredAt: Date.now(),
      resolved: false,
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

  addCustomInterpretation(prophecyId: string, interpretation: string): boolean {
    const prophecy = this._prophecies.get(prophecyId);
    if (!prophecy) return false;
    if (prophecy.interpretations.length >= this._maxInterpretations * 2) return false;
    prophecy.interpretations.push(interpretation);
    return true;
  }

  resolve(prophecyId: string, outcome: string): ResolutionRecord | null {
    const prophecy = this._prophecies.get(prophecyId);
    if (!prophecy || prophecy.resolved) return null;
    const chosen = prophecy.interpretations[Math.floor(Math.random() * prophecy.interpretations.length)];
    const record: ResolutionRecord = {
      prophecyId,
      outcome,
      chosenInterpretation: chosen,
      resolvedAt: Date.now(),
    };
    prophecy.resolved = true;
    this._resolutions.push(record);
    if (this._resolutions.length > 200) this._resolutions.shift();
    return record;
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
      ? Array.from(this._prophecies.values()).filter(p => p.resolved).length
      : 0;
  }
}
