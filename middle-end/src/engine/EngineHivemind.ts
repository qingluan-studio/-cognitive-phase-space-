/** 引擎蜂群 - 子引擎互相说服投票，产生集体决策 */

export interface SubEngine {
  id: string;
  name: string;
  weight: number;
  active: boolean;
}

export interface Proposal {
  id: string;
  proposerId: string;
  content: Record<string, unknown>;
  createdAt: number;
}

export type VoteStance = 'for' | 'against' | 'abstain';

export interface Vote {
  proposalId: string;
  voterId: string;
  stance: VoteStance;
  persuasion: number;
  castAt: number;
}

export interface CollectiveDecision {
  proposalId: string;
  totalFor: number;
  totalAgainst: number;
  totalAbstain: number;
  passed: boolean;
  decidedAt: number;
}

export class EngineHivemind {
  private _engines: Map<string, SubEngine> = new Map();
  private _proposals: Map<string, Proposal> = new Map();
  private _votes: Vote[] = [];
  private _decisions: CollectiveDecision[] = [];
  private _idCounter = 0;
  private _persuasionRounds = 2;
  private _quorum = 0.5;

  registerEngine(name: string, weight: number = 1): SubEngine {
    const id = `engine-${++this._idCounter}-${Date.now()}`;
    const engine: SubEngine = { id, name, weight: Math.max(0, weight), active: true };
    this._engines.set(id, engine);
    return engine;
  }

  deactivateEngine(engineId: string): boolean {
    const engine = this._engines.get(engineId);
    if (!engine) return false;
    engine.active = false;
    return true;
  }

  propose(proposerId: string, content: Record<string, unknown>): Proposal {
    if (!this._engines.has(proposerId)) {
      throw new Error(`Proposer not registered: ${proposerId}`);
    }
    const proposal: Proposal = {
      id: `prop-${++this._idCounter}-${Date.now()}`,
      proposerId,
      content,
      createdAt: Date.now(),
    };
    this._proposals.set(proposal.id, proposal);
    return proposal;
  }

  persuade(voterId: string, proposalId: string, stance: VoteStance, persuasion: number): Vote {
    if (!this._engines.has(voterId)) {
      throw new Error(`Voter not registered: ${voterId}`);
    }
    if (!this._proposals.has(proposalId)) {
      throw new Error(`Proposal not found: ${proposalId}`);
    }
    const vote: Vote = {
      proposalId,
      voterId,
      stance,
      persuasion: Math.max(0, Math.min(1, persuasion)),
      castAt: Date.now(),
    };
    this._votes.push(vote);
    return vote;
  }

  runPersuasionRounds(proposalId: string): Vote[] {
    const newVotes: Vote[] = [];
    const proposal = this._proposals.get(proposalId);
    if (!proposal) return [];
    for (let round = 0; round < this._persuasionRounds; round++) {
      for (const engine of this._engines.values()) {
        if (engine.id === proposal.proposerId || !engine.active) continue;
        const existing = this._votes.find(v => v.voterId === engine.id && v.proposalId === proposalId);
        const persuasion = existing ? Math.min(1, existing.persuasion + 0.1) : Math.random();
        const stance: VoteStance = persuasion > 0.5 ? 'for' : persuasion < 0.3 ? 'against' : 'abstain';
        if (existing) {
          existing.stance = stance;
          existing.persuasion = persuasion;
          existing.castAt = Date.now();
          newVotes.push(existing);
        } else {
          newVotes.push(this.persuade(engine.id, proposalId, stance, persuasion));
        }
      }
    }
    return newVotes;
  }

  decide(proposalId: string): CollectiveDecision {
    const votes = this._votes.filter(v => v.proposalId === proposalId);
    let totalFor = 0;
    let totalAgainst = 0;
    let totalAbstain = 0;
    for (const vote of votes) {
      const engine = this._engines.get(vote.voterId);
      const weight = engine ? engine.weight : 0;
      if (vote.stance === 'for') totalFor += weight * vote.persuasion;
      else if (vote.stance === 'against') totalAgainst += weight * vote.persuasion;
      else totalAbstain += weight;
    }
    const totalWeight = Array.from(this._engines.values())
      .filter(e => e.active)
      .reduce((s, e) => s + e.weight, 0);
    const turnout = (totalFor + totalAgainst + totalAbstain) / Math.max(totalWeight, 1);
    const passed = turnout >= this._quorum && totalFor > totalAgainst;
    const decision: CollectiveDecision = {
      proposalId,
      totalFor,
      totalAgainst,
      totalAbstain,
      passed,
      decidedAt: Date.now(),
    };
    this._decisions.push(decision);
    return decision;
  }

  setQuorum(q: number): void {
    if (q < 0 || q > 1) throw new Error('Quorum must be between 0 and 1');
    this._quorum = q;
  }

  setPersuasionRounds(n: number): void {
    if (n < 0) throw new Error('Rounds must be non-negative');
    this._persuasionRounds = n;
  }

  get engines(): SubEngine[] {
    return Array.from(this._engines.values());
  }

  get proposals(): Proposal[] {
    return Array.from(this._proposals.values());
  }

  get votes(): Vote[] {
    return [...this._votes];
  }

  get decisions(): CollectiveDecision[] {
    return [...this._decisions];
  }

  get quorum(): number {
    return this._quorum;
  }
}
