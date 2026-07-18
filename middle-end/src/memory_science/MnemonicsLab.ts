import { DataPacket, Signal, KnowledgeUnit } from '../shared/types';

export interface Mnemonic {
  id: string;
  type: string;
  content: string;
  cue: string;
  effectiveness: number;
  uses: number;
  createdAt: number;
}

export interface MemoryPalace {
  id: string;
  name: string;
  locations: Array<{
    id: string;
    position: number;
    name: string;
    item: string | null;
    vividness: number;
  }>;
  size: number;
  mastery: number;
}

export interface PegSystem {
  id: string;
  basePegs: Array<{ number: number; peg: string; rhyme: string }>;
  type: 'rhyme' | 'shape' | 'alphabet';
  size: number;
  items: Map<number, string>;
}

export class MnemonicsLab {
  private _mnemonics: Map<string, Mnemonic> = new Map();
  private _palaces: Map<string, MemoryPalace> = new Map();
  private _pegSystems: Map<string, PegSystem> = new Map();
  private _memoryAthletes: Map<string, { name: string; score: number; events: string[] }> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  createMemoryPalace(name: string, locations: string[]): MemoryPalace {
    const id = `palace-${(++this._counter).toString(36)}-${Date.now().toString(36)}`;
    const palace: MemoryPalace = {
      id,
      name,
      locations: locations.map((loc, i) => ({
        id: `loc-${id}-${i}`,
        position: i,
        name: loc,
        item: null,
        vividness: 0.5 + Math.random() * 0.3,
      })),
      size: locations.length,
      mastery: 0.2,
    };
    this._palaces.set(id, palace);
    this._recordHistory(`createMemoryPalace:${name}:${locations.length}locs`);
    return palace;
  }

  placeInPalace(palaceId: string, position: number, item: string): MemoryPalace | null {
    const palace = this._palaces.get(palaceId);
    if (!palace || position < 0 || position >= palace.locations.length) return null;

    palace.locations[position].item = item;
    palace.locations[position].vividness = Math.min(1, palace.locations[position].vividness + 0.1);
    palace.mastery = this._calculatePalaceMastery(palace);

    this._recordHistory(`placeInPalace:${palaceId}:pos${position}`);
    return palace;
  }

  createPegSystem(basePegs: string[]): PegSystem {
    const id = `peg-${(++this._counter).toString(36)}`;
    const peg: PegSystem = {
      id,
      basePegs: basePegs.map((p, i) => ({ number: i + 1, peg: p, rhyme: `${i + 1} - ${p}` })),
      type: 'rhyme',
      size: basePegs.length,
      items: new Map(),
    };
    this._pegSystems.set(id, peg);
    this._recordHistory(`createPegSystem:${basePegs.length}pegs`);
    return peg;
  }

  methodOfLoci(items: string[], palaceId: string): MemoryPalace | null {
    const palace = this._palaces.get(palaceId);
    if (!palace) return null;

    const limit = Math.min(items.length, palace.locations.length);
    for (let i = 0; i < limit; i++) {
      palace.locations[i].item = items[i];
      palace.locations[i].vividness = Math.min(1, palace.locations[i].vividness + 0.15);
    }

    palace.mastery = this._calculatePalaceMastery(palace);

    const mnemonic: Mnemonic = {
      id: `mn-${(++this._counter).toString(36)}`,
      type: 'methodOfLoci',
      content: `Loci method with ${limit} items in ${palace.name}`,
      cue: palace.name,
      effectiveness: Math.min(1, 0.7 + limit * 0.02),
      uses: 1,
      createdAt: Date.now(),
    };
    this._mnemonics.set(mnemonic.id, mnemonic);

    this._recordHistory(`methodOfLoci:${palaceId}:${limit}items`);
    return palace;
  }

  keywordMethod(word: string, keyword: string): Mnemonic {
    const id = `mn-${(++this._counter).toString(36)}`;
    const mnemonic: Mnemonic = {
      id,
      type: 'keywordMethod',
      content: word,
      cue: keyword,
      effectiveness: 0.65,
      uses: 1,
      createdAt: Date.now(),
    };
    this._mnemonics.set(id, mnemonic);
    this._recordHistory(`keywordMethod:${word}`);
    return mnemonic;
  }

  majorSystem(number: string): Mnemonic {
    const consonants: Record<string, string[]> = {
      '0': ['s', 'z'],
      '1': ['t', 'd', 'th'],
      '2': ['n'],
      '3': ['m'],
      '4': ['r'],
      '5': ['l'],
      '6': ['j', 'ch', 'sh'],
      '7': ['k', 'g', 'ck'],
      '8': ['f', 'v'],
      '9': ['p', 'b'],
    };

    let encoded = '';
    for (const digit of number) {
      const consonant = consonants[digit];
      if (consonant) {
        encoded += consonant[0];
      }
    }

    const id = `mn-${(++this._counter).toString(36)}`;
    const mnemonic: Mnemonic = {
      id,
      type: 'majorSystem',
      content: number,
      cue: encoded,
      effectiveness: 0.7,
      uses: 1,
      createdAt: Date.now(),
    };
    this._mnemonics.set(id, mnemonic);
    this._recordHistory(`majorSystem:${number}`);
    return mnemonic;
  }

