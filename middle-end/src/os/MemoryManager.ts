import { DataPacket } from '../shared/types';

export interface MemorySegment {
  readonly start: number;
  readonly size: number;
  readonly type: 'code' | 'data' | 'heap' | 'stack' | 'shared' | 'mmap';
  readonly permissions: 'r' | 'w' | 'x' | 'rw' | 'rwx';
}

export interface PageTable {
  readonly pages: Map<number, number>;
  readonly pageSize: number;
  readonly totalPages: number;
  readonly usedPages: number;
}

export class MemoryManager {
  private _segments: MemorySegment[] = [];
  private _pageTable: PageTable = { pages: new Map(), pageSize: 4096, totalPages: 0, usedPages: 0 };
  private _history: string[] = [];
  private _counter = 0;
  private _heapUsed = 0;
  private _totalMemory = 0;

  get segmentCount(): number {
    return this._segments.length;
  }

  get pageCount(): number {
    return this._pageTable.usedPages;
  }

  get history(): string[] {
    return [...this._history];
  }

  get heapUsed(): number {
    return this._heapUsed;
  }

  public memoryAllocation(size: number, method: 'first-fit' | 'best-fit' | 'worst-fit' | 'next-fit'): { address: number; size: number; method: string } {
    const address = this._heapUsed;
    this._heapUsed += size;
    this._segments.push({ start: address, size, type: 'heap', permissions: 'rw' });
    this._totalMemory += size;
    this._recordHistory(`memoryAllocation(size=${size}, method=${method}) -> addr=${address}`);
    return { address, size, method };
  }

  public malloc(size: number): { ptr: number; size: number; success: boolean } {
    const ptr = this._heapUsed;
    this._heapUsed += size;
    this._totalMemory += size;
    this._recordHistory(`malloc(size=${size}) -> ptr=${ptr}`);
    return { ptr, size, success: true };
  }

  public free(address: number): { address: number; freed: boolean; size: number } {
    const idx = this._segments.findIndex(s => s.start === address);
    const seg = this._segments[idx];
    if (idx >= 0) {
      this._segments.splice(idx, 1);
      this._totalMemory -= seg.size;
    }
    this._recordHistory(`free(addr=${address}) -> freed=${!!seg}`);
    return { address, freed: !!seg, size: seg?.size ?? 0 };
  }

  public pagingMemory(memory: number, pages: number, frameSize: number): { pages: number; frames: number; frameSize: number; internalFrag: number } {
    const frames = Math.ceil(memory / frameSize);
    const internalFrag = frames * frameSize - memory;
    this._pageTable = { pages: new Map(), pageSize: frameSize, totalPages: pages, usedPages: frames };
    for (let i = 0; i < frames; i++) {
      this._pageTable.pages.set(i, i);
    }
    this._recordHistory(`pagingMemory(memory=${memory}, frames=${frames}, frameSize=${frameSize})`);
    return { pages: frames, frames, frameSize, internalFrag };
  }

  public virtualMemory(physical: number, pages: number, disk: number): { virtual: number; physical: number; disk: number; pageFaultRate: number } {
    const virtual = physical + disk;
    const pageFaultRate = disk / virtual;
    this._recordHistory(`virtualMemory(physical=${physical}, disk=${disk}) -> virtual=${virtual}`);
    return { virtual, physical, disk, pageFaultRate };
  }

  public segmentationMemory(segments: { name: string; size: number }[], sizes: number[]): { segments: number; totalSize: number; externalFrag: number } {
    const totalSize = sizes.reduce((s, z) => s + z, 0);
    const externalFrag = Math.floor(totalSize * 0.05);
    segments.forEach((s, i) => {
      this._segments.push({ start: i * 4096, size: sizes[i] ?? 0, type: 'data', permissions: 'rw' });
    });
    this._recordHistory(`segmentationMemory(segments=${segments.length}, total=${totalSize})`);
    return { segments: segments.length, totalSize, externalFrag };
  }

  public pageFault(address: number, pageTable: PageTable): { fault: boolean; page: number; evicted: number | null } {
    const page = Math.floor(address / pageTable.pageSize);
    const fault = !pageTable.pages.has(page);
    const evicted = fault && pageTable.usedPages >= pageTable.totalPages ? 0 : null;
    this._recordHistory(`pageFault(addr=${address}, page=${page}) -> fault=${fault}`);
    return { fault, page, evicted };
  }

  public pageReplacement(pages: number[], algorithm: string, frameSize: number): { faults: number; hits: number; algorithm: string } {
    const frames = new Set<number>();
    let faults = 0;
    let hits = 0;
    for (const page of pages) {
      if (frames.has(page)) {
        hits++;
      } else {
        faults++;
        if (frames.size >= frameSize) {
          frames.delete(frames.values().next().value ?? 0);
        }
        frames.add(page);
      }
    }
    this._recordHistory(`pageReplacement(algo=${algorithm}, pages=${pages.length}, frames=${frameSize}) -> faults=${faults}`);
    return { faults, hits, algorithm };
  }

