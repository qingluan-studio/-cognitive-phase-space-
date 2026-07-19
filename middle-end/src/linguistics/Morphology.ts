import { DataPacket, PacketMeta } from '../shared/types';

/** Morpheme type. */
export type MorphemeType = 'root' | 'prefix' | 'suffix' | 'infix' | 'circumfix' | 'stem' | 'clitic';

/** A morpheme. */
export interface Morpheme {
  id: string;
  type: MorphemeType;
  form: string;
  meaning: string;
  allomorphs: string[];
}

/** A word formation process. */
export interface WordFormation {
  id: string;
  process: 'inflection' | 'derivation' | 'compounding' | 'blending' | 'clipping' | 'acronym' | 'reduplication';
  base: string;
  result: string;
  affixes: string[];
}

/** A paradigm of forms. */
export interface Paradigm {
  lemma: string;
  category: string;
  forms: Map<string, string>;
}

/** History record. */
interface MorphRecord {
  operation: string;
  word: string;
  timestamp: number;
}

const COMMON_AFFIXES: Record<string, { type: MorphemeType; meaning: string }> = {
  'un-': { type: 'prefix', meaning: 'negation' },
  're-': { type: 'prefix', meaning: 'repetition' },
  'pre-': { type: 'prefix', meaning: 'before' },
  'dis-': { type: 'prefix', meaning: 'opposite' },
  '-s': { type: 'suffix', meaning: 'plural' },
  '-ed': { type: 'suffix', meaning: 'past' },
  '-ing': { type: 'suffix', meaning: 'progressive' },
  '-er': { type: 'suffix', meaning: 'agent' },
  '-ly': { type: 'suffix', meaning: 'adverb' },
  '-ness': { type: 'suffix', meaning: 'state' },
  '-tion': { type: 'suffix', meaning: 'action' },
  '-able': { type: 'suffix', meaning: 'capable' },
};

export class Morphology {
  private _morphemes: Map<string, Morpheme> = new Map();
  private _formations: WordFormation[] = [];
  private _paradigms: Paradigm[] = [];
  private _history: MorphRecord[] = [];
  private _counter = 0;

  constructor() {
    this._initMorphemes();
  }

  segment(word: string): string[] {
    const segments: string[] = [];
    let remaining = word;
    while (remaining.length > 0) {
      const matched = this._longestMatch(remaining);
      if (matched) {
        segments.push(matched);
        remaining = remaining.slice(matched.length);
      } else {
        segments.push(remaining[0]);
        remaining = remaining.slice(1);
      }
    }
    return segments;
  }

  identifyMorphemes(word: string): Morpheme[] {
    const segments = this.segment(word);
    const result: Morpheme[] = [];
    for (const seg of segments) {
      const morpheme = this._morphemes.get(seg);
      if (morpheme) result.push(morpheme);
      else {
        const id = `morph-${++this._counter}`;
        const newMorph: Morpheme = { id, type: 'root', form: seg, meaning: '?', allomorphs: [] };
        this._morphemes.set(seg, newMorph);
        result.push(newMorph);
      }
    }
    this._history.push({ operation: 'identifyMorphemes', word, timestamp: Date.now() });
    return result;
  }

  inflect(lemma: string, features: Record<string, string>): string {
    let result = lemma;
    if (features.number === 'plural') result += 's';
    if (features.tense === 'past') result += 'ed';
    if (features.tense === 'progressive') result += 'ing';
    if (features.case === 'possessive') result += "'s";
    if (features.degree === 'comparative') result += 'er';
    if (features.degree === 'superlative') result += 'est';
    const formation: WordFormation = {
      id: `form-${++this._counter}`,
      process: 'inflection',
      base: lemma,
      result,
      affixes: Object.keys(features),
    };
    this._formations.push(formation);
    return result;
  }

  derive(base: string, affix: string): string {
    const affixInfo = COMMON_AFFIXES[affix];
    if (!affixInfo) return base;
    let result = base;
    if (affixInfo.type === 'prefix') result = affix.replace('-', '') + base;
    else if (affixInfo.type === 'suffix') result = base + affix.replace('-', '');
    const formation: WordFormation = {
      id: `form-${++this._counter}`,
      process: 'derivation',
      base,
      result,
      affixes: [affix],
    };
    this._formations.push(formation);
    return result;
  }

  compound(word1: string, word2: string): string {
    const result = word1 + word2;
    const formation: WordFormation = {
      id: `form-${++this._counter}`,
      process: 'compounding',
      base: word1,
      result,
      affixes: [word2],
    };
    this._formations.push(formation);
    return result;
  }

  blend(word1: string, word2: string): string {
    const half1 = word1.slice(0, Math.ceil(word1.length / 2));
    const half2 = word2.slice(Math.floor(word2.length / 2));
    const result = half1 + half2;
    const formation: WordFormation = {
      id: `form-${++this._counter}`,
      process: 'blending',
      base: word1,
      result,
      affixes: [word2],
    };
    this._formations.push(formation);
    return result;
  }

