import { DataPacket, Signal, KnowledgeUnit } from '../shared/types';

export interface MemoryTrace {
  id: string;
  content: string;
  encodingStrategy: string;
  strength: number;
  depth: number;
  chunks: string[];
  associations: string[];
  createdAt: number;
  lastRehearsed: number;
  metadata: Record<string, unknown>;
}

export interface EncodingStrategy {
  id: string;
  name: string;
  type: 'visual' | 'acoustic' | 'semantic' | 'elaborative' | 'maintenance';
  effectiveness: number;
  description: string;
}

export interface MemoryChunk {
  id: string;
  traceId: string;
  content: string;
  size: number;
  position: number;
  linkedChunks: string[];
}

export class EncodingEngine {
  private _traces: Map<string, MemoryTrace> = new Map();
  private _strategies: Map<string, EncodingStrategy> = new Map();
  private _chunks: Map<string, MemoryChunk> = new Map();
  private _encodingDepth = 0.5;
  private _history: string[] = [];
  private _counter = 0;

  constructor() {
    this._initDefaultStrategies();
  }

  encode(content: string, strategy: string): MemoryTrace {
    const id = `trace-${(++this._counter).toString(36)}-${Date.now().toString(36)}`;
    const strat = this._strategies.get(strategy);
    const effectiveness = strat?.effectiveness ?? 0.5;

    const trace: MemoryTrace = {
      id,
      content,
      encodingStrategy: strategy,
      strength: effectiveness,
      depth: this._encodingDepth * effectiveness,
      chunks: [],
      associations: [],
      createdAt: Date.now(),
      lastRehearsed: Date.now(),
      metadata: {},
    };

    this._traces.set(id, trace);
    this._recordHistory(`encode:${strategy}`);
    return trace;
  }

  chunking(items: string[]): MemoryChunk[] {
    const traceId = `trace-chunk-${(++this._counter).toString(36)}`;
    const chunks: MemoryChunk[] = [];
    const chunkSize = 7;

    for (let i = 0; i < items.length; i += chunkSize) {
      const chunkItems = items.slice(i, i + chunkSize);
      const chunkId = `chunk-${(++this._counter).toString(36)}`;
      const chunk: MemoryChunk = {
        id: chunkId,
        traceId,
        content: chunkItems.join(' | '),
        size: chunkItems.length,
        position: i / chunkSize,
        linkedChunks: [],
      };
      this._chunks.set(chunkId, chunk);
      chunks.push(chunk);
    }

    if (chunks.length > 0) {
      for (let i = 0; i < chunks.length - 1; i++) {
        chunks[i].linkedChunks.push(chunks[i + 1].id);
        chunks[i + 1].linkedChunks.push(chunks[i].id);
      }

      const trace: MemoryTrace = {
        id: traceId,
        content: `Chunked memory: ${items.length} items`,
        encodingStrategy: 'chunking',
        strength: 0.6,
        depth: 0.5,
        chunks: chunks.map(c => c.id),
        associations: [],
        createdAt: Date.now(),
        lastRehearsed: Date.now(),
        metadata: { itemCount: items.length, chunkCount: chunks.length },
      };
      this._traces.set(traceId, trace);
    }

    this._recordHistory(`chunking:${items.length}items`);
    return chunks;
  }

  elaborativeRehearsal(traceId: string): MemoryTrace | null {
    const trace = this._traces.get(traceId);
    if (!trace) return null;

    trace.strength = Math.min(1, trace.strength + 0.15);
    trace.depth = Math.min(1, trace.depth + 0.2);
    trace.lastRehearsed = Date.now();

    this._recordHistory(`elaborativeRehearsal:${traceId}`);
    return trace;
  }

