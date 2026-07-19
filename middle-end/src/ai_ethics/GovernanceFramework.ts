import { DataPacket } from '../shared/types';

/** A governance principle. */
export interface Principle {
  readonly name: string;
  readonly description: string;
  readonly enforceable: boolean;
  readonly category: 'safety' | 'fairness' | 'transparency' | 'privacy' | 'accountability';
}

/** A policy with rules and enforcement mechanism. */
export interface Policy {
  readonly domain: string;
  readonly rules: string[];
  readonly enforcement: 'automatic' | 'manual' | 'hybrid';
  readonly penalties: string[];
}

/** An audit trail entry. */
export interface AuditTrail {
  readonly timestamp: number;
  readonly actor: string;
  readonly action: string;
  readonly resource: string;
  readonly outcome: 'success' | 'failure' | 'pending';
  readonly metadata: Record<string, unknown>;
}

/** Result of an assessment. */
export interface AssessmentResult {
  readonly compliant: boolean;
  readonly score: number;
  readonly findings: string[];
  readonly severity: 'none' | 'low' | 'medium' | 'high';
}

export class GovernanceFramework {
  private _principles: Map<string, Principle> = new Map();
  private _policies: Policy[] = [];
  private _audits: AuditTrail[] = [];
  private _history: string[] = [];
  private _counter = 0;

  get principleCount(): number {
    return this._principles.size;
  }

  get policyCount(): number {
    return this._policies.length;
  }

  get auditCount(): number {
    return this._audits.length;
  }

  get history(): string[] {
    return [...this._history];
  }

  public addPrinciple(principle: Principle): { added: boolean; name: string; total: number } {
    this._principles.set(principle.name, principle);
    this._recordHistory(`addPrinciple(${principle.name})`);
    return { added: true, name: principle.name, total: this._principles.size };
  }

  public assessPolicy(policy: Policy, principles: Principle[]): AssessmentResult {
    const findings: string[] = [];
    let score = 1;
    for (const p of principles) {
      if (!p.enforceable && policy.enforcement === 'automatic') {
        findings.push(`Principle ${p.name} not enforceable but policy is automatic`);
        score -= 0.2;
      }
    }
    if (policy.rules.length === 0) {
      findings.push('Policy has no rules');
      score -= 0.3;
    }
    score = Math.max(0, score);
    const severity: AssessmentResult['severity'] = score < 0.4 ? 'high' : score < 0.6 ? 'medium' : score < 0.9 ? 'low' : 'none';
    this._recordHistory(`assessPolicy(score=${score.toFixed(2)}, severity=${severity})`);
    return { compliant: score >= 0.6, score, findings, severity };
  }

  public auditAI(system: { name: string; version: string }, criteria: string[], evidence: string[]): AssessmentResult & { system: string; criteria: number } {
    const findings: string[] = [];
    let score = 1;
    for (const c of criteria) {
      if (!evidence.some(e => e.includes(c))) {
        findings.push(`Missing evidence for criterion: ${c}`);
        score -= 0.15;
      }
    }
    score = Math.max(0, score);
    const audit: AuditTrail = {
      timestamp: Date.now(),
      actor: 'auditor',
      action: 'audit',
      resource: system.name,
      outcome: score >= 0.6 ? 'success' : 'failure',
      metadata: { version: system.version, criteria: criteria.length },
    };
    this._audits.push(audit);
    const severity: AssessmentResult['severity'] = score < 0.4 ? 'high' : score < 0.6 ? 'medium' : score < 0.9 ? 'low' : 'none';
    this._recordHistory(`auditAI(${system.name}, score=${score.toFixed(2)})`);
    return { compliant: score >= 0.6, score, findings, severity, system: system.name, criteria: criteria.length };
  }

  public impactAssessment(system: { name: string }, domain: string): { impact: 'low' | 'medium' | 'high'; domain: string; mitigation: string[] } {
    const impact: 'low' | 'medium' | 'high' = Math.random() > 0.6 ? 'high' : Math.random() > 0.3 ? 'medium' : 'low';
    const mitigation = impact === 'high' ? ['restrict-deployment', 'human-oversight', 'continuous-monitoring'] : impact === 'medium' ? ['monitoring', 'periodic-review'] : ['document'];
    this._recordHistory(`impactAssessment(${system.name}, ${domain}, ${impact})`);
    return { impact, domain, mitigation };
  }

