import { DataPacket } from '../shared/types';

export interface IORequest {
  readonly id: string;
  readonly device: string;
  readonly operation: 'read' | 'write';
  readonly buffer: string;
  readonly size: number;
  readonly status: 'pending' | 'in-progress' | 'completed' | 'failed';
  readonly priority: number;
  readonly timestamp: number;
}

export interface DeviceDriver {
  readonly name: string;
  readonly type: 'block' | 'character' | 'network' | 'usb' | 'storage' | 'display';
  readonly operations: string[];
  readonly status: 'active' | 'idle' | 'error' | 'disabled';
  readonly deviceId: string;
  readonly interruptLine: number;
  readonly dmaChannel: number;
}

export interface DMAChannel {
  readonly channel: number;
  readonly status: 'idle' | 'transferring' | 'error';
  readonly source: string;
  readonly destination: string;
  readonly size: number;
  readonly progress: number;
}

export interface InterruptController {
  readonly irq: number;
  readonly handler: string;
  readonly device: string;
  readonly enabled: boolean;
  readonly priority: number;
  readonly pending: boolean;
}

export interface IOScheduler {
  readonly algorithm: string;
  readonly queue: IORequest[];
  readonly activeRequests: number;
  readonly completedRequests: number;
  readonly pendingRequests: number;
}

export interface RAIDConfiguration {
  readonly level: string;
  readonly disks: string[];
  readonly stripeSize: number;
  readonly parityScheme: 'left-asymmetric' | 'right-asymmetric' | 'left-symmetric' | 'right-symmetric';
  readonly status: 'optimal' | 'degraded' | 'failed';
}

export interface StoragePool {
  readonly name: string;
  readonly disks: string[];
  readonly totalCapacity: number;
  readonly usedCapacity: number;
  readonly redundancy: string;
  readonly status: 'online' | 'degraded' | 'offline';
}

export interface FileSystemCache {
  readonly blocks: Map<number, { data: string; lastAccess: number; dirty: boolean }>;
  readonly maxSize: number;
  readonly hits: number;
  readonly misses: number;
}

export class IOSubsystem {
  private _requests: IORequest[] = [];
  private _drivers: Map<string, DeviceDriver> = new Map();
  private _history: string[] = [];
  private _counter = 0;
  private _dmaChannels: Map<number, DMAChannel> = new Map();
  private _interrupts: Map<number, InterruptController> = new Map();
  private _scheduler: IOScheduler = this._createDefaultScheduler();
  private _raidConfigurations: Map<string, RAIDConfiguration> = new Map();
  private _storagePools: Map<string, StoragePool> = new Map();
  private _cache: FileSystemCache = { blocks: new Map(), maxSize: 1000, hits: 0, misses: 0 };
  private _ioStats: { reads: number; writes: number; bytesRead: number; bytesWritten: number; latency: number[] } = {
    reads: 0, writes: 0, bytesRead: 0, bytesWritten: 0, latency: []
  };

  get requestCount(): number {
    return this._requests.length;
  }

  get driverCount(): number {
    return this._drivers.size;
  }

  get history(): string[] {
    return [...this._history];
  }

  get dmaChannels(): number {
    return this._dmaChannels.size;
  }

  get interruptCount(): number {
    return this._interrupts.size;
  }

  get cacheHitRate(): number {
    const total = this._cache.hits + this._cache.misses;
    return total > 0 ? (this._cache.hits / total) * 100 : 0;
  }

  public blockIO(device: string, sector: number, buffer: string, operation: 'read' | 'write'): { device: string; sector: number; size: number; operation: string; requestId: string; status: string } {
    const requestId = `req-${this._counter++}`;
    const request: IORequest = {
      id: requestId,
      device,
      operation,
      buffer,
      size: buffer.length,
      status: 'in-progress',
      priority: 1,
      timestamp: Date.now(),
    };
    this._requests.push(request);
    
    if (operation === 'read') {
      this._ioStats.reads++;
      this._ioStats.bytesRead += buffer.length;
    } else {
      this._ioStats.writes++;
      this._ioStats.bytesWritten += buffer.length;
    }
    
    request.status = 'completed';
    this._recordHistory(`blockIO(device=${device}, sector=${sector}, op=${operation}, req=${requestId})`);
    return { device, sector, size: buffer.length, operation, requestId, status: 'completed' };
  }

