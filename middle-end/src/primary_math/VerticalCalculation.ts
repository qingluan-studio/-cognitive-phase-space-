/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 竖式计算引擎 —— 数字列队的方阵之舞
 * Vertical Calculation Engine: The March of Digit Columns
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 竖式运算是数学最古老的具象表达。从右到左，逐列相加，
 * 进位如水波般向左传递，借位如信使般从前排借取。
 * 每一行都是一次小型计算，每一列都是一条独立通道。
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
}

export interface VerticalResult {
  readonly problem: string;
  readonly steps: VerticalStep[];
  readonly finalAnswer: number;
  readonly carryCount: number;
}

export interface ColumnArithmetic {
  readonly columns: number[];
  readonly carry: number[];
  readonly result: number[];
}

interface CalcSnapshot {
  readonly operation: string;
  readonly operandA: number;
  readonly operandB: number;
  readonly answer: number;
  readonly ts: number;
}

export class VerticalCalculation {
  private _results: VerticalResult[] = [];
  private _history: string[] = [];
  private _currentCalc: ColumnArithmetic | null = null;
  private _snapshots: CalcSnapshot[] = [];
  private _carryTracking: number[] = [];
  private _counter = 0;

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
        });
      }
      const finalAnswer = signA * Number(result.reverse().join(''));
      const vr: VerticalResult = {
        problem: `${a} + ${b}`,
        steps,
        finalAnswer,
        carryCount,
      };
      this._results.push(vr);
      this._recordHistory(`verticalAdd: ${a} + ${b} = ${finalAnswer} (${carryCount} carries)`);
      return vr;
    }
    // Different signs: defer to subtraction
    return this.verticalSubtract(a, b);
  }

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
    let carryCount = 0;
    for (let i = 0; i < maxLen; i++) {
      const origDa = digitsA[i] || 0;
      const db = digitsB[i] || 0;
      let da = origDa;
      const oldBorrow = borrow;
      if (da - oldBorrow < db) {
        da += 10;
        borrow = 1;
        if (oldBorrow === 0) {
          carryCount++;
          this._carryTracking.push(i);
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
      });
      result.push(digit);
    }
    while (result.length > 1 && result[result.length - 1] === 0) result.pop();
    const finalAnswer = sign * Number(result.reverse().join(''));
    const vr: VerticalResult = {
      problem: `${a} - ${b}`,
      steps,
      finalAnswer,
      carryCount,
    };
    this._results.push(vr);
    this._recordHistory(`verticalSubtract: ${a} - ${b} = ${finalAnswer} (${carryCount} borrows)`);
    return vr;
  }

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
          lineNumber: steps.length + 1,
          operation: `*`,
          digitA: da,
          digitB: db,
          carry,
          result: digit,
          remainder: 0,
        });
      }
      if (carry > 0) {
        partial.push(carry);
        totalCarry++;
      }
      partials.push(partial);
    }
    // Sum partials
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
    };
    this._results.push(vr);
    this._recordHistory(`verticalMultiply: ${a} × ${b} = ${finalAnswer}`);
    return vr;
  }

  /**
   * 竖式除法（含余数）
   * Vertical division with remainder
   */
  verticalDivide(a: number, b: number): VerticalResult {
    if (b === 0) {
      const vr: VerticalResult = { problem: `${a} ÷ ${b}`, steps: [], finalAnswer: NaN, carryCount: 0 };
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
      });
      cur = cur - prod;
    }
    const finalAnswer = sign * quotient;
    const vr: VerticalResult = {
      problem: `${a} ÷ ${b}`,
      steps,
      finalAnswer,
      carryCount: remainder === 0 ? 0 : 1,
    };
    this._results.push(vr);
    this._recordHistory(`verticalDivide: ${a} ÷ ${b} = ${finalAnswer} (rem ${remainder})`);
    return vr;
  }

  /**
   * 长除法（逐步商）
   * Long division with step-by-step quotient
   */
  longDivision(a: number, b: number): VerticalResult {
    return this.verticalDivide(a, b);
  }

  /**
   * 小数除法
   * Decimal division to given precision
   */
  decimalDivision(a: number, b: number, precision: number): VerticalResult {
    if (b === 0) {
      const vr: VerticalResult = { problem: `${a} ÷ ${b}`, steps: [], finalAnswer: NaN, carryCount: 0 };
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
    };
    this._results.push(vr);
    this._recordHistory(`decimalDivision: ${a} ÷ ${b} ≈ ${finalAnswer}`);
    return vr;
  }

  /**
   * 格式化竖式步骤为可读字符串
   * Format vertical steps into a readable string
   */
  showSteps(result: VerticalResult): string {
    const lines: string[] = [];
    lines.push(`问题: ${result.problem}`);
    lines.push(`答案: ${result.finalAnswer}`);
    lines.push(`进位/借位次数: ${result.carryCount}`);
    lines.push('步骤:');
    for (const s of result.steps) {
      lines.push(`  [${s.lineNumber}] ${s.digitA} ${s.operation} ${s.digitB} | carry=${s.carry} result=${s.result} rem=${s.remainder}`);
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
   * 序列化为 DataPacket
   * Serialize to DataPacket
   */
  toPacket(): DataPacket<{ results: VerticalResult[]; carryTracking: number[] }> {
    const packet: DataPacket<{ results: VerticalResult[]; carryTracking: number[] }> = {
      id: `vertical-calc-${(++this._counter).toString(36)}`,
      payload: {
        results: this._results,
        carryTracking: this._carryTracking,
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
    this._counter = 0;
    this._recordHistory('VerticalCalculation engine reset');
  }

  // ─────────────── private helpers ───────────────

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
}
