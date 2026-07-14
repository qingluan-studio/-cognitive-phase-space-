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
  challengeNonce: string;
}

export interface VerificationResult {
  assetId: string;
  isOwned: boolean;
  confidence: number;
  evidence: string[];
  verifiedAt: number;
  trustVector: { claim: number; token: number; signature: number; revocation: number };
}

const PRIME = 0x01000193;
const SEED = 0x811c9dc5;

export class SelfOwnershipVerifier {
  private _claims: Map<string, OwnershipClaim> = new Map();
  private _tokens: Map<string, OwnershipToken> = new Map();
  private _systemSignature: string;
  private _revokedAssets: Set<string> = new Set();
  private _challengeStore: Map<string, string> = new Map();
  private _verificationHistory: Map<string, number> = new Map();

  constructor(systemSignature: string) {
    this._systemSignature = systemSignature;
  }

  registerClaim(claim: OwnershipClaim): void {
    this._claims.set(claim.assetId, claim);
  }

  issueToken(assetId: string, validityMs: number): OwnershipToken | null {
    const claim = this._claims.get(assetId);
    if (!claim) return null;
    const nonce = this._generateNonce();
    this._challengeStore.set(assetId, nonce);
    const token: OwnershipToken = {
      assetId,
      ownerSignature: this._sign(`${claim.fingerprint}:${nonce}`),
      issuedAt: Date.now(),
      validUntil: Date.now() + validityMs,
      challengeNonce: nonce,
    };
    this._tokens.set(assetId, token);
    return token;
  }

  verify(assetId: string): VerificationResult {
    const evidence: string[] = [];
    const trustVector = { claim: 0, token: 0, signature: 0, revocation: 1 };
    const claim = this._claims.get(assetId);
    if (!claim) {
      return this._negativeResult(assetId, ['No ownership claim registered.'], trustVector);
    }
    trustVector.claim = Math.min(1, (Date.now() - claim.claimedAt) / 86_400_000);
    evidence.push(`Claim registered for ${claim.assetType} asset.`);

    if (this._revokedAssets.has(assetId)) {
      trustVector.revocation = 0;
      return this._negativeResult(assetId, [...evidence, 'Ownership has been revoked.'], trustVector);
    }

    const token = this._tokens.get(assetId);
    if (!token) {
      return this._negativeResult(assetId, [...evidence, 'No active ownership token.'], trustVector);
    }
    const lifespan = Math.max(1, token.validUntil - token.issuedAt);
    const elapsed = Date.now() - token.issuedAt;
    trustVector.token = Math.max(0, 1 - elapsed / lifespan);
    evidence.push('Active ownership token found.');

    if (Date.now() > token.validUntil) {
      trustVector.token = 0;
      return this._negativeResult(assetId, [...evidence, 'Ownership token expired.'], trustVector);
    }
    evidence.push('Ownership token within validity window.');

    const expected = this._sign(`${claim.fingerprint}:${token.challengeNonce}`);
    const similarity = this._hammingSimilarity(expected, token.ownerSignature);
    trustVector.signature = similarity;
    if (similarity < 0.95) {
      return this._negativeResult(assetId, [...evidence, `Signature mismatch (similarity=${similarity.toFixed(3)}).`], trustVector);
    }
    evidence.push('Owner signature matches system signature.');

    const confidence = this._combineTrust(trustVector);
    const priorVerifications = this._verificationHistory.get(assetId) ?? 0;
    this._verificationHistory.set(assetId, priorVerifications + 1);
    const stabilized = confidence * (1 + Math.log1p(priorVerifications) * 0.05);
    return {
      assetId,
      isOwned: true,
      confidence: Math.min(1, stabilized),
      evidence,
      verifiedAt: Date.now(),
      trustVector,
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

  get claimCount(): number { return this._claims.size; }
  get revokedCount(): number { return this._revokedAssets.size; }

  private _sign(payload: string): string {
    let hash = SEED;
    const salted = `${this._systemSignature}::${payload}`;
    for (let i = 0; i < salted.length; i++) {
      hash ^= salted.charCodeAt(i);
      hash = Math.imul(hash, PRIME);
    }
    const secondary = this._fnv1a(payload);
    return `sig-${(hash >>> 0).toString(16)}-${(secondary >>> 0).toString(16)}`;
  }

  private _fnv1a(input: string): number {
    let hash = SEED;
    for (let i = 0; i < input.length; i++) {
      hash ^= input.charCodeAt(i);
      hash = Math.imul(hash, PRIME);
    }
    return hash;
  }

  private _generateNonce(): string {
    return Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0') +
      Date.now().toString(16).slice(-6);
  }

  private _hammingSimilarity(a: string, b: string): number {
    if (a.length === 0 && b.length === 0) return 1;
    const len = Math.max(a.length, b.length);
    let matches = 0;
    for (let i = 0; i < len; i++) {
      if (a[i] === b[i]) matches++;
    }
    return matches / len;
  }

  private _combineTrust(tv: VerificationResult['trustVector']): number {
    const weights = { claim: 0.2, token: 0.3, signature: 0.4, revocation: 0.1 };
    return tv.claim * weights.claim + tv.token * weights.token + tv.signature * weights.signature + tv.revocation * weights.revocation;
  }

  private _negativeResult(assetId: string, evidence: string[], tv: VerificationResult['trustVector']): VerificationResult {
    return { assetId, isOwned: false, confidence: 0, evidence, verifiedAt: Date.now(), trustVector: tv };
  }
}
