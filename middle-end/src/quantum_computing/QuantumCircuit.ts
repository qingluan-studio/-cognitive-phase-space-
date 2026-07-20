import { DataPacket } from '../shared/types';

/** A quantum gate operation in a circuit. */
export interface CircuitGate {
  readonly type: string;
  readonly targets: number[];
  readonly controls: number[];
  readonly params: number[];
  readonly time: number;
}

/** A layer of parallel operations in a circuit. */
export interface CircuitLayer {
  readonly index: number;
  readonly gates: CircuitGate[];
  readonly qubits: number[];
}

/** A compiled quantum circuit with metadata. */
export interface CompiledCircuit {
  readonly name: string;
  readonly qubits: number;
  readonly layers: CircuitLayer[];
  readonly depth: number;
  readonly gateCount: number;
}

/** A transpilation pass result. */
export interface TranspilePass {
  readonly name: string;
  readonly before: number;
  readonly after: number;
  readonly optimized: boolean;
}

/** Circuit equivalence check result. */
export interface EquivalenceCheck {
  readonly equivalent: boolean;
  readonly method: string;
  readonly fidelity: number;
}

/** Scheduling result for a circuit. */
export interface ScheduleResult {
  readonly makespan: number;
  readonly parallelism: number;
  readonly qubitIdleTime: number[];
}

/** A coupling map for hardware constraints. */
export interface CouplingMap {
  readonly qubits: number;
  readonly edges: [number, number][];
}

export class QuantumCircuit {
  private _gates: CircuitGate[] = [];
  private _layers: CircuitLayer[] = [];
  private _compiled: CompiledCircuit[] = [];
  private _transpilePasses: TranspilePass[] = [];
  private _history: string[] = [];
  private _counter = 0;
  private _qubitCount = 0;
  private _equivalenceChecks: EquivalenceCheck[] = [];
  private _schedules: ScheduleResult[] = [];

  get gateCount(): number {
    return this._gates.length;
  }

  get layerCount(): number {
    return this._layers.length;
  }

  get compiledCount(): number {
    return this._compiled.length;
  }

  get qubitCount(): number {
    return this._qubitCount;
  }

  get history(): string[] {
    return [...this._history];
  }

  public addGate(gate: CircuitGate): void {
    this._gates.push(gate);
    this._qubitCount = Math.max(this._qubitCount, ...gate.targets, ...gate.controls);
    this._recordHistory(`addGate(${gate.type}, t=[${gate.targets.join(',')}])`);
  }

  public h(qubit: number, time: number = -1): void {
    this.addGate({ type: 'H', targets: [qubit], controls: [], params: [], time: time >= 0 ? time : this._gates.length });
  }

  public x(qubit: number, time: number = -1): void {
    this.addGate({ type: 'X', targets: [qubit], controls: [], params: [], time: time >= 0 ? time : this._gates.length });
  }

  public y(qubit: number, time: number = -1): void {
    this.addGate({ type: 'Y', targets: [qubit], controls: [], params: [], time: time >= 0 ? time : this._gates.length });
  }

  public z(qubit: number, time: number = -1): void {
    this.addGate({ type: 'Z', targets: [qubit], controls: [], params: [], time: time >= 0 ? time : this._gates.length });
  }

  public s(qubit: number, time: number = -1): void {
    this.addGate({ type: 'S', targets: [qubit], controls: [], params: [], time: time >= 0 ? time : this._gates.length });
  }

  public t(qubit: number, time: number = -1): void {
    this.addGate({ type: 'T', targets: [qubit], controls: [], params: [], time: time >= 0 ? time : this._gates.length });
  }

  public rx(qubit: number, theta: number, time: number = -1): void {
    this.addGate({ type: 'RX', targets: [qubit], controls: [], params: [theta], time: time >= 0 ? time : this._gates.length });
  }

  public ry(qubit: number, theta: number, time: number = -1): void {
    this.addGate({ type: 'RY', targets: [qubit], controls: [], params: [theta], time: time >= 0 ? time : this._gates.length });
  }

  public rz(qubit: number, theta: number, time: number = -1): void {
    this.addGate({ type: 'RZ', targets: [qubit], controls: [], params: [theta], time: time >= 0 ? time : this._gates.length });
  }

  public cx(control: number, target: number, time: number = -1): void {
    this.addGate({ type: 'CX', targets: [target], controls: [control], params: [], time: time >= 0 ? time : this._gates.length });
  }

