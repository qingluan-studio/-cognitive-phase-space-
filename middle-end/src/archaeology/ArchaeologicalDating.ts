import { KnowledgeUnit, DataPacket, Signal } from '../shared/types';

export interface DatingSample {
  id: string;
  material: string;
  context: string;
  isotopicRatio: number;
  contaminationLevel: number;
  associatedArtifacts: string[];
}

export interface DatingResult {
  sampleId: string;
  estimatedAge: number;
  marginOfError: number;
  confidence: number;
  method: string;
  calibrationCurve: string;
}

export interface TemporalContext {
  layerId: string;
  averageAge: number;
  dateRange: { min: number; max: number };
  samples: DatingResult[];
  chronologicalPosition: number;
}

export interface SeriationSequence {
  id: string;
  items: string[];
  order: string[];
  confidence: number;
  styleHorizons: string[];
}

export interface DendrochronologyRing {
  year: number;
  width: number;
  density: number;
  climateSignal: number;
}

export class ArchaeologicalDating {
  private _samples: Map<string, DatingSample>;
  private _results: Map<string, DatingResult>;
  private _temporalContexts: Map<string, TemporalContext>;
  private _seriationSequences: Map<string, SeriationSequence>;
  private _dendroRecord: DendrochronologyRing[];
  private _referenceHalfLife: number;
  private _calibrationData: Map<string, number[]>;

  constructor(referenceHalfLife: number = 5730) {
    this._samples = new Map();
    this._results = new Map();
    this._temporalContexts = new Map();
    this._seriationSequences = new Map();
    this._dendroRecord = [];
    this._referenceHalfLife = referenceHalfLife;
    this._calibrationData = new Map();
  }

  get sampleCount(): number { return this._samples.size; }
  get resultCount(): number { return this._results.size; }
  get contextCount(): number { return this._temporalContexts.size; }
  get referenceHalfLife(): number { return this._referenceHalfLife; }

  public addSample(sample: DatingSample): void {
    this._samples.set(sample.id, sample);
  }

  public createSample(id: string, material: string, isotopicRatio: number, contaminationLevel: number = 0): DatingSample {
    const sample: DatingSample = {
      id,
      material,
      context: '',
      isotopicRatio,
      contaminationLevel,
      associatedArtifacts: []
    };
    this._samples.set(id, sample);
    return sample;
  }

  public radiocarbonDate(sampleId: string): DatingResult | null {
    const sample = this._samples.get(sampleId);
    if (!sample) return null;

    const ratio = sample.isotopicRatio;
    const contamination = sample.contaminationLevel;
    const adjustedRatio = ratio * (1 - contamination) + this._modernRatio() * contamination;

    const age = -this._referenceHalfLife * Math.log2(adjustedRatio / this._modernRatio());
    const error = age * 0.05 * (1 + contamination * 2);
    const confidence = Math.max(0, 1 - contamination * 0.5 - error / Math.max(1, age));

    const result: DatingResult = {
      sampleId,
      estimatedAge: Math.max(0, age),
      marginOfError: error,
      confidence,
      method: 'radiocarbon',
      calibrationCurve: 'IntCal20'
    };

    this._results.set(sampleId, result);
    return result;
  }

  public dateByStratigraphy(sampleId: string, layerDepth: number, accumulationRate: number): DatingResult | null {
    const sample = this._samples.get(sampleId);
    if (!sample) return null;

    const age = layerDepth * accumulationRate;
    const error = age * 0.15;

    const result: DatingResult = {
      sampleId,
      estimatedAge: age,
      marginOfError: error,
      confidence: 0.7,
      method: 'stratigraphic',
      calibrationCurve: 'linear_accumulation'
    };

    this._results.set(sampleId, result);
    return result;
  }

  public dateBySeriation(sampleId: string, sequenceId: string): DatingResult | null {
    const sample = this._samples.get(sampleId);
    const sequence = this._seriationSequences.get(sequenceId);
    if (!sample || !sequence) return null;

    const position = sequence.items.indexOf(sampleId);
    if (position === -1) return null;

    const relativeAge = position / Math.max(1, sequence.items.length - 1);
    const age = relativeAge * this._maxSequenceAge(sequence);
    const error = age * (1 - sequence.confidence) * 0.5;

    const result: DatingResult = {
      sampleId,
      estimatedAge: age,
      marginOfError: error,
      confidence: sequence.confidence * 0.8,
      method: 'seriation',
      calibrationCurve: sequenceId
    };

    this._results.set(sampleId, result);
    return result;
  }

