import { DataPacket } from '../shared/types';

export interface Message {
  readonly id: string;
  readonly body: string;
  readonly timestamp: number;
  readonly priority: number;
  readonly status: 'pending' | 'processing' | 'delivered' | 'failed' | 'dead-letter';
}

export interface Queue {
  readonly name: string;
  readonly size: number;
  readonly consumers: string[];
  readonly type: 'point-to-point' | 'pub-sub' | 'priority' | 'delayed';
}

export class MessageQueue {
  private _queues: Map<string, Queue> = new Map();
  private _messages: Map<string, Message> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get queueCount(): number {
    return this._queues.size;
  }

  get messageCount(): number {
    return this._messages.size;
  }

  get history(): string[] {
    return [...this._history];
  }

  public produce(queue: string, message: Message): { queue: string; position: number; size: number } {
    const q = this._queues.get(queue);
    const size = q?.size ?? 0;
    this._messages.set(message.id, message);
    if (q) {
      this._queues.set(queue, { ...q, size: q.size + 1 });
    }
    this._recordHistory(`produce(queue=${queue}, msg=${message.id})`);
    return { queue, position: size, size: size + 1 };
  }

  public consume(queue: string, consumerId: string): { message: Message | null; consumer: string; queue: string } {
    const q = this._queues.get(queue);
    let message: Message | null = null;
    if (q && q.size > 0) {
      const firstMsg = Array.from(this._messages.values()).find(m => m.status === 'pending');
      if (firstMsg) {
        message = { ...firstMsg, status: 'processing' };
        this._messages.set(firstMsg.id, message);
      }
    }
    this._recordHistory(`consume(queue=${queue}, consumer=${consumerId}) -> ${message ? 'ok' : 'empty'}`);
    return { message, consumer: consumerId, queue };
  }

  public publish(topic: string, message: Message): { topic: string; subscribers: number; delivered: number } {
    const q = this._queues.get(topic);
    const subscribers = q?.consumers.length ?? 0;
    const delivered = Math.floor(subscribers * 0.9);
    this._messages.set(message.id, { ...message, status: 'delivered' });
    this._recordHistory(`publish(topic=${topic}, subscribers=${subscribers})`);
    return { topic, subscribers, delivered };
  }

  public subscribe(topic: string, subscriberId: string): { topic: string; subscriber: string; subscribed: boolean } {
    const q = this._queues.get(topic);
    if (q) {
      const consumers = [...q.consumers, subscriberId];
      this._queues.set(topic, { ...q, consumers });
    }
    this._recordHistory(`subscribe(topic=${topic}, subscriber=${subscriberId})`);
    return { topic, subscriber: subscriberId, subscribed: true };
  }

  public pointToPoint(queue: string, producers: string[], consumers: string[]): { delivered: number; producers: number; consumers: number } {
    const delivered = producers.length;
    this._queues.set(queue, { name: queue, size: delivered, consumers, type: 'point-to-point' });
    this._recordHistory(`pointToPoint(queue=${queue}, producers=${producers.length}, consumers=${consumers.length})`);
    return { delivered, producers: producers.length, consumers: consumers.length };
  }

  public pubSub(topic: string, publishers: string[], subscribers: string[]): { delivered: number; publishers: number; subscribers: number } {
    const delivered = publishers.length * subscribers.length;
    this._queues.set(topic, { name: topic, size: delivered, consumers: subscribers, type: 'pub-sub' });
    this._recordHistory(`pubSub(topic=${topic}, pubs=${publishers.length}, subs=${subscribers.length})`);
    return { delivered, publishers: publishers.length, subscribers: subscribers.length };
  }

  public deadLetterQueue(queue: string, policy: { maxRetries: number; ttl: number }): { dlq: string; failedMessages: number; policy: { maxRetries: number; ttl: number } } {
    const dlq = `${queue}-dlq`;
    const failedMessages = Math.floor(this._messages.size * 0.05);
    this._queues.set(dlq, { name: dlq, size: failedMessages, consumers: [], type: 'point-to-point' });
    this._recordHistory(`deadLetterQueue(queue=${queue}, maxRetries=${policy.maxRetries})`);
    return { dlq, failedMessages, policy };
  }

