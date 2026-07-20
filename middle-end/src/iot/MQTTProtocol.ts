import { DataPacket } from '../shared/types';

export interface MQTTConnection {
  readonly clientId: string;
  readonly host: string;
  readonly port: number;
  readonly keepAlive: number;
  readonly cleanSession: boolean;
  readonly version: '3.1.1' | '5.0';
}

export interface MQTTMessage {
  readonly topic: string;
  readonly payload: string;
  readonly qos: 0 | 1 | 2;
  readonly retain: boolean;
  readonly dup: boolean;
  readonly timestamp: number;
}

export interface MQTTSubscription {
  readonly topic: string;
  readonly qos: 0 | 1 | 2;
  readonly noLocal: boolean;
  readonly retainAsPublished: boolean;
}

export interface MQTTSession {
  readonly clientId: string;
  readonly connected: boolean;
  readonly sessionPresent: boolean;
  readonly subscriptions: MQTTSubscription[];
  readonly pendingOutgoing: number;
  readonly pendingIncoming: number;
  readonly createdAt: number;
}

export interface SubscriptionTreeNode {
  readonly topicPart: string;
  readonly subscribers: Set<string>;
  readonly children: Map<string, SubscriptionTreeNode>;
}

export interface MessageQueue {
  readonly clientId: string;
  readonly messages: MQTTMessage[];
  readonly maxSize: number;
  readonly dropped: number;
}

export interface MQTTBridge {
  readonly bridgeId: string;
  readonly remoteHost: string;
  readonly remotePort: number;
  readonly topics: string[];
  readonly direction: 'in' | 'out' | 'both';
  readonly qos: 0 | 1 | 2;
  readonly status: 'connected' | 'disconnected' | 'reconnecting';
}

export class MQTTProtocol {
  private _connection: MQTTConnection | null = null;
  private _messages: MQTTMessage[] = [];
  private _history: string[] = [];
  private _counter = 0;
  private _sessions: Map<string, MQTTSession> = new Map();
  private _subscriptionTree: SubscriptionTreeNode = { topicPart: '', subscribers: new Set(), children: new Map() };
  private _messageQueues: Map<string, MessageQueue> = new Map();
  private _retainedMessages: Map<string, MQTTMessage> = new Map();
  private _willMessages: Map<string, MQTTMessage> = new Map();
  private _bridges: Map<string, MQTTBridge> = new Map();
  private _clusterNodes: Map<string, { host: string; port: number; lastSeen: number; load: number }> = new Map();
  private _sharedSubscriptions: Map<string, Set<string>> = new Map();

  get clientId(): string {
    return this._connection?.clientId ?? 'none';
  }

  get messageCount(): number {
    return this._messages.length;
  }

  get history(): string[] {
    return [...this._history];
  }

  get sessionCount(): number {
    return this._sessions.size;
  }

  get retainedMessageCount(): number {
    return this._retainedMessages.size;
  }

  get bridgeCount(): number {
    return this._bridges.size;
  }

  get clusterNodeCount(): number {
    return this._clusterNodes.size;
  }

  get sharedSubscriptionCount(): number {
    return this._sharedSubscriptions.size;
  }

  public mqttConnect(clientId: string, host: string, port: number, keepAlive: number): { clientId: string; host: string; port: number; connected: boolean; sessionPresent: boolean } {
    this._connection = { clientId, host, port, keepAlive, cleanSession: true, version: '5.0' };
    const session: MQTTSession = { clientId, connected: true, sessionPresent: false, subscriptions: [], pendingOutgoing: 0, pendingIncoming: 0, createdAt: Date.now() };
    this._sessions.set(clientId, session);
    this._recordHistory(`mqttConnect(client=${clientId}, host=${host}:${port}) -> connected`);
    return { clientId, host, port, connected: true, sessionPresent: false };
  }

  public mqttDisconnect(clientId: string): { clientId: string; disconnected: boolean; reasonCode: number; sessionExpiry: number } {
    const session = this._sessions.get(clientId);
    if (session) {
      this._sessions.set(clientId, { ...session, connected: false });
    }
    this._recordHistory(`mqttDisconnect(client=${clientId}) -> disconnected`);
    return { clientId, disconnected: true, reasonCode: 0, sessionExpiry: 0 };
  }

