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

export class TextClassifier {
  private _classifications: Classification[] = [];
  private _classes: string[] = [];
  private _counter: number = 0;
  private _modelType: string = 'default';
  private _confusionMatrix: number[][] = [];
  private _lastResult: Classification | null = null;

  constructor() {
    this._classes = ['positive', 'negative', 'neutral'];
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

  naiveBayes(text: string, model: ClassifierModel): Classification {
    const words = text.toLowerCase().split(/\s+/);
    const scores: Record<string, number> = {};
    for (const cls of model.classes) {
      let logProb = 0;
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

  logisticRegression(text: string, model: ClassifierModel): Classification {
    const words = text.toLowerCase().split(/\s+/);
    const scores: Record<string, number> = {};
    for (const cls of model.classes) {
      let z = 0;
      for (let i = 0; i < words.length; i++) {
        const weight = this._hash(words[i] + cls) % 100 / 100 - 0.5;
        z += weight;
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

  sentimentAnalysis(text: string, model: ClassifierModel): Classification {
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'happy', 'joy', 'best'];
    const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'worst', 'hate', 'sad', 'angry', 'poor', 'disappointing'];
    const words = text.toLowerCase().split(/\s+/);
    let posCount = 0;
    let negCount = 0;
    for (const word of words) {
      if (positiveWords.includes(word)) posCount++;
      if (negativeWords.includes(word)) negCount++;
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
    const spamKeywords = ['free', 'win', 'winner', 'money', 'cash', 'prize', 'urgent', 'now', 'click', 'buy', 'discount', 'offer'];
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
    const finalScore = Math.min(1, spamRatio * 2 + hasCaps * 0.1 + hasNumbers * 0.1);
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
  }
}
