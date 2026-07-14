/**
 * 物种配对模块：成对保存功能模块以防灭绝。
 * 每个物种必须有两个互补个体，缺一即触发繁殖或迁移。
 */

export interface SpeciesPairData {
  pairs: Array<{ species: string; left: unknown; right: unknown }>;
  orphans: string[];
}

export class SpeciesPair {
  private _pairs: Map<string, { left: unknown; right: unknown }>;
  private _orphans: Map<string, unknown>;

  constructor() {
    this._pairs = new Map<string, { left: unknown; right: unknown }>();
    this._orphans = new Map<string, unknown>();
  }

  get speciesCount(): number {
    return this._pairs.size + this._orphans.size;
  }

  public introduce(species: string, individual: unknown): boolean {
    const existing = this._pairs.get(species);
    if (existing) return false;
    const orphan = this._orphans.get(species);
    if (orphan !== undefined) {
      this._pairs.set(species, { left: orphan, right: individual });
      this._orphans.delete(species);
      return true;
    }
    this._orphans.set(species, individual);
    return false;
  }

  public isPaired(species: string): boolean {
    return this._pairs.has(species);
  }

  public remove(species: string): void {
    this._pairs.delete(species);
    this._orphans.delete(species);
  }

  public breed(species: string, factory: (a: unknown, b: unknown) => unknown): boolean {
    const pair = this._pairs.get(species);
    if (!pair) return false;
    const child = factory(pair.left, pair.right);
    this._orphans.set(`${species}:child`, child);
    return true;
  }

  public orphansList(): string[] {
    return Array.from(this._orphans.keys());
  }

  public report(): SpeciesPairData {
    const pairs: Array<{ species: string; left: unknown; right: unknown }> = [];
    for (const [species, pair] of this._pairs) {
      pairs.push({ species, left: pair.left, right: pair.right });
    }
    return { pairs, orphans: this.orphansList() };
  }

  public migrate(species: string, target: SpeciesPair): boolean {
    const pair = this._pairs.get(species);
    if (!pair) return false;
    target.introduce(species, pair.left);
    target.introduce(species, pair.right);
    this.remove(species);
    return true;
  }
}
