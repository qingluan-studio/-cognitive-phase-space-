export interface ParadoxInput {
  id: string;
  premiseA: string;
  premiseB: string;
  contradictionScore: number;
}

export interface AporiaResolution {
  strategy: 'reject-premise' | 'distinguish-context' | 'suspend-judgment';
  confidence: number;
  explanation: string;
}

export class AporiaEngine {
  private _inputs: ParadoxInput[] = [];
  private _resolutions: Map<string, AporiaResolution> = new Map();
  private _incompletenessScore: number = 0;
  private _diagonalCounter: number = 0;
  private _formalSystem: Map<string, boolean> = new Map();
  private _proofAttempts: { theorem: string; success: boolean }[] = [];
  private _godelNumbering: Map<string, number> = new Map();

  submit(premiseA: string, premiseB: string): ParadoxInput | null {
    const contradictionScore = this._computeContradiction(premiseA, premiseB);
    if (contradictionScore < 0.3) return null;
    const input: ParadoxInput = {
      id: `paradox-${Date.now()}-${this._diagonalCounter++}`,
      premiseA,
      premiseB,
      contradictionScore,
    };
    this._inputs.push(input);
    if (this._inputs.length > 30) this._inputs.shift();
    this._assignGodelNumber(input.id);
    this._updateIncompleteness();
    return input;
  }

  private _computeContradiction(a: string, b: string): number {
    const tokensA = new Set(a.split(/\W+/));
    const tokensB = new Set(b.split(/\W+/));
    const intersection = new Set([...tokensA].filter(x => tokensB.has(x)));
    const union = new Set([...tokensA, ...tokensB]);
    const jaccard = union.size > 0 ? intersection.size / union.size : 0;
    const negationA = a.includes('not ') || a.includes('never');
    const negationB = b.includes('not ') || b.includes('never');
    const polarityMismatch = negationA !== negationB ? 0.3 : 0;
    return Math.min(1, jaccard * 0.7 + polarityMismatch);
  }

  private _assignGodelNumber(id: string): void {
    const prime = this._nthPrime(this._godelNumbering.size + 1);
    this._godelNumbering.set(id, prime);
  }

  private _nthPrime(n: number): number {
    let count = 0;
    let num = 2;
    while (count < n) {
      let isPrime = true;
      for (let i = 2; i <= Math.sqrt(num); i++) {
        if (num % i === 0) { isPrime = false; break; }
      }
      if (isPrime) count++;
      if (count < n) num++;
    }
    return num;
  }

  private _updateIncompleteness(): void {
    const n = this._inputs.length;
    this._incompletenessScore = n > 0 ? 1 - 1 / Math.log(n + Math.E) : 0;
  }

  resolve(inputId: string): AporiaResolution | null {
    const input = this._inputs.find(p => p.id === inputId);
    if (!input) return null;
    const godelNum = this._godelNumbering.get(inputId) ?? 0;
    const diagonal = this._diagonalArgument(godelNum);
    let strategy: AporiaResolution['strategy'];
    let confidence: number;
    if (diagonal) {
      strategy = 'reject-premise';
      confidence = input.contradictionScore;
    } else if (input.contradictionScore > 0.7) {
      strategy = 'distinguish-context';
      confidence = 0.6;
    } else {
      strategy = 'suspend-judgment';
      confidence = 0.4;
    }
    const resolution: AporiaResolution = {
      strategy,
      confidence,
      explanation: `Resolution of ${inputId} via ${strategy} with confidence ${confidence.toFixed(2)}`,
    };
    this._resolutions.set(inputId, resolution);
    return resolution;
  }

  private _diagonalArgument(godelNumber: number): boolean {
    const statement = `This statement with Godel number ${godelNumber} is unprovable`;
    this._formalSystem.set(statement, false);
    return !this._formalSystem.get(statement);
  }

  attemptProof(theorem: string): boolean {
    const isProvable = !theorem.includes('unprovable') && !this._formalSystem.has(theorem);
    this._proofAttempts.push({ theorem, success: isProvable });
    if (this._proofAttempts.length > 20) this._proofAttempts.shift();
    return isProvable;
  }

  isParadoxical(inputId: string): boolean {
    const input = this._inputs.find(p => p.id === inputId);
    return !!input && input.contradictionScore > 0.8;
  }

  getUnresolvableCount(): number {
    return this._inputs.filter(p => !this._resolutions.has(p.id)).length;
  }

  listInputs(): ParadoxInput[] {
    return [...this._inputs];
  }

  getResolution(inputId: string): AporiaResolution | null {
    return this._resolutions.get(inputId) ?? null;
  }

  get incompletenessScore(): number {
    return this._incompletenessScore;
  }

  get diagonalCount(): number {
    return this._diagonalCounter;
  }

  get proofAttemptCount(): number {
    return this._proofAttempts.length;
  }

  computeEntailmentClosure(premise: string): Set<string> {
    const closure = new Set<string>();
    const queue = [premise];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (closure.has(current)) continue;
      closure.add(current);
      for (const input of this._inputs) {
        if (input.premiseA === current && !closure.has(input.premiseB)) queue.push(input.premiseB);
        if (input.premiseB === current && !closure.has(input.premiseA)) queue.push(input.premiseA);
      }
    }
    return closure;
  }

  getGodelNumber(statementId: string): number | null {
    return this._godelNumbering.get(statementId) ?? null;
  }

  computeProofSuccessRate(): number {
    if (this._proofAttempts.length === 0) return 0;
    const successes = this._proofAttempts.filter(a => a.success).length;
    return successes / this._proofAttempts.length;
  }
}