  public characterIO(device: string, buffer: string, operation: 'read' | 'write'): { device: string; chars: number; operation: string; requestId: string; success: boolean } {
    const requestId = `req-${this._counter++}`;
    const request: IORequest = {
      id: requestId,
      device,
      operation,
      buffer,
      size: buffer.length,
      status: 'in-progress',
      priority: 2,
      timestamp: Date.now(),
    };
    this._requests.push(request);
    
    if (operation === 'read') {
      this._ioStats.reads++;
      this._ioStats.bytesRead += buffer.length;
    } else {
      this._ioStats.writes++;
      this._ioStats.bytesWritten += buffer.length;
    }
    
    request.status = 'completed';
    this._recordHistory(`characterIO(device=${device}, op=${operation}, chars=${buffer.length}, req=${requestId})`);
    return { device, chars: buffer.length, operation, requestId, success: true };
  }

  public bufferedIO(data: string, bufferSize: number, operation: 'read' | 'write'): { data: string; bufferSize: number; transferred: number; operation: string; chunks: number; latency: number } {
    const chunks = Math.ceil(data.length / bufferSize);
    const transferred = data.length;
    const latency = chunks * 10;
    
    if (operation === 'read') {
      this._ioStats.reads += chunks;
      this._ioStats.bytesRead += transferred;
    } else {
      this._ioStats.writes += chunks;
      this._ioStats.bytesWritten += transferred;
    }
    
    this._recordHistory(`bufferedIO(buffer=${bufferSize}, op=${operation}, chunks=${chunks}) -> transferred=${transferred}`);
    return { data, bufferSize, transferred, operation, chunks, latency };
  }

  public unbufferedIO(data: string, operation: 'read' | 'write'): { data: string; transferred: number; direct: boolean; operation: string; latency: number; success: boolean } {
    const latency = data.length * 2;
    
    if (operation === 'read') {
      this._ioStats.reads++;
      this._ioStats.bytesRead += data.length;
    } else {
      this._ioStats.writes++;
      this._ioStats.bytesWritten += data.length;
    }
    
    this._recordHistory(`unbufferedIO(op=${operation}, size=${data.length}) -> latency=${latency}`);
    return { data, transferred: data.length, direct: true, operation, latency, success: true };
  }

  public dmaTransfer(channel: number, source: string, dest: string, size: number): { channel: number; transferred: number; source: string; dest: string; status: string; latency: number } {
    const dmaChannel: DMAChannel = {
      channel,
      status: 'transferring',
      source,
      destination: dest,
      size,
      progress: 0,
    };
    this._dmaChannels.set(channel, dmaChannel);
    
    for (let i = 0; i <= 100; i += 25) {
      dmaChannel.progress = i;
    }
    
    dmaChannel.status = 'idle';
    const latency = Math.floor(size / 1000);
    this._recordHistory(`dmaTransfer(channel=${channel}, size=${size}, source=${source}, dest=${dest}) -> latency=${latency}`);
    return { channel, transferred: size, source, dest, status: 'completed', latency };
  }

  public dmaAllocateChannel(): { channel: number; success: boolean; available: boolean } {
    for (let i = 0; i < 8; i++) {
      if (!this._dmaChannels.has(i) || this._dmaChannels.get(i)?.status === 'idle') {
        this._dmaChannels.set(i, { channel: i, status: 'idle', source: '', destination: '', size: 0, progress: 0 });
        this._recordHistory(`dmaAllocateChannel() -> channel=${i}`);
        return { channel: i, success: true, available: true };
      }
    }
    this._recordHistory(`dmaAllocateChannel() -> no channels available`);
    return { channel: -1, success: false, available: false };
  }

  public dmaReleaseChannel(channel: number): { channel: number; released: boolean; success: boolean } {
    const released = this._dmaChannels.has(channel);
    if (released) {
      this._dmaChannels.set(channel, { channel, status: 'idle', source: '', destination: '', size: 0, progress: 0 });
    }
    this._recordHistory(`dmaReleaseChannel(channel=${channel}) -> ${released}`);
    return { channel, released, success: released };
  }

