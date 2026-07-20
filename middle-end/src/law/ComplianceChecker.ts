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

/** A compliance control descriptor. */
export interface Control {
  readonly id: string;
  readonly name: string;
  readonly type: 'preventive' | 'detective' | 'corrective' | 'compensating';
  readonly automated: boolean;
  readonly frequency: string;
  readonly owner?: string;
}

/** A compliance training record. */
export interface TrainingRecord {
  readonly id: string;
  readonly entity: string;
  readonly topic: string;
  readonly completedAt: number;
  readonly score: number;
  readonly expiresAt?: number;
}

/** A policy document. */
export interface Policy {
  readonly id: string;
  readonly name: string;
  readonly category: string;
  readonly version: string;
  readonly approvedAt: number;
  readonly owner: string;
  readonly reviewCycleDays: number;
}

/** A compliance incident. */
export interface ComplianceIncident {
  readonly id: string;
  readonly entity: string;
  readonly type: string;
  readonly severity: 'low' | 'moderate' | 'high' | 'critical';
  readonly detectedAt: number;
  readonly resolvedAt?: number;
  readonly rootCause?: string;
}

/** A regulatory change tracker. */
export interface RegulatoryChange {
  readonly regulation: string;
  readonly changeType: 'new' | 'amendment' | 'repeal' | 'guidance';
  readonly effectiveDate: number;
  readonly impactAssessment: 'low' | 'moderate' | 'high';
  readonly description: string;
}

/** A compliance KPI descriptor. */
export interface ComplianceKPI {
  readonly name: string;
  readonly value: number;
  readonly target: number;
  readonly unit: string;
  readonly trend: 'up' | 'down' | 'flat';
  readonly status: 'green' | 'amber' | 'red';
}

/** An attestestation record. */
export interface Attestation {
  readonly id: string;
  readonly entity: string;
  readonly attestor: string;
  readonly statement: string;
  readonly signedAt: number;
  readonly validUntil: number;
}

/** A third-party / vendor risk record. */
export interface VendorRisk {
  readonly vendor: string;
  readonly service: string;
  readonly inherentRisk: number;
  readonly residualRisk: number;
  readonly controls: string[];
  readonly reviewDue: number;
}

/** A compliance framework mapping. */
export interface FrameworkMapping {
  readonly framework: string;
  readonly controlCount: number;
  readonly coveredControls: number;
  readonly coverage: number;
  readonly gaps: string[];
}

/**
 * ComplianceChecker audits entities against regulations, identifies violations,
 * performs gap analysis, and produces remediation plans.
 */
export class ComplianceChecker {
  private _regulations: Map<string, Regulation> = new Map();
  private _audits: Audit[] = [];
  private _violations: Violation[] = [];
  private _controls: Map<string, Control> = new Map();
  private _policies: Map<string, Policy> = new Map();
  private _incidents: ComplianceIncident[] = [];
  private _training: TrainingRecord[] = [];
  private _attestations: Attestation[] = [];
  private _vendors: Map<string, VendorRisk> = new Map();
  private _regulatoryChanges: RegulatoryChange[] = [];
  private _history: unknown[] = [];
  private _counter = 0;

  constructor() {
    this._seedRegulations();
    this._seedControls();
    this._seedPolicies();
  }

  get regulationCount(): number { return this._regulations.size; }
  get auditCount(): number { return this._audits.length; }
  get violationCount(): number { return this._violations.length; }
  get controlCount(): number { return this._controls.size; }
  get policyCount(): number { return this._policies.size; }
  get incidentCount(): number { return this._incidents.length; }
  get trainingCount(): number { return this._training.length; }
  get attestationCount(): number { return this._attestations.length; }
  get vendorCount(): number { return this._vendors.size; }
  get regulatoryChangeCount(): number { return this._regulatoryChanges.length; }

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

