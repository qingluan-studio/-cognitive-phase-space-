/**
 * 超级传播者：一个模块感染无数。
 * 维护超级传播者节点，其传播能力远超普通节点，可一次性感染大量宿主。
 */

export interface SpreaderProfile {
  id: string;
  name: string;
  spreadFactor: number;
  contactList: string[];
  active: boolean;
}

export interface SpreadEvent {
  spreaderId: string;
  infectedHosts: string[];
  payloadId: string;
  spreadAt: number;
}

export class SuperSpreader {
  private _spreaders: Map<string, SpreaderProfile> = new Map();
  private _events: SpreadEvent[] = [];
  private _infectedSet: Set<string> = new Set();
  private _maxContacts = 100;

  registerSpreader(profile: SpreaderProfile): void {
    this._spreaders.set(profile.id, profile);
  }

  addContact(spreaderId: string, hostId: string): boolean {
    const spreader = this._spreaders.get(spreaderId);
    if (!spreader || spreader.contactList.length >= this._maxContacts) return false;
    spreader.contactList.push(hostId);
    return true;
  }

  spread(spreaderId: string, payloadId: string): SpreadEvent | null {
    const spreader = this._spreaders.get(spreaderId);
    if (!spreader || !spreader.active) return null;
    const targets = spreader.contactList.slice(0, Math.ceil(spreader.contactList.length * spreader.spreadFactor));
    const newlyInfected: string[] = [];
    for (const host of targets) {
      if (!this._infectedSet.has(host)) {
        this._infectedSet.add(host);
        newlyInfected.push(host);
      }
    }
    const event: SpreadEvent = {
      spreaderId,
      infectedHosts: newlyInfected,
      payloadId,
      spreadAt: Date.now(),
    };
    this._events.push(event);
    if (this._events.length > 100) this._events.shift();
    return event;
  }

  deactivate(spreaderId: string): boolean {
    const spreader = this._spreaders.get(spreaderId);
    if (!spreader) return false;
    spreader.active = false;
    return true;
  }

  boostSpreadFactor(spreaderId: string, multiplier: number): SpreaderProfile | null {
    const spreader = this._spreaders.get(spreaderId);
    if (!spreader) return null;
    spreader.spreadFactor = Math.min(1, spreader.spreadFactor * multiplier);
    return spreader;
  }

  identifyTopSpreaders(n: number = 5): SpreaderProfile[] {
    return Array.from(this._spreaders.values())
      .sort((a, b) => b.spreadFactor * b.contactList.length - a.spreadFactor * a.contactList.length)
      .slice(0, n);
  }

  getSpreader(id: string): SpreaderProfile | null {
    return this._spreaders.get(id) ?? null;
  }

  getEvents(limit: number = 50): SpreadEvent[] {
    return this._events.slice(-limit);
  }

  get totalInfected(): number {
    return this._infectedSet.size;
  }

  get spreaderCount(): number {
    return this._spreaders.size;
  }
}
