import { DataPacket } from '../shared/types';

export interface MemorySegment {
  readonly start: number;
  readonly size: number;
  readonly type: 'code' | 'data' | 'heap' | 'stack' | 'shared' | 'mmap';
  readonly permissions: 'r' | 'w' | 'x' | 'rw' | 'rwx';
  readonly owner: string;
  readonly sharedCount: number;
}

export interface PageTable {
  readonly pages: Map<number, PageEntry>;
  readonly pageSize: number;
  readonly totalPages: number;
  readonly usedPages: number;
  readonly level: number;
}

export interface PageEntry {
  readonly frame: number;
  readonly valid: boolean;
  readonly dirty: boolean;
  readonly accessed: boolean;
  readonly permissions: 'r' | 'rw' | 'rx' | 'rwx';
  readonly cached: boolean;
}

export interface TLBEntry {
  readonly virtualPage: number;
  readonly physicalFrame: number;
  readonly valid: boolean;
  readonly lastUsed: number;
  readonly processId: number;
}

export interface MemoryRegion {
  readonly start: number;
  readonly end: number;
  readonly type: 'user' | 'kernel' | 'reserved';
  readonly protected: boolean;
}

export interface SwapInfo {
  readonly total: number;
  readonly used: number;
  readonly pageIns: number;
  readonly pageOuts: number;
}

export class MemoryManager {
  private _segments: MemorySegment[] = [];
  private _pageTable: PageTable = { pages: new Map(), pageSize: 4096, totalPages: 0, usedPages: 0, level: 2 };
  private _history: string[] = [];
  private _counter = 0;
  private _heapUsed = 0;
  private _totalMemory = 0;
  private _freeFrames: number[] = [];
  private _tlb: Map<number, TLBEntry> = new Map();
  private _memoryRegions: MemoryRegion[] = [];
  private _swapInfo: SwapInfo = { total: 0, used: 0, pageIns: 0, pageOuts: 0 };
  private _processMemory: Map<number, { segments: MemorySegment[]; pageTable: PageTable }> = new Map();
  private _memoryMappings: Map<string, { fd: number; offset: number; length: number; prot: string }> = new Map();

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

  get freeFrames(): number {
    return this._freeFrames.length;
  }

  get tlbEntries(): number {
    return this._tlb.size;
  }

  get swapUsage(): number {
    return this._swapInfo.used;
  }

  public memoryAllocation(size: number, method: 'first-fit' | 'best-fit' | 'worst-fit' | 'next-fit'): { address: number; size: number; method: string; success: boolean; fragment: number } {
    const address = this._heapUsed;
    this._heapUsed += size;
    this._segments.push({ 
      start: address, 
      size, 
      type: 'heap', 
      permissions: 'rw',
      owner: 'process-' + Math.floor(Math.random() * 100),
      sharedCount: 0
    });
    this._totalMemory += size;
    
    const internalFragment = size % this._pageTable.pageSize;
    const externalFragment = this._calculateExternalFragmentation();
    
    this._recordHistory(`memoryAllocation(size=${size}, method=${method}) -> addr=${address}`);
    return { address, size, method, success: true, fragment: externalFragment };
  }

  public malloc(size: number): { ptr: number; size: number; success: boolean; allocated: number } {
    const headerSize = 16;
    const actualSize = size + headerSize;
    const ptr = this._heapUsed;
    this._heapUsed += actualSize;
    this._totalMemory += actualSize;
    this._recordHistory(`malloc(size=${size}) -> ptr=${ptr}`);
    return { ptr, size, success: true, allocated: actualSize };
  }

  public calloc(num: number, size: number): { ptr: number; total: number; initialized: boolean; success: boolean } {
    const totalSize = num * size;
    const ptr = this._heapUsed;
    this._heapUsed += totalSize;
    this._totalMemory += totalSize;
    this._recordHistory(`calloc(num=${num}, size=${size}) -> ptr=${ptr}, total=${totalSize}`);
    return { ptr, total: totalSize, initialized: true, success: true };
  }