  private _seedControls(): void {
    const controls: Control[] = [
      { id: 'ctrl-1', name: 'access-control', type: 'preventive', automated: true, frequency: 'continuous', owner: 'security' },
      { id: 'ctrl-2', name: 'audit-log-review', type: 'detective', automated: false, frequency: 'weekly', owner: 'compliance' },
      { id: 'ctrl-3', name: 'incident-response', type: 'corrective', automated: false, frequency: 'as-needed', owner: 'operations' },
      { id: 'ctrl-4', name: 'data-encryption', type: 'preventive', automated: true, frequency: 'continuous' },
      { id: 'ctrl-5', name: 'backup-verification', type: 'compensating', automated: true, frequency: 'daily' },
    ];
    for (const c of controls) this._controls.set(c.id, c);
  }

  private _seedPolicies(): void {
    const policies: Policy[] = [
      { id: 'pol-1', name: 'Information Security Policy', category: 'security', version: '2.1', approvedAt: Date.UTC(2023, 0, 1), owner: 'CISO', reviewCycleDays: 365 },
      { id: 'pol-2', name: 'Data Retention Policy', category: 'data', version: '1.4', approvedAt: Date.UTC(2022, 6, 1), owner: 'DPO', reviewCycleDays: 365 },
      { id: 'pol-3', name: 'Acceptable Use Policy', category: 'security', version: '3.0', approvedAt: Date.UTC(2023, 2, 1), owner: 'IT', reviewCycleDays: 180 },
    ];
    for (const p of policies) this._policies.set(p.id, p);
  }

  /** Register a new control. */
  registerControl(control: Control): Control {
    this._controls.set(control.id, control);
    this._history.push({ op: 'registerControl', id: control.id });
    return control;
  }

  /** Retrieve a control by id. */
  getControl(id: string): Control | null {
    return this._controls.get(id) ?? null;
  }

  /** List controls of a given type. */
  controlsByType(type: Control['type']): Control[] {
    return Array.from(this._controls.values()).filter(c => c.type === type);
  }

  /** Compute control automation ratio. */
  controlAutomationRatio(): number {
    if (this._controls.size === 0) return 0;
    const automated = Array.from(this._controls.values()).filter(c => c.automated).length;
    return Number((automated / this._controls.size).toFixed(2));
  }

  /** Register a policy. */
  registerPolicy(policy: Policy): Policy {
    this._policies.set(policy.id, policy);
    this._history.push({ op: 'registerPolicy', id: policy.id });
    return policy;
  }

  /** List policies due for review. */
  policiesDueForReview(asOf: number = Date.now()): Policy[] {
    return Array.from(this._policies.values()).filter(p => asOf > p.approvedAt + p.reviewCycleDays * 86400000);
  }

  /** Get policy by category. */
  policiesByCategory(category: string): Policy[] {
    return Array.from(this._policies.values()).filter(p => p.category === category);
  }

  /** Record a training completion. */
  recordTraining(entity: string, topic: string, score: number, validDays: number = 365): TrainingRecord {
    const record: TrainingRecord = {
      id: `train-${(++this._counter).toString(36)}`,
      entity,
      topic,
      completedAt: Date.now(),
      score,
      expiresAt: Date.now() + validDays * 86400000,
    };
    this._training.push(record);
    this._history.push({ op: 'recordTraining', entity, topic });
    return record;
  }

  /** Check training coverage for an entity. */
  trainingCoverage(entity: string, requiredTopics: string[]): { covered: string[]; missing: string[]; expired: string[] } {
    const entityTraining = this._training.filter(t => t.entity === entity);
    const covered: string[] = [];
    const missing: string[] = [];
    const expired: string[] = [];
    const now = Date.now();
    for (const topic of requiredTopics) {
      const matching = entityTraining.filter(t => t.topic === topic);
      const valid = matching.find(t => !t.expiresAt || t.expiresAt > now);
      if (valid) covered.push(topic);
      else if (matching.length > 0) expired.push(topic);
      else missing.push(topic);
    }
    return { covered, missing, expired };
  }

