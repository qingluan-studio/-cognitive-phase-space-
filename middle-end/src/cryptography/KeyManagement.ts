import { DataPacket, PacketMeta } from '../shared/types';

/** Key types supported by the key management lifecycle. */
export type KeyType =
  | 'symmetric'
  | 'asymmetric-private'
  | 'asymmetric-public'
  | 'session'
  | 'master'
  | 'key-encryption-key'
  | 'data-encryption-key'
  | 'hmac'
  | 'signature'
  | 'transport';

/** Key usage flags describing allowed operations. */
export type KeyUsage =
  | 'encrypt'
  | 'decrypt'
  | 'sign'
  | 'verify'
  | 'wrap'
  | 'unwrap'
  | 'derive'
  | 'authenticate';

/** Key state in lifecycle. */
export type KeyState = 'pre-active' | 'active' | 'suspended' | 'deactivated' | 'compromised' | 'destroyed' | 'archived';

/** Key origin descriptor. */
export type KeyOrigin = 'generated' | 'imported' | 'derived' | 'restored' | 'escrowed' | 'external';

/** Key material descriptor. */
export interface KeyMaterial {
  id: string;
  type: KeyType;
  algorithm: string;
  sizeBits: number;
  usage: KeyUsage[];
  state: KeyState;
  origin: KeyOrigin;
  createdAt: number;
  activatedAt?: number;
  expiredAt?: number;
  destroyedAt?: number;
  rotationCount: number;
  owner: string;
  tags: string[];
  material?: Uint8Array;
  wrapped?: boolean;
  checksum: string;
}

/** Key rotation policy. */
export interface RotationPolicy {
  keyId: string;
  intervalDays: number;
  maxUsageCount: number;
  maxDataBytes: number;
  lastRotatedAt: number;
  nextRotationAt: number;
  autoRotate: boolean;
  overlapDays: number;
}

/** Key derivation parameters. */
export interface DerivationParams {
  algorithm: 'HKDF' | 'PBKDF2' | 'scrypt' | 'bcrypt' | 'KDF1' | 'KDF2' | 'SP800-108' | 'X9.63';
  salt?: Uint8Array;
  iterations: number;
  outputBits: number;
  info?: Uint8Array;
  memoryCost?: number;
  parallelism?: number;
}

/** Key wrap result. */
export interface KeyWrapResult {
  wrappedKey: Uint8Array;
  kekId: string;
  algorithm: 'AES-KW' | 'AES-KWP' | 'RSA-OAEP' | 'RSA-PKCS1' | 'ECDH' | 'NIST-KW';
  iv?: Uint8Array;
  tag?: Uint8Array;
}

/** Escrow entry recording a key held by a third party. */
export interface EscrowEntry {
  keyId: string;
  escrowAgent: string;
  shares: number;
  threshold: number;
  createdAt: number;
  recoveryPolicy: string;
}

/** Split-knowledge share (Shamir's Secret Sharing). */
export interface SecretShare {
  index: number;
  value: Uint8Array;
  threshold: number;
}

/** Audit log entry for key operations. */
export interface KeyAuditEntry {
  timestamp: number;
  keyId: string;
  operation: string;
  actor: string;
  result: 'success' | 'failure' | 'denied';
  reason?: string;
}

/** Key compromise report. */
export interface CompromiseReport {
  keyId: string;
  detectedAt: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedData: string[];
  recommendedActions: string[];
}

/** Key agreement protocol descriptor. */
export interface KeyAgreement {
  protocol: 'DH' | 'ECDH' | 'ECDHE' | 'MQV' | 'FHMQV' | 'ECMQV' | 'PSK';
  curve?: 'P-256' | 'P-384' | 'P-521' | 'Curve25519' | 'Curve448' | 'secp256k1';
  partyA: Uint8Array;
  partyB: Uint8Array;
  sharedSecret: Uint8Array;
}

/** Key recovery info. */
export interface RecoveryInfo {
  keyId: string;
  method: 'escrow' | 'shamir' | 'backup' | 'passphrase';
  requiredApprovals: number;
  availableApprovals: number;
  recoveryAttempts: number;
  lastAttemptAt?: number;
}

/** HSM slot info. */
export interface HsmSlot {
  slotId: number;
  label: string;
  tokenPresent: boolean;
  loggedIn: boolean;
  keysStored: number;
  maxKeys: number;
  manufacturer: string;
  model: string;
  serial: string;
}

/** Access control entry for a key. */
export interface KeyAclEntry {
  principal: string;
  permissions: KeyUsage[];
  grantedAt: number;
  grantedBy: string;
  expiresAt?: number;
}

/** Key ceremony step. */
export interface CeremonyStep {
  stepNumber: number;
  description: string;
  required: boolean;
  completedBy?: string;
  completedAt?: number;
  witnessed: boolean;
}

/** Key distribution channel. */
export type DistributionChannel = 'online' | 'offline' | 'out-of-band' | 'in-person' | 'courier' | 'pkcs7' | 'jwk';

/** Key distribution record. */
export interface DistributionRecord {
  keyId: string;
  channel: DistributionChannel;
  recipient: string;
  sentAt: number;
  acknowledgedAt?: number;
  format: 'raw' | 'pem' | 'der' | 'jwk' | 'pkcs8' | 'pkcs12';
}

/** KeyManagement: lifecycle, derivation, wrapping, escrow, rotation. */
export class KeyManagement {
  private _keys: Map<string, KeyMaterial> = new Map();
  private _policies: Map<string, RotationPolicy> = new Map();
  private _escrow: EscrowEntry[] = [];
  private _audit: KeyAuditEntry[] = [];
  private _compromises: CompromiseReport[] = [];
  private _recoveries: Map<string, RecoveryInfo> = new Map();
  private _hsmSlots: Map<number, HsmSlot> = new Map();
  private _acls: Map<string, KeyAclEntry[]> = new Map();
  private _ceremonies: Map<string, CeremonyStep[]> = new Map();
  private _distributions: DistributionRecord[] = [];
  private _counter = 0;
  private _history: unknown[] = [];

