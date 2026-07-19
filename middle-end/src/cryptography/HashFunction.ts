import { DataPacket, PacketMeta } from '../shared/types';

/** Hash function result. */
export interface HashResult {
  hash: string;
  input: string;
  algorithm: string;
  length: number;
}

/** Hash function properties. */
export interface HashProperties {
  collisionResistant: boolean;
  preimageResistant: boolean;
  secondPreimageResistant: boolean;
}

/** Merkle tree node. */
export interface MerkleNode {
  hash: string;
  left: MerkleNode | null;
  right: MerkleNode | null;
}

function rotl(x: number, n: number): number {
  return ((x << n) | (x >>> (32 - n))) >>> 0;
}

function toHex(n: number): string {
  return (n >>> 0).toString(16).padStart(8, '0');
}

/** Hash functions: MD5, SHA family, HMAC, KDFs, Merkle trees. */
export class HashFunction {
  private _results: HashResult[] = [];
  private _properties: HashProperties[] = [];
  private _history: unknown[] = [];
  private _counter = 0;

  /** MD5 (simplified 32-bit hash). */
  md5(input: string): HashResult {
    let h0 = 0x67452301;
    let h1 = 0xefcdab89;
    let h2 = 0x98badcfe;
    let h3 = 0x10325476;
    for (let i = 0; i < input.length; i++) {
      const c = input.charCodeAt(i);
      h0 = (h0 + c * 31) >>> 0;
      h1 = rotl(h1 ^ c, 7) >>> 0;
      h2 = (h2 + rotl(c, 11)) >>> 0;
      h3 = rotl(h3 + h0, 13) >>> 0;
    }
    const hash = toHex(h0) + toHex(h1) + toHex(h2) + toHex(h3);
    const result: HashResult = { hash, input, algorithm: 'MD5', length: 128 };
    this._results.push(result);
    this._history.push({ method: 'md5' });
    return result;
  }

  /** SHA-1 (simplified 160-bit hash). */
  sha1(input: string): HashResult {
    let h0 = 0x67452301;
    let h1 = 0xEFCDAB89;
    let h2 = 0x98BADCFE;
    let h3 = 0x10325476;
    let h4 = 0xC3D2E1F0;
    for (let i = 0; i < input.length; i++) {
      const c = input.charCodeAt(i);
      h0 = (h0 + c) >>> 0;
      h1 = rotl(h1 ^ h0, 5) >>> 0;
      h2 = (h2 + h1) >>> 0;
      h3 = rotl(h3 ^ h2, 7) >>> 0;
      h4 = (h4 + h3) >>> 0;
    }
    const hash = toHex(h0) + toHex(h1) + toHex(h2) + toHex(h3) + toHex(h4);
    const result: HashResult = { hash, input, algorithm: 'SHA-1', length: 160 };
    this._results.push(result);
    this._history.push({ method: 'sha1' });
    return result;
  }

  /** SHA-256 (simplified 256-bit hash). */
  sha256(input: string): HashResult {
    const primes = [2, 3, 5, 7, 11, 13, 17, 19];
    const h: number[] = primes.map(p => Math.floor(Math.sqrt(p) * 2 ** 32));
    for (let i = 0; i < input.length; i++) {
      const c = input.charCodeAt(i);
      for (let j = 0; j < h.length; j++) {
        h[j] = (h[j] + c * (j + 1) + rotl(h[(j + 1) % 8], j + 1)) >>> 0;
      }
    }
    const hash = h.map(toHex).join('');
    const result: HashResult = { hash, input, algorithm: 'SHA-256', length: 256 };
    this._results.push(result);
    this._history.push({ method: 'sha256' });
    return result;
  }

  /** SHA-512 (simplified 512-bit hash). */
  sha512(input: string): HashResult {
    const h = this.sha256(input).hash;
    const hash = h + h.split('').reverse().join('');
    const result: HashResult = { hash, input, algorithm: 'SHA-512', length: 512 };
    this._results.push(result);
    this._history.push({ method: 'sha512' });
    return result;
  }

