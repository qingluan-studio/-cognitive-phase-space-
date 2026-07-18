import type { DataPacket, Signal, Handler } from '../shared/types';

export interface JurorVote {
  modelId: string;
  response: string;
  score: number;
  ranking: number;
  reasoning: string;
  criteriaScores: Map<string, number>;
}

export interface JuryResult {
  winner: string;
  winnerModelId: string;
  votes: JurorVote[];
  consensusScore: number;
  rankings: { modelId: string; avgScore: number; rank: number }[];
  deliberationTime: number;
}

export interface JuryCriteria {
  name: string;
  weight: number;
  description: string;
}

const DEFAULT_CRITERIA: JuryCriteria[] = [
  { name: 'accuracy', weight: 0.3, description: 'Factual correctness' },
  { name: 'relevance', weight: 0.25, description: 'Addresses the prompt' },
  { name: 'coherence', weight: 0.2, description: 'Logical flow' },
  { name: 'completeness', weight: 0.15, description: 'Thoroughness' },
  { name: 'clarity', weight: 0.1, description: 'Readability' }
];

export interface JuryConfig {
  criteria: JuryCriteria[];
  votingMethod: 'majority' | 'ranked' | 'weighted' | 'borda';
  requireConsensus?: boolean;
  consensusThreshold?: number;
  maxRounds?: number;
}

export interface JurorHistory {
  caseId: string;
  result: JuryResult;
  responses: { modelId: string; content: string }[];
  timestamp: number;
}

export class ResponseJuror {
  private _criteria: JuryCriteria[];
  private _votingMethod: 'majority' | 'ranked' | 'weighted' | 'borda';
  private _consensusThreshold: number;
  private _maxRounds: number;
  private _history: JurorHistory[];
  private _maxHistorySize: number;
  private _modelWeights: Map<string, number>;
  private _tieBreaker: 'first' | 'random' | 'highestQuality';

  constructor() {
    this._criteria = [...DEFAULT_CRITERIA];
    this._votingMethod = 'weighted';
    this._consensusThreshold = 0.6;
    this._maxRounds = 3;
    this._history = [];
    this._maxHistorySize = 200;
    this._modelWeights = new Map();
    this._tieBreaker = 'highestQuality';
  }

  get criteriaCount(): number { return this._criteria.length; }
  get votingMethod(): string { return this._votingMethod; }
  get history(): JurorHistory[] { return [...this._history]; }

  public setVotingMethod(method: 'majority' | 'ranked' | 'weighted' | 'borda'): void {
    this._votingMethod = method;
  }

  public setCriteria(criteria: JuryCriteria[]): void {
    this._criteria = criteria.map(c => ({ ...c }));
  }

  public addCriterion(criterion: JuryCriteria): void {
    this._criteria.push({ ...criterion });
  }

  public removeCriterion(name: string): boolean {
    const idx = this._criteria.findIndex(c => c.name === name);
    if (idx > -1) { this._criteria.splice(idx, 1); return true; }
    return false;
  }

  public setModelWeight(modelId: string, weight: number): void {
    this._modelWeights.set(modelId, Math.max(0, weight));
  }

  public getModelWeight(modelId: string): number {
    return this._modelWeights.get(modelId) || 1.0;
  }

  public setConsensusThreshold(threshold: number): void {
    this._consensusThreshold = Math.max(0, Math.min(1, threshold));
  }

  public setMaxRounds(rounds: number): void {
    this._maxRounds = Math.max(1, rounds);
  }

