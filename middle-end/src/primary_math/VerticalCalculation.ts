/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 竖式计算引擎 —— 数字列队的方阵之舞
 * Vertical Calculation Engine: The March of Digit Columns
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 竖式运算是数学最古老的具象表达。从右到左，逐列相加，
 * 进位如水波般向左传递，借位如信使般从前排借取。
 * 每一行都是一次小型计算，每一列都是一条独立通道。
 *
 * 本引擎提供完整的竖式计算体系，从整数加减乘除到小数运算，
 * 从单步验算到多步混合运算，从简单的两位数到复杂的多位数，
 * 全面覆盖小学竖式计算教学的所有场景。
 */

import { DataPacket } from '../shared/types';

export interface VerticalStep {
  readonly lineNumber: number;
  readonly operation: string;
  readonly digitA: number;
  readonly digitB: number;
  readonly carry: number;
  readonly result: number;
  readonly remainder: number;
  readonly columnIndex: number;
  readonly description?: string;
}

export interface VerticalResult {
  readonly problem: string;
  readonly steps: VerticalStep[];
  readonly finalAnswer: number;
  readonly carryCount: number;
  readonly borrowCount: number;
  readonly remainder?: number;
  readonly decimalPlaces?: number;
  readonly verification?: number;
}

export interface ColumnArithmetic {
  readonly columns: number[];
  readonly carry: number[];
  readonly result: number[];
}

export interface VerticalConfig {
  readonly showCarryMarks: boolean;
  readonly alignRight: boolean;
  readonly decimalAlignment: boolean;
  readonly showRemainder: boolean;
}

interface CalcSnapshot {
  readonly operation: string;
  readonly operandA: number;
  readonly operandB: number;
  readonly answer: number;
  readonly ts: number;
}

export type VerticalOperation = 'add' | 'subtract' | 'multiply' | 'divide';

export interface VerticalDrillConfig {
  readonly operation: VerticalOperation | 'mixed';
  readonly difficulty: 'easy' | 'medium' | 'hard';
  readonly count: number;
  readonly digitCountA: number;
  readonly digitCountB: number;
  readonly withDecimal?: boolean;
}

export interface VerticalDrillResult {
  readonly problems: VerticalResult[];
  readonly correctCount: number;
  readonly totalCount: number;
  readonly accuracy: number;
  readonly avgCarryCount: number;
}

export class VerticalCalculation {
  private _results: VerticalResult[] = [];
  private _history: string[] = [];
  private _currentCalc: ColumnArithmetic | null = null;
  private _snapshots: CalcSnapshot[] = [];
  private _carryTracking: number[] = [];
  private _borrowTracking: number[] = [];
  private _counter = 0;
  private _config: VerticalConfig = {
    showCarryMarks: true,
    alignRight: true,
    decimalAlignment: true,
    showRemainder: true,
  };
  private _drillResults: VerticalResult[] = [];

  constructor() {
    this._recordHistory('VerticalCalculation engine initialized');
  }

  private _pushSnapshot(op: string, a: number, b: number, ans: number): void {
    this._snapshots.push({ operation: op, operandA: a, operandB: b, answer: ans, ts: Date.now() });
    if (this._snapshots.length > 200) this._snapshots.shift();
  }

  get snapshots(): CalcSnapshot[] { return [...this._snapshots]; }
  get results(): VerticalResult[] { return [...this._results]; }
  get history(): string[] { return [...this._history]; }
  get config(): VerticalConfig { return { ...this._config }; }
  get carryTracking(): number[] { return [...this._carryTracking]; }
  get borrowTracking(): number[] { return [...this._borrowTracking]; }

  setConfig(config: Partial<VerticalConfig>): void {
    this._config = { ...this._config, ...config };
    this._recordHistory(`setConfig: updated display configuration`);
  }

  // ===========================================================================
  // 整数竖式加法
  // ===========================================================================

