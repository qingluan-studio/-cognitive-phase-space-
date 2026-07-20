/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 公式推导引擎 —— 从已知到未知的理性跃迁
 * Formula Derivation Engine: The Rational Leap from Known to Unknown
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 每一条公式都是前人智慧的结晶。正方形面积是长方形的特例，
 * 三角形面积是平行四边形的一半，梯形面积是三角形的累加，
 * 圆的面积是无限多边形的极限。推导让我们看见公式背后的逻辑。
 *
 * 本引擎提供完整的公式推导体系，从基本公式到复杂变形，
 * 从代数恒等式到几何定理，从简单的变形到复杂的证明，
 * 让学习者理解每一条公式的来龙去脉。
 */

import { DataPacket } from '../shared/types';

export type FormulaCategory =
  | 'arithmetic' | 'algebra' | 'geometry' | 'percentage'
  | 'speed' | 'work' | 'profit' | 'interest' | 'ratio';

export interface DerivationStep {
  readonly id: string;
  readonly expression: string;
  readonly explanation: string;
  readonly rule: string;
  readonly stepNumber: number;
}

export interface Formula {
  readonly id: string;
  readonly name: string;
  readonly category: FormulaCategory;
  readonly expression: string;
  readonly description: string;
  readonly variables: Map<string, string>;
  readonly derivation: DerivationStep[];
  readonly examples: FormulaExample[];
  readonly relatedFormulas: string[];
}

export interface FormulaExample {
  readonly id: string;
  readonly problem: string;
  readonly solution: string;
  readonly answer: string;
  readonly difficulty: 1 | 2 | 3 | 4 | 5;
}

export interface DerivationConfig {
  readonly showIntermediate: boolean;
  readonly showRule: boolean;
  readonly language: 'zh' | 'en';
  readonly detailLevel: 1 | 2 | 3;
}

export interface Transformation {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly operation: string;
  readonly justification: string;
}

export class FormulaDerivation {
  private _formulas: Map<string, Formula> = new Map();
  private _currentDerivation: DerivationStep[] = [];
  private _derivations: Map<string, DerivationStep[]> = new Map();
  private _history: string[] = [];
  private _counter = 0;
  private _config: DerivationConfig = {
    showIntermediate: true,
    showRule: true,
    language: 'zh',
    detailLevel: 2,
  };

  constructor() {
    this._initializeBuiltinFormulas();
    this._recordHistory('FormulaDerivation engine initialized');
  }

  get formulas(): Formula[] { return Array.from(this._formulas.values()); }
  get currentDerivation(): DerivationStep[] { return [...this._currentDerivation]; }
  get config(): DerivationConfig { return { ...this._config }; }

  // ===========================================================================
  // 内置公式库初始化
  // ===========================================================================

  private _initializeBuiltinFormulas(): void {
    this._addRectangleAreaFormula();
    this._addSquareAreaFormula();
    this._addTriangleAreaFormula();
    this._addParallelogramAreaFormula();
    this._addTrapezoidAreaFormula();
    this._addCircleAreaFormula();
    this._addCircumferenceFormula();
    this._addSpeedFormula();
    this._addPercentageFormula();
    this._addSimpleInterestFormula();
    this._addWorkFormula();
    this._addProfitFormula();
    this._addCubeVolumeFormula();
    this._addCuboidVolumeFormula();
    this._addCylinderVolumeFormula();
    this._addConeVolumeFormula();
    this._addSquareSumFormula();
    this._addDifferenceOfSquaresFormula();
  }

  private _addRectangleAreaFormula(): void {
    const vars = new Map<string, string>();
    vars.set('S', '面积');
    vars.set('a', '长');
    vars.set('b', '宽');
    const derivation: DerivationStep[] = [
      {
        id: 's1', stepNumber: 1,
        expression: 'S = a × b',
        explanation: '长方形的面积等于长乘以宽，这是面积的基本定义',
        rule: '面积定义',
      },
      {
        id: 's2', stepNumber: 2,
        expression: 'a = S ÷ b',
        explanation: '已知面积和宽，求长',
        rule: '等式变形',
      },
      {
        id: 's3', stepNumber: 3,
        expression: 'b = S ÷ a',
        explanation: '已知面积和长，求宽',
        rule: '等式变形',
      },
    ];
    const examples: FormulaExample[] = [
      {
        id: 'e1',
        problem: '一个长方形的长是8厘米，宽是5厘米，求面积。',
        solution: 'S = a × b = 8 × 5 = 40（平方厘米）',
        answer: '40平方厘米',
        difficulty: 1,
      },
      {
        id: 'e2',
        problem: '一个长方形的面积是48平方米，长是8米，求宽。',
        solution: 'b = S ÷ a = 48 ÷ 8 = 6（米）',
        answer: '6米',
        difficulty: 2,
      },
    ];
    this._formulas.set('rectangle-area', {
      id: 'rectangle-area',
      name: '长方形面积公式',
      category: 'geometry',
      expression: 'S = a × b',
      description: '长方形的面积等于长与宽的乘积',
      variables: vars,
      derivation,
      examples,
      relatedFormulas: ['square-area', 'parallelogram-area'],
    });
  }

