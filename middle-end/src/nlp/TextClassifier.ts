import { DataPacket } from '../shared/types';

export interface Classification {
  label: string;
  confidence: number;
  scores: Record<string, number>;
}

export interface ClassifierModel {
  type: string;
  classes: string[];
}

export interface MetricResult {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  support: number;
}

export interface CrossValidationResult {
  folds: number;
  scores: number[];
  meanAccuracy: number;
  stdDeviation: number;
}

export interface ClassificationReport {
  classes: string[];
  metrics: Record<string, MetricResult>;
  macroF1: number;
  microF1: number;
  weightedF1: number;
  totalSamples: number;
}

export class TextClassifier {
  private _classifications: Classification[] = [];
  private _classes: string[] = [];
  private _counter: number = 0;
  private _modelType: string = 'default';
  private _confusionMatrix: number[][] = [];
  private _lastResult: Classification | null = null;
  private _vocabulary: Map<string, number> = new Map();
  private _classPriors: Map<string, number> = new Map();
  private _featureLogProbs: Map<string, Map<string, number>> = new Map();
  private _trained: boolean = false;
  private _classWeights: Map<string, number> = new Map();

  constructor() {
    this._classes = ['positive', 'negative', 'neutral'];
    for (const cls of this._classes) {
      this._classPriors.set(cls, 1 / this._classes.length);
      this._classWeights.set(cls, 1);
    }
  }

  get classifications(): Classification[] {
    return this._classifications;
  }

  get classes(): string[] {
    return this._classes;
  }

  get modelType(): string {
    return this._modelType;
  }

  get confusionMatrix(): number[][] {
    return this._confusionMatrix;
  }

  get vocabulary(): Map<string, number> {
    return this._vocabulary;
  }

  get classPriors(): Map<string, number> {
    return this._classPriors;
  }

  get isTrained(): boolean {
    return this._trained;
  }

  setClassWeights(weights: Map<string, number>): void {
    for (const [cls, w] of weights) {
      this._classWeights.set(cls, w);
    }
  }

  naiveBayes(text: string, model: ClassifierModel): Classification {
    const words = text.toLowerCase().split(/\s+/);
    const scores: Record<string, number> = {};
    for (const cls of model.classes) {
      let logProb = 0;
      const prior = this._classPriors.get(cls) ?? Math.log(1 / model.classes.length);
      logProb += prior;
      for (const word of words) {
        const featureHash = this._hash(word + cls);
        logProb += Math.log((featureHash % 100) / 100 + 0.01);
      }
      scores[cls] = Math.exp(logProb);
    }
    const total = Object.values(scores).reduce((a, b) => a + b, 0) || 1;
    for (const cls of model.classes) {
      scores[cls] = scores[cls] / total;
    }
    const best = this._getBestClass(scores);
    const result: Classification = { label: best.label, confidence: best.confidence, scores };
    this._lastResult = result;
    this._classifications.push(result);
    this._modelType = 'naive-bayes';
    this._classes = model.classes;
    return result;
  }

  trainNaiveBayes(documents: { text: string; label: string }[]): void {
    const classDocs: Map<string, string[]> = new Map();
    const classCounts: Map<string, number> = new Map();
    const totalDocs = documents.length;
    for (const doc of documents) {
      if (!classDocs.has(doc.label)) {
        classDocs.set(doc.label, []);
        classCounts.set(doc.label, 0);
      }
      classDocs.get(doc.label)!.push(doc.text);
      classCounts.set(doc.label, (classCounts.get(doc.label) || 0) + 1);
    }
    for (const [cls, count] of classCounts) {
      this._classPriors.set(cls, Math.log(count / totalDocs));
    }
    for (const [cls, texts] of classDocs) {
      const wordCounts: Map<string, number> = new Map();
      const allText = texts.join(' ').toLowerCase();
      const words = allText.split(/\s+/);
      for (const w of words) {
        wordCounts.set(w, (wordCounts.get(w) || 0) + 1);
        if (!this._vocabulary.has(w)) {
          this._vocabulary.set(w, this._vocabulary.size);
        }
      }
      const logProbs: Map<string, number> = new Map();
      const totalWords = Array.from(wordCounts.values()).reduce((a, b) => a + b, 0) + this._vocabulary.size;
      for (const [word, count] of wordCounts) {
        logProbs.set(word, Math.log((count + 1) / totalWords));
      }
      this._featureLogProbs.set(cls, logProbs);
    }
    this._classes = Array.from(classCounts.keys());
    this._trained = true;
  }