  /** Compute average training score for an entity. */
  averageTrainingScore(entity: string): number {
    const records = this._training.filter(t => t.entity === entity);
    if (records.length === 0) return 0;
    return Number((records.reduce((s, t) => s + t.score, 0) / records.length).toFixed(2));
  }

  /** Record a compliance incident. */
  recordIncident(entity: string, type: string, severity: ComplianceIncident['severity']): ComplianceIncident {
    const incident: ComplianceIncident = {
      id: `inc-${(++this._counter).toString(36)}`,
      entity,
      type,
      severity,
      detectedAt: Date.now(),
    };
    this._incidents.push(incident);
    this._history.push({ op: 'recordIncident', id: incident.id, severity });
    return incident;
  }

  /** Resolve a compliance incident. */
  resolveIncident(incidentId: string, rootCause: string): ComplianceIncident | null {
    const incident = this._incidents.find(i => i.id === incidentId);
    if (!incident) return null;
    const resolved: ComplianceIncident = {
      ...incident,
      resolvedAt: Date.now(),
      rootCause,
    };
    const idx = this._incidents.findIndex(i => i.id === incidentId);
    this._incidents[idx] = resolved;
    this._history.push({ op: 'resolveIncident', id: incidentId });
    return resolved;
  }

  /** List open incidents by severity. */
  openIncidentsBySeverity(): Record<ComplianceIncident['severity'], number> {
    const counts: Record<ComplianceIncident['severity'], number> = { low: 0, moderate: 0, high: 0, critical: 0 };
    for (const i of this._incidents) {
      if (!i.resolvedAt) counts[i.severity]++;
    }
    return counts;
  }

  /** Compute mean time to resolution. */
  meanTimeToResolution(): number {
    const resolved = this._incidents.filter(i => i.resolvedAt);
    if (resolved.length === 0) return 0;
    const total = resolved.reduce((s, i) => s + ((i.resolvedAt ?? 0) - i.detectedAt), 0);
    return Number((total / resolved.length / 3600000).toFixed(2));
  }

  /** Issue an attestation. */
  issueAttestation(entity: string, attestor: string, statement: string, validDays: number = 90): Attestation {
    const attestation: Attestation = {
      id: `att-${(++this._counter).toString(36)}`,
      entity,
      attestor,
      statement,
      signedAt: Date.now(),
      validUntil: Date.now() + validDays * 86400000,
    };
    this._attestations.push(attestation);
    return attestation;
  }

  /** List valid attestations for an entity. */
  validAttestations(entity: string, asOf: number = Date.now()): Attestation[] {
    return this._attestations.filter(a => a.entity === entity && a.validUntil > asOf);
  }

  /** Register a vendor risk record. */
  registerVendor(vendor: string, service: string, inherentRisk: number, controls: string[], reviewDueInDays: number = 365): VendorRisk {
    const residualRisk = Math.max(0, inherentRisk - controls.length * 0.1);
    const record: VendorRisk = {
      vendor,
      service,
      inherentRisk,
      residualRisk: Number(residualRisk.toFixed(2)),
      controls,
      reviewDue: Date.now() + reviewDueInDays * 86400000,
    };
    this._vendors.set(vendor, record);
    return record;
  }

  /** Get vendor risk record. */
  getVendor(vendor: string): VendorRisk | null {
    return this._vendors.get(vendor) ?? null;
  }

  /** List vendors due for review. */
  vendorsDueForReview(asOf: number = Date.now()): VendorRisk[] {
    return Array.from(this._vendors.values()).filter(v => v.reviewDue < asOf);
  }

  /** Compute average vendor residual risk. */
  averageVendorResidualRisk(): number {
    if (this._vendors.size === 0) return 0;
    const total = Array.from(this._vendors.values()).reduce((s, v) => s + v.residualRisk, 0);
    return Number((total / this._vendors.size).toFixed(2));
  }

  /** Track a regulatory change. */
  trackRegulatoryChange(change: RegulatoryChange): RegulatoryChange {
    this._regulatoryChanges.push(change);
    this._history.push({ op: 'trackRegulatoryChange', regulation: change.regulation });
    return change;
  }

