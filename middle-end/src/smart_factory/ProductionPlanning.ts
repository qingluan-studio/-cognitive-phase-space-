import { DataPacket } from '../shared/types';

export interface ProductionPlan {
  id: string;
  name: string;
  products: string[];
  orders: string[];
  resources: string[];
  timeline: { start: number; end: number };
  status: 'draft' | 'approved' | 'executing' | 'completed';
  priority: number;
}

export interface ProductionSchedule {
  id: string;
  planId: string;
  operations: ScheduledOperation[];
  makespan: number;
  utilization: number;
  bottlenecks: string[];
  lateOrders: number;
}

export interface ScheduledOperation {
  id: string;
  orderId: string;
  product: string;
  resource: string;
  startTime: number;
  endTime: number;
  sequence: number;
  setupTime: number;
  runTime: number;
  status: 'pending' | 'running' | 'completed' | 'delayed';
}

export interface MaterialRequirement {
  itemId: string;
  itemName: string;
  grossRequirement: number;
  scheduledReceipts: number;
  onHand: number;
  netRequirement: number;
  plannedOrderReceipt: number;
  plannedOrderRelease: number;
  leadTime: number;
  level: number;
}

export interface CapacityPlan {
  workCenter: string;
  capacity: number;
  load: number;
  utilization: number;
  overloadHours: number;
  period: string;
}

export interface WorkCenter {
  id: string;
  name: string;
  type: string;
  capacity: number;
  utilization: number;
  efficiency: number;
  machines: string[];
  operators: string[];
}

export class ProductionPlanning {
  private _plans: Map<string, ProductionPlan> = new Map();
  private _schedules: Map<string, ProductionSchedule> = new Map();
  private _workCenters: Map<string, WorkCenter> = new Map();
  private _orders: Map<string, { quantity: number; dueDate: number; priority: number; product: string }> = new Map();
  private _materials: Map<string, MaterialRequirement> = new Map();
  private _capacityPlans: Map<string, CapacityPlan> = new Map();
  private _counter = 0;
  private _stats = {
    totalPlans: 0,
    scheduledOrders: 0,
    avgUtilization: 0,
    onTimeDeliveryRate: 0,
    avgMakespan: 0,
    totalMrpItems: 0,
    capacityOverloads: 0,
  };

  constructor() {
    this._initializeDefaultWorkCenters();
  }

  private _initializeDefaultWorkCenters(): void {
    const defaultCenters = [
      { id: 'wc-001', name: '冲压车间', type: 'fabrication', capacity: 480, efficiency: 0.95, machines: ['press-01', 'press-02'], operators: ['op-01', 'op-02', 'op-03'] },
      { id: 'wc-002', name: '焊接车间', type: 'assembly', capacity: 480, efficiency: 0.9, machines: ['welder-01', 'welder-02', 'welder-03'], operators: ['op-04', 'op-05'] },
      { id: 'wc-003', name: '机加工车间', type: 'machining', capacity: 640, efficiency: 0.92, machines: ['cnc-01', 'cnc-02', 'cnc-03', 'cnc-04'], operators: ['op-06', 'op-07', 'op-08', 'op-09'] },
      { id: 'wc-004', name: '装配车间', type: 'assembly', capacity: 560, efficiency: 0.88, machines: ['assembly-line-01'], operators: ['op-10', 'op-11', 'op-12', 'op-13', 'op-14'] },
      { id: 'wc-005', name: '喷涂车间', type: 'finishing', capacity: 400, efficiency: 0.85, machines: ['paint-booth-01', 'paint-booth-02'], operators: ['op-15', 'op-16', 'op-17'] },
    ];
    for (const wc of defaultCenters) {
      this._workCenters.set(wc.id, { ...wc, utilization: 0 });
    }
  }

  createPlan(name: string, products: string[], startDate: number, endDate: number, priority: number = 5): ProductionPlan {
    const id = `plan-${Date.now()}-${this._counter++}`;
    const plan: ProductionPlan = {
      id,
      name,
      products,
      orders: [],
      resources: Array.from(this._workCenters.keys()),
      timeline: { start: startDate, end: endDate },
      status: 'draft',
      priority,
    };
    this._plans.set(id, plan);
    this._stats.totalPlans++;
    return plan;
  }

