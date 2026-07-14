/**
 * 噩梦调试器：故意制造系统噩梦，暴露隐藏故障。
 * 通过向系统注入极端压力场景诱导"噩梦"，从而逼出
 * 在常规条件下难以触发的隐藏故障，便于分析。
 */

export interface Nightmare {
  id: string;
  scenario: Record<string, unknown>;
  intensity: number;
  triggeredAt: number;
  exposedFailures: string[];
  resolved: boolean;
}

export interface ExposedFailure {
  id: string;
  component: string;
  description: string;
  severity: number;
}

export class NightmareDebugger {
  private _nightmares: Nightmare[] = [];
  private _failures: ExposedFailure[] = [];
  private _maxIntensity: number = 0.95;

  /** 诱导一次噩梦：注入极端场景。 */
  induce(scenario: Record<string, unknown>, intensity: number): Nightmare {
    const clamped = Math.min(this._maxIntensity, intensity);
    const nightmare: Nightmare = {
      id: `nightmare-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      scenario,
      intensity: clamped,
      triggeredAt: Date.now(),
      exposedFailures: [],
      resolved: false,
    };
    this._nightmares.push(nightmare);
    return nightmare;
  }

  /** 观察噩梦运行，收集暴露的故障。 */
  observe(nightmareId: string): ExposedFailure[] {
    const n = this._nightmares.find(x => x.id === nightmareId);
    if (!n) return [];
    const failures = this._probe(n);
    n.exposedFailures = failures.map(f => f.id);
    this._failures.push(...failures);
    return failures;
  }

  /** 分析所有噩梦暴露的隐藏故障。 */
  analyze(): { total: number; byComponent: Record<string, number> } {
    const byComponent: Record<string, number> = {};
    for (const f of this._failures) {
      byComponent[f.component] = (byComponent[f.component] ?? 0) + 1;
    }
    return { total: this._failures.length, byComponent };
  }

  /** 从噩梦场景中提取单条故障。 */
  exposeFailure(nightmareId: string): ExposedFailure | null {
    const n = this._nightmares.find(x => x.id === nightmareId);
    if (!n) return null;
    const f: ExposedFailure = {
      id: `fail-${nightmareId}-${n.exposedFailures.length}`,
      component: 'unknown',
      description: `induced under intensity ${n.intensity}`,
      severity: n.intensity,
    };
    n.exposedFailures.push(f.id);
    this._failures.push(f);
    return f;
  }

  /** 从噩梦中恢复，结束当前场景。 */
  recover(nightmareId: string): boolean {
    const n = this._nightmares.find(x => x.id === nightmareId);
    if (!n || n.resolved) return false;
    n.resolved = true;
    return true;
  }

  getNightmares(): Nightmare[] {
    return [...this._nightmares];
  }

  get failures(): ExposedFailure[] {
    return [...this._failures];
  }

  get unresolvedCount(): number {
    return this._nightmares.filter(n => !n.resolved).length;
  }

  private _probe(n: Nightmare): ExposedFailure[] {
    const out: ExposedFailure[] = [];
    const components = Object.keys(n.scenario);
    for (const c of components) {
      if (n.intensity > 0.7) {
        out.push({
          id: `fail-${c}-${Date.now()}`,
          component: c,
          description: `cracked under nightmare intensity ${n.intensity}`,
          severity: n.intensity,
        });
      }
    }
    return out;
  }
}
