export interface Nightmare {
  id: string;
  scenario: Record<string, unknown>;
  intensity: number;
  triggeredAt: number;
  exposedFailures: string[];
  resolved: boolean;
  chaosLevel: number;
  pressureVector: number[];
}

export interface ExposedFailure {
  id: string;
  component: string;
  description: string;
  severity: number;
  probability: number;
  rootCause: string;
}

export class NightmareDebugger {
  private _nightmares: Nightmare[] = [];
  private _failures: ExposedFailure[] = [];
  private _maxIntensity: number = 0.95;
  private _monteCarloRuns: number = 100;
  private _chaosGrowthRate: number = 0.15;
  private _stressDimension: number = 6;
  private _lyapunovExponent: number = 0.72;

  induce(scenario: Record<string, unknown>, intensity: number): Nightmare {
    const clamped = Math.min(this._maxIntensity, Math.max(0, intensity));
    const pressureVector = this._generatePressureVector(clamped);
    const nightmare: Nightmare = {
      id: `nightmare-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      scenario,
      intensity: clamped,
      triggeredAt: Date.now(),
      exposedFailures: [],
      resolved: false,
      chaosLevel: clamped * 0.5,
      pressureVector,
    };
    this._nightmares.push(nightmare);
    return nightmare;
  }

  observe(nightmareId: string): ExposedFailure[] {
    const n = this._nightmares.find(x => x.id === nightmareId);
    if (!n) return [];
    const failures = this._monteCarloProbe(n);
    n.exposedFailures = failures.map(f => f.id);
    this._failures.push(...failures);
    n.chaosLevel = Math.min(1, n.chaosLevel + this._chaosGrowthRate);
    return failures;
  }

  analyze(): { total: number; byComponent: Record<string, number>; riskScore: number; entropy: number } {
    const byComponent: Record<string, number> = {};
    for (const f of this._failures) byComponent[f.component] = (byComponent[f.component] ?? 0) + 1;
    const total = this._failures.length;
    const riskScore = total === 0 ? 0 : this._failures.reduce((s, f) => s + f.severity * f.probability, 0) / total;
    const entropy = this._computeFailureEntropy(byComponent, total);
    return { total, byComponent, riskScore, entropy };
  }

  exposeFailure(nightmareId: string): ExposedFailure | null {
    const n = this._nightmares.find(x => x.id === nightmareId);
    if (!n) return null;
    const components = Object.keys(n.scenario);
    const compIdx = Math.floor(Math.random() * components.length);
    const component = components[compIdx] || 'unknown';
    const stress = this._logisticMap(n.intensity, n.chaosLevel);
    const severity = Math.min(1, stress * n.intensity);
    const probability = this._estimateFailureProbability(component, n.intensity);
    const f: ExposedFailure = {
      id: `fail-${nightmareId}-${n.exposedFailures.length}`,
      component,
      description: `cracked under chaos level ${n.chaosLevel.toFixed(3)}`,
      severity,
      probability,
      rootCause: this._identifyRootCause(component, n.scenario),
    };
    n.exposedFailures.push(f.id);
    this._failures.push(f);
    return f;
  }

  recover(nightmareId: string): boolean {
    const n = this._nightmares.find(x => x.id === nightmareId);
    if (!n || n.resolved) return false;
    n.resolved = true;
    n.chaosLevel = 0;
    return true;
  }

  getNightmares(): Nightmare[] { return [...this._nightmares]; }
  get failures(): ExposedFailure[] { return [...this._failures]; }
  get unresolvedCount(): number { return this._nightmares.filter(n => !n.resolved).length; }
  get chaosGrowthRate(): number { return this._chaosGrowthRate; }

  setMonteCarloRuns(runs: number): void {
    this._monteCarloRuns = Math.max(10, Math.min(1000, runs));
  }

  private _generatePressureVector(intensity: number): number[] {
    const vec: number[] = [];
    let seed = intensity * 9999;
    for (let i = 0; i < this._stressDimension; i++) {
      seed = this._logisticMap(seed / 10000, 3.9) * 10000;
      vec.push((seed / 10000) * intensity);
    }
    return vec;
  }

  private _logisticMap(x: number, r: number): number {
    const clampedR = Math.max(0, Math.min(4, r + 1));
    return clampedR * x * (1 - x);
  }

  private _monteCarloProbe(n: Nightmare): ExposedFailure[] {
    const components = Object.keys(n.scenario);
    const failureCounts: Record<string, number> = {};
    const failureSeverities: Record<string, number[]> = {};
    for (let run = 0; run < this._monteCarloRuns; run++) {
      let chaos = n.chaosLevel;
      const pressure = [...n.pressureVector];
      for (let step = 0; step < 20; step++) {
        for (let d = 0; d < pressure.length; d++)
          pressure[d] = this._logisticMap(pressure[d], 3.5 + n.intensity * 0.5);
        chaos = Math.min(1, chaos + this._lyapunovExponent * 0.01);
        const stressNorm = Math.sqrt(pressure.reduce((s, v) => s + v * v, 0));
        const threshold = 1 - n.intensity * 0.5;
        if (stressNorm > threshold) {
          const comp = components[Math.floor(Math.random() * components.length)];
          failureCounts[comp] = (failureCounts[comp] ?? 0) + 1;
          if (!failureSeverities[comp]) failureSeverities[comp] = [];
          failureSeverities[comp].push(stressNorm - threshold);
        }
      }
    }
    const failures: ExposedFailure[] = [];
    for (const comp of components) {
      const count = failureCounts[comp] ?? 0;
      if (count > 0) {
        const probability = count / this._monteCarloRuns;
        const sevs = failureSeverities[comp] ?? [0];
        const severity = Math.min(1, sevs.reduce((s, v) => s + v, 0) / sevs.length);
        failures.push({
          id: `fail-${n.id}-${comp}`,
          component: comp,
          description: `exposed by monte carlo stress probing`,
          severity,
          probability,
          rootCause: this._identifyRootCause(comp, n.scenario),
        });
      }
    }
    return failures.sort((a, b) => b.severity * b.probability - a.severity * a.probability);
  }

  private _estimateFailureProbability(component: string, intensity: number): number {
    const base = 0.1;
    const exponential = 1 - Math.exp(-intensity * 3);
    return Math.min(0.99, base + exponential * 0.9);
  }

  private _identifyRootCause(component: string, scenario: Record<string, unknown>): string {
    const value = scenario[component];
    const type = typeof value;
    if (type === 'number') return 'numerical_overflow';
    if (type === 'string') return 'buffer_boundary';
    if (type === 'boolean') return 'state_race';
    return 'unknown_origin';
  }

  private _computeFailureEntropy(byComponent: Record<string, number>, total: number): number {
    if (total === 0) return 0;
    let entropy = 0;
    for (const count of Object.values(byComponent)) {
      const p = count / total;
      if (p > 0) entropy -= p * Math.log2(p);
    }
    return entropy;
  }
}
