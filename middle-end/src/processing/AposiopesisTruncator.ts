export interface NarrativeFlow {
  id: string;
  segments: Array<{ index: number; content: Record<string, unknown>; salience: number }>;
  climaxIndex: number | null;
  truncated: boolean;
}

export interface TruncationResult {
  flowId: string;
  deliveredSegments: number;
  withheldSegments: number;
  climaxReached: boolean;
  receiverPrompt: Record<string, unknown>;
}

interface GradientPoint {
  index: number;
  salience: number;
  gradient: number;
  acceleration: number;
  curvature: number;
}

interface ClimaxPrediction {
  index: number;
  confidence: number;
  peakType: 'sharp' | 'gradual' | 'plateau';
  preclimaxWindow: number;
}

export class AposiopesisTruncator {
  private _flows: Map<string, NarrativeFlow> = new Map();
  private _results: TruncationResult[] = [];
  private _salienceThreshold = 0.7;
  private _silenceWindow = 2;
  private _gradientHistory: Map<string, GradientPoint[]> = new Map();
  private _predictionCache: Map<string, ClimaxPrediction> = new Map();
  private _smoothingKernel = 3;

  registerFlow(flow: NarrativeFlow): void {
    this._flows.set(flow.id, flow);
    this._computeGradients(flow.id);
  }

  setSalienceThreshold(t: number): void {
    this._salienceThreshold = Math.max(0, Math.min(1, t));
    this._predictionCache.clear();
  }

  setSilenceWindow(n: number): void {
    this._silenceWindow = Math.max(0, n);
    this._predictionCache.clear();
  }

  setSmoothingKernel(size: number): void {
    this._smoothingKernel = Math.max(1, size);
    this._gradientHistory.clear();
    this._predictionCache.clear();
  }

  private _computeGradients(flowId: string): void {
    const flow = this._flows.get(flowId);
    if (!flow) return;

    const saliences = flow.segments.map(s => s.salience);
    const smoothed = this._smooth(saliences, this._smoothingKernel);
    const gradients: number[] = [];
    const accelerations: number[] = [];
    const curvatures: number[] = [];

    for (let i = 0; i < smoothed.length; i++) {
      const prev = i > 0 ? smoothed[i - 1] : smoothed[i];
      const next = i < smoothed.length - 1 ? smoothed[i + 1] : smoothed[i];
      gradients.push((next - prev) / 2);
    }

    for (let i = 0; i < gradients.length; i++) {
      const prev = i > 0 ? gradients[i - 1] : gradients[i];
      const next = i < gradients.length - 1 ? gradients[i + 1] : gradients[i];
      accelerations.push((next - prev) / 2);
    }

    for (let i = 0; i < accelerations.length; i++) {
      const prev = i > 0 ? accelerations[i - 1] : accelerations[i];
      const next = i < accelerations.length - 1 ? accelerations[i + 1] : accelerations[i];
      curvatures.push((next - prev) / 2);
    }

    const points: GradientPoint[] = flow.segments.map((seg, i) => ({
      index: seg.index,
      salience: smoothed[i],
      gradient: gradients[i],
      acceleration: accelerations[i],
      curvature: curvatures[i],
    }));

    this._gradientHistory.set(flowId, points);
  }

  private _smooth(values: number[], kernel: number): number[] {
    if (kernel <= 1 || values.length === 0) return [...values];
    const result: number[] = [];
    const half = Math.floor(kernel / 2);
    for (let i = 0; i < values.length; i++) {
      let sum = 0;
      let count = 0;
      for (let j = Math.max(0, i - half); j <= Math.min(values.length - 1, i + half); j++) {
        const dist = Math.abs(j - i);
        const weight = 1 - dist / (half + 1);
        sum += values[j] * weight;
        count += weight;
      }
      result.push(count > 0 ? sum / count : values[i]);
    }
    return result;
  }

  private _findClimax(flow: NarrativeFlow): ClimaxPrediction {
    const cacheKey = flow.id;
    if (this._predictionCache.has(cacheKey)) {
      return this._predictionCache.get(cacheKey)!;
    }

    const points = this._gradientHistory.get(flow.id) ?? [];
    if (points.length === 0) {
      const result: ClimaxPrediction = { index: -1, confidence: 0, peakType: 'sharp', preclimaxWindow: 0 };
      this._predictionCache.set(cacheKey, result);
      return result;
    }

    let bestIdx = -1;
    let bestScore = -1;
    let peakType: 'sharp' | 'gradual' | 'plateau' = 'sharp';

    for (let i = 1; i < points.length - 1; i++) {
      const pt = points[i];
      const prev = points[i - 1];
      const next = points[i + 1];
      
      const isPeak = prev.salience < pt.salience && pt.salience > next.salience;
      if (!isPeak) continue;

      const sharpness = Math.abs(pt.acceleration);
      const height = pt.salience;
      const preRise = pt.salience - points[Math.max(0, i - 3)].salience;
      
      const score = height * 0.5 + sharpness * 0.3 + Math.max(0, preRise) * 0.2;
      
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
        if (sharpness > 0.3) peakType = 'sharp';
        else if (sharpness < 0.1) peakType = 'plateau';
        else peakType = 'gradual';
      }
    }

