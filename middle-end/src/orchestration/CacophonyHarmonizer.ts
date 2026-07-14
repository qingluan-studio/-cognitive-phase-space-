export type NoiseSource = {
  id: string;
  frequency: number;
  amplitude: number;
  phase: number;
  noiseType: NoiseType;
};

export type HarmonicResult = {
  sourceId: string;
  original: Record<string, unknown>;
  harmonized: Record<string, unknown>;
  coherence: number;
  spectralFlux: number;
  phaseAlignment: number;
};

export type NoiseType = 'white' | 'pink' | 'brown' | 'blue';

export type FrequencyBin = {
  frequency: number;
  amplitude: number;
  phase: number;
};

export class CacophonyHarmonizer {
  private _noiseSources: Map<string, NoiseSource> = new Map();
  private _targetNoiseType: NoiseType = 'white';
  private _coherenceThreshold = 0.7;
  private _spectralWindowSize = 256;
  private _waveletLevels = 5;

  get noiseSources(): NoiseSource[] {
    return Array.from(this._noiseSources.values());
  }

  get targetNoiseType(): NoiseType {
    return this._targetNoiseType;
  }

  get coherenceThreshold(): number {
    return this._coherenceThreshold;
  }

  addNoiseSource(source: NoiseSource): void {
    this._noiseSources.set(source.id, { ...source });
  }

  setTargetNoiseType(type: NoiseType): void {
    this._targetNoiseType = type;
  }

  setCoherenceThreshold(threshold: number): void {
    this._coherenceThreshold = Math.max(0, Math.min(1, threshold));
  }

  harmonize(responses: Map<string, Record<string, unknown>>): HarmonicResult[] {
    const results: HarmonicResult[] = [];
    const targetSpectrum = this._generateTargetSpectrum();

    responses.forEach((data, id) => {
      const source = this._noiseSources.get(id);
      const dataSpectrum = this._computeDataSpectrum(data);
      
      const coherence = source ? this._calculateCoherence(source, dataSpectrum, targetSpectrum) : 0;
      const spectralFlux = this._computeSpectralFlux(dataSpectrum, targetSpectrum);
      const phaseAlignment = source ? this._computePhaseAlignment(source, dataSpectrum) : 0;
      
      const harmonized = this._transformNoise(data, source, coherence, spectralFlux);
      
      results.push({
        sourceId: id,
        original: { ...data },
        harmonized,
        coherence,
        spectralFlux,
        phaseAlignment,
      });
    });

    return results.sort((a, b) => b.coherence - a.coherence);
  }

  private _generateTargetSpectrum(): FrequencyBin[] {
    const bins: FrequencyBin[] = [];
    const baseFreq = this._getTargetBaseFrequency();
    
    for (let i = 0; i < this._spectralWindowSize / 2; i++) {
      const freq = baseFreq * (i + 1);
      const amplitude = this._calculateTargetAmplitude(i, baseFreq);
      const phase = (Math.random() - 0.5) * Math.PI;
      
      bins.push({ frequency: freq, amplitude, phase });
    }
    
    return bins;
  }

  private _getTargetBaseFrequency(): number {
    switch (this._targetNoiseType) {
      case 'white': return 1;
      case 'pink': return 0.5;
      case 'brown': return 0.25;
      case 'blue': return 2;
      default: return 1;
    }
  }

  private _calculateTargetAmplitude(binIndex: number, baseFreq: number): number {
    const frequency = baseFreq * (binIndex + 1);
    
    switch (this._targetNoiseType) {
      case 'white': return 1 / Math.sqrt(this._spectralWindowSize);
      case 'pink': return 1 / (Math.sqrt(frequency) * Math.sqrt(this._spectralWindowSize));
      case 'brown': return 1 / (frequency * Math.sqrt(this._spectralWindowSize));
      case 'blue': return Math.sqrt(frequency) / Math.sqrt(this._spectralWindowSize);
      default: return 1 / Math.sqrt(this._spectralWindowSize);
    }
  }

