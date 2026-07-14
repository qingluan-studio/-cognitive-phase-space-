export interface CassandraWarningData {
  issued: number;
  ignored: number;
  vindicated: number;
  pending: Array<{ id: string; message: string; ageWeight: number }>;
  credibility: number;
  vindicationRate: number;
}

export interface Warning {
  id: string;
  message: string;
  issuedAt: number;
  vindicated: boolean;
  severity: number;
  audience: string[];
}

interface _AudienceRecord {
  name: string;
  ignoreCount: number;
  vindicationCount: number;
  disbeliefScore: number;
}

export class CassandraWarning {
  private _warnings: Map<string, Warning>;
  private _ignored: number;
  private _vindicated: number;
  private _audiences: Map<string, _AudienceRecord>;
  private _hearingProbability: number;

  constructor(hearingProbability: number = 0.0) {
    this._warnings = new Map<string, Warning>();
    this._ignored = 0;
    this._vindicated = 0;
    this._audiences = new Map<string, _AudienceRecord>();
    this._hearingProbability = hearingProbability;
  }

  get issuedCount(): number {
    return this._warnings.size;
  }

  get ignoredCount(): number {
    return this._ignored;
  }

  get vindicationRate(): number {
    if (this._warnings.size === 0) return 0;
    return this._vindicated / this._warnings.size;
  }

  get credibility(): number {
    if (this._warnings.size === 0) return 0;
    const vindicationFactor = this._vindicated / this._warnings.size;
    const severityFactor = Array.from(this._warnings.values())
      .reduce((s, w) => s + w.severity, 0) / this._warnings.size;
    return Math.min(1, vindicationFactor * 0.7 + severityFactor * 0.3);
  }

  public warn(id: string, message: string, severity: number = 0.5, audience: string[] = []): Warning {
    const w: Warning = {
      id,
      message,
      issuedAt: Date.now(),
      vindicated: false,
      severity: Math.max(0, Math.min(1, severity)),
      audience,
    };
    this._warnings.set(id, w);
    this._ignored += 1;
    for (const a of audience) {
      const rec = this._audiences.get(a) ?? { name: a, ignoreCount: 0, vindicationCount: 0, disbeliefScore: 1 };
      rec.ignoreCount += 1;
      this._audiences.set(a, rec);
    }
    return w;
  }

  public isHeard(id: string): boolean {
    const w = this._warnings.get(id);
    if (!w) return false;
    return Math.random() < this._hearingProbability;
  }

  public vindicate(id: string): boolean {
    const w = this._warnings.get(id);
    if (!w || w.vindicated) return false;
    w.vindicated = true;
    this._vindicated += 1;
    this._ignored = Math.max(0, this._ignored - 1);
    for (const a of w.audience) {
      const rec = this._audiences.get(a);
      if (rec) {
        rec.vindicationCount += 1;
        rec.disbeliefScore = Math.max(0, rec.disbeliefScore - 0.1);
      }
    }
    return true;
  }

  public ageWeight(id: string): number {
    const w = this._warnings.get(id);
    if (!w) return 0;
    const age = Date.now() - w.issuedAt;
    const halfLife = 1000 * 60 * 60 * 24 * 7;
    return Math.exp(-age / halfLife) * (w.vindicated ? 2 : 1);
  }

  public predictVindication(id: string): number {
    const w = this._warnings.get(id);
    if (!w) return 0;
    const severityFactor = w.severity;
    const credibilityFactor = this.credibility;
    const audienceFactor = w.audience.length === 0
      ? 0.5
      : w.audience.reduce((s, a) => {
          const rec = this._audiences.get(a);
          return s + (rec ? 1 - rec.disbeliefScore : 0.5);
        }, 0) / w.audience.length;
    return Math.min(1, severityFactor * 0.4 + credibilityFactor * 0.4 + audienceFactor * 0.2);
  }

  public archive(): Warning[] {
    return Array.from(this._warnings.values());
  }

  public pending(): Warning[] {
    return Array.from(this._warnings.values()).filter((w) => !w.vindicated);
  }

  public audienceDisbelief(name: string): number {
    return this._audiences.get(name)?.disbeliefScore ?? 1;
  }

  public clear(): void {
    this._warnings.clear();
    this._ignored = 0;
    this._vindicated = 0;
    this._audiences.clear();
  }

  public report(): CassandraWarningData {
    return {
      issued: this.issuedCount,
      ignored: this._ignored,
      vindicated: this._vindicated,
      pending: this.pending().map((w) => ({ id: w.id, message: w.message, ageWeight: this.ageWeight(w.id) })),
      credibility: this.credibility,
      vindicationRate: this.vindicationRate,
    };
  }
}
