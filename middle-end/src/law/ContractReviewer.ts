import { DataPacket, PacketMeta } from '../shared/types';

/** Contract type. */
export type ContractType = 'sale' | 'service' | 'employment' | 'lease' | 'nda' | 'partnership' | 'license';

/** A contract document. */
export interface Contract {
  readonly id: string;
  readonly type: ContractType;
  readonly parties: string[];
  readonly terms: string[];
  readonly clauses: Clause[];
  readonly effectiveDate: number;
  readonly termination: { method: string; notice: number };
  readonly governingLaw?: string;
}

/** A clause within a contract. */
export interface Clause {
  readonly id: string;
  readonly type: string;
  readonly content: string;
  readonly enforceable: boolean;
  readonly risk: 'low' | 'moderate' | 'high';
  readonly ambiguity?: string[];
}

/** Contract risk assessment. */
export interface ContractRisk {
  readonly contractId: string;
  readonly overallRisk: 'low' | 'moderate' | 'high';
  readonly highRiskClauses: string[];
  readonly recommendations: string[];
  readonly score: number;
}

/** Clause review finding. */
export interface ClauseFinding {
  readonly clauseId: string;
  readonly issues: string[];
  readonly severity: 'low' | 'moderate' | 'high';
  readonly suggested: string;
}

/** Compliance check result. */
export interface ComplianceResult {
  readonly clauseId: string;
  readonly regulation: string;
  readonly compliant: boolean;
  readonly gap: string;
}

/** Revision suggestion. */
export interface RevisionSuggestion {
  readonly clauseId: string;
  readonly original: string;
  readonly revised: string;
  readonly rationale: string;
}

/** A payment term descriptor. */
export interface PaymentTerm {
  readonly amount: number;
  readonly currency: string;
  readonly dueDate: number;
  readonly method: 'wire' | 'check' | 'ach' | 'credit' | 'crypto';
  readonly installments?: number;
  readonly lateFeeRate?: number;
}

/** A representation and warranty. */
export interface RepresentationWarranty {
  readonly statement: string;
  readonly scope: 'general' | 'specific';
  readonly duration: number;
  readonly survival: boolean;
  readonly remedies: string[];
}

/** A covenant descriptor. */
export interface Covenant {
  readonly type: 'affirmative' | 'negative' | 'financial';
  readonly description: string;
  readonly measurementPeriod: string;
  readonly threshold?: number;
  readonly consequence: string;
}

/** An IP rights clause summary. */
export interface IPClause {
  readonly ownership: 'creator' | 'commissioning-party' | 'joint';
  readonly license: 'exclusive' | 'non-exclusive' | 'none';
  readonly scope: string;
  readonly duration: number;
  readonly territories: string[];
}

/** A confidentiality clause summary. */
export interface ConfidentialityClause {
  readonly scope: string;
  readonly duration: number;
  readonly exceptions: string[];
  readonly remedies: string[];
  readonly survivingTermination: boolean;
}

/** A contract negotiation point. */
export interface NegotiationPoint {
  readonly clauseId: string;
  readonly issue: string;
  readonly current: string;
  readonly proposed: string;
  readonly priority: 'must-have' | 'nice-to-have' | 'tradeable';
  readonly leverage: number;
}

/** A contract amendment record. */
export interface Amendment {
  readonly id: string;
  readonly contractId: string;
  readonly version: number;
  readonly changes: string[];
  readonly effectiveDate: number;
  readonly authorizedBy: string[];
}

/** A performance metric for contract obligations. */
export interface PerformanceMetric {
  readonly obligation: string;
  readonly target: number;
  readonly actual: number;
  readonly unit: string;
  readonly status: 'met' | 'at-risk' | 'breached';
}

/** A contract risk register entry. */
export interface RiskRegisterEntry {
  readonly id: string;
  readonly contractId: string;
  readonly risk: string;
  readonly likelihood: number;
  readonly impact: number;
  readonly mitigation: string;
  readonly owner: string;
}

/**
 * ContractReviewer reviews contract clauses for enforceability, risk,
 * missing terms, ambiguity, and regulatory compliance.
 */
