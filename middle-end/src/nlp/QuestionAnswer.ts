import { DataPacket } from '../shared/types';

export interface QA {
  question: string;
  answer: string;
  context: string;
  confidence: number;
}

export interface QAResult {
  answers: QA[];
  evidence: string[];
  sources: string[];
}

export class QuestionAnswer {
  private _qaResults: QA[] = [];
  private _evidence: string[] = [];
  private _sources: string[] = [];
  private _counter: number = 0;
  private _modelType: string = 'default';
  private _lastResult: QAResult | null = null;

  get qaResults(): QA[] {
    return this._qaResults;
  }

  get evidence(): string[] {
    return this._evidence;
  }

  get sources(): string[] {
    return this._sources;
  }

  get modelType(): string {
    return this._modelType;
  }

  extractiveQA(question: string, context: string, model: { name: string }): QA {
    const sentences = context.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
    const questionWords = new Set(question.toLowerCase().split(/\s+/).filter(w => w.length > 2));
    let bestSentence = '';
    let bestScore = 0;
    for (const sent of sentences) {
      const sentWords = new Set(sent.toLowerCase().split(/\s+/).filter(w => w.length > 2));
      let overlap = 0;
      for (const qw of questionWords) {
        for (const sw of sentWords) {
          if (sw.includes(qw) || qw.includes(sw)) {
            overlap++;
            break;
          }
        }
      }
      const score = overlap / Math.max(questionWords.size, 1);
      if (score > bestScore) {
        bestScore = score;
        bestSentence = sent;
      }
    }
    const answer = this._extractAnswer(question, bestSentence);
    const qa: QA = {
      question,
      answer,
      context,
      confidence: bestScore
    };
    this._qaResults.push(qa);
    this._evidence = [bestSentence];
    this._modelType = 'extractive';
    return qa;
  }

  generativeQA(question: string, context: string, model: { name: string }): QA {
    const seed = this._hash(question + context + model.name);
    let s = seed;
    const words = ['the', 'answer', 'is', 'based', 'on', 'context', 'information', 'provided', 'that', 'with', 'which', 'this', 'these', 'those', 'from', 'by', 'as', 'for', 'to', 'in'];
    let answer = '';
    const answerLen = 8 + (s % 12);
    for (let i = 0; i < answerLen; i++) {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      answer += (answer ? ' ' : '') + words[s % words.length];
    }
    const confidence = 0.6 + (seed % 30) / 100;
    const qa: QA = {
      question,
      answer,
      context,
      confidence
    };
    this._qaResults.push(qa);
    this._modelType = 'generative';
    return qa;
  }

  openDomainQA(question: string, corpus: string[], model: { name: string }): QA {
    let bestContext = '';
    let bestScore = 0;
    const questionWords = new Set(question.toLowerCase().split(/\s+/).filter(w => w.length > 2));
    for (const doc of corpus) {
      const docWords = new Set(doc.toLowerCase().split(/\s+/).filter(w => w.length > 2));
      let overlap = 0;
      for (const qw of questionWords) {
        if (docWords.has(qw)) overlap++;
      }
      const score = overlap / Math.max(questionWords.size, 1);
      if (score > bestScore) {
        bestScore = score;
        bestContext = doc;
      }
    }
    const qa = this.extractiveQA(question, bestContext, model);
    this._sources = corpus.filter(d => {
      const dw = new Set(d.toLowerCase().split(/\s+/));
      let o = 0;
      for (const qw of questionWords) if (dw.has(qw)) o++;
      return o > 0;
    });
    return qa;
  }

  factoidQA(question: string, knowledge: Map<string, string>): QA {
    const questionLower = question.toLowerCase();
    let answer = '';
    let confidence = 0;
    for (const [key, value] of knowledge) {
      if (questionLower.includes(key.toLowerCase())) {
        answer = value;
        confidence = 0.9;
        break;
      }
    }
    if (!answer) {
      const keys = Array.from(knowledge.keys());
      const seed = this._hash(question);
      answer = knowledge.get(keys[seed % keys.length]) || 'Unknown';
      confidence = 0.3;
    }
    const qa: QA = {
      question,
      answer,
      context: '',
      confidence
    };
    this._qaResults.push(qa);
    this._modelType = 'factoid';
    return qa;
  }

