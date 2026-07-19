import { DataPacket } from '../shared/types';

export interface Equipment {
  id: string;
  name: string;
  type: string;
  category: string;
  model: string;
  manufacturer: string;
  serialNumber: string;
  location: string;
  workCenter: string;
  installDate: number;
  status: 'running' | 'idle' | 'maintenance' | 'fault' | 'offline';
  criticality: 'critical' | 'important' | 'general';
  specifications: Record<string, string>;
}

export interface MaintenanceTask {
  id: string;
  equipmentId: string;
  type: 'preventive' | 'predictive' | 'corrective' | 'breakdown' | 'inspection';
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'overdue';
  priority: 'low' | 'medium' | 'high' | 'critical';
  scheduledDate: number;
  actualStartDate?: number;
  actualEndDate?: number;
  assignedTo: string;
  estimatedHours: number;
  actualHours?: number;
  cost: number;
  parts: MaintenancePart[];
  checkpoints: string[];
}

export interface MaintenancePart {
  partId: string;
  partName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

export interface EquipmentStatus {
  equipmentId: string;
  timestamp: number;
  status: 'running' | 'idle' | 'maintenance' | 'fault' | 'offline';
  parameters: Record<string, number>;
  alarms: AlarmRecord[];
  runningHours: number;
  idleHours: number;
  downtimeHours: number;
}

export interface AlarmRecord {
  id: string;
  equipmentId: string;
  type: string;
  severity: 'warning' | 'alarm' | 'critical';
  message: string;
  timestamp: number;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: number;
}

export interface PredictiveMaintenance {
  equipmentId: string;
  healthIndex: number;
  remainingUsefulLife: number;
  predictedFailureDate?: number;
  failureProbability: number;
  recommendations: string[];
  monitoredParameters: string[];
  model: string;
  confidence: number;
  lastUpdate: number;
}

export interface OEEAnalysis {
  equipmentId: string;
  period: 'day' | 'week' | 'month';
  availability: number;
  performance: number;
  quality: number;
  oee: number;
  totalTime: number;
  plannedProductionTime: number;
  operatingTime: number;
  idealCycleTime: number;
  actualOutput: number;
  goodOutput: number;
  downtimeReasons: Record<string, number>;
  speedLossReasons: Record<string, number>;
  qualityLossReasons: Record<string, number>;
}

export interface TPMProgram {
  id: string;
  name: string;
  pillars: string[];
  status: 'active' | 'inactive';
  overallEquipmentEffectiveness: number;
  mtbf: number;
  mttr: number;
  plannedMaintenanceRate: number;
  autonomousMaintenance: {
    operators: number;
    trained: number;
    participationRate: number;
  };
}

export class EquipmentManagement {
  private _equipment: Map<string, Equipment> = new Map();
  private _maintenanceTasks: Map<string, MaintenanceTask> = new Map();
  private _equipmentStatus: Map<string, EquipmentStatus> = new Map();
  private _alarms: Map<string, AlarmRecord> = new Map();
  private _predictiveMaintenance: Map<string, PredictiveMaintenance> = new Map();
  private _oeeAnalyses: Map<string, OEEAnalysis> = new Map();
  private _tpmPrograms: Map<string, TPMProgram> = new Map();
  private _spareParts: Map<string, { id: string; name: string; quantity: number; reorderPoint: number }> = new Map();
  private _counter = 0;
  private _stats = {
    totalEquipment: 0,
    runningEquipment: 0,
    faultEquipment: 0,
    maintenanceEquipment: 0,
    avgOee: 0,
    mtbf: 0,
    mttr: 0,
    openAlarms: 0,
  };

  constructor() {
    this._initializeDefaultEquipment();
  }

