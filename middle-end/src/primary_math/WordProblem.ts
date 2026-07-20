/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 应用题引擎 —— 生活场景中的数学智慧
 * Word Problem Engine: Mathematical Wisdom in Life Scenarios
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 应用题是数学与生活的桥梁。行程问题以速度与时间的交织，
 * 工程问题以效率与总量的博弈，比例问题以部分与整体的对话，
 * 浓度问题以溶质与溶液的比例，鸡兔同笼以假设与验证的艺术。
 *
 * 本引擎提供完整的应用题求解体系，覆盖小学阶段所有经典题型，
 * 从简单的归一问题到复杂的综合应用，从单一知识点到综合运用，
 * 帮助学生建立数学建模能力，培养逻辑思维。
 */

import { DataPacket } from '../shared/types';

export type ProblemType =
  | 'sum-difference' | 'sum-multiple' | 'difference-multiple'
  | 'age' | 'travel' | 'meeting' | 'chase'
  | 'work' | 'average' | 'ratio' | 'percentage' | 'profit'
  | 'interest' | 'concentration' | 'chicken-rabbit'
  | 'tree-planting' | 'clock' | 'date-calculation'
  | 'optimization' | 'flood-drain' | 'cow-grass';

export interface ProblemData {
  readonly id: string;
  readonly type: ProblemType;
  readonly title: string;
  readonly content: string;
  readonly difficulty: 1 | 2 | 3 | 4 | 5;
  readonly knownConditions: Map<string, number>;
  readonly unknowns: string[];
  readonly constraints: string[];
}

export interface SolutionStep {
  readonly id: string;
  readonly stepNumber: number;
  readonly description: string;
  readonly formula: string;
  readonly calculation: string;
  readonly result: string;
  readonly explanation: string;
}

export interface ProblemSolution {
  readonly problemId: string;
  readonly steps: SolutionStep[];
  readonly finalAnswer: string;
  readonly method: string;
  readonly checkMethod: string;
  readonly similarProblems: string[];
}

export interface ProblemTemplate {
  readonly type: ProblemType;
  readonly description: string;
  readonly formulaPattern: string;
  readonly example: string;
  readonly keyWords: string[];
  readonly commonMistakes: string[];
}

export class WordProblem {
  private _problems: Map<string, ProblemData> = new Map();
  private _solutions: Map<string, ProblemSolution> = new Map();
  private _templates: Map<ProblemType, ProblemTemplate> = new Map();
  private _history: string[] = [];
  private _counter = 0;
  private _solvedCount = 0;
  private _correctCount = 0;

  constructor() {
    this._initializeTemplates();
    this._initializeBuiltinProblems();
    this._recordHistory('WordProblem engine initialized');
  }

  get problems(): ProblemData[] { return Array.from(this._problems.values()); }
  get templates(): ProblemTemplate[] { return Array.from(this._templates.values()); }
  get solvedCount(): number { return this._solvedCount; }
  get correctCount(): number { return this._correctCount; }

  // ===========================================================================
  // 模板初始化
  // ===========================================================================