  yesNoQA(question: string, context: string): QA {
    const questionLower = question.toLowerCase();
    const contextLower = context.toLowerCase();
    const positiveWords = ['yes', 'true', 'correct', 'right', 'affirmative', 'positive', 'is', 'are', 'was', 'were', 'has', 'have', 'can', 'will', 'should'];
    const negativeWords = ['no', 'false', 'incorrect', 'wrong', 'negative', 'not', "n't", 'never', 'neither', 'nor', 'cannot', "won't", "wouldn't"];
    let posScore = 0;
    let negScore = 0;
    for (const word of positiveWords) {
      if (contextLower.includes(word)) posScore++;
    }
    for (const word of negativeWords) {
      if (contextLower.includes(word)) negScore++;
    }
    const answer = posScore >= negScore ? 'Yes' : 'No';
    const total = posScore + negScore || 1;
    const confidence = Math.max(posScore, negScore) / total;
    const qa: QA = {
      question,
      answer,
      context,
      confidence
    };
    this._qaResults.push(qa);
    this._modelType = 'yes-no';
    return qa;
  }

  multipleChoice(question: string, options: string[], context: string): QA {
    const contextLower = context.toLowerCase();
    const scores = options.map(opt => {
      const optLower = opt.toLowerCase();
      const optWords = optLower.split(/\s+/).filter(w => w.length > 2);
      let score = 0;
      for (const word of optWords) {
        if (contextLower.includes(word)) score++;
      }
      return score / Math.max(optWords.length, 1);
    });
    const bestIdx = scores.indexOf(Math.max(...scores));
    const qa: QA = {
      question,
      answer: options[bestIdx],
      context,
      confidence: scores[bestIdx]
    };
    this._qaResults.push(qa);
    this._modelType = 'multiple-choice';
    return qa;
  }

  entityQA(question: string, entities: { text: string; type: string }[]): QA {
    const questionLower = question.toLowerCase();
    const typeMap: Record<string, string[]> = {
      who: ['PERSON', 'ORG'],
      whom: ['PERSON'],
      whose: ['PERSON'],
      where: ['GPE', 'LOCATION'],
      when: ['DATE', 'TIME'],
      what: ['PRODUCT', 'EVENT', 'WORK_OF_ART'],
      how_many: ['QUANTITY', 'CARDINAL'],
      how_much: ['MONEY', 'PERCENT']
    };
    let targetTypes: string[] = [];
    for (const [qWord, types] of Object.entries(typeMap)) {
      if (questionLower.includes(qWord.replace('_', ' '))) {
        targetTypes = types;
        break;
      }
    }
    let answer = '';
    let confidence = 0;
    if (targetTypes.length > 0) {
      const filtered = entities.filter(e => targetTypes.includes(e.type));
      if (filtered.length > 0) {
        answer = filtered[0].text;
        confidence = 0.8;
      }
    }
    if (!answer && entities.length > 0) {
      answer = entities[0].text;
      confidence = 0.5;
    }
    const qa: QA = {
      question,
      answer: answer || 'Unknown',
      context: '',
      confidence
    };
    this._qaResults.push(qa);
    this._modelType = 'entity-qa';
    return qa;
  }

  relationQA(question: string, relations: { from: string; to: string; type: string }[]): QA {
    const questionLower = question.toLowerCase();
    let answer = '';
    let confidence = 0;
    for (const rel of relations) {
      if (questionLower.includes(rel.from.toLowerCase()) || questionLower.includes(rel.to.toLowerCase())) {
        if (questionLower.includes(rel.type.toLowerCase())) {
          answer = questionLower.includes(rel.from.toLowerCase()) ? rel.to : rel.from;
          confidence = 0.85;
          break;
        }
      }
    }
    if (!answer && relations.length > 0) {
      answer = relations[0].to;
      confidence = 0.4;
    }
    const qa: QA = {
      question,
      answer: answer || 'Unknown',
      context: '',
      confidence
    };
    this._qaResults.push(qa);
    this._modelType = 'relation-qa';
    return qa;
  }

