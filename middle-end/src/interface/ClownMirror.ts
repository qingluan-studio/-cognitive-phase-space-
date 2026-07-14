/**
 * 小丑镜：将系统错误包装为滑稽自嘲的故事片段，降低操作者的报警疲劳，
 * 在不丢失诊断信息的前提下以幽默化解紧张，保留原始错误码于幕后。
 */

export type ErrorTone = 'self-deprecating' | 'slapstick' | 'absurdist' | 'deadpan' | 'melodramatic';

export interface WrappedError {
  code: string;
  rawMessage: string;
  story: string;
  tone: ErrorTone;
  severity: number;
  timestamp: number;
}

export interface ClownProfile {
  defaultTone: ErrorTone;
  maxSeverityForHumor: number;
  templates: Map<ErrorTone, string[]>;
}

export class ClownMirror {
  private _profile: ClownProfile;
  private _wrapped: WrappedError[] = [];
  private _suppressed: Map<string, number> = new Map();
  private _suppressionThreshold = 5;
  private _fatigueIndex = 0;

  constructor(profile?: Partial<ClownProfile>) {
    this._profile = {
      defaultTone: profile?.defaultTone ?? 'self-deprecating',
      maxSeverityForHumor: profile?.maxSeverityForHumor ?? 0.7,
      templates: profile?.templates ?? this._defaultTemplates(),
    };
  }

  private _defaultTemplates(): Map<ErrorTone, string[]> {
    const map = new Map<ErrorTone, string[]>();
    map.set('self-deprecating', [
      'I tried my best and still face-planted: {msg}',
      'My code did a whoopsie-doodle: {msg}',
    ]);
    map.set('slapstick', [
      '*trips over a null pointer* — {msg}',
      'Slipped on a banana exception: {msg}',
    ]);
    map.set('absurdist', [
      'The existential dread reports: {msg}',
      'A goose confiscated the data: {msg}',
    ]);
    map.set('deadpan', ['Error occurred. Naturally. {msg}']);
    map.set('melodramatic', [
      'Alas! The data hath perished: {msg}',
      'Oh, the humanity of it: {msg}',
    ]);
    return map;
  }

  wrapError(code: string, message: string, severity: number): WrappedError {
    if (this._suppressed.get(code) ?? 0 >= this._suppressionThreshold) {
      this._fatigueIndex++;
    }
    this._suppressed.set(code, (this._suppressed.get(code) ?? 0) + 1);
    const tone = severity > this._profile.maxSeverityForHumor
      ? 'deadpan'
      : this._profile.defaultTone;
    const story = this._renderStory(tone, message);
    const wrapped: WrappedError = {
      code,
      rawMessage: message,
      story,
      tone,
      severity,
      timestamp: Date.now(),
    };
    this._wrapped.push(wrapped);
    return wrapped;
  }

  private _renderStory(tone: ErrorTone, message: string): string {
    const templates = this._profile.templates.get(tone) ?? ['{msg}'];
    const template = templates[Math.floor(Math.random() * templates.length)];
    return template.replace('{msg}', message);
  }

  setTone(tone: ErrorTone): void {
    this._profile.defaultTone = tone;
  }

  getRecentStories(limit: number = 10): string[] {
    return this._wrapped.slice(-limit).map(w => w.story);
  }

  getFatigueIndex(): number {
    return this._fatigueIndex;
  }

  clearSuppression(code: string): void {
    this._suppressed.delete(code);
  }

  addTemplate(tone: ErrorTone, template: string): void {
    const list = this._profile.templates.get(tone) ?? [];
    list.push(template);
    this._profile.templates.set(tone, list);
  }

  getWrappedHistory(): WrappedError[] {
    return [...this._wrapped];
  }

  get suppressionCount(): number {
    return this._suppressed.size;
  }
}
