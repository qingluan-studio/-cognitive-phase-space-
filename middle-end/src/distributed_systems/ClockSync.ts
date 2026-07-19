import { DataPacket } from '../shared/types';

export interface ClockOffset {
  readonly local: number;
  readonly remote: number;
  readonly offset: number;
  readonly rtt: number;
}

export interface SynchronizationResult {
  readonly synchronized: boolean;
  readonly accuracy: number;
  readonly method: string;
  readonly drift: number;
}

export class ClockSync {
  private _offsets: Map<string, ClockOffset> = new Map();
  private _synchronizations: SynchronizationResult[] = [];
  private _history: string[] = [];
  private _counter = 0;
  private _localClock = Date.now();

  get offsetCount(): number {
    return this._offsets.size;
  }

  get syncCount(): number {
    return this._synchronizations.length;
  }

  get history(): string[] {
    return [...this._history];
  }

  get localClock(): number {
    return this._localClock;
  }

  public ntpSync(localClock: number, ntpServer: string): { offset: number; rtt: number; server: string; accuracy: number } {
    const rtt = Math.floor(Math.random() * 50) + 10;
    const offset = Math.floor(Math.random() * 200) - 100;
    const accuracy = Math.max(1, rtt / 2);
    this._offsets.set(ntpServer, { local: localClock, remote: localClock + offset, offset, rtt });
    this._localClock = localClock + offset;
    this._recordHistory(`ntpSync(server=${ntpServer}, offset=${offset}ms, rtt=${rtt}ms)`);
    return { offset, rtt, server: ntpServer, accuracy };
  }

  public ntpAlgorithm(timestamps: { t1: number; t2: number; t3: number; t4: number }): { offset: number; delay: number; dispersion: number } {
    const { t1, t2, t3, t4 } = timestamps;
    const offset = ((t2 - t1) + (t3 - t4)) / 2;
    const delay = (t4 - t1) - (t3 - t2);
    const dispersion = Math.abs(offset) * 0.1;
    this._recordHistory(`ntpAlgorithm(offset=${offset.toFixed(2)}ms, delay=${delay.toFixed(2)}ms)`);
    return { offset, delay, dispersion };
  }

  public cristianAlgorithm(client: number, server: number): { offset: number; rtt: number; accuracy: number } {
    const rtt = Math.floor(Math.random() * 40) + 5;
    const offset = server - client + Math.floor(Math.random() * 100) - 50;
    const accuracy = rtt / 2;
    this._recordHistory(`cristianAlgorithm(rtt=${rtt}ms, offset=${offset.toFixed(2)}ms)`);
    return { offset, rtt, accuracy };
  }

  public berkeleyAlgorithm(coordinator: string, clients: string[]): { avgTime: number; differences: Map<string, number>; synchronized: number } {
    const base = Date.now();
    const differences = new Map<string, number>();
    let sum = 0;
    clients.forEach((c, i) => {
      const diff = Math.floor(Math.random() * 200) - 100;
      differences.set(c, diff);
      sum += diff;
    });
    const avgTime = base + sum / clients.length;
    this._recordHistory(`berkeleyAlgorithm(coordinator=${coordinator}, clients=${clients.length})`);
    return { avgTime, differences, synchronized: clients.length };
  }

  public marzulloAlgorithm(timeSources: { source: string; time: number; tolerance: number }[], tolerance: number): { intervalStart: number; intervalEnd: number; sources: number } {
    const times = timeSources.map(s => s.time);
    const avg = times.reduce((s, t) => s + t, 0) / times.length;
    const intervalStart = avg - tolerance;
    const intervalEnd = avg + tolerance;
    this._recordHistory(`marzulloAlgorithm(sources=${timeSources.length}, tolerance=${tolerance})`);
    return { intervalStart, intervalEnd, sources: timeSources.length };
  }

  public logicalClock(process: string, events: number): { counter: number; process: string; events: number } {
    const counter = events;
    this._recordHistory(`logicalClock(process=${process}, events=${events}) -> counter=${counter}`);
    return { counter, process, events };
  }

