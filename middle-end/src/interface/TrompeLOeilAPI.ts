export type PipelineStage =
  | 'decode'
  | 'validate'
  | 'transform'
  | 'enrich'
  | 'orchestrate'
  | 'persist'
  | 'encode';

export interface SimpleRequest {
  endpoint: string;
  payload: Record<string, unknown>;
  context?: Record<string, unknown>;
}

export interface SimpleResponse {
  ok: boolean;
  result: Record<string, unknown>;
  elapsed: number;
  stageDetails: Array<{ stage: PipelineStage; elapsed: number; status: 'success' | 'error' }>;
}

export interface ProcessingChain {
  stages: PipelineStage[];
  handlers: Map<PipelineStage, (input: unknown, context: Record<string, unknown>) => unknown>;
  branching: Map<PipelineStage, (input: unknown) => PipelineStage | null>;
  errorHandlers: Map<PipelineStage, (error: Error, input: unknown) => unknown>;
}

export interface RequestRewriteRule {
  pattern: RegExp;
  rewrite: (payload: Record<string, unknown>) => Record<string, unknown>;
  priority: number;
}

export class TrompeLOeilAPI {
  private _chains: Map<string, ProcessingChain> = new Map();
  private _invocationCount = 0;
  private _totalElapsed = 0;
  private _exposedEndpoints = new Set<string>();
  private _rewriteRules: RequestRewriteRule[] = [];
  private _circuitBreakers: Map<string, { trips: number; lastTrip: number; open: boolean }> = new Map();

  registerChain(endpoint: string, stages: PipelineStage[]): void {
    this._chains.set(endpoint, {
      stages,
      handlers: new Map(),
      branching: new Map(),
      errorHandlers: new Map(),
    });
    this._exposedEndpoints.add(endpoint);
    this._circuitBreakers.set(endpoint, { trips: 0, lastTrip: 0, open: false });
  }

  attachHandler(endpoint: string, stage: PipelineStage, handler: (input: unknown, context: Record<string, unknown>) => unknown): void {
    const chain = this._chains.get(endpoint);
    if (!chain) throw new Error(`No chain for endpoint: ${endpoint}`);
    chain.handlers.set(stage, handler);
  }

  attachErrorHandler(endpoint: string, stage: PipelineStage, handler: (error: Error, input: unknown) => unknown): void {
    const chain = this._chains.get(endpoint);
    if (!chain) throw new Error(`No chain for endpoint: ${endpoint}`);
    chain.errorHandlers.set(stage, handler);
  }

  setBranch(endpoint: string, stage: PipelineStage, condition: (input: unknown) => PipelineStage | null): void {
    const chain = this._chains.get(endpoint);
    if (!chain) throw new Error(`No chain for endpoint: ${endpoint}`);
    chain.branching.set(stage, condition);
  }

  addRewriteRule(rule: RequestRewriteRule): void {
    this._rewriteRules.push(rule);
    this._rewriteRules.sort((a, b) => a.priority - b.priority);
  }

  call(request: SimpleRequest): SimpleResponse {
    const start = Date.now();
    
    if (this._isCircuitOpen(request.endpoint)) {
      return {
        ok: false,
        result: { error: 'circuit_open', message: 'Service temporarily unavailable' },
        elapsed: Date.now() - start,
        stageDetails: [],
      };
    }

    const rewritten = this._applyRewriteRules(request);
    const chain = this._chains.get(rewritten.endpoint);
    
    if (!chain) {
      return { ok: false, result: { error: 'not found' }, elapsed: Date.now() - start, stageDetails: [] };
    }

    let current: unknown = rewritten.payload;
    const context: Record<string, unknown> = rewritten.context ?? {};
    const stageDetails: SimpleResponse['stageDetails'] = [];
    let ok = true;
    let currentStageIndex = 0;

    while (currentStageIndex < chain.stages.length) {
      const stage = chain.stages[currentStageIndex];
      const stageStart = Date.now();
      let status: 'success' | 'error' = 'success';

      try {
        const handler = chain.handlers.get(stage);
        if (handler) {
          current = handler(current, context);
        }

        const branch = chain.branching.get(stage);
        if (branch) {
          const nextStage = branch(current);
          if (nextStage) {
            const nextIndex = chain.stages.indexOf(nextStage);
            if (nextIndex !== -1) {
              currentStageIndex = nextIndex;
              continue;
            }
          }
        }
      } catch (error) {
        status = 'error';
        ok = false;
        
        const errorHandler = chain.errorHandlers.get(stage);
        if (errorHandler) {
          try {
            current = errorHandler(error as Error, current);
            ok = true;
          } catch {
            ok = false;
          }
        }
        
        this._tripCircuit(request.endpoint);
      }

      stageDetails.push({ stage, elapsed: Date.now() - stageStart, status });
      currentStageIndex++;
    }

    const elapsed = Date.now() - start;
    this._invocationCount++;
    this._totalElapsed += elapsed;

    return {
      ok,
      result: (current as Record<string, unknown>) ?? {},
      elapsed,
      stageDetails,
    };
  }

  private _applyRewriteRules(request: SimpleRequest): SimpleRequest {
    let payload = { ...request.payload };
    
    for (const rule of this._rewriteRules) {
      if (rule.pattern.test(request.endpoint)) {
        payload = rule.rewrite(payload);
      }
    }
    
    return { ...request, payload };
  }

  private _isCircuitOpen(endpoint: string): boolean {
    const breaker = this._circuitBreakers.get(endpoint);
    if (!breaker) return false;
    
    if (breaker.open && Date.now() - breaker.lastTrip > 30000) {
      breaker.open = false;
      breaker.trips = 0;
    }
    
    return breaker.open;
  }

  private _tripCircuit(endpoint: string): void {
    const breaker = this._circuitBreakers.get(endpoint);
    if (!breaker) return;
    
    breaker.trips++;
    breaker.lastTrip = Date.now();
    
    if (breaker.trips >= 5) {
      breaker.open = true;
    }
  }

  resetCircuit(endpoint: string): void {
    const breaker = this._circuitBreakers.get(endpoint);
    if (breaker) {
      breaker.trips = 0;
      breaker.open = false;
    }
  }

  listEndpoints(): string[] {
    return Array.from(this._exposedEndpoints);
  }

  getChainDepth(endpoint: string): number {
    return this._chains.get(endpoint)?.stages.length ?? 0;
  }

  getStageNames(endpoint: string): PipelineStage[] {
    return [...(this._chains.get(endpoint)?.stages ?? [])];
  }

  getStats(): { invocations: number; avgElapsed: number; openCircuits: number } {
    const openCircuits = Array.from(this._circuitBreakers.values()).filter(b => b.open).length;
    return {
      invocations: this._invocationCount,
      avgElapsed: this._invocationCount === 0 ? 0 : this._totalElapsed / this._invocationCount,
      openCircuits,
    };
  }

  resetStats(): void {
    this._invocationCount = 0;
    this._totalElapsed = 0;
    for (const breaker of this._circuitBreakers.values()) {
      breaker.trips = 0;
      breaker.open = false;
    }
  }

  get endpointCount(): number {
    return this._exposedEndpoints.size;
  }
}