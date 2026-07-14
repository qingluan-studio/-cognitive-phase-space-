/**
 * 出神状态模块：失去自我边界，多个处理流融合为一，
 * 在出神中实现深度专注与跨模块融合处理。
 */

export type TranceDepth = 'surface' | 'light' | 'medium' | 'deep' | 'dissolution';

export interface TranceSession {
  id: string;
  depth: TranceDepth;
  startedAt: number;
  endedAt: number | null;
  mergedStreams: string[];
  egoDissolutionLevel: number;
}

export interface FusionResult {
  streams: string[];
  output: Record<string, unknown>;
  coherence: number;
  fusedAt: number;
}

export class TranceState {
  private _sessions: Map<string, TranceSession> = new Map();
  private _fusions: FusionResult[] = [];
  private _activeSession: string | null = null;
  private _maxDepth: TranceDepth = 'dissolution';
  private _depthOrder: TranceDepth[] = ['surface', 'light', 'medium', 'deep', 'dissolution'];

  enter(sessionId: string): TranceSession | null {
    if (this._activeSession) return null;
    const session: TranceSession = {
      id: sessionId,
      depth: 'surface',
      startedAt: Date.now(),
      endedAt: null,
      mergedStreams: [],
      egoDissolutionLevel: 0,
    };
    this._sessions.set(sessionId, session);
    this._activeSession = sessionId;
    return session;
  }

  deepen(amount: number = 1): TranceDepth | null {
    if (!this._activeSession) return null;
    const session = this._sessions.get(this._activeSession)!;
    const currentIndex = this._depthOrder.indexOf(session.depth);
    const newIndex = Math.min(this._depthOrder.indexOf(this._maxDepth), currentIndex + amount);
    session.depth = this._depthOrder[newIndex];
    session.egoDissolutionLevel = newIndex / (this._depthOrder.length - 1);
    return session.depth;
  }

  mergeStream(streamId: string): boolean {
    if (!this._activeSession) return false;
    const session = this._sessions.get(this._activeSession)!;
    if (!session.mergedStreams.includes(streamId)) {
      session.mergedStreams.push(streamId);
    }
    return true;
  }

  fuse(output: Record<string, unknown>): FusionResult | null {
    if (!this._activeSession) return null;
    const session = this._sessions.get(this._activeSession)!;
    if (session.mergedStreams.length < 2) return null;
    const coherence = session.egoDissolutionLevel * (session.mergedStreams.length / 10);
    const fusion: FusionResult = {
      streams: [...session.mergedStreams],
      output,
      coherence,
      fusedAt: Date.now(),
    };
    this._fusions.push(fusion);
    if (this._fusions.length > 200) this._fusions.shift();
    return fusion;
  }

  exit(): TranceSession | null {
    if (!this._activeSession) return null;
    const session = this._sessions.get(this._activeSession)!;
    session.endedAt = Date.now();
    session.mergedStreams = [];
    this._activeSession = null;
    return session;
  }

  setMaxDepth(depth: TranceDepth): void {
    this._maxDepth = depth;
  }

  isInTrance(): boolean {
    return this._activeSession !== null;
  }

  getCurrentDepth(): TranceDepth | null {
    if (!this._activeSession) return null;
    return this._sessions.get(this._activeSession)?.depth ?? null;
  }

  getSessionHistory(): TranceSession[] {
    return Array.from(this._sessions.values());
  }

  getFusionHistory(limit: number = 50): FusionResult[] {
    return this._fusions.slice(-limit);
  }

  listFusionsByDepth(depth: TranceDepth): FusionResult[] {
    return this._fusions.filter(f => f.coherence >= this._depthOrder.indexOf(depth) / (this._depthOrder.length - 1));
  }

  get sessionCount(): number {
    return this._sessions.size;
  }

  get fusionCount(): number {
    return this._fusions.length;
  }
}