  private _initializeDefaultEquipment(): void {
    const equipmentList = [
      { id: 'eq-001', name: 'CNC加工中心01', type: 'machining', category: '金属加工', model: 'VMC-850', manufacturer: 'MAZAK', sn: 'SN-2023-0001', wc: 'wc-003', critical: 'critical' },
      { id: 'eq-002', name: 'CNC加工中心02', type: 'machining', category: '金属加工', model: 'VMC-850', manufacturer: 'MAZAK', sn: 'SN-2023-0002', wc: 'wc-003', critical: 'critical' },
      { id: 'eq-003', name: '数控车床01', type: 'machining', category: '金属加工', model: 'CK6150', manufacturer: '沈阳机床', sn: 'SN-2022-0015', wc: 'wc-003', critical: 'important' },
      { id: 'eq-004', name: '冲压机01', type: 'forming', category: '冲压', model: 'JH21-200', manufacturer: '扬力', sn: 'SN-2021-0008', wc: 'wc-001', critical: 'important' },
      { id: 'eq-005', name: '焊接机器人01', type: 'welding', category: '焊接', model: 'R-0iB', manufacturer: 'FANUC', sn: 'SN-2023-0045', wc: 'wc-002', critical: 'critical' },
      { id: 'eq-006', name: '装配线01', type: 'assembly', category: '装配', model: 'AL-2023', manufacturer: '自产', sn: 'SN-2023-001', wc: 'wc-004', critical: 'critical' },
      { id: 'eq-007', name: '喷涂线01', type: 'coating', category: '表面处理', model: 'PL-2020', manufacturer: '杜尔', sn: 'SN-2020-0012', wc: 'wc-005', critical: 'important' },
      { id: 'eq-008', name: '注塑机01', type: 'molding', category: '注塑', model: 'MA1600', manufacturer: '海天', sn: 'SN-2022-0033', wc: 'wc-006', critical: 'general' },
    ];

    for (const eq of equipmentList) {
      const equipment: Equipment = {
        id: eq.id,
        name: eq.name,
        type: eq.type,
        category: eq.category,
        model: eq.model,
        manufacturer: eq.manufacturer,
        serialNumber: eq.sn,
        location: `车间-${eq.wc}`,
        workCenter: eq.wc,
        installDate: Date.now() - Math.random() * 365 * 24 * 3600000 * 3,
        status: 'running',
        criticality: eq.critical as Equipment['criticality'],
        specifications: {
          '功率': '15kW',
          '转速': '12000rpm',
          '精度': '0.005mm',
        },
      };
      this._equipment.set(eq.id, equipment);
      this._stats.totalEquipment++;
      this._stats.runningEquipment++;

      this._equipmentStatus.set(eq.id, {
        equipmentId: eq.id,
        timestamp: Date.now(),
        status: 'running',
        parameters: {
          temperature: 25 + Math.random() * 10,
          vibration: Math.random() * 5,
          current: 10 + Math.random() * 5,
          rpm: 8000 + Math.random() * 2000,
        },
        alarms: [],
        runningHours: Math.random() * 10000 + 5000,
        idleHours: Math.random() * 1000 + 200,
        downtimeHours: Math.random() * 200 + 50,
      });
    }
  }

  addEquipment(
    name: string,
    type: string,
    category: string,
    model: string,
    manufacturer: string,
    serialNumber: string,
    location: string,
    workCenter: string,
    criticality: Equipment['criticality']
  ): Equipment {
    const id = `eq-${Date.now()}-${this._counter++}`;
    const equipment: Equipment = {
      id,
      name,
      type,
      category,
      model,
      manufacturer,
      serialNumber,
      location,
      workCenter,
      installDate: Date.now(),
      status: 'idle',
      criticality,
      specifications: {},
    };
    this._equipment.set(id, equipment);
    this._stats.totalEquipment++;
    return equipment;
  }

  updateEquipmentStatus(equipmentId: string, status: Equipment['status']): Equipment | null {
    const eq = this._equipment.get(equipmentId);
    if (!eq) return null;

    const prevStatus = eq.status;
    eq.status = status;

    if (prevStatus === 'running') this._stats.runningEquipment--;
    if (prevStatus === 'fault') this._stats.faultEquipment--;
    if (prevStatus === 'maintenance') this._stats.maintenanceEquipment--;

    if (status === 'running') this._stats.runningEquipment++;
    if (status === 'fault') this._stats.faultEquipment++;
    if (status === 'maintenance') this._stats.maintenanceEquipment++;

    const statusRecord = this._equipmentStatus.get(equipmentId);
    if (statusRecord) {
      statusRecord.status = status;
      statusRecord.timestamp = Date.now();
    }

    return eq;
  }

  createMaintenanceTask(
    equipmentId: string,
    type: MaintenanceTask['type'],
    title: string,
    description: string,
    priority: MaintenanceTask['priority'],
    scheduledDate: number,
    assignedTo: string,
    estimatedHours: number,
    checkpoints: string[] = []
  ): MaintenanceTask {
    const id = `mt-${Date.now()}-${this._counter++}`;
    const task: MaintenanceTask = {
      id,
      equipmentId,
      type,
      title,
      description,
      status: 'pending',
      priority,
      scheduledDate,
      assignedTo,
      estimatedHours,
      cost: estimatedHours * 80 + 500,
      parts: [],
      checkpoints,
    };
    this._maintenanceTasks.set(id, task);
    return task;
  }

