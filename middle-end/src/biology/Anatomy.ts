import { DataPacket, PacketMeta } from '../shared/types';

/** Organ descriptor. */
export interface Organ {
  name: string;
  system: string;
  function: string;
}

/** Skeleton descriptor. */
export interface Skeleton {
  bones: number;
  axial: number;
  appendicular: number;
}

/** Muscle descriptor. */
export interface Muscle {
  type: 'skeletal' | 'smooth' | 'cardiac';
  origin: string;
  insertion: string;
}

/** Nerve descriptor. */
export interface Nerve {
  name: string;
  path: string;
  type: 'sensory' | 'motor' | 'mixed';
}

/** Anatomy: body systems and structures. */
export class Anatomy {
  private _organs: Organ[] = [];
  private _skeleton: Skeleton = { bones: 206, axial: 80, appendicular: 126 };
  private _muscles: Muscle[] = [];
  private _nerves: Nerve[] = [];
  private _history: unknown[] = [];
  private _counter = 0;

  constructor() {
    this._seedSystems();
  }

  private _seedSystems(): void {
    const organs: Array<[string, string, string]> = [
      ['heart', 'circulatory', 'pump blood'],
      ['arteries', 'circulatory', 'carry blood away from heart'],
      ['veins', 'circulatory', 'carry blood to heart'],
      ['lungs', 'respiratory', 'gas exchange'],
      ['trachea', 'respiratory', 'air passage'],
      ['stomach', 'digestive', 'digest food'],
      ['liver', 'digestive', 'metabolize and detoxify'],
      ['intestines', 'digestive', 'absorb nutrients'],
      ['brain', 'nervous', 'control center'],
      ['spinal cord', 'nervous', 'relay signals'],
      ['pituitary', 'endocrine', 'master gland'],
      ['thyroid', 'endocrine', 'metabolism regulation'],
      ['adrenal', 'endocrine', 'stress response'],
      ['thymus', 'immune', 'T cell maturation'],
      ['spleen', 'immune', 'blood filtering'],
      ['lymph nodes', 'immune', 'immune surveillance'],
      ['kidneys', 'excretory', 'filter blood'],
      ['bladder', 'excretory', 'store urine'],
      ['skin', 'integumentary', 'barrier and sensation'],
      ['ovaries', 'reproductive', 'produce eggs'],
      ['testes', 'reproductive', 'produce sperm'],
    ];
    for (const [name, system, fn] of organs) {
      this._organs.push({ name, system, function: fn });
    }
  }

  /** Circulatory system organs. */
  circulatorySystem(): Organ[] {
    this._history.push({ method: 'circulatorySystem' });
    return this._organs.filter(o => o.system === 'circulatory');
  }

  /** Respiratory system organs. */
  respiratorySystem(): Organ[] {
    this._history.push({ method: 'respiratorySystem' });
    return this._organs.filter(o => o.system === 'respiratory');
  }

  /** Digestive system organs. */
  digestiveSystem(): Organ[] {
    this._history.push({ method: 'digestiveSystem' });
    return this._organs.filter(o => o.system === 'digestive');
  }

  /** Nervous system organs. */
  nervousSystem(): Organ[] {
    this._history.push({ method: 'nervousSystem' });
    return this._organs.filter(o => o.system === 'nervous');
  }

  /** Endocrine system organs. */
  endocrineSystem(): Organ[] {
    this._history.push({ method: 'endocrineSystem' });
    return this._organs.filter(o => o.system === 'endocrine');
  }

  /** Immune system organs. */
  immuneSystem(): Organ[] {
    this._history.push({ method: 'immuneSystem' });
    return this._organs.filter(o => o.system === 'immune');
  }

  /** Skeletal system summary. */
  skeletalSystem(): Skeleton {
    this._history.push({ method: 'skeletalSystem' });
    return { ...this._skeleton };
  }

  /** Muscular system summary. */
  muscularSystem(): { types: string[]; count: number } {
    this._history.push({ method: 'muscularSystem' });
    return { types: ['skeletal', 'smooth', 'cardiac'], count: 600 };
  }

