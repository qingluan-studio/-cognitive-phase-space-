import { DataPacket, PacketMeta } from '../shared/types';

/** IR operation. */
export type IROp =
  | 'load' | 'store' | 'add' | 'sub' | 'mul' | 'div' | 'mod' | 'neg'
  | 'and' | 'or' | 'xor' | 'not' | 'shl' | 'shr'
  | 'cmp' | 'jmp' | 'branch' | 'call' | 'ret' | 'phi' | 'nop';

/** IR instruction. */
export interface IRInstruction {
  op: IROp;
  args: string[];
  dest: string;
  type: string;
  block: string;
}

/** A basic block of IR. */
export interface BasicBlock {
  id: string;
  label: string;
  instructions: IRInstruction[];
  predecessors: string[];
  successors: string[];
}

/** A single optimization pass record. */
export interface Optimization {
  name: string;
  before: number;
  after: number;
  improvement: number;
  timestamp: number;
}

/** Control flow graph. */
export interface CFG {
  blocks: Map<string, BasicBlock>;
  entry: string;
  edges: [string, string][];
}

/** Loop info. */
export interface LoopInfo {
  header: string;
  body: string[];
  exits: string[];
  depth: number;
}

/** AST node interface. */
export interface ASTNode {
  type: string;
  value: unknown;
  children: ASTNode[];
  line: number;
  column: number;
}

/** Optimization history record. */
interface OptRecord {
  pass: string;
  instructionsBefore: number;
  instructionsAfter: number;
  improvement: number;
  timestamp: number;
}

export class CodeOptimizer {
  private _ir: IRInstruction[] = [];
  private _blocks: BasicBlock[] = [];
  private _optimizations: Optimization[] = [];
  private _history: OptRecord[] = [];

  constantFolding(ir: IRInstruction[]): IRInstruction[] {
    const constants = new Map<string, number>();
    const result = ir.filter(inst => {
      if (inst.op === 'load' && inst.args.length === 1 && /^-?\d+(\.\d+)?$/.test(inst.args[0])) {
        constants.set(inst.dest, parseFloat(inst.args[0]));
        return false;
      }
      if (['add', 'sub', 'mul', 'div'].includes(inst.op) && inst.args.every(a => constants.has(a))) {
        const a = constants.get(inst.args[0])!;
        const b = constants.get(inst.args[1])!;
        let v = 0;
        if (inst.op === 'add') v = a + b;
        else if (inst.op === 'sub') v = a - b;
        else if (inst.op === 'mul') v = a * b;
        else if (inst.op === 'div') v = b === 0 ? 0 : a / b;
        constants.set(inst.dest, v);
        return false;
      }
      return true;
    });
    this._recordOpt('constantFolding', ir.length, result.length);
    return result;
  }

  constantPropagation(ir: IRInstruction[]): IRInstruction[] {
    const constants = new Map<string, string>();
    for (const inst of ir) {
      if (inst.op === 'load' && inst.args.length === 1) {
        constants.set(inst.dest, inst.args[0]);
      }
    }
    const result = ir.map(inst => ({
      ...inst,
      args: inst.args.map(a => constants.get(a) ?? a),
    }));
    this._recordOpt('constantPropagation', ir.length, result.length);
    return result;
  }

  deadCodeElimination(ir: IRInstruction[]): IRInstruction[] {
    const used = new Set<string>();
    for (const inst of ir) {
      for (const a of inst.args) used.add(a);
    }
    const sideEffectOps: IROp[] = ['ret', 'store', 'call', 'branch', 'jmp'];
    const result = ir.filter(inst => inst.op !== 'load' || used.has(inst.dest) || sideEffectOps.includes(inst.op));
    this._recordOpt('deadCodeElimination', ir.length, result.length);
    return result;
  }

  commonSubexpressionElimination(ir: IRInstruction[]): IRInstruction[] {
    const exprMap = new Map<string, string>();
    const replacements = new Map<string, string>();
    const result: IRInstruction[] = [];
    for (const inst of ir) {
      if (['add', 'sub', 'mul', 'div', 'and', 'or', 'xor'].includes(inst.op)) {
        const key = `${inst.op}:${inst.args.sort().join(',')}`;
        if (exprMap.has(key)) {
          replacements.set(inst.dest, exprMap.get(key)!);
          continue;
        }
        exprMap.set(key, inst.dest);
      }
      result.push({
        ...inst,
        args: inst.args.map(a => replacements.get(a) ?? a),
      });
    }
    this._recordOpt('CSE', ir.length, result.length);
    return result;
  }

