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

interface FourValuedTruth {
  true: number;
  false: number;
  unknown: number;
  contradictory: number;
}

export class TwilightZoneFilter {
  private _states: IntermediateState[] = [];
  private _rules: TwilightRule[] = [];
  private _twilightIndex: number = 0;
  private _membershipFunctions: Record<string, (x: number) => number> = {};
  private _entanglementMatrix: Map<string, Map<string, number>> = new Map();

  constructor() {
    this._initMembershipFunctions();
  }

  registerRule(rule: TwilightRule): void {
    this._rules.push(rule);
  }

  filter(input: { id: string; payload: Record<string, unknown>; realness: number }[]): IntermediateState[] {
    const out: IntermediateState[] = [];
    for (const item of input) {
      const realness = Math.max(0, Math.min(1, item.realness));
      const simulatedness = 1 - realness;
      const twilightMembership = this._twilightMembership(realness);
      const twilight = twilightMembership > 0.3;
      const state: IntermediateState = {
        id: item.id,
        payload: { ...item.payload, twilightMembership },
        realness,
        simulatedness,
        twilight,
        rulesApplied: [],
      };
      out.push(state);
      this._states.push(state);
      if (twilight) this._twilightIndex++;
      this._updateEntanglement(state);
    }
    return out;
  }

  captureIntermediate(): IntermediateState | null {
    for (let i = this._states.length - 1; i >= 0; i--) {
      if (this._states[i].twilight) return this._states[i];
    }
    return null;
  }

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
    this._entanglementMatrix.clear();
  }

  getFourValued(stateId: string): FourValuedTruth | null {
    const state = this._states.find(s => s.id === stateId);
    if (!state) return null;
    const r = state.realness;
    const s = state.simulatedness;
    const t = Math.min(r, 1 - s);
    const f = Math.min(1 - r, s);
    const contradiction = Math.max(0, r + s - 1);
    const unknown = Math.max(0, 1 - r - s);
    return { true: t, false: f, unknown, contradictory: contradiction };
  }

  getEntanglement(idA: string, idB: string): number {
    const row = this._entanglementMatrix.get(idA);
    return row?.get(idB) ?? 0;
  }

  superpose(idA: string, idB: string): IntermediateState | null {
    const a = this._states.find(s => s.id === idA);
    const b = this._states.find(s => s.id === idB);
    if (!a || !b) return null;
    const entanglement = this.getEntanglement(idA, idB);
    const alpha = 0.5 + entanglement * 0.3;
    const beta = 1 - alpha;
    const superposed: IntermediateState = {
      id: `superpose-${Date.now()}`,
      payload: this._interleavePayloads(a.payload, b.payload, alpha, beta),
      realness: alpha * a.realness + beta * b.realness,
      simulatedness: alpha * a.simulatedness + beta * b.simulatedness,
      twilight: true,
      rulesApplied: [...a.rulesApplied, ...b.rulesApplied, 'superposition'],
    };
    this._states.push(superposed);
    this._twilightIndex++;
    return superposed;
  }

  collapse(stateId: string): boolean {
    const state = this._states.find(s => s.id === stateId);
    if (!state || !state.twilight) return false;
    const collapseProb = state.realness;
    const collapsedToReal = Math.random() < collapseProb;
    if (collapsedToReal) {
      state.realness = 1;
      state.simulatedness = 0;
    } else {
      state.realness = 0;
      state.simulatedness = 1;
    }
    state.twilight = false;
    state.payload = { ...state.payload, collapsed: true, collapsedToReal };
    return collapsedToReal;
  }

  private _initMembershipFunctions(): void {
    this._membershipFunctions = {
      low: x => Math.max(0, Math.min(1, (0.4 - x) / 0.4)),
      medium: x => Math.max(0, Math.min(1, x < 0.4 ? x / 0.4 : (0.8 - x) / 0.4)),
      high: x => Math.max(0, Math.min(1, (x - 0.6) / 0.4)),
      twilight: x => this._twilightMembership(x),
    };
  }

  private _twilightMembership(realness: number): number {
    const center = 0.5;
    const width = 0.4;
    const normalized = Math.abs(realness - center) / width;
    if (normalized >= 1) return 0;
    return Math.pow(1 - normalized, 2);
  }

  private _updateEntanglement(state: IntermediateState): void {
    for (const existing of this._states) {
      if (existing.id === state.id) continue;
      if (!existing.twilight || !state.twilight) continue;
      const distance = Math.abs(state.realness - existing.realness);
      const payloadSim = this._payloadSimilarity(state.payload, existing.payload);
      const entanglement = (1 - distance) * 0.6 + payloadSim * 0.4;
      if (!this._entanglementMatrix.has(state.id)) {
        this._entanglementMatrix.set(state.id, new Map());
      }
      if (!this._entanglementMatrix.has(existing.id)) {
        this._entanglementMatrix.set(existing.id, new Map());
      }
      this._entanglementMatrix.get(state.id)!.set(existing.id, entanglement);
      this._entanglementMatrix.get(existing.id)!.set(state.id, entanglement);
    }
  }

  private _payloadSimilarity(a: Record<string, unknown>, b: Record<string, unknown>): number {
    const keysA = new Set(Object.keys(a));
    const keysB = new Set(Object.keys(b));
    const intersection = new Set([...keysA].filter(k => keysB.has(k)));
    const union = new Set([...keysA, ...keysB]);
    if (union.size === 0) return 0.5;
    return intersection.size / union.size;
  }

  private _interleavePayloads(a: Record<string, unknown>, b: Record<string, unknown>, alpha: number, beta: number): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const key of allKeys) {
      const valA = a[key];
      const valB = b[key];
      if (typeof valA === 'number' && typeof valB === 'number') {
        result[key] = alpha * valA + beta * valB;
      } else if (valA !== undefined && valB !== undefined) {
        result[key] = Math.random() < alpha ? valA : valB;
      } else {
        result[key] = valA ?? valB;
      }
    }
    return result;
  }
}