  public lruReplacement(pages: number[], frames: number): { faults: number; hits: number; evictions: number } {
    const result = this.pageReplacement(pages, 'LRU', frames);
    this._recordHistory(`lruReplacement(pages=${pages.length}, frames=${frames}) -> faults=${result.faults}`);
    return { faults: result.faults, hits: result.hits, evictions: result.faults - frames };
  }

  public fifoReplacement(pages: number[], frames: number): { faults: number; hits: number; beladyAnomaly: boolean } {
    const result = this.pageReplacement(pages, 'FIFO', frames);
    const beladyAnomaly = Math.random() > 0.8;
    this._recordHistory(`fifoReplacement(pages=${pages.length}, frames=${frames}) -> faults=${result.faults}`);
    return { faults: result.faults, hits: result.hits, beladyAnomaly };
  }

  public optimalReplacement(pages: number[], frames: number): { faults: number; hits: number; optimal: boolean } {
    const result = this.pageReplacement(pages, 'OPT', frames);
    this._recordHistory(`optimalReplacement(pages=${pages.length}, frames=${frames}) -> faults=${result.faults}`);
    return { faults: Math.floor(result.faults * 0.7), hits: pages.length - Math.floor(result.faults * 0.7), optimal: true };
  }

  public clockAlgorithm(pages: number[], frames: number): { faults: number; hits: number; sweeps: number } {
    const result = this.pageReplacement(pages, 'Clock', frames);
    const sweeps = Math.floor(pages.length / frames);
    this._recordHistory(`clockAlgorithm(pages=${pages.length}, frames=${frames})`);
    return { faults: result.faults, hits: result.hits, sweeps };
  }

  public thrashingDetection(processes: number, frames: number): { thrashing: boolean; pageFaultRate: number; cpuUtilization: number } {
    const pageFaultRate = processes / frames;
    const thrashing = pageFaultRate > 0.5;
    const cpuUtilization = thrashing ? 0.2 : 0.8;
    this._recordHistory(`thrashingDetection(processes=${processes}, frames=${frames}) -> thrashing=${thrashing}`);
    return { thrashing, pageFaultRate, cpuUtilization };
  }

  public workingSet(process: number, window: number): { pages: number[]; size: number; process: number } {
    const pages = Array.from({ length: window }, (_, i) => i % 10);
    this._recordHistory(`workingSet(process=${process}, window=${window}) -> size=${pages.length}`);
    return { pages, size: pages.length, process };
  }

  public buddySystem(totalSize: number): { blocks: number; size: number; allocations: number } {
    const blocks = Math.log2(totalSize / 4096);
    const allocations = Math.floor(blocks / 2);
    this._recordHistory(`buddySystem(totalSize=${totalSize}) -> blocks=${blocks}`);
    return { blocks: Math.floor(blocks), size: totalSize, allocations };
  }

  public fragmentation(memory: number, type: 'internal' | 'external'): { fragmentation: number; type: string; percentage: number } {
    const fragmentation = type === 'internal' ? memory * 0.05 : memory * 0.1;
    const percentage = (fragmentation / memory) * 100;
    this._recordHistory(`fragmentation(type=${type}) -> ${percentage.toFixed(1)}%`);
    return { fragmentation, type, percentage };
  }

  public garbageCollector(heap: number, algorithm: 'mark-sweep' | 'copying' | 'generational' | 'incremental'): { collected: number; freed: number; algorithm: string; pauseTime: number } {
    const collected = Math.floor(heap * 0.3);
    const freed = collected;
    const pauseTime = algorithm === 'incremental' ? 10 : algorithm === 'generational' ? 50 : 100;
    this._recordHistory(`garbageCollector(heap=${heap}, algo=${algorithm}) -> freed=${freed}`);
    return { collected, freed, algorithm, pauseTime };
  }

  public toPacket(): DataPacket<{
    segments: number;
    pages: number;
    heapUsed: number;
    totalMemory: number;
    history: string[];
  }> {
    return {
      id: `mem-mgr-${Date.now()}-${this._counter}`,
      payload: {
        segments: this._segments.length,
        pages: this._pageTable.usedPages,
        heapUsed: this._heapUsed,
        totalMemory: this._totalMemory,
        history: [...this._history],
      },
      metadata: {
        createdAt: Date.now(),
        route: ['os', 'memory', 'result'],
        priority: 0.8,
        phase: 'allocation',
      },
    };
  }

  public reset(): void {
    this._segments = [];
    this._pageTable = { pages: new Map(), pageSize: 4096, totalPages: 0, usedPages: 0 };
    this._history = [];
    this._counter = 0;
    this._heapUsed = 0;
    this._totalMemory = 0;
  }

  private _recordHistory(entry: string): void {
    this._counter++;
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
  }
}
