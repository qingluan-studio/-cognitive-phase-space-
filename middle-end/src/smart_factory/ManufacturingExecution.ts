import { DataPacket } from '../shared/types';

export interface WorkOrder {
  id: string;
  product: string;
  quantity: number;
  priority: number;
  status: 'created' | 'released' | 'in_progress' | 'paused' | 'completed' | 'cancelled';
  plannedStart: number;
  plannedEnd: number;
  actualStart?: number;
  actualEnd?: number;
  workCenter: string;
  bomVersion: string;
  routingVersion: string;
}

export interface ProductionProcess {
  id: string;
  workOrderId: string;
  operationId: string;
  operationName: string;
  workCenter: string;
  status: 'pending' | 'setup' | 'running' | 'quality_check' | 'completed' | 'scrapped';
  startTime?: number;
  endTime?: number;
  operator: string;
  inputQuantity: number;
  outputQuantity: number;
  scrapQuantity: number;
  reworkQuantity: number;
}

export interface QualityTrace {
  id: string;
  product: string;
  serialNumber: string;
  workOrderId: string;
  operations: string[];
  inspectionResults: Record<string, 'pass' | 'fail' | 'hold'>;
  rawMaterials: string[];
  equipment: string[];
  operators: string[];
  timestamp: number;
}

export interface ProductionReport {
  date: number;
  workCenter: string;
  output: number;
  scrap: number;
  rework: number;
  downtime: number;
  efficiency: number;
  operators: string[];
}

export interface MachineState {
  id: string;
  workCenter: string;
  status: 'idle' | 'running' | 'setup' | 'downtime' | 'maintenance';
  currentOrder?: string;
  currentOperation?: string;
  output: number;
  cycleTime: number;
  lastChange: number;
}

export interface LaborTracking {
  id: string;
  operator: string;
  workCenter: string;
  workOrderId: string;
  operationId: string;
  startTime: number;
  endTime?: number;
  hours: number;
  type: 'direct' | 'indirect' | 'setup' | 'maintenance';
}

export class ManufacturingExecution {
  private _workOrders: Map<string, WorkOrder> = new Map();
  private _processes: Map<string, ProductionProcess> = new Map();
  private _traces: Map<string, QualityTrace> = new Map();
  private _reports: Map<string, ProductionReport> = new Map();
  private _machines: Map<string, MachineState> = new Map();
  private _laborRecords: Map<string, LaborTracking> = new Map();
  private _productionData: Map<string, { output: number; scrap: number; rework: number }> = new Map();
  private _counter = 0;
  private _stats = {
    totalWorkOrders: 0,
    completedOrders: 0,
    inProgressOrders: 0,
    totalOutput: 0,
    totalScrap: 0,
    scrapRate: 0,
    avgCycleTime: 0,
    oee: 0,
  };

  constructor() {
    this._initializeDefaultMachines();
  }

  private _initializeDefaultMachines(): void {
    const machines = [
      { id: 'm-001', workCenter: 'wc-001', cycleTime: 45 },
      { id: 'm-002', workCenter: 'wc-001', cycleTime: 40 },
      { id: 'm-003', workCenter: 'wc-002', cycleTime: 60 },
      { id: 'm-004', workCenter: 'wc-003', cycleTime: 30 },
      { id: 'm-005', workCenter: 'wc-003', cycleTime: 35 },
      { id: 'm-006', workCenter: 'wc-003', cycleTime: 28 },
      { id: 'm-007', workCenter: 'wc-004', cycleTime: 90 },
      { id: 'm-008', workCenter: 'wc-005', cycleTime: 120 },
    ];
    for (const m of machines) {
      this._machines.set(m.id, {
        id: m.id,
        workCenter: m.workCenter,
        status: 'idle',
        output: 0,
        cycleTime: m.cycleTime,
        lastChange: Date.now(),
      });
    }
  }

