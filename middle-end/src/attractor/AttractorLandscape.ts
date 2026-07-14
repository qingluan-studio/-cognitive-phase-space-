export interface AttractorLandscapeData {
  readonly landscapeId: string;
  basins: Record<string, { x: number; y: number; strength: number; radius: number }>;
}

export interface BasinAssignment {
  point: { x: number; y: number };
  assignedBasin: string | null;
  distances: Record<string, number>;
}

export class AttractorLandscape {
  private _data: AttractorLandscapeData;
  private _assignments: BasinAssignment[] = [];
  private _basinBoundaries: Map<string, number> = new Map();
  private _totalPoints: number = 0;
  private _voronoiCells: Map<string, { x: number; y: number }[]> = new Map();
  private _entropyHistory: number[] = [];
  private _adjacencyGraph: Map<string, Set<string>> = new Map();
  private _basinWeights: Map<string, number> = new Map();

  constructor(data: AttractorLandscapeData) {
    this._data = { ...data, basins: { ...data.basins } };
    this._buildAdjacencyGraph();
  }

  get landscapeId(): string {
    return this._data.landscapeId;
  }

  get basinCount(): number {
    return Object.keys(this._data.basins).length;
  }

  get totalPoints(): number {
    return this._totalPoints;
  }

  get entropyHistory(): number[] {
    return [...this._entropyHistory];
  }

  public addBasin(name: string, x: number, y: number, strength: number, radius: number): void {
    this._data.basins[name] = { x, y, strength, radius };
    this._basinWeights.set(name, strength * radius);
    this._buildAdjacencyGraph();
  }

  public removeBasin(name: string): void {
    delete this._data.basins[name];
    this._basinBoundaries.delete(name);
    this._voronoiCells.delete(name);
    this._basinWeights.delete(name);
    this._buildAdjacencyGraph();
  }

  public assignPoint(x: number, y: number): BasinAssignment {
    const distances: Record<string, number> = {};
    let assignedBasin: string | null = null;
    let maxInfluence = 0;
    Object.entries(this._data.basins).forEach(([name, basin]) => {
      const dist = Math.sqrt((x - basin.x) ** 2 + (y - basin.y) ** 2);
      distances[name] = dist;
      if (dist <= basin.radius) {
        const influence = basin.strength * (1 - dist / basin.radius);
        if (influence > maxInfluence) {
          maxInfluence = influence;
          assignedBasin = name;
        }
      }
    });
    const assignment: BasinAssignment = {
      point: { x, y },
      assignedBasin,
      distances,
    };
    this._assignments.push(assignment);
    this._totalPoints++;
    if (assignedBasin) {
      this._basinBoundaries.set(
        assignedBasin,
        (this._basinBoundaries.get(assignedBasin) ?? 0) + 1
      );
    }
    if (this._assignments.length > 100) {
      this._assignments.shift();
    }
    this._updateEntropy();
    return assignment;
  }

  private _updateEntropy(): void {
    const total = this._totalPoints;
    if (total === 0) return;
    let entropy = 0;
    for (const count of this._basinBoundaries.values()) {
      const p = count / total;
      entropy -= p * Math.log2(p);
    }
    this._entropyHistory.push(entropy);
    if (this._entropyHistory.length > 50) {
      this._entropyHistory.shift();
    }
  }

  private _buildAdjacencyGraph(): void {
    this._adjacencyGraph.clear();
    const names = Object.keys(this._data.basins);
    for (const name of names) {
      this._adjacencyGraph.set(name, new Set());
    }
    for (let i = 0; i < names.length; i++) {
      for (let j = i + 1; j < names.length; j++) {
        const a = this._data.basins[names[i]];
        const b = this._data.basins[names[j]];
        const dist = Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
        if (dist <= a.radius + b.radius) {
          this._adjacencyGraph.get(names[i])?.add(names[j]);
          this._adjacencyGraph.get(names[j])?.add(names[i]);
        }
      }
    }
  }

