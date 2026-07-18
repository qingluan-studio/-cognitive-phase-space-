import type { DataPacket, Signal, Handler } from '../shared/types';

export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  capabilities: string[];
  version: string;
}

export interface ToolExecutionResult {
  toolId: string;
  success: boolean;
  output: unknown;
  duration: number;
  error?: string;
  metadata: Record<string, unknown>;
}

export interface ToolRegistryStats {
  totalTools: number;
  byCategory: Map<string, number>;
  totalExecutions: number;
  successRate: number;
  averageDuration: number;
}

export class ToolRegistry {
  private _tools: Map<string, ToolDefinition>;
  private _handlers: Map<string, Handler<DataPacket, DataPacket>>;
  private _executionHistory: ToolExecutionResult[];
  private _categoryIndex: Map<string, string[]>;
  private _capabilityIndex: Map<string, string[]>;
  private _maxHistorySize: number;

  constructor() {
    this._tools = new Map();
    this._handlers = new Map();
    this._executionHistory = [];
    this._categoryIndex = new Map();
    this._capabilityIndex = new Map();
    this._maxHistorySize = 500;
  }

  get toolCount(): number { return this._tools.size; }
  get categories(): string[] { return Array.from(this._categoryIndex.keys()); }
  get executionHistory(): ToolExecutionResult[] { return [...this._executionHistory]; }

  public registerTool(
    definition: ToolDefinition,
    handler: Handler<DataPacket, DataPacket>
  ): void {
    const { id, category, capabilities } = definition;
    this._tools.set(id, { ...definition });
    this._handlers.set(id, handler);

    if (!this._categoryIndex.has(category)) {
      this._categoryIndex.set(category, []);
    }
    this._categoryIndex.get(category)!.push(id);

    for (const cap of capabilities) {
      if (!this._capabilityIndex.has(cap)) {
        this._capabilityIndex.set(cap, []);
      }
      this._capabilityIndex.get(cap)!.push(id);
    }
  }

  public unregisterTool(toolId: string): boolean {
    const tool = this._tools.get(toolId);
    if (!tool) return false;

    this._tools.delete(toolId);
    this._handlers.delete(toolId);

    const categoryTools = this._categoryIndex.get(tool.category);
    if (categoryTools) {
      const idx = categoryTools.indexOf(toolId);
      if (idx > -1) categoryTools.splice(idx, 1);
      if (categoryTools.length === 0) this._categoryIndex.delete(tool.category);
    }

    for (const cap of tool.capabilities) {
      const capTools = this._capabilityIndex.get(cap);
      if (capTools) {
        const idx = capTools.indexOf(toolId);
        if (idx > -1) capTools.splice(idx, 1);
        if (capTools.length === 0) this._capabilityIndex.delete(cap);
      }
    }
    return true;
  }

  public getTool(toolId: string): ToolDefinition | undefined {
    const tool = this._tools.get(toolId);
    return tool ? { ...tool } : undefined;
  }

  public hasTool(toolId: string): boolean {
    return this._tools.has(toolId);
  }

  public findByCategory(category: string): ToolDefinition[] {
    const toolIds = this._categoryIndex.get(category) || [];
    return toolIds.map(id => ({ ...this._tools.get(id)! }));
  }

  public findByCapability(capability: string): ToolDefinition[] {
    const toolIds = this._capabilityIndex.get(capability) || [];
    return toolIds.map(id => ({ ...this._tools.get(id)! }));
  }

  public searchTools(query: string): ToolDefinition[] {
    const q = query.toLowerCase();
    const results: ToolDefinition[] = [];
    for (const tool of this._tools.values()) {
      const matchesName = tool.name.toLowerCase().includes(q);
      const matchesDesc = tool.description.toLowerCase().includes(q);
      const matchesCap = tool.capabilities.some(c => c.toLowerCase().includes(q));
      if (matchesName || matchesDesc || matchesCap) {
        results.push({ ...tool });
      }
    }
    return results;
  }

  public async executeTool(toolId: string, input: DataPacket): Promise<DataPacket> {
    const handler = this._handlers.get(toolId);
    if (!handler) {
      throw new Error(`Tool not found: ${toolId}`);
    }

    const startTime = Date.now();
    try {
      const result = await handler(input);
      const duration = Date.now() - startTime;
      this._recordExecution({
        toolId,
        success: true,
        output: result.payload,
        duration,
        metadata: { ...input.metadata }
      });
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this._recordExecution({
        toolId,
        success: false,
        output: null,
        duration,
        error: error instanceof Error ? error.message : String(error),
        metadata: { ...input.metadata }
      });
      throw error;
    }
  }

  private _recordExecution(result: ToolExecutionResult): void {
    this._executionHistory.push(result);
    if (this._executionHistory.length > this._maxHistorySize) {
      this._executionHistory.shift();
    }
  }

  public executeBatch(toolIds: string[], input: DataPacket): Promise<DataPacket>[] {
    return toolIds.map(id => this.executeTool(id, input));
  }

  public getToolStats(toolId: string): { executions: number; successRate: number; avgDuration: number } {
    const toolExecs = this._executionHistory.filter(e => e.toolId === toolId);
    const executions = toolExecs.length;
    if (executions === 0) return { executions: 0, successRate: 0, avgDuration: 0 };
    const successes = toolExecs.filter(e => e.success).length;
    const totalDuration = toolExecs.reduce((sum, e) => sum + e.duration, 0);
    return {
      executions,
      successRate: successes / executions,
      avgDuration: totalDuration / executions
    };
  }

  public getStats(): ToolRegistryStats {
    const byCategory = new Map<string, number>();
    for (const [cat, ids] of this._categoryIndex) {
      byCategory.set(cat, ids.length);
    }
    const total = this._executionHistory.length;
    const successes = this._executionHistory.filter(e => e.success).length;
    const totalDuration = this._executionHistory.reduce((sum, e) => sum + e.duration, 0);
    return {
      totalTools: this._tools.size,
      byCategory,
      totalExecutions: total,
      successRate: total > 0 ? successes / total : 0,
      averageDuration: total > 0 ? totalDuration / total : 0
    };
  }

  public detectSignalFromExecution(result: ToolExecutionResult): Signal {
    return {
      source: `tool:${result.toolId}`,
      magnitude: result.success ? 1 : 0,
      entropy: result.success ? 0.1 : 0.8,
      timestamp: Date.now()
    };
  }

  public listAllTools(): ToolDefinition[] {
    return Array.from(this._tools.values()).map(t => ({ ...t }));
  }

  public clearHistory(): void {
    this._executionHistory = [];
  }

  public reset(): void {
    this._tools.clear();
    this._handlers.clear();
    this._executionHistory = [];
    this._categoryIndex.clear();
    this._capabilityIndex.clear();
  }
}
