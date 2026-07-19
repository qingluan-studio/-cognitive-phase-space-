import { DataPacket } from '../shared/types';

/** A node in a Merkle tree. */
export interface MerkleNode {
  readonly hash: string;
  readonly children: string[];
  readonly parent: string | null;
  readonly data: string | null;
}

/** A Merkle proof for a leaf. */
export interface MerkleProof {
  readonly leaf: string;
  readonly path: { hash: string; direction: 'left' | 'right' }[];
  readonly root: string;
}

/** A complete Merkle tree. */
export interface MerkleTree {
  readonly root: string;
  readonly leaves: string[];
  readonly depth: number;
  readonly nodes: number;
}

/** Sparse Merkle tree entry. */
export interface SparseEntry {
  readonly key: string;
  readonly value: string;
  readonly default: string;
}

export class MerkleTreeData {
  private _trees: Map<string, MerkleTree> = new Map();
  private _proofs: MerkleProof[] = [];
  private _history: string[] = [];
  private _counter = 0;
  private _nodes: Map<string, MerkleNode> = new Map();

  get treeCount(): number {
    return this._trees.size;
  }

  get proofCount(): number {
    return this._proofs.length;
  }

  get history(): string[] {
    return [...this._history];
  }

  public build(leaves: string[]): MerkleTree {
    if (leaves.length === 0) {
      const empty: MerkleTree = { root: '', leaves: [], depth: 0, nodes: 0 };
      return empty;
    }
    let level = leaves.map(l => this.hash(l));
    let depth = 0;
    const allNodes: MerkleNode[] = [];
    while (level.length > 1) {
      const next: string[] = [];
      for (let i = 0; i < level.length; i += 2) {
        const left = level[i];
        const right = i + 1 < level.length ? level[i + 1] : level[i];
        const parent = this.hash(left + right);
        next.push(parent);
        allNodes.push({ hash: parent, children: [left, right], parent: null, data: null });
      }
      level = next;
      depth++;
    }
    const tree: MerkleTree = { root: level[0], leaves: [...leaves], depth: depth + 1, nodes: allNodes.length + leaves.length };
    this._trees.set(`tree-${this._counter++}`, tree);
    this._recordHistory(`build(leaves=${leaves.length})`);
    return tree;
  }

