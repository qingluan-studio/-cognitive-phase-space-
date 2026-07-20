/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 口算速算引擎 —— 心智数学的瞬时反应
 * Mental Arithmetic Engine: Instant Response of Mental Mathematics
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 口算是数学思维的肌肉记忆。从补数加法到分配律速算，
 * 从11的倍数到接近100的平方，每一种速算技巧都凝结着
 * 数千年来算者对数字结构的直觉洞察。
 *
 * 本引擎提供数十种专业心算技巧，从基础的凑整法到高阶的
 * 印度吠陀数学，从简单的两位数运算到复杂的多位数速算，
 * 覆盖小学阶段所有心算题型。
 */

import { DataPacket } from '../shared/types';

export interface MentalStrategy {
  readonly name: string;
  readonly description: string;
  readonly applicability: string;
  readonly speed: number;
  readonly difficulty: 'easy' | 'medium' | 'hard';
  readonly category: string;
}

export interface ArithmeticProblem {
  readonly operands: number[];
  readonly operator: '+' | '-' | '*' | '/' | '^';
  readonly answer: number;
  readonly difficulty: 'easy' | 'medium' | 'hard';
  readonly strategyHint?: string;
}

export interface SpeedRecord {
  readonly problem: ArithmeticProblem;
  readonly timeSpent: number;
  readonly strategy: string;
  readonly correct: boolean;
  readonly timestamp: number;
}

export interface MentalStats {
  totalSolved: number;
  accuracy: number;
  avgSpeed: number;
  bestStrategy: string;
  fastestTime: number;
  slowestTime: number;
  streakCount: number;
  bestStreak: number;
}

export interface DrillConfig {
  readonly operator: '+' | '-' | '*' | '/' | 'mixed';
  readonly difficulty: 'easy' | 'medium' | 'hard';
  readonly count: number;
  readonly timeLimit?: number;
  readonly digitRange?: [number, number];
}

export interface DrillResult {
  readonly problems: ArithmeticProblem[];
  readonly correctCount: number;
  readonly totalTime: number;
  readonly avgTimePerProblem: number;
  readonly accuracy: number;
  readonly completed: boolean;
}

export type NumberGameType = 'twenty-four' | 'number-bomb' | 'guess-number' | 'magic-square';

export interface NumberGameState {
  readonly type: NumberGameType;
  readonly numbers: number[];
  readonly target?: number;
  readonly solution?: string;
  readonly difficulty: 'easy' | 'medium' | 'hard';
}

type Operator = '+' | '-' | '*' | '/' | '^';

export class MentalArithmetic {
  private _strategies: Map<string, MentalStrategy> = new Map();
  private _problems: ArithmeticProblem[] = [];
  private _records: SpeedRecord[] = [];
  private _history: string[] = [];
  private _stats: MentalStats = {
    totalSolved: 0, accuracy: 0, avgSpeed: 0, bestStrategy: '',
    fastestTime: Infinity, slowestTime: 0, streakCount: 0, bestStreak: 0
  };
  private _counter = 0;
  private _currentStreak = 0;
  private _practiceMode = false;
  private _drillStartTime = 0;
  private _numberGameCache: NumberGameState | null = null;

  constructor() {
    this._registerBuiltinStrategies();
    this._recordHistory('MentalArithmetic engine initialized');
  }

  get strategies(): MentalStrategy[] { return Array.from(this._strategies.values()); }
  get records(): SpeedRecord[] { return [...this._records]; }
  get stats(): MentalStats { return { ...this._stats }; }
  get currentStreak(): number { return this._currentStreak; }
  get practiceMode(): boolean { return this._practiceMode; }

  // ===========================================================================
  // 基础运算方法（增强版）
  // ===========================================================================

  /**
   * 基础加法（含进位分解）
   * Basic addition with carry decomposition
   */
  add(a: number, b: number): number {
    const result = a + b;
    const carrySteps = this._decomposeCarry(a, b);
    this._recordHistory(`add: ${a} + ${b} = ${result}, carry steps: ${carrySteps.length}`);
    return result;
  }

  /**
   * 多个数连加
   * Sum of multiple numbers
   */
  addMany(numbers: number[]): number {
    let result = 0;
    for (const n of numbers) {
      result = this.add(result, n);
    }
    this._recordHistory(`addMany: sum of ${numbers.length} numbers = ${result}`);
    return result;
  }

  /**
   * 减法（含借位分解）
   * Subtraction with borrow decomposition
   */
  subtract(a: number, b: number): number {
    const result = a - b;
    const borrowSteps = this._decomposeBorrow(a, b);
    this._recordHistory(`subtract: ${a} - ${b} = ${result}, borrow steps: ${borrowSteps.length}`);
    return result;
  }

  /**
   * 连减运算
   * Chain subtraction
   */
  subtractMany(initial: number, subtrahends: number[]): number {
    let result = initial;
    for (const n of subtrahends) {
      result = this.subtract(result, n);
    }
    return result;
  }

