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

  /** AES S-box lookup (deterministic 256-entry table). */
  private static _SBOX: Uint8Array | null = null;
  private static _INV_SBOX: Uint8Array | null = null;

  private _sbox(): Uint8Array {
    if (SymmetricCrypto._SBOX) return SymmetricCrypto._SBOX;
    const sbox = new Uint8Array(256);
    let p = 1, q = 1;
    do {
      p = p ^ (p << 1) ^ (p & 0x80 ? 0x1b : 0);
      p &= 0xff;
      q ^= q << 1;
      q ^= q << 2;
      q ^= q << 4;
      q ^= q & 0x80 ? 0x09 : 0;
      q &= 0xff;
      const xformed = q ^ (q << 1) ^ (q << 2) ^ (q << 3) ^ (q << 4);
      sbox[p] = (xformed ^ 0x63) & 0xff;
    } while (p !== 1);
    sbox[0] = 0x63;
    SymmetricCrypto._SBOX = sbox;
    return sbox;
  }

  private _invSbox(): Uint8Array {
    if (SymmetricCrypto._INV_SBOX) return SymmetricCrypto._INV_SBOX;
    const sbox = this._sbox();
    const inv = new Uint8Array(256);
    for (let i = 0; i < 256; i++) inv[sbox[i]] = i;
    SymmetricCrypto._INV_SBOX = inv;
    return inv;
  }

  /** SubBytes transformation (AES). */
  subBytes(state: Uint8Array): Uint8Array {
    const sbox = this._sbox();
    const out = new Uint8Array(state.length);
    for (let i = 0; i < state.length; i++) out[i] = sbox[state[i]];
    this._history.push({ method: 'subBytes' });
    return out;
  }

  /** InvSubBytes transformation (AES). */
  invSubBytes(state: Uint8Array): Uint8Array {
    const inv = this._invSbox();
    const out = new Uint8Array(state.length);
    for (let i = 0; i < state.length; i++) out[i] = inv[state[i]];
    this._history.push({ method: 'invSubBytes' });
    return out;
  }

  /** ShiftRows transformation (AES, simplified). */
  shiftRows(state: Uint8Array): Uint8Array {
    const out = new Uint8Array(state.length);
    for (let i = 0; i < state.length; i++) out[i] = state[(i + Math.floor(i / 4)) % state.length];
    this._history.push({ method: 'shiftRows' });
    return out;
  }

  /** InvShiftRows transformation (AES, simplified). */
  invShiftRows(state: Uint8Array): Uint8Array {
    const out = new Uint8Array(state.length);
    for (let i = 0; i < state.length; i++) {
      const j = (i - Math.floor(i / 4) + state.length) % state.length;
      out[i] = state[j];
    }
    this._history.push({ method: 'invShiftRows' });
    return out;
  }

  /** MixColumns transformation (AES, simplified). */
  mixColumns(state: Uint8Array): Uint8Array {
    const out = new Uint8Array(state.length);
    for (let i = 0; i < state.length; i += 4) {
      out[i] = (state[i] * 2 ^ state[i + 1] * 3 ^ state[i + 2] ^ state[i + 3]) & 0xff;
      out[i + 1] = (state[i] ^ state[i + 1] * 2 ^ state[i + 2] * 3 ^ state[i + 3]) & 0xff;
      out[i + 2] = (state[i] ^ state[i + 1] ^ state[i + 2] * 2 ^ state[i + 3] * 3) & 0xff;
      out[i + 3] = (state[i] * 3 ^ state[i + 1] ^ state[i + 2] ^ state[i + 3] * 2) & 0xff;
    }
    this._history.push({ method: 'mixColumns' });
    return out;
  }

  /** AddRoundKey transformation (AES). */
  addRoundKey(state: Uint8Array, roundKey: Uint8Array): Uint8Array {
    return this._xorBytes(state, roundKey);
  }

  /** AES-128 key expansion (returns 11 round keys). */
  aesKeyExpansion(key: Uint8Array): Uint8Array[] {
    const nk = key.length / 4;
    const nr = nk + 6;
    const total = 4 * (nr + 1);
    const w: Uint8Array[] = [];
    for (let i = 0; i < nk; i++) w.push(key.slice(i * 4, i * 4 + 4));
    const sbox = this._sbox();
    const rcon = [0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36];
    for (let i = nk; i < total; i++) {
      let temp = w[i - 1].slice();
      if (i % nk === 0) {
        const t = temp[0];
        temp[0] = sbox[temp[1]] ^ rcon[(i / nk) - 1];
        temp[1] = sbox[temp[2]];
        temp[2] = sbox[temp[3]];
        temp[3] = sbox[t];
      } else if (nk > 6 && i % nk === 4) {
        for (let j = 0; j < 4; j++) temp[j] = sbox[temp[j]];
      }
      const prev = w[i - nk];
      const next = new Uint8Array(4);
      for (let j = 0; j < 4; j++) next[j] = prev[j] ^ temp[j];
      w.push(next);
    }
    this._history.push({ method: 'aesKeyExpansion', rounds: nr });
    return w;
  }

  /** AES-128 single block encryption (educational). */
  aesEncryptBlock(block: Uint8Array, key: Uint8Array): Uint8Array {
    const roundKeys = this.aesKeyExpansion(key);
    let state = this.addRoundKey(block, roundKeys[0]);
    const nr = roundKeys.length - 1;
    for (let round = 1; round < nr; round++) {
      state = this.subBytes(state);
      state = this.shiftRows(state);
      state = this.mixColumns(state);
      const padded = new Uint8Array(state.length);
      const rk = roundKeys[round];
      for (let i = 0; i < state.length; i++) padded[i] = state[i] ^ rk[i % rk.length];
      state = padded;
    }
    state = this.subBytes(state);
    state = this.shiftRows(state);
    const final = new Uint8Array(state.length);
    const rk = roundKeys[nr];
    for (let i = 0; i < state.length; i++) final[i] = state[i] ^ rk[i % rk.length];
    this._history.push({ method: 'aesEncryptBlock' });
    return final;
  }

  /** DES initial permutation table. */
  private static _IP = [
    58, 50, 42, 34, 26, 18, 10, 2, 60, 52, 44, 36, 28, 20, 12, 4,
    62, 54, 46, 38, 30, 22, 14, 6, 64, 56, 48, 40, 32, 24, 16, 8,
    57, 49, 41, 33, 25, 17, 9, 1, 59, 51, 43, 35, 27, 19, 11, 3,
    61, 53, 45, 37, 29, 21, 13, 5, 63, 55, 47, 39, 31, 23, 15, 7,
  ];

  /** Apply a permutation to a bit array. */
  permute(bits: number[], table: number[]): number[] {
    const out: number[] = [];
    for (const idx of table) out.push(bits[idx - 1] ?? 0);
    this._history.push({ method: 'permute', size: table.length });
    return out;
  }

  /** Convert bytes to bit array. */
  bytesToBits(data: Uint8Array): number[] {
    const bits: number[] = [];
    for (const b of data) {
      for (let i = 7; i >= 0; i--) bits.push((b >> i) & 1);
    }
    return bits;
  }

  /** Convert bit array to bytes. */
  bitsToBytes(bits: number[]): Uint8Array {
    const out = new Uint8Array(Math.floor(bits.length / 8));
    for (let i = 0; i < out.length; i++) {
      let b = 0;
      for (let j = 0; j < 8; j++) b = (b << 1) | (bits[i * 8 + j] & 1);
      out[i] = b;
    }
    return out;
  }

  /** DES initial permutation. */
  desInitialPermutation(block: Uint8Array): Uint8Array {
    const bits = this.bytesToBits(block);
    const permuted = this.permute(bits, SymmetricCrypto._IP);
    return this.bitsToBytes(permuted);
  }

  /** Feistel round function (used in many block ciphers). */
  feistelRound(right: Uint8Array, roundKey: Uint8Array): Uint8Array {
    const out = new Uint8Array(right.length);
    for (let i = 0; i < right.length; i++) {
      out[i] = (right[i] ^ roundKey[i % roundKey.length]) & 0xff;
    }
    return out;
  }

  /** Generic Feistel network encryption. */
  feistelEncrypt(block: Uint8Array, roundKeys: Uint8Array[], rounds: number): Uint8Array {
    const half = Math.floor(block.length / 2);
    let left = block.slice(0, half);
    let right = block.slice(half);
    for (let r = 0; r < rounds; r++) {
      const f = this.feistelRound(right, roundKeys[r % roundKeys.length]);
      const newRight = new Uint8Array(left.length);
      for (let i = 0; i < left.length; i++) newRight[i] = left[i] ^ f[i % f.length];
      left = right;
      right = newRight;
    }
    const out = new Uint8Array(block.length);
    out.set(left);
    out.set(right, half);
    this._history.push({ method: 'feistelEncrypt', rounds });
    return out;
  }

  /** Generic Feistel network decryption. */
  feistelDecrypt(block: Uint8Array, roundKeys: Uint8Array[], rounds: number): Uint8Array {
    const half = Math.floor(block.length / 2);
    let left = block.slice(0, half);
    let right = block.slice(half);
    for (let r = rounds - 1; r >= 0; r--) {
      const f = this.feistelRound(left, roundKeys[r % roundKeys.length]);
      const newLeft = new Uint8Array(right.length);
      for (let i = 0; i < right.length; i++) newLeft[i] = right[i] ^ f[i % f.length];
      right = left;
      left = newLeft;
    }
    const out = new Uint8Array(block.length);
    out.set(left);
    out.set(right, half);
    this._history.push({ method: 'feistelDecrypt', rounds });
    return out;
  }

  /** Cipher Feedback (CFB) mode. */
  cfbMode(blocks: Uint8Array[], key: Uint8Array, iv: Uint8Array): Uint8Array[] {
    const result: Uint8Array[] = [];
    let prev = iv;
    for (const block of blocks) {
      const encrypted = this._xorStream(prev, key, 'CFB');
      const cipher = this._xorBytes(block, encrypted);
      result.push(cipher);
      prev = cipher;
    }
    this._history.push({ method: 'cfbMode' });
    return result;
  }

  /** Output Feedback (OFB) mode. */
  ofbMode(blocks: Uint8Array[], key: Uint8Array, iv: Uint8Array): Uint8Array[] {
    const result: Uint8Array[] = [];
    let prev = iv;
    for (const block of blocks) {
      prev = this._xorStream(prev, key, 'OFB');
      result.push(this._xorBytes(block, prev));
    }
    this._history.push({ method: 'ofbMode' });
    return result;
  }

  /** Counter with CBC-MAC (CCM) mode. */
  ccmMode(blocks: Uint8Array[], key: Uint8Array, nonce: Uint8Array, aad: Uint8Array): { ciphertext: Uint8Array[]; tag: Uint8Array } {
    const ciphertext = this.ctrMode(blocks, key, nonce);
    let mac = iv0(nonce.length);
    for (const block of blocks) {
      mac = this._xorBytes(mac, block);
      mac = this._xorStream(mac, key, 'CBC');
    }
    const tag = this._xorBytes(this._xorBytes(mac, aad.length >= mac.length ? aad.slice(0, mac.length) : padTo(aad, mac.length)), key);
    this._history.push({ method: 'ccmMode' });
    return { ciphertext, tag };

    function iv0(n: number): Uint8Array { return new Uint8Array(n); }
    function padTo(a: Uint8Array, n: number): Uint8Array { const r = new Uint8Array(n); r.set(a); return r; }
  }

  /** EAX mode (simplified AEAD). */
  eaxMode(blocks: Uint8Array[], key: Uint8Array, nonce: Uint8Array, aad: Uint8Array): { ciphertext: Uint8Array[]; tag: Uint8Array } {
    const ciphertext = this.ctrMode(blocks, key, nonce);
    const tag = this._ghash(this._combine(aad, nonce), key);
    this._history.push({ method: 'eaxMode' });
    return { ciphertext, tag };
  }

  /** OCB mode (simplified AEAD). */
  ocbMode(blocks: Uint8Array[], key: Uint8Array, nonce: Uint8Array, aad: Uint8Array): { ciphertext: Uint8Array[]; tag: Uint8Array } {
    const ciphertext: Uint8Array[] = [];
    let offset = this._xorStream(nonce, key, 'OCB');
    for (const block of blocks) {
      offset = this._xorBytes(offset, this._xorStream(offset, key, 'OCB'));
      ciphertext.push(this._xorBytes(block, offset));
    }
    const tag = this._ghash(this._combine(aad, offset), key);
    this._history.push({ method: 'ocbMode' });
    return { ciphertext, tag };
  }

  /** Synthetic IV (SIV) mode. */
  sivMode(blocks: Uint8Array[], key: Uint8Array, aad: Uint8Array): { ciphertext: Uint8Array[]; iv: Uint8Array } {
    const iv = this._ghash(aad, key);
    const ciphertext = this.ctrMode(blocks, key, iv);
    this._history.push({ method: 'sivMode' });
    return { ciphertext, iv };
  }

  /** XTS-AES (disk encryption mode, simplified). */
  xtsMode(blocks: Uint8Array[], key1: Uint8Array, key2: Uint8Array, sector: number): Uint8Array[] {
    const result: Uint8Array[] = [];
    const tweak = new Uint8Array(16);
    const view = new DataView(tweak.buffer);
    view.setUint32(0, sector, true);
    const encTweak = this._xorStream(tweak, key2, 'XTS');
    for (let i = 0; i < blocks.length; i++) {
      const xored = this._xorBytes(blocks[i], encTweak);
      const enc = this._xorStream(xored, key1, 'XTS');
      const result_block = this._xorBytes(enc, encTweak);
      result.push(result_block);
    }
    this._history.push({ method: 'xtsMode', sector });
    return result;
  }

  /** CMAC (Cipher-based MAC). */
  cmac(message: Uint8Array, key: Uint8Array): Uint8Array {
    const blockSize = 16;
    const k1 = this._xorStream(key, new Uint8Array([0x87]), 'CMAC');
    const k2 = this._xorStream(k1, new Uint8Array([0x87]), 'CMAC');
    const n = Math.ceil(message.length / blockSize);
    const lastComplete = message.length % blockSize === 0;
    const blocks: Uint8Array[] = [];
    for (let i = 0; i < n - (lastComplete ? 1 : 0); i++) {
      blocks.push(message.slice(i * blockSize, (i + 1) * blockSize));
    }
    const lastBlock = message.slice((n - 1) * blockSize);
    const padded = lastComplete ? lastBlock : padTo(lastBlock, blockSize);
    const lastKey = lastComplete ? k1 : k2;
    const finalBlock = this._xorBytes(padded, lastKey.slice(0, padded.length));
    blocks.push(finalBlock);
    let mac = new Uint8Array(blockSize);
    for (const block of blocks) {
      mac = this._xorBytes(mac, block);
      mac = this._xorStream(mac, key, 'CMAC');
    }
    this._history.push({ method: 'cmac' });
    return mac;

    function padTo(a: Uint8Array, n: number): Uint8Array {
      const r = new Uint8Array(n);
      r.set(a);
      r[a.length] = 0x80;
      return r;
    }
  }

  /** GMAC (Galois MAC). */
  gmac(message: Uint8Array, key: Uint8Array, iv: Uint8Array): Uint8Array {
    return this._ghash(message, this._xorStream(iv, key, 'GMAC'));
  }

  /** Poly1305 MAC (simplified). */
  poly1305(message: Uint8Array, key: Uint8Array): Uint8Array {
    const tag = new Uint8Array(16);
    let acc = 0;
    for (let i = 0; i < message.length; i++) {
      acc = (acc * 256 + message[i]) % 0x3fffffff;
      if (i % 16 === 15) {
        for (let j = 0; j < 16; j++) {
          tag[j] ^= (acc >> (j * 4)) & 0xff;
        }
        acc = 0;
      }
    }
    const final = new Uint8Array(16);
    for (let j = 0; j < 16; j++) final[j] = (acc >> (j * 4)) & 0xff;
    const out = this._xorBytes(tag, final);
    this._history.push({ method: 'poly1305' });
    return this._xorBytes(out, key.slice(0, 16));
  }

  /** HMAC (Hash-based MAC, simplified). */
  hmac(key: Uint8Array, message: Uint8Array): Uint8Array {
    const blockSize = 64;
    let k = key;
    if (k.length > blockSize) k = this._simpleHash(k);
    if (k.length < blockSize) {
      const padded = new Uint8Array(blockSize);
      padded.set(k);
      k = padded;
    }
    const ipad = new Uint8Array(blockSize);
    const opad = new Uint8Array(blockSize);
    for (let i = 0; i < blockSize; i++) {
      ipad[i] = k[i] ^ 0x36;
      opad[i] = k[i] ^ 0x5c;
    }
    const inner = this._simpleHash(this._combine(ipad, message));
    const outer = this._simpleHash(this._combine(opad, inner));
    this._history.push({ method: 'hmac' });
    return outer;
  }

  private _simpleHash(data: Uint8Array): Uint8Array {
    const out = new Uint8Array(32);
    let h1 = 0x6a09e667, h2 = 0xbb67ae85;
    for (let i = 0; i < data.length; i++) {
      h1 = ((h1 << 5) | (h1 >>> 27)) ^ data[i] ^ h2;
      h2 = ((h2 << 7) | (h2 >>> 25)) ^ data[i] ^ h1;
      out[(i * 4) % 32] = (out[(i * 4) % 32] ^ h1) & 0xff;
      out[(i * 4 + 1) % 32] = (out[(i * 4 + 1) % 32] ^ h2) & 0xff;
    }
    return out;
  }

  /** CTR-DRBG (NIST SP 800-90A, deterministic simulation). */
  ctrDrbg(entropy: Uint8Array, nonce: Uint8Array, length: number): Uint8Array {
    let seed = this._combine(entropy, nonce);
    seed = this._simpleHash(seed);
    const blocks: Uint8Array[] = [];
    let counter = 0;
    let produced = 0;
    while (produced < length) {
      const ctrBytes = new Uint8Array(16);
      const view = new DataView(ctrBytes.buffer);
      view.setUint32(12, counter, true);
      const block = this._xorBytes(seed, ctrBytes);
      blocks.push(this._simpleHash(block));
      counter++;
      produced += 32;
    }
    const out = new Uint8Array(length);
    let off = 0;
    for (const b of blocks) {
      const copy = Math.min(b.length, length - off);
      out.set(b.subarray(0, copy), off);
      off += copy;
    }
    this._history.push({ method: 'ctrDrbg', length });
    return out;
  }

  /** HMAC-DRBG (NIST SP 800-90A, deterministic simulation). */
  hmacDrbg(entropy: Uint8Array, nonce: Uint8Array, length: number): Uint8Array {
    const seedMaterial = this._combine(entropy, nonce);
    let K = new Uint8Array(32);
    let V = new Uint8Array(32).fill(0x01);
    K = this.hmac(K, this._combine(V, this._combine(new Uint8Array([0]), seedMaterial)));
    V = this.hmac(K, V);
    K = this.hmac(K, this._combine(V, this._combine(new Uint8Array([1]), seedMaterial)));
    V = this.hmac(K, V);
    const out = new Uint8Array(length);
    let off = 0;
    while (off < length) {
      V = this.hmac(K, V);
      const copy = Math.min(V.length, length - off);
      out.set(V.subarray(0, copy), off);
      off += copy;
    }
    this._history.push({ method: 'hmacDrbg', length });
    return out;
  }

  /** Hash-DRBG (NIST SP 800-90A, simplified). */
  hashDrbg(entropy: Uint8Array, nonce: Uint8Array, length: number): Uint8Array {
    let seed = this._simpleHash(this._combine(entropy, nonce));
    const out = new Uint8Array(length);
    let off = 0;
    let counter = 0;
    while (off < length) {
      seed = this._simpleHash(this._combine(seed, new Uint8Array([counter & 0xff])));
      const copy = Math.min(seed.length, length - off);
      out.set(seed.subarray(0, copy), off);
      off += copy;
      counter++;
    }
    this._history.push({ method: 'hashDrbg', length });
    return out;
  }

  /** Generate random bytes (deterministic for testing). */
  randomBytes(length: number): Uint8Array {
    const out = new Uint8Array(length);
    let seed = Date.now() & 0xffffffff;
    for (let i = 0; i < length; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      out[i] = seed & 0xff;
    }
    this._history.push({ method: 'randomBytes', length });
    return out;
  }

  /** Generate a random key of given size. */
  generateKey(size: number): Uint8Array {
    return this.randomBytes(size);
  }

  /** Generate an IV of given size. */
  generateIv(size: number): Uint8Array {
    return this.randomBytes(size);
  }

  /** Generate a nonce of given size. */
  generateNonce(size: number): Uint8Array {
    return this.randomBytes(size);
  }

  /** PKCS#5 padding (block size 8). */
  pkcs5Pad(data: Uint8Array): Uint8Array {
    const blockSize = 8;
    const padLen = blockSize - (data.length % blockSize);
    const padded = new Uint8Array(data.length + padLen);
    padded.set(data);
    for (let i = data.length; i < padded.length; i++) padded[i] = padLen;
    this._history.push({ method: 'pkcs5Pad' });
    return padded;
  }

  /** PKCS#5 unpadding. */
  pkcs5Unpad(data: Uint8Array): Uint8Array {
    const padLen = data[data.length - 1];
    if (padLen > 8 || padLen < 1) return data;
    this._history.push({ method: 'pkcs5Unpad' });
    return data.slice(0, data.length - padLen);
  }

  /** PKCS#7 unpadding. */
  pkcs7Unpad(data: Uint8Array): Uint8Array {
    const padLen = data[data.length - 1];
    if (padLen < 1 || padLen > 16) return data;
    this._history.push({ method: 'pkcs7Unpad' });
    return data.slice(0, data.length - padLen);
  }

  /** Zero padding. */
  zeroPad(data: Uint8Array, blockSize: number): Uint8Array {
    const padLen = blockSize - (data.length % blockSize);
    if (padLen === blockSize) return data;
    const padded = new Uint8Array(data.length + padLen);
    padded.set(data);
    this._history.push({ method: 'zeroPad' });
    return padded;
  }

  /** ISO 7816-4 padding. */
  iso7816Pad(data: Uint8Array, blockSize: number): Uint8Array {
    const padLen = blockSize - (data.length % blockSize);
    const padded = new Uint8Array(data.length + (padLen === 0 ? blockSize : padLen));
    padded.set(data);
    padded[data.length] = 0x80;
    this._history.push({ method: 'iso7816Pad' });
    return padded;
  }

  /** ISO 7816-4 unpadding. */
  iso7816Unpad(data: Uint8Array): Uint8Array {
    let i = data.length - 1;
    while (i >= 0 && data[i] === 0) i--;
    if (i < 0 || data[i] !== 0x80) return data;
    this._history.push({ method: 'iso7816Unpad' });
    return data.slice(0, i);
  }

  /** ANSI X9.23 padding. */
  ansiX923Pad(data: Uint8Array, blockSize: number): Uint8Array {
    const padLen = blockSize - (data.length % blockSize);
    const padded = new Uint8Array(data.length + (padLen === 0 ? blockSize : padLen));
    padded.set(data);
    padded[padded.length - 1] = padLen === 0 ? blockSize : padLen;
    this._history.push({ method: 'ansiX923Pad' });
    return padded;
  }

  /** ISO 10126 padding (random bytes with length at end). */
  iso10126Pad(data: Uint8Array, blockSize: number): Uint8Array {
    const padLen = blockSize - (data.length % blockSize);
    const actualPad = padLen === 0 ? blockSize : padLen;
    const padded = new Uint8Array(data.length + actualPad);
    padded.set(data);
    const rand = this.randomBytes(actualPad - 1);
    for (let i = 0; i < rand.length; i++) padded[data.length + i] = rand[i];
    padded[padded.length - 1] = actualPad;
    this._history.push({ method: 'iso10126Pad' });
    return padded;
  }

  /** Split data into blocks of given size. */
  blockSplit(data: Uint8Array, blockSize: number): Uint8Array[] {
    const blocks: Uint8Array[] = [];
    for (let i = 0; i < data.length; i += blockSize) {
      blocks.push(data.slice(i, Math.min(i + blockSize, data.length)));
    }
    return blocks;
  }

  /** Concatenate blocks into single array. */
  blockJoin(blocks: Uint8Array[]): Uint8Array {
    let total = 0;
    for (const b of blocks) total += b.length;
    const out = new Uint8Array(total);
    let off = 0;
    for (const b of blocks) { out.set(b, off); off += b.length; }
    return out;
  }

  /** Format-preserving encryption (FF1, simplified). */
  ff1Encrypt(plaintext: string, key: Uint8Array, radix: number): string {
    const chars = plaintext.split('');
    const n = chars.length;
    if (n < 2) return plaintext;
    const indices = chars.map(c => parseInt(c, radix));
    const keyHash = this._simpleHash(key);
    for (let i = 0; i < n; i++) {
      indices[i] = (indices[i] + keyHash[i % keyHash.length]) % radix;
    }
    this._history.push({ method: 'ff1Encrypt', radix });
    return indices.map(i => i.toString(radix)).join('');
  }

  /** Format-preserving decryption (FF1 inverse). */
  ff1Decrypt(ciphertext: string, key: Uint8Array, radix: number): string {
    const chars = ciphertext.split('');
    const n = chars.length;
    if (n < 2) return ciphertext;
    const indices = chars.map(c => parseInt(c, radix));
    const keyHash = this._simpleHash(key);
    for (let i = 0; i < n; i++) {
      indices[i] = (indices[i] - keyHash[i % keyHash.length] + radix * 256) % radix;
    }
    this._history.push({ method: 'ff1Decrypt', radix });
    return indices.map(i => i.toString(radix)).join('');
  }

  /** Format-preserving encryption (FF3, simplified). */
  ff3Encrypt(plaintext: string, key: Uint8Array, radix: number): string {
    const n = plaintext.length;
    if (n < 2) return plaintext;
    const tweak = this._simpleHash(key).slice(0, 8);
    const left = plaintext.slice(0, Math.floor(n / 2)).split('').map(c => parseInt(c, radix));
    const right = plaintext.slice(Math.floor(n / 2)).split('').map(c => parseInt(c, radix));
    for (let r = 0; r < 8; r++) {
      const t = tweak[r % tweak.length];
      for (let i = 0; i < right.length; i++) right[i] = (right[i] + left[i % left.length] + t) % radix;
      [left as number[] | unknown, right] = [right, left];
    }
    this._history.push({ method: 'ff3Encrypt', radix });
    return [...(left as number[]), ...(right as number[])].map(i => (i as number).toString(radix)).join('');
  }

  /** Rabbit stream cipher (simplified). */
  rabbit(plaintext: string, key: Uint8Array): Uint8Array {
    const pt = new TextEncoder().encode(plaintext);
    const state = new Int32Array(8);
    for (let i = 0; i < 8; i++) state[i] = (key[i * 4 % key.length] << 24) | (key[(i * 4 + 1) % key.length] << 16) | (key[(i * 4 + 2) % key.length] << 8) | key[(i * 4 + 3) % key.length];
    const out = new Uint8Array(pt.length);
    let counter = 0;
    for (let i = 0; i < pt.length; i++) {
      state[counter % 8] = (state[counter % 8] * 0x9e3779b9 + 0x517cc1b7) | 0;
      out[i] = pt[i] ^ (state[counter % 8] & 0xff);
      counter++;
    }
    this._history.push({ method: 'rabbit' });
    return out;
  }

  /** HC-256 stream cipher (simplified). */
  hc256(plaintext: string, key: Uint8Array, iv: Uint8Array): Uint8Array {
    const pt = new TextEncoder().encode(plaintext);
    const table = new Uint32Array(1024);
    for (let i = 0; i < 1024; i++) {
      table[i] = (key[i % key.length] << 24) | (iv[i % iv.length] << 16) | (key[(i + 1) % key.length] << 8) | iv[(i + 1) % iv.length];
    }
    const out = new Uint8Array(pt.length);
    let counter = 0;
    for (let i = 0; i < pt.length; i++) {
      table[counter % 1024] = (table[counter % 1024] + table[(counter + 1) % 1024]) | 0;
      out[i] = pt[i] ^ (table[counter % 1024] & 0xff);
      counter++;
    }
    this._history.push({ method: 'hc256' });
    return out;
  }

  /** SOSEMANUK stream cipher (simplified). */
  sosemanuk(plaintext: string, key: Uint8Array, iv: Uint8Array): Uint8Array {
    const pt = new TextEncoder().encode(plaintext);
    const state = new Uint32Array(10);
    for (let i = 0; i < 10; i++) {
      state[i] = (key[i % key.length] << 24) | (iv[i % iv.length] << 16) | (key[(i + 1) % key.length] << 8) | iv[(i + 1) % iv.length];
    }
    const out = new Uint8Array(pt.length);
    for (let i = 0; i < pt.length; i++) {
      state[i % 10] = (state[i % 10] ^ state[(i + 3) % 10]) | 0;
      out[i] = pt[i] ^ (state[i % 10] & 0xff);
    }
    this._history.push({ method: 'sosemanuk' });
    return out;
  }

  /** Camellia block cipher (simplified). */
  camellia(plaintext: string, key: Uint8Array): Uint8Array {
    const pt = new TextEncoder().encode(plaintext);
    this._history.push({ method: 'camellia' });
    return this._xorStream(pt, key, 'Camellia');
  }

  /** ARIA block cipher (simplified, Korean standard). */
  aria(plaintext: string, key: Uint8Array): Uint8Array {
    const pt = new TextEncoder().encode(plaintext);
    this._history.push({ method: 'aria' });
    return this._xorStream(pt, key, 'ARIA');
  }

  /** SEED block cipher (simplified, Korean standard). */
  seed(plaintext: string, key: Uint8Array): Uint8Array {
    const pt = new TextEncoder().encode(plaintext);
    this._history.push({ method: 'seed' });
    return this._xorStream(pt, key, 'SEED');
  }

  /** IDEA block cipher (simplified). */
  idea(plaintext: string, key: Uint8Array): Uint8Array {
    const pt = new TextEncoder().encode(plaintext);
    const roundKeys = this.keySchedule(key, 'IDEA');
    let state = pt;
    for (let r = 0; r < 8; r++) {
      state = this._xorStream(state, roundKeys[r % roundKeys.length], 'IDEA');
    }
    this._history.push({ method: 'idea' });
    return state;
  }

  /** CAST-128 block cipher (simplified). */
  cast128(plaintext: string, key: Uint8Array): Uint8Array {
    const pt = new TextEncoder().encode(plaintext);
    this._history.push({ method: 'cast128' });
    return this._xorStream(pt, key, 'CAST5');
  }

  /** Skipjack block cipher (simplified). */
  skipjack(plaintext: string, key: Uint8Array): Uint8Array {
    const pt = new TextEncoder().encode(plaintext);
    this._history.push({ method: 'skipjack' });
    return this._xorStream(pt, key, 'Skipjack');
  }

  /** Twofish block cipher (simplified, AES finalist). */
  twofish(plaintext: string, key: Uint8Array): Uint8Array {
    const pt = new TextEncoder().encode(plaintext);
    this._history.push({ method: 'twofish' });
    return this._xorStream(pt, key, 'Twofish');
  }

  /** Serpent block cipher (simplified, AES finalist). */
  serpent(plaintext: string, key: Uint8Array): Uint8Array {
    const pt = new TextEncoder().encode(plaintext);
    this._history.push({ method: 'serpent' });
    return this._xorStream(pt, key, 'Serpent');
  }

  /** MARS block cipher (simplified, AES candidate). */
  mars(plaintext: string, key: Uint8Array): Uint8Array {
    const pt = new TextEncoder().encode(plaintext);
    this._history.push({ method: 'mars' });
    return this._xorStream(pt, key, 'MARS');
  }

  /** RC2 block cipher (simplified). */
  rc2(plaintext: string, key: Uint8Array): Uint8Array {
    const pt = new TextEncoder().encode(plaintext);
    this._history.push({ method: 'rc2' });
    return this._xorStream(pt, key, 'RC2');
  }

  /** RC5 block cipher (simplified). */
  rc5(plaintext: string, key: Uint8Array, rounds = 12): Uint8Array {
    const pt = new TextEncoder().encode(plaintext);
    let out = pt;
    for (let r = 0; r < rounds; r++) {
      out = this._xorStream(out, key, `RC5-r${r}`);
    }
    this._history.push({ method: 'rc5', rounds });
    return out;
  }

  /** RC6 block cipher (simplified, AES finalist). */
  rc6(plaintext: string, key: Uint8Array): Uint8Array {
    const pt = new TextEncoder().encode(plaintext);
    this._history.push({ method: 'rc6' });
    return this._xorStream(pt, key, 'RC6');
  }

  /** TEA (Tiny Encryption Algorithm). */
  tea(plaintext: string, key: Uint8Array): Uint8Array {
    const pt = new TextEncoder().encode(plaintext);
    const k = new Uint32Array(4);
    for (let i = 0; i < 4; i++) {
      k[i] = (key[i * 4 % key.length] << 24) | (key[(i * 4 + 1) % key.length] << 16) | (key[(i * 4 + 2) % key.length] << 8) | key[(i * 4 + 3) % key.length];
    }
    const out = new Uint8Array(pt.length);
    for (let i = 0; i < pt.length; i += 8) {
      let v0 = (pt[i] << 24) | (pt[i + 1] << 16) | (pt[i + 2] << 8) | pt[i + 3];
      let v1 = (pt[i + 4] << 24) | (pt[i + 5] << 16) | (pt[i + 6] << 8) | pt[i + 7];
      let sum = 0;
      const delta = 0x9e3779b9;
      for (let r = 0; r < 32; r++) {
        sum = (sum + delta) | 0;
        v0 = (v0 + (((v1 << 4) + k[0]) ^ (v1 + sum) ^ ((v1 >>> 5) + k[1]))) | 0;
        v1 = (v1 + (((v0 << 4) + k[2]) ^ (v0 + sum) ^ ((v0 >>> 5) + k[3]))) | 0;
      }
      out[i] = (v0 >>> 24) & 0xff;
      out[i + 1] = (v0 >>> 16) & 0xff;
      out[i + 2] = (v0 >>> 8) & 0xff;
      out[i + 3] = v0 & 0xff;
      out[i + 4] = (v1 >>> 24) & 0xff;
      out[i + 5] = (v1 >>> 16) & 0xff;
      out[i + 6] = (v1 >>> 8) & 0xff;
      out[i + 7] = v1 & 0xff;
    }
    this._history.push({ method: 'tea' });
    return out;
  }

  /** XTEA (eXtended TEA). */
  xtea(plaintext: string, key: Uint8Array, rounds = 32): Uint8Array {
    const pt = new TextEncoder().encode(plaintext);
    const k = new Uint32Array(4);
    for (let i = 0; i < 4; i++) {
      k[i] = (key[i * 4 % key.length] << 24) | (key[(i * 4 + 1) % key.length] << 16) | (key[(i * 4 + 2) % key.length] << 8) | key[(i * 4 + 3) % key.length];
    }
    const out = new Uint8Array(pt.length);
    for (let i = 0; i < pt.length; i += 8) {
      let v0 = (pt[i] << 24) | (pt[i + 1] << 16) | (pt[i + 2] << 8) | pt[i + 3];
      let v1 = (pt[i + 4] << 24) | (pt[i + 5] << 16) | (pt[i + 6] << 8) | pt[i + 7];
      let sum = 0;
      const delta = 0x9e3779b9;
      for (let r = 0; r < rounds; r++) {
        v0 = (v0 + ((((v1 << 4) ^ (v1 >>> 5)) + v1) ^ (sum + k[sum & 3]))) | 0;
        sum = (sum + delta) | 0;
        v1 = (v1 + ((((v0 << 4) ^ (v0 >>> 5)) + v0) ^ (sum + k[(sum >>> 11) & 3]))) | 0;
      }
      out[i] = (v0 >>> 24) & 0xff;
      out[i + 1] = (v0 >>> 16) & 0xff;
      out[i + 2] = (v0 >>> 8) & 0xff;
      out[i + 3] = v0 & 0xff;
      out[i + 4] = (v1 >>> 24) & 0xff;
      out[i + 5] = (v1 >>> 16) & 0xff;
      out[i + 6] = (v1 >>> 8) & 0xff;
      out[i + 7] = v1 & 0xff;
    }
    this._history.push({ method: 'xtea', rounds });
    return out;
  }

  /** XXTEA (Corrected Block TEA). */
  xxtea(plaintext: string, key: Uint8Array): Uint8Array {
    return this.tea(plaintext, key);
  }

  /** Speck block cipher (lightweight, ARX). */
  speck(plaintext: string, key: Uint8Array, rounds = 32): Uint8Array {
    const pt = new TextEncoder().encode(plaintext);
    const out = new Uint8Array(pt.length);
    let keyState = (key[0] << 8) | key[1 % key.length];
    for (let i = 0; i < pt.length; i++) {
      out[i] = pt[i] ^ (keyState & 0xff);
      keyState = ((keyState << 1) | (keyState >>> 15)) & 0xffff;
      if (i % rounds === rounds - 1) keyState ^= 0x1234;
    }
    this._history.push({ method: 'speck', rounds });
    return out;
  }

  /** Simon block cipher (lightweight). */
  simon(plaintext: string, key: Uint8Array, rounds = 32): Uint8Array {
    const pt = new TextEncoder().encode(plaintext);
    const out = new Uint8Array(pt.length);
    let keyState = (key[0] << 8) | key[1 % key.length];
    for (let i = 0; i < pt.length; i++) {
      out[i] = pt[i] ^ ((keyState ^ (keyState >>> 1) ^ (keyState << 2)) & 0xff);
      keyState = ((keyState >>> 1) | (keyState << 15)) & 0xffff;
      if (i % rounds === rounds - 1) keyState ^= 0x5678;
    }
    this._history.push({ method: 'simon', rounds });
    return out;
  }

  /** PRESENT block cipher (lightweight). */
  present(plaintext: string, key: Uint8Array): Uint8Array {
    const pt = new TextEncoder().encode(plaintext);
    this._history.push({ method: 'present' });
    return this._xorStream(pt, key, 'PRESENT');
  }

  /** AES-NI simulated instruction. */
  aesNiInstruction(op: 'enc' | 'dec', block: Uint8Array, key: Uint8Array): Uint8Array {
    if (op === 'enc') return this.aesEncryptBlock(block, key);
    return this.aesEncryptBlock(block, key);
  }

  /** Constant-time byte comparison. */
  constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
    return diff === 0;
  }

  /** Hex encode bytes. */
  bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /** Hex decode to bytes. */
  hexToBytes(hex: string): Uint8Array {
    const out = new Uint8Array(hex.length / 2);
    for (let i = 0; i < out.length; i++) {
      out[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    return out;
  }

  /** Base64 encode bytes. */
  bytesToBase64(bytes: Uint8Array): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let out = '';
    for (let i = 0; i < bytes.length; i += 3) {
      const b1 = bytes[i];
      const b2 = bytes[i + 1] ?? 0;
      const b3 = bytes[i + 2] ?? 0;
      out += chars[b1 >> 2];
      out += chars[((b1 & 0x03) << 4) | (b2 >> 4)];
      out += i + 1 < bytes.length ? chars[((b2 & 0x0f) << 2) | (b3 >> 6)] : '=';
      out += i + 2 < bytes.length ? chars[b3 & 0x3f] : '=';
    }
    return out;
  }

  /** Base64 decode to bytes. */
  base64ToBytes(b64: string): Uint8Array {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    const cleaned = b64.replace(/=/g, '');
    const out: number[] = [];
    let buffer = 0;
    let bits = 0;
    for (const c of cleaned) {
      const idx = chars.indexOf(c);
      if (idx < 0) continue;
      buffer = (buffer << 6) | idx;
      bits += 6;
      if (bits >= 8) {
        bits -= 8;
        out.push((buffer >> bits) & 0xff);
      }
    }
    return new Uint8Array(out);
  }

  /** Compute the avalanche effect between two byte arrays. */
  avalancheEffect(a: Uint8Array, b: Uint8Array): number {
    if (a.length !== b.length) return -1;
    let diff = 0;
    for (let i = 0; i < a.length; i++) {
      let x = a[i] ^ b[i];
      while (x) { diff++; x &= x - 1; }
    }
    return (diff * 100) / (a.length * 8);
  }

  /** Compute bit difference count. */
  bitDifference(a: Uint8Array, b: Uint8Array): number {
    if (a.length !== b.length) return -1;
    let diff = 0;
    for (let i = 0; i < a.length; i++) {
      let x = a[i] ^ b[i];
      while (x) { diff++; x &= x - 1; }
    }
    return diff;
  }

  /** Compute Hamming weight. */
  hammingWeight(bytes: Uint8Array): number {
    let w = 0;
    for (const b of bytes) {
      let x = b;
      while (x) { w++; x &= x - 1; }
    }
    return w;
  }

  /** Compute Hamming distance. */
  hammingDistance(a: Uint8Array, b: Uint8Array): number {
    return this.bitDifference(a, b);
  }

  /** Validate AES key size. */
  validateAesKey(key: Uint8Array): boolean {
    return key.length === 16 || key.length === 24 || key.length === 32;
  }

  /** Validate DES key size. */
  validateDesKey(key: Uint8Array): boolean {
    return key.length === 8;
  }

  /** Validate 3DES key size. */
  validateTripleDesKey(key: Uint8Array): boolean {
    return key.length === 16 || key.length === 24;
  }

  /** Validate ChaCha20 key size. */
  validateChaChaKey(key: Uint8Array): boolean {
    return key.length === 32;
  }

  /** Get cipher info by name. */
  getCipherInfo(algorithm: string): BlockCipher | null {
    const info: Record<string, BlockCipher> = {
      AES: { algorithm: 'AES', blockSize: 16, keySize: 32, rounds: 14 },
      DES: { algorithm: 'DES', blockSize: 8, keySize: 8, rounds: 16 },
      '3DES': { algorithm: '3DES', blockSize: 8, keySize: 24, rounds: 48 },
      Blowfish: { algorithm: 'Blowfish', blockSize: 8, keySize: 56, rounds: 16 },
      Twofish: { algorithm: 'Twofish', blockSize: 16, keySize: 32, rounds: 16 },
      Serpent: { algorithm: 'Serpent', blockSize: 16, keySize: 32, rounds: 32 },
      Camellia: { algorithm: 'Camellia', blockSize: 16, keySize: 32, rounds: 24 },
      IDEA: { algorithm: 'IDEA', blockSize: 8, keySize: 16, rounds: 8 },
      CAST5: { algorithm: 'CAST5', blockSize: 8, keySize: 16, rounds: 16 },
      RC5: { algorithm: 'RC5', blockSize: 8, keySize: 16, rounds: 12 },
      RC6: { algorithm: 'RC6', blockSize: 16, keySize: 32, rounds: 20 },
    };
    return info[algorithm] ?? null;
  }

  /** Get supported modes. */
  supportedModes(): string[] {
    return ['ECB', 'CBC', 'CTR', 'GCM', 'CFB', 'OFB', 'CCM', 'EAX', 'OCB', 'SIV', 'XTS'];
  }

  /** Get supported algorithms. */
  supportedAlgorithms(): string[] {
    return ['AES', 'DES', '3DES', 'ChaCha20', 'Salsa20', 'RC4', 'Blowfish', 'Camellia', 'ARIA', 'SEED', 'IDEA', 'CAST5', 'Skipjack', 'Twofish', 'Serpent', 'MARS', 'RC2', 'RC5', 'RC6', 'TEA', 'XTEA', 'XXTEA', 'Speck', 'Simon', 'PRESENT'];
  }

  /** Get supported padding schemes. */
  supportedPadding(): string[] {
    return ['pkcs7', 'pkcs5', 'zero', 'iso7816', 'ansiX923', 'iso10126', 'none'];
  }

  /** Get supported MAC algorithms. */
  supportedMacs(): string[] {
    return ['HMAC', 'CMAC', 'GMAC', 'Poly1305'];
  }

  /** Get supported DRBG algorithms. */
  supportedDrbgs(): string[] {
    return ['CTR-DRBG', 'HMAC-DRBG', 'Hash-DRBG'];
  }

  /** Get history entries. */
  getHistory(): unknown[] {
    return [...this._history];
  }

  /** Get history depth. */
  get historyLength(): number {
    return this._history.length;
  }

  /** Clear history. */
  clearHistory(): void {
    this._history = [];
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
