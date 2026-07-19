import { DataPacket, PacketMeta } from '../shared/types';

/** A case with full briefing data. */
export interface Case {
  readonly id: string;
  readonly title: string;
  readonly court: string;
  readonly date: number;
  readonly parties: { plaintiff: string; defendant: string };
  readonly facts: string[];
  readonly issues: string[];
  readonly holding: string;
  readonly reasoning: string;
  readonly disposition: 'affirmed' | 'reversed' | 'remanded' | 'vacated';
  readonly jurisdiction?: string;
}

/** A precedent citation. */
export interface Precedent {
  readonly caseId: string;
  readonly issue: string;
  readonly binding: boolean;
  readonly treatment: 'followed' | 'distinguished' | 'overruled' | 'questioned';
}

/** A case citation record. */
export interface CaseCitation {
  readonly caseId: string;
  readonly reporter: string;
  readonly volume: number;
  readonly page: number;
  readonly year: number;
  readonly parallel?: string;
}

/** Extracted holding structure. */
export interface HoldingExtract {
  readonly caseId: string;
  readonly rule: string;
  readonly materialFacts: string[];
  readonly ratio: string;
}

/** Extracted rule of law. */
export interface RuleExtract {
  readonly caseId: string;
  readonly rule: string;
  readonly exceptions: string[];
  readonly broad: boolean;
}

/** Case brief. */
export interface CaseBrief {
  readonly caseId: string;
  readonly issue: string;
  readonly rule: string;
  readonly analysis: string;
  readonly conclusion: string;
  readonly dicta: string[];
}

/** Subsequent treatment of a prior case. */
export interface TreatmentHistory {
  readonly subsequentCase: string;
  readonly priorCase: string;
  readonly treatment: Precedent['treatment'];
  readonly explanation: string;
}

/**
 * CaseAnalyzer ingests legal cases, extracts holdings/rules/reasoning,
 * finds binding precedent, and produces case briefs.
 */
export class CaseAnalyzer {
  private _cases: Map<string, Case> = new Map();
  private _precedents: Precedent[] = [];
  private _citations: CaseCitation[] = [];
  private _history: unknown[] = [];
  private _counter = 0;

  get caseCount(): number { return this._cases.size; }
  get precedentCount(): number { return this._precedents.length; }
  get citationCount(): number { return this._citations.length; }

  /** Add a case to the analyzer. */
  addCase(c: Case): Case {
    this._cases.set(c.id, c);
    this._history.push({ op: 'addCase', id: c.id, title: c.title });
    return c;
  }

  /** Analyze a case and produce a structured brief. */
  analyze(caseId: string): CaseBrief | null {
    const c = this._cases.get(caseId);
    if (!c) return null;
    const brief: CaseBrief = {
      caseId,
      issue: c.issues.join('; '),
      rule: this._deriveRule(c),
      analysis: this._deriveAnalysis(c),
      conclusion: c.holding,
      dicta: this._extractDicta(c),
    };
    this._history.push({ op: 'analyze', caseId });
    return brief;
  }

  /** Extract the holding from a case. */
  extractHolding(caseId: string): HoldingExtract | null {
    const c = this._cases.get(caseId);
    if (!c) return null;
    return {
      caseId,
      rule: this._deriveRule(c),
      materialFacts: c.facts.slice(0, 3),
      ratio: c.holding,
    };
  }

  /** Extract the rule of law from a case. */
  extractRule(caseId: string): RuleExtract | null {
    const c = this._cases.get(caseId);
    if (!c) return null;
    return {
      caseId,
      rule: this._deriveRule(c),
      exceptions: this._inferExceptions(c),
      broad: c.facts.length <= 3,
    };
  }

  /** Extract the reasoning chain from a case. */
  extractReasoning(caseId: string): string | null {
    const c = this._cases.get(caseId);
    if (!c) return null;
    return `${c.id}: ${c.reasoning}`;
  }

  /** Find precedent cases for a given issue. */
  findPrecedent(issue: string): Precedent[] {
    const matches: Precedent[] = [];
    for (const c of this._cases.values()) {
      if (c.issues.some(i => i.toLowerCase().includes(issue.toLowerCase()))) {
        matches.push({
          caseId: c.id,
          issue,
          binding: c.jurisdiction === 'supreme',
          treatment: 'followed',
        });
      }
    }
    this._precedents.push(...matches);
    this._history.push({ op: 'findPrecedent', issue, hits: matches.length });
    return matches;
  }

  /** Determine whether a case is binding in a jurisdiction. */
  checkBinding(c: Case, jurisdiction: string): { binding: boolean; reason: string } {
    if (c.jurisdiction === jurisdiction) return { binding: true, reason: 'same-jurisdiction' };
    if (c.court === 'supreme') return { binding: true, reason: 'supreme-court-precedent' };
    return { binding: false, reason: 'persuasive-only' };
  }

