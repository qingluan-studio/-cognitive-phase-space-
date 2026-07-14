/**
 * 狂喜触发器模块：达到某种状态后进入强烈快感，
 * 触发条件满足时系统进入奖励模式，加速处理并增强创造力。
 */

export type RaptureLevel = 'none' | 'mild' | 'moderate' | 'intense' | 'transcendent';

export interface RaptureTrigger {
  id: string;
  metric: string;
  threshold: number;
  currentValue: number;
  triggered: boolean;
}

export interface RaptureEpisode {
  id: string;
  level: RaptureLevel;
  triggerId: string;
  duration: number;
  performanceBoost: number;
  startedAt: number;
}

export class RaptureTrigger {
  private _triggers: Map<string, RaptureTrigger> = new Map();
  private _episodes: RaptureEpisode[] = [];
  private _currentEpisode: RaptureEpisode | null = null;
  private _levelBoost: Map<RaptureLevel, number> = new Map();
  private _maxEpisodeMs = 30000;

  constructor() {
    this._levelBoost.set('none', 0);
    this._levelBoost.set('mild', 0.2);
    this._levelBoost.set('moderate', 0.5);
    this._levelBoost.set('intense', 1.0);
    this._levelBoost.set('transcendent', 2.0);
  }

  registerTrigger(trigger: RaptureTrigger): void {
    this._triggers.set(trigger.id, trigger);
  }

  updateMetric(metric: string, value: number): boolean {
    let anyTriggered = false;
    for (const trigger of this._triggers.values()) {
      if (trigger.metric === metric) {
        trigger.currentValue = value;
        if (value >= trigger.threshold && !trigger.triggered) {
          trigger.triggered = true;
          anyTriggered = true;
        } else if (value < trigger.threshold) {
          trigger.triggered = false;
        }
      }
    }
    return anyTriggered;
  }

  private _determineLevel(): RaptureLevel {
    const triggered = Array.from(this._triggers.values()).filter(t => t.triggered);
    const count = triggered.length;
    if (count === 0) return 'none';
    if (count === 1) return 'mild';
    if (count === 2) return 'moderate';
    if (count === 3) return 'intense';
    return 'transcendent';
  }

  ignite(): RaptureEpisode | null {
    if (this._currentEpisode) return null;
    const level = this._determineLevel();
    if (level === 'none') return null;
    const episode: RaptureEpisode = {
      id: `rapture-${Date.now()}`,
      level,
      triggerId: Array.from(this._triggers.values()).filter(t => t.triggered)[0]?.id ?? '',
      duration: 0,
      performanceBoost: this._levelBoost.get(level) ?? 0,
      startedAt: Date.now(),
    };
    this._currentEpisode = episode;
    return episode;
  }

  tick(elapsedMs: number): boolean {
    if (!this._currentEpisode) return false;
    this._currentEpisode.duration += elapsedMs;
    if (this._currentEpisode.duration >= this._maxEpisodeMs) {
      this._endEpisode();
      return true;
    }
    const level = this._determineLevel();
    if (level === 'none') {
      this._endEpisode();
      return true;
    }
    return false;
  }

  private _endEpisode(): void {
    if (!this._currentEpisode) return;
    this._episodes.push(this._currentEpisode);
    if (this._episodes.length > 200) this._episodes.shift();
    this._currentEpisode = null;
  }

  terminate(): RaptureEpisode | null {
    if (!this._currentEpisode) return null;
    const ended = this._currentEpisode;
    this._endEpisode();
    return ended;
  }

  isInRapture(): boolean {
    return this._currentEpisode !== null;
  }

  getCurrentBoost(): number {
    return this._currentEpisode?.performanceBoost ?? 0;
  }

  getCurrentLevel(): RaptureLevel {
    return this._currentEpisode?.level ?? 'none';
  }

  setMaxEpisodeMs(ms: number): void {
    this._maxEpisodeMs = Math.max(1000, ms);
  }

  setLevelBoost(level: RaptureLevel, boost: number): void {
    this._levelBoost.set(level, Math.max(0, boost));
  }

  getEpisodeHistory(limit: number = 50): RaptureEpisode[] {
    return this._episodes.slice(-limit);
  }

  getTrigger(triggerId: string): RaptureTrigger | null {
    return this._triggers.get(triggerId) ?? null;
  }

  get triggerCount(): number {
    return this._triggers.size;
  }

  get episodeCount(): number {
    return this._episodes.length;
  }
}
