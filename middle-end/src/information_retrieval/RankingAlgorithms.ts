import { DataPacket } from '../shared/types';

export interface RankedDoc {
  id: string;
  score: number;
  rank: number;
}

export interface Ranking {
  documents: RankedDoc[];
  scores: number[];
  method: string;
  features: string[];
}

export class RankingAlgorithms {
  private _rankings: Ranking[] = [];
  private _method: string = 'default';
  private _counter: number = 0;
  private _lastRanking: Ranking | null = null;

  get rankings(): Ranking[] {
    return this._rankings;
  }

  get method(): string {
    return this._method;
  }

  tfIdfScore(doc: string, query: string, corpus: string[]): number {
    const docTerms = doc.toLowerCase().split(/\s+/);
    const queryTerms = query.toLowerCase().split(/\s+/);
    const N = corpus.length;
    let score = 0;
    for (const term of queryTerms) {
      const tf = docTerms.filter(t => t === term).length / docTerms.length;
      let df = 0;
      for (const cDoc of corpus) {
        if (cDoc.toLowerCase().includes(term)) df++;
      }
      const idf = Math.log((N + 1) / (df + 1));
      score += tf * idf;
    }
    return score;
  }

  bm25(doc: string, query: string, corpus: string[], k1: number = 1.5, b: number = 0.75): number {
    const docTerms = doc.toLowerCase().split(/\s+/);
    const queryTerms = query.toLowerCase().split(/\s+/);
    const N = corpus.length;
    const avgDl = corpus.reduce((sum, d) => sum + d.split(/\s+/).length, 0) / N || 1;
    const dl = docTerms.length;
    let score = 0;
    for (const term of queryTerms) {
      const tf = docTerms.filter(t => t === term).length;
      let df = 0;
      for (const cDoc of corpus) {
        if (cDoc.toLowerCase().includes(term)) df++;
      }
      const idf = Math.log((N - df + 0.5) / (df + 0.5) + 1);
      const tfNorm = tf * (k1 + 1) / (tf + k1 * (1 - b + b * dl / avgDl));
      score += idf * tfNorm;
    }
    return score;
  }

  cosineSimilarity(vec1: number[], vec2: number[]): number {
    let dot = 0;
    let n1 = 0;
    let n2 = 0;
    const minLen = Math.min(vec1.length, vec2.length);
    for (let i = 0; i < minLen; i++) {
      dot += vec1[i] * vec2[i];
      n1 += vec1[i] * vec1[i];
      n2 += vec2[i] * vec2[i];
    }
    const denom = Math.sqrt(n1) * Math.sqrt(n2);
    return denom === 0 ? 0 : dot / denom;
  }

  jaccardSimilarity(set1: Set<string>, set2: Set<string>): number {
    let intersection = 0;
    for (const item of set1) {
      if (set2.has(item)) intersection++;
    }
    const union = set1.size + set2.size - intersection;
    return union === 0 ? 0 : intersection / union;
  }

  okapiScore(doc: string, query: string, corpus: string[]): number {
    return this.bm25(doc, query, corpus, 1.2, 0.75);
  }

  dirichletPrior(doc: string, query: string, mu: number = 2000): number {
    const docTerms = doc.toLowerCase().split(/\s+/);
    const queryTerms = query.toLowerCase().split(/\s+/);
    const dl = docTerms.length;
    let score = 0;
    for (const term of queryTerms) {
      const tf = docTerms.filter(t => t === term).length;
      const pwd = (tf + mu * 0.01) / (dl + mu);
      score += Math.log(pwd);
    }
    return score;
  }

  jelinekMercer(doc: string, query: string, lambda: number = 0.7): number {
    const docTerms = doc.toLowerCase().split(/\s+/);
    const queryTerms = query.toLowerCase().split(/\s+/);
    const dl = docTerms.length;
    let score = 0;
    for (const term of queryTerms) {
      const tf = docTerms.filter(t => t === term).length;
      const pwd = lambda * (tf / (dl || 1)) + (1 - lambda) * 0.01;
      score += Math.log(pwd + 1e-10);
    }
    return score;
  }

