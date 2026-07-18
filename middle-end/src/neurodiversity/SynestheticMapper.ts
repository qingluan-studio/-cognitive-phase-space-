import { KnowledgeUnit, DataPacket, Signal } from '../shared/types';

export type SensoryModality = 'visual' | 'auditory' | 'tactile' | 'olfactory' | 'gustatory' | 'proprioceptive' | 'interoceptive' | 'thermocean';

export interface SynestheticMapping {
  id: string;
  fromModality: SensoryModality;
  toModality: SensoryModality;
  strength: number;
  consistency: number;
  automaticity: number;
  rules: MappingRule[];
}

export interface MappingRule {
  id: string;
  trigger: string;
  target: string;
  confidence: number;
  frequency: number;
  examples: string[];
}

export interface SynestheticExperience {
  id: string;
  timestamp: number;
  primaryStimulus: {
    modality: SensoryModality;
    content: string;
    intensity: number;
  };
  concurrentPercept: {
    modality: SensoryModality;
    content: string;
    quality: string;
    vividness: number;
  };
  unitId: string;
  emotionalValence: number;
  arousalLevel: number;
}

export interface GraphemeColorPair {
  grapheme: string;
  color: { r: number; g: number; b: number; name: string };
  consistency: number;
}

export interface NumberForm {
  number: number;
  position: { x: number; y: number; z?: number };
  orientation: number;
  size: number;
}

export interface SoundColorPair {
  frequency: number;
  color: { r: number; g: number; b: number };
  shape: string;
  texture: string;
}

export interface SynestheticProfile {
  id: string;
  name: string;
  mappings: Map<string, SynestheticMapping>;
  graphemeColors: Map<string, GraphemeColorPair>;
  numberForms: NumberForm[];
  soundColors: SoundColorPair[];
  overallIntensity: number;
  crossModalRichness: number;
}

export interface SynestheticResult {
  experienceId: string;
  sourceUnit: string;
  primaryModality: SensoryModality;
  inducedModalities: SensoryModality[];
  vividness: number;
  consistency: number;
  emotionalTone: string;
}

export class SynestheticMapper {
  private _profiles: Map<string, SynestheticProfile>;
  private _currentProfile: string | null;
  private _experienceHistory: SynestheticExperience[];
  private _crossModalBias: number;
  private _vividnessBase: number;
  private _colorCache: Map<string, { r: number; g: number; b: number }>;
  private _shapeVocabulary: Map<SensoryModality, string[]>;

  constructor(vividnessBase: number = 0.7) {
    this._profiles = new Map();
    this._currentProfile = null;
    this._experienceHistory = [];
    this._crossModalBias = 0.6;
    this._vividnessBase = vividnessBase;
    this._colorCache = new Map();
    this._shapeVocabulary = this._createShapeVocabulary();
  }

  get profileCount(): number { return this._profiles.size; }
  get currentProfile(): string | null { return this._currentProfile; }
  get experienceCount(): number { return this._experienceHistory.length; }
  get vividnessBase(): number { return this._vividnessBase; }

  public createProfile(id: string, name: string): void {
    const profile: SynestheticProfile = {
      id,
      name,
      mappings: new Map(),
      graphemeColors: new Map(),
      numberForms: [],
      soundColors: [],
      overallIntensity: 0.7,
      crossModalRichness: 0.6
    };

    this._initializeDefaultMappings(profile);
    this._profiles.set(id, profile);

    if (!this._currentProfile) {
      this._currentProfile = id;
    }
  }

  public selectProfile(profileId: string): boolean {
    if (this._profiles.has(profileId)) {
      this._currentProfile = profileId;
      return true;
    }
    return false;
  }

  public mapUnit(unit: KnowledgeUnit, sourceModality: SensoryModality): SynestheticExperience[] {
    const experiences: SynestheticExperience[] = [];
    const profile = this._getCurrentProfile();
    const allModalities: SensoryModality[] = ['visual', 'auditory', 'tactile', 'olfactory', 'gustatory', 'proprioceptive'];

    for (const targetModality of allModalities) {
      if (targetModality === sourceModality) continue;

      const mappingKey = `${sourceModality}-${targetModality}`;
      const mapping = profile.mappings.get(mappingKey);

      if (mapping && Math.random() < mapping.strength) {
        const experience = this._generateExperience(unit, sourceModality, targetModality, mapping);
        experiences.push(experience);
        this._experienceHistory.push(experience);
      }
    }

    return experiences;
  }

