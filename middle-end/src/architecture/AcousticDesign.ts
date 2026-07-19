import { DataPacket, PacketMeta } from '../shared/types';

/** Sound source descriptor. */
export interface SoundSource {
  readonly id: string;
  readonly level: number;
  readonly frequency: number;
  readonly duration: number;
  readonly type: 'point' | 'line' | 'plane';
}

/** Acoustic space descriptor. */
export interface AcousticSpace {
  readonly id: string;
  readonly volume: number;
  readonly surfaces: AcousticSurface[];
  readonly absorption: number;
  readonly reverberationTime: number;
}

/** Acoustic surface descriptor. */
export interface AcousticSurface {
  readonly material: string;
  readonly area: number;
  readonly absorptionCoeff: number;
}

/** Noise criteria descriptor. */
export interface NoiseCriteria {
  readonly curve: string;
  readonly level: number;
  readonly category: 'NC' | 'NR' | 'RC' | 'PNC';
  readonly acceptable: boolean;
}

/** Sound transmission descriptor. */
export interface SoundTransmission {
  readonly stc: number;
  readonly frequency: number[];
  readonly transmissionLoss: number[];
  readonly rating: 'poor' | 'fair' | 'good' | 'excellent';
}

/** Speech intelligibility result. */
export interface SpeechIntelligibility {
  readonly sti: number;
  readonly rasti: number;
  readonly alcons: number;
  readonly category: 'bad' | 'poor' | 'fair' | 'good' | 'excellent';
}

/** Acoustic treatment descriptor. */
export interface AcousticTreatment {
  readonly type: 'absorber' | 'diffuser' | 'bass_trap' | 'resonator' | 'isolator';
  readonly placement: string;
  readonly coverage: number;
  readonly effectiveness: number;
}

/** Room mode descriptor. */
export interface RoomMode {
  readonly frequency: number;
  readonly mode: string;
  readonly order: [number, number, number];
  readonly decay: number;
}

export class AcousticDesign {
  private _sources: Map<string, SoundSource> = new Map();
  private _spaces: Map<string, AcousticSpace> = new Map();
  private _criteria: NoiseCriteria[] = [];
  private _transmission: Map<string, SoundTransmission> = new Map();
  private _intelligibility: SpeechIntelligibility[] = [];
  private _treatments: AcousticTreatment[] = [];
  private _roomModes: RoomMode[] = [];
  private _history: unknown[] = [];
  private _counter = 0;

  constructor() {
    this._seedSpaces();
  }

  private _seedSpaces(): void {
    const office: AcousticSpace = {
      id: 'office-typical',
      volume: 150,
      surfaces: [
        { material: 'carpet', area: 50, absorptionCoeff: 0.4 },
        { material: 'gypsum', area: 100, absorptionCoeff: 0.05 },
        { material: 'acoustic_tile', area: 50, absorptionCoeff: 0.7 },
      ],
      absorption: 0.15,
      reverberationTime: 0.5,
    };
    const auditorium: AcousticSpace = {
      id: 'auditorium',
      volume: 3000,
      surfaces: [
        { material: 'wood_panel', area: 400, absorptionCoeff: 0.15 },
        { material: 'upholstered_seat', area: 200, absorptionCoeff: 0.6 },
        { material: 'concrete', area: 300, absorptionCoeff: 0.02 },
      ],
      absorption: 0.25,
      reverberationTime: 1.5,
    };
    this._spaces.set(office.id, office);
    this._spaces.set(auditorium.id, auditorium);
  }

  decibel(intensity: number, reference: number = 1e-12): number {
    if (intensity <= 0) return -Infinity;
    const db = 10 * Math.log10(intensity / reference);
    this._history.push({ op: 'decibel', db });
    return Math.round(db * 100) / 100;
  }

  soundLevel(sources: number[]): number {
    let sum = 0;
    for (const s of sources) sum += Math.pow(10, s / 10);
    const level = 10 * Math.log10(sum);
    this._history.push({ op: 'soundLevel', level });
    return Math.round(level * 100) / 100;
  }

