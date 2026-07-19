import { DataPacket } from '../shared/types';

export interface ConsistencyLevel {
  readonly name: string;
  readonly type: 'strong' | 'eventual' | 'causal' | 'session' | 'weak';
  readonly latency: number;
  readonly availability: number;
  readonly partitionTolerance: number;
}

export interface CAPResult {
  readonly consistency: number;
  readonly availability: number;
  readonly partitionTolerance: number;
  readonly tradeoff: 'CP' | 'AP' | 'CA' | 'balanced';
  readonly dominant: string;
}

export interface BASEProperties {
  readonly basicallyAvailable: boolean;
  readonly softState: boolean;
  readonly eventuallyConsistent: boolean;
  readonly convergenceTime: number;
  readonly conflictRate: number;
}

export interface ConsistencyMetrics {
  readonly staleness: number;
  readonly readLatency: number;
  readonly writeLatency: number;
  readonly conflictCount: number;
  readonly convergenceRate: number;
}

export class ConsistencyModel {
  private _levels: Map<string, ConsistencyLevel> = new Map();
  private _history: string[] = [];
  private _counter = 0;
  private _currentLevel: string = 'eventual';
  private _metrics: ConsistencyMetrics = {
    staleness: 0,
    readLatency: 0,
    writeLatency: 0,
    conflictCount: 0,
    convergenceRate: 0,
  };
  private _vectorClocks: Map<string, Map<string, number>> = new Map();
  private _lastResult: CAPResult | BASEProperties | null = null;

  constructor() {
    this._initDefaultLevels();
  }

  private _initDefaultLevels(): void {
    const levels: ConsistencyLevel[] = [
      { name: 'strong', type: 'strong', latency: 100, availability: 0.9, partitionTolerance: 0.7 },
      { name: 'eventual', type: 'eventual', latency: 10, availability: 0.99, partitionTolerance: 0.95 },
      { name: 'causal', type: 'causal', latency: 30, availability: 0.95, partitionTolerance: 0.85 },
      { name: 'session', type: 'session', latency: 20, availability: 0.97, partitionTolerance: 0.88 },
      { name: 'weak', type: 'weak', latency: 5, availability: 0.999, partitionTolerance: 0.99 },
    ];
    levels.forEach(level => this._levels.set(level.name, level));
  }

  get currentLevel(): string {
    return this._currentLevel;
  }

  get levelCount(): number {
    return this._levels.size;
  }

  get history(): string[] {
    return [...this._history];
  }

  get metrics(): ConsistencyMetrics {
    return { ...this._metrics };
  }

  get vectorClockCount(): number {
    return this._vectorClocks.size;
  }

  public strongConsistency(
    nodes: string[],
    readQuorum: number,
    writeQuorum: number
  ): {
    consistent: boolean;
    readQuorum: number;
    writeQuorum: number;
    latency: number;
    nodes: number;
  } {
    const quorumThreshold = Math.floor(nodes.length / 2) + 1;
    const consistent = readQuorum + writeQuorum > nodes.length;
    const latency = 50 + (readQuorum + writeQuorum) * 10;
    this._currentLevel = 'strong';
    this._metrics = {
      ...this._metrics,
      readLatency: latency,
      writeLatency: latency * 1.5,
      staleness: 0,
      conflictCount: 0,
    };
    this._recordHistory(`strongConsistency(nodes=${nodes.length}, R=${readQuorum}, W=${writeQuorum}) -> consistent=${consistent}`);
    return { consistent, readQuorum, writeQuorum, latency, nodes: nodes.length };
  }

  public eventualConsistency(
    nodes: string[],
    data: string[],
    convergenceRate: number
  ): {
    consistent: boolean;
    convergenceTime: number;
    conflicts: number;
    staleness: number;
    nodes: number;
  } {
    const consistent = convergenceRate > 0.9;
    const convergenceTime = Math.floor((1 - convergenceRate) * 5000);
    const conflicts = Math.floor(data.length * (1 - convergenceRate) * 0.15);
    const staleness = Math.floor(convergenceTime / 100);
    this._currentLevel = 'eventual';
    this._metrics = {
      ...this._metrics,
      staleness,
      convergenceRate,
      conflictCount: conflicts,
      readLatency: 5,
      writeLatency: 3,
    };
    this._recordHistory(`eventualConsistency(nodes=${nodes.length}, rate=${convergenceRate}) -> consistent=${consistent}`);
    return { consistent, convergenceTime, conflicts, staleness, nodes: nodes.length };
  }

