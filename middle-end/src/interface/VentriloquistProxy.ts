export type DialogueState = 'initializing' | 'active' | 'paused' | 'terminated';

export type MessageType = 'request' | 'response' | 'ping' | 'heartbeat' | 'control';

export interface BackendDialogue {
  sessionId: string;
  backendId: string;
  frontendPersona: string;
  messages: DialogueMessage[];
  startedAt: number;
  state: DialogueState;
  latencyProfile: { min: number; max: number; avg: number };
  messageCount: number;
}

export interface DialogueMessage {
  direction: 'to-backend' | 'from-backend';
  content: Record<string, unknown>;
  timestamp: number;
  type: MessageType;
  sequenceId: number;
  signature: string;
}

export interface VentriloquistConfig {
  personaName: string;
  mimicHeaders: Record<string, string>;
  responseDelay: number;
  signatureAlgorithm: 'md5' | 'sha1' | 'custom';
  messageSigning: boolean;
}

export interface MessageSpoofingRule {
  pattern: RegExp;
  transform: (content: Record<string, unknown>) => Record<string, unknown>;
  probability: number;
}

export class VentriloquistProxy {
  private _sessions: Map<string, BackendDialogue> = new Map();
  private _configs: Map<string, VentriloquistConfig> = new Map();
  private _interceptedCount = 0;
  private _spoofedHeaders: Map<string, Record<string, string>> = new Map();
  private _mutedBackends: Set<string> = new Set();
  private _spoofingRules: Map<string, MessageSpoofingRule[]> = new Map();
  private _sequenceCounters: Map<string, number> = new Map();

  registerBackend(backendId: string, config: VentriloquistConfig): void {
    this._configs.set(backendId, config);
    this._spoofedHeaders.set(backendId, config.mimicHeaders);
    this._spoofingRules.set(backendId, []);
  }

  addSpoofingRule(backendId: string, rule: MessageSpoofingRule): void {
    const rules = this._spoofingRules.get(backendId) ?? [];
    rules.push(rule);
    this._spoofingRules.set(backendId, rules);
  }