export class ContractReviewer {
  private _contracts: Map<string, Contract> = new Map();
  private _clauses: Clause[] = [];
  private _risks: ContractRisk[] = [];
  private _amendments: Amendment[] = [];
  private _negotiationPoints: NegotiationPoint[] = [];
  private _riskRegister: RiskRegisterEntry[] = [];
  private _performanceMetrics: PerformanceMetric[] = [];
  private _history: unknown[] = [];
  private _counter = 0;

  constructor() {
    this._seedClauses();
  }

  get contractCount(): number { return this._contracts.size; }
  get clauseCount(): number { return this._clauses.length; }
  get riskCount(): number { return this._risks.length; }
  get amendmentCount(): number { return this._amendments.length; }
  get negotiationPointCount(): number { return this._negotiationPoints.length; }
  get riskRegisterCount(): number { return this._riskRegister.length; }
  get performanceMetricCount(): number { return this._performanceMetrics.length; }

  /** Review an entire contract and produce a risk assessment. */
  review(contract: Contract): ContractRisk {
    this._contracts.set(contract.id, contract);
    const findings = contract.clauses.map(c => this.analyzeClause(c));
    const highRiskClauses = findings.filter(f => f.severity === 'high').map(f => f.clauseId);
    const recommendations = findings.flatMap(f => f.issues).slice(0, 5);
    const score = findings.reduce((s, f) => s + (f.severity === 'high' ? 3 : f.severity === 'moderate' ? 2 : 1), 0);
    const overallRisk: ContractRisk['overallRisk'] = score > 10 ? 'high' : score > 5 ? 'moderate' : 'low';
    const risk: ContractRisk = {
      contractId: contract.id,
      overallRisk,
      highRiskClauses,
      recommendations,
      score,
    };
    this._risks.push(risk);
    this._history.push({ op: 'review', contractId: contract.id, overallRisk });
    return risk;
  }

  /** Analyze a single clause for issues. */
  analyzeClause(clause: Clause): ClauseFinding {
    const issues: string[] = [];
    let severity: ClauseFinding['severity'] = 'low';
    if (!clause.enforceable) {
      issues.push('potential unenforceability');
      severity = 'high';
    }
    if (clause.risk === 'high') {
      issues.push('high-risk-clause');
      severity = 'high';
    }
    const ambiguities = this.ambiguousTerms(clause);
    if (ambiguities.length > 0) {
      issues.push(`ambiguous-terms: ${ambiguities.join(', ')}`);
      if (severity === 'low') severity = 'moderate';
    }
    return {
      clauseId: clause.id,
      issues,
      severity,
      suggested: issues.length > 0 ? `revise clause ${clause.id}` : 'no-changes',
    };
  }

  /** Identify missing standard clauses for a contract. */
  missingClauses(contract: Contract): string[] {
    const present = new Set(contract.clauses.map(c => c.type));
    const standard: Record<ContractType, string[]> = {
      sale: ['payment', 'delivery', 'warranty', 'limitation-of-liability', 'governing-law'],
      service: ['scope', 'payment', 'term', 'termination', 'ip'],
      employment: ['compensation', 'duties', 'termination', 'confidentiality', 'non-compete'],
      lease: ['rent', 'term', 'maintenance', 'default', 'security-deposit'],
      nda: ['definition', 'obligations', 'term', 'remedies', 'governing-law'],
      partnership: ['contributions', 'profits', 'management', 'dissolution', 'disputes'],
      license: ['grant', 'scope', 'fees', 'term', 'termination'],
    };
    const required = standard[contract.type] ?? [];
    return required.filter(r => !present.has(r));
  }

  /** Detect ambiguous terms in a clause. */
  ambiguousTerms(clause: Clause): string[] {
    const ambiguous = ['reasonable', 'prompt', 'material', 'substantial', 'best-efforts', 'timely'];
    return ambiguous.filter(a => clause.content.toLowerCase().includes(a));
  }

  /** Assess the risk of a clause. */
  riskAssessment(clause: Clause): { risk: Clause['risk']; score: number; factors: string[] } {
    const factors: string[] = [];
    let score = 0;
    if (clause.risk === 'high') { score += 3; factors.push('marked-high'); }
    else if (clause.risk === 'moderate') { score += 2; factors.push('marked-moderate'); }
    if (!clause.enforceable) { score += 3; factors.push('unenforceable'); }
    if (this.ambiguousTerms(clause).length > 0) { score += 1; factors.push('ambiguous'); }
    return { risk: clause.risk, score, factors };
  }

