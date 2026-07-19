import { DataPacket, PacketMeta } from '../shared/types';

/** Eight-principles differentiation result. */
export interface EightPrinciples {
  readonly exteriorInterior: 'exterior' | 'interior' | 'half';
  readonly coldHeat: 'cold' | 'heat' | 'false-cold' | 'false-heat';
  readonly deficiencyExcess: 'deficiency' | 'excess';
  readonly yinYang: 'yin' | 'yang';
}

/** A TCM syndrome pattern. */
export interface TCMSyndrome {
  readonly name: string;
  readonly pattern: string;
  readonly organs: string[];
  readonly symptoms: string[];
  readonly tongue?: string;
  readonly pulse?: string;
  readonly treatment?: string;
}

/** An herb with nature/flavor/meridian attributes. */
export interface Herb {
  readonly name: string;
  readonly nature: 'cold' | 'cool' | 'neutral' | 'warm' | 'hot';
  readonly flavor: string[];
  readonly meridian: string[];
  readonly action: string;
  readonly dosage?: string;
}

/** An acupuncture point. */
export interface Acupoint {
  readonly name: string;
  readonly meridian: string;
  readonly location: string;
  readonly indication: string[];
  readonly needleDepth?: string;
}

/** A herbal formula composition. */
export interface HerbalFormula {
  readonly syndrome: string;
  readonly herbs: { name: string; role: 'chief' | 'deputy' | 'assistant' | 'envoy'; weight: number }[];
  readonly strategy: string;
}

/** Five-elements relationship. */
export interface ElementRelation {
  readonly from: string;
  readonly to: string;
  readonly relation: 'generating' | 'controlling' | 'insulting' | 'overacting';
}

/** Tongue diagnosis record. */
export interface TongueDiagnosis {
  readonly color: string;
  readonly coating: string;
  readonly shape: string;
  readonly interpretation: string;
}

/** Pulse diagnosis record. */
export interface PulseDiagnosis {
  readonly position: string;
  readonly depth: string;
  readonly speed: string;
  readonly rhythm: string;
  readonly interpretation: string;
}

/**
 * TCM performs Traditional Chinese Medicine pattern differentiation
 * (八纲辨证, 脏腑辨证, 六经辨证, 卫气营血辨证) and prescribes herbal formulas.
 */
export class TCM {
  private _syndromes: Map<string, TCMSyndrome> = new Map();
  private _herbs: Map<string, Herb> = new Map();
  private _acupoints: Map<string, Acupoint> = new Map();
  private _prescriptions: HerbalFormula[] = [];
  private _history: unknown[] = [];
  private _counter = 0;

  constructor() {
    this._seedKnowledge();
  }

  get syndromeCount(): number { return this._syndromes.size; }
  get herbCount(): number { return this._herbs.size; }
  get acupointCount(): number { return this._acupoints.size; }
  get prescriptionCount(): number { return this._prescriptions.length; }

  /** Top-level diagnosis from symptoms, pulse, and tongue. */
  diagnose(symptoms: string[], pulse: string, tongue: string): TCMSyndrome {
    const principles = this.eightPrinciples(symptoms);
    const pattern = `${principles.exteriorInterior}-${principles.coldHeat}-${principles.deficiencyExcess}`;
    const organs = this._inferOrgans(symptoms);
    const syndrome: TCMSyndrome = {
      name: `pattern-${pattern}`,
      pattern,
      organs,
      symptoms,
      tongue,
      pulse,
      treatment: this._deriveTreatment(principles, organs),
    };
    this._history.push({ op: 'diagnose', pattern, organs });
    return syndrome;
  }

  /** Apply eight-principles differentiation. */
  eightPrinciples(symptoms: string[]): EightPrinciples {
    const hasFever = symptoms.some(s => s.includes('fever'));
    const hasChill = symptoms.some(s => s.includes('chill'));
    const hasAversion = symptoms.some(s => s.includes('aversion'));
    const exteriorInterior = hasAversion ? 'exterior' : 'interior';
    const coldHeat = hasFever && !hasChill ? 'heat' : hasChill && !hasFever ? 'cold' : 'false-cold';
    const deficiencyExcess = symptoms.some(s => s.includes('fatigue')) ? 'deficiency' : 'excess';
    const yinYang = coldHeat === 'heat' ? 'yang' : 'yin';
    return { exteriorInterior, coldHeat, deficiencyExcess, yinYang };
  }

