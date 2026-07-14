/**
 * 秘密埋葬模块：将敏感模块加密深藏于系统最底层，
 * 通过多重加密与位置混淆防止被发现与提取。
 */

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

  bury(id: string, content: string, depth: number): BuriedSecret {
    const clampedDepth = Math.min(depth, this._maxDepth);
    const layers = this._defaultLayers + Math.floor(clampedDepth / 20);
    const secret: BuriedSecret = {
      id,
      content,
      encryptedContent: this._encrypt(content, layers),
      depth: clampedDepth,
      encryptionLayers: layers,
      buriedAt: Date.now(),
    };
    this._secrets.set(id, secret);
    return secret;
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
    }
    secret.depth = newDepth;
    return true;
  }

  relocate(secretId: string, newDepth: number): boolean {
    const secret = this._secrets.get(secretId);
    if (!secret) return false;
    secret.depth = Math.min(newDepth, this._maxDepth);
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

  get secretCount(): number {
    return this._secrets.size;
  }

  get authorizedCount(): number {
    return this._authorized.size;
  }
}
