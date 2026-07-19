/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 流体力学 —— 流与压强的几何
 * Fluid Mechanics: The Geometry of Flow and Pressure
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 从伯努利方程到纳维-斯托克斯方程，流体力学描绘了连续介质的运动。
 * 层流如丝绸，湍流如雷鸣；阿基米德的浮力与雷诺的判据共同编织了流体的世界。
 */

import { DataPacket } from '../shared/types';

/** 流体：密度、黏度与压强。 */
export interface Fluid {
  readonly density: number;
  readonly viscosity: number;
  readonly pressure: number;
}

/** 流动：速度、截面积与流量。 */
export interface FluidFlow {
  readonly velocity: number;
  readonly area: number;
  readonly rate: number;
}

/** 压强系统：作用力、面积与压强。 */
export interface PressureSystem {
  readonly force: number;
  readonly area: number;
  readonly pressure: number;
  readonly unit: string;
}

type FluidRecord = {
  readonly id: string;
  readonly fluid: Fluid;
  readonly timestamp: number;
};

type FlowRecord = {
  readonly id: string;
  readonly flow: FluidFlow;
  readonly timestamp: number;
};

/** 地球重力加速度 (m/s²)。 */
const G_EARTH = 9.80665;
/** 空气在 20°C 时的动力黏度近似值 (Pa·s)。 */
const MU_AIR = 1.81e-5;

export class FluidMechanics {
  private _fluids: Map<string, FluidRecord> = new Map();
  private _flows: Map<string, FlowRecord> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get fluidCount(): number { return this._fluids.size; }
  get flowCount(): number { return this._flows.size; }
  get history(): string[] { return [...this._history]; }

  /**
   * 压强与力：P = F / A
   * Pressure from force and area
   */
  public pressureForce(pressure: number, area: number): PressureSystem {
    if (area <= 0) throw new Error('Area must be positive');
    const force = pressure * area;
    const system: PressureSystem = { force, area, pressure, unit: 'Pa' };
    this._recordHistory(`pressureForce: P=${pressure}, A=${area} -> F=${force}`);
    return system;
  }

  /**
   * 浮力：F_b = ρ * V * g
   * Buoyant force
   */
  public buoyancy(density: number, volume: number, g: number = G_EARTH): number {
    if (density < 0 || volume < 0) throw new Error('Density and volume must be non-negative');
    const force = density * volume * g;
    this._recordHistory(`buoyancy: ρ=${density}, V=${volume}, g=${g} -> F_b=${force}`);
    return force;
  }

  /**
   * 连续性方程：A1*v1 = A2*v2
   * Continuity equation (incompressible)
   */
  public continuity(A1: number, v1: number, A2: number): FluidFlow {
    if (A1 <= 0 || A2 <= 0) throw new Error('Areas must be positive');
    const v2 = (A1 * v1) / A2;
    const rate = A1 * v1;
    const flow: FluidFlow = { velocity: v2, area: A2, rate };
    const id = this._generateId();
    this._flows.set(id, { id, flow, timestamp: Date.now() });
    this._recordHistory(`continuity: A1=${A1}, v1=${v1}, A2=${A2} -> v2=${v2}`);
    return flow;
  }

  /**
   * 伯努利方程：P + 0.5*ρ*v² + ρ*g*h = const
   * Bernoulli's equation (steady, incompressible, frictionless)
   */
  public bernoulli(
    P1: number, rho1: number, v1: number, h1: number,
    P2: number, rho2: number, v2: number, h2: number,
  ): { constant1: number; constant2: number; consistent: boolean } {
    if (rho1 <= 0 || rho2 <= 0) throw new Error('Densities must be positive');
    const constant1 = P1 + 0.5 * rho1 * v1 * v1 + rho1 * G_EARTH * h1;
    const constant2 = P2 + 0.5 * rho2 * v2 * v2 + rho2 * G_EARTH * h2;
    const consistent = Math.abs(constant1 - constant2) < 1e-6 * Math.max(1, Math.abs(constant1));
    this._registerFluid({
      density: rho1,
      viscosity: 0,
      pressure: P1,
    });
    this._registerFluid({
      density: rho2,
      viscosity: 0,
      pressure: P2,
    });
    this._recordHistory(
      `bernoulli: C1=${constant1}, C2=${constant2}, consistent=${consistent}`,
    );
    return { constant1, constant2, consistent };
  }

