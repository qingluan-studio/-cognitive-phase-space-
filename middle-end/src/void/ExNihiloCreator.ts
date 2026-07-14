export interface CreationEvent {
  id: string;
  fromNothing: boolean;
  created: Record<string, unknown>;
  entropyAtBirth: number;
  createdAt: number;
}

export class ExNihiloCreator {
  private _creations: CreationEvent[];
  private _creationEntropy: number[];
  private _phaseTransitionHistory: number[];
  private _totalMass: number;

  constructor() {
    this._creations = [];
    this._creationEntropy = [];
    this._phaseTransitionHistory = [];
    this._totalMass = 0;
  }

  get creationCount(): number {
    return this._creations.length;
  }

  get totalMass(): number {
    return this._totalMass;
  }

  public create(): CreationEvent {
    const created: Record<string, unknown> = {
      mass: Math.random(),
      charge: Math.random() - 0.5,
      spin: Math.floor(Math.random() * 3) - 1,
    };
    const entropy = this._computeObjectEntropy(created);
    const event: CreationEvent = {
      id: `nihilo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      fromNothing: true,
      created,
      entropyAtBirth: entropy,
      createdAt: Date.now(),
    };
    this._creations.push(event);
    if (this._creations.length > 100) this._creations.shift();
    this._creationEntropy.push(entropy);
    if (this._creationEntropy.length > 50) this._creationEntropy.shift();
    this._totalMass += created.mass as number;
    this._phaseTransitionHistory.push(this._totalMass);
    return event;
  }

  public annihilate(eventId: string): boolean {
    const idx = this._creations.findIndex(e => e.id === eventId);
    if (idx < 0) return false;
    const mass = this._creations[idx].created.mass as number;
    this._totalMass = Math.max(0, this._totalMass - mass);
    this._creations.splice(idx, 1);
    return true;
  }

  public getCreation(id: string): CreationEvent | null {
    return this._creations.find(e => e.id === id) ?? null;
  }

  public getCreations(limit: number = 50): CreationEvent[] {
    return this._creations.slice(-limit);
  }

  public computeCreationEntropy(): number {
    if (this._creationEntropy.length === 0) return 0;
    const mean = this._creationEntropy.reduce((a, b) => a + b, 0) / this._creationEntropy.length;
    const variance = this._creationEntropy.reduce((s, v) => s + (v - mean) ** 2, 0) / this._creationEntropy.length;
    return 0.5 * Math.log2(2 * Math.PI * Math.E * Math.max(variance, 1e-10));
  }

  public simulateVacuumFluctuation(steps: number): Array<{ time: number; energy: number; particle: boolean }> {
    const fluctuations: Array<{ time: number; energy: number; particle: boolean }> = [];
    for (let i = 0; i < steps; i++) {
      const energy = -Math.log(Math.random() + 1e-10);
      const particle = energy > 1.0;
      fluctuations.push({ time: i, energy, particle });
    }
    return fluctuations;
  }

  public computeCriticalMass(): number {
    if (this._phaseTransitionHistory.length === 0) return 0;
    const sorted = [...this._phaseTransitionHistory].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  }

  private _computeObjectEntropy(obj: Record<string, unknown>): number {
    const values = Object.values(obj).filter(v => typeof v === 'number') as number[];
    if (values.length === 0) return 0;
    const total = values.reduce((a, b) => a + Math.abs(b), 0);
    if (total === 0) return 0;
    let entropy = 0;
    for (const v of values) {
      const p = Math.abs(v) / total;
      if (p > 0) entropy -= p * Math.log2(p);
    }
    return entropy;
  }
}
