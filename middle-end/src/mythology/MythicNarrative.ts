import { DataPacket, KnowledgeUnit, Signal } from '../shared/types';

export interface NarrativeThread {
  id: string;
  title: string;
  content: string;
  culture: string;
  era: string;
  archetypes: string[];
  depth: number;
}

export interface MythicPattern {
  id: string;
  name: string;
  description: string;
  occurrences: number;
  crossCultural: boolean;
  significance: number;
}

export interface NarrativeWeave {
  id: string;
  threadIds: string[];
  patternDetected: string;
  synthesis: string;
  coherenceScore: number;
  mythicDepth: number;
}

interface NarrativeHistoryEntry {
  timestamp: number;
  action: string;
  threadCount: number;
  depthDelta: number;
}

const PATTERN_NAMES = [
  'Hero Journey',
  'Creation Myth',
  'Flood Story',
  'Trickster Tale',
  'Love Tragedy',
  'Quest for Immortality',
  'Descent to Underworld',
  'Golden Age',
  'Apocalypse and Rebirth',
  'Sacred Marriage',
];

const CULTURES = ['Norse', 'Greek', 'Hindu', 'Chinese', 'Egyptian', 'Maya', 'Celtic', 'Japanese', 'Persian', 'African'];

export class MythicNarrative {
  private _threads: Map<string, NarrativeThread> = new Map();
  private _patterns: Map<string, MythicPattern> = new Map();
  private _weaves: NarrativeWeave[] = [];
  private _tapestry: KnowledgeUnit[] = [];
  private _history: NarrativeHistoryEntry[] = [];
  private _counter = 0;

  constructor() {
    this._seedInitialPatterns();
  }

  weaveThreads(threadIds: string[]): NarrativeWeave {
    const threads = threadIds
      .map(id => this._threads.get(id))
      .filter(Boolean) as NarrativeThread[];
    if (threads.length === 0) {
      threads.push(...Array.from(this._threads.values()).slice(0, 2));
    }
    const pattern = this._identifyPatternFromThreads(threads);
    const synthesis = this._synthesizeThreads(threads, pattern);
    const coherenceScore = this._calculateCoherence(threads);
    const mythicDepth = this._calculateMythicDepth(threads);
    const weave: NarrativeWeave = {
      id: `weave-${(++this._counter).toString(36)}`,
      threadIds: threads.map(t => t.id),
      patternDetected: pattern,
      synthesis,
      coherenceScore,
      mythicDepth,
    };
    this._weaves.push(weave);
    if (this._weaves.length > 50) {
      this._weaves = this._weaves.slice(-50);
    }
    this._addToTapestry(weave);
    this._recordHistory('weave-threads', threads.length, mythicDepth * 0.1);
    return { ...weave };
  }

  identifyPattern(text: string): MythicPattern {
    const detected = this._detectPatternInText(text);
    const pattern = this._patterns.get(detected.id);
    if (pattern) {
      pattern.occurrences++;
      pattern.significance = Math.min(1, pattern.significance + 0.02);
      return { ...pattern };
    }
    const newPattern: MythicPattern = {
      id: detected.id,
      name: detected.name,
      description: `Pattern detected in narrative: ${detected.name}`,
      occurrences: 1,
      crossCultural: Math.random() > 0.5,
      significance: 0.3 + Math.random() * 0.4,
    };
    this._patterns.set(newPattern.id, newPattern);
    this._recordHistory('identify-pattern', 1, 0.05);
    return { ...newPattern };
  }

  crossCulturalVariant(myth: string, targetCulture: string): { variant: string; fidelity: number } {
    const cultures = CULTURES.filter(c => c.toLowerCase() !== targetCulture.toLowerCase());
    const sourceCulture = cultures[Math.floor(Math.random() * cultures.length)];
    const variantTropes = this._cultureTropes(targetCulture);
    const fidelity = Math.min(1, 0.6 + Math.random() * 0.35);
    const variant = `The ${myth} myth, as told in ${targetCulture}: In the land of ${variantTropes.setting}, ${variantTropes.hero} embarked on ${variantTropes.quest}. This variant preserves the core of the ${sourceCulture} version, adapted through the lens of ${targetCulture} wisdom.`;
    this._recordHistory('cross-cultural-variant', 1, 0.08);
    return { variant, fidelity };
  }

  mythicDepth(story: string): { depth: number; layers: string[] } {
    const layers: string[] = [];
    let depth = 0.3;
    if (story.length > 50) {
      layers.push('literal');
      depth += 0.1;
    }
    if (story.includes('dragon') || story.includes('monster') || story.includes('shadow')) {
      layers.push('psychological');
      depth += 0.15;
    }
    if (story.includes('god') || story.includes('deity') || story.includes('cosmic')) {
      layers.push('cosmic');
      depth += 0.15;
    }
    if (story.includes('death') && story.includes('rebirth')) {
      layers.push('initiatic');
      depth += 0.15;
    }
    if (layers.length >= 3) {
      layers.push('integral');
      depth += 0.1;
    }
    depth = Math.min(1, depth + Math.random() * 0.1);
    this._recordHistory('mythic-depth', 0, depth * 0.05);
    return { depth, layers };
  }

