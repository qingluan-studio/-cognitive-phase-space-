export type ModuleFate = 'uncommitted' | 'proximal' | 'distal' | 'repressed';

export interface Concentration {
  morphogenId: string;
  value: number;
  sampledAt: number;
  gradientMagnitude: number;
}

export interface GradientField {
  id: string;
  source: string;
  intensity: number;
  decayRate: number;
  thresholdHigh: number;
  thresholdLow: number;
  diffusionCoefficient: number;
  positions: Map<string, number>;
}

export interface FateAssignment {
  positionId: string;
  fate: ModuleFate;
  concentration: number;
  gradientMagnitude: number;
  decidedAt: number;
  contributingFields: string[];
}

export interface FlowVector {
  positionId: string;
  dx: number;
  dy: number;
  magnitude: number;
}

export class MorphogenGradient {
  private _fields: Map<string, GradientField> = new Map();
  private _fates: Map<string, FateAssignment> = new Map();
  private _tickCount = 0;
  private _positionCoordinates: Map<string, [number, number]> = new Map();
  private _flowVectors: Map<string, FlowVector> = new Map();

  registerMorphogen(field: Omit<GradientField, 'positions'>): void {
    this._fields.set(field.id, { ...field, positions: new Map() });
  }

  emitConcentration(fieldId: string, positionId: string, distance: number): Concentration {
    const field = this._fields.get(fieldId);
    if (!field) throw new Error(`Unknown morphogen field: ${fieldId}`);

    const raw = field.intensity * Math.exp(-field.decayRate * distance);
    const value = Math.max(0, raw);
    field.positions.set(positionId, value);
    
    const gradient = this._computeGradientAt(fieldId, positionId);
    return { morphogenId: fieldId, value, sampledAt: Date.now(), gradientMagnitude: gradient };
  }

  private _computeGradientAt(fieldId: string, positionId: string): number {
    const field = this._fields.get(fieldId);
    if (!field) return 0;
    
    const coord = this._positionCoordinates.get(positionId);
    if (!coord) return 0;
    
    const [x, y] = coord;
    const samples = this._sampleNeighborhood(x, y, 0.1);
    let gradient = 0;
    
    for (const [nx, ny, dist] of samples) {
      const neighborPos = `${nx.toFixed(2)}-${ny.toFixed(2)}`;
      const neighborVal = field.positions.get(neighborPos) ?? 0;
      const currentVal = field.positions.get(positionId) ?? 0;
      gradient += Math.abs(neighborVal - currentVal) / (dist + 0.001);
    }
    return gradient / samples.length;
  }

  private _sampleNeighborhood(x: number, y: number, radius: number): [number, number, number][] {
    const samples: [number, number, number][] = [];
    const directions = [
      [-1, 0], [1, 0], [0, -1], [0, 1],
      [-1, -1], [-1, 1], [1, -1], [1, 1],
    ];
    for (const [dx, dy] of directions) {
      const nx = x + dx * radius;
      const ny = y + dy * radius;
      samples.push([nx, ny, radius]);
    }
    return samples;
  }

  registerPosition(positionId: string, x: number, y: number): void {
    this._positionCoordinates.set(positionId, [x, y]);
  }

  sampleAt(fieldId: string, positionId: string): number {
    const field = this._fields.get(fieldId);
    return field?.positions.get(positionId) ?? 0;
  }

  sampleSuperposed(positionId: string): number {
    let total = 0;
    let weightSum = 0;
    for (const field of this._fields.values()) {
      const val = field.positions.get(positionId) ?? 0;
      const weight = 1 - field.decayRate * 0.5;
      total += val * weight;
      weightSum += weight;
    }
    return weightSum > 0 ? total / weightSum : 0;
  }

