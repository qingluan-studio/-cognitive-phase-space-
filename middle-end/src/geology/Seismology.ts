import { DataPacket, PacketMeta } from '../shared/types';

/** Type of seismic wave. */
export type WaveType = 'P' | 'S' | 'Love' | 'Rayleigh';

/** A seismic wave. */
export interface SeismicWave {
  id: string;
  type: WaveType;
  velocity: number; // km/s
  amplitude: number;
  frequency: number; // Hz
  arrivalTime: number; // s
}

/** Fault type. */
export type FaultTypeKind = 'normal' | 'reverse' | 'strike-slip' | 'oblique';

/** A geological fault. */
export interface Fault {
  id: string;
  name: string;
  type: FaultTypeKind;
  strike: number; // degrees
  dip: number; // degrees
  rake: number; // degrees
  length: number; // km
  slipRate: number; // mm/yr
}

/** An earthquake event. */
export interface Earthquake {
  id: string;
  magnitude: number;
  depth: number; // km
  latitude: number;
  longitude: number;
  time: number; // unix ms
  faultId: string | null;
  energy: number; // joules
  tsunami: boolean;
}

/** Mercalli intensity entry. */
export interface MercalliEntry {
  intensity: string;
  roman: string;
  description: string;
  effects: string;
}

/** History record. */
interface SeismologyRecord {
  operation: string;
  target: string;
  timestamp: number;
}

const MERCALLI_SCALE: MercalliEntry[] = [
  { intensity: 'I', roman: 'I', description: 'not felt', effects: 'none' },
  { intensity: 'II', roman: 'II', description: 'weak', effects: 'barely felt' },
  { intensity: 'III', roman: 'III', description: 'weak', effects: 'felt indoors' },
  { intensity: 'IV', roman: 'IV', description: 'light', effects: 'dishes rattle' },
  { intensity: 'V', roman: 'V', description: 'moderate', effects: 'objects fall' },
  { intensity: 'VI', roman: 'VI', description: 'strong', effects: 'slight damage' },
  { intensity: 'VII', roman: 'VII', description: 'very strong', effects: 'considerable damage' },
  { intensity: 'VIII', roman: 'VIII', description: 'severe', effects: 'partial collapse' },
  { intensity: 'IX', roman: 'IX', description: 'violent', effects: 'serious damage' },
  { intensity: 'X', roman: 'X', description: 'extreme', effects: 'most structures destroyed' },
  { intensity: 'XI', roman: 'XI', description: 'extreme', effects: 'few structures stand' },
  { intensity: 'XII', roman: 'XII', description: 'extreme', effects: 'total destruction' },
];

const FAULTS_DB: Fault[] = [
  { id: 'f1', name: 'San Andreas', type: 'strike-slip', strike: 320, dip: 90, rake: 180, length: 1200, slipRate: 33 },
  { id: 'f2', name: 'Anatolian', type: 'strike-slip', strike: 75, dip: 90, rake: 0, length: 1500, slipRate: 20 },
  { id: 'f3', name: 'Sumatra', type: 'reverse', strike: 325, dip: 15, rake: 90, length: 5000, slipRate: 50 },
  { id: 'f4', name: 'Basin and Range', type: 'normal', strike: 0, dip: 60, rake: -90, length: 800, slipRate: 1 },
  { id: 'f5', name: 'Japan Trench', type: 'reverse', strike: 200, dip: 10, rake: 90, length: 800, slipRate: 80 },
];

export class Seismology {
  private _earthquakes: Earthquake[] = [];
  private _waves: SeismicWave[] = [];
  private _faults: Map<string, Fault> = new Map();
  private _history: SeismologyRecord[] = [];

  constructor() {
    for (const f of FAULTS_DB) this._faults.set(f.id, f);
  }

  richterScale(amplitude: number, distance: number): number {
    // Richter local magnitude: ML = log10(A) + 1.11*log10(r) - 0.034*r ... simplified
    if (amplitude <= 0 || distance <= 0) return 0;
    return Math.log10(amplitude) + 1.11 * Math.log10(distance) - 2.09;
  }

