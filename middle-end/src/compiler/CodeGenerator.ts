import { DataPacket, PacketMeta } from '../shared/types';

/** Instruction opcode. */
export type Opcode =
  | 'mov' | 'add' | 'sub' | 'mul' | 'div' | 'mod' | 'neg'
  | 'and' | 'or' | 'xor' | 'not' | 'shl' | 'shr' | 'cmp'
  | 'jmp' | 'je' | 'jne' | 'jg' | 'jl' | 'jge' | 'jle' | 'jz'
  | 'call' | 'ret' | 'push' | 'pop' | 'load' | 'store' | 'nop';

/** A generated instruction. */
export interface Instruction {
  opcode: Opcode;
  operands: string[];
  comment: string;
  address: number;
}

/** Target architecture descriptor. */
export interface TargetArch {
  name: string;
  registers: string[];
  instructions: Opcode[];
  wordSize: number;
}

/** Emission result. */
export interface EmissionResult {
  instructions: Instruction[];
  data: Map<string, number[]>;
  labels: Map<string, number>;
  size: number;
}

/** AST node interface. */
export interface ASTNode {
  type: string;
  value: unknown;
  children: ASTNode[];
  line: number;
  column: number;
}

/** Code generation history record. */
interface GenRecord {
  target: string;
  instructions: number;
  size: number;
  timestamp: number;
}

export class CodeGenerator {
  private _instructions: Instruction[] = [];
  private _target: TargetArch | null = null;
  private _symbols: Map<string, number> = new Map();
  private _history: GenRecord[] = [];
  private _registerPool: string[] = [];
  private _labelCounter = 0;
  private _address = 0;

  generate(ast: ASTNode, target: TargetArch): EmissionResult {
    this._target = target;
    this._registerPool = [...target.registers];
    for (const child of ast.children) {
      this.genStatement(child);
    }
    const result: EmissionResult = {
      instructions: this._instructions,
      data: new Map(),
      labels: new Map(),
      size: this._address,
    };
    this._history.push({
      target: target.name,
      instructions: this._instructions.length,
      size: this._address,
      timestamp: Date.now(),
    });
    return result;
  }

  emitInstruction(opcode: Opcode, operands: string[] = [], comment: string = ''): Instruction {
    const inst: Instruction = { opcode, operands, comment, address: this._address };
    this._instructions.push(inst);
    this._address += this._target?.wordSize ?? 4;
    return inst;
  }

  emitLabel(label: string): void {
    this._symbols.set(label, this._address);
  }

  emitData(data: number[]): void {
    const label = `data_${this._labelCounter++}`;
    this._symbols.set(label, this._address);
    for (const b of data) {
      this.emitInstruction('nop', [b.toString()], `data byte ${b}`);
    }
  }

  genExpression(expr: ASTNode): string {
    switch (expr.type) {
      case 'Literal': {
        const reg = this.allocateRegister();
        this.emitInstruction('mov', [reg, String(expr.value)], `load literal ${String(expr.value)}`);
        return reg;
      }
      case 'Identifier': {
        const reg = this.allocateRegister();
        const addr = this._symbols.get(String(expr.value)) ?? 0;
        this.emitInstruction('load', [reg, addr.toString()], `load ${String(expr.value)}`);
        return reg;
      }
      case 'BinaryExpression':
        return this.genBinaryOp(String((expr.value as { op: string }).op), expr.children[0], expr.children[1]);
      case 'UnaryExpression':
        return this.genUnaryOp(String((expr.value as { op: string }).op), expr.children[0]);
      case 'CallExpression':
        return this.genCall(expr.children[0], expr.children.slice(1));
      default:
        return this.allocateRegister();
    }
  }

