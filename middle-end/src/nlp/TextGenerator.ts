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

export class TextGenerator {
  private _generatedTexts: GeneratedText[] = [];
  private _model: string = 'default';
  private _counter: number = 0;
  private _vocabulary: string[] = [];
  private _params: GenerationParams = { maxLen: 100, temperature: 1.0, topK: 50, topP: 0.9 };
  private _lastResult: GeneratedText | null = null;

  constructor() {
    this._initVocabulary();
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
      'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us'
    ];
  }

  nextToken(prefix: string, model: { name: string; vocab?: string[] }, params: GenerationParams): string {
    const vocab = model.vocab || this._vocabulary;
    const seed = this._hash(prefix + model.name);
    let s = seed;
    const logits: number[] = [];
    for (let i = 0; i < vocab.length; i++) {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      logits.push((s % 1000) / 1000);
    }
    const temperature = params.temperature || 1.0;
    const scaled = logits.map(l => l / temperature);
    const filtered = this._topKFilter(scaled, vocab, params.topK || 50);
    const nucleus = this._topPFilter(filtered.logits, filtered.tokens, params.topP || 0.9);
    const selected = this._sampleFrom(nucleus.logits, nucleus.tokens);
    this._model = model.name;
    this._params = params;
    return selected;
  }

  generateText(prompt: string, params: GenerationParams): string {
    let text = prompt;
    let totalProb = 1;
    const model = { name: 'generate', vocab: this._vocabulary };
    for (let i = 0; i < params.maxLen; i++) {
      const next = this.nextToken(text, model, params);
      if (next === '<EOS>' || next === '.') {
        text += '.';
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
    return text;
  }

  greedySearch(prompt: string, model: { name: string }): string {
    let text = prompt;
    const params: GenerationParams = { maxLen: 50, temperature: 0.1, topK: 1, topP: 1.0 };
    for (let i = 0; i < 50; i++) {
      const next = this.nextToken(text, { ...model, vocab: this._vocabulary }, params);
      if (next === '.' || next === '<EOS>') break;
      text += ' ' + next;
    }
    this._model = model.name + '-greedy';
    return text;
  }

  beamSearch(prompt: string, model: { name: string }, beams: number = 5): string {
    let candidates: { text: string; score: number }[] = [{ text: prompt, score: 0 }];
    const params: GenerationParams = { maxLen: 1, temperature: 1.0, topK: beams, topP: 1.0 };
    for (let step = 0; step < 30; step++) {
      const newCandidates: { text: string; score: number }[] = [];
      for (const cand of candidates) {
        const next = this.nextToken(cand.text, { ...model, vocab: this._vocabulary }, params);
        const score = cand.score - Math.log(0.9);
        newCandidates.push({ text: cand.text + ' ' + next, score });
      }
      newCandidates.sort((a, b) => b.score - a.score);
      candidates = newCandidates.slice(0, beams);
      if (candidates[0].text.endsWith('.')) break;
    }
    this._model = model.name + '-beam';
    return candidates[0].text;
  }

  temperatureSampling(logits: number[], temperature: number): number[] {
    return logits.map(l => l / temperature);
  }

  topKFiltering(logits: number[], k: number): number[] {
    const indexed = logits.map((l, i) => ({ l, i }));
    indexed.sort((a, b) => b.l - a.l);
    const filtered = new Array(logits.length).fill(-Infinity);
    for (let i = 0; i < Math.min(k, indexed.length); i++) {
      filtered[indexed[i].i] = indexed[i].l;
    }
    return filtered;
  }

  topPFiltering(logits: number[], p: number): number[] {
    const indexed = logits.map((l, i) => ({ l, i }));
    indexed.sort((a, b) => b.l - a.l);
    const maxL = indexed[0].l;
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

  nucleusSampling(logits: number[], p: number): number[] {
    return this.topPFiltering(logits, p);
  }

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
      if (next === '.' || next === '<EOS>') break;
      text += ' ' + next;
    }
    this._model = model.name + '-contrastive';
    return text;
  }

  fillMask(text: string, maskToken: string = '[MASK]'): string {
    const maskIdx = text.indexOf(maskToken);
    if (maskIdx === -1) return text;
    const prefix = text.substring(0, maskIdx).trim();
    const params: GenerationParams = { maxLen: 1, temperature: 0.5, topK: 5, topP: 1.0 };
    const fill = this.nextToken(prefix, { name: 'fill-mask', vocab: this._vocabulary }, params);
    return text.substring(0, maskIdx) + fill + text.substring(maskIdx + maskToken.length);
  }

  textCompletion(prompt: string, params: GenerationParams): string {
    return this.generateText(prompt, params);
  }

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
    this._lastResult = {
      text: result,
      model: 'paraphrase',
      probability: 0.8,
      length: paraphrased.length
    };
    return result;
  }

  private _topKFilter(logits: number[], tokens: string[], k: number): { logits: number[]; tokens: string[] } {
    const pairs = logits.map((l, i) => ({ l, t: tokens[i] }));
    pairs.sort((a, b) => b.l - a.l);
    const top = pairs.slice(0, k);
    return {
      logits: top.map(p => p.l),
      tokens: top.map(p => p.t)
    };
  }

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

  private _sampleFrom(logits: number[], tokens: string[]): string {
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

  private _hash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
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
  }
}
