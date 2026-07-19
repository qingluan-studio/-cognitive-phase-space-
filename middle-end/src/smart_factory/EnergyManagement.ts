import { DataPacket } from '../shared/types';

export interface EnergyMeter {
  id: string;
  name: string;
  type: 'electricity' | 'water' | 'gas' | 'steam' | 'compressed_air';
  location: string;
  building: string;
  area: string;
  status: 'active' | 'inactive' | 'fault';
  currentReading: number;
  lastReading: number;
  lastUpdate: number;
  unit: string;
  multiplier: number;
  connectedEquipment: string[];
}

export interface EnergyConsumption {
  meterId: string;
  period: 'hour' | 'day' | 'week' | 'month' | 'year';
  startTime: number;
  endTime: number;
  consumption: number;
  peakDemand: number;
  averageDemand: number;
  cost: number;
  unit: string;
  rate: number;
}

export interface EnergyCost {
  period: string;
  type: string;
  consumption: number;
  unitPrice: number;
  totalCost: number;
  peakCost: number;
  valleyCost: number;
  normalCost: number;
  surcharges: Record<string, number>;
}

export interface CarbonFootprint {
  scope: string;
  category: string;
  activity: number;
  activityUnit: string;
  emissionFactor: number;
  emissions: number;
  unit: string;
  source: string;
  period: string;
}

export interface EnergyEfficiency {
  indicator: string;
  actualValue: number;
  targetValue: number;
  baselineValue: number;
  unit: string;
  improvement: number;
  status: 'excellent' | 'good' | 'average' | 'poor';
}

export interface EnergyOptimization {
  id: string;
  name: string;
  type: string;
  description: string;
  targetArea: string;
  baselineConsumption: number;
  projectedSavings: number;
  actualSavings: number;
  investmentCost: number;
  paybackPeriod: number;
  status: 'proposed' | 'approved' | 'implementing' | 'completed' | 'verified';
  startDate: number;
  endDate?: number;
}

export interface PeakLoadManagement {
  date: number;
  peakDemand: number;
  targetPeak: number;
  actualPeak: number;
  peakReduction: number;
  costSavings: number;
  strategies: string[];
  shiftableLoads: string[];
  demandResponseEvents: number;
}

export interface EnergyAlarm {
  id: string;
  meterId: string;
  type: string;
  severity: 'warning' | 'alarm' | 'critical';
  message: string;
  threshold: number;
  actualValue: number;
  timestamp: number;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: number;
}

export interface EnergyDashboard {
  totalConsumption: Record<string, number>;
  totalCost: number;
  carbonEmissions: number;
  energyIntensity: number;
  peakDemand: number;
  powerFactor: number;
  efficiencyScore: number;
  renewableRatio: number;
}

export class EnergyManagement {
  private _meters: Map<string, EnergyMeter> = new Map();
  private _consumptions: Map<string, EnergyConsumption> = new Map();
  private _costs: Map<string, EnergyCost> = new Map();
  private _carbonFootprints: Map<string, CarbonFootprint> = new Map();
  private _efficiencies: Map<string, EnergyEfficiency> = new Map();
  private _optimizations: Map<string, EnergyOptimization> = new Map();
  private _peakLoads: Map<string, PeakLoadManagement> = new Map();
  private _alarms: Map<string, EnergyAlarm> = new Map();
  private _energyRates: Map<string, { peak: number; normal: number; valley: number }> = new Map();
  private _counter = 0;
  private _stats = {
    totalMeters: 0,
    activeMeters: 0,
    totalConsumption: 0,
    totalCost: 0,
    totalCarbonEmissions: 0,
    energyIntensity: 0,
    efficiencyScore: 0,
    activeAlarms: 0,
  };

  constructor() {
    this._initializeDefaultMeters();
    this._initializeEnergyRates();
    this._generateHistoricalData();
  }

