import type { DataPacket, KnowledgeUnit, Signal } from '../shared/types';

export type SemiosisPhase = 'representation' | 'interpretation' | 'transformation' | 'transmission' | 'internalization';

export interface SemiosisEvent {
  id: string;
  phase: SemiosisPhase;
  source: string;
  target: string;
  sign: KnowledgeUnit;
  meaningShift: number;
  context: string;
  timestamp: number;
}

export interface InterpretationChain {
  id: string;
  events: SemiosisEvent[];
  totalMeaningShift: number;
  chainLength: number;
  fidelity: number;
  startTime: number;
}

export interface SemiosisState {
  activeChains: number;
  totalEvents: number;
  avgFidelity: number;
  avgMeaningShift: number;
  phaseDistribution: Record<SemiosisPhase, number>;
  culturalDensity: number;
}

export interface ISemiosisEngine {
  startChain(initialSign: KnowledgeUnit, context: string): InterpretationChain;
  advanceChain(chainId: string): SemiosisEvent | null;
  getChain(chainId: string): InterpretationChain | undefined;
  getState(): SemiosisState;
  propagateSign(sign: KnowledgeUnit, context: string): SemiosisEvent[];
  injectSignal(signal: Signal): void;
  processPacket(packet: DataPacket): DataPacket;
  reset(): void;
}

export class SemiosisEngine implements ISemiosisEngine {
  private _chains: Map<string, InterpretationChain> = new Map();
  private _eventLog: SemiosisEvent[] = [];
  private _phaseTransitionMatrix: Record<SemiosisPhase, Record<SemiosisPhase, number>>;
  private _meaningDecayRate: number = 0.05;
  private _noiseLevel: number = 0.02;
  private _maxChains: number = 100;
  private _maxEvents: number = 1000;
  private _lastUpdate: number = Date.now();
  private _interpretants: Map<string, KnowledgeUnit> = new Map();
  private _culturalMemory: KnowledgeUnit[] = [];
  private _culturalCapacity: number = 200;
  private _transmissionFidelity: number = 0.9;
  private _abstractionDepth: number = 3;

  constructor() {
    this._phaseTransitionMatrix = this._initializePhaseTransitions();
  }

  get chainCount(): number { return this._chains.size; }
  get totalEvents(): number { return this._eventLog.length; }
  get meaningDecayRate(): number { return this._meaningDecayRate; }
  set meaningDecayRate(value: number) { this._meaningDecayRate = Math.max(0, Math.min(0.5, value)); }
  get noiseLevel(): number { return this._noiseLevel; }
  set noiseLevel(value: number) { this._noiseLevel = Math.max(0, Math.min(0.3, value)); }
  get transmissionFidelity(): number { return this._transmissionFidelity; }
  set transmissionFidelity(value: number) { this._transmissionFidelity = Math.max(0, Math.min(1, value)); }
  get culturalDensity(): number { return this._culturalMemory.length / this._culturalCapacity; }

  private _initializePhaseTransitions(): Record<SemiosisPhase, Record<SemiosisPhase, number>> {
    return {
      representation: { representation: 0.1, interpretation: 0.6, transformation: 0.2, transmission: 0.1, internalization: 0 },
      interpretation: { representation: 0.1, interpretation: 0.2, transformation: 0.5, transmission: 0.1, internalization: 0.1 },
      transformation: { representation: 0.1, interpretation: 0.3, transformation: 0.2, transmission: 0.3, internalization: 0.1 },
      transmission: { representation: 0.2, interpretation: 0.4, transformation: 0.2, transmission: 0.1, internalization: 0.1 },
      internalization: { representation: 0.3, interpretation: 0.3, transformation: 0.2, transmission: 0.1, internalization: 0.1 },
    };
  }

