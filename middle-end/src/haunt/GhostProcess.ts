/**
 * 幽灵进程：已死模块的幽灵仍在后台徘徊。
 * 已终止的模块仍以幽灵形式存在于后台，偶尔被检测到产生幻影活动。
 */

export type GhostState = 'dormant' | 'wandering' | 'manifesting' | 'exorcised';

export interface GhostManifestation {
  id: string;
  moduleId: string;
  state: GhostState;
  activity: string;
  intensity: number;
  manifestedAt: number;
}

export class GhostProcess {
  private _ghosts: Map<string, GhostManifestation> = new Map();
  private _hauntingLog: GhostManifestation[] = [];
  private _detectionThreshold = 0.3;
  private _exorcisedCount = 0;

  summon(moduleId: string, activity: string = 'phantom-computation'): GhostManifestation {
    const ghost: GhostManifestation = {
      id: `ghost-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      moduleId,
      state: 'wandering',
      activity,
      intensity: Math.random(),
      manifestedAt: Date.now(),
    };
    this._ghosts.set(ghost.id, ghost);
    return ghost;
  }

  manifest(ghostId: string): GhostManifestation | null {
    const ghost = this._ghosts.get(ghostId);
    if (!ghost || ghost.state === 'exorcised') return null;
    ghost.state = 'manifesting';
    ghost.intensity = Math.min(1, ghost.intensity + 0.2);
    ghost.manifestedAt = Date.now();
    this._hauntingLog.push({ ...ghost });
    if (this._hauntingLog.length > 200) this._hauntingLog.shift();
    return ghost;
  }

  detect(): GhostManifestation[] {
    const detected: GhostManifestation[] = [];
    for (const ghost of this._ghosts.values()) {
      if (ghost.state === 'exorcised') continue;
      if (ghost.intensity >= this._detectionThreshold) {
        detected.push({ ...ghost });
      }
    }
    return detected;
  }

  exorcise(ghostId: string): boolean {
    const ghost = this._ghosts.get(ghostId);
    if (!ghost) return false;
    ghost.state = 'exorcised';
    ghost.intensity = 0;
    this._exorcisedCount++;
    return true;
  }

  banishAll(): number {
    let count = 0;
    for (const ghost of this._ghosts.values()) {
      if (ghost.state !== 'exorcised') {
        ghost.state = 'exorcised';
        ghost.intensity = 0;
        count++;
      }
    }
    this._exorcisedCount += count;
    return count;
  }

  decay(ghostId: string, amount: number = 0.1): GhostManifestation | null {
    const ghost = this._ghosts.get(ghostId);
    if (!ghost) return null;
    ghost.intensity = Math.max(0, ghost.intensity - amount);
    if (ghost.intensity < this._detectionThreshold) {
      ghost.state = 'dormant';
    }
    return ghost;
  }

  getHauntingLog(limit: number = 50): GhostManifestation[] {
    return this._hauntingLog.slice(-limit);
  }

  get activeGhostCount(): number {
    let count = 0;
    for (const g of this._ghosts.values()) {
      if (g.state !== 'exorcised') count++;
    }
    return count;
  }

  get exorcisedCount(): number {
    return this._exorcisedCount;
  }
}
