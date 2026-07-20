import { DataPacket, PacketMeta } from '../shared/types';

export interface AuditLog {
  event: string;
  actor: string;
  resource: string;
  result: string;
  timestamp: number;
}

export interface ComplianceReport {
  framework: string;
  controls: string[];
  passed: number;
  failed: number;
  status: string;
}

export interface AuditFinding {
  id: string;
  title: string;
  description: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  framework: string;
  control: string;
  status: 'open' | 'in_progress' | 'remediated' | 'accepted_risk' | 'false_positive';
  detectedAt: number;
  dueDate?: number;
  owner?: string;
  evidence: string[];
}

export interface RiskRegisterEntry {
  id: string;
  description: string;
  category: 'strategic' | 'operational' | 'financial' | 'compliance' | 'cybersecurity' | 'third_party';
  likelihood: number;
  impact: number;
  inherentRisk: number;
  residualRisk: number;
  mitigation: string;
  owner: string;
  reviewDate: number;
  status: 'identified' | 'assessed' | 'mitigated' | 'accepted' | 'closed';
}

export interface ControlTest {
  id: string;
  controlId: string;
  description: string;
  framework: string;
  testMethod: 'interview' | 'observation' | 'inspection' | 'reperformance' | 'automated';
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually';
  lastTested?: number;
  result?: 'pass' | 'fail' | 'partial' | 'not_tested';
  testedBy?: string;
  evidence: string[];
}

export interface EvidenceCollection {
  id: string;
  findingId?: string;
  controlTestId?: string;
  description: string;
  collectedAt: number;
  collectedBy: string;
  source: string;
  format: 'screenshot' | 'log' | 'document' | 'config' | 'report' | 'video';
  hash: string;
  chainOfCustody: { actor: string; timestamp: number; action: string }[];
}

export interface AuditSchedule {
  id: string;
  name: string;
  framework: string;
  scope: string;
  startDate: number;
  endDate: number;
  auditor: string;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  progress: number;
}

export interface GRCControl {
  id: string;
  name: string;
  description: string;
  framework: string;
  category: 'preventive' | 'detective' | 'corrective' | 'compensating';
  automated: boolean;
  owner: string;
  implemented: boolean;
  effectiveness: 'effective' | 'partially_effective' | 'ineffective' | 'not_assessed';
}

export interface ContinuousMonitoringRule {
  id: string;
  metric: string;
  threshold: number;
  direction: 'above' | 'below' | 'change';
  alertFrequency: 'realtime' | 'hourly' | 'daily' | 'weekly';
  lastEvaluated?: number;
  lastValue?: number;
  triggered: boolean;
}

export interface AuditLogSource {
  id: string;
  name: string;
  type: 'application' | 'system' | 'network' | 'database' | 'cloud' | 'endpoint';
  endpoint: string;
  format: 'syslog' | 'json' | 'cef' | 'xml' | 'csv';
  retention: number;
  active: boolean;
}

export interface Stakeholder {
  id: string;
  name: string;
  role: string;
  email: string;
  responsibilities: string[];
  reports: string[];
}

export class SecurityAudit {
  private _auditLogs: AuditLog[] = [];
  private _reports: ComplianceReport[] = [];
  private _counter = 0;
  private _findings: Map<string, AuditFinding> = new Map();
  private _riskRegister: Map<string, RiskRegisterEntry> = new Map();
  private _controlTests: Map<string, ControlTest> = new Map();
  private _evidence: Map<string, EvidenceCollection> = new Map();
  private _auditSchedule: Map<string, AuditSchedule> = new Map();
  private _controls: Map<string, GRCControl> = new Map();
  private _monitoringRules: Map<string, ContinuousMonitoringRule> = new Map();
  private _logSources: Map<string, AuditLogSource> = new Map();
  private _stakeholders: Map<string, Stakeholder> = new Map();
  private _auditTrail: { id: number; timestamp: number; actor: string; action: string; target: string; result: string; metadata: Record<string, unknown> }[] = [];
  private _frameworks: Map<string, { name: string; controls: string[]; version: string }> = new Map();
  private _exceptions: Map<string, { control: string; justification: string; expiresAt: number; approver: string }> = new Map();
  private _metrics: Map<string, { value: number; timestamp: number; trend: number[] }> = new Map();

