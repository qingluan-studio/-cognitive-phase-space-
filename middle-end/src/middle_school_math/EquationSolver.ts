import { DataPacket, PacketMeta } from '../shared/types';

/** Type of equation being solved. */
export type EquationType = 'linear' | 'quadratic' | 'cubic' | 'fractional' | 'absolute' | 'system';

/** Equation representation with two sides and the unknown variable. */
export interface Equation {
  leftSide: string;
  rightSide: string;
  variable: string;
  type: EquationType;
}

/** A single step in a derivation showing how one state transitions to the next. */
export interface SolutionStep {
  operation: string;
  from: string;
  to: string;
  annotation: string;
}

/** Solution for an equation, with steps and root count. */
export interface Solution {
  variable: string;
  value: number | number[];
  steps: SolutionStep[];
  numberOfSolutions: number;
}

/** Inequality representation including the solution interval. */
export interface Inequality {
  expression: string;
  variable: string;
  direction: '>' | '<' | '>=' | '<=';
  solution: string;
}

export class EquationSolver {
  private _equations: Map<string, Equation> = new Map();
  private _solutions: Solution[] = [];
  private _inequalities: Inequality[] = [];
  private _history: unknown[] = [];
  private _counter = 0;

  solveLinear(a: number, b: number): Solution {
    const steps: SolutionStep[] = [];
    if (Math.abs(a) < 1e-12) {
      if (Math.abs(b) < 1e-12) {
        steps.push({ operation: 'identity', from: '0=0', to: 'infinitely many', annotation: 'all x satisfy' });
        return { variable: 'x', value: NaN, steps, numberOfSolutions: Infinity };
      }
      steps.push({ operation: 'contradiction', from: `0=${b}`, to: 'no solution', annotation: 'inconsistent' });
      return { variable: 'x', value: NaN, steps, numberOfSolutions: 0 };
    }
    steps.push({ operation: 'isolate', from: `${a}x + ${b} = 0`, to: `${a}x = ${-b}`, annotation: 'subtract constant' });
    steps.push({ operation: 'divide', from: `${a}x = ${-b}`, to: `x = ${-b / a}`, annotation: 'divide by leading coefficient' });
    const sol: Solution = { variable: 'x', value: -b / a, steps, numberOfSolutions: 1 };
    this._solutions.push(sol);
    this._history.push({ op: 'solveLinear', sol });
    return sol;
  }

  solveQuadratic(a: number, b: number, c: number): Solution {
    const steps: SolutionStep[] = [];
    if (Math.abs(a) < 1e-12) {
      return this.solveLinear(b, c);
    }
    const disc = b * b - 4 * a * c;
    steps.push({ operation: 'discriminant', from: `${a}x^2+${b}x+${c}=0`, to: `Δ=${disc}`, annotation: 'compute b^2-4ac' });
    if (disc < -1e-9) {
      steps.push({ operation: 'no_real_roots', from: `Δ=${disc}`, to: 'no real solution', annotation: 'negative discriminant' });
      const sol: Solution = { variable: 'x', value: [], steps, numberOfSolutions: 0 };
      this._solutions.push(sol);
      return sol;
    }
    if (Math.abs(disc) < 1e-9) {
      const root = -b / (2 * a);
      steps.push({ operation: 'double_root', from: 'Δ=0', to: `x=${root}`, annotation: 'single repeated root' });
      const sol: Solution = { variable: 'x', value: [root, root], steps, numberOfSolutions: 1 };
      this._solutions.push(sol);
      return sol;
    }
    const sqrtD = Math.sqrt(disc);
    const r1 = (-b + sqrtD) / (2 * a);
    const r2 = (-b - sqrtD) / (2 * a);
    steps.push({ operation: 'quadratic_formula', from: `Δ=${disc}`, to: `x=${r1}, x=${r2}`, annotation: 'two distinct roots' });
    const sol: Solution = { variable: 'x', value: [r1, r2], steps, numberOfSolutions: 2 };
    this._solutions.push(sol);
    this._history.push({ op: 'solveQuadratic', sol });
    return sol;
  }

