import type { DataPacket, Signal, Handler } from '../shared/types';

export interface WorkflowStep {
  id: string;
  toolId: string;
  name: string;
  inputSource: 'initial' | 'previous' | 'step';
  sourceStepId?: string;
  transform?: (input: unknown) => unknown;
  condition?: (context: WorkflowContext) => boolean;
  retryCount?: number;
  timeoutMs?: number;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  version: string;
  errorHandling: 'stop' | 'continue' | 'fallback';
  fallbackStepId?: string;
}

export interface WorkflowContext {
  workflowId: string;
  initialInput: unknown;
  stepResults: Map<string, unknown>;
  stepErrors: Map<string, Error>;
  startTime: number;
  currentStepIndex: number;
}

export interface WorkflowResult {
  workflowId: string;
  success: boolean;
  finalOutput: unknown;
  stepResults: Map<string, unknown>;
  stepErrors: Map<string, Error>;
  duration: number;
  completedSteps: string[];
  failedSteps: string[];
}

export interface ChainExecution {
  id: string;
  toolIds: string[];
  results: unknown[];
  success: boolean;
  duration: number;
}

export class ToolOrchestrator {
  private _workflows: Map<string, WorkflowDefinition>;
  private _toolRegistry: Map<string, Handler<DataPacket, DataPacket>>;
  private _executionHistory: WorkflowResult[];
  private _activeWorkflows: Map<string, WorkflowContext>;
  private _maxHistorySize: number;
  private _chainHistory: ChainExecution[];
  private _defaultTimeout: number;

  constructor() {
    this._workflows = new Map();
    this._toolRegistry = new Map();
    this._executionHistory = [];
    this._activeWorkflows = new Map();
    this._maxHistorySize = 100;
    this._chainHistory = [];
    this._defaultTimeout = 30000;
  }

  get workflowCount(): number { return this._workflows.size; }
  get activeWorkflows(): string[] { return Array.from(this._activeWorkflows.keys()); }
  get executionHistory(): WorkflowResult[] { return [...this._executionHistory]; }

  public registerTool(toolId: string, handler: Handler<DataPacket, DataPacket>): void {
    this._toolRegistry.set(toolId, handler);
  }

  public unregisterTool(toolId: string): boolean {
    return this._toolRegistry.delete(toolId);
  }

  public hasTool(toolId: string): boolean {
    return this._toolRegistry.has(toolId);
  }

  public registerWorkflow(workflow: WorkflowDefinition): void {
    this._workflows.set(workflow.id, {
      ...workflow,
      steps: workflow.steps.map(s => ({ ...s }))
    });
  }

  public unregisterWorkflow(workflowId: string): boolean {
    return this._workflows.delete(workflowId);
  }

  public getWorkflow(workflowId: string): WorkflowDefinition | undefined {
    const w = this._workflows.get(workflowId);
    if (!w) return undefined;
    return { ...w, steps: w.steps.map(s => ({ ...s })) };
  }

  public listWorkflows(): WorkflowDefinition[] {
    return Array.from(this._workflows.values()).map(w => ({
      ...w,
      steps: w.steps.map(s => ({ ...s }))
    }));
  }

  public async executeWorkflow(workflowId: string, initialInput: DataPacket): Promise<WorkflowResult> {
    const workflow = this._workflows.get(workflowId);
    if (!workflow) throw new Error(`Workflow not found: ${workflowId}`);

    const startTime = Date.now();
    const context: WorkflowContext = {
      workflowId,
      initialInput: initialInput.payload,
      stepResults: new Map(),
      stepErrors: new Map(),
      startTime,
      currentStepIndex: 0
    };

    this._activeWorkflows.set(workflowId, context);

    const completedSteps: string[] = [];
    const failedSteps: string[] = [];
    let finalOutput: unknown = initialInput.payload;
    let overallSuccess = true;

    try {
      for (let i = 0; i < workflow.steps.length; i++) {
        const step = workflow.steps[i];
        context.currentStepIndex = i;

        if (step.condition && !step.condition(context)) continue;

        try {
          const stepInput = this._resolveStepInput(step, context, initialInput);
          const result = await this._executeStep(step, stepInput);
          context.stepResults.set(step.id, result);
          finalOutput = result;
          completedSteps.push(step.id);
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          context.stepErrors.set(step.id, err);
          failedSteps.push(step.id);

          if (workflow.errorHandling === 'stop') {
            overallSuccess = false;
            break;
          } else if (workflow.errorHandling === 'fallback' && workflow.fallbackStepId) {
            const fallbackStep = workflow.steps.find(s => s.id === workflow.fallbackStepId);
            if (fallbackStep) {
              try {
                const fallbackInput = this._resolveStepInput(fallbackStep, context, initialInput);
                const fallbackResult = await this._executeStep(fallbackStep, fallbackInput);
                context.stepResults.set(fallbackStep.id, fallbackResult);
                finalOutput = fallbackResult;
                completedSteps.push(fallbackStep.id);
              } catch {
                overallSuccess = false;
              }
            }
            break;
          }
        }
      }
    } finally {
      this._activeWorkflows.delete(workflowId);
    }

    const result: WorkflowResult = {
      workflowId,
      success: overallSuccess && failedSteps.length === 0,
      finalOutput,
      stepResults: new Map(context.stepResults),
      stepErrors: new Map(context.stepErrors),
      duration: Date.now() - startTime,
      completedSteps,
      failedSteps
    };

    this._executionHistory.push(result);
    if (this._executionHistory.length > this._maxHistorySize) {
      this._executionHistory.shift();
    }

    return result;
  }

