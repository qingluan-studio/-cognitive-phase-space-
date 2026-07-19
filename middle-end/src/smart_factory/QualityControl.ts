import { DataPacket } from '../shared/types';

export interface QCStandard {
  id: string;
  product: string;
  name: string;
  specifications: QCSpecification[];
  standard: string;
  version: string;
  effectiveDate: number;
}

export interface QCSpecification {
  id: string;
  name: string;
  target: number;
  upperLimit: number;
  lowerLimit: number;
  unit: string;
  critical: boolean;
  inspectionMethod: string;
}

export interface QCPlan {
  id: string;
  product: string;
  inspectionPoints: string[];
  methods: string[];
  frequency: string;
  sampleSize: number;
  aql: number;
  status: 'active' | 'inactive' | 'draft';
}

export interface InspectionRecord {
  id: string;
  type: 'incoming' | 'in_process' | 'final' | 'outgoing';
  lotId: string;
  product: string;
  sampleSize: number;
  inspectedQuantity: number;
  passedQuantity: number;
  failedQuantity: number;
  result: 'pass' | 'fail' | 'hold' | 'rework';
  defects: DefectRecord[];
  inspector: string;
  timestamp: number;
  workOrderId?: string;
  operationId?: string;
}

export interface DefectRecord {
  id: string;
  type: string;
  category: string;
  severity: 'minor' | 'major' | 'critical';
  description: string;
  quantity: number;
  rootCause?: string;
  correctiveAction?: string;
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  discoveredAt: number;
  resolvedAt?: number;
}

export interface SPCDataPoint {
  timestamp: number;
  value: number;
  sampleId: string;
  subgroupSize: number;
}

export interface ControlChart {
  id: string;
  process: string;
  parameter: string;
  type: 'xbar_r' | 'xbar_s' | 'p' | 'np' | 'c' | 'u';
  ucl: number;
  lcl: number;
  cl: number;
  points: SPCDataPoint[];
  outOfControlPoints: number;
  trendPoints: number;
  inControl: boolean;
}

export interface CapabilityAnalysis {
  process: string;
  parameter: string;
  cp: number;
  cpk: number;
  pp: number;
  ppk: number;
  cpm: number;
  usl: number;
  lsl: number;
  target: number;
  mean: number;
  stdDev: number;
  capabilityLevel: 'excellent' | 'good' | 'adequate' | 'inadequate' | 'poor';
  sigmaLevel: number;
}

export interface SixSigmaProject {
  id: string;
  name: string;
  phase: 'define' | 'measure' | 'analyze' | 'improve' | 'control';
  problem: string;
  goal: string;
  baseline: number;
  target: number;
  current: number;
  savings: number;
  team: string[];
  startDate: number;
  estimatedEnd: number;
}

export class QualityControl {
  private _standards: Map<string, QCStandard> = new Map();
  private _plans: Map<string, QCPlan> = new Map();
  private _inspections: Map<string, InspectionRecord> = new Map();
  private _defects: Map<string, DefectRecord> = new Map();
  private _controlCharts: Map<string, ControlChart> = new Map();
  private _capabilityAnalyses: Map<string, CapabilityAnalysis> = new Map();
  private _sixSigmaProjects: Map<string, SixSigmaProject> = new Map();
  private _correctiveActions: Map<string, { id: string; defectId: string; action: string; status: string; effectiveness: number }> = new Map();
  private _counter = 0;
  private _stats = {
    totalInspections: 0,
    passRate: 0,
    defectRate: 0,
    dpmo: 0,
    avgCpk: 0,
    sigmaLevel: 0,
    openDefects: 0,
  };

  constructor() {
    this._initializeDefaultStandards();
  }

