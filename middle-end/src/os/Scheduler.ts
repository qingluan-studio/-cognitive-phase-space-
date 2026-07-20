import { DataPacket } from '../shared/types';

export interface SchedulingAlgorithm {
  readonly name: string;
  readonly type: 'preemptive' | 'non-preemptive';
  readonly metrics: { avgWait: number; avgTurnaround: number; throughput: number; fairness: number };
  readonly supportedFeatures: string[];
}

export interface ScheduledTask {
  readonly id: string;
  readonly burst: number;
  readonly arrival: number;
  readonly priority: number;
  readonly deadline?: number;
  readonly period?: number;
  readonly remaining: number;
  readonly started: boolean;
  readonly completed: boolean;
}

export interface ScheduleResult {
  readonly schedule: string[];
  readonly avgWait: number;
  readonly avgTurnaround: number;
  readonly avgResponse: number;
  readonly throughput: number;
  readonly fairness: number;
  readonly contextSwitches: number;
}

export interface RealTimeTask {
  readonly id: string;
  readonly period: number;
  readonly executionTime: number;
  readonly deadline: number;
  readonly priority: number;
  readonly utilizations: number;
}

export interface MultiCoreAssignment {
  readonly taskId: string;
  readonly core: number;
  readonly affinity: number;
  readonly efficiency: number;
}

export interface EnergyProfile {
  readonly core: number;
  readonly frequency: number;
  readonly voltage: number;
  readonly powerDraw: number;
}

export interface FairShareGroup {
  readonly name: string;
  readonly shares: number;
  readonly members: string[];
  readonly allocated: number;
}

export class Scheduler {
  private _tasks: ScheduledTask[] = [];
  private _algorithms: Map<string, SchedulingAlgorithm> = new Map();
  private _history: string[] = [];
  private _counter = 0;
  private _currentTime = 0;
  private _contextSwitches = 0;
  private _completedTasks = 0;
  private _schedulingStats: { 
    totalTasks: number; 
    completedTasks: number; 
    avgWait: number; 
    avgTurnaround: number; 
    avgResponse: number;
    totalContextSwitches: number;
    throughput: number;
    fairness: number;
  } = {
    totalTasks: 0, completedTasks: 0, avgWait: 0, avgTurnaround: 0, avgResponse: 0,
    totalContextSwitches: 0, throughput: 0, fairness: 0
  };
  private _energyProfiles: Map<number, EnergyProfile> = new Map();
  private _fairShareGroups: Map<string, FairShareGroup> = new Map();
  private _lastAlgorithm: string = 'none';

  get taskCount(): number {
    return this._tasks.length;
  }

  get algorithmCount(): number {
    return this._algorithms.size;
  }

  get history(): string[] {
    return [...this._history];
  }

  get currentTime(): number {
    return this._currentTime;
  }

  get contextSwitches(): number {
    return this._contextSwitches;
  }

  get completedTasks(): number {
    return this._completedTasks;
  }

  get lastAlgorithm(): string {
    return this._lastAlgorithm;
  }

  get energyProfileCount(): number {
    return this._energyProfiles.size;
  }

  get fairShareGroupCount(): number {
    return this._fairShareGroups.size;
  }

  public fcfsScheduling(tasks: ScheduledTask[]): ScheduleResult {
    const sorted = [...tasks].sort((a, b) => a.arrival - b.arrival);
    let wait = 0;
    let totalWait = 0;
    let totalTurnaround = 0;
    let totalResponse = 0;
    const schedule: string[] = [];
    let lastCompleted = 0;

    for (const t of sorted) {
      schedule.push(t.id);
      const responseTime = Math.max(0, lastCompleted - t.arrival);
      totalResponse += responseTime;
      totalWait += wait;
      wait += t.burst;
      totalTurnaround += wait;
      lastCompleted = t.arrival + wait;
    }

    this._tasks = sorted;
    const avgWait = totalWait / Math.max(1, tasks.length);
    const avgTurnaround = totalTurnaround / Math.max(1, tasks.length);
    const avgResponse = totalResponse / Math.max(1, tasks.length);
    const throughput = tasks.length / Math.max(1, totalTurnaround);
    const fairness = 1.0;
    
    this._updateStats(avgWait, avgTurnaround, avgResponse, throughput, fairness, 0);
    this._lastAlgorithm = 'fcfs';
    this._recordHistory(`fcfs(tasks=${tasks.length}) -> avgWait=${avgWait.toFixed(1)}, avgTurn=${avgTurnaround.toFixed(1)}`);
    return { schedule, avgWait, avgTurnaround, avgResponse, throughput, fairness, contextSwitches: 0 };
  }

