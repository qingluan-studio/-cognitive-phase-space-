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
  private _contactGraph: Map<string, Set<string>> = new Map();

  registerSpreader(profile: SpreaderProfile): void {
    this._spreaders.set(profile.id, profile);
    this._contactGraph.set(profile.id, new Set());
  }

  addContact(spreaderId: string, hostId: string): boolean {
    const spreader = this._spreaders.get(spreaderId);
    if (!spreader || spreader.contactList.length >= this._maxContacts) return false;
    spreader.contactList.push(hostId);
    this._contactGraph.get(spreaderId)?.add(hostId);
    return true;
  }

  spread(spreaderId: string, payloadId: string): SpreadEvent | null {
    const spreader = this._spreaders.get(spreaderId);
    if (!spreader || !spreader.active) return null;
    const targetCount = Math.ceil(spreader.contactList.length * spreader.spreadFactor);
    const targets = this._selectByCentrality(spreader.contactList, targetCount);
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

  private _selectByCentrality(contacts: string[], count: number): string[] {
    const centrality: Record<string, number> = {};
    for (const contact of contacts) {
      centrality[contact] = 0;
    }
    for (const [spreaderId, connections] of this._contactGraph.entries()) {
      for (const c of contacts) {
        if (connections.has(c)) {
          centrality[c] = (centrality[c] ?? 0) + 1;
        }
        if (spreaderId === c) {
          centrality[c] = (centrality[c] ?? 0) + connections.size * 0.5;
        }
      }
    }
    const sorted = contacts.slice().sort((a, b) => (centrality[b] ?? 0) - (centrality[a] ?? 0));
    return sorted.slice(0, count);
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
      .sort((a, b) => this._spreaderImpact(b) - this._spreaderImpact(a))
      .slice(0, n);
  }

  private _spreaderImpact(profile: SpreaderProfile): number {
    return profile.spreadFactor * profile.contactList.length * (profile.active ? 1.5 : 1);
  }

  computeParetoRatio(): number {
    if (this._spreaders.size === 0) return 0;
    const impacts = Array.from(this._spreaders.values())
      .map(p => this._spreaderImpact(p))
      .sort((a, b) => b - a);
    const top20Percent = Math.max(1, Math.floor(impacts.length * 0.2));
    const topSum = impacts.slice(0, top20Percent).reduce((s, v) => s + v, 0);
    const total = impacts.reduce((s, v) => s + v, 0);
    return total === 0 ? 0 : topSum / total;
  }

  computeBranchingRatio(): number {
    if (this._events.length === 0) return 0;
    let totalInfections = 0;
    for (const event of this._events) {
      totalInfections += event.infectedHosts.length;
    }
    return totalInfections / this._events.length;
  }

  identifySuperspreadingEvents(threshold: number): SpreadEvent[] {
    return this._events.filter(e => e.infectedHosts.length >= threshold);
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
