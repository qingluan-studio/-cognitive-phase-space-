export type ProtocolPhase = 'propose' | 'prepare' | 'promise' | 'accept' | 'commit' | 'abort';

export interface ProtocolMessage {
  id: string;
  from: string;
  to: string;
  phase: ProtocolPhase;
  proposalNumber: number;
  value: string;
  timestamp: number;
}

export interface ConsensusRound {
  roundId: number;
  proposalNumber: number;
  phase: ProtocolPhase;
  quorumSize: number;
  messages: ProtocolMessage[];
  decided: boolean;
  decisionValue: string | null;
}

export class GhostProtocol {
  private _rounds: ConsensusRound[] = [];
  private _messages: ProtocolMessage[] = [];
  private _nextRoundId: number = 0;
  private _nodes: Set<string> = new Set();
  private _state: Record<string, unknown> = {};
  private _byzantineNodes: Set<string> = new Set();
  private _faultTolerance: number = 0;
  private _commitLatencyHistory: number[] = [];

  get roundCount(): number {
    return this._rounds.length;
  }

  get faultTolerance(): number {
    return this._faultTolerance;
  }

  registerNode(nodeId: string, isByzantine: boolean = false): void {
    this._nodes.add(nodeId);
    if (isByzantine) this._byzantineNodes.add(nodeId);
    this._faultTolerance = Math.floor((this._nodes.size - 1) / 3);
  }

  startRound(proposalNumber: number, proposer: string, value: string): ConsensusRound | null {
    if (!this._nodes.has(proposer)) return null;
    const quorumSize = Math.floor((2 * this._nodes.size) / 3) + 1;
    const round: ConsensusRound = {
      roundId: this._nextRoundId++,
      proposalNumber,
      phase: 'propose',
      quorumSize,
      messages: [],
      decided: false,
      decisionValue: null,
    };
    this._rounds.push(round);
    this._broadcast(round, proposer, 'propose', proposalNumber, value);
    return round;
  }

  private _broadcast(round: ConsensusRound, from: string, phase: ProtocolPhase, proposalNumber: number, value: string): void {
    for (const node of this._nodes) {
      if (node === from) continue;
      const message: ProtocolMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        from,
        to: node,
        phase,
        proposalNumber,
        value,
        timestamp: Date.now(),
      };
      this._messages.push(message);
      round.messages.push(message);
      if (this._messages.length > 300) this._messages.shift();
    }
  }

  handlePromise(roundId: number, nodeId: string): boolean {
    const round = this._rounds.find(r => r.roundId === roundId);
    if (!round) return false;
    const promises = round.messages.filter(m => m.phase === 'promise' && m.to === nodeId);
    if (promises.length + 1 >= round.quorumSize) {
      round.phase = 'accept';
      this._broadcast(round, nodeId, 'accept', round.proposalNumber, round.messages[0]?.value ?? '');
    }
    return true;
  }

  handleAccepted(roundId: number, nodeId: string): boolean {
    const round = this._rounds.find(r => r.roundId === roundId);
    if (!round) return false;
    const accepts = round.messages.filter(m => m.phase === 'accept');
    if (accepts.length >= round.quorumSize && !round.decided) {
      round.decided = true;
      round.decisionValue = round.messages[0]?.value ?? null;
      round.phase = 'commit';
      const startTime = round.messages[0]?.timestamp ?? Date.now();
      this._commitLatencyHistory.push(Date.now() - startTime);
      if (this._commitLatencyHistory.length > 50) this._commitLatencyHistory.shift();
    }
    return true;
  }

  getRound(roundId: number): ConsensusRound | null {
    return this._rounds.find(r => r.roundId === roundId) ?? null;
  }

  getMessagesForRound(roundId: number): ProtocolMessage[] {
    const round = this._rounds.find(r => r.roundId === roundId);
    return round ? round.messages : [];
  }

  decidedRounds(): ConsensusRound[] {
    return this._rounds.filter(r => r.decided);
  }

  averageCommitLatency(): number {
    if (this._commitLatencyHistory.length === 0) return 0;
    return this._commitLatencyHistory.reduce((a, b) => a + b, 0) / this._commitLatencyHistory.length;
  }

  messageCount(): number {
    return this._messages.length;
  }

  messagesByPhase(phase: ProtocolPhase): ProtocolMessage[] {
    return this._messages.filter(m => m.phase === phase);
  }

  isQuorumPossible(): boolean {
    const honestNodes = this._nodes.size - this._byzantineNodes.size;
    return honestNodes > (2 * this._nodes.size) / 3;
  }

  computeNetworkLoad(): number {
    return this._messages.length / (this._nodes.size + 1);
  }

  getConsensusRate(): number {
    if (this._rounds.length === 0) return 0;
    return this.decidedRounds().length / this._rounds.length;
  }

  reset(): void {
    this._rounds = [];
    this._messages = [];
    this._nextRoundId = 0;
    this._commitLatencyHistory = [];
  }

  protocolReport(): Record<string, unknown> {
    return {
      nodeCount: this._nodes.size,
      byzantineCount: this._byzantineNodes.size,
      roundCount: this._rounds.length,
      decidedCount: this.decidedRounds().length,
      messageCount: this._messages.length,
      faultTolerance: this._faultTolerance,
      averageCommitLatency: this.averageCommitLatency().toFixed(2),
      consensusRate: this.getConsensusRate().toFixed(4),
      quorumPossible: this.isQuorumPossible(),
      networkLoad: this.computeNetworkLoad().toFixed(2),
      state: this._state,
    };
  }
}
