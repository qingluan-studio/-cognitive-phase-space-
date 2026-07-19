import { DataPacket, PacketMeta } from '../shared/types';

/** Electrochemical cell descriptor. */
export interface ElectrochemicalCell {
  anode: string;
  cathode: string;
  voltage: number;
  type: 'galvanic' | 'electrolytic' | 'concentration';
}

/** Half-reaction descriptor. */
export interface HalfReaction {
  reaction: string;
  potential: number;
  electrons: number;
}

/** Corrosion descriptor. */
export interface Corrosion {
  metal: string;
  environment: string;
  rate: number;
  severity: 'low' | 'moderate' | 'high';
}

const FARADAY = 96485;
const R_GAS = 8.314;

const STANDARD_POTENTIALS: Record<string, number> = {
  'Li+/Li': -3.04,
  'K+/K': -2.93,
  'Ca2+/Ca': -2.87,
  'Na+/Na': -2.71,
  'Mg2+/Mg': -2.37,
  'Al3+/Al': -1.66,
  'Zn2+/Zn': -0.76,
  'Fe2+/Fe': -0.44,
  'Ni2+/Ni': -0.25,
  '2H+/H2': 0.00,
  'Cu2+/Cu': 0.34,
  'Ag+/Ag': 0.80,
  'Au3+/Au': 1.50,
  'F2/F-': 2.87,
  'Cl2/Cl-': 1.36,
  'O2/H2O': 1.23,
};

/** Electrochemistry: cells, Nernst, electrolysis. */
export class Electrochemistry {
  private _cells: ElectrochemicalCell[] = [];
  private _reactions: HalfReaction[] = [];
  private _history: unknown[] = [];
  private _counter = 0;

  /** Build a galvanic cell. */
  galvanicCell(anode: string, cathode: string): ElectrochemicalCell {
    const v = this.cellVoltage(anode, cathode);
    const cell: ElectrochemicalCell = { anode, cathode, voltage: v, type: 'galvanic' };
    this._cells.push(cell);
    this._history.push({ method: 'galvanicCell' });
    return cell;
  }

  /** Look up standard reduction potential for a half-reaction. */
  electrodePotential(reaction: string): number {
    const e = STANDARD_POTENTIALS[reaction] ?? 0;
    const half: HalfReaction = { reaction, potential: e, electrons: 2 };
    this._reactions.push(half);
    this._history.push({ method: 'electrodePotential', reaction });
    return e;
  }

  /** Standard cell voltage = E_cathode - E_anode. */
  cellVoltage(anode: string, cathode: string): number {
    const eA = this.electrodePotential(anode);
    const eC = this.electrodePotential(cathode);
    const v = eC - eA;
    this._history.push({ method: 'cellVoltage', v });
    return v;
  }

  /** Nernst equation E = E0 - (RT/nF) * ln(Q). */
  nernstEquation(E0: number, n: number, Q: number): number {
    if (n === 0) return E0;
    const E = E0 - (R_GAS * 298.15 / (n * FARADAY)) * Math.log(Q);
    this._history.push({ method: 'nernstEquation' });
    return E;
  }

  /** Electrolysis mass deposition via Faraday's law. */
  electrolysis(current: number, time: number, substance: { molarMass: number; valence: number }): number {
    const q = current * time;
    const moles = q / (FARADAY * substance.valence);
    const mass = moles * substance.molarMass;
    this._history.push({ method: 'electrolysis', mass });
    return mass;
  }

  /** Faraday's law wrapper. */
  faradaysLaw(current: number, time: number, molarMass: number): number {
    const moles = (current * time) / FARADAY;
    const mass = moles * molarMass;
    this._history.push({ method: 'faradaysLaw', mass });
    return mass;
  }

  /** Estimate corrosion rate for a metal in an environment. */
  corrosionRate(metal: string, environment: string): Corrosion {
    let rate = 0.01;
    let severity: 'low' | 'moderate' | 'high' = 'low';
    if (environment.includes('salt')) {
      rate += 0.05;
      severity = 'moderate';
    }
    if (environment.includes('acid')) {
      rate += 0.1;
      severity = 'high';
    }
    if (metal === 'Fe' || metal === 'Iron') {
      rate += 0.03;
    } else if (metal === 'Au' || metal === 'Pt') {
      rate = 0.001;
      severity = 'low';
    }
    const result: Corrosion = { metal, environment, rate, severity };
    this._history.push({ method: 'corrosionRate', metal });
    return result;
  }

  /** Battery capacity in Wh. */
  batteryCapacity(voltage: number, capacity: number): number {
    const wh = voltage * capacity;
    this._history.push({ method: 'batteryCapacity', wh });
    return wh;
  }

  /** Fuel cell efficiency estimate. */
  fuelCell(type: string, efficiency: number): { type: string; efficiency: number; voltage: number } {
    const voltage = 1.23 * efficiency;
    this._history.push({ method: 'fuelCell', type });
    return { type, efficiency, voltage };
  }

  /** Return a copy of the standard reduction potential table. */
  standardReductionPotentials(): Record<string, number> {
    this._history.push({ method: 'standardReductionPotentials' });
    return { ...STANDARD_POTENTIALS };
  }

  toPacket(): DataPacket<{
    cells: ElectrochemicalCell[];
    reactions: HalfReaction[];
    history: unknown[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['chemistry', 'Electrochemistry'],
      priority: 1,
      phase: 'chemistry:electrochemistry',
    };
    return {
      id: `ec-${(++this._counter).toString(36)}-${Date.now().toString(36)}`,
      payload: {
        cells: this._cells,
        reactions: this._reactions,
        history: this._history,
      },
      metadata,
    };
  }

  reset(): void {
    this._cells = [];
    this._reactions = [];
    this._history = [];
    this._counter = 0;
  }

  get cellCount(): number {
    return this._cells.length;
  }

  get reactionCount(): number {
    return this._reactions.length;
  }

  get historyDepth(): number {
    return this._history.length;
  }
}
