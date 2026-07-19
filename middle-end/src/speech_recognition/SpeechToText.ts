import { DataPacket } from '../shared/types';

export interface BeamHypothesis {
  id: string;
  text: string;
  tokens: string[];
  score: number;
  acousticScore: number;
  languageScore: number;
  timestamps: number[];
  frameIndices: number[];
  isComplete: boolean;
}

export interface DecodingResult {
  bestHypothesis: BeamHypothesis;
  hypotheses: BeamHypothesis[];
  beamSize: number;
  totalFrames: number;
  decodingTime: number;
  realTimeFactor: number;
}

export interface CTCAlignment {
  alignment: string[];
  frameIndices: number[];
  collapsed: string[];
  confidence: number[];
}

export interface AttentionWeight {
  frameIndex: number;
  tokenIndex: number;
  weight: number;
}

export interface WordAlignment {
  word: string;
  startFrame: number;
  endFrame: number;
  startTime: number;
  endTime: number;
  confidence: number;
}

export interface RecognitionAlternative {
  text: string;
  confidence: number;
  score: number;
}

export interface SpeechToTextResult {
  text: string;
  confidence: number;
  alternatives: RecognitionAlternative[];
  wordAlignments: WordAlignment[];
  decoding: DecodingResult;
  modelType: string;
  language: string;
  sampleRate: number;
  duration: number;
  latency: number;
}

export class SpeechToText {
  private _modelType: string = 'beam-search';
  private _beamSize: number = 10;
  private _language: string = 'en';
  private _sampleRate: number = 16000;
  private _blankToken: string = '<blank>';
  private _spaceToken: string = ' ';
  private _lmWeight: number = 0.3;
  private _wordInsertionPenalty: number = -0.5;
  private _acousticScale: number = 0.1;
  private _decodingResult: DecodingResult | null = null;
  private _ctcAlignment: CTCAlignment | null = null;
  private _attentionWeights: AttentionWeight[] = [];
  private _wordAlignments: WordAlignment[] = [];
  private _alternatives: RecognitionAlternative[] = [];
  private _bestText: string = '';
  private _confidence: number = 0;
  private _duration: number = 0;
  private _latency: number = 0;
  private _counter: number = 0;
  private _lastResult: SpeechToTextResult | null = null;
  private _vocabulary: string[] = [];
  private _tokenToIdx: Map<string, number> = new Map();
  private _idxToToken: Map<number, string> = new Map();
  private _vocabSize: number = 0;

  constructor() {
    this._initDefaultVocabulary();
  }

  private _initDefaultVocabulary(): void {
    const tokens = [
      this._blankToken, this._spaceToken,
      'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
      'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
      '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
      '.', ',', '?', '!', '-', "'"
    ];
    this._vocabulary = tokens;
    this._vocabSize = tokens.length;
    for (let i = 0; i < tokens.length; i++) {
      this._tokenToIdx.set(tokens[i], i);
      this._idxToToken.set(i, tokens[i]);
    }
  }

  get modelType(): string {
    return this._modelType;
  }

  get beamSize(): number {
    return this._beamSize;
  }

  get language(): string {
    return this._language;
  }

  get sampleRate(): number {
    return this._sampleRate;
  }

  get lmWeight(): number {
    return this._lmWeight;
  }

  get wordInsertionPenalty(): number {
    return this._wordInsertionPenalty;
  }

  get acousticScale(): number {
    return this._acousticScale;
  }

  get bestText(): string {
    return this._bestText;
  }

  get confidence(): number {
    return this._confidence;
  }

  get alternatives(): RecognitionAlternative[] {
    return [...this._alternatives];
  }

  get wordAlignments(): WordAlignment[] {
    return [...this._wordAlignments];
  }

  get vocabSize(): number {
    return this._vocabSize;
  }

  get vocabulary(): string[] {
    return [...this._vocabulary];
  }

  get duration(): number {
    return this._duration;
  }

  get latency(): number {
    return this._latency;
  }

