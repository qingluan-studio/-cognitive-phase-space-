export type PuppetString = 'event-inject' | 'render-override' | 'state-nudge' | 'response-rewrite';

export interface PuppetCommand {
  id: string;
  string: PuppetString;
  target: string;
  payload: Record<string, unknown>;
  issuedAt: number;
  applied: boolean;
  latency: number;
  success: boolean;
  error: string | null;
}

export interface ShadowGrip {
  frontendId: string;
  attached: boolean;
  commandsIssued: number;
  commandsApplied: number;
  attachedAt: number;
  reliability: number;
  latency: number;
  queueDepth: number;
}

export interface InterceptionRule {
  eventType: string;
  handler: (event: Record<string, unknown>) => Record<string, unknown> | null;
  priority: number;
  active: boolean;
}

export interface CommandStatistics {
  totalIssued: number;
  totalApplied: number;
  successRate: number;
  avgLatency: number;
  byType: Record<PuppetString, number>;
}

export class PuppeteerShadow {
  private _grips: Map<string, ShadowGrip> = new Map();
  private _commands: Map<string, PuppetCommand> = new Map();
  private _pending: PuppetCommand[] = [];
  private _overrides: Map<PuppetString, (data: Record<string, unknown>) => Record<string, unknown>> = new Map();
  private _interceptors: Map<string, InterceptionRule[]> = new Map();
  private _commandCounter = 0;
  private _latencyHistory: number[] = [];

  constructor() {
    this._registerDefaultOverrides();
  }

  private _registerDefaultOverrides(): void {
    this._overrides.set('event-inject', this._injectEventOverride.bind(this));
    this._overrides.set('render-override', this._overrideRender.bind(this));
    this._overrides.set('state-nudge', this._nudgeState.bind(this));
    this._overrides.set('response-rewrite', this._rewriteResponse.bind(this));
  }

  private _injectEventOverride(payload: Record<string, unknown>): Record<string, unknown> {
    const eventType = payload.type as string;
    const timestamp = Date.now();
    const bubbles = payload.bubbles ?? true;
    return { ...payload, type: eventType, timestamp, bubbles, __injected: true };
  }

  private _overrideRender(payload: Record<string, unknown>): Record<string, unknown> {
    const target = payload.target as string;
    const content = payload.content as string;
    const opacity = payload.opacity ?? 1;
    return { target, content, opacity, __rendered: Date.now(), __overridden: true };
  }

  private _nudgeState(payload: Record<string, unknown>): Record<string, unknown> {
    const state = payload.state as Record<string, unknown>;
    const delta = payload.delta as Record<string, unknown> ?? {};
    const result: Record<string, unknown> = { ...state };
    for (const [k, v] of Object.entries(delta)) {
      const current = result[k];
      if (typeof current === 'number' && typeof v === 'number') {
        result[k] = current + v;
      } else {
        result[k] = v;
      }
    }
    return { state: result, __nudged: true, __timestamp: Date.now() };
  }

  private _rewriteResponse(payload: Record<string, unknown>): Record<string, unknown> {
    const response = payload.response as Record<string, unknown>;
    const status = response.status as number;
    const body = response.body as string;
    const headers = response.headers as Record<string, string> ?? {};
    return {
      ...response,
      status,
      body: body ? body.replace(/secret|token|password/gi, '***') : body,
      headers: { ...headers, 'x-shadowed': 'true' },
      __rewritten: Date.now(),
    };
  }

  attach(frontendId: string): ShadowGrip {
    const grip: ShadowGrip = {
      frontendId,
      attached: true,
      commandsIssued: 0,
      commandsApplied: 0,
      attachedAt: Date.now(),
      reliability: 0.9 + Math.random() * 0.1,
      latency: 50 + Math.random() * 100,
      queueDepth: 0,
    };
    this._grips.set(frontendId, grip);
    return grip;
  }

  detach(frontendId: string): boolean {
    const grip = this._grips.get(frontendId);
    if (!grip) return false;
    grip.attached = false;
    grip.reliability = Math.max(0.5, grip.reliability - 0.1);
    this._pending = this._pending.filter(c => c.target !== frontendId);
    return true;
  }

  issueCommand(
    frontendId: string,
    string: PuppetString,
    target: string,
    payload: Record<string, unknown>
  ): PuppetCommand {
    const grip = this._grips.get(frontendId);
    if (!grip || !grip.attached) throw new Error(`No grip on frontend: ${frontendId}`);

    this._commandCounter++;
    const start = Date.now();

    const command: PuppetCommand = {
      id: `cmd-${this._commandCounter}`,
      string,
      target,
      payload,
      issuedAt: Date.now(),
      applied: false,
      latency: 0,
      success: false,
      error: null,
    };

    this._commands.set(command.id, command);
    this._pending.push(command);
    grip.commandsIssued++;
    grip.queueDepth++;

    const latency = Date.now() - start + grip.latency * (0.8 + Math.random() * 0.4);
    command.latency = latency;

    this._recordLatency(latency);

    return command;
  }

