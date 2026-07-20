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

/** A party to a case with role and representation. */
export interface Party {
  readonly name: string;
  readonly role: 'plaintiff' | 'defendant' | 'petitioner' | 'respondent' | 'appellant' | 'appellee' | 'intervenor';
  readonly representation?: string;
  readonly interests?: string[];
}

/** A material fact with provenance and weight. */
export interface MaterialFact {
  readonly statement: string;
  readonly disputed: boolean;
  readonly evidence: string[];
  readonly weight: 'low' | 'moderate' | 'high';
  readonly source?: string;
}

/** An issue presented to the court. */
export interface LegalIssue {
  readonly statement: string;
  readonly type: 'fact' | 'law' | 'mixed';
  readonly preserved: boolean;
  readonly standardOfReview: 'de novo' | 'clear-error' | 'abuse-of-discretion' | 'substantial-evidence';
}

/** A structured legal argument (IRAC). */
export interface StructuredArgument {
  readonly issue: string;
  readonly rule: string;
  readonly application: string;
  readonly conclusion: string;
  readonly counterarguments: string[];
}

/** Citation network node. */
export interface CitationNode {
  readonly caseId: string;
  readonly cites: string[];
  readonly citedBy: string[];
  readonly authorityDepth: number;
}

/** Opinion metadata. */
export interface OpinionMeta {
  readonly caseId: string;
  readonly author: string;
  readonly type: 'majority' | 'concurrence' | 'dissent' | 'per-curiam' | 'plurality';
  readonly joinedBy: string[];
  readonly wordCount: number;
}

/** Fact pattern extracted from a case. */
export interface FactPattern {
  readonly caseId: string;
  readonly actors: string[];
  readonly actions: string[];
  readonly context: string;
  readonly temporal: string;
}

/** Outcome prediction based on case features. */
export interface CaseOutcome {
  readonly caseId: string;
  readonly predictedWinner: 'plaintiff' | 'defendant';
  readonly confidence: number;
  readonly keyFactors: string[];
  readonly reasoning: string;
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

  /** Compute a numeric authority score for a case based on court and treatment. */
  authorityScore(caseId: string): number {
    const c = this._cases.get(caseId);
    if (!c) return 0;
    let score = 30;
    if (c.court === 'supreme') score += 50;
    else if (c.court === 'appellate') score += 30;
    else if (c.court === 'district') score += 10;
    if (c.jurisdiction === 'federal') score += 10;
    const treatments = this._precedents.filter(p => p.caseId === caseId);
    for (const t of treatments) {
      if (t.treatment === 'followed') score += 5;
      else if (t.treatment === 'distinguished') score -= 2;
      else if (t.treatment === 'overruled') score -= 40;
      else if (t.treatment === 'questioned') score -= 8;
    }
    return Math.max(0, Math.min(100, score));
  }

  /** Classify a case by subject area using fact and issue keywords. */
  classifySubject(caseId: string): string {
    const c = this._cases.get(caseId);
    if (!c) return 'unknown';
    const text = `${c.facts.join(' ')} ${c.issues.join(' ')} ${c.holding}`.toLowerCase();
    const taxonomy: Record<string, string[]> = {
      'tort': ['negligence', 'tort', 'liability', 'damages', 'injury'],
      'contract': ['contract', 'breach', 'agreement', 'performance', 'consideration'],
      'criminal': ['criminal', 'defendant', 'prosecution', 'guilty', 'offense'],
      'constitutional': ['constitutional', 'amendment', 'due-process', 'equal-protection'],
      'property': ['property', 'title', 'estate', 'easement', 'landlord'],
      'administrative': ['agency', 'administrative', 'regulation', 'rulemaking'],
      'family': ['divorce', 'custody', 'marriage', 'spousal', 'child'],
      'intellectual-property': ['patent', 'copyright', 'trademark', 'trade-secret'],
    };
    let best = 'unknown';
    let bestScore = 0;
    for (const [subject, keywords] of Object.entries(taxonomy)) {
      const score = keywords.reduce((s, k) => s + (text.includes(k) ? 1 : 0), 0);
      if (score > bestScore) {
        bestScore = score;
        best = subject;
      }
    }
    return best;
  }

