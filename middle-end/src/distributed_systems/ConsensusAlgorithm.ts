import { DataPacket } from '../shared/types';

export interface ConsensusResult {
  readonly nodes: number;
  readonly leader: string;
  readonly agreement: boolean;
  readonly term: number;
}

export interface NodeState {
  readonly id: string;
  readonly role: 'leader' | 'follower' | 'candidate' | 'proposer' | 'acceptor' | 'learner';
  readonly log: string[];
  readonly term: number;
}

export class ConsensusAlgorithm {
  private _nodes: Map<string, NodeState> = new Map();
  private _results: ConsensusResult[] = [];
  private _history: string[] = [];
  private _counter = 0;
  private _currentTerm = 0;

  get nodeCount(): number {
    return this._nodes.size;
  }

  get resultCount(): number {
    return this._results.length;
  }

  get history(): string[] {
    return [...this._history];
  }

  get currentTerm(): number {
    return this._currentTerm;
  }

  public raft(nodes: string[], term: number): ConsensusResult {
    const leader = nodes[Math.floor(Math.random() * nodes.length)] ?? 'node-0';
    const agreement = nodes.length > 0;
    nodes.forEach((id, idx) => {
      this._nodes.set(id, {
        id,
        role: id === leader ? 'leader' : 'follower',
        log: [`entry-${term}-${idx}`],
        term,
      });
    });
    const result: ConsensusResult = { nodes: nodes.length, leader, agreement, term };
    this._results.push(result);
    this._currentTerm = term;
    this._recordHistory(`raft(nodes=${nodes.length}, term=${term}) -> leader=${leader}`);
    return result;
  }

  public leaderElection(nodes: string[], term: number, timeout: number): { elected: string; term: number; votes: number } {
    const candidates = nodes.filter(() => Math.random() > 0.5);
    const voters = nodes.length;
    const elected = candidates[Math.floor(Math.random() * candidates.length)] ?? nodes[0] ?? 'node-0';
    const votes = Math.floor(voters * 0.6) + 1;
    this._recordHistory(`leaderElection(candidates=${candidates.length}, timeout=${timeout}) -> ${elected}`);
    return { elected, term, votes };
  }

  public logReplication(leader: string, followers: string[], entries: string[]): { replicated: number; failed: number; leader: string } {
    const replicated = Math.floor(followers.length * 0.8);
    const failed = followers.length - replicated;
    this._recordHistory(`logReplication(entries=${entries.length}, followers=${followers.length}) -> replicated=${replicated}`);
    return { replicated, failed, leader };
  }

  public paxos(proposers: string[], acceptors: string[], learners: string[], proposal: string): { accepted: boolean; proposal: string; round: number } {
    const quorum = Math.floor(acceptors.length / 2) + 1;
    const promises = Math.min(quorum + Math.floor(Math.random() * 2), acceptors.length);
    const accepted = promises >= quorum;
    this._recordHistory(`paxos(proposers=${proposers.length}, acceptors=${acceptors.length}) -> accepted=${accepted}`);
    return { accepted, proposal, round: this._counter };
  }

  public basicPaxos(proposal: string, acceptors: string[]): { prepare: boolean; accept: boolean; learn: boolean } {
    const majority = Math.floor(acceptors.length / 2) + 1;
    const prepareVotes = majority + Math.floor(Math.random() * (acceptors.length - majority + 1));
    const acceptVotes = majority + Math.floor(Math.random() * (acceptors.length - majority + 1));
    const prepare = prepareVotes >= majority;
    const accept = acceptVotes >= majority;
    const learn = accept;
    this._recordHistory(`basicPaxos(acceptors=${acceptors.length}) -> learn=${learn}`);
    return { prepare, accept, learn };
  }

  public multiPaxos(leaders: string[], sequence: string[]): { committed: number; leader: string; slot: number } {
    const leader = leaders[0] ?? 'leader-0';
    const committed = sequence.length;
    this._recordHistory(`multiPaxos(sequence=${sequence.length}) -> committed=${committed}`);
    return { committed, leader, slot: sequence.length };
  }