  private _initializeTemplates(): void {
    this._templates.set('sum-difference', {
      type: 'sum-difference',
      description: '和差问题：已知两数的和与差，求这两个数',
      formulaPattern: '大数 = (和 + 差) ÷ 2，小数 = (和 - 差) ÷ 2',
      example: '甲乙两数之和是100，差是20，求两数各是多少？',
      keyWords: ['和', '差', '一共', '相差'],
      commonMistakes: ['忘记除以2', '大数小数搞反'],
    });
    this._templates.set('sum-multiple', {
      type: 'sum-multiple',
      description: '和倍问题：已知两数的和与倍数关系，求这两个数',
      formulaPattern: '小数 = 和 ÷ (倍数 + 1)，大数 = 小数 × 倍数',
      example: '甲乙两数之和是120，甲是乙的3倍，求两数各是多少？',
      keyWords: ['和', '倍', '一共', '是...的几倍'],
      commonMistakes: ['倍数加1错误', '直接用和除以倍数'],
    });
    this._templates.set('difference-multiple', {
      type: 'difference-multiple',
      description: '差倍问题：已知两数的差与倍数关系，求这两个数',
      formulaPattern: '小数 = 差 ÷ (倍数 - 1)，大数 = 小数 × 倍数',
      example: '甲比乙多60，甲是乙的4倍，求两数各是多少？',
      keyWords: ['差', '倍', '多多少', '是...的几倍'],
      commonMistakes: ['倍数减1错误', '直接用差除以倍数'],
    });
    this._templates.set('age', {
      type: 'age',
      description: '年龄问题：年龄差不变是关键',
      formulaPattern: '年龄差不变，利用和差倍关系解题',
      example: '爸爸今年35岁，儿子今年5岁，几年后爸爸年龄是儿子的3倍？',
      keyWords: ['年龄', '今年', '几年后', '几年前'],
      commonMistakes: ['忘记年龄差不变', '时间计算错误'],
    });
    this._templates.set('travel', {
      type: 'travel',
      description: '行程问题：路程 = 速度 × 时间',
      formulaPattern: 's = v × t，v = s ÷ t，t = s ÷ v',
      example: '一辆汽车每小时行60千米，3小时行多少千米？',
      keyWords: ['速度', '时间', '路程', '小时', '千米'],
      commonMistakes: ['单位不统一', '公式记错'],
    });
    this._templates.set('meeting', {
      type: 'meeting',
      description: '相遇问题：相向而行，相遇时间 = 总路程 ÷ 速度和',
      formulaPattern: '相遇时间 = 总路程 ÷ (v₁ + v₂)',
      example: '甲乙两地相距300千米，两车相向而行，甲车每小时行60千米，乙车每小时行40千米，几小时相遇？',
      keyWords: ['相向而行', '相对而行', '相遇', '同时出发'],
      commonMistakes: ['用速度差代替速度和', '忘记是同时出发'],
    });
    this._templates.set('chase', {
      type: 'chase',
      description: '追及问题：同向而行，追及时间 = 路程差 ÷ 速度差',
      formulaPattern: '追及时间 = 路程差 ÷ (v快 - v慢)',
      example: '甲在乙前面100米，甲每秒跑5米，乙每秒跑7米，几秒后乙追上甲？',
      keyWords: ['同向而行', '追上', '前面', '后面'],
      commonMistakes: ['用速度和代替速度差', '路程差找错'],
    });
    this._templates.set('work', {
      type: 'work',
      description: '工程问题：工作总量 = 工作效率 × 工作时间',
      formulaPattern: 'W = p × t，合作效率 = p₁ + p₂',
      example: '一项工程，甲单独做10天完成，乙单独做15天完成，两人合作几天完成？',
      keyWords: ['工程', '单独做', '合作', '几天完成'],
      commonMistakes: ['工作效率计算错误', '把时间直接相加'],
    });
    this._templates.set('average', {
      type: 'average',
      description: '平均数问题：平均数 = 总数量 ÷ 总份数',
      formulaPattern: '平均数 = 总和 ÷ 个数',
      example: '小明三科成绩：语文90分，数学95分，英语85分，求平均分。',
      keyWords: ['平均', '平均分', '平均每'],
      commonMistakes: ['总数量或总份数找错', '加权平均理解不清'],
    });
    this._templates.set('ratio', {
      type: 'ratio',
      description: '比例问题：按比例分配',
      formulaPattern: '各部分量 = 总量 × (各部分份数 ÷ 总份数)',
      example: '把120个苹果按3:5分给甲乙两人，各分多少个？',
      keyWords: ['比', '比例', '按...分配'],
      commonMistakes: ['总份数算错', '比例分配比例搞反'],
    });
    this._templates.set('percentage', {
      type: 'percentage',
      description: '百分数问题：百分比 = 部分 ÷ 总量 × 100%',
      formulaPattern: 'P% = part ÷ whole × 100%',
      example: '六（1）班有50人，今天出勤48人，求出勤率。',
      keyWords: ['百分之', '出勤率', '合格率', '增长率'],
      commonMistakes: ['标准量找错', '忘记乘以100%'],
    });
    this._templates.set('profit', {
      type: 'profit',
      description: '利润问题：利润 = 售价 - 成本',
      formulaPattern: '利润率 = 利润 ÷ 成本 × 100%',
      example: '一件商品成本100元，售价130元，求利润率。',
      keyWords: ['成本', '售价', '利润', '利润率', '打折'],
      commonMistakes: ['利润和利润率混淆', '打折计算错误'],
    });
    this._templates.set('interest', {
      type: 'interest',
      description: '利息问题：利息 = 本金 × 利率 × 时间',
      formulaPattern: 'I = P × r × t，本息和 = P + I',
      example: '存入1000元，年利率3%，存2年，求利息。',
      keyWords: ['本金', '利率', '利息', '年利率', '存期'],
      commonMistakes: ['时间单位不统一', '本息和忘记加本金'],
    });
    this._templates.set('concentration', {
      type: 'concentration',
      description: '浓度问题：浓度 = 溶质 ÷ 溶液 × 100%',
      formulaPattern: '浓度 = 溶质质量 ÷ 溶液质量 × 100%',
      example: '把20克盐放入80克水中，求盐水浓度。',
      keyWords: ['浓度', '含盐率', '糖水', '盐水'],
      commonMistakes: ['溶质和溶液混淆', '加水后溶质不变的理解错误'],
    });
    this._templates.set('chicken-rabbit', {
      type: 'chicken-rabbit',
      description: '鸡兔同笼问题：假设法求解',
      formulaPattern: '兔数 = (总脚数 - 总头数×2) ÷ (4-2)',
      example: '鸡兔同笼，共有头35个，脚94只，问鸡兔各多少只？',
      keyWords: ['鸡兔同笼', '假设法', '头', '脚'],
      commonMistakes: ['假设后脚数差算错', '鸡兔数量搞反'],
    });
    this._templates.set('tree-planting', {
      type: 'tree-planting',
      description: '植树问题：两端都栽、两端不栽、封闭图形',
      formulaPattern: '两端都栽：棵数 = 间隔数 + 1',
      example: '在一条100米的路一边植树，每隔5米栽一棵（两端都栽），一共栽多少棵？',
      keyWords: ['植树', '每隔', '两端', '一边', '一圈'],
      commonMistakes: ['加1减1搞反', '封闭图形忘记特殊处理'],
    });
    this._templates.set('clock', {
      type: 'clock',
      description: '时钟问题：时针与分针的追及问题',
      formulaPattern: '分针速度：6°/分，时针速度：0.5°/分',
      example: '3点整，再过多少分钟时针与分针重合？',
      keyWords: ['时钟', '时针', '分针', '重合', '垂直'],
      commonMistakes: ['时针分针速度记错', '初始角度算错'],
    });
    this._templates.set('date-calculation', {
      type: 'date-calculation',
      description: '日期计算：星期几、经过天数',
      formulaPattern: '周期为7天，计算经过天数除以7看余数',
      example: '今天是星期一，再过100天是星期几？',
      keyWords: ['星期几', '经过', '日期', '周年'],
      commonMistakes: ['计算天数时首尾是否算入', '闰年判断错误'],
    });
    this._templates.set('optimization', {
      type: 'optimization',
      description: '优化问题：最省钱、最少、最多',
      formulaPattern: '列举比较或列表分析',
      example: '租船问题：大船限坐6人，租金30元；小船限坐4人，租金24元。50人怎么租最省钱？',
      keyWords: ['最省钱', '最少', '最多', '最优', '怎样最'],
      commonMistakes: ['考虑方案不全面', '只看单价不看实际情况'],
    });
    this._templates.set('flood-drain', {
      type: 'flood-drain',
      description: '注水排水问题：进水管和出水管',
      formulaPattern: '净效率 = 进水效率 - 排水效率',
      example: '一个水池，单开甲管6小时注满，单开乙管8小时放完，两管同时开，几小时注满？',
      keyWords: ['注满', '放完', '同时打开', '水池'],
      commonMistakes: ['效率加减搞反', '单位不统一'],
    });
    this._templates.set('cow-grass', {
      type: 'cow-grass',
      description: '牛吃草问题：草在不断生长',
      formulaPattern: '草生长速度 = (牛头数×天数 - 牛头数×天数) ÷ 天数差',
      example: '一片草地，27头牛6天吃完，23头牛9天吃完，21头牛几天吃完？',
      keyWords: ['牛吃草', '匀速生长', '吃完'],
      commonMistakes: ['忘记草在生长', '原有草量计算错误'],
    });
  }

  // ===========================================================================
  // 内置题目初始化
  // ===========================================================================

