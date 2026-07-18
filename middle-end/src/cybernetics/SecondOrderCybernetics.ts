import type { DataPacket, KnowledgeUnit } from '../shared/types';

export type ObservationLevel = 'first-order' | 'second-order' | 'third-order';

export interface Observer {
  id: string;
  name: string;
  level: ObservationLevel;
  focus: string;
  bias: number;
  precision: number;
}

export interface ObservationRecord {
  observerId: string;
  targetId: string;
  timestamp: number;
  level: ObservationLevel;
  content: KnowledgeUnit;
  selfReferenceDepth: number;
  perturbation: number;
}

export interface ObservationMatrix {
  observers: string[];
  targets: string[];
  matrix: number[][];
}

export interface ISecondOrderCybernetics {
  addObserver(id: string, name: string, level: ObservationLevel): void;
  addObservation(observerId: string, targetId: string, content: KnowledgeUnit): ObservationRecord;
  computeSelfReferenceDepth(observerId: string): number;
  computeObservationMatrix(): ObservationMatrix;
  getObserverState(observerId: string): Observer | undefined;
  updateObserver(observerId: string, updates: Partial<Observer>): void;
  processPacket(packet: DataPacket): DataPacket;
  reset(): void;
}

export class SecondOrderCybernetics implements ISecondOrderCybernetics {
  private _observers: Map<string, Observer> = new Map();
  private _observations: ObservationRecord[] = [];
  private _observationGraph: Map<string, Set<string>> = new Map();
  private _selfReferenceDepths: Map<string, number> = new Map();
  private _perturbationHistory: Map<string, number[]> = new Map();
  private _couplingStrength: number = 0.6;
  private _reflectionThreshold: number = 3;
  private _maxObservations: number = 1000;
  private _observerCouplings: Map<string, Map<string, number>> = new Map();
  private _autopoiesisActive: boolean = false;

  constructor() {
    this._initializeMetaObserver();
  }

  get observerCount(): number { return this._observers.size; }
  get observationCount(): number { return this._observations.length; }
  get couplingStrength(): number { return this._couplingStrength; }
  set couplingStrength(value: number) { this._couplingStrength = Math.max(0, Math.min(1, value)); }
  get reflectionThreshold(): number { return this._reflectionThreshold; }
  set reflectionThreshold(value: number) { this._reflectionThreshold = Math.max(1, value); }
  get autopoiesisActive(): boolean { return this._autopoiesisActive; }
  get observerIds(): string[] { return Array.from(this._observers.keys()); }

  private _initializeMetaObserver(): void {
    this.addObserver('meta', 'Meta-Observer', 'third-order');
    const meta = this._observers.get('meta');
    if (meta) {
      meta.precision = 0.9;
      meta.bias = 0.05;
    }
  }

  addObserver(id: string, name: string, level: ObservationLevel): void {
    if (this._observers.has(id)) return;
    this._observers.set(id, {
      id,
      name,
      level,
      focus: '',
      bias: 0.1 + Math.random() * 0.2,
      precision: 0.7 + Math.random() * 0.2,
    });
    this._observationGraph.set(id, new Set());
    this._observerCouplings.set(id, new Map());
    this._perturbationHistory.set(id, []);
  }

  addObservation(observerId: string, targetId: string, content: KnowledgeUnit): ObservationRecord {
    const observer = this._observers.get(observerId);
    if (!observer) {
      this.addObserver(observerId, observerId, 'first-order');
    }

    const obs = this._observers.get(observerId)!;
    const isSelfObservation = observerId === targetId;
    const selfRefDepth = isSelfObservation
      ? this._computeSelfReferenceDepthRecursive(observerId, new Set())
      : 0;

    const perturbation = this._calculatePerturbation(observerId, targetId, obs);

    const record: ObservationRecord = {
      observerId,
      targetId,
      timestamp: Date.now(),
      level: obs.level,
      content: this._applyObserverBias(content, obs),
      selfReferenceDepth: selfRefDepth,
      perturbation,
    };

    this._observations.push(record);
    if (this._observations.length > this._maxObservations) {
      this._observations.shift();
    }

    this._observationGraph.get(observerId)?.add(targetId);
    this._updateCoupling(observerId, targetId, perturbation);
    this._updatePerturbationHistory(observerId, perturbation);

    if (selfRefDepth >= this._reflectionThreshold) {
      this._triggerReflection(observerId, record);
    }

    return record;
  }