  /**
   * 帕斯卡原理：F2 = F1 * A2 / A1
   * Pascal's principle (hydraulic press)
   */
  public pascalPrinciple(F1: number, A1: number, A2: number): {
    F2: number;
    pressure: number;
  } {
    if (A1 <= 0) throw new Error('A1 must be positive');
    const pressure = F1 / A1;
    const F2 = pressure * A2;
    this._recordHistory(`pascalPrinciple: F1=${F1}, A1=${A1}, A2=${A2} -> F2=${F2}`);
    return { F2, pressure };
  }

  /**
   * 阿基米德原理：F_b = ρ_fluid * V * g
   * Archimedes' principle
   */
  public archimedesPrinciple(rhoFluid: number, volume: number, g: number = G_EARTH): {
    buoyantForce: number;
    displacedMass: number;
  } {
    if (rhoFluid < 0 || volume < 0) throw new Error('Density and volume must be non-negative');
    const displacedMass = rhoFluid * volume;
    const buoyantForce = displacedMass * g;
    this._recordHistory(
      `archimedesPrinciple: ρ=${rhoFluid}, V=${volume} -> F_b=${buoyantForce}`,
    );
    return { buoyantForce, displacedMass };
  }

  /**
   * 雷诺数：Re = ρ*v*L / μ
   * Reynolds number (laminar vs turbulent)
   */
  public reynoldsNumber(rho: number, v: number, L: number, mu: number): {
    reynolds: number;
    regime: 'laminar' | 'transitional' | 'turbulent';
  } {
    if (mu <= 0) throw new Error('Dynamic viscosity must be positive');
    const reynolds = (rho * v * L) / mu;
    let regime: 'laminar' | 'transitional' | 'turbulent';
    if (reynolds < 2300) regime = 'laminar';
    else if (reynolds < 4000) regime = 'transitional';
    else regime = 'turbulent';
    this._recordHistory(
      `reynoldsNumber: Re=${reynolds}, regime=${regime}`,
    );
    return { reynolds, regime };
  }

  /**
   * 马赫数：M = v / c
   * Mach number
   */
  public machNumber(v: number, c: number): {
    mach: number;
    regime: 'subsonic' | 'transonic' | 'supersonic' | 'hypersonic';
  } {
    if (c <= 0) throw new Error('Speed of sound must be positive');
    const mach = v / c;
    let regime: 'subsonic' | 'transonic' | 'supersonic' | 'hypersonic';
    if (mach < 0.8) regime = 'subsonic';
    else if (mach < 1.2) regime = 'transonic';
    else if (mach < 5) regime = 'supersonic';
    else regime = 'hypersonic';
    this._recordHistory(`machNumber: M=${mach}, regime=${regime}`);
    return { mach, regime };
  }

  /**
   * 斯托克斯定律：F = 6π * η * r * v
   * Stokes' Law (drag on a sphere in laminar flow)
   */
  public stokesLaw(radius: number, viscosity: number, velocity: number): {
    force: number;
    terminalVelocity: number;
  } {
    if (radius < 0 || viscosity < 0) {
      throw new Error('Radius and viscosity must be non-negative');
    }
    const force = 6 * Math.PI * viscosity * radius * velocity;
    // Terminal velocity assuming sphere of density ~1000 kg/m³ in fluid density ~1.2 kg/m³
    const deltaRho = 1000 - 1.2;
    const terminalVelocity =
      viscosity > 0 && radius > 0
        ? (2 * deltaRho * G_EARTH * radius * radius) / (9 * viscosity)
        : 0;
    this._recordHistory(`stokesLaw: r=${radius}, η=${viscosity}, v=${velocity} -> F=${force}`);
    return { force, terminalVelocity };
  }

  /**
   * 阻力：F_d = 0.5 * ρ * v² * Cd * A
   * Drag force
   */
  public dragForce(rho: number, v: number, Cd: number, A: number): number {
    if (rho < 0 || Cd < 0 || A < 0) {
      throw new Error('Density, Cd, and area must be non-negative');
    }
    const force = 0.5 * rho * v * v * Cd * A;
    this._recordHistory(`dragForce: ρ=${rho}, v=${v}, Cd=${Cd}, A=${A} -> F=${force}`);
    return force;
  }

