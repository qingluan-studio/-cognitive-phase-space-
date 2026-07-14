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

interface VariantWeight {
  variantId: string;
  form: string;
  baseWeight: number;
  adaptiveWeight: number;
  confidence: number;
  reliability: number;
}

interface ConsensusKey {
  key: string;
  values: Map<string, number>;
  weightedEntropy: number;
  convergence: number;
}

export class PolyptotonMultiplier {
  private _variants: Map<string, PolyptotonVariant> = new Map();
  private _results: ProliferatedResult[] = [];
  private _quorumThreshold = 0.6;
  private _weights: Map<string, VariantWeight> = new Map();
  private _reliabilityHistory: Map<string, number[]> = new Map();
  private _maxHistory = 32;
  private _convergenceCache: Map<string, ConsensusKey[]> = new Map();

  addVariant(variant: PolyptotonVariant): void {
    this._variants.set(variant.id, variant);
    this._weights.set(variant.id, {
      variantId: variant.id,
      form: variant.form,
      baseWeight: 1,
      adaptiveWeight: 1,
      confidence: 0.5,
      reliability: 0.5,
    });
    this._convergenceCache.delete(variant.root);
  }

  setQuorumThreshold(t: number): void {
    this._quorumThreshold = Math.max(0, Math.min(1, t));
  }

  setVariantWeight(variantId: string, weight: number): void {
    const w = this._weights.get(variantId);
    if (w) {
      w.baseWeight = Math.max(0, weight);
      const variant = this._variants.get(variantId);
      if (variant) this._convergenceCache.delete(variant.root);
    }
  }

  proliferate(root: string): ProliferatedResult | undefined {
    const variants = Array.from(this._variants.values()).filter(v => v.root === root);
    if (variants.length === 0) return undefined;

    const processed = variants.map(v => ({
      id: v.id,
      form: v.form,
      output: v.processor(v.payload),
    }));

    const convergenceKeys = this._computeConvergence(processed, root);
    const consensus = this._weightedVote(convergenceKeys, processed);
    const agreement = this._computeAgreement(convergenceKeys, processed);

    this._updateReliability(variants, consensus, agreement);

    const result: ProliferatedResult = {
      root,
      variants: processed.map(p => ({ form: p.form, output: p.output })),
      consensus,
      agreement,
    };
    this._results.push(result);
    return result;
  }

  private _computeConvergence(
    outputs: Array<{ id: string; form: string; output: Record<string, unknown> }>,
    root: string
  ): ConsensusKey[] {
    const cacheKey = root + ':' + outputs.map(o => o.id).sort().join('|');
    if (this._convergenceCache.has(cacheKey)) {
      return this._convergenceCache.get(cacheKey)!;
    }

    const keyMap = new Map<string, ConsensusKey>();
    
    for (const item of outputs) {
      const weight = this._weights.get(item.id)?.adaptiveWeight ?? 1;
      for (const [key, value] of Object.entries(item.output)) {
        if (!keyMap.has(key)) {
          keyMap.set(key, {
            key,
            values: new Map(),
            weightedEntropy: 0,
            convergence: 0,
          });
        }
        const ck = keyMap.get(key)!;
        const valStr = String(value);
        const current = ck.values.get(valStr) ?? 0;
        ck.values.set(valStr, current + weight);
      }
    }

    const result: ConsensusKey[] = [];
    for (const ck of keyMap.values()) {
      const totalWeight = [...ck.values.values()].reduce((s, v) => s + v, 0);
      let entropy = 0;
      let maxWeight = 0;
      for (const w of ck.values.values()) {
        if (w > maxWeight) maxWeight = w;
        const p = w / totalWeight;
        if (p > 0) entropy -= p * Math.log2(p);
      }
      const maxEntropy = Math.log2(ck.values.size || 1);
      ck.weightedEntropy = maxEntropy === 0 ? 0 : entropy / maxEntropy;
      ck.convergence = totalWeight === 0 ? 0 : maxWeight / totalWeight;
      result.push(ck);
    }

    this._convergenceCache.set(cacheKey, result);
    return result;
  }

