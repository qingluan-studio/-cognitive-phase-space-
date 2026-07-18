import { DataPacket, Signal, KnowledgeUnit } from '../shared/types';

export interface Character {
  id: string;
  name: string;
  traits: Map<string, number>;
  want: string;
  need: string;
  flaw: string;
  arc: string;
  growth: number;
  shadow: string[];
  createdAt: number;
}

export interface TraitPair {
  id: string;
  trait: string;
  opposite: string;
  dialecticTension: number;
  synthesis: string;
}

export interface CharacterRelationship {
  id: string;
  charA: string;
  charB: string;
  type: string;
  intensity: number;
  history: string[];
  shadowProjection: boolean;
}

export class CharacterForge {
  private _characters: Map<string, Character> = new Map();
  private _relationships: Map<string, CharacterRelationship> = new Map();
  private _traitPairs: Map<string, TraitPair> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  createCharacter(name: string, traits: Record<string, number> = {}): Character {
    const id = `char-${(++this._counter).toString(36)}-${Date.now().toString(36)}`;
    const traitMap = new Map<string, number>();
    for (const [trait, value] of Object.entries(traits)) {
      traitMap.set(trait, Math.max(0, Math.min(1, value)));
    }
    const character: Character = {
      id,
      name,
      traits: traitMap,
      want: '',
      need: '',
      flaw: '',
      arc: '',
      growth: 0,
      shadow: [],
      createdAt: Date.now(),
    };
    this._characters.set(id, character);
    this._recordHistory(`createCharacter:${name}`);
    return character;
  }

  addTrait(charId: string, trait: string, value: number): Character | null {
    const char = this._characters.get(charId);
    if (!char) return null;
    char.traits.set(trait, Math.max(0, Math.min(1, value)));
    this._recordHistory(`addTrait:${charId}:${trait}`);
    return char;
  }

  setWantNeed(charId: string, want: string, need: string): Character | null {
    const char = this._characters.get(charId);
    if (!char) return null;
    char.want = want;
    char.need = need;
    this._recordHistory(`setWantNeed:${charId}`);
    return char;
  }

  defineFlaw(charId: string, flaw: string): Character | null {
    const char = this._characters.get(charId);
    if (!char) return null;
    char.flaw = flaw;
    this._updateShadow(charId);
    this._recordHistory(`defineFlaw:${charId}`);
    return char;
  }

  createRelationship(charA: string, charB: string, type: string): CharacterRelationship | null {
    if (!this._characters.has(charA) || !this._characters.has(charB)) return null;
    const id = `rel-${(++this._counter).toString(36)}-${Date.now().toString(36)}`;
    const relationship: CharacterRelationship = {
      id,
      charA,
      charB,
      type,
      intensity: 0.5,
      history: [],
      shadowProjection: false,
    };
    this._relationships.set(id, relationship);
    this._recordHistory(`createRelationship:${charA}-${charB}:${type}`);
    return relationship;
  }

  shadowProjection(from: string, to: string): CharacterRelationship | null {
    const fromChar = this._characters.get(from);
    const toChar = this._characters.get(to);
    if (!fromChar || !toChar) return null;

    let rel = Array.from(this._relationships.values()).find(
      r => (r.charA === from && r.charB === to) || (r.charA === to && r.charB === from)
    );

    if (!rel) {
      const id = `rel-${(++this._counter).toString(36)}-${Date.now().toString(36)}`;
      rel = {
        id,
        charA: from,
        charB: to,
        type: 'shadowProjection',
        intensity: 0.7,
        history: [],
        shadowProjection: true,
      };
      this._relationships.set(id, rel);
    }

    rel.shadowProjection = true;
    rel.intensity = Math.min(1, rel.intensity + 0.2);
    rel.history.push(`shadowProjection:${Date.now()}`);

    if (fromChar.flaw && !toChar.shadow.includes(fromChar.flaw)) {
      toChar.shadow.push(fromChar.flaw);
    }

    this._recordHistory(`shadowProjection:${from}->${to}`);
    return rel;
  }

  characterGrowth(charId: string): number {
    const char = this._characters.get(charId);
    if (!char) return 0;

    let growthScore = 0;
    if (char.want && char.need) {
      growthScore += 0.2;
    }
    if (char.flaw) {
      growthScore += 0.15;
    }
    if (char.arc) {
      growthScore += 0.25;
    }

    const traitCount = char.traits.size;
    if (traitCount >= 5) growthScore += 0.2;
    else if (traitCount >= 3) growthScore += 0.1;

    growthScore += char.shadow.length * 0.05;
    char.growth = Math.min(1, growthScore);

    this._recordHistory(`characterGrowth:${charId}:${char.growth.toFixed(2)}`);
    return char.growth;
  }