  public delayedMessage(message: Message, delay: number): { message: Message; delay: number; deliverAt: number } {
    const deliverAt = message.timestamp + delay;
    this._messages.set(message.id, message);
    this._recordHistory(`delayedMessage(msg=${message.id}, delay=${delay}ms)`);
    return { message, delay, deliverAt };
  }

  public priorityQueue(messages: Message[], comparator: (a: Message, b: Message) => number): { sorted: Message[]; highest: Message | null; lowest: Message | null } {
    const sorted = [...messages].sort(comparator);
    const highest = sorted[0] ?? null;
    const lowest = sorted[sorted.length - 1] ?? null;
    this._recordHistory(`priorityQueue(messages=${messages.length}) -> highest=${highest?.id}`);
    return { sorted, highest, lowest };
  }

  public messageAck(messageId: string, consumerId: string): { messageId: string; acked: boolean; consumer: string } {
    const msg = this._messages.get(messageId);
    const acked = !!msg;
    if (msg) {
      this._messages.set(messageId, { ...msg, status: 'delivered' });
    }
    this._recordHistory(`messageAck(msg=${messageId}, consumer=${consumerId}) -> ${acked}`);
    return { messageId, acked, consumer: consumerId };
  }

  public messageNack(messageId: string, consumerId: string, requeue: boolean): { messageId: string; nacked: boolean; requeued: boolean } {
    const msg = this._messages.get(messageId);
    const nacked = !!msg;
    if (msg && requeue) {
      this._messages.set(messageId, { ...msg, status: 'pending' });
    } else if (msg) {
      this._messages.set(messageId, { ...msg, status: 'failed' });
    }
    this._recordHistory(`messageNack(msg=${messageId}, requeue=${requeue})`);
    return { messageId, nacked, requeued: requeue };
  }

  public exactlyOnce(producer: string, consumer: string, idempotent: boolean): { delivered: number; duplicates: number; guarantee: string } {
    const delivered = 1;
    const duplicates = 0;
    this._recordHistory(`exactlyOnce(producer=${producer}, consumer=${consumer})`);
    return { delivered, duplicates, guarantee: 'exactly-once' };
  }

  public atLeastOnce(producer: string, consumer: string, retry: number): { delivered: number; retries: number; guarantee: string } {
    const delivered = retry + 1;
    this._recordHistory(`atLeastOnce(producer=${producer}, retry=${retry})`);
    return { delivered, retries: retry, guarantee: 'at-least-once' };
  }

  public atMostOnce(producer: string, consumer: string): { delivered: number; lost: number; guarantee: string } {
    const delivered = Math.random() > 0.1 ? 1 : 0;
    const lost = 1 - delivered;
    this._recordHistory(`atMostOnce(producer=${producer}, consumer=${consumer})`);
    return { delivered, lost, guarantee: 'at-most-once' };
  }

  public rateLimit(queue: string, rate: number): { queue: string; rate: number; limited: boolean; currentRate: number } {
    const currentRate = rate * 0.8;
    const limited = currentRate > rate;
    this._recordHistory(`rateLimit(queue=${queue}, rate=${rate}/s) -> current=${currentRate.toFixed(1)}`);
    return { queue, rate, limited, currentRate };
  }

  public kafkaTopic(
    topic: string,
    partitions: number,
    replicas: number,
    brokers: string[]
  ): {
    topic: string;
    partitions: number;
    replicas: number;
    brokers: number;
    isr: number;
  } {
    const isr = Math.min(replicas, brokers.length);
    this._queues.set(topic, { name: topic, size: 0, consumers: [], type: 'pub-sub' });
    this._recordHistory(`kafkaTopic(topic=${topic}, partitions=${partitions}, replicas=${replicas}, brokers=${brokers.length})`);
    return { topic, partitions, replicas, brokers: brokers.length, isr };
  }

