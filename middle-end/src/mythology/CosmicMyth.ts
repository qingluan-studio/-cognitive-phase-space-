import { DataPacket, Signal, KnowledgeUnit } from '../shared/types';

export interface CosmicEpoch {
  id: string;
  name: string;
  era: string;
  description: string;
  orderLevel: number;
  duration: number;
  dominantDeity: string;
  themes: string[];
}

export interface Deity {
  id: string;
  name: string;
  domain: string;
  power: number;
  mythology: string;
  symbols: string[];
  consort: string | null;
}

export interface WorldTree {
  id: string;
  name: string;
  realms: string[];
  roots: string[];
  branches: string[];
  growthLevel: number;
  cosmicAxis: number;
}

interface CosmicHistoryEntry {
  timestamp: number;
  action: string;
  epochName: string;
  chaosDelta: number;
}

const EPOCH_NAMES = [
  'Chaos',
  'Void',
  'Potential',
  'Formation',
  'Manifestation',
  'Order',
  'Complexity',
  'Consciousness',
  'Unity',
  'Dissolution',
];

const DEITY_DOMAINS = [
  'creation', 'destruction', 'wisdom', 'love', 'war', 'death', 'life', 'nature',
  'time', 'space', 'dream', 'memory', 'fire', 'water', 'earth', 'air',
];

const REALMS = [
  'Asgard', 'Midgard', 'Jotunheim', 'Helheim', 'Alfheim',
  'Svartalfheim', 'Vanaheim', 'Niflheim', 'Muspelheim',
];

export class CosmicMyth {
  private _epochs: Map<string, CosmicEpoch> = new Map();
  private _deities: Map<string, Deity> = new Map();
  private _worldTree: WorldTree | null = null;
  private _creationStory: string = '';
  private _chaosLevel: number = 1.0;
  private _history: CosmicHistoryEntry[] = [];
  private _counter = 0;

  constructor() {
    this._initChaos();
  }

  generateCreationMyth(seed?: string): string {
    const firstDeity = this.formDeity('creation');
    const firstEpoch = this.emanateEpoch();
    const tree = this.worldTreeGrow();
    const storyParts = [
      'In the beginning, there was only Chaos.',
      `From the void emerged ${firstDeity.name}, deity of ${firstDeity.domain}.`,
      `${firstDeity.name} spoke the ${firstEpoch.name} into being.`,
      `The ${tree.name} grew, its roots reaching into the depths and branches touching the heights.`,
      'Thus began the great dance of creation.',
    ];
    if (seed) {
      storyParts.push(`The echo of ${seed} resonates through all creation.`);
    }
    this._creationStory = storyParts.join(' ');
    this._chaosLevel = 0.7;
    this._recordHistory('creation', firstEpoch.name, -0.3);
    return this._creationStory;
  }

  formDeity(domain: string): Deity {
    const existing = Array.from(this._deities.values()).find(d => d.domain === domain);
    if (existing) return { ...existing };
    const name = this._generateDeityName(domain);
    const deity: Deity = {
      id: `deity-${(++this._counter).toString(36)}`,
      name,
      domain,
      power: 0.3 + Math.random() * 0.7,
      mythology: `${name} is the deity of ${domain}. Born from the primordial ${domain}`,
      symbols: this._generateSymbols(domain),
      consort: null,
    };
    this._deities.set(deity.id, deity);
    this._chaosLevel = Math.max(0, this._chaosLevel - 0.05);
    this._recordHistory('form-deity', domain, -0.05);
    return { ...deity };
  }

  emanateEpoch(): CosmicEpoch {
    const epochCount = this._epochs.size;
    const eraIndex = Math.min(epochCount, EPOCH_NAMES.length - 1);
    const name = EPOCH_NAMES[eraIndex];
    const epoch: CosmicEpoch = {
      id: `epoch-${(++this._counter).toString(36)}`,
      name,
      era: `era-${epochCount + 1}`,
      description: `The ${name} epoch, where ${name.toLowerCase()} unfolds across the cosmos.`,
      orderLevel: epochCount / EPOCH_NAMES.length,
      duration: 1000 + epochCount * 500,
      dominantDeity: this._dominantDeityForEpoch(name),
      themes: this._epochThemes(name),
    };
    this._epochs.set(epoch.id, epoch);
    this._chaosLevel = Math.max(0, this._chaosLevel - 0.08);
    this._recordHistory('emanate-epoch', name, -0.08);
    return { ...epoch };
  }