  private _initializeDefaultMeters(): void {
    const meters = [
      { id: 'em-001', name: '总电度表', type: 'electricity' as const, loc: '配电房', building: '主厂房', unit: 'kWh', mult: 1 },
      { id: 'em-002', name: '冲压车间电表', type: 'electricity' as const, loc: '冲压车间', building: '主厂房', unit: 'kWh', mult: 1 },
      { id: 'em-003', name: '机加工车间电表', type: 'electricity' as const, loc: '机加工车间', building: '主厂房', unit: 'kWh', mult: 1 },
      { id: 'em-004', name: '装配车间电表', type: 'electricity' as const, loc: '装配车间', building: '主厂房', unit: 'kWh', mult: 1 },
      { id: 'wm-001', name: '总水表', type: 'water' as const, loc: '泵房', building: '辅助用房', unit: 'm³', mult: 1 },
      { id: 'gm-001', name: '天然气总表', type: 'gas' as const, loc: '锅炉房', building: '辅助用房', unit: 'm³', mult: 1 },
      { id: 'sm-001', name: '蒸汽流量表', type: 'steam' as const, loc: '锅炉房', building: '辅助用房', unit: 't', mult: 1 },
      { id: 'cm-001', name: '压缩空气表', type: 'compressed_air' as const, loc: '空压机房', building: '辅助用房', unit: 'm³', mult: 1 },
    ];

    for (const m of meters) {
      const meter: EnergyMeter = {
        id: m.id,
        name: m.name,
        type: m.type,
        location: m.loc,
        building: m.building,
        area: '生产区',
        status: 'active',
        currentReading: Math.random() * 100000 + 50000,
        lastReading: Math.random() * 100000 + 40000,
        lastUpdate: Date.now(),
        unit: m.unit,
        multiplier: m.mult,
        connectedEquipment: [],
      };
      this._meters.set(m.id, meter);
      this._stats.totalMeters++;
      this._stats.activeMeters++;
    }
  }

  private _initializeEnergyRates(): void {
    this._energyRates.set('electricity', { peak: 1.2, normal: 0.8, valley: 0.4 });
    this._energyRates.set('water', { peak: 5.0, normal: 4.5, valley: 4.0 });
    this._energyRates.set('gas', { peak: 3.5, normal: 3.2, valley: 3.0 });
    this._energyRates.set('steam', { peak: 200, normal: 180, valley: 150 });
    this._energyRates.set('compressed_air', { peak: 0.3, normal: 0.25, valley: 0.2 });
  }

  private _generateHistoricalData(): void {
    const meters = Array.from(this._meters.values());
    const now = Date.now();

    for (const meter of meters) {
      for (let i = 30; i >= 0; i--) {
        const date = new Date(now - i * 24 * 3600000);
        const id = `cons-${meter.id}-${date.toISOString().split('T')[0]}`;

        const baseConsumption = meter.type === 'electricity' ? 2000 :
          meter.type === 'water' ? 50 :
          meter.type === 'gas' ? 100 :
          meter.type === 'steam' ? 5 :
          300;

        const consumption = baseConsumption * (0.8 + Math.random() * 0.4);
        const rate = this._energyRates.get(meter.type)?.normal || 1;

        const entry: EnergyConsumption = {
          meterId: meter.id,
          period: 'day',
          startTime: date.getTime(),
          endTime: date.getTime() + 24 * 3600000,
          consumption,
          peakDemand: consumption * 1.5 / 24,
          averageDemand: consumption / 24,
          cost: consumption * rate,
          unit: meter.unit,
          rate,
        };

        this._consumptions.set(id, entry);
      }
    }

    this._updateStats();
  }

  private _updateStats(): void {
    const consumptions = Array.from(this._consumptions.values());
    this._stats.totalConsumption = consumptions.reduce((s, c) => s + c.consumption, 0);
    this._stats.totalCost = consumptions.reduce((s, c) => s + c.cost, 0);

    const electricityConsumption = consumptions
      .filter(c => {
        const meter = this._meters.get(c.meterId);
        return meter?.type === 'electricity';
      })
      .reduce((s, c) => s + c.consumption, 0);

    this._stats.totalCarbonEmissions = electricityConsumption * 0.5839;
    this._stats.energyIntensity = electricityConsumption / 1000;
    this._stats.efficiencyScore = 70 + Math.random() * 20;
  }

