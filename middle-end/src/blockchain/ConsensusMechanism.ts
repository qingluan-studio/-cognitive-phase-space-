import { DataPacket } from '../shared/types';

/** A consensus algorithm specification. */
export interface Consensus {
  readonly type: 'PoW' | 'PoS' | 'DPoS' | 'PBFT' | 'Raft' | 'Tendermint' | 'Avalanche' | 'Nakamoto';
  readonly participants: number;
  readonly threshold: number;
  readonly byzantine: number;
}

/** A network validator with stake and reputation. */
export interface Validator {
  readonly node: string;
  readonly stake: number;
  readonly reputation: number;
  readonly active: boolean;
}

/** A block in the chain. */
export interface Block {
  readonly hash: string;
  readonly prev: string;
  readonly transactions: string[];
  readonly validator: string;
  readonly height: number;
  readonly timestamp: number;
}

/** Result of a finalization attempt. */
export interface FinalizationResult {
  readonly finalized: boolean;
  readonly hash: string;
  readonly validators: number;
  readonly signatures: number;
}

export class ConsensusMechanism {
  private _consensus: Map<string, Consensus> = new Map();
  private _validators: Validator[] = [];
  private _blocks: Block[] = [];
  private _history: string[] = [];
  private _counter = 0;

  get consensusCount(): number {
    return this._consensus.size;
  }

  get validatorCount(): number {
    return this._validators.length;
  }

  get blockCount(): number {
    return this._blocks.length;
  }

  get history(): string[] {
    return [...this._history];
  }

  public pow(nonce: number, difficulty: number, hash: string): { valid: boolean; nonce: number; hash: string; work: number } {
    let valid = false;
    let currentNonce = nonce;
    const target = '0'.repeat(difficulty);
    let attemptHash = hash;
    for (let i = 0; i < 1000; i++) {
      attemptHash = this._hashString(`${hash}${currentNonce}`);
      if (attemptHash.startsWith(target)) {
        valid = true;
        break;
      }
      currentNonce++;
    }
    this._recordHistory(`pow(difficulty=${difficulty}) -> valid=${valid}`);
    return { valid, nonce: currentNonce, hash: attemptHash, work: difficulty };
  }

  public pos(validator: Validator, stake: number): { selected: boolean; probability: number; stake: number } {
    const totalStake = this._validators.reduce((s, v) => s + v.stake, 0) + stake;
    const probability = stake / totalStake;
    const selected = Math.random() < probability;
    this._recordHistory(`pos(stake=${stake}) -> selected=${selected}`);
    return { selected, probability, stake };
  }

  public dpos(delegates: string[], votes: number[]): { elected: string[]; totalVotes: number; delegates: number } {
    const ranked = delegates
      .map((d, i) => ({ delegate: d, votes: votes[i] ?? 0 }))
      .sort((a, b) => b.votes - a.votes);
    const elected = ranked.slice(0, Math.min(21, delegates.length)).map(r => r.delegate);
    const totalVotes = votes.reduce((s, v) => s + v, 0);
    this._recordHistory(`dpos(delegates=${delegates.length})`);
    return { elected, totalVotes, delegates: elected.length };
  }

  public pbft(nodes: number, faulty: number): { safe: boolean; tolerance: number; quorum: number } {
    const tolerance = Math.floor((nodes - 1) / 3);
    const safe = faulty <= tolerance;
    const quorum = Math.floor((2 * nodes) / 3) + 1;
    this._recordHistory(`pbft(nodes=${nodes}, faulty=${faulty}) -> safe=${safe}`);
    return { safe, tolerance, quorum };
  }

  public raft(term: number, leader: string, log: string[]): { committed: number; term: number; leader: string } {
    const committed = log.length;
    this._recordHistory(`raft(term=${term}, leader=${leader})`);
    return { committed, term, leader };
  }

  public tendermint(round: number, proposer: string, votes: number): { decided: boolean; round: number; proposer: string; votes: number } {
    const decided = votes >= Math.floor(2 / 3) + 1;
    this._recordHistory(`tendermint(round=${round}, votes=${votes})`);
    return { decided, round, proposer, votes };
  }