  reverberation(volume: number, surfaces: AcousticSurface[]): number {
    let totalAbsorption = 0;
    for (const s of surfaces) totalAbsorption += s.area * s.absorptionCoeff;
    const rt = 0.161 * volume / Math.max(0.01, totalAbsorption);
    this._history.push({ op: 'reverberation', rt });
    return Math.round(rt * 1000) / 1000;
  }

  sabineFormula(volume: number, totalAbsorption: number): number {
    const rt = 0.161 * volume / Math.max(0.01, totalAbsorption);
    this._history.push({ op: 'sabineFormula', rt });
    return Math.round(rt * 1000) / 1000;
  }

  noiseCriteria(level: number, application: 'office' | 'residential' | 'school' | 'hospital' | 'auditorium' | 'studio'): NoiseCriteria {
    const map: Record<string, { curve: string; max: number }> = {
      office: { curve: 'NC-35', max: 35 },
      residential: { curve: 'NC-30', max: 30 },
      school: { curve: 'NC-35', max: 35 },
      hospital: { curve: 'NC-30', max: 30 },
      auditorium: { curve: 'NC-25', max: 25 },
      studio: { curve: 'NC-15', max: 15 },
    };
    const m = map[application];
    const nc: NoiseCriteria = {
      curve: m.curve,
      level,
      category: 'NC',
      acceptable: level <= m.max,
    };
    this._criteria.push(nc);
    this._history.push({ op: 'noiseCriteria', application, acceptable: nc.acceptable });
    return nc;
  }

  soundTransmission(construction: 'single_glass' | 'double_glass' | 'gypsum_single' | 'gypsum_double' | 'concrete' | 'cmu'): SoundTransmission {
    const cached = this._transmission.get(construction);
    if (cached) return cached;
    const stcMap: Record<string, number> = {
      single_glass: 31,
      double_glass: 39,
      gypsum_single: 33,
      gypsum_double: 45,
      concrete: 52,
      cmu: 48,
    };
    const stc = stcMap[construction];
    const frequencies = [125, 250, 500, 1000, 2000, 4000];
    const transmissionLoss: number[] = frequencies.map((f, i) => stc - 8 + i * 4 + Math.log2(f / 500) * 3);
    let rating: SoundTransmission['rating'];
    if (stc < 35) rating = 'poor';
    else if (stc < 45) rating = 'fair';
    else if (stc < 55) rating = 'good';
    else rating = 'excellent';
    const result: SoundTransmission = { stc, frequency: frequencies, transmissionLoss, rating };
    this._transmission.set(construction, result);
    this._history.push({ op: 'soundTransmission', construction, stc });
    return result;
  }

  impactNoise(impactType: 'footstep' | 'chair' | 'dropped' | 'hammer', floorType: 'concrete' | 'wood' | 'carpet' | 'vinyl'): { iic: number; level: number; rating: string } {
    const iicMap: Record<string, Record<string, number>> = {
      concrete: { footstep: 35, chair: 30, dropped: 30, hammer: 25 },
      wood: { footstep: 40, chair: 35, dropped: 35, hammer: 30 },
      carpet: { footstep: 65, chair: 60, dropped: 55, hammer: 50 },
      vinyl: { footstep: 45, chair: 40, dropped: 35, hammer: 30 },
    };
    const iic = iicMap[floorType][impactType];
    const level = 90 - iic;
    let rating: string;
    if (iic >= 65) rating = 'excellent';
    else if (iic >= 55) rating = 'good';
    else if (iic >= 45) rating = 'fair';
    else rating = 'poor';
    this._history.push({ op: 'impactNoise', floorType, iic });
    return { iic, level, rating };
  }

  absorption(material: 'acoustic_foam' | 'fiberglass' | 'mineral_wool' | 'perforated_panel' | 'membrane' | 'helmholtz', thickness: number): { coeff125: number; coeff500: number; coeff2k: number; nrc: number } {
    const baseMap: Record<string, { low: number; mid: number; high: number }> = {
      acoustic_foam: { low: 0.1, mid: 0.6, high: 0.95 },
      fiberglass: { low: 0.3, mid: 0.85, high: 0.95 },
      mineral_wool: { low: 0.3, mid: 0.85, high: 0.9 },
      perforated_panel: { low: 0.4, mid: 0.8, high: 0.5 },
      membrane: { low: 0.5, mid: 0.3, high: 0.2 },
      helmholtz: { low: 0.7, mid: 0.3, high: 0.1 },
    };
    const m = baseMap[material];
    const factor = Math.min(2, thickness / 0.05);
    const coeff125 = Math.min(1, m.low * factor);
    const coeff500 = m.mid;
    const coeff2k = m.high;
    const nrc = Math.round(((coeff125 + coeff500 + coeff500 + coeff2k) / 4) * 100) / 100;
    this._history.push({ op: 'absorption', material, nrc });
    return {
      coeff125: Math.round(coeff125 * 100) / 100,
      coeff500: Math.round(coeff500 * 100) / 100,
      coeff2k: Math.round(coeff2k * 100) / 100,
      nrc,
    };
  }

