import { DataPacket, PacketMeta } from '../shared/types';

/** A regulation descriptor. */
export interface Regulation {
  readonly name: string;
  readonly authority: string;
  readonly requirements: string[];
  readonly penalties: { type: 'fine' | 'imprisonment' | 'license-revocation'; amount?: number }[];
  readonly effectiveDate: number;
  readonly scope: string[];
}

/** Compliance status of an entity. */
export interface ComplianceStatus {
  readonly entity: string;
  readonly compliant: boolean;
  readonly violations: string[];
  readonly recommendations: string[];
  readonly riskLevel: 'low' | 'moderate' | 'high' | 'critical';
}

/** An audit record. */
export interface Audit {
  readonly id: string;
  readonly entity: string;
  readonly scope: string;
  readonly period: number;
  readonly findings: string[];
  readonly passed: boolean;
  readonly performedAt: number;
}

/** A compliance violation. */
export interface Violation {
  readonly id: string;
  readonly entity: string;
  readonly regulation: string;
  readonly severity: 'minor' | 'moderate' | 'major' | 'critical';
  readonly description: string;
  readonly reportedAt: number;
}

/** Gap analysis result. */
export interface GapAnalysis {
  readonly current: string[];
  readonly required: string[];
  readonly gaps: string[];
  readonly coverage: number;
}

/** Remediation plan. */
export interface RemediationPlan {
  readonly violations: string[];
  readonly actions: { action: string; priority: 'low' | 'medium' | 'high'; deadline: number }[];
  readonly estimatedCost: number;
}

/** Monitoring plan. */
export interface MonitoringPlan {
  readonly entity: string;
  readonly metrics: { name: string; frequency: string; threshold: string }[];
  readonly alerts: string[];
}

/** Risk assessment result. */
export interface RiskAssessment {
  readonly entity: string;
  readonly riskScore: number;
  readonly factors: { factor: string; contribution: number }[];
  readonly level: 'low' | 'moderate' | 'high' | 'critical';
}

/**
 * ComplianceChecker audits entities against regulations, identifies violations,
 * performs gap analysis, and produces remediation plans.
 */
export class ComplianceChecker {
  private _regulations: Map<string, Regulation> = new Map();
  private _audits: Audit[] = [];
  private _violations: Violation[] = [];
  private _history: unknown[] = [];
  private _counter = 0;

  constructor() {
    this._seedRegulations();
  }

  get regulationCount(): number { return this._regulations.size; }
  get auditCount(): number { return this._audits.length; }
  get violationCount(): number { return this._violations.length; }

  /** Check an entity's compliance with a set of regulations. */
  checkCompliance(entity: string, regulations: string[]): ComplianceStatus {
    const violations: string[] = [];
    const recommendations: string[] = [];
    for (const regName of regulations) {
      const reg = this._regulations.get(regName);
      if (!reg) continue;
      const seed = this._hash(`${entity}|${regName}`);
      if (seed % 5 === 0) {
        violations.push(`${regName}:requirement-missing`);
        recommendations.push(`implement-${regName}-controls`);
      }
    }
    const riskLevel: ComplianceStatus['riskLevel'] = violations.length > 3 ? 'critical'
      : violations.length > 1 ? 'high'
        : violations.length > 0 ? 'moderate' : 'low';
    const status: ComplianceStatus = {
      entity,
      compliant: violations.length === 0,
      violations,
      recommendations,
      riskLevel,
    };
    this._history.push({ op: 'checkCompliance', entity, compliant: status.compliant });
    return status;
  }

  /** Perform a compliance audit. */
  audit(entity: string, scope: string, period: number): Audit {
    const findings: string[] = [];
    const seed = this._hash(`${entity}|${scope}`);
    if (seed % 3 === 0) findings.push('documentation-gap');
    if (seed % 4 === 0) findings.push('access-control-issue');
    const a: Audit = {
      id: `audit-${(++this._counter).toString(36)}-${Date.now().toString(36)}`,
      entity,
      scope,
      period,
      findings,
      passed: findings.length === 0,
      performedAt: Date.now(),
    };
    this._audits.push(a);
    return a;
  }

  /** Identify violations from practices against regulations. */
  identifyViolations(practices: string[], regulations: string[]): Violation[] {
    const found: Violation[] = [];
    for (const regName of regulations) {
      const reg = this._regulations.get(regName);
      if (!reg) continue;
      const met = reg.requirements.every(r => practices.some(p => p.includes(r)));
      if (!met) {
        found.push({
          id: `vio-${(++this._counter).toString(36)}`,
          entity: 'unknown',
          regulation: regName,
          severity: 'major',
          description: `missing requirement from ${regName}`,
          reportedAt: Date.now(),
        });
      }
    }
    this._violations.push(...found);
    return found;
  }

  /** Perform a risk assessment. */
  riskAssessment(entity: string, regulations: string[]): RiskAssessment {
    const status = this.checkCompliance(entity, regulations);
    const factors = status.violations.map(v => ({ factor: v, contribution: 0.2 }));
    const riskScore = Math.min(1, factors.length * 0.2);
    const level: RiskAssessment['level'] = riskScore > 0.6 ? 'critical'
      : riskScore > 0.4 ? 'high'
        : riskScore > 0.2 ? 'moderate' : 'low';
    return { entity, riskScore: Number(riskScore.toFixed(2)), factors, level };
  }

