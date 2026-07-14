/**
 * MorphicField - 形态场
 * 非局部的影响场，通过无形的场结构影响远处实体的形态
 * 与行为，类似形态共振假设中的全局协调机制。
 */

export interface MorphicFieldData {
  readonly fieldId: string;
  fieldStrength: number;
  resonanceFrequency: number;
  influenceRadius: number;
  pattern: string;
}

export interface FieldInfluence {
  targetId: string;
  distance: number;
  influenceMagnitude: number;
  aligned: boolean;
}

export class MorphicField {
  private _data: MorphicFieldData;
  private _influences: FieldInfluence[] = [];
  private _resonanceHistory: number[] = [];
  private _entrainedEntities: Set<string> = new Set();
  private _fieldStability: number = 0.5;

  constructor(data: MorphicFieldData) {
    this._data = { ...data };
  }

  get fieldId(): string {
    return this._data.fieldId;
  }

  get fieldStrength(): number {
    return this._data.fieldStrength;
  }

  get resonanceFrequency(): number {
    return this._data.resonanceFrequency;
  }

  public propagate(targetId: string, distance: number): FieldInfluence {
    const withinRadius = distance <= this._data.influenceRadius;
    const falloff = withinRadius ? 1 - distance / this._data.influenceRadius : 0;
    const magnitude = this._data.fieldStrength * falloff * this._fieldStability;
    const aligned = magnitude > 0.3;
    const influence: FieldInfluence = {
      targetId,
      distance,
      influenceMagnitude: magnitude,
      aligned,
    };
    this._influences.push(influence);
    if (this._influences.length > 40) {
      this._influences.shift();
    }
    if (aligned) {
      this._entrainedEntities.add(targetId);
    }
    return influence;
  }

  public entrain(entityId: string, entityFrequency: number): boolean {
    const freqDiff = Math.abs(entityFrequency - this._data.resonanceFrequency);
    const entrainmentChance = Math.max(0, 1 - freqDiff / this._data.resonanceFrequency);
    if (Math.random() < entrainmentChance * this._data.fieldStrength) {
      this._entrainedEntities.add(entityId);
      this._fieldStability = Math.min(1, this._fieldStability + 0.05);
      return true;
    }
    return false;
  }

  public strengthenField(amount: number): void {
    this._data.fieldStrength = Math.min(1, this._data.fieldStrength + amount);
    this._fieldStability = Math.min(1, this._fieldStability + amount * 0.3);
  }

  public adjustFrequency(newFreq: number): void {
    this._data.resonanceFrequency = Math.max(0.001, newFreq);
    this._resonanceHistory.push(newFreq);
    if (this._resonanceHistory.length > 20) {
      this._resonanceHistory.shift();
    }
  }

  public expandRadius(delta: number): void {
    this._data.influenceRadius = Math.max(0, this._data.influenceRadius + delta);
  }

  public setPattern(pattern: string): void {
    this._data.pattern = pattern;
  }

  public detectResonance(): boolean {
    return this._entrainedEntities.size > 3 && this._fieldStability > 0.7;
  }

  public dissipate(): void {
    this._data.fieldStrength *= 0.5;
    this._fieldStability *= 0.8;
    this._entrainedEntities.clear();
    this._influences = [];
  }

  public fieldReport(): Record<string, unknown> {
    return {
      fieldId: this.fieldId,
      fieldStrength: this._data.fieldStrength.toFixed(3),
      resonanceFrequency: this._data.resonanceFrequency.toFixed(3),
      influenceRadius: this._data.influenceRadius.toFixed(2),
      fieldStability: this._fieldStability.toFixed(3),
      pattern: this._data.pattern,
      entrainedCount: this._entrainedEntities.size,
      influenceCount: this._influences.length,
      resonating: this.detectResonance(),
    };
  }
}
