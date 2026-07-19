import { DataPacket, PacketMeta } from '../shared/types';

/** Light fixture descriptor. */
export interface LightFixture {
  readonly type: 'incandescent' | 'fluorescent' | 'led' | 'halogen' | 'hid' | 'induction';
  readonly lumens: number;
  readonly wattage: number;
  readonly colorTemperature: number;
  readonly cri: number;
  readonly lifespan: number;
  readonly dimmable: boolean;
}

/** Illuminance descriptor. */
export interface Illuminance {
  readonly level: number;
  readonly uniformity: number;
  readonly area: number;
  readonly target: number;
  readonly meets: boolean;
}

/** Lighting plan. */
export interface LightingPlan {
  readonly id: string;
  readonly space: string;
  readonly fixtures: string[];
  readonly totalLumens: number;
  readonly totalWattage: number;
  readonly averageLux: number;
  readonly uniformity: number;
  readonly powerDensity: number;
}

/** Glare assessment. */
export interface Glare {
  readonly ugr: number;
  readonly level: 'imperceptible' | 'perceptible' | 'acceptable' | 'unacceptable' | 'intolerable';
  readonly acceptable: boolean;
}

/** Color rendering assessment. */
export interface ColorRendering {
  readonly cri: number;
  readonly r9: number;
  readonly tm30: number;
  readonly fidelity: number;
  readonly gamut: number;
}

/** Daylight analysis. */
export interface DaylightAnalysis {
  readonly df: number;
  readonly da: number;
  readonly sda: number;
  readonly ase: number;
  readonly sufficient: boolean;
}

/** Lighting circuit descriptor. */
export interface LightingCircuit {
  readonly id: string;
  readonly fixtures: number;
  readonly totalLoad: number;
  readonly breaker: number;
  readonly voltage: number;
}

/** Lighting control strategy. */
export interface LightingControl {
  readonly strategy: 'occupancy' | 'daylight' | 'time' | 'dimming' | 'scene';
  readonly energySavings: number;
  readonly sensors: string[];
}

export class LightingDesign {
  private _fixtures: Map<string, LightFixture> = new Map();
  private _illuminance: Illuminance[] = [];
  private _plans: Map<string, LightingPlan> = new Map();
  private _circuits: Map<string, LightingCircuit> = new Map();
  private _glareHistory: Glare[] = [];
  private _daylightHistory: DaylightAnalysis[] = [];
  private _controlHistory: LightingControl[] = [];
  private _history: unknown[] = [];
  private _counter = 0;

  constructor() {
    this._seedFixtures();
  }

  private _seedFixtures(): void {
    const fixtures: LightFixture[] = [
      { type: 'led', lumens: 1600, wattage: 16, colorTemperature: 4000, cri: 90, lifespan: 50000, dimmable: true },
      { type: 'fluorescent', lumens: 2800, wattage: 32, colorTemperature: 3500, cri: 80, lifespan: 24000, dimmable: false },
      { type: 'halogen', lumens: 1200, wattage: 60, colorTemperature: 3000, cri: 100, lifespan: 3000, dimmable: true },
      { type: 'incandescent', lumens: 800, wattage: 60, colorTemperature: 2700, cri: 100, lifespan: 1500, dimmable: true },
      { type: 'hid', lumens: 30000, wattage: 400, colorTemperature: 5000, cri: 70, lifespan: 20000, dimmable: false },
    ];
    for (const f of fixtures) {
      this._fixtures.set(`${f.type}-${++this._counter}`, f);
    }
  }

  luminousFlux(wattage: number, type: 'incandescent' | 'fluorescent' | 'led' | 'halogen' | 'hid'): number {
    const efficacyMap: Record<string, number> = {
      incandescent: 13,
      fluorescent: 80,
      led: 100,
      halogen: 20,
      hid: 90,
    };
    const lumens = wattage * efficacyMap[type];
    this._history.push({ op: 'luminousFlux', type, lumens });
    return Math.round(lumens);
  }

  illuminance(fixtureId: string, count: number, area: number, target: number): Illuminance {
    const fixture = this._fixtures.get(fixtureId);
    const lumens = fixture ? fixture.lumens * count : 1600 * count;
    const cu = 0.6;
    const llf = 0.85;
    const avgLux = (lumens * cu * llf) / Math.max(1, area);
    const uniformity = 0.7;
    const illum: Illuminance = {
      level: Math.round(avgLux),
      uniformity: Math.round(uniformity * 100) / 100,
      area,
      target,
      meets: avgLux >= target,
    };
    this._illuminance.push(illum);
    this._history.push({ op: 'illuminance', level: avgLux });
    return illum;
  }

