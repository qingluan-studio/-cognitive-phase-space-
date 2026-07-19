import { DataPacket, PacketMeta } from '../shared/types';

/** Plate type. */
export type PlateType = 'continental' | 'oceanic';

/** Tectonic plate. */
export interface Plate {
  id: string;
  name: string;
  type: PlateType;
  velocity: number;
  direction: number;
  area: number;
  boundaries: string[];
}

/** A plate boundary. */
export interface Boundary {
  id: string;
  type: 'divergent' | 'convergent' | 'transform';
  plates: [string, string];
  feature: string;
  length: number;
  seismicity: number;
}

/** Continental drift record. */
export interface ContinentalDrift {
  time: number;
  positions: Map<string, [number, number]>;
  reconstructedMap: string;
}

/** History record. */
interface TectonicRecord {
  operation: string;
  timestamp: number;
}

const MAJOR_PLATES: Plate[] = [
  { id: 'p1', name: 'Pacific Plate', type: 'oceanic', velocity: 7.5, direction: 280, area: 103e6, boundaries: [] },
  { id: 'p2', name: 'North American Plate', type: 'continental', velocity: 2.3, direction: 270, area: 75e6, boundaries: [] },
  { id: 'p3', name: 'Eurasian Plate', type: 'continental', velocity: 2.1, direction: 90, area: 67e6, boundaries: [] },
  { id: 'p4', name: 'African Plate', type: 'continental', velocity: 2.5, direction: 60, area: 60e6, boundaries: [] },
  { id: 'p5', name: 'Antarctic Plate', type: 'continental', velocity: 1.7, direction: 0, area: 60e6, boundaries: [] },
  { id: 'p6', name: 'Indo-Australian Plate', type: 'continental', velocity: 6.7, direction: 35, area: 58e6, boundaries: [] },
  { id: 'p7', name: 'South American Plate', type: 'continental', velocity: 3.2, direction: 280, area: 43e6, boundaries: [] },
  { id: 'p8', name: 'Nazca Plate', type: 'oceanic', velocity: 5.5, direction: 90, area: 15e6, boundaries: [] },
];

export class PlateTectonics {
  private _plates: Map<string, Plate> = new Map(MAJOR_PLATES.map(p => [p.id, p]));
  private _boundaries: Boundary[] = [];
  private _history: TectonicRecord[] = [];
  private _counter = 0;

  plateMotion(plate: Plate): { vx: number; vy: number; angularVelocity: number } {
    const rad = plate.direction * Math.PI / 180;
    return {
      vx: plate.velocity * Math.cos(rad),
      vy: plate.velocity * Math.sin(rad),
      angularVelocity: plate.velocity / 6371,
    };
  }

  divergentBoundary(p1: Plate, p2: Plate): Boundary {
    const boundary: Boundary = {
      id: `b-${++this._counter}`,
      type: 'divergent',
      plates: [p1.id, p2.id],
      feature: this._divergentFeature(p1, p2),
      length: Math.random() * 5000 + 1000,
      seismicity: 0.3,
    };
    this._boundaries.push(boundary);
    return boundary;
  }

  convergentBoundary(p1: Plate, p2: Plate): Boundary {
    const oceanic = p1.type === 'oceanic' ? p1 : (p2.type === 'oceanic' ? p2 : null);
    const boundary: Boundary = {
      id: `b-${++this._counter}`,
      type: 'convergent',
      plates: [p1.id, p2.id],
      feature: oceanic ? 'subduction zone' : 'mountain range',
      length: Math.random() * 4000 + 500,
      seismicity: 0.9,
    };
    this._boundaries.push(boundary);
    return boundary;
  }

  transformBoundary(p1: Plate, p2: Plate): Boundary {
    const boundary: Boundary = {
      id: `b-${++this._counter}`,
      type: 'transform',
      plates: [p1.id, p2.id],
      feature: 'transform fault',
      length: Math.random() * 2000 + 200,
      seismicity: 0.6,
    };
    this._boundaries.push(boundary);
    return boundary;
  }

  subductionZone(oceanic: Plate, continental: Plate): Boundary {
    const boundary: Boundary = {
      id: `b-${++this._counter}`,
      type: 'convergent',
      plates: [oceanic.id, continental.id],
      feature: 'oceanic trench + volcanic arc',
      length: Math.random() * 5000 + 1000,
      seismicity: 0.95,
    };
    this._boundaries.push(boundary);
    return boundary;
  }

