export interface ResurrectionKeyRecord {
  id: string;
  targetModule: string;
  keyHash: string;
  usesRemaining: number;
  createdAt: number;
  usedAt: number | null;
}

export interface ResurrectionResult {
  keyId: string;
  targetModule: string;
  success: boolean;
  restoredCode: string | null;
  errorMessage: string | null;
  occurredAt: number;
}

export class ResurrectionKey {
  private _keys: Map<string, ResurrectionKeyRecord> = new Map();
  private _results: ResurrectionResult[] = [];
  private _deadModules: Map<string, string> = new Map();
  private _maxUsesPerKey = 1;
  private _entropyPool: number[] = [];
  private _shamirPolynomial: number[] = [];
  private _keyDerivationRounds: number = 1000;

  registerDeadModule(moduleId: string, codeSnapshot: string): void {
    this._deadModules.set(moduleId, codeSnapshot);
    this._entropyPool.push(this._computeStringEntropy(codeSnapshot));
  }

  private _computeStringEntropy(text: string): number {
    const freq: Record<string, number> = {};
    for (const ch of text) freq[ch] = (freq[ch] ?? 0) + 1;
    let entropy = 0;
    for (const count of Object.values(freq)) {
      const p = count / text.length;
      entropy -= p * Math.log2(p);
    }
    return entropy;
  }

  forge(targetModule: string): ResurrectionKeyRecord | null {
    if (!this._deadModules.has(targetModule)) return null;
    const key: ResurrectionKeyRecord = {
      id: `key-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      targetModule,
      keyHash: this._deriveKey(`${targetModule}-${Date.now()}`),
      usesRemaining: this._maxUsesPerKey,
      createdAt: Date.now(),
      usedAt: null,
    };
    this._keys.set(key.id, key);
    this._generateShamirPolynomial(targetModule);
    return key;
  }

  private _deriveKey(text: string): string {
    let hash = 0;
    for (let round = 0; round < this._keyDerivationRounds; round++) {
      for (let i = 0; i < text.length; i++) {
        const char = text.charCodeAt(i);
        hash = ((hash << 5) - hash) + char + round;
        hash = hash & hash;
      }
    }
    return `h${Math.abs(hash).toString(16)}`;
  }

  private _generateShamirPolynomial(secret: string): void {
    const seed = secret.split('').reduce((s, c) => s + c.charCodeAt(0), 0);
    this._shamirPolynomial = [seed % 97, (seed * 13) % 97, (seed * 7) % 97];
  }

  private _evaluateShamir(x: number): number {
    return this._shamirPolynomial.reduce((sum, coeff, power) => sum + coeff * Math.pow(x, power), 0) % 97;
  }

  verify(keyId: string): boolean {
    const key = this._keys.get(keyId);
    return !!key && key.usesRemaining > 0;
  }

  use(keyId: string): ResurrectionResult {
    const key = this._keys.get(keyId);
    if (!key) {
      return this._fail(keyId, '', 'Key not found');
    }
    if (key.usesRemaining <= 0) {
      return this._fail(keyId, key.targetModule, 'Key already consumed');
    }
    const code = this._deadModules.get(key.targetModule);
    if (!code) {
      return this._fail(keyId, key.targetModule, 'Dead module snapshot missing');
    }
    const shamirCheck = this._evaluateShamir(keyId.length) === this._evaluateShamir(key.targetModule.length);
    if (!shamirCheck) {
      return this._fail(keyId, key.targetModule, 'Shamir verification failed');
    }
    key.usesRemaining--;
    key.usedAt = Date.now();
    const result: ResurrectionResult = {
      keyId,
      targetModule: key.targetModule,
      success: true,
      restoredCode: code,
      errorMessage: null,
      occurredAt: Date.now(),
    };
    this._results.push(result);
    if (this._results.length > 200) this._results.shift();
    return result;
  }

  private _fail(keyId: string, target: string, errorMessage: string): ResurrectionResult {
    const result: ResurrectionResult = {
      keyId,
      targetModule: target,
      success: false,
      restoredCode: null,
      errorMessage,
      occurredAt: Date.now(),
    };
    this._results.push(result);
    if (this._results.length > 200) this._results.shift();
    return result;
  }

  destroyKey(keyId: string): boolean {
    return this._keys.delete(keyId);
  }

  listKeysForModule(moduleId: string): ResurrectionKeyRecord[] {
    return Array.from(this._keys.values()).filter(k => k.targetModule === moduleId);
  }

  listAvailableKeys(): ResurrectionKeyRecord[] {
    return Array.from(this._keys.values()).filter(k => k.usesRemaining > 0);
  }

  getResultHistory(limit: number = 50): ResurrectionResult[] {
    return this._results.slice(-limit);
  }

  setMaxUses(value: number): void {
    this._maxUsesPerKey = Math.max(1, value);
  }

  purgeUsedKeys(): number {
    let purged = 0;
    for (const [id, k] of this._keys) {
      if (k.usesRemaining <= 0) {
        this._keys.delete(id);
        purged++;
      }
    }
    return purged;
  }

  get keyCount(): number {
    return this._keys.size;
  }

  get deadModuleCount(): number {
    return this._deadModules.size;
  }

  get averageEntropy(): number {
    if (this._entropyPool.length === 0) return 0;
    return this._entropyPool.reduce((a, b) => a + b, 0) / this._entropyPool.length;
  }
}