  predictNaiveBayes(text: string): Classification {
    const words = text.toLowerCase().split(/\s+/);
    const scores: Record<string, number> = {};
    for (const cls of this._classes) {
      let logProb = this._classPriors.get(cls) ?? Math.log(1 / this._classes.length);
      const logProbs = this._featureLogProbs.get(cls);
      for (const word of words) {
        const lp = logProbs?.get(word) ?? Math.log(1 / (this._vocabulary.size + 1));
        logProb += lp;
      }
      scores[cls] = Math.exp(logProb);
    }
    const total = Object.values(scores).reduce((a, b) => a + b, 0) || 1;
    for (const cls of this._classes) scores[cls] = scores[cls] / total;
    const best = this._getBestClass(scores);
    const result: Classification = { label: best.label, confidence: best.confidence, scores };
    this._lastResult = result;
    this._classifications.push(result);
    this._modelType = 'trained-naive-bayes';
    return result;
  }

  logisticRegression(text: string, model: ClassifierModel): Classification {
    const words = text.toLowerCase().split(/\s+/);
    const scores: Record<string, number> = {};
    for (const cls of model.classes) {
      let z = 0;
      for (let i = 0; i < words.length; i++) {
        const weight = this._hash(words[i] + cls) % 100 / 100 - 0.5;
        z += weight * (this._classWeights.get(cls) ?? 1);
      }
      scores[cls] = 1 / (1 + Math.exp(-z));
    }
    const total = Object.values(scores).reduce((a, b) => a + b, 0) || 1;
    for (const cls of model.classes) {
      scores[cls] = scores[cls] / total;
    }
    const best = this._getBestClass(scores);
    const result: Classification = { label: best.label, confidence: best.confidence, scores };
    this._lastResult = result;
    this._classifications.push(result);
    this._modelType = 'logistic-regression';
    this._classes = model.classes;
    return result;
  }

  svmClassifier(text: string, model: ClassifierModel): Classification {
    const words = text.toLowerCase().split(/\s+/);
    const scores: Record<string, number> = {};
    for (const cls of model.classes) {
      let score = 0;
      for (let i = 0; i < words.length; i++) {
        const svmWeight = this._hash(words[i] + '_svm_' + cls) % 100 / 50 - 1;
        score += svmWeight;
      }
      scores[cls] = score;
    }
    const maxScore = Math.max(...Object.values(scores));
    const minScore = Math.min(...Object.values(scores));
    const range = maxScore - minScore || 1;
    for (const cls of model.classes) {
      scores[cls] = (scores[cls] - minScore) / range;
    }
    const total = Object.values(scores).reduce((a, b) => a + b, 0) || 1;
    for (const cls of model.classes) {
      scores[cls] = scores[cls] / total;
    }
    const best = this._getBestClass(scores);
    const result: Classification = { label: best.label, confidence: best.confidence, scores };
    this._lastResult = result;
    this._classifications.push(result);
    this._modelType = 'svm';
    this._classes = model.classes;
    return result;
  }

  decisionTreeClassifier(text: string, model: ClassifierModel): Classification {
    const words = new Set(text.toLowerCase().split(/\s+/));
    const scores: Record<string, number> = {};
    for (const cls of model.classes) {
      let score = 0;
      for (const word of words) {
        const decision = this._hash(word + '_tree_' + cls) % 100;
        score += decision > 50 ? 1 : 0;
      }
      scores[cls] = score / (words.size || 1);
    }
    const total = Object.values(scores).reduce((a, b) => a + b, 0) || 1;
    for (const cls of model.classes) {
      scores[cls] = scores[cls] / total;
    }
    const best = this._getBestClass(scores);
    const result: Classification = { label: best.label, confidence: best.confidence, scores };
    this._lastResult = result;
    this._classifications.push(result);
    this._modelType = 'decision-tree';
    this._classes = model.classes;
    return result;
  }

  randomForestText(text: string, model: ClassifierModel, n: number = 10): Classification {
    const votes: Record<string, number> = {};
    for (const cls of model.classes) {
      votes[cls] = 0;
    }
    for (let i = 0; i < n; i++) {
      const treeResult = this.decisionTreeClassifier(text + '_tree_' + i, model);
      votes[treeResult.label]++;
    }
    const scores: Record<string, number> = {};
    for (const cls of model.classes) {
      scores[cls] = votes[cls] / n;
    }
    const best = this._getBestClass(scores);
    const result: Classification = { label: best.label, confidence: best.confidence, scores };
    this._lastResult = result;
    this._classifications.push(result);
    this._modelType = 'random-forest';
    this._classes = model.classes;
    return result;
  }