  public avalanche(nodes: number, subnets: number, confidence: number): { accepted: boolean; confidence: number; subnets: number } {
    const accepted = confidence > 0.8;
    this._recordHistory(`avalanche(nodes=${nodes}, conf=${confidence.toFixed(3)})`);
    return { accepted, confidence, subnets };
  }

  public nakamoto(block: Block, chain: Block[]): { valid: boolean; length: number; longest: boolean } {
    const longest = chain.length > 0 ? block.height > chain[chain.length - 1].height : true;
    const valid = block.prev === (chain[chain.length - 1]?.hash ?? '0');
    this._recordHistory(`nakamoto(height=${block.height}) -> valid=${valid}`);
    return { valid, length: chain.length + 1, longest };
  }

  public byzantineGenerals(n: number, f: number): { consensus: boolean; loyal: number; traitors: number } {
    const loyal = n - f;
    const consensus = f < Math.floor(n / 3);
    this._recordHistory(`byzantine(n=${n}, f=${f}) -> consensus=${consensus}`);
    return { consensus, loyal, traitors: f };
  }

  public pBFT(prePrepare: Block, prepare: number, commit: number): { final: boolean; prePrepare: Block; prepares: number; commits: number } {
    const final = prepare >= Math.floor(2 / 3) && commit >= Math.floor(2 / 3);
    this._recordHistory(`pBFT(commits=${commit}) -> final=${final}`);
    return { final, prePrepare, prepares: prepare, commits: commit };
  }

  public finalizeBlock(consensus: Consensus, block: Block): FinalizationResult {
    const signatures = Math.floor(consensus.participants * consensus.threshold);
    const finalized = signatures >= Math.floor(consensus.participants * consensus.threshold);
    if (finalized) {
      this._blocks.push(block);
    }
    this._recordHistory(`finalizeBlock(height=${block.height}) -> finalized=${finalized}`);
    return { finalized, hash: block.hash, validators: consensus.participants, signatures };
  }

  public forkChoice(blocks: Block[]): { canonical: Block; orphans: number; total: number } {
    const canonical = blocks.reduce((max, b) => (b.height > max.height ? b : max), blocks[0]);
    const orphans = blocks.length - 1;
    this._recordHistory(`forkChoice(blocks=${blocks.length})`);
    return { canonical, orphans, total: blocks.length };
  }

  public reorg(chain1: Block[], chain2: Block[]): { reorged: boolean; newHead: Block; depth: number } {
    const longer = chain1.length >= chain2.length ? chain1 : chain2;
    const reorged = chain1.length !== chain2.length;
    const newHead = longer[longer.length - 1] ?? chain1[0];
    const depth = Math.abs(chain1.length - chain2.length);
    this._recordHistory(`reorg(depth=${depth}) -> reorged=${reorged}`);
    return { reorged, newHead, depth };
  }

  public registerValidator(validator: Validator): void {
    this._validators.push({ ...validator });
  }

  public validators(): Validator[] {
    return this._validators.map(v => ({ ...v }));
  }

  public lastBlock(): Block | null {
    return this._blocks.length > 0 ? { ...this._blocks[this._blocks.length - 1], transactions: [...this._blocks[this._blocks.length - 1].transactions] } : null;
  }

  public summary(): { consensus: number; validators: number; blocks: number; historyLength: number; counter: number } {
    return {
      consensus: this._consensus.size,
      validators: this._validators.length,
      blocks: this._blocks.length,
      historyLength: this._history.length,
      counter: this._counter,
    };
  }

  public toJSON(): Record<string, unknown> {
    return {
      consensus: this._consensus.size,
      validators: this._validators.length,
      blocks: this._blocks.length,
      history: [...this._history],
      validatorStakes: this._validators.map(v => ({ node: v.node, stake: v.stake })),
    };
  }