  worldTreeGrow(): WorldTree {
    const growth = this._worldTree ? this._worldTree.growthLevel + 0.2 : 0.3;
    const tree: WorldTree = {
      id: `worldtree-${(++this._counter).toString(36)}`,
      name: 'Yggdrasil',
      realms: REALMS.slice(0, Math.min(REALMS.length, Math.floor(growth * REALMS.length) + 3)),
      roots: this._selectRoots(growth),
      branches: this._selectBranches(growth),
      growthLevel: Math.min(1, growth),
      cosmicAxis: Math.random() * Math.PI * 2,
    };
    this._worldTree = tree;
    this._chaosLevel = Math.max(0, this._chaosLevel - 0.03);
    this._recordHistory('world-tree-grow', tree.name, -0.03);
    return { ...tree };
  }

  apocalypse(cause: string = 'cosmic-winter'): { survived: boolean; remnantDeities: Deity[] } {
    this._chaosLevel = Math.min(1, this._chaosLevel + 0.5);
    const allDeities = Array.from(this._deities.values());
    const survivorCount = Math.max(1, Math.floor(allDeities.length * 0.3));
    const shuffled = allDeities.sort(() => Math.random() - 0.5);
    const survivors = shuffled.slice(0, survivorCount);
    this._deities.clear();
    survivors.forEach(d => {
      d.power = Math.max(0.1, d.power * 0.5);
      this._deities.set(d.id, d);
    });
    this._worldTree = null;
    const finalEpoch = this._epochs.size > 0 ? Array.from(this._epochs.values())[this._epochs.size - 1] : null;
    this._recordHistory('apocalypse', cause, 0.5);
    return { survived: survivors.length > 0, remnantDeities: survivors };
  }

  rebirth(): CosmicEpoch {
    this._chaosLevel = Math.max(0.3, this._chaosLevel * 0.5);
    const newEpoch = this.emanateEpoch();
    this._recordHistory('rebirth', newEpoch.name, -0.2);
    return newEpoch;
  }

  getEpoch(era: string): CosmicEpoch | null {
    const epoch = Array.from(this._epochs.values()).find(e => e.era === era || e.name.toLowerCase() === era.toLowerCase());
    return epoch ? { ...epoch } : null;
  }

  chaosToOrderRatio(): { chaos: number; order: number; ratio: number } {
    const order = 1 - this._chaosLevel;
    return {
      chaos: this._chaosLevel,
      order,
      ratio: order > 0 ? this._chaosLevel / order : Infinity,
    };
  }

  toPacket(): DataPacket {
    return {
      id: `cosmic-${(++this._counter).toString(36)}-${Date.now().toString(36)}`,
      payload: {
        epochs: Array.from(this._epochs.values()),
        deities: Array.from(this._deities.values()),
        worldTree: this._worldTree ? { ...this._worldTree } : null,
        creationStory: this._creationStory,
        chaosLevel: this._chaosLevel,
        chaosToOrderRatio: this.chaosToOrderRatio(),
      },
      metadata: {
        createdAt: Date.now(),
        route: ['CosmicMyth'],
        priority: Math.max(1, Math.floor((1 - this._chaosLevel) * 10)),
        phase: this._epochs.size === 0 ? 'unmanifest' : 'cosmic-unfolding',
      },
    };
  }

  reset(): void {
    this._epochs.clear();
    this._deities.clear();
    this._worldTree = null;
    this._creationStory = '';
    this._chaosLevel = 1.0;
    this._history = [];
    this._counter = 0;
    this._initChaos();
  }

  get epochs(): CosmicEpoch[] {
    return Array.from(this._epochs.values());
  }

  get deities(): Deity[] {
    return Array.from(this._deities.values());
  }