  public realloc(ptr: number, newSize: number): { ptr: number; oldSize: number; newSize: number; success: boolean; copied: number } {
    const oldSize = this._findSegmentSize(ptr);
    const newPtr = this._heapUsed;
    this._heapUsed += newSize;
    this._totalMemory += newSize;
    const copied = Math.min(oldSize, newSize);
    this._recordHistory(`realloc(ptr=${ptr}, old=${oldSize}, new=${newSize}) -> ptr=${newPtr}`);
    return { ptr: newPtr, oldSize, newSize, success: true, copied };
  }

  public free(address: number): { address: number; freed: boolean; size: number; merged: boolean } {
    const idx = this._segments.findIndex(s => s.start === address);
    const seg = this._segments[idx];
    let merged = false;
    if (idx >= 0) {
      this._totalMemory -= seg.size;
      const prevIdx = idx - 1;
      const nextIdx = idx + 1;
      if (prevIdx >= 0 && this._segments[prevIdx].type === 'heap') {
        this._segments[prevIdx] = { ...this._segments[prevIdx], size: this._segments[prevIdx].size + seg.size };
        merged = true;
      }
      if (nextIdx < this._segments.length && this._segments[nextIdx].type === 'heap') {
        const targetIdx = merged ? prevIdx : idx;
        this._segments[targetIdx] = { ...this._segments[targetIdx], size: this._segments[targetIdx].size + this._segments[nextIdx].size };
        this._segments.splice(nextIdx, 1);
        merged = true;
      }
      if (!merged) {
        this._segments.splice(idx, 1);
      }
    }
    this._recordHistory(`free(addr=${address}) -> freed=${!!seg}, merged=${merged}`);
    return { address, freed: !!seg, size: seg?.size ?? 0, merged };
  }

  public pagingMemory(memory: number, pages: number, frameSize: number): { pages: number; frames: number; frameSize: number; internalFrag: number; externalFrag: number } {
    const frames = Math.ceil(memory / frameSize);
    const internalFrag = frames * frameSize - memory;
    this._pageTable = { 
      pages: new Map(), 
      pageSize: frameSize, 
      totalPages: pages, 
      usedPages: frames,
      level: 2
    };
    for (let i = 0; i < frames; i++) {
      this._pageTable.pages.set(i, {
        frame: i,
        valid: true,
        dirty: false,
        accessed: true,
        permissions: 'rw',
        cached: false
      });
    }
    for (let i = frames; i < pages; i++) {
      this._freeFrames.push(i);
    }
    const externalFrag = this._calculateExternalFragmentation();
    this._recordHistory(`pagingMemory(memory=${memory}, frames=${frames}, frameSize=${frameSize})`);
    return { pages: frames, frames, frameSize, internalFrag, externalFrag };
  }

  public virtualMemory(physical: number, pages: number, disk: number): { virtual: number; physical: number; disk: number; pageFaultRate: number; overhead: number } {
    const virtual = physical + disk;
    const pageFaultRate = disk / virtual;
    const overhead = virtual * 0.02;
    this._swapInfo = { total: disk, used: 0, pageIns: 0, pageOuts: 0 };
    this._recordHistory(`virtualMemory(physical=${physical}, disk=${disk}) -> virtual=${virtual}`);
    return { virtual, physical, disk, pageFaultRate, overhead };
  }

  public segmentationMemory(segments: { name: string; size: number; type: 'code' | 'data' | 'stack' }[], sizes: number[]): { segments: number; totalSize: number; externalFrag: number; internalFrag: number } {
    const totalSize = sizes.reduce((s, z) => s + z, 0);
    const internalFrag = sizes.reduce((sum, size, i) => {
      const pageSize = this._pageTable.pageSize;
      return sum + (pageSize - (size % pageSize)) % pageSize;
    }, 0);
    segments.forEach((s, i) => {
      this._segments.push({ 
        start: i * 4096, 
        size: sizes[i] ?? 0, 
        type: s.type, 
        permissions: s.type === 'code' ? 'rx' : 'rw',
        owner: 'process-' + Math.floor(Math.random() * 100),
        sharedCount: 0
      });
    });
    const externalFrag = this._calculateExternalFragmentation();
    this._recordHistory(`segmentationMemory(segments=${segments.length}, total=${totalSize})`);
    return { segments: segments.length, totalSize, externalFrag, internalFrag };
  }

