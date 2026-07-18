import type { DataPacket, Signal, Handler } from '../shared/types';

export interface EnsembleMember {
  modelId: string;
  weight: number;
  role: 'primary' | 'secondary' | 'specialist' | 'critic';
  specialties: string[];
  enabled: boolean;
}

export interface EnsembleRequest {
  prompt: string;
  systemPrompt?: string;
  strategy: 'vote' | 'weighted' | 'debate' | 'refinement' | 'mixture_of_experts';
  maxRounds?: number;
  temperature?: number;
  maxTokens?: number;
}

export interface EnsembleResponse {
  content: string;
  strategy: string;
  modelResponses: { modelId: string; content: string; weight: number }[];
  rounds: number;
  consensusScore: number;
  latencyMs: number;
  metadata: Record<string, unknown>;
}

export interface EnsembleConfig {
  id: string;
  name: string;
  members: EnsembleMember[];
  defaultStrategy: string;
  description: string;
}

export interface EnsembleStats {
  totalRequests: number;
  avgConsensus: number;
  avgRounds: number;
  byStrategy: Map<string, { requests: number; avgConsensus: number }>;
}

type ModelHandler = Handler<{ prompt: string; systemPrompt?: string; temperature?: number; maxTokens?: number }, string>;

export class ModelEnsemble {
  private _ensembles: Map<string, EnsembleConfig>;
  private _modelHandlers: Map<string, ModelHandler>;
  private _history: { request: EnsembleRequest; response: EnsembleResponse; timestamp: number }[];
  private _maxHistory: number;
  private _defaultStrategy: string;
  private _defaultMaxRounds: number;
  private _consensusThreshold: number;

  constructor() {
    this._ensembles = new Map();
    this._modelHandlers = new Map();
    this._history = [];
    this._maxHistory = 200;
    this._defaultStrategy = 'weighted';
    this._defaultMaxRounds = 3;
    this._consensusThreshold = 0.7;
  }

  get ensembleCount(): number { return this._ensembles.size; }
  get defaultStrategy(): string { return this._defaultStrategy; }

  public registerModel(id: string, handler: ModelHandler): void { this._modelHandlers.set(id, handler); }
  public unregisterModel(id: string): boolean { return this._modelHandlers.delete(id); }
  public hasModel(id: string): boolean { return this._modelHandlers.has(id); }

  public createEnsemble(config: EnsembleConfig): void {
    this._ensembles.set(config.id, { ...config, members: config.members.map(m => ({ ...m, specialties: [...m.specialties] })) });
  }
  public removeEnsemble(id: string): boolean { return this._ensembles.delete(id); }

  public getEnsemble(id: string): EnsembleConfig | undefined {
    const e = this._ensembles.get(id);
    return e ? { ...e, members: e.members.map(m => ({ ...m, specialties: [...m.specialties] })) } : undefined;
  }

  public listEnsembles(): EnsembleConfig[] {
    return Array.from(this._ensembles.values()).map(e => ({ ...e, members: e.members.map(m => ({ ...m, specialties: [...m.specialties] })) }));
  }

  public setDefaultStrategy(s: string): void { this._defaultStrategy = s; }
  public setConsensusThreshold(t: number): void { this._consensusThreshold = Math.max(0, Math.min(1, t)); }
  public setMaxRounds(r: number): void { this._defaultMaxRounds = Math.max(1, r); }

  public async execute(ensembleId: string, request: EnsembleRequest): Promise<EnsembleResponse> {
    const ensemble = this._ensembles.get(ensembleId);
    if (!ensemble) throw new Error(`Ensemble not found: ${ensembleId}`);

    const start = Date.now();
    const strategy = request.strategy || ensemble.defaultStrategy || this._defaultStrategy;
    const maxRounds = request.maxRounds || this._defaultMaxRounds;
    const active = ensemble.members.filter(m => m.enabled && this._modelHandlers.has(m.modelId));
    if (active.length === 0) throw new Error(`No active members in ensemble: ${ensembleId}`);

    let result: EnsembleResponse;
    switch (strategy) {
      case 'vote': result = await this._voteStrategy(active, request); break;
      case 'debate': result = await this._debateStrategy(active, request, maxRounds); break;
      case 'refinement': result = await this._refineStrategy(active, request, maxRounds); break;
      case 'mixture_of_experts': result = await this._moeStrategy(active, request); break;
      default: result = await this._weightedStrategy(active, request);
    }

    result.latencyMs = Date.now() - start;
    this._history.push({ request: { ...request }, response: { ...result, modelResponses: result.modelResponses.map(r => ({ ...r })), metadata: { ...result.metadata } }, timestamp: Date.now() });
    if (this._history.length > this._maxHistory) this._history.shift();
    return result;
  }