  public dateByDendrochronology(sampleId: string, ringPattern: number[]): DatingResult | null {
    const sample = this._samples.get(sampleId);
    if (!sample || this._dendroRecord.length === 0) return null;

    const correlation = this._findDendroMatch(ringPattern);
    const matchIndex = correlation.bestMatch;

    if (correlation.confidence < 0.5) {
      return {
        sampleId,
        estimatedAge: 0,
        marginOfError: Infinity,
        confidence: 0,
        method: 'dendrochronology',
        calibrationCurve: 'master_chronology'
      };
    }

    const age = this._dendroRecord.length - matchIndex - ringPattern.length;
    const error = (1 - correlation.confidence) * 50;

    const result: DatingResult = {
      sampleId,
      estimatedAge: age,
      marginOfError: error,
      confidence: correlation.confidence,
      method: 'dendrochronology',
      calibrationCurve: 'master_chronology'
    };

    this._results.set(sampleId, result);
    return result;
  }

  public buildTemporalContext(layerId: string, sampleIds: string[]): TemporalContext | null {
    const results: DatingResult[] = [];
    for (const id of sampleIds) {
      const result = this._results.get(id);
      if (result) results.push(result);
    }

    if (results.length === 0) return null;

    const weightedAge = this._weightedAverage(results);
    const minAge = Math.min(...results.map(r => r.estimatedAge - r.marginOfError));
    const maxAge = Math.max(...results.map(r => r.estimatedAge + r.marginOfError));
    const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;

    const context: TemporalContext = {
      layerId,
      averageAge: weightedAge,
      dateRange: { min: Math.max(0, minAge), max: maxAge },
      samples: results,
      chronologicalPosition: 0
    };

    this._temporalContexts.set(layerId, context);
    this._updateChronologicalPositions();
    return context;
  }

  public performSeriation(sequenceId: string, items: string[], attributes: Map<string, number[]>): SeriationSequence {
    const order = this._seriateByFrequency(items, attributes);
    const styleHorizons = this._detectStyleHorizons(order, attributes);
    const confidence = this._calculateSeriationConfidence(order, attributes);

    const sequence: SeriationSequence = {
      id: sequenceId,
      items: [...items],
      order,
      confidence,
      styleHorizons
    };

    this._seriationSequences.set(sequenceId, sequence);
    return sequence;
  }

  public addDendroRing(ring: DendrochronologyRing): void {
    this._dendroRecord.push(ring);
    this._dendroRecord.sort((a, b) => a.year - b.year);
  }

  public buildMasterChronology(rings: DendrochronologyRing[]): void {
    this._dendroRecord = [...rings].sort((a, b) => a.year - b.year);
  }

  public calibrateDate(sampleId: string, curveName: string): DatingResult | null {
    const result = this._results.get(sampleId);
    if (!result) return null;

    const curve = this._calibrationData.get(curveName);
    if (!curve) return result;

    const calibratedAge = this._interpolateCalibration(result.estimatedAge, curve);
    const calibrated: DatingResult = {
      ...result,
      estimatedAge: calibratedAge,
      calibrationCurve: curveName
    };

    this._results.set(sampleId, calibrated);
    return calibrated;
  }

  public addCalibrationCurve(name: string, data: number[]): void {
    this._calibrationData.set(name, data);
  }

  public crossValidate(sampleId: string): { consistent: boolean; methods: string[]; variance: number } {
    const sampleResults: DatingResult[] = [];
    for (const result of this._results.values()) {
      if (result.sampleId === sampleId) {
        sampleResults.push(result);
      }
    }

    if (sampleResults.length < 2) {
      return { consistent: true, methods: [], variance: 0 };
    }

    const ages = sampleResults.map(r => r.estimatedAge);
    const mean = ages.reduce((a, b) => a + b, 0) / ages.length;
    const variance = ages.reduce((sum, a) => sum + (a - mean) ** 2, 0) / ages.length;
    const stdDev = Math.sqrt(variance);

    const consistent = stdDev < mean * 0.2;
    const methods = sampleResults.map(r => r.method);

    return { consistent, methods, variance };
  }

  public getOldestSample(): DatingResult | null {
    let oldest: DatingResult | null = null;
    let maxAge = -Infinity;
    for (const result of this._results.values()) {
      if (result.estimatedAge > maxAge) {
        maxAge = result.estimatedAge;
        oldest = result;
      }
    }
    return oldest;
  }

  public getYoungestSample(): DatingResult | null {
    let youngest: DatingResult | null = null;
    let minAge = Infinity;
    for (const result of this._results.values()) {
      if (result.estimatedAge < minAge) {
        minAge = result.estimatedAge;
        youngest = result;
      }
    }
    return youngest;
  }

  public getContext(layerId: string): TemporalContext | null {
    return this._temporalContexts.get(layerId) || null;
  }

  public compareChronology(contextA: string, contextB: string): number {
    const a = this._temporalContexts.get(contextA);
    const b = this._temporalContexts.get(contextB);
    if (!a || !b) return 0;

    const overlap = Math.min(a.dateRange.max, b.dateRange.max) - Math.max(a.dateRange.min, b.dateRange.min);
    const total = Math.max(a.dateRange.max, b.dateRange.max) - Math.min(a.dateRange.min, b.dateRange.min);
    return total > 0 ? overlap / total : 0;
  }

