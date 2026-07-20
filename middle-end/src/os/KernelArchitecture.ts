import { DataPacket } from '../shared/types';

export interface KernelInfo {
  readonly type: 'monolithic' | 'microkernel' | 'hybrid' | 'exokernel' | 'nanokernel';
  readonly modules: string[];
  readonly syscalls: number;
  readonly privileges: string[];
  readonly version: string;
  readonly uptime: number;
  readonly architecture: string;
}

export interface SystemCall {
  readonly name: string;
  readonly number: number;
  readonly args: number;
  readonly returns: string;
  readonly description: string;
  readonly privilegeLevel: number;
}

export interface InterruptDescriptor {
  readonly irq: number;
  readonly handler: string;
  readonly priority: number;
  readonly vector: number;
  readonly flags: string[];
}

export interface MemoryRegion {
  readonly start: number;
  readonly end: number;
  readonly type: 'kernel' | 'user' | 'shared' | 'reserved';
  readonly permissions: string;
}

export interface ProcessControlBlock {
  readonly pid: number;
  readonly ppid: number;
  readonly state: string;
  readonly priority: number;
  readonly registers: Record<string, number>;
  readonly memoryMap: MemoryRegion[];
  readonly openFiles: number[];
}

export interface TaskStateSegment {
  readonly selector: number;
  readonly base: number;
  readonly limit: number;
  readonly flags: string;
}

export interface GDTEntry {
  readonly selector: number;
  readonly base: number;
  readonly limit: number;
  readonly access: string;
  readonly granularity: string;
}

export interface IDTEntry {
  readonly vector: number;
  readonly offset: number;
  readonly selector: number;
  readonly flags: string;
}

export interface SecurityModule {
  readonly name: string;
  readonly loaded: boolean;
  readonly hooks: string[];
  readonly policyVersion: string;
}

export interface CPUProfile {
  readonly cycles: number;
  readonly instructions: number;
  readonly cacheMisses: number;
  readonly branchMispredictions: number;
}

export class KernelArchitecture {
  private _kernel: KernelInfo | null = null;
  private _syscalls: Map<string, SystemCall> = new Map();
  private _modules: string[] = [];
  private _history: string[] = [];
  private _counter = 0;
  private _interrupts: Map<number, InterruptDescriptor> = new Map();
  private _memoryRegions: MemoryRegion[] = [];
  private _processTable: Map<number, ProcessControlBlock> = new Map();
  private _gdt: GDTEntry[] = [];
  private _idt: IDTEntry[] = [];
  private _tickCount = 0;
  private _contextSwitchCount = 0;
  private _syscallCount = 0;
  private _securityModules: Map<string, SecurityModule> = new Map();
  private _cpuProfiles: CPUProfile[] = [];
  private _powerState: 'active' | 'idle' | 'sleep' | 'deep-sleep' = 'active';

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

  get interruptCount(): number {
    return this._interrupts.size;
  }

  get processCount(): number {
    return this._processTable.size;
  }

  get tickCount(): number {
    return this._tickCount;
  }

  get contextSwitchCount(): number {
    return this._contextSwitchCount;
  }

  get architecture(): string {
    return this._kernel?.architecture ?? 'unknown';
  }

  get gdtCount(): number {
    return this._gdt.length;
  }

  get idtCount(): number {
    return this._idt.length;
  }

  get powerState(): string {
    return this._powerState;
  }

  get securityModuleCount(): number {
    return this._securityModules.size;
  }

  public monolithicKernel(services: string[]): { type: string; services: number; performance: number; size: string; modules: string[] } {
    this._kernel = {
      type: 'monolithic',
      modules: services,
      syscalls: services.length,
      privileges: ['ring0', 'ring3'],
      version: '1.0.0',
      uptime: Date.now(),
      architecture: 'x86-64',
    };
    this._modules = services;
    this._recordHistory(`monolithicKernel(services=${services.length})`);
    return { type: 'monolithic', services: services.length, performance: 0.95, size: 'large', modules: services };
  }