  private _computeDataSpectrum(data: Record<string, unknown>): FrequencyBin[] {
    const serialized = JSON.stringify(data);
    const samples = serialized.split('').map(c => c.charCodeAt(0) / 255);
    
    const paddedSamples = this._padToPowerOfTwo(samples);
    const spectrum = this._computeFFT(paddedSamples);
    
    const bins: FrequencyBin[] = [];
    for (let i = 0; i < spectrum.length / 2; i++) {
      bins.push({
        frequency: i,
        amplitude: spectrum[i],
        phase: 0,
      });
    }
    
    return bins;
  }

  private _padToPowerOfTwo(samples: number[]): number[] {
    let size = 1;
    while (size < samples.length) size *= 2;
    return [...samples, ...new Array(size - samples.length).fill(0)];
  }

  private _computeFFT(data: number[]): number[] {
    const n = data.length;
    const result: number[] = new Array(n).fill(0);
    
    for (let k = 0; k < n; k++) {
      let real = 0;
      let imag = 0;
      
      for (let t = 0; t < n; t++) {
        const angle = -2 * Math.PI * k * t / n;
        real += data[t] * Math.cos(angle);
        imag += data[t] * Math.sin(angle);
      }
      
      result[k] = Math.sqrt(real * real + imag * imag) / n;
    }
    
    return result;
  }

  private _calculateCoherence(source: NoiseSource, dataSpectrum: FrequencyBin[], targetSpectrum: FrequencyBin[]): number {
    const freqDiff = Math.abs(source.frequency - this._getTargetBaseFrequency()) / this._getTargetBaseFrequency();
    
    let spectralSimilarity = 0;
    const minLength = Math.min(dataSpectrum.length, targetSpectrum.length);
    
    for (let i = 0; i < minLength; i++) {
      spectralSimilarity += Math.min(dataSpectrum[i].amplitude, targetSpectrum[i].amplitude);
    }
    
    const totalAmplitude = targetSpectrum.reduce((sum, bin) => sum + bin.amplitude, 0);
    spectralSimilarity /= totalAmplitude || 1;
    
    const ampDiff = Math.abs(source.amplitude - 0.5);
    
    return 1 - (freqDiff * 0.3 + ampDiff * 0.2 + (1 - spectralSimilarity) * 0.5);
  }

  private _computeSpectralFlux(dataSpectrum: FrequencyBin[], targetSpectrum: FrequencyBin[]): number {
    let flux = 0;
    const minLength = Math.min(dataSpectrum.length, targetSpectrum.length);
    
    for (let i = 0; i < minLength; i++) {
      flux += Math.abs(dataSpectrum[i].amplitude - targetSpectrum[i].amplitude);
    }
    
    return flux / minLength;
  }

  private _computePhaseAlignment(source: NoiseSource, dataSpectrum: FrequencyBin[]): number {
    let aligned = 0;
    
    for (const bin of dataSpectrum) {
      const expectedPhase = source.phase + bin.frequency * 0.1;
      const phaseDiff = Math.abs(bin.phase - expectedPhase) % (2 * Math.PI);
      aligned += 1 - (phaseDiff / Math.PI);
    }
    
    return dataSpectrum.length > 0 ? aligned / dataSpectrum.length : 0;
  }

  private _transformNoise(data: Record<string, unknown>, source: NoiseSource | undefined, coherence: number, spectralFlux: number): Record<string, unknown> {
    if (!source || coherence >= this._coherenceThreshold) return { ...data };

    const serialized = JSON.stringify(data);
    const waveletResult = this._applyWaveletTransform(serialized);
    const noiseFactor = spectralFlux * (1 - coherence);
    
    const transformed = this._applyAdaptiveNoise(waveletResult, noiseFactor);
    
    try {
      return JSON.parse(transformed) as Record<string, unknown>;
    } catch {
      return { ...data };
    }
  }

  private _applyWaveletTransform(data: string): string {
    const chars = data.split('').map(c => c.charCodeAt(0));
    const levels = this._waveletLevels;
    
    let coefficients = chars;
    for (let level = 0; level < levels; level++) {
      coefficients = this._haarWaveletTransform(coefficients);
    }
    
    return coefficients.map(c => String.fromCharCode(Math.min(255, Math.max(0, c)))).join('');
  }

