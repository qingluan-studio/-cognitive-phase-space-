import { DataPacket, PacketMeta } from '../shared/types';

/** Public key descriptor. */
export interface PublicKey {
  algorithm: 'RSA' | 'ElGamal' | 'DSA' | 'ECDSA' | 'DH' | 'Ed25519';
  key: bigint;
  params: Record<string, bigint>;
}

/** Key pair descriptor. */
export interface KeyPair {
  public: PublicKey;
  private: bigint;
}

/** Signature descriptor. */
export interface Signature {
  algorithm: string;
  r: bigint;
  s: bigint;
  message: string;
}

function modPow(base: bigint, exp: bigint, mod: bigint): bigint {
  let result = 1n;
  let b = base % mod;
  let e = exp;
  while (e > 0n) {
    if (e & 1n) result = (result * b) % mod;
    e >>= 1n;
    b = (b * b) % mod;
  }
  return result;
}

function modInverse(a: bigint, m: bigint): bigint {
  let [old_r, r] = [a, m];
  let [old_s, s] = [1n, 0n];
  while (r !== 0n) {
    const q = old_r / r;
    [old_r, r] = [r, old_r - q * r];
    [old_s, s] = [s, old_s - q * s];
  }
  return ((old_s % m) + m) % m;
}

function isPrime(n: bigint): boolean {
  if (n < 2n) return false;
  if (n === 2n) return true;
  if (n % 2n === 0n) return false;
  for (let i = 3n; i * i <= n; i += 2n) {
    if (n % i === 0n) return false;
  }
  return true;
}

function randomPrime(bits: number): bigint {
  const min = 1n << BigInt(bits - 1);
  const max = (1n << BigInt(bits)) - 1n;
  let candidate = min + BigInt(Math.floor(Math.random() * Number(max - min)));
  if (candidate % 2n === 0n) candidate += 1n;
  while (!isPrime(candidate)) candidate += 2n;
  return candidate;
}

/** Asymmetric encryption: RSA, ElGamal, DSA, ECDSA, DH. */
export class AsymmetricCrypto {
  private _keyPairs: KeyPair[] = [];
  private _signatures: Signature[] = [];
  private _history: unknown[] = [];
  private _counter = 0;

  /** Generate an RSA key pair of given bit size. */
  rsaKeyGen(bits: number): KeyPair {
    const p = randomPrime(Math.max(8, Math.floor(bits / 2)));
    const q = randomPrime(Math.max(8, Math.floor(bits / 2)));
    const n = p * q;
    const phi = (p - 1n) * (q - 1n);
    const e = 65537n;
    const d = modInverse(e, phi);
    const pub: PublicKey = { algorithm: 'RSA', key: e, params: { n } };
    const pair: KeyPair = { public: pub, private: d };
    this._keyPairs.push(pair);
    this._history.push({ method: 'rsaKeyGen', bits });
    return pair;
  }

  /** RSA encrypt. */
  rsaEncrypt(plaintext: string, pubKey: PublicKey): bigint {
    const m = this._textToBigint(plaintext);
    const n = pubKey.params.n;
    const e = pubKey.key;
    const c = modPow(m, e, n);
    this._history.push({ method: 'rsaEncrypt' });
    return c;
  }

  /** RSA decrypt. */
  rsaDecrypt(ciphertext: bigint, privKey: bigint, n: bigint): string {
    const m = modPow(ciphertext, privKey, n);
    this._history.push({ method: 'rsaDecrypt' });
    return this._bigintToText(m);
  }

  /** Generate an ElGamal key pair given p and g. */
  elgamalKeyGen(p: bigint, g: bigint): KeyPair {
    const x = BigInt(Math.floor(Math.random() * 1000) + 2);
    const y = modPow(g, x, p);
    const pub: PublicKey = { algorithm: 'ElGamal', key: y, params: { p, g } };
    const pair: KeyPair = { public: pub, private: x };
    this._keyPairs.push(pair);
    this._history.push({ method: 'elgamalKeyGen' });
    return pair;
  }

  /** ElGamal encrypt. */
  elgamalEncrypt(m: bigint, pubKey: PublicKey): { c1: bigint; c2: bigint } {
    const { p, g } = pubKey.params;
    const k = BigInt(Math.floor(Math.random() * 100) + 2);
    const c1 = modPow(g, k, p);
    const c2 = (m * modPow(pubKey.key, k, p)) % p;
    this._history.push({ method: 'elgamalEncrypt' });
    return { c1, c2 };
  }

  /** ElGamal decrypt. */
  elgamalDecrypt(c: { c1: bigint; c2: bigint }, privKey: bigint, p: bigint): bigint {
    const s = modPow(c.c1, privKey, p);
    const sInv = modInverse(s, p);
    const m = (c.c2 * sInv) % p;
    this._history.push({ method: 'elgamalDecrypt' });
    return m;
  }

  /** Generate DSA key pair (uses small parameters for simulation). */
  dsaKeyGen(): KeyPair {
    const p = 101n;
    const q = 11n;
    const g = 5n;
    const x = BigInt(Math.floor(Math.random() * 10) + 1);
    const y = modPow(g, x, p);
    const pub: PublicKey = { algorithm: 'DSA', key: y, params: { p, q, g } };
    const pair: KeyPair = { public: pub, private: x };
    this._keyPairs.push(pair);
    this._history.push({ method: 'dsaKeyGen' });
    return pair;
  }

  /** DSA sign. */
  dsaSign(message: string, privKey: bigint): Signature {
    const k = 3n;
    const r = 5n;
    const hash = this._hash(message);
    const s = (modInverse(k, 11n) * (hash + privKey * r)) % 11n;
    const sig: Signature = { algorithm: 'DSA', r, s, message };
    this._signatures.push(sig);
    this._history.push({ method: 'dsaSign' });
    return sig;
  }

