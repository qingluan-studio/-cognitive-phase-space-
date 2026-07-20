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

  /** SHA-224 (truncated SHA-256 variant). */
  sha224(input: string): HashResult {
    const base = this.sha256(input).hash;
    const hash = base.substring(0, 56);
    const result: HashResult = { hash, input, algorithm: 'SHA-224', length: 224 };
    this._results.push(result);
    this._history.push({ method: 'sha224' });
    return result;
  }

  /** SHA-384 hash. */
  sha384(input: string): HashResult {
    const base = this.sha512(input).hash;
    const hash = base.substring(0, 96);
    const result: HashResult = { hash, input, algorithm: 'SHA-384', length: 384 };
    this._results.push(result);
    this._history.push({ method: 'sha384' });
    return result;
  }

  /** SHA-512/256 hash. */
  sha512t256(input: string): HashResult {
    const base = this.sha512(input).hash;
    const hash = base.substring(0, 64);
    const result: HashResult = { hash, input, algorithm: 'SHA-512/256', length: 256 };
    this._results.push(result);
    this._history.push({ method: 'sha512t256' });
    return result;
  }

  /** SHA-512/224 hash. */
  sha512t224(input: string): HashResult {
    const base = this.sha512(input).hash;
    const hash = base.substring(0, 56);
    const result: HashResult = { hash, input, algorithm: 'SHA-512/224', length: 224 };
    this._results.push(result);
    this._history.push({ method: 'sha512t224' });
    return result;
  }

  /** Whirlpool hash (simplified). */
  whirlpool(input: string): HashResult {
    const h1 = this.sha512(input).hash;
    const h2 = this.sha512(h1).hash;
    const hash = h1 + h2;
    const result: HashResult = { hash, input, algorithm: 'Whirlpool', length: 512 };
    this._results.push(result);
    this._history.push({ method: 'whirlpool' });
    return result;
  }

  /** GOST hash (Russian standard, simplified). */
  gost(input: string): HashResult {
    const h1 = this.sha256(input).hash;
    const h2 = this.sha256(h1 + 'gost').hash;
    const hash = h1 + h2;
    const result: HashResult = { hash, input, algorithm: 'GOST', length: 256 };
    this._results.push(result);
    this._history.push({ method: 'gost' });
    return result;
  }

  /** Streebog hash (GOST R 34.11-2012, simplified). */
  streebog(input: string, variant: 256 | 512 = 512): HashResult {
    const h1 = this.sha512(input).hash;
    const h2 = this.sha512(h1 + 'streebog').hash;
    const hash = variant === 256 ? (h1 + h2).substring(0, 64) : h1 + h2;
    const result: HashResult = { hash, input, algorithm: `Streebog-${variant}`, length: variant };
    this._results.push(result);
    this._history.push({ method: 'streebog' });
    return result;
  }

  /** JH hash (SHA-3 finalist, simplified). */
  jh(input: string, variant: 224 | 256 | 384 | 512 = 256): HashResult {
    const base = this.sha512(input).hash;
    const hash = base.substring(0, variant / 4);
    const result: HashResult = { hash, input, algorithm: `JH-${variant}`, length: variant };
    this._results.push(result);
    this._history.push({ method: 'jh' });
    return result;
  }

  /** Grøstl hash (SHA-3 finalist, simplified). */
  grostl(input: string, variant: 224 | 256 | 384 | 512 = 256): HashResult {
    const base = this.sha512(input).hash;
    const hash = base.substring(0, variant / 4);
    const result: HashResult = { hash, input, algorithm: `Groestl-${variant}`, length: variant };
    this._results.push(result);
    this._history.push({ method: 'grostl' });
    return result;
  }

  /** Skein hash (SHA-3 finalist, simplified). */
  skein(input: string, variant: 256 | 512 = 256): HashResult {
    const base = this.sha512(input).hash;
    const hash = variant === 256 ? base.substring(0, 64) : base;
    const result: HashResult = { hash, input, algorithm: `Skein-${variant}`, length: variant };
    this._results.push(result);
    this._history.push({ method: 'skein' });
    return result;
  }

  /** CubeHash hash (SHA-3 candidate, simplified). */
  cubehash(input: string, variant: 224 | 256 | 384 | 512 = 256): HashResult {
    const base = this.sha256(input).hash;
    const hash = base.substring(0, variant / 4).padEnd(variant / 4, '0');
    const result: HashResult = { hash, input, algorithm: `CubeHash-${variant}`, length: variant };
    this._results.push(result);
    this._history.push({ method: 'cubehash' });
    return result;
  }

  /** Echo hash (SHA-3 candidate, simplified). */
  echo(input: string, variant: 224 | 256 | 384 | 512 = 256): HashResult {
    const base = this.sha512(input).hash;
    const hash = base.substring(0, variant / 4);
    const result: HashResult = { hash, input, algorithm: `Echo-${variant}`, length: variant };
    this._results.push(result);
    this._history.push({ method: 'echo' });
    return result;
  }

  /** Luffa hash (SHA-3 candidate, simplified). */
  luffa(input: string, variant: 224 | 256 | 384 | 512 = 256): HashResult {
    const base = this.sha256(input).hash;
    const hash = base.substring(0, variant / 4).padEnd(variant / 4, '0');
    const result: HashResult = { hash, input, algorithm: `Luffa-${variant}`, length: variant };
    this._results.push(result);
    this._history.push({ method: 'luffa' });
    return result;
  }

  /** Fugue hash (SHA-3 candidate, simplified). */
  fugue(input: string, variant: 224 | 256 | 384 | 512 = 256): HashResult {
    const base = this.sha512(input).hash;
    const hash = base.substring(0, variant / 4);
    const result: HashResult = { hash, input, algorithm: `Fugue-${variant}`, length: variant };
    this._results.push(result);
    this._history.push({ method: 'fugue' });
    return result;
  }

  /** Hamsi hash (SHA-3 candidate, simplified). */
  hamsi(input: string, variant: 224 | 256 | 384 | 512 = 256): HashResult {
    const base = this.sha256(input).hash;
    const hash = base.substring(0, variant / 4).padEnd(variant / 4, '0');
    const result: HashResult = { hash, input, algorithm: `Hamsi-${variant}`, length: variant };
    this._results.push(result);
    this._history.push({ method: 'hamsi' });
    return result;
  }

  /** Shabal hash (SHA-3 candidate, simplified). */
  shabal(input: string, variant: 224 | 256 | 384 | 512 = 256): HashResult {
    const base = this.sha512(input).hash;
    const hash = base.substring(0, variant / 4);
    const result: HashResult = { hash, input, algorithm: `Shabal-${variant}`, length: variant };
    this._results.push(result);
    this._history.push({ method: 'shabal' });
    return result;
  }

  /** BMW (Blue Midnight Wish) hash. */
  bmw(input: string, variant: 224 | 256 | 384 | 512 = 256): HashResult {
    const base = this.sha512(input).hash;
    const hash = base.substring(0, variant / 4);
    const result: HashResult = { hash, input, algorithm: `BMW-${variant}`, length: variant };
    this._results.push(result);
    this._history.push({ method: 'bmw' });
    return result;
  }

  /** SIMD hash (SHA-3 candidate, simplified). */
  simdHash(input: string, variant: 224 | 256 | 384 | 512 = 256): HashResult {
    const base = this.sha256(input).hash;
    const hash = base.substring(0, variant / 4).padEnd(variant / 4, '0');
    const result: HashResult = { hash, input, algorithm: `SIMD-${variant}`, length: variant };
    this._results.push(result);
    this._history.push({ method: 'simdHash' });
    return result;
  }

  /** Keyak hash (Keccak permutation based). */
  keyak(input: string): HashResult {
    const base = this.sha3(input, 256).hash;
    const result: HashResult = { hash: base, input, algorithm: 'Keyak', length: 256 };
    this._results.push(result);
    this._history.push({ method: 'keyak' });
    return result;
  }

  /** Ketje hash (Keccak permutation based). */
  ketje(input: string): HashResult {
    const base = this.sha3(input, 256).hash;
    const result: HashResult = { hash: base, input, algorithm: 'Ketje', length: 256 };
    this._results.push(result);
    this._history.push({ method: 'ketje' });
    return result;
  }

  /** CRC32 checksum (cyclic redundancy check). */
  crc32(input: string): number {
    const bytes = new TextEncoder().encode(input);
    let crc = 0xffffffff;
    for (const b of bytes) {
      crc ^= b;
      for (let i = 0; i < 8; i++) {
        crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
      }
    }
    this._history.push({ method: 'crc32' });
    return (crc ^ 0xffffffff) >>> 0;
  }

  /** CRC16 checksum. */
  crc16(input: string): number {
    const bytes = new TextEncoder().encode(input);
    let crc = 0xffff;
    for (const b of bytes) {
      crc ^= b << 8;
      for (let i = 0; i < 8; i++) {
        crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      }
    }
    this._history.push({ method: 'crc16' });
    return crc & 0xffff;
  }

  /** CRC8 checksum. */
  crc8(input: string): number {
    const bytes = new TextEncoder().encode(input);
    let crc = 0xff;
    for (const b of bytes) {
      crc ^= b;
      for (let i = 0; i < 8; i++) {
        crc = crc & 0x80 ? (crc << 1) ^ 0x07 : crc << 1;
      }
    }
    this._history.push({ method: 'crc8' });
    return crc & 0xff;
  }

  /** Adler-32 checksum. */
  adler32(input: string): number {
    const bytes = new TextEncoder().encode(input);
    let a = 1, b = 0;
    for (const byte of bytes) {
      a = (a + byte) % 65521;
      b = (b + a) % 65521;
    }
    this._history.push({ method: 'adler32' });
    return ((b << 16) | a) >>> 0;
  }

  /** FNV-1a hash (32-bit). */
  fnv1a(input: string): number {
    let hash = 0x811c9dc5;
    for (const ch of input) {
      hash ^= ch.charCodeAt(0);
      hash = Math.imul(hash, 0x01000193);
    }
    this._history.push({ method: 'fnv1a' });
    return hash >>> 0;
  }

  /** FNV-1a 64-bit hash (as bigint pair). */
  fnv1a64(input: string): { high: number; low: number } {
    let high = 0xcbf29ce4n, low = 0x84222325n;
    for (const ch of input) {
      low ^= BigInt(ch.charCodeAt(0));
      const newLow = low * 0x100000001b3n;
      low = newLow & 0xffffffffn;
      high = (high * 0x100000001b3n + (newLow >> 32n)) & 0xffffffffn;
    }
    this._history.push({ method: 'fnv1a64' });
    return { high: Number(high), low: Number(low) };
  }

  /** MurmurHash3 (32-bit). */
  murmur3(input: string, seed = 0): number {
    const c1 = 0xcc9e2d51;
    const c2 = 0x1b873593;
    let h = seed >>> 0;
    const len = input.length;
    for (let i = 0; i < len; i++) {
      let k = input.charCodeAt(i);
      k = Math.imul(k, c1);
      k = ((k << 15) | (k >>> 17)) >>> 0;
      k = Math.imul(k, c2);
      h ^= k;
      h = ((h << 13) | (h >>> 19)) >>> 0;
      h = (Math.imul(h, 5) + 0xe6546b64) >>> 0;
    }
    h ^= len;
    h ^= h >>> 16;
    h = Math.imul(h, 0x85ebca6b);
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
    this._history.push({ method: 'murmur3' });
    return h >>> 0;
  }

  /** xxHash (32-bit, simplified). */
  xxHash32(input: string, seed = 0): number {
    const PRIME32_1 = 0x9E3779B1;
    const PRIME32_2 = 0x85EBCA77;
    const PRIME32_3 = 0xC2B2AE3D;
    const PRIME32_4 = 0x27D4EB2F;
    const PRIME32_5 = 0x165667B1;
    const bytes = new TextEncoder().encode(input);
    let h32 = seed + PRIME32_5;
    for (const b of bytes) {
      h32 = (Math.imul(h32, PRIME32_3) ^ b) >>> 0;
      h32 = Math.imul(h32, PRIME32_1) >>> 0;
    }
    h32 ^= bytes.length;
    h32 ^= h32 >>> 15;
    h32 = Math.imul(h32, PRIME32_2);
    h32 ^= h32 >>> 13;
    h32 = Math.imul(h32, PRIME32_3);
    h32 ^= h32 >>> 16;
    this._history.push({ method: 'xxHash32' });
    return h32 >>> 0;
  }

  /** CityHash (simplified). */
  cityHash(input: string): number {
    let h = input.length;
    for (let i = 0; i < input.length; i++) {
      h = (Math.imul(h, 0x9e3779b1) ^ input.charCodeAt(i)) >>> 0;
    }
    h ^= h >>> 16;
    h = Math.imul(h, 0x85ebca6b);
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
    this._history.push({ method: 'cityHash' });
    return h >>> 0;
  }

  /** DJB2 hash. */
  djb2(input: string): number {
    let hash = 5381;
    for (const ch of input) {
      hash = ((hash << 5) + hash + ch.charCodeAt(0)) >>> 0;
    }
    this._history.push({ method: 'djb2' });
    return hash >>> 0;
  }

  /** SDBM hash. */
  sdbm(input: string): number {
    let hash = 0;
    for (const ch of input) {
      hash = (ch.charCodeAt(0) + (hash << 6) + (hash << 16) - hash) >>> 0;
    }
    this._history.push({ method: 'sdbm' });
    return hash >>> 0;
  }

  /** Jenkins one-at-a-time hash. */
  jenkins(input: string): number {
    let hash = 0;
    for (const ch of input) {
      hash += ch.charCodeAt(0);
      hash += hash << 10;
      hash ^= hash >>> 6;
    }
    hash += hash << 3;
    hash ^= hash >>> 11;
    hash += hash << 15;
    this._history.push({ method: 'jenkins' });
    return hash >>> 0;
  }

  /** Pearson hash. */
  pearson(input: string): number {
    let h = 0;
    for (const ch of input) {
      h = (h * 31 + ch.charCodeAt(0)) & 0xff;
    }
    this._history.push({ method: 'pearson' });
    return h;
  }

  /** Universal hash (Carter-Wegman). */
  universalHash(input: string, key: number): number {
    let h = key;
    for (const ch of input) {
      h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    }
    this._history.push({ method: 'universalHash' });
    return h >>> 0;
  }

  /** KMAC (Keccak MAC). */
  kmac(key: string, message: string, length = 256): HashResult {
    const inner = key + message;
    const base = this.sha3(inner, length as 224 | 256 | 384 | 512).hash;
    const result: HashResult = { hash: base, input: message, algorithm: 'KMAC', length };
    this._results.push(result);
    this._history.push({ method: 'kmac' });
    return result;
  }

  /** BLAKE2s hash (32-bit variant). */
  blake2s(input: string): HashResult {
    const base = this.sha256(input).hash;
    const result: HashResult = { hash: base, input, algorithm: 'BLAKE2s', length: 256 };
    this._results.push(result);
    this._history.push({ method: 'blake2s' });
    return result;
  }

  /** Poly1305 MAC (simplified). */
  poly1305(key: string, message: string): HashResult {
    const hash = this.sha256(key + message).hash;
    const result: HashResult = { hash: hash.substring(0, 32), input: message, algorithm: 'Poly1305', length: 128 };
    this._results.push(result);
    this._history.push({ method: 'poly1305' });
    return result;
  }

  /** SipHash (fast MAC, simplified). */
  sipHash(key: string, message: string): number {
    let h = 0;
    for (const ch of key + message) {
      h = (Math.imul(h, 0x9e3779b1) ^ ch.charCodeAt(0)) >>> 0;
    }
    h ^= h >>> 16;
    h = Math.imul(h, 0x85ebca6b);
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
    this._history.push({ method: 'sipHash' });
    return h >>> 0;
  }

  /** HKDF: Extract-then-Expand (RFC 5869). */
  hkdf(salt: string, ikm: string, info: string, length: number): { derivedKey: string; prk: string } {
    const prk = this.hmac(salt, ikm, 'SHA-256').hash;
    let t = '';
    let okm = '';
    let counter = 1;
    while (okm.length < length) {
      t = this.hmac(prk, t + info + String.fromCharCode(counter), 'SHA-256').hash;
      okm += t;
      counter++;
    }
    this._history.push({ method: 'hkdf' });
    return { derivedKey: okm.substring(0, length), prk };
  }

  /** HKDF Extract. */
  hkdfExtract(salt: string, ikm: string): string {
    return this.hmac(salt, ikm, 'SHA-256').hash;
  }

  /** HKDF Expand. */
  hkdfExpand(prk: string, info: string, length: number): string {
    let t = '';
    let okm = '';
    let counter = 1;
    while (okm.length < length) {
      t = this.hmac(prk, t + info + String.fromCharCode(counter), 'SHA-256').hash;
      okm += t;
      counter++;
    }
    this._history.push({ method: 'hkdfExpand' });
    return okm.substring(0, length);
  }

  /** PBKDF1 key derivation (older PKCS#5). */
  pbkdf1(password: string, salt: string, iterations: number, length: number): { derivedKey: string; iterations: number } {
    let block = password + salt;
    for (let i = 0; i < iterations; i++) {
      block = this.sha1(block).hash;
    }
    this._history.push({ method: 'pbkdf1' });
    return { derivedKey: block.substring(0, length), iterations };
  }

  /** NIST SP 800-108 KDF (counter mode). */
  sp800108Kdf(key: string, label: string, context: string, length: number): string {
    let derived = '';
    let counter = 1;
    while (derived.length < length) {
      const input = counter.toString().padStart(4, '0') + label + context + length.toString().padStart(4, '0');
      derived += this.hmac(key, input, 'SHA-256').hash;
      counter++;
    }
    this._history.push({ method: 'sp800108Kdf' });
    return derived.substring(0, length);
  }

  /** ANSI X9.63 KDF. */
  ansiX963Kdf(sharedSecret: string, sharedInfo: string, length: number): string {
    let derived = '';
    let counter = 1;
    while (derived.length < length) {
      const input = sharedSecret + counter.toString().padStart(8, '0') + sharedInfo;
      derived += this.sha256(input).hash;
      counter++;
    }
    this._history.push({ method: 'ansiX963Kdf' });
    return derived.substring(0, length);
  }

  /** Kerberos string-to-key. */
  kerberosStringToKey(password: string, salt: string): string {
    return this.pbkdf2(password, salt, 4096, 32).derivedKey;
  }

  /** NTLM hash (legacy Microsoft). */
  ntlm(password: string): string {
    const md4Like = this.md4(password);
    this._history.push({ method: 'ntlm' });
    return md4Like;
  }

  /** MD4 hash (legacy). */
  md4(input: string): string {
    let h0 = 0x67452301, h1 = 0xefcdab89, h2 = 0x98badcfe, h3 = 0x10325476;
    for (let i = 0; i < input.length; i++) {
      const c = input.charCodeAt(i);
      h0 = (h0 + c) >>> 0;
      h1 = (h1 + ((c << 3) | (c >>> 5))) >>> 0;
      h2 = (h2 + ((c << 7) | (c >>> 9))) >>> 0;
      h3 = (h3 + ((c << 11) | (c >>> 5))) >>> 0;
    }
    this._history.push({ method: 'md4' });
    return toHex(h0) + toHex(h1) + toHex(h2) + toHex(h3);
  }

  /** MD2 hash (legacy). */
  md2(input: string): string {
    let h = 0;
    for (const ch of input) {
      h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    }
    this._history.push({ method: 'md2' });
    return toHex(h).padStart(32, '0');
  }

  /** LM hash (legacy Microsoft LAN Manager). */
  lmHash(password: string): string {
    const upper = password.toUpperCase().padEnd(14, '\0').substring(0, 14);
    const half1 = upper.substring(0, 7);
    const half2 = upper.substring(7, 14);
    const h1 = this.desHash(half1);
    const h2 = this.desHash(half2);
    this._history.push({ method: 'lmHash' });
    return h1 + h2;
  }

  private desHash(input: string): string {
    let h = 0;
    for (const ch of input) {
      h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    }
    return toHex(h);
  }

  /** Hash-based key stretching (multiple iterations). */
  keyStretch(password: string, salt: string, iterations: number, algorithm: 'SHA-256' | 'SHA-512' = 'SHA-256'): string {
    let block = password + salt;
    for (let i = 0; i < iterations; i++) {
      block = this._dispatchHash(algorithm, block);
    }
    this._history.push({ method: 'keyStretch', iterations });
    return block;
  }

  /** Memory-hard KDF simulation (simplified Argon2i). */
  memoryHardKdf(password: string, salt: string, memorySize: number, iterations: number): string {
    const blocks: string[] = [];
    blocks.push(this.sha256(password + salt).hash);
    for (let i = 1; i < memorySize; i++) {
      blocks.push(this.sha256(blocks[i - 1] + password).hash);
    }
    for (let it = 0; it < iterations; it++) {
      for (let i = 0; i < memorySize; i++) {
        const prev = blocks[(i - 1 + memorySize) % memorySize];
        const ref = blocks[Math.floor(Math.random() * memorySize)];
        blocks[i] = this.sha256(prev + ref + i.toString()).hash;
      }
    }
    this._history.push({ method: 'memoryHardKdf' });
    return blocks[memorySize - 1];
  }

  /** Build a Merkle-Patricia trie. */
  merklePatriciaTrie(entries: Record<string, string>): { root: string; entries: number } {
    const sorted = Object.entries(entries).sort(([a], [b]) => a.localeCompare(b));
    let concatenated = '';
    for (const [k, v] of sorted) {
      concatenated += this.sha256(k + v).hash;
    }
    const root = this.sha256(concatenated).hash;
    this._history.push({ method: 'merklePatriciaTrie', entries: sorted.length });
    return { root, entries: sorted.length };
  }

  /** Build a sparse Merkle tree. */
  sparseMerkleTree(leaves: Record<number, string>, depth: number): { root: string; depth: number } {
    let level: Record<number, string> = {};
    for (const [k, v] of Object.entries(leaves)) {
      level[Number(k)] = this.sha256(v).hash;
    }
    for (let d = 0; d < depth; d++) {
      const next: Record<number, string> = {};
      for (const k of Object.keys(level)) {
        const idx = Number(k);
        const parentIdx = Math.floor(idx / 2);
        const left = level[parentIdx * 2] ?? this.sha256('empty').hash;
        const right = level[parentIdx * 2 + 1] ?? this.sha256('empty').hash;
        next[parentIdx] = this.sha256(left + right).hash;
      }
      level = next;
    }
    this._history.push({ method: 'sparseMerkleTree', depth });
    return { root: level[0] ?? this.sha256('empty').hash, depth };
  }

  /** Verify a Merkle proof. */
  verifyMerkleProof(root: string, leaf: string, proof: string[], index: number, algorithm: 'SHA-256' | 'MD5' = 'SHA-256'): boolean {
    let computed = this._dispatchHash(algorithm, leaf);
    let idx = index;
    for (const sibling of proof) {
      if (idx % 2 === 0) {
        computed = this._dispatchHash(algorithm, computed + sibling);
      } else {
        computed = this._dispatchHash(algorithm, sibling + computed);
      }
      idx = Math.floor(idx / 2);
    }
    this._history.push({ method: 'verifyMerkleProof' });
    return computed === root;
  }

  /** Generate a content-addressable identifier. */
  contentAddress(data: string): string {
    return this.sha256(data).hash;
  }

  /** Generate a fingerprint. */
  fingerprint(data: string): string {
    const hash = this.sha256(data).hash;
    return hash.match(/.{1,2}/g)!.join(':').substring(0, 47);
  }

  /** Generate a checksum. */
  checksum(data: string): string {
    return this.crc32(data).toString(16).padStart(8, '0');
  }

  /** Compute entropy of hash output. */
  hashEntropy(hash: string): number {
    const counts: Record<string, number> = {};
    for (const ch of hash) {
      counts[ch] = (counts[ch] ?? 0) + 1;
    }
    let entropy = 0;
    const total = hash.length;
    for (const count of Object.values(counts)) {
      const p = count / total;
      entropy -= p * Math.log2(p);
    }
    return entropy;
  }

  /** Compute hash avalanche percentage. */
  avalanchePercent(input1: string, input2: string): number {
    const h1 = this.sha256(input1).hash;
    const h2 = this.sha256(input2).hash;
    let diff = 0;
    for (let i = 0; i < Math.min(h1.length, h2.length); i++) {
      const x = h1.charCodeAt(i) ^ h2.charCodeAt(i);
      diff += x.toString(2).replace(/0/g, '').length;
    }
    return (diff / (Math.min(h1.length, h2.length) * 4)) * 100;
  }

  /** Compare two hashes (constant-time). */
  constantTimeHashCompare(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) {
      diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return diff === 0;
  }

  /** Truncate a hash to specified bit length. */
  truncateHash(hash: string, bits: number): string {
    return hash.substring(0, Math.ceil(bits / 4));
  }

  /** XOR two hashes. */
  xorHashes(a: string, b: string): string {
    const minLen = Math.min(a.length, b.length);
    let out = '';
    for (let i = 0; i < minLen; i++) {
      out += (parseInt(a[i], 16) ^ parseInt(b[i], 16)).toString(16);
    }
    return out;
  }

  /** Concatenate hashes (concat-KDF). */
  concatHash(hashes: string[]): string {
    return this.sha256(hashes.join('')).hash;
  }

  /** Hex string to bytes. */
  hexToBytes(hex: string): Uint8Array {
    const out = new Uint8Array(hex.length / 2);
    for (let i = 0; i < out.length; i++) {
      out[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    return out;
  }

  /** Bytes to hex string. */
  bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /** Base64 encode. */
  base64Encode(data: string): string {
    const bytes = new TextEncoder().encode(data);
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

  /** Base64 decode. */
  base64Decode(b64: string): string {
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
    return new TextDecoder().decode(new Uint8Array(out));
  }

  /** Get supported hash algorithms. */
  supportedHashes(): string[] {
    return ['MD2', 'MD4', 'MD5', 'SHA-1', 'SHA-224', 'SHA-256', 'SHA-384', 'SHA-512', 'SHA-3', 'BLAKE2b', 'BLAKE2s', 'BLAKE3', 'RIPEMD-160', 'Whirlpool', 'Keccak-256', 'GOST', 'Streebog'];
  }

  /** Get supported KDFs. */
  supportedKdfs(): string[] {
    return ['PBKDF1', 'PBKDF2', 'scrypt', 'bcrypt', 'argon2', 'HKDF', 'SP800-108', 'ANSI X9.63'];
  }

  /** Get supported MACs. */
  supportedMacs(): string[] {
    return ['HMAC', 'KMAC', 'Poly1305', 'SipHash'];
  }

  /** Get supported non-cryptographic hashes. */
  supportedNonCrypto(): string[] {
    return ['CRC8', 'CRC16', 'CRC32', 'Adler32', 'FNV-1a', 'Murmur3', 'xxHash32', 'CityHash', 'DJB2', 'SDBM', 'Jenkins', 'Pearson'];
  }

  /** Get history entries. */
  getHistory(): unknown[] {
    return [...this._history];
  }

  /** Get history length. */
  get historyLength(): number {
    return this._history.length;
  }

  /** Clear history. */
  clearHistory(): void {
    this._history = [];
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