  get auditLogCount(): number { return this._auditLogs.length; }
  get reportCount(): number { return this._reports.length; }
  get findingCount(): number { return this._findings.size; }
  get riskRegisterCount(): number { return this._riskRegister.size; }
  get controlTestCount(): number { return this._controlTests.size; }
  get evidenceCount(): number { return this._evidence.size; }
  get scheduledAuditCount(): number { return this._auditSchedule.size; }
  get controlCount(): number { return this._controls.size; }
  get monitoringRuleCount(): number { return this._monitoringRules.size; }
  get logSourceCount(): number { return this._logSources.size; }
  get stakeholderCount(): number { return this._stakeholders.size; }
  get openFindings(): number {
    let count = 0;
    for (const finding of this._findings.values()) {
      if (finding.status === 'open' || finding.status === 'in_progress') count++;
    }
    return count;
  }
  get criticalFindings(): number {
    let count = 0;
    for (const finding of this._findings.values()) {
      if (finding.severity === 'critical' && finding.status !== 'remediated' && finding.status !== 'false_positive') count++;
    }
    return count;
  }
  get highRiskEntries(): number {
    let count = 0;
    for (const entry of this._riskRegister.values()) {
      if (entry.residualRisk >= 70 && entry.status !== 'closed') count++;
    }
    return count;
  }
  get exceptionsCount(): number { return this._exceptions.size; }

  auditTrail(events: AuditLog[], criteria: Record<string, string>): AuditLog[] {
    let result = [...events];
    for (const [key, value] of Object.entries(criteria)) {
      result = result.filter(e => (e as Record<string, unknown>)[key] === value);
    }
    this._auditLogs.push(...result);
    return result;
  }

  logAnalysis(logs: string[], patterns: string[]): { matches: string[]; count: number; patterns: string[] } {
    const matches: string[] = [];
    for (const log of logs) {
      for (const pattern of patterns) {
        if (log.includes(pattern)) {
          matches.push(log);
          break;
        }
      }
    }
    return { matches, count: matches.length, patterns };
  }

  complianceCheck(framework: string, controls: string[]): ComplianceReport {
    const passed = Math.floor(controls.length * 0.9);
    const report: ComplianceReport = {
      framework,
      controls,
      passed,
      failed: controls.length - passed,
      status: passed === controls.length ? 'compliant' : 'partially_compliant',
    };
    this._reports.push(report);
    return report;
  }

  soxCompliance(controls: string[]): ComplianceReport {
    return this.complianceCheck('SOX', controls);
  }

  hipaaCompliance(controls: string[]): ComplianceReport {
    return this.complianceCheck('HIPAA', controls);
  }

  pciDssCompliance(controls: string[]): ComplianceReport {
    return this.complianceCheck('PCI-DSS', controls);
  }

  iso27001Compliance(controls: string[]): ComplianceReport {
    return this.complianceCheck('ISO 27001', controls);
  }

  gdprCompliance(data: Record<string, unknown>[], controls: string[]): ComplianceReport {
    return this.complianceCheck('GDPR', controls);
  }

  fedrampCompliance(controls: string[]): ComplianceReport {
    return this.complianceCheck('FedRAMP', controls);
  }

  nistCompliance(controls: string[]): ComplianceReport {
    return this.complianceCheck('NIST 800-53', controls);
  }

  cisBenchmarkCompliance(controls: string[]): ComplianceReport {
    return this.complianceCheck('CIS Benchmarks', controls);
  }

  soc2Compliance(controls: string[]): ComplianceReport {
    return this.complianceCheck('SOC 2', controls);
  }

  registerFramework(name: string, version: string, controls: string[]): { name: string; version: string; controlCount: number } {
    this._frameworks.set(name, { name, version, controls });
    return { name, version, controlCount: controls.length };
  }

  listFrameworks(): { name: string; version: string; controlCount: number }[] {
    return Array.from(this._frameworks.values()).map(f => ({ name: f.name, version: f.version, controlCount: f.controls.length }));
  }

  riskAssessment(assets: string[], threats: string[], vulnerabilities: string[]): {
    assets: string[];
    threats: string[];
    vulnerabilities: string[];
    riskLevel: string;
    score: number;
  } {
    const score = threats.length * 10 + vulnerabilities.length * 5;
    const riskLevel = score > 50 ? 'high' : score > 25 ? 'medium' : 'low';
    return { assets, threats, vulnerabilities, riskLevel, score };
  }

