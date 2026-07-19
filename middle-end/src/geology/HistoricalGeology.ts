import { DataPacket, PacketMeta } from '../shared/types';

/** A geologic era entry. */
export interface GeologicEra {
  eon: string;
  era: string;
  start: number; // Ma
  end: number; // Ma
  dominantLife: string;
  atmosphericO2: number; // percent
  atmosphericCO2: number; // ppm
  averageTemp: number; // C relative to today
}

/** A mass extinction event. */
export interface ExtinctionEvent {
  name: string;
  age: number; // Ma
  severity: number; // percent species extinct
  causes: string[];
  affectedGroups: string[];
}

/** A fossil record. */
export interface FossilRecord {
  id: string;
  organism: string;
  taxon: string;
  firstAppearance: number; // Ma
  lastAppearance: number; // Ma
  habitat: string;
  isIndex: boolean;
}

/** Climate proxy record. */
export interface PaleoclimateProxy {
  age: number;
  temperature: number; // anomaly C
  co2: number;
  seaLevel: number; // m relative to today
}

/** History record. */
interface HistoricalGeologyRecord {
  operation: string;
  target: string;
  timestamp: number;
}

const GEOLOGIC_ERA_DB: GeologicEra[] = [
  { eon: 'Phanerozoic', era: 'Cenozoic', start: 66, end: 0, dominantLife: 'mammals', atmosphericO2: 21, atmosphericCO2: 280, averageTemp: 14 },
  { eon: 'Phanerozoic', era: 'Mesozoic', start: 252, end: 66, dominantLife: 'dinosaurs', atmosphericO2: 23, atmosphericCO2: 1800, averageTemp: 22 },
  { eon: 'Phanerozoic', era: 'Paleozoic', start: 538, end: 252, dominantLife: 'marine invertebrates, amphibians', atmosphericO2: 24, atmosphericCO2: 4200, averageTemp: 19 },
  { eon: 'Proterozoic', era: 'Neoproterozoic', start: 1000, end: 538, dominantLife: 'multicellular algae', atmosphericO2: 12, atmosphericCO2: 4000, averageTemp: 16 },
  { eon: 'Proterozoic', era: 'Mesoproterozoic', start: 1600, end: 1000, dominantLife: 'single-celled eukaryotes', atmosphericO2: 8, atmosphericCO2: 5000, averageTemp: 18 },
  { eon: 'Proterozoic', era: 'Paleoproterozoic', start: 2500, end: 1600, dominantLife: 'cyanobacteria', atmosphericO2: 4, atmosphericCO2: 6000, averageTemp: 20 },
  { eon: 'Archean', era: 'Neoarchean', start: 2800, end: 2500, dominantLife: 'anaerobic bacteria', atmosphericO2: 0.01, atmosphericCO2: 8000, averageTemp: 24 },
  { eon: 'Archean', era: 'Mesoarchean', start: 3200, end: 2800, dominantLife: 'thermophiles', atmosphericO2: 0.001, atmosphericCO2: 10000, averageTemp: 28 },
  { eon: 'Archean', era: 'Paleoarchean', start: 3600, end: 3200, dominantLife: 'chemoautotrophs', atmosphericO2: 0, atmosphericCO2: 12000, averageTemp: 32 },
  { eon: 'Hadean', era: 'Hadean', start: 4600, end: 4000, dominantLife: 'none', atmosphericO2: 0, atmosphericCO2: 15000, averageTemp: 80 },
];

const EXTINCTION_DB: ExtinctionEvent[] = [
  { name: 'Quaternary', age: 0.0117, severity: 30, causes: ['climate change', 'human hunting'], affectedGroups: ['megafauna'] },
  { name: 'Cretaceous-Paleogene (K-Pg)', age: 66, severity: 75, causes: ['asteroid impact', 'volcanism'], affectedGroups: ['non-avian dinosaurs', 'ammonites', 'plesiosaurs'] },
  { name: 'Triassic-Jurassic', age: 201, severity: 70, causes: ['volcanism', 'climate change'], affectedGroups: ['large amphibians', 'some reptiles'] },
  { name: 'Permian-Triassic (Great Dying)', age: 252, severity: 96, causes: ['volcanism (Siberian Traps)', 'methane release', 'anoxia'], affectedGroups: ['trilobites', 'tabulate corals', 'many marine taxa'] },
  { name: 'Late Devonian', age: 375, severity: 75, causes: ['anoxia', 'asteroid impact'], affectedGroups: ['placoderms', 'trilobites'] },
  { name: 'Ordovician-Silurian', age: 444, severity: 85, causes: ['glaciation', 'sea level drop'], affectedGroups: ['brachiopods', 'trilobites', 'graptolites'] },
  { name: 'Cambrian (Botomian)', age: 510, severity: 50, causes: ['anoxia'], affectedGroups: ['small shelly fauna'] },
];

