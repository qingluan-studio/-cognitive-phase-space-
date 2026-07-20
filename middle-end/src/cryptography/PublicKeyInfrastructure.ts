import { DataPacket, PacketMeta } from '../shared/types';

/** Certificate types supported by the PKI. */
export type CertificateType =
  | 'CA'
  | 'root-CA'
  | 'intermediate-CA'
  | 'end-entity'
  | 'cross-cert'
  | 'self-signed'
  | 'attribute';

/** Certificate state in lifecycle. */
export type CertificateState =
  | 'pending'
  | 'issued'
  | 'active'
  | 'suspended'
  | 'revoked'
  | 'expired'
  | 'unknown';

/** Revocation reason codes (CRLReason from RFC 5280). */
export type RevocationReason =
  | 'unspecified'
  | 'key-compromise'
  | 'ca-compromise'
  | 'affiliation-changed'
  | 'superseded'
  | 'cessation-of-operation'
  | 'certificate-hold'
  | 'remove-from-crl'
  | 'privilege-withdrawn'
  | 'aa-compromise';

/** Key usage flags (RFC 5280 KeyUsage). */
export type KeyUsage =
  | 'digitalSignature'
  | 'nonRepudiation'
  | 'keyEncipherment'
  | 'dataEncipherment'
  | 'keyAgreement'
  | 'keyCertSign'
  | 'crlSign'
  | 'encipherOnly'
  | 'decipherOnly';

/** Extended key usage OIDs (common ones). */
export type ExtendedKeyUsage =
  | 'serverAuth'
  | 'clientAuth'
  | 'codeSigning'
  | 'emailProtection'
  | 'timeStamping'
  | 'OCSPSigning'
  | 'smartCardLogon'
  | 'msEfs';

/** Signature algorithm. */
export type SignatureAlgorithm =
  | 'RSA-SHA1'
  | 'RSA-SHA256'
  | 'RSA-SHA384'
  | 'RSA-SHA512'
  | 'ECDSA-SHA1'
  | 'ECDSA-SHA256'
  | 'ECDSA-SHA384'
  | 'ECDSA-SHA512'
  | 'Ed25519'
  | 'Ed448'
  | 'RSASSA-PSS';

/** Public key algorithm. */
export type PublicKeyAlgorithm = 'RSA' | 'DSA' | 'ECDSA' | 'Ed25519' | 'Ed448' | 'X25519' | 'X448';

/** Subject/Issuer distinguished name component. */
export interface DistinguishedName {
  commonName?: string;
  organization?: string;
  organizationalUnit?: string;
  locality?: string;
  state?: string;
  country?: string;
  emailAddress?: string;
  serialNumber?: string;
  domainComponent?: string;
  userId?: string;
}

/** Certificate extension. */
export interface CertificateExtension {
  oid: string;
  name: string;
  critical: boolean;
  value: string;
}

/** Certificate subject alternative names. */
export interface SubjectAltName {
  dnsNames: string[];
  ipAddresses: string[];
  emailAddresses: string[];
  uris: string[];
  directoryNames: DistinguishedName[];
}

/** Certificate Policies extension. */
export interface CertificatePolicy {
  oid: string;
  qualifiers: string[];
  cpsUris: string[];
  userNotices: string[];
}

/** Authority key identifier. */
export interface AuthorityKeyIdentifier {
  keyIdentifier?: string;
  authorityCertIssuer?: DistinguishedName;
  authorityCertSerialNumber?: string;
}

/** Basic constraints extension. */
export interface BasicConstraints {
  isCA: boolean;
  pathLenConstraint?: number;
}

/** Certificate descriptor (X.509-like). */
export interface Certificate {
  version: number;
  serialNumber: string;
  signatureAlgorithm: SignatureAlgorithm;
  issuer: DistinguishedName;
  subject: DistinguishedName;
  validFrom: number;
  validTo: number;
  publicKeyAlgorithm: PublicKeyAlgorithm;
  publicKey: Uint8Array;
  publicKeySizeBits: number;
  signature: Uint8Array;
  keyUsage: KeyUsage[];
  extendedKeyUsage: ExtendedKeyUsage[];
  subjectAltName: SubjectAltName;
  basicConstraints: BasicConstraints;
  authorityKeyIdentifier?: AuthorityKeyIdentifier;
  subjectKeyIdentifier?: string;
  crlDistributionPoints: string[];
  ocspEndpoints: string[];
  policies: CertificatePolicy[];
  extensions: CertificateExtension[];
  fingerprint: string;
  fingerprintAlgorithm: 'SHA-1' | 'SHA-256' | 'SHA-384';
  state: CertificateState;
  type: CertificateType;
  issuedAt: number;
  issuedBy?: string;
  parentCAId?: string;
}

