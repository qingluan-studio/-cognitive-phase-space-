import { DataPacket, PacketMeta } from '../shared/types';

/** Parse tree node category. */
export type Category =
  | 'S' | 'NP' | 'VP' | 'PP' | 'N' | 'V' | 'ADJ' | 'ADV' | 'P' | 'DET'
  | 'CONJ' | 'AUX' | 'PRON' | 'NUM' | 'CP' | 'IP' | 'TP' | 'DP';

/** Parse tree node. */
export interface ParseTree {
  node: string;
  category: Category;
  children: ParseTree[];
  word?: string;
  features: Record<string, unknown>;
}

/** A constituent. */
export interface Constituent {
  type: Category;
  words: string[];
  span: [number, number];
  head: number;
}

/** A dependency relation. */
export interface Dependency {
  head: number;
  dependent: number;
  relation: string;
  headWord: string;
  dependentWord: string;
}

/** Grammar rule. */
export interface GrammarRule {
  lhs: Category;
  rhs: Category[];
}

/** History record. */
interface SyntaxRecord {
  operation: string;
  sentenceLength: number;
  timestamp: number;
}

const DEFAULT_GRAMMAR: GrammarRule[] = [
  { lhs: 'S', rhs: ['NP', 'VP'] },
  { lhs: 'NP', rhs: ['DET', 'N'] },
  { lhs: 'NP', rhs: ['PRON'] },
  { lhs: 'NP', rhs: ['N'] },
  { lhs: 'VP', rhs: ['V', 'NP'] },
  { lhs: 'VP', rhs: ['V', 'PP'] },
  { lhs: 'VP', rhs: ['V'] },
  { lhs: 'VP', rhs: ['AUX', 'V'] },
  { lhs: 'PP', rhs: ['P', 'NP'] },
];

export class Syntax {
  private _trees: Map<string, ParseTree> = new Map();
  private _constituents: Constituent[] = [];
  private _dependencies: Dependency[] = [];
  private _history: SyntaxRecord[] = [];
  private _grammar: GrammarRule[] = [...DEFAULT_GRAMMAR];

  parseSentence(sentence: string): ParseTree {
    const words = sentence.split(/\s+/).filter(w => w.length > 0);
    return this.constituencyParse(sentence);
  }

  constituencyParse(sentence: string): ParseTree {
    const words = sentence.split(/\s+/).filter(w => w.length > 0);
    const tagged = words.map(w => this._tagWord(w));
    const tree = this._buildParseTree(tagged);
    this._trees.set(`tree-${Date.now()}`, tree);
    this._history.push({ operation: 'constituencyParse', sentenceLength: words.length, timestamp: Date.now() });
    return tree;
  }

  dependencyParse(sentence: string): Dependency[] {
    const words = sentence.split(/\s+/).filter(w => w.length > 0);
    const tagged = words.map(w => this._tagWord(w));
    const deps: Dependency[] = [];
    let verbIdx = tagged.findIndex(t => t.category === 'V');
    if (verbIdx === -1) verbIdx = 0;
    for (let i = 0; i < words.length; i++) {
      if (i === verbIdx) continue;
      let relation = 'dep';
      if (tagged[i].category === 'DET' || tagged[i].category === 'ADJ') {
        let headNoun = tagged.findIndex((t, j) => j > i && t.category === 'N');
        if (headNoun === -1) headNoun = verbIdx;
        deps.push({ head: headNoun, dependent: i, relation: tagged[i].category === 'DET' ? 'det' : 'amod', headWord: words[headNoun], dependentWord: words[i] });
      } else if (tagged[i].category === 'N') {
        deps.push({ head: verbIdx, dependent: i, relation: i < verbIdx ? 'nsubj' : 'dobj', headWord: words[verbIdx], dependentWord: words[i] });
      } else if (tagged[i].category === 'P') {
        deps.push({ head: verbIdx, dependent: i, relation: 'prep', headWord: words[verbIdx], dependentWord: words[i] });
      } else if (tagged[i].category === 'ADV') {
        deps.push({ head: verbIdx, dependent: i, relation: 'advmod', headWord: words[verbIdx], dependentWord: words[i] });
      } else {
        deps.push({ head: verbIdx, dependent: i, relation, headWord: words[verbIdx], dependentWord: words[i] });
      }
    }
    this._dependencies = deps;
    return deps;
  }

