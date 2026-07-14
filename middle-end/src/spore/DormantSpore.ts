/**
 * 休眠孢子模块：在极端条件下进入休眠状态以保存核心功能单元，
 * 待环境恢复后再激活。仿生自细菌芽孢与真菌休眠孢子的生存策略。
 */

export type SporeState = 'dormant' | 'germinating' | 'active' | 'dead';

export interface SporeData {
  id: string;
  payload: Record<string, unknown>;
  createdAt: number;
  resistance: number;
  state: SporeState;
}

export interface DormancyReport {
  sporeId: string;
  duration: number;
  finalState: SporeState;
  survived: boolean;
}

export class DormantSpore {
  private _spores: Map<string, SporeData> = new Map();
  private _sleepStart: Map<string, number> = new Map();
  private _threshold = 0.6;
  private _maxResistance = 1.0;

  encapsulate(id: string, payload: Record<string, unknown>, resistance: number): SporeData {
    const spore: SporeData = {
      id,
      payload,
      createdAt: Date.now(),
      resistance: Math.min(resistance, this._maxResistance),
      state: 'dormant',
    };
    this._spores.set(id, spore);
    this._sleepStart.set(id, Date.now());
    return spore;
  }

  enterDormancy(sporeId: string, envSeverity: number): boolean {
    const spore = this._spores.get(sporeId);
    if (!spore) return false;
    if (envSeverity < this._threshold) return false;
    spore.state = 'dormant';
    this._sleepStart.set(sporeId, Date.now());
    return true;
  }

  tolerate(sporeId: string, severity: number): boolean {
    const spore = this._spores.get(sporeId);
    if (!spore) return false;
    if (spore.state === 'dead') return false;
    return spore.resistance >= severity;
  }

  awaken(sporeId: string): SporeState {
    const spore = this._spores.get(sporeId);
    if (!spore) return 'dead';
    if (spore.state !== 'dormant') return spore.state;
    spore.state = 'germinating';
    return spore.state;
  }

  confirmActive(sporeId: string): boolean {
    const spore = this._spores.get(sporeId);
    if (!spore || spore.state !== 'germinating') return false;
    spore.state = 'active';
    return true;
  }

  kill(sporeId: string): boolean {
    const spore = this._spores.get(sporeId);
    if (!spore) return false;
    spore.state = 'dead';
    return true;
  }

  reportDormancy(sporeId: string): DormancyReport | null {
    const spore = this._spores.get(sporeId);
    if (!spore) return null;
    const start = this._sleepStart.get(sporeId) ?? spore.createdAt;
    return {
      sporeId,
      duration: Date.now() - start,
      finalState: spore.state,
      survived: spore.state !== 'dead',
    };
  }

  listByState(state: SporeState): SporeData[] {
    return Array.from(this._spores.values()).filter(s => s.state === state);
  }

  get sporeCount(): number {
    return this._spores.size;
  }

  get dormantCount(): number {
    return this.listByState('dormant').length;
  }
}