  public evaluate(
    caseId: string,
    prompt: string,
    responses: { modelId: string; content: string }[]
  ): JuryResult {
    const startTime = Date.now();

    const votes: JurorVote[] = responses.map(resp => ({
      modelId: resp.modelId,
      response: resp.content,
      score: 0,
      ranking: 0,
      reasoning: '',
      criteriaScores: new Map()
    }));

    for (const vote of votes) {
      const scores = this._scoreResponse(vote.response, prompt);
      vote.criteriaScores = scores;
      const modelWeight = this.getModelWeight(vote.modelId);
      vote.score = this._calculateWeightedScore(scores) * modelWeight;
      vote.reasoning = this._generateReasoning(scores);
    }

    const rankings = this._applyVotingMethod(votes);
    for (let i = 0; i < rankings.length; i++) {
      const vote = votes.find(v => v.modelId === rankings[i].modelId);
      if (vote) vote.ranking = i + 1;
    }

    const winner = rankings[0];
    const winnerVote = votes.find(v => v.modelId === winner.modelId)!;
    const consensusScore = this._calculateConsensus(votes);

    const result: JuryResult = {
      winner: winnerVote.response,
      winnerModelId: winner.modelId,
      votes: votes.map(v => ({ ...v, criteriaScores: new Map(v.criteriaScores) })),
      consensusScore,
      rankings: rankings.map(r => ({ ...r })),
      deliberationTime: Date.now() - startTime
    };

    this._history.push({
      caseId,
      result: { ...result, votes: result.votes.map(v => ({ ...v, criteriaScores: new Map(v.criteriaScores) })), rankings: result.rankings.map(r => ({ ...r })) },
      responses: responses.map(r => ({ ...r })),
      timestamp: Date.now()
    });
    if (this._history.length > this._maxHistorySize) this._history.shift();

    return result;
  }

  private _scoreResponse(response: string, prompt: string): Map<string, number> {
    const scores = new Map<string, number>();
    for (const criterion of this._criteria) {
      scores.set(criterion.name, Math.max(0, Math.min(1, this._estimateCriterion(criterion.name, response, prompt))));
    }
    return scores;
  }

  private _calculateWeightedScore(scores: Map<string, number>): number {
    let totalWeight = 0, weightedSum = 0;
    for (const criterion of this._criteria) {
      const score = scores.get(criterion.name) || 0;
      weightedSum += score * criterion.weight;
      totalWeight += criterion.weight;
    }
    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  private _applyVotingMethod(votes: JurorVote[]): { modelId: string; avgScore: number; rank: number }[] {
    const modelScores = new Map<string, number[]>();
    for (const vote of votes) {
      if (!modelScores.has(vote.modelId)) modelScores.set(vote.modelId, []);
      modelScores.get(vote.modelId)!.push(vote.score);
    }

    const rankings: { modelId: string; avgScore: number; rank: number }[] = [];

    switch (this._votingMethod) {
      case 'majority':
        for (const [modelId, scores] of modelScores) {
          const aboveThreshold = scores.filter(s => s >= 0.7).length;
          rankings.push({ modelId, avgScore: aboveThreshold / Math.max(1, scores.length), rank: 0 });
        }
        break;
      case 'ranked':
        const sortedByScore = [...votes].sort((a, b) => b.score - a.score);
        const rankScores = new Map<string, number>();
        for (let i = 0; i < sortedByScore.length; i++) {
          const current = rankScores.get(sortedByScore[i].modelId) || 0;
          rankScores.set(sortedByScore[i].modelId, current + (sortedByScore.length - i));
        }
        for (const [modelId, score] of rankScores) {
          rankings.push({ modelId, avgScore: score, rank: 0 });
        }
        break;
      case 'borda':
        const allScores = [...votes].sort((a, b) => b.score - a.score);
        const bordaScores = new Map<string, number>();
        for (let i = 0; i < allScores.length; i++) {
          const current = bordaScores.get(allScores[i].modelId) || 0;
          bordaScores.set(allScores[i].modelId, current + (allScores.length - 1 - i));
        }
        for (const [modelId, score] of bordaScores) {
          rankings.push({ modelId, avgScore: score, rank: 0 });
        }
        break;
      case 'weighted':
      default:
        for (const [modelId, scores] of modelScores) {
          const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length;
          rankings.push({ modelId, avgScore: avg, rank: 0 });
        }
    }

    rankings.sort((a, b) => b.avgScore - a.avgScore);
    for (let i = 0; i < rankings.length; i++) {
      rankings[i].rank = i > 0 && rankings[i].avgScore === rankings[i - 1].avgScore ? rankings[i - 1].rank : i + 1;
    }
    return rankings;
  }

  private _calculateConsensus(votes: JurorVote[]): number {
    if (votes.length <= 1) return 1;
    const scores = votes.map(v => v.score);
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);
    return Math.max(0, 1 - stdDev * 2);
  }