  /** Zang-fu (organ) pattern differentiation. */
  zangfu(pattern: string): { organs: string[]; dysfunction: string } {
    const map: Record<string, string[]> = {
      'liver-qi-stagnation': ['liver'],
      'spleen-qi-deficiency': ['spleen'],
      'kidney-yang-deficiency': ['kidney'],
      'heart-blood-deficiency': ['heart'],
      'lung-qi-deficiency': ['lung'],
    };
    return { organs: map[pattern] ?? ['unknown'], dysfunction: pattern };
  }

  /** Qi-blood-fluid differentiation. */
  qiBloodFluid(symptoms: string[]): { level: string; stagnation: string[]; deficiency: string[] } {
    const stagnation: string[] = [];
    const deficiency: string[] = [];
    for (const s of symptoms) {
      if (s.includes('pain')) stagnation.push('qi-stagnation');
      if (s.includes('pallor')) deficiency.push('blood-deficiency');
      if (s.includes('edema')) stagnation.push('fluid-retention');
    }
    return { level: stagnation.length > deficiency.length ? 'qi' : 'blood', stagnation, deficiency };
  }

  /** Six-meridian (六经) stage differentiation. */
  sixMeridians(stage: string): { stage: string; organs: string[]; symptoms: string[] } {
    const map: Record<string, { organs: string[]; symptoms: string[] }> = {
      taiyang: { organs: ['bladder', 'small-intestine'], symptoms: ['aversion-cold', 'fever', 'headache'] },
      yangming: { organs: ['stomach', 'large-intestine'], symptoms: ['high-fever', 'sweating', 'thirst'] },
      shaoyang: { organs: ['gallbladder', 'sanjiao'], symptoms: ['alternating-chill-fever'] },
      taiyin: { organs: ['spleen', 'lung'], symptoms: ['abdominal-distension', 'diarrhea'] },
      shaoyin: { organs: ['heart', 'kidney'], symptoms: ['somnolence', 'cold-extremities'] },
      jueyin: { organs: ['liver', 'pericardium'], symptoms: ['thirst', 'hunger-no-appetite'] },
    };
    const entry = map[stage.toLowerCase()] ?? { organs: [], symptoms: [] };
    return { stage, organs: entry.organs, symptoms: entry.symptoms };
  }

  /** Four-levels (卫气营血) stage differentiation. */
  fourLevels(stage: string): { stage: string; level: string; manifestations: string[] } {
    const map: Record<string, string[]> = {
      wei: ['fever', 'aversion-cold', 'pulse-floating'],
      qi: ['high-fever', 'sweating', 'thirst'],
      ying: ['night-fever', 'irritability', 'faint-rash'],
      xue: ['bleeding', 'rash', 'coma'],
    };
    return { stage, level: stage, manifestations: map[stage.toLowerCase()] ?? [] };
  }

  /** Prescribe a herbal formula for a syndrome. */
  prescription(syndrome: string): HerbalFormula {
    const formula = this._formulaFor(syndrome);
    this._prescriptions.push(formula);
    this._history.push({ op: 'prescription', syndrome, herbs: formula.herbs.length });
    return formula;
  }

  /** Compose a complete herbal formula. */
  herbalFormula(syndrome: string): HerbalFormula {
    return this.prescription(syndrome);
  }

  /** Look up properties of an herb. */
  herbProperty(herb: string): Herb | null {
    return this._herbs.get(herb.toLowerCase()) ?? null;
  }

  /** Combine herbs and check for interactions. */
  herbCombination(herbs: string[]): { compatible: boolean; strategy: string; warning: string[] } {
    const warnings: string[] = [];
    const entries = herbs.map(h => this._herbs.get(h.toLowerCase())).filter(Boolean) as Herb[];
    const natures = new Set(entries.map(e => e.nature));
    if (entries.length < 2) return { compatible: true, strategy: 'single', warning: warnings };
    const coldHot = entries.some(e => e.nature === 'cold') && entries.some(e => e.nature === 'hot');
    if (coldHot) warnings.push('cold-hot combination requires caution');
    return {
      compatible: warnings.length === 0,
      strategy: entries.length >= 4 ? 'complex-formula' : 'simple-pair',
      warning: warnings,
    };
  }