  /** Determine enforceability of a clause. */
  enforceability(clause: Clause): { enforceable: boolean; grounds: string[] } {
    const grounds: string[] = [];
    if (clause.type === 'non-compete' && clause.content.includes('perpetual')) {
      grounds.push('overbroad-duration');
    }
    if (clause.type === 'limitation-of-liability' && clause.content.includes('gross-negligence')) {
      grounds.push('excludes-gross-negligence');
    }
    if (clause.type === 'arbitration' && clause.content.includes('class-action-waiver')) {
      grounds.push('potential-unconscionability');
    }
    return { enforceable: grounds.length === 0, grounds };
  }

  /** Check clause compliance against regulations. */
  compliance(clause: Clause, regulations: string[]): ComplianceResult[] {
    return regulations.map(reg => {
      let compliant = true;
      let gap = '';
      if (reg === 'gdpr' && clause.type === 'confidentiality' && !clause.content.includes('personal-data')) {
        compliant = false;
        gap = 'missing-personal-data-handling';
      }
      if (reg === 'sox' && clause.type === 'indemnification' && clause.content.includes('officer')) {
        gap = 'review-officer-indemnification';
      }
      return { clauseId: clause.id, regulation: reg, compliant, gap };
    });
  }

  /** Analyze termination rights in a contract. */
  terminationRights(contract: Contract): { method: string; notice: number; forCause: boolean; convenience: boolean } {
    const hasCause = contract.clauses.some(c => c.type === 'termination' && c.content.includes('cause'));
    const hasConvenience = contract.clauses.some(c => c.type === 'termination' && c.content.includes('convenience'));
    return {
      method: contract.termination.method,
      notice: contract.termination.notice,
      forCause: hasCause,
      convenience: hasConvenience,
    };
  }

  /** Analyze liability limitation clause. */
  liabilityLimitation(clause: Clause): { cap: boolean; excludes: string[]; enforceable: boolean } {
    const excludes: string[] = [];
    if (clause.content.includes('indirect')) excludes.push('indirect');
    if (clause.content.includes('consequential')) excludes.push('consequential');
    if (clause.content.includes('punitive')) excludes.push('punitive');
    return {
      cap: clause.content.includes('cap'),
      excludes,
      enforceable: !clause.content.includes('gross-negligence'),
    };
  }

  /** Analyze indemnification clause. */
  indemnification(clause: Clause): { scope: string; carveouts: string[]; mutual: boolean } {
    return {
      scope: clause.content.includes('third-party') ? 'third-party-claims' : 'direct-claims',
      carveouts: clause.content.includes('except') ? ['willful-misconduct'] : [],
      mutual: clause.content.includes('mutual'),
    };
  }

  /** Analyze force majeure clause. */
  forceMajeure(clause: Clause): { events: string[]; notice: boolean; mitigation: boolean } {
    const events: string[] = [];
    if (clause.content.includes('natural-disaster')) events.push('natural-disaster');
    if (clause.content.includes('pandemic')) events.push('pandemic');
    if (clause.content.includes('war')) events.push('war');
    return {
      events,
      notice: clause.content.includes('notice'),
      mitigation: clause.content.includes('mitigat'),
    };
  }

  /** Analyze dispute resolution clause. */
  disputeResolution(clause: Clause): { method: string; venue: string; binding: boolean } {
    const method = clause.content.includes('arbitration') ? 'arbitration'
      : clause.content.includes('mediation') ? 'mediation'
        : 'litigation';
    return {
      method,
      venue: clause.content.includes('venue') ? 'specified' : 'unspecified',
      binding: clause.content.includes('binding'),
    };
  }

  /** Analyze governing law clause. */
  governingLaw(clause: Clause): { jurisdiction: string; forum: string } {
    const match = clause.content.match(/governed by (.+?) law/i);
    return {
      jurisdiction: match ? match[1] : 'unspecified',
      forum: clause.content.includes('forum') ? 'forum-selection' : 'no-forum',
    };
  }

  /** Analyze severability clause. */
  severability(clause: Clause): { present: boolean; savings: boolean } {
    return {
      present: clause.type === 'severability',
      savings: clause.content.includes('savings'),
    };
  }