  /**
   * 竖式加法（逐列从右到左，含进位）
   * Vertical addition: right-to-left columnar with carry
   */
  verticalAdd(a: number, b: number): VerticalResult {
    const signA = a < 0 ? -1 : 1;
    const signB = b < 0 ? -1 : 1;
    if (signA === signB) {
      const ua = Math.abs(a);
      const ub = Math.abs(b);
      const digitsA = this._toDigits(ua);
      const digitsB = this._toDigits(ub);
      const steps: VerticalStep[] = [];
      const maxLen = Math.max(digitsA.length, digitsB.length);
      const result: number[] = [];
      let carry = 0;
      let carryCount = 0;
      for (let i = 0; i < maxLen; i++) {
        const da = digitsA[i] || 0;
        const db = digitsB[i] || 0;
        const sum = da + db + carry;
        const newCarry = Math.floor(sum / 10);
        const digit = sum % 10;
        if (newCarry > 0) {
          carryCount++;
          this._carryTracking.push(i);
        }
        steps.push({
          lineNumber: i + 1,
          operation: '+',
          digitA: da,
          digitB: db,
          carry,
          result: digit,
          remainder: newCarry,
          columnIndex: i,
          description: newCarry > 0 ? `第${i + 1}列相加，进位${newCarry}` : `第${i + 1}列相加`,
        });
        result.push(digit);
        carry = newCarry;
      }
      if (carry > 0) {
        result.push(carry);
        steps.push({
          lineNumber: maxLen + 1,
          operation: '+',
          digitA: 0,
          digitB: 0,
          carry,
          result: carry,
          remainder: 0,
          columnIndex: maxLen,
          description: '最高位进位',
        });
      }
      const finalAnswer = signA * Number(result.reverse().join(''));
      const vr: VerticalResult = {
        problem: `${a} + ${b}`,
        steps,
        finalAnswer,
        carryCount,
        borrowCount: 0,
        verification: a + b,
      };
      this._results.push(vr);
      this._pushSnapshot('add', a, b, finalAnswer);
      this._recordHistory(`verticalAdd: ${a} + ${b} = ${finalAnswer} (${carryCount} carries)`);
      return vr;
    }
    return this.verticalSubtract(a, b);
  }

  /**
   * 多位数连加竖式
   * Vertical addition of multiple numbers
   */
  verticalAddMany(numbers: number[]): VerticalResult {
    if (numbers.length === 0) {
      return { problem: 'empty', steps: [], finalAnswer: 0, carryCount: 0, borrowCount: 0 };
    }
    if (numbers.length === 1) {
      return this.verticalAdd(numbers[0], 0);
    }
    let result = this.verticalAdd(numbers[0], numbers[1]);
    for (let i = 2; i < numbers.length; i++) {
      result = this.verticalAdd(result.finalAnswer, numbers[i]);
    }
    this._recordHistory(`verticalAddMany: sum of ${numbers.length} numbers = ${result.finalAnswer}`);
    return result;
  }

  /**
   * 小数竖式加法
   * Decimal vertical addition
   */
  verticalDecimalAdd(a: number, b: number, decimalPlaces: number = 2): VerticalResult {
    const factor = Math.pow(10, decimalPlaces);
    const scaledA = Math.round(a * factor);
    const scaledB = Math.round(b * factor);
    const intResult = this.verticalAdd(scaledA, scaledB);
    const finalAnswer = intResult.finalAnswer / factor;
    const vr: VerticalResult = {
      ...intResult,
      problem: `${a} + ${b}`,
      finalAnswer,
      decimalPlaces,
      verification: a + b,
    };
    this._results[this._results.length - 1] = vr;
    this._recordHistory(`verticalDecimalAdd: ${a} + ${b} = ${finalAnswer}`);
    return vr;
  }

  // ===========================================================================
  // 整数竖式减法
  // ===========================================================================