  /** Select an acupuncture point for a condition. */
  acupuncturePoint(condition: string): Acupoint | null {
    for (const point of this._acupoints.values()) {
      if (point.indication.some(i => condition.toLowerCase().includes(i.toLowerCase()))) {
        return point;
      }
    }
    return null;
  }

  /** Look up a meridian by name. */
  meridian(name: string): { name: string; points: number; organs: string[] } {
    const organMap: Record<string, string[]> = {
      lung: ['lung'], largeIntestine: ['large-intestine'], stomach: ['stomach'], spleen: ['spleen'],
      heart: ['heart'], smallIntestine: ['small-intestine'], bladder: ['bladder'], kidney: ['kidney'],
      pericardium: ['pericardium'], triple: ['sanjiao'], gallbladder: ['gallbladder'], liver: ['liver'],
    };
    return { name, points: 20, organs: organMap[name] ?? [] };
  }

  /** Tongue diagnosis interpretation. */
  tongueDiagnosis(color: string, coating: string, shape: string): TongueDiagnosis {
    let interpretation = 'normal';
    if (color === 'pale') interpretation = 'qi-blood-deficiency';
    else if (color === 'red') interpretation = 'heat';
    else if (color === 'purple') interpretation = 'blood-stasis';
    if (coating === 'yellow') interpretation += ' with heat-dampness';
    if (coating === 'white') interpretation += ' with cold-dampness';
    return { color, coating, shape, interpretation };
  }

  /** Pulse diagnosis interpretation. */
  pulseDiagnosis(position: string, depth: string, speed: string, rhythm: string): PulseDiagnosis {
    let interpretation = 'normal';
    if (depth === 'floating') interpretation = 'exterior-syndrome';
    else if (depth === 'deep') interpretation = 'interior-syndrome';
    if (speed === 'rapid') interpretation += ', heat';
    if (speed === 'slow') interpretation += ', cold';
    if (rhythm === 'irregular') interpretation += ', arrhythmia-qi-stagnation';
    return { position, depth, speed, rhythm, interpretation };
  }

  /** Five-elements relationship analysis for a set of organs. */
  fiveElements(organs: string[]): ElementRelation[] {
    const generating: Record<string, string> = { wood: 'fire', fire: 'earth', earth: 'metal', metal: 'water', water: 'wood' };
    const organElement: Record<string, string> = { liver: 'wood', heart: 'fire', spleen: 'earth', lung: 'metal', kidney: 'water' };
    const relations: ElementRelation[] = [];
    for (let i = 0; i < organs.length; i++) {
      for (let j = i + 1; j < organs.length; j++) {
        const a = organElement[organs[i].toLowerCase()];
        const b = organElement[organs[j].toLowerCase()];
        if (!a || !b) continue;
        if (generating[a] === b) relations.push({ from: organs[i], to: organs[j], relation: 'generating' });
        else if (generating[b] === a) relations.push({ from: organs[j], to: organs[i], relation: 'generating' });
        else relations.push({ from: organs[i], to: organs[j], relation: 'controlling' });
      }
    }
    return relations;
  }

  private _inferOrgans(symptoms: string[]): string[] {
    const organs = new Set<string>();
    for (const s of symptoms) {
      if (s.includes('chest') || s.includes('palpitation')) organs.add('heart');
      if (s.includes('abdominal') || s.includes('appetite')) organs.add('spleen');
      if (s.includes('cough') || s.includes('breath')) organs.add('lung');
      if (s.includes('back') || s.includes('urine')) organs.add('kidney');
      if (s.includes('anger') || s.includes('rib')) organs.add('liver');
    }
    return Array.from(organs);
  }

  private _deriveTreatment(p: EightPrinciples, organs: string[]): string {
    const base = p.coldHeat === 'cold' ? 'warm' : p.coldHeat === 'heat' ? 'clear-heat' : 'harmonize';
    return `${base}-${organs.join('-')}`;
  }