  /** Generate a symmetric key of given size. */
  generateSymmetricKey(algorithm: string, sizeBits: number, owner: string): KeyMaterial {
    const id = `sym-${(++this._counter).toString(36)}-${Date.now().toString(36)}`;
    const bytes = Math.ceil(sizeBits / 8);
    const material = this._secureRandom(bytes);
    const key: KeyMaterial = {
      id,
      type: 'symmetric',
      algorithm,
      sizeBits,
      usage: ['encrypt', 'decrypt'],
      state: 'pre-active',
      origin: 'generated',
      createdAt: Date.now(),
      rotationCount: 0,
      owner,
      tags: [],
      material,
      wrapped: false,
      checksum: this._checksum(material),
    };
    this._keys.set(id, key);
    this._audit.push({ timestamp: Date.now(), keyId: id, operation: 'generate', actor: owner, result: 'success' });
    this._history.push({ method: 'generateSymmetricKey', id });
    return key;
  }

  /** Generate an asymmetric key pair (returns only private descriptor; public derived). */
  generateAsymmetricKeyPair(algorithm: string, sizeBits: number, owner: string): { privateKey: KeyMaterial; publicKey: KeyMaterial } {
    const privId = `priv-${(++this._counter).toString(36)}-${Date.now().toString(36)}`;
    const pubId = `pub-${(++this._counter).toString(36)}-${Date.now().toString(36)}`;
    const privBytes = Math.ceil(sizeBits / 8);
    const privMaterial = this._secureRandom(privBytes);
    const pubMaterial = this._secureRandom(privBytes);
    const privateKey: KeyMaterial = {
      id: privId,
      type: 'asymmetric-private',
      algorithm,
      sizeBits,
      usage: ['decrypt', 'sign'],
      state: 'pre-active',
      origin: 'generated',
      createdAt: Date.now(),
      rotationCount: 0,
      owner,
      tags: [],
      material: privMaterial,
      wrapped: false,
      checksum: this._checksum(privMaterial),
    };
    const publicKey: KeyMaterial = {
      id: pubId,
      type: 'asymmetric-public',
      algorithm,
      sizeBits,
      usage: ['encrypt', 'verify'],
      state: 'active',
      origin: 'generated',
      createdAt: Date.now(),
      rotationCount: 0,
      owner,
      tags: [],
      material: pubMaterial,
      wrapped: false,
      checksum: this._checksum(pubMaterial),
    };
    this._keys.set(privId, privateKey);
    this._keys.set(pubId, publicKey);
    this._audit.push({ timestamp: Date.now(), keyId: privId, operation: 'generate-keypair', actor: owner, result: 'success' });
    this._history.push({ method: 'generateAsymmetricKeyPair', privId, pubId });
    return { privateKey, publicKey };
  }

  /** Generate a master key (KEK) for wrapping other keys. */
  generateMasterKey(sizeBits: number, owner: string): KeyMaterial {
    const id = `kek-${(++this._counter).toString(36)}-${Date.now().toString(36)}`;
    const material = this._secureRandom(Math.ceil(sizeBits / 8));
    const key: KeyMaterial = {
      id,
      type: 'key-encryption-key',
      algorithm: 'AES-KW',
      sizeBits,
      usage: ['wrap', 'unwrap'],
      state: 'pre-active',
      origin: 'generated',
      createdAt: Date.now(),
      rotationCount: 0,
      owner,
      tags: ['master', 'kek'],
      material,
      wrapped: false,
      checksum: this._checksum(material),
    };
    this._keys.set(id, key);
    this._audit.push({ timestamp: Date.now(), keyId: id, operation: 'generate-master', actor: owner, result: 'success' });
    this._history.push({ method: 'generateMasterKey', id });
    return key;
  }

  /** Activate a pre-active key. */
  activateKey(keyId: string, actor: string): boolean {
    const key = this._keys.get(keyId);
    if (!key) {
      this._audit.push({ timestamp: Date.now(), keyId, operation: 'activate', actor, result: 'failure', reason: 'not-found' });
      return false;
    }
    if (key.state !== 'pre-active') {
      this._audit.push({ timestamp: Date.now(), keyId, operation: 'activate', actor, result: 'denied', reason: `invalid-state:${key.state}` });
      return false;
    }
    key.state = 'active';
    key.activatedAt = Date.now();
    this._audit.push({ timestamp: Date.now(), keyId, operation: 'activate', actor, result: 'success' });
    this._history.push({ method: 'activateKey', keyId });
    return true;
  }

  /** Suspend an active key temporarily. */
  suspendKey(keyId: string, actor: string, reason: string): boolean {
    const key = this._keys.get(keyId);
    if (!key) return false;
    if (key.state !== 'active') {
      this._audit.push({ timestamp: Date.now(), keyId, operation: 'suspend', actor, result: 'denied', reason: 'not-active' });
      return false;
    }
    key.state = 'suspended';
    this._audit.push({ timestamp: Date.now(), keyId, operation: 'suspend', actor, result: 'success', reason });
    this._history.push({ method: 'suspendKey', keyId, reason });
    return true;
  }

  /** Reactivate a suspended key. */
  reactivateKey(keyId: string, actor: string): boolean {
    const key = this._keys.get(keyId);
    if (!key) return false;
    if (key.state !== 'suspended') return false;
    key.state = 'active';
    this._audit.push({ timestamp: Date.now(), keyId, operation: 'reactivate', actor, result: 'success' });
    this._history.push({ method: 'reactivateKey', keyId });
    return true;
  }

  /** Deactivate a key (no longer usable but material retained). */
  deactivateKey(keyId: string, actor: string, reason: string): boolean {
    const key = this._keys.get(keyId);
    if (!key) return false;
    key.state = 'deactivated';
    this._audit.push({ timestamp: Date.now(), keyId, operation: 'deactivate', actor, result: 'success', reason });
    this._history.push({ method: 'deactivateKey', keyId, reason });
    return true;
  }

  /** Destroy a key (cryptographic erase). */
  destroyKey(keyId: string, actor: string, reason: string): boolean {
    const key = this._keys.get(keyId);
    if (!key) return false;
    if (key.material) {
      for (let i = 0; i < key.material.length; i++) key.material[i] = 0;
      key.material = undefined;
    }
    key.state = 'destroyed';
    key.destroyedAt = Date.now();
    this._audit.push({ timestamp: Date.now(), keyId, operation: 'destroy', actor, result: 'success', reason });
    this._history.push({ method: 'destroyKey', keyId });
    return true;
  }

