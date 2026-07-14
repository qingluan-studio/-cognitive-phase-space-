export interface AncestralArtifact {
  id: string;
  signature: string;
  content: string;
  sealedAt: number;
  immutable: boolean;
}

export interface AccessRecord {
  artifactId: string;
  accessor: string;
  purpose: string;
  accessedAt: number;
}

export class AncestralCodebase {
  private _artifacts: Map<string, AncestralArtifact> = new Map();
  private _accessLog: AccessRecord[] = [];
  private _sealed = true;
  private _maxLogSize = 500;
  private _lineageGraph: Map<string, Set<string>> = new Map();
  private _mutationMatrix: Map<string, number[]> = new Map();
  private _entropyCache: Map<string, number> = new Map();

  archive(artifact: AncestralArtifact): void {
    artifact.immutable = this._sealed;
    artifact.sealedAt = Date.now();
    this._artifacts.set(artifact.id, artifact);
    this._entropyCache.set(artifact.id, this._computeShannonEntropy(artifact.content));
  }

  read(artifactId: string, accessor: string, purpose: string): AncestralArtifact | null {
    const artifact = this._artifacts.get(artifactId);
    if (!artifact) return null;
    this._accessLog.push({ artifactId, accessor, purpose, accessedAt: Date.now() });
    if (this._accessLog.length > this._maxLogSize) this._accessLog.shift();
    return { ...artifact };
  }

  verifyIntegrity(artifactId: string): boolean {
    const artifact = this._artifacts.get(artifactId);
    if (!artifact) return false;
    return artifact.immutable && artifact.content.length > 0;
  }

  compareLineage(artifactIdA: string, artifactIdB: string): number {
    const a = this._artifacts.get(artifactIdA);
    const b = this._artifacts.get(artifactIdB);
    if (!a || !b) return 0;
    const setA = new Set(a.content);
    const setB = new Set(b.content);
    let common = 0;
    for (const ch of setA) if (setB.has(ch)) common++;
    return common / Math.max(setA.size, setB.size);
  }

  computePhylogeneticDistance(artifactIdA: string, artifactIdB: string): number {
    const sim = this.compareLineage(artifactIdA, artifactIdB);
    return -Math.log(Math.max(1e-10, sim));
  }

  buildLineageGraph(): void {
    this._lineageGraph.clear();
    const ids = Array.from(this._artifacts.keys());
    for (const id of ids) {
      this._lineageGraph.set(id, new Set());
    }
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const dist = this.compareLineage(ids[i], ids[j]);
        if (dist > 0.6) {
          this._lineageGraph.get(ids[i])!.add(ids[j]);
          this._lineageGraph.get(ids[j])!.add(ids[i]);
        }
      }
    }
  }

  computeCentrality(artifactId: string): number {
    if (this._lineageGraph.size === 0) this.buildLineageGraph();
    const neighbors = this._lineageGraph.get(artifactId);
    if (!neighbors) return 0;
    const n = this._lineageGraph.size;
    return neighbors.size / (n - 1);
  }

  getSignature(artifactId: string): string | null {
    return this._artifacts.get(artifactId)?.signature ?? null;
  }

  purgeAccessLog(): number {
    const count = this._accessLog.length;
    this._accessLog = [];
    return count;
  }

  countAccessors(): number {
    const accessors = new Set<string>();
    for (const log of this._accessLog) accessors.add(log.accessor);
    return accessors.size;
  }

  getAccessLog(limit: number = 100): AccessRecord[] {
    return this._accessLog.slice(-limit);
  }

  listArtifacts(): AncestralArtifact[] {
    return Array.from(this._artifacts.values());
  }

  get artifactCount(): number {
    return this._artifacts.size;
  }

  get isSealed(): boolean {
    return this._sealed;
  }

  getTotalEntropy(): number {
    let total = 0;
    for (const e of this._entropyCache.values()) total += e;
    return total;
  }

  private _computeShannonEntropy(content: string): number {
    const freq = new Map<string, number>();
    for (const ch of content) {
      freq.set(ch, (freq.get(ch) ?? 0) + 1);
    }
    let entropy = 0;
    const len = content.length;
    for (const count of freq.values()) {
      const p = count / len;
      entropy -= p * Math.log2(p);
    }
    return entropy;
  }
}
