import { DataPacket } from '../shared/types';

export interface Workflow {
  id: string;
  name: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  status: 'draft' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
}

export interface WorkflowNode {
  id: string;
  type: string;
  config: Record<string, unknown>;
}

interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  condition?: string;
}

interface WorkflowInstance {
  id: string;
  workflowId: string;
  currentNode: string;
  status: string;
  variables: Record<string, unknown>;
  startTime: number;
  completedTasks: string[];
}

interface WorkflowVersion {
  version: string;
  definition: Workflow;
  createdAt: number;
  changelog: string;
}

export class WorkflowEngine {
  private _workflows: Map<string, Workflow> = new Map();
  private _instances: Map<string, WorkflowInstance> = new Map();
  private _versions: Map<string, WorkflowVersion[]> = new Map();
  private _tasks: Map<string, { id: string; assignee: string; status: string; result?: unknown }> = new Map();
  private _counter = 0;
  private _stats = {
    totalWorkflows: 0,
    runningInstances: 0,
    completedInstances: 0,
    failedInstances: 0,
    avgDuration: 0,
  };

  createWorkflow(name: string, definition: { nodes: WorkflowNode[]; edges: WorkflowEdge[] }): Workflow {
    const id = `wf-${Date.now()}-${this._counter++}`;
    const workflow: Workflow = {
      id,
      name,
      nodes: definition.nodes,
      edges: definition.edges,
      status: 'draft',
    };
    this._workflows.set(id, workflow);
    this._stats.totalWorkflows++;
    this._versions.set(id, [{
      version: '1.0',
      definition: { ...workflow },
      createdAt: Date.now(),
      changelog: 'Initial version',
    }]);
    return workflow;
  }

  executeWorkflow(id: string, input: Record<string, unknown>): { instanceId: string; status: string; currentNode: string } {
    const workflow = this._workflows.get(id);
    if (!workflow) return { instanceId: '', status: 'not_found', currentNode: '' };
    const instanceId = `inst-${Date.now()}-${this._counter++}`;
    const startNode = workflow.nodes.length > 0 ? workflow.nodes[0].id : '';
    const instance: WorkflowInstance = {
      id: instanceId,
      workflowId: id,
      currentNode: startNode,
      status: 'running',
      variables: { ...input },
      startTime: Date.now(),
      completedTasks: [],
    };
    this._instances.set(instanceId, instance);
    workflow.status = 'running';
    this._stats.runningInstances++;
    return { instanceId, status: 'running', currentNode: startNode };
  }

  startWorkflow(id: string, trigger: string): { instanceId: string; trigger: string; startTime: number } {
    const result = this.executeWorkflow(id, { trigger });
    return {
      instanceId: result.instanceId,
      trigger,
      startTime: Date.now(),
    };
  }

  completeTask(workflowId: string, taskId: string, result: unknown): { success: boolean; nextNode: string; result: unknown } {
    const instance = this._instances.get(workflowId);
    if (!instance) return { success: false, nextNode: '', result };
    instance.completedTasks.push(taskId);
    const workflow = this._workflows.get(instance.workflowId);
    if (workflow) {
      const currentIdx = workflow.nodes.findIndex(n => n.id === instance.currentNode);
      if (currentIdx < workflow.nodes.length - 1) {
        instance.currentNode = workflow.nodes[currentIdx + 1].id;
      } else {
        instance.status = 'completed';
        workflow.status = 'completed';
        this._stats.runningInstances--;
        this._stats.completedInstances++;
      }
    }
    return {
      success: true,
      nextNode: instance.currentNode,
      result,
    };
  }

  approvalNode(task: string, approver: string, decision: 'approve' | 'reject' | 'delegate'): { decision: string; approver: string; nextStep: string; timestamp: number } {
    return {
      decision,
      approver,
      nextStep: decision === 'approve' ? 'continue' : decision === 'reject' ? 'end' : 'delegated',
      timestamp: Date.now(),
    };
  }