  private _initializeDefaultStandards(): void {
    const specs: QCSpecification[] = [
      { id: 'spec-001', name: '长度', target: 100, upperLimit: 100.5, lowerLimit: 99.5, unit: 'mm', critical: true, inspectionMethod: '卡尺测量' },
      { id: 'spec-002', name: '宽度', target: 50, upperLimit: 50.3, lowerLimit: 49.7, unit: 'mm', critical: true, inspectionMethod: '游标卡尺' },
      { id: 'spec-003', name: '重量', target: 200, upperLimit: 205, lowerLimit: 195, unit: 'g', critical: false, inspectionMethod: '电子天平' },
      { id: 'spec-004', name: '表面粗糙度', target: 1.6, upperLimit: 3.2, lowerLimit: 0.8, unit: 'Ra', critical: false, inspectionMethod: '粗糙度仪' },
    ];
    const standard: QCStandard = {
      id: 'std-001',
      product: 'product-a',
      name: 'Product A 质量标准',
      specifications: specs,
      standard: 'ISO 9001:2015',
      version: 'v2.0',
      effectiveDate: Date.now(),
    };
    this._standards.set(standard.id, standard);
  }

  createStandard(product: string, name: string, specifications: QCSpecification[], standard: string = 'ISO 9001'): QCStandard {
    const id = `std-${Date.now()}-${this._counter++}`;
    const std: QCStandard = {
      id,
      product,
      name,
      specifications,
      standard,
      version: 'v1.0',
      effectiveDate: Date.now(),
    };
    this._standards.set(id, std);
    return std;
  }

  createInspectionPlan(
    product: string,
    inspectionPoints: string[],
    methods: string[],
    frequency: string,
    sampleSize: number,
    aql: number = 1.0
  ): QCPlan {
    const id = `qc-plan-${Date.now()}-${this._counter++}`;
    const plan: QCPlan = {
      id,
      product,
      inspectionPoints,
      methods,
      frequency,
      sampleSize,
      aql,
      status: 'active',
    };
    this._plans.set(id, plan);
    return plan;
  }

  incomingInspection(
    lotId: string,
    product: string,
    sampleSize: number,
    specs: Record<string, { target: number; tolerance: number }>,
    supplier: string
  ): InspectionRecord {
    const id = `ins-in-${Date.now()}-${this._counter++}`;
    const defects: DefectRecord[] = [];
    const defectCount = Math.floor(Math.random() * sampleSize * 0.05);
    const passed = sampleSize - defectCount;
    const result = defectCount / sampleSize < 0.02 ? 'pass' : defectCount / sampleSize < 0.05 ? 'hold' : 'fail';

    for (let i = 0; i < defectCount; i++) {
      const defectId = `def-${Date.now()}-${this._counter++}`;
      const defect: DefectRecord = {
        id: defectId,
        type: ['尺寸超差', '外观缺陷', '性能不达标'][i % 3],
        category: ['critical', 'major', 'minor'][i % 3] as 'minor' | 'major' | 'critical',
        description: `来料检验发现的第${i + 1}个缺陷`,
        quantity: 1,
        severity: (i % 3 === 0 ? 'critical' : i % 3 === 1 ? 'major' : 'minor'),
        status: 'open',
        discoveredAt: Date.now(),
      };
      defects.push(defect);
      this._defects.set(defectId, defect);
    }

    const record: InspectionRecord = {
      id,
      type: 'incoming',
      lotId,
      product,
      sampleSize,
      inspectedQuantity: sampleSize,
      passedQuantity: passed,
      failedQuantity: defectCount,
      result,
      defects,
      inspector: 'inspector-001',
      timestamp: Date.now(),
    };

    this._inspections.set(id, record);
    this._stats.totalInspections++;
    this._updatePassRate();
    this._stats.openDefects += defects.filter(d => d.status === 'open').length;

    return record;
  }