  public interruptDrivenIO(device: string, handler: string, irq: number): { device: string; handler: string; interrupts: number; latency: number; irq: number; registered: boolean } {
    const interrupt: InterruptController = {
      irq,
      handler,
      device,
      enabled: true,
      priority: 1,
      pending: false,
    };
    this._interrupts.set(irq, interrupt);
    
    const interrupts = Math.floor(Math.random() * 100) + 10;
    const latency = Math.floor(Math.random() * 5) + 1;
    
    this._recordHistory(`interruptDrivenIO(device=${device}, handler=${handler}, irq=${irq}) -> interrupts=${interrupts}`);
    return { device, handler, interrupts, latency, irq, registered: true };
  }

  public registerInterrupt(irq: number, handler: string, device: string, priority: number): { registered: boolean; irq: number; handler: string; priority: number } {
    const interrupt: InterruptController = {
      irq,
      handler,
      device,
      enabled: true,
      priority,
      pending: false,
    };
    this._interrupts.set(irq, interrupt);
    this._recordHistory(`registerInterrupt(irq=${irq}, handler=${handler}, priority=${priority})`);
    return { registered: true, irq, handler, priority };
  }

  public unregisterInterrupt(irq: number): { unregistered: boolean; irq: number; success: boolean } {
    const unregistered = this._interrupts.delete(irq);
    this._recordHistory(`unregisterInterrupt(irq=${irq}) -> ${unregistered}`);
    return { unregistered, irq, success: unregistered };
  }

  public enableInterrupt(irq: number): { enabled: boolean; irq: number; success: boolean } {
    const interrupt = this._interrupts.get(irq);
    const enabled = !!interrupt;
    if (enabled) {
      interrupt.enabled = true;
    }
    this._recordHistory(`enableInterrupt(irq=${irq}) -> ${enabled}`);
    return { enabled, irq, success: enabled };
  }

  public disableInterrupt(irq: number): { disabled: boolean; irq: number; success: boolean } {
    const interrupt = this._interrupts.get(irq);
    const disabled = !!interrupt;
    if (disabled) {
      interrupt.enabled = false;
    }
    this._recordHistory(`disableInterrupt(irq=${irq}) -> ${disabled}`);
    return { disabled, irq, success: disabled };
  }

  public pollingIO(device: string, data: string): { device: string; data: string; polls: number; overhead: number; latency: number } {
    const polls = Math.floor(data.length / 10) + 1;
    const overhead = polls * 0.1;
    const latency = polls * 5;
    this._recordHistory(`pollingIO(device=${device}, polls=${polls}) -> overhead=${overhead}`);
    return { device, data, polls, overhead, latency };
  }

  public diskScheduling(queue: number[], algorithm: string, head: number): { schedule: number[]; totalSeek: number; algorithm: string; rotations: number; latency: number } {
    let totalSeek = 0;
    let current = head;
    const schedule = [...queue];
    const rotations = Math.floor(schedule.length / 2);
    
    for (const pos of schedule) {
      totalSeek += Math.abs(pos - current);
      current = pos;
    }
    
    const latency = totalSeek * 2;
    this._recordHistory(`diskScheduling(queue=${queue.length}, algo=${algorithm}) -> seek=${totalSeek}`);
    return { schedule, totalSeek, algorithm, rotations, latency };
  }

  public fcfsDisk(queue: number[], head: number): { schedule: number[]; totalSeek: number; algorithm: string; fairness: number } {
    const result = this.diskScheduling(queue, 'FCFS', head);
    const fairness = 1.0;
    this._recordHistory(`fcfsDisk(queue=${queue.length}) -> seek=${result.totalSeek}`);
    return { schedule: result.schedule, totalSeek: result.totalSeek, algorithm: 'FCFS', fairness };
  }

  public sstfDisk(queue: number[], head: number): { schedule: number[]; totalSeek: number; algorithm: string; optimal: boolean } {
    const sorted = [...queue].sort((a, b) => Math.abs(a - head) - Math.abs(b - head));
    let totalSeek = 0;
    let current = head;
    
    for (const pos of sorted) {
      totalSeek += Math.abs(pos - current);
      current = pos;
    }
    
    this._recordHistory(`sstfDisk(queue=${queue.length}) -> seek=${totalSeek}`);
    return { schedule: sorted, totalSeek, algorithm: 'SSTF', optimal: false };
  }

