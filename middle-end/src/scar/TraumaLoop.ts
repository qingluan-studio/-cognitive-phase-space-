/**
 * 创伤循环模块：主动重复创伤场景训练系统应对能力，
 * 通过反复暴露于威胁来逐步脱敏并强化反应策略。
 */

export type DesensitizationLevel = 'acute' | 'sensitive' | 'tolerant' | 'resilient' | 'numb';

export interface TraumaScenario {
  id: string;
  name: string;
  trigger: string;
  severity: number;
  exposureCount: number;
  desensitization: DesensitizationLevel;
}

export interface LoopIteration {
  scenarioId: string;
  iteration: number;
  responseTime: number;
  damageTaken: number;
  learningGain: number;
  occurredAt: number;
}

export class TraumaLoop {
  private _scenarios: Map<string, TraumaScenario> = new Map();
  private _iterations: LoopIteration[] = [];
  private _maxExposure = 10;
  private _learningRate = 0.15;
  private _desensitizationOrder: DesensitizationLevel[] = ['acute', 'sensitive', 'tolerant', 'resilient', 'numb'];

  registerScenario(scenario: TraumaScenario): void {
    this._scenarios.set(scenario.id, scenario);
  }

  private _advanceDesensitization(scenario: TraumaScenario): void {
    const currentIndex = this._desensitizationOrder.indexOf(scenario.desensitization);
    if (currentIndex >= 0 && currentIndex < this._desensitizationOrder.length - 1) {
      const threshold = (currentIndex + 1) * 2;
      if (scenario.exposureCount >= threshold) {
        scenario.desensitization = this._desensitizationOrder[currentIndex + 1];
      }
    }
  }

  runIteration(scenarioId: string): LoopIteration | null {
    const scenario = this._scenarios.get(scenarioId);
    if (!scenario) return null;
    if (scenario.exposureCount >= this._maxExposure && scenario.desensitization === 'numb') return null;
    scenario.exposureCount++;
    const reductionFactor = scenario.exposureCount / (scenario.exposureCount + 5);
    const damageTaken = scenario.severity * (1 - reductionFactor);
    const responseTime = Math.max(10, 1000 * (1 - reductionFactor));
    const learningGain = scenario.severity * this._learningRate * reductionFactor;
    this._advanceDesensitization(scenario);
    const iteration: LoopIteration = {
      scenarioId,
      iteration: scenario.exposureCount,
      responseTime,
      damageTaken,
      learningGain,
      occurredAt: Date.now(),
    };
    this._iterations.push(iteration);
    if (this._iterations.length > 300) this._iterations.shift();
    return iteration;
  }

  runLoop(scenarioId: string, count: number): LoopIteration[] {
    const results: LoopIteration[] = [];
    for (let i = 0; i < count; i++) {
      const iteration = this.runIteration(scenarioId);
      if (!iteration) break;
      results.push(iteration);
    }
    return results;
  }

  isDesensitized(scenarioId: string): boolean {
    const scenario = this._scenarios.get(scenarioId);
    if (!scenario) return false;
    const index = this._desensitizationOrder.indexOf(scenario.desensitization);
    return index >= 2;
  }

  resetScenario(scenarioId: string): boolean {
    const scenario = this._scenarios.get(scenarioId);
    if (!scenario) return false;
    scenario.exposureCount = 0;
    scenario.desensitization = 'acute';
    return true;
  }

  setLearningRate(rate: number): void {
    this._learningRate = Math.max(0, Math.min(1, rate));
  }

  getIterationsByScenario(scenarioId: string): LoopIteration[] {
    return this._iterations.filter(i => i.scenarioId === scenarioId);
  }

  findDesensitizedScenarios(): TraumaScenario[] {
    return Array.from(this._scenarios.values()).filter(s => this.isDesensitized(s.id));
  }

  getScenario(scenarioId: string): TraumaScenario | null {
    return this._scenarios.get(scenarioId) ?? null;
  }

  get scenarioCount(): number {
    return this._scenarios.size;
  }

  get totalIterations(): number {
    return this._iterations.length;
  }
}
