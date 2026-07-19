import { DataPacket } from '../shared/types';

export interface NGramCount {
  ngram: string;
  count: number;
  probability: number;
  logProbability: number;
}

export interface NGramModel {
  order: number;
  vocabSize: number;
  totalCount: number;
  unigramCounts: Map<string, number>;
  bigramCounts: Map<string, number>;
  trigramCounts: Map<string, number>;
  ngramCounts: Map<string, Map<string, number>>;
  smoothing: string;
  discounting: number;
}

export interface NeuralLMState {
  hiddenState: number[];
  cellState: number[];
  contextWindow: string[];
  perplexity: number;
}

export interface WFSTArc {
  fromState: number;
  toState: number;
  inputSymbol: string;
  outputSymbol: string;
  weight: number;
}

export interface WFSTState {
  id: number;
  arcs: WFSTArc[];
  isFinal: boolean;
  finalWeight: number;
}

export interface WFST {
  states: WFSTState[];
  startState: number;
  inputSymbols: Set<string>;
  outputSymbols: Set<string>;
  numStates: number;
  numArcs: number;
}

export interface LMPrediction {
  word: string;
  probability: number;
  logProbability: number;
  rank: number;
  context: string[];
}

export interface LMEvaluation {
  perplexity: number;
  logLikelihood: number;
  oovRate: number;
  sentenceCount: number;
  wordCount: number;
  oovCount: number;
}

export interface LanguageResult {
  modelType: string;
  ngramModel: NGramModel | null;
  neuralLM: NeuralLMState | null;
  wfst: WFST | null;
  vocabulary: string[];
  vocabSize: number;
  predictions: LMPrediction[];
  evaluation: LMEvaluation | null;
  order: number;
  smoothingMethod: string;
}

export class LanguageModel {
  private _modelType: string = 'ngram';
  private _order: number = 3;
  private _smoothingMethod: string = 'kneser-ney';
  private _discounting: number = 0.75;
  private _vocabulary: Set<string> = new Set();
  private _unigramCounts: Map<string, number> = new Map();
  private _bigramCounts: Map<string, number> = new Map();
  private _trigramCounts: Map<string, number> = new Map();
  private _totalUnigramCount: number = 0;
  private _totalBigramCount: number = 0;
  private _totalTrigramCount: number = 0;
  private _neuralLMState: NeuralLMState | null = null;
  private _wfst: WFST | null = null;
  private _predictions: LMPrediction[] = [];
  private _lastEvaluation: LMEvaluation | null = null;
  private _counter: number = 0;
  private _lastResult: LanguageResult | null = null;
  private _vocabSize: number = 0;
  private _unkToken: string = '<unk>';
  private _bosToken: string = '<s>';
  private _eosToken: string = '</s>';
  private _embeddingDim: number = 128;
  private _hiddenDim: number = 256;

  constructor() {
    this._initDefaultVocab();
  }

  private _initDefaultVocab(): void {
    const defaultWords = [
      this._bosToken, this._eosToken, this._unkToken,
      'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'must', 'can', 'shall', 'of', 'in', 'to',
      'for', 'with', 'on', 'at', 'from', 'by', 'about', 'as', 'into',
      'through', 'during', 'before', 'after', 'above', 'below', 'between',
      'and', 'but', 'or', 'nor', 'not', 'so', 'yet', 'both', 'either',
      'neither', 'each', 'every', 'all', 'any', 'few', 'more', 'most',
      'other', 'some', 'such', 'no', 'only', 'own', 'same', 'than', 'too',
      'very', 'just', 'because', 'if', 'when', 'where', 'how', 'what',
      'which', 'who', 'whom', 'this', 'that', 'these', 'those', 'i', 'you',
      'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
      'my', 'your', 'his', 'its', 'our', 'their', 'mine', 'yours', 'hers',
      'ours', 'theirs', 'up', 'down', 'out', 'off', 'over', 'under',
      'again', 'further', 'then', 'once', 'here', 'there', 'also', 'now'
    ];
    for (const word of defaultWords) {
      this._vocabulary.add(word);
      this._unigramCounts.set(word, 1);
      this._totalUnigramCount++;
    }
    this._vocabSize = this._vocabulary.size;
  }

