import { DataPacket, PacketMeta } from '../shared/types';

/** A word's meaning. */
export interface Meaning {
  word: string;
  denotation: string[];
  connotation: 'positive' | 'negative' | 'neutral';
  sense: string;
  hypernyms: string[];
  hyponyms: string[];
}

/** A semantic role. */
export interface SemanticRole {
  role: 'agent' | 'patient' | 'theme' | 'experiencer' | 'beneficiary' | 'instrument' | 'location' | 'goal' | 'source' | 'time';
  argument: string;
  verb: string;
}

/** A proposition. */
export interface Proposition {
  predicate: string;
  arguments: string[];
  truthValue: boolean | null;
  negated: boolean;
}

/** History record. */
interface SemRecord {
  operation: string;
  input: string;
  timestamp: number;
}

const WORD_NET: Record<string, Meaning> = {
  'dog': { word: 'dog', denotation: ['canine', 'pet', 'animal'], connotation: 'positive', sense: 'domestic canine', hypernyms: ['canine', 'mammal'], hyponyms: ['puppy', 'poodle'] },
  'cat': { word: 'cat', denotation: ['feline', 'pet', 'animal'], connotation: 'neutral', sense: 'domestic feline', hypernyms: ['feline', 'mammal'], hyponyms: ['kitten', 'persian'] },
  'run': { word: 'run', denotation: ['move quickly', 'sprint'], connotation: 'neutral', sense: 'rapid locomotion', hypernyms: ['move'], hyponyms: ['sprint', 'jog'] },
  'happy': { word: 'happy', denotation: ['feeling joy', 'content'], connotation: 'positive', sense: 'positive emotion', hypernyms: ['emotion'], hyponyms: ['joyful', 'elated'] },
  'sad': { word: 'sad', denotation: ['feeling sorrow', 'unhappy'], connotation: 'negative', sense: 'negative emotion', hypernyms: ['emotion'], hyponyms: ['depressed', 'melancholy'] },
  'big': { word: 'big', denotation: ['large size'], connotation: 'neutral', sense: 'size attribute', hypernyms: ['size'], hyponyms: ['huge', 'enormous'] },
  'small': { word: 'small', denotation: ['little size'], connotation: 'neutral', sense: 'size attribute', hypernyms: ['size'], hyponyms: ['tiny', 'minute'] },
};

export class Semantics {
  private _meanings: Map<string, Meaning> = new Map(Object.entries(WORD_NET));
  private _roles: SemanticRole[] = [];
  private _propositions: Proposition[] = [];
  private _history: SemRecord[] = [];

  composeMeaning(words: string[]): Meaning {
    const meanings = words.map(w => this._meanings.get(w.toLowerCase())).filter((m): m is Meaning => m !== undefined);
    const combined: Meaning = {
      word: words.join(' '),
      denotation: meanings.flatMap(m => m.denotation),
      connotation: this._aggregateConnotation(meanings.map(m => m.connotation)),
      sense: meanings.map(m => m.sense).join('+'),
      hypernyms: meanings.flatMap(m => m.hypernyms),
      hyponyms: meanings.flatMap(m => m.hyponyms),
    };
    return combined;
  }

  truthConditions(proposition: Proposition): string {
    const args = proposition.arguments.join(', ');
    return `${proposition.negated ? 'NOT ' : ''}${proposition.predicate}(${args})`;
  }

  lambdaAbstraction(expr: string): string {
    if (expr.includes('(')) {
      const varName = 'x';
      return `λ${varName}.${expr}`;
    }
    return `λx.${expr}(x)`;
  }

  betaReduction(expr: string): string {
    const match = expr.match(/^\((λ\w)\.(.+)\)\((.+)\)$/);
    if (!match) return expr;
    const [, lambda, body, arg] = match;
    const varName = lambda[1];
    return body.split(varName).join(arg);
  }

  semanticRoles(verb: string, arguments_: string[]): SemanticRole[] {
    const roles: SemanticRole[] = [];
    const roleList: SemanticRole['role'][] = ['agent', 'patient', 'theme', 'instrument', 'location'];
    arguments_.forEach((arg, i) => {
      roles.push({ role: roleList[i] ?? 'theme', argument: arg, verb });
    });
    this._roles.push(...roles);
    return roles;
  }

  selectionalRestrictions(word: string): string[] {
    const meaning = this._meanings.get(word.toLowerCase());
    if (!meaning) return ['animate'];
    if (meaning.hypernyms.includes('animal')) return ['animate'];
    if (meaning.hypernyms.includes('emotion')) return ['human'];
    return ['concrete'];
  }

  entailment(p1: Proposition, p2: Proposition): boolean {
    if (p1.predicate === p2.predicate && p1.arguments.every(a => p2.arguments.includes(a))) return true;
    return false;
  }

