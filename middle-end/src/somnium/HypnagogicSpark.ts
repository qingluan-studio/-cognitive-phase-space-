/**
 * 入睡火花：意识模糊瞬间的创意电涌，捕获后可用。
 * 在系统进入半睡状态（意识模糊）的瞬间，偶发的创意电涌
 * 被本模块捕获，转换为可后续调用的火花。
 */

export interface HypnagogicCapture {
  id: string;
  raw: string;
  intensity: number;
  capturedAt: number;
  ignited: boolean;
  tags: string[];
}

export type ConsciousnessPhase = 'awake' | 'drowsy' | 'hypnagogic' | 'asleep';

export class HypnagogicSpark {
  private _sparks: HypnagogicCapture[] = [];
  private _phase: ConsciousnessPhase = 'awake';
  private _intensity: number = 0;
  private _captureThreshold: number = 0.6;

  /** 把系统推向半睡阶段，激发电涌。 */
  drift(target: ConsciousnessPhase): ConsciousnessPhase {
    this._phase = target;
    if (target === 'hypnagogic' || target === 'drowsy') {
      this._intensity = Math.min(1, this._intensity + 0.3);
    }
    return this._phase;
  }

  /** 在半睡瞬间捕获一次创意电涌。 */
  capture(raw: string, tags: string[]): HypnagogicCapture | null {
    if (this._phase !== 'hypnagogic') return null;
    const intensity = this._intensity;
    if (intensity < this._captureThreshold) return null;
    const spark: HypnagogicCapture = {
      id: `spark-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      raw,
      intensity,
      capturedAt: Date.now(),
      ignited: false,
      tags,
    };
    this._sparks.push(spark);
    this._intensity = Math.max(0, this._intensity - 0.2);
    return spark;
  }

  /** 点燃已捕获的火花，使其进入可用状态。 */
  ignite(id: string): boolean {
    const s = this._sparks.find(x => x.id === id);
    if (!s || s.ignited) return false;
    s.ignited = true;
    return true;
  }

  /** 评估已捕获火花的总能量。 */
  evaluate(): { total: number; ignited: number; averageIntensity: number } {
    const total = this._sparks.length;
    const ignited = this._sparks.filter(s => s.ignited).length;
    const averageIntensity =
      total === 0 ? 0 : this._sparks.reduce((s, x) => s + x.intensity, 0) / total;
    return { total, ignited, averageIntensity };
  }

  /** 火花未被点燃则随时间熄灭。 */
  extinguish(id: string): boolean {
    const s = this._sparks.find(x => x.id === id);
    if (!s || s.ignited) return false;
    s.intensity = 0;
    return true;
  }

  get intensity(): number {
    return this._intensity;
  }

  get phase(): ConsciousnessPhase {
    return this._phase;
  }

  getCaptured(): HypnagogicCapture[] {
    return [...this._sparks];
  }
}
