import { DataPacket, PacketMeta } from '../shared/types';

/** Organ descriptor. */
export interface Organ {
  name: string;
  system: string;
  function: string;
  weightGrams?: number;
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

/** Bone descriptor with detailed classification. */
export interface Bone {
  name: string;
  classification: 'long' | 'short' | 'flat' | 'irregular' | 'sesamoid' | 'sutural';
  count: number;
  location: string;
}

/** Joint descriptor. */
export interface Joint {
  name: string;
  type: 'fibrous' | 'cartilaginous' | 'synovial';
  mobility: 'synarthrosis' | 'amphiarthrosis' | 'diarthrosis';
  articulatingBones: string[];
  movement: string;
}

/** Cranial nerve descriptor (12 pairs). */
export interface CranialNerve {
  number: number;
  name: string;
  type: 'sensory' | 'motor' | 'both';
  function: string;
  foramen: string;
}

/** Tissue type descriptor. */
export interface Tissue {
  type: 'epithelial' | 'connective' | 'muscle' | 'nervous';
  subtype: string;
  location: string;
  function: string;
}

/** Skin layer descriptor. */
export interface SkinLayer {
  layer: string;
  depthMm: number;
  components: string[];
  function: string;
}

/** Blood component descriptor. */
export interface BloodComponent {
  name: string;
  countPerLiter: number;
  lifespanDays: number;
  function: string;
}

/** Heart chamber descriptor. */
export interface HeartChamber {
  name: string;
  wallThicknessMm: number;
  capacityMl: number;
  function: string;
}

/** Lung volume descriptor. */
export interface LungVolumes {
  tidalVolume: number; // mL
  inspiratoryReserve: number;
  expiratoryReserve: number;
  residualVolume: number;
}

/** Endocrine gland descriptor. */
export interface EndocrineGland {
  name: string;
  location: string;
  hormones: string[];
  function: string;
}

/** Body region descriptor. */
export interface BodyRegion {
  region: string;
  subregion: string;
  contents: string[];
}

/** Body composition descriptor. */
export interface BodyComposition {
  fatPercent: number;
  musclePercent: number;
  bonePercent: number;
  waterPercent: number;
  otherPercent: number;
}

/** History record. */
interface AnatomyRecord {
  method: string;
  target: string;
  timestamp: number;
}

/** Bone catalog (major bones with counts). */
const BONE_CATALOG: Bone[] = [
  { name: 'Skull (cranium)', classification: 'flat', count: 8, location: 'head' },
  { name: 'Facial bones', classification: 'irregular', count: 14, location: 'face' },
  { name: 'Mandible', classification: 'irregular', count: 1, location: 'jaw' },
  { name: 'Hyoid', classification: 'irregular', count: 1, location: 'neck' },
  { name: 'Vertebral column', classification: 'irregular', count: 33, location: 'axial' },
  { name: 'Sternum', classification: 'flat', count: 1, location: 'thorax' },
  { name: 'Ribs', classification: 'flat', count: 24, location: 'thorax' },
  { name: 'Clavicle', classification: 'long', count: 2, location: 'pectoral girdle' },
  { name: 'Scapula', classification: 'flat', count: 2, location: 'pectoral girdle' },
  { name: 'Humerus', classification: 'long', count: 2, location: 'arm' },
  { name: 'Radius', classification: 'long', count: 2, location: 'forearm' },
  { name: 'Ulna', classification: 'long', count: 2, location: 'forearm' },
  { name: 'Carpals', classification: 'short', count: 16, location: 'wrist' },
  { name: 'Metacarpals', classification: 'long', count: 10, location: 'hand' },
  { name: 'Phalanges (hand)', classification: 'long', count: 28, location: 'fingers' },
  { name: 'Pelvis', classification: 'flat', count: 2, location: 'pelvic girdle' },
  { name: 'Femur', classification: 'long', count: 2, location: 'thigh' },
  { name: 'Patella', classification: 'sesamoid', count: 2, location: 'knee' },
  { name: 'Tibia', classification: 'long', count: 2, location: 'leg' },
  { name: 'Fibula', classification: 'long', count: 2, location: 'leg' },
  { name: 'Tarsals', classification: 'short', count: 14, location: 'ankle' },
  { name: 'Metatarsals', classification: 'long', count: 10, location: 'foot' },
  { name: 'Phalanges (foot)', classification: 'long', count: 28, location: 'toes' },
];

/** Twelve cranial nerves (in pairs). */
const CRANIAL_NERVES: CranialNerve[] = [
  { number: 1, name: 'Olfactory', type: 'sensory', function: 'smell', foramen: 'cribriform plate' },
  { number: 2, name: 'Optic', type: 'sensory', function: 'vision', foramen: 'optic canal' },
  { number: 3, name: 'Oculomotor', type: 'motor', function: 'eye movement, pupil constriction', foramen: 'superior orbital fissure' },
  { number: 4, name: 'Trochlear', type: 'motor', function: 'eye movement (superior oblique)', foramen: 'superior orbital fissure' },
  { number: 5, name: 'Trigeminal', type: 'both', function: 'facial sensation, mastication', foramen: 'three branches: V1/V2/V3' },
  { number: 6, name: 'Abducens', type: 'motor', function: 'eye movement (lateral rectus)', foramen: 'superior orbital fissure' },
  { number: 7, name: 'Facial', type: 'both', function: 'facial expression, taste (anterior 2/3)', foramen: 'internal acoustic meatus' },
  { number: 8, name: 'Vestibulocochlear', type: 'sensory', function: 'hearing and balance', foramen: 'internal acoustic meatus' },
  { number: 9, name: 'Glossopharyngeal', type: 'both', function: 'taste (posterior 1/3), swallowing', foramen: 'jugular foramen' },
  { number: 10, name: 'Vagus', type: 'both', function: 'parasympathetic to thorax/abdomen', foramen: 'jugular foramen' },
  { number: 11, name: 'Accessory', type: 'motor', function: 'sternocleidomastoid, trapezius', foramen: 'jugular foramen' },
  { number: 12, name: 'Hypoglossal', type: 'motor', function: 'tongue movement', foramen: 'hypoglossal canal' },
];

/** Joints of the human body. */
const JOINTS: Joint[] = [
  { name: 'Sutures', type: 'fibrous', mobility: 'synarthrosis', articulatingBones: ['cranial bones'], movement: 'immobile' },
  { name: 'Gomphosis', type: 'fibrous', mobility: 'synarthrosis', articulatingBones: ['tooth', 'jaw'], movement: 'immobile (peg-in-socket)' },
  { name: 'Syndesmosis', type: 'fibrous', mobility: 'amphiarthrosis', articulatingBones: ['tibia', 'fibula'], movement: 'slight' },
  { name: 'Synchondrosis', type: 'cartilaginous', mobility: 'synarthrosis', articulatingBones: ['ribs', 'sternum (1st)'], movement: 'immobile' },
  { name: 'Symphysis pubis', type: 'cartilaginous', mobility: 'amphiarthrosis', articulatingBones: ['pubic bones'], movement: 'slight' },
  { name: 'Intervertebral disc', type: 'cartilaginous', mobility: 'amphiarthrosis', articulatingBones: ['vertebrae'], movement: 'slight' },
  { name: 'Glenohumeral (shoulder)', type: 'synovial', mobility: 'diarthrosis', articulatingBones: ['scapula', 'humerus'], movement: 'ball-and-socket, multiaxial' },
  { name: 'Coxal (hip)', type: 'synovial', mobility: 'diarthrosis', articulatingBones: ['pelvis', 'femur'], movement: 'ball-and-socket, multiaxial' },
  { name: 'Humeroulnar (elbow)', type: 'synovial', mobility: 'diarthrosis', articulatingBones: ['humerus', 'ulna'], movement: 'hinge, uniaxial' },
  { name: 'Tibiofemoral (knee)', type: 'synovial', mobility: 'diarthrosis', articulatingBones: ['femur', 'tibia'], movement: 'modified hinge' },
  { name: 'Atlantoaxial', type: 'synovial', mobility: 'diarthrosis', articulatingBones: ['atlas', 'axis'], movement: 'pivot, rotation' },
  { name: 'Radiocarpal (wrist)', type: 'synovial', mobility: 'diarthrosis', articulatingBones: ['radius', 'carpals'], movement: 'condyloid, biaxial' },
  { name: 'Temporomandibular (TMJ)', type: 'synovial', mobility: 'diarthrosis', articulatingBones: ['temporal', 'mandible'], movement: 'modified hinge, glide' },
];

/** Tissue catalog (4 primary tissue types). */
const TISSUES: Tissue[] = [
  { type: 'epithelial', subtype: 'simple squamous', location: 'alveoli, capillaries', function: 'diffusion, filtration' },
  { type: 'epithelial', subtype: 'simple cuboidal', location: 'kidney tubules, glands', function: 'secretion, absorption' },
  { type: 'epithelial', subtype: 'simple columnar', location: 'GI tract', function: 'absorption, secretion' },
  { type: 'epithelial', subtype: 'stratified squamous', location: 'skin, mouth, vagina', function: 'protection' },
  { type: 'epithelial', subtype: 'pseudostratified ciliated', location: 'trachea, bronchi', function: 'mucus propulsion' },
  { type: 'epithelial', subtype: 'transitional', location: 'bladder, ureter', function: 'stretch, distension' },
  { type: 'connective', subtype: 'loose (areolar)', location: 'under epithelia', function: 'support, immunity' },
  { type: 'connective', subtype: 'dense regular', location: 'tendons, ligaments', function: 'tensile strength one direction' },
  { type: 'connective', subtype: 'dense irregular', location: 'dermis, organ capsules', function: 'tensile strength multiple directions' },
  { type: 'connective', subtype: 'adipose', location: 'subcutaneous, around organs', function: 'energy storage, insulation' },
  { type: 'connective', subtype: 'hyaline cartilage', location: 'nose, trachea, joints', function: 'smooth joint surface' },
  { type: 'connective', subtype: 'elastic cartilage', location: 'ear, epiglottis', function: 'flexible support' },
  { type: 'connective', subtype: 'fibrocartilage', location: 'intervertebral disc, meniscus', function: 'compressive strength' },
  { type: 'connective', subtype: 'bone (compact)', location: 'diaphysis', function: 'mechanical support' },
  { type: 'connective', subtype: 'bone (spongy)', location: 'epiphysis', function: 'lightweight, hematopoiesis' },
  { type: 'connective', subtype: 'blood', location: 'cardiovascular', function: 'transport' },
  { type: 'muscle', subtype: 'skeletal', location: 'skeletal muscles', function: 'voluntary movement' },
  { type: 'muscle', subtype: 'cardiac', location: 'heart', function: 'involuntary pump' },
  { type: 'muscle', subtype: 'smooth', location: 'organs, vessels', function: 'involuntary peristalsis' },
  { type: 'nervous', subtype: 'neurons', location: 'CNS, PNS', function: 'signal transmission' },
  { type: 'nervous', subtype: 'glia', location: 'CNS, PNS', function: 'support, insulation' },
];

/** Skin layers. */
const SKIN_LAYERS: SkinLayer[] = [
  { layer: 'Stratum corneum', depthMm: 0.02, components: ['dead keratinocytes'], function: 'barrier' },
  { layer: 'Stratum lucidum', depthMm: 0.005, components: ['dead keratinocytes (palms/soles only)'], function: 'extra protection' },
  { layer: 'Stratum granulosum', depthMm: 0.005, components: ['keratohyalin granules'], function: 'keratinization' },
  { layer: 'Stratum spinosum', depthMm: 0.05, components: ['Langerhans cells', 'keratinocytes'], function: 'immunity, strength' },
  { layer: 'Stratum basale', depthMm: 0.01, components: ['stem cells', 'melanocytes', 'Merkel cells'], function: 'regeneration, pigment' },
  { layer: 'Papillary dermis', depthMm: 0.5, components: ['capillaries', 'Meissner corpuscles'], function: 'nutrition, light touch' },
  { layer: 'Reticular dermis', depthMm: 1.5, components: ['collagen', 'elastin', 'Pacini corpuscles'], function: 'strength, pressure' },
  { layer: 'Hypodermis', depthMm: 5, components: ['adipose', 'blood vessels'], function: 'insulation, energy' },
];

/** Blood components. */
const BLOOD_COMPONENTS: BloodComponent[] = [
  { name: 'Erythrocytes (RBC)', countPerLiter: 5e12, lifespanDays: 120, function: 'oxygen transport (hemoglobin)' },
  { name: 'Leukocytes (WBC)', countPerLiter: 7e9, lifespanDays: 13, function: 'immune defense' },
  { name: 'Neutrophils', countPerLiter: 4.2e9, lifespanDays: 0.5, function: 'phagocytosis' },
  { name: 'Lymphocytes', countPerLiter: 2.1e9, lifespanDays: 100, function: 'adaptive immunity' },
  { name: 'Monocytes', countPerLiter: 0.5e9, lifespanDays: 1, function: 'differentiate to macrophages' },
  { name: 'Eosinophils', countPerLiter: 0.15e9, lifespanDays: 8, function: 'parasite defense, allergy' },
  { name: 'Basophils', countPerLiter: 0.04e9, lifespanDays: 1.5, function: 'histamine release' },
  { name: 'Platelets', countPerLiter: 250e9, lifespanDays: 8, function: 'hemostasis' },
  { name: 'Plasma (water)', countPerLiter: 0.55, lifespanDays: 0, function: 'transport medium' },
];

/** Heart chambers. */
const HEART_CHAMBERS: HeartChamber[] = [
  { name: 'Right atrium', wallThicknessMm: 2, capacityMl: 100, function: 'receive deoxygenated blood from vena cavae' },
  { name: 'Right ventricle', wallThicknessMm: 4, capacityMl: 150, function: 'pump to pulmonary circuit' },
  { name: 'Left atrium', wallThicknessMm: 3, capacityMl: 100, function: 'receive oxygenated blood from pulmonary veins' },
  { name: 'Left ventricle', wallThicknessMm: 10, capacityMl: 150, function: 'pump to systemic circuit (aorta)' },
];

/** Endocrine glands catalog. */
const ENDOCRINE_GLANDS: EndocrineGland[] = [
  { name: 'Pineal', location: 'epithalamus', hormones: ['melatonin'], function: 'circadian rhythm' },
  { name: 'Hypothalamus', location: 'diencephalon', hormones: ['GnRH', 'CRH', 'TRH', 'GHRH', 'somatostatin', 'dopamine', 'oxytocin', 'ADH'], function: 'master regulator' },
  { name: 'Pituitary (anterior)', location: 'sella turcica', hormones: ['ACTH', 'TSH', 'FSH', 'LH', 'GH', 'PRL'], function: 'trophic hormones' },
  { name: 'Pituitary (posterior)', location: 'sella turcica', hormones: ['oxytocin', 'ADH'], function: 'neurohypophysis storage' },
  { name: 'Thyroid', location: 'neck', hormones: ['T3', 'T4', 'calcitonin'], function: 'metabolism, calcium homeostasis' },
  { name: 'Parathyroid', location: 'posterior thyroid', hormones: ['PTH'], function: 'calcium regulation' },
  { name: 'Thymus', location: 'mediastinum', hormones: ['thymosin', 'thymopoietin'], function: 'T cell maturation' },
  { name: 'Adrenal (cortex)', location: 'above kidneys', hormones: ['cortisol', 'aldosterone', 'DHEA'], function: 'stress, salt, sex steroids' },
  { name: 'Adrenal (medulla)', location: 'above kidneys', hormones: ['epinephrine', 'norepinephrine'], function: 'fight-or-flight' },
  { name: 'Pancreas', location: 'abdomen', hormones: ['insulin', 'glucagon', 'somatostatin'], function: 'glucose homeostasis' },
  { name: 'Ovaries', location: 'pelvis', hormones: ['estrogen', 'progesterone'], function: 'female reproduction' },
  { name: 'Testes', location: 'scrotum', hormones: ['testosterone'], function: 'male reproduction' },
];

/** Body regions and contents. */
const BODY_REGIONS: BodyRegion[] = [
  { region: 'Head', subregion: 'Cranial', contents: ['brain', 'meninges', 'CSF'] },
  { region: 'Head', subregion: 'Facial', contents: ['eyes', 'nose', 'mouth', 'ears'] },
  { region: 'Neck', subregion: 'Anterior', contents: ['trachea', 'esophagus', 'thyroid', 'carotids'] },
  { region: 'Neck', subregion: 'Posterior', contents: ['cervical spine', 'spinal cord'] },
  { region: 'Thorax', subregion: 'Mediastinum', contents: ['heart', 'great vessels', 'trachea', 'esophagus'] },
  { region: 'Thorax', subregion: 'Pleural cavities', contents: ['lungs'] },
  { region: 'Abdomen', subregion: 'Upper (RUQ)', contents: ['liver', 'gallbladder'] },
  { region: 'Abdomen', subregion: 'Upper (LUQ)', contents: ['stomach', 'spleen'] },
  { region: 'Abdomen', subregion: 'Lower (RLQ)', contents: ['cecum', 'appendix'] },
  { region: 'Abdomen', subregion: 'Lower (LLQ)', contents: ['sigmoid colon'] },
  { region: 'Pelvis', subregion: 'Male', contents: ['bladder', 'prostate', 'rectum'] },
  { region: 'Pelvis', subregion: 'Female', contents: ['bladder', 'uterus', 'ovaries', 'rectum'] },
  { region: 'Upper limb', subregion: 'Arm', contents: ['humerus', 'biceps', 'triceps', 'brachial artery'] },
  { region: 'Upper limb', subregion: 'Forearm', contents: ['radius', 'ulna', 'flexor/extensor muscles'] },
  { region: 'Upper limb', subregion: 'Hand', contents: ['carpals', 'metacarpals', 'phalanges'] },
  { region: 'Lower limb', subregion: 'Thigh', contents: ['femur', 'quadriceps', 'hamstrings'] },
  { region: 'Lower limb', subregion: 'Leg', contents: ['tibia', 'fibula', 'gastrocnemius', 'tibialis'] },
  { region: 'Lower limb', subregion: 'Foot', contents: ['tarsals', 'metatarsals', 'phalanges'] },
];

/** Spinal nerves (31 pairs). */
const SPINAL_NERVES = [
  { region: 'Cervical', pairs: 8, levels: 'C1-C8' },
  { region: 'Thoracic', pairs: 12, levels: 'T1-T12' },
  { region: 'Lumbar', pairs: 5, levels: 'L1-L5' },
  { region: 'Sacral', pairs: 5, levels: 'S1-S5' },
  { region: 'Coccygeal', pairs: 1, levels: 'Co1' },
];

/** Anatomy: body systems and structures. */
export class Anatomy {
  private _organs: Organ[] = [];
  private _skeleton: Skeleton = { bones: 206, axial: 80, appendicular: 126 };
  private _muscles: Muscle[] = [];
  private _nerves: Nerve[] = [];
  private _history: AnatomyRecord[] = [];
  private _counter = 0;

