import { DataPacket, PacketMeta } from '../shared/types';

/** A single stratigraphic layer. */
export interface Layer {
  id: string;
  name: string;
  age: number; // Ma (millions of years)
  thickness: number; // meters
  composition: string;
  fossils: string[];
  color: string;
  environment: string;
}

/** A stratigraphic column at a location. */
export interface StratColumn {
  location: string;
  latitude: number;
  longitude: number;
  layers: Layer[];
  totalThickness: number;
}

/** Type of unconformity. */
export type UnconformityType = 'disconformity' | 'angular' | 'nonconformity' | 'paraconformity';

/** An unconformity record. */
export interface Unconformity {
  type: UnconformityType;
  topLayer: string;
  bottomLayer: string;
  duration: number; // Ma of missing time
  description: string;
}

/** Geologic time scale entry. */
export interface GeologicTimeUnit {
  eon: string;
  era: string;
  period: string;
  epoch: string;
  start: number; // Ma
  end: number; // Ma
  description: string;
}

/** History record. */
interface StratigraphyRecord {
  operation: string;
  target: string;
  timestamp: number;
}

const GEOLOGIC_TIME_SCALE: GeologicTimeUnit[] = [
  { eon: 'Phanerozoic', era: 'Cenozoic', period: 'Quaternary', epoch: 'Holocene', start: 0.0117, end: 0, description: 'current interglacial' },
  { eon: 'Phanerozoic', era: 'Cenozoic', period: 'Quaternary', epoch: 'Pleistocene', start: 2.58, end: 0.0117, description: 'ice ages' },
  { eon: 'Phanerozoic', era: 'Cenozoic', period: 'Neogene', epoch: 'Pliocene', start: 5.33, end: 2.58, description: 'hominids appear' },
  { eon: 'Phanerozoic', era: 'Cenozoic', period: 'Neogene', epoch: 'Miocene', start: 23.0, end: 5.33, description: 'mammals diversify' },
  { eon: 'Phanerozoic', era: 'Cenozoic', period: 'Paleogene', epoch: 'Oligocene', start: 33.9, end: 23.0, description: 'grasslands spread' },
  { eon: 'Phanerozoic', era: 'Cenozoic', period: 'Paleogene', epoch: 'Eocene', start: 56.0, end: 33.9, description: 'early mammals' },
  { eon: 'Phanerozoic', era: 'Cenozoic', period: 'Paleogene', epoch: 'Paleocene', start: 66.0, end: 56.0, description: 'post-K-Pg recovery' },
  { eon: 'Phanerozoic', era: 'Mesozoic', period: 'Cretaceous', epoch: 'Late', start: 100.5, end: 66.0, description: 'dinosaurs peak' },
  { eon: 'Phanerozoic', era: 'Mesozoic', period: 'Cretaceous', epoch: 'Early', start: 145.0, end: 100.5, description: 'flowering plants' },
  { eon: 'Phanerozoic', era: 'Mesozoic', period: 'Jurassic', epoch: 'Late', start: 163.5, end: 145.0, description: 'birds appear' },
  { eon: 'Phanerozoic', era: 'Mesozoic', period: 'Jurassic', epoch: 'Middle', start: 174.1, end: 163.5, description: 'sauropods' },
  { eon: 'Phanerozoic', era: 'Mesozoic', period: 'Jurassic', epoch: 'Early', start: 201.3, end: 174.1, description: 'dinosaurs dominate' },
  { eon: 'Phanerozoic', era: 'Mesozoic', period: 'Triassic', epoch: 'Late', start: 237.0, end: 201.3, description: 'first dinosaurs' },
  { eon: 'Phanerozoic', era: 'Mesozoic', period: 'Triassic', epoch: 'Middle', start: 247.2, end: 237.0, description: 'mammals appear' },
  { eon: 'Phanerozoic', era: 'Mesozoic', period: 'Triassic', epoch: 'Early', start: 252.2, end: 247.2, description: 'post-Permian recovery' },
  { eon: 'Phanerozoic', era: 'Paleozoic', period: 'Permian', epoch: 'Lopingian', start: 259.8, end: 252.2, description: 'largest extinction' },
  { eon: 'Phanerozoic', era: 'Paleozoic', period: 'Permian', epoch: 'Guadalupian', start: 272.3, end: 259.8, description: 'Pangaea forms' },
  { eon: 'Phanerozoic', era: 'Paleozoic', period: 'Permian', epoch: 'Cisuralian', start: 298.9, end: 272.3, description: 'reptiles diversify' },
  { eon: 'Phanerozoic', era: 'Paleozoic', period: 'Carboniferous', epoch: 'Pennsylvanian', start: 323.2, end: 298.9, description: 'coal forests' },
  { eon: 'Phanerozoic', era: 'Paleozoic', period: 'Carboniferous', epoch: 'Mississippian', start: 358.9, end: 323.2, description: 'amphibians' },
  { eon: 'Phanerozoic', era: 'Paleozoic', period: 'Devonian', epoch: 'Late', start: 382.7, end: 358.9, description: 'fish age' },
  { eon: 'Phanerozoic', era: 'Paleozoic', period: 'Devonian', epoch: 'Middle', start: 393.3, end: 382.7, description: 'forests appear' },
  { eon: 'Phanerozoic', era: 'Paleozoic', period: 'Devonian', epoch: 'Early', start: 419.2, end: 393.3, description: 'jawed fish' },
  { eon: 'Phanerozoic', era: 'Paleozoic', period: 'Silurian', epoch: 'Ludlow', start: 427.4, end: 419.2, description: 'land plants' },
  { eon: 'Phanerozoic', era: 'Paleozoic', period: 'Silurian', epoch: 'Wenlock', start: 433.4, end: 427.4, description: 'first vascular plants' },
  { eon: 'Phanerozoic', era: 'Paleozoic', period: 'Silurian', epoch: 'Llandovery', start: 443.8, end: 433.4, description: 'post-Ordovician recovery' },
  { eon: 'Phanerozoic', era: 'Paleozoic', period: 'Ordovician', epoch: 'Late', start: 458.4, end: 443.8, description: 'mass extinction' },
  { eon: 'Phanerozoic', era: 'Paleozoic', period: 'Ordovician', epoch: 'Middle', start: 470.0, end: 458.4, description: 'invertebrates diversify' },
  { eon: 'Phanerozoic', era: 'Paleozoic', period: 'Ordovician', epoch: 'Early', start: 485.4, end: 470.0, description: 'trilobites' },
  { eon: 'Phanerozoic', era: 'Paleozoic', period: 'Cambrian', epoch: 'Furongian', start: 497.0, end: 485.4, description: 'late Cambrian' },
  { eon: 'Phanerozoic', era: 'Paleozoic', period: 'Cambrian', epoch: 'Series 3', start: 509.0, end: 497.0, description: 'trilobite peak' },
  { eon: 'Phanerozoic', era: 'Paleozoic', period: 'Cambrian', epoch: 'Series 2', start: 521.0, end: 509.0, description: 'archaeocyaths' },
  { eon: 'Phanerozoic', era: 'Paleozoic', period: 'Cambrian', epoch: 'Terreneuvian', start: 538.8, end: 521.0, description: 'Cambrian explosion' },
];

