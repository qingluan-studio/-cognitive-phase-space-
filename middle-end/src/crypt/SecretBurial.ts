export interface BuriedSecret {
  id: string;
  content: string;
  encryptedContent: string;
  depth: number;
  encryptionLayers: number;
  buriedAt: number;
}

export interface ExhumationRequest {
  secretId: string;
  requester: string;
  authorized: boolean;
  requestedAt: number;
}

export class SecretBurial {
  private _secrets: Map<string, BuriedSecret> = new Map();
  private _requests: ExhumationRequest[] = [];
  private _authorized: Set<string> = new Set();
  private _maxDepth = 100;
  private _defaultLayers = 3;
  private _depthHashChain: Map<string, string> = new Map();
  private _steganographyCapacity: number = 0;
  private _layerEntropy: number[] = [];

  authorize(entity: string): void {
    this._authorized.add(entity);
  }

  revoke(entity: string): boolean {
    return this._authorized.delete(entity);
  }

  private _encrypt(text: string, layers: number): string {
    let result = text;
    for (let i = 0; i < layers; i++) {
      result = btoa(unescape(encodeURIComponent(result))).split('').reverse().join('');
    }
    return result;
  }

  private _decrypt(text: string, layers: number): string {
    let result = text;
    for (let i = 0; i < layers; i++) {
      result = decodeURIComponent(escape(atob(result.split('').reverse().join(''))));
    }
    return result;
  }

  private _computeDepthHash(content: string, depth: number): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      hash = ((hash << 5) - hash) + content.charCodeAt(i) + depth * 31;
      hash = hash & hash;
    }
    return `d${Math.abs(hash).toString(16)}`;
  }

  private _computeLayerEntropy(content: string): number {
    const freq: Record<string, number> = {};
    for (const ch of content) freq[ch] = (freq[ch] ?? 0) + 1;
    let entropy = 0;
    for (const count of Object.values(freq)) {
      const p = count / content.length;
      entropy -= p * Math.log2(p);
    }
    return entropy;
  }

  bury(id: string, content: string, depth: number): BuriedSecret {
    const clampedDepth = Math.min(depth, this._maxDepth);
    const layers = this._defaultLayers + Math.floor(clampedDepth / 20);
    const encryptedContent = this._encrypt(content, layers);
    const secret: BuriedSecret = {
      id,
      content,
      encryptedContent,
      depth: clampedDepth,
      encryptionLayers: layers,
      buriedAt: Date.now(),
    };
    this._secrets.set(id, secret);
    this._depthHashChain.set(id, this._computeDepthHash(content, clampedDepth));
    this._layerEntropy.push(this._computeLayerEntropy(encryptedContent));
    this._updateSteganographyCapacity();
    return secret;
  }

  private _updateSteganographyCapacity(): void {
    let total = 0;
    for (const s of this._secrets.values()) {
      total += s.encryptedContent.length;
    }
    this._steganographyCapacity = total / (this._secrets.size + 1);
  }

  requestExhumation(secretId: string, requester: string): ExhumationRequest {
    const authorized = this._authorized.has(requester) && this._secrets.has(secretId);
    const request: ExhumationRequest = {
      secretId,
      requester,
      authorized,
      requestedAt: Date.now(),
    };
    this._requests.push(request);
    if (this._requests.length > 200) this._requests.shift();
    return request;
  }

  exhume(secretId: string, requester: string): string | null {
    const request = this.requestExhumation(secretId, requester);
    if (!request.authorized) return null;
    const secret = this._secrets.get(secretId);
    if (!secret) return null;
    const hash = this._computeDepthHash(secret.content, secret.depth);
    if (this._depthHashChain.get(secretId) !== hash) return null;
    return this._decrypt(secret.encryptedContent, secret.encryptionLayers);
  }

  deepen(secretId: string, additionalDepth: number): boolean {
    const secret = this._secrets.get(secretId);
    if (!secret) return false;
    const newDepth = Math.min(secret.depth + additionalDepth, this._maxDepth);
    const addedLayers = Math.floor((newDepth - secret.depth) / 20);
    if (addedLayers > 0) {
      const plain = this._decrypt(secret.encryptedContent, secret.encryptionLayers);
      secret.encryptionLayers += addedLayers;
      secret.encryptedContent = this._encrypt(plain, secret.encryptionLayers);
      this._layerEntropy.push(this._computeLayerEntropy(secret.encryptedContent));
    }
    secret.depth = newDepth;
    this._depthHashChain.set(secretId, this._computeDepthHash(secret.content, newDepth));
    return true;
  }

  relocate(secretId: string, newDepth: number): boolean {
    const secret = this._secrets.get(secretId);
    if (!secret) return false;
    secret.depth = Math.min(newDepth, this._maxDepth);
    this._depthHashChain.set(secretId, this._computeDepthHash(secret.content, secret.depth));
    return true;
  }

  findDeepest(): BuriedSecret | null {
    let deepest: BuriedSecret | null = null;
    for (const s of this._secrets.values()) {
      if (!deepest || s.depth > deepest.depth) deepest = s;
    }
    return deepest;
  }

  getRequestLog(limit: number = 50): ExhumationRequest[] {
    return this._requests.slice(-limit);
  }

  getUnauthorizedRequests(): ExhumationRequest[] {
    return this._requests.filter(r => !r.authorized);
  }

  getAverageLayerEntropy(): number {
    if (this._layerEntropy.length === 0) return 0;
    return this._layerEntropy.reduce((a, b) => a + b, 0) / this._layerEntropy.length;
  }

  get secretCount(): number {
    return this._secrets.size;
  }

  get authorizedCount(): number {
    return this._authorized.size;
  }

  get steganographyCapacity(): number {
    return this._steganographyCapacity;
  }
}
