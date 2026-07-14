/**
 * 同根增殖器模块：对同根数据的不同形态变形进行并行处理，
 * 产生多个互校验结果，通过一致性投票确定最可靠输出。
 */

export interface PolyptotonVariant {
  id: string;
  root: string;
  form: string;
  payload: Record<string, unknown>;
  processor: (input: Record<string, unknown>) => Record<string, unknown>;
}

export interface ProliferatedResult {
  root: string;
  variants: Array<{ form: string; output: Record<string, unknown> }>;
  consensus: Record<string, unknown>;
  agreement: number;
}

export class PolyptotonMultiplier {
  private _variants: Map<string, PolyptotonVariant> = new Map();
  private _results: ProliferatedResult[] = [];
  private _quorumThreshold = 0.6;

  addVariant(variant: PolyptotonVariant): void {
    this._variants.set(variant.id, variant);
  }

  setQuorumThreshold(t: number): void {
    this._quorumThreshold = Math.max(0, Math.min(1, t));
  }

  proliferate(root: string): ProliferatedResult | undefined {
    const variants = Array.from(this._variants.values()).filter(v => v.root === root);
    if (variants.length === 0) return undefined;

    const processed = variants.map(v => ({
      form: v.form,
      output: v.processor(v.payload),
    }));

    const consensus = this._vote(processed);
    const agreement = this._agreement(processed, consensus);

    const result: ProliferatedResult = { root, variants: processed, consensus, agreement };
    this._results.push(result);
    return result;
  }

  private _vote(outputs: Array<{ form: string; output: Record<string, unknown> }>): Record<string, unknown> {
    const tally: Map<string, Map<string, number>> = new Map();
    for (const item of outputs) {
      for (const [key, value] of Object.entries(item.output)) {
        if (!tally.has(key)) tally.set(key, new Map());
        const str = String(value);
        tally.get(key)!.set(str, (tally.get(key)!.get(str) ?? 0) + 1);
      }
    }
    const consensus: Record<string, unknown> = {};
    for (const [key, counts] of tally) {
      let best = '';
      let max = 0;
      for (const [val, count] of counts) {
        if (count > max) { max = count; best = val; }
      }
      consensus[key] = best;
    }
    return consensus;
  }

  private _agreement(outputs: Array<{ form: string; output: Record<string, unknown> }>, consensus: Record<string, unknown>): number {
    if (outputs.length === 0) return 0;
    let totalMatch = 0;
    let totalKeys = 0;
    for (const item of outputs) {
      for (const [key, value] of Object.entries(consensus)) {
        totalKeys++;
        if (String(item.output[key]) === String(value)) totalMatch++;
      }
    }
    return totalKeys === 0 ? 0 : totalMatch / totalKeys;
  }

  proliferateAll(): ProliferatedResult[] {
    const roots = new Set(Array.from(this._variants.values()).map(v => v.root));
    return Array.from(roots).map(r => this.proliferate(r)!).filter(Boolean);
  }

  crossValidate(root: string): { passed: boolean; outliers: string[] } {
    const result = this.proliferate(root);
    if (!result) return { passed: false, outliers: [] };
    const outliers: string[] = [];
    for (const variant of result.variants) {
      let mismatch = 0;
      for (const [key, value] of Object.entries(result.consensus)) {
        if (String(variant.output[key]) !== String(value)) mismatch++;
      }
      if (mismatch / Math.max(1, Object.keys(result.consensus).length) > 1 - this._quorumThreshold) {
        outliers.push(variant.form);
      }
    }
    return { passed: result.agreement >= this._quorumThreshold, outliers };
  }

  averageAgreement(): number {
    if (this._results.length === 0) return 0;
    return this._results.reduce((s, r) => s + r.agreement, 0) / this._results.length;
  }

  roots(): string[] {
    return Array.from(new Set(Array.from(this._variants.values()).map(v => v.root)));
  }

  reset(): void {
    this._variants.clear();
    this._results = [];
  }

  get variantCount(): number {
    return this._variants.size;
  }

  get rootCount(): number {
    return this.roots().length;
  }

  get quorumThreshold(): number {
    return this._quorumThreshold;
  }
}