  continentalCollision(p1: Plate, p2: Plate): Boundary {
    const boundary: Boundary = {
      id: `b-${++this._counter}`,
      type: 'convergent',
      plates: [p1.id, p2.id],
      feature: 'mountain belt (orogeny)',
      length: Math.random() * 3000 + 500,
      seismicity: 0.7,
    };
    this._boundaries.push(boundary);
    return boundary;
  }

  riftValley(plate: Plate): { name: string; width: number; depth: number; active: boolean } {
    return {
      name: `${plate.name} Rift Valley`,
      width: 30 + Math.random() * 60,
      depth: 1 + Math.random() * 4,
      active: true,
    };
  }

  seafloorSpreading(ridge: string, rate: number): { name: string; rate: number; magneticStripes: number; ageRange: number } {
    return {
      name: ridge,
      rate,
      magneticStripes: Math.floor(rate * 10),
      ageRange: rate * 100,
    };
  }

  mountainBuilding(collision: Boundary): { orogeny: string; height: number; age: number; processes: string[] } {
    return {
      orogeny: `${collision.feature} Orogeny`,
      height: 1000 + Math.random() * 7000,
      age: Math.random() * 300,
      processes: ['folding', 'faulting', 'metamorphism', 'igneous intrusion'],
    };
  }

  islandArc(subduction: Boundary): { name: string; volcanoes: number; depth: number } {
    return {
      name: 'Volcanic Island Arc',
      volcanoes: Math.floor(Math.random() * 20) + 5,
      depth: 100 + Math.random() * 200,
    };
  }

  hotSpot(chain: string, velocity: number): { name: string; ageProgression: number; volcanoes: number } {
    return {
      name: chain,
      ageProgression: velocity * 10,
      volcanoes: Math.floor(velocity * 5) + 3,
    };
  }

  mantleConvection(cell: { width: number; depth: number; temperature: number }): { velocity: number; viscosity: number; rayleigh: number } {
    return {
      velocity: 5 + cell.temperature * 0.001,
      viscosity: 1e21,
      rayleigh: cell.width * cell.depth * cell.temperature * 1e6,
    };
  }

  pangaeaReconstruction(time: number): ContinentalDrift {
    const positions = new Map<string, [number, number]>();
    for (const [id, plate] of this._plates) {
      const angle = time * 0.5;
      positions.set(id, [plate.velocity * Math.cos(angle), plate.velocity * Math.sin(angle)]);
    }
    return {
      time,
      positions,
      reconstructedMap: time === 200 ? 'Pangaea' : time === 150 ? 'Laurasia + Gondwana' : 'Present day',
    };
  }

  supercontinentCycle(): { stages: string[]; period: number } {
    return {
      stages: ['assembly', 'stability', 'rifting', 'dispersal'],
      period: 400,
    };
  }

  paleomagnetic(pole: [number, number], age: number): { latitude: number; longitude: number; inclination: number } {
    return {
      latitude: pole[0],
      longitude: pole[1],
      inclination: Math.atan(2 * Math.tan(pole[0] * Math.PI / 180)) * 180 / Math.PI - age * 0.01,
    };
  }

  magneticStripes(ridge: string): { width: number; polarityReversals: number; ageRange: number } {
    return {
      width: 1 + Math.random() * 30,
      polarityReversals: Math.floor(Math.random() * 100) + 50,
      ageRange: 0.78,
    };
  }

  toPacket(): DataPacket<{ plates: Map<string, Plate>; boundaries: Boundary[]; history: TectonicRecord[] }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['geology', 'PlateTectonics'],
      priority: 1,
      phase: 'plate_tectonics',
    };
    return {
      id: `plate-tectonics-${Date.now().toString(36)}`,
      payload: { plates: this._plates, boundaries: this._boundaries, history: this._history },
      metadata,
    };
  }

  reset(): void {
    this._plates = new Map(MAJOR_PLATES.map(p => [p.id, p]));
    this._boundaries = [];
    this._history = [];
    this._counter = 0;
  }

  get plateCount(): number { return this._plates.size; }
  get boundaryCount(): number { return this._boundaries.length; }

  private _divergentFeature(p1: Plate, p2: Plate): string {
    if (p1.type === 'oceanic' && p2.type === 'oceanic') return 'mid-ocean ridge';
    if (p1.type === 'continental' && p2.type === 'continental') return 'continental rift';
    return 'rift zone';
  }
}