  private _initializeBuiltinProblems(): void {
    this._addSumDifferenceProblem();
    this._addSumMultipleProblem();
    this._addDifferenceMultipleProblem();
    this._addAgeProblem();
    this._addTravelProblem();
    this._addMeetingProblem();
    this._addChaseProblem();
    this._addWorkProblem();
    this._addAverageProblem();
    this._addRatioProblem();
    this._addPercentageProblem();
    this._addProfitProblem();
    this._addInterestProblem();
    this._addConcentrationProblem();
    this._addChickenRabbitProblem();
    this._addTreePlantingProblem();
  }

  private _addSumDifferenceProblem(): void {
    const known = new Map<string, number>();
    known.set('sum', 100);
    known.set('difference', 20);
    this._problems.set('wp-001', {
      id: 'wp-001',
      type: 'sum-difference',
      title: '和差问题',
      content: '甲乙两数之和是100，甲数比乙数大20，求甲乙两数各是多少？',
      difficulty: 1,
      knownConditions: known,
      unknowns: ['甲数', '乙数'],
      constraints: ['甲 > 乙'],
    });
  }

  private _addSumMultipleProblem(): void {
    const known = new Map<string, number>();
    known.set('sum', 120);
    known.set('multiple', 3);
    this._problems.set('wp-002', {
      id: 'wp-002',
      type: 'sum-multiple',
      title: '和倍问题',
      content: '果园里苹果树和梨树共有120棵，苹果树的棵数是梨树的3倍，苹果树和梨树各有多少棵？',
      difficulty: 1,
      knownConditions: known,
      unknowns: ['苹果树', '梨树'],
      constraints: ['苹果树 = 3 × 梨树'],
    });
  }

  private _addDifferenceMultipleProblem(): void {
    const known = new Map<string, number>();
    known.set('difference', 60);
    known.set('multiple', 4);
    this._problems.set('wp-003', {
      id: 'wp-003',
      type: 'difference-multiple',
      title: '差倍问题',
      content: '甲班图书比乙班多60本，甲班图书是乙班的4倍，甲乙两班各有图书多少本？',
      difficulty: 2,
      knownConditions: known,
      unknowns: ['甲班图书', '乙班图书'],
      constraints: ['甲班 = 4 × 乙班'],
    });
  }

  private _addAgeProblem(): void {
    const known = new Map<string, number>();
    known.set('fatherAge', 35);
    known.set('sonAge', 5);
    known.set('targetMultiple', 3);
    this._problems.set('wp-004', {
      id: 'wp-004',
      type: 'age',
      title: '年龄问题',
      content: '爸爸今年35岁，儿子今年5岁，几年后爸爸的年龄是儿子的3倍？',
      difficulty: 3,
      knownConditions: known,
      unknowns: ['几年后'],
      constraints: ['年龄差不变'],
    });
  }

  private _addTravelProblem(): void {
    const known = new Map<string, number>();
    known.set('speed', 60);
    known.set('time', 3);
    this._problems.set('wp-005', {
      id: 'wp-005',
      type: 'travel',
      title: '简单行程问题',
      content: '一辆汽车从甲地开往乙地，每小时行驶60千米，3小时到达，甲乙两地相距多少千米？',
      difficulty: 1,
      knownConditions: known,
      unknowns: ['甲乙两地距离'],
      constraints: ['匀速行驶'],
    });
  }

  private _addMeetingProblem(): void {
    const known = new Map<string, number>();
    known.set('distance', 300);
    known.set('speedA', 60);
    known.set('speedB', 40);
    this._problems.set('wp-006', {
      id: 'wp-006',
      type: 'meeting',
      title: '相遇问题',
      content: '甲乙两地相距300千米，一辆客车从甲地开往乙地，每小时行60千米；一辆货车从乙地开往甲地，每小时行40千米。两车同时出发，相向而行，几小时后相遇？',
      difficulty: 2,
      knownConditions: known,
      unknowns: ['相遇时间'],
      constraints: ['同时出发', '相向而行'],
    });
  }

  private _addChaseProblem(): void {
    const known = new Map<string, number>();
    known.set('distance', 100);
    known.set('speedA', 5);
    known.set('speedB', 7);
    this._problems.set('wp-007', {
      id: 'wp-007',
      type: 'chase',
      title: '追及问题',
      content: '甲在乙前面100米处，甲每秒跑5米，乙每秒跑7米。两人同时同向出发，几秒后乙能追上甲？',
      difficulty: 2,
      knownConditions: known,
      unknowns: ['追及时间'],
      constraints: ['同时出发', '同向而行'],
    });
  }

  private _addWorkProblem(): void {
    const known = new Map<string, number>();
    known.set('timeA', 10);
    known.set('timeB', 15);
    this._problems.set('wp-008', {
      id: 'wp-008',
      type: 'work',
      title: '工程问题',
      content: '一项工程，甲队单独做需要10天完成，乙队单独做需要15天完成。两队合作，需要几天完成？',
      difficulty: 3,
      knownConditions: known,
      unknowns: ['合作时间'],
      constraints: ['工作效率不变'],
    });
  }

  private _addAverageProblem(): void {
    const known = new Map<string, number>();
    known.set('chinese', 90);
    known.set('math', 95);
    known.set('english', 85);
    this._problems.set('wp-009', {
      id: 'wp-009',
      type: 'average',
      title: '平均数问题',
      content: '小明期末考试三科成绩：语文90分，数学95分，英语85分。求小明三科的平均成绩。',
      difficulty: 1,
      knownConditions: known,
      unknowns: ['平均成绩'],
      constraints: ['三科成绩'],
    });
  }

  private _addRatioProblem(): void {
    const known = new Map<string, number>();
    known.set('total', 120);
    known.set('ratioA', 3);
    known.set('ratioB', 5);
    this._problems.set('wp-010', {
      id: 'wp-010',
      type: 'ratio',
      title: '按比例分配',
      content: '把120个苹果按3:5的比例分给甲乙两个小朋友，甲乙各分得多少个苹果？',
      difficulty: 2,
      knownConditions: known,
      unknowns: ['甲分得', '乙分得'],
      constraints: ['比例 3:5'],
    });
  }

  private _addPercentageProblem(): void {
    const known = new Map<string, number>();
    known.set('total', 50);
    known.set('attendance', 48);
    this._problems.set('wp-011', {
      id: 'wp-011',
      type: 'percentage',
      title: '出勤率问题',
      content: '六（1）班有学生50人，今天出勤48人。求今天的出勤率。',
      difficulty: 1,
      knownConditions: known,
      unknowns: ['出勤率'],
      constraints: ['出勤率 = 出勤人数 ÷ 总人数 × 100%'],
    });
  }

