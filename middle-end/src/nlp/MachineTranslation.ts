import { DataPacket } from '../shared/types';

export interface Translation {
  source: string;
  target: string;
  sourceLang: string;
  targetLang: string;
  confidence: number;
  model?: string;
  alternatives?: string[];
  alignment?: AlignmentPair[];
}

export interface TranslationModel {
  name: string;
  sourceLang: string;
  targetLang: string;
}

export interface AlignmentPair {
  source: string;
  target: string;
  score: number;
}

export interface TranslationStat {
  totalTranslations: number;
  byLangPair: Record<string, number>;
  avgConfidence: number;
  byModel: Record<string, number>;
}

export interface QualityEstimation {
  fluency: number;
  adequacy: number;
  overall: number;
  issues: string[];
}

export type TranslationStrategy = 'rule' | 'statistical' | 'neural' | 'transformer' | 'ensemble';

interface BilingualDictionary {
  sourceLang: string;
  targetLang: string;
  entries: Map<string, string[]>;
}

interface PhraseTable {
  phrases: Map<string, { target: string; probability: number }[]>;
}

interface LanguageModel {
  n: number;
  counts: Map<string, number>;
  total: number;
}

export class MachineTranslation {
  private _translations: Translation[] = [];
  private _sourceLang: string = 'en';
  private _targetLang: string = 'zh';
  private _counter: number = 0;
  private _modelName: string = 'default';
  private _glossary: Map<string, string> = new Map();
  private _lastResult: Translation | null = null;
  private _dictionaries: Map<string, BilingualDictionary> = new Map();
  private _phraseTables: Map<string, PhraseTable> = new Map();
  private _languageModels: Map<string, LanguageModel> = new Map();
  private _translationMemory: { source: string; target: string; langPair: string }[] = [];
  private _domainGlossaries: Map<string, Map<string, string>> = new Map();
  private _strategy: TranslationStrategy = 'neural';
  private _supportedLangs: Set<string> = new Set([
    'en', 'zh', 'ja', 'ko', 'fr', 'de', 'es', 'it', 'ru', 'ar',
    'pt', 'nl', 'pl', 'tr', 'vi', 'th', 'id', 'ms', 'hi', 'bn'
  ]);

  constructor() {
    this._initDefaultGlossary();
    this._initDictionaries();
    this._initDomainGlossaries();
  }

  get translations(): Translation[] {
    return this._translations;
  }

  get sourceLang(): string {
    return this._sourceLang;
  }

  get targetLang(): string {
    return this._targetLang;
  }

  get modelName(): string {
    return this._modelName;
  }

  get glossary(): Map<string, string> {
    return this._glossary;
  }

  get strategy(): TranslationStrategy {
    return this._strategy;
  }

  set strategy(strategy: TranslationStrategy) {
    this._strategy = strategy;
  }

  get supportedLangs(): Set<string> {
    return this._supportedLangs;
  }

  get translationMemory(): { source: string; target: string; langPair: string }[] {
    return this._translationMemory;
  }

  /**
   * Initialize the default English-Chinese glossary
   */
  private _initDefaultGlossary(): void {
    const pairs: [string, string][] = [
      ['hello', '你好'],
      ['world', '世界'],
      ['good', '好'],
      ['bad', '坏'],
      ['yes', '是'],
      ['no', '不'],
      ['thank', '谢谢'],
      ['please', '请'],
      ['love', '爱'],
      ['time', '时间'],
      ['life', '生活'],
      ['book', '书'],
      ['water', '水'],
      ['food', '食物'],
      ['home', '家'],
      ['friend', '朋友'],
      ['family', '家庭'],
      ['work', '工作'],
      ['school', '学校'],
      ['student', '学生'],
      ['teacher', '老师'],
      ['doctor', '医生'],
      ['hospital', '医院'],
      ['computer', '电脑'],
      ['phone', '手机'],
      ['car', '汽车'],
      ['city', '城市'],
      ['country', '国家'],
      ['language', '语言'],
      ['machine', '机器'],
      ['learning', '学习'],
      ['data', '数据'],
      ['model', '模型'],
      ['algorithm', '算法'],
      ['network', '网络'],
      ['system', '系统'],
      ['program', '程序'],
      ['code', '代码'],
      ['software', '软件'],
      ['hardware', '硬件'],
      ['science', '科学'],
      ['research', '研究'],
      ['project', '项目'],
      ['company', '公司'],
      ['business', '商业'],
      ['market', '市场'],
      ['money', '钱'],
      ['price', '价格'],
      ['service', '服务'],
      ['product', '产品'],
      ['customer', '客户']
    ];
    for (const [en, zh] of pairs) {
      this._glossary.set(en, zh);
    }
  }

  /**
   * Initialize bilingual dictionaries for multiple language pairs
   */
  private _initDictionaries(): void {
    const enZh: [string, string[]][] = [
      ['hello', ['你好', '您好']],
      ['goodbye', ['再见', '拜拜']],
      ['thank you', ['谢谢', '感谢']],
      ['apple', ['苹果']],
      ['book', ['书', '本子']],
      ['house', ['房子', '家']],
      ['water', ['水']],
      ['fire', ['火']],
      ['earth', ['地球', '土地']],
      ['air', ['空气']]
    ];
    this._dictionaries.set('en-zh', {
      sourceLang: 'en',
      targetLang: 'zh',
      entries: new Map(enZh)
    });

    const enJa: [string, string[]][] = [
      ['hello', ['こんにちは']],
      ['goodbye', ['さようなら']],
      ['thank you', ['ありがとう']],
      ['apple', ['りんご']],
      ['book', ['本']],
      ['water', ['水']],
      ['fire', ['火']],
      ['mountain', ['山']],
      ['river', ['川']],
      ['sea', ['海']]
    ];
    this._dictionaries.set('en-ja', {
      sourceLang: 'en',
      targetLang: 'ja',
      entries: new Map(enJa)
    });

    const enFr: [string, string[]][] = [
      ['hello', ['bonjour']],
      ['goodbye', ['au revoir']],
      ['thank you', ['merci']],
      ['apple', ['pomme']],
      ['book', ['livre']],
      ['water', ['eau']],
      ['fire', ['feu']],
      ['mountain', ['montagne']],
      ['river', ['rivière']],
      ['sea', ['mer']]
    ];
    this._dictionaries.set('en-fr', {
      sourceLang: 'en',
      targetLang: 'fr',
      entries: new Map(enFr)
    });

    const enEs: [string, string[]][] = [
      ['hello', ['hola']],
      ['goodbye', ['adiós']],
      ['thank you', ['gracias']],
      ['apple', ['manzana']],
      ['book', ['libro']],
      ['water', ['agua']],
      ['fire', ['fuego']],
      ['mountain', ['montaña']],
      ['river', ['río']],
      ['sea', ['mar']]
    ];
    this._dictionaries.set('en-es', {
      sourceLang: 'en',
      targetLang: 'es',
      entries: new Map(enEs)
    });

    const enDe: [string, string[]][] = [
      ['hello', ['hallo']],
      ['goodbye', ['auf wiedersehen']],
      ['thank you', ['danke']],
      ['apple', ['apfel']],
      ['book', ['buch']],
      ['water', ['wasser']],
      ['fire', ['feuer']],
      ['mountain', ['berg']],
      ['river', ['fluss']],
      ['sea', ['meer']]
    ];
    this._dictionaries.set('en-de', {
      sourceLang: 'en',
      targetLang: 'de',
      entries: new Map(enDe)
    });
  }