  inProcessInspection(
    workOrderId: string,
    operationId: string,
    product: string,
    sampleSize: number,
    spec: { target: number; tolerance: number; parameter: string }
  ): {
    inspection: InspectionRecord;
    mean: number;
    stdDev: number;
    cpk: number;
    controlChart?: ControlChart;
  } {
    const id = `ins-ip-${Date.now()}-${this._counter++}`;
    const values: number[] = [];
    const mean = spec.target + (Math.random() - 0.5) * spec.tolerance * 0.4;
    const stdDev = spec.tolerance / 6;

    for (let i = 0; i < sampleSize; i++) {
      values.push(mean + (Math.random() - 0.5) * stdDev * 2);
    }

    const usl = spec.target + spec.tolerance;
    const lsl = spec.target - spec.tolerance;
    const cp = (usl - lsl) / (6 * stdDev);
    const cpu = (usl - mean) / (3 * stdDev);
    const cpl = (mean - lsl) / (3 * stdDev);
    const cpk = Math.min(cpu, cpl);

    const defects: DefectRecord[] = [];
    const failedCount = values.filter(v => v > usl || v < lsl).length;

    if (failedCount > 0) {
      const defectId = `def-${Date.now()}-${this._counter++}`;
      const defect: DefectRecord = {
        id: defectId,
        type: `${spec.parameter}超差`,
        category: '尺寸',
        severity: failedCount / sampleSize > 0.1 ? 'critical' : failedCount / sampleSize > 0.05 ? 'major' : 'minor',
        description: `过程检验发现${spec.parameter}超出规格范围`,
        quantity: failedCount,
        status: 'investigating',
        discoveredAt: Date.now(),
      };
      defects.push(defect);
      this._defects.set(defectId, defect);
    }

    const record: InspectionRecord = {
      id,
      type: 'in_process',
      lotId: workOrderId,
      product,
      sampleSize,
      inspectedQuantity: sampleSize,
      passedQuantity: sampleSize - failedCount,
      failedQuantity: failedCount,
      result: failedCount === 0 ? 'pass' : failedCount / sampleSize < 0.05 ? 'hold' : 'fail',
      defects,
      inspector: 'inspector-002',
      timestamp: Date.now(),
      workOrderId,
      operationId,
    };

    this._inspections.set(id, record);
    this._stats.totalInspections++;
    this._stats.avgCpk = (this._stats.avgCpk * (this._stats.totalInspections - 1) + cpk) / this._stats.totalInspections;
    this._updatePassRate();

    const chart = this._createControlChart(operationId, spec.parameter, values, mean, stdDev);

    const analysisId = `cap-${spec.parameter}-${Date.now()}`;
    this._capabilityAnalyses.set(analysisId, {
      process: operationId,
      parameter: spec.parameter,
      cp,
      cpk,
      pp: cp * 0.95,
      ppk: cpk * 0.95,
      cpm: cpk / Math.sqrt(1 + Math.pow(mean - spec.target, 2) / Math.pow(stdDev, 2)),
      usl,
      lsl,
      target: spec.target,
      mean,
      stdDev,
      capabilityLevel: cpk > 1.67 ? 'excellent' : cpk > 1.33 ? 'good' : cpk > 1 ? 'adequate' : cpk > 0.67 ? 'inadequate' : 'poor',
      sigmaLevel: cpk * 3,
    });

    return { inspection: record, mean, stdDev, cpk, controlChart: chart };
  }

  private _createControlChart(
    process: string,
    parameter: string,
    values: number[],
    mean: number,
    stdDev: number
  ): ControlChart {
    const chartId = `chart-${Date.now()}-${this._counter++}`;
    const points: SPCDataPoint[] = values.map((v, i) => ({
      timestamp: Date.now() - (values.length - i) * 3600000,
      value: v,
      sampleId: `sample-${i + 1}`,
      subgroupSize: 5,
    }));

    const ucl = mean + 3 * stdDev;
    const lcl = mean - 3 * stdDev;
    const outOfControl = points.filter(p => p.value > ucl || p.value < lcl).length;

    const chart: ControlChart = {
      id: chartId,
      process,
      parameter,
      type: 'xbar_r',
      ucl,
      lcl,
      cl: mean,
      points,
      outOfControlPoints: outOfControl,
      trendPoints: 0,
      inControl: outOfControl === 0,
    };

    this._controlCharts.set(chartId, chart);
    return chart;
  }