  pivotedNormalization(doc: string, query: string, corpus: string[]): number {
    return this.tfIdfScore(doc, query, corpus);
  }

  pageRank(graph: Map<string, string[]>, dampingFactor: number = 0.85): Map<string, number> {
    const nodes = Array.from(graph.keys());
    const n = nodes.length;
    const ranks = new Map<string, number>();
    for (const node of nodes) {
      ranks.set(node, 1 / n);
    }
    for (let iter = 0; iter < 50; iter++) {
      const newRanks = new Map<string, number>();
      for (const node of nodes) {
        let rank = (1 - dampingFactor) / n;
        for (const [source, targets] of graph) {
          if (targets.includes(node)) {
            const outDegree = targets.length || 1;
            rank += dampingFactor * (ranks.get(source) || 0) / outDegree;
          }
        }
        newRanks.set(node, rank);
      }
      ranks.clear();
      for (const [k, v] of newRanks) {
        ranks.set(k, v);
      }
    }
    return ranks;
  }

  hits(graph: Map<string, string[]>, iterations: number = 50): { hubs: Map<string, number>; authorities: Map<string, number> } {
    const nodes = Array.from(graph.keys());
    const hubs = new Map<string, number>();
    const authorities = new Map<string, number>();
    for (const node of nodes) {
      hubs.set(node, 1);
      authorities.set(node, 1);
    }
    for (let iter = 0; iter < iterations; iter++) {
      const newAuthorities = new Map<string, number>();
      for (const node of nodes) {
        let auth = 0;
        for (const [source, targets] of graph) {
          if (targets.includes(node)) {
            auth += hubs.get(source) || 0;
          }
        }
        newAuthorities.set(node, auth);
      }
      const newHubs = new Map<string, number>();
      for (const node of nodes) {
        let hub = 0;
        const targets = graph.get(node) || [];
        for (const target of targets) {
          hub += newAuthorities.get(target) || 0;
        }
        newHubs.set(node, hub);
      }
      let authNorm = 0;
      let hubNorm = 0;
      for (const node of nodes) {
        authNorm += (newAuthorities.get(node) || 0) ** 2;
        hubNorm += (newHubs.get(node) || 0) ** 2;
      }
      authNorm = Math.sqrt(authNorm) || 1;
      hubNorm = Math.sqrt(hubNorm) || 1;
      authorities.clear();
      hubs.clear();
      for (const node of nodes) {
        authorities.set(node, (newAuthorities.get(node) || 0) / authNorm);
        hubs.set(node, (newHubs.get(node) || 0) / hubNorm);
      }
    }
    return { hubs, authorities };
  }

  learningToRank(docs: string[], features: number[][], model: { weights: number[] }): RankedDoc[] {
    const scored = docs.map((id, idx) => {
      let score = 0;
      for (let f = 0; f < features[idx].length; f++) {
        score += features[idx][f] * (model.weights[f] || 0);
      }
      return { id, score, rank: 0 };
    });
    scored.sort((a, b) => b.score - a.score);
    for (let i = 0; i < scored.length; i++) {
      scored[i].rank = i + 1;
    }
    return scored;
  }

  rankSVM(docs: string[], pairs: [number, number, number][]): number[] {
    const weights = new Array(docs.length).fill(0);
    for (const [i, j, label] of pairs) {
      if (label === 1) {
        weights[i] += 0.1;
        weights[j] -= 0.1;
      } else {
        weights[i] -= 0.1;
        weights[j] += 0.1;
      }
    }
    return weights;
  }

  toPacket(): DataPacket<Ranking> {
    const result = this._lastRanking || { documents: [], scores: [], method: '', features: [] };
    this._counter++;
    return {
      id: `ranking-${Date.now()}-${this._counter}`,
      payload: result,
      metadata: {
        createdAt: Date.now(),
        route: ['information-retrieval', 'ranking'],
        priority: 1,
        phase: 'ranking'
      }
    };
  }

  reset(): void {
    this._rankings = [];
    this._method = 'default';
    this._counter = 0;
    this._lastRanking = null;
  }
}