  createWorkOrder(
    product: string,
    quantity: number,
    workCenter: string,
    plannedStart: number,
    plannedEnd: number,
    priority: number = 5,
    bomVersion: string = 'v1.0',
    routingVersion: string = 'v1.0'
  ): WorkOrder {
    const id = `wo-${Date.now()}-${this._counter++}`;
    const wo: WorkOrder = {
      id,
      product,
      quantity,
      priority,
      status: 'created',
      plannedStart,
      plannedEnd,
      workCenter,
      bomVersion,
      routingVersion,
    };
    this._workOrders.set(id, wo);
    this._stats.totalWorkOrders++;
    return wo;
  }

  releaseWorkOrder(workOrderId: string): WorkOrder | null {
    const wo = this._workOrders.get(workOrderId);
    if (!wo || wo.status !== 'created') return null;
    wo.status = 'released';
    wo.actualStart = Date.now();
    return wo;
  }

  startOperation(
    workOrderId: string,
    operationId: string,
    operationName: string,
    workCenter: string,
    operator: string,
    inputQuantity: number
  ): ProductionProcess | null {
    const wo = this._workOrders.get(workOrderId);
    if (!wo) return null;

    if (wo.status === 'released') {
      wo.status = 'in_progress';
      this._stats.inProgressOrders++;
    }

    const procId = `proc-${Date.now()}-${this._counter++}`;
    const proc: ProductionProcess = {
      id: procId,
      workOrderId,
      operationId,
      operationName,
      workCenter,
      status: 'running',
      startTime: Date.now(),
      operator,
      inputQuantity,
      outputQuantity: 0,
      scrapQuantity: 0,
      reworkQuantity: 0,
    };
    this._processes.set(procId, proc);

    const machine = Array.from(this._machines.values()).find(m => m.workCenter === workCenter && m.status === 'idle');
    if (machine) {
      machine.status = 'running';
      machine.currentOrder = workOrderId;
      machine.currentOperation = operationId;
      machine.lastChange = Date.now();
    }

    this._startLaborTracking(operator, workCenter, workOrderId, operationId, 'direct');

    return proc;
  }

  completeOperation(processId: string, outputQty: number, scrapQty: number = 0, reworkQty: number = 0): ProductionProcess | null {
    const proc = this._processes.get(processId);
    if (!proc || proc.status !== 'running') return null;

    proc.status = 'completed';
    proc.endTime = Date.now();
    proc.outputQuantity = outputQty;
    proc.scrapQuantity = scrapQty;
    proc.reworkQuantity = reworkQty;

    this._stats.totalOutput += outputQty;
    this._stats.totalScrap += scrapQty;
    const total = outputQty + scrapQty;
    if (total > 0) {
      this._stats.scrapRate = this._stats.totalScrap / (this._stats.totalOutput + this._stats.totalScrap);
    }

    const labor = Array.from(this._laborRecords.values()).find(
      l => l.workOrderId === proc.workOrderId && l.operationId === proc.operationId && !l.endTime
    );
    if (labor) {
      labor.endTime = Date.now();
      labor.hours = (labor.endTime - labor.startTime) / 3600000;
    }

    const machine = Array.from(this._machines.values()).find(
      m => m.currentOrder === proc.workOrderId && m.currentOperation === proc.operationId
    );
    if (machine) {
      machine.status = 'idle';
      machine.currentOrder = undefined;
      machine.currentOperation = undefined;
      machine.output += outputQty;
      machine.lastChange = Date.now();
    }

    return proc;
  }

  completeWorkOrder(workOrderId: string): WorkOrder | null {
    const wo = this._workOrders.get(workOrderId);
    if (!wo) return null;

    wo.status = 'completed';
    wo.actualEnd = Date.now();
    this._stats.completedOrders++;
    this._stats.inProgressOrders--;

    this._generateProductionReport(workOrderId);
    this._generateQualityTrace(workOrderId);

    return wo;
  }

  private _startLaborTracking(
    operator: string,
    workCenter: string,
    workOrderId: string,
    operationId: string,
    type: 'direct' | 'indirect' | 'setup' | 'maintenance'
  ): LaborTracking {
    const id = `lab-${Date.now()}-${this._counter++}`;
    const labor: LaborTracking = {
      id,
      operator,
      workCenter,
      workOrderId,
      operationId,
      startTime: Date.now(),
      hours: 0,
      type,
    };
    this._laborRecords.set(id, labor);
    return labor;
  }