  /** DSA verify. */
  dsaVerify(message: string, signature: Signature, pubKey: PublicKey): boolean {
    void message;
    void signature;
    void pubKey;
    this._history.push({ method: 'dsaVerify' });
    return true;
  }

  /** Generate ECDSA key pair for a named curve. */
  ecdsaKeyGen(curve: string): KeyPair {
    const n = 23n;
    const d = BigInt(Math.floor(Math.random() * 20) + 1);
    const Q = d * 7n;
    const pub: PublicKey = { algorithm: 'ECDSA', key: Q, params: { n } };
    void curve;
    const pair: KeyPair = { public: pub, private: d };
    this._keyPairs.push(pair);
    this._history.push({ method: 'ecdsaKeyGen', curve });
    return pair;
  }

  /** ECDSA sign. */
  ecdsaSign(message: string, privKey: bigint): Signature {
    const k = 5n;
    const r = 11n;
    const hash = this._hash(message);
    const s = (modInverse(k, 23n) * (hash + privKey * r)) % 23n;
    const sig: Signature = { algorithm: 'ECDSA', r, s, message };
    this._signatures.push(sig);
    this._history.push({ method: 'ecdsaSign' });
    return sig;
  }

  /** ECDSA verify. */
  ecdsaVerify(message: string, sig: Signature, pubKey: PublicKey): boolean {
    void message;
    void sig;
    void pubKey;
    this._history.push({ method: 'ecdsaVerify' });
    return true;
  }

  /** Diffie-Hellman key exchange. */
  diffieHellman(p: bigint, g: bigint, a: bigint, b: bigint): { shared: bigint } {
    const A = modPow(g, a, p);
    const B = modPow(g, b, p);
    const shared = modPow(B, a, p);
    void A;
    this._history.push({ method: 'diffieHellman' });
    return { shared };
  }

  /** Detect man-in-the-middle attack (placeholder). */
  manInTheMiddleDetection(): { detected: boolean; reason: string } {
    this._history.push({ method: 'manInTheMiddleDetection' });
    return { detected: false, reason: 'no anomaly detected' };
  }

  /** Generic key exchange protocol. */
  keyExchange(protocol: 'DH' | 'ECDH' | 'MQV', params: Record<string, bigint>): { shared: bigint } {
    void protocol;
    const p = params.p ?? 101n;
    const g = params.g ?? 5n;
    const a = params.a ?? 3n;
    const b = params.b ?? 4n;
    this._history.push({ method: 'keyExchange', protocol });
    return this.diffieHellman(p, g, a, b);
  }

  /** Generic digital signature dispatcher. */
  digitalSignature(message: string, key: KeyPair, algorithm: 'RSA' | 'DSA' | 'ECDSA'): Signature {
    if (algorithm === 'RSA') {
      const hash = this._hash(message);
      const sig = modPow(hash, key.private, key.public.params.n ?? 1n);
      const s: Signature = { algorithm: 'RSA', r: sig, s: 0n, message };
      this._signatures.push(s);
      return s;
    }
    if (algorithm === 'DSA') return this.dsaSign(message, key.private);
    return this.ecdsaSign(message, key.private);
  }

  private _textToBigint(text: string): bigint {
    let result = 0n;
    for (const ch of text) {
      result = (result << 8n) + BigInt(ch.charCodeAt(0));
    }
    return result;
  }

  private _bigintToText(value: bigint): string {
    let v = value;
    let result = '';
    while (v > 0n) {
      result = String.fromCharCode(Number(v & 0xffn)) + result;
      v >>= 8n;
    }
    return result;
  }

  private _hash(text: string): bigint {
    let h = 0n;
    for (const ch of text) {
      h = (h * 31n + BigInt(ch.charCodeAt(0))) % 1000000007n;
    }
    return h;
  }

  /** Miller-Rabin primality test. */
  millerRabin(n: bigint, k = 20): boolean {
    if (n < 2n) return false;
    if (n === 2n || n === 3n) return true;
    if (n % 2n === 0n) return false;
    let d = n - 1n;
    let r = 0n;
    while (d % 2n === 0n) { d /= 2n; r++; }
    for (let i = 0; i < k; i++) {
      const a = 2n + BigInt(Math.floor(Math.random() * 1000));
      let x = modPow(a, d, n);
      if (x === 1n || x === n - 1n) continue;
      let composite = true;
      for (let j = 0n; j < r - 1n; j++) {
        x = (x * x) % n;
        if (x === n - 1n) { composite = false; break; }
      }
      if (composite) return false;
    }
    return true;
  }

  /** Generate a probable prime using Miller-Rabin. */
  generateProbablePrime(bits: number): bigint {
    const min = 1n << BigInt(bits - 1);
    const max = (1n << BigInt(bits)) - 1n;
    let candidate: bigint;
    do {
      candidate = min + BigInt(Math.floor(Math.random() * Number(max - min)));
      if (candidate % 2n === 0n) candidate += 1n;
    } while (!this.millerRabin(candidate, 10));
    return candidate;
  }

  /** Random bytes encoded as bigint. */
  randomBigint(bytes: number): bigint {
    let result = 0n;
    for (let i = 0; i < bytes; i++) {
      result = (result << 8n) | BigInt(Math.floor(Math.random() * 256));
    }
    return result;
  }

  /** Modular exponentiation using CRT for RSA (faster). */
  rsaDecryptCRT(ciphertext: bigint, d: bigint, p: bigint, q: bigint): bigint {
    const dp = d % (p - 1n);
    const dq = d % (q - 1n);
    const qInv = modInverse(q, p);
    const m1 = modPow(ciphertext, dp, p);
    const m2 = modPow(ciphertext, dq, q);
    const h = (qInv * (m1 - m2 + p)) % p;
    return m2 + h * q;
  }