  setModelType(type: string): void {
    const validTypes = ['beam-search', 'ctc-greedy', 'ctc-prefix', 'attention', 'transducer'];
    if (!validTypes.includes(type)) {
      throw new Error(`Invalid model type: ${type}`);
    }
    this._modelType = type;
  }

  setBeamSize(size: number): void {
    if (size <= 0) {
      throw new Error('Beam size must be positive');
    }
    this._beamSize = size;
  }

  setLanguage(lang: string): void {
    this._language = lang;
  }

  setSampleRate(rate: number): void {
    this._sampleRate = rate;
  }

  setLmWeight(weight: number): void {
    this._lmWeight = weight;
  }

  setWordInsertionPenalty(penalty: number): void {
    this._wordInsertionPenalty = penalty;
  }

  setAcousticScale(scale: number): void {
    this._acousticScale = scale;
  }

  setVocabulary(tokens: string[]): void {
    this._vocabulary = [this._blankToken, ...tokens];
    this._vocabSize = this._vocabulary.length;
    this._tokenToIdx.clear();
    this._idxToToken.clear();
    for (let i = 0; i < this._vocabulary.length; i++) {
      this._tokenToIdx.set(this._vocabulary[i], i);
      this._idxToToken.set(i, this._vocabulary[i]);
    }
  }

  ctcGreedyDecode(probs: number[][]): string {
    const T = probs.length;
    const collapsed: string[] = [];
    let prevToken = '';
    for (let t = 0; t < T; t++) {
      let maxIdx = 0;
      let maxProb = -Infinity;
      for (let i = 0; i < probs[t].length; i++) {
        if (probs[t][i] > maxProb) {
          maxProb = probs[t][i];
          maxIdx = i;
        }
      }
      const token = this._idxToToken.get(maxIdx) || this._blankToken;
      if (token !== this._blankToken && token !== prevToken) {
        collapsed.push(token);
      }
      prevToken = token;
    }
    return collapsed.join('');
  }

  ctcPrefixDecode(probs: number[][], beamSize: number = 10): BeamHypothesis[] {
    const T = probs.length;
    let beams: Map<string, { probBlank: number; probNonBlank: number; timestamps: number[]; frameIndices: number[] }> = new Map();
    beams.set('', { probBlank: 0, probNonBlank: -Infinity, timestamps: [], frameIndices: [] });
    for (let t = 0; t < T; t++) {
      const newBeams: Map<string, { probBlank: number; probNonBlank: number; timestamps: number[]; frameIndices: number[] }> = new Map();
      const sortedBeams = this._sortBeams(beams, beamSize);
      for (const [prefix, entry] of sortedBeams) {
        const { probBlank, probNonBlank, timestamps, frameIndices } = entry;
        const totalProb = this._logAdd(probBlank, probNonBlank);
        const blankProb = Math.log(Math.max(probs[t][0], 1e-10));
        const newBlank = this._logAdd(
          (newBeams.get(prefix)?.probBlank || -Infinity),
          totalProb + blankProb
        );
        const existing = newBeams.get(prefix) || { probBlank: -Infinity, probNonBlank: -Infinity, timestamps: [...timestamps], frameIndices: [...frameIndices] };
        newBeams.set(prefix, { ...existing, probBlank: newBlank, timestamps: [...timestamps], frameIndices: [...frameIndices] });
        for (let c = 1; c < this._vocabSize; c++) {
          const token = this._idxToToken.get(c) || '';
          const charProb = Math.log(Math.max(probs[t][c], 1e-10));
          let newPrefix: string;
          let newProb: number;
          const newTimestamps = [...timestamps, t / this._sampleRate];
          const newFrameIndices = [...frameIndices, t];
          if (prefix.endsWith(token)) {
            newPrefix = prefix;
            newProb = probBlank + charProb;
          } else {
            newPrefix = prefix + token;
            newProb = totalProb + charProb;
          }
          const existing = newBeams.get(newPrefix) || { probBlank: -Infinity, probNonBlank: -Infinity, timestamps: [], frameIndices: [] };
          const newNonBlank = this._logAdd(existing.probNonBlank, newProb);
          newBeams.set(newPrefix, { ...existing, probNonBlank: newNonBlank, timestamps: newTimestamps, frameIndices: newFrameIndices });
        }
      }
      beams = this._pruneBeams(newBeams, beamSize);
    }
    const hypotheses: BeamHypothesis[] = [];
    let id = 0;
    for (const [text, entry] of beams) {
      const score = this._logAdd(entry.probBlank, entry.probNonBlank);
      hypotheses.push({
        id: `hyp-${id++}`,
        text: this._formatOutput(text),
        tokens: text.split(''),
        score,
        acousticScore: score,
        languageScore: 0,
        timestamps: entry.timestamps,
        frameIndices: entry.frameIndices,
        isComplete: true
      });
    }
    hypotheses.sort((a, b) => b.score - a.score);
    return hypotheses;
  }