  recordSetupTime(workOrderId: string, operationId: string, operator: string, duration: number): void {
    const machine = Array.from(this._machines.values()).find(m => m.workCenter === 'wc-001');
    if (machine) {
      machine.status = 'setup';
      machine.lastChange = Date.now();
    }
    this._startLaborTracking(operator, 'wc-001', workOrderId, operationId, 'setup');
  }

  recordDowntime(machineId: string, reason: string, duration: number): void {
    const machine = this._machines.get(machineId);
    if (!machine) return;

    machine.status = 'downtime';
    machine.lastChange = Date.now();

    const key = `${machine.workCenter}-${Date.now()}`;
    const current = this._productionData.get(key) || { output: 0, scrap: 0, rework: 0 };
    this._productionData.set(key, current);
  }

  productionTracking(
    workCenter: string,
    period: 'hour' | 'shift' | 'day' = 'shift'
  ): {
    output: number;
    target: number;
    achievement: number;
    scrap: number;
    rework: number;
    uptime: number;
    downtime: number;
  } {
    const output = Math.floor(Math.random() * 500 + 300);
    const target = 600;
    const scrap = Math.floor(output * (0.02 + Math.random() * 0.03));
    const rework = Math.floor(output * (0.01 + Math.random() * 0.02));
    const uptime = 7 * 60;
    const downtime = 60;

    return {
      output,
      target,
      achievement: output / target,
      scrap,
      rework,
      uptime,
      downtime,
    };
  }

  realTimeMonitoring(workCenters: string[]): {
    workCenters: Record<string, {
      status: string;
      output: number;
      efficiency: number;
      alarms: number;
      operators: number;
    }>;
    overallOutput: number;
    overallEfficiency: number;
    activeAlarms: number;
  } {
    const wcData: Record<string, {
      status: string;
      output: number;
      efficiency: number;
      alarms: number;
      operators: number;
    }> = {};

    let totalOutput = 0;
    let totalEff = 0;
    let totalAlarms = 0;

    for (const wc of workCenters) {
      const machines = Array.from(this._machines.values()).filter(m => m.workCenter === wc);
      const running = machines.filter(m => m.status === 'running').length;
      const output = machines.reduce((s, m) => s + m.output, 0);
      const efficiency = machines.length > 0 ? running / machines.length : 0;

      wcData[wc] = {
        status: running > 0 ? 'running' : 'idle',
        output,
        efficiency,
        alarms: Math.floor(Math.random() * 2),
        operators: Math.floor(Math.random() * 4 + 1),
      };

      totalOutput += output;
      totalEff += efficiency;
      totalAlarms += wcData[wc].alarms;
    }

    return {
      workCenters: wcData,
      overallOutput: totalOutput,
      overallEfficiency: workCenters.length > 0 ? totalEff / workCenters.length : 0,
      activeAlarms: totalAlarms,
    };
  }

  andonSystem(line: string, stations: string[]): {
    line: string;
    stations: Record<string, {
      status: 'normal' | 'warning' | 'critical' | 'stopped';
      issues: string[];
      responseTime: number;
    }>;
    overallStatus: string;
    activeIssues: number;
    avgResponseTime: number;
  } {
    const stationData: Record<string, {
      status: 'normal' | 'warning' | 'critical' | 'stopped';
      issues: string[];
      responseTime: number;
    }> = {};

    let totalIssues = 0;
    let totalResponse = 0;
    let worstStatus = 'normal';

    for (const station of stations) {
      const rand = Math.random();
      let status: 'normal' | 'warning' | 'critical' | 'stopped';
      let issues: string[] = [];

      if (rand < 0.6) {
        status = 'normal';
      } else if (rand < 0.85) {
        status = 'warning';
        issues = ['quality_warning'];
      } else if (rand < 0.95) {
        status = 'critical';
        issues = ['machine_fault', 'material_shortage'];
      } else {
        status = 'stopped';
        issues = ['emergency_stop'];
      }

      const responseTime = Math.random() * 10 + 2;
      stationData[station] = { status, issues, responseTime };
      totalIssues += issues.length;
      totalResponse += responseTime;

      if (status === 'stopped') worstStatus = 'stopped';
      else if (status === 'critical' && worstStatus !== 'stopped') worstStatus = 'critical';
      else if (status === 'warning' && worstStatus === 'normal') worstStatus = 'warning';
    }

    return {
      line,
      stations: stationData,
      overallStatus: worstStatus,
      activeIssues: totalIssues,
      avgResponseTime: stations.length > 0 ? totalResponse / stations.length : 0,
    };
  }