  startChain(initialSign: KnowledgeUnit, context: string): InterpretationChain {
    const chainId = `chain-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const initialEvent: SemiosisEvent = {
      id: `event-${Date.now()}-0`,
      phase: 'representation',
      source: 'origin',
      target: 'system',
      sign: initialSign,
      meaningShift: 0,
      context,
      timestamp: Date.now(),
    };

    const chain: InterpretationChain = {
      id: chainId,
      events: [initialEvent],
      totalMeaningShift: 0,
      chainLength: 1,
      fidelity: 1,
      startTime: Date.now(),
    };

    this._chains.set(chainId, chain);
    this._eventLog.push(initialEvent);

    if (this._chains.size > this._maxChains) {
      this._pruneOldestChains();
    }

    if (this._eventLog.length > this._maxEvents) {
      this._eventLog = this._eventLog.slice(-this._maxEvents);
    }

    return chain;
  }

  advanceChain(chainId: string): SemiosisEvent | null {
    const chain = this._chains.get(chainId);
    if (!chain) return null;

    const lastEvent = chain.events[chain.events.length - 1];
    if (!lastEvent) return null;

    const nextPhase = this._selectNextPhase(lastEvent.phase);
    const meaningShift = this._computeMeaningShift(lastEvent, nextPhase);
    const transformedSign = this._transformSign(lastEvent.sign, meaningShift, nextPhase);

    const event: SemiosisEvent = {
      id: `event-${Date.now()}-${chain.chainLength}`,
      phase: nextPhase,
      source: lastEvent.target,
      target: this._selectTarget(nextPhase),
      sign: transformedSign,
      meaningShift,
      context: lastEvent.context,
      timestamp: Date.now(),
    };

    chain.events.push(event);
    chain.chainLength++;
    chain.totalMeaningShift += meaningShift;
    chain.fidelity = Math.max(0, 1 - chain.totalMeaningShift);

    this._eventLog.push(event);
    if (this._eventLog.length > this._maxEvents) {
      this._eventLog.shift();
    }

    if (nextPhase === 'internalization') {
      this._addToCulturalMemory(transformedSign);
    }

    return event;
  }

  private _selectNextPhase(current: SemiosisPhase): SemiosisPhase {
    const transitions = this._phaseTransitionMatrix[current];
    const phases = Object.keys(transitions) as SemiosisPhase[];
    const probs = phases.map(p => transitions[p]);

    const total = probs.reduce((s, p) => s + p, 0);
    let rand = Math.random() * total;

    for (let i = 0; i < phases.length; i++) {
      rand -= probs[i];
      if (rand <= 0) return phases[i];
    }

    return phases[phases.length - 1];
  }

  private _computeMeaningShift(lastEvent: SemiosisEvent, nextPhase: SemiosisPhase): number {
    const baseShift = this._meaningDecayRate * 0.1;
    const phaseMultiplier: Record<SemiosisPhase, number> = {
      representation: 0.5,
      interpretation: 1.2,
      transformation: 1.5,
      transmission: 0.8,
      internalization: 0.3,
    };

    const shift = baseShift * phaseMultiplier[nextPhase];
    const noise = (Math.random() - 0.5) * this._noiseLevel;
    return Math.max(0, shift + noise);
  }

  private _transformSign(sign: KnowledgeUnit, shift: number, phase: SemiosisPhase): KnowledgeUnit {
    const newVector = sign.vector.map(v => {
      const noise = (Math.random() - 0.5) * shift;
      const drift = phase === 'transformation' ? shift * 0.1 : 0;
      return v + noise + drift;
    });

    const magnitude = Math.sqrt(newVector.reduce((s, v) => s + v * v, 0));
    const normalized = magnitude > 0 ? newVector.map(v => v / magnitude) : newVector;

    return {
      id: `${sign.id}-${phase}-${Date.now()}`,
      content: sign.content,
      vector: normalized,
      lineage: [...sign.lineage, phase],
    };
  }

  private _selectTarget(phase: SemiosisPhase): string {
    const targets: Record<SemiosisPhase, string[]> = {
      representation: ['perceptual-system', 'memory'],
      interpretation: ['cognition', 'emotion', 'reasoning'],
      transformation: ['abstraction', 'metaphor', 'analogy'],
      transmission: ['channel-a', 'channel-b', 'channel-c'],
      internalization: ['long-term-memory', 'cultural-store'],
    };
    const options = targets[phase];
    return options[Math.floor(Math.random() * options.length)];
  }

  private _addToCulturalMemory(sign: KnowledgeUnit): void {
    const existing = this._culturalMemory.find(s => s.id === sign.id);
    if (existing) {
      const idx = this._culturalMemory.indexOf(existing);
      this._culturalMemory.splice(idx, 1);
    }
    this._culturalMemory.push(sign);

    if (this._culturalMemory.length > this._culturalCapacity) {
      this._culturalMemory.shift();
    }
  }

  getChain(chainId: string): InterpretationChain | undefined {
    const chain = this._chains.get(chainId);
    if (!chain) return undefined;
    return {
      ...chain,
      events: chain.events.map(e => ({ ...e, sign: { ...e.sign } })),
    };
  }

  propagateSign(sign: KnowledgeUnit, context: string): SemiosisEvent[] {
    const chain = this.startChain(sign, context);
    const events: SemiosisEvent[] = [...chain.events];

    const steps = Math.floor(Math.random() * this._abstractionDepth) + 2;
    for (let i = 0; i < steps; i++) {
      const event = this.advanceChain(chain.id);
      if (event) events.push(event);
    }

    return events;
  }

  getState(): SemiosisState {
    const phaseDistribution: Record<SemiosisPhase, number> = {
      representation: 0,
      interpretation: 0,
      transformation: 0,
      transmission: 0,
      internalization: 0,
    };

    let totalShift = 0;
    let totalFidelity = 0;

    for (const chain of this._chains.values()) {
      totalShift += chain.totalMeaningShift;
      totalFidelity += chain.fidelity;
    }

    for (const event of this._eventLog.slice(-100)) {
      phaseDistribution[event.phase]++;
    }

    const totalPhases = Object.values(phaseDistribution).reduce((s, v) => s + v, 0) || 1;
    for (const phase of Object.keys(phaseDistribution) as SemiosisPhase[]) {
      phaseDistribution[phase] /= totalPhases;
    }

    const chainCount = Math.max(1, this._chains.size);

    return {
      activeChains: this._chains.size,
      totalEvents: this._eventLog.length,
      avgFidelity: totalFidelity / chainCount,
      avgMeaningShift: totalShift / chainCount,
      phaseDistribution,
      culturalDensity: this.culturalDensity,
    };
  }

  private _pruneOldestChains(): void {
    const sorted = Array.from(this._chains.values())
      .sort((a, b) => a.startTime - b.startTime);
    const toRemove = sorted.slice(0, Math.floor(sorted.length * 0.2));
    for (const chain of toRemove) {
      this._chains.delete(chain.id);
    }
  }

  getActiveChains(limit: number = 10): InterpretationChain[] {
    return Array.from(this._chains.values())
      .sort((a, b) => b.startTime - a.startTime)
      .slice(0, limit)
      .map(c => ({ ...c, events: c.events.map(e => ({ ...e, sign: { ...e.sign } })) }));
  }

  getRecentEvents(limit: number = 20): SemiosisEvent[] {
    return this._eventLog.slice(-limit).map(e => ({ ...e, sign: { ...e.sign } }));
  }

  injectSignal(signal: Signal): void {
    const sign: KnowledgeUnit = {
      id: `signal-${signal.source}-${Date.now()}`,
      content: `Signal from ${signal.source}`,
      vector: [signal.magnitude, signal.entropy, 0, 0, 0, 0, 0, 0],
      lineage: [signal.source, 'signal-injection'],
    };
    this.propagateSign(sign, signal.source);
  }

  setPhaseTransition(from: SemiosisPhase, to: SemiosisPhase, probability: number): void {
    this._phaseTransitionMatrix[from][to] = Math.max(0, probability);
  }

  getPhaseTransitionMatrix(): Record<SemiosisPhase, Record<SemiosisPhase, number>> {
    const result: Record<string, Record<string, number>> = {};
    for (const from of Object.keys(this._phaseTransitionMatrix) as SemiosisPhase[]) {
      result[from] = { ...this._phaseTransitionMatrix[from] };
    }
    return result as Record<SemiosisPhase, Record<SemiosisPhase, number>>;
  }

  getCulturalMemory(limit: number = 20): KnowledgeUnit[] {
    return this._culturalMemory.slice(-limit).map(k => ({ ...k }));
  }

  simulateSemiosis(steps: number, context: string = 'default'): SemiosisState[] {
    const states: SemiosisState[] = [];

    for (let i = 0; i < steps; i++) {
      if (Math.random() < 0.3) {
        const sign: KnowledgeUnit = {
          id: `sim-sign-${i}-${Date.now()}`,
          content: `Simulated sign ${i}`,
          vector: Array.from({ length: 8 }, () => Math.random()),
          lineage: ['simulated'],
        };
        this.propagateSign(sign, context);
      }

      for (const chainId of this._chains.keys()) {
        if (Math.random() < 0.5) {
          this.advanceChain(chainId);
        }
      }

      states.push(this.getState());
    }

    return states;
  }

  processPacket(packet: DataPacket): DataPacket {
    const state = this.getState();
    return {
      ...packet,
      payload: {
        ...packet.payload as object,
        semiosis: state,
      },
      metadata: {
        ...packet.metadata,
        route: [...packet.metadata.route, 'semiosis-engine'],
        residue: state,
      },
    };
  }

  reset(): void {
    this._chains.clear();
    this._eventLog = [];
    this._interpretants.clear();
    this._culturalMemory = [];
    this._phaseTransitionMatrix = this._initializePhaseTransitions();
    this._lastUpdate = Date.now();
  }
}
