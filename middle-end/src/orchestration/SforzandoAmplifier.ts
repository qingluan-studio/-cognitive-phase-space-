/** 突强放大器 - 对特定响应突然增强，制造戏剧重音 */

export interface AmplificationTarget {
  id: string;
  selector: string;
  baseGain: number;
  peakGain: number;
}

export interface AccentEvent {
  id: string;
  targetId: string;
  triggeredAt: number;
  intensity: number;
  duration: number;
}

export interface AmplifiedResponse {
  targetId: string;
  original: Record<string, unknown>;
  amplified: Record<string, unknown>;
  gain: number;
}

export class SforzandoAmplifier {
  private _targets: Map<string, AmplificationTarget> = new Map();
  private _events: AccentEvent[] = [];
  private _idCounter = 0;
  private _defaultDuration = 500;
  private _cooldown = 1000;
  private _lastTriggerAt = 0;

  registerTarget(selector: string, baseGain: number = 1, peakGain: number = 5): AmplificationTarget {
    if (baseGain < 0 || peakGain < baseGain) {
      throw new Error('Invalid gain configuration');
    }
    const id = `target-${++this._idCounter}-${Date.now()}`;
    const target: AmplificationTarget = { id, selector, baseGain, peakGain };
    this._targets.set(id, target);
    return target;
  }

  trigger(targetId: string, intensity: number = 1, duration?: number): AccentEvent {
    const target = this._targets.get(targetId);
    if (!target) throw new Error(`Target not found: ${targetId}`);
    const now = Date.now();
    if (now - this._lastTriggerAt < this._cooldown) {
      throw new Error('Amplifier in cooldown');
    }
    const event: AccentEvent = {
      id: `accent-${++this._idCounter}-${now}`,
      targetId,
      triggeredAt: now,
      intensity: Math.max(0, Math.min(1, intensity)),
      duration: duration ?? this._defaultDuration,
    };
    this._events.push(event);
    this._lastTriggerAt = now;
    return event;
  }

  amplify(targetId: string, response: Record<string, unknown>): AmplifiedResponse {
    const target = this._targets.get(targetId);
    if (!target) throw new Error(`Target not found: ${targetId}`);
    const recent = this._events.filter(
      e => e.targetId === targetId && Date.now() - e.triggeredAt < e.duration
    );
    const gain =
      recent.length > 0
        ? target.baseGain + (target.peakGain - target.baseGain) * recent[0].intensity
        : target.baseGain;
    const amplified = this._applyGain(response, gain);
    return { targetId, original: response, amplified, gain };
  }

  setCooldown(cd: number): void {
    if (cd < 0) throw new Error('Cooldown must be non-negative');
    this._cooldown = cd;
  }

  setDefaultDuration(d: number): void {
    if (d <= 0) throw new Error('Duration must be positive');
    this._defaultDuration = d;
  }

  removeTarget(targetId: string): boolean {
    return this._targets.delete(targetId);
  }

  getTarget(id: string): AmplificationTarget | undefined {
    return this._targets.get(id);
  }

  findTargetBySelector(selector: string): AmplificationTarget | undefined {
    return Array.from(this._targets.values()).find(t => t.selector === selector);
  }

  get events(): AccentEvent[] {
    return [...this._events];
  }

  get activeAccents(): AccentEvent[] {
    const now = Date.now();
    return this._events.filter(e => now - e.triggeredAt < e.duration);
  }

  get cooldown(): number {
    return this._cooldown;
  }

  get defaultDuration(): number {
    return this._defaultDuration;
  }

  get targetCount(): number {
    return this._targets.size;
  }

  private _applyGain(response: Record<string, unknown>, gain: number): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(response)) {
      if (typeof value === 'number') {
        result[key] = value * gain;
      } else if (typeof value === 'string') {
        result[key] = gain > 2 ? value.toUpperCase() : value;
      } else {
        result[key] = value;
      }
    }
    result['__gain'] = gain;
    return result;
  }
}
