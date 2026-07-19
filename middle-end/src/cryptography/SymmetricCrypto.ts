import { DataPacket, PacketMeta } from '../shared/types';

/** Symmetric key descriptor. */
export interface SymmetricKey {
  algorithm: 'AES' | 'DES' | '3DES' | 'ChaCha20' | 'Salsa20' | 'RC4' | 'Blowfish';
  mode: 'ECB' | 'CBC' | 'CTR' | 'GCM' | 'CFB' | 'OFB';
  key: Uint8Array;
  iv: Uint8Array;
}

/** Block cipher descriptor. */
export interface BlockCipher {
  algorithm: string;
  blockSize: number;
  keySize: number;
  rounds: number;
}

/** Symmetric encryption: AES, DES, ChaCha20 and modes. */
export class SymmetricCrypto {
  private _keys: SymmetricKey[] = [];
  private _ciphers: BlockCipher[] = [];
  private _history: unknown[] = [];
  private _counter = 0;

  /** AES encrypt (deterministic byte-mixing simulation). */
  aesEncrypt(plaintext: string, key: Uint8Array, mode: SymmetricKey['mode']): { ciphertext: Uint8Array; mode: string } {
    const pt = new TextEncoder().encode(plaintext);
    const out = this._xorStream(pt, key, mode);
    this._history.push({ method: 'aesEncrypt' });
    return { ciphertext: out, mode };
  }

  /** AES decrypt (inverse of simulation). */
  aesDecrypt(ciphertext: Uint8Array, key: Uint8Array, mode: SymmetricKey['mode']): string {
    const out = this._xorStream(ciphertext, key, mode);
    this._history.push({ method: 'aesDecrypt' });
    return new TextDecoder().decode(out);
  }

  /** DES encrypt. */
  desEncrypt(plaintext: string, key: Uint8Array): { ciphertext: Uint8Array } {
    const pt = new TextEncoder().encode(plaintext);
    const out = this._xorStream(pt, key, 'ECB');
    this._history.push({ method: 'desEncrypt' });
    return { ciphertext: out };
  }

  /** DES decrypt. */
  desDecrypt(ciphertext: Uint8Array, key: Uint8Array): string {
    const out = this._xorStream(ciphertext, key, 'ECB');
    this._history.push({ method: 'desDecrypt' });
    return new TextDecoder().decode(out);
  }

  /** Triple DES. */
  tripleDes(plaintext: string, key1: Uint8Array, key2: Uint8Array, key3: Uint8Array): Uint8Array {
    const e1 = this.desEncrypt(plaintext, key1).ciphertext;
    const text2 = new TextDecoder().decode(e1);
    const d1 = this.desDecrypt(new TextEncoder().encode(text2), key2);
    return this.desEncrypt(d1, key3).ciphertext;
  }

  /** ChaCha20 stream cipher (simplified). */
  chacha20(plaintext: string, key: Uint8Array, nonce: Uint8Array): Uint8Array {
    const pt = new TextEncoder().encode(plaintext);
    const out = this._xorStream(pt, this._combine(key, nonce), 'CTR');
    this._history.push({ method: 'chacha20' });
    return out;
  }

  /** Salsa20 stream cipher (simplified). */
  salsa20(plaintext: string, key: Uint8Array, nonce: Uint8Array): Uint8Array {
    const pt = new TextEncoder().encode(plaintext);
    const out = this._xorStream(pt, this._combine(key, nonce), 'CTR');
    this._history.push({ method: 'salsa20' });
    return out;
  }

  /** RC4 stream cipher. */
  rc4(plaintext: string, key: Uint8Array): Uint8Array {
    const s = Array.from({ length: 256 }, (_, i) => i);
    let j = 0;
    for (let i = 0; i < 256; i++) {
      j = (j + s[i] + key[i % key.length]) % 256;
      [s[i], s[j]] = [s[j], s[i]];
    }
    const pt = new TextEncoder().encode(plaintext);
    const out = new Uint8Array(pt.length);
    let i = 0;
    j = 0;
    for (let n = 0; n < pt.length; n++) {
      i = (i + 1) % 256;
      j = (j + s[i]) % 256;
      [s[i], s[j]] = [s[j], s[i]];
      const k = s[(s[i] + s[j]) % 256];
      out[n] = pt[n] ^ k;
    }
    this._history.push({ method: 'rc4' });
    return out;
  }

  /** Blowfish cipher (simplified). */
  blowfish(plaintext: string, key: Uint8Array): Uint8Array {
    const pt = new TextEncoder().encode(plaintext);
    this._history.push({ method: 'blowfish' });
    return this._xorStream(pt, key, 'ECB');
  }

  /** Electronic Codebook mode. */
  ecbMode(blocks: Uint8Array[], key: Uint8Array): Uint8Array[] {
    const result = blocks.map(b => this._xorStream(b, key, 'ECB'));
    this._history.push({ method: 'ecbMode' });
    return result;
  }