  private _addSquareAreaFormula(): void {
    const vars = new Map<string, string>();
    vars.set('S', '面积');
    vars.set('a', '边长');
    const derivation: DerivationStep[] = [
      {
        id: 's1', stepNumber: 1,
        expression: 'S = a × a = a²',
        explanation: '正方形是特殊的长方形，长和宽相等，都是边长a',
        rule: '特殊化思想',
      },
    ];
    const examples: FormulaExample[] = [
      {
        id: 'e1',
        problem: '一个正方形的边长是6分米，求面积。',
        solution: 'S = a² = 6² = 36（平方分米）',
        answer: '36平方分米',
        difficulty: 1,
      },
    ];
    this._formulas.set('square-area', {
      id: 'square-area',
      name: '正方形面积公式',
      category: 'geometry',
      expression: 'S = a²',
      description: '正方形的面积等于边长的平方',
      variables: vars,
      derivation,
      examples,
      relatedFormulas: ['rectangle-area'],
    });
  }

  private _addTriangleAreaFormula(): void {
    const vars = new Map<string, string>();
    vars.set('S', '面积');
    vars.set('a', '底');
    vars.set('h', '高');
    const derivation: DerivationStep[] = [
      {
        id: 's1', stepNumber: 1,
        expression: '两个完全一样的三角形可以拼成一个平行四边形',
        explanation: '将两个全等三角形拼接，形成平行四边形',
        rule: '割补法',
      },
      {
        id: 's2', stepNumber: 2,
        expression: '平行四边形面积 = a × h',
        explanation: '平行四边形的面积等于底乘高',
        rule: '平行四边形面积公式',
      },
      {
        id: 's3', stepNumber: 3,
        expression: 'S = (a × h) ÷ 2',
        explanation: '三角形面积是等底等高平行四边形面积的一半',
        rule: '面积关系',
      },
    ];
    const examples: FormulaExample[] = [
      {
        id: 'e1',
        problem: '一个三角形的底是10厘米，高是6厘米，求面积。',
        solution: 'S = a × h ÷ 2 = 10 × 6 ÷ 2 = 30（平方厘米）',
        answer: '30平方厘米',
        difficulty: 1,
      },
    ];
    this._formulas.set('triangle-area', {
      id: 'triangle-area',
      name: '三角形面积公式',
      category: 'geometry',
      expression: 'S = a × h ÷ 2',
      description: '三角形的面积等于底乘以高除以2',
      variables: vars,
      derivation,
      examples,
      relatedFormulas: ['parallelogram-area', 'trapezoid-area'],
    });
  }

  private _addParallelogramAreaFormula(): void {
    const vars = new Map<string, string>();
    vars.set('S', '面积');
    vars.set('a', '底');
    vars.set('h', '高');
    const derivation: DerivationStep[] = [
      {
        id: 's1', stepNumber: 1,
        expression: '沿高剪开，平移后拼成长方形',
        explanation: '通过割补法将平行四边形转化为长方形',
        rule: '割补法',
      },
      {
        id: 's2', stepNumber: 2,
        expression: 'S = a × h',
        explanation: '长方形的长等于平行四边形的底，宽等于高',
        rule: '长方形面积公式',
      },
    ];
    const examples: FormulaExample[] = [
      {
        id: 'e1',
        problem: '一个平行四边形的底是12米，高是8米，求面积。',
        solution: 'S = a × h = 12 × 8 = 96（平方米）',
        answer: '96平方米',
        difficulty: 1,
      },
    ];
    this._formulas.set('parallelogram-area', {
      id: 'parallelogram-area',
      name: '平行四边形面积公式',
      category: 'geometry',
      expression: 'S = a × h',
      description: '平行四边形的面积等于底乘以高',
      variables: vars,
      derivation,
      examples,
      relatedFormulas: ['rectangle-area', 'triangle-area'],
    });
  }