  public microkernel(services: string[], servers: string[]): { type: string; services: number; servers: number; performance: number; overhead: number } {
    this._kernel = {
      type: 'microkernel',
      modules: services,
      syscalls: Math.floor(services.length / 2),
      privileges: ['ring0', 'ring3'],
      version: '2.0.0',
      uptime: Date.now(),
      architecture: 'ARM64',
    };
    this._modules = services;
    this._recordHistory(`microkernel(services=${services.length}, servers=${servers.length})`);
    return { type: 'microkernel', services: services.length, servers: servers.length, performance: 0.7, overhead: 0.3 };
  }

  public exokernel(libOSes: string[]): { type: string; libOSes: number; flexibility: number; overhead: number; security: number } {
    this._kernel = {
      type: 'exokernel',
      modules: libOSes,
      syscalls: 10,
      privileges: ['ring0'],
      version: '3.0.0',
      uptime: Date.now(),
      architecture: 'RISC-V',
    };
    this._modules = libOSes;
    this._recordHistory(`exokernel(libOSes=${libOSes.length})`);
    return { type: 'exokernel', libOSes: libOSes.length, flexibility: 0.95, overhead: 0.1, security: 0.9 };
  }

  public nanokernel(abstraction: string): { type: string; abstraction: string; minimal: boolean; size: string; footprint: number } {
    this._kernel = {
      type: 'nanokernel',
      modules: [abstraction],
      syscalls: 5,
      privileges: ['ring0'],
      version: '4.0.0',
      uptime: Date.now(),
      architecture: 'ARM-M',
    };
    this._recordHistory(`nanokernel(abstraction=${abstraction})`);
    return { type: 'nanokernel', abstraction, minimal: true, size: 'tiny', footprint: 16 };
  }

  public hybridKernel(monolithic: string[], micro: string[]): { type: string; monolithic: number; micro: number; performance: number; balance: number } {
    const all = [...monolithic, ...micro];
    this._kernel = {
      type: 'hybrid',
      modules: all,
      syscalls: all.length,
      privileges: ['ring0', 'ring3'],
      version: '5.0.0',
      uptime: Date.now(),
      architecture: 'x86-64',
    };
    this._modules = all;
    this._recordHistory(`hybridKernel(monolithic=${monolithic.length}, micro=${micro.length})`);
    return { type: 'hybrid', monolithic: monolithic.length, micro: micro.length, performance: 0.85, balance: 0.7 };
  }

  public systemCall(name: string, args: unknown[], process: number): { name: string; result: unknown; process: number; ring: number; latency: number } {
    const syscall: SystemCall = {
      name,
      number: this._syscalls.size,
      args: args.length,
      returns: 'number',
      description: `System call ${name}`,
      privilegeLevel: 0,
    };
    this._syscalls.set(name, syscall);
    this._syscallCount++;
    const latency = 10 + Math.random() * 50;
    this._recordHistory(`syscall(name=${name}, args=${args.length}, process=${process})`);
    return { name, result: 0, process, ring: 0, latency };
  }

  public syscallTable(calls: string[]): { table: Map<string, number>; count: number; entry: string; overhead: number } {
    const table = new Map<string, number>();
    calls.forEach((call, idx) => {
      table.set(call, idx);
      this._syscalls.set(call, { name: call, number: idx, args: 0, returns: 'void', description: '', privilegeLevel: 3 });
    });
    this._recordHistory(`syscallTable(calls=${calls.length})`);
    return { table, count: calls.length, entry: 'syscall_handler', overhead: calls.length * 0.5 };
  }

  public interruptHandler(irq: number, routine: string): { irq: number; routine: string; registered: boolean; priority: number; vector: number } {
    const descriptor: InterruptDescriptor = {
      irq,
      handler: routine,
      priority: irq,
      vector: irq + 32,
      flags: ['PRESENT', 'INTERRUPT'],
    };
    this._interrupts.set(irq, descriptor);
    this._recordHistory(`interruptHandler(irq=${irq}, routine=${routine})`);
    return { irq, routine, registered: true, priority: irq, vector: irq + 32 };
  }

  public trapGate(trap: number, handler: string): { trap: number; handler: string; privilege: number; vector: number; type: string } {
    const privilege = trap < 32 ? 0 : 3;
    const type = trap < 32 ? 'fault' : trap < 48 ? 'trap' : 'abort';
    this._recordHistory(`trapGate(trap=${trap}, handler=${handler})`);
    return { trap, handler, privilege, vector: trap, type };
  }

