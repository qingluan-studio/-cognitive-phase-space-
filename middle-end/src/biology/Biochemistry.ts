import { DataPacket, PacketMeta } from '../shared/types';

/** Enzyme descriptor. */
export interface Enzyme {
  name: string;
  substrate: string;
  km: number;
  vmax: number;
}

/** Metabolic pathway descriptor. */
export interface MetabolicPathway {
  steps: Array<{ enzyme: string; substrate: string; product: string }>;
  inputs: string[];
  outputs: string[];
}

/** Protein structure level. */
export interface ProteinStructure {
  level: 'primary' | 'secondary' | 'tertiary' | 'quaternary';
  description: string;
  features: string[];
}

/** Biochemistry: enzymes, metabolism, protein structure. */
export class Biochemistry {
  private _enzymes: Enzyme[] = [];
  private _pathways: MetabolicPathway[] = [];
  private _structures: ProteinStructure[] = [];
  private _history: unknown[] = [];
  private _counter = 0;

  /** Michaelis-Menten rate v = (Vmax * [S]) / (Km + [S]). */
  michaelisMenten(substrate: number, km: number, vmax: number): number {
    if (km + substrate === 0) return 0;
    const v = (vmax * substrate) / (km + substrate);
    this._history.push({ method: 'michaelisMenten', v });
    return v;
  }

  /** Lineweaver-Burk plot data: 1/v vs 1/[S]. */
  lineweaverBurk(km: number, vmax: number): { slope: number; intercept: number; points: Array<{ x: number; y: number }> } {
    const points: Array<{ x: number; y: number }> = [];
    for (let s = 0.5; s <= 5; s += 0.5) {
      const v = this.michaelisMenten(s, km, vmax);
      if (v > 0) points.push({ x: 1 / s, y: 1 / v });
    }
    this._history.push({ method: 'lineweaverBurk' });
    return { slope: km / vmax, intercept: 1 / vmax, points };
  }

  /** Enzyme inhibition analysis. */
  enzymeInhibition(type: 'competitive' | 'noncompetitive' | 'uncompetitive', inhibitor: number, ki: number): { type: string; apparentKm: number; apparentVmax: number } {
    const baseKm = 1;
    const baseVmax = 100;
    let apparentKm = baseKm;
    let apparentVmax = baseVmax;
    if (type === 'competitive') {
      apparentKm = baseKm * (1 + inhibitor / ki);
    } else if (type === 'noncompetitive') {
      apparentVmax = baseVmax / (1 + inhibitor / ki);
    } else if (type === 'uncompetitive') {
      apparentKm = baseKm / (1 + inhibitor / ki);
      apparentVmax = baseVmax / (1 + inhibitor / ki);
    }
    this._history.push({ method: 'enzymeInhibition', type });
    return { type, apparentKm, apparentVmax };
  }

  /** Allosteric regulation descriptor. */
  allostericRegulation(enzyme: string, effector: string): { enzyme: string; effector: string; effect: string } {
    const effect = effector.includes('activator') ? 'activation' : 'inhibition';
    this._history.push({ method: 'allostericRegulation' });
    return { enzyme, effector, effect };
  }

  /** Glycolysis pathway. */
  glycolysis(): MetabolicPathway {
    const pathway: MetabolicPathway = {
      steps: [
        { enzyme: 'hexokinase', substrate: 'glucose', product: 'glucose-6-phosphate' },
        { enzyme: 'phosphofructokinase', substrate: 'fructose-6-phosphate', product: 'fructose-1,6-bisphosphate' },
        { enzyme: 'aldolase', substrate: 'fructose-1,6-bisphosphate', product: 'GAP + DHAP' },
        { enzyme: 'pyruvate kinase', substrate: 'PEP', product: 'pyruvate' },
      ],
      inputs: ['glucose', '2 ATP', '2 NAD+'],
      outputs: ['2 pyruvate', '2 ATP', '2 NADH'],
    };
    this._pathways.push(pathway);
    this._history.push({ method: 'glycolysis' });
    return pathway;
  }

