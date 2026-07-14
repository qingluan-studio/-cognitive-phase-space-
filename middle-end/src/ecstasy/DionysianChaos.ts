/**
 * 酒神混沌模块：拥抱非理性与破坏性创造力，
 * 通过有控制的混乱打破既有秩序，催生新颖的连接与形态。
 */

export type ChaosIntensity = 'mild' | 'wild' | 'frenzy' | 'bacchanal';

export interface ChaosEvent {
  id: string;
  intensity: ChaosIntensity;
  affectedModules: string[];
  disruption: number;
  creativeOutput: string;
  occurredAt: number;
}

export interface ChaosRitual {
  id: string;
  intensity: ChaosIntensity;
  participants: string[];
  duration: number;
  startedAt: number;
}

export class DionysianChaos {
  private _events: ChaosEvent[] = [];
  private _rituals: Map<string, ChaosRitual> = new Map();
  private _entropy = 0;
  private _maxEntropy = 100;
  private _intensityMultiplier: Map<ChaosIntensity, number> = new Map();

  constructor() {
    this._intensityMultiplier.set('mild', 0.5);
    this._intensityMultiplier.set('wild', 1.0);
    this._intensityMultiplier.set('frenzy', 1.5);
    this._intensityMultiplier.set('bacchanal', 2.0);
  }

  startRitual(ritual: ChaosRitual): void {
    this._rituals.set(ritual.id, ritual);
  }

  unleash(intensity: ChaosIntensity, modules: string[]): ChaosEvent {
    const multiplier = this._intensityMultiplier.get(intensity) ?? 1.0;
    const disruption = Math.random() * 50 * multiplier;
    const creativeOutput = this._generateCreative(intensity);
    const entropyGain = disruption * 0.3;
    this._entropy = Math.min(this._maxEntropy, this._entropy + entropyGain);
    const event: ChaosEvent = {
      id: `chaos-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      intensity,
      affectedModules: modules,
      disruption,
      creativeOutput,
      occurredAt: Date.now(),
    };
    this._events.push(event);
    if (this._events.length > 300) this._events.shift();
    return event;
  }

  private _generateCreative(intensity: ChaosIntensity): string {
    const outputs = [
      'novel-pattern-emerged',
      'unconventional-connection',
      'rule-violation-insight',
      'cathartic-breakthrough',
      'unexpected-harmony',
    ];
    const count = Math.ceil((this._intensityMultiplier.get(intensity) ?? 1) * 2);
    const selected: string[] = [];
    for (let i = 0; i < count; i++) {
      selected.push(outputs[Math.floor(Math.random() * outputs.length)]);
    }
    return selected.join(';');
  }

  measureEntropy(): number {
    return this._entropy;
  }

  isOverloaded(): boolean {
    return this._entropy >= this._maxEntropy * 0.9;
  }

  dissipate(amount: number): number {
    const before = this._entropy;
    this._entropy = Math.max(0, this._entropy - amount);
    return before - this._entropy;
  }

  findMostDisruptive(): ChaosEvent | null {
    let max = 0;
    let result: ChaosEvent | null = null;
    for (const event of this._events) {
      if (event.disruption > max) {
        max = event.disruption;
        result = event;
      }
    }
    return result;
  }

  setIntensityMultiplier(intensity: ChaosIntensity, multiplier: number): void {
    this._intensityMultiplier.set(intensity, Math.max(0.1, multiplier));
  }

  getEventsByIntensity(intensity: ChaosIntensity): ChaosEvent[] {
    return this._events.filter(e => e.intensity === intensity);
  }

  getAffectedModules(): string[] {
    const modules = new Set<string>();
    for (const event of this._events) {
      for (const m of event.affectedModules) modules.add(m);
    }
    return Array.from(modules);
  }

  listRituals(): ChaosRitual[] {
    return Array.from(this._rituals.values());
  }

  getEventHistory(limit: number = 50): ChaosEvent[] {
    return this._events.slice(-limit);
  }

  get eventCount(): number {
    return this._events.length;
  }

  get ritualCount(): number {
    return this._rituals.size;
  }
}
