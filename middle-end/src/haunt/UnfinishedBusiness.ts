export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'blocked';

export interface TaskNode {
  id: string;
  status: TaskStatus;
  dependencies: string[];
  dependents: string[];
  estimatedDuration: number;
  actualDuration: number | null;
  startTime: number | null;
  endTime: number | null;
}

export class UnfinishedBusiness {
  private _tasks: Map<string, TaskNode> = new Map();
  private _state: Record<string, unknown> = {};
  private _criticalPath: string[] = [];
  private _dependencyEntropy: number = 0;
  private _completionHistory: number[] = [];

  addTask(id: string, estimatedDuration: number, dependencies: string[] = []): TaskNode {
    const task: TaskNode = {
      id,
      status: 'pending',
      dependencies,
      dependents: [],
      estimatedDuration,
      actualDuration: null,
      startTime: null,
      endTime: null,
    };
    this._tasks.set(id, task);
    for (const dep of dependencies) {
      const depTask = this._tasks.get(dep);
      if (depTask) depTask.dependents.push(id);
    }
    this._updateDependencyEntropy();
    return task;
  }

  startTask(id: string): boolean {
    const task = this._tasks.get(id);
    if (!task || task.status !== 'pending') return false;
    for (const dep of task.dependencies) {
      const depTask = this._tasks.get(dep);
      if (!depTask || depTask.status !== 'completed') return false;
    }
    task.status = 'in_progress';
    task.startTime = Date.now();
    return true;
  }

  completeTask(id: string): boolean {
    const task = this._tasks.get(id);
    if (!task || task.status !== 'in_progress') return false;
    task.status = 'completed';
    task.endTime = Date.now();
    task.actualDuration = task.endTime - (task.startTime ?? task.endTime);
    this._completionHistory.push(task.actualDuration);
    if (this._completionHistory.length > 100) this._completionHistory.shift();
    this._updateCriticalPath();
    return true;
  }

  failTask(id: string): boolean {
    const task = this._tasks.get(id);
    if (!task || task.status !== 'in_progress') return false;
    task.status = 'failed';
    task.endTime = Date.now();
    return true;
  }

  private _updateCriticalPath(): void {
    const inDegree = new Map<string, number>();
    const dist = new Map<string, number>();
    const prev = new Map<string, string | null>();
    for (const task of this._tasks.values()) {
      inDegree.set(task.id, task.dependencies.length);
      dist.set(task.id, 0);
      prev.set(task.id, null);
    }
    const queue: string[] = [];
    for (const [id, degree] of inDegree) {
      if (degree === 0) queue.push(id);
    }
    while (queue.length > 0) {
      const current = queue.shift()!;
      const currentTask = this._tasks.get(current)!;
      for (const dependent of currentTask.dependents) {
        const alt = (dist.get(current) ?? 0) + currentTask.estimatedDuration;
        if (alt > (dist.get(dependent) ?? 0)) {
          dist.set(dependent, alt);
          prev.set(dependent, current);
        }
        const newDegree = (inDegree.get(dependent) ?? 0) - 1;
        inDegree.set(dependent, newDegree);
        if (newDegree === 0) queue.push(dependent);
      }
    }
    let maxDist = 0;
    let maxNode: string | null = null;
    for (const [id, d] of dist) {
      if (d > maxDist) {
        maxDist = d;
        maxNode = id;
      }
    }
    this._criticalPath = [];
    let node = maxNode;
    while (node !== null) {
      this._criticalPath.unshift(node);
      node = prev.get(node) ?? null;
    }
  }

  private _updateDependencyEntropy(): void {
    const outDegrees: number[] = [];
    for (const task of this._tasks.values()) {
      outDegrees.push(task.dependents.length);
    }
    if (outDegrees.length === 0) {
      this._dependencyEntropy = 0;
      return;
    }
    const bins = 5;
    const maxDeg = Math.max(...outDegrees, 1);
    const counts = new Array(bins).fill(0);
    for (const d of outDegrees) {
      const idx = Math.min(bins - 1, Math.floor((d / maxDeg) * bins));
      counts[idx]++;
    }
    const total = outDegrees.length;
    let entropy = 0;
    for (const c of counts) {
      if (c > 0) {
        const p = c / total;
        entropy -= p * Math.log2(p);
      }
    }
    this._dependencyEntropy = entropy;
  }

  topologicalOrder(): string[] {
    const inDegree = new Map<string, number>();
    for (const task of this._tasks.values()) {
      inDegree.set(task.id, task.dependencies.length);
    }
    const queue: string[] = [];
    for (const [id, degree] of inDegree) {
      if (degree === 0) queue.push(id);
    }
    const result: string[] = [];
    while (queue.length > 0) {
      const current = queue.shift()!;
      result.push(current);
      const task = this._tasks.get(current)!;
      for (const dep of task.dependents) {
        const newDegree = (inDegree.get(dep) ?? 0) - 1;
        inDegree.set(dep, newDegree);
        if (newDegree === 0) queue.push(dep);
      }
    }
    return result;
  }

  getCriticalPath(): string[] {
    return [...this._criticalPath];
  }

  criticalPathDuration(): number {
    return this._criticalPath.reduce((s, id) => s + (this._tasks.get(id)?.estimatedDuration ?? 0), 0);
  }

  listByStatus(status: TaskStatus): TaskNode[] {
    return Array.from(this._tasks.values()).filter(t => t.status === status);
  }

  completionRate(): number {
    if (this._tasks.size === 0) return 0;
    return this.listByStatus('completed').length / this._tasks.size;
  }

  averageCompletionTime(): number {
    if (this._completionHistory.length === 0) return 0;
    return this._completionHistory.reduce((a, b) => a + b, 0) / this._completionHistory.length;
  }

  isDag(): boolean {
    return this.topologicalOrder().length === this._tasks.size;
  }

  findCycles(): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const stack = new Set<string>();
    const path: string[] = [];
    const dfs = (node: string) => {
      visited.add(node);
      stack.add(node);
      path.push(node);
      const task = this._tasks.get(node);
      if (task) {
        for (const dep of task.dependents) {
          if (!visited.has(dep)) {
            dfs(dep);
          } else if (stack.has(dep)) {
            const start = path.indexOf(dep);
            cycles.push(path.slice(start));
          }
        }
      }
      path.pop();
      stack.delete(node);
    };
    for (const id of this._tasks.keys()) {
      if (!visited.has(id)) dfs(id);
    }
    return cycles;
  }

  get dependencyEntropy(): number {
    return this._dependencyEntropy;
  }

  get taskCount(): number {
    return this._tasks.size;
  }

  businessReport(): Record<string, unknown> {
    return {
      taskCount: this._tasks.size,
      completedCount: this.listByStatus('completed').length,
      pendingCount: this.listByStatus('pending').length,
      failedCount: this.listByStatus('failed').length,
      criticalPathLength: this._criticalPath.length,
      criticalPathDuration: this.criticalPathDuration().toFixed(2),
      completionRate: this.completionRate().toFixed(4),
      averageCompletionTime: this.averageCompletionTime().toFixed(2),
      dependencyEntropy: this._dependencyEntropy.toFixed(4),
      isDag: this.isDag(),
      state: this._state,
    };
  }
}
