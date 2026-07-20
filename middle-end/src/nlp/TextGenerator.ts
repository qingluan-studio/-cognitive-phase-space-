import { DataPacket } from '../shared/types';

export interface GeneratedText {
  text: string;
  model: string;
  probability: number;
  length: number;
}

export interface GenerationParams {
  maxLen: number;
  temperature: number;
  topK: number;
  topP: number;
}

export interface TokenLogit {
  token: string;
  logit: number;
  probability?: number;
}

export interface GenerationStat {
  totalGenerations: number;
  byMethod: Record<string, number>;
  avgLength: number;
  avgProbability: number;
  totalTokens: number;
}

export type GenerationMethod =
  | 'greedy'
  | 'beam'
  | 'temperature'
  | 'top-k'
  | 'top-p'
  | 'nucleus'
  | 'contrastive'
  | 'typical'
  | 'mirostat'
  | 'beam-search'
  | 'sampling';

export interface BeamCandidate {
  text: string;
  score: number;
  tokens: string[];
  finished: boolean;
}

export interface NGramStat {
  n: number;
  counts: Map<string, Map<string, number>>;
  totals: Map<string, number>;
}

export interface GenerationTrace {
  step: number;
  context: string;
  chosenToken: string;
  topCandidates: TokenLogit[];
  method: string;
}

export class TextGenerator {
  private _generatedTexts: GeneratedText[] = [];
  private _model: string = 'default';
  private _counter: number = 0;
  private _vocabulary: string[] = [];
  private _params: GenerationParams = { maxLen: 100, temperature: 1.0, topK: 50, topP: 0.9 };
  private _lastResult: GeneratedText | null = null;
  private _ngramStats: NGramStat[] = [];
  private _method: GenerationMethod = 'sampling';
  private _traces: GenerationTrace[] = [];
  private _byMethodCount: Record<string, number> = {};
  private _totalLength: number = 0;
  private _totalProbability: number = 0;
  private _totalTokens: number = 0;
  private _stopTokens: Set<string> = new Set(['.', '!', '?', '<EOS>', '</s>', '<END>']);
  private _badWords: Set<string> = new Set();
  private _contextWindow: number = 256;
  private _repetitionPenalty: number = 1.0;
  private _noRepeatNgramSize: number = 0;
  private _beamWidth: number = 5;
  private _maxNewTokens: number = 100;

  constructor() {
    this._initVocabulary();
    this._initNGramStats();
  }

  get generatedTexts(): GeneratedText[] {
    return this._generatedTexts;
  }

  get model(): string {
    return this._model;
  }

  get params(): GenerationParams {
    return this._params;
  }

  get vocabulary(): string[] {
    return this._vocabulary;
  }

  get method(): GenerationMethod {
    return this._method;
  }

  set method(method: GenerationMethod) {
    this._method = method;
  }

  get traces(): GenerationTrace[] {
    return this._traces;
  }

  get stopTokens(): Set<string> {
    return this._stopTokens;
  }

  get badWords(): Set<string> {
    return this._badWords;
  }

  set contextWindow(value: number) {
    this._contextWindow = Math.max(8, value);
  }

  set repetitionPenalty(value: number) {
    this._repetitionPenalty = Math.max(0.1, value);
  }

  set noRepeatNgramSize(value: number) {
    this._noRepeatNgramSize = Math.max(0, value);
  }

  set beamWidth(value: number) {
    this._beamWidth = Math.max(1, value);
  }

  set maxNewTokens(value: number) {
    this._maxNewTokens = Math.max(1, value);
  }

  get ngramStats(): NGramStat[] {
    return this._ngramStats;
  }

  /**
   * Add a stop token
   */
  addStopToken(token: string): void {
    this._stopTokens.add(token);
  }

  /**
   * Add a bad word to filter
   */
  addBadWord(word: string): void {
    this._badWords.add(word.toLowerCase());
  }

  /**
   * Train the generator on a corpus to build n-gram statistics
   */
  train(corpus: string[], nValues: number[] = [2, 3]): void {
    this._ngramStats = [];
    for (const n of nValues) {
      const stat: NGramStat = {
        n,
        counts: new Map(),
        totals: new Map()
      };
      for (const text of corpus) {
        const tokens = this._tokenize(text);
        for (let i = 0; i + n <= tokens.length; i++) {
          const context = tokens.slice(i, i + n - 1).join(' ');
          const next = tokens[i + n - 1];
          if (!stat.counts.has(context)) {
            stat.counts.set(context, new Map());
            stat.totals.set(context, 0);
          }
          const ctxMap = stat.counts.get(context)!;
          ctxMap.set(next, (ctxMap.get(next) || 0) + 1);
          stat.totals.set(context, (stat.totals.get(context) || 0) + 1);
        }
      }
      this._ngramStats.push(stat);
    }
  }

