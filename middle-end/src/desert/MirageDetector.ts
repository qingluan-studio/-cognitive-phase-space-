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
  private _kernelWeights: number[];
  private _posteriorProbabilities: Map<string, number>;

  constructor(threshold: number = 0.5) {
    this._candidates = [];
    this._threshold = threshold;
    this._falsePositives = 0;
    this._kernelWeights = [0.4, 0.4, 0.2];
    this._posteriorProbabilities = new Map();
  }

  get threshold(): number {
    return this._threshold;
  }

  get posteriorProbabilities(): Map<string, number> {
    return new Map(this._posteriorProbabilities);
  }

  public observe(candidate: OasisCandidate): void {
    this._candidates.push(candidate);
  }

  public score(candidate: OasisCandidate): number {
    const r = 1 - candidate.reflectivity;
    const v = candidate.vegetation;
    const t = 1 - Math.min(1, candidate.temperatureDelta / 30);
    return r * this._kernelWeights[0] + v * this._kernelWeights[1] + t * this._kernelWeights[2];
  }

  public evaluate(): Array<{ id: string; score: number; real: boolean }> {
    return this._candidates.map((c) => {
      const s = this.score(c);
      const prior = 0.3;
      const likelihood = this._sigmoid(s * 4 - 2);
      const posterior = (likelihood * prior) / (likelihood * prior + (1 - likelihood) * (1 - prior));
      this._posteriorProbabilities.set(c.id, posterior);
      const real = posterior >= this._threshold;
      if (!real) this._falsePositives += 1;
      return { id: c.id, score: s, real };
    });
  }

  public filterReal(): OasisCandidate[] {
    return this._candidates.filter((c) => {
      const posterior = this._posteriorProbabilities.get(c.id);
      return posterior !== undefined ? posterior >= this._threshold : this.score(c) >= this._threshold;
    });
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
    this._posteriorProbabilities.clear();
  }

  public optimizeKernelWeights(targetRecall: number): void {
    const step = 0.01;
    let bestWeights = [...this._kernelWeights];
    let bestLoss = Infinity;
    for (let i = 0; i <= 100; i++) {
      for (let j = 0; j <= 100 - i; j++) {
        const w = [i * step, j * step, (100 - i - j) * step];
        this._kernelWeights = w;
        const evaluated = this.evaluate();
        const recall = evaluated.filter(e => e.real).length / Math.max(1, evaluated.length);
        const loss = (recall - targetRecall) ** 2;
        if (loss < bestLoss) {
          bestLoss = loss;
          bestWeights = w;
        }
      }
    }
    this._kernelWeights = bestWeights;
  }

  public computeROCCurve(): Array<{ fpr: number; tpr: number }> {
    const curve: Array<{ fpr: number; tpr: number }> = [];
    const scores = this._candidates.map(c => ({ id: c.id, score: this.score(c) }));
    scores.sort((a, b) => b.score - a.score);
    for (let i = 0; i <= scores.length; i++) {
      const thresh = i < scores.length ? scores[i].score : 0;
      const tp = scores.filter(s => s.score >= thresh).length;
      const fp = this._falsePositives;
      curve.push({ fpr: fp / Math.max(1, this._candidates.length), tpr: tp / Math.max(1, this._candidates.length) });
    }
    return curve;
  }

  private _sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x));
  }
}
