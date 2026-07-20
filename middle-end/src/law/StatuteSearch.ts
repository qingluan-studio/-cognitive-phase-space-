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

/** A statute citation in a foreign instrument. */
export interface StatuteCitation {
  readonly citingInstrument: string;
  readonly statuteId: string;
  readonly context: string;
  readonly treatment: 'positive' | 'negative' | 'neutral' | 'distinguished';
}

/** A statute index entry. */
export interface IndexEntry {
  readonly term: string;
  readonly statuteIds: string[];
  readonly frequency: number;
}

/** A jurisdiction descriptor. */
export interface Jurisdiction {
  readonly name: string;
  readonly level: 'federal' | 'state' | 'local' | 'international';
  readonly statutes: string[];
}

/** A statute version descriptor. */
export interface StatuteVersion {
  readonly statuteId: string;
  readonly version: number;
  readonly effectiveDate: number;
  readonly supersededBy?: string;
  readonly changes: string[];
}

/** A statute annotation. */
export interface StatuteAnnotation {
  readonly statuteId: string;
  readonly type: 'interpretive' | 'historical' | 'cross-reference' | 'note';
  readonly text: string;
  readonly authority?: string;
}

/** A search filter descriptor. */
export interface SearchFilter {
  readonly level?: StatuteLevel;
  readonly jurisdiction?: string;
  readonly effectiveBetween?: [number, number];
  readonly excludeRepealed?: boolean;
}

/** A statute element. */
export interface StatuteElement {
  readonly element: string;
  readonly description: string;
  readonly required: boolean;
}

/** A penalty descriptor. */
export interface PenaltyDescriptor {
  readonly statuteId: string;
  readonly type: 'fine' | 'imprisonment' | 'civil' | 'administrative';
  readonly minAmount?: number;
  readonly maxAmount?: number;
  readonly duration?: number;
}

/** A statute scope descriptor. */
export interface StatuteScope {
  readonly statuteId: string;
  readonly appliesTo: string[];
  readonly exceptions: string[];
  readonly territorial: string;
}

/**
 * StatuteSearch indexes statutes and supports keyword, category, article
 * lookups, cross-referencing, hierarchy, and repeal checks.
 */
export class StatuteSearch {
  private _statutes: Map<string, Statute> = new Map();
  private _categories: Map<string, string[]> = new Map();
  private _references: LegalReference[] = [];
  private _index: Map<string, IndexEntry> = new Map();
  private _versions: Map<string, StatuteVersion[]> = new Map();
  private _annotations: StatuteAnnotation[] = [];
  private _jurisdictions: Map<string, Jurisdiction> = new Map();
  private _history: unknown[] = [];
  private _counter = 0;

  constructor() {
    this._seedStatutes();
    this._seedJurisdictions();
  }

  get statuteCount(): number { return this._statutes.size; }
  get categoryCount(): number { return this._categories.size; }
  get referenceCount(): number { return this._references.length; }
  get indexSize(): number { return this._index.size; }
  get versionCount(): number { return this._versions.size; }
  get annotationCount(): number { return this._annotations.length; }
  get jurisdictionCount(): number { return this._jurisdictions.size; }

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

  private _seedJurisdictions(): void {
    const jurisdictions: Jurisdiction[] = [
      { name: 'federal', level: 'federal', statutes: ['art-1', 'art-14', 'ucc-2'] },
      { name: 'european-union', level: 'international', statutes: ['reg-gdpr'] },
      { name: 'state-california', level: 'state', statutes: [] },
    ];
    for (const j of jurisdictions) this._jurisdictions.set(j.name, j);
  }

  /** Run an advanced search with filters. */
  advancedSearch(query: SearchQuery, filter?: SearchFilter): SearchResult[] {
    let results = this.search(query);
    if (filter) {
      results = results.filter(r => {
        if (filter.level && r.statute.level !== filter.level) return false;
        if (filter.jurisdiction) {
          const jur = this._jurisdictions.get(filter.jurisdiction);
          if (!jur || !jur.statutes.includes(r.statute.id)) return false;
        }
        if (filter.effectiveBetween) {
          const [start, end] = filter.effectiveBetween;
          if (r.statute.effectiveDate < start || r.statute.effectiveDate > end) return false;
        }
        if (filter.excludeRepealed && r.statute.repealed) return false;
        return true;
      });
    }
    return results;
  }