  presupposition(sentence: string): string[] {
    const pres: string[] = [];
    if (/\bstop\b/i.test(sentence)) pres.push('subject did the action before');
    if (/\bagain\b/i.test(sentence)) pres.push('subject did it before');
    if (/\bcancel\b/i.test(sentence)) pres.push('arrangement existed');
    if (/\bregret\b/i.test(sentence)) pres.push('the event happened');
    if (/\brealize\b/i.test(sentence)) pres.push('the proposition is true');
    return pres;
  }

  anomaly(sentence: string): boolean {
    const words = sentence.toLowerCase().split(/\s+/);
    if (words.includes('colorless') && words.includes('green') && words.includes('ideas')) return true;
    if (words.includes('square') && words.includes('circle')) return true;
    return false;
  }

  ambiguity(sentence: string): string[] {
    const interpretations: string[] = [];
    const words = sentence.toLowerCase().split(/\s+/);
    if (words.includes('bank')) interpretations.push('financial institution', 'river edge');
    if (words.includes('light')) interpretations.push('not heavy', 'illumination');
    if (words.includes('fair')) interpretations.push('just', 'pale', 'carnival');
    if (words.includes('bat')) interpretations.push('animal', 'sports equipment');
    if (words.includes('saw')) interpretations.push('past tense of see', 'cutting tool');
    return interpretations.length === 0 ? ['unambiguous'] : interpretations;
  }

  synonymy(word1: string, word2: string): boolean {
    const m1 = this._meanings.get(word1.toLowerCase());
    const m2 = this._meanings.get(word2.toLowerCase());
    if (!m1 || !m2) return false;
    return m1.denotation.some(d => m2.denotation.includes(d));
  }

  antonymy(word1: string, word2: string): boolean {
    const pairs: [string, string][] = [
      ['big', 'small'], ['happy', 'sad'], ['hot', 'cold'], ['light', 'dark'], ['good', 'bad'],
      ['up', 'down'], ['left', 'right'], ['fast', 'slow'],
    ];
    return pairs.some(([a, b]) => (a === word1.toLowerCase() && b === word2.toLowerCase()) || (b === word1.toLowerCase() && a === word2.toLowerCase()));
  }

  hyponymy(word1: string, word2: string): boolean {
    const m1 = this._meanings.get(word1.toLowerCase());
    const m2 = this._meanings.get(word2.toLowerCase());
    if (!m1 || !m2) return false;
    return m1.hypernyms.includes(word2.toLowerCase()) || m2.hyponyms.includes(word1.toLowerCase());
  }

  meronymy(word1: string, word2: string): boolean {
    const pairs: [string, string][] = [
      ['hand', 'finger'], ['car', 'wheel'], ['tree', 'branch'], ['face', 'eye'],
      ['book', 'page'], ['house', 'room'], ['body', 'arm'],
    ];
    return pairs.some(([w, p]) => w === word1.toLowerCase() && p === word2.toLowerCase());
  }

  predicateLogic(sentence: string): string {
    const words = sentence.split(/\s+/).filter(w => w.length > 0);
    if (words.length < 2) return `P(${words[0] ?? 'x'})`;
    const subject = words[0].toLowerCase();
    const verb = words[1].toLowerCase();
    const obj = words[2]?.toLowerCase();
    if (obj) return `${verb}(${subject}, ${obj})`;
    return `${verb}(${subject})`;
  }

  modalLogic(sentence: string, modality: 'necessity' | 'possibility'): string {
    const operator = modality === 'necessity' ? '□' : '◇';
    const content = sentence.replace(/^(must|necessarily|necessarily|may|might|could|possibly)\s+/i, '');
    return `${operator}(${content})`;
  }

  toPacket(): DataPacket<{ meanings: Map<string, Meaning>; roles: SemanticRole[]; propositions: Proposition[]; history: SemRecord[] }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['linguistics', 'Semantics'],
      priority: 1,
      phase: 'semantics',
    };
    return {
      id: `semantics-${Date.now().toString(36)}`,
      payload: {
        meanings: this._meanings,
        roles: this._roles,
        propositions: this._propositions,
        history: this._history,
      },
      metadata,
    };
  }

  reset(): void {
    this._meanings = new Map(Object.entries(WORD_NET));
    this._roles = [];
    this._propositions = [];
    this._history = [];
  }

  get meaningCount(): number { return this._meanings.size; }
  get roleCount(): number { return this._roles.length; }
  get propositionCount(): number { return this._propositions.length; }

  private _aggregateConnotation(conns: ('positive' | 'negative' | 'neutral')[]): 'positive' | 'negative' | 'neutral' {
    const pos = conns.filter(c => c === 'positive').length;
    const neg = conns.filter(c => c === 'negative').length;
    if (pos > neg) return 'positive';
    if (neg > pos) return 'negative';
    return 'neutral';
  }
}
