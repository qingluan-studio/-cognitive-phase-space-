export interface MemeVariant {
  id: string;
  payload: string;
  virulence: number;
  harmless: boolean;
  mutationRate: number;
  complexity: number;
}

export interface Antibody {
  pattern: string;
  affinity: number;
  raisedAt: number;
  neutralizations: number;
  decayRate: number;
  specificity: number;
}

export interface InoculationRecord {
  variantId: string;
  antibodyGenerated: string;
  reaction: 'none' | 'mild' | 'immune' | 'overwhelmed';
  timestamp: number;
  efficacy: number;
}

export interface ImmuneResponse {
  detected: boolean;
  neutralized: boolean;
  antibody: Antibody | null;
  latency: number;
  cascadeLevel: number;
}

export class MemeticInoculation {
  private _variants: Map<string, MemeVariant> = new Map();
  private _antibodies: Map<string, Antibody> = new Map();
  private _records: InoculationRecord[] = [];
  private _immuneMemory = 0;
  private _boosterInterval = 86400000;
  private _lastBooster = 0;
  private _crossReactivityMatrix: Map<string, Map<string, number>> = new Map();
  private _mutationThreshold = 0.3;

  registerVariant(variant: MemeVariant): void {
    this._variants.set(variant.id, { ...variant });
    this._updateCrossReactivity(variant);
  }

  private _updateCrossReactivity(variant: MemeVariant): void {
    const matrix = new Map<string, number>();
    for (const [id, other] of this._variants) {
      if (id === variant.id) continue;
      const similarity = this._computeSimilarity(variant.payload, other.payload);
      matrix.set(id, similarity);
    }
    this._crossReactivityMatrix.set(variant.id, matrix);
  }

  private _computeSimilarity(a: string, b: string): number {
    const minLen = Math.min(a.length, b.length);
    const maxLen = Math.max(a.length, b.length);
    let matches = 0;
    for (let i = 0; i < minLen; i++) {
      if (a.charCodeAt(i) === b.charCodeAt(i)) matches++;
    }
    const hamming = matches / maxLen;
    const prefixMatch = a.substring(0, 10) === b.substring(0, 10) ? 0.2 : 0;
    return hamming + prefixMatch;
  }

  inoculate(variantId: string): InoculationRecord {
    const variant = this._variants.get(variantId);
    if (!variant) throw new Error(`Unknown variant: ${variantId}`);

    const antibodyPattern = this._deriveAntibody(variant.payload, variant.complexity);
    const baseAffinity = 1 - variant.virulence * 0.7;
    const specificity = Math.max(0.3, 1 - variant.mutationRate);

    const antibody: Antibody = {
      pattern: antibodyPattern,
      affinity: baseAffinity,
      raisedAt: Date.now(),
      neutralizations: 0,
      decayRate: 0.001 + variant.virulence * 0.002,
      specificity,
    };

    this._antibodies.set(antibodyPattern, antibody);
    this._immuneMemory += baseAffinity * specificity;

    const reaction = this._determineReaction(variant);
    const efficacy = this._calculateEfficacy(variant, antibody);

    const record: InoculationRecord = {
      variantId,
      antibodyGenerated: antibodyPattern,
      reaction,
      timestamp: Date.now(),
      efficacy,
    };

    this._records.push(record);
    return record;
  }

  private _determineReaction(variant: MemeVariant): InoculationRecord['reaction'] {
    if (variant.harmless && variant.virulence < 0.2) return 'immune';
    if (variant.virulence < 0.5) return 'mild';
    if (variant.virulence < 0.8) return 'none';
    return 'overwhelmed';
  }

  private _calculateEfficacy(variant: MemeVariant, antibody: Antibody): number {
    const complexityFactor = 1 - variant.complexity * 0.1;
    const mutationFactor = 1 - variant.mutationRate * antibody.specificity;
    return antibody.affinity * complexityFactor * mutationFactor;
  }

