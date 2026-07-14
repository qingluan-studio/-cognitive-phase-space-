export interface ZombieRecord {
  id: string;
  originalPid: string;
  resurrectionCount: number;
  infectionSource: string;
  lastResurrectedAt: number | null;
  virulence: number;
}

export interface InfectionSpread {
  from: string;
  to: string;
  timestamp: number;
  probability: number;
}

export class ZombieProcess {
  private _zombies: Map<string, ZombieRecord> = new Map();
  private _spreadLog: InfectionSpread[] = [];
  private _state: Record<string, unknown> = {};
  private _resurrectionQueue: string[] = [];
  private _infectionGraph: Map<string, Set<string>> = new Map();
  private _baseVirulence: number = 0.3;

  infect(id: string, originalPid: string, infectionSource: string): ZombieRecord {
    const record: ZombieRecord = {
      id,
      originalPid,
      resurrectionCount: 0,
      infectionSource,
      lastResurrectedAt: null,
      virulence: this._baseVirulence,
    };
    this._zombies.set(id, record);
    const edges = this._infectionGraph.get(infectionSource) ?? new Set();
    edges.add(id);
    this._infectionGraph.set(infectionSource, edges);
    return record;
  }

  resurrect(id: string): boolean {
    const zombie = this._zombies.get(id);
    if (!zombie) return false;
    zombie.resurrectionCount++;
    zombie.lastResurrectedAt = Date.now();
    zombie.virulence = Math.min(1, zombie.virulence * 1.2);
    this._resurrectionQueue.push(id);
    if (this._resurrectionQueue.length > 100) this._resurrectionQueue.shift();
    return true;
  }

  spread(fromId: string, toId: string, probability: number): boolean {
    if (Math.random() > probability) return false;
    const spread: InfectionSpread = {
      from: fromId,
      to: toId,
      timestamp: Date.now(),
      probability,
    };
    this._spreadLog.push(spread);
    if (this._spreadLog.length > 200) this._spreadLog.shift();
    const edges = this._infectionGraph.get(fromId) ?? new Set();
    edges.add(toId);
    this._infectionGraph.set(fromId, edges);
    if (!this._zombies.has(toId)) {
      this.infect(toId, toId, fromId);
    }
    return true;
  }

  getZombie(id: string): ZombieRecord | null {
    return this._zombies.get(id) ?? null;
  }

  getInfectedBy(source: string): string[] {
    return Array.from(this._infectionGraph.get(source) ?? []);
  }

  averageResurrectionCount(): number {
    if (this._zombies.size === 0) return 0;
    return Array.from(this._zombies.values()).reduce((s, z) => s + z.resurrectionCount, 0) / this._zombies.size;
  }

  maxVirulence(): number {
    if (this._zombies.size === 0) return 0;
    return Math.max(...Array.from(this._zombies.values()).map(z => z.virulence));
  }

  getSpreadChain(rootId: string): string[] {
    const chain: string[] = [];
    const queue = [rootId];
    const visited = new Set<string>();
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);
      chain.push(current);
      for (const neighbor of this._infectionGraph.get(current) ?? []) {
        queue.push(neighbor);
      }
    }
    return chain;
  }

  setBaseVirulence(virulence: number): void {
    this._baseVirulence = Math.max(0, Math.min(1, virulence));
  }

  get zombieCount(): number {
    return this._zombies.size;
  }

  get spreadCount(): number {
    return this._spreadLog.length;
  }

  zombieReport(): Record<string, unknown> {
    return {
      zombieCount: this._zombies.size,
      spreadCount: this._spreadLog.length,
      averageResurrectionCount: this.averageResurrectionCount().toFixed(2),
      maxVirulence: this.maxVirulence().toFixed(4),
      baseVirulence: this._baseVirulence.toFixed(4),
      resurrectionQueueLength: this._resurrectionQueue.length,
      state: this._state,
    };
  }
}
