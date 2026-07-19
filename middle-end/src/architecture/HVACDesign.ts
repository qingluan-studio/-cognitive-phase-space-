import { DataPacket, PacketMeta } from '../shared/types';

/** HVAC system type. */
export interface HVACSystem {
  readonly type: 'rooftop' | 'vrf' | 'chiller' | 'boiler' | 'furnace' | 'heatpump' | 'ahu' | 'fcu';
  readonly capacity: number;
  readonly efficiency: number;
  readonly fuel: 'electricity' | 'gas' | 'oil' | 'biomass' | 'district';
}

/** Duct descriptor. */
export interface Duct {
  readonly size: number;
  readonly airflow: number;
  readonly pressure: number;
  readonly material: 'galvanized' | 'aluminum' | 'fiberglass' | 'fabric';
  readonly shape: 'rectangular' | 'circular' | 'oval';
}

/** Thermal load descriptor. */
export interface ThermalLoad {
  readonly sensible: number;
  readonly latent: number;
  readonly total: number;
  readonly shf: number;
}

/** Thermal comfort assessment per ASHRAE 55. */
export interface ThermalComfort {
  readonly pmv: number;
  readonly ppd: number;
  readonly sensation: 'cold' | 'cool' | 'slightly_cool' | 'neutral' | 'slightly_warm' | 'warm' | 'hot';
  readonly acceptable: boolean;
}

/** Indoor air quality assessment. */
export interface IndoorAirQuality {
  readonly co2: number;
  readonly voc: number;
  readonly pm25: number;
  readonly ventilationRate: number;
  readonly category: 'excellent' | 'good' | 'moderate' | 'poor';
}

/** Air distribution result. */
export interface AirDistribution {
  readonly throw: number;
  readonly drop: number;
  readonly spread: number;
  readonly adpi: number;
  readonly noiseLevel: number;
}

export class HVACDesign {
  private _systems: Map<string, HVACSystem> = new Map();
  private _ducts: Map<string, Duct> = new Map();
  private _loads: ThermalLoad[] = [];
  private _comfort: ThermalComfort[] = [];
  private _iaqHistory: IndoorAirQuality[] = [];
  private _history: unknown[] = [];
  private _counter = 0;

  constructor() {
    this._seedSystems();
  }

  private _seedSystems(): void {
    const systems: HVACSystem[] = [
      { type: 'rooftop', capacity: 50, efficiency: 3.2, fuel: 'electricity' },
      { type: 'vrf', capacity: 100, efficiency: 4.0, fuel: 'electricity' },
      { type: 'chiller', capacity: 500, efficiency: 5.5, fuel: 'electricity' },
      { type: 'boiler', capacity: 200, efficiency: 0.92, fuel: 'gas' },
    ];
    for (const s of systems) {
      this._systems.set(`${s.type}-${++this._counter}`, s);
    }
  }

  heatingLoad(
    area: number,
    uValues: { area: number; u: number }[],
    designTemp: { indoor: number; outdoor: number },
    infiltration: number,
    ventilationRate: number
  ): ThermalLoad {
    let transmissionLoss = 0;
    for (const e of uValues) {
      transmissionLoss += e.area * e.u * (designTemp.indoor - designTemp.outdoor);
    }
    const infiltrationLoss = 0.33 * infiltration * area * (designTemp.indoor - designTemp.outdoor);
    const ventilationLoss = 0.33 * ventilationRate * area * (designTemp.indoor - designTemp.outdoor);
    const sensible = Math.max(0, transmissionLoss + infiltrationLoss + ventilationLoss);
    const latent = sensible * 0.15;
    const load: ThermalLoad = {
      sensible,
      latent,
      total: sensible + latent,
      shf: sensible / Math.max(1, sensible + latent),
    };
    this._loads.push(load);
    this._history.push({ op: 'heatingLoad', total: load.total });
    return load;
  }

  coolingLoad(
    area: number,
    occupants: number,
    lightingW: number,
    equipmentW: number,
    envelopeGain: number,
    solarGain: number,
    ventilationRate: number
  ): ThermalLoad {
    const peopleSensible = occupants * 70;
    const peopleLatent = occupants * 50;
    const lightingSensible = lightingW * 1.0;
    const equipmentSensible = equipmentW * 1.0;
    const envelope = envelopeGain * area;
    const solar = solarGain * area;
    const ventilationSensible = 0.33 * ventilationRate * area * 8;
    const ventilationLatent = 0.33 * ventilationRate * area * 5;
    const sensible = peopleSensible + lightingSensible + equipmentSensible + envelope + solar + ventilationSensible;
    const latent = peopleLatent + ventilationLatent;
    const load: ThermalLoad = {
      sensible,
      latent,
      total: sensible + latent,
      shf: sensible / Math.max(1, sensible + latent),
    };
    this._loads.push(load);
    this._history.push({ op: 'coolingLoad', total: load.total });
    return load;
  }

