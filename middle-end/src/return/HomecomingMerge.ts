export interface HomecomingMergeData {
  incoming: string[];
  merged: string[];
  conflicts: string[];
  integrated: boolean;
  mergeEntropy: number;
  coherence: number;
}

interface _CapabilityNode {
  name: string;
  version: number;
  dependencies: Set<string>;
}

export class HomecomingMerge {
  private _incoming: string[];
  private _merged: string[];
  private _conflicts: string[];
  private _integrated: boolean;
  private _coreCapabilities: Map<string, _CapabilityNode>;
  private _resolveStrategies: Map<string, 'rename' | 'override' | 'version'>;

  constructor(coreCapabilities: string[] = []) {
    this._incoming = [];
    this._merged = [];
    this._conflicts = [];
    this._integrated = false;
    this._coreCapabilities = new Map<string, _CapabilityNode>();
    for (const cap of coreCapabilities) {
      this._coreCapabilities.set(cap, { name: cap, version: 1, dependencies: new Set<string>() });
    }
    this._resolveStrategies = new Map<string, 'rename' | 'override' | 'version'>();
  }

  get incomingCount(): number {
    return this._incoming.length;
  }

  get conflictCount(): number {
    return this._conflicts.length;
  }

  get mergeEntropy(): number {
    const total = this._merged.length + this._conflicts.length + this._incoming.length;
    if (total === 0) return 0;
    const p1 = this._merged.length / total;
    const p2 = this._conflicts.length / total;
    const p3 = this._incoming.length / total;
    let h = 0;
    if (p1 > 0) h -= p1 * Math.log2(p1);
    if (p2 > 0) h -= p2 * Math.log2(p2);
    if (p3 > 0) h -= p3 * Math.log2(p3);
    return h / Math.log2(3);
  }

  get coherence(): number {
    if (this._coreCapabilities.size === 0) return 1;
    let connected = 0;
    let total = 0;
    for (const node of this._coreCapabilities.values()) {
      for (const dep of node.dependencies) {
        total += 1;
        if (this._coreCapabilities.has(dep)) connected += 1;
      }
    }
    return total === 0 ? 1 : connected / total;
  }

  public arrive(capability: string, dependencies: string[] = []): void {
    if (!this._incoming.includes(capability)) {
      this._incoming.push(capability);
      this._resolveStrategies.set(capability, 'rename');
      const node = this._coreCapabilities.get(capability) ?? { name: capability, version: 0, dependencies: new Set<string>() };
      for (const dep of dependencies) node.dependencies.add(dep);
      this._coreCapabilities.set(capability, node);
    }
  }

  public merge(capability: string): boolean {
    if (this._coreCapabilities.has(capability) && this._coreCapabilities.get(capability)!.version > 0) {
      this._conflicts.push(capability);
      return false;
    }
    const node = this._coreCapabilities.get(capability);
    if (node) {
      node.version = 1;
    } else {
      this._coreCapabilities.set(capability, { name: capability, version: 1, dependencies: new Set<string>() });
    }
    this._merged.push(capability);
    this._incoming = this._incoming.filter((c) => c !== capability);
    return true;
  }

  public resolveConflict(capability: string, rename: string): void {
    if (this._conflicts.includes(capability)) {
      const original = this._coreCapabilities.get(capability);
      this._coreCapabilities.set(rename, {
        name: rename,
        version: (original?.version ?? 1) + 1,
        dependencies: original?.dependencies ?? new Set<string>(),
      });
      this._merged.push(rename);
      this._conflicts = this._conflicts.filter((c) => c !== capability);
    }
  }

  public linkDependency(from: string, to: string): boolean {
    const fromNode = this._coreCapabilities.get(from);
    if (!fromNode) return false;
    fromNode.dependencies.add(to);
    return true;
  }

  public setStrategy(capability: string, strategy: 'rename' | 'override' | 'version'): void {
    this._resolveStrategies.set(capability, strategy);
  }

  public integrate(): boolean {
    if (this._incoming.length > 0 || this._conflicts.length > 0) return false;
    this._integrated = true;
    return true;
  }

  public capabilities(): string[] {
    return Array.from(this._coreCapabilities.keys());
  }

  public dependencyGraph(): Map<string, string[]> {
    const graph = new Map<string, string[]>();
    for (const [name, node] of this._coreCapabilities) {
      graph.set(name, Array.from(node.dependencies));
    }
    return graph;
  }

  public report(): HomecomingMergeData {
    return {
      incoming: [...this._incoming],
      merged: [...this._merged],
      conflicts: [...this._conflicts],
      integrated: this._integrated,
      mergeEntropy: this.mergeEntropy,
      coherence: this.coherence,
    };
  }
}