  public mapSignal(signal: Signal, sourceModality: SensoryModality): SynestheticResult {
    const profile = this._getCurrentProfile();
    const inducedModalities: SensoryModality[] = [];
    let totalVividness = 0;
    let totalConsistency = 0;
    let count = 0;

    const allModalities: SensoryModality[] = ['visual', 'auditory', 'tactile', 'olfactory', 'gustatory'];

    for (const targetModality of allModalities) {
      if (targetModality === sourceModality) continue;

      const mappingKey = `${sourceModality}-${targetModality}`;
      const mapping = profile.mappings.get(mappingKey);

      if (mapping && signal.magnitude * mapping.strength > 0.3) {
        inducedModalities.push(targetModality);
        totalVividness += mapping.strength * signal.magnitude;
        totalConsistency += mapping.consistency;
        count++;
      }
    }

    return {
      experienceId: `syn-${Date.now()}`,
      sourceUnit: signal.source,
      primaryModality: sourceModality,
      inducedModalities,
      vividness: count > 0 ? totalVividness / count : 0,
      consistency: count > 0 ? totalConsistency / count : 0,
      emotionalTone: this._deriveEmotionalTone(signal)
    };
  }

  public getGraphemeColor(grapheme: string): GraphemeColorPair | null {
    const profile = this._getCurrentProfile();
    const cached = profile.graphemeColors.get(grapheme);
    if (cached) return cached;

    const color = this._generateGraphemeColor(grapheme);
    const pair: GraphemeColorPair = {
      grapheme,
      color,
      consistency: 0.7 + Math.random() * 0.3
    };

    profile.graphemeColors.set(grapheme, pair);
    return pair;
  }

  public getNumberForm(number: number): NumberForm {
    const profile = this._getCurrentProfile();
    const existing = profile.numberForms.find(n => n.number === number);
    if (existing) return existing;

    const form: NumberForm = {
      number,
      position: this._calculateNumberPosition(number),
      orientation: (number * 17) % 360,
      size: 0.5 + Math.random() * 0.5
    };

    profile.numberForms.push(form);
    return form;
  }

  public soundToColor(frequency: number): SoundColorPair {
    const profile = this._getCurrentProfile();
    const existing = profile.soundColors.find(s => Math.abs(s.frequency - frequency) < 10);
    if (existing) return existing;

    const hue = (frequency % 360 * Math.log10(frequency + 1)) % 360;
    const color = this._hslToRgb(hue, 0.7, 0.6);
    const shapes = ['spherical', 'wave-like', 'spiral', 'crystalline', 'flowing'];
    const textures = ['smooth', 'rough', 'grainy', 'silky', 'vibrating'];

    const pair: SoundColorPair = {
      frequency,
      color,
      shape: shapes[Math.floor(Math.abs(Math.sin(frequency)) * shapes.length)],
      texture: textures[Math.floor(Math.abs(Math.cos(frequency)) * textures.length)]
    };

    profile.soundColors.push(pair);
    return pair;
  }

  public addMapping(
    from: SensoryModality,
    to: SensoryModality,
    strength: number,
    rules: MappingRule[] = []
  ): SynestheticMapping {
    const profile = this._getCurrentProfile();
    const key = `${from}-${to}`;

    const mapping: SynestheticMapping = {
      id: `map-${from}-${to}`,
      fromModality: from,
      toModality: to,
      strength,
      consistency: 0.5 + Math.random() * 0.5,
      automaticity: 0.4 + Math.random() * 0.6,
      rules
    };

    profile.mappings.set(key, mapping);
    return mapping;
  }

  public testConsistency(graphemes: string[]): number {
    let totalConsistency = 0;
    let count = 0;

    for (const grapheme of graphemes) {
      const first = this.getGraphemeColor(grapheme);
      const second = this._generateGraphemeColor(grapheme);

      if (first) {
        const colorDistance = this._colorDistance(first.color, second);
        const consistency = 1 - colorDistance;
        totalConsistency += consistency;
        count++;
      }
    }

    return count > 0 ? totalConsistency / count : 0;
  }

  public calculateSynesthesiaQuotient(): number {
    const profile = this._getCurrentProfile();
    const mappingCount = profile.mappings.size;
    const avgStrength = Array.from(profile.mappings.values()).reduce((s, m) => s + m.strength, 0) / Math.max(1, mappingCount);
    const graphemeCount = profile.graphemeColors.size;

    return Math.min(1, (mappingCount / 30) * 0.4 + avgStrength * 0.4 + (graphemeCount / 50) * 0.2);
  }

  public findCrossModalAnalogies(
    unitA: KnowledgeUnit,
    unitB: KnowledgeUnit,
    modalityA: SensoryModality,
    modalityB: SensoryModality
  ): { analogous: boolean; similarity: number; sharedQualities: string[] } {
    const expA = this.mapUnit(unitA, modalityA);
    const expB = this.mapUnit(unitB, modalityB);

    const sharedQualities = this._findSharedQualities(expA, expB);
    const similarity = sharedQualities.length / 10;

    return {
      analogous: similarity > 0.3,
      similarity,
      sharedQualities
    };
  }