  /**
   * Predict next token based on the model (n-gram + template)
   */
  nextToken(prefix: string, model: { name: string; vocab?: string[] }, params: GenerationParams): string {
    const vocab = model.vocab || this._vocabulary;
    const logits = this._computeLogits(prefix, vocab);
    const temperature = params.temperature || 1.0;
    const scaled = logits.map(l => l / temperature);
    const filtered = this._topKFilter(scaled, vocab, params.topK || 50);
    const nucleus = this._topPFilter(filtered.logits, filtered.tokens, params.topP || 0.9);
    const penalized = this._applyRepetitionPenalty(nucleus.logits, nucleus.tokens, prefix);
    const selected = this._sampleFrom(penalized, nucleus.tokens);
    this._model = model.name;
    this._params = params;
    return selected;
  }

  /**
   * Compute logits for each vocabulary token given the prefix
   */
  private _computeLogits(prefix: string, vocab: string[]): number[] {
    const seed = this._hash(prefix);
    let s = seed;
    const logits: number[] = [];
    const contextTokens = this._tokenize(prefix);
    for (let i = 0; i < vocab.length; i++) {
      let logit = 0;
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      logit = (s % 1000) / 1000;
      if (this._ngramStats.length > 0) {
        const stat = this._ngramStats[this._ngramStats.length - 1];
        const n = stat.n;
        if (contextTokens.length >= n - 1) {
          const ctx = contextTokens.slice(-(n - 1)).join(' ');
          const ctxMap = stat.counts.get(ctx);
          const total = stat.totals.get(ctx) || 0;
          if (ctxMap && total > 0) {
            const count = ctxMap.get(vocab[i]) || 0;
            logit += count / total;
          }
        }
      }
      if (this._badWords.has(vocab[i].toLowerCase())) {
        logit = -Infinity;
      }
      logits.push(logit);
    }
    return logits;
  }

  /**
   * Generate text using the configured method
   */
  generateText(prompt: string, params: GenerationParams): string {
    let text = prompt;
    let totalProb = 1;
    const model = { name: 'generate', vocab: this._vocabulary };
    for (let i = 0; i < params.maxLen; i++) {
      const next = this.nextToken(text, model, params);
      if (this._stopTokens.has(next)) {
        text += next === '.' ? '.' : '';
        break;
      }
      text += ' ' + next;
      totalProb *= 0.95;
    }
    const result: GeneratedText = {
      text,
      model: this._model,
      probability: totalProb,
      length: text.split(/\s+/).length
    };
    this._lastResult = result;
    this._generatedTexts.push(result);
    this._recordGeneration('sampling', result);
    return text;
  }

  /**
   * Greedy decoding - always pick the most likely token
   */
  greedySearch(prompt: string, model: { name: string }): string {
    let text = prompt;
    const params: GenerationParams = { maxLen: 50, temperature: 0.1, topK: 1, topP: 1.0 };
    for (let i = 0; i < 50; i++) {
      const vocab = this._vocabulary;
      const logits = this._computeLogits(text, vocab);
      let bestIdx = 0;
      let bestLogit = -Infinity;
      for (let j = 0; j < logits.length; j++) {
        if (logits[j] > bestLogit) {
          bestLogit = logits[j];
          bestIdx = j;
        }
      }
      const next = vocab[bestIdx];
      if (this._stopTokens.has(next)) break;
      text += ' ' + next;
    }
    this._model = model.name + '-greedy';
    const result: GeneratedText = {
      text,
      model: this._model,
      probability: 0.9,
      length: text.split(/\s+/).length
    };
    this._lastResult = result;
    this._generatedTexts.push(result);
    this._recordGeneration('greedy', result);
    return text;
  }

