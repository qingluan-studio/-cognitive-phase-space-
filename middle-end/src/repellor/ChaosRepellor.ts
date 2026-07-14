/**
 * ChaosRepellor - 混沌排斥子
 * 将系统状态推离混沌区域，作为混沌吸引子的对立面，
 * 防止系统坠入不可预测的混沌深渊。
 */

export interface ChaosRepellorData {
  readonly repellorId: string;
  chaosCenter: { x: number; y: number };
  repulsionStrength: number;
  influenceRadius: number;
}

export interface RepulsionEffect {
  position: { x: number; y: number };
  force: { x: number; y: number };
  magnitude: number;
  withinRange: boolean;
}

export class ChaosRepellor {
  private _data: ChaosRepellorData;
  private _effects: RepulsionEffect[] = [];
  private _repelledCount: number = 0;
  private _avgDistance: number = 0;
  private _intensity: number = 1;

  constructor(data: ChaosRepellorData) {
    this._data = { ...data, chaosCenter: { ...data.chaosCenter } };
  }

  get repellorId(): string {
    return this._data.repellorId;
  }

  get repulsionStrength(): number {
    return this._data.repulsionStrength;
  }

  get influenceRadius(): number {
    return this._data.influenceRadius;
  }

  public repel(position: { x: number; y: number }): RepulsionEffect {
    const dx = position.x - this._data.chaosCenter.x;
    const dy = position.y - this._data.chaosCenter.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const withinRange = distance <= this._data.influenceRadius;
    let force = { x: 0, y: 0 };
    let magnitude = 0;
    if (withinRange && distance > 0) {
      const falloff = 1 - distance / this._data.influenceRadius;
      magnitude = this._data.repulsionStrength * falloff * this._intensity;
      force = { x: (dx / distance) * magnitude, y: (dy / distance) * magnitude };
      this._repelledCount++;
      this._avgDistance = this._avgDistance * 0.9 + distance * 0.1;
    }
    const effect: RepulsionEffect = {
      position: { ...position },
      force,
      magnitude,
      withinRange,
    };
    this._effects.push(effect);
    if (this._effects.length > 50) {
      this._effects.shift();
    }
    return effect;
  }

  public applyTo(position: { x: number; y: number }): { x: number; y: number } {
    const effect = this.repel(position);
    return {
      x: position.x + effect.force.x,
      y: position.y + effect.force.y,
    };
  }

  public strengthenRepulsion(delta: number): void {
    this._data.repulsionStrength = Math.min(10, this._data.repulsionStrength + delta);
  }

  public expandRadius(delta: number): void {
    this._data.influenceRadius = Math.max(0.1, this._data.influenceRadius + delta);
  }

  public moveChaosCenter(x: number, y: number): void {
    this._data.chaosCenter = { x, y };
  }

  public setIntensity(intensity: number): void {
    this._intensity = Math.max(0, Math.min(2, intensity));
  }

  public measureEffectiveness(): number {
    if (this._effects.length === 0) {
      return 0;
    }
    const repelled = this._effects.filter((e) => e.withinRange).length;
    return repelled / this._effects.length;
  }

  public isProtecting(position: { x: number; y: number }): boolean {
    const dx = position.x - this._data.chaosCenter.x;
    const dy = position.y - this._data.chaosCenter.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance > this._data.influenceRadius;
  }

  public repellorReport(): Record<string, unknown> {
    return {
      repellorId: this.repellorId,
      chaosCenter: this._data.chaosCenter,
      repulsionStrength: this._data.repulsionStrength.toFixed(3),
      influenceRadius: this._data.influenceRadius.toFixed(3),
      intensity: this._intensity.toFixed(3),
      repelledCount: this._repelledCount,
      avgDistance: this._avgDistance.toFixed(3),
      effectiveness: this.measureEffectiveness().toFixed(3),
      effectCount: this._effects.length,
    };
  }
}