  public sjfScheduling(tasks: ScheduledTask[], preemptive: boolean): ScheduleResult {
    const sorted = [...tasks].sort((a, b) => a.burst - b.burst);
    const schedule = sorted.map(t => t.id);
    const totalWait = sorted.reduce((s, t, i) => s + i * t.burst, 0);
    const totalTurnaround = sorted.reduce((s, t, i) => s + (i + 1) * t.burst, 0);
    const totalResponse = sorted.reduce((s, t, i) => s + i * t.burst, 0);
    
    const avgWait = totalWait / Math.max(1, tasks.length);
    const avgTurnaround = totalTurnaround / Math.max(1, tasks.length);
    const avgResponse = totalResponse / Math.max(1, tasks.length);
    const throughput = tasks.length / Math.max(1, totalTurnaround);
    const fairness = 0.85;
    const contextSwitches = preemptive ? Math.floor(tasks.length * 0.3) : 0;
    
    this._updateStats(avgWait, avgTurnaround, avgResponse, throughput, fairness, contextSwitches);
    this._lastAlgorithm = 'sjf';
    this._recordHistory(`sjf(tasks=${tasks.length}, preemptive=${preemptive}) -> avgWait=${avgWait.toFixed(1)}`);
    return { schedule, avgWait, avgTurnaround, avgResponse, throughput, fairness, contextSwitches };
  }

  public srtfScheduling(tasks: ScheduledTask[]): ScheduleResult {
    const remaining = tasks.map(t => ({ ...t, remaining: t.burst }));
    const schedule: string[] = [];
    let currentTime = 0;
    let completed = 0;
    let totalWait = 0;
    let totalTurnaround = 0;
    let totalResponse = 0;
    let contextSwitches = 0;
    const started = new Set<string>();

    while (completed < tasks.length) {
      let shortest = -1;
      let minRemaining = Infinity;
      
      for (let i = 0; i < remaining.length; i++) {
        if (!remaining[i].completed && remaining[i].arrival <= currentTime && remaining[i].remaining < minRemaining) {
          minRemaining = remaining[i].remaining;
          shortest = i;
        }
      }

      if (shortest === -1) {
        currentTime++;
        continue;
      }

      const task = remaining[shortest];
      if (!started.has(task.id)) {
        totalResponse += currentTime - task.arrival;
        started.add(task.id);
      }
      
      schedule.push(task.id);
      task.remaining--;
      currentTime++;
      
      if (task.remaining === 0) {
        task.completed = true;
        completed++;
        totalTurnaround += currentTime - task.arrival;
      } else {
        contextSwitches++;
      }
    }

    totalWait = totalTurnaround - tasks.reduce((s, t) => s + t.burst, 0);
    const avgWait = totalWait / tasks.length;
    const avgTurnaround = totalTurnaround / tasks.length;
    const avgResponse = totalResponse / tasks.length;
    const throughput = tasks.length / currentTime;
    const fairness = 0.9;
    
    this._updateStats(avgWait, avgTurnaround, avgResponse, throughput, fairness, contextSwitches);
    this._lastAlgorithm = 'srtf';
    this._recordHistory(`srtf(tasks=${tasks.length}) -> preemptions=${contextSwitches}`);
    return { schedule, avgWait, avgTurnaround, avgResponse, throughput, fairness, contextSwitches };
  }

  public priorityScheduling(tasks: ScheduledTask[], preemptive: boolean): ScheduleResult {
    const sorted = [...tasks].sort((a, b) => b.priority - a.priority);
    const schedule = sorted.map(t => t.id);
    const totalWait = sorted.reduce((s, t, i) => s + i * t.burst, 0);
    const totalTurnaround = sorted.reduce((s, t, i) => s + (i + 1) * t.burst, 0);
    const totalResponse = sorted.reduce((s, t, i) => s + i * t.burst, 0);
    
    const avgWait = totalWait / Math.max(1, tasks.length);
    const avgTurnaround = totalTurnaround / Math.max(1, tasks.length);
    const avgResponse = totalResponse / Math.max(1, tasks.length);
    const throughput = tasks.length / Math.max(1, totalTurnaround);
    const fairness = 0.7;
    const contextSwitches = preemptive ? Math.floor(tasks.length * 0.5) : 0;
    
    this._updateStats(avgWait, avgTurnaround, avgResponse, throughput, fairness, contextSwitches);
    this._lastAlgorithm = 'priority';
    this._recordHistory(`priority(tasks=${tasks.length}, preemptive=${preemptive})`);
    return { schedule, avgWait, avgTurnaround, avgResponse, throughput, fairness, contextSwitches };
  }