  private _addProfitProblem(): void {
    const known = new Map<string, number>();
    known.set('cost', 100);
    known.set('price', 130);
    this._problems.set('wp-012', {
      id: 'wp-012',
      type: 'profit',
      title: '利润问题',
      content: '一件商品的成本是100元，售价是130元。这件商品的利润是多少元？利润率是多少？',
      difficulty: 2,
      knownConditions: known,
      unknowns: ['利润', '利润率'],
      constraints: ['利润率 = 利润 ÷ 成本 × 100%'],
    });
  }

  private _addInterestProblem(): void {
    const known = new Map<string, number>();
    known.set('principal', 1000);
    known.set('rate', 0.03);
    known.set('time', 2);
    this._problems.set('wp-013', {
      id: 'wp-013',
      type: 'interest',
      title: '利息问题',
      content: '小明把1000元压岁钱存入银行，年利率是3%，存期2年。到期时小明可以得到利息多少元？',
      difficulty: 2,
      knownConditions: known,
      unknowns: ['利息'],
      constraints: ['单利计算'],
    });
  }

  private _addConcentrationProblem(): void {
    const known = new Map<string, number>();
    known.set('solute', 20);
    known.set('solvent', 80);
    this._problems.set('wp-014', {
      id: 'wp-014',
      type: 'concentration',
      title: '浓度问题',
      content: '把20克盐放入80克水中，完全溶解后，盐水的浓度是多少？',
      difficulty: 2,
      knownConditions: known,
      unknowns: ['盐水浓度'],
      constraints: ['盐水 = 盐 + 水'],
    });
  }

  private _addChickenRabbitProblem(): void {
    const known = new Map<string, number>();
    known.set('heads', 35);
    known.set('feet', 94);
    this._problems.set('wp-015', {
      id: 'wp-015',
      type: 'chicken-rabbit',
      title: '鸡兔同笼',
      content: '鸡兔同笼，共有35个头，94只脚。请问笼中鸡和兔各有多少只？',
      difficulty: 3,
      knownConditions: known,
      unknowns: ['鸡的数量', '兔的数量'],
      constraints: ['鸡有2只脚，兔有4只脚'],
    });
  }

  private _addTreePlantingProblem(): void {
    const known = new Map<string, number>();
    known.set('length', 100);
    known.set('interval', 5);
    this._problems.set('wp-016', {
      id: 'wp-016',
      type: 'tree-planting',
      title: '植树问题（两端都栽）',
      content: '在一条长100米的小路一边植树，每隔5米栽一棵（两端都要栽）。一共需要栽多少棵树？',
      difficulty: 2,
      knownConditions: known,
      unknowns: ['树的棵数'],
      constraints: ['两端都栽', '一边'],
    });
  }

  // ===========================================================================
  // 题目管理
  // ===========================================================================

  /**
   * 添加题目
   * Add a word problem
   */
  addProblem(problem: Omit<WordProblem, 'id'> & { id?: string }): WordProblem {
    const id = problem.id || `wp-${(++this._counter).toString(36)}`;
    const newProblem: WordProblem = { ...problem, id } as WordProblem;
    this._problems.set(id, newProblem);
    this._recordHistory(`addProblem: ${id} (${newProblem.type})`);
    return newProblem;
  }

  /**
   * 获取题目
   * Get a problem by id
   */
  getProblem(id: string): WordProblem | null {
    return this._problems.get(id) ?? null;
  }

  /**
   * 删除题目
   * Delete a problem
   */
  deleteProblem(id: string): boolean {
    const existed = this._problems.has(id);
    if (existed) {
      this._problems.delete(id);
      this._recordHistory(`deleteProblem: ${id}`);
    }
    return existed;
  }

  /**
   * 按类型获取题目
   * Get problems by type
   */
  getProblemsByType(type: ProblemType): WordProblem[] {
    return this.problems.filter(p => p.type === type);
  }

  /**
   * 按难度获取题目
   * Get problems by difficulty
   */
  getProblemsByDifficulty(difficulty: 1 | 2 | 3 | 4 | 5): WordProblem[] {
    return this.problems.filter(p => p.difficulty === difficulty);
  }

  /**
   * 搜索题目
   * Search problems by keyword
   */
  searchProblems(keyword: string): WordProblem[] {
    const kw = keyword.toLowerCase();
    return this.problems.filter(p =>
      p.title.toLowerCase().includes(kw) ||
      p.content.toLowerCase().includes(kw)
    );
  }

  // ===========================================================================
  // 解题功能
  // ===========================================================================

  /**
   * 解应用题
   * Solve a word problem
   */
  solveProblem(id: string): ProblemSolution | null {
    const problem = this._problems.get(id);
    if (!problem) {
      this._recordHistory(`solveProblem: problem ${id} not found`);
      return null;
    }
    let solution: ProblemSolution;
    switch (problem.type) {
      case 'sum-difference':
        solution = this._solveSumDifference(problem);
        break;
      case 'sum-multiple':
        solution = this._solveSumMultiple(problem);
        break;
      case 'difference-multiple':
        solution = this._solveDifferenceMultiple(problem);
        break;
      case 'age':
        solution = this._solveAge(problem);
        break;
      case 'travel':
        solution = this._solveTravel(problem);
        break;
      case 'meeting':
        solution = this._solveMeeting(problem);
        break;
      case 'chase':
        solution = this._solveChase(problem);
        break;
      case 'work':
        solution = this._solveWork(problem);
        break;
      case 'average':
        solution = this._solveAverage(problem);
        break;
      case 'ratio':
        solution = this._solveRatio(problem);
        break;
      case 'percentage':
        solution = this._solvePercentage(problem);
        break;
      case 'profit':
        solution = this._solveProfit(problem);
        break;
      case 'interest':
        solution = this._solveInterest(problem);
        break;
      case 'concentration':
        solution = this._solveConcentration(problem);
        break;
      case 'chicken-rabbit':
        solution = this._solveChickenRabbit(problem);
        break;
      case 'tree-planting':
        solution = this._solveTreePlanting(problem);
        break;
      default:
        solution = this._solveGeneric(problem);
    }
    this._solutions.set(id, solution);
    this._solvedCount++;
    this._recordHistory(`solveProblem: ${id} solved (${problem.type})`);
    return solution;
  }