  /**
   * Initialize domain-specific glossaries
   */
  private _initDomainGlossaries(): void {
    const medical = new Map<string, string>([
      ['diagnosis', '诊断'],
      ['treatment', '治疗'],
      ['symptom', '症状'],
      ['medicine', '药物'],
      ['patient', '患者'],
      ['doctor', '医生'],
      ['disease', '疾病'],
      ['surgery', '手术'],
      ['prescription', '处方'],
      ['prognosis', '预后']
    ]);
    this._domainGlossaries.set('medical', medical);

    const legal = new Map<string, string>([
      ['court', '法院'],
      ['judge', '法官'],
      ['lawyer', '律师'],
      ['contract', '合同'],
      ['lawsuit', '诉讼'],
      ['verdict', '判决'],
      ['appeal', '上诉'],
      ['evidence', '证据'],
      ['witness', '证人'],
      ['defendant', '被告']
    ]);
    this._domainGlossaries.set('legal', legal);

    const technical = new Map<string, string>([
      ['algorithm', '算法'],
      ['database', '数据库'],
      ['framework', '框架'],
      ['interface', '接口'],
      ['protocol', '协议'],
      ['architecture', '架构'],
      ['deployment', '部署'],
      ['debugging', '调试'],
      ['compiler', '编译器'],
      ['runtime', '运行时']
    ]);
    this._domainGlossaries.set('technical', technical);

    const financial = new Map<string, string>([
      ['investment', '投资'],
      ['revenue', '收入'],
      ['profit', '利润'],
      ['asset', '资产'],
      ['liability', '负债'],
      ['equity', '权益'],
      ['dividend', '股息'],
      ['portfolio', '投资组合'],
      ['volatility', '波动性'],
      ['liquidity', '流动性']
    ]);
    this._domainGlossaries.set('financial', financial);
  }

  /**
   * Main translation entry point - dispatches based on current strategy
   */
  translate(text: string, sourceLang: string, targetLang: string): string {
    let result = '';
    let confidence = 0.75;
    let modelName = 'default';

    if (sourceLang === 'en' && targetLang === 'zh') {
      result = this._enToZh(text);
    } else if (sourceLang === 'zh' && targetLang === 'en') {
      result = this._zhToEn(text);
    } else if (sourceLang === 'en' && targetLang === 'ja') {
      result = this._enToJa(text);
    } else if (sourceLang === 'en' && targetLang === 'fr') {
      result = this._enToFr(text);
    } else if (sourceLang === 'en' && targetLang === 'es') {
      result = this._enToEs(text);
    } else if (sourceLang === 'en' && targetLang === 'de') {
      result = this._enToDe(text);
    } else {
      result = this._pseudoTranslate(text, 'generic', 0.7);
    }

    const translation: Translation = {
      source: text,
      target: result,
      sourceLang,
      targetLang,
      confidence,
      model: modelName
    };
    this._lastResult = translation;
    this._translations.push(translation);
    this._translationMemory.push({ source: text, target: result, langPair: `${sourceLang}-${targetLang}` });
    this._sourceLang = sourceLang;
    this._targetLang = targetLang;
    return result;
  }

  /**
   * Translate using a specific strategy
   */
  translateWithStrategy(text: string, sourceLang: string, targetLang: string, strategy: TranslationStrategy): string {
    const model: TranslationModel = { name: strategy, sourceLang, targetLang };
    switch (strategy) {
      case 'rule':
        return this.ruleBasedTranslate(text, this._glossary, sourceLang, targetLang);
      case 'statistical':
        return this.statisticalTranslate(text, model);
      case 'neural':
        return this.neuralTranslate(text, model);
      case 'transformer':
        return this.transformerTranslate(text, model);
      case 'ensemble':
        return this.ensembleTranslate(text, sourceLang, targetLang);
      default:
        return this.translate(text, sourceLang, targetLang);
    }
  }

  /**
   * Rule-based translation using a substitution map
   */
  ruleBasedTranslate(text: string, rules: Map<string, string>, sourceLang: string, targetLang: string): string {
    let result = text;
    const sortedKeys = Array.from(rules.keys()).sort((a, b) => b.length - a.length);
    for (const from of sortedKeys) {
      const regex = new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      result = result.replace(regex, rules.get(from)!);
    }
    const translation: Translation = {
      source: text,
      target: result,
      sourceLang,
      targetLang,
      confidence: 0.6,
      model: 'rule-based'
    };
    this._lastResult = translation;
    this._translations.push(translation);
    this._modelName = 'rule-based';
    return result;
  }