  /**
   * 竖式减法（含借位）
   * Vertical subtraction with borrowing
   */
  verticalSubtract(a: number, b: number): VerticalResult {
    let sign = 1;
    let ua = Math.abs(a);
    let ub = Math.abs(b);
    let swapped = false;
    if (ua < ub) {
      const tmp = ua; ua = ub; ub = tmp;
      swapped = true;
    }
    if ((a < 0) !== (b < 0)) sign = 1;
    if (swapped) sign = -sign;
    if (a < 0 && b < 0 && !swapped) sign = -1;
    if (a < 0 && b >= 0 && !swapped) sign = -1;
    const digitsA = this._toDigits(ua);
    const digitsB = this._toDigits(ub);
    const steps: VerticalStep[] = [];
    const maxLen = digitsA.length;
    const result: number[] = [];
    let borrow = 0;
    let borrowCount = 0;
    for (let i = 0; i < maxLen; i++) {
      const origDa = digitsA[i] || 0;
      const db = digitsB[i] || 0;
      let da = origDa;
      const oldBorrow = borrow;
      if (da - oldBorrow < db) {
        da += 10;
        borrow = 1;
        if (oldBorrow === 0) {
          borrowCount++;
          this._borrowTracking.push(i);
        }
      } else {
        borrow = 0;
      }
      const digit = da - oldBorrow - db;
      steps.push({
        lineNumber: i + 1,
        operation: '-',
        digitA: origDa,
        digitB: db,
        carry: borrow,
        result: digit,
        remainder: 0,
        columnIndex: i,
        description: borrow > 0 ? `第${i + 1}列相减，借位1` : `第${i + 1}列相减`,
      });
      result.push(digit);
    }
    while (result.length > 1 && result[result.length - 1] === 0) result.pop();
    const finalAnswer = sign * Number(result.reverse().join(''));
    const vr: VerticalResult = {
      problem: `${a} - ${b}`,
      steps,
      finalAnswer,
      carryCount: borrowCount,
      borrowCount,
      verification: a - b,
    };
    this._results.push(vr);
    this._pushSnapshot('subtract', a, b, finalAnswer);
    this._recordHistory(`verticalSubtract: ${a} - ${b} = ${finalAnswer} (${borrowCount} borrows)`);
    return vr;
  }

  /**
   * 连减竖式
   * Vertical chain subtraction
   */
  verticalSubtractMany(initial: number, subtrahends: number[]): VerticalResult {
    if (subtrahends.length === 0) {
      return this.verticalSubtract(initial, 0);
    }
    let result = this.verticalSubtract(initial, subtrahends[0]);
    for (let i = 1; i < subtrahends.length; i++) {
      result = this.verticalSubtract(result.finalAnswer, subtrahends[i]);
    }
    this._recordHistory(`verticalSubtractMany: ${initial} minus ${subtrahends.length} numbers = ${result.finalAnswer}`);
    return result;
  }

  /**
   * 小数竖式减法
   * Decimal vertical subtraction
   */
  verticalDecimalSubtract(a: number, b: number, decimalPlaces: number = 2): VerticalResult {
    const factor = Math.pow(10, decimalPlaces);
    const scaledA = Math.round(a * factor);
    const scaledB = Math.round(b * factor);
    const intResult = this.verticalSubtract(scaledA, scaledB);
    const finalAnswer = intResult.finalAnswer / factor;
    const vr: VerticalResult = {
      ...intResult,
      problem: `${a} - ${b}`,
      finalAnswer,
      decimalPlaces,
      verification: a - b,
    };
    this._results[this._results.length - 1] = vr;
    this._recordHistory(`verticalDecimalSubtract: ${a} - ${b} = ${finalAnswer}`);
    return vr;
  }

  // ===========================================================================
  // 整数竖式乘法
  // ===========================================================================

  /**
   * 竖式乘法（部分积相加）
   * Vertical multiplication via partial products
   */
  verticalMultiply(a: number, b: number): VerticalResult {
    const sign = (a < 0) !== (b < 0) ? -1 : 1;
    const ua = Math.abs(a);
    const ub = Math.abs(b);
    const digitsA = this._toDigits(ua);
    const digitsB = this._toDigits(ub);
    const steps: VerticalStep[] = [];
    const partials: number[][] = [];
    let totalCarry = 0;
    let lineNum = 0;
    for (let j = 0; j < digitsB.length; j++) {
      const db = digitsB[j];
      const partial: number[] = new Array(j).fill(0);
      let carry = 0;
      for (let i = 0; i < digitsA.length; i++) {
        const da = digitsA[i];
        const prod = da * db + carry;
        const digit = prod % 10;
        carry = Math.floor(prod / 10);
        partial.push(digit);
        steps.push({
          lineNumber: ++lineNum,
          operation: `×`,
          digitA: da,
          digitB: db,
          carry,
          result: digit,
          remainder: 0,
          columnIndex: i + j,
          description: `第${j + 1}行第${i + 1}列相乘`,
        });
      }
      if (carry > 0) {
        partial.push(carry);
        totalCarry++;
      }
      partials.push(partial);
    }
    let sum = 0;
    for (let i = 0; i < partials.length; i++) {
      sum += Number([...partials[i]].reverse().join(''));
    }
    const finalAnswer = sign * sum;
    const vr: VerticalResult = {
      problem: `${a} × ${b}`,
      steps,
      finalAnswer,
      carryCount: totalCarry,
      borrowCount: 0,
      verification: a * b,
    };
    this._results.push(vr);
    this._pushSnapshot('multiply', a, b, finalAnswer);
    this._recordHistory(`verticalMultiply: ${a} × ${b} = ${finalAnswer}`);
    return vr;
  }