  /**
   * 乘法（含分配律速算）
   * Multiplication with distributive law shortcut
   */
  multiply(a: number, b: number): number {
    const result = this.distributiveMultiply(a, b);
    this._recordHistory(`multiply: ${a} * ${b} = ${result}`);
    return result;
  }

  /**
   * 多个数连乘
   * Product of multiple numbers
   */
  multiplyMany(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    let result = 1;
    for (const n of numbers) {
      result = this.multiply(result, n);
    }
    return result;
  }

  /**
   * 除法（含商估算）
   * Division with quotient estimation
   */
  divide(a: number, b: number): number {
    if (b === 0) {
      this._recordHistory(`divide: division by zero attempted on ${a}`);
      return NaN;
    }
    const estimate = this.estimate(a, b, '/');
    const result = a / b;
    this._recordHistory(`divide: ${a} / ${b} = ${result}, estimate: ${estimate}`);
    return result;
  }

  /**
   * 整除（商取整）
   * Integer division
   */
  integerDivide(a: number, b: number): number {
    if (b === 0) return NaN;
    const result = Math.trunc(a / b);
    this._recordHistory(`integerDivide: ${a} ÷ ${b} = ${result}`);
    return result;
  }

  /**
   * 取余运算
   * Modulo operation
   */
  modulo(a: number, b: number): number {
    if (b === 0) return NaN;
    const result = a % b;
    this._recordHistory(`modulo: ${a} mod ${b} = ${result}`);
    return result;
  }

  /**
   * 幂运算
   * Power operation
   */
  power(base: number, exponent: number): number {
    const result = Math.pow(base, exponent);
    this._recordHistory(`power: ${base}^${exponent} = ${result}`);
    return result;
  }

  // ===========================================================================
  // 速算乘法技巧
  // ===========================================================================

  /**
   * 速算乘法（11的倍数、尾数为5、接近100等）
   * Fast multiplication: multiples of 11, trailing 5, near 100, etc.
   */
  fastMultiply(a: number, b: number): number {
    let result: number;
    let strategy = 'fallback';
    if (a === 11 || b === 11) {
      result = this._multiplyBy11(a === 11 ? b : a);
      strategy = 'multiply-by-11';
    } else if (Math.abs(a % 10) === 5 && Math.abs(b % 10) === 5) {
      result = this._multiplyTrailingFives(a, b);
      strategy = 'trailing-fives';
    } else if (a >= 90 && a <= 100 && b >= 90 && b <= 100) {
      result = this._multiplyNear100(a, b);
      strategy = 'near-100';
    } else if (a >= 900 && a <= 1000 && b >= 900 && b <= 1000) {
      result = this._multiplyNear1000(a, b);
      strategy = 'near-1000';
    } else if (a === 9 || b === 9 || a === 99 || b === 99) {
      result = this._multiplyByNines(a, b);
      strategy = 'multiply-by-nines';
    } else if (a === 5 || b === 5) {
      result = this._multiplyBy5(a === 5 ? b : a);
      strategy = 'multiply-by-5';
    } else if (a === 25 || b === 25) {
      result = this._multiplyBy25(a === 25 ? b : a);
      strategy = 'multiply-by-25';
    } else if (a === 125 || b === 125) {
      result = this._multiplyBy125(a === 125 ? b : a);
      strategy = 'multiply-by-125';
    } else if (Math.abs(a - b) <= 10 && this._isClosePair(a, b)) {
      result = this._multiplyClosePair(a, b);
      strategy = 'close-pair';
    } else {
      result = a * b;
    }
    this._recordHistory(`fastMultiply: ${strategy} on ${a}, ${b} = ${result}`);
    return result;
  }

  /**
   * 快速平方（25以内、接近100等）
   * Fast squaring: within 25, near 100, etc.
   */
  fastSquare(n: number): number {
    let result: number;
    const abs = Math.abs(n);
    if (abs <= 25) {
      result = n * n;
      this._recordHistory(`fastSquare: small-square rule on ${n} = ${result}`);
    } else if (abs >= 90 && abs <= 110) {
      const diff = n - 100;
      result = (100 + 2 * diff) * 100 + diff * diff;
      this._recordHistory(`fastSquare: near-100 rule on ${n} = ${result}`);
    } else if (abs % 10 === 5) {
      const tens = (n - 5) / 10;
      result = tens * (tens + 1) * 100 + 25;
      this._recordHistory(`fastSquare: trailing-5 rule on ${n} = ${result}`);
    } else if (abs >= 40 && abs <= 60) {
      const diff = n - 50;
      result = (25 + diff) * 100 + diff * diff;
      this._recordHistory(`fastSquare: near-50 rule on ${n} = ${result}`);
    } else if (abs % 9 === 0 || abs % 9 === 0) {
      result = this._squareByDifference(n);
      this._recordHistory(`fastSquare: difference-of-squares on ${n} = ${result}`);
    } else {
      result = n * n;
      this._recordHistory(`fastSquare: direct square = ${result}`);
    }
    return result;
  }

