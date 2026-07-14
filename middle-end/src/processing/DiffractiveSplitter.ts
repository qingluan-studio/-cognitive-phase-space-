export interface DiffractionAngle {
  id: string;
  angle: number;
  projectionKeys: string[];
  weight: number;
  spatialFrequency: number;
}

export interface DiffractionOutput {
  angleId: string;
  projected: Record<string, unknown>;
  intensity: number;
  phase: number;
  amplitude: number;
}

export class DiffractiveSplitter {
  private _angles: Map<string, DiffractionAngle> = new Map();
  private _outputs: DiffractionOutput[] = [];
  private _interference: Map<string, Record<string, unknown>> = new Map();
  private _maxAngles = 8;
  private _wavelength = 1.0;

  registerAngle(angle: DiffractionAngle): void {
    this._angles.set(angle.id, angle);
    if (this._angles.size > this._maxAngles) this._evictWeakest();
  }

  private _evictWeakest(): void {
    let weakest: DiffractionAngle | undefined;
    for (const a of this._angles.values())
      if (!weakest || a.weight < weakest.weight) weakest = a;
    if (weakest) this._angles.delete(weakest.id);
  }

  setWavelength(w: number): void { this._wavelength = Math.max(0.1, w); }

  diffract(data: Record<string, unknown>): DiffractionOutput[] {
    const numericValues = this._extractNumericValues(data);
    const outputs: DiffractionOutput[] = [];
    for (const angle of this._angles.values()) {
      const projected = this._fourierProject(data, angle, numericValues);
      const { intensity, amplitude, phase } = this._diffractionIntensity(numericValues, angle);
      const output: DiffractionOutput = {
        angleId: angle.id, projected, intensity, phase, amplitude,
      };
      outputs.push(output);
    }
    this._outputs.push(...outputs);
    return outputs;
  }

  private _extractNumericValues(data: Record<string, unknown>): Map<string, number> {
    const values = new Map<string, number>();
    for (const [key, val] of Object.entries(data)) {
      if (typeof val === 'number') values.set(key, val);
    }
    return values;
  }

  private _fourierProject(
    data: Record<string, unknown>,
    angle: DiffractionAngle,
    numericValues: Map<string, number>,
  ): Record<string, unknown> {
    const projected: Record<string, unknown> = {};
    const theta = angle.angle * Math.PI / 180;
    const k = angle.spatialFrequency;

    for (const key of angle.projectionKeys) {
      if (key in data) {
        projected[key] = data[key];
      }
    }

    const keys = Array.from(numericValues.keys());
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const val = numericValues.get(key) ?? 0;
      let transformed = 0;
      for (let j = 0; j < keys.length; j++) {
        const otherVal = numericValues.get(keys[j]) ?? 0;
        const distance = Math.abs(i - j);
        transformed += otherVal * Math.cos(k * distance * Math.cos(theta));
      }
      projected[`fourier_${key}`] = transformed / Math.max(1, keys.length);
    }

    projected._angle = angle.angle;
    projected._spatialFrequency = k;
    return projected;
  }

  private _diffractionIntensity(
    numericValues: Map<string, number>,
    angle: DiffractionAngle,
  ): { intensity: number; amplitude: number; phase: number } {
    const values = Array.from(numericValues.values());
    if (values.length === 0) return { intensity: 0, amplitude: 0, phase: 0 };

    const theta = angle.angle * Math.PI / 180;
    const k = 2 * Math.PI / this._wavelength;
    let realSum = 0, imagSum = 0;

    for (let i = 0; i < values.length; i++) {
      const phase = k * i * Math.sin(theta);
      realSum += values[i] * Math.cos(phase);
      imagSum += values[i] * Math.sin(phase);
    }

    const amplitude = Math.sqrt(realSum * realSum + imagSum * imagSum) / values.length;
    const intensity = amplitude * amplitude * angle.weight;
    const phase = Math.atan2(imagSum, realSum);

    return { intensity, amplitude, phase };
  }

  interfere(): Map<string, Record<string, unknown>> {
    this._interference.clear();
    const byKey: Map<string, Array<{ value: unknown; intensity: number; phase: number; amplitude: number }>> = new Map();

    for (const output of this._outputs) {
      for (const [key, value] of Object.entries(output.projected)) {
        if (key.startsWith('_')) continue;
        if (!byKey.has(key)) byKey.set(key, []);
        byKey.get(key)!.push({
          value, intensity: output.intensity, phase: output.phase, amplitude: output.amplitude,
        });
      }
    }

    for (const [key, contributions] of byKey) {
      let sumReal = 0, sumImag = 0, totalWeight = 0;
      const numericContribs: number[] = [];

      for (const c of contributions) {
        if (typeof c.value === 'number') {
          numericContribs.push(c.value);
          sumReal += c.value * Math.cos(c.phase) * c.intensity;
          sumImag += c.value * Math.sin(c.phase) * c.intensity;
          totalWeight += c.intensity;
        }
      }

      const magnitude = Math.sqrt(sumReal * sumReal + sumImag * sumImag);
      const coherence = totalWeight === 0 ? 0 : magnitude / totalWeight;
      const dominant = contributions.sort((a, b) => b.intensity - a.intensity)[0]?.value;
      const meanValue = numericContribs.length === 0
        ? dominant
        : numericContribs.reduce((s, x) => s + x, 0) / numericContribs.length;

      this._interference.set(key, {
        value: meanValue,
        magnitude,
        coherence,
        contributions: contributions.length,
        dominantValue: dominant,
      });
    }

    return this._interference;
  }

  strongestProjection(): DiffractionOutput | undefined {
    if (this._outputs.length === 0) return undefined;
    return [...this._outputs].sort((a, b) => b.intensity - a.intensity)[0];
  }

  averageIntensity(): number {
    if (this._outputs.length === 0) return 0;
    return this._outputs.reduce((s, o) => s + o.intensity, 0) / this._outputs.length;
  }

  tuneAngle(id: string, weight: number): boolean {
    const angle = this._angles.get(id);
    if (!angle) return false;
    angle.weight = Math.max(0, Math.min(1, weight));
    return true;
  }

  reset(): void {
    this._angles.clear();
    this._outputs = [];
    this._interference.clear();
  }

  get angleCount(): number { return this._angles.size; }
  get outputCount(): number { return this._outputs.length; }
  get interferencePatternSize(): number { return this._interference.size; }
  get wavelength(): number { return this._wavelength; }
}
