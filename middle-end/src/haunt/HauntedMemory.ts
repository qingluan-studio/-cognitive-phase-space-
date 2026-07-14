export interface MemoryBlock {
  id: string;
  size: number;
  allocatedAt: number;
  freedAt: number | null;
  references: number;
  owner: string;
}

export interface MemorySnapshot {
  timestamp: number;
  totalAllocated: number;
  totalFreed: number;
  activeBlocks: number;
  fragmentationIndex: number;
}

export class HauntedMemory {
  private _blocks: Map<string, MemoryBlock> = new Map();
  private _snapshots: MemorySnapshot[] = [];
  private _state: Record<string, unknown> = {};
  private _referenceGraph: Map<string, Set<string>> = new Map();
  private _leakScore: Map<string, number> = new Map();
  private _fragmentationHistory: number[] = [];

  allocate(id: string, size: number, owner: string): MemoryBlock {
    const block: MemoryBlock = {
      id,
      size,
      allocatedAt: Date.now(),
      freedAt: null,
      references: 1,
      owner,
    };
    this._blocks.set(id, block);
    this._referenceGraph.set(id, new Set());
    this._leakScore.set(id, 0);
    return block;
  }

  free(id: string): boolean {
    const block = this._blocks.get(id);
    if (!block || block.freedAt !== null) return false;
    block.freedAt = Date.now();
    block.references = 0;
    this._referenceGraph.delete(id);
    this._leakScore.delete(id);
    return true;
  }

  addReference(from: string, to: string): boolean {
    const fromBlock = this._blocks.get(from);
    const toBlock = this._blocks.get(to);
    if (!fromBlock || !toBlock) return false;
    const refs = this._referenceGraph.get(from) ?? new Set();
    refs.add(to);
    this._referenceGraph.set(from, refs);
    toBlock.references++;
    return true;
  }

  removeReference(from: string, to: string): boolean {
    const refs = this._referenceGraph.get(from);
    if (!refs || !refs.has(to)) return false;
    refs.delete(to);
    const toBlock = this._blocks.get(to);
    if (toBlock) toBlock.references--;
    return true;
  }

  snapshot(): MemorySnapshot {
    const active = Array.from(this._blocks.values()).filter(b => b.freedAt === null);
    const totalAllocated = this._blocks.size;
    const totalFreed = Array.from(this._blocks.values()).filter(b => b.freedAt !== null).length;
    const frag = this._computeFragmentation();
    this._fragmentationHistory.push(frag);
    if (this._fragmentationHistory.length > 100) this._fragmentationHistory.shift();
    const snap: MemorySnapshot = {
      timestamp: Date.now(),
      totalAllocated,
      totalFreed,
      activeBlocks: active.length,
      fragmentationIndex: frag,
    };
    this._snapshots.push(snap);
    if (this._snapshots.length > 200) this._snapshots.shift();
    this._updateLeakScores();
    return snap;
  }

  private _computeFragmentation(): number {
    const active = Array.from(this._blocks.values()).filter(b => b.freedAt === null).map(b => b.size);
    if (active.length < 2) return 0;
    const total = active.reduce((a, b) => a + b, 0);
    const largest = Math.max(...active);
    return 1 - largest / total;
  }

  private _updateLeakScores(): void {
    const now = Date.now();
    for (const block of this._blocks.values()) {
      if (block.freedAt !== null) continue;
      const age = now - block.allocatedAt;
      const refs = block.references;
      const score = age * 0.001 + (refs === 0 ? 10 : 0);
      this._leakScore.set(block.id, score);
    }
  }

  detectLeaks(threshold: number = 100): MemoryBlock[] {
    return Array.from(this._blocks.values()).filter(b => {
      return b.freedAt === null && (this._leakScore.get(b.id) ?? 0) > threshold;
    });
  }

  reachableFrom(rootId: string): Set<string> {
    const reachable = new Set<string>();
    const queue = [rootId];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (reachable.has(current)) continue;
      reachable.add(current);
      for (const neighbor of this._referenceGraph.get(current) ?? []) {
        queue.push(neighbor);
      }
    }
    return reachable;
  }

  getOrphanBlocks(): MemoryBlock[] {
    return Array.from(this._blocks.values()).filter(b => {
      return b.freedAt === null && b.references === 0;
    });
  }

  totalActiveSize(): number {
    return Array.from(this._blocks.values()).filter(b => b.freedAt === null).reduce((s, b) => s + b.size, 0);
  }

  averageBlockSize(): number {
    const active = Array.from(this._blocks.values()).filter(b => b.freedAt === null);
    if (active.length === 0) return 0;
    return active.reduce((s, b) => s + b.size, 0) / active.length;
  }

  getSnapshots(limit: number = 50): MemorySnapshot[] {
    return this._snapshots.slice(-limit);
  }

  get fragmentationTrend(): number {
    if (this._fragmentationHistory.length < 2) return 0;
    const recent = this._fragmentationHistory.slice(-10);
    const first = recent[0];
    const last = recent[recent.length - 1];
    return last - first;
  }

  memoryReport(): Record<string, unknown> {
    return {
      totalBlocks: this._blocks.size,
      activeBlocks: Array.from(this._blocks.values()).filter(b => b.freedAt === null).length,
      totalActiveSize: this.totalActiveSize(),
      averageBlockSize: this.averageBlockSize().toFixed(2),
      fragmentationIndex: this._computeFragmentation().toFixed(4),
      fragmentationTrend: this.fragmentationTrend.toFixed(4),
      leakCount: this.detectLeaks().length,
      orphanCount: this.getOrphanBlocks().length,
      state: this._state,
    };
  }
}