  threatModeling(system: string, assets: string[], attackers: string[]): {
    system: string;
    assets: string[];
    attackers: string[];
    threats: string[];
    mitigations: string[];
  } {
    const threats = assets.map(a => `threat_to_${a}`);
    const mitigations = attackers.map(a => `mitigation_for_${a}`);
    return { system, assets, attackers, threats, mitigations };
  }

  incidenceResponse(incident: string, plan: string[]): {
    incident: string;
    phase: string;
    actions: string[];
    timeline: number;
  } {
    return {
      incident,
      phase: 'containment',
      actions: plan,
      timeline: plan.length * 30,
    };
  }

  forensicAnalysis(evidence: string[], tools: string[]): {
    evidence: string[];
    tools: string[];
    findings: Record<string, unknown>;
    chainOfCustody: string[];
  } {
    return {
      evidence,
      tools,
      findings: { artifacts: evidence.length, analysis: 'complete' },
      chainOfCustody: evidence.map((e, i) => `chain-${i}: ${e}`),
    };
  }

  registerFinding(finding: Omit<AuditFinding, 'id' | 'detectedAt'>): AuditFinding {
    const id = `finding-${++this._counter}`;
    const full: AuditFinding = { ...finding, id, detectedAt: Date.now() };
    this._findings.set(id, full);
    this._recordAudit('system', 'register_finding', id, 'success', { severity: finding.severity, framework: finding.framework });
    return full;
  }

  updateFindingStatus(findingId: string, status: AuditFinding['status'], notes?: string): { updated: boolean; findingId: string; status: string } {
    const finding = this._findings.get(findingId);
    if (!finding) return { updated: false, findingId, status: 'not_found' };
    finding.status = status;
    this._recordAudit('analyst', 'update_finding', findingId, 'success', { status, notes });
    return { updated: true, findingId, status };
  }

  assignFindingOwner(findingId: string, owner: string): { assigned: boolean; findingId: string; owner: string } {
    const finding = this._findings.get(findingId);
    if (!finding) return { assigned: false, findingId, owner };
    finding.owner = owner;
    return { assigned: true, findingId, owner };
  }

  setFindingDueDate(findingId: string, dueDate: number): { set: boolean; findingId: string; dueDate: number } {
    const finding = this._findings.get(findingId);
    if (!finding) return { set: false, findingId, dueDate: 0 };
    finding.dueDate = dueDate;
    return { set: true, findingId, dueDate };
  }

  listFindings(filter?: { severity?: string; status?: string; framework?: string; owner?: string }): AuditFinding[] {
    return Array.from(this._findings.values()).filter(f => {
      if (filter?.severity && f.severity !== filter.severity) return false;
      if (filter?.status && f.status !== filter.status) return false;
      if (filter?.framework && f.framework !== filter.framework) return false;
      if (filter?.owner && f.owner !== filter.owner) return false;
      return true;
    });
  }

  overdueFindings(): AuditFinding[] {
    const now = Date.now();
    return Array.from(this._findings.values()).filter(f =>
      f.dueDate && f.dueDate < now && f.status !== 'remediated' && f.status !== 'false_positive'
    );
  }

  addRiskRegisterEntry(entry: Omit<RiskRegisterEntry, 'id'>): RiskRegisterEntry {
    const id = `risk-${++this._counter}`;
    const full: RiskRegisterEntry = { ...entry, id };
    this._riskRegister.set(id, full);
    return full;
  }

  updateRiskEntry(id: string, updates: Partial<RiskRegisterEntry>): { updated: boolean; id: string } {
    const entry = this._riskRegister.get(id);
    if (!entry) return { updated: false, id };
    Object.assign(entry, updates);
    return { updated: true, id };
  }

  calculateRiskScore(likelihood: number, impact: number): { inherentRisk: number; riskLevel: string } {
    const inherentRisk = likelihood * impact;
    const level = inherentRisk >= 80 ? 'critical' : inherentRisk >= 60 ? 'high' : inherentRisk >= 30 ? 'medium' : 'low';
    return { inherentRisk, riskLevel: level };
  }

  listRiskEntries(filter?: { category?: string; status?: string; minRisk?: number }): RiskRegisterEntry[] {
    return Array.from(this._riskRegister.values()).filter(e => {
      if (filter?.category && e.category !== filter.category) return false;
      if (filter?.status && e.status !== filter.status) return false;
      if (filter?.minRisk && e.residualRisk < filter.minRisk) return false;
      return true;
    });
  }

