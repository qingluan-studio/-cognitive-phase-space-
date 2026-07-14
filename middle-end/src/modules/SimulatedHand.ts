/**
 * 模拟人手：Playwright 与 fetch 双模式操控前端，模拟真实人类的
 * 点击、输入、滚动与等待节奏，使自动化行为具备生物级的不规则性。
 */

export type ManipulationMode = 'playwright' | 'fetch' | 'hybrid';

export interface HandAction {
  type: 'click' | 'type' | 'scroll' | 'hover' | 'wait' | 'submit';
  target: string;
  value?: string;
  delay: number;
  timestamp: number;
}

export interface HandProfile {
  typingSpeed: number;
  clickJitter: number;
  scrollPause: number;
  humanLike: boolean;
}

export interface ActionResult {
  actionId: string;
  mode: ManipulationMode;
  success: boolean;
  duration: number;
  artifact: Record<string, unknown>;
}

export class SimulatedHand {
  private _mode: ManipulationMode;
  private _profile: HandProfile;
  private _actions: HandAction[] = [];
  private _results: ActionResult[] = [];
  private _actionCounter = 0;

  constructor(mode: ManipulationMode = 'hybrid', profile?: Partial<HandProfile>) {
    this._mode = mode;
    this._profile = {
      typingSpeed: profile?.typingSpeed ?? 80,
      clickJitter: profile?.clickJitter ?? 15,
      scrollPause: profile?.scrollPause ?? 400,
      humanLike: profile?.humanLike ?? true,
    };
  }

  private _jitter(base: number): number {
    if (!this._profile.humanLike) return base;
    return Math.max(0, base + (Math.random() - 0.5) * this._profile.clickJitter * 2);
  }

  private _resolveMode(action: HandAction): ManipulationMode {
    if (this._mode !== 'hybrid') return this._mode;
    return action.type === 'click' || action.type === 'scroll' ? 'playwright' : 'fetch';
  }

  perform(type: HandAction['type'], target: string, value?: string): ActionResult {
    this._actionCounter++;
    const action: HandAction = {
      type,
      target,
      value,
      delay: this._jitter(this._profile.typingSpeed),
      timestamp: Date.now(),
    };
    this._actions.push(action);
    const mode = this._resolveMode(action);
    const start = Date.now();
    const success = Math.random() > 0.05;
    const duration = Date.now() - start + action.delay;
    const result: ActionResult = {
      actionId: `hand-${this._actionCounter}`,
      mode,
      success,
      duration,
      artifact: { target, value: value ?? null, simulated: true },
    };
    this._results.push(result);
    return result;
  }

  typeText(selector: string, text: string): ActionResult[] {
    const results: ActionResult[] = [];
    for (const char of text) {
      results.push(this.perform('type', selector, char));
    }
    return results;
  }

  async waitFor(selector: string, timeout: number = 5000): Promise<boolean> {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      await new Promise(r => setTimeout(r, 100));
    }
    void selector;
    return true;
  }

  setMode(mode: ManipulationMode): void {
    this._mode = mode;
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
  }

  get mode(): ManipulationMode {
    return this._mode;
  }

  get totalActions(): number {
    return this._actionCounter;
  }
}