  get modelType(): string {
    return this._modelType;
  }

  get order(): number {
    return this._order;
  }

  get smoothingMethod(): string {
    return this._smoothingMethod;
  }

  get discounting(): number {
    return this._discounting;
  }

  get vocabSize(): number {
    return this._vocabSize;
  }

  get vocabulary(): string[] {
    return Array.from(this._vocabulary);
  }

  get predictions(): LMPrediction[] {
    return this._predictions;
  }

  get unkToken(): string {
    return this._unkToken;
  }

  get bosToken(): string {
    return this._bosToken;
  }

  get eosToken(): string {
    return this._eosToken;
  }

  get totalWordCount(): number {
    return this._totalUnigramCount;
  }

  setModelType(type: string): void {
    const validTypes = ['ngram', 'neural', 'wfst'];
    if (!validTypes.includes(type)) {
      throw new Error(`Invalid model type: ${type}`);
    }
    this._modelType = type;
  }

  setOrder(n: number): void {
    if (n < 1 || n > 5) {
      throw new Error('N-gram order must be between 1 and 5');
    }
    this._order = n;
  }

  setSmoothingMethod(method: string): void {
    const validMethods = ['add-k', 'good-turing', 'kneser-ney', 'witten-bell', 'none'];
    if (!validMethods.includes(method)) {
      throw new Error(`Invalid smoothing method: ${method}`);
    }
    this._smoothingMethod = method;
  }

  setDiscounting(d: number): void {
    if (d <= 0 || d >= 1) {
      throw new Error('Discounting factor must be in (0, 1)');
    }
    this._discounting = d;
  }

  setVocabulary(words: string[]): void {
    this._vocabulary = new Set(words);
    this._vocabSize = words.length;
  }

  addWord(word: string): void {
    if (!this._vocabulary.has(word)) {
      this._vocabulary.add(word);
      this._vocabSize++;
    }
  }

  containsWord(word: string): boolean {
    return this._vocabulary.has(word);
  }

  trainNgram(sentences: string[][]): void {
    for (const sentence of sentences) {
      const padded = [this._bosToken, ...sentence, this._eosToken];
      for (const word of padded) {
        if (!this._vocabulary.has(word)) {
          this._vocabulary.add(word);
          this._vocabSize++;
        }
        const w = this._vocabulary.has(word) ? word : this._unkToken;
        this._unigramCounts.set(w, (this._unigramCounts.get(w) || 0) + 1);
        this._totalUnigramCount++;
      }
      for (let i = 0; i < padded.length - 1; i++) {
        const w1 = this._vocabulary.has(padded[i]) ? padded[i] : this._unkToken;
        const w2 = this._vocabulary.has(padded[i + 1]) ? padded[i + 1] : this._unkToken;
        const bigram = `${w1} ${w2}`;
        this._bigramCounts.set(bigram, (this._bigramCounts.get(bigram) || 0) + 1);
        this._totalBigramCount++;
      }
      for (let i = 0; i < padded.length - 2; i++) {
        const w1 = this._vocabulary.has(padded[i]) ? padded[i] : this._unkToken;
        const w2 = this._vocabulary.has(padded[i + 1]) ? padded[i + 1] : this._unkToken;
        const w3 = this._vocabulary.has(padded[i + 2]) ? padded[i + 2] : this._unkToken;
        const trigram = `${w1} ${w2} ${w3}`;
        this._trigramCounts.set(trigram, (this._trigramCounts.get(trigram) || 0) + 1);
        this._totalTrigramCount++;
      }
    }
  }

