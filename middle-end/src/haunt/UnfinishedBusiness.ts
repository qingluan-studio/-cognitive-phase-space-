/**
 * 未竟事务：未完成的事务重复出现。
 * 未完成的事务作为幽灵不断重新浮现，要求被解决或被安息。
 */

export type BusinessStatus = 'pending' | 'recurring' | 'resolved' | 'buried';

export interface UnfinishedItem {
  id: string;
  description: string;
  status: BusinessStatus;
  recurrenceCount: number;
  lastSeen: number;
  priority: 'low' | 'medium' | 'high';
}

export interface RecurrenceEvent {
  itemId: string;
  occurredAt: number;
  triggeredBy: string;
}

export class UnfinishedBusiness {
  private _items: Map<string, UnfinishedItem> = new Map();
  private _recurrences: RecurrenceEvent[] = [];
  private _recurrenceInterval = 10000;
  private _lastRecurrenceAt = 0;

  add(description: string, priority: UnfinishedItem['priority'] = 'medium'): UnfinishedItem {
    const item: UnfinishedItem = {
      id: `biz-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      description,
      status: 'pending',
      recurrenceCount: 0,
      lastSeen: Date.now(),
      priority,
    };
    this._items.set(item.id, item);
    return item;
  }

  resolve(itemId: string): UnfinishedItem | null {
    const item = this._items.get(itemId);
    if (!item) return null;
    item.status = 'resolved';
    item.lastSeen = Date.now();
    return item;
  }

  bury(itemId: string): UnfinishedItem | null {
    const item = this._items.get(itemId);
    if (!item) return null;
    item.status = 'buried';
    return item;
  }

  checkRecurrence(triggeredBy: string = 'timer'): UnfinishedItem[] {
    const now = Date.now();
    if (now - this._lastRecurrenceAt < this._recurrenceInterval) return [];
    this._lastRecurrenceAt = now;

    const recurred: UnfinishedItem[] = [];
    for (const item of this._items.values()) {
      if (item.status === 'pending' || item.status === 'recurring') {
        item.status = 'recurring';
        item.recurrenceCount++;
        item.lastSeen = now;
        recurred.push({ ...item });
        this._recurrences.push({ itemId: item.id, occurredAt: now, triggeredBy });
      }
    }
    if (this._recurrences.length > 200) this._recurrences.shift();
    return recurred;
  }

  forceRecurrence(itemId: string, triggeredBy: string): UnfinishedItem | null {
    const item = this._items.get(itemId);
    if (!item || item.status === 'resolved' || item.status === 'buried') return null;
    item.recurrenceCount++;
    item.lastSeen = Date.now();
    this._recurrences.push({ itemId, occurredAt: Date.now(), triggeredBy });
    return item;
  }

  setRecurrenceInterval(ms: number): void {
    this._recurrenceInterval = Math.max(0, ms);
  }

  getPending(): UnfinishedItem[] {
    return Array.from(this._items.values()).filter(i => i.status === 'pending' || i.status === 'recurring');
  }

  getRecurrences(limit: number = 50): RecurrenceEvent[] {
    return this._recurrences.slice(-limit);
  }

  get itemCount(): number {
    return this._items.size;
  }
}