  public privilegeLevel(level: number, ring: string): { level: number; ring: string; permissions: string[]; description: string } {
    const permissions: Record<number, string[]> = {
      0: ['all', 'io', 'memory', 'interrupt'],
      1: ['io', 'memory', 'system'],
      2: ['io', 'protected'],
      3: ['user', 'basic'],
    };
    const descriptions: Record<number, string> = {
      0: 'Kernel mode - full system access',
      1: 'Device driver mode',
      2: 'System service mode',
      3: 'User mode - restricted access',
    };
    this._recordHistory(`privilegeLevel(level=${level}, ring=${ring})`);
    return { level, ring, permissions: permissions[level] ?? [], description: descriptions[level] ?? 'unknown' };
  }

  public kernelMode(userMode: () => void): { mode: string; privileged: boolean; switched: boolean; latency: number } {
    const latency = 10 + Math.random() * 20;
    this._recordHistory(`kernelMode()`);
    return { mode: 'kernel', privileged: true, switched: true, latency };
  }

  public userModeSwitch(): { mode: string; unprivileged: boolean; switched: boolean; latency: number } {
    const latency = 5 + Math.random() * 15;
    this._recordHistory(`userModeSwitch()`);
    return { mode: 'user', unprivileged: true, switched: true, latency };
  }

  public contextSwitch(): { saved: boolean; restored: boolean; cycles: number; registers: number } {
    const cycles = 100 + Math.floor(Math.random() * 200);
    const registers = 16;
    this._contextSwitchCount++;
    this._recordHistory(`contextSwitch(cycles=${cycles})`);
    return { saved: true, restored: true, cycles, registers };
  }

  public kernelThread(name: string, func: () => void): { id: number; name: string; kernel: boolean; priority: number; stackSize: number } {
    const id = this._counter++;
    const stackSize = 8192;
    this._recordHistory(`kernelThread(name=${name})`);
    return { id, name, kernel: true, priority: 0, stackSize };
  }

  public moduleLoading(module: string, kernel: string): { module: string; loaded: boolean; kernel: string; symbols: number; size: number } {
    if (!this._modules.includes(module)) {
      this._modules.push(module);
    }
    const symbols = Math.floor(Math.random() * 100) + 10;
    const size = symbols * 256;
    this._recordHistory(`moduleLoading(module=${module}) -> loaded`);
    return { module, loaded: true, kernel, symbols, size };
  }

  public memoryProtection(start: number, size: number, permissions: string): { start: number; size: number; permissions: string; protected: boolean } {
    const region: MemoryRegion = {
      start,
      end: start + size,
      type: start < 0x80000000 ? 'kernel' : 'user',
      permissions,
    };
    this._memoryRegions.push(region);
    this._recordHistory(`memoryProtection(start=${start.toString(16)}, size=${size}, perms=${permissions})`);
    return { start, size, permissions, protected: true };
  }

  public virtualMemoryMapping(virtualAddr: number, physicalAddr: number, size: number): { virtual: number; physical: number; size: number; mapped: boolean; offset: number } {
    const offset = virtualAddr % 4096;
    this._recordHistory(`virtualMemoryMapping(virtual=${virtualAddr.toString(16)} -> physical=${physicalAddr.toString(16)})`);
    return { virtual: virtualAddr, physical: physicalAddr, size, mapped: true, offset };
  }

  public pageFaultHandler(virtualAddr: number, errorCode: number): { addr: number; errorCode: number; handled: boolean; action: string } {
    const action = errorCode & 1 ? 'present' : errorCode & 2 ? 'write' : 'read';
    this._recordHistory(`pageFault(addr=${virtualAddr.toString(16)}, error=${errorCode}) -> ${action}`);
    return { addr: virtualAddr, errorCode, handled: true, action };
  }

  public tlbFlush(addr: number, type: 'full' | 'page'): { addr: number; type: string; flushed: boolean; entries: number } {
    const entries = type === 'full' ? 64 : 1;
    this._recordHistory(`tlbFlush(type=${type}, addr=${addr.toString(16)})`);
    return { addr, type, flushed: true, entries };
  }

