/**
 * 衍射分束器模块：将数据流按不同角度衍射产生多重视角，
 * 每个衍射角度捕获数据的不同侧面的投影信息。
 */

export interface DiffractionAngle {
  id: string;
  angle: number;
  projectionKeys: string[];
  weight: number;
}

export interface DiffractionOutput {
  angleId: string;
  projected: Record<string, unknown>;
  intensity: number;
  phase: number;
}

export class DiffractiveSplitter {
  private _angles: Map<string, DiffractionAngle> = new Map();
  private _outputs: DiffractionOutput[] = [];
  private _interference: Map<string, Record<string, unknown>> = new Map();
  private _maxAngles = 8;

  registerAngle(angle: DiffractionAngle): void {
    this._angles.set(angle.id, angle);
    if (this._angles.size > this._maxAngles) {
      this._evictWeakest();
    }
  }

  private _evictWeakest(): void {
    let weakest: DiffractionAngle | undefined;
    for (const a of this._angles.values()) {
      if (!weakest || a.weight < weakest.weight) weakest = a;
    }
    if (weakest) this._angles.delete(weakest.id);
  }

  diffract(data: Record<string, unknown>): DiffractionOutput[] {
    const outputs: DiffractionOutput[] = [];
    for (const angle of this._angles.values()) {
      const projected = this._project(data, angle);
      const intensity = this._intensity(data, angle);
      const phase = angle.angle * Math.PI / 180;
      const output: DiffractionOutput = {
        angleId: angle.id,
        projected,
        intensity,
        phase,
      };
      outputs.push(output);
    }
    this._outputs.push(...outputs);
    return outputs;
  }

  private _project(data: Record<string, unknown>, angle: DiffractionAngle): Record<string, unknown> {
    const projected: Record<string, unknown> = {};
    for (const key of angle.projectionKeys) {
      if (key in data) projected[key] = data[key];
    }
    projected._angle = angle.angle;
    return projected;
  }

  private _intensity(data: Record<string, unknown>, angle: DiffractionAngle): number {
    const present = angle.projectionKeys.filter(k => k in data).length;
    const ratio = angle.projectionKeys.length === 0 ? 0 : present / angle.projectionKeys.length;
    return ratio * angle.weight;
  }

  interfere(): Map<string, Record<string, unknown>> {
    this._interference.clear();
    const byKey: Map<string, Array<{ value: unknown; intensity: number; phase: number }>> = new Map();

    for (const output of this._outputs) {
      for (const [key, value] of Object.entries(output.projected)) {
        if (key.startsWith('_')) continue;
        if (!byKey.has(key)) byKey.set(key, []);
        byKey.get(key)!.push({ value, intensity: output.intensity, phase: output.phase });
      }
    }

    for (const [key, contributions] of byKey) {
      const sumReal = contributions.reduce((s, c) => s + Math.cos(c.phase) * c.intensity, 0);
      const sumImag = contributions.reduce((s, c) => s + Math.sin(c.phase) * c.intensity, 0);
      const magnitude = Math.sqrt(sumReal * sumReal + sumImag * sumImag);
      const dominantValue = contributions.sort((a, b) => b.intensity - a.intensity)[0]?.value;
      this._interference.set(key, { value: dominantValue, magnitude, contributions: contributions.length });
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

  get angleCount(): number {
    return this._angles.size;
  }

  get outputCount(): number {
    return this._outputs.length;
  }

  get interferencePatternSize(): number {
    return this._interference.size;
  }
}
