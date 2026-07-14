/**
 * 地下链接模块：在不为人知的层级建立模块间的秘密连接，
 * 用于绕过表层路由，传输隐蔽信号与敏感资源。
 */

export type LinkSecrecy = 'covert' | 'encrypted' | 'ephemeral';

export interface SubterraneanRoute {
  id: string;
  endpoints: [string, string];
  secrecy: LinkSecrecy;
  latency: number;
  active: boolean;
}

export interface CovertMessage {
  routeId: string;
  payload: string;
  sentAt: number;
  acknowledged: boolean;
}

export class SubterraneanLink {
  private _routes: Map<string, SubterraneanRoute> = new Map();
  private _messages: CovertMessage[] = [];
  private _hidden = true;
  private _maxLatency = 5000;

  establishRoute(endpointA: string, endpointB: string, secrecy: LinkSecrecy): SubterraneanRoute {
    const route: SubterraneanRoute = {
      id: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      endpoints: [endpointA, endpointB],
      secrecy,
      latency: Math.floor(Math.random() * this._maxLatency),
      active: true,
    };
    this._routes.set(route.id, route);
    return route;
  }

  findRoute(a: string, b: string): SubterraneanRoute | null {
    for (const route of this._routes.values()) {
      if (!route.active) continue;
      const [x, y] = route.endpoints;
      if ((x === a && y === b) || (x === b && y === a)) return route;
    }
    return null;
  }

  sendCovert(routeId: string, payload: string): CovertMessage | null {
    const route = this._routes.get(routeId);
    if (!route || !route.active) return null;
    const msg: CovertMessage = {
      routeId,
      payload: this._obfuscate(payload),
      sentAt: Date.now(),
      acknowledged: false,
    };
    this._messages.push(msg);
    if (this._messages.length > 300) this._messages.shift();
    return msg;
  }

  private _obfuscate(text: string): string {
    return text.split('').map(c => String.fromCharCode(c.charCodeAt(0) + 1)).join('');
  }

  private _deobfuscate(text: string): string {
    return text.split('').map(c => String.fromCharCode(c.charCodeAt(0) - 1)).join('');
  }

  acknowledge(routeId: string, sentAt: number): boolean {
    const msg = this._messages.find(m => m.routeId === routeId && m.sentAt === sentAt);
    if (!msg) return false;
    msg.acknowledged = true;
    return true;
  }

  decrypt(message: CovertMessage): string {
    return this._deobfuscate(message.payload);
  }

  severRoute(routeId: string): boolean {
    const route = this._routes.get(routeId);
    if (!route) return false;
    route.active = false;
    return true;
  }

  purgeEphemeral(): number {
    let removed = 0;
    for (const [id, route] of this._routes) {
      if (route.secrecy === 'ephemeral') {
        this._routes.delete(id);
        removed++;
      }
    }
    return removed;
  }

  listActiveRoutes(): SubterraneanRoute[] {
    return Array.from(this._routes.values()).filter(r => r.active);
  }

  getMessagesByRoute(routeId: string): CovertMessage[] {
    return this._messages.filter(m => m.routeId === routeId);
  }

  get routeCount(): number {
    return this._routes.size;
  }

  get isHidden(): boolean {
    return this._hidden;
  }
}
