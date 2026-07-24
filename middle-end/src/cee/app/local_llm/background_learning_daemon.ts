/**
 * 背景学习守护进程 — TypeScript 端
 *
 * 在 Ouroboros 循环闲置期异步运行梦境巩固，
 * 把评估结果持续蒸馏为吸引子知识，实现学习-遗忘闭环。
 */

import { DreamConsolidator, DreamCycleResult, DreamInsight } from './dream_consolidator';

export interface BackgroundLearningConfig {
  idleThresholdMs: number;
  maxPendingAssessments: number;
  autoVerifyThreshold: number;
}

export interface PendingAssessment {
  iteration: number;
  quality: number;
  waterPassed: boolean;
  violations: string[];
  timestamp: number;
}

export class BackgroundLearningDaemon {
  private _consolidator: DreamConsolidator;
  private _config: BackgroundLearningConfig;
  private _pending: PendingAssessment[] = [];
  private _lastActivity = Date.now();
  private _timer: ReturnType<typeof setInterval> | null = null;
  private _running = false;

  constructor(
    consolidator: DreamConsolidator,
    config: Partial<BackgroundLearningConfig> = {},
  ) {
    this._consolidator = consolidator;
    this._config = {
      idleThresholdMs: 30000,
      maxPendingAssessments: 50,
      autoVerifyThreshold: 0.85,
      ...config,
    };
  }

  get isRunning(): boolean {
    return this._running;
  }

  submitAssessment(assessment: Omit<PendingAssessment, 'timestamp'>): void {
    this._pending.push({ ...assessment, timestamp: Date.now() });
    this._lastActivity = Date.now();
    if (this._pending.length > this._config.maxPendingAssessments) {
      this._pending = this._pending.slice(-this._config.maxPendingAssessments);
    }
  }

  start(): void {
    if (this._running) return;
    this._running = true;
    this._timer = setInterval(() => this._tick(), 5000);
  }

  stop(): void {
    this._running = false;
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }

  flush(): DreamCycleResult {
    const result = this._consolidator.dreamCycle();
    this._pending = [];
    this._lastActivity = Date.now();
    return result;
  }

  getPendingCount(): number {
    return this._pending.length;
  }

  getTopInsights(topK = 3): DreamInsight[] {
    return this._consolidator.getPendingInsights(topK);
  }

  private _tick(): void {
    const idle = Date.now() - this._lastActivity;
    if (idle >= this._config.idleThresholdMs && this._pending.length > 0) {
      this._processPending();
    }
  }

  private _processPending(): void {
    for (const a of this._pending) {
      this._consolidator.ingestAssessment(a.iteration, a.quality, a.waterPassed, a.violations);
    }
    const cycle = this._consolidator.dreamCycle();
    for (const insight of cycle.emergentInsights) {
      if (insight.confidence >= this._config.autoVerifyThreshold) {
        this._consolidator.verifyInsight(insight.id, true);
      }
    }
    this._pending = [];
    this._lastActivity = Date.now();
  }
}