  /**
   * 多位数连乘竖式
   * Vertical multiplication chain
   */
  verticalMultiplyMany(numbers: number[]): VerticalResult {
    if (numbers.length === 0) {
      return { problem: 'empty', steps: [], finalAnswer: 0, carryCount: 0, borrowCount: 0 };
    }
    if (numbers.length === 1) {
      return this.verticalMultiply(numbers[0], 1);
    }
    let result = this.verticalMultiply(numbers[0], numbers[1]);
    for (let i = 2; i < numbers.length; i++) {
      result = this.verticalMultiply(result.finalAnswer, numbers[i]);
    }
    this._recordHistory(`verticalMultiplyMany: product of ${numbers.length} numbers = ${result.finalAnswer}`);
    return result;
  }

  /**
   * 小数竖式乘法
   * Decimal vertical multiplication
   */
  verticalDecimalMultiply(a: number, b: number, decimalPlacesA: number = 2, decimalPlacesB: number = 2): VerticalResult {
    const factorA = Math.pow(10, decimalPlacesA);
    const factorB = Math.pow(10, decimalPlacesB);
    const scaledA = Math.round(a * factorA);
    const scaledB = Math.round(b * factorB);
    const intResult = this.verticalMultiply(scaledA, scaledB);
    const totalDecimal = decimalPlacesA + decimalPlacesB;
    const finalAnswer = intResult.finalAnswer / Math.pow(10, totalDecimal);
    const vr: VerticalResult = {
      ...intResult,
      problem: `${a} × ${b}`,
      finalAnswer,
      decimalPlaces: totalDecimal,
      verification: a * b,
    };
    this._results[this._results.length - 1] = vr;
    this._recordHistory(`verticalDecimalMultiply: ${a} × ${b} = ${finalAnswer}`);
    return vr;
  }

  // ===========================================================================
  // 整数竖式除法
  // ===========================================================================

  /**
   * 竖式除法（含余数）
   * Vertical division with remainder
   */
  verticalDivide(a: number, b: number): VerticalResult {
    if (b === 0) {
      const vr: VerticalResult = { problem: `${a} ÷ ${b}`, steps: [], finalAnswer: NaN, carryCount: 0, borrowCount: 0 };
      this._results.push(vr);
      this._recordHistory('verticalDivide: division by zero');
      return vr;
    }
    const sign = (a < 0) !== (b < 0) ? -1 : 1;
    const ua = Math.abs(a);
    const ub = Math.abs(b);
    const quotient = Math.floor(ua / ub);
    const remainder = ua - quotient * ub;
    const steps: VerticalStep[] = [];
    const digits = String(ua).split('').map(Number);
    let cur = 0;
    let line = 0;
    for (const d of digits) {
      cur = cur * 10 + d;
      const q = Math.floor(cur / ub);
      const prod = q * ub;
      steps.push({
        lineNumber: ++line,
        operation: '÷',
        digitA: cur,
        digitB: ub,
        carry: q,
        result: q,
        remainder: cur - prod,
        columnIndex: line - 1,
        description: `商${q}，余${cur - prod}`,
      });
      cur = cur - prod;
    }
    const finalAnswer = sign * quotient;
    const vr: VerticalResult = {
      problem: `${a} ÷ ${b}`,
      steps,
      finalAnswer,
      carryCount: remainder === 0 ? 0 : 1,
      borrowCount: 0,
      remainder,
      verification: a / b,
    };
    this._results.push(vr);
    this._pushSnapshot('divide', a, b, finalAnswer);
    this._recordHistory(`verticalDivide: ${a} ÷ ${b} = ${finalAnswer} (rem ${remainder})`);
    return vr;
  }