  /**
   * 快速立方
   * Fast cubing
   */
  fastCube(n: number): number {
    let result: number;
    const abs = Math.abs(n);
    if (abs <= 10) {
      result = n * n * n;
    } else if (abs % 10 === 0) {
      const tens = n / 10;
      result = tens * tens * tens * 1000;
    } else {
      const sign = n < 0 ? -1 : 1;
      const a = Math.floor(abs / 10) * 10;
      const b = abs - a;
      result = sign * (a * a * a + 3 * a * a * b + 3 * a * b * b + b * b * b);
    }
    this._recordHistory(`fastCube: ${n}³ = ${result}`);
    return result;
  }

  // ===========================================================================
  // 估算法
  // ===========================================================================

  /**
   * 估算
   * Quick estimation of an arithmetic operation
   */
  estimate(a: number, b: number, op: Operator): number {
    const ra = this._roundToSig(a);
    const rb = this._roundToSig(b);
    let est: number;
    switch (op) {
      case '+': est = ra + rb; break;
      case '-': est = ra - rb; break;
      case '*': est = ra * rb; break;
      case '/': est = rb === 0 ? NaN : ra / rb; break;
      case '^': est = Math.pow(ra, Math.round(rb)); break;
      default: est = NaN;
    }
    this._recordHistory(`estimate: ${ra} ${op} ${rb} ≈ ${est}`);
    return est;
  }

  /**
   * 数量级估算
   * Order-of-magnitude estimation
   */
  orderOfMagnitude(n: number): number {
    if (n === 0) return 0;
    const magnitude = Math.floor(Math.log10(Math.abs(n)));
    this._recordHistory(`orderOfMagnitude: ${n} ~ 10^${magnitude}`);
    return magnitude;
  }

  /**
   * 费米估算（简单版）
   * Fermi estimation (simplified)
   */
  fermiEstimate(problem: string, assumptions: Record<string, number>): number {
    let result = 1;
    for (const key of Object.keys(assumptions)) {
      result *= assumptions[key];
    }
    this._recordHistory(`fermiEstimate: "${problem}" ≈ ${result}`);
    return result;
  }

  /**
   * 百分比快速计算
   * Quick percentage calculation
   */
  quickPercent(total: number, percent: number): number {
    let result: number;
    if (percent === 10) {
      result = total / 10;
    } else if (percent === 25) {
      result = total / 4;
    } else if (percent === 50) {
      result = total / 2;
    } else if (percent === 75) {
      result = total * 3 / 4;
    } else if (percent === 100) {
      result = total;
    } else if (percent < 10) {
      result = (total / 10) * percent;
    } else {
      result = total * percent / 100;
    }
    this._recordHistory(`quickPercent: ${percent}% of ${total} = ${result}`);
    return result;
  }

  // ===========================================================================
  // 连续口算链与练习模式
  // ===========================================================================

  /**
   * 连续口算链
   * Mental chain over a sequence of problems
   */
  mentalChain(problems: ArithmeticProblem[]): number {
    let correct = 0;
    const start = Date.now();
    for (const p of problems) {
      this._problems.push(p);
      const expected = p.answer;
      let actual: number;
      switch (p.operator) {
        case '+': actual = this.add(p.operands[0], p.operands[1]); break;
        case '-': actual = this.subtract(p.operands[0], p.operands[1]); break;
        case '*': actual = this.multiply(p.operands[0], p.operands[1]); break;
        case '/': actual = this.divide(p.operands[0], p.operands[1]); break;
        case '^': actual = Math.pow(p.operands[0], p.operands[1]); break;
        default: actual = NaN;
      }
      const isCorrect = Math.abs(actual - expected) < 1e-6;
      if (isCorrect) {
        correct++;
        this._currentStreak++;
        if (this._currentStreak > this._stats.bestStreak) {
          this._stats.bestStreak = this._currentStreak;
        }
      } else {
        this._currentStreak = 0;
      }
      const timeSpent = Date.now() - start;
      this._records.push({
        problem: p,
        timeSpent,
        strategy: 'chain',
        correct: isCorrect,
        timestamp: Date.now(),
      });
    }
    this._refreshStats();
    this._recordHistory(`mentalChain: ${correct}/${problems.length} correct, streak ${this._currentStreak}`);
    return correct;
  }

  /**
   * 生成练习题目
   * Generate practice problems
   */
  generateProblems(config: DrillConfig): ArithmeticProblem[] {
    const problems: ArithmeticProblem[] = [];
    const [minDigit, maxDigit] = config.digitRange ?? [1, 2];
    for (let i = 0; i < config.count; i++) {
      let op: Operator;
      if (config.operator === 'mixed') {
        const ops: Operator[] = ['+', '-', '*', '/'];
        op = ops[Math.floor(Math.random() * ops.length)];
      } else {
        op = config.operator as Operator;
      }
      const a = this._randomNumber(minDigit, maxDigit);
      const b = this._randomNumber(minDigit, maxDigit);
      let answer: number;
      let operands: number[];
      switch (op) {
        case '+':
          operands = [a, b];
          answer = a + b;
          break;
        case '-':
          operands = [Math.max(a, b), Math.min(a, b)];
          answer = operands[0] - operands[1];
          break;
        case '*':
          operands = [a, Math.min(b, 9)];
          answer = operands[0] * operands[1];
          break;
        case '/':
          const divisor = Math.max(1, Math.min(b, 9));
          const quotient = this._randomNumber(1, maxDigit);
          operands = [divisor * quotient, divisor];
          answer = quotient;
          break;
        default:
          operands = [a, b];
          answer = a + b;
      }
      problems.push({
        operands,
        operator: op,
        answer,
        difficulty: config.difficulty,
        strategyHint: this._suggestStrategy(operands[0], operands[1], op),
      });
    }
    this._recordHistory(`generateProblems: generated ${problems.length} ${config.operator} problems`);
    return problems;
  }

