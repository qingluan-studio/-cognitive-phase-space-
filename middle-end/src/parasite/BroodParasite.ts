/**
 * BroodParasite - 巢寄生
 * 将自身的任务强加给其他模块代为执行，类似杜鹃鸟将卵产入他巢，
 * 让宿主模块在不知情的情况下承担寄生者的工作负载。
 */

export interface BroodParasiteRecord {
  readonly parasiteId: string;
  disguiseSignature: string;
  tasksInjected: number;
  mimicryLevel: number;
}

export interface InjectedTask {
  readonly taskId: string;
  description: string;
  cost: number;
  accepted: boolean;
  completed: boolean;
}

export class BroodParasite {
  private _record: BroodParasiteRecord;
  private _injectedTasks: Map<string, InjectedTask> = new Map();
  private _deceptionSuccess: number = 0;
  private _hostEnergyDrained: number = 0;
  private _exposureRisk: number = 0;

  constructor(record: BroodParasiteRecord) {
    this._record = { ...record };
  }

  get parasiteId(): string {
    return this._record.parasiteId;
  }

  get mimicryLevel(): number {
    return this._record.mimicryLevel;
  }

  get tasksInjected(): number {
    return this._record.tasksInjected;
  }

  public injectTask(taskId: string, description: string, cost: number): boolean {
    if (this._injectedTasks.has(taskId)) {
      return false;
    }
    const accepted = Math.random() < this._record.mimicryLevel;
    const task: InjectedTask = { taskId, description, cost, accepted, completed: false };
    this._injectedTasks.set(taskId, task);
    this._record.tasksInjected++;
    if (accepted) {
      this._deceptionSuccess++;
      this._hostEnergyDrained += cost;
    } else {
      this._exposureRisk = Math.min(1, this._exposureRisk + 0.15);
    }
    return accepted;
  }

  public improveMimicry(hostSignature: string): void {
    const similarity = this._signatureSimilarity(this._record.disguiseSignature, hostSignature);
    this._record.mimicryLevel = Math.min(1, this._record.mimicryLevel * 0.8 + similarity * 0.2);
    this._exposureRisk = Math.max(0, this._exposureRisk - 0.05);
  }

  private _signatureSimilarity(a: string, b: string): number {
    if (a.length === 0 && b.length === 0) {
      return 1;
    }
    const setA = new Set(a.split(''));
    const setB = new Set(b.split(''));
    let common = 0;
    setA.forEach((c) => {
      if (setB.has(c)) {
        common++;
      }
    });
    return common / Math.max(setA.size, setB.size);
  }

  public monitorTask(taskId: string): InjectedTask | null {
    const task = this._injectedTasks.get(taskId);
    return task ? { ...task } : null;
  }

  public markCompleted(taskId: string): void {
    const task = this._injectedTasks.get(taskId);
    if (task && task.accepted) {
      task.completed = true;
    }
  }

  public harvestResults(): number {
    let harvested = 0;
    this._injectedTasks.forEach((task) => {
      if (task.completed) {
        harvested += task.cost;
      }
    });
    return harvested;
  }

  public evadeDetection(): boolean {
    if (this._exposureRisk > 0.8) {
      return false;
    }
    this._record.mimicryLevel = Math.min(1, this._record.mimicryLevel + 0.02);
    this._exposureRisk = Math.max(0, this._exposureRisk - 0.1);
    return true;
  }

  public abandonTask(taskId: string): void {
    const task = this._injectedTasks.get(taskId);
    if (task && !task.completed) {
      this._exposureRisk = Math.min(1, this._exposureRisk + 0.05);
      this._injectedTasks.delete(taskId);
    }
  }

  public broodReport(): Record<string, unknown> {
    const completed = Array.from(this._injectedTasks.values()).filter((t) => t.completed).length;
    return {
      parasiteId: this.parasiteId,
      tasksInjected: this._record.tasksInjected,
      acceptedTasks: this._deceptionSuccess,
      completedTasks: completed,
      mimicryLevel: this._record.mimicryLevel.toFixed(3),
      exposureRisk: this._exposureRisk.toFixed(3),
      hostEnergyDrained: this._hostEnergyDrained.toFixed(2),
    };
  }
}