  /**
   * Beam search - maintain multiple hypotheses and pick the best
   */
  beamSearch(prompt: string, model: { name: string }, beams: number = 5): string {
    const beamWidth = Math.max(1, beams);
    let candidates: BeamCandidate[] = [{
      text: prompt,
      score: 0,
      tokens: this._tokenize(prompt),
      finished: false
    }];
    const params: GenerationParams = { maxLen: 1, temperature: 1.0, topK: beamWidth, topP: 1.0 };
    for (let step = 0; step < 30; step++) {
      const newCandidates: BeamCandidate[] = [];
      for (const cand of candidates) {
        if (cand.finished) {
          newCandidates.push(cand);
          continue;
        }
        const vocab = this._vocabulary;
        const logits = this._computeLogits(cand.text, vocab);
        const topK = this._topKFilter(logits, vocab, beamWidth);
        for (let i = 0; i < topK.tokens.length; i++) {
          const token = topK.tokens[i];
          const score = cand.score + Math.log(Math.max(1e-10, topK.logits[i]));
          const newTokens = [...cand.tokens, token];
          const finished = this._stopTokens.has(token);
          newCandidates.push({
            text: cand.text + ' ' + token,
            score,
            tokens: newTokens,
            finished
          });
        }
      }
      newCandidates.sort((a, b) => b.score - a.score);
      candidates = newCandidates.slice(0, beamWidth);
      if (candidates.every(c => c.finished)) break;
    }
    this._model = model.name + '-beam';
    const best = candidates[0];
    const result: GeneratedText = {
      text: best.text,
      model: this._model,
      probability: Math.exp(best.score),
      length: best.tokens.length
    };
    this._lastResult = result;
    this._generatedTexts.push(result);
    this._recordGeneration('beam', result);
    return best.text;
  }

  /**
   * Temperature scaling
   */
  temperatureSampling(logits: number[], temperature: number): number[] {
    const temp = Math.max(0.01, temperature);
    return logits.map(l => l / temp);
  }

  /**
   * Top-K filtering - keep only the top K logits
   */
  topKFiltering(logits: number[], k: number): number[] {
    const indexed = logits.map((l, i) => ({ l, i }));
    indexed.sort((a, b) => b.l - a.l);
    const filtered = new Array(logits.length).fill(-Infinity);
    for (let i = 0; i < Math.min(k, indexed.length); i++) {
      filtered[indexed[i].i] = indexed[i].l;
    }
    return filtered;
  }

  /**
   * Top-P (nucleus) filtering - keep tokens within cumulative probability p
   */
  topPFiltering(logits: number[], p: number): number[] {
    const indexed = logits.map((l, i) => ({ l, i }));
    indexed.sort((a, b) => b.l - a.l);
    const maxL = indexed[0]?.l || 0;
    const exps = indexed.map(x => Math.exp(x.l - maxL));
    const sum = exps.reduce((a, b) => a + b, 0);
    const probs = exps.map(e => e / sum);
    let cum = 0;
    const filtered = new Array(logits.length).fill(-Infinity);
    for (let i = 0; i < indexed.length; i++) {
      cum += probs[i];
      filtered[indexed[i].i] = indexed[i].l;
      if (cum >= p) break;
    }
    return filtered;
  }

  /**
   * Nucleus sampling - same as top-p
   */
  nucleusSampling(logits: number[], p: number): number[] {
    return this.topPFiltering(logits, p);
  }

  /**
   * Contrastive search - balance likelihood with similarity to context
   */
  contrastiveSearch(prompt: string, model: { name: string }): string {
    let text = prompt;
    const params: GenerationParams = { maxLen: 1, temperature: 0.7, topK: 10, topP: 0.95 };
    const history = new Set<string>();
    for (let i = 0; i < 40; i++) {
      let next = this.nextToken(text, { ...model, vocab: this._vocabulary }, params);
      let attempts = 0;
      while (history.has(next) && attempts < 5) {
        next = this.nextToken(text + '_' + attempts, { ...model, vocab: this._vocabulary }, params);
        attempts++;
      }
      history.add(next);
      if (this._stopTokens.has(next)) break;
      text += ' ' + next;
    }
    this._model = model.name + '-contrastive';
    const result: GeneratedText = {
      text,
      model: this._model,
      probability: 0.85,
      length: text.split(/\s+/).length
    };
    this._lastResult = result;
    this._generatedTexts.push(result);
    this._recordGeneration('contrastive', result);
    return text;
  }

  /**
   * Typical sampling - select based on typicality (entropy-based)
   */
  typicalSampling(logits: number[], mass: number = 0.9): number[] {
    const maxL = Math.max(...logits);
    const exps = logits.map(l => Math.exp(l - maxL));
    const sum = exps.reduce((a, b) => a + b, 0) || 1;
    const probs = exps.map(e => e / sum);
    const entropy = -probs.reduce((a, p) => a + (p > 0 ? p * Math.log(p) : 0), 0);
    const typicality = probs.map(p => Math.abs(-Math.log(p) - entropy));
    const indexed = typicality.map((t, i) => ({ t, i, p: probs[i] }))
      .sort((a, b) => a.t - b.t);
    let cum = 0;
    const filtered = new Array(logits.length).fill(-Infinity);
    for (const item of indexed) {
      filtered[item.i] = logits[item.i];
      cum += item.p;
      if (cum >= mass) break;
    }
    return filtered;
  }