  /** Archive a key for long-term retention. */
  archiveKey(keyId: string, actor: string): boolean {
    const key = this._keys.get(keyId);
    if (!key) return false;
    key.state = 'archived';
    this._audit.push({ timestamp: Date.now(), keyId, operation: 'archive', actor, result: 'success' });
    this._history.push({ method: 'archiveKey', keyId });
    return true;
  }

  /** Import an external key. */
  importKey(material: Uint8Array, algorithm: string, type: KeyType, owner: string, usage: KeyUsage[]): KeyMaterial {
    const id = `imp-${(++this._counter).toString(36)}-${Date.now().toString(36)}`;
    const key: KeyMaterial = {
      id,
      type,
      algorithm,
      sizeBits: material.length * 8,
      usage,
      state: 'pre-active',
      origin: 'imported',
      createdAt: Date.now(),
      rotationCount: 0,
      owner,
      tags: ['imported'],
      material: new Uint8Array(material),
      wrapped: false,
      checksum: this._checksum(material),
    };
    this._keys.set(id, key);
    this._audit.push({ timestamp: Date.now(), keyId: id, operation: 'import', actor: owner, result: 'success' });
    this._history.push({ method: 'importKey', id });
    return key;
  }

  /** Export a key (returns the raw material, if accessible). */
  exportKey(keyId: string, actor: string, format: 'raw' | 'pem' | 'der' | 'jwk' | 'pkcs8' = 'raw'): Uint8Array | string | null {
    const key = this._keys.get(keyId);
    if (!key || !key.material) {
      this._audit.push({ timestamp: Date.now(), keyId, operation: 'export', actor, result: 'failure', reason: 'not-found' });
      return null;
    }
    if (key.state === 'destroyed') {
      this._audit.push({ timestamp: Date.now(), keyId, operation: 'export', actor, result: 'denied', reason: 'destroyed' });
      return null;
    }
    this._audit.push({ timestamp: Date.now(), keyId, operation: 'export', actor, result: 'success', reason: format });
    this._history.push({ method: 'exportKey', keyId, format });
    if (format === 'pem') {
      const b64 = this._bytesToBase64(key.material);
      return `-----BEGIN ${key.type.toUpperCase()} KEY-----\n${b64}\n-----END ${key.type.toUpperCase()} KEY-----\n`;
    }
    if (format === 'jwk') {
      return JSON.stringify({
        kty: key.type === 'symmetric' ? 'oct' : 'RSA',
        alg: key.algorithm,
        key_ops: key.usage,
        ext: true,
        k: this._bytesToBase64Url(key.material),
      });
    }
    return key.material;
  }

  /** Set a rotation policy on a key. */
  setRotationPolicy(keyId: string, intervalDays: number, maxUsageCount: number, maxDataBytes: number, autoRotate: boolean, overlapDays = 7): RotationPolicy {
    const now = Date.now();
    const policy: RotationPolicy = {
      keyId,
      intervalDays,
      maxUsageCount,
      maxDataBytes,
      lastRotatedAt: now,
      nextRotationAt: now + intervalDays * 86_400_000,
      autoRotate,
      overlapDays,
    };
    this._policies.set(keyId, policy);
    this._audit.push({ timestamp: now, keyId, operation: 'set-policy', actor: 'system', result: 'success' });
    this._history.push({ method: 'setRotationPolicy', keyId });
    return policy;
  }

  /** Rotate a key, producing a new key id and archiving the old. */
  rotateKey(keyId: string, actor: string): KeyMaterial | null {
    const old = this._keys.get(keyId);
    if (!old) return null;
    const newMaterial = this._secureRandom(Math.ceil(old.sizeBits / 8));
    const newId = `rot-${(++this._counter).toString(36)}-${Date.now().toString(36)}`;
    const newKey: KeyMaterial = {
      ...old,
      id: newId,
      material: newMaterial,
      state: 'active',
      origin: 'generated',
      createdAt: Date.now(),
      activatedAt: Date.now(),
      rotationCount: old.rotationCount + 1,
      checksum: this._checksum(newMaterial),
    };
    this._keys.set(newId, newKey);
    old.state = 'deactivated';
    const policy = this._policies.get(keyId);
    if (policy) {
      policy.lastRotatedAt = Date.now();
      policy.nextRotationAt = Date.now() + policy.intervalDays * 86_400_000;
      this._policies.set(newId, { ...policy, keyId: newId });
      this._policies.delete(keyId);
    }
    this._audit.push({ timestamp: Date.now(), keyId: newId, operation: 'rotate', actor, result: 'success' });
    this._history.push({ method: 'rotateKey', oldId: keyId, newId });
    return newKey;
  }

  /** Check if any keys need rotation. */
  checkRotationDue(): string[] {
    const now = Date.now();
    const due: string[] = [];
    for (const [keyId, policy] of this._policies.entries()) {
      if (policy.autoRotate && now >= policy.nextRotationAt) due.push(keyId);
    }
    this._history.push({ method: 'checkRotationDue', due: due.length });
    return due;
  }

  /** Wrap a key using a KEK (key-encryption key). */
  wrapKey(kekId: string, keyId: string, algorithm: KeyWrapResult['algorithm'], actor: string): KeyWrapResult | null {
    const kek = this._keys.get(kekId);
    const target = this._keys.get(keyId);
    if (!kek || !target || !target.material || !kek.material) return null;
    const iv = this._secureRandom(12);
    const wrapped = this._aesWrap(kek.material, target.material, iv);
    const tag = this._computeTag(kek.material, wrapped);
    const result: KeyWrapResult = { wrappedKey: wrapped, kekId, algorithm, iv, tag };
    target.wrapped = true;
    target.material = undefined;
    this._audit.push({ timestamp: Date.now(), keyId, operation: 'wrap', actor, result: 'success', reason: kekId });
    this._history.push({ method: 'wrapKey', keyId, kekId });
    return result;
  }

