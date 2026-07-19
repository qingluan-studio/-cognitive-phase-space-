import { DataPacket, PacketMeta } from '../shared/types';

/** Phoneme type. */
export type PhonemeType = 'vowel' | 'consonant' | 'diphthong' | 'semivowel';

/** Voicing of a phoneme. */
export type Voicing = 'voiced' | 'voiceless' | 'aspirated';

/** Place of articulation. */
export type Place =
  | 'bilabial' | 'labiodental' | 'dental' | 'alveolar' | 'postalveolar'
  | 'retroflex' | 'palatal' | 'velar' | 'uvular' | 'pharyngeal' | 'glottal';

/** Manner of articulation. */
export type Manner =
  | 'plosive' | 'fricative' | 'affricate' | 'nasal' | 'lateral'
  | 'trill' | 'flap' | 'approximant';

/** A phoneme. */
export interface Phoneme {
  symbol: string;
  type: PhonemeType;
  voicing: Voicing;
  place: Place;
  manner: Manner;
  height?: number;
  backness?: number;
  rounded?: boolean;
}

/** A syllable. */
export interface Syllable {
  onset: string[];
  nucleus: string[];
  coda: string[];
  stress: number;
  tone: number;
}

/** Prosodic features. */
export interface Prosody {
  pitch: number;
  duration: number;
  intensity: number;
  stressPattern: number[];
  toneContour: number[];
}

/** History record. */
interface PhonRecord {
  operation: string;
  inputLength: number;
  timestamp: number;
}

const IPA_INVENTORY: Record<string, Phoneme> = {
  'p': { symbol: 'p', type: 'consonant', voicing: 'voiceless', place: 'bilabial', manner: 'plosive' },
  'b': { symbol: 'b', type: 'consonant', voicing: 'voiced', place: 'bilabial', manner: 'plosive' },
  't': { symbol: 't', type: 'consonant', voicing: 'voiceless', place: 'alveolar', manner: 'plosive' },
  'd': { symbol: 'd', type: 'consonant', voicing: 'voiced', place: 'alveolar', manner: 'plosive' },
  'k': { symbol: 'k', type: 'consonant', voicing: 'voiceless', place: 'velar', manner: 'plosive' },
  'g': { symbol: 'g', type: 'consonant', voicing: 'voiced', place: 'velar', manner: 'plosive' },
  'f': { symbol: 'f', type: 'consonant', voicing: 'voiceless', place: 'labiodental', manner: 'fricative' },
  'v': { symbol: 'v', type: 'consonant', voicing: 'voiced', place: 'labiodental', manner: 'fricative' },
  's': { symbol: 's', type: 'consonant', voicing: 'voiceless', place: 'alveolar', manner: 'fricative' },
  'z': { symbol: 'z', type: 'consonant', voicing: 'voiced', place: 'alveolar', manner: 'fricative' },
  'm': { symbol: 'm', type: 'consonant', voicing: 'voiced', place: 'bilabial', manner: 'nasal' },
  'n': { symbol: 'n', type: 'consonant', voicing: 'voiced', place: 'alveolar', manner: 'nasal' },
  'l': { symbol: 'l', type: 'consonant', voicing: 'voiced', place: 'alveolar', manner: 'lateral' },
  'r': { symbol: 'r', type: 'consonant', voicing: 'voiced', place: 'alveolar', manner: 'approximant' },
  'a': { symbol: 'a', type: 'vowel', voicing: 'voiced', place: 'glottal', manner: 'approximant', height: 1, backness: 2, rounded: false },
  'e': { symbol: 'e', type: 'vowel', voicing: 'voiced', place: 'glottal', manner: 'approximant', height: 2, backness: 2, rounded: false },
  'i': { symbol: 'i', type: 'vowel', voicing: 'voiced', place: 'glottal', manner: 'approximant', height: 3, backness: 1, rounded: false },
  'o': { symbol: 'o', type: 'vowel', voicing: 'voiced', place: 'glottal', manner: 'approximant', height: 2, backness: 3, rounded: true },
  'u': { symbol: 'u', type: 'vowel', voicing: 'voiced', place: 'glottal', manner: 'approximant', height: 3, backness: 3, rounded: true },
};

export class Phonetics {
  private _phonemes: Map<string, Phoneme> = new Map(Object.entries(IPA_INVENTORY));
  private _syllables: Syllable[] = [];
  private _history: PhonRecord[] = [];

  ipaToFeatures(symbol: string): Phoneme | null {
    return this._phonemes.get(symbol) ?? null;
  }

  featuresToIPA(features: Omit<Phoneme, 'symbol'>): string {
    for (const [sym, p] of this._phonemes) {
      if (p.type === features.type && p.voicing === features.voicing && p.place === features.place && p.manner === features.manner) {
        return sym;
      }
    }
    return '?';
  }

  syllabify(word: string): Syllable[] {
    const syllables: Syllable[] = [];
    let current: Syllable = { onset: [], nucleus: [], coda: [], stress: 0, tone: 0 };
    for (const c of word) {
      const phoneme = this._phonemes.get(c);
      if (phoneme?.type === 'vowel') {
        if (current.nucleus.length > 0) {
          syllables.push(current);
          current = { onset: [], nucleus: [], coda: [], stress: 0, tone: 0 };
        }
        current.nucleus.push(c);
      } else {
        if (current.nucleus.length === 0) current.onset.push(c);
        else current.coda.push(c);
      }
    }
    if (current.onset.length > 0 || current.nucleus.length > 0 || current.coda.length > 0) {
      syllables.push(current);
    }
    this._syllables = syllables;
    this._history.push({ operation: 'syllabify', inputLength: word.length, timestamp: Date.now() });
    return syllables;
  }