  genStatement(stmt: ASTNode): void {
    switch (stmt.type) {
      case 'VariableDeclaration':
        this.genDeclaration(stmt);
        break;
      case 'ReturnStatement':
        this.genReturn(stmt.children[0] ?? null);
        break;
      case 'IfStatement':
        this.genIf(stmt.children[0], stmt.children[1], stmt.children[2] ?? null);
        break;
      case 'WhileStatement':
        this.genWhile(stmt.children[0], stmt.children[1]);
        break;
      case 'ForStatement':
        this.genFor(stmt.children[0], stmt.children[1], stmt.children[2], stmt.children[3]);
        break;
      case 'FunctionDeclaration':
        this.genFunction(stmt);
        break;
      case 'BlockStatement':
        for (const child of stmt.children) this.genStatement(child);
        break;
      default:
        this.genExpression(stmt);
    }
  }

  genFunction(func: ASTNode): void {
    const attrs = func.value as { name: string };
    this.emitLabel(attrs.name);
    this.emitInstruction('push', ['bp'], 'function prologue');
    this.emitInstruction('mov', ['bp', 'sp'], '');
    for (const child of func.children) this.genStatement(child);
    this.emitInstruction('pop', ['bp'], 'function epilogue');
    this.emitInstruction('ret', [], `return from ${attrs.name}`);
  }

  genDeclaration(decl: ASTNode): void {
    const attrs = decl.value as { name: string };
    this._symbols.set(attrs.name, this._address);
    if (decl.children.length > 0) {
      const reg = this.genExpression(decl.children[0]);
      this.emitInstruction('store', [reg, this._address.toString()], `store ${attrs.name}`);
      this.spillRegister(reg);
    }
  }

  genBinaryOp(op: string, left: ASTNode, right: ASTNode): string {
    const leftReg = this.genExpression(left);
    const rightReg = this.genExpression(right);
    switch (op) {
      case '+': this.emitInstruction('add', [leftReg, rightReg], ''); break;
      case '-': this.emitInstruction('sub', [leftReg, rightReg], ''); break;
      case '*': this.emitInstruction('mul', [leftReg, rightReg], ''); break;
      case '/': this.emitInstruction('div', [leftReg, rightReg], ''); break;
      case '%': this.emitInstruction('mod', [leftReg, rightReg], ''); break;
      case '&': this.emitInstruction('and', [leftReg, rightReg], ''); break;
      case '|': this.emitInstruction('or', [leftReg, rightReg], ''); break;
      case '^': this.emitInstruction('xor', [leftReg, rightReg], ''); break;
      case '==': case '!=': case '<': case '>': case '<=': case '>=':
        this.emitInstruction('cmp', [leftReg, rightReg], `compare ${op}`);
        break;
    }
    this.spillRegister(rightReg);
    return leftReg;
  }

  genUnaryOp(op: string, operand: ASTNode): string {
    const reg = this.genExpression(operand);
    if (op === '-') this.emitInstruction('neg', [reg], 'unary minus');
    else if (op === '!') this.emitInstruction('not', [reg], 'logical not');
    else if (op === '~') this.emitInstruction('not', [reg], 'bitwise not');
    return reg;
  }

  genCall(func: ASTNode, args: ASTNode[]): string {
    for (const arg of args) {
      const reg = this.genExpression(arg);
      this.emitInstruction('push', [reg], 'push argument');
      this.spillRegister(reg);
    }
    this.emitInstruction('call', [String(func.value ?? '')], 'function call');
    const resultReg = this.allocateRegister();
    this.emitInstruction('mov', [resultReg, 'ret'], 'move return value');
    return resultReg;
  }

  genReturn(value: ASTNode | null): void {
    if (value) {
      const reg = this.genExpression(value);
      this.emitInstruction('mov', ['ret', reg], 'set return value');
      this.spillRegister(reg);
    }
    this.emitInstruction('ret', [], 'return');
  }

  genIf(cond: ASTNode, then: ASTNode, els: ASTNode | null): void {
    const condReg = this.genExpression(cond);
    const elseLabel = `L_else_${this._labelCounter++}`;
    const endLabel = `L_end_${this._labelCounter++}`;
    this.emitInstruction('jz', [condReg, elseLabel], 'jump to else');
    this.genStatement(then);
    this.emitInstruction('jmp', [endLabel], 'jump to end');
    this.emitLabel(elseLabel);
    if (els) this.genStatement(els);
    this.emitLabel(endLabel);
    this.spillRegister(condReg);
  }