  constructor() {
    this._seedSystems();
  }

  private _seedSystems(): void {
    const organs: Array<[string, string, string, number]> = [
      ['heart', 'circulatory', 'pump blood', 300],
      ['aorta', 'circulatory', 'distribute oxygenated blood', 100],
      ['arteries', 'circulatory', 'carry blood away from heart', 0],
      ['veins', 'circulatory', 'carry blood to heart', 0],
      ['capillaries', 'circulatory', 'gas and nutrient exchange', 0],
      ['lungs', 'respiratory', 'gas exchange', 1000],
      ['trachea', 'respiratory', 'air passage', 30],
      ['bronchi', 'respiratory', 'distribute air', 50],
      ['larynx', 'respiratory', 'voice production', 25],
      ['stomach', 'digestive', 'digest food', 150],
      ['liver', 'digestive', 'metabolize and detoxify', 1500],
      ['intestines (small)', 'digestive', 'absorb nutrients', 1000],
      ['intestines (large)', 'digestive', 'absorb water, form stool', 1500],
      ['pancreas', 'digestive', 'enzymes and hormones', 100],
      ['gallbladder', 'digestive', 'store bile', 50],
      ['brain', 'nervous', 'control center', 1400],
      ['spinal cord', 'nervous', 'relay signals', 35],
      ['pituitary', 'endocrine', 'master gland', 0.5],
      ['thyroid', 'endocrine', 'metabolism regulation', 30],
      ['parathyroid', 'endocrine', 'calcium regulation', 0.1],
      ['adrenal', 'endocrine', 'stress response', 14],
      ['thymus', 'immune', 'T cell maturation', 25],
      ['spleen', 'immune', 'blood filtering', 150],
      ['lymph nodes', 'immune', 'immune surveillance', 0],
      ['kidneys', 'excretory', 'filter blood', 300],
      ['bladder', 'excretory', 'store urine', 50],
      ['skin', 'integumentary', 'barrier and sensation', 4000],
      ['ovaries', 'reproductive', 'produce eggs', 7],
      ['testes', 'reproductive', 'produce sperm', 25],
    ];
    for (const [name, system, fn, weight] of organs) {
      this._organs.push({ name, system, function: fn, weightGrams: weight });
    }
  }

