export interface AmplificationTarget {
  id: string;
  selector: string;
  baseGain: number;
  peakGain: number;
  attackTime: number;
  decayTime: number;
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
  envelopePhase: number;
  activeEvents: number;
}

export class SforzandoAmplifier {
  private _targets: Map<string, AmplificationTarget> = new Map();
  private _events: AccentEvent[] = [];
  private _idCounter = 0;
  private _defaultDuration = 500;
  private _cooldown = 1000;
  private _lastTriggerAt = 0;
  private _maxConcurrentEvents = 3;

  registerTarget(
    selector: string,
    baseGain: number = 1,
    peakGain: number = 5,
    attackTime: number = 50,
    decayTime: number = 200
  ): AmplificationTarget {
    if (baseGain < 0 || peakGain < baseGain) {
      throw new Error('Invalid gain configuration');
    }
    if (attackTime < 0 || decayTime < 0) {
      throw new Error('Time constants must be non-negative');
    }
    const id = `target-${++this._idCounter}-${Date.now()}`;
    const target: AmplificationTarget = { id, selector, baseGain, peakGain, attackTime, decayTime };
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
    const activeCount = this._events.filter(
      e => e.targetId === targetId && now - e.triggeredAt < e.duration
    ).length;
    if (activeCount >= this._maxConcurrentEvents) {
      throw new Error('Maximum concurrent accents exceeded');
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
    const now = Date.now();
    const activeEvents = this._events.filter(
      e => e.targetId === targetId && now - e.triggeredAt < e.duration
    );
    const gains = activeEvents.map(e => this._computeEnvelopeGain(target, e, now));
    const combinedGain = this._combineGains(gains, target.baseGain, target.peakGain);
    const envelopePhase = activeEvents.length > 0 ? this._computePhase(activeEvents[0], now) : 0;
    const amplified = this._applyGain(response, combinedGain);
    return { targetId, original: response, amplified, gain: combinedGain, envelopePhase, activeEvents: activeEvents.length };
  }

  setCooldown(cd: number): void {
    if (cd < 0) throw new Error('Cooldown must be non-negative');
    this._cooldown = cd;
  }

  setDefaultDuration(d: number): void {
    if (d <= 0) throw new Error('Duration must be positive');
    this._defaultDuration = d;
  }

  setMaxConcurrentEvents(n: number): void {
    if (n < 1) throw new Error('Must allow at least one concurrent event');
    this._maxConcurrentEvents = n;
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

  get maxConcurrentEvents(): number {
    return this._maxConcurrentEvents;
  }

  private _computeEnvelopeGain(target: AmplificationTarget, event: AccentEvent, now: number): number {
    const elapsed = now - event.triggeredAt;
    const t = elapsed / event.duration;
    if (t <= 0) return target.baseGain;
    if (t >= 1) return target.baseGain;
    const attackRatio = target.attackTime / event.duration;
    const decayRatio = target.decayTime / event.duration;
    let normalizedTime: number;
    if (t < attackRatio) {
      normalizedTime = t / attackRatio;
      return target.baseGain + (target.peakGain - target.baseGain) * (1 - Math.exp(-6 * normalizedTime));
    } else {
      normalizedTime = (t - attackRatio) / (1 - attackRatio);
      const peak = target.baseGain + (target.peakGain - target.baseGain) * event.intensity;
      return peak * Math.exp(-(6 * decayRatio) * normalizedTime);
    }
  }

  private _combineGains(gains: number[], baseGain: number, peakGain: number): number {
    if (gains.length === 0) return baseGain;
    const maxGain = gains.reduce((a, b) => Math.max(a, b), 0);
    const sumGains = gains.reduce((a, b) => a + b, 0);
    const combined = baseGain + (sumGains - gains.length * baseGain) * (1 / gains.length);
    return Math.min(combined, peakGain);
  }

  private _computePhase(event: AccentEvent, now: number): number {
    const elapsed = now - event.triggeredAt;
    return Math.sin((elapsed / event.duration) * Math.PI);
  }

  private _applyGain(response: Record<string, unknown>, gain: number): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(response)) {
      if (typeof value === 'number') {
        result[key] = this._applyGainToNumber(value, gain);
      } else if (typeof value === 'string') {
        result[key] = gain > 2 ? value.toUpperCase() : value;
      } else if (Array.isArray(value)) {
        result[key] = value.map(v => (typeof v === 'number' ? this._applyGainToNumber(v, gain) : v));
      } else if (typeof value === 'object' && value !== null) {
        result[key] = this._applyGain(value as Record<string, unknown>, gain);
      } else {
        result[key] = value;
      }
    }
    result['__gain'] = gain;
    result['__gainLog'] = Math.log10(gain);
    return result;
  }

  private _applyGainToNumber(value: number, gain: number): number {
    if (gain <= 1) return value * gain;
    const effectiveGain = 1 + (gain - 1) * 0.7;
    return value * effectiveGain + (gain - 1) * 0.3 * Math.abs(value);
  }
}