/**
 * 群投票模块：所有微引擎对候选行动方案进行投票，
 * 通过加权多数决策略决定群体的最终行动方向。
 */

export type VoteWeight = 'equal' | 'expertise' | 'stake';

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
  decided: boolean;
}

export class SwarmVoting {
  private _ballots: Ballot[] = [];
  private _results: VoteResult[] = [];
  private _voterWeights: Map<string, number> = new Map();
  private _weightMode: VoteWeight = 'equal';
  private _quorum = 0.5;

  registerVoter(voterId: string, expertise: number): void {
    this._voterWeights.set(voterId, expertise);
  }

  setWeightMode(mode: VoteWeight): void {
    this._weightMode = mode;
  }

  private _resolveWeight(voterId: string): number {
    if (this._weightMode === 'equal') return 1;
    if (this._weightMode === 'expertise') {
      return this._voterWeights.get(voterId) ?? 1;
    }
    return Math.max(1, (this._voterWeights.get(voterId) ?? 1) * 2);
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
    for (const b of this._ballots) {
      if (b.proposalId !== proposalId) continue;
      tally[b.choice] = (tally[b.choice] ?? 0) + b.weight;
      totalVotes += b.weight;
    }
    let winner = '';
    let max = 0;
    for (const [choice, count] of Object.entries(tally)) {
      if (count > max) {
        max = count;
        winner = choice;
      }
    }
    const totalVoters = this._voterWeights.size;
    const quorumMet = totalVoters === 0 || totalVotes / totalVoters >= this._quorum;
    const result: VoteResult = {
      proposalId,
      winner,
      tally,
      totalVotes,
      decided: quorumMet && winner !== '',
    };
    this._results.push(result);
    if (this._results.length > 100) this._results.shift();
    return result;
  }

  setQuorum(value: number): void {
    this._quorum = Math.max(0, Math.min(1, value));
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

  get voterCount(): number {
    return this._voterWeights.size;
  }

  get pendingBallots(): number {
    return this._ballots.length;
  }
}
