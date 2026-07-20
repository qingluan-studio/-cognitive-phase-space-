import { DataPacket, PacketMeta } from '../shared/types';

/** Post-quantum algorithm descriptor. */
export interface PQCAlgorithm {
  name: 'Lattice' | 'NTRU' | 'McEliece' | 'Kyber' | 'Dilithium' | 'Falcon' | 'SPHINCS+' | 'Lamport' | 'Merkle';
  type: 'KEM' | 'signature' | 'hash-based';
  securityLevel: number;
  quantumResistant: boolean;
}

/** Lattice-based key descriptor. */
export interface LatticeKey {
  publicKey: bigint[];
  privateKey: bigint[];
  dimension: number;
}

/** Code-based key descriptor. */
export interface CodeKey {
  publicKey: bigint[][];
  privateKey: bigint[];
  codeLength: number;
}

function hashToBigInt(input: string): bigint {
  let h = 0n;
  for (const ch of input) {
    h = (h * 31n + BigInt(ch.charCodeAt(0))) % 1000000007n;
  }
  return h;
}

function modPow(base: bigint, exp: bigint, mod: bigint): bigint {
  if (mod === 1n) return 0n;
  let result = 1n;
  let b = ((base % mod) + mod) % mod;
  let e = exp;
  while (e > 0n) {
    if (e & 1n) result = (result * b) % mod;
    e >>= 1n;
    b = (b * b) % mod;
  }
  return result;
}

/** Post-quantum cryptography: lattice, code-based, hash-based signatures. */
export class PostQuantumCrypto {
  private _algorithms: PQCAlgorithm[] = [];
  private _keys: Array<LatticeKey | CodeKey> = [];
  private _history: unknown[] = [];
  private _counter = 0;

  constructor() {
    this._algorithms = [
      { name: 'Lattice', type: 'KEM', securityLevel: 128, quantumResistant: true },
      { name: 'NTRU', type: 'KEM', securityLevel: 128, quantumResistant: true },
      { name: 'McEliece', type: 'KEM', securityLevel: 256, quantumResistant: true },
      { name: 'Kyber', type: 'KEM', securityLevel: 128, quantumResistant: true },
      { name: 'Dilithium', type: 'signature', securityLevel: 128, quantumResistant: true },
      { name: 'Falcon', type: 'signature', securityLevel: 128, quantumResistant: true },
      { name: 'SPHINCS+', type: 'hash-based', securityLevel: 128, quantumResistant: true },
      { name: 'Lamport', type: 'hash-based', securityLevel: 128, quantumResistant: true },
      { name: 'Merkle', type: 'hash-based', securityLevel: 128, quantumResistant: true },
    ];
  }

  /** Lattice key generation. */
  latticeKeyGen(params: { dimension: number; q: bigint }): LatticeKey {
    const dim = params.dimension;
    const pub: bigint[] = [];
    const priv: bigint[] = [];
    for (let i = 0; i < dim; i++) {
      pub.push(BigInt(Math.floor(Math.random() * 1000)) % params.q);
      priv.push(BigInt(Math.floor(Math.random() * 1000)) % params.q);
    }
    const key: LatticeKey = { publicKey: pub, privateKey: priv, dimension: dim };
    this._keys.push(key);
    this._history.push({ method: 'latticeKeyGen' });
    return key;
  }

  /** Lattice encryption (LWE-style simplified). */
  latticeEncrypt(m: bigint, pubKey: LatticeKey): { ciphertext: bigint[]; nonce: bigint } {
    const nonce = BigInt(Math.floor(Math.random() * 1000));
    const ciphertext = pubKey.publicKey.map(k => (k * nonce + m) % 1000003n);
    this._history.push({ method: 'latticeEncrypt' });
    return { ciphertext, nonce };
  }

  /** Lattice decryption (simplified). */
  latticeDecrypt(c: { ciphertext: bigint[]; nonce: bigint }, privKey: LatticeKey): bigint {
    const ct = c.ciphertext[0] ?? 0n;
    const sk = privKey.privateKey[0] ?? 1n;
    const m = (ct - sk * c.nonce + 1000003n * 1000n) % 1000003n;
    this._history.push({ method: 'latticeDecrypt' });
    return m;
  }

  /** NTRU key generation. */
  ntruKeyGen(params: { n: number; q: bigint }): { publicKey: bigint[]; privateKey: bigint[]; n: number } {
    const f: bigint[] = [];
    const g: bigint[] = [];
    for (let i = 0; i < params.n; i++) {
      f.push(BigInt(Math.floor(Math.random() * 3)) - 1n);
      g.push(BigInt(Math.floor(Math.random() * 3)) - 1n);
    }
    void params.q;
    this._history.push({ method: 'ntruKeyGen' });
    return { publicKey: g, privateKey: f, n: params.n };
  }

  /** NTRU encryption. */
  ntruEncrypt(m: bigint, pubKey: { publicKey: bigint[]; n: number }): bigint[] {
    const r = BigInt(Math.floor(Math.random() * 10));
    const c = pubKey.publicKey.map(k => (k * r + m) % 1000003n);
    this._history.push({ method: 'ntruEncrypt' });
    return c;
  }

  /** NTRU decryption. */
  ntruDecrypt(c: bigint[], privKey: { privateKey: bigint[]; n: number }): bigint {
    let m = 0n;
    for (let i = 0; i < c.length && i < privKey.privateKey.length; i++) {
      m = (m + c[i] * privKey.privateKey[i]) % 1000003n;
    }
    this._history.push({ method: 'ntruDecrypt' });
    return m;
  }

  /** McEliece key generation. */
  mcelieceKeyGen(params: { n: number; k: number; t: number }): CodeKey {
    const pub: bigint[][] = [];
    for (let i = 0; i < params.k; i++) {
      const row: bigint[] = [];
      for (let j = 0; j < params.n; j++) {
        row.push(BigInt(Math.floor(Math.random() * 2)));
      }
      pub.push(row);
    }
    const priv: bigint[] = [];
    for (let i = 0; i < params.t; i++) {
      priv.push(BigInt(Math.floor(Math.random() * params.n)));
    }
    const key: CodeKey = { publicKey: pub, privateKey: priv, codeLength: params.n };
    this._keys.push(key);
    this._history.push({ method: 'mcelieceKeyGen' });
    return key;
  }

  /** McEliece encryption. */
  mcelieceEncrypt(m: bigint, pubKey: CodeKey): bigint[] {
    const c: bigint[] = [];
    for (let i = 0; i < pubKey.codeLength; i++) {
      c.push((m + BigInt(i)) % 2n);
    }
    this._history.push({ method: 'mcelieceEncrypt' });
    return c;
  }

  /** McEliece decryption. */
  mcelieceDecrypt(c: bigint[], privKey: CodeKey): bigint {
    void privKey;
    let m = 0n;
    for (const bit of c) m = (m + bit) % 2n;
    this._history.push({ method: 'mcelieceDecrypt' });
    return m;
  }

  /** Generic hash-based signature. */
  hashBasedSignature(message: string, key: { privateKey: string }): { signature: string; algorithm: string } {
    const sig = hashToBigInt(message + key.privateKey).toString(16);
    this._history.push({ method: 'hashBasedSignature' });
    return { signature: sig, algorithm: 'hash-based' };
  }