  /** Circulatory system organs. */
  circulatorySystem(): Organ[] {
    this._history.push({ method: 'circulatorySystem', target: 'all', timestamp: Date.now() });
    return this._organs.filter(o => o.system === 'circulatory');
  }

  /** Respiratory system organs. */
  respiratorySystem(): Organ[] {
    this._history.push({ method: 'respiratorySystem', target: 'all', timestamp: Date.now() });
    return this._organs.filter(o => o.system === 'respiratory');
  }

  /** Digestive system organs. */
  digestiveSystem(): Organ[] {
    this._history.push({ method: 'digestiveSystem', target: 'all', timestamp: Date.now() });
    return this._organs.filter(o => o.system === 'digestive');
  }

  /** Nervous system organs. */
  nervousSystem(): Organ[] {
    this._history.push({ method: 'nervousSystem', target: 'all', timestamp: Date.now() });
    return this._organs.filter(o => o.system === 'nervous');
  }

  /** Endocrine system organs. */
  endocrineSystem(): Organ[] {
    this._history.push({ method: 'endocrineSystem', target: 'all', timestamp: Date.now() });
    return this._organs.filter(o => o.system === 'endocrine');
  }

  /** Immune system organs. */
  immuneSystem(): Organ[] {
    this._history.push({ method: 'immuneSystem', target: 'all', timestamp: Date.now() });
    return this._organs.filter(o => o.system === 'immune');
  }

  /** Excretory system organs. */
  excretorySystem(): Organ[] {
    this._history.push({ method: 'excretorySystem', target: 'all', timestamp: Date.now() });
    return this._organs.filter(o => o.system === 'excretory');
  }

  /** Integumentary system organs. */
  integumentarySystem(): Organ[] {
    this._history.push({ method: 'integumentarySystem', target: 'all', timestamp: Date.now() });
    return this._organs.filter(o => o.system === 'integumentary');
  }

  /** Reproductive system organs. */
  reproductiveSystem(): Organ[] {
    this._history.push({ method: 'reproductiveSystem', target: 'all', timestamp: Date.now() });
    return this._organs.filter(o => o.system === 'reproductive');
  }

  /** Skeletal system summary. */
  skeletalSystem(): Skeleton {
    this._history.push({ method: 'skeletalSystem', target: 'all', timestamp: Date.now() });
    return { ...this._skeleton };
  }

  /** Muscular system summary. */
  muscularSystem(): { types: string[]; count: number; totalMassPercent: number } {
    this._history.push({ method: 'muscularSystem', target: 'all', timestamp: Date.now() });
    return { types: ['skeletal', 'smooth', 'cardiac'], count: 600, totalMassPercent: 40 };
  }

  /** Reproductive system summary. */
  reproductiveSystemSummary(): { male: string[]; female: string[] } {
    this._history.push({ method: 'reproductiveSystem', target: 'summary', timestamp: Date.now() });
    return {
      male: ['testes', 'epididymis', 'vas deferens', 'seminal vesicles', 'prostate', 'urethra', 'penis'],
      female: ['ovaries', 'fallopian tubes', 'uterus', 'cervix', 'vagina', 'vulva', 'mammary glands'],
    };
  }

  /** Look up the function of an organ. */
  organFunction(organ: string): string {
    const o = this._organs.find(x => x.name === organ);
    this._history.push({ method: 'organFunction', target: organ, timestamp: Date.now() });
    return o?.function ?? 'unknown';
  }

  /** Get organ weight in grams (if available). */
  organWeight(organ: string): number {
    const o = this._organs.find(x => x.name === organ);
    this._history.push({ method: 'organWeight', target: organ, timestamp: Date.now() });
    return o?.weightGrams ?? 0;
  }

  /** List all bone names (abbreviated). */
  boneList(): string[] {
    this._history.push({ method: 'boneList', target: 'all', timestamp: Date.now() });
    return BONE_CATALOG.map(b => b.name);
  }

  /** Get full bone catalog with classifications. */
  boneCatalog(): Bone[] {
    this._history.push({ method: 'boneCatalog', target: 'all', timestamp: Date.now() });
    return [...BONE_CATALOG];
  }

  /** Bones by classification (long, short, flat, irregular, sesamoid). */
  bonesByClassification(classification: Bone['classification']): Bone[] {
    this._history.push({ method: 'bonesByClassification', target: classification, timestamp: Date.now() });
    return BONE_CATALOG.filter(b => b.classification === classification);
  }

  /** Axial skeleton components. */
  axialSkeleton(): { skull: number; vertebrae: number; ribsSternum: number; hyoid: number; total: number } {
    this._history.push({ method: 'axialSkeleton', target: 'all', timestamp: Date.now() });
    return { skull: 22, vertebrae: 33, ribsSternum: 25, hyoid: 1, total: 80 };
  }

  /** Appendicular skeleton components. */
  appendicularSkeleton(): { pectoralGirdle: number; upperLimbs: number; pelvicGirdle: number; lowerLimbs: number; total: number } {
    this._history.push({ method: 'appendicularSkeleton', target: 'all', timestamp: Date.now() });
    return { pectoralGirdle: 4, upperLimbs: 60, pelvicGirdle: 2, lowerLimbs: 60, total: 126 };
  }

  /** List major muscles. */
  muscleList(): string[] {
    this._history.push({ method: 'muscleList', target: 'all', timestamp: Date.now() });
    return ['biceps brachii', 'triceps brachii', 'deltoid', 'pectoralis major',
      'rectus abdominis', 'external oblique', 'quadriceps (rectus femoris, vasti)',
      'hamstrings (biceps femoris, semitendinosus, semimembranosus)',
      'gastrocnemius', 'soleus', 'gluteus maximus', 'gluteus medius', 'latissimus dorsi',
      'trapezius', 'sternocleidomastoid', 'masseter', 'temporalis', 'diaphragm',
      'external intercostals', 'internal intercostals', 'tibialis anterior',
      'sartorius', 'gracilis', 'adductor longus', 'infraspinatus', 'supraspinatus'];
  }

  /** List major nerves. */
  nerveList(): string[] {
    this._history.push({ method: 'nerveList', target: 'all', timestamp: Date.now() });
    return ['olfactory', 'optic', 'oculomotor', 'trochlear', 'trigeminal', 'abducens',
      'facial', 'vestibulocochlear', 'glossopharyngeal', 'vagus', 'accessory', 'hypoglossal',
      'sciatic', 'femoral', 'obturator', 'phrenic', 'median', 'ulnar', 'radial',
      'axillary', 'musculocutaneous', 'tibial', 'common peroneal'];
  }