  heroArchetypeDetect(story: string): { archetype: string; confidence: number; traits: string[] } {
    const archetypes = ['The Hero', 'The Outlaw', 'The Magician', 'The Lover', 'The Jester', 'The Everyman', 'The Caregiver', 'The Ruler', 'The Creator', 'The Innocent', 'The Sage', 'The Explorer'];
    const archetype = archetypes[Math.floor(Math.random() * archetypes.length)];
    const confidence = 0.5 + Math.random() * 0.45;
    const allTraits = ['courage', 'wisdom', 'compassion', 'cunning', 'strength', 'humility', 'ambition', 'creativity', 'loyalty', 'independence'];
    const traits = allTraits.sort(() => Math.random() - 0.5).slice(0, 3 + Math.floor(Math.random() * 3));
    this._recordHistory('hero-archetype-detect', 0, 0.03);
    return { archetype, confidence, traits };
  }

  cosmicEchoDetect(story: string): { echoDetected: boolean; cosmicTheme: string; resonance: number } {
    const cosmicThemes = ['creation', 'destruction', 'rebirth', 'unity', 'duality', 'infinity', 'void', 'consciousness', 'transcendence', 'sacrifice'];
    const words = story.toLowerCase().split(/\s+/);
    let resonance = 0;
    let detectedTheme = '';
    cosmicThemes.forEach(theme => {
      if (story.toLowerCase().includes(theme)) {
        resonance += 0.15;
        if (!detectedTheme) detectedTheme = theme;
      }
    });
    const echoDetected = resonance > 0.2 || Math.random() > 0.6;
    if (!detectedTheme) {
      detectedTheme = cosmicThemes[Math.floor(Math.random() * cosmicThemes.length)];
    }
    resonance = Math.min(1, resonance + Math.random() * 0.3);
    this._recordHistory('cosmic-echo-detect', 0, resonance * 0.05);
    return { echoDetected, cosmicTheme: detectedTheme, resonance };
  }

  toPacket(): DataPacket {
    return {
      id: `mythic-narrative-${(++this._counter).toString(36)}-${Date.now().toString(36)}`,
      payload: {
        threads: Array.from(this._threads.values()),
        patterns: Array.from(this._patterns.values()),
        weaves: [...this._weaves],
        tapestry: [...this._tapestry],
        patternCount: this._patterns.size,
        threadCount: this._threads.size,
      },
      metadata: {
        createdAt: Date.now(),
        route: ['MythicNarrative'],
        priority: Math.max(1, Math.floor(this._weaves.length * 0.5)),
        phase: this._weaves.length > 10 ? 'tapestry-forming' : 'thread-gathering',
      },
    };
  }

  reset(): void {
    this._threads.clear();
    this._patterns.clear();
    this._weaves = [];
    this._tapestry = [];
    this._history = [];
    this._counter = 0;
    this._seedInitialPatterns();
  }

  get threads(): NarrativeThread[] {
    return Array.from(this._threads.values());
  }

  get patterns(): MythicPattern[] {
    return Array.from(this._patterns.values());
  }

  get weaves(): NarrativeWeave[] {
    return [...this._weaves];
  }

  get tapestry(): KnowledgeUnit[] {
    return [...this._tapestry];
  }

  get history(): NarrativeHistoryEntry[] {
    return [...this._history];
  }

  private _seedInitialPatterns(): void {
    PATTERN_NAMES.forEach((name, i) => {
      const id = `pattern-${name.toLowerCase().replace(/\s+/g, '-')}`;
      this._patterns.set(id, {
        id,
        name,
        description: `The universal pattern of ${name}, found across cultures.`,
        occurrences: 0,
        crossCultural: true,
        significance: 0.5 + (i / PATTERN_NAMES.length) * 0.3,
      });
    });
    const sampleStories = [
      { title: 'The Theft of Fire', culture: 'Greek', era: 'ancient', archetypes: ['Trickster', 'Hero'], content: 'Prometheus steals fire from the gods and gives it to humanity, enduring eternal punishment for his act of rebellion and compassion.' },
      { title: 'World Tree', culture: 'Norse', era: 'mythic', archetypes: ['Cosmic', 'World Tree'], content: 'Yggdrasil, the world tree, connects the nine realms, its roots reaching into the underworld and branches touching the heavens.' },
    ];
    sampleStories.forEach((story, i) => {
      const id = `thread-sample-${i}`;
      this._threads.set(id, {
        id,
        title: story.title,
        content: story.content,
        culture: story.culture,
        era: story.era,
        archetypes: story.archetypes,
        depth: 0.7 + Math.random() * 0.2,
      });
    });
  }

