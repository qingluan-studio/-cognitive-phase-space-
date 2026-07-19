import { DataPacket } from '../shared/types';

export interface ScheduledJob {
  id: string;
  name: string;
  cron: string;
  timezone: string;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  lastRun?: number;
  nextRun?: number;
}

export interface ScheduleRule {
  type: 'cron' | 'interval' | 'once' | 'recurring';
  expression?: string;
  interval?: number;
  unit?: string;
  date?: number;
}

interface JobExecution {
  id: string;
  jobId: string;
  startTime: number;
  endTime: number;
  status: 'success' | 'failed' | 'running';
  result?: unknown;
  error?: string;
}

interface JobQueue {
  id: string;
  name: string;
  priority: number;
  pending: number;
  processing: number;
  workers: number;
}

export class SchedulerEngine {
  private _jobs: Map<string, ScheduledJob> = new Map();
  private _executions: Map<string, JobExecution[]> = new Map();
  private _queues: Map<string, JobQueue> = new Map();
  private _dependencies: Map<string, string[]> = new Map();
  private _counter = 0;
  private _stats = {
    totalJobs: 0,
    activeJobs: 0,
    totalExecutions: 0,
    successRate: 1,
    avgExecutionTime: 0,
  };

  scheduleJob(name: string, cronExpression: string, task: string, timezone: string): ScheduledJob {
    const id = `job-${Date.now()}-${this._counter++}`;
    const job: ScheduledJob = {
      id,
      name,
      cron: cronExpression,
      timezone,
      status: 'active',
      lastRun: undefined,
      nextRun: Date.now() + 60000,
    };
    this._jobs.set(id, job);
    this._stats.totalJobs++;
    this._stats.activeJobs++;
    return job;
  }

  cancelJob(jobId: string): boolean {
    const job = this._jobs.get(jobId);
    if (!job) return false;
    job.status = 'cancelled';
    this._stats.activeJobs--;
    return true;
  }

  pauseJob(jobId: string): boolean {
    const job = this._jobs.get(jobId);
    if (!job) return false;
    job.status = 'paused';
    return true;
  }

  resumeJob(jobId: string): boolean {
    const job = this._jobs.get(jobId);
    if (!job) return false;
    job.status = 'active';
    return true;
  }

  rescheduleJob(jobId: string, newCron: string): boolean {
    const job = this._jobs.get(jobId);
    if (!job) return false;
    job.cron = newCron;
    job.nextRun = Date.now() + 60000;
    return true;
  }

  cronParse(expression: string): { valid: boolean; fields: Record<string, string>; description: string } {
    const parts = expression.split(' ');
    const fields: Record<string, string> = {
      second: parts[0] || '*',
      minute: parts[1] || '*',
      hour: parts[2] || '*',
      dayOfMonth: parts[3] || '*',
      month: parts[4] || '*',
      dayOfWeek: parts[5] || '*',
    };
    return {
      valid: parts.length >= 5,
      fields,
      description: `Runs at ${fields.hour}:${fields.minute} on ${fields.dayOfWeek}`,
    };
  }

  cronEvaluate(expression: string, fromDate: number, count: number): number[] {
    const dates: number[] = [];
    let current = fromDate;
    for (let i = 0; i < count; i++) {
      current += 60000 * 60;
      dates.push(current);
    }
    return dates;
  }

  intervalJob(name: string, interval: number, task: string, unit: string): ScheduledJob {
    const id = `job-interval-${Date.now()}-${this._counter++}`;
    const job: ScheduledJob = {
      id,
      name,
      cron: `every ${interval} ${unit}`,
      timezone: 'UTC',
      status: 'active',
      nextRun: Date.now() + interval * (unit === 'minutes' ? 60000 : unit === 'hours' ? 3600000 : 1000),
    };
    this._jobs.set(id, job);
    this._stats.totalJobs++;
    this._stats.activeJobs++;
    return job;
  }

  oneTimeJob(name: string, dateTime: number, task: string): ScheduledJob {
    const id = `job-once-${Date.now()}-${this._counter++}`;
    const job: ScheduledJob = {
      id,
      name,
      cron: `once at ${dateTime}`,
      timezone: 'UTC',
      status: 'active',
      nextRun: dateTime,
    };
    this._jobs.set(id, job);
    this._stats.totalJobs++;
    this._stats.activeJobs++;
    return job;
  }

  recurringJob(name: string, rule: ScheduleRule, task: string): ScheduledJob {
    const id = `job-recurring-${Date.now()}-${this._counter++}`;
    const job: ScheduledJob = {
      id,
      name,
      cron: rule.expression || rule.type,
      timezone: 'UTC',
      status: 'active',
      nextRun: Date.now() + 3600000,
    };
    this._jobs.set(id, job);
    this._stats.totalJobs++;
    this._stats.activeJobs++;
    return job;
  }

  jobDependencies(jobs: string[], graph: Record<string, string[]>): { dependencies: number; order: string[]; valid: boolean } {
    for (const [job, deps] of Object.entries(graph)) {
      this._dependencies.set(job, deps);
    }
    return {
      dependencies: Object.keys(graph).length,
      order: jobs,
      valid: true,
    };
  }

  jobQueue(priority: number, workers: number, strategy: string): JobQueue {
    const id = `queue-${Date.now()}-${this._counter++}`;
    const queue: JobQueue = {
      id,
      name: `queue-${priority}`,
      priority,
      pending: 0,
      processing: 0,
      workers,
    };
    this._queues.set(id, queue);
    return queue;
  }

  jobHistory(jobId: string, limit: number): { executions: JobExecution[]; total: number; successRate: number } {
    const executions = this._executions.get(jobId) || [];
    const successCount = executions.filter(e => e.status === 'success').length;
    return {
      executions: executions.slice(-limit),
      total: executions.length,
      successRate: executions.length > 0 ? successCount / executions.length : 1,
    };
  }

  get jobCount(): number {
    return this._jobs.size;
  }

  get activeJobCount(): number {
    return Array.from(this._jobs.values()).filter(j => j.status === 'active').length;
  }

  get queueCount(): number {
    return this._queues.size;
  }

  get stats(): { totalJobs: number; activeJobs: number; totalExecutions: number; successRate: number; avgExecutionTime: number } {
    return { ...this._stats };
  }

  public toPacket(): DataPacket<{
    jobs: number;
    activeJobs: number;
    queues: number;
    dependencies: number;
    stats: { totalJobs: number; activeJobs: number; totalExecutions: number; successRate: number; avgExecutionTime: number };
  }> {
    return {
      id: `scheduler-${Date.now()}-${this._counter}`,
      payload: {
        jobs: this._jobs.size,
        activeJobs: this.activeJobCount,
        queues: this._queues.size,
        dependencies: this._dependencies.size,
        stats: { ...this._stats },
      },
      metadata: {
        createdAt: Date.now(),
        route: ['automation', 'scheduler', 'result'],
        priority: 0.6,
        phase: 'scheduling',
      },
    };
  }

  public reset(): void {
    this._jobs.clear();
    this._executions.clear();
    this._queues.clear();
    this._dependencies.clear();
    this._counter = 0;
    this._stats = {
      totalJobs: 0,
      activeJobs: 0,
      totalExecutions: 0,
      successRate: 1,
      avgExecutionTime: 0,
    };
  }
}