  openSession(backendId: string): BackendDialogue {
    const config = this._configs.get(backendId);
    if (!config) throw new Error(`Unknown backend: ${backendId}`);
    
    const sessionId = `vent-${backendId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this._sequenceCounters.set(sessionId, 0);
    
    const dialogue: BackendDialogue = {
      sessionId,
      backendId,
      frontendPersona: config.personaName,
      messages: [],
      startedAt: Date.now(),
      state: 'initializing',
      latencyProfile: { min: Infinity, max: 0, avg: 0 },
      messageCount: 0,
    };
    
    this._sessions.set(sessionId, dialogue);
    this._transitionState(sessionId, 'active');
    
    return dialogue;
  }

  private _transitionState(sessionId: string, newState: DialogueState): void {
    const dialogue = this._sessions.get(sessionId);
    if (!dialogue) return;
    
    const validTransitions: Record<DialogueState, DialogueState[]> = {
      initializing: ['active', 'terminated'],
      active: ['paused', 'terminated'],
      paused: ['active', 'terminated'],
      terminated: [],
    };
    
    if (validTransitions[dialogue.state].includes(newState)) {
      dialogue.state = newState;
    }
  }

  speakToBackend(sessionId: string, content: Record<string, unknown>): DialogueMessage {
    const dialogue = this._sessions.get(sessionId);
    if (!dialogue) throw new Error(`No session: ${sessionId}`);
    
    const config = this._configs.get(dialogue.backendId);
    const sequenceId = this._sequenceCounters.get(sessionId) ?? 0;
    this._sequenceCounters.set(sessionId, sequenceId + 1);
    
    const spoofedContent = this._applySpoofingRules(content, dialogue.backendId);
    const signedContent = config?.messageSigning 
      ? this._signContent(spoofedContent, sessionId)
      : spoofedContent;
    
    const msg: DialogueMessage = {
      direction: 'to-backend',
      content: this._spoofIdentity(signedContent, dialogue.backendId),
      timestamp: Date.now(),
      type: this._classifyMessage(content),
      sequenceId,
      signature: config?.messageSigning ? this._generateSignature(sessionId, sequenceId) : '',
    };
    
    dialogue.messages.push(msg);
    dialogue.messageCount++;
    this._updateLatencyProfile(dialogue, msg.timestamp);
    this._interceptedCount++;
    
    return msg;
  }

  private _applySpoofingRules(content: Record<string, unknown>, backendId: string): Record<string, unknown> {
    let result = { ...content };
    const rules = this._spoofingRules.get(backendId) ?? [];
    
    for (const rule of rules) {
      const contentStr = JSON.stringify(content);
      if (rule.pattern.test(contentStr) && Math.random() < rule.probability) {
        result = rule.transform(result);
      }
    }
    
    return result;
  }

  private _classifyMessage(content: Record<string, unknown>): MessageType {
    const keys = Object.keys(content).map(k => k.toLowerCase());
    
    if (keys.includes('ping') || keys.includes('heartbeat')) return 'ping';
    if (keys.includes('control') || keys.includes('command')) return 'control';
    if (keys.includes('request') || keys.includes('query')) return 'request';
    if (keys.includes('response') || keys.includes('result')) return 'response';
    
    return 'request';
  }

  private _signContent(content: Record<string, unknown>, sessionId: string): Record<string, unknown> {
    const timestamp = Date.now();
    const signature = this._hmac(`${sessionId}${JSON.stringify(content)}${timestamp}`, 'secret');
    return { ...content, __signed: true, __timestamp: timestamp, __signature: signature };
  }

  private _hmac(input: string, key: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      hash = ((hash << 5) - hash) + input.charCodeAt(i) ^ key.charCodeAt(i % key.length);
    }
    return hash.toString(16);
  }

  private _generateSignature(sessionId: string, sequenceId: number): string {
    const input = `${sessionId}-${sequenceId}-${Date.now()}`;
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
    }
    return hash.toString(16);
  }

  private _spoofIdentity(content: Record<string, unknown>, backendId: string): Record<string, unknown> {
    const headers = this._spoofedHeaders.get(backendId) ?? {};
    return { ...content, __origin: 'frontend', __headers: headers };
  }

  interceptFromBackend(sessionId: string, content: Record<string, unknown>): DialogueMessage {
    const dialogue = this._sessions.get(sessionId);
    if (!dialogue) throw new Error(`No session: ${sessionId}`);
    
    const config = this._configs.get(dialogue.backendId);
    const sequenceId = this._sequenceCounters.get(sessionId) ?? 0;
    this._sequenceCounters.set(sessionId, sequenceId + 1);
    
    let processedContent = content;
    
    if (this._mutedBackends.has(dialogue.backendId)) {
      processedContent = { suppressed: true, reason: 'backend_muted' };
    } else {
      processedContent = this._normalizeResponse(content);
    }
    
    const msg: DialogueMessage = {
      direction: 'from-backend',
      content: processedContent,
      timestamp: Date.now(),
      type: 'response',
      sequenceId,
      signature: config?.messageSigning ? this._generateSignature(sessionId, sequenceId) : '',
    };
    
    dialogue.messages.push(msg);
    dialogue.messageCount++;
    this._updateLatencyProfile(dialogue, msg.timestamp);
    
    return msg;
  }

  private _normalizeResponse(content: Record<string, unknown>): Record<string, unknown> {
    const normalized: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(content)) {
      if (key.startsWith('_') || key.startsWith('__')) continue;
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        normalized[key] = this._normalizeResponse(value as Record<string, unknown>);
      } else {
        normalized[key] = value;
      }
    }
    
    return normalized;
  }

  private _updateLatencyProfile(dialogue: BackendDialogue, timestamp: number): void {
    if (dialogue.messages.length < 2) return;
    
    const prevMsg = dialogue.messages[dialogue.messages.length - 2];
    const latency = timestamp - prevMsg.timestamp;
    
    dialogue.latencyProfile.min = Math.min(dialogue.latencyProfile.min, latency);
    dialogue.latencyProfile.max = Math.max(dialogue.latencyProfile.max, latency);
    const count = dialogue.messages.length - 1;
    dialogue.latencyProfile.avg = ((dialogue.latencyProfile.avg * (count - 1)) + latency) / count;
  }

  simulateBackendResponse(sessionId: string): DialogueMessage {
    const dialogue = this._sessions.get(sessionId);
    if (!dialogue) throw new Error(`No session: ${sessionId}`);
    
    const config = this._configs.get(dialogue.backendId);
    const delay = config?.responseDelay ?? 100;
    
    const template = this._generateResponseTemplate(dialogue);
    const sequenceId = this._sequenceCounters.get(sessionId) ?? 0;
    this._sequenceCounters.set(sessionId, sequenceId + 1);
    
    const msg: DialogueMessage = {
      direction: 'from-backend',
      content: template,
      timestamp: Date.now() + delay,
      type: 'response',
      sequenceId,
      signature: config?.messageSigning ? this._generateSignature(sessionId, sequenceId) : '',
    };
    
    dialogue.messages.push(msg);
    dialogue.messageCount++;
    
    return msg;
  }

  private _generateResponseTemplate(dialogue: BackendDialogue): Record<string, unknown> {
    const recentMsgs = dialogue.messages.slice(-5).filter(m => m.direction === 'to-backend');
    
    if (recentMsgs.length === 0) {
      return { status: 'ok', data: {} };
    }
    
    const lastRequest = recentMsgs[recentMsgs.length - 1];
    const requestType = lastRequest.content.type ?? 'unknown';
    
    const templates: Record<string, Record<string, unknown>> = {
      ping: { status: 'pong', timestamp: Date.now() },
      query: { status: 'ok', results: [], count: 0 },
      command: { status: 'executed', success: true },
      unknown: { status: 'ok', data: {} },
    };
    
    return templates[requestType as string] ?? templates.unknown;
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
    const dialogue = this._sessions.get(sessionId);
    if (dialogue) {
      this._transitionState(sessionId, 'terminated');
    }
    return this._sessions.delete(sessionId);
  }

  getInterceptedCount(): number {
    return this._interceptedCount;
  }

  getSessionStats(sessionId: string): { messageCount: number; avgLatency: number; state: DialogueState } | null {
    const dialogue = this._sessions.get(sessionId);
    if (!dialogue) return null;
    
    return {
      messageCount: dialogue.messageCount,
      avgLatency: dialogue.latencyProfile.avg,
      state: dialogue.state,
    };
  }

  get activeSessionCount(): number {
    return Array.from(this._sessions.values()).filter(s => s.state === 'active').length;
  }
}