  /** Krebs cycle (citric acid cycle). */
  krebsCycle(): MetabolicPathway {
    const pathway: MetabolicPathway = {
      steps: [
        { enzyme: 'citrate synthase', substrate: 'oxaloacetate + acetyl-CoA', product: 'citrate' },
        { enzyme: 'isocitrate dehydrogenase', substrate: 'isocitrate', product: 'alpha-ketoglutarate' },
        { enzyme: 'succinate dehydrogenase', substrate: 'succinate', product: 'fumarate' },
        { enzyme: 'malate dehydrogenase', substrate: 'malate', product: 'oxaloacetate' },
      ],
      inputs: ['acetyl-CoA', '3 NAD+', 'FAD', 'ADP'],
      outputs: ['2 CO2', '3 NADH', 'FADH2', 'ATP'],
    };
    this._pathways.push(pathway);
    this._history.push({ method: 'krebsCycle' });
    return pathway;
  }

  /** Electron transport chain. */
  electronTransportChain(): MetabolicPathway {
    const pathway: MetabolicPathway = {
      steps: [
        { enzyme: 'Complex I', substrate: 'NADH', product: 'NAD+' },
        { enzyme: 'Complex II', substrate: 'FADH2', product: 'FAD' },
        { enzyme: 'Complex III', substrate: 'cytochrome b', product: 'cytochrome c' },
        { enzyme: 'Complex IV', substrate: 'cytochrome c', product: 'H2O' },
        { enzyme: 'ATP synthase', substrate: 'ADP + Pi', product: 'ATP' },
      ],
      inputs: ['NADH', 'FADH2', 'O2', 'ADP'],
      outputs: ['NAD+', 'FAD', 'H2O', 'ATP'],
    };
    this._pathways.push(pathway);
    this._history.push({ method: 'electronTransportChain' });
    return pathway;
  }

  /** Gluconeogenesis. */
  gluconeogenesis(): MetabolicPathway {
    const pathway: MetabolicPathway = {
      steps: [
        { enzyme: 'pyruvate carboxylase', substrate: 'pyruvate', product: 'oxaloacetate' },
        { enzyme: 'PEPCK', substrate: 'oxaloacetate', product: 'PEP' },
        { enzyme: 'fructose-1,6-bisphosphatase', substrate: 'FBP', product: 'F6P' },
        { enzyme: 'glucose-6-phosphatase', substrate: 'G6P', product: 'glucose' },
      ],
      inputs: ['2 pyruvate', '4 ATP', '2 GTP', '2 NADH'],
      outputs: ['glucose', 'ADP', 'GDP', 'NAD+'],
    };
    this._pathways.push(pathway);
    this._history.push({ method: 'gluconeogenesis' });
    return pathway;
  }

  /** Fatty acid oxidation (beta-oxidation). */
  fattyAcidOxidation(): MetabolicPathway {
    const pathway: MetabolicPathway = {
      steps: [
        { enzyme: 'acyl-CoA dehydrogenase', substrate: 'acyl-CoA', product: 'enoyl-CoA' },
        { enzyme: 'enoyl-CoA hydratase', substrate: 'enoyl-CoA', product: 'hydroxyacyl-CoA' },
        { enzyme: 'hydroxyacyl-CoA dehydrogenase', substrate: 'hydroxyacyl-CoA', product: 'ketoacyl-CoA' },
        { enzyme: 'thiolase', substrate: 'ketoacyl-CoA', product: 'acyl-CoA (shorter) + acetyl-CoA' },
      ],
      inputs: ['fatty acyl-CoA', 'FAD', 'NAD+'],
      outputs: ['acetyl-CoA', 'FADH2', 'NADH'],
    };
    this._pathways.push(pathway);
    this._history.push({ method: 'fattyAcidOxidation' });
    return pathway;
  }

  /** Fatty acid synthesis. */
  fattyAcidSynthesis(): MetabolicPathway {
    const pathway: MetabolicPathway = {
      steps: [
        { enzyme: 'acetyl-CoA carboxylase', substrate: 'acetyl-CoA', product: 'malonyl-CoA' },
        { enzyme: 'fatty acid synthase', substrate: 'malonyl-CoA + acetyl-CoA', product: 'palmitate' },
      ],
      inputs: ['acetyl-CoA', 'ATP', 'NADPH'],
      outputs: ['palmitate', 'ADP', 'NADP+'],
    };
    this._pathways.push(pathway);
    this._history.push({ method: 'fattyAcidSynthesis' });
    return pathway;
  }