  private _solveSumDifference(problem: WordProblem): ProblemSolution {
    const sum = problem.knownConditions.get('sum') ?? 0;
    const diff = problem.knownConditions.get('difference') ?? 0;
    const big = (sum + diff) / 2;
    const small = (sum - diff) / 2;
    const steps: SolutionStep[] = [
      {
        id: 's1', stepNumber: 1,
        description: '分析题意：已知两数之和与两数之差',
        formula: '大数 = (和 + 差) ÷ 2',
        calculation: `(${sum} + ${diff}) ÷ 2 = ${sum + diff} ÷ 2 = ${big}`,
        result: `大数 = ${big}`,
        explanation: '根据和差公式，大数等于和加差除以2',
      },
      {
        id: 's2', stepNumber: 2,
        description: '求小数',
        formula: '小数 = (和 - 差) ÷ 2',
        calculation: `(${sum} - ${diff}) ÷ 2 = ${sum - diff} ÷ 2 = ${small}`,
        result: `小数 = ${small}`,
        explanation: '小数等于和减差除以2',
      },
      {
        id: 's3', stepNumber: 3,
        description: '验证',
        formula: '和 = 大数 + 小数',
        calculation: `${big} + ${small} = ${big + small}`,
        result: `和 = ${big + small}，差 = ${big - small}`,
        explanation: `验证：和为${big + small}，差为${big - small}，符合题意`,
      },
    ];
    return {
      problemId: problem.id,
      steps,
      finalAnswer: `甲数是${big}，乙数是${small}`,
      method: '和差公式法',
      checkMethod: '代入验证法',
      similarProblems: ['wp-002', 'wp-003'],
    };
  }

  private _solveSumMultiple(problem: WordProblem): ProblemSolution {
    const sum = problem.knownConditions.get('sum') ?? 0;
    const multiple = problem.knownConditions.get('multiple') ?? 1;
    const small = sum / (multiple + 1);
    const big = small * multiple;
    const steps: SolutionStep[] = [
      {
        id: 's1', stepNumber: 1,
        description: '确定份数关系：大数是小数的几倍，总份数就是倍数加1',
        formula: '小数 = 和 ÷ (倍数 + 1)',
        calculation: `${sum} ÷ (${multiple} + 1) = ${sum} ÷ ${multiple + 1} = ${small}`,
        result: `小数 = ${small}`,
        explanation: '把小数看作1份，大数就是几份，总和就是倍数+1份',
      },
      {
        id: 's2', stepNumber: 2,
        description: '求大数',
        formula: '大数 = 小数 × 倍数',
        calculation: `${small} × ${multiple} = ${big}`,
        result: `大数 = ${big}`,
        explanation: '大数是小数的几倍，用小数乘倍数',
      },
      {
        id: 's3', stepNumber: 3,
        description: '验证',
        formula: '和 = 大数 + 小数',
        calculation: `${big} + ${small} = ${big + small}`,
        result: `和 = ${big + small}`,
        explanation: `验证：两数之和为${big + small}，符合题意`,
      },
    ];
    return {
      problemId: problem.id,
      steps,
      finalAnswer: `梨树有${small}棵，苹果树有${big}棵`,
      method: '和倍公式法',
      checkMethod: '代入验证法',
      similarProblems: ['wp-001', 'wp-003'],
    };
  }

  private _solveDifferenceMultiple(problem: WordProblem): ProblemSolution {
    const diff = problem.knownConditions.get('difference') ?? 0;
    const multiple = problem.knownConditions.get('multiple') ?? 1;
    const small = diff / (multiple - 1);
    const big = small * multiple;
    const steps: SolutionStep[] = [
      {
        id: 's1', stepNumber: 1,
        description: '确定份数差：大数比小数多几倍-1份',
        formula: '小数 = 差 ÷ (倍数 - 1)',
        calculation: `${diff} ÷ (${multiple} - 1) = ${diff} ÷ ${multiple - 1} = ${small}`,
        result: `小数 = ${small}`,
        explanation: '把小数看作1份，大数是几份，差就是倍数-1份',
      },
      {
        id: 's2', stepNumber: 2,
        description: '求大数',
        formula: '大数 = 小数 × 倍数',
        calculation: `${small} × ${multiple} = ${big}`,
        result: `大数 = ${big}`,
        explanation: '大数是小数的几倍',
      },
    ];
    return {
      problemId: problem.id,
      steps,
      finalAnswer: `乙班有${small}本，甲班有${big}本`,
      method: '差倍公式法',
      checkMethod: '代入验证法',
      similarProblems: ['wp-001', 'wp-002'],
    };
  }

  private _solveAge(problem: WordProblem): ProblemSolution {
    const fatherAge = problem.knownConditions.get('fatherAge') ?? 0;
    const sonAge = problem.knownConditions.get('sonAge') ?? 0;
    const targetMultiple = problem.knownConditions.get('targetMultiple') ?? 1;
    const ageDiff = fatherAge - sonAge;
    const sonFuture = ageDiff / (targetMultiple - 1);
    const years = sonFuture - sonAge;
    const steps: SolutionStep[] = [
      {
        id: 's1', stepNumber: 1,
        description: '年龄差不变，先求年龄差',
        formula: '年龄差 = 爸爸年龄 - 儿子年龄',
        calculation: `${fatherAge} - ${sonAge} = ${ageDiff}岁`,
        result: `年龄差 = ${ageDiff}岁`,
        explanation: '无论过多少年，两人的年龄差始终不变',
      },
      {
        id: 's2', stepNumber: 2,
        description: '当爸爸年龄是儿子3倍时，年龄差对应2份',
        formula: '儿子年龄 = 年龄差 ÷ (倍数 - 1)',
        calculation: `${ageDiff} ÷ (${targetMultiple} - 1) = ${ageDiff} ÷ ${targetMultiple - 1} = ${sonFuture}岁`,
        result: `那时儿子${sonFuture}岁`,
        explanation: '差倍问题：年龄差不变，利用差倍公式',
      },
      {
        id: 's3', stepNumber: 3,
        description: '求经过的年数',
        formula: '经过年数 = 未来年龄 - 现在年龄',
        calculation: `${sonFuture} - ${sonAge} = ${years}年`,
        result: `经过${years}年`,
        explanation: '用未来儿子的年龄减去现在的年龄',
      },
    ];
    return {
      problemId: problem.id,
      steps,
      finalAnswer: `${years}年后爸爸的年龄是儿子的${targetMultiple}倍`,
      method: '年龄差不变 + 差倍问题',
      checkMethod: '代入验证法',
      similarProblems: ['wp-003'],
    };
  }