  ventilationRate(occupants: number, area: number, ceilingHeight: number): { cfm: number; lps: number; ach: number } {
    const peopleRate = occupants * 5;
    const areaRate = area * 0.06;
    const cfm = Math.max(peopleRate, areaRate);
    const lps = cfm * 0.472;
    const roomVolume = area * ceilingHeight;
    const ach = (cfm * 60) / Math.max(1, roomVolume * 35.3);
    this._history.push({ op: 'ventilationRate', cfm, ach });
    return { cfm, lps, ach };
  }

  ductSizing(airflow: number, velocity: number): Duct {
    const area = airflow / velocity / 3600;
    const diameter = Math.sqrt((4 * area) / Math.PI);
    const pressure = 0.5 * 1.2 * velocity * velocity * 0.01;
    const duct: Duct = {
      size: Math.round(diameter * 1000) / 1000,
      airflow,
      pressure: Math.round(pressure * 100) / 100,
      material: 'galvanized',
      shape: 'circular',
    };
    const id = `duct-${++this._counter}`;
    this._ducts.set(id, duct);
    this._history.push({ op: 'ductSizing', id, size: duct.size });
    return duct;
  }

  pipeSizing(flowRate: number, velocity: number): { diameter: number; pressure: number; reynolds: number } {
    const area = flowRate / velocity;
    const diameter = Math.sqrt((4 * area) / Math.PI);
    const reynolds = (1000 * velocity * diameter) / 0.001;
    const frictionFactor = reynolds > 4000 ? 0.316 / Math.pow(reynolds, 0.25) : 64 / Math.max(1, reynolds);
    const pressure = frictionFactor * (100 / diameter) * 0.5 * 1000 * velocity * velocity;
    this._history.push({ op: 'pipeSizing', diameter, reynolds });
    return { diameter: Math.round(diameter * 1000) / 1000, pressure: Math.round(pressure), reynolds: Math.round(reynolds) };
  }

  pumpHead(flowRate: number, pipeLength: number, fittingLoss: number): { head: number; power: number; npsH: number } {
    const frictionLoss = pipeLength * 0.02 * 0.5 * 1000 * Math.pow(flowRate / 0.05, 2);
    const staticHead = 10;
    const head = staticHead + frictionLoss + fittingLoss;
    const power = (1000 * 9.81 * flowRate * head) / (0.7 * 1000);
    this._history.push({ op: 'pumpHead', head, power });
    return { head: Math.round(head * 10) / 10, power: Math.round(power * 100) / 100, npsH: 3 };
  }

  cop(coolingCapacity: number, powerInput: number): number {
    const cop = coolingCapacity / powerInput;
    this._history.push({ op: 'cop', cop });
    return Math.round(cop * 100) / 100;
  }

  eer(coolingBtu: number, powerWh: number): number {
    const eer = coolingBtu / powerWh;
    this._history.push({ op: 'eer', eer });
    return Math.round(eer * 100) / 100;
  }

  seer(seasonalCoolingBtu: number, seasonalPowerWh: number): number {
    const seer = seasonalCoolingBtu / seasonalPowerWh;
    this._history.push({ op: 'seer', seer });
    return Math.round(seer * 100) / 100;
  }

  boilerEfficiency(fuelInput: number, heatOutput: number, stackLoss?: number, radiationLoss?: number): number {
    let efficiency = heatOutput / fuelInput;
    if (stackLoss !== undefined) efficiency -= stackLoss;
    if (radiationLoss !== undefined) efficiency -= radiationLoss;
    this._history.push({ op: 'boilerEfficiency', efficiency });
    return Math.round(efficiency * 10000) / 100;
  }

  chillerEfficiency(coolingCapacity: number, powerInput: number): { cop: number; kwPerTon: number } {
    const cop = coolingCapacity / powerInput;
    const kwPerTon = 3.517 / cop;
    this._history.push({ op: 'chillerEfficiency', cop, kwPerTon });
    return { cop: Math.round(cop * 100) / 100, kwPerTon: Math.round(kwPerTon * 100) / 100 };
  }