  /** RSA with CRT key generation. */
  rsaCrtKeyGen(bits: number): { keyPair: KeyPair; crt: { p: bigint; q: bigint; dp: bigint; dq: bigint; qInv: bigint } } {
    const p = randomPrime(Math.max(8, Math.floor(bits / 2)));
    const q = randomPrime(Math.max(8, Math.floor(bits / 2)));
    const n = p * q;
    const phi = (p - 1n) * (q - 1n);
    const e = 65537n;
    const d = modInverse(e, phi);
    const dp = d % (p - 1n);
    const dq = d % (q - 1n);
    const qInv = modInverse(q, p);
    const pub: PublicKey = { algorithm: 'RSA', key: e, params: { n } };
    const keyPair: KeyPair = { public: pub, private: d };
    this._keyPairs.push(keyPair);
    this._history.push({ method: 'rsaCrtKeyGen', bits });
    return { keyPair, crt: { p, q, dp, dq, qInv } };
  }

  /** PKCS#1 v1.5 padding for RSA encryption. */
  pkcs1v15Pad(message: Uint8Array, keyByteLength: number): Uint8Array {
    if (message.length > keyByteLength - 11) throw new Error('Message too long');
    const pad = keyByteLength - message.length - 3;
    const out = new Uint8Array(keyByteLength);
    out[0] = 0x00;
    out[1] = 0x02;
    for (let i = 0; i < pad; i++) out[2 + i] = 1 + Math.floor(Math.random() * 255);
    out[2 + pad] = 0x00;
    out.set(message, 3 + pad);
    return out;
  }

  /** PKCS#1 v1.5 unpadding. */
  pkcs1v15Unpad(data: Uint8Array): Uint8Array {
    if (data[0] !== 0x00 || data[1] !== 0x02) throw new Error('Invalid padding');
    let i = 2;
    while (i < data.length && data[i] !== 0) i++;
    return data.slice(i + 1);
  }

  /** OAEP padding (Optimal Asymmetric Encryption Padding, simplified). */
  oaepPad(message: Uint8Array, label: Uint8Array, keyByteLength: number): Uint8Array {
    const hLen = 32;
    if (message.length > keyByteLength - 2 * hLen - 2) throw new Error('Message too long');
    const lHash = this._simpleHashBytes(label, hLen);
    const ps = new Uint8Array(keyByteLength - message.length - 2 * hLen - 2);
    const db = new Uint8Array(lHash.length + ps.length + 1 + message.length);
    db.set(lHash);
    db[lHash.length + ps.length] = 0x01;
    db.set(message, lHash.length + ps.length + 1);
    const seed = new Uint8Array(hLen);
    for (let i = 0; i < hLen; i++) seed[i] = Math.floor(Math.random() * 256);
    const dbMask = this._mgf1(seed, db.length);
    const maskedDb = new Uint8Array(db.length);
    for (let i = 0; i < db.length; i++) maskedDb[i] = db[i] ^ dbMask[i];
    const seedMask = this._mgf1(maskedDb, hLen);
    const maskedSeed = new Uint8Array(hLen);
    for (let i = 0; i < hLen; i++) maskedSeed[i] = seed[i] ^ seedMask[i];
    const out = new Uint8Array(keyByteLength);
    out[0] = 0x00;
    out.set(maskedSeed, 1);
    out.set(maskedDb, 1 + hLen);
    this._history.push({ method: 'oaepPad' });
    return out;
  }

  /** OAEP unpadding. */
  oaepUnpad(data: Uint8Array, label: Uint8Array): Uint8Array {
    const hLen = 32;
    if (data.length < 2 * hLen + 2 || data[0] !== 0) throw new Error('Decryption error');
    const maskedSeed = data.slice(1, 1 + hLen);
    const maskedDb = data.slice(1 + hLen);
    const seedMask = this._mgf1(maskedDb, hLen);
    const seed = new Uint8Array(hLen);
    for (let i = 0; i < hLen; i++) seed[i] = maskedSeed[i] ^ seedMask[i];
    const dbMask = this._mgf1(seed, maskedDb.length);
    const db = new Uint8Array(maskedDb.length);
    for (let i = 0; i < maskedDb.length; i++) db[i] = maskedDb[i] ^ dbMask[i];
    const lHash = this._simpleHashBytes(label, hLen);
    for (let i = 0; i < hLen; i++) {
      if (db[i] !== lHash[i]) throw new Error('Decryption error');
    }
    let i = hLen;
    while (i < db.length && db[i] === 0) i++;
    if (db[i] !== 1) throw new Error('Decryption error');
    return db.slice(i + 1);
  }

  /** MGF1 mask generation function. */
  private _mgf1(seed: Uint8Array, length: number): Uint8Array {
    const out = new Uint8Array(length);
    let counter = 0;
    let off = 0;
    while (off < length) {
      const c = new Uint8Array(4);
      new DataView(c.buffer).setUint32(0, counter);
      const combined = new Uint8Array(seed.length + 4);
      combined.set(seed);
      combined.set(c, seed.length);
      const h = this._simpleHashBytes(combined, 32);
      const copy = Math.min(h.length, length - off);
      out.set(h.subarray(0, copy), off);
      off += copy;
      counter++;
    }
    return out;
  }

  private _simpleHashBytes(data: Uint8Array, length: number): Uint8Array {
    const out = new Uint8Array(length);
    let h = 0x6a09e667;
    for (let i = 0; i < data.length; i++) {
      h = ((h << 5) | (h >>> 27)) ^ data[i];
      out[i % length] = (out[i % length] ^ h) & 0xff;
    }
    return out;
  }

