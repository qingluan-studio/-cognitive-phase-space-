import { DataPacket, KnowledgeUnit, Signal } from '../shared/types';

export interface Archetype {
  id: string;
  name: string;
  domain: string;
  energy: number;
  shadow: string;
  symbolism: string[];
  activationCount: number;
}

export interface ArchetypalDream {
  id: string;
  timestamp: number;
  dominantArchetype: string;
  symbols: string[];
  narrative: string;
  intensity: number;
  resolution: 'unresolved' | 'integrated' | 'transcendent';
}

export interface HeroStage {
  name: string;
  description: string;
  challenge: string;
  energyRequired: number;
}

interface ArchetypeHistory {
  timestamp: number;
  action: string;
  archetypeId: string;
  energyDelta: number;
}

const COLLECTIVE_UNCONSCIOUS_DEPTH = 12;
const SHADOW_INTEGRATION_THRESHOLD = 0.6;

export class ArchetypeCore {
  private _archetypes: Map<string, Archetype> = new Map();
  private _dreams: ArchetypalDream[] = [];
  private _activeArchetypes: Set<string> = new Set();
  private _history: ArchetypeHistory[] = [];
  private _collectiveUnconscious: KnowledgeUnit[] = [];
  private _counter = 0;

  constructor() {
    this._initDefaultArchetypes();
    this._seedCollectiveUnconscious();
  }

  registerArchetype(name: string, domain: string, shadow: string, symbolism: string[]): Archetype {
    const id = `arch-${name.toLowerCase()}-${(++this._counter).toString(36)}`;
    const archetype: Archetype = {
      id,
      name,
      domain,
      energy: 0.5,
      shadow,
      symbolism: [...symbolism],
      activationCount: 0,
    };
    this._archetypes.set(id, archetype);
    this._recordHistory('register', id, 0);
    return { ...archetype };
  }

  activateArchetype(archetypeId: string, intensity: number = 1): Archetype | null {
    const archetype = this._archetypes.get(archetypeId);
    if (!archetype) return null;
    archetype.energy = Math.min(1, archetype.energy + intensity * 0.2);
    archetype.activationCount++;
    this._activeArchetypes.add(archetypeId);
    this._recordHistory('activate', archetypeId, intensity * 0.2);
    return { ...archetype };
  }

  deactivateArchetype(archetypeId: string): Archetype | null {
    const archetype = this._archetypes.get(archetypeId);
    if (!archetype) return null;
    archetype.energy = Math.max(0, archetype.energy - 0.15);
    this._activeArchetypes.delete(archetypeId);
    this._recordHistory('deactivate', archetypeId, -0.15);
    return { ...archetype };
  }

  dreamGenerate(seed?: string): ArchetypalDream {
    const active = Array.from(this._activeArchetypes)
      .map(id => this._archetypes.get(id)!)
      .filter(Boolean);
    const pool = active.length > 0 ? active : Array.from(this._archetypes.values());
    const dominant = pool.reduce((a, b) => a.energy > b.energy ? a : b);
    const symbols = this._dreamSymbols(dominant, seed);
    const intensity = this._dreamIntensity(pool);
    const dream: ArchetypalDream = {
      id: `dream-${(++this._counter).toString(36)}-${Date.now().toString(36)}`,
      timestamp: Date.now(),
      dominantArchetype: dominant.name,
      symbols,
      narrative: this._weaveDreamNarrative(dominant, symbols, seed),
      intensity,
      resolution: intensity > 0.8 ? 'transcendent' : intensity > 0.5 ? 'integrated' : 'unresolved',
    };
    this._dreams.push(dream);
    this._recordHistory('dream', dominant.id, intensity);
    return dream;
  }

  heroJourney(stages: string[]): HeroStage[] {
    const heroStages: HeroStage[] = stages.map((stage, i) => ({
      name: stage,
      description: this._stageDescription(stage),
      challenge: this._stageChallenge(stage),
      energyRequired: 0.3 + (i / stages.length) * 0.6,
    }));
    heroStages.forEach((_, i) => {
      this._recordHistory('journey', `stage-${i}`, 0.1);
    });
    return heroStages;
  }

  shadowIntegration(archetypeId: string): number {
    const archetype = this._archetypes.get(archetypeId);
    if (!archetype) return 0;
    const shadowEnergy = archetype.energy;
    const integrationScore = Math.min(1, shadowEnergy * SHADOW_INTEGRATION_THRESHOLD + Math.random() * 0.3);
    archetype.energy = Math.min(1, archetype.energy + integrationScore * 0.1);
    this._recordHistory('shadowIntegration', archetypeId, integrationScore * 0.1);
    return integrationScore;
  }

