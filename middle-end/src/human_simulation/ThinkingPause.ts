import type { DataPacket, Signal, Handler } from '../shared/types';

export type PauseType = 'initial' | 'between' | 'before_response' | 'during_thinking' | 'after_question' | 'before_answer' | 'confused' | 'remembering';

export interface PauseEvent {
  type: PauseType;
  duration: number;
  reason: string;
  position: number;
  confidence: number;
}

export interface ThinkingPattern {
  id: string;
  name: string;
  baseLatencyMs: number;
  variance: number;
  initialPauseMs: number;
  betweenSentencesMs: number;
  beforeComplexAnswerMs: number;
  confusedPauseMs: number;
  rememberingPauseMs: number;
  hesitationFrequency: number;
  fillerWordFrequency: number;
}

export interface PauseAnalysis {
  pauses: PauseEvent[];
  totalPauseTime: number;
  pauseCount: number;
  avgPauseDuration: number;
  maxPauseDuration: number;
  thinkingScore: number;
}

export interface ThinkOptions {
  patternId?: string;
  complexity?: number;
  familiarity?: number;
  questionType?: 'simple' | 'complex' | 'creative' | 'analytical' | 'factual';
  includeFillers?: boolean;
}

export interface ThinkingStats {
  totalSimulations: number;
  avgPauseCount: number;
  avgTotalPauseTime: number;
  mostCommonPauseType: PauseType | null;
}

export class ThinkingPause {
  private _patterns: Map<string, ThinkingPattern>;
  private _activePattern: string;
  private _simulationHistory: { text: string; analysis: PauseAnalysis; patternId: string; timestamp: number }[];
  private _maxHistorySize: number;
  private _fillerWords: string[];

  constructor() {
    this._patterns = new Map();
    this._activePattern = 'default';
    this._simulationHistory = [];
    this._maxHistorySize = 200;
    this._fillerWords = ['um', 'uh', 'well', 'like', 'you know', 'so', 'actually', 'basically', 'I mean'];
    this._initDefaultPatterns();
  }

  get patternCount(): number { return this._patterns.size; }
  get activePattern(): string { return this._activePattern; }
  get fillerWords(): string[] { return [...this._fillerWords]; }
  get simulationHistory(): { text: string; analysis: PauseAnalysis; patternId: string; timestamp: number }[] {
    return [...this._simulationHistory];
  }

  private _initDefaultPatterns(): void {
    const defaults: ThinkingPattern[] = [
      { id: 'default', name: 'Normal Thinker', baseLatencyMs: 500, variance: 0.3, initialPauseMs: 800, betweenSentencesMs: 400, beforeComplexAnswerMs: 1500, confusedPauseMs: 3000, rememberingPauseMs: 2000, hesitationFrequency: 0.1, fillerWordFrequency: 0.05 },
      { id: 'fast', name: 'Quick Thinker', baseLatencyMs: 200, variance: 0.2, initialPauseMs: 300, betweenSentencesMs: 200, beforeComplexAnswerMs: 800, confusedPauseMs: 1500, rememberingPauseMs: 1000, hesitationFrequency: 0.05, fillerWordFrequency: 0.02 },
      { id: 'deliberate', name: 'Deliberate Thinker', baseLatencyMs: 1000, variance: 0.4, initialPauseMs: 1500, betweenSentencesMs: 700, beforeComplexAnswerMs: 3000, confusedPauseMs: 5000, rememberingPauseMs: 3500, hesitationFrequency: 0.2, fillerWordFrequency: 0.1 }
    ];
    for (const p of defaults) this._patterns.set(p.id, p);
  }

  public addPattern(pattern: ThinkingPattern): void {
    this._patterns.set(pattern.id, { ...pattern });
  }

  public removePattern(patternId: string): boolean {
    if (patternId === this._activePattern && this._patterns.size > 1) {
      const firstId = this._patterns.keys().next().value;
      if (firstId && firstId !== patternId) this._activePattern = firstId;
    }
    return this._patterns.delete(patternId);
  }

  public getPattern(patternId: string): ThinkingPattern | undefined {
    const p = this._patterns.get(patternId);
    return p ? { ...p } : undefined;
  }

  public listPatterns(): ThinkingPattern[] {
    return Array.from(this._patterns.values()).map(p => ({ ...p }));
  }

  public setActivePattern(patternId: string): boolean {
    if (!this._patterns.has(patternId)) return false;
    this._activePattern = patternId;
    return true;
  }

  public addFillerWord(word: string): void {
    if (!this._fillerWords.includes(word)) {
      this._fillerWords.push(word);
    }
  }

  public removeFillerWord(word: string): boolean {
    const idx = this._fillerWords.indexOf(word);
    if (idx > -1) {
      this._fillerWords.splice(idx, 1);
      return true;
    }
    return false;
  }