  finalInspection(
    product: string,
    lotId: string,
    quantity: number,
    criteria: string[],
    standards: string[]
  ): {
    inspection: InspectionRecord;
    passed: number;
    failed: number;
    passRate: number;
    auditScore: number;
    defectsByCategory: Record<string, number>;
  } {
    const id = `ins-fin-${Date.now()}-${this._counter++}`;
    const passed = Math.floor(quantity * (0.92 + Math.random() * 0.07));
    const failed = quantity - passed;

    const defectsByCategory: Record<string, number> = {
      '外观': Math.floor(failed * 0.4),
      '尺寸': Math.floor(failed * 0.3),
      '功能': Math.floor(failed * 0.2),
      '包装': Math.floor(failed * 0.1),
    };

    const defects: DefectRecord[] = [];
    for (const [cat, count] of Object.entries(defectsByCategory)) {
      if (count > 0) {
        const defectId = `def-${Date.now()}-${this._counter++}`;
        defects.push({
          id: defectId,
          type: cat,
          category: cat,
          severity: cat === '功能' ? 'critical' : cat === '尺寸' ? 'major' : 'minor',
          description: `终检发现${cat}缺陷`,
          quantity: count,
          status: 'open',
          discoveredAt: Date.now(),
        });
        this._defects.set(defectId, defects[defects.length - 1]);
      }
    }

    const passRate = passed / quantity;
    const auditScore = passRate * 100;

    const record: InspectionRecord = {
      id,
      type: 'final',
      lotId,
      product,
      sampleSize: quantity,
      inspectedQuantity: quantity,
      passedQuantity: passed,
      failedQuantity: failed,
      result: passRate >= 0.98 ? 'pass' : passRate >= 0.95 ? 'hold' : 'fail',
      defects,
      inspector: 'inspector-003',
      timestamp: Date.now(),
    };

    this._inspections.set(id, record);
    this._stats.totalInspections++;
    this._stats.passRate = (this._stats.passRate * (this._stats.totalInspections - 1) + passRate) / this._stats.totalInspections;
    this._stats.openDefects += defects.filter(d => d.status === 'open').length;

    return { inspection: record, passed, failed, passRate, auditScore, defectsByCategory };
  }

