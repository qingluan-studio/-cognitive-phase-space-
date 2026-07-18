import type { DataPacket, Signal, Handler } from '../shared/types';

export type HumanizationLevel = 'subtle' | 'moderate' | 'strong' | 'extreme';

export interface HumanizationConfig {
  level: HumanizationLevel;
  addTypos: boolean;
  addContractions: boolean;
  addFillers: boolean;
  varySentenceLength: boolean;
  addCasualPhrases: boolean;
  addPersonalTone: boolean;
}

export interface HumanizationResult {
  original: string;
  humanized: string;
  changes: HumanizationChange[];
  level: HumanizationLevel;
  humanScore: number;
  processingTime: number;
}

export interface HumanizationChange {
  type: 'typo' | 'contraction' | 'filler' | 'sentence_variation' | 'casual' | 'tone';
  original: string;
  modified: string;
  position: number;
}

export interface HumanStyle {
  id: string;
  name: string;
  formality: number;
  verbosity: number;
  warmth: number;
  typosFrequency: number;
  fillerFrequency: number;
  description: string;
}

export interface HumanizerStats {
  totalHumanizations: number;
  avgHumanScore: number;
  mostUsedStyle: string | null;
  mostUsedLevel: HumanizationLevel | null;
}

const DEFAULT_STYLES: HumanStyle[] = [
  { id: 'casual', name: 'Casual Conversational', formality: 0.2, verbosity: 0.5, warmth: 0.8, typosFrequency: 0.02, fillerFrequency: 0.05, description: 'Friendly, relaxed tone' },
  { id: 'professional', name: 'Professional', formality: 0.7, verbosity: 0.6, warmth: 0.4, typosFrequency: 0.005, fillerFrequency: 0.01, description: 'Polished, business-appropriate' },
  { id: 'playful', name: 'Playful', formality: 0.1, verbosity: 0.7, warmth: 0.9, typosFrequency: 0.03, fillerFrequency: 0.08, description: 'Fun, energetic, lighthearted' }
];

const CONTRACTIONS: [string, string][] = [
  ['do not', "don't"], ['does not', "doesn't"], ['is not', "isn't"], ['are not', "aren't"],
  ['have not', "haven't"], ['has not', "hasn't"], ['will not', "won't"], ['would not', "wouldn't"],
  ['cannot', "can't"], ['could not', "couldn't"], ['should not', "shouldn't"],
  ['I am', "I'm"], ['you are', "you're"], ['he is', "he's"], ['she is', "she's"],
  ['it is', "it's"], ['we are', "we're"], ['they are', "they're"], ['I will', "I'll"],
  ['you will', "you'll"], ['we will', "we'll"], ['they will', "they'll"],
  ['I have', "I've"], ['you have', "you've"], ['we have', "we've"], ['they have', "they've"]
];

const CASUAL_PHRASES: [string, string][] = [
  ['Therefore,', 'So,'], ['However,', 'But,'], ['In addition,', 'Also,'],
  ['Furthermore,', 'Plus,'], ['I believe that', 'I think that'], ['In my opinion', 'Honestly'],
  ['As a result', 'So basically'], ['For example', 'Like']
];

const FILLER_PHRASES = ['like', 'you know', 'I mean', 'basically', 'actually', 'sort of', 'well', 'so', 'right'];

export class Humanizer {
  private _styles: Map<string, HumanStyle>;
  private _activeStyle: string;
  private _defaultConfig: HumanizationConfig;
  private _history: { original: string; result: HumanizationResult; styleId: string; timestamp: number }[];
  private _maxHistorySize: number;

  constructor() {
    this._styles = new Map();
    for (const s of DEFAULT_STYLES) this._styles.set(s.id, s);
    this._activeStyle = 'casual';
    this._defaultConfig = {
      level: 'moderate', addTypos: true, addContractions: true, addFillers: false,
      varySentenceLength: true, addCasualPhrases: true, addPersonalTone: true
    };
    this._history = [];
    this._maxHistorySize = 200;
  }

  get styleCount(): number { return this._styles.size; }
  get activeStyle(): string { return this._activeStyle; }
  get defaultConfig(): HumanizationConfig { return { ...this._defaultConfig }; }
  get history(): { original: string; result: HumanizationResult; styleId: string; timestamp: number }[] {
    return [...this._history];
  }

  public addStyle(style: HumanStyle): void { this._styles.set(style.id, { ...style }); }
  public removeStyle(styleId: string): boolean {
    if (styleId === this._activeStyle && this._styles.size > 1) {
      const firstId = this._styles.keys().next().value;
      if (firstId && firstId !== styleId) this._activeStyle = firstId;
    }
    return this._styles.delete(styleId);
  }
  public getStyle(styleId: string): HumanStyle | undefined {
    const s = this._styles.get(styleId);
    return s ? { ...s } : undefined;
  }
  public listStyles(): HumanStyle[] { return Array.from(this._styles.values()).map(s => ({ ...s })); }
  public setActiveStyle(styleId: string): boolean {
    if (!this._styles.has(styleId)) return false;
    this._activeStyle = styleId;
    return true;
  }
  public setDefaultConfig(config: Partial<HumanizationConfig>): void {
    this._defaultConfig = { ...this._defaultConfig, ...config };
  }

