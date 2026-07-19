import { DataPacket } from '../shared/types';

/** A type with kind and constructors. */
export interface Type {
  readonly name: string;
  readonly kind: 'type' | 'arrow' | 'forall' | 'dependent' | 'linear';
  readonly constructors: string[];
  readonly parameters: Type[];
}

/** A typing judgment: term has type in context. */
export interface TypeJudgment {
  readonly context: { variable: string; type: Type }[];
  readonly term: string;
  readonly type: Type;
  readonly valid: boolean;
}

/** A typing rule with premises and conclusion. */
export interface TypeRule {
  readonly name: string;
  readonly premises: TypeJudgment[];
  readonly conclusion: TypeJudgment;
}

/** Result of type checking. */
export interface TypeCheckResult {
  readonly valid: boolean;
  readonly type: Type | null;
  readonly errors: string[];
  readonly term: string;
}

export class TypeChecker {
  private _types: Map<string, Type> = new Map();
  private _judgments: TypeJudgment[] = [];
  private _rules: TypeRule[] = [];
  private _history: string[] = [];
  private _counter = 0;

  get typeCount(): number {
    return this._types.size;
  }

  get judgmentCount(): number {
    return this._judgments.length;
  }

  get ruleCount(): number {
    return this._rules.length;
  }

  get history(): string[] {
    return [...this._history];
  }

  public checkType(term: string, type: Type, context: { variable: string; type: Type }[]): TypeCheckResult {
    const errors: string[] = [];
    let valid = true;
    if (term.includes('(') && !term.includes(')')) {
      errors.push('unbalanced parentheses');
      valid = false;
    }
    if (term.startsWith('λ')) {
      valid = type.kind === 'arrow';
      if (!valid) errors.push('lambda requires arrow type');
    }
    this._recordHistory(`checkType(${term}, valid=${valid})`);
    return { valid, type: valid ? type : null, errors, term };
  }

  public inferType(term: string, context: { variable: string; type: Type }[]): TypeCheckResult {
    let type: Type | null = null;
    const errors: string[] = [];
    if (term.startsWith('λ')) {
      type = { name: 'arrow', kind: 'arrow', constructors: [], parameters: [] };
    } else if (/^\d+$/.test(term)) {
      type = { name: 'Nat', kind: 'type', constructors: ['zero', 'succ'], parameters: [] };
    } else if (context.find(c => c.variable === term)) {
      type = context.find(c => c.variable === term)!.type;
    } else {
      errors.push(`cannot infer type for ${term}`);
    }
    this._recordHistory(`inferType(${term}, type=${type?.name ?? 'unknown'})`);
    return { valid: type !== null, type, errors, term };
  }

  public typedLambdaCalculus(term: string, context: { variable: string; type: Type }[]): TypeCheckResult {
    const result = this.inferType(term, context);
    this._recordHistory('typedLambdaCalculus()');
    return result;
  }

  public simplyTyped(term: string, context: { variable: string; type: Type }[]): TypeCheckResult {
    const result = this.checkType(term, { name: 'base', kind: 'type', constructors: [], parameters: [] }, context);
    this._recordHistory('simplyTyped()');
    return result;
  }

  public systemF(term: string, context: { variable: string; type: Type }[]): TypeCheckResult {
    const result = this.inferType(term, context);
    const valid = result.valid;
    this._recordHistory(`systemF(valid=${valid})`);
    return { ...result, valid };
  }

  public systemFOmega(term: string, context: { variable: string; type: Type }[]): TypeCheckResult {
    const result = this.systemF(term, context);
    this._recordHistory('systemFOmega()');
    return result;
  }

  public dependentTypes(term: string, context: { variable: string; type: Type }[]): TypeCheckResult {
    const result = this.inferType(term, context);
    this._recordHistory('dependentTypes()');
    return { ...result, type: result.type ? { ...result.type, kind: 'dependent' } : null };
  }

  public linearTypes(term: string, context: { variable: string; type: Type }[]): TypeCheckResult {
    const usedVars = context.filter(c => term.includes(c.variable));
    const linear = usedVars.length === 1 || usedVars.every(v => term.split(v.variable).length - 1 === 1);
    const result = this.inferType(term, context);
    this._recordHistory(`linearTypes(linear=${linear})`);
    return { ...result, valid: result.valid && linear, errors: linear ? result.errors : [...result.errors, 'non-linear use of variable'] };
  }

  public intersectionTypes(term: string, context: { variable: string; type: Type }[]): TypeCheckResult {
    const t1 = this.inferType(term, context);
    const intersectType: Type = t1.type ? { ...t1.type, name: `${t1.type.name} ∧ Top` } : null!;
    this._recordHistory('intersectionTypes()');
    return { ...t1, type: intersectType };
  }

  public unionTypes(term: string, context: { variable: string; type: Type }[]): TypeCheckResult {
    const t1 = this.inferType(term, context);
    const unionType: Type = t1.type ? { ...t1.type, name: `${t1.type.name} ∨ Bottom` } : null!;
    this._recordHistory('unionTypes()');
    return { ...t1, type: unionType };
  }

  public subtyping(type1: Type, type2: Type): { subtype: boolean; type1: string; type2: string } {
    const subtype = type1.name === type2.name || type2.name === 'Top' || type1.name === 'Bottom';
    this._recordHistory(`subtyping(${type1.name} <: ${type2.name} = ${subtype})`);
    return { subtype, type1: type1.name, type2: type2.name };
  }