  /** Body cavities. */
  bodyCavities(): Array<{ name: string; membranes: string; contents: string }> {
    this._history.push({ method: 'bodyCavities', target: 'all', timestamp: Date.now() });
    return [
      { name: 'Cranial', membranes: 'meninges', contents: 'brain' },
      { name: 'Spinal', membranes: 'meninges', contents: 'spinal cord' },
      { name: 'Thoracic', membranes: 'pleura', contents: 'lungs, heart (mediastinum)' },
      { name: 'Abdominal', membranes: 'peritoneum', contents: 'digestive organs, kidneys' },
      { name: 'Pelvic', membranes: 'peritoneum (partial)', contents: 'bladder, reproductive organs' },
      { name: 'Abdominopelvic', membranes: 'peritoneum', contents: 'combined abdominal + pelvic' },
      { name: 'Dorsal', membranes: 'mixed', contents: 'cranial + spinal (continuous)' },
      { name: 'Ventral', membranes: 'mixed', contents: 'thoracic + abdominopelvic' },
    ];
  }

  /** Body planes. */
  bodyPlanes(): Array<{ name: string; orientation: string; example: string }> {
    this._history.push({ method: 'bodyPlanes', target: 'all', timestamp: Date.now() });
    return [
      { name: 'sagittal', orientation: 'divides left/right', example: 'midline cut' },
      { name: 'parasagittal', orientation: 'parallel to midline', example: 'off-center sagittal cut' },
      { name: 'midsagittal', orientation: 'midline sagittal', example: 'perfect left/right split' },
      { name: 'coronal (frontal)', orientation: 'divides front/back', example: 'anterior/posterior' },
      { name: 'transverse (axial)', orientation: 'divides superior/inferior', example: 'cross-section' },
      { name: 'oblique', orientation: 'angled cut', example: 'diagonal section' },
    ];
  }

  /** Directional terms. */
  directionalTerms(): Array<{ term: string; meaning: string; opposite: string }> {
    this._history.push({ method: 'directionalTerms', target: 'all', timestamp: Date.now() });
    return [
      { term: 'superior (cranial)', meaning: 'toward head', opposite: 'inferior' },
      { term: 'inferior (caudal)', meaning: 'toward feet', opposite: 'superior' },
      { term: 'anterior (ventral)', meaning: 'front', opposite: 'posterior' },
      { term: 'posterior (dorsal)', meaning: 'back', opposite: 'anterior' },
      { term: 'medial', meaning: 'toward midline', opposite: 'lateral' },
      { term: 'lateral', meaning: 'away from midline', opposite: 'medial' },
      { term: 'proximal', meaning: 'closer to origin (limb)', opposite: 'distal' },
      { term: 'distal', meaning: 'farther from origin (limb)', opposite: 'proximal' },
      { term: 'superficial', meaning: 'toward body surface', opposite: 'deep' },
      { term: 'deep', meaning: 'away from body surface', opposite: 'superficial' },
      { term: 'ipsilateral', meaning: 'same side', opposite: 'contralateral' },
      { term: 'contralateral', meaning: 'opposite side', opposite: 'ipsilateral' },
    ];
  }

  /** Body quadrants (abdominal). */
  abdominalQuadrants(): Array<{ name: string; contents: string }> {
    this._history.push({ method: 'abdominalQuadrants', target: 'all', timestamp: Date.now() });
    return [
      { name: 'Right Upper Quadrant (RUQ)', contents: 'liver, gallbladder, hepatic flexure' },
      { name: 'Left Upper Quadrant (LUQ)', contents: 'stomach, spleen, splenic flexure' },
      { name: 'Right Lower Quadrant (RLQ)', contents: 'cecum, appendix, right ovary' },
      { name: 'Left Lower Quadrant (LLQ)', contents: 'sigmoid colon, left ovary' },
    ];
  }

  /** Body regions (9 abdominal regions). */
  abdominalRegions(): string[] {
    this._history.push({ method: 'abdominalRegions', target: 'all', timestamp: Date.now() });
    return [
      'right hypochondriac', 'epigastric', 'left hypochondriac',
      'right lumbar', 'umbilical', 'left lumbar',
      'right iliac (inguinal)', 'hypogastric (pubic)', 'left iliac (inguinal)',
    ];
  }

  /** Cranial nerves (12 pairs). */
  cranialNerves(): CranialNerve[] {
    this._history.push({ method: 'cranialNerves', target: 'all', timestamp: Date.now() });
    return [...CRANIAL_NERVES];
  }

  /** Get specific cranial nerve by number. */
  cranialNerveByNumber(n: number): CranialNerve | undefined {
    this._history.push({ method: 'cranialNerveByNumber', target: `CN ${n}`, timestamp: Date.now() });
    return CRANIAL_NERVES.find(c => c.number === n);
  }

  /** Spinal nerves by region. */
  spinalNerves(): Array<{ region: string; pairs: number; levels: string }> {
    this._history.push({ method: 'spinalNerves', target: 'all', timestamp: Date.now() });
    return [...SPINAL_NERVES];
  }

  /** Total spinal nerve count (31 pairs). */
  totalSpinalNervePairs(): number {
    return SPINAL_NERVES.reduce((sum, r) => sum + r.pairs, 0);
  }

  /** Major joints. */
  jointList(): Joint[] {
    this._history.push({ method: 'jointList', target: 'all', timestamp: Date.now() });
    return [...JOINTS];
  }

  /** Joints by type (fibrous, cartilaginous, synovial). */
  jointsByType(type: Joint['type']): Joint[] {
    this._history.push({ method: 'jointsByType', target: type, timestamp: Date.now() });
    return JOINTS.filter(j => j.type === type);
  }

  /** All tissue types. */
  tissueList(): Tissue[] {
    this._history.push({ method: 'tissueList', target: 'all', timestamp: Date.now() });
    return [...TISSUES];
  }

  /** Tissues by primary type. */
  tissuesByType(type: Tissue['type']): Tissue[] {
    this._history.push({ method: 'tissuesByType', target: type, timestamp: Date.now() });
    return TISSUES.filter(t => t.type === type);
  }

  /** Skin layers (epidermis, dermis, hypodermis). */
  skinLayers(): SkinLayer[] {
    this._history.push({ method: 'skinLayers', target: 'all', timestamp: Date.now() });
    return [...SKIN_LAYERS];
  }

  /** Total skin thickness (mm). */
  skinThickness(): number {
    return SKIN_LAYERS.reduce((sum, l) => sum + l.depthMm, 0);
  }

  /** Blood components. */
  bloodComponents(): BloodComponent[] {
    this._history.push({ method: 'bloodComponents', target: 'all', timestamp: Date.now() });
    return [...BLOOD_COMPONENTS];
  }

  /** Heart chambers. */
  heartChambers(): HeartChamber[] {
    this._history.push({ method: 'heartChambers', target: 'all', timestamp: Date.now() });
    return [...HEART_CHAMBERS];
  }

  /** Endocrine glands. */
  endocrineGlands(): EndocrineGland[] {
    this._history.push({ method: 'endocrineGlands', target: 'all', timestamp: Date.now() });
    return [...ENDOCRINE_GLANDS];
  }

  /** Body regions and contents. */
  bodyRegions(): BodyRegion[] {
    this._history.push({ method: 'bodyRegions', target: 'all', timestamp: Date.now() });
    return [...BODY_REGIONS];
  }

  /** Body mass index: BMI = weight(kg) / height(m)^2. */
  bmi(weightKg: number, heightM: number): { value: number; category: string } {
    if (heightM <= 0) return { value: 0, category: 'invalid' };
    const value = weightKg / (heightM * heightM);
    let category = 'normal';
    if (value < 18.5) category = 'underweight';
    else if (value >= 25 && value < 30) category = 'overweight';
    else if (value >= 30 && value < 35) category = 'obese I';
    else if (value >= 35 && value < 40) category = 'obese II';
    else if (value >= 40) category = 'obese III';
    this._history.push({ method: 'bmi', target: `${value.toFixed(1)}`, timestamp: Date.now() });
    return { value: Math.round(value * 10) / 10, category };
  }

  /** Body surface area (Du Bois formula): BSA = 0.007184 * W^0.425 * H^0.725. */
  bodySurfaceArea(weightKg: number, heightCm: number): number {
    if (weightKg <= 0 || heightCm <= 0) return 0;
    return 0.007184 * Math.pow(weightKg, 0.425) * Math.pow(heightCm, 0.725);
  }

  /** Body surface area by Mosteller formula: BSA = sqrt(W*H/3600). */
  bodySurfaceAreaMosteller(weightKg: number, heightCm: number): number {
    if (weightKg <= 0 || heightCm <= 0) return 0;
    return Math.sqrt(weightKg * heightCm / 3600);
  }

  /** Body surface area (Haycock formula, used in pediatrics). */
  bodySurfaceAreaHaycock(weightKg: number, heightCm: number): number {
    if (weightKg <= 0 || heightCm <= 0) return 0;
    return 0.024265 * Math.pow(weightKg, 0.5378) * Math.pow(heightCm, 0.3964);
  }