  /** Cipher Block Chaining mode. */
  cbcMode(blocks: Uint8Array[], key: Uint8Array, iv: Uint8Array): Uint8Array[] {
    const result: Uint8Array[] = [];
    let prev = iv;
    for (const block of blocks) {
      const xored = this._xorBytes(block, prev);
      const encrypted = this._xorStream(xored, key, 'CBC');
      result.push(encrypted);
      prev = encrypted;
    }
    this._history.push({ method: 'cbcMode' });
    return result;
  }

  /** Counter mode. */
  ctrMode(blocks: Uint8Array[], key: Uint8Array, nonce: Uint8Array): Uint8Array[] {
    const result: Uint8Array[] = [];
    for (let i = 0; i < blocks.length; i++) {
      const counter = new Uint8Array(nonce.length);
      counter[counter.length - 1] = i;
      const keystream = this._xorStream(this._combine(key, counter), key, 'CTR');
      result.push(this._xorBytes(blocks[i], keystream));
    }
    this._history.push({ method: 'ctrMode' });
    return result;
  }

  /** Galois/Counter Mode. */
  gcmMode(blocks: Uint8Array[], key: Uint8Array, iv: Uint8Array, aad: Uint8Array): { ciphertext: Uint8Array[]; tag: Uint8Array } {
    const ciphertext = this.ctrMode(blocks, key, iv);
    const tag = this._ghash(aad, key);
    this._history.push({ method: 'gcmMode' });
    return { ciphertext, tag };
  }

  private _ghash(aad: Uint8Array, key: Uint8Array): Uint8Array {
    const tag = new Uint8Array(16);
    for (let i = 0; i < aad.length; i++) {
      tag[i % 16] ^= aad[i] ^ key[i % key.length];
    }
    return tag;
  }

  /** Generate a key schedule for an algorithm. */
  keySchedule(key: Uint8Array, algorithm: string): Uint8Array[] {
    const rounds: Record<string, number> = { AES: 14, DES: 16, '3DES': 48, Blowfish: 16 };
    const r = rounds[algorithm] ?? 10;
    const schedule: Uint8Array[] = [];
    for (let i = 0; i < r; i++) {
      const round = new Uint8Array(key.length);
      for (let j = 0; j < key.length; j++) round[j] = (key[j] + i * 7) & 0xff;
      schedule.push(round);
    }
    this._history.push({ method: 'keySchedule', algorithm });
    return schedule;
  }

  /** Apply a padding scheme (PKCS#7 or zero). */
  paddingScheme(data: Uint8Array, mode: 'pkcs7' | 'zero' | 'none' = 'pkcs7'): Uint8Array {
    const blockSize = 16;
    const padLen = mode === 'none' ? 0 : blockSize - (data.length % blockSize);
    if (padLen === 0 && mode === 'none') return data;
    const padded = new Uint8Array(data.length + (padLen === 0 ? blockSize : padLen));
    padded.set(data);
    if (mode === 'pkcs7') {
      for (let i = data.length; i < padded.length; i++) padded[i] = padLen === 0 ? blockSize : padLen;
    }
    this._history.push({ method: 'paddingScheme', mode });
    return padded;
  }

  private _xorStream(data: Uint8Array, key: Uint8Array, mode: string): Uint8Array {
    const out = new Uint8Array(data.length);
    let counter = 0;
    for (let i = 0; i < data.length; i++) {
      const k = key[(i + counter + mode.length) % key.length];
      out[i] = data[i] ^ k;
      counter++;
    }
    return out;
  }

  private _xorBytes(a: Uint8Array, b: Uint8Array): Uint8Array {
    const len = Math.min(a.length, b.length);
    const out = new Uint8Array(len);
    for (let i = 0; i < len; i++) out[i] = a[i] ^ b[i];
    return out;
  }

  private _combine(a: Uint8Array, b: Uint8Array): Uint8Array {
    const out = new Uint8Array(a.length + b.length);
    out.set(a);
    out.set(b, a.length);
    return out;
  }

  toPacket(): DataPacket<{
    keys: SymmetricKey[];
    ciphers: BlockCipher[];
    history: unknown[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['cryptography', 'SymmetricCrypto'],
      priority: 1,
      phase: 'crypto:symmetric',
    };
    return {
      id: `sym-${(++this._counter).toString(36)}-${Date.now().toString(36)}`,
      payload: {
        keys: this._keys,
        ciphers: this._ciphers,
        history: this._history,
      },
      metadata,
    };
  }

  reset(): void {
    this._keys = [];
    this._ciphers = [];
    this._history = [];
    this._counter = 0;
  }

  get keyCount(): number {
    return this._keys.length;
  }

  get cipherCount(): number {
    return this._ciphers.length;
  }

  get historyDepth(): number {
    return this._history.length;
  }
}