  public analyze(text: string, options: ThinkOptions = {}): PauseAnalysis {
    const pattern = this._getEffectivePattern(options);
    const pauses: PauseEvent[] = [];
    const sentences = this._splitSentences(text);
    const complexity = options.complexity ?? this._estimateComplexity(text);
    const familiarity = options.familiarity ?? 0.5;

    const addPause = (type: PauseType, dur: number, reason: string, pos: number, conf: number) =>
      pauses.push({ type, duration: dur, reason, position: pos, confidence: conf });

    addPause('initial', this._genPause(pattern.initialPauseMs * (1 + complexity * 0.5) * (1 - familiarity * 0.3), pattern.variance), 'Initial thinking', 0, 0.8);

    let pos = 0;
    for (let i = 0; i < sentences.length; i++) {
      pos += sentences[i].length;
      if (i < sentences.length - 1) addPause('between', this._genPause(pattern.betweenSentencesMs, pattern.variance), 'Between sentences', pos, 0.6);
      if (Math.random() < pattern.hesitationFrequency)
        addPause('during_thinking', this._genPause(pattern.baseLatencyMs * 0.5, pattern.variance * 1.5), 'Mid-sentence thinking', pos - Math.floor(sentences[i].length * 0.5), 0.4);
    }

    const qType = options.questionType || 'simple';
    if (qType === 'complex' || qType === 'analytical')
      addPause('before_answer', this._genPause(pattern.beforeComplexAnswerMs * (1 + complexity * 0.5), pattern.variance), 'Complex question', 0, 0.7);
    if (complexity > 0.7)
      addPause('confused', this._genPause(pattern.confusedPauseMs, pattern.variance * 0.5), 'Confusion pause', Math.floor(text.length * 0.3), 0.5);
    if (familiarity < 0.3)
      addPause('remembering', this._genPause(pattern.rememberingPauseMs * (1 - familiarity), pattern.variance), 'Memory recall', Math.floor(text.length * 0.1), 0.5);

    pauses.sort((a, b) => a.position - b.position);

    const totalPauseTime = pauses.reduce((s, p) => s + p.duration, 0);
    const analysis: PauseAnalysis = {
      pauses,
      totalPauseTime,
      pauseCount: pauses.length,
      avgPauseDuration: pauses.length > 0 ? totalPauseTime / pauses.length : 0,
      maxPauseDuration: pauses.length > 0 ? Math.max(...pauses.map(p => p.duration)) : 0,
      thinkingScore: Math.min(1, totalPauseTime / 5000)
    };

    this._simulationHistory.push({ text, analysis: { ...analysis, pauses: analysis.pauses.map(p => ({ ...p })) }, patternId: options.patternId || this._activePattern, timestamp: Date.now() });
    if (this._simulationHistory.length > this._maxHistorySize) this._simulationHistory.shift();

    return analysis;
  }

  private _getEffectivePattern(options: ThinkOptions): ThinkingPattern {
    return this._patterns.get(options.patternId || this._activePattern)
      || this._patterns.get('default')!;
  }

  private _genPause(base: number, variance: number): number {
    return Math.max(50, base * (1 + (Math.random() - 0.5) * 2 * variance));
  }

  private _splitSentences(text: string): string[] {
    return text.split(/[.!?。！？]+/).map(s => s.trim()).filter(s => s.length > 0);
  }

  private _estimateComplexity(text: string): number {
    const sentences = this._splitSentences(text);
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const avgSentenceLength = sentences.length > 0 ? words.length / sentences.length : 0;
    const complexWords = words.filter(w => w.length > 8).length;
    const complexityScore = Math.min(1, (avgSentenceLength / 25) * 0.5 + (complexWords / Math.max(1, words.length)) * 0.5);
    return complexityScore;
  }

  public async simulateThinking(text: string, options: ThinkOptions = {}): Promise<PauseAnalysis> {
    const analysis = this.analyze(text, options);
    let totalWait = 0;
    for (const pause of analysis.pauses) {
      totalWait += pause.duration;
    }
    await this._delay(Math.min(totalWait, 5000));
    return analysis;
  }

  private _delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public insertPauses(text: string, options: ThinkOptions = {}): string {
    const analysis = this.analyze(text, options);
    const pattern = this._getEffectivePattern(options);
    let result = text;
    const sortedPauses = [...analysis.pauses].sort((a, b) => b.position - a.position);

    for (const pause of sortedPauses) {
      if (pause.type === 'during_thinking' && Math.random() < pattern.fillerWordFrequency) {
        const filler = this._fillerWords[Math.floor(Math.random() * this._fillerWords.length)];
        const before = result.substring(0, pause.position);
        const after = result.substring(pause.position);
        result = `${before} ${filler}, ${after}`;
      }
    }

    return result;
  }

  public detectSignalFromAnalysis(analysis: PauseAnalysis): Signal {
    return {
      source: 'thinking-pause',
      magnitude: analysis.thinkingScore,
      entropy: 1 - analysis.thinkingScore,
      timestamp: Date.now()
    };
  }

  public processPacket(packet: DataPacket<string>): DataPacket<PauseAnalysis> {
    const analysis = this.analyze(packet.payload);
    return {
      id: `think-${packet.id}`,
      payload: analysis,
      metadata: {
        createdAt: Date.now(),
        route: [...packet.metadata.route, 'thinking-pause'],
        priority: packet.metadata.priority,
        phase: 'analyzed-thinking'
      }
    };
  }

  public getStats(): ThinkingStats {
    if (this._simulationHistory.length === 0) return { totalSimulations: 0, avgPauseCount: 0, avgTotalPauseTime: 0, mostCommonPauseType: null };
    const n = this._simulationHistory.length;
    let totalCount = 0, totalTime = 0;
    const typeCounts = new Map<PauseType, number>();
    for (const r of this._simulationHistory) {
      totalCount += r.analysis.pauseCount;
      totalTime += r.analysis.totalPauseTime;
      for (const p of r.analysis.pauses) typeCounts.set(p.type, (typeCounts.get(p.type) || 0) + 1);
    }
    let mostCommon: PauseType | null = null, maxCount = 0;
    for (const [t, c] of typeCounts) if (c > maxCount) { maxCount = c; mostCommon = t; }
    return { totalSimulations: n, avgPauseCount: totalCount / n, avgTotalPauseTime: totalTime / n, mostCommonPauseType: mostCommon };
  }

  public clearHistory(): void {
    this._simulationHistory = [];
  }

  public reset(): void {
    this._patterns.clear();
    this._simulationHistory = [];
    this._initDefaultPatterns();
    this._activePattern = 'default';
  }
}