  /** List upcoming regulatory changes. */
  upcomingRegulatoryChanges(asOf: number = Date.now()): RegulatoryChange[] {
    return this._regulatoryChanges.filter(c => c.effectiveDate > asOf);
  }

  /** Compute the compliance KPI dashboard. */
  kpiDashboard(): ComplianceKPI[] {
    const totalRegs = this._regulations.size;
    const totalViolations = this._violations.length;
    const totalControls = this._controls.size;
    const automatedControls = Array.from(this._controls.values()).filter(c => c.automated).length;
    const openIncidents = this._incidents.filter(i => !i.resolvedAt).length;
    const validTrainings = this._training.length;
    return [
      { name: 'regulation-coverage', value: totalRegs, target: 10, unit: 'count', trend: 'flat', status: totalRegs >= 10 ? 'green' : 'amber' },
      { name: 'open-violations', value: totalViolations, target: 0, unit: 'count', trend: totalViolations > 5 ? 'up' : 'flat', status: totalViolations === 0 ? 'green' : totalViolations < 5 ? 'amber' : 'red' },
      { name: 'control-automation', value: totalControls > 0 ? automatedControls / totalControls : 0, target: 0.8, unit: 'ratio', trend: 'up', status: automatedControls / Math.max(1, totalControls) >= 0.8 ? 'green' : 'amber' },
      { name: 'open-incidents', value: openIncidents, target: 0, unit: 'count', trend: 'flat', status: openIncidents === 0 ? 'green' : openIncidents < 3 ? 'amber' : 'red' },
      { name: 'training-completion', value: validTrainings, target: 50, unit: 'count', trend: 'up', status: validTrainings >= 50 ? 'green' : 'amber' },
    ];
  }

  /** Map an entity's controls to a compliance framework. */
  mapToFramework(framework: string, totalControls: number, coveredControls: number, gaps: string[] = []): FrameworkMapping {
    return {
      framework,
      controlCount: totalControls,
      coveredControls,
      coverage: Number((coveredControls / Math.max(1, totalControls)).toFixed(2)),
      gaps,
    };
  }

  /** ISO 27001 compliance check. */
  iso27001Compliance(practices: string[]): ComplianceStatus {
    const required = ['ism-system', 'risk-assessment', 'statement-of-applicability', 'asset-management', 'access-control'];
    const missing = required.filter(r => !practices.includes(r));
    return {
      entity: 'iso-27001',
      compliant: missing.length === 0,
      violations: missing.map(m => `iso27001:${m}-missing`),
      recommendations: missing.map(m => `implement-${m}`),
      riskLevel: missing.length > 2 ? 'critical' : missing.length > 0 ? 'moderate' : 'low',
    };
  }

  /** PCI DSS compliance check. */
  pciDssCompliance(practices: string[]): ComplianceStatus {
    const required = ['firewall-config', 'default-passwords-changed', 'encrypted-card-data', 'anti-virus', 'access-logs'];
    const missing = required.filter(r => !practices.includes(r));
    return {
      entity: 'pci-dss',
      compliant: missing.length === 0,
      violations: missing.map(m => `pci:${m}-missing`),
      recommendations: missing.map(m => `implement-${m}`),
      riskLevel: missing.length > 2 ? 'critical' : missing.length > 0 ? 'high' : 'low',
    };
  }

  /** AML compliance check. */
  amlCompliance(practices: string[]): ComplianceStatus {
    const required = ['kyc-program', 'transaction-monitoring', 'suspicious-activity-reporting', 'employee-training', 'risk-assessment'];
    const missing = required.filter(r => !practices.includes(r));
    return {
      entity: 'aml',
      compliant: missing.length === 0,
      violations: missing.map(m => `aml:${m}-missing`),
      recommendations: missing.map(m => `implement-${m}`),
      riskLevel: missing.length > 2 ? 'critical' : missing.length > 0 ? 'high' : 'low',
    };
  }