  mnemonicAssociation(traceId: string, cues: string[]): MemoryTrace | null {
    const trace = this._traces.get(traceId);
    if (!trace) return null;

    trace.associations = [...new Set([...trace.associations, ...cues])];
    trace.strength = Math.min(1, trace.strength + 0.1);
    trace.lastRehearsed = Date.now();

    this._recordHistory(`mnemonicAssociation:${traceId}:${cues.length}cues`);
    return trace;
  }

  spacingEffect(traceId: string, intervals: number[]): MemoryTrace | null {
    const trace = this._traces.get(traceId);
    if (!trace) return null;

    const totalInterval = intervals.reduce((s, i) => s + i, 0);
    const spacedStrength = intervals.length * 0.08;
    trace.strength = Math.min(1, trace.strength + spacedStrength);
    trace.lastRehearsed = Date.now();
    trace.metadata.spacingIntervals = intervals;
    trace.metadata.totalSpacing = totalInterval;

    this._recordHistory(`spacingEffect:${traceId}:${intervals.length}intervals`);
    return trace;
  }

  depthOfProcessing(content: string, depth: 'shallow' | 'intermediate' | 'deep'): MemoryTrace {
    const depthMap = { shallow: 0.2, intermediate: 0.5, deep: 0.9 };
    const depthValue = depthMap[depth];
    const id = `trace-${(++this._counter).toString(36)}-${Date.now().toString(36)}`;

    const trace: MemoryTrace = {
      id,
      content,
      encodingStrategy: `depth-${depth}`,
      strength: depthValue,
      depth: depthValue,
      chunks: [],
      associations: [],
      createdAt: Date.now(),
      lastRehearsed: Date.now(),
      metadata: { processingDepth: depth },
    };

    this._traces.set(id, trace);
    this._encodingDepth = (this._encodingDepth + depthValue) / 2;
    this._recordHistory(`depthOfProcessing:${depth}`);
    return trace;
  }

  dualCoding(text: string, image: string): MemoryTrace {
    const id = `trace-${(++this._counter).toString(36)}-${Date.now().toString(36)}`;

    const trace: MemoryTrace = {
      id,
      content: text,
      encodingStrategy: 'dualCoding',
      strength: 0.8,
      depth: 0.75,
      chunks: [],
      associations: [image],
      createdAt: Date.now(),
      lastRehearsed: Date.now(),
      metadata: { image, dualCoding: true },
    };

    this._traces.set(id, trace);
    this._recordHistory(`dualCoding`);
    return trace;
  }

  getTrace(traceId: string): MemoryTrace | undefined {
    return this._traces.get(traceId);
  }

  selfReferenceEffect(traceId: string): MemoryTrace | null {
    const trace = this._traces.get(traceId);
    if (!trace) return null;

    trace.strength = Math.min(1, trace.strength + 0.2);
    trace.depth = Math.min(1, trace.depth + 0.15);
    trace.metadata.selfReferenced = true;

    this._recordHistory(`selfReferenceEffect:${traceId}`);
    return trace;
  }

  generationEffect(traceId: string): MemoryTrace | null {
    const trace = this._traces.get(traceId);
    if (!trace) return null;

    trace.strength = Math.min(1, trace.strength + 0.18);
    trace.depth = Math.min(1, trace.depth + 0.12);
    trace.metadata.generated = true;

    this._recordHistory(`generationEffect:${traceId}`);
    return trace;
  }

  testingEffect(traceId: string): MemoryTrace | null {
    const trace = this._traces.get(traceId);
    if (!trace) return null;

    trace.strength = Math.min(1, trace.strength + 0.15);
    trace.depth = Math.min(1, trace.depth + 0.1);
    trace.metadata.tested = (trace.metadata.tested as number || 0) + 1;

    this._recordHistory(`testingEffect:${traceId}`);
    return trace;
  }

  stateDependentEncoding(traceId: string, state: string): MemoryTrace | null {
    const trace = this._traces.get(traceId);
    if (!trace) return null;

    trace.metadata.encodingState = state;
    trace.strength = Math.min(1, trace.strength + 0.08);

    this._recordHistory(`stateDependentEncoding:${traceId}:${state}`);
    return trace;
  }