  public scanDisk(queue: number[], head: number, direction: 'left' | 'right'): { schedule: number[]; totalSeek: number; direction: string; algorithm: string; passes: number } {
    const sorted = [...queue].sort((a, b) => a - b);
    const left = sorted.filter(x => x <= head).reverse();
    const right = sorted.filter(x => x > head);
    const schedule = direction === 'right' ? [...right, ...left.reverse()] : [...left, ...right];
    let totalSeek = 0;
    let current = head;
    
    for (const pos of schedule) {
      totalSeek += Math.abs(pos - current);
      current = pos;
    }
    
    const passes = 1;
    this._recordHistory(`scanDisk(queue=${queue.length}, dir=${direction}) -> seek=${totalSeek}`);
    return { schedule, totalSeek, direction, algorithm: 'SCAN', passes };
  }

  public cscanDisk(queue: number[], head: number, direction: 'left' | 'right'): { schedule: number[]; totalSeek: number; direction: string; algorithm: string; wrapAround: boolean } {
    const sorted = [...queue].sort((a, b) => a - b);
    const right = sorted.filter(x => x > head);
    const left = sorted.filter(x => x <= head);
    const schedule = direction === 'right' ? [...right, ...left] : [...left.reverse(), ...right.reverse()];
    let totalSeek = 0;
    let current = head;
    
    for (const pos of schedule) {
      totalSeek += Math.abs(pos - current);
      current = pos;
    }
    
    this._recordHistory(`cscanDisk(queue=${queue.length}, dir=${direction}) -> seek=${totalSeek}`);
    return { schedule, totalSeek, direction, algorithm: 'C-SCAN', wrapAround: true };
  }

  public lookDisk(queue: number[], head: number, direction: 'left' | 'right'): { schedule: number[]; totalSeek: number; direction: string; algorithm: string; efficiency: number } {
    const result = this.scanDisk(queue, head, direction);
    const efficiency = 0.95;
    this._recordHistory(`lookDisk(queue=${queue.length}) -> seek=${result.totalSeek * efficiency}`);
    return { schedule: result.schedule, totalSeek: result.totalSeek * efficiency, direction, algorithm: 'LOOK', efficiency };
  }

  public clookDisk(queue: number[], head: number, direction: 'left' | 'right'): { schedule: number[]; totalSeek: number; direction: string; algorithm: string; efficiency: number } {
    const result = this.cscanDisk(queue, head, direction);
    const efficiency = 0.92;
    this._recordHistory(`clookDisk(queue=${queue.length}) -> seek=${result.totalSeek * efficiency}`);
    return { schedule: result.schedule, totalSeek: result.totalSeek * efficiency, direction, algorithm: 'C-LOOK', efficiency };
  }

  public elevatorAlgorithm(queue: number[], head: number, direction: 'up' | 'down'): { schedule: number[]; totalSeek: number; direction: string; algorithm: string; passes: number } {
    const result = this.scanDisk(queue, head, direction === 'up' ? 'right' : 'left');
    this._recordHistory(`elevatorAlgorithm(queue=${queue.length}, dir=${direction})`);
    return { schedule: result.schedule, totalSeek: result.totalSeek, direction, algorithm: 'Elevator', passes: result.passes };
  }

  public raidLevel(type: string, disks: number): { level: string; disks: number; capacity: number; redundancy: number; performance: number; parityDisks: number } {
    const capacityMap: Record<string, number> = { '0': 1, '1': 0.5, '5': (disks - 1) / disks, '6': (disks - 2) / disks, '10': 0.5 };
    const capacity = capacityMap[type] ?? 1;
    const redundancy = type === '0' ? 0 : type === '1' ? 1 : type === '5' ? 1 : type === '6' ? 2 : 1;
    const performance = type === '0' ? disks : type === '1' ? 1 : type === '5' ? disks - 1 : type === '6' ? disks - 2 : disks;
    const parityDisks = redundancy;
    
    this._recordHistory(`raidLevel(type=${type}, disks=${disks}) -> capacity=${(capacity * 100).toFixed(0)}%`);
    return { level: type, disks, capacity, redundancy, performance, parityDisks };
  }

  public createRAID(name: string, level: string, disks: string[], stripeSize: number): { name: string; configured: boolean; level: string; disks: string[]; status: string } {
    const parityScheme = level === '5' ? 'left-symmetric' : level === '6' ? 'left-asymmetric' : 'left-symmetric';
    const raidConfig: RAIDConfiguration = {
      level,
      disks,
      stripeSize,
      parityScheme,
      status: 'optimal',
    };
    this._raidConfigurations.set(name, raidConfig);
    this._recordHistory(`createRAID(name=${name}, level=${level}, disks=${disks.length})`);
    return { name, configured: true, level, disks, status: 'optimal' };
  }