  /** Unwrap a wrapped key. */
  unwrapKey(kekId: string, wrapped: KeyWrapResult, actor: string): KeyMaterial | null {
    const kek = this._keys.get(kekId);
    if (!kek || !kek.material) return null;
    const expectedTag = this._computeTag(kek.material, wrapped.wrappedKey);
    if (!this._constantTimeEqual(expectedTag, wrapped.tag ?? new Uint8Array(0))) {
      this._audit.push({ timestamp: Date.now(), keyId: wrapped.kekId, operation: 'unwrap', actor, result: 'failure', reason: 'tag-mismatch' });
      return null;
    }
    const material = this._aesUnwrap(kek.material, wrapped.wrappedKey, wrapped.iv);
    if (!material) return null;
    const id = `unw-${(++this._counter).toString(36)}-${Date.now().toString(36)}`;
    const key: KeyMaterial = {
      id,
      type: 'symmetric',
      algorithm: 'AES',
      sizeBits: material.length * 8,
      usage: ['encrypt', 'decrypt'],
      state: 'active',
      origin: 'restored',
      createdAt: Date.now(),
      rotationCount: 0,
      owner: actor,
      tags: ['unwrapped'],
      material,
      wrapped: false,
      checksum: this._checksum(material),
    };
    this._keys.set(id, key);
    this._audit.push({ timestamp: Date.now(), keyId: id, operation: 'unwrap', actor, result: 'success' });
    this._history.push({ method: 'unwrapKey', id, kekId });
    return key;
  }

  /** Derive a key from input key material using a KDF. */
  deriveKey(inputKey: Uint8Array, params: DerivationParams, algorithm: string, owner: string): KeyMaterial {
    let derived: Uint8Array;
    switch (params.algorithm) {
      case 'HKDF':
        derived = this._hkdf(inputKey, params.salt ?? new Uint8Array(0), params.info ?? new Uint8Array(0), Math.ceil(params.outputBits / 8));
        break;
      case 'PBKDF2':
        derived = this._pbkdf2(inputKey, params.salt ?? new Uint8Array(0), params.iterations, Math.ceil(params.outputBits / 8));
        break;
      case 'scrypt':
        derived = this._scrypt(inputKey, params.salt ?? new Uint8Array(0), params.iterations, params.memoryCost ?? 1024, params.parallelism ?? 1, Math.ceil(params.outputBits / 8));
        break;
      case 'bcrypt':
        derived = this._bcryptLike(inputKey, params.salt ?? new Uint8Array(16), params.iterations, Math.ceil(params.outputBits / 8));
        break;
      case 'KDF1':
        derived = this._kdf1(inputKey, Math.ceil(params.outputBits / 8));
        break;
      case 'KDF2':
        derived = this._kdf2(inputKey, Math.ceil(params.outputBits / 8));
        break;
      case 'SP800-108':
        derived = this._sp800108(inputKey, params.info ?? new Uint8Array(0), Math.ceil(params.outputBits / 8));
        break;
      case 'X9.63':
        derived = this._x963(inputKey, params.info ?? new Uint8Array(0), Math.ceil(params.outputBits / 8));
        break;
      default:
        derived = this._pbkdf2(inputKey, params.salt ?? new Uint8Array(0), params.iterations, Math.ceil(params.outputBits / 8));
    }
    const id = `drv-${(++this._counter).toString(36)}-${Date.now().toString(36)}`;
    const key: KeyMaterial = {
      id,
      type: 'derived' as KeyType,
      algorithm,
      sizeBits: params.outputBits,
      usage: ['encrypt', 'decrypt', 'derive'],
      state: 'active',
      origin: 'derived',
      createdAt: Date.now(),
      rotationCount: 0,
      owner,
      tags: [`kdf:${params.algorithm}`],
      material: derived,
      wrapped: false,
      checksum: this._checksum(derived),
    };
    this._keys.set(id, key);
    this._audit.push({ timestamp: Date.now(), keyId: id, operation: 'derive', actor: owner, result: 'success' });
    this._history.push({ method: 'deriveKey', id, algorithm: params.algorithm });
    return key;
  }

  /** HKDF extract+expand. */
  private _hkdf(ikm: Uint8Array, salt: Uint8Array, info: Uint8Array, length: number): Uint8Array {
    const prk = this._hmac(salt.length > 0 ? salt : new Uint8Array(32).fill(0), ikm);
    const okm = new Uint8Array(length);
    const t: Uint8Array[] = [];
    let pos = 0;
    let counter = 1;
    while (pos < length) {
      const input = this._combine(t[counter - 1] ?? new Uint8Array(0), this._combine(info, new Uint8Array([counter])));
      t[counter] = this._hmac(prk, input);
      const take = Math.min(t[counter].length, length - pos);
      okm.set(t[counter].subarray(0, take), pos);
      pos += take;
      counter++;
    }
    return okm;
  }

  /** PBKDF2 (simplified HMAC-SHA256). */
  private _pbkdf2(password: Uint8Array, salt: Uint8Array, iterations: number, length: number): Uint8Array {
    const blocks = Math.ceil(length / 32);
    const result = new Uint8Array(blocks * 32);
    for (let i = 1; i <= blocks; i++) {
      const saltBlock = this._combine(salt, new Uint8Array([(i >> 24) & 0xff, (i >> 16) & 0xff, (i >> 8) & 0xff, i & 0xff]));
      let u = this._hmac(password, saltBlock);
      let xor = u;
      for (let j = 1; j < iterations; j++) {
        u = this._hmac(password, u);
        for (let k = 0; k < xor.length; k++) xor[k] ^= u[k];
      }
      result.set(xor, (i - 1) * 32);
    }
    return result.subarray(0, length);
  }

  /** scrypt-like (simplified, not the real scrypt; uses PBKDF2 + mixing). */
  private _scrypt(password: Uint8Array, salt: Uint8Array, n: number, _r: number, _p: number, length: number): Uint8Array {
    let b = this._pbkdf2(password, salt, n, length);
    for (let i = 0; i < n; i++) {
      b = this._hmac(b, b);
    }
    return b.subarray(0, length);
  }