  public gdtInitialize(): { entries: GDTEntry[]; count: number; initialized: boolean } {
    this._gdt = [
      { selector: 0, base: 0, limit: 0, access: 'NULL', granularity: '0' },
      { selector: 1, base: 0, limit: 0xFFFFF, access: 'CODE', granularity: '4K' },
      { selector: 2, base: 0, limit: 0xFFFFF, access: 'DATA', granularity: '4K' },
      { selector: 3, base: 0, limit: 0xFFFFF, access: 'USER_CODE', granularity: '4K' },
      { selector: 4, base: 0, limit: 0xFFFFF, access: 'USER_DATA', granularity: '4K' },
    ];
    this._recordHistory(`gdtInitialize(entries=${this._gdt.length})`);
    return { entries: this._gdt, count: this._gdt.length, initialized: true };
  }

  public idtInitialize(): { entries: IDTEntry[]; count: number; initialized: boolean } {
    this._idt = [];
    for (let i = 0; i < 256; i++) {
      this._idt.push({ vector: i, offset: 0, selector: 1, flags: i < 32 ? 'INT_GATE' : 'TRAP_GATE' });
    }
    this._recordHistory(`idtInitialize(entries=${this._idt.length})`);
    return { entries: this._idt, count: this._idt.length, initialized: true };
  }

  public tssInitialize(esp0: number, cr3: number): { esp0: number; cr3: number; initialized: boolean; iomap: number } {
    this._recordHistory(`tssInitialize(esp0=${esp0.toString(16)}, cr3=${cr3.toString(16)})`);
    return { esp0, cr3, initialized: true, iomap: 0 };
  }

  public processCreate(pid: number, name: string, priority: number): { pid: number; pcb: ProcessControlBlock; created: boolean; memoryRegions: number } {
    const pcb: ProcessControlBlock = {
      pid,
      ppid: 1,
      state: 'ready',
      priority,
      registers: { eax: 0, ebx: 0, ecx: 0, edx: 0, esp: 0, ebp: 0, eip: 0, eflags: 0 },
      memoryMap: [
        { start: 0x00400000, end: 0x00500000, type: 'user', permissions: 'r-x' },
        { start: 0x00500000, end: 0x00600000, type: 'user', permissions: 'rw-' },
        { start: 0x00600000, end: 0x00700000, type: 'user', permissions: 'rw-' },
      ],
      openFiles: [],
    };
    this._processTable.set(pid, pcb);
    this._recordHistory(`processCreate(pid=${pid}, name=${name}, priority=${priority})`);
    return { pid, pcb, created: true, memoryRegions: pcb.memoryMap.length };
  }

  public processExit(pid: number, exitCode: number): { pid: number; exitCode: number; exited: boolean; reclaimed: boolean } {
    const pcb = this._processTable.get(pid);
    const exited = !!pcb;
    if (pcb) {
      this._processTable.delete(pid);
    }
    this._recordHistory(`processExit(pid=${pid}, code=${exitCode})`);
    return { pid, exitCode, exited, reclaimed: true };
  }

  public interruptEnable(irq: number): { irq: number; enabled: boolean; mask: number } {
    const mask = ~(1 << irq) & 0xFF;
    this._recordHistory(`interruptEnable(irq=${irq})`);
    return { irq, enabled: true, mask };
  }

  public interruptDisable(irq: number): { irq: number; disabled: boolean; mask: number } {
    const mask = 1 << irq;
    this._recordHistory(`interruptDisable(irq=${irq})`);
    return { irq, disabled: true, mask };
  }

  public interruptMask(mask: number): { mask: number; enabledIRQs: number[]; disabledIRQs: number[] } {
    const enabledIRQs: number[] = [];
    const disabledIRQs: number[] = [];
    for (let i = 0; i < 8; i++) {
      if (mask & (1 << i)) disabledIRQs.push(i);
      else enabledIRQs.push(i);
    }
    this._recordHistory(`interruptMask(mask=${mask.toString(16)})`);
    return { mask, enabledIRQs, disabledIRQs };
  }

  public systemTimer(ticks: number): { ticks: number; elapsed: number; interrupts: number; frequency: number } {
    this._tickCount += ticks;
    const frequency = 1000;
    const elapsed = ticks / frequency;
    this._recordHistory(`systemTimer(ticks=${ticks}, elapsed=${elapsed}s)`);
    return { ticks, elapsed, interrupts: ticks, frequency };
  }