  parseTree(sentence: string, _grammar: GrammarRule[]): ParseTree {
    return this.constituencyParse(sentence);
  }

  identifyConstituents(sentence: string): Constituent[] {
    const words = sentence.split(/\s+/).filter(w => w.length > 0);
    const tagged = words.map(w => this._tagWord(w));
    const constituents: Constituent[] = [];
    let i = 0;
    while (i < words.length) {
      const start = i;
      if (tagged[i].category === 'DET') {
        while (i < words.length && (tagged[i].category === 'DET' || tagged[i].category === 'ADJ' || tagged[i].category === 'N')) i++;
        constituents.push({ type: 'NP', words: words.slice(start, i), span: [start, i], head: i - 1 });
      } else if (tagged[i].category === 'V') {
        constituents.push({ type: 'VP', words: words.slice(i, i + 1), span: [i, i + 1], head: i });
        i++;
      } else if (tagged[i].category === 'P') {
        constituents.push({ type: 'P', words: words.slice(i, i + 1), span: [i, i + 1], head: i });
        i++;
      } else {
        constituents.push({ type: tagged[i].category, words: words.slice(i, i + 1), span: [i, i + 1], head: i });
        i++;
      }
    }
    this._constituents = constituents;
    return constituents;
  }

  phraseStructure(rules: GrammarRule[]): Map<Category, Category[][]> {
    const map = new Map<Category, Category[][]>();
    for (const rule of rules) {
      const existing = map.get(rule.lhs) ?? [];
      existing.push(rule.rhs);
      map.set(rule.lhs, existing);
    }
    return map;
  }

  xBarTheory(structure: ParseTree): ParseTree {
    const transform = (node: ParseTree): ParseTree => {
      if (node.children.length === 0) return node;
      if (node.category === 'N' || node.category === 'V' || node.category === 'P' || node.category === 'ADJ') {
        return { ...node, node: `${node.category}'`, children: node.children.map(transform) };
      }
      return { ...node, children: node.children.map(transform) };
    };
    return transform(structure);
  }

  treeAdjoining(initial: ParseTree, auxiliary: ParseTree): ParseTree {
    const clone = (n: ParseTree): ParseTree => ({ ...n, children: n.children.map(clone) });
    const result = clone(initial);
    const findAndReplace = (node: ParseTree): boolean => {
      if (node.category === auxiliary.category) {
        node.children = [...clone(auxiliary).children, ...node.children];
        return true;
      }
      for (const child of node.children) {
        if (findAndReplace(child)) return true;
      }
      return false;
    };
    findAndReplace(result);
    return result;
  }

  cCommand(node: ParseTree, target: ParseTree): boolean {
    if (!node.children || node.children.length === 0) return false;
    for (const sibling of node.children) {
      if (sibling === target) return true;
      const contains = (n: ParseTree): boolean => n === target || n.children.some(contains);
      if (contains(sibling)) return true;
    }
    return false;
  }

  binding(node: ParseTree): { binder: number; bound: number; type: 'A' | 'A-bar' | 'B' | 'C' }[] {
    const result: { binder: number; bound: number; type: 'A' | 'A-bar' | 'B' | 'C' }[] = [];
    let idx = 0;
    const visit = (n: ParseTree): void => {
      if (n.children.length === 0) {
        if (n.category === 'PRON') result.push({ binder: idx - 1, bound: idx, type: 'B' });
        if (n.word && n.word.endsWith('self')) result.push({ binder: idx - 1, bound: idx, type: 'A' });
        idx++;
      }
      for (const c of n.children) visit(c);
    };
    visit(node);
    return result;
  }

  syntacticMovement(structure: ParseTree): ParseTree {
    const clone = (n: ParseTree): ParseTree => ({ ...n, children: n.children.map(clone) });
    const result = clone(structure);
    let moved = false;
    const visit = (n: ParseTree): void => {
      if (moved) return;
      if (n.children.length > 1 && n.children[0].category === 'NP') {
        const movedNode = n.children.shift()!;
        n.children.unshift(movedNode);
        moved = true;
      }
      for (const c of n.children) visit(c);
    };
    visit(result);
    return result;
  }

