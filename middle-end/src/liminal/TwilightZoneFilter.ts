/**
 * 阴阳魔界过滤器：利用真实与模拟之间的中间态规则。
 * 在真假二值之外，过滤出"既真又假"的 twilight 中间态，
 * 并对这些状态应用专门的转换规则。
 */

export interface IntermediateState {
  id: string;
  payload: Record<string, unknown>;
  realness: number;
  simulatedness: number;
  twilight: boolean;
  rulesApplied: string[];
}

export interface TwilightRule {
  name: string;
  condition: (s: IntermediateState) => boolean;
  transform: (s: IntermediateState) => IntermediateState;
}

export class TwilightZoneFilter {
  private _states: IntermediateState[] = [];
  private _rules: TwilightRule[] = [];
  private _twilightIndex: number = 0;

  registerRule(rule: TwilightRule): void {
    this._rules.push(rule);
  }

  /** 过滤输入流，标记进入 twilight 带的状态。 */
  filter(input: { id: string; payload: Record<string, unknown>; realness: number }[]): IntermediateState[] {
    const out: IntermediateState[] = [];
    for (const item of input) {
      const realness = Math.max(0, Math.min(1, item.realness));
      const simulatedness = 1 - realness;
      const twilight = realness > 0.3 && realness < 0.7;
      const state: IntermediateState = {
        id: item.id,
        payload: item.payload,
        realness,
        simulatedness,
        twilight,
        rulesApplied: [],
      };
      out.push(state);
      this._states.push(state);
      if (twilight) this._twilightIndex++;
    }
    return out;
  }

  /** 捕获最近一次进入 twilight 的状态。 */
  captureIntermediate(): IntermediateState | null {
    for (let i = this._states.length - 1; i >= 0; i--) {
      if (this._states[i].twilight) return this._states[i];
    }
    return null;
  }

  /** 对所有 twilight 状态评估注册的规则。 */
  evaluateRules(): number {
    let applied = 0;
    for (const state of this._states) {
      if (!state.twilight) continue;
      for (const rule of this._rules) {
        if (rule.condition(state)) {
          const transformed = rule.transform(state);
          Object.assign(state, transformed);
          state.rulesApplied.push(rule.name);
          applied++;
        }
      }
    }
    return applied;
  }

  applyRule(stateId: string, ruleName: string): boolean {
    const state = this._states.find(s => s.id === stateId);
    const rule = this._rules.find(r => r.name === ruleName);
    if (!state || !rule || !state.twilight) return false;
    if (rule.condition(state)) {
      Object.assign(state, rule.transform(state));
      state.rulesApplied.push(rule.name);
      return true;
    }
    return false;
  }

  getStates(): IntermediateState[] {
    return [...this._states];
  }

  get twilightIndex(): number {
    return this._twilightIndex;
  }

  clear(): void {
    this._states = [];
    this._twilightIndex = 0;
  }
}