  public schedulerTick(): { tick: number; contextSwitches: number; processes: number; load: number } {
    this._tickCount++;
    const load = this._processTable.size / 10;
    this._recordHistory(`schedulerTick(tick=${this._tickCount}, load=${load.toFixed(2)})`);
    return { tick: this._tickCount, contextSwitches: this._contextSwitchCount, processes: this._processTable.size, load };
  }

  public kernelPanic(message: string): { message: string; code: number; halted: boolean; registers: Record<string, number> } {
    this._recordHistory(`kernelPanic(message=${message})`);
    return {
      message,
      code: 0xDEADBEEF,
      halted: true,
      registers: { eax: 0, ebx: 0, ecx: 0, edx: 0 },
    };
  }

  public syscallTrace(syscall: string, args: unknown[], result: unknown): { syscall: string; args: unknown[]; result: unknown; traced: boolean; timestamp: number } {
    const timestamp = Date.now();
    this._recordHistory(`syscallTrace(syscall=${syscall}, args=${args.length}, result=${result})`);
    return { syscall, args, result, traced: true, timestamp };
  }

  public performanceCounters(): { ticks: number; contextSwitches: number; syscalls: number; interrupts: number; uptime: number } {
    return {
      ticks: this._tickCount,
      contextSwitches: this._contextSwitchCount,
      syscalls: this._syscallCount,
      interrupts: this._interrupts.size,
      uptime: this._kernel ? Date.now() - this._kernel.uptime : 0,
    };
  }

  public kernelStatistics(): {
    kernelType: string;
    modules: number;
    syscalls: number;
    processes: number;
    memoryRegions: number;
    interrupts: number;
    ticks: number;
    contextSwitches: number;
    syscallCount: number;
  } {
    return {
      kernelType: this._kernel?.type ?? 'none',
      modules: this._modules.length,
      syscalls: this._syscalls.size,
      processes: this._processTable.size,
      memoryRegions: this._memoryRegions.length,
      interrupts: this._interrupts.size,
      ticks: this._tickCount,
      contextSwitches: this._contextSwitchCount,
      syscallCount: this._syscallCount,
    };
  }

  public multiprocessingEnable(cpus: number): { cpus: number; enabled: boolean; bootCPUs: number; onlineCPUs: number } {
    const bootCPUs = 1;
    const onlineCPUs = cpus;
    this._recordHistory(`multiprocessingEnable(cpus=${cpus})`);
    return { cpus, enabled: true, bootCPUs, onlineCPUs };
  }

  public smpInitialize(cpus: number[]): { cpus: number[]; initialized: boolean; bsp: number; aps: number[] } {
    const bsp = cpus[0];
    const aps = cpus.slice(1);
    this._recordHistory(`smpInitialize(cpus=${cpus.length}) -> bsp=${bsp}, aps=${aps.length}`);
    return { cpus, initialized: true, bsp, aps };
  }

  public apicInitialize(): { enabled: boolean; localAPIC: number; ioAPIC: number; interrupts: number } {
    this._recordHistory(`apicInitialize()`);
    return { enabled: true, localAPIC: 0xFEE00000, ioAPIC: 0xFEC00000, interrupts: 24 };
  }

  public numaAwareness(nodes: number[]): { nodes: number[]; enabled: boolean; localMemory: number; remoteMemory: number } {
    const localMemory = 32;
    const remoteMemory = 16;
    this._recordHistory(`numaAwareness(nodes=${nodes.length})`);
    return { nodes, enabled: true, localMemory, remoteMemory };
  }

  public kernelDebugger(breakpoint: number, command: string): { breakpoint: number; command: string; executed: boolean; result: string } {
    const result = `Debug command executed: ${command}`;
    this._recordHistory(`kernelDebugger(breakpoint=${breakpoint.toString(16)}, cmd=${command})`);
    return { breakpoint, command, executed: true, result };
  }

  public kprobes(probe: string, address: number, handler: string): { probe: string; address: number; handler: string; installed: boolean } {
    this._recordHistory(`kprobes(probe=${probe}, address=${address.toString(16)})`);
    return { probe, address, handler, installed: true };
  }

  public ftrace(functionName: string, enabled: boolean): { function: string; enabled: boolean; traced: boolean; entries: number } {
    const entries = enabled ? 100 : 0;
    this._recordHistory(`ftrace(function=${functionName}, enabled=${enabled})`);
    return { function: functionName, enabled, traced: enabled, entries };
  }