  /** Summarize the procedural posture of a case. */
  proceduralPosture(caseId: string): string {
    const c = this._cases.get(caseId);
    if (!c) return 'unknown';
    const dispositionMap: Record<Case['disposition'], string> = {
      affirmed: 'affirmed on appeal',
      reversed: 'reversed on appeal',
      remanded: 'remanded for further proceedings',
      vacated: 'vacated and remanded',
    };
    return `${c.court} ${dispositionMap[c.disposition]}`;
  }

  /** Build a structured argument (IRAC) from a case. */
  structuredArgument(caseId: string): StructuredArgument | null {
    const c = this._cases.get(caseId);
    if (!c) return null;
    return {
      issue: c.issues.join('; '),
      rule: this._deriveRule(c),
      application: c.reasoning,
      conclusion: c.holding,
      counterarguments: this._extractDicta(c),
    };
  }

  /** Decompose a case into a list of material facts with weights. */
  materialFacts(caseId: string): MaterialFact[] {
    const c = this._cases.get(caseId);
    if (!c) return [];
    return c.facts.map((f, idx) => ({
      statement: f,
      disputed: idx % 3 === 0,
      evidence: [`exhibit-${idx + 1}`],
      weight: idx < 2 ? 'high' : idx < 4 ? 'moderate' : 'low',
      source: 'pleadings',
    }));
  }

  /** Decompose a case into structured legal issues. */
  legalIssues(caseId: string): LegalIssue[] {
    const c = this._cases.get(caseId);
    if (!c) return [];
    return c.issues.map((issue, idx) => ({
      statement: issue,
      type: idx % 3 === 0 ? 'law' : idx % 3 === 1 ? 'fact' : 'mixed',
      preserved: idx % 4 !== 0,
      standardOfReview: idx % 4 === 0 ? 'de novo' : idx % 4 === 1 ? 'clear-error' : idx % 4 === 2 ? 'abuse-of-discretion' : 'substantial-evidence',
    }));
  }

  /** Build a fact pattern for case comparison. */
  factPattern(caseId: string): FactPattern | null {
    const c = this._cases.get(caseId);
    if (!c) return null;
    const text = c.facts.join(' ');
    const actors = [c.parties.plaintiff, c.parties.defendant];
    const actions = c.facts.slice(0, 3).map(f => f.split(' ').slice(0, 3).join(' '));
    return {
      caseId,
      actors,
      actions,
      context: c.jurisdiction ?? c.court,
      temporal: new Date(c.date).getUTCFullYear().toString(),
    };
  }

  /** Compare two fact patterns for similarity. */
  compareFactPatterns(case1: string, case2: string): { similarity: number; sharedActors: string[]; sharedActions: string[] } {
    const a = this.factPattern(case1);
    const b = this.factPattern(case2);
    if (!a || !b) return { similarity: 0, sharedActors: [], sharedActions: [] };
    const sharedActors = a.actors.filter(x => b.actors.includes(x));
    const sharedActions = a.actions.filter(x => b.actions.includes(x));
    const denom = Math.max(1, a.actors.length + a.actions.length + b.actors.length + b.actions.length);
    const similarity = (sharedActors.length * 2 + sharedActions.length * 2) / denom;
    return {
      similarity: Number(similarity.toFixed(2)),
      sharedActors,
      sharedActions,
    };
  }

  /** Build a citation network node for a case. */
  citationNetwork(caseId: string): CitationNode | null {
    const c = this._cases.get(caseId);
    if (!c) return null;
    const cites: string[] = [];
    const citedBy: string[] = [];
    for (const other of this._cases.values()) {
      if (other.id === caseId) continue;
      if (other.reasoning.includes(caseId)) citedBy.push(other.id);
      if (c.reasoning.includes(other.id)) cites.push(other.id);
    }
    const authorityDepth = c.court === 'supreme' ? 0 : c.court === 'appellate' ? 1 : 2;
    return { caseId, cites, citedBy, authorityDepth };
  }

  /** Build an opinion metadata descriptor (synthesized). */
  opinionMeta(caseId: string): OpinionMeta | null {
    const c = this._cases.get(caseId);
    if (!c) return null;
    const seed = this._hashStr(c.id);
    const types: OpinionMeta['type'][] = ['majority', 'concurrence', 'dissent', 'per-curiam', 'plurality'];
    return {
      caseId,
      author: `justice-${(seed % 9) + 1}`,
      type: types[seed % types.length],
      joinedBy: [`justice-${((seed + 1) % 9) + 1}`, `justice-${((seed + 2) % 9) + 1}`],
      wordCount: c.reasoning.split(/\s+/).length,
    };
  }

