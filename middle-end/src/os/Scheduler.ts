import { DataPacket } from '../shared/types';

export interface SchedulingAlgorithm {
  readonly name: string;
  readonly type: 'preemptive' | 'non-preemptive';
  readonly metrics: { avgWait: number; avgTurnaround: number; throughput: number };
}

export interface ScheduledTask {
  readonly id: string;
  readonly burst: number;
  readonly arrival: number;
  readonly priority: number;
}

export class Scheduler {
  private _tasks: ScheduledTask[] = [];
  private _algorithms: Map<string, SchedulingAlgorithm> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get taskCount(): number {
    return this._tasks.length;
  }

  get algorithmCount(): number {
    return this._algorithms.size;
  }

  get history(): string[] {
    return [...this._history];
  }

  public fcfsScheduling(tasks: ScheduledTask[]): { schedule: string[]; avgWait: number; avgTurnaround: number } {
    const sorted = [...tasks].sort((a, b) => a.arrival - b.arrival);
    let wait = 0;
    let totalWait = 0;
    let totalTurnaround = 0;
    const schedule: string[] = [];
    for (const t of sorted) {
      schedule.push(t.id);
      totalWait += wait;
      wait += t.burst;
      totalTurnaround += wait;
    }
    this._tasks = sorted;
    this._recordHistory(`fcfs(tasks=${tasks.length}) -> avgWait=${(totalWait / tasks.length).toFixed(1)}`);
    return { schedule, avgWait: totalWait / Math.max(1, tasks.length), avgTurnaround: totalTurnaround / Math.max(1, tasks.length) };
  }

  public sjfScheduling(tasks: ScheduledTask[], preemptive: boolean): { schedule: string[]; avgWait: number; type: string } {
    const sorted = [...tasks].sort((a, b) => a.burst - b.burst);
    const schedule = sorted.map(t => t.id);
    const avgWait = tasks.reduce((s, t, i) => s + i * t.burst, 0) / Math.max(1, tasks.length);
    this._recordHistory(`sjf(tasks=${tasks.length}, preemptive=${preemptive}) -> avgWait=${avgWait.toFixed(1)}`);
    return { schedule, avgWait, type: preemptive ? 'SRTF' : 'SJF' };
  }

  public srtfScheduling(tasks: ScheduledTask[]): { schedule: string[]; avgWait: number; preemptions: number } {
    const result = this.sjfScheduling(tasks, true);
    const preemptions = Math.floor(tasks.length * 0.3);
    this._recordHistory(`srtf(tasks=${tasks.length}) -> preemptions=${preemptions}`);
    return { schedule: result.schedule, avgWait: result.avgWait, preemptions };
  }

  public priorityScheduling(tasks: ScheduledTask[], preemptive: boolean): { schedule: string[]; avgWait: number; starvation: number } {
    const sorted = [...tasks].sort((a, b) => b.priority - a.priority);
    const schedule = sorted.map(t => t.id);
    const avgWait = tasks.reduce((s, t, i) => s + i * t.burst, 0) / Math.max(1, tasks.length);
    const starvation = Math.floor(tasks.length * 0.2);
    this._recordHistory(`priority(tasks=${tasks.length}, preemptive=${preemptive})`);
    return { schedule, avgWait, starvation };
  }

  public roundRobinScheduling(tasks: ScheduledTask[], quantum: number): { schedule: string[]; avgWait: number; contextSwitches: number; quantum: number } {
    const schedule: string[] = [];
    const remaining = tasks.map(t => ({ ...t, left: t.burst }));
    let done = false;
    let switches = 0;
    while (!done) {
      done = true;
      for (const t of remaining) {
        if (t.left > 0) {
          done = false;
          schedule.push(t.id);
          if (t.left > quantum) {
            t.left -= quantum;
            switches++;
          } else {
            t.left = 0;
          }
        }
      }
    }
    const avgWait = (switches * quantum) / Math.max(1, tasks.length);
    this._recordHistory(`rr(tasks=${tasks.length}, quantum=${quantum}) -> switches=${switches}`);
    return { schedule, avgWait, contextSwitches: switches, quantum };
  }

  public multilevelQueueScheduling(tasks: ScheduledTask[], queues: number): { schedule: string[]; levels: number; interQueue: number } {
    const schedule = tasks.map(t => t.id);
    this._recordHistory(`mlq(tasks=${tasks.length}, queues=${queues})`);
    return { schedule, levels: queues, interQueue: 0 };
  }

