/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 公式推导引擎 —— 从已知通向未知的阶梯
 * Formula Derivation Engine: The Ladder from Known to Unknown
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 公式推导是数学思维的最高形式。从勾股定理的拼图证明，
 * 到求根公式的配方法，每一步都是一次思维的飞跃。
 * 规则是它的砖石，变换是它的砂浆，最终筑起的是一座通向真理的塔。
 */

import { DataPacket } from '../shared/types';

export interface Formula {
  readonly id: string;
  readonly name: string;
  readonly expression: string;
  readonly variables: string[];
  readonly domain: string;
  readonly derivation: string;
}

export interface DerivationStep {
  readonly stepNumber: number;
  readonly operation: string;
  readonly from: string;
  readonly to: string;
  readonly rule: string;
  readonly annotation: string;
}

export interface MathRule {
  readonly name: string;
  readonly pattern: string;
  readonly replacement: string;
  readonly condition: string;
}

export class FormulaDerivation {
  private _formulas: Map<string, Formula> = new Map();
  private _rules: MathRule[] = [];
  private _derivations: Map<string, DerivationStep[]> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  constructor() {
    this._initBuiltinRules();
    this._initBuiltinFormulas();
    this._recordHistory('FormulaDerivation engine initialized');
  }

  get formulas(): Formula[] { return Array.from(this._formulas.values()); }
  get rules(): MathRule[] { return [...this._rules]; }
  get history(): string[] { return [...this._history]; }

  /**
   * 注册公式
   * Register a new formula
   */
  registerFormula(formula: Formula): void {
    this._formulas.set(formula.id, formula);
    this._recordHistory(`registerFormula: ${formula.id} (${formula.name})`);
  }

  /**
   * 逐步推导公式
   * Derive a registered formula step by step
   */
  derive(formulaId: string): DerivationStep[] {
    const f = this._formulas.get(formulaId);
    if (!f) {
      this._recordHistory(`derive: formula ${formulaId} not found`);
      return [];
    }
    let steps: DerivationStep[] = [];
    switch (formulaId) {
      case 'pythagorean':
        steps = this.derivePythagorean();
        break;
      case 'quadratic':
        steps = this.deriveQuadraticFormula();
        break;
      case 'distance':
        steps = this.deriveDistanceFormula();
        break;
      case 'midpoint':
        steps = this.deriveMidpointFormula();
        break;
      case 'slope':
        steps = this.deriveSlopeFormula();
        break;
      case 'area-triangle':
        steps = this.deriveArea('triangle');
        break;
      case 'area-rectangle':
        steps = this.deriveArea('rectangle');
        break;
      case 'area-circle':
        steps = this.deriveArea('circle');
        break;
      case 'volume-cube':
        steps = this.deriveVolume('cube');
        break;
      case 'volume-sphere':
        steps = this.deriveVolume('sphere');
        break;
      default:
        steps = [{
          stepNumber: 1,
          operation: 'reference',
          from: '',
          to: f.expression,
          rule: 'direct',
          annotation: `公式 ${f.name} 直接引用，无内建推导`,
        }];
    }
    this._derivations.set(formulaId, steps);
    this._recordHistory(`derive: ${formulaId} → ${steps.length} steps`);
    return steps;
  }

