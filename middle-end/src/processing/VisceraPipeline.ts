export interface DigestStage {
  name: 'mouth' | 'stomach' | 'intestine' | 'gill';
  label: string;
  enzymes: string[];
  retentionMs: number;
  pH: number;
  vMax: number;
  kM: number;
}

export interface IngestaChunk {
  id: string;
  raw: Record<string, unknown>;
  energy: number;
  toxicity: number;
  stage: DigestStage['name'];
  molecularWeight: number;
  surfaceArea: number;
}

export interface DigestionOutput {
  absorbed: Record<string, unknown>[];
  excreted: Record<string, unknown>[];
  totalEnergy: number;
  residualToxicity: number;
  absorptionEfficiency: number;
}

export class VisceraPipeline {
  private _stages: Map<DigestStage['name'], DigestStage> = new Map();
  private _chunks: Map<string, IngestaChunk> = new Map();
  private _absorbed: Record<string, unknown>[] = [];
  private _excreted: Record<string, unknown>[] = [];
  private _totalEnergy = 0;
  private _enzymeMatrix: Map<string, Map<string, number>> = new Map();
  private _diffusionCoefficient = 0.72;
  private _bowlVolume = 1.5;
  private _cumulativeAbsorption = 0;
  private _cumulativeInput = 0;

  constructor() {
    this._stages.set('mouth', { name: 'mouth', label: '口腔咀嚼', enzymes: ['amylase', 'lingualLipase'], retentionMs: 50, pH: 6.8, vMax: 0.3, kM: 0.05 });
    this._stages.set('stomach', { name: 'stomach', label: '胃酸降解', enzymes: ['pepsin', 'HCl', 'gastricLipase'], retentionMs: 200, pH: 2.0, vMax: 0.8, kM: 0.12 });
    this._stages.set('intestine', { name: 'intestine', label: '肠壁吸收', enzymes: ['trypsin', 'lipase', 'protease', 'maltase'], retentionMs: 400, pH: 7.4, vMax: 1.2, kM: 0.08 });
    this._stages.set('gill', { name: 'gill', label: '鳃滤排毒', enzymes: ['cytochrome', 'glutathione', 'filter'], retentionMs: 100, pH: 7.2, vMax: 0.5, kM: 0.15 });
    this._initEnzymeMatrix();
  }

  private _initEnzymeMatrix(): void {
    this._enzymeMatrix.set('amylase', new Map([['carbohydrate', 0.85], ['protein', 0.05], ['lipid', 0.02], ['toxin', 0.0]]));
    this._enzymeMatrix.set('lingualLipase', new Map([['carbohydrate', 0.0], ['protein', 0.02], ['lipid', 0.3], ['toxin', 0.05]]));
    this._enzymeMatrix.set('pepsin', new Map([['carbohydrate', 0.05], ['protein', 0.9], ['lipid', 0.05], ['toxin', 0.15]]));
    this._enzymeMatrix.set('HCl', new Map([['carbohydrate', 0.1], ['protein', 0.4], ['lipid', 0.1], ['toxin', 0.6]]));
    this._enzymeMatrix.set('gastricLipase', new Map([['carbohydrate', 0.0], ['protein', 0.05], ['lipid', 0.7], ['toxin', 0.1]]));
    this._enzymeMatrix.set('trypsin', new Map([['carbohydrate', 0.05], ['protein', 0.95], ['lipid', 0.02], ['toxin', 0.1]]));
    this._enzymeMatrix.set('lipase', new Map([['carbohydrate', 0.0], ['protein', 0.03], ['lipid', 0.98], ['toxin', 0.2]]));
    this._enzymeMatrix.set('protease', new Map([['carbohydrate', 0.02], ['protein', 0.9], ['lipid', 0.05], ['toxin', 0.25]]));
    this._enzymeMatrix.set('maltase', new Map([['carbohydrate', 0.95], ['protein', 0.0], ['lipid', 0.0], ['toxin', 0.0]]));
    this._enzymeMatrix.set('cytochrome', new Map([['carbohydrate', 0.0], ['protein', 0.0], ['lipid', 0.05], ['toxin', 0.85]]));
    this._enzymeMatrix.set('glutathione', new Map([['carbohydrate', 0.0], ['protein', 0.05], ['lipid', 0.02], ['toxin', 0.9]]));
    this._enzymeMatrix.set('filter', new Map([['carbohydrate', 0.0], ['protein', 0.0], ['lipid', 0.0], ['toxin', 0.7]]));
  }