  public getSensoryPalette(unit: KnowledgeUnit): Map<SensoryModality, { quality: string; intensity: number }> {
    const palette = new Map<SensoryModality, { quality: string; intensity: number }>();
    const modalities: SensoryModality[] = ['visual', 'auditory', 'tactile', 'olfactory', 'gustatory'];

    for (const mod of modalities) {
      const experiences = this.mapUnit(unit, mod);
      if (experiences.length > 0) {
        const avgIntensity = experiences.reduce((s, e) => s + e.concurrentPercept.vividness, 0) / experiences.length;
        palette.set(mod, {
          quality: experiences[0].concurrentPercept.quality,
          intensity: avgIntensity
        });
      }
    }

    return palette;
  }

  private _generateExperience(
    unit: KnowledgeUnit,
    fromModality: SensoryModality,
    toModality: SensoryModality,
    mapping: SynestheticMapping
  ): SynestheticExperience {
    const intensity = this._calculateStimulusIntensity(unit);
    const vividness = mapping.strength * this._vividnessBase * intensity;
    const quality = this._generatePerceptQuality(unit, toModality);

    return {
      id: `exp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      primaryStimulus: {
        modality: fromModality,
        content: unit.content.substring(0, 50),
        intensity
      },
      concurrentPercept: {
        modality: toModality,
        content: quality,
        quality,
        vividness
      },
      unitId: unit.id,
      emotionalValence: 0.5 + (unit.vector?.[0] || 0) * 0.3,
      arousalLevel: 0.4 + Math.random() * 0.4
    };
  }

  private _calculateStimulusIntensity(unit: KnowledgeUnit): number {
    const vecLen = unit.vector?.length || 0;
    const contentLen = unit.content.length;
    return Math.min(1, vecLen * 0.1 + contentLen * 0.001);
  }

  private _generatePerceptQuality(unit: KnowledgeUnit, modality: SensoryModality): string {
    const qualities = this._shapeVocabulary.get(modality) || [];
    const idx = Math.floor(Math.random() * qualities.length);
    return qualities[idx] || 'indescribable';
  }

  private _initializeDefaultMappings(profile: SynestheticProfile): void {
    const defaultMappings: { from: SensoryModality; to: SensoryModality; strength: number }[] = [
      { from: 'auditory', to: 'visual', strength: 0.8 },
      { from: 'visual', to: 'auditory', strength: 0.6 },
      { from: 'gustatory', to: 'visual', strength: 0.5 },
      { from: 'olfactory', to: 'gustatory', strength: 0.9 },
      { from: 'auditory', to: 'tactile', strength: 0.4 },
      { from: 'visual', to: 'tactile', strength: 0.3 }
    ];

    for (const m of defaultMappings) {
      this.addMappingInternal(profile, m.from, m.to, m.strength);
    }
  }

  private addMappingInternal(
    profile: SynestheticProfile,
    from: SensoryModality,
    to: SensoryModality,
    strength: number
  ): void {
    const key = `${from}-${to}`;
    profile.mappings.set(key, {
      id: `map-${from}-${to}`,
      fromModality: from,
      toModality: to,
      strength,
      consistency: 0.7,
      automaticity: 0.6,
      rules: []
    });
  }

  private _generateGraphemeColor(grapheme: string): { r: number; g: number; b: number; name: string } {
    const cached = this._colorCache.get(grapheme);
    if (cached) {
      return { ...cached, name: this._colorName(cached) };
    }

    let hash = 0;
    for (let i = 0; i < grapheme.length; i++) {
      hash = grapheme.charCodeAt(i) + ((hash << 5) - hash);
    }

    const hue = Math.abs(hash) % 360;
    const saturation = 60 + (Math.abs(hash >> 8) % 30);
    const lightness = 45 + (Math.abs(hash >> 16) % 20);

    const color = this._hslToRgb(hue, saturation / 100, lightness / 100);
    this._colorCache.set(grapheme, color);

    return { ...color, name: this._colorName(color) };
  }

  private _calculateNumberPosition(number: number): { x: number; y: number; z?: number } {
    const angle = (number * 30) * (Math.PI / 180);
    const radius = 50 + Math.abs(number) * 5;
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius
    };
  }

  private _hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
    let r, g, b;

    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h / 360 + 1/3);
      g = hue2rgb(p, q, h / 360);
      b = hue2rgb(p, q, h / 360 - 1/3);
    }

    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255)
    };
  }

  private _colorDistance(a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }): number {
    const dr = a.r - b.r;
    const dg = a.g - b.g;
    const db = a.b - b.b;
    return Math.sqrt(dr * dr + dg * dg + db * db) / 441;
  }

  private _colorName(color: { r: number; g: number; b: number }): string {
    const { r, g, b } = color;
    if (r > 200 && g < 100 && b < 100) return 'red';
    if (r > 200 && g > 150 && b < 100) return 'orange';
    if (r > 200 && g > 200 && b < 100) return 'yellow';
    if (r < 100 && g > 150 && b < 100) return 'green';
    if (r < 100 && g > 150 && b > 200) return 'cyan';
    if (r < 100 && g < 100 && b > 200) return 'blue';
    if (r > 150 && g < 100 && b > 150) return 'purple';
    if (r > 200 && g > 200 && b > 200) return 'white';
    if (r < 50 && g < 50 && b < 50) return 'black';
    return 'gray';
  }

  private _deriveEmotionalTone(signal: Signal): string {
    if (signal.magnitude > 0.7) {
      return signal.entropy > 0.5 ? 'intense' : 'calm-powerful';
    }
    if (signal.entropy > 0.7) {
      return 'chaotic';
    }
    return 'neutral';
  }

  private _findSharedQualities(a: SynestheticExperience[], b: SynestheticExperience[]): string[] {
    const qualitiesA = new Set(a.map(e => e.concurrentPercept.quality));
    const shared: string[] = [];
    for (const exp of b) {
      if (qualitiesA.has(exp.concurrentPercept.quality)) {
        shared.push(exp.concurrentPercept.quality);
      }
    }
    return [...new Set(shared)];
  }

  private _createShapeVocabulary(): Map<SensoryModality, string[]> {
    const vocab = new Map<SensoryModality, string[]>();
    vocab.set('visual', ['bright', 'dark', 'colorful', 'pale', 'shimmering', 'glowing', 'spiky', 'smooth', 'patterned', 'swirling']);
    vocab.set('auditory', ['high-pitched', 'low', 'muffled', 'clear', 'rumbling', 'tinkling', 'harmonious', 'dissonant', 'rhythmic', 'melodic']);
    vocab.set('tactile', ['soft', 'rough', 'smooth', 'warm', 'cold', 'tingly', 'heavy', 'light', 'vibrating', 'silky']);
    vocab.set('olfactory', ['sweet', 'pungent', 'floral', 'earthy', 'sharp', 'musk', 'citrus', 'woody', 'fresh', 'rotten']);
    vocab.set('gustatory', ['sweet', 'sour', 'salty', 'bitter', 'umami', 'spicy', 'metallic', 'fatty', 'astringent', 'minty']);
    vocab.set('proprioceptive', ['light', 'heavy', 'floating', 'grounded', 'expansive', 'tight', 'loose', 'balanced', 'tilted', 'spinning']);
    return vocab;
  }

  private _getCurrentProfile(): SynestheticProfile {
    let profile = this._currentProfile ? this._profiles.get(this._currentProfile) : null;
    if (!profile) {
      this.createProfile('default', 'Default Synesthetic Profile');
      profile = this._profiles.get('default')!;
    }
    return profile;
  }

  public processPacket(packet: DataPacket<KnowledgeUnit[]>): DataPacket<SynestheticResult[]> {
    const profileId = packet.metadata.phase;
    if (!this._profiles.has(profileId)) {
      this.createProfile(profileId, `Profile-${profileId}`);
      this.selectProfile(profileId);
    }

    const results: SynestheticResult[] = [];
    for (const ku of packet.payload) {
      const experiences = this.mapUnit(ku, 'visual');
      if (experiences.length > 0) {
        results.push({
          experienceId: experiences[0].id,
          sourceUnit: ku.id,
          primaryModality: 'visual',
          inducedModalities: experiences.map(e => e.concurrentPercept.modality),
          vividness: experiences.reduce((s, e) => s + e.concurrentPercept.vividness, 0) / experiences.length,
          consistency: 0.7,
          emotionalTone: this._deriveEmotionalTone({
            source: ku.id,
            magnitude: ku.vector?.[0] || 0.5,
            entropy: ku.vector?.[1] || 0.5,
            timestamp: Date.now()
          })
        });
      }
    }

    return {
      id: `synesthetic-${packet.id}`,
      payload: results,
      metadata: {
        ...packet.metadata,
        route: [...packet.metadata.route, 'SynestheticMapper']
      }
    };
  }

  public exportProfile(profileId: string): { id: string; name: string; mappingCount: number; intensity: number } | null {
    const profile = this._profiles.get(profileId);
    if (!profile) return null;
    return {
      id: profile.id,
      name: profile.name,
      mappingCount: profile.mappings.size,
      intensity: profile.overallIntensity
    };
  }

  public reset(): void {
    this._profiles.clear();
    this._currentProfile = null;
    this._experienceHistory = [];
    this._colorCache.clear();
  }
}