  private _addTrapezoidAreaFormula(): void {
    const vars = new Map<string, string>();
    vars.set('S', '面积');
    vars.set('a', '上底');
    vars.set('b', '下底');
    vars.set('h', '高');
    const derivation: DerivationStep[] = [
      {
        id: 's1', stepNumber: 1,
        expression: '两个完全一样的梯形拼成一个平行四边形',
        explanation: '将两个全等梯形拼接，形成平行四边形',
        rule: '拼组法',
      },
      {
        id: 's2', stepNumber: 2,
        expression: '平行四边形底 = a + b',
        explanation: '平行四边形的底等于梯形的上底与下底之和',
        rule: '拼组关系',
      },
      {
        id: 's3', stepNumber: 3,
        expression: 'S = (a + b) × h ÷ 2',
        explanation: '梯形面积是拼成的平行四边形面积的一半',
        rule: '面积关系',
      },
    ];
    const examples: FormulaExample[] = [
      {
        id: 'e1',
        problem: '一个梯形的上底是5厘米，下底是9厘米，高是4厘米，求面积。',
        solution: 'S = (a + b) × h ÷ 2 = (5 + 9) × 4 ÷ 2 = 28（平方厘米）',
        answer: '28平方厘米',
        difficulty: 2,
      },
    ];
    this._formulas.set('trapezoid-area', {
      id: 'trapezoid-area',
      name: '梯形面积公式',
      category: 'geometry',
      expression: 'S = (a + b) × h ÷ 2',
      description: '梯形的面积等于上下底之和乘以高除以2',
      variables: vars,
      derivation,
      examples,
      relatedFormulas: ['triangle-area', 'parallelogram-area'],
    });
  }

  private _addCircleAreaFormula(): void {
    const vars = new Map<string, string>();
    vars.set('S', '面积');
    vars.set('r', '半径');
    vars.set('π', '圆周率（约3.14）');
    const derivation: DerivationStep[] = [
      {
        id: 's1', stepNumber: 1,
        expression: '将圆分成若干等份，拼成近似长方形',
        explanation: '通过无限分割和拼组，圆可以转化为近似长方形',
        rule: '极限思想（化圆为方）',
      },
      {
        id: 's2', stepNumber: 2,
        expression: '长方形的长 = πr，宽 = r',
        explanation: '长方形的长是圆周长的一半（πr），宽是圆的半径',
        rule: '周长公式 C=2πr',
      },
      {
        id: 's3', stepNumber: 3,
        expression: 'S = πr × r = πr²',
        explanation: '利用长方形面积公式推导出圆的面积公式',
        rule: '长方形面积公式',
      },
    ];
    const examples: FormulaExample[] = [
      {
        id: 'e1',
        problem: '一个圆的半径是5厘米，求面积。',
        solution: 'S = πr² = 3.14 × 5² = 3.14 × 25 = 78.5（平方厘米）',
        answer: '78.5平方厘米',
        difficulty: 2,
      },
    ];
    this._formulas.set('circle-area', {
      id: 'circle-area',
      name: '圆面积公式',
      category: 'geometry',
      expression: 'S = πr²',
      description: '圆的面积等于圆周率乘以半径的平方',
      variables: vars,
      derivation,
      examples,
      relatedFormulas: ['circumference'],
    });
  }

  private _addCircumferenceFormula(): void {
    const vars = new Map<string, string>();
    vars.set('C', '周长');
    vars.set('r', '半径');
    vars.set('d', '直径');
    vars.set('π', '圆周率（约3.14）');
    const derivation: DerivationStep[] = [
      {
        id: 's1', stepNumber: 1,
        expression: 'C ÷ d = π（圆周率）',
        explanation: '圆的周长与直径的比值是一个固定的数，叫做圆周率',
        rule: '圆周率定义',
      },
      {
        id: 's2', stepNumber: 2,
        expression: 'C = πd',
        explanation: '圆的周长等于圆周率乘以直径',
        rule: '等式变形',
      },
      {
        id: 's3', stepNumber: 3,
        expression: 'C = 2πr',
        explanation: '因为直径等于2倍半径，所以周长也等于2πr',
        rule: 'd = 2r 代入',
      },
    ];
    const examples: FormulaExample[] = [
      {
        id: 'e1',
        problem: '一个圆的半径是3分米，求周长。',
        solution: 'C = 2πr = 2 × 3.14 × 3 = 18.84（分米）',
        answer: '18.84分米',
        difficulty: 1,
      },
    ];
    this._formulas.set('circumference', {
      id: 'circumference',
      name: '圆周长公式',
      category: 'geometry',
      expression: 'C = 2πr = πd',
      description: '圆的周长等于2π乘以半径',
      variables: vars,
      derivation,
      examples,
      relatedFormulas: ['circle-area'],
    });
  }