  public capTheorem(
    consistency: number,
    availability: number,
    partitionTolerance: number
  ): CAPResult {
    const total = consistency + availability + partitionTolerance;
    let tradeoff: 'CP' | 'AP' | 'CA' | 'balanced' = 'balanced';
    let dominant = 'balanced';

    if (consistency >= availability && consistency >= partitionTolerance) {
      dominant = 'Consistency';
      if (partitionTolerance > availability) {
        tradeoff = 'CP';
      } else {
        tradeoff = 'CA';
      }
    } else if (availability >= consistency && availability >= partitionTolerance) {
      dominant = 'Availability';
      if (partitionTolerance > consistency) {
        tradeoff = 'AP';
      } else {
        tradeoff = 'CA';
      }
    } else {
      dominant = 'Partition Tolerance';
      if (consistency > availability) {
        tradeoff = 'CP';
      } else {
        tradeoff = 'AP';
      }
    }

    const result: CAPResult = {
      consistency,
      availability,
      partitionTolerance,
      tradeoff,
      dominant,
    };
    this._lastResult = result;
    this._recordHistory(`cap(C=${consistency}, A=${availability}, P=${partitionTolerance}) -> ${tradeoff}, dominant=${dominant}`);
    return result;
  }

  public baseTheory(
    basicallyAvailable: boolean,
    softState: boolean,
    eventuallyConsistent: boolean,
    systemScale: number
  ): BASEProperties {
    const convergenceTime = basicallyAvailable ? Math.floor(1000 / Math.sqrt(systemScale)) : 5000;
    const conflictRate = softState ? 0.05 : 0.01;
    const result: BASEProperties = {
      basicallyAvailable,
      softState,
      eventuallyConsistent,
      convergenceTime,
      conflictRate,
    };
    this._lastResult = result;
    this._recordHistory(`base(BA=${basicallyAvailable}, SS=${softState}, EC=${eventuallyConsistent}, scale=${systemScale})`);
    return result;
  }

  public causalConsistency(
    events: { node: string; key: string; value: string; timestamp: number }[],
    nodes: string[]
  ): {
    causallyConsistent: boolean;
    concurrentWrites: number;
    causallyRelated: number;
    vectorClocks: Map<string, number>;
  } {
    const clocks = new Map<string, number>();
    nodes.forEach(node => clocks.set(node, 0));

    let concurrentWrites = 0;
    let causallyRelated = 0;

    for (const event of events) {
      const currentClock = clocks.get(event.node) ?? 0;
      clocks.set(event.node, currentClock + 1);
      if (Math.random() > 0.7) {
        concurrentWrites++;
      } else {
        causallyRelated++;
      }
    }

    const causallyConsistent = concurrentWrites < events.length * 0.3;
    this._currentLevel = 'causal';
    this._metrics = {
      ...this._metrics,
      conflictCount: concurrentWrites,
      staleness: Math.floor(concurrentWrites * 10),
    };
    this._recordHistory(`causalConsistency(events=${events.length}, nodes=${nodes.length}) -> consistent=${causallyConsistent}`);
    return { causallyConsistent, concurrentWrites, causallyRelated, vectorClocks: clocks };
  }

  public sessionConsistency(
    sessionId: string,
    operations: { type: 'read' | 'write'; key: string; value?: string; timestamp: number }[],
    nodes: string[]
  ): {
    sessionId: string;
    consistent: boolean;
    readsAfterWrites: number;
    monotonicReads: number;
    operations: number;
  } {
    let readsAfterWrites = 0;
    let monotonicReads = 0;
    let lastWrite = 0;

    for (let i = 0; i < operations.length; i++) {
      const op = operations[i];
      if (op.type === 'write') {
        lastWrite = op.timestamp;
      } else if (op.type === 'read' && lastWrite > 0) {
        if (op.timestamp > lastWrite) {
          readsAfterWrites++;
        }
        if (i > 0 && operations[i - 1]?.type === 'read') {
          if (op.timestamp >= (operations[i - 1]?.timestamp ?? 0)) {
            monotonicReads++;
          }
        }
      }
    }

    const consistent = readsAfterWrites > 0 && monotonicReads > 0;
    this._currentLevel = 'session';
    this._recordHistory(`sessionConsistency(session=${sessionId}, ops=${operations.length}) -> consistent=${consistent}`);
    return { sessionId, consistent, readsAfterWrites, monotonicReads, operations: operations.length };
  }

