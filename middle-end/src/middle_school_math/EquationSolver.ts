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

/** Word problem representation. */
export interface WordProblem {
  description: string;
  variables: string[];
  equations: string[];
  solution: string;
}

/** System of equations result. */
export interface SystemResult {
  solution: number[];
  method: string;
  consistent: boolean;
  independent: boolean;
}

/** Radical equation solution. */
export interface RadicalSolution {
  solutions: number[];
  extraneous: number[];
  steps: SolutionStep[];
}

/** Exponential equation solution. */
export interface ExponentialSolution {
  solutions: number[];
  steps: SolutionStep[];
  base: number;
}

/** Logarithmic equation solution. */
export interface LogarithmicSolution {
  solutions: number[];
  steps: SolutionStep[];
  base: number;
}

/** Mixture problem result. */
export interface MixtureResult {
  amountA: number;
  amountB: number;
  totalAmount: number;
  concentration: number;
}

/** Motion problem result. */
export interface MotionResult {
  distance: number;
  rate: number;
  time: number;
  unit: string;
}

/** Work problem result. */
export interface WorkResult {
  timeTogether: number;
  timeA: number;
  timeB: number;
  rateA: number;
  rateB: number;
}

/** Age problem result. */
export interface AgeResult {
  personA: number;
  personB: number;
  years: number;
  relationship: string;
}

/** Coin problem result. */
export interface CoinResult {
  quarters: number;
  dimes: number;
  nickels: number;
  pennies: number;
  total: number;
}

export class EquationSolver {
  private _equations: Map<string, Equation> = new Map();
  private _solutions: Solution[] = [];
  private _inequalities: Inequality[] = [];
  private _history: unknown[] = [];
  private _counter = 0;
  private _wordProblems: WordProblem[] = [];
  private _systemResults: SystemResult[] = [];

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
    const p = b / a;
    const q = c / a;
    const r = d / a;
    steps.push({ operation: 'normalize', from: `${a}x^3+${b}x^2+${c}x+${d}=0`, to: `x^3+${p}x^2+${q}x+${r}=0`, annotation: 'divide by leading coefficient' });
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

  solveAbsoluteValueInequality(expr: string, value: number, direction: Inequality['direction']): Inequality {
    let solution: string;
    if (value < 0) {
      solution = direction === '<' || direction === '<=' ? '∅' : '(-∞, +∞)';
    } else if (direction === '<' || direction === '<=') {
      const bracketLeft = direction === '<=' ? '[' : '(';
      const bracketRight = direction === '<=' ? ']' : ')';
      solution = `${bracketLeft}${-value}, ${value}${bracketRight}`;
    } else {
      const bracketLeft = direction === '>=' ? '(' : '(';
      const bracketRight = direction === '>=' ? ')' : ')';
      solution = `(-∞, ${-value}] ∪ [${value}, +∞)`;
    }
    const ineq: Inequality = {
      expression: `|${expr}| ${direction} ${value}`,
      variable: 'x',
      direction,
      solution,
    };
    this._inequalities.push(ineq);
    this._history.push({ op: 'solveAbsoluteValueInequality', ineq });
    return ineq;
  }

  solveCompoundInequality(
    lower: number,
    middle: number,
    upper: number,
    direction: 'and' | 'or',
  ): Inequality {
    let solution: string;
    if (direction === 'and') {
      solution = `(${lower}, ${upper})`;
    } else {
      solution = `(-∞, ${lower}) ∪ (${upper}, +∞)`;
    }
    const ineq: Inequality = {
      expression: `${lower} < x < ${upper}`,
      variable: 'x',
      direction: '<',
      solution,
    };
    this._inequalities.push(ineq);
    return ineq;
  }

  solveRadicalEquation(radicandCoef: number, constant: number, result: number): RadicalSolution {
    const steps: SolutionStep[] = [];
    steps.push({ operation: 'isolate', from: `√(${radicandCoef}x + ${constant}) = ${result}`, to: `${radicandCoef}x + ${constant} = ${result * result}`, annotation: 'square both sides' });
    const linearSol = this.solveLinear(radicandCoef, constant - result * result);
    steps.push(...linearSol.steps);
    const solutions: number[] = [];
    const extraneous: number[] = [];
    const value = linearSol.value as number;
    if (Number.isFinite(value)) {
      const check = radicandCoef * value + constant;
      if (check >= 0 && Math.abs(Math.sqrt(check) - result) < 1e-9) {
        solutions.push(value);
      } else {
        extraneous.push(value);
      }
    }
    const resultObj: RadicalSolution = { solutions, extraneous, steps };
    this._history.push({ op: 'solveRadicalEquation', resultObj });
    return resultObj;
  }