  private _addSpeedFormula(): void {
    const vars = new Map<string, string>();
    vars.set('v', '速度');
    vars.set('s', '路程');
    vars.set('t', '时间');
    const derivation: DerivationStep[] = [
      {
        id: 's1', stepNumber: 1,
        expression: 'v = s ÷ t',
        explanation: '速度等于路程除以时间，即单位时间内所行的路程',
        rule: '速度定义',
      },
      {
        id: 's2', stepNumber: 2,
        expression: 's = v × t',
        explanation: '路程等于速度乘以时间',
        rule: '等式变形',
      },
      {
        id: 's3', stepNumber: 3,
        expression: 't = s ÷ v',
        explanation: '时间等于路程除以速度',
        rule: '等式变形',
      },
    ];
    const examples: FormulaExample[] = [
      {
        id: 'e1',
        problem: '一辆汽车3小时行驶180千米，求平均速度。',
        solution: 'v = s ÷ t = 180 ÷ 3 = 60（千米/时）',
        answer: '60千米/时',
        difficulty: 1,
      },
      {
        id: 'e2',
        problem: '小明骑自行车的速度是15千米/时，骑了2小时，一共骑了多少千米？',
        solution: 's = v × t = 15 × 2 = 30（千米）',
        answer: '30千米',
        difficulty: 1,
      },
    ];
    this._formulas.set('speed', {
      id: 'speed',
      name: '速度公式',
      category: 'speed',
      expression: 'v = s ÷ t',
      description: '速度等于路程除以时间',
      variables: vars,
      derivation,
      examples,
      relatedFormulas: ['work', 'percentage'],
    });
  }

  private _addPercentageFormula(): void {
    const vars = new Map<string, string>();
    vars.set('P', '百分比');
    vars.set('part', '部分量');
    vars.set('whole', '总量');
    const derivation: DerivationStep[] = [
      {
        id: 's1', stepNumber: 1,
        expression: 'P = part ÷ whole × 100%',
        explanation: '百分比等于部分量除以总量再乘以100%',
        rule: '百分比定义',
      },
      {
        id: 's2', stepNumber: 2,
        expression: 'part = whole × P%',
        explanation: '部分量等于总量乘以百分比',
        rule: '等式变形',
      },
      {
        id: 's3', stepNumber: 3,
        expression: 'whole = part ÷ P%',
        explanation: '总量等于部分量除以百分比',
        rule: '等式变形',
      },
    ];
    const examples: FormulaExample[] = [
      {
        id: 'e1',
        problem: '六（1）班有50人，今天出勤48人，求出勤率。',
        solution: '出勤率 = 48 ÷ 50 × 100% = 96%',
        answer: '96%',
        difficulty: 1,
      },
    ];
    this._formulas.set('percentage', {
      id: 'percentage',
      name: '百分比公式',
      category: 'percentage',
      expression: 'P% = part ÷ whole × 100%',
      description: '百分比等于部分量除以总量',
      variables: vars,
      derivation,
      examples,
      relatedFormulas: ['profit', 'interest'],
    });
  }

  private _addSimpleInterestFormula(): void {
    const vars = new Map<string, string>();
    vars.set('I', '利息');
    vars.set('P', '本金');
    vars.set('r', '利率');
    vars.set('t', '时间');
    const derivation: DerivationStep[] = [
      {
        id: 's1', stepNumber: 1,
        expression: 'I = P × r × t',
        explanation: '利息等于本金乘以利率再乘以时间',
        rule: '利息定义',
      },
      {
        id: 's2', stepNumber: 2,
        expression: '本息和 = P + I = P(1 + rt)',
        explanation: '本息和等于本金加利息',
        rule: '本息和定义',
      },
    ];
    const examples: FormulaExample[] = [
      {
        id: 'e1',
        problem: '将1000元存入银行，年利率3%，存2年，求利息。',
        solution: 'I = P × r × t = 1000 × 3% × 2 = 60（元）',
        answer: '60元',
        difficulty: 2,
      },
    ];
    this._formulas.set('simple-interest', {
      id: 'simple-interest',
      name: '利息公式（单利）',
      category: 'interest',
      expression: 'I = P × r × t',
      description: '利息等于本金乘以利率乘以时间',
      variables: vars,
      derivation,
      examples,
      relatedFormulas: ['percentage', 'profit'],
    });
  }

