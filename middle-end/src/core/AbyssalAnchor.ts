export interface DeepDiveSession {
  id: string;
  depth: number;
  maxDepth: number;
  startedAt: number;
  isHappyPath: boolean;
  puzzlesInjected: number;
  status: 'diving' | 'surfacing' | 'completed';
}

export interface UnsolvedPuzzle {
  id: string;
  sessionId: string;
  complexity: number;
  content: string;
  injectedAt: number;
  attempts: number;
  solvable: boolean;
  entropy: number;
}

type DiveState = 'diving' | 'surfacing' | 'completed';

export class AbyssalAnchor {
  private _sessions: Map<string, DeepDiveSession> = new Map();
  private _puzzles: Map<string, UnsolvedPuzzle> = new Map();
  private _sessionPuzzles: Map<string, string[]> = new Map();
  private _sessionCounter = 0;
  private _transitions: Map<DiveState, Map<DiveState, number>> = new Map();
  private _entropyCache: Map<string, number[]> = new Map();

  constructor() {
    this._initTransitions();
  }

  get activeSessions(): number {
    return this._sessions.size;
  }

  get totalPuzzles(): number {
    return this._puzzles.size;
  }

  startDive(maxDepth: number = 100): DeepDiveSession {
    const session: DeepDiveSession = {
      id: `dive-${++this._sessionCounter}-${Date.now().toString(36)}`,
      depth: 0,
      maxDepth: Math.max(1, maxDepth),
      startedAt: Date.now(),
      isHappyPath: false,
      puzzlesInjected: 0,
      status: 'diving',
    };
    this._sessions.set(session.id, session);
    this._sessionPuzzles.set(session.id, []);
    this._entropyCache.set(session.id, [0]);
    return { ...session };
  }

  descend(sessionId: string, depthIncrement: number = 1): DeepDiveSession | null {
    const session = this._sessions.get(sessionId);
    if (!session || session.status !== 'diving') return null;
    const ratio = session.depth / session.maxDepth;
    const effective = depthIncrement * (Math.exp(-ratio * ratio * 2) * 0.6 + 0.4);
    session.depth = Math.min(session.maxDepth, session.depth + effective);
    const depthRatio = session.depth / session.maxDepth;
    const entropy = this._depthEntropy(depthRatio);
    const cache = this._entropyCache.get(sessionId) || [];
    cache.push(entropy);
    if (cache.length > 30) cache.shift();
    this._entropyCache.set(sessionId, cache);
    const happyProb = this._bayesianHappyPath(sessionId, depthRatio, entropy);
    if (happyProb > 0.75 && !session.isHappyPath) {
      session.isHappyPath = true;
      this._injectPuzzle(session);
    }
    if (session.depth >= session.maxDepth) {
      session.status = 'surfacing';
      this._updateTransitions('diving', 'surfacing');
    }
    return { ...session };
  }

  surface(sessionId: string): DeepDiveSession | null {
    const session = this._sessions.get(sessionId);
    if (!session) return null;
    if (session.status === 'diving') {
      session.status = 'surfacing';
      this._updateTransitions('diving', 'surfacing');
    }
    const ratio = session.depth / session.maxDepth;
    const ascendRate = Math.max(1, session.maxDepth * 0.1 * (1 + ratio * 1.5));
    session.depth = Math.max(0, session.depth - ascendRate);
    if (session.depth === 0) {
      session.status = 'completed';
      this._updateTransitions('surfacing', 'completed');
    }
    return { ...session };
  }

