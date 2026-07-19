import { DataPacket, PacketMeta } from '../shared/types';

/** Route of drug administration. */
export type Route = 'oral' | 'iv' | 'im' | 'sc' | 'topical' | 'sublingual' | 'inhaled' | 'rectal';

/** A pharmacological agent and its key attributes. */
export interface Drug {
  readonly name: string;
  readonly mechanism: string;
  readonly indications: string[];
  readonly sideEffects: string[];
  readonly dosage: { min: number; max: number; unit: string };
  readonly interactions: string[];
  readonly class?: string;
}

/** A prescription issued for a patient. */
export interface Prescription {
  readonly id: string;
  readonly drug: string;
  readonly patient: string;
  readonly dose: number;
  readonly frequency: string;
  readonly duration: number;
  readonly route: Route;
  readonly warnings: string[];
  readonly issuedAt: number;
}

/** Pharmacokinetic parameters describing drug disposition. */
export interface Pharmacokinetics {
  readonly halfLife: number;
  readonly bioavailability: number;
  readonly volumeOfDistribution: number;
  readonly clearance: number;
  readonly steadyState: number;
  readonly therapeuticWindow: { min: number; max: number };
}

/** Detected drug-drug interaction. */
export interface Interaction {
  readonly drugA: string;
  readonly drugB: string;
  readonly severity: 'minor' | 'moderate' | 'severe' | 'contraindicated';
  readonly mechanism: string;
  readonly recommendation: string;
}

/** Adverse reaction record. */
export interface AdverseReaction {
  readonly drug: string;
  readonly reaction: string;
  readonly frequency: 'common' | 'uncommon' | 'rare';
  readonly severity: Severity;
}

type Severity = 'mild' | 'moderate' | 'severe';

/**
 * Pharmacology provides drug lookup, dosing, interaction checks, and
 * pharmacokinetic modeling for prescription support.
 */
export class Pharmacology {
  private _drugs: Map<string, Drug> = new Map();
  private _prescriptions: Prescription[] = [];
  private _interactions: Interaction[] = [];
  private _history: unknown[] = [];
  private _counter = 0;

  constructor() {
    this._seedFormulary();
  }

  get drugCount(): number { return this._drugs.size; }
  get prescriptionCount(): number { return this._prescriptions.length; }
  get interactionCount(): number { return this._interactions.length; }

  /** Look up a drug by canonical name. */
  drugLookup(name: string): Drug | null {
    const drug = this._drugs.get(name.toLowerCase());
    if (!drug) return null;
    this._history.push({ op: 'drugLookup', name });
    return drug;
  }

  /** Describe the mechanism of action for a drug. */
  mechanism(action: string): { description: string; target: string } {
    const targetMap: Record<string, string> = {
      inhibit: 'enzyme-inhibition',
      block: 'receptor-antagonism',
      agonist: 'receptor-agonism',
      modulate: 'allosteric-modulation',
    };
    const target = targetMap[action] ?? 'unknown';
    this._history.push({ op: 'mechanism', action, target });
    return { description: `${action} - ${target}`, target };
  }

  /** Calculate weight- and age-adjusted dosage for a condition. */
  dosage(weight: number, age: number, condition: string, drug: string): {
    dose: number; route: Route; interval: number; note: string;
  } {
    const entry = this._drugs.get(drug.toLowerCase());
    if (!entry) return { dose: 0, route: 'oral', interval: 24, note: 'drug not found' };
    const base = (entry.dosage.min + entry.dosage.max) / 2;
    const weightAdjusted = base * Math.max(0.5, Math.min(1.5, weight / 70));
    const ageFactor = age > 65 ? 0.75 : age < 12 ? 0.6 : 1;
    const dose = Number((weightAdjusted * ageFactor).toFixed(2));
    this._history.push({ op: 'dosage', drug, dose, condition });
    return {
      dose,
      route: 'oral',
      interval: condition.includes('severe') ? 8 : 12,
      note: `condition=${condition}, ageFactor=${ageFactor}`,
    };
  }

  /** List contraindications for a drug. */
  contraindications(drug: string): string[] {
    const entry = this._drugs.get(drug.toLowerCase());
    if (!entry) return [];
    const list: string[] = [];
    if (entry.class === 'nsaid') list.push('peptic-ulcer', 'renal-impairment');
    if (entry.class === 'beta-blocker') list.push('asthma', 'heart-block');
    if (entry.interactions.length > 3) list.push('polypharmacy');
    return list;
  }