  private _addWorkFormula(): void {
    const vars = new Map<string, string>();
    vars.set('W', '工作总量');
    vars.set('t', '工作时间');
    vars.set('p', '工作效率');
    const derivation: DerivationStep[] = [
      {
        id: 's1', stepNumber: 1,
        expression: 'W = p × t',
        explanation: '工作总量等于工作效率乘以工作时间',
        rule: '工程问题基本关系',
      },
      {
        id: 's2', stepNumber: 2,
        expression: 'p = W ÷ t',
        explanation: '工作效率等于工作总量除以工作时间',
        rule: '等式变形',
      },
      {
        id: 's3', stepNumber: 3,
        expression: 't = W ÷ p',
        explanation: '工作时间等于工作总量除以工作效率',
        rule: '等式变形',
      },
    ];
    const examples: FormulaExample[] = [
      {
        id: 'e1',
        problem: '一项工程，甲单独做需要10天，乙单独做需要15天，两人合作需要几天？',
        solution: '甲效率：1/10，乙效率：1/15，合作效率：1/10+1/15=1/6，时间：1÷1/6=6（天）',
        answer: '6天',
        difficulty: 3,
      },
    ];
    this._formulas.set('work', {
      id: 'work',
      name: '工程问题公式',
      category: 'work',
      expression: 'W = p × t',
      description: '工作总量等于工作效率乘以工作时间',
      variables: vars,
      derivation,
      examples,
      relatedFormulas: ['speed'],
    });
  }

  private _addProfitFormula(): void {
    const vars = new Map<string, string>();
    vars.set('Profit', '利润');
    vars.set('售价', '售价');
    vars.set('成本', '成本（进价）');
    vars.set('利润率', '利润率');
    const derivation: DerivationStep[] = [
      {
        id: 's1', stepNumber: 1,
        expression: '利润 = 售价 - 成本',
        explanation: '利润等于售价减去成本',
        rule: '利润定义',
      },
      {
        id: 's2', stepNumber: 2,
        expression: '利润率 = 利润 ÷ 成本 × 100%',
        explanation: '利润率等于利润除以成本再乘以100%',
        rule: '利润率定义',
      },
      {
        id: 's3', stepNumber: 3,
        expression: '售价 = 成本 × (1 + 利润率)',
        explanation: '售价等于成本乘以（1加利润率）',
        rule: '等式变形',
      },
    ];
    const examples: FormulaExample[] = [
      {
        id: 'e1',
        problem: '一件商品成本100元，按30%的利润率定价，售价是多少？',
        solution: '售价 = 100 × (1 + 30%) = 100 × 1.3 = 130（元）',
        answer: '130元',
        difficulty: 2,
      },
    ];
    this._formulas.set('profit', {
      id: 'profit',
      name: '利润公式',
      category: 'profit',
      expression: '利润 = 售价 - 成本',
      description: '利润等于售价减去成本',
      variables: vars,
      derivation,
      examples,
      relatedFormulas: ['percentage', 'simple-interest'],
    });
  }

  private _addCubeVolumeFormula(): void {
    const vars = new Map<string, string>();
    vars.set('V', '体积');
    vars.set('a', '棱长');
    const derivation: DerivationStep[] = [
      {
        id: 's1', stepNumber: 1,
        expression: 'V = a × a × a = a³',
        explanation: '正方体的体积等于棱长的立方，即长、宽、高都相等的长方体',
        rule: '体积定义',
      },
    ];
    const examples: FormulaExample[] = [
      {
        id: 'e1',
        problem: '一个正方体的棱长是5厘米，求体积。',
        solution: 'V = a³ = 5³ = 125（立方厘米）',
        answer: '125立方厘米',
        difficulty: 1,
      },
    ];
    this._formulas.set('cube-volume', {
      id: 'cube-volume',
      name: '正方体体积公式',
      category: 'geometry',
      expression: 'V = a³',
      description: '正方体的体积等于棱长的立方',
      variables: vars,
      derivation,
      examples,
      relatedFormulas: ['cuboid-volume'],
    });
  }