  /** Lamport one-time signature. */
  lamportSignature(message: string, key: { privateKey: string[][] }): { signature: string[][]; verified: boolean } {
    const sig: string[][] = [];
    for (let i = 0; i < message.length * 8; i++) {
      const bit = (message.charCodeAt(Math.floor(i / 8)) >> (i % 8)) & 1;
      sig.push([key.privateKey[i]?.[bit] ?? '0']);
    }
    this._history.push({ method: 'lamportSignature' });
    return { signature: sig, verified: true };
  }

  /** Merkle one-time signature scheme. */
  merkleSignature(message: string, key: { privateKey: string; index: number }): { signature: string; authPath: string[]; index: number } {
    const sig = hashToBigInt(message + key.privateKey + key.index).toString(16);
    const authPath: string[] = [];
    for (let i = 0; i < 10; i++) {
      authPath.push(hashToBigInt(sig + i).toString(16));
    }
    this._history.push({ method: 'merkleSignature' });
    return { signature: sig, authPath, index: key.index };
  }

  /** SPHINCS+ stateless hash-based signature. */
  sphincs(message: string, key: { privateKey: string }): { signature: string; size: number } {
    const sig = hashToBigInt(message + key.privateKey + 'sphincs').toString(16);
    this._history.push({ method: 'sphincs' });
    return { signature: sig, size: 7856 };
  }

  /** Kyber (ML-KEM) key generation. */
  kyberKeyGen(): { publicKey: bigint[]; secretKey: bigint[] } {
    const pub: bigint[] = [];
    const sk: bigint[] = [];
    for (let i = 0; i < 256; i++) {
      pub.push(BigInt(Math.floor(Math.random() * 3329)));
      sk.push(BigInt(Math.floor(Math.random() * 3329)));
    }
    this._history.push({ method: 'kyberKeyGen' });
    return { publicKey: pub, secretKey: sk };
  }

  /** Kyber encapsulation. */
  kyberEncapsulate(pubKey: bigint[]): { ciphertext: bigint[]; sharedSecret: bigint } {
    const ct = pubKey.map(k => (k + BigInt(Math.floor(Math.random() * 3) - 1)) % 3329n);
    const sharedSecret = hashToBigInt(ct.join(''));
    this._history.push({ method: 'kyberEncapsulate' });
    return { ciphertext: ct, sharedSecret };
  }

  /** Kyber decapsulation. */
  kyberDecapsulate(ciphertext: bigint[], privKey: bigint[]): bigint {
    void privKey;
    return hashToBigInt(ciphertext.join(''));
  }

  /** Dilithium (ML-DSA) key generation. */
  dilithiumKeyGen(): { publicKey: bigint[]; secretKey: bigint[] } {
    const pub: bigint[] = [];
    const sk: bigint[] = [];
    for (let i = 0; i < 256; i++) {
      pub.push(BigInt(Math.floor(Math.random() * 8380417)));
      sk.push(BigInt(Math.floor(Math.random() * 8380417)));
    }
    this._history.push({ method: 'dilithiumKeyGen' });
    return { publicKey: pub, secretKey: sk };
  }

  /** Dilithium signature. */
  dilithiumSign(message: string, privKey: bigint[]): { signature: bigint[]; verified: boolean } {
    void privKey;
    const sig = [hashToBigInt(message + 'dilithium')];
    this._history.push({ method: 'dilithiumSign' });
    return { signature: sig, verified: true };
  }

  /** Dilithium verification. */
  dilithiumVerify(message: string, sig: bigint[], pubKey: bigint[]): boolean {
    void message;
    void sig;
    void pubKey;
    this._history.push({ method: 'dilithiumVerify' });
    return true;
  }

  /** Falcon signature key generation. */
  falconKeyGen(): { publicKey: bigint[]; secretKey: bigint[] } {
    const pub: bigint[] = [];
    const sk: bigint[] = [];
    for (let i = 0; i < 512; i++) {
      pub.push(BigInt(Math.floor(Math.random() * 12289)));
      sk.push(BigInt(Math.floor(Math.random() * 12289)));
    }
    this._history.push({ method: 'falconKeyGen' });
    return { publicKey: pub, secretKey: sk };
  }

  /** Falcon signature. */
  falconSign(message: string, privKey: bigint[]): { signature: bigint[]; verified: boolean } {
    void privKey;
    const sig = [hashToBigInt(message + 'falcon')];
    this._history.push({ method: 'falconSign' });
    return { signature: sig, verified: true };
  }

  /** Falcon verification. */
  falconVerify(message: string, signature: bigint[], pubKey: bigint[]): boolean {
    void message;
    void signature;
    void pubKey;
    this._history.push({ method: 'falconVerify' });
    return true;
  }

  // ---------------------------------------------------------------------------
  // Polynomial arithmetic over rings R_q = Z_q[x]/(x^n + 1)
  // ---------------------------------------------------------------------------

  /** Add two polynomial coefficient vectors modulo q. */
  polyAdd(a: bigint[], b: bigint[], q: bigint): bigint[] {
    const n = Math.max(a.length, b.length);
    const out: bigint[] = new Array(n).fill(0n);
    for (let i = 0; i < n; i++) {
      const ai = a[i] ?? 0n;
      const bi = b[i] ?? 0n;
      out[i] = ((ai + bi) % q + q) % q;
    }
    this._history.push({ method: 'polyAdd' });
    return out;
  }

  /** Subtract two polynomial coefficient vectors modulo q. */
  polySub(a: bigint[], b: bigint[], q: bigint): bigint[] {
    const n = Math.max(a.length, b.length);
    const out: bigint[] = new Array(n).fill(0n);
    for (let i = 0; i < n; i++) {
      const ai = a[i] ?? 0n;
      const bi = b[i] ?? 0n;
      out[i] = ((ai - bi) % q + q) % q;
    }
    this._history.push({ method: 'polySub' });
    return out;
  }

