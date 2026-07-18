export interface ContradictionEntry {
  id: string;
  statementA: string;
  statementB: string;
  severity: number;
  harvestedAt: number;
}

export class ContradictionHarvester {
  private _entries: ContradictionEntry[];
  private _harvestCount: number;
  private _severityDistribution: number[];
  private _entropyLog: number[];
  private _powerLawExponent: number;

  constructor() {
    this._entries = [];
    this._harvestCount = 0;
    this._severityDistribution = [];
    this._entropyLog = [];
    this._powerLawExponent = 0;
  }

  get harvestCount(): number {
    return this._harvestCount;
  }

  get powerLawExponent(): number {
    return this._powerLawExponent;
  }

  public harvest(statementA: string, statementB: string): ContradictionEntry {
    const id = `contradiction-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const severity = this._computeSeverity(statementA, statementB);
    const entry: ContradictionEntry = {
      id,
      statementA,
      statementB,
      severity,
      harvestedAt: Date.now(),
    };
    this._entries.push(entry);
    this._harvestCount++;
    this._severityDistribution.push(severity);
    if (this._severityDistribution.length > 50) this._severityDistribution.shift();
    this._entropyLog.push(this.computeSeverityEntropy());
    if (this._entropyLog.length > 50) this._entropyLog.shift();
    this._updatePowerLaw();
    return entry;
  }

  public filterSevere(threshold: number = 0.7): ContradictionEntry[] {
    return this._entries.filter(e => e.severity >= threshold);
  }

  public resolve(entryId: string): boolean {
    const idx = this._entries.findIndex(e => e.id === entryId);
    if (idx < 0) return false;
    this._entries.splice(idx, 1);
    return true;
  }

  public clear(): void {
    this._entries = [];
    this._harvestCount = 0;
    this._severityDistribution = [];
    this._entropyLog = [];
    this._powerLawExponent = 0;
  }

  public report(): { total: number; averageSeverity: number; maxSeverity: number } {
    const severities = this._entries.map(e => e.severity);
    const total = severities.length;
    const averageSeverity = total > 0 ? severities.reduce((a, b) => a + b, 0) / total : 0;
    const maxSeverity = total > 0 ? Math.max(...severities) : 0;
    return { total, averageSeverity, maxSeverity };
  }

  public computeSeverityEntropy(): number {
    if (this._severityDistribution.length === 0) return 0;
    const mean = this._severityDistribution.reduce((a, b) => a + b, 0) / this._severityDistribution.length;
    const variance = this._severityDistribution.reduce((s, v) => s + (v - mean) ** 2, 0) / this._severityDistribution.length;
    return 0.5 * Math.log2(2 * Math.PI * Math.E * Math.max(variance, 1e-10));
  }

  public computeZipfRanking(): Array<{ severity: number; rank: number }> {
    const sorted = [...this._severityDistribution].sort((a, b) => b - a);
    return sorted.map((s, i) => ({ severity: s, rank: i + 1 }));
  }

  public fitPowerLaw(): { exponent: number; r2: number } {
    const sorted = [...this._severityDistribution].sort((a, b) => b - a);
    if (sorted.length < 2) return { exponent: 0, r2: 0 };
    const logX = sorted.map((_, i) => Math.log(i + 1));
    const logY = sorted.map(s => Math.log(s + 1));
    const n = logX.length;
    const meanX = logX.reduce((a, b) => a + b, 0) / n;
    const meanY = logY.reduce((a, b) => a + b, 0) / n;
    let num = 0;
    let den = 0;
    for (let i = 0; i < n; i++) {
      num += (logX[i] - meanX) * (logY[i] - meanY);
      den += (logX[i] - meanX) ** 2;
    }
    const slope = den > 0 ? num / den : 0;
    let ssRes = 0;
    let ssTot = 0;
    for (let i = 0; i < n; i++) {
      const pred = meanY + slope * (logX[i] - meanX);
      ssRes += (logY[i] - pred) ** 2;
      ssTot += (logY[i] - meanY) ** 2;
    }
    const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;
    return { exponent: -slope, r2 };
  }

  private _computeSeverity(a: string, b: string): number {
    const setA = new Set(a);
    const setB = new Set(b);
    const intersection = new Set([...setA].filter(x => setB.has(x)));
    const union = new Set([...setA, ...setB]);
    return union.size > 0 ? 1 - intersection.size / union.size : 1;
  }

  private _updatePowerLaw(): void {
    const result = this.fitPowerLaw();
    this._powerLawExponent = result.exponent;
  }
}