  private _formulaFor(syndrome: string): HerbalFormula {
    const formulaMap: Record<string, { name: string; role: 'chief' | 'deputy' | 'assistant' | 'envoy' }[]> = {
      'liver-qi-stagnation': [{ name: 'chaihu', role: 'chief' }, { name: 'danggui', role: 'deputy' }],
      'spleen-qi-deficiency': [{ name: 'huangqi', role: 'chief' }, { name: 'baizhu', role: 'deputy' }, { name: 'gancao', role: 'envoy' }],
      'kidney-yang-deficiency': [{ name: 'fuzi', role: 'chief' }, { name: 'rougui', role: 'deputy' }],
    };
    const entries = formulaMap[syndrome] ?? [{ name: 'gancao', role: 'envoy' }];
    return {
      syndrome,
      herbs: entries.map(e => ({ ...e, weight: e.role === 'chief' ? 12 : e.role === 'deputy' ? 9 : 3 })),
      strategy: syndrome,
    };
  }

  private _seedKnowledge(): void {
    const herbs: Herb[] = [
      { name: 'chaihu', nature: 'cool', flavor: ['pungent', 'bitter'], meridian: ['liver', 'gallbladder'], action: 'soothe-liver-qi' },
      { name: 'danggui', nature: 'warm', flavor: ['sweet', 'pungent'], meridian: ['heart', 'liver'], action: 'tonify-blood' },
      { name: 'huangqi', nature: 'warm', flavor: ['sweet'], meridian: ['spleen', 'lung'], action: 'tonify-qi' },
      { name: 'baizhu', nature: 'warm', flavor: ['bitter', 'sweet'], meridian: ['spleen'], action: 'tonify-spleen' },
      { name: 'fuzi', nature: 'hot', flavor: ['pungent'], meridian: ['heart', 'kidney'], action: 'restore-yang' },
      { name: 'rougui', nature: 'hot', flavor: ['sweet', 'pungent'], meridian: ['kidney', 'spleen'], action: 'warm-yang' },
      { name: 'gancao', nature: 'neutral', flavor: ['sweet'], meridian: ['all-12-meridians'], action: 'harmonize' },
    ];
    for (const h of herbs) this._herbs.set(h.name, h);

    const points: Acupoint[] = [
      { name: 'hegu-LI4', meridian: 'largeIntestine', location: 'hand', indication: ['headache', 'pain'] },
      { name: 'zusanli-ST36', meridian: 'stomach', location: 'leg', indication: ['fatigue', 'digestive'] },
      { name: 'taichong-LR3', meridian: 'liver', location: 'foot', indication: ['anger', 'pain'] },
      { name: 'neiguan-PC6', meridian: 'pericardium', location: 'forearm', indication: ['nausea', 'chest'] },
    ];
    for (const p of points) this._acupoints.set(p.name, p);

    const syndromes: TCMSyndrome[] = [
      { name: 'liver-qi-stagnation', pattern: 'excess', organs: ['liver'], symptoms: ['rib-pain', 'irritability'] },
      { name: 'spleen-qi-deficiency', pattern: 'deficiency', organs: ['spleen'], symptoms: ['fatigue', 'appetite-low'] },
      { name: 'kidney-yang-deficiency', pattern: 'deficiency-cold', organs: ['kidney'], symptoms: ['cold-extremities', 'low-back-pain'] },
    ];
    for (const s of syndromes) this._syndromes.set(s.name, s);
  }

  toPacket(): DataPacket<{
    syndromes: number;
    herbs: number;
    acupoints: number;
    prescriptions: HerbalFormula[];
    history: unknown[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['medicine', 'TCM'],
      priority: 1,
      phase: 'tcm',
    };
    return {
      id: `tcm-${Date.now().toString(36)}-${(++this._counter).toString(36)}`,
      payload: {
        syndromes: this._syndromes.size,
        herbs: this._herbs.size,
        acupoints: this._acupoints.size,
        prescriptions: [...this._prescriptions],
        history: [...this._history],
      },
      metadata,
    };
  }

  reset(): void {
    this._syndromes.clear();
    this._herbs.clear();
    this._acupoints.clear();
    this._prescriptions = [];
    this._history = [];
    this._counter = 0;
    this._seedKnowledge();
  }
}