  whMovement(sentence: string): { moved: string; trace: number; landingSite: number } {
    const words = sentence.split(/\s+/).filter(w => w.length > 0);
    const whIdx = words.findIndex(w => /^(what|who|where|when|why|how|which)$/i.test(w));
    if (whIdx === -1) return { moved: '', trace: -1, landingSite: -1 };
    return { moved: words[whIdx], trace: whIdx, landingSite: 0 };
  }

  headDirection(language: string): 'head-initial' | 'head-final' {
    const headInitial = ['english', 'french', 'spanish', 'arabic'];
    const headFinal = ['japanese', 'korean', 'turkish', 'hindi'];
    const lang = language.toLowerCase();
    if (headInitial.includes(lang)) return 'head-initial';
    if (headFinal.includes(lang)) return 'head-final';
    return 'head-initial';
  }

  agreementFeatures(head: ParseTree, dependent: ParseTree): Record<string, string> {
    return {
      number: (head.features.number as string) ?? 'singular',
      person: (head.features.person as string) ?? '3',
      gender: (head.features.gender as string) ?? 'neutral',
    };
  }

  toPacket(): DataPacket<{ trees: Map<string, ParseTree>; constituents: Constituent[]; dependencies: Dependency[]; history: SyntaxRecord[] }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['linguistics', 'Syntax'],
      priority: 1,
      phase: 'syntax',
    };
    return {
      id: `syntax-${Date.now().toString(36)}`,
      payload: {
        trees: this._trees,
        constituents: this._constituents,
        dependencies: this._dependencies,
        history: this._history,
      },
      metadata,
    };
  }

  reset(): void {
    this._trees = new Map();
    this._constituents = [];
    this._dependencies = [];
    this._history = [];
    this._grammar = [...DEFAULT_GRAMMAR];
  }

  get treeCount(): number { return this._trees.size; }
  get constituentCount(): number { return this._constituents.length; }
  get dependencyCount(): number { return this._dependencies.length; }

  private _tagWord(word: string): { word: string; category: Category } {
    const w = word.toLowerCase().replace(/[^a-z']/g, '');
    if (/^(the|a|an|this|that|these|those)$/.test(w)) return { word, category: 'DET' };
    if (/^(he|she|it|they|i|you|we|him|her|them|us|me)$/.test(w)) return { word, category: 'PRON' };
    if (/^(is|are|was|were|be|been|being|have|has|had|do|does|did|will|would|shall|should|can|could|may|might|must)$/.test(w)) return { word, category: 'AUX' };
    if (/^(and|or|but|if|because|although|while|since|unless|until)$/.test(w)) return { word, category: 'CONJ' };
    if (/^(in|on|at|by|for|with|to|from|of|about|under|over|through|between)$/.test(w)) return { word, category: 'P' };
    if (/^\d+$/.test(w)) return { word, category: 'NUM' };
    if (word.endsWith('ly')) return { word, category: 'ADV' };
    if (word.endsWith('ing') || word.endsWith('ed') || /[^aeiou]ed$/.test(w)) return { word, category: 'V' };
    if (word.endsWith('ous') || word.endsWith('ful') || word.endsWith('able') || word.endsWith('ive') || word.endsWith('al')) return { word, category: 'ADJ' };
    if (/^(run|walk|eat|drink|sleep|see|hear|say|go|come|make|take|give|find|play|work|live)$/.test(w)) return { word, category: 'V' };
    return { word, category: 'N' };
  }

  private _buildParseTree(tagged: { word: string; category: Category }[]): ParseTree {
    if (tagged.length === 0) return { node: 'S', category: 'S', children: [], features: {} };
    const npNodes = tagged.filter(t => ['DET', 'N', 'PRON', 'ADJ'].includes(t.category));
    const vpNodes = tagged.filter(t => ['V', 'AUX', 'ADV'].includes(t.category));
    const np: ParseTree = {
      node: 'NP', category: 'NP', features: {},
      children: npNodes.map(t => ({ node: t.category, category: t.category, children: [], word: t.word, features: {} })),
    };
    const vp: ParseTree = {
      node: 'VP', category: 'VP', features: {},
      children: vpNodes.map(t => ({ node: t.category, category: t.category, children: [], word: t.word, features: {} })),
    };
    return { node: 'S', category: 'S', children: [np, vp], features: {} };
  }
}
