/**
 * 诱变剂暴露：故意引入突变源。
 * 通过外部诱变剂以可控剂量触发突变，剂量越大突变频率与强度越高。
 */

export interface MutagenAgent {
  id: string;
  name: string;
  potency: number;
  doseRange: [number, number];
}

export interface ExposureEvent {
  id: string;
  mutagenId: string;
  target: string;
  dose: number;
  mutationsTriggered: number;
  exposedAt: number;
}

export class MutagenExposure {
  private _mutagens: Map<string, MutagenAgent> = new Map();
  private _exposures: ExposureEvent[] = [];
  private _cumulativeDose = 0;
  private _maxExposures = 300;

  registerMutagen(mutagen: MutagenAgent): void {
    this._mutagens.set(mutagen.id, mutagen);
  }

  expose(mutagenId: string, target: string): ExposureEvent | null {
    const mutagen = this._mutagens.get(mutagenId);
    if (!mutagen) return null;
    const [min, max] = mutagen.doseRange;
    const dose = min + Math.random() * (max - min);
    const mutationsTriggered = Math.floor(dose * mutagen.potency * target.length * 0.1);
    this._cumulativeDose += dose;
    const event: ExposureEvent = {
      id: `exp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      mutagenId,
      target,
      dose,
      mutationsTriggered,
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
    return Math.min(1, avgDose * mutagen.potency * target.length * 0.05);
  }

  applyExposure(event: ExposureEvent, target: string): string {
    let result = target;
    for (let i = 0; i < event.mutationsTriggered; i++) {
      const pos = Math.floor(Math.random() * result.length);
      const replacement = String.fromCharCode(97 + Math.floor(Math.random() * 26));
      result = result.slice(0, pos) + replacement + result.slice(pos + 1);
    }
    return result;
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
}
