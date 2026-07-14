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

interface VortexField {
  coreRadius: number;
  angularVelocity: number;
  circulation: number;
  reynolds: number;
}

export class AquaParadox<T> {
  private _streams: Map<string, FlowStream<T>> = new Map();
  private _paradoxLog: string[] = [];
  private _boltzmannK = 1.380649e-23;
  private _clausiusConstant = 2260000;

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

    const entropy = this._calculateShannonEntropy(original.data);
    const adjustedRatio = this._applyEntropyBias(ratio, entropy);
    const splitIndex = Math.max(1, Math.floor(original.data.length * adjustedRatio));

    const streamA: FlowStream<T> = {
      id: `${streamId}-A`,
      data: original.data.slice(0, splitIndex),
      phase: this._invertPhase(original.phase),
      flowRate: original.flowRate * adjustedRatio * (1 + entropy * 0.1),
      temperature: this._adiabaticTemperature(original.temperature, adjustedRatio, original.phase),
    };
    const streamB: FlowStream<T> = {
      id: `${streamId}-B`,
      data: original.data.slice(splitIndex),
      phase: this._invertPhase(original.phase),
      flowRate: original.flowRate * (1 - adjustedRatio) * (1 + (1 - entropy) * 0.1),
      temperature: this._adiabaticTemperature(original.temperature, 1 - adjustedRatio, original.phase),
    };

    this._streams.set(streamA.id, streamA);
    this._streams.set(streamB.id, streamB);
    this._paradoxLog.push(`Split ${streamId} into ${streamA.id} and ${streamB.id} (ratio=${adjustedRatio.toFixed(4)})`);

    return [streamA, streamB];
  }

  solveParadox(streamAId: string, streamBId: string): ParadoxSolution<T> {
    const streamA = this._streams.get(streamAId);
    const streamB = this._streams.get(streamBId);
    if (!streamA || !streamB) {
      return { resolved: false, result: {} as T, vortexStrength: 0, splitHistory: [] };
    }

    const vortexField = this._computeRankineVortex(streamA, streamB);
    const vortexStrength = this._normalizeVortexStrength(vortexField);
    const mergedData = this._mergeAtVortexCenter(streamA.data, streamB.data, vortexField);

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

    const entropy = this._calculateShannonEntropy(stream.data);
    stream.phase = 'gaseous';
    stream.temperature = this._clausiusClapeyron(stream.temperature, 1);
    stream.flowRate = stream.data.length * (1.5 + entropy);
    return stream;
  }

  condense(streamId: string): FlowStream<T> {
    const stream = this._streams.get(streamId);
    if (!stream) throw new Error(`Stream not found: ${streamId}`);

    const entropy = this._calculateShannonEntropy(stream.data);
    stream.phase = 'liquid';
    stream.temperature = this._clausiusClapeyron(stream.temperature, -1);
    stream.flowRate = stream.data.length * (0.8 + entropy * 0.5);
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

  private _calculateShannonEntropy(data: T[]): number {
    if (data.length === 0) return 0;
    const freqMap = new Map<string, number>();
    for (const item of data) {
      const key = JSON.stringify(item);
      freqMap.set(key, (freqMap.get(key) || 0) + 1);
    }
    let entropy = 0;
    const total = data.length;
    for (const count of freqMap.values()) {
      const p = count / total;
      if (p > 0) entropy -= p * Math.log2(p);
    }
    const maxEntropy = Math.log2(Math.min(freqMap.size, total));
    return maxEntropy > 0 ? entropy / maxEntropy : 0;
  }

  private _applyEntropyBias(ratio: number, entropy: number): number {
    const bias = (entropy - 0.5) * 0.2;
    return Math.max(0.1, Math.min(0.9, ratio + bias));
  }

  private _adiabaticTemperature(baseTemp: number, ratio: number, phase: PhaseState): number {
    const gamma = phase === 'gaseous' ? 1.4 : phase === 'liquid' ? 1.0 : 0.5;
    const factor = Math.pow(ratio, gamma - 1);
    return Math.max(0, Math.min(100, baseTemp * factor));
  }

  private _computeRankineVortex(streamA: FlowStream<T>, streamB: FlowStream<T>): VortexField {
    const combinedFlow = streamA.flowRate + streamB.flowRate;
    const circulation = Math.abs(streamA.flowRate - streamB.flowRate) * combinedFlow;
    const coreRadius = Math.max(0.1, Math.abs(streamA.temperature - streamB.temperature) / 50);
    const angularVelocity = circulation / (2 * Math.PI * coreRadius * coreRadius);
    const viscosity = streamA.phase === streamB.phase ? 0.001 : 0.01;
    const reynolds = (combinedFlow * coreRadius * 2) / viscosity;
    return { coreRadius, angularVelocity, circulation, reynolds };
  }

  private _normalizeVortexStrength(vortex: VortexField): number {
    const circNorm = Math.min(1, vortex.circulation / 100);
    const reynNorm = Math.min(1, Math.log10(vortex.reynolds + 1) / 5);
    const sizePenalty = Math.max(0, 1 - vortex.coreRadius);
    return (circNorm * 0.4 + reynNorm * 0.3 + sizePenalty * 0.3);
  }

  private _mergeAtVortexCenter(dataA: T[], dataB: T[], vortex: VortexField): T {
    const lenA = dataA.length;
    const lenB = dataB.length;
    if (lenA === 0 && lenB === 0) return {} as T;
    if (lenA === 0) return dataB[0];
    if (lenB === 0) return dataA[0];

    const maxOffset = Math.min(lenA, lenB) - 1;
    let bestOffset = 0;
    let bestCorrelation = -Infinity;

    for (let offset = 0; offset <= maxOffset; offset++) {
      const correlation = this._crossCorrelate(dataA, dataB, offset);
      if (correlation > bestCorrelation) {
        bestCorrelation = correlation;
        bestOffset = offset;
      }
    }

    const vortexCenter = Math.floor((bestOffset + lenA / 2 + lenB / 2) / 2);
    const merged = [...dataA, ...dataB];
    const centerIndex = Math.max(0, Math.min(merged.length - 1, vortexCenter));
    return merged[centerIndex];
  }

  private _crossCorrelate(a: T[], b: T[], offset: number): number {
    let sum = 0;
    const len = Math.min(a.length - offset, b.length);
    for (let i = 0; i < len; i++) {
      const sa = JSON.stringify(a[i + offset]);
      const sb = JSON.stringify(b[i]);
      sum += sa === sb ? 1 : -0.5;
    }
    return len > 0 ? sum / len : 0;
  }

  private _clausiusClapeyron(temp: number, direction: number): number {
    const deltaT = direction * this._clausiusConstant * 0.0001;
    return Math.max(0, Math.min(100, temp + deltaT));
  }

  get streamCount(): number {
    return this._streams.size;
  }

  get paradoxLog(): string[] {
    return [...this._paradoxLog];
  }

  get boltzmannConstant(): number {
    return this._boltzmannK;
  }
}