  stressPattern(word: string): number[] {
    const syllables = this.syllabify(word);
    return syllables.map((_, i) => i === 0 ? 1 : 0);
  }

  vowelHarmony(word: string): boolean {
    const vowels = word.split('').filter(c => this._phonemes.get(c)?.type === 'vowel');
    if (vowels.length < 2) return true;
    const firstBack = this._phonemes.get(vowels[0])?.backness ?? 2;
    return vowels.every(v => (this._phonemes.get(v)?.backness ?? 2) >= 2 === firstBack >= 2);
  }

  consonantAssimilation(word: string): string {
    let result = word;
    const assimilations: [string, string][] = [
      ['np', 'mp'], ['nb', 'mb'], ['nm', 'mm'], ['tn', 'nn'],
    ];
    for (const [from, to] of assimilations) {
      result = result.split(from).join(to);
    }
    return result;
  }

  toneContour(syllables: Syllable[]): number[] {
    return syllables.map((s, i) => s.tone || (i % 2 === 0 ? 1 : 0));
  }

  intonation(sentence: string): Prosody {
    const words = sentence.split(/\s+/);
    const pitches: number[] = [];
    const durations: number[] = [];
    for (const word of words) {
      const syl = this.syllabify(word);
      pitches.push(...syl.map((_, i) => 200 + i * 20));
      durations.push(...syl.map(() => 100));
    }
    const stressPattern = pitches.map((_, i) => i % 2 === 0 ? 1 : 0);
    return {
      pitch: pitches.reduce((s, v) => s + v, 0) / Math.max(1, pitches.length),
      duration: durations.reduce((s, v) => s + v, 0) / Math.max(1, durations.length),
      intensity: 0.7,
      stressPattern,
      toneContour: pitches,
    };
  }

  phonologicalRule(input: string, rule: { from: string; to: string; environment?: RegExp }): string {
    if (!rule.environment) return input.split(rule.from).join(rule.to);
    const matches = input.match(rule.environment);
    if (!matches) return input;
    return input.replace(rule.environment, m => m.split(rule.from).join(rule.to));
  }

  minimalPairs(word1: string, word2: string): { position: number; phoneme1: string; phoneme2: string }[] {
    const pairs: { position: number; phoneme1: string; phoneme2: string }[] = [];
    const minLen = Math.min(word1.length, word2.length);
    for (let i = 0; i < minLen; i++) {
      if (word1[i] !== word2[i]) {
        pairs.push({ position: i, phoneme1: word1[i], phoneme2: word2[i] });
      }
    }
    return pairs;
  }

  phonemeInventory(language: string): Phoneme[] {
    const inventories: Record<string, string[]> = {
      english: ['p', 'b', 't', 'd', 'k', 'g', 'f', 'v', 's', 'z', 'm', 'n', 'l', 'r', 'a', 'e', 'i', 'o', 'u'],
      mandarin: ['p', 't', 'k', 'm', 'n', 'l', 's', 'f', 'a', 'e', 'i', 'o', 'u'],
      japanese: ['p', 'b', 't', 'd', 'k', 'g', 's', 'z', 'm', 'n', 'r', 'a', 'e', 'i', 'o', 'u'],
    };
    const inv = inventories[language.toLowerCase()] ?? Object.keys(IPA_INVENTORY);
    return inv.map(s => this._phonemes.get(s)).filter((p): p is Phoneme => p !== undefined);
  }

  allophone(phoneme: string, environment: string): string {
    if (phoneme === 'p' && environment.includes('s')) return 'pʰ';
    if (phoneme === 't' && environment.includes('s')) return 'tʰ';
    if (phoneme === 't' && environment.includes('r')) return 'ɾ';
    if (phoneme === 'n' && environment.includes('k')) return 'ŋ';
    return phoneme;
  }

  coarticulation(sounds: string[]): string[] {
    const result: string[] = [];
    for (let i = 0; i < sounds.length; i++) {
      const prev = sounds[i - 1];
      const next = sounds[i + 1];
      let sound = sounds[i];
      if (next && this._phonemes.get(next)?.place === 'velar' && sound === 'n') sound = 'ŋ';
      if (prev && this._phonemes.get(prev)?.place === 'bilabial' && sound === 'n') sound = 'm';
      result.push(sound);
    }
    return result;
  }

  featureMatrix(phonemes: string[]): Phoneme[] {
    return phonemes.map(p => this._phonemes.get(p)).filter((p): p is Phoneme => p !== undefined);
  }

  toPacket(): DataPacket<{ phonemes: Map<string, Phoneme>; syllables: Syllable[]; history: PhonRecord[] }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['linguistics', 'Phonetics'],
      priority: 1,
      phase: 'phonetics',
    };
    return {
      id: `phonetics-${Date.now().toString(36)}`,
      payload: { phonemes: this._phonemes, syllables: this._syllables, history: this._history },
      metadata,
    };
  }

  reset(): void {
    this._phonemes = new Map(Object.entries(IPA_INVENTORY));
    this._syllables = [];
    this._history = [];
  }

  get phonemeCount(): number { return this._phonemes.size; }
  get syllableCount(): number { return this._syllables.length; }
  get historyCount(): number { return this._history.length; }
}