  masterProductionSchedule(
    forecast: Record<string, number>,
    capacity: Record<string, number>,
    inventory: Record<string, number>,
    periods: number = 12
  ): {
    mps: Record<string, number[]>;
    capacity: Record<string, number>;
    inventory: Record<string, number[]>;
    periods: number;
    atp: Record<string, number[]>;
  } {
    const mps: Record<string, number[]> = {};
    const invProj: Record<string, number[]> = {};
    const atp: Record<string, number[]> = {};

    for (const product of Object.keys(forecast)) {
      const demand = forecast[product];
      const initialInv = inventory[product] || 0;
      const cap = capacity[product] || demand;

      mps[product] = [];
      invProj[product] = [];
      atp[product] = [];

      let currentInv = initialInv;
      let prevMps = 0;

      for (let i = 0; i < periods; i++) {
        const periodDemand = Math.floor(demand * (0.8 + Math.random() * 0.4));
        const production = Math.min(Math.max(0, periodDemand - currentInv), cap);
        currentInv = currentInv + production - periodDemand;
        mps[product].push(Math.max(0, production));
        invProj[product].push(Math.max(0, currentInv));

        const atpValue = i === 0
          ? initialInv + production - periodDemand
          : production - (periodDemand - prevMps);
        atp[product].push(Math.max(0, atpValue));
        prevMps = production;
      }
    }

    return { mps, capacity, inventory: invProj, periods, atp };
  }

  materialRequirementsPlanning(
    mps: Record<string, number>,
    bom: Record<string, { components: string[]; quantities: Record<string, number>; leadTime: number }>,
    inventory: Record<string, number>,
    scheduledReceipts: Record<string, number> = {}
  ): {
    mrp: Record<string, MaterialRequirement>;
    items: number;
    plannedOrders: number;
    totalNetRequirement: number;
  } {
    const mrp: Record<string, MaterialRequirement> = {};
    let orderCount = 0;
    let totalNet = 0;

    const calculateLevel = (item: string, level: number, visited: Set<string>): number => {
      if (visited.has(item)) return level;
      visited.add(item);
      if (!bom[item]) return level;
      let maxChildLevel = level;
      for (const comp of bom[item].components) {
        maxChildLevel = Math.max(maxChildLevel, calculateLevel(comp, level + 1, visited));
      }
      return maxChildLevel;
    };

    const allItems = new Set<string>();
    for (const item of Object.keys(bom)) {
      allItems.add(item);
      const collect = (it: string) => {
        if (bom[it]) {
          for (const comp of bom[it].components) {
            allItems.add(comp);
            collect(comp);
          }
        }
      };
      collect(item);
    }

    for (const item of allItems) {
      const parentGross = mps[item] || 0;
      const bomItem = bom[item];
      const leadTime = bomItem?.leadTime || 1;
      const level = calculateLevel(item, 0, new Set());

      const gross = parentGross;
      const receipts = scheduledReceipts[item] || 0;
      const onHand = inventory[item] || 0;
      const net = Math.max(0, gross - onHand - receipts);
      const plannedReceipt = net;
      const plannedRelease = net > 0 ? net : 0;

      mrp[item] = {
        itemId: item,
        itemName: item,
        grossRequirement: gross,
        scheduledReceipts: receipts,
        onHand,
        netRequirement: net,
        plannedOrderReceipt: plannedReceipt,
        plannedOrderRelease: plannedRelease,
        leadTime,
        level,
      };

      this._materials.set(item, mrp[item]);
      if (plannedRelease > 0) orderCount++;
      totalNet += net;

      if (bomItem) {
        for (const comp of bomItem.components) {
          const qty = bomItem.quantities[comp] || 1;
          const compGross = plannedRelease * qty;
          if (!mrp[comp]) {
            const compOnHand = inventory[comp] || 0;
            const compReceipts = scheduledReceipts[comp] || 0;
            const compNet = Math.max(0, compGross - compOnHand - compReceipts);
            mrp[comp] = {
              itemId: comp,
              itemName: comp,
              grossRequirement: compGross,
              scheduledReceipts: compReceipts,
              onHand: compOnHand,
              netRequirement: compNet,
              plannedOrderReceipt: compNet,
              plannedOrderRelease: compNet > 0 ? compNet : 0,
              leadTime: bom[comp]?.leadTime || 1,
              level: level + 1,
            };
            this._materials.set(comp, mrp[comp]);
            if (compNet > 0) orderCount++;
            totalNet += compNet;
          } else {
            mrp[comp].grossRequirement += compGross;
            const newNet = Math.max(0, mrp[comp].grossRequirement - mrp[comp].onHand - mrp[comp].scheduledReceipts);
            mrp[comp].netRequirement = newNet;
            mrp[comp].plannedOrderReceipt = newNet;
            mrp[comp].plannedOrderRelease = newNet > 0 ? newNet : 0;
            totalNet += newNet - mrp[comp].netRequirement;
          }
        }
      }
    }

    this._stats.totalMrpItems = allItems.size;
    return { mrp, items: allItems.size, plannedOrders: orderCount, totalNetRequirement: totalNet };
  }