  public mqttPublish(topic: string, payload: string, qos: 0 | 1 | 2, retain: boolean): { topic: string; payload: string; qos: number; retain: boolean; published: boolean; messageId: number } {
    const message: MQTTMessage = { topic, payload, qos, retain, dup: false, timestamp: Date.now() };
    this._messages.push(message);
    const messageId = this._counter++;
    if (retain) {
      this._retainedMessages.set(topic, message);
    }
    this._recordHistory(`mqttPublish(topic=${topic}, qos=${qos}, retain=${retain}) -> id=${messageId}`);
    return { topic, payload, qos, retain, published: true, messageId };
  }

  public mqttSubscribe(clientId: string, topic: string, qos: 0 | 1 | 2): { topic: string; qos: number; subscribed: boolean; grantedQos: number } {
    const session = this._sessions.get(clientId);
    if (session) {
      const subscription: MQTTSubscription = { topic, qos, noLocal: false, retainAsPublished: false };
      this._sessions.set(clientId, { ...session, subscriptions: [...session.subscriptions, subscription] });
    }
    this._addToSubscriptionTree(topic, clientId);
    this._recordHistory(`mqttSubscribe(client=${clientId}, topic=${topic}, qos=${qos}) -> granted`);
    return { topic, qos, subscribed: true, grantedQos: qos };
  }

  public mqttUnsubscribe(clientId: string, topic: string): { topic: string; unsubscribed: boolean; remainingSubscriptions: number } {
    const session = this._sessions.get(clientId);
    if (session) {
      const remaining = session.subscriptions.filter(s => s.topic !== topic);
      this._sessions.set(clientId, { ...session, subscriptions: remaining });
    }
    this._removeFromSubscriptionTree(topic, clientId);
    const remainingSubscriptions = session?.subscriptions.length ?? 0;
    this._recordHistory(`mqttUnsubscribe(client=${clientId}, topic=${topic}) -> done`);
    return { topic, unsubscribed: true, remainingSubscriptions };
  }

  public mqttRetain(topic: string, payload: string): { topic: string; payload: string; retained: boolean; previousRetained: boolean } {
    const previousRetained = this._retainedMessages.has(topic);
    const message: MQTTMessage = { topic, payload, qos: 1, retain: true, dup: false, timestamp: Date.now() };
    this._retainedMessages.set(topic, message);
    this._recordHistory(`mqttRetain(topic=${topic}) -> previous=${previousRetained}`);
    return { topic, payload, retained: true, previousRetained };
  }

  public mqttWill(topic: string, payload: string, qos: 0 | 1 | 2, retain: boolean): { topic: string; payload: string; qos: number; retain: boolean; set: boolean } {
    const message: MQTTMessage = { topic, payload, qos, retain, dup: false, timestamp: Date.now() };
    this._willMessages.set(topic, message);
    this._recordHistory(`mqttWill(topic=${topic}, qos=${qos}) -> set`);
    return { topic, payload, qos, retain, set: true };
  }

  public mqttKeepAlive(clientId: string, interval: number): { clientId: string; interval: number; acknowledged: boolean; expectedNext: number } {
    const session = this._sessions.get(clientId);
    if (session) {
      this._sessions.set(clientId, { ...session, connected: true });
    }
    const expectedNext = Date.now() + interval * 1000;
    this._recordHistory(`mqttKeepAlive(client=${clientId}, interval=${interval}) -> ack`);
    return { clientId, interval, acknowledged: true, expectedNext };
  }

  public mqttQoS0(topic: string, payload: string): { topic: string; payload: string; delivered: boolean; latency: number; atMostOnce: boolean } {
    const latency = 1 + Math.random() * 5;
    this._recordHistory(`mqttQoS0(topic=${topic}) -> delivered`);
    return { topic, payload, delivered: true, latency, atMostOnce: true };
  }