  private _generateProductionReport(workOrderId: string): void {
    const wo = this._workOrders.get(workOrderId);
    if (!wo) return;

    const reportId = `rpt-${Date.now()}-${this._counter++}`;
    const procs = Array.from(this._processes.values()).filter(p => p.workOrderId === workOrderId);

    const report: ProductionReport = {
      date: Date.now(),
      workCenter: wo.workCenter,
      output: procs.reduce((s, p) => s + p.outputQuantity, 0),
      scrap: procs.reduce((s, p) => s + p.scrapQuantity, 0),
      rework: procs.reduce((s, p) => s + p.reworkQuantity, 0),
      downtime: Math.floor(Math.random() * 60),
      efficiency: 0.85 + Math.random() * 0.1,
      operators: [...new Set(procs.map(p => p.operator))],
    };

    this._reports.set(reportId, report);
  }

  private _generateQualityTrace(workOrderId: string): void {
    const wo = this._workOrders.get(workOrderId);
    if (!wo) return;

    const traceId = `trace-${Date.now()}-${this._counter++}`;
    const procs = Array.from(this._processes.values()).filter(p => p.workOrderId === workOrderId);

    const inspections: Record<string, 'pass' | 'fail' | 'hold'> = {};
    for (const p of procs) {
      inspections[p.operationId] = p.scrapQuantity === 0 ? 'pass' : 'hold';
    }

    const trace: QualityTrace = {
      id: traceId,
      product: wo.product,
      serialNumber: `SN-${traceId}`,
      workOrderId,
      operations: procs.map(p => p.operationId),
      inspectionResults: inspections,
      rawMaterials: ['mat-001', 'mat-002', 'mat-003'],
      equipment: Array.from(new Set(procs.map(p => p.workCenter))),
      operators: [...new Set(procs.map(p => p.operator))],
      timestamp: Date.now(),
    };

    this._traces.set(traceId, trace);
  }

  genealogyTracking(serialNumber: string): {
    product: string;
    serialNumber: string;
    parent?: string;
    children: string[];
    materials: string[];
    processes: string[];
    traceabilityLevel: number;
  } | null {
    const trace = Array.from(this._traces.values()).find(t => t.serialNumber === serialNumber);
    if (!trace) return null;

    return {
      product: trace.product,
      serialNumber: trace.serialNumber,
      children: [`SN-${Date.now()}-1`, `SN-${Date.now()}-2`],
      materials: trace.rawMaterials,
      processes: trace.operations,
      traceabilityLevel: 5,
    };
  }

  kpiCalculation(period: 'day' | 'week' | 'month'): {
    oee: number;
    availability: number;
    performance: number;
    quality: number;
    throughput: number;
    cycleTime: number;
    firstPassYield: number;
  } {
    const availability = 0.9 + Math.random() * 0.08;
    const performance = 0.85 + Math.random() * 0.12;
    const quality = 0.95 + Math.random() * 0.04;
    const oee = availability * performance * quality;
    this._stats.oee = oee;

    return {
      oee,
      availability,
      performance,
      quality,
      throughput: Math.floor(Math.random() * 200 + 500),
      cycleTime: Math.floor(Math.random() * 30 + 40),
      firstPassYield: quality,
    };
  }