  public hash(data: string): string {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const chr = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + chr;
      hash |= 0;
    }
    const hex = Math.abs(hash).toString(16).padStart(8, '0');
    this._recordHistory(`hash(len=${data.length})`);
    return hex;
  }

  public verifyProof(leaf: string, proof: MerkleProof, root: string): boolean {
    let computed = this.hash(leaf);
    for (const step of proof.path) {
      computed = step.direction === 'left' ? this.hash(step.hash + computed) : this.hash(computed + step.hash);
    }
    const valid = computed === root;
    this._recordHistory(`verifyProof(valid=${valid})`);
    return valid;
  }

  public getProof(leaf: string, tree: MerkleTree): MerkleProof {
    const index = tree.leaves.indexOf(leaf);
    const path: { hash: string; direction: 'left' | 'right' }[] = [];
    let current = this.hash(leaf);
    let level = tree.leaves.map(l => this.hash(l));
    let idx = index;
    while (level.length > 1) {
      const siblingIdx = idx % 2 === 0 ? idx + 1 : idx - 1;
      if (siblingIdx < level.length) {
        path.push({
          hash: level[siblingIdx],
          direction: idx % 2 === 0 ? 'right' : 'left',
        });
      }
      const next: string[] = [];
      for (let i = 0; i < level.length; i += 2) {
        const left = level[i];
        const right = i + 1 < level.length ? level[i + 1] : level[i];
        next.push(this.hash(left + right));
      }
      level = next;
      idx = Math.floor(idx / 2);
      current = level[idx] ?? current;
    }
    const proof: MerkleProof = { leaf, path, root: tree.root };
    this._proofs.push(proof);
    this._recordHistory(`getProof(leaf=${leaf})`);
    return proof;
  }

  public updateLeaf(leaf: string, newValue: string, tree: MerkleTree): MerkleTree {
    const leaves = tree.leaves.map(l => (l === leaf ? newValue : l));
    const rebuilt = this.build(leaves);
    this._recordHistory(`updateLeaf(leaf=${leaf})`);
    return rebuilt;
  }

  public appendLeaf(leaf: string, tree: MerkleTree): MerkleTree {
    const leaves = [...tree.leaves, leaf];
    const rebuilt = this.build(leaves);
    this._recordHistory(`appendLeaf(leaf=${leaf})`);
    return rebuilt;
  }

  public merkleRoot(tree: MerkleTree): string {
    this._recordHistory(`merkleRoot(${tree.root})`);
    return tree.root;
  }

  public patriciaMerkle(key: string, value: string): { root: string; key: string; value: string } {
    const root = this.hash(`patricia:${key}:${value}`);
    this._recordHistory(`patriciaMerkle(key=${key})`);
    return { root, key, value };
  }

  public sparseMerkle(key: string, value: string): { root: string; key: string; value: string; default: string } {
    const defaultHash = this.hash('0');
    const root = this.hash(`${key}:${value}:${defaultHash}`);
    this._recordHistory(`sparseMerkle(key=${key})`);
    return { root, key, value, default: defaultHash };
  }

  public merkleMountainRange(peaks: string[]): { root: string; peaks: number; height: number } {
    const root = peaks.length > 0 ? this.hash(peaks.join(':')) : '';
    const height = Math.ceil(Math.log2(Math.max(1, peaks.length)));
    this._recordHistory(`mmr(peaks=${peaks.length})`);
    return { root, peaks: peaks.length, height };
  }

  public inclusionProof(index: number, tree: MerkleTree): { included: boolean; index: number; root: string } {
    const included = index >= 0 && index < tree.leaves.length;
    this._recordHistory(`inclusionProof(idx=${index}, included=${included})`);
    return { included, index, root: tree.root };
  }

  public consistencyProof(oldRoot: string, newRoot: string): { consistent: boolean; oldRoot: string; newRoot: string } {
    const consistent = newRoot.includes(oldRoot.substring(0, 4));
    this._recordHistory(`consistencyProof(consistent=${consistent})`);
    return { consistent, oldRoot, newRoot };
  }

  public auditProof(leaf: string, root: string, proof: MerkleProof): { verified: boolean; leaf: string; root: string } {
    const verified = this.verifyProof(leaf, proof, root);
    this._recordHistory(`auditProof(verified=${verified})`);
    return { verified, leaf, root };
  }

  public proofs(): MerkleProof[] {
    return this._proofs.map(p => ({ ...p, path: p.path.map(s => ({ ...s })) }));
  }

  public trees(): MerkleTree[] {
    return Array.from(this._trees.values()).map(t => ({ ...t, leaves: [...t.leaves] }));
  }

  public lastProof(): MerkleProof | null {
    return this._proofs.length > 0
      ? { ...this._proofs[this._proofs.length - 1], path: this._proofs[this._proofs.length - 1].path.map(s => ({ ...s })) }
      : null;
  }

  public summary(): { trees: number; proofs: number; nodes: number; historyLength: number; counter: number } {
    return {
      trees: this._trees.size,
      proofs: this._proofs.length,
      nodes: this._nodes.size,
      historyLength: this._history.length,
      counter: this._counter,
    };
  }

  public toJSON(): Record<string, unknown> {
    return {
      trees: this._trees.size,
      proofs: this._proofs.length,
      nodes: this._nodes.size,
      history: [...this._history],
      rootHashes: Array.from(this._trees.values()).map(t => t.root),
    };
  }

  public validate(): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    for (const tree of this._trees.values()) {
      if (tree.depth < 0) issues.push(`tree ${tree.root}: negative depth`);
      if (tree.nodes < tree.leaves.length) issues.push(`tree ${tree.root}: node count below leaf count`);
      if (tree.leaves.length === 0 && tree.root !== '') issues.push('empty tree should have empty root');
    }
    for (const proof of this._proofs) {
      if (proof.path.length > 64) issues.push(`proof for ${proof.leaf}: path exceeds 64 levels`);
    }
    return { valid: issues.length === 0, issues };
  }

  public batchVerify(leaves: string[], proofs: MerkleProof[], root: string): { verified: number; failed: number; root: string } {
    let verified = 0;
    let failed = 0;
    for (let i = 0; i < leaves.length; i++) {
      const leaf = leaves[i];
      const proof = proofs[i];
      if (!leaf || !proof) {
        failed++;
        continue;
      }
      if (this.verifyProof(leaf, proof, root)) verified++;
      else failed++;
    }
    this._recordHistory(`batchVerify(verified=${verified}/${leaves.length})`);
    return { verified, failed, root };
  }

  public treeStatistics(tree: MerkleTree): {
    leaves: number;
    depth: number;
    nodes: number;
    branchingFactor: number;
    compactness: number;
  } {
    const branchingFactor = tree.nodes > 0 ? tree.leaves.length / tree.nodes : 0;
    const optimal = Math.max(1, Math.ceil(Math.log2(Math.max(1, tree.leaves.length))));
    const compactness = optimal > 0 ? optimal / Math.max(1, tree.depth) : 0;
    return {
      leaves: tree.leaves.length,
      depth: tree.depth,
      nodes: tree.nodes,
      branchingFactor,
      compactness,
    };
  }

  public rangeProof(start: number, end: number, tree: MerkleTree): {
    leaves: string[];
    root: string;
    range: { start: number; end: number };
    valid: boolean;
  } {
    const leaves = tree.leaves.slice(start, end + 1);
    const valid = start >= 0 && end < tree.leaves.length && start <= end;
    this._recordHistory(`rangeProof([${start},${end}])`);
    return { leaves, root: tree.root, range: { start, end }, valid };
  }

  private _recordHistory(entry: string): void {
    this._counter++;
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
  }

  public toPacket(): DataPacket<{
    trees: number;
    proofs: number;
    nodes: number;
    history: string[];
  }> {
    return {
      id: `merkle-${Date.now()}-${this._counter}`,
      payload: {
        trees: this._trees.size,
        proofs: this._proofs.length,
        nodes: this._nodes.size,
        history: [...this._history],
      },
      metadata: {
        createdAt: Date.now(),
        route: ['blockchain', 'merkle', 'result'],
        priority: 0.85,
        phase: 'integrity',
      },
    };
  }

  public reset(): void {
    this._trees.clear();
    this._nodes.clear();
    this._proofs = [];
    this._history = [];
    this._counter = 0;
  }
}
