import { DataPacket, PacketMeta } from '../shared/types';

export interface StreamEvent {
  eventId: string;
  timestamp: number;
  data: unknown;
  type: string;
}

export interface StreamJob {
  name: string;
  throughput: number;
  latency: number;
  status: string;
}

export class StreamProcessing {
  private _events: StreamEvent[] = [];
  private _jobs: Map<string, StreamJob> = new Map();
  private _counter = 0;

  kafkaConsume(topic: string, groupId: string): StreamEvent[] {
    const events: StreamEvent[] = [];
    for (let i = 0; i < 10; i++) {
      events.push({
        eventId: `evt-${++this._counter}`,
        timestamp: Date.now() + i * 1000,
        data: { topic, partition: i % 3, offset: i * 100 },
        type: 'kafka_message',
      });
    }
    this._events.push(...events);
    return events;
  }

  kafkaProduce(topic: string, message: unknown): boolean {
    return true;
  }

  streamFilter(stream: StreamEvent[], predicate: (event: StreamEvent) => boolean): StreamEvent[] {
    return stream.filter(predicate);
  }

  streamMap(stream: StreamEvent[], func: (event: StreamEvent) => StreamEvent): StreamEvent[] {
    return stream.map(func);
  }

  streamAggregate(stream: StreamEvent[], window: { size: number; type: string }, func: (events: StreamEvent[]) => unknown): StreamEvent[] {
    const result: StreamEvent[] = [];
    for (let i = 0; i < stream.length; i += window.size) {
      const batch = stream.slice(i, i + window.size);
      result.push({
        eventId: `agg-${++this._counter}`,
        timestamp: batch[batch.length - 1].timestamp,
        data: func(batch),
        type: 'aggregate',
      });
    }
    return result;
  }

  streamJoin(stream1: StreamEvent[], stream2: StreamEvent[], window: { size: number }): StreamEvent[] {
    const result: StreamEvent[] = [];
    const map2 = new Map<string, StreamEvent>();
    for (const e of stream2) map2.set(e.eventId, e);
    for (const e1 of stream1) {
      result.push({
        eventId: `join-${e1.eventId}`,
        timestamp: e1.timestamp,
        data: { left: e1, right: map2.get(e1.eventId) },
        type: 'join',
      });
    }
    return result;
  }

  windowedAggregate(stream: StreamEvent[], window: { type: string; size: number }, func: (events: StreamEvent[]) => unknown): StreamEvent[] {
    return this.streamAggregate(stream, window, func);
  }

  tumblingWindow(stream: StreamEvent[], size: number, func: (events: StreamEvent[]) => unknown): StreamEvent[] {
    return this.streamAggregate(stream, { size, type: 'tumbling' }, func);
  }

  slidingWindow(stream: StreamEvent[], size: number, slide: number, func: (events: StreamEvent[]) => unknown): StreamEvent[] {
    const result: StreamEvent[] = [];
    for (let i = 0; i < stream.length - size + 1; i += slide) {
      const window = stream.slice(i, i + size);
      result.push({
        eventId: `slide-${++this._counter}`,
        timestamp: window[window.length - 1].timestamp,
        data: func(window),
        type: 'sliding_window',
      });
    }
    return result;
  }

  sessionWindow(stream: StreamEvent[], gap: number, func: (events: StreamEvent[]) => unknown): StreamEvent[] {
    const result: StreamEvent[] = [];
    let session: StreamEvent[] = [];
    for (let i = 0; i < stream.length; i++) {
      if (session.length > 0 && stream[i].timestamp - session[session.length - 1].timestamp > gap) {
        result.push({
          eventId: `session-${++this._counter}`,
          timestamp: session[session.length - 1].timestamp,
          data: func(session),
          type: 'session_window',
        });
        session = [];
      }
      session.push(stream[i]);
    }
    if (session.length > 0) {
      result.push({
        eventId: `session-${++this._counter}`,
        timestamp: session[session.length - 1].timestamp,
        data: func(session),
        type: 'session_window',
      });
    }
    return result;
  }

  statefulProcess(stream: StreamEvent[], stateFunc: (state: Record<string, unknown>, event: StreamEvent) => { state: Record<string, unknown>; output: unknown }): StreamEvent[] {
    const state: Record<string, unknown> = {};
    const result: StreamEvent[] = [];
    for (const event of stream) {
      const { state: newState, output } = stateFunc(state, event);
      Object.assign(state, newState);
      result.push({
        eventId: `stateful-${event.eventId}`,
        timestamp: event.timestamp,
        data: output,
        type: 'stateful',
      });
    }
    return result;
  }

  checkpointing(stream: StreamEvent[], interval: number): StreamEvent[] {
    return stream.map((e, i) => ({
      ...e,
      data: { ...(e.data as object), checkpoint: i % interval === 0 },
    }));
  }

  watermark(stream: StreamEvent[], delay: number): StreamEvent[] {
    return stream.map(e => ({
      ...e,
      data: { ...(e.data as object), watermark: e.timestamp + delay },
    }));
  }

  exactlyOnce(stream: StreamEvent[], idempotent: (event: StreamEvent) => string): StreamEvent[] {
    const seen = new Set<string>();
    const result: StreamEvent[] = [];
    for (const event of stream) {
      const key = idempotent(event);
      if (!seen.has(key)) {
        seen.add(key);
        result.push(event);
      }
    }
    return result;
  }

  toPacket(): DataPacket<{
    events: StreamEvent[];
    jobs: Map<string, StreamJob>;
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['big_data', 'StreamProcessing'],
      priority: 1,
      phase: 'stream_processing',
    };
    return {
      id: `stream-processing-${Date.now().toString(36)}`,
      payload: {
        events: this._events,
        jobs: this._jobs,
      },
      metadata,
    };
  }

  reset(): void {
    this._events = [];
    this._jobs = new Map();
    this._counter = 0;
  }

  get eventCount(): number { return this._events.length; }
  get jobCount(): number { return this._jobs.size; }
}
