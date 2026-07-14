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
  private _voronoiSites: Array<{ x: number; y: number; weight: number }>;
  private _expansionGraph: Map<string, Set<string>>;
  private _frontier: string[];
  private _connectivityScore: number;

  constructor(outpost: { x: number; y: number } = { x: 0, y: 0 }) {
    this._landed = false;
    this._deployed = [];
    this._outpost = outpost;
    this._territory = 1;
    this._terrain = new Set<string>();
    this._terrain.add(`${outpost.x},${outpost.y}`);
    this._voronoiSites = [{ x: outpost.x, y: outpost.y, weight: 1 }];
    this._expansionGraph = new Map<string, Set<string>>();
    this._frontier = [`${outpost.x},${outpost.y}`];
    this._connectivityScore = 0;
  }

  get landed(): boolean {
    return this._landed;
  }

  get territory(): number {
    return this._territory;
  }

  get connectivityScore(): number {
    return this._connectivityScore;
  }

  get frontierSize(): number {
    return this._frontier.length;
  }

  public land(): void {
    this._landed = true;
  }

  public deploy(species: string): boolean {
    if (!this._landed) {
      return false;
    }
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
      this._frontier.push(key);
      this._updateGraph(key, nx, ny);
      this._voronoiSites.push({ x: nx, y: ny, weight: 1 });
    }
    this._outpost = { x: nx, y: ny };
    this._recomputeConnectivity();
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

  public bfsReachable(start: string): Set<string> {
    const reachable = new Set<string>();
    const queue: string[] = [start];
    reachable.add(start);
    while (queue.length > 0) {
      const curr = queue.shift()!;
      for (const next of this._expansionGraph.get(curr) ?? []) {
        if (!reachable.has(next)) {
          reachable.add(next);
          queue.push(next);
        }
      }
    }
    return reachable;
  }

  public computeVoronoiArea(siteIndex: number): number {
    if (siteIndex < 0 || siteIndex >= this._voronoiSites.length) {
      return 0;
    }
    const site = this._voronoiSites[siteIndex];
    let area = 0;
    for (const key of this._terrain) {
      const [x, y] = key.split(',').map(Number);
      let minDist = Infinity;
      let winner = -1;
      for (let i = 0; i < this._voronoiSites.length; i++) {
        const s = this._voronoiSites[i];
        const dist = Math.sqrt((x - s.x) ** 2 + (y - s.y) ** 2) / s.weight;
        if (dist < minDist) {
          minDist = dist;
          winner = i;
        }
      }
      if (winner === siteIndex) {
        area += 1;
      }
    }
    return area;
  }

  public computePerimeter(): number {
    let perimeter = 0;
    for (const key of this._terrain) {
      const [x, y] = key.split(',').map(Number);
      const neighbors = [
        `${x + 1},${y}`,
        `${x - 1},${y}`,
        `${x},${y + 1}`,
        `${x},${y - 1}`,
      ];
      for (const n of neighbors) {
        if (!this._terrain.has(n)) {
          perimeter += 1;
        }
      }
    }
    return perimeter;
  }

  private _updateGraph(key: string, x: number, y: number): void {
    const set = new Set<string>();
    const neighbors = [
      `${x + 1},${y}`,
      `${x - 1},${y}`,
      `${x},${y + 1}`,
      `${x},${y - 1}`,
    ];
    for (const n of neighbors) {
      if (this._terrain.has(n)) {
        set.add(n);
        const neighborSet = this._expansionGraph.get(n) ?? new Set<string>();
        neighborSet.add(key);
        this._expansionGraph.set(n, neighborSet);
      }
    }
    this._expansionGraph.set(key, set);
  }

  private _recomputeConnectivity(): void {
    if (this._terrain.size === 0) {
      this._connectivityScore = 0;
      return;
    }
    const edges = Array.from(this._expansionGraph.values()).reduce((s, set) => s + set.size, 0) / 2;
    const nodes = this._terrain.size;
    const maxEdges = (nodes * (nodes - 1)) / 2;
    this._connectivityScore = maxEdges === 0 ? 0 : edges / maxEdges;
  }
}