/** Radioactive isotope for radiometric dating. */
export interface Isotope {
  parent: string;
  daughter: string;
  halfLife: number; // years
  usefulRange: [number, number]; // years
}

const ISOTOPES: Isotope[] = [
  { parent: 'C-14', daughter: 'N-14', halfLife: 5730, usefulRange: [100, 50000] },
  { parent: 'K-40', daughter: 'Ar-40', halfLife: 1.248e9, usefulRange: [100000, 4.5e9] },
  { parent: 'U-238', daughter: 'Pb-206', halfLife: 4.468e9, usefulRange: [1e6, 4.5e9] },
  { parent: 'U-235', daughter: 'Pb-207', halfLife: 7.04e8, usefulRange: [1e6, 4.5e9] },
  { parent: 'Rb-87', daughter: 'Sr-87', halfLife: 4.88e10, usefulRange: [1e7, 4.5e9] },
  { parent: 'Sm-147', daughter: 'Nd-143', halfLife: 1.06e11, usefulRange: [1e8, 4.5e9] },
];

export class Stratigraphy {
  private _layers: Map<string, Layer> = new Map();
  private _columns: StratColumn[] = [];
  private _unconformities: Unconformity[] = [];
  private _history: StratigraphyRecord[] = [];

  constructor() {
    this._seedDefault();
  }