  unigramProbability(word: string): number {
    const w = this._vocabulary.has(word) ? word : this._unkToken;
    const count = this._unigramCounts.get(w) || 0;
    switch (this._smoothingMethod) {
      case 'add-k':
        return (count + 1) / (this._totalUnigramCount + this._vocabSize);
      case 'good-turing':
        return this._goodTuringSmoothing(count, 1);
      case 'kneser-ney':
      case 'witten-bell':
      default:
        if (this._totalUnigramCount === 0) return 1 / this._vocabSize;
        return count / this._totalUnigramCount;
    }
  }

  bigramProbability(word: string, prevWord: string): number {
    const w = this._vocabulary.has(word) ? word : this._unkToken;
    const prev = this._vocabulary.has(prevWord) ? prevWord : this._unkToken;
    const bigram = `${prev} ${w}`;
    const prevCount = this._unigramCounts.get(prev) || 0;
    const biCount = this._bigramCounts.get(bigram) || 0;
    switch (this._smoothingMethod) {
      case 'add-k':
        return (biCount + 1) / (prevCount + this._vocabSize);
      case 'kneser-ney':
        return this._kneserNeyBigram(prev, w, prevCount, biCount);
      case 'good-turing':
        return this._goodTuringSmoothing(biCount, 2);
      case 'witten-bell':
        return this._wittenBellBigram(prev, w, prevCount, biCount);
      default:
        if (prevCount === 0) return 1 / this._vocabSize;
        return biCount / prevCount;
    }
  }

  trigramProbability(word: string, prevWords: string[]): number {
    if (prevWords.length < 2) {
      return prevWords.length === 1 ? this.bigramProbability(word, prevWords[0]) : this.unigramProbability(word);
    }
    const w = this._vocabulary.has(word) ? word : this._unkToken;
    const prev1 = this._vocabulary.has(prevWords[prevWords.length - 2]) ? prevWords[prevWords.length - 2] : this._unkToken;
    const prev2 = this._vocabulary.has(prevWords[prevWords.length - 1]) ? prevWords[prevWords.length - 1] : this._unkToken;
    const trigram = `${prev1} ${prev2} ${w}`;
    const bigram = `${prev1} ${prev2}`;
    const triCount = this._trigramCounts.get(trigram) || 0;
    const biCount = this._bigramCounts.get(bigram) || 0;
    switch (this._smoothingMethod) {
      case 'add-k':
        return (triCount + 1) / (biCount + this._vocabSize);
      case 'kneser-ney':
        return this._kneserNeyTrigram(prev1, prev2, w, biCount, triCount);
      case 'good-turing':
        return this._goodTuringSmoothing(triCount, 3);
      case 'witten-bell':
        return this._wittenBellTrigram(prev1, prev2, w, biCount, triCount);
      default:
        if (biCount === 0) return this.bigramProbability(w, [prev2]);
        return triCount / biCount;
    }
  }

  ngramProbability(word: string, context: string[]): number {
    const n = context.length + 1;
    if (n > this._order) {
      context = context.slice(context.length - this._order + 1);
    }
    if (context.length === 0) {
      return this.unigramProbability(word);
    } else if (context.length === 1) {
      return this.bigramProbability(word, context[0]);
    } else {
      return this.trigramProbability(word, context);
    }
  }

  private _kneserNeyBigram(prev: string, curr: string, prevCount: number, biCount: number): number {
    const d = this._discounting;
    if (prevCount === 0) {
      return this._unigramProbLowerOrder(curr);
    }
    const numTypesAfter = this._countUniqueNextWords(prev);
    const lambda = (d * numTypesAfter) / prevCount;
    const discounted = Math.max(biCount - d, 0) / prevCount;
    const lowerOrder = this._unigramProbLowerOrder(curr);
    return discounted + lambda * lowerOrder;
  }

