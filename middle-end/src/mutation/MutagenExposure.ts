export interface MutagenAgent {
  id: string;
  name: string;
  potency: number;
  doseRange: [number, number];
  hillCoefficient: number;
  ec50: number;
}

export interface ExposureEvent {
  id: string;
  mutagenId: string;
  target: string;
  dose: number;
  mutationsTriggered: number;
  responseFraction: number;
  exposedAt: number;
}

export class MutagenExposure {
  private _mutagens: Map<string, MutagenAgent> = new Map();
  private _exposures: ExposureEvent[] = [];
  private _cumulativeDose: number = 0;
  private _doseHistory: number[] = [];
  private _maxExposures: number = 300;
  private _mutationSpectrum: Map<string, number> = new Map();
  private _backgroundRate: number = 0.001;

  registerMutagen(mutagen: MutagenAgent): void {
    this._mutagens.set(mutagen.id, mutagen);
  }

  expose(mutagenId: string, target: string): ExposureEvent | null {
    const mutagen = this._mutagens.get(mutagenId);
    if (!mutagen) return null;
    const dose = this._sampleDose(mutagen.doseRange);
    const responseFraction = this._hillEquation(dose, mutagen.ec50, mutagen.hillCoefficient);
    const lambda = dose * mutagen.potency * target.length * 0.1 + this._backgroundRate * target.length;
    const mutationsTriggered = this._poissonSample(lambda);
    this._cumulativeDose += dose;
    this._doseHistory.push(dose);
    if (this._doseHistory.length > 100) this._doseHistory.shift();
    const event: ExposureEvent = {
      id: `exp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      mutagenId,
      target,
      dose,
      mutationsTriggered,
      responseFraction,
      exposedAt: Date.now(),
    };
    this._exposures.push(event);
    if (this._exposures.length > this._maxExposures) this._exposures.shift();
    return event;
  }

  computeRisk(mutagenId: string, target: string): number {
    const mutagen = this._mutagens.get(mutagenId);
    if (!mutagen) return 0;
    const avgDose = (mutagen.doseRange[0] + mutagen.doseRange[1]) / 2;
    const response = this._hillEquation(avgDose, mutagen.ec50, mutagen.hillCoefficient);
    const pNoMutation = Math.exp(-avgDose * mutagen.potency * target.length * 0.05 * response);
    return 1 - pNoMutation;
  }

  applyExposure(event: ExposureEvent, target: string): string {
    let result = target;
    for (let i = 0; i < event.mutationsTriggered; i++) {
      const pos = Math.floor(Math.random() * result.length);
      const replacement = String.fromCharCode(97 + Math.floor(Math.random() * 26));
      result = result.slice(0, pos) + replacement + result.slice(pos + 1);
      const key = `${target[pos]}>${replacement}`;
      this._mutationSpectrum.set(key, (this._mutationSpectrum.get(key) ?? 0) + 1);
    }
    return result;
  }

  computeDoseResponseCurve(mutagenId: string): number[] {
    const mutagen = this._mutagens.get(mutagenId);
    if (!mutagen) return [];
    const curve: number[] = [];
    const maxDose = mutagen.doseRange[1] * 2;
    for (let i = 0; i <= 20; i++) {
      const dose = (i / 20) * maxDose;
      curve.push(this._hillEquation(dose, mutagen.ec50, mutagen.hillCoefficient));
    }
    return curve;
  }

  computeAccumulationIndex(): number {
    if (this._doseHistory.length === 0) return 0;
    const mean = this._doseHistory.reduce((s, d) => s + d, 0) / this._doseHistory.length;
    const variance = this._doseHistory.reduce((s, d) => s + (d - mean) ** 2, 0) / this._doseHistory.length;
    return Math.sqrt(variance) / (mean + 1e-9);
  }

  detectLethalDose50(mutagenId: string): number {
    const mutagen = this._mutagens.get(mutagenId);
    if (!mutagen) return 0;
    return mutagen.ec50 * Math.pow(99, 1 / mutagen.hillCoefficient);
  }

  computeMutationEntropy(): number {
    const total = Array.from(this._mutationSpectrum.values()).reduce((s, v) => s + v, 0);
    if (total === 0) return 0;
    let entropy = 0;
    for (const count of this._mutationSpectrum.values()) {
      const p = count / total;
      entropy -= p * Math.log2(p);
    }
    return entropy;
  }

  computeTherapeuticIndex(mutagenId: string): number {
    const mutagen = this._mutagens.get(mutagenId);
    if (!mutagen) return 0;
    const ld50 = this.detectLethalDose50(mutagenId);
    const ed50 = mutagen.ec50;
    return ld50 / (ed50 + 1e-9);
  }

  setPotency(mutagenId: string, potency: number): MutagenAgent | null {
    const mutagen = this._mutagens.get(mutagenId);
    if (!mutagen) return null;
    mutagen.potency = Math.max(0, Math.min(1, potency));
    return mutagen;
  }

  getMutagen(id: string): MutagenAgent | null {
    return this._mutagens.get(id) ?? null;
  }

  getExposures(limit: number = 50): ExposureEvent[] {
    return this._exposures.slice(-limit);
  }

  get cumulativeDose(): number {
    return this._cumulativeDose;
  }

  get mutagenCount(): number {
    return this._mutagens.size;
  }

  get exposureCount(): number {
    return this._exposures.length;
  }

  private _sampleDose(range: [number, number]): number {
    const [min, max] = range;
    const u = Math.random();
    return min + (1 - Math.sqrt(1 - u)) * (max - min);
  }

  private _hillEquation(dose: number, ec50: number, hill: number): number {
    if (ec50 <= 0) return dose > 0 ? 1 : 0;
    return Math.pow(dose, hill) / (Math.pow(ec50, hill) + Math.pow(dose, hill));
  }

  private _poissonSample(lambda: number): number {
    const L = Math.exp(-lambda);
    let k = 0;
    let p = 1;
    do {
      k++;
      p *= Math.random();
    } while (p > L);
    return k - 1;
  }
}