  private _solveTravel(problem: WordProblem): ProblemSolution {
    const speed = problem.knownConditions.get('speed') ?? 0;
    const time = problem.knownConditions.get('time') ?? 0;
    const distance = speed * time;
    const steps: SolutionStep[] = [
      {
        id: 's1', stepNumber: 1,
        description: '利用行程问题基本公式',
        formula: '路程 = 速度 × 时间',
        calculation: `${speed} × ${time} = ${distance}千米`,
        result: `路程 = ${distance}千米`,
        explanation: '已知速度和时间，求路程用乘法',
      },
    ];
    return {
      problemId: problem.id,
      steps,
      finalAnswer: `甲乙两地相距${distance}千米`,
      method: '行程公式法',
      checkMethod: '逆推验证法',
      similarProblems: ['wp-006', 'wp-007'],
    };
  }

  private _solveMeeting(problem: WordProblem): ProblemSolution {
    const distance = problem.knownConditions.get('distance') ?? 0;
    const speedA = problem.knownConditions.get('speedA') ?? 0;
    const speedB = problem.knownConditions.get('speedB') ?? 0;
    const speedSum = speedA + speedB;
    const time = distance / speedSum;
    const steps: SolutionStep[] = [
      {
        id: 's1', stepNumber: 1,
        description: '相向而行，速度相加',
        formula: '速度和 = 甲速度 + 乙速度',
        calculation: `${speedA} + ${speedB} = ${speedSum}千米/时`,
        result: `速度和 = ${speedSum}千米/时`,
        explanation: '两车相向而行，每小时一共行驶速度和这么多路程',
      },
      {
        id: 's2', stepNumber: 2,
        description: '求相遇时间',
        formula: '相遇时间 = 总路程 ÷ 速度和',
        calculation: `${distance} ÷ ${speedSum} = ${time}小时`,
        result: `相遇时间 = ${time}小时`,
        explanation: '用总路程除以速度和得到相遇时间',
      },
    ];
    return {
      problemId: problem.id,
      steps,
      finalAnswer: `${time}小时后两车相遇`,
      method: '相遇问题公式法',
      checkMethod: '路程验证法',
      similarProblems: ['wp-005', 'wp-007'],
    };
  }

  private _solveChase(problem: WordProblem): ProblemSolution {
    const distance = problem.knownConditions.get('distance') ?? 0;
    const speedA = problem.knownConditions.get('speedA') ?? 0;
    const speedB = problem.knownConditions.get('speedB') ?? 0;
    const speedDiff = speedB - speedA;
    const time = distance / speedDiff;
    const steps: SolutionStep[] = [
      {
        id: 's1', stepNumber: 1,
        description: '同向而行，速度相减',
        formula: '速度差 = 快速度 - 慢速度',
        calculation: `${speedB} - ${speedA} = ${speedDiff}米/秒`,
        result: `速度差 = ${speedDiff}米/秒`,
        explanation: '乙比甲快，每秒能缩短速度差这么多距离',
      },
      {
        id: 's2', stepNumber: 2,
        description: '求追及时间',
        formula: '追及时间 = 路程差 ÷ 速度差',
        calculation: `${distance} ÷ ${speedDiff} = ${time}秒`,
        result: `追及时间 = ${time}秒`,
        explanation: '用路程差除以速度差得到追及时间',
      },
    ];
    return {
      problemId: problem.id,
      steps,
      finalAnswer: `${time}秒后乙追上甲`,
      method: '追及问题公式法',
      checkMethod: '路程验证法',
      similarProblems: ['wp-005', 'wp-006'],
    };
  }

  private _solveWork(problem: WordProblem): ProblemSolution {
    const timeA = problem.knownConditions.get('timeA') ?? 1;
    const timeB = problem.knownConditions.get('timeB') ?? 1;
    const efficiencyA = 1 / timeA;
    const efficiencyB = 1 / timeB;
    const efficiencySum = efficiencyA + efficiencyB;
    const time = 1 / efficiencySum;
    const steps: SolutionStep[] = [
      {
        id: 's1', stepNumber: 1,
        description: '把工作总量看作单位"1"',
        formula: '工作效率 = 1 ÷ 工作时间',
        calculation: `甲效率 = 1/${timeA} = ${efficiencyA.toFixed(4)}`,
        result: `甲效率 = ${efficiencyA.toFixed(4)}，乙效率 = ${efficiencyB.toFixed(4)}`,
        explanation: '把总工作量设为1，效率就是每天做几分之一',
      },
      {
        id: 's2', stepNumber: 2,
        description: '求合作效率',
        formula: '合作效率 = 甲效率 + 乙效率',
        calculation: `${efficiencyA.toFixed(4)} + ${efficiencyB.toFixed(4)} = ${efficiencySum.toFixed(4)}`,
        result: `合作效率 = ${efficiencySum.toFixed(4)}`,
        explanation: '两人合作，效率相加',
      },
      {
        id: 's3', stepNumber: 3,
        description: '求合作时间',
        formula: '合作时间 = 1 ÷ 合作效率',
        calculation: `1 ÷ ${efficiencySum.toFixed(4)} = ${time.toFixed(1)}天`,
        result: `合作时间 = ${time.toFixed(1)}天`,
        explanation: '用总工作量除以合作效率',
      },
    ];
    return {
      problemId: problem.id,
      steps,
      finalAnswer: `两队合作，需要${time.toFixed(1)}天完成`,
      method: '工程问题公式法（单位1法）',
      checkMethod: '工作量验证法',
      similarProblems: ['wp-006'],
    };
  }

  private _solveAverage(problem: WordProblem): ProblemSolution {
    const values = Array.from(problem.knownConditions.values());
    const sum = values.reduce((a, b) => a + b, 0);
    const count = values.length;
    const average = sum / count;
    const steps: SolutionStep[] = [
      {
        id: 's1', stepNumber: 1,
        description: '求总分',
        formula: '总分 = 各科成绩之和',
        calculation: values.join(' + ') + ` = ${sum}分`,
        result: `总分 = ${sum}分`,
        explanation: '先把三科成绩加起来',
      },
      {
        id: 's2', stepNumber: 2,
        description: '求平均分',
        formula: '平均分 = 总分 ÷ 科数',
        calculation: `${sum} ÷ ${count} = ${average}分`,
        result: `平均分 = ${average}分`,
        explanation: '用总分除以科目数',
      },
    ];
    return {
      problemId: problem.id,
      steps,
      finalAnswer: `小明三科的平均成绩是${average}分`,
      method: '平均数公式法',
      checkMethod: '平均分 × 科数 = 总分',
      similarProblems: ['wp-011'],
    };
  }

