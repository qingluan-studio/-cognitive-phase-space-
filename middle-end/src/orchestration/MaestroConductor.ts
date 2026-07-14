export type EmotionCurve = { timestamp: number; valence: number; arousal: number; dominance: number };
export type ServiceDescriptor = { id: string; priority: 'low' | 'medium' | 'high' | 'critical'; emotionalImpact: number; latency: number };
export type ScheduledTask = { serviceId: string; executionTime: number; retryCount: number; maxRetries: number; priorityScore: number };
export type TaskStatus = 'pending' | 'executing' | 'completed' | 'failed';
export type TaskRecord = ScheduledTask & { status: TaskStatus; startTime?: number; endTime?: number };

export class MaestroConductor {
  private _emotion: EmotionCurve = { timestamp: Date.now(), valence: 0.5, arousal: 0.5, dominance: 0.5 };
  private _services: Map<string, ServiceDescriptor> = new Map();
  private _queue: ScheduledTask[] = [];
  private _records: Map<string, TaskRecord[]> = new Map();
  private _damping = 0.92;
  private _decay = 0.02;

  get emotionalState(): EmotionCurve { return { ...this._emotion }; }
  get pendingTasks(): number { return this._queue.length; }

  registerService(descriptor: ServiceDescriptor): void { this._services.set(descriptor.id, descriptor); }

  updateEmotionalState(curve: Partial<EmotionCurve>): void {
    const dt = (Date.now() - this._emotion.timestamp) / 1000;
    const targets = {
      valence: curve.valence ?? this._emotion.valence,
      arousal: curve.arousal ?? this._emotion.arousal,
      dominance: curve.dominance ?? this._emotion.dominance,
    };

    this._emotion.valence = this._dampedOsc(this._emotion.valence, targets.valence, dt);
    this._emotion.arousal = this._dampedOsc(this._emotion.arousal, targets.arousal, dt);
    this._emotion.dominance = this._dampedOsc(this._emotion.dominance, targets.dominance, dt);
    this._emotion.arousal = Math.max(0.1, Math.min(1, this._emotion.arousal * (1 - this._decay * dt)));
    this._emotion.timestamp = Date.now();
  }

  private _dampedOsc(current: number, target: number, dt: number): number {
    const k = 0.8, b = 2 * Math.sqrt(k) * this._damping;
    const acc = k * (target - current) - b * current;
    return Math.max(0, Math.min(1, current + acc * dt));
  }

  private _priority(service: ServiceDescriptor): number {
    const weights: Record<string, number> = { low: 1, medium: 3, high: 7, critical: 15 };
    const emo = 1 / (1 + Math.exp(-4 * (this._emotion.arousal * service.emotionalImpact - 0.5)));
    return emo * weights[service.priority] * (1 - service.latency / 1000) * Math.exp(-service.latency / 500);
  }

  scheduleServices(serviceIds: string[]): ScheduledTask[] {
    const now = Date.now();
    const scheduled = serviceIds
      .map(id => ({ id, service: this._services.get(id) }))
      .filter(({ service }) => service)
      .map(({ id, service }) => ({
        serviceId: id,
        executionTime: now + service!.latency * (1 - this._priority(service!) * 0.5),
        retryCount: 0,
        maxRetries: service!.priority === 'critical' ? 5 : service!.priority === 'high' ? 3 : 1,
        priorityScore: this._priority(service!),
      }));

    this._queue = [...this._queue, ...scheduled].sort((a, b) => a.priorityScore - b.priorityScore);
    return scheduled;
  }

  executeNextTask(): Promise<ScheduledTask | null> {
    const now = Date.now();
    const idx = this._queue.findIndex(t => t.executionTime <= now);
    if (idx === -1) return Promise.resolve(null);
    
    const [task] = this._queue.splice(idx, 1);
    return this._execute(task);
  }

  private async _execute(task: ScheduledTask): Promise<ScheduledTask | null> {
    const service = this._services.get(task.serviceId);
    if (!service) return null;
    
    this._record(task, 'executing');
    try {
      await new Promise(r => setTimeout(r, service.latency));
      this._record(task, 'completed');
      return task;
    } catch {
      if (task.retryCount < task.maxRetries) {
        task.retryCount++;
        task.executionTime = Date.now() + service.latency * Math.pow(2, task.retryCount) * (1 + Math.random() * 0.2);
        this._queue.push(task);
      } else {
        this._record(task, 'failed');
      }
      return null;
    }
  }

  private _record(task: ScheduledTask, status: TaskStatus): void {
    const records = this._records.get(task.serviceId) ?? [];
    records.push({ ...task, status, startTime: status === 'executing' ? Date.now() : undefined, endTime: status !== 'executing' ? Date.now() : undefined });
    this._records.set(task.serviceId, records);
  }

  getQueueStatus(): { pending: number; completed: number; failed: number } {
    let completed = 0, failed = 0;
    this._records.forEach(records => records.forEach(r => { if (r.status === 'completed') completed++; if (r.status === 'failed') failed++; }));
    return { pending: this._queue.length, completed, failed };
  }

  getServiceStats(serviceId: string): { successRate: number; avgLatency: number; totalTasks: number } | null {
    const records = this._records.get(serviceId);
    if (!records?.length) return null;
    const completed = records.filter(r => r.status === 'completed');
    return {
      successRate: completed.length / records.length,
      avgLatency: completed.length ? completed.reduce((s, r) => s + (r.endTime! - r.startTime!), 0) / completed.length : 0,
      totalTasks: records.length,
    };
  }

  clearQueue(): void { this._queue = []; }
  removeService(serviceId: string): void { this._services.delete(serviceId); this._records.delete(serviceId); }
}