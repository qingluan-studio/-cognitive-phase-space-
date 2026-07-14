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
  entropy: number;
}

export class BroodParasite {
  private _record: BroodParasiteRecord;
  private _injectedTasks: Map<string, InjectedTask> = new Map();
  private _deceptionSuccess: number = 0;
  private _hostEnergyDrained: number = 0;
  private _exposureRisk: number = 0;
  private _markovState: number = 0;
  private _transitionMatrix: number[][] = [
    [0.7, 0.2, 0.1],
    [0.3, 0.5, 0.2],
    [0.1, 0.3, 0.6],
  ];

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

  get exposureRisk(): number {
    return this._exposureRisk;
  }

  private _transitionMarkov(): number {
    const row = this._transitionMatrix[this._markovState];
    const r = Math.random();
    let cum = 0;
    for (let i = 0; i < row.length; i++) {
      cum += row[i];
      if (r <= cum) {
        this._markovState = i;
        return i;
      }
    }
    return this._markovState;
  }

  public injectTask(taskId: string, description: string, cost: number): boolean {
    if (this._injectedTasks.has(taskId)) {
      return false;
    }
    const stateFactor = this._markovState / 2;
    const adjustedMimicry = this._record.mimicryLevel * (1 - 0.1 * stateFactor);
    const accepted = Math.random() < adjustedMimicry;
    const entropy = this._shannonEntropy(description);
    const task: InjectedTask = { taskId, description, cost, accepted, completed: false, entropy };
    this._injectedTasks.set(taskId, task);
    this._record.tasksInjected++;
    if (accepted) {
      this._deceptionSuccess++;
      this._hostEnergyDrained += cost;
    } else {
      this._exposureRisk = Math.min(1, this._exposureRisk + 0.15);
    }
    this._transitionMarkov();
    return accepted;
  }

  private _shannonEntropy(text: string): number {
    const freq: Record<string, number> = {};
    for (const c of text) freq[c] = (freq[c] ?? 0) + 1;
    const len = text.length;
    return -Object.values(freq).reduce((s, count) => {
      const p = count / len;
      return p > 0 ? s + p * Math.log2(p) : s;
    }, 0);
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

  public computeKullbackLeibler(): number {
    const completed = Array.from(this._injectedTasks.values()).filter((t) => t.completed).length;
    const p = completed / (this._injectedTasks.size || 1);
    const q = this._record.mimicryLevel;
    if (p === 0 || q === 0) return 0;
    return p * Math.log2(p / q) + (1 - p) * Math.log2((1 - p) / (1 - q));
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
      klDivergence: this.computeKullbackLeibler().toFixed(3),
    };
  }
}