  public getRAIDStatus(name: string): { name: string; status: string; level: string; disks: string[]; degradedDisks: number } {
    const config = this._raidConfigurations.get(name);
    const degradedDisks = config?.status === 'degraded' ? 1 : 0;
    this._recordHistory(`getRAIDStatus(name=${name}) -> ${config?.status ?? 'not found'}`);
    return { name, status: config?.status ?? 'not found', level: config?.level ?? '', disks: config?.disks ?? [], degradedDisks };
  }

  public addDiskToRAID(name: string, disk: string): { name: string; added: boolean; disk: string; totalDisks: number } {
    const config = this._raidConfigurations.get(name);
    const added = !!config;
    if (added && config) {
      config.disks.push(disk);
      config.status = 'optimal';
    }
    this._recordHistory(`addDiskToRAID(name=${name}, disk=${disk}) -> ${added}`);
    return { name, added, disk, totalDisks: config?.disks.length ?? 0 };
  }

  public removeDiskFromRAID(name: string, disk: string): { name: string; removed: boolean; disk: string; status: string; totalDisks: number } {
    const config = this._raidConfigurations.get(name);
    const removed = !!config;
    if (removed && config) {
      const idx = config.disks.indexOf(disk);
      if (idx >= 0) {
        config.disks.splice(idx, 1);
        if (config.disks.length < (parseInt(config.level) === 1 ? 2 : 3)) {
          config.status = 'degraded';
        }
      }
    }
    this._recordHistory(`removeDiskFromRAID(name=${name}, disk=${disk}) -> ${removed}`);
    return { name, removed, disk, status: config?.status ?? '', totalDisks: config?.disks.length ?? 0 };
  }

  public createStoragePool(name: string, disks: string[], redundancy: string): { name: string; created: boolean; totalCapacity: number; redundancy: string; status: string } {
    const totalCapacity = disks.length * 1000;
    const pool: StoragePool = {
      name,
      disks,
      totalCapacity,
      usedCapacity: 0,
      redundancy,
      status: 'online',
    };
    this._storagePools.set(name, pool);
    this._recordHistory(`createStoragePool(name=${name}, disks=${disks.length}, redundancy=${redundancy})`);
    return { name, created: true, totalCapacity, redundancy, status: 'online' };
  }

  public getStoragePoolStats(name: string): { name: string; totalCapacity: number; usedCapacity: number; freeCapacity: number; usagePercent: number; status: string } {
    const pool = this._storagePools.get(name);
    const usagePercent = pool ? (pool.usedCapacity / pool.totalCapacity) * 100 : 0;
    this._recordHistory(`getStoragePoolStats(name=${name}) -> ${usagePercent.toFixed(1)}%`);
    return {
      name,
      totalCapacity: pool?.totalCapacity ?? 0,
      usedCapacity: pool?.usedCapacity ?? 0,
      freeCapacity: pool ? pool.totalCapacity - pool.usedCapacity : 0,
      usagePercent,
      status: pool?.status ?? 'not found',
    };
  }

  public allocateStoragePool(name: string, size: number): { name: string; allocated: boolean; size: number; remaining: number; success: boolean } {
    const pool = this._storagePools.get(name);
    const allocated = !!pool && pool.usedCapacity + size <= pool.totalCapacity;
    if (allocated && pool) {
      pool.usedCapacity += size;
    }
    this._recordHistory(`allocateStoragePool(name=${name}, size=${size}) -> ${allocated}`);
    return { name, allocated, size, remaining: pool ? pool.totalCapacity - pool.usedCapacity : 0, success: allocated };
  }

  public deallocateStoragePool(name: string, size: number): { name: string; deallocated: boolean; size: number; remaining: number; success: boolean } {
    const pool = this._storagePools.get(name);
    const deallocated = !!pool && pool.usedCapacity >= size;
    if (deallocated && pool) {
      pool.usedCapacity -= size;
    }
    this._recordHistory(`deallocateStoragePool(name=${name}, size=${size}) -> ${deallocated}`);
    return { name, deallocated, size, remaining: pool ? pool.totalCapacity - pool.usedCapacity : 0, success: deallocated };
  }