  /**
   * 面积公式推导
   * Derive area formulas
   */
  deriveArea(shape: string): DerivationStep[] {
    const steps: DerivationStep[] = [];
    let n = 0;
    const step = (op: string, from: string, to: string, rule: string, ann: string) => {
      steps.push({ stepNumber: ++n, operation: op, from, to, rule, annotation: ann });
    };
    switch (shape) {
      case 'rectangle':
        step('定义', '长 a，宽 b', '面积 S', '基础定义', '长方形面积定义为长×宽');
        step('计数', '单位正方形网格', 'a 行 × b 列', '计数原理', '在长方形中铺满单位正方形');
        step('结论', 'a × b 个单位正方形', 'S = a × b', '计数等价', '长方形面积 = 长 × 宽');
        break;
      case 'triangle':
        step('构造', '三角形 (底 b, 高 h)', '两个全等三角形拼合', '全等变换', '复制一个全等三角形并翻转');
        step('拼合', '两个三角形', '一个平行四边形', '组合', '底仍为 b，高仍为 h');
        step('引用', '平行四边形面积', 'S_平行四边形 = b × h', '已证公式', '平行四边形面积 = 底 × 高');
        step('结论', 'S_三角形 × 2 = b × h', 'S_三角形 = (1/2) × b × h', '等式两边除以2', '三角形面积 = 底 × 高 ÷ 2');
        break;
      case 'circle':
        step('分割', '圆 (半径 r)', 'n 个等扇形', '极限思想', '将圆等分为 n 个扇形');
        step('重排', 'n 个扇形', '近似矩形', '拼合变换', '交错重排扇形');
        step('取极限', 'n → ∞', '矩形长 = πr, 宽 = r', '极限', '当 n 趋于无穷，近似变为精确');
        step('结论', '矩形面积 = πr × r', 'S = π r²', '矩形面积公式', '圆面积 = π × 半径²');
        break;
      case 'parallelogram':
        step('割补', '平行四边形 (底 b, 高 h)', '矩形', '割补法', '割下一个直角三角形移到另一侧');
        step('结论', '矩形长 b, 宽 h', 'S = b × h', '矩形面积', '平行四边形面积 = 底 × 高');
        break;
      case 'trapezoid':
        step('构造', '梯形 (上底 a, 下底 b, 高 h)', '两个全等梯形拼合', '全等变换', '复制并翻转');
        step('拼合', '两个梯形', '一个平行四边形', '组合', '底为 (a+b), 高为 h');
        step('结论', 'S_梯形 × 2 = (a+b) × h', 'S = (a+b) × h ÷ 2', '除以2', '梯形面积 = (上底+下底) × 高 ÷ 2');
        break;
      default:
        step('unknown', '', '', '', `未识别的图形: ${shape}`);
    }
    return steps;
  }

  /**
   * 体积公式推导
   * Derive volume formulas
   */
  deriveVolume(shape: string): DerivationStep[] {
    const steps: DerivationStep[] = [];
    let n = 0;
    const step = (op: string, from: string, to: string, rule: string, ann: string) => {
      steps.push({ stepNumber: ++n, operation: op, from, to, rule, annotation: ann });
    };
    switch (shape) {
      case 'cube':
        step('定义', '棱长 a', '体积 V', '基础定义', '立方体体积定义为棱长的立方');
        step('计数', '单位立方体网格', 'a × a × a 个单位立方体', '计数原理', '三层堆叠');
        step('结论', 'a³ 个单位立方体', 'V = a³', '计数等价', '立方体体积 = 棱长³');
        break;
      case 'cuboid':
        step('计数', '长 a, 宽 b, 高 c', 'a × b × c 个单位立方体', '计数原理', '长方体堆叠');
        step('结论', 'a × b × c', 'V = a × b × c', '计数等价', '长方体体积 = 长 × 宽 × 高');
        break;
      case 'sphere':
        step('积分', '球体 (半径 r)', 'V = ∫₀ʳ A(h) dh', '卡瓦列里原理', '对高度切片积分');
        step('计算', 'A(h) = π(r² - h²)', 'V = ∫₀ʳ π(r² - h²) dh', '截面面积', '球的截面为圆');
        step('积分计算', 'π [r²h - h³/3]₀ʳ', 'V = π (r³ - r³/3)', '积分公式', '代入上下限');
        step('结论', 'π × (2/3) × r³', 'V = (4/3) π r³', '化简', '球体积 = (4/3) π r³');
        break;
      case 'cylinder':
        step('定义', '底面圆 (半径 r), 高 h', 'V = S_底 × h', '柱体通用公式', '柱体体积 = 底面积 × 高');
        step('代入', 'S_底 = π r²', 'V = π r² × h', '圆面积', '代入底面积');
        step('结论', 'π r² h', 'V = π r² h', '化简', '圆柱体积 = π × 半径² × 高');
        break;
      case 'cone':
        step('构造', '圆锥 (半径 r, 高 h)', 'V = (1/3) × 同底等高圆柱', '卡瓦列里原理', '圆锥体积为同底等高圆柱的1/3');
        step('代入', '圆柱 V = π r² h', 'V = (1/3) × π r² h', '代入', '圆锥体积公式');
        step('结论', '(1/3) π r² h', 'V = (1/3) π r² h', '化简', '圆锥体积 = (1/3) × π × 半径² × 高');
        break;
      default:
        step('unknown', '', '', '', `未识别的立体: ${shape}`);
    }
    return steps;
  }

