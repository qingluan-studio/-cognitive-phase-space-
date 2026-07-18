import type { DataPacket, Signal, Handler } from '../shared/types';

export interface ModelRequest {
  modelId: string;
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stopSequences?: string[];
  context?: Record<string, unknown>;
}

export interface ModelResponse {
  modelId: string;
  content: string;
  tokensUsed: {
    prompt: number;
    completion: number;
    total: number;
  };
  finishReason: 'stop' | 'length' | 'content_filter' | 'unknown';
  latencyMs: number;
  metadata: Record<string, unknown>;
}

export interface AdapterConfig {
  modelId: string;
  provider: string;
  baseUrl?: string;
  apiKey?: string;
  defaultParams: Record<string, unknown>;
  inputTransform?: (req: ModelRequest) => unknown;
  outputTransform?: (resp: unknown) => ModelResponse;
}

export interface AdapterStats {
  totalRequests: number;
  totalTokens: number;
  avgLatency: number;
  errorRate: number;
  byModel: Map<string, { requests: number; tokens: number; avgLatency: number }>;
}

export interface CachedResponse {
  response: ModelResponse;
  timestamp: number;
  requestHash: string;
}

export class ModelAdapter {
  private _adapters: Map<string, AdapterConfig>;
  private _handlers: Map<string, Handler<ModelRequest, ModelResponse>>;
  private _requestHistory: { request: ModelRequest; response?: ModelResponse; error?: Error; timestamp: number }[];
  private _cache: Map<string, CachedResponse>;
  private _maxHistorySize: number;
  private _maxCacheSize: number;
  private _cacheTtlMs: number;
  private _defaultTemperature: number;
  private _defaultMaxTokens: number;

  constructor() {
    this._adapters = new Map();
    this._handlers = new Map();
    this._requestHistory = [];
    this._cache = new Map();
    this._maxHistorySize = 500;
    this._maxCacheSize = 200;
    this._cacheTtlMs = 300000;
    this._defaultTemperature = 0.7;
    this._defaultMaxTokens = 1024;
  }

  get adapterCount(): number { return this._adapters.size; }
  get cacheSize(): number { return this._cache.size; }
  get requestHistory(): { request: ModelRequest; response?: ModelResponse; error?: Error; timestamp: number }[] {
    return [...this._requestHistory];
  }

  public registerAdapter(config: AdapterConfig, handler: Handler<ModelRequest, ModelResponse>): void {
    this._adapters.set(config.modelId, {
      ...config,
      defaultParams: { ...config.defaultParams }
    });
    this._handlers.set(config.modelId, handler);
  }

  public unregisterAdapter(modelId: string): boolean {
    const hadAdapter = this._adapters.has(modelId);
    this._adapters.delete(modelId);
    this._handlers.delete(modelId);
    return hadAdapter;
  }

  public hasAdapter(modelId: string): boolean {
    return this._adapters.has(modelId) && this._handlers.has(modelId);
  }

  public getAdapterConfig(modelId: string): AdapterConfig | undefined {
    const config = this._adapters.get(modelId);
    if (!config) return undefined;
    return {
      ...config,
      defaultParams: { ...config.defaultParams }
    };
  }

  public listAdapters(): AdapterConfig[] {
    return Array.from(this._adapters.values()).map(c => ({
      ...c,
      defaultParams: { ...c.defaultParams }
    }));
  }

  public setCacheTtl(ms: number): void {
    this._cacheTtlMs = Math.max(0, ms);
  }

  public setMaxCacheSize(size: number): void {
    this._maxCacheSize = Math.max(0, size);
    while (this._cache.size > this._maxCacheSize) {
      const firstKey = this._cache.keys().next().value;
      if (firstKey) this._cache.delete(firstKey);
    }
  }

  public setDefaults(options: { temperature?: number; maxTokens?: number }): void {
    if (options.temperature !== undefined) {
      this._defaultTemperature = Math.max(0, Math.min(2, options.temperature));
    }
    if (options.maxTokens !== undefined) {
      this._defaultMaxTokens = Math.max(1, options.maxTokens);
    }
  }

  public async execute(request: ModelRequest): Promise<ModelResponse> {
    const handler = this._handlers.get(request.modelId);
    if (!handler) {
      throw new Error(`No adapter registered for model: ${request.modelId}`);
    }

    const normalizedRequest = this._normalizeRequest(request);
    const cacheKey = this._generateCacheKey(normalizedRequest);

    if (this._cacheTtlMs > 0) {
      const cached = this._cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this._cacheTtlMs) {
        this._recordRequest(normalizedRequest, cached.response);
        return { ...cached.response };
      }
      if (cached) {
        this._cache.delete(cacheKey);
      }
    }

