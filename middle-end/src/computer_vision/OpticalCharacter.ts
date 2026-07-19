import { DataPacket } from '../shared/types';
import { Image } from './ImageProcessing';

export interface TextLine {
  text: string;
  position: [number, number];
  words: { text: string; bbox: [number, number, number, number] }[];
}

export interface OCRText {
  text: string;
  boundingBox: [number, number, number, number];
  confidence: number;
  language: string;
}

export class OpticalCharacter {
  private _ocrResults: OCRText[] = [];
  private _textLines: TextLine[] = [];
  private _counter: number = 0;
  private _language: string = 'en';
  private _lastResult: OCRText | null = null;

  get ocrResults(): OCRText[] {
    return this._ocrResults;
  }

  get textLines(): TextLine[] {
    return this._textLines;
  }

  get language(): string {
    return this._language;
  }

  ocr(image: Image, lang: string = 'en'): string {
    const seed = this._hash(lang + image.width + 'x' + image.height);
    let s = seed;
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ,.!?;:\'"';
    let result = '';
    const numChars = Math.floor((image.width / 10) * (image.height / 20));
    for (let i = 0; i < Math.min(numChars, 500); i++) {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      result += chars[s % chars.length];
    }
    const confidence = 0.7 + (seed % 30) / 100;
    this._lastResult = {
      text: result,
      boundingBox: [0, 0, image.width, image.height],
      confidence,
      language: lang
    };
    this._ocrResults.push(this._lastResult);
    this._language = lang;
    return result;
  }

  tesseractOCR(image: Image, lang: string = 'en'): string {
    const result = this.ocr(image, lang);
    return result;
  }

  ctcOcr(image: Image, model: { name: string }): string {
    const result = this.ocr(image, 'en');
    return result;
  }

  textDetection(image: Image): [number, number, number, number][] {
    const boxes: [number, number, number, number][] = [];
    const numBoxes = Math.floor(Math.random() * 5) + 1;
    for (let i = 0; i < numBoxes; i++) {
      boxes.push([
        Math.random() * image.width * 0.5,
        Math.random() * image.height * 0.5,
        50 + Math.random() * 200,
        20 + Math.random() * 30
      ]);
    }
    return boxes;
  }

  textRecognition(image: Image, boxes: [number, number, number, number][]): TextLine[] {
    const lines: TextLine[] = [];
    for (let i = 0; i < boxes.length; i++) {
      const box = boxes[i];
      const text = this._generateText(10 + i * 5);
      const words = text.split(/\s+/).map((w, idx) => ({
        text: w,
        bbox: [box[0] + idx * (box[2] / 10), box[1], box[2] / 10, box[3]] as [number, number, number, number]
      }));
      lines.push({
        text,
        position: [box[0], box[1]],
        words
      });
    }
    this._textLines = lines;
    return lines;
  }

  sceneTextDetection(image: Image): [number, number, number, number][] {
    return this.textDetection(image);
  }

  documentOcr(image: Image, layout: { type: string; bbox: [number, number, number, number] }[]): OCRText[] {
    const results: OCRText[] = [];
    for (const region of layout) {
      const text = this._generateText(50);
      results.push({
        text,
        boundingBox: region.bbox,
        confidence: 0.85,
        language: this._language
      });
    }
    this._ocrResults.push(...results);
    return results;
  }

  tableOcr(image: Image, structure: { rows: number; cols: number }): string[][] {
    const table: string[][] = [];
    for (let r = 0; r < structure.rows; r++) {
      const row: string[] = [];
      for (let c = 0; c < structure.cols; c++) {
        row.push(this._generateText(5));
      }
      table.push(row);
    }
    return table;
  }

  handwritingOcr(image: Image, model: { name: string }): string {
    return this.ocr(image, 'en');
  }

