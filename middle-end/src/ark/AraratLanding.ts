/**
 * 亚拉腊登陆模块：核心搁浅在安全地点开始重建。
 * 模拟方舟停靠后释放物种、建立据点、向外扩张的过程。
 */

export interface AraratLandingData {
  landed: boolean;
  deployed: string[];
  outpost: { x: number; y: number };
  territory: number;
}

export class AraratLanding {
  private _landed: boolean;
  private _deployed: string[];
  private _outpost: { x: number; y: number };
  private _territory: number;
  private _terrain: Set<string>;

  constructor(outpost: { x: number; y: number } = { x: 0, y: 0 }) {
    this._landed = false;
    this._deployed = [];
    this._outpost = outpost;
    this._territory = 1;
    this._terrain = new Set<string>();
    this._terrain.add(`${outpost.x},${outpost.y}`);
  }

  get landed(): boolean {
    return this._landed;
  }

  get territory(): number {
    return this._territory;
  }

  public land(): void {
    this._landed = true;
  }

  public deploy(species: string): boolean {
    if (!this._landed) return false;
    if (!this._deployed.includes(species)) {
      this._deployed.push(species);
      return true;
    }
    return false;
  }

  public expand(direction: 'n' | 's' | 'e' | 'w'): void {
    const deltas: Record<string, [number, number]> = {
      n: [0, 1],
      s: [0, -1],
      e: [1, 0],
      w: [-1, 0],
    };
    const [dx, dy] = deltas[direction];
    const nx = this._outpost.x + dx;
    const ny = this._outpost.y + dy;
    const key = `${nx},${ny}`;
    if (!this._terrain.has(key)) {
      this._terrain.add(key);
      this._territory += 1;
    }
    this._outpost = { x: nx, y: ny };
  }

  public establishOutpost(name: string): void {
    this._deployed.push(`outpost:${name}`);
  }

  public report(): AraratLandingData {
    return {
      landed: this._landed,
      deployed: [...this._deployed],
      outpost: { ...this._outpost },
      territory: this._territory,
    };
  }

  public survey(): string[] {
    return Array.from(this._terrain);
  }
}