  /** Detect an interaction between two drugs. */
  drugInteraction(drug1: string, drug2: string): Interaction {
    const a = this._drugs.get(drug1.toLowerCase());
    const b = this._drugs.get(drug2.toLowerCase());
    let severity: Interaction['severity'] = 'minor';
    let mech = 'no known interaction';
    if (a && b && a.interactions.includes(drug2)) {
      severity = 'moderate';
      mech = `cytochrome-p450 competition`;
    }
    if (a?.class === 'nsaid' && b?.class === 'anticoagulant') {
      severity = 'contraindicated';
      mech = 'increased bleeding risk';
    }
    const interaction: Interaction = {
      drugA: drug1,
      drugB: drug2,
      severity,
      mechanism: mech,
      recommendation: severity === 'contraindicated' ? 'avoid combination' : 'monitor closely',
    };
    this._interactions.push(interaction);
    return interaction;
  }

  /** Enumerate adverse reactions for a drug. */
  adverseReaction(drug: string): AdverseReaction[] {
    const entry = this._drugs.get(drug.toLowerCase());
    if (!entry) return [];
    return entry.sideEffects.map((effect, idx) => ({
      drug,
      reaction: effect,
      frequency: idx === 0 ? 'common' : idx < 3 ? 'uncommon' : 'rare',
      severity: effect.includes('fatal') ? 'severe' : effect.includes('bleed') ? 'severe' : 'mild',
    }));
  }

  /** Model drug absorption via a given route. */
  absorption(drug: string, route: Route): { rate: number; extent: number; tMax: number } {
    const entry = this._drugs.get(drug.toLowerCase());
    const baseRate = entry ? 0.5 : 0.3;
    const routeFactor: Record<Route, number> = {
      oral: 1, iv: 5, im: 2, sc: 1.5, topical: 0.3, sublingual: 1.8, inhaled: 2.5, rectal: 0.8,
    };
    const rate = baseRate * routeFactor[route];
    return { rate, extent: Math.min(1, rate * 0.4), tMax: Math.max(0.5, 4 / rate) };
  }

  /** Model drug distribution across volume. */
  distribution(drug: string, volume: number): { vd: number; concentration: number; protein: number } {
    const entry = this._drugs.get(drug.toLowerCase());
    const vd = entry ? volume * 0.6 : volume * 0.4;
    const dose = entry ? (entry.dosage.min + entry.dosage.max) / 2 : 1;
    return { vd, concentration: dose / Math.max(0.1, vd), protein: 0.7 };
  }

  /** Describe hepatic metabolism pathway for a drug. */
  metabolism(drug: string, pathway: string): { pathway: string; enzymes: string[]; firstPass: number } {
    const entry = this._drugs.get(drug.toLowerCase());
    const enzymes = pathway.includes('cyp') ? [pathway.toUpperCase(), 'CYP3A4'] : ['CYP3A4', 'CYP2D6'];
    const firstPass = entry?.class === 'beta-blocker' ? 0.6 : 0.3;
    return { pathway, enzymes, firstPass };
  }

  /** Describe renal excretion for a drug. */
  excretion(drug: string, route: Route): { renal: number; biliary: number; halfLife: number } {
    const entry = this._drugs.get(drug.toLowerCase());
    const renal = entry?.class === 'diuretic' ? 0.9 : 0.5;
    return { renal, biliary: 1 - renal, halfLife: entry ? 6 : 4 };
  }

  /** Compute half-life from clearance and volume of distribution. */
  halfLife(drug: string): number {
    const entry = this._drugs.get(drug.toLowerCase());
    if (!entry) return 4;
    const pk = this._computePK(entry);
    return pk.halfLife;
  }

  /** Estimate time to steady-state concentration (≈ 5 half-lives). */
  steadyState(drug: string, halfLife: number): { time: number; concentration: number; achieved: boolean } {
    const time = halfLife * 5;
    return { time, concentration: 0.94, achieved: true };
  }

  /** Bioavailability fraction for a given route. */
  bioavailability(drug: string, route: Route): number {
    const factor: Record<Route, number> = {
      oral: 0.6, iv: 1, im: 0.9, sc: 0.85, topical: 0.2, sublingual: 0.85, inhaled: 0.5, rectal: 0.5,
    };
    return factor[route];
  }