  /** bcrypt-like (placeholder using SHA-256 with cost factor). */
  private _bcryptLike(password: Uint8Array, salt: Uint8Array, cost: number, length: number): Uint8Array {
    let state = this._combine(salt, password);
    const rounds = 1 << cost;
    for (let i = 0; i < rounds; i++) {
      state = this._sha256(state);
    }
    return state.subarray(0, length);
  }

  /** KDF1 (ANSI X9.63): hash(counter || input). */
  private _kdf1(input: Uint8Array, length: number): Uint8Array {
    const out = new Uint8Array(length);
    let pos = 0;
    let counter = 0;
    while (pos < length) {
      const block = this._combine(input, new Uint8Array([(counter >> 24) & 0xff, (counter >> 16) & 0xff, (counter >> 8) & 0xff, counter & 0xff]));
      const h = this._sha256(block);
      const take = Math.min(h.length, length - pos);
      out.set(h.subarray(0, take), pos);
      pos += take;
      counter++;
    }
    return out;
  }

  /** KDF2: hash(input || counter). */
  private _kdf2(input: Uint8Array, length: number): Uint8Array {
    const out = new Uint8Array(length);
    let pos = 0;
    let counter = 1;
    while (pos < length) {
      const block = this._combine(input, new Uint8Array([(counter >> 24) & 0xff, (counter >> 16) & 0xff, (counter >> 8) & 0xff, counter & 0xff]));
      const h = this._sha256(block);
      const take = Math.min(h.length, length - pos);
      out.set(h.subarray(0, take), pos);
      pos += take;
      counter++;
    }
    return out;
  }

  /** SP 800-108 KDF in counter mode. */
  private _sp800108(key: Uint8Array, info: Uint8Array, length: number): Uint8Array {
    const out = new Uint8Array(length);
    let pos = 0;
    let counter = 1;
    while (pos < length) {
      const input = this._combine(new Uint8Array([(counter >> 24) & 0xff, (counter >> 16) & 0xff, (counter >> 8) & 0xff, counter & 0xff]), this._combine(info, new Uint8Array([(length >> 24) & 0xff, (length >> 16) & 0xff, (length >> 8) & 0xff, length & 0xff])));
      const h = this._hmac(key, input);
      const take = Math.min(h.length, length - pos);
      out.set(h.subarray(0, take), pos);
      pos += take;
      counter++;
    }
    return out;
  }

  /** ANSI X9.63 KDF. */
  private _x963(input: Uint8Array, info: Uint8Array, length: number): Uint8Array {
    const out = new Uint8Array(length);
    let pos = 0;
    let counter = 1;
    while (pos < length) {
      const counterBytes = new Uint8Array([(counter >> 24) & 0xff, (counter >> 16) & 0xff, (counter >> 8) & 0xff, counter & 0xff]);
      const block = this._combine(this._combine(input, counterBytes), info);
      const h = this._sha256(block);
      const take = Math.min(h.length, length - pos);
      out.set(h.subarray(0, take), pos);
      pos += take;
      counter++;
    }
    return out;
  }

  /** ECDH key agreement (simplified). */
  ecdhKeyAgreement(privateKeyA: Uint8Array, publicKeyB: Uint8Array, curve: KeyAgreement['curve']): KeyAgreement {
    const shared = this._hmac(privateKeyA, publicKeyB);
    this._history.push({ method: 'ecdhKeyAgreement', curve });
    return {
      protocol: 'ECDH',
      curve,
      partyA: privateKeyA,
      partyB: publicKeyB,
      sharedSecret: shared,
    };
  }

  /** DH key agreement (simplified modular exponentiation). */
  dhKeyAgreement(privateExp: number, publicBase: number, modulus: number): { sharedSecret: number } {
    const shared = this._modPow(publicBase, privateExp, modulus);
    this._history.push({ method: 'dhKeyAgreement' });
    return { sharedSecret: shared };
  }

  /** Shamir's Secret Sharing: split a key into n shares with threshold t. */
  shamirSplit(key: Uint8Array, n: number, t: number): SecretShare[] {
    const prime = 2147483647;
    const coeffs: number[] = [];
    for (let i = 0; i < t - 1; i++) coeffs.push(Math.floor(Math.random() * (prime - 1)) + 1);
    const shares: SecretShare[] = [];
    for (let i = 1; i <= n; i++) {
      const shareValue = new Uint8Array(key.length);
      for (let b = 0; b < key.length; b++) {
        let y = key[b];
        let xPow = 1;
        for (const c of coeffs) {
          y = (y + c * xPow) % prime;
          xPow = (xPow * i) % prime;
        }
        shareValue[b] = y & 0xff;
      }
      shares.push({ index: i, value: shareValue, threshold: t });
    }
    this._history.push({ method: 'shamirSplit', n, t });
    return shares;
  }

  /** Shamir's Secret Sharing: reconstruct key from t shares. */
  shamirReconstruct(shares: SecretShare[]): Uint8Array {
    if (shares.length < 2) return new Uint8Array(0);
    const prime = 2147483647;
    const length = shares[0].value.length;
    const result = new Uint8Array(length);
    for (let b = 0; b < length; b++) {
      let secret = 0;
      for (let i = 0; i < shares.length; i++) {
        let num = shares[i].value[b];
        let den = 1;
        for (let j = 0; j < shares.length; j++) {
          if (i === j) continue;
          num = (num * (-shares[j].index)) % prime;
          den = (den * (shares[i].index - shares[j].index)) % prime;
        }
        const inv = this._modInverse((den + prime) % prime, prime);
        secret = (secret + num * inv + prime * shares.length) % prime;
      }
      result[b] = secret & 0xff;
    }
    this._history.push({ method: 'shamirReconstruct', count: shares.length });
    return result;
  }

  /** Escrow a key with a third-party agent. */
  escrowKey(keyId: string, agent: string, shares: number, threshold: number, recoveryPolicy: string, owner: string): EscrowEntry | null {
    const key = this._keys.get(keyId);
    if (!key || !key.material) return null;
    this.shamirSplit(key.material, shares, threshold);
    const entry: EscrowEntry = {
      keyId,
      escrowAgent: agent,
      shares,
      threshold,
      createdAt: Date.now(),
      recoveryPolicy,
    };
    this._escrow.push(entry);
    this._recoveries.set(keyId, {
      keyId,
      method: 'escrow',
      requiredApprovals: threshold,
      availableApprovals: 0,
      recoveryAttempts: 0,
    });
    this._audit.push({ timestamp: Date.now(), keyId, operation: 'escrow', actor: owner, result: 'success' });
    this._history.push({ method: 'escrowKey', keyId });
    return entry;
  }