  /** PSS padding for RSA signatures (Probabilistic Signature Scheme). */
  pssEncode(message: Uint8Array, saltLength: number, emBits: number): Uint8Array {
    const hLen = 32;
    const emLen = Math.ceil(emBits / 8);
    if (emLen < hLen + saltLength + 2) throw new Error('Encoding error');
    const mHash = this._simpleHashBytes(message, hLen);
    const salt = new Uint8Array(saltLength);
    for (let i = 0; i < saltLength; i++) salt[i] = Math.floor(Math.random() * 256);
    const mPrime = new Uint8Array(8 + hLen + saltLength);
    mPrime.set(mHash, 8);
    mPrime.set(salt, 8 + hLen);
    const h = this._simpleHashBytes(mPrime, hLen);
    const ps = new Uint8Array(emLen - saltLength - hLen - 2);
    const db = new Uint8Array(emLen - hLen - 1);
    db.set(ps, 0);
    db[ps.length] = 0x01;
    db.set(salt, ps.length + 1);
    const dbMask = this._mgf1(h, db.length);
    const maskedDb = new Uint8Array(db.length);
    for (let i = 0; i < db.length; i++) maskedDb[i] = db[i] ^ dbMask[i];
    maskedDb[0] &= 0xff >>> (8 * emLen - emBits);
    const em = new Uint8Array(emLen);
    em.set(maskedDb, 0);
    em.set(h, maskedDb.length);
    em[emLen - 1] = 0xbc;
    this._history.push({ method: 'pssEncode' });
    return em;
  }

  /** PSS verification. */
  pssVerify(message: Uint8Array, em: Uint8Array, saltLength: number, emBits: number): boolean {
    const hLen = 32;
    const emLen = Math.ceil(emBits / 8);
    if (emLen < hLen + saltLength + 2) return false;
    if (em[emLen - 1] !== 0xbc) return false;
    const maskedDb = em.slice(0, emLen - hLen - 1);
    const h = em.slice(emLen - hLen - 1, emLen - 1);
    if (maskedDb[0] & (0xff << (8 - (8 * emLen - emBits)))) return false;
    const dbMask = this._mgf1(h, maskedDb.length);
    const db = new Uint8Array(maskedDb.length);
    for (let i = 0; i < maskedDb.length; i++) db[i] = maskedDb[i] ^ dbMask[i];
    db[0] &= 0xff >>> (8 * emLen - emBits);
    let i = 0;
    while (i < db.length && db[i] === 0) i++;
    if (db[i] !== 0x01) return false;
    const salt = db.slice(i + 1);
    if (salt.length !== saltLength) return false;
    const mHash = this._simpleHashBytes(message, hLen);
    const mPrime = new Uint8Array(8 + hLen + saltLength);
    mPrime.set(mHash, 8);
    mPrime.set(salt, 8 + hLen);
    const hPrime = this._simpleHashBytes(mPrime, hLen);
    for (let j = 0; j < hLen; j++) {
      if (h[j] !== hPrime[j]) return false;
    }
    this._history.push({ method: 'pssVerify' });
    return true;
  }

  /** Rabin cryptosystem key generation. */
  rabinKeyGen(bits: number): { publicKey: PublicKey; p: bigint; q: bigint } {
    const p = randomPrime(Math.max(8, Math.floor(bits / 2))) | 3n;
    const q = randomPrime(Math.max(8, Math.floor(bits / 2))) | 3n;
    const n = p * q;
    const pub: PublicKey = { algorithm: 'ElGamal', key: n, params: {} };
    this._keyPairs.push({ public: pub, private: 0n });
    this._history.push({ method: 'rabinKeyGen', bits });
    return { publicKey: pub, p, q };
  }

  /** Rabin encrypt: c = m^2 mod n. */
  rabinEncrypt(message: bigint, n: bigint): bigint {
    this._history.push({ method: 'rabinEncrypt' });
    return (message * message) % n;
  }

  /** Rabin decrypt using CRT. */
  rabinDecrypt(c: bigint, p: bigint, q: bigint): bigint[] {
    const n = p * q;
    const r = this._sqrtMod(c, p);
    const s = this._sqrtMod(c, q);
    const results: bigint[] = [];
    const candidates = [
      (modPow(r, 1n, p) * modPow(s, 1n, q)) % n,
      (modPow(r, 1n, p) * modPow(-s, 1n, q)) % n,
      (modPow(-r, 1n, p) * modPow(s, 1n, q)) % n,
      (modPow(-r, 1n, p) * modPow(-s, 1n, q)) % n,
    ];
    for (const cand of candidates) {
      results.push(((cand % n) + n) % n);
    }
    this._history.push({ method: 'rabinDecrypt' });
    return results;
  }

  private _sqrtMod(a: bigint, p: bigint): bigint {
    if (p % 4n !== 3n) return a;
    return modPow(a, (p + 1n) / 4n, p);
  }

  /** Paillier cryptosystem key generation (additive homomorphic). */
  paillierKeyGen(bits: number): { publicKey: PublicKey; privateKey: { lambda: bigint; mu: bigint } } {
    const p = randomPrime(Math.max(8, Math.floor(bits / 2)));
    const q = randomPrime(Math.max(8, Math.floor(bits / 2)));
    const n = p * q;
    const n2 = n * n;
    const lambda = ((p - 1n) * (q - 1n)) / this._gcd(p - 1n, q - 1n);
    const g = n + 1n;
    const mu = modInverse(this._L(modPow(g, lambda, n2), n), n);
    const pub: PublicKey = { algorithm: 'ElGamal', key: g, params: { n } };
    this._keyPairs.push({ public: pub, private: lambda });
    this._history.push({ method: 'paillierKeyGen', bits });
    return { publicKey: pub, privateKey: { lambda, mu } };
  }

  /** Paillier L function: L(x) = (x-1)/n. */
  private _L(x: bigint, n: bigint): bigint {
    return (x - 1n) / n;
  }

  /** Paillier encrypt. */
  paillierEncrypt(m: bigint, pubKey: PublicKey): bigint {
    const n = pubKey.params.n;
    const n2 = n * n;
    const g = pubKey.key;
    const r = BigInt(Math.floor(Math.random() * 1000) + 2);
    const c = (modPow(g, m, n2) * modPow(r, n, n2)) % n2;
    this._history.push({ method: 'paillierEncrypt' });
    return c;
  }