  reflection(angle: number, surfaceAbsorption: number): { level: number; angle: number; delay: number } {
    const reflectedLevel = 1 - surfaceAbsorption;
    this._history.push({ op: 'reflection', angle });
    return {
      level: Math.round(reflectedLevel * 100) / 100,
      angle,
      delay: 0,
    };
  }

  diffusion(surfaceType: 'qrD' | 'schroeder' | 'poly' | 'primitive_root' | 'quadratic_residue'): { scatteringCoeff: number; diffusionCoeff: number; bandwidth: string } {
    const map: Record<string, { scatteringCoeff: number; diffusionCoeff: number; bandwidth: string }> = {
      qrD: { scatteringCoeff: 0.85, diffusionCoeff: 0.9, bandwidth: '500Hz-4kHz' },
      schroeder: { scatteringCoeff: 0.9, diffusionCoeff: 0.95, bandwidth: '500Hz-4kHz' },
      poly: { scatteringCoeff: 0.7, diffusionCoeff: 0.75, bandwidth: '1kHz-4kHz' },
      primitive_root: { scatteringCoeff: 0.88, diffusionCoeff: 0.92, bandwidth: '500Hz-4kHz' },
      quadratic_residue: { scatteringCoeff: 0.87, diffusionCoeff: 0.93, bandwidth: '500Hz-4kHz' },
    };
    this._history.push({ op: 'diffusion', surfaceType });
    return map[surfaceType];
  }

  echo(directLevel: number, reflectedLevel: number, delayMs: number): { isEcho: boolean; haasEffect: boolean; level: number } {
    const isEcho = delayMs > 50 && reflectedLevel > directLevel * 0.1;
    const haasEffect = delayMs > 5 && delayMs < 30;
    this._history.push({ op: 'echo', delayMs, isEcho });
    return { isEcho, haasEffect, level: reflectedLevel };
  }

  flutter(pathLength: number, frequency: number): { present: boolean; rate: number; severity: string } {
    const rate = 343 / (2 * pathLength);
    const present = Math.abs(rate - frequency) < 20;
    let severity: string;
    if (!present) severity = 'none';
    else if (rate > 200) severity = 'low';
    else if (rate > 100) severity = 'moderate';
    else severity = 'high';
    this._history.push({ op: 'flutter', pathLength, present });
    return { present, rate: Math.round(rate), severity };
  }

  roomModes(length: number, width: number, height: number, maxOrder: number = 3): RoomMode[] {
    const c = 343;
    const modes: RoomMode[] = [];
    for (let nx = 0; nx <= maxOrder; nx++) {
      for (let ny = 0; ny <= maxOrder; ny++) {
        for (let nz = 0; nz <= maxOrder; nz++) {
          if (nx === 0 && ny === 0 && nz === 0) continue;
          const freq = (c / 2) * Math.sqrt(Math.pow(nx / length, 2) + Math.pow(ny / width, 2) + Math.pow(nz / height, 2));
          if (freq < 300) {
            modes.push({
              frequency: Math.round(freq * 100) / 100,
              mode: `${nx},${ny},${nz}`,
              order: [nx, ny, nz],
              decay: Math.round((100 / freq) * 100) / 100,
            });
          }
        }
      }
    }
    modes.sort((a, b) => a.frequency - b.frequency);
    this._roomModes.push(...modes.slice(0, 20));
    this._history.push({ op: 'roomModes', count: modes.length });
    return modes.slice(0, 20);
  }