  /** Add a cross-reference between two statutes. */
  addReference(reference: LegalReference): LegalReference {
    this._references.push(reference);
    this._history.push({ op: 'addReference', from: reference.from, to: reference.to });
    return reference;
  }

  /** List references originating from a statute. */
  referencesFrom(statuteId: string): LegalReference[] {
    return this._references.filter(r => r.from === statuteId);
  }

  /** List references pointing to a statute. */
  referencesTo(statuteId: string): LegalReference[] {
    return this._references.filter(r => r.to === statuteId);
  }

  /** Build an inverted index of statute terms. */
  buildIndex(): void {
    this._index.clear();
    for (const statute of this._statutes.values()) {
      const terms = new Set(`${statute.title} ${statute.content}`.toLowerCase().split(/\W+/).filter(t => t.length > 2));
      for (const term of terms) {
        const entry = this._index.get(term);
        if (entry) {
          this._index.set(term, { term, statuteIds: [...entry.statuteIds, statute.id], frequency: entry.frequency + 1 });
        } else {
          this._index.set(term, { term, statuteIds: [statute.id], frequency: 1 });
        }
      }
    }
  }

  /** Look up an index entry by term. */
  indexLookup(term: string): IndexEntry | null {
    return this._index.get(term.toLowerCase()) ?? null;
  }

  /** Compute term frequency-inverse document frequency. */
  tfidf(term: string, statuteId: string): number {
    const statute = this._statutes.get(statuteId);
    if (!statute) return 0;
    const text = `${statute.title} ${statute.content}`.toLowerCase();
    const termCount = (text.match(new RegExp(`\\b${term}\\b`, 'g')) || []).length;
    const tf = termCount / Math.max(1, text.split(/\s+/).length);
    const entry = this._index.get(term.toLowerCase());
    const df = entry?.frequency ?? 0;
    const idf = Math.log(this._statutes.size / Math.max(1, df));
    return Number((tf * idf).toFixed(4));
  }

  /** Register a new version of a statute. */
  registerVersion(statuteId: string, effectiveDate: number, changes: string[]): StatuteVersion {
    const existing = this._versions.get(statuteId) ?? [];
    const version = existing.length + 1;
    const lastVersion = existing[existing.length - 1];
    const newVersion: StatuteVersion = {
      statuteId,
      version,
      effectiveDate,
      changes,
    };
    if (lastVersion) {
      existing[existing.length - 1] = { ...lastVersion, supersededBy: newVersion.statuteId };
    }
    existing.push(newVersion);
    this._versions.set(statuteId, existing);
    return newVersion;
  }

  /** List all versions of a statute. */
  statuteVersions(statuteId: string): StatuteVersion[] {
    return this._versions.get(statuteId) ?? [];
  }

  /** Get the latest version of a statute. */
  latestVersion(statuteId: string): StatuteVersion | null {
    const versions = this.statuteVersions(statuteId);
    return versions.length > 0 ? versions[versions.length - 1] : null;
  }

  /** Add an annotation to a statute. */
  annotate(statuteId: string, annotation: Omit<StatuteAnnotation, 'statuteId'>): StatuteAnnotation {
    const full: StatuteAnnotation = { ...annotation, statuteId };
    this._annotations.push(full);
    return full;
  }

  /** List annotations for a statute. */
  annotations(statuteId: string): StatuteAnnotation[] {
    return this._annotations.filter(a => a.statuteId === statuteId);
  }

  /** Register a jurisdiction. */
  registerJurisdiction(jurisdiction: Jurisdiction): Jurisdiction {
    this._jurisdictions.set(jurisdiction.name, jurisdiction);
    return jurisdiction;
  }

  /** Get a jurisdiction by name. */
  getJurisdiction(name: string): Jurisdiction | null {
    return this._jurisdictions.get(name) ?? null;
  }

  /** List statutes in a jurisdiction. */
  statutesInJurisdiction(name: string): Statute[] {
    const jur = this._jurisdictions.get(name);
    if (!jur) return [];
    return jur.statutes.map(id => this._statutes.get(id)).filter(Boolean) as Statute[];
  }

  /** Find statutes citing a given statute. */
  citingStatutes(statuteId: string): StatuteCitation[] {
    const citations: StatuteCitation[] = [];
    for (const other of this._statutes.values()) {
      if (other.id === statuteId) continue;
      if (other.content.includes(statuteId)) {
        citations.push({
          citingInstrument: other.id,
          statuteId,
          context: other.content.substring(0, 100),
          treatment: 'neutral',
        });
      }
    }
    return citations;
  }