  /**
   * 勾股定理推导
   * Derive the Pythagorean theorem
   */
  derivePythagorean(): DerivationStep[] {
    const steps: DerivationStep[] = [];
    let n = 0;
    const step = (op: string, from: string, to: string, rule: string, ann: string) => {
      steps.push({ stepNumber: ++n, operation: op, from, to, rule, annotation: ann });
    };
    step('构造', '直角三角形 (两直角边 a, b, 斜边 c)', '边长为 (a+b) 的大正方形', '几何构造', '在大正方形内放置4个全等直角三角形');
    step('面积法', '大正方形面积', '(a+b)²', '面积公式', '大正方形边长为 (a+b)');
    step('展开', '(a+b)²', 'a² + 2ab + b²', '二项式展开', '完全平方公式');
    step('分割', '大正方形', '4 个三角形 + 中间小正方形', '面积分割', '4 个直角三角形面积 = 4 × (1/2)ab = 2ab');
    step('小正方形', '小正方形边长', 'c', '全等三角形', '中间小正方形的边长即为斜边 c');
    step('等式', '(a+b)² = 4 × (1/2)ab + c²', 'a² + 2ab + b² = 2ab + c²', '面积等式', '大正方形 = 三角形 + 小正方形');
    step('结论', 'a² + b² = c²', 'a² + b² = c²', '消去 2ab', '勾股定理：直角边平方和等于斜边平方');
    return steps;
  }

  /**
   * 求根公式推导
   * Derive the quadratic formula
   */
  deriveQuadraticFormula(): DerivationStep[] {
    const steps: DerivationStep[] = [];
    let n = 0;
    const step = (op: string, from: string, to: string, rule: string, ann: string) => {
      steps.push({ stepNumber: ++n, operation: op, from, to, rule, annotation: ann });
    };
    step('起点', 'ax² + bx + c = 0 (a ≠ 0)', '标准二次方程', '给定', '一般形式的一元二次方程');
    step('除以a', 'ax² + bx + c = 0', 'x² + (b/a)x + c/a = 0', '两边同除以a', '将二次项系数化为1');
    step('移常数', 'x² + (b/a)x = -c/a', '常数项移到右边', '移项', '为配方做准备');
    step('配方', 'x² + (b/a)x', '(x + b/(2a))² - b²/(4a²)', '完全平方公式', '左右各加 (b/(2a))²');
    step('代入', '(x + b/(2a))² - b²/(4a²) = -c/a', '(x + b/(2a))² = b²/(4a²) - c/a', '移项', '将常数移到右边');
    step('通分', 'b²/(4a²) - c/a', '(b² - 4ac) / (4a²)', '通分', '统一分母');
    step('开方', '(x + b/(2a))² = (b² - 4ac)/(4a²)', 'x + b/(2a) = ±√(b² - 4ac) / (2a)', '开平方', '对两边开平方');
    step('结论', 'x = -b/(2a) ± √(b² - 4ac) / (2a)', 'x = (-b ± √(b² - 4ac)) / (2a)', '合并分母', '求根公式');
    return steps;
  }

  /**
   * 距离公式推导
   * Derive the distance formula
   */
  deriveDistanceFormula(): DerivationStep[] {
    const steps: DerivationStep[] = [];
    let n = 0;
    const step = (op: string, from: string, to: string, rule: string, ann: string) => {
      steps.push({ stepNumber: ++n, operation: op, from, to, rule, annotation: ann });
    };
    step('给定', '两点 P₁(x₁, y₁), P₂(x₂, y₂)', '求 |P₁P₂|', '问题', '两点间距离');
    step('构造', '两点连线', '直角三角形', '水平/铅垂构造', '水平边长 |x₂-x₁|, 铅垂边长 |y₂-y₁|');
    step('勾股', 'a² + b² = c²', 'd² = (x₂-x₁)² + (y₂-y₁)²', '勾股定理', '应用已证勾股定理');
    step('结论', 'd² = (x₂-x₁)² + (y₂-y₁)²', 'd = √((x₂-x₁)² + (y₂-y₁)²)', '开平方', '两点间距离公式');
    return steps;
  }