  addMeter(
    name: string,
    type: EnergyMeter['type'],
    location: string,
    building: string,
    unit: string,
    multiplier: number = 1
  ): EnergyMeter {
    const id = `meter-${Date.now()}-${this._counter++}`;
    const meter: EnergyMeter = {
      id,
      name,
      type,
      location,
      building,
      area: '生产区',
      status: 'active',
      currentReading: 0,
      lastReading: 0,
      lastUpdate: Date.now(),
      unit,
      multiplier,
      connectedEquipment: [],
    };
    this._meters.set(id, meter);
    this._stats.totalMeters++;
    this._stats.activeMeters++;
    return meter;
  }

  recordMeterReading(meterId: string, reading: number): EnergyMeter | null {
    const meter = this._meters.get(meterId);
    if (!meter) return null;

    meter.lastReading = meter.currentReading;
    meter.currentReading = reading;
    meter.lastUpdate = Date.now();

    const consumption = (reading - meter.lastReading) * meter.multiplier;
    if (consumption > 0) {
      const id = `cons-${meterId}-${Date.now()}`;
      const rate = this._energyRates.get(meter.type)?.normal || 1;

      const entry: EnergyConsumption = {
        meterId,
        period: 'hour',
        startTime: meter.lastUpdate - 3600000,
        endTime: meter.lastUpdate,
        consumption,
        peakDemand: consumption * 1.2,
        averageDemand: consumption,
        cost: consumption * rate,
        unit: meter.unit,
        rate,
      };

      this._consumptions.set(id, entry);
      this._updateStats();
      this._checkThresholds(meterId, consumption);
    }

    return meter;
  }

  private _checkThresholds(meterId: string, consumption: number): void {
    const meter = this._meters.get(meterId);
    if (!meter) return;

    const avgConsumption = 1000;
    const threshold = avgConsumption * 1.5;

    if (consumption > threshold) {
      const alarmId = `alm-${Date.now()}-${this._counter++}`;
      const alarm: EnergyAlarm = {
        id: alarmId,
        meterId,
        type: 'high_consumption',
        severity: consumption > threshold * 2 ? 'critical' : 'alarm',
        message: `${meter.name} 能耗超过阈值`,
        threshold,
        actualValue: consumption,
        timestamp: Date.now(),
        acknowledged: false,
      };
      this._alarms.set(alarmId, alarm);
      this._stats.activeAlarms++;
    }
  }

  acknowledgeAlarm(alarmId: string, acknowledgedBy: string): EnergyAlarm | null {
    const alarm = this._alarms.get(alarmId);
    if (!alarm || alarm.acknowledged) return null;

    alarm.acknowledged = true;
    alarm.acknowledgedBy = acknowledgedBy;
    alarm.acknowledgedAt = Date.now();
    this._stats.activeAlarms--;

    return alarm;
  }

  energyConsumptionAnalysis(
    meterIds: string[],
    period: 'hour' | 'day' | 'week' | 'month' | 'year' = 'month'
  ): {
    totalConsumption: number;
    byMeter: Record<string, number>;
    byType: Record<string, number>;
    trend: number[];
    comparison: { previous: number; current: number; change: number; changePercent: number };
    peakPeriods: string[];
    valleyPeriods: string[];
  } {
    const byMeter: Record<string, number> = {};
    const byType: Record<string, number> = {};
    let total = 0;

    const consumptions = Array.from(this._consumptions.values())
      .filter(c => meterIds.includes(c.meterId));

    for (const c of consumptions) {
      const meter = this._meters.get(c.meterId);
      byMeter[c.meterId] = (byMeter[c.meterId] || 0) + c.consumption;
      if (meter) {
        byType[meter.type] = (byType[meter.type] || 0) + c.consumption;
      }
      total += c.consumption;
    }

    const trend: number[] = [];
    for (let i = 0; i < 12; i++) {
      trend.push(total / 12 * (0.8 + Math.random() * 0.4));
    }

    const previous = total * (0.9 + Math.random() * 0.2);
    const change = total - previous;
    const changePercent = previous > 0 ? change / previous * 100 : 0;

    return {
      totalConsumption: total,
      byMeter,
      byType,
      trend,
      comparison: { previous, current: total, change, changePercent },
      peakPeriods: ['09:00-11:00', '14:00-16:00'],
      valleyPeriods: ['00:00-06:00', '22:00-24:00'],
    };
  }