  copyPropagation(ir: IRInstruction[]): IRInstruction[] {
    const copies = new Map<string, string>();
    for (const inst of ir) {
      if (inst.op === 'load' && inst.args.length === 1 && !/^-?\d+(\.\d+)?$/.test(inst.args[0])) {
        copies.set(inst.dest, inst.args[0]);
      }
    }
    const result = ir.map(inst => ({
      ...inst,
      args: inst.args.map(a => copies.get(a) ?? a),
    }));
    this._recordOpt('copyPropagation', ir.length, result.length);
    return result;
  }

  loopUnrolling(loop: LoopInfo, factor: number): IRInstruction[] {
    const result: IRInstruction[] = [];
    const blocks = this._blocks.filter(b => loop.body.includes(b.id));
    for (let i = 0; i < factor; i++) {
      for (const block of blocks) {
        for (const inst of block.instructions) {
          result.push({ ...inst, dest: `${inst.dest}.${i}` });
        }
      }
    }
    this._recordOpt('loopUnrolling', blocks.reduce((s, b) => s + b.instructions.length, 0), result.length);
    return result;
  }

  loopInvariantMotion(loop: LoopInfo): IRInstruction[] {
    const invariant: IRInstruction[] = [];
    const blocks = this._blocks.filter(b => loop.body.includes(b.id));
    for (const block of blocks) {
      for (const inst of block.instructions) {
        if (inst.op === 'load' && inst.args.every(a => !loop.body.includes(a))) {
          invariant.push(inst);
        }
      }
    }
    this._recordOpt('loopInvariantMotion', 0, invariant.length);
    return invariant;
  }

  strengthReduction(op: IROp): IROp {
    let reduced: IROp = op;
    if (op === 'mul') reduced = 'shl';
    else if (op === 'div') reduced = 'shr';
    this._recordOpt('strengthReduction', 1, 1);
    return reduced;
  }

  inlineExpansion(func: IRInstruction[], callSites: number[]): IRInstruction[] {
    const result: IRInstruction[] = [];
    for (let i = 0; i < func.length; i++) {
      result.push(func[i]);
      if (callSites.includes(i)) {
        result.push(...func.map(inst => ({ ...inst, dest: `${inst.dest}.inline` })));
      }
    }
    this._recordOpt('inlineExpansion', func.length, result.length);
    return result;
  }

  tailCallOptimization(func: IRInstruction[]): IRInstruction[] {
    const result: IRInstruction[] = [];
    for (let i = 0; i < func.length; i++) {
      const inst = func[i];
      const next = func[i + 1];
      if (inst.op === 'call' && next && next.op === 'ret' && next.args[0] === inst.dest) {
        result.push({ ...inst, op: 'jmp', dest: '' });
      } else {
        result.push(inst);
      }
    }
    this._recordOpt('tailCallOptimization', func.length, result.length);
    return result;
  }

  peepholeOptimize(block: BasicBlock): BasicBlock {
    const optimized: IRInstruction[] = [];
    for (let i = 0; i < block.instructions.length; i++) {
      const inst = block.instructions[i];
      const next = block.instructions[i + 1];
      if (inst.op === 'load' && next && next.op === 'add' && next.args[0] === inst.dest && next.args[1] === '0') {
        optimized.push({ ...inst, dest: next.dest });
        i++;
      } else if (inst.op === 'mul' && (inst.args[0] === '1' || inst.args[1] === '1')) {
        optimized.push({ op: 'load', args: [inst.args[0] === '1' ? inst.args[1] : inst.args[0]], dest: inst.dest, type: inst.type, block: inst.block });
      } else {
        optimized.push(inst);
      }
    }
    this._recordOpt('peephole', block.instructions.length, optimized.length);
    return { ...block, instructions: optimized };
  }

  instructionScheduling(block: BasicBlock): BasicBlock {
    const sorted = [...block.instructions].sort((a, b) => {
      const priority = (op: string): number => ({ load: 1, store: 2, add: 3, mul: 4, div: 5, call: 6 }[op] ?? 9);
      return priority(a.op) - priority(b.op);
    });
    this._recordOpt('instructionScheduling', block.instructions.length, sorted.length);
    return { ...block, instructions: sorted };
  }

  registerAllocation(func: IRInstruction[]): Map<string, number> {
    const allocation = new Map<string, number>();
    let reg = 0;
    for (const inst of func) {
      if (!allocation.has(inst.dest) && inst.dest) {
        allocation.set(inst.dest, reg % 16);
        reg++;
      }
    }
    this._recordOpt('registerAllocation', 0, allocation.size);
    return allocation;
  }

  livenessAnalysis(blocks: BasicBlock[]): Map<string, Set<string>> {
    const live = new Map<string, Set<string>>();
    for (const block of blocks) {
      const liveSet = new Set<string>();
      for (const inst of block.instructions) {
        for (const a of inst.args) liveSet.add(a);
        liveSet.delete(inst.dest);
      }
      live.set(block.id, liveSet);
    }
    return live;
  }

