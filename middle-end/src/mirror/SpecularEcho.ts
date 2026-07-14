/**
 * 镜面回声：输出与输入相同，但带有微小变异。
 * 接收输入并以近乎相同的形式回声，但每次回声都带有微小变异，模拟镜面瑕疵。
 */

export type EchoVariant = 'phase' | 'amplitude' | 'temporal' | 'spectral' | 'noise';

export interface EchoPayload {
  input: unknown;
  output: unknown;
  variant: EchoVariant;
  delta: number;
  echoedAt: number;
}

export interface EchoStats {
  totalEchoes: number;
  averageDelta: number;
  variantDistribution: Record<EchoVariant, number>;
}

export class SpecularEcho {
  private _payloads: EchoPayload[] = [];
  private _variantWeights: Record<EchoVariant, number> = {
    phase: 0.2,
    amplitude: 0.2,
    temporal: 0.2,
    spectral: 0.2,
    noise: 0.2,
  };
  private _mutationRate = 0.05;

  echo(input: unknown): EchoPayload {
    const variant = this._selectVariant();
    const output = this._applyVariant(input, variant);
    const delta = this._computeDelta(input, output);

    const payload: EchoPayload = {
      input,
      output,
      variant,
      delta,
      echoedAt: Date.now(),
    };
    this._payloads.push(payload);
    if (this._payloads.length > 200) this._payloads.shift();
    return payload;
  }

  private _selectVariant(): EchoVariant {
    const variants = Object.keys(this._variantWeights) as EchoVariant[];
    const total = Object.values(this._variantWeights).reduce((s, v) => s + v, 0);
    let r = Math.random() * total;
    for (const v of variants) {
      r -= this._variantWeights[v];
      if (r <= 0) return v;
    }
    return 'noise';
  }

  private _applyVariant(input: unknown, variant: EchoVariant): unknown {
    if (typeof input === 'string') {
      switch (variant) {
        case 'phase':
          return input.split('').reverse().join('');
        case 'amplitude':
          return input.toUpperCase();
        case 'temporal':
          return input.replace(/./g, (c, i) => i % 2 === 0 ? c : '');
        case 'spectral':
          return input.split('').map((c, i) => i % 3 === 0 ? c.toUpperCase() : c).join('');
        case 'noise':
          return input.split('').map(c => Math.random() < this._mutationRate ? '_' : c).join('');
      }
    }
    if (typeof input === 'number') {
      switch (variant) {
        case 'phase': return -input;
        case 'amplitude': return input * 1.01;
        case 'temporal': return Math.floor(input);
        case 'spectral': return input + Math.sin(input);
        case 'noise': return input + (Math.random() - 0.5) * this._mutationRate;
      }
    }
    return input;
  }

  private _computeDelta(input: unknown, output: unknown): number {
    if (typeof input === 'number' && typeof output === 'number') {
      return Math.abs(input - output);
    }
    const a = String(input);
    const b = String(output);
    let diffs = 0;
    const max = Math.max(a.length, b.length);
    for (let i = 0; i < max; i++) {
      if (a[i] !== b[i]) diffs++;
    }
    return diffs / Math.max(1, max);
  }

  setVariantWeight(variant: EchoVariant, weight: number): void {
    this._variantWeights[variant] = Math.max(0, weight);
  }

  setMutationRate(rate: number): void {
    this._mutationRate = Math.max(0, Math.min(1, rate));
  }

  getStats(): EchoStats {
    const distribution: Record<EchoVariant, number> = {
      phase: 0, amplitude: 0, temporal: 0, spectral: 0, noise: 0,
    };
    let totalDelta = 0;
    for (const p of this._payloads) {
      distribution[p.variant]++;
      totalDelta += p.delta;
    }
    return {
      totalEchoes: this._payloads.length,
      averageDelta: this._payloads.length > 0 ? totalDelta / this._payloads.length : 0,
      variantDistribution: distribution,
    };
  }

  getPayloads(limit: number = 50): EchoPayload[] {
    return this._payloads.slice(-limit);
  }
}