  energyCostAnalysis(
    period: 'month' | 'quarter' | 'year' = 'month'
  ): {
    totalCost: number;
    byEnergyType: Record<string, { consumption: number; cost: number; unitPrice: number }>;
    byTimeOfUse: { peak: number; normal: number; valley: number };
    byDepartment: Record<string, number>;
    unitCost: number;
    costTrend: number[];
    budgetComparison: { budget: number; actual: number; variance: number; variancePercent: number };
  } {
    const rates = this._energyRates;
    const byType: Record<string, { consumption: number; cost: number; unitPrice: number }> = {};
    let totalCost = 0;
    let totalConsumption = 0;

    for (const [type, rate] of rates) {
      const consumption = type === 'electricity' ? 50000 :
        type === 'water' ? 1500 :
        type === 'gas' ? 3000 :
        type === 'steam' ? 100 :
        8000;

      const cost = consumption * rate.normal * (0.3 + 0.4 + 0.3);
      byType[type] = {
        consumption,
        cost,
        unitPrice: rate.normal,
      };
      totalCost += cost;
      totalConsumption += consumption;
    }

    const peakCost = totalCost * 0.5;
    const normalCost = totalCost * 0.35;
    const valleyCost = totalCost * 0.15;

    const byDepartment: Record<string, number> = {
      '冲压车间': totalCost * 0.2,
      '机加工车间': totalCost * 0.3,
      '焊接车间': totalCost * 0.15,
      '装配车间': totalCost * 0.2,
      '喷涂车间': totalCost * 0.1,
      '办公区': totalCost * 0.05,
    };

    const costTrend: number[] = [];
    for (let i = 0; i < 12; i++) {
      costTrend.push(totalCost * (0.85 + Math.random() * 0.3));
    }

    const budget = totalCost * 1.1;
    const variance = totalCost - budget;
    const variancePercent = budget > 0 ? variance / budget * 100 : 0;

    return {
      totalCost,
      byEnergyType: byType,
      byTimeOfUse: { peak: peakCost, normal: normalCost, valley: valleyCost },
      byDepartment,
      unitCost: totalConsumption > 0 ? totalCost / totalConsumption : 0,
      costTrend,
      budgetComparison: { budget, actual: totalCost, variance, variancePercent },
    };
  }

  carbonFootprintCalculation(
    scope: 'scope1' | 'scope2' | 'scope3',
    period: 'month' | 'year' = 'year'
  ): {
    totalEmissions: number;
    byScope: Record<string, number>;
    bySource: Record<string, { activity: number; emissions: number; factor: number }>;
    unit: string;
    trend: number[];
    intensity: number;
    reductionTarget: number;
    reductionActual: number;
  } {
    const emissionsFactors: Record<string, number> = {
      ' electricity': 0.5839,
      'natural_gas': 2.1622,
      'gasoline': 2.3075,
      'diesel': 2.6337,
      'steam': 0.11,
      'water': 0.91,
      'waste': 0.5,
    };

    const bySource: Record<string, { activity: number; emissions: number; factor: number }> = {};
    let total = 0;

    const sources = scope === 'scope1' ? ['natural_gas', 'gasoline', 'diesel'] :
      scope === 'scope2' ? ['electricity', 'steam'] :
      ['water', 'waste'];

    for (const src of sources) {
      const activity = src === 'electricity' ? 600000 :
        src === 'natural_gas' ? 50000 :
        src === 'gasoline' ? 10000 :
        src === 'diesel' ? 20000 :
        src === 'steam' ? 2000 :
        src === 'water' ? 20000 :
        500;

      const factor = emissionsFactors[src] || 1;
      const emissions = activity * factor;

      bySource[src] = { activity, emissions, factor };
      total += emissions;
    }

    const byScope = {
      scope1: scope === 'scope1' ? total : total * 0.3,
      scope2: scope === 'scope2' ? total : total * 0.5,
      scope3: scope === 'scope3' ? total : total * 0.2,
    };

    const trend: number[] = [];
    for (let i = 0; i < 12; i++) {
      trend.push(total * (0.95 + Math.random() * 0.1) * (1 - i * 0.005));
    }

    return {
      totalEmissions: total,
      byScope,
      bySource,
      unit: 'kgCO2e',
      trend,
      intensity: total / 10000,
      reductionTarget: 0.1,
      reductionActual: 0.08,
    };
  }