  buildCFG(ir: IRInstruction[]): CFG {
    const blocks = new Map<string, BasicBlock>();
    let current: BasicBlock | null = null;
    let blockIdx = 0;
    for (const inst of ir) {
      if (!current || inst.op === 'jmp' || inst.op === 'branch') {
        current = { id: `bb${blockIdx}`, label: `L${blockIdx}`, instructions: [], predecessors: [], successors: [] };
        blocks.set(current.id, current);
        blockIdx++;
      }
      current.instructions.push(inst);
      if (inst.op === 'jmp' || inst.op === 'branch') {
        current = null;
      }
    }
    const edges: [string, string][] = [];
    const blockList = Array.from(blocks.values());
    for (let i = 0; i < blockList.length - 1; i++) {
      edges.push([blockList[i].id, blockList[i + 1].id]);
      blockList[i].successors.push(blockList[i + 1].id);
      blockList[i + 1].predecessors.push(blockList[i].id);
    }
    this._recordOpt('buildCFG', 0, blocks.size);
    return { blocks, entry: blockList[0]?.id ?? '', edges };
  }

  dominatorTree(cfg: CFG): Map<string, string[]> {
    const tree = new Map<string, string[]>();
    for (const [id, block] of cfg.blocks) {
      const doms: string[] = [];
      for (const [otherId, otherBlock] of cfg.blocks) {
        if (id !== otherId && otherBlock.successors.includes(id)) doms.push(otherId);
      }
      tree.set(id, doms);
    }
    return tree;
  }

  loopDetect(cfg: CFG): LoopInfo[] {
    const loops: LoopInfo[] = [];
    for (const [id, block] of cfg.blocks) {
      for (const pred of block.predecessors) {
        if (this._dominates(cfg, id, pred)) {
          const body = this._collectLoopBody(cfg, id, pred);
          loops.push({
            header: id,
            body,
            exits: block.successors,
            depth: 1,
          });
        }
      }
    }
    return loops;
  }

  optimize(ir: IRInstruction[], passes: string[]): IRInstruction[] {
    let result = [...ir];
    for (const pass of passes) {
      switch (pass) {
        case 'constantFolding': result = this.constantFolding(result); break;
        case 'constantPropagation': result = this.constantPropagation(result); break;
        case 'deadCodeElimination': result = this.deadCodeElimination(result); break;
        case 'CSE': result = this.commonSubexpressionElimination(result); break;
        case 'copyPropagation': result = this.copyPropagation(result); break;
        case 'tailCallOptimization': result = this.tailCallOptimization(result); break;
      }
    }
    this._ir = result;
    return result;
  }

  toPacket(): DataPacket<{ ir: IRInstruction[]; blocks: BasicBlock[]; optimizations: Optimization[]; history: OptRecord[] }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['compiler', 'CodeOptimizer'],
      priority: 1,
      phase: 'code_optimizer',
    };
    return {
      id: `code-optimizer-${Date.now().toString(36)}`,
      payload: { ir: this._ir, blocks: this._blocks, optimizations: this._optimizations, history: this._history },
      metadata,
    };
  }

  reset(): void {
    this._ir = [];
    this._blocks = [];
    this._optimizations = [];
    this._history = [];
  }

  get instructionCount(): number { return this._ir.length; }
  get blockCount(): number { return this._blocks.length; }
  get optimizationCount(): number { return this._optimizations.length; }

  private _recordOpt(pass: string, before: number, after: number): void {
    const improvement = before - after;
    this._optimizations.push({ name: pass, before, after, improvement, timestamp: Date.now() });
    this._history.push({ pass, instructionsBefore: before, instructionsAfter: after, improvement, timestamp: Date.now() });
  }

  private _dominates(cfg: CFG, a: string, b: string): boolean {
    const visited = new Set<string>();
    const queue = [cfg.entry];
    while (queue.length > 0) {
      const cur = queue.shift()!;
      if (cur === b) return !visited.has(a) && a !== b;
      if (visited.has(cur)) continue;
      visited.add(cur);
      const block = cfg.blocks.get(cur);
      if (block) queue.push(...block.successors);
    }
    return false;
  }

  private _collectLoopBody(cfg: CFG, header: string, latch: string): string[] {
    const body = new Set<string>([header, latch]);
    const queue = [latch];
    while (queue.length > 0) {
      const cur = queue.shift()!;
      const block = cfg.blocks.get(cur);
      if (!block) continue;
      for (const pred of block.predecessors) {
        if (!body.has(pred)) {
          body.add(pred);
          queue.push(pred);
        }
      }
    }
    return Array.from(body);
  }
}