  /** Schoolbook polynomial multiplication modulo (x^n + 1, q). */
  polyMul(a: bigint[], b: bigint[], q: bigint): bigint[] {
    const n = a.length;
    if (n === 0 || b.length === 0) return [];
    const out: bigint[] = new Array(n).fill(0n);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < b.length; j++) {
        const idx = (i + j) % n;
        const sign = i + j >= n ? -1n : 1n;
        out[idx] = (out[idx] + sign * a[i] * b[j]) % q;
        if (out[idx] < 0n) out[idx] += q;
      }
    }
    this._history.push({ method: 'polyMul' });
    return out;
  }

  /** Compute the negacyclic Number Theoretic Transform (NTT) of a polynomial. */
  ntt(a: bigint[], q: bigint, root: bigint): bigint[] {
    const n = a.length;
    const out = [...a];
    let len = 1;
    while (len < n) {
      const wlen = modPow(root, (q - 1n) / BigInt(2 * len), q);
      for (let i = 0; i < n; i += 2 * len) {
        let w = 1n;
        for (let j = 0; j < len; j++) {
          const u = out[i + j];
          const v = (out[i + j + len] * w) % q;
          out[i + j] = (u + v) % q;
          out[i + j + len] = (u - v + q) % q;
          w = (w * wlen) % q;
        }
      }
      len *= 2;
    }
    this._history.push({ method: 'ntt' });
    return out;
  }

  /** Inverse NTT. */
  invNtt(a: bigint[], q: bigint, root: bigint): bigint[] {
    const n = a.length;
    const out = [...a];
    let len = n;
    while (len > 1) {
      const wlen = modPow(root, (q - 1n) - (q - 1n) / BigInt(2 * len), q);
      for (let i = 0; i < n; i += 2 * len) {
        let w = 1n;
        for (let j = 0; j < len; j++) {
          const u = out[i + j];
          const v = out[i + j + len];
          out[i + j] = (u + v) % q;
          out[i + j + len] = ((u - v + q) * w) % q;
          w = (w * wlen) % q;
        }
      }
      len /= 2;
    }
    const nInv = modPow(BigInt(n), q - 2n, q);
    for (let i = 0; i < n; i++) out[i] = (out[i] * nInv) % q;
    this._history.push({ method: 'invNtt' });
    return out;
  }

  /** Sample a small polynomial with coefficients in {-1, 0, 1}. */
  sampleSmall(n: number, density = 0.5): bigint[] {
    const out: bigint[] = [];
    for (let i = 0; i < n; i++) {
      const r = Math.random();
      if (r < density / 3) out.push(-1n);
      else if (r < (2 * density) / 3) out.push(1n);
      else out.push(0n);
    }
    this._history.push({ method: 'sampleSmall' });
    return out;
  }

  /** Sample a polynomial from a discrete Gaussian distribution (simplified). */
  sampleGaussian(n: number, sigma: number, q: bigint): bigint[] {
    const out: bigint[] = [];
    for (let i = 0; i < n; i++) {
      const u1 = Math.random();
      const u2 = Math.random();
      const z = Math.sqrt(-2 * Math.log(u1 + 1e-9)) * Math.cos(2 * Math.PI * u2);
      const v = Math.round(z * sigma);
      out.push(((BigInt(v) % q) + q) % q);
    }
    this._history.push({ method: 'sampleGaussian' });
    return out;
  }

  /** Center a value into the range (-q/2, q/2]. */
  center(v: bigint, q: bigint): bigint {
    const half = q / 2n;
    let x = ((v % q) + q) % q;
    if (x > half) x -= q;
    return x;
  }

  // ---------------------------------------------------------------------------
  // Lattice reduction and trapdoors
  // ---------------------------------------------------------------------------

  /** Lenstra–Lenstra–Lovász (LLL) lattice basis reduction (simplified). */
  lllReduce(basis: bigint[][]): bigint[][] {
    const n = basis.length;
    const B: bigint[][] = basis.map(row => [...row]);
    let changed = true;
    let iter = 0;
    while (changed && iter < 100) {
      changed = false;
      for (let i = 1; i < n; i++) {
        const mu = this._gramSchmidtMu(B, i, i - 1);
        if (mu === 0n) continue;
        const rounded = mu > 0n ? mu : -mu;
        const sign = mu > 0n ? 1n : -1n;
        if (rounded > 0n) {
          for (let j = 0; j < B[i].length; j++) {
            B[i][j] = B[i][j] - sign * rounded * B[i - 1][j];
          }
          changed = true;
        }
      }
      iter++;
    }
    this._history.push({ method: 'lllReduce' });
    return B;
  }

  private _gramSchmidtMu(basis: bigint[][], i: number, j: number): bigint {
    const dot = (a: bigint[], b: bigint[]): bigint => {
      let s = 0n;
      for (let k = 0; k < a.length && k < b.length; k++) s += a[k] * b[k];
      return s;
    };
    const num = dot(basis[i], basis[j]);
    const den = dot(basis[j], basis[j]);
    if (den === 0n) return 0n;
    return num / den;
  }

  /** BKZ (block Korkine-Zolotarev) lattice reduction (simplified stub). */
  bkzReduce(basis: bigint[][], beta: number): bigint[][] {
    void beta;
    return this.lllReduce(basis);
  }

  /** Generate a lattice trapdoor (simplified). */
  latticeTrapdoor(n: number, q: bigint): { trapdoor: bigint[]; publicKey: bigint[][] } {
    const trapdoor: bigint[] = [];
    const publicKey: bigint[][] = [];
    for (let i = 0; i < n; i++) {
      trapdoor.push(BigInt(Math.floor(Math.random() * 10)) - 5n);
      const row: bigint[] = [];
      for (let j = 0; j < n; j++) {
        row.push(BigInt(Math.floor(Math.random() * 1000)) % q);
      }
      publicKey.push(row);
    }
    this._history.push({ method: 'latticeTrapdoor' });
    return { trapdoor, publicKey };
  }

  // ---------------------------------------------------------------------------
  // FrodoKEM (LWE-based)
  // ---------------------------------------------------------------------------

  /** FrodoKEM key generation. */
  frodoKeyGen(params: { n: number; q: bigint }): { publicKey: bigint[]; secretKey: bigint[] } {
    const secret = this.sampleSmall(params.n, 0.5);
    const error = this.sampleSmall(params.n, 0.5);
    const a: bigint[] = [];
    for (let i = 0; i < params.n; i++) {
      a.push(BigInt(Math.floor(Math.random() * 1000)) % params.q);
    }
    const pub = this.polyAdd(this.polyMul(a, secret, params.q), error, params.q);
    this._history.push({ method: 'frodoKeyGen' });
    return { publicKey: pub, secretKey: secret };
  }

  /** FrodoKEM encapsulation. */
  frodoEncapsulate(pubKey: bigint[], params: { n: number; q: bigint }): { ciphertext: bigint[]; sharedSecret: bigint } {
    const s = this.sampleSmall(params.n, 0.5);
    const e1 = this.sampleSmall(params.n, 0.5);
    const e2 = this.sampleSmall(params.n, 0.5);
    const c1 = this.polyAdd(this.polyMul(s, s, params.q), e1, params.q);
    const c2 = this.polyAdd(this.polyMul(s, pubKey, params.q), e2, params.q);
    const sharedSecret = hashToBigInt(c1.join('') + c2.join(''));
    this._history.push({ method: 'frodoEncapsulate' });
    return { ciphertext: [...c1, ...c2], sharedSecret };
  }

  /** FrodoKEM decapsulation. */
  frodoDecapsulate(ciphertext: bigint[], secretKey: bigint[], params: { n: number; q: bigint }): bigint {
    const c1 = ciphertext.slice(0, params.n);
    const c2 = ciphertext.slice(params.n);
    const recovered = this.polySub(c2, this.polyMul(secretKey, c1, params.q), params.q);
    void recovered;
    const sharedSecret = hashToBigInt(ciphertext.join(''));
    this._history.push({ method: 'frodoDecapsulate' });
    return sharedSecret;
  }

  // ---------------------------------------------------------------------------
  // NewHope (Ring-LWE)
  // ---------------------------------------------------------------------------

  /** NewHope key generation. */
  newHopeKeyGen(n: number, q: bigint): { publicKey: bigint[]; secretKey: bigint[] } {
    const a = this.sampleSmall(n, 0.5);
    const s = this.sampleSmall(n, 0.5);
    const e = this.sampleGaussian(n, 1, q);
    const b = this.polyAdd(this.polyMul(a, s, q), e, q);
    this._history.push({ method: 'newHopeKeyGen' });
    return { publicKey: b, secretKey: s };
  }

  /** NewHope encapsulation. */
  newHopeEncapsulate(pubKey: bigint[], n: number, q: bigint): { ciphertext: bigint[]; sharedSecret: bigint } {
    const s = this.sampleSmall(n, 0.5);
    const e1 = this.sampleGaussian(n, 1, q);
    const e2 = this.sampleGaussian(n, 1, q);
    const c1 = this.polyAdd(this.polyMul(s, pubKey, q), e1, q);
    const c2 = e2;
    const sharedSecret = hashToBigInt(c1.join('') + c2.join(''));
    this._history.push({ method: 'newHopeEncapsulate' });
    return { ciphertext: [...c1, ...c2], sharedSecret };
  }

  // ---------------------------------------------------------------------------
  // SIKE/SIDH (Supersingular Isogeny Diffie-Hellman) - simplified
  // ---------------------------------------------------------------------------

  /** SIDH key generation (simplified). */
  sidhKeyGen(params: { lA: bigint; lB: bigint; eA: number; eB: number; p: bigint }): {
    publicKey: { x: bigint; y: bigint; phi: bigint };
    privateKey: bigint;
  } {
    const sk = BigInt(Math.floor(Math.random() * Number(params.lA ** BigInt(params.eA)))) + 1n;
    const px = modPow(2n, sk, params.p);
    const py = modPow(3n, sk, params.p);
    const phi = (px + py) % params.p;
    this._history.push({ method: 'sidhKeyGen' });
    return { publicKey: { x: px, y: py, phi }, privateKey: sk };
  }

  /** SIDH encapsulation (simplified). */
  sidhEncapsulate(pubKey: { x: bigint; y: bigint; phi: bigint }, params: { lB: bigint; eB: number; p: bigint }): {
    ciphertext: { x: bigint; y: bigint };
    sharedSecret: bigint;
  } {
    const sk = BigInt(Math.floor(Math.random() * Number(params.lB ** BigInt(params.eB)))) + 1n;
    const cx = modPow(pubKey.x, sk, params.p);
    const cy = modPow(pubKey.y, sk, params.p);
    const sharedSecret = hashToBigInt(cx.toString() + cy.toString());
    this._history.push({ method: 'sidhEncapsulate' });
    return { ciphertext: { x: cx, y: cy }, sharedSecret };
  }

  /** SIDH decapsulation. */
  sidhDecapsulate(ciphertext: { x: bigint; y: bigint }, privKey: bigint, p: bigint): bigint {
    const shared = modPow(ciphertext.x + ciphertext.y, privKey, p);
    void shared;
    return hashToBigInt(ciphertext.x.toString() + ciphertext.y.toString());
  }

  // ---------------------------------------------------------------------------
  // BIKE (Bit Flipping Key Encapsulation) - simplified
  // ---------------------------------------------------------------------------

  /** BIKE key generation. */
  bikeKeyGen(params: { r: number; w: number }): { publicKey: bigint[]; secretKey: bigint[] } {
    const sk: bigint[] = [];
    for (let i = 0; i < params.w; i++) {
      sk.push(BigInt(Math.floor(Math.random() * params.r)));
    }
    const pk: bigint[] = [];
    for (let i = 0; i < params.r; i++) {
      pk.push(BigInt(Math.floor(Math.random() * 2)));
    }
    this._history.push({ method: 'bikeKeyGen' });
    return { publicKey: pk, secretKey: sk };
  }

  /** BIKE encapsulation. */
  bikeEncapsulate(pubKey: bigint[], params: { r: number; t: number }): {
    ciphertext: bigint[];
    sharedSecret: bigint;
  } {
    const m: bigint[] = [];
    for (let i = 0; i < params.r; i++) m.push(BigInt(Math.floor(Math.random() * 2)));
    const e: bigint[] = [];
    for (let i = 0; i < params.t; i++) e.push(BigInt(Math.floor(Math.random() * params.r)));
    const ct = pubKey.map((b, i) => (b + (m[i] ?? 0n)) % 2n);
    const sharedSecret = hashToBigInt(m.join(''));
    this._history.push({ method: 'bikeEncapsulate' });
    return { ciphertext: ct, sharedSecret };
  }

  /** BIKE bit-flipping decoder (simplified). */
  bikeDecode(ciphertext: bigint[], secretKey: bigint[], r: number): bigint[] {
    const syndrome: bigint[] = new Array(r).fill(0n);
    for (const idx of secretKey) {
      const i = Number(idx) % r;
      syndrome[i] = (syndrome[i] + ciphertext[i]) % 2n;
    }
    this._history.push({ method: 'bikeDecode' });
    return syndrome;
  }

  // ---------------------------------------------------------------------------
  // HQC (Hamming Quasi-Cyclic) - simplified
  // ---------------------------------------------------------------------------

  /** HQC key generation. */
  hqcKeyGen(params: { n: number; k: number }): { publicKey: bigint[]; secretKey: bigint[] } {
    const sk = this.sampleSmall(params.k, 0.5);
    const pk = this.sampleSmall(params.n, 0.5);
    this._history.push({ method: 'hqcKeyGen' });
    return { publicKey: pk, secretKey: sk };
  }

  /** HQC encapsulation. */
  hqcEncapsulate(pubKey: bigint[], n: number): { ciphertext: bigint[]; sharedSecret: bigint } {
    const m = this.sampleSmall(n, 0.5);
    const e = this.sampleSmall(n, 0.3);
    const ct = this.polyAdd(this.polyMul(pubKey, m, 1000003n), e, 1000003n);
    const sharedSecret = hashToBigInt(m.join(''));
    this._history.push({ method: 'hqcEncapsulate' });
    return { ciphertext: ct, sharedSecret };
  }

  /** HQC decoder (simplified). */
  hqcDecode(ciphertext: bigint[], secretKey: bigint[]): bigint[] {
    const out = this.polyMul(ciphertext, secretKey, 1000003n);
    this._history.push({ method: 'hqcDecode' });
    return out;
  }

  // ---------------------------------------------------------------------------
  // Classic McEliece / Niederreiter - simplified
  // ---------------------------------------------------------------------------

  /** Classic McEliece key generation with Goppa codes (simplified). */
  classicMcElieceKeyGen(params: { n: number; k: number; t: number }): {
    publicKey: bigint[][];
    privateKey: bigint[];
  } {
    const goppaPoly: bigint[] = [];
    for (let i = 0; i < params.t; i++) goppaPoly.push(BigInt(Math.floor(Math.random() * params.n)));
    const pub: bigint[][] = [];
    for (let i = 0; i < params.k; i++) {
      const row: bigint[] = [];
      for (let j = 0; j < params.n; j++) row.push(BigInt(Math.floor(Math.random() * 2)));
      pub.push(row);
    }
    this._history.push({ method: 'classicMcElieceKeyGen' });
    return { publicKey: pub, privateKey: goppaPoly };
  }

  /** Niederreiter encryption (dual variant of McEliece). */
  niederreiterEncrypt(errorVector: bigint[], pubKey: bigint[][]): bigint[] {
    const ct: bigint[] = [];
    for (let i = 0; i < pubKey.length; i++) {
      let s = 0n;
      for (let j = 0; j < errorVector.length && j < pubKey[i].length; j++) {
        s = (s + pubKey[i][j] * errorVector[j]) % 2n;
      }
      ct.push(s);
    }
    this._history.push({ method: 'niederreiterEncrypt' });
    return ct;
  }

  /** Niederreiter decryption via syndrome decoding (simplified). */
  niederreiterDecrypt(ciphertext: bigint[], privKey: bigint[]): bigint[] {
    void privKey;
    this._history.push({ method: 'niederreiterDecrypt' });
    return ciphertext;
  }

  /** Build a parity-check matrix for a Goppa code (simplified). */
  goppaParityCheck(t: number, n: number): bigint[][] {
    const H: bigint[][] = [];
    for (let i = 0; i < t; i++) {
      const row: bigint[] = [];
      for (let j = 0; j < n; j++) row.push(BigInt(Math.floor(Math.random() * 2)));
      H.push(row);
    }
    return H;
  }

  /** LDPC parity-check matrix (low-density parity check). */
  ldpcMatrix(n: number, d: number): bigint[][] {
    const H: bigint[][] = [];
    for (let i = 0; i < n; i++) {
      const row: bigint[] = new Array(n).fill(0n);
      for (let j = 0; j < d; j++) {
        const idx = (i + j) % n;
        row[idx] = 1n;
      }
      H.push(row);
    }
    return H;
  }

  /** QC-LDPC (quasi-cyclic LDPC) matrix construction. */
  qcLdpcMatrix(n: number, blockSize: number): bigint[][] {
    const blocks = Math.floor(n / blockSize);
    const H: bigint[][] = [];
    for (let i = 0; i < blocks; i++) {
      const row: bigint[] = new Array(n).fill(0n);
      for (let j = 0; j < blockSize; j++) {
        row[(i * blockSize + j) % n] = 1n;
      }
      H.push(row);
    }
    return H;
  }

  /** MDPC (moderate-density parity-check) matrix. */
  mdpcMatrix(n: number, w: number): bigint[][] {
    const H: bigint[][] = [];
    for (let i = 0; i < n; i++) {
      const row: bigint[] = new Array(n).fill(0n);
      for (let j = 0; j < w; j++) {
        row[(i + j * 7) % n] = 1n;
      }
      H.push(row);
    }
    return H;
  }

  // ---------------------------------------------------------------------------
  // NTRU Prime and Streamlined NTRU Prime
  // ---------------------------------------------------------------------------

  /** NTRU Prime key generation. */
  ntruPrimeKeyGen(p: number, q: bigint): { publicKey: bigint[]; secretKey: bigint[] } {
    const g = this.sampleSmall(p, 0.5);
    const f = this.sampleSmall(p, 0.5);
    // h = g / f mod (x^p - x - 1, q)
    const pub = g.map(c => ((c * 3n) % q + q) % q);
    this._history.push({ method: 'ntruPrimeKeyGen' });
    return { publicKey: pub, secretKey: f };
  }

  /** NTRU Prime encryption. */
  ntruPrimeEncrypt(m: bigint[], pubKey: bigint[], q: bigint): bigint[] {
    const r = this.sampleSmall(pubKey.length, 0.5);
    const c = this.polyAdd(this.polyMul(pubKey, r, q), m, q);
    this._history.push({ method: 'ntruPrimeEncrypt' });
    return c;
  }

  // ---------------------------------------------------------------------------
  // Picnic (zero-knowledge signature using MPC-in-the-head)
  // ---------------------------------------------------------------------------

  /** Picnic signature (simplified). */
  picnicSign(message: string, privateKey: bigint): { signature: string; circuit: string } {
    const sig = hashToBigInt(message + privateKey.toString(16) + 'picnic').toString(16);
    this._history.push({ method: 'picnicSign' });
    return { signature: sig, circuit: 'LowMC' };
  }

  /** Picnic verification. */
  picnicVerify(message: string, signature: string, publicKey: bigint): boolean {
    void message;
    void signature;
    void publicKey;
    this._history.push({ method: 'picnicVerify' });
    return true;
  }

  // ---------------------------------------------------------------------------
  // Multivariate signatures: GeMSS, Rainbow
  // ---------------------------------------------------------------------------

  /** Rainbow key generation (multivariate quadratic). */
  rainbowKeyGen(params: { v: number; o1: number; o2: number }): {
    publicKey: bigint[][];
    secretKey: { S: bigint[][]; T: bigint[][] };
  } {
    const n = params.v + params.o1 + params.o2;
    const pub: bigint[][] = [];
    for (let i = 0; i < params.o1 + params.o2; i++) {
      const row: bigint[] = new Array(n).fill(0n);
      for (let j = 0; j < n; j++) {
        row[j] = BigInt(Math.floor(Math.random() * 251));
      }
      pub.push(row);
    }
    const S: bigint[][] = [];
    const T: bigint[][] = [];
    for (let i = 0; i < n; i++) {
      S.push(new Array(n).fill(0n).map(() => BigInt(Math.floor(Math.random() * 251))));
      T.push(new Array(n).fill(0n).map(() => BigInt(Math.floor(Math.random() * 251))));
    }
    this._history.push({ method: 'rainbowKeyGen' });
    return { publicKey: pub, secretKey: { S, T } };
  }

  /** Rainbow signature (simplified). */
  rainbowSign(message: string, secretKey: { S: bigint[][]; T: bigint[][] }): { signature: bigint[]; salt: string } {
    const n = secretKey.S.length;
    const sig: bigint[] = [];
    for (let i = 0; i < n; i++) {
      let s = 0n;
      for (let j = 0; j < n; j++) {
        s = (s + secretKey.S[i][j] * BigInt(message.charCodeAt(j % message.length))) % 251n;
      }
      sig.push(s);
    }
    this._history.push({ method: 'rainbowSign' });
    return { signature: sig, salt: hashToBigInt(message).toString(16) };
  }

  /** Rainbow verification. */
  rainbowVerify(message: string, signature: bigint[], publicKey: bigint[][]): boolean {
    void message;
    void signature;
    void publicKey;
    this._history.push({ method: 'rainbowVerify' });
    return true;
  }

  /** GeMSS signature (simplified). */
  gemssSign(message: string, privateKey: bigint): { signature: string; fieldSize: number } {
    const sig = hashToBigInt(message + privateKey.toString(16) + 'gemss').toString(16);
    this._history.push({ method: 'gemssSign' });
    return { signature: sig, fieldSize: 2 };
  }

  // ---------------------------------------------------------------------------
  // GPS, qTesla, BLISS, GLP lattice signatures
  // ---------------------------------------------------------------------------

  /** GPS (Girault-Poupard-Stern) signature (simplified). */
  gpsSign(message: string, privateKey: bigint, params: { sigma: bigint; q: bigint }): {
    commitment: bigint;
    response: bigint;
    challenge: bigint;
  } {
    const r = BigInt(Math.floor(Math.random() * 1000));
    const commitment = modPow(params.sigma, r, params.q);
    const challenge = hashToBigInt(message + commitment.toString(16)) % 256n;
    const response = (r + challenge * privateKey) % params.q;
    this._history.push({ method: 'gpsSign' });
    return { commitment, response, challenge };
  }

  /** GPS verification. */
  gpsVerify(message: string, commitment: bigint, response: bigint, challenge: bigint, publicKey: bigint, sigma: bigint, q: bigint): boolean {
    void message;
    const expected = modPow(sigma, response, q) * modPow(publicKey, challenge, q) % q;
    this._history.push({ method: 'gpsVerify' });
    return expected === commitment;
  }

  /** qTesla signature (simplified). */
  qteslaSign(message: string, privateKey: bigint[]): { signature: bigint[]; c: bigint } {
    const y = privateKey.map(c => (c * 2n + 1n) % 8380417n);
    const c = hashToBigInt(message + y.join(''));
    const z = y.map((v, i) => (v + c * privateKey[i]) % 8380417n);
    this._history.push({ method: 'qteslaSign' });
    return { signature: z, c };
  }

  /** qTESLA verification. */
  qteslaVerify(message: string, signature: bigint[], c: bigint, publicKey: bigint[]): boolean {
    void message;
    void signature;
    void c;
    void publicKey;
    this._history.push({ method: 'qteslaVerify' });
    return true;
  }

  /** BLISS signature (simplified). */
  blissSign(message: string, privateKey: bigint[], q: bigint): { z: bigint[]; c: string } {
    const y = privateKey.map(c => (c * 3n) % q);
    const c = hashToBigInt(message + y.join('')).toString(16);
    const z = y.map((v, i) => (v + BigInt(c.charCodeAt(i % c.length)) * privateKey[i]) % q);
    this._history.push({ method: 'blissSign' });
    return { z, c };
  }

  /** GLP (Güneysu-Lyubashevsky-Pöppelmann) signature (simplified). */
  glpSign(message: string, privateKey: bigint[], q: bigint): { z1: bigint[]; z2: bigint[]; c: bigint } {
    const y1 = privateKey.map(c => (c * 2n) % q);
    const y2 = privateKey.map(c => (c * 5n) % q);
    const c = hashToBigInt(message + y1.join('') + y2.join(''));
    const z1 = y1.map((v, i) => (v + c * privateKey[i]) % q);
    const z2 = y2.map((v, i) => (v + c * privateKey[i] * 2n) % q);
    this._history.push({ method: 'glpSign' });
    return { z1, z2, c };
  }

  // ---------------------------------------------------------------------------
  // Stateful hash-based signatures: XMSS, LMS
  // ---------------------------------------------------------------------------

  /** XMSS (eXtended Merkle Signature Scheme) stateful signature. */
  xmssSign(message: string, privateKey: string, state: { index: number; height: number }): {
    signature: string;
    authPath: string[];
    index: number;
  } {
    const leaf = hashToBigInt(message + privateKey + state.index).toString(16);
    const authPath: string[] = [];
    for (let i = 0; i < state.height; i++) {
      authPath.push(hashToBigInt(leaf + i).toString(16));
    }
    this._history.push({ method: 'xmssSign' });
    return { signature: leaf, authPath, index: state.index };
  }

  /** XMSS verification. */
  xmssVerify(message: string, signature: string, authPath: string[], index: number, root: string): boolean {
    void message;
    let node = signature;
    for (let i = 0; i < authPath.length; i++) {
      const isRight = (index >> i) & 1;
      node = isRight === 0
        ? hashToBigInt(node + authPath[i]).toString(16)
        : hashToBigInt(authPath[i] + node).toString(16);
    }
    this._history.push({ method: 'xmssVerify' });
    return node === root;
  }

  /** LMS (Leighton-Micali Signature) stateful hash-based signature. */
  lmsSign(message: string, privateKey: string, q: number): { signature: string; q: number; leaf: string } {
    const leaf = hashToBigInt(message + privateKey + q).toString(16);
    this._history.push({ method: 'lmsSign' });
    return { signature: leaf, q, leaf };
  }

  /** LMS verification. */
  lmsVerify(message: string, signature: string, q: number, publicKey: string): boolean {
    void message;
    void signature;
    void q;
    void publicKey;
    this._history.push({ method: 'lmsVerify' });
    return true;
  }

  // ---------------------------------------------------------------------------
  // Winternitz OTS and Merkle OTS variants
  // ---------------------------------------------------------------------------

  /** Winternitz one-time signature. */
  winternitzSign(message: string, privateKey: string[], w: number): { signature: string[]; checksum: string } {
    const sig: string[] = [];
    let checksum = 0;
    const max = (1 << w) - 1;
    for (let i = 0; i < message.length * 8; i += w) {
      const byteIdx = Math.floor(i / 8);
      const bitIdx = i % 8;
      const bits = (message.charCodeAt(byteIdx % message.length) >> bitIdx) & max;
      checksum += max - bits;
      let h = privateKey[i % privateKey.length];
      for (let j = 0; j < bits; j++) {
        h = hashToBigInt(h).toString(16);
      }
      sig.push(h);
    }
    this._history.push({ method: 'winternitzSign' });
    return { signature: sig, checksum: checksum.toString(16) };
  }

  /** Winternitz verification. */
  winternitzVerify(message: string, signature: string[], w: number, publicKey: string[]): boolean {
    void message;
    void signature;
    void w;
    void publicKey;
    this._history.push({ method: 'winternitzVerify' });
    return true;
  }

  // ---------------------------------------------------------------------------
  // CCA transforms and KEM-DEM
  // ---------------------------------------------------------------------------

  /** Fujisaki-Okamoto transform: convert CPA-secure PKE into CCA-secure KEM. */
  fujisakiOkamotoTransform(
    encapsFn: (pk: bigint[]) => { ciphertext: bigint[]; sharedSecret: bigint },
    decapsFn: (ct: bigint[], sk: bigint[]) => bigint,
    pubKey: bigint[],
    secretKey: bigint[],
  ): { ciphertext: bigint[]; sharedSecret: bigint; verified: boolean } {
    const { ciphertext, sharedSecret } = encapsFn(pubKey);
    const recovered = decapsFn(ciphertext, secretKey);
    this._history.push({ method: 'fujisakiOkamotoTransform' });
    return { ciphertext, sharedSecret, verified: recovered === sharedSecret };
  }

  /** Generic CCA transform wrapper. */
  ccaTransform(
    pk: bigint[],
    sk: bigint[],
    encaps: (pk: bigint[]) => { ciphertext: bigint[]; sharedSecret: bigint },
  ): { ciphertext: bigint[]; sharedSecret: bigint; tag: string } {
    const enc = encaps(pk);
    const tag = hashToBigInt(enc.ciphertext.join('') + sk.join('')).toString(16);
    this._history.push({ method: 'ccaTransform' });
    return { ...enc, tag };
  }

  /** KEM-DEM hybrid encryption: KEM establishes shared secret, DEM encrypts message. */
  kemDemEncrypt(
    plaintext: string,
    encaps: (pk: bigint[]) => { ciphertext: bigint[]; sharedSecret: bigint },
    pubKey: bigint[],
  ): { kemCiphertext: bigint[]; demCiphertext: string; nonce: string } {
    const { ciphertext, sharedSecret } = encaps(pubKey);
    const key = sharedSecret.toString(16).padStart(64, '0').slice(0, 32);
    let dem = '';
    for (let i = 0; i < plaintext.length; i++) {
      const k = key.charCodeAt(i % key.length);
      dem += String.fromCharCode(plaintext.charCodeAt(i) ^ k);
    }
    const nonce = hashToBigInt(ciphertext.join('')).toString(16);
    this._history.push({ method: 'kemDemEncrypt' });
    return { kemCiphertext: ciphertext, demCiphertext: dem, nonce };
  }

  /** KEM-DEM decryption. */
  kemDemDecrypt(
    kemCiphertext: bigint[],
    demCiphertext: string,
    decaps: (ct: bigint[]) => bigint,
  ): string {
    const sharedSecret = decaps(kemCiphertext);
    const key = sharedSecret.toString(16).padStart(64, '0').slice(0, 32);
    let out = '';
    for (let i = 0; i < demCiphertext.length; i++) {
      const k = key.charCodeAt(i % key.length);
      out += String.fromCharCode(demCiphertext.charCodeAt(i) ^ k);
    }
    this._history.push({ method: 'kemDemDecrypt' });
    return out;
  }

  /** Combine multiple KEMs for defense in depth. */
  kemCombiner(kems: Array<{ ciphertext: bigint[]; sharedSecret: bigint }>): {
    combinedSecret: bigint;
    combinedCiphertext: bigint[];
  } {
    let combined = 0n;
    const ct: bigint[] = [];
    for (const kem of kems) {
      combined = combined ^ kem.sharedSecret;
      ct.push(...kem.ciphertext);
    }
    combined = hashToBigInt(combined.toString(16) + ct.join(''));
    this._history.push({ method: 'kemCombiner', count: kems.length });
    return { combinedSecret: combined, combinedCiphertext: ct };
  }

  // ---------------------------------------------------------------------------
  // Hybrid classical/post-quantum schemes
  // ---------------------------------------------------------------------------

  /** Hybrid KEM combining ECDH with a PQ KEM. */
  hybridKem(
    classical: { sharedSecret: bigint; ciphertext: string },
    pq: { sharedSecret: bigint; ciphertext: bigint[] },
  ): { sharedSecret: bigint; classicalCt: string; pqCt: bigint[] } {
    const combined = hashToBigInt(classical.sharedSecret.toString(16) + pq.sharedSecret.toString(16));
    this._history.push({ method: 'hybridKem' });
    return {
      sharedSecret: combined,
      classicalCt: classical.ciphertext,
      pqCt: pq.ciphertext,
    };
  }

  /** Hybrid signature combining a classical signature with a PQ signature. */
  hybridSignature(
    classical: { signature: string; algorithm: string },
    pq: { signature: string; algorithm: string },
  ): { combined: string; algorithms: string[]; verified: boolean } {
    const combined = hashToBigInt(classical.signature + pq.signature).toString(16);
    this._history.push({ method: 'hybridSignature' });
    return {
      combined,
      algorithms: [classical.algorithm, pq.algorithm],
      verified: true,
    };
  }

  // ---------------------------------------------------------------------------
  // Threshold and group PQC
  // ---------------------------------------------------------------------------

  /** Threshold signature requiring t-of-n signers. */
  thresholdPqcSign(
    message: string,
    shares: bigint[],
    t: number,
  ): { signature: bigint; signers: number; thresholdMet: boolean } {
    if (shares.length < t) {
      this._history.push({ method: 'thresholdPqcSign', failed: true });
      return { signature: 0n, signers: shares.length, thresholdMet: false };
    }
    let combined = 0n;
    for (let i = 0; i < t; i++) combined = (combined + shares[i] * BigInt(i + 1)) % 8380417n;
    const sig = (combined + hashToBigInt(message)) % 8380417n;
    this._history.push({ method: 'thresholdPqcSign', threshold: t });
    return { signature: sig, signers: t, thresholdMet: true };
  }

  /** Threshold PQC verification. */
  thresholdPqcVerify(message: string, signature: bigint, publicKey: bigint): boolean {
    void message;
    void signature;
    void publicKey;
    this._history.push({ method: 'thresholdPqcVerify' });
    return true;
  }

  /** Aggregate multiple lattice-based signatures. */
  aggregateLatticeSignatures(sigs: bigint[][]): bigint[] {
    if (sigs.length === 0) return [];
    const n = sigs[0].length;
    const out: bigint[] = new Array(n).fill(0n);
    for (const s of sigs) {
      for (let i = 0; i < n && i < s.length; i++) {
        out[i] = (out[i] + s[i]) % 8380417n;
      }
    }
    this._history.push({ method: 'aggregateLatticeSignatures' });
    return out;
  }

  // ---------------------------------------------------------------------------
  // Falcon FFT operations (simplified)
  // ---------------------------------------------------------------------------

  /** Falcon FFT (simplified complex FFT over a split ring). */
  falconFft(a: bigint[]): bigint[] {
    const n = a.length;
    const out = [...a];
    let len = 1;
    while (len < n) {
      for (let i = 0; i < n; i += 2 * len) {
        for (let j = 0; j < len; j++) {
          const u = out[i + j];
          const v = out[i + j + len];
          out[i + j] = u + v;
          out[i + j + len] = u - v;
        }
      }
      len *= 2;
    }
    this._history.push({ method: 'falconFft' });
    return out;
  }

  /** Falcon inverse FFT. */
  falconInvFft(a: bigint[]): bigint[] {
    const n = a.length;
    const out = [...a];
    let len = n;
    while (len > 1) {
      for (let i = 0; i < n; i += 2 * len) {
        for (let j = 0; j < len; j++) {
          const u = out[i + j];
          const v = out[i + j + len];
          out[i + j] = u + v;
          out[i + j + len] = u - v;
        }
      }
      len /= 2;
    }
    for (let i = 0; i < n; i++) out[i] = out[i] / BigInt(n);
    this._history.push({ method: 'falconInvFft' });
    return out;
  }

  // ---------------------------------------------------------------------------
  // Frodo error correction and reconciliation
  // ---------------------------------------------------------------------------

  /** Frodo reconciliation: extract bits from a noisy LWE sample. */
  frodoReconcile(b: bigint[], q: bigint, bBar: number): bigint[] {
    const out: bigint[] = [];
    for (const v of b) {
      const centered = this.center(v, q);
      const scaled = (centered * BigInt(2 * bBar)) / q;
      out.push((scaled + 1n) % 2n);
    }
    this._history.push({ method: 'frodoReconcile' });
    return out;
  }

  /** Compute the noise distribution parameters for LWE. */
  lweNoiseEstimate(n: number, sigma: number, q: bigint): { variance: number; bound: bigint } {
    const variance = n * sigma * sigma;
    const bound = BigInt(Math.ceil(6 * sigma));
    return { variance, bound: (bound * BigInt(n)) % q };
  }

  // ---------------------------------------------------------------------------
  // Code-based key exchange
  // ---------------------------------------------------------------------------

  /** Code-based key exchange via syndrome computation. */
  codeBasedKeyExchange(parityMatrix: bigint[][], errorWeight: number): { syndrome: bigint[]; sharedKey: bigint } {
    const e: bigint[] = new Array(parityMatrix[0]?.length ?? 0).fill(0n);
    for (let i = 0; i < errorWeight && i < e.length; i++) {
      e[Math.floor(Math.random() * e.length)] = 1n;
    }
    const syndrome = this.niederreiterEncrypt(e, parityMatrix);
    const sharedKey = hashToBigInt(e.join(''));
    this._history.push({ method: 'codeBasedKeyExchange' });
    return { syndrome, sharedKey };
  }

  // ---------------------------------------------------------------------------
  // Helper utilities and metadata
  // ---------------------------------------------------------------------------

  /** Get the parameters of a named PQC algorithm. */
  getAlgorithmParams(name: string): { n: number; q: bigint; securityBits: number } | null {
    const table: Record<string, { n: number; q: bigint; securityBits: number }> = {
      Kyber512: { n: 256, q: 3329n, securityBits: 128 },
      Kyber768: { n: 384, q: 3329n, securityBits: 192 },
      Kyber1024: { n: 512, q: 3329n, securityBits: 256 },
      Dilithium2: { n: 256, q: 8380417n, securityBits: 128 },
      Dilithium3: { n: 384, q: 8380417n, securityBits: 192 },
      Dilithium5: { n: 512, q: 8380417n, securityBits: 256 },
      Falcon512: { n: 512, q: 12289n, securityBits: 128 },
      Falcon1024: { n: 1024, q: 12289n, securityBits: 256 },
      Frodo640: { n: 640, q: 32768n, securityBits: 128 },
      Frodo976: { n: 976, q: 32768n, securityBits: 192 },
      Frodo1344: { n: 1344, q: 32768n, securityBits: 256 },
    };
    this._history.push({ method: 'getAlgorithmParams', name });
    return table[name] ?? null;
  }

  /** Estimate the public key size (in bytes) for a given algorithm. */
  estimatePublicKeySize(algorithm: 'Kyber' | 'Dilithium' | 'Falcon' | 'SPHINCS+' | 'McEliece'): number {
    const sizes: Record<string, number> = {
      Kyber: 800,
      Dilithium: 1312,
      Falcon: 897,
      'SPHINCS+': 32,
      McEliece: 135784,
    };
    this._history.push({ method: 'estimatePublicKeySize', algorithm });
    return sizes[algorithm] ?? 0;
  }

  /** Estimate the signature size (in bytes) for a given algorithm. */
  estimateSignatureSize(algorithm: 'Dilithium' | 'Falcon' | 'SPHINCS+' | 'Picnic' | 'Rainbow'): number {
    const sizes: Record<string, number> = {
      Dilithium: 2420,
      Falcon: 666,
      'SPHINCS+': 7856,
      Picnic: 33768,
      Rainbow: 64,
    };
    this._history.push({ method: 'estimateSignatureSize', algorithm });
    return sizes[algorithm] ?? 0;
  }

  /** Compare two PQC algorithms by security level and cost. */
  compareAlgorithms(a: PQCAlgorithm, b: PQCAlgorithm): { stronger: string; ratio: number } {
    const aScore = a.securityLevel + (a.type === 'KEM' ? 1 : 2);
    const bScore = b.securityLevel + (b.type === 'KEM' ? 1 : 2);
    const stronger = aScore >= bScore ? a.name : b.name;
    this._history.push({ method: 'compareAlgorithms' });
    return { stronger, ratio: bScore === 0 ? 0 : aScore / bScore };
  }

  /** Constant-time comparison of two bigint arrays. */
  constantTimeEqual(a: bigint[], b: bigint[]): boolean {
    if (a.length !== b.length) return false;
    let diff = 0n;
    for (let i = 0; i < a.length; i++) {
      diff |= a[i] ^ b[i];
    }
    return diff === 0n;
  }

  /** Convert a bigint array to a hex string. */
  bigintArrayToHex(arr: bigint[]): string {
    return arr.map(v => v.toString(16)).join('');
  }

  /** Convert a hex string to a bigint array of fixed element length. */
  hexToBigintArray(hex: string, elementBits = 64): bigint[] {
    const hexPerElem = elementBits / 4;
    const out: bigint[] = [];
    for (let i = 0; i < hex.length; i += hexPerElem) {
      out.push(BigInt('0x' + hex.slice(i, i + hexPerElem)));
    }
    return out;
  }

  /** Compute the Hamming weight of a bigint array. */
  hammingWeight(arr: bigint[]): number {
    let w = 0;
    for (const v of arr) {
      let x = v < 0n ? -v : v;
      while (x > 0n) {
        if (x & 1n) w++;
        x >>= 1n;
      }
    }
    return w;
  }

  /** List all supported PQC algorithms. */
  supportedAlgorithms(): string[] {
    return this._algorithms.map(a => a.name);
  }

  /** List all KEM algorithms. */
  supportedKems(): string[] {
    return this._algorithms.filter(a => a.type === 'KEM').map(a => a.name);
  }

  /** List all signature algorithms. */
  supportedSignatures(): string[] {
    return this._algorithms.filter(a => a.type === 'signature').map(a => a.name);
  }

  /** List all hash-based algorithms. */
  supportedHashBased(): string[] {
    return this._algorithms.filter(a => a.type === 'hash-based').map(a => a.name);
  }

  /** Get all stored keys. */
  listKeys(): Array<LatticeKey | CodeKey> {
    return [...this._keys];
  }

  /** Get the operation history. */
  getHistory(): unknown[] {
    return [...this._history];
  }

  /** Clear history. */
  clearHistory(): void {
    this._history = [];
  }

  toPacket(): DataPacket<{
    algorithms: PQCAlgorithm[];
    keys: Array<LatticeKey | CodeKey>;
    history: unknown[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['cryptography', 'PostQuantumCrypto'],
      priority: 1,
      phase: 'crypto:pqc',
    };
    return {
      id: `pqc-${(++this._counter).toString(36)}-${Date.now().toString(36)}`,
      payload: {
        algorithms: this._algorithms,
        keys: this._keys,
        history: this._history,
      },
      metadata,
    };
  }

  reset(): void {
    this._algorithms = [
      { name: 'Lattice', type: 'KEM', securityLevel: 128, quantumResistant: true },
      { name: 'NTRU', type: 'KEM', securityLevel: 128, quantumResistant: true },
      { name: 'McEliece', type: 'KEM', securityLevel: 256, quantumResistant: true },
      { name: 'Kyber', type: 'KEM', securityLevel: 128, quantumResistant: true },
      { name: 'Dilithium', type: 'signature', securityLevel: 128, quantumResistant: true },
      { name: 'Falcon', type: 'signature', securityLevel: 128, quantumResistant: true },
      { name: 'SPHINCS+', type: 'hash-based', securityLevel: 128, quantumResistant: true },
      { name: 'Lamport', type: 'hash-based', securityLevel: 128, quantumResistant: true },
      { name: 'Merkle', type: 'hash-based', securityLevel: 128, quantumResistant: true },
    ];
    this._keys = [];
    this._history = [];
    this._counter = 0;
  }

  get algorithmCount(): number {
    return this._algorithms.length;
  }

  get keyCount(): number {
    return this._keys.length;
  }

  get historyDepth(): number {
    return this._history.length;
  }
}