  public tracepoints(category: string, name: string, enabled: boolean): { category: string; name: string; enabled: boolean; hits: number } {
    const hits = enabled ? Math.floor(Math.random() * 1000) : 0;
    this._recordHistory(`tracepoints(category=${category}, name=${name}, enabled=${enabled})`);
    return { category, name, enabled, hits };
  }

  public kernelMemoryAllocator(size: number, alignment: number): { ptr: number; size: number; alignment: number; allocated: boolean; flags: string[] } {
    const ptr = 0xFFFF0000 + this._counter * 1024;
    const flags = ['GFP_KERNEL', 'GFP_ATOMIC'];
    this._counter++;
    this._recordHistory(`kmalloc(size=${size}, align=${alignment}) -> ptr=${ptr.toString(16)}`);
    return { ptr, size, alignment, allocated: true, flags };
  }

  public kernelMemoryFree(ptr: number): { ptr: number; freed: boolean; size: number } {
    this._recordHistory(`kfree(ptr=${ptr.toString(16)})`);
    return { ptr, freed: true, size: 1024 };
  }

  public slabAllocator(cacheName: string, size: number): { cache: string; size: number; objects: number; allocated: boolean } {
    const objects = Math.floor(4096 / size);
    this._recordHistory(`slabAllocator(cache=${cacheName}, size=${size}) -> objects=${objects}`);
    return { cache: cacheName, size, objects, allocated: true };
  }

  public vmalloc(size: number): { ptr: number; size: number; vmalloced: boolean; pages: number } {
    const ptr = 0xC0000000 + this._counter * 1024 * 1024;
    const pages = Math.ceil(size / 4096);
    this._counter++;
    this._recordHistory(`vmalloc(size=${size}) -> ptr=${ptr.toString(16)}`);
    return { ptr, size, vmalloced: true, pages };
  }

  public vfree(ptr: number): { ptr: number; freed: boolean; size: number } {
    this._recordHistory(`vfree(ptr=${ptr.toString(16)})`);
    return { ptr, freed: true, size: 1024 * 1024 };
  }

  public memoryMapDump(): { regions: MemoryRegion[]; count: number; totalSize: number; kernelSize: number; userSize: number } {
    let kernelSize = 0;
    let userSize = 0;
    for (const region of this._memoryRegions) {
      const size = region.end - region.start;
      if (region.type === 'kernel') kernelSize += size;
      else if (region.type === 'user') userSize += size;
    }
    this._recordHistory(`memoryMapDump(regions=${this._memoryRegions.length})`);
    return {
      regions: this._memoryRegions,
      count: this._memoryRegions.length,
      totalSize: kernelSize + userSize,
      kernelSize,
      userSize,
    };
  }

  public processTableDump(): { processes: ProcessControlBlock[]; count: number; running: number; ready: number; blocked: number } {
    const processes = Array.from(this._processTable.values());
    const running = processes.filter(p => p.state === 'running').length;
    const ready = processes.filter(p => p.state === 'ready').length;
    const blocked = processes.filter(p => p.state === 'blocked').length;
    this._recordHistory(`processTableDump(processes=${processes.length})`);
    return { processes, count: processes.length, running, ready, blocked };
  }

  public interruptTableDump(): { interrupts: InterruptDescriptor[]; count: number; enabled: number; disabled: number } {
    const interrupts = Array.from(this._interrupts.values());
    const enabled = interrupts.length;
    this._recordHistory(`interruptTableDump(interrupts=${interrupts.length})`);
    return { interrupts, count: interrupts.length, enabled, disabled: 0 };
  }

  public gdtDump(): { entries: typeof this._gdt; count: number; codeSegments: number; dataSegments: number } {
    const entries = [...this._gdt];
    const codeSegments = entries.filter(e => e.access.includes('CODE')).length;
    const dataSegments = entries.filter(e => e.access.includes('DATA')).length;
    this._recordHistory(`gdtDump(entries=${entries.length})`);
    return { entries, count: entries.length, codeSegments, dataSegments };
  }