  solveCubic(a: number, b: number, c: number, d: number): Solution {
    const steps: SolutionStep[] = [];
    if (Math.abs(a) < 1e-12) {
      return this.solveQuadratic(b, c, d);
    }
    // Normalize: x^3 + p x^2 + q x + r = 0
    const p = b / a;
    const q = c / a;
    const r = d / a;
    steps.push({ operation: 'normalize', from: `${a}x^3+${b}x^2+${c}x+${d}=0`, to: `x^3+${p}x^2+${q}x+${r}=0`, annotation: 'divide by leading coefficient' });
    // Substitute x = t - p/3 (depressed cubic)
    const shift = -p / 3;
    const A = q - p * p / 3;
    const B = r + 2 * p * p * p / 27 - p * q / 3;
    steps.push({ operation: 'depress', from: `x^3+${p}x^2...`, to: `t^3+${A}t+${B}=0`, annotation: `shift x = t ${shift}` });
    const disc = B * B / 4 + A * A * A / 27;
    const roots: number[] = [];
    if (disc > 1e-12) {
      const sqrtD = Math.sqrt(disc);
      const u = Math.cbrt(-B / 2 + sqrtD);
      const v = Math.cbrt(-B / 2 - sqrtD);
      roots.push(u + v + shift);
      const real = u + v + shift;
      steps.push({ operation: 'cardano_real', from: `disc=${disc}`, to: `x=${real}`, annotation: 'one real root' });
    } else if (Math.abs(disc) < 1e-9) {
      const u = Math.cbrt(-B / 2);
      roots.push(2 * u + shift);
      roots.push(-u + shift);
      steps.push({ operation: 'cardano_repeat', from: 'disc=0', to: `roots=${roots.length}`, annotation: 'repeated roots' });
    } else {
      const m = 2 * Math.sqrt(-A / 3);
      const theta = Math.acos((3 * B) / (A * m)) / 3;
      for (let k = 0; k < 3; k++) {
        roots.push(m * Math.cos(theta + (2 * Math.PI * k) / 3) + shift);
      }
      steps.push({ operation: 'trigonometric', from: `disc=${disc}`, to: `3 real roots`, annotation: 'casus irreducibilis' });
    }
    const sol: Solution = { variable: 'x', value: roots, steps, numberOfSolutions: roots.length };
    this._solutions.push(sol);
    this._history.push({ op: 'solveCubic', sol });
    return sol;
  }

  solveSystem(matrix: number[][], constants: number[]): Solution {
    const sol = this.gaussianElimination(
      matrix.map((row, i) => [...row, constants[i]]),
    );
    const steps: SolutionStep[] = [
      { operation: 'augment', from: 'A|b', to: 'augmented matrix', annotation: 'append constants column' },
      { operation: 'gaussian_elim', from: 'augmented', to: `RREF`, annotation: 'row reduce to echelon form' },
      { operation: 'back_substitute', from: 'RREF', to: `[${sol.join(', ')}]`, annotation: 'extract solution' },
    ];
    const result: Solution = {
      variable: 'system',
      value: sol,
      steps,
      numberOfSolutions: sol.length,
    };
    this._solutions.push(result);
    this._history.push({ op: 'solveSystem', result });
    return result;
  }

  solveFractional(numerator: number[], denominator: number[]): Solution {
    const steps: SolutionStep[] = [];
    steps.push({ operation: 'multiply', from: 'P(x)/Q(x)=0', to: 'P(x)=0 (Q(x)≠0)', annotation: 'multiply both sides by Q' });
    // Build coefficients (numerator[0]=constant, [1]=x, [2]=x^2...)
    if (numerator.length === 2) {
      const sol = this.solveLinear(numerator[1], numerator[0]);
      steps.push(...sol.steps);
      const result: Solution = {
        variable: 'x',
        value: sol.value,
        steps,
        numberOfSolutions: sol.numberOfSolutions,
      };
      this._solutions.push(result);
      return result;
    }
    if (numerator.length === 3) {
      const sol = this.solveQuadratic(numerator[2], numerator[1], numerator[0]);
      steps.push(...sol.steps);
      const result: Solution = {
        variable: 'x',
        value: sol.value,
        steps,
        numberOfSolutions: sol.numberOfSolutions,
      };
      this._solutions.push(result);
      return result;
    }
    return { variable: 'x', value: NaN, steps, numberOfSolutions: 0 };
  }