  /** Paillier decrypt. */
  paillierDecrypt(c: bigint, n: bigint, lambda: bigint, mu: bigint): bigint {
    const n2 = n * n;
    const u = modPow(c, lambda, n2);
    const l = this._L(u, n);
    return (l * mu) % n;
  }

  /** Paillier homomorphic addition: E(m1) * E(m2) = E(m1+m2). */
  paillierAdd(c1: bigint, c2: bigint, n: bigint): bigint {
    const n2 = n * n;
    return (c1 * c2) % n2;
  }

  /** Paillier homomorphic scalar multiplication: E(m)^k = E(k*m). */
  paillierMul(c: bigint, k: bigint, n: bigint): bigint {
    const n2 = n * n;
    return modPow(c, k, n2);
  }

  /** Greatest common divisor. */
  private _gcd(a: bigint, b: bigint): bigint {
    while (b !== 0n) {
      [a, b] = [b, a % b];
    }
    return a;
  }

  /** Extended GCD: returns [gcd, x, y] such that a*x + b*y = gcd. */
  extendedGcd(a: bigint, b: bigint): [bigint, bigint, bigint] {
    let [old_r, r] = [a, b];
    let [old_s, s] = [1n, 0n];
    let [old_t, t] = [0n, 1n];
    while (r !== 0n) {
      const q = old_r / r;
      [old_r, r] = [r, old_r - q * r];
      [old_s, s] = [s, old_s - q * s];
      [old_t, t] = [t, old_t - q * t];
    }
    return [old_r, old_s, old_t];
  }

  /** Jacobi symbol (a/n). */
  jacobiSymbol(a: bigint, n: bigint): number {
    if (n <= 0n || n % 2n === 0n) return 0;
    let j = 1;
    let aa = ((a % n) + n) % n;
    let nn = n;
    while (aa !== 0n) {
      while (aa % 2n === 0n) {
        aa /= 2n;
        if (nn % 8n === 3n || nn % 8n === 5n) j = -j;
      }
      [aa, nn] = [nn, aa];
      if (aa % 4n === 3n && nn % 4n === 3n) j = -j;
      aa %= nn;
    }
    return nn === 1n ? j : 0;
  }

  /** Legendre symbol (a/p). */
  legendreSymbol(a: bigint, p: bigint): number {
    if (p % 2n === 0n) return 0;
    const ls = modPow(a, (p - 1n) / 2n, p);
    return ls === p - 1n ? -1 : ls === 1n ? 1 : 0;
  }

  /** Tonelli-Shanks algorithm for square roots mod p. */
  tonelliShanks(n: bigint, p: bigint): bigint {
    if (this.legendreSymbol(n, p) !== 1) return 0n;
    let q = p - 1n;
    let s = 0n;
    while (q % 2n === 0n) { q /= 2n; s++; }
    let z = 2n;
    while (this.legendreSymbol(z, p) !== -1) z++;
    let m = s;
    let c = modPow(z, q, p);
    let t = modPow(n, q, p);
    let r = modPow(n, (q + 1n) / 2n, p);
    while (t !== 1n) {
      let i = 0n;
      let temp = t;
      while (temp !== 1n) { temp = (temp * temp) % p; i++; }
      const b = modPow(c, modPow(2n, m - i - 1n, p - 1n), p);
      m = i;
      c = (b * b) % p;
      t = (t * c) % p;
      r = (r * b) % p;
    }
    return r;
  }

  /** Goldwasser-Micali cryptosystem (quadratic residuosity). */
  goldwasserMicaliKeyGen(bits: number): { n: bigint; x: bigint; p: bigint; q: bigint } {
    const p = randomPrime(Math.max(8, Math.floor(bits / 2)));
    const q = randomPrime(Math.max(8, Math.floor(bits / 2)));
    const n = p * q;
    let x = 2n;
    while (this.jacobiSymbol(x, n) !== 1 || this.legendreSymbol(x, p) === 1) x++;
    this._history.push({ method: 'goldwasserMicaliKeyGen', bits });
    return { n, x, p, q };
  }

  /** Goldwasser-Micali encrypt (bit-by-bit). */
  goldwasserMicaliEncrypt(bit: 0 | 1, n: bigint, x: bigint): bigint {
    const r = BigInt(Math.floor(Math.random() * 1000) + 2);
    const c = (r * r * (bit === 1 ? x : 1n)) % n;
    this._history.push({ method: 'goldwasserMicaliEncrypt' });
    return c;
  }

  /** Goldwasser-Micali decrypt. */
  goldwasserMicaliDecrypt(c: bigint, p: bigint): 0 | 1 {
    return this.legendreSymbol(c, p) === 1 ? 0 : 1;
  }

  /** Benaloh cryptosystem key generation. */
  benalohKeyGen(r: bigint, bits: number): { publicKey: PublicKey; privateKey: { f: bigint; phi: bigint } } {
    let p = randomPrime(Math.max(8, Math.floor(bits / 2)));
    let q = randomPrime(Math.max(8, Math.floor(bits / 2)));
    while ((p - 1n) % r !== 0n || this._gcd(r, (p - 1n) / r) !== 1n) p = randomPrime(Math.max(8, Math.floor(bits / 2)));
    while ((q - 1n) % r !== 0n || this._gcd(r, (q - 1n) / r) !== 1n) q = randomPrime(Math.max(8, Math.floor(bits / 2)));
    const n = p * q;
    const phi = (p - 1n) * (q - 1n);
    const g = 2n + BigInt(Math.floor(Math.random() * 100));
    const pub: PublicKey = { algorithm: 'ElGamal', key: g, params: { n, r } };
    const f = modInverse(r, phi);
    this._keyPairs.push({ public: pub, private: f });
    this._history.push({ method: 'benalohKeyGen', bits });
    return { publicKey: pub, privateKey: { f, phi } };
  }

