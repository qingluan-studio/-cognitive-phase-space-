/**
 * 根茎连接器：任意模块可绕过树状依赖直接无中心通讯。
 * 仿照德勒兹的"根茎"概念，模块间建立去中心化的任意直连，
 * 绕过层级树状依赖图实现点对点通讯。
 */

export interface RhizomeLink {
  from: string;
  to: string;
  weight: number;
  establishedAt: number;
}

export interface RhizomeMessage {
  id: string;
  from: string;
  to: string;
  payload: Record<string, unknown>;
  sentAt: number;
}

export type Topology = 'tree' | 'rhizome' | 'hybrid';

export class RhizomeConnector {
  private _links: Map<string, RhizomeLink> = new Map();
  private _messages: RhizomeMessage[] = [];
  private _topology: Topology = 'rhizome';
  private _handlers: Map<string, (m: RhizomeMessage) => void> = new Map();

  /** 在任意两个模块间建立直连，绕过树状依赖。 */
  connect(from: string, to: string, weight: number = 1): RhizomeLink {
    const key = `${from}->${to}`;
    const link: RhizomeLink = { from, to, weight, establishedAt: Date.now() };
    this._links.set(key, link);
    return link;
  }

  /** 断开一条根茎连接。 */
  disconnect(from: string, to: string): boolean {
    return this._links.delete(`${from}->${to}`);
  }

  /** 通过根茎直连发送消息。 */
  broadcast(from: string, payload: Record<string, unknown>): RhizomeMessage[] {
    const sent: RhizomeMessage[] = [];
    for (const link of this._links.values()) {
      if (link.from !== from) continue;
      const msg: RhizomeMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        from: link.from,
        to: link.to,
        payload,
        sentAt: Date.now(),
      };
      this._messages.push(msg);
      const handler = this._handlers.get(link.to);
      if (handler) handler(msg);
      sent.push(msg);
    }
    return sent;
  }

  /** 沿根茎路由消息到目标。 */
  route(from: string, to: string, payload: Record<string, unknown>): RhizomeMessage | null {
    const key = `${from}->${to}`;
    if (!this._links.has(key)) return null;
    const msg: RhizomeMessage = {
      id: `route-${Date.now()}`,
      from,
      to,
      payload,
      sentAt: Date.now(),
    };
    this._messages.push(msg);
    const handler = this._handlers.get(to);
    if (handler) handler(msg);
    return msg;
  }

  registerHandler(module: string, handler: (m: RhizomeMessage) => void): void {
    this._handlers.set(module, handler);
  }

  getConnections(): RhizomeLink[] {
    return [...this._links.values()];
  }

  get topology(): Topology {
    return this._topology;
  }

  setTopology(t: Topology): void {
    this._topology = t;
  }

  /** 查询与某模块直连的所有邻居。 */
  neighbors(module: string): string[] {
    const out: string[] = [];
    for (const link of this._links.values()) {
      if (link.from === module) out.push(link.to);
      else if (link.to === module) out.push(link.from);
    }
    return [...new Set(out)];
  }
}