  /** Rule of nines for burn assessment (adult). */
  ruleOfNines(): Array<{ region: string; percent: number }> {
    this._history.push({ method: 'ruleOfNines', target: 'all', timestamp: Date.now() });
    return [
      { region: 'Head and neck', percent: 9 },
      { region: 'Each arm', percent: 9 },
      { region: 'Each leg', percent: 18 },
      { region: 'Anterior trunk', percent: 18 },
      { region: 'Posterior trunk', percent: 18 },
      { region: 'Perineum', percent: 1 },
    ];
  }

  /** Lund-Browder chart (pediatric burn estimates, more precise). */
  lundBrowder(ageYears: number): Array<{ region: string; percent: number }> {
    // Head proportion varies with age; legs compensate
    const headPct = ageYears < 1 ? 19 : Math.max(7, 19 - (ageYears - 1));
    const legPct = 14 - (headPct - 7) / 2;
    this._history.push({ method: 'lundBrowder', target: `age=${ageYears}`, timestamp: Date.now() });
    return [
      { region: 'Head', percent: headPct },
      { region: 'Each arm', percent: 9 },
      { region: 'Each leg', percent: legPct },
      { region: 'Anterior trunk', percent: 18 },
      { region: 'Posterior trunk', percent: 18 },
    ];
  }

  /** Cardiac output: CO = HR × SV. */
  cardiacOutput(heartRateBpm: number, strokeVolumeMl: number): number {
    // Returns L/min
    return (heartRateBpm * strokeVolumeMl) / 1000;
  }

  /** Mean arterial pressure: MAP ≈ DBP + 1/3(SBP - DBP). */
  meanArterialPressure(systolic: number, diastolic: number): number {
    return diastolic + (systolic - diastolic) / 3;
  }

  /** Pulse pressure: PP = SBP - DBP. */
  pulsePressure(systolic: number, diastolic: number): number {
    return systolic - diastolic;
  }

  /** Stroke volume via echocardiography: SV = EDV - ESV. */
  strokeVolume(edv: number, esv: number): number {
    return Math.max(0, edv - esv);
  }

  /** Ejection fraction: EF = SV/EDV × 100. */
  ejectionFraction(edv: number, esv: number): number {
    if (edv === 0) return 0;
    return (edv - esv) / edv * 100;
  }

  /** Systemic vascular resistance: SVR = (MAP - CVP) × 80 / CO. */
  systemicVascularResistance(map: number, cvp: number, cardiacOutputLpm: number): number {
    if (cardiacOutputLpm === 0) return 0;
    return (map - cvp) * 80 / cardiacOutputLpm;
  }

  /** Total lung capacity: TLC = TV + IRV + ERV + RV. */
  totalLungCapacity(volumes: LungVolumes): number {
    return volumes.tidalVolume + volumes.inspiratoryReserve + volumes.expiratoryReserve + volumes.residualVolume;
  }

  /** Vital capacity: VC = IRV + TV + ERV. */
  vitalCapacity(volumes: LungVolumes): number {
    return volumes.tidalVolume + volumes.inspiratoryReserve + volumes.expiratoryReserve;
  }

  /** Inspiratory capacity: IC = TV + IRV. */
  inspiratoryCapacity(volumes: LungVolumes): number {
    return volumes.tidalVolume + volumes.inspiratoryReserve;
  }

  /** Functional residual capacity: FRC = ERV + RV. */
  functionalResidualCapacity(volumes: LungVolumes): number {
    return volumes.expiratoryReserve + volumes.residualVolume;
  }

  /** Alveolar ventilation: VA = (TV - dead space) × RR. */
  alveolarVentilation(tidalVolumeMl: number, deadSpaceMl: number, respRate: number): number {
    return Math.max(0, (tidalVolumeMl - deadSpaceMl) * respRate);
  }

  /** Alveolar gas equation: PAO2 = FiO2 × (Patm - PH2O) - PaCO2 / RQ. */
  alveolarOxygen(fiO2: number, patmMmhg: number = 760, paCO2: number = 40, rq: number = 0.8): number {
    const ph2o = 47; // water vapor pressure at body temperature
    return fiO2 * (patmMmhg - ph2o) - paCO2 / rq;
  }

  /** Renal clearance: C = (U × V) / P, where U = urine conc, V = urine flow, P = plasma conc. */
  renalClearance(urineConc: number, urineFlow: number, plasmaConc: number): number {
    if (plasmaConc === 0) return 0;
    return (urineConc * urineFlow) / plasmaConc;
  }

  /** Glomerular filtration rate (Cockcroft-Gault, mL/min). */
  cockcroftGault(ageYears: number, weightKg: number, serumCreatinine: number, isFemale: boolean): number {
    const base = (140 - ageYears) * weightKg / (72 * serumCreatinine);
    return isFemale ? base * 0.85 : base;
  }

  /** Estimated GFR (MDRD formula). */
  mdrdGfr(ageYears: number, serumCreatinine: number, isFemale: boolean, isBlack: boolean = false): number {
    let gfr = 175 * Math.pow(serumCreatinine, -1.154) * Math.pow(ageYears, -0.203);
    if (isFemale) gfr *= 0.742;
    if (isBlack) gfr *= 1.212;
    return gfr;
  }

  /** Body composition percentages (Krebs-style default values). */
  bodyComposition(fatPercent: number, bodyWeightKg: number): BodyComposition {
    const musclePercent = 40;
    const bonePercent = 15;
    const waterPercent = 60;
    const otherPercent = Math.max(0, 100 - fatPercent - musclePercent - bonePercent);
    void bodyWeightKg;
    return { fatPercent, musclePercent, bonePercent, waterPercent, otherPercent };
  }

  /** Lean body mass (Boer formula). */
  leanBodyMassBoer(weightKg: number, heightCm: number, isFemale: boolean): number {
    if (isFemale) {
      return 0.244 * weightKg + 0.107 * heightCm - 0.182;
    }
    return 0.407 * weightKg + 0.267 * heightCm - 19.2;
  }

  /** Ideal body weight (Devine formula). */
  idealBodyWeightDevine(heightCm: number, isFemale: boolean): number {
    const inchesOver5ft = Math.max(0, heightCm / 2.54 - 60);
    const base = isFemale ? 45.5 : 50.0;
    return base + 2.3 * inchesOver5ft;
  }

  /** Ideal body weight (Robinson formula). */
  idealBodyWeightRobinson(heightCm: number, isFemale: boolean): number {
    const inchesOver5ft = Math.max(0, heightCm / 2.54 - 60);
    const base = isFemale ? 49.0 : 52.0;
    const increment = isFemale ? 1.7 : 1.9;
    return base + increment * inchesOver5ft;
  }

  /** Adjusted body weight for obese patients. */
  adjustedBodyWeight(actualWeightKg: number, idealWeightKg: number): number {
    return idealWeightKg + 0.4 * (actualWeightKg - idealWeightKg);
  }

  /** Resting energy expenditure (Harris-Benedict, original). */
  harrisBenedict(weightKg: number, heightCm: number, ageYears: number, isFemale: boolean): number {
    if (isFemale) {
      return 655.0955 + 9.5634 * weightKg + 1.8496 * heightCm - 4.6756 * ageYears;
    }
    return 66.4730 + 13.7516 * weightKg + 5.0033 * heightCm - 6.7550 * ageYears;
  }

  /** Resting energy expenditure (Mifflin-St Jeor). */
  mifflinStJeor(weightKg: number, heightCm: number, ageYears: number, isFemale: boolean): number {
    const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
    return isFemale ? base - 161 : base + 5;
  }

  /** Pulse oximetry estimation from PaO2 (rough Severinghaus transform). */
  pulseOxFromPaO2(paO2Mmhg: number): number {
    // Hill equation approximation: SaO2 = (PaO2^3) / (PaO2^3 + 23400) × 100 + offset
    const p3 = Math.pow(paO2Mmhg, 3);
    return Math.min(100, (p3 / (p3 + 23400)) * 100);
  }

  /** Add a custom organ. */
  addOrgan(organ: Organ): void {
    this._organs.push(organ);
    this._history.push({ method: 'addOrgan', target: organ.name, timestamp: Date.now() });
  }

  /** Add a custom muscle. */
  addMuscle(muscle: Muscle): void {
    this._muscles.push(muscle);
    this._history.push({ method: 'addMuscle', target: muscle.origin, timestamp: Date.now() });
  }

  /** Add a custom nerve. */
  addNerve(nerve: Nerve): void {
    this._nerves.push(nerve);
    this._history.push({ method: 'addNerve', target: nerve.name, timestamp: Date.now() });
  }

  /** Count all organs. */
  organCountBySystem(): Record<string, number> {
    const result: Record<string, number> = {};
    for (const o of this._organs) {
      result[o.system] = (result[o.system] ?? 0) + 1;
    }
    this._history.push({ method: 'organCountBySystem', target: 'all', timestamp: Date.now() });
    return result;
  }

  /** Total weight of all organs (grams). */
  totalOrganWeight(): number {
    return this._organs.reduce((sum, o) => sum + (o.weightGrams ?? 0), 0);
  }

  /** Anatomical position summary. */
  anatomicalPosition(): { standing: string; palms: string; feet: string } {
    return {
      standing: 'upright, facing observer',
      palms: 'facing forward (anterior)',
      feet: 'parallel, flat on floor',
    };
  }