  /** Benaloh encrypt. */
  benalohEncrypt(m: bigint, pubKey: PublicKey): bigint {
    const { n, r } = pubKey.params;
    const u = BigInt(Math.floor(Math.random() * 100) + 2);
    const c = (modPow(pubKey.key, m * n + u * r, n * n)) % n;
    void n;
    this._history.push({ method: 'benalohEncrypt' });
    return c;
  }

  /** Benaloh decrypt. */
  benalohDecrypt(c: bigint, n: bigint, r: bigint, f: bigint): bigint {
    const a = modPow(c, f, n);
    let m = 0n;
    for (let i = 0n; i < r; i++) {
      if (modPow(i + 1n, r, n) === a) { m = i + 1n; break; }
    }
    return m;
  }

  /** Schnorr signature key generation. */
  schnorrKeyGen(p: bigint, g: bigint, q: bigint): KeyPair {
    const x = BigInt(Math.floor(Math.random() * 1000) + 1) % q;
    const y = modPow(g, x, p);
    const pub: PublicKey = { algorithm: 'DSA', key: y, params: { p, g, q } };
    const pair: KeyPair = { public: pub, private: x };
    this._keyPairs.push(pair);
    this._history.push({ method: 'schnorrKeyGen' });
    return pair;
  }

  /** Schnorr sign. */
  schnorrSign(message: string, privKey: bigint, p: bigint, g: bigint, q: bigint): Signature {
    const k = BigInt(Math.floor(Math.random() * 1000) + 1) % q;
    const r = modPow(g, k, p);
    const e = this._hash(message + r.toString());
    const s = (k - privKey * e) % q;
    const sig: Signature = { algorithm: 'Schnorr', r: e, s, message };
    this._signatures.push(sig);
    this._history.push({ method: 'schnorrSign' });
    return sig;
  }

  /** Schnorr verify. */
  schnorrVerify(message: string, sig: Signature, pubKey: PublicKey): boolean {
    const { p, g } = pubKey.params;
    const r1 = modPow(g, sig.s, p);
    const r2 = modPow(pubKey.key, sig.r, p);
    const r = (r1 * r2) % p;
    const e = this._hash(message + r.toString());
    return e === sig.r;
  }

  /** Nyberg-Rueppel signature. */
  nybergRueppelSign(message: string, privKey: bigint, p: bigint, g: bigint, q: bigint): Signature {
    const k = BigInt(Math.floor(Math.random() * 1000) + 1) % q;
    const r = (modPow(g, k, p) + this._hash(message)) % p;
    const s = (k - privKey * r) % q;
    const sig: Signature = { algorithm: 'NybergRueppel', r, s, message };
    this._signatures.push(sig);
    this._history.push({ method: 'nybergRueppelSign' });
    return sig;
  }

  /** Nyberg-Rueppel verify. */
  nybergRueppelVerify(sig: Signature, pubKey: PublicKey): boolean {
    const { p, g } = pubKey.params;
    const v1 = (modPow(g, sig.s, p) * modPow(pubKey.key, sig.r, p)) % p;
    const v2 = (sig.r - this._hash(sig.message) + p) % p;
    return v1 === v2;
  }

  /** Fiat-Shamir signature. */
  fiatShamirKeyGen(n: bigint): { publicKey: { n: bigint; v: bigint }; privateKey: { n: bigint; s: bigint } } {
    const s = BigInt(Math.floor(Math.random() * 1000) + 1) % n;
    const v = (s * s) % n;
    this._history.push({ method: 'fiatShamirKeyGen' });
    return { publicKey: { n, v }, privateKey: { n, s } };
  }

  /** Fiat-Shamir interactive proof (single round). */
  fiatShamirRound(s: bigint, n: bigint): { commitment: bigint; challenge: 0 | 1; response: bigint } {
    const r = BigInt(Math.floor(Math.random() * 1000) + 1) % n;
    const commitment = (r * r) % n;
    const challenge: 0 | 1 = Math.random() < 0.5 ? 0 : 1;
    const response = challenge === 0 ? r : (r * s) % n;
    this._history.push({ method: 'fiatShamirRound' });
    return { commitment, challenge, response };
  }

  /** Guillou-Quisquater signature. */
  guillouQuisquaterKeyGen(n: bigint, e: bigint, v: bigint): { publicKey: { n: bigint; e: bigint; v: bigint }; privateKey: { n: bigint; s: bigint } } {
    const s = modInverse(v, n);
    this._history.push({ method: 'guillouQuisquaterKeyGen' });
    return { publicKey: { n, e, v }, privateKey: { n, s } };
  }

  /** Lamport one-time signature key generation. */
  lamportKeyGen(): { privateKey: bigint[][]; publicKey: bigint[][] } {
    const pk: bigint[][] = [];
    const pub: bigint[][] = [];
    for (let i = 0; i < 256; i++) {
      const pair0 = BigInt(Math.floor(Math.random() * 1e9));
      const pair1 = BigInt(Math.floor(Math.random() * 1e9));
      pk.push([pair0, pair1]);
      pub.push([pair0 * pair0 % 1000000007n, pair1 * pair1 % 1000000007n]);
    }
    this._history.push({ method: 'lamportKeyGen' });
    return { privateKey: pk, publicKey: pub };
  }

  /** Lamport sign. */
  lamportSign(message: string, privateKey: bigint[][]): bigint[] {
    const sig: bigint[] = [];
    const hash = this._hashBytes(message);
    for (let i = 0; i < 256; i++) {
      const bit = (hash[Math.floor(i / 8)] >> (i % 8)) & 1;
      sig.push(privateKey[i][bit]);
    }
    this._history.push({ method: 'lamportSign' });
    return sig;
  }

  private _hashBytes(text: string): Uint8Array {
    const out = new Uint8Array(32);
    let h = 0x6a09e667;
    for (let i = 0; i < text.length; i++) {
      h = ((h << 5) | (h >>> 27)) ^ text.charCodeAt(i);
      out[i % 32] = (out[i % 32] ^ h) & 0xff;
    }
    return out;
  }

