export interface ThreeValue {
  truth: number;
  falsity: number;
  indeterminacy: number;
}

export interface FuzzyInference {
  premise: string;
  conclusion: string;
  confidence: number;
  belief: number;
  plausibility: number;
}

export class PenumbraLogic {
  private _values: Map<string, ThreeValue> = new Map();
  private _inferences: FuzzyInference[] = [];
  private _state: Record<string, unknown> = {};
  private _kleeneOperations: number = 0;

  constructor() {}

  get valueCount(): number {
    return this._values.size;
  }

  get inferenceCount(): number {
    return this._inferences.length;
  }

  setValue(name: string, truth: number, falsity: number, indeterminacy: number): void {
    this._values.set(name, { truth, falsity, indeterminacy });
  }

  kleeneAnd(a: string, b: string): ThreeValue {
    const va = this._values.get(a);
    const vb = this._values.get(b);
    if (!va || !vb) return { truth: 0, falsity: 1, indeterminacy: 0 };
    const truth = Math.min(va.truth, vb.truth);
    const falsity = Math.max(va.falsity, vb.falsity);
    const indeterminacy = 1 - truth - falsity;
    this._kleeneOperations++;
    return { truth, falsity, indeterminacy };
  }

  kleeneOr(a: string, b: string): ThreeValue {
    const va = this._values.get(a);
    const vb = this._values.get(b);
    if (!va || !vb) return { truth: 0, falsity: 1, indeterminacy: 0 };
    const truth = Math.max(va.truth, vb.truth);
    const falsity = Math.min(va.falsity, vb.falsity);
    const indeterminacy = 1 - truth - falsity;
    this._kleeneOperations++;
    return { truth, falsity, indeterminacy };
  }

  kleeneNot(a: string): ThreeValue {
    const va = this._values.get(a);
    if (!va) return { truth: 0, falsity: 1, indeterminacy: 0 };
    this._kleeneOperations++;
    return { truth: va.falsity, falsity: va.truth, indeterminacy: va.indeterminacy };
  }

  fuzzyImplication(a: string, b: string): number {
    const va = this._values.get(a);
    const vb = this._values.get(b);
    if (!va || !vb) return 0;
    return Math.min(1, 1 - va.truth + vb.truth);
  }

  infer(premise: string, conclusion: string, confidence: number): FuzzyInference {
    const v = this._values.get(premise);
    const belief = v ? v.truth * confidence : 0;
    const plausibility = v ? 1 - v.falsity : 0;
    const inference: FuzzyInference = { premise, conclusion, confidence, belief, plausibility };
    this._inferences.push(inference);
    if (this._inferences.length > 100) this._inferences.shift();
    return inference;
  }

  confidenceInterval(name: string): { lower: number; upper: number } {
    const v = this._values.get(name);
    if (!v) return { lower: 0, upper: 0 };
    return { lower: v.truth, upper: 1 - v.falsity };
  }

  beliefFunction(subset: string[]): number {
    let sum = 0;
    for (const name of subset) {
      const v = this._values.get(name);
      if (v) sum += v.truth;
    }
    return sum;
  }

  plausibilityFunction(subset: string[]): number {
    let sum = 0;
    for (const name of subset) {
      const v = this._values.get(name);
      if (v) sum += 1 - v.falsity;
    }
    return sum;
  }

  uncertaintyEntropy(): number {
    let sum = 0;
    for (const v of this._values.values()) {
      if (v.indeterminacy > 0) {
        sum += -v.indeterminacy * Math.log2(v.indeterminacy);
      }
    }
    return sum;
  }

  report(): Record<string, unknown> {
    return {
      values: this._values.size,
      inferences: this._inferences.length,
      kleeneOperations: this._kleeneOperations,
      uncertainty: this.uncertaintyEntropy(),
      state: this._state,
    };
  }
}
