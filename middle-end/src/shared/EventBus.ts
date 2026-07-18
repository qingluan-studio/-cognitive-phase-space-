/**
 * Rhizome Event Bus — decentralized, membrane-permeable messaging.
 * Any module can emit or listen without hierarchical registration.
 */

type Listener<T = unknown> = (payload: T) => void | Promise<void>;

export class EventBus {
  private static instance?: EventBus;
  private listeners = new Map<string, Set<Listener>>();
  private history: Array<{ channel: string; payload: unknown; at: number }> = [];

  private constructor() {}

  static getInstance(): EventBus {
    if (!EventBus.instance) EventBus.instance = new EventBus();
    return EventBus.instance;
  }

  static reset(): void {
    EventBus.instance = undefined;
  }

  on<T>(channel: string, listener: Listener<T>): () => void {
    if (!this.listeners.has(channel)) this.listeners.set(channel, new Set());
    const set = this.listeners.get(channel)!;
    const wrapped = (payload: unknown) => listener(payload as T);
    set.add(wrapped as Listener);
    return () => set.delete(wrapped as Listener);
  }

  once<T>(channel: string, listener: Listener<T>): void {
    const off = this.on<T>(channel, async (payload) => {
      off();
      await listener(payload);
    });
  }

  emit<T>(channel: string, payload: T): void {
    this.history.push({ channel, payload, at: Date.now() });
    if (this.history.length > 10000) this.history.splice(0, 1000);
    const set = this.listeners.get(channel);
    if (!set) return;
    for (const fn of Array.from(set)) {
      try {
        const r = fn(payload);
        if (r && typeof (r as Promise<void>).catch === 'function') (r as Promise<void>).catch(() => {});
      } catch {}
    }
  }

  async emitAsync<T>(channel: string, payload: T): Promise<void> {
    this.history.push({ channel, payload, at: Date.now() });
    const set = this.listeners.get(channel);
    if (!set) return;
    await Promise.all(
      Array.from(set).map(async (fn) => {
        try {
          await fn(payload);
        } catch {}
      })
    );
  }

  snapshot(channel?: string): Array<{ channel: string; payload: unknown; at: number }> {
    if (!channel) return [...this.history];
    return this.history.filter((h) => h.channel === channel);
  }
}

export const bus = EventBus.getInstance();
