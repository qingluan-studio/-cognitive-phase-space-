import { DataPacket } from '../shared/types';

export interface KernelInfo {
  readonly type: 'monolithic' | 'microkernel' | 'hybrid' | 'exokernel' | 'nanokernel';
  readonly modules: string[];
  readonly syscalls: number;
  readonly privileges: string[];
}

export interface SystemCall {
  readonly name: string;
  readonly number: number;
  readonly args: number;
  readonly returns: string;
}

export class KernelArchitecture {
  private _kernel: KernelInfo | null = null;
  private _syscalls: Map<string, SystemCall> = new Map();
  private _modules: string[] = [];
  private _history: string[] = [];
  private _counter = 0;

  get kernelType(): string {
    return this._kernel?.type ?? 'none';
  }

  get syscallCount(): number {
    return this._syscalls.size;
  }

  get moduleCount(): number {
    return this._modules.length;
  }

  get history(): string[] {
    return [...this._history];
  }

  public monolithicKernel(services: string[]): { type: string; services: number; performance: number; size: string } {
    this._kernel = { type: 'monolithic', modules: services, syscalls: services.length, privileges: ['ring0', 'ring3'] };
    this._modules = services;
    this._recordHistory(`monolithicKernel(services=${services.length})`);
    return { type: 'monolithic', services: services.length, performance: 0.95, size: 'large' };
  }

  public microkernel(services: string[], servers: string[]): { type: string; services: number; servers: number; performance: number } {
    this._kernel = { type: 'microkernel', modules: services, syscalls: services.length / 2, privileges: ['ring0', 'ring3'] };
    this._modules = services;
    this._recordHistory(`microkernel(services=${services.length}, servers=${servers.length})`);
    return { type: 'microkernel', services: services.length, servers: servers.length, performance: 0.7 };
  }

  public exokernel(libOSes: string[]): { type: string; libOSes: number; flexibility: number; overhead: number } {
    this._kernel = { type: 'exokernel', modules: libOSes, syscalls: 10, privileges: ['ring0'] };
    this._modules = libOSes;
    this._recordHistory(`exokernel(libOSes=${libOSes.length})`);
    return { type: 'exokernel', libOSes: libOSes.length, flexibility: 0.95, overhead: 0.1 };
  }

  public nanokernel(abstraction: string): { type: string; abstraction: string; minimal: boolean; size: string } {
    this._kernel = { type: 'nanokernel', modules: [abstraction], syscalls: 5, privileges: ['ring0'] };
    this._recordHistory(`nanokernel(abstraction=${abstraction})`);
    return { type: 'nanokernel', abstraction, minimal: true, size: 'tiny' };
  }

  public hybridKernel(monolithic: string[], micro: string[]): { type: string; monolithic: number; micro: number; performance: number } {
    const all = [...monolithic, ...micro];
    this._kernel = { type: 'hybrid', modules: all, syscalls: all.length, privileges: ['ring0', 'ring3'] };
    this._modules = all;
    this._recordHistory(`hybridKernel(monolithic=${monolithic.length}, micro=${micro.length})`);
    return { type: 'hybrid', monolithic: monolithic.length, micro: micro.length, performance: 0.85 };
  }

  public systemCall(name: string, args: unknown[], process: number): { name: string; result: unknown; process: number; ring: number } {
    const syscall: SystemCall = { name, number: this._syscalls.size, args: args.length, returns: 'number' };
    this._syscalls.set(name, syscall);
    this._recordHistory(`syscall(name=${name}, args=${args.length}, process=${process})`);
    return { name, result: 0, process, ring: 0 };
  }

  public syscallTable(calls: string[]): { table: Map<string, number>; count: number; entry: string } {
    const table = new Map<string, number>();
    calls.forEach((call, idx) => {
      table.set(call, idx);
      this._syscalls.set(call, { name: call, number: idx, args: 0, returns: 'void' });
    });
    this._recordHistory(`syscallTable(calls=${calls.length})`);
    return { table, count: calls.length, entry: 'syscall_handler' };
  }

  public interruptHandler(irq: number, routine: string): { irq: number; routine: string; registered: boolean; priority: number } {
    this._recordHistory(`interruptHandler(irq=${irq}, routine=${routine})`);
    return { irq, routine, registered: true, priority: irq };
  }

  public trapGate(trap: number, handler: string): { trap: number; handler: string; privilege: number } {
    const privilege = trap < 32 ? 0 : 3;
    this._recordHistory(`trapGate(trap=${trap}, handler=${handler})`);
    return { trap, handler, privilege };
  }

  public privilegeLevel(level: number, ring: string): { level: number; ring: string; permissions: string[] } {
    const permissions: Record<number, string[]> = {
      0: ['all'],
      1: ['io', 'memory'],
      2: ['io'],
      3: ['user'],
    };
    this._recordHistory(`privilegeLevel(level=${level}, ring=${ring})`);
    return { level, ring, permissions: permissions[level] ?? [] };
  }

  public kernelMode(userMode: () => void): { mode: string; privileged: boolean; switched: boolean } {
    this._recordHistory(`kernelMode()`);
    return { mode: 'kernel', privileged: true, switched: true };
  }

  public userModeSwitch(): { mode: string; unprivileged: boolean; switched: boolean } {
    this._recordHistory(`userModeSwitch()`);
    return { mode: 'user', unprivileged: true, switched: true };
  }

  public contextSwitch(): { saved: boolean; restored: boolean; cycles: number } {
    const cycles = 100 + Math.floor(Math.random() * 200);
    this._recordHistory(`contextSwitch(cycles=${cycles})`);
    return { saved: true, restored: true, cycles };
  }

  public kernelThread(name: string, func: () => void): { id: number; name: string; kernel: boolean; priority: number } {
    const id = this._counter;
    this._recordHistory(`kernelThread(name=${name})`);
    return { id, name, kernel: true, priority: 0 };
  }

  public moduleLoading(module: string, kernel: string): { module: string; loaded: boolean; kernel: string; symbols: number } {
    if (!this._modules.includes(module)) {
      this._modules.push(module);
    }
    const symbols = Math.floor(Math.random() * 100) + 10;
    this._recordHistory(`moduleLoading(module=${module}) -> loaded`);
    return { module, loaded: true, kernel, symbols };
  }

  public toPacket(): DataPacket<{
    kernelType: string;
    syscalls: number;
    modules: number;
    history: string[];
  }> {
    return {
      id: `kernel-arch-${Date.now()}-${this._counter}`,
      payload: {
        kernelType: this._kernel?.type ?? 'none',
        syscalls: this._syscalls.size,
        modules: this._modules.length,
        history: [...this._history],
      },
      metadata: {
        createdAt: Date.now(),
        route: ['os', 'kernel', 'result'],
        priority: 0.8,
        phase: 'execution',
      },
    };
  }

  public reset(): void {
    this._kernel = null;
    this._syscalls.clear();
    this._modules = [];
    this._history = [];
    this._counter = 0;
  }

  private _recordHistory(entry: string): void {
    this._counter++;
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
  }
}
