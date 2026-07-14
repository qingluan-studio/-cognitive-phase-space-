/**
 * 折痕图样：预设的折叠模式，决定数据重构方式。
 * 定义可复用的折痕图样，作为折叠操作的蓝图，决定数据如何被重构成新结构。
 */

export type CreaseType = 'mountain' | 'valley' | 'flat' | 'cut';

export interface Crease {
  id: string;
  type: CreaseType;
  position: number;
  angle: number;
}

export type PatternSymmetry = 'none' | 'bilateral' | 'radial' | 'quad';

export interface PatternDefinition {
  id: string;
  name: string;
  creases: Crease[];
  symmetry: PatternSymmetry;
  createdAt: number;
}

export interface AppliedPattern {
  patternId: string;
  input: number[];
  output: number[];
  creasesApplied: number;
  appliedAt: number;
}

export class CreasePattern implements PatternDefinition {
  private _patterns: Map<string, PatternDefinition> = new Map();
  private _applications: AppliedPattern[] = [];
  public id: string;
  public name: string;
  public creases: Crease[];
  public symmetry: PatternSymmetry;
  public createdAt: number;

  constructor(id: string, name: string, symmetry: PatternSymmetry = 'none') {
    this.id = id;
    this.name = name;
    this.creases = [];
    this.symmetry = symmetry;
    this.createdAt = Date.now();
  }

  addCrease(crease: Crease): void {
    this.creases.push(crease);
  }

  removeCrease(creaseId: string): boolean {
    const idx = this.creases.findIndex(c => c.id === creaseId);
    if (idx === -1) return false;
    this.creases.splice(idx, 1);
    return true;
  }

  register(pattern: PatternDefinition): void {
    this._patterns.set(pattern.id, pattern);
  }

  apply(patternId: string, input: number[]): AppliedPattern | null {
    const pattern = this._patterns.get(patternId);
    if (!pattern) return null;
    const output = this._fold(input, pattern);
    const application: AppliedPattern = {
      patternId,
      input: [...input],
      output,
      creasesApplied: pattern.creases.length,
      appliedAt: Date.now(),
    };
    this._applications.push(application);
    if (this._applications.length > 100) this._applications.shift();
    return application;
  }

  private _fold(input: number[], pattern: PatternDefinition): number[] {
    let output = [...input];
    for (const crease of pattern.creases) {
      const pos = Math.min(output.length - 1, Math.max(0, Math.floor(crease.position * output.length)));
      switch (crease.type) {
        case 'mountain':
          output = output.map((v, i) => i < pos ? v : -v);
          break;
        case 'valley':
          output = output.map((v, i) => i < pos ? -v : v);
          break;
        case 'flat':
          output = output.map((v, i) => i === pos ? 0 : v);
          break;
        case 'cut':
          output = [...output.slice(0, pos), ...output.slice(pos + 1)];
          break;
      }
    }
    return output;
  }

  getApplications(): AppliedPattern[] {
    return [...this._applications];
  }

  getPattern(id: string): PatternDefinition | null {
    return this._patterns.get(id) ?? null;
  }

  get creaseCount(): number {
    return this.creases.length;
  }

  get patternCount(): number {
    return this._patterns.size;
  }
}