  conditionNode(condition: string, truePath: string, falsePath: string): { result: boolean; nextPath: string; condition: string } {
    const result = Math.random() > 0.5;
    return {
      result,
      nextPath: result ? truePath : falsePath,
      condition,
    };
  }

  parallelGateway(branches: string[], completion: 'all' | 'any' | 'number'): { branches: string[]; completed: string[]; completion: string } {
    const completedCount = completion === 'all' ? branches.length : completion === 'any' ? 1 : Math.floor(branches.length / 2);
    return {
      branches,
      completed: branches.slice(0, completedCount),
      completion,
    };
  }

  exclusiveGateway(conditions: Record<string, boolean>, defaultPath: string): { selected: string; conditions: Record<string, boolean>; defaultPath: string } {
    const trueKeys = Object.entries(conditions).filter(([, v]) => v).map(([k]) => k);
    const selected = trueKeys.length > 0 ? trueKeys[0] : defaultPath;
    return { selected, conditions, defaultPath };
  }

  inclusiveGateway(conditions: Record<string, boolean>): { active: string[]; count: number } {
    const active = Object.entries(conditions).filter(([, v]) => v).map(([k]) => k);
    return { active, count: active.length };
  }

  eventGateway(events: string[]): { triggered: string; events: string[]; timestamp: number } {
    const triggered = events[Math.floor(Math.random() * events.length)];
    return { triggered, events, timestamp: Date.now() };
  }

  timerNode(duration: number, callback: string): { timerId: string; duration: number; callback: string; fireAt: number } {
    return {
      timerId: `timer-${Date.now()}-${this._counter++}`,
      duration,
      callback,
      fireAt: Date.now() + duration,
    };
  }

  errorNode(handler: string, retry: { count: number; delay: number }): { handler: string; retries: number; delay: number; strategy: string } {
    return {
      handler,
      retries: retry.count,
      delay: retry.delay,
      strategy: 'retry_with_backoff',
    };
  }

  workflowVersion(workflow: Workflow, version: string): { version: string; previousVersion: string; changelog: string } {
    const versions = this._versions.get(workflow.id) || [];
    const previousVersion = versions.length > 0 ? versions[versions.length - 1].version : '0.0';
    versions.push({
      version,
      definition: workflow,
      createdAt: Date.now(),
      changelog: `Version ${version}`,
    });
    this._versions.set(workflow.id, versions);
    return { version, previousVersion, changelog: `Version ${version}` };
  }

  get workflowCount(): number {
    return this._workflows.size;
  }

  get instanceCount(): number {
    return this._instances.size;
  }

  get taskCount(): number {
    return this._tasks.size;
  }

  get stats(): { totalWorkflows: number; runningInstances: number; completedInstances: number; failedInstances: number; avgDuration: number } {
    return { ...this._stats };
  }

  public toPacket(): DataPacket<{
    workflows: number;
    instances: number;
    tasks: number;
    versions: number;
    stats: { totalWorkflows: number; runningInstances: number; completedInstances: number; failedInstances: number; avgDuration: number };
  }> {
    return {
      id: `workflow-${Date.now()}-${this._counter}`,
      payload: {
        workflows: this._workflows.size,
        instances: this._instances.size,
        tasks: this._tasks.size,
        versions: this._versions.size,
        stats: { ...this._stats },
      },
      metadata: {
        createdAt: Date.now(),
        route: ['automation', 'workflow', 'result'],
        priority: 0.7,
        phase: 'orchestration',
      },
    };
  }

  public reset(): void {
    this._workflows.clear();
    this._instances.clear();
    this._versions.clear();
    this._tasks.clear();
    this._counter = 0;
    this._stats = {
      totalWorkflows: 0,
      runningInstances: 0,
      completedInstances: 0,
      failedInstances: 0,
      avgDuration: 0,
    };
  }
}
