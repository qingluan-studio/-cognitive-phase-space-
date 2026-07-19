import { DataPacket } from '../shared/types';

export interface Process {
  readonly pid: number;
  readonly name: string;
  readonly state: 'running' | 'waiting' | 'ready' | 'zombie' | 'stopped' | 'sleeping';
  readonly priority: number;
  readonly memory: number;
  readonly parent: number;
}

export interface ProcessStats {
  readonly totalProcesses: number;
  readonly running: number;
  readonly waiting: number;
  readonly cpuUsage: number;
  readonly memoryUsage: number;
}

export class ProcessManager {
  private _processes: Map<number, Process> = new Map();
  private _stats: ProcessStats = { totalProcesses: 0, running: 0, waiting: 0, cpuUsage: 0, memoryUsage: 0 };
  private _history: string[] = [];
  private _counter = 0;
  private _nextPid = 1;

  get processCount(): number {
    return this._processes.size;
  }

  get stats(): ProcessStats {
    return { ...this._stats };
  }

  get history(): string[] {
    return [...this._history];
  }

  get nextPid(): number {
    return this._nextPid;
  }

  public forkProcess(parent: number, childCode: string): { childPid: number; parent: number; created: boolean } {
    const childPid = this._nextPid++;
    const parentProcess = this._processes.get(parent);
    const child: Process = {
      pid: childPid,
      name: `child-of-${parent}`,
      state: 'ready',
      priority: parentProcess?.priority ?? 5,
      memory: Math.floor((parentProcess?.memory ?? 1024) * 0.5),
      parent,
    };
    this._processes.set(childPid, child);
    this._stats.totalProcesses++;
    this._recordHistory(`fork(parent=${parent}, child=${childPid}, code=${childCode.slice(0, 20)}...)`);
    return { childPid, parent, created: true };
  }

  public execProcess(name: string, args: string[]): { pid: number; name: string; args: string[] } {
    const pid = this._nextPid++;
    const proc: Process = {
      pid,
      name,
      state: 'running',
      priority: 5,
      memory: Math.floor(Math.random() * 4096) + 1024,
      parent: 1,
    };
    this._processes.set(pid, proc);
    this._stats.totalProcesses++;
    this._stats.running++;
    this._recordHistory(`exec(name=${name}, pid=${pid}, args=${args.length})`);
    return { pid, name, args };
  }

  public killProcess(pid: number, signal: string): { pid: number; signal: string; killed: boolean } {
    const proc = this._processes.get(pid);
    const killed = !!proc;
    if (proc) {
      this._processes.set(pid, { ...proc, state: 'zombie' });
      if (proc.state === 'running') this._stats.running--;
    }
    this._recordHistory(`kill(pid=${pid}, signal=${signal}) -> killed=${killed}`);
    return { pid, signal, killed };
  }

  public waitProcess(pid: number): { pid: number; status: number; waited: boolean } {
    const proc = this._processes.get(pid);
    const waited = !!proc;
    if (proc) {
      this._processes.delete(pid);
      this._stats.totalProcesses--;
    }
    this._recordHistory(`wait(pid=${pid}) -> waited=${waited}`);
    return { pid, status: 0, waited };
  }

  public exitProcess(code: number): { code: number; exited: boolean } {
    this._recordHistory(`exit(code=${code})`);
    return { code, exited: true };
  }

  public processStates(pid: number): { pid: number; state: Process['state']; transitions: string[] } {
    const proc = this._processes.get(pid);
    const state = proc?.state ?? 'running';
    const transitions = ['ready', 'running', 'waiting', 'running', 'ready'];
    this._recordHistory(`processStates(pid=${pid}) -> state=${state}`);
    return { pid, state, transitions };
  }

  public contextSwitch(process1: number, process2: number): { from: number; to: number; saved: number; restored: number } {
    const p1 = this._processes.get(process1);
    const p2 = this._processes.get(process2);
    if (p1) this._processes.set(process1, { ...p1, state: 'ready' });
    if (p2) this._processes.set(process2, { ...p2, state: 'running' });
    this._recordHistory(`contextSwitch(${process1} -> ${process2})`);
    return { from: process1, to: process2, saved: 1, restored: 1 };
  }