  private _recordLatency(latency: number): void {
    this._latencyHistory.push(latency);
    if (this._latencyHistory.length > 100) {
      this._latencyHistory = this._latencyHistory.slice(-100);
    }
  }

  applyNext(frontendId: string): PuppetCommand | null {
    const grip = this._grips.get(frontendId);
    if (!grip || !grip.attached) return null;

    const idx = this._pending.findIndex(c => c.target === frontendId || true);
    if (idx === -1) return null;

    const command = this._pending.splice(idx, 1)[0];
    grip.queueDepth = Math.max(0, grip.queueDepth - 1);

    try {
      const override = this._overrides.get(command.string);
      if (override) {
        command.payload = override(command.payload);
      }

      const intercepted = this._applyInterceptors(command);
      if (intercepted) {
        command.payload = intercepted;
      }

      command.applied = true;
      command.success = true;
      grip.commandsApplied++;
      grip.reliability = Math.min(1, grip.reliability + 0.01);

      return command;
    } catch (e) {
      command.success = false;
      command.error = e instanceof Error ? e.message : 'Unknown error';
      grip.reliability = Math.max(0.1, grip.reliability - 0.05);
      return command;
    }
  }

  private _applyInterceptors(command: PuppetCommand): Record<string, unknown> | null {
    const rules = this._interceptors.get(command.string) ?? [];
    let result: Record<string, unknown> | null = null;

    for (const rule of rules.filter(r => r.active).sort((a, b) => b.priority - a.priority)) {
      const handled = rule.handler(command.payload);
      if (handled) {
        result = handled;
      }
    }

    return result;
  }

  applyAllPending(frontendId: string): PuppetCommand[] {
    const results: PuppetCommand[] = [];
    let command = this.applyNext(frontendId);
    while (command) {
      results.push(command);
      command = this.applyNext(frontendId);
    }
    return results;
  }

  registerOverride(string: PuppetString, fn: (data: Record<string, unknown>) => Record<string, unknown>): void {
    this._overrides.set(string, fn);
  }

  interceptEvent(eventType: string, handler: (event: Record<string, unknown>) => Record<string, unknown> | null, priority: number = 100): void {
    if (!this._interceptors.has(eventType)) {
      this._interceptors.set(eventType, []);
    }
    this._interceptors.get(eventType)!.push({ eventType, handler, priority, active: true });
  }

  removeInterceptor(eventType: string, handler: (event: Record<string, unknown>) => Record<string, unknown> | null): void {
    const rules = this._interceptors.get(eventType);
    if (!rules) return;
    this._interceptors.set(eventType, rules.filter(r => r.handler !== handler));
  }

  enableInterceptor(eventType: string, handler: (event: Record<string, unknown>) => Record<string, unknown> | null): void {
    const rules = this._interceptors.get(eventType);
    if (!rules) return;
    for (const rule of rules) {
      if (rule.handler === handler) {
        rule.active = true;
      }
    }
  }

  disableInterceptor(eventType: string, handler: (event: Record<string, unknown>) => Record<string, unknown> | null): void {
    const rules = this._interceptors.get(eventType);
    if (!rules) return;
    for (const rule of rules) {
      if (rule.handler === handler) {
        rule.active = false;
      }
    }
  }

  getGrip(frontendId: string): ShadowGrip | undefined {
    const g = this._grips.get(frontendId);
    return g ? { ...g } : undefined;
  }

  getCommandHistory(): PuppetCommand[] {
    return Array.from(this._commands.values()).map(c => ({ ...c }));
  }

  getPendingCount(): number {
    return this._pending.length;
  }

  clearPending(): void {
    this._pending = [];
    for (const grip of this._grips.values()) {
      grip.queueDepth = 0;
    }
  }

  getStatistics(): CommandStatistics {
    const commands = Array.from(this._commands.values());
    const applied = commands.filter(c => c.applied);
    const successful = commands.filter(c => c.success);

    const byType: Record<PuppetString, number> = {
      'event-inject': 0,
      'render-override': 0,
      'state-nudge': 0,
      'response-rewrite': 0,
    };
    for (const cmd of commands) {
      byType[cmd.string]++;
    }

    const avgLatency = commands.length > 0
      ? commands.reduce((sum, c) => sum + c.latency, 0) / commands.length
      : 0;

    return {
      totalIssued: commands.length,
      totalApplied: applied.length,
      successRate: commands.length > 0 ? successful.length / commands.length : 0,
      avgLatency,
      byType,
    };
  }

  get attachedCount(): number {
    return Array.from(this._grips.values()).filter(g => g.attached).length;
  }

  get avgLatency(): number {
    return this._latencyHistory.length > 0
      ? this._latencyHistory.reduce((sum, l) => sum + l, 0) / this._latencyHistory.length
      : 0;
  }
}