  public cacheRead(block: number): { hit: boolean; data: string; block: number; latency: number } {
    const entry = this._cache.blocks.get(block);
    const hit = !!entry;
    
    if (hit) {
      this._cache.hits++;
      entry.lastAccess = Date.now();
    } else {
      this._cache.misses++;
      this._cache.blocks.set(block, { data: 'block data', lastAccess: Date.now(), dirty: false });
    }
    
    this._manageCacheSize();
    const latency = hit ? 1 : 100;
    this._recordHistory(`cacheRead(block=${block}) -> hit=${hit}, latency=${latency}`);
    return { hit, data: hit ? entry.data : 'block data', block, latency };
  }

  public cacheWrite(block: number, data: string): { written: boolean; block: number; dirty: boolean; success: boolean } {
    this._cache.blocks.set(block, { data, lastAccess: Date.now(), dirty: true });
    this._manageCacheSize();
    this._recordHistory(`cacheWrite(block=${block}) -> dirty=true`);
    return { written: true, block, dirty: true, success: true };
  }

  public cacheFlush(): { flushed: number; dirtyBlocks: number; success: boolean } {
    let flushed = 0;
    for (const [block, entry] of this._cache.blocks) {
      if (entry.dirty) {
        flushed++;
        entry.dirty = false;
      }
    }
    this._recordHistory(`cacheFlush() -> flushed=${flushed}`);
    return { flushed, dirtyBlocks: flushed, success: true };
  }

  public cacheInvalidate(block: number): { invalidated: boolean; block: number; success: boolean } {
    const invalidated = this._cache.blocks.delete(block);
    this._recordHistory(`cacheInvalidate(block=${block}) -> ${invalidated}`);
    return { invalidated, block, success: invalidated };
  }

  public registerDriver(name: string, type: DeviceDriver['type'], deviceId: string, irq: number, dmaChannel: number): { registered: boolean; name: string; type: string; deviceId: string } {
    const driver: DeviceDriver = {
      name,
      type,
      operations: ['read', 'write'],
      status: 'active',
      deviceId,
      interruptLine: irq,
      dmaChannel,
    };
    this._drivers.set(deviceId, driver);
    this._recordHistory(`registerDriver(name=${name}, type=${type}, device=${deviceId})`);
    return { registered: true, name, type, deviceId };
  }

  public unregisterDriver(deviceId: string): { unregistered: boolean; deviceId: string; name: string } {
    const driver = this._drivers.get(deviceId);
    const unregistered = !!driver;
    if (unregistered) {
      this._drivers.delete(deviceId);
    }
    this._recordHistory(`unregisterDriver(device=${deviceId}) -> ${unregistered}`);
    return { unregistered, deviceId, name: driver?.name ?? '' };
  }

  public getDriverStatus(deviceId: string): { deviceId: string; status: string; type: string; name: string; irq: number } {
    const driver = this._drivers.get(deviceId);
    this._recordHistory(`getDriverStatus(device=${deviceId}) -> ${driver?.status ?? 'not found'}`);
    return {
      deviceId,
      status: driver?.status ?? 'not found',
      type: driver?.type ?? '',
      name: driver?.name ?? '',
      irq: driver?.interruptLine ?? -1,
    };
  }

  public suspendDriver(deviceId: string): { suspended: boolean; deviceId: string; previousStatus: string } {
    const driver = this._drivers.get(deviceId);
    const suspended = !!driver;
    const previousStatus = driver?.status ?? '';
    if (suspended && driver) {
      driver.status = 'disabled';
    }
    this._recordHistory(`suspendDriver(device=${deviceId}) -> ${suspended}`);
    return { suspended, deviceId, previousStatus };
  }

  public resumeDriver(deviceId: string): { resumed: boolean; deviceId: string; currentStatus: string } {
    const driver = this._drivers.get(deviceId);
    const resumed = !!driver;
    if (resumed && driver) {
      driver.status = 'active';
    }
    this._recordHistory(`resumeDriver(device=${deviceId}) -> ${resumed}`);
    return { resumed, deviceId, currentStatus: driver?.status ?? '' };
  }

  public getIOStats(): { reads: number; writes: number; bytesRead: number; bytesWritten: number; avgLatency: number; throughput: number; cacheHitRate: number } {
    const avgLatency = this._ioStats.latency.length > 0
      ? this._ioStats.latency.reduce((a, b) => a + b, 0) / this._ioStats.latency.length
      : 0;
    const throughput = (this._ioStats.bytesRead + this._ioStats.bytesWritten) / Math.max(1, this._ioStats.reads + this._ioStats.writes);
    
    this._recordHistory(`getIOStats()`);
    return {
      reads: this._ioStats.reads,
      writes: this._ioStats.writes,
      bytesRead: this._ioStats.bytesRead,
      bytesWritten: this._ioStats.bytesWritten,
      avgLatency,
      throughput,
      cacheHitRate: this.cacheHitRate,
    };
  }

