export type VoteWeight = 'equal' | 'expertise' | 'stake' | 'quadratic';

export interface Ballot {
  voterId: string;
  proposalId: string;
  choice: string;
  weight: number;
  castAt: number;
}

export interface VoteResult {
  proposalId: string;
  winner: string;
  tally: Record<string, number>;
  totalVotes: number;
  margin: number;
  decided: boolean;
  confidence: number;
}

export class SwarmVoting {
  private _ballots: Ballot[] = [];
  private _results: VoteResult[] = [];
  private _voterWeights: Map<string, number> = new Map();
  private _voterStakes: Map<string, number> = new Map();
  private _weightMode: VoteWeight = 'equal';
  private _quorum = 0.5;
  private _supermajority = 0.66;

  registerVoter(voterId: string, expertise: number, stake: number = 0): void {
    this._voterWeights.set(voterId, expertise);
    this._voterStakes.set(voterId, stake);
  }

  setWeightMode(mode: VoteWeight): void {
    this._weightMode = mode;
  }

  private _resolveWeight(voterId: string): number {
    if (this._weightMode === 'equal') return 1;
    if (this._weightMode === 'expertise') return this._voterWeights.get(voterId) ?? 1;
    if (this._weightMode === 'stake') {
      const stake = this._voterStakes.get(voterId) ?? 0;
      return Math.max(1, stake);
    }
    const stake = this._voterStakes.get(voterId) ?? 1;
    return Math.sqrt(Math.max(1, stake));
  }

  castVote(voterId: string, proposalId: string, choice: string): Ballot {
    const ballot: Ballot = {
      voterId,
      proposalId,
      choice,
      weight: this._resolveWeight(voterId),
      castAt: Date.now(),
    };
    this._ballots.push(ballot);
    if (this._ballots.length > 500) this._ballots.shift();
    return ballot;
  }

  tallyVotes(proposalId: string): VoteResult {
    const tally: Record<string, number> = {};
    let totalVotes = 0;
    const participants = new Set<string>();
    for (const b of this._ballots) {
      if (b.proposalId !== proposalId) continue;
      tally[b.choice] = (tally[b.choice] ?? 0) + b.weight;
      totalVotes += b.weight;
      participants.add(b.voterId);
    }
    const sorted = Object.entries(tally).sort((a, b) => b[1] - a[1]);
    const winner = sorted[0]?.[0] ?? '';
    const top = sorted[0]?.[1] ?? 0;
    const runner = sorted[1]?.[1] ?? 0;
    const margin = top - runner;
    const totalVoters = this._voterWeights.size;
    const participationRate = totalVoters === 0 ? 0 : participants.size / totalVoters;
    const quorumMet = totalVoters === 0 || participationRate >= this._quorum;
    const winnerShare = totalVotes === 0 ? 0 : top / totalVotes;
    const decided = quorumMet && winner !== '' && winnerShare >= 0.5;
    const confidence = this._computeConfidence(participationRate, winnerShare, sorted.length);
    const result: VoteResult = {
      proposalId,
      winner,
      tally,
      totalVotes,
      margin,
      decided,
      confidence,
    };
    this._results.push(result);
    if (this._results.length > 100) this._results.shift();
    return result;
  }

  private _computeConfidence(participation: number, winnerShare: number, choices: number): number {
    if (choices === 0) return 0;
    const choicePenalty = 1 - 1 / choices;
    return Math.max(0, Math.min(1, participation * winnerShare * (1 - choicePenalty * 0.3)));
  }

  requiresSupermajority(proposalId: string): boolean {
    const result = this.tallyVotes(proposalId);
    if (!result.decided) return false;
    const winnerShare = result.totalVotes === 0 ? 0 : (result.tally[result.winner] ?? 0) / result.totalVotes;
    return winnerShare >= this._supermajority;
  }

  setQuorum(value: number): void {
    this._quorum = Math.max(0, Math.min(1, value));
  }

  setSupermajority(value: number): void {
    this._supermajority = Math.max(0.5, Math.min(1, value));
  }

  purgeOldBallots(beforeTimestamp: number): number {
    const before = this._ballots.length;
    this._ballots = this._ballots.filter(b => b.castAt >= beforeTimestamp);
    return before - this._ballots.length;
  }

  getVoterHistory(voterId: string): Ballot[] {
    return this._ballots.filter(b => b.voterId === voterId);
  }

  getResultHistory(limit: number = 20): VoteResult[] {
    return this._results.slice(-limit);
  }

  measureConsensusStrength(proposalId: string): number {
    const result = this.tallyVotes(proposalId);
    if (result.totalVotes === 0) return 0;
    const shares = Object.values(result.tally).map(v => v / result.totalVotes);
    let h = 0;
    for (const p of shares) if (p > 0) h -= p * Math.log2(p);
    return 1 - h / Math.log2(shares.length);
  }

  get voterCount(): number {
    return this._voterWeights.size;
  }

  get pendingBallots(): number {
    return this._ballots.length;
  }
}