  public schedulingPolicy(policy: string, processes: Process[]): { policy: string; scheduled: Process[]; contextSwitches: number } {
    const scheduled = [...processes];
    const contextSwitches = processes.length - 1;
    this._recordHistory(`schedulingPolicy(policy=${policy}, processes=${processes.length})`);
    return { policy, scheduled, contextSwitches };
  }

  public roundRobin(processes: Process[], quantum: number): { schedule: Process[]; quantum: number; avgWait: number } {
    const schedule = [...processes];
    const avgWait = Math.floor(processes.length * quantum * 0.5);
    this._recordHistory(`roundRobin(processes=${processes.length}, quantum=${quantum}ms)`);
    return { schedule, quantum, avgWait };
  }

  public firstComeFirstServed(processes: Process[]): { schedule: Process[]; avgWait: number; throughput: number } {
    const schedule = [...processes];
    const avgWait = Math.floor(processes.length * 10);
    const throughput = processes.length;
    this._recordHistory(`fcfs(processes=${processes.length})`);
    return { schedule, avgWait, throughput };
  }

  public shortestJobFirst(processes: Process[]): { schedule: Process[]; avgWait: number; optimal: boolean } {
    const schedule = [...processes].sort((a, b) => a.memory - b.memory);
    const avgWait = Math.floor(processes.length * 5);
    this._recordHistory(`sjf(processes=${processes.length}) -> optimal`);
    return { schedule, avgWait, optimal: true };
  }

  public priorityScheduling(processes: Process[]): { schedule: Process[]; priority: boolean; starvation: number } {
    const schedule = [...processes].sort((a, b) => b.priority - a.priority);
    const starvation = Math.floor(processes.length * 0.2);
    this._recordHistory(`priorityScheduling(processes=${processes.length})`);
    return { schedule, priority: true, starvation };
  }

  public multilevelFeedbackQueue(processes: Process[], queues: number): { schedule: Process[]; levels: number; promoted: number } {
    const schedule = [...processes];
    const promoted = Math.floor(processes.length * 0.3);
    this._recordHistory(`mlfq(processes=${processes.length}, queues=${queues})`);
    return { schedule, levels: queues, promoted };
  }

  public zombieProcess(pid: number): { pid: number; zombie: boolean; parent: number } {
    const proc = this._processes.get(pid);
    const zombie = proc?.state === 'zombie';
    this._recordHistory(`zombieProcess(pid=${pid}) -> ${zombie}`);
    return { pid, zombie, parent: proc?.parent ?? 1 };
  }

  public orphanProcess(pid: number): { pid: number; orphan: boolean; adoptedBy: number } {
    const proc = this._processes.get(pid);
    const orphan = !this._processes.has(proc?.parent ?? 1);
    this._recordHistory(`orphanProcess(pid=${pid}) -> ${orphan}`);
    return { pid, orphan, adoptedBy: 1 };
  }

  public daemonProcess(name: string): { pid: number; name: string; daemon: boolean; ppid: number } {
    const pid = this._nextPid++;
    const proc: Process = { pid, name, state: 'sleeping', priority: 10, memory: 256, parent: 1 };
    this._processes.set(pid, proc);
    this._stats.totalProcesses++;
    this._recordHistory(`daemonProcess(name=${name}, pid=${pid})`);
    return { pid, name, daemon: true, ppid: 1 };
  }

  public toPacket(): DataPacket<{
    processes: number;
    stats: ProcessStats;
    history: string[];
  }> {
    return {
      id: `proc-mgr-${Date.now()}-${this._counter}`,
      payload: {
        processes: this._processes.size,
        stats: { ...this._stats },
        history: [...this._history],
      },
      metadata: {
        createdAt: Date.now(),
        route: ['os', 'process', 'result'],
        priority: 0.75,
        phase: 'scheduling',
      },
    };
  }

  public reset(): void {
    this._processes.clear();
    this._stats = { totalProcesses: 0, running: 0, waiting: 0, cpuUsage: 0, memoryUsage: 0 };
    this._history = [];
    this._counter = 0;
    this._nextPid = 1;
  }

  private _recordHistory(entry: string): void {
    this._counter++;
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
  }
}