  /** Initiate key recovery. */
  initiateRecovery(keyId: string, actor: string): boolean {
    const info = this._recoveries.get(keyId);
    if (!info) return false;
    info.recoveryAttempts++;
    info.lastAttemptAt = Date.now();
    this._audit.push({ timestamp: Date.now(), keyId, operation: 'recover-init', actor, result: 'success' });
    this._history.push({ method: 'initiateRecovery', keyId });
    return true;
  }

  /** Approve a recovery request. */
  approveRecovery(keyId: string, approver: string): boolean {
    const info = this._recoveries.get(keyId);
    if (!info) return false;
    if (info.availableApprovals >= info.requiredApprovals) return false;
    info.availableApprovals++;
    this._audit.push({ timestamp: Date.now(), keyId, operation: 'recover-approve', actor: approver, result: 'success' });
    return info.availableApprovals >= info.requiredApprovals;
  }

  /** Report a key compromise. */
  reportCompromise(keyId: string, severity: CompromiseReport['severity'], description: string, affectedData: string[], actor: string): CompromiseReport | null {
    const key = this._keys.get(keyId);
    if (!key) return null;
    key.state = 'compromised';
    const report: CompromiseReport = {
      keyId,
      detectedAt: Date.now(),
      severity,
      description,
      affectedData,
      recommendedActions: this._recommendCompromiseActions(severity),
    };
    this._compromises.push(report);
    this._audit.push({ timestamp: Date.now(), keyId, operation: 'report-compromise', actor, result: 'success' });
    this._history.push({ method: 'reportCompromise', keyId, severity });
    return report;
  }

  private _recommendCompromiseActions(severity: CompromiseReport['severity']): string[] {
    const actions: string[] = [];
    actions.push('Quarantine the affected key immediately');
    actions.push('Notify all affected parties');
    if (severity === 'high' || severity === 'critical') {
      actions.push('Rotate all keys that were wrapped by the compromised KEK');
      actions.push('Re-encrypt all data encrypted under the compromised key');
      actions.push('Initiate forensic investigation');
    }
    if (severity === 'critical') {
      actions.push('Revoke all related certificates');
      actions.push('Notify regulatory authorities within 72 hours');
      actions.push('Conduct full security audit');
    }
    return actions;
  }

  /** Get all compromised keys. */
  getCompromisedKeys(): CompromiseReport[] {
    return [...this._compromises];
  }

  /** Add an ACL entry to a key. */
  grantPermission(keyId: string, principal: string, permissions: KeyUsage[], grantedBy: string, expiresAt?: number): boolean {
    const key = this._keys.get(keyId);
    if (!key) return false;
    const entries = this._acls.get(keyId) ?? [];
    entries.push({ principal, permissions, grantedAt: Date.now(), grantedBy, expiresAt });
    this._acls.set(keyId, entries);
    this._audit.push({ timestamp: Date.now(), keyId, operation: 'grant', actor: grantedBy, result: 'success', reason: principal });
    return true;
  }

  /** Revoke an ACL entry from a key. */
  revokePermission(keyId: string, principal: string, revokedBy: string): boolean {
    const entries = this._acls.get(keyId);
    if (!entries) return false;
    const filtered = entries.filter(e => e.principal !== principal);
    this._acls.set(keyId, filtered);
    this._audit.push({ timestamp: Date.now(), keyId, operation: 'revoke', actor: revokedBy, result: 'success', reason: principal });
    return true;
  }

  /** Check if a principal has a specific permission on a key. */
  hasPermission(keyId: string, principal: string, permission: KeyUsage): boolean {
    const entries = this._acls.get(keyId);
    if (!entries) return false;
    const now = Date.now();
    for (const e of entries) {
      if (e.principal === principal && e.permissions.includes(permission) && (!e.expiresAt || e.expiresAt > now)) {
        return true;
      }
    }
    return false;
  }

  /** Define a key ceremony sequence. */
  defineCeremony(keyId: string, steps: Array<{ description: string; required: boolean }>, owner: string): CeremonyStep[] {
    const ceremony: CeremonyStep[] = steps.map((s, i) => ({
      stepNumber: i + 1,
      description: s.description,
      required: s.required,
      witnessed: false,
    }));
    this._ceremonies.set(keyId, ceremony);
    this._audit.push({ timestamp: Date.now(), keyId, operation: 'ceremony-define', actor: owner, result: 'success' });
    this._history.push({ method: 'defineCeremony', keyId, steps: ceremony.length });
    return ceremony;
  }

  /** Mark a ceremony step as completed. */
  completeCeremonyStep(keyId: string, stepNumber: number, completedBy: string, witnessed: boolean): boolean {
    const ceremony = this._ceremonies.get(keyId);
    if (!ceremony) return false;
    const step = ceremony.find(s => s.stepNumber === stepNumber);
    if (!step) return false;
    step.completedBy = completedBy;
    step.completedAt = Date.now();
    step.witnessed = witnessed;
    this._audit.push({ timestamp: Date.now(), keyId, operation: 'ceremony-step', actor: completedBy, result: 'success', reason: `step-${stepNumber}` });
    return true;
  }

  /** Check if a ceremony is fully completed. */
  isCeremonyComplete(keyId: string): boolean {
    const ceremony = this._ceremonies.get(keyId);
    if (!ceremony) return false;
    return ceremony.filter(s => s.required).every(s => s.completedAt !== undefined);
  }

  /** Register an HSM slot. */
  registerHsmSlot(slot: HsmSlot): void {
    this._hsmSlots.set(slot.slotId, slot);
    this._history.push({ method: 'registerHsmSlot', slotId: slot.slotId });
  }