  /** Predict the outcome of a case based on extracted features. */
  predictOutcome(caseId: string): CaseOutcome | null {
    const c = this._cases.get(caseId);
    if (!c) return null;
    const facts = this.materialFacts(caseId);
    const highWeightFacts = facts.filter(f => f.weight === 'high').length;
    const issues = this.legalIssues(caseId);
    const preservedIssues = issues.filter(i => i.preserved).length;
    let score = 50;
    score += highWeightFacts * 5;
    score += preservedIssues * 3;
    if (c.court === 'supreme') score += 5;
    if (c.disposition === 'affirmed' || c.disposition === 'reversed') score += 5;
    const confidence = Math.max(0.3, Math.min(0.95, score / 100));
    const winner: 'plaintiff' | 'defendant' = score > 55 ? 'plaintiff' : 'defendant';
    return {
      caseId,
      predictedWinner: winner,
      confidence: Number(confidence.toFixed(2)),
      keyFactors: [`high-weight-facts=${highWeightFacts}`, `preserved-issues=${preservedIssues}`, `court=${c.court}`],
      reasoning: `Predicted ${winner} based on ${highWeightFacts} high-weight facts and ${preservedIssues} preserved issues.`,
    };
  }

  /** Extract key passages from a case's reasoning. */
  keyPassages(caseId: string, maxLength: number = 200): string[] {
    const c = this._cases.get(caseId);
    if (!c) return [];
    const sentences = c.reasoning.split(/(?<=[.!?])\s+/);
    return sentences
      .filter(s => s.length <= maxLength)
      .filter(s => /because|therefore|thus|hence|accordingly|so that/i.test(s))
      .slice(0, 5);
  }

  /** Detect whether a case contains a dissent. */
  hasDissent(caseId: string): boolean {
    const meta = this.opinionMeta(caseId);
    return meta?.type === 'dissent';
  }

  /** Detect whether a case is per curiam. */
  isPerCuriam(caseId: string): boolean {
    const meta = this.opinionMeta(caseId);
    return meta?.type === 'per-curiam';
  }

  /** Compute the equilibrium treatment distribution of a case. */
  treatmentDistribution(caseId: string): Record<Precedent['treatment'], number> {
    const dist: Record<Precedent['treatment'], number> = {
      followed: 0,
      distinguished: 0,
      overruled: 0,
      questioned: 0,
    };
    for (const p of this._precedents) {
      if (p.caseId === caseId) dist[p.treatment]++;
    }
    return dist;
  }

  /** Determine whether a case is still good law. */
  isGoodLaw(caseId: string): { goodLaw: boolean; reasons: string[] } {
    const dist = this.treatmentDistribution(caseId);
    const reasons: string[] = [];
    if (dist.overruled > 0) reasons.push(`overruled-${dist.overruled}-times`);
    if (dist.questioned > 0) reasons.push(`questioned-${dist.questioned}-times`);
    return {
      goodLaw: dist.overruled === 0,
      reasons: reasons.length > 0 ? reasons : ['no-negative-treatment'],
    };
  }

  /** Compute a complexity score for a case based on facts, issues, and parties. */
  complexityScore(caseId: string): number {
    const c = this._cases.get(caseId);
    if (!c) return 0;
    const factScore = Math.min(40, c.facts.length * 5);
    const issueScore = Math.min(30, c.issues.length * 10);
    const partyScore = c.parties.plaintiff && c.parties.defendant ? 10 : 5;
    const reasoningScore = Math.min(20, c.reasoning.split(/\s+/).length / 50);
    return Math.round(factScore + issueScore + partyScore + reasoningScore);
  }

  /** Estimate reading time for the case. */
  readingTimeMinutes(caseId: string, wpm: number = 200): number {
    const c = this._cases.get(caseId);
    if (!c) return 0;
    const wordCount = (c.facts.join(' ') + ' ' + c.reasoning).split(/\s+/).length;
    return Number((wordCount / wpm).toFixed(2));
  }