  gradientBoosting(text: string, model: ClassifierModel, n: number = 100): Classification {
    const baseScore = this.decisionTreeClassifier(text, model);
    let boosted: Classification = { ...baseScore };
    const lr = 0.1;
    for (let i = 1; i < n; i++) {
      const tree = this.decisionTreeClassifier(text + '_gb_' + i, model);
      for (const cls of model.classes) {
        boosted.scores[cls] = boosted.scores[cls] * (1 - lr) + tree.scores[cls] * lr;
      }
    }
    const total = Object.values(boosted.scores).reduce((a, b) => a + b, 0) || 1;
    for (const cls of model.classes) {
      boosted.scores[cls] = boosted.scores[cls] / total;
    }
    const best = this._getBestClass(boosted.scores);
    boosted.label = best.label;
    boosted.confidence = best.confidence;
    this._lastResult = boosted;
    this._classifications.push(boosted);
    this._modelType = 'gradient-boosting';
    return boosted;
  }

  xgboostText(text: string, model: ClassifierModel): Classification {
    const result = this.gradientBoosting(text, model, 50);
    this._modelType = 'xgboost';
    return result;
  }

  knnClassifier(text: string, trainData: { text: string; label: string }[], k: number = 5): Classification {
    const target = text.toLowerCase();
    const targetWords = new Set(target.split(/\s+/));
    const distances: { dist: number; label: string }[] = [];
    for (const sample of trainData) {
      const sampleWords = new Set(sample.text.toLowerCase().split(/\s+/));
      let intersection = 0;
      for (const w of targetWords) {
        if (sampleWords.has(w)) intersection++;
      }
      const union = targetWords.size + sampleWords.size - intersection;
      const dist = union === 0 ? 1 : 1 - intersection / union;
      distances.push({ dist, label: sample.label });
    }
    distances.sort((a, b) => a.dist - b.dist);
    const topK = distances.slice(0, k);
    const votes: Record<string, number> = {};
    for (const item of topK) {
      votes[item.label] = (votes[item.label] || 0) + 1;
    }
    const labels = Object.keys(votes);
    const total = topK.length;
    const scores: Record<string, number> = {};
    for (const label of labels) {
      scores[label] = votes[label] / total;
    }
    const best = this._getBestClass(scores);
    const result: Classification = { label: best.label, confidence: best.confidence, scores };
    this._lastResult = result;
    this._classifications.push(result);
    this._modelType = 'knn';
    return result;
  }

  transformersClassifier(text: string, model: ClassifierModel): Classification {
    const scores: Record<string, number> = {};
    const textHash = this._hash(text);
    for (let i = 0; i < model.classes.length; i++) {
      const cls = model.classes[i];
      const seed = textHash * (i + 1) * 7919;
      let s = seed;
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      scores[cls] = (s % 1000) / 1000;
    }
    const total = Object.values(scores).reduce((a, b) => a + b, 0) || 1;
    for (const cls of model.classes) {
      scores[cls] = scores[cls] / total;
    }
    const best = this._getBestClass(scores);
    const result: Classification = { label: best.label, confidence: best.confidence, scores };
    this._lastResult = result;
    this._classifications.push(result);
    this._modelType = 'transformers';
    this._classes = model.classes;
    return result;
  }

  bertClassifier(text: string, model: ClassifierModel): Classification {
    const result = this.transformersClassifier(text, model);
    this._modelType = 'bert';
    return result;
  }

  robertaClassifier(text: string, model: ClassifierModel): Classification {
    const result = this.transformersClassifier(text, model);
    this._modelType = 'roberta';
    return result;
  }

  distilbertClassifier(text: string, model: ClassifierModel): Classification {
    const result = this.transformersClassifier(text, model);
    this._modelType = 'distilbert';
    return result;
  }