  registerControlTest(test: Omit<ControlTest, 'id'>): ControlTest {
    const id = `test-${++this._counter}`;
    const full: ControlTest = { ...test, id };
    this._controlTests.set(id, full);
    return full;
  }

  executeControlTest(testId: string, tester: string, result: ControlTest['result'], evidence: string[]): { executed: boolean; testId: string; result: string } {
    const test = this._controlTests.get(testId);
    if (!test) return { executed: false, testId, result: 'not_found' };
    test.lastTested = Date.now();
    test.result = result;
    test.testedBy = tester;
    test.evidence.push(...evidence);
    this._recordAudit(tester, 'execute_control_test', testId, result ?? 'unknown', { framework: test.framework });
    return { executed: true, testId, result: result ?? 'unknown' };
  }

  dueControlTests(): ControlTest[] {
    const now = Date.now();
    return Array.from(this._controlTests.values()).filter(t => {
      if (!t.lastTested) return true;
      const intervalMs = t.frequency === 'daily' ? 86400000 : t.frequency === 'weekly' ? 7 * 86400000 : t.frequency === 'monthly' ? 30 * 86400000 : t.frequency === 'quarterly' ? 90 * 86400000 : 365 * 86400000;
      return now - t.lastTested > intervalMs;
    });
  }

  listControlTests(filter?: { framework?: string; result?: string }): ControlTest[] {
    return Array.from(this._controlTests.values()).filter(t => {
      if (filter?.framework && t.framework !== filter.framework) return false;
      if (filter?.result && t.result !== filter.result) return false;
      return true;
    });
  }

  collectEvidence(evidence: Omit<EvidenceCollection, 'id' | 'collectedAt' | 'hash' | 'chainOfCustody'>): EvidenceCollection {
    const id = `evidence-${++this._counter}`;
    const now = Date.now();
    const hash = Math.random().toString(36).slice(2, 18);
    const full: EvidenceCollection = {
      ...evidence,
      id,
      collectedAt: now,
      hash,
      chainOfCustody: [{ actor: evidence.collectedBy, timestamp: now, action: 'collected' }],
    };
    this._evidence.set(id, full);
    return full;
  }

  transferEvidence(evidenceId: string, toActor: string, reason: string): { transferred: boolean; evidenceId: string } {
    const evidence = this._evidence.get(evidenceId);
    if (!evidence) return { transferred: false, evidenceId };
    evidence.chainOfCustody.push({ actor: toActor, timestamp: Date.now(), action: `transferred: ${reason}` });
    return { transferred: true, evidenceId };
  }

  verifyEvidenceChain(evidenceId: string): { verified: boolean; gaps: string[]; entries: number } {
    const evidence = this._evidence.get(evidenceId);
    if (!evidence) return { verified: false, gaps: ['not_found'], entries: 0 };
    const gaps: string[] = [];
    for (let i = 1; i < evidence.chainOfCustody.length; i++) {
      const prev = evidence.chainOfCustody[i - 1];
      const curr = evidence.chainOfCustody[i];
      if (curr.timestamp < prev.timestamp) gaps.push(`timestamp_anomaly_at_index_${i}`);
    }
    return { verified: gaps.length === 0, gaps, entries: evidence.chainOfCustody.length };
  }

  listEvidence(filter?: { findingId?: string; controlTestId?: string; format?: string }): EvidenceCollection[] {
    return Array.from(this._evidence.values()).filter(e => {
      if (filter?.findingId && e.findingId !== filter.findingId) return false;
      if (filter?.controlTestId && e.controlTestId !== filter.controlTestId) return false;
      if (filter?.format && e.format !== filter.format) return false;
      return true;
    });
  }

  scheduleAudit(audit: Omit<AuditSchedule, 'id' | 'status' | 'progress'>): AuditSchedule {
    const id = `audit-${++this._counter}`;
    const full: AuditSchedule = { ...audit, id, status: 'planned', progress: 0 };
    this._auditSchedule.set(id, full);
    return full;
  }

  startAudit(auditId: string): { started: boolean; auditId: string } {
    const audit = this._auditSchedule.get(auditId);
    if (!audit) return { started: false, auditId };
    audit.status = 'in_progress';
    audit.progress = 5;
    return { started: true, auditId };
  }