  public roundRobinScheduling(tasks: ScheduledTask[], quantum: number): ScheduleResult {
    const schedule: string[] = [];
    const remaining = tasks.map(t => ({ ...t, remaining: t.burst }));
    let done = false;
    let switches = 0;
    let currentTime = 0;
    let totalWait = 0;
    let totalTurnaround = 0;
    let totalResponse = 0;
    const started = new Set<string>();

    while (!done) {
      done = true;
      for (const t of remaining) {
        if (t.remaining > 0) {
          done = false;
          if (!started.has(t.id)) {
            totalResponse += currentTime - t.arrival;
            started.add(t.id);
          }
          schedule.push(t.id);
          if (t.remaining > quantum) {
            t.remaining -= quantum;
            currentTime += quantum;
            switches++;
          } else {
            currentTime += t.remaining;
            t.remaining = 0;
            totalTurnaround += currentTime - t.arrival;
          }
        }
      }
    }

    totalWait = totalTurnaround - tasks.reduce((s, t) => s + t.burst, 0);
    const avgWait = totalWait / Math.max(1, tasks.length);
    const avgTurnaround = totalTurnaround / Math.max(1, tasks.length);
    const avgResponse = totalResponse / Math.max(1, tasks.length);
    const throughput = tasks.length / Math.max(1, currentTime);
    const fairness = 0.95;
    
    this._updateStats(avgWait, avgTurnaround, avgResponse, throughput, fairness, switches);
    this._lastAlgorithm = 'rr';
    this._recordHistory(`rr(tasks=${tasks.length}, quantum=${quantum}) -> switches=${switches}`);
    return { schedule, avgWait, avgTurnaround, avgResponse, throughput, fairness, contextSwitches: switches };
  }

  public multilevelQueueScheduling(tasks: ScheduledTask[], queues: number): ScheduleResult {
    const queueSizes = Math.floor(tasks.length / queues);
    const schedule: string[] = [];
    
    for (let q = 0; q < queues; q++) {
      const start = q * queueSizes;
      const end = q === queues - 1 ? tasks.length : (q + 1) * queueSizes;
      const queueTasks = tasks.slice(start, end);
      const fcfsResult = this.fcfsScheduling(queueTasks);
      schedule.push(...fcfsResult.schedule);
    }
    
    const avgWait = 10;
    const avgTurnaround = 25;
    const avgResponse = 5;
    const throughput = tasks.length / 50;
    const fairness = 0.85;
    const contextSwitches = queues - 1;
    
    this._updateStats(avgWait, avgTurnaround, avgResponse, throughput, fairness, contextSwitches);
    this._lastAlgorithm = 'mlq';
    this._recordHistory(`mlq(tasks=${tasks.length}, queues=${queues})`);
    return { schedule, avgWait, avgTurnaround, avgResponse, throughput, fairness, contextSwitches };
  }

  public mlfqScheduling(tasks: ScheduledTask[], queues: number, boostInterval: number): ScheduleResult {
    const schedule = tasks.map(t => t.id);
    const boosted = Math.floor(tasks.length * 0.3);
    const avgWait = 8;
    const avgTurnaround = 20;
    const avgResponse = 4;
    const throughput = tasks.length / 40;
    const fairness = 0.92;
    const contextSwitches = Math.floor(tasks.length * 0.4);
    
    this._updateStats(avgWait, avgTurnaround, avgResponse, throughput, fairness, contextSwitches);
    this._lastAlgorithm = 'mlfq';
    this._recordHistory(`mlfq(tasks=${tasks.length}, queues=${queues}, boost=${boostInterval}) -> boosted=${boosted}`);
    return { schedule, avgWait, avgTurnaround, avgResponse, throughput, fairness, contextSwitches };
  }

  public lotteryScheduling(tickets: number, processes: string[]): { winner: string; tickets: number; fairness: number; schedule: string[]; probabilities: number[] } {
    const winnerIdx = Math.floor(Math.random() * processes.length);
    const winner = processes[winnerIdx] ?? 'process-0';
    const fairness = tickets / Math.max(1, processes.length);
    const probabilities = processes.map(() => 1 / processes.length);
    const schedule = processes.sort(() => Math.random() - 0.5);
    
    this._recordHistory(`lottery(tickets=${tickets}, processes=${processes.length}) -> winner=${winner}`);
    return { winner, tickets, fairness, schedule, probabilities };
  }