  workOrderStatus(workOrderId: string): {
    progress: number;
    completedOperations: number;
    totalOperations: number;
    currentOperation?: string;
    quantityCompleted: number;
    quantityScrapped: number;
    estimatedCompletion?: number;
  } | null {
    const wo = this._workOrders.get(workOrderId);
    if (!wo) return null;

    const procs = Array.from(this._processes.values()).filter(p => p.workOrderId === workOrderId);
    const completed = procs.filter(p => p.status === 'completed').length;
    const total = Math.max(procs.length, 5);
    const progress = total > 0 ? completed / total : 0;

    return {
      progress,
      completedOperations: completed,
      totalOperations: total,
      currentOperation: procs.find(p => p.status === 'running')?.operationName,
      quantityCompleted: procs.reduce((s, p) => s + p.outputQuantity, 0),
      quantityScrapped: procs.reduce((s, p) => s + p.scrapQuantity, 0),
      estimatedCompletion: wo.plannedEnd,
    };
  }

  operatorPerformance(operatorId: string, period: 'day' | 'week'): {
    operator: string;
    totalHours: number;
    productiveHours: number;
    efficiency: number;
    output: number;
    qualityRate: number;
    workOrders: number;
  } {
    const labor = Array.from(this._laborRecords.values()).filter(l => l.operator === operatorId);
    const totalHours = labor.reduce((s, l) => s + l.hours, 0) + 40;
    const productiveHours = totalHours * (0.8 + Math.random() * 0.15);

    return {
      operator: operatorId,
      totalHours,
      productiveHours,
      efficiency: productiveHours / totalHours,
      output: Math.floor(Math.random() * 200 + 100),
      qualityRate: 0.95 + Math.random() * 0.04,
      workOrders: labor.length + Math.floor(Math.random() * 5),
    };
  }

  get workOrderCount(): number {
    return this._workOrders.size;
  }

  get processCount(): number {
    return this._processes.size;
  }

  get traceCount(): number {
    return this._traces.size;
  }

  get machineCount(): number {
    return this._machines.size;
  }

  get laborRecordCount(): number {
    return this._laborRecords.size;
  }

  get stats(): {
    totalWorkOrders: number;
    completedOrders: number;
    inProgressOrders: number;
    totalOutput: number;
    totalScrap: number;
    scrapRate: number;
    avgCycleTime: number;
    oee: number;
  } {
    return { ...this._stats };
  }

  getWorkOrder(id: string): WorkOrder | undefined {
    return this._workOrders.get(id);
  }

  getProcess(id: string): ProductionProcess | undefined {
    return this._processes.get(id);
  }

  getTrace(id: string): QualityTrace | undefined {
    return this._traces.get(id);
  }

  getMachine(id: string): MachineState | undefined {
    return this._machines.get(id);
  }

  toPacket(): DataPacket<{
    workOrders: number;
    processes: number;
    traces: number;
    machines: number;
    laborRecords: number;
    reports: number;
    stats: {
      totalWorkOrders: number;
      completedOrders: number;
      inProgressOrders: number;
      totalOutput: number;
      totalScrap: number;
      scrapRate: number;
      avgCycleTime: number;
      oee: number;
    };
  }> {
    return {
      id: `mes-${Date.now()}-${this._counter}`,
      payload: {
        workOrders: this._workOrders.size,
        processes: this._processes.size,
        traces: this._traces.size,
        machines: this._machines.size,
        laborRecords: this._laborRecords.size,
        reports: this._reports.size,
        stats: { ...this._stats },
      },
      metadata: {
        createdAt: Date.now(),
        route: ['smart_factory', 'manufacturing_execution', 'result'],
        priority: 0.8,
        phase: 'execution',
      },
    };
  }

  reset(): void {
    this._workOrders.clear();
    this._processes.clear();
    this._traces.clear();
    this._reports.clear();
    this._laborRecords.clear();
    this._productionData.clear();
    this._counter = 0;
    this._stats = {
      totalWorkOrders: 0,
      completedOrders: 0,
      inProgressOrders: 0,
      totalOutput: 0,
      totalScrap: 0,
      scrapRate: 0,
      avgCycleTime: 0,
      oee: 0,
    };
    this._initializeDefaultMachines();
  }
}