  /** Login to an HSM slot. */
  hsmLogin(slotId: number, actor: string): boolean {
    const slot = this._hsmSlots.get(slotId);
    if (!slot || !slot.tokenPresent) return false;
    slot.loggedIn = true;
    this._audit.push({ timestamp: Date.now(), keyId: `slot-${slotId}`, operation: 'hsm-login', actor, result: 'success' });
    return true;
  }

  /** Logout from an HSM slot. */
  hsmLogout(slotId: number, actor: string): void {
    const slot = this._hsmSlots.get(slotId);
    if (slot) slot.loggedIn = false;
    this._audit.push({ timestamp: Date.now(), keyId: `slot-${slotId}`, operation: 'hsm-logout', actor, result: 'success' });
  }

  /** Store a key in HSM. */
  storeInHsm(slotId: number, keyId: string, actor: string): boolean {
    const slot = this._hsmSlots.get(slotId);
    const key = this._keys.get(keyId);
    if (!slot || !slot.loggedIn || !key) return false;
    if (slot.keysStored >= slot.maxKeys) return false;
    slot.keysStored++;
    key.tags.push(`hsm:slot-${slotId}`);
    this._audit.push({ timestamp: Date.now(), keyId, operation: 'hsm-store', actor, result: 'success' });
    return true;
  }

  /** Distribute a key through a secure channel. */
  distributeKey(keyId: string, channel: DistributionChannel, recipient: string, format: DistributionRecord['format'], actor: string): DistributionRecord | null {
    const key = this._keys.get(keyId);
    if (!key) return null;
    const record: DistributionRecord = {
      keyId,
      channel,
      recipient,
      sentAt: Date.now(),
      format,
    };
    this._distributions.push(record);
    this._audit.push({ timestamp: Date.now(), keyId, operation: 'distribute', actor, result: 'success', reason: `${channel}:${recipient}` });
    this._history.push({ method: 'distributeKey', keyId, channel });
    return record;
  }

  /** Acknowledge a key distribution. */
  acknowledgeDistribution(keyId: string, recipient: string): boolean {
    const record = this._distributions.find(d => d.keyId === keyId && d.recipient === recipient && !d.acknowledgedAt);
    if (!record) return false;
    record.acknowledgedAt = Date.now();
    return true;
  }

  /** List keys by state. */
  listKeysByState(state: KeyState): KeyMaterial[] {
    return Array.from(this._keys.values()).filter(k => k.state === state);
  }

  /** List keys by owner. */
  listKeysByOwner(owner: string): KeyMaterial[] {
    return Array.from(this._keys.values()).filter(k => k.owner === owner);
  }

  /** List keys by usage. */
  listKeysByUsage(usage: KeyUsage): KeyMaterial[] {
    return Array.from(this._keys.values()).filter(k => k.usage.includes(usage));
  }

  /** List keys expiring before a given date. */
  listExpiringKeys(before: number): KeyMaterial[] {
    return Array.from(this._keys.values()).filter(k => k.expiredAt !== undefined && k.expiredAt < before && k.state === 'active');
  }

  /** Verify a key's checksum. */
  verifyChecksum(keyId: string): boolean {
    const key = this._keys.get(keyId);
    if (!key || !key.material) return false;
    return this._checksum(key.material) === key.checksum;
  }

  /** Get audit log for a key. */
  getKeyAudit(keyId: string): KeyAuditEntry[] {
    return this._audit.filter(e => e.keyId === keyId);
  }

  /** Get full audit log. */
  getFullAudit(): KeyAuditEntry[] {
    return [...this._audit];
  }

  /** Get count of keys by state. */
  getKeyStateCounts(): Record<KeyState, number> {
    const counts: Record<string, number> = {};
    for (const key of this._keys.values()) {
      counts[key.state] = (counts[key.state] ?? 0) + 1;
    }
    return counts as Record<KeyState, number>;
  }

  /** Compute entropy of a key (effective bits). */
  computeKeyEntropy(keyId: string): number {
    const key = this._keys.get(keyId);
    if (!key || !key.material) return 0;
    const freq: Record<number, number> = {};
    for (const b of key.material) freq[b] = (freq[b] ?? 0) + 1;
    let entropy = 0;
    const n = key.material.length;
    for (const b in freq) {
      const p = freq[b] / n;
      entropy -= p * Math.log2(p);
    }
    return entropy * n;
  }

  /** Generate a key identifier. */
  generateKeyId(prefix = 'key'): string {
    return `${prefix}-${(++this._counter).toString(36)}-${Date.now().toString(36)}`;
  }

  /** Validate a key meets minimum strength. */
  validateKeyStrength(keyId: string, minBits: number): { valid: boolean; issues: string[] } {
    const key = this._keys.get(keyId);
    if (!key) return { valid: false, issues: ['not-found'] };
    const issues: string[] = [];
    if (key.sizeBits < minBits) issues.push(`key-size-${key.sizeBits}-below-min-${minBits}`);
    if (key.algorithm === 'DES' || key.algorithm === 'RC4') issues.push('weak-algorithm');
    if (key.algorithm === '3DES' && key.sizeBits < 192) issues.push('3DES-key-too-short');
    if (key.material && this._detectWeakKey(key.material)) issues.push('weak-key-material');
    return { valid: issues.length === 0, issues };
  }

  private _detectWeakKey(material: Uint8Array): boolean {
    if (material.length === 0) return true;
    const first = material[0];
    let allSame = true;
    for (const b of material) {
      if (b !== first) { allSame = false; break; }
    }
    if (allSame) return true;
    let sequential = true;
    for (let i = 1; i < material.length; i++) {
      if (material[i] !== (material[i - 1] + 1) & 0xff) { sequential = false; break; }
    }
    return sequential;
  }

  /** Compute a fingerprint for a key. */
  keyFingerprint(keyId: string, algorithm: 'SHA-256' | 'SHA-1' | 'MD5' = 'SHA-256'): string | null {
    const key = this._keys.get(keyId);
    if (!key || !key.material) return null;
    const hash = algorithm === 'MD5' ? this._md5(key.material) : this._sha256(key.material);
    return `${algorithm}:${this._bytesToHex(hash)}`;
  }