  luxLevel(space: 'office' | 'classroom' | 'corridor' | 'warehouse' | 'parking' | 'lobby'): number {
    const map: Record<string, number> = {
      office: 500,
      classroom: 300,
      corridor: 100,
      warehouse: 200,
      parking: 50,
      lobby: 200,
    };
    return map[space];
  }

  colorTemperature(application: 'residential' | 'office' | 'retail' | 'industrial' | 'outdoor' | 'healthcare'): number {
    const map: Record<string, number> = {
      residential: 2700,
      office: 4000,
      retail: 3500,
      industrial: 5000,
      outdoor: 4000,
      healthcare: 4000,
    };
    return map[application];
  }

  colorRendering(fixtureId: string): ColorRendering {
    const fixture = this._fixtures.get(fixtureId);
    const cri = fixture ? fixture.cri : 80;
    const r9 = cri > 90 ? 80 : cri > 80 ? 50 : 20;
    const tm30 = Math.round(cri * 1.02);
    const result: ColorRendering = {
      cri,
      r9,
      tm30,
      fidelity: Math.round(tm30 * 0.95),
      gamut: Math.round(tm30 * 0.92),
    };
    this._history.push({ op: 'colorRendering', fixtureId, cri });
    return result;
  }

  daylightFactor(windowArea: number, floorArea: number, orientation: 'north' | 'south' | 'east' | 'west'): DaylightAnalysis {
    const windowFloorRatio = windowArea / Math.max(1, floorArea);
    const orientationFactor: Record<string, number> = { north: 0.6, south: 1.0, east: 0.8, west: 0.8 };
    const df = windowFloorRatio * 8 * orientationFactor[orientation];
    const da = Math.min(1, df / 2);
    const sda = df > 2 ? 0.65 : df > 1 ? 0.4 : 0.15;
    const ase = df > 5 ? 0.15 : df > 3 ? 0.05 : 0;
    const analysis: DaylightAnalysis = {
      df: Math.round(df * 100) / 100,
      da: Math.round(da * 100) / 100,
      sda: Math.round(sda * 100) / 100,
      ase: Math.round(ase * 100) / 100,
      sufficient: df >= 2,
    };
    this._daylightHistory.push(analysis);
    this._history.push({ op: 'daylightFactor', df });
    return analysis;
  }

  lightingLoad(fixtures: { wattage: number; count: number }[]): { totalW: number; totalKw: number; density: number; area: number } {
    let totalW = 0;
    for (const f of fixtures) totalW += f.wattage * f.count;
    const area = fixtures.reduce((s, f) => s + f.count * 5, 0);
    this._history.push({ op: 'lightingLoad', totalW });
    return {
      totalW,
      totalKw: totalW / 1000,
      density: totalW / Math.max(1, area),
      area,
    };
  }

  lightingCircuit(fixtures: { wattage: number; count: number }[], voltage: number = 220): LightingCircuit {
    const totalLoad = fixtures.reduce((s, f) => s + f.wattage * f.count, 0);
    const current = totalLoad / voltage;
    const breaker = Math.ceil(current / 5) * 5 * 1.25;
    const id = `circuit-${++this._counter}`;
    const circuit: LightingCircuit = {
      id,
      fixtures: fixtures.reduce((s, f) => s + f.count, 0),
      totalLoad,
      breaker: Math.ceil(breaker),
      voltage,
    };
    this._circuits.set(id, circuit);
    this._history.push({ op: 'lightingCircuit', id, breaker });
    return circuit;
  }

  emergencyLighting(area: number, occupantLoad: number): { fixtures: number; lumens: number; duration: number; batteryCapacity: number } {
    const fixtures = Math.ceil(area / 50);
    const lumens = fixtures * 800;
    const duration = 90;
    const batteryCapacity = (lumens * duration * 1.5) / (12 * 0.85);
    this._history.push({ op: 'emergencyLighting', fixtures });
    return { fixtures, lumens, duration, batteryCapacity: Math.round(batteryCapacity) };
  }

  accentLighting(target: 'artwork' | 'retail' | 'feature' | 'landscape', beamAngle: number, intensity: number): { beamType: string; coverage: number; contrast: number } {
    const map: Record<string, string> = {
      artwork: 'narrow flood',
      retail: 'spot',
      feature: 'narrow spot',
      landscape: 'wide flood',
    };
    const coverage = Math.PI * Math.pow(Math.tan((beamAngle * Math.PI) / 360) * 3, 2);
    const contrast = Math.min(20, intensity / 50);
    this._history.push({ op: 'accentLighting', target });
    return { beamType: map[target], coverage: Math.round(coverage * 100) / 100, contrast: Math.round(contrast * 100) / 100 };
  }