  private _identifyPatternFromThreads(threads: NarrativeThread[]): string {
    const allArchetypes = threads.flatMap(t => t.archetypes);
    const archetypeCount: Record<string, number> = {};
    allArchetypes.forEach(a => {
      archetypeCount[a] = (archetypeCount[a] || 0) + 1;
    });
    const patterns = Array.from(this._patterns.values());
    const bestMatch = patterns.reduce((best, pattern) => {
      const score = pattern.significance + pattern.occurrences * 0.01;
      return score > best.score ? { pattern, score } : best;
    }, { pattern: patterns[0], score: 0 });
    return bestMatch.pattern.name;
  }

  private _synthesizeThreads(threads: NarrativeThread[], pattern: string): string {
    const titles = threads.map(t => t.title).join(', ');
    const cultures = [...new Set(threads.map(t => t.culture))].join(' and ');
    return `Woven from ${threads.length} threads (${titles}) across ${cultures}, the pattern of ${pattern} emerges. Each thread contributes a unique voice to the universal story, revealing the shared human experience beneath cultural variations.`;
  }

  private _calculateCoherence(threads: NarrativeThread[]): number {
    if (threads.length < 2) return 0.5;
    let sharedArchetypes = 0;
    const firstArchetypes = new Set(threads[0].archetypes);
    for (let i = 1; i < threads.length; i++) {
      threads[i].archetypes.forEach(a => {
        if (firstArchetypes.has(a)) sharedArchetypes++;
      });
    }
    const baseCoherence = sharedArchetypes / Math.max(1, firstArchetypes.size);
    return Math.min(1, baseCoherence + Math.random() * 0.2);
  }

  private _calculateMythicDepth(threads: NarrativeThread[]): number {
    if (threads.length === 0) return 0;
    const avgDepth = threads.reduce((s, t) => s + t.depth, 0) / threads.length;
    const cultureBonus = (new Set(threads.map(t => t.culture))).size * 0.05;
    return Math.min(1, avgDepth + cultureBonus);
  }

  private _detectPatternInText(text: string): { id: string; name: string } {
    const patterns = Array.from(this._patterns.values());
    const lowerText = text.toLowerCase();
    for (const pattern of patterns) {
      const patternWords = pattern.name.toLowerCase().split(/\s+/);
      let matchCount = 0;
      patternWords.forEach(word => {
        if (lowerText.includes(word)) matchCount++;
      });
      if (matchCount >= patternWords.length * 0.5) {
        return { id: pattern.id, name: pattern.name };
      }
    }
    const name = PATTERN_NAMES[Math.floor(Math.random() * PATTERN_NAMES.length)];
    return { id: `pattern-${name.toLowerCase().replace(/\s+/g, '-')}`, name };
  }

  private _cultureTropes(culture: string): { setting: string; hero: string; quest: string } {
    const tropes: Record<string, { setting: string; hero: string; quest: string }> = {
      'Norse': { setting: 'the frost-covered realms of Midgard', hero: 'a warrior of great renown', quest: 'a journey to Jotunheim to retrieve a treasure' },
      'Greek': { setting: 'the sun-drenched lands of Hellas', hero: 'a demigod of noble birth', quest: 'a quest to prove worthiness to the Olympians' },
      'Hindu': { setting: 'the sacred lands of Bharata', hero: 'a prince of dharma', quest: 'a pilgrimage to the Himalayas in search of enlightenment' },
      'Chinese': { setting: 'the celestial empire under heaven', hero: 'a scholar-warrior of virtue', quest: 'a journey to the west in search of sacred scriptures' },
      'Egyptian': { setting: 'the golden lands along the Nile', hero: 'a pharaoh beloved by the gods', quest: 'a descent to the underworld to commune with Osiris' },
      'Maya': { setting: 'the emerald jungles of the sacred calendar', hero: 'a priest-king who reads the stars', quest: 'a pilgrimage to the sacred cenote to offer gifts to the rain gods' },
      'Celtic': { setting: 'the mist-shrouded isles of the west', hero: 'a druid with the sight', quest: 'a journey to the Otherworld to retrieve a magical cauldron' },
      'Japanese': { setting: 'the islands of the rising sun', hero: 'a samurai of unwavering honor', quest: 'a pilgrimage to the sacred mountain to find inner peace' },
    };
    return tropes[culture] || { setting: 'a faraway land', hero: 'a seeker of truth', quest: 'a great adventure' };
  }

  private _addToTapestry(weave: NarrativeWeave): void {
    const unit: KnowledgeUnit = {
      id: `tapestry-${weave.id}`,
      content: weave.synthesis,
      vector: Array.from({ length: 8 }, () => Math.random()),
      lineage: weave.threadIds,
    };
    this._tapestry.push(unit);
    if (this._tapestry.length > 100) {
      this._tapestry = this._tapestry.slice(-100);
    }
  }

  private _recordHistory(action: string, threadCount: number, depthDelta: number): void {
    this._history.push({
      timestamp: Date.now(),
      action,
      threadCount,
      depthDelta,
    });
    if (this._history.length > 100) {
      this._history = this._history.slice(-100);
    }
  }
}
