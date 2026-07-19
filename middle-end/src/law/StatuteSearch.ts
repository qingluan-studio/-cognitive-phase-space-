import { DataPacket, PacketMeta } from '../shared/types';

/** Hierarchical level of a legal instrument. */
export type StatuteLevel = 'constitutional' | 'statutory' | 'regulatory' | 'local' | 'judicial';

/** A statute / legal article. */
export interface Statute {
  readonly id: string;
  readonly title: string;
  readonly category: string;
  readonly content: string;
  readonly effectiveDate: number;
  readonly level: StatuteLevel;
  readonly repealed?: boolean;
  readonly amendedBy?: string[];
}

/** A cross-reference between statutes. */
export interface LegalReference {
  readonly from: string;
  readonly to: string;
  readonly relation: 'amends' | 'repeals' | 'cites' | 'incorporates' | 'supersedes';
  readonly note?: string;
}

/** A structured search query. */
export interface SearchQuery {
  readonly keyword?: string;
  readonly category?: string;
  readonly article?: string;
  readonly effectiveAfter?: number;
  readonly maxResults?: number;
}

/** Search result item. */
export interface SearchResult {
  readonly statute: Statute;
  readonly score: number;
  readonly snippet: string;
}

/** Hierarchy node. */
export interface HierarchyNode {
  readonly statuteId: string;
  readonly level: StatuteLevel;
  readonly parent?: string;
  readonly children: string[];
}

/**
 * StatuteSearch indexes statutes and supports keyword, category, article
 * lookups, cross-referencing, hierarchy, and repeal checks.
 */
export class StatuteSearch {
  private _statutes: Map<string, Statute> = new Map();
  private _categories: Map<string, string[]> = new Map();
  private _history: unknown[] = [];
  private _counter = 0;

  constructor() {
    this._seedStatutes();
  }

  get statuteCount(): number { return this._statutes.size; }
  get categoryCount(): number { return this._categories.size; }

  /** Add a new statute to the index. */
  addStatute(statute: Statute): Statute {
    this._statutes.set(statute.id, statute);
    const list = this._categories.get(statute.category) ?? [];
    list.push(statute.id);
    this._categories.set(statute.category, list);
    this._history.push({ op: 'addStatute', id: statute.id });
    return statute;
  }

  /** Run a structured search query. */
  search(query: SearchQuery): SearchResult[] {
    let results: SearchResult[] = [];
    const max = query.maxResults ?? 20;
    for (const statute of this._statutes.values()) {
      let score = 0;
      if (query.keyword) {
        score += this._scoreKeyword(statute, query.keyword);
      }
      if (query.category && statute.category === query.category) score += 0.3;
      if (query.article && statute.id === query.article) score += 1.0;
      if (query.effectiveAfter && statute.effectiveDate >= query.effectiveAfter) score += 0.1;
      if (score > 0) {
        results.push({
          statute,
          score: Number(score.toFixed(3)),
          snippet: statute.content.substring(0, 80),
        });
      }
    }
    results.sort((a, b) => b.score - a.score);
    results = results.slice(0, max);
    this._history.push({ op: 'search', query, hits: results.length });
    return results;
  }

  /** Search statutes by free keyword. */
  searchByKeyword(keyword: string): SearchResult[] {
    return this.search({ keyword, maxResults: 30 });
  }

  /** Search statutes by category. */
  searchByCategory(category: string): Statute[] {
    const ids = this._categories.get(category) ?? [];
    return ids.map(id => this._statutes.get(id)).filter(Boolean) as Statute[];
  }

  /** Look up a statute by article number. */
  searchByArticle(article: string): Statute | null {
    return this._statutes.get(article) ?? null;
  }

  /** Get a statute by id. */
  getStatute(id: string): Statute | null {
    return this._statutes.get(id) ?? null;
  }

  /** List amendments to a statute. */
  getAmendments(statuteId: string): Statute[] {
    const s = this._statutes.get(statuteId);
    if (!s?.amendedBy) return [];
    return s.amendedBy.map(id => this._statutes.get(id)).filter(Boolean) as Statute[];
  }

