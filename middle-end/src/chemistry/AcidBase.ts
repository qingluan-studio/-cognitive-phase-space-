import { DataPacket, PacketMeta } from '../shared/types';

/** Acid-base system descriptor. */
export interface AcidBaseSystem {
  type: 'acid' | 'base' | 'neutral';
  strength: 'strong' | 'weak' | 'neutral';
  pH: number;
  pOH: number;
}

/** Buffer system descriptor. */
export interface Buffer {
  acid: string;
  salt: string;
  pH: number;
  capacity: number;
}

/** Titration curve descriptor. */
export interface Titration {
  curve: Array<{ volume: number; pH: number }>;
  endpoint: { volume: number; pH: number };
  indicator: string;
}

const KW_25C = 1.0e-14;

/** Acid-base chemistry: pH, buffers, titrations. */
export class AcidBase {
  private _systems: AcidBaseSystem[] = [];
  private _buffers: Buffer[] = [];
  private _titrations: Titration[] = [];
  private _history: unknown[] = [];
  private _counter = 0;

  /** pH from H+ concentration. */
  pH(concentration: number): number {
    if (concentration <= 0) return 7;
    const pH = -Math.log10(concentration);
    this._history.push({ method: 'pH', concentration, pH });
    return Math.max(0, Math.min(14, pH));
  }

  /** pOH from OH- concentration. */
  pOH(concentration: number): number {
    if (concentration <= 0) return 7;
    const pOH = -Math.log10(concentration);
    this._history.push({ method: 'pOH', concentration, pOH });
    return Math.max(0, Math.min(14, pOH));
  }

  /** Temperature-dependent ion product of water. */
  kw(T: number): number {
    const kw = KW_25C * Math.exp(-(1 / T - 1 / 298.15) * 5000);
    this._history.push({ method: 'kw', T });
    return kw;
  }

  /** Strong acid pH. */
  strongAcid(concentration: number): AcidBaseSystem {
    const pH = this.pH(concentration);
    const result: AcidBaseSystem = { type: 'acid', strength: 'strong', pH, pOH: 14 - pH };
    this._systems.push(result);
    this._history.push({ method: 'strongAcid' });
    return result;
  }

  /** Weak acid pH given Ka and concentration. */
  weakAcid(Ka: number, concentration: number): AcidBaseSystem {
    if (Ka <= 0 || concentration <= 0) {
      const r: AcidBaseSystem = { type: 'acid', strength: 'weak', pH: 7, pOH: 7 };
      this._systems.push(r);
      return r;
    }
    const h = (-Ka + Math.sqrt(Ka * Ka + 4 * Ka * concentration)) / 2;
    const pH = this.pH(h);
    const result: AcidBaseSystem = { type: 'acid', strength: 'weak', pH, pOH: 14 - pH };
    this._systems.push(result);
    this._history.push({ method: 'weakAcid', Ka });
    return result;
  }

  /** Strong base pH. */
  strongBase(concentration: number): AcidBaseSystem {
    const pOH = this.pOH(concentration);
    const result: AcidBaseSystem = { type: 'base', strength: 'strong', pH: 14 - pOH, pOH };
    this._systems.push(result);
    this._history.push({ method: 'strongBase' });
    return result;
  }

  /** Weak base pH given Kb and concentration. */
  weakBase(Kb: number, concentration: number): AcidBaseSystem {
    if (Kb <= 0 || concentration <= 0) {
      const r: AcidBaseSystem = { type: 'base', strength: 'weak', pH: 7, pOH: 7 };
      this._systems.push(r);
      return r;
    }
    const oh = (-Kb + Math.sqrt(Kb * Kb + 4 * Kb * concentration)) / 2;
    const pOH = this.pOH(oh);
    const result: AcidBaseSystem = { type: 'base', strength: 'weak', pH: 14 - pOH, pOH };
    this._systems.push(result);
    this._history.push({ method: 'weakBase', Kb });
    return result;
  }