    if (bestIdx === -1) {
      let maxSal = -1;
      for (let i = 0; i < points.length; i++) {
        if (points[i].salience > maxSal) {
          maxSal = points[i].salience;
          bestIdx = i;
        }
      }
      peakType = 'gradual';
    }

    let preclimaxWindow = 0;
    for (let i = bestIdx - 1; i >= 0; i--) {
      if (points[i].gradient > 0) preclimaxWindow++;
      else break;
    }

    const confidence = Math.min(1, bestScore + 0.3);
    const result: ClimaxPrediction = { index: bestIdx, confidence, peakType, preclimaxWindow };
    this._predictionCache.set(cacheKey, result);
    return result;
  }

  process(flowId: string): TruncationResult | undefined {
    const flow = this._flows.get(flowId);
    if (!flow) return undefined;

    const prediction = this._findClimax(flow);
    flow.climaxIndex = prediction.index >= 0 ? prediction.index : null;

    const climaxSalience = prediction.index >= 0 ? flow.segments[prediction.index].salience : 0;
    const shouldTruncate = climaxSalience >= this._salienceThreshold && prediction.confidence > 0.4;

    const dynamicWindow = Math.max(
      this._silenceWindow,
      Math.floor(prediction.preclimaxWindow * 0.5)
    );

    const delivered = shouldTruncate
      ? Math.max(0, prediction.index - dynamicWindow)
      : flow.segments.length;
    const withheld = flow.segments.length - delivered;

    flow.truncated = shouldTruncate;

    const receiverPrompt = shouldTruncate
      ? this._buildPrompt(flow, prediction)
      : { complete: true };

    const result: TruncationResult = {
      flowId,
      deliveredSegments: delivered,
      withheldSegments: withheld,
      climaxReached: shouldTruncate,
      receiverPrompt,
    };
    this._results.push(result);
    return result;
  }

  private _buildPrompt(flow: NarrativeFlow, prediction: ClimaxPrediction): Record<string, unknown> {
    const deliveredCount = Math.max(0, prediction.index - this._silenceWindow);
    const delivered = flow.segments.slice(0, deliveredCount);
    const upcomingHints = flow.segments.slice(
      Math.max(0, prediction.index - 1),
      prediction.index
    );

    return {
      complete: false,
      hintCount: delivered.length,
      lastHint: delivered[delivered.length - 1]?.content ?? null,
      inferredQuestion: 'what comes next at the climax?',
      establishedContext: delivered.map(s => s.content),
      climaxPrediction: {
        predictedIndex: prediction.index,
        confidence: prediction.confidence,
        peakType: prediction.peakType,
        buildupLength: prediction.preclimaxWindow,
      },
      upcomingTeaser: upcomingHints.map(s => s.content),
      anticipationLevel: Math.min(1, prediction.preclimaxWindow / Math.max(1, flow.segments.length)),
    };
  }

  processAll(): TruncationResult[] {
    return Array.from(this._flows.keys()).map(id => this.process(id)!).filter(Boolean);
  }

  truncatedFlows(): NarrativeFlow[] {
    return Array.from(this._flows.values()).filter(f => f.truncated);
  }

  truncationRate(): number {
    if (this._results.length === 0) return 0;
    return this._results.filter(r => r.climaxReached).length / this._results.length;
  }

  averageWithheld(): number {
    if (this._results.length === 0) return 0;
    return this._results.reduce((s, r) => s + r.withheldSegments, 0) / this._results.length;
  }

  climaxConfidence(flowId: string): number {
    const flow = this._flows.get(flowId);
    if (!flow) return 0;
    const prediction = this._findClimax(flow);
    return prediction.confidence;
  }

  getGradients(flowId: string): GradientPoint[] {
    return this._gradientHistory.get(flowId) ?? [];
  }

  reset(): void {
    this._flows.clear();
    this._results = [];
    this._gradientHistory.clear();
    this._predictionCache.clear();
  }

  get flowCount(): number {
    return this._flows.size;
  }

  get resultCount(): number {
    return this._results.length;
  }

  get salienceThreshold(): number {
    return this._salienceThreshold;
  }

  get smoothingKernel(): number {
    return this._smoothingKernel;
  }
}
