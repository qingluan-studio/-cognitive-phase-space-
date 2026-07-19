/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 应用题引擎 —— 文字背后的数学骨架
 * Word Problem Engine: The Mathematical Skeleton Beneath Words
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 应用题是从生活语言到数学语言的翻译。行程问题以速度为引线，
 * 价格问题以单价为支点，工程问题以效率为枢纽，浓度问题以溶液为容器。
 * 关键词是它的灯塔，已知量是它的舵轮，未知量是它的彼岸。
 */

import { DataPacket } from '../shared/types';

export type ProblemType =
  | 'addition' | 'subtraction' | 'multiplication' | 'division'
  | 'speed' | 'price' | 'work' | 'concentration'
  | 'geometry' | 'ratio' | 'percentage';

export interface SolutionStep {
  readonly description: string;
  readonly calculation: string;
  readonly result: number;
  readonly reasoning: string;
}

export interface WordProblem {
  readonly id: string;
  readonly text: string;
  readonly type: ProblemType;
  readonly knownValues: Map<string, number>;
  readonly unknown: string;
  readonly solution: SolutionStep[];
  readonly steps: SolutionStep[];
}

interface TypeRule {
  readonly type: ProblemType;
  readonly keywords: string[];
  readonly hint: string;
}

/**
 * WordProblem engine. Note: the data record interface is also named
 * `WordProblem`; the engine class is `WordProblemEngine` to avoid
 * declaration-merge conflicts with the data-shape interface.
 */
export class WordProblemEngine {
  private _problems: Map<string, WordProblem> = new Map();
  private _solved: WordProblem[] = [];
  private _history: string[] = [];
  private _typeDetector: TypeRule[] = [];
  private _counter = 0;

  constructor() {
    this._initTypeRules();
    this._recordHistory('WordProblem engine initialized');
  }

  get problems(): WordProblem[] { return Array.from(this._problems.values()); }
  get solved(): WordProblem[] { return [...this._solved]; }
  get history(): string[] { return [...this._history]; }

  /**
   * 解析应用题文本
   * Parse a word problem from natural-language text
   */
  parse(text: string): WordProblem {
    const type = this.detectType(text);
    const known = this.extractValues(text);
    const unknown = this._guessUnknown(text, type);
    const problem: WordProblem = {
      id: `wp-${(++this._counter).toString(36)}`,
      text, type, knownValues: known, unknown, solution: [], steps: [],
    };
    this._problems.set(problem.id, problem);
    this._recordHistory(`parse: id=${problem.id}, type=${type}, unknown=${unknown}`);
    return problem;
  }

  /**
   * 关键词检测题型
   * Detect problem type by keyword matching
   */
  detectType(text: string): ProblemType {
    const lower = text.toLowerCase();
    let best: ProblemType = 'addition';
    let bestScore = 0;
    for (const rule of this._typeDetector) {
      const score = rule.keywords.reduce((s, kw) => lower.includes(kw) ? s + 1 : s, 0);
      if (score > bestScore) { bestScore = score; best = rule.type; }
    }
    this._recordHistory(`detectType: "${text.slice(0, 24)}..." → ${best} (score ${bestScore})`);
    return best;
  }

  /**
   * 提取已知量
   * Extract known numeric quantities from text
   */
  extractValues(text: string): Map<string, number> {
    const out = new Map<string, number>();
    const numRegex = /(\d+(?:\.\d+)?)\s*(公里|千米|米|分米|厘米|千米每时|公里每时|米每秒|小时|分钟|秒|元|角|分|个|件|天|周|月|年|%|度|升|毫升|克|千克|吨|份)?/g;
    let m: RegExpExecArray | null;
    let idx = 0;
    while ((m = numRegex.exec(text)) !== null) {
      const key = m[2] ? `value_${m[2]}_${idx}` : `value_${idx}`;
      out.set(key, Number(m[1]));
      idx++;
    }
    const namedRegex = /([a-zA-Z\u4e00-\u9fa5]{1,6})\s*[为是]\s*(\d+(?:\.\d+)?)/g;
    while ((m = namedRegex.exec(text)) !== null) out.set(m[1], Number(m[2]));
    this._recordHistory(`extractValues: ${out.size} values extracted`);
    return out;
  }

