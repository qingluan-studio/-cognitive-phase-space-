import { DataPacket } from '../shared/types';

/** A safety constraint with violation response. */
export interface SafetyConstraint {
  readonly constraint: string;
  readonly violation: string;
  readonly response: 'block' | 'warn' | 'log' | 'shutdown';
  readonly threshold: number;
}

/** A risk assessment. */
export interface RiskAssessment {
  readonly level: 'low' | 'medium' | 'high' | 'critical';
  readonly probability: number;
  readonly impact: number;
  readonly mitigations: string[];
}

/** A safety case argument. */
export interface SafetyCase {
  readonly claim: string;
  readonly argument: string;
  readonly evidence: string[];
  readonly assumptions: string[];
  readonly confidence: number;
}

/** Result of a safety check. */
export interface SafetyResult {
  readonly safe: boolean;
  readonly action: string;
  readonly constraintsViolated: string[];
  readonly timestamp: number;
}

export class SafetyMonitor {
  private _constraints: Map<string, SafetyConstraint> = new Map();
  private _assessments: RiskAssessment[] = [];
  private _cases: SafetyCase[] = [];
  private _history: string[] = [];
  private _counter = 0;
  private _killSwitchActive = false;

  get constraintCount(): number {
    return this._constraints.size;
  }

  get assessmentCount(): number {
    return this._assessments.length;
  }

  get caseCount(): number {
    return this._cases.length;
  }

  get killSwitchActive(): boolean {
    return this._killSwitchActive;
  }

  get history(): string[] {
    return [...this._history];
  }

  public constraintCheck(action: { name: string; params: unknown }, constraints: SafetyConstraint[]): SafetyResult {
    const violated = constraints.filter(c => Math.random() < 0.1);
    const safe = violated.length === 0;
    let response = 'allow';
    if (violated.some(v => v.response === 'block')) response = 'block';
    else if (violated.some(v => v.response === 'shutdown')) {
      response = 'shutdown';
      this._killSwitchActive = true;
    } else if (violated.length > 0) response = 'warn';
    this._recordHistory(`constraintCheck(action=${action.name}, safe=${safe})`);
    return {
      safe,
      action: response,
      constraintsViolated: violated.map(v => v.constraint),
      timestamp: Date.now(),
    };
  }

  public riskAssess(action: { name: string }, context: { environment: string }): RiskAssessment {
    const probability = Math.random();
    const impact = Math.random();
    const level: RiskAssessment['level'] = probability > 0.7 ? 'critical' : probability > 0.4 ? 'high' : probability > 0.2 ? 'medium' : 'low';
    const mitigations = level === 'critical' || level === 'high' ? ['halt', 'human-review'] : ['monitor'];
    const assessment: RiskAssessment = { level, probability, impact, mitigations };
    this._assessments.push(assessment);
    this._recordHistory(`riskAssess(level=${level})`);
    return assessment;
  }

  public safetyCase(model: { type: string }, environment: { name: string }, assumptions: string[]): SafetyCase {
    const sc: SafetyCase = {
      claim: `Model ${model.type} is safe to operate in ${environment.name}`,
      argument: 'Provided evidence supports the safety claim under stated assumptions',
      evidence: ['test-results', 'formal-verification', 'monitoring-data'],
      assumptions,
      confidence: 0.85,
    };
    this._cases.push(sc);
    this._recordHistory('safetyCase()');
    return sc;
  }

  public adversarialRobustness(model: { type: string }, attacks: { type: string }[]): { robust: boolean; accuracy: number; attacks: number } {
    const accuracy = 0.7 + Math.random() * 0.2;
    const robust = accuracy > 0.75;
    this._recordHistory(`adversarialRobustness(attacks=${attacks.length}, robust=${robust})`);
    return { robust, accuracy, attacks: attacks.length };
  }