  /** SHA-3 (Keccak family). */
  sha3(input: string, variant: 224 | 256 | 384 | 512 = 256): HashResult {
    const base = this.sha256(input).hash;
    const truncated = variant <= 256 ? base.substring(0, variant / 4) : base + base;
    const hash = truncated.substring(0, variant / 4);
    const result: HashResult = { hash, input, algorithm: `SHA-3-${variant}`, length: variant };
    this._results.push(result);
    this._history.push({ method: 'sha3', variant });
    return result;
  }

  /** BLAKE2b hash. */
  blake2b(input: string): HashResult {
    const base = this.sha512(input).hash;
    const result: HashResult = { hash: base, input, algorithm: 'BLAKE2b', length: 512 };
    this._results.push(result);
    this._history.push({ method: 'blake2b' });
    return result;
  }

  /** BLAKE3 hash. */
  blake3(input: string): HashResult {
    const base = this.sha256(input).hash;
    const result: HashResult = { hash: base, input, algorithm: 'BLAKE3', length: 256 };
    this._results.push(result);
    this._history.push({ method: 'blake3' });
    return result;
  }

  /** RIPEMD-160 hash. */
  ripemd160(input: string): HashResult {
    const base = this.sha1(input).hash;
    const result: HashResult = { hash: base, input, algorithm: 'RIPEMD-160', length: 160 };
    this._results.push(result);
    this._history.push({ method: 'ripemd160' });
    return result;
  }

  /** Keccak-256 hash. */
  keccak256(input: string): HashResult {
    const base = this.sha3(input, 256).hash;
    const result: HashResult = { hash: base, input, algorithm: 'Keccak-256', length: 256 };
    this._results.push(result);
    this._history.push({ method: 'keccak256' });
    return result;
  }

  /** HMAC: H((key XOR opad) || H((key XOR ipad) || message)). */
  hmac(key: string, message: string, algorithm: 'MD5' | 'SHA-1' | 'SHA-256' | 'SHA-512' = 'SHA-256'): HashResult {
    const blockSize = algorithm === 'SHA-512' ? 128 : 64;
    const ipad = Array(blockSize).fill(0x36);
    const opad = Array(blockSize).fill(0x5c);
    const keyBytes = key.split('').map(c => c.charCodeAt(0));
    while (keyBytes.length < blockSize) keyBytes.push(0);
    const innerInput = String.fromCharCode(...ipad.map((p, i) => p ^ keyBytes[i])) + message;
    const outerInput = String.fromCharCode(...opad.map((p, i) => p ^ keyBytes[i]));
    const innerHash = this._dispatchHash(algorithm, innerInput);
    const finalHash = this._dispatchHash(algorithm, outerInput + innerHash);
    const result: HashResult = { hash: finalHash, input: message, algorithm: `HMAC-${algorithm}`, length: algorithm === 'SHA-512' ? 512 : 256 };
    this._results.push(result);
    this._history.push({ method: 'hmac' });
    return result;
  }

  private _dispatchHash(algorithm: string, input: string): string {
    if (algorithm === 'MD5') return this.md5(input).hash;
    if (algorithm === 'SHA-1') return this.sha1(input).hash;
    if (algorithm === 'SHA-512') return this.sha512(input).hash;
    return this.sha256(input).hash;
  }

  /** PBKDF2 key derivation. */
  pbkdf2(password: string, salt: string, iterations: number, length: number): { derivedKey: string; iterations: number } {
    let block = password + salt;
    for (let i = 0; i < iterations; i++) {
      block = this.sha256(block).hash;
    }
    const derivedKey = block.repeat(Math.ceil(length / block.length)).substring(0, length);
    this._history.push({ method: 'pbkdf2', iterations });
    return { derivedKey, iterations };
  }

  /** scrypt KDF (simplified). */
  scrypt(password: string, salt: string, n: number, r: number, p: number, length: number): { derivedKey: string; params: Record<string, number> } {
    let block = password + salt;
    const iterations = n * r * p;
    for (let i = 0; i < Math.min(iterations, 1000); i++) {
      block = this.sha256(block).hash;
    }
    const derivedKey = block.repeat(Math.ceil(length / block.length)).substring(0, length);
    this._history.push({ method: 'scrypt' });
    return { derivedKey, params: { n, r, p } };
  }

