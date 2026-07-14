/**
 * ActionAtDistance - 超距作用
 * 非接触式地传递影响，不依赖直接物理接触即可改变远处
 * 实体的状态，类似量子纠缠或引力作用。
 */

export interface ActionAtDistanceData {
  readonly actionId: string;
  sourceId: string;
  influenceStrength: number;
  entangledTargets: string[];
}

export interface DistanceAction {
  targetId: string;
  effect: number;
  delay: number;
  applied: boolean;
}

export class ActionAtDistance {
  private _data: ActionAtDistanceData;
  private _actions: DistanceAction[] = [];
  private _totalEffects: number = 0;
  private _quantumLink: Map<string, number> = new Map();
  private _decoherenceLevel: number = 0;

  constructor(data: ActionAtDistanceData) {
    this._data = { ...data, entangledTargets: [...data.entangledTargets] };
    this._data.entangledTargets.forEach((t) => this._quantumLink.set(t, 1));
  }

  get actionId(): string {
    return this._data.actionId;
  }

  get sourceId(): string {
    return this._data.sourceId;
  }

  get entangledCount(): number {
    return this._quantumLink.size;
  }

  public entangle(targetId: string, linkStrength: number): void {
    this._quantumLink.set(targetId, Math.max(0, Math.min(1, linkStrength)));
    if (!this._data.entangledTargets.includes(targetId)) {
      this._data.entangledTargets.push(targetId);
    }
  }

  public exert(effect: number, delay: number): DistanceAction[] {
    const results: DistanceAction[] = [];
    this._quantumLink.forEach((strength, targetId) => {
      const actualEffect = effect * strength * (1 - this._decoherenceLevel);
      const action: DistanceAction = {
        targetId,
        effect: actualEffect,
        delay,
        applied: actualEffect > 0.01,
      };
      results.push(action);
      this._actions.push(action);
      if (this._actions.length > 40) {
        this._actions.shift();
      }
      if (action.applied) {
        this._totalEffects += actualEffect;
        this._degradeLink(targetId);
      }
    });
    return results;
  }

  private _degradeLink(targetId: string): void {
    const current = this._quantumLink.get(targetId) ?? 0;
    const degraded = current * 0.95;
    this._quantumLink.set(targetId, degraded);
    this._decoherenceLevel = Math.min(1, this._decoherenceLevel + 0.02);
    if (degraded < 0.05) {
      this._quantumLink.delete(targetId);
    }
  }

  public reinforceLink(targetId: string, amount: number): void {
    const current = this._quantumLink.get(targetId) ?? 0;
    this._quantumLink.set(targetId, Math.min(1, current + amount));
    this._decoherenceLevel = Math.max(0, this._decoherenceLevel - 0.05);
  }

  public measureCorrelation(targetId: string): number {
    return this._quantumLink.get(targetId) ?? 0;
  }

  public adjustInfluenceStrength(delta: number): void {
    this._data.influenceStrength = Math.max(0, this._data.influenceStrength + delta);
  }

  public disentangle(targetId: string): void {
    this._quantumLink.delete(targetId);
    const idx = this._data.entangledTargets.indexOf(targetId);
    if (idx >= 0) {
      this._data.entangledTargets.splice(idx, 1);
    }
  }

  public isCoherent(): boolean {
    return this._decoherenceLevel < 0.5 && this._quantumLink.size > 0;
  }

  public actionReport(): Record<string, unknown> {
    return {
      actionId: this.actionId,
      sourceId: this.sourceId,
      influenceStrength: this._data.influenceStrength.toFixed(3),
      entangledCount: this.entangledCount,
      decoherenceLevel: this._decoherenceLevel.toFixed(3),
      totalEffects: this._totalEffects.toFixed(2),
      actionCount: this._actions.length,
      coherent: this.isCoherent(),
    };
  }
}
