/**
 * 慢酿：长时间酝酿复杂思想，成熟后揭盖。
 * 复杂思想需要长时间缓慢酝酿，在成熟时刻揭盖释放，产生层次丰富的洞察。
 */

export type BrewStage = 'preparing' | 'steeping' | 'simmering' | 'aging' | 'ready';

export interface SlowBrewBatch {
  id: string;
  ingredients: string[];
  stage: BrewStage;
  startedAt: number;
  maturity: number;
  complexity: number;
  sealed: boolean;
}

export interface UncorkResult {
  batchId: string;
  insights: string[];
  maturity: number;
  quality: 'flat' | 'mild' | 'rich' | 'vintage';
  uncorkedAt: number;
}

export class SlowBrew {
  private _batches: Map<string, SlowBrewBatch> = new Map();
  private _results: UncorkResult[] = [];
  private _maturityRate = 0.001;
  private _readyThreshold = 1.0;

  startBatch(ingredients: string[]): SlowBrewBatch {
    const batch: SlowBrewBatch = {
      id: `brew-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ingredients: [...ingredients],
      stage: 'preparing',
      startedAt: Date.now(),
      maturity: 0,
      complexity: ingredients.length,
      sealed: true,
    };
    this._batches.set(batch.id, batch);
    return batch;
  }

  steep(batchId: string): SlowBrewBatch | null {
    const batch = this._batches.get(batchId);
    if (!batch || batch.stage !== 'preparing') return null;
    batch.stage = 'steeping';
    return batch;
  }

  simmer(batchId: string): SlowBrewBatch | null {
    const batch = this._batches.get(batchId);
    if (!batch) return null;
    batch.stage = 'simmering';
    return batch;
  }

  age(batchId: string, ticks: number = 1): SlowBrewBatch | null {
    const batch = this._batches.get(batchId);
    if (!batch || !batch.sealed) return null;
    batch.stage = 'aging';
    for (let i = 0; i < ticks; i++) {
      batch.maturity = Math.min(this._readyThreshold, batch.maturity + this._maturityRate * batch.complexity);
    }
    if (batch.maturity >= this._readyThreshold) {
      batch.stage = 'ready';
    }
    return batch;
  }

  uncork(batchId: string): UncorkResult | null {
    const batch = this._batches.get(batchId);
    if (!batch || !batch.sealed) return null;
    batch.sealed = false;
    const insights = this._generateInsights(batch);
    const quality = this._assessQuality(batch);
    const result: UncorkResult = {
      batchId,
      insights,
      maturity: batch.maturity,
      quality,
      uncorkedAt: Date.now(),
    };
    this._results.push(result);
    if (this._results.length > 100) this._results.shift();
    return result;
  }

  private _generateInsights(batch: SlowBrewBatch): string[] {
    return batch.ingredients.map(ing => `Aged insight on "${ing}": depth ${batch.maturity.toFixed(2)}`);
  }

  private _assessQuality(batch: SlowBrewBatch): UncorkResult['quality'] {
    if (batch.maturity < 0.3) return 'flat';
    if (batch.maturity < 0.6) return 'mild';
    if (batch.maturity < 0.9) return 'rich';
    return 'vintage';
  }

  setMaturityRate(rate: number): void {
    this._maturityRate = Math.max(0, rate);
  }

  getReadyBatches(): SlowBrewBatch[] {
    return Array.from(this._batches.values()).filter(b => b.stage === 'ready');
  }

  getResults(): UncorkResult[] {
    return [...this._results];
  }

  get batchCount(): number {
    return this._batches.size;
  }
}
