/**
 * 深渊凝视模块：与深渊对视，带回不可名状之物。
 * 长时间凝视深渊会污染观察者的心智，需要严格控制凝视时长与回访次数。
 */

export interface AbyssGazeData {
  depth: number;
  witness: string;
  artifacts: string[];
  sanity: number;
}

export interface GazeResult {
  recovered: string[];
  sanityLost: number;
  warning: string;
}

export class AbyssGaze {
  private _depth: number;
  private _witness: string;
  private _artifacts: string[];
  private _sanity: number;
  private _gazeCount: number;

  constructor(witness: string, initialSanity: number = 100) {
    this._depth = 0;
    this._witness = witness;
    this._artifacts = [];
    this._sanity = initialSanity;
    this._gazeCount = 0;
  }

  get depth(): number {
    return this._depth;
  }

  get sanity(): number {
    return this._sanity;
  }

  get artifacts(): string[] {
    return [...this._artifacts];
  }

  public gaze(duration: number): GazeResult {
    this._gazeCount += 1;
    const descended = Math.min(duration * 2, 50);
    this._depth += descended;
    const recovered = this._retrieveUnspeakable(descended);
    const sanityLost = Math.floor(descended * 0.6) + this._gazeCount;
    this._sanity = Math.max(0, this._sanity - sanityLost);
    this._artifacts.push(...recovered);
    return {
      recovered,
      sanityLost,
      warning: this._composeWarning(),
    };
  }

  public blink(): void {
    this._depth = Math.floor(this._depth * 0.5);
    this._sanity = Math.min(100, this._sanity + 5);
  }

  public sealArtifacts(): Record<string, unknown> {
    const sealed: Record<string, unknown> = {
      count: this._artifacts.length,
      sealedAt: Date.now(),
      items: this._artifacts.map((a) => this._encode(a)),
    };
    this._artifacts = [];
    return sealed;
  }

  public report(): AbyssGazeData {
    return {
      depth: this._depth,
      witness: this._witness,
      artifacts: [...this._artifacts],
      sanity: this._sanity,
    };
  }

  private _retrieveUnspeakable(amount: number): string[] {
    const names = ['whisper', 'echo', 'shadow', 'fragment', 'void-shard'];
    const out: string[] = [];
    for (let i = 0; i < amount % 5 + 1; i += 1) {
      out.push(`${names[i % names.length]}-${this._gazeCount}-${i}`);
    }
    return out;
  }

  private _composeWarning(): string {
    if (this._sanity < 20) return 'ABYSS GAZING BACK — RETREAT IMMEDIATELY';
    if (this._sanity < 50) return 'Sanity fraying; blink soon.';
    return 'Gaze stable.';
  }

  private _encode(s: string): string {
    return s.split('').reverse().join('');
  }
}