  /**
   * 求解
   * Solve a previously-parsed word problem
   */
  solve(problem: WordProblem): SolutionStep[] {
    const v = problem.knownValues;
    let steps: SolutionStep[];
    switch (problem.type) {
      case 'speed':
        steps = this.solveSpeed(v.get('value_公里_0') ?? v.get('distance') ?? 0, v.get('value_小时_1') ?? v.get('time') ?? 0, v.get('speed') ?? 0);
        break;
      case 'price':
        steps = this.solvePrice(v.get('value_元_0') ?? v.get('unitPrice') ?? 0, v.get('quantity') ?? 0, v.get('total') ?? 0);
        break;
      case 'work':
        steps = this.solveWork(v.get('efficiency') ?? 0, v.get('value_天_1') ?? v.get('time') ?? 0, v.get('totalWork') ?? 0);
        break;
      case 'concentration':
        steps = this.solveConcentration(v.get('amount') ?? 0, v.get('concentration') ?? 0, v.get('total') ?? 0);
        break;
      case 'ratio':
        steps = this.solveRatio(v.get('a') ?? 0, v.get('b') ?? 0, v.get('ratio') ?? 0);
        break;
      case 'percentage':
        steps = this.solvePercentage(v.get('base') ?? 0, v.get('rate') ?? 0, v.get('part') ?? 0);
        break;
      case 'geometry':
        steps = this.solveGeometry('rectangle', { length: v.get('length') ?? 0, width: v.get('width') ?? 0 });
        break;
      case 'multiplication': steps = this._simpleOp(v, '*'); break;
      case 'division': steps = this._simpleOp(v, '/'); break;
      case 'subtraction': steps = this._simpleOp(v, '-'); break;
      case 'addition':
      default: steps = this._simpleOp(v, '+'); break;
    }
    const solved: WordProblem = { ...problem, solution: steps, steps };
    this._solved.push(solved);
    this._problems.set(problem.id, solved);
    this._recordHistory(`solve: ${problem.id} → ${steps.length} steps`);
    return steps;
  }

  /**
   * 行程问题: distance = speed × time
   * Speed problems
   */
  solveSpeed(distance: number, time: number, speed: number): SolutionStep[] {
    if (speed === 0 && time > 0) {
      return [this._step('已知路程和时间，求速度', `${distance} ÷ ${time}`, distance / time, '速度 = 路程 ÷ 时间')];
    }
    if (time === 0 && speed > 0) {
      return [this._step('已知路程和速度，求时间', `${distance} ÷ ${speed}`, distance / speed, '时间 = 路程 ÷ 速度')];
    }
    if (distance === 0 && speed > 0 && time > 0) {
      return [this._step('已知速度和时间，求路程', `${speed} × ${time}`, speed * time, '路程 = 速度 × 时间')];
    }
    return [this._step('行程问题参数不足', 'N/A', NaN, '需要已知三量中的两个')];
  }

  /**
   * 价格问题: total = unitPrice × quantity
   * Price problems
   */
  solvePrice(unitPrice: number, quantity: number, total: number): SolutionStep[] {
    if (total === 0 && unitPrice > 0 && quantity > 0) {
      return [this._step('求总价', `${unitPrice} × ${quantity}`, unitPrice * quantity, '总价 = 单价 × 数量')];
    }
    if (unitPrice === 0 && total > 0 && quantity > 0) {
      return [this._step('求单价', `${total} ÷ ${quantity}`, total / quantity, '单价 = 总价 ÷ 数量')];
    }
    if (quantity === 0 && total > 0 && unitPrice > 0) {
      return [this._step('求数量', `${total} ÷ ${unitPrice}`, total / unitPrice, '数量 = 总价 ÷ 单价')];
    }
    return [this._step('价格问题参数不足', 'N/A', NaN, '需要已知三量中的两个')];
  }

  /**
   * 工程问题: totalWork = efficiency × time
   * Work problems
   */
  solveWork(efficiency: number, time: number, totalWork: number): SolutionStep[] {
    if (totalWork === 0 && efficiency > 0 && time > 0) {
      return [this._step('求总工作量', `${efficiency} × ${time}`, efficiency * time, '总量 = 效率 × 时间')];
    }
    if (efficiency === 0 && totalWork > 0 && time > 0) {
      return [this._step('求工作效率', `${totalWork} ÷ ${time}`, totalWork / time, '效率 = 总量 ÷ 时间')];
    }
    if (time === 0 && totalWork > 0 && efficiency > 0) {
      return [this._step('求工作时间', `${totalWork} ÷ ${efficiency}`, totalWork / efficiency, '时间 = 总量 ÷ 效率')];
    }
    return [this._step('工程问题参数不足', 'N/A', NaN, '需要已知三量中的两个')];
  }