  /** Compute a compliance maturity score (0-5 scale). */
  maturityScore(): number {
    let score = 0;
    if (this._regulations.size > 0) score += 0.5;
    if (this._controls.size >= 5) score += 1;
    if (this.controlAutomationRatio() > 0.5) score += 0.5;
    if (this._policies.size >= 3) score += 1;
    if (this._training.length >= 10) score += 0.5;
    if (this._attestations.length > 0) score += 0.5;
    if (this._vendors.size > 0) score += 0.5;
    if (this._regulatoryChanges.length > 0) score += 0.5;
    return Math.min(5, Number(score.toFixed(1)));
  }

  /** Summarize the compliance posture for an entity. */
  postureSummary(entity: string): Record<string, unknown> {
    const incidents = this._incidents.filter(i => i.entity === entity);
    const training = this._training.filter(t => t.entity === entity);
    const attestations = this._attestations.filter(a => a.entity === entity);
    return {
      entity,
      openIncidents: incidents.filter(i => !i.resolvedAt).length,
      totalIncidents: incidents.length,
      trainingRecords: training.length,
      validAttestations: attestations.length,
      maturityScore: this.maturityScore(),
    };
  }

  /** Generate a remediation timeline. */
  remediationTimeline(violations: string[]): { phase: string; actions: string[]; durationDays: number }[] {
    return [
      { phase: 'immediate', actions: violations.slice(0, 2), durationDays: 7 },
      { phase: 'short-term', actions: violations.slice(2, 5), durationDays: 30 },
      { phase: 'medium-term', actions: violations.slice(5, 10), durationDays: 90 },
      { phase: 'long-term', actions: violations.slice(10), durationDays: 180 },
    ];
  }

  /** Estimate remediation cost based on violations. */
  estimateRemediationCost(violations: string[]): { total: number; breakdown: Record<string, number> } {
    const breakdown: Record<string, number> = {};
    let total = 0;
    for (const v of violations) {
      let cost = 5000;
      if (v.includes('critical')) cost = 50000;
      else if (v.includes('major')) cost = 20000;
      else if (v.includes('moderate')) cost = 10000;
      breakdown[v] = cost;
      total += cost;
    }
    return { total, breakdown };
  }

  /** Compute compliance risk trend. */
  riskTrend(history: { timestamp: number; score: number }[]): 'improving' | 'stable' | 'deteriorating' {
    if (history.length < 2) return 'stable';
    const recent = history.slice(-5);
    const first = recent[0].score;
    const last = recent[recent.length - 1].score;
    if (last < first - 0.1) return 'improving';
    if (last > first + 0.1) return 'deteriorating';
    return 'stable';
  }

  /** Check whether a regulation applies to a scope. */
  regulationApplies(regulation: string, scope: string): boolean {
    const reg = this._regulations.get(regulation);
    if (!reg) return false;
    return reg.scope.some(s => scope.toLowerCase().includes(s.toLowerCase()));
  }

  /** Compute the penalty exposure for an entity. */
  penaltyExposure(entity: string, regulations: string[]): number {
    let total = 0;
    for (const regName of regulations) {
      const reg = this._regulations.get(regName);
      if (!reg) continue;
      for (const penalty of reg.penalties) {
        if (penalty.amount) total += penalty.amount;
      }
    }
    return total;
  }

  /** Schedule an audit. */
  scheduleAudit(entity: string, scope: string, scheduledAt: number): { entity: string; scope: string; scheduledAt: number; leadTime: number } {
    const leadTime = Math.max(0, scheduledAt - Date.now());
    this._history.push({ op: 'scheduleAudit', entity, scheduledAt });
    return { entity, scope, scheduledAt, leadTime };
  }

  /** List completed audits for an entity. */
  completedAudits(entity: string): Audit[] {
    return this._audits.filter(a => a.entity === entity);
  }

  /** Compute audit pass rate. */
  auditPassRate(): number {
    if (this._audits.length === 0) return 0;
    const passed = this._audits.filter(a => a.passed).length;
    return Number((passed / this._audits.length).toFixed(2));
  }