const FOSSIL_RECORD_DB: FossilRecord[] = [
  { id: 'fr1', organism: 'Trilobite', taxon: 'Arthropoda', firstAppearance: 521, lastAppearance: 252, habitat: 'marine', isIndex: true },
  { id: 'fr2', organism: 'Ammonite', taxon: 'Mollusca', firstAppearance: 409, lastAppearance: 66, habitat: 'marine', isIndex: true },
  { id: 'fr3', organism: 'Graptolite', taxon: 'Hemichordata', firstAppearance: 510, lastAppearance: 320, habitat: 'marine', isIndex: true },
  { id: 'fr4', organism: 'Brachiopod', taxon: 'Brachiopoda', firstAppearance: 540, lastAppearance: 0, habitat: 'marine', isIndex: false },
  { id: 'fr5', organism: 'Foraminifera', taxon: 'Protista', firstAppearance: 540, lastAppearance: 0, habitat: 'marine', isIndex: true },
  { id: 'fr6', organism: 'Tyrannosaurus', taxon: 'Chordata', firstAppearance: 68, lastAppearance: 66, habitat: 'terrestrial', isIndex: false },
  { id: 'fr7', organism: 'Dunkleosteus', taxon: 'Chordata', firstAppearance: 382, lastAppearance: 358, habitat: 'marine', isIndex: false },
  { id: 'fr8', organism: 'Stromatolite', taxon: 'Bacteria', firstAppearance: 3500, lastAppearance: 0, habitat: 'marine', isIndex: false },
];

export class HistoricalGeology {
  private _eras: Map<string, GeologicEra> = new Map();
  private _extinctions: ExtinctionEvent[] = [];
  private _fossils: Map<string, FossilRecord> = new Map();
  private _paleoclimate: PaleoclimateProxy[] = [];
  private _history: HistoricalGeologyRecord[] = [];

  constructor() {
    this._seed();
  }

  geologicTimeScale(): GeologicEra[] {
    return [...GEOLOGIC_ERA_DB];
  }

  precambrian(): GeologicEra[] {
    return GEOLOGIC_ERA_DB.filter(e => e.eon !== 'Phanerozoic');
  }

  paleozoic(): GeologicEra[] {
    return GEOLOGIC_ERA_DB.filter(e => e.era === 'Paleozoic');
  }

  mesozoic(): GeologicEra[] {
    return GEOLOGIC_ERA_DB.filter(e => e.era === 'Mesozoic');
  }

  cenozoic(): GeologicEra[] {
    return GEOLOGIC_ERA_DB.filter(e => e.era === 'Cenozoic');
  }

  extinctionEvent(name: string): ExtinctionEvent | null {
    const event = this._extinctions.find(e => e.name.toLowerCase().includes(name.toLowerCase()));
    return event ?? null;
  }

  massExtinction(): ExtinctionEvent[] {
    return [...this._extinctions].sort((a, b) => b.severity - a.severity);
  }

  fossilRecord(organism: string): FossilRecord | null {
    return this._fossils.get(organism) ?? null;
  }

  indexFossil(age: number): FossilRecord[] {
    const indexes: FossilRecord[] = [];
    for (const fossil of this._fossils.values()) {
      if (fossil.isIndex && age >= fossil.lastAppearance && age <= fossil.firstAppearance) {
        indexes.push(fossil);
      }
    }
    return indexes;
  }

  paleoclimate(age: number): PaleoclimateProxy {
    // Simplified reconstruction based on era averages
    const era = GEOLOGIC_ERA_DB.find(e => age >= e.end && age < e.start);
    const proxy: PaleoclimateProxy = {
      age,
      temperature: era?.averageTemp ?? 15,
      co2: era?.atmosphericCO2 ?? 280,
      seaLevel: (era?.averageTemp ?? 15) * 5,
    };
    this._paleoclimate.push(proxy);
    return proxy;
  }