  addLayer(layer: Layer): void {
    this._layers.set(layer.id, layer);
    this._history.push({ operation: 'addLayer', target: layer.id, timestamp: Date.now() });
  }

  removeLayer(id: string): boolean {
    const existed = this._layers.delete(id);
    if (existed) {
      this._history.push({ operation: 'removeLayer', target: id, timestamp: Date.now() });
    }
    return existed;
  }

  getLayer(id: string): Layer | null {
    return this._layers.get(id) ?? null;
  }

  determineOrder(): Layer[] {
    return Array.from(this._layers.values()).sort((a, b) => b.age - a.age);
  }

  principleOfSuperposition(): string[] {
    const sorted = this.determineOrder();
    this._history.push({ operation: 'superposition', target: `${sorted.length} layers`, timestamp: Date.now() });
    return sorted.map(l => l.id);
  }

  principleOfOriginalHorizontality(): { layer: string; dip: number; isDisturbed: boolean }[] {
    const result: { layer: string; dip: number; isDisturbed: boolean }[] = [];
    for (const layer of this._layers.values()) {
      const dip = Math.random() * 30;
      result.push({ layer: layer.id, dip, isDisturbed: dip > 10 });
    }
    this._history.push({ operation: 'originalHorizontality', target: `${result.length} layers`, timestamp: Date.now() });
    return result;
  }

  principleOfCrossCutting(): { cutter: string; cut: string; relation: string }[] {
    const layers = Array.from(this._layers.values());
    const relations: { cutter: string; cut: string; relation: string }[] = [];
    for (let i = 0; i < layers.length; i++) {
      for (let j = i + 1; j < layers.length; j++) {
        if (layers[j].age < layers[i].age) {
          relations.push({ cutter: layers[j].id, cut: layers[i].id, relation: 'cross-cuts' });
        }
      }
    }
    return relations;
  }

  principleOfFaunalSuccession(): { fossil: string; firstAppearance: number; lastAppearance: number }[] {
    const fossilMap = new Map<string, { firstAppearance: number; lastAppearance: number }>();
    for (const layer of this._layers.values()) {
      for (const fossil of layer.fossils) {
        const existing = fossilMap.get(fossil);
        if (existing) {
          existing.firstAppearance = Math.min(existing.firstAppearance, layer.age);
          existing.lastAppearance = Math.max(existing.lastAppearance, layer.age);
        } else {
          fossilMap.set(fossil, { firstAppearance: layer.age, lastAppearance: layer.age });
        }
      }
    }
    return Array.from(fossilMap.entries()).map(([fossil, info]) => ({ fossil, ...info }));
  }

  unconformityDetect(): Unconformity[] {
    const sorted = this.determineOrder();
    const detected: Unconformity[] = [];
    for (let i = 0; i < sorted.length - 1; i++) {
      const older = sorted[i];
      const younger = sorted[i + 1];
      const gap = older.age - younger.age;
      if (gap > 5) {
        const type: UnconformityType = gap > 50 ? 'angular' : 'disconformity';
        detected.push({
          type,
          topLayer: younger.id,
          bottomLayer: older.id,
          duration: gap,
          description: `Gap of ${gap.toFixed(2)} Ma between ${older.name} and ${younger.name}`,
        });
      }
    }
    this._unconformities = detected;
    this._history.push({ operation: 'unconformityDetect', target: `${detected.length} found`, timestamp: Date.now() });
    return detected;
  }

  disconformity(top: Layer, bottom: Layer): Unconformity {
    return {
      type: 'disconformity',
      topLayer: top.id,
      bottomLayer: bottom.id,
      duration: bottom.age - top.age,
      description: 'parallel layers with erosional surface',
    };
  }

  angularUnconformity(top: Layer, bottom: Layer): Unconformity {
    return {
      type: 'angular',
      topLayer: top.id,
      bottomLayer: bottom.id,
      duration: bottom.age - top.age,
      description: 'tilted lower layers overlain by horizontal beds',
    };
  }