  /** Therapeutic window boundaries for a drug. */
  therapeuticWindow(drug: string): { min: number; max: number; ratio: number } {
    const entry = this._drugs.get(drug.toLowerCase());
    if (!entry) return { min: 1, max: 10, ratio: 10 };
    return { min: entry.dosage.min, max: entry.dosage.max, ratio: entry.dosage.max / entry.dosage.min };
  }

  /** Issue a prescription with conflict checks. */
  prescription(drug: string, patient: string, dose: number, frequency: string, duration: number): Prescription {
    const entry = this._drugs.get(drug.toLowerCase());
    const warnings: string[] = [];
    if (entry) {
      if (dose > entry.dosage.max) warnings.push('dose exceeds recommended maximum');
      if (duration > 90) warnings.push('long-term therapy requires monitoring');
      warnings.push(...this.contraindications(drug).slice(0, 2));
    }
    const rx: Prescription = {
      id: `rx-${(++this._counter).toString(36)}-${Date.now().toString(36)}`,
      drug,
      patient,
      dose,
      frequency,
      duration,
      route: 'oral',
      warnings,
      issuedAt: Date.now(),
    };
    this._prescriptions.push(rx);
    this._history.push({ op: 'prescription', id: rx.id, drug });
    return rx;
  }

  private _computePK(entry: Drug): Pharmacokinetics {
    const halfLife = entry.class === 'nsaid' ? 4 : entry.class === 'beta-blocker' ? 8 : 6;
    return {
      halfLife,
      bioavailability: 0.6,
      volumeOfDistribution: 0.6,
      clearance: 0.7,
      steadyState: halfLife * 5,
      therapeuticWindow: { min: entry.dosage.min, max: entry.dosage.max },
    };
  }

  private _seedFormulary(): void {
    const seeds: Drug[] = [
      {
        name: 'metformin',
        mechanism: 'biguanide; inhibits hepatic gluconeogenesis',
        indications: ['type-2-diabetes'],
        sideEffects: ['gi-upset', 'lactic-acidosis'],
        dosage: { min: 500, max: 2000, unit: 'mg' },
        interactions: ['contrast-dye', 'alcohol'],
        class: 'antidiabetic',
      },
      {
        name: 'aspirin',
        mechanism: 'coxinhibition; irreversible platelet cyclooxygenase',
        indications: ['pain', 'antiplatelet', 'inflammation'],
        sideEffects: ['gi-bleed', 'tinnitus', 'ulcer'],
        dosage: { min: 81, max: 1000, unit: 'mg' },
        interactions: ['warfarin', 'nsaid'],
        class: 'nsaid',
      },
      {
        name: 'warfarin',
        mechanism: 'vitamin-k-epoxide-reductase inhibition',
        indications: ['thromboprophylaxis', 'afib'],
        sideEffects: ['bleeding', 'necrosis'],
        dosage: { min: 1, max: 10, unit: 'mg' },
        interactions: ['aspirin', 'amiodarone', 'fluconazole'],
        class: 'anticoagulant',
      },
      {
        name: 'propranolol',
        mechanism: 'non-selective beta-adrenergic receptor antagonism',
        indications: ['hypertension', 'arrhythmia', 'migraine'],
        sideEffects: ['bradycardia', 'fatigue', 'bronchospasm'],
        dosage: { min: 10, max: 320, unit: 'mg' },
        interactions: ['verapamil', 'insulin'],
        class: 'beta-blocker',
      },
    ];
    for (const d of seeds) this._drugs.set(d.name, d);
  }

  toPacket(): DataPacket<{
    drugs: number;
    prescriptions: Prescription[];
    interactions: Interaction[];
    history: unknown[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['medicine', 'Pharmacology'],
      priority: 1,
      phase: 'pharmacology',
    };
    return {
      id: `pharmacology-${Date.now().toString(36)}-${(++this._counter).toString(36)}`,
      payload: {
        drugs: this._drugs.size,
        prescriptions: [...this._prescriptions],
        interactions: [...this._interactions],
        history: [...this._history],
      },
      metadata,
    };
  }

  reset(): void {
    this._drugs.clear();
    this._prescriptions = [];
    this._interactions = [];
    this._history = [];
    this._counter = 0;
    this._seedFormulary();
  }
}