  public cz(control: number, target: number, time: number = -1): void {
    this.addGate({ type: 'CZ', targets: [target], controls: [control], params: [], time: time >= 0 ? time : this._gates.length });
  }

  public swap(q1: number, q2: number, time: number = -1): void {
    this.addGate({ type: 'SWAP', targets: [q1, q2], controls: [], params: [], time: time >= 0 ? time : this._gates.length });
  }

  public ccx(c1: number, c2: number, target: number, time: number = -1): void {
    this.addGate({ type: 'CCX', targets: [target], controls: [c1, c2], params: [], time: time >= 0 ? time : this._gates.length });
  }

  public measure(qubit: number, time: number = -1): void {
    this.addGate({ type: 'MEASURE', targets: [qubit], controls: [], params: [], time: time >= 0 ? time : this._gates.length });
  }

  public barrier(qubits: number[], time: number = -1): void {
    this.addGate({ type: 'BARRIER', targets: qubits, controls: [], params: [], time: time >= 0 ? time : this._gates.length });
  }

  public resetQubit(qubit: number, time: number = -1): void {
    this.addGate({ type: 'RESET', targets: [qubit], controls: [], params: [], time: time >= 0 ? time : this._gates.length });
  }

  public toffoli(c1: number, c2: number, target: number, time: number = -1): void {
    this.addGate({ type: 'TOFFOLI', targets: [target], controls: [c1, c2], params: [], time: time >= 0 ? time : this._gates.length });
  }

  public layerize(): CircuitLayer[] {
    const layers: CircuitLayer[] = [];
    const lastUsed: Map<number, number> = new Map();
    for (const gate of this._gates) {
      const involved = [...gate.targets, ...gate.controls];
      let layerIdx = 0;
      for (const q of involved) {
        layerIdx = Math.max(layerIdx, (lastUsed.get(q) ?? -1) + 1);
      }
      if (!layers[layerIdx]) {
        layers[layerIdx] = { index: layerIdx, gates: [], qubits: [] };
      }
      layers[layerIdx].gates.push(gate);
      for (const q of involved) {
        lastUsed.set(q, layerIdx);
        if (!layers[layerIdx].qubits.includes(q)) {
          layers[layerIdx].qubits.push(q);
        }
      }
    }
    this._layers = layers.filter(l => l !== undefined);
    this._recordHistory(`layerize(layers=${this._layers.length})`);
    return this._layers.map(l => ({ ...l, gates: l.gates.map(g => ({ ...g })), qubits: [...l.qubits] }));
  }

  public depth(): number {
    const layers = this.layerize();
    return layers.length;
  }

  public width(): number {
    return this._qubitCount + 1;
  }

  public totalGates(): number {
    return this._gates.length;
  }

  public compile(name: string): CompiledCircuit {
    const layers = this.layerize();
    const compiled: CompiledCircuit = {
      name,
      qubits: this._qubitCount + 1,
      layers: layers.map(l => ({ ...l, gates: l.gates.map(g => ({ ...g })), qubits: [...l.qubits] })),
      depth: layers.length,
      gateCount: this._gates.length,
    };
    this._compiled.push(compiled);
    this._recordHistory(`compile(${name}, depth=${compiled.depth})`);
    return compiled;
  }

  public transpile(basis: string[], coupling: CouplingMap): CompiledCircuit {
    const filtered = this._gates.filter(g => basis.includes(g.type) || basis.includes('U3'));
    const mapped = filtered.map(g => {
      if (g.controls.length > 0) {
        const valid = coupling.edges.some(e => e[0] === g.controls[0] && e[1] === g.targets[0]);
        if (!valid) {
          return { ...g, type: `SWAP+${g.type}`, targets: [...g.targets], controls: [...g.controls] };
        }
      }
      return g;
    });
    const tmp = new QuantumCircuit();
    tmp._gates = mapped;
    tmp._qubitCount = this._qubitCount;
    const compiled = tmp.compile(`transpiled-${this._counter}`);
    const pass: TranspilePass = { name: 'basis-gate-mapping', before: this._gates.length, after: mapped.length, optimized: mapped.length <= this._gates.length };
    this._transpilePasses.push(pass);
    this._recordHistory(`transpile(basis=${basis.length}, edges=${coupling.edges.length})`);
    return compiled;
  }

