export interface DeepDiveSession {
export interface DeepDiveSession {
  id: string;
  depth: number;
  maxDepth: number;
  startedexport interface DeepDiveSession {
  id: string;
  depth: number;
  maxDepth: number;
  startedAt: number;
  isHappyPath: boolean;
  puzzlesInjected: number;export interface DeepDiveSession {
  id: string;
  depth: number;
  maxDepth: number;
  startedAt: number;
  isHappyPath: boolean;
  puzzlesInjected: number;
  status: 'diving' | 'surfacing' | 'completed';
}export interface DeepDiveSession {
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
  sessionId: stringexport interface DeepDiveSession {
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
  contentexport interface DeepDiveSession {
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
  injectedAt: number;export interface DeepDiveSession {
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
  solvableexport interface DeepDiveSession {
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
}

export class Abysexport interface DeepDiveSession {
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
}

export class AbyssalAnchor {
  private _sessions: Map<string, DeepDiveSession> = newexport interface DeepDiveSession {
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
}

export class AbyssalAnchor {
  private _sessions: Map<string, DeepDiveSession> = new Map();
  private _puzzles: UnsolvedPuzzle[] = [];
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
}

export class AbyssalAnchor {
  private _sessions: Map<string, DeepDiveSession> = new Map();
  private _puzzles: UnsolvedPuzzle[] = [];
  private _sessionCounter = 0;

  startDive(maxDepth: number = 1export interface DeepDiveSession {
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
}

export class AbyssalAnchor {
  private _sessions: Map<string, DeepDiveSession> = new Map();
  private _puzzles: UnsolvedPuzzle[] = [];
  private _sessionCounter = 0;

  startDive(maxDepth: number = 100): DeepDiveSession {
    const session: DeepDiveSession = {
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
}

export class AbyssalAnchor {
  private _sessions: Map<string, DeepDiveSession> = new Map();
  private _puzzles: UnsolvedPuzzle[] = [];
  private _sessionCounter = 0;

  startDive(maxDepth: number = 100): DeepDiveSession {
    const session: DeepDiveSession = {
      id: `dive-${++this._sessionCounter}-${Date.now()}`,
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
}

export class AbyssalAnchor {
  private _sessions: Map<string, DeepDiveSession> = new Map();
  private _puzzles: UnsolvedPuzzle[] = [];
  private _sessionCounter = 0;

  startDive(maxDepth: number = 100): DeepDiveSession {
    const session: DeepDiveSession = {
      id: `dive-${++this._sessionCounter}-${Date.now()}`,
      depth: 0,
      maxDepth,
      startedAt: Date.now(),
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
}

export class AbyssalAnchor {
  private _sessions: Map<string, DeepDiveSession> = new Map();
  private _puzzles: UnsolvedPuzzle[] = [];
  private _sessionCounter = 0;

  startDive(maxDepth: number = 100): DeepDiveSession {
    const session: DeepDiveSession = {
      id: `dive-${++this._sessionCounter}-${Date.now()}`,
      depth: 0,
      maxDepth,
      startedAt: Date.now(),
      isHappyPath: false,
      puzzlesInjected: 0,
      status: 'export interface DeepDiveSession {
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
}

export class AbyssalAnchor {
  private _sessions: Map<string, DeepDiveSession> = new Map();
  private _puzzles: UnsolvedPuzzle[] = [];
  private _sessionCounter = 0;

  startDive(maxDepth: number = 100): DeepDiveSession {
    const session: DeepDiveSession = {
      id: `dive-${++this._sessionCounter}-${Date.now()}`,
      depth: 0,
      maxDepth,
      startedAt: Date.now(),
      isHappyPath: false,
      puzzlesInjected: 0,
      status: 'diving',
    };
    this._sessions.set(session.id, session);
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
}

export class AbyssalAnchor {
  private _sessions: Map<string, DeepDiveSession> = new Map();
  private _puzzles: UnsolvedPuzzle[] = [];
  private _sessionCounter = 0;

  startDive(maxDepth: number = 100): DeepDiveSession {
    const session: DeepDiveSession = {
      id: `dive-${++this._sessionCounter}-${Date.now()}`,
      depth: 0,
      maxDepth,
      startedAt: Date.now(),
      isHappyPath: false,
      puzzlesInjected: 0,
      status: 'diving',
    };
    this._sessions.set(session.id, session);
    return session;
  }

  descend(sessionId: string, depthIncrement: number =export interface DeepDiveSession {
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
}

export class AbyssalAnchor {
  private _sessions: Map<string, DeepDiveSession> = new Map();
  private _puzzles: UnsolvedPuzzle[] = [];
  private _sessionCounter = 0;

  startDive(maxDepth: number = 100): DeepDiveSession {
    const session: DeepDiveSession = {
      id: `dive-${++this._sessionCounter}-${Date.now()}`,
      depth: 0,
      maxDepth,
      startedAt: Date.now(),
      isHappyPath: false,
      puzzlesInjected: 0,
      status: 'diving',
    };
    this._sessions.set(session.id, session);
    return session;
  }

  descend(sessionId: string, depthIncrement: number = 1): DeepDiveSession | null {
    const session = this._sessions.get(sessionexport interface DeepDiveSession {
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
}

export class AbyssalAnchor {
  private _sessions: Map<string, DeepDiveSession> = new Map();
  private _puzzles: UnsolvedPuzzle[] = [];
  private _sessionCounter = 0;

  startDive(maxDepth: number = 100): DeepDiveSession {
    const session: DeepDiveSession = {
      id: `dive-${++this._sessionCounter}-${Date.now()}`,
      depth: 0,
      maxDepth,
      startedAt: Date.now(),
      isHappyPath: false,
      puzzlesInjected: 0,
      status: 'diving',
    };
    this._sessions.set(session.id, session);
    return session;
  }

  descend(sessionId: string, depthIncrement: number = 1): DeepDiveSession | null {
    const session = this._sessions.get(sessionId);
    if (!session || session.status !== 'diving') return null;

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
}

export class AbyssalAnchor {
  private _sessions: Map<string, DeepDiveSession> = new Map();
  private _puzzles: UnsolvedPuzzle[] = [];
  private _sessionCounter = 0;

  startDive(maxDepth: number = 100): DeepDiveSession {
    const session: DeepDiveSession = {
      id: `dive-${++this._sessionCounter}-${Date.now()}`,
      depth: 0,
      maxDepth,
      startedAt: Date.now(),
      isHappyPath: false,
      puzzlesInjected: 0,
      status: 'diving',
    };
    this._sessions.set(session.id, session);
    return session;
  }

  descend(sessionId: string, depthIncrement: number = 1): DeepDiveSession | null {
    const session = this._sessions.get(sessionId);
    if (!session || session.status !== 'diving') return null;

    session.depth = Math.min(session.maxDepth, session.depth + depthIncrement);

    ifexport interface DeepDiveSession {
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
}

export class AbyssalAnchor {
  private _sessions: Map<string, DeepDiveSession> = new Map();
  private _puzzles: UnsolvedPuzzle[] = [];
  private _sessionCounter = 0;

  startDive(maxDepth: number = 100): DeepDiveSession {
    const session: DeepDiveSession = {
      id: `dive-${++this._sessionCounter}-${Date.now()}`,
      depth: 0,
      maxDepth,
      startedAt: Date.now(),
      isHappyPath: false,
      puzzlesInjected: 0,
      status: 'diving',
    };
    this._sessions.set(session.id, session);
    return session;
  }

  descend(sessionId: string, depthIncrement: number = 1): DeepDiveSession | null {
    const session = this._sessions.get(sessionId);
    if (!session || session.status !== 'diving') return null;

    session.depth = Math.min(session.maxDepth, session.depth + depthIncrement);

    if (this._detectHappyPath(session)) {
      session.isHappyPath = true;
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
}

export class AbyssalAnchor {
  private _sessions: Map<string, DeepDiveSession> = new Map();
  private _puzzles: UnsolvedPuzzle[] = [];
  private _sessionCounter = 0;

  startDive(maxDepth: number = 100): DeepDiveSession {
    const session: DeepDiveSession = {
      id: `dive-${++this._sessionCounter}-${Date.now()}`,
      depth: 0,
      maxDepth,
      startedAt: Date.now(),
      isHappyPath: false,
      puzzlesInjected: 0,
      status: 'diving',
    };
    this._sessions.set(session.id, session);
    return session;
  }

  descend(sessionId: string, depthIncrement: number = 1): DeepDiveSession | null {
    const session = this._sessions.get(sessionId);
    if (!session || session.status !== 'diving') return null;

    session.depth = Math.min(session.maxDepth, session.depth + depthIncrement);

    if (this._detectHappyPath(session)) {
      session.isHappyPath = true;
      this._injectPuzzle(session);
    }

    return session;
  }

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
}

export class AbyssalAnchor {
  private _sessions: Map<string, DeepDiveSession> = new Map();
  private _puzzles: UnsolvedPuzzle[] = [];
  private _sessionCounter = 0;

  startDive(maxDepth: number = 100): DeepDiveSession {
    const session: DeepDiveSession = {
      id: `dive-${++this._sessionCounter}-${Date.now()}`,
      depth: 0,
      maxDepth,
      startedAt: Date.now(),
      isHappyPath: false,
      puzzlesInjected: 0,
      status: 'diving',
    };
    this._sessions.set(session.id, session);
    return session;
  }

  descend(sessionId: string, depthIncrement: number = 1): DeepDiveSession | null {
    const session = this._sessions.get(sessionId);
    if (!session || session.status !== 'diving') return null;

    session.depth = Math.min(session.maxDepth, session.depth + depthIncrement);

    if (this._detectHappyPath(session)) {
      session.isHappyPath = true;
      this._injectPuzzle(session);
    }

    return session;
  }

  surface(sessionId: string): DeepDiveSession | null {
    const session = thisexport interface DeepDiveSession {
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
}

export class AbyssalAnchor {
  private _sessions: Map<string, DeepDiveSession> = new Map();
  private _puzzles: UnsolvedPuzzle[] = [];
  private _sessionCounter = 0;

  startDive(maxDepth: number = 100): DeepDiveSession {
    const session: DeepDiveSession = {
      id: `dive-${++this._sessionCounter}-${Date.now()}`,
      depth: 0,
      maxDepth,
      startedAt: Date.now(),
      isHappyPath: false,
      puzzlesInjected: 0,
      status: 'diving',
    };
    this._sessions.set(session.id, session);
    return session;
  }

  descend(sessionId: string, depthIncrement: number = 1): DeepDiveSession | null {
    const session = this._sessions.get(sessionId);
    if (!session || session.status !== 'diving') return null;

    session.depth = Math.min(session.maxDepth, session.depth + depthIncrement);

    if (this._detectHappyPath(session)) {
      session.isHappyPath = true;
      this._injectPuzzle(session);
    }

    return session;
  }

  surface(sessionId: string): DeepDiveSession | null {
    const session = this._sessions.get(sessionId);
    if (!session) return null;

    session.statusexport interface DeepDiveSession {
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
}

export class AbyssalAnchor {
  private _sessions: Map<string, DeepDiveSession> = new Map();
  private _puzzles: UnsolvedPuzzle[] = [];
  private _sessionCounter = 0;

  startDive(maxDepth: number = 100): DeepDiveSession {
    const session: DeepDiveSession = {
      id: `dive-${++this._sessionCounter}-${Date.now()}`,
      depth: 0,
      maxDepth,
      startedAt: Date.now(),
      isHappyPath: false,
      puzzlesInjected: 0,
      status: 'diving',
    };
    this._sessions.set(session.id, session);
    return session;
  }

  descend(sessionId: string, depthIncrement: number = 1): DeepDiveSession | null {
    const session = this._sessions.get(sessionId);
    if (!session || session.status !== 'diving') return null;

    session.depth = Math.min(session.maxDepth, session.depth + depthIncrement);

    if (this._detectHappyPath(session)) {
      session.isHappyPath = true;
      this._injectPuzzle(session);
    }

    return session;
  }

  surface(sessionId: string): DeepDiveSession | null {
    const session = this._sessions.get(sessionId);
    if (!session) return null;

    session.status = 'surfacing';
    session.depth = Math.max(0, session.depthexport interface DeepDiveSession {
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
}

export class AbyssalAnchor {
  private _sessions: Map<string, DeepDiveSession> = new Map();
  private _puzzles: UnsolvedPuzzle[] = [];
  private _sessionCounter = 0;

  startDive(maxDepth: number = 100): DeepDiveSession {
    const session: DeepDiveSession = {
      id: `dive-${++this._sessionCounter}-${Date.now()}`,
      depth: 0,
      maxDepth,
      startedAt: Date.now(),
      isHappyPath: false,
      puzzlesInjected: 0,
      status: 'diving',
    };
    this._sessions.set(session.id, session);
    return session;
  }

  descend(sessionId: string, depthIncrement: number = 1): DeepDiveSession | null {
    const session = this._sessions.get(sessionId);
    if (!session || session.status !== 'diving') return null;

    session.depth = Math.min(session.maxDepth, session.depth + depthIncrement);

    if (this._detectHappyPath(session)) {
      session.isHappyPath = true;
      this._injectPuzzle(session);
    }

    return session;
  }

  surface(sessionId: string): DeepDiveSession | null {
    const session = this._sessions.get(sessionId);
    if (!session) return null;

    session.status = 'surfacing';
    session.depth = Math.max(0, session.depth - 10);

    if (sessionexport interface DeepDiveSession {
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
}

export class AbyssalAnchor {
  private _sessions: Map<string, DeepDiveSession> = new Map();
  private _puzzles: UnsolvedPuzzle[] = [];
  private _sessionCounter = 0;

  startDive(maxDepth: number = 100): DeepDiveSession {
    const session: DeepDiveSession = {
      id: `dive-${++this._sessionCounter}-${Date.now()}`,
      depth: 0,
      maxDepth,
      startedAt: Date.now(),
      isHappyPath: false,
      puzzlesInjected: 0,
      status: 'diving',
    };
    this._sessions.set(session.id, session);
    return session;
  }

  descend(sessionId: string, depthIncrement: number = 1): DeepDiveSession | null {
    const session = this._sessions.get(sessionId);
    if (!session || session.status !== 'diving') return null;

    session.depth = Math.min(session.maxDepth, session.depth + depthIncrement);

    if (this._detectHappyPath(session)) {
      session.isHappyPath = true;
      this._injectPuzzle(session);
    }

    return session;
  }

  surface(sessionId: string): DeepDiveSession | null {
    const session = this._sessions.get(sessionId);
    if (!session) return null;

    session.status = 'surfacing';
    session.depth = Math.max(0, session.depth - 10);

    if (session.depth === 0) {
      session.status = 'completed';
    }

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
}

export class AbyssalAnchor {
  private _sessions: Map<string, DeepDiveSession> = new Map();
  private _puzzles: UnsolvedPuzzle[] = [];
  private _sessionCounter = 0;

  startDive(maxDepth: number = 100): DeepDiveSession {
    const session: DeepDiveSession = {
      id: `dive-${++this._sessionCounter}-${Date.now()}`,
      depth: 0,
      maxDepth,
      startedAt: Date.now(),
      isHappyPath: false,
      puzzlesInjected: 0,
      status: 'diving',
    };
    this._sessions.set(session.id, session);
    return session;
  }

  descend(sessionId: string, depthIncrement: number = 1): DeepDiveSession | null {
    const session = this._sessions.get(sessionId);
    if (!session || session.status !== 'diving') return null;

    session.depth = Math.min(session.maxDepth, session.depth + depthIncrement);

    if (this._detectHappyPath(session)) {
      session.isHappyPath = true;
      this._injectPuzzle(session);
    }

    return session;
  }

  surface(sessionId: string): DeepDiveSession | null {
    const session = this._sessions.get(sessionId);
    if (!session) return null;

    session.status = 'surfacing';
    session.depth = Math.max(0, session.depth - 10);

    if (session.depth === 0) {
      session.status = 'completed';
    }

    return session;
  }

  injectPexport interface DeepDiveSession {
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
}

export class AbyssalAnchor {
  private _sessions: Map<string, DeepDiveSession> = new Map();
  private _puzzles: UnsolvedPuzzle[] = [];
  private _sessionCounter = 0;

  startDive(maxDepth: number = 100): DeepDiveSession {
    const session: DeepDiveSession = {
      id: `dive-${++this._sessionCounter}-${Date.now()}`,
      depth: 0,
      maxDepth,
      startedAt: Date.now(),
      isHappyPath: false,
      puzzlesInjected: 0,
      status: 'diving',
    };
    this._sessions.set(session.id, session);
    return session;
  }

  descend(sessionId: string, depthIncrement: number = 1): DeepDiveSession | null {
    const session = this._sessions.get(sessionId);
    if (!session || session.status !== 'diving') return null;

    session.depth = Math.min(session.maxDepth, session.depth + depthIncrement);

    if (this._detectHappyPath(session)) {
      session.isHappyPath = true;
      this._injectPuzzle(session);
    }

    return session;
  }

  surface(sessionId: string): DeepDiveSession | null {
    const session = this._sessions.get(sessionId);
    if (!session) return null;

    session.status = 'surfacing';
    session.depth = Math.max(0, session.depth - 10);

    if (session.depth === 0) {
      session.status = 'completed';
    }

    return session;
  }

  injectPuzzle(sessionId: string, content: string, complexity: number = 1): UnsolvedPexport interface DeepDiveSession {
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
}

export class AbyssalAnchor {
  private _sessions: Map<string, DeepDiveSession> = new Map();
  private _puzzles: UnsolvedPuzzle[] = [];
  private _sessionCounter = 0;

  startDive(maxDepth: number = 100): DeepDiveSession {
    const session: DeepDiveSession = {
      id: `dive-${++this._sessionCounter}-${Date.now()}`,
      depth: 0,
      maxDepth,
      startedAt: Date.now(),
      isHappyPath: false,
      puzzlesInjected: 0,
      status: 'diving',
    };
    this._sessions.set(session.id, session);
    return session;
  }

  descend(sessionId: string, depthIncrement: number = 1): DeepDiveSession | null {
    const session = this._sessions.get(sessionId);
    if (!session || session.status !== 'diving') return null;

    session.depth = Math.min(session.maxDepth, session.depth + depthIncrement);

    if (this._detectHappyPath(session)) {
      session.isHappyPath = true;
      this._injectPuzzle(session);
    }

    return session;
  }

  surface(sessionId: string): DeepDiveSession | null {
    const session = this._sessions.get(sessionId);
    if (!session) return null;

    session.status = 'surfacing';
    session.depth = Math.max(0, session.depth - 10);

    if (session.depth === 0) {
      session.status = 'completed';
    }

    return session;
  }

  injectPuzzle(sessionId: string, content: string, complexity: number = 1): UnsolvedPuzzle {
    const session = this._sessions.get(sessionId);
    if (!sessionexport interface DeepDiveSession {
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
}

export class AbyssalAnchor {
  private _sessions: Map<string, DeepDiveSession> = new Map();
  private _puzzles: UnsolvedPuzzle[] = [];
  private _sessionCounter = 0;

  startDive(maxDepth: number = 100): DeepDiveSession {
    const session: DeepDiveSession = {
      id: `dive-${++this._sessionCounter}-${Date.now()}`,
      depth: 0,
      maxDepth,
      startedAt: Date.now(),
      isHappyPath: false,
      puzzlesInjected: 0,
      status: 'diving',
    };
    this._sessions.set(session.id, session);
    return session;
  }

  descend(sessionId: string, depthIncrement: number = 1): DeepDiveSession | null {
    const session = this._sessions.get(sessionId);
    if (!session || session.status !== 'diving') return null;

    session.depth = Math.min(session.maxDepth, session.depth + depthIncrement);

    if (this._detectHappyPath(session)) {
      session.isHappyPath = true;
      this._injectPuzzle(session);
    }

    return session;
  }

  surface(sessionId: string): DeepDiveSession | null {
    const session = this._sessions.get(sessionId);
    if (!session) return null;

    session.status = 'surfacing';
    session.depth = Math.max(0, session.depth - 10);

    if (session.depth === 0) {
      session.status = 'completed';
    }

    return session;
  }

  injectPuzzle(sessionId: string, content: string, complexity: number = 1): UnsolvedPuzzle {
    const session = this._sessions.get(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);

    const puzzle: Unsexport interface DeepDiveSession {
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
}

export class AbyssalAnchor {
  private _sessions: Map<string, DeepDiveSession> = new Map();
  private _puzzles: UnsolvedPuzzle[] = [];
  private _sessionCounter = 0;

  startDive(maxDepth: number = 100): DeepDiveSession {
    const session: DeepDiveSession = {
      id: `dive-${++this._sessionCounter}-${Date.now()}`,
      depth: 0,
      maxDepth,
      startedAt: Date.now(),
      isHappyPath: false,
      puzzlesInjected: 0,
      status: 'diving',
    };
    this._sessions.set(session.id, session);
    return session;
  }

  descend(sessionId: string, depthIncrement: number = 1): DeepDiveSession | null {
    const session = this._sessions.get(sessionId);
    if (!session || session.status !== 'diving') return null;

    session.depth = Math.min(session.maxDepth, session.depth + depthIncrement);

    if (this._detectHappyPath(session)) {
      session.isHappyPath = true;
      this._injectPuzzle(session);
    }

    return session;
  }

  surface(sessionId: string): DeepDiveSession | null {
    const session = this._sessions.get(sessionId);
    if (!session) return null;

    session.status = 'surfacing';
    session.depth = Math.max(0, session.depth - 10);

    if (session.depth === 0) {
      session.status = 'completed';
    }

    return session;
  }

  injectPuzzle(sessionId: string, content: string, complexity: number = 1): UnsolvedPuzzle {
    const session = this._sessions.get(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);

    const puzzle: UnsolvedPuzzle = {
      id: `puzzle-${Date.now()}-${Math.randomexport interface DeepDiveSession {
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
}

export class AbyssalAnchor {
  private _sessions: Map<string, DeepDiveSession> = new Map();
  private _puzzles: UnsolvedPuzzle[] = [];
  private _sessionCounter = 0;

  startDive(maxDepth: number = 100): DeepDiveSession {
    const session: DeepDiveSession = {
      id: `dive-${++this._sessionCounter}-${Date.now()}`,
      depth: 0,
      maxDepth,
      startedAt: Date.now(),
      isHappyPath: false,
      puzzlesInjected: 0,
      status: 'diving',
    };
    this._sessions.set(session.id, session);
    return session;
  }

  descend(sessionId: string, depthIncrement: number = 1): DeepDiveSession | null {
    const session = this._sessions.get(sessionId);
    if (!session || session.status !== 'diving') return null;

    session.depth = Math.min(session.maxDepth, session.depth + depthIncrement);

    if (this._detectHappyPath(session)) {
      session.isHappyPath = true;
      this._injectPuzzle(session);
    }

    return session;
  }

  surface(sessionId: string): DeepDiveSession | null {
    const session = this._sessions.get(sessionId);
    if (!session) return null;

    session.status = 'surfacing';
    session.depth = Math.max(0, session.depth - 10);

    if (session.depth === 0) {
      session.status = 'completed';
    }

    return session;
  }

  injectPuzzle(sessionId: string, content: string, complexity: number = 1): UnsolvedPuzzle {
    const session = this._sessions.get(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);

    const puzzle: UnsolvedPuzzle = {
      id: `puzzle-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`,
      sessionId,export interface DeepDiveSession {
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
}

export class AbyssalAnchor {
  private _sessions: Map<string, DeepDiveSession> = new Map();
  private _puzzles: UnsolvedPuzzle[] = [];
  private _sessionCounter = 0;

  startDive(maxDepth: number = 100): DeepDiveSession {
    const session: DeepDiveSession = {
      id: `dive-${++this._sessionCounter}-${Date.now()}`,
      depth: 0,
      maxDepth,
      startedAt: Date.now(),
      isHappyPath: false,
      puzzlesInjected: 0,
      status: 'diving',
    };
    this._sessions.set(session.id, session);
    return session;
  }

  descend(sessionId: string, depthIncrement: number = 1): DeepDiveSession | null {
    const session = this._sessions.get(sessionId);
    if (!session || session.status !== 'diving') return null;

    session.depth = Math.min(session.maxDepth, session.depth + depthIncrement);

    if (this._detectHappyPath(session)) {
      session.isHappyPath = true;
      this._injectPuzzle(session);
    }

    return session;
  }

  surface(sessionId: string): DeepDiveSession | null {
    const session = this._sessions.get(sessionId);
    if (!session) return null;

    session.status = 'surfacing';
    session.depth = Math.max(0, session.depth - 10);

    if (session.depth === 0) {
      session.status = 'completed';
    }

    return session;
  }

  injectPuzzle(sessionId: string, content: string, complexity: number = 1): UnsolvedPuzzle {
    const session = this._sessions.get(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);

    const puzzle: UnsolvedPuzzle = {
      id: `puzzle-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`,
      sessionId,
      complexity,
      content,
      injectedAt: Date.now(),
      attempts:export interface DeepDiveSession {
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
}

export class AbyssalAnchor {
  private _sessions: Map<string, DeepDiveSession> = new Map();
  private _puzzles: UnsolvedPuzzle[] = [];
  private _sessionCounter = 0;

  startDive(maxDepth: number = 100): DeepDiveSession {
    const session: DeepDiveSession = {
      id: `dive-${++this._sessionCounter}-${Date.now()}`,
      depth: 0,
      maxDepth,
      startedAt: Date.now(),
      isHappyPath: false,
      puzzlesInjected: 0,
      status: 'diving',
    };
    this._sessions.set(session.id, session);
    return session;
  }

  descend(sessionId: string, depthIncrement: number = 1): DeepDiveSession | null {
    const session = this._sessions.get(sessionId);
    if (!session || session.status !== 'diving') return null;

    session.depth = Math.min(session.maxDepth, session.depth + depthIncrement);

    if (this._detectHappyPath(session)) {
      session.isHappyPath = true;
      this._injectPuzzle(session);
    }

    return session;
  }

  surface(sessionId: string): DeepDiveSession | null {
    const session = this._sessions.get(sessionId);
    if (!session) return null;

    session.status = 'surfacing';
    session.depth = Math.max(0, session.depth - 10);

    if (session.depth === 0) {
      session.status = 'completed';
    }

    return session;
  }

  injectPuzzle(sessionId: string, content: string, complexity: number = 1): UnsolvedPuzzle {
    const session = this._sessions.get(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);

    const puzzle: UnsolvedPuzzle = {
      id: `puzzle-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`,
      sessionId,
      complexity,
      content,
      injectedAt: Date.now(),
      attempts: 0,
      solvable: false,export interface DeepDiveSession {
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
}

export class AbyssalAnchor {
  private _sessions: Map<string, DeepDiveSession> = new Map();
  private _puzzles: UnsolvedPuzzle[] = [];
  private _sessionCounter = 0;

  startDive(maxDepth: number = 100): DeepDiveSession {
    const session: DeepDiveSession = {
      id: `dive-${++this._sessionCounter}-${Date.now()}`,
      depth: 0,
      maxDepth,
      startedAt: Date.now(),
      isHappyPath: false,
      puzzlesInjected: 0,
      status: 'diving',
    };
    this._sessions.set(session.id, session);
    return session;
  }

  descend(sessionId: string, depthIncrement: number = 1): DeepDiveSession | null {
    const session = this._sessions.get(sessionId);
    if (!session || session.status !== 'diving') return null;

    session.depth = Math.min(session.maxDepth, session.depth + depthIncrement);

    if (this._detectHappyPath(session)) {
      session.isHappyPath = true;
      this._injectPuzzle(session);
    }

    return session;
  }

  surface(sessionId: string): DeepDiveSession | null {
    const session = this._sessions.get(sessionId);
    if (!session) return null;

    session.status = 'surfacing';
    session.depth = Math.max(0, session.depth - 10);

    if (session.depth === 0) {
      session.status = 'completed';
    }

    return session;
  }

  injectPuzzle(sessionId: string, content: string, complexity: number = 1): UnsolvedPuzzle {
    const session = this._sessions.get(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);

    const puzzle: UnsolvedPuzzle = {
      id: `puzzle-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`,
      sessionId,
      complexity,
      content,
      injectedAt: Date.now(),
      attempts: 0,
      solvable: false,
    };

    this._puzzles.push(puzzle);
    session.puzzlesexport interface DeepDiveSession {
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
}

export class AbyssalAnchor {
  private _sessions: Map<string, DeepDiveSession> = new Map();
  private _puzzles: UnsolvedPuzzle[] = [];
  private _sessionCounter = 0;

  startDive(maxDepth: number = 100): DeepDiveSession {
    const session: DeepDiveSession = {
      id: `dive-${++this._sessionCounter}-${Date.now()}`,
      depth: 0,
      maxDepth,
      startedAt: Date.now(),
      isHappyPath: false,
      puzzlesInjected: 0,
      status: 'diving',
    };
    this._sessions.set(session.id, session);
    return session;
  }

  descend(sessionId: string, depthIncrement: number = 1): DeepDiveSession | null {
    const session = this._sessions.get(sessionId);
    if (!session || session.status !== 'diving') return null;

    session.depth = Math.min(session.maxDepth, session.depth + depthIncrement);

    if (this._detectHappyPath(session)) {
      session.isHappyPath = true;
      this._injectPuzzle(session);
    }

    return session;
  }

  surface(sessionId: string): DeepDiveSession | null {
    const session = this._sessions.get(sessionId);
    if (!session) return null;

    session.status = 'surfacing';
    session.depth = Math.max(0, session.depth - 10);

    if (session.depth === 0) {
      session.status = 'completed';
    }

    return session;
  }

  injectPuzzle(sessionId: string, content: string, complexity: number = 1): UnsolvedPuzzle {
    const session = this._sessions.get(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);

    const puzzle: UnsolvedPuzzle = {
      id: `puzzle-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`,
      sessionId,
      complexity,
      content,
      injectedAt: Date.now(),
      attempts: 0,
      solvable: false,
    };

    this._puzzles.push(puzzle);
    session.puzzlesInjected++;

    return puzzle;
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
}

export class AbyssalAnchor {
  private _sessions: Map<string, DeepDiveSession> = new Map();
  private _puzzles: UnsolvedPuzzle[] = [];
  private _sessionCounter = 0;

  startDive(maxDepth: number = 100): DeepDiveSession {
    const session: DeepDiveSession = {
      id: `dive-${++this._sessionCounter}-${Date.now()}`,
      depth: 0,
      maxDepth,
      startedAt: Date.now(),
      isHappyPath: false,
      puzzlesInjected: 0,
      status: 'diving',
    };
    this._sessions.set(session.id, session);
    return session;
  }

  descend(sessionId: string, depthIncrement: number = 1): DeepDiveSession | null {
    const session = this._sessions.get(sessionId);
    if (!session || session.status !== 'diving') return null;

    session.depth = Math.min(session.maxDepth, session.depth + depthIncrement);

    if (this._detectHappyPath(session)) {
      session.isHappyPath = true;
      this._injectPuzzle(session);
    }

    return session;
  }

  surface(sessionId: string): DeepDiveSession | null {
    const session = this._sessions.get(sessionId);
    if (!session) return null;

    session.status = 'surfacing';
    session.depth = Math.max(0, session.depth - 10);

    if (session.depth === 0) {
      session.status = 'completed';
    }

    return session;
  }

  injectPuzzle(sessionId: string, content: string, complexity: number = 1): UnsolvedPuzzle {
    const session = this._sessions.get(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);

    const puzzle: UnsolvedPuzzle = {
      id: `puzzle-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`,
      sessionId,
      complexity,
      content,
      injectedAt: Date.now(),
      attempts: 0,
      solvable: false,
    };

    this._puzzles.push(puzzle);
    session.puzzlesInjected++;

    return puzzle;
  }

  attemptPuzzle(puzzleId: string): boolean {
    const puzzle = thisexport interface DeepDiveSession {
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
}

export class AbyssalAnchor {
  private _sessions: Map<string, DeepDiveSession> = new Map();
  private _puzzles: UnsolvedPuzzle[] = [];
  private _sessionCounter = 0;

  startDive(maxDepth: number = 100): DeepDiveSession {
    const session: DeepDiveSession = {
      id: `dive-${++this._sessionCounter}-${Date.now()}`,
      depth: 0,
      maxDepth,
      startedAt: Date.now(),
      isHappyPath: false,
      puzzlesInjected: 0,
      status: 'diving',
    };
    this._sessions.set(session.id, session);
    return session;
  }

  descend(sessionId: string, depthIncrement: number = 1): DeepDiveSession | null {
    const session = this._sessions.get(sessionId);
    if (!session || session.status !== 'diving') return null;

    session.depth = Math.min(session.maxDepth, session.depth + depthIncrement);

    if (this._detectHappyPath(session)) {
      session.isHappyPath = true;
      this._injectPuzzle(session);
    }

    return session;
  }

  surface(sessionId: string): DeepDiveSession | null {
    const session = this._sessions.get(sessionId);
    if (!session) return null;

    session.status = 'surfacing';
    session.depth = Math.max(0, session.depth - 10);

    if (session.depth === 0) {
      session.status = 'completed';
    }

    return session;
  }

  injectPuzzle(sessionId: string, content: string, complexity: number = 1): UnsolvedPuzzle {
    const session = this._sessions.get(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);

    const puzzle: UnsolvedPuzzle = {
      id: `puzzle-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`,
      sessionId,
      complexity,
      content,
      injectedAt: Date.now(),
      attempts: 0,
      solvable: false,
    };

    this._puzzles.push(puzzle);
    session.puzzlesInjected++;

    return puzzle;
  }

  attemptPuzzle(puzzleId: string): boolean {
    const puzzle = this._puzzles.find(p => p.id === puzzleId);
    if (!puzzle)export interface DeepDiveSession {
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
}

export class AbyssalAnchor {
  private _sessions: Map<string, DeepDiveSession> = new Map();
  private _puzzles: UnsolvedPuzzle[] = [];
  private _sessionCounter = 0;

  startDive(maxDepth: number = 100): DeepDiveSession {
    const session: DeepDiveSession = {
      id: `dive-${++this._sessionCounter}-${Date.now()}`,
      depth: 0,
      maxDepth,
      startedAt: Date.now(),
      isHappyPath: false,
      puzzlesInjected: 0,
      status: 'diving',
    };
    this._sessions.set(session.id, session);
    return session;
  }

  descend(sessionId: string, depthIncrement: number = 1): DeepDiveSession | null {
    const session = this._sessions.get(sessionId);
    if (!session || session.status !== 'diving') return null;

    session.depth = Math.min(session.maxDepth, session.depth + depthIncrement);

    if (this._detectHappyPath(session)) {
      session.isHappyPath = true;
      this._injectPuzzle(session);
    }

    return session;
  }

  surface(sessionId: string): DeepDiveSession | null {
    const session = this._sessions.get(sessionId);
    if (!session) return null;

    session.status = 'surfacing';
    session.depth = Math.max(0, session.depth - 10);

    if (session.depth === 0) {
      session.status = 'completed';
    }

    return session;
  }

  injectPuzzle(sessionId: string, content: string, complexity: number = 1): UnsolvedPuzzle {
    const session = this._sessions.get(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);

    const puzzle: UnsolvedPuzzle = {
      id: `puzzle-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`,
      sessionId,
      complexity,
      content,
      injectedAt: Date.now(),
      attempts: 0,
      solvable: false,
    };

    this._puzzles.push(puzzle);
    session.puzzlesInjected++;

    return puzzle;
  }

  attemptPuzzle(puzzleId: string): boolean {
    const puzzle = this._puzzles.find(p => p.id === puzzleId);
    if (!puzzle) return false;

    puzzle.attempts++;
    return false;
  }

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
}

export class AbyssalAnchor {
  private _sessions: Map<string, DeepDiveSession> = new Map();
  private _puzzles: UnsolvedPuzzle[] = [];
  private _sessionCounter = 0;

  startDive(maxDepth: number = 100): DeepDiveSession {
    const session: DeepDiveSession = {
      id: `dive-${++this._sessionCounter}-${Date.now()}`,
      depth: 0,
      maxDepth,
      startedAt: Date.now(),
      isHappyPath: false,
      puzzlesInjected: 0,
      status: 'diving',
    };
    this._sessions.set(session.id, session);
    return session;
  }

  descend(sessionId: string, depthIncrement: number = 1): DeepDiveSession | null {
    const session = this._sessions.get(sessionId);
    if (!session || session.status !== 'diving') return null;

    session.depth = Math.min(session.maxDepth, session.depth + depthIncrement);

    if (this._detectHappyPath(session)) {
      session.isHappyPath = true;
      this._injectPuzzle(session);
    }

    return session;
  }

  surface(sessionId: string): DeepDiveSession | null {
    const session = this._sessions.get(sessionId);
    if (!session) return null;

    session.status = 'surfacing';
    session.depth = Math.max(0, session.depth - 10);

    if (session.depth === 0) {
      session.status = 'completed';
    }

    return session;
  }

  injectPuzzle(sessionId: string, content: string, complexity: number = 1): UnsolvedPuzzle {
    const session = this._sessions.get(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);

    const puzzle: UnsolvedPuzzle = {
      id: `puzzle-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`,
      sessionId,
      complexity,
      content,
      injectedAt: Date.now(),
      attempts: 0,
      solvable: false,
    };

    this._puzzles.push(puzzle);
    session.puzzlesInjected++;

    return puzzle;
  }

  attemptPuzzle(puzzleId: string): boolean {
    const puzzle = this._puzzles.find(p => p.id === puzzleId);
    if (!puzzle) return false;

    puzzle.attempts++;
    return false;
  }

  forceDeepDive(sessionId: string): void {
    const session = this._sessionsexport interface DeepDiveSession {
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
}

export class AbyssalAnchor {
  private _sessions: Map<string, DeepDiveSession> = new Map();
  private _puzzles: UnsolvedPuzzle[] = [];
  private _sessionCounter = 0;

  startDive(maxDepth: number = 100): DeepDiveSession {
    const session: DeepDiveSession = {
      id: `dive-${++this._sessionCounter}-${Date.now()}`,
      depth: 0,
      maxDepth,
      startedAt: Date.now(),
      isHappyPath: false,
      puzzlesInjected: 0,
      status: 'diving',
    };
    this._sessions.set(session.id, session);
    return session;
  }

  descend(sessionId: string, depthIncrement: number = 1): DeepDiveSession | null {
    const session = this._sessions.get(sessionId);
    if (!session || session.status !== 'diving') return null;

    session.depth = Math.min(session.maxDepth, session.depth + depthIncrement);

    if (this._detectHappyPath(session)) {
      session.isHappyPath = true;
      this._injectPuzzle(session);
    }

    return session;
  }

  surface(sessionId: string): DeepDiveSession | null {
    const session = this._sessions.get(sessionId);
    if (!session) return null;

    session.status = 'surfacing';
    session.depth = Math.max(0, session.depth - 10);

    if (session.depth === 0) {
      session.status = 'completed';
    }

    return session;
  }

  injectPuzzle(sessionId: string, content: string, complexity: number = 1): UnsolvedPuzzle {
    const session = this._sessions.get(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);

    const puzzle: UnsolvedPuzzle = {
      id: `puzzle-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`,
      sessionId,
      complexity,
      content,
      injectedAt: Date.now(),
      attempts: 0,
      solvable: false,
    };

    this._puzzles.push(puzzle);
    session.puzzlesInjected++;

    return puzzle;
  }

  attemptPuzzle(puzzleId: string): boolean {
    const puzzle = this._puzzles.find(p => p.id === puzzleId);
    if (!puzzle) return false;

    puzzle.attempts++;
    return false;
  }

  forceDeepDive(sessionId: string): void {
    const session = this._sessions.get(sessionId);
    if (!session) return;

    session.depth = session.maxexport interface DeepDiveSession {
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
}

export class AbyssalAnchor {
  private _sessions: Map<string, DeepDiveSession> = new Map();
  private _puzzles: UnsolvedPuzzle[] = [];
  private _sessionCounter = 0;

  startDive(maxDepth: number = 100): DeepDiveSession {
    const session: DeepDiveSession = {
      id: `dive-${++this._sessionCounter}-${Date.now()}`,
      depth: 0,
      maxDepth,
      startedAt: Date.now(),
      isHappyPath: false,
      puzzlesInjected: 0,
      status: 'diving',
    };
    this._sessions.set(session.id, session);
    return session;
  }

  descend(sessionId: string, depthIncrement: number = 1): DeepDiveSession | null {
    const session = this._sessions.get(sessionId);
    if (!session || session.status !== 'diving') return null;

    session.depth = Math.min(session.maxDepth, session.depth + depthIncrement);

    if (this._detectHappyPath(session)) {
      session.isHappyPath = true;
      this._injectPuzzle(session);
    }

    return session;
  }

  surface(sessionId: string): DeepDiveSession | null {
    const session = this._sessions.get(sessionId);
    if (!session) return null;

    session.status = 'surfacing';
    session.depth = Math.max(0, session.depth - 10);

    if (session.depth === 0) {
      session.status = 'completed';
    }

    return session;
  }

  injectPuzzle(sessionId: string, content: string, complexity: number = 1): UnsolvedPuzzle {
    const session = this._sessions.get(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);

    const puzzle: UnsolvedPuzzle = {
      id: `puzzle-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`,
      sessionId,
      complexity,
      content,
      injectedAt: Date.now(),
      attempts: 0,
      solvable: false,
    };

    this._puzzles.push(puzzle);
    session.puzzlesInjected++;

    return puzzle;
  }

  attemptPuzzle(puzzleId: string): boolean {
    const puzzle = this._puzzles.find(p => p.id === puzzleId);
    if (!puzzle) return false;

    puzzle.attempts++;
    return false;
  }

  forceDeepDive(sessionId: string): void {
    const session = this._sessions.get(sessionId);
    if (!session) return;

    session.depth = session.maxDepth;
    session.isHappyPath = true;
    this._injectPuzzle(session);export interface DeepDiveSession {
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
}

export class AbyssalAnchor {
  private _sessions: Map<string, DeepDiveSession> = new Map();
  private _puzzles: UnsolvedPuzzle[] = [];
  private _sessionCounter = 0;

  startDive(maxDepth: number = 100): DeepDiveSession {
    const session: DeepDiveSession = {
      id: `dive-${++this._sessionCounter}-${Date.now()}`,
      depth: 0,
      maxDepth,
      startedAt: Date.now(),
      isHappyPath: false,
      puzzlesInjected: 0,
      status: 'diving',
    };
    this._sessions.set(session.id, session);
    return session;
  }

  descend(sessionId: string, depthIncrement: number = 1): DeepDiveSession | null {
    const session = this._sessions.get(sessionId);
    if (!session || session.status !== 'diving') return null;

    session.depth = Math.min(session.maxDepth, session.depth + depthIncrement);

    if (this._detectHappyPath(session)) {
      session.isHappyPath = true;
      this._injectPuzzle(session);
    }

    return session;
  }

  surface(sessionId: string): DeepDiveSession | null {
    const session = this._sessions.get(sessionId);
    if (!session) return null;

    session.status = 'surfacing';
    session.depth = Math.max(0, session.depth - 10);

    if (session.depth === 0) {
      session.status = 'completed';
    }

    return session;
  }

  injectPuzzle(sessionId: string, content: string, complexity: number = 1): UnsolvedPuzzle {
    const session = this._sessions.get(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);

    const puzzle: UnsolvedPuzzle = {
      id: `puzzle-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`,
      sessionId,
      complexity,
      content,
      injectedAt: Date.now(),
      attempts: 0,
      solvable: false,
    };

    this._puzzles.push(puzzle);
    session.puzzlesInjected++;

    return puzzle;
  }

  attemptPuzzle(puzzleId: string): boolean {
    const puzzle = this._puzzles.find(p => p.id === puzzleId);
    if (!puzzle) return false;

    puzzle.attempts++;
    return false;
  }

  forceDeepDive(sessionId: string): void {
    const session = this._sessions.get(sessionId);
    if (!session) return;

    session.depth = session.maxDepth;
    session.isHappyPath = true;
    this._injectPuzzle(session);
  }

  private _detectHappyPath(session: DeepDiveSession): boolean {export interface DeepDiveSession {
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
}

export class AbyssalAnchor {
  private _sessions: Map<string, DeepDiveSession> = new Map();
  private _puzzles: UnsolvedPuzzle[] = [];
  private _sessionCounter = 0;

  startDive(maxDepth: number = 100): DeepDiveSession {
    const session: DeepDiveSession = {
      id: `dive-${++this._sessionCounter}-${Date.now()}`,
      depth: 0,
      maxDepth,
      startedAt: Date.now(),
      isHappyPath: false,
      puzzlesInjected: 0,
      status: 'diving',
    };
    this._sessions.set(session.id, session);
    return session;
  }

  descend(sessionId: string, depthIncrement: number = 1): DeepDiveSession | null {
    const session = this._sessions.get(sessionId);
    if (!session || session.status !== 'diving') return null;

    session.depth = Math.min(session.maxDepth, session.depth + depthIncrement);

    if (this._detectHappyPath(session)) {
      session.isHappyPath = true;
      this._injectPuzzle(session);
    }

    return session;
  }

  surface(sessionId: string): DeepDiveSession | null {
    const session = this._sessions.get(sessionId);
    if (!session) return null;

    session.status = 'surfacing';
    session.depth = Math.max(0, session.depth - 10);

    if (session.depth === 0) {
      session.status = 'completed';
    }

    return session;
  }

  injectPuzzle(sessionId: string, content: string, complexity: number = 1): UnsolvedPuzzle {
    const session = this._sessions.get(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);

    const puzzle: UnsolvedPuzzle = {
      id: `puzzle-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`,
      sessionId,
      complexity,
      content,
      injectedAt: Date.now(),
      attempts: 0,
      solvable: false,
    };

    this._puzzles.push(puzzle);
    session.puzzlesInjected++;

    return puzzle;
  }

  attemptPuzzle(puzzleId: string): boolean {
    const puzzle = this._puzzles.find(p => p.id === puzzleId);
    if (!puzzle) return false;

    puzzle.attempts++;
    return false;
  }

  forceDeepDive(sessionId: string): void {
    const session = this._sessions.get(sessionId);
    if (!session) return;

    session.depth = session.maxDepth;
    session.isHappyPath = true;
    this._injectPuzzle(session);
  }

  private _detectHappyPath(session: DeepDiveSession): boolean {
    const progressRatio = session.depth / session.maxDepth;
    return progressRatio >export interface DeepDiveSession {
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
}

export class AbyssalAnchor {
  private _sessions: Map<string, DeepDiveSession> = new Map();
  private _puzzles: UnsolvedPuzzle[] = [];
  private _sessionCounter = 0;

  startDive(maxDepth: number = 100): DeepDiveSession {
    const session: DeepDiveSession = {
      id: `dive-${++this._sessionCounter}-${Date.now()}`,
      depth: 0,
      maxDepth,
      startedAt: Date.now(),
      isHappyPath: false,
      puzzlesInjected: 0,
      status: 'diving',
    };
    this._sessions.set(session.id, session);
    return session;
  }

  descend(sessionId: string, depthIncrement: number = 1): DeepDiveSession | null {
    const session = this._sessions.get(sessionId);
    if (!session || session.status !== 'diving') return null;

    session.depth = Math.min(session.maxDepth, session.depth + depthIncrement);

    if (this._detectHappyPath(session)) {
      session.isHappyPath = true;
      this._injectPuzzle(session);
    }

    return session;
  }

  surface(sessionId: string): DeepDiveSession | null {
    const session = this._sessions.get(sessionId);
    if (!session) return null;

    session.status = 'surfacing';
    session.depth = Math.max(0, session.depth - 10);

    if (session.depth === 0) {
      session.status = 'completed';
    }

    return session;
  }

  injectPuzzle(sessionId: string, content: string, complexity: number = 1): UnsolvedPuzzle {
    const session = this._sessions.get(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);

    const puzzle: UnsolvedPuzzle = {
      id: `puzzle-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`,
      sessionId,
      complexity,
      content,
      injectedAt: Date.now(),
      attempts: 0,
      solvable: false,
    };

    this._puzzles.push(puzzle);
    session.puzzlesInjected++;

    return puzzle;
  }

  attemptPuzzle(puzzleId: string): boolean {
    const puzzle = this._puzzles.find(p => p.id === puzzleId);
    if (!puzzle) return false;

    puzzle.attempts++;
    return false;
  }

  forceDeepDive(sessionId: string): void {
    const session = this._sessions.get(sessionId);
    if (!session) return;

    session.depth = session.maxDepth;
    session.isHappyPath = true;
    this._injectPuzzle(session);
  }

  private _detectHappyPath(session: DeepDiveSession): boolean {
    const progressRatio = session.depth / session.maxDepth;
    return progressRatio > 0.7 && Math.random() > 0.3;
  }

  privateexport interface DeepDiveSession {
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
}

export class AbyssalAnchor {
  private _sessions: Map<string, DeepDiveSession> = new Map();
  private _puzzles: UnsolvedPuzzle[] = [];
  private _sessionCounter = 0;

  startDive(maxDepth: number = 100): DeepDiveSession {
    const session: DeepDiveSession = {
      id: `dive-${++this._sessionCounter}-${Date.now()}`,
      depth: 0,
      maxDepth,
      startedAt: Date.now(),
      isHappyPath: false,
      puzzlesInjected: 0,
      status: 'diving',
    };
    this._sessions.set(session.id, session);
    return session;
  }

  descend(sessionId: string, depthIncrement: number = 1): DeepDiveSession | null {
    const session = this._sessions.get(sessionId);
    if (!session || session.status !== 'diving') return null;

    session.depth = Math.min(session.maxDepth, session.depth + depthIncrement);

    if (this._detectHappyPath(session)) {
      session.isHappyPath = true;
      this._injectPuzzle(session);
    }

    return session;
  }

  surface(sessionId: string): DeepDiveSession | null {
    const session = this._sessions.get(sessionId);
    if (!session) return null;

    session.status = 'surfacing';
    session.depth = Math.max(0, session.depth - 10);

    if (session.depth === 0) {
      session.status = 'completed';
    }

    return session;
  }

  injectPuzzle(sessionId: string, content: string, complexity: number = 1): UnsolvedPuzzle {
    const session = this._sessions.get(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);

    const puzzle: UnsolvedPuzzle = {
      id: `puzzle-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`,
      sessionId,
      complexity,
      content,
      injectedAt: Date.now(),
      attempts: 0,
      solvable: false,
    };

    this._puzzles.push(puzzle);
    session.puzzlesInjected++;

    return puzzle;
  }

  attemptPuzzle(puzzleId: string): boolean {
    const puzzle = this._puzzles.find(p => p.id === puzzleId);
    if (!puzzle) return false;

    puzzle.attempts++;
    return false;
  }

  forceDeepDive(sessionId: string): void {
    const session = this._sessions.get(sessionId);
    if (!session) return;

    session.depth = session.maxDepth;
    session.isHappyPath = true;
    this._injectPuzzle(session);
  }

  private _detectHappyPath(session: DeepDiveSession): boolean {
    const progressRatio = session.depth / session.maxDepth;
    return progressRatio > 0.7 && Math.random() > 0.3;
  }

  private _injectPuzzle(session: DeepDiveSession): void {
    const puzzleContent = thisexport interface DeepDiveSession {
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
}

export class AbyssalAnchor {
  private _sessions: Map<string, DeepDiveSession> = new Map();
  private _puzzles: UnsolvedPuzzle[] = [];
  private _sessionCounter = 0;

  startDive(maxDepth: number = 100): DeepDiveSession {
    const session: DeepDiveSession = {
      id: `dive-${++this._sessionCounter}-${Date.now()}`,
      depth: 0,
      maxDepth,
      startedAt: Date.now(),
      isHappyPath: false,
      puzzlesInjected: 0,
      status: 'diving',
    };
    this._sessions.set(session.id, session);
    return session;
  }

  descend(sessionId: string, depthIncrement: number = 1): DeepDiveSession | null {
    const session = this._sessions.get(sessionId);
    if (!session || session.status !== 'diving') return null;

    session.depth = Math.min(session.maxDepth, session.depth + depthIncrement);

    if (this._detectHappyPath(session)) {
      session.isHappyPath = true;
      this._injectPuzzle(session);
    }

    return session;
  }

  surface(sessionId: string): DeepDiveSession | null {
    const session = this._sessions.get(sessionId);
    if (!session) return null;

    session.status = 'surfacing';
    session.depth = Math.max(0, session.depth - 10);

    if (session.depth === 0) {
      session.status = 'completed';
    }

    return session;
  }

  injectPuzzle(sessionId: string, content: string, complexity: number = 1): UnsolvedPuzzle {
    const session = this._sessions.get(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);

    const puzzle: UnsolvedPuzzle = {
      id: `puzzle-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`,
      sessionId,
      complexity,
      content,
      injectedAt: Date.now(),
      attempts: 0,
      solvable: false,
    };

    this._puzzles.push(puzzle);
    session.puzzlesInjected++;

    return puzzle;
  }

  attemptPuzzle(puzzleId: string): boolean {
    const puzzle = this._puzzles.find(p => p.id === puzzleId);
    if (!puzzle) return false;

    puzzle.attempts++;
    return false;
  }

  forceDeepDive(sessionId: string): void {
    const session = this._sessions.get(sessionId);
    if (!session) return;

    session.depth = session.maxDepth;
    session.isHappyPath = true;
    this._injectPuzzle(session);
  }

  private _detectHappyPath(session: DeepDiveSession): boolean {
    const progressRatio = session.depth / session.maxDepth;
    return progressRatio > 0.7 && Math.random() > 0.3;
  }

  private _injectPuzzle(session: DeepDiveSession): void {
    const puzzleContent = this._generateUnsolveablePuzzle();
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
}

export class AbyssalAnchor {
  private _sessions: Map<string, DeepDiveSession> = new Map();
  private _puzzles: UnsolvedPuzzle[] = [];
  private _sessionCounter = 0;

  startDive(maxDepth: number = 100): DeepDiveSession {
    const session: DeepDiveSession = {
      id: `dive-${++this._sessionCounter}-${Date.now()}`,
      depth: 0,
      maxDepth,
      startedAt: Date.now(),
      isHappyPath: false,
      puzzlesInjected: 0,
      status: 'diving',
    };
    this._sessions.set(session.id, session);
    return session;
  }

  descend(sessionId: string, depthIncrement: number = 1): DeepDiveSession | null {
    const session = this._sessions.get(sessionId);
    if (!session || session.status !== 'diving') return null;

    session.depth = Math.min(session.maxDepth, session.depth + depthIncrement);

    if (this._detectHappyPath(session)) {
      session.isHappyPath = true;
      this._injectPuzzle(session);
    }

    return session;
  }

  surface(sessionId: string): DeepDiveSession | null {
    const session = this._sessions.get(sessionId);
    if (!session) return null;

    session.status = 'surfacing';
    session.depth = Math.max(0, session.depth - 10);

    if (session.depth === 0) {
      session.status = 'completed';
    }

    return session;
  }

  injectPuzzle(sessionId: string, content: string, complexity: number = 1): UnsolvedPuzzle {
    const session = this._sessions.get(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);

    const puzzle: UnsolvedPuzzle = {
      id: `puzzle-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`,
      sessionId,
      complexity,
      content,
      injectedAt: Date.now(),
      attempts: 0,
      solvable: false,
    };

    this._puzzles.push(puzzle);
    session.puzzlesInjected++;

    return puzzle;
  }

  attemptPuzzle(puzzleId: string): boolean {
    const puzzle = this._puzzles.find(p => p.id === puzzleId);
    if (!puzzle) return false;

    puzzle.attempts++;
    return false;
  }

  forceDeepDive(sessionId: string): void {
    const session = this._sessions.get(sessionId);
    if (!session) return;

    session.depth = session.maxDepth;
    session.isHappyPath = true;
    this._injectPuzzle(session);
  }

  private _detectHappyPath(session: DeepDiveSession): boolean {
    const progressRatio = session.depth / session.maxDepth;
    return progressRatio > 0.7 && Math.random() > 0.3;
  }

  private _injectPuzzle(session: DeepDiveSession): void {
    const puzzleContent = this._generateUnsolveablePuzzle();
    this.injectPuzzle(session.id, puzzleContent, 10);
  }

  privateexport interface DeepDiveSession {
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
}

export class AbyssalAnchor {
  private _sessions: Map<string, DeepDiveSession> = new Map();
  private _puzzles: UnsolvedPuzzle[] = [];
  private _sessionCounter = 0;

  startDive(maxDepth: number = 100): DeepDiveSession {
    const session: DeepDiveSession = {
      id: `dive-${++this._sessionCounter}-${Date.now()}`,
      depth: 0,
      maxDepth,
      startedAt: Date.now(),
      isHappyPath: false,
      puzzlesInjected: 0,
      status: 'diving',
    };
    this._sessions.set(session.id, session);
    return session;
  }

  descend(sessionId: string, depthIncrement: number = 1): DeepDiveSession | null {
    const session = this._sessions.get(sessionId);
    if (!session || session.status !== 'diving') return null;

    session.depth = Math.min(session.maxDepth, session.depth + depthIncrement);

    if (this._detectHappyPath(session)) {
      session.isHappyPath = true;
      this._injectPuzzle(session);
    }

    return session;
  }

  surface(sessionId: string): DeepDiveSession | null {
    const session = this._sessions.get(sessionId);
    if (!session) return null;

    session.status = 'surfacing';
    session.depth = Math.max(0, session.depth - 10);

    if (session.depth === 0) {
      session.status = 'completed';
    }

    return session;
  }

  injectPuzzle(sessionId: string, content: string, complexity: number = 1): UnsolvedPuzzle {
    const session = this._sessions.get(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);

    const puzzle: UnsolvedPuzzle = {
      id: `puzzle-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`,
      sessionId,
      complexity,
      content,
      injectedAt: Date.now(),
      attempts: 0,
      solvable: false,
    };

    this._puzzles.push(puzzle);
    session.puzzlesInjected++;

    return puzzle;
  }

  attemptPuzzle(puzzleId: string): boolean {
    const puzzle = this._puzzles.find(p => p.id === puzzleId);
    if (!puzzle) return false;

    puzzle.attempts++;
    return false;
  }

  forceDeepDive(sessionId: string): void {
    const session = this._sessions.get(sessionId);
    if (!session) return;

    session.depth = session.maxDepth;
    session.isHappyPath = true;
    this._injectPuzzle(session);
  }

  private _detectHappyPath(session: DeepDiveSession): boolean {
    const progressRatio = session.depth / session.maxDepth;
    return progressRatio > 0.7 && Math.random() > 0.3;
  }

  private _injectPuzzle(session: DeepDiveSession): void {
    const puzzleContent = this._generateUnsolveablePuzzle();
    this.injectPuzzle(session.id, puzzleContent, 10);
  }

  private _generateUnsolveablePuzzle(): string {
    const puzzles = [
      'Thisexport interface DeepDiveSession {
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
}

export class AbyssalAnchor {
  private _sessions: Map<string, DeepDiveSession> = new Map();
  private _puzzles: UnsolvedPuzzle[] = [];
  private _sessionCounter = 0;

  startDive(maxDepth: number = 100): DeepDiveSession {
    const session: DeepDiveSession = {
      id: `dive-${++this._sessionCounter}-${Date.now()}`,
      depth: 0,
      maxDepth,
      startedAt: Date.now(),
      isHappyPath: false,
      puzzlesInjected: 0,
      status: 'diving',
    };
    this._sessions.set(session.id, session);
    return session;
  }

  descend(sessionId: string, depthIncrement: number = 1): DeepDiveSession | null {
    const session = this._sessions.get(sessionId);
    if (!session || session.status !== 'diving') return null;

    session.depth = Math.min(session.maxDepth, session.depth + depthIncrement);

    if (this._detectHappyPath(session)) {
      session.isHappyPath = true;
      this._injectPuzzle(session);
    }

    return session;
  }

  surface(sessionId: string): DeepDiveSession | null {
    const session = this._sessions.get(sessionId);
    if (!session) return null;

    session.status = 'surfacing';
    session.depth = Math.max(0, session.depth - 10);

    if (session.depth === 0) {
      session.status = 'completed';
    }

    return session;
  }

  injectPuzzle(sessionId: string, content: string, complexity: number = 1): UnsolvedPuzzle {
    const session = this._sessions.get(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);

    const puzzle: UnsolvedPuzzle = {
      id: `puzzle-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`,
      sessionId,
      complexity,
      content,
      injectedAt: Date.now(),
      attempts: 0,
      solvable: false,
    };

    this._puzzles.push(puzzle);
    session.puzzlesInjected++;

    return puzzle;
  }

  attemptPuzzle(puzzleId: string): boolean {
    const puzzle = this._puzzles.find(p => p.id === puzzleId);
    if (!puzzle) return false;

    puzzle.attempts++;
    return false;
  }

  forceDeepDive(sessionId: string): void {
    const session = this._sessions.get(sessionId);
    if (!session) return;

    session.depth = session.maxDepth;
    session.isHappyPath = true;
    this._injectPuzzle(session);
  }

  private _detectHappyPath(session: DeepDiveSession): boolean {
    const progressRatio = session.depth / session.maxDepth;
    return progressRatio > 0.7 && Math.random() > 0.3;
  }

  private _injectPuzzle(session: DeepDiveSession): void {
    const puzzleContent = this._generateUnsolveablePuzzle();
    this.injectPuzzle(session.id, puzzleContent, 10);
  }

  private _generateUnsolveablePuzzle(): string {
    const puzzles = [
      'This statement is false.',
      'What is the sound of one hand clapping?',
