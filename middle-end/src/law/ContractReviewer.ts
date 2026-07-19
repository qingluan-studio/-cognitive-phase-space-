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

/**
 * ContractReviewer reviews contract clauses for enforceability, risk,
 * missing terms, ambiguity, and regulatory compliance.
 */
export class ContractReviewer {
  private _contracts: Map<string, Contract> = new Map();
  private _clauses: Clause[] = [];
  private _risks: ContractRisk[] = [];
  private _history: unknown[] = [];
  private _counter = 0;

  constructor() {
    this._seedClauses();
  }

  get contractCount(): number { return this._contracts.size; }
  get clauseCount(): number { return this._clauses.length; }
  get riskCount(): number { return this._risks.length; }

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
    this._history = [];
    this._counter = 0;
    this._seedClauses();
  }
}