  updateAuditProgress(auditId: string, progress: number, notes?: string): { updated: boolean; progress: number } {
    const audit = this._auditSchedule.get(auditId);
    if (!audit) return { updated: false, progress: 0 };
    audit.progress = Math.min(100, progress);
    if (audit.progress >= 100) audit.status = 'completed';
    this._recordAudit('auditor', 'update_audit_progress', auditId, 'success', { progress, notes });
    return { updated: true, progress: audit.progress };
  }

  cancelAudit(auditId: string, reason: string): { cancelled: boolean; auditId: string } {
    const audit = this._auditSchedule.get(auditId);
    if (!audit) return { cancelled: false, auditId };
    audit.status = 'cancelled';
    this._recordAudit('auditor', 'cancel_audit', auditId, 'cancelled', { reason });
    return { cancelled: true, auditId };
  }

  listScheduledAudits(filter?: { status?: string; framework?: string }): AuditSchedule[] {
    return Array.from(this._auditSchedule.values()).filter(a => {
      if (filter?.status && a.status !== filter.status) return false;
      if (filter?.framework && a.framework !== filter.framework) return false;
      return true;
    });
  }

  registerGRCControl(control: Omit<GRCControl, 'id'>): GRCControl {
    const id = `ctrl-${++this._counter}`;
    const full: GRCControl = { ...control, id };
    this._controls.set(id, full);
    return full;
  }

  assessControlEffectiveness(controlId: string, effectiveness: GRCControl['effectiveness'], assessor: string): { assessed: boolean; controlId: string } {
    const control = this._controls.get(controlId);
    if (!control) return { assessed: false, controlId };
    control.effectiveness = effectiveness;
    this._recordAudit(assessor, 'assess_control', controlId, effectiveness, {});
    return { assessed: true, controlId };
  }

  listControls(filter?: { framework?: string; category?: string; effectiveness?: string }): GRCControl[] {
    return Array.from(this._controls.values()).filter(c => {
      if (filter?.framework && c.framework !== filter.framework) return false;
      if (filter?.category && c.category !== filter.category) return false;
      if (filter?.effectiveness && c.effectiveness !== filter.effectiveness) return false;
      return true;
    });
  }

  addMonitoringRule(rule: Omit<ContinuousMonitoringRule, 'id' | 'triggered'>): ContinuousMonitoringRule {
    const id = `mon-${++this._counter}`;
    const full: ContinuousMonitoringRule = { ...rule, id, triggered: false };
    this._monitoringRules.set(id, full);
    return full;
  }

  evaluateMonitoringRule(ruleId: string, value: number): { ruleId: string; triggered: boolean; threshold: number; value: number } {
    const rule = this._monitoringRules.get(ruleId);
    if (!rule) return { ruleId, triggered: false, threshold: 0, value: 0 };
    rule.lastEvaluated = Date.now();
    rule.lastValue = value;
    let triggered = false;
    if (rule.direction === 'above' && value > rule.threshold) triggered = true;
    if (rule.direction === 'below' && value < rule.threshold) triggered = true;
    if (rule.direction === 'change' && rule.lastValue !== undefined && Math.abs(value - rule.lastValue) > rule.threshold) triggered = true;
    rule.triggered = triggered;
    return { ruleId, triggered, threshold: rule.threshold, value };
  }

  listTriggeredMonitors(): ContinuousMonitoringRule[] {
    return Array.from(this._monitoringRules.values()).filter(r => r.triggered);
  }

  registerLogSource(source: Omit<AuditLogSource, 'id'>): AuditLogSource {
    const id = `src-${++this._counter}`;
    const full: AuditLogSource = { ...source, id };
    this._logSources.set(id, full);
    return full;
  }

  listLogSources(filter?: { type?: string; active?: boolean }): AuditLogSource[] {
    return Array.from(this._logSources.values()).filter(s => {
      if (filter?.type && s.type !== filter.type) return false;
      if (filter?.active !== undefined && s.active !== filter.active) return false;
      return true;
    });
  }

  aggregateLogs(sources: string[], timeWindow: number = 3600000): { source: string; logCount: number; sampleSize: number }[] {
    const now = Date.now();
    return sources.map(sourceId => {
      const source = this._logSources.get(sourceId);
      if (!source) return { source: sourceId, logCount: 0, sampleSize: 0 };
      const logs = this._auditLogs.filter(l => now - l.timestamp < timeWindow);
      return { source: source.name, logCount: logs.length, sampleSize: Math.min(100, logs.length) };
    });
  }