  private _logAdd(a: number, b: number): number {
    if (a === -Infinity) return b;
    if (b === -Infinity) return a;
    if (a > b) {
      return a + Math.log(1 + Math.exp(b - a));
    } else {
      return b + Math.log(1 + Math.exp(a - b));
    }
  }

  private _sortBeams(beams: Map<string, { probBlank: number; probNonBlank: number; timestamps: number[]; frameIndices: number[] }>, beamSize: number): Map<string, { probBlank: number; probNonBlank: number; timestamps: number[]; frameIndices: number[] }> {
    const entries = Array.from(beams.entries());
    entries.sort((a, b) => {
      const scoreA = this._logAdd(a[1].probBlank, a[1].probNonBlank);
      const scoreB = this._logAdd(b[1].probBlank, b[1].probNonBlank);
      return scoreB - scoreA;
    });
    const result = new Map<string, { probBlank: number; probNonBlank: number; timestamps: number[]; frameIndices: number[] }>();
    for (let i = 0; i < Math.min(beamSize, entries.length); i++) {
      result.set(entries[i][0], entries[i][1]);
    }
    return result;
  }

  private _pruneBeams(beams: Map<string, { probBlank: number; probNonBlank: number; timestamps: number[]; frameIndices: number[] }>, beamSize: number): Map<string, { probBlank: number; probNonBlank: number; timestamps: number[]; frameIndices: number[] }> {
    return this._sortBeams(beams, beamSize);
  }

  beamSearchDecode(acousticScores: Map<string, number[]>, lmScores: (context: string[]) => number, vocabulary: string[]): BeamHypothesis[] {
    const T = acousticScores.size;
    let beams: BeamHypothesis[] = [];
    const initialHyp: BeamHypothesis = {
      id: 'hyp-0',
      text: '',
      tokens: [],
      score: 0,
      acousticScore: 0,
      languageScore: 0,
      timestamps: [],
      frameIndices: [],
      isComplete: false
    };
    beams.push(initialHyp);
    const frameKeys = Array.from(acousticScores.keys());
    for (let t = 0; t < T; t++) {
      const newBeams: BeamHypothesis[] = [];
      const frameScores = acousticScores.get(frameKeys[t]) || [];
      for (const beam of beams) {
        for (let vi = 0; vi < vocabulary.length; vi++) {
          const word = vocabulary[vi];
          const acScore = (frameScores[vi] || -10) * this._acousticScale;
          const lmScore = this._lmWeight * lmScores([...beam.tokens, word]);
          const wordPenalty = word.length > 0 ? this._wordInsertionPenalty : 0;
          const newScore = beam.score + acScore + lmScore + wordPenalty;
          const newHyp: BeamHypothesis = {
            id: `hyp-${newBeams.length}`,
            text: beam.text + (beam.text.length > 0 ? ' ' : '') + word,
            tokens: [...beam.tokens, word],
            score: newScore,
            acousticScore: beam.acousticScore + acScore,
            languageScore: beam.languageScore + lmScore,
            timestamps: [...beam.timestamps, t / this._sampleRate],
            frameIndices: [...beam.frameIndices, t],
            isComplete: t === T - 1
          };
          newBeams.push(newHyp);
        }
        const extendedHyp: BeamHypothesis = {
          ...beam,
          id: `hyp-ext-${beam.id}`,
          acousticScore: beam.acousticScore + (frameScores[0] || -10) * this._acousticScale,
          score: beam.score + (frameScores[0] || -10) * this._acousticScale
        };
        newBeams.push(extendedHyp);
      }
      newBeams.sort((a, b) => b.score - a.score);
      beams = newBeams.slice(0, this._beamSize);
    }
    return beams;
  }

