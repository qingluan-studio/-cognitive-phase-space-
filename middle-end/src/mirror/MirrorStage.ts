/**
 * 镜像阶段：识别自身镜像，建立自我身份。
 * 模拟拉康镜像阶段，通过让系统识别自身的镜像来建立自我身份与边界感。
 */

export type IdentityStage = 'pre-mirror' | 'encounter' | 'recognition' | 'identification' | 'integrated';

export interface MirrorEncounter {
  id: string;
  stage: IdentityStage;
  reflectionSeen: Record<string, unknown>;
  identifiedAsSelf: boolean;
  timestamp: number;
}

export interface IdentityProfile {
  establishedAt: number;
  stage: IdentityStage;
  recognitionConfidence: number;
  boundaryClarity: number;
}

export class MirrorStage {
  private _encounters: MirrorEncounter[] = [];
  private _profile: IdentityProfile;
  private _selfSignature: string;
  private _recognitionThreshold = 0.7;

  constructor(selfSignature: string) {
    this._selfSignature = selfSignature;
    this._profile = {
      establishedAt: 0,
      stage: 'pre-mirror',
      recognitionConfidence: 0,
      boundaryClarity: 0,
    };
  }

  encounter(reflection: Record<string, unknown>): MirrorEncounter {
    const confidence = this._assessMatch(reflection);
    const identifiedAsSelf = confidence >= this._recognitionThreshold;
    const stage = this._advanceStage(identifiedAsSelf);

    const encounter: MirrorEncounter = {
      id: `enc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      stage,
      reflectionSeen: { ...reflection },
      identifiedAsSelf,
      timestamp: Date.now(),
    };
    this._encounters.push(encounter);
    if (this._encounters.length > 100) this._encounters.shift();

    this._updateProfile(stage, confidence, identifiedAsSelf);
    return encounter;
  }

  private _assessMatch(reflection: Record<string, unknown>): number {
    const signature = reflection.signature;
    if (typeof signature !== 'string') return 0;
    const common = this._commonPrefix(signature, this._selfSignature);
    return common / Math.max(this._selfSignature.length, signature.length);
  }

  private _commonPrefix(a: string, b: string): number {
    let i = 0;
    while (i < a.length && i < b.length && a[i] === b[i]) i++;
    return i;
  }

  private _advanceStage(identified: boolean): IdentityStage {
    const current = this._profile.stage;
    if (current === 'pre-mirror') return 'encounter';
    if (current === 'encounter') return identified ? 'recognition' : 'encounter';
    if (current === 'recognition') return identified ? 'identification' : 'recognition';
    if (current === 'identification') return identified ? 'integrated' : 'identification';
    return 'integrated';
  }

  private _updateProfile(stage: IdentityStage, confidence: number, identified: boolean): void {
    this._profile.stage = stage;
    this._profile.recognitionConfidence = Math.max(this._profile.recognitionConfidence, confidence);
    this._profile.boundaryClarity = Math.min(1, this._profile.boundaryClarity + (identified ? 0.1 : 0.02));
    if (stage === 'integrated' && this._profile.establishedAt === 0) {
      this._profile.establishedAt = Date.now();
    }
  }

  setRecognitionThreshold(value: number): void {
    this._recognitionThreshold = Math.max(0, Math.min(1, value));
  }

  getProfile(): Readonly<IdentityProfile> {
    return { ...this._profile };
  }

  getEncounters(): MirrorEncounter[] {
    return [...this._encounters];
  }

  get isIntegrated(): boolean {
    return this._profile.stage === 'integrated';
  }
}