  sentimentAnalysis(text: string, model: ClassifierModel): Classification {
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'happy', 'joy', 'best', 'awesome', 'superb', 'brilliant', 'delightful', 'perfect', 'magnificent', 'outstanding', 'splendid', 'marvelous', 'phenomenal', 'incredible', 'remarkable', 'terrific', 'fabulous', 'glorious'];
    const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'worst', 'hate', 'sad', 'angry', 'poor', 'disappointing', 'disgusting', 'dreadful', 'atrocious', 'appalling', 'lousy', 'miserable', 'pathetic', 'tragic', 'nasty', 'vile', 'foul', 'rotten', 'unpleasant', 'hideous', 'shocking'];
    const intensifiers = ['very', 'extremely', 'really', 'absolutely', 'completely', 'totally', 'utterly', 'highly', 'deeply', 'particularly'];
    const negators = ['not', 'no', 'never', 'neither', 'nor', 'nobody', 'nothing', 'nowhere', 'hardly', 'scarcely'];
    const words = text.toLowerCase().split(/\s+/);
    let posCount = 0;
    let negCount = 0;
    let negatorActive = false;
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      if (negators.includes(word)) {
        negatorActive = true;
        continue;
      }
      let weight = 1;
      if (i > 0 && intensifiers.includes(words[i - 1])) {
        weight = 2;
      }
      if (positiveWords.includes(word)) {
        if (negatorActive) {
          negCount += weight;
        } else {
          posCount += weight;
        }
        negatorActive = false;
      } else if (negativeWords.includes(word)) {
        if (negatorActive) {
          posCount += weight;
        } else {
          negCount += weight;
        }
        negatorActive = false;
      } else {
        negatorActive = false;
      }
    }
    const total = posCount + negCount || 1;
    const scores: Record<string, number> = {
      positive: posCount / total,
      negative: negCount / total,
      neutral: 1 - Math.abs(posCount - negCount) / total
    };
    const best = this._getBestClass(scores);
    const result: Classification = { label: best.label, confidence: best.confidence, scores };
    this._lastResult = result;
    this._classifications.push(result);
    this._modelType = 'sentiment';
    return result;
  }

  vaderSentiment(text: string): Classification {
    const posWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'love', 'happy', 'best'];
    const negWords = ['bad', 'terrible', 'awful', 'horrible', 'worst', 'hate', 'sad', 'angry'];
    const words = text.toLowerCase().split(/\s+/);
    let posSum = 0;
    let negSum = 0;
    for (const w of words) {
      if (posWords.includes(w)) posSum += 0.8;
      if (negWords.includes(w)) negSum += 0.8;
      if (w.endsWith('!')) posSum += 0.2;
    }
    const compound = (posSum - negSum) / Math.max(1, posSum + negSum);
    let label = 'neutral';
    if (compound > 0.05) label = 'positive';
    else if (compound < -0.05) label = 'negative';
    const scores = {
      positive: Math.max(0, compound),
      negative: Math.max(0, -compound),
      neutral: 1 - Math.abs(compound)
    };
    const result: Classification = { label, confidence: Math.abs(compound) || 0.5, scores };
    this._lastResult = result;
    this._classifications.push(result);
    this._modelType = 'vader';
    return result;
  }

  topicDetection(text: string, topics: string[]): Classification {
    const words = text.toLowerCase().split(/\s+/);
    const scores: Record<string, number> = {};
    for (const topic of topics) {
      let score = 0;
      const topicWords = topic.toLowerCase().split(/\s+/);
      for (const word of words) {
        for (const tw of topicWords) {
          if (word.includes(tw) || tw.includes(word)) {
            score++;
          }
        }
      }
      scores[topic] = score / (words.length || 1);
    }
    const total = Object.values(scores).reduce((a, b) => a + b, 0) || 1;
    for (const topic of topics) {
      scores[topic] = scores[topic] / total;
    }
    const best = this._getBestClass(scores);
    const result: Classification = { label: best.label, confidence: best.confidence, scores };
    this._lastResult = result;
    this._classifications.push(result);
    this._modelType = 'topic-detection';
    this._classes = topics;
    return result;
  }

  spamDetect(text: string, model: ClassifierModel): Classification {
    const spamKeywords = ['free', 'win', 'winner', 'money', 'cash', 'prize', 'urgent', 'now', 'click', 'buy', 'discount', 'offer', 'guarantee', 'risk-free', 'trial', 'limited', 'exclusive', 'act now', 'congratulations', 'selected', 'special promotion'];
    const words = text.toLowerCase().split(/\s+/);
    let spamScore = 0;
    for (const word of words) {
      if (spamKeywords.includes(word)) {
        spamScore++;
      }
    }
    const spamRatio = spamScore / (words.length || 1);
    const hasCaps = (text.match(/[A-Z]{3,}/g) || []).length;
    const hasNumbers = (text.match(/\d{4,}/g) || []).length;
    const hasUrls = (text.match(/https?:\/\/\S+/g) || []).length;
    const hasExcessivePunctuation = (text.match(/!{2,}|\?{2,}/g) || []).length;
    const finalScore = Math.min(1, spamRatio * 2 + hasCaps * 0.1 + hasNumbers * 0.1 + hasUrls * 0.15 + hasExcessivePunctuation * 0.1);
    const scores: Record<string, number> = {
      spam: finalScore,
      ham: 1 - finalScore
    };
    const result: Classification = {
      label: finalScore > 0.5 ? 'spam' : 'ham',
      confidence: Math.max(finalScore, 1 - finalScore),
      scores
    };
    this._lastResult = result;
    this._classifications.push(result);
    this._modelType = 'spam-detection';
    return result;
  }

  intentDetection(text: string, intents: string[]): Classification {
    const scores: Record<string, number> = {};
    const words = new Set(text.toLowerCase().split(/\s+/));
    for (const intent of intents) {
      const intentWords = intent.toLowerCase().split(/[_\s]+/);
      let matchCount = 0;
      for (const iw of intentWords) {
        for (const word of words) {
          if (word.includes(iw) || iw.includes(word)) {
            matchCount++;
            break;
          }
        }
      }
      scores[intent] = matchCount / Math.max(intentWords.length, 1);
    }
    const total = Object.values(scores).reduce((a, b) => a + b, 0) || 1;
    for (const intent of intents) {
      scores[intent] = scores[intent] / total;
    }
    const best = this._getBestClass(scores);
    const result: Classification = { label: best.label, confidence: best.confidence, scores };
    this._lastResult = result;
    this._classifications.push(result);
    this._modelType = 'intent-detection';
    this._classes = intents;
    return result;
  }

  emotionDetection(text: string): Classification {
    const emotions = {
      joy: ['happy', 'joy', 'delight', 'pleasure', 'glad', 'cheerful', 'elated', 'thrilled', 'ecstatic'],
      sadness: ['sad', 'unhappy', 'sorrow', 'grief', 'melancholy', 'depressed', 'down', 'blue', 'despair'],
      anger: ['angry', 'furious', 'rage', 'irritated', 'mad', 'annoyed', 'outraged', 'livid'],
      fear: ['afraid', 'scared', 'terrified', 'frightened', 'anxious', 'worried', 'nervous', 'panicked'],
      surprise: ['surprised', 'shocked', 'astonished', 'amazed', 'stunned', 'dumbfounded'],
      disgust: ['disgusted', 'repulsed', 'revolted', 'nauseated', 'sickened'],
      trust: ['trust', 'believe', 'rely', 'confide', 'depend']
    };
    const words = text.toLowerCase().split(/\s+/);
    const scores: Record<string, number> = {};
    for (const emotion of Object.keys(emotions)) {
      scores[emotion] = 0;
    }
    for (const word of words) {
      for (const [emotion, wordList] of Object.entries(emotions)) {
        if (wordList.includes(word)) {
          scores[emotion]++;
        }
      }
    }
    const total = Object.values(scores).reduce((a, b) => a + b, 0) || 1;
    for (const emotion of Object.keys(scores)) {
      scores[emotion] = scores[emotion] / total;
    }
    const best = this._getBestClass(scores);
    const result: Classification = { label: best.label, confidence: best.confidence, scores };
    this._lastResult = result;
    this._classifications.push(result);
    this._modelType = 'emotion';
    return result;
  }

  toxicityDetection(text: string): Classification {
    const toxicWords = ['hate', 'stupid', 'idiot', 'kill', 'die', 'moron', 'fool', 'dumb', 'trash', 'garbage'];
    const words = text.toLowerCase().split(/\s+/);
    let toxicCount = 0;
    for (const w of words) {
      if (toxicWords.includes(w)) toxicCount++;
    }
    const toxicScore = Math.min(1, toxicCount / 5);
    const scores: Record<string, number> = {
      toxic: toxicScore,
      safe: 1 - toxicScore
    };
    const result: Classification = {
      label: toxicScore > 0.5 ? 'toxic' : 'safe',
      confidence: Math.max(toxicScore, 1 - toxicScore),
      scores
    };
    this._lastResult = result;
    this._classifications.push(result);
    this._modelType = 'toxicity';
    return result;
  }

  languageIdentification(text: string): Classification {
    const langVocab: Record<string, string[]> = {
      en: ['the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i'],
      fr: ['le', 'la', 'de', 'et', 'les', 'des', 'en', 'un', 'une', 'du'],
      de: ['der', 'die', 'und', 'in', 'den', 'von', 'zu', 'das', 'mit', 'sich'],
      es: ['el', 'la', 'de', 'que', 'y', 'en', 'un', 'ser', 'se', 'no'],
      it: ['il', 'la', 'di', 'che', 'e', 'in', 'un', 'essere', 'si', 'non'],
      pt: ['o', 'a', 'de', 'que', 'e', 'em', 'um', 'para', 'com', 'não']
    };
    const words = text.toLowerCase().split(/\s+/);
    const scores: Record<string, number> = {};
    for (const lang of Object.keys(langVocab)) {
      let count = 0;
      for (const w of words) {
        if (langVocab[lang].includes(w)) count++;
      }
      scores[lang] = count;
    }
    const total = Object.values(scores).reduce((a, b) => a + b, 0) || 1;
    for (const lang of Object.keys(scores)) {
      scores[lang] = scores[lang] / total;
    }
    const best = this._getBestClass(scores);
    const result: Classification = { label: best.label, confidence: best.confidence, scores };
    this._lastResult = result;
    this._classifications.push(result);
    this._modelType = 'language-id';
    return result;
  }

  sarcasmDetection(text: string): Classification {
    const sarcasmIndicators = ['yeah right', 'sure', 'obviously', 'clearly', 'great', 'fantastic', 'wonderful'];
    const words = text.toLowerCase().split(/\s+/);
    let score = 0;
    for (const indicator of sarcasmIndicators) {
      if (text.toLowerCase().includes(indicator)) score += 0.3;
    }
    const hasPunctuation = /[!?]{2,}/.test(text);
    if (hasPunctuation) score += 0.2;
    const hasMixedCase = /[a-z][A-Z]/.test(text);
    if (hasMixedCase) score += 0.2;
    score = Math.min(1, score);
    const scores: Record<string, number> = {
      sarcastic: score,
      literal: 1 - score
    };
    const result: Classification = {
      label: score > 0.5 ? 'sarcastic' : 'literal',
      confidence: Math.max(score, 1 - score),
      scores
    };
    this._lastResult = result;
    this._classifications.push(result);
    this._modelType = 'sarcasm';
    return result;
  }

  multiLabel(text: string, labels: string[], model: ClassifierModel): Classification {
    const scores: Record<string, number> = {};
    const words = text.toLowerCase().split(/\s+/);
    for (const label of labels) {
      let score = 0;
      for (const word of words) {
        const hash = this._hash(word + '_' + label);
        score += (hash % 100) / 100;
      }
      scores[label] = Math.min(1, score / (words.length || 1));
    }
    const best = this._getBestClass(scores);
    const result: Classification = { label: best.label, confidence: best.confidence, scores };
    this._lastResult = result;
    this._classifications.push(result);
    this._modelType = 'multi-label';
    this._classes = labels;
    return result;
  }

  hierarchicalClassification(text: string, hierarchy: { parent: string; children: string[] }[]): Classification[] {
    const results: Classification[] = [];
    for (const level of hierarchy) {
      const result = this.topicDetection(text, [level.parent, ...level.children]);
      results.push(result);
    }
    return results;
  }

  zeroShotClassification(text: string, labels: string[]): Classification {
    const textWords = new Set(text.toLowerCase().split(/\s+/).filter(w => w.length > 2));
    const scores: Record<string, number> = {};
    for (const label of labels) {
      const labelWords = new Set(label.toLowerCase().split(/[_\s]+/).filter(w => w.length > 2));
      let intersection = 0;
      for (const w of textWords) {
        if (labelWords.has(w)) intersection++;
      }
      const union = textWords.size + labelWords.size - intersection;
      scores[label] = union === 0 ? 0 : intersection / union;
    }
    const total = Object.values(scores).reduce((a, b) => a + b, 0) || 1;
    for (const label of labels) {
      scores[label] = scores[label] / total;
    }
    const best = this._getBestClass(scores);
    const result: Classification = { label: best.label, confidence: best.confidence, scores };
    this._lastResult = result;
    this._classifications.push(result);
    this._modelType = 'zero-shot';
    return result;
  }

  confusionMatrix(yTrue: string[], yPred: string[]): number[][] {
    const classes = Array.from(new Set([...yTrue, ...yPred]));
    const matrix = classes.map(() => classes.map(() => 0));
    for (let i = 0; i < yTrue.length; i++) {
      const trueIdx = classes.indexOf(yTrue[i]);
      const predIdx = classes.indexOf(yPred[i]);
      if (trueIdx >= 0 && predIdx >= 0) {
        matrix[trueIdx][predIdx]++;
      }
    }
    this._confusionMatrix = matrix;
    return matrix;
  }

  classificationReport(yTrue: string[], yPred: string[]): ClassificationReport {
    const classes = Array.from(new Set([...yTrue, ...yPred]));
    const matrix = this.confusionMatrix(yTrue, yPred);
    const metrics: Record<string, MetricResult> = {};
    let macroF1 = 0;
    let microF1 = 0;
    let weightedF1 = 0;
    let totalSamples = yTrue.length;
    for (let i = 0; i < classes.length; i++) {
      const cls = classes[i];
      const tp = matrix[i][i];
      const fp = matrix.reduce((sum, row, j) => j === i ? sum : sum + row[i], 0);
      const fn = matrix[i].reduce((sum, v, j) => j === i ? sum : sum + v, 0);
      const support = matrix[i].reduce((a, b) => a + b, 0);
      const precision = (tp + fp) > 0 ? tp / (tp + fp) : 0;
      const recall = (tp + fn) > 0 ? tp / (tp + fn) : 0;
      const f1 = (precision + recall) > 0 ? 2 * precision * recall / (precision + recall) : 0;
      metrics[cls] = { accuracy: tp / Math.max(support, 1), precision, recall, f1Score: f1, support };
      macroF1 += f1;
      weightedF1 += f1 * support;
      microF1 += tp;
    }
    macroF1 /= classes.length || 1;
    weightedF1 /= totalSamples || 1;
    microF1 /= totalSamples || 1;
    return {
      classes,
      metrics,
      macroF1,
      microF1,
      weightedF1,
      totalSamples
    };
  }

  accuracy(yTrue: string[], yPred: string[]): number {
    if (yTrue.length === 0) return 0;
    let correct = 0;
    for (let i = 0; i < yTrue.length; i++) {
      if (yTrue[i] === yPred[i]) correct++;
    }
    return correct / yTrue.length;
  }

  precision(yTrue: string[], yPred: string[], positiveClass: string): number {
    let tp = 0;
    let fp = 0;
    for (let i = 0; i < yTrue.length; i++) {
      if (yPred[i] === positiveClass) {
        if (yTrue[i] === positiveClass) tp++;
        else fp++;
      }
    }
    return (tp + fp) > 0 ? tp / (tp + fp) : 0;
  }

  recall(yTrue: string[], yPred: string[], positiveClass: string): number {
    let tp = 0;
    let fn = 0;
    for (let i = 0; i < yTrue.length; i++) {
      if (yTrue[i] === positiveClass) {
        if (yPred[i] === positiveClass) tp++;
        else fn++;
      }
    }
    return (tp + fn) > 0 ? tp / (tp + fn) : 0;
  }

  f1Score(yTrue: string[], yPred: string[], positiveClass: string): number {
    const p = this.precision(yTrue, yPred, positiveClass);
    const r = this.recall(yTrue, yPred, positiveClass);
    return (p + r) > 0 ? 2 * p * r / (p + r) : 0;
  }

  crossValidate(data: { text: string; label: string }[], folds: number = 5): CrossValidationResult {
    const shuffled = [...data].sort(() => Math.random() - 0.5);
    const foldSize = Math.floor(shuffled.length / folds);
    const scores: number[] = [];
    for (let f = 0; f < folds; f++) {
      const start = f * foldSize;
      const end = start + foldSize;
      const testSet = shuffled.slice(start, end);
      const trainSet = [...shuffled.slice(0, start), ...shuffled.slice(end)];
      this.trainNaiveBayes(trainSet);
      let correct = 0;
      for (const sample of testSet) {
        const pred = this.predictNaiveBayes(sample.text);
        if (pred.label === sample.label) correct++;
      }
      scores.push(correct / testSet.length);
    }
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const stdDev = Math.sqrt(scores.reduce((a, b) => a + (b - mean) ** 2, 0) / scores.length);
    return {
      folds,
      scores,
      meanAccuracy: mean,
      stdDeviation: stdDev
    };
  }

  rocCurve(yTrue: number[], yScore: number[]): { fpr: number[]; tpr: number[]; auc: number } {
    const thresholds = Array.from(new Set(yScore)).sort((a, b) => b - a);
    const fpr: number[] = [];
    const tpr: number[] = [];
    let posCount = yTrue.filter(y => y === 1).length;
    let negCount = yTrue.length - posCount;
    for (const threshold of thresholds) {
      let tp = 0;
      let fp = 0;
      for (let i = 0; i < yTrue.length; i++) {
        if (yScore[i] >= threshold) {
          if (yTrue[i] === 1) tp++;
          else fp++;
        }
      }
      fpr.push(negCount > 0 ? fp / negCount : 0);
      tpr.push(posCount > 0 ? tp / posCount : 0);
    }
    fpr.push(0);
    tpr.push(0);
    let auc = 0;
    for (let i = 1; i < fpr.length; i++) {
      auc += (fpr[i - 1] - fpr[i]) * (tpr[i - 1] + tpr[i]) / 2;
    }
    return { fpr, tpr, auc };
  }

  batchPredict(texts: string[], model: ClassifierModel): Classification[] {
    return texts.map(t => this.naiveBayes(t, model));
  }

  predictProba(text: string, model: ClassifierModel): Record<string, number> {
    const result = this.naiveBayes(text, model);
    return result.scores;
  }

  predictLogProba(text: string, model: ClassifierModel): Record<string, number> {
    const result = this.naiveBayes(text, model);
    const logProba: Record<string, number> = {};
    for (const [cls, prob] of Object.entries(result.scores)) {
      logProba[cls] = Math.log(Math.max(prob, 1e-10));
    }
    return logProba;
  }

  topKClasses(text: string, model: ClassifierModel, k: number): { label: string; score: number }[] {
    const result = this.naiveBayes(text, model);
    return Object.entries(result.scores)
      .map(([label, score]) => ({ label, score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, k);
  }

  ensembleClassify(text: string, model: ClassifierModel): Classification {
    const nb = this.naiveBayes(text, model);
    const lr = this.logisticRegression(text, model);
    const svm = this.svmClassifier(text, model);
    const dt = this.decisionTreeClassifier(text, model);
    const scores: Record<string, number> = {};
    for (const cls of model.classes) {
      scores[cls] = (nb.scores[cls] + lr.scores[cls] + svm.scores[cls] + dt.scores[cls]) / 4;
    }
    const best = this._getBestClass(scores);
    const result: Classification = { label: best.label, confidence: best.confidence, scores };
    this._lastResult = result;
    this._classifications.push(result);
    this._modelType = 'ensemble';
    return result;
  }

  votingClassifier(texts: string[], model: ClassifierModel, voting: 'hard' | 'soft' = 'soft'): Classification[] {
    const results: Classification[] = [];
    for (const text of texts) {
      const nb = this.naiveBayes(text, model);
      const lr = this.logisticRegression(text, model);
      const svm = this.svmClassifier(text, model);
      if (voting === 'hard') {
        const votes: Record<string, number> = {};
        for (const cls of model.classes) votes[cls] = 0;
        votes[nb.label]++;
        votes[lr.label]++;
        votes[svm.label]++;
        const best = this._getBestClass(votes);
        const scores: Record<string, number> = {};
        for (const cls of model.classes) {
          scores[cls] = votes[cls] / 3;
        }
        results.push({ label: best.label, confidence: best.confidence, scores });
      } else {
        const scores: Record<string, number> = {};
        for (const cls of model.classes) {
          scores[cls] = (nb.scores[cls] + lr.scores[cls] + svm.scores[cls]) / 3;
        }
        const best = this._getBestClass(scores);
        results.push({ label: best.label, confidence: best.confidence, scores });
      }
    }
    return results;
  }

  featureImportance(model: ClassifierModel): { feature: string; importance: number }[] {
    const importance: { feature: string; importance: number }[] = [];
    for (const [word, idx] of this._vocabulary) {
      let sum = 0;
      for (const cls of model.classes) {
        sum += this._hash(word + cls) % 100;
      }
      importance.push({ feature: word, importance: sum / model.classes.length / 100 });
    }
    return importance.sort((a, b) => b.importance - a.importance);
  }

  explain(text: string, model: ClassifierModel): { word: string; contribution: number }[] {
    const result = this.naiveBayes(text, model);
    const targetClass = result.label;
    const words = text.toLowerCase().split(/\s+/);
    const contributions: { word: string; contribution: number }[] = [];
    for (const word of words) {
      const hash = this._hash(word + targetClass);
      contributions.push({ word, contribution: (hash % 100) / 100 });
    }
    return contributions.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
  }

  private _getBestClass(scores: Record<string, number>): { label: string; confidence: number } {
    let bestLabel = '';
    let bestScore = 0;
    for (const [label, score] of Object.entries(scores)) {
      if (score > bestScore) {
        bestScore = score;
        bestLabel = label;
      }
    }
    return { label: bestLabel, confidence: bestScore };
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

  toPacket(): DataPacket<Classification> {
    const result = this._lastResult || { label: '', confidence: 0, scores: {} };
    this._counter++;
    return {
      id: `classifier-${Date.now()}-${this._counter}`,
      payload: result,
      metadata: {
        createdAt: Date.now(),
        route: ['nlp', 'classifier'],
        priority: 1,
        phase: 'classification'
      }
    };
  }

  reset(): void {
    this._classifications = [];
    this._classes = ['positive', 'negative', 'neutral'];
    this._counter = 0;
    this._modelType = 'default';
    this._confusionMatrix = [];
    this._lastResult = null;
    this._vocabulary.clear();
    this._classPriors.clear();
    this._featureLogProbs.clear();
    this._trained = false;
    this._classWeights.clear();
  }
}