  informationRetrievalQA(question: string, docs: string[]): QA {
    return this.openDomainQA(question, docs, { name: 'ir-qa' });
  }

  answerVerification(question: string, answer: string, evidence: string): QA {
    const answerLower = answer.toLowerCase();
    const evidenceLower = evidence.toLowerCase();
    const answerWords = answerLower.split(/\s+/).filter(w => w.length > 2);
    let matchCount = 0;
    for (const word of answerWords) {
      if (evidenceLower.includes(word)) matchCount++;
    }
    const confidence = answerWords.length > 0 ? matchCount / answerWords.length : 0;
    const qa: QA = {
      question,
      answer: confidence > 0.5 ? answer : 'Unverified',
      context: evidence,
      confidence
    };
    this._qaResults.push(qa);
    this._modelType = 'verification';
    return qa;
  }

  questionGeneration(context: string, n: number = 5): string[] {
    const sentences = context.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
    const questions: string[] = [];
    const templates = [
      'What is {topic}?',
      'How does {topic} work?',
      'Why is {topic} important?',
      'When does {topic} happen?',
      'Where is {topic} located?'
    ];
    for (let i = 0; i < Math.min(n, sentences.length); i++) {
      const sent = sentences[i];
      const words = sent.split(/\s+/).filter(w => w.length > 4);
      if (words.length > 0) {
        const topic = words[0].replace(/[.,!?;:'"]$/, '');
        const template = templates[i % templates.length];
        questions.push(template.replace('{topic}', topic));
      }
    }
    return questions;
  }

  answerExtraction(context: string, answerType: string): string[] {
    const sentences = context.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
    const answers: string[] = [];
    for (const sent of sentences) {
      if (answerType === 'date') {
        const matches = sent.match(/\b\d{4}-\d{2}-\d{2}\b|\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/gi);
        if (matches) answers.push(...matches);
      } else if (answerType === 'person') {
        const matches = sent.match(/\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/g);
        if (matches) answers.push(...matches);
      } else if (answerType === 'number') {
        const matches = sent.match(/\b\d+(\.\d+)?\b/g);
        if (matches) answers.push(...matches);
      } else {
        answers.push(sent);
      }
    }
    return answers;
  }

  private _extractAnswer(question: string, sentence: string): string {
    const questionLower = question.toLowerCase();
    const sentLower = sentence.toLowerCase();
    if (questionLower.startsWith('who')) {
      const match = sentence.match(/\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/);
      if (match) return match[0];
    }
    if (questionLower.startsWith('where')) {
      const match = sentence.match(/\bin\s+([A-Z][a-z]+(\s+[A-Z][a-z]+)*)/);
      if (match) return match[1];
    }
    if (questionLower.startsWith('when')) {
      const match = sentence.match(/\bon\s+(\w+\s+\d{1,2},?\s+\d{4})|\b\d{4}-\d{2}-\d{2}\b/);
      if (match) return match[1] || match[0];
    }
    if (questionLower.startsWith('how many') || questionLower.startsWith('how much')) {
      const match = sentence.match(/\b\d+(\.\d+)?/);
      if (match) return match[0];
    }
    const words = sentence.split(/\s+/);
    if (words.length > 5) {
      return words.slice(0, 10).join(' ');
    }
    return sentence;
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

  toPacket(): DataPacket<QAResult> {
    const result: QAResult = {
      answers: this._qaResults,
      evidence: this._evidence,
      sources: this._sources
    };
    this._lastResult = result;
    this._counter++;
    return {
      id: `qa-${Date.now()}-${this._counter}`,
      payload: result,
      metadata: {
        createdAt: Date.now(),
        route: ['nlp', 'qa'],
        priority: 1,
        phase: 'question-answering'
      }
    };
  }

  reset(): void {
    this._qaResults = [];
    this._evidence = [];
    this._sources = [];
    this._counter = 0;
    this._modelType = 'default';
    this._lastResult = null;
  }
}
