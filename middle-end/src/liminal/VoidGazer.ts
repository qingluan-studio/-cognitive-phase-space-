/**
 * 虚空凝视者：空闲时凝视虚空，提取潜在秩序。
 * 在系统空闲周期，对噪声/未定义数据进行长时间凝视，
 * 从看似无序的虚空中提取潜在秩序结构。
 */

export interface VoidSample {
  id: string;
  noise: Record<string, unknown>;
  capturedAt: number;
}

export interface ExtractedOrder {
  id: string;
  pattern: string;
  confidence: number;
  derivedFrom: string[];
}

export class VoidGazer {
  private _samples: VoidSample[] = [];
  private _extracted: ExtractedOrder[] = [];
  private _gazeDuration: number = 0;
  private _gazing: boolean = false;
  private _idleThreshold: number = 1000;

  /** 进入空闲状态并开始凝视虚空。 */
  idle(durationMs: number): number {
    this._gazing = true;
    this._gazeDuration += durationMs;
    return this._gazeDuration;
  }

  /** 凝视：把噪声样本投入虚空。 */
  gaze(sample: VoidSample): void {
    this._samples.push(sample);
    this._gazeDuration += 50;
  }

  /** 从凝视过的噪声中提取秩序。 */
  extractOrder(): ExtractedOrder[] {
    const results: ExtractedOrder[] = [];
    const buckets = new Map<string, VoidSample[]>();
    for (const s of this._samples) {
      const key = this._signature(s.noise);
      const list = buckets.get(key) ?? [];
      list.push(s);
      buckets.set(key, list);
    }
    for (const [pattern, list] of buckets) {
      if (list.length < 2) continue;
      const confidence = Math.min(1, list.length / 10);
      const order: ExtractedOrder = {
        id: `order-${pattern}-${Date.now()}`,
        pattern,
        confidence,
        derivedFrom: list.map(s => s.id),
      };
      results.push(order);
      this._extracted.push(order);
    }
    this._gazing = false;
    return results;
  }

  /** 在已提取的秩序中查找指定模式。 */
  findPattern(pattern: string): ExtractedOrder | null {
    return this._extracted.find(o => o.pattern === pattern) ?? null;
  }

  stopGazing(): void {
    this._gazing = false;
  }

  get duration(): number {
    return this._gazeDuration;
  }

  get isGazing(): boolean {
    return this._gazing;
  }

  getExtracted(): ExtractedOrder[] {
    return [...this._extracted];
  }

  get sampleCount(): number {
    return this._samples.length;
  }

  private _signature(noise: Record<string, unknown>): string {
    const keys = Object.keys(noise).sort();
    return keys.map(k => `${k}:${typeof noise[k]}`).join('|');
  }
}