  private _kneserNeyTrigram(w1: string, w2: string, w3: string, biCount: number, triCount: number): number {
    const d = this._discounting;
    if (biCount === 0) {
      return this.bigramProbability(w3, w2);
    }
    const numTypesAfter = this._countUniqueNextWords(`${w1} ${w2}`);
    const lambda = (d * numTypesAfter) / biCount;
    const discounted = Math.max(triCount - d, 0) / biCount;
    const lowerOrder = this.bigramProbability(w3, w2);
    return discounted + lambda * lowerOrder;
  }

  private _countUniqueNextWords(prefix: string): number {
    let count = 0;
    const prefixSpace = prefix + ' ';
    for (const key of this._bigramCounts.keys()) {
      if (key.startsWith(prefixSpace)) {
        count++;
      }
    }
    return count > 0 ? count : 1;
  }

  private _unigramProbLowerOrder(word: string): number {
    let uniquePredecessors = 0;
    let totalUniquePairs = 0;
    for (const key of this._bigramCounts.keys()) {
      if (key.endsWith(' ' + word)) {
        uniquePredecessors++;
      }
      totalUniquePairs++;
    }
    if (totalUniquePairs === 0) return 1 / this._vocabSize;
    return uniquePredecessors / totalUniquePairs;
  }

  private _goodTuringSmoothing(count: number, order: number): number {
    const total = order === 1 ? this._totalUnigramCount : order === 2 ? this._totalBigramCount : this._totalTrigramCount;
    if (total === 0) return 1 / this._vocabSize;
    const n = count;
    let n1 = 0;
    let n2 = 0;
    const counts = order === 1 ? this._unigramCounts : order === 2 ? this._bigramCounts : this._trigramCounts;
    for (const c of counts.values()) {
      if (c === 1) n1++;
      if (c === 2) n2++;
    }
    if (n === 0) {
      return n1 / total;
    }
    if (n1 === 0 || n2 === 0) {
      return n / total;
    }
    const expectedCount = (n + 1) * (n + 1 === 1 ? n1 : (n + 1 === 2 ? n2 : 1)) / (n === 1 ? n1 : (n === 2 ? n2 : 1));
    return expectedCount / total;
  }

  private _wittenBellBigram(prev: string, curr: string, prevCount: number, biCount: number): number {
    if (prevCount === 0) {
      return this.unigramProbability(curr);
    }
    const t = this._countUniqueNextWords(prev);
    const z = Math.max(this._vocabSize - t, 1);
    const lambda = prevCount / (prevCount + t);
    return lambda * (biCount / prevCount) + (1 - lambda) * this.unigramProbability(curr);
  }

  private _wittenBellTrigram(w1: string, w2: string, w3: string, biCount: number, triCount: number): number {
    if (biCount === 0) {
      return this.bigramProbability(w3, w2);
    }
    let t = 0;
    const prefix = `${w1} ${w2} `;
    for (const key of this._trigramCounts.keys()) {
      if (key.startsWith(prefix)) {
        t++;
      }
    }
    t = Math.max(t, 1);
    const lambda = biCount / (biCount + t);
    return lambda * (triCount / biCount) + (1 - lambda) * this.bigramProbability(w3, w2);
  }

  logProbability(sentence: string[]): number {
    let logProb = 0;
    const context: string[] = [];
    const padded = [this._bosToken, ...sentence, this._eosToken];
    for (const word of padded) {
      const prob = this.ngramProbability(word, context);
      logProb += Math.log(Math.max(prob, 1e-10));
      context.push(word);
      if (context.length >= this._order - 1) {
        context.shift();
      }
    }
    return logProb;
  }

  perplexity(sentences: string[][]): LMEvaluation {
    let totalLogProb = 0;
    let totalWords = 0;
    let oovCount = 0;
    let sentCount = 0;
    for (const sentence of sentences) {
      const logProb = this.logProbability(sentence);
      totalLogProb += logProb;
      totalWords += sentence.length + 2;
      for (const word of sentence) {
        if (!this._vocabulary.has(word)) {
          oovCount++;
        }
      }
      sentCount++;
    }
    const avgLogProb = totalWords > 0 ? totalLogProb / totalWords : 0;
    const ppl = Math.exp(-avgLogProb);
    const oovRate = totalWords > 0 ? oovCount / totalWords : 0;
    const result: LMEvaluation = {
      perplexity: ppl,
      logLikelihood: totalLogProb,
      oovRate,
      sentenceCount: sentCount,
      wordCount: totalWords,
      oovCount
    };
    this._lastEvaluation = result;
    return result;
  }