  private _solveRatio(problem: WordProblem): ProblemSolution {
    const total = problem.knownConditions.get('total') ?? 0;
    const ratioA = problem.knownConditions.get('ratioA') ?? 0;
    const ratioB = problem.knownConditions.get('ratioB') ?? 0;
    const totalRatio = ratioA + ratioB;
    const a = total * (ratioA / totalRatio);
    const b = total * (ratioB / totalRatio);
    const steps: SolutionStep[] = [
      {
        id: 's1', stepNumber: 1,
        description: '求总份数',
        formula: '总份数 = 各部分份数之和',
        calculation: `${ratioA} + ${ratioB} = ${totalRatio}份`,
        result: `总份数 = ${totalRatio}份`,
        explanation: '先算一共有多少份',
      },
      {
        id: 's2', stepNumber: 2,
        description: '求甲分得数量',
        formula: '甲数量 = 总量 × (甲份数 ÷ 总份数)',
        calculation: `${total} × (${ratioA} ÷ ${totalRatio}) = ${total} × ${ratioA/totalRatio} = ${a}个`,
        result: `甲 = ${a}个`,
        explanation: '甲占总份数的ratioA/totalRatio',
      },
      {
        id: 's3', stepNumber: 3,
        description: '求乙分得数量',
        formula: '乙数量 = 总量 × (乙份数 ÷ 总份数)',
        calculation: `${total} × (${ratioB} ÷ ${totalRatio}) = ${total} × ${ratioB/totalRatio} = ${b}个`,
        result: `乙 = ${b}个`,
        explanation: '乙占总份数的ratioB/totalRatio',
      },
    ];
    return {
      problemId: problem.id,
      steps,
      finalAnswer: `甲分得${a}个，乙分得${b}个`,
      method: '按比例分配法',
      checkMethod: '相加验证法',
      similarProblems: ['wp-002', 'wp-011'],
    };
  }

  private _solvePercentage(problem: WordProblem): ProblemSolution {
    const total = problem.knownConditions.get('total') ?? 0;
    const part = problem.knownConditions.get('attendance') ?? 0;
    const percentage = (part / total) * 100;
    const steps: SolutionStep[] = [
      {
        id: 's1', stepNumber: 1,
        description: '出勤率公式',
        formula: '出勤率 = 出勤人数 ÷ 总人数 × 100%',
        calculation: `${part} ÷ ${total} × 100% = ${percentage}%`,
        result: `出勤率 = ${percentage}%`,
        explanation: '用出勤人数除以总人数再乘百分之百',
      },
    ];
    return {
      problemId: problem.id,
      steps,
      finalAnswer: `今天的出勤率是${percentage}%`,
      method: '百分数公式法',
      checkMethod: '总人数 × 出勤率 = 出勤人数',
      similarProblems: ['wp-012', 'wp-014'],
    };
  }

  private _solveProfit(problem: WordProblem): ProblemSolution {
    const cost = problem.knownConditions.get('cost') ?? 0;
    const price = problem.knownConditions.get('price') ?? 0;
    const profit = price - cost;
    const profitRate = (profit / cost) * 100;
    const steps: SolutionStep[] = [
      {
        id: 's1', stepNumber: 1,
        description: '求利润',
        formula: '利润 = 售价 - 成本',
        calculation: `${price} - ${cost} = ${profit}元`,
        result: `利润 = ${profit}元`,
        explanation: '利润等于售价减去成本',
      },
      {
        id: 's2', stepNumber: 2,
        description: '求利润率',
        formula: '利润率 = 利润 ÷ 成本 × 100%',
        calculation: `${profit} ÷ ${cost} × 100% = ${profitRate}%`,
        result: `利润率 = ${profitRate}%`,
        explanation: '利润率是利润占成本的百分之几',
      },
    ];
    return {
      problemId: problem.id,
      steps,
      finalAnswer: `利润是${profit}元，利润率是${profitRate}%`,
      method: '利润公式法',
      checkMethod: '成本 × (1 + 利润率) = 售价',
      similarProblems: ['wp-011', 'wp-013'],
    };
  }

  private _solveInterest(problem: WordProblem): ProblemSolution {
    const principal = problem.knownConditions.get('principal') ?? 0;
    const rate = problem.knownConditions.get('rate') ?? 0;
    const time = problem.knownConditions.get('time') ?? 0;
    const interest = principal * rate * time;
    const steps: SolutionStep[] = [
      {
        id: 's1', stepNumber: 1,
        description: '利息公式',
        formula: '利息 = 本金 × 利率 × 时间',
        calculation: `${principal} × ${rate} × ${time} = ${interest}元`,
        result: `利息 = ${interest}元`,
        explanation: '利息等于本金乘利率再乘时间',
      },
    ];
    return {
      problemId: problem.id,
      steps,
      finalAnswer: `到期时小明可以得到利息${interest}元`,
      method: '利息公式法',
      checkMethod: '本息和 = 本金 + 利息',
      similarProblems: ['wp-011', 'wp-012'],
    };
  }

  private _solveConcentration(problem: WordProblem): ProblemSolution {
    const solute = problem.knownConditions.get('solute') ?? 0;
    const solvent = problem.knownConditions.get('solvent') ?? 0;
    const solution = solute + solvent;
    const concentration = (solute / solution) * 100;
    const steps: SolutionStep[] = [
      {
        id: 's1', stepNumber: 1,
        description: '求盐水质量',
        formula: '盐水质量 = 盐 + 水',
        calculation: `${solute} + ${solvent} = ${solution}克`,
        result: `盐水 = ${solution}克`,
        explanation: '盐水是盐和水的总和',
      },
      {
        id: 's2', stepNumber: 2,
        description: '求浓度',
        formula: '浓度 = 溶质 ÷ 溶液 × 100%',
        calculation: `${solute} ÷ ${solution} × 100% = ${concentration}%`,
        result: `浓度 = ${concentration}%`,
        explanation: '浓度是盐占盐水的百分之几',
      },
    ];
    return {
      problemId: problem.id,
      steps,
      finalAnswer: `盐水的浓度是${concentration}%`,
      method: '浓度公式法',
      checkMethod: '溶液 × 浓度 = 溶质',
      similarProblems: ['wp-011', 'wp-012'],
    };
  }