  capacityRequirementsPlanning(
    mrpPlanId: string,
    workCenterIds: string[],
    routing: Record<string, { workCenter: string; runTime: number; setupTime: number }[]>
  ): {
    capacity: Record<string, number>;
    load: Record<string, number>;
    utilization: Record<string, number>;
    bottlenecks: string[];
    periods: Record<string, number[]>;
  } {
    const capacity: Record<string, number> = {};
    const load: Record<string, number> = {};
    const utilization: Record<string, number> = {};
    const bottlenecks: string[] = [];
    const periods: Record<string, number[]> = {};
    const numPeriods = 8;

    for (const wcId of workCenterIds) {
      const wc = this._workCenters.get(wcId);
      capacity[wcId] = wc ? wc.capacity * wc.efficiency : 400;
      load[wcId] = 0;
      periods[wcId] = [];

      for (let i = 0; i < numPeriods; i++) {
        const periodLoad = capacity[wcId] * (0.5 + Math.random() * 0.5);
        periods[wcId].push(periodLoad);
        load[wcId] += periodLoad;
      }

      load[wcId] = load[wcId] / numPeriods;
      utilization[wcId] = load[wcId] / capacity[wcId];

      if (utilization[wcId] > 0.95) {
        bottlenecks.push(wcId);
      }

      this._capacityPlans.set(wcId, {
        workCenter: wcId,
        capacity: capacity[wcId],
        load: load[wcId],
        utilization: utilization[wcId],
        overloadHours: Math.max(0, load[wcId] - capacity[wcId]),
        period: 'weekly',
      });

      if (wc) {
        wc.utilization = utilization[wcId];
      }
    }

    this._stats.capacityOverloads = bottlenecks.length;
    const totalUtil = Object.values(utilization).reduce((s, v) => s + v, 0);
    this._stats.avgUtilization = totalUtil / Object.values(utilization).length;

    return { capacity, load, utilization, bottlenecks, periods };
  }

  finiteCapacityScheduling(
    orders: string[],
    resources: string[],
    operations: Record<string, { resource: string; duration: number }[]>,
    rules: string[] = ['FIFO']
  ): {
    schedule: ProductionSchedule;
    makespan: number;
    utilization: number;
    lateOrders: number;
    ganttData: ScheduledOperation[];
  } {
    const scheduleId = `sched-${Date.now()}-${this._counter++}`;
    const scheduledOps: ScheduledOperation[] = [];
    const resourceEndTimes: Record<string, number> = {};
    const orderEndTimes: Record<string, number> = {};

    for (const res of resources) {
      resourceEndTimes[res] = 0;
    }

    let opSeq = 0;
    let lateOrders = 0;

    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];
      const orderOps = operations[order] || [];
      let orderStartTime = 0;