  /** Find statutes with similar content. */
  similarStatutes(statuteId: string, limit: number = 5): { statuteId: string; similarity: number }[] {
    const source = this._statutes.get(statuteId);
    if (!source) return [];
    const sourceTerms = new Set(source.content.toLowerCase().split(/\W+/));
    const similarities: { statuteId: string; similarity: number }[] = [];
    for (const other of this._statutes.values()) {
      if (other.id === statuteId) continue;
      const otherTerms = new Set(other.content.toLowerCase().split(/\W+/));
      const intersection = Array.from(sourceTerms).filter(t => otherTerms.has(t)).length;
      const union = new Set([...sourceTerms, ...otherTerms]).size;
      const similarity = union > 0 ? intersection / union : 0;
      similarities.push({ statuteId: other.id, similarity: Number(similarity.toFixed(3)) });
    }
    similarities.sort((a, b) => b.similarity - a.similarity);
    return similarities.slice(0, limit);
  }

  /** Compute a statute's age in years. */
  statuteAgeYears(statuteId: string): number {
    const s = this._statutes.get(statuteId);
    if (!s) return 0;
    const age = (Date.now() - s.effectiveDate) / (365.25 * 86400000);
    return Number(age.toFixed(2));
  }

  /** Determine if a statute is current (not repealed). */
  isCurrent(statuteId: string): boolean {
    const s = this._statutes.get(statuteId);
    return s ? !s.repealed : false;
  }

  /** Compute the average word count of statutes. */
  averageWordCount(): number {
    if (this._statutes.size === 0) return 0;
    const total = Array.from(this._statutes.values()).reduce((s, st) => s + st.content.split(/\s+/).length, 0);
    return Math.round(total / this._statutes.size);
  }

  /** Group statutes by level. */
  groupByLevel(): Record<StatuteLevel, Statute[]> {
    const groups: Record<StatuteLevel, Statute[]> = {
      constitutional: [],
      statutory: [],
      regulatory: [],
      local: [],
      judicial: [],
    };
    for (const s of this._statutes.values()) {
      groups[s.level].push(s);
    }
    return groups;
  }