  startMaintenanceTask(taskId: string): MaintenanceTask | null {
    const task = this._maintenanceTasks.get(taskId);
    if (!task || task.status !== 'pending') return null;

    task.status = 'in_progress';
    task.actualStartDate = Date.now();

    const eq = this._equipment.get(task.equipmentId);
    if (eq && eq.status === 'running') {
      this.updateEquipmentStatus(task.equipmentId, 'maintenance');
    }

    return task;
  }

  completeMaintenanceTask(taskId: string, actualHours: number, parts: MaintenancePart[] = []): MaintenanceTask | null {
    const task = this._maintenanceTasks.get(taskId);
    if (!task || task.status !== 'in_progress') return null;

    task.status = 'completed';
    task.actualEndDate = Date.now();
    task.actualHours = actualHours;
    task.parts = parts;
    task.cost = actualHours * 80 + parts.reduce((s, p) => s + p.totalCost, 0);

    const eq = this._equipment.get(task.equipmentId);
    if (eq && eq.status === 'maintenance') {
      this.updateEquipmentStatus(task.equipmentId, 'idle');
    }

    return task;
  }

  preventiveMaintenanceSchedule(
    equipmentIds: string[],
    intervalDays: number,
    tasks: string[]
  ): {
    tasks: MaintenanceTask[];
    totalTasks: number;
    next30DaysTasks: number;
    totalEstimatedCost: number;
  } {
    const result: MaintenanceTask[] = [];
    let next30Days = 0;
    let totalCost = 0;

    for (const eqId of equipmentIds) {
      const eq = this._equipment.get(eqId);
      if (!eq) continue;

      for (let i = 0; i < 6; i++) {
        const scheduledDate = Date.now() + i * intervalDays * 24 * 3600000;
        const task = this.createMaintenanceTask(
          eqId,
          'preventive',
          `${eq.name} 定期保养 #${i + 1}`,
          `定期维护保养任务，包含${tasks.join('、')}`,
          eq.criticality === 'critical' ? 'high' : 'medium',
          scheduledDate,
          'tech-001',
          4,
          tasks
        );
        result.push(task);
        totalCost += task.cost;
        if (scheduledDate <= Date.now() + 30 * 24 * 3600000) {
          next30Days++;
        }
      }
    }

    return { tasks: result, totalTasks: result.length, next30DaysTasks: next30Days, totalEstimatedCost: totalCost };
  }

  recordRealTimeData(
    equipmentId: string,
    parameters: Record<string, number>
  ): EquipmentStatus | null {
    const status = this._equipmentStatus.get(equipmentId);
    if (!status) return null;

    status.parameters = { ...status.parameters, ...parameters };
    status.timestamp = Date.now();

    if (parameters.vibration && parameters.vibration > 8) {
      this._generateAlarm(equipmentId, 'vibration_high', 'warning', '振动值超过预警阈值');
    }
    if (parameters.temperature && parameters.temperature > 60) {
      this._generateAlarm(equipmentId, 'temperature_high', 'alarm', '温度超过报警阈值');
    }
    if (parameters.temperature && parameters.temperature > 80) {
      this._generateAlarm(equipmentId, 'temperature_critical', 'critical', '温度超过临界值，请立即停机');
    }

    return status;
  }

  private _generateAlarm(
    equipmentId: string,
    type: string,
    severity: AlarmRecord['severity'],
    message: string
  ): AlarmRecord {
    const id = `alm-${Date.now()}-${this._counter++}`;
    const alarm: AlarmRecord = {
      id,
      equipmentId,
      type,
      severity,
      message,
      timestamp: Date.now(),
      acknowledged: false,
    };
    this._alarms.set(id, alarm);
    this._stats.openAlarms++;
    return alarm;
  }

  acknowledgeAlarm(alarmId: string, acknowledgedBy: string): AlarmRecord | null {
    const alarm = this._alarms.get(alarmId);
    if (!alarm || alarm.acknowledged) return null;

    alarm.acknowledged = true;
    alarm.acknowledgedBy = acknowledgedBy;
    alarm.acknowledgedAt = Date.now();
    this._stats.openAlarms--;

    return alarm;
  }