  /** Four primary tissue types. */
  primaryTissueTypes(): Array<{ type: string; function: string; example: string }> {
    return [
      { type: 'epithelial', function: 'covering, lining, secretion', example: 'skin epidermis' },
      { type: 'connective', function: 'support, transport, storage', example: 'bone, blood, fat' },
      { type: 'muscle', function: 'movement', example: 'skeletal, cardiac, smooth' },
      { type: 'nervous', function: 'signal transmission', example: 'brain, nerves' },
    ];
  }

  /** Cell types of the human body (approximate counts). */
  cellTypeCounts(): Array<{ cell: string; count: number; function: string }> {
    return [
      { cell: 'Red blood cells', count: 25e12, function: 'oxygen transport' },
      { cell: 'Platelets', count: 1.5e12, function: 'hemostasis' },
      { cell: 'White blood cells', count: 35e9, function: 'immunity' },
      { cell: 'Neurons (brain)', count: 86e9, function: 'signal transmission' },
      { cell: 'Glial cells (brain)', count: 85e9, function: 'support, myelin' },
      { cell: 'Hepatocytes (liver)', count: 240e9, function: 'metabolism' },
      { cell: 'Skeletal muscle fibers', count: 250e9, function: 'movement' },
      { cell: 'Endothelial cells', count: 6e12, function: 'blood vessel lining' },
      { cell: 'Epidermal cells (skin)', count: 2e9, function: 'barrier' },
      { cell: 'Adipocytes', count: 30e9, function: 'fat storage' },
    ];
  }

  /** Total number of cells in human body (recent estimate ~37 trillion). */
  totalCellCount(): number {
    return 37e12;
  }

  /** Cell division rate per day (approximately). */
  cellDivisionRate(): Array<{ tissue: string; cellsPerDay: number }> {
    return [
      { tissue: 'Intestinal epithelium', cellsPerDay: 7e9 },
      { tissue: 'Bone marrow', cellsPerDay: 4e11 },
      { tissue: 'Skin', cellsPerDay: 5e8 },
      { tissue: 'Hair follicles', cellsPerDay: 1e7 },
    ];
  }

  /** Skeletal muscle fiber types. */
  muscleFiberTypes(): Array<{ type: string; color: string; fatigue: string; example: string }> {
    return [
      { type: 'Type I (slow oxidative)', color: 'red', fatigue: 'slow', example: 'posture muscles (soleus)' },
      { type: 'Type IIa (fast oxidative-glycolytic)', color: 'red/pink', fatigue: 'intermediate', example: 'leg muscles (vasti)' },
      { type: 'Type IIx (fast glycolytic)', color: 'white', fatigue: 'fast', example: 'eye muscles, sprint' },
    ];
  }

  /** Heart valves. */
  heartValves(): Array<{ name: string; location: string; cusps: number }> {
    return [
      { name: 'Tricuspid', location: 'between RA and RV', cusps: 3 },
      { name: 'Pulmonary (pulmonic)', location: 'between RV and pulmonary artery', cusps: 3 },
      { name: 'Bicuspid (mitral)', location: 'between LA and LV', cusps: 2 },
      { name: 'Aortic', location: 'between LV and aorta', cusps: 3 },
    ];
  }

  /** Coronary arteries. */
  coronaryArteries(): Array<{ name: string; supplies: string }> {
    return [
      { name: 'Left main', supplies: 'branches into LAD and LCx' },
      { name: 'LAD (Left Anterior Descending)', supplies: 'anterior LV, interventricular septum' },
      { name: 'LCx (Left Circumflex)', supplies: 'lateral and posterior LV' },
      { name: 'RCA (Right Coronary)', supplies: 'RA, RV, inferior LV (in most people)' },
      { name: 'Posterior Descending', supplies: 'inferior LV (from RCA in right-dominant)' },
    ];
  }

  /** Major vessels. */
  majorVessels(): Array<{ name: string; type: 'artery' | 'vein'; carries: string }> {
    return [
      { name: 'Aorta', type: 'artery', carries: 'oxygenated blood from LV to body' },
      { name: 'Pulmonary artery', type: 'artery', carries: 'deoxygenated blood from RV to lungs' },
      { name: 'Pulmonary veins', type: 'vein', carries: 'oxygenated blood from lungs to LA' },
      { name: 'Superior vena cava', type: 'vein', carries: 'deoxygenated blood from upper body to RA' },
      { name: 'Inferior vena cava', type: 'vein', carries: 'deoxygenated blood from lower body to RA' },
      { name: 'Carotid arteries', type: 'artery', carries: 'oxygenated blood to head/neck' },
      { name: 'Jugular veins', type: 'vein', carries: 'deoxygenated blood from head/neck' },
      { name: 'Subclavian', type: 'artery', carries: 'to upper limbs' },
      { name: 'Femoral', type: 'artery', carries: 'to lower limbs' },
      { name: 'Renal arteries/veins', type: 'artery', carries: 'kidney blood supply' },
      { name: 'Hepatic portal', type: 'vein', carries: 'nutrient-rich blood to liver' },
    ];
  }

  /** GI tract segments with average lengths. */
  giTract(): Array<{ segment: string; lengthCm: number; function: string }> {
    return [
      { segment: 'Mouth (oral cavity)', lengthCm: 15, function: 'mechanical digestion' },
      { segment: 'Esophagus', lengthCm: 25, function: 'transport to stomach' },
      { segment: 'Stomach', lengthCm: 25, function: 'acid and pepsin digestion' },
      { segment: 'Small intestine (duodenum)', lengthCm: 25, function: 'neutralize acid, bile/pancreatic enzymes' },
      { segment: 'Small intestine (jejunum)', lengthCm: 250, function: 'main nutrient absorption' },
      { segment: 'Small intestine (ileum)', lengthCm: 200, function: 'B12 and bile salt absorption' },
      { segment: 'Large intestine (cecum)', lengthCm: 6, function: 'begin large intestine' },
      { segment: 'Large intestine (colon)', lengthCm: 150, function: 'water and electrolyte absorption' },
      { segment: 'Rectum', lengthCm: 12, function: 'store feces' },
      { segment: 'Anal canal', lengthCm: 4, function: 'defecation' },
    ];
  }

  /** Total length of GI tract (cm). */
  giTractTotalLength(): number {
    return this.giTract().reduce((sum, s) => sum + s.lengthCm, 0);
  }

  /** Respiratory tract zones. */
  respiratoryTractZones(): Array<{ zone: string; structures: string; function: string }> {
    return [
      { zone: 'Conducting zone', structures: 'nose, pharynx, larynx, trachea, bronchi, bronchioles (>1mm)', function: 'air transport, no gas exchange' },
      { zone: 'Respiratory zone', structures: 'respiratory bronchioles, alveolar ducts, alveoli', function: 'gas exchange' },
    ];
  }

  /** Number of alveoli (typical adult). */
  alveoliCount(): number {
    return 480e6;
  }

  /** Total alveolar surface area (m²). */
  alveolarSurfaceArea(): number {
    return 70;
  }

  /** Urinary system structures. */
  urinarySystem(): string[] {
    this._history.push({ method: 'urinarySystem', target: 'all', timestamp: Date.now() });
    return ['kidneys (×2)', 'ureters (×2)', 'urinary bladder', 'urethra'];
  }

  /** Nephron parts (functional unit of kidney). */
  nephronParts(): Array<{ segment: string; function: string }> {
    return [
      { segment: 'Renal corpuscle (Bowman\'s capsule + glomerulus)', function: 'filtration' },
      { segment: 'Proximal convoluted tubule (PCT)', function: 'bulk reabsorption' },
      { segment: 'Loop of Henle (descending)', function: 'water reabsorption' },
      { segment: 'Loop of Henle (ascending)', function: 'salt reabsorption' },
      { segment: 'Distal convoluted tubule (DCT)', function: 'fine-tuning Na+, Ca2+' },
      { segment: 'Collecting duct', function: 'ADH-regulated water reabsorption' },
    ];
  }

  /** Number of nephrons per kidney. */
  nephronCountPerKidney(): number {
    return 1e6;
  }

  /** Lymphatic system organs and function. */
  lymphaticSystem(): Array<{ component: string; function: string }> {
    return [
      { component: 'Lymph capillaries', function: 'collect interstitial fluid' },
      { component: 'Lymph vessels', function: 'transport lymph' },
      { component: 'Lymph nodes', function: 'filter lymph, immune surveillance' },
      { component: 'Tonsils', function: 'protect pharynx' },
      { component: 'Spleen', function: 'filter blood, immune response' },
      { component: 'Thymus', function: 'T cell maturation' },
      { component: 'Peyer\'s patches', function: 'intestinal immune surveillance' },
      { component: 'Thoracic duct', function: 'drain lymph into left subclavian' },
    ];
  }

  /** Body water compartments. */
  bodyWaterCompartments(): Array<{ compartment: string; percentBodyWeight: number; percentTotalWater: number }> {
    return [
      { compartment: 'Intracellular fluid (ICF)', percentBodyWeight: 40, percentTotalWater: 67 },
      { compartment: 'Extracellular fluid (ECF)', percentBodyWeight: 20, percentTotalWater: 33 },
      { compartment: '- Intravascular (plasma)', percentBodyWeight: 5, percentTotalWater: 8 },
      { compartment: '- Interstitial', percentBodyWeight: 11, percentTotalWater: 18 },
      { compartment: '- Transcellular (CSF, synovial, etc.)', percentBodyWeight: 4, percentTotalWater: 7 },
    ];
  }