  attentionDecode(encoderOutput: number[][], decoderSteps: number = 30): { text: string; attentions: AttentionWeight[] } {
    const attentions: AttentionWeight[] = [];
    const outputTokens: string[] = [];
    for (let step = 0; step < decoderSteps; step++) {
      const attentionDist = this._computeAttention(encoderOutput, step);
      let maxIdx = 0;
      let maxVal = -Infinity;
      for (let i = 0; i < attentionDist.length; i++) {
        if (attentionDist[i] > maxVal) {
          maxVal = attentionDist[i];
          maxIdx = i;
        }
      }
      attentions.push({
        frameIndex: maxIdx,
        tokenIndex: step,
        weight: maxVal
      });
      const tokenIdx = Math.floor(Math.abs(Math.sin(step * 0.5 + maxIdx * 0.1)) * (this._vocabSize - 2)) + 1;
      const token = this._idxToToken.get(tokenIdx) || '';
      if (token === '<eos>') break;
      outputTokens.push(token);
    }
    return {
      text: this._formatOutput(outputTokens.join('')),
      attentions
    };
  }

  private _computeAttention(encoderOutput: number[][], step: number): number[] {
    const T = encoderOutput.length;
    const attention = new Array(T);
    let sum = 0;
    for (let i = 0; i < T; i++) {
      const score = Math.sin((step + i) * 0.1) * 0.5 + 0.5;
      attention[i] = score;
      sum += score;
    }
    for (let i = 0; i < T; i++) {
      attention[i] /= sum;
    }
    return attention;
  }

  transducerDecode(encoderOut: number[][], decoderRNN: (state: number[], token: number) => { state: number[]; output: number[] }, maxSteps: number = 100): BeamHypothesis[] {
    const T = encoderOut.length;
    const beams: BeamHypothesis[] = [];
    for (let b = 0; b < this._beamSize; b++) {
      let text = '';
      let t = 0;
      const timestamps: number[] = [];
      const frameIndices: number[] = [];
      let state = new Array(256).fill(0);
      let lastToken = 0;
      for (let step = 0; step < maxSteps && t < T; step++) {
        const { output } = decoderRNN(state, lastToken);
        const maxIdx = Math.floor(Math.abs(Math.sin(step * 0.7)) * this._vocabSize);
        if (maxIdx === 0) {
          t++;
          timestamps.push(t / this._sampleRate);
          frameIndices.push(t);
        } else {
          const token = this._idxToToken.get(maxIdx) || '';
          text += token;
          lastToken = maxIdx;
        }
      }
      beams.push({
        id: `hyp-${b}`,
        text: this._formatOutput(text),
        tokens: text.split(''),
        score: -Math.abs(b - this._beamSize / 2),
        acousticScore: -b,
        languageScore: -b * 0.3,
        timestamps,
        frameIndices,
        isComplete: t >= T
      });
    }
    beams.sort((a, b) => b.score - a.score);
    return beams;
  }

  private _formatOutput(text: string): string {
    let formatted = text.replace(new RegExp(this._blankToken, 'g'), '');
    formatted = formatted.replace(/\s+/g, ' ').trim();
    if (formatted.length > 0 && !/[.!?]$/.test(formatted)) {
    }
    return formatted;
  }

