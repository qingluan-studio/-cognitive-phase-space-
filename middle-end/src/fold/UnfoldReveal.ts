/**
 * 展开揭示：将折叠的数据展开，暴露隐藏信息。
 * 与折叠操作相反，将之前折叠的数据逐步展开，揭示被折叠隐藏的内部信息。
 */

export type UnfoldDirection = 'forward' | 'reverse' | 'bidirectional';

export interface UnfoldStep {
  stepIndex: number;
  layerCount: number;
  revealed: number[];
  direction: UnfoldDirection;
}

export interface UnfoldResult {
  original: number[];
  steps: UnfoldStep[];
  finalLayers: number[][];
  fullyRevealed: boolean;
}

export class UnfoldReveal {
  private _results: UnfoldResult[] = [];
  private _maxSteps = 10;
  private _revealThreshold = 0.95;

  unfold(folded: number[], originalLength: number): UnfoldResult {
    const steps: UnfoldStep[] = [];
    let current: number[] = [...folded];
    let layers: number[][] = [current];

    for (let s = 0; s < this._maxSteps; s++) {
      const direction: UnfoldDirection = s % 2 === 0 ? 'forward' : 'reverse';
      const revealed = this._expandLayer(current, originalLength, direction);
      layers = this._distribute(layers, revealed);
      current = layers.flat();
      steps.push({
        stepIndex: s,
        layerCount: layers.length,
        revealed: [...revealed],
        direction,
      });
      if (current.length >= originalLength * this._revealThreshold) break;
    }

    const result: UnfoldResult = {
      original: [...folded],
      steps,
      finalLayers: layers,
      fullyRevealed: current.length >= originalLength * this._revealThreshold,
    };
    this._results.push(result);
    if (this._results.length > 100) this._results.shift();
    return result;
  }

  private _expandLayer(layer: number[], targetLength: number, direction: UnfoldDirection): number[] {
    const factor = Math.max(2, Math.ceil(targetLength / Math.max(1, layer.length)));
    const expanded: number[] = [];
    for (const v of layer) {
      if (direction === 'forward') {
        expanded.push(v, -v);
      } else if (direction === 'reverse') {
        expanded.push(-v, v);
      } else {
        expanded.push(v, v);
      }
    }
    return expanded.slice(0, targetLength);
  }

  private _distribute(existing: number[][], revealed: number[]): number[][] {
    const half = Math.ceil(revealed.length / 2);
    return [...existing, revealed.slice(0, half), revealed.slice(half)];
  }

  revealHidden(folded: number[], hiddenKey: number): number[] {
    return folded.map((v, i) => v + (i % 2 === 0 ? hiddenKey : -hiddenKey));
  }

  setMaxSteps(steps: number): void {
    this._maxSteps = Math.max(1, steps);
  }

  setRevealThreshold(threshold: number): void {
    this._revealThreshold = Math.max(0, Math.min(1, threshold));
  }

  getResults(): UnfoldResult[] {
    return [...this._results];
  }

  get resultCount(): number {
    return this._results.length;
  }
}
