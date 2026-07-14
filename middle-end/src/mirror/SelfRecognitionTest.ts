/**
 * 自我识别测试：验证模块是否能认出自己。
 * 通过对比模块的自身签名与镜像反射，判断模块是否具备自我识别能力。
 */

export type RecognitionVerdict = 'self' | 'other' | 'ambiguous' | 'unknown';

export interface SelfMarker {
  moduleId: string;
  signature: string;
  behavioralFingerprint: number[];
}

export interface RecognitionAttempt {
  id: string;
  subject: SelfMarker;
  reflected: Record<string, unknown>;
  verdict: RecognitionVerdict;
  similarity: number;
  attemptedAt: number;
}

export class SelfRecognitionTest {
  private _registered: Map<string, SelfMarker> = new Map();
  private _attempts: RecognitionAttempt[] = [];
  private _threshold = 0.85;
  private _ambiguityFloor = 0.5;

  register(marker: SelfMarker): void {
    this._registered.set(marker.moduleId, marker);
  }

  test(moduleId: string, reflected: Record<string, unknown>): RecognitionAttempt {
    const marker = this._registered.get(moduleId);
    if (!marker) {
      return this._buildAttempt(moduleId as unknown as SelfMarker, reflected, 'unknown', 0);
    }
    const similarity = this._computeSimilarity(marker, reflected);
    const verdict = this._classify(similarity);
    return this._buildAttempt(marker, reflected, verdict, similarity);
  }

  private _computeSimilarity(marker: SelfMarker, reflected: Record<string, unknown>): number {
    const signature = typeof reflected.signature === 'string' ? reflected.signature : '';
    let sigScore = 0;
    if (signature && marker.signature) {
      let matches = 0;
      const minLen = Math.min(signature.length, marker.signature.length);
      for (let i = 0; i < minLen; i++) {
        if (signature[i] === marker.signature[i]) matches++;
      }
      sigScore = matches / Math.max(signature.length, marker.signature.length);
    }

    const reflectedFingerprint = Array.isArray(reflected.fingerprint)
      ? reflected.fingerprint as number[]
      : [];
    let behaviorScore = 0;
    if (reflectedFingerprint.length > 0 && marker.behavioralFingerprint.length > 0) {
      const minLen = Math.min(reflectedFingerprint.length, marker.behavioralFingerprint.length);
      let sum = 0;
      for (let i = 0; i < minLen; i++) {
        sum += 1 - Math.abs(reflectedFingerprint[i] - marker.behavioralFingerprint[i]);
      }
      behaviorScore = sum / minLen;
    }

    return (sigScore + behaviorScore) / 2;
  }

  private _classify(similarity: number): RecognitionVerdict {
    if (similarity >= this._threshold) return 'self';
    if (similarity >= this._ambiguityFloor) return 'ambiguous';
    return 'other';
  }

  private _buildAttempt(
    subject: SelfMarker,
    reflected: Record<string, unknown>,
    verdict: RecognitionVerdict,
    similarity: number
  ): RecognitionAttempt {
    const attempt: RecognitionAttempt = {
      id: `rec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      subject,
      reflected: { ...reflected },
      verdict,
      similarity,
      attemptedAt: Date.now(),
    };
    this._attempts.push(attempt);
    if (this._attempts.length > 100) this._attempts.shift();
    return attempt;
  }

  setThreshold(value: number): void {
    this._threshold = Math.max(0, Math.min(1, value));
  }

  getAttempts(): RecognitionAttempt[] {
    return [...this._attempts];
  }

  getByVerdict(verdict: RecognitionVerdict): RecognitionAttempt[] {
    return this._attempts.filter(a => a.verdict === verdict);
  }

  get registeredCount(): number {
    return this._registered.size;
  }
}