  airDistribution(supplyAirflow: number, supplyTemp: number, roomTemp: number, diffuserType: 'ceiling' | 'sidewall' | 'floor' | 'displacement'): AirDistribution {
    const deltaT = Math.abs(supplyTemp - roomTemp);
    const throwDist = Math.sqrt(supplyAirflow) * 3;
    const dropDist = deltaT > 8 ? throwDist * 0.4 : throwDist * 0.3;
    const spreadDist = throwDist * 0.7;
    let adpi = 0.85;
    if (diffuserType === 'displacement') adpi = 0.95;
    else if (diffuserType === 'ceiling') adpi = 0.88;
    else if (diffuserType === 'sidewall') adpi = 0.8;
    else adpi = 0.75;
    const noiseLevel = 25 + Math.log10(Math.max(1, supplyAirflow)) * 8;
    const result: AirDistribution = {
      throw: Math.round(throwDist * 100) / 100,
      drop: Math.round(dropDist * 100) / 100,
      spread: Math.round(spreadDist * 100) / 100,
      adpi: Math.round(adpi * 100) / 100,
      noiseLevel: Math.round(noiseLevel),
    };
    this._history.push({ op: 'airDistribution', diffuserType, adpi });
    return result;
  }

  thermalComfort(
    airTemp: number,
    meanRadiantTemp: number,
    airVelocity: number,
    relativeHumidity: number,
    metabolicRate: number,
    clothing: number
  ): ThermalComfort {
    const operativeTemp = (airTemp + meanRadiantTemp) / 2;
    const pmvRaw =
      0.303 * Math.exp(-0.036 * metabolicRate) +
      0.028 * metabolicRate -
      0.42 * (metabolicRate - 58.2) -
      0.000017 * metabolicRate * (5.7 - 0.07 * 30) -
      0.0014 * metabolicRate * (34 - airTemp) -
      3.96e-8 *
        Math.pow(operativeTemp + 273, 4) *
        (1 - 0.0167) +
      3.96e-8 *
        Math.pow(airTemp + 273, 4) -
      0.0173 * airVelocity * (3.6 - relativeHumidity * 0.01) -
      0.0014 * metabolicRate * (34 - airTemp) +
      0.014 * metabolicRate * (1 + 0.15 * airVelocity) * (operativeTemp - clothing - 28.8);
    const pmv = Math.max(-3, Math.min(3, Math.round(pmvRaw * 100) / 100));
    const ppd = Math.round((100 - 95 * Math.exp(-0.03353 * pmv ** 4 - 0.2179 * pmv ** 2)) * 100) / 100;
    let sensation: ThermalComfort['sensation'];
    if (pmv < -2.5) sensation = 'cold';
    else if (pmv < -1.5) sensation = 'cool';
    else if (pmv < -0.5) sensation = 'slightly_cool';
    else if (pmv < 0.5) sensation = 'neutral';
    else if (pmv < 1.5) sensation = 'slightly_warm';
    else if (pmv < 2.5) sensation = 'warm';
    else sensation = 'hot';
    const comfort: ThermalComfort = {
      pmv,
      ppd,
      sensation,
      acceptable: Math.abs(pmv) <= 0.5,
    };
    this._comfort.push(comfort);
    this._history.push({ op: 'thermalComfort', pmv, ppd });
    return comfort;
  }

  indoorAirQuality(co2: number, voc: number, pm25: number, ventilationRate: number): IndoorAirQuality {
    let category: IndoorAirQuality['category'];
    if (co2 < 600 && voc < 200 && pm25 < 10) category = 'excellent';
    else if (co2 < 800 && voc < 400 && pm25 < 15) category = 'good';
    else if (co2 < 1000 && voc < 800 && pm25 < 25) category = 'moderate';
    else category = 'poor';
    const iaq: IndoorAirQuality = { co2, voc, pm25, ventilationRate, category };
    this._iaqHistory.push(iaq);
    this._history.push({ op: 'indoorAirQuality', category });
    return iaq;
  }

  get systemCount(): number { return this._systems.size; }
  get ductCount(): number { return this._ducts.size; }
  get loadCount(): number { return this._loads.length; }
  get comfortCount(): number { return this._comfort.length; }

  toPacket(): DataPacket<{
    systems: Map<string, HVACSystem>;
    ducts: Map<string, Duct>;
    loads: ThermalLoad[];
    comfort: ThermalComfort[];
    iaq: IndoorAirQuality[];
    history: unknown[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['architecture', 'HVACDesign'],
      priority: 1,
      phase: 'hvac_design',
    };
    return {
      id: `hvac-${Date.now().toString(36)}`,
      payload: {
        systems: this._systems,
        ducts: this._ducts,
        loads: this._loads,
        comfort: this._comfort,
        iaq: this._iaqHistory,
        history: this._history,
      },
      metadata,
    };
  }

  reset(): void {
    this._systems = new Map();
    this._ducts = new Map();
    this._loads = [];
    this._comfort = [];
    this._iaqHistory = [];
    this._history = [];
    this._counter = 0;
    this._seedSystems();
  }
}