  public monotonicReads(
    readSequence: { key: string; value: string; version: number; node: string }[]
  ): {
    monotonic: boolean;
    violations: number;
    totalReads: number;
    versionProgress: number;
  } {
    let violations = 0;
    let prevVersion = -Infinity;

    for (const read of readSequence) {
      if (read.version < prevVersion) {
        violations++;
      }
      prevVersion = Math.max(prevVersion, read.version);
    }

    const monotonic = violations === 0;
    const versionProgress = readSequence.length > 0
      ? (readSequence[readSequence.length - 1].version - (readSequence[0]?.version ?? 0)) / readSequence.length
      : 0;
    this._recordHistory(`monotonicReads(reads=${readSequence.length}) -> monotonic=${monotonic}, violations=${violations}`);
    return { monotonic, violations, totalReads: readSequence.length, versionProgress };
  }

  public monotonicWrites(
    writeSequence: { key: string; value: string; version: number; node: string }[]
  ): {
    monotonic: boolean;
    outOfOrderWrites: number;
    totalWrites: number;
    finalVersion: number;
  } {
    let outOfOrderWrites = 0;
    let maxVersion = 0;

    for (const write of writeSequence) {
      if (write.version < maxVersion) {
        outOfOrderWrites++;
      }
      maxVersion = Math.max(maxVersion, write.version);
    }

    const monotonic = outOfOrderWrites === 0;
    this._recordHistory(`monotonicWrites(writes=${writeSequence.length}) -> monotonic=${monotonic}, outOfOrder=${outOfOrderWrites}`);
    return { monotonic, outOfOrderWrites, totalWrites: writeSequence.length, finalVersion: maxVersion };
  }

  public readYourWrites(
    operations: { type: 'read' | 'write'; key: string; value?: string; version: number }[],
    clientId: string
  ): {
    consistent: boolean;
    readAfterWriteCount: number;
    staleReads: number;
    clientId: string;
  } {
    let readAfterWriteCount = 0;
    let staleReads = 0;
    let lastWriteVersion: number | null = null;

    for (const op of operations) {
      if (op.type === 'write') {
        lastWriteVersion = op.version;
      } else if (op.type === 'read' && lastWriteVersion !== null) {
        if (op.version >= lastWriteVersion) {
          readAfterWriteCount++;
        } else {
          staleReads++;
        }
      }
    }

    const consistent = staleReads === 0;
    this._recordHistory(`readYourWrites(client=${clientId}, ops=${operations.length}) -> consistent=${consistent}`);
    return { consistent, readAfterWriteCount, staleReads, clientId };
  }

  public writesFollowReads(
    operations: { type: 'read' | 'write'; key: string; value?: string; version: number }[],
    clientId: string
  ): {
    consistent: boolean;
    writeAfterReadCount: number;
    violations: number;
    clientId: string;
  } {
    let writeAfterReadCount = 0;
    let violations = 0;
    let lastReadVersion: number | null = null;

    for (const op of operations) {
      if (op.type === 'read') {
        lastReadVersion = op.version;
      } else if (op.type === 'write' && lastReadVersion !== null) {
        if (op.version >= lastReadVersion) {
          writeAfterReadCount++;
        } else {
          violations++;
        }
      }
    }

    const consistent = violations === 0;
    this._recordHistory(`writesFollowReads(client=${clientId}, ops=${operations.length}) -> consistent=${consistent}`);
    return { consistent, writeAfterReadCount, violations, clientId };
  }

  public quorumConsistency(
    nodes: string[],
    readQuorum: number,
    writeQuorum: number
  ): {
    strongConsistency: boolean;
    readRepair: boolean;
    sloppyQuorum: boolean;
    hintedHandoff: boolean;
    nodes: number;
  } {
    const strongConsistency = readQuorum + writeQuorum > nodes.length;
    const readRepair = readQuorum > 1;
    const sloppyQuorum = nodes.length > readQuorum + writeQuorum;
    const hintedHandoff = sloppyQuorum;
    this._recordHistory(`quorumConsistency(nodes=${nodes.length}, R=${readQuorum}, W=${writeQuorum}) -> strong=${strongConsistency}`);
    return { strongConsistency, readRepair, sloppyQuorum, hintedHandoff, nodes: nodes.length };
  }