  synchronicityDetect(signals: Signal[]): { coincidences: number; meaningful: boolean } {
    if (signals.length < 2) return { coincidences: 0, meaningful: false };
    const archetypePatterns = Array.from(this._archetypes.values()).map(a => a.symbolism);
    let coincidences = 0;
    for (let i = 0; i < signals.length; i++) {
      for (let j = i + 1; j < signals.length; j++) {
        const entropySimilarity = 1 - Math.abs(signals[i].entropy - signals[j].entropy);
        const magnitudeSimilarity = 1 - Math.abs(signals[i].magnitude - signals[j].magnitude);
        if (entropySimilarity > 0.7 && magnitudeSimilarity > 0.6) {
          coincidences++;
        }
      }
    }
    const patternMatch = archetypePatterns.some(p => p.length >= coincidences);
    const meaningful = coincidences >= 2 && patternMatch;
    return { coincidences, meaningful };
  }

  getDominantArchetype(): Archetype | null {
    if (this._archetypes.size === 0) return null;
    let dominant: Archetype | null = null;
    let maxEnergy = -1;
    for (const arch of this._archetypes.values()) {
      if (arch.energy > maxEnergy) {
        maxEnergy = arch.energy;
        dominant = arch;
      }
    }
    return dominant ? { ...dominant } : null;
  }

  archetypeCross(archetypeA: string, archetypeB: string): Archetype | null {
    const a = this._archetypes.get(archetypeA);
    const b = this._archetypes.get(archetypeB);
    if (!a || !b) return null;
    const childName = `${a.name}/${b.name}`;
    const childDomain = `${a.domain}+${b.domain}`;
    const childShadow = `integrated-shadow-of-${a.shadow}-${b.shadow}`;
    const childSymbolism = [...new Set([...a.symbolism, ...b.symbolism])];
    const child: Archetype = {
      id: `arch-cross-${(++this._counter).toString(36)}`,
      name: childName,
      domain: childDomain,
      energy: (a.energy + b.energy) / 2,
      shadow: childShadow,
      symbolism: childSymbolism,
      activationCount: 0,
    };
    this._archetypes.set(child.id, child);
    this._recordHistory('cross', child.id, child.energy);
    return { ...child };
  }

  toPacket(): DataPacket {
    return {
      id: `archetype-${(++this._counter).toString(36)}-${Date.now().toString(36)}`,
      payload: {
        archetypes: Array.from(this._archetypes.values()),
        activeArchetypes: Array.from(this._activeArchetypes),
        dreams: [...this._dreams],
        collectiveUnconscious: [...this._collectiveUnconscious],
        dominantArchetype: this.getDominantArchetype(),
      },
      metadata: {
        createdAt: Date.now(),
        route: ['ArchetypeCore'],
        priority: Math.max(1, Math.floor(this._activeArchetypes.size * 2)),
        phase: 'mythic-awakening',
      },
    };
  }

  reset(): void {
    this._archetypes.clear();
    this._dreams = [];
    this._activeArchetypes.clear();
    this._history = [];
    this._collectiveUnconscious = [];
    this._counter = 0;
    this._initDefaultArchetypes();
    this._seedCollectiveUnconscious();
  }

  get archetypes(): Archetype[] {
    return Array.from(this._archetypes.values());
  }

  get activeArchetypes(): string[] {
    return Array.from(this._activeArchetypes);
  }

  get dreams(): ArchetypalDream[] {
    return [...this._dreams];
  }

  get history(): ArchetypeHistory[] {
    return [...this._history];
  }

  private _initDefaultArchetypes(): void {
    const defaults: Array<[string, string, string, string[]]> = [
      ['The Self', 'wholeness', 'fragmentation', ['circle', 'mandala', 'diamond', 'serpent']],
      ['The Shadow', 'unknown', 'denial', ['mask', 'mirror', 'cave', 'night']],
      ['The Anima', 'soul', 'projection', ['water', 'moon', 'garden', 'veil']],
      ['The Animus', 'spirit', 'aggression', ['sun', 'sword', 'mountain', 'eagle']],
      ['The Wise Old Man', 'wisdom', 'dogma', ['staff', 'book', 'tower', 'star']],
      ['The Great Mother', 'nurturing', 'devouring', ['earth', 'womb', 'tree', 'cauldron']],
      ['The Hero', 'triumph', 'hubris', ['sword', 'shield', 'crown', 'path']],
      ['The Trickster', 'chaos', 'foolishness', ['mask', 'fire', 'crossroads', 'mirror']],
    ];
    defaults.forEach(([name, domain, shadow, symbols]) => {
      const id = `arch-default-${name.toLowerCase().replace(/\s+/g, '-')}`;
      this._archetypes.set(id, {
        id,
        name,
        domain,
        energy: 0.3 + Math.random() * 0.3,
        shadow,
        symbolism: symbols,
        activationCount: 0,
      });
    });
  }