  /** Buffer pH from Henderson-Hasselbalch using Ka. */
  bufferpH(Ka: number, acid: number, salt: number): number {
    if (Ka <= 0 || acid <= 0) return 7;
    const pKa = -Math.log10(Ka);
    const pH = pKa + Math.log10(salt / acid);
    const buffer: Buffer = {
      acid: 'HA',
      salt: 'A-',
      pH: Math.max(0, Math.min(14, pH)),
      capacity: Math.min(acid, salt) * 0.1,
    };
    this._buffers.push(buffer);
    this._history.push({ method: 'bufferpH' });
    return buffer.pH;
  }

  /** Henderson-Hasselbalch equation. */
  hendersonHasselbalch(pKa: number, acid: number, base: number): number {
    if (acid <= 0) return pKa;
    const pH = pKa + Math.log10(base / acid);
    this._history.push({ method: 'hendersonHasselbalch' });
    return Math.max(0, Math.min(14, pH));
  }

  /** Generate a titration curve given acid and base info. */
  titration(acid: { M: number; V: number }, base: { M: number; V: number }, volumes: number[]): Titration {
    const curve: Array<{ volume: number; pH: number }> = [];
    for (const v of volumes) {
      const molesAcid = acid.M * acid.V;
      const molesBase = base.M * v;
      const net = molesAcid - molesBase;
      const totalV = acid.V + v;
      let pH: number;
      if (net > 0) pH = -Math.log10(net / totalV);
      else if (net < 0) pH = 14 + Math.log10(-net / totalV);
      else pH = 7;
      curve.push({ volume: v, pH: Math.max(0, Math.min(14, pH)) });
    }
    const equivVol = (acid.M * acid.V) / base.M;
    const endpoint = { volume: equivVol, pH: 7 };
    const titration: Titration = { curve, endpoint, indicator: this.indicator(7) };
    this._titrations.push(titration);
    this._history.push({ method: 'titration' });
    return titration;
  }

  /** Compute equivalence point volume for M1*V1 = M2*V2. */
  equivalencePoint(M1: number, V1: number, M2: number): number {
    if (M2 <= 0) return 0;
    const v2 = (M1 * V1) / M2;
    this._history.push({ method: 'equivalencePoint', v2 });
    return v2;
  }

  /** Recommend an indicator for a target pH. */
  indicator(pH: number): string {
    let name: string;
    if (pH < 3.2) name = 'methyl orange';
    else if (pH < 6) name = 'bromothymol blue';
    else if (pH < 8.4) name = 'phenol red';
    else if (pH < 10) name = 'phenolphthalein';
    else name = 'alizarin yellow';
    this._history.push({ method: 'indicator', pH, name });
    return name;
  }

  /** Neutralization reaction result. */
  neutralization(acid: { M: number; V: number }, base: { M: number; V: number }): AcidBaseSystem {
    const netH = acid.M * acid.V - base.M * base.V;
    const totalV = acid.V + base.V;
    let pH: number;
    if (netH > 0) pH = -Math.log10(netH / totalV);
    else if (netH < 0) pH = 14 + Math.log10(-netH / totalV);
    else pH = 7;
    const result: AcidBaseSystem = {
      type: 'neutral',
      strength: 'neutral',
      pH: Math.max(0, Math.min(14, pH)),
      pOH: 14 - Math.max(0, Math.min(14, pH)),
    };
    this._systems.push(result);
    this._history.push({ method: 'neutralization' });
    return result;
  }

  toPacket(): DataPacket<{
    systems: AcidBaseSystem[];
    buffers: Buffer[];
    titrations: Titration[];
    history: unknown[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['chemistry', 'AcidBase'],
      priority: 1,
      phase: 'chemistry:acid-base',
    };
    return {
      id: `ab-${(++this._counter).toString(36)}-${Date.now().toString(36)}`,
      payload: {
        systems: this._systems,
        buffers: this._buffers,
        titrations: this._titrations,
        history: this._history,
      },
      metadata,
    };
  }

  reset(): void {
    this._systems = [];
    this._buffers = [];
    this._titrations = [];
    this._history = [];
    this._counter = 0;
  }

  get systemCount(): number {
    return this._systems.length;
  }

  get bufferCount(): number {
    return this._buffers.length;
  }

  get titrationCount(): number {
    return this._titrations.length;
  }

  get historyDepth(): number {
    return this._history.length;
  }
}