  public zab(ensemble: string[], proposal: string, leader: string): { committed: boolean; zxid: string; leader: string } {
    const quorum = Math.floor(ensemble.length / 2) + 1;
    const committed = Math.random() > 0.1;
    const zxid = `${this._currentTerm}-${this._counter}`;
    this._recordHistory(`zab(ensemble=${ensemble.length}) -> committed=${committed}`);
    return { committed, zxid, leader };
  }

  public viewstampedReplication(primaries: string[], backups: string[]): { view: number; primary: string; status: string } {
    const primary = primaries[0] ?? 'primary-0';
    const view = this._currentTerm;
    const status = backups.length >= Math.floor(primaries.length / 2) ? 'healthy' : 'degraded';
    this._recordHistory(`viewstampedReplication(backups=${backups.length}) -> status=${status}`);
    return { view, primary, status };
  }

  public quorum(nodes: string[], f: number): { size: number; byzantine: number; safe: boolean } {
    const size = Math.floor(2 * f) + 1;
    const byzantine = f;
    const safe = nodes.length >= size;
    this._recordHistory(`quorum(nodes=${nodes.length}, f=${f}) -> safe=${safe}`);
    return { size, byzantine, safe };
  }

  public byzantineAgreement(generals: string[], traitor: number, message: string): { agreement: boolean; loyal: number; traitors: number } {
    const loyal = generals.length - traitor;
    const agreement = loyal > (2 * generals.length) / 3;
    this._recordHistory(`byzantineAgreement(generals=${generals.length}, traitor=${traitor}) -> agreement=${agreement}`);
    return { agreement, loyal, traitors: traitor };
  }

  public pbft(nodes: string[], request: string, phases: number): { result: string; phase: string; replicas: number } {
    const faulty = Math.floor((nodes.length - 1) / 3);
    const phase = phases >= 3 ? 'commit' : phases >= 2 ? 'prepare' : 'pre-prepare';
    this._recordHistory(`pbft(nodes=${nodes.length}, faulty=${faulty}) -> phase=${phase}`);
    return { result: request, phase, replicas: nodes.length };
  }

  public tendermint(validators: string[], block: string, rounds: number): { committed: boolean; height: number; round: number } {
    const votingPower = validators.length;
    const committed = Math.random() > 0.1;
    const height = this._currentTerm;
    this._recordHistory(`tendermint(validators=${validators.length}, rounds=${rounds}) -> committed=${committed}`);
    return { committed, height, round: rounds };
  }

  public proofOfWork(puzzle: string, difficulty: number): { nonce: number; hash: string; work: number } {
    const target = '0'.repeat(difficulty);
    let nonce = 0;
    let hash = puzzle;
    for (let i = 0; i < 10000; i++) {
      hash = this._simpleHash(`${puzzle}${nonce}`);
      if (hash.startsWith(target)) break;
      nonce++;
    }
    this._recordHistory(`proofOfWork(difficulty=${difficulty}) -> nonce=${nonce}`);
    return { nonce, hash, work: difficulty };
  }

  public proofOfStake(validators: { id: string; stake: number }[], stake: number, epoch: number): { selected: string; probability: number; epoch: number } {
    const totalStake = validators.reduce((s, v) => s + v.stake, 0) + stake;
    const selectedIdx = Math.floor(Math.random() * validators.length);
    const selected = validators[selectedIdx]?.id ?? 'validator-0';
    const probability = stake / totalStake;
    this._recordHistory(`proofOfStake(validators=${validators.length}, epoch=${epoch}) -> ${selected}`);
    return { selected, probability, epoch };
  }

  public raftLeaderElection(nodes: string[], term: number): { leader: string; term: number; votes: Map<string, string> } {
    const votes = new Map<string, string>();
    const candidates = nodes.filter(() => Math.random() > 0.6);
    const candidate = candidates[Math.floor(Math.random() * candidates.length)] ?? nodes[0] ?? 'node-0';
    nodes.forEach(node => {
      if (Math.random() > 0.3) {
        votes.set(node, candidate);
      }
    });
    const majority = Math.floor(nodes.length / 2) + 1;
    const voteCount = Array.from(votes.values()).filter(v => v === candidate).length;
    const leader = voteCount >= majority ? candidate : nodes[0] ?? 'node-0';
    this._recordHistory(`raftLeaderElection(nodes=${nodes.length}, term=${term}) -> leader=${leader}, votes=${voteCount}`);
    return { leader, term, votes };
  }