  energyEfficiencyIndicators(): {
    indicators: EnergyEfficiency[];
    overallScore: number;
    bestIndicator: string;
    worstIndicator: string;
    improvementAreas: string[];
  } {
    const indicators: EnergyEfficiency[] = [
      {
        indicator: '单位产值能耗',
        actualValue: 0.085,
        targetValue: 0.08,
        baselineValue: 0.095,
        unit: 'tce/万元',
        improvement: 0.105,
        status: 'good',
      },
      {
        indicator: '产品单耗',
        actualValue: 125,
        targetValue: 120,
        baselineValue: 135,
        unit: 'kWh/件',
        improvement: 0.074,
        status: 'good',
      },
      {
        indicator: '功率因数',
        actualValue: 0.94,
        targetValue: 0.95,
        baselineValue: 0.90,
        unit: '',
        improvement: 0.044,
        status: 'good',
      },
      {
        indicator: '能源利用率',
        actualValue: 78.5,
        targetValue: 82,
        baselineValue: 75,
        unit: '%',
        improvement: 0.047,
        status: 'average',
      },
      {
        indicator: '余热回收率',
        actualValue: 35,
        targetValue: 45,
        baselineValue: 28,
        unit: '%',
        improvement: 0.25,
        status: 'average',
      },
      {
        indicator: '照明功率密度',
        actualValue: 8,
        targetValue: 7,
        baselineValue: 9,
        unit: 'W/m²',
        improvement: 0.11,
        status: 'good',
      },
      {
        indicator: '空压机能效',
        actualValue: 0.85,
        targetValue: 0.90,
        baselineValue: 0.80,
        unit: 'kW/m³/min',
        improvement: 0.0625,
        status: 'average',
      },
      {
        indicator: '锅炉效率',
        actualValue: 88,
        targetValue: 90,
        baselineValue: 85,
        unit: '%',
        improvement: 0.035,
        status: 'good',
      },
    ];

    this._efficiencies.clear();
    for (const ind of indicators) {
      this._efficiencies.set(ind.indicator, ind);
    }

    const scores = indicators.map(i => {
      const ratio = i.actualValue / i.targetValue;
      return i.status === 'excellent' ? 95 : i.status === 'good' ? 85 : i.status === 'average' ? 70 : 50;
    });
    const overallScore = scores.reduce((s, v) => s + v, 0) / scores.length;

    const sortedByImprovement = [...indicators].sort((a, b) => b.improvement - a.improvement);
    const worst = indicators.filter(i => i.status === 'poor' || i.status === 'average');

    return {
      indicators,
      overallScore,
      bestIndicator: sortedByImprovement[0]?.indicator || '',
      worstIndicator: worst[worst.length - 1]?.indicator || '',
      improvementAreas: worst.map(i => i.indicator),
    };
  }

  createEnergyOptimization(
    name: string,
    type: string,
    description: string,
    targetArea: string,
    baselineConsumption: number,
    projectedSavings: number,
    investmentCost: number
  ): EnergyOptimization {
    const id = `opt-${Date.now()}-${this._counter++}`;
    const paybackPeriod = projectedSavings > 0 ? investmentCost / (projectedSavings * 12) : 999;

    const optimization: EnergyOptimization = {
      id,
      name,
      type,
      description,
      targetArea,
      baselineConsumption,
      projectedSavings,
      actualSavings: 0,
      investmentCost,
      paybackPeriod,
      status: 'proposed',
      startDate: Date.now(),
    };

    this._optimizations.set(id, optimization);
    return optimization;
  }

  updateOptimizationStatus(optimizationId: string, status: EnergyOptimization['status'], actualSavings?: number): EnergyOptimization | null {
    const opt = this._optimizations.get(optimizationId);
    if (!opt) return null;

    opt.status = status;
    if (actualSavings !== undefined) {
      opt.actualSavings = actualSavings;
    }
    if (status === 'completed' || status === 'verified') {
      opt.endDate = Date.now();
    }

    return opt;
  }