  /** Find statutes cross-referenced with a keyword. */
  crossReference(statuteId: string, keyword: string): LegalReference[] {
    const source = this._statutes.get(statuteId);
    if (!source) return [];
    const refs: LegalReference[] = [];
    for (const [id, target] of this._statutes) {
      if (id === statuteId) continue;
      if (target.content.includes(keyword) && source.content.includes(keyword)) {
        refs.push({ from: statuteId, to: id, relation: 'cites', note: `shared keyword: ${keyword}` });
      }
    }
    return refs;
  }

  /** Provide a textual interpretation of an article. */
  interpretation(article: string): { article: string; interpretation: string; elements: string[] } {
    const s = this._statutes.get(article);
    if (!s) return { article, interpretation: 'not-found', elements: [] };
    const elements = ['subject', 'object', 'verb', 'condition'];
    return {
      article,
      interpretation: `According to ${s.title}, ${s.content.substring(0, 60)}...`,
      elements,
    };
  }

  /** Provide a legal definition for a term. */
  legalDefinition(term: string): string {
    const map: Record<string, string> = {
      'contract': 'a legally enforceable agreement between parties',
      'tort': 'a civil wrong causing loss or harm',
      'negligence': 'failure to exercise reasonable care',
      'fiduciary': 'a person holding a position of trust',
      'damages': 'monetary compensation for loss',
      'injunction': 'a court order requiring or prohibiting action',
    };
    return map[term.toLowerCase()] ?? `no definition available for ${term}`;
  }

  /** Look up the effective date of a statute. */
  effectiveDate(statuteId: string): number | null {
    return this._statutes.get(statuteId)?.effectiveDate ?? null;
  }

  /** Check whether a statute has been repealed. */
  repealCheck(statuteId: string): { repealed: boolean; note: string } {
    const s = this._statutes.get(statuteId);
    if (!s) return { repealed: false, note: 'not-found' };
    return { repealed: !!s.repealed, note: s.repealed ? 'statute has been repealed' : 'in-force' };
  }

  /** Return the hierarchy node for a statute. */
  hierarchy(statuteId: string): HierarchyNode {
    const s = this._statutes.get(statuteId);
    const level: StatuteLevel = s?.level ?? 'statutory';
    const children: string[] = [];
    for (const c of this._statutes.values()) {
      if (c.amendedBy?.includes(statuteId)) children.push(c.id);
    }
    return { statuteId, level, parent: undefined, children };
  }

  private _scoreKeyword(statute: Statute, keyword: string): number {
    const k = keyword.toLowerCase();
    let score = 0;
    if (statute.title.toLowerCase().includes(k)) score += 0.5;
    if (statute.content.toLowerCase().includes(k)) score += 0.3;
    if (statute.category.toLowerCase().includes(k)) score += 0.2;
    return score;
  }

  private _seedStatutes(): void {
    const seeds: Statute[] = [
      { id: 'art-1', title: 'Freedom of Speech', category: 'constitutional', content: 'Congress shall make no law abridging freedom of speech', effectiveDate: 0, level: 'constitutional' },
      { id: 'art-14', title: 'Equal Protection', category: 'constitutional', content: 'No state shall deny equal protection of the laws', effectiveDate: 0, level: 'constitutional' },
      { id: 'ucc-2', title: 'Sales of Goods', category: 'commercial', content: 'Governs sales of goods transactions', effectiveDate: Date.UTC(1951, 0), level: 'statutory' },
      { id: 'reg-gdpr', title: 'Data Protection', category: 'privacy', content: 'Regulates processing of personal data', effectiveDate: Date.UTC(2018, 4, 25), level: 'regulatory' },
    ];
    for (const s of seeds) this.addStatute(s);
  }

  toPacket(): DataPacket<{
    statutes: number;
    categories: number;
    history: unknown[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['law', 'StatuteSearch'],
      priority: 1,
      phase: 'statute-search',
    };
    return {
      id: `statute-search-${Date.now().toString(36)}-${(++this._counter).toString(36)}`,
      payload: {
        statutes: this._statutes.size,
        categories: this._categories.size,
        history: [...this._history],
      },
      metadata,
    };
  }

  reset(): void {
    this._statutes.clear();
    this._categories.clear();
    this._history = [];
    this._counter = 0;
    this._seedStatutes();
  }
}
