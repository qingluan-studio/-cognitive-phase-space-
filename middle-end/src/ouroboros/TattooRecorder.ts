/**
 * 纹身记录器：将关键日志以不可擦除形式刻入系统皮层。
 * 关键日志被刻入"皮层"成为永久纹身，不可被任何遗忘机制擦除，
 * 永久供后续系统读取。
 */

export interface Tattoo {
  id: string;
  ink: string;
  severity: 'minor' | 'major' | 'critical';
  inscribedAt: number;
  location: string;
  readCount: number;
}

export interface ArchiveQuery {
  predicate: (t: Tattoo) => boolean;
  limit: number;
}

export class TattooRecorder {
  private _tattoos: Tattoo[] = [];
  private _locations: string[] = ['cortex', 'spine', 'forearm', 'palm'];
  private _nextLocation: number = 0;

  /** 把关键日志刻入皮层，成为不可擦除的纹身。 */
  inscribe(ink: string, severity: Tattoo['severity']): Tattoo {
    const location = this._locations[this._nextLocation % this._locations.length];
    this._nextLocation++;
    const tattoo: Tattoo = {
      id: `tattoo-${Date.now()}-${this._tattoos.length}`,
      ink,
      severity,
      inscribedAt: Date.now(),
      location,
      readCount: 0,
    };
    this._tattoos.push(tattoo);
    return tattoo;
  }

  /** 读取纹身内容，记录读取次数。 */
  read(id: string): string | null {
    const t = this._tattoos.find(x => x.id === id);
    if (!t) return null;
    t.readCount++;
    return t.ink;
  }

  /** 纹身永久存在，此方法始终返回 true。 */
  isPermanent(_id: string): boolean {
    return true;
  }

  /** 擦除尝试：永远失败，纹身不可擦除。 */
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

  get criticalCount(): number {
    return this._tattoos.filter(t => t.severity === 'critical').length;
  }

  get totalInked(): number {
    return this._tattoos.length;
  }

  /** 按位置枚举所有纹身。 */
  byLocation(location: string): Tattoo[] {
    return this._tattoos.filter(t => t.location === location);
  }
}
