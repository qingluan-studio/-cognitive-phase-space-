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
  private _entropyLog: number[];
  private _markovChain: Map<string, number[]>;
  private _fractalSeed: number;

  constructor(witness: string, initialSanity: number = 100) {
    this._depth = 0;
    this._witness = witness;
    this._artifacts = [];
    this._sanity = initialSanity;
    this._gazeCount = 0;
    this._entropyLog = [];
    this._markovChain = new Map();
    this._fractalSeed = witness.split('').reduce((s, c) => s + c.charCodeAt(0), 0);
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

  get gazeCount(): number {
    return this._gazeCount;
  }

  get entropy(): number {
    if (this._entropyLog.length === 0) return 0;
    const sum = this._entropyLog.reduce((a, b) => a + b, 0);
    return sum / this._entropyLog.length;
  }

  public gaze(duration: number): GazeResult {
    this._gazeCount += 1;
    const descended = Math.min(duration * 2, 50);
    this._depth += descended;
    const recovered = this._retrieveUnspeakable(descended);
    const sanityLost = Math.floor(descended * 0.6) + this._gazeCount;
    this._sanity = Math.max(0, this._sanity - sanityLost);
    this._artifacts.push(...recovered);
    const e = this._computeEntropy(recovered);
    this._entropyLog.push(e);
    this._updateMarkov(recovered);
    return {
      recovered,
      sanityLost,
      warning: this._composeWarning(),
    };
  }

  public blink(): void {
    this._depth = Math.floor(this._depth * 0.5);
    this._sanity = Math.min(100, this._sanity + 5);
    this._entropyLog = this._entropyLog.slice(-10);
  }

  public sealArtifacts(): Record<string, unknown> {
    const sealed: Record<string, unknown> = {
      count: this._artifacts.length,
      sealedAt: Date.now(),
      items: this._artifacts.map((a) => this._encode(a)),
      entropy: this.entropy,
      transitionMatrix: Object.fromEntries(this._markovChain),
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

  public predictNextArtifact(): string | null {
    if (this._artifacts.length === 0) return null;
    const last = this._artifacts[this._artifacts.length - 1];
    const transitions = this._markovChain.get(last);
    if (!transitions || transitions.length === 0) return null;
    const total = transitions.reduce((a, b) => a + b, 0);
    const r = Math.random() * total;
    let cum = 0;
    const names = ['whisper', 'echo', 'shadow', 'fragment', 'void-shard'];
    for (let i = 0; i < transitions.length; i++) {
      cum += transitions[i];
      if (r <= cum) return `${names[i % names.length]}-${this._gazeCount + 1}-pred`;
    }
    return null;
  }

  private _retrieveUnspeakable(amount: number): string[] {
    const names = ['whisper', 'echo', 'shadow', 'fragment', 'void-shard'];
    const out: string[] = [];
    const n = amount % 5 + 1;
    for (let i = 0; i < n; i += 1) {
      const f = this._fractalStep(i);
      out.push(`${names[f % names.length]}-${this._gazeCount}-${i}`);
    }
    return out;
  }

  private _fractalStep(i: number): number {
    this._fractalSeed = (this._fractalSeed * 16807 + 0) % 2147483647;
    return (this._fractalSeed + i * 31) % 9973;
  }

  private _computeEntropy(items: string[]): number {
    const freq = new Map<string, number>();
    for (const item of items) {
      const key = item.split('-')[0] ?? item;
      freq.set(key, (freq.get(key) ?? 0) + 1);
    }
    let e = 0;
    const total = items.length;
    for (const count of freq.values()) {
      const p = count / total;
      e -= p * Math.log2(p);
    }
    return e;
  }

  private _updateMarkov(items: string[]): void {
    for (let i = 0; i < items.length - 1; i++) {
      const curr = items[i];
      const next = items[i + 1];
      if (!this._markovChain.has(curr)) {
        this._markovChain.set(curr, [0, 0, 0, 0, 0]);
      }
      const vec = this._markovChain.get(curr)!;
      const idx = next.charCodeAt(0) % vec.length;
      vec[idx] += 1;
    }
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