/** Certificate signing request (CSR) descriptor. */
export interface CertificateSigningRequest {
  subject: DistinguishedName;
  publicKeyAlgorithm: PublicKeyAlgorithm;
  publicKey: Uint8Array;
  signature: Uint8Array;
  signatureAlgorithm: SignatureAlgorithm;
  attributes: CertificateExtension[];
  challengePassword?: string;
  extensionRequests: CertificateExtension[];
  createdAt: number;
  requestedValidityDays: number;
  requestedKeyUsage: KeyUsage[];
  requestedExtendedKeyUsage: ExtendedKeyUsage[];
  requestedSan?: SubjectAltName;
}

/** Certificate revocation list (CRL) entry. */
export interface CrlEntry {
  serialNumber: string;
  revocationDate: number;
  reason: RevocationReason;
  invalidityDate?: number;
  issuer?: DistinguishedName;
}

/** Certificate revocation list. */
export interface CertificateRevocationList {
  issuer: DistinguishedName;
  thisUpdate: number;
  nextUpdate: number;
  revokedCertificates: CrlEntry[];
  crlNumber: number;
  signatureAlgorithm: SignatureAlgorithm;
  signature: Uint8Array;
  delta?: boolean;
  baseCrlNumber?: number;
}

/** OCSP response status. */
export type OcspStatus = 'good' | 'revoked' | 'unknown';

/** OCSP single response. */
export interface OcspSingleResponse {
  serialNumber: string;
  status: OcspStatus;
  thisUpdate: number;
  nextUpdate: number;
  revocationTime?: number;
  revocationReason?: RevocationReason;
}

/** OCSP response. */
export interface OcspResponse {
  responderId: DistinguishedName;
  producedAt: number;
  responses: OcspSingleResponse[];
  signatureAlgorithm: SignatureAlgorithm;
  signature: Uint8Array;
  responseStatus: 'successful' | 'malformedRequest' | 'internalError' | 'tryLater' | 'sigRequired' | 'unauthorized';
}

/** Trust anchor descriptor. */
export interface TrustAnchor {
  certificate?: Certificate;
  subject: DistinguishedName;
  publicKey: Uint8Array;
  publicKeyAlgorithm: PublicKeyAlgorithm;
  nameConstraints?: NameConstraints;
  trustedFor: KeyUsage[];
  trustedAt: number;
}

/** Name constraints extension. */
export interface NameConstraints {
  permittedSubtrees?: string[];
  excludedSubtrees?: string[];
  minimumBase?: number;
  maximumBase?: number;
}

/** Certificate chain validation result. */
export interface ChainValidationResult {
  valid: boolean;
  trustedAnchor: TrustAnchor | null;
  chain: Certificate[];
  errors: string[];
  warnings: string[];
  policiesApplied: string[];
  evaluatedAt: number;
}

/** Certificate path building state. */
export interface PathBuildingState {
  partialChain: Certificate[];
  visited: Set<string>;
  crossCertsUsed: number;
  policiesConsidered: string[];
  lastError?: string;
}

/** PKI audit log entry. */
export interface PkiAuditEntry {
  timestamp: number;
  operation: string;
  actor: string;
  certificateSerial?: string;
  result: 'success' | 'failure' | 'denied';
  reason?: string;
}

/** CA configuration. */
export interface CaConfig {
  name: string;
  subject: DistinguishedName;
  publicKeyAlgorithm: PublicKeyAlgorithm;
  signatureAlgorithm: SignatureAlgorithm;
  keySizeBits: number;
  validityYears: number;
  crlUpdateIntervalDays: number;
  ocspResponderUrl: string;
  crlDistributionUrl: string;
  policyOids: string[];
  pathLenConstraint?: number;
}

/** PKI: certificate issuance, validation, revocation, CRL/OCSP, trust chains. */
export class PublicKeyInfrastructure {
  private _certificates: Map<string, Certificate> = new Map();
  private _csrs: Map<string, CertificateSigningRequest> = new Map();
  private _crls: Map<string, CertificateRevocationList> = new Map();
  private _trustAnchors: Map<string, TrustAnchor> = new Map();
  private _cas: Map<string, CaConfig> = new Map();
  private _caKeys: Map<string, { privateKey: Uint8Array; publicKey: Uint8Array }> = new Map();
  private _audit: PkiAuditEntry[] = [];
  private _counter = 0;
  private _history: unknown[] = [];