  public vectorClock(processes: string[], events: { process: string; seq: number }[]): { clocks: Map<string, number>; size: number } {
    const clocks = new Map<string, number>();
    processes.forEach(p => {
      clocks.set(p, events.filter(e => e.process === p).length);
    });
    this._recordHistory(`vectorClock(processes=${processes.length}, events=${events.length})`);
    return { clocks, size: processes.length };
  }

  public lamportTimestamp(event: string, pid: string, counter: number): { timestamp: number; event: string; pid: string } {
    const timestamp = counter + 1;
    this._recordHistory(`lamportTimestamp(event=${event}, pid=${pid}) -> ${timestamp}`);
    return { timestamp, event, pid };
  }

  public happenedBefore(e1: { pid: string; seq: number }, e2: { pid: string; seq: number }, vclock: Map<string, number>): { before: boolean; concurrent: boolean } {
    const e1Clock = vclock.get(e1.pid) ?? e1.seq;
    const e2Clock = vclock.get(e2.pid) ?? e2.seq;
    const before = e1.seq < e2.seq;
    const concurrent = e1Clock === e2Clock;
    this._recordHistory(`happenedBefore(e1=${e1.seq}, e2=${e2.seq}) -> before=${before}`);
    return { before, concurrent };
  }

  public concurrentEvents(e1: string, e2: string, vclock: Map<string, Map<string, number>>): { concurrent: boolean; e1: string; e2: string } {
    const concurrent = Math.random() > 0.5;
    this._recordHistory(`concurrentEvents(${e1}, ${e2}) -> ${concurrent}`);
    return { concurrent, e1, e2 };
  }

  public totalOrder(events: string[], timestamps: Map<string, number>): { ordered: string[]; breaks: number } {
    const ordered = [...events].sort((a, b) => (timestamps.get(a) ?? 0) - (timestamps.get(b) ?? 0));
    this._recordHistory(`totalOrder(events=${events.length})`);
    return { ordered, breaks: 0 };
  }

  public causalOrder(events: string[], vclock: Map<string, Map<string, number>>): { ordered: string[]; violations: number } {
    const ordered = [...events];
    const violations = Math.floor(events.length * 0.05);
    this._recordHistory(`causalOrder(events=${events.length}, violations=${violations})`);
    return { ordered, violations };
  }

  public globalSnapshot(processes: string[], channels: { from: string; to: string }[]): { snapshot: string; processes: number; channels: number; consistent: boolean } {
    const consistent = Math.random() > 0.1;
    this._recordHistory(`globalSnapshot(processes=${processes.length}, channels=${channels.length}) -> consistent=${consistent}`);
    return { snapshot: `snap-${this._counter}`, processes: processes.length, channels: channels.length, consistent };
  }

  public consistentCut(processes: string[], cuts: Map<string, number>): { consistent: boolean; cutTime: number; processes: number } {
    const consistent = Math.random() > 0.2;
    const cutTime = Date.now();
    this._recordHistory(`consistentCut(processes=${processes.length}) -> consistent=${consistent}`);
    return { consistent, cutTime, processes: processes.length };
  }

  public toPacket(): DataPacket<{
    offsets: number;
    synchronizations: number;
    history: string[];
    localClock: number;
  }> {
    return {
      id: `clock-sync-${Date.now()}-${this._counter}`,
      payload: {
        offsets: this._offsets.size,
        synchronizations: this._synchronizations.length,
        history: [...this._history],
        localClock: this._localClock,
      },
      metadata: {
        createdAt: Date.now(),
        route: ['distributed_systems', 'clock_sync', 'result'],
        priority: 0.75,
        phase: 'synchronization',
      },
    };
  }

  public reset(): void {
    this._offsets.clear();
    this._synchronizations = [];
    this._history = [];
    this._counter = 0;
    this._localClock = Date.now();
  }

  private _recordHistory(entry: string): void {
    this._counter++;
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
  }
}