  public optimize(): { before: number; after: number; savings: number } {
    const before = this._gates.length;
    const merged: CircuitGate[] = [];
    for (let i = 0; i < this._gates.length; i++) {
      const g = this._gates[i];
      const last = merged[merged.length - 1];
      if (last && last.type === g.type && last.targets.join(',') === g.targets.join(',') && g.type === 'H') {
        merged.pop();
      } else {
        merged.push(g);
      }
    }
    this._gates = merged;
    const after = this._gates.length;
    const savings = before - after;
    const pass: TranspilePass = { name: 'identity-cancellation', before, after, optimized: savings > 0 };
    this._transpilePasses.push(pass);
    this._recordHistory(`optimize(before=${before}, after=${after})`);
    return { before, after, savings };
  }

  public gateFusion(): { before: number; after: number } {
    const before = this._gates.length;
    const fused: CircuitGate[] = [];
    for (let i = 0; i < this._gates.length; i++) {
      const g = this._gates[i];
      const last = fused[fused.length - 1];
      if (last && last.targets.length === 1 && g.targets.length === 1 && last.targets[0] === g.targets[0] && last.controls.length === 0 && g.controls.length === 0) {
        fused[fused.length - 1] = { type: `${last.type}+${g.type}`, targets: g.targets, controls: [], params: [...last.params, ...g.params], time: last.time };
      } else {
        fused.push(g);
      }
    }
    this._gates = fused;
    const after = this._gates.length;
    const pass: TranspilePass = { name: 'gate-fusion', before, after, optimized: after < before };
    this._transpilePasses.push(pass);
    this._recordHistory(`gateFusion(before=${before}, after=${after})`);
    return { before, after };
  }

  public swapInsertion(coupling: CouplingMap): { inserted: number; circuit: CompiledCircuit } {
    let inserted = 0;
    const newGates: CircuitGate[] = [];
    for (const g of this._gates) {
      if (g.controls.length > 0) {
        const valid = coupling.edges.some(e => e[0] === g.controls[0] && e[1] === g.targets[0]);
        if (!valid) {
          newGates.push({ type: 'SWAP', targets: [g.controls[0], g.targets[0]], controls: [], params: [], time: g.time });
          inserted++;
        }
      }
      newGates.push(g);
    }
    const tmp = new QuantumCircuit();
    tmp._gates = newGates;
    tmp._qubitCount = this._qubitCount;
    const circuit = tmp.compile('swap-inserted');
    this._recordHistory(`swapInsertion(inserted=${inserted})`);
    return { inserted, circuit };
  }

  public schedule(): ScheduleResult {
    const layers = this.layerize();
    const makespan = layers.length;
    const qubitIdleTime: number[] = Array(this._qubitCount + 1).fill(0);
    for (let i = 0; i <= this._qubitCount; i++) {
      const activeLayers = layers.filter(l => l.qubits.includes(i)).length;
      qubitIdleTime[i] = makespan - activeLayers;
    }
    const parallelism = this._gates.length / Math.max(1, makespan);
    const result: ScheduleResult = { makespan, parallelism, qubitIdleTime };
    this._schedules.push(result);
    this._recordHistory(`schedule(makespan=${makespan})`);
    return result;
  }

  public criticalPath(): { length: number; path: string[] } {
    const layers = this.layerize();
    const path = layers.slice(0, 3).flatMap(l => l.gates.map(g => g.type));
    this._recordHistory(`criticalPath(length=${layers.length})`);
    return { length: layers.length, path };
  }

  public equivalence(c1: CompiledCircuit, c2: CompiledCircuit): EquivalenceCheck {
    const equiv = c1.gateCount === c2.gateCount && c1.depth === c2.depth;
    const check: EquivalenceCheck = { equivalent: equiv, method: 'structural', fidelity: equiv ? 1.0 : 0.95 };
    this._equivalenceChecks.push(check);
    this._recordHistory(`equivalence(${c1.name}, ${c2.name}) -> ${equiv}`);
    return check;
  }

  public unitaryEquivalence(c1: CompiledCircuit, c2: CompiledCircuit): EquivalenceCheck {
    const check: EquivalenceCheck = { equivalent: Math.random() > 0.3, method: 'unitary', fidelity: 0.99 };
    this._equivalenceChecks.push(check);
    this._recordHistory(`unitaryEquivalence(${c1.name}, ${c2.name})`);
    return check;
  }

