/**
 * ScatteringBounce - 散射弹跳
 * 状态碰到排斥子时发生反弹，类似粒子在势垒上的散射，
 * 反弹角度与能量取决于入射条件与排斥子强度。
 */

export interface ScatteringBounceData {
  readonly bounceId: string;
  repellorPosition: { x: number; y: number };
  repellorStrength: number;
  elasticity: number;
}

export interface BounceEvent {
  incoming: { x: number; y: number };
  outgoing: { x: number; y: number };
  velocity: number;
  energyLoss: number;
  scatterAngle: number;
}

export class ScatteringBounce {
  private _data: ScatteringBounceData;
  private _events: BounceEvent[] = [];
  private _totalBounces: number = 0;
  private _totalEnergyLost: number = 0;
  private _lastScatterAngle: number = 0;

  constructor(data: ScatteringBounceData) {
    this._data = { ...data, repellorPosition: { ...data.repellorPosition } };
  }

  get bounceId(): string {
    return this._data.bounceId;
  }

  get repellorStrength(): number {
    return this._data.repellorStrength;
  }

  get elasticity(): number {
    return this._data.elasticity;
  }

  public collide(position: { x: number; y: number }, velocity: { x: number; y: number }): BounceEvent {
    const dx = position.x - this._data.repellorPosition.x;
    const dy = position.y - this._data.repellorPosition.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance === 0) {
      return {
        incoming: position,
        outgoing: position,
        velocity: 0,
        energyLoss: 0,
        scatterAngle: 0,
      };
    }
    const normalX = dx / distance;
    const normalY = dy / distance;
    const dotProduct = velocity.x * normalX + velocity.y * normalY;
    const incomingSpeed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
    const reflectedX = velocity.x - 2 * dotProduct * normalX;
    const reflectedY = velocity.y - 2 * dotProduct * normalY;
    const outgoingSpeed = incomingSpeed * this._data.elasticity * this._data.repellorStrength;
    const energyLoss = incomingSpeed ** 2 - outgoingSpeed ** 2;
    const outgoingX = position.x + reflectedX * this._data.elasticity;
    const outgoingY = position.y + reflectedY * this._data.elasticity;
    const scatterAngle = Math.atan2(reflectedY, reflectedX) - Math.atan2(velocity.y, velocity.x);
    this._lastScatterAngle = scatterAngle;
    this._totalBounces++;
    this._totalEnergyLost += Math.abs(energyLoss);
    const event: BounceEvent = {
      incoming: { ...position },
      outgoing: { x: outgoingX, y: outgoingY },
      velocity: outgoingSpeed,
      energyLoss,
      scatterAngle,
    };
    this._events.push(event);
    if (this._events.length > 30) {
      this._events.shift();
    }
    return event;
  }

  public setElasticity(elasticity: number): void {
    this._data.elasticity = Math.max(0, Math.min(1, elasticity));
  }

  public adjustStrength(delta: number): void {
    this._data.repellorStrength = Math.max(0.1, this._data.repellorStrength + delta);
  }

  public moveRepellor(x: number, y: number): void {
    this._data.repellorPosition = { x, y };
  }

  public computeCrossSection(impactParameter: number): number {
    return Math.PI * impactParameter ** 2 * this._data.repellorStrength;
  }

  public averageEnergyLoss(): number {
    if (this._events.length === 0) {
      return 0;
    }
    return this._totalEnergyLost / this._totalBounces;
  }

  public isAbsorbed(incomingSpeed: number): boolean {
    return incomingSpeed * this._data.elasticity < 0.1;
  }

  public bounceReport(): Record<string, unknown> {
    return {
      bounceId: this.bounceId,
      repellorPosition: this._data.repellorPosition,
      repellorStrength: this._data.repellorStrength.toFixed(3),
      elasticity: this._data.elasticity.toFixed(3),
      totalBounces: this._totalBounces,
      totalEnergyLost: this._totalEnergyLost.toFixed(3),
      averageEnergyLoss: this.averageEnergyLoss().toFixed(3),
      lastScatterAngle: this._lastScatterAngle.toFixed(3),
      eventCount: this._events.length,
    };
  }
}