  peakLoadManagement(
    date: number,
    targetPeak: number,
    strategies: string[] = ['shiftable_loads', 'energy_storage', 'demand_response', 'production_scheduling']
  ): PeakLoadManagement {
    const id = `peak-${date}`;
    const actualPeak = targetPeak * (0.9 + Math.random() * 0.15);
    const peakReduction = Math.max(0, targetPeak * 1.1 - actualPeak);
    const rate = this._energyRates.get('electricity')?.peak || 1;
    const costSavings = peakReduction * rate * 4;

    const peak: PeakLoadManagement = {
      date,
      peakDemand: targetPeak * 1.1,
      targetPeak,
      actualPeak,
      peakReduction,
      costSavings,
      strategies,
      shiftableLoads: ['空压机', '冷水机组', '充电设备', '部分生产设备'],
      demandResponseEvents: Math.floor(Math.random() * 3),
    };

    this._peakLoads.set(id, peak);
    return peak;
  }

  energyAudit(
    scope: string,
    depth: 'preliminary' | 'detailed' | 'comprehensive' = 'detailed'
  ): {
    scope: string;
    depth: string;
    totalEnergyConsumption: number;
    totalCost: number;
    energySavingPotential: number;
    savingPotentialPercent: number;
    recommendations: {
      category: string;
      measure: string;
      savings: number;
      investment: number;
      payback: number;
      priority: 'high' | 'medium' | 'low';
    }[];
    keyFindings: string[];
    actionPlan: string[];
  } {
    const totalConsumption = 500000;
    const totalCost = 450000;
    const savingPotential = totalConsumption * 0.18;

    const recommendations = [
      { category: '照明系统', measure: 'LED灯具替换', savings: 30000, investment: 80000, payback: 2.67, priority: 'high' as const },
      { category: '电机系统', measure: '变频调速改造', savings: 50000, investment: 150000, payback: 3.0, priority: 'high' as const },
      { category: '空调系统', measure: '余热回收利用', savings: 25000, investment: 120000, payback: 4.8, priority: 'medium' as const },
      { category: '压缩空气', measure: '泄漏检测与修复', savings: 15000, investment: 20000, payback: 1.33, priority: 'high' as const },
      { category: '热力系统', measure: '管道保温优化', savings: 10000, investment: 50000, payback: 5.0, priority: 'medium' as const },
      { category: '管理措施', measure: '能源管理体系建设', savings: 20000, investment: 30000, payback: 1.5, priority: 'high' as const },
      { category: '光伏发电', measure: '屋顶光伏安装', savings: 80000, investment: 500000, payback: 6.25, priority: 'low' as const },
      { category: '储能系统', measure: '峰谷电价套利', savings: 35000, investment: 300000, payback: 8.57, priority: 'low' as const },
    ];

    const keyFindings = [
      '总体能源利用效率约78%，有较大提升空间',
      '电机系统能耗占比最高，约占总能耗的60%',
      '压缩空气系统泄漏率约15-20%，浪费严重',
      '峰谷电价差较大，可通过移峰填谷降低电费',
      '部分设备老化，能效偏低',
      '能源管理体系有待完善',
    ];

    const actionPlan = [
      '成立能源管理小组，明确职责分工',
      '开展全员节能培训，提高节能意识',
      '安装分项计量系统，实现精细化管理',
      '优先实施无成本/低成本节能措施',
      '制定节能目标和考核制度',
      '建立能源管理体系并持续改进',
    ];

    return {
      scope,
      depth,
      totalEnergyConsumption: totalConsumption,
      totalCost,
      energySavingPotential: savingPotential,
      savingPotentialPercent: savingPotential / totalConsumption,
      recommendations,
      keyFindings,
      actionPlan,
    };
  }

