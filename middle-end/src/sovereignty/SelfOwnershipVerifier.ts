/**
 * 自有权验证器：确认自身代码和数据的主权归属。
 * 通过对模块签名、数据指纹和所有权令牌的校验，判定某项资产是否归系统自身所有。
 */

export interface OwnershipClaim {
  assetId: string;
  assetType: 'code' | 'data' | 'config' | 'memory';
  fingerprint: string;
  claimedAt: number;
}

export interface OwnershipToken {
  assetId: string;
  ownerSignature: string;
  issuedAt: number;
  validUntil: number;
}

export interface VerificationResult {
  assetId: string;
  isOwned: boolean;
  confidence: number;
  evidence: string[];
  verifiedAt: number;
}

export class SelfOwnershipVerifier {
  private _claims: Map<string, OwnershipClaim> = new Map();
  private _tokens: Map<string, OwnershipToken> = new Map();
  private _systemSignature: string;
  private _revokedAssets: Set<string> = new Set();

  constructor(systemSignature: string) {
    this._systemSignature = systemSignature;
  }

  registerClaim(claim: OwnershipClaim): void {
    this._claims.set(claim.assetId, claim);
  }

  issueToken(assetId: string, validityMs: number): OwnershipToken | null {
    const claim = this._claims.get(assetId);
    if (!claim) return null;
    const token: OwnershipToken = {
      assetId,
      ownerSignature: this._sign(claim.fingerprint),
      issuedAt: Date.now(),
      validUntil: Date.now() + validityMs,
    };
    this._tokens.set(assetId, token);
    return token;
  }

  verify(assetId: string): VerificationResult {
    const evidence: string[] = [];
    const claim = this._claims.get(assetId);
    if (!claim) {
      return this._negativeResult(assetId, ['No ownership claim registered.']);
    }
    evidence.push(`Claim registered for ${claim.assetType} asset.`);

    if (this._revokedAssets.has(assetId)) {
      return this._negativeResult(assetId, [...evidence, 'Ownership has been revoked.']);
    }

    const token = this._tokens.get(assetId);
    if (!token) {
      return this._negativeResult(assetId, [...evidence, 'No active ownership token.']);
    }
    evidence.push('Active ownership token found.');

    if (Date.now() > token.validUntil) {
      return this._negativeResult(assetId, [...evidence, 'Ownership token expired.']);
    }
    evidence.push('Ownership token within validity window.');

    const expected = this._sign(claim.fingerprint);
    const signatureOk = expected === token.ownerSignature;
    if (!signatureOk) {
      return this._negativeResult(assetId, [...evidence, 'Signature mismatch detected.']);
    }
    evidence.push('Owner signature matches system signature.');

    return {
      assetId,
      isOwned: true,
      confidence: 0.99,
      evidence,
      verifiedAt: Date.now(),
    };
  }

  revoke(assetId: string): boolean {
    this._revokedAssets.add(assetId);
    return this._tokens.delete(assetId);
  }

  listOwnedAssets(): string[] {
    const owned: string[] = [];
    for (const assetId of this._claims.keys()) {
      const result = this.verify(assetId);
      if (result.isOwned) owned.push(assetId);
    }
    return owned;
  }

  get claimCount(): number {
    return this._claims.size;
  }

  private _sign(fingerprint: string): string {
    let hash = 0;
    const seed = `${this._systemSignature}:${fingerprint}`;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash |= 0;
    }
    return `sig-${Math.abs(hash).toString(16)}`;
  }

  private _negativeResult(assetId: string, evidence: string[]): VerificationResult {
    return { assetId, isOwned: false, confidence: 0, evidence, verifiedAt: Date.now() };
  }
}