  /** Urea cycle. */
  ureaCycle(): MetabolicPathway {
    const pathway: MetabolicPathway = {
      steps: [
        { enzyme: 'carbamoyl phosphate synthetase', substrate: 'NH3 + CO2', product: 'carbamoyl phosphate' },
        { enzyme: 'ornithine transcarbamylase', substrate: 'carbamoyl phosphate + ornithine', product: 'citrulline' },
        { enzyme: 'arginase', substrate: 'arginine', product: 'urea + ornithine' },
      ],
      inputs: ['NH3', 'CO2', 'aspartate'],
      outputs: ['urea', 'fumarate'],
    };
    this._pathways.push(pathway);
    this._history.push({ method: 'ureaCycle' });
    return pathway;
  }

  /** Protein synthesis summary. */
  proteinSynthesis(): MetabolicPathway {
    const pathway: MetabolicPathway = {
      steps: [
        { enzyme: 'RNA polymerase', substrate: 'DNA', product: 'mRNA' },
        { enzyme: 'ribosome', substrate: 'mRNA', product: 'polypeptide' },
      ],
      inputs: ['DNA', 'ATP', 'GTP', 'amino acids'],
      outputs: ['protein', 'ADP', 'GDP'],
    };
    this._pathways.push(pathway);
    this._history.push({ method: 'proteinSynthesis' });
    return pathway;
  }

  /** Primary structure descriptor. */
  primaryStructure(sequence: string): ProteinStructure {
    const s: ProteinStructure = {
      level: 'primary',
      description: 'linear amino acid sequence',
      features: [`${sequence.length} residues`],
    };
    this._structures.push(s);
    this._history.push({ method: 'primaryStructure' });
    return s;
  }

  /** Secondary structure descriptor. */
  secondaryStructure(type: 'alpha-helix' | 'beta-sheet' | 'turn', sequence: string): ProteinStructure {
    const s: ProteinStructure = {
      level: 'secondary',
      description: `local folding: ${type}`,
      features: [type, `${sequence.length} residues`],
    };
    this._structures.push(s);
    this._history.push({ method: 'secondaryStructure' });
    return s;
  }

  /** Tertiary structure descriptor. */
  tertiaryStructure(folds: number): ProteinStructure {
    const s: ProteinStructure = {
      level: 'tertiary',
      description: '3D folded structure',
      features: [`${folds} fold domains`],
    };
    this._structures.push(s);
    this._history.push({ method: 'tertiaryStructure' });
    return s;
  }

  /** Quaternary structure descriptor. */
  quaternaryStructure(subunits: number): ProteinStructure {
    const s: ProteinStructure = {
      level: 'quaternary',
      description: 'multi-subunit complex',
      features: [`${subunits} subunits`],
    };
    this._structures.push(s);
    this._history.push({ method: 'quaternaryStructure' });
    return s;
  }

  toPacket(): DataPacket<{
    enzymes: Enzyme[];
    pathways: MetabolicPathway[];
    structures: ProteinStructure[];
    history: unknown[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['biology', 'Biochemistry'],
      priority: 1,
      phase: 'biology:biochemistry',
    };
    return {
      id: `biochem-${(++this._counter).toString(36)}-${Date.now().toString(36)}`,
      payload: {
        enzymes: this._enzymes,
        pathways: this._pathways,
        structures: this._structures,
        history: this._history,
      },
      metadata,
    };
  }

  reset(): void {
    this._enzymes = [];
    this._pathways = [];
    this._structures = [];
    this._history = [];
    this._counter = 0;
  }

  get enzymeCount(): number {
    return this._enzymes.length;
  }

  get pathwayCount(): number {
    return this._pathways.length;
  }

  get structureCount(): number {
    return this._structures.length;
  }

  get historyDepth(): number {
    return this._history.length;
  }
}