  /** Group cases by subject. */
  groupBySubject(): Record<string, string[]> {
    const groups: Record<string, string[]> = {};
    for (const id of this._cases.keys()) {
      const subject = this.classifySubject(id);
      if (!groups[subject]) groups[subject] = [];
      groups[subject].push(id);
    }
    return groups;
  }

  /** Return the most-cited case in the corpus. */
  mostCitedCase(): string | null {
    const counts: Record<string, number> = {};
    for (const c of this._cases.values()) {
      for (const other of this._cases.values()) {
        if (other.id === c.id) continue;
        if (other.reasoning.includes(c.id)) {
          counts[c.id] = (counts[c.id] ?? 0) + 1;
        }
      }
    }
    let best: string | null = null;
    let bestCount = 0;
    for (const [id, count] of Object.entries(counts)) {
      if (count > bestCount) {
        bestCount = count;
        best = id;
      }
    }
    return best;
  }

  /** Compute the network centrality of a case. */
  centrality(caseId: string): number {
    const network = this.citationNetwork(caseId);
    if (!network) return 0;
    return network.citedBy.length + network.cites.length;
  }

  /** Rank cases by authority score. */
  rankByAuthority(limit?: number): { caseId: string; score: number }[] {
    const ranked = Array.from(this._cases.keys())
      .map(id => ({ caseId: id, score: this.authorityScore(id) }))
      .sort((a, b) => b.score - a.score);
    return limit ? ranked.slice(0, limit) : ranked;
  }

  /** Compute the average authority score across the corpus. */
  averageAuthority(): number {
    if (this._cases.size === 0) return 0;
    const total = Array.from(this._cases.keys()).reduce((s, id) => s + this.authorityScore(id), 0);
    return Number((total / this._cases.size).toFixed(2));
  }

  /** Generate a one-line case summary. */
  summarize(caseId: string): string {
    const c = this._cases.get(caseId);
    if (!c) return 'case-not-found';
    return `${c.parties.plaintiff} v. ${c.parties.defendant} (${new Date(c.date).getUTCFullYear()}) — ${c.holding.substring(0, 60)}`;
  }

  /** Extract party names from a case. */
  extractParties(caseId: string): Party[] {
    const c = this._cases.get(caseId);
    if (!c) return [];
    return [
      { name: c.parties.plaintiff, role: 'plaintiff', representation: 'counsel-1' },
      { name: c.parties.defendant, role: 'defendant', representation: 'counsel-2' },
    ];
  }

  /** Estimate the volume of evidence cited. */
  evidenceVolume(caseId: string): number {
    const c = this._cases.get(caseId);
    if (!c) return 0;
    return c.facts.reduce((s, f) => s + f.split(/\s+/).length, 0);
  }

  /** Detect whether a case involves a constitutional question. */
  isConstitutional(caseId: string): boolean {
    const c = this._cases.get(caseId);
    if (!c) return false;
    const text = (c.issues.join(' ') + ' ' + c.holding).toLowerCase();
    return /constitutional|amendment|due.?process|equal.?protection|first.?amendment|fourteenth/.test(text);
  }

  /** Detect whether a case is a class action. */
  isClassAction(caseId: string): boolean {
    const c = this._cases.get(caseId);
    if (!c) return false;
    return /class.?action|class.?certification|representative/i.test(c.facts.join(' ') + ' ' + c.issues.join(' '));
  }

  /** Compute a confidence score for the case brief. */
  briefConfidence(caseId: string): number {
    const c = this._cases.get(caseId);
    if (!c) return 0;
    let score = 50;
    if (c.holding.length > 50) score += 15;
    if (c.reasoning.length > 200) score += 15;
    if (c.issues.length > 0) score += 10;
    if (c.facts.length > 3) score += 10;
    return Math.min(100, score);
  }

  /** Build a timeline of events from the case facts. */
  factTimeline(caseId: string): { event: string; order: number }[] {
    const c = this._cases.get(caseId);
    if (!c) return [];
    return c.facts.map((event, order) => ({ event, order }));
  }

