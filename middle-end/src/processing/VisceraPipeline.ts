/**
 * 内脏管道模块：模拟口-胃-肠-鳃四步消化式数据处理，
 * 数据依次经过摄入、酸解、吸收、过滤四阶段，逐级降解为可吸收养分。
 */

export interface DigestStage {
  name: 'mouth' | 'stomach' | 'intestine' | 'gill';
  label: string;
  enzymes: string[];
  retentionMs: number;
}

export interface IngestaChunk {
  id: string;
  raw: Record<string, unknown>;
  energy: number;
  toxicity: number;
  stage: DigestStage['name'];
}

export interface DigestionOutput {
  absorbed: Record<string, unknown>[];
  excreted: Record<string, unknown>[];
  totalEnergy: number;
  residualToxicity: number;
}

export class VisceraPipeline {
  private _stages: Map<DigestStage['name'], DigestStage> = new Map();
  private _chunks: Map<string, IngestaChunk> = new Map();
  private _absorbed: Record<string, unknown>[] = [];
  private _excreted: Record<string, unknown>[] = [];
  private _totalEnergy = 0;

  constructor() {
    this._stages.set('mouth', { name: 'mouth', label: '口腔咀嚼', enzymes: ['amylase'], retentionMs: 50 });
    this._stages.set('stomach', { name: 'stomach', label: '胃酸降解', enzymes: ['pepsin', 'acid'], retentionMs: 200 });
    this._stages.set('intestine', { name: 'intestine', label: '肠壁吸收', enzymes: ['lipase', 'protease'], retentionMs: 400 });
    this._stages.set('gill', { name: 'gill', label: '鳃滤排毒', enzymes: ['filter'], retentionMs: 100 });
  }

  ingest(id: string, raw: Record<string, unknown>): IngestaChunk {
    const chunk: IngestaChunk = {
      id,
      raw,
      energy: Number(raw.energy ?? 1),
      toxicity: Number(raw.toxicity ?? 0),
      stage: 'mouth',
    };
    this._chunks.set(id, chunk);
    return chunk;
  }

  async digest(id: string): Promise<DigestionOutput | undefined> {
    const chunk = this._chunks.get(id);
    if (!chunk) return undefined;

    const order: DigestStage['name'][] = ['mouth', 'stomach', 'intestine', 'gill'];
    let current: Record<string, unknown> = { ...chunk.raw };

    for (const stageName of order) {
      const stage = this._stages.get(stageName)!;
      await new Promise(r => setTimeout(r, Math.min(stage.retentionMs, 10)));
      current = this._applyEnzymes(current, stage.enzymes);
      chunk.stage = stageName;
    }

    const toxin = Number(current.toxicity ?? 0);
    if (toxin > 0.5) {
      this._excreted.push(current);
    } else {
      this._absorbed.push(current);
      this._totalEnergy += chunk.energy;
    }

    return {
      absorbed: this._absorbed,
      excreted: this._excreted,
      totalEnergy: this._totalEnergy,
      residualToxicity: toxin,
    };
  }

  private _applyEnzymes(payload: Record<string, unknown>, enzymes: string[]): Record<string, unknown> {
    const out: Record<string, unknown> = { ...payload };
    for (const enzyme of enzymes) {
      out[`_${enzyme}_processed`] = true;
      out.toxicity = Math.max(0, Number(out.toxicity ?? 0) - 0.1);
      out.energy = Math.max(0, Number(out.energy ?? 0) - 0.05);
    }
    return out;
  }

  getStage(name: DigestStage['name']): DigestStage | undefined {
    return this._stages.get(name);
  }

  tuneRetention(name: DigestStage['name'], ms: number): void {
    const stage = this._stages.get(name);
    if (stage) stage.retentionMs = ms;
  }

  flush(): void {
    this._absorbed = [];
    this._excreted = [];
    this._totalEnergy = 0;
    this._chunks.clear();
  }

  get chunkCount(): number {
    return this._chunks.size;
  }

  get absorbedCount(): number {
    return this._absorbed.length;
  }

  get excretedCount(): number {
    return this._excreted.length;
  }

  get totalEnergy(): number {
    return this._totalEnergy;
  }
}