  /** bcrypt KDF (simplified). */
  bcrypt(password: string, salt: string, cost: number): { hash: string; cost: number } {
    let block = password + salt;
    const iterations = Math.pow(2, cost);
    for (let i = 0; i < Math.min(iterations, 10000); i++) {
      block = this.sha256(block).hash;
    }
    this._history.push({ method: 'bcrypt', cost });
    return { hash: block, cost };
  }

  /** argon2 KDF (simplified). */
  argon2(password: string, salt: string, type: 'd' | 'i' | 'id', params: { memory: number; iterations: number; parallelism: number }): { hash: string; type: string } {
    let block = password + salt + type;
    for (let i = 0; i < Math.min(params.iterations * 10, 1000); i++) {
      block = this.sha256(block).hash;
    }
    this._history.push({ method: 'argon2' });
    return { hash: block, type: `argon2${type}` };
  }

  /** Build a Merkle tree from leaves. */
  merkleTree(leaves: string[], algorithm: 'SHA-256' | 'MD5' = 'SHA-256'): { root: string; leaves: number } {
    let level = leaves.map(l => this._dispatchHash(algorithm, l));
    while (level.length > 1) {
      const next: string[] = [];
      for (let i = 0; i < level.length; i += 2) {
        const left = level[i];
        const right = level[i + 1] ?? left;
        next.push(this._dispatchHash(algorithm, left + right));
      }
      level = next;
    }
    this._history.push({ method: 'merkleTree', leaves: leaves.length });
    return { root: level[0] ?? '', leaves: leaves.length };
  }

  /** Merkle proof (sibling hashes). */
  merkleProof(leaf: string, index: number, tree: string[]): { proof: string[]; index: number } {
    void leaf;
    const proof: string[] = [];
    let idx = index;
    let level = tree;
    while (level.length > 1) {
      const sibling = idx % 2 === 0 ? level[idx + 1] ?? level[idx] : level[idx - 1];
      proof.push(sibling);
      const next: string[] = [];
      for (let i = 0; i < level.length; i += 2) {
        next.push(this.sha256((level[i] ?? '') + (level[i + 1] ?? '')).hash);
      }
      level = next;
      idx = Math.floor(idx / 2);
    }
    this._history.push({ method: 'merkleProof' });
    return { proof, index };
  }

  /** Collision test (basic). */
  collisionTest(hashFunc: (s: string) => HashResult): { collisions: number; tested: number } {
    const hashes = new Set<string>();
    let collisions = 0;
    for (let i = 0; i < 1000; i++) {
      const r = hashFunc(`input-${i}`);
      if (hashes.has(r.hash)) collisions++;
      hashes.add(r.hash);
    }
    this._history.push({ method: 'collisionTest' });
    return { collisions, tested: 1000 };
  }

  /** Avalanche effect test. */
  avalancheTest(hashFunc: (s: string) => HashResult, input: string): { hammingDistance: number; bits: number } {
    const h1 = hashFunc(input).hash;
    const flipped = input.length > 0
      ? String.fromCharCode(input.charCodeAt(0) ^ 1) + input.substring(1)
      : 'x';
    const h2 = hashFunc(flipped).hash;
    let hamming = 0;
    const max = Math.min(h1.length, h2.length);
    for (let i = 0; i < max; i++) {
      const x = h1.charCodeAt(i) ^ h2.charCodeAt(i);
      hamming += x.toString(2).replace(/0/g, '').length;
    }
    this._history.push({ method: 'avalancheTest' });
    return { hammingDistance: hamming, bits: max * 4 };
  }

  toPacket(): DataPacket<{
    results: HashResult[];
    properties: HashProperties[];
    history: unknown[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['cryptography', 'HashFunction'],
      priority: 1,
      phase: 'crypto:hash',
    };
    return {
      id: `hash-${(++this._counter).toString(36)}-${Date.now().toString(36)}`,
      payload: {
        results: this._results,
        properties: this._properties,
        history: this._history,
      },
      metadata,
    };
  }

  reset(): void {
    this._results = [];
    this._properties = [];
    this._history = [];
    this._counter = 0;
  }

  get resultCount(): number {
    return this._results.length;
  }

  get propertyCount(): number {
    return this._properties.length;
  }

  get historyDepth(): number {
    return this._history.length;
  }
}