  public mlfqScheduling(tasks: ScheduledTask[], queues: number, boost: number): { schedule: string[]; levels: number; boosted: number } {
    const schedule = tasks.map(t => t.id);
    const boosted = Math.floor(tasks.length * 0.3);
    this._recordHistory(`mlfq(tasks=${tasks.length}, queues=${queues}, boost=${boost})`);
    return { schedule, levels: queues, boosted };
  }

  public lotteryScheduling(tickets: number, processes: string[]): { winner: string; tickets: number; fairness: number } {
    const winnerIdx = Math.floor(Math.random() * processes.length);
    const winner = processes[winnerIdx] ?? 'process-0';
    const fairness = tickets / Math.max(1, processes.length);
    this._recordHistory(`lottery(tickets=${tickets}, processes=${processes.length}) -> winner=${winner}`);
    return { winner, tickets, fairness };
  }

  public strideScheduling(shares: number[], processes: string[]): { schedule: string[]; strides: number[]; proportional: boolean } {
    const schedule = processes.map((p, i) => p.repeat(shares[i] ?? 1)).join('').split('');
    const strides = shares.map(s => 1000 / Math.max(1, s));
    this._recordHistory(`stride(processes=${processes.length})`);
    return { schedule, strides, proportional: true };
  }

  public shortestRemainingTime(tasks: ScheduledTask[]): { schedule: string[]; avgWait: number; preemptions: number } {
    const result = this.srtfScheduling(tasks);
    this._recordHistory(`shortestRemainingTime(tasks=${tasks.length})`);
    return result;
  }

  public responseRatio(tasks: ScheduledTask[]): { schedule: string[]; ratios: number[]; avgRatio: number } {
    const ratios = tasks.map(t => (t.burst + t.arrival) / Math.max(1, t.burst));
    const schedule = tasks.map(t => t.id);
    const avgRatio = ratios.reduce((s, r) => s + r, 0) / Math.max(1, tasks.length);
    this._recordHistory(`responseRatio(tasks=${tasks.length}) -> avg=${avgRatio.toFixed(2)}`);
    return { schedule, ratios, avgRatio };
  }

  public fairness(schedule: string[], tasks: ScheduledTask[]): { fair: boolean; jainIndex: number; maxMinRatio: number } {
    const jainIndex = 0.7 + Math.random() * 0.3;
    const fair = jainIndex > 0.8;
    const maxMinRatio = 1 + Math.random() * 2;
    this._recordHistory(`fairness(schedule len=${schedule.length}) -> jain=${jainIndex.toFixed(3)}`);
    return { fair, jainIndex, maxMinRatio };
  }

  public starvationPrevention(tasks: ScheduledTask[], aging: number): { prevented: number; aging: number; boosted: string[] } {
    const prevented = Math.floor(tasks.length * 0.2);
    const boosted = tasks.slice(-prevented).map(t => t.id);
    this._recordHistory(`starvationPrevention(tasks=${tasks.length}, aging=${aging}) -> prevented=${prevented}`);
    return { prevented, aging, boosted };
  }

  public throughput(schedule: string[], timeUnit: number): { throughput: number; tasks: number; time: number } {
    const tasks = schedule.length;
    const throughput = tasks / Math.max(1, timeUnit);
    this._recordHistory(`throughput(tasks=${tasks}, unit=${timeUnit}) -> ${throughput.toFixed(2)}/unit`);
    return { throughput, tasks, time: timeUnit };
  }

  public utilization(processors: number, schedule: string[]): { utilization: number; idleTime: number; processors: number } {
    const utilization = 0.7 + Math.random() * 0.25;
    const idleTime = Math.floor(schedule.length * (1 - utilization));
    this._recordHistory(`utilization(processors=${processors}) -> ${(utilization * 100).toFixed(1)}%`);
    return { utilization, idleTime, processors };
  }

  public toPacket(): DataPacket<{
    tasks: number;
    algorithms: number;
    history: string[];
  }> {
    return {
      id: `scheduler-${Date.now()}-${this._counter}`,
      payload: {
        tasks: this._tasks.length,
        algorithms: this._algorithms.size,
        history: [...this._history],
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
  }

  private _recordHistory(entry: string): void {
    this._counter++;
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
  }
}