  /**
   * 长除法（逐步商）
   * Long division with step-by-step quotient
   */
  longDivision(a: number, b: number): VerticalResult {
    const result = this.verticalDivide(a, b);
    this._recordHistory(`longDivision: ${a} ÷ ${b}`);
    return result;
  }

  /**
   * 带余除法验算
   * Division verification: divisor × quotient + remainder = dividend
   */
  verifyDivision(dividend: number, divisor: number): { quotient: number; remainder: number; correct: boolean } {
    const result = this.verticalDivide(dividend, divisor);
    const quotient = Math.abs(result.finalAnswer);
    const remainder = result.remainder ?? 0;
    const correct = Math.abs(divisor) * quotient + remainder === Math.abs(dividend);
    this._recordHistory(`verifyDivision: ${dividend} ÷ ${divisor} = ${quotient} rem ${remainder}, correct=${correct}`);
    return { quotient, remainder, correct };
  }

  /**
   * 小数除法
   * Decimal division to given precision
   */
  decimalDivision(a: number, b: number, precision: number): VerticalResult {
    if (b === 0) {
      const vr: VerticalResult = { problem: `${a} ÷ ${b}`, steps: [], finalAnswer: NaN, carryCount: 0, borrowCount: 0 };
      this._results.push(vr);
      this._recordHistory('decimalDivision: division by zero');
      return vr;
    }
    const sign = (a < 0) !== (b < 0) ? -1 : 1;
    let ua = Math.abs(a);
    const ub = Math.abs(b);
    const steps: VerticalStep[] = [];
    const quotientDigits: number[] = [];
    let line = 0;
    let integerPart = '';
    if (ua < ub) {
      integerPart = '0.';
    } else {
      const iq = Math.floor(ua / ub);
      integerPart = String(iq) + '.';
      ua = ua - iq * ub;
      quotientDigits.push(...String(iq).split('').map(Number));
    }
    for (let i = 0; i < precision; i++) {
      ua = ua * 10;
      const q = Math.floor(ua / ub);
      const prod = q * ub;
      steps.push({
        lineNumber: ++line,
        operation: '÷',
        digitA: ua,
        digitB: ub,
        carry: q,
        result: q,
        remainder: ua - prod,
        columnIndex: i,
        description: `小数第${i + 1}位，商${q}`,
      });
      quotientDigits.push(q);
      ua = ua - prod;
      if (ua === 0) break;
    }
    const finalAnswer = sign * Number(integerPart + quotientDigits.slice(String(Math.floor(Math.abs(a) / ub)).length).join(''));
    const vr: VerticalResult = {
      problem: `${a} ÷ ${b} (precision ${precision})`,
      steps,
      finalAnswer,
      carryCount: 0,
      borrowCount: 0,
      decimalPlaces: precision,
      verification: a / b,
    };
    this._results.push(vr);
    this._recordHistory(`decimalDivision: ${a} ÷ ${b} ≈ ${finalAnswer}`);
    return vr;
  }

  // ===========================================================================
  // 验算功能
  // ===========================================================================

  /**
   * 加法验算（交换加数位置）
   * Addition verification by swapping operands
   */
  verifyAdd(a: number, b: number): { result: number; correct: boolean } {
    const forward = this.verticalAdd(a, b);
    const swapped = this.verticalAdd(b, a);
    const correct = Math.abs(forward.finalAnswer - swapped.finalAnswer) < 1e-6;
    this._recordHistory(`verifyAdd: ${a}+${b} = ${forward.finalAnswer}, swapped=${swapped.finalAnswer}, correct=${correct}`);
    return { result: forward.finalAnswer, correct };
  }

  /**
   * 减法验算（差 + 减数 = 被减数）
   * Subtraction verification: difference + subtrahend = minuend
   */
  verifySubtract(a: number, b: number): { result: number; correct: boolean } {
    const subResult = this.verticalSubtract(a, b);
    const checkAdd = this.verticalAdd(subResult.finalAnswer, b);
    const correct = Math.abs(checkAdd.finalAnswer - a) < 1e-6;
    this._recordHistory(`verifySubtract: ${a}-${b}=${subResult.finalAnswer}, check=${checkAdd.finalAnswer}, correct=${correct}`);
    return { result: subResult.finalAnswer, correct };
  }