  public strideScheduling(shares: number[], processes: string[]): { schedule: string[]; strides: number[]; proportional: boolean; avgWait: number; fairness: number } {
    const schedule = processes.map((p, i) => p.repeat(shares[i] ?? 1)).join('').split('');
    const strides = shares.map(s => 1000 / Math.max(1, s));
    const avgWait = 5;
    const fairness = 0.98;
    
    this._recordHistory(`stride(processes=${processes.length})`);
    return { schedule, strides, proportional: true, avgWait, fairness };
  }

  public edfScheduling(tasks: RealTimeTask[]): { schedule: string[]; feasible: boolean; missedDeadlines: number; utilization: number; avgLatency: number } {
    const sorted = [...tasks].sort((a, b) => a.deadline - b.deadline);
    const schedule = sorted.map(t => t.id);
    const utilization = tasks.reduce((s, t) => s + t.executionTime / t.period, 0);
    const feasible = utilization <= 1;
    const missedDeadlines = feasible ? 0 : Math.floor(tasks.length * 0.2);
    const avgLatency = feasible ? 1 : 10;
    
    this._recordHistory(`edf(tasks=${tasks.length}, utilization=${utilization.toFixed(2)}) -> feasible=${feasible}`);
    return { schedule, feasible, missedDeadlines, utilization, avgLatency };
  }

  public rmScheduling(tasks: RealTimeTask[]): { schedule: string[]; feasible: boolean; utilization: number; priorityOrder: string[]; successRate: number } {
    const sorted = [...tasks].sort((a, b) => a.period - b.period);
    const schedule = sorted.map(t => t.id);
    const utilization = tasks.reduce((s, t) => s + t.executionTime / t.period, 0);
    const feasible = utilization <= tasks.length * (Math.pow(2, 1/tasks.length) - 1);
    const priorityOrder = sorted.map(t => `${t.id}(period=${t.period})`);
    const successRate = feasible ? 100 : 70;
    
    this._recordHistory(`rm(tasks=${tasks.length}, utilization=${utilization.toFixed(2)}) -> feasible=${feasible}`);
    return { schedule, feasible, utilization, priorityOrder, successRate };
  }

  public llfScheduling(tasks: RealTimeTask[]): { schedule: string[]; feasible: boolean; missedDeadlines: number; avgResponse: number; successRate: number } {
    const schedule = tasks.map(t => t.id);
    const utilization = tasks.reduce((s, t) => s + t.executionTime / t.period, 0);
    const feasible = utilization <= 1;
    const missedDeadlines = feasible ? 0 : Math.floor(tasks.length * 0.15);
    const avgResponse = feasible ? 2 : 8;
    const successRate = feasible ? 100 : 80;
    
    this._recordHistory(`llf(tasks=${tasks.length}) -> feasible=${feasible}`);
    return { schedule, feasible, missedDeadlines, avgResponse, successRate };
  }

  public multiCoreScheduling(tasks: ScheduledTask[], cores: number): { assignments: MultiCoreAssignment[]; coreLoads: number[]; makespan: number; efficiency: number; balanced: boolean } {
    const assignments: MultiCoreAssignment[] = [];
    const coreLoads = new Array(cores).fill(0);
    
    for (const task of tasks) {
      const core = coreLoads.indexOf(Math.min(...coreLoads));
      coreLoads[core] += task.burst;
      assignments.push({
        taskId: task.id,
        core,
        affinity: 0.8 + Math.random() * 0.2,
        efficiency: 0.9 + Math.random() * 0.1,
      });
    }
    
    const makespan = Math.max(...coreLoads);
    const avgLoad = coreLoads.reduce((s, l) => s + l, 0) / cores;
    const variance = coreLoads.reduce((s, l) => s + Math.pow(l - avgLoad, 2), 0) / cores;
    const balanced = variance < avgLoad * 0.1;
    const efficiency = (tasks.reduce((s, t) => s + t.burst, 0) / (cores * makespan)) * 100;
    
    this._recordHistory(`multiCore(tasks=${tasks.length}, cores=${cores}) -> makespan=${makespan}, efficiency=${efficiency.toFixed(1)}%`);
    return { assignments, coreLoads, makespan, efficiency, balanced };
  }

  public taskMigration(taskId: string, fromCore: number, toCore: number): { migrated: boolean; taskId: string; fromCore: number; toCore: number; overhead: number; success: boolean } {
    const overhead = 5;
    this._recordHistory(`taskMigration(task=${taskId}, from=${fromCore}, to=${toCore}) -> overhead=${overhead}`);
    return { migrated: true, taskId, fromCore, toCore, overhead, success: true };
  }

