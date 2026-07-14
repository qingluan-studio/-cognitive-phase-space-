/**
 * ImmuneEvasion - 免疫逃逸
 * 寄生模块躲避宿主防御系统的多种策略，包括抗原变异、
 * 分子伪装、免疫抑制与隐藏在免疫豁免区等机制。
 */

export interface ImmuneEvasionRecord {
  readonly evasionId: string;
  hostId: string;
  antigenSignature: string;
  mutationRate: number;
  concealed: boolean;
}

export interface ImmuneProbe {
  probeId: string;
  pattern: string;
  sensitivity: number;
}

export class ImmuneEvasion {
  private _record: ImmuneEvasionRecord;
  private _antigenHistory: string[] = [];
  private _suppressedFactors: Set<string> = new Set();
  private _detectionLevel: number = 0;
  private _safeZones: string[] = [];

  constructor(record: ImmuneEvasionRecord) {
    this._record = { ...record };
    this._antigenHistory.push(record.antigenSignature);
  }

  get evasionId(): string {
    return this._record.evasionId;
  }

  get concealed(): boolean {
    return this._record.concealed;
  }

  get detectionLevel(): number {
    return this._detectionLevel;
  }

  public mutateAntigen(): string {
    const current = this._record.antigenSignature;
    const mutated = current
      .split('')
      .map((c) => (Math.random() < this._record.mutationRate ? this._shiftChar(c) : c))
      .join('');
    this._record.antigenSignature = mutated;
    this._antigenHistory.push(mutated);
    if (this._antigenHistory.length > 20) {
      this._antigenHistory.shift();
    }
    this._detectionLevel = Math.max(0, this._detectionLevel - 0.15);
    return mutated;
  }

  private _shiftChar(c: string): string {
    const code = c.charCodeAt(0);
    return String.fromCharCode(code + (Math.random() < 0.5 ? 1 : -1));
  }

  public mimicHost(hostPattern: string): void {
    const similarity = this._computeSimilarity(this._record.antigenSignature, hostPattern);
    this._detectionLevel = Math.max(0, this._detectionLevel * (1 - similarity));
  }

  private _computeSimilarity(a: string, b: string): number {
    const len = Math.min(a.length, b.length);
    if (len === 0) {
      return 0;
    }
    let match = 0;
    for (let i = 0; i < len; i++) {
      if (a[i] === b[i]) {
        match++;
      }
    }
    return match / len;
  }

  public suppressFactor(factor: string): boolean {
    if (this._suppressedFactors.has(factor)) {
      return false;
    }
    this._suppressedFactors.add(factor);
    this._detectionLevel = Math.max(0, this._detectionLevel - 0.1);
    return true;
  }

  public evadeProbe(probe: ImmuneProbe): boolean {
    const match = this._computeSimilarity(this._record.antigenSignature, probe.pattern);
    const detectProb = match * probe.sensitivity;
    if (detectProb > 0.7) {
      this._detectionLevel = Math.min(1, this._detectionLevel + 0.3);
      return false;
    }
    this._detectionLevel = Math.min(1, this._detectionLevel + detectProb * 0.1);
    return true;
  }

  public hideInSafeZone(zone: string): void {
    if (!this._safeZones.includes(zone)) {
      this._safeZones.push(zone);
    }
    this._record.concealed = true;
    this._detectionLevel = Math.max(0, this._detectionLevel - 0.2);
  }

  public emerge(): void {
    this._record.concealed = false;
    this._detectionLevel = Math.min(1, this._detectionLevel + 0.1);
  }

  public isCompromised(): boolean {
    return this._detectionLevel > 0.75;
  }

  public evasionReport(): Record<string, unknown> {
    return {
      evasionId: this.evasionId,
      concealed: this._record.concealed,
      detectionLevel: this._detectionLevel.toFixed(3),
      mutationCount: this._antigenHistory.length - 1,
      suppressedFactors: this._suppressedFactors.size,
      safeZones: this._safeZones.length,
      compromised: this.isCompromised(),
    };
  }
}