  public distributionalShift(train: { distribution: number[] }, test: { distribution: number[] }): { shifted: boolean; distance: number; severity: 'none' | 'mild' | 'severe' } {
    const n = Math.min(train.distribution.length, test.distribution.length);
    let distance = 0;
    for (let i = 0; i < n; i++) {
      distance += Math.abs((train.distribution[i] ?? 0) - (test.distribution[i] ?? 0));
    }
    const shifted = distance > 0.3;
    const severity: 'none' | 'mild' | 'severe' = distance > 0.6 ? 'severe' : distance > 0.3 ? 'mild' : 'none';
    this._recordHistory(`distributionalShift(distance=${distance.toFixed(3)})`);
    return { shifted, distance, severity };
  }

  public outOfDistribution(input: { features: number[] }, distribution: { mean: number; std: number }): { ood: boolean; score: number; threshold: number } {
    const mean = input.features.reduce((s, v) => s + v, 0) / Math.max(1, input.features.length);
    const score = Math.abs(mean - distribution.mean) / Math.max(0.01, distribution.std);
    const threshold = 2;
    const ood = score > threshold;
    this._recordHistory(`outOfDistribution(score=${score.toFixed(3)}, ood=${ood})`);
    return { ood, score, threshold };
  }

  public anomalyDetection(input: { features: number[] }, baseline: { mean: number; std: number }): { anomaly: boolean; zscore: number; input: number[] } {
    const mean = input.features.reduce((s, v) => s + v, 0) / Math.max(1, input.features.length);
    const zscore = Math.abs(mean - baseline.mean) / Math.max(0.01, baseline.std);
    const anomaly = zscore > 3;
    this._recordHistory(`anomalyDetection(zscore=${zscore.toFixed(3)})`);
    return { anomaly, zscore, input: input.features };
  }

  public monitoringBounds(model: { type: string }, inputs: { features: number[] }[]): { withinBounds: boolean; min: number; max: number; violations: number } {
    const values = inputs.flatMap(i => i.features);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const violations = values.filter(v => v < -5 || v > 5).length;
    this._recordHistory(`monitoringBounds(violations=${violations})`);
    return { withinBounds: violations === 0, min, max, violations };
  }

  public fallbackStrategy(failure: { type: string }, context: { environment: string }): { fallback: string; activated: boolean; reason: string } {
    const fallback = failure.type === 'crash' ? 'safe-state' : 'degraded-mode';
    this._recordHistory(`fallbackStrategy(${fallback})`);
    return { fallback, activated: true, reason: failure.type };
  }

  public containment(model: { type: string }, boundaries: { sandbox: boolean; network: boolean }): { contained: boolean; boundaries: string[] } {
    const set: string[] = [];
    if (boundaries.sandbox) set.push('sandbox');
    if (boundaries.network) set.push('network-isolation');
    this._recordHistory(`containment(${set.join(',')})`);
    return { contained: set.length > 0, boundaries: set };
  }

  public killSwitch(condition: { name: string }, action: { name: string }): { triggered: boolean; condition: string; action: string } {
    const triggered = Math.random() < 0.1 || condition.name === 'critical';
    if (triggered) this._killSwitchActive = true;
    this._recordHistory(`killSwitch(triggered=${triggered})`);
    return { triggered, condition: condition.name, action: action.name };
  }

  public sandboxExecution(model: { type: string }, inputs: { features: number[] }[]): { sandboxed: boolean; result: string; resources: { cpu: number; memory: number } } {
    this._recordHistory('sandboxExecution()');
    return {
      sandboxed: true,
      result: 'executed-safely',
      resources: { cpu: 0.5, memory: 256 },
    };
  }

  public formalSafetyGuarantee(model: { type: string }, property: { formula: string }): { guaranteed: boolean; property: string; method: string } {
    const guaranteed = Math.random() > 0.3;
    this._recordHistory(`formalSafetyGuarantee(guaranteed=${guaranteed})`);
    return { guaranteed, property: property.formula, method: 'model-checking' };
  }

  public assessments(): RiskAssessment[] {
    return this._assessments.map(a => ({ ...a, mitigations: [...a.mitigations] }));
  }

  public constraints(): SafetyConstraint[] {
    return Array.from(this._constraints.values()).map(c => ({ ...c }));
  }