  /** Distinguish a current case from a prior case. */
  distinguishCase(case1: string, case2: string): { material: boolean; differences: string[] } {
    const a = this._cases.get(case1);
    const b = this._cases.get(case2);
    if (!a || !b) return { material: false, differences: [] };
    const differences: string[] = [];
    if (a.court !== b.court) differences.push(`court: ${a.court} vs ${b.court}`);
    if (a.jurisdiction !== b.jurisdiction) differences.push(`jurisdiction differs`);
    const sharedFacts = a.facts.filter(f => b.facts.includes(f));
    if (sharedFacts.length < a.facts.length) differences.push('material-facts-diverge');
    return { material: differences.length > 0, differences };
  }

  /** Analogize two cases. */
  analogize(case1: string, case2: string): { similarity: number; sharedFacts: string[]; sharedIssues: string[] } {
    const a = this._cases.get(case1);
    const b = this._cases.get(case2);
    if (!a || !b) return { similarity: 0, sharedFacts: [], sharedIssues: [] };
    const sharedFacts = a.facts.filter(f => b.facts.includes(f));
    const sharedIssues = a.issues.filter(i => b.issues.includes(i));
    const sim = (sharedFacts.length + sharedIssues.length) / Math.max(1, a.facts.length + a.issues.length);
    return { similarity: Number(sim.toFixed(2)), sharedFacts, sharedIssues };
  }

  /** Generate a full case brief. */
  caseBrief(caseId: string): CaseBrief | null {
    return this.analyze(caseId);
  }

  /** Return the citation for a case. */
  caseCitation(caseId: string): CaseCitation | null {
    const existing = this._citations.find(c => c.caseId === caseId);
    if (existing) return existing;
    const c = this._cases.get(caseId);
    if (!c) return null;
    const citation: CaseCitation = {
      caseId,
      reporter: 'U.S.',
      volume: 500 + (this._counter % 200),
      page: 1 + (this._counter * 7) % 400,
      year: new Date(c.date).getUTCFullYear(),
    };
    this._counter++;
    this._citations.push(citation);
    return citation;
  }

  /** Determine how a subsequent case treated a prior case. */
  treatment(subsequentCase: string, priorCase: string): TreatmentHistory {
    const sub = this._cases.get(subsequentCase);
    const prior = this._cases.get(priorCase);
    let t: Precedent['treatment'] = 'followed';
    if (sub && prior) {
      const diff = this.distinguishCase(subsequentCase, priorCase);
      if (diff.material) t = 'distinguished';
      if (sub.court === 'supreme' && prior.court !== 'supreme') t = 'overruled';
    }
    return {
      subsequentCase,
      priorCase,
      treatment: t,
      explanation: `treatment: ${t}`,
    };
  }

  /** Return the key facts of a case. */
  keyFacts(caseId: string): string[] {
    const c = this._cases.get(caseId);
    return c ? [...c.facts] : [];
  }

  /** Return any dicta (non-binding observations) in a case. */
  dicta(caseId: string): string[] {
    const c = this._cases.get(caseId);
    return c ? this._extractDicta(c) : [];
  }

  /** Return the disposition of a case. */
  disposition(caseId: string): Case['disposition'] | null {
    const c = this._cases.get(caseId);
    return c?.disposition ?? null;
  }

  private _deriveRule(c: Case): string {
    return c.issues.length > 0 ? `rule-from-${c.id}: ${c.holding}` : 'no-rule-extracted';
  }

  private _deriveAnalysis(c: Case): string {
    return `${c.parties.plaintiff} v. ${c.parties.defendant}; reasoning: ${c.reasoning}`;
  }

  private _inferExceptions(c: Case): string[] {
    const ex: string[] = [];
    if (c.facts.length > 4) ex.push('narrow-facts');
    if (c.disposition === 'reversed') ex.push('reversed-on-review');
    return ex;
  }

  private _extractDicta(c: Case): string[] {
    return c.reasoning.split('. ').filter(s => s.includes('observe') || s.includes('note')).slice(0, 2);
  }

  toPacket(): DataPacket<{
    cases: number;
    precedents: Precedent[];
    citations: CaseCitation[];
    history: unknown[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['law', 'CaseAnalyzer'],
      priority: 1,
      phase: 'case-analysis',
    };
    return {
      id: `case-analyzer-${Date.now().toString(36)}-${(++this._counter).toString(36)}`,
      payload: {
        cases: this._cases.size,
        precedents: [...this._precedents],
        citations: [...this._citations],
        history: [...this._history],
      },
      metadata,
    };
  }

  reset(): void {
    this._cases.clear();
    this._precedents = [];
    this._citations = [];
    this._history = [];
    this._counter = 0;
  }
}
