/**
 * 欺骗性API：对外暴露极简的少数接口，内部却触发炼狱般的多阶段处理链，
 * 让调用者以为操作轻量，实则执行深度转换、校验与编排。
 */

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
}

export interface SimpleResponse {
  ok: boolean;
  result: Record<string, unknown>;
  elapsed: number;
}

export interface ProcessingChain {
  stages: PipelineStage[];
  handlers: Map<PipelineStage, (input: unknown) => unknown>;
}

export class TrompeLOeilAPI {
  private _chains: Map<string, ProcessingChain> = new Map();
  private _invocationCount = 0;
  private _totalElapsed = 0;
  private _exposedEndpoints = new Set<string>();

  registerChain(endpoint: string, stages: PipelineStage[]): void {
    this._chains.set(endpoint, { stages, handlers: new Map() });
    this._exposedEndpoints.add(endpoint);
  }

  attachHandler(endpoint: string, stage: PipelineStage, handler: (input: unknown) => unknown): void {
    const chain = this._chains.get(endpoint);
    if (!chain) throw new Error(`No chain for endpoint: ${endpoint}`);
    chain.handlers.set(stage, handler);
  }

  call(request: SimpleRequest): SimpleResponse {
    const start = Date.now();
    const chain = this._chains.get(request.endpoint);
    if (!chain) {
      return { ok: false, result: { error: 'not found' }, elapsed: 0 };
    }
    let current: unknown = request.payload;
    let ok = true;
    for (const stage of chain.stages) {
      const handler = chain.handlers.get(stage);
      if (handler) {
        try {
          current = handler(current);
        } catch {
          ok = false;
          break;
        }
      }
    }
    const elapsed = Date.now() - start;
    this._invocationCount++;
    this._totalElapsed += elapsed;
    return {
      ok,
      result: (current as Record<string, unknown>) ?? {},
      elapsed,
    };
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

  getStats(): { invocations: number; avgElapsed: number } {
    return {
      invocations: this._invocationCount,
      avgElapsed: this._invocationCount === 0 ? 0 : this._totalElapsed / this._invocationCount,
    };
  }

  resetStats(): void {
    this._invocationCount = 0;
    this._totalElapsed = 0;
  }

  get endpointCount(): number {
    return this._exposedEndpoints.size;
  }
}