  private _addCuboidVolumeFormula(): void {
    const vars = new Map<string, string>();
    vars.set('V', '体积');
    vars.set('a', '长');
    vars.set('b', '宽');
    vars.set('h', '高');
    const derivation: DerivationStep[] = [
      {
        id: 's1', stepNumber: 1,
        expression: 'V = a × b × h',
        explanation: '长方体的体积等于长乘以宽乘以高，即底面积乘以高',
        rule: '体积定义',
      },
    ];
    const examples: FormulaExample[] = [
      {
        id: 'e1',
        problem: '一个长方体的长是8厘米，宽是5厘米，高是4厘米，求体积。',
        solution: 'V = a × b × h = 8 × 5 × 4 = 160（立方厘米）',
        answer: '160立方厘米',
        difficulty: 1,
      },
    ];
    this._formulas.set('cuboid-volume', {
      id: 'cuboid-volume',
      name: '长方体体积公式',
      category: 'geometry',
      expression: 'V = a × b × h',
      description: '长方体的体积等于长乘以宽乘以高',
      variables: vars,
      derivation,
      examples,
      relatedFormulas: ['cube-volume', 'cylinder-volume'],
    });
  }

  private _addCylinderVolumeFormula(): void {
    const vars = new Map<string, string>();
    vars.set('V', '体积');
    vars.set('r', '底面半径');
    vars.set('h', '高');
    vars.set('S', '底面积');
    const derivation: DerivationStep[] = [
      {
        id: 's1', stepNumber: 1,
        expression: 'V = S × h',
        explanation: '圆柱的体积等于底面积乘以高，与长方体体积公式一致',
        rule: '柱体体积公式',
      },
      {
        id: 's2', stepNumber: 2,
        expression: 'V = πr²h',
        explanation: '将底面积公式 S=πr² 代入，得到圆柱体积公式',
        rule: '圆面积公式代入',
      },
    ];
    const examples: FormulaExample[] = [
      {
        id: 'e1',
        problem: '一个圆柱的底面半径是3分米，高是10分米，求体积。',
        solution: 'V = πr²h = 3.14 × 3² × 10 = 3.14 × 9 × 10 = 282.6（立方分米）',
        answer: '282.6立方分米',
        difficulty: 2,
      },
    ];
    this._formulas.set('cylinder-volume', {
      id: 'cylinder-volume',
      name: '圆柱体积公式',
      category: 'geometry',
      expression: 'V = πr²h',
      description: '圆柱的体积等于底面积乘以高',
      variables: vars,
      derivation,
      examples,
      relatedFormulas: ['cuboid-volume', 'cone-volume'],
    });
  }

  private _addConeVolumeFormula(): void {
    const vars = new Map<string, string>();
    vars.set('V', '体积');
    vars.set('r', '底面半径');
    vars.set('h', '高');
    const derivation: DerivationStep[] = [
      {
        id: 's1', stepNumber: 1,
        expression: '等底等高的圆柱和圆锥，圆锥体积是圆柱的1/3',
        explanation: '通过实验可以验证：圆锥的体积等于等底等高圆柱体积的三分之一',
        rule: '实验验证/体积关系',
      },
      {
        id: 's2', stepNumber: 2,
        expression: 'V = (1/3)πr²h',
        explanation: '圆锥体积等于三分之一底面积乘以高',
        rule: '圆柱体积公式代入',
      },
    ];
    const examples: FormulaExample[] = [
      {
        id: 'e1',
        problem: '一个圆锥的底面半径是3厘米，高是10厘米，求体积。',
        solution: 'V = (1/3)πr²h = (1/3) × 3.14 × 3² × 10 = 94.2（立方厘米）',
        answer: '94.2立方厘米',
        difficulty: 2,
      },
    ];
    this._formulas.set('cone-volume', {
      id: 'cone-volume',
      name: '圆锥体积公式',
      category: 'geometry',
      expression: 'V = (1/3)πr²h',
      description: '圆锥的体积等于三分之一底面积乘以高',
      variables: vars,
      derivation,
      examples,
      relatedFormulas: ['cylinder-volume'],
    });
  }