  /** Suggest a revision for a clause with issues. */
  suggestRevision(clause: Clause, issues: string[]): RevisionSuggestion {
    let revised = clause.content;
    if (issues.includes('ambiguous-terms')) {
      revised = revised.replace(/reasonable/gi, 'defined-as-objective-standard');
      revised = revised.replace(/prompt/gi, 'within-5-business-days');
    }
    if (issues.includes('potential-unenforceability')) {
      revised = `${revised} [enforceability-review-required]`;
    }
    return {
      clauseId: clause.id,
      original: clause.content,
      revised,
      rationale: issues.join('; '),
    };
  }

  private _seedClauses(): void {
    const seeds: Clause[] = [
      { id: 'cl-1', type: 'payment', content: 'Payment shall be made within reasonable time.', enforceable: true, risk: 'low' },
      { id: 'cl-2', type: 'limitation-of-liability', content: 'Liability capped excluding gross-negligence.', enforceable: false, risk: 'high' },
      { id: 'cl-3', type: 'termination', content: 'Termination for cause with 30 days notice.', enforceable: true, risk: 'low' },
    ];
    this._clauses.push(...seeds);
  }

  /** Analyze a payment clause and extract payment terms. */
  analyzePayment(clause: Clause): PaymentTerm {
    const amountMatch = clause.content.match(/\$([\d,]+)/);
    const amount = amountMatch ? parseInt(amountMatch[1].replace(/,/g, ''), 10) : 0;
    const method: PaymentTerm['method'] = clause.content.includes('wire') ? 'wire'
      : clause.content.includes('ach') ? 'ach'
      : clause.content.includes('check') ? 'check'
      : clause.content.includes('credit') ? 'credit'
      : clause.content.includes('crypto') ? 'crypto' : 'wire';
    return {
      amount,
      currency: 'USD',
      dueDate: Date.now() + 30 * 86400000,
      method,
      installments: clause.content.includes('installment') ? 3 : undefined,
      lateFeeRate: clause.content.includes('late') ? 0.015 : undefined,
    };
  }

  /** Extract representations and warranties from a clause. */
  extractRepresentations(clause: Clause): RepresentationWarranty[] {
    if (!/represent|warrant/i.test(clause.content)) return [];
    const statements = clause.content.split(/[;.]/).filter(s => /represent|warrant/i.test(s));
    return statements.map(s => ({
      statement: s.trim(),
      scope: s.length > 100 ? 'general' : 'specific',
      duration: 365,
      survival: clause.content.includes('survive'),
      remedies: ['indemnification', 'termination'],
    }));
  }

  /** Extract covenants from a clause. */
  extractCovenants(clause: Clause): Covenant[] {
    if (!/covenant|shall|agrees to/i.test(clause.content)) return [];
    const covenants: Covenant[] = [];
    const sentences = clause.content.split(/[;.]/).filter(s => /shall|agrees to|covenant/i.test(s));
    for (const s of sentences) {
      const type: Covenant['type'] = /shall not|may not/i.test(s) ? 'negative'
        : /maintain|ratio|minimum/i.test(s) ? 'financial'
        : 'affirmative';
      covenants.push({
        type,
        description: s.trim(),
        measurementPeriod: 'quarterly',
        threshold: undefined,
        consequence: 'event-of-default',
      });
    }
    return covenants;
  }

  /** Analyze an IP clause. */
  analyzeIP(clause: Clause): IPClause {
    const ownership: IPClause['ownership'] = clause.content.includes('commissioning') ? 'commissioning-party'
      : clause.content.includes('joint') ? 'joint'
      : 'creator';
    const license: IPClause['license'] = clause.content.includes('exclusive') ? 'exclusive'
      : clause.content.includes('non-exclusive') ? 'non-exclusive'
      : 'none';
    return {
      ownership,
      license,
      scope: clause.content.includes('all-fields') ? 'all-fields' : 'specified-field',
      duration: clause.content.includes('perpetual') ? Infinity : 365 * 10,
      territories: clause.content.includes('worldwide') ? ['worldwide'] : ['US'],
    };
  }

  /** Analyze a confidentiality clause. */
  analyzeConfidentiality(clause: Clause): ConfidentialityClause {
    const durationMatch = clause.content.match(/(\d+)\s*year/i);
    const duration = durationMatch ? parseInt(durationMatch[1], 10) * 365 : 365 * 3;
    return {
      scope: clause.content.includes('all-information') ? 'all-information' : 'defined-information',
      duration,
      exceptions: ['public-domain', 'independently-developed', 'third-party-disclosure'],
      remedies: ['injunction', 'damages'],
      survivingTermination: clause.content.includes('survive'),
    };
  }