  public raftLogAppend(leader: string, followers: string[], entries: { term: number; index: number; command: string }[]): {
    replicated: number;
    failed: number;
    commitIndex: number;
    leader: string;
  } {
    const quorum = Math.floor(followers.length / 2) + 1;
    const replicated = quorum + Math.floor(Math.random() * (followers.length - quorum + 1));
    const failed = followers.length - replicated;
    const commitIndex = entries.length > 0 ? entries[entries.length - 1].index : 0;
    this._recordHistory(`raftLogAppend(entries=${entries.length}, followers=${followers.length}) -> replicated=${replicated}, commitIndex=${commitIndex}`);
    return { replicated, failed, commitIndex, leader };
  }

  public raftMembershipChange(oldNodes: string[], newNodes: string[]): {
    jointConsensus: boolean;
    transitionPhase: string;
    newCluster: string[];
  } {
    const jointConsensus = true;
    const transitionPhase = 'joint-consensus';
    const newCluster = [...new Set([...oldNodes, ...newNodes])];
    this._recordHistory(`raftMembershipChange(old=${oldNodes.length}, new=${newNodes.length}) -> phase=${transitionPhase}`);
    return { jointConsensus, transitionPhase, newCluster };
  }

  public paxosPrepare(proposer: string, acceptors: string[], proposalNumber: number): {
    promises: string[];
    highestAccepted: { number: number; value: string | null } | null;
    prepareOk: boolean;
  } {
    const majority = Math.floor(acceptors.length / 2) + 1;
    const promiseCount = majority + Math.floor(Math.random() * (acceptors.length - majority + 1));
    const promises = acceptors.slice(0, promiseCount);
    const highestAccepted = Math.random() > 0.5
      ? { number: proposalNumber - 1, value: 'previous-value' }
      : null;
    const prepareOk = promises.length >= majority;
    this._recordHistory(`paxosPrepare(proposer=${proposer}, n=${proposalNumber}) -> promises=${promises.length}`);
    return { promises, highestAccepted, prepareOk };
  }

  public paxosAccept(proposer: string, acceptors: string[], proposalNumber: number, value: string): {
    accepted: string[];
    acceptOk: boolean;
    value: string;
  } {
    const majority = Math.floor(acceptors.length / 2) + 1;
    const acceptCount = majority + Math.floor(Math.random() * (acceptors.length - majority + 1));
    const accepted = acceptors.slice(0, acceptCount);
    const acceptOk = accepted.length >= majority;
    this._recordHistory(`paxosAccept(proposer=${proposer}, n=${proposalNumber}) -> accepted=${accepted.length}`);
    return { accepted, acceptOk, value };
  }

  public zabRecovery(ensemble: string[], history: { zxid: string; transaction: string }[]): {
    recovered: boolean;
    newLeader: string;
    latestZxid: string;
  } {
    const newLeader = ensemble[Math.floor(Math.random() * ensemble.length)] ?? 'leader-0';
    const latestZxid = history.length > 0 ? history[history.length - 1].zxid : '0-0';
    const recovered = Math.random() > 0.1;
    this._recordHistory(`zabRecovery(ensemble=${ensemble.length}, history=${history.length}) -> recovered=${recovered}`);
    return { recovered, newLeader, latestZxid };
  }

  public zabBroadcast(leader: string, followers: string[], transaction: string): {
    proposed: number;
    acked: number;
    committed: boolean;
    zxid: string;
  } {
    const quorum = Math.floor(followers.length / 2) + 1;
    const acked = quorum + Math.floor(Math.random() * (followers.length - quorum + 1));
    const committed = acked >= quorum;
    const zxid = `${this._currentTerm}-${this._counter}`;
    this._recordHistory(`zabBroadcast(leader=${leader}, followers=${followers.length}) -> committed=${committed}`);
    return { proposed: followers.length, acked, committed, zxid };
  }