  taskLighting(task: 'reading' | 'computer' | 'drafting' | 'inspection' | 'surgery'): { lux: number; cri: number; glare: string } {
    const map: Record<string, { lux: number; cri: number; glare: string }> = {
      reading: { lux: 500, cri: 80, glare: 'low' },
      computer: { lux: 300, cri: 80, glare: 'controlled' },
      drafting: { lux: 1000, cri: 90, glare: 'low' },
      inspection: { lux: 2000, cri: 95, glare: 'low' },
      surgery: { lux: 40000, cri: 95, glare: 'controlled' },
    };
    this._history.push({ op: 'taskLighting', task });
    return map[task];
  }

  ambientLighting(space: 'living' | 'office' | 'warehouse' | 'corridor' | 'lobby', area: number): { lux: number; fixtures: number; wattage: number } {
    const luxMap: Record<string, number> = {
      living: 150,
      office: 500,
      warehouse: 200,
      corridor: 100,
      lobby: 200,
    };
    const lux = luxMap[space];
    const lumens = lux * area;
    const fixtures = Math.ceil(lumens / 1600);
    const wattage = fixtures * 16;
    this._history.push({ op: 'ambientLighting', space, fixtures });
    return { lux, fixtures, wattage };
  }

  glare(backgroundLuminance: number, sourceLuminance: number, sourceAngle: number, positionIndex: number): Glare {
    const ugrRaw = 8 * Math.log10((0.25 * sourceLuminance * sourceLuminance * Math.pow(sourceAngle, 2)) / (Math.pow(backgroundLuminance, 2) * Math.pow(positionIndex, 2)));
    const ugr = Math.max(10, Math.min(31, Math.round(ugrRaw * 10) / 10));
    let level: Glare['level'];
    if (ugr < 10) level = 'imperceptible';
    else if (ugr < 13) level = 'perceptible';
    else if (ugr < 19) level = 'acceptable';
    else if (ugr < 25) level = 'unacceptable';
    else level = 'intolerable';
    const glare: Glare = {
      ugr,
      level,
      acceptable: ugr < 19,
    };
    this._glareHistory.push(glare);
    this._history.push({ op: 'glare', ugr });
    return glare;
  }

  lightingControl(strategy: 'occupancy' | 'daylight' | 'time' | 'dimming' | 'scene', baselineW: number): LightingControl {
    const savingsMap: Record<string, number> = {
      occupancy: 0.3,
      daylight: 0.4,
      time: 0.2,
      dimming: 0.25,
      scene: 0.15,
    };
    const sensorsMap: Record<string, string[]> = {
      occupancy: ['PIR', 'ultrasonic'],
      daylight: ['photocell'],
      time: ['astronomical clock'],
      dimming: ['0-10V', 'DALI'],
      scene: ['DALI', 'DMX'],
    };
    const control: LightingControl = {
      strategy,
      energySavings: Math.round(savingsMap[strategy] * baselineW),
      sensors: sensorsMap[strategy],
    };
    this._controlHistory.push(control);
    this._history.push({ op: 'lightingControl', strategy });
    return control;
  }

  get fixtureCount(): number { return this._fixtures.size; }
  get illuminanceCount(): number { return this._illuminance.length; }
  get planCount(): number { return this._plans.size; }
  get circuitCount(): number { return this._circuits.size; }

  toPacket(): DataPacket<{
    fixtures: Map<string, LightFixture>;
    illuminance: Illuminance[];
    plans: Map<string, LightingPlan>;
    circuits: Map<string, LightingCircuit>;
    glare: Glare[];
    daylight: DaylightAnalysis[];
    controls: LightingControl[];
    history: unknown[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['architecture', 'LightingDesign'],
      priority: 1,
      phase: 'lighting_design',
    };
    return {
      id: `light-${Date.now().toString(36)}`,
      payload: {
        fixtures: this._fixtures,
        illuminance: this._illuminance,
        plans: this._plans,
        circuits: this._circuits,
        glare: this._glareHistory,
        daylight: this._daylightHistory,
        controls: this._controlHistory,
        history: this._history,
      },
      metadata,
    };
  }

  reset(): void {
    this._fixtures = new Map();
    this._illuminance = [];
    this._plans = new Map();
    this._circuits = new Map();
    this._glareHistory = [];
    this._daylightHistory = [];
    this._controlHistory = [];
    this._history = [];
    this._counter = 0;
    this._seedFixtures();
  }
}