  private _deriveAntibody(payload: string, complexity: number): string {
    let hash = 5381;
    for (let i = 0; i < payload.length; i++) {
      hash = ((hash << 5) + hash + payload.charCodeAt(i)) >>> 0;
    }
    const salt = complexity * 10000 | 0;
    const crc = this._crc32(payload);
    return `ab-${hash.toString(16)}-${salt}-${crc.toString(16).padStart(8, '0')}`;
  }

  private _crc32(str: string): number {
    let crc = 0xffffffff;
    for (let i = 0; i < str.length; i++) {
      crc ^= str.charCodeAt(i);
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
      }
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  encounterThreat(threatPayload: string): ImmuneResponse {
    const start = Date.now();
    const pattern = this._deriveAntibody(threatPayload, this._estimateComplexity(threatPayload));
    const antibody = this._antibodies.get(pattern);

    if (antibody && antibody.affinity > 0.4) {
      antibody.neutralizations++;
      antibody.affinity = Math.min(1, antibody.affinity + 0.01);
      const latency = Date.now() - start;
      return {
        detected: true,
        neutralized: true,
        antibody: { ...antibody },
        latency,
        cascadeLevel: 1,
      };
    }

    const crossMatch = this._findCrossReactiveAntibody(threatPayload);
    if (crossMatch) {
      crossMatch.neutralizations++;
      const latency = Date.now() - start;
      return {
        detected: true,
        neutralized: crossMatch.affinity > 0.3,
        antibody: { ...crossMatch },
        latency,
        cascadeLevel: 2,
      };
    }

    return {
      detected: false,
      neutralized: false,
      antibody: null,
      latency: Date.now() - start,
      cascadeLevel: 0,
    };
  }

  private _estimateComplexity(payload: string): number {
    const uniqueChars = new Set(payload).size;
    const entropy = uniqueChars / 95;
    const lengthFactor = Math.min(1, payload.length / 100);
    return entropy * lengthFactor;
  }

  private _findCrossReactiveAntibody(payload: string): Antibody | null {
    let bestMatch: Antibody | null = null;
    let bestScore = 0;

    for (const antibody of this._antibodies.values()) {
      const storedPayload = antibody.pattern.split('-')[1];
      const similarity = this._computeSimilarity(payload, storedPayload);
      const adjustedAffinity = antibody.affinity * similarity * antibody.specificity;

      if (adjustedAffinity > bestScore && adjustedAffinity > 0.3) {
        bestScore = adjustedAffinity;
        bestMatch = antibody;
      }
    }

    return bestMatch;
  }

  boosterShot(): number {
    const now = Date.now();
    if (now - this._lastBooster < this._boosterInterval) return 0;
    this._lastBooster = now;

    let boosted = 0;
    for (const antibody of this._antibodies.values()) {
      const decay = antibody.decayRate * (now - antibody.raisedAt) / 3600000;
      const currentAffinity = Math.max(0.1, antibody.affinity - decay);
      antibody.affinity = Math.min(1, currentAffinity + 0.15);
      antibody.raisedAt = now;
      boosted++;
    }

    return boosted;
  }

  updateAntibodyDecay(): void {
    const now = Date.now();
    for (const antibody of this._antibodies.values()) {
      const hoursSinceRaised = (now - antibody.raisedAt) / 3600000;
      antibody.affinity = Math.max(0.1, antibody.affinity - antibody.decayRate * hoursSinceRaised);
    }
    this._immuneMemory = Array.from(this._antibodies.values())
      .reduce((sum, ab) => sum + ab.affinity * ab.specificity, 0);
  }

  getAntibodies(): Antibody[] {
    return Array.from(this._antibodies.values()).map(a => ({ ...a }));
  }

  getInoculationHistory(): InoculationRecord[] {
    return [...this._records];
  }

  setBoosterInterval(ms: number): void {
    this._boosterInterval = ms;
  }

  get immuneMemory(): number {
    return this._immuneMemory;
  }

  get antibodyCount(): number {
    return this._antibodies.size;
  }

  get activeAntibodyCount(): number {
    return Array.from(this._antibodies.values()).filter(a => a.affinity > 0.4).length;
  }
}