  public pbftPrePrepare(primary: string, replicas: string[], view: number, sequence: number, request: string): {
    view: number;
    sequence: number;
    digest: string;
    primary: string;
  } {
    const digest = this._simpleHash(`${view}-${sequence}-${request}`);
    this._recordHistory(`pbftPrePrepare(primary=${primary}, view=${view}, seq=${sequence})`);
    return { view, sequence, digest, primary };
  }

  public pbftPrepare(replicas: string[], view: number, sequence: number, digest: string): {
    prepared: boolean;
    prepareCount: number;
    view: number;
  } {
    const faulty = Math.floor((replicas.length - 1) / 3);
    const prepareCount = replicas.length - faulty - 1;
    const prepared = prepareCount >= 2 * faulty;
    this._recordHistory(`pbftPrepare(replicas=${replicas.length}, view=${view}) -> prepared=${prepared}`);
    return { prepared, prepareCount, view };
  }

  public pbftCommit(replicas: string[], view: number, sequence: number): {
    committed: boolean;
    commitCount: number;
    view: number;
  } {
    const faulty = Math.floor((replicas.length - 1) / 3);
    const commitCount = replicas.length - faulty;
    const committed = commitCount >= 2 * faulty + 1;
    this._recordHistory(`pbftCommit(replicas=${replicas.length}, view=${view}) -> committed=${committed}`);
    return { committed, commitCount, view };
  }

  public delegatedProofOfStake(
    validators: { id: string; votes: number }[],
    delegates: number,
    epoch: number
  ): {
    selectedValidators: string[];
    delegateCount: number;
    epoch: number;
    totalVotes: number;
  } {
    const sorted = [...validators].sort((a, b) => b.votes - a.votes);
    const selectedValidators = sorted.slice(0, delegates).map(v => v.id);
    const totalVotes = validators.reduce((s, v) => s + v.votes, 0);
    this._recordHistory(`dpos(validators=${validators.length}, delegates=${delegates}, epoch=${epoch})`);
    return { selectedValidators, delegateCount: delegates, epoch, totalVotes };
  }

  public practicalBftFaultTolerance(nodes: number): {
    maxFaulty: number;
    requiredReplicas: number;
    safe: boolean;
  } {
    const maxFaulty = Math.floor((nodes - 1) / 3);
    const requiredReplicas = 3 * maxFaulty + 1;
    const safe = nodes >= requiredReplicas;
    this._recordHistory(`pbftFaultTolerance(nodes=${nodes}) -> maxFaulty=${maxFaulty}`);
    return { maxFaulty, requiredReplicas, safe };
  }

  public gossipConsensus(nodes: string[], value: string, rounds: number): {
    converged: boolean;
    agreeingNodes: number;
    rounds: number;
  } {
    let agreeing = 1;
    for (let i = 0; i < rounds; i++) {
      const newAgreeing = Math.floor(agreeing * (1 + Math.random() * 0.5));
      agreeing = Math.min(nodes.length, newAgreeing);
    }
    const converged = agreeing >= nodes.length * 0.95;
    this._recordHistory(`gossipConsensus(nodes=${nodes.length}, rounds=${rounds}) -> converged=${converged}`);
    return { converged, agreeingNodes: agreeing, rounds };
  }

  public toPacket(): DataPacket<{
    nodes: number;
    results: number;
    history: string[];
    currentTerm: number;
  }> {
    return {
      id: `consensus-algo-${Date.now()}-${this._counter}`,
      payload: {
        nodes: this._nodes.size,
        results: this._results.length,
        history: [...this._history],
        currentTerm: this._currentTerm,
      },
      metadata: {
        createdAt: Date.now(),
        route: ['distributed_systems', 'consensus', 'result'],
        priority: 0.85,
        phase: 'agreement',
      },
    };
  }

  public reset(): void {
    this._nodes.clear();
    this._results = [];
    this._history = [];
    this._counter = 0;
    this._currentTerm = 0;
  }

  private _simpleHash(s: string): string {
    let hash = 0;
    for (let i = 0; i < s.length; i++) {
      const chr = s.charCodeAt(i);
      hash = ((hash << 5) - hash) + chr;
      hash |= 0;
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }

  private _recordHistory(entry: string): void {
    this._counter++;
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
  }
}