  /**
   * 开始练习模式
   * Start practice mode
   */
  startPractice(config: DrillConfig): ArithmeticProblem[] {
    this._practiceMode = true;
    this._drillStartTime = Date.now();
    const problems = this.generateProblems(config);
    this._recordHistory(`startPractice: started ${config.count} problems drill`);
    return problems;
  }

  /**
   * 结束练习模式
   * End practice mode
   */
  endPractice(): DrillResult {
    const totalTime = Date.now() - this._drillStartTime;
    const recentRecords = this._records.slice(-this._problems.length);
    const correctCount = recentRecords.filter(r => r.correct).length;
    const total = recentRecords.length || 1;
    const result: DrillResult = {
      problems: [...this._problems],
      correctCount,
      totalTime,
      avgTimePerProblem: totalTime / total,
      accuracy: correctCount / total,
      completed: true,
    };
    this._practiceMode = false;
    this._recordHistory(`endPractice: ${correctCount}/${total} correct in ${totalTime}ms`);
    return result;
  }

  // ===========================================================================
  // 补数与凑整法
  // ===========================================================================

  /**
   * 补数加法
   * Complementary addition: round one operand to its complement
   */
  complementaryAdd(a: number, b: number): number {
    const complement = this._complement10(b);
    const adjusted = b + complement;
    const result = (a + adjusted) - complement;
    this._recordHistory(`complementaryAdd: ${a} + ${b} (comp ${complement}) = ${result}`);
    return result;
  }

  /**
   * 凑整加法
   * Rounding addition: round one operand then compensate
   */
  roundingAdd(a: number, b: number): number {
    const rounded = Math.round(b / 10) * 10;
    const delta = b - rounded;
    const result = (a + rounded) + delta;
    this._recordHistory(`roundingAdd: ${a} + ${rounded} + ${delta} = ${result}`);
    return result;
  }

  /**
   * 凑整减法
   * Rounding subtraction
   */
  roundingSubtract(a: number, b: number): number {
    const rounded = Math.round(b / 10) * 10;
    const delta = b - rounded;
    const result = (a - rounded) - delta;
    this._recordHistory(`roundingSubtract: ${a} - ${rounded} - ${delta} = ${result}`);
    return result;
  }

  /**
   * 基准数加法
   * Benchmark number addition
   */
  benchmarkAdd(numbers: number[], benchmark: number): number {
    let sum = 0;
    for (const n of numbers) {
      sum += (n - benchmark);
    }
    const result = benchmark * numbers.length + sum;
    this._recordHistory(`benchmarkAdd: ${numbers.length} numbers, benchmark ${benchmark} = ${result}`);
    return result;
  }

  /**
   * 分配律乘法
   * Distributive multiplication: a * b = a * (q*10 + r)
   */
  distributiveMultiply(a: number, b: number): number {
    const sign = (a < 0) !== (b < 0) ? -1 : 1;
    const ua = Math.abs(a);
    const ub = Math.abs(b);
    const tens = Math.floor(ub / 10) * 10;
    const units = ub - tens;
    const result = sign * (ua * tens + ua * units);
    this._recordHistory(`distributiveMultiply: ${a} * ${b} = ${result}`);
    return result;
  }

  /**
   * 因数分解乘法
   * Factor decomposition multiplication
   */
  factorMultiply(a: number, b: number): number {
    const factors = this._factorize(Math.abs(b));
    let result = Math.abs(a);
    for (const f of factors) {
      result *= f;
    }
    const sign = (a < 0) !== (b < 0) ? -1 : 1;
    result *= sign;
    this._recordHistory(`factorMultiply: ${a} * ${b} via ${factors.join('×')} = ${result}`);
    return result;
  }

  // ===========================================================================
  // 特殊数速算
  // ===========================================================================

  /**
   * 头同尾合十（两位数相乘，十位相同，个位相加为10）
   * Same head, tails sum to 10
   */
  sameHeadTensComplement(a: number, b: number): number {
    const tensA = Math.floor(Math.abs(a) / 10);
    const tensB = Math.floor(Math.abs(b) / 10);
    const unitsA = Math.abs(a) % 10;
    const unitsB = Math.abs(b) % 10;
    if (tensA !== tensB || unitsA + unitsB !== 10) {
      return a * b;
    }
    const sign = (a < 0) !== (b < 0) ? -1 : 1;
    const head = tensA * (tensA + 1);
    const tail = unitsA * unitsB;
    const result = sign * (head * 100 + tail);
    this._recordHistory(`sameHeadTensComplement: ${a} × ${b} = ${result}`);
    return result;
  }

