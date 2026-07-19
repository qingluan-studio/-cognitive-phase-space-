import { DataPacket } from '../shared/types';

export interface Translation {
  source: string;
  target: string;
  sourceLang: string;
  targetLang: string;
  confidence: number;
}

export interface TranslationModel {
  name: string;
  sourceLang: string;
  targetLang: string;
}

export class MachineTranslation {
  private _translations: Translation[] = [];
  private _sourceLang: string = 'en';
  private _targetLang: string = 'zh';
  private _counter: number = 0;
  private _modelName: string = 'default';
  private _glossary: Map<string, string> = new Map();
  private _lastResult: Translation | null = null;

  constructor() {
    this._initDefaultGlossary();
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
      ['home', '家']
    ];
    for (const [en, zh] of pairs) {
      this._glossary.set(en, zh);
    }
  }

  translate(text: string, sourceLang: string, targetLang: string): string {
    let result = '';
    if (sourceLang === 'en' && targetLang === 'zh') {
      result = this._enToZh(text);
    } else if (sourceLang === 'zh' && targetLang === 'en') {
      result = this._zhToEn(text);
    } else {
      result = text;
    }
    const translation: Translation = {
      source: text,
      target: result,
      sourceLang,
      targetLang,
      confidence: 0.75
    };
    this._lastResult = translation;
    this._translations.push(translation);
    this._sourceLang = sourceLang;
    this._targetLang = targetLang;
    return result;
  }

  ruleBasedTranslate(text: string, rules: Map<string, string>, sourceLang: string, targetLang: string): string {
    let result = text;
    for (const [from, to] of rules) {
      const regex = new RegExp(from, 'gi');
      result = result.replace(regex, to);
    }
    const translation: Translation = {
      source: text,
      target: result,
      sourceLang,
      targetLang,
      confidence: 0.6
    };
    this._lastResult = translation;
    this._translations.push(translation);
    this._modelName = 'rule-based';
    return result;
  }

  statisticalTranslate(text: string, model: TranslationModel): string {
    const words = text.split(/\s+/);
    const translated: string[] = [];
    for (const word of words) {
      const clean = word.toLowerCase().replace(/[.,!?;:'"]$/, '');
      const gloss = this._glossary.get(clean);
      if (gloss) {
        translated.push(gloss);
      } else {
        const hash = this._hash(clean + model.name);
        const candidates = Array.from(this._glossary.values());
        translated.push(candidates[hash % candidates.length] || word);
      }
    }
    const result = translated.join('');
    const translation: Translation = {
      source: text,
      target: result,
      sourceLang: model.sourceLang,
      targetLang: model.targetLang,
      confidence: 0.65
    };
    this._lastResult = translation;
    this._translations.push(translation);
    this._modelName = 'statistical';
    return result;
  }

  neuralTranslate(text: string, model: TranslationModel): string {
    const result = this._pseudoTranslate(text, model.name, 0.8);
    const translation: Translation = {
      source: text,
      target: result,
      sourceLang: model.sourceLang,
      targetLang: model.targetLang,
      confidence: 0.8
    };
    this._lastResult = translation;
    this._translations.push(translation);
    this._modelName = 'neural';
    return result;
  }

  transformerTranslate(text: string, model: TranslationModel): string {
    const result = this._pseudoTranslate(text, model.name, 0.85);
    const translation: Translation = {
      source: text,
      target: result,
      sourceLang: model.sourceLang,
      targetLang: model.targetLang,
      confidence: 0.85
    };
    this._lastResult = translation;
    this._translations.push(translation);
    this._modelName = 'transformer';
    return result;
  }

  backTranslate(text: string, sourceLang: string, targetLang: string): string {
    const forward = this.translate(text, sourceLang, targetLang);
    const back = this.translate(forward, targetLang, sourceLang);
    return back;
  }

  glossaryTranslate(text: string, glossary: Map<string, string>): string {
    let result = text;
    const sortedKeys = Array.from(glossary.keys()).sort((a, b) => b.length - a.length);
    for (const key of sortedKeys) {
      const regex = new RegExp(key, 'gi');
      result = result.replace(regex, glossary.get(key)!);
    }
    return result;
  }

  pivotTranslate(text: string, pivotLang: string, targetLang: string): string {
    const sourceLang = this._detectLang(text);
    const pivot = this.translate(text, sourceLang, pivotLang);
    const result = this.translate(pivot, pivotLang, targetLang);
    const translation: Translation = {
      source: text,
      target: result,
      sourceLang,
      targetLang,
      confidence: 0.7
    };
    this._lastResult = translation;
    this._translations.push(translation);
    this._modelName = 'pivot';
    return result;
  }

  translateDirection(sourceLang: string, targetLang: string): boolean {
    const supported = ['en', 'zh', 'ja', 'ko', 'fr', 'de', 'es', 'it', 'ru', 'ar'];
    return supported.includes(sourceLang) && supported.includes(targetLang);
  }

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

  terScore(hypothesis: string, references: string[]): number {
    const hypWords = hypothesis.toLowerCase().split(/\s+/);
    const refWords = references[0]?.toLowerCase().split(/\s+/) || [];
    const edits = this._levenshteinDistance(hypWords, refWords);
    return edits / Math.max(hypWords.length, refWords.length, 1);
  }

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

  private _detectLang(text: string): string {
    const zhCount = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const enCount = (text.match(/[a-zA-Z]/g) || []).length;
    return zhCount > enCount ? 'zh' : 'en';
  }

  private _countNgrams(words: string[], n: number): Map<string, number> {
    const ngrams = new Map<string, number>();
    for (let i = 0; i <= words.length - n; i++) {
      const ngram = words.slice(i, i + n).join(' ');
      ngrams.set(ngram, (ngrams.get(ngram) || 0) + 1);
    }
    return ngrams;
  }

  private _charNgrams(text: string, n: number): Map<string, number> {
    const ngrams = new Map<string, number>();
    for (let i = 0; i <= text.length - n; i++) {
      const ngram = text.substring(i, i + n);
      ngrams.set(ngram, (ngrams.get(ngram) || 0) + 1);
    }
    return ngrams;
  }

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

  private _hash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

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

  reset(): void {
    this._translations = [];
    this._sourceLang = 'en';
    this._targetLang = 'zh';
    this._counter = 0;
    this._modelName = 'default';
    this._lastResult = null;
  }
}