    const startTime = Date.now();
    try {
      const transformedRequest = this._applyInputTransform(normalizedRequest);
      let response = await handler(transformedRequest);
      response = this._applyOutputTransform(request.modelId, response);
      response.latencyMs = Date.now() - startTime;

      if (this._cacheTtlMs > 0) {
        this._cache.set(cacheKey, {
          response: { ...response },
          timestamp: Date.now(),
          requestHash: cacheKey
        });
        if (this._cache.size > this._maxCacheSize) {
          const firstKey = this._cache.keys().next().value;
          if (firstKey) this._cache.delete(firstKey);
        }
      }

      this._recordRequest(normalizedRequest, response);
      return response;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this._recordRequest(normalizedRequest, undefined, err);
      throw err;
    }
  }

  private _normalizeRequest(request: ModelRequest): ModelRequest {
    const config = this._adapters.get(request.modelId);
    const defaults = config?.defaultParams || {};
    return {
      ...request,
      temperature: request.temperature ?? defaults.temperature as number ?? this._defaultTemperature,
      maxTokens: request.maxTokens ?? defaults.maxTokens as number ?? this._defaultMaxTokens,
      topP: request.topP ?? defaults.topP as number ?? undefined,
      frequencyPenalty: request.frequencyPenalty ?? defaults.frequencyPenalty as number ?? undefined,
      presencePenalty: request.presencePenalty ?? defaults.presencePenalty as number ?? undefined,
      stopSequences: request.stopSequences ?? (defaults.stopSequences as string[]) ?? undefined
    };
  }

  private _generateCacheKey(request: ModelRequest): string {
    const keyParts = [
      request.modelId,
      request.prompt,
      request.systemPrompt || '',
      String(request.temperature),
      String(request.maxTokens),
      String(request.topP || ''),
      String(request.frequencyPenalty || ''),
      String(request.presencePenalty || ''),
      (request.stopSequences || []).join('|')
    ];
    return keyParts.join('::');
  }

  private _applyInputTransform(request: ModelRequest): ModelRequest {
    const config = this._adapters.get(request.modelId);
    if (config?.inputTransform) {
      const transformed = config.inputTransform(request);
      if (transformed && typeof transformed === 'object' && 'modelId' in transformed) {
        return transformed as ModelRequest;
      }
    }
    return request;
  }

  private _applyOutputTransform(modelId: string, response: ModelResponse): ModelResponse {
    const config = this._adapters.get(modelId);
    if (config?.outputTransform) {
      const transformed = config.outputTransform(response);
      if (transformed) return transformed;
    }
    return response;
  }

  private _recordRequest(request: ModelRequest, response?: ModelResponse, error?: Error): void {
    this._requestHistory.push({
      request: { ...request, stopSequences: request.stopSequences ? [...request.stopSequences] : undefined },
      response: response ? { ...response, metadata: { ...response.metadata } } : undefined,
      error,
      timestamp: Date.now()
    });
    if (this._requestHistory.length > this._maxHistorySize) {
      this._requestHistory.shift();
    }
  }

  public async executeBatch(requests: ModelRequest[]): Promise<ModelResponse[]> {
    return Promise.all(requests.map(r => this.execute(r)));
  }

  public clearCache(): void {
    this._cache.clear();
  }

  public invalidateCache(modelId?: string): number {
    if (!modelId) {
      const size = this._cache.size;
      this._cache.clear();
      return size;
    }
    let count = 0;
    for (const [key, value] of this._cache) {
      if (key.startsWith(`${modelId}::`)) {
        this._cache.delete(key);
        count++;
      }
    }
    return count;
  }

  public detectSignalFromResponse(response: ModelResponse): Signal {
    return {
      source: `adapter:${response.modelId}`,
      magnitude: response.finishReason === 'stop' ? 1 : 0.5,
      entropy: response.tokensUsed.total > 0 ? Math.min(1, response.tokensUsed.completion / response.tokensUsed.total) : 0.5,
      timestamp: Date.now()
    };
  }

  public processPacket(packet: DataPacket<ModelRequest>): Promise<DataPacket<ModelResponse>> {
    return this.execute(packet.payload).then(response => ({
      id: `adp-${packet.id}`,
      payload: response,
      metadata: {
        createdAt: Date.now(),
        route: [...packet.metadata.route, 'model-adapter'],
        priority: packet.metadata.priority,
        phase: 'adapted'
      }
    }));
  }

  public getStats(): AdapterStats {
    const byModel = new Map<string, { requests: number; tokens: number; totalLatency: number }>();
    let totalRequests = 0;
    let totalTokens = 0;
    let totalLatency = 0;
    let errors = 0;

    for (const record of this._requestHistory) {
      totalRequests++;
      const modelId = record.request.modelId;
      if (!byModel.has(modelId)) {
        byModel.set(modelId, { requests: 0, tokens: 0, totalLatency: 0 });
      }
      const stats = byModel.get(modelId)!;
      stats.requests++;

      if (record.response) {
        stats.tokens += record.response.tokensUsed.total;
        stats.totalLatency += record.response.latencyMs;
        totalTokens += record.response.tokensUsed.total;
        totalLatency += record.response.latencyMs;
      }
      if (record.error) {
        errors++;
      }
    }

    const byModelResult = new Map<string, { requests: number; tokens: number; avgLatency: number }>();
    for (const [modelId, stats] of byModel) {
      byModelResult.set(modelId, {
        requests: stats.requests,
        tokens: stats.tokens,
        avgLatency: stats.requests > 0 ? stats.totalLatency / stats.requests : 0
      });
    }

    return {
      totalRequests,
      totalTokens,
      avgLatency: totalRequests > 0 ? totalLatency / totalRequests : 0,
      errorRate: totalRequests > 0 ? errors / totalRequests : 0,
      byModel: byModelResult
    };
  }

  public clearHistory(): void {
    this._requestHistory = [];
  }

  public reset(): void {
    this._adapters.clear();
    this._handlers.clear();
    this._requestHistory = [];
    this._cache.clear();
  }
}
