/**
 * 形态素梯度模块：通过浓度场决定模块功能分化（如手/脚分化），
 * 高浓度区域激活一种命运，低浓度区域激活另一种，浓度阈值驱动形态发生。
 */

export type ModuleFate = 'uncommitted' | 'proximal' | 'distal' | 'repressed';

export interface Concentration {
  morphogenId: string;
  value: number;
  sampledAt: number;
}

export interface GradientField {
  id: string;
  source: string;
  intensity: number;
  decayRate: number;
  thresholdHigh: number;
  thresholdLow: number;
  positions: Map<string, number>;
}

export interface FateAssignment {
  positionId: string;
  fate: ModuleFate;
  concentration: number;
  decidedAt: number;
}

export class MorphogenGradient {
  private _fields: Map<string, GradientField> = new Map();
  private _fates: Map<string, FateAssignment> = new Map();
  private _tickCount = 0;

  registerMorphogen(field: Omit<GradientField, 'positions'>): void {
    this._fields.set(field.id, { ...field, positions: new Map() });
  }

  emitConcentration(fieldId: string, positionId: string, distance: number): Concentration {
    const field = this._fields.get(fieldId);
    if (!field) throw new Error(`Unknown morphogen field: ${fieldId}`);

    const raw = field.intensity * Math.exp(-field.decayRate * distance);
    const value = Math.max(0, raw);
    field.positions.set(positionId, value);
    return { morphogenId: fieldId, value, sampledAt: Date.now() };
  }

  sampleAt(fieldId: string, positionId: string): number {
    const field = this._fields.get(fieldId);
    return field?.positions.get(positionId) ?? 0;
  }

  determineFate(positionId: string, fieldId: string): FateAssignment {
    const field = this._fields.get(fieldId);
    if (!field) throw new Error(`Unknown morphogen field: ${fieldId}`);

    const concentration = field.positions.get(positionId) ?? 0;
    let fate: ModuleFate = 'uncommitted';
    if (concentration >= field.thresholdHigh) fate = 'proximal';
    else if (concentration >= field.thresholdLow) fate = 'distal';
    else fate = 'repressed';

    const assignment: FateAssignment = {
      positionId,
      fate,
      concentration,
      decidedAt: Date.now(),
    };
    this._fates.set(`${fieldId}:${positionId}`, assignment);
    return assignment;
  }

  propagateGradient(): void {
    this._tickCount++;
    for (const field of this._fields.values()) {
      for (const [pos, val] of field.positions) {
        field.positions.set(pos, val * (1 - field.decayRate * 0.01));
      }
    }
  }

  getGradientMap(fieldId: string): Map<string, number> {
    const field = this._fields.get(fieldId);
    return field ? new Map(field.positions) : new Map();
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
}
