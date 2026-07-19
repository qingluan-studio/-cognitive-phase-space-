import { DataPacket } from '../shared/types';

export interface AutomatedTask {
  id: string;
  name: string;
  type: string;
  action: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'timeout';
  result?: unknown;
}

export interface TaskTemplate {
  id: string;
  name: string;
  params: Record<string, unknown>;
  steps: string[];
}

interface TaskLog {
  id: string;
  taskId: string;
  level: string;
  message: string;
  timestamp: number;
}

interface TaskError {
  taskId: string;
  error: string;
  handler: string;
  retries: number;
}

export class TaskAutomation {
  private _tasks: Map<string, AutomatedTask> = new Map();
  private _templates: Map<string, TaskTemplate> = new Map();
  private _logs: Map<string, TaskLog[]> = new Map();
  private _errors: Map<string, TaskError> = new Map();
  private _counter = 0;
  private _stats = {
    totalTasks: 0,
    completedTasks: 0,
    failedTasks: 0,
    avgDuration: 0,
    successRate: 1,
  };

  createTask(name: string, type: string, action: string, params: Record<string, unknown>): AutomatedTask {
    const id = `task-${Date.now()}-${this._counter++}`;
    const task: AutomatedTask = {
      id,
      name,
      type,
      action,
      status: 'pending',
    };
    this._tasks.set(id, task);
    this._stats.totalTasks++;
    return task;
  }

  runTask(taskId: string, input: Record<string, unknown>): { taskId: string; status: string; result?: unknown; startTime: number } {
    const task = this._tasks.get(taskId);
    if (!task) return { taskId, status: 'not_found', startTime: 0 };
    task.status = 'running';
    const success = Math.random() > 0.1;
    setTimeout(() => {
      task.status = success ? 'completed' : 'failed';
      task.result = success ? { output: `result-${taskId}` } : undefined;
      if (success) {
        this._stats.completedTasks++;
      } else {
        this._stats.failedTasks++;
      }
    }, 100);
    return { taskId, status: 'running', startTime: Date.now() };
  }

  retryTask(taskId: string, attempts: number, backoff: string): { taskId: string; attempt: number; status: string; nextRetry?: number } {
    const task = this._tasks.get(taskId);
    if (!task) return { taskId, attempt: 0, status: 'not_found' };
    const attempt = Math.floor(Math.random() * attempts);
    return {
      taskId,
      attempt,
      status: attempt < attempts ? 'retrying' : 'failed',
      nextRetry: attempt < attempts ? Date.now() + 1000 * Math.pow(2, attempt) : undefined,
    };
  }

  taskTemplate(name: string, params: Record<string, unknown>, steps: string[]): TaskTemplate {
    const id = `tpl-${Date.now()}-${this._counter++}`;
    const template: TaskTemplate = { id, name, params, steps };
    this._templates.set(id, template);
    return template;
  }

  batchTask(tasks: string[], concurrency: number, priority: string): { batchId: string; tasks: number; concurrency: number; priority: string } {
    return {
      batchId: `batch-${Date.now()}-${this._counter++}`,
      tasks: tasks.length,
      concurrency,
      priority,
    };
  }

  sequentialTask(tasks: string[], stopOnError: boolean): { results: Record<string, unknown>; completed: number; failed: number; stoppedOnError: boolean } {
    const completed = Math.floor(tasks.length * 0.8);
    const failed = tasks.length - completed;
    const results: Record<string, unknown> = {};
    for (let i = 0; i < completed; i++) {
      results[tasks[i]] = { status: 'success' };
    }
    return {
      results,
      completed,
      failed,
      stoppedOnError: stopOnError && failed > 0,
    };
  }

  parallelTask(tasks: string[], maxWorkers: number): { results: Record<string, unknown>; completed: number; failed: number; duration: number } {
    const completed = Math.floor(tasks.length * 0.85);
    const failed = tasks.length - completed;
    const results: Record<string, unknown> = {};
    for (const task of tasks) {
      results[task] = { status: Math.random() > 0.15 ? 'success' : 'failed' };
    }
    return {
      results,
      completed,
      failed,
      duration: Math.random() * 5 + 1,
    };
  }

  taskDependency(tasks: string[], dependencyGraph: Record<string, string[]>): { order: string[]; valid: boolean; cycleDetected: boolean } {
    return {
      order: tasks,
      valid: true,
      cycleDetected: false,
    };
  }

  taskNotification(task: string, channel: string, condition: string): { enabled: boolean; channel: string; condition: string } {
    return {
      enabled: true,
      channel,
      condition,
    };
  }

  taskLogging(taskId: string, level: string, message: string): { logged: boolean; level: string; timestamp: number } {
    const logs = this._logs.get(taskId) || [];
    logs.push({
      id: `log-${this._counter++}`,
      taskId,
      level,
      message,
      timestamp: Date.now(),
    });
    this._logs.set(taskId, logs);
    return { logged: true, level, timestamp: Date.now() };
  }

  taskError(taskId: string, error: string, handler: string): { handled: boolean; handler: string; retries: number } {
    const err: TaskError = { taskId, error, handler, retries: 0 };
    this._errors.set(taskId, err);
    return { handled: true, handler, retries: 0 };
  }

  taskTimeout(taskId: string, duration: number, onTimeout: string): { timeout: boolean; duration: number; action: string } {
    return {
      timeout: false,
      duration,
      action: onTimeout,
    };
  }

  taskHistory(filter: Record<string, unknown>, page: { number: number; size: number }): { tasks: AutomatedTask[]; total: number; page: number; pages: number } {
    const all = Array.from(this._tasks.values());
    const total = all.length;
    const pages = Math.ceil(total / page.size);
    const start = (page.number - 1) * page.size;
    return {
      tasks: all.slice(start, start + page.size),
      total,
      page: page.number,
      pages,
    };
  }

  get taskCount(): number {
    return this._tasks.size;
  }

  get templateCount(): number {
    return this._templates.size;
  }

  get errorCount(): number {
    return this._errors.size;
  }

  get stats(): { totalTasks: number; completedTasks: number; failedTasks: number; avgDuration: number; successRate: number } {
    return { ...this._stats };
  }

  public toPacket(): DataPacket<{
    tasks: number;
    templates: number;
    errors: number;
    logs: number;
    stats: { totalTasks: number; completedTasks: number; failedTasks: number; avgDuration: number; successRate: number };
  }> {
    return {
      id: `task-auto-${Date.now()}-${this._counter}`,
      payload: {
        tasks: this._tasks.size,
        templates: this._templates.size,
        errors: this._errors.size,
        logs: this._logs.size,
        stats: { ...this._stats },
      },
      metadata: {
        createdAt: Date.now(),
        route: ['automation', 'task', 'result'],
        priority: 0.7,
        phase: 'execution',
      },
    };
  }

  public reset(): void {
    this._tasks.clear();
    this._templates.clear();
    this._logs.clear();
    this._errors.clear();
    this._counter = 0;
    this._stats = {
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      avgDuration: 0,
      successRate: 1,
    };
  }
}
