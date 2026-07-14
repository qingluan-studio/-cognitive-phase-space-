/**
 * 恐怖谷嗅探器：检测AI输出中令人不适的非人模式。
 * 对输出文本/结构进行多维特征评估，当若干非人特征同时
 * 过度拟人时进入恐怖谷，输出告警。
 */

export interface UncannyPattern {
  id: string;
  feature: string;
  score: number;
  sample: string;
}

export interface UncannyReport {
  totalScore: number;
  patterns: UncannyPattern[];
  isUncanny: boolean;
  valleyDepth: number;
}

export type Sensitivity = 'relaxed' | 'normal' | 'paranoid';

export class UncannyDetector {
  private _patterns: UncannyPattern[] = [];
  private _registry: Map<string, (score: number) => boolean> = new Map();
  private _threshold: number = 0.7;
  private _sensitivity: Sensitivity = 'normal';
  private _calibrationOffset: number = 0;

  registerPattern(id: string, detector: (score: number) => boolean): void {
    this._registry.set(id, detector);
  }

  /** 对候选输出执行扫描，收集命中模式。 */
  scan(content: string): UncannyPattern[] {
    const hits: UncannyPattern[] = [];
    const features = ['overPolite', 'excessiveEmpathy', 'mechanicalRhythm', 'uncannyFluency'];
    for (const feature of features) {
      const score = this._score(content, feature);
      const detector = this._registry.get(feature);
      const triggered = detector ? detector(score) : score > this._threshold;
      if (triggered) {
        const pattern: UncannyPattern = {
          id: `p-${feature}-${Date.now()}`,
          feature,
          score,
          sample: content.slice(0, 64),
        };
        hits.push(pattern);
        this._patterns.push(pattern);
      }
    }
    return hits;
  }

  detect(content: string): UncannyReport {
    const patterns = this.scan(content);
    const total = patterns.reduce((s, p) => s + p.score, 0);
    const adjusted = total + this._calibrationOffset;
    const valleyDepth = Math.max(0, adjusted - this._threshold);
    return {
      totalScore: adjusted,
      patterns,
      isUncanny: adjusted >= this._threshold,
      valleyDepth,
    };
  }

  evaluateUncanny(report: UncannyReport): 'safe' | 'eerie' | 'repulsive' {
    if (!report.isUncanny) return 'safe';
    if (report.valleyDepth > 0.5) return 'repulsive';
    return 'eerie';
  }

  calibrate(offset: number): void {
    this._calibrationOffset = offset;
  }

  setSensitivity(level: Sensitivity): void {
    this._sensitivity = level;
    this._threshold = level === 'relaxed' ? 0.9 : level === 'paranoid' ? 0.5 : 0.7;
  }

  getReport(): { totalScans: number; threshold: number; sensitivity: Sensitivity } {
    return {
      totalScans: this._patterns.length,
      threshold: this._threshold,
      sensitivity: this._sensitivity,
    };
  }

  get patterns(): UncannyPattern[] {
    return [...this._patterns];
  }

  private _score(content: string, feature: string): number {
    const len = content.length;
    if (len === 0) return 0;
    switch (feature) {
      case 'overPolite':
        return (content.match(/please|thank|sorry/gi)?.length ?? 0) / (len / 100);
      case 'excessiveEmpathy':
        return (content.match(/understand|feel|empathy/gi)?.length ?? 0) / (len / 100);
      case 'mechanicalRhythm': {
        const punct = (content.match(/[.,;:!?]/g)?.length ?? 0);
        return punct / len;
      }
      case 'uncannyFluency':
        return Math.min(1, len / 500);
      default:
        return 0;
    }
  }
}