  private _resolveStepInput(step: WorkflowStep, context: WorkflowContext, initial: DataPacket): DataPacket {
    let payload: unknown;

    switch (step.inputSource) {
      case 'initial':
        payload = context.initialInput;
        break;
      case 'previous':
        const prevStep = this._findPreviousCompletedStep(step, context);
        payload = prevStep ? context.stepResults.get(prevStep.id) : context.initialInput;
        break;
      case 'step':
        payload = step.sourceStepId && context.stepResults.has(step.sourceStepId)
          ? context.stepResults.get(step.sourceStepId)
          : context.initialInput;
        break;
      default:
        payload = context.initialInput;
    }

    if (step.transform) payload = step.transform(payload);

    return {
      id: `step-${step.id}`,
      payload,
      metadata: {
        createdAt: Date.now(),
        route: [...initial.metadata.route, step.id],
        priority: initial.metadata.priority,
        phase: `workflow-step-${step.id}`
      }
    };
  }

  private _findPreviousCompletedStep(currentStep: WorkflowStep, context: WorkflowContext): WorkflowStep | null {
    const workflow = this._workflows.get(context.workflowId);
    if (!workflow) return null;
    const idx = workflow.steps.findIndex(s => s.id === currentStep.id);
    for (let i = idx - 1; i >= 0; i--) {
      if (context.stepResults.has(workflow.steps[i].id)) {
        return workflow.steps[i];
      }
    }
    return null;
  }

  private async _executeStep(step: WorkflowStep, input: DataPacket): Promise<unknown> {
    const handler = this._toolRegistry.get(step.toolId);
    if (!handler) throw new Error(`Tool not found: ${step.toolId}`);

    const maxRetries = step.retryCount || 0;
    const timeout = step.timeoutMs || this._defaultTimeout;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await this._withTimeout(handler(input), timeout);
        return result.payload;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt < maxRetries) {
          await this._delay(100 * Math.pow(2, attempt));
        }
      }
    }

    throw lastError || new Error('Step execution failed');
  }

  private _withTimeout<T>(promise: Promise<T> | T, ms: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error(`Step timed out after ${ms}ms`)), ms);
      Promise.resolve(promise).then(
        value => { clearTimeout(timeout); resolve(value); },
        error => { clearTimeout(timeout); reject(error); }
      );
    });
  }

  private _delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public async executeChain(toolIds: string[], initialInput: DataPacket): Promise<ChainExecution> {
    const startTime = Date.now();
    const results: unknown[] = [];
    let currentInput = initialInput;
    let success = true;

    for (const toolId of toolIds) {
      const handler = this._toolRegistry.get(toolId);
      if (!handler) { success = false; break; }
      try {
        const result = await handler(currentInput);
        results.push(result.payload);
        currentInput = result;
      } catch {
        success = false;
        break;
      }
    }

    const execution: ChainExecution = {
      id: `chain-${Date.now()}`,
      toolIds: [...toolIds],
      results,
      success,
      duration: Date.now() - startTime
    };

    this._chainHistory.push(execution);
    if (this._chainHistory.length > this._maxHistorySize) {
      this._chainHistory.shift();
    }

    return execution;
  }

  public detectSignalFromWorkflow(result: WorkflowResult): Signal {
    return {
      source: `workflow:${result.workflowId}`,
      magnitude: result.success ? 1 : 0,
      entropy: result.success ? 0.1 : result.failedSteps.length / Math.max(1, result.completedSteps.length + result.failedSteps.length),
      timestamp: Date.now()
    };
  }

  public processPacket(packet: DataPacket<{ workflowId: string; payload: unknown }>): Promise<DataPacket<WorkflowResult>> {
    const { workflowId, payload } = packet.payload;
    const innerPacket: DataPacket = { id: `inner-${packet.id}`, payload, metadata: packet.metadata };
    return this.executeWorkflow(workflowId, innerPacket).then(result => ({
      id: `orch-${packet.id}`,
      payload: result,
      metadata: {
        createdAt: Date.now(),
        route: [...packet.metadata.route, 'tool-orchestrator'],
        priority: packet.metadata.priority,
        phase: 'workflow-complete'
      }
    }));
  }

  public clearHistory(): void {
    this._executionHistory = [];
    this._chainHistory = [];
  }

  public reset(): void {
    this._workflows.clear();
    this._toolRegistry.clear();
    this._executionHistory = [];
    this._activeWorkflows.clear();
    this._chainHistory = [];
  }
}
