export interface SolitonPacket {
  id: string;
  position: number;
  amplitude: number;
  width: number;
  phase: number;
  energy: number;
  momentum: number;
}

export class Oscillon {
  private _packets: Map<string, SolitonPacket> = new Map();
  private _space: number[] = [];
  private _spaceSize = 256;
  private _time = 0;
  private _nonlinearity = 1.0;
  private _dispersion = 0.1;
  private _conservedQuantities: { mass: number; momentum: number; energy: number } = { mass: 0, momentum: 0, energy: 0 };

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
      momentum: amplitude * amplitude * amplitude,
    };
    this._packets.set(id, packet);
    this._renderSpace();
    this._updateConservedQuantities();
    return packet;
  }

  step(dt: number = 0.1): void {
    for (const p of this._packets.values()) {
      const velocity = 2 * this._dispersion * p.amplitude * p.amplitude;
      p.position += dt * velocity;
      p.position = ((p.position % this._spaceSize) + this._spaceSize) % this._spaceSize;
      p.phase += dt * (p.amplitude * p.amplitude * this._nonlinearity - velocity * velocity * 0.25);
      p.energy = p.amplitude * p.amplitude;
      p.momentum = p.amplitude * p.amplitude * p.amplitude;
    }
    this._time += dt;
    this._renderSpace();
    this._updateConservedQuantities();
  }

  collide(idA: string, idB: string): SolitonPacket | null {
    const a = this._packets.get(idA);
    const b = this._packets.get(idB);
    if (!a || !b) return null;
    const cyclicDist = Math.min(
      Math.abs(a.position - b.position),
      this._spaceSize - Math.abs(a.position - b.position)
    );
    if (cyclicDist > (a.width + b.width)) return null;
    const mergedAmplitude = Math.sqrt(a.amplitude ** 2 + b.amplitude ** 2);
    const phaseShift = this._computePhaseShift(a, b);
    const merged: SolitonPacket = {
      id: `${idA}+${idB}`,
      position: (a.position + b.position) / 2,
      amplitude: mergedAmplitude,
      width: Math.min(a.width, b.width),
      phase: a.phase + b.phase + phaseShift,
      energy: a.energy + b.energy,
      momentum: a.momentum + b.momentum,
    };
    this._packets.delete(idA);
    this._packets.delete(idB);
    this._packets.set(merged.id, merged);
    this._updateConservedQuantities();
    return merged;
  }

  computeInverseScatteringSpectrum(): number[] {
    const spectrum: number[] = [];
    for (const p of this._packets.values()) {
      const eigenvalue = p.amplitude * Math.sqrt(this._nonlinearity / this._dispersion);
      spectrum.push(eigenvalue);
    }
    return spectrum.sort((a, b) => b - a);
  }

  computeKdVEvolution(x: number, t: number): number {
    let result = 0;
    for (const p of this._packets.values()) {
      const xi = x - 2 * p.amplitude * p.amplitude * t;
      result += 2 * p.amplitude * p.amplitude / (Math.cosh(p.amplitude * xi) ** 2);
    }
    return result;
  }

  setNonlinearity(value: number): void {
    this._nonlinearity = value;
  }

  setDispersion(value: number): void {
    this._dispersion = value;
  }

  getSpace(): number[] {
    return [...this._space];
  }

  getPacket(id: string): SolitonPacket | null {
    return this._packets.get(id) ?? null;
  }

  getConservedQuantities(): Record<string, number> {
    return { ...this._conservedQuantities };
  }

  get packetCount(): number {
    return this._packets.size;
  }

  get time(): number {
    return this._time;
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

  private _computePhaseShift(a: SolitonPacket, b: SolitonPacket): number {
    const ratio = a.amplitude / (b.amplitude + 1e-9);
    return 2 * Math.log((ratio + 1 / ratio) / 2);
  }

  private _updateConservedQuantities(): void {
    let mass = 0, momentum = 0, energy = 0;
    for (const p of this._packets.values()) {
      mass += 2 * p.amplitude;
      momentum += p.momentum;
      energy += p.energy * p.energy * 4 / 3;
    }
    this._conservedQuantities = { mass, momentum, energy };
  }
}