  private _solveChickenRabbit(problem: WordProblem): ProblemSolution {
    const heads = problem.knownConditions.get('heads') ?? 0;
    const feet = problem.knownConditions.get('feet') ?? 0;
    const rabbit = (feet - heads * 2) / (4 - 2);
    const chicken = heads - rabbit;
    const steps: SolutionStep[] = [
      {
        id: 's1', stepNumber: 1,
        description: '假设全是鸡，计算应有脚数',
        formula: '假设脚数 = 头数 × 2',
        calculation: `${heads} × 2 = ${heads * 2}只`,
        result: `假设全是鸡有${heads * 2}只脚`,
        explanation: '用假设法，先假设全是鸡',
      },
      {
        id: 's2', stepNumber: 2,
        description: '实际比假设多的脚数',
        formula: '多的脚数 = 实际脚数 - 假设脚数',
        calculation: `${feet} - ${heads * 2} = ${feet - heads * 2}只`,
        result: `多了${feet - heads * 2}只脚`,
        explanation: '多出来的脚是因为有兔子，每只兔比鸡多2只脚',
      },
      {
        id: 's3', stepNumber: 3,
        description: '求兔的数量',
        formula: '兔数 = 多的脚数 ÷ (4 - 2)',
        calculation: `${feet - heads * 2} ÷ 2 = ${rabbit}只`,
        result: `兔 = ${rabbit}只`,
        explanation: '每只兔多2只脚，多的脚数除以2就是兔的数量',
      },
      {
        id: 's4', stepNumber: 4,
        description: '求鸡的数量',
        formula: '鸡数 = 总头数 - 兔数',
        calculation: `${heads} - ${rabbit} = ${chicken}只`,
        result: `鸡 = ${chicken}只`,
        explanation: '用总头数减去兔的数量就是鸡的数量',
      },
    ];
    return {
      problemId: problem.id,
      steps,
      finalAnswer: `鸡有${chicken}只，兔有${rabbit}只`,
      method: '假设法',
      checkMethod: '脚数验证法',
      similarProblems: [],
    };
  }

  private _solveTreePlanting(problem: WordProblem): ProblemSolution {
    const length = problem.knownConditions.get('length') ?? 0;
    const interval = problem.knownConditions.get('interval') ?? 0;
    const gaps = length / interval;
    const trees = gaps + 1;
    const steps: SolutionStep[] = [
      {
        id: 's1', stepNumber: 1,
        description: '求间隔数',
        formula: '间隔数 = 总长度 ÷ 间隔长度',
        calculation: `${length} ÷ ${interval} = ${gaps}个`,
        result: `间隔数 = ${gaps}个`,
        explanation: '先算有多少个间隔',
      },
      {
        id: 's2', stepNumber: 2,
        description: '两端都栽，棵数比间隔数多1',
        formula: '棵数 = 间隔数 + 1',
        calculation: `${gaps} + 1 = ${trees}棵`,
        result: `棵数 = ${trees}棵`,
        explanation: '因为两端都要栽，所以棵数等于间隔数加1',
      },
    ];
    return {
      problemId: problem.id,
      steps,
      finalAnswer: `一共需要栽${trees}棵树`,
      method: '植树问题公式法',
      checkMethod: '画图验证法',
      similarProblems: [],
    };
  }

  private _solveGeneric(problem: WordProblem): ProblemSolution {
    return {
      problemId: problem.id,
      steps: [],
      finalAnswer: '题目类型暂不支持自动求解',
      method: '通用方法',
      checkMethod: '手动验证',
      similarProblems: [],
    };
  }

  // ===========================================================================
  // 题目生成
  // ===========================================================================

  /**
   * 生成指定类型的题目
   * Generate a problem of given type
   */
  generateProblem(type: ProblemType, difficulty: 1 | 2 | 3 | 4 | 5 = 2): WordProblem {
    const id = `wp-gen-${(++this._counter).toString(36)}`;
    const template = this._templates.get(type);
    const known = new Map<string, number>();
    const title = template ? template.description : `${type}问题`;
    const content = template ? template.example : '示例题目';
    const problem: WordProblem = {
      id,
      type,
      title,
      content,
      difficulty,
      knownConditions: known,
      unknowns: [],
      constraints: [],
    };
    this._problems.set(id, problem);
    this._recordHistory(`generateProblem: ${id} (${type}, difficulty=${difficulty})`);
    return problem;
  }

  /**
   * 批量生成题目
   * Generate multiple problems
   */
  generateProblems(type: ProblemType, count: number, difficulty: 1 | 2 | 3 | 4 | 5 = 2): WordProblem[] {
    const problems: WordProblem[] = [];
    for (let i = 0; i < count; i++) {
      problems.push(this.generateProblem(type, difficulty));
    }
    return problems;
  }

  // ===========================================================================
  // 模板查询
  // ===========================================================================

  /**
   * 获取题型模板
   * Get problem template by type
   */
  getTemplate(type: ProblemType): ProblemTemplate | null {
    return this._templates.get(type) ?? null;
  }

  /**
   * 获取所有题型
   * Get all problem types
   */
  getAllTypes(): ProblemType[] {
    return Array.from(this._templates.keys());
  }

  // ===========================================================================
  // 序列化为 DataPacket
  // ===========================================================================

  /**
   * 序列化为 DataPacket
   * Serialize to DataPacket
   */
  toPacket(): DataPacket<{ problems: WordProblem[]; templates: ProblemTemplate[]; solvedCount: number }> {
    const packet: DataPacket<{ problems: WordProblem[]; templates: ProblemTemplate[]; solvedCount: number }> = {
      id: `word-problem-${(++this._counter).toString(36)}`,
      payload: {
        problems: this.problems,
        templates: this.templates,
        solvedCount: this._solvedCount,
      },
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
    this._solutions.clear();
    this._history = [];
    this._counter = 0;
    this._solvedCount = 0;
    this._correctCount = 0;
    this._initializeBuiltinProblems();
    this._recordHistory('WordProblem engine reset');
  }

  // ===========================================================================
  // 私有辅助方法
  // ===========================================================================

  private _recordHistory(entry: string): void {
    this._history.push(`[${new Date().toISOString()}] ${entry}`);
    if (this._history.length > 500) this._history.shift();
  }
}