  public mqttQoS1(topic: string, payload: string): { topic: string; payload: string; delivered: boolean; ackReceived: boolean; latency: number; messageId: number } {
    const latency = 5 + Math.random() * 20;
    const ackReceived = Math.random() > 0.05;
    const messageId = this._counter++;
    this._recordHistory(`mqttQoS1(topic=${topic}, id=${messageId}) -> ack=${ackReceived}`);
    return { topic, payload, delivered: ackReceived, ackReceived, latency, messageId };
  }

  public mqttQoS2(topic: string, payload: string): { topic: string; payload: string; delivered: boolean; completed: boolean; latency: number; messageId: number; handshakeSteps: number } {
    const latency = 10 + Math.random() * 40;
    const completed = Math.random() > 0.02;
    const messageId = this._counter++;
    this._recordHistory(`mqttQoS2(topic=${topic}, id=${messageId}) -> completed=${completed}`);
    return { topic, payload, delivered: completed, completed, latency, messageId, handshakeSteps: 4 };
  }

  public mqttWildcard(topic: string): { valid: boolean; topic: string; type: 'none' | 'single' | 'multi'; matches: string[] } {
    const hasSingle = topic.includes('+');
    const hasMulti = topic.includes('#');
    const type: 'none' | 'single' | 'multi' = hasMulti ? 'multi' : hasSingle ? 'single' : 'none';
    const valid = !topic.includes('#') || topic.endsWith('#') || topic.endsWith('/#');
    const matches: string[] = valid ? ['sensor/temp', 'sensor/humidity'] : [];
    this._recordHistory(`mqttWildcard(topic=${topic}) -> type=${type}`);
    return { valid, topic, type, matches };
  }

  public mqttTopicFilter(topic: string, filter: string): { matches: boolean; topic: string; filter: string; exact: boolean; wildcardMatch: boolean } {
    const exact = topic === filter;
    const wildcardMatch = filter.includes('+') || filter.includes('#');
    const matches = exact || wildcardMatch;
    this._recordHistory(`mqttTopicFilter(topic=${topic}, filter=${filter}) -> matches=${matches}`);
    return { matches, topic, filter, exact, wildcardMatch };
  }

  public mqttPayloadSize(payload: string): { size: number; bytes: number; oversized: boolean; maxSize: number } {
    const bytes = new TextEncoder().encode(payload).length;
    const maxSize = 256 * 1024;
    const oversized = bytes > maxSize;
    this._recordHistory(`mqttPayloadSize -> ${bytes} bytes`);
    return { size: bytes, bytes, oversized, maxSize };
  }

