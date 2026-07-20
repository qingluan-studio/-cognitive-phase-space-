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

export interface AnswerCandidate {
  text: string;
  score: number;
  start: number;
  end: number;
  source: string;
  rationale?: string;
}

export interface DialogueTurn {
  role: 'user' | 'system' | 'assistant';
  content: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface RetrievedDocument {
  id: string;
  content: string;
  score: number;
  highlights: number[];
}

export interface QAStat {
  totalQuestions: number;
  byType: Record<string, number>;
  avgConfidence: number;
  avgResponseTime: number;
  successRate: number;
}

export type QuestionType =
  | 'factoid'
  | 'yes-no'
  | 'multiple-choice'
  | 'definition'
  | 'causal'
  | 'procedural'
  | 'comparison'
  | 'temporal'
  | 'quantitative'
  | 'entity'
  | 'relational'
  | 'opinion'
  | 'open-ended';

export type QAMethod =
  | 'extractive'
  | 'generative'
  | 'rag'
  | 'bert'
  | 'cot'
  | 'multihop'
  | 'rule'
  | 'semantic';

export interface FactCheckResult {
  claim: string;
  verdict: 'true' | 'false' | 'mixed' | 'unverified';
  evidence: string[];
  confidence: number;
  sources: string[];
}

export interface ExplanationStep {
  step: number;
  description: string;
  evidence: string;
  inference: string;
}

export interface QADocument {
  id: string;
  title: string;
  content: string;
  embedding: number[];
  metadata: Record<string, unknown>;
}

export interface BM25Stats {
  avgDocLength: number;
  docCount: number;
  termFreqs: Map<string, Map<string, number>>;
  docFreq: Map<string, number>;
}

export class QuestionAnswer {
  private _qaResults: QA[] = [];
  private _evidence: string[] = [];
  private _sources: string[] = [];
  private _counter: number = 0;
  private _modelType: string = 'default';
  private _lastResult: QAResult | null = null;
  private _dialogueHistory: DialogueTurn[] = [];
  private _documentStore: QADocument[] = [];
  private _bm25Stats: BM25Stats | null = null;
  private _stopwords: Set<string> = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be',
    'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
    'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this',
    'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
    'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as',
    'what', 'who', 'when', 'where', 'why', 'how', 'which', 'whose', 'whom',
    'does', 'do', 'did', 'is', 'are', 'was', 'were', 'can', 'could',
    'would', 'should', 'will', 'shall', 'may', 'might', 'must'
  ]);
  private _synonyms: Map<string, string[]> = new Map([
    ['big', ['large', 'huge', 'great', 'massive']],
    ['small', ['little', 'tiny', 'minor', 'compact']],
    ['fast', ['quick', 'rapid', 'swift', 'speedy']],
    ['slow', ['sluggish', 'gradual', 'leisurely']],
    ['good', ['great', 'excellent', 'fine', 'positive']],
    ['bad', ['poor', 'terrible', 'awful', 'negative']],
    ['happy', ['glad', 'joyful', 'pleased', 'cheerful']],
    ['sad', ['unhappy', 'sorrowful', 'depressed', 'gloomy']],
    ['important', ['significant', 'crucial', 'vital', 'essential']],
    ['make', ['create', 'produce', 'build', 'construct']],
    ['show', ['display', 'reveal', 'demonstrate', 'present']],
    ['use', ['utilize', 'employ', 'apply', 'leverage']],
    ['begin', ['start', 'commence', 'initiate', 'launch']],
    ['end', ['finish', 'conclude', 'complete', 'terminate']]
  ]);
  private _method: QAMethod = 'extractive';
  private _maxHistoryTurns: number = 10;
  private _k1: number = 1.5;
  private _b: number = 0.75;
  private _topKDocuments: number = 5;
  private _minScoreThreshold: number = 0.1;
  private _responseTimes: number[] = [];
  private _byTypeCount: Record<string, number> = {};
  private _successCount: number = 0;
  private _totalConfidence: number = 0;

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

  get dialogueHistory(): DialogueTurn[] {
    return this._dialogueHistory;
  }

  get documentStore(): QADocument[] {
    return this._documentStore;
  }

  get method(): QAMethod {
    return this._method;
  }

  set method(method: QAMethod) {
    this._method = method;
  }

  get stopwords(): Set<string> {
    return this._stopwords;
  }

  get synonyms(): Map<string, string[]> {
    return this._synonyms;
  }

  set topKDocuments(value: number) {
    this._topKDocuments = Math.max(1, value);
  }

  set minScoreThreshold(value: number) {
    this._minScoreThreshold = Math.min(1, Math.max(0, value));
  }

  set bm25Params(params: { k1?: number; b?: number }) {
    if (params.k1 !== undefined) this._k1 = Math.max(0, params.k1);
    if (params.b !== undefined) this._b = Math.min(1, Math.max(0, params.b));
  }

  /**
   * Extractive QA - locate the most relevant sentence and extract an answer span
   */
  extractiveQA(question: string, context: string, model: { name: string }): QA {
    const startTime = Date.now();
    const sentences = this._splitSentences(context);
    const questionWords = this._tokenize(question.toLowerCase()).filter(w => w.length > 2);
    let bestSentence = '';
    let bestScore = 0;
    for (const sent of sentences) {
      const sentWords = new Set(this._tokenize(sent.toLowerCase()).filter(w => w.length > 2));
      let overlap = 0;
      for (const qw of questionWords) {
        for (const sw of sentWords) {
          if (sw.includes(qw) || qw.includes(sw) || this._isSynonym(qw, sw)) {
            overlap++;
            break;
          }
        }
      }
      const score = overlap / Math.max(questionWords.length, 1);
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
    this._recordQA(qa, 'extractive', startTime);
    this._evidence = [bestSentence];
    this._modelType = 'extractive';
    return qa;
  }

  /**
   * Generative QA - synthesize an answer based on context (simulated)
   */
  generativeQA(question: string, context: string, model: { name: string }): QA {
    const startTime = Date.now();
    const seed = this._hash(question + context + model.name);
    let s = seed;
    const questionWords = this._tokenize(question.toLowerCase()).filter(w => w.length > 2);
    const contextWords = this._tokenize(context.toLowerCase()).filter(w => w.length > 2 && !this._stopwords.has(w));
    const vocab = Array.from(new Set([...questionWords, ...contextWords])).slice(0, 50);
    const templateWords = ['the', 'answer', 'is', 'based', 'on', 'context', 'information', 'provided', 'that', 'with', 'which', 'this', 'these', 'those', 'from', 'by', 'as', 'for', 'to', 'in'];
    const fullVocab = vocab.length > 5 ? vocab : [...vocab, ...templateWords];
    let answer = '';
    const answerLen = 8 + (s % 12);
    for (let i = 0; i < answerLen; i++) {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      answer += (answer ? ' ' : '') + fullVocab[s % fullVocab.length];
    }
    const confidence = 0.6 + (seed % 30) / 100;
    const qa: QA = {
      question,
      answer,
      context,
      confidence
    };
    this._recordQA(qa, 'generative', startTime);
    this._modelType = 'generative';
    return qa;
  }

  /**
   * BERT-style extractive QA - simulates start/end logits and finds best span
   */
  bertQA(question: string, context: string, model: { name: string }): QA {
    const startTime = Date.now();
    const tokens = this._tokenizeWithPositions(context);
    const qTokens = this._tokenize(question.toLowerCase());
    const qTokenSet = new Set(qTokens);
    const startLogits: number[] = [];
    const endLogits: number[] = [];
    const seed = this._hash(question + context + model.name);
    let s = seed;
    for (let i = 0; i < tokens.length; i++) {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      const overlap = qTokenSet.has(tokens[i].text.toLowerCase()) ? 1.5 : 0;
      const positionFactor = i < 5 ? 0.5 : 0;
      startLogits.push(overlap + positionFactor + (s % 100) / 100 - 0.5);
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      endLogits.push(overlap + (s % 100) / 100 - 0.5);
    }
    let bestScore = -Infinity;
    let bestStart = 0;
    let bestEnd = 0;
    const maxLen = 15;
    for (let i = 0; i < tokens.length; i++) {
      for (let j = i; j < Math.min(i + maxLen, tokens.length); j++) {
        const score = startLogits[i] + endLogits[j];
        if (score > bestScore) {
          bestScore = score;
          bestStart = i;
          bestEnd = j;
        }
      }
    }
    const answerTokens = tokens.slice(bestStart, bestEnd + 1);
    const answer = answerTokens.map(t => t.text).join(' ');
    const confidence = 1 / (1 + Math.exp(-bestScore));
    const qa: QA = {
      question,
      answer,
      context,
      confidence
    };
    this._recordQA(qa, 'bert', startTime);
    this._modelType = 'bert';
    return qa;
  }

  /**
   * Retrieval-Augmented Generation (RAG) - retrieve relevant docs, then generate answer
   */
  ragQA(question: string, model: { name: string }): QA {
    const startTime = Date.now();
    const retrieved = this._retrieveDocuments(question, this._topKDocuments);
    const contexts = retrieved.map(r => r.content);
    const combinedContext = contexts.join('\n\n');
    const baseQA = this.extractiveQA(question, combinedContext, model);
    const evidence = retrieved.slice(0, 3).map(r => r.content);
    const sources = retrieved.map(r => r.id);
    const confidence = Math.min(1, baseQA.confidence + retrieved.length * 0.05);
    const qa: QA = {
      question,
      answer: baseQA.answer,
      context: combinedContext,
      confidence
    };
    this._recordQA(qa, 'rag', startTime);
    this._evidence = evidence;
    this._sources = sources;
    this._modelType = 'rag';
    return qa;
  }

  /**
   * Chain-of-thought QA - decompose the question and reason step-by-step
   */
  chainOfThoughtQA(question: string, context: string, model: { name: string }): QA {
    const startTime = Date.now();
    const steps = this._decomposeQuestion(question);
    const explanations: ExplanationStep[] = [];
    let accumulatedAnswer = '';
    for (let i = 0; i < steps.length; i++) {
      const subQuestion = steps[i];
      const subAnswer = this._extractAnswer(subQuestion, context);
      const evidence = this._findBestEvidence(subQuestion, context);
      explanations.push({
        step: i + 1,
        description: subQuestion,
        evidence,
        inference: subAnswer
      });
      accumulatedAnswer += (i > 0 ? ' ' : '') + subAnswer;
    }
    const confidence = Math.min(0.95, 0.5 + steps.length * 0.1);
    const qa: QA = {
      question,
      answer: accumulatedAnswer,
      context,
      confidence
    };
    this._recordQA(qa, 'cot', startTime);
    this._modelType = 'cot';
    this._evidence = explanations.map(e => `${e.step}. ${e.description} => ${e.inference} (evidence: ${e.evidence})`);
    return qa;
  }

  /**
   * Multi-hop QA - traverse a knowledge graph to answer complex questions
   */
  multiHopQA(question: string, knowledgeGraph: { nodes: { id: string; label: string; type: string }[]; edges: { from: string; to: string; relation: string }[] }, model: { name: string }): QA {
    const startTime = Date.now();
    const questionLower = question.toLowerCase();
    const mentionedEntities = knowledgeGraph.nodes.filter(n =>
      questionLower.includes(n.label.toLowerCase()) || questionLower.includes(n.id.toLowerCase())
    );
    let answer = 'Unknown';
    let confidence = 0.3;
    if (mentionedEntities.length > 0) {
      const startNode = mentionedEntities[0];
      const visited = new Set<string>([startNode.id]);
      const path: string[] = [startNode.label];
      let currentId = startNode.id;
      for (let hop = 0; hop < 3; hop++) {
        const nextEdge = knowledgeGraph.edges.find(e =>
          e.from === currentId && !visited.has(e.to)
        );
        if (!nextEdge) break;
        const nextNode = knowledgeGraph.nodes.find(n => n.id === nextEdge.to);
        if (!nextNode) break;
        path.push(`${nextEdge.relation} -> ${nextNode.label}`);
        visited.add(nextNode.id);
        currentId = nextNode.id;
      }
      answer = path.join(' ; ');
      confidence = 0.6 + (path.length - 1) * 0.1;
    }
    const qa: QA = {
      question,
      answer,
      context: '',
      confidence
    };
    this._recordQA(qa, 'multihop', startTime);
    this._modelType = 'multihop';
    return qa;
  }

  /**
   * Open-domain QA - search a corpus and answer
   */
  openDomainQA(question: string, corpus: string[], model: { name: string }): QA {
    const startTime = Date.now();
    let bestContext = '';
    let bestScore = 0;
    const questionWords = new Set(this._tokenize(question.toLowerCase()).filter(w => w.length > 2));
    for (const doc of corpus) {
      const docWords = new Set(this._tokenize(doc.toLowerCase()).filter(w => w.length > 2));
      let overlap = 0;
      for (const qw of questionWords) {
        if (docWords.has(qw) || this._hasSynonymInSet(qw, docWords)) overlap++;
      }
      const score = overlap / Math.max(questionWords.size, 1);
      if (score > bestScore) {
        bestScore = score;
        bestContext = doc;
      }
    }
    const qa = this.extractiveQA(question, bestContext, model);
    this._sources = corpus.filter(d => {
      const dw = new Set(this._tokenize(d.toLowerCase()));
      let o = 0;
      for (const qw of questionWords) if (dw.has(qw)) o++;
      return o > 0;
    });
    this._recordQA(qa, 'open-domain', startTime);
    this._modelType = 'open-domain';
    return qa;
  }

  /**
   * Factoid QA - lookup a knowledge map for direct factual answers
   */
  factoidQA(question: string, knowledge: Map<string, string>): QA {
    const startTime = Date.now();
    const questionLower = question.toLowerCase();
    let answer = '';
    let confidence = 0;
    let bestKey = '';
    for (const [key, value] of knowledge) {
      const keyLower = key.toLowerCase();
      if (questionLower.includes(keyLower) || keyLower.includes(questionLower.substring(0, Math.min(20, questionLower.length)))) {
        answer = value;
        confidence = 0.9;
        bestKey = key;
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
      context: bestKey,
      confidence
    };
    this._recordQA(qa, 'factoid', startTime);
    this._modelType = 'factoid';
    return qa;
  }

  /**
   * Yes/No QA - determine truth value from context
   */
  yesNoQA(question: string, context: string): QA {
    const startTime = Date.now();
    const questionLower = question.toLowerCase();
    const contextLower = context.toLowerCase();
    const positiveWords = ['yes', 'true', 'correct', 'right', 'affirmative', 'positive', 'is', 'are', 'was', 'were', 'has', 'have', 'can', 'will', 'should', 'do', 'does', 'did'];
    const negativeWords = ['no', 'false', 'incorrect', 'wrong', 'negative', 'not', "n't", 'never', 'neither', 'nor', 'cannot', "won't", "wouldn't", "don't", "doesn't", "didn't", "isn't", "aren't", "wasn't", "weren't", "hasn't", "haven't"];
    let posScore = 0;
    let negScore = 0;
    for (const word of positiveWords) {
      if (contextLower.includes(word)) posScore++;
    }
    for (const word of negativeWords) {
      if (contextLower.includes(word)) negScore++;
    }
    if (questionLower.includes('not') || questionLower.includes("n't")) {
      const temp = posScore;
      posScore = negScore;
      negScore = temp;
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
    this._recordQA(qa, 'yes-no', startTime);
    this._modelType = 'yes-no';
    return qa;
  }

  /**
   * Multiple-choice QA - select the best option based on context
   */
  multipleChoice(question: string, options: string[], context: string): QA {
    const startTime = Date.now();
    const contextLower = context.toLowerCase();
    const questionWords = this._tokenize(question.toLowerCase()).filter(w => w.length > 2);
    const scores = options.map(opt => {
      const optLower = opt.toLowerCase();
      const optWords = optLower.split(/\s+/).filter(w => w.length > 2);
      let score = 0;
      for (const word of optWords) {
        if (contextLower.includes(word)) score += 2;
        if (questionWords.includes(word)) score += 0.5;
      }
      const optLen = Math.max(optWords.length, 1);
      const overlap = optWords.filter(w => contextLower.includes(w)).length / optLen;
      return (score + overlap) / 3;
    });
    const bestIdx = scores.indexOf(Math.max(...scores));
    const qa: QA = {
      question,
      answer: options[bestIdx],
      context,
      confidence: Math.min(1, scores[bestIdx])
    };
    this._recordQA(qa, 'multiple-choice', startTime);
    this._modelType = 'multiple-choice';
    return qa;
  }

  /**
   * Entity QA - find an entity of an appropriate type
   */
  entityQA(question: string, entities: { text: string; type: string }[]): QA {
    const startTime = Date.now();
    const questionLower = question.toLowerCase();
    const typeMap: Record<string, string[]> = {
      who: ['PERSON', 'ORG'],
      whom: ['PERSON'],
      whose: ['PERSON'],
      where: ['GPE', 'LOCATION'],
      when: ['DATE', 'TIME'],
      what: ['PRODUCT', 'EVENT', 'WORK_OF_ART', 'LANGUAGE'],
      how_many: ['QUANTITY', 'CARDINAL'],
      how_much: ['MONEY', 'PERCENT', 'QUANTITY'],
      which_company: ['ORG'],
      which_person: ['PERSON']
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
    this._recordQA(qa, 'entity-qa', startTime);
    this._modelType = 'entity-qa';
    return qa;
  }

  /**
   * Relation QA - answer questions about relations between entities
   */
  relationQA(question: string, relations: { from: string; to: string; type: string }[]): QA {
    const startTime = Date.now();
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
    this._recordQA(qa, 'relation-qa', startTime);
    this._modelType = 'relation-qa';
    return qa;
  }

  /**
   * Information retrieval QA - find docs and answer
   */
  informationRetrievalQA(question: string, docs: string[]): QA {
    return this.openDomainQA(question, docs, { name: 'ir-qa' });
  }

  /**
   * Semantic QA - use embedding similarity to find the best answer
   */
  semanticQA(question: string, docs: string[], model: { name: string }): QA {
    const startTime = Date.now();
    const qEmbedding = this._embedText(question);
    let bestDoc = '';
    let bestSim = -1;
    for (const doc of docs) {
      const dEmbedding = this._embedText(doc);
      const sim = this._cosineSimilarity(qEmbedding, dEmbedding);
      if (sim > bestSim) {
        bestSim = sim;
        bestDoc = doc;
      }
    }
    const qa = this.extractiveQA(question, bestDoc, model);
    qa.confidence = Math.max(qa.confidence, bestSim);
    this._recordQA(qa, 'semantic', startTime);
    this._modelType = 'semantic';
    return qa;
  }

  /**
   * Answer verification - check if an answer is supported by evidence
   */
  answerVerification(question: string, answer: string, evidence: string): QA {
    const startTime = Date.now();
    const answerLower = answer.toLowerCase();
    const evidenceLower = evidence.toLowerCase();
    const answerWords = this._tokenize(answerLower).filter(w => w.length > 2);
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
    this._recordQA(qa, 'verification', startTime);
    this._modelType = 'verification';
    return qa;
  }

  /**
   * Question generation - generate questions from context
   */
  questionGeneration(context: string, n: number = 5): string[] {
    const sentences = this._splitSentences(context);
    const questions: string[] = [];
    const templates = [
      'What is {topic}?',
      'How does {topic} work?',
      'Why is {topic} important?',
      'When does {topic} happen?',
      'Where is {topic} located?',
      'Who is involved in {topic}?',
      'What are the main features of {topic}?',
      'How is {topic} used?',
      'What are the benefits of {topic}?',
      'What are the challenges of {topic}?'
    ];
    for (let i = 0; i < Math.min(n, sentences.length); i++) {
      const sent = sentences[i];
      const words = this._tokenize(sent).filter(w => w.length > 4);
      if (words.length > 0) {
        const topic = words[0].replace(/[.,!?;:'"]$/, '');
        const template = templates[i % templates.length];
        questions.push(template.replace('{topic}', topic));
      }
    }
    return questions;
  }

  /**
   * Answer extraction - extract answers of a specific type from context
   */
  answerExtraction(context: string, answerType: string): string[] {
    const sentences = this._splitSentences(context);
    const answers: string[] = [];
    for (const sent of sentences) {
      if (answerType === 'date') {
        const matches = sent.match(/\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}\/\d{1,2}\/\d{4}\b|\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b|\b\d{4}\b/gi);
        if (matches) answers.push(...matches);
      } else if (answerType === 'person') {
        const matches = sent.match(/\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/g);
        if (matches) answers.push(...matches);
      } else if (answerType === 'organization') {
        const matches = sent.match(/\b[A-Z][a-zA-Z]+\s+(Inc|Corp|LLC|Ltd|Company|Corporation|Group|Foundation|Institute|University)\b/g);
        if (matches) answers.push(...matches);
      } else if (answerType === 'number') {
        const matches = sent.match(/\b\d+(\.\d+)?\b/g);
        if (matches) answers.push(...matches);
      } else if (answerType === 'email') {
        const matches = sent.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g);
        if (matches) answers.push(...matches);
      } else if (answerType === 'url') {
        const matches = sent.match(/\bhttps?:\/\/[^\s]+\b/gi);
        if (matches) answers.push(...matches);
      } else if (answerType === 'phone') {
        const matches = sent.match(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g);
        if (matches) answers.push(...matches);
      } else if (answerType === 'location') {
        const matches = sent.match(/\b(in|at|near|from)\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)/g);
        if (matches) {
          for (const m of matches) {
            const parts = m.split(/\s+/);
            answers.push(parts.slice(1).join(' '));
          }
        }
      } else {
        answers.push(sent);
      }
    }
    return Array.from(new Set(answers));
  }

  /**
   * Question classification - determine the type of a question
   */
  classifyQuestion(question: string): QuestionType {
    const q = question.toLowerCase().trim();
    if (q.startsWith('what is') || q.startsWith('what are') || q.startsWith("what's") || q.includes('define')) {
      return 'definition';
    }
    if (q.startsWith('why')) {
      return 'causal';
    }
    if (q.startsWith('how') && (q.includes('do') || q.includes('to') || q.includes('can'))) {
      return 'procedural';
    }
    if (q.includes('compare') || q.includes('difference between') || q.includes('versus') || q.includes(' vs ')) {
      return 'comparison';
    }
    if (q.startsWith('when')) {
      return 'temporal';
    }
    if (q.startsWith('how many') || q.startsWith('how much') || q.includes('how long') || q.includes('how old')) {
      return 'quantitative';
    }
    if (q.startsWith('who') || q.startsWith('whose') || q.startsWith('whom')) {
      return 'entity';
    }
    if (q.includes('relation') || q.includes('related to') || q.includes('connection')) {
      return 'relational';
    }
    if (q.startsWith('is ') || q.startsWith('are ') || q.startsWith('was ') || q.startsWith('were ') || q.startsWith('do ') || q.startsWith('does ') || q.startsWith('did ') || q.startsWith('can ') || q.startsWith('could ') || q.startsWith('will ') || q.startsWith('would ') || q.startsWith('should ')) {
      return 'yes-no';
    }
    if (q.includes('a)') || q.includes('b)') || q.includes('c)') || q.includes('d)') || q.includes('which of')) {
      return 'multiple-choice';
    }
    if (q.startsWith('where')) {
      return 'entity';
    }
    if (q.includes('opinion') || q.includes('think') || q.includes('feel') || q.includes('believe')) {
      return 'opinion';
    }
    return 'open-ended';
  }

  /**
   * Answer ranking - rank multiple answer candidates
   */
  rankAnswers(question: string, candidates: AnswerCandidate[]): AnswerCandidate[] {
    const qTokens = new Set(this._tokenize(question.toLowerCase()).filter(w => w.length > 2));
    const scored = candidates.map(c => {
      let score = c.score;
      const cTokens = this._tokenize(c.text.toLowerCase()).filter(w => w.length > 2);
      let overlap = 0;
      for (const t of cTokens) {
        if (qTokens.has(t)) overlap++;
      }
      score += overlap * 0.1;
      if (c.text.length > 3 && c.text.length < 200) score += 0.05;
      if (c.source === 'gold') score += 0.2;
      if (c.rationale && c.rationale.length > 20) score += 0.1;
      return { ...c, score: Math.min(1, score) };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored;
  }

  /**
   * Multi-turn dialogue - add a turn and respond using history
   */
  multiTurnDialogue(question: string, context: string, model: { name: string }): QA {
    const startTime = Date.now();
    this._dialogueHistory.push({
      role: 'user',
      content: question,
      timestamp: Date.now()
    });
    if (this._dialogueHistory.length > this._maxHistoryTurns * 2) {
      this._dialogueHistory = this._dialogueHistory.slice(-this._maxHistoryTurns * 2);
    }
    const historyContext = this._dialogueHistory
      .filter(t => t.role === 'user')
      .map(t => t.content)
      .join(' ');
    const resolvedQuestion = this._resolveCoreferences(question, historyContext);
    const baseQA = this.extractiveQA(resolvedQuestion, context, model);
    const dialogueAnswer = this._personalizeAnswer(baseQA.answer, this._dialogueHistory);
    this._dialogueHistory.push({
      role: 'assistant',
      content: dialogueAnswer,
      timestamp: Date.now(),
      metadata: { confidence: baseQA.confidence, model: model.name }
    });
    const qa: QA = {
      question,
      answer: dialogueAnswer,
      context,
      confidence: baseQA.confidence
    };
    this._recordQA(qa, 'dialogue', startTime);
    this._modelType = 'dialogue';
    return qa;
  }

  /**
   * Fact-checking - verify a claim against a knowledge source
   */
  factCheck(claim: string, sources: { id: string; content: string }[]): FactCheckResult {
    const startTime = Date.now();
    const claimLower = claim.toLowerCase();
    const claimTokens = this._tokenize(claimLower).filter(w => w.length > 2 && !this._stopwords.has(w));
    let supportCount = 0;
    let refuteCount = 0;
    const evidence: string[] = [];
    const supportingSources: string[] = [];
    for (const source of sources) {
      const sourceLower = source.content.toLowerCase();
      let overlap = 0;
      for (const token of claimTokens) {
        if (sourceLower.includes(token)) overlap++;
      }
      const ratio = overlap / Math.max(claimTokens.length, 1);
      if (ratio > 0.7) {
        supportCount++;
        evidence.push(source.content.substring(0, 200));
        supportingSources.push(source.id);
      } else if (sourceLower.includes('not') && ratio > 0.4) {
        refuteCount++;
      }
    }
    let verdict: FactCheckResult['verdict'] = 'unverified';
    if (supportCount > 0 && refuteCount === 0) verdict = 'true';
    else if (refuteCount > 0 && supportCount === 0) verdict = 'false';
    else if (supportCount > 0 && refuteCount > 0) verdict = 'mixed';
    const confidence = (supportCount + refuteCount) > 0
      ? Math.abs(supportCount - refuteCount) / (supportCount + refuteCount)
      : 0.2;
    const result: FactCheckResult = {
      claim,
      verdict,
      evidence,
      confidence,
      sources: supportingSources
    };
    const qa: QA = {
      question: `Is this claim true: "${claim}"?`,
      answer: `${verdict} (confidence: ${confidence.toFixed(2)})`,
      context: evidence.join(' '),
      confidence
    };
    this._recordQA(qa, 'fact-check', startTime);
    this._modelType = 'fact-check';
    return result;
  }

  /**
   * Question difficulty assessment - estimate how hard a question is
   */
  assessDifficulty(question: string, context: string): 'easy' | 'medium' | 'hard' {
    const qTokens = this._tokenize(question.toLowerCase()).filter(w => w.length > 2 && !this._stopwords.has(w));
    const cTokens = new Set(this._tokenize(context.toLowerCase()).filter(w => w.length > 2));
    let overlap = 0;
    for (const t of qTokens) {
      if (cTokens.has(t)) overlap++;
    }
    const overlapRatio = overlap / Math.max(qTokens.length, 1);
    const questionLength = question.split(/\s+/).length;
    const qType = this.classifyQuestion(question);
    let difficulty = 0;
    if (overlapRatio > 0.8) difficulty += 1;
    else if (overlapRatio > 0.5) difficulty += 2;
    else difficulty += 3;
    if (questionLength > 15) difficulty++;
    if (qType === 'comparison' || qType === 'causal') difficulty++;
    if (qType === 'open-ended' || qType === 'opinion') difficulty += 2;
    if (qTokens.length < 3) difficulty--;
    if (difficulty <= 2) return 'easy';
    if (difficulty <= 4) return 'medium';
    return 'hard';
  }

  /**
   * Answer explanation - generate step-by-step reasoning
   */
  explainAnswer(question: string, answer: string, context: string): ExplanationStep[] {
    const steps: ExplanationStep[] = [];
    const qType = this.classifyQuestion(question);
    steps.push({
      step: 1,
      description: `Identify question type (${qType})`,
      evidence: question,
      inference: `This is a ${qType} question.`
    });
    const sentences = this._splitSentences(context);
    let bestSentence = '';
    let bestScore = 0;
    const qTokens = new Set(this._tokenize(question.toLowerCase()).filter(w => w.length > 2));
    for (const sent of sentences) {
      const sTokens = new Set(this._tokenize(sent.toLowerCase()).filter(w => w.length > 2));
      let overlap = 0;
      for (const t of qTokens) {
        if (sTokens.has(t)) overlap++;
      }
      const score = overlap / Math.max(qTokens.size, 1);
      if (score > bestScore) {
        bestScore = score;
        bestSentence = sent;
      }
    }
    steps.push({
      step: 2,
      description: 'Find relevant evidence in the context',
      evidence: bestSentence,
      inference: 'This sentence contains the key information needed to answer the question.'
    });
    steps.push({
      step: 3,
      description: 'Extract the answer span',
      evidence: bestSentence,
      inference: answer
    });
    steps.push({
      step: 4,
      description: 'Verify the answer is supported by evidence',
      evidence: bestSentence,
      inference: `The answer "${answer}" is derived from the evidence with confidence proportional to keyword overlap.`
    });
    return steps;
  }

  /**
   * Reading comprehension evaluation - score how well the answer matches gold
   */
  readingComprehensionEval(predicted: string, gold: string): {
    exactMatch: number;
    f1: number;
    partialMatch: number;
  } {
    const predTokens = this._tokenize(predicted.toLowerCase());
    const goldTokens = this._tokenize(gold.toLowerCase());
    const predSet = new Set(predTokens);
    const goldSet = new Set(goldTokens);
    const exactMatch = predicted.trim().toLowerCase() === gold.trim().toLowerCase() ? 1 : 0;
    let intersection = 0;
    for (const t of predSet) {
      if (goldSet.has(t)) intersection++;
    }
    const precision = predSet.size > 0 ? intersection / predSet.size : 0;
    const recall = goldSet.size > 0 ? intersection / goldSet.size : 0;
    const f1 = (precision + recall) > 0 ? 2 * precision * recall / (precision + recall) : 0;
    const partialMatch = intersection / Math.max(goldSet.size, 1);
    return { exactMatch, f1, partialMatch };
  }

  /**
   * Add a document to the knowledge store
   */
  addDocument(doc: QADocument): void {
    this._documentStore.push(doc);
    this._bm25Stats = null;
  }

  /**
   * Add multiple documents
   */
  addDocuments(docs: QADocument[]): void {
    this._documentStore.push(...docs);
    this._bm25Stats = null;
  }

  /**
   * Build BM25 statistics from the document store
   */
  buildBM25Index(): void {
    const stats: BM25Stats = {
      avgDocLength: 0,
      docCount: this._documentStore.length,
      termFreqs: new Map(),
      docFreq: new Map()
    };
    let totalLen = 0;
    for (const doc of this._documentStore) {
      const tokens = this._tokenize(doc.content.toLowerCase());
      totalLen += tokens.length;
      const termFreq = new Map<string, number>();
      const seen = new Set<string>();
      for (const token of tokens) {
        termFreq.set(token, (termFreq.get(token) || 0) + 1);
        seen.add(token);
      }
      stats.termFreqs.set(doc.id, termFreq);
      for (const term of seen) {
        stats.docFreq.set(term, (stats.docFreq.get(term) || 0) + 1);
      }
    }
    stats.avgDocLength = stats.docCount > 0 ? totalLen / stats.docCount : 0;
    this._bm25Stats = stats;
  }

  /**
   * BM25 scoring - retrieve relevant documents using BM25
   */
  bm25Search(query: string, k: number = 5): RetrievedDocument[] {
    if (!this._bm25Stats) {
      this.buildBM25Index();
    }
    if (!this._bm25Stats || this._bm25Stats.docCount === 0) {
      return [];
    }
    const queryTokens = this._tokenize(query.toLowerCase());
    const scores: { doc: QADocument; score: number; highlights: number[] }[] = [];
    for (const doc of this._documentStore) {
      let score = 0;
      const highlights: number[] = [];
      const docTokens = this._tokenize(doc.content.toLowerCase());
      const termFreqs = this._bm25Stats.termFreqs.get(doc.id) || new Map();
      const docLen = docTokens.length;
      for (let i = 0; i < queryTokens.length; i++) {
        const term = queryTokens[i];
        const tf = termFreqs.get(term) || 0;
        const df = this._bm25Stats.docFreq.get(term) || 0;
        if (tf === 0) continue;
        const idf = Math.log(1 + (this._bm25Stats.docCount - df + 0.5) / (df + 0.5));
        const tfNorm = (tf * (this._k1 + 1)) / (tf + this._k1 * (1 - this._b + this._b * docLen / this._bm25Stats.avgDocLength));
        score += idf * tfNorm;
        const idx = docTokens.indexOf(term);
        if (idx >= 0) highlights.push(idx);
      }
      scores.push({ doc, score, highlights });
    }
    scores.sort((a, b) => b.score - a.score);
    return scores.slice(0, k).map(s => ({
      id: s.doc.id,
      content: s.doc.content,
      score: s.score,
      highlights: s.highlights
    }));
  }

  /**
   * Batch QA - process multiple questions
   */
  batchQA(questions: string[], context: string, model: { name: string }): QA[] {
    const results: QA[] = [];
    for (const q of questions) {
      results.push(this.extractiveQA(q, context, model));
    }
    return results;
  }

  /**
   * Question difficulty assessment for a batch
   */
  batchDifficulty(questions: string[], context: string): { question: string; difficulty: string }[] {
    return questions.map(q => ({
      question: q,
      difficulty: this.assessDifficulty(q, context)
    }));
  }

  /**
   * Generate a follow-up question based on previous answer
   */
  generateFollowUp(previousQA: QA): string {
    const templates = [
      `Can you tell me more about ${previousQA.answer}?`,
      `Why is ${previousQA.answer} important?`,
      `How does ${previousQA.answer} work?`,
      `What are the alternatives to ${previousQA.answer}?`,
      `When was ${previousQA.answer} first discovered or used?`,
      `Where can I find more information about ${previousQA.answer}?`
    ];
    const idx = this._hash(previousQA.answer) % templates.length;
    return templates[idx];
  }

  /**
   * Get statistics about QA performance
   */
  statistics(): QAStat {
    const byType: Record<string, number> = { ...this._byTypeCount };
    const total = this._qaResults.length;
    const avgConfidence = total > 0 ? this._totalConfidence / total : 0;
    const avgResponseTime = this._responseTimes.length > 0
      ? this._responseTimes.reduce((a, b) => a + b, 0) / this._responseTimes.length
      : 0;
    const successRate = total > 0 ? this._successCount / total : 0;
    return {
      totalQuestions: total,
      byType,
      avgConfidence,
      avgResponseTime,
      successRate
    };
  }

  /**
   * Serialize state to JSON
   */
  serialize(): string {
    return JSON.stringify({
      qaResults: this._qaResults,
      evidence: this._evidence,
      sources: this._sources,
      counter: this._counter,
      modelType: this._modelType,
      method: this._method,
      dialogueHistory: this._dialogueHistory,
      responseTimes: this._responseTimes,
      byTypeCount: this._byTypeCount,
      successCount: this._successCount,
      totalConfidence: this._totalConfidence
    });
  }

  /**
   * Deserialize state from JSON
   */
  deserialize(json: string): void {
    try {
      const data = JSON.parse(json);
      this._qaResults = data.qaResults || [];
      this._evidence = data.evidence || [];
      this._sources = data.sources || [];
      this._counter = data.counter || 0;
      this._modelType = data.modelType || 'default';
      this._method = data.method || 'extractive';
      this._dialogueHistory = data.dialogueHistory || [];
      this._responseTimes = data.responseTimes || [];
      this._byTypeCount = data.byTypeCount || {};
      this._successCount = data.successCount || 0;
      this._totalConfidence = data.totalConfidence || 0;
    } catch (e) {
      // ignore malformed input
    }
  }

  /**
   * Clear dialogue history
   */
  clearDialogue(): void {
    this._dialogueHistory = [];
  }

  /**
   * Clear document store
   */
  clearDocuments(): void {
    this._documentStore = [];
    this._bm25Stats = null;
  }

  /**
   * Get the last answer
   */
  getLastAnswer(): QA | null {
    return this._qaResults.length > 0 ? this._qaResults[this._qaResults.length - 1] : null;
  }

  /**
   * Internal: retrieve documents from the store
   */
  private _retrieveDocuments(question: string, k: number): RetrievedDocument[] {
    if (this._documentStore.length === 0) {
      return [];
    }
    if (this._bm25Stats) {
      return this.bm25Search(question, k);
    }
    const qTokens = new Set(this._tokenize(question.toLowerCase()).filter(w => w.length > 2 && !this._stopwords.has(w)));
    const scored = this._documentStore.map(doc => {
      const dTokens = new Set(this._tokenize(doc.content.toLowerCase()).filter(w => w.length > 2));
      let overlap = 0;
      for (const t of qTokens) {
        if (dTokens.has(t)) overlap++;
      }
      const score = overlap / Math.max(qTokens.size, 1);
      return { doc, score };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, k).map(s => ({
      id: s.doc.id,
      content: s.doc.content,
      score: s.score,
      highlights: []
    }));
  }

  /**
   * Internal: tokenize text with positions
   */
  private _tokenizeWithPositions(text: string): { text: string; start: number; end: number }[] {
    const tokens: { text: string; start: number; end: number }[] = [];
    const regex = /\b\w+\b/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      tokens.push({
        text: match[0],
        start: match.index,
        end: match.index + match[0].length
      });
    }
    return tokens;
  }

  /**
   * Internal: decompose a complex question into sub-questions
   */
  private _decomposeQuestion(question: string): string[] {
    const qLower = question.toLowerCase();
    const sub: string[] = [];
    if (qLower.includes(' and ')) {
      const parts = question.split(/\s+and\s+/i);
      for (const p of parts) {
        sub.push(p.trim().replace(/[?]$/, ''));
      }
    } else if (qLower.startsWith('why')) {
      sub.push('What is the cause?');
      sub.push('What is the effect?');
      sub.push('How are they connected?');
    } else if (qLower.startsWith('how')) {
      sub.push('What is the starting point?');
      sub.push('What are the intermediate steps?');
      sub.push('What is the final outcome?');
    } else if (qLower.includes('compare')) {
      sub.push('What are the features of the first item?');
      sub.push('What are the features of the second item?');
      sub.push('What are the differences?');
      sub.push('What are the similarities?');
    } else {
      sub.push(question);
    }
    return sub;
  }

  /**
   * Internal: find the best evidence snippet for a question
   */
  private _findBestEvidence(question: string, context: string): string {
    const sentences = this._splitSentences(context);
    const qTokens = new Set(this._tokenize(question.toLowerCase()).filter(w => w.length > 2));
    let best = '';
    let bestScore = 0;
    for (const sent of sentences) {
      const sTokens = new Set(this._tokenize(sent.toLowerCase()).filter(w => w.length > 2));
      let overlap = 0;
      for (const t of qTokens) {
        if (sTokens.has(t)) overlap++;
      }
      const score = overlap / Math.max(qTokens.size, 1);
      if (score > bestScore) {
        bestScore = score;
        best = sent;
      }
    }
    return best;
  }

  /**
   * Internal: resolve coreferences using dialogue history
   */
  private _resolveCoreferences(question: string, history: string): string {
    let resolved = question;
    if (/\b(he|she|it|they|them|him|her)\b/i.test(question)) {
      const lastQuestion = history.split(/\s+/).slice(-20).join(' ');
      const personMatch = lastQuestion.match(/\b([A-Z][a-z]+)\b/);
      if (personMatch) {
        resolved = question.replace(/\b(he|him)\b/gi, personMatch[1])
          .replace(/\b(she|her)\b/gi, personMatch[1])
          .replace(/\b(they|them)\b/gi, personMatch[1]);
      }
    }
    if (/\b(this|that|these|those)\b/i.test(question)) {
      const lastNoun = history.match(/\b([A-Z][a-z]+)\s+([a-z]+)\b/);
      if (lastNoun) {
        resolved = question.replace(/\b(this|that)\b/i, lastNoun[0]);
      }
    }
    return resolved;
  }

  /**
   * Internal: personalize an answer based on dialogue
   */
  private _personalizeAnswer(answer: string, dialogue: DialogueTurn[]): string {
    if (dialogue.length <= 1) return answer;
    const userTurns = dialogue.filter(t => t.role === 'user');
    if (userTurns.length < 2) return answer;
    const isFirstQuestion = userTurns.length === 1;
    if (isFirstQuestion) return answer;
    const followUps = ['Additionally, ', 'Furthermore, ', 'In addition, ', 'Moreover, '];
    const prefix = followUps[this._hash(answer) % followUps.length];
    return prefix + answer.charAt(0).toLowerCase() + answer.slice(1);
  }

  /**
   * Internal: embed a text using hashing trick
   */
  private _embedText(text: string, dim: number = 64): number[] {
    const embedding = new Array(dim).fill(0);
    const tokens = this._tokenize(text.toLowerCase());
    for (const token of tokens) {
      const h = this._hash(token);
      embedding[h % dim] += 1;
      embedding[(h >> 4) % dim] += 0.5;
    }
    const norm = Math.sqrt(embedding.reduce((a, b) => a + b * b, 0)) || 1;
    return embedding.map(v => v / norm);
  }

  /**
   * Internal: cosine similarity
   */
  private _cosineSimilarity(v1: number[], v2: number[]): number {
    let dot = 0;
    let n1 = 0;
    let n2 = 0;
    const minLen = Math.min(v1.length, v2.length);
    for (let i = 0; i < minLen; i++) {
      dot += v1[i] * v2[i];
      n1 += v1[i] * v1[i];
      n2 += v2[i] * v2[i];
    }
    const denom = Math.sqrt(n1) * Math.sqrt(n2);
    return denom === 0 ? 0 : dot / denom;
  }

  /**
   * Internal: check if two words are synonyms
   */
  private _isSynonym(w1: string, w2: string): boolean {
    const syns1 = this._synonyms.get(w1) || [];
    const syns2 = this._synonyms.get(w2) || [];
    return syns1.includes(w2) || syns2.includes(w1);
  }

  /**
   * Internal: check if any synonym of word exists in set
   */
  private _hasSynonymInSet(word: string, wordSet: Set<string>): boolean {
    const syns = this._synonyms.get(word) || [];
    for (const syn of syns) {
      if (wordSet.has(syn)) return true;
    }
    return false;
  }

  /**
   * Internal: split text into sentences
   */
  private _splitSentences(text: string): string[] {
    return text.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
  }

  /**
   * Internal: tokenize text
   */
  private _tokenize(text: string): string[] {
    return text.split(/\s+/).map(w => w.replace(/[.,!?;:'"]/g, '')).filter(w => w.length > 0);
  }

  /**
   * Internal: extract an answer span from a sentence
   */
  private _extractAnswer(question: string, sentence: string): string {
    const questionLower = question.toLowerCase();
    if (questionLower.startsWith('who')) {
      const match = sentence.match(/\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/);
      if (match) return match[0];
    }
    if (questionLower.startsWith('where')) {
      const match = sentence.match(/\bin\s+([A-Z][a-z]+(\s+[A-Z][a-z]+)*)/);
      if (match) return match[1];
    }
    if (questionLower.startsWith('when')) {
      const match = sentence.match(/\bon\s+(\w+\s+\d{1,2},?\s+\d{4})|\b\d{4}-\d{2}-\d{2}\b|\b\d{4}\b/);
      if (match) return match[1] || match[0];
    }
    if (questionLower.startsWith('how many') || questionLower.startsWith('how much')) {
      const match = sentence.match(/\b\d+(\.\d+)?/);
      if (match) return match[0];
    }
    if (questionLower.startsWith('what') || questionLower.startsWith('which')) {
      const match = sentence.match(/\b[A-Z][a-zA-Z]+\s+[A-Z][a-zA-Z]+\b/);
      if (match) return match[0];
    }
    const words = sentence.split(/\s+/);
    if (words.length > 5) {
      return words.slice(0, 10).join(' ');
    }
    return sentence;
  }

  /**
   * Internal: record a QA result and update statistics
   */
  private _recordQA(qa: QA, type: string, startTime: number): void {
    const responseTime = Date.now() - startTime;
    this._responseTimes.push(responseTime);
    if (this._responseTimes.length > 100) {
      this._responseTimes = this._responseTimes.slice(-100);
    }
    this._byTypeCount[type] = (this._byTypeCount[type] || 0) + 1;
    this._totalConfidence += qa.confidence;
    if (qa.confidence > 0.5 && qa.answer !== 'Unknown' && qa.answer !== 'Unverified') {
      this._successCount++;
    }
    this._qaResults.push(qa);
    this._counter++;
  }

  /**
   * Internal: hash function for deterministic pseudo-randomness
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
    this._dialogueHistory = [];
    this._documentStore = [];
    this._bm25Stats = null;
    this._responseTimes = [];
    this._byTypeCount = {};
    this._successCount = 0;
    this._totalConfidence = 0;
  }
}
