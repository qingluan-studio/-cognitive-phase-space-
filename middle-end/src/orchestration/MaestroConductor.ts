export type EmotionCurve = {
  timestamp: number;
  valence: number;
  arousal: number;
  dominance: number;
};

export type ServiceDescriptor = {
  id: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  emotionalImpact: number;
  latency: number;
};

export type ScheduledTask = {
  serviceId: string;
  executionTime: number;
  retryCount: number;
  maxRetries: number;
};

export class MaestroConductor {
  private emotionalState: EmotionCurve = {
    timestamp: Date.now(),
    valence: 0.5,
    arousal: 0.5,
    dominance: 0.5,
  };

  private services: Map<string, ServiceDescriptor> = new Map();
  private taskQueue: ScheduledTask[] = [];

  registerService(descriptor: ServiceDescriptor): void {
    this.services.set(descriptor.id, descriptor);
  }

  updateEmotionalState(curve: Partial<EmotionCurve>): void {
    this.emotionalState = {
      ...this.emotionalState,
      ...curve,
      timestamp: Date.now(),
    };
  }

  private calculatePriority(service: ServiceDescriptor): number {
    const emotionalFactor = this.emotionalState.arousal * service.emotionalImpact;
    const urgencyFactor = service.priority === 'critical' ? 10 :
                          service.priority === 'high' ? 5 :
                          service.priority === 'medium' ? 2 : 1;
    return emotionalFactor * urgencyFactor / service.latency;
  }

  scheduleServices(serviceIds: string[]): ScheduledTask[] {
    const now = Date.now();
    const scheduled = serviceIds
      .map(id => ({ id, service: this.services.get(id) }))
      .filter(({ service }) => service)
      .sort((a, b) => this.calculatePriority(b.service!) - this.calculatePriority(a.service!))
      .map(({ id, service }, index) => ({
        serviceId: id,
        executionTime: now + index * service!.latency,
        retryCount: 0,
        maxRetries: service!.priority === 'critical' ? 3 : 1,
      }));

    this.taskQueue = [...this.taskQueue, ...scheduled];
    return scheduled;
  }

  executeNextTask(): Promise<ScheduledTask | null> {
    const now = Date.now();
    const taskIndex = this.taskQueue.findIndex(t => t.executionTime <= now);
    
    if (taskIndex === -1) return Promise.resolve(null);
    
    const task = this.taskQueue.splice(taskIndex, 1)[0];
    return this.executeTask(task);
  }

  private async executeTask(task: ScheduledTask): Promise<ScheduledTask | null> {
    const service = this.services.get(task.serviceId);
    if (!service) return null;

    try {
      await new Promise(resolve => setTimeout(resolve, service.latency));
      return task;
    } catch {
      if (task.retryCount < task.maxRetries) {
        task.retryCount++;
        task.executionTime = Date.now() + service.latency * Math.pow(2, task.retryCount);
        this.taskQueue.push(task);
      }
      return null;
    }
  }

  getQueueStatus(): { pending: number; inProgress: number; completed: number } {
    return {
      pending: this.taskQueue.length,
      inProgress: 0,
      completed: 0,
    };
  }

  clearQueue(): void {
    this.taskQueue = [];
  }
}