  private async _collect(members: EnsembleMember[], req: EnsembleRequest) {
    return Promise.all(members.map(async m => {
      const h = this._modelHandlers.get(m.modelId)!;
      const content = await h({ prompt: req.prompt, systemPrompt: req.systemPrompt, temperature: req.temperature, maxTokens: req.maxTokens });
      return { modelId: m.modelId, content, weight: m.weight };
    }));
  }

  private _consensus(texts: string[]): number {
    if (texts.length <= 1) return 1;
    let sim = 0, pairs = 0;
    for (let i = 0; i < texts.length; i++)
      for (let j = i + 1; j < texts.length; j++) { sim += this._sim(texts[i], texts[j]); pairs++; }
    return pairs > 0 ? sim / pairs : 0;
  }

  private _sim(a: string, b: string): number {
    const wa = new Set(a.toLowerCase().split(/\s+/).filter(w => w.length > 2));
    const wb = new Set(b.toLowerCase().split(/\s+/).filter(w => w.length > 2));
    let inter = 0;
    for (const w of wa) if (wb.has(w)) inter++;
    const union = wa.size + wb.size - inter;
    return union > 0 ? inter / union : 0;
  }

  private async _weightedStrategy(members: EnsembleMember[], req: EnsembleRequest): Promise<EnsembleResponse> {
    const resps = await this._collect(members, req);
    const sorted = [...resps].sort((a, b) => b.weight - a.weight);
    return { content: sorted[0].content, strategy: 'weighted', modelResponses: resps, rounds: 1, consensusScore: this._consensus(resps.map(r => r.content)), latencyMs: 0, metadata: { bestModel: sorted[0].modelId } };
  }

  private async _voteStrategy(members: EnsembleMember[], req: EnsembleRequest): Promise<EnsembleResponse> {
    const resps = await this._collect(members, req);
    const votes = new Map<string, number>();
    for (const r of resps) { const k = r.content.substring(0, 100); votes.set(k, (votes.get(k) || 0) + r.weight); }
    let winner = '', maxV = 0;
    for (const [k, v] of votes) if (v > maxV) { maxV = v; winner = k; }
    const win = resps.find(r => r.content.substring(0, 100) === winner) || resps[0];
    const tw = resps.reduce((s, r) => s + r.weight, 0);
    return { content: win.content, strategy: 'vote', modelResponses: resps, rounds: 1, consensusScore: maxV / Math.max(1, tw), latencyMs: 0, metadata: { votes: maxV, winnerModel: win.modelId } };
  }

  private async _debateStrategy(members: EnsembleMember[], req: EnsembleRequest, maxRounds: number): Promise<EnsembleResponse> {
    const primary = members.filter(m => m.role === 'primary' || m.role === 'specialist');
    const critics = members.filter(m => m.role === 'critic');
    let prompt = req.prompt;
    let consensus = 0, rounds = 0;
    let finalResps: { modelId: string; content: string; weight: number }[] = [];

    for (let r = 1; r <= maxRounds; r++) {
      rounds = r;
      const args: { modelId: string; content: string; position: string }[] = [];
      for (const m of primary) {
        const h = this._modelHandlers.get(m.modelId)!;
        const sp = req.systemPrompt ? `${req.systemPrompt}\n\nDebate round ${r}.` : `Debate round ${r}.`;
        args.push({ modelId: m.modelId, content: await h({ prompt, systemPrompt: sp, temperature: req.temperature, maxTokens: req.maxTokens }), position: 'support' });
      }
      for (const m of critics) {
        const h = this._modelHandlers.get(m.modelId)!;
        const content = await h({ prompt: `Critique:\n${args.map(a => a.content).join('\n\n')}`, systemPrompt: 'You are a critic.', temperature: req.temperature, maxTokens: req.maxTokens });
        args.push({ modelId: m.modelId, content, position: 'critic' });
      }
      const rc = this._consensus(args.filter(a => a.position === 'support').map(a => a.content));
      finalResps = args.map(a => ({ modelId: a.modelId, content: a.content, weight: members.find(m => m.modelId === a.modelId)?.weight || 1 }));
      if (rc >= this._consensusThreshold) { consensus = rc; break; }
      prompt = `Refine:\n${args.map(a => `[${a.position}] ${a.content}`).join('\n\n')}`;
      consensus = rc;
    }

    const sorted = [...finalResps].sort((a, b) => b.weight - a.weight);
    return { content: sorted[0]?.content || '', strategy: 'debate', modelResponses: finalResps, rounds, consensusScore: consensus, latencyMs: 0, metadata: { debateRounds: rounds } };
  }