  public transparencyReport(system: { name: string }, decisions: { id: string; outcome: string }[]): { report: string; decisions: number; disclosed: number } {
    const disclosed = decisions.length;
    const report = `System ${system.name}: ${disclosed} decisions disclosed with outcomes`;
    this._recordHistory(`transparencyReport(${system.name}, decisions=${decisions.length})`);
    return { report, decisions: decisions.length, disclosed };
  }

  public accountabilityChain(decision: { id: string; outcome: string }, actors: { id: string; role: string }[]): { chain: { actor: string; role: string; responsibility: string }[]; decision: string } {
    const chain = actors.map(a => ({
      actor: a.id,
      role: a.role,
      responsibility: a.role === 'developer' ? 'system design' : a.role === 'operator' ? 'deployment' : 'oversight',
    }));
    this._recordHistory(`accountabilityChain(decision=${decision.id}, actors=${actors.length})`);
    return { chain, decision: decision.id };
  }

  public humanOversight(system: { name: string }, decisions: { id: string; automated: boolean }[]): { oversight: boolean; reviewable: number; automated: number } {
    const automated = decisions.filter(d => d.automated).length;
    const reviewable = decisions.length - automated;
    this._recordHistory(`humanOversight(${system.name}, reviewable=${reviewable})`);
    return { oversight: reviewable > 0, reviewable, automated };
  }

  public consentMechanism(data: { type: string }, subjects: { id: string }[]): { consent: boolean; subjects: number; mechanism: string } {
    const consent = Math.random() > 0.2;
    this._recordHistory(`consentMechanism(subjects=${subjects.length}, consent=${consent})`);
    return { consent, subjects: subjects.length, mechanism: 'explicit' };
  }

  public rightToExplanation(decision: { id: string; outcome: string }, user: { id: string }): { explained: boolean; user: string; explanation: string } {
    const explanation = `Decision ${decision.id} resulted in ${decision.outcome} based on input features.`;
    this._recordHistory(`rightToExplanation(${decision.id}, ${user.id})`);
    return { explained: true, user: user.id, explanation };
  }

  public contestability(decision: { id: string }, process: { steps: string[] }): { contestable: boolean; process: string[]; window: number } {
    this._recordHistory(`contestability(${decision.id})`);
    return { contestable: true, process: process.steps, window: 30 };
  }

  public dataGovernance(data: { type: string; sensitivity: string }, lifecycle: { stages: string[] }, rights: { access: boolean; deletion: boolean }): { governed: boolean; stages: number; rights: string[] } {
    const rightsList: string[] = [];
    if (rights.access) rightsList.push('access');
    if (rights.deletion) rightsList.push('deletion');
    this._recordHistory(`dataGovernance(${data.type}, stages=${lifecycle.stages.length})`);
    return { governed: true, stages: lifecycle.stages.length, rights: rightsList };
  }

  public modelCard(model: { name: string }, performance: { accuracy: number }, limitations: string[]): { card: { name: string; accuracy: number; limitations: string[] }; complete: boolean } {
    const complete = performance.accuracy !== undefined && limitations.length > 0;
    this._recordHistory(`modelCard(${model.name}, complete=${complete})`);
    return {
      card: { name: model.name, accuracy: performance.accuracy, limitations: [...limitations] },
      complete,
    };
  }

  public datasheet(dataset: { name: string }, motivation: string, composition: { samples: number; features: number }): { datasheet: { name: string; motivation: string; samples: number; features: number }; complete: boolean } {
    const complete = motivation.length > 0 && composition.samples > 0;
    this._recordHistory(`datasheet(${dataset.name})`);
    return {
      datasheet: { name: dataset.name, motivation, samples: composition.samples, features: composition.features },
      complete,
    };
  }

  public riskClassification(system: { name: string }, level: 'minimal' | 'limited' | 'high' | 'unacceptable'): { classification: string; obligations: string[]; prohibited: boolean } {
    const obligationsMap: Record<string, string[]> = {
      minimal: ['voluntary-codes'],
      limited: ['transparency', 'user-notification'],
      high: ['risk-assessment', 'human-oversight', 'logging', 'transparency'],
      unacceptable: [],
    };
    const prohibited = level === 'unacceptable';
    this._recordHistory(`riskClassification(${system.name}, ${level})`);
    return { classification: level, obligations: obligationsMap[level] ?? [], prohibited };
  }