  /**
   * Statistical Machine Translation (simulated)
   */
  statisticalTranslate(text: string, model: TranslationModel): string {
    const words = text.split(/\s+/);
    const translated: string[] = [];
    for (const word of words) {
      const clean = word.toLowerCase().replace(/[.,!?;:'"]$/, '');
      const gloss = this._glossary.get(clean);
      if (gloss) {
        translated.push(gloss);
      } else {
        // Look up in bilingual dictionary
        const dictKey = `${model.sourceLang}-${model.targetLang}`;
        const dict = this._dictionaries.get(dictKey);
        const entry = dict?.entries.get(clean);
        if (entry && entry.length > 0) {
          translated.push(entry[0]);
        } else {
          const hash = this._hash(clean + model.name);
          const candidates = Array.from(this._glossary.values());
          translated.push(candidates[hash % candidates.length] || word);
        }
      }
    }
    const result = translated.join('');
    const translation: Translation = {
      source: text,
      target: result,
      sourceLang: model.sourceLang,
      targetLang: model.targetLang,
      confidence: 0.65,
      model: 'statistical'
    };
    this._lastResult = translation;
    this._translations.push(translation);
    this._modelName = 'statistical';
    return result;
  }

  /**
   * Phrase-based statistical translation
   */
  phraseBasedTranslate(text: string, model: TranslationModel): string {
    const phrases = this._extractPhrases(text, 3);
    const translated: string[] = [];
    for (const phrase of phrases) {
      const phraseTableKey = `${model.sourceLang}-${model.targetLang}`;
      const table = this._phraseTables.get(phraseTableKey);
      const entry = table?.phrases.get(phrase.toLowerCase());
      if (entry && entry.length > 0) {
        translated.push(entry[0].target);
      } else {
        // Fallback to word-by-word
        const words = phrase.split(/\s+/);
        for (const word of words) {
          const gloss = this._glossary.get(word.toLowerCase());
          translated.push(gloss || word);
        }
      }
    }
    const result = translated.join('');
    const translation: Translation = {
      source: text,
      target: result,
      sourceLang: model.sourceLang,
      targetLang: model.targetLang,
      confidence: 0.72,
      model: 'phrase-based'
    };
    this._lastResult = translation;
    this._translations.push(translation);
    return result;
  }

  /**
   * Neural Machine Translation (simulated)
   */
  neuralTranslate(text: string, model: TranslationModel): string {
    const result = this._pseudoTranslate(text, model.name, 0.8);
    const translation: Translation = {
      source: text,
      target: result,
      sourceLang: model.sourceLang,
      targetLang: model.targetLang,
      confidence: 0.8,
      model: 'neural'
    };
    this._lastResult = translation;
    this._translations.push(translation);
    this._modelName = 'neural';
    return result;
  }

  /**
   * Transformer-based translation (simulated)
   */
  transformerTranslate(text: string, model: TranslationModel): string {
    const result = this._pseudoTranslate(text, model.name, 0.85);
    const translation: Translation = {
      source: text,
      target: result,
      sourceLang: model.sourceLang,
      targetLang: model.targetLang,
      confidence: 0.85,
      model: 'transformer'
    };
    this._lastResult = translation;
    this._translations.push(translation);
    this._modelName = 'transformer';
    return result;
  }

  /**
   * Attention-based NMT (simulated)
   */
  attentionTranslate(text: string, model: TranslationModel): string {
    const tokens = text.split(/\s+/);
    const result: string[] = [];
    const targetLen = Math.ceil(tokens.length * 1.2);
    for (let i = 0; i < targetLen; i++) {
      // Simulate attention weights
      const attentionWeights = tokens.map((_, j) => Math.exp(-Math.abs(i - j * (tokens.length / targetLen))));
      const sumWeights = attentionWeights.reduce((a, b) => a + b, 0);
      const normalizedWeights = attentionWeights.map(w => w / sumWeights);
      // Pick the most attended token
      let maxIdx = 0;
      let maxWeight = 0;
      for (let j = 0; j < normalizedWeights.length; j++) {
        if (normalizedWeights[j] > maxWeight) {
          maxWeight = normalizedWeights[j];
          maxIdx = j;
        }
      }
      const token = tokens[maxIdx].toLowerCase();
      const gloss = this._glossary.get(token);
      result.push(gloss || token);
    }
    const finalResult = result.join('');
    const translation: Translation = {
      source: text,
      target: finalResult,
      sourceLang: model.sourceLang,
      targetLang: model.targetLang,
      confidence: 0.82,
      model: 'attention'
    };
    this._lastResult = translation;
    this._translations.push(translation);
    return finalResult;
  }

  /**
   * BERT-based NMT (simulated)
   */
  bertTranslate(text: string, model: TranslationModel): string {
    const result = this._pseudoTranslate(text, 'bert-' + model.name, 0.88);
    const translation: Translation = {
      source: text,
      target: result,
      sourceLang: model.sourceLang,
      targetLang: model.targetLang,
      confidence: 0.88,
      model: 'bert-nmt'
    };
    this._lastResult = translation;
    this._translations.push(translation);
    return result;
  }

  /**
   * GPT-based NMT (simulated)
   */
  gptTranslate(text: string, model: TranslationModel): string {
    const result = this._pseudoTranslate(text, 'gpt-' + model.name, 0.9);
    const translation: Translation = {
      source: text,
      target: result,
      sourceLang: model.sourceLang,
      targetLang: model.targetLang,
      confidence: 0.9,
      model: 'gpt-nmt'
    };
    this._lastResult = translation;
    this._translations.push(translation);
    return result;
  }

  /**
   * Ensemble translation - combines multiple models
   */
  ensembleTranslate(text: string, sourceLang: string, targetLang: string): string {
    const model: TranslationModel = { name: 'ensemble', sourceLang, targetLang };
    const candidates: string[] = [
      this.statisticalTranslate(text, model),
      this.neuralTranslate(text, model),
      this.transformerTranslate(text, model)
    ];
    // Voting - pick the most common translation (or first if all different)
    const counts = new Map<string, number>();
    for (const c of candidates) {
      counts.set(c, (counts.get(c) || 0) + 1);
    }
    let best = candidates[0];
    let bestCount = 0;
    for (const [c, count] of counts) {
      if (count > bestCount) {
        best = c;
        bestCount = count;
      }
    }
    const translation: Translation = {
      source: text,
      target: best,
      sourceLang,
      targetLang,
      confidence: 0.9,
      model: 'ensemble',
      alternatives: candidates
    };
    this._lastResult = translation;
    this._translations.push(translation);
    return best;
  }

  /**
   * Back-translation - translate to target then back to source (used for augmentation)
   */
  backTranslate(text: string, sourceLang: string, targetLang: string): string {
    const forward = this.translate(text, sourceLang, targetLang);
    const back = this.translate(forward, targetLang, sourceLang);
    return back;
  }

  /**
   * Back-translation augmentation - generate synthetic training data
   */
  backTranslateAugment(text: string, sourceLang: string, targetLang: string, n: number = 3): string[] {
    const augmentations: string[] = [text];
    for (let i = 0; i < n; i++) {
      // Add small perturbations
      const perturbed = this._perturbText(text, i);
      const forward = this.translate(perturbed, sourceLang, targetLang);
      const back = this.translate(forward, targetLang, sourceLang);
      augmentations.push(back);
    }
    return augmentations;
  }

  /**
   * Glossary-based translation
   */
  glossaryTranslate(text: string, glossary: Map<string, string>): string {
    let result = text;
    const sortedKeys = Array.from(glossary.keys()).sort((a, b) => b.length - a.length);
    for (const key of sortedKeys) {
      const regex = new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      result = result.replace(regex, glossary.get(key)!);
    }
    return result;
  }

  /**
   * Pivot/bridge translation - through an intermediate language
   */
  pivotTranslate(text: string, pivotLang: string, targetLang: string): string {
    const sourceLang = this._detectLang(text);
    const pivot = this.translate(text, sourceLang, pivotLang);
    const result = this.translate(pivot, pivotLang, targetLang);
    const translation: Translation = {
      source: text,
      target: result,
      sourceLang,
      targetLang,
      confidence: 0.7,
      model: 'pivot'
    };
    this._lastResult = translation;
    this._translations.push(translation);
    this._modelName = 'pivot';
    return result;
  }

  /**
   * Domain-adapted translation using domain-specific glossaries
   */
  domainAdaptedTranslate(text: string, domain: string, sourceLang: string, targetLang: string): string {
    const domainGlossary = this._domainGlossaries.get(domain);
    let result = this.translate(text, sourceLang, targetLang);
    if (domainGlossary) {
      result = this.glossaryTranslate(result, domainGlossary);
    }
    const translation: Translation = {
      source: text,
      target: result,
      sourceLang,
      targetLang,
      confidence: 0.82,
      model: `domain-${domain}`
    };
    this._lastResult = translation;
    this._translations.push(translation);
    return result;
  }

  /**
   * Translation Memory lookup
   */
  translationMemoryLookup(text: string, sourceLang: string, targetLang: string, threshold: number = 0.9): Translation | null {
    const langPair = `${sourceLang}-${targetLang}`;
    for (const entry of this._translationMemory) {
      if (entry.langPair === langPair) {
        const sim = this._stringSimilarity(text.toLowerCase(), entry.source.toLowerCase());
        if (sim >= threshold) {
          return {
            source: entry.source,
            target: entry.target,
            sourceLang,
            targetLang,
            confidence: sim,
            model: 'translation-memory'
          };
        }
      }
    }
    return null;
  }

  /**
   * Add an entry to the translation memory
   */
  addTranslationMemory(source: string, target: string, sourceLang: string, targetLang: string): void {
    this._translationMemory.push({
      source,
      target,
      langPair: `${sourceLang}-${targetLang}`
    });
  }

  /**
   * Check if a translation direction is supported
   */
  translateDirection(sourceLang: string, targetLang: string): boolean {
    return this._supportedLangs.has(sourceLang) && this._supportedLangs.has(targetLang);
  }

  /**
   * Get all supported target languages for a source language
   */
  getSupportedTargets(sourceLang: string): string[] {
    return Array.from(this._supportedLangs).filter(l => l !== sourceLang);
  }

  /**
   * Add a supported language
   */
  addSupportedLanguage(lang: string): void {
    this._supportedLangs.add(lang);
  }

  /**
   * Add a term to the glossary
   */
  addGlossaryTerm(source: string, target: string): void {
    this._glossary.set(source.toLowerCase(), target);
  }

  /**
   * Add a bilingual dictionary entry
   */
  addDictionaryEntry(langPair: string, source: string, targets: string[]): void {
    if (!this._dictionaries.has(langPair)) {
      const [sourceLang, targetLang] = langPair.split('-');
      this._dictionaries.set(langPair, {
        sourceLang,
        targetLang,
        entries: new Map()
      });
    }
    this._dictionaries.get(langPair)!.entries.set(source.toLowerCase(), targets);
  }

  /**
   * Train a phrase table from parallel corpus
   */
  trainPhraseTable(parallelCorpus: { source: string; target: string }[], sourceLang: string, targetLang: string): void {
    const key = `${sourceLang}-${targetLang}`;
    const table: PhraseTable = { phrases: new Map() };
    for (const { source, target } of parallelCorpus) {
      const sourcePhrases = this._extractPhrases(source, 3);
      const targetPhrases = this._extractPhrases(target, 3);
      for (let i = 0; i < sourcePhrases.length; i++) {
        const sp = sourcePhrases[i].toLowerCase();
        if (!table.phrases.has(sp)) {
          table.phrases.set(sp, []);
        }
        for (let j = 0; j < targetPhrases.length; j++) {
          const tp = targetPhrases[j];
          const existing = table.phrases.get(sp)!.find(e => e.target === tp);
          if (existing) {
            existing.probability += 1;
          } else {
            table.phrases.get(sp)!.push({ target: tp, probability: 1 });
          }
        }
      }
    }
    // Normalize probabilities
    for (const [, entries] of table.phrases) {
      const total = entries.reduce((a, e) => a + e.probability, 0);
      for (const e of entries) {
        e.probability /= total;
      }
    }
    this._phraseTables.set(key, table);
  }

  /**
   * Train a simple n-gram language model
   */
  trainLanguageModel(corpus: string[], n: number = 3): void {
    const lm: LanguageModel = { n, counts: new Map(), total: 0 };
    for (const text of corpus) {
      const words = text.toLowerCase().split(/\s+/);
      for (let i = 0; i <= words.length - n; i++) {
        const ngram = words.slice(i, i + n).join(' ');
        lm.counts.set(ngram, (lm.counts.get(ngram) || 0) + 1);
        lm.total++;
      }
    }
    this._languageModels.set(`n${n}`, lm);
  }

  /**
   * Compute language model probability of a sentence
   */
  languageModelScore(text: string, n: number = 3): number {
    const lm = this._languageModels.get(`n${n}`);
    if (!lm) return 0.5;
    const words = text.toLowerCase().split(/\s+/);
    let logProb = 0;
    let count = 0;
    for (let i = 0; i <= words.length - n; i++) {
      const ngram = words.slice(i, i + n).join(' ');
      const c = lm.counts.get(ngram) || 0;
      logProb += Math.log((c + 1) / (lm.total + lm.counts.size));
      count++;
    }
    return count > 0 ? Math.exp(logProb / count) : 0;
  }

  /**
   * IBM Model 1 word alignment (simplified)
   */
  wordAlignment(source: string, target: string, iterations: number = 5): AlignmentPair[] {
    const sourceWords = source.toLowerCase().split(/\s+/);
    const targetWords = target.toLowerCase().split(/\s+/);
    const alignments: AlignmentPair[] = [];
    // Initialize uniform probabilities
    const probs: number[][] = [];
    for (let i = 0; i < sourceWords.length; i++) {
      probs.push(new Array(targetWords.length).fill(1 / targetWords.length));
    }
    // EM algorithm (simplified)
    for (let iter = 0; iter < iterations; iter++) {
      // E-step
      const counts: number[][] = [];
      for (let i = 0; i < sourceWords.length; i++) {
        counts.push(new Array(targetWords.length).fill(0));
      }
      for (let j = 0; j < targetWords.length; j++) {
        let total = 0;
        for (let i = 0; i < sourceWords.length; i++) {
          total += probs[i][j];
        }
        for (let i = 0; i < sourceWords.length; i++) {
          counts[i][j] = probs[i][j] / (total || 1);
        }
      }
      // M-step
      for (let i = 0; i < sourceWords.length; i++) {
        const total = counts[i].reduce((a, b) => a + b, 0) || 1;
        for (let j = 0; j < targetWords.length; j++) {
          probs[i][j] = counts[i][j] / total;
        }
      }
    }
    // Extract best alignments
    for (let i = 0; i < sourceWords.length; i++) {
      let bestJ = 0;
      let bestProb = 0;
      for (let j = 0; j < targetWords.length; j++) {
        if (probs[i][j] > bestProb) {
          bestProb = probs[i][j];
          bestJ = j;
        }
      }
      alignments.push({
        source: sourceWords[i],
        target: targetWords[bestJ],
        score: bestProb
      });
    }
    return alignments;
  }

  /**
   * BLEU score - standard MT evaluation metric
   */
  bleuScore(hypothesis: string, references: string[]): number {
    const hypWords = hypothesis.toLowerCase().split(/\s+/);
    const refWordList = references.map(r => r.toLowerCase().split(/\s+/));
    const maxN = Math.min(4, hypWords.length);
    const precisions: number[] = [];
    for (let n = 1; n <= maxN; n++) {
      const hypNgrams = this._countNgrams(hypWords, n);
      let matched = 0;
      let total = 0;
      for (const [ngram, count] of hypNgrams) {
        let maxRefCount = 0;
        for (const refWords of refWordList) {
          const refNgrams = this._countNgrams(refWords, n);
          maxRefCount = Math.max(maxRefCount, refNgrams.get(ngram) || 0);
        }
        matched += Math.min(count, maxRefCount);
        total += count;
      }
      precisions.push(total > 0 ? matched / total : 0);
    }
    const geometricMean = precisions.length > 0
      ? Math.exp(precisions.reduce((a, p) => a + Math.log(Math.max(p, 1e-10)), 0) / precisions.length)
      : 0;
    const refLen = refWordList[0]?.length || 1;
    const brevityPenalty = hypWords.length < refLen ? Math.exp(1 - refLen / hypWords.length) : 1;
    return geometricMean * brevityPenalty;
  }

  /**
   * BLEU score with smoothing
   */
  bleuScoreSmoothed(hypothesis: string, references: string[], smoothing: number = 1e-6): number {
    const hypWords = hypothesis.toLowerCase().split(/\s+/);
    const refWordList = references.map(r => r.toLowerCase().split(/\s+/));
    const maxN = 4;
    const precisions: number[] = [];
    for (let n = 1; n <= maxN; n++) {
      const hypNgrams = this._countNgrams(hypWords, n);
      let matched = 0;
      let total = 0;
      for (const [ngram, count] of hypNgrams) {
        let maxRefCount = 0;
        for (const refWords of refWordList) {
          const refNgrams = this._countNgrams(refWords, n);
          maxRefCount = Math.max(maxRefCount, refNgrams.get(ngram) || 0);
        }
        matched += Math.min(count, maxRefCount);
        total += count;
      }
      precisions.push((matched + smoothing) / (total + smoothing));
    }
    const geometricMean = Math.exp(precisions.reduce((a, p) => a + Math.log(Math.max(p, 1e-10)), 0) / precisions.length);
    const refLen = refWordList[0]?.length || 1;
    const brevityPenalty = hypWords.length < refLen ? Math.exp(1 - refLen / hypWords.length) : 1;
    return geometricMean * brevityPenalty;
  }

  /**
   * Translation Edit Rate (TER)
   */
  terScore(hypothesis: string, references: string[]): number {
    const hypWords = hypothesis.toLowerCase().split(/\s+/);
    const refWords = references[0]?.toLowerCase().split(/\s+/) || [];
    const edits = this._levenshteinDistance(hypWords, refWords);
    return edits / Math.max(hypWords.length, refWords.length, 1);
  }

  /**
   * chrF score - character-level F-score
   */
  chrfScore(hypothesis: string, references: string[]): number {
    const hyp = hypothesis.toLowerCase().replace(/\s+/g, '');
    const ref = references[0]?.toLowerCase().replace(/\s+/g, '') || '';
    const n = 6;
    let totalMatch = 0;
    let totalHyp = 0;
    let totalRef = 0;
    for (let i = 1; i <= n; i++) {
      const hypNgrams = this._charNgrams(hyp, i);
      const refNgrams = this._charNgrams(ref, i);
      let match = 0;
      for (const [ngram, count] of hypNgrams) {
        match += Math.min(count, refNgrams.get(ngram) || 0);
      }
      totalMatch += match;
      totalHyp += Array.from(hypNgrams.values()).reduce((a, b) => a + b, 0);
      totalRef += Array.from(refNgrams.values()).reduce((a, b) => a + b, 0);
    }
    const precision = totalHyp > 0 ? totalMatch / totalHyp : 0;
    const recall = totalRef > 0 ? totalMatch / totalRef : 0;
    const f1 = precision + recall > 0 ? 2 * precision * recall / (precision + recall) : 0;
    return f1;
  }

  /**
   * METEOR score - considers synonyms and stemming
   */
  meteorScore(hypothesis: string, references: string[]): number {
    const hypWords = hypothesis.toLowerCase().split(/\s+/);
    const refWords = references[0]?.toLowerCase().split(/\s+/) || [];
    let matched = 0;
    for (const hyp of hypWords) {
      if (refWords.includes(hyp)) matched++;
    }
    const precision = hypWords.length > 0 ? matched / hypWords.length : 0;
    const recall = refWords.length > 0 ? matched / refWords.length : 0;
    const fmean = precision + recall > 0 ? 10 * precision * recall / (recall + 9 * precision) : 0;
    // Penalty for fragmentation
    const chunks = Math.max(0, Math.abs(matched - 1));
    const penalty = 0.5 * Math.pow(chunks / Math.max(matched, 1), 3);
    return fmean * (1 - penalty);
  }

  /**
   * Word Error Rate (WER)
   */
  werScore(hypothesis: string, reference: string): number {
    const hypWords = hypothesis.toLowerCase().split(/\s+/);
    const refWords = reference.toLowerCase().split(/\s+/);
    const edits = this._levenshteinDistance(hypWords, refWords);
    return edits / Math.max(refWords.length, 1);
  }

  /**
   * Word Information Lost (WIL)
   */
  wilScore(hypothesis: string, reference: string): number {
    const hypWords = hypothesis.toLowerCase().split(/\s+/);
    const refWords = reference.toLowerCase().split(/\s+/);
    const edits = this._levenshteinDistance(hypWords, refWords);
    const correct = refWords.length - edits;
    const wil = 1 - Math.pow(correct / refWords.length, 2);
    return Math.max(0, Math.min(1, wil));
  }

  /**
   * Quality Estimation - predict translation quality without reference
   */
  qualityEstimation(text: string, translation: string): QualityEstimation {
    const issues: string[] = [];
    const sourceWords = text.split(/\s+/);
    const targetChars = translation.length;
    // Heuristics for quality estimation
    const lengthRatio = targetChars / Math.max(sourceWords.length, 1);
    let fluency = 0.8;
    if (lengthRatio < 0.5 || lengthRatio > 5) {
      fluency = 0.5;
      issues.push('Length mismatch');
    }
    if (/[<>{}]{2,}/.test(translation)) {
      fluency -= 0.2;
      issues.push('Tag artifacts detected');
    }
    if (/\s{3,}/.test(translation)) {
      fluency -= 0.1;
      issues.push('Excessive whitespace');
    }
    let adequacy = 0.75;
    if (sourceWords.length > 0 && targetChars === 0) {
      adequacy = 0;
      issues.push('Empty translation');
    }
    const overall = (fluency + adequacy) / 2;
    return { fluency, adequacy, overall, issues };
  }

  /**
   * Confidence estimation based on translation history
   */
  confidenceEstimation(text: string): number {
    // Confidence based on translation memory matches and glossary coverage
    const words = text.toLowerCase().split(/\s+/);
    let coverage = 0;
    for (const word of words) {
      if (this._glossary.has(word)) coverage++;
    }
    return words.length > 0 ? coverage / words.length : 0;
  }

  /**
   * English to Chinese translation
   */
  private _enToZh(text: string): string {
    const words = text.split(/(\s+|[.,!?;:'"])/);
    const result: string[] = [];
    for (const part of words) {
      if (/^[a-zA-Z']+$/.test(part)) {
        const lower = part.toLowerCase();
        if (this._glossary.has(lower)) {
          result.push(this._glossary.get(lower)!);
        } else {
          const hash = this._hash(lower);
          const chars = '的一是不了人我在有他这为之大来以个中上们到说国地出也时就你要会可家对学能而子那得和着自己下天过好年应如没正着心所然想看儿它他道与怎';
          let zh = '';
          let h = hash;
          for (let i = 0; i < Math.max(1, Math.floor(lower.length / 3)); i++) {
            zh += chars[h % chars.length];
            h = Math.floor(h / chars.length);
          }
          result.push(zh);
        }
      } else {
        result.push(part);
      }
    }
    return result.join('');
  }

  /**
   * Chinese to English translation
   */
  private _zhToEn(text: string): string {
    const chars = text.split('');
    const result: string[] = [];
    const reverseGlossary = new Map<string, string>();
    for (const [en, zh] of this._glossary) {
      reverseGlossary.set(zh, en);
    }
    let i = 0;
    while (i < chars.length) {
      let matched = false;
      for (let len = 3; len >= 1; len--) {
        if (i + len <= chars.length) {
          const sub = chars.slice(i, i + len).join('');
          if (reverseGlossary.has(sub)) {
            result.push(reverseGlossary.get(sub)!);
            i += len;
            matched = true;
            break;
          }
        }
      }
      if (!matched) {
        if (/[\u4e00-\u9fa5]/.test(chars[i])) {
          result.push('word' + this._hash(chars[i]) % 100);
        } else {
          result.push(chars[i]);
        }
        i++;
      }
    }
    return result.join(' ');
  }

  /**
   * English to Japanese translation (simulated)
   */
  private _enToJa(text: string): string {
    const words = text.split(/\s+/);
    const result: string[] = [];
    const dict = this._dictionaries.get('en-ja');
    for (const word of words) {
      const clean = word.toLowerCase().replace(/[.,!?;:'"]$/, '');
      const entry = dict?.entries.get(clean);
      if (entry && entry.length > 0) {
        result.push(entry[0]);
      } else {
        const hash = this._hash(clean + 'ja');
        const chars = 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん';
        let ja = '';
        let h = hash;
        for (let i = 0; i < Math.max(1, Math.floor(clean.length / 2)); i++) {
          ja += chars[h % chars.length];
          h = Math.floor(h / chars.length);
        }
        result.push(ja);
      }
    }
    return result.join('');
  }

  /**
   * English to French translation (simulated)
   */
  private _enToFr(text: string): string {
    const words = text.split(/\s+/);
    const result: string[] = [];
    const dict = this._dictionaries.get('en-fr');
    for (const word of words) {
      const clean = word.toLowerCase().replace(/[.,!?;:'"]$/, '');
      const entry = dict?.entries.get(clean);
      if (entry && entry.length > 0) {
        result.push(entry[0]);
      } else {
        // Apply French suffixes
        if (clean.endsWith('tion')) result.push(clean + 'ner');
        else if (clean.endsWith('y')) result.push(clean.slice(0, -1) + 'ifier');
        else result.push(clean + 'er');
      }
    }
    return result.join(' ');
  }

  /**
   * English to Spanish translation (simulated)
   */
  private _enToEs(text: string): string {
    const words = text.split(/\s+/);
    const result: string[] = [];
    const dict = this._dictionaries.get('en-es');
    for (const word of words) {
      const clean = word.toLowerCase().replace(/[.,!?;:'"]$/, '');
      const entry = dict?.entries.get(clean);
      if (entry && entry.length > 0) {
        result.push(entry[0]);
      } else {
        // Apply Spanish suffixes
        if (clean.endsWith('tion')) result.push(clean.slice(0, -4) + 'ción');
        else if (clean.endsWith('y')) result.push(clean.slice(0, -1) + 'ificar');
        else result.push(clean + 'ar');
      }
    }
    return result.join(' ');
  }

  /**
   * English to German translation (simulated)
   */
  private _enToDe(text: string): string {
    const words = text.split(/\s+/);
    const result: string[] = [];
    const dict = this._dictionaries.get('en-de');
    for (const word of words) {
      const clean = word.toLowerCase().replace(/[.,!?;:'"]$/, '');
      const entry = dict?.entries.get(clean);
      if (entry && entry.length > 0) {
        result.push(entry[0]);
      } else {
        // Apply German suffixes
        if (clean.endsWith('tion')) result.push(clean.slice(0, -4) + 'tion');
        else if (clean.endsWith('y')) result.push(clean + 'keit');
        else result.push(clean + 'en');
      }
    }
    return result.join(' ');
  }

  /**
   * Generate a pseudo-translation (simulated neural output)
   */
  private _pseudoTranslate(text: string, modelName: string, confidence: number): string {
    const seed = this._hash(text + modelName);
    let s = seed;
    const chars = '的一是不了人我在有他这为之大来以个中上们到说国地出也时就你要会可家对学能而子那得和着自己下天过好年应如没正着心所然想看儿它他道与怎';
    let result = '';
    const len = Math.ceil(text.length / 2);
    for (let i = 0; i < len; i++) {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      result += chars[s % chars.length];
    }
    return result;
  }

  /**
   * Extract n-gram phrases from text up to maxLen
   */
  private _extractPhrases(text: string, maxLen: number): string[] {
    const words = text.split(/\s+/);
    const phrases: string[] = [];
    for (let n = 1; n <= maxLen; n++) {
      for (let i = 0; i <= words.length - n; i++) {
        phrases.push(words.slice(i, i + n).join(' '));
      }
    }
    return phrases;
  }

  /**
   * Detect language using simple character class heuristics
   */
  private _detectLang(text: string): string {
    const zhCount = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const jaCount = (text.match(/[\u3040-\u30ff]/g) || []).length;
    const koCount = (text.match(/[\uac00-\ud7af]/g) || []).length;
    const enCount = (text.match(/[a-zA-Z]/g) || []).length;
    if (zhCount > enCount && zhCount > jaCount) return 'zh';
    if (jaCount > 0) return 'ja';
    if (koCount > 0) return 'ko';
    return 'en';
  }

  /**
   * Count n-grams of words
   */
  private _countNgrams(words: string[], n: number): Map<string, number> {
    const ngrams = new Map<string, number>();
    for (let i = 0; i <= words.length - n; i++) {
      const ngram = words.slice(i, i + n).join(' ');
      ngrams.set(ngram, (ngrams.get(ngram) || 0) + 1);
    }
    return ngrams;
  }

  /**
   * Count character n-grams
   */
  private _charNgrams(text: string, n: number): Map<string, number> {
    const ngrams = new Map<string, number>();
    for (let i = 0; i <= text.length - n; i++) {
      const ngram = text.substring(i, i + n);
      ngrams.set(ngram, (ngrams.get(ngram) || 0) + 1);
    }
    return ngrams;
  }

  /**
   * Compute Levenshtein edit distance between two word arrays
   */
  private _levenshteinDistance(a: string[], b: string[]): number {
    const m = a.length;
    const n = b.length;
    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (a[i - 1] === b[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]) + 1;
        }
      }
    }
    return dp[m][n];
  }

  /**
   * Perturb text slightly for data augmentation
   */
  private _perturbText(text: string, seed: number): string {
    const words = text.split(/\s+/);
    let s = this._hash(text + seed);
    // Randomly drop or swap a word
    if (words.length > 3) {
      const idx = s % words.length;
      if (seed % 2 === 0) {
        // Drop a word
        words.splice(idx, 1);
      } else {
        // Swap two adjacent words
        if (idx < words.length - 1) {
          [words[idx], words[idx + 1]] = [words[idx + 1], words[idx]];
        }
      }
    }
    return words.join(' ');
  }

  /**
   * Compute string similarity (Jaccard on word sets)
   */
  private _stringSimilarity(s1: string, s2: string): number {
    const set1 = new Set(s1.split(/\s+/));
    const set2 = new Set(s2.split(/\s+/));
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * Tokenize text for translation (language-aware)
   */
  tokenize(text: string, lang: string = 'en'): string[] {
    if (lang === 'zh' || lang === 'ja') {
      // Character-based tokenization for CJK languages
      return text.split('').filter(c => /\S/.test(c));
    }
    // Word-based for alphabetic languages
    return text.split(/\s+/).filter(t => t.length > 0);
  }

  /**
   * Detokenize a list of tokens back to text
   */
  detokenize(tokens: string[], lang: string = 'en'): string {
    if (lang === 'zh' || lang === 'ja') {
      return tokens.join('');
    }
    return tokens.join(' ');
  }

  /**
   * Subword tokenization using BPE-like algorithm (simulated)
   */
  subwordTokenize(text: string, vocabSize: number = 1000): string[] {
    const tokens: string[] = [];
    const words = text.split(/\s+/);
    for (const word of words) {
      if (word.length <= 3) {
        tokens.push(word);
      } else {
        // Split into chunks of 3-4 characters
        const chunkSize = 4;
        for (let i = 0; i < word.length; i += chunkSize) {
          tokens.push(word.substring(i, i + chunkSize));
        }
      }
    }
    return tokens;
  }

  /**
   * Batch translation - translate multiple texts at once
   */
  batchTranslate(texts: string[], sourceLang: string, targetLang: string): string[] {
    return texts.map(t => this.translate(t, sourceLang, targetLang));
  }

  /**
   * Translate a document (multiple paragraphs)
   */
  translateDocument(text: string, sourceLang: string, targetLang: string): string {
    const paragraphs = text.split(/\n\n+/);
    const translated = paragraphs.map(p => this.translate(p, sourceLang, targetLang));
    return translated.join('\n\n');
  }

  /**
   * Translate with alternatives - return n-best translations
   */
  translateWithAlternatives(text: string, sourceLang: string, targetLang: string, n: number = 3): string[] {
    const model: TranslationModel = { name: 'alternatives', sourceLang, targetLang };
    const alternatives: string[] = [];
    alternatives.push(this.statisticalTranslate(text, model));
    alternatives.push(this.neuralTranslate(text, model));
    alternatives.push(this.transformerTranslate(text, model));
    if (n > 3) {
      alternatives.push(this.attentionTranslate(text, model));
    }
    return alternatives.slice(0, n);
  }

  /**
   * Get alignment between source and target
   */
  alignTranslation(source: string, target: string): AlignmentPair[] {
    return this.wordAlignment(source, target, 5);
  }

  /**
   * Extract bilingual dictionary from parallel corpus
   */
  extractBilingualDictionary(parallelCorpus: { source: string; target: string }[], minFreq: number = 2): Map<string, string[]> {
    const dict = new Map<string, string[]>();
    const cooccur = new Map<string, Map<string, number>>();
    for (const { source, target } of parallelCorpus) {
      const sourceWords = source.toLowerCase().split(/\s+/);
      const targetWords = target.toLowerCase().split(/\s+/);
      for (const sw of sourceWords) {
        if (!cooccur.has(sw)) cooccur.set(sw, new Map());
        for (const tw of targetWords) {
          cooccur.get(sw)!.set(tw, (cooccur.get(sw)!.get(tw) || 0) + 1);
        }
      }
    }
    for (const [sw, targets] of cooccur) {
      const sorted = Array.from(targets.entries())
        .filter(([, count]) => count >= minFreq)
        .sort((a, b) => b[1] - a[1])
        .map(([tw]) => tw);
      if (sorted.length > 0) {
        dict.set(sw, sorted.slice(0, 5));
      }
    }
    return dict;
  }

  /**
   * Compute translation statistics
   */
  statistics(): TranslationStat {
    const byLangPair: Record<string, number> = {};
    const byModel: Record<string, number> = {};
    let totalConfidence = 0;
    for (const t of this._translations) {
      const pair = `${t.sourceLang}-${t.targetLang}`;
      byLangPair[pair] = (byLangPair[pair] || 0) + 1;
      if (t.model) {
        byModel[t.model] = (byModel[t.model] || 0) + 1;
      }
      totalConfidence += t.confidence;
    }
    return {
      totalTranslations: this._translations.length,
      byLangPair,
      avgConfidence: this._translations.length > 0 ? totalConfidence / this._translations.length : 0,
      byModel
    };
  }

  /**
   * Get all available domain glossaries
   */
  getDomains(): string[] {
    return Array.from(this._domainGlossaries.keys());
  }

  /**
   * Add a domain glossary
   */
  addDomainGlossary(domain: string, glossary: Map<string, string>): void {
    this._domainGlossaries.set(domain, glossary);
  }

  /**
   * Compare two translations and pick the better one
   */
  compareTranslations(source: string, translation1: string, translation2: string, reference: string): { winner: 1 | 2; score1: number; score2: number } {
    const score1 = this.bleuScore(translation1, [reference]);
    const score2 = this.bleuScore(translation2, [reference]);
    return {
      winner: score1 >= score2 ? 1 : 2,
      score1,
      score2
    };
  }

  /**
   * Round-trip translation consistency check
   */
  roundTripCheck(text: string, sourceLang: string, targetLang: string): { roundTrip: string; similarity: number } {
    const forward = this.translate(text, sourceLang, targetLang);
    const back = this.translate(forward, targetLang, sourceLang);
    const similarity = this._stringSimilarity(text.toLowerCase(), back.toLowerCase());
    return { roundTrip: back, similarity };
  }

  /**
   * Get translation history
   */
  getHistory(n: number = 10): Translation[] {
    return this._translations.slice(-n);
  }

  /**
   * Clear translation memory
   */
  clearTranslationMemory(): void {
    this._translationMemory = [];
  }

  /**
   * Export translation memory to JSON
   */
  exportTranslationMemory(): string {
    return JSON.stringify(this._translationMemory);
  }

  /**
   * Import translation memory from JSON
   */
  importTranslationMemory(json: string): void {
    try {
      const parsed = JSON.parse(json);
      if (Array.isArray(parsed)) {
        this._translationMemory = parsed;
      }
    } catch {
      // Ignore parse errors
    }
  }

  /**
   * Generate a stable hash
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
   * Serialize state
   */
  serialize(): string {
    return JSON.stringify({
      sourceLang: this._sourceLang,
      targetLang: this._targetLang,
      modelName: this._modelName,
      strategy: this._strategy,
      glossary: Array.from(this._glossary.entries()),
      translationMemory: this._translationMemory,
      supportedLangs: Array.from(this._supportedLangs)
    });
  }

  /**
   * Deserialize state
   */
  deserialize(json: string): void {
    try {
      const obj = JSON.parse(json);
      if (obj.sourceLang) this._sourceLang = obj.sourceLang;
      if (obj.targetLang) this._targetLang = obj.targetLang;
      if (obj.modelName) this._modelName = obj.modelName;
      if (obj.strategy) this._strategy = obj.strategy;
      if (obj.translationMemory) this._translationMemory = obj.translationMemory;
      if (obj.glossary) {
        for (const [k, v] of obj.glossary) {
          this._glossary.set(k, v);
        }
      }
      if (obj.supportedLangs) {
        this._supportedLangs = new Set(obj.supportedLangs);
      }
    } catch {
      // Ignore errors
    }
  }

  /**
   * Wrap result in a DataPacket for transport
   */
  toPacket(): DataPacket<Translation> {
    const result = this._lastResult || { source: '', target: '', sourceLang: '', targetLang: '', confidence: 0 };
    this._counter++;
    return {
      id: `translation-${Date.now()}-${this._counter}`,
      payload: result,
      metadata: {
        createdAt: Date.now(),
        route: ['nlp', 'translation'],
        priority: 1,
        phase: 'translation'
      }
    };
  }

  /**
   * Reset all state
   */
  reset(): void {
    this._translations = [];
    this._sourceLang = 'en';
    this._targetLang = 'zh';
    this._counter = 0;
    this._modelName = 'default';
    this._lastResult = null;
    this._translationMemory = [];
    this._phraseTables.clear();
    this._languageModels.clear();
    this._strategy = 'neural';
  }
}
