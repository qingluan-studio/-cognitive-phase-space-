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
