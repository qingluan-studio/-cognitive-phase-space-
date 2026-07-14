/**
 * 虚空产生器：主动生成无意义的虚空数据。
 * 生成结构合法但内容无意义的虚空数据流，用于填充、压力测试或对比基准。
 */

export type VoidFlavor = 'blank' | 'static' | 'echo' | 'whisper' | 'null';

export interface VoidPacket {
  id: string;
  flavor: VoidFlavor;
  payload: unknown;
  size: number;
  generatedAt: number;
}

export interface VoidStream {
  packets: VoidPacket[];
  totalSize: number;
  durationMs: number;
}

export class VoidGenerator {
  private _streams: VoidStream[] = [];
  private _maxStreams = 50;
  private _generationCount = 0;
  private _defaultFlavor: VoidFlavor = 'blank';

  generate(flavor: VoidFlavor = this._defaultFlavor, size: number = 64): VoidPacket {
    const payload = this._producePayload(flavor, size);
    const packet: VoidPacket = {
      id: `void-${Date.now()}-${this._generationCount++}`,
      flavor,
      payload,
      size,
      generatedAt: Date.now(),
    };
    return packet;
  }

  stream(count: number, flavor?: VoidFlavor): VoidStream {
    const start = Date.now();
    const packets: VoidPacket[] = [];
    let totalSize = 0;
    for (let i = 0; i < count; i++) {
      const packet = this.generate(flavor, Math.floor(Math.random() * 256) + 16);
      packets.push(packet);
      totalSize += packet.size;
    }
    const stream: VoidStream = {
      packets,
      totalSize,
      durationMs: Date.now() - start,
    };
    this._streams.push(stream);
    if (this._streams.length > this._maxStreams) this._streams.shift();
    return stream;
  }

  private _producePayload(flavor: VoidFlavor, size: number): unknown {
    switch (flavor) {
      case 'blank':
        return new Array(size).fill(null);
      case 'static':
        return Array.from({ length: size }, () => Math.random() < 0.5 ? 0 : 1);
      case 'echo':
        return Array.from({ length: size }, (_, i) => i % 2 === 0 ? '∅' : '∅');
      case 'whisper':
        return Array.from({ length: size }, () => '');
      case 'null':
        return null;
    }
  }

  setDefaultFlavor(flavor: VoidFlavor): void {
    this._defaultFlavor = flavor;
  }

  purge(): number {
    const count = this._streams.length;
    this._streams = [];
    return count;
  }

  getStreams(): VoidStream[] {
    return [...this._streams];
  }

  get totalGenerated(): number {
    return this._generationCount;
  }

  get streamCount(): number {
    return this._streams.length;
  }
}