  /** Extract defined terms from a statute. */
  definedTerms(statuteId: string): string[] {
    const s = this._statutes.get(statuteId);
    if (!s) return [];
    const matches = s.content.match(/"([^"]+)"|means\s+(\w+)/g) || [];
    return matches.map(m => m.replace(/"|means\s+/g, ''));
  }

  /** Find statutes effective within a date range. */
  effectiveBetween(start: number, end: number): Statute[] {
    return Array.from(this._statutes.values()).filter(s => s.effectiveDate >= start && s.effectiveDate <= end);
  }

  /** Find the most recently amended statute. */
  mostRecentlyAmended(): Statute | null {
    let best: Statute | null = null;
    let maxDate = 0;
    for (const s of this._statutes.values()) {
      if (s.amendedBy && s.amendedBy.length > 0) {
        const amended = s.amendedBy.map(id => this._statutes.get(id)?.effectiveDate ?? 0);
        const latest = Math.max(...amended);
        if (latest > maxDate) {
          maxDate = latest;
          best = s;
        }
      }
    }
    return best;
  }

  /** Compute a statute's complexity based on length and cross-references. */
  statuteComplexity(statuteId: string): number {
    const s = this._statutes.get(statuteId);
    if (!s) return 0;
    let score = Math.min(40, s.content.split(/\s+/).length / 5);
    score += Math.min(20, (this.referencesFrom(statuteId).length) * 2);
    score += Math.min(20, (this.referencesTo(statuteId).length) * 2);
    score += s.amendedBy ? Math.min(20, s.amendedBy.length * 4) : 0;
    return Math.min(100, Math.round(score));
  }

  /** Generate a statute summary. */
  statuteSummary(statuteId: string): Record<string, unknown> | null {
    const s = this._statutes.get(statuteId);
    if (!s) return null;
    return {
      id: s.id,
      title: s.title,
      category: s.category,
      level: s.level,
      effectiveDate: new Date(s.effectiveDate).toISOString(),
      repealed: !!s.repealed,
      amendmentCount: s.amendedBy?.length ?? 0,
      referenceCount: this.referencesFrom(statuteId).length + this.referencesTo(statuteId).length,
      annotationCount: this.annotations(statuteId).length,
      wordCount: s.content.split(/\s+/).length,
      complexity: this.statuteComplexity(statuteId),
    };
  }

  /** Search statutes by full-text query. */
  fullTextSearch(text: string, limit: number = 20): SearchResult[] {
    const terms = text.toLowerCase().split(/\W+/).filter(t => t.length > 2);
    const scored: SearchResult[] = [];
    for (const s of this._statutes.values()) {
      let score = 0;
      for (const term of terms) {
        score += this.tfidf(term, s.id);
      }
      if (score > 0) {
        scored.push({ statute: s, score: Number(score.toFixed(4)), snippet: s.content.substring(0, 80) });
      }
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit);
  }

  /** List all categories. */
  listCategories(): string[] {
    return Array.from(this._categories.keys());
  }

  /** List all jurisdictions. */
  listJurisdictions(): string[] {
    return Array.from(this._jurisdictions.keys());
  }

  /** Check whether a statute is part of a codification. */
  isCodified(statuteId: string): boolean {
    const s = this._statutes.get(statuteId);
    if (!s) return false;
    return s.level === 'statutory' || s.level === 'regulatory';
  }

  /** Compute the scope of a statute. */
  statuteScope(statuteId: string): StatuteScope | null {
    const s = this._statutes.get(statuteId);
    if (!s) return null;
    return {
      statuteId,
      appliesTo: [s.category],
      exceptions: s.repealed ? ['repealed'] : [],
      territorial: s.level === 'constitutional' ? 'national' : s.level === 'local' ? 'local' : 'varies',
    };
  }

  /** Extract statute elements (synthesized). */
  extractElements(statuteId: string): StatuteElement[] {
    const s = this._statutes.get(statuteId);
    if (!s) return [];
    const sentences = s.content.split(/[.;]/).filter(Boolean);
    return sentences.slice(0, 5).map((sentence, idx) => ({
      element: `element-${idx + 1}`,
      description: sentence.trim(),
      required: !sentence.includes('may'),
    }));
  }

  /** Compute a penalty descriptor for a statute. */
  penaltyDescriptor(statuteId: string): PenaltyDescriptor | null {
    const s = this._statutes.get(statuteId);
    if (!s) return null;
    const text = s.content.toLowerCase();
    let type: PenaltyDescriptor['type'] = 'civil';
    if (text.includes('imprison') || text.includes('felony')) type = 'imprisonment';
    else if (text.includes('fine') || text.includes('penalty')) type = 'fine';
    else if (text.includes('administrative')) type = 'administrative';
    const amountMatch = text.match(/\$([\d,]+)/);
    return {
      statuteId,
      type,
      minAmount: amountMatch ? parseInt(amountMatch[1].replace(/,/g, ''), 10) : undefined,
      maxAmount: amountMatch ? parseInt(amountMatch[1].replace(/,/g, ''), 10) * 10 : undefined,
      duration: type === 'imprisonment' ? 12 : undefined,
    };
  }

  /** Validate a statute's integrity. */
  validateStatute(statute: Statute): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    if (!statute.id) issues.push('missing-id');
    if (!statute.title) issues.push('missing-title');
    if (!statute.category) issues.push('missing-category');
    if (!statute.content) issues.push('missing-content');
    if (!statute.level) issues.push('missing-level');
    if (statute.repealed && !statute.amendedBy) issues.push('repealed-without-amendment-trail');
    return { valid: issues.length === 0, issues };
  }

  /** Compute the citation count for a statute. */
  citationCount(statuteId: string): number {
    return this.citingStatutes(statuteId).length;
  }

  /** Find statutes with overlapping scope. */
  overlappingScope(statuteId: string): string[] {
    const s = this._statutes.get(statuteId);
    if (!s) return [];
    return Array.from(this._statutes.values())
      .filter(other => other.id !== statuteId && other.category === s.category)
      .map(other => other.id);
  }

  /** Generate a table of authorities. */
  tableOfAuthorities(statuteIds: string[]): { statuteId: string; title: string; citation: string }[] {
    return statuteIds.map(id => {
      const s = this._statutes.get(id);
      return {
        statuteId: id,
        title: s?.title ?? 'unknown',
        citation: `${id} (${s ? new Date(s.effectiveDate).getUTCFullYear() : 'unknown'})`,
      };
    });
  }

