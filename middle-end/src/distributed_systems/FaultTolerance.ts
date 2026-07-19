import { DataPacket } from '../shared/types';

export interface FaultToleranceStrategy {
  readonly type: 'replication' | 'redundancy' | 'checkpoint' | 'failover' | 'degradation';
  readonly redundancy: number;
  readonly recoveryTime: number;
  readonly cost: number;
}

export interface FailureDetector {
  readonly name: string;
  readonly nodes: string[];
  readonly interval: number;
  readonly suspicion: number;
}

export class FaultTolerance {
  private _strategies: Map<string, FaultToleranceStrategy> = new Map();
  private _detectors: Map<string, FailureDetector> = new Map();
  private _failures: string[] = [];
  private _history: string[] = [];
  private _counter = 0;

  get strategyCount(): number {
    return this._strategies.size;
  }

  get detectorCount(): number {
    return this._detectors.size;
  }

  get failureCount(): number {
    return this._failures.length;
  }

  get history(): string[] {
    return [...this._history];
  }

  public failureDetector(node: string, timeout: number, heartbeat: number): { alive: boolean; lastSeen: number; node: string } {
    const alive = Math.random() > 0.1;
    const lastSeen = alive ? Date.now() : Date.now() - timeout - 100;
    this._recordHistory(`failureDetector(node=${node}, timeout=${timeout}) -> alive=${alive}`);
    return { alive, lastSeen, node };
  }

  public heartbeatDetection(nodes: string[], interval: number): { alive: string[]; dead: string[]; interval: number } {
    const alive: string[] = [];
    const dead: string[] = [];
    nodes.forEach(node => {
      if (Math.random() > 0.1) {
        alive.push(node);
      } else {
        dead.push(node);
      }
    });
    this._failures.push(...dead);
    this._recordHistory(`heartbeatDetection(nodes=${nodes.length}) -> alive=${alive.length}, dead=${dead.length}`);
    return { alive, dead, interval };
  }

  public gossipFailureDetector(nodes: string[], gossip: number, suspicion: number): { suspected: string[]; confirmed: string[]; gossipRounds: number } {
    const suspected: string[] = [];
    const confirmed: string[] = [];
    nodes.forEach(node => {
      const r = Math.random();
      if (r < 0.05) confirmed.push(node);
      else if (r < 0.15) suspected.push(node);
    });
    this._recordHistory(`gossipFailureDetector(nodes=${nodes.length}, rounds=${gossip}) -> confirmed=${confirmed.length}`);
    return { suspected, confirmed, gossipRounds: gossip };
  }

  public replication(service: string, replicas: number, mode: 'active' | 'passive' | 'semi-active'): { service: string; replicas: number; mode: string; availability: number } {
    const availability = 1 - Math.pow(0.01, replicas);
    this._strategies.set(service, { type: 'replication', redundancy: replicas, recoveryTime: mode === 'active' ? 0 : 1000, cost: replicas });
    this._recordHistory(`replication(service=${service}, replicas=${replicas}, mode=${mode}) -> availability=${(availability * 100).toFixed(3)}%`);
    return { service, replicas, mode, availability };
  }

  public activeReplication(primaries: string[], backups: string[]): { active: number; total: number; throughput: number } {
    const active = primaries.length + backups.length;
    const total = primaries.length;
    const throughput = primaries.length * 1000;
    this._recordHistory(`activeReplication(primaries=${primaries.length}, backups=${backups.length})`);
    return { active, total, throughput };
  }

  public passiveReplication(primary: string, backups: string[], checkpoints: number): { primary: string; backups: number; checkpoints: number; failoverTime: number } {
    const failoverTime = 1000 + checkpoints * 100;
    this._recordHistory(`passiveReplication(primary=${primary}, backups=${backups.length}, checkpoints=${checkpoints})`);
    return { primary, backups: backups.length, checkpoints, failoverTime };
  }