  /** Create a new Certificate Authority. */
  createCA(config: CaConfig, owner: string): { caId: string; rootCertificate: Certificate } {
    const caId = `ca-${(++this._counter).toString(36)}-${Date.now().toString(36)}`;
    this._cas.set(caId, config);
    const keyPair = this._generateKeyPair(config.publicKeyAlgorithm, config.keySizeBits);
    this._caKeys.set(caId, keyPair);
    const now = Date.now();
    const rootCert: Certificate = {
      version: 3,
      serialNumber: this._generateSerial(),
      signatureAlgorithm: config.signatureAlgorithm,
      issuer: config.subject,
      subject: config.subject,
      validFrom: now,
      validTo: now + config.validityYears * 365 * 86_400_000,
      publicKeyAlgorithm: config.publicKeyAlgorithm,
      publicKey: keyPair.publicKey,
      publicKeySizeBits: config.keySizeBits,
      signature: this._sign(keyPair.privateKey, keyPair.publicKey),
      keyUsage: ['keyCertSign', 'crlSign'],
      extendedKeyUsage: [],
      subjectAltName: { dnsNames: [], ipAddresses: [], emailAddresses: [], uris: [], directoryNames: [] },
      basicConstraints: { isCA: true, pathLenConstraint: config.pathLenConstraint },
      crlDistributionPoints: [config.crlDistributionUrl],
      ocspEndpoints: [config.ocspResponderUrl],
      policies: config.policyOids.map(oid => ({ oid, qualifiers: [], cpsUris: [], userNotices: [] })),
      extensions: [],
      fingerprint: this._computeFingerprint(keyPair.publicKey, 'SHA-256'),
      fingerprintAlgorithm: 'SHA-256',
      state: 'active',
      type: 'root-CA',
      issuedAt: now,
      issuedBy: owner,
    };
    this._certificates.set(rootCert.serialNumber, rootCert);
    this._trustAnchors.set(caId, {
      certificate: rootCert,
      subject: config.subject,
      publicKey: keyPair.publicKey,
      publicKeyAlgorithm: config.publicKeyAlgorithm,
      trustedFor: ['keyCertSign', 'crlSign'],
      trustedAt: now,
    });
    this._audit.push({ timestamp: now, operation: 'create-ca', actor: owner, certificateSerial: rootCert.serialNumber, result: 'success' });
    this._history.push({ method: 'createCA', caId, serial: rootCert.serialNumber });
    return { caId, rootCertificate: rootCert };
  }

  /** Submit a CSR for certification. */
  submitCSR(csr: CertificateSigningRequest, actor: string): string {
    const csrId = `csr-${(++this._counter).toString(36)}-${Date.now().toString(36)}`;
    this._csrs.set(csrId, csr);
    this._audit.push({ timestamp: Date.now(), operation: 'submit-csr', actor, result: 'success', reason: csrId });
    this._history.push({ method: 'submitCSR', csrId });
    return csrId;
  }

  /** Issue a certificate from a CSR. */
  issueCertificate(caId: string, csrId: string, validityDays: number, actor: string): Certificate | null {
    const ca = this._cas.get(caId);
    const csr = this._csrs.get(csrId);
    const caKeys = this._caKeys.get(caId);
    if (!ca || !csr || !caKeys) {
      this._audit.push({ timestamp: Date.now(), operation: 'issue-cert', actor, result: 'failure', reason: 'ca-or-csr-not-found' });
      return null;
    }
    const now = Date.now();
    const cert: Certificate = {
      version: 3,
      serialNumber: this._generateSerial(),
      signatureAlgorithm: ca.signatureAlgorithm,
      issuer: ca.subject,
      subject: csr.subject,
      validFrom: now,
      validTo: now + validityDays * 86_400_000,
      publicKeyAlgorithm: csr.publicKeyAlgorithm,
      publicKey: csr.publicKey,
      publicKeySizeBits: csr.publicKey.length * 8,
      signature: this._sign(caKeys.privateKey, csr.publicKey),
      keyUsage: csr.requestedKeyUsage,
      extendedKeyUsage: csr.requestedExtendedKeyUsage,
      subjectAltName: csr.requestedSan ?? { dnsNames: [], ipAddresses: [], emailAddresses: [], uris: [], directoryNames: [] },
      basicConstraints: { isCA: false },
      crlDistributionPoints: [ca.crlDistributionUrl],
      ocspEndpoints: [ca.ocspResponderUrl],
      policies: ca.policyOids.map(oid => ({ oid, qualifiers: [], cpsUris: [], userNotices: [] })),
      extensions: csr.extensionRequests,
      fingerprint: this._computeFingerprint(csr.publicKey, 'SHA-256'),
      fingerprintAlgorithm: 'SHA-256',
      state: 'issued',
      type: 'end-entity',
      issuedAt: now,
      issuedBy: actor,
      parentCAId: caId,
    };
    this._certificates.set(cert.serialNumber, cert);
    this._csrs.delete(csrId);
    cert.state = 'active';
    this._audit.push({ timestamp: now, operation: 'issue-cert', actor, certificateSerial: cert.serialNumber, result: 'success' });
    this._history.push({ method: 'issueCertificate', serial: cert.serialNumber });
    return cert;
  }