  solveAbsolute(expr: string, value: number): Solution {
    const steps: SolutionStep[] = [];
    const inner = expr.replace(/[|]/g, '');
    steps.push({ operation: 'split', from: `|${inner}|=${value}`, to: `${inner}=${value} or ${inner}=-${value}`, annotation: 'split by definition of absolute value' });
    const r1 = value;
    const r2 = -value;
    steps.push({ operation: 'solve_branch_1', from: `${inner}=${value}`, to: `x=${r1}`, annotation: 'positive branch' });
    steps.push({ operation: 'solve_branch_2', from: `${inner}=-${value}`, to: `x=${r2}`, annotation: 'negative branch' });
    const sol: Solution = {
      variable: 'x',
      value: [r1, r2],
      steps,
      numberOfSolutions: 2,
    };
    this._solutions.push(sol);
    this._history.push({ op: 'solveAbsolute', sol });
    return sol;
  }

  solveInequality(a: number, b: number, direction: Inequality['direction']): Inequality {
    if (Math.abs(a) < 1e-12) {
      const truth = (direction === '>' || direction === '>=') ? (b > 0) : (b < 0);
      const sol: Inequality = {
        expression: `${a}x+${b}${direction}0`,
        variable: 'x',
        direction,
        solution: truth ? '(-∞, +∞)' : '∅',
      };
      this._inequalities.push(sol);
      return sol;
    }
    const root = -b / a;
    let solution: string;
    if (a > 0) {
      switch (direction) {
        case '>': solution = `(${root}, +∞)`; break;
        case '>=': solution = `[${root}, +∞)`; break;
        case '<': solution = `(-∞, ${root})`; break;
        default: solution = `(-∞, ${root}]`; break;
      }
    } else {
      switch (direction) {
        case '>': solution = `(-∞, ${root})`; break;
        case '>=': solution = `(-∞, ${root}]`; break;
        case '<': solution = `(${root}, +∞)`; break;
        default: solution = `[${root}, +∞)`; break;
      }
    }
    const ineq: Inequality = {
      expression: `${a}x+${b}${direction}0`,
      variable: 'x',
      direction,
      solution,
    };
    this._inequalities.push(ineq);
    this._history.push({ op: 'solveInequality', ineq });
    return ineq;
  }

  solveQuadraticInequality(a: number, b: number, c: number, direction: Inequality['direction']): Inequality {
    const sol = this.solveQuadratic(a, b, c);
    const roots = Array.isArray(sol.value) ? (sol.value as number[]) : [];
    let solution: string;
    if (roots.length === 0) {
      solution = a > 0 ? '(-∞, +∞)' : '∅';
    } else if (roots.length === 1) {
      const r = roots[0];
      if (a > 0) {
        solution = direction === '<' || direction === '<=' ? `(-∞, ${r}) ∪ (${r}, +∞)` : `{${r}}`;
      } else {
        solution = direction === '>' || direction === '>=' ? `(-∞, ${r}) ∪ (${r}, +∞)` : `{${r}}`;
      }
    } else {
      const [r1, r2] = roots.sort((x, y) => x - y);
      if (a > 0) {
        solution = direction === '<' || direction === '<=' ? `(${r1}, ${r2})` : `(-∞, ${r1}] ∪ [${r2}, +∞)`;
      } else {
        solution = direction === '>' || direction === '>=' ? `(${r1}, ${r2})` : `(-∞, ${r1}] ∪ [${r2}, +∞)`;
      }
    }
    const ineq: Inequality = {
      expression: `${a}x^2+${b}x+${c}${direction}0`,
      variable: 'x',
      direction,
      solution,
    };
    this._inequalities.push(ineq);
    this._history.push({ op: 'solveQuadraticInequality', ineq });
    return ineq;
  }