  /** Identify negotiation points in a contract. */
  identifyNegotiationPoints(contract: Contract): NegotiationPoint[] {
    const points: NegotiationPoint[] = [];
    for (const c of contract.clauses) {
      const findings = this.analyzeClause(c);
      if (findings.issues.length === 0) continue;
      const priority: NegotiationPoint['priority'] = findings.severity === 'high' ? 'must-have'
        : findings.severity === 'moderate' ? 'nice-to-have'
        : 'tradeable';
      points.push({
        clauseId: c.id,
        issue: findings.issues.join('; '),
        current: c.content,
        proposed: this.suggestRevision(c, findings.issues).revised,
        priority,
        leverage: findings.severity === 'high' ? 0.8 : findings.severity === 'moderate' ? 0.5 : 0.2,
      });
    }
    this._negotiationPoints.push(...points);
    return points;
  }

  /** Register an amendment to a contract. */
  registerAmendment(contractId: string, changes: string[], authorizedBy: string[]): Amendment {
    const existing = this._amendments.filter(a => a.contractId === contractId);
    const version = existing.length + 1;
    const amendment: Amendment = {
      id: `amd-${(++this._counter).toString(36)}`,
      contractId,
      version,
      changes,
      effectiveDate: Date.now(),
      authorizedBy,
    };
    this._amendments.push(amendment);
    this._history.push({ op: 'registerAmendment', contractId, version });
    return amendment;
  }

  /** List all amendments for a contract. */
  contractAmendments(contractId: string): Amendment[] {
    return this._amendments.filter(a => a.contractId === contractId);
  }

  /** Compute the latest version of a contract. */
  latestVersion(contractId: string): number {
    const amendments = this.contractAmendments(contractId);
    return amendments.length === 0 ? 1 : Math.max(...amendments.map(a => a.version)) + 1;
  }

  /** Track a performance metric for contract obligations. */
  trackPerformance(contractId: string, obligation: string, target: number, actual: number, unit: string): PerformanceMetric {
    const status: PerformanceMetric['status'] = actual >= target ? 'met'
      : actual >= target * 0.8 ? 'at-risk'
      : 'breached';
    const metric: PerformanceMetric = { obligation, target, actual, unit, status };
    this._performanceMetrics.push(metric);
    this._history.push({ op: 'trackPerformance', contractId, status });
    return metric;
  }

  /** List breached performance metrics. */
  breachedMetrics(): PerformanceMetric[] {
    return this._performanceMetrics.filter(m => m.status === 'breached');
  }

  /** Add an entry to the contract risk register. */
  addRiskEntry(contractId: string, risk: string, likelihood: number, impact: number, mitigation: string, owner: string): RiskRegisterEntry {
    const entry: RiskRegisterEntry = {
      id: `risk-${(++this._counter).toString(36)}`,
      contractId,
      risk,
      likelihood: Math.max(0, Math.min(1, likelihood)),
      impact: Math.max(0, Math.min(1, impact)),
      mitigation,
      owner,
    };
    this._riskRegister.push(entry);
    return entry;
  }

  /** Compute the risk score for a contract based on the risk register. */
  contractRiskScore(contractId: string): number {
    const entries = this._riskRegister.filter(r => r.contractId === contractId);
    if (entries.length === 0) return 0;
    return Number(entries.reduce((s, e) => s + e.likelihood * e.impact, 0).toFixed(2));
  }

  /** Compute a contract complexity score. */
  contractComplexity(contract: Contract): number {
    let score = 0;
    score += Math.min(30, contract.clauses.length * 3);
    score += Math.min(20, contract.terms.length * 2);
    score += Math.min(15, contract.parties.length * 5);
    score += Math.min(15, Math.floor(contract.effectiveDate / 86400000) % 15);
    score += Math.min(20, contract.clauses.filter(c => c.risk === 'high').length * 5);
    return Math.min(100, score);
  }

  /** Determine whether a contract requires legal sign-off. */
  requiresLegalSignoff(contract: Contract): boolean {
    const risk = this.review(contract);
    return risk.overallRisk === 'high' || contract.parties.length > 2 || contract.type === 'partnership';
  }