  public idtDump(): { entries: typeof this._idt; count: number; trapGates: number; interruptGates: number } {
    const entries = [...this._idt];
    const trapGates = entries.filter(e => e.flags === 'TRAP_GATE').length;
    const interruptGates = entries.filter(e => e.flags === 'INT_GATE').length;
    this._recordHistory(`idtDump(entries=${entries.length})`);
    return { entries, count: entries.length, trapGates, interruptGates };
  }

  public moduleList(): string[] {
    const modules = [...this._modules];
    this._recordHistory(`moduleList(count=${modules.length})`);
    return modules;
  }

  public findModule(name: string): string | null {
    return this._modules.find(m => m === name) ?? null;
  }

  public isModuleLoaded(name: string): boolean {
    return this._modules.includes(name);
  }

  public syscallStatistics(): { totalCalls: number; byName: Record<string, number>; avgLatency: number } {
    const byName: Record<string, number> = {};
    let total = 0;
    for (const syscall of this._syscalls.values()) {
      byName[syscall.name] = (byName[syscall.name] ?? 0) + 1;
      total++;
    }
    return {
      totalCalls: total,
      byName,
      avgLatency: total > 0 ? Math.round(this._syscallCount / total) : 0,
    };
  }

  public processByPid(pid: number): ProcessControlBlock | null {
    return this._processTable.get(pid) ?? null;
  }

  public processesByState(state: string): ProcessControlBlock[] {
    return Array.from(this._processTable.values()).filter(p => p.state === state);
  }

  public processTree(): { pid: number; ppid: number; children: number[] }[] {
    const tree: { pid: number; ppid: number; children: number[] }[] = [];
    const byPid = new Map<number, ProcessControlBlock>();
    for (const p of this._processTable.values()) byPid.set(p.pid, p);
    for (const p of byPid.values()) {
      const children = Array.from(byPid.values()).filter(c => c.ppid === p.pid).map(c => c.pid);
      tree.push({ pid: p.pid, ppid: p.ppid, children });
    }
    return tree;
  }

  public killProcess(pid: number, signal: number): boolean {
    const proc = this._processTable.get(pid);
    if (!proc) return false;
    if (signal === 9) {
      this._processTable.delete(pid);
      this._recordHistory(`killProcess(pid=${pid}, signal=SIGKILL) -> terminated`);
    } else if (signal === 15) {
      this._processTable.set(pid, { ...proc, state: 'terminated' });
      this._recordHistory(`killProcess(pid=${pid}, signal=SIGTERM) -> terminating`);
    } else {
      this._recordHistory(`killProcess(pid=${pid}, signal=${signal}) -> signaled`);
    }
    return true;
  }

  public setProcessPriority(pid: number, priority: number): boolean {
    const proc = this._processTable.get(pid);
    if (!proc) return false;
    this._processTable.set(pid, { ...proc, priority });
    this._recordHistory(`setProcessPriority(pid=${pid}, priority=${priority})`);
    return true;
  }

  public memoryRegionsByType(type: MemoryRegion['type']): MemoryRegion[] {
    return this._memoryRegions.filter(r => r.type === type);
  }

  public memoryRegionByStart(start: number): MemoryRegion | null {
    return this._memoryRegions.find(r => r.start === start) ?? null;
  }

  public kernelHealth(): {
    uptime: number;
    totalProcesses: number;
    runningProcesses: number;
    totalSyscalls: number;
    contextSwitches: number;
    tickRate: number;
    loadedModules: number;
    memoryRegions: number;
    enabledInterrupts: number;
  } {
    const running = Array.from(this._processTable.values()).filter(p => p.state === 'running').length;
    return {
      uptime: this._tickCount,
      totalProcesses: this._processTable.size,
      runningProcesses: running,
      totalSyscalls: this._syscallCount,
      contextSwitches: this._contextSwitchCount,
      tickRate: 100,
      loadedModules: this._modules.length,
      memoryRegions: this._memoryRegions.length,
      enabledInterrupts: this._interrupts.size,
    };
  }

  public contextSwitchRate(): number {
    if (this._tickCount === 0) return 0;
    return Math.round((this._contextSwitchCount / this._tickCount) * 10000) / 100;
  }