  solveExponentialEquation(base: number, leftSide: string, rightSide: number): ExponentialSolution {
    const steps: SolutionStep[] = [];
    steps.push({ operation: 'take_log', from: `${base}^x = ${rightSide}`, to: `x = log_${base}(${rightSide})`, annotation: 'take logarithm of both sides' });
    const solution = Math.log(rightSide) / Math.log(base);
    steps.push({ operation: 'evaluate', from: `x = log_${base}(${rightSide})`, to: `x = ${solution}`, annotation: 'compute logarithm' });
    const result: ExponentialSolution = {
      solutions: [solution],
      steps,
      base,
    };
    this._history.push({ op: 'solveExponentialEquation', result });
    return result;
  }

  solveLogarithmicEquation(base: number, argument: string, result: number): LogarithmicSolution {
    const steps: SolutionStep[] = [];
    steps.push({ operation: 'exponentiate', from: `log_${base}(${argument}) = ${result}`, to: `${argument} = ${base}^${result}`, annotation: 'rewrite in exponential form' });
    const solution = Math.pow(base, result);
    steps.push({ operation: 'evaluate', from: `${argument} = ${base}^${result}`, to: `x = ${solution}`, annotation: 'compute power' });
    const res: LogarithmicSolution = {
      solutions: [solution],
      steps,
      base,
    };
    this._history.push({ op: 'solveLogarithmicEquation', res });
    return res;
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

  solveSystemBySubstitution(eq1: { a: number; b: number; c: number }, eq2: { a: number; b: number; c: number }): SystemResult {
    const steps: SolutionStep[] = [];
    steps.push({ operation: 'isolate_y', from: `${eq1.a}x + ${eq1.b}y = ${eq1.c}`, to: `y = (${eq1.c} - ${eq1.a}x) / ${eq1.b}`, annotation: 'solve first equation for y' });
    if (Math.abs(eq1.b) < 1e-12) {
      return { solution: [], method: 'substitution', consistent: false, independent: false };
    }
    const aSub = eq2.a - eq2.b * eq1.a / eq1.b;
    const cSub = eq2.c - eq2.b * eq1.c / eq1.b;
    const x = cSub / aSub;
    const y = (eq1.c - eq1.a * x) / eq1.b;
    const result: SystemResult = {
      solution: [x, y],
      method: 'substitution',
      consistent: true,
      independent: true,
    };
    this._systemResults.push(result);
    this._history.push({ op: 'solveSystemBySubstitution', result });
    return result;
  }

  solveSystemByElimination(eq1: { a: number; b: number; c: number }, eq2: { a: number; b: number; c: number }): SystemResult {
    const det = eq1.a * eq2.b - eq2.a * eq1.b;
    let result: SystemResult;
    if (Math.abs(det) < 1e-12) {
      const ratio = eq1.a / eq2.a;
      if (Math.abs(eq1.c / eq2.c - ratio) < 1e-9) {
        result = { solution: [], method: 'elimination', consistent: true, independent: false };
      } else {
        result = { solution: [], method: 'elimination', consistent: false, independent: false };
      }
    } else {
      const x = (eq1.c * eq2.b - eq2.c * eq1.b) / det;
      const y = (eq1.a * eq2.c - eq2.a * eq1.c) / det;
      result = { solution: [x, y], method: 'elimination', consistent: true, independent: true };
    }
    this._systemResults.push(result);
    this._history.push({ op: 'solveSystemByElimination', result });
    return result;
  }

  mixtureProblem(
    solutionA: { amount: number; concentration: number },
    solutionB: { amount: number; concentration: number },
  ): MixtureResult {
    const totalAmount = solutionA.amount + solutionB.amount;
    const totalPure = solutionA.amount * solutionA.concentration + solutionB.amount * solutionB.concentration;
    const concentration = totalAmount > 0 ? totalPure / totalAmount : 0;
    const result: MixtureResult = {
      amountA: solutionA.amount,
      amountB: solutionB.amount,
      totalAmount,
      concentration,
    };
    this._history.push({ op: 'mixtureProblem', result });
    return result;
  }

  motionProblem(distance: number, rate: number, time: number): MotionResult {
    if (distance === 0) {
      return { distance: rate * time, rate, time, unit: 'distance' };
    }
    if (rate === 0) {
      return { distance, rate: distance / time, time, unit: 'rate' };
    }
    if (time === 0) {
      return { distance, rate, time: distance / rate, unit: 'time' };
    }
    return { distance, rate, time, unit: 'all given' };
  }

  workProblem(timeA: number, timeB: number): WorkResult {
    const rateA = 1 / timeA;
    const rateB = 1 / timeB;
    const combinedRate = rateA + rateB;
    const timeTogether = 1 / combinedRate;
    const result: WorkResult = {
      timeTogether,
      timeA,
      timeB,
      rateA,
      rateB,
    };
    this._history.push({ op: 'workProblem', result });
    return result;
  }

  ageProblem(currentA: number, currentB: number, years: number, targetRatio: number): AgeResult {
    const futureA = currentA + years;
    const futureB = currentB + years;
    const result: AgeResult = {
      personA: futureA,
      personB: futureB,
      years,
      relationship: futureB !== 0 ? `${futureA / futureB}` : 'undefined',
    };
    this._history.push({ op: 'ageProblem', result });
    return result;
  }

  coinProblem(totalAmount: number, totalCoins: number): CoinResult {
    let quarters = 0;
    let dimes = 0;
    let nickels = 0;
    let pennies = 0;
    let remaining = totalAmount * 100;
    quarters = Math.floor(remaining / 25);
    remaining %= 25;
    dimes = Math.floor(remaining / 10);
    remaining %= 10;
    nickels = Math.floor(remaining / 5);
    remaining %= 5;
    pennies = remaining;
    const result: CoinResult = {
      quarters,
      dimes,
      nickels,
      pennies,
      total: totalAmount,
    };
    this._history.push({ op: 'coinProblem', result });
    return result;
  }

  solveRationalEquation(numCoefs: number[], denCoefs: number[]): Solution {
    const steps: SolutionStep[] = [];
    steps.push({ operation: 'find_LCD', from: 'P(x)/Q(x)=0', to: 'multiply by LCD', annotation: 'find least common denominator' });
    const numLen = numCoefs.length;
    if (numLen <= 3) {
      if (numLen === 2) {
        const sol = this.solveLinear(numCoefs[1], numCoefs[0]);
        steps.push(...sol.steps);
        return { variable: 'x', value: sol.value, steps, numberOfSolutions: sol.numberOfSolutions };
      }
      if (numLen === 3) {
        const sol = this.solveQuadratic(numCoefs[2], numCoefs[1], numCoefs[0]);
        steps.push(...sol.steps);
        return { variable: 'x', value: sol.value, steps, numberOfSolutions: sol.numberOfSolutions };
      }
    }
    return { variable: 'x', value: NaN, steps, numberOfSolutions: 0 };
  }

  solveForVariable(formula: string, variable: string, values: Map<string, number>): number {
    let expr = formula;
    values.forEach((val, key) => {
      expr = expr.replace(new RegExp(key, 'g'), `(${val})`);
    });
    try {
      const fn = new Function(`return ${expr};`);
      return Number(fn());
    } catch {
      return NaN;
    }
  }

  checkSolution(equation: Equation, value: number): boolean {
    const expr = `${equation.leftSide}-(${equation.rightSide})`;
    const v = equation.variable;
    const substituted = expr.replace(new RegExp(v, 'g'), `(${value})`);
    try {
      const fn = new Function(`return ${substituted};`);
      const result = Number(fn());
      return Math.abs(result) < 1e-6;
    } catch {
      return false;
    }
  }

  verifySolutionSet(equation: Equation, values: number[]): { valid: number[]; invalid: number[] } {
    const valid: number[] = [];
    const invalid: number[] = [];
    for (const v of values) {
      if (this.checkSolution(equation, v)) {
        valid.push(v);
      } else {
        invalid.push(v);
      }
    }
    return { valid, invalid };
  }

  solveQuadraticByFactoring(a: number, b: number, c: number): { roots: number[]; factors: string[]; factored: boolean } {
    const disc = b * b - 4 * a * c;
    if (disc < 0 || !Number.isInteger(Math.sqrt(disc))) {
      return { roots: [], factors: [], factored: false };
    }
    const sqrtD = Math.sqrt(disc);
    const r1 = (-b + sqrtD) / (2 * a);
    const r2 = (-b - sqrtD) / (2 * a);
    const f1 = a === 1 ? `(x ${-r1 >= 0 ? '+' : '-'} ${Math.abs(r1)})` : `(${a}x ${-r1 >= 0 ? '+' : '-'} ${Math.abs(r1)})`;
    const f2 = `(x ${-r2 >= 0 ? '+' : '-'} ${Math.abs(r2)})`;
    return {
      roots: [r1, r2],
      factors: [f1, f2],
      factored: true,
    };
  }

  solveByCompletingTheSquare(a: number, b: number, c: number): { vertex: { x: number; y: number }; roots: number[]; steps: SolutionStep[] } {
    const steps: SolutionStep[] = [];
    if (Math.abs(a) < 1e-12) {
      const sol = this.solveLinear(b, c);
      return { vertex: { x: 0, y: 0 }, roots: Array.isArray(sol.value) ? sol.value : [sol.value as number], steps: sol.steps };
    }
    steps.push({ operation: 'factor_a', from: `${a}x^2 + ${b}x + ${c} = 0`, to: `${a}(x^2 + ${b / a}x) + ${c} = 0`, annotation: 'factor out leading coefficient' });
    const h = -b / (2 * a);
    const k = c - b * b / (4 * a);
    steps.push({ operation: 'complete_square', from: `${a}(x^2 + ${b / a}x) + ${c} = 0`, to: `${a}(x - ${h})^2 + ${k} = 0`, annotation: 'complete the square' });
    const roots: number[] = [];
    if (k / a <= 0) {
      const sqrtVal = Math.sqrt(-k / a);
      roots.push(h + sqrtVal, h - sqrtVal);
      steps.push({ operation: 'solve', from: `${a}(x - ${h})^2 = ${-k}`, to: `x = ${h} ± ${sqrtVal}`, annotation: 'solve for x' });
    }
    this._history.push({ op: 'solveByCompletingTheSquare', vertex: { x: h, y: k }, roots });
    return { vertex: { x: h, y: k }, roots, steps };
  }

  vertexForm(a: number, b: number, c: number): { form: string; vertex: { x: number; y: number }; direction: string } {
    const h = -b / (2 * a);
    const k = c - b * b / (4 * a);
    const direction = a > 0 ? 'up' : 'down';
    const form = `f(x) = ${a}(x - ${h})^2 + ${k}`;
    this._history.push({ op: 'vertexForm', form, vertex: { x: h, y: k } });
    return { form, vertex: { x: h, y: k }, direction };
  }

  discriminantAnalysis(a: number, b: number, c: number): {
    discriminant: number;
    nature: 'two_real' | 'one_real' | 'two_complex';
    rational: boolean;
  } {
    const disc = b * b - 4 * a * c;
    let nature: 'two_real' | 'one_real' | 'two_complex';
    if (Math.abs(disc) < 1e-12) {
      nature = 'one_real';
    } else if (disc > 0) {
      nature = 'two_real';
    } else {
      nature = 'two_complex';
    }
    const rational = disc >= 0 && Math.abs(Math.sqrt(disc) - Math.round(Math.sqrt(disc))) < 1e-12;
    return { discriminant: disc, nature, rational };
  }

  solveSystemOfThree(
    eq1: { a: number; b: number; c: number; d: number },
    eq2: { a: number; b: number; c: number; d: number },
    eq3: { a: number; b: number; c: number; d: number },
  ): SystemResult {
    const matrix = [
      [eq1.a, eq1.b, eq1.c],
      [eq2.a, eq2.b, eq2.c],
      [eq3.a, eq3.b, eq3.c],
    ];
    const constants = [eq1.d, eq2.d, eq3.d];
    const sol = this.gaussianElimination(matrix.map((row, i) => [...row, constants[i]]));
    const result: SystemResult = {
      solution: sol,
      method: 'gaussian_elimination_3x3',
      consistent: sol.every(v => Number.isFinite(v)),
      independent: true,
    };
    this._systemResults.push(result);
    this._history.push({ op: 'solveSystemOfThree', result });
    return result;
  }

  uniformMotionProblem(
    object1: { speed: number; direction: string },
    object2: { speed: number; direction: string },
    distance: number,
  ): { meetingTime: number; meetingPoint: number; relativeSpeed: number } {
    const relativeSpeed = object1.direction === object2.direction
      ? Math.abs(object1.speed - object2.speed)
      : object1.speed + object2.speed;
    const meetingTime = distance / relativeSpeed;
    const meetingPoint = object1.speed * meetingTime;
    this._history.push({ op: 'uniformMotionProblem', meetingTime, meetingPoint });
    return { meetingTime, meetingPoint, relativeSpeed };
  }

  investmentProblem(
    principal: number,
    rate: number,
    years: number,
    compounding: 'simple' | 'annually' | 'quarterly' | 'monthly' | 'continuously',
  ): { finalAmount: number; interest: number; totalReturn: number } {
    let finalAmount = 0;
    switch (compounding) {
      case 'simple':
        finalAmount = principal * (1 + rate * years);
        break;
      case 'annually':
        finalAmount = principal * Math.pow(1 + rate, years);
        break;
      case 'quarterly':
        finalAmount = principal * Math.pow(1 + rate / 4, 4 * years);
        break;
      case 'monthly':
        finalAmount = principal * Math.pow(1 + rate / 12, 12 * years);
        break;
      case 'continuously':
        finalAmount = principal * Math.exp(rate * years);
        break;
    }
    const interest = finalAmount - principal;
    const totalReturn = principal > 0 ? interest / principal : 0;
    this._history.push({ op: 'investmentProblem', finalAmount, interest });
    return { finalAmount, interest, totalReturn };
  }

  percentChange(original: number, newValue: number): { change: number; percentChange: number; direction: 'increase' | 'decrease' } {
    const change = newValue - original;
    const percentChange = original !== 0 ? (change / original) * 100 : 0;
    const direction = change >= 0 ? 'increase' : 'decrease';
    return { change, percentChange, direction };
  }

  ratioProportion(
    ratioA: number,
    ratioB: number,
    known: { side: 'a' | 'b'; value: number },
  ): { a: number; b: number; proportion: string } {
    let a: number, b: number;
    if (known.side === 'a') {
      a = known.value;
      b = (known.value * ratioB) / ratioA;
    } else {
      b = known.value;
      a = (known.value * ratioA) / ratioB;
    }
    return { a, b, proportion: `${ratioA}:${ratioB} = ${a}:${b}` };
  }

  solveLinearLiteralEquation(equation: string, solveFor: string): string {
    return `Solving ${equation} for ${solveFor}: rearrange terms to isolate ${solveFor}`;
  }

  numberProblem(sum: number, difference: number): { first: number; second: number; sum: number; difference: number } {
    const first = (sum + difference) / 2;
    const second = (sum - difference) / 2;
    this._history.push({ op: 'numberProblem', first, second });
    return { first, second, sum, difference };
  }

  consecutiveIntegerProblem(sum: number, count: number, type: 'integer' | 'even' | 'odd'): { numbers: number[]; sum: number } {
    const numbers: number[] = [];
    const step = type === 'integer' ? 1 : 2;
    const first = type === 'integer'
      ? (sum - step * count * (count - 1) / 2) / count
      : (sum - step * count * (count - 1) / 2) / count;
    for (let i = 0; i < count; i++) {
      numbers.push(first + i * step);
    }
    this._history.push({ op: 'consecutiveIntegerProblem', numbers });
    return { numbers, sum };
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
    wordProblems: WordProblem[];
    systemResults: SystemResult[];
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
        wordProblems: this._wordProblems,
        systemResults: this._systemResults,
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
    this._wordProblems = [];
    this._systemResults = [];
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

  get wordProblemCount(): number {
    return this._wordProblems.length;
  }

  get systemResultCount(): number {
    return this._systemResults.length;
  }
}
