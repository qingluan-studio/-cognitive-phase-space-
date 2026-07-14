export interface NullBenefaction {
  id: string;
  recipient: string;
  receivedAt: number;
  value: null;
}

export class NullObjectBenefactor {
  private _benefactions: NullBenefaction[];
  private _recipients: Map<string, number>;
  private _entropyLog: number[];
  private _givingRate: number;

  constructor(givingRate: number = 1.0) {
    this._benefactions = [];
    this._recipients = new Map();
    this._entropyLog = [];
    this._givingRate = givingRate;
  }

  get benefactionCount(): number {
    return this._benefactions.length;
  }

  get givingRate(): number {
    return this._givingRate;
  }

  public give(recipient: string): NullBenefaction {
    const benefaction: NullBenefaction = {
      id: `null-gift-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      recipient,
      receivedAt: Date.now(),
      value: null,
    };
    this._benefactions.push(benefaction);
    if (this._benefactions.length > 100) this._benefactions.shift();
    this._recipients.set(recipient, (this._recipients.get(recipient) ?? 0) + 1);
    this._entropyLog.push(this._computeDistributionEntropy());
    if (this._entropyLog.length > 50) this._entropyLog.shift();
    return benefaction;
  }

  public receive(recipient: string): NullBenefaction | null {
    return this._benefactions.find(b => b.recipient === recipient) ?? null;
  }

  public countFor(recipient: string): number {
    return this._recipients.get(recipient) ?? 0;
  }

  public getBenefactions(limit: number = 50): NullBenefaction[] {
    return this._benefactions.slice(-limit);
  }

  public computeGivingEntropy(): number {
    if (this._entropyLog.length === 0) return 0;
    const mean = this._entropyLog.reduce((a, b) => a + b, 0) / this._entropyLog.length;
    const variance = this._entropyLog.reduce((s, v) => s + (v - mean) ** 2, 0) / this._entropyLog.length;
    return 0.5 * Math.log2(2 * Math.PI * Math.E * Math.max(variance, 1e-10));
  }

  public computeGiniCoefficient(): number {
    const values = Array.from(this._recipients.values()).sort((a, b) => a - b);
    const n = values.length;
    if (n === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / n;
    if (mean === 0) return 0;
    let sumAbsDiff = 0;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        sumAbsDiff += Math.abs(values[i] - values[j]);
      }
    }
    return sumAbsDiff / (2 * n * n * mean);
  }

  public computeRecipientSpectrum(): number[] {
    const counts = Array.from(this._recipients.values());
    const N = counts.length;
    if (N === 0) return [];
    const result: number[] = new Array(N).fill(0);
    for (let k = 0; k < N; k++) {
      let real = 0;
      let imag = 0;
      for (let n = 0; n < N; n++) {
        const angle = -2 * Math.PI * k * n / N;
        real += counts[n] * Math.cos(angle);
        imag += counts[n] * Math.sin(angle);
      }
      result[k] = Math.sqrt(real * real + imag * imag);
    }
    return result;
  }

  private _computeDistributionEntropy(): number {
    const total = Array.from(this._recipients.values()).reduce((a, b) => a + b, 0);
    if (total === 0) return 0;
    let entropy = 0;
    for (const count of this._recipients.values()) {
      const p = count / total;
      if (p > 0) entropy -= p * Math.log2(p);
    }
    return entropy;
  }
}
