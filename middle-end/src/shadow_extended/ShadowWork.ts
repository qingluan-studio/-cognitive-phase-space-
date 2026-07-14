/**
 * 影子工作模块：深入处理被压抑的部分，通过逐步揭露实现转化。
 * 用于系统性地面对并整合内在阴影。
 */

export interface ShadowSession {
  id: number;
  target: string;
  depth: number;
  progress: number;
  completed: boolean;
}

export type ShadowWorkReport = {
  sessions: number;
  completed: number;
  averageDepth: number;
  totalProgress: number;
};

export interface ShadowWorkConfig {
  maxDepth: number;
  stepSize: number;
  maxSessions: number;
}

export class ShadowWork {
  private _config: ShadowWorkConfig;
  private _sessions: ShadowSession[] = [];
  private _nextId: number = 0;
  private _current: ShadowSession | null = null;
  private _state: Record<string, unknown> = {};

  constructor(config: ShadowWorkConfig) {
    this._config = config;
  }

  get sessionCount(): number {
    return this._sessions.length;
  }

  get completedCount(): number {
    return this._sessions.filter((s) => s.completed).length;
  }

  get currentSession(): ShadowSession | null {
    return this._current;
  }

  begin(target: string): ShadowSession {
    const session: ShadowSession = {
      id: this._nextId++,
      target,
      depth: 0,
      progress: 0,
      completed: false,
    };
    this._sessions.push(session);
    if (this._sessions.length > this._config.maxSessions) {
      this._sessions.shift();
    }
    this._current = session;
    this._state.beganAt = Date.now();
    return session;
  }

  descend(): number {
    if (!this._current) return 0;
    this._current.depth = Math.min(this._config.maxDepth, this._current.depth + this._config.stepSize);
    this._current.progress = this._current.depth / this._config.maxDepth;
    return this._current.depth;
  }

  process(engagement: number): void {
    if (!this._current) return;
    this._current.progress = Math.min(1, this._current.progress + engagement * 0.1);
    if (this._current.progress >= 1) {
      this._current.completed = true;
      this._current.depth = this._config.maxDepth;
      this._state.lastCompleted = this._current.id;
    }
  }

  complete(): boolean {
    if (!this._current || this._current.completed) return false;
    this._current.completed = true;
    this._current.progress = 1;
    this._state.completedAt = Date.now();
    return true;
  }

  report(): ShadowWorkReport {
    const completed = this.completedCount;
    const averageDepth =
      this._sessions.length > 0
        ? this._sessions.reduce((acc, s) => acc + s.depth, 0) / this._sessions.length
        : 0;
    const totalProgress = this._sessions.reduce((acc, s) => acc + s.progress, 0);
    return { sessions: this._sessions.length, completed, averageDepth, totalProgress };
  }

  deepestSession(): ShadowSession | null {
    if (this._sessions.length === 0) return null;
    return this._sessions.reduce((best, s) => (s.depth > best.depth ? s : best));
  }

  isStuck(): boolean {
    if (!this._current) return false;
    return this._current.progress < 0.1 && this._current.depth > 0;
  }

  reset(): void {
    this._sessions = [];
    this._current = null;
    this._state.resetAt = Date.now();
  }

  summary(): Record<string, unknown> {
    return {
      sessions: this._sessions.length,
      completed: this.completedCount,
      current: this._current,
      state: this._state,
    };
  }
}