  /** Compute the relevance score of a statute for a set of keywords. */
  relevanceScore(statuteId: string, keywords: string[]): number {
    const s = this._statutes.get(statuteId);
    if (!s) return 0;
    const text = `${s.title} ${s.content}`.toLowerCase();
    let score = 0;
    for (const k of keywords) {
      if (text.includes(k.toLowerCase())) score += 1;
    }
    return Number((score / Math.max(1, keywords.length)).toFixed(2));
  }

  /** Determine if a statute has been judicially interpreted. */
  hasJudicialInterpretation(statuteId: string): boolean {
    const annotations = this.annotations(statuteId);
    return annotations.some(a => a.type === 'interpretive' && a.authority?.includes('court'));
  }

  /** Generate a statute digest. */
  digest(statuteId: string, words: number = 50): string {
    const s = this._statutes.get(statuteId);
    if (!s) return 'not-found';
    const text = `${s.title}. ${s.content}`;
    return text.split(/\s+/).slice(0, words).join(' ');
  }

  /** Compute the amendment frequency. */
  amendmentFrequency(statuteId: string): number {
    const s = this._statutes.get(statuteId);
    if (!s || !s.amendedBy) return 0;
    const age = this.statuteAgeYears(statuteId);
    return age > 0 ? Number((s.amendedBy.length / age).toFixed(2)) : 0;
  }

  /** Determine the stability of a statute (low amendment frequency). */
  statuteStability(statuteId: string): 'stable' | 'moderate' | 'volatile' {
    const freq = this.amendmentFrequency(statuteId);
    if (freq < 0.1) return 'stable';
    if (freq < 0.5) return 'moderate';
    return 'volatile';
  }

  /** List repealed statutes. */
  repealedStatutes(): Statute[] {
    return Array.from(this._statutes.values()).filter(s => s.repealed);
  }

  /** List active (non-repealed) statutes. */
  activeStatutes(): Statute[] {
    return Array.from(this._statutes.values()).filter(s => !s.repealed);
  }

  /** Compute the percentage of repealed statutes. */
  repealRate(): number {
    if (this._statutes.size === 0) return 0;
    return Number((this.repealedStatutes().length / this._statutes.size).toFixed(2));
  }

  /** Find the longest statute by word count. */
  longestStatute(): Statute | null {
    let best: Statute | null = null;
    let max = 0;
    for (const s of this._statutes.values()) {
      const count = s.content.split(/\s+/).length;
      if (count > max) {
        max = count;
        best = s;
      }
    }
    return best;
  }

  /** Compute a statute's readability score. */
  readabilityScore(statuteId: string): number {
    const s = this._statutes.get(statuteId);
    if (!s) return 0;
    const sentences = s.content.split(/[.!?]+/).length;
    const words = s.content.split(/\s+/).length;
    if (sentences === 0) return 0;
    const avgWordsPerSentence = words / sentences;
    return Math.max(0, Math.min(100, Math.round(100 - avgWordsPerSentence)));
  }

  /** Recommend related statutes for a given statute. */
  recommendRelated(statuteId: string, limit: number = 5): string[] {
    return this.similarStatutes(statuteId, limit).map(s => s.statuteId);
  }

  /** Compute a statute's network centrality. */
  centrality(statuteId: string): number {
    return this.referencesFrom(statuteId).length + this.referencesTo(statuteId).length;
  }

  /** Generate a statute outline. */
  statuteOutline(statuteId: string): { section: string; content: string }[] {
    const s = this._statutes.get(statuteId);
    if (!s) return [];
    return [
      { section: 'Title', content: s.title },
      { section: 'ID', content: s.id },
      { section: 'Category', content: s.category },
      { section: 'Level', content: s.level },
      { section: 'Effective Date', content: new Date(s.effectiveDate).toISOString() },
      { section: 'Content', content: s.content },
      { section: 'Repealed', content: s.repealed ? 'yes' : 'no' },
      { section: 'Amendments', content: (s.amendedBy ?? []).join(', ') },
    ];
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
    this._references = [];
    this._index.clear();
    this._versions.clear();
    this._annotations = [];
    this._jurisdictions.clear();
    this._history = [];
    this._counter = 0;
    this._seedStatutes();
    this._seedJurisdictions();
  }
}