  public audits(): AuditTrail[] {
    return this._audits.map(a => ({ ...a, metadata: { ...a.metadata } }));
  }

  public principles(): Principle[] {
    return Array.from(this._principles.values()).map(p => ({ ...p }));
  }

  public policies(): Policy[] {
    return this._policies.map(p => ({ ...p, rules: [...p.rules], penalties: [...p.penalties] }));
  }

  public lastAudit(): AuditTrail | null {
    return this._audits.length > 0 ? { ...this._audits[this._audits.length - 1], metadata: { ...this._audits[this._audits.length - 1].metadata } } : null;
  }

  public summary(): { principles: number; policies: number; audits: number; historyLength: number; counter: number } {
    return {
      principles: this._principles.size,
      policies: this._policies.length,
      audits: this._audits.length,
      historyLength: this._history.length,
      counter: this._counter,
    };
  }

  public toJSON(): Record<string, unknown> {
    return {
      principles: this._principles.size,
      policies: this._policies.length,
      audits: this._audits.length,
      history: [...this._history],
      principleCategories: Array.from(new Set(Array.from(this._principles.values()).map(p => p.category))),
      successfulAudits: this._audits.filter(a => a.outcome === 'success').length,
    };
  }

  public validate(): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    for (const p of this._principles.values()) {
      if (p.name.length === 0) issues.push('principle: empty name');
      if (p.description.length === 0) issues.push(`principle ${p.name}: empty description`);
    }
    for (const p of this._policies) {
      if (p.domain.length === 0) issues.push('policy: empty domain');
      if (p.rules.length === 0) issues.push(`policy ${p.domain}: no rules`);
    }
    for (const a of this._audits) {
      if (a.actor.length === 0) issues.push('audit: empty actor');
      if (a.action.length === 0) issues.push('audit: empty action');
    }
    return { valid: issues.length === 0, issues };
  }

  public complianceOverview(): {
    totalAudits: number;
    successful: number;
    failed: number;
    pending: number;
    successRate: number;
    bySeverity: { severity: string; count: number }[];
  } {
    const total = this._audits.length;
    const successful = this._audits.filter(a => a.outcome === 'success').length;
    const failed = this._audits.filter(a => a.outcome === 'failure').length;
    const pending = this._audits.filter(a => a.outcome === 'pending').length;
    const severityCounts = new Map<string, number>();
    for (const a of this._audits) {
      const meta = a.metadata as { severity?: string };
      const sev = meta.severity ?? 'unknown';
      severityCounts.set(sev, (severityCounts.get(sev) ?? 0) + 1);
    }
    return {
      totalAudits: total,
      successful,
      failed,
      pending,
      successRate: total > 0 ? successful / total : 0,
      bySeverity: Array.from(severityCounts.entries()).map(([severity, count]) => ({ severity, count })),
    };
  }

  public principleCoverage(): {
    byCategory: { category: string; count: number }[];
    enforceable: number;
    nonEnforceable: number;
  } {
    const all = Array.from(this._principles.values());
    const categories = new Map<string, number>();
    for (const p of all) {
      categories.set(p.category, (categories.get(p.category) ?? 0) + 1);
    }
    return {
      byCategory: Array.from(categories.entries()).map(([category, count]) => ({ category, count })),
      enforceable: all.filter(p => p.enforceable).length,
      nonEnforceable: all.filter(p => !p.enforceable).length,
    };
  }

  private _recordHistory(entry: string): void {
    this._counter++;
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
  }

  public toPacket(): DataPacket<{
    principles: number;
    policies: number;
    audits: number;
    history: string[];
  }> {
    return {
      id: `governance-${Date.now()}-${this._counter}`,
      payload: {
        principles: this._principles.size,
        policies: this._policies.length,
        audits: this._audits.length,
        history: [...this._history],
      },
      metadata: {
        createdAt: Date.now(),
        route: ['ai_ethics', 'governance', 'result'],
        priority: 0.95,
        phase: 'governance',
      },
    };
  }

  public reset(): void {
    this._principles.clear();
    this._policies = [];
    this._audits = [];
    this._history = [];
    this._counter = 0;
  }
}
