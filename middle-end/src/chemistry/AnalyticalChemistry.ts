import { DataPacket, PacketMeta } from '../shared/types';

/** Spectral record. */
export interface Spectra {
  type: 'UV-Vis' | 'IR' | 'NMR' | 'Mass';
  peaks: Array<{ position: number; intensity: number; assignment: string }>;
  compound: string;
}

/** Chromatogram record. */
export interface Chromatogram {
  peaks: Array<{ time: number; area: number; compound: string }>;
  retentionTime: number;
  resolution: number;
}

/** Calibration curve descriptor. */
export interface CalibrationCurve {
  standards: Array<{ concentration: number; reading: number }>;
  slope: number;
  intercept: number;
  rSquared: number;
}

/** Analytical chemistry: spectroscopy, chromatography, calibration. */
export class AnalyticalChemistry {
  private _spectra: Spectra[] = [];
  private _chromatograms: Chromatogram[] = [];
  private _calibrations: CalibrationCurve[] = [];
  private _history: unknown[] = [];
  private _counter = 0;

  /** Build a UV-Vis spectra from concentration vs absorbance pairs. */
  uvVis(concentration: number[], absorbance: number[]): Spectra {
    const peaks = concentration.map((c, i) => ({
      position: 200 + i * 50,
      intensity: absorbance[i] ?? 0,
      assignment: `C=${c}`,
    }));
    const result: Spectra = { type: 'UV-Vis', peaks, compound: 'unknown' };
    this._spectra.push(result);
    this._history.push({ method: 'uvVis' });
    return result;
  }

  /** Beer-Lambert Law A = ε * c * l. */
  beerLambertLaw(epsilon: number, c: number, l: number): number {
    const A = epsilon * c * l;
    this._history.push({ method: 'beerLambertLaw', A });
    return A;
  }

  /** Build a synthetic IR spectrum from bond list. */
  irSpectrum(bonds: string[]): Spectra {
    const lookup: Record<string, number> = {
      'O-H': 3400, 'N-H': 3300, 'C-H': 2900, 'C=O': 1700, 'C=C': 1650, 'C≡N': 2200, 'C-O': 1100,
    };
    const peaks = bonds.map(b => ({
      position: lookup[b] ?? 1000,
      intensity: 0.8,
      assignment: b,
    }));
    const result: Spectra = { type: 'IR', peaks, compound: 'unknown' };
    this._spectra.push(result);
    this._history.push({ method: 'irSpectrum' });
    return result;
  }

  /** Build a synthetic NMR spectrum. */
  nmrSpectrum(atoms: string[], shifts: number[]): Spectra {
    const peaks = atoms.map((a, i) => ({
      position: shifts[i] ?? 0,
      intensity: 1,
      assignment: a,
    }));
    const result: Spectra = { type: 'NMR', peaks, compound: 'unknown' };
    this._spectra.push(result);
    this._history.push({ method: 'nmrSpectrum' });
    return result;
  }

  /** Build a mass spectrum with parent and fragments. */
  massSpectrum(molecularMass: number, fragments: number[]): Spectra {
    const peaks = [
      { position: molecularMass, intensity: 1, assignment: 'M+' },
      ...fragments.map(f => ({ position: f, intensity: 0.5, assignment: 'fragment' })),
    ];
    const result: Spectra = { type: 'Mass', peaks, compound: 'unknown' };
    this._spectra.push(result);
    this._history.push({ method: 'massSpectrum' });
    return result;
  }

  /** Simulate chromatography. */
  chromatography(sample: string[], stationary: string, mobile: string): Chromatogram {
    const peaks = sample.map((c, i) => ({
      time: 1 + i * 0.5 + (stationary.length - mobile.length) * 0.1,
      area: 100,
      compound: c,
    }));
    const retentionTime = peaks.length > 0 ? peaks[peaks.length - 1].time : 0;
    const result: Chromatogram = {
      peaks,
      retentionTime,
      resolution: peaks.length > 1 ? 1.5 : 1.0,
    };
    this._chromatograms.push(result);
    this._history.push({ method: 'chromatography' });
    return result;
  }

  /** Retention factor Rf = solute / solvent distance. */
  retentionFactor(solute: number, solvent: number): number {
    if (solvent <= 0) return 0;
    const Rf = solute / solvent;
    this._history.push({ method: 'retentionFactor', Rf });
    return Math.max(0, Math.min(1, Rf));
  }

  /** Compute resolution between two peaks. */
  resolution(peaks: Array<{ time: number; width: number }>): number {
    if (peaks.length < 2) return 0;
    const [a, b] = peaks;
    const avgWidth = (a.width + b.width) / 2;
    if (avgWidth === 0) return 0;
    const R = (b.time - a.time) / avgWidth;
    this._history.push({ method: 'resolution', R });
    return R;
  }

  /** Build a calibration curve via linear regression. */
  calibrationCurve(standards: Array<{ concentration: number; reading: number }>, readings: number[]): CalibrationCurve {
    const n = standards.length;
    if (n === 0) {
      const empty: CalibrationCurve = { standards, slope: 0, intercept: 0, rSquared: 0 };
      this._calibrations.push(empty);
      return empty;
    }
    const sumX = standards.reduce((s, p) => s + p.concentration, 0);
    const sumY = standards.reduce((s, p) => s + p.reading, 0);
    const sumXY = standards.reduce((s, p) => s + p.concentration * p.reading, 0);
    const sumXX = standards.reduce((s, p) => s + p.concentration * p.concentration, 0);
    const sumYY = standards.reduce((s, p) => s + p.reading * p.reading, 0);
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    const denom = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));
    const rSquared = denom === 0 ? 0 : Math.pow(n * sumXY - sumX * sumY, 2) / denom;
    void readings;
    const curve: CalibrationCurve = { standards, slope, intercept, rSquared };
    this._calibrations.push(curve);
    this._history.push({ method: 'calibrationCurve', rSquared });
    return curve;
  }

  /** Detection vs limit of detection. */
  detection(concentration: number, lod: number): { detected: boolean; signalToNoise: number } {
    const detected = concentration >= lod;
    const signalToNoise = lod > 0 ? concentration / lod : 0;
    this._history.push({ method: 'detection', detected });
    return { detected, signalToNoise };
  }

  /** Quantitative analysis using calibration curve. */
  quantitative(sample: { reading: number }, calibration: CalibrationCurve): number {
    if (calibration.slope === 0) return 0;
    const concentration = (sample.reading - calibration.intercept) / calibration.slope;
    this._history.push({ method: 'quantitative', concentration });
    return Math.max(0, concentration);
  }

  toPacket(): DataPacket<{
    spectra: Spectra[];
    chromatograms: Chromatogram[];
    calibrations: CalibrationCurve[];
    history: unknown[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['chemistry', 'AnalyticalChemistry'],
      priority: 1,
      phase: 'chemistry:analytical',
    };
    return {
      id: `an-${(++this._counter).toString(36)}-${Date.now().toString(36)}`,
      payload: {
        spectra: this._spectra,
        chromatograms: this._chromatograms,
        calibrations: this._calibrations,
        history: this._history,
      },
      metadata,
    };
  }

  reset(): void {
    this._spectra = [];
    this._chromatograms = [];
    this._calibrations = [];
    this._history = [];
    this._counter = 0;
  }

  get spectraCount(): number {
    return this._spectra.length;
  }

  get chromatogramCount(): number {
    return this._chromatograms.length;
  }

  get calibrationCount(): number {
    return this._calibrations.length;
  }

  get historyDepth(): number {
    return this._history.length;
  }
}