  predictiveMaintenanceAnalysis(
    equipmentId: string,
    sensorData: Record<string, number[]>,
    model: string = 'lstm'
  ): PredictiveMaintenance {
    const eq = this._equipment.get(equipmentId);
    if (!eq) {
      throw new Error(`Equipment ${equipmentId} not found`);
    }

    const status = this._equipmentStatus.get(equipmentId);
    const vibrationData = sensorData.vibration || [status?.parameters.vibration || 2];
    const tempData = sensorData.temperature || [status?.parameters.temperature || 30];
    const currentData = sensorData.current || [status?.parameters.current || 10];

    const avgVibration = vibrationData.reduce((s, v) => s + v, 0) / vibrationData.length;
    const avgTemp = tempData.reduce((s, v) => s + v, 0) / tempData.length;
    const avgCurrent = currentData.reduce((s, v) => s + v, 0) / currentData.length;

    const vibrationScore = Math.max(0, 100 - avgVibration * 10);
    const tempScore = Math.max(0, 100 - (avgTemp - 25) * 2);
    const currentScore = Math.max(0, 100 - Math.abs(avgCurrent - 12) * 5);
    const healthIndex = (vibrationScore + tempScore + currentScore) / 3;

    const runningHours = status?.runningHours || 8000;
    const maxLifeHours = 50000;
    const rul = Math.max(0, (maxLifeHours - runningHours) * (healthIndex / 100));

    const failureProbability = healthIndex < 40 ? 0.8 : healthIndex < 60 ? 0.4 : healthIndex < 80 ? 0.15 : 0.05;

    const recommendations: string[] = [];
    if (avgVibration > 6) recommendations.push('检查轴承磨损情况');
    if (avgTemp > 50) recommendations.push('检查冷却系统');
    if (avgCurrent > 15) recommendations.push('检查电机负载');
    if (healthIndex < 70) recommendations.push('安排预防性维护');
    if (healthIndex < 50) recommendations.push('立即停机检修');
    if (recommendations.length === 0) recommendations.push('设备运行正常，继续监控');

    const pm: PredictiveMaintenance = {
      equipmentId,
      healthIndex,
      remainingUsefulLife: rul,
      predictedFailureDate: failureProbability > 0.5 ? Date.now() + rul * 3600000 * 0.5 : undefined,
      failureProbability,
      recommendations,
      monitoredParameters: ['vibration', 'temperature', 'current', 'rpm'],
      model,
      confidence: 0.75 + Math.random() * 0.2,
      lastUpdate: Date.now(),
    };

    this._predictiveMaintenance.set(equipmentId, pm);
    return pm;
  }

  calculateOEE(
    equipmentId: string,
    period: 'day' | 'week' | 'month',
    totalTime: number,
    plannedProductionTime: number,
    operatingTime: number,
    idealCycleTime: number,
    actualOutput: number,
    goodOutput: number,
    downtimeReasons: Record<string, number> = {},
    speedLossReasons: Record<string, number> = {},
    qualityLossReasons: Record<string, number> = {}
  ): OEEAnalysis {
    const availability = plannedProductionTime > 0 ? operatingTime / plannedProductionTime : 0;
    const performance = actualOutput > 0 ? (idealCycleTime * actualOutput) / operatingTime : 0;
    const quality = actualOutput > 0 ? goodOutput / actualOutput : 0;
    const oee = availability * performance * quality;

    const analysis: OEEAnalysis = {
      equipmentId,
      period,
      availability,
      performance,
      quality,
      oee,
      totalTime,
      plannedProductionTime,
      operatingTime,
      idealCycleTime,
      actualOutput,
      goodOutput,
      downtimeReasons,
      speedLossReasons,
      qualityLossReasons,
    };

    this._oeeAnalyses.set(`${equipmentId}-${period}-${Date.now()}`, analysis);

    const analyses = Array.from(this._oeeAnalyses.values());
    if (analyses.length > 0) {
      this._stats.avgOee = analyses.reduce((s, a) => s + a.oee, 0) / analyses.length;
    }

    return analysis;
  }

  oeeTrend(equipmentIds: string[], periods: number = 7): {
    dates: string[];
    oeeValues: Record<string, number[]>;
    availabilityValues: Record<string, number[]>;
    performanceValues: Record<string, number[]>;
    qualityValues: Record<string, number[]>;
    overallOee: number[];
  } {
    const dates: string[] = [];
    const oeeValues: Record<string, number[]> = {};
    const availabilityValues: Record<string, number[]> = {};
    const performanceValues: Record<string, number[]> = {};
    const qualityValues: Record<string, number[]> = {};
    const overallOee: number[] = [];

    for (let i = periods - 1; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 3600000);
      dates.push(date.toISOString().split('T')[0]);
    }