  public mqttMessageDeduplication(messages: MQTTMessage[]): { deduplicated: MQTTMessage[]; removed: number; method: string } {
    const seen = new Set<string>();
    const deduplicated: MQTTMessage[] = [];
    for (const msg of messages) {
      const key = `${msg.topic}-${msg.payload}-${msg.timestamp}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduplicated.push(msg);
      }
    }
    this._recordHistory(`mqttMessageDeduplication(messages=${messages.length}) -> removed=${messages.length - deduplicated.length}`);
    return { deduplicated, removed: messages.length - deduplicated.length, method: 'exact-match' };
  }

  public mqttSessionPersistence(clientId: string, cleanSession: boolean): { persisted: boolean; clientId: string; cleanSession: boolean; queuedMessages: number } {
    const session = this._sessions.get(clientId);
    const queuedMessages = session?.pendingOutgoing ?? 0;
    const persisted = !cleanSession;
    this._recordHistory(`mqttSessionPersistence(client=${clientId}, clean=${cleanSession}) -> persisted=${persisted}`);
    return { persisted, clientId, cleanSession, queuedMessages };
  }

  public mqttLastWill(clientId: string): { hasWill: boolean; clientId: string; willTopic: string | null; willPayload: string | null; willQos: number } {
    const will = this._willMessages.get(clientId);
    this._recordHistory(`mqttLastWill(client=${clientId}) -> hasWill=${!!will}`);
    return { hasWill: !!will, clientId, willTopic: will?.topic ?? null, willPayload: will?.payload ?? null, willQos: will?.qos ?? 0 };
  }

  public mqttPacketSize(packet: string): { size: number; headerSize: number; payloadSize: number; fixedHeader: number; variableHeader: number } {
    const payloadSize = new TextEncoder().encode(packet).length;
    const headerSize = 2;
    const fixedHeader = 1;
    const variableHeader = 1;
    const size = headerSize + payloadSize;
    this._recordHistory(`mqttPacketSize -> ${size} bytes`);
    return { size, headerSize, payloadSize, fixedHeader, variableHeader };
  }

  public mqttPacketAnalysis(packet: string): { type: string; flags: number; remainingLength: number; valid: boolean; headerFlags: string[] } {
    const valid = packet.length > 0;
    const type = valid ? 'PUBLISH' : 'UNKNOWN';
    const flags = valid ? 0 : -1;
    const remainingLength = packet.length;
    const headerFlags = ['dup=0', 'qos=0', 'retain=0'];
    this._recordHistory(`mqttPacketAnalysis -> type=${type}`);
    return { type, flags, remainingLength, valid, headerFlags };
  }

  public mqttPing(clientId: string): { pong: boolean; clientId: string; latency: number; serverTime: number } {
    const latency = 1 + Math.random() * 10;
    this._recordHistory(`mqttPing(client=${clientId}) -> latency=${latency.toFixed(1)}ms`);
    return { pong: true, clientId, latency, serverTime: Date.now() };
  }

  public mqttConnAck(sessionPresent: boolean, reasonCode: number): { sessionPresent: boolean; reasonCode: number; maxQoS: number; retainAvailable: boolean; sharedSubscriptionAvailable: boolean } {
    this._recordHistory(`mqttConnAck(sessionPresent=${sessionPresent}, code=${reasonCode})`);
    return { sessionPresent, reasonCode, maxQoS: 2, retainAvailable: true, sharedSubscriptionAvailable: true };
  }

  public mqttPubAck(messageId: number, reasonCode: number): { messageId: number; reasonCode: number; processed: boolean } {
    this._recordHistory(`mqttPubAck(id=${messageId}, code=${reasonCode})`);
    return { messageId, reasonCode, processed: reasonCode === 0 };
  }

  public mqttPubRec(messageId: number): { messageId: number; received: boolean; nextStep: string } {
    this._recordHistory(`mqttPubRec(id=${messageId}) -> received`);
    return { messageId, received: true, nextStep: 'PUBREL' };
  }

  public mqttPubRel(messageId: number): { messageId: number; released: boolean; nextStep: string } {
    this._recordHistory(`mqttPubRel(id=${messageId}) -> released`);
    return { messageId, released: true, nextStep: 'PUBCOMP' };
  }

  public mqttPubComp(messageId: number): { messageId: number; completed: boolean; qos2HandshakeDone: boolean } {
    this._recordHistory(`mqttPubComp(id=${messageId}) -> completed`);
    return { messageId, completed: true, qos2HandshakeDone: true };
  }

  public mqttSubAck(messageId: number, reasonCodes: number[]): { messageId: number; reasonCodes: number[]; granted: number[]; failed: number } {
    const granted = reasonCodes.filter(c => c < 128);
    const failed = reasonCodes.filter(c => c >= 128).length;
    this._recordHistory(`mqttSubAck(id=${messageId}) -> granted=${granted.length}, failed=${failed}`);
    return { messageId, reasonCodes, granted, failed };
  }

  public mqttUnsubAck(messageId: number, reasonCodes: number[]): { messageId: number; reasonCodes: number[]; unsubscribed: number } {
    const unsubscribed = reasonCodes.filter(c => c === 0).length;
    this._recordHistory(`mqttUnsubAck(id=${messageId}) -> unsubscribed=${unsubscribed}`);
    return { messageId, reasonCodes, unsubscribed };
  }

  public configureBridge(bridgeId: string, remoteHost: string, remotePort: number, topics: string[], direction: 'in' | 'out' | 'both', qos: 0 | 1 | 2): { configured: boolean; bridge: MQTTBridge; status: string } {
    const bridge: MQTTBridge = { bridgeId, remoteHost, remotePort, topics, direction, qos, status: 'connected' };
    this._bridges.set(bridgeId, bridge);
    this._recordHistory(`configureBridge(id=${bridgeId}, remote=${remoteHost}:${remotePort}) -> configured`);
    return { configured: true, bridge, status: 'connected' };
  }

  public bridgeStatus(bridgeId: string): { bridgeId: string; status: string; messagesForwarded: number; lastError: string | null; uptime: number } {
    const bridge = this._bridges.get(bridgeId);
    const messagesForwarded = Math.floor(Math.random() * 10000);
    const uptime = Date.now() - (bridge ? Date.now() - 3600000 : Date.now());
    this._recordHistory(`bridgeStatus(id=${bridgeId}) -> status=${bridge?.status ?? 'unknown'}`);
    return { bridgeId, status: bridge?.status ?? 'unknown', messagesForwarded, lastError: null, uptime };
  }

  public disconnectBridge(bridgeId: string): { disconnected: boolean; bridgeId: string; messagesInFlight: number } {
    const bridge = this._bridges.get(bridgeId);
    if (bridge) {
      this._bridges.set(bridgeId, { ...bridge, status: 'disconnected' });
    }
    const messagesInFlight = Math.floor(Math.random() * 100);
    this._recordHistory(`disconnectBridge(id=${bridgeId}) -> ${!!bridge}`);
    return { disconnected: !!bridge, bridgeId, messagesInFlight };
  }

  public clusterDiscovery(nodeId: string, host: string, port: number): { discovered: boolean; nodeId: string; host: string; port: number; clusterSize: number } {
    this._clusterNodes.set(nodeId, { host, port, lastSeen: Date.now(), load: Math.random() * 100 });
    const clusterSize = this._clusterNodes.size;
    this._recordHistory(`clusterDiscovery(node=${nodeId}, ${host}:${port}) -> clusterSize=${clusterSize}`);
    return { discovered: true, nodeId, host, port, clusterSize };
  }

  public clusterNodeHealth(nodeId: string): { healthy: boolean; nodeId: string; load: number; lastSeen: number; connections: number } {
    const node = this._clusterNodes.get(nodeId);
    const load = node?.load ?? 0;
    const healthy = load < 80;
    const connections = Math.floor(Math.random() * 5000);
    this._recordHistory(`clusterNodeHealth(node=${nodeId}) -> healthy=${healthy}`);
    return { healthy, nodeId, load, lastSeen: node?.lastSeen ?? 0, connections };
  }

  public sharedSubscription(group: string, topic: string, clientId: string): { joined: boolean; group: string; topic: string; clientId: string; members: number } {
    const key = `${group}:${topic}`;
    const members = this._sharedSubscriptions.get(key) ?? new Set();
    members.add(clientId);
    this._sharedSubscriptions.set(key, members);
    this._recordHistory(`sharedSubscription(group=${group}, topic=${topic}, client=${clientId}) -> members=${members.size}`);
    return { joined: true, group, topic, clientId, members: members.size };
  }

  public sharedSubscriptionLeave(group: string, topic: string, clientId: string): { left: boolean; group: string; topic: string; clientId: string; remainingMembers: number } {
    const key = `${group}:${topic}`;
    const members = this._sharedSubscriptions.get(key);
    if (members) {
      members.delete(clientId);
    }
    const remainingMembers = members?.size ?? 0;
    this._recordHistory(`sharedSubscriptionLeave(group=${group}, topic=${topic}, client=${clientId}) -> remaining=${remainingMembers}`);
    return { left: true, group, topic, clientId, remainingMembers };
  }

  public getRetainedMessages(topicPrefix: string): { messages: MQTTMessage[]; count: number; topicPrefix: string } {
    const messages = Array.from(this._retainedMessages.values()).filter(m => m.topic.startsWith(topicPrefix));
    this._recordHistory(`getRetainedMessages(prefix=${topicPrefix}) -> ${messages.length}`);
    return { messages, count: messages.length, topicPrefix };
  }

  public clearRetainedMessage(topic: string): { cleared: boolean; topic: string; hadMessage: boolean } {
    const hadMessage = this._retainedMessages.has(topic);
    this._retainedMessages.delete(topic);
    this._recordHistory(`clearRetainedMessage(topic=${topic}) -> had=${hadMessage}`);
    return { cleared: hadMessage, topic, hadMessage };
  }

  public getSessionInfo(clientId: string): { clientId: string; connected: boolean; subscriptions: number; pendingOutgoing: number; pendingIncoming: number; createdAt: number } {
    const session = this._sessions.get(clientId);
    this._recordHistory(`getSessionInfo(client=${clientId}) -> connected=${session?.connected ?? false}`);
    return {
      clientId,
      connected: session?.connected ?? false,
      subscriptions: session?.subscriptions.length ?? 0,
      pendingOutgoing: session?.pendingOutgoing ?? 0,
      pendingIncoming: session?.pendingIncoming ?? 0,
      createdAt: session?.createdAt ?? 0,
    };
  }

  public getAllSessions(): { sessions: { clientId: string; connected: boolean; subscriptions: number }[]; count: number; connectedCount: number } {
    const sessions = Array.from(this._sessions.values()).map(s => ({ clientId: s.clientId, connected: s.connected, subscriptions: s.subscriptions.length }));
    const connectedCount = sessions.filter(s => s.connected).length;
    this._recordHistory(`getAllSessions() -> total=${sessions.length}, connected=${connectedCount}`);
    return { sessions, count: sessions.length, connectedCount };
  }

  public getMessageQueue(clientId: string): { clientId: string; queued: number; maxSize: number; dropped: number } {
    const queue = this._messageQueues.get(clientId);
    this._recordHistory(`getMessageQueue(client=${clientId}) -> queued=${queue?.messages.length ?? 0}`);
    return { clientId, queued: queue?.messages.length ?? 0, maxSize: queue?.maxSize ?? 0, dropped: queue?.dropped ?? 0 };
  }

  public toPacket(): DataPacket<{
    clientId: string;
    messages: number;
    sessions: number;
    retainedMessages: number;
    bridges: number;
    clusterNodes: number;
    sharedSubscriptions: number;
    history: string[];
  }> {
    return {
      id: `mqtt-protocol-${Date.now()}-${this._counter}`,
      payload: {
        clientId: this._connection?.clientId ?? 'none',
        messages: this._messages.length,
        sessions: this._sessions.size,
        retainedMessages: this._retainedMessages.size,
        bridges: this._bridges.size,
        clusterNodes: this._clusterNodes.size,
        sharedSubscriptions: this._sharedSubscriptions.size,
        history: [...this._history],
      },
      metadata: {
        createdAt: Date.now(),
        route: ['iot', 'mqtt_protocol', 'result'],
        priority: 0.8,
        phase: 'messaging',
      },
    };
  }

  public reset(): void {
    this._connection = null;
    this._messages = [];
    this._history = [];
    this._counter = 0;
    this._sessions.clear();
    this._subscriptionTree = { topicPart: '', subscribers: new Set(), children: new Map() };
    this._messageQueues.clear();
    this._retainedMessages.clear();
    this._willMessages.clear();
    this._bridges.clear();
    this._clusterNodes.clear();
    this._sharedSubscriptions.clear();
  }

  private _recordHistory(entry: string): void {
    this._counter++;
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
  }

  private _addToSubscriptionTree(topic: string, clientId: string): void {
    const parts = topic.split('/');
    let current = this._subscriptionTree;
    for (const part of parts) {
      if (!current.children.has(part)) {
        current.children.set(part, { topicPart: part, subscribers: new Set(), children: new Map() });
      }
      current = current.children.get(part)!;
    }
    current.subscribers.add(clientId);
  }

  private _removeFromSubscriptionTree(topic: string, clientId: string): void {
    const parts = topic.split('/');
    let current = this._subscriptionTree;
    const path: SubscriptionTreeNode[] = [current];
    for (const part of parts) {
      const next = current.children.get(part);
      if (!next) return;
      path.push(next);
      current = next;
    }
    current.subscribers.delete(clientId);
  }
}