  predictNextWords(context: string[], topK: number = 10): LMPrediction[] {
    const predictions: LMPrediction[] = [];
    for (const word of this._vocabulary) {
      if (word === this._bosToken || word === this._eosToken) continue;
      const prob = this.ngramProbability(word, context);
      predictions.push({
        word,
        probability: prob,
        logProbability: Math.log(Math.max(prob, 1e-10)),
        rank: 0,
        context: [...context]
      });
    }
    predictions.sort((a, b) => b.probability - a.probability);
    for (let i = 0; i < predictions.length; i++) {
      predictions[i].rank = i + 1;
    }
    this._predictions = predictions.slice(0, topK);
    return this._predictions;
  }

  sampleFromDistribution(context: string[], temperature: number = 1.0): string {
    const probs: { word: string; prob: number }[] = [];
    let total = 0;
    for (const word of this._vocabulary) {
      const prob = Math.pow(this.ngramProbability(word, context), 1 / temperature);
      probs.push({ word, prob });
      total += prob;
    }
    let rand = Math.random() * total;
    for (const item of probs) {
      rand -= item.prob;
      if (rand <= 0) {
        return item.word;
      }
    }
    return this._unkToken;
  }

  generateSentence(maxLength: number = 20, temperature: number = 1.0): string[] {
    const sentence: string[] = [];
    const context: string[] = [this._bosToken];
    for (let i = 0; i < maxLength; i++) {
      const next = this.sampleFromDistribution(context, temperature);
      if (next === this._eosToken) {
        break;
      }
      sentence.push(next);
      context.push(next);
      if (context.length >= this._order - 1) {
        context.shift();
      }
    }
    return sentence;
  }

  initializeNeuralLM(embeddingDim: number, hiddenDim: number): void {
    this._embeddingDim = embeddingDim;
    this._hiddenDim = hiddenDim;
    this._neuralLMState = {
      hiddenState: new Array(hiddenDim).fill(0),
      cellState: new Array(hiddenDim).fill(0),
      contextWindow: [],
      perplexity: 0
    };
  }

  buildWFST(): WFST {
    const states: WFSTState[] = [];
    const wordList = Array.from(this._vocabulary);
    let stateId = 0;
    states.push({ id: stateId++, arcs: [], isFinal: false, finalWeight: 0 });
    for (let i = 0; i < Math.min(wordList.length, 100); i++) {
      for (let j = 0; j < Math.min(wordList.length, 100); j++) {
        const biProb = this.bigramProbability(wordList[j], wordList[i]);
        if (biProb > 1e-5) {
          let fromState = -1;
          for (const s of states) {
            if (s.arcs.some(a => a.inputSymbol === wordList[i] && a.toState === s.id)) {
              fromState = s.id;
              break;
            }
          }
          if (fromState === -1) {
            fromState = 0;
          }
          const toStateId = stateId++;
          states.push({ id: toStateId, arcs: [], isFinal: true, finalWeight: -Math.log(biProb) });
          states[fromState].arcs.push({
            fromState,
            toState: toStateId,
            inputSymbol: wordList[i],
            outputSymbol: wordList[j],
            weight: -Math.log(biProb)
          });
        }
      }
    }
    const wfst: WFST = {
      states,
      startState: 0,
      inputSymbols: new Set(wordList),
      outputSymbols: new Set(wordList),
      numStates: states.length,
      numArcs: states.reduce((sum, s) => sum + s.arcs.length, 0)
    };
    this._wfst = wfst;
    return wfst;
  }