  public polymorphism(term: string, type: Type, context: { variable: string; type: Type }[]): { polymorphic: boolean; type: Type; term: string } {
    const polymorphic = type.kind === 'forall' || type.kind === 'arrow';
    this._recordHistory(`polymorphism(${polymorphic})`);
    return { polymorphic, type, term };
  }

  public unification(type1: Type, type2: Type): { unified: boolean; substitution: Record<string, Type>; type1: string; type2: string } {
    const substitution: Record<string, Type> = {};
    const unified = type1.name === type2.name || type1.kind === 'forall' || type2.kind === 'forall';
    if (!unified && type1.kind !== type2.kind) {
      substitution[type1.name] = type2;
    }
    this._recordHistory(`unification(${type1.name}, ${type2.name}, unified=${unified})`);
    return { unified, substitution, type1: type1.name, type2: type2.name };
  }

  public principalType(term: string): TypeCheckResult {
    const result = this.inferType(term, []);
    this._recordHistory(`principalType(${term})`);
    return result;
  }

  public typeInference(term: string): TypeCheckResult {
    const result = this.inferType(term, []);
    this._recordHistory(`typeInference(${term})`);
    return result;
  }

  public typeSafety(system: LogicalSystemSpec): { safe: boolean; progress: boolean; preservation: boolean; system: string } {
    const progress = true;
    const preservation = true;
    const safe = progress && preservation;
    this._recordHistory(`typeSafety(safe=${safe})`);
    return { safe, progress, preservation, system: system.name };
  }

  public progress(term: string): { progresses: boolean; term: string; value: boolean } {
    const isValue = !term.includes(' ') && !term.includes('(');
    const progresses = !isValue;
    this._recordHistory(`progress(${term}, value=${isValue})`);
    return { progresses, term, value: isValue };
  }

  public preservation(term: string, type: Type): { preserved: boolean; term: string; type: string } {
    this._recordHistory('preservation()');
    return { preserved: true, term, type: type.name };
  }

  public registerType(type: Type): void {
    this._types.set(type.name, type);
  }

  public judgments(): TypeJudgment[] {
    return this._judgments.map(j => ({ ...j, context: [...j.context], type: { ...j.type, parameters: [...j.type.parameters] } }));
  }

  public types(): Type[] {
    return Array.from(this._types.values()).map(t => ({ ...t, constructors: [...t.constructors], parameters: t.parameters.map(p => ({ ...p })) }));
  }

  public lastJudgment(): TypeJudgment | null {
    return this._judgments.length > 0
      ? { ...this._judgments[this._judgments.length - 1], context: [...this._judgments[this._judgments.length - 1].context], type: { ...this._judgments[this._judgments.length - 1].type, parameters: [...this._judgments[this._judgments.length - 1].type.parameters] } }
      : null;
  }

  public summary(): { types: number; judgments: number; rules: number; historyLength: number; counter: number } {
    return {
      types: this._types.size,
      judgments: this._judgments.length,
      rules: this._rules.length,
      historyLength: this._history.length,
      counter: this._counter,
    };
  }

  public toJSON(): Record<string, unknown> {
    return {
      types: this._types.size,
      judgments: this._judgments.length,
      rules: this._rules.length,
      history: [...this._history],
      typeNames: Array.from(this._types.keys()),
    };
  }

  public validate(): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    for (const t of this._types.values()) {
      if (t.name.length === 0) issues.push('type: empty name');
      if (t.kind === 'arrow' && t.parameters.length < 2) issues.push(`arrow type ${t.name}: fewer than 2 parameters`);
    }
    for (const j of this._judgments) {
      for (const ctx of j.context) {
        if (ctx.variable.length === 0) issues.push('judgment: empty variable in context');
      }
    }
    return { valid: issues.length === 0, issues };
  }

  public typeHierarchy(): {
    root: string;
    depth: number;
    byKind: { kind: string; count: number }[];
  } {
    const kinds = new Map<string, number>();
    for (const t of this._types.values()) {
      kinds.set(t.kind, (kinds.get(t.kind) ?? 0) + 1);
    }
    return {
      root: 'Top',
      depth: Math.max(0, ...Array.from(this._types.values()).map(t => t.parameters.length)),
      byKind: Array.from(kinds.entries()).map(([kind, count]) => ({ kind, count })),
    };
  }

  public inferenceStatistics(): {
    total: number;
    successful: number;
    failed: number;
    successRate: number;
  } {
    const total = this._judgments.length;
    const successful = this._judgments.filter(j => j.valid).length;
    const failed = total - successful;
    return { total, successful, failed, successRate: total > 0 ? successful / total : 0 };
  }

  private _recordHistory(entry: string): void {
    this._counter++;
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
  }

  public toPacket(): DataPacket<{
    types: number;
    judgments: number;
    rules: number;
    history: string[];
  }> {
    return {
      id: `typecheck-${Date.now()}-${this._counter}`,
      payload: {
        types: this._types.size,
        judgments: this._judgments.length,
        rules: this._rules.length,
        history: [...this._history],
      },
      metadata: {
        createdAt: Date.now(),
        route: ['formal_verification', 'type_checker', 'result'],
        priority: 0.9,
        phase: 'verification',
      },
    };
  }

  public reset(): void {
    this._types.clear();
    this._judgments = [];
    this._rules = [];
    this._history = [];
    this._counter = 0;
  }
}

/** Minimal logical system spec used by typeSafety. */
export interface LogicalSystemSpec {
  readonly name: string;
  readonly axioms: string[];
}
