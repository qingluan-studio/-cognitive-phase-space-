/**
 * 反思升级器模块：无限升级的自我反思阶梯。
 * 每一级反思都审视上一级的反思过程，可无限攀升直至触及认知上限。
 */

export interface ReflectionEscalatorData {
  level: number;
  reflections: string[];
  ceiling: number;
  saturated: boolean;
}

export class ReflectionEscalator {
  private _level: number;
  private _reflections: string[];
  private _ceiling: number;
  private _saturated: boolean;

  constructor(ceiling: number = 10) {
    this._level = 0;
    this._reflections = [];
    this._ceiling = ceiling;
    this._saturated = false;
  }

  get level(): number {
    return this._level;
  }

  get saturated(): boolean {
    return this._saturated;
  }

  public reflect(insight: string): void {
    if (this._saturated) return;
    this._level += 1;
    this._reflections.push(`L${this._level}: ${insight}`);
    if (this._level >= this._ceiling) this._saturated = true;
  }

  public stepDown(): void {
    if (this._level > 0) {
      this._reflections.pop();
      this._level -= 1;
      this._saturated = false;
    }
  }

  public setCeiling(c: number): void {
    this._ceiling = Math.max(1, c);
    if (this._level < this._ceiling) this._saturated = false;
  }

  public currentInsight(): string | null {
    return this._reflections[this._reflections.length - 1] ?? null;
  }

  public reset(): void {
    this._level = 0;
    this._reflections = [];
    this._saturated = false;
  }

  public report(): ReflectionEscalatorData {
    return {
      level: this._level,
      reflections: [...this._reflections],
      ceiling: this._ceiling,
      saturated: this._saturated,
    };
  }
}