  nonconformity(top: Layer, bottom: Layer): Unconformity {
    return {
      type: 'nonconformity',
      topLayer: top.id,
      bottomLayer: bottom.id,
      duration: bottom.age - top.age,
      description: 'sedimentary over igneous/metamorphic',
    };
  }

  correlation(columns?: StratColumn[]): { fossil: string; columns: string[] }[] {
    const cols = columns ?? this._columns;
    const correlations: { fossil: string; columns: string[] }[] = [];
    const fossilColumns = new Map<string, string[]>();
    for (const col of cols) {
      for (const layer of col.layers) {
        for (const fossil of layer.fossils) {
          const arr = fossilColumns.get(fossil) ?? [];
          if (!arr.includes(col.location)) arr.push(col.location);
          fossilColumns.set(fossil, arr);
        }
      }
    }
    for (const [fossil, locs] of fossilColumns.entries()) {
      if (locs.length > 1) correlations.push({ fossil, columns: locs });
    }
    return correlations;
  }

  stratColumn(location: string, latitude: number, longitude: number): StratColumn {
    const layers = this.determineOrder();
    const totalThickness = layers.reduce((s, l) => s + l.thickness, 0);
    const column: StratColumn = { location, latitude, longitude, layers, totalThickness };
    this._columns.push(column);
    this._history.push({ operation: 'stratColumn', target: location, timestamp: Date.now() });
    return column;
  }

  geologicTimeScale(): GeologicTimeUnit[] {
    return [...GEOLOGIC_TIME_SCALE];
  }

  era(age: number): string {
    const unit = GEOLOGIC_TIME_SCALE.find(u => age >= u.end && age < u.start);
    return unit?.era ?? 'Precambrian';
  }

  period(age: number): string {
    const unit = GEOLOGIC_TIME_SCALE.find(u => age >= u.end && age < u.start);
    return unit?.period ?? 'Precambrian';
  }

  epoch(age: number): string {
    const unit = GEOLOGIC_TIME_SCALE.find(u => age >= u.end && age < u.start);
    return unit?.epoch ?? 'Precambrian';
  }

  radiometricDating(parent: string, daughterRatio: number, parentRatio: number): { age: number; isotope: Isotope | null } {
    const isotope = ISOTOPES.find(i => i.parent === parent);
    if (!isotope) return { age: 0, isotope: null };
    const ratio = daughterRatio / Math.max(1e-12, parentRatio);
    const age = isotope.halfLife * Math.log(1 + ratio) / Math.log(2);
    return { age, isotope };
  }

  toPacket(): DataPacket<{ layers: Map<string, Layer>; columns: StratColumn[]; unconformities: Unconformity[]; history: StratigraphyRecord[] }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['geology', 'Stratigraphy'],
      priority: 1,
      phase: 'stratigraphy',
    };
    return {
      id: `stratigraphy-${Date.now().toString(36)}`,
      payload: {
        layers: this._layers,
        columns: this._columns,
        unconformities: this._unconformities,
        history: this._history,
      },
      metadata,
    };
  }

  reset(): void {
    this._layers = new Map();
    this._columns = [];
    this._unconformities = [];
    this._history = [];
    this._seedDefault();
  }

  get layerCount(): number { return this._layers.size; }
  get columnCount(): number { return this._columns.length; }
  get unconformityCount(): number { return this._unconformities.length; }

  private _seedDefault(): void {
    const defaults: Layer[] = [
      { id: 'l1', name: 'Sandstone A', age: 50, thickness: 20, composition: 'quartz sandstone', fossils: [], color: 'tan', environment: 'fluvial' },
      { id: 'l2', name: 'Shale B', age: 100, thickness: 15, composition: 'mudstone', fossils: ['ammonite'], color: 'gray', environment: 'marine' },
      { id: 'l3', name: 'Limestone C', age: 200, thickness: 30, composition: 'calcite', fossils: ['brachiopod', 'trilobite'], color: 'white', environment: 'shallow marine' },
      { id: 'l4', name: 'Coal D', age: 320, thickness: 5, composition: 'carbon', fossils: ['plant fossil'], color: 'black', environment: 'swamp' },
      { id: 'l5', name: 'Granite E', age: 500, thickness: 100, composition: 'granite', fossils: [], color: 'pink', environment: 'igneous' },
    ];
    for (const l of defaults) this._layers.set(l.id, l);
  }
}
