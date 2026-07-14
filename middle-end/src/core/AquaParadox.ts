export type PhaseState = 'solid' | 'liquid' | 'gaseous';

export interface FlowStream<T> {
  id: string;
  data: T[];
  phase: PhaseState;
  flowRate: number;
  temperature: number;
}

export interface ParadoxSolution<T> {
  resolved: boolean;
  result: T;
  vortexStrength: number;
  splitHistory: string[];
}

export class AquaParadox<T> {
  private _streams: Map<string, FlowStream<T>> = new Map();
  private _paradoxLog: string[] = [];

  createStream(id: string, initialData: T[], phase: PhaseState = 'liquid'): FlowStream<T> {
    const stream: FlowStream<T> = {
      id,
      data: [...initialData],
      phase,
      flowRate: 1,
      temperature: phase === 'solid' ? 0 : phase === 'gaseous' ? 100 : 50,
    };
    this._streams.set(id, stream);
    return stream;
  }

  splitStream(streamId: string, ratio: number = 0.5): [FlowStream<T>, FlowStream<T>] {
    const original = this._streams.get(streamId);
    if (!original) throw new Error(`Stream not found: ${streamId}`);

    const splitIndex = Math.floor(original.data.length * ratio);
    const streamA: FlowStream<T> = {
      id: `${streamId}-A`,
      data: original.data.slice(0, splitIndex),
      phase: this._invertPhase(original.phase),
      flowRate: original.flowRate * ratio,
      temperature: original.temperature * (1 - ratio),
    };
    const streamB: FlowStream<T> = {
      id: `${streamId}-B`,
      data: original.data.slice(splitIndex),
      phase: this._invertPhase(original.phase),
      flowRate: original.flowRate * (1 - ratio),
      temperature: original.temperature * ratio,
    };

    this._streams.set(streamA.id, streamA);
    this._streams.set(streamB.id, streamB);
    this._paradoxLog.push(`Split ${streamId} into ${streamA.id} and ${streamB.id}`);

    return [streamA, streamB];
  }

  solveParadox(streamAId: string, streamBId: string): ParadoxSolution<T> {
    const streamA = this._streams.get(streamAId);
    const streamB = this._streams.get(streamBId);
    if (!streamA || !streamB) {
      return { resolved: false, result: {} as T, vortexStrength: 0, splitHistory: [] };
    }

    const vortexStrength = this._calculateVortexStrength(streamA, streamB);
    const mergedData = this._mergeAtVortexCenter(streamA.data, streamB.data);

    const solution: ParadoxSolution<T> = {
      resolved: vortexStrength > 0.5,
      result: mergedData,
      vortexStrength,
      splitHistory: [...this._paradoxLog],
    };

    return solution;
  }

  evaporate(streamId: string): FlowStream<T> {
    const stream = this._streams.get(streamId);
    if (!stream) throw new Error(`Stream not found: ${streamId}`);

    stream.phase = 'gaseous';
    stream.temperature = 100;
    stream.flowRate = stream.data.length * 2;
    return stream;
  }

  condense(streamId: string): FlowStream<T> {
    const stream = this._streams.get(streamId);
    if (!stream) throw new Error(`Stream not found: ${streamId}`);

    stream.phase = 'liquid';
    stream.temperature = 50;
    stream.flowRate = stream.data.length;
    return stream;
  }

  freeze(streamId: string): FlowStream<T> {
    const stream = this._streams.get(streamId);
    if (!stream) throw new Error(`Stream not found: ${streamId}`);

    stream.phase = 'solid';
    stream.temperature = 0;
    stream.flowRate = 0;
    return stream;
  }

  private _invertPhase(phase: PhaseState): PhaseState {
    if (phase === 'solid') return 'gaseous';
    if (phase === 'gaseous') return 'solid';
    return 'liquid';
  }

  private _calculateVortexStrength(streamA: FlowStream<T>, streamB: FlowStream<T>): number {
    const phaseDiff = streamA.phase !== streamB.phase ? 0.5 : 0;
    const tempDiff = Math.abs(streamA.temperature - streamB.temperature) / 100;
    const flowDiff = Math.abs(streamA.flowRate - streamB.flowRate) / Math.max(streamA.flowRate, streamB.flowRate, 1);
    return (phaseDiff + tempDiff + flowDiff) / 3;
  }

  private _mergeAtVortexCenter(dataA: T[], dataB: T[]): T {
    const merged = [...dataA, ...dataB];
    if (merged.length === 0) return {} as T;
    const vortexIndex = Math.floor(merged.length / 2);
    return merged[vortexIndex];
  }

  get streamCount(): number {
    return this._streams.size;
  }

  get paradoxLog(): string[] {
    return [...this._paradoxLog];
  }
}