  /** Issue a cross-certificate to another CA. */
  issueCrossCertificate(caId: string, childSubject: DistinguishedName, childPublicKey: Uint8Array, childPublicKeyAlgorithm: PublicKeyAlgorithm, pathLenConstraint: number, validityDays: number, actor: string): Certificate | null {
    const ca = this._cas.get(caId);
    const caKeys = this._caKeys.get(caId);
    if (!ca || !caKeys) return null;
    const now = Date.now();
    const cert: Certificate = {
      version: 3,
      serialNumber: this._generateSerial(),
      signatureAlgorithm: ca.signatureAlgorithm,
      issuer: ca.subject,
      subject: childSubject,
      validFrom: now,
      validTo: now + validityDays * 86_400_000,
      publicKeyAlgorithm: childPublicKeyAlgorithm,
      publicKey: childPublicKey,
      publicKeySizeBits: childPublicKey.length * 8,
      signature: this._sign(caKeys.privateKey, childPublicKey),
      keyUsage: ['keyCertSign', 'crlSign'],
      extendedKeyUsage: [],
      subjectAltName: { dnsNames: [], ipAddresses: [], emailAddresses: [], uris: [], directoryNames: [] },
      basicConstraints: { isCA: true, pathLenConstraint },
      crlDistributionPoints: [ca.crlDistributionUrl],
      ocspEndpoints: [ca.ocspResponderUrl],
      policies: ca.policyOids.map(oid => ({ oid, qualifiers: [], cpsUris: [], userNotices: [] })),
      extensions: [],
      fingerprint: this._computeFingerprint(childPublicKey, 'SHA-256'),
      fingerprintAlgorithm: 'SHA-256',
      state: 'active',
      type: 'cross-cert',
      issuedAt: now,
      issuedBy: actor,
      parentCAId: caId,
    };
    this._certificates.set(cert.serialNumber, cert);
    this._audit.push({ timestamp: now, operation: 'issue-cross-cert', actor, certificateSerial: cert.serialNumber, result: 'success' });
    this._history.push({ method: 'issueCrossCertificate', serial: cert.serialNumber });
    return cert;
  }

  /** Suspend a certificate temporarily. */
  suspendCertificate(serialNumber: string, actor: string, reason: string): boolean {
    const cert = this._certificates.get(serialNumber);
    if (!cert) return false;
    if (cert.state !== 'active') return false;
    cert.state = 'suspended';
    this._audit.push({ timestamp: Date.now(), operation: 'suspend-cert', actor, certificateSerial: serialNumber, result: 'success', reason });
    this._history.push({ method: 'suspendCertificate', serialNumber });
    return true;
  }

  /** Reinstate a suspended certificate. */
  reinstateCertificate(serialNumber: string, actor: string): boolean {
    const cert = this._certificates.get(serialNumber);
    if (!cert) return false;
    if (cert.state !== 'suspended') return false;
    cert.state = 'active';
    this._audit.push({ timestamp: Date.now(), operation: 'reinstate-cert', actor, certificateSerial: serialNumber, result: 'success' });
    return true;
  }

  /** Revoke a certificate. */
  revokeCertificate(caId: string, serialNumber: string, reason: RevocationReason, actor: string, invalidityDate?: number): boolean {
    const cert = this._certificates.get(serialNumber);
    if (!cert) return false;
    cert.state = 'revoked';
    const crl = this._crls.get(caId);
    if (crl) {
      crl.revokedCertificates.push({
        serialNumber,
        revocationDate: Date.now(),
        reason,
        invalidityDate,
      });
    }
    this._audit.push({ timestamp: Date.now(), operation: 'revoke-cert', actor, certificateSerial: serialNumber, result: 'success', reason });
    this._history.push({ method: 'revokeCertificate', serialNumber, reason });
    return true;
  }

  /** Generate a CRL for a CA. */
  generateCRL(caId: string, actor: string): CertificateRevocationList | null {
    const ca = this._cas.get(caId);
    const caKeys = this._caKeys.get(caId);
    const oldCrl = this._crls.get(caId);
    if (!ca || !caKeys) return null;
    const now = Date.now();
    const crlNumber = (oldCrl?.crlNumber ?? 0) + 1;
    const revokedCertificates = oldCrl?.revokedCertificates ?? [];
    const crl: CertificateRevocationList = {
      issuer: ca.subject,
      thisUpdate: now,
      nextUpdate: now + ca.crlUpdateIntervalDays * 86_400_000,
      revokedCertificates,
      crlNumber,
      signatureAlgorithm: ca.signatureAlgorithm,
      signature: this._sign(caKeys.privateKey, new Uint8Array([crlNumber & 0xff])),
    };
    this._crls.set(caId, crl);
    this._audit.push({ timestamp: now, operation: 'generate-crl', actor, result: 'success', reason: `crl-${crlNumber}` });
    this._history.push({ method: 'generateCRL', caId, crlNumber });
    return crl;
  }

  /** Generate a delta CRL (only changes since base CRL). */
  generateDeltaCRL(caId: string, baseCrlNumber: number, actor: string): CertificateRevocationList | null {
    const ca = this._cas.get(caId);
    const caKeys = this._caKeys.get(caId);
    if (!ca || !caKeys) return null;
    const now = Date.now();
    const fullCrl = this._crls.get(caId);
    const revokedCertificates = (fullCrl?.revokedCertificates ?? []).filter(e => e.revocationDate > now - 7 * 86_400_000);
    const delta: CertificateRevocationList = {
      issuer: ca.subject,
      thisUpdate: now,
      nextUpdate: now + ca.crlUpdateIntervalDays * 86_400_000,
      revokedCertificates,
      crlNumber: (fullCrl?.crlNumber ?? 0) + 1,
      signatureAlgorithm: ca.signatureAlgorithm,
      signature: this._sign(caKeys.privateKey, new Uint8Array([now & 0xff])),
      delta: true,
      baseCrlNumber,
    };
    this._audit.push({ timestamp: now, operation: 'generate-delta-crl', actor, result: 'success' });
    return delta;
  }