    let totalOeeSum = 0;
    for (const eqId of equipmentIds) {
      oeeValues[eqId] = [];
      availabilityValues[eqId] = [];
      performanceValues[eqId] = [];
      qualityValues[eqId] = [];

      const baseOee = 0.7 + Math.random() * 0.2;
      const baseAvail = 0.85 + Math.random() * 0.1;
      const basePerf = 0.8 + Math.random() * 0.15;
      const baseQual = 0.95 + Math.random() * 0.04;

      for (let i = 0; i < periods; i++) {
        const variation = (Math.random() - 0.5) * 0.1;
        const oee = Math.min(1, Math.max(0, baseOee + variation));
        const avail = Math.min(1, Math.max(0, baseAvail + variation * 0.5));
        const perf = Math.min(1, Math.max(0, basePerf + variation * 0.3));
        const qual = Math.min(1, Math.max(0, baseQual + variation * 0.2));

        oeeValues[eqId].push(oee);
        availabilityValues[eqId].push(avail);
        performanceValues[eqId].push(perf);
        qualityValues[eqId].push(qual);
      }
    }

    for (let i = 0; i < periods; i++) {
      let periodOee = 0;
      for (const eqId of equipmentIds) {
        periodOee += oeeValues[eqId][i];
      }
      overallOee.push(equipmentIds.length > 0 ? periodOee / equipmentIds.length : 0);
    }

    return { dates, oeeValues, availabilityValues, performanceValues, qualityValues, overallOee };
  }

  mtbfMttrCalculation(equipmentIds: string[]): {
    mtbf: number;
    mttr: number;
    availability: number;
    failures: number;
    totalDowntime: number;
    totalUptime: number;
    byEquipment: Record<string, { mtbf: number; mttr: number; failures: number }>;
  } {
    const byEquipment: Record<string, { mtbf: number; mttr: number; failures: number }> = {};
    let totalFailures = 0;
    let totalDowntime = 0;
    let totalUptime = 0;

    for (const eqId of equipmentIds) {
      const failures = Math.floor(Math.random() * 5 + 1);
      const mttr = Math.random() * 8 + 2;
      const downtime = failures * mttr;
      const uptime = 24 * 30 - downtime;
      const mtbf = failures > 0 ? uptime / failures : uptime;

      byEquipment[eqId] = { mtbf, mttr, failures };
      totalFailures += failures;
      totalDowntime += downtime;
      totalUptime += uptime;
    }

    const overallMtbf = totalFailures > 0 ? totalUptime / totalFailures : totalUptime;
    const overallMttr = totalFailures > 0 ? totalDowntime / totalFailures : 0;
    const availability = totalUptime + totalDowntime > 0 ? totalUptime / (totalUptime + totalDowntime) : 0;

    this._stats.mtbf = overallMtbf;
    this._stats.mttr = overallMttr;

    return {
      mtbf: overallMtbf,
      mttr: overallMttr,
      availability,
      failures: totalFailures,
      totalDowntime,
      totalUptime,
      byEquipment,
    };
  }

  createTPMProgram(
    name: string,
    pillars: string[] = ['自主保全', '计划保全', '个别改善', '品质保全', '人才培养', '事务改善', '安全环境', '设备初期管理']
  ): TPMProgram {
    const id = `tpm-${Date.now()}-${this._counter++}`;
    const program: TPMProgram = {
      id,
      name,
      pillars,
      status: 'active',
      overallEquipmentEffectiveness: 0.75,
      mtbf: 500,
      mttr: 4,
      plannedMaintenanceRate: 0.8,
      autonomousMaintenance: {
        operators: 50,
        trained: 35,
        participationRate: 0.7,
      },
    };
    this._tpmPrograms.set(id, program);
    return program;
  }

