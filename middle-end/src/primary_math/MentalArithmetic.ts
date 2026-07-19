/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 口算速算引擎 —— 心智数学的瞬时反应
 * Mental Arithmetic Engine: Instant Response of Mental Mathematics
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 口算是数学思维的肌肉记忆。从补数加法到分配律速算，
 * 从11的倍数到接近100的平方，每一种速算技巧都凝结着
 * 数千年来算者对数字结构的直觉洞察。
 */

import { DataPacket } from '../shared/types';

export interface MentalStrategy {
  readonly name: string;
  readonly description: string;
  readonly applicability: string;
  readonly speed: number;
}

export interface ArithmeticProblem {
  readonly operands: number[];
  readonly operator: '+' | '-' | '*' | '/' | '^';
  readonly answer: number;
  readonly difficulty: 'easy' | 'medium' | 'hard';
}

export interface SpeedRecord {
  readonly problem: ArithmeticProblem;
  readonly timeSpent: number;
  readonly strategy: string;
  readonly correct: boolean;
}

export interface MentalStats {
  totalSolved: number;
  accuracy: number;
  avgSpeed: number;
  bestStrategy: string;
}

type Operator = '+' | '-' | '*' | '/' | '^';

export class MentalArithmetic {
  private _strategies: Map<string, MentalStrategy> = new Map();
  private _problems: ArithmeticProblem[] = [];
  private _records: SpeedRecord[] = [];
  private _history: string[] = [];
  private _stats: MentalStats = { totalSolved: 0, accuracy: 0, avgSpeed: 0, bestStrategy: '' };
  private _counter = 0;

  constructor() {
    this._registerBuiltinStrategies();
    this._recordHistory('MentalArithmetic engine initialized');
  }

  get strategies(): MentalStrategy[] { return Array.from(this._strategies.values()); }
  get records(): SpeedRecord[] { return [...this._records]; }
  get stats(): MentalStats { return { ...this._stats }; }

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
   * 乘法（含分配律速算）
   * Multiplication with distributive law shortcut
   */
  multiply(a: number, b: number): number {
    const result = this.distributiveMultiply(a, b);
    this._recordHistory(`multiply: ${a} * ${b} = ${result}`);
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
   * 速算乘法（11的倍数、尾数为5、接近100等）
   * Fast multiplication: multiples of 11, trailing 5, near 100, etc.
   */
  fastMultiply(a: number, b: number): number {
    let result: number;
    if (a === 11 || b === 11) {
      result = this._multiplyBy11(a === 11 ? b : a);
      this._recordHistory(`fastMultiply: 11-times trick on ${a === 11 ? b : a} = ${result}`);
    } else if (Math.abs(a % 10) === 5 && Math.abs(b % 10) === 5) {
      result = this._multiplyTrailingFives(a, b);
      this._recordHistory(`fastMultiply: trailing-5 trick on ${a}, ${b} = ${result}`);
    } else if (a >= 90 && a <= 100 && b >= 90 && b <= 100) {
      result = this._multiplyNear100(a, b);
      this._recordHistory(`fastMultiply: near-100 trick on ${a}, ${b} = ${result}`);
    } else {
      result = a * b;
      this._recordHistory(`fastMultiply: fallback to direct product = ${result}`);
    }
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
    } else {
      result = n * n;
      this._recordHistory(`fastSquare: direct square = ${result}`);
    }
    return result;
  }

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
      if (isCorrect) correct++;
      this._records.push({
        problem: p,
        timeSpent: Date.now() - start,
        strategy: 'chain',
        correct: isCorrect,
      });
    }
    this._refreshStats();
    this._recordHistory(`mentalChain: ${correct}/${problems.length} correct`);
    return correct;
  }

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
   * 注册新策略
   * Register a new mental strategy
   */
  registerStrategy(strategy: MentalStrategy): void {
    this._strategies.set(strategy.name, strategy);
    this._recordHistory(`registerStrategy: ${strategy.name} added`);
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
    this._stats = { totalSolved: 0, accuracy: 0, avgSpeed: 0, bestStrategy: '' };
    this._counter = 0;
    this._registerBuiltinStrategies();
    this._recordHistory('MentalArithmetic engine reset');
  }

  // ─────────────── private helpers ───────────────

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
    // Resolve any two-digit intermediate sums
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
    if (total === 0) {
      this._stats.accuracy = 0;
      this._stats.avgSpeed = 0;
      this._stats.bestStrategy = '';
      return;
    }
    const correct = this._records.filter(r => r.correct).length;
    this._stats.accuracy = correct / total;
    this._stats.avgSpeed = this._records.reduce((s, r) => s + r.timeSpent, 0) / total;
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
      { name: 'complement-add', description: '补数加法：将一数凑成10的倍数再加', applicability: '加法中一数接近10的倍数', speed: 0.9 },
      { name: 'rounding-add', description: '凑整加法：四舍五入到整十再加', applicability: '加法中带零头者', speed: 0.85 },
      { name: 'distributive-multiply', description: '分配律乘法：拆分乘数为整十+个位', applicability: '两位数乘法', speed: 0.8 },
      { name: 'multiply-by-11', description: '11的倍数速算：首尾不变，中间相加', applicability: '乘数为11', speed: 0.95 },
      { name: 'trailing-five-square', description: '尾数为5的平方：十位*(十位+1)拼25', applicability: '个位为5的两位数平方', speed: 0.93 },
      { name: 'near-100-square', description: '接近100的平方：差分法', applicability: '90~110之间的平方', speed: 0.92 },
      { name: 'quotient-estimate', description: '商估算：四舍六入再除', applicability: '除法估算', speed: 0.7 },
    ];
    for (const s of builtins) this._strategies.set(s.name, s);
  }
}