  registerStakeholder(stakeholder: Omit<Stakeholder, 'id'>): Stakeholder {
    const id = `stk-${++this._counter}`;
    const full: Stakeholder = { ...stakeholder, id };
    this._stakeholders.set(id, full);
    return full;
  }

  listStakeholders(filter?: { role?: string }): Stakeholder[] {
    return Array.from(this._stakeholders.values()).filter(s => !filter?.role || s.role === filter.role);
  }

  requestException(control: string, justification: string, days: number, approver: string): { exceptionId: string; control: string; expiresAt: number } {
    const exceptionId = `exc-${++this._counter}`;
    this._exceptions.set(exceptionId, {
      control,
      justification,
      expiresAt: Date.now() + days * 86400000,
      approver,
    });
    return { exceptionId, control, expiresAt: Date.now() + days * 86400000 };
  }

  listExceptions(includeExpired: boolean = false): { exceptionId: string; control: string; justification: string; expiresAt: number; approver: string; expired: boolean }[] {
    const now = Date.now();
    return Array.from(this._exceptions.entries()).map(([id, exc]) => ({
      exceptionId: id,
      control: exc.control,
      justification: exc.justification,
      expiresAt: exc.expiresAt,
      approver: exc.approver,
      expired: exc.expiresAt < now,
    })).filter(e => includeExpired || !e.expired);
  }

  recordMetric(name: string, value: number): { name: string; value: number; trend: number } {
    const existing = this._metrics.get(name);
    const trend = existing ? [...existing.trend, value].slice(-100) : [value];
    this._metrics.set(name, { value, timestamp: Date.now(), trend });
    return { name, value, trend: trend.length };
  }

  getMetric(name: string): { value: number; trend: number[]; lastUpdated: number } | null {
    const metric = this._metrics.get(name);
    return metric ? { value: metric.value, trend: metric.trend, lastUpdated: metric.timestamp } : null;
  }

  compliancePosture(): {
    overallScore: number;
    frameworks: { name: string; compliance: number }[];
    openFindings: number;
    criticalFindings: number;
    highRisks: number;
    overdueTests: number;
    recommendations: string[];
  } {
    const frameworkScores: { name: string; compliance: number }[] = [];
    const frameworkNames = new Set(this._reports.map(r => r.framework));
    for (const name of frameworkNames) {
      const reports = this._reports.filter(r => r.framework === name);
      const totalControls = reports.reduce((s, r) => s + r.controls.length, 0);
      const passed = reports.reduce((s, r) => s + r.passed, 0);
      frameworkScores.push({ name, compliance: totalControls > 0 ? Math.round((passed / totalControls) * 100) : 0 });
    }
    const overall = frameworkScores.length > 0 ? frameworkScores.reduce((s, f) => s + f.compliance, 0) / frameworkScores.length : 0;
    const recs: string[] = [];
    if (this.criticalFindings > 0) recs.push(`remediate_${this.criticalFindings}_critical_findings`);
    if (this.highRiskEntries > 0) recs.push(`address_${this.highRiskEntries}_high_risk_entries`);
    if (this.dueControlTests().length > 0) recs.push(`execute_${this.dueControlTests().length}_overdue_tests`);
    if (this.overdueFindings().length > 0) recs.push(`resolve_${this.overdueFindings().length}_overdue_findings`);
    return {
      overallScore: Math.round(overall),
      frameworks: frameworkScores,
      openFindings: this.openFindings,
      criticalFindings: this.criticalFindings,
      highRisks: this.highRiskEntries,
      overdueTests: this.dueControlTests().length,
      recommendations: recs,
    };
  }

  private _recordAudit(actor: string, action: string, target: string, result: string, metadata: Record<string, unknown>): void {
    this._auditTrail.push({
      id: ++this._counter,
      timestamp: Date.now(),
      actor,
      action,
      target,
      result,
      metadata,
    });
    if (this._auditTrail.length > 5000) this._auditTrail.shift();
  }

  getAuditTrail(filter?: { actor?: string; action?: string; since?: number }): typeof this._auditTrail {
    return this._auditTrail.filter(entry => {
      if (filter?.actor && entry.actor !== filter.actor) return false;
      if (filter?.action && entry.action !== filter.action) return false;
      if (filter?.since && entry.timestamp < filter.since) return false;
      return true;
    });
  }

