/**
 * 荧光素酶报告模块：通过发光强度表示特定基因表达水平。
 * 用于将内部状态量化为可观测的光信号输出。
 */

export interface ReporterGene {
  id: string;
  expressionLevel: number;
  baselineLuminescence: number;
}

export type ReporterReading = {
  gene: string;
  luminescence: number;
  foldChange: number;
  detected: boolean;
};

export interface LuciferaseConfig {
  detectionThreshold: number;
  substrateConcentration: number;
  maxGenes: number;
}

export class LuciferaseReporter {
  private _config: LuciferaseConfig;
  private _genes: ReporterGene[] = [];
  private _readings: ReporterReading[] = [];
  private _state: Record<string, unknown> = {};

  constructor(config: LuciferaseConfig) {
    this._config = config;
  }

  get geneCount(): number {
    return this._genes.length;
  }

  get readingCount(): number {
    return this._readings.length;
  }

  registerGene(gene: ReporterGene): void {
    this._genes.push(gene);
    if (this._genes.length > this._config.maxGenes) {
      this._genes.shift();
    }
  }

  read(geneId: string): ReporterReading | null {
    const gene = this._genes.find((g) => g.id === geneId);
    if (!gene) return null;
    const luminescence =
      gene.expressionLevel * gene.baselineLuminescence * this._config.substrateConcentration;
    const foldChange = gene.baselineLuminescence > 0
      ? luminescence / gene.baselineLuminescence
      : 0;
    const detected = luminescence >= this._config.detectionThreshold;
    const reading: ReporterReading = { gene: geneId, luminescence, foldChange, detected };
    this._readings.push(reading);
    if (this._readings.length > 50) this._readings.shift();
    return reading;
  }

  readAll(): ReporterReading[] {
    return this._genes.map((g) => this.read(g.id)!).filter((r) => r !== null);
  }

  setExpression(geneId: string, level: number): boolean {
    const gene = this._genes.find((g) => g.id === geneId);
    if (!gene) return false;
    gene.expressionLevel = Math.max(0, level);
    return true;
  }

  brightestGene(): ReporterGene | null {
    if (this._genes.length === 0) return null;
    return this._genes.reduce((best, g) =>
      g.expressionLevel * g.baselineLuminescence > best.expressionLevel * best.baselineLuminescence
        ? g
        : best
    );
  }

  averageExpression(): number {
    if (this._genes.length === 0) return 0;
    return this._genes.reduce((acc, g) => acc + g.expressionLevel, 0) / this._genes.length;
  }

  detectedCount(): number {
    return this._readings.filter((r) => r.detected).length;
  }

  replenishSubstrate(amount: number): void {
    this._config.substrateConcentration += amount;
    this._state.replenishedAt = Date.now();
  }

  report(): Record<string, unknown> {
    return {
      geneCount: this._genes.length,
      readingCount: this._readings.length,
      detected: this.detectedCount(),
      state: this._state,
    };
  }
}