  /**
   * 乘法验算（交换乘数位置）
   * Multiplication verification by swapping operands
   */
  verifyMultiply(a: number, b: number): { result: number; correct: boolean } {
    const forward = this.verticalMultiply(a, b);
    const swapped = this.verticalMultiply(b, a);
    const correct = Math.abs(forward.finalAnswer - swapped.finalAnswer) < 1e-6;
    this._recordHistory(`verifyMultiply: ${a}×${b}=${forward.finalAnswer}, swapped=${swapped.finalAnswer}, correct=${correct}`);
    return { result: forward.finalAnswer, correct };
  }

  // ===========================================================================
  // 格式化与展示
  // ===========================================================================

  /**
   * 格式化竖式步骤为可读字符串
   * Format vertical steps into a readable string
   */
  showSteps(result: VerticalResult): string {
    const lines: string[] = [];
    lines.push(`问题: ${result.problem}`);
    lines.push(`答案: ${result.finalAnswer}`);
    if (result.remainder !== undefined) {
      lines.push(`余数: ${result.remainder}`);
    }
    lines.push(`进位次数: ${result.carryCount}`);
    if (result.borrowCount > 0) {
      lines.push(`借位次数: ${result.borrowCount}`);
    }
    lines.push('步骤:');
    for (const s of result.steps) {
      lines.push(`  [${s.lineNumber}] 列${s.columnIndex + 1}: ${s.digitA} ${s.operation} ${s.digitB} | 进位/借位=${s.carry} 结果=${s.result} 余=${s.remainder}`);
      if (s.description) {
        lines.push(`       说明: ${s.description}`);
      }
    }
    return lines.join('\n');
  }

  /**
   * 生成ASCII艺术竖式
   * Generate ASCII art vertical layout
   */
  toAsciiArt(result: VerticalResult): string {
    const parts = result.problem.split(/\s*[+\-×÷]\s*/);
    if (parts.length < 2) return result.problem;
    const a = parts[0];
    const b = parts[1];
    const opMatch = result.problem.match(/[+\-×÷]/);
    const op = opMatch ? opMatch[0] : '+';
    const answer = String(result.finalAnswer);
    const width = Math.max(a.length, b.length + 2, answer.length);
    const lines: string[] = [];
    lines.push(a.padStart(width));
    lines.push((op + b).padStart(width));
    lines.push('-'.repeat(width));
    lines.push(answer.padStart(width));
    if (result.remainder !== undefined && result.remainder > 0) {
      lines.push(`余 ${result.remainder}`);
    }
    return lines.join('\n');
  }

  /**
   * 验证进位正确性
   * Verify carry tracking is consistent
   */
  verifyCarry(result: VerticalResult): boolean {
    if (result.steps.length === 0) return true;
    let carryTotal = 0;
    for (const s of result.steps) {
      carryTotal += s.carry;
    }
    return carryTotal >= result.carryCount;
  }

  /**
   * 统计进位/借位列
   * Get carry/borrow column statistics
   */
  getCarryStats(): { totalCarries: number; totalBorrows: number; maxConsecutive: number } {
    let totalCarries = this._carryTracking.length;
    let totalBorrows = this._borrowTracking.length;
    let maxConsecutive = 0;
    let currentConsecutive = 0;
    let prev = -2;
    for (const col of this._carryTracking.sort((a, b) => a - b)) {
      if (col === prev + 1) {
        currentConsecutive++;
      } else {
        maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
        currentConsecutive = 1;
      }
      prev = col;
    }
    maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
    return { totalCarries, totalBorrows, maxConsecutive };
  }

  // ===========================================================================
  // 练习生成
  // ===========================================================================