  private async _refineStrategy(members: EnsembleMember[], req: EnsembleRequest, maxRounds: number): Promise<EnsembleResponse> {
    const resps: { modelId: string; content: string; weight: number }[] = [];
    let current = '';
    const sorted = [...members].sort((a, b) => a.weight - b.weight);
    const count = Math.min(maxRounds, sorted.length);

    for (let i = 0; i < count; i++) {
      const m = sorted[i];
      const h = this._modelHandlers.get(m.modelId)!;
      const p = current ? `Refine:\n\n${current}\n\nQ: ${req.prompt}` : req.prompt;
      const content = await h({ prompt: p, systemPrompt: req.systemPrompt, temperature: req.temperature, maxTokens: req.maxTokens });
      current = content;
      resps.push({ modelId: m.modelId, content, weight: m.weight });
    }
    return { content: current, strategy: 'refinement', modelResponses: resps, rounds: count, consensusScore: 1, latencyMs: 0, metadata: { refinements: resps.length } };
  }

  private async _moeStrategy(members: EnsembleMember[], req: EnsembleRequest): Promise<EnsembleResponse> {
    const pl = req.prompt.toLowerCase();
    const scored = members.map(m => {
      let s = 0;
      for (const sp of m.specialties) if (pl.includes(sp.toLowerCase())) s++;
      return { member: m, score: s };
    }).sort((a, b) => b.score - a.score).slice(0, 3);

    const resps = await this._collect(scored.map(s => s.member), req);
    const sorted = [...resps].sort((a, b) => b.weight - a.weight);
    return { content: sorted[0]?.content || '', strategy: 'mixture_of_experts', modelResponses: resps, rounds: 1, consensusScore: this._consensus(resps.map(r => r.content)), latencyMs: 0, metadata: { expertsUsed: resps.length } };
  }

  public detectSignalFromResponse(response: EnsembleResponse): Signal {
    return { source: 'model-ensemble', magnitude: response.consensusScore, entropy: 1 - response.consensusScore, timestamp: Date.now() };
  }

  public processPacket(packet: DataPacket<{ ensembleId: string; request: EnsembleRequest }>): Promise<DataPacket<EnsembleResponse>> {
    const { ensembleId, request } = packet.payload;
    return this.execute(ensembleId, request).then(response => ({
      id: `ens-${packet.id}`,
      payload: response,
      metadata: { createdAt: Date.now(), route: [...packet.metadata.route, 'model-ensemble'], priority: packet.metadata.priority, phase: 'ensembled' }
    }));
  }

  public getStats(): EnsembleStats {
    const byStrat = new Map<string, { requests: number; totalConsensus: number }>();
    let tc = 0, tr = 0;
    for (const h of this._history) {
      const s = h.response.strategy;
      if (!byStrat.has(s)) byStrat.set(s, { requests: 0, totalConsensus: 0 });
      const st = byStrat.get(s)!;
      st.requests++; st.totalConsensus += h.response.consensusScore;
      tc += h.response.consensusScore; tr += h.response.rounds;
    }
    const result = new Map<string, { requests: number; avgConsensus: number }>();
    for (const [s, st] of byStrat) result.set(s, { requests: st.requests, avgConsensus: st.requests > 0 ? st.totalConsensus / st.requests : 0 });
    const n = this._history.length;
    return { totalRequests: n, avgConsensus: n > 0 ? tc / n : 0, avgRounds: n > 0 ? tr / n : 0, byStrategy: result };
  }

  public clearHistory(): void { this._history = []; }
  public reset(): void { this._ensembles.clear(); this._modelHandlers.clear(); this._history = []; }
}