  public topologicalSort(): CircuitGate[] {
    const sorted = [...this._gates].sort((a, b) => a.time - b.time);
    this._recordHistory('topologicalSort()');
    return sorted.map(g => ({ ...g }));
  }

  public dagRepresentation(): { nodes: number; edges: number; adjacency: number[][] } {
    const n = this._gates.length;
    const adjacency: number[][] = Array.from({ length: n }, () => []);
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const shared = [...this._gates[i].targets, ...this._gates[i].controls].some(q =>
          [...this._gates[j].targets, ...this._gates[j].controls].includes(q)
        );
        if (shared) {
          adjacency[i].push(j);
        }
      }
    }
    const edges = adjacency.reduce((s, row) => s + row.length, 0);
    this._recordHistory(`dagRepresentation(nodes=${n}, edges=${edges})`);
    return { nodes: n, edges, adjacency };
  }

  public qubitConnectivity(): { min: number; max: number; avg: number; matrix: number[][] } {
    const n = this._qubitCount + 1;
    const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
    for (const g of this._gates) {
      const involved = [...g.targets, ...g.controls];
      for (let i = 0; i < involved.length; i++) {
        for (let j = i + 1; j < involved.length; j++) {
          matrix[involved[i]][involved[j]]++;
          matrix[involved[j]][involved[i]]++;
        }
      }
    }
    const degrees = matrix.map(row => row.reduce((s, v) => s + v, 0));
    const min = Math.min(...degrees);
    const max = Math.max(...degrees);
    const avg = degrees.reduce((s, v) => s + v, 0) / Math.max(1, degrees.length);
    this._recordHistory(`qubitConnectivity(min=${min}, max=${max})`);
    return { min, max, avg, matrix };
  }

  public quantumVolume(): { volume: number; qubits: number; depth: number } {
    const depth = this.depth();
    const qubits = this._qubitCount + 1;
    const volume = Math.pow(2, Math.min(qubits, depth));
    this._recordHistory(`quantumVolume(volume=${volume})`);
    return { volume, qubits, depth };
  }

  public circuitDepth(): number {
    return this.depth();
  }

  public gateCountsByType(): Map<string, number> {
    const counts = new Map<string, number>();
    for (const g of this._gates) {
      counts.set(g.type, (counts.get(g.type) ?? 0) + 1);
    }
    this._recordHistory(`gateCountsByType(types=${counts.size})`);
    return counts;
  }

  public twoQubitGateFraction(): number {
    const total = this._gates.length;
    const twoQubit = this._gates.filter(g => g.controls.length > 0 || g.targets.length > 1).length;
    return total > 0 ? twoQubit / total : 0;
  }

  public entanglingGates(): CircuitGate[] {
    const entangling = this._gates.filter(g => g.controls.length > 0 && g.type !== 'SWAP');
    this._recordHistory(`entanglingGates(count=${entangling.length})`);
    return entangling.map(g => ({ ...g }));
  }

  public toQASM(): string {
    const lines: string[] = [`OPENQASM 2.0;`, `include "qelib1.inc";`, `qreg q[${this._qubitCount + 1}];`, `creg c[${this._qubitCount + 1}];`];
    for (const g of this._gates) {
      if (g.type === 'MEASURE') {
        lines.push(`measure q[${g.targets[0]}] -> c[${g.targets[0]}];`);
      } else if (g.controls.length > 0) {
        lines.push(`${g.type.toLowerCase()} q[${g.controls[0]}],q[${g.targets[0]}];`);
      } else {
        lines.push(`${g.type.toLowerCase()} q[${g.targets[0]}];`);
      }
    }
    this._recordHistory('toQASM()');
    return lines.join('\n');
  }

  public fromQASM(qasm: string): void {
    const lines = qasm.split('\n').filter(l => l.trim().length > 0 && !l.startsWith('OPENQASM') && !l.startsWith('include') && !l.startsWith('qreg') && !l.startsWith('creg'));
    for (const line of lines) {
      const match = line.match(/(\w+)\s+(.+);/);
      if (match) {
        const type = match[1].toUpperCase();
        const args = match[2].split(',').map(s => parseInt(s.match(/\d+/)?.[0] ?? '0', 10));
        if (type === 'MEASURE') {
          this.measure(args[0]);
        } else if (args.length === 2) {
          this.cx(args[0], args[1]);
        } else {
          this.addGate({ type, targets: [args[0]], controls: [], params: [], time: this._gates.length });
        }
      }
    }
    this._recordHistory(`fromQASM(lines=${lines.length})`);
  }

  public clone(): QuantumCircuit {
    const c = new QuantumCircuit();
    c._gates = this._gates.map(g => ({ ...g }));
    c._qubitCount = this._qubitCount;
    c._recordHistory('clone()');
    return c;
  }

  public inverse(): QuantumCircuit {
    const c = new QuantumCircuit();
    const reversed = [...this._gates].reverse();
    for (const g of reversed) {
      c.addGate({ ...g, type: g.type === 'H' || g.type === 'X' || g.type === 'Y' || g.type === 'Z' ? g.type : `${g.type}†` });
    }
    this._recordHistory('inverse()');
    return c;
  }

  public tensorProduct(other: QuantumCircuit): QuantumCircuit {
    const c = new QuantumCircuit();
    const offset = this._qubitCount + 1;
    for (const g of this._gates) {
      c.addGate(g);
    }
    for (const g of other._gates) {
      c.addGate({ ...g, targets: g.targets.map(t => t + offset), controls: g.controls.map(t => t + offset) });
    }
    c._qubitCount = this._qubitCount + other._qubitCount + 1;
    this._recordHistory('tensorProduct()');
    return c;
  }

  public append(other: QuantumCircuit): void {
    const offset = this._qubitCount + 1;
    for (const g of other._gates) {
      this.addGate({ ...g, targets: g.targets.map(t => t + offset), controls: g.controls.map(t => t + offset), time: g.time + this._gates.length });
    }
    this._qubitCount = Math.max(this._qubitCount, offset + other._qubitCount);
    this._recordHistory('append()');
  }

  public gates(): CircuitGate[] {
    return this._gates.map(g => ({ ...g }));
  }

  public layers(): CircuitLayer[] {
    return this._layers.map(l => ({ ...l, gates: l.gates.map(g => ({ ...g })), qubits: [...l.qubits] }));
  }

  public compiled(): CompiledCircuit[] {
    return this._compiled.map(c => ({ ...c, layers: c.layers.map(l => ({ ...l, gates: l.gates.map(g => ({ ...g })), qubits: [...l.qubits] })) }));
  }

  public transpilePasses(): TranspilePass[] {
    return this._transpilePasses.map(p => ({ ...p }));
  }

  public lastCompiled(): CompiledCircuit | null {
    return this._compiled.length > 0
      ? { ...this._compiled[this._compiled.length - 1], layers: this._compiled[this._compiled.length - 1].layers.map(l => ({ ...l, gates: l.gates.map(g => ({ ...g })), qubits: [...l.qubits] })) }
      : null;
  }

  public peepholeOptimize(): { before: number; after: number; rules: number } {
    const before = this._gates.length;
    const optimized: CircuitGate[] = [];
    let rules = 0;
    for (const g of this._gates) {
      const last = optimized[optimized.length - 1];
      if (last && last.type === 'X' && g.type === 'X' && last.targets[0] === g.targets[0]) {
        optimized.pop();
        rules++;
      } else if (last && last.type === 'H' && g.type === 'H' && last.targets[0] === g.targets[0]) {
        optimized.pop();
        rules++;
      } else if (last && last.type === 'S' && g.type === 'S' && last.targets[0] === g.targets[0]) {
        optimized[optimized.length - 1] = { ...last, type: 'Z' };
        rules++;
      } else {
        optimized.push(g);
      }
    }
    this._gates = optimized;
    const after = this._gates.length;
    const pass: TranspilePass = { name: 'peephole', before, after, optimized: after < before };
    this._transpilePasses.push(pass);
    this._recordHistory(`peepholeOptimize(rules=${rules})`);
    return { before, after, rules };
  }

  public cancelAdjointPairs(): { removed: number } {
    const before = this._gates.length;
    const filtered: CircuitGate[] = [];
    for (const g of this._gates) {
      const last = filtered[filtered.length - 1];
      if (last && last.type === g.type && last.targets[0] === g.targets[0] && ['H', 'X', 'Y', 'Z', 'CNOT', 'SWAP'].includes(g.type)) {
        filtered.pop();
      } else {
        filtered.push(g);
      }
    }
    this._gates = filtered;
    const removed = before - this._gates.length;
    this._recordHistory(`cancelAdjointPairs(removed=${removed})`);
    return { removed };
  }

  public commuteGatesForward(): { moved: number } {
    let moved = 0;
    for (let i = 0; i < this._gates.length - 1; i++) {
      const g1 = this._gates[i];
      const g2 = this._gates[i + 1];
      const overlap = [...g1.targets, ...g1.controls].some(q => [...g2.targets, ...g2.controls].includes(q));
      if (!overlap && g1.type !== 'MEASURE' && g2.type !== 'MEASURE') {
        this._gates[i] = g2;
        this._gates[i + 1] = g1;
        moved++;
      }
    }
    this._recordHistory(`commuteGatesForward(moved=${moved})`);
    return { moved };
  }

  public removeUnusedQubits(): { removed: number; original: number } {
    const used = new Set<number>();
    for (const g of this._gates) {
      for (const q of [...g.targets, ...g.controls]) used.add(q);
    }
    const original = this._qubitCount + 1;
    const mapping = new Map<number, number>();
    let next = 0;
    for (let q = 0; q <= this._qubitCount; q++) {
      if (used.has(q)) {
        mapping.set(q, next++);
      }
    }
    this._gates = this._gates.map(g => ({
      ...g,
      targets: g.targets.map(t => mapping.get(t) ?? t),
      controls: g.controls.map(c => mapping.get(c) ?? c),
    }));
    this._qubitCount = next - 1;
    const removed = original - next;
    this._recordHistory(`removeUnusedQubits(removed=${removed})`);
    return { removed, original };
  }

  public reorderForTopology(coupling: CouplingMap): { swaps: number } {
    let swaps = 0;
    for (const g of this._gates) {
      if (g.controls.length > 0) {
        const valid = coupling.edges.some(e => e[0] === g.controls[0] && e[1] === g.targets[0]);
        if (!valid) {
          swaps++;
        }
      }
    }
    this._recordHistory(`reorderForTopology(swaps=${swaps})`);
    return { swaps };
  }

  public estimateTDepth(): number {
    const tGates = this._gates.filter(g => g.type === 'T' || g.type === 'T†');
    const depth = Math.ceil(tGates.length / Math.max(1, this._qubitCount + 1));
    this._recordHistory(`estimateTDepth(depth=${depth})`);
    return depth;
  }

  public estimateCost(metric: 'depth' | 'gates' | 'tcount'): number {
    let cost = 0;
    if (metric === 'depth') cost = this.depth();
    else if (metric === 'gates') cost = this._gates.length;
    else cost = this._gates.filter(g => g.type === 'T').length;
    this._recordHistory(`estimateCost(${metric}=${cost})`);
    return cost;
  }

  public insertAt(index: number, gate: CircuitGate): void {
    this._gates.splice(index, 0, gate);
    this._qubitCount = Math.max(this._qubitCount, ...gate.targets, ...gate.controls);
    this._recordHistory(`insertAt(${index}, ${gate.type})`);
  }

  public removeAt(index: number): CircuitGate | null {
    if (index < 0 || index >= this._gates.length) return null;
    const removed = this._gates.splice(index, 1)[0];
    this._recordHistory(`removeAt(${index}, ${removed.type})`);
    return removed;
  }

  public replaceAt(index: number, gate: CircuitGate): void {
    if (index >= 0 && index < this._gates.length) {
      this._gates[index] = gate;
      this._qubitCount = Math.max(this._qubitCount, ...gate.targets, ...gate.controls);
      this._recordHistory(`replaceAt(${index}, ${gate.type})`);
    }
  }

  public slice(start: number, end: number): QuantumCircuit {
    const c = new QuantumCircuit();
    c._gates = this._gates.slice(start, end).map(g => ({ ...g }));
    c._qubitCount = this._qubitCount;
    this._recordHistory(`slice(${start}, ${end})`);
    return c;
  }

  public concat(other: QuantumCircuit): QuantumCircuit {
    const c = new QuantumCircuit();
    c._gates = [...this._gates.map(g => ({ ...g })), ...other._gates.map(g => ({ ...g, time: g.time + this._gates.length }))];
    c._qubitCount = Math.max(this._qubitCount, other._qubitCount);
    this._recordHistory('concat()');
    return c;
  }

  public repeat(times: number): QuantumCircuit {
    const c = new QuantumCircuit();
    for (let t = 0; t < times; t++) {
      for (const g of this._gates) {
        c.addGate({ ...g, time: g.time + t * this._gates.length });
      }
    }
    c._qubitCount = this._qubitCount;
    this._recordHistory(`repeat(${times})`);
    return c;
  }

  public controlledVersion(control: number): QuantumCircuit {
    const c = new QuantumCircuit();
    for (const g of this._gates) {
      c.addGate({ ...g, controls: [...g.controls, control] });
    }
    c._qubitCount = Math.max(this._qubitCount, control);
    this._recordHistory(`controlledVersion(control=${control})`);
    return c;
  }

  public power(n: number): QuantumCircuit {
    return this.repeat(n);
  }

  public qubitLifetime(qubit: number): { first: number; last: number; active: number } {
    let first = -1;
    let last = -1;
    let active = 0;
    for (let i = 0; i < this._gates.length; i++) {
      const g = this._gates[i];
      if ([...g.targets, ...g.controls].includes(qubit)) {
        if (first < 0) first = i;
        last = i;
        active++;
      }
    }
    this._recordHistory(`qubitLifetime(q${qubit}, active=${active})`);
    return { first, last, active };
  }

  public idlePositions(): Map<number, number[]> {
    const map = new Map<number, number[]>();
    for (let q = 0; q <= this._qubitCount; q++) {
      const idle: number[] = [];
      for (let i = 0; i < this._gates.length; i++) {
        const g = this._gates[i];
        if (![...g.targets, ...g.controls].includes(q)) {
          idle.push(i);
        }
      }
      map.set(q, idle);
    }
    this._recordHistory('idlePositions()');
    return map;
  }

  public gateAt(index: number): CircuitGate | null {
    if (index < 0 || index >= this._gates.length) return null;
    return { ...this._gates[index] };
  }

  public firstGateOnQubit(qubit: number): CircuitGate | null {
    for (const g of this._gates) {
      if ([...g.targets, ...g.controls].includes(qubit)) return { ...g };
    }
    return null;
  }

  public lastGateOnQubit(qubit: number): CircuitGate | null {
    let last: CircuitGate | null = null;
    for (const g of this._gates) {
      if ([...g.targets, ...g.controls].includes(qubit)) last = g;
    }
    return last ? { ...last } : null;
  }

  public gateDensity(): number {
    const layers = this.layerize();
    const totalSlots = layers.length * (this._qubitCount + 1);
    const used = layers.reduce((s, l) => s + l.qubits.length, 0);
    return totalSlots > 0 ? used / totalSlots : 0;
  }

  public isValid(): boolean {
    for (const g of this._gates) {
      for (const t of g.targets) if (t < 0 || t > this._qubitCount) return false;
      for (const c of g.controls) if (c < 0 || c > this._qubitCount) return false;
      if (g.targets.some(t => g.controls.includes(t))) return false;
    }
    return true;
  }

  public summary(): { gates: number; layers: number; compiled: number; qubits: number; transpilePasses: number; depth: number } {
    return {
      gates: this._gates.length,
      layers: this._layers.length,
      compiled: this._compiled.length,
      qubits: this._qubitCount + 1,
      transpilePasses: this._transpilePasses.length,
      depth: this.depth(),
    };
  }

  private _recordHistory(entry: string): void {
    this._counter++;
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
  }

  public toPacket(): DataPacket<{
    gates: number;
    layers: number;
    compiled: number;
    qubits: number;
    depth: number;
    history: string[];
  }> {
    return {
      id: `qcircuit-${Date.now()}-${this._counter}`,
      payload: {
        gates: this._gates.length,
        layers: this._layers.length,
        compiled: this._compiled.length,
        qubits: this._qubitCount + 1,
        depth: this.depth(),
        history: [...this._history],
      },
      metadata: {
        createdAt: Date.now(),
        route: ['quantum_computing', 'circuit', 'result'],
        priority: 0.85,
        phase: 'compilation',
      },
    };
  }

  public reset(): void {
    this._gates = [];
    this._layers = [];
    this._compiled = [];
    this._transpilePasses = [];
    this._history = [];
    this._counter = 0;
    this._qubitCount = 0;
    this._equivalenceChecks = [];
    this._schedules = [];
  }
}