  private _estimateCriterion(name: string, response: string, prompt: string): number {
    const lower = response.toLowerCase();
    switch (name) {
      case 'accuracy': {
        const factual = ['according to', 'research shows', 'studies indicate', 'data suggests', 'evidence'].some(m => lower.includes(m));
        const len = Math.min(1, response.length / 500);
        return factual ? 0.7 + len * 0.2 : 0.4 + len * 0.3;
      }
      case 'relevance': {
        const words = prompt.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        const matches = words.filter(w => lower.includes(w)).length;
        return words.length > 0 ? matches / words.length : 0.5;
      }
      case 'coherence': {
        const sents = response.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const hasTrans = /however|therefore|moreover|furthermore|in addition|consequently|thus|hence/.test(lower);
        return 0.3 + (sents.length > 2 ? 0.2 : 0) + (hasTrans ? 0.2 : 0) + Math.min(0.6, response.length / 1000 * 0.6);
      }
      case 'completeness': {
        const qWords = ['what', 'why', 'how', 'when', 'where', 'who', 'which'];
        const qCount = qWords.filter(w => prompt.toLowerCase().includes(w)).length;
        return qCount > 0 ? Math.min(1, response.length / 300) : 0.6;
      }
      case 'clarity': {
        const commas = (response.match(/,/g) || []).length;
        const avgLen = response.length / Math.max(1, response.split(/[.!?]+/).length);
        return Math.max(0.2, 0.8 - Math.min(0.3, commas / 20 * 0.3) - (avgLen > 50 ? 0.2 : 0));
      }
      default: return 0.5 + Math.random() * 0.3;
    }
  }

  private _generateReasoning(scores: Map<string, number>): string {
    const parts: string[] = [];
    for (const [name, score] of scores) {
      const level = score >= 0.8 ? 'excellent' : score >= 0.6 ? 'good' : score >= 0.4 ? 'moderate' : 'poor';
      parts.push(`${name}: ${level} (${(score * 100).toFixed(0)}%)`);
    }
    return parts.join('; ');
  }

  public detectSignalFromResult(result: JuryResult): Signal {
    return {
      source: 'response-juror',
      magnitude: result.consensusScore,
      entropy: 1 - result.consensusScore,
      timestamp: Date.now()
    };
  }

  public processPacket(
    packet: DataPacket<{ caseId: string; prompt: string; responses: { modelId: string; content: string }[] }>
  ): DataPacket<JuryResult> {
    const { caseId, prompt, responses } = packet.payload;
    const result = this.evaluate(caseId, prompt, responses);
    return {
      id: `jury-${packet.id}`,
      payload: result,
      metadata: {
        createdAt: Date.now(),
        route: [...packet.metadata.route, 'response-juror'],
        priority: packet.metadata.priority,
        phase: 'evaluated'
      }
    };
  }

  public getPerformanceStats(): { totalCases: number; avgConsensus: number; mostWinningModel: string | null } {
    if (this._history.length === 0) {
      return { totalCases: 0, avgConsensus: 0, mostWinningModel: null };
    }
    const totalConsensus = this._history.reduce((sum, h) => sum + h.result.consensusScore, 0);
    const winCounts = new Map<string, number>();
    for (const h of this._history) {
      winCounts.set(h.result.winnerModelId, (winCounts.get(h.result.winnerModelId) || 0) + 1);
    }
    let mostWinning: string | null = null, maxWins = 0;
    for (const [modelId, wins] of winCounts) {
      if (wins > maxWins) { maxWins = wins; mostWinning = modelId; }
    }
    return { totalCases: this._history.length, avgConsensus: totalConsensus / this._history.length, mostWinningModel: mostWinning };
  }

  public clearHistory(): void {
    this._history = [];
  }

  public reset(): void {
    this._criteria = [...DEFAULT_CRITERIA];
    this._history = [];
    this._modelWeights.clear();
  }
}