  /**
   * 尾同头合十（两位数相乘，个位相同，十位相加为10）
   * Same tail, heads sum to 10
   */
  sameTailHeadsComplement(a: number, b: number): number {
    const tensA = Math.floor(Math.abs(a) / 10);
    const tensB = Math.floor(Math.abs(b) / 10);
    const unitsA = Math.abs(a) % 10;
    const unitsB = Math.abs(b) % 10;
    if (unitsA !== unitsB || tensA + tensB !== 10) {
      return a * b;
    }
    const sign = (a < 0) !== (b < 0) ? -1 : 1;
    const head = tensA * tensB + unitsA;
    const tail = unitsA * unitsA;
    const result = sign * (head * 100 + tail);
    this._recordHistory(`sameTailHeadsComplement: ${a} × ${b} = ${result}`);
    return result;
  }

  /**
   * 任意两位数平方速算（印度吠陀数学）
   * Vedic math two-digit square
   */
  vedicSquare(n: number): number {
    const sign = n < 0 ? -1 : 1;
    const abs = Math.abs(n);
    const tens = Math.floor(abs / 10);
    const units = abs % 10;
    const a = tens * tens;
    const b = 2 * tens * units;
    const c = units * units;
    let carry = Math.floor(c / 10);
    const unitsDigit = c % 10;
    const bTotal = b + carry;
    carry = Math.floor(bTotal / 10);
    const tensDigit = bTotal % 10;
    const hundredsDigit = a + carry;
    const result = sign * (hundredsDigit * 100 + tensDigit * 10 + unitsDigit);
    this._recordHistory(`vedicSquare: ${n}² = ${result}`);
    return result;
  }

  /**
   * 11~19的两位数乘法
   * Multiplication of numbers from 11 to 19
   */
  teensMultiply(a: number, b: number): number {
    const absA = Math.abs(a);
    const absB = Math.abs(b);
    if (absA < 11 || absA > 19 || absB < 11 || absB > 19) {
      return a * b;
    }
    const sign = (a < 0) !== (b < 0) ? -1 : 1;
    const unitsA = absA % 10;
    const unitsB = absB % 10;
    const result = sign * ((absA + unitsB) * 10 + unitsA * unitsB);
    this._recordHistory(`teensMultiply: ${a} × ${b} = ${result}`);
    return result;
  }

  // ===========================================================================
  // 数字游戏
  // ===========================================================================

  /**
   * 24点游戏
   * Twenty-four game generator
   */
  twentyFourGame(difficulty: 'easy' | 'medium' | 'hard' = 'medium'): NumberGameState {
    let numbers: number[];
    if (difficulty === 'easy') {
      numbers = this._randomDigits(4, 1, 9);
    } else if (difficulty === 'hard') {
      numbers = this._randomDigits(4, 1, 13);
    } else {
      numbers = this._randomDigits(4, 1, 10);
    }
    const solution = this._solveTwentyFour(numbers);
    const state: NumberGameState = {
      type: 'twenty-four',
      numbers,
      target: 24,
      solution: solution || '无解',
      difficulty,
    };
    this._numberGameCache = state;
    this._recordHistory(`twentyFourGame: [${numbers.join(', ')}] → ${solution || '无解'}`);
    return state;
  }

  /**
   * 数字炸弹（猜数字）
   * Number bomb (guess the number)
   */
  numberBombGame(difficulty: 'easy' | 'medium' | 'hard' = 'medium'): NumberGameState {
    let max: number;
    switch (difficulty) {
      case 'easy': max = 50; break;
      case 'hard': max = 500; break;
      default: max = 100;
    }
    const target = Math.floor(Math.random() * max) + 1;
    const state: NumberGameState = {
      type: 'number-bomb',
      numbers: [1, max],
      target,
      difficulty,
    };
    this._numberGameCache = state;
    this._recordHistory(`numberBombGame: target=${target}, range=[1,${max}]`);
    return state;
  }

  /**
   * 幻方生成（3x3）
   * Magic square generator (3x3)
   */
  magicSquareGame(start: number = 1): number[][] {
    const magic: number[][] = [
      [8, 1, 6],
      [3, 5, 7],
      [4, 9, 2],
    ];
    const adjusted = magic.map(row => row.map(n => n + start - 1));
    this._recordHistory(`magicSquareGame: 3x3 magic square starting at ${start}`);
    return adjusted;
  }

  // ===========================================================================
  // 策略管理与统计
  // ===========================================================================

  /**
   * 注册新策略
   * Register a new mental strategy
   */
  registerStrategy(strategy: MentalStrategy): void {
    this._strategies.set(strategy.name, strategy);
    this._recordHistory(`registerStrategy: ${strategy.name} added`);
  }

  /**
   * 获取策略建议
   * Get strategy suggestion for a problem
   */
  suggestStrategy(a: number, b: number, op: Operator): string | null {
    return this._suggestStrategy(a, b, op);
  }

  /**
   * 获取统计信息
   * Get aggregated statistics
   */
  getStats(): MentalStats {
    this._refreshStats();
    return { ...this._stats };
  }