  public linearizability(
    operations: { type: 'read' | 'write'; key: string; value?: string; start: number; end: number; result?: string }[]
  ): {
    linearizable: boolean;
    linearizationPoints: number[];
    violations: number;
    operations: number;
  } {
    const sorted = [...operations].sort((a, b) => a.end - b.end);
    const linearizationPoints = sorted.map((op, idx) => op.start + (op.end - op.start) * (idx / sorted.length));
    let violations = 0;
    let lastWriteValue: string | null = null;

    for (let i = 0; i < sorted.length; i++) {
      const op = sorted[i];
      if (op.type === 'write') {
        lastWriteValue = op.value ?? null;
      } else if (op.type === 'read' && lastWriteValue !== null) {
        if (op.result !== undefined && op.result !== lastWriteValue && Math.random() > 0.8) {
          violations++;
        }
      }
    }

    const linearizable = violations === 0;
    this._recordHistory(`linearizability(ops=${operations.length}) -> linearizable=${linearizable}, violations=${violations}`);
    return { linearizable, linearizationPoints, violations, operations: operations.length };
  }

  public sequentialConsistency(
    operations: { process: number; type: 'read' | 'write'; key: string; value?: string; seq: number }[]
  ): {
    sequentiallyConsistent: boolean;
    validOrdering: boolean;
    processCount: number;
    operations: number;
  } {
    const processCount = new Set(operations.map(o => o.process)).size;
    const validOrdering = Math.random() > 0.2;
    const sequentiallyConsistent = validOrdering;
    this._recordHistory(`sequentialConsistency(ops=${operations.length}, processes=${processCount}) -> consistent=${sequentiallyConsistent}`);
    return { sequentiallyConsistent, validOrdering, processCount, operations: operations.length };
  }

  public eventualConsistencyModels(
    model: 'gossip' | 'anti-entropy' | 'read-repair' | 'hinted-handoff',
    nodes: string[],
    data: string[]
  ): {
    model: string;
    convergenceTime: number;
    bandwidthUsage: number;
    conflictResolution: string;
  } {
    let convergenceTime = 1000;
    let bandwidthUsage = 0.5;
    let conflictResolution = 'last-write-wins';

    switch (model) {
      case 'gossip':
        convergenceTime = Math.floor(500 * Math.log2(nodes.length || 1));
        bandwidthUsage = 0.3;
        conflictResolution = 'vector-clock';
        break;
      case 'anti-entropy':
        convergenceTime = Math.floor(200 * nodes.length);
        bandwidthUsage = 0.8;
        conflictResolution = 'version-vector';
        break;
      case 'read-repair':
        convergenceTime = 100;
        bandwidthUsage = 0.2;
        conflictResolution = 'last-write-wins';
        break;
      case 'hinted-handoff':
        convergenceTime = 5000;
        bandwidthUsage = 0.1;
        conflictResolution = 'merge';
        break;
    }

    this._recordHistory(`eventualModel(${model}, nodes=${nodes.length}) -> convergence=${convergenceTime}ms`);
    return { model, convergenceTime, bandwidthUsage, conflictResolution };
  }

  public toPacket(): DataPacket<{
    currentLevel: string;
    levels: number;
    history: string[];
    metrics: ConsistencyMetrics;
    vectorClocks: number;
  }> {
    const payload = {
      currentLevel: this._currentLevel,
      levels: this._levels.size,
      history: [...this._history],
      metrics: { ...this._metrics },
      vectorClocks: this._vectorClocks.size,
    };
    this._counter++;
    return {
      id: `consistency-model-${Date.now()}-${this._counter}`,
      payload,
      metadata: {
        createdAt: Date.now(),
        route: ['distributed_systems', 'consistency', 'result'],
        priority: 0.8,
        phase: 'consistency-verification',
      },
    };
  }

  public reset(): void {
    this._levels.clear();
    this._history = [];
    this._counter = 0;
    this._currentLevel = 'eventual';
    this._metrics = {
      staleness: 0,
      readLatency: 0,
      writeLatency: 0,
      conflictCount: 0,
      convergenceRate: 0,
    };
    this._vectorClocks.clear();
    this._lastResult = null;
    this._initDefaultLevels();
  }

  private _recordHistory(entry: string): void {
    this._counter++;
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
  }
}
