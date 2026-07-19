import { DataPacket } from '../shared/types';

export interface MQTTMessage {
  readonly topic: string;
  readonly payload: string;
  readonly qos: 0 | 1 | 2;
  readonly retained: boolean;
}

export interface MQTTBroker {
  readonly hostname: string;
  readonly port: number;
  readonly clients: string[];
  readonly topics: Map<string, string[]>;
}

export class MQTTProtocol {
  private _broker: MQTTBroker = { hostname: 'localhost', port: 1883, clients: [], topics: new Map() };
  private _messages: MQTTMessage[] = [];
  private _history: string[] = [];
  private _counter = 0;

  get messageCount(): number {
    return this._messages.length;
  }

  get clientCount(): number {
    return this._broker.clients.length;
  }

  get topicCount(): number {
    return this._broker.topics.size;
  }

  get history(): string[] {
    return [...this._history];
  }

  public publish(topic: string, payload: string, qos: 0 | 1 | 2, retained: boolean): { message: MQTTMessage; published: boolean; topic: string } {
    const message: MQTTMessage = { topic, payload, qos, retained };
    this._messages.push(message);
    if (retained) {
      const subs = this._broker.topics.get(topic) ?? [];
      this._broker.topics.set(topic, subs);
    }
    this._recordHistory(`publish(topic=${topic}, qos=${qos}, retained=${retained})`);
    return { message, published: true, topic };
  }

  public subscribe(topic: string, qos: 0 | 1 | 2, client: string): { topic: string; qos: number; client: string; subscribed: boolean } {
    const subs = this._broker.topics.get(topic) ?? [];
    if (!subs.includes(client)) subs.push(client);
    this._broker.topics.set(topic, subs);
    if (!this._broker.clients.includes(client)) {
      this._broker.clients.push(client);
    }
    this._recordHistory(`subscribe(client=${client}, topic=${topic}, qos=${qos})`);
    return { topic, qos, client, subscribed: true };
  }

  public unsubscribe(topic: string, client: string): { topic: string; client: string; unsubscribed: boolean } {
    const subs = this._broker.topics.get(topic) ?? [];
    const idx = subs.indexOf(client);
    if (idx >= 0) subs.splice(idx, 1);
    this._broker.topics.set(topic, subs);
    this._recordHistory(`unsubscribe(client=${client}, topic=${topic})`);
    return { topic, client, unsubscribed: idx >= 0 };
  }

  public connect(client: string, broker: string, options: { cleanSession: boolean; keepAlive: number }): { client: string; broker: string; connected: boolean; sessionPresent: boolean } {
    if (!this._broker.clients.includes(client)) {
      this._broker.clients.push(client);
    }
    const sessionPresent = !options.cleanSession;
    this._recordHistory(`connect(client=${client}, broker=${broker}, clean=${options.cleanSession})`);
    return { client, broker, connected: true, sessionPresent };
  }

  public disconnect(client: string, reason: string): { client: string; reason: string; disconnected: boolean } {
    const idx = this._broker.clients.indexOf(client);
    if (idx >= 0) this._broker.clients.splice(idx, 1);
    this._recordHistory(`disconnect(client=${client}, reason=${reason})`);
    return { client, reason, disconnected: true };
  }

  public topicFilter(filter: string, topic: string): { filter: string; topic: string; matches: boolean } {
    const matches = this._matchTopic(filter, topic);
    this._recordHistory(`topicFilter(filter=${filter}, topic=${topic}) -> ${matches}`);
    return { filter, topic, matches };
  }

  public topicWildcard(topic: string, pattern: string): { topic: string; pattern: string; matches: boolean; groups: string[] } {
    const matches = this._matchTopic(pattern, topic);
    const groups: string[] = [];
    if (matches) {
      groups.push(topic.split('/').pop() ?? '');
    }
    this._recordHistory(`topicWildcard(pattern=${pattern}, topic=${topic})`);
    return { topic, pattern, matches, groups };
  }