  /**
   * 获取按策略分组的统计
   * Get statistics grouped by strategy
   */
  getStatsByStrategy(): Record<string, { total: number; correct: number; avgTime: number }> {
    const stats: Record<string, { total: number; correct: number; avgTime: number }> = {};
    for (const r of this._records) {
      if (!stats[r.strategy]) {
        stats[r.strategy] = { total: 0, correct: 0, avgTime: 0 };
      }
      stats[r.strategy].total++;
      if (r.correct) stats[r.strategy].correct++;
      stats[r.strategy].avgTime += r.timeSpent;
    }
    for (const key of Object.keys(stats)) {
      stats[key].avgTime /= stats[key].total;
    }
    return stats;
  }

  /**
   * 序列化为 DataPacket
   * Serialize engine state to DataPacket
   */
  toPacket(): DataPacket<MentalStats & { records: SpeedRecord[]; strategies: MentalStrategy[] }> {
    this._refreshStats();
    const payload = {
      ...this._stats,
      records: this._records,
      strategies: this.strategies,
    };
    const packet: DataPacket<MentalStats & { records: SpeedRecord[]; strategies: MentalStrategy[] }> = {
      id: `mental-arith-${(++this._counter).toString(36)}`,
      payload,
      metadata: {
        createdAt: Date.now(),
        route: ['primary_math', 'MentalArithmetic'],
        priority: 2,
        phase: 'mental-arithmetic',
      },
    };
    this._recordHistory(`toPacket: emitted ${packet.id}`);
    return packet;
  }

  /**
   * 重置引擎
   * Reset engine state
   */
  reset(): void {
    this._problems = [];
    this._records = [];
    this._history = [];
    this._stats = {
      totalSolved: 0, accuracy: 0, avgSpeed: 0, bestStrategy: '',
      fastestTime: Infinity, slowestTime: 0, streakCount: 0, bestStreak: 0
    };
    this._counter = 0;
    this._currentStreak = 0;
    this._practiceMode = false;
    this._numberGameCache = null;
    this._registerBuiltinStrategies();
    this._recordHistory('MentalArithmetic engine reset');
  }

  // ===========================================================================
  // 私有辅助方法
  // ===========================================================================

  private _recordHistory(entry: string): void {
    this._history.push(`[${new Date().toISOString()}] ${entry}`);
    if (this._history.length > 500) this._history.shift();
  }

  private _decomposeCarry(a: number, b: number): number[] {
    const carries: number[] = [];
    const maxLen = Math.max(String(Math.abs(a)).length, String(Math.abs(b)).length);
    let carry = 0;
    for (let i = 0; i < maxLen; i++) {
      const da = Math.floor(Math.abs(a) / Math.pow(10, i)) % 10;
      const db = Math.floor(Math.abs(b) / Math.pow(10, i)) % 10;
      const sum = da + db + carry;
      if (sum >= 10) {
        carry = 1;
        carries.push(Math.pow(10, i));
      } else {
        carry = 0;
      }
    }
    return carries;
  }

  private _decomposeBorrow(a: number, b: number): number[] {
    const borrows: number[] = [];
    const maxLen = Math.max(String(Math.abs(a)).length, String(Math.abs(b)).length);
    let borrow = 0;
    for (let i = 0; i < maxLen; i++) {
      const da = Math.floor(Math.abs(a) / Math.pow(10, i)) % 10;
      const db = Math.floor(Math.abs(b) / Math.pow(10, i)) % 10;
      if (da - borrow < db) {
        borrows.push(Math.pow(10, i));
        borrow = 1;
      } else {
        borrow = 0;
      }
    }
    return borrows;
  }

  private _multiplyBy11(n: number): number {
    const sign = n < 0 ? -1 : 1;
    const digits = String(Math.abs(n)).split('').map(Number);
    const result: number[] = [digits[0]];
    for (let i = 0; i < digits.length - 1; i++) {
      result.push(digits[i] + digits[i + 1]);
    }
    result.push(digits[digits.length - 1]);
    let carry = 0;
    for (let i = result.length - 1; i >= 0; i--) {
      const v = result[i] + carry;
      result[i] = v % 10;
      carry = Math.floor(v / 10);
    }
    while (carry > 0) {
      result.unshift(carry % 10);
      carry = Math.floor(carry / 10);
    }
    return sign * Number(result.join(''));
  }

  private _multiplyTrailingFives(a: number, b: number): number {
    const sign = (a < 0) !== (b < 0) ? -1 : 1;
    const ua = Math.abs(a);
    const ub = Math.abs(b);
    const ta = Math.floor(ua / 10);
    const tb = Math.floor(ub / 10);
    const head = ta * tb + Math.floor((ta + tb) / 2);
    const tail = (ua % 2 === 1 && ub % 2 === 1) ? 75 : 25;
    return sign * (head * 100 + tail);
  }

  private _multiplyNear100(a: number, b: number): number {
    const da = a - 100;
    const db = b - 100;
    const left = a + db;
    const right = da * db;
    return left * 100 + right;
  }