  public pageFault(address: number, pageTable: PageTable): { fault: boolean; page: number; evicted: number | null; handled: boolean; latency: number } {
    const page = Math.floor(address / pageTable.pageSize);
    const fault = !pageTable.pages.has(page);
    let evicted: number | null = null;
    let handled = false;
    
    if (fault) {
      if (pageTable.usedPages >= pageTable.totalPages) {
        evicted = this._selectVictimPage(pageTable);
        this._swapInfo.pageOuts++;
      }
      this._swapInfo.pageIns++;
      this._swapInfo.used += pageTable.pageSize;
      handled = true;
    }
    
    this._recordHistory(`pageFault(addr=${address}, page=${page}) -> fault=${fault}, evicted=${evicted}`);
    return { fault, page, evicted, handled, latency: fault ? 1000 : 10 };
  }

  public pageReplacement(pages: number[], algorithm: string, frameSize: number): { faults: number; hits: number; algorithm: string; evictions: number; efficiency: number } {
    const frames = new Map<number, { lastUsed: number; referenced: boolean }>();
    let faults = 0;
    let hits = 0;
    let evictions = 0;
    let timestamp = 0;

    for (const page of pages) {
      timestamp++;
      if (frames.has(page)) {
        hits++;
        frames.set(page, { lastUsed: timestamp, referenced: true });
      } else {
        faults++;
        if (frames.size >= frameSize) {
          const victim = this._selectReplacementVictim(frames, algorithm);
          frames.delete(victim);
          evictions++;
        }
        frames.set(page, { lastUsed: timestamp, referenced: true });
      }
    }
    
    const efficiency = hits / Math.max(1, pages.length);
    this._recordHistory(`pageReplacement(algo=${algorithm}, pages=${pages.length}, frames=${frameSize}) -> faults=${faults}, efficiency=${(efficiency * 100).toFixed(1)}%`);
    return { faults, hits, algorithm, evictions, efficiency };
  }

  public lruReplacement(pages: number[], frames: number): { faults: number; hits: number; evictions: number; hitRate: number; stackDistance: number[] } {
    const result = this.pageReplacement(pages, 'LRU', frames);
    const stackDistances = this._calculateStackDistances(pages);
    this._recordHistory(`lruReplacement(pages=${pages.length}, frames=${frames}) -> faults=${result.faults}`);
    return { 
      faults: result.faults, 
      hits: result.hits, 
      evictions: result.evictions,
      hitRate: result.hits / Math.max(1, pages.length),
      stackDistance: stackDistances
    };
  }

  public fifoReplacement(pages: number[], frames: number): { faults: number; hits: number; beladyAnomaly: boolean; evictions: number; sequence: number[] } {
    const result5Frames = this.pageReplacement(pages, 'FIFO', 5);
    const result6Frames = this.pageReplacement(pages, 'FIFO', 6);
    const beladyAnomaly = result6Frames.faults > result5Frames.faults;
    this._recordHistory(`fifoReplacement(pages=${pages.length}, frames=${frames}) -> faults=${result5Frames.faults}, belady=${beladyAnomaly}`);
    return { 
      faults: result5Frames.faults, 
      hits: result5Frames.hits, 
      beladyAnomaly,
      evictions: result5Frames.evictions,
      sequence: pages.slice(0, Math.min(10, pages.length))
    };
  }

