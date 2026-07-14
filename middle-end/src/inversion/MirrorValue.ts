export interface MirroredEntry {
  key: string;
  original: number;
  mirrored: number;
  axis: number;
}

export type MirrorMap = {
  axis: number;
  entries: number;
  symmetry: number;
};

export interface MirrorValueConfig {
  axisValue: number;
  precision: number;
  autoAdjust: boolean;
}

export class MirrorValue {
  private _config: MirrorValueConfig;
  private _entries: MirroredEntry[] = [];
  private _map: MirrorMap | null = null;
  private _state: Record<string, unknown> = {};
  private _parityOperator: number = -1;
  private _reflectionGroup: number[][] = [[1, 0], [0, -1]];
  private _invariantSubspace: number = 0;

  constructor(config: MirrorValueConfig) {
    this._config = config;
  }

  get entryCount(): number {
    return this._entries.length;
  }

  get parityOperator(): number {
    return this._parityOperator;
  }

  get invariantSubspace(): number {
    return this._invariantSubspace;
  }

  private _applyReflection(value: number): number {
    return 2 * this._config.axisValue - value;
  }

  private _computeInvariantSubspace(): void {
    const onAxis = this._entries.filter((e) => Math.abs(e.original - this._config.axisValue) < this._config.precision);
    this._invariantSubspace = onAxis.length / Math.max(1, this._entries.length);
  }

  register(key: string, value: number): MirroredEntry {
    const mirrored = this._applyReflection(value);
    const entry: MirroredEntry = { key, original: value, mirrored, axis: this._config.axisValue };
    this._entries.push(entry);
    if (this._entries.length > 40) this._entries.shift();
    this._computeInvariantSubspace();
    this._state.lastRegistered = key;
    return entry;
  }

  flip(key: string): boolean {
    const entry = this._entries.find((e) => e.key === key);
    if (!entry) return false;
    const temp = entry.original;
    entry.original = entry.mirrored;
    entry.mirrored = temp;
    this._computeInvariantSubspace();
    return true;
  }

  computeMap(): MirrorMap {
    const symmetry = this._entries.length > 0
      ? this._entries.reduce((acc, e) => acc + Math.abs(e.mirrored - e.original), 0) / this._entries.length
      : 0;
    this._map = { axis: this._config.axisValue, entries: this._entries.length, symmetry };
    return this._map;
  }

  averageDeviation(): number {
    if (this._entries.length === 0) return 0;
    return this._entries.reduce((acc, e) => acc + Math.abs(e.original - e.mirrored), 0) / this._entries.length;
  }

  isSymmetric(): boolean {
    return this.averageDeviation() < this._config.precision;
  }

  adjustAxis(newAxis: number): void {
    this._config.axisValue = newAxis;
    for (const e of this._entries) {
      e.mirrored = this._applyReflection(e.original);
      e.axis = newAxis;
    }
    this._computeInvariantSubspace();
  }

  computeEigenvalues(): number[] {
    const trace = this._reflectionGroup[0][0] + this._reflectionGroup[1][1];
    const det = this._reflectionGroup[0][0] * this._reflectionGroup[1][1] - this._reflectionGroup[0][1] * this._reflectionGroup[1][0];
    const discriminant = Math.sqrt(trace * trace - 4 * det);
    return [(trace + discriminant) / 2, (trace - discriminant) / 2];
  }

  reset(): void {
    this._entries = [];
    this._map = null;
    this._invariantSubspace = 0;
    this._state = {};
  }

  report(): Record<string, unknown> {
    return {
      entries: this._entries.length,
      symmetric: this.isSymmetric(),
      map: this._map,
      state: this._state,
      invariantSubspace: this._invariantSubspace.toFixed(4),
      eigenvalues: this.computeEigenvalues().map((v) => v.toFixed(4)),
    };
  }
}