  momentMagnitude(slip: number, area: number, rigidity: number = 3e10): number {
    // Mw = (2/3) * log10(M0) - 6.07, M0 = rigidity * slip * area (Nm)
    const M0 = rigidity * slip * area;
    if (M0 <= 0) return 0;
    return (2 / 3) * Math.log10(M0) - 6.07;
  }

  mercalliIntensity(magnitude: number, depth: number, distance: number): MercalliEntry {
    let intensityIdx = Math.round(magnitude - 1 - distance / 50 - depth / 30);
    intensityIdx = Math.max(0, Math.min(MERCALLI_SCALE.length - 1, intensityIdx));
    return MERCALLI_SCALE[intensityIdx];
  }

  mercalliTable(): MercalliEntry[] {
    return [...MERCALLI_SCALE];
  }

  pWave(depth: number, _distance: number): SeismicWave {
    // P-wave velocity ~ 6 km/s in crust, ~ 8 in mantle
    const velocity = depth < 35 ? 6.0 : 8.0;
    const wave: SeismicWave = {
      id: `pwave-${Date.now().toString(36)}`,
      type: 'P',
      velocity,
      amplitude: 1.0,
      frequency: 1.0,
      arrivalTime: depth / velocity,
    };
    this._waves.push(wave);
    return wave;
  }

  sWave(depth: number, _distance: number): SeismicWave {
    // S-wave velocity ~ 3.5 km/s in crust, ~ 4.5 in mantle
    const velocity = depth < 35 ? 3.5 : 4.5;
    const wave: SeismicWave = {
      id: `swave-${Date.now().toString(36)}`,
      type: 'S',
      velocity,
      amplitude: 1.5,
      frequency: 0.5,
      arrivalTime: depth / velocity,
    };
    this._waves.push(wave);
    return wave;
  }

  surfaceWave(distance: number): SeismicWave {
    // Surface waves ~ 3 km/s
    const velocity = 3.0;
    const wave: SeismicWave = {
      id: `surf-${Date.now().toString(36)}`,
      type: 'Rayleigh',
      velocity,
      amplitude: 5.0,
      frequency: 0.2,
      arrivalTime: distance / velocity,
    };
    this._waves.push(wave);
    return wave;
  }

  locateEpicenter(stations: { name: string; latitude: number; longitude: number; arrivalDiff: number }[]): { latitude: number; longitude: number } | null {
    if (stations.length < 3) return null;
    // Simplified centroid of stations weighted by inverse arrival time
    let lat = 0, lon = 0, totalWeight = 0;
    for (const s of stations) {
      const w = 1 / Math.max(0.1, s.arrivalDiff);
      lat += s.latitude * w;
      lon += s.longitude * w;
      totalWeight += w;
    }
    if (totalWeight === 0) return null;
    return { latitude: lat / totalWeight, longitude: lon / totalWeight };
  }

  travelTime(distance: number, depth: number, waveType: WaveType): number {
    const velocities: Record<WaveType, number> = {
      P: 6.0,
      S: 3.5,
      Love: 3.2,
      Rayleigh: 3.0,
    };
    const v = velocities[waveType];
    const d = Math.sqrt(distance * distance + depth * depth);
    return d / v;
  }

  faultType(fault: Fault): { type: FaultTypeKind; description: string; stressRegime: string } {
    const descriptions: Record<FaultTypeKind, string> = {
      normal: 'hanging wall down, extensional',
      reverse: 'hanging wall up, compressional',
      'strike-slip': 'lateral movement, shear',
      oblique: 'combination of dip-slip and strike-slip',
    };
    const stressRegimes: Record<FaultTypeKind, string> = {
      normal: 'tensional',
      reverse: 'compressional',
      'strike-slip': 'shear',
      oblique: 'mixed',
    };
    return {
      type: fault.type,
      description: descriptions[fault.type],
      stressRegime: stressRegimes[fault.type],
    };
  }

  stressDrop(slip: number, length: number): number {
    if (length <= 0) return 0;
    // Stress drop ~ 2 * G * slip / length, G = 30 GPa
    const G = 30e9;
    return (2 * G * slip) / length;
  }

