export interface Antinomy {
  id: string;
  thesis: string;
  antithesis: string;
  embraced: boolean;
  tension: number;
}

export interface EmbraceResult {
  antinomyId: string;
  synthesis: string;
  stability: number;
  embracedAt: number;
}

export class AntinomyEmbrace {
  private _antinomies: Map<string, Antinomy> = new Map();
  private _embraces: EmbraceResult[] = [];
  private _maxTension = 1.0;
  private _tensionHistory: number[] = [];
  private _phaseField: number;

  constructor() {
    this._phaseField = 0;
  }

  get antinomyCount(): number {
    return this._antinomies.size;
  }

  get phaseField(): number {
    return this._phaseField;
  }

  public register(thesis: string, antithesis: string): Antinomy {
    const id = `antinomy-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const tension = this._computeTension(thesis, antithesis);
    const antinomy: Antinomy = {
      id,
      thesis,
      antithesis,
      embraced: false,
      tension,
    };
    this._antinomies.set(id, antinomy);
    this._tensionHistory.push(tension);
    if (this._tensionHistory.length > 50) this._tensionHistory.shift();
    return antinomy;
  }

  public embrace(antinomyId: string): EmbraceResult | null {
    const antinomy = this._antinomies.get(antinomyId);
    if (!antinomy || antinomy.embraced) return null;
    const synthesis = `${antinomy.thesis} ∧ ${antinomy.antithesis}`;
    const stability = Math.max(0, 1 - antinomy.tension);
    antinomy.embraced = true;
    const result: EmbraceResult = {
      antinomyId,
      synthesis,
      stability,
      embracedAt: Date.now(),
    };
    this._embraces.push(result);
    if (this._embraces.length > 50) this._embraces.shift();
    this._phaseField = Math.tanh(this._embraces.length / 10);
    return result;
  }

  public rupture(antinomyId: string): boolean {
    const antinomy = this._antinomies.get(antinomyId);
    if (!antinomy) return false;
    antinomy.embraced = false;
    antinomy.tension = Math.min(this._maxTension, antinomy.tension + 0.2);
    return true;
  }

  public getAntinomy(id: string): Antinomy | null {
    return this._antinomies.get(id) ?? null;
  }

  public getEmbraces(limit: number = 50): EmbraceResult[] {
    return this._embraces.slice(-limit);
  }

  public computeTensionEntropy(): number {
    if (this._tensionHistory.length === 0) return 0;
    const mean = this._tensionHistory.reduce((a, b) => a + b, 0) / this._tensionHistory.length;
    const variance = this._tensionHistory.reduce((s, v) => s + (v - mean) ** 2, 0) / this._tensionHistory.length;
    return 0.5 * Math.log2(2 * Math.PI * Math.E * Math.max(variance, 1e-10));
  }

  public computePhaseTransitionProbability(): number {
    const meanTension = this._tensionHistory.length > 0
      ? this._tensionHistory.reduce((a, b) => a + b, 0) / this._tensionHistory.length
      : 0;
    return 1 / (1 + Math.exp(-10 * (meanTension - 0.5)));
  }

  public simulateDialectic(steps: number): Array<{ thesis: number; antithesis: number; synthesis: number }> {
    const trajectory: Array<{ thesis: number; antithesis: number; synthesis: number }> = [];
    let t = 0.5;
    let a = 0.5;
    for (let i = 0; i < steps; i++) {
      const s = (t + a) / 2;
      t = t + 0.1 * (s - t);
      a = a + 0.1 * (s - a);
      trajectory.push({ thesis: t, antithesis: a, synthesis: s });
    }
    return trajectory;
  }

  private _computeTension(thesis: string, antithesis: string): number {
    const setA = new Set(thesis);
    const setB = new Set(antithesis);
    const intersection = new Set([...setA].filter(x => setB.has(x)));
    const union = new Set([...setA, ...setB]);
    const jaccard = union.size > 0 ? intersection.size / union.size : 0;
    return 1 - jaccard;
  }
}