  ingest(id: string, raw: Record<string, unknown>): IngestaChunk {
    const chunk: IngestaChunk = {
      id,
      raw,
      energy: Number(raw.energy ?? 1) * this._boltonFactor(raw),
      toxicity: Number(raw.toxicity ?? 0),
      stage: 'mouth',
      molecularWeight: Number(raw.molecularWeight ?? 180),
      surfaceArea: Number(raw.surfaceArea ?? 1) * this._sphericityFactor(raw),
    };
    this._chunks.set(id, chunk);
    this._cumulativeInput += chunk.energy;
    return chunk;
  }

  private _boltonFactor(raw: Record<string, unknown>): number {
    const complexity = Object.keys(raw).length;
    return 1 + 0.05 * Math.log1p(complexity);
  }

  private _sphericityFactor(raw: Record<string, unknown>): number {
    const keys = Object.keys(raw).length;
    return Math.pow(keys, 2 / 3) / Math.max(1, keys);
  }

  async digest(id: string): Promise<DigestionOutput | undefined> {
    const chunk = this._chunks.get(id);
    if (!chunk) return undefined;

    const order: DigestStage['name'][] = ['mouth', 'stomach', 'intestine', 'gill'];
    let current: Record<string, unknown> = { ...chunk.raw };
    let currentEnergy = chunk.energy;
    let currentToxicity = chunk.toxicity;
    let currentMW = chunk.molecularWeight;
    let currentSA = chunk.surfaceArea;

    for (const stageName of order) {
      const stage = this._stages.get(stageName)!;
      await new Promise(r => setTimeout(r, Math.min(stage.retentionMs, 10)));
      const result = this._applyStage(current, currentEnergy, currentToxicity, currentMW, currentSA, stage);
      current = result.payload;
      currentEnergy = result.energy;
      currentToxicity = result.toxicity;
      currentMW = result.molecularWeight;
      currentSA = result.surfaceArea;
      chunk.stage = stageName;
    }

    const absorbedFraction = this._intestinalAbsorption(currentEnergy, currentMW, currentSA);
    const netEnergy = currentEnergy * absorbedFraction;

    if (currentToxicity > 0.5) {
      this._excreted.push({ ...current, excretedEnergy: currentEnergy, excretionReason: 'toxicity' });
    } else {
      this._absorbed.push({ ...current, absorbedEnergy: netEnergy, absorptionFraction: absorbedFraction });
      this._totalEnergy += netEnergy;
      this._cumulativeAbsorption += netEnergy;
    }

    return {
      absorbed: this._absorbed,
      excreted: this._excreted,
      totalEnergy: this._totalEnergy,
      residualToxicity: currentToxicity,
      absorptionEfficiency: this._cumulativeInput === 0 ? 0 : this._cumulativeAbsorption / this._cumulativeInput,
    };
  }