      for (let j = 0; j < orderOps.length; j++) {
        const op = orderOps[j];
        const resource = op.resource || resources[j % resources.length];
        const setupTime = Math.floor(Math.random() * 30 + 10);
        const runTime = op.duration || Math.floor(Math.random() * 120 + 30);

        const resourceReady = resourceEndTimes[resource] || 0;
        const orderReady = orderEndTimes[order] || 0;
        const startTime = Math.max(resourceReady, orderReady);
        const endTime = startTime + setupTime + runTime;

        const scheduledOp: ScheduledOperation = {
          id: `op-${scheduleId}-${opSeq++}`,
          orderId: order,
          product: `product-${order}`,
          resource,
          startTime,
          endTime,
          sequence: opSeq,
          setupTime,
          runTime,
          status: 'pending',
        };

        scheduledOps.push(scheduledOp);
        resourceEndTimes[resource] = endTime;
        orderEndTimes[order] = endTime;

        if (j === 0) {
          orderStartTime = startTime;
        }
      }

      const dueDate = 500 + i * 100;
      if ((orderEndTimes[order] || 0) > dueDate) {
        lateOrders++;
      }
    }

    const makespan = Math.max(...Object.values(resourceEndTimes), 0);
    const totalCapacity = resources.length * makespan;
    const totalProcessing = scheduledOps.reduce((s, op) => s + op.setupTime + op.runTime, 0);
    const utilization = totalCapacity > 0 ? totalProcessing / totalCapacity : 0;

    const schedule: ProductionSchedule = {
      id: scheduleId,
      planId: 'fcs-plan',
      operations: scheduledOps,
      makespan,
      utilization,
      bottlenecks: resources.filter(r => (resourceEndTimes[r] || 0) > makespan * 0.9),
      lateOrders,
    };

    this._schedules.set(scheduleId, schedule);
    this._stats.scheduledOrders += orders.length;
    this._stats.avgMakespan = makespan;
    this._stats.avgUtilization = utilization;
    this._stats.onTimeDeliveryRate = orders.length > 0 ? (orders.length - lateOrders) / orders.length : 0;

    return { schedule, makespan, utilization, lateOrders, ganttData: scheduledOps };
  }

  jobShopScheduling(
    jobs: string[],
    machines: string[],
    jobRoutes: Record<string, { machine: string; time: number }[]>,
    dispatchingRule: string = 'SPT'
  ): {
    schedule: ProductionSchedule;
    makespan: number;
    utilization: number;
    avgFlowTime: number;
    avgTardiness: number;
  } {
    const scheduleId = `js-${Date.now()}-${this._counter++}`;
    const operations: ScheduledOperation[] = [];
    const machineTimes: Record<string, number> = {};
    const jobTimes: Record<string, number> = {};
    const dueDates: Record<string, number> = {};

    for (const m of machines) {
      machineTimes[m] = 0;
    }
    for (const job of jobs) {
      jobTimes[job] = 0;
      dueDates[job] = 800 + Math.random() * 400;
    }

    let seq = 0;
    const allOps: { job: string; machine: string; time: number; opIndex: number }[] = [];

    for (const job of jobs) {
      const route = jobRoutes[job] || [];
      for (let i = 0; i < route.length; i++) {
        allOps.push({ job, machine: route[i].machine, time: route[i].time, opIndex: i });
      }
    }

    if (dispatchingRule === 'SPT') {
      allOps.sort((a, b) => a.time - b.time);
    } else if (dispatchingRule === 'EDD') {
      allOps.sort((a, b) => (dueDates[a.job] || 0) - (dueDates[b.job] || 0));
    }

    const completedJobOps: Record<string, number> = {};
    for (const op of allOps) {
      const completed = completedJobOps[op.job] || 0;
      if (completed === op.opIndex) {
        const startTime = Math.max(machineTimes[op.machine] || 0, jobTimes[op.job] || 0);
        const endTime = startTime + op.time;

        operations.push({
          id: `op-${scheduleId}-${seq++}`,
          orderId: op.job,
          product: op.job,
          resource: op.machine,
          startTime,
          endTime,
          sequence: seq,
          setupTime: 10,
          runTime: op.time,
          status: 'pending',
        });

        machineTimes[op.machine] = endTime;
        jobTimes[op.job] = endTime;
        completedJobOps[op.job] = completed + 1;
      }
    }

    const makespan = Math.max(...Object.values(machineTimes), 0);
    const totalFlowTime = Object.values(jobTimes).reduce((s, v) => s + v, 0);
    const avgFlowTime = jobs.length > 0 ? totalFlowTime / jobs.length : 0;
    const totalTardiness = jobs.reduce((s, j) => s + Math.max(0, (jobTimes[j] || 0) - (dueDates[j] || 0)), 0);
    const avgTardiness = jobs.length > 0 ? totalTardiness / jobs.length : 0;
    const totalCapacity = machines.length * makespan;
    const totalProcessing = operations.reduce((s, op) => s + op.runTime, 0);
    const utilization = totalCapacity > 0 ? totalProcessing / totalCapacity : 0;

    const schedule: ProductionSchedule = {
      id: scheduleId,
      planId: 'jobshop-plan',
      operations,
      makespan,
      utilization,
      bottlenecks: [],
      lateOrders: jobs.filter(j => (jobTimes[j] || 0) > (dueDates[j] || 0)).length,
    };

    this._schedules.set(scheduleId, schedule);
    return { schedule, makespan, utilization, avgFlowTime, avgTardiness };
  }

  flowShopScheduling(
    jobs: string[],
    machines: string[],
    processingTimes: Record<string, number[]>,
    sequence?: string[]
  ): {
    sequence: string[];
    makespan: number;
    utilization: number;
    idleTime: number;
    completionTimes: Record<string, number[]>;
  } {
    const n = jobs.length;
    const m = machines.length;
    const jobSeq = sequence || [...jobs];

    const completionTimes: Record<string, number[]> = {};
    const machineCompletion = new Array(m).fill(0);

    for (let j = 0; j < n; j++) {
      const job = jobSeq[j];
      completionTimes[job] = [];
      let prevCompletion = 0;

      for (let i = 0; i < m; i++) {
        const startTime = Math.max(machineCompletion[i], prevCompletion);
        const procTime = processingTimes[job]?.[i] || Math.floor(Math.random() * 50 + 20);
        const completionTime = startTime + procTime;
        completionTimes[job].push(completionTime);
        machineCompletion[i] = completionTime;
        prevCompletion = completionTime;
      }
    }

    const makespan = machineCompletion[m - 1];
    const totalCapacity = m * makespan;
    let totalProcessing = 0;
    for (const job of jobSeq) {
      totalProcessing += (processingTimes[job] || []).reduce((s, v) => s + v, 0);
    }
    const utilization = totalCapacity > 0 ? totalProcessing / totalCapacity : 0;

    let totalIdle = 0;
    for (let i = 0; i < m; i++) {
      totalIdle += makespan - machineCompletion[i];
    }

    return {
      sequence: jobSeq,
      makespan,
      utilization,
      idleTime: totalIdle,
      completionTimes,
    };
  }

  lineBalancing(
    assemblyLine: string,
    tasks: string[],
    taskTimes: Record<string, number>,
    precedence: Record<string, string[]>,
    cycleTime: number
  ): {
    stations: number;
    tasksPerStation: string[][];
    cycleTime: number;
    efficiency: number;
    balanceDelay: number;
    smoothnessIndex: number;
  } {
    const totalTime = Object.values(taskTimes).reduce((s, v) => s + v, 0);
    const minStations = Math.ceil(totalTime / cycleTime);
    const stations = Math.max(minStations, Math.ceil(tasks.length / 2));

    const assigned = new Set<string>();
    const tasksPerStation: string[][] = [];

    for (let s = 0; s < stations; s++) {
      const stationTasks: string[] = [];
      let stationTime = 0;

      for (const task of tasks) {
        if (assigned.has(task)) continue;

        const preds = precedence[task] || [];
        const allPredsAssigned = preds.every(p => assigned.has(p));
        if (!allPredsAssigned) continue;

        const time = taskTimes[task] || 10;
        if (stationTime + time <= cycleTime) {
          stationTasks.push(task);
          assigned.add(task);
          stationTime += time;
        }
      }

      tasksPerStation.push(stationTasks);
    }

    const stationTimes = tasksPerStation.map(s =>
      s.reduce((sum, t) => sum + (taskTimes[t] || 0), 0)
    );

    const maxStationTime = Math.max(...stationTimes, 0);
    const efficiency = stations > 0 ? totalTime / (stations * maxStationTime) : 0;
    const balanceDelay = 1 - efficiency;

    const avgTime = stationTimes.length > 0 ? totalTime / stationTimes.length : 0;
    const variance = stationTimes.reduce((s, t) => s + Math.pow(t - avgTime, 2), 0);
    const smoothnessIndex = Math.sqrt(variance / stationTimes.length);

    return {
      stations,
      tasksPerStation,
      cycleTime,
      efficiency,
      balanceDelay,
      smoothnessIndex,
    };
  }

  addWorkCenter(id: string, name: string, type: string, capacity: number, efficiency: number): WorkCenter {
    const wc: WorkCenter = {
      id,
      name,
      type,
      capacity,
      utilization: 0,
      efficiency,
      machines: [],
      operators: [],
    };
    this._workCenters.set(id, wc);
    return wc;
  }

  addOrder(orderId: string, product: string, quantity: number, dueDate: number, priority: number): void {
    this._orders.set(orderId, { quantity, dueDate, priority, product });
  }

  get planCount(): number {
    return this._plans.size;
  }

  get scheduleCount(): number {
    return this._schedules.size;
  }

  get workCenterCount(): number {
    return this._workCenters.size;
  }

  get orderCount(): number {
    return this._orders.size;
  }

  get materialCount(): number {
    return this._materials.size;
  }

  get stats(): {
    totalPlans: number;
    scheduledOrders: number;
    avgUtilization: number;
    onTimeDeliveryRate: number;
    avgMakespan: number;
    totalMrpItems: number;
    capacityOverloads: number;
  } {
    return { ...this._stats };
  }

  getPlan(id: string): ProductionPlan | undefined {
    return this._plans.get(id);
  }

  getSchedule(id: string): ProductionSchedule | undefined {
    return this._schedules.get(id);
  }

  getWorkCenter(id: string): WorkCenter | undefined {
    return this._workCenters.get(id);
  }

  toPacket(): DataPacket<{
    plans: number;
    schedules: number;
    workCenters: number;
    orders: number;
    materials: number;
    stats: {
      totalPlans: number;
      scheduledOrders: number;
      avgUtilization: number;
      onTimeDeliveryRate: number;
      avgMakespan: number;
      totalMrpItems: number;
      capacityOverloads: number;
    };
  }> {
    return {
      id: `prod-plan-${Date.now()}-${this._counter}`,
      payload: {
        plans: this._plans.size,
        schedules: this._schedules.size,
        workCenters: this._workCenters.size,
        orders: this._orders.size,
        materials: this._materials.size,
        stats: { ...this._stats },
      },
      metadata: {
        createdAt: Date.now(),
        route: ['smart_factory', 'production_planning', 'result'],
        priority: 0.7,
        phase: 'planning',
      },
    };
  }

  reset(): void {
    this._plans.clear();
    this._schedules.clear();
    this._workCenters.clear();
    this._orders.clear();
    this._materials.clear();
    this._capacityPlans.clear();
    this._counter = 0;
    this._stats = {
      totalPlans: 0,
      scheduledOrders: 0,
      avgUtilization: 0,
      onTimeDeliveryRate: 0,
      avgMakespan: 0,
      totalMrpItems: 0,
      capacityOverloads: 0,
    };
    this._initializeDefaultWorkCenters();
  }
}