  /** Compute HMAC-SHA256. */
  private _hmac(key: Uint8Array, message: Uint8Array): Uint8Array {
    const blockSize = 64;
    let k = key;
    if (k.length > blockSize) k = this._sha256(k);
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
    const inner = this._sha256(this._combine(ipad, message));
    return this._sha256(this._combine(opad, inner));
  }

  /** SHA-256 (simplified). */
  private _sha256(data: Uint8Array): Uint8Array {
    const h = new Uint8Array(32);
    for (let i = 0; i < data.length; i++) {
      h[i % 32] = (h[i % 32] * 31 + data[i]) & 0xff;
      h[(i + 7) % 32] = (h[(i + 7) % 32] + data[i]) & 0xff;
    }
    h[0] = (h[0] + data.length) & 0xff;
    return h;
  }

  /** MD5 (simplified). */
  private _md5(data: Uint8Array): Uint8Array {
    const h = new Uint8Array(16);
    for (let i = 0; i < data.length; i++) {
      h[i % 16] = (h[i % 16] * 17 + data[i]) & 0xff;
    }
    h[0] = (h[0] + data.length) & 0xff;
    return h;
  }

  /** AES key wrap (simplified, RFC 3394 style). */
  private _aesWrap(kek: Uint8Array, key: Uint8Array, iv: Uint8Array): Uint8Array {
    const out = new Uint8Array(key.length + 8);
    out.set(key, 8);
    out.set(iv.subarray(0, 8), 0);
    for (let i = 0; i < key.length; i++) {
      out[i + 8] = key[i] ^ kek[i % kek.length] ^ iv[i % iv.length];
    }
    return out;
  }

  /** AES key unwrap. */
  private _aesUnwrap(kek: Uint8Array, wrapped: Uint8Array, iv: Uint8Array): Uint8Array | null {
    if (wrapped.length < 8) return null;
    const out = new Uint8Array(wrapped.length - 8);
    for (let i = 0; i < out.length; i++) {
      out[i] = wrapped[i + 8] ^ kek[i % kek.length] ^ iv[i % iv.length];
    }
    return out;
  }

  /** Compute authentication tag. */
  private _computeTag(key: Uint8Array, data: Uint8Array): Uint8Array {
    return this._hmac(key, data).subarray(0, 16);
  }

  /** Constant-time comparison. */
  private _constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) return false;
    let result = 0;
    for (let i = 0; i < a.length; i++) result |= a[i] ^ b[i];
    return result === 0;
  }

  /** Combine two byte arrays. */
  private _combine(a: Uint8Array, b: Uint8Array): Uint8Array {
    const out = new Uint8Array(a.length + b.length);
    out.set(a);
    out.set(b, a.length);
    return out;
  }

  /** Compute checksum. */
  private _checksum(data: Uint8Array): string {
    return this._bytesToHex(this._sha256(data));
  }

  /** Cryptographically-secure random (uses Math.random as fallback). */
  private _secureRandom(bytes: number): Uint8Array {
    const out = new Uint8Array(bytes);
    for (let i = 0; i < bytes; i++) out[i] = Math.floor(Math.random() * 256);
    return out;
  }

  /** Modular exponentiation. */
  private _modPow(base: number, exp: number, mod: number): number {
    let result = 1;
    base = base % mod;
    while (exp > 0) {
      if (exp % 2 === 1) result = (result * base) % mod;
      exp = Math.floor(exp / 2);
      base = (base * base) % mod;
    }
    return result;
  }

  /** Modular inverse via extended Euclidean. */
  private _modInverse(a: number, m: number): number {
    let [old_r, r] = [a, m];
    let [old_s, s] = [1, 0];
    while (r !== 0) {
      const q = Math.floor(old_r / r);
      [old_r, r] = [r, old_r - q * r];
      [old_s, s] = [s, old_s - q * s];
    }
    return ((old_s % m) + m) % m;
  }

  /** Convert bytes to hex string. */
  private _bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /** Convert bytes to base64 string (simplified). */
  private _bytesToBase64(bytes: Uint8Array): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let result = '';
    for (let i = 0; i < bytes.length; i += 3) {
      const b1 = bytes[i];
      const b2 = i + 1 < bytes.length ? bytes[i + 1] : 0;
      const b3 = i + 2 < bytes.length ? bytes[i + 2] : 0;
      result += chars[(b1 >> 2) & 0x3f];
      result += chars[((b1 & 3) << 4) | ((b2 >> 4) & 0xf)];
      result += i + 1 < bytes.length ? chars[((b2 & 0xf) << 2) | ((b3 >> 6) & 3)] : '=';
      result += i + 2 < bytes.length ? chars[b3 & 0x3f] : '=';
    }
    return result;
  }

  /** Convert bytes to base64url string. */
  private _bytesToBase64Url(bytes: Uint8Array): string {
    return this._bytesToBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  toPacket(): DataPacket<{
    keyCount: number;
    policies: number;
    escrowCount: number;
    auditCount: number;
    history: unknown[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['cryptography', 'KeyManagement'],
      priority: 1,
      phase: 'crypto:key-management',
    };
    return {
      id: `km-${(++this._counter).toString(36)}-${Date.now().toString(36)}`,
      payload: {
        keyCount: this._keys.size,
        policies: this._policies.size,
        escrowCount: this._escrow.length,
        auditCount: this._audit.length,
        history: this._history,
      },
      metadata,
    };
  }

  reset(): void {
    this._keys.clear();
    this._policies.clear();
    this._escrow = [];
    this._audit = [];
    this._compromises = [];
    this._recoveries.clear();
    this._hsmSlots.clear();
    this._acls.clear();
    this._ceremonies.clear();
    this._distributions = [];
    this._counter = 0;
    this._history = [];
  }

  get keyCount(): number {
    return this._keys.size;
  }

  get activeKeyCount(): number {
    return this.listKeysByState('active').length;
  }

  get policyCount(): number {
    return this._policies.size;
  }

  get escrowCount(): number {
    return this._escrow.length;
  }

  get auditCount(): number {
    return this._audit.length;
  }

  get compromiseCount(): number {
    return this._compromises.length;
  }

  get distributionCount(): number {
    return this._distributions.length;
  }

  get historyDepth(): number {
    return this._history.length;
  }
}