  speechIntelligibility(rt: number, snr: number, stiInput: number = 0.6): SpeechIntelligibility {
    const rtFactor = Math.exp(-0.5 * rt);
    const snrFactor = Math.min(1, Math.max(0, (snr + 15) / 30));
    const sti = Math.max(0, Math.min(1, stiInput * rtFactor * snrFactor));
    const rasti = Math.max(0, Math.min(1, sti * 0.95));
    const alcons = 100 * Math.exp(-0.1 * (snr + 15)) * Math.max(0.1, rt);
    let category: SpeechIntelligibility['category'];
    if (sti < 0.3) category = 'bad';
    else if (sti < 0.45) category = 'poor';
    else if (sti < 0.6) category = 'fair';
    else if (sti < 0.75) category = 'good';
    else category = 'excellent';
    const result: SpeechIntelligibility = {
      sti: Math.round(sti * 100) / 100,
      rasti: Math.round(rasti * 100) / 100,
      alcons: Math.round(alcons * 100) / 100,
      category,
    };
    this._intelligibility.push(result);
    this._history.push({ op: 'speechIntelligibility', sti });
    return result;
  }

  noiseControl(source: string, currentLevel: number, targetLevel: number): { reduction: number; method: string; stcRequired: number } {
    const reduction = currentLevel - targetLevel;
    const stcRequired = Math.ceil(reduction);
    let method: string;
    if (reduction <= 5) method = 'absorption';
    else if (reduction <= 15) method = 'barrier + absorption';
    else if (reduction <= 25) method = 'double wall + isolation';
    else method = 'floating construction + isolation';
    this._history.push({ op: 'noiseControl', source, reduction });
    return { reduction, method, stcRequired };
  }

  acousticTreatment(problem: 'reverberation' | 'echo' | 'flutter' | 'modes' | 'isolation' | 'speech', surfaceArea: number): AcousticTreatment {
    const map: Record<string, { type: AcousticTreatment['type']; placement: string; effectiveness: number }> = {
      reverberation: { type: 'absorber', placement: 'ceiling', effectiveness: 0.85 },
      echo: { type: 'diffuser', placement: 'rear wall', effectiveness: 0.8 },
      flutter: { type: 'diffuser', placement: 'parallel walls', effectiveness: 0.75 },
      modes: { type: 'bass_trap', placement: 'corners', effectiveness: 0.7 },
      isolation: { type: 'isolator', placement: 'floor/wall', effectiveness: 0.9 },
      speech: { type: 'absorber', placement: 'ceiling + upper walls', effectiveness: 0.85 },
    };
    const m = map[problem];
    const treatment: AcousticTreatment = {
      type: m.type,
      placement: m.placement,
      coverage: Math.round(surfaceArea * 0.4),
      effectiveness: m.effectiveness,
    };
    this._treatments.push(treatment);
    this._history.push({ op: 'acousticTreatment', problem });
    return treatment;
  }

  get sourceCount(): number { return this._sources.size; }
  get spaceCount(): number { return this._spaces.size; }
  get criteriaCount(): number { return this._criteria.length; }
  get treatmentCount(): number { return this._treatments.length; }

  toPacket(): DataPacket<{
    sources: Map<string, SoundSource>;
    spaces: Map<string, AcousticSpace>;
    criteria: NoiseCriteria[];
    transmission: Map<string, SoundTransmission>;
    intelligibility: SpeechIntelligibility[];
    treatments: AcousticTreatment[];
    roomModes: RoomMode[];
    history: unknown[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['architecture', 'AcousticDesign'],
      priority: 1,
      phase: 'acoustic_design',
    };
    return {
      id: `acoustic-${Date.now().toString(36)}`,
      payload: {
        sources: this._sources,
        spaces: this._spaces,
        criteria: this._criteria,
        transmission: this._transmission,
        intelligibility: this._intelligibility,
        treatments: this._treatments,
        roomModes: this._roomModes,
        history: this._history,
      },
      metadata,
    };
  }

  reset(): void {
    this._sources = new Map();
    this._spaces = new Map();
    this._criteria = [];
    this._transmission = new Map();
    this._intelligibility = [];
    this._treatments = [];
    this._roomModes = [];
    this._history = [];
    this._counter = 0;
    this._seedSpaces();
  }
}
