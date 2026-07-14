/**
 * BorderPatrol - 边界巡逻
 * 监控跨越边界的所有行为，识别非法穿越、走私与异常流量，
 * 维护边界的完整性与安全性。
 */

export interface BorderPatrolRecord {
  readonly patrolId: string;
  boundaryId: string;
  patrolRadius: number;
  vigilance: number;
}

export interface CrossingEvent {
  readonly eventId: string;
  direction: 'inbound' | 'outbound';
  payload: string;
  authorized: boolean;
  intercepted: boolean;
  timestamp: number;
}

export class BorderPatrol {
  private _record: BorderPatrolRecord;
  private _events: CrossingEvent[] = [];
  private _interceptionCount: number = 0;
  private _authorizedList: Set<string> = new Set();
  private _alertLevel: number = 0;

  constructor(record: BorderPatrolRecord) {
    this._record = { ...record };
  }

  get patrolId(): string {
    return this._record.patrolId;
  }

  get boundaryId(): string {
    return this._record.boundaryId;
  }

  get alertLevel(): number {
    return this._alertLevel;
  }

  public authorize(entity: string): void {
    this._authorizedList.add(entity);
  }

  public revokeAuthorization(entity: string): void {
    this._authorizedList.delete(entity);
  }

  public monitorCrossing(event: CrossingEvent): boolean {
    const authorized = this._authorizedList.has(event.payload);
    let intercepted = false;
    if (!authorized) {
      const detectChance = this._record.vigilance;
      if (Math.random() < detectChance) {
        intercepted = true;
        this._interceptionCount++;
        this._alertLevel = Math.min(1, this._alertLevel + 0.1);
      }
    }
    const recorded: CrossingEvent = { ...event, authorized, intercepted };
    this._events.push(recorded);
    if (this._events.length > 80) {
      this._events.shift();
    }
    return intercepted;
  }

  public sweep(): number {
    const suspicious = this._events.filter((e) => !e.authorized && !e.intercepted);
    const caught = suspicious.length;
    suspicious.forEach((e) => {
      e.intercepted = true;
      this._interceptionCount++;
    });
    this._alertLevel = Math.min(1, this._alertLevel + caught * 0.05);
    return caught;
  }

  public increaseVigilance(amount: number): void {
    this._record.vigilance = Math.min(1, this._record.vigilance + amount);
  }

  public standDown(): void {
    this._alertLevel = Math.max(0, this._alertLevel - 0.2);
    this._record.vigilance = Math.max(0.3, this._record.vigilance - 0.05);
  }

  public analyzeTraffic(windowSize: number): Record<string, number> {
    const recent = this._events.slice(-windowSize);
    const stats: Record<string, number> = {
      total: recent.length,
      inbound: 0,
      outbound: 0,
      unauthorized: 0,
      intercepted: 0,
    };
    recent.forEach((e) => {
      if (e.direction === 'inbound') {
        stats.inbound++;
      } else {
        stats.outbound++;
      }
      if (!e.authorized) {
        stats.unauthorized++;
      }
      if (e.intercepted) {
        stats.intercepted++;
      }
    });
    return stats;
  }

  public patrolReport(): Record<string, unknown> {
    return {
      patrolId: this.patrolId,
      boundaryId: this.boundaryId,
      vigilance: this._record.vigilance.toFixed(3),
      alertLevel: this._alertLevel.toFixed(3),
      totalEvents: this._events.length,
      interceptions: this._interceptionCount,
      authorizedEntities: this._authorizedList.size,
      patrolRadius: this._record.patrolRadius,
    };
  }
}