  exportFindings(format: 'json' | 'csv' | 'sarif'): string {
    const findings = Array.from(this._findings.values());
    if (format === 'csv') {
      const header = 'id,title,severity,framework,control,status,detectedAt,owner';
      const rows = findings.map(f => `${f.id},"${f.title}",${f.severity},${f.framework},${f.control},${f.status},${f.detectedAt},${f.owner ?? ''}`);
      return [header, ...rows].join('\n');
    }
    if (format === 'sarif') {
      const sarif = {
        version: '2.1.0',
        runs: [{
          tool: { name: 'SecurityAudit', version: '1.0' },
          results: findings.map(f => ({
            ruleId: f.control,
            level: f.severity === 'critical' || f.severity === 'high' ? 'error' : f.severity === 'medium' ? 'warning' : 'note',
            message: { text: f.description },
            locations: [{ physicalLocation: { artifactLocation: { uri: f.framework } } }],
          })),
        }],
      };
      return JSON.stringify(sarif, null, 2);
    }
    return JSON.stringify(findings, null, 2);
  }

  packageEvidence(findingId: string): { findingId: string; evidenceCount: number; totalSize: number; packagedAt: number; hashChain: string[] } | null {
    const finding = this._findings.get(findingId);
    if (!finding) return null;
    const evidence = Array.from(this._evidence.values()).filter(e => e.findingId === findingId);
    const totalSize = evidence.reduce((s, e) => s + e.description.length, 0);
    const hashChain = evidence.map(e => e.hash);
    this._recordAudit('auditor', 'package_evidence', findingId, 'success', { evidenceCount: evidence.length });
    return {
      findingId,
      evidenceCount: evidence.length,
      totalSize,
      packagedAt: Date.now(),
      hashChain,
    };
  }

  generateAuditReport(framework: string, options: { includeFindings?: boolean; includeRisks?: boolean; includeControls?: boolean; includeEvidence?: boolean } = {}): {
    framework: string;
    generatedAt: number;
    summary: { findings: number; risks: number; controls: number; evidence: number };
    findings: AuditFinding[];
    risks: RiskRegisterEntry[];
    controls: ControlTest[];
    evidence: EvidenceCollection[];
    posture: { overallScore: number; openFindings: number; criticalFindings: number };
  } {
    const findings = Array.from(this._findings.values()).filter(f => f.framework === framework);
    const risks = Array.from(this._riskRegister.values());
    const controls = Array.from(this._controlTests.values()).filter(c => c.framework === framework);
    const evidence = Array.from(this._evidence.values());
    this._recordAudit('auditor', 'generate_report', framework, 'success', { findings: findings.length });
    return {
      framework,
      generatedAt: Date.now(),
      summary: {
        findings: findings.length,
        risks: risks.length,
        controls: controls.length,
        evidence: evidence.length,
      },
      findings: options.includeFindings === false ? [] : findings,
      risks: options.includeRisks === false ? [] : risks,
      controls: options.includeControls === false ? [] : controls,
      evidence: options.includeEvidence === false ? [] : evidence,
      posture: {
        overallScore: this.compliancePosture().overallScore,
        openFindings: this.openFindings,
        criticalFindings: this.criticalFindings,
      },
    };
  }

  riskHeatMap(): { likelihood: number; impact: number; count: number; entries: RiskRegisterEntry[] }[] {
    const heatMap: { likelihood: number; impact: number; count: number; entries: RiskRegisterEntry[] }[] = [];
    for (let l = 1; l <= 5; l++) {
      for (let i = 1; i <= 5; i++) {
        const entries = Array.from(this._riskRegister.values()).filter(r => r.likelihood === l && r.impact === i);
        if (entries.length > 0) {
          heatMap.push({ likelihood: l, impact: i, count: entries.length, entries });
        }
      }
    }
    return heatMap;
  }

  findingsTrend(days: number = 30): { date: number; opened: number; closed: number; netOpen: number }[] {
    const trend: { date: number; opened: number; closed: number; netOpen: number }[] = [];
    const now = Date.now();
    let running = 0;
    for (let d = days; d >= 0; d--) {
      const dayStart = now - d * 24 * 60 * 60 * 1000;
      const dayEnd = now - (d - 1) * 24 * 60 * 60 * 1000;
      const opened = Array.from(this._findings.values()).filter(f => f.detectedAt >= dayStart && f.detectedAt < dayEnd).length;
      const closed = Array.from(this._findings.values()).filter(f => f.status === 'remediated' && f.detectedAt < dayStart).length;
      running += opened - closed;
      trend.push({ date: dayStart, opened, closed, netOpen: running });
    }
    return trend;
  }

