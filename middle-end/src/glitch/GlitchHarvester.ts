/**
 * 故障收割者：从系统错误中提取可用片段。
 * 将错误堆栈、异常消息和失败上下文视为可回收资源，从中提炼可复用的诊断信息。
 */

export interface ErrorArtifact {
  id: string;
  source: string;
  errorType: string;
  message: string;
  fragments: string[];
  harvestedAt: number;
  usefulness: number;
}

export interface GlitchField {
  raw: string;
  tokens: string[];
  stackDepth: number;
}

export class GlitchHarvester {
  private _artifacts: ErrorArtifact[] = [];
  private _uselessTokens: Set<string> = new Set(['at', 'the', 'a', 'an', 'of', 'in']);
  private _minUsefulness = 0.3;
  private _totalHarvested = 0;

  harvest(source: string, errorType: string, message: string, stack?: string): ErrorArtifact {
    const field = this._parseField(message, stack);
    const fragments = this._extractFragments(field);
    const usefulness = this._evaluateUsefulness(fragments, field);

    const artifact: ErrorArtifact = {
      id: `glitch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      source,
      errorType,
      message,
      fragments,
      harvestedAt: Date.now(),
      usefulness,
    };
    this._totalHarvested++;
    if (usefulness >= this._minUsefulness) {
      this._artifacts.push(artifact);
      if (this._artifacts.length > 200) this._artifacts.shift();
    }
    return artifact;
  }

  private _parseField(message: string, stack?: string): GlitchField {
    const raw = stack ? `${message}\n${stack}` : message;
    const tokens = raw.split(/[\s\n]+/).filter(t => t.length > 0);
    let stackDepth = 0;
    if (stack) {
      const atLines = stack.split('\n').filter(l => l.trim().startsWith('at'));
      stackDepth = atLines.length;
    }
    return { raw, tokens, stackDepth };
  }

  private _extractFragments(field: GlitchField): string[] {
    const fragments = new Set<string>();
    for (const token of field.tokens) {
      const cleaned = token.replace(/[^\w.-]/g, '');
      if (cleaned.length >= 4 && !this._uselessTokens.has(cleaned.toLowerCase())) {
        fragments.add(cleaned);
      }
    }
    return Array.from(fragments);
  }

  private _evaluateUsefulness(fragments: string[], field: GlitchField): number {
    let score = 0;
    score += Math.min(0.4, fragments.length * 0.02);
    score += Math.min(0.3, field.stackDepth * 0.03);
    if (field.raw.includes('line')) score += 0.15;
    if (field.raw.match(/\d+/)) score += 0.15;
    return Math.min(1, score);
  }

  queryByType(errorType: string): ErrorArtifact[] {
    return this._artifacts.filter(a => a.errorType === errorType);
  }

  queryByUsefulness(min: number): ErrorArtifact[] {
    return this._artifacts.filter(a => a.usefulness >= min);
  }

  recycle(artifactId: string): ErrorArtifact | null {
    const idx = this._artifacts.findIndex(a => a.id === artifactId);
    if (idx === -1) return null;
    const [removed] = this._artifacts.splice(idx, 1);
    return removed;
  }

  getArtifacts(): ErrorArtifact[] {
    return [...this._artifacts];
  }

  get totalHarvested(): number {
    return this._totalHarvested;
  }

  setMinUsefulness(value: number): void {
    this._minUsefulness = Math.max(0, Math.min(1, value));
  }
}