  public checkPointing(state: string, frequency: number): { checkpoint: string; state: string; frequency: number; size: number } {
    const size = state.length * 2;
    this._recordHistory(`checkPointing(frequency=${frequency}s, size=${size})`);
    return { checkpoint: `cp-${this._counter}`, state, frequency, size };
  }

  public rollbackRecovery(state: string, checkpoint: string): { recovered: boolean; state: string; checkpoint: string; rollbackTime: number } {
    const recovered = Math.random() > 0.1;
    const rollbackTime = Math.floor(Math.random() * 500) + 100;
    this._recordHistory(`rollbackRecovery(checkpoint=${checkpoint}) -> recovered=${recovered}`);
    return { recovered, state, checkpoint, rollbackTime };
  }

  public retryWithBackoff(operation: string, maxRetries: number, backoff: 'exponential' | 'linear' | 'constant'): { attempts: number; success: boolean; operation: string; totalDelay: number } {
    const success = Math.random() > 0.2;
    const attempts = success ? Math.floor(Math.random() * maxRetries) + 1 : maxRetries;
    let totalDelay = 0;
    for (let i = 0; i < attempts - 1; i++) {
      totalDelay += backoff === 'exponential' ? Math.pow(2, i) * 100 : backoff === 'linear' ? (i + 1) * 100 : 100;
    }
    this._recordHistory(`retryWithBackoff(op=${operation}, retries=${maxRetries}, backoff=${backoff}) -> success=${success}`);
    return { attempts, success, operation, totalDelay };
  }

  public gracefulDegradation(system: string, failures: number): { available: boolean; degraded: boolean; level: number } {
    const degraded = failures > 0;
    const available = failures < 3;
    const level = Math.max(0, 3 - failures);
    this._recordHistory(`gracefulDegradation(system=${system}, failures=${failures}) -> level=${level}`);
    return { available, degraded, level };
  }

  public failover(primary: string, standby: string, method: 'automatic' | 'manual' | 'semi-auto'): { failed: boolean; promoted: string; method: string; downtime: number } {
    const failed = Math.random() > 0.5;
    const downtime = method === 'automatic' ? 100 : method === 'semi-auto' ? 5000 : 30000;
    this._recordHistory(`failover(primary=${primary}, standby=${standby}, method=${method}) -> failed=${failed}`);
    return { failed, promoted: standby, method, downtime: failed ? downtime : 0 };
  }

  public redundancyScheme(component: string, level: number, type: 'n+1' | '2n' | '3n'): { component: string; level: number; type: string; mttf: number } {
    const mttf = level * 10000;
    this._strategies.set(component, { type: 'redundancy', redundancy: level, recoveryTime: type === 'n+1' ? 100 : 0, cost: level });
    this._recordHistory(`redundancyScheme(component=${component}, level=${level}, type=${type})`);
    return { component, level, type, mttf };
  }

  public byzantineFaultTolerance(nodes: number, f: number): { safe: boolean; tolerance: number; quorum: number; nodes: number } {
    const tolerance = Math.floor((nodes - 1) / 3);
    const safe = f <= tolerance;
    const quorum = 2 * f + 1;
    this._recordHistory(`byzantineFaultTolerance(nodes=${nodes}, f=${f}) -> safe=${safe}`);
    return { safe, tolerance, quorum, nodes };
  }

  public toPacket(): DataPacket<{
    strategies: number;
    detectors: number;
    failures: number;
    history: string[];
  }> {
    return {
      id: `fault-tolerance-${Date.now()}-${this._counter}`,
      payload: {
        strategies: this._strategies.size,
        detectors: this._detectors.size,
        failures: this._failures.length,
        history: [...this._history],
      },
      metadata: {
        createdAt: Date.now(),
        route: ['distributed_systems', 'fault_tolerance', 'result'],
        priority: 0.9,
        phase: 'resilience',
      },
    };
  }

  public reset(): void {
    this._strategies.clear();
    this._detectors.clear();
    this._failures = [];
    this._history = [];
    this._counter = 0;
  }

  private _recordHistory(entry: string): void {
    this._counter++;
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
  }
}