  /** Detect conflicting precedents in the corpus. */
  conflictingPrecedents(issue: string): { precedents: [string, string]; conflict: string }[] {
    const matches = this.findPrecedent(issue);
    const conflicts: { precedents: [string, string]; conflict: string }[] = [];
    for (let i = 0; i < matches.length; i++) {
      for (let j = i + 1; j < matches.length; j++) {
        const a = this._cases.get(matches[i].caseId);
        const b = this._cases.get(matches[j].caseId);
        if (a && b && a.disposition !== b.disposition) {
          conflicts.push({
            precedents: [matches[i].caseId, matches[j].caseId],
            conflict: `disposition mismatch: ${a.disposition} vs ${b.disposition}`,
          });
        }
      }
    }
    return conflicts;
  }

  /** Extract principles of law from a case. */
  legalPrinciples(caseId: string): string[] {
    const c = this._cases.get(caseId);
    if (!c) return [];
    const principles: string[] = [];
    const sentences = c.reasoning.split(/(?<=[.!?])\s+/);
    for (const s of sentences) {
      if (/shall|must|may not|is required|is prohibited|is entitled/i.test(s)) {
        principles.push(s.trim());
      }
    }
    return principles.slice(0, 5);
  }

  /** Compute the jurisprudential density (citations per 1000 words). */
  jurisprudentialDensity(caseId: string): number {
    const c = this._cases.get(caseId);
    if (!c) return 0;
    const words = c.reasoning.split(/\s+/).length;
    if (words === 0) return 0;
    const citations = (c.reasoning.match(/v\.\s/g) || []).length;
    return Number(((citations / words) * 1000).toFixed(2));
  }

  /** Identify the controlling precedent for an issue. */
  controllingPrecedent(issue: string): Precedent | null {
    const matches = this.findPrecedent(issue);
    const binding = matches.filter(m => m.binding);
    if (binding.length > 0) return binding[0];
    return matches[0] ?? null;
  }