  /**
   * 泊肃叶流动：Q = π * ΔP * r⁴ / (8 * η * L)
   * Poiseuille's law for laminar pipe flow
   */
  public poiseuilleFlow(deltaP: number, r: number, eta: number, L: number): number {
    if (r <= 0) throw new Error('Radius must be positive');
    if (eta <= 0) throw new Error('Viscosity must be positive');
    if (L <= 0) throw new Error('Length must be positive');
    const flow = (Math.PI * deltaP * Math.pow(r, 4)) / (8 * eta * L);
    this._recordHistory(`poiseuilleFlow: ΔP=${deltaP}, r=${r}, η=${eta}, L=${L} -> Q=${flow}`);
    return flow;
  }

  /**
   * 表面张力：F = γ * L
   * Surface tension force
   */
  public surfaceTension(gamma: number, length: number): {
    force: number;
    energy: number;
  } {
    if (gamma < 0 || length < 0) {
      throw new Error('Surface tension and length must be non-negative');
    }
    const force = gamma * length;
    const energy = gamma * length * length;
    this._recordHistory(`surfaceTension: γ=${gamma}, L=${length} -> F=${force}`);
    return { force, energy };
  }

  /**
   * 黏度反算：μ = ρ * v * L / Re
   * Viscosity from Reynolds number
   */
  public viscosity(rho: number, v: number, L: number, Re: number): number {
    if (Re === 0) throw new Error('Reynolds number must be non-zero');
    const mu = (rho * v * L) / Re;
    this._recordHistory(`viscosity: ρ=${rho}, v=${v}, L=${L}, Re=${Re} -> μ=${mu}`);
    return mu;
  }

  /**
   * 阻力系数估算（基于雷诺数）
   * Drag coefficient estimate based on Reynolds number
   */
  public dragCoefficient(Re: number): {
    cd: number;
    regime: 'Stokes' | 'Allen' | 'Newton';
  } {
    if (Re < 0) throw new Error('Reynolds number must be non-negative');
    let cd: number;
    let regime: 'Stokes' | 'Allen' | 'Newton';
    if (Re < 1) {
      cd = 24 / Math.max(Re, 1e-10);
      regime = 'Stokes';
    } else if (Re < 1000) {
      cd = (24 / Re) * (1 + 0.15 * Math.pow(Re, 0.687));
      regime = 'Allen';
    } else {
      cd = 0.44;
      regime = 'Newton';
    }
    this._recordHistory(`dragCoefficient: Re=${Re} -> Cd=${cd} (${regime})`);
    return { cd, regime };
  }

  /**
   * 转换为数据包
   * Serialize to DataPacket
   */
  public toPacket(): DataPacket<{
    fluids: number;
    flows: number;
    history: string[];
  }> {
    return {
      id: `fluid-${Date.now()}-${this._counter}`,
      payload: {
        fluids: this._fluids.size,
        flows: this._flows.size,
        history: [...this._history],
      },
      metadata: {
        createdAt: Date.now(),
        route: ['physics', 'fluid-mechanics'],
        priority: 0.78,
        phase: 'analysis',
      },
    };
  }

  /**
   * 重置状态
   * Reset internal state
   */
  public reset(): void {
    this._fluids.clear();
    this._flows.clear();
    this._history = [];
    this._counter = 0;
  }

  // ─── Private helpers ───

  private _generateId(): string {
    return `fm-${(++this._counter).toString(36)}-${Date.now().toString(36)}`;
  }

  private _registerFluid(fluid: Fluid): void {
    const id = this._generateId();
    this._fluids.set(id, { id, fluid, timestamp: Date.now() });
    if (this._fluids.size > 500) {
      const firstKey = this._fluids.keys().next().value;
      if (firstKey !== undefined) this._fluids.delete(firstKey);
    }
  }

  private _recordHistory(entry: string): void {
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
  }

  /** 暴露地球重力加速度。 */
  public static readonly G = G_EARTH;
  /** 暴露空气动力黏度近似。 */
  public static readonly MU_AIR = MU_AIR;
}