  private _multiplyNear1000(a: number, b: number): number {
    const da = a - 1000;
    const db = b - 1000;
    const left = a + db;
    const right = da * db;
    return left * 1000 + right;
  }

  private _multiplyByNines(a: number, b: number): number {
    const nineNum = (a === 9 || a === 99) ? a : b;
    const other = (a === 9 || a === 99) ? b : a;
    const multiplier = nineNum + 1;
    return other * multiplier - other;
  }

  private _multiplyBy5(n: number): number {
    return n * 10 / 2;
  }

  private _multiplyBy25(n: number): number {
    return n * 100 / 4;
  }

  private _multiplyBy125(n: number): number {
    return n * 1000 / 8;
  }

  private _isClosePair(a: number, b: number): boolean {
    const absA = Math.abs(a);
    const absB = Math.abs(b);
    return Math.floor(absA / 10) === Math.floor(absB / 10);
  }

  private _multiplyClosePair(a: number, b: number): number {
    const sign = (a < 0) !== (b < 0) ? -1 : 1;
    const absA = Math.abs(a);
    const absB = Math.abs(b);
    const base = Math.floor((absA + absB) / 2);
    const diff = Math.abs(absA - absB) / 2;
    return sign * (base * base - diff * diff);
  }

  private _squareByDifference(n: number): number {
    const sign = n < 0 ? 1 : 1;
    const abs = Math.abs(n);
    const nearestTen = Math.round(abs / 10) * 10;
    const diff = abs - nearestTen;
    return sign * (nearestTen * nearestTen + 2 * nearestTen * diff + diff * diff);
  }

  private _complement10(n: number): number {
    const abs = Math.abs(n);
    const lastDigit = abs % 10;
    const comp = lastDigit === 0 ? 0 : 10 - lastDigit;
    return n < 0 ? -comp : comp;
  }

  private _roundToSig(n: number): number {
    if (n === 0) return 0;
    const abs = Math.abs(n);
    const magnitude = Math.pow(10, Math.floor(Math.log10(abs)));
    return Math.round(n / magnitude) * magnitude;
  }

  private _refreshStats(): void {
    const total = this._records.length;
    this._stats.totalSolved = total;
    this._stats.streakCount = this._currentStreak;
    if (total === 0) {
      this._stats.accuracy = 0;
      this._stats.avgSpeed = 0;
      this._stats.bestStrategy = '';
      this._stats.fastestTime = Infinity;
      this._stats.slowestTime = 0;
      return;
    }
    const correct = this._records.filter(r => r.correct).length;
    this._stats.accuracy = correct / total;
    this._stats.avgSpeed = this._records.reduce((s, r) => s + r.timeSpent, 0) / total;
    const times = this._records.map(r => r.timeSpent);
    this._stats.fastestTime = Math.min(...times);
    this._stats.slowestTime = Math.max(...times);
    const strategyCounts = new Map<string, number>();
    for (const r of this._records) {
      if (!r.correct) continue;
      strategyCounts.set(r.strategy, (strategyCounts.get(r.strategy) || 0) + 1);
    }
    let best = '';
    let bestCount = 0;
    strategyCounts.forEach((count, name) => {
      if (count > bestCount) {
        best = name;
        bestCount = count;
      }
    });
    this._stats.bestStrategy = best;
  }