  private _applyObserverBias(content: KnowledgeUnit, observer: Observer): KnowledgeUnit {
    const biasedVector = content.vector.map(v => {
      const bias = (Math.random() - 0.5) * observer.bias * 2;
      return v + bias;
    });

    const magnitude = Math.sqrt(biasedVector.reduce((s, v) => s + v * v, 0));
    const normalized = magnitude > 0 ? biasedVector.map(v => v / magnitude) : biasedVector;

    return {
      ...content,
      vector: normalized,
      lineage: [...content.lineage, `observed-by-${observer.id}`],
    };
  }

  private _calculatePerturbation(observerId: string, targetId: string, observer: Observer): number {
    if (observerId === targetId) {
      return 0.8 * observer.precision;
    }

    const basePerturbation = 0.1 * (1 - observer.precision);
    const coupling = this._observerCouplings.get(observerId)?.get(targetId) || 0;
    return basePerturbation + coupling * this._couplingStrength * 0.3;
  }

  private _updateCoupling(sourceId: string, targetId: string, perturbation: number): void {
    const sourceMap = this._observerCouplings.get(sourceId);
    if (!sourceMap) return;
    const current = sourceMap.get(targetId) || 0;
    const updated = current * 0.9 + perturbation * 0.1;
    sourceMap.set(targetId, Math.min(1, updated));
  }

  private _updatePerturbationHistory(observerId: string, perturbation: number): void {
    const history = this._perturbationHistory.get(observerId);
    if (!history) return;
    history.push(perturbation);
    if (history.length > 100) history.shift();
  }

  private _computeSelfReferenceDepthRecursive(observerId: string, visited: Set<string>): number {
    if (visited.has(observerId)) return 0;
    visited.add(observerId);

    const targets = this._observationGraph.get(observerId);
    if (!targets || !targets.has(observerId)) return 0;

    let maxDepth = 1;
    const observer = this._observers.get(observerId);
    if (observer && observer.level === 'second-order') {
      maxDepth = 2;
    } else if (observer && observer.level === 'third-order') {
      maxDepth = 3;
    }

    return maxDepth;
  }

  computeSelfReferenceDepth(observerId: string): number {
    return this._computeSelfReferenceDepthRecursive(observerId, new Set());
  }

  private _triggerReflection(observerId: string, record: ObservationRecord): void {
    const observer = this._observers.get(observerId);
    if (!observer) return;

    observer.precision = Math.min(0.99, observer.precision + 0.01);
    observer.bias = Math.max(0.01, observer.bias * 0.95);

    const metaRecord: ObservationRecord = {
      observerId: 'meta',
      targetId: observerId,
      timestamp: Date.now(),
      level: 'third-order',
      content: {
        id: `reflection-${record.content.id}`,
        content: `Reflection on observation of ${record.content.id}`,
        vector: record.content.vector.map(v => v * 0.5),
        lineage: [...record.content.lineage, 'meta-reflection'],
      },
      selfReferenceDepth: record.selfReferenceDepth + 1,
      perturbation: record.perturbation * 0.5,
    };

    this._observations.push(metaRecord);
    this._observationGraph.get('meta')?.add(observerId);
  }

  computeObservationMatrix(): ObservationMatrix {
    const observerIds = Array.from(this._observers.keys());
    const allTargets = new Set<string>();

    for (const targets of this._observationGraph.values()) {
      for (const t of targets) allTargets.add(t);
    }

    const targetIds = Array.from(allTargets);
    const matrix: number[][] = observerIds.map(obsId =>
      targetIds.map(tgtId => {
        const history = this._observations.filter(
          o => o.observerId === obsId && o.targetId === tgtId
        );
        if (history.length === 0) return 0;
        return history.reduce((s, o) => s + o.perturbation, 0) / history.length;
      })
    );

    return { observers: observerIds, targets: targetIds, matrix };
  }

