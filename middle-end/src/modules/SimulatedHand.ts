export type ManipulationMode = 'playwright' | 'fetch' | 'hybrid';

export interface HandAction {
  type: 'click' | 'type' | 'scroll' | 'hover' | 'wait' | 'submit';
  target: string;
  value?: string;
  delay: number;
  timestamp: number;
  jitter: number;
  precision: number;
}

export interface HandProfile {
  typingSpeed: number;
  clickJitter: number;
  scrollPause: number;
  humanLike: boolean;
  fatigueFactor: number;
  errorRate: number;
  rhythmPattern: number[];
}

export interface ActionResult {
  actionId: string;
  mode: ManipulationMode;
  success: boolean;
  duration: number;
  artifact: Record<string, unknown>;
  precision: number;
  error: string | null;
}

export interface RhythmSignature {
  meanInterval: number;
  variance: number;
  entropy: number;
  patternScore: number;
}

export class SimulatedHand {
  private _mode: ManipulationMode;
  private _profile: HandProfile;
  private _actions: HandAction[] = [];
  private _results: ActionResult[] = [];
  private _actionCounter = 0;
  private _sessionStartTime = Date.now();
  private _cumulativeFatigue = 0;
  private _rhythmIndex = 0;

  constructor(mode: ManipulationMode = 'hybrid', profile?: Partial<HandProfile>) {
    this._mode = mode;
    this._profile = {
      typingSpeed: profile?.typingSpeed ?? 80,
      clickJitter: profile?.clickJitter ?? 15,
      scrollPause: profile?.scrollPause ?? 400,
      humanLike: profile?.humanLike ?? true,
      fatigueFactor: profile?.fatigueFactor ?? 0.001,
      errorRate: profile?.errorRate ?? 0.02,
      rhythmPattern: profile?.rhythmPattern ?? this._generateRhythmPattern(),
    };
  }

  private _generateRhythmPattern(): number[] {
    const pattern: number[] = [];
    for (let i = 0; i < 10; i++) {
      pattern.push(0.8 + Math.random() * 0.4);
    }
    return pattern;
  }

  private _jitter(base: number): number {
    if (!this._profile.humanLike) return base;
    const fatigueModifier = 1 + this._cumulativeFatigue;
    const rhythmMod = this._profile.rhythmPattern[this._rhythmIndex % this._profile.rhythmPattern.length];
    this._rhythmIndex++;
    const jitterAmount = (Math.random() - 0.5) * this._profile.clickJitter * 2;
    return Math.max(0, base * rhythmMod * fatigueModifier + jitterAmount);
  }

  private _resolveMode(action: HandAction): ManipulationMode {
    if (this._mode !== 'hybrid') return this._mode;
    return action.type === 'click' || action.type === 'scroll' ? 'playwright' : 'fetch';
  }

  private _calculatePrecision(): number {
    const fatigueEffect = 1 - this._cumulativeFatigue * 0.5;
    const randomVariation = 0.95 + Math.random() * 0.1;
    return Math.min(1, Math.max(0.7, fatigueEffect * randomVariation));
  }

  perform(type: HandAction['type'], target: string, value?: string): ActionResult {
    this._actionCounter++;
    this._cumulativeFatigue += this._profile.fatigueFactor;

    const baseDelay = this._getBaseDelay(type);
    const jitter = this._jitter(baseDelay);
    const precision = this._calculatePrecision();

    const action: HandAction = {
      type,
      target,
      value,
      delay: jitter,
      timestamp: Date.now(),
      jitter: Math.abs(jitter - baseDelay),
      precision,
    };

    this._actions.push(action);

    const mode = this._resolveMode(action);
    const start = Date.now();

    let success = true;
    let error: string | null = null;

    if (this._profile.humanLike && Math.random() < this._profile.errorRate) {
      success = false;
      error = this._generateError(type);
    }

    const duration = Date.now() - start + action.delay;

    const result: ActionResult = {
      actionId: `hand-${this._actionCounter}`,
      mode,
      success,
      duration,
      artifact: { target, value: value ?? null, simulated: true, precision },
      precision,
      error,
    };

    this._results.push(result);
    return result;
  }

  private _getBaseDelay(type: HandAction['type']): number {
    switch (type) {
      case 'type':
        return this._profile.typingSpeed;
      case 'click':
        return 150;
      case 'scroll':
        return this._profile.scrollPause;
      case 'hover':
        return 200;
      case 'wait':
        return 500 + Math.random() * 1000;
      case 'submit':
        return 100;
      default:
        return 100;
    }
  }