  /** Reproductive system summary. */
  reproductiveSystem(): { male: string[]; female: string[] } {
    this._history.push({ method: 'reproductiveSystem' });
    return {
      male: ['testes', 'epididymis', 'vas deferens', 'prostate'],
      female: ['ovaries', 'fallopian tubes', 'uterus', 'vagina'],
    };
  }

  /** Look up the function of an organ. */
  organFunction(organ: string): string {
    const o = this._organs.find(x => x.name === organ);
    this._history.push({ method: 'organFunction', organ });
    return o?.function ?? 'unknown';
  }

  /** List all bone names (abbreviated). */
  boneList(): string[] {
    this._history.push({ method: 'boneList' });
    return ['skull', 'mandible', 'vertebrae', 'sternum', 'ribs', 'clavicle', 'scapula',
      'humerus', 'radius', 'ulna', 'carpals', 'metacarpals', 'phalanges', 'pelvis',
      'femur', 'patella', 'tibia', 'fibula', 'tarsals', 'metatarsals'];
  }

  /** List major muscles. */
  muscleList(): string[] {
    this._history.push({ method: 'muscleList' });
    return ['biceps brachii', 'triceps brachii', 'deltoid', 'pectoralis major',
      'rectus abdominis', 'quadriceps', 'hamstrings', 'gastrocnemius', 'gluteus maximus'];
  }

  /** List major nerves. */
  nerveList(): string[] {
    this._history.push({ method: 'nerveList' });
    return ['olfactory', 'optic', 'oculomotor', 'trigeminal', 'facial', 'vagus',
      'sciatic', 'femoral', 'phrenic', 'median'];
  }

  /** Body cavities. */
  bodyCavities(): string[] {
    this._history.push({ method: 'bodyCavities' });
    return ['cranial', 'spinal', 'thoracic', 'abdominal', 'pelvic'];
  }

  /** Body planes. */
  bodyPlanes(): Array<{ name: string; orientation: string }> {
    this._history.push({ method: 'bodyPlanes' });
    return [
      { name: 'sagittal', orientation: 'divides left/right' },
      { name: 'coronal', orientation: 'divides front/back' },
      { name: 'transverse', orientation: 'divides superior/inferior' },
    ];
  }

  /** Directional terms. */
  directionalTerms(): Array<{ term: string; meaning: string }> {
    this._history.push({ method: 'directionalTerms' });
    return [
      { term: 'superior', meaning: 'toward head' },
      { term: 'inferior', meaning: 'toward feet' },
      { term: 'anterior', meaning: 'front' },
      { term: 'posterior', meaning: 'back' },
      { term: 'medial', meaning: 'toward midline' },
      { term: 'lateral', meaning: 'away from midline' },
      { term: 'proximal', meaning: 'closer to origin' },
      { term: 'distal', meaning: 'farther from origin' },
    ];
  }

  toPacket(): DataPacket<{
    organs: Organ[];
    skeleton: Skeleton;
    muscles: Muscle[];
    nerves: Nerve[];
    history: unknown[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['biology', 'Anatomy'],
      priority: 1,
      phase: 'biology:anatomy',
    };
    return {
      id: `anat-${(++this._counter).toString(36)}-${Date.now().toString(36)}`,
      payload: {
        organs: this._organs,
        skeleton: this._skeleton,
        muscles: this._muscles,
        nerves: this._nerves,
        history: this._history,
      },
      metadata,
    };
  }

  reset(): void {
    this._organs = [];
    this._skeleton = { bones: 206, axial: 80, appendicular: 126 };
    this._muscles = [];
    this._nerves = [];
    this._history = [];
    this._counter = 0;
    this._seedSystems();
  }

  get organCount(): number {
    return this._organs.length;
  }

  get boneCount(): number {
    return this._skeleton.bones;
  }

  get historyDepth(): number {
    return this._history.length;
  }
}