  /** Recommend cases to read alongside a given case. */
  relatedCases(caseId: string, limit: number = 5): string[] {
    const c = this._cases.get(caseId);
    if (!c) return [];
    const scored: { id: string; score: number }[] = [];
    for (const other of this._cases.values()) {
      if (other.id === caseId) continue;
      const analog = this.analogize(caseId, other.id);
      scored.push({ id: other.id, score: analog.similarity });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map(s => s.id);
  }

  /** Generate a study outline from a case. */
  studyOutline(caseId: string): { section: string; content: string }[] {
    const c = this._cases.get(caseId);
    if (!c) return [];
    return [
      { section: 'Case Name', content: `${c.parties.plaintiff} v. ${c.parties.defendant}` },
      { section: 'Citation', content: this.caseCitation(caseId)?.reporter ?? 'unknown' },
      { section: 'Court', content: c.court },
      { section: 'Facts', content: c.facts.join(' ') },
      { section: 'Issues', content: c.issues.join('; ') },
      { section: 'Holding', content: c.holding },
      { section: 'Reasoning', content: c.reasoning },
      { section: 'Disposition', content: c.disposition },
      { section: 'Subject', content: this.classifySubject(caseId) },
      { section: 'Authority Score', content: this.authorityScore(caseId).toString() },
    ];
  }

  /** Compute a textual digest of the case. */
  digest(caseId: string, words: number = 100): string {
    const c = this._cases.get(caseId);
    if (!c) return 'case-not-found';
    const text = `${c.facts.join(' ')} ${c.issues.join(' ')} ${c.holding} ${c.reasoning}`;
    const allWords = text.split(/\s+/);
    return allWords.slice(0, words).join(' ');
  }

  /** Determine whether a case is binding on a lower court. */
  isBindingOn(caseId: string, lowerCourt: string): boolean {
    const c = this._cases.get(caseId);
    if (!c) return false;
    if (c.court === 'supreme') return true;
    if (c.court === 'appellate' && lowerCourt === 'district') return true;
    return false;
  }

  /** Compute the age of a case in years. */
  caseAgeYears(caseId: string): number {
    const c = this._cases.get(caseId);
    if (!c) return 0;
    const ms = Date.now() - c.date;
    return Number((ms / (365.25 * 86400000)).toFixed(2));
  }

  /** Determine if a case is recent enough to be persuasive. */
  isRecent(caseId: string, thresholdYears: number = 10): boolean {
    return this.caseAgeYears(caseId) <= thresholdYears;
  }

  /** Compute a vintage score for the case (older = more vintage). */
  vintageScore(caseId: string): number {
    const age = this.caseAgeYears(caseId);
    return Math.min(100, Math.round(age));
  }

  /** Find cases with similar subject matter. */
  similarSubjectCases(caseId: string): string[] {
    const subject = this.classifySubject(caseId);
    return Array.from(this._cases.keys()).filter(id => id !== caseId && this.classifySubject(id) === subject);
  }

  /** Extract citations from a case reasoning. */
  extractCitations(caseId: string): string[] {
    const c = this._cases.get(caseId);
    if (!c) return [];
    const matches = c.reasoning.match(/[A-Z][a-z]+ v\. [A-Z][a-z]+/g) || [];
    return matches;
  }

  /** Detect if the case involves a statutory question. */
  isStatutory(caseId: string): boolean {
    const c = this._cases.get(caseId);
    if (!c) return false;
    return /statute|section|subsection|paragraph|U\.S\.C|C\.F\.R/i.test(c.reasoning + ' ' + c.issues.join(' '));
  }

  /** Categorize a case's complexity tier. */
  complexityTier(caseId: string): 'low' | 'medium' | 'high' {
    const score = this.complexityScore(caseId);
    if (score < 40) return 'low';
    if (score < 70) return 'medium';
    return 'high';
  }

  /** Summarize the case brief in JSON-friendly form. */
  briefSummary(caseId: string): Record<string, unknown> | null {
    const brief = this.analyze(caseId);
    if (!brief) return null;
    return {
      caseId,
      issue: brief.issue,
      rule: brief.rule,
      conclusion: brief.conclusion,
      confidence: this.briefConfidence(caseId),
      subject: this.classifySubject(caseId),
      authority: this.authorityScore(caseId),
      complexity: this.complexityTier(caseId),
    };
  }

  /** Compute a hash for string-based determinism (utility). */
  private _hashStr(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return Math.abs(h);
  }

  /** Validate that a case has minimum required fields. */
  validateCase(c: Case): { valid: boolean; missing: string[] } {
    const missing: string[] = [];
    if (!c.id) missing.push('id');
    if (!c.title) missing.push('title');
    if (!c.court) missing.push('court');
    if (!c.parties.plaintiff || !c.parties.defendant) missing.push('parties');
    if (c.facts.length === 0) missing.push('facts');
    if (c.issues.length === 0) missing.push('issues');
    if (!c.holding) missing.push('holding');
    return { valid: missing.length === 0, missing };
  }

  /** Return the case title in a formatted string. */
  formattedTitle(caseId: string): string {
    const c = this._cases.get(caseId);
    if (!c) return 'unknown';
    return `${c.parties.plaintiff} v. ${c.parties.defendant}, ${new Date(c.date).getUTCFullYear()}`;
  }

  /** Compute a topic modeling distribution (synthesized). */
  topicDistribution(caseId: string): Record<string, number> {
    const c = this._cases.get(caseId);
    if (!c) return {};
    const text = (c.facts.join(' ') + ' ' + c.reasoning).toLowerCase();
    const topics = ['procedure', 'substance', 'remedy', 'evidence', 'jurisdiction'];
    const dist: Record<string, number> = {};
    let total = 0;
    for (const t of topics) {
      const count = (text.match(new RegExp(t, 'g')) || []).length;
      dist[t] = count;
      total += count;
    }
    if (total === 0) return topics.reduce((d, t) => ({ ...d, [t]: 0.2 }), {} as Record<string, number>);
    for (const t of topics) {
      dist[t] = Number((dist[t] / total).toFixed(2));
    }
    return dist;
  }

  /** Return the case's word count. */
  wordCount(caseId: string): number {
    const c = this._cases.get(caseId);
    if (!c) return 0;
    return (c.facts.join(' ') + ' ' + c.issues.join(' ') + ' ' + c.holding + ' ' + c.reasoning).split(/\s+/).length;
  }

  /** Detect presence of dicta markers. */
  dictaMarkers(caseId: string): string[] {
    const c = this._cases.get(caseId);
    if (!c) return [];
    const markers = ['observe', 'note', 'by the way', 'incidentally', 'in passing'];
    return markers.filter(m => c.reasoning.toLowerCase().includes(m));
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