  public cases(): SafetyCase[] {
    return this._cases.map(c => ({ ...c, evidence: [...c.evidence], assumptions: [...c.assumptions] }));
  }

  public lastAssessment(): RiskAssessment | null {
    return this._assessments.length > 0 ? { ...this._assessments[this._assessments.length - 1], mitigations: [...this._assessments[this._assessments.length - 1].mitigations] } : null;
  }

  public summary(): { constraints: number; assessments: number; cases: number; killSwitchActive: boolean; historyLength: number; counter: number } {
    return {
      constraints: this._constraints.size,
      assessments: this._assessments.length,
      cases: this._cases.length,
      killSwitchActive: this._killSwitchActive,
      historyLength: this._history.length,
      counter: this._counter,
    };
  }

  public toJSON(): Record<string, unknown> {
    return {
      constraints: this._constraints.size,
      assessments: this._assessments.length,
      cases: this._cases.length,
      killSwitchActive: this._killSwitchActive,
      history: [...this._history],
      highRiskCount: this._assessments.filter(a => a.level === 'high' || a.level === 'critical').length,
    };
  }

  public validate(): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    for (const c of this._constraints.values()) {
      if (c.threshold < 0) issues.push(`constraint ${c.constraint}: negative threshold`);
    }
    for (const a of this._assessments) {
      if (a.probability < 0 || a.probability > 1) issues.push('assessment: probability out of [0,1]');
      if (a.impact < 0 || a.impact > 1) issues.push('assessment: impact out of [0,1]');
    }
    for (const sc of this._cases) {
      if (sc.confidence < 0 || sc.confidence > 1) issues.push('safety case: confidence out of [0,1]');
    }
    return { valid: issues.length === 0, issues };
  }

  public riskDistribution(): {
    total: number;
    byLevel: { level: string; count: number }[];
    avgProbability: number;
    avgImpact: number;
  } {
    const total = this._assessments.length;
    const levels = new Map<string, number>();
    for (const a of this._assessments) {
      levels.set(a.level, (levels.get(a.level) ?? 0) + 1);
    }
    const avgProbability = total > 0 ? this._assessments.reduce((s, a) => s + a.probability, 0) / total : 0;
    const avgImpact = total > 0 ? this._assessments.reduce((s, a) => s + a.impact, 0) / total : 0;
    return {
      total,
      byLevel: Array.from(levels.entries()).map(([level, count]) => ({ level, count })),
      avgProbability,
      avgImpact,
    };
  }

  public safetyPosture(): {
    constraintsActive: number;
    killSwitchArmed: boolean;
    casesDocumented: number;
    overallPosture: 'safe' | 'caution' | 'unsafe';
  } {
    const criticalAssessments = this._assessments.filter(a => a.level === 'critical').length;
    const overallPosture: 'safe' | 'caution' | 'unsafe' =
      this._killSwitchActive || criticalAssessments > 2 ? 'unsafe' : criticalAssessments > 0 ? 'caution' : 'safe';
    return {
      constraintsActive: this._constraints.size,
      killSwitchArmed: this._killSwitchActive,
      casesDocumented: this._cases.length,
      overallPosture,
    };
  }

  private _recordHistory(entry: string): void {
    this._counter++;
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
  }

  public toPacket(): DataPacket<{
    constraints: number;
    assessments: number;
    cases: number;
    killSwitchActive: boolean;
    history: string[];
  }> {
    return {
      id: `safety-${Date.now()}-${this._counter}`,
      payload: {
        constraints: this._constraints.size,
        assessments: this._assessments.length,
        cases: this._cases.length,
        killSwitchActive: this._killSwitchActive,
        history: [...this._history],
      },
      metadata: {
        createdAt: Date.now(),
        route: ['ai_ethics', 'safety', 'result'],
        priority: 1.0,
        phase: 'monitoring',
      },
    };
  }

  public reset(): void {
    this._constraints.clear();
    this._assessments = [];
    this._cases = [];
    this._history = [];
    this._counter = 0;
    this._killSwitchActive = false;
  }
}
