/**
 * 幽灵协议模块：不可见的通信方式，消息不留痕迹，
 * 通信双方通过预先约定的隐写规则进行秘密信息交换。
 */

export type ProtocolCipher = 'steganographic' | 'null' | 'timing' | 'sideband';

export interface GhostMessage {
  id: string;
  carrier: string;
  hiddenPayload: string;
  cipher: ProtocolCipher;
  sentAt: number;
  received: boolean;
}

export interface ProtocolHandshake {
  id: string;
  parties: [string, string];
  agreedKey: string;
  cipher: ProtocolCipher;
  establishedAt: number;
}

export class GhostProtocol {
  private _messages: GhostMessage[] = [];
  private _handshakes: Map<string, ProtocolHandshake> = new Map();
  private _carriers: Map<string, string> = new Map();
  private _invisibleMode = true;
  private _maxCarrierLength = 1000;

  registerCarrier(carrierId: string, content: string): void {
    if (content.length > this._maxCarrierLength) {
      content = content.slice(0, this._maxCarrierLength);
    }
    this._carriers.set(carrierId, content);
  }

  handshake(partyA: string, partyB: string, cipher: ProtocolCipher): ProtocolHandshake {
    const handshake: ProtocolHandshake = {
      id: `hs-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      parties: [partyA, partyB],
      agreedKey: this._generateKey(),
      cipher,
      establishedAt: Date.now(),
    };
    this._handshakes.set(handshake.id, handshake);
    return handshake;
  }

  private _generateKey(): string {
    return Math.random().toString(36).slice(2, 12);
  }

  private _encode(payload: string, cipher: ProtocolCipher, carrier: string): string {
    switch (cipher) {
      case 'steganographic':
        return carrier.split('').map((c, i) => i % 3 === 0 && payload[i / 3] ? payload[i / 3] : c).join('');
      case 'null':
        return `${carrier} [null:${payload.length}]`;
      case 'timing':
        return `${carrier}|t=${payload.length}`;
      case 'sideband':
        return `${carrier}#${btoa(payload)}`;
      default:
        return carrier;
    }
  }

  private _decode(encoded: string, cipher: ProtocolCipher): string {
    switch (cipher) {
      case 'sideband': {
        const parts = encoded.split('#');
        if (parts.length < 2) return '';
        try { return atob(parts[parts.length - 1]); } catch { return ''; }
      }
      case 'null': {
        const match = encoded.match(/\[null:(\d+)\]/);
        return match ? `null-payload-${match[1]}` : '';
      }
      case 'timing': {
        const match = encoded.match(/t=(\d+)/);
        return match ? `timing-${match[1]}` : '';
      }
      default:
        return '';
    }
  }

  send(handshakeId: string, payload: string): GhostMessage | null {
    const handshake = this._handshakes.get(handshakeId);
    if (!handshake) return null;
    const carrierId = `carrier-${handshake.cipher}-${Date.now()}`;
    const baseCarrier = this._carriers.get(carrierId) ?? `default-carrier-${Date.now()}`;
    const encoded = this._encode(payload, handshake.cipher, baseCarrier);
    const message: GhostMessage = {
      id: `ghost-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      carrier: encoded,
      hiddenPayload: payload,
      cipher: handshake.cipher,
      sentAt: Date.now(),
      received: false,
    };
    this._messages.push(message);
    if (this._messages.length > 300) this._messages.shift();
    return message;
  }

  receive(messageId: string): string | null {
    const message = this._messages.find(m => m.id === messageId);
    if (!message) return null;
    message.received = true;
    return this._decode(message.carrier, message.cipher);
  }

  setInvisibleMode(enabled: boolean): void {
    this._invisibleMode = enabled;
  }

  purgeTraces(): number {
    const before = this._messages.length;
    this._messages = this._messages.filter(m => !m.received);
    return before - this._messages.length;
  }

  getMessagesByCipher(cipher: ProtocolCipher): GhostMessage[] {
    return this._messages.filter(m => m.cipher === cipher);
  }

  listHandshakes(): ProtocolHandshake[] {
    return Array.from(this._handshakes.values());
  }

  get messageCount(): number {
    return this._messages.length;
  }

  get isInvisible(): boolean {
    return this._invisibleMode;
  }
}