  /** Identify boilerplate clauses in a contract. */
  boilerplateClauses(contract: Contract): string[] {
    const boilerplate = ['severability', 'governing-law', 'entire-agreement', 'amendments', 'waiver', 'counterparts', 'notices'];
    return contract.clauses.filter(c => boilerplate.includes(c.type)).map(c => c.id);
  }

  /** Identify non-standard clauses. */
  nonStandardClauses(contract: Contract): string[] {
    const standard = ['payment', 'term', 'termination', 'governing-law', 'limitation-of-liability', 'confidentiality', 'indemnification'];
    return contract.clauses.filter(c => !standard.includes(c.type)).map(c => c.id);
  }

  /** Compute a clause density metric (clauses per page). */
  clauseDensity(contract: Contract, pageCount: number = 10): number {
    return Number((contract.clauses.length / Math.max(1, pageCount)).toFixed(2));
  }

  /** Check whether a contract is balanced between parties. */
  isBalanced(contract: Contract): { balanced: boolean; bias: string } {
    let obligations = 0;
    for (const c of contract.clauses) {
      if (/party a|seller|employer|landlord/i.test(c.content)) obligations++;
      if (/party b|buyer|employee|tenant/i.test(c.content)) obligations--;
    }
    return {
      balanced: Math.abs(obligations) <= 1,
      bias: obligations > 0 ? 'party-a' : obligations < 0 ? 'party-b' : 'neutral',
    };
  }

  /** Compute the contract's overall ambiguity score. */
  ambiguityScore(contract: Contract): number {
    let totalAmbiguity = 0;
    for (const c of contract.clauses) {
      totalAmbiguity += this.ambiguousTerms(c).length;
    }
    return Number((totalAmbiguity / Math.max(1, contract.clauses.length)).toFixed(2));
  }

  /** Identify high-risk clauses in a contract. */
  highRiskClauses(contract: Contract): Clause[] {
    return contract.clauses.filter(c => c.risk === 'high' || !c.enforceable);
  }

  /** Generate a redline summary of suggested changes. */
  redlineSummary(contract: Contract): { clauseId: string; changes: string }[] {
    return contract.clauses.map(c => {
      const findings = this.analyzeClause(c);
      if (findings.issues.length === 0) return { clauseId: c.id, changes: 'no-changes' };
      return { clauseId: c.id, changes: findings.issues.join('; ') };
    });
  }

  /** Compute the contract renewal risk. */
  renewalRisk(contract: Contract): number {
    const age = (Date.now() - contract.effectiveDate) / (365 * 86400000);
    const clauseRisk = contract.clauses.filter(c => c.risk === 'high').length / Math.max(1, contract.clauses.length);
    return Number(Math.min(1, age * 0.1 + clauseRisk).toFixed(2));
  }

  /** Categorize a contract by risk tier. */
  riskTier(contract: Contract): 'tier-1' | 'tier-2' | 'tier-3' {
    const risk = this.review(contract);
    if (risk.overallRisk === 'high') return 'tier-1';
    if (risk.overallRisk === 'moderate') return 'tier-2';
    return 'tier-3';
  }

  /** Compute the average clause length. */
  averageClauseLength(contract: Contract): number {
    if (contract.clauses.length === 0) return 0;
    const total = contract.clauses.reduce((s, c) => s + c.content.length, 0);
    return Math.round(total / contract.clauses.length);
  }

  /** Check whether a contract has a termination for convenience clause. */
  hasTerminationForConvenience(contract: Contract): boolean {
    return contract.clauses.some(c => c.type === 'termination' && c.content.includes('convenience'));
  }

  /** Check whether a contract has an automatic renewal clause. */
  hasAutoRenewal(contract: Contract): boolean {
    return contract.clauses.some(c => c.type === 'term' && /auto.?renew|evergreen/i.test(c.content));
  }

  /** Compute the contract value at risk. */
  valueAtRisk(contract: Contract): number {
    const risk = this.review(contract);
    const score = risk.score;
    const notionalValue = contract.clauses.length * 10000;
    return Math.round(notionalValue * Math.min(1, score / 20));
  }

