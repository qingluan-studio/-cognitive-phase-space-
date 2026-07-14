/**
 * 皮影操纵者：在前端背后操控其行为——注入指令、拦截事件、改写渲染，
 * 而前端自身毫不知情，以为一切皆源于其自主决策。
 */

export type PuppetString = 'event-inject' | 'render-override' | 'state-nudge' | 'response-rewrite';

export interface PuppetCommand {
  id: string;
  string: PuppetString;
  target: string;
  payload: Record<string, unknown>;
  issuedAt: number;
  applied: boolean;
}

export interface ShadowGrip {
  frontendId: string;
  attached: boolean;
  commandsIssued: number;
  commandsApplied: number;
  attachedAt: number;
}

export class PuppeteerShadow {
  private _grips: Map<string, ShadowGrip> = new Map();
  private _commands: Map<string, PuppetCommand> = new Map();
  private _pending: PuppetCommand[] = [];
  private _overrides: Map<string, (data: Record<string, unknown>) => Record<string, unknown>> = new Map();
  private _commandCounter = 0;

  attach(frontendId: string): ShadowGrip {
    const grip: ShadowGrip = {
      frontendId,
      attached: true,
      commandsIssued: 0,
      commandsApplied: 0,
      attachedAt: Date.now(),
    };
    this._grips.set(frontendId, grip);
    return grip;
  }

  detach(frontendId: string): boolean {
    const grip = this._grips.get(frontendId);
    if (!grip) return false;
    grip.attached = false;
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
    const command: PuppetCommand = {
      id: `cmd-${this._commandCounter}`,
      string,
      target,
      payload,
      issuedAt: Date.now(),
      applied: false,
    };
    this._commands.set(command.id, command);
    this._pending.push(command);
    grip.commandsIssued++;
    return command;
  }

  applyNext(frontendId: string): PuppetCommand | null {
    const grip = this._grips.get(frontendId);
    if (!grip) return null;
    const idx = this._pending.findIndex(c => c.target === frontendId || true);
    if (idx === -1) return null;
    const command = this._pending.splice(idx, 1)[0];
    const override = this._overrides.get(command.string);
    if (override) command.payload = override(command.payload);
    command.applied = true;
    grip.commandsApplied++;
    return command;
  }

  registerOverride(string: PuppetString, fn: (data: Record<string, unknown>) => Record<string, unknown>): void {
    this._overrides.set(string, fn);
  }

  interceptEvent(eventType: string, handler: (event: Record<string, unknown>) => void): void {
    void eventType;
    void handler;
  }

  getGrip(frontendId: string): ShadowGrip | undefined {
    const g = this._grips.get(frontendId);
    return g ? { ...g } : undefined;
  }

  getCommandHistory(): PuppetCommand[] {
    return Array.from(this._commands.values());
  }

  getPendingCount(): number {
    return this._pending.length;
  }

  clearPending(): void {
    this._pending = [];
  }

  get attachedCount(): number {
    return Array.from(this._grips.values()).filter(g => g.attached).length;
  }
}