  private _applyStage(
    payload: Record<string, unknown>,
    energy: number,
    toxicity: number,
    mw: number,
    sa: number,
    stage: DigestStage
  ): { payload: Record<string, unknown>; energy: number; toxicity: number; molecularWeight: number; surfaceArea: number } {
    const out: Record<string, unknown> = { ...payload };
    let remainingEnergy = energy;
    let remainingToxicity = toxicity;
    let currentMW = mw;
    let currentSA = sa;

    for (const enzyme of stage.enzymes) {
      const specificity = this._enzymeMatrix.get(enzyme);
      if (!specificity) continue;

      const rxnRate = this._michaelisMenten(stage.vMax, stage.kM, remainingEnergy);
      const pHMod = this._phModifier(stage.pH, enzyme);

      const carbRate = (specificity.get('carbohydrate') ?? 0) * rxnRate * pHMod;
      const protRate = (specificity.get('protein') ?? 0) * rxnRate * pHMod;
      const lipRate = (specificity.get('lipid') ?? 0) * rxnRate * pHMod;
      const toxRate = (specificity.get('toxin') ?? 0) * rxnRate * pHMod;

      const totalBreakdown = carbRate + protRate + lipRate;
      remainingEnergy = remainingEnergy * (1 - totalBreakdown * 0.1);
      remainingToxicity = Math.max(0, remainingToxicity - toxRate * 0.15);
      currentMW = currentMW * (1 - totalBreakdown * 0.2);
      currentSA = currentSA * (1 + totalBreakdown * 0.3);

      out[`${enzyme}_activity`] = rxnRate * pHMod;
    }

    out.stageEnergy = remainingEnergy;
    out.stageToxicity = remainingToxicity;
    out.molecularWeight = currentMW;
    out.surfaceArea = currentSA;

    return { payload: out, energy: remainingEnergy, toxicity: remainingToxicity, molecularWeight: currentMW, surfaceArea: currentSA };
  }

  private _michaelisMenten(vMax: number, kM: number, substrate: number): number {
    return (vMax * substrate) / (kM + substrate);
  }

  private _phModifier(pH: number, enzyme: string): number {
    const optima: Record<string, number> = {
      amylase: 6.8, lingualLipase: 5.5, pepsin: 2.0, HCl: 1.5,
      gastricLipase: 4.5, trypsin: 8.0, lipase: 7.5, protease: 7.8,
      maltase: 6.5, cytochrome: 7.2, glutathione: 7.0, filter: 7.2,
    };
    const optimum = optima[enzyme] ?? 7.0;
    const delta = Math.abs(pH - optimum);
    return Math.exp(-delta * delta * 0.6);
  }

  private _intestinalAbsorption(energy: number, mw: number, sa: number): number {
    const sizePenalty = Math.exp(-mw / 500);
    const areaBoost = 1 - Math.exp(-sa * 0.5);
    const fickian = this._diffusionCoefficient * areaBoost * sizePenalty / this._bowlVolume;
    return Math.min(0.98, Math.max(0.02, fickian));
  }

  getStage(name: DigestStage['name']): DigestStage | undefined {
    return this._stages.get(name);
  }

  tuneRetention(name: DigestStage['name'], ms: number): void {
    const stage = this._stages.get(name);
    if (stage) stage.retentionMs = ms;
  }

  tuneEnzymeKinetics(name: DigestStage['name'], vMax: number, kM: number): void {
    const stage = this._stages.get(name);
    if (stage) { stage.vMax = vMax; stage.kM = kM; }
  }

  setDiffusionCoefficient(d: number): void {
    this._diffusionCoefficient = Math.max(0.01, Math.min(2, d));
  }

  flush(): void {
    this._absorbed = [];
    this._excreted = [];
    this._totalEnergy = 0;
    this._cumulativeAbsorption = 0;
    this._cumulativeInput = 0;
    this._chunks.clear();
  }

  get chunkCount(): number { return this._chunks.size; }
  get absorbedCount(): number { return this._absorbed.length; }
  get excretedCount(): number { return this._excreted.length; }
  get totalEnergy(): number { return this._totalEnergy; }
  get absorptionEfficiency(): number { return this._cumulativeInput === 0 ? 0 : this._cumulativeAbsorption / this._cumulativeInput; }
  get diffusionCoefficient(): number { return this._diffusionCoefficient; }
}