  /** Perform gap analysis between current and required practices. */
  gapAnalysis(current: string[], required: string[]): GapAnalysis {
    const gaps = required.filter(r => !current.includes(r));
    const coverage = (required.length - gaps.length) / Math.max(1, required.length);
    return { current, required, gaps, coverage: Number(coverage.toFixed(2)) };
  }

  /** Build a remediation plan for a list of violations. */
  remediationPlan(violations: string[]): RemediationPlan {
    const actions = violations.map(v => ({
      action: `remediate-${v}`,
      priority: v.includes('critical') ? 'high' as const : v.includes('major') ? 'medium' as const : 'low' as const,
      deadline: Date.now() + 30 * 86400000,
    }));
    return {
      violations,
      actions,
      estimatedCost: actions.length * 5000,
    };
  }

  /** Build a monitoring plan for an entity. */
  monitoringPlan(entity: string, regulations: string[]): MonitoringPlan {
    const metrics = regulations.map(r => ({
      name: `${r}-compliance-rate`,
      frequency: 'monthly',
      threshold: '>=95%',
    }));
    return {
      entity,
      metrics,
      alerts: regulations.map(r => `${r}-violation-detected`),
    };
  }

  /** Check data privacy compliance (GDPR/CCPA). */
  dataPrivacy(gdpr: boolean, ccpa: boolean, practices: string[]): ComplianceStatus {
    const violations: string[] = [];
    if (gdpr && !practices.includes('consent-management')) violations.push('gdpr:consent-missing');
    if (gdpr && !practices.includes('data-subject-rights')) violations.push('gdpr:rights-missing');
    if (ccpa && !practices.includes('opt-out-mechanism')) violations.push('ccpa:opt-out-missing');
    return {
      entity: 'data-privacy',
      compliant: violations.length === 0,
      violations,
      recommendations: violations.map(v => `implement-${v}`),
      riskLevel: violations.length > 2 ? 'critical' : violations.length > 0 ? 'moderate' : 'low',
    };
  }

  /** Check financial compliance (SOX/Basel). */
  financialCompliance(sox: boolean, basel: boolean): ComplianceStatus {
    const violations: string[] = [];
    if (sox) violations.push('sox:internal-controls-review');
    if (basel) violations.push('basel:capital-adequacy-review');
    return {
      entity: 'financial',
      compliant: false,
      violations,
      recommendations: ['establish-audit-committee', 'implement-risk-reporting'],
      riskLevel: 'high',
    };
  }

  /** Check industry standards (ISO). */
  industryStandards(iso: string, industry: string, practices: string[]): ComplianceStatus {
    const violations: string[] = [];
    if (iso === '27001' && !practices.includes('ism-system')) violations.push('iso27001:ism-missing');
    if (iso === '9001' && !practices.includes('qms')) violations.push('iso9001:qms-missing');
    return {
      entity: `${industry}-${iso}`,
      compliant: violations.length === 0,
      violations,
      recommendations: violations.map(v => `implement-${v}`),
      riskLevel: violations.length > 0 ? 'moderate' : 'low',
    };
  }

  /** Report a violation to an authority. */
  reportViolation(violation: Violation, authority: string): { violation: Violation; authority: string; reportedAt: number; reference: string } {
    this._violations.push(violation);
    this._history.push({ op: 'reportViolation', authority, violation: violation.id });
    return {
      violation,
      authority,
      reportedAt: Date.now(),
      reference: `ref-${(++this._counter).toString(36)}`,
    };
  }

  private _hash(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return Math.abs(h);
  }

  private _seedRegulations(): void {
    const regs: Regulation[] = [
      { name: 'gdpr', authority: 'eu', requirements: ['consent', 'data-subject-rights', 'breach-notification'], penalties: [{ type: 'fine', amount: 20000000 }], effectiveDate: Date.UTC(2018, 4, 25), scope: ['data-processing'] },
      { name: 'sox', authority: 'sec', requirements: ['internal-controls', 'audit-committee', 'ceo-cfo-attestation'], penalties: [{ type: 'fine', amount: 5000000 }, { type: 'imprisonment' }], effectiveDate: Date.UTC(2002, 6, 30), scope: ['public-companies'] },
      { name: 'hipaa', authority: 'hhs', requirements: ['privacy-rule', 'security-rule', 'breach-notification'], penalties: [{ type: 'fine', amount: 50000 }], effectiveDate: Date.UTC(1996, 7, 21), scope: ['healthcare'] },
    ];
    for (const r of regs) this._regulations.set(r.name, r);
  }

  toPacket(): DataPacket<{
    regulations: number;
    audits: Audit[];
    violations: Violation[];
    history: unknown[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['law', 'ComplianceChecker'],
      priority: 1,
      phase: 'compliance',
    };
    return {
      id: `compliance-checker-${Date.now().toString(36)}-${(++this._counter).toString(36)}`,
      payload: {
        regulations: this._regulations.size,
        audits: [...this._audits],
        violations: [...this._violations],
        history: [...this._history],
      },
      metadata,
    };
  }

  reset(): void {
    this._regulations.clear();
    this._audits = [];
    this._violations = [];
    this._history = [];
    this._counter = 0;
    this._seedRegulations();
  }
}