  determineFate(positionId: string, fieldId?: string): FateAssignment {
    const contributing: string[] = [];
    let concentration = 0;
    let gradientMagnitude = 0;

    if (fieldId) {
      const field = this._fields.get(fieldId);
      if (!field) throw new Error(`Unknown morphogen field: ${fieldId}`);
      concentration = field.positions.get(positionId) ?? 0;
      gradientMagnitude = this._computeGradientAt(fieldId, positionId);
      contributing.push(fieldId);
    } else {
      for (const [fid, field] of this._fields) {
        const val = field.positions.get(positionId) ?? 0;
        if (val > 0.01) {
          contributing.push(fid);
          concentration += val * (1 - field.decayRate);
          gradientMagnitude += this._computeGradientAt(fid, positionId);
        }
      }
      concentration /= contributing.length || 1;
      gradientMagnitude /= contributing.length || 1;
    }

    let fate: ModuleFate = 'uncommitted';
    const avgHigh = Array.from(this._fields.values()).reduce((sum, f) => sum + f.thresholdHigh, 0) / (this._fields.size || 1);
    const avgLow = Array.from(this._fields.values()).reduce((sum, f) => sum + f.thresholdLow, 0) / (this._fields.size || 1);

    if (concentration >= avgHigh) fate = 'proximal';
    else if (concentration >= avgLow) fate = 'distal';
    else fate = 'repressed';

    const assignment: FateAssignment = {
      positionId,
      fate,
      concentration,
      gradientMagnitude,
      decidedAt: Date.now(),
      contributingFields: contributing,
    };
    this._fates.set(`${fieldId || 'superposed'}:${positionId}`, assignment);
    return assignment;
  }

  propagateGradient(): void {
    this._tickCount++;
    const deltaT = 0.01;

    for (const field of this._fields.values()) {
      const updates = new Map<string, number>();
      
      for (const [pos, val] of field.positions) {
        const coord = this._positionCoordinates.get(pos);
        if (!coord) {
          updates.set(pos, val * (1 - field.decayRate * deltaT));
          continue;
        }

        let laplacian = 0;
        const samples = this._sampleNeighborhood(coord[0], coord[1], 0.1);
        
        for (const [nx, ny, dist] of samples) {
          const neighborPos = `${nx.toFixed(2)}-${ny.toFixed(2)}`;
          const neighborVal = field.positions.get(neighborPos) ?? 0;
          laplacian += neighborVal - val;
        }
        laplacian /= samples.length;

        const diffusive = field.diffusionCoefficient * laplacian;
        const decay = -field.decayRate * val;
        const newVal = val + (diffusive + decay) * deltaT;
        
        updates.set(pos, Math.max(0, newVal));
      }

      for (const [pos, val] of updates) {
        field.positions.set(pos, val);
      }
    }

    this._computeFlowVectors();
  }

  private _computeFlowVectors(): void {
    for (const [pos, coord] of this._positionCoordinates) {
      let dx = 0, dy = 0;
      
      for (const field of this._fields.values()) {
        const centerVal = field.positions.get(pos) ?? 0;
        
        for (const [dirX, dirY] of [[0.1, 0], [-0.1, 0], [0, 0.1], [0, -0.1]]) {
          const neighborPos = `${(coord[0] + dirX).toFixed(2)}-${(coord[1] + dirY).toFixed(2)}`;
          const neighborVal = field.positions.get(neighborPos) ?? 0;
          dx += (centerVal - neighborVal) * dirX;
          dy += (centerVal - neighborVal) * dirY;
        }
      }

      const magnitude = Math.sqrt(dx * dx + dy * dy);
      this._flowVectors.set(pos, { positionId: pos, dx, dy, magnitude });
    }
  }

  getGradientMap(fieldId: string): Map<string, number> {
    const field = this._fields.get(fieldId);
    return field ? new Map(field.positions) : new Map();
  }

  getFlowVector(positionId: string): FlowVector | undefined {
    return this._flowVectors.get(positionId);
  }

  decayField(fieldId: string, factor: number): void {
    const field = this._fields.get(fieldId);
    if (!field) return;
    field.intensity *= factor;
  }

  getFate(positionId: string): ModuleFate {
    for (const assignment of this._fates.values()) {
      if (assignment.positionId === positionId) return assignment.fate;
    }
    return 'uncommitted';
  }

  get fieldCount(): number {
    return this._fields.size;
  }

  get tick(): number {
    return this._tickCount;
  }

  get positionCount(): number {
    return this._positionCoordinates.size;
  }
}