  reduplication(word: string): string {
    const result = word + word;
    const formation: WordFormation = {
      id: `form-${++this._counter}`,
      process: 'reduplication',
      base: word,
      result,
      affixes: [],
    };
    this._formations.push(formation);
    return result;
  }

  clipping(word: string): string {
    const result = word.slice(0, Math.ceil(word.length / 2));
    const formation: WordFormation = {
      id: `form-${++this._counter}`,
      process: 'clipping',
      base: word,
      result,
      affixes: [],
    };
    this._formations.push(formation);
    return result;
  }

  acronym(phrase: string): string {
    const result = phrase.split(/\s+/).map(w => w[0]?.toUpperCase() ?? '').join('');
    const formation: WordFormation = {
      id: `form-${++this._counter}`,
      process: 'acronym',
      base: phrase,
      result,
      affixes: [],
    };
    this._formations.push(formation);
    return result;
  }

  inflectionalParadigm(lemma: string): Paradigm {
    const forms = new Map<string, string>();
    forms.set('singular', lemma);
    forms.set('plural', this.inflect(lemma, { number: 'plural' }));
    forms.set('past', this.inflect(lemma, { tense: 'past' }));
    forms.set('progressive', this.inflect(lemma, { tense: 'progressive' }));
    forms.set('possessive', this.inflect(lemma, { case: 'possessive' }));
    const paradigm: Paradigm = { lemma, category: 'default', forms };
    this._paradigms.push(paradigm);
    return paradigm;
  }

  derivationalChain(base: string): string[] {
    const chain = [base];
    const affixes = Object.keys(COMMON_AFFIXES).filter(a => COMMON_AFFIXES[a].type === 'suffix');
    for (const affix of affixes.slice(0, 5)) {
      chain.push(this.derive(chain[chain.length - 1], affix));
    }
    return chain;
  }

  allomorph(morpheme: string, environment: string): string {
    if (morpheme === '-s') {
      if (/[sxz]$/.test(environment)) return '-es';
      if (/[aeiou]$/.test(environment)) return '-s';
      return '-s';
    }
    if (morpheme === '-ed') {
      if (/t$/.test(environment) || /d$/.test(environment)) return '-ed';
      return '-ed';
    }
    if (morpheme === 'in-') {
      if (/^[lp]/.test(environment)) return 'il-';
      if (/^[rm]/.test(environment)) return 'ir-';
      return 'in-';
    }
    return morpheme;
  }

  morphemeOrder(word: string): MorphemeType[] {
    const segments = this.segment(word);
    return segments.map(s => this._morphemes.get(s)?.type ?? 'root');
  }

  lexicalCategory(word: string): string {
    if (word.endsWith('ly')) return 'adverb';
    if (word.endsWith('ness') || word.endsWith('tion') || word.endsWith('ment')) return 'noun';
    if (word.endsWith('able') || word.endsWith('ful') || word.endsWith('ous')) return 'adjective';
    if (word.endsWith('ed') || word.endsWith('ing')) return 'verb';
    if (word.endsWith('s')) return 'noun_plural';
    return 'noun';
  }

  stem(word: string): string {
    let result = word;
    const suffixes = ['ing', 'ed', 'ly', 'ness', 'tion', 'ment', 'able', 'ful', 'ous', 'er', 'est', 's'];
    for (const suf of suffixes) {
      if (result.endsWith(suf) && result.length > suf.length + 2) {
        result = result.slice(0, -suf.length);
        break;
      }
    }
    return result;
  }

  toPacket(): DataPacket<{ morphemes: Map<string, Morpheme>; formations: WordFormation[]; paradigms: Paradigm[]; history: MorphRecord[] }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['linguistics', 'Morphology'],
      priority: 1,
      phase: 'morphology',
    };
    return {
      id: `morphology-${Date.now().toString(36)}`,
      payload: {
        morphemes: this._morphemes,
        formations: this._formations,
        paradigms: this._paradigms,
        history: this._history,
      },
      metadata,
    };
  }

  reset(): void {
    this._morphemes = new Map();
    this._formations = [];
    this._paradigms = [];
    this._history = [];
    this._counter = 0;
    this._initMorphemes();
  }

  get morphemeCount(): number { return this._morphemes.size; }
  get formationCount(): number { return this._formations.length; }
  get paradigmCount(): number { return this._paradigms.length; }

  private _initMorphemes(): void {
    for (const [form, info] of Object.entries(COMMON_AFFIXES)) {
      const id = `morph-${form}`;
      this._morphemes.set(form, { id, type: info.type, form, meaning: info.meaning, allomorphs: [] });
    }
  }

  private _longestMatch(s: string): string | null {
    const matches = Object.keys(COMMON_AFFIXES).filter(a => {
      const stripped = a.replace('-', '');
      return a.endsWith('-') ? s.startsWith(stripped) : s.endsWith(stripped);
    });
    if (matches.length === 0) return null;
    matches.sort((a, b) => b.length - a.length);
    return matches[0].replace('-', '');
  }
}