  genWhile(cond: ASTNode, body: ASTNode): void {
    const startLabel = `L_while_${this._labelCounter++}`;
    const endLabel = `L_while_end_${this._labelCounter++}`;
    this.emitLabel(startLabel);
    const condReg = this.genExpression(cond);
    this.emitInstruction('jz', [condReg, endLabel], 'exit while if false');
    this.genStatement(body);
    this.emitInstruction('jmp', [startLabel], 'loop back');
    this.emitLabel(endLabel);
    this.spillRegister(condReg);
  }

  genFor(init: ASTNode, cond: ASTNode, update: ASTNode, body: ASTNode): void {
    this.genStatement(init);
    const startLabel = `L_for_${this._labelCounter++}`;
    const endLabel = `L_for_end_${this._labelCounter++}`;
    this.emitLabel(startLabel);
    const condReg = this.genExpression(cond);
    this.emitInstruction('jz', [condReg, endLabel], 'exit for if false');
    this.genStatement(body);
    this.genStatement(update);
    this.emitInstruction('jmp', [startLabel], 'loop back');
    this.emitLabel(endLabel);
    this.spillRegister(condReg);
  }

  allocateRegister(): string {
    if (this._registerPool.length === 0) return `r_temp_${this._labelCounter++}`;
    return this._registerPool.shift()!;
  }

  spillRegister(reg: string): void {
    if (this._target?.registers.includes(reg)) {
      this._registerPool.push(reg);
    }
  }

  emitX86(ir: { op: string; args: string[]; dest: string }[]): Instruction[] {
    return ir.map((inst, i) => ({
      opcode: this._mapToOpcode(inst.op),
      operands: [...inst.args, inst.dest],
      comment: `x86: ${inst.op}`,
      address: i * 4,
    }));
  }

  emitARM(ir: { op: string; args: string[]; dest: string }[]): Instruction[] {
    return ir.map((inst, i) => ({
      opcode: this._mapToOpcode(inst.op),
      operands: [`r${i % 12}`, ...inst.args, inst.dest],
      comment: `arm: ${inst.op}`,
      address: i * 4,
    }));
  }

  emitWASM(ir: { op: string; args: string[]; dest: string }[]): Instruction[] {
    return ir.map((inst, i) => ({
      opcode: this._mapToOpcode(inst.op),
      operands: inst.args,
      comment: `wasm: ${inst.op} -> ${inst.dest}`,
      address: i,
    }));
  }

  emitLLVM(ir: { op: string; args: string[]; dest: string }[]): Instruction[] {
    return ir.map((inst, i) => ({
      opcode: this._mapToOpcode(inst.op),
      operands: [inst.dest, ...inst.args],
      comment: `llvm: ${inst.dest} = ${inst.op} ${inst.args.join(', ')}`,
      address: i,
    }));
  }

  toPacket(): DataPacket<{ instructions: Instruction[]; target: TargetArch | null; symbols: Map<string, number>; history: GenRecord[] }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['compiler', 'CodeGenerator'],
      priority: 1,
      phase: 'code_generator',
    };
    return {
      id: `code-generator-${Date.now().toString(36)}`,
      payload: {
        instructions: this._instructions,
        target: this._target,
        symbols: this._symbols,
        history: this._history,
      },
      metadata,
    };
  }

  reset(): void {
    this._instructions = [];
    this._target = null;
    this._symbols = new Map();
    this._history = [];
    this._registerPool = [];
    this._labelCounter = 0;
    this._address = 0;
  }

  get instructionCount(): number { return this._instructions.length; }
  get symbolCount(): number { return this._symbols.size; }
  get historyCount(): number { return this._history.length; }

  private _mapToOpcode(op: string): Opcode {
    const map: Record<string, Opcode> = {
      add: 'add', sub: 'sub', mul: 'mul', div: 'div', mod: 'mod', neg: 'neg',
      and: 'and', or: 'or', xor: 'xor', not: 'not', shl: 'shl', shr: 'shr', cmp: 'cmp',
      jmp: 'jmp', call: 'call', ret: 'ret', load: 'load', store: 'store',
    };
    return map[op] ?? 'nop';
  }
}