  public validate(): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    for (const v of this._validators) {
      if (v.stake < 0) issues.push(`validator ${v.node}: negative stake`);
      if (v.reputation < 0 || v.reputation > 1) issues.push(`validator ${v.node}: reputation out of [0,1]`);
    }
    for (const b of this._blocks) {
      if (b.height < 0) issues.push(`block ${b.hash}: negative height`);
    }
    for (const c of this._consensus.values()) {
      if (c.threshold <= 0 || c.threshold > 1) issues.push(`${c.type}: threshold out of (0,1]`);
      if (c.byzantine > Math.floor((c.participants - 1) / 3)) {
        issues.push(`${c.type}: byzantine count exceeds tolerance`);
      }
    }
    return { valid: issues.length === 0, issues };
  }

  public consensusComparison(types: Consensus['type'][]): {
    byThroughput: { type: string; throughput: number }[];
    byFinality: { type: string; finalityMs: number }[];
  } {
    const profiles: Record<Consensus['type'], { throughput: number; finalityMs: number }> = {
      PoW: { throughput: 7, finalityMs: 60000 },
      PoS: { throughput: 100, finalityMs: 12000 },
      DPoS: { throughput: 1000, finalityMs: 3000 },
      PBFT: { throughput: 1000, finalityMs: 1000 },
      Raft: { throughput: 5000, finalityMs: 500 },
      Tendermint: { throughput: 4000, finalityMs: 1000 },
      Avalanche: { throughput: 4500, finalityMs: 1300 },
      Nakamoto: { throughput: 7, finalityMs: 60000 },
    };
    return {
      byThroughput: types.map(t => ({ type: t, throughput: profiles[t]?.throughput ?? 0 })).sort((a, b) => b.throughput - a.throughput),
      byFinality: types.map(t => ({ type: t, finalityMs: profiles[t]?.finalityMs ?? Infinity })).sort((a, b) => a.finalityMs - b.finalityMs),
    };
  }

  public validatorSelection(seed: number, count: number): { selected: Validator[]; totalStake: number } {
    const sorted = [...this._validators].sort((a, b) => b.stake - a.stake);
    const startIdx = seed % Math.max(1, sorted.length);
    const selected: Validator[] = [];
    for (let i = 0; i < Math.min(count, sorted.length); i++) {
      selected.push(sorted[(startIdx + i) % sorted.length]);
    }
    return { selected, totalStake: selected.reduce((s, v) => s + v.stake, 0) };
  }

  public slashing(validator: Validator, offense: 'double-sign' | 'downtime' | 'invalid'): { slashed: boolean; amount: number; reason: string } {
    const penalties = { 'double-sign': 1.0, downtime: 0.1, invalid: 0.5 };
    const amount = validator.stake * penalties[offense];
    this._recordHistory(`slashing(${validator.node}, ${offense}) -> ${amount}`);
    return { slashed: true, amount, reason: offense };
  }

  public blocks(): Block[] {
    return this._blocks.map(b => ({ ...b, transactions: [...b.transactions] }));
  }

  private _hashString(s: string): string {
    let hash = 0;
    for (let i = 0; i < s.length; i++) {
      const chr = s.charCodeAt(i);
      hash = ((hash << 5) - hash) + chr;
      hash |= 0;
    }
    return Math.abs(hash).toString(16).padStart(difficulty_prefix(s.length), '0');
  }

  private _recordHistory(entry: string): void {
    this._counter++;
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
  }

  public toPacket(): DataPacket<{
    consensus: number;
    validators: number;
    blocks: number;
    history: string[];
  }> {
    return {
      id: `consensus-${Date.now()}-${this._counter}`,
      payload: {
        consensus: this._consensus.size,
        validators: this._validators.length,
        blocks: this._blocks.length,
        history: [...this._history],
      },
      metadata: {
        createdAt: Date.now(),
        route: ['blockchain', 'consensus', 'result'],
        priority: 0.9,
        phase: 'agreement',
      },
    };
  }

  public reset(): void {
    this._consensus.clear();
    this._validators = [];
    this._blocks = [];
    this._history = [];
    this._counter = 0;
  }
}

function difficulty_prefix(len: number): number {
  return Math.min(8, Math.max(1, Math.floor(len / 8)));
}