  private _weightedVote(
    convergenceKeys: ConsensusKey[],
    outputs: Array<{ id: string; form: string; output: Record<string, unknown> }>
  ): Record<string, unknown> {
    const consensus: Record<string, unknown> = {};
    
    for (const ck of convergenceKeys) {
      let bestVal = '';
      let bestWeight = -1;
      let numericAccum = 0;
      let numericTotal = 0;
      let allNumeric = true;

      for (const [valStr, weight] of ck.values.entries()) {
        if (weight > bestWeight) {
          bestWeight = weight;
          bestVal = valStr;
        }
        const num = Number(valStr);
        if (!isNaN(num)) {
          numericAccum += num * weight;
          numericTotal += weight;
        } else {
          allNumeric = false;
        }
      }

      if (allNumeric && numericTotal > 0 && ck.convergence < 0.8) {
        consensus[ck.key] = numericAccum / numericTotal;
      } else {
        const numVal = Number(bestVal);
        consensus[ck.key] = !isNaN(numVal) && ck.convergence >= 0.8 ? numVal : bestVal;
      }
    }

    return consensus;
  }

  private _computeAgreement(
    convergenceKeys: ConsensusKey[],
    outputs: Array<{ id: string; form: string; output: Record<string, unknown> }>
  ): number {
    if (convergenceKeys.length === 0) return 0;
    
    let totalConvergence = 0;
    let totalWeight = 0;
    
    for (const ck of convergenceKeys) {
      const keyWeight = 1 + ck.values.size * 0.1;
      totalConvergence += ck.convergence * keyWeight;
      totalWeight += keyWeight;
    }
    
    return totalWeight === 0 ? 0 : totalConvergence / totalWeight;
  }

  private _updateReliability(
    variants: PolyptotonVariant[],
    consensus: Record<string, unknown>,
    agreement: number
  ): void {
    for (const variant of variants) {
      const w = this._weights.get(variant.id);
      if (!w) continue;

      const output = variant.processor(variant.payload);
      let matchScore = 0;
      let keyCount = 0;
      
      for (const [key, val] of Object.entries(consensus)) {
        keyCount++;
        if (key in output) {
          const outVal = output[key];
          if (typeof val === 'number' && typeof outVal === 'number') {
            const maxAbs = Math.max(Math.abs(val), Math.abs(outVal), 1);
            matchScore += 1 - Math.min(1, Math.abs(val - outVal) / maxAbs);
          } else if (String(outVal) === String(val)) {
            matchScore += 1;
          }
        }
      }
      
      const accuracy = keyCount === 0 ? 0.5 : matchScore / keyCount;
      const history = this._reliabilityHistory.get(variant.id) ?? [];
      history.push(accuracy);
      if (history.length > this._maxHistory) history.shift();
      this._reliabilityHistory.set(variant.id, history);
      
      const avgReliability = history.reduce((s, v) => s + v, 0) / history.length;
      w.reliability = avgReliability;
      w.confidence = accuracy;
      w.adaptiveWeight = w.baseWeight * (0.5 + 0.5 * avgReliability);
    }
    
    if (variants.length > 0) {
      this._convergenceCache.delete(variants[0].root);
    }
  }

  proliferateAll(): ProliferatedResult[] {
    const roots = new Set(Array.from(this._variants.values()).map(v => v.root));
    return Array.from(roots).map(r => this.proliferate(r)!).filter(Boolean);
  }

  crossValidate(root: string): { passed: boolean; outliers: string[] } {
    const result = this.proliferate(root);
    if (!result) return { passed: false, outliers: [] };
    
    const outliers: string[] = [];
    const variants = Array.from(this._variants.values()).filter(v => v.root === root);
    
    for (const variant of variants) {
      const w = this._weights.get(variant.id);
      if (!w) continue;
      
      if (w.confidence < 1 - this._quorumThreshold) {
        outliers.push(variant.form);
      }
    }
    
    return { passed: result.agreement >= this._quorumThreshold, outliers };
  }

  getVariantWeight(variantId: string): VariantWeight | undefined {
    return this._weights.get(variantId);
  }

  getReliabilityHistory(variantId: string): number[] {
    return this._reliabilityHistory.get(variantId) ?? [];
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
    this._weights.clear();
    this._reliabilityHistory.clear();
    this._convergenceCache.clear();
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