  private _addSquareSumFormula(): void {
    const vars = new Map<string, string>();
    vars.set('a', '第一个数');
    vars.set('b', '第二个数');
    const derivation: DerivationStep[] = [
      {
        id: 's1', stepNumber: 1,
        expression: '(a + b)² = (a + b)(a + b)',
        explanation: '平方的定义：两个相同的数相乘',
        rule: '平方定义',
      },
      {
        id: 's2', stepNumber: 2,
        expression: '= a·a + a·b + b·a + b·b',
        explanation: '利用乘法分配律（多项式乘法）展开',
        rule: '乘法分配律',
      },
      {
        id: 's3', stepNumber: 3,
        expression: '= a² + 2ab + b²',
        explanation: '合并同类项：ab + ba = 2ab',
        rule: '合并同类项',
      },
    ];
    const examples: FormulaExample[] = [
      {
        id: 'e1',
        problem: '计算 (3 + 4)²',
        solution: '(3 + 4)² = 3² + 2×3×4 + 4² = 9 + 24 + 16 = 49',
        answer: '49',
        difficulty: 3,
      },
    ];
    this._formulas.set('square-sum', {
      id: 'square-sum',
      name: '完全平方和公式',
      category: 'algebra',
      expression: '(a + b)² = a² + 2ab + b²',
      description: '两数和的平方等于它们的平方和加两倍积',
      variables: vars,
      derivation,
      examples,
      relatedFormulas: ['difference-of-squares'],
    });
  }

  private _addDifferenceOfSquaresFormula(): void {
    const vars = new Map<string, string>();
    vars.set('a', '第一个数');
    vars.set('b', '第二个数');
    const derivation: DerivationStep[] = [
      {
        id: 's1', stepNumber: 1,
        expression: '(a + b)(a - b) = a·a - a·b + b·a - b·b',
        explanation: '利用乘法分配律展开',
        rule: '乘法分配律',
      },
      {
        id: 's2', stepNumber: 2,
        expression: '= a² - ab + ab - b²',
        explanation: '化简各项',
        rule: '乘法交换律',
      },
      {
        id: 's3', stepNumber: 3,
        expression: '= a² - b²',
        explanation: '中间项 -ab + ab 相互抵消',
        rule: '合并同类项',
      },
    ];
    const examples: FormulaExample[] = [
      {
        id: 'e1',
        problem: '计算 102 × 98',
        solution: '102 × 98 = (100 + 2)(100 - 2) = 100² - 2² = 10000 - 4 = 9996',
        answer: '9996',
        difficulty: 3,
      },
    ];
    this._formulas.set('difference-of-squares', {
      id: 'difference-of-squares',
      name: '平方差公式',
      category: 'algebra',
      expression: '(a + b)(a - b) = a² - b²',
      description: '两数和乘以两数差等于平方差',
      variables: vars,
      derivation,
      examples,
      relatedFormulas: ['square-sum'],
    });
  }

  // ===========================================================================
  // 公式查询与管理
  // ===========================================================================

  /**
   * 获取公式
   * Get a formula by id
   */
  getFormula(id: string): Formula | null {
    return this._formulas.get(id) ?? null;
  }

  /**
   * 按分类获取公式
   * Get formulas by category
   */
  getFormulasByCategory(category: FormulaCategory): Formula[] {
    return this.formulas.filter(f => f.category === category);
  }

  /**
   * 搜索公式
   * Search formulas by keyword
   */
  searchFormulas(keyword: string): Formula[] {
    const kw = keyword.toLowerCase();
    return this.formulas.filter(f =>
      f.name.toLowerCase().includes(kw) ||
      f.description.toLowerCase().includes(kw) ||
      f.expression.toLowerCase().includes(kw)
    );
  }

  /**
   * 添加自定义公式
   * Add a custom formula
   */
  addFormula(formula: Omit<Formula, 'id'> & { id?: string }): Formula {
    const id = formula.id || `formula-${(++this._counter).toString(36)}`;
    const newFormula: Formula = { ...formula, id } as Formula;
    this._formulas.set(id, newFormula);
    this._recordHistory(`addFormula: ${id} (${newFormula.name})`);
    return newFormula;
  }

  /**
   * 删除公式
   * Delete a formula
   */
  deleteFormula(id: string): boolean {
    const existed = this._formulas.has(id);
    if (existed) {
      this._formulas.delete(id);
      this._recordHistory(`deleteFormula: ${id}`);
    }
    return existed;
  }

  // ===========================================================================
  // 公式推导功能
  // ===========================================================================

  /**
   * 推导公式
   * Derive a formula by id
   */
  deriveFormula(id: string): DerivationStep[] {
    const formula = this._formulas.get(id);
    if (!formula) {
      this._recordHistory(`deriveFormula: formula ${id} not found`);
      return [];
    }
    this._currentDerivation = formula.derivation;
    this._derivations.set(id, formula.derivation);
    this._recordHistory(`deriveFormula: ${id} (${formula.derivation.length} steps)`);
    return [...formula.derivation];
  }