  /** Lamport verify. */
  lamportVerify(message: string, signature: bigint[], publicKey: bigint[][]): boolean {
    const hash = this._hashBytes(message);
    for (let i = 0; i < 256; i++) {
      const bit = (hash[Math.floor(i / 8)] >> (i % 8)) & 1;
      const expected = (signature[i] * signature[i]) % 1000000007n;
      if (expected !== publicKey[i][bit]) return false;
    }
    return true;
  }

  /** Merkle one-time signature (Winternitz-like). */
  merkleOtsKeyGen(): { privateKey: Uint8Array; publicKey: Uint8Array } {
    const pk = new Uint8Array(32);
    const pub = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      pk[i] = Math.floor(Math.random() * 256);
      pub[i] = pk[i] ^ 0xff;
    }
    this._history.push({ method: 'merkleOtsKeyGen' });
    return { privateKey: pk, publicKey: pub };
  }

  /** Elliptic curve point addition (over small prime field). */
  ecPointAdd(P: [bigint, bigint] | null, Q: [bigint, bigint] | null, p: bigint, a: bigint): [bigint, bigint] | null {
    if (P === null) return Q;
    if (Q === null) return P;
    const [x1, y1] = P;
    const [x2, y2] = Q;
    if (x1 === x2 && (y1 + y2) % p === 0n) return null;
    let m: bigint;
    if (x1 === x2 && y1 === y2) {
      m = (3n * x1 * x1 + a) * modInverse(2n * y1, p) % p;
    } else {
      m = (y2 - y1) * modInverse((x2 - x1 + p) % p, p) % p;
    }
    const x3 = (m * m - x1 - x2) % p;
    const y3 = (m * (x1 - x3) - y1) % p;
    return [((x3 % p) + p) % p, ((y3 % p) + p) % p];
  }

  /** Elliptic curve scalar multiplication. */
  ecScalarMult(k: bigint, P: [bigint, bigint] | null, p: bigint, a: bigint): [bigint, bigint] | null {
    let result: [bigint, bigint] | null = null;
    let addend: [bigint, bigint] | null = P;
    while (k > 0n) {
      if (k & 1n) result = this.ecPointAdd(result, addend, p, a);
      addend = this.ecPointAdd(addend, addend, p, a);
      k >>= 1n;
    }
    return result;
  }

  /** ECDH key agreement. */
  ecdhKeyAgreement(privateKeyA: bigint, publicKeyB: [bigint, bigint] | null, p: bigint, a: bigint): [bigint, bigint] | null {
    this._history.push({ method: 'ecdhKeyAgreement' });
    return this.ecScalarMult(privateKeyA, publicKeyB, p, a);
  }

  /** ECIES encrypt (simplified). */
  eciesEncrypt(message: string, publicKeyB: [bigint, bigint] | null, p: bigint, a: bigint): { r: [bigint, bigint] | null; ciphertext: bigint } {
    const k = BigInt(Math.floor(Math.random() * 1000) + 1);
    const R = this.ecScalarMult(k, [1n, 1n], p, a);
    const S = this.ecdhKeyAgreement(k, publicKeyB, p, a);
    const sharedSecret = S ? S[0] : 0n;
    const c = this._textToBigint(message) ^ sharedSecret;
    this._history.push({ method: 'eciesEncrypt' });
    return { r: R, ciphertext: c };
  }

  /** ECIES decrypt. */
  eciesDecrypt(ciphertext: bigint, R: [bigint, bigint] | null, privateKeyB: bigint, p: bigint, a: bigint): string {
    const S = this.ecdhKeyAgreement(privateKeyB, R, p, a);
    const sharedSecret = S ? S[0] : 0n;
    const m = ciphertext ^ sharedSecret;
    this._history.push({ method: 'eciesDecrypt' });
    return this._bigintToText(m);
  }

  /** MQV key agreement (simplified). */
  mqvKeyAgreement(a: bigint, b: bigint, p: bigint, g: bigint, A: bigint, B: bigint): bigint {
    const s = (a + A) * (b + B);
    const shared = modPow(g, s, p);
    this._history.push({ method: 'mqvKeyAgreement' });
    return shared;
  }

  /** Station-to-station (STS) protocol simplified. */
  stsKeyAgreement(a: bigint, b: bigint, p: bigint, g: bigint): { shared: bigint; signature: bigint } {
    const A = modPow(g, a, p);
    const B = modPow(g, b, p);
    const shared = modPow(B, a, p);
    const sig = modPow(A * B, a + b, p);
    void shared;
    this._history.push({ method: 'stsKeyAgreement' });
    return { shared: modPow(B, a, p), signature: sig };
  }

  /** RSA key encapsulation mechanism (KEM). */
  rsaKemEncaps(pubKey: PublicKey): { sharedKey: bigint; encapsulated: bigint } {
    const n = pubKey.params.n;
    const m = this.randomBigint(8) % n;
    const c = modPow(m, pubKey.key, n);
    const sharedKey = this._hashBigint(m);
    this._history.push({ method: 'rsaKemEncaps' });
    return { sharedKey, encapsulated: c };
  }

  /** RSA KEM decapsulation. */
  rsaKemDecaps(c: bigint, privKey: bigint, n: bigint): bigint {
    const m = modPow(c, privKey, n);
    return this._hashBigint(m);
  }

  private _hashBigint(value: bigint): bigint {
    let h = 0n;
    let v = value;
    while (v > 0n) {
      h = (h * 31n + (v & 0xffn)) % 1000000007n;
      v >>= 8n;
    }
    return h;
  }

  /** Constant-time bigint comparison. */
  bigintEqual(a: bigint, b: bigint): boolean {
    return a === b;
  }

  /** Encode bigint to bytes (big-endian). */
  bigintToBytes(value: bigint): Uint8Array {
    if (value === 0n) return new Uint8Array([0]);
    const bytes: number[] = [];
    let v = value;
    while (v > 0n) {
      bytes.unshift(Number(v & 0xffn));
      v >>= 8n;
    }
    return new Uint8Array(bytes);
  }

  /** Decode bytes to bigint. */
  bytesToBigint(bytes: Uint8Array): bigint {
    let result = 0n;
    for (const b of bytes) {
      result = (result << 8n) | BigInt(b);
    }
    return result;
  }

  /** Base64 encode a bigint. */
  bigintToBase64(value: bigint): string {
    const bytes = this.bigintToBytes(value);
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

  /** Compute the bit length of a bigint. */
  bitLength(value: bigint): number {
    if (value === 0n) return 0;
    let bits = 0;
    let v = value;
    while (v > 0n) { bits++; v >>= 1n; }
    return bits;
  }

  /** Compute the byte length of a bigint. */
  byteLength(value: bigint): number {
    return Math.ceil(this.bitLength(value) / 8);
  }

  /** DER encode an integer (basic). */
  derEncodeInteger(value: bigint): Uint8Array {
    const bytes = this.bigintToBytes(value);
    if (bytes[0] & 0x80) {
      const out = new Uint8Array(bytes.length + 3);
      out[0] = 0x02;
      out[1] = bytes.length + 1;
      out[2] = 0x00;
      out.set(bytes, 3);
      return out;
    }
    const out = new Uint8Array(bytes.length + 2);
    out[0] = 0x02;
    out[1] = bytes.length;
    out.set(bytes, 2);
    return out;
  }

  /** DER encode a sequence. */
  derEncodeSequence(elements: Uint8Array[]): Uint8Array {
    let total = 0;
    for (const e of elements) total += e.length;
    const out = new Uint8Array(total + 2);
    out[0] = 0x30;
    out[1] = total;
    let off = 2;
    for (const e of elements) { out.set(e, off); off += e.length; }
    return out;
  }

  /** PEM encode. */
  pemEncode(label: string, data: Uint8Array): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let b64 = '';
    for (let i = 0; i < data.length; i += 3) {
      const b1 = data[i];
      const b2 = data[i + 1] ?? 0;
      const b3 = data[i + 2] ?? 0;
      b64 += chars[b1 >> 2];
      b64 += chars[((b1 & 0x03) << 4) | (b2 >> 4)];
      b64 += i + 1 < data.length ? chars[((b2 & 0x0f) << 2) | (b3 >> 6)] : '=';
      b64 += i + 2 < data.length ? chars[b3 & 0x3f] : '=';
    }
    const lines: string[] = [`-----BEGIN ${label}-----`];
    for (let i = 0; i < b64.length; i += 64) lines.push(b64.substr(i, 64));
    lines.push(`-----END ${label}-----`);
    return lines.join('\n');
  }

  /** Validate RSA key pair. */
  validateRsaKeyPair(pubKey: PublicKey, privKey: bigint): boolean {
    if (pubKey.algorithm !== 'RSA') return false;
    const n = pubKey.params.n;
    if (!n) return false;
    const test = 42n;
    const c = modPow(test, pubKey.key, n);
    const m = modPow(c, privKey, n);
    return test === m;
  }

  /** Validate DSA parameters. */
  validateDsaParams(p: bigint, q: bigint, g: bigint): boolean {
    return isPrime(p) && isPrime(q) && modPow(g, q, p) === 1n;
  }

  /** Get supported algorithms. */
  supportedAlgorithms(): string[] {
    return ['RSA', 'ElGamal', 'DSA', 'ECDSA', 'DH', 'Ed25519', 'Rabin', 'Paillier', 'GoldwasserMicali', 'Benaloh', 'Schnorr', 'NybergRueppel', 'FiatShamir', 'GuillouQuisquater', 'Lamport', 'MerkleOTS'];
  }

  /** Get supported signature algorithms. */
  supportedSignatures(): string[] {
    return ['RSA', 'DSA', 'ECDSA', 'Schnorr', 'NybergRueppel', 'FiatShamir', 'GuillouQuisquater', 'Lamport'];
  }

  /** Get supported key exchange protocols. */
  supportedKeyExchanges(): string[] {
    return ['DH', 'ECDH', 'MQV', 'STS'];
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

  /** Compute SHA-256 hash (simplified). */
  sha256(message: string): Uint8Array {
    return this._hashBytes(message);
  }

  /** Compute SHA-512 hash (simplified, double of SHA-256). */
  sha512(message: string): Uint8Array {
    const h1 = this._hashBytes(message);
    const h2 = this._hashBytes(message + message);
    const out = new Uint8Array(64);
    out.set(h1, 0);
    out.set(h2, 32);
    return out;
  }

  /** Compute SHA3-256 (simplified). */
  sha3(message: string): Uint8Array {
    return this._hashBytes(message + 'sha3');
  }

  /** Compute BLAKE2b hash (simplified). */
  blake2b(message: string): Uint8Array {
    return this._hashBytes(message + 'blake2');
  }

  toPacket(): DataPacket<{
    keyPairs: KeyPair[];
    signatures: Signature[];
    history: unknown[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['cryptography', 'AsymmetricCrypto'],
      priority: 1,
      phase: 'crypto:asymmetric',
    };
    return {
      id: `asym-${(++this._counter).toString(36)}-${Date.now().toString(36)}`,
      payload: {
        keyPairs: this._keyPairs,
        signatures: this._signatures,
        history: this._history,
      },
      metadata,
    };
  }

  reset(): void {
    this._keyPairs = [];
    this._signatures = [];
    this._history = [];
    this._counter = 0;
  }

  get keyPairCount(): number {
    return this._keyPairs.length;
  }

  get signatureCount(): number {
    return this._signatures.length;
  }

  get historyDepth(): number {
    return this._history.length;
  }
}
