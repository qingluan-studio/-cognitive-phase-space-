/**
 * 孤子振荡子：孤立但持续振荡的信息包。
 * 维护孤子形状不变并在传播中持续振荡的信息包，能量不发散。
 */

export interface SolitonPacket {
  id: string;
  position: number;
  amplitude: number;
  width: number;
  phase: number;
  energy: number;
}

export class Oscillon {
  private _packets: Map<string, SolitonPacket> = new Map();
  private _space: number[] = [];
  private _spaceSize = 256;
  private _time = 0;
  private _nonlinearity = 1.0;

  constructor() {
    this._space = new Array(this._spaceSize).fill(0);
  }

  spawn(id: string, position: number, amplitude: number): SolitonPacket {
    const packet: SolitonPacket = {
      id,
      position,
      amplitude,
      width: 10,
      phase: 0,
      energy: amplitude * amplitude,
    };
    this._packets.set(id, packet);
    this._renderSpace();
    return packet;
  }

  step(dt: number = 0.1): void {
    for (const p of this._packets.values()) {
      p.position += dt * p.amplitude;
      p.position = ((p.position % this._spaceSize) + this._spaceSize) % this._spaceSize;
      p.phase += dt * 2 * Math.PI * this._nonlinearity;
      p.energy = p.amplitude * p.amplitude;
    }
    this._time += dt;
    this._renderSpace();
  }

  collide(idA: string, idB: string): SolitonPacket | null {
    const a = this._packets.get(idA);
    const b = this._packets.get(idB);
    if (!a || !b) return null;
    if (Math.abs(a.position - b.position) > (a.width + b.width)) return null;
    const merged: SolitonPacket = {
      id: `${idA}+${idB}`,
      position: (a.position + b.position) / 2,
      amplitude: Math.sqrt(a.amplitude ** 2 + b.amplitude ** 2),
      width: Math.min(a.width, b.width),
      phase: a.phase + b.phase,
      energy: a.energy + b.energy,
    };
    this._packets.delete(idA);
    this._packets.delete(idB);
    this._packets.set(merged.id, merged);
    return merged;
  }

  setNonlinearity(value: number): void {
    this._nonlinearity = value;
  }

  getSpace(): number[] {
    return [...this._space];
  }

  getPacket(id: string): SolitonPacket | null {
    return this._packets.get(id) ?? null;
  }

  private _renderSpace(): void {
    for (let i = 0; i < this._spaceSize; i++) {
      let value = 0;
      for (const p of this._packets.values()) {
        const dist = Math.min(
          Math.abs(i - p.position),
          this._spaceSize - Math.abs(i - p.position)
        );
        value += p.amplitude * Math.exp(-(dist * dist) / (2 * p.width * p.width)) * Math.cos(p.phase);
      }
      this._space[i] = value;
    }
  }

  get packetCount(): number {
    return this._packets.size;
  }

  get time(): number {
    return this._time;
  }
}