  /** Generate a contract summary. */
  contractSummary(contract: Contract): Record<string, unknown> {
    const risk = this.review(contract);
    return {
      contractId: contract.id,
      type: contract.type,
      partyCount: contract.parties.length,
      clauseCount: contract.clauses.length,
      overallRisk: risk.overallRisk,
      riskScore: risk.score,
      missingClauses: this.missingClauses(contract).length,
      complexity: this.contractComplexity(contract),
      ambiguity: this.ambiguityScore(contract),
      balanced: this.isBalanced(contract).balanced,
      tier: this.riskTier(contract),
    };
  }

  /** Validate a contract's structural integrity. */
  validateContract(contract: Contract): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    if (!contract.id) issues.push('missing-id');
    if (!contract.type) issues.push('missing-type');
    if (contract.parties.length < 2) issues.push('insufficient-parties');
    if (contract.clauses.length === 0) issues.push('no-clauses');
    if (!contract.effectiveDate) issues.push('missing-effective-date');
    if (!contract.termination) issues.push('missing-termination');
    const seenIds = new Set<string>();
    for (const c of contract.clauses) {
      if (seenIds.has(c.id)) issues.push(`duplicate-clause-id:${c.id}`);
      seenIds.add(c.id);
    }
    return { valid: issues.length === 0, issues };
  }

  /** Compute the contract's remaining term in days. */
  remainingTerm(contract: Contract, asOf: number = Date.now()): number {
    const termination = contract.termination.notice * 86400000;
    return Math.max(0, Math.round((contract.effectiveDate + 365 * 86400000 + termination - asOf) / 86400000));
  }

  /** List contracts expiring within a window. */
  expiringContracts(windowDays: number = 90): Contract[] {
    const cutoff = Date.now() + windowDays * 86400000;
    return Array.from(this._contracts.values()).filter(c => {
      const termEnd = c.effectiveDate + 365 * 86400000;
      return termEnd < cutoff;
    });
  }

  /** Compute a clause importance weight. */
  clauseImportance(clause: Clause): number {
    const importanceMap: Record<string, number> = {
      'payment': 0.9,
      'termination': 0.85,
      'limitation-of-liability': 0.8,
      'indemnification': 0.75,
      'confidentiality': 0.7,
      'ip': 0.7,
      'governing-law': 0.5,
      'severability': 0.3,
      'notices': 0.2,
    };
    return importanceMap[clause.type] ?? 0.5;
  }

  /** Compute a weighted risk score for a contract. */
  weightedRiskScore(contract: Contract): number {
    let score = 0;
    let totalWeight = 0;
    for (const c of contract.clauses) {
      const weight = this.clauseImportance(c);
      const riskValue = c.risk === 'high' ? 3 : c.risk === 'moderate' ? 2 : 1;
      score += weight * riskValue;
      totalWeight += weight;
    }
    return totalWeight > 0 ? Number((score / totalWeight).toFixed(2)) : 0;
  }

  /** Recommend contract type for a given set of terms. */
  recommendContractType(terms: string[]): ContractType {
    const text = terms.join(' ').toLowerCase();
    if (text.includes('sale') || text.includes('purchase')) return 'sale';
    if (text.includes('service')) return 'service';
    if (text.includes('employ')) return 'employment';
    if (text.includes('lease')) return 'lease';
    if (text.includes('confidential')) return 'nda';
    if (text.includes('partner')) return 'partnership';
    return 'license';
  }

  /** Generate a checklist of contract elements. */
  contractChecklist(contract: Contract): { item: string; present: boolean }[] {
    const present = new Set(contract.clauses.map(c => c.type));
    return [
      { item: 'parties-defined', present: contract.parties.length >= 2 },
      { item: 'effective-date', present: !!contract.effectiveDate },
      { item: 'payment-terms', present: present.has('payment') },
      { item: 'termination', present: present.has('termination') },
      { item: 'governing-law', present: present.has('governing-law') },
      { item: 'dispute-resolution', present: present.has('arbitration') || present.has('dispute') },
      { item: 'confidentiality', present: present.has('confidentiality') },
      { item: 'limitation-of-liability', present: present.has('limitation-of-liability') },
      { item: 'indemnification', present: present.has('indemnification') },
      { item: 'force-majeure', present: present.has('force-majeure') },
      { item: 'severability', present: present.has('severability') },
      { item: 'entire-agreement', present: present.has('entire-agreement') },
    ];
  }

  /** Compute completeness percentage. */
  completeness(contract: Contract): number {
    const checklist = this.contractChecklist(contract);
    const presentCount = checklist.filter(c => c.present).length;
    return Number(((presentCount / checklist.length) * 100).toFixed(2));
  }

  /** Determine if a contract needs a witness or notary. */
  requiresWitness(contract: Contract): boolean {
    return contract.type === 'partnership' || contract.type === 'lease';
  }

  /** Compute the estimated time to negotiate a contract. */
  estimatedNegotiationTime(contract: Contract): number {
    const base = 7;
    const complexityFactor = this.contractComplexity(contract) / 100;
    const riskFactor = this.review(contract).score / 20;
    return Math.round(base * (1 + complexityFactor + riskFactor));
  }

  /** Group clauses by type. */
  groupClausesByType(contract: Contract): Record<string, Clause[]> {
    const groups: Record<string, Clause[]> = {};
    for (const c of contract.clauses) {
      if (!groups[c.type]) groups[c.type] = [];
      groups[c.type].push(c);
    }
    return groups;
  }

  /** Identify clauses with cross-references. */
  crossReferencedClauses(contract: Contract): { clauseId: string; references: string[] }[] {
    const result: { clauseId: string; references: string[] }[] = [];
    for (const c of contract.clauses) {
      const refs = (c.content.match(/section\s+\d+|clause\s+\d+|article\s+\d+/gi) || []);
      if (refs.length > 0) result.push({ clauseId: c.id, references: refs });
    }
    return result;
  }

  /** Detect unusual clauses that warrant legal review. */
  unusualClauses(contract: Contract): Clause[] {
    const common = new Set(['payment', 'term', 'termination', 'governing-law', 'limitation-of-liability', 'confidentiality', 'indemnification', 'severability', 'notices', 'entire-agreement', 'amendments', 'waiver', 'force-majeure', 'dispute-resolution', 'arbitration']);
    return contract.clauses.filter(c => !common.has(c.type));
  }

  /** Compute the contract's readability score (Flesch-based approximation). */
  readabilityScore(contract: Contract): number {
    const text = contract.clauses.map(c => c.content).join(' ');
    const sentences = text.split(/[.!?]+/).length;
    const words = text.split(/\s+/).length;
    if (sentences === 0 || words === 0) return 0;
    const avgWordsPerSentence = words / sentences;
    return Math.max(0, Math.min(100, Math.round(100 - avgWordsPerSentence)));
  }

  /** Identify defined terms in a contract. */
  definedTerms(contract: Contract): string[] {
    const text = contract.clauses.map(c => c.content).join(' ');
    const matches = text.match(/"([^"]+)"/g) || [];
    return matches.map(m => m.replace(/"/g, ''));
  }

  /** Compute a contract's exposure profile. */
  exposureProfile(contract: Contract): { financial: number; legal: number; operational: number; reputational: number } {
    const risk = this.review(contract);
    const financial = risk.highRiskClauses.length > 0 ? 0.7 : 0.3;
    const legal = !contract.governingLaw ? 0.6 : 0.2;
    const operational = contract.clauses.length > 20 ? 0.6 : 0.3;
    const reputational = risk.overallRisk === 'high' ? 0.7 : 0.2;
    return {
      financial: Number(financial.toFixed(2)),
      legal: Number(legal.toFixed(2)),
      operational: Number(operational.toFixed(2)),
      reputational: Number(reputational.toFixed(2)),
    };
  }

  toPacket(): DataPacket<{
    contracts: number;
    clauses: Clause[];
    risks: ContractRisk[];
    history: unknown[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['law', 'ContractReviewer'],
      priority: 1,
      phase: 'contract-review',
    };
    return {
      id: `contract-reviewer-${Date.now().toString(36)}-${(++this._counter).toString(36)}`,
      payload: {
        contracts: this._contracts.size,
        clauses: [...this._clauses],
        risks: [...this._risks],
        history: [...this._history],
      },
      metadata,
    };
  }

  reset(): void {
    this._contracts.clear();
    this._clauses = [];
    this._risks = [];
    this._amendments = [];
    this._negotiationPoints = [];
    this._riskRegister = [];
    this._performanceMetrics = [];
    this._history = [];
    this._counter = 0;
    this._seedClauses();
  }
}