  public healthCheck(): { healthy: boolean; issues: string[]; loadAverage: number } {
    const issues: string[] = [];
    const running = Array.from(this._processTable.values()).filter(p => p.state === 'running').length;
    if (running > 1000) issues.push('high process count');
    if (this._contextSwitchCount > 1000000) issues.push('high context switch count');
    const userSize = this._memoryRegions.filter(r => r.type === 'user').reduce((s, r) => s + (r.end - r.start), 0);
    const totalSize = this._memoryRegions.reduce((s, r) => s + (r.end - r.start), 0);
    if (totalSize > 0 && userSize / totalSize > 0.9) issues.push('high memory pressure');
    const loadAverage = running / 4;
    return { healthy: issues.length === 0, issues, loadAverage };
  }

  public securityModuleLoad(name: string, hooks: string[], policyVersion: string): { module: string; loaded: boolean; hooks: number; policyVersion: string } {
    const mod: SecurityModule = { name, loaded: true, hooks, policyVersion };
    this._securityModules.set(name, mod);
    this._recordHistory(`securityModuleLoad(name=${name}, hooks=${hooks.length})`);
    return { module: name, loaded: true, hooks: hooks.length, policyVersion };
  }

  public securityModuleUnload(name: string): { module: string; unloaded: boolean; remaining: number } {
    const unloaded = this._securityModules.delete(name);
    this._recordHistory(`securityModuleUnload(name=${name}) -> ${unloaded}`);
    return { module: name, unloaded, remaining: this._securityModules.size };
  }

  public kernelProfiling(duration: number): { profile: CPUProfile; duration: number; samples: number } {
    const profile: CPUProfile = {
      cycles: Math.floor(Math.random() * 1000000),
      instructions: Math.floor(Math.random() * 5000000),
      cacheMisses: Math.floor(Math.random() * 50000),
      branchMispredictions: Math.floor(Math.random() * 20000),
    };
    this._cpuProfiles.push(profile);
    this._recordHistory(`kernelProfiling(duration=${duration}ms)`);
    return { profile, duration, samples: this._cpuProfiles.length };
  }

  public powerManagement(state: 'active' | 'idle' | 'sleep' | 'deep-sleep'): { state: string; previous: string; transitionTime: number; powerDraw: number } {
    const previous = this._powerState;
    this._powerState = state;
    const transitionTime = state === 'deep-sleep' ? 1000 : state === 'sleep' ? 500 : 10;
    const powerDraw = state === 'active' ? 100 : state === 'idle' ? 50 : state === 'sleep' ? 10 : 1;
    this._recordHistory(`powerManagement(state=${state}, prev=${previous})`);
    return { state, previous, transitionTime, powerDraw };
  }

  public cpuidInfo(leaf: number): { leaf: number; eax: number; ebx: number; ecx: number; edx: number; features: string[] } {
    const features = leaf === 1 ? ['SSE', 'SSE2', 'AVX'] : leaf === 7 ? ['AVX2', 'AVX-512'] : ['FPU', 'VME'];
    this._recordHistory(`cpuidInfo(leaf=${leaf}) -> features=${features.join(',')}`);
    return { leaf, eax: 0, ebx: 0, ecx: 0, edx: 0, features };
  }

  public toPacket(): DataPacket<{
    kernelType: string;
    syscalls: number;
    modules: number;
    interrupts: number;
    processes: number;
    ticks: number;
    contextSwitches: number;
    syscallCount: number;
    history: string[];
    securityModules: number;
    powerState: string;
  }> {
    return {
      id: `kernel-arch-${Date.now()}-${this._counter}`,
      payload: {
        kernelType: this._kernel?.type ?? 'none',
        syscalls: this._syscalls.size,
        modules: this._modules.length,
        interrupts: this._interrupts.size,
        processes: this._processTable.size,
        ticks: this._tickCount,
        contextSwitches: this._contextSwitchCount,
        syscallCount: this._syscallCount,
        history: [...this._history],
        securityModules: this._securityModules.size,
        powerState: this._powerState,
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
    this._interrupts.clear();
    this._memoryRegions = [];
    this._processTable.clear();
    this._gdt = [];
    this._idt = [];
    this._tickCount = 0;
    this._contextSwitchCount = 0;
    this._syscallCount = 0;
    this._securityModules.clear();
    this._cpuProfiles = [];
    this._powerState = 'active';
  }

  private _recordHistory(entry: string): void {
    this._counter++;
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
  }
}