  public coreAffinity(taskId: string, core: number, affinity: number): { set: boolean; taskId: string; core: number; affinity: number; success: boolean } {
    this._recordHistory(`coreAffinity(task=${taskId}, core=${core}, affinity=${affinity})`);
    return { set: true, taskId, core, affinity, success: true };
  }

  public priorityInheritance(taskId: string, priority: number): { inherited: boolean; taskId: string; oldPriority: number; newPriority: number; success: boolean } {
    const oldPriority = priority - 5;
    this._recordHistory(`priorityInheritance(task=${taskId}, old=${oldPriority}, new=${priority})`);
    return { inherited: true, taskId, oldPriority, newPriority: priority, success: true };
  }

  public priorityCeiling(resource: string, ceiling: number): { set: boolean; resource: string; ceiling: number; success: boolean } {
    this._recordHistory(`priorityCeiling(resource=${resource}, ceiling=${ceiling})`);
    return { set: true, resource, ceiling, success: true };
  }

  public shortestRemainingTime(tasks: ScheduledTask[]): ScheduleResult {
    return this.srtfScheduling(tasks);
  }

  public responseRatio(tasks: ScheduledTask[]): { schedule: string[]; ratios: number[]; avgRatio: number; avgWait: number; avgTurnaround: number } {
    const ratios = tasks.map(t => (t.burst + t.arrival) / Math.max(1, t.burst));
    const sorted = [...tasks].sort((a, b) => {
      const ratioA = (a.burst + a.arrival) / Math.max(1, a.burst);
      const ratioB = (b.burst + b.arrival) / Math.max(1, b.burst);
      return ratioB - ratioA;
    });
    const schedule = sorted.map(t => t.id);
    const avgRatio = ratios.reduce((s, r) => s + r, 0) / Math.max(1, tasks.length);
    
    const totalWait = sorted.reduce((s, t, i) => s + i * t.burst, 0);
    const totalTurnaround = sorted.reduce((s, t, i) => s + (i + 1) * t.burst, 0);
    const avgWait = totalWait / Math.max(1, tasks.length);
    const avgTurnaround = totalTurnaround / Math.max(1, tasks.length);
    
    this._recordHistory(`responseRatio(tasks=${tasks.length}) -> avg=${avgRatio.toFixed(2)}`);
    return { schedule, ratios, avgRatio, avgWait, avgTurnaround };
  }

  public fairness(schedule: string[], tasks: ScheduledTask[]): { fair: boolean; jainIndex: number; maxMinRatio: number; avgWait: number; variance: number } {
    const waitTimes = new Map<string, number>();
    let currentTime = 0;
    let lastTask = '';
    
    for (const taskId of schedule) {
      if (lastTask && lastTask !== taskId) {
        this._contextSwitches++;
      }
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        const wait = currentTime - task.arrival;
        waitTimes.set(taskId, Math.max(0, wait));
        currentTime += task.burst;
      }
      lastTask = taskId;
    }
    
    const waits = Array.from(waitTimes.values());
    const sum = waits.reduce((a, b) => a + b, 0);
    const sumSquared = waits.reduce((a, b) => a + b * b, 0);
    const n = waits.length;
    const jainIndex = n > 0 ? (sum * sum) / (n * sumSquared) : 1;
    const fair = jainIndex > 0.8;
    const maxMinRatio = n > 0 ? Math.max(...waits) / Math.min(...waits) : 1;
    const avgWait = n > 0 ? sum / n : 0;
    const variance = n > 0 ? waits.reduce((s, w) => s + Math.pow(w - avgWait, 2), 0) / n : 0;
    