  private _seedCollectiveUnconscious(): void {
    const themes = ['birth', 'death', 'rebirth', 'journey', 'battle', 'union', 'sacrifice', 'transformation'];
    themes.forEach((theme, i) => {
      this._collectiveUnconscious.push({
        id: `cu-${theme}-${i}`,
        content: theme,
        vector: Array.from({ length: 8 }, () => Math.random()),
        lineage: ['collective-unconscious'],
      });
    });
  }

  private _dreamSymbols(archetype: Archetype, seed?: string): string[] {
    const base = [...archetype.symbolism];
    if (seed) base.push(seed);
    const shuffled = base.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(5, shuffled.length));
  }

  private _dreamIntensity(active: Archetype[]): number {
    if (active.length === 0) return 0.3;
    const totalEnergy = active.reduce((s, a) => s + a.energy, 0);
    const avgEnergy = totalEnergy / active.length;
    const chaos = Math.random() * 0.2;
    return Math.min(1, avgEnergy + chaos);
  }

  private _weaveDreamNarrative(archetype: Archetype, symbols: string[], seed?: string): string {
    const scenarios = [
      `In the realm of ${archetype.domain}, ${archetype.name} emerges through ${symbols.join(' and ')}.`,
      `A dream unfolds where ${archetype.name} dances with ${symbols[0] || 'shadows'}, guided by ${symbols[1] || 'the moon'}.`,
      `${archetype.name} rises from the depths, carrying ${symbols[0] || 'a gift'} and ${archetype.shadow}.`,
    ];
    let narrative = scenarios[Math.floor(Math.random() * scenarios.length)];
    if (seed) narrative += ` The echo of ${seed} reverberates throughout.`;
    return narrative;
  }

  private _stageDescription(stage: string): string {
    const descriptions: Record<string, string> = {
      'ordinary-world': 'The familiar realm of the known and comfortable.',
      'call-to-adventure': 'An invitation to embark on the great journey.',
      'refusal-of-call': 'Fear and doubt hold the hero back.',
      'meeting-the-mentor': 'Wisdom appears to guide the way.',
      'crossing-threshold': 'The point of no return is crossed.',
      'tests-allies-enemies': 'Trials forge the hero and reveal friends and foes.',
      'approach-inmost-cave': 'The heart of the darkness is approached.',
      'ordeal': 'The greatest challenge faces the hero.',
      'reward': 'Treasure is seized from the ordeal.',
      'road-back': 'The return journey begins.',
      'resurrection': 'Transformation and rebirth occur.',
      'return-with-elixir': 'The hero returns with the gift.',
    };
    return descriptions[stage.toLowerCase().replace(/\s+/g, '-')] || `The ${stage} stage of the journey.`;
  }

  private _stageChallenge(stage: string): string {
    const challenges: Record<string, string> = {
      'ordinary-world': 'Contentment vs. restlessness',
      'call-to-adventure': 'Recognizing the call',
      'refusal-of-call': 'Overcoming fear',
      'meeting-the-mentor': 'Trusting guidance',
      'crossing-threshold': 'Committing fully',
      'tests-allies-enemies': 'Discernment and courage',
      'approach-inmost-cave': 'Facing the shadow',
      'ordeal': 'Death and rebirth',
      'reward': 'Integrating the gift',
      'road-back': 'Perseverance',
      'resurrection': 'Complete transformation',
      'return-with-elixir': 'Sharing the wisdom',
    };
    return challenges[stage.toLowerCase().replace(/\s+/g, '-')] || 'Inner growth and transformation.';
  }

  private _recordHistory(action: string, archetypeId: string, energyDelta: number): void {
    this._history.push({
      timestamp: Date.now(),
      action,
      archetypeId,
      energyDelta,
    });
    if (this._history.length > 100) {
      this._history = this._history.slice(-100);
    }
  }
}