  public humanize(text: string, options: Partial<HumanizationConfig> & { styleId?: string } = {}): HumanizationResult {
    const startTime = Date.now();
    const style = this._styles.get(options.styleId || this._activeStyle) || this._styles.get('casual')!;
    const config = { ...this._defaultConfig, ...options };
    const changes: HumanizationChange[] = [];
    let result = text;

    const apply = (fn: (t: string, s: HumanStyle) => { text: string; changes: HumanizationChange[] }) => {
      const r = fn(result, style);
      result = r.text;
      changes.push(...r.changes);
    };

    if (config.addContractions) apply(this._applyContractions.bind(this));
    if (config.addCasualPhrases) apply(this._applyCasualPhrases.bind(this));
    if (config.varySentenceLength) apply(this._varySentenceLength.bind(this));
    if (config.addFillers) apply(this._addFillers.bind(this));
    if (config.addTypos) apply(this._addTypos.bind(this));
    if (config.addPersonalTone) apply(this._addPersonalTone.bind(this));

    const humanScore = this._calcHumanScore(result, changes, style);
    const finalResult: HumanizationResult = {
      original: text, humanized: result, changes, level: config.level,
      humanScore, processingTime: Date.now() - startTime
    };

    this._history.push({
      original: text, result: { ...finalResult, changes: finalResult.changes.map(c => ({ ...c })) },
      styleId: options.styleId || this._activeStyle, timestamp: Date.now()
    });
    if (this._history.length > this._maxHistorySize) this._history.shift();

    return finalResult;
  }