  moodCongruentMemory(traceId: string, mood: string): MemoryTrace | null {
    const trace = this._traces.get(traceId);
    if (!trace) return null;

    trace.metadata.encodingMood = mood;
    trace.strength = Math.min(1, trace.strength + 0.06);

    this._recordHistory(`moodCongruentMemory:${traceId}:${mood}`);
    return trace;
  }

  encodingStrategyEffectiveness(): Record<string, { count: number; avgStrength: number; avgDepth: number }> {
    const strategyStats: Record<string, { count: number; totalStrength: number; totalDepth: number }> = {};

    for (const trace of this._traces.values()) {
      const strategy = trace.encodingStrategy;
      if (!strategyStats[strategy]) {
        strategyStats[strategy] = { count: 0, totalStrength: 0, totalDepth: 0 };
      }
      strategyStats[strategy].count++;
      strategyStats[strategy].totalStrength += trace.strength;
      strategyStats[strategy].totalDepth += trace.depth;
    }

    const result: Record<string, { count: number; avgStrength: number; avgDepth: number }> = {};
    for (const [strategy, stats] of Object.entries(strategyStats)) {
      result[strategy] = {
        count: stats.count,
        avgStrength: stats.totalStrength / stats.count,
        avgDepth: stats.totalDepth / stats.count,
      };
    }

    return result;
  }

  strongestMemories(n: number = 5): MemoryTrace[] {
    return Array.from(this._traces.values())
      .sort((a, b) => b.strength - a.strength)
      .slice(0, n);
  }

  weakestMemories(n: number = 5): MemoryTrace[] {
    return Array.from(this._traces.values())
      .sort((a, b) => a.strength - b.strength)
      .slice(0, n);
  }

  toPacket(): DataPacket {
    return {
      id: `encoding-${(++this._counter).toString(36)}-${Date.now().toString(36)}`,
      payload: {
        traces: Array.from(this._traces.values()),
        strategies: Array.from(this._strategies.values()),
        chunks: Array.from(this._chunks.values()),
        encodingDepth: this._encodingDepth,
        totalTraces: this._traces.size,
        totalChunks: this._chunks.size,
      },
      metadata: {
        createdAt: Date.now(),
        route: ['memory_science', 'EncodingEngine'],
        priority: Math.max(1, Math.floor(this._encodingDepth * 10)),
        phase: 'encoding',
      },
    };
  }

  reset(): void {
    this._traces.clear();
    this._strategies.clear();
    this._chunks.clear();
    this._encodingDepth = 0.5;
    this._history = [];
    this._counter = 0;
    this._initDefaultStrategies();
  }

  get traceCount(): number {
    return this._traces.size;
  }

  get encodingDepth(): number {
    return this._encodingDepth;
  }

  get history(): string[] {
    return [...this._history];
  }

  private _initDefaultStrategies(): void {
    const defaults: EncodingStrategy[] = [
      { id: 'visual', name: 'Visual Encoding', type: 'visual', effectiveness: 0.6, description: 'Encoding through visual imagery' },
      { id: 'acoustic', name: 'Acoustic Encoding', type: 'acoustic', effectiveness: 0.5, description: 'Encoding through sound' },
      { id: 'semantic', name: 'Semantic Encoding', type: 'semantic', effectiveness: 0.8, description: 'Encoding through meaning' },
      { id: 'elaborative', name: 'Elaborative Rehearsal', type: 'elaborative', effectiveness: 0.85, description: 'Deep processing through association' },
      { id: 'maintenance', name: 'Maintenance Rehearsal', type: 'maintenance', effectiveness: 0.3, description: 'Rote repetition' },
    ];
    for (const s of defaults) {
      this._strategies.set(s.id, s);
    }
  }

  private _recordHistory(action: string): void {
    this._history.push(`${Date.now()}:${action}`);
  }
}