  /**
   * Mirostat sampling - maintain a target surprise value
   */
  mirostatSampling(logits: number[], targetSurprise: number = 3.0, learningRate: number = 0.1, errorState: { value: number } = { value: 0 }): { sampled: number; newError: number } {
    const maxL = Math.max(...logits);
    const exps = logits.map(l => Math.exp(l - maxL));
    const sum = exps.reduce((a, b) => a + b, 0) || 1;
    const probs = exps.map(e => e / sum);
    const sortedIdx = probs.map((p, i) => ({ p, i }))
      .sort((a, b) => b.p - a.p);
    const k = Math.max(1, Math.min(probs.length, Math.ceil(Math.exp(targetSurprise))));
    let cum = 0;
    const filtered = new Array(probs.length).fill(0);
    for (let i = 0; i < k; i++) {
      filtered[sortedIdx[i].i] = probs[sortedIdx[i].i];
      cum += probs[sortedIdx[i].i];
    }
    for (let i = 0; i < filtered.length; i++) {
      if (filtered[i] > 0) filtered[i] /= cum;
    }
    const r = Math.random();
    let cumProb = 0;
    let sampledIdx = 0;
    for (let i = 0; i < filtered.length; i++) {
      cumProb += filtered[i];
      if (r <= cumProb) {
        sampledIdx = i;
        break;
      }
    }
    const observedSurprise = -Math.log(Math.max(1e-10, probs[sampledIdx]));
    const newError = errorState.value + learningRate * (observedSurprise - targetSurprise);
    return { sampled: sampledIdx, newError };
  }

  /**
   * Top-A sampling - adaptive top-k based on second-best probability
   */
  topASampling(logits: number[], a: number = 0.5): number[] {
    const maxL = Math.max(...logits);
    const exps = logits.map(l => Math.exp(l - maxL));
    const max = Math.max(...exps);
    const threshold = max * a * a;
    return logits.map((l, i) => exps[i] >= threshold ? l : -Infinity);
  }

  /**
   * Tail-free sampling (TFS)
   */
  tailFreeSampling(logits: number[], z: number = 0.95): number[] {
    const maxL = Math.max(...logits);
    const exps = logits.map(l => Math.exp(l - maxL));
    const sum = exps.reduce((a, b) => a + b, 0) || 1;
    const probs = exps.map(e => e / sum);
    const sorted = [...probs].sort((a, b) => b - a);
    const firstDiffs = sorted.slice(1).map((p, i) => Math.abs(p - sorted[i]));
    const secondDiffs = firstDiffs.slice(1).map((p, i) => Math.abs(p - firstDiffs[i]));
    const secondSum = secondDiffs.reduce((a, b) => a + b, 0) || 1;
    const secondNorm = secondDiffs.map(d => d / secondSum);
    let cum = 0;
    let cutoff = sorted.length;
    for (let i = 0; i < secondNorm.length; i++) {
      cum += secondNorm[i];
      if (cum >= z) {
        cutoff = i + 1;
        break;
      }
    }
    const filtered = new Array(logits.length).fill(-Infinity);
    const indexed = probs.map((p, i) => ({ p, i }))
      .sort((a, b) => b.p - a.p);
    for (let i = 0; i < Math.min(cutoff, indexed.length); i++) {
      filtered[indexed[i].i] = logits[indexed[i].i];
    }
    return filtered;
  }

  /**
   * Fill in the mask token
   */
  fillMask(text: string, maskToken: string = '[MASK]'): string {
    const maskIdx = text.indexOf(maskToken);
    if (maskIdx === -1) return text;
    const prefix = text.substring(0, maskIdx).trim();
    const params: GenerationParams = { maxLen: 1, temperature: 0.5, topK: 5, topP: 1.0 };
    const fill = this.nextToken(prefix, { name: 'fill-mask', vocab: this._vocabulary }, params);
    return text.substring(0, maskIdx) + fill + text.substring(maskIdx + maskToken.length);
  }

  /**
   * Text completion - alias for generateText
   */
  textCompletion(prompt: string, params: GenerationParams): string {
    return this.generateText(prompt, params);
  }