  iceAge(): { name: string; start: number; end: number; description: string }[] {
    return [
      { name: 'Quaternary Glaciation', start: 2.58, end: 0, description: 'Pleistocene ice ages, current interglacial' },
      { name: 'Karoo Ice Age', start: 360, end: 260, description: 'late Paleozoic, Gondwana glaciation' },
      { name: 'Andean-Saharan', start: 460, end: 430, description: 'Ordovician-Silurian glaciation' },
      { name: 'Cryogenian (Snowball Earth)', start: 720, end: 630, description: 'possible global glaciation' },
      { name: 'Huronian', start: 2400, end: 2100, description: 'Paleoproterozoic, first oxygen-related ice age' },
    ];
  }

  oxygenationEvent(): { name: string; age: number; description: string }[] {
    return [
      { name: 'Great Oxidation Event', age: 2400, description: 'cyanobacteria cause first atmospheric O2' },
      { name: 'Neoproterozoic Oxygenation', age: 800, description: 'second major rise in O2 enabling animals' },
      { name: 'Paleozoic Oxygenation', age: 400, description: 'land plant-driven O2 rise to >30%' },
    ];
  }

  cambrianExplosion(): { age: number; description: string; keyGroups: string[] } {
    return {
      age: 538.8,
      description: 'rapid diversification of metazoan life at the base of the Cambrian',
      keyGroups: ['trilobites', 'mollusks', 'brachiopods', 'echinoderms', 'chordates'],
    };
  }

  continentalReconstruction(age: number): { supercontinent: string; description: string } {
    if (age < 200) return { supercontinent: 'Pangea (breaking up)', description: 'rifting of Pangea forms Atlantic' };
    if (age < 300) return { supercontinent: 'Pangea', description: 'assembled supercontinent' };
    if (age < 400) return { supercontinent: 'Pangaea forming', description: 'collision of Laurasia and Gondwana' };
    if (age < 600) return { supercontinent: 'Gondwana + Laurentia', description: 'separate continents' };
    if (age < 1100) return { supercontinent: 'Rodinia', description: 'assembling' };
    if (age < 1500) return { supercontinent: 'Columbia/Nuna', description: 'early supercontinent' };
    return { supercontinent: 'Vaalbara / Ur', description: 'earliest proto-continents' };
  }

  paleogeography(age: number): { latitude: number; climate: string; seaLevel: number } {
    const era = GEOLOGIC_ERA_DB.find(e => age >= e.end && age < e.start);
    const climate = (era?.averageTemp ?? 15) > 20 ? 'tropical' : (era?.averageTemp ?? 15) > 10 ? 'temperate' : 'polar';
    const seaLevel = ((era?.averageTemp ?? 15) - 15) * 10;
    return {
      latitude: Math.random() * 90,
      climate,
      seaLevel,
    };
  }

  toPacket(): DataPacket<{ eras: Map<string, GeologicEra>; extinctions: ExtinctionEvent[]; fossils: Map<string, FossilRecord>; paleoclimate: PaleoclimateProxy[]; history: HistoricalGeologyRecord[] }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['geology', 'HistoricalGeology'],
      priority: 1,
      phase: 'historical_geology',
    };
    return {
      id: `historical-geology-${Date.now().toString(36)}`,
      payload: {
        eras: this._eras,
        extinctions: this._extinctions,
        fossils: this._fossils,
        paleoclimate: this._paleoclimate,
        history: this._history,
      },
      metadata,
    };
  }

  reset(): void {
    this._eras = new Map();
    this._extinctions = [];
    this._fossils = new Map();
    this._paleoclimate = [];
    this._history = [];
    this._seed();
  }

  get eraCount(): number { return this._eras.size; }
  get extinctionCount(): number { return this._extinctions.length; }
  get fossilCount(): number { return this._fossils.size; }
  get paleoclimateCount(): number { return this._paleoclimate.length; }

  private _seed(): void {
    for (const e of GEOLOGIC_ERA_DB) this._eras.set(`${e.eon}-${e.era}`, e);
    this._extinctions = [...EXTINCTION_DB];
    for (const f of FOSSIL_RECORD_DB) this._fossils.set(f.organism, f);
  }
}