  composeWFST(a: WFST, b: WFST): WFST {
    const composedStates: WFSTState[] = [];
    const stateMap = new Map<string, number>();
    const queue: [number, number][] = [[a.startState, b.startState]];
    const startKey = `${a.startState},${b.startState}`;
    stateMap.set(startKey, 0);
    composedStates.push({ id: 0, arcs: [], isFinal: false, finalWeight: 0 });
    while (queue.length > 0) {
      const [sa, sb] = queue.shift()!;
      const curKey = `${sa},${sb}`;
      const curId = stateMap.get(curKey)!;
      const stateA = a.states[sa];
      const stateB = b.states[sb];
      if (stateA.isFinal && stateB.isFinal) {
        composedStates[curId].isFinal = true;
        composedStates[curId].finalWeight = stateA.finalWeight + stateB.finalWeight;
      }
      for (const arcA of stateA.arcs) {
        for (const arcB of stateB.arcs) {
          if (arcA.outputSymbol === arcB.inputSymbol) {
            const nextKey = `${arcA.toState},${arcB.toState}`;
            if (!stateMap.has(nextKey)) {
              stateMap.set(nextKey, composedStates.length);
              composedStates.push({ id: composedStates.length, arcs: [], isFinal: false, finalWeight: 0 });
              queue.push([arcA.toState, arcB.toState]);
            }
            const toId = stateMap.get(nextKey)!;
            composedStates[curId].arcs.push({
              fromState: curId,
              toState: toId,
              inputSymbol: arcA.inputSymbol,
              outputSymbol: arcB.outputSymbol,
              weight: arcA.weight + arcB.weight
            });
          }
        }
      }
    }
    return {
      states: composedStates,
      startState: 0,
      inputSymbols: new Set([...a.inputSymbols]),
      outputSymbols: new Set([...b.outputSymbols]),
      numStates: composedStates.length,
      numArcs: composedStates.reduce((sum, s) => sum + s.arcs.length, 0)
    };
  }

  evaluate(sentences: string[][]): LMEvaluation {
    return this.perplexity(sentences);
  }

  toPacket(): DataPacket<LanguageResult> {
    const result = this._lastResult || {
      modelType: this._modelType,
      ngramModel: this._modelType === 'ngram' ? {
        order: this._order,
        vocabSize: this._vocabSize,
        totalCount: this._totalUnigramCount,
        unigramCounts: this._unigramCounts,
        bigramCounts: this._bigramCounts,
        trigramCounts: this._trigramCounts,
        ngramCounts: new Map(),
        smoothing: this._smoothingMethod,
        discounting: this._discounting
      } : null,
      neuralLM: this._neuralLMState,
      wfst: this._wfst,
      vocabulary: Array.from(this._vocabulary),
      vocabSize: this._vocabSize,
      predictions: this._predictions,
      evaluation: this._lastEvaluation,
      order: this._order,
      smoothingMethod: this._smoothingMethod
    };
    this._counter++;
    return {
      id: `language-model-${Date.now()}-${this._counter}`,
      payload: result,
      metadata: {
        createdAt: Date.now(),
        route: ['speech_recognition', 'language_model'],
        priority: 1,
        phase: 'language_scoring'
      }
    };
  }

  reset(): void {
    this._modelType = 'ngram';
    this._order = 3;
    this._smoothingMethod = 'kneser-ney';
    this._discounting = 0.75;
    this._vocabulary = new Set();
    this._unigramCounts = new Map();
    this._bigramCounts = new Map();
    this._trigramCounts = new Map();
    this._totalUnigramCount = 0;
    this._totalBigramCount = 0;
    this._totalTrigramCount = 0;
    this._neuralLMState = null;
    this._wfst = null;
    this._predictions = [];
    this._lastEvaluation = null;
    this._counter = 0;
    this._lastResult = null;
    this._vocabSize = 0;
    this._embeddingDim = 128;
    this._hiddenDim = 256;
    this._initDefaultVocab();
  }
}
