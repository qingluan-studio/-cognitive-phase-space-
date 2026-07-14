/**
 * 顿绝截断器模块：在信息流到达最关键时刻主动沉默截断，
 * 迫使接收方基于已建立的上下文自行生成答案，激发主动推理。
 */

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

export class AposiopesisTruncator {
  private _flows: Map<string, NarrativeFlow> = new Map();
  private _results: TruncationResult[] = [];
  private _salienceThreshold = 0.7;
  private _silenceWindow = 2;

  registerFlow(flow: NarrativeFlow): void {
    this._flows.set(flow.id, flow);
  }

  setSalienceThreshold(t: number): void {
    this._salienceThreshold = Math.max(0, Math.min(1, t));
  }

  setSilenceWindow(n: number): void {
    this._silenceWindow = Math.max(0, n);
  }

  private _findClimax(flow: NarrativeFlow): number {
    let climaxIdx = -1;
    let maxSalience = 0;
    flow.segments.forEach((seg, idx) => {
      if (seg.salience > maxSalience) {
        maxSalience = seg.salience;
        climaxIdx = idx;
      }
    });
    return climaxIdx;
  }

  process(flowId: string): TruncationResult | undefined {
    const flow = this._flows.get(flowId);
    if (!flow) return undefined;

    const climaxIdx = this._findClimax(flow);
    flow.climaxIndex = climaxIdx >= 0 ? climaxIdx : null;

    const climaxSalience = climaxIdx >= 0 ? flow.segments[climaxIdx].salience : 0;
    const shouldTruncate = climaxSalience >= this._salienceThreshold;

    const delivered = shouldTruncate
      ? Math.max(0, climaxIdx - this._silenceWindow)
      : flow.segments.length;
    const withheld = flow.segments.length - delivered;

    flow.truncated = shouldTruncate;

    const receiverPrompt = shouldTruncate
      ? this._buildPrompt(flow, climaxIdx)
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

  private _buildPrompt(flow: NarrativeFlow, climaxIdx: number): Record<string, unknown> {
    const delivered = flow.segments.slice(0, Math.max(0, climaxIdx - this._silenceWindow));
    return {
      complete: false,
      hintCount: delivered.length,
      lastHint: delivered[delivered.length - 1]?.content ?? null,
      inferredQuestion: 'what comes next at the climax?',
      establishedContext: delivered.map(s => s.content),
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

  reset(): void {
    this._flows.clear();
    this._results = [];
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
}