  loadProfileAnalysis(
    meterId: string,
    period: 'day' | 'week' = 'day'
  ): {
    loadCurve: number[];
    timePoints: string[];
    peakLoad: number;
    valleyLoad: number;
    averageLoad: number;
    loadFactor: number;
    peakValleyRatio: number;
    peakHours: string[];
    valleyHours: string[];
  } {
    const points = period === 'day' ? 24 : 24 * 7;
    const loadCurve: number[] = [];
    const timePoints: string[] = [];

    for (let i = 0; i < points; i++) {
      const hour = i % 24;
      let load = 100;

      if (hour >= 8 && hour <= 11) {
        load = 180 + Math.random() * 20;
      } else if (hour >= 13 && hour <= 17) {
        load = 170 + Math.random() * 25;
      } else if (hour >= 19 && hour <= 21) {
        load = 120 + Math.random() * 20;
      } else if (hour >= 0 && hour <= 6) {
        load = 50 + Math.random() * 15;
      } else {
        load = 100 + Math.random() * 30;
      }

      loadCurve.push(load);
      timePoints.push(`${hour}:00`);
    }

    const peakLoad = Math.max(...loadCurve);
    const valleyLoad = Math.min(...loadCurve);
    const averageLoad = loadCurve.reduce((s, v) => s + v, 0) / loadCurve.length;
    const loadFactor = peakLoad > 0 ? averageLoad / peakLoad : 0;
    const peakValleyRatio = valleyLoad > 0 ? peakLoad / valleyLoad : 0;

    const peakThreshold = peakLoad * 0.9;
    const valleyThreshold = valleyLoad * 1.2;
    const peakHours = timePoints.filter((_, i) => loadCurve[i] >= peakThreshold);
    const valleyHours = timePoints.filter((_, i) => loadCurve[i] <= valleyThreshold);

    return {
      loadCurve,
      timePoints,
      peakLoad,
      valleyLoad,
      averageLoad,
      loadFactor,
      peakValleyRatio,
      peakHours,
      valleyHours,
    };
  }

  get meterCount(): number {
    return this._meters.size;
  }

  get consumptionRecordCount(): number {
    return this._consumptions.size;
  }

  get optimizationCount(): number {
    return this._optimizations.size;
  }

  get alarmCount(): number {
    return this._alarms.size;
  }

  get stats(): {
    totalMeters: number;
    activeMeters: number;
    totalConsumption: number;
    totalCost: number;
    totalCarbonEmissions: number;
    energyIntensity: number;
    efficiencyScore: number;
    activeAlarms: number;
  } {
    return { ...this._stats };
  }

  getMeter(id: string): EnergyMeter | undefined {
    return this._meters.get(id);
  }

  getConsumption(id: string): EnergyConsumption | undefined {
    return this._consumptions.get(id);
  }

  getOptimization(id: string): EnergyOptimization | undefined {
    return this._optimizations.get(id);
  }

  getAlarm(id: string): EnergyAlarm | undefined {
    return this._alarms.get(id);
  }

  toPacket(): DataPacket<{
    meters: number;
    consumptions: number;
    costs: number;
    carbonFootprints: number;
    efficiencies: number;
    optimizations: number;
    peakLoads: number;
    alarms: number;
    stats: {
      totalMeters: number;
      activeMeters: number;
      totalConsumption: number;
      totalCost: number;
      totalCarbonEmissions: number;
      energyIntensity: number;
      efficiencyScore: number;
      activeAlarms: number;
    };
  }> {
    return {
      id: `energy-${Date.now()}-${this._counter}`,
      payload: {
        meters: this._meters.size,
        consumptions: this._consumptions.size,
        costs: this._costs.size,
        carbonFootprints: this._carbonFootprints.size,
        efficiencies: this._efficiencies.size,
        optimizations: this._optimizations.size,
        peakLoads: this._peakLoads.size,
        alarms: this._alarms.size,
        stats: { ...this._stats },
      },
      metadata: {
        createdAt: Date.now(),
        route: ['smart_factory', 'energy_management', 'result'],
        priority: 0.7,
        phase: 'energy',
      },
    };
  }

  reset(): void {
    this._meters.clear();
    this._consumptions.clear();
    this._costs.clear();
    this._carbonFootprints.clear();
    this._efficiencies.clear();
    this._optimizations.clear();
    this._peakLoads.clear();
    this._alarms.clear();
    this._energyRates.clear();
    this._counter = 0;
    this._stats = {
      totalMeters: 0,
      activeMeters: 0,
      totalConsumption: 0,
      totalCost: 0,
      totalCarbonEmissions: 0,
      energyIntensity: 0,
      efficiencyScore: 0,
      activeAlarms: 0,
    };
    this._initializeDefaultMeters();
    this._initializeEnergyRates();
    this._generateHistoricalData();
  }
}
