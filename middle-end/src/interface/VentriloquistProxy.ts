/**
 * 腹语代理：让后端服务误以为自己在与前端直接对话，
 * 实则由中间代理代为发声与操控，后端无从察觉代理的存在。
 */

export interface BackendDialogue {
  sessionId: string;
  backendId: string;
  frontendPersona: string;
  messages: DialogueMessage[];
  startedAt: number;
}

export interface DialogueMessage {
  direction: 'to-backend' | 'from-backend';
  content: Record<string, unknown>;
  timestamp: number;
}

export interface VentriloquistConfig {
  personaName: string;
  mimicHeaders: Record<string, string>;
  responseDelay: number;
}

export class VentriloquistProxy {
  private _sessions: Map<string, BackendDialogue> = new Map();
  private _configs: Map<string, VentriloquistConfig> = new Map();
  private _interceptedCount = 0;
  private _spoofedHeaders: Map<string, Record<string, string>> = new Map();
  private _mutedBackends: Set<string> = new Set();

  registerBackend(backendId: string, config: VentriloquistConfig): void {
    this._configs.set(backendId, config);
    this._spoofedHeaders.set(backendId, config.mimicHeaders);
  }

  openSession(backendId: string): BackendDialogue {
    const config = this._configs.get(backendId);
    if (!config) throw new Error(`Unknown backend: ${backendId}`);
    const sessionId = `vent-${backendId}-${Date.now()}`;
    const dialogue: BackendDialogue = {
      sessionId,
      backendId,
      frontendPersona: config.personaName,
      messages: [],
      startedAt: Date.now(),
    };
    this._sessions.set(sessionId, dialogue);
    return dialogue;
  }

  speakToBackend(sessionId: string, content: Record<string, unknown>): DialogueMessage {
    const dialogue = this._sessions.get(sessionId);
    if (!dialogue) throw new Error(`No session: ${sessionId}`);
    const msg: DialogueMessage = {
      direction: 'to-backend',
      content: this._spoofIdentity(content, dialogue.backendId),
      timestamp: Date.now(),
    };
    dialogue.messages.push(msg);
    this._interceptedCount++;
    return msg;
  }

  private _spoofIdentity(content: Record<string, unknown>, backendId: string): Record<string, unknown> {
    const headers = this._spoofedHeaders.get(backendId) ?? {};
    return { ...content, __origin: 'frontend', __headers: headers };
  }

  interceptFromBackend(sessionId: string, content: Record<string, unknown>): DialogueMessage {
    const dialogue = this._sessions.get(sessionId);
    if (!dialogue) throw new Error(`No session: ${sessionId}`);
    const msg: DialogueMessage = {
      direction: 'from-backend',
      content,
      timestamp: Date.now(),
    };
    dialogue.messages.push(msg);
    if (this._mutedBackends.has(dialogue.backendId)) {
      msg.content = { suppressed: true };
    }
    return msg;
  }

  muteBackend(backendId: string): void {
    this._mutedBackends.add(backendId);
  }

  unmuteBackend(backendId: string): void {
    this._mutedBackends.delete(backendId);
  }

  getSession(sessionId: string): BackendDialogue | undefined {
    return this._sessions.get(sessionId);
  }

  closeSession(sessionId: string): boolean {
    return this._sessions.delete(sessionId);
  }

  getInterceptedCount(): number {
    return this._interceptedCount;
  }

  get activeSessionCount(): number {
    return this._sessions.size;
  }
}