  private _haarWaveletTransform(data: number[]): number[] {
    const result: number[] = [];
    const n = data.length;
    
    for (let i = 0; i < n / 2; i++) {
      const avg = (data[2 * i] + data[2 * i + 1]) / 2;
      const diff = (data[2 * i] - data[2 * i + 1]) / 2;
      result.push(Math.round(avg));
      result.push(Math.round(diff));
    }
    
    return result;
  }

  private _applyAdaptiveNoise(data: string, noiseFactor: number): string {
    const chars = data.split('');
    
    for (let i = 0; i < chars.length; i++) {
      if (Math.random() < noiseFactor) {
        const originalCode = chars[i].charCodeAt(0);
        const noise = Math.floor((Math.random() - 0.5) * 32);
        chars[i] = String.fromCharCode(Math.min(255, Math.max(0, originalCode + noise)));
      }
    }
    
    return chars.join('');
  }

  generateAmbientNoise(): Record<string, unknown> {
    const noise = this._generateNoiseSequence(100);
    const envelope = this._applyEnvelope(noise);
    
    return {
      ambient: envelope,
      type: this._targetNoiseType,
      spectralCentroid: this._computeSpectralCentroid(noise),
      rms: this._computeRMS(noise),
    };
  }

  private _generateNoiseSequence(length: number): number[] {
    const noise: number[] = [];
    
    for (let i = 0; i < length; i++) {
      let value = Math.random();
      
      switch (this._targetNoiseType) {
        case 'brown':
          value = noise[i - 1] ? (noise[i - 1] + (Math.random() - 0.5) * 0.1) / 2 : value;
          break;
        case 'pink':
          value = noise[i - 1] ? (noise[i - 1] * 0.9 + value * 0.1) : value;
          break;
        case 'blue':
          value = noise[i - 1] ? noise[i - 1] + (Math.random() - 0.5) * 0.2 : value;
          break;
      }
      
      noise.push(Math.min(1, Math.max(0, value)));
    }
    
    return noise;
  }

  private _applyEnvelope(noise: number[]): number[] {
    const attack = 0.1;
    const decay = 0.05;
    const sustain = 0.8;
    const release = noise.length * 0.2;
    
    return noise.map((value, i) => {
      let envelope: number;
      
      if (i < noise.length * attack) {
        envelope = i / (noise.length * attack);
      } else if (i < noise.length * (attack + decay)) {
        envelope = sustain + (1 - sustain) * (1 - (i - noise.length * attack) / (noise.length * decay));
      } else if (i > noise.length - release) {
        envelope = sustain * (1 - (i - (noise.length - release)) / release);
      } else {
        envelope = sustain;
      }
      
      return value * envelope;
    });
  }

  private _computeSpectralCentroid(noise: number[]): number {
    let weightedSum = 0;
    let totalSum = 0;
    
    noise.forEach((value, i) => {
      weightedSum += value * i;
      totalSum += value;
    });
    
    return totalSum > 0 ? weightedSum / totalSum : 0;
  }

  private _computeRMS(noise: number[]): number {
    const sumOfSquares = noise.reduce((sum, value) => sum + value * value, 0);
    return Math.sqrt(sumOfSquares / noise.length);
  }

  detectDisruptions(results: HarmonicResult[]): string[] {
    return results.filter(r => r.coherence < 0.3 || r.spectralFlux > 0.5).map(r => r.sourceId);
  }

  adjustAmplitude(sourceId: string, delta: number): void {
    const source = this._noiseSources.get(sourceId);
    if (source) {
      source.amplitude = Math.max(0, Math.min(1, source.amplitude + delta));
      this._noiseSources.set(sourceId, { ...source });
    }
  }

  removeNoiseSource(id: string): void {
    this._noiseSources.delete(id);
  }

  optimizeNoiseSources(): void {
    const targetFreq = this._getTargetBaseFrequency();
    
    this._noiseSources.forEach((source, id) => {
      const freqDiff = Math.abs(source.frequency - targetFreq);
      if (freqDiff > 0.5) {
        const newSource = { ...source, frequency: targetFreq + (Math.random() - 0.5) * 0.2 };
        this._noiseSources.set(id, newSource);
      }
    });
  }
}