  private _generateError(type: HandAction['type']): string {
    const errors: Record<HandAction['type'], string[]> = {
      click: ['Missed target', 'Double-click', 'Click too fast'],
      type: ['Typo detected', 'Character skipped', 'Extra character inserted'],
      scroll: ['Overscrolled', 'Scroll direction reversed', 'Jittery scroll'],
      hover: ['Hovered wrong element', 'Hover duration too short'],
      wait: ['Wait timeout', 'Premature continuation'],
      submit: ['Submit failed', 'Duplicate submit'],
    };
    const list = errors[type];
    return list[Math.floor(Math.random() * list.length)];
  }

  typeText(selector: string, text: string): ActionResult[] {
    const results: ActionResult[] = [];
    let consecutiveErrors = 0;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const errorProbability = this._profile.errorRate * (1 + consecutiveErrors * 0.1);

      if (this._profile.humanLike && Math.random() < errorProbability && consecutiveErrors < 3) {
        const wrongChar = this._generateTypo(char);
        results.push(this.perform('type', selector, wrongChar));
        results.push(this.perform('type', selector, char));
        consecutiveErrors++;
      } else {
        results.push(this.perform('type', selector, char));
        consecutiveErrors = 0;
      }
    }

    return results;
  }

  private _generateTypo(char: string): string {
    const qwertyMap: Record<string, string[]> = {
      'a': ['q', 's', 'z'],
      's': ['a', 'd', 'x'],
      'd': ['s', 'f', 'c'],
      'f': ['d', 'g', 'v'],
      'g': ['f', 'h', 'b'],
      'h': ['g', 'j', 'n'],
      'j': ['h', 'k', 'm'],
      'k': ['j', 'l', ','],
      'l': ['k', ';'],
      'q': ['w', 'a'],
      'w': ['q', 'e', 's'],
      'e': ['w', 'r', 'd'],
      'r': ['e', 't', 'f'],
      't': ['r', 'y', 'g'],
      'y': ['t', 'u', 'h'],
      'u': ['y', 'i', 'j'],
      'i': ['u', 'o', 'k'],
      'o': ['i', 'p', 'l'],
      'p': ['o', '['],
    };
    const neighbors = qwertyMap[char.toLowerCase()] || ['a', 's', 'd'];
    return neighbors[Math.floor(Math.random() * neighbors.length)];
  }

  async waitFor(selector: string, timeout: number = 5000): Promise<boolean> {
    const deadline = Date.now() + timeout;
    const pollInterval = 100 + Math.random() * 50;

    while (Date.now() < deadline) {
      await new Promise(r => setTimeout(r, pollInterval));
    }

    void selector;
    return true;
  }

  setMode(mode: ManipulationMode): void {
    this._mode = mode;
  }

  rest(duration: number): void {
    this._cumulativeFatigue = Math.max(0, this._cumulativeFatigue - duration * 0.0001);
  }

  calculateRhythmSignature(): RhythmSignature {
    const intervals = this._actions.map((a, i) => i > 0 ? a.timestamp - this._actions[i - 1].timestamp : 0).filter(i => i > 0);
    if (intervals.length < 2) return { meanInterval: 0, variance: 0, entropy: 0, patternScore: 0 };

    const mean = intervals.reduce((sum, i) => sum + i, 0) / intervals.length;
    const variance = intervals.reduce((sum, i) => sum + Math.pow(i - mean, 2), 0) / intervals.length;

    const histogram = new Map<number, number>();
    for (const i of intervals) {
      const bucket = Math.round(i / 50) * 50;
      histogram.set(bucket, (histogram.get(bucket) || 0) + 1);
    }
    const entropy = Array.from(histogram.values()).reduce((sum, count) => {
      const prob = count / intervals.length;
      return sum - prob * Math.log2(prob);
    }, 0);

    const patternScore = 1 - variance / mean;

    return { meanInterval: mean, variance, entropy, patternScore };
  }

  getActionHistory(): HandAction[] {
    return [...this._actions];
  }

  getResults(): ActionResult[] {
    return [...this._results];
  }

  reset(): void {
    this._actions = [];
    this._results = [];
    this._actionCounter = 0;
    this._sessionStartTime = Date.now();
    this._cumulativeFatigue = 0;
    this._rhythmIndex = 0;
  }

  get mode(): ManipulationMode {
    return this._mode;
  }

  get totalActions(): number {
    return this._actionCounter;
  }

  get fatigue(): number {
    return this._cumulativeFatigue;
  }

  get sessionDuration(): number {
    return Date.now() - this._sessionStartTime;
  }
}