  assignFindingOwner(findingId: string, owner: string): boolean {
    const finding = this._findings.get(findingId);
    if (!finding) return false;
    this._findings.set(findingId, { ...finding, owner });
    this._recordAudit('audit_manager', 'assign_owner', findingId, 'success', { owner });
    return true;
  }

  setFindingDueDate(findingId: string, dueDate: number): boolean {
    const finding = this._findings.get(findingId);
    if (!finding) return false;
    this._findings.set(findingId, { ...finding, dueDate });
    return true;
  }

  reopenFinding(findingId: string, reason: string): boolean {
    const finding = this._findings.get(findingId);
    if (!finding) return false;
    this._findings.set(findingId, { ...finding, status: 'open' });
    this._recordAudit('auditor', 'reopen_finding', findingId, 'success', { reason });
    return true;
  }

  bulkUpdateFindingsStatus(findingIds: string[], status: AuditFinding['status']): { updated: number; failed: number } {
    let updated = 0;
    let failed = 0;
    findingIds.forEach(id => {
      const finding = this._findings.get(id);
      if (finding) {
        this._findings.set(id, { ...finding, status });
        updated++;
      } else {
        failed++;
      }
    });
    this._recordAudit('auditor', 'bulk_update_status', 'multiple', 'success', { updated, failed, status });
    return { updated, failed };
  }

  calculateInherentRisk(likelihood: number, impact: number): number {
    return Math.round(likelihood * impact * 4);
  }

  calculateResidualRisk(inherentRisk: number, mitigationEffectiveness: number): number {
    return Math.round(inherentRisk * (1 - mitigationEffectiveness / 100));
  }

  controlEffectivenessReport(controlId: string): { controlId: string; testsRun: number; passRate: number; lastTested?: number; trend: string } | null {
    const tests = Array.from(this._controlTests.values()).filter(t => t.controlId === controlId);
    if (tests.length === 0) return null;
    const passed = tests.filter(t => t.result === 'pass').length;
    const passRate = Math.round((passed / tests.length) * 100);
    const lastTested = tests.reduce((latest, t) => t.lastTested && (!latest || t.lastTested > latest) ? t.lastTested : latest, undefined as number | undefined);
    const trend = passRate >= 90 ? 'improving' : passRate >= 70 ? 'stable' : 'declining';
    return { controlId, testsRun: tests.length, passRate, lastTested, trend };
  }

  auditReadinessCheck(framework: string): { ready: boolean; gaps: string[]; controlsTested: number; controlsUntested: number; findingsOpen: number } {
    const controls = Array.from(this._controlTests.values()).filter(c => c.framework === framework);
    const tested = controls.filter(c => c.result && c.result !== 'not_tested').length;
    const untested = controls.length - tested;
    const findings = Array.from(this._findings.values()).filter(f => f.framework === framework && f.status === 'open');
    const gaps: string[] = [];
    if (untested > 0) gaps.push(`${untested} controls not tested`);
    if (findings.length > 0) gaps.push(`${findings.length} open findings`);
    if (this.overdueFindings().length > 0) gaps.push(`${this.overdueFindings().length} overdue findings`);
    return {
      ready: gaps.length === 0,
      gaps,
      controlsTested: tested,
      controlsUntested: untested,
      findingsOpen: findings.length,
    };
  }

  toPacket(): DataPacket<{
    auditLogs: AuditLog[];
    reports: ComplianceReport[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['network_security', 'SecurityAudit'],
      priority: 1,
      phase: 'security_audit',
    };
    return {
      id: `security-audit-${Date.now().toString(36)}`,
      payload: {
        auditLogs: this._auditLogs,
        reports: this._reports,
      },
      metadata,
    };
  }

  reset(): void {
    this._auditLogs = [];
    this._reports = [];
    this._counter = 0;
    this._findings.clear();
    this._riskRegister.clear();
    this._controlTests.clear();
    this._evidence.clear();
    this._auditSchedule.clear();
    this._controls.clear();
    this._monitoringRules.clear();
    this._logSources.clear();
    this._stakeholders.clear();
    this._auditTrail = [];
    this._frameworks.clear();
    this._exceptions.clear();
    this._metrics.clear();
  }
}
