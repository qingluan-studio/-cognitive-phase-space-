/**
 * AttractorLandscape - 吸引子景观
 * 多个吸引子在状态空间中的分布，构成一张"景观地图"，
 * 系统根据初始位置落入不同的吸引子盆地。
 */

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

  constructor(data: AttractorLandscapeData) {
    this._data = { ...data, basins: { ...data.basins } };
  }

  get landscapeId(): string {
    return this._data.landscapeId;
  }

  get basinCount(): number {
    return Object.keys(this._data.basins).length;
  }

  public addBasin(name: string, x: number, y: number, strength: number, radius: number): void {
    this._data.basins[name] = { x, y, strength, radius };
  }

  public removeBasin(name: string): void {
    delete this._data.basins[name];
    this._basinBoundaries.delete(name);
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
    return assignment;
  }

  public adjustBasinStrength(name: string, delta: number): void {
    const basin = this._data.basins[name];
    if (basin) {
      basin.strength = Math.max(0, Math.min(1, basin.strength + delta));
    }
  }

  public resizeBasin(name: string, newRadius: number): void {
    const basin = this._data.basins[name];
    if (basin) {
      basin.radius = Math.max(0.01, newRadius);
    }
  }

  public moveBasin(name: string, x: number, y: number): void {
    const basin = this._data.basins[name];
    if (basin) {
      basin.x = x;
      basin.y = y;
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
    };
  }
}
