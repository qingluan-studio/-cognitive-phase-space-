export interface Tattoo {
  id: string;
  ink: string;
  severity: 'minor' | 'major' | 'critical';
  inscribedAt: number;
  location: string;
  readCount: number;
  hash: string;
  previousHash: string | null;
  depth: number;
  signature: string;
}

export interface ArchiveQuery {
  predicate: (t: Tattoo) => boolean;
  limit: number;
}

export class TattooRecorder {
  private _tattoos: Tattoo[] = [];
  private _locations: string[] = ['cortex', 'spine', 'forearm', 'palm'];
  private _nextLocation: number = 0;
  private _merkleRoot: string = '';
  private _totalInked: number = 0;
  private _verificationCount: number = 0;
  private _inkEncoding: number = 36;

  get totalInked(): number {
    return this._totalInked;
  }

  get criticalCount(): number {
    return this._tattoos.filter(t => t.severity === 'critical').length;
  }

  get merkleRoot(): string {
    return this._merkleRoot;
  }

  get verificationCount(): number {
    return this._verificationCount;
  }

  get locations(): string[] {
    return [...this._locations];
  }

  inscribe(ink: string, severity: Tattoo['severity']): Tattoo {
    const location = this._locations[this._nextLocation % this._locations.length];
    this._nextLocation++;
    const prev = this._tattoos[this._tattoos.length - 1] ?? null;
    const hash = this._computeHash(ink + severity + location + Date.now());
    const prevHash = prev ? prev.hash : null;
    const depth = prev ? prev.depth + 1 : 0;
    const signature = this._signInk(ink, hash, depth);
    const tattoo: Tattoo = {
      id: `tattoo-${Date.now()}-${this._tattoos.length}`,
      ink,
      severity,
      inscribedAt: Date.now(),
      location,
      readCount: 0,
      hash,
      previousHash: prevHash,
      depth,
      signature,
    };
    this._tattoos.push(tattoo);
    this._totalInked++;
    this._updateMerkleRoot();
    return tattoo;
  }

  read(id: string): string | null {
    const t = this._tattoos.find(x => x.id === id);
    if (!t) return null;
    t.readCount++;
    return t.ink;
  }

  isPermanent(_id: string): boolean {
    return true;
  }

  erase(_id: string): boolean {
    return false;
  }

  archive(query: ArchiveQuery): Tattoo[] {
    const result = this._tattoos.filter(query.predicate).slice(0, query.limit);
    result.forEach(t => t.readCount++);
    return result;
  }

  getTattoos(): Tattoo[] {
    return [...this._tattoos];
  }

  byLocation(location: string): Tattoo[] {
    return this._tattoos.filter(t => t.location === location);
  }

  verifyChain(): boolean {
    this._verificationCount++;
    for (let i = 1; i < this._tattoos.length; i++) {
      const curr = this._tattoos[i];
      const prev = this._tattoos[i - 1];
      if (curr.previousHash !== prev.hash) return false;
      if (!this._verifySignature(curr)) return false;
    }
    const computedRoot = this._computeMerkleRoot();
    return computedRoot === this._merkleRoot;
  }

  verifyTattoo(id: string): boolean {
    const tattoo = this._tattoos.find(t => t.id === id);
    if (!tattoo) return false;
    const expectedHash = this._computeHash(tattoo.ink + tattoo.severity + tattoo.location + tattoo.inscribedAt);
    return tattoo.hash === expectedHash && this._verifySignature(tattoo);
  }

  findByHash(hash: string): Tattoo | null {
    return this._tattoos.find(t => t.hash === hash) ?? null;
  }

  getChainDepth(): number {
    return this._tattoos.length > 0 ? this._tattoos[this._tattoos.length - 1].depth + 1 : 0;
  }

  getSeverityStats(): Record<string, number> {
    const stats: Record<string, number> = { minor: 0, major: 0, critical: 0 };
    for (const t of this._tattoos) stats[t.severity]++;
    return stats;
  }

  getMostRead(n: number = 5): Tattoo[] {
    return [...this._tattoos].sort((a, b) => b.readCount - a.readCount).slice(0, n);
  }

  searchInk(query: string): Tattoo[] {
    const results: { tattoo: Tattoo; score: number }[] = [];
    const q = query.toLowerCase();
    for (const t of this._tattoos) {
      const ink = t.ink.toLowerCase();
      let score = 0;
      if (ink.includes(q)) score += 0.6;
      const words = q.split(/\s+/);
      let matches = 0;
      for (const w of words) if (ink.includes(w)) matches++;
      score += matches / Math.max(1, words.length) * 0.3;
      score += t.readCount / Math.max(1, this._totalInked) * 0.1;
      if (score > 0.2) results.push({ tattoo: t, score });
    }
    return results.sort((a, b) => b.score - a.score).map(r => r.tattoo);
  }

  private _computeHash(s: string): string {
    let hash = 0;
    for (let i = 0; i < s.length; i++) {
      const char = s.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(this._inkEncoding);
  }

  private _signInk(ink: string, hash: string, depth: number): string {
    const data = ink + hash + depth;
    let sig = 0;
    for (let i = 0; i < data.length; i++) {
      sig = (sig * 31 + data.charCodeAt(i)) >>> 0;
    }
    return sig.toString(this._inkEncoding);
  }

  private _verifySignature(tattoo: Tattoo): boolean {
    const expected = this._signInk(tattoo.ink, tattoo.hash, tattoo.depth);
    return tattoo.signature === expected;
  }

  private _updateMerkleRoot(): void {
    this._merkleRoot = this._computeMerkleRoot();
  }

  private _computeMerkleRoot(): string {
    if (this._tattoos.length === 0) return '';
    let level = this._tattoos.map(t => t.hash);
    while (level.length > 1) {
      const next: string[] = [];
      for (let i = 0; i < level.length; i += 2) {
        const left = level[i];
        const right = i + 1 < level.length ? level[i + 1] : left;
        next.push(this._computeHash(left + right));
      }
      level = next;
    }
    return level[0];
  }
}