  getObserverState(observerId: string): Observer | undefined {
    const obs = this._observers.get(observerId);
    return obs ? { ...obs } : undefined;
  }

  updateObserver(observerId: string, updates: Partial<Observer>): void {
    const observer = this._observers.get(observerId);
    if (!observer) return;
    Object.assign(observer, updates);
    if (observer.bias !== undefined) observer.bias = Math.max(0, Math.min(1, observer.bias));
    if (observer.precision !== undefined) observer.precision = Math.max(0, Math.min(1, observer.precision));
  }

  getObservationsByObserver(observerId: string): ObservationRecord[] {
    return this._observations.filter(o => o.observerId === observerId).map(o => ({ ...o }));
  }

  getObservationsByTarget(targetId: string): ObservationRecord[] {
    return this._observations.filter(o => o.targetId === targetId).map(o => ({ ...o }));
  }

  getObservationHistory(limit: number = 100): ObservationRecord[] {
    return this._observations.slice(-limit).map(o => ({ ...o }));
  }

  computeMutualObservation(observerA: string, observerB: string): number {
    const aObservesB = this._observations.filter(
      o => o.observerId === observerA && o.targetId === observerB
    ).length;
    const bObservesA = this._observations.filter(
      o => o.observerId === observerB && o.targetId === observerA
    ).length;
    return Math.min(aObservesB, bObservesA) / Math.max(1, Math.max(aObservesB, bObservesA));
  }

  getPerturbationLevel(observerId: string): number {
    const history = this._perturbationHistory.get(observerId);
    if (!history || history.length === 0) return 0;
    return history.reduce((a, b) => a + b, 0) / history.length;
  }

  toggleAutopoiesis(): boolean {
    this._autopoiesisActive = !this._autopoiesisActive;
    return this._autopoiesisActive;
  }

  processPacket(packet: DataPacket): DataPacket {
    const observerStats = {
      totalObservers: this._observers.size,
      totalObservations: this._observations.length,
      avgSelfRefDepth: this._computeAvgSelfRefDepth(),
      couplingStrength: this._couplingStrength,
      autopoiesisActive: this._autopoiesisActive,
    };

    return {
      ...packet,
      payload: {
        ...packet.payload as object,
        cybernetics: observerStats,
      },
      metadata: {
        ...packet.metadata,
        route: [...packet.metadata.route, 'second-order-cybernetics'],
        residue: observerStats,
      },
    };
  }

  private _computeAvgSelfRefDepth(): number {
    if (this._observations.length === 0) return 0;
    const total = this._observations.reduce((s, o) => s + o.selfReferenceDepth, 0);
    return total / this._observations.length;
  }

  simulateObservationNetwork(steps: number = 10): ObservationRecord[] {
    const records: ObservationRecord[] = [];
    const ids = Array.from(this._observers.keys());

    for (let i = 0; i < steps; i++) {
      const observerIdx = Math.floor(Math.random() * ids.length);
      const targetIdx = Math.floor(Math.random() * ids.length);

      const record = this.addObservation(
        ids[observerIdx],
        ids[targetIdx],
        {
          id: `sim-${Date.now()}-${i}`,
          content: `Simulated observation ${i}`,
          vector: Array.from({ length: 8 }, () => Math.random()),
          lineage: ['simulated'],
        }
      );
      records.push(record);
    }

    return records;
  }

  reset(): void {
    this._observers.clear();
    this._observations = [];
    this._observationGraph.clear();
    this._selfReferenceDepths.clear();
    this._perturbationHistory.clear();
    this._observerCouplings.clear();
    this._autopoiesisActive = false;
    this._initializeMetaObserver();
  }
}