  /** Sensory receptors by modality. */
  sensoryReceptors(): Array<{ receptor: string; modality: string; location: string }> {
    return [
      { receptor: 'Mechanoreceptors', modality: 'pressure, touch', location: 'skin' },
      { receptor: 'Meissner corpuscles', modality: 'light touch, vibration', location: 'dermal papillae' },
      { receptor: 'Pacinian corpuscles', modality: 'deep pressure, vibration', location: 'deep dermis' },
      { receptor: 'Merkel discs', modality: 'sustained touch', location: 'basale' },
      { receptor: 'Ruffini endings', modality: 'stretch, sustained pressure', location: 'dermis' },
      { receptor: 'Thermoreceptors', modality: 'temperature', location: 'skin' },
      { receptor: 'Nociceptors', modality: 'pain', location: 'all tissues except brain' },
      { receptor: 'Photoreceptors (rods)', modality: 'low-light vision', location: 'retina' },
      { receptor: 'Photoreceptors (cones)', modality: 'color vision', location: 'retina (fovea)' },
      { receptor: 'Chemoreceptors', modality: 'taste, smell, blood chemistry', location: 'tongue, nose, vessels' },
      { receptor: 'Proprioceptors', modality: 'position, movement', location: 'muscles, tendons, joints' },
      { receptor: 'Muscle spindles', modality: 'muscle stretch', location: 'skeletal muscles' },
      { receptor: 'Golgi tendon organs', modality: 'muscle tension', location: 'tendons' },
    ];
  }

  /** Number of bones at different ages (developmental). */
  boneCountByAge(): Array<{ age: string; boneCount: number; note: string }> {
    return [
      { age: 'Birth', boneCount: 270, note: 'many cartilaginous, unfused' },
      { age: 'Adult', boneCount: 206, note: 'fused, fully ossified' },
      { age: 'Elderly (severe osteoporosis)', boneCount: 206, note: 'count unchanged, density reduced' },
    ];
  }

  /** Bone remodeling cells. */
  boneCells(): Array<{ cell: string; function: string }> {
    return [
      { cell: 'Osteoblasts', function: 'build new bone (deposit matrix)' },
      { cell: 'Osteocytes', function: 'maintain bone tissue, sense strain' },
      { cell: 'Osteoclasts', function: 'resorb bone (breakdown)' },
      { cell: 'Osteoprogenitor cells', function: 'stem cells for bone' },
    ];
  }

  /** Major arteries (systemic). */
  systemicArterialTree(): Array<{ segment: string; diameterMm: number }> {
    return [
      { segment: 'Aorta (ascending)', diameterMm: 30 },
      { segment: 'Aorta (thoracic)', diameterMm: 25 },
      { segment: 'Aorta (abdominal)', diameterMm: 22 },
      { segment: 'Common iliac', diameterMm: 12 },
      { segment: 'Femoral', diameterMm: 8 },
      { segment: 'Carotid (common)', diameterMm: 7 },
      { segment: 'Subclavian', diameterMm: 9 },
      { segment: 'Brachial', diameterMm: 5 },
      { segment: 'Radial', diameterMm: 3 },
    ];
  }

  /** Stomach layers (gastric wall). */
  stomachWallLayers(): string[] {
    return ['mucosa', 'submucosa', 'muscularis externa (oblique, circular, longitudinal)', 'serosa (visceral peritoneum)'];
  }

  /** Gut wall layers (generic GI tract). */
  giWallLayers(): Array<{ layer: string; composition: string }> {
    return [
      { layer: 'Mucosa', composition: 'epithelium, lamina propria, muscularis mucosae' },
      { layer: 'Submucosa', composition: 'connective tissue, vessels, Meissner plexus' },
      { layer: 'Muscularis externa', composition: 'inner circular, outer longitudinal, Auerbach plexus' },
      { layer: 'Serosa/adventitia', composition: 'visceral peritoneum or connective tissue' },
    ];
  }

  /** Brain meninges layers (from superficial to deep). */
  meningesLayers(): Array<{ layer: string; function: string }> {
    return [
      { layer: 'Dura mater', function: 'tough outer, venous sinuses' },
      { layer: 'Arachnoid mater', function: 'web-like middle, subarachnoid space with CSF' },
      { layer: 'Pia mater', function: 'delicate inner, adheres to brain' },
    ];
  }

  /** Eye layers (tunics). */
  eyeTunics(): Array<{ tunic: string; components: string; function: string }> {
    return [
      { tunic: 'Fibrous (outer)', components: 'sclera, cornea', function: 'mechanical support, light entry' },
      { tunic: 'Vascular (uvea)', components: 'choroid, ciliary body, iris', function: 'blood supply, accommodation, light control' },
      { tunic: 'Neural (inner)', components: 'retina', function: 'phototransduction' },
    ];
  }

  /** Eye chambers and fluids. */
  eyeCompartments(): Array<{ chamber: string; fluid: string; volume: number }> {
    return [
      { chamber: 'Anterior chamber', fluid: 'aqueous humor', volume: 0.25 },
      { chamber: 'Posterior chamber', fluid: 'aqueous humor', volume: 0.06 },
      { chamber: 'Vitreous chamber', fluid: 'vitreous humor', volume: 4 },
    ];
  }

  /** Hair cells of the inner ear. */
  innerEarComponents(): Array<{ component: string; function: string }> {
    return [
      { component: 'Cochlea', function: 'hearing (organ of Corti)' },
      { component: 'Vestibule (utricle, saccule)', function: 'linear acceleration' },
      { component: 'Semicircular canals', function: 'rotational acceleration' },
      { component: 'Organ of Corti', function: 'sound transduction' },
      { component: 'Hair cells (inner)', function: 'primary auditory transduction' },
      { component: 'Hair cells (outer)', function: 'cochlear amplifier' },
    ];
  }

  /** Major muscles and their origins/insertions. */
  majorMuscleAttachments(): Array<{ muscle: string; origin: string; insertion: string; action: string }> {
    return [
      { muscle: 'Biceps brachii', origin: 'supraglenoid tubercle, coracoid', insertion: 'radial tuberosity', action: 'flex elbow, supinate forearm' },
      { muscle: 'Triceps brachii', origin: 'infraglenoid, posterior humerus, olecranon', insertion: 'olecranon', action: 'extend elbow' },
      { muscle: 'Deltoid', origin: 'clavicle, acromion, scapular spine', insertion: 'deltoid tuberosity of humerus', action: 'abduct arm' },
      { muscle: 'Pectoralis major', origin: 'clavicle, sternum, ribs', insertion: 'lateral lip of bicipital groove', action: 'adduct, flex arm' },
      { muscle: 'Latissimus dorsi', origin: 'T7-L5 spine, iliac crest', insertion: 'intertubercular groove', action: 'extend, adduct, medially rotate arm' },
      { muscle: 'Quadriceps femoris', origin: 'AIIS, linea aspera, femur', insertion: 'tibial tuberosity via patellar ligament', action: 'extend knee' },
      { muscle: 'Hamstrings', origin: 'ischial tuberosity, femur', insertion: 'tibia/fibula', action: 'flex knee, extend hip' },
      { muscle: 'Gastrocnemius', origin: 'femoral condyles', insertion: 'calcaneus via Achilles tendon', action: 'plantarflex foot' },
      { muscle: 'Gluteus maximus', origin: 'ilium, sacrum, coccyx', insertion: 'gluteal tuberosity, IT tract', action: 'extend, abduct, laterally rotate hip' },
      { muscle: 'Diaphragm', origin: 'xiphoid, ribs, lumbar vertebrae', insertion: 'central tendon', action: 'inspiration (contract → flatten)' },
    ];
  }

  /** Burn assessment calculator (estimates severity). */
  burnAssessment(tbsaPercent: number, ageYears: number, hasInhalationInjury: boolean): {
    severity: 'minor' | 'moderate' | 'major' | 'critical';
    fluidResuscitationLitersFirst24h: number;
  } {
    let severity: 'minor' | 'moderate' | 'major' | 'critical' = 'minor';
    if (tbsaPercent >= 10 && tbsaPercent < 20) severity = 'moderate';
    else if (tbsaPercent >= 20 && tbsaPercent < 40) severity = 'major';
    else if (tbsaPercent >= 40) severity = 'critical';
    if (ageYears > 60 || hasInhalationInjury) {
      // upgrade severity by one level
      if (severity === 'moderate') severity = 'major';
      else if (severity === 'major') severity = 'critical';
    }
    // Parkland formula: 4 mL × kg × %TBSA in first 24h (assume 70kg patient)
    const fluid = (4 * 70 * tbsaPercent) / 1000;
    return { severity, fluidResuscitationLitersFirst24h: Math.round(fluid * 10) / 10 };
  }

  /** Growth chart percentile (rough estimation for height). */
  heightPercentile(heightCm: number, ageYears: number, isFemale: boolean): number {
    // Very rough approximation; real growth charts are empirical
    const median = isFemale ? 100 + (ageYears - 5) * 6 : 110 + (ageYears - 5) * 7;
    const sd = 7;
    if (sd === 0) return 50;
    const z = (heightCm - median) / sd;
    // CDF of standard normal (approximation)
    const percentile = 0.5 * (1 + Math.tanh(0.79 * z));
    this._history.push({ method: 'heightPercentile', target: `${heightCm}cm`, timestamp: Date.now() });
    return Math.round(percentile * 100);
  }