  public kafkaConsumerGroup(
    groupId: string,
    topic: string,
    consumers: string[],
    partitions: number
  ): {
    groupId: string;
    topic: string;
    consumers: number;
    partitions: number;
    assignments: Map<string, number[]>;
    lag: number;
  } {
    const assignments = new Map<string, number[]>();
    const partitionList = Array.from({ length: partitions }, (_, i) => i);
    consumers.forEach((consumer, idx) => {
      const assigned: number[] = [];
      for (let p = idx; p < partitions; p += consumers.length) {
        assigned.push(p);
      }
      assignments.set(consumer, assigned);
    });
    const lag = Math.floor(Math.random() * 1000);
    this._recordHistory(`kafkaConsumerGroup(group=${groupId}, topic=${topic}, consumers=${consumers.length}, partitions=${partitions})`);
    return { groupId, topic, consumers: consumers.length, partitions, assignments, lag };
  }

  public rabbitMqExchange(
    exchange: string,
    type: 'direct' | 'topic' | 'fanout' | 'headers',
    queues: string[],
    bindings: { queue: string; routingKey: string }[]
  ): {
    exchange: string;
    type: string;
    queues: number;
    bindings: number;
    durable: boolean;
  } {
    queues.forEach(queue => {
      this._queues.set(queue, { name: queue, size: 0, consumers: [], type: 'point-to-point' });
    });
    this._recordHistory(`rabbitMqExchange(exchange=${exchange}, type=${type}, queues=${queues.length}, bindings=${bindings.length})`);
    return { exchange, type, queues: queues.length, bindings: bindings.length, durable: true };
  }

  public pulsarTopic(
    tenant: string,
    namespace: string,
    topic: string,
    partitions: number,
    bookies: string[]
  ): {
    fullTopicName: string;
    partitions: number;
    bookies: number;
    retention: string;
    backlog: number;
  } {
    const fullTopicName = `persistent://${tenant}/${namespace}/${topic}`;
    const backlog = Math.floor(Math.random() * 5000);
    this._queues.set(fullTopicName, { name: fullTopicName, size: 0, consumers: [], type: 'pub-sub' });
    this._recordHistory(`pulsarTopic(topic=${fullTopicName}, partitions=${partitions}, bookies=${bookies.length})`);
    return { fullTopicName, partitions, bookies: bookies.length, retention: '7d', backlog };
  }

  public publishSubscribePattern(
    topic: string,
    publishers: string[],
    subscribers: string[],
    messages: Message[]
  ): {
    topic: string;
    publishers: number;
    subscribers: number;
    messages: number;
    delivered: number;
    fanoutRatio: number;
  } {
    const delivered = messages.length * subscribers.length;
    const fanoutRatio = subscribers.length;
    this._queues.set(topic, { name: topic, size: messages.length, consumers: subscribers, type: 'pub-sub' });
    messages.forEach(msg => this._messages.set(msg.id, msg));
    this._recordHistory(`pubSubPattern(topic=${topic}, pubs=${publishers.length}, subs=${subscribers.length}, msgs=${messages.length})`);
    return { topic, publishers: publishers.length, subscribers: subscribers.length, messages: messages.length, delivered, fanoutRatio };
  }

  public requestReplyPattern(
    requestQueue: string,
    replyQueue: string,
    requests: Message[],
    replier: string
  ): {
    requestQueue: string;
    replyQueue: string;
    requests: number;
    replies: number;
    averageLatency: number;
  } {
    const replies = Math.floor(requests.length * 0.95);
    const averageLatency = 50 + Math.floor(Math.random() * 100);
    this._queues.set(requestQueue, { name: requestQueue, size: requests.length, consumers: [replier], type: 'point-to-point' });
    this._queues.set(replyQueue, { name: replyQueue, size: replies, consumers: [], type: 'point-to-point' });
    requests.forEach(msg => this._messages.set(msg.id, msg));
    this._recordHistory(`requestReply(requests=${requests.length}, replies=${replies}, latency=${averageLatency}ms)`);
    return { requestQueue, replyQueue, requests: requests.length, replies, averageLatency };
  }