  computeCTCalignment(probs: number[][], text: string): CTCAlignment {
    const target = text.split('');
    const T = probs.length;
    const S = target.length;
    const expandedS = 2 * S + 1;
    const expanded: string[] = [];
    for (let i = 0; i < S; i++) {
      expanded.push(this._blankToken);
      expanded.push(target[i]);
    }
    expanded.push(this._blankToken);
    const alignment = new Array(T).fill(this._blankToken);
    const collapsed: string[] = [];
    const confidence: number[] = [];
    const frameIndices: number[] = [];
    let s = 0;
    for (let t = 0; t < T && s < expandedS; t++) {
      alignment[t] = expanded[s];
      frameIndices.push(t);
      let maxProb = probs[t][this._tokenToIdx.get(expanded[s]) || 0];
      if (s + 1 < expandedS) {
        const nextProb = probs[t][this._tokenToIdx.get(expanded[s + 1]) || 0];
        if (nextProb > maxProb && t / T > (s + 1) / expandedS * 0.8) {
          s++;
          alignment[t] = expanded[s];
          maxProb = nextProb;
        }
      }
      confidence.push(maxProb);
      if (expanded[s] !== this._blankToken) {
        collapsed.push(expanded[s]);
      }
    }
    return {
      alignment,
      frameIndices,
      collapsed,
      confidence
    };
  }

  extractWordAlignments(hypothesis: BeamHypothesis, sampleRate: number): WordAlignment[] {
    const words = hypothesis.text.split(/\s+/).filter(w => w.length > 0);
    const alignments: WordAlignment[] = [];
    const framesPerWord = Math.ceil(hypothesis.frameIndices.length / Math.max(words.length, 1));
    for (let i = 0; i < words.length; i++) {
      const startFrame = i * framesPerWord;
      const endFrame = Math.min((i + 1) * framesPerWord, hypothesis.frameIndices.length - 1);
      const frameIdxStart = hypothesis.frameIndices[startFrame] || 0;
      const frameIdxEnd = hypothesis.frameIndices[endFrame] || frameIdxStart;
      alignments.push({
        word: words[i],
        startFrame: frameIdxStart,
        endFrame: frameIdxEnd,
        startTime: frameIdxStart / sampleRate,
        endTime: frameIdxEnd / sampleRate,
        confidence: Math.max(0.5, Math.min(0.99, 0.7 + Math.sin(i * 0.3) * 0.2))
      });
    }
    return alignments;
  }

  computeConfidence(hypothesis: BeamHypothesis, numFrames: number): number {
    const avgScore = hypothesis.score / Math.max(numFrames, 1);
    const normalized = 1 / (1 + Math.exp(-avgScore * 0.1));
    return Math.max(0, Math.min(1, normalized));
  }