  memoryChampionship(round: number): { totalScore: number; events: string[] } {
    const events = [
      'speedNumbers',
      'speedCards',
      'binaryNumbers',
      'randomWords',
      'namesAndFaces',
      'historicDates',
    ];

    let totalScore = 0;
    const completed: string[] = [];

    for (let i = 0; i < Math.min(round, events.length); i++) {
      const score = Math.floor(Math.random() * 800) + 200;
      totalScore += score;
      completed.push(`${events[i]}:${score}`);
    }

    const athleteId = `athlete-${(++this._counter).toString(36)}`;
    this._memoryAthletes.set(athleteId, {
      name: `Athlete-${athleteId}`,
      score: totalScore,
      events: completed,
    });

    this._recordHistory(`memoryChampionship:round${round}:score${totalScore}`);
    return { totalScore, events: completed };
  }

  getPalace(palaceId: string): MemoryPalace | undefined {
    return this._palaces.get(palaceId);
  }

  recallFromPalace(palaceId: string): Array<{ position: number; item: string | null; vividness: number }> {
    const palace = this._palaces.get(palaceId);
    if (!palace) return [];

    return palace.locations.map(loc => ({
      position: loc.position,
      item: loc.item,
      vividness: loc.vividness,
    }));
  }

  palaceRecallAccuracy(palaceId: string): number {
    const palace = this._palaces.get(palaceId);
    if (!palace || palace.locations.length === 0) return 0;

    const filledLocations = palace.locations.filter(l => l.item !== null).length;
    return filledLocations / palace.locations.length;
  }

  addPegItem(pegSystemId: string, number: number, item: string): PegSystem | null {
    const peg = this._pegSystems.get(pegSystemId);
    if (!peg) return null;

    peg.items.set(number, item);
    this._recordHistory(`addPegItem:${pegSystemId}:${number}`);
    return peg;
  }

  recallFromPegSystem(pegSystemId: string): Array<{ number: number; peg: string; item: string | undefined }> {
    const peg = this._pegSystems.get(pegSystemId);
    if (!peg) return [];

    return peg.basePegs.map(p => ({
      number: p.number,
      peg: p.peg,
      item: peg.items.get(p.number),
    }));
  }

  mnemonicEffectiveness(): Record<string, { count: number; avgEffectiveness: number }> {
    const stats: Record<string, { count: number; total: number }> = {};

    for (const mnemonic of this._mnemonics.values()) {
      if (!stats[mnemonic.type]) {
        stats[mnemonic.type] = { count: 0, total: 0 };
      }
      stats[mnemonic.type].count++;
      stats[mnemonic.type].total += mnemonic.effectiveness;
    }

    const result: Record<string, { count: number; avgEffectiveness: number }> = {};
    for (const [type, s] of Object.entries(stats)) {
      result[type] = {
        count: s.count,
        avgEffectiveness: s.total / s.count,
      };
    }

    return result;
  }

  memoryPalaceMasteryRanking(): MemoryPalace[] {
    return Array.from(this._palaces.values())
      .sort((a, b) => b.mastery - a.mastery);
  }

  practicePalace(palaceId: string): MemoryPalace | null {
    const palace = this._palaces.get(palaceId);
    if (!palace) return null;

    palace.mastery = Math.min(1, palace.mastery + 0.05);
    for (const loc of palace.locations) {
      if (loc.item) {
        loc.vividness = Math.min(1, loc.vividness + 0.02);
      }
    }

    this._recordHistory(`practicePalace:${palaceId}`);
    return palace;
  }

  journeyMethod(locations: string[], items: string[]): {
    palace: MemoryPalace;
    placed: number;
  } {
    const palace = this.createMemoryPalace('Journey Palace', locations);
    const limit = Math.min(items.length, locations.length);

    for (let i = 0; i < limit; i++) {
      this.placeInPalace(palace.id, i, items[i]);
    }

    return { palace, placed: limit };
  }

  toPacket(): DataPacket {
    return {
      id: `mnemonics-${(++this._counter).toString(36)}-${Date.now().toString(36)}`,
      payload: {
        mnemonics: Array.from(this._mnemonics.values()),
        palaces: Array.from(this._palaces.values()),
        pegSystems: Array.from(this._pegSystems.values()).map(p => ({
          ...p,
          items: Object.fromEntries(p.items),
        })),
        memoryAthletes: Array.from(this._memoryAthletes.values()),
        totalPalaces: this._palaces.size,
        totalMnemonics: this._mnemonics.size,
      },
      metadata: {
        createdAt: Date.now(),
        route: ['memory_science', 'MnemonicsLab'],
        priority: Math.max(1, Math.floor(this._palaces.size * 0.5)),
        phase: 'memorizing',
      },
    };
  }

  reset(): void {
    this._mnemonics.clear();
    this._palaces.clear();
    this._pegSystems.clear();
    this._memoryAthletes.clear();
    this._history = [];
    this._counter = 0;
  }

  get palaceCount(): number {
    return this._palaces.size;
  }

  get mnemonicCount(): number {
    return this._mnemonics.size;
  }

  get history(): string[] {
    return [...this._history];
  }

  private _calculatePalaceMastery(palace: MemoryPalace): number {
    const filledLocations = palace.locations.filter(l => l.item !== null).length;
    const avgVividness = palace.locations.reduce((s, l) => s + l.vividness, 0) / palace.locations.length;
    const fillRatio = palace.size > 0 ? filledLocations / palace.size : 0;
    return Math.min(1, fillRatio * 0.6 + avgVividness * 0.4);
  }

  private _recordHistory(action: string): void {
    this._history.push(`${Date.now()}:${action}`);
  }
}
