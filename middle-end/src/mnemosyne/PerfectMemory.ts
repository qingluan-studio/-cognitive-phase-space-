export interface MemoryEntry {
  id: string;
  data: Record<string, unknown>;
  timestamp: number;
  depth: number;
}

export interface RecallResult {
  entry: MemoryEntry;
  confidence: number;
  path: string[];
}

export class PerfectMemory {
  private _entries: Map<string, MemoryEntry> = new Map();
  private _index: Map<string, Set<string>> = new Map();
  private _associations: Map<string, Set<string>> = new Map();
  private _totalDepth: number = 0;
  private _informationCapacity: number = 0;
  private _selfOrganized: boolean = false;
  private _criticalThreshold: number = 100;
  private _avalancheSizes: number[] = [];

  store(id: string, data: Record<string, unknown>, depth: number = 1): MemoryEntry {
    const entry: MemoryEntry = { id, data, timestamp: Date.now(), depth };
    this._entries.set(id, entry);
    this._totalDepth += depth;
    this._indexEntry(id, data);
    this._informationCapacity += this._computeInformationContent(data);
    this._checkSelfOrganizedCriticality();
    return entry;
  }

  private _indexEntry(id: string, data: Record<string, unknown>): void {
    for (const key of Object.keys(data)) {
      if (!this._index.has(key)) this._index.set(key, new Set());
      this._index.get(key)!.add(id);
    }
  }

  private _computeInformationContent(data: Record<string, unknown>): number {
    const json = JSON.stringify(data);
    const len = json.length;
    const alphabetSize = new Set(json.split('')).size;
    return len * Math.log2(alphabetSize + 1);
  }

  private _checkSelfOrganizedCriticality(): void {
    if (this._informationCapacity < this._criticalThreshold) return;
    const avalanche = this._triggerAvalanche();
    this._avalancheSizes.push(avalanche);
    if (this._avalancheSizes.length > 20) this._avalancheSizes.shift();
    this._informationCapacity *= 0.8;
    this._selfOrganized = true;
  }

  private _triggerAvalanche(): number {
    let count = 0;
    for (const [id, entry] of this._entries) {
      if (entry.depth > 1 && Math.random() < 0.1) {
        entry.depth--;
        this._totalDepth--;
        count++;
      }
    }
    return count;
  }

  recall(id: string): RecallResult | null {
    const entry = this._entries.get(id);
    if (!entry) return null;
    const path = this._reconstructPath(id);
    const confidence = 1 - 1 / (entry.depth + 1);
    return { entry, confidence, path };
  }

  private _reconstructPath(id: string): string[] {
    const path: string[] = [id];
    const visited = new Set<string>();
    const queue: string[] = [id];
    while (queue.length > 0 && path.length < 10) {
      const current = queue.shift()!;
      const assoc = this._associations.get(current);
      if (!assoc) continue;
      for (const neighbor of assoc) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          path.push(neighbor);
          queue.push(neighbor);
          break;
        }
      }
    }
    return path;
  }

  queryByKey(key: string, value: unknown): MemoryEntry[] {
    const ids = this._index.get(key);
    if (!ids) return [];
    return Array.from(ids)
      .map(id => this._entries.get(id)!)
      .filter(e => e && e.data[key] === value);
  }

  associate(a: string, b: string): void {
    if (!this._associations.has(a)) this._associations.set(a, new Set());
    if (!this._associations.has(b)) this._associations.set(b, new Set());
    this._associations.get(a)!.add(b);
    this._associations.get(b)!.add(a);
  }

  forget(id: string): boolean {
    const entry = this._entries.get(id);
    if (!entry) return false;
    this._entries.delete(id);
    this._totalDepth -= entry.depth;
    this._informationCapacity = Math.max(0, this._informationCapacity - this._computeInformationContent(entry.data));
    for (const [key, ids] of this._index) {
      ids.delete(id);
      if (ids.size === 0) this._index.delete(key);
    }
    this._associations.delete(id);
    for (const set of this._associations.values()) set.delete(id);
    return true;
  }

  get entryCount(): number {
    return this._entries.size;
  }

  get totalDepth(): number {
    return this._totalDepth;
  }

  get averageDepth(): number {
    return this._entries.size > 0 ? this._totalDepth / this._entries.size : 0;
  }

  get capacity(): number {
    return this._informationCapacity;
  }

  isSelfOrganized(): boolean {
    return this._selfOrganized;
  }

  setCriticalThreshold(threshold: number): void {
    this._criticalThreshold = Math.max(10, threshold);
  }

  computeStirlingApproximation(n: number = this._entries.size): number {
    if (n < 2) return 0;
    return n * Math.log(n) - n + 0.5 * Math.log(2 * Math.PI * n);
  }

  getAvalancheSizeDistribution(): Map<number, number> {
    const dist = new Map<number, number>();
    for (const size of this._avalancheSizes) {
      dist.set(size, (dist.get(size) ?? 0) + 1);
    }
    return dist;
  }

  computeAssociativeClustering(): number {
    let triangles = 0;
    let triads = 0;
    for (const [node, neighbors] of this._associations) {
      const list = Array.from(neighbors);
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          triads++;
          if (this._associations.get(list[i])?.has(list[j])) triangles++;
        }
      }
    }
    return triads > 0 ? triangles / triads : 0;
  }
}