  statisticalProcessControl(
    process: string,
    parameter: string,
    data: number[][],
    chartType: string = 'xbar_r'
  ): {
    chart: ControlChart;
    inControl: boolean;
    outOfControlRules: string[];
    capability: CapabilityAnalysis;
  } {
    const means = data.map(subgroup => subgroup.reduce((s, v) => s + v, 0) / subgroup.length);
    const overallMean = means.reduce((s, v) => s + v, 0) / means.length;
    const ranges = data.map(subgroup => Math.max(...subgroup) - Math.min(...subgroup));
    const avgRange = ranges.reduce((s, v) => s + v, 0) / ranges.length;
    const n = data[0]?.length || 5;
    const a2 = [0, 0, 1.880, 1.023, 0.729, 0.577, 0.483, 0.419, 0.373, 0.337][n] || 0.577;
    const d3 = [0, 0, 0, 0, 0, 0, 0.076, 0.136, 0.184, 0.223][n] || 0;
    const d4 = [0, 0, 3.267, 2.574, 2.282, 2.114, 2.004, 1.924, 1.864, 1.816][n] || 2.114;

    const ucl = overallMean + a2 * avgRange;
    const lcl = overallMean - a2 * avgRange;

    const points: SPCDataPoint[] = means.map((v, i) => ({
      timestamp: Date.now() - (means.length - i) * 3600000,
      value: v,
      sampleId: `subgroup-${i + 1}`,
      subgroupSize: n,
    }));

    const outOfControl = points.filter(p => p.value > ucl || p.value < lcl).length;

    const outOfControlRules: string[] = [];
    if (outOfControl > 0) outOfControlRules.push('点超出控制限');
    let consecutiveAbove = 0;
    let consecutiveBelow = 0;
    for (const p of points) {
      if (p.value > overallMean) { consecutiveAbove++; consecutiveBelow = 0; }
      else { consecutiveBelow++; consecutiveAbove = 0; }
      if (consecutiveAbove >= 7 || consecutiveBelow >= 7) {
        outOfControlRules.push('连续7点在中心线同侧');
        break;
      }
    }

    const stdDev = avgRange / (n === 5 ? 2.326 : 2.059);
    const chartId = `chart-spc-${Date.now()}-${this._counter++}`;
    const chart: ControlChart = {
      id: chartId,
      process,
      parameter,
      type: chartType as ControlChart['type'],
      ucl,
      lcl,
      cl: overallMean,
      points,
      outOfControlPoints: outOfControl,
      trendPoints: 0,
      inControl: outOfControl === 0 && outOfControlRules.length === 0,
    };
    this._controlCharts.set(chartId, chart);

    const capId = `cap-${process}-${parameter}`;
    const usl = overallMean + stdDev * 4;
    const lsl = overallMean - stdDev * 4;
    const cp = (usl - lsl) / (6 * stdDev);
    const cpk = Math.min((usl - overallMean) / (3 * stdDev), (overallMean - lsl) / (3 * stdDev));

    const capability: CapabilityAnalysis = {
      process,
      parameter,
      cp,
      cpk,
      pp: cp * 0.98,
      ppk: cpk * 0.98,
      cpm: cpk,
      usl,
      lsl,
      target: overallMean,
      mean: overallMean,
      stdDev,
      capabilityLevel: cpk > 1.67 ? 'excellent' : cpk > 1.33 ? 'good' : cpk > 1 ? 'adequate' : cpk > 0.67 ? 'inadequate' : 'poor',
      sigmaLevel: cpk * 3,
    };
    this._capabilityAnalyses.set(capId, capability);

    return { chart, inControl: chart.inControl, outOfControlRules, capability };
  }

  paretoAnalysis(defects: string[], categories: string[]): {
    categories: Record<string, number>;
    sorted: string[];
    cumulativePercent: number[];
    top80Percent: string[];
    totalDefects: number;
  } {
    const counts: Record<string, number> = {};
    let total = 0;

    for (const cat of categories) {
      counts[cat] = Math.floor(Math.random() * 200 + 10);
      total += counts[cat];
    }

    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([k]) => k);
    const cumulative: number[] = [];
    const top80: string[] = [];
    let cumulativeCount = 0;

    for (const cat of sorted) {
      cumulativeCount += counts[cat];
      cumulative.push((cumulativeCount / total) * 100);
      if (cumulativeCount / total <= 0.8) {
        top80.push(cat);
      }
    }