  /**
   * 浓度问题: solute = total × concentration
   * Concentration problems
   */
  solveConcentration(amount: number, concentration: number, total: number): SolutionStep[] {
    if (amount === 0 && total > 0 && concentration > 0) {
      return [this._step('求溶质', `${total} × ${concentration}%`, total * concentration / 100, '溶质 = 溶液 × 浓度')];
    }
    if (concentration === 0 && amount > 0 && total > 0) {
      return [this._step('求浓度', `${amount} ÷ ${total} × 100%`, amount / total * 100, '浓度 = 溶质 ÷ 溶液 × 100%')];
    }
    if (total === 0 && amount > 0 && concentration > 0) {
      return [this._step('求溶液', `${amount} ÷ ${concentration}%`, amount / (concentration / 100), '溶液 = 溶质 ÷ 浓度')];
    }
    return [this._step('浓度问题参数不足', 'N/A', NaN, '需要已知三量中的两个')];
  }

  /**
   * 比例问题: a : b = ratio
   * Ratio problems
   */
  solveRatio(a: number, b: number, ratio: number): SolutionStep[] {
    if (a > 0 && b > 0 && ratio === 0) {
      return [this._step('求比值', `${a} ÷ ${b}`, a / b, '比值 = 前项 ÷ 后项')];
    }
    if (a === 0 && b > 0 && ratio > 0) {
      return [this._step('求前项', `${b} × ${ratio}`, b * ratio, '前项 = 后项 × 比值')];
    }
    if (b === 0 && a > 0 && ratio > 0) {
      return [this._step('求后项', `${a} ÷ ${ratio}`, a / ratio, '后项 = 前项 ÷ 比值')];
    }
    return [this._step('比例问题参数不足', 'N/A', NaN, '需要已知三量中的两个')];
  }

  /**
   * 百分比问题: part = base × rate
   * Percentage problems
   */
  solvePercentage(base: number, rate: number, part: number): SolutionStep[] {
    if (part === 0 && base > 0 && rate > 0) {
      return [this._step('求部分', `${base} × ${rate}%`, base * rate / 100, '部分 = 基数 × 百分比')];
    }
    if (rate === 0 && base > 0 && part > 0) {
      return [this._step('求百分比', `${part} ÷ ${base} × 100%`, part / base * 100, '百分比 = 部分 ÷ 基数 × 100%')];
    }
    if (base === 0 && rate > 0 && part > 0) {
      return [this._step('求基数', `${part} ÷ ${rate}%`, part / (rate / 100), '基数 = 部分 ÷ 百分比')];
    }
    return [this._step('百分比问题参数不足', 'N/A', NaN, '需要已知三量中的两个')];
  }

  /**
   * 几何应用题
   * Geometry word problems
   */
  solveGeometry(shape: string, params: Record<string, number>): SolutionStep[] {
    switch (shape) {
      case 'rectangle':
        return [this._step('求长方形面积', `${params.length || 0} × ${params.width || 0}`, (params.length || 0) * (params.width || 0), '长方形面积 = 长 × 宽')];
      case 'triangle':
        return [this._step('求三角形面积', `0.5 × ${params.base || 0} × ${params.height || 0}`, 0.5 * (params.base || 0) * (params.height || 0), '三角形面积 = 底 × 高 ÷ 2')];
      case 'circle':
        return [this._step('求圆面积', `π × ${params.radius || 0}²`, Math.PI * Math.pow(params.radius || 0, 2), '圆面积 = π × 半径²')];
      default:
        return [this._step(`未识别的图形: ${shape}`, 'N/A', NaN, '请使用 rectangle / triangle / circle')];
    }
  }

  /**
   * 生成解释
   * Generate a natural-language explanation
   */
  explain(problem: WordProblem): string {
    if (problem.solution.length === 0) {
      return `问题类型: ${problem.type}\n尚未求解，请先调用 solve()。`;
    }
    const lines: string[] = [
      `问题: ${problem.text}`,
      `类型: ${problem.type}`,
      `未知量: ${problem.unknown}`,
      '解题步骤:',
    ];
    problem.solution.forEach((s, i) => {
      lines.push(`  ${i + 1}. ${s.description}`);
      lines.push(`     计算: ${s.calculation} = ${s.result}`);
      lines.push(`     理由: ${s.reasoning}`);
    });
    return lines.join('\n');
  }

