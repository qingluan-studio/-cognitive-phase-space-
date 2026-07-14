/**
 * 超真实检查：判断是否已步入比真实更真实的拟像。
 * 通过比较仿真层与原作的清晰度、亮度和细节饱和度，判断是否进入超真实领域。
 */

export interface RealitySignature {
  id: string;
  sharpness: number;
  saturation: number;
  detailDensity: number;
  isOriginal: boolean;
}

export interface HyperrealityReport {
  targetId: string;
  baselineId: string;
  hyperrealScore: number;
  verdict: 'real' | 'simulation' | 'hyperreal';
  generatedAt: number;
}

export class HyperrealityCheck {
  private _signatures: Map<string, RealitySignature> = new Map();
  private _reports: HyperrealityReport[] = [];
  private _hyperrealThreshold = 0.7;

  registerSignature(sig: RealitySignature): void {
    this._signatures.set(sig.id, sig);
  }

  private _realismScore(sig: RealitySignature): number {
    return (sig.sharpness + sig.saturation + sig.detailDensity) / 3;
  }

  check(targetId: string, baselineId: string): HyperrealityReport | null {
    const target = this._signatures.get(targetId);
    const baseline = this._signatures.get(baselineId);
    if (!target || !baseline) return null;
    const targetScore = this._realismScore(target);
    const baselineScore = this._realismScore(baseline);
    const ratio = baselineScore > 0 ? targetScore / baselineScore : 0;
    const hyperrealScore = Math.max(0, Math.min(1, ratio - 0.5));
    const verdict: HyperrealityReport['verdict'] =
      hyperrealScore >= this._hyperrealThreshold ? 'hyperreal'
        : target.isOriginal ? 'real' : 'simulation';
    const report: HyperrealityReport = {
      targetId,
      baselineId,
      hyperrealScore,
      verdict,
      generatedAt: Date.now(),
    };
    this._reports.push(report);
    if (this._reports.length > 100) this._reports.shift();
    return report;
  }

  flagHyperreal(): RealitySignature[] {
    const flagged: RealitySignature[] = [];
    const origs = Array.from(this._signatures.values()).filter(s => s.isOriginal);
    if (origs.length === 0) return flagged;
    const baseline = origs[0];
    for (const sig of this._signatures.values()) {
      if (sig.isOriginal) continue;
      const report = this.check(sig.id, baseline.id);
      if (report && report.verdict === 'hyperreal') flagged.push(sig);
    }
    return flagged;
  }

  setThreshold(value: number): void {
    this._hyperrealThreshold = Math.max(0, Math.min(1, value));
  }

  getReports(limit: number = 50): HyperrealityReport[] {
    return this._reports.slice(-limit);
  }

  getSignature(id: string): RealitySignature | null {
    return this._signatures.get(id) ?? null;
  }

  get signatureCount(): number {
    return this._signatures.size;
  }
}