  /** Check if a certificate is revoked via CRL. */
  isRevoked(serialNumber: string, caId: string): { revoked: boolean; reason?: RevocationReason; date?: number } {
    const crl = this._crls.get(caId);
    if (!crl) return { revoked: false };
    const entry = crl.revokedCertificates.find(e => e.serialNumber === serialNumber);
    if (entry) {
      return { revoked: true, reason: entry.reason, date: entry.revocationDate };
    }
    return { revoked: false };
  }

  /** Generate an OCSP response for given certificate serials. */
  generateOCSPResponse(caId: string, serialNumbers: string[], actor: string): OcspResponse | null {
    const ca = this._cas.get(caId);
    const caKeys = this._caKeys.get(caId);
    if (!ca || !caKeys) return null;
    const now = Date.now();
    const responses: OcspSingleResponse[] = [];
    for (const sn of serialNumbers) {
      const cert = this._certificates.get(sn);
      if (!cert) {
        responses.push({ serialNumber: sn, status: 'unknown', thisUpdate: now, nextUpdate: now + 86_400_000 });
      } else if (cert.state === 'revoked') {
        const crl = this._crls.get(caId);
        const entry = crl?.revokedCertificates.find(e => e.serialNumber === sn);
        responses.push({
          serialNumber: sn,
          status: 'revoked',
          thisUpdate: now,
          nextUpdate: now + 86_400_000,
          revocationTime: entry?.revocationDate,
          revocationReason: entry?.reason,
        });
      } else if (cert.validTo < now) {
        responses.push({ serialNumber: sn, status: 'unknown', thisUpdate: now, nextUpdate: now + 86_400_000 });
      } else {
        responses.push({ serialNumber: sn, status: 'good', thisUpdate: now, nextUpdate: now + 86_400_000 });
      }
    }
    const response: OcspResponse = {
      responderId: ca.subject,
      producedAt: now,
      responses,
      signatureAlgorithm: ca.signatureAlgorithm,
      signature: this._sign(caKeys.privateKey, new Uint8Array(serialNumbers.join('').split('').map(c => c.charCodeAt(0)))),
      responseStatus: 'successful',
    };
    this._audit.push({ timestamp: now, operation: 'ocsp-response', actor, result: 'success', reason: `${serialNumbers.length} certs` });
    this._history.push({ method: 'generateOCSPResponse', count: serialNumbers.length });
    return response;
  }

