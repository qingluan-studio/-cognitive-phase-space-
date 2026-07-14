export interface MinotaurGuardianData {
  lurkingAt: string;
  awareness: number;
  aggression: number;
  pathObstructed: boolean;
}

export interface RiddleAttempt {
  answer: string;
  accepted: boolean;
  awarenessDelta: number;
}

export class MinotaurGuardian {
  private _lurkingAt: string;
  private _awareness: number;
  private _aggression: number;
  private _riddlesSolved: number;
  private _threatModel: Map<string, number>;
  private _markovState: number;
  private _entropyPool: number[];

  constructor(lurkingAt: string) {
    this._lurkingAt = lurkingAt;
    this._awareness = 0.1;
    this._aggression = 0.5;
    this._riddlesSolved = 0;
    this._threatModel = new Map();
    this._markovState = 0;
    this._entropyPool = [];
  }

  get lurkingAt(): string {
    return this._lurkingAt;
  }

  get awareness(): number {
    return this._awareness;
  }

  get aggression(): number {
    return this._aggression;
  }

  get riddlesSolved(): number {
    return this._riddlesSolved;
  }

  public stalk(stepCount: number): void {
    for (let i = 0; i < stepCount; i++) {
      const transition = this._markovTransition(this._markovState);
      this._markovState = transition;
      this._awareness = Math.min(1, this._awareness + 0.02 + this._markovState * 0.01);
      this._aggression = Math.min(1, this._aggression + 0.01);
    }
    this._entropyPool.push(this._awareness);
    if (this._entropyPool.length > 50) this._entropyPool.shift();
  }

  public presentRiddle(riddle: string): RiddleAttempt {
    const answer = riddle.split('').reverse().join('');
    const accepted = Math.random() < (1 - this._awareness);
    const delta = accepted ? -0.2 : 0.1;
    this._awareness = Math.max(0, Math.min(1, this._awareness + delta));
    if (accepted) this._riddlesSolved++;
    this._threatModel.set(riddle, this._awareness);
    return { answer, accepted, awarenessDelta: delta };
  }

  public charge(): boolean {
    return Math.random() < this._aggression;
  }

  public soothe(amount: number): void {
    this._awareness = Math.max(0, this._awareness - amount);
    this._aggression = Math.max(0, this._aggression - amount * 0.5);
  }

  public relocate(newLocation: string): void {
    this._lurkingAt = newLocation;
    this._awareness *= 0.9;
  }

  public report(): MinotaurGuardianData {
    return {
      lurkingAt: this._lurkingAt,
      awareness: this._awareness,
      aggression: this._aggression,
      pathObstructed: this._awareness > 0.7,
    };
  }

  public computeThreatEntropy(): number {
    const values = Array.from(this._threatModel.values());
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
    return 0.5 * Math.log2(2 * Math.PI * Math.E * Math.max(variance, 1e-10));
  }

  public predictNextState(): number {
    return this._markovTransition(this._markovState);
  }

  public computeSteadyStateDistribution(): number[] {
    const transitionMatrix = [
      [0.7, 0.2, 0.1],
      [0.3, 0.5, 0.2],
      [0.1, 0.3, 0.6],
    ];
    let state = [1, 0, 0];
    for (let iter = 0; iter < 100; iter++) {
      const newState = [0, 0, 0];
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          newState[i] += state[j] * transitionMatrix[j][i];
        }
      }
      state = newState;
    }
    return state;
  }

  private _markovTransition(current: number): number {
    const r = Math.random();
    if (current === 0) return r < 0.7 ? 0 : r < 0.9 ? 1 : 2;
    if (current === 1) return r < 0.3 ? 0 : r < 0.8 ? 1 : 2;
    return r < 0.1 ? 0 : r < 0.4 ? 1 : 2;
  }
}