  public resetIOStats(): { reset: boolean; previous: typeof this._ioStats } {
    const previous = { ...this._ioStats };
    this._ioStats = { reads: 0, writes: 0, bytesRead: 0, bytesWritten: 0, latency: [] };
    this._recordHistory(`resetIOStats()`);
    return { reset: true, previous };
  }

  public asyncIO(device: string, operation: 'read' | 'write', buffer: string, callback: (result: { success: boolean; bytes: number }) => void): { requestId: string; async: boolean; device: string; operation: string } {
    const requestId = `async-req-${this._counter++}`;
    setTimeout(() => {
      callback({ success: true, bytes: buffer.length });
    }, 100);
    this._recordHistory(`asyncIO(device=${device}, op=${operation}, req=${requestId})`);
    return { requestId, async: true, device, operation };
  }

  public syncIO(device: string, operation: 'read' | 'write', buffer: string): { success: boolean; bytes: number; device: string; operation: string; latency: number } {
    const latency = buffer.length * 2;
    this._recordHistory(`syncIO(device=${device}, op=${operation}, size=${buffer.length}) -> latency=${latency}`);
    return { success: true, bytes: buffer.length, device, operation, latency };
  }

  public ioStatsReport(): {
    totalRequests: number;
    reads: number;
    writes: number;
    bytesRead: number;
    bytesWritten: number;
    avgLatency: number;
    maxLatency: number;
    minLatency: number;
    p99Latency: number;
    throughputMBps: number;
  } {
    const latencies = this._ioStats.latency.slice().sort((a, b) => a - b);
    const total = this._ioStats.reads + this._ioStats.writes;
    const avgLatency = latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;
    const p99Idx = Math.floor(latencies.length * 0.99);
    const totalBytes = this._ioStats.bytesRead + this._ioStats.bytesWritten;
    return {
      totalRequests: total,
      reads: this._ioStats.reads,
      writes: this._ioStats.writes,
      bytesRead: this._ioStats.bytesRead,
      bytesWritten: this._ioStats.bytesWritten,
      avgLatency,
      maxLatency: latencies.length > 0 ? latencies[latencies.length - 1] : 0,
      minLatency: latencies.length > 0 ? latencies[0] : 0,
      p99Latency: latencies.length > 0 ? latencies[p99Idx] ?? 0 : 0,
      throughputMBps: Math.round(totalBytes / 1024 / 1024),
    };
  }

  public driverHealthReport(): { device: string; driver: string; healthy: boolean; issues: string[] }[] {
    const report: { device: string; driver: string; healthy: boolean; issues: string[] }[] = [];
    for (const [device, driver] of this._drivers.entries()) {
      const issues: string[] = [];
      if (driver.status === 'error') issues.push('driver in error state');
      if (driver.status === 'disabled') issues.push('driver disabled');
      report.push({
        device,
        driver: driver.name,
        healthy: issues.length === 0,
        issues,
      });
    }
    return report;
  }

  public cacheStatistics(): { hits: number; misses: number; hitRate: number; size: number; maxSize: number; evictions: number } {
    const total = this._cache.hits + this._cache.misses;
    return {
      hits: this._cache.hits,
      misses: this._cache.misses,
      hitRate: total > 0 ? Math.round((this._cache.hits / total) * 10000) / 100 : 0,
      size: this._cache.blocks.size,
      maxSize: this._cache.maxSize,
      evictions: 0,
    };
  }

  public flushCache(): { blocksFlushed: number; dirtyBlocks: number } {
    const blocks = this._cache.blocks.size;
    let dirtyBlocks = 0;
    for (const block of this._cache.blocks.values()) {
      if (block.dirty) dirtyBlocks++;
    }
    this._cache.blocks.clear();
    this._recordHistory(`flushCache() -> ${blocks} blocks, ${dirtyBlocks} dirty`);
    return { blocksFlushed: blocks, dirtyBlocks };
  }

