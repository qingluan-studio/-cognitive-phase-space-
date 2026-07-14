/**
 * 祖先代码库：最原始的代码，永不修改。
 * 维护一份不可变的最原始代码库，所有读取操作只读，并记录所有访问者与引用。
 */

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

  archive(artifact: AncestralArtifact): void {
    artifact.immutable = this._sealed;
    artifact.sealedAt = Date.now();
    this._artifacts.set(artifact.id, artifact);
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
}