  private _applyContractions(text: string, style: HumanStyle): { text: string; changes: HumanizationChange[] } {
    const changes: HumanizationChange[] = [];
    let result = text;
    const intensity = 1 - style.formality;
    for (const [formal, casual] of CONTRACTIONS) {
      if (Math.random() < intensity * 0.8) {
        const regex = new RegExp(formal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        const match = regex.exec(text);
        if (match) {
          changes.push({ type: 'contraction', original: match[0], modified: casual, position: match.index });
          result = result.replace(regex, casual);
        }
      }
    }
    return { text: result, changes: changes.slice(0, Math.ceil(changes.length * intensity)) };
  }

  private _applyCasualPhrases(text: string, style: HumanStyle): { text: string; changes: HumanizationChange[] } {
    const changes: HumanizationChange[] = [];
    let result = text;
    const intensity = 1 - style.formality;
    for (const [formal, casual] of CASUAL_PHRASES) {
      if (Math.random() < intensity * 0.6) {
        const idx = text.indexOf(formal);
        if (idx > -1) {
          changes.push({ type: 'casual', original: formal, modified: casual, position: idx });
          result = result.replace(formal, casual);
        }
      }
    }
    return { text: result, changes };
  }

  private _varySentenceLength(text: string, style: HumanStyle): { text: string; changes: HumanizationChange[] } {
    const changes: HumanizationChange[] = [];
    const sentences = text.split(/(?<=[.!?])\s+/);
    const result: string[] = [];
    for (let i = 0; i < sentences.length; i++) {
      const s = sentences[i];
      if (Math.random() < style.verbosity * 0.3 && s.length > 30) {
        const mid = Math.floor(s.length / 2);
        const first = s.substring(0, mid).trim();
        const second = s.substring(mid).trim();
        if (first.length > 5 && second.length > 5) {
          const combined = `${first}. ${second.charAt(0).toUpperCase()}${second.slice(1)}`;
          changes.push({ type: 'sentence_variation', original: s, modified: combined, position: text.indexOf(s) });
          result.push(combined);
          continue;
        }
      }
      result.push(s);
    }
    return { text: result.join(' '), changes };
  }

  private _addFillers(text: string, style: HumanStyle): { text: string; changes: HumanizationChange[] } {
    const changes: HumanizationChange[] = [];
    const words = text.split(' ');
    const result: string[] = [];
    const intensity = style.fillerFrequency * 10;
    for (let i = 0; i < words.length; i++) {
      result.push(words[i]);
      if (i > 0 && i < words.length - 1 && Math.random() < intensity / words.length) {
        const filler = FILLER_PHRASES[Math.floor(Math.random() * FILLER_PHRASES.length)];
        result.push(filler + ',');
        changes.push({ type: 'filler', original: '', modified: filler, position: i });
      }
    }
    return { text: result.join(' '), changes };
  }

  private _addTypos(text: string, style: HumanStyle): { text: string; changes: HumanizationChange[] } {
    const changes: HumanizationChange[] = [];
    const words = text.split(/\s+/);
    const resultWords: string[] = [];
    const intensity = style.typosFrequency * 100;
    for (const word of words) {
      if (word.length > 4 && Math.random() < intensity / 100) {
        const typoed = this._genTypo(word);
        if (typoed !== word) {
          changes.push({ type: 'typo', original: word, modified: typoed, position: resultWords.join(' ').length });
          resultWords.push(typoed);
          continue;
        }
      }
      resultWords.push(word);
    }
    return { text: resultWords.join(' '), changes };
  }

  private _genTypo(word: string): string {
    if (word.length < 4) return word;
    const chars = word.split('');
    const type = Math.floor(Math.random() * 3);
    if (type === 0 && chars.length > 2) {
      const i = Math.floor(Math.random() * (chars.length - 1)) + 1;
      [chars[i], chars[i + 1]] = [chars[i + 1], chars[i]];
    } else if (type === 1 && chars.length > 3) {
      const i = Math.floor(Math.random() * (chars.length - 2)) + 1;
      chars.splice(i, 1);
    } else {
      const i = Math.floor(Math.random() * chars.length);
      const keys = 'qwertyuiopasdfghjklzxcvbnm';
      chars[i] = keys[Math.floor(Math.random() * keys.length)];
    }
    return chars.join('');
  }

  private _addPersonalTone(text: string, style: HumanStyle): { text: string; changes: HumanizationChange[] } {
    const changes: HumanizationChange[] = [];
    let result = text;
    if (style.warmth > 0.5 && !text.startsWith('I') && !text.startsWith('Well')) {
      const openings = ['I think ', 'Honestly, ', 'Personally, ', 'I feel like '];
      if (Math.random() < style.warmth * 0.4) {
        const opening = openings[Math.floor(Math.random() * openings.length)];
        changes.push({ type: 'tone', original: text.charAt(0), modified: opening + text.charAt(0).toLowerCase(), position: 0 });
        result = opening + text.charAt(0).toLowerCase() + text.slice(1);
      }
    }
    return { text: result, changes };
  }

  private _calcHumanScore(text: string, changes: HumanizationChange[], style: HumanStyle): number {
    const base = 0.3;
    const changeBonus = Math.min(0.3, changes.length * 0.02);
    const styleBonus = (style.warmth + style.verbosity) * 0.2;
    const contractions = changes.filter(c => c.type === 'contraction').length;
    return Math.min(1, base + changeBonus + styleBonus + Math.min(0.1, contractions * 0.01));
  }

  public detectHumanLevel(text: string): number {
    let score = 0;
    const contractionCount = CONTRACTIONS.filter(([, c]) => text.toLowerCase().includes(c.toLowerCase())).length;
    score += Math.min(0.3, contractionCount * 0.05);
    const firstPerson = (text.match(/\bI\b/g) || []).length;
    score += Math.min(0.2, firstPerson * 0.05);
    const fillerCount = FILLER_PHRASES.filter(f => text.toLowerCase().includes(f.toLowerCase())).length;
    score += Math.min(0.2, fillerCount * 0.05);
    const words = text.split(/\s+/);
    const avgLen = words.reduce((s, w) => s + w.length, 0) / Math.max(1, words.length);
    score += Math.max(0, 0.2 - (avgLen - 4) * 0.05);
    return Math.min(1, Math.max(0, score));
  }

  public detectSignalFromResult(result: HumanizationResult): Signal {
    return { source: 'humanizer', magnitude: result.humanScore, entropy: 1 - result.humanScore, timestamp: Date.now() };
  }

  public processPacket(packet: DataPacket<string>): DataPacket<HumanizationResult> {
    const result = this.humanize(packet.payload);
    return {
      id: `hum-${packet.id}`, payload: result,
      metadata: { createdAt: Date.now(), route: [...packet.metadata.route, 'humanizer'], priority: packet.metadata.priority, phase: 'humanized' }
    };
  }

  public getStats(): HumanizerStats {
    if (this._history.length === 0) return { totalHumanizations: 0, avgHumanScore: 0, mostUsedStyle: null, mostUsedLevel: null };
    let totalScore = 0;
    const styleCounts = new Map<string, number>();
    const levelCounts = new Map<HumanizationLevel, number>();
    for (const r of this._history) {
      totalScore += r.result.humanScore;
      styleCounts.set(r.styleId, (styleCounts.get(r.styleId) || 0) + 1);
      levelCounts.set(r.result.level, (levelCounts.get(r.result.level) || 0) + 1);
    }
    let mostStyle: string | null = null, maxStyle = 0;
    for (const [s, c] of styleCounts) if (c > maxStyle) { maxStyle = c; mostStyle = s; }
    let mostLevel: HumanizationLevel | null = null, maxLevel = 0;
    for (const [l, c] of levelCounts) if (c > maxLevel) { maxLevel = c; mostLevel = l; }
    return { totalHumanizations: this._history.length, avgHumanScore: totalScore / this._history.length, mostUsedStyle: mostStyle, mostUsedLevel: mostLevel };
  }

  public clearHistory(): void { this._history = []; }

  public reset(): void {
    this._styles.clear();
    for (const s of DEFAULT_STYLES) this._styles.set(s.id, s);
    this._history = [];
    this._activeStyle = 'casual';
    this._defaultConfig = {
      level: 'moderate', addTypos: true, addContractions: true, addFillers: false,
      varySentenceLength: true, addCasualPhrases: true, addPersonalTone: true
    };
  }
}
