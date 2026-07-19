import { DataPacket } from '../shared/types';

export interface RankedItem {
  id: string;
  score: number;
  features: number[];
}

export interface RankModel {
  name: string;
  type: string;
  features: string[];
  weights: number[];
}

export class RankingModels {
  private _models: RankModel[] = [];
  private _rankedItems: RankedItem[] = [];
  private _counter: number = 0;
  private _method: string = 'pointwise';
  private _lastRanking: RankedItem[] = [];

  get models(): RankModel[] {
    return this._models;
  }

  get rankedItems(): RankedItem[] {
    return this._rankedItems;
  }

  get method(): string {
    return this._method;
  }

  pointwiseRank(features: number[][], model: { weights: number[] }): number[] {
    const scores: number[] = [];
    for (const feat of features) {
      let score = 0;
      for (let i = 0; i < Math.min(feat.length, model.weights.length); i++) {
        score += feat[i] * model.weights[i];
      }
      scores.push(score);
    }
    return scores;
  }

  pairwiseRank(pairs: [number[], number[], number][], model: { weights: number[] }): number[] {
    const scores: number[] = [];
    for (const [f1, f2] of pairs) {
      let s1 = 0;
      let s2 = 0;
      for (let i = 0; i < Math.min(f1.length, model.weights.length); i++) {
        s1 += f1[i] * model.weights[i];
        s2 += f2[i] * model.weights[i];
      }
      scores.push(s1 - s2);
    }
    return scores;
  }

  listwiseRank(list: number[][], model: { weights: number[] }): number[] {
    const scores = list.map(feats => {
      let score = 0;
      for (let i = 0; i < Math.min(feats.length, model.weights.length); i++) {
        score += feats[i] * model.weights[i];
      }
      return score;
    });
    const expScores = scores.map(s => Math.exp(s));
    const sum = expScores.reduce((a, b) => a + b, 0);
    return expScores.map(s => s / sum);
  }

  logisticRegressionRank(features: number[][], weights: number[]): number[] {
    const scores: number[] = [];
    for (const feat of features) {
      let z = 0;
      for (let i = 0; i < Math.min(feat.length, weights.length); i++) {
        z += feat[i] * weights[i];
      }
      scores.push(1 / (1 + Math.exp(-z)));
    }
    return scores;
  }

  svmRank(features: number[][], kernel: string = 'linear'): number[] {
    const scores: number[] = [];
    for (const feat of features) {
      let score = 0;
      for (let i = 0; i < feat.length; i++) {
        if (kernel === 'linear') {
          score += feat[i] * (i % 2 === 0 ? 1 : -1);
        } else if (kernel === 'rbf') {
          score += Math.exp(-feat[i] * feat[i]);
        } else {
          score += feat[i];
        }
      }
      scores.push(score);
    }
    return scores;
  }

  gradientBoostingRank(features: number[][], trees: number = 100): number[] {
    const scores = new Array(features.length).fill(0);
    for (let t = 0; t < trees; t++) {
      for (let i = 0; i < features.length; i++) {
        const featIdx = t % features[i].length;
        scores[i] += features[i][featIdx] * 0.01;
      }
    }
    return scores;
  }

  neuralRank(features: number[][], network: { layers: number[] }): number[] {
    let current = features;
    for (let layer = 0; layer < network.layers.length; layer++) {
      const next: number[][] = [];
      for (const feat of current) {
        const nextLayer: number[] = [];
        for (let n = 0; n < network.layers[layer]; n++) {
          let val = 0;
          for (let i = 0; i < feat.length; i++) {
            val += feat[i] * (i % 2 === 0 ? 0.1 : -0.1);
          }
          nextLayer.push(Math.max(0, val));
        }
        next.push(nextLayer);
      }
      current = next;
    }
    return current.map(layer => layer[0] || 0);
  }

  lambdaRank(pairs: [number[], number[], number][], k: number = 10): number[] {
    const scores: number[] = [];
    for (const [f1, f2] of pairs) {
      let s1 = 0;
      let s2 = 0;
      for (let i = 0; i < f1.length; i++) {
        s1 += f1[i] * 0.1;
        s2 += f2[i] * 0.1;
      }
      scores.push(s1 - s2);
    }
    return scores;
  }

  lambdamartRank(lists: number[][], trees: number = 100): number[] {
    const scores = new Array(lists.length).fill(0);
    for (let t = 0; t < trees; t++) {
      for (let i = 0; i < lists.length; i++) {
        for (let j = 0; j < lists[i].length; j++) {
          scores[i] += lists[i][j] * 0.01;
        }
      }
    }
    return scores;
  }

  listnetRank(lists: number[][], epochs: number = 100): number[] {
    return this.listwiseRank(lists, { weights: new Array(lists[0]?.length || 1).fill(0.1) });
  }

  featureEngineering(features: number[][]): number[][] {
    const result: number[][] = [];
    for (const feat of features) {
      const engineered: number[] = [...feat];
      for (let i = 0; i < feat.length; i++) {
        engineered.push(feat[i] * feat[i]);
        engineered.push(Math.sqrt(Math.max(0, feat[i])));
        for (let j = i + 1; j < Math.min(feat.length, i + 3); j++) {
          engineered.push(feat[i] * feat[j]);
        }
      }
      result.push(engineered);
    }
    return result;
  }

  featureImportance(model: { weights: number[] }): number[] {
    return model.weights.map(Math.abs);
  }

  clickModel(impressions: string[], clicks: string[]): Map<string, number> {
    const clickCounts = new Map<string, number>();
    const impCounts = new Map<string, number>();
    for (const imp of impressions) {
      impCounts.set(imp, (impCounts.get(imp) || 0) + 1);
    }
    for (const click of clicks) {
      clickCounts.set(click, (clickCounts.get(click) || 0) + 1);
    }
    const ctr = new Map<string, number>();
    for (const [item, imps] of impCounts) {
      const clicks = clickCounts.get(item) || 0;
      ctr.set(item, clicks / imps);
    }
    return ctr;
  }

  positionBias(clicks: string[], positions: number[]): number[] {
    const positionClicks = new Map<number, number>();
    const positionCounts = new Map<number, number>();
    for (let i = 0; i < Math.min(clicks.length, positions.length); i++) {
      const pos = positions[i];
      positionCounts.set(pos, (positionCounts.get(pos) || 0) + 1);
      if (clicks[i]) {
        positionClicks.set(pos, (positionClicks.get(pos) || 0) + 1);
      }
    }
    const biases: number[] = [];
    for (const [pos, count] of positionCounts) {
      const c = positionClicks.get(pos) || 0;
      biases[pos] = c / count;
    }
    return biases;
  }

  toPacket(): DataPacket<RankedItem[]> {
    this._counter++;
    return {
      id: `rank-model-${Date.now()}-${this._counter}`,
      payload: this._lastRanking,
      metadata: {
        createdAt: Date.now(),
        route: ['recommendation', 'ranking-models'],
        priority: 1,
        phase: 'ranking'
      }
    };
  }

  reset(): void {
    this._models = [];
    this._rankedItems = [];
    this._counter = 0;
    this._method = 'pointwise';
    this._lastRanking = [];
  }
}
