/**
 * 自我迷失模块：故意陷入自身逻辑迷宫。
 * 通过反复自我引用制造困惑，进而测量系统的容错与定位能力。
 */

export interface SelfLostData {
  selfReferences: number;
  confusionLevel: number;
  anchorFound: boolean;
}

export class SelfLost {
  private _selfReferences: number;
  private _confusionLevel: number;
  private _path: string[];
  private _anchor: string | null;

  constructor() {
    this._selfReferences = 0;
    this._confusionLevel = 0;
    this._path = [];
    this._anchor = null;
  }

  get confusionLevel(): number {
    return this._confusionLevel;
  }

  get path(): string[] {
    return [...this._path];
  }

  public referToSelf(label: string): void {
    this._selfReferences += 1;
    this._confusionLevel = Math.min(100, this._confusionLevel + 10);
    this._path.push(`self:${label}`);
  }

  public wander(steps: number): string[] {
    const directions = ['north', 'east', 'south', 'west', 'inward', 'outward'];
    for (let i = 0; i < steps; i += 1) {
      const d = directions[Math.floor(Math.random() * directions.length)];
      this._path.push(d);
      this._confusionLevel = Math.min(100, this._confusionLevel + 1);
    }
    return [...this._path];
  }

  public dropAnchor(name: string): void {
    this._anchor = name;
    this._confusionLevel = Math.max(0, this._confusionLevel - 30);
  }

  public locateSelf(): boolean {
    return this._anchor !== null;
  }

  public report(): SelfLostData {
    return {
      selfReferences: this._selfReferences,
      confusionLevel: this._confusionLevel,
      anchorFound: this._anchor !== null,
    };
  }

  public compressPath(): string {
    return this._path.join('->');
  }

  public reset(): void {
    this._selfReferences = 0;
    this._confusionLevel = 0;
    this._path = [];
    this._anchor = null;
  }
}