  public extractTemporalSignal(sampleId: string): Signal | null {
    const result = this._results.get(sampleId);
    if (!result) return null;

    return {
      source: `dating:${sampleId}`,
      magnitude: result.estimatedAge,
      entropy: 1 - result.confidence,
      timestamp: Date.now() - result.estimatedAge
    };
  }

  private _modernRatio(): number {
    return 1.0;
  }

  private _maxSequenceAge(sequence: SeriationSequence): number {
    return sequence.items.length * 1000;
  }

  private _findDendroMatch(pattern: number[]): { bestMatch: number; confidence: number } {
    if (this._dendroRecord.length < pattern.length) {
      return { bestMatch: -1, confidence: 0 };
    }

    const widths = this._dendroRecord.map(r => r.width);
    let bestCorr = -1;
    let bestIdx = 0;

    for (let i = 0; i <= widths.length - pattern.length; i++) {
      const corr = this._correlation(pattern, widths.slice(i, i + pattern.length));
      if (corr > bestCorr) {
        bestCorr = corr;
        bestIdx = i;
      }
    }

    return { bestMatch: bestIdx, confidence: Math.max(0, bestCorr) };
  }

  private _correlation(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0;

    const meanA = a.reduce((s, x) => s + x, 0) / a.length;
    const meanB = b.reduce((s, x) => s + x, 0) / b.length;

    let num = 0;
    let denA = 0;
    let denB = 0;

    for (let i = 0; i < a.length; i++) {
      const da = a[i] - meanA;
      const db = b[i] - meanB;
      num += da * db;
      denA += da * da;
      denB += db * db;
    }

    const den = Math.sqrt(denA * denB);
    return den === 0 ? 0 : num / den;
  }

  private _weightedAverage(results: DatingResult[]): number {
    let weightedSum = 0;
    let weightSum = 0;
    for (const result of results) {
      const weight = result.confidence / Math.max(1, result.marginOfError);
      weightedSum += result.estimatedAge * weight;
      weightSum += weight;
    }
    return weightSum > 0 ? weightedSum / weightSum : 0;
  }

  private _updateChronologicalPositions(): void {
    const contexts = Array.from(this._temporalContexts.values()).sort((a, b) => a.averageAge - b.averageAge);
    contexts.forEach((ctx, idx) => {
      ctx.chronologicalPosition = idx;
    });
  }

  private _seriateByFrequency(items: string[], attributes: Map<string, number[]>): string[] {
    const indexed = items.map((item, idx) => ({
      item,
      index: idx,
      attrs: attributes.get(item) || []
    }));

    indexed.sort((a, b) => {
      const sumA = a.attrs.reduce((s, x) => s + x, 0);
      const sumB = b.attrs.reduce((s, x) => s + x, 0);
      return sumB - sumA;
    });

    return indexed.map(x => x.item);
  }

  private _detectStyleHorizons(order: string[], attributes: Map<string, number[]>): string[] {
    const horizons: string[] = [];
    if (order.length < 3) return horizons;

    for (let i = 1; i < order.length - 1; i++) {
      const prev = attributes.get(order[i - 1]) || [];
      const curr = attributes.get(order[i]) || [];
      const next = attributes.get(order[i + 1]) || [];

      const diffPrev = this._attributeDifference(prev, curr);
      const diffNext = this._attributeDifference(curr, next);

      if (diffPrev > 0.5 && diffNext > 0.5) {
        horizons.push(order[i]);
      }
    }

    return horizons;
  }

  private _attributeDifference(a: number[], b: number[]): number {
    const len = Math.max(a.length, b.length);
    let diff = 0;
    for (let i = 0; i < len; i++) {
      diff += Math.abs((a[i] || 0) - (b[i] || 0));
    }
    return diff / len;
  }

  private _calculateSeriationConfidence(order: string[], attributes: Map<string, number[]>): number {
    if (order.length < 2) return 1;

    let monotonicity = 0;
    let comparisons = 0;

    for (let i = 0; i < order.length - 1; i++) {
      const curr = attributes.get(order[i]) || [];
      const next = attributes.get(order[i + 1]) || [];
      const diff = this._attributeDifference(curr, next);
      monotonicity += diff;
      comparisons++;
    }

    return Math.min(1, monotonicity / Math.max(1, comparisons));
  }

  private _interpolateCalibration(age: number, curve: number[]): number {
    const idx = Math.min(curve.length - 1, Math.floor(age / 100));
    return curve[idx] || age;
  }

  public processPacket(packet: DataPacket<DatingSample>): DataPacket<DatingResult> {
    this.addSample(packet.payload);
    const result = this.radiocarbonDate(packet.payload.id);
    return {
      id: `dated-${packet.id}`,
      payload: result!,
      metadata: {
        ...packet.metadata,
        route: [...packet.metadata.route, 'ArchaeologicalDating']
      }
    };
  }

  public reset(): void {
    this._samples.clear();
    this._results.clear();
    this._temporalContexts.clear();
    this._seriationSequences.clear();
    this._dendroRecord = [];
    this._calibrationData.clear();
  }
}