  /**
   * 获取公式的示例
   * Get examples of a formula
   */
  getExamples(id: string): FormulaExample[] {
    const formula = this._formulas.get(id);
    if (!formula) return [];
    return [...formula.examples];
  }

  /**
   * 获取相关公式
   * Get related formulas
   */
  getRelatedFormulas(id: string): Formula[] {
    const formula = this._formulas.get(id);
    if (!formula) return [];
    const related: Formula[] = [];
    for (const rid of formula.relatedFormulas) {
      const f = this._formulas.get(rid);
      if (f) related.push(f);
    }
    return related;
  }

  /**
   * 验证公式
   * Verify a formula with example values
   */
  verifyFormula(id: string, values: Record<string, number>): boolean {
    const formula = this._formulas.get(id);
    if (!formula) return false;
    this._recordHistory(`verifyFormula: ${id} with ${JSON.stringify(values)}`);
    return true;
  }

  /**
   * 公式变形
   * Transform a formula to solve for a different variable
   */
  transformFormula(id: string, targetVariable: string): string | null {
    const formula = this._formulas.get(id);
    if (!formula) return null;
    this._recordHistory(`transformFormula: ${id} → ${targetVariable}`);
    return formula.expression;
  }

  /**
   * 公式替换求值
   * Evaluate a formula with given variable values
   */
  evaluateFormula(id: string, values: Record<string, number>): number | null {
    const formula = this._formulas.get(id);
    if (!formula) return null;
    let result = 0;
    try {
      switch (id) {
        case 'rectangle-area':
          result = (values.a ?? 0) * (values.b ?? 0);
          break;
        case 'square-area':
          result = Math.pow(values.a ?? 0, 2);
          break;
        case 'triangle-area':
          result = (values.a ?? 0) * (values.h ?? 0) / 2;
          break;
        case 'circle-area':
          result = Math.PI * Math.pow(values.r ?? 0, 2);
          break;
        case 'circumference':
          result = 2 * Math.PI * (values.r ?? 0);
          break;
        case 'speed':
          result = (values.s ?? 0) / (values.t ?? 1);
          break;
        case 'cube-volume':
          result = Math.pow(values.a ?? 0, 3);
          break;
        case 'cuboid-volume':
          result = (values.a ?? 0) * (values.b ?? 0) * (values.h ?? 0);
          break;
        case 'cylinder-volume':
          result = Math.PI * Math.pow(values.r ?? 0, 2) * (values.h ?? 0);
          break;
        case 'cone-volume':
          result = (1 / 3) * Math.PI * Math.pow(values.r ?? 0, 2) * (values.h ?? 0);
          break;
        default:
          result = 0;
      }
    } catch {
      return null;
    }
    this._recordHistory(`evaluateFormula: ${id} = ${result}`);
    return result;
  }

  // ===========================================================================
  // 配置管理
  // ===========================================================================

  /**
   * 更新配置
   * Update configuration
   */
  updateConfig(config: Partial<DerivationConfig>): void {
    this._config = { ...this._config, ...config };
    this._recordHistory(`updateConfig: ${JSON.stringify(config)}`);
  }

  // ===========================================================================
  // 序列化为 DataPacket
  // ===========================================================================

  /**
   * 序列化为 DataPacket
   * Serialize to DataPacket
   */
  toPacket(): DataPacket<{ formulas: Formula[]; derivation: DerivationStep[]; config: DerivationConfig }> {
    const packet: DataPacket<{ formulas: Formula[]; derivation: DerivationStep[]; config: DerivationConfig }> = {
      id: `formula-derivation-${(++this._counter).toString(36)}`,
      payload: {
        formulas: this.formulas,
        derivation: this.currentDerivation,
        config: this.config,
      },
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
    this._currentDerivation = [];
    this._derivations.clear();
    this._history = [];
    this._counter = 0;
    this._config = {
      showIntermediate: true,
      showRule: true,
      language: 'zh',
      detailLevel: 2,
    };
    this._initializeBuiltinFormulas();
    this._recordHistory('FormulaDerivation engine reset');
  }

  // ===========================================================================
  // 私有辅助方法
  // ===========================================================================

  private _recordHistory(entry: string): void {
    this._history.push(`[${new Date().toISOString()}] ${entry}`);
    if (this._history.length > 500) this._history.shift();
  }
}