  /**
   * 序列化为 DataPacket
   * Serialize to DataPacket
   */
  toPacket(): DataPacket<{ solved: WordProblem[]; count: number }> {
    const packet: DataPacket<{ solved: WordProblem[]; count: number }> = {
      id: `word-problem-${(++this._counter).toString(36)}`,
      payload: { solved: this._solved, count: this._solved.length },
      metadata: {
        createdAt: Date.now(),
        route: ['primary_math', 'WordProblem'],
        priority: 2,
        phase: 'word-problem',
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
    this._problems.clear();
    this._solved = [];
    this._history = [];
    this._counter = 0;
    this._initTypeRules();
    this._recordHistory('WordProblem engine reset');
  }

  // ─────────────── private helpers ───────────────

  private _step(description: string, calculation: string, result: number, reasoning: string): SolutionStep {
    return { description, calculation, result, reasoning };
  }

  private _recordHistory(entry: string): void {
    this._history.push(`[${new Date().toISOString()}] ${entry}`);
    if (this._history.length > 500) this._history.shift();
  }

  private _initTypeRules(): void {
    this._typeDetector = [
      { type: 'speed', keywords: ['速度', '路程', '行驶', '出发', '相遇', '追及', '公里', '千米', '米每秒'], hint: '行程问题' },
      { type: 'price', keywords: ['单价', '总价', '元', '角', '分', '买', '卖', '每件'], hint: '价格问题' },
      { type: 'work', keywords: ['工程', '效率', '工作', '完成', '天', '周', '甲乙'], hint: '工程问题' },
      { type: 'concentration', keywords: ['浓度', '溶液', '溶质', '稀释', '盐水', '纯'], hint: '浓度问题' },
      { type: 'ratio', keywords: ['比', '比例', '比值', '分配', '份数'], hint: '比例问题' },
      { type: 'percentage', keywords: ['百分', '%', '增长', '降低', '占'], hint: '百分比问题' },
      { type: 'geometry', keywords: ['面积', '周长', '体积', '三角形', '长方形', '圆', '正方'], hint: '几何问题' },
      { type: 'multiplication', keywords: ['倍', '共', '每组', '每行', '每箱'], hint: '乘法应用' },
      { type: 'division', keywords: ['平均', '每', '分给', '可以分'], hint: '除法应用' },
      { type: 'subtraction', keywords: ['还剩', '少', '差', '比', '拿走'], hint: '减法应用' },
      { type: 'addition', keywords: ['一共', '总共', '合计', '加上', '增加'], hint: '加法应用' },
    ];
  }

  private _guessUnknown(text: string, type: ProblemType): string {
    const lower = text.toLowerCase();
    if (lower.includes('求速度') || type === 'speed') return 'speed';
    if (lower.includes('求时间')) return 'time';
    if (lower.includes('求路程') || lower.includes('求距离')) return 'distance';
    if (lower.includes('求单价')) return 'unitPrice';
    if (lower.includes('求总价')) return 'total';
    if (lower.includes('求数量')) return 'quantity';
    if (type === 'percentage') return 'part';
    if (type === 'ratio') return 'ratio';
    if (type === 'concentration') return 'concentration';
    if (type === 'work') return 'totalWork';
    if (type === 'geometry') return 'area';
    return 'unknown';
  }

  private _simpleOp(values: Map<string, number>, op: string): SolutionStep[] {
    const nums = Array.from(values.values()).filter(v => !isNaN(v));
    if (nums.length < 2) {
      return [this._step(`${op} 运算参数不足`, 'N/A', NaN, '至少需要两个已知量')];
    }
    const a = nums[0];
    const b = nums[1];
    let r: number;
    let calc: string;
    switch (op) {
      case '+': r = a + b; calc = `${a} + ${b}`; break;
      case '-': r = a - b; calc = `${a} - ${b}`; break;
      case '*': r = a * b; calc = `${a} × ${b}`; break;
      case '/': r = b === 0 ? NaN : a / b; calc = `${a} ÷ ${b}`; break;
      default: r = NaN; calc = 'N/A';
    }
    return [this._step(`执行 ${op} 运算`, calc, r, '根据题意对两个已知量进行基础运算')];
  }
}