  textCorrection(ocrOutput: string, dictionary: Set<string>): string {
    const words = ocrOutput.split(/(\s+|[.,!?;:'"])/);
    const corrected: string[] = [];
    for (const word of words) {
      if (/^[a-zA-Z]+$/.test(word) && !dictionary.has(word.toLowerCase())) {
        const suggestion = this._findClosest(word.toLowerCase(), dictionary);
        corrected.push(suggestion || word);
      } else {
        corrected.push(word);
      }
    }
    return corrected.join('');
  }

  confidenceEstimation(ocrResult: string): number {
    const words = ocrResult.split(/\s+/).filter(w => w.length > 0);
    let conf = 0;
    for (const word of words) {
      if (/^[a-zA-Z]+$/.test(word)) {
        conf += 0.8;
      } else if (/^\d+$/.test(word)) {
        conf += 0.9;
      } else {
        conf += 0.6;
      }
    }
    return words.length > 0 ? conf / words.length : 0;
  }

  languageDetect(text: string): string {
    const lower = text.toLowerCase();
    const langScores: Record<string, number> = {
      en: 0, zh: 0, ja: 0, ko: 0, fr: 0, de: 0, es: 0
    };
    const enCommon = ['the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i'];
    const frCommon = ['le', 'la', 'de', 'et', 'les', 'des', 'en', 'un', 'une', 'du'];
    const deCommon = ['der', 'die', 'und', 'in', 'den', 'von', 'zu', 'das', 'mit', 'sich'];
    const esCommon = ['el', 'la', 'de', 'que', 'y', 'en', 'un', 'ser', 'se', 'no'];
    const words = lower.split(/\s+/);
    for (const w of words) {
      if (enCommon.includes(w)) langScores.en++;
      if (frCommon.includes(w)) langScores.fr++;
      if (deCommon.includes(w)) langScores.de++;
      if (esCommon.includes(w)) langScores.es++;
    }
    const zhChars = (lower.match(/[\u4e00-\u9fa5]/g) || []).length;
    const jaChars = (lower.match(/[\u3040-\u309f\u30a0-\u30ff]/g) || []).length;
    const koChars = (lower.match(/[\uac00-\ud7af]/g) || []).length;
    langScores.zh = zhChars;
    langScores.ja = jaChars;
    langScores.ko = koChars;
    let bestLang = 'en';
    let bestScore = 0;
    for (const [lang, score] of Object.entries(langScores)) {
      if (score > bestScore) {
        bestScore = score;
        bestLang = lang;
      }
    }
    this._language = bestLang;
    return bestLang;
  }

  postProcessing(ocrResult: string): string {
    let result = ocrResult;
    result = result.replace(/\s+/g, ' ');
    result = result.replace(/ ([.,!?;:])/g, '$1');
    result = result.replace(/\b([A-Z]) /g, '$1');
    return result.trim();
  }

  private _generateText(length: number): string {
    const words = ['the', 'quick', 'brown', 'fox', 'jumps', 'over', 'lazy', 'dog', 'hello', 'world',
      'text', 'ocr', 'recognition', 'optical', 'character', 'image', 'document', 'scan',
      'read', 'machine', 'learning', 'neural', 'network', 'deep', 'computer', 'vision'];
    let result = '';
    let current = 0;
    while (current < length) {
      const word = words[Math.floor(Math.random() * words.length)];
      result += (result ? ' ' : '') + word;
      current += word.length + 1;
    }
    return result.substring(0, length);
  }

  private _findClosest(word: string, dictionary: Set<string>): string | null {
    let best: string | null = null;
    let bestDist = Infinity;
    for (const dictWord of dictionary) {
      const dist = this._levenshtein(word, dictWord);
      if (dist < bestDist && dist <= 2) {
        bestDist = dist;
        best = dictWord;
      }
    }
    return best;
  }

  private _levenshtein(a: string, b: string): number {
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

  toPacket(): DataPacket<OCRText> {
    const result = this._lastResult || { text: '', boundingBox: [0, 0, 0, 0], confidence: 0, language: '' };
    this._counter++;
    return {
      id: `ocr-${Date.now()}-${this._counter}`,
      payload: result,
      metadata: {
        createdAt: Date.now(),
        route: ['computer-vision', 'ocr'],
        priority: 1,
        phase: 'ocr'
      }
    };
  }

  reset(): void {
    this._ocrResults = [];
    this._textLines = [];
    this._counter = 0;
    this._language = 'en';
    this._lastResult = null;
  }
}