  /**
   * 中点公式推导
   * Derive the midpoint formula
   */
  deriveMidpointFormula(): DerivationStep[] {
    const steps: DerivationStep[] = [];
    let n = 0;
    const step = (op: string, from: string, to: string, rule: string, ann: string) => {
      steps.push({ stepNumber: ++n, operation: op, from, to, rule, annotation: ann });
    };
    step('给定', 'P₁(x₁, y₁), P₂(x₂, y₂)', '求中点 M', '问题', '两点的中点');
    step('分量', 'x 方向中点', '(x₁ + x₂) / 2', '平均', 'x 坐标取平均');
    step('分量', 'y 方向中点', '(y₁ + y₂) / 2', '平均', 'y 坐标取平均');
    step('结论', 'M = ((x₁+x₂)/2, (y₁+y₂)/2)', 'M = ((x₁+x₂)/2, (y₁+y₂)/2)', '合成', '中点公式');
    return steps;
  }

  /**
   * 斜率公式推导
   * Derive the slope formula
   */
  deriveSlopeFormula(): DerivationStep[] {
    const steps: DerivationStep[] = [];
    let n = 0;
    const step = (op: string, from: string, to: string, rule: string, ann: string) => {
      steps.push({ stepNumber: ++n, operation: op, from, to, rule, annotation: ann });
    };
    step('给定', 'P₁(x₁, y₁), P₂(x₂, y₂)', '直线斜率 k', '问题', '过两点的直线斜率');
    step('定义', '斜率 = 铅垂变化 / 水平变化', 'k = Δy / Δx', '定义', '斜率的定义');
    step('代入', 'Δy = y₂ - y₁, Δx = x₂ - x₁', 'k = (y₂ - y₁) / (x₂ - x₁)', '代入', '斜率公式');
    step('结论', 'k = (y₂ - y₁) / (x₂ - x₁)', 'k = (y₂ - y₁) / (x₂ - x₁)', '完成', '当 x₂ ≠ x₁ 时成立');
    return steps;
  }

  /**
   * 应用规则变换
   * Apply a rule to an expression
   */
  applyRule(expression: string, rule: MathRule): string {
    try {
      const re = new RegExp(rule.pattern, 'g');
      const out = expression.replace(re, rule.replacement);
      this._recordHistory(`applyRule: ${rule.name} on "${expression}" → "${out}"`);
      return out;
    } catch (e) {
      this._recordHistory(`applyRule: failed ${rule.name} on "${expression}"`);
      return expression;
    }
  }

  /**
   * 化简表达式
   * Simplify an expression by applying all known rules
   */
  simplify(expression: string): string {
    let current = expression;
    let prev = '';
    let guard = 0;
    while (current !== prev && guard++ < 20) {
      prev = current;
      for (const rule of this._rules) {
        current = this.applyRule(current, rule);
      }
    }
    this._recordHistory(`simplify: "${expression}" → "${current}"`);
    return current;
  }

  /**
   * 获取公式
   * Look up a formula by name (case-insensitive)
   */
  getFormula(name: string): Formula | null {
    const lower = name.toLowerCase();
    for (const f of this._formulas.values()) {
      if (f.name.toLowerCase() === lower || f.id === name) return f;
    }
    return null;
  }