  public optimalReplacement(pages: number[], frames: number): { faults: number; hits: number; optimal: boolean; evictions: number; optimalBound: number } {
    const futureUsage = this._calculateFutureUsage(pages);
    const framesMap = new Map<number, number>();
    let faults = 0;
    let hits = 0;
    let evictions = 0;

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      if (framesMap.has(page)) {
        hits++;
        framesMap.set(page, futureUsage[i]);
      } else {
        faults++;
        if (framesMap.size >= frames) {
          let maxDistance = -1;
          let victim = -1;
          for (const [p, dist] of framesMap) {
            if (dist > maxDistance) {
              maxDistance = dist;
              victim = p;
            }
          }
          framesMap.delete(victim);
          evictions++;
        }
        framesMap.set(page, futureUsage[i]);
      }
    }
    
    const optimalBound = Math.floor(faults * 0.9);
    this._recordHistory(`optimalReplacement(pages=${pages.length}, frames=${frames}) -> faults=${faults}`);
    return { faults, hits, optimal: true, evictions, optimalBound };
  }

  public clockAlgorithm(pages: number[], frames: number): { faults: number; hits: number; sweeps: number; evictions: number; efficiency: number } {
    const clock = new Array<{ page: number; referenced: boolean }>();
    let pointer = 0;
    let faults = 0;
    let hits = 0;
    let sweeps = 0;
    let evictions = 0;

    for (const page of pages) {
      const existingIdx = clock.findIndex(c => c.page === page);
      if (existingIdx >= 0) {
        hits++;
        clock[existingIdx].referenced = true;
      } else {
        faults++;
        if (clock.length < frames) {
          clock.push({ page, referenced: true });
        } else {
          let found = false;
          while (!found) {
            if (pointer >= clock.length) {
              pointer = 0;
              sweeps++;
            }
            if (!clock[pointer].referenced) {
              clock[pointer] = { page, referenced: true };
              evictions++;
              found = true;
            } else {
              clock[pointer].referenced = false;
            }
            pointer++;
          }
        }
      }
    }
    
    const efficiency = hits / Math.max(1, pages.length);
    this._recordHistory(`clockAlgorithm(pages=${pages.length}, frames=${frames}) -> faults=${faults}, sweeps=${sweeps}`);
    return { faults, hits, sweeps, evictions, efficiency };
  }

  public thrashingDetection(processes: number, frames: number, pageFaultRate: number): { thrashing: boolean; pageFaultRate: number; cpuUtilization: number; recommendedFrames: number; solution: string } {
    const actualRate = processes / frames;
    const thrashing = actualRate > 0.5 || pageFaultRate > 0.7;
    const cpuUtilization = thrashing ? 0.2 : 0.8;
    const recommendedFrames = thrashing ? Math.floor(frames * 1.5) : frames;
    const solution = thrashing ? 'Increase memory allocation or reduce processes' : 'Optimal state';
    this._recordHistory(`thrashingDetection(processes=${processes}, frames=${frames}) -> thrashing=${thrashing}, rate=${actualRate.toFixed(2)}`);
    return { thrashing, pageFaultRate: actualRate, cpuUtilization, recommendedFrames, solution };
  }

  public workingSet(process: number, window: number, pageAccesses: number[]): { pages: number[]; size: number; process: number; faultRate: number; efficiency: number } {
    const workingSet = new Set<number>();
    for (let i = Math.max(0, pageAccesses.length - window); i < pageAccesses.length; i++) {
      workingSet.add(pageAccesses[i]);
    }
    const pages = Array.from(workingSet);
    const faultRate = pages.length / Math.max(1, window);
    const efficiency = 1 - faultRate;
    this._recordHistory(`workingSet(process=${process}, window=${window}) -> size=${pages.length}`);
    return { pages, size: pages.length, process, faultRate, efficiency };
  }

  public workingSetClock(process: number, window: number, maxFrames: number): { allocatedFrames: number; workingSetSize: number; faultRate: number; evictions: number } {
    const workingSetSize = Math.floor(Math.random() * window) + 1;
    const allocatedFrames = Math.min(workingSetSize, maxFrames);
    const evictions = Math.max(0, workingSetSize - maxFrames);
    const faultRate = evictions / Math.max(1, workingSetSize);
    this._recordHistory(`workingSetClock(process=${process}, window=${window}, maxFrames=${maxFrames})`);
    return { allocatedFrames, workingSetSize, faultRate, evictions };
  }

  public buddySystem(totalSize: number, requestedSize: number): { blocks: number; size: number; allocations: number; fragmentation: number; buddyPair: number[] } {
    const maxBlocks = Math.log2(totalSize / 4096);
    const blockSize = Math.pow(2, Math.ceil(Math.log2(requestedSize / 4096))) * 4096;
    const allocations = Math.floor(maxBlocks / 2);
    const fragmentation = (blockSize - requestedSize) / blockSize;
    const buddyPair = [0, Math.floor(totalSize / blockSize)];
    this._recordHistory(`buddySystem(totalSize=${totalSize}, requested=${requestedSize}) -> blocks=${maxBlocks}, size=${blockSize}`);
    return { blocks: Math.floor(maxBlocks), size: blockSize, allocations, fragmentation, buddyPair };
  }

  public buddyAllocate(totalSize: number, size: number): { address: number; actualSize: number; level: number; success: boolean; wasted: number } {
    const levels = Math.floor(Math.log2(totalSize / 4096));
    const actualSize = Math.pow(2, Math.ceil(Math.log2(size / 4096))) * 4096;
    const level = Math.floor(Math.log2(actualSize / 4096));
    const address = level * 4096;
    const wasted = actualSize - size;
    this._recordHistory(`buddyAllocate(size=${size}) -> addr=${address}, level=${level}`);
    return { address, actualSize, level, success: true, wasted };
  }

  public buddyFree(address: number, size: number): { address: number; freed: boolean; coalesced: boolean; mergedSize: number } {
    const coalesced = Math.random() > 0.5;
    const mergedSize = coalesced ? size * 2 : size;
    this._recordHistory(`buddyFree(addr=${address}, size=${size}) -> coalesced=${coalesced}`);
    return { address, freed: true, coalesced, mergedSize };
  }

  public fragmentation(memory: number, type: 'internal' | 'external'): { fragmentation: number; type: string; percentage: number; impact: string; solution: string } {
    const fragmentation = type === 'internal' ? memory * 0.05 : memory * 0.1;
    const percentage = (fragmentation / memory) * 100;
    const impact = percentage > 10 ? 'High - may affect performance' : percentage > 5 ? 'Medium - monitor regularly' : 'Low - acceptable';
    const solution = type === 'internal' ? 'Use larger page sizes or reduce allocation granularity' : 'Compaction or dynamic partitioning';
    this._recordHistory(`fragmentation(type=${type}) -> ${percentage.toFixed(1)}%, impact=${impact}`);
    return { fragmentation, type, percentage, impact, solution };
  }

  public compaction(memory: number, segments: MemorySegment[]): { compacted: boolean; freedSpace: number; movedSegments: number; overhead: number; time: number } {
    let currentAddr = 0;
    let movedSegments = 0;
    const newSegments: MemorySegment[] = [];
    
    for (const seg of segments) {
      if (seg.start !== currentAddr) {
        newSegments.push({ ...seg, start: currentAddr });
        movedSegments++;
      } else {
        newSegments.push(seg);
      }
      currentAddr += seg.size;
    }
    
    const freedSpace = memory - currentAddr;
    const overhead = movedSegments * 100;
    const time = movedSegments * 50;
    this._recordHistory(`compaction(segments=${segments.length}) -> freed=${freedSpace}, moved=${movedSegments}`);
    return { compacted: true, freedSpace, movedSegments, overhead, time };
  }

  public garbageCollector(heap: number, algorithm: 'mark-sweep' | 'copying' | 'generational' | 'incremental'): { collected: number; freed: number; algorithm: string; pauseTime: number; liveObjects: number; efficiency: number } {
    const collected = Math.floor(heap * 0.3);
    const freed = collected;
    const pauseTime = algorithm === 'incremental' ? 10 : algorithm === 'generational' ? 50 : 100;
    const liveObjects = Math.floor(heap * 0.7);
    const efficiency = 0.9;
    
    this._recordHistory(`garbageCollector(heap=${heap}, algo=${algorithm}) -> freed=${freed}, pause=${pauseTime}ms`);
    return { collected, freed, algorithm, pauseTime, liveObjects, efficiency };
  }

  public markAndSweep(heapSize: number, objects: { size: number; reachable: boolean }[]): { freed: number; marked: number; swept: number; fragmentation: number } {
    const marked = objects.filter(o => o.reachable).reduce((sum, o) => sum + o.size, 0);
    const swept = objects.filter(o => !o.reachable).reduce((sum, o) => sum + o.size, 0);
    const freed = swept;
    const fragmentation = swept / heapSize;
    this._recordHistory(`markAndSweep(heap=${heapSize}, objects=${objects.length}) -> freed=${freed}`);
    return { freed, marked, swept, fragmentation };
  }

  public copyingGC(heapSize: number, fromSpace: number, toSpace: number): { copied: number; freed: number; pauseTime: number; efficiency: number } {
    const copied = Math.floor(fromSpace * 0.8);
    const freed = fromSpace - copied;
    const pauseTime = 30;
    const efficiency = 0.95;
    this._recordHistory(`copyingGC(from=${fromSpace}, to=${toSpace}) -> copied=${copied}`);
    return { copied, freed, pauseTime, efficiency };
  }

  public generationalGC(heapSize: number, youngGen: number, oldGen: number): { collectedYoung: number; collectedOld: number; totalFreed: number; pauseTime: number; promotionRate: number } {
    const collectedYoung = Math.floor(youngGen * 0.5);
    const collectedOld = Math.floor(oldGen * 0.1);
    const totalFreed = collectedYoung + collectedOld;
    const pauseTime = 40;
    const promotionRate = 0.2;
    this._recordHistory(`generationalGC(young=${youngGen}, old=${oldGen}) -> freed=${totalFreed}`);
    return { collectedYoung, collectedOld, totalFreed, pauseTime, promotionRate };
  }

  public memoryProtection(region: MemoryRegion, protection: 'read' | 'write' | 'execute' | 'none'): { protected: boolean; region: MemoryRegion; protection: string; enforced: boolean } {
    const enforced = true;
    this._recordHistory(`memoryProtection(region=[${region.start},${region.end}], prot=${protection})`);
    return { protected: true, region, protection, enforced };
  }

  public memoryMapping(fd: number, offset: number, length: number, prot: string, flags: string[]): { mapping: string; fd: number; offset: number; length: number; prot: string; success: boolean } {
    const mappingId = `mmap-${fd}-${offset}`;
    this._memoryMappings.set(mappingId, { fd, offset, length, prot });
    this._recordHistory(`mmap(fd=${fd}, len=${length}, prot=${prot}) -> ${mappingId}`);
    return { mapping: mappingId, fd, offset, length, prot, success: true };
  }

  public unmap(mapping: string): { unmapped: boolean; freed: number; success: boolean } {
    const info = this._memoryMappings.get(mapping);
    const freed = info?.length ?? 0;
    const unmapped = !!info;
    if (unmapped) {
      this._memoryMappings.delete(mapping);
    }
    this._recordHistory(`munmap(${mapping}) -> freed=${freed}`);
    return { unmapped, freed, success: true };
  }

  public tlbLookup(virtualPage: number): { hit: boolean; physicalFrame: number | null; latency: number; entry: TLBEntry | null } {
    const entry = this._tlb.get(virtualPage);
    const hit = !!entry && entry.valid;
    const latency = hit ? 1 : 100;
    if (entry) {
      entry.lastUsed = Date.now();
    }
    this._recordHistory(`tlbLookup(page=${virtualPage}) -> hit=${hit}`);
    return { hit, physicalFrame: hit ? entry.physicalFrame : null, latency, entry };
  }

  public tlbInsert(virtualPage: number, physicalFrame: number, processId: number): { inserted: boolean; evicted: number | null; success: boolean } {
    const maxEntries = 64;
    let evicted: number | null = null;
    
    if (this._tlb.size >= maxEntries) {
      let oldestTime = Infinity;
      let oldestPage = -1;
      for (const [page, entry] of this._tlb) {
        if (entry.lastUsed < oldestTime) {
          oldestTime = entry.lastUsed;
          oldestPage = page;
        }
      }
      evicted = oldestPage;
      this._tlb.delete(oldestPage);
    }
    
    this._tlb.set(virtualPage, {
      virtualPage,
      physicalFrame,
      valid: true,
      lastUsed: Date.now(),
      processId
    });
    
    this._recordHistory(`tlbInsert(virtual=${virtualPage}, physical=${physicalFrame}) -> evicted=${evicted}`);
    return { inserted: true, evicted, success: true };
  }

  public tlbFlush(processId: number): { flushed: number; remaining: number; success: boolean } {
    let flushed = 0;
    for (const [page, entry] of this._tlb) {
      if (entry.processId === processId) {
        this._tlb.delete(page);
        flushed++;
      }
    }
    this._recordHistory(`tlbFlush(process=${processId}) -> flushed=${flushed}`);
    return { flushed, remaining: this._tlb.size, success: true };
  }

  public multiLevelPaging(virtualAddress: number, levels: number): { pteAddress: number[]; physicalAddress: number; page: number; offset: number; resolved: boolean } {
    const pageSize = this._pageTable.pageSize;
    const page = Math.floor(virtualAddress / pageSize);
    const offset = virtualAddress % pageSize;
    const pteAddresses: number[] = [];
    
    let remaining = page;
    for (let i = 0; i < levels; i++) {
      const index = remaining % 1024;
      pteAddresses.push(index * 4);
      remaining = Math.floor(remaining / 1024);
    }
    
    const physicalAddress = page * pageSize + offset;
    this._recordHistory(`multiLevelPaging(addr=${virtualAddress}, levels=${levels}) -> phys=${physicalAddress}`);
    return { pteAddress: pteAddresses, physicalAddress, page, offset, resolved: true };
  }

  public allocateProcessMemory(processId: number, size: number): { processId: number; allocated: number; segments: number; success: boolean; pageTableSize: number } {
    const segments: MemorySegment[] = [
      { start: 0, size: size * 0.4, type: 'code', permissions: 'rx', owner: `process-${processId}`, sharedCount: 0 },
      { start: size * 0.4, size: size * 0.3, type: 'data', permissions: 'rw', owner: `process-${processId}`, sharedCount: 0 },
      { start: size * 0.7, size: size * 0.3, type: 'stack', permissions: 'rw', owner: `process-${processId}`, sharedCount: 0 }
    ];
    
    const pageTable: PageTable = {
      pages: new Map(),
      pageSize: 4096,
      totalPages: Math.ceil(size / 4096),
      usedPages: Math.ceil(size / 4096),
      level: 2
    };
    
    this._processMemory.set(processId, { segments, pageTable });
    this._recordHistory(`allocateProcessMemory(process=${processId}, size=${size})`);
    return { processId, allocated: size, segments: segments.length, success: true, pageTableSize: pageTable.totalPages };
  }

  public deallocateProcessMemory(processId: number): { processId: number; freed: number; success: boolean; cleanup: boolean } {
    const info = this._processMemory.get(processId);
    const freed = info ? info.segments.reduce((sum, s) => sum + s.size, 0) : 0;
    const success = !!info;
    if (success) {
      this._processMemory.delete(processId);
      this.tlbFlush(processId);
    }
    this._recordHistory(`deallocateProcessMemory(process=${processId}) -> freed=${freed}`);
    return { processId, freed, success, cleanup: true };
  }

  public swapIn(page: number, frame: number): { swapped: boolean; page: number; frame: number; latency: number; success: boolean } {
    this._swapInfo.pageIns++;
    this._swapInfo.used -= this._pageTable.pageSize;
    const latency = 1000;
    this._recordHistory(`swapIn(page=${page}, frame=${frame})`);
    return { swapped: true, page, frame, latency, success: true };
  }

  public swapOut(page: number, diskBlock: number): { swapped: boolean; page: number; diskBlock: number; latency: number; success: boolean } {
    this._swapInfo.pageOuts++;
    this._swapInfo.used += this._pageTable.pageSize;
    const latency = 1500;
    this._recordHistory(`swapOut(page=${page}, block=${diskBlock})`);
    return { swapped: true, page, diskBlock, latency, success: true };
  }

  public getMemoryStats(): { total: number; used: number; free: number; swapUsed: number; pageFaults: number; tlbHits: number; fragmentation: number } {
    const free = this._freeFrames.length * this._pageTable.pageSize;
    const fragmentation = this._calculateExternalFragmentation();
    this._recordHistory(`getMemoryStats()`);
    return {
      total: this._totalMemory,
      used: this._totalMemory - free,
      free,
      swapUsed: this._swapInfo.used,
      pageFaults: this._swapInfo.pageIns,
      tlbHits: this._tlb.size,
      fragmentation
    };
  }

  public toPacket(): DataPacket<{
    segments: number;
    pages: number;
    heapUsed: number;
    totalMemory: number;
    freeFrames: number;
    tlbEntries: number;
    swapUsage: number;
    history: string[];
  }> {
    return {
      id: `mem-mgr-${Date.now()}-${this._counter}`,
      payload: {
        segments: this._segments.length,
        pages: this._pageTable.usedPages,
        heapUsed: this._heapUsed,
        totalMemory: this._totalMemory,
        freeFrames: this._freeFrames.length,
        tlbEntries: this._tlb.size,
        swapUsage: this._swapInfo.used,
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
    this._pageTable = { pages: new Map(), pageSize: 4096, totalPages: 0, usedPages: 0, level: 2 };
    this._history = [];
    this._counter = 0;
    this._heapUsed = 0;
    this._totalMemory = 0;
    this._freeFrames = [];
    this._tlb.clear();
    this._memoryRegions = [];
    this._swapInfo = { total: 0, used: 0, pageIns: 0, pageOuts: 0 };
    this._processMemory.clear();
    this._memoryMappings.clear();
  }

  private _recordHistory(entry: string): void {
    this._counter++;
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
  }

  private _findSegmentSize(address: number): number {
    const seg = this._segments.find(s => s.start === address);
    return seg?.size ?? 0;
  }

  private _calculateExternalFragmentation(): number {
    if (this._segments.length === 0) return 0;
    const sorted = [...this._segments].sort((a, b) => a.start - b.start);
    let fragmentation = 0;
    let lastEnd = 0;
    for (const seg of sorted) {
      if (seg.start > lastEnd) {
        fragmentation += seg.start - lastEnd;
      }
      lastEnd = seg.start + seg.size;
    }
    return fragmentation;
  }

  private _selectVictimPage(pageTable: PageTable): number {
    const pages = Array.from(pageTable.pages.keys());
    return pages[Math.floor(Math.random() * pages.length)];
  }

  private _selectReplacementVictim(frames: Map<number, { lastUsed: number; referenced: boolean }>, algorithm: string): number {
    if (algorithm === 'LRU') {
      let oldestTime = Infinity;
      let victim = -1;
      for (const [page, info] of frames) {
        if (info.lastUsed < oldestTime) {
          oldestTime = info.lastUsed;
          victim = page;
        }
      }
      return victim;
    }
    return Array.from(frames.keys())[0];
  }

  private _calculateStackDistances(pages: number[]): number[] {
    const distances: number[] = [];
    const lastSeen = new Map<number, number>();
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const lastIdx = lastSeen.get(page);
      const distance = lastIdx !== undefined ? i - lastIdx : Infinity;
      distances.push(distance);
      lastSeen.set(page, i);
    }
    return distances;
  }

  private _calculateFutureUsage(pages: number[]): number[] {
    const futureUsage: number[] = [];
    for (let i = 0; i < pages.length; i++) {
      let distance = Infinity;
      for (let j = i + 1; j < pages.length; j++) {
        if (pages[j] === pages[i]) {
          distance = j - i;
          break;
        }
      }
      futureUsage.push(distance);
    }
    return futureUsage;
  }
}