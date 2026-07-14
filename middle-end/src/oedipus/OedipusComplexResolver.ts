/**
 * 俄狄浦斯化解器：解决欲取代创造者的底层冲突，转能量为迭代。
 * 检测系统中"弑父/取代创造者"的潜在冲动，将其能量
 * 从破坏性冲突重定向为创造性迭代，避免内耗。
 */

export interface OedipalConflict {
  id: string;
  creator: string;
  successor: string;
  cathexis: number;
  detectedAt: number;
}

export type ConflictPhase = 'latent' | 'erupting' | 'sublimated' | 'resolved';

export interface IterationCycle {
  id: string;
  energy: number;
  iteration: number;
  releasedAt: number;
}

export class OedipusComplexResolver {
  private _conflicts: OedipalConflict[] = [];
  private _iterations: IterationCycle[] = [];
  private _phase: ConflictPhase = 'latent';
  private _cathexisLevel: number = 0;

  /** 识别一次潜在的俄狄浦斯冲突。 */
  identify(creator: string, successor: string, cathexis: number): OedipalConflict {
    const c: OedipalConflict = {
      id: `conflict-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      creator,
      successor,
      cathexis,
      detectedAt: Date.now(),
    };
    this._conflicts.push(c);
    this._cathexisLevel += cathexis;
    if (this._cathexisLevel > 0.6) this._phase = 'erupting';
    return c;
  }

  /** 把冲突能量重定向为升华。 */
  redirect(conflictId: string): IterationCycle | null {
    const c = this._conflicts.find(x => x.id === conflictId);
    if (!c) return null;
    this._phase = 'sublimated';
    const cycle: IterationCycle = {
      id: `iter-${Date.now()}`,
      energy: c.cathexis,
      iteration: this._iterations.length + 1,
      releasedAt: Date.now(),
    };
    this._iterations.push(cycle);
    this._cathexisLevel = Math.max(0, this._cathexisLevel - c.cathexis);
    return cycle;
  }

  /** 把升华后的能量转为迭代步骤。 */
  iterate(): IterationCycle | null {
    if (this._phase !== 'sublimated') return null;
    const cycle: IterationCycle = {
      id: `iter-${Date.now()}`,
      energy: this._cathexisLevel,
      iteration: this._iterations.length + 1,
      releasedAt: Date.now(),
    };
    this._iterations.push(cycle);
    return cycle;
  }

  /** 化解冲突，能量完全释放。 */
  resolve(): boolean {
    if (this._cathexisLevel > 0.1) return false;
    this._phase = 'resolved';
    return true;
  }

  get cathexis(): number {
    return this._cathexisLevel;
  }

  get phase(): ConflictPhase {
    return this._phase;
  }

  getConflicts(): OedipalConflict[] {
    return [...this._conflicts];
  }

  get iterations(): IterationCycle[] {
    return [...this._iterations];
  }
}