  /**
   * 序列化为 DataPacket
   * Serialize to DataPacket
   */
  toPacket(): DataPacket<{ formulas: Formula[]; derivations: Record<string, DerivationStep[]> }> {
    const derivations: Record<string, DerivationStep[]> = {};
    this._derivations.forEach((v, k) => { derivations[k] = v; });
    const packet: DataPacket<{ formulas: Formula[]; derivations: Record<string, DerivationStep[]> }> = {
      id: `formula-deriv-${(++this._counter).toString(36)}`,
      payload: { formulas: this.formulas, derivations },
      metadata: {
        createdAt: Date.now(),
        route: ['primary_math', 'FormulaDerivation'],
        priority: 2,
        phase: 'formula-derivation',
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
    this._formulas.clear();
    this._derivations.clear();
    this._history = [];
    this._counter = 0;
    this._initBuiltinRules();
    this._initBuiltinFormulas();
    this._recordHistory('FormulaDerivation engine reset');
  }

  // ─────────────── private helpers ───────────────

  private _recordHistory(entry: string): void {
    this._history.push(`[${new Date().toISOString()}] ${entry}`);
    if (this._history.length > 500) this._history.shift();
  }

  private _initBuiltinRules(): void {
    this._rules = [
      { name: 'combine-like-terms', pattern: '(\\d+)x\\s*\\+\\s*(\\d+)x', replacement: '${1+2}x', condition: '同类项合并' },
      { name: 'multiply-by-one', pattern: '1\\s*\\*\\s*([a-zA-Z0-9]+)', replacement: '$1', condition: '乘以1不变' },
      { name: 'add-zero', pattern: '\\s*\\+\\s*0\\b', replacement: '', condition: '加0不变' },
      { name: 'double-negative', pattern: '--', replacement: '+', condition: '负负得正' },
      { name: 'power-zero', pattern: '([a-zA-Z0-9_]+)\\^0', replacement: '1', condition: '零次幂为1' },
      { name: 'power-one', pattern: '([a-zA-Z0-9_]+)\\^1', replacement: '$1', condition: '一次幂不变' },
      { name: 'multiply-zero', pattern: '0\\s*\\*\\s*[a-zA-Z0-9_]+', replacement: '0', condition: '零乘任何数为零' },
    ];
  }

  private _initBuiltinFormulas(): void {
    const formulas: Formula[] = [
      { id: 'pythagorean', name: '勾股定理', expression: 'a² + b² = c²', variables: ['a', 'b', 'c'], domain: '直角三角形', derivation: '面积拼合法' },
      { id: 'quadratic', name: '求根公式', expression: 'x = (-b ± √(b² - 4ac)) / (2a)', variables: ['a', 'b', 'c', 'x'], domain: 'a ≠ 0', derivation: '配方法' },
      { id: 'distance', name: '两点距离公式', expression: 'd = √((x₂-x₁)² + (y₂-y₁)²)', variables: ['x₁', 'y₁', 'x₂', 'y₂', 'd'], domain: '平面直角坐标系', derivation: '勾股定理推论' },
      { id: 'midpoint', name: '中点公式', expression: 'M = ((x₁+x₂)/2, (y₁+y₂)/2)', variables: ['x₁', 'y₁', 'x₂', 'y₂', 'M'], domain: '平面直角坐标系', derivation: '坐标平均' },
      { id: 'slope', name: '斜率公式', expression: 'k = (y₂ - y₁) / (x₂ - x₁)', variables: ['x₁', 'y₁', 'x₂', 'y₂', 'k'], domain: 'x₂ ≠ x₁', derivation: '定义法' },
      { id: 'area-triangle', name: '三角形面积', expression: 'S = (1/2) × b × h', variables: ['b', 'h', 'S'], domain: '任意三角形', derivation: '拼合法' },
      { id: 'area-rectangle', name: '长方形面积', expression: 'S = a × b', variables: ['a', 'b', 'S'], domain: '长方形', derivation: '计数法' },
      { id: 'area-circle', name: '圆面积', expression: 'S = π r²', variables: ['r', 'S'], domain: '圆', derivation: '极限分割法' },
      { id: 'volume-cube', name: '立方体体积', expression: 'V = a³', variables: ['a', 'V'], domain: '立方体', derivation: '计数法' },
      { id: 'volume-sphere', name: '球体积', expression: 'V = (4/3) π r³', variables: ['r', 'V'], domain: '球体', derivation: '积分法' },
    ];
    for (const f of formulas) this._formulas.set(f.id, f);
  }
}