  /** Generate a regulation summary. */
  regulationSummary(regName: string): Record<string, unknown> | null {
    const reg = this._regulations.get(regName);
    if (!reg) return null;
    return {
      name: reg.name,
      authority: reg.authority,
      requirementCount: reg.requirements.length,
      penaltyCount: reg.penalties.length,
      effectiveDate: new Date(reg.effectiveDate).toISOString(),
      scope: reg.scope,
    };
  }

  /** List all regulations by authority. */
  regulationsByAuthority(authority: string): Regulation[] {
    return Array.from(this._regulations.values()).filter(r => r.authority === authority);
  }

  /** Compute the average audit findings count. */
  averageAuditFindings(): number {
    if (this._audits.length === 0) return 0;
    return Number((this._audits.reduce((s, a) => s + a.findings.length, 0) / this._audits.length).toFixed(2));
  }

  /** Validate that a control is properly configured. */
  validateControl(control: Control): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    if (!control.id) issues.push('missing-id');
    if (!control.name) issues.push('missing-name');
    if (!control.frequency) issues.push('missing-frequency');
    if (control.type === 'detective' && control.automated === false && !control.owner) {
      issues.push('manual-detective-control-requires-owner');
    }
    return { valid: issues.length === 0, issues };
  }

  /** Compute the violation rate per audit. */
  violationRatePerAudit(): number {
    if (this._audits.length === 0) return 0;
    return Number((this._violations.length / this._audits.length).toFixed(2));
  }

  /** Determine if an entity requires enhanced monitoring. */
  requiresEnhancedMonitoring(entity: string): boolean {
    const status = this.checkCompliance(entity, Array.from(this._regulations.keys()));
    return status.riskLevel === 'high' || status.riskLevel === 'critical';
  }

  /** Generate a compliance heat map. */
  heatMap(): Record<string, Record<string, 'green' | 'amber' | 'red'>> {
    const result: Record<string, Record<string, 'green' | 'amber' | 'red'>> = {};
    for (const regName of this._regulations.keys()) {
      result[regName] = {};
      for (const entity of ['finance', 'operations', 'it', 'hr']) {
        const status = this.checkCompliance(entity, [regName]);
        const color: 'green' | 'amber' | 'red' = status.riskLevel === 'low' ? 'green' : status.riskLevel === 'moderate' ? 'amber' : 'red';
        result[regName][entity] = color;
      }
    }
    return result;
  }

  /** Categorize violations by type. */
  violationsByType(): Record<string, number> {
    const result: Record<string, number> = {};
    for (const v of this._violations) {
      const type = v.description.split(':')[0] ?? 'unknown';
      result[type] = (result[type] ?? 0) + 1;
    }
    return result;
  }

  /** Compute compliance training effectiveness. */
  trainingEffectiveness(entity: string): number {
    const records = this._training.filter(t => t.entity === entity);
    if (records.length === 0) return 0;
    const avgScore = records.reduce((s, t) => s + t.score, 0) / records.length;
    const passingRate = records.filter(t => t.score >= 70).length / records.length;
    return Number((avgScore * passingRate / 100).toFixed(2));
  }

  /** Generate an executive compliance summary. */
  executiveSummary(): Record<string, unknown> {
    return {
      totalRegulations: this._regulations.size,
      totalControls: this._controls.size,
      totalPolicies: this._policies.size,
      totalIncidents: this._incidents.length,
      openIncidents: this._incidents.filter(i => !i.resolvedAt).length,
      auditPassRate: this.auditPassRate(),
      maturityScore: this.maturityScore(),
      controlAutomationRatio: this.controlAutomationRatio(),
      averageVendorResidualRisk: this.averageVendorResidualRisk(),
    };
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
    this._controls.clear();
    this._policies.clear();
    this._incidents = [];
    this._training = [];
    this._attestations = [];
    this._vendors.clear();
    this._regulatoryChanges = [];
    this._history = [];
    this._counter = 0;
    this._seedRegulations();
    this._seedControls();
    this._seedPolicies();
  }
}