  public competingConsumers(
    queue: string,
    consumers: string[],
    messages: Message[]
  ): {
    queue: string;
    consumers: number;
    messages: number;
    throughput: number;
    averageProcessingTime: number;
  } {
    const throughput = Math.floor(messages.length * 0.9);
    const averageProcessingTime = 10 + Math.floor(Math.random() * 50);
    this._queues.set(queue, { name: queue, size: messages.length, consumers, type: 'point-to-point' });
    messages.forEach(msg => this._messages.set(msg.id, msg));
    this._recordHistory(`competingConsumers(queue=${queue}, consumers=${consumers.length}, msgs=${messages.length})`);
    return { queue, consumers: consumers.length, messages: messages.length, throughput, averageProcessingTime };
  }

  public messageRouting(
    exchange: string,
    routes: { pattern: string; queue: string }[],
    messages: { key: string; body: string }[]
  ): {
    exchange: string;
    routes: number;
    messages: number;
    routed: number;
    unrouted: number;
  } {
    let routed = 0;
    messages.forEach(msg => {
      for (const route of routes) {
        if (msg.key.startsWith(route.pattern.replace('#', '')) || msg.key === route.pattern) {
          routed++;
          break;
        }
      }
    });
    const unrouted = messages.length - routed;
    this._recordHistory(`messageRouting(exchange=${exchange}, routes=${routes.length}, msgs=${messages.length}) -> routed=${routed}`);
    return { exchange, routes: routes.length, messages: messages.length, routed, unrouted };
  }

  public deadLetterProcessing(
    queue: string,
    dlq: string,
    messages: Message[],
    maxRetries: number
  ): {
    queue: string;
    dlq: string;
    processed: number;
    failed: number;
    deadLettered: number;
    retryRate: number;
  } {
    const failed = Math.floor(messages.length * 0.1);
    const deadLettered = Math.floor(failed * 0.3);
    const processed = messages.length - failed;
    const retryRate = (failed - deadLettered) / messages.length;
    this._queues.set(dlq, { name: dlq, size: deadLettered, consumers: [], type: 'point-to-point' });
    messages.forEach(msg => this._messages.set(msg.id, msg));
    this._recordHistory(`deadLetterProcessing(queue=${queue}, dlq=${dlq}, msgs=${messages.length}, retries=${maxRetries}) -> dead=${deadLettered}`);
    return { queue, dlq, processed, failed, deadLettered, retryRate };
  }

  public messageTTL(
    queue: string,
    messages: Message[],
    ttl: number
  ): {
    queue: string;
    messages: number;
    ttl: number;
    expired: number;
    active: number;
  } {
    const now = Date.now();
    const expired = messages.filter(m => now - m.timestamp > ttl).length;
    const active = messages.length - expired;
    this._queues.set(queue, { name: queue, size: active, consumers: [], type: 'point-to-point' });
    messages.forEach(msg => this._messages.set(msg.id, msg));
    this._recordHistory(`messageTTL(queue=${queue}, msgs=${messages.length}, ttl=${ttl}ms) -> expired=${expired}`);
    return { queue, messages: messages.length, ttl, expired, active };
  }

  public toPacket(): DataPacket<{
    queues: number;
    messages: number;
    history: string[];
  }> {
    return {
      id: `msg-queue-${Date.now()}-${this._counter}`,
      payload: {
        queues: this._queues.size,
        messages: this._messages.size,
        history: [...this._history],
      },
      metadata: {
        createdAt: Date.now(),
        route: ['distributed_systems', 'message_queue', 'result'],
        priority: 0.75,
        phase: 'delivery',
      },
    };
  }

  public reset(): void {
    this._queues.clear();
    this._messages.clear();
    this._history = [];
    this._counter = 0;
  }

  private _recordHistory(entry: string): void {
    this._counter++;
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
  }
}