  /** Validate a certificate chain. */
  validateChain(certificate: Certificate, intermediateCerts: Certificate[], trustedAnchors: TrustAnchor[]): ChainValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const now = Date.now();
    const chain: Certificate[] = [certificate];
    let current = certificate;
    while (!this._isSelfSigned(current)) {
      let issuer: Certificate | undefined;
      for (const inter of intermediateCerts) {
        if (inter.subject === current.issuer) {
          issuer = inter;
          break;
        }
      }
      if (!issuer) {
        const anchor = trustedAnchors.find(a => a.subject === current.issuer);
        if (anchor) {
          if (!this._verifySignature(anchor.publicKey, current.signature, current.publicKey)) {
            errors.push('signature-verification-failed');
          }
          if (current.validFrom > now) errors.push('not-yet-valid');
          if (current.validTo < now) errors.push('expired');
          if (current.state === 'revoked') errors.push('revoked');
          if (!current.basicConstraints.isCA && chain.length > 1) {
            errors.push('non-ca-in-chain');
          }
          return {
            valid: errors.length === 0,
            trustedAnchor: anchor,
            chain,
            errors,
            warnings,
            policiesApplied: current.policies.map(p => p.oid),
            evaluatedAt: now,
          };
        }
        errors.push('no-issuer-found');
        return { valid: false, trustedAnchor: null, chain, errors, warnings, policiesApplied: [], evaluatedAt: now };
      }
      if (!issuer.basicConstraints.isCA) errors.push('issuer-not-ca');
      if (issuer.basicConstraints.pathLenConstraint !== undefined && chain.length - 1 > issuer.basicConstraints.pathLenConstraint) {
        errors.push('path-length-exceeded');
      }
      if (!this._verifySignature(issuer.publicKey, current.signature, current.publicKey)) {
        errors.push('signature-verification-failed');
      }
      if (current.validFrom > now) errors.push('not-yet-valid');
      if (current.validTo < now) errors.push('expired');
      if (current.state === 'revoked') errors.push('revoked');
      chain.push(issuer);
      current = issuer;
    }
    const anchor = trustedAnchors.find(a => a.subject === current.subject);
    if (!anchor) errors.push('self-signed-not-trusted');
    return {
      valid: errors.length === 0,
      trustedAnchor: anchor ?? null,
      chain,
      errors,
      warnings,
      policiesApplied: chain.flatMap(c => c.policies.map(p => p.oid)),
      evaluatedAt: now,
    };
  }

  /** Build a certificate path from a target to a trusted anchor. */
  buildPath(target: Certificate, availableCerts: Certificate[], trustedAnchors: TrustAnchor[], maxDepth = 10): Certificate[] | null {
    const state: PathBuildingState = { partialChain: [target], visited: new Set([target.serialNumber]), crossCertsUsed: 0, policiesConsidered: [] };
    const result = this._buildPathDFS(state, availableCerts, trustedAnchors, maxDepth);
    if (result) {
      this._history.push({ method: 'buildPath', depth: result.length });
      return result;
    }
    return null;
  }

  private _buildPathDFS(state: PathBuildingState, availableCerts: Certificate[], trustedAnchors: TrustAnchor[], maxDepth: number): Certificate[] | null {
    if (state.partialChain.length > maxDepth) return null;
    const current = state.partialChain[state.partialChain.length - 1];
    if (this._isSelfSigned(current)) {
      const anchor = trustedAnchors.find(a => a.subject === current.subject);
      if (anchor) return [...state.partialChain];
    }
    for (const anchor of trustedAnchors) {
      if (anchor.subject === current.issuer) {
        if (this._verifySignature(anchor.publicKey, current.signature, current.publicKey)) {
          return [...state.partialChain];
        }
      }
    }
    for (const cert of availableCerts) {
      if (state.visited.has(cert.serialNumber)) continue;
      if (cert.subject === current.issuer && cert.basicConstraints.isCA) {
        state.partialChain.push(cert);
        state.visited.add(cert.serialNumber);
        const result = this._buildPathDFS(state, availableCerts, trustedAnchors, maxDepth);
        if (result) return result;
        state.partialChain.pop();
        state.visited.delete(cert.serialNumber);
      }
    }
    return null;
  }

  /** Add a trust anchor manually. */
  addTrustAnchor(anchor: TrustAnchor, actor: string): void {
    const id = `anchor-${(++this._counter).toString(36)}-${Date.now().toString(36)}`;
    this._trustAnchors.set(id, anchor);
    this._audit.push({ timestamp: Date.now(), operation: 'add-trust-anchor', actor, result: 'success' });
    this._history.push({ method: 'addTrustAnchor' });
  }

  /** Remove a trust anchor. */
  removeTrustAnchor(anchorId: string, actor: string): boolean {
    const existed = this._trustAnchors.delete(anchorId);
    if (existed) {
      this._audit.push({ timestamp: Date.now(), operation: 'remove-trust-anchor', actor, result: 'success' });
    }
    return existed;
  }

  /** List all trust anchors. */
  listTrustAnchors(): TrustAnchor[] {
    return Array.from(this._trustAnchors.values());
  }

  /** Get a certificate by serial. */
  getCertificate(serialNumber: string): Certificate | null {
    return this._certificates.get(serialNumber) ?? null;
  }

  /** List certificates by subject. */
  listCertificatesBySubject(subject: DistinguishedName): Certificate[] {
    return Array.from(this._certificates.values()).filter(c => JSON.stringify(c.subject) === JSON.stringify(subject));
  }

  /** List certificates by issuer. */
  listCertificatesByIssuer(issuer: DistinguishedName): Certificate[] {
    return Array.from(this._certificates.values()).filter(c => JSON.stringify(c.issuer) === JSON.stringify(issuer));
  }

  /** List certificates by state. */
  listCertificatesByState(state: CertificateState): Certificate[] {
    return Array.from(this._certificates.values()).filter(c => c.state === state);
  }

  /** List expired certificates. */
  listExpiredCertificates(): Certificate[] {
    const now = Date.now();
    return Array.from(this._certificates.values()).filter(c => c.validTo < now);
  }

  /** List expiring certificates (within N days). */
  listExpiringCertificates(days: number): Certificate[] {
    const now = Date.now();
    const threshold = now + days * 86_400_000;
    return Array.from(this._certificates.values()).filter(c => c.validTo > now && c.validTo < threshold);
  }

  /** Verify a certificate's signature. */
  verifyCertificateSignature(cert: Certificate, issuerPublicKey: Uint8Array): boolean {
    return this._verifySignature(issuerPublicKey, cert.signature, cert.publicKey);
  }

  /** Check if a certificate is self-signed. */
  isSelfSigned(cert: Certificate): boolean {
    return this._isSelfSigned(cert);
  }

  /** Compute fingerprint with given algorithm. */
  computeFingerprint(cert: Certificate, algorithm: 'SHA-1' | 'SHA-256' | 'SHA-384' = 'SHA-256'): string {
    return this._computeFingerprint(cert.publicKey, algorithm);
  }

  /** Verify fingerprint matches certificate. */
  verifyFingerprint(cert: Certificate): boolean {
    return this._computeFingerprint(cert.publicKey, cert.fingerprintAlgorithm) === cert.fingerprint;
  }

  /** Check key usage. */
  checkKeyUsage(cert: Certificate, usage: KeyUsage): boolean {
    return cert.keyUsage.includes(usage);
  }

  /** Check extended key usage. */
  checkExtendedKeyUsage(cert: Certificate, usage: ExtendedKeyUsage): boolean {
    return cert.extendedKeyUsage.includes(usage);
  }

  /** Validate subject alternative name against a hostname. */
  validateSAN(cert: Certificate, hostname: string): boolean {
    const san = cert.subjectAltName;
    if (san.dnsNames.some(n => this._matchHostname(n, hostname))) return true;
    if (san.ipAddresses.includes(hostname)) return true;
    return false;
  }

  private _matchHostname(pattern: string, hostname: string): boolean {
    if (pattern === hostname) return true;
    if (pattern.startsWith('*.')) {
      const suffix = pattern.substring(2);
      const dot = hostname.indexOf('.');
      if (dot < 0) return false;
      return hostname.substring(dot + 1) === suffix;
    }
    return false;
  }

  /** Apply name constraints to a certificate. */
  applyNameConstraints(cert: Certificate, constraints: NameConstraints): { allowed: boolean; violations: string[] } {
    const violations: string[] = [];
    const check = (name: string, type: string): void => {
      if (constraints.permittedSubtrees && constraints.permittedSubtrees.length > 0) {
        const permitted = constraints.permittedSubtrees.some(subtree => name.endsWith(subtree));
        if (!permitted) violations.push(`${type}:${name}:not-permitted`);
      }
      if (constraints.excludedSubtrees && constraints.excludedSubtrees.length > 0) {
        const excluded = constraints.excludedSubtrees.some(subtree => name.endsWith(subtree));
        if (excluded) violations.push(`${type}:${name}:excluded`);
      }
    };
    cert.subjectAltName.dnsNames.forEach(n => check(n, 'DNS'));
    cert.subjectAltName.emailAddresses.forEach(e => check(e, 'email'));
    cert.subjectAltName.uris.forEach(u => check(u, 'URI'));
    return { allowed: violations.length === 0, violations };
  }

  /** Verify a certificate policy chain. */
  verifyPolicyChain(chain: Certificate[], requiredPolicyOid: string): { valid: boolean; qualifiers: string[] } {
    const qualifiers: string[] = [];
    for (const cert of chain) {
      const policy = cert.policies.find(p => p.oid === requiredPolicyOid);
      if (!policy) {
        if (cert.policies.length > 0 && !cert.policies.some(p => p.oid === 'anyPolicy')) {
          return { valid: false, qualifiers };
        }
      } else {
        qualifiers.push(...policy.qualifiers);
      }
    }
    return { valid: true, qualifiers };
  }

  /** Get certificate authority info. */
  getCAInfo(caId: string): { config: CaConfig; certificatesIssued: number; crlsGenerated: number } | null {
    const config = this._cas.get(caId);
    if (!config) return null;
    const issued = Array.from(this._certificates.values()).filter(c => c.parentCAId === caId).length;
    const crl = this._crls.get(caId);
    return { config, certificatesIssued: issued, crlsGenerated: crl?.crlNumber ?? 0 };
  }

  /** List all CAs. */
  listCAs(): Array<{ caId: string; config: CaConfig }> {
    return Array.from(this._cas.entries()).map(([caId, config]) => ({ caId, config }));
  }

  /** Renew a certificate (issue new cert with same subject and key). */
  renewCertificate(serialNumber: string, validityDays: number, actor: string): Certificate | null {
    const old = this._certificates.get(serialNumber);
    if (!old) return null;
    const now = Date.now();
    const newCert: Certificate = {
      ...old,
      serialNumber: this._generateSerial(),
      validFrom: now,
      validTo: now + validityDays * 86_400_000,
      issuedAt: now,
      issuedBy: actor,
      state: 'active',
    };
    this._certificates.set(newCert.serialNumber, newCert);
    old.state = 'expired';
    this._audit.push({ timestamp: now, operation: 'renew-cert', actor, certificateSerial: newCert.serialNumber, result: 'success' });
    this._history.push({ method: 'renewCertificate', oldSerial: serialNumber, newSerial: newCert.serialNumber });
    return newCert;
  }

  /** Re-key a certificate (issue new cert with new public key). */
  rekeyCertificate(serialNumber: string, newPublicKey: Uint8Array, newPublicKeyAlgorithm: PublicKeyAlgorithm, validityDays: number, actor: string): Certificate | null {
    const old = this._certificates.get(serialNumber);
    if (!old) return null;
    const caKeys = this._caKeys.get(old.parentCAId ?? '');
    if (!caKeys) return null;
    const now = Date.now();
    const newCert: Certificate = {
      ...old,
      serialNumber: this._generateSerial(),
      publicKeyAlgorithm: newPublicKeyAlgorithm,
      publicKey: newPublicKey,
      publicKeySizeBits: newPublicKey.length * 8,
      signature: this._sign(caKeys.privateKey, newPublicKey),
      validFrom: now,
      validTo: now + validityDays * 86_400_000,
      issuedAt: now,
      issuedBy: actor,
      state: 'active',
      fingerprint: this._computeFingerprint(newPublicKey, 'SHA-256'),
    };
    this._certificates.set(newCert.serialNumber, newCert);
    old.state = 'expired';
    this._audit.push({ timestamp: now, operation: 'rekey-cert', actor, certificateSerial: newCert.serialNumber, result: 'success' });
    return newCert;
  }

  /** Get audit log for a certificate. */
  getCertificateAudit(serialNumber: string): PkiAuditEntry[] {
    return this._audit.filter(e => e.certificateSerial === serialNumber);
  }

  /** Get full audit log. */
  getFullAudit(): PkiAuditEntry[] {
    return [...this._audit];
  }

  /** Encode certificate to PEM format. */
  certificateToPEM(cert: Certificate): string {
    const b64 = this._bytesToBase64(cert.publicKey);
    return `-----BEGIN CERTIFICATE-----\n${b64}\n-----END CERTIFICATE-----\n`;
  }

  /** Decode PEM to certificate descriptor (placeholder). */
  pemToCertificate(pem: string): Certificate | null {
    void pem;
    return null;
  }

  /** Generate a key pair (simplified). */
  private _generateKeyPair(algorithm: PublicKeyAlgorithm, sizeBits: number): { privateKey: Uint8Array; publicKey: Uint8Array } {
    const bytes = Math.ceil(sizeBits / 8);
    const privateKey = new Uint8Array(bytes);
    const publicKey = new Uint8Array(bytes);
    for (let i = 0; i < bytes; i++) {
      privateKey[i] = Math.floor(Math.random() * 256);
      publicKey[i] = (privateKey[i] * 17 + 13) & 0xff;
    }
    void algorithm;
    return { privateKey, publicKey };
  }

  /** Sign data (simplified). */
  private _sign(privateKey: Uint8Array, data: Uint8Array): Uint8Array {
    const sig = new Uint8Array(32);
    for (let i = 0; i < data.length; i++) {
      sig[i % 32] = (sig[i % 32] + data[i] * privateKey[i % privateKey.length]) & 0xff;
    }
    return sig;
  }

  /** Verify a signature (simplified). */
  private _verifySignature(publicKey: Uint8Array, signature: Uint8Array, data: Uint8Array): boolean {
    if (signature.length !== 32) return false;
    const expected = new Uint8Array(32);
    for (let i = 0; i < data.length; i++) {
      expected[i % 32] = (expected[i % 32] + data[i] * publicKey[i % publicKey.length]) & 0xff;
    }
    let diff = 0;
    for (let i = 0; i < 32; i++) diff |= signature[i] ^ expected[i];
    return diff === 0;
  }

  /** Compute fingerprint. */
  private _computeFingerprint(data: Uint8Array, algorithm: 'SHA-1' | 'SHA-256' | 'SHA-384'): string {
    const len = algorithm === 'SHA-1' ? 20 : algorithm === 'SHA-256' ? 32 : 48;
    const hash = new Uint8Array(len);
    for (let i = 0; i < data.length; i++) {
      hash[i % len] = (hash[i % len] * 31 + data[i]) & 0xff;
    }
    hash[0] = (hash[0] + data.length) & 0xff;
    return `${algorithm}:${this._bytesToHex(hash)}`;
  }

  /** Check if certificate is self-signed. */
  private _isSelfSigned(cert: Certificate): boolean {
    return JSON.stringify(cert.subject) === JSON.stringify(cert.issuer);
  }

  /** Generate a unique serial number. */
  private _generateSerial(): string {
    return (++this._counter).toString(16).padStart(16, '0') + Date.now().toString(16);
  }

  /** Convert bytes to hex. */
  private _bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /** Convert bytes to base64. */
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

  toPacket(): DataPacket<{
    certificateCount: number;
    trustAnchorCount: number;
    caCount: number;
    crlCount: number;
    auditCount: number;
    history: unknown[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['cryptography', 'PublicKeyInfrastructure'],
      priority: 1,
      phase: 'crypto:pki',
    };
    return {
      id: `pki-${(++this._counter).toString(36)}-${Date.now().toString(36)}`,
      payload: {
        certificateCount: this._certificates.size,
        trustAnchorCount: this._trustAnchors.size,
        caCount: this._cas.size,
        crlCount: this._crls.size,
        auditCount: this._audit.length,
        history: this._history,
      },
      metadata,
    };
  }

  reset(): void {
    this._certificates.clear();
    this._csrs.clear();
    this._crls.clear();
    this._trustAnchors.clear();
    this._cas.clear();
    this._caKeys.clear();
    this._audit = [];
    this._counter = 0;
    this._history = [];
  }

  get certificateCount(): number {
    return this._certificates.size;
  }

  get trustAnchorCount(): number {
    return this._trustAnchors.size;
  }

  get caCount(): number {
    return this._cas.size;
  }

  get crlCount(): number {
    return this._crls.size;
  }

  get csrCount(): number {
    return this._csrs.size;
  }

  get auditCount(): number {
    return this._audit.length;
  }

  get historyDepth(): number {
    return this._history.length;
  }
}