  get worldTree(): WorldTree | null {
    return this._worldTree ? { ...this._worldTree } : null;
  }

  get creationStory(): string {
    return this._creationStory;
  }

  get chaosLevel(): number {
    return this._chaosLevel;
  }

  get history(): CosmicHistoryEntry[] {
    return [...this._history];
  }

  private _initChaos(): void {
    this._chaosLevel = 1.0;
  }

  private _generateDeityName(domain: string): string {
    const prefixes = ['Ae', 'Odin', 'Zeus', 'Shiva', 'Amaterasu', 'Quetzal', 'Anu', 'Ra', 'Nu', 'Marduk'];
    const suffixes = ['-ion', '-ath', '-os', '-a', '-ur', '-esh', '-iel', '-an'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    return `${prefix}${suffix.charAt(0).toUpperCase() + domain.slice(1, 3)}${suffix}`;
  }

  private _generateSymbols(domain: string): string[] {
    const symbolMap: Record<string, string[]> = {
      creation: ['egg', 'seed', 'flame', 'breath'],
      destruction: ['fire', 'sword', 'wave', 'storm'],
      wisdom: ['owl', 'book', 'eye', 'tower'],
      love: ['heart', 'rose', 'dove', 'moon'],
      war: ['spear', 'shield', 'helmet', 'eagle'],
      death: ['skull', 'scythe', 'hourglass', 'raven'],
      life: ['tree', 'river', 'sun', 'grain'],
      nature: ['forest', 'animal', 'leaf', 'stone'],
      time: ['clock', 'hourglass', 'sun-dial', 'river'],
      space: ['star', 'void', 'wheel', 'spiral'],
      dream: ['moon', 'butterfly', 'mirror', 'mist'],
      memory: ['scroll', 'crystal', 'well', 'thread'],
      fire: ['flame', 'sun', 'volcano', 'phoenix'],
      water: ['wave', 'ocean', 'whale', 'pearl'],
      earth: ['mountain', 'cave', 'bear', 'granite'],
      air: ['wind', 'eagle', 'cloud', 'feather'],
    };
    return symbolMap[domain] || ['mystery', 'light', 'shadow', 'echo'];
  }

  private _dominantDeityForEpoch(epochName: string): string {
    const deities = Array.from(this._deities.values());
    if (deities.length === 0) return 'unknown';
    const sorted = deities.sort((a, b) => b.power - a.power);
    return sorted[0].name;
  }

  private _epochThemes(epochName: string): string[] {
    const themeMap: Record<string, string[]> = {
      'Chaos': ['potential', 'void', 'unformed'],
      'Void': ['emptiness', 'silence', 'depth'],
      'Potential': ['possibility', 'seed', 'dream'],
      'Formation': ['shape', 'structure', 'pattern'],
      'Manifestation': ['birth', 'light', 'form'],
      'Order': ['structure', 'law', 'harmony'],
      'Complexity': ['diversity', 'growth', 'evolution'],
      'Consciousness': ['awareness', 'mind', 'reflection'],
      'Unity': ['oneness', 'love', 'transcendence'],
      'Dissolution': ['release', 'transformation', 'return'],
    };
    return themeMap[epochName] || ['mystery', 'transition', 'becoming'];
  }

  private _selectRoots(growth: number): string[] {
    const allRoots = ['Well of Urd', 'Well of Mimir', 'Well of Hvergelmir', 'Root of Death', 'Root of Memory'];
    return allRoots.slice(0, Math.min(allRoots.length, Math.floor(growth * 3) + 1));
  }

  private _selectBranches(growth: number): string[] {
    const allBranches = ['Branch of Life', 'Branch of Wisdom', 'Branch of Fate', 'Branch of Memory', 'Branch of Dream'];
    return allBranches.slice(0, Math.min(allBranches.length, Math.floor(growth * 3) + 1));
  }

  private _recordHistory(action: string, epochName: string, chaosDelta: number): void {
    this._history.push({
      timestamp: Date.now(),
      action,
      epochName,
      chaosDelta,
    });
    if (this._history.length > 100) {
      this._history = this._history.slice(-100);
    }
  }
}
