/**
 * 悖论燃料：将逻辑矛盾转化为可利用的能量。
 * 通过捕获悖论中的张力差，将其转化为驱动推理引擎前进的燃料。
 */

export interface ParadoxSource {
  id: string;
  description: string;
  tension: number;
  convertible: boolean;
  harvestedAt: number | null;
}

export interface FuelCell {
  id: string;
  sourceId: string;
  energy: number;
  stability: number;
  createdAt: number;
}

export class ParadoxFuel {
  private _sources: Map<string, ParadoxSource> = new Map();
  private _cells: FuelCell[] = [];
  private _totalEnergy = 0;
  private _conversionRate = 0.7;
  private _volatilityThreshold = 0.9;

  registerParadox(source: ParadoxSource): void {
    this._sources.set(source.id, source);
  }

  measureTension(id: string): number {
    const src = this._sources.get(id);
    if (!src) return 0;
    src.tension = Math.min(1, src.tension + Math.random() * 0.1);
    if (src.tension >= this._volatilityThreshold) src.convertible = true;
    return src.tension;
  }

  harvest(id: string): FuelCell | null {
    const src = this._sources.get(id);
    if (!src || !src.convertible) return null;
    const energy = src.tension * this._conversionRate * 100;
    const cell: FuelCell = {
      id: `cell-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sourceId: id,
      energy,
      stability: 1 - src.tension * 0.5,
      createdAt: Date.now(),
    };
    this._cells.push(cell);
    this._totalEnergy += energy;
    src.harvestedAt = Date.now();
    src.tension *= 0.2;
    src.convertible = false;
    return cell;
  }

  burn(cellId: string): number {
    const idx = this._cells.findIndex(c => c.id === cellId);
    if (idx < 0) return 0;
    const cell = this._cells[idx];
    const usable = cell.energy * cell.stability;
    this._totalEnergy -= cell.energy;
    this._cells.splice(idx, 1);
    return usable;
  }

  stabilize(cellId: string, amount: number): FuelCell | null {
    const cell = this._cells.find(c => c.id === cellId);
    if (!cell) return null;
    cell.stability = Math.min(1, cell.stability + amount);
    return cell;
  }

  getConvertibleSources(): ParadoxSource[] {
    return Array.from(this._sources.values()).filter(s => s.convertible);
  }

  getCells(): FuelCell[] {
    return [...this._cells];
  }

  get totalEnergy(): number {
    return this._totalEnergy;
  }
}