  traitDialectic(trait: string): TraitPair {
    const opposites: Record<string, string> = {
      courage: 'cowardice',
      wisdom: 'foolishness',
      kindness: 'cruelty',
      honesty: 'deceit',
      humility: 'pride',
      patience: 'impatience',
      generosity: 'greed',
      loyalty: 'betrayal',
    };

    const opposite = opposites[trait] || `anti-${trait}`;
    const id = `traitpair-${(++this._counter).toString(36)}`;
    const pair: TraitPair = {
      id,
      trait,
      opposite,
      dialecticTension: 0.5 + Math.random() * 0.3,
      synthesis: `balanced-${trait}`,
    };
    this._traitPairs.set(id, pair);
    this._recordHistory(`traitDialectic:${trait}`);
    return pair;
  }

  characterNetworkAnalysis(): {
    totalCharacters: number;
    totalRelationships: number;
    avgRelationshipsPerChar: number;
    density: number;
  } {
    const totalCharacters = this._characters.size;
    const totalRelationships = this._relationships.size;
    const avgRelationshipsPerChar = totalCharacters > 0 ? (totalRelationships * 2) / totalCharacters : 0;
    const maxPossible = totalCharacters > 1 ? (totalCharacters * (totalCharacters - 1)) / 2 : 0;
    const density = maxPossible > 0 ? totalRelationships / maxPossible : 0;

    return {
      totalCharacters,
      totalRelationships,
      avgRelationshipsPerChar,
      density,
    };
  }

  mostInfluentialCharacter(): Character | null {
    if (this._characters.size === 0) return null;

    let mostInfluential: Character | null = null;
    let maxConnections = -1;

    for (const char of this._characters.values()) {
      const connections = Array.from(this._relationships.values()).filter(
        r => r.charA === char.id || r.charB === char.id
      ).length;
      if (connections > maxConnections) {
        maxConnections = connections;
        mostInfluential = char;
      }
    }

    return mostInfluential;
  }

  relationshipTypes(): Record<string, number> {
    const types: Record<string, number> = {};
    for (const rel of this._relationships.values()) {
      types[rel.type] = (types[rel.type] || 0) + 1;
    }
    return types;
  }

  characterShadowIntegration(charId: string): {
    shadowTraits: string[];
    integrationLevel: number;
    recommendations: string[];
  } | null {
    const char = this._characters.get(charId);
    if (!char) return null;

    const shadowTraits = char.shadow;
    const integrationLevel = char.growth;
    const recommendations: string[] = [];

    if (shadowTraits.length > 0 && integrationLevel < 0.5) {
      recommendations.push('Character needs to confront their shadow');
    }
    if (char.flaw && shadowTraits.includes(char.flaw)) {
      recommendations.push('Flaw is integrated into shadow self-awareness');
    }
    if (integrationLevel >= 0.7) {
      recommendations.push('Shadow is well-integrated');
    }

    return {
      shadowTraits,
      integrationLevel,
      recommendations,
    };
  }

  characterArcType(charId: string): {
    type: string;
    description: string;
    progress: number;
  } | null {
    const char = this._characters.get(charId);
    if (!char) return null;

    let type = 'flat';
    let description = 'Character remains largely unchanged';

    if (char.growth >= 0.8) {
      type = 'transformational';
      description = 'Character undergoes profound transformation';
    } else if (char.growth >= 0.5) {
      type = 'growth';
      description = 'Character learns and grows through experience';
    } else if (char.growth >= 0.3) {
      type = 'developmental';
      description = 'Character shows some development';
    } else if (char.flaw) {
      type = 'tragic';
      description = 'Character undone by their flaw';
    }

    return { type, description, progress: char.growth };
  }

  toPacket(): DataPacket {
    return {
      id: `forge-${(++this._counter).toString(36)}-${Date.now().toString(36)}`,
      payload: {
        characters: Array.from(this._characters.values()).map(c => ({
          ...c,
          traits: Object.fromEntries(c.traits),
        })),
        relationships: Array.from(this._relationships.values()),
        traitPairs: Array.from(this._traitPairs.values()),
        totalCharacters: this._characters.size,
        totalRelationships: this._relationships.size,
      },
      metadata: {
        createdAt: Date.now(),
        route: ['dramaturgy', 'CharacterForge'],
        priority: Math.max(1, Math.floor(this._characters.size * 0.5)),
        phase: 'forging',
      },
    };
  }

  reset(): void {
    this._characters.clear();
    this._relationships.clear();
    this._traitPairs.clear();
    this._history = [];
    this._counter = 0;
  }

  get characterCount(): number {
    return this._characters.size;
  }

  get relationshipCount(): number {
    return this._relationships.size;
  }

  get history(): string[] {
    return [...this._history];
  }

  getCharacter(charId: string): Character | undefined {
    return this._characters.get(charId);
  }

  private _updateShadow(charId: string): void {
    const char = this._characters.get(charId);
    if (!char) return;
    const shadowTraits: string[] = [];
    for (const [trait, value] of char.traits) {
      if (value < 0.3) {
        shadowTraits.push(trait);
      }
    }
    if (char.flaw && !shadowTraits.includes(char.flaw)) {
      shadowTraits.push(char.flaw);
    }
    char.shadow = [...new Set([...char.shadow, ...shadowTraits])];
  }

  private _recordHistory(action: string): void {
    this._history.push(`${Date.now()}:${action}`);
  }
}