  gaussianElimination(matrix: number[][]): number[] {
    const m = matrix.map(row => [...row]);
    const rows = m.length;
    const cols = m[0].length;
    let r = 0;
    for (let col = 0; col < cols - 1 && r < rows; col++) {
      let pivot = r;
      for (let i = r + 1; i < rows; i++) {
        if (Math.abs(m[i][col]) > Math.abs(m[pivot][col])) pivot = i;
      }
      if (Math.abs(m[pivot][col]) < 1e-12) continue;
      [m[r], m[pivot]] = [m[pivot], m[r]];
      const pivVal = m[r][col];
      for (let j = col; j < cols; j++) m[r][j] /= pivVal;
      for (let i = 0; i < rows; i++) {
        if (i !== r) {
          const factor = m[i][col];
          for (let j = col; j < cols; j++) m[i][j] -= factor * m[r][j];
        }
      }
      r++;
    }
    const solution = new Array(rows).fill(0);
    for (let i = 0; i < rows; i++) {
      const pivCol = m[i].findIndex((v, idx) => idx < cols - 1 && Math.abs(v) > 1e-12);
      if (pivCol >= 0) solution[pivCol] = m[i][cols - 1];
    }
    this._history.push({ op: 'gaussianElimination', solution });
    return solution;
  }

  cramerRule(matrix: number[][], constants: number[]): number[] {
    const n = matrix.length;
    const det = this._determinant(matrix);
    if (Math.abs(det) < 1e-12) return new Array(n).fill(NaN);
    const solution: number[] = [];
    for (let i = 0; i < n; i++) {
      const replaced = matrix.map((row, j) => row.map((v, k) => (k === i ? constants[j] : v)));
      solution.push(this._determinant(replaced) / det);
    }
    this._history.push({ op: 'cramerRule', solution });
    return solution;
  }

  checkSolution(equation: Equation, value: number): boolean {
    // Heuristic numerical check using simple substitution on parsed left - right = 0
    const expr = `${equation.leftSide}-(${equation.rightSide})`;
    const v = equation.variable;
    const substituted = expr.replace(new RegExp(v, 'g'), `(${value})`);
    try {
      // eslint-disable-next-line no-new-func
      const fn = new Function(`return ${substituted};`);
      const result = Number(fn());
      return Math.abs(result) < 1e-6;
    } catch {
      return false;
    }
  }

  private _determinant(m: number[][]): number {
    const n = m.length;
    if (n === 1) return m[0][0];
    if (n === 2) return m[0][0] * m[1][1] - m[0][1] * m[1][0];
    let det = 0;
    for (let j = 0; j < n; j++) {
      const minor: number[][] = [];
      for (let i = 1; i < n; i++) {
        minor.push(m[i].filter((_, k) => k !== j));
      }
      det += (j % 2 === 0 ? 1 : -1) * m[0][j] * this._determinant(minor);
    }
    return det;
  }

  toPacket(): DataPacket<{
    equations: Map<string, Equation>;
    solutions: Solution[];
    inequalities: Inequality[];
    history: unknown[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['middle_school_math', 'EquationSolver'],
      priority: 1,
      phase: 'equation_solving',
    };
    return {
      id: `eqsolver-${Date.now().toString(36)}`,
      payload: {
        equations: this._equations,
        solutions: this._solutions,
        inequalities: this._inequalities,
        history: this._history,
      },
      metadata,
    };
  }

  reset(): void {
    this._equations = new Map();
    this._solutions = [];
    this._inequalities = [];
    this._history = [];
    this._counter = 0;
  }

  get equationCount(): number {
    return this._equations.size;
  }

  get solutionCount(): number {
    return this._solutions.length;
  }

  get inequalityCount(): number {
    return this._inequalities.length;
  }
}