  seismicRisk(latitude: number, longitude: number): { risk: 'low' | 'moderate' | 'high' | 'very high'; nearbyFaults: Fault[] } {
    const nearby: Fault[] = [];
    for (const fault of this._faults.values()) {
      // Simplified: all faults considered "nearby" with random probability
      if (Math.random() < 0.4) nearby.push(fault);
    }
    let risk: 'low' | 'moderate' | 'high' | 'very high' = 'low';
    if (nearby.length > 3) risk = 'very high';
    else if (nearby.length > 2) risk = 'high';
    else if (nearby.length > 0) risk = 'moderate';
    void latitude; void longitude;
    return { risk, nearbyFaults: nearby };
  }

  recurrenceInterval(slipRate: number, slipPerEvent: number): number {
    if (slipRate <= 0) return Infinity;
    // Years between events
    return (slipPerEvent * 1000) / slipRate;
  }

  tsunamiGenerate(earthquake: Earthquake): { generated: boolean; expectedHeight: number; travelTime: number } {
    let generated = false;
    let expectedHeight = 0;
    let travelTime = 0;
    if (earthquake.magnitude >= 7.0 && earthquake.depth < 50) {
      generated = true;
      expectedHeight = Math.pow(10, earthquake.magnitude - 7) * 2;
      travelTime = 3600 * 60 / Math.max(0.1, Math.sqrt(9.8 * 4000)); // simplified deep water
    }
    return { generated, expectedHeight, travelTime };
  }

  seismicWaves(): SeismicWave[] {
    return [...this._waves];
  }

  seismicTomography(stations: { lat: number; lon: number; velocity: number }[]): { averageVelocity: number; anomalyMap: { lat: number; lon: number; anomaly: number }[] } {
    if (stations.length === 0) return { averageVelocity: 0, anomalyMap: [] };
    const avg = stations.reduce((s, st) => s + st.velocity, 0) / stations.length;
    const anomalyMap = stations.map(s => ({ lat: s.lat, lon: s.lon, anomaly: s.velocity - avg }));
    return { averageVelocity: avg, anomalyMap };
  }

  reflectionSeismology(layers: { thickness: number; velocity: number }[]): { reflectionTime: number; coefficient: number }[] {
    const results: { reflectionTime: number; coefficient: number }[] = [];
    let cumulativeTime = 0;
    let prevImpedance = 0;
    for (const layer of layers) {
      const oneWayTime = layer.thickness / Math.max(0.1, layer.velocity);
      cumulativeTime += oneWayTime;
      const impedance = layer.velocity * 2.5; // density ~ 2.5 g/cm3
      const coefficient = prevImpedance === 0 ? 0 : (impedance - prevImpedance) / (impedance + prevImpedance);
      results.push({ reflectionTime: cumulativeTime * 2, coefficient });
      prevImpedance = impedance;
    }
    return results;
  }

  addEarthquake(eq: Earthquake): void {
    this._earthquakes.push(eq);
    this._history.push({ operation: 'addEarthquake', target: eq.id, timestamp: Date.now() });
  }

  getFault(id: string): Fault | null {
    return this._faults.get(id) ?? null;
  }

  toPacket(): DataPacket<{ earthquakes: Earthquake[]; waves: SeismicWave[]; faults: Map<string, Fault>; history: SeismologyRecord[] }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['geology', 'Seismology'],
      priority: 1,
      phase: 'seismology',
    };
    return {
      id: `seismology-${Date.now().toString(36)}`,
      payload: {
        earthquakes: this._earthquakes,
        waves: this._waves,
        faults: this._faults,
        history: this._history,
      },
      metadata,
    };
  }

  reset(): void {
    this._earthquakes = [];
    this._waves = [];
    this._faults = new Map();
    this._history = [];
    for (const f of FAULTS_DB) this._faults.set(f.id, f);
  }

  get earthquakeCount(): number { return this._earthquakes.length; }
  get waveCount(): number { return this._waves.length; }
  get faultCount(): number { return this._faults.size; }
}
