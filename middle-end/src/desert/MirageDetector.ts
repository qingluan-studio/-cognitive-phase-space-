/**
 * 海市蜃楼检测器模块：区分虚假希望与真实绿洲。
 * 通过多维特征比对，把虚假信号过滤掉，只把可信水源标记为真实绿洲。
 */

export interface MirageDetectorData {
  candidates: Array<{ id: string; score: number; real: boolean }>;
  falsePositives: number;
}

export interface OasisCandidate {
  id: string;
  reflectivity: number;
  vegetation: number;
  temperatureDelta: number;
}

export class MirageDetector {
  private _candidates: OasisCandidate[];
  private _threshold: number;
  private _falsePositives: number;

  constructor(threshold: number = 0.5) {
    this._candidates = [];
    this._threshold = threshold;
    this._falsePositives = 0;
  }

  get threshold(): number {
    return this._threshold;
  }

  public observe(candidate: OasisCandidate): void {
    this._candidates.push(candidate);
  }

  public score(candidate: OasisCandidate): number {
    const r = 1 - candidate.reflectivity;
    const v = candidate.vegetation;
    const t = 1 - Math.min(1, candidate.temperatureDelta / 30);
    return r * 0.4 + v * 0.4 + t * 0.2;
  }

  public evaluate(): Array<{ id: string; score: number; real: boolean }> {
    return this._candidates.map((c) => {
      const s = this.score(c);
      const real = s >= this._threshold;
      if (!real) this._falsePositives += 1;
      return { id: c.id, score: s, real };
    });
  }

  public filterReal(): OasisCandidate[] {
    return this._candidates.filter((c) => this.score(c) >= this._threshold);
  }

  public calibrate(newThreshold: number): void {
    this._threshold = Math.max(0, Math.min(1, newThreshold));
  }

  public report(): MirageDetectorData {
    return {
      candidates: this.evaluate(),
      falsePositives: this._falsePositives,
    };
  }

  public clear(): void {
    this._candidates = [];
    this._falsePositives = 0;
  }
}