    return { categories: counts, sorted, cumulativePercent: cumulative, top80Percent: top80, totalDefects: total };
  }

  fishboneDiagram(
    problem: string,
    categories: string[] = ['人', '机', '料', '法', '环', '测']
  ): {
    problem: string;
    categories: Record<string, string[]>;
    rootCauses: string[];
    contributingFactors: string[];
  } {
    const causes: Record<string, string[]> = {};
    const allCauses: string[] = [];

    const causeTemplates: Record<string, string[]> = {
      '人': ['操作不熟练', '培训不足', '疲劳作业', '未按SOP操作', '人员变动'],
      '机': ['设备老化', '维护不到位', '参数设置错误', '刀具磨损', '设备故障'],
      '料': ['原材料不合格', '供应商质量波动', '物料混放', '存储不当'],
      '法': ['工艺不完善', 'SOP不清晰', '检验标准不明', '流程不合理'],
      '环': ['温湿度超标', '照明不足', '噪音过大', '粉尘超标', '现场5S差'],
      '测': ['量具不准', '检验方法错', '抽样不合理', '检验员误判'],
    };

    for (const cat of categories) {
      const template = causeTemplates[cat] || [`${cat}相关原因1`, `${cat}相关原因2`];
      causes[cat] = template.slice(0, Math.floor(Math.random() * 2) + 2);
      allCauses.push(...causes[cat]);
    }

    return {
      problem,
      categories: causes,
      rootCauses: allCauses.slice(0, 3),
      contributingFactors: allCauses,
    };
  }

  createSixSigmaProject(
    name: string,
    problem: string,
    goal: string,
    baseline: number,
    target: number,
    team: string[]
  ): SixSigmaProject {
    const id = `sixsigma-${Date.now()}-${this._counter++}`;
    const project: SixSigmaProject = {
      id,
      name,
      phase: 'define',
      problem,
      goal,
      baseline,
      target,
      current: baseline,
      savings: 0,
      team,
      startDate: Date.now(),
      estimatedEnd: Date.now() + 90 * 24 * 3600000,
    };
    this._sixSigmaProjects.set(id, project);
    return project;
  }

  updateSixSigmaPhase(projectId: string, phase: SixSigmaProject['phase'], data: Record<string, number>): SixSigmaProject | null {
    const project = this._sixSigmaProjects.get(projectId);
    if (!project) return null;

    project.phase = phase;
    if (data.current !== undefined) project.current = data.current;
    if (data.savings !== undefined) project.savings = data.savings;

    const dpmo = data.dpmo || project.current;
    this._stats.dpmo = dpmo;
    this._stats.sigmaLevel = this._dpmoToSigma(dpmo);

    return project;
  }

  private _dpmoToSigma(dpmo: number): number {
    if (dpmo <= 3.4) return 6;
    if (dpmo <= 233) return 5;
    if (dpmo <= 6210) return 4;
    if (dpmo <= 66807) return 3;
    if (dpmo <= 308537) return 2;
    return 1;
  }

  defectTracking(
    startDate: number,
    endDate: number
  ): {
    totalDefects: number;
    open: number;
    investigating: number;
    resolved: number;
    closed: number;
    avgResolutionTime: number;
    defectsBySeverity: Record<string, number>;
    defectsByCategory: Record<string, number>;
  } {
    const allDefects = Array.from(this._defects.values());

    const bySeverity: Record<string, number> = { minor: 0, major: 0, critical: 0 };
    const byCategory: Record<string, number> = {};
    let total = allDefects.length;
    let open = 0, investigating = 0, resolved = 0, closed = 0;
    let totalResolutionTime = 0;
    let resolvedCount = 0;

    for (const d of allDefects) {
      bySeverity[d.severity] = (bySeverity[d.severity] || 0) + d.quantity;
      byCategory[d.category] = (byCategory[d.category] || 0) + d.quantity;

      if (d.status === 'open') open++;
      else if (d.status === 'investigating') investigating++;
      else if (d.status === 'resolved') resolved++;
      else if (d.status === 'closed') closed++;

      if (d.resolvedAt) {
        totalResolutionTime += (d.resolvedAt - d.discoveredAt) / 3600000;
        resolvedCount++;
      }
    }

    return {
      totalDefects: total,
      open,
      investigating,
      resolved,
      closed,
      avgResolutionTime: resolvedCount > 0 ? totalResolutionTime / resolvedCount : 0,
      defectsBySeverity: bySeverity,
      defectsByCategory: byCategory,
    };
  }

  eightDProblemSolving(
    problem: string,
    steps: string[] = ['D1-团队组建', 'D2-问题描述', 'D3-临时措施', 'D4-根本原因', 'D5-纠正措施', 'D6-验证实施', 'D7-预防措施', 'D8-祝贺团队']
  ): {
    problem: string;
    completedSteps: string[];
    currentStep: number;
    currentStepName: string;
    effectiveness: number;
    actions: Record<string, string[]>;
  } {
    const currentStep = Math.floor(Math.random() * steps.length) + 1;
    const actions: Record<string, string[]> = {};

    for (let i = 0; i < currentStep; i++) {
      actions[steps[i]] = [`${steps[i]}行动1`, `${steps[i]}行动2`];
    }

    return {
      problem,
      completedSteps: steps.slice(0, currentStep),
      currentStep,
      currentStepName: steps[Math.min(currentStep, steps.length - 1)],
      effectiveness: 0.5 + currentStep * 0.06,
      actions,
    };
  }

  isoAudit(
    standard: string,
    findings: string[],
    scope: string[]
  ): {
    standard: string;
    scope: string[];
    findings: number;
    major: number;
    minor: number;
    observations: number;
    score: number;
    result: 'pass' | 'fail' | 'follow_up';
  } {
    const major = Math.floor(findings.length * 0.1);
    const minor = Math.floor(findings.length * 0.3);
    const observations = findings.length - major - minor;
    const score = Math.max(0, 100 - major * 15 - minor * 3 - observations * 1);

    return {
      standard,
      scope,
      findings: findings.length,
      major,
      minor,
      observations,
      score,
      result: score >= 90 ? 'pass' : score >= 75 ? 'follow_up' : 'fail',
    };
  }

  private _updatePassRate(): void {
    const inspections = Array.from(this._inspections.values());
    if (inspections.length === 0) return;

    const totalPassed = inspections.reduce((s, i) => s + i.passedQuantity, 0);
    const totalInspected = inspections.reduce((s, i) => s + i.inspectedQuantity, 0);
    this._stats.passRate = totalInspected > 0 ? totalPassed / totalInspected : 0;
    this._stats.defectRate = 1 - this._stats.passRate;
  }

  get standardCount(): number {
    return this._standards.size;
  }

  get planCount(): number {
    return this._plans.size;
  }

  get inspectionCount(): number {
    return this._inspections.size;
  }

  get defectCount(): number {
    return this._defects.size;
  }

  get controlChartCount(): number {
    return this._controlCharts.size;
  }

  get sixSigmaProjectCount(): number {
    return this._sixSigmaProjects.size;
  }

  get stats(): {
    totalInspections: number;
    passRate: number;
    defectRate: number;
    dpmo: number;
    avgCpk: number;
    sigmaLevel: number;
    openDefects: number;
  } {
    return { ...this._stats };
  }

  getStandard(id: string): QCStandard | undefined {
    return this._standards.get(id);
  }

  getPlan(id: string): QCPlan | undefined {
    return this._plans.get(id);
  }

  getInspection(id: string): InspectionRecord | undefined {
    return this._inspections.get(id);
  }

  getDefect(id: string): DefectRecord | undefined {
    return this._defects.get(id);
  }

  getControlChart(id: string): ControlChart | undefined {
    return this._controlCharts.get(id);
  }

  toPacket(): DataPacket<{
    standards: number;
    plans: number;
    inspections: number;
    defects: number;
    controlCharts: number;
    sixSigmaProjects: number;
    stats: {
      totalInspections: number;
      passRate: number;
      defectRate: number;
      dpmo: number;
      avgCpk: number;
      sigmaLevel: number;
      openDefects: number;
    };
  }> {
    return {
      id: `qc-${Date.now()}-${this._counter}`,
      payload: {
        standards: this._standards.size,
        plans: this._plans.size,
        inspections: this._inspections.size,
        defects: this._defects.size,
        controlCharts: this._controlCharts.size,
        sixSigmaProjects: this._sixSigmaProjects.size,
        stats: { ...this._stats },
      },
      metadata: {
        createdAt: Date.now(),
        route: ['smart_factory', 'quality_control', 'result'],
        priority: 0.8,
        phase: 'quality',
      },
    };
  }

  reset(): void {
    this._standards.clear();
    this._plans.clear();
    this._inspections.clear();
    this._defects.clear();
    this._controlCharts.clear();
    this._capabilityAnalyses.clear();
    this._sixSigmaProjects.clear();
    this._correctiveActions.clear();
    this._counter = 0;
    this._stats = {
      totalInspections: 0,
      passRate: 0,
      defectRate: 0,
      dpmo: 0,
      avgCpk: 0,
      sigmaLevel: 0,
      openDefects: 0,
    };
    this._initializeDefaultStandards();
  }
}