  public retainedMessage(topic: string, payload: string): { topic: string; payload: string; retained: boolean; replaced: boolean } {
    const existing = this._broker.topics.has(topic);
    this._broker.topics.set(topic, []);
    this._recordHistory(`retainedMessage(topic=${topic}, replaced=${existing})`);
    return { topic, payload, retained: true, replaced: existing };
  }

  public lastWill(client: string, topic: string, message: string): { client: string; topic: string; message: string; set: boolean } {
    this._recordHistory(`lastWill(client=${client}, topic=${topic})`);
    return { client, topic, message, set: true };
  }

  public qos0FireAndForget(message: MQTTMessage, broker: string): { message: MQTTMessage; broker: string; delivered: boolean; guarantee: string } {
    const delivered = Math.random() > 0.1;
    this._recordHistory(`qos0(topic=${message.topic}) -> fire-and-forget`);
    return { message, broker, delivered, guarantee: 'at-most-once' };
  }

  public qos1AtLeastOnce(message: MQTTMessage, broker: string, client: string): { message: MQTTMessage; broker: string; acknowledged: boolean; guarantee: string } {
    const acknowledged = Math.random() > 0.05;
    this._recordHistory(`qos1(topic=${message.topic}, client=${client}) -> PUBACK=${acknowledged}`);
    return { message, broker, acknowledged, guarantee: 'at-least-once' };
  }

  public qos2ExactlyOnce(message: MQTTMessage, broker: string, client: string): { message: MQTTMessage; broker: string; complete: boolean; guarantee: string } {
    this._recordHistory(`qos2(topic=${message.topic}, client=${client}) -> exactly-once`);
    return { message, broker, complete: true, guarantee: 'exactly-once' };
  }

  public willMessage(client: string, topic: string, payload: string): { client: string; topic: string; payload: string; published: boolean } {
    this._recordHistory(`willMessage(client=${client}, topic=${topic})`);
    return { client, topic, payload, published: true };
  }

  public cleanSession(client: string, clean: boolean): { client: string; clean: boolean; sessionCleared: boolean } {
    this._recordHistory(`cleanSession(client=${client}, clean=${clean})`);
    return { client, clean, sessionCleared: clean };
  }

  public keepAlive(client: string, broker: string, interval: number): { client: string; broker: string; interval: number; alive: boolean } {
    const alive = Math.random() > 0.1;
    this._recordHistory(`keepAlive(client=${client}, interval=${interval}s) -> alive=${alive}`);
    return { client, broker, interval, alive };
  }

  private _matchTopic(filter: string, topic: string): boolean {
    if (filter === topic) return true;
    if (filter === '#') return true;
    const filterParts = filter.split('/');
    const topicParts = topic.split('/');
    if (filterParts.length !== topicParts.length && !filter.includes('#')) return false;
    for (let i = 0; i < Math.min(filterParts.length, topicParts.length); i++) {
      if (filterParts[i] === '#') return true;
      if (filterParts[i] !== '+' && filterParts[i] !== topicParts[i]) return false;
    }
    return filterParts.length === topicParts.length;
  }

  public toPacket(): DataPacket<{
    messages: number;
    clients: number;
    topics: number;
    history: string[];
  }> {
    return {
      id: `mqtt-${Date.now()}-${this._counter}`,
      payload: {
        messages: this._messages.length,
        clients: this._broker.clients.length,
        topics: this._broker.topics.size,
        history: [...this._history],
      },
      metadata: {
        createdAt: Date.now(),
        route: ['iot', 'mqtt', 'result'],
        priority: 0.7,
        phase: 'messaging',
      },
    };
  }

  public reset(): void {
    this._broker = { hostname: 'localhost', port: 1883, clients: [], topics: new Map() };
    this._messages = [];
    this._history = [];
    this._counter = 0;
  }

  private _recordHistory(entry: string): void {
    this._counter++;
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
  }
}