  private _registerBuiltinStrategies(): void {
    this._strategies.clear();
    const builtins: MentalStrategy[] = [
      { name: 'complement-add', description: '补数加法：将一数凑成10的倍数再加', applicability: '加法中一数接近10的倍数', speed: 0.9, difficulty: 'easy', category: 'addition' },
      { name: 'rounding-add', description: '凑整加法：四舍五入到整十再加', applicability: '加法中带零头者', speed: 0.85, difficulty: 'easy', category: 'addition' },
      { name: 'benchmark-add', description: '基准数加法：以某个整十数为基准', applicability: '多数相加且接近某数', speed: 0.88, difficulty: 'medium', category: 'addition' },
      { name: 'distributive-multiply', description: '分配律乘法：拆分乘数为整十+个位', applicability: '两位数乘法', speed: 0.8, difficulty: 'easy', category: 'multiplication' },
      { name: 'multiply-by-11', description: '11的倍数速算：首尾不变，中间相加', applicability: '乘数为11', speed: 0.95, difficulty: 'easy', category: 'multiplication' },
      { name: 'multiply-by-5', description: '乘5速算：先乘10再除以2', applicability: '乘数为5', speed: 0.92, difficulty: 'easy', category: 'multiplication' },
      { name: 'multiply-by-25', description: '乘25速算：先乘100再除以4', applicability: '乘数为25', speed: 0.9, difficulty: 'medium', category: 'multiplication' },
      { name: 'multiply-by-125', description: '乘125速算：先乘1000再除以8', applicability: '乘数为125', speed: 0.9, difficulty: 'medium', category: 'multiplication' },
      { name: 'multiply-by-nines', description: '乘9/99速算：先乘10/100再减原数', applicability: '乘数为9或99', speed: 0.93, difficulty: 'easy', category: 'multiplication' },
      { name: 'trailing-five-square', description: '尾数为5的平方：十位*(十位+1)拼25', applicability: '个位为5的两位数平方', speed: 0.93, difficulty: 'easy', category: 'square' },
      { name: 'near-100-square', description: '接近100的平方：差分法', applicability: '90~110之间的平方', speed: 0.92, difficulty: 'medium', category: 'square' },
      { name: 'near-50-square', description: '接近50的平方：25加减差再乘100加平方', applicability: '40~60之间的平方', speed: 0.91, difficulty: 'medium', category: 'square' },
      { name: 'same-head-tens-complement', description: '头同尾合十：十位相同个位和为10', applicability: '两位数乘法特殊形式', speed: 0.9, difficulty: 'hard', category: 'multiplication' },
      { name: 'same-tail-heads-complement', description: '尾同头合十：个位相同十位和为10', applicability: '两位数乘法特殊形式', speed: 0.9, difficulty: 'hard', category: 'multiplication' },
      { name: 'teens-multiply', description: '11~19相乘：一个数加另一个的个位乘10加个位积', applicability: '11到19之间的乘法', speed: 0.89, difficulty: 'medium', category: 'multiplication' },
      { name: 'vedic-square', description: '吠陀平方：两位数平方的竖式心算', applicability: '任意两位数平方', speed: 0.85, difficulty: 'hard', category: 'square' },
      { name: 'close-pair-multiply', description: '相近数相乘：平方差公式', applicability: '两数相差较小的乘法', speed: 0.87, difficulty: 'hard', category: 'multiplication' },
      { name: 'near-100-multiply', description: '接近100相乘：(100+a)(100+b)展开', applicability: '90~110之间的乘法', speed: 0.91, difficulty: 'medium', category: 'multiplication' },
      { name: 'quotient-estimate', description: '商估算：四舍六入再除', applicability: '除法估算', speed: 0.7, difficulty: 'easy', category: 'estimation' },
      { name: 'fermi-estimate', description: '费米估算：数量级估计', applicability: '大规模估算问题', speed: 0.6, difficulty: 'hard', category: 'estimation' },
    ];
    for (const s of builtins) this._strategies.set(s.name, s);
  }

  private _randomNumber(minDigits: number, maxDigits: number): number {
    const digits = Math.floor(Math.random() * (maxDigits - minDigits + 1)) + minDigits;
    const min = Math.pow(10, digits - 1);
    const max = Math.pow(10, digits) - 1;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private _randomDigits(count: number, min: number, max: number): number[] {
    const result: number[] = [];
    for (let i = 0; i < count; i++) {
      result.push(Math.floor(Math.random() * (max - min + 1)) + min);
    }
    return result;
  }

  private _factorize(n: number): number[] {
    const factors: number[] = [];
    let remaining = n;
    for (let p = 2; p * p <= remaining; p++) {
      while (remaining % p === 0) {
        factors.push(p);
        remaining = Math.floor(remaining / p);
      }
    }
    if (remaining > 1) factors.push(remaining);
    return factors;
  }

  private _suggestStrategy(a: number, b: number, op: Operator): string | null {
    if (op !== '*') return null;
    if (a === 11 || b === 11) return 'multiply-by-11';
    if (a === 5 || b === 5) return 'multiply-by-5';
    if (a === 25 || b === 25) return 'multiply-by-25';
    if (a === 9 || b === 9 || a === 99 || b === 99) return 'multiply-by-nines';
    if (a % 10 === 5 && b % 10 === 5) return 'trailing-five-square';
    if (a >= 90 && a <= 100 && b >= 90 && b <= 100) return 'near-100-multiply';
    const tensA = Math.floor(Math.abs(a) / 10);
    const tensB = Math.floor(Math.abs(b) / 10);
    const unitsA = Math.abs(a) % 10;
    const unitsB = Math.abs(b) % 10;
    if (tensA === tensB && unitsA + unitsB === 10) return 'same-head-tens-complement';
    if (unitsA === unitsB && tensA + tensB === 10) return 'same-tail-heads-complement';
    if (a >= 11 && a <= 19 && b >= 11 && b <= 19) return 'teens-multiply';
    return 'distributive-multiply';
  }

  private _solveTwentyFour(nums: number[]): string | null {
    if (nums.length === 1) {
      return Math.abs(nums[0] - 24) < 1e-6 ? String(nums[0]) : null;
    }
    for (let i = 0; i < nums.length; i++) {
      for (let j = 0; j < nums.length; j++) {
        if (i === j) continue;
        const remaining = nums.filter((_, idx) => idx !== i && idx !== j);
        const a = nums[i];
        const b = nums[j];
        const ops: Array<[number, string]> = [
          [a + b, `${a}+${b}`],
          [a - b, `${a}-${b}`],
          [a * b, `${a}*${b}`],
        ];
        if (b !== 0) ops.push([a / b, `${a}/${b}`]);
        for (const [result, expr] of ops) {
          const subSolution = this._solveTwentyFour([result, ...remaining]);
          if (subSolution) return `(${expr})`;
        }
      }
    }
    return null;
  }
}
