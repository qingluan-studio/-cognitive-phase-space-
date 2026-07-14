/** 末世论引擎 - 持续模拟崩溃方式，提前生成逃生路径 */

export interface CollapseScenario {
  id: string;
  name: string;
  trigger: string;
  probability: number;
  severity: number;
  simulatedAt: number;
}

export interface EscapePath {
  id: string;
  scenarioId: string;
  steps: string[];
  viability: number;
  generatedAt: number;
}

export type SimulationOutcome = 'collapsed' | 'escaped' | 'partial';

export interface SimulationRun {
  id: string;
  scenarioId: string;
  outcome: SimulationOutcome;
  duration: number;
  runAt: number;
}

export class EschatologicalEngine {
  private _scenarios: Map<string, CollapseScenario> = new Map();
  private _escapePaths: Map<string, EscapePath[]> = new Map();
  private _simulations: SimulationRun[] = [];
  private _idCounter = 0;
  private _autoGenerate = true;
  private _minViability = 0.4;

  registerScenario(
    name: string,
    trigger: string,
    probability: number,
    severity: number
  ): CollapseScenario {
    if (probability < 0 || probability > 1) throw new Error('Probability must be in [0,1]');
    if (severity < 0 || severity > 1) throw new Error('Severity must be in [0,1]');
    const id = `collapse-${++this._idCounter}-${Date.now()}`;
    const scenario: CollapseScenario = {
      id,
      name,
      trigger,
      probability,
      severity,
      simulatedAt: Date.now(),
    };
    this._scenarios.set(id, scenario);
    this._escapePaths.set(id, []);
    if (this._autoGenerate) {
      this.generateEscapePaths(id, 2);
    }
    return scenario;
  }

  generateEscapePaths(scenarioId: string, count: number = 1): EscapePath[] {
    const scenario = this._scenarios.get(scenarioId);
    if (!scenario) throw new Error(`Scenario not found: ${scenarioId}`);
    const paths: EscapePath[] = [];
    const existing = this._escapePaths.get(scenarioId) || [];
    for (let i = 0; i < count; i++) {
      const viability = this._computeViability(scenario, existing.length + i);
      const steps = this._draftSteps(scenario, viability);
      const path: EscapePath = {
        id: `escape-${++this._idCounter}-${Date.now()}`,
        scenarioId,
        steps,
        viability,
        generatedAt: Date.now(),
      };
      paths.push(path);
    }
    existing.push(...paths);
    this._escapePaths.set(scenarioId, existing);
    return paths;
  }

  simulate(scenarioId: string, escapePathId?: string): SimulationRun {
    const scenario = this._scenarios.get(scenarioId);
    if (!scenario) throw new Error(`Scenario not found: ${scenarioId}`);
    const paths = this._escapePaths.get(scenarioId) || [];
    const path = escapePathId ? paths.find(p => p.id === escapePathId) : paths[0];
    const escapeChance = path ? path.viability * (1 - scenario.severity * 0.5) : 0;
    const roll = Math.random();
    let outcome: SimulationOutcome;
    if (roll < escapeChance) outcome = 'escaped';
    else if (roll < escapeChance + 0.2) outcome = 'partial';
    else outcome = 'collapsed';
    const run: SimulationRun = {
      id: `sim-${++this._idCounter}-${Date.now()}`,
      scenarioId,
      outcome,
      duration: Math.floor(Math.random() * 1000),
      runAt: Date.now(),
    };
    this._simulations.push(run);
    return run;
  }

  runAllSimulations(): SimulationRun[] {
    const results: SimulationRun[] = [];
    for (const scenarioId of this._scenarios.keys()) {
      results.push(this.simulate(scenarioId));
    }
    return results;
  }

  setAutoGenerate(auto: boolean): void {
    this._autoGenerate = auto;
  }

  setMinViability(v: number): void {
    if (v < 0 || v > 1) throw new Error('Viability must be in [0,1]');
    this._minViability = v;
  }

  getScenarios(): CollapseScenario[] {
    return Array.from(this._scenarios.values());
  }

  getEscapePaths(scenarioId: string): EscapePath[] {
    return [...(this._escapePaths.get(scenarioId) || [])];
  }

  getBestEscapePath(scenarioId: string): EscapePath | null {
    const paths = this._escapePaths.get(scenarioId) || [];
    if (paths.length === 0) return null;
    return paths.reduce((best, p) => (p.viability > best.viability ? p : best));
  }

  get simulations(): SimulationRun[] {
    return [...this._simulations];
  }

  get autoGenerate(): boolean {
    return this._autoGenerate;
  }

  get minViability(): number {
    return this._minViability;
  }

  get scenarioCount(): number {
    return this._scenarios.size;
  }

  private _computeViability(scenario: CollapseScenario, attempt: number): number {
    const base = 1 - scenario.severity * 0.7;
    const explorationBonus = Math.min(0.2, attempt * 0.05);
    return Math.max(this._minViability, Math.min(1, base + explorationBonus + Math.random() * 0.1));
  }

  private _draftSteps(scenario: CollapseScenario, viability: number): string[] {
    const steps = [
      `detect trigger: ${scenario.trigger}`,
      'isolate affected region',
      'activate fallback pathway',
    ];
    if (viability > 0.7) steps.push('full restore');
    else if (viability > 0.5) steps.push('graceful degrade');
    else steps.push('emergency minimal mode');
    return steps;
  }
}
