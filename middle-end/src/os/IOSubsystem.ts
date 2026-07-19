import { DataPacket } from '../shared/types';

export interface IORequest {
  readonly device: string;
  readonly operation: 'read' | 'write';
  readonly buffer: string;
  readonly size: number;
  readonly status: 'pending' | 'in-progress' | 'completed' | 'failed';
}

export interface DeviceDriver {
  readonly name: string;
  readonly type: 'block' | 'character' | 'network' | 'usb';
  readonly operations: string[];
  readonly status: 'active' | 'idle' | 'error';
}

export class IOSubsystem {
  private _requests: IORequest[] = [];
  private _drivers: Map<string, DeviceDriver> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get requestCount(): number {
    return this._requests.length;
  }

  get driverCount(): number {
    return this._drivers.size;
  }

  get history(): string[] {
    return [...this._history];
  }

  public blockIO(device: string, sector: number, buffer: string, operation: 'read' | 'write'): { device: string; sector: number; size: number; operation: string } {
    this._requests.push({ device, operation, buffer, size: buffer.length, status: 'completed' });
    this._recordHistory(`blockIO(device=${device}, sector=${sector}, op=${operation})`);
    return { device, sector, size: buffer.length, operation };
  }

  public characterIO(device: string, buffer: string, operation: 'read' | 'write'): { device: string; chars: number; operation: string } {
    this._requests.push({ device, operation, buffer, size: buffer.length, status: 'completed' });
    this._recordHistory(`characterIO(device=${device}, op=${operation}, chars=${buffer.length})`);
    return { device, chars: buffer.length, operation };
  }

  public bufferedIO(data: string, buffer: number, operation: 'read' | 'write'): { data: string; bufferSize: number; transferred: number; operation: string } {
    const transferred = Math.min(buffer, data.length);
    this._recordHistory(`bufferedIO(buffer=${buffer}, op=${operation}) -> transferred=${transferred}`);
    return { data, bufferSize: buffer, transferred, operation };
  }

  public unbufferedIO(data: string, operation: 'read' | 'write'): { data: string; transferred: number; direct: boolean; operation: string } {
    this._recordHistory(`unbufferedIO(op=${operation}, size=${data.length})`);
    return { data, transferred: data.length, direct: true, operation };
  }

  public dmaTransfer(channel: number, source: string, dest: string, size: number): { channel: number; transferred: number; source: string; dest: string } {
    this._recordHistory(`dmaTransfer(channel=${channel}, size=${size})`);
    return { channel, transferred: size, source, dest };
  }

  public interruptDrivenIO(device: string, handler: string): { device: string; handler: string; interrupts: number; latency: number } {
    const interrupts = Math.floor(Math.random() * 100) + 10;
    const latency = Math.floor(Math.random() * 5) + 1;
    this._recordHistory(`interruptDrivenIO(device=${device}, handler=${handler})`);
    return { device, handler, interrupts, latency };
  }

  public pollingIO(device: string, data: string): { device: string; data: string; polls: number; overhead: number } {
    const polls = Math.floor(data.length / 10) + 1;
    const overhead = polls * 0.1;
    this._recordHistory(`pollingIO(device=${device}, polls=${polls})`);
    return { device, data, polls, overhead };
  }

  public diskScheduling(queue: number[], algorithm: string, head: number): { schedule: number[]; totalSeek: number; algorithm: string } {
    let totalSeek = 0;
    let current = head;
    const schedule = [...queue];
    for (const pos of schedule) {
      totalSeek += Math.abs(pos - current);
      current = pos;
    }
    this._recordHistory(`diskScheduling(queue=${queue.length}, algo=${algorithm}) -> seek=${totalSeek}`);
    return { schedule, totalSeek, algorithm };
  }

  public fcfsDisk(queue: number[], head: number): { schedule: number[]; totalSeek: number } {
    const result = this.diskScheduling(queue, 'FCFS', head);
    this._recordHistory(`fcfsDisk(queue=${queue.length}) -> seek=${result.totalSeek}`);
    return { schedule: result.schedule, totalSeek: result.totalSeek };
  }

  public sstfDisk(queue: number[], head: number): { schedule: number[]; totalSeek: number } {
    const sorted = [...queue].sort((a, b) => Math.abs(a - head) - Math.abs(b - head));
    let totalSeek = 0;
    let current = head;
    for (const pos of sorted) {
      totalSeek += Math.abs(pos - current);
      current = pos;
    }
    this._recordHistory(`sstfDisk(queue=${queue.length}) -> seek=${totalSeek}`);
    return { schedule: sorted, totalSeek };
  }

  public scanDisk(queue: number[], head: number, direction: 'left' | 'right'): { schedule: number[]; totalSeek: number; direction: string } {
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
    this._recordHistory(`scanDisk(queue=${queue.length}, dir=${direction}) -> seek=${totalSeek}`);
    return { schedule, totalSeek, direction };
  }

  public cscanDisk(queue: number[], head: number, direction: 'left' | 'right'): { schedule: number[]; totalSeek: number; direction: string } {
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
    return { schedule, totalSeek, direction };
  }

  public lookDisk(queue: number[], head: number, direction: 'left' | 'right'): { schedule: number[]; totalSeek: number; direction: string } {
    const result = this.scanDisk(queue, head, direction);
    this._recordHistory(`lookDisk(queue=${queue.length})`);
    return { schedule: result.schedule, totalSeek: result.totalSeek * 0.9, direction };
  }

  public clookDisk(queue: number[], head: number, direction: 'left' | 'right'): { schedule: number[]; totalSeek: number; direction: string } {
    const result = this.cscanDisk(queue, head, direction);
    this._recordHistory(`clookDisk(queue=${queue.length})`);
    return { schedule: result.schedule, totalSeek: result.totalSeek * 0.85, direction };
  }

  public raidLevel(type: string, disks: number): { level: string; disks: number; capacity: number; redundancy: number; performance: number } {
    const capacityMap: Record<string, number> = { '0': 1, '1': 0.5, '5': (disks - 1) / disks, '6': (disks - 2) / disks, '10': 0.5 };
    const capacity = capacityMap[type] ?? 1;
    const redundancy = type === '0' ? 0 : type === '1' ? 1 : type === '5' ? 1 : type === '6' ? 2 : 1;
    const performance = type === '0' ? 2 : 1;
    this._recordHistory(`raidLevel(type=${type}, disks=${disks}) -> capacity=${(capacity * 100).toFixed(0)}%`);
    return { level: type, disks, capacity, redundancy, performance };
  }

  public toPacket(): DataPacket<{
    requests: number;
    drivers: number;
    history: string[];
  }> {
    return {
      id: `io-subsystem-${Date.now()}-${this._counter}`,
      payload: {
        requests: this._requests.length,
        drivers: this._drivers.size,
        history: [...this._history],
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
  }

  private _recordHistory(entry: string): void {
    this._counter++;
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
  }
}