  /**
   * 生成竖式练习题
   * Generate vertical calculation drill problems
   */
  generateDrill(config: VerticalDrillConfig): VerticalResult[] {
    const problems: VerticalResult[] = [];
    for (let i = 0; i < config.count; i++) {
      let op: VerticalOperation;
      if (config.operation === 'mixed') {
        const ops: VerticalOperation[] = ['add', 'subtract', 'multiply', 'divide'];
        op = ops[Math.floor(Math.random() * ops.length)];
      } else {
        op = config.operation;
      }
      let a = this._randomNumber(config.digitCountA);
      let b = this._randomNumber(config.digitCountB);
      if (op === 'subtract') {
        b = Math.min(a, b);
      }
      if (op === 'divide') {
        b = Math.max(1, Math.min(b, 99));
        a = b * Math.floor(Math.random() * 100 + 1);
      }
      let result: VerticalResult;
      switch (op) {
        case 'add':
          result = this.verticalAdd(a, b);
          break;
        case 'subtract':
          result = this.verticalSubtract(Math.max(a, b), Math.min(a, b));
          break;
        case 'multiply':
          result = this.verticalMultiply(a, b);
          break;
        case 'divide':
          result = this.verticalDivide(a, b);
          break;
      }
      problems.push(result);
    }
    this._drillResults = problems;
    this._recordHistory(`generateDrill: generated ${problems.length} ${config.operation} problems`);
    return problems;
  }

  /**
   * 获取练习统计
   * Get drill statistics
   */
  getDrillStats(): VerticalDrillResult {
    const problems = this._drillResults;
    let correctCount = 0;
    let totalCarry = 0;
    for (const p of problems) {
      if (p.verification !== undefined && Math.abs(p.finalAnswer - p.verification) < 1e-6) {
        correctCount++;
      }
      totalCarry += p.carryCount;
    }
    return {
      problems,
      correctCount,
      totalCount: problems.length,
      accuracy: problems.length > 0 ? correctCount / problems.length : 0,
      avgCarryCount: problems.length > 0 ? totalCarry / problems.length : 0,
    };
  }

  // ===========================================================================
  // 序列化为 DataPacket
  // ===========================================================================

  /**
   * 序列化为 DataPacket
   * Serialize to DataPacket
   */
  toPacket(): DataPacket<{ results: VerticalResult[]; carryTracking: number[]; borrowTracking: number[]; config: VerticalConfig }> {
    const packet: DataPacket<{ results: VerticalResult[]; carryTracking: number[]; borrowTracking: number[]; config: VerticalConfig }> = {
      id: `vertical-calc-${(++this._counter).toString(36)}`,
      payload: {
        results: this._results,
        carryTracking: this._carryTracking,
        borrowTracking: this._borrowTracking,
        config: this._config,
      },
      metadata: {
        createdAt: Date.now(),
        route: ['primary_math', 'VerticalCalculation'],
        priority: 2,
        phase: 'vertical-calculation',
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
    this._results = [];
    this._history = [];
    this._currentCalc = null;
    this._carryTracking = [];
    this._borrowTracking = [];
    this._counter = 0;
    this._snapshots = [];
    this._drillResults = [];
    this._config = {
      showCarryMarks: true,
      alignRight: true,
      decimalAlignment: true,
      showRemainder: true,
    };
    this._recordHistory('VerticalCalculation engine reset');
  }

  // ===========================================================================
  // 私有辅助方法
  // ===========================================================================

  private _recordHistory(entry: string): void {
    this._history.push(`[${new Date().toISOString()}] ${entry}`);
    if (this._history.length > 500) this._history.shift();
  }

  private _toDigits(n: number): number[] {
    if (n === 0) return [0];
    const digits: number[] = [];
    let v = Math.abs(n);
    while (v > 0) {
      digits.push(v % 10);
      v = Math.floor(v / 10);
    }
    return digits;
  }

  private _randomNumber(digitCount: number): number {
    const min = Math.pow(10, digitCount - 1);
    const max = Math.pow(10, digitCount) - 1;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private _fromDigits(digits: number[]): number {
    let result = 0;
    for (let i = digits.length - 1; i >= 0; i--) {
      result = result * 10 + digits[i];
    }
    return result;
  }

  private _countDigits(n: number): number {
    if (n === 0) return 1;
    return Math.floor(Math.log10(Math.abs(n))) + 1;
  }

  private _alignRight(a: string, b: string): { a: string; b: string; width: number } {
    const width = Math.max(a.length, b.length);
    return {
      a: a.padStart(width, '0'),
      b: b.padStart(width, '0'),
      width,
    };
  }
}