  public computeVoronoiCell(basinName: string): { x: number; y: number }[] {
    const target = this._data.basins[basinName];
    if (!target) return [];
    const cell: { x: number; y: number }[] = [];
    const steps = 36;
    for (let i = 0; i < steps; i++) {
      const theta = (i / steps) * 2 * Math.PI;
      let r = target.radius * 2;
      for (const [name, basin] of Object.entries(this._data.basins)) {
        if (name === basinName) continue;
        const dx = target.x + r * Math.cos(theta) - basin.x;
        const dy = target.y + r * Math.sin(theta) - basin.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        const bisect = (target.x + basin.x) / 2;
        const bisectY = (target.y + basin.y) / 2;
        const distToBisect = Math.sqrt(
          (target.x + r * Math.cos(theta) - bisect) ** 2 +
          (target.y + r * Math.sin(theta) - bisectY) ** 2
        );
        if (distToBisect < r * 0.5) {
          r = Math.min(r, Math.sqrt((target.x - basin.x) ** 2 + (target.y - basin.y) ** 2) / 2);
        }
      }
      cell.push({ x: target.x + r * Math.cos(theta), y: target.y + r * Math.sin(theta) });
    }
    this._voronoiCells.set(basinName, cell);
    return cell;
  }

  public adjustBasinStrength(name: string, delta: number): void {
    const basin = this._data.basins[name];
    if (basin) {
      basin.strength = Math.max(0, Math.min(1, basin.strength + delta));
      this._basinWeights.set(name, basin.strength * basin.radius);
    }
  }

  public resizeBasin(name: string, newRadius: number): void {
    const basin = this._data.basins[name];
    if (basin) {
      basin.radius = Math.max(0.01, newRadius);
      this._basinWeights.set(name, basin.strength * basin.radius);
      this._buildAdjacencyGraph();
    }
  }

  public moveBasin(name: string, x: number, y: number): void {
    const basin = this._data.basins[name];
    if (basin) {
      basin.x = x;
      basin.y = y;
      this._buildAdjacencyGraph();
    }
  }

  public computeBasinDistribution(): Record<string, number> {
    const dist: Record<string, number> = {};
    this._basinBoundaries.forEach((count, name) => {
      dist[name] = count;
    });
    return dist;
  }

  public findWatershed(point: { x: number; y: number }): string[] {
    const candidates: string[] = [];
    Object.entries(this._data.basins).forEach(([name, basin]) => {
      const dist = Math.sqrt((point.x - basin.x) ** 2 + (point.y - basin.y) ** 2);
      if (dist <= basin.radius * 1.2) {
        candidates.push(name);
      }
    });
    return candidates;
  }

  public computeBasinEntropy(): number {
    const total = this._totalPoints;
    if (total === 0) return 0;
    let entropy = 0;
    for (const count of this._basinBoundaries.values()) {
      const p = count / total;
      entropy -= p * Math.log2(p);
    }
    return entropy;
  }

  public getNeighbors(basinName: string): string[] {
    const set = this._adjacencyGraph.get(basinName);
    return set ? Array.from(set) : [];
  }

  public landscapeReport(): Record<string, unknown> {
    return {
      landscapeId: this.landscapeId,
      basinCount: this.basinCount,
      basins: Object.fromEntries(
        Object.entries(this._data.basins).map(([k, v]) => [
          k,
          { x: v.x, y: v.y, strength: v.strength.toFixed(3), radius: v.radius.toFixed(3) },
        ])
      ),
      totalPointsAssigned: this._totalPoints,
      distribution: this.computeBasinDistribution(),
      recentAssignments: this._assignments.length,
      basinEntropy: this.computeBasinEntropy().toFixed(4),
      adjacencyPairs: Array.from(this._adjacencyGraph.entries()).map(([k, v]) => [k, Array.from(v)]),
    };
  }
}
