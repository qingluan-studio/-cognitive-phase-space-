export interface Candidate {
  id: string;
  fitness: number;
  age: number;
  traits: Record<string, unknown>;
}

export interface SelectionResult {
  survivors: string[];
  eliminated: string[];
  averageFitness: number;
  fitnessVariance: number;
  selectionPressure: number;
  selectedAt: number;
}

export class NaturalSelector {
  private _candidates: Map<string, Candidate> = new Map();
  private _history: SelectionResult[] = [];
  private _survivalRatio: number = 0.5;
  private _maxAge: number = 100;
  private _tournamentSize: number = 3;

  registerCandidate(candidate: Candidate): void {
    this._candidates.set(candidate.id, candidate);
  }

  select(): SelectionResult {
    const sorted = Array.from(this._candidates.values()).sort((a, b) => b.fitness - a.fitness);
    const survivorCount = Math.max(1, Math.floor(sorted.length * this._survivalRatio));
    const survivors: string[] = [];
    const eliminated: string[] = [];
    for (let i = 0; i < sorted.length; i++) {
      if (i < survivorCount && sorted[i].age < this._maxAge) {
        survivors.push(sorted[i].id);
      } else {
        eliminated.push(sorted[i].id);
        this._candidates.delete(sorted[i].id);
      }
    }
    const survivorFitnesses = survivors.map((id) => this._candidates.get(id)?.fitness ?? 0);
    const averageFitness = survivorFitnesses.length > 0
      ? survivorFitnesses.reduce((s, f) => s + f, 0) / survivorFitnesses.length
      : 0;
    const fitnessVariance = this._computeVariance(survivorFitnesses, averageFitness);
    const allFitnesses = sorted.map((c) => c.fitness);
    const populationMean = allFitnesses.length > 0 ? allFitnesses.reduce((s, f) => s + f, 0) / allFitnesses.length : 0;
    const selectionPressure = populationMean > 0 ? (averageFitness - populationMean) / populationMean : 0;
    const result: SelectionResult = {
      survivors,
      eliminated,
      averageFitness,
      fitnessVariance,
      selectionPressure,
      selectedAt: Date.now(),
    };
    this._history.push(result);
    if (this._history.length > 100) this._history.shift();
    return result;
  }

  tournamentSelect(): string | null {
    if (this._candidates.size === 0) return null;
    const candidates = Array.from(this._candidates.values());
    const tournamentSize = Math.min(this._tournamentSize, candidates.length);
    let best: Candidate | null = null;
    for (let i = 0; i < tournamentSize; i++) {
      const candidate = candidates[Math.floor(Math.random() * candidates.length)];
      if (!best || candidate.fitness > best.fitness) {
        best = candidate;
      }
    }
    return best ? best.id : null;
  }

  rouletteSelect(): string | null {
    const candidates = Array.from(this._candidates.values());
    if (candidates.length === 0) return null;
    const totalFitness = candidates.reduce((s, c) => s + Math.max(0, c.fitness), 0);
    if (totalFitness === 0) return candidates[Math.floor(Math.random() * candidates.length)].id;
    let roll = Math.random() * totalFitness;
    for (const c of candidates) {
      roll -= Math.max(0, c.fitness);
      if (roll <= 0) return c.id;
    }
    return candidates[candidates.length - 1].id;
  }

  computeGiniCoefficient(): number {
    const candidates = Array.from(this._candidates.values());
    if (candidates.length === 0) return 0;
    const fitnesses = candidates.map((c) => c.fitness).sort((a, b) => a - b);
    const n = fitnesses.length;
    const sum = fitnesses.reduce((s, f) => s + f, 0);
    if (sum === 0) return 0;
    let cumulativeSum = 0;
    for (let i = 0; i < n; i++) {
      cumulativeSum += (i + 1) * fitnesses[i];
    }
    return (2 * cumulativeSum) / (n * sum) - (n + 1) / n;
  }

  computeResponseToSelection(): number {
    if (this._history.length < 2) return 0;
    const current = this._history[this._history.length - 1].averageFitness;
    const previous = this._history[this._history.length - 2].averageFitness;
    return current - previous;
  }

  ageAll(): void {
    for (const c of this._candidates.values()) c.age++;
  }

  setSurvivalRatio(value: number): void {
    this._survivalRatio = Math.max(0, Math.min(1, value));
  }

  setMaxAge(age: number): void {
    this._maxAge = Math.max(1, age);
  }

  setTournamentSize(size: number): void {
    this._tournamentSize = Math.max(1, size);
  }

  getCandidate(id: string): Candidate | null {
    return this._candidates.get(id) ?? null;
  }

  getHistory(limit: number = 20): SelectionResult[] {
    return this._history.slice(-limit);
  }

  get candidateCount(): number {
    return this._candidates.size;
  }

  private _computeVariance(values: number[], mean: number): number {
    if (values.length === 0) return 0;
    const sumSq = values.reduce((s, v) => s + (v - mean) ** 2, 0);
    return sumSq / values.length;
  }
}