  autonomousMaintenance(
    equipmentIds: string[],
    steps: string[] = ['初期清扫', '发生源难点对策', '自主保全基准书制定', '总点检', '自主点检', '标准化', '自主管理']
  ): {
    equipmentCount: number;
    currentStep: number;
    currentStepName: string;
    completedSteps: string[];
    operatorParticipation: number;
    improvementSuggestions: number;
    stepProgress: Record<string, number>;
  } {
    const currentStep = Math.floor(Math.random() * steps.length) + 1;
    const stepProgress: Record<string, number> = {};

    for (let i = 0; i < steps.length; i++) {
      if (i < currentStep - 1) {
        stepProgress[steps[i]] = 100;
      } else if (i === currentStep - 1) {
        stepProgress[steps[i]] = Math.floor(Math.random() * 50 + 30);
      } else {
        stepProgress[steps[i]] = 0;
      }
    }

    return {
      equipmentCount: equipmentIds.length,
      currentStep,
      currentStepName: steps[Math.min(currentStep - 1, steps.length - 1)],
      completedSteps: steps.slice(0, currentStep - 1),
      operatorParticipation: 0.6 + Math.random() * 0.3,
      improvementSuggestions: Math.floor(Math.random() * 50 + 20),
      stepProgress,
    };
  }

  sparePartsManagement(): {
    totalParts: number;
    lowStockItems: string[];
    reorderItems: string[];
    inventoryValue: number;
    turnoverRate: number;
  } {
    const parts = Array.from(this._spareParts.values());
    let totalValue = 0;
    const lowStock: string[] = [];
    const reorder: string[] = [];

    for (const part of parts) {
      const unitCost = 100 + Math.random() * 900;
      totalValue += part.quantity * unitCost;
      if (part.quantity < 5) lowStock.push(part.id);
      if (part.quantity < part.reorderPoint) reorder.push(part.id);
    }

    return {
      totalParts: parts.length,
      lowStockItems: lowStock,
      reorderItems: reorder,
      inventoryValue: totalValue,
      turnoverRate: 3 + Math.random() * 4,
    };
  }

  get equipmentCount(): number {
    return this._equipment.size;
  }

  get maintenanceTaskCount(): number {
    return this._maintenanceTasks.size;
  }

  get alarmCount(): number {
    return this._alarms.size;
  }

  get tpmProgramCount(): number {
    return this._tpmPrograms.size;
  }

  get stats(): {
    totalEquipment: number;
    runningEquipment: number;
    faultEquipment: number;
    maintenanceEquipment: number;
    avgOee: number;
    mtbf: number;
    mttr: number;
    openAlarms: number;
  } {
    return { ...this._stats };
  }

  getEquipment(id: string): Equipment | undefined {
    return this._equipment.get(id);
  }

  getMaintenanceTask(id: string): MaintenanceTask | undefined {
    return this._maintenanceTasks.get(id);
  }

  getEquipmentStatus(id: string): EquipmentStatus | undefined {
    return this._equipmentStatus.get(id);
  }

  getAlarm(id: string): AlarmRecord | undefined {
    return this._alarms.get(id);
  }

  getPredictiveMaintenance(id: string): PredictiveMaintenance | undefined {
    return this._predictiveMaintenance.get(id);
  }

  toPacket(): DataPacket<{
    equipment: number;
    maintenanceTasks: number;
    alarms: number;
    predictiveAnalyses: number;
    oeeAnalyses: number;
    tpmPrograms: number;
    spareParts: number;
    stats: {
      totalEquipment: number;
      runningEquipment: number;
      faultEquipment: number;
      maintenanceEquipment: number;
      avgOee: number;
      mtbf: number;
      mttr: number;
      openAlarms: number;
    };
  }> {
    return {
      id: `eq-mgmt-${Date.now()}-${this._counter}`,
      payload: {
        equipment: this._equipment.size,
        maintenanceTasks: this._maintenanceTasks.size,
        alarms: this._alarms.size,
        predictiveAnalyses: this._predictiveMaintenance.size,
        oeeAnalyses: this._oeeAnalyses.size,
        tpmPrograms: this._tpmPrograms.size,
        spareParts: this._spareParts.size,
        stats: { ...this._stats },
      },
      metadata: {
        createdAt: Date.now(),
        route: ['smart_factory', 'equipment_management', 'result'],
        priority: 0.75,
        phase: 'maintenance',
      },
    };
  }

  reset(): void {
    this._equipment.clear();
    this._maintenanceTasks.clear();
    this._equipmentStatus.clear();
    this._alarms.clear();
    this._predictiveMaintenance.clear();
    this._oeeAnalyses.clear();
    this._tpmPrograms.clear();
    this._spareParts.clear();
    this._counter = 0;
    this._stats = {
      totalEquipment: 0,
      runningEquipment: 0,
      faultEquipment: 0,
      maintenanceEquipment: 0,
      avgOee: 0,
      mtbf: 0,
      mttr: 0,
      openAlarms: 0,
    };
    this._initializeDefaultEquipment();
  }
}