  /**
   * Paraphrase text - generate alternative wording
   */
  paraphrase(text: string, params: GenerationParams): string {
    const words = text.split(/\s+/);
    const paraphrased: string[] = [];
    const model = { name: 'paraphrase', vocab: this._vocabulary };
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      if (this._hash(word) % 5 === 0 && i > 0) {
        const prefix = paraphrased.join(' ');
        const replacement = this.nextToken(prefix, model, params);
        paraphrased.push(replacement);
      } else {
        paraphrased.push(word);
      }
    }
    const result = paraphrased.join(' ');
    const generated: GeneratedText = {
      text: result,
      model: 'paraphrase',
      probability: 0.8,
      length: paraphrased.length
    };
    this._lastResult = generated;
    this._generatedTexts.push(generated);
    this._recordGeneration('sampling', generated);
    return result;
  }

  /**
   * Continue writing - extend a partial text
   */
  continueText(text: string, params: GenerationParams): string {
    const continuation = this.generateText(text, params);
    return continuation;
  }

  /**
   * Generate multiple candidates and return all of them
   */
  generateMultiple(prompt: string, params: GenerationParams, num: number = 3): GeneratedText[] {
    const results: GeneratedText[] = [];
    for (let i = 0; i < num; i++) {
      const text = this.generateText(prompt, params);
      const last = this._generatedTexts[this._generatedTexts.length - 1];
      results.push(last);
    }
    return results;
  }

  /**
   * Generate with trace - record each step of generation
   */
  generateWithTrace(prompt: string, params: GenerationParams, steps: number = 10): GenerationTrace[] {
    const traces: GenerationTrace[] = [];
    let text = prompt;
    const model = { name: 'trace', vocab: this._vocabulary };
    for (let i = 0; i < steps; i++) {
      const logits = this._computeLogits(text, this._vocabulary);
      const temp = this._temperatureSampling(logits, params.temperature);
      const topK = this._topKFilter(temp, this._vocabulary, Math.min(5, params.topK));
      const candidates: TokenLogit[] = [];
      for (let j = 0; j < topK.tokens.length; j++) {
        candidates.push({
          token: topK.tokens[j],
          logit: topK.logits[j]
        });
      }
      const next = this.nextToken(text, model, params);
      traces.push({
        step: i,
        context: text,
        chosenToken: next,
        topCandidates: candidates,
        method: this._method
      });
      if (this._stopTokens.has(next)) break;
      text += ' ' + next;
    }
    this._traces.push(...traces);
    return traces;
  }

  /**
   * Compute log-probability of a sequence
   */
  sequenceLogProbability(text: string, model: { name: string; vocab?: string[] }): number {
    const tokens = this._tokenize(text);
    let logProb = 0;
    let prefix = '';
    for (const token of tokens) {
      const logits = this._computeLogits(prefix, model.vocab || this._vocabulary);
      const maxL = Math.max(...logits);
      const exps = logits.map(l => Math.exp(l - maxL));
      const sum = exps.reduce((a, b) => a + b, 0) || 1;
      const probs = exps.map(e => e / sum);
      const idx = (model.vocab || this._vocabulary).indexOf(token);
      if (idx >= 0 && probs[idx] > 0) {
        logProb += Math.log(probs[idx]);
      } else {
        logProb += Math.log(1e-10);
      }
      prefix += (prefix ? ' ' : '') + token;
    }
    return logProb;
  }

  /**
   * Perplexity of a sequence
   */
  perplexity(text: string, model: { name: string; vocab?: string[] }): number {
    const tokens = this._tokenize(text);
    if (tokens.length === 0) return Infinity;
    const logProb = this.sequenceLogProbability(text, model);
    return Math.exp(-logProb / tokens.length);
  }

  /**
   * Generate diverse candidates using diverse beam search
   */
  diverseBeamSearch(prompt: string, model: { name: string }, beams: number = 5, diversityRate: number = 0.5): string[] {
    const beamWidth = Math.max(1, beams);
    let groups: BeamCandidate[][] = [];
    const numGroups = Math.min(3, beamWidth);
    const perGroup = Math.ceil(beamWidth / numGroups);
    for (let g = 0; g < numGroups; g++) {
      groups.push([{ text: prompt, score: 0, tokens: this._tokenize(prompt), finished: false }]);
    }
    for (let step = 0; step < 25; step++) {
      for (let g = 0; g < numGroups; g++) {
        const newCandidates: BeamCandidate[] = [];
        for (const cand of groups[g]) {
          if (cand.finished) {
            newCandidates.push(cand);
            continue;
          }
          const vocab = this._vocabulary;
          const logits = this._computeLogits(cand.text, vocab);
          for (let k = 0; k < perGroup; k++) {
            logits[k] -= diversityRate * g;
          }
          const topK = this._topKFilter(logits, vocab, perGroup);
          for (let i = 0; i < topK.tokens.length; i++) {
            const token = topK.tokens[i];
            const score = cand.score + Math.log(Math.max(1e-10, topK.logits[i]));
            const finished = this._stopTokens.has(token);
            newCandidates.push({
              text: cand.text + ' ' + token,
              score,
              tokens: [...cand.tokens, token],
              finished
            });
          }
        }
        newCandidates.sort((a, b) => b.score - a.score);
        groups[g] = newCandidates.slice(0, perGroup);
      }
    }
    const all: BeamCandidate[] = [];
    for (const g of groups) all.push(...g);
    all.sort((a, b) => b.score - a.score);
    return all.slice(0, beamWidth).map(c => c.text);
  }

  /**
   * Top-K sampling with no repeat n-grams
   */
  topKWithNoRepeat(prompt: string, model: { name: string }, params: GenerationParams): string {
    let text = prompt;
    const tokens = this._tokenize(prompt);
    for (let i = 0; i < params.maxLen; i++) {
      let next = this.nextToken(text, { ...model, vocab: this._vocabulary }, params);
      if (this._noRepeatNgramSize > 0 && tokens.length >= this._noRepeatNgramSize - 1) {
        const context = tokens.slice(-(this._noRepeatNgramSize - 1));
        let attempts = 0;
        while (this._hasNgram(tokens, [...context, next]) && attempts < 5) {
          next = this.nextToken(text + '_' + attempts, { ...model, vocab: this._vocabulary }, params);
          attempts++;
        }
      }
      if (this._stopTokens.has(next)) break;
      text += ' ' + next;
      tokens.push(next);
    }
    this._model = model.name + '-no-repeat';
    const result: GeneratedText = {
      text,
      model: this._model,
      probability: 0.85,
      length: tokens.length
    };
    this._lastResult = result;
    this._generatedTexts.push(result);
    this._recordGeneration('top-k', result);
    return text;
  }

  /**
   * Generate a continuation that rhymes (simplified)
   */
  rhymingGeneration(prompt: string, rhymeScheme: string = 'AABB'): string {
    const lines = prompt.split('\n').filter(l => l.trim().length > 0);
    const scheme = rhymeScheme.split('');
    for (let i = 0; i < scheme.length; i++) {
      const targetLetter = scheme[i];
      let rhymeSeed = '';
      for (let j = 0; j < i; j++) {
        if (scheme[j] === targetLetter && lines[j]) {
          const words = lines[j].split(/\s+/);
          rhymeSeed = words[words.length - 1];
          break;
        }
      }
      const params: GenerationParams = { maxLen: 10, temperature: 0.8, topK: 20, topP: 0.95 };
      let newLine = this.generateText(prompt, params);
      if (rhymeSeed) {
        const lastChars = rhymeSeed.slice(-2);
        const lastWords = newLine.split(/\s+/);
        if (lastWords.length > 0) {
          lastWords[lastWords.length - 1] = lastWords[lastWords.length - 1].slice(0, -2) + lastChars;
          newLine = lastWords.join(' ');
        }
      }
      lines.push(newLine);
    }
    const result = lines.join('\n');
    const generated: GeneratedText = {
      text: result,
      model: 'rhyming',
      probability: 0.7,
      length: result.split(/\s+/).length
    };
    this._lastResult = generated;
    this._generatedTexts.push(generated);
    this._recordGeneration('sampling', generated);
    return result;
  }

  /**
   * Generate text with a specific style
   */
  styledGeneration(prompt: string, style: 'formal' | 'casual' | 'poetic' | 'technical' | 'humorous'): string {
    const styleParams: Record<string, GenerationParams> = {
      formal: { maxLen: 80, temperature: 0.5, topK: 30, topP: 0.85 },
      casual: { maxLen: 60, temperature: 1.0, topK: 50, topP: 0.95 },
      poetic: { maxLen: 50, temperature: 1.2, topK: 40, topP: 0.9 },
      technical: { maxLen: 100, temperature: 0.3, topK: 20, topP: 0.8 },
      humorous: { maxLen: 70, temperature: 1.3, topK: 60, topP: 0.98 }
    };
    const params = styleParams[style] || styleParams.casual;
    const result = this.generateText(prompt, params);
    this._model = `styled-${style}`;
    return result;
  }

  /**
   * Generate dialogue between two speakers
   */
  generateDialogue(topic: string, turns: number = 4): string[] {
    const speakers = ['Alice', 'Bob'];
    const dialogue: string[] = [];
    const params: GenerationParams = { maxLen: 30, temperature: 0.9, topK: 30, topP: 0.95 };
    let context = `Let's discuss ${topic}.`;
    for (let i = 0; i < turns; i++) {
      const speaker = speakers[i % 2];
      const line = this.generateText(`${speaker}: ${context}`, params);
      dialogue.push(`${speaker}: ${line}`);
      context = line;
    }
    return dialogue;
  }

  /**
   * Generate a story with a structured arc
   */
  generateStory(topic: string, length: number = 5): string {
    const arc = ['introduction', 'rising_action', 'climax', 'falling_action', 'resolution'];
    const story: string[] = [];
    for (let i = 0; i < Math.min(length, arc.length); i++) {
      const stage = arc[i];
      const params: GenerationParams = { maxLen: 30, temperature: 0.8, topK: 40, topP: 0.9 };
      const segment = this.generateText(`${stage}: ${topic}`, params);
      story.push(segment);
    }
    const result = story.join('\n\n');
    const generated: GeneratedText = {
      text: result,
      model: 'story',
      probability: 0.7,
      length: result.split(/\s+/).length
    };
    this._lastResult = generated;
    this._generatedTexts.push(generated);
    this._recordGeneration('sampling', generated);
    return result;
  }

  /**
   * Compute statistics about generation
   */
  statistics(): GenerationStat {
    const total = this._generatedTexts.length;
    const avgLength = total > 0 ? this._totalLength / total : 0;
    const avgProbability = total > 0 ? this._totalProbability / total : 0;
    return {
      totalGenerations: total,
      byMethod: { ...this._byMethodCount },
      avgLength,
      avgProbability,
      totalTokens: this._totalTokens
    };
  }

  /**
   * Serialize the generator state
   */
  serialize(): string {
    return JSON.stringify({
      generatedTexts: this._generatedTexts,
      model: this._model,
      counter: this._counter,
      params: this._params,
      method: this._method,
      byMethodCount: this._byMethodCount,
      totalLength: this._totalLength,
      totalProbability: this._totalProbability,
      totalTokens: this._totalTokens,
      stopTokens: Array.from(this._stopTokens),
      badWords: Array.from(this._badWords),
      contextWindow: this._contextWindow,
      repetitionPenalty: this._repetitionPenalty,
      noRepeatNgramSize: this._noRepeatNgramSize,
      beamWidth: this._beamWidth
    });
  }

  /**
   * Deserialize the generator state
   */
  deserialize(json: string): void {
    try {
      const data = JSON.parse(json);
      this._generatedTexts = data.generatedTexts || [];
      this._model = data.model || 'default';
      this._counter = data.counter || 0;
      this._params = data.params || { maxLen: 100, temperature: 1.0, topK: 50, topP: 0.9 };
      this._method = data.method || 'sampling';
      this._byMethodCount = data.byMethodCount || {};
      this._totalLength = data.totalLength || 0;
      this._totalProbability = data.totalProbability || 0;
      this._totalTokens = data.totalTokens || 0;
      this._stopTokens = new Set(data.stopTokens || ['.', '!', '?', '<EOS>', '</s>', '<END>']);
      this._badWords = new Set(data.badWords || []);
      this._contextWindow = data.contextWindow || 256;
      this._repetitionPenalty = data.repetitionPenalty || 1.0;
      this._noRepeatNgramSize = data.noRepeatNgramSize || 0;
      this._beamWidth = data.beamWidth || 5;
    } catch (e) {
      // ignore malformed input
    }
  }

  /**
   * Clear generation traces
   */
  clearTraces(): void {
    this._traces = [];
  }

  /**
   * Get the last generated text
   */
  getLastGenerated(): GeneratedText | null {
    return this._lastResult;
  }

  /**
   * Get the n-gram probability of a token given context
   */
  ngramProbability(context: string, token: string): number {
    if (this._ngramStats.length === 0) return 0;
    const stat = this._ngramStats[this._ngramStats.length - 1];
    const n = stat.n;
    const ctxTokens = this._tokenize(context).slice(-(n - 1));
    const ctx = ctxTokens.join(' ');
    const ctxMap = stat.counts.get(ctx);
    const total = stat.totals.get(ctx) || 0;
    if (!ctxMap || total === 0) return 0;
    return (ctxMap.get(token) || 0) / total;
  }

  /**
   * Initialize vocabulary with common English words
   */
  private _initVocabulary(): void {
    this._vocabulary = [
      'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
      'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
      'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
      'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what',
      'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me',
      'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know', 'take',
      'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other',
      'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also',
      'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well', 'way',
      'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us',
      'is', 'are', 'was', 'were', 'been', 'being', 'have', 'has', 'had', 'does',
      'did', 'should', 'may', 'might', 'must', 'shall', 'more', 'very', 'much', 'many',
      'such', 'here', 'where', 'why', 'again', 'once', 'down', 'off', 'still', 'every',
      'both', 'few', 'other', 'same', 'own', 'through', 'during', 'before', 'after', 'above',
      'between', 'under', 'again', 'further', 'then', 'once', 'high', 'great', 'small', 'large'
    ];
  }

  /**
   * Initialize empty n-gram statistics
   */
  private _initNGramStats(): void {
    this._ngramStats = [
      { n: 2, counts: new Map(), totals: new Map() },
      { n: 3, counts: new Map(), totals: new Map() }
    ];
  }

  /**
   * Top-K filter helper
   */
  private _topKFilter(logits: number[], tokens: string[], k: number): { logits: number[]; tokens: string[] } {
    const pairs = logits.map((l, i) => ({ l, t: tokens[i] }));
    pairs.sort((a, b) => b.l - a.l);
    const top = pairs.slice(0, k);
    return {
      logits: top.map(p => p.l),
      tokens: top.map(p => p.t)
    };
  }

  /**
   * Top-P filter helper
   */
  private _topPFilter(logits: number[], tokens: string[], p: number): { logits: number[]; tokens: string[] } {
    const pairs = logits.map((l, i) => ({ l, t: tokens[i] }));
    pairs.sort((a, b) => b.l - a.l);
    const maxL = pairs[0]?.l || 0;
    const exps = pairs.map(x => Math.exp(x.l - maxL));
    const sum = exps.reduce((a, b) => a + b, 0) || 1;
    const probs = exps.map(e => e / sum);
    let cum = 0;
    const filtered: { l: number; t: string }[] = [];
    for (let i = 0; i < pairs.length; i++) {
      cum += probs[i];
      filtered.push(pairs[i]);
      if (cum >= p) break;
    }
    return {
      logits: filtered.map(f => f.l),
      tokens: filtered.map(f => f.t)
    };
  }

  /**
   * Apply repetition penalty to logits
   */
  private _applyRepetitionPenalty(logits: number[], tokens: string[], prefix: string): number[] {
    if (this._repetitionPenalty === 1.0) return logits;
    const prefixTokens = new Set(this._tokenize(prefix));
    return logits.map((l, i) => {
      if (prefixTokens.has(tokens[i])) {
        return l > 0 ? l / this._repetitionPenalty : l * this._repetitionPenalty;
      }
      return l;
    });
  }

  /**
   * Sample from logits using softmax
   */
  private _sampleFrom(logits: number[], tokens: string[]): string {
    if (logits.length === 0) return '<EOS>';
    const maxL = Math.max(...logits);
    const exps = logits.map(l => Math.exp(l - maxL));
    const sum = exps.reduce((a, b) => a + b, 0) || 1;
    const probs = exps.map(e => e / sum);
    const r = Math.random();
    let cum = 0;
    for (let i = 0; i < probs.length; i++) {
      cum += probs[i];
      if (r <= cum) return tokens[i];
    }
    return tokens[tokens.length - 1];
  }

  /**
   * Apply temperature scaling
   */
  private _temperatureSampling(logits: number[], temperature: number): number[] {
    const temp = Math.max(0.01, temperature);
    return logits.map(l => l / temp);
  }

  /**
   * Check if an n-gram exists in the token list
   */
  private _hasNgram(tokens: string[], ngram: string[]): boolean {
    if (ngram.length === 0) return false;
    for (let i = 0; i + ngram.length <= tokens.length; i++) {
      let match = true;
      for (let j = 0; j < ngram.length; j++) {
        if (tokens[i + j] !== ngram[j]) {
          match = false;
          break;
        }
      }
      if (match) return true;
    }
    return false;
  }

  /**
   * Tokenize text
   */
  private _tokenize(text: string): string[] {
    return text.split(/\s+/).map(w => w.replace(/[.,!?;:'"]/g, '')).filter(w => w.length > 0);
  }

  /**
   * Hash function for deterministic pseudo-randomness
   */
  private _hash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  /**
   * Record a generation and update statistics
   */
  private _recordGeneration(method: string, result: GeneratedText): void {
    this._byMethodCount[method] = (this._byMethodCount[method] || 0) + 1;
    this._totalLength += result.length;
    this._totalProbability += result.probability;
    this._totalTokens += result.length;
    this._counter++;
  }

  toPacket(): DataPacket<GeneratedText> {
    const result = this._lastResult || { text: '', model: '', probability: 0, length: 0 };
    this._counter++;
    return {
      id: `generator-${Date.now()}-${this._counter}`,
      payload: result,
      metadata: {
        createdAt: Date.now(),
        route: ['nlp', 'generator'],
        priority: 1,
        phase: 'text-generation'
      }
    };
  }

  reset(): void {
    this._generatedTexts = [];
    this._model = 'default';
    this._counter = 0;
    this._params = { maxLen: 100, temperature: 1.0, topK: 50, topP: 0.9 };
    this._lastResult = null;
    this._traces = [];
    this._byMethodCount = {};
    this._totalLength = 0;
    this._totalProbability = 0;
    this._totalTokens = 0;
    this._badWords.clear();
    this._repetitionPenalty = 1.0;
    this._noRepeatNgramSize = 0;
    this._beamWidth = 5;
    this._maxNewTokens = 100;
  }
}
