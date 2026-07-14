export interface Territory {
  id: string;
  richness: number;
  occupationTime: number;
  lastVisited: number;
  visitCount: number;
}

export interface NomadPosition {
  x: number;
  y: number;
  step: number;
  direction: number;
}

export interface NomadConfig {
  alpha: number;
  restartProbability: number;
  maxSteps: number;
}

export class NomadicThought {
  private _config: NomadConfig;
  private _territories: Map<string, Territory> = new Map();
  private _positions: NomadPosition[] = [];
  private _currentPosition: NomadPosition = { x: 0, y: 0, step: 0, direction: 0 };
  private _state: Record<string, unknown> = {};
  private _migrationMatrix: Map<string, Map<string, number>> = new Map();
  private _entropyOfVisits: number = 0;

  constructor(config: NomadConfig) {
    this._config = { ...config };
  }

  get territoryCount(): number {
    return this._territories.size;
  }

  get currentPosition(): NomadPosition {
    return { ...this._currentPosition };
  }

  addTerritory(id: string, richness: number): void {
    this._territories.set(id, {
      id,
      richness,
      occupationTime: 0,
      lastVisited: 0,
      visitCount: 0,
    });
    this._migrationMatrix.set(id, new Map());
  }

  wander(steps: number): NomadPosition[] {
    const result: NomadPosition[] = [];
    for (let i = 0; i < steps; i++) {
      if (Math.random() < this._config.restartProbability) {
        this._currentPosition = { x: 0, y: 0, step: this._currentPosition.step + 1, direction: Math.random() * Math.PI * 2 };
      } else {
        const stepLength = this._sampleLevyFlight();
        const theta = this._currentPosition.direction + (Math.random() - 0.5) * Math.PI;
        this._currentPosition.x += stepLength * Math.cos(theta);
        this._currentPosition.y += stepLength * Math.sin(theta);
        this._currentPosition.step++;
        this._currentPosition.direction = theta;
      }
      const pos: NomadPosition = { ...this._currentPosition };
      result.push(pos);
      this._positions.push(pos);
      this._updateTerritoryOccupation();
    }
    if (this._positions.length > 2000) this._positions.splice(0, this._positions.length - 2000);
    this._computeEntropy();
    return result;
  }

  private _sampleLevyFlight(): number {
    const u = Math.random();
    const v = Math.random();
    const step = Math.pow(Math.abs(u - 0.5) / Math.pow(Math.abs(v), 1 / this._config.alpha), 1 / this._config.alpha);
    return Math.min(step, 100);
  }

  private _updateTerritoryOccupation(): void {
    for (const territory of this._territories.values()) {
      const dx = this._currentPosition.x;
      const dy = this._currentPosition.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < territory.richness) {
        territory.occupationTime++;
        territory.lastVisited = this._currentPosition.step;
        territory.visitCount++;
      }
    }
  }

  private _computeEntropy(): void {
    const total = Array.from(this._territories.values()).reduce((s, t) => s + t.visitCount, 0);
    if (total === 0) {
      this._entropyOfVisits = 0;
      return;
    }
    this._entropyOfVisits = -Array.from(this._territories.values()).reduce((s, t) => {
      const p = t.visitCount / total;
      return p > 0 ? s + p * Math.log2(p) : s;
    }, 0);
  }

  recordMigration(from: string, to: string): void {
    const fromMap = this._migrationMatrix.get(from);
    if (!fromMap) return;
    fromMap.set(to, (fromMap.get(to) ?? 0) + 1);
  }

  migrationProbability(from: string, to: string): number {
    const fromMap = this._migrationMatrix.get(from);
    if (!fromMap) return 0;
    const total = Array.from(fromMap.values()).reduce((s, v) => s + v, 0);
    return total > 0 ? (fromMap.get(to) ?? 0) / total : 0;
  }

  mostVisitedTerritory(): Territory | null {
    if (this._territories.size === 0) return null;
    return Array.from(this._territories.values()).reduce((best, t) => (t.visitCount > best.visitCount ? t : best));
  }

  leastVisitedTerritory(): Territory | null {
    if (this._territories.size === 0) return null;
    return Array.from(this._territories.values()).reduce((best, t) => (t.visitCount < best.visitCount ? t : best));
  }

  territoryRichnessEntropy(): number {
    const total = Array.from(this._territories.values()).reduce((s, t) => s + t.richness, 0);
    if (total === 0) return 0;
    return -Array.from(this._territories.values()).reduce((s, t) => {
      const p = t.richness / total;
      return p > 0 ? s + p * Math.log2(p) : s;
    }, 0);
  }

  randomWalkWithRestart(startId: string, steps: number): string[] {
    const path: string[] = [startId];
    let current = startId;
    for (let i = 0; i < steps; i++) {
      if (Math.random() < this._config.restartProbability) {
        current = startId;
      } else {
        const territory = this._territories.get(current);
        if (!territory) break;
        const neighbors = Array.from(this._territories.keys()).filter((id) => id !== current);
        current = neighbors[Math.floor(Math.random() * neighbors.length)] || current;
      }
      path.push(current);
    }
    return path;
  }

  report(): Record<string, unknown> {
    return {
      territories: this._territories.size,
      positions: this._positions.length,
      currentPosition: this._currentPosition,
      entropyOfVisits: this._entropyOfVisits,
      territoryRichnessEntropy: this.territoryRichnessEntropy(),
      state: this._state,
    };
  }
}