  /** Head circumference percentile (infants). */
  headCircumferencePercentile(circumferenceCm: number, ageMonths: number, isFemale: boolean): number {
    // Very rough WHO-like median
    const median = isFemale
      ? 34 + Math.log(ageMonths + 1) * 4
      : 34.5 + Math.log(ageMonths + 1) * 4.2;
    const sd = 1.5;
    const z = (circumferenceCm - median) / sd;
    const percentile = 0.5 * (1 + Math.tanh(0.79 * z));
    return Math.round(percentile * 100);
  }

  /** APGAR scoring (newborn assessment). */
  apgarScore(color: number, heartRate: number, reflex: number, muscleTone: number, respiration: number): number {
    void color; void heartRate; void reflex; void muscleTone; void respiration;
    // Each parameter scored 0-2; parameters passed in already as 0-2 scores
    return Math.max(0, Math.min(10, color + heartRate + reflex + muscleTone + respiration));
  }

  /** Glasgow Coma Scale (GCS) total. */
  glasgowComaScale(eye: number, verbal: number, motor: number): { total: number; category: string } {
    const total = eye + verbal + motor;
    let category = 'minor';
    if (total <= 8) category = 'severe';
    else if (total <= 12) category = 'moderate';
    else if (total <= 15) category = 'minor';
    return { total, category };
  }

  /** Add a custom neuron (alias for downstream compatibility). */
  addCustomOrgan(organ: Organ): void {
    this.addOrgan(organ);
  }

  /** List all systems with their primary organs. */
  allSystems(): Array<{ system: string; primaryOrgans: string[] }> {
    this._history.push({ method: 'allSystems', target: 'all', timestamp: Date.now() });
    const map: Record<string, string[]> = {};
    for (const o of this._organs) {
      if (!map[o.system]) map[o.system] = [];
      map[o.system].push(o.name);
    }
    return Object.entries(map).map(([system, primaryOrgans]) => ({ system, primaryOrgans }));
  }

  /** Filter organs by system. */
  organsBySystem(system: string): Organ[] {
    return this._organs.filter(o => o.system === system);
  }

  /** Get skull bones. */
  skullBones(): Array<{ type: string; count: number; names: string }> {
    return [
      { type: 'Cranial (8)', count: 8, names: 'frontal, parietal (×2), temporal (×2), occipital, sphenoid, ethmoid' },
      { type: 'Facial (14)', count: 14, names: 'maxilla (×2), zygomatic (×2), nasal (×2), lacrimal (×2), palatine (×2), inferior concha (×2), vomer, mandible' },
    ];
  }

  /** Get vertebral column segments. */
  vertebraeSegments(): Array<{ region: string; count: number; curve: string }> {
    return [
      { region: 'Cervical', count: 7, curve: 'lordosis' },
      { region: 'Thoracic', count: 12, curve: 'kyphosis' },
      { region: 'Lumbar', count: 5, curve: 'lordosis' },
      { region: 'Sacral', count: 5, curve: 'kyphosis (fused)' },
      { region: 'Coccygeal', count: 4, curve: 'fused' },
    ];
  }

  /** Get rib pairs classification. */
  ribTypes(): Array<{ type: string; pairs: string; attachment: string }> {
    return [
      { type: 'True ribs', pairs: '1-7', attachment: 'attach directly to sternum' },
      { type: 'False ribs', pairs: '8-10', attachment: 'attach via costal cartilage' },
      { type: 'Floating ribs', pairs: '11-12', attachment: 'no anterior attachment' },
    ];
  }

  /** Get pectoral girdle. */
  pectoralGirdle(): { clavicle: number; scapula: number; function: string } {
    return { clavicle: 2, scapula: 2, function: 'attach upper limbs to axial skeleton' };
  }

  /** Get pelvic girdle. */
  pelvicGirdle(): { hipBones: number; sacrum: number; coccyx: number; function: string } {
    return { hipBones: 2, sacrum: 1, coccyx: 1, function: 'attach lower limbs, support trunk' };
  }

  /** Body surfaces (rule of palm - approximate 1% per palm). */
  palmRule(): { palmPercentOfTBSA: number; description: string } {
    return { palmPercentOfTBSA: 1, description: 'patient\'s palm (incl. fingers) ≈ 1% of TBSA' };
  }

  /** Heart conduction system. */
  heartConduction(): Array<{ structure: string; function: string }> {
    return [
      { structure: 'SA node', function: 'primary pacemaker (~60-100 bpm)' },
      { structure: 'Internodal pathways', function: 'conduct from SA to AV node' },
      { structure: 'AV node', function: 'delay (~0.1s) to allow ventricular filling' },
      { structure: 'Bundle of His', function: 'conduct to ventricles' },
      { structure: 'Left and right bundle branches', function: 'distribute to each ventricle' },
      { structure: 'Purkinje fibers', function: 'rapid ventricular depolarization' },
    ];
  }

  /** Body composition by weight (kg). */
  bodyCompositionByWeight(weightKg: number, fatPercent: number): { fatKg: number; leanKg: number; waterKg: number } {
    const fatKg = weightKg * (fatPercent / 100);
    const leanKg = weightKg - fatKg;
    const waterKg = weightKg * 0.6; // approx 60% water
    return { fatKg, leanKg, waterKg };
  }

  /** Muscle names by anatomical naming convention. */
  muscleNamingConventions(): Array<{ convention: string; example: string }> {
    return [
      { convention: 'Location', example: 'supraspinatus (above spine of scapula)' },
      { convention: 'Origin/Insertion', example: 'sternocleidomastoid (sternum, clavicle → mastoid)' },
      { convention: 'Action', example: 'extensor digitorum (extends fingers)' },
      { convention: 'Shape', example: 'deltoid (triangular), trapezius (trapezoid)' },
      { convention: 'Size', example: 'gluteus maximus (largest), minimus (smallest)' },
      { convention: 'Fiber direction', example: 'rectus (straight), oblique (angled)' },
      { convention: 'Number of heads', example: 'biceps (two), triceps (three), quadriceps (four)' },
    ];
  }

  /** Skeletal system divisions summary. */
  skeletalDivisions(): Array<{ division: string; sub: string; count: number }> {
    return [
      { division: 'Axial', sub: 'skull', count: 22 },
      { division: 'Axial', sub: 'middle ear ossicles', count: 6 },
      { division: 'Axial', sub: 'hyoid', count: 1 },
      { division: 'Axial', sub: 'vertebral column', count: 26 },
      { division: 'Axial', sub: 'thoracic cage', count: 25 },
      { division: 'Appendicular', sub: 'pectoral girdle', count: 4 },
      { division: 'Appendicular', sub: 'upper limb', count: 60 },
      { division: 'Appendicular', sub: 'pelvic girdle', count: 2 },
      { division: 'Appendicular', sub: 'lower limb', count: 60 },
    ];
  }

  /** Tooth types and counts. */
  dentalFormula(): Array<{ type: string; count: number; function: string }> {
    return [
      { type: 'Incisors', count: 8, function: 'cutting' },
      { type: 'Canines', count: 4, function: 'tearing' },
      { type: 'Premolars (bicuspids)', count: 8, function: 'crushing' },
      { type: 'Molars', count: 12, function: 'grinding (includes 4 wisdom)' },
    ];
  }

  /** Stomach regions. */
  stomachRegions(): string[] {
    return ['cardia', 'fundus', 'body (corpus)', 'antrum', 'pylorus'];
  }

  /** Liver segments (Couinaud classification). */
  liverSegments(): number[] {
    return [1, 2, 3, 4, 5, 6, 7, 8];
  }

  /** Pancreas parts. */
  pancreasParts(): string[] {
    return ['head', 'uncinate process', 'neck', 'body', 'tail'];
  }

  /** Major reflexes tested clinically. */
  reflexes(): Array<{ reflex: string; spinalLevel: string; normalResponse: string }> {
    return [
      { reflex: 'Biceps', spinalLevel: 'C5-C6', normalResponse: 'biceps contraction' },
      { reflex: 'Brachioradialis', spinalLevel: 'C5-C6', normalResponse: 'brachioradialis contraction' },
      { reflex: 'Triceps', spinalLevel: 'C7-C8', normalResponse: 'triceps contraction' },
      { reflex: 'Patellar (knee-jerk)', spinalLevel: 'L2-L4', normalResponse: 'quadriceps contraction' },
      { reflex: 'Achilles (ankle-jerk)', spinalLevel: 'S1-S2', normalResponse: 'plantarflexion' },
      { reflex: 'Babinski (pathological in adults)', spinalLevel: 'L4-S2', normalResponse: 'toe flexion (pathological: extension)' },
    ];
  }

  toPacket(): DataPacket<{
    organs: Organ[];
    skeleton: Skeleton;
    muscles: Muscle[];
    nerves: Nerve[];
    history: AnatomyRecord[];
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

  get muscleCount(): number {
    return this._muscles.length;
  }

  get nerveCount(): number {
    return this._nerves.length;
  }

  get historyDepth(): number {
    return this._history.length;
  }
}