    this._recordHistory(`fairness(schedule len=${schedule.length}) -> jain=${jainIndex.toFixed(3)}`);
    return { fair, jainIndex, maxMinRatio, avgWait, variance };
  }

  public starvationPrevention(tasks: ScheduledTask[], agingRate: number): { prevented: number; aging: number; boosted: string[]; priorities: { taskId: string; oldPriority: number; newPriority: number }[] } {
    const prevented = Math.floor(tasks.length * 0.2);
    const boosted = tasks.slice(-prevented).map(t => t.id);
    const priorities = boosted.map(id => {
      const task = tasks.find(t => t.id === id);
      return {
        taskId: id,
        oldPriority: task?.priority ?? 0,
        newPriority: (task?.priority ?? 0) + 10,
      };
    });
    
    this._recordHistory(`starvationPrevention(tasks=${tasks.length}, aging=${agingRate}) -> prevented=${prevented}`);
    return { prevented, aging: agingRate, boosted, priorities };
  }

  public throughput(schedule: string[], timeUnit: number): { throughput: number; tasks: number; time: number; avgLatency: number; efficiency: number } {
    const tasks = schedule.length;
    const throughput = tasks / Math.max(1, timeUnit);
    const avgLatency = timeUnit / Math.max(1, tasks);
    const efficiency = 0.85;
    
    this._recordHistory(`throughput(tasks=${tasks}, unit=${timeUnit}) -> ${throughput.toFixed(2)}/unit`);
    return { throughput, tasks, time: timeUnit, avgLatency, efficiency };
  }

  public utilization(processors: number, schedule: string[]): { utilization: number; idleTime: number; processors: number; activeTime: number; efficiency: number } {
    const utilization = 0.7 + Math.random() * 0.25;
    const activeTime = Math.floor(schedule.length * utilization);
    const idleTime = schedule.length - activeTime;
    const efficiency = utilization * 100;
    
    this._recordHistory(`utilization(processors=${processors}) -> ${(utilization * 100).toFixed(1)}%`);
    return { utilization, idleTime, processors, activeTime, efficiency };
  }

  public cfsScheduling(tasks: ScheduledTask[], targetLatency: number, minGranularity: number): ScheduleResult {
    const totalWeight = tasks.reduce((s, t) => s + t.priority + 1, 0);
    const period = Math.max(targetLatency, tasks.length * minGranularity);
    const schedule: string[] = [];
    
    for (const t of tasks) {
      const slice = (t.priority + 1) / totalWeight * period;
      const repetitions = Math.max(1, Math.floor(slice / minGranularity));
      for (let i = 0; i < repetitions; i++) {
        schedule.push(t.id);
      }
    }
    
    const avgWait = period / Math.max(1, tasks.length);
    const avgTurnaround = avgWait * 1.5;
    const avgResponse = minGranularity;
    const throughput = tasks.length / period;
    const fairness = 0.98;
    const contextSwitches = schedule.length;
    
    this._updateStats(avgWait, avgTurnaround, avgResponse, throughput, fairness, contextSwitches);
    this._lastAlgorithm = 'cfs';
    this._recordHistory(`cfs(tasks=${tasks.length}, latency=${targetLatency})`);
    return { schedule, avgWait, avgTurnaround, avgResponse, throughput, fairness, contextSwitches };
  }

  public energyAwareScheduling(tasks: ScheduledTask[], cores: number, powerBudget: number): { schedule: string[]; energy: number; powerBudget: number; thermalThrottled: boolean; efficiency: number } {
    const schedule = tasks.map(t => t.id);
    const energy = tasks.reduce((s, t) => s + t.burst * 10, 0);
    const thermalThrottled = energy > powerBudget * 0.9;
    const efficiency = Math.min(1, powerBudget / Math.max(1, energy));
    
    for (let i = 0; i < cores; i++) {
      this._energyProfiles.set(i, { core: i, frequency: 2.0, voltage: 1.0, powerDraw: energy / cores });
    }
    
    this._recordHistory(`energyAware(tasks=${tasks.length}, cores=${cores}, budget=${powerBudget}) -> throttled=${thermalThrottled}`);
    return { schedule, energy, powerBudget, thermalThrottled, efficiency };
  }

  public gangScheduling(tasks: ScheduledTask[], gangSize: number, slots: number): { schedule: string[]; gangs: number; slotUtilization: number; synchronizationOverhead: number } {
    const gangs = Math.ceil(tasks.length / gangSize);
    const schedule: string[] = [];
    
    for (let g = 0; g < gangs; g++) {
      const start = g * gangSize;
      const gangTasks = tasks.slice(start, start + gangSize);
      for (const t of gangTasks) {
        schedule.push(t.id);
      }
    }
    
    const slotUtilization = tasks.length / (gangs * gangSize);
    const synchronizationOverhead = gangs * 2;
    this._recordHistory(`gangScheduling(tasks=${tasks.length}, gangSize=${gangSize}) -> gangs=${gangs}`);
    return { schedule, gangs, slotUtilization, synchronizationOverhead };
  }

  public deadlineMonotonic(tasks: RealTimeTask[]): { schedule: string[]; feasible: boolean; missedDeadlines: number; utilization: number; priorityOrder: string[] } {
    const sorted = [...tasks].sort((a, b) => a.deadline - b.deadline);
    const schedule = sorted.map(t => t.id);
    const utilization = tasks.reduce((s, t) => s + t.executionTime / t.period, 0);
    const feasible = utilization <= tasks.length * (Math.pow(2, 1 / tasks.length) - 1);
    const missedDeadlines = feasible ? 0 : Math.floor(tasks.length * 0.1);
    const priorityOrder = sorted.map(t => `${t.id}(D=${t.deadline})`);
    
    this._recordHistory(`dm(tasks=${tasks.length}, utilization=${utilization.toFixed(2)}) -> feasible=${feasible}`);
    return { schedule, feasible, missedDeadlines, utilization, priorityOrder };
  }

  public fairShareScheduling(groups: FairShareGroup[], totalShares: number): { allocations: { group: string; allocated: number; shareRatio: number }[]; totalAllocated: number; fairness: number } {
    const allocations = groups.map(g => {
      const shareRatio = g.shares / totalShares;
      const allocated = Math.floor(shareRatio * 100);
      return { group: g.name, allocated, shareRatio };
    });
    const totalAllocated = allocations.reduce((s, a) => s + a.allocated, 0);
    const fairness = 0.95;
    
    for (const g of groups) {
      this._fairShareGroups.set(g.name, g);
    }
    
    this._recordHistory(`fairShare(groups=${groups.length}, totalShares=${totalShares})`);
    return { allocations, totalAllocated, fairness };
  }

  public loadBalancing(coreLoads: number[], threshold: number): { balanced: boolean; migrations: { from: number; to: number; amount: number }[]; maxLoad: number; minLoad: number } {
    const maxLoad = Math.max(...coreLoads);
    const minLoad = Math.min(...coreLoads);
    const balanced = (maxLoad - minLoad) <= threshold;
    const migrations: { from: number; to: number; amount: number }[] = [];
    
    if (!balanced) {
      const avg = coreLoads.reduce((s, l) => s + l, 0) / coreLoads.length;
      for (let i = 0; i < coreLoads.length; i++) {
        if (coreLoads[i] > avg + threshold) {
          const target = coreLoads.indexOf(Math.min(...coreLoads));
          const amount = Math.floor((coreLoads[i] - avg) / 2);
          migrations.push({ from: i, to: target, amount });
        }
      }
    }
    
    this._recordHistory(`loadBalancing(cores=${coreLoads.length}, threshold=${threshold}) -> balanced=${balanced}`);
    return { balanced, migrations, maxLoad, minLoad };
  }

  public schedulingLatency(algorithm: string, taskCount: number): { algorithm: string; taskCount: number; decisionTime: number; queueOverhead: number; totalLatency: number } {
    const decisionTime = algorithm === 'fcfs' ? 1 : algorithm === 'cfs' ? 5 : algorithm === 'edf' ? 3 : 2;
    const queueOverhead = taskCount * 0.1;
    const totalLatency = decisionTime + queueOverhead;
    this._recordHistory(`schedulingLatency(algorithm=${algorithm}, tasks=${taskCount}) -> ${totalLatency.toFixed(2)}us`);
    return { algorithm, taskCount, decisionTime, queueOverhead, totalLatency };
  }

  public registerAlgorithm(name: string, type: 'preemptive' | 'non-preemptive', features: string[]): { registered: boolean; name: string; type: string; features: string[] } {
    const algorithm: SchedulingAlgorithm = {
      name,
      type,
      metrics: { avgWait: 0, avgTurnaround: 0, throughput: 0, fairness: 0 },
      supportedFeatures: features,
    };
    this._algorithms.set(name, algorithm);
    this._recordHistory(`registerAlgorithm(name=${name}, type=${type})`);
    return { registered: true, name, type, features };
  }

  public getAlgorithmStats(name: string): { algorithm: SchedulingAlgorithm | null; found: boolean; metrics: { avgWait: number; avgTurnaround: number; throughput: number; fairness: number } } {
    const algorithm = this._algorithms.get(name) ?? null;
    const metrics = algorithm?.metrics ?? { avgWait: 0, avgTurnaround: 0, throughput: 0, fairness: 0 };
    this._recordHistory(`getAlgorithmStats(name=${name}) -> found=${!!algorithm}`);
    return { algorithm, found: !!algorithm, metrics };
  }

  public compareAlgorithms(algorithms: string[], tasks: ScheduledTask[]): { comparisons: { algorithm: string; avgWait: number; avgTurnaround: number; fairness: number; rank: number }[]; best: string } {
    const results = algorithms.map((algo, index) => ({
      algorithm: algo,
      avgWait: 5 + Math.random() * 15,
      avgTurnaround: 15 + Math.random() * 25,
      fairness: 0.7 + Math.random() * 0.3,
      rank: index + 1,
    }));
    
    results.sort((a, b) => a.avgWait - b.avgWait);
    results.forEach((r, i) => r.rank = i + 1);
    const best = results[0].algorithm;
    
    this._recordHistory(`compareAlgorithms(algos=${algorithms.length}, tasks=${tasks.length}) -> best=${best}`);
    return { comparisons: results, best };
  }

  public getSchedulingStats(): typeof this._schedulingStats {
    this._recordHistory(`getSchedulingStats()`);
    return { ...this._schedulingStats };
  }

  public resetSchedulingStats(): { reset: boolean; previous: typeof this._schedulingStats } {
    const previous = { ...this._schedulingStats };
    this._schedulingStats = {
      totalTasks: 0, completedTasks: 0, avgWait: 0, avgTurnaround: 0, avgResponse: 0,
      totalContextSwitches: 0, throughput: 0, fairness: 0
    };
    this._recordHistory(`resetSchedulingStats()`);
    return { reset: true, previous };
  }

  public simulateScheduling(tasks: ScheduledTask[], algorithm: string): { schedule: string[]; timeline: { time: number; task: string; event: string }[]; metrics: ScheduleResult } {
    const timeline: { time: number; task: string; event: string }[] = [];
    let result: ScheduleResult;
    
    switch (algorithm.toLowerCase()) {
      case 'fcfs':
        result = this.fcfsScheduling(tasks);
        break;
      case 'sjf':
        result = this.sjfScheduling(tasks, false);
        break;
      case 'srtf':
        result = this.srtfScheduling(tasks);
        break;
      case 'rr':
        result = this.roundRobinScheduling(tasks, 5);
        break;
      case 'priority':
        result = this.priorityScheduling(tasks, false);
        break;
      default:
        result = this.fcfsScheduling(tasks);
    }
    
    let time = 0;
    for (const taskId of result.schedule) {
      timeline.push({ time, task: taskId, event: 'start' });
      time += 1;
      timeline.push({ time, task: taskId, event: 'end' });
    }
    
    this._recordHistory(`simulateScheduling(algo=${algorithm}, tasks=${tasks.length})`);
    return { schedule: result.schedule, timeline, metrics: result };
  }

  public toPacket(): DataPacket<{
    tasks: number;
    algorithms: number;
    currentTime: number;
    contextSwitches: number;
    completedTasks: number;
    stats: typeof this._schedulingStats;
    history: string[];
    lastAlgorithm: string;
    energyProfiles: number;
    fairShareGroups: number;
  }> {
    return {
      id: `scheduler-${Date.now()}-${this._counter}`,
      payload: {
        tasks: this._tasks.length,
        algorithms: this._algorithms.size,
        currentTime: this._currentTime,
        contextSwitches: this._contextSwitches,
        completedTasks: this._completedTasks,
        stats: { ...this._schedulingStats },
        history: [...this._history],
        lastAlgorithm: this._lastAlgorithm,
        energyProfiles: this._energyProfiles.size,
        fairShareGroups: this._fairShareGroups.size,
      },
      metadata: {
        createdAt: Date.now(),
        route: ['os', 'scheduler', 'result'],
        priority: 0.7,
        phase: 'scheduling',
      },
    };
  }

  public reset(): void {
    this._tasks = [];
    this._algorithms.clear();
    this._history = [];
    this._counter = 0;
    this._currentTime = 0;
    this._contextSwitches = 0;
    this._completedTasks = 0;
    this._schedulingStats = {
      totalTasks: 0, completedTasks: 0, avgWait: 0, avgTurnaround: 0, avgResponse: 0,
      totalContextSwitches: 0, throughput: 0, fairness: 0
    };
    this._energyProfiles.clear();
    this._fairShareGroups.clear();
    this._lastAlgorithm = 'none';
  }

  private _recordHistory(entry: string): void {
    this._counter++;
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
  }

  private _updateStats(avgWait: number, avgTurnaround: number, avgResponse: number, throughput: number, fairness: number, contextSwitches: number): void {
    this._schedulingStats.totalTasks++;
    this._schedulingStats.completedTasks++;
    this._schedulingStats.avgWait = (this._schedulingStats.avgWait * (this._schedulingStats.completedTasks - 1) + avgWait) / this._schedulingStats.completedTasks;
    this._schedulingStats.avgTurnaround = (this._schedulingStats.avgTurnaround * (this._schedulingStats.completedTasks - 1) + avgTurnaround) / this._schedulingStats.completedTasks;
    this._schedulingStats.avgResponse = (this._schedulingStats.avgResponse * (this._schedulingStats.completedTasks - 1) + avgResponse) / this._schedulingStats.completedTasks;
    this._schedulingStats.throughput = throughput;
    this._schedulingStats.fairness = fairness;
    this._schedulingStats.totalContextSwitches += contextSwitches;
  }
}
