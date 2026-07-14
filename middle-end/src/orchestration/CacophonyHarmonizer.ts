export type NoiseSource = {
  id: string;
  frequency: number;
  amplitude: number;
  phase: number;
};

export type HarmonicResult = {
  sourceId: string;
  original: unknown;
  harmonized: unknown;
  coherence: number;
};

export type NoiseType = 'white' | 'pink' | 'brown' | 'blue';

export class CacophonyHarmonizer {
  private noiseSources: Map<string, NoiseSource> = new Map();
  private targetNoiseType: NoiseType = 'white';
  private coherenceThreshold = 0.7;

  addNoiseSource(source: NoiseSource): void {
    this.noiseSources.set(source.id, source);
  }

  setTargetNoiseType(type: NoiseType): void {
    this.targetNoiseType = type;
  }

  harmonize(responses: Map<string, unknown>): HarmonicResult[] {
    const results: HarmonicResult[] = [];
    const sources = Array.from(this.noiseSources.values());
    
    responses.forEach((data, id) => {
      const source = this.noiseSources.get(id);
      const coherence = source ? this.calculateCoherence(source) : 0;
      
      const harmonized = this.transformNoise(data, source, coherence);
      
      results.push({
        sourceId: id,
        original: data,
        harmonized,
        coherence,
      });
    });

    return results.sort((a, b) => b.coherence - a.coherence);
  }

  private calculateCoherence(source: NoiseSource): number {
    const targetFreq = this.getTargetFrequency();
    const freqDiff = Math.abs(source.frequency - targetFreq) / targetFreq;
    const ampDiff = Math.abs(source.amplitude - 0.5);
    
    return 1 - (freqDiff * 0.5 + ampDiff * 0.5);
  }

  private getTargetFrequency(): number {
    switch (this.targetNoiseType) {
      case 'white': return 1;
      case 'pink': return 0.5;
      case 'brown': return 0.25;
      case 'blue': return 2;
      default: return 1;
    }
  }

  private transformNoise(data: unknown, source: NoiseSource | undefined, coherence: number): unknown {
    if (!source || coherence >= this.coherenceThreshold) return data;

    const serialized = JSON.stringify(data);
    const noiseFactor = 1 - coherence;
    const transformed = serialized.split('').map(char => {
      if (Math.random() < noiseFactor) {
        return String.fromCharCode(97 + Math.floor(Math.random() * 26));
      }
      return char;
    }).join('');

    try {
      return JSON.parse(transformed);
    } catch {
      return data;
    }
  }

  generateAmbientNoise(): unknown {
    const noise = Array.from({ length: 100 }, () => 
      this.targetNoiseType === 'brown' ? Math.random() * 0.5 :
      this.targetNoiseType === 'pink' ? Math.random() * 0.7 :
      this.targetNoiseType === 'blue' ? Math.random() * 1.2 :
      Math.random()
    );
    return { ambient: noise, type: this.targetNoiseType };
  }

  detectDisruptions(results: HarmonicResult[]): string[] {
    return results.filter(r => r.coherence < 0.3).map(r => r.sourceId);
  }

  adjustAmplitude(sourceId: string, delta: number): void {
    const source = this.noiseSources.get(sourceId);
    if (source) {
      source.amplitude = Math.max(0, Math.min(1, source.amplitude + delta));
    }
  }

  removeNoiseSource(id: string): void {
    this.noiseSources.delete(id);
  }
}