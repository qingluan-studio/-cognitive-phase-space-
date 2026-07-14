/**
 * 触觉翻译：将数据紧迫性与严重性转化为振动模式与力度参数，
 * 让系统状态以体感方式传递给操作者，超越视觉告警的注意力瓶颈。
 */

export type VibrationPattern = 'pulse' | 'ramp' | 'staccato' | 'tremor' | 'heartbeat' | 'silent';

export interface UrgencyReading {
  source: string;
  severity: number;
  urgency: number;
  timestamp: number;
}

export interface HapticSignal {
  pattern: VibrationPattern;
  intensity: number;
  duration: number;
  frequency: number;
}

export interface TranslationRule {
  severityRange: [number, number];
  pattern: VibrationPattern;
  baseIntensity: number;
}

export class HapticTranslation {
  private _rules: TranslationRule[] = [];
  private _signals: Map<string, HapticSignal> = new Map();
  private _history: UrgencyReading[] = [];
  private _mutedSources: Set<string> = new Set();
  private _maxIntensity = 1.0;

  addRule(rule: TranslationRule): void {
    this._rules.push(rule);
    this._rules.sort((a, b) => a.severityRange[0] - b.severityRange[0]);
  }

  translate(reading: UrgencyReading): HapticSignal {
    this._history.push(reading);
    if (this._mutedSources.has(reading.source)) {
      return { pattern: 'silent', intensity: 0, duration: 0, frequency: 0 };
    }
    const rule = this._matchRule(reading.severity);
    const urgencyBoost = reading.urgency * 0.3;
    const intensity = Math.min(
      this._maxIntensity,
      (rule?.baseIntensity ?? 0.5) + urgencyBoost
    );
    const signal: HapticSignal = {
      pattern: rule?.pattern ?? 'pulse',
      intensity,
      duration: this._computeDuration(reading.urgency),
      frequency: this._computeFrequency(reading.severity),
    };
    this._signals.set(reading.source, signal);
    return signal;
  }

  private _matchRule(severity: number): TranslationRule | undefined {
    return this._rules.find(r => severity >= r.severityRange[0] && severity <= r.severityRange[1]);
  }

  private _computeDuration(urgency: number): number {
    return Math.round(100 + urgency * 500);
  }

  private _computeFrequency(severity: number): number {
    return Math.round(20 + severity * 180);
  }

  mute(source: string): void {
    this._mutedSources.add(source);
  }

  unmute(source: string): void {
    this._mutedSources.delete(source);
  }

  getSignal(source: string): HapticSignal | undefined {
    return this._signals.get(source);
  }

  getAllActiveSignals(): Map<string, HapticSignal> {
    return new Map(this._signals);
  }

  clearSignals(): void {
    this._signals.clear();
  }

  setMaxIntensity(value: number): void {
    this._maxIntensity = Math.max(0, Math.min(1, value));
  }

  getHistory(): UrgencyReading[] {
    return [...this._history];
  }

  get ruleCount(): number {
    return this._rules.length;
  }
}