  public resizeCache(newSize: number): { oldSize: number; newSize: number; blocksEvicted: number } {
    const oldSize = this._cache.maxSize;
    this._cache.maxSize = newSize;
    let evicted = 0;
    while (this._cache.blocks.size > newSize) {
      this._manageCacheSize();
      evicted++;
    }
    this._recordHistory(`resizeCache(${newSize}) -> evicted ${evicted} blocks`);
    return { oldSize, newSize, blocksEvicted: evicted };
  }

  public listDMATransfers(): { channel: number; status: string; source: string; destination: string; size: number; progress: number }[] {
    return Array.from(this._dmaChannels.entries()).map(([channel, dma]) => ({
      channel,
      status: dma.status,
      source: dma.source,
      destination: dma.destination,
      size: dma.size,
      progress: dma.progress,
    }));
  }

  public interruptStatistics(): { totalInterrupts: number; byDevice: Record<string, number>; enabledCount: number; pendingCount: number } {
    const byDevice: Record<string, number> = {};
    let total = 0;
    let enabled = 0;
    let pending = 0;
    for (const irq of this._interrupts.values()) {
      byDevice[irq.device] = (byDevice[irq.device] ?? 0) + 1;
      total++;
      if (irq.enabled) enabled++;
      if (irq.pending) pending++;
    }
    return {
      totalInterrupts: total,
      byDevice,
      enabledCount: enabled,
      pendingCount: pending,
    };
  }

  public raidStatus(): { configId: string; level: string; disks: number; healthy: boolean; status: string }[] {
    return Array.from(this._raidConfigurations.entries()).map(([id, raid]) => ({
      configId: id,
      level: raid.level,
      disks: raid.disks.length,
      healthy: raid.status === 'optimal',
      status: raid.status,
    }));
  }

  public storagePoolStatus(): { poolId: string; name: string; totalCapacity: number; usedCapacity: number; freeCapacity: number; utilization: number; status: string }[] {
    return Array.from(this._storagePools.entries()).map(([id, pool]) => ({
      poolId: id,
      name: pool.name,
      totalCapacity: pool.totalCapacity,
      usedCapacity: pool.usedCapacity,
      freeCapacity: pool.totalCapacity - pool.usedCapacity,
      utilization: pool.totalCapacity > 0 ? Math.round((pool.usedCapacity / pool.totalCapacity) * 100) : 0,
      status: pool.status,
    }));
  }

  public toPacket(): DataPacket<{
    requests: number;
    drivers: number;
    dmaChannels: number;
    interrupts: number;
    cacheHitRate: number;
    history: string[];
    ioStats: typeof this._ioStats;
  }> {
    return {
      id: `io-subsystem-${Date.now()}-${this._counter}`,
      payload: {
        requests: this._requests.length,
        drivers: this._drivers.size,
        dmaChannels: this._dmaChannels.size,
        interrupts: this._interrupts.size,
        cacheHitRate: this.cacheHitRate,
        history: [...this._history],
        ioStats: { ...this._ioStats },
      },
      metadata: {
        createdAt: Date.now(),
        route: ['os', 'io', 'result'],
        priority: 0.7,
        phase: 'transfer',
      },
    };
  }

  public reset(): void {
    this._requests = [];
    this._drivers.clear();
    this._history = [];
    this._counter = 0;
    this._dmaChannels.clear();
    this._interrupts.clear();
    this._scheduler = this._createDefaultScheduler();
    this._raidConfigurations.clear();
    this._storagePools.clear();
    this._cache = { blocks: new Map(), maxSize: 1000, hits: 0, misses: 0 };
    this._ioStats = { reads: 0, writes: 0, bytesRead: 0, bytesWritten: 0, latency: [] };
  }

  private _recordHistory(entry: string): void {
    this._counter++;
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
  }

  private _createDefaultScheduler(): IOScheduler {
    return {
      algorithm: 'elevator',
      queue: [],
      activeRequests: 0,
      completedRequests: 0,
      pendingRequests: 0,
    };
  }

  private _manageCacheSize(): void {
    while (this._cache.blocks.size > this._cache.maxSize) {
      let oldestBlock = -1;
      let oldestTime = Infinity;
      for (const [block, entry] of this._cache.blocks) {
        if (entry.lastAccess < oldestTime) {
          oldestTime = entry.lastAccess;
          oldestBlock = block;
        }
      }
      if (oldestBlock >= 0) {
        this._cache.blocks.delete(oldestBlock);
      }
    }
  }
}