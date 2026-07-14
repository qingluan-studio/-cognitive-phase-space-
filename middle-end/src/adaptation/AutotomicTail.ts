/**
 * 自切尾模块：遇致命攻击时主动断开外围尾段以保全核心处理，
 * 危机过后依据再生计划逐步恢复被丢弃的功能。仿生自蜥蜴断尾求生。
 */

export interface TailSegment {
  id: string;
  name: string;
  priority: number;
  regenerable: boolean;
  data: Record<string, unknown>;
}

export interface AutotomicEvent {
  timestamp: number;
  threatLevel: number;
  detachedSegments: string[];
  coreIntact: boolean;
}

export interface RegenerationPlan {
  segmentId: string;
  eta: number;
  progress: number;
  completed: boolean;
}

export class AutotomicTail {
  private _segments: Map<string, TailSegment> = new Map();
  private _detached: Set<string> = new Set();
  private _plans: Map<string, RegenerationPlan> = new Map();
  private _events: AutotomicEvent[] = [];
  private _coreIntact = true;
  private _lethalThreshold = 0.8;

  attachSegment(segment: TailSegment): void {
    this._segments.set(segment.id, segment);
  }

  assessThreat(level: number): boolean {
    return level >= this._lethalThreshold;
  }

  detachTail(threatLevel: number): AutotomicEvent {
    const toDetach: string[] = [];
    const sorted = Array.from(this._segments.values()).sort(
      (a, b) => a.priority - b.priority
    );
    const dropRatio = Math.min(1, (threatLevel - this._lethalThreshold) / (1 - this._lethalThreshold));
    const dropCount = Math.ceil(sorted.length * dropRatio);

    for (const seg of sorted.slice(0, dropCount)) {
      this._detached.add(seg.id);
      toDetach.push(seg.id);
      if (seg.regenerable) {
        this._plans.set(seg.id, {
          segmentId: seg.id,
          eta: Date.now() + 60000,
          progress: 0,
          completed: false,
        });
      }
    }

    const event: AutotomicEvent = {
      timestamp: Date.now(),
      threatLevel,
      detachedSegments: toDetach,
      coreIntact: this._coreIntact,
    };
    this._events.push(event);
    return event;
  }

  preserveCore(): boolean {
    this._coreIntact = this._detached.size < this._segments.size;
    return this._coreIntact;
  }

  regenerateTail(): RegenerationPlan[] {
    const updates: RegenerationPlan[] = [];
    const now = Date.now();
    for (const plan of this._plans.values()) {
      if (plan.completed) {
        updates.push(plan);
        continue;
      }
      const total = plan.eta - (plan.eta - 60000);
      plan.progress = Math.min(1, (now - (plan.eta - 60000)) / total);
      if (plan.progress >= 1) {
        plan.completed = true;
        this._detached.delete(plan.segmentId);
      }
      updates.push(plan);
    }
    return updates;
  }

  getLostSegments(): string[] {
    return Array.from(this._detached);
  }

  getActiveSegments(): string[] {
    return Array.from(this._segments.keys()).filter(id => !this._detached.has(id));
  }

  isCoreIntact(): boolean {
    return this._coreIntact;
  }

  getAutotomyHistory(): AutotomicEvent[] {
    return [...this._events];
  }

  get segmentCount(): number {
    return this._segments.size;
  }
}