  injectPuzzle(sessionId: string, content: string, complexity: number = 1): UnsolvedPuzzle {
    const session = this._sessions.get(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);
    const entropy = this._puzzleEntropy(content, complexity);
    const depthRatio = session.depth / session.maxDepth;
    const solvable = complexity * 0.5 + entropy * 0.5 + depthRatio * 0.3 < 1.2;
    const puzzle: UnsolvedPuzzle = {
      id: `puzzle-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      sessionId,
      complexity: Math.max(0.1, Math.min(10, complexity)),
      content,
      injectedAt: Date.now(),
      attempts: 0,
      solvable,
      entropy,
    };
    this._puzzles.set(puzzle.id, puzzle);
    session.puzzlesInjected++;
    const list = this._sessionPuzzles.get(sessionId) || [];
    list.push(puzzle.id);
    this._sessionPuzzles.set(sessionId, list);
    return { ...puzzle };
  }

  attemptPuzzle(puzzleId: string): boolean {
    const puzzle = this._puzzles.get(puzzleId);
    if (!puzzle) return false;
    puzzle.attempts++;
    if (!puzzle.solvable) return false;
    const base = 0.3;
    const entropyBonus = (1 - puzzle.entropy) * 0.4;
    const complexityPenalty = (puzzle.complexity / 10) * 0.3;
    const attemptBonus = Math.min(0.3, puzzle.attempts * 0.05);
    const prob = Math.max(0.05, Math.min(0.95, base + entropyBonus - complexityPenalty + attemptBonus));
    const success = Math.random() < prob;
    if (success) {
      this._puzzles.delete(puzzleId);
      const list = this._sessionPuzzles.get(puzzle.sessionId) || [];
      const idx = list.indexOf(puzzleId);
      if (idx > -1) list.splice(idx, 1);
      this._sessionPuzzles.set(puzzle.sessionId, list);
    }
    return success;
  }

  getSession(sessionId: string): DeepDiveSession | undefined {
    const s = this._sessions.get(sessionId);
    return s ? { ...s } : undefined;
  }

  getSessionPuzzles(sessionId: string): UnsolvedPuzzle[] {
    const ids = this._sessionPuzzles.get(sessionId) || [];
    return ids.map(id => this._puzzles.get(id)).filter(Boolean).map(p => ({ ...p! }));
  }

  getEntropyHistory(sessionId: string): number[] {
    return [...(this._entropyCache.get(sessionId) || [])];
  }

  private _initTransitions(): void {
    const states: DiveState[] = ['diving', 'surfacing', 'completed'];
    for (const from of states) {
      const row = new Map<DiveState, number>();
      for (const to of states) row.set(to, from === to ? 1 : 0);
      this._transitions.set(from, row);
    }
    this._transitions.get('diving')!.set('diving', 0.85);
    this._transitions.get('diving')!.set('surfacing', 0.15);
    this._transitions.get('surfacing')!.set('surfacing', 0.7);
    this._transitions.get('surfacing')!.set('completed', 0.3);
  }

  private _updateTransitions(from: DiveState, to: DiveState): void {
    const row = this._transitions.get(from);
    if (!row) return;
    const alpha = 0.05;
    for (const [key] of row) {
      const current = row.get(key)!;
      row.set(key, key === to ? current + alpha * (1 - current) : current * (1 - alpha));
    }
  }

  private _depthEntropy(ratio: number): number {
    const bins = 8;
    const dist: number[] = [];
    for (let i = 0; i < bins; i++) {
      const center = (i + 0.5) / bins;
      dist.push(Math.exp(-Math.abs(ratio - center) * Math.abs(ratio - center) * 12));
    }
    const sum = dist.reduce((a, b) => a + b, 0);
    const norm = dist.map(d => d / sum);
    let entropy = 0;
    for (const p of norm) if (p > 0) entropy -= p * Math.log2(p);
    return entropy / Math.log2(bins);
  }

  private _bayesianHappyPath(sessionId: string, depthRatio: number, entropy: number): number {
    const prior = 0.3;
    const depthL = 1 - Math.exp(-depthRatio * 3);
    const entropyL = entropy > 0.6 ? 0.8 : 0.3;
    const puzzleCount = (this._sessionPuzzles.get(sessionId) || []).length;
    const puzzleL = Math.min(1, puzzleCount * 0.25);
    const num = prior * depthL * entropyL * puzzleL;
    const den = num + (1 - prior) * 0.1;
    return den > 0 ? num / den : 0;
  }

  private _injectPuzzle(session: DeepDiveSession): void {
    const content = `abyssal-puzzle-${session.id}-${session.puzzlesInjected}`;
    const complexity = 1 + (session.depth / session.maxDepth) * 4;
    this.injectPuzzle(session.id, content, complexity);
  }

  private _puzzleEntropy(content: string, complexity: number): number {
    const freq: Record<string, number> = {};
    for (const ch of content) freq[ch] = (freq[ch] || 0) + 1;
    const len = content.length;
    let charEnt = 0;
    for (const ch in freq) {
      const p = freq[ch] / len;
      if (p > 0) charEnt -= p * Math.log2(p);
    }
    const maxEnt = Math.log2(Math.min(256, new Set(content).size || 1));
    const normChar = maxEnt > 0 ? charEnt / maxEnt : 0;
    const compFactor = Math.min(1, complexity / 5);
    return normChar * 0.6 + compFactor * 0.4;
  }
}