  recognize(acousticFeatures: number[][], sampleRate?: number): SpeechToTextResult {
    const startTime = Date.now();
    if (sampleRate) {
      this._sampleRate = sampleRate;
    }
    this._duration = acousticFeatures.length / this._sampleRate * 256;
    const probs = this._generateFakeProbs(acousticFeatures.length);
    let hypotheses: BeamHypothesis[];
    switch (this._modelType) {
      case 'ctc-greedy':
        const text = this.ctcGreedyDecode(probs);
        hypotheses = [{
          id: 'hyp-0',
          text,
          tokens: text.split(''),
          score: 0,
          acousticScore: 0,
          languageScore: 0,
          timestamps: [],
          frameIndices: [],
          isComplete: true
        }];
        break;
      case 'ctc-prefix':
        hypotheses = this.ctcPrefixDecode(probs, this._beamSize);
        break;
      case 'attention':
        const attResult = this.attentionDecode(acousticFeatures);
        this._attentionWeights = attResult.attentions;
        hypotheses = [{
          id: 'hyp-0',
          text: attResult.text,
          tokens: attResult.text.split(''),
          score: 0,
          acousticScore: 0,
          languageScore: 0,
          timestamps: [],
          frameIndices: [],
          isComplete: true
        }];
        break;
      case 'transducer':
        hypotheses = this.transducerDecode(
          acousticFeatures,
          (state, token) => ({ state, output: new Array(this._vocabSize).fill(1 / this._vocabSize) })
        );
        break;
      case 'beam-search':
      default:
        hypotheses = this.ctcPrefixDecode(probs, this._beamSize);
    }
    this._decodingResult = {
      bestHypothesis: hypotheses[0],
      hypotheses,
      beamSize: this._beamSize,
      totalFrames: acousticFeatures.length,
      decodingTime: (Date.now() - startTime) / 1000,
      realTimeFactor: ((Date.now() - startTime) / 1000) / Math.max(this._duration, 0.01)
    };
    this._bestText = hypotheses[0]?.text || '';
    this._confidence = this.computeConfidence(hypotheses[0], acousticFeatures.length);
    this._wordAlignments = this.extractWordAlignments(hypotheses[0], this._sampleRate);
    this._alternatives = hypotheses.slice(0, 5).map((h, i) => ({
      text: h.text,
      confidence: Math.max(0, this._confidence - i * 0.1),
      score: h.score
    }));
    this._latency = Date.now() - startTime;
    const result: SpeechToTextResult = {
      text: this._bestText,
      confidence: this._confidence,
      alternatives: this._alternatives,
      wordAlignments: this._wordAlignments,
      decoding: this._decodingResult,
      modelType: this._modelType,
      language: this._language,
      sampleRate: this._sampleRate,
      duration: this._duration,
      latency: this._latency
    };
    this._lastResult = result;
    return result;
  }

  private _generateFakeProbs(numFrames: number): number[][] {
    const probs: number[][] = [];
    for (let t = 0; t < numFrames; t++) {
      const frame = new Array(this._vocabSize).fill(0.01);
      const center = (t / numFrames) * (this._vocabSize - 1);
      for (let i = 0; i < this._vocabSize; i++) {
        frame[i] += Math.exp(-Math.pow(i - center, 2) / 50) * 0.5;
      }
      let sum = 0;
      for (const p of frame) sum += p;
      for (let i = 0; i < frame.length; i++) frame[i] /= sum;
      probs.push(frame);
    }
    return probs;
  }

  toPacket(): DataPacket<SpeechToTextResult> {
    const result = this._lastResult || {
      text: this._bestText,
      confidence: this._confidence,
      alternatives: this._alternatives,
      wordAlignments: this._wordAlignments,
      decoding: this._decodingResult || {
        bestHypothesis: {
          id: '',
          text: this._bestText,
          tokens: [],
          score: 0,
          acousticScore: 0,
          languageScore: 0,
          timestamps: [],
          frameIndices: [],
          isComplete: true
        },
        hypotheses: [],
        beamSize: this._beamSize,
        totalFrames: 0,
        decodingTime: 0,
        realTimeFactor: 0
      },
      modelType: this._modelType,
      language: this._language,
      sampleRate: this._sampleRate,
      duration: this._duration,
      latency: this._latency
    };
    this._counter++;
    return {
      id: `speech-to-text-${Date.now()}-${this._counter}`,
      payload: result,
      metadata: {
        createdAt: Date.now(),
        route: ['speech_recognition', 'speech_to_text'],
        priority: 1,
        phase: 'decoding'
      }
    };
  }

  reset(): void {
    this._modelType = 'beam-search';
    this._beamSize = 10;
    this._language = 'en';
    this._sampleRate = 16000;
    this._lmWeight = 0.3;
    this._wordInsertionPenalty = -0.5;
    this._acousticScale = 0.1;
    this._decodingResult = null;
    this._ctcAlignment = null;
    this._attentionWeights = [];
    this._wordAlignments = [];
    this._alternatives = [];
    this._bestText = '';
    this._confidence = 0;
    this._duration = 0;
    this._latency = 0;
    this._counter = 0;
    this._lastResult = null;
    this._vocabulary = [];
    this._tokenToIdx.clear();
    this._idxToToken.clear();
    this._vocabSize = 0;
    this._initDefaultVocabulary();
  }
}
