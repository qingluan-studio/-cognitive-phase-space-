/**
 * 永恒梦境：系统始终处于浅梦处理状态。
 * 系统不进入完全清醒态，而是保持浅梦处理：信息以联想、变形、跳跃方式被处理。
 */

export interface DreamFragment {
  id: string;
  content: string;
  associations: string[];
  distortionLevel: number;
}

export interface DreamCycle {
  id: string;
  fragments: string[];
  depth: number;
  startedAt: number;
  endedAt: number | null;
}

export class EternalDreaming {
  private _fragments: Map<string, DreamFragment> = new Map();
  private _cycles: DreamCycle[] = [];
  private _currentCycle: DreamCycle | null = null;
  private _dreamDepth = 0.4;
  private _maxCycles = 100;

  ingest(fragment: DreamFragment): void {
    fragment.distortionLevel = this._dreamDepth * Math.random();
    this._fragments.set(fragment.id, fragment);
  }

  beginCycle(): DreamCycle {
    if (this._currentCycle) this.endCycle();
    this._currentCycle = {
      id: `dream-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      fragments: [],
      depth: this._dreamDepth,
      startedAt: Date.now(),
      endedAt: null,
    };
    return this._currentCycle;
  }

  processFragment(fragmentId: string): DreamFragment | null {
    const fragment = this._fragments.get(fragmentId);
    if (!fragment || !this._currentCycle) return null;
    fragment.distortionLevel = Math.min(1, fragment.distortionLevel + this._dreamDepth * 0.1);
    this._currentCycle.fragments.push(fragmentId);
    return fragment;
  }

  endCycle(): DreamCycle | null {
    if (!this._currentCycle) return null;
    this._currentCycle.endedAt = Date.now();
    this._cycles.push(this._currentCycle);
    if (this._cycles.length > this._maxCycles) this._cycles.shift();
    const finished = this._currentCycle;
    this._currentCycle = null;
    return finished;
  }

  setDepth(value: number): void {
    this._dreamDepth = Math.max(0, Math.min(1, value));
  }

  associate(fragmentId: string, association: string): DreamFragment | null {
    const fragment = this._fragments.get(fragmentId);
    if (!fragment) return null;
    fragment.associations.push(association);
    return fragment;
  }

  getCycles(): DreamCycle[] {
    return [...this._cycles];
  }

  getFragment(id: string): DreamFragment | null {
    return this._fragments.get(id) ?? null;
  }

  get fragmentCount(): number {
    return this._fragments.size;
  }
}
