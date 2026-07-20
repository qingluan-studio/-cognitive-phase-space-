/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 流体力学 —— 流与压强的几何
 * Fluid Mechanics: The Geometry of Flow and Pressure
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 从伯努利方程到纳维-斯托克斯方程，流体力学描绘了连续介质的运动。
 * 层流如丝绸，湍流如雷鸣；阿基米德的浮力与雷诺的判据共同编织了流体的世界。
 *
 * 覆盖范围：
 *  - 静止流体：压强、浮力、帕斯卡原理、阿基米德原理
 *  - 流体运动学：连续性方程、流线、流函数
 *  - 伯努利方程、托里拆利定理、文丘里效应
 *  - 纳维-斯托克斯方程（简化）、雷诺应力
 *  - 雷诺数、马赫数、弗劳德数、韦伯数、欧拉数
 *  - 层流/湍流、过渡区
 *  - 管道流动：泊肃叶流动、Hagen-Poiseuille、达西-韦斯巴赫
 *  - 边界层：布拉修斯、摩擦系数
 *  - 阻力与升力：斯托克斯定律、阻力系数、升力系数
 *  - 表面张力、毛细现象、接触角
 *  - 可压缩流动：激波、马赫角、Prandtl-Meyer 膨胀
 *  - 势流：源、汇、偶极子、绕柱流动
 *  - 涡量与环量：开尔文定理、库塔-儒科夫斯基
 *  - 流体波：表面重力波、声波
 *  - 量纲分析：白金汉 π 定理
 *  - 渗流：达西定律
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

/** 无量纲数描述符。 */
export interface DimensionlessNumber {
  readonly name: string;
  readonly symbol: string;
  readonly value: number;
  readonly meaning: string;
}

/** 流动状态分类。 */
export interface FlowRegime {
  readonly reynolds: number;
  readonly mach: number;
  readonly froude: number;
  readonly regime: string;
  readonly compressible: boolean;
}

/** 边界层描述。 */
export interface BoundaryLayer {
  readonly thickness: number;
  readonly displacementThickness: number;
  readonly momentumThickness: number;
  readonly skinFriction: number;
}

/** 势流源/汇描述。 */
export interface SourceSink {
  readonly strength: number;
  readonly position: [number, number];
  readonly type: 'source' | 'sink' | 'vortex' | 'doublet';
}

/** 流体波描述。 */
export interface FluidWave {
  readonly waveSpeed: number;
  readonly wavelength: number;
  readonly frequency: number;
  readonly dispersion: boolean;
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
/** 水在 20°C 时的密度 (kg/m³)。 */
const RHO_WATER = 998.2071;
/** 水在 20°C 时的动力黏度 (Pa·s)。 */
const MU_WATER = 1.002e-3;
/** 水在 20°C 时的表面张力 (N/m)。 */
const GAMMA_WATER = 0.0728;
/** 水在 20°C 时的体积模量 (Pa)。 */
const BULK_WATER = 2.2e9;
/** 标准大气压 (Pa)。 */
const P_ATM = 101325;

export class FluidMechanics {
  private _fluids: Map<string, FluidRecord> = new Map();
  private _flows: Map<string, FlowRecord> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get fluidCount(): number { return this._fluids.size; }
  get flowCount(): number { return this._flows.size; }
  get history(): string[] { return [...this._history]; }

  // ─── 静止流体 ───

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
   * 静水压强：P = ρ g h
   * Hydrostatic pressure
   */
  public hydrostaticPressure(density: number, depth: number, g: number = G_EARTH): number {
    if (density < 0 || depth < 0) throw new Error('Density and depth must be non-negative');
    const p = density * g * depth;
    this._recordHistory(`hydrostaticPressure: ρ=${density}, h=${depth} -> P=${p}`);
    return p;
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
   * 浮力稳定性判定（密度比）
   */
  public floatStability(rhoObject: number, rhoFluid: number): {
    floats: boolean;
    submergedFraction: number;
  } {
    if (rhoFluid <= 0) throw new Error('Fluid density must be positive');
    const floats = rhoObject < rhoFluid;
    const submergedFraction = Math.min(1, rhoObject / rhoFluid);
    this._recordHistory(`floatStability: floats=${floats}, f=${submergedFraction}`);
    return { floats, submergedFraction };
  }

  // ─── 流体运动学 ───

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
   * 可压缩连续性方程：ρ1 A1 v1 = ρ2 A2 v2
   * Compressible continuity equation
   */
  public compressibleContinuity(
    rho1: number, A1: number, v1: number,
    rho2: number, A2: number,
  ): { v2: number; massFlow: number } {
    if (rho1 <= 0 || A1 <= 0 || A2 <= 0) {
      throw new Error('Densities and areas must be positive');
    }
    const massFlow = rho1 * A1 * v1;
    const v2 = massFlow / (rho2 * A2);
    this._recordHistory(`compressibleContinuity: ṁ=${massFlow}, v2=${v2}`);
    return { v2, massFlow };
  }

  /**
   * 流函数：ψ = ∫ v·n ds
   * Stream function (simplified)
   */
  public streamFunction(velocity: number, distance: number): number {
    return velocity * distance;
  }

  // ─── 伯努利方程及其应用 ───

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
   * 托里拆利定理：v = √(2gh)
   * Torricelli's law (efflux from a tank)
   */
  public torricelli(height: number, g: number = G_EARTH): {
    velocity: number;
    flowRate: number;
  } {
    if (height < 0) throw new Error('Height must be non-negative');
    const velocity = Math.sqrt(2 * g * height);
    const flowRate = velocity; // 单位面积
    this._recordHistory(`torricelli: h=${height} -> v=${velocity}`);
    return { velocity, flowRate };
  }

  /**
   * 文丘里效应：管道收缩处压强降低
   * Venturi effect
   */
  public venturiEffect(
    A1: number, v1: number, P1: number, A2: number, rho: number,
  ): { v2: number; P2: number; pressureDrop: number } {
    if (A1 <= 0 || A2 <= 0 || rho <= 0) {
      throw new Error('Areas and density must be positive');
    }
    const v2 = (A1 * v1) / A2;
    const P2 = P1 + 0.5 * rho * (v1 * v1 - v2 * v2);
    const pressureDrop = P1 - P2;
    this._recordHistory(`venturiEffect: ΔP=${pressureDrop}`);
    return { v2, P2, pressureDrop };
  }

  /**
   * 皮托管测速：v = √(2(P_total - P_static)/ρ)
   * Pitot tube airspeed
   */
  public pitotTube(
    totalPressure: number,
    staticPressure: number,
    density: number,
  ): { velocity: number; dynamicPressure: number } {
    if (density <= 0) throw new Error('Density must be positive');
    const dynamicPressure = totalPressure - staticPressure;
    const velocity = Math.sqrt((2 * dynamicPressure) / density);
    this._recordHistory(`pitotTube: v=${velocity}`);
    return { velocity, dynamicPressure };
  }

  // ─── 无量纲数 ───

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
   * 弗劳德数：Fr = v / √(gL)
   * Froude number (free surface flow)
   */
  public froudeNumber(v: number, L: number, g: number = G_EARTH): {
    froude: number;
    regime: 'subcritical' | 'critical' | 'supercritical';
  } {
    if (L <= 0) throw new Error('Length must be positive');
    const froude = v / Math.sqrt(g * L);
    let regime: 'subcritical' | 'critical' | 'supercritical';
    if (froude < 1) regime = 'subcritical';
    else if (froude === 1) regime = 'critical';
    else regime = 'supercritical';
    this._recordHistory(`froudeNumber: Fr=${froude}, regime=${regime}`);
    return { froude, regime };
  }

  /**
   * 韦伯数：We = ρ v² L / σ
   * Weber number (surface tension vs inertia)
   */
  public weberNumber(rho: number, v: number, L: number, sigma: number): number {
    if (sigma <= 0) throw new Error('Surface tension must be positive');
    const we = (rho * v * v * L) / sigma;
    this._recordHistory(`weberNumber: We=${we}`);
    return we;
  }

  /**
   * 欧拉数：Eu = ΔP / (ρ v²)
   * Euler number (pressure vs inertia)
   */
  public eulerNumber(deltaP: number, rho: number, v: number): number {
    if (rho <= 0) throw new Error('Density must be positive');
    const eu = deltaP / (rho * v * v);
    this._recordHistory(`eulerNumber: Eu=${eu}`);
    return eu;
  }

  /**
   * 普朗特数：Pr = μ c_p / k
   * Prandtl number
   */
  public prandtlNumber(mu: number, cp: number, k: number): number {
    if (k <= 0) throw new Error('Thermal conductivity must be positive');
    const pr = (mu * cp) / k;
    this._recordHistory(`prandtlNumber: Pr=${pr}`);
    return pr;
  }

  /**
   * 综合流动状态分析
   */
  public flowAnalysis(
    rho: number, v: number, L: number, mu: number, c: number, sigma: number,
  ): FlowRegime {
    const reynolds = (rho * v * L) / mu;
    const mach = v / c;
    const froude = v / Math.sqrt(G_EARTH * L);
    void sigma;
    let regime: string;
    if (reynolds < 2300) regime = 'laminar';
    else if (reynolds < 4000) regime = 'transitional';
    else regime = 'turbulent';
    if (mach > 0.3) regime += ', compressible';
    const compressible = mach > 0.3;
    this._recordHistory(`flowAnalysis: Re=${reynolds}, M=${mach}, Fr=${froude}`);
    return { reynolds, mach, froude, regime, compressible };
  }

  // ─── 管道流动 ───

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
   * 升力：L = 0.5 * ρ * v² * Cl * A
   * Lift force
   */
  public liftForce(rho: number, v: number, Cl: number, A: number): number {
    if (rho < 0 || Cl < 0 || A < 0) {
      throw new Error('Density, Cl, and area must be non-negative');
    }
    const force = 0.5 * rho * v * v * Cl * A;
    this._recordHistory(`liftForce: ρ=${rho}, v=${v}, Cl=${Cl}, A=${A} -> L=${force}`);
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
   * 管道流速分布（层流）：v(r) = v_max (1 - r²/R²)
   * Laminar pipe velocity profile
   */
  public laminarPipeProfile(rMax: number, r: number, vMax: number): number {
    if (rMax === 0) throw new Error('Max radius must be non-zero');
    const v = vMax * (1 - (r * r) / (rMax * rMax));
    this._recordHistory(`laminarPipeProfile: v(r)=${v}`);
    return v;
  }

  /**
   * 达西-韦斯巴赫方程：ΔP = f (L/D) (ρ v² / 2)
   * Darcy-Weisbach equation
   */
  public darcyWeisbach(
    frictionFactor: number,
    L: number,
    D: number,
    rho: number,
    v: number,
  ): { pressureDrop: number; headLoss: number } {
    if (D <= 0 || rho <= 0) throw new Error('D and ρ must be positive');
    const pressureDrop = frictionFactor * (L / D) * (rho * v * v) / 2;
    const headLoss = pressureDrop / (rho * G_EARTH);
    this._recordHistory(`darcyWeisbach: ΔP=${pressureDrop}, h_f=${headLoss}`);
    return { pressureDrop, headLoss };
  }

  /**
   * 摩擦系数（Colebrook 方程近似，简化）
   * Friction factor (simplified)
   */
  public frictionFactor(Re: number, roughness: number = 0): {
    f: number;
    flowType: 'laminar' | 'turbulent' | 'transitional';
  } {
    if (Re <= 0) throw new Error('Reynolds number must be positive');
    if (Re < 2300) {
      return { f: 64 / Re, flowType: 'laminar' };
    }
    // Swamee-Jain 近似（湍流）
    const f = 0.25 / Math.pow(Math.log(roughness / 3.7 + 5.74 / Math.pow(Re, 0.9)), 2);
    let flowType: 'laminar' | 'turbulent' | 'transitional';
    if (Re < 4000) flowType = 'transitional';
    else flowType = 'turbulent';
    this._recordHistory(`frictionFactor: Re=${Re}, f=${f}, ${flowType}`);
    return { f, flowType };
  }

  // ─── 表面张力与毛细现象 ───

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
   * 毛细高度：h = 2γ cos(θ) / (ρ g r)
   * Capillary rise
   */
  public capillaryRise(
    gamma: number,
    contactAngle: number,
    density: number,
    radius: number,
    g: number = G_EARTH,
  ): number {
    if (density <= 0 || radius <= 0) {
      throw new Error('Density and radius must be positive');
    }
    const h = (2 * gamma * Math.cos(contactAngle)) / (density * g * radius);
    this._recordHistory(`capillaryRise: h=${h}`);
    return h;
  }

  /**
   * 拉普拉斯压强（弯曲液面）：ΔP = γ (1/R1 + 1/R2)
   * Laplace pressure across curved surface
   */
  public laplacePressure(
    gamma: number,
    R1: number,
    R2: number = R1,
  ): number {
    if (R1 === 0 || R2 === 0) throw new Error('Radii must be non-zero');
    const dP = gamma * (1 / R1 + 1 / R2);
    this._recordHistory(`laplacePressure: ΔP=${dP}`);
    return dP;
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
   * 运动黏度：ν = μ / ρ
   * Kinematic viscosity
   */
  public kinematicViscosity(dynamicViscosity: number, density: number): number {
    if (density <= 0) throw new Error('Density must be positive');
    const nu = dynamicViscosity / density;
    this._recordHistory(`kinematicViscosity: ν=${nu}`);
    return nu;
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

  // ─── 边界层 ───

  /**
   * 边界层厚度（层流，布拉修斯解）：δ ≈ 5x/√Re_x
   * Boundary layer thickness (Blasius)
   */
  public blasiusBoundaryLayer(
    x: number,
    U: number,
    nu: number,
  ): BoundaryLayer {
    if (x <= 0 || U <= 0 || nu <= 0) {
      throw new Error('Parameters must be positive');
    }
    const ReX = (U * x) / nu;
    const sqrtRe = Math.sqrt(ReX);
    const thickness = (5 * x) / sqrtRe;
    const displacementThickness = thickness / 3;
    const momentumThickness = thickness / 7.5;
    const skinFriction = 0.664 / sqrtRe;
    this._recordHistory(`blasiusBoundaryLayer: δ=${thickness}, Cf=${skinFriction}`);
    return { thickness, displacementThickness, momentumThickness, skinFriction };
  }

  /**
   * 湍流边界层（1/7 次方律）：δ ≈ 0.37 x / Re_x^(1/5)
   * Turbulent boundary layer
   */
  public turbulentBoundaryLayer(
    x: number,
    U: number,
    nu: number,
  ): BoundaryLayer {
    if (x <= 0 || U <= 0 || nu <= 0) {
      throw new Error('Parameters must be positive');
    }
    const ReX = (U * x) / nu;
    const thickness = (0.37 * x) / Math.pow(ReX, 0.2);
    const displacementThickness = thickness / 8;
    const momentumThickness = thickness / 72;
    const skinFriction = 0.0592 / Math.pow(ReX, 0.2);
    this._recordHistory(`turbulentBoundaryLayer: δ=${thickness}`);
    return { thickness, displacementThickness, momentumThickness, skinFriction };
  }

  // ─── 可压缩流动 ───

  /**
   * 声速（在流体中）：c = √(K/ρ) = √(γRT)
   * Speed of sound in a fluid
   */
  public speedOfSound(bulkModulus: number, density: number): number {
    if (bulkModulus <= 0 || density <= 0) {
      throw new Error('Bulk modulus and density must be positive');
    }
    const c = Math.sqrt(bulkModulus / density);
    this._recordHistory(`speedOfSound: c=${c}`);
    return c;
  }

  /**
   * 马赫角：sin(μ) = 1/M
   * Mach angle (shock cone)
   */
  public machAngle(mach: number): { angle: number; possible: boolean } {
    if (mach <= 0) throw new Error('Mach number must be positive');
    if (mach < 1) {
      this._recordHistory(`machAngle: subsonic, no shock cone`);
      return { angle: NaN, possible: false };
    }
    const angle = Math.asin(1 / mach);
    this._recordHistory(`machAngle: M=${mach} -> μ=${angle}`);
    return { angle, possible: true };
  }

  /**
   * 等熵流动关系（理想气体）：T_0/T = 1 + (γ-1)/2 * M²
   * Isentropic flow relations
   */
  public isentropicFlow(
    mach: number,
    gamma: number = 1.4,
    T: number = 300,
    P: number = 101325,
    rho: number = 1.225,
  ): { T0: number; P0: number; rho0: number } {
    const factor = 1 + ((gamma - 1) / 2) * mach * mach;
    const T0 = T * factor;
    const P0 = P * Math.pow(factor, gamma / (gamma - 1));
    const rho0 = rho * Math.pow(factor, 1 / (gamma - 1));
    this._recordHistory(`isentropicFlow: M=${mach} -> T0=${T0}, P0=${P0}`);
    return { T0, P0, rho0 };
  }

  /**
   * 正激波前后关系（Rankine-Hugoniot）
   * Normal shock relations
   */
  public normalShock(
    M1: number,
    gamma: number = 1.4,
  ): { M2: number; pressureRatio: number; temperatureRatio: number; densityRatio: number } {
    if (M1 <= 1) throw new Error('Upstream Mach must be > 1 for shock');
    const M2sq = (1 + ((gamma - 1) / 2) * M1 * M1) / (gamma * M1 * M1 - (gamma - 1) / 2);
    const M2 = Math.sqrt(M2sq);
    const pressureRatio = 1 + (2 * gamma / (gamma + 1)) * (M1 * M1 - 1);
    const densityRatio = ((gamma + 1) * M1 * M1) / ((gamma - 1) * M1 * M1 + 2);
    const temperatureRatio = pressureRatio / densityRatio;
    this._recordHistory(`normalShock: M1=${M1} -> M2=${M2}, P2/P1=${pressureRatio}`);
    return { M2, pressureRatio, temperatureRatio, densityRatio };
  }

  // ─── 势流 ───

  /**
   * 势流：源/汇的流函数
   * Potential flow source/sink
   */
  public potentialFlowSource(
    strength: number,
    r: number,
  ): { velocity: number; streamFunction: number } {
    if (r <= 0) throw new Error('r must be positive');
    const velocity = strength / (2 * Math.PI * r);
    const streamFunction = (strength / (2 * Math.PI)) * Math.log(r);
    this._recordHistory(`potentialFlowSource: v_r=${velocity}`);
    return { velocity, streamFunction };
  }

  /**
   * 势流：自由涡
   * Free vortex
   */
  public freeVortex(
    circulation: number,
    r: number,
  ): { velocity: number; streamFunction: number } {
    if (r <= 0) throw new Error('r must be positive');
    const velocity = circulation / (2 * Math.PI * r);
    const streamFunction = (circulation / (2 * Math.PI)) * Math.log(r);
    this._recordHistory(`freeVortex: v_θ=${velocity}`);
    return { velocity, streamFunction };
  }

  /**
   * 势流：绕圆柱流动（无环量）
   * Flow around cylinder (no circulation)
   */
  public flowAroundCylinder(
    U: number,
    R: number,
    r: number,
    theta: number,
  ): { v_r: number; v_theta: number } {
    if (R <= 0 || r < R) throw new Error('Invalid r and R');
    const v_r = U * (1 - R * R / (r * r)) * Math.cos(theta);
    const v_theta = -U * (1 + R * R / (r * r)) * Math.sin(theta);
    this._recordHistory(`flowAroundCylinder: v_r=${v_r}, v_θ=${v_theta}`);
    return { v_r, v_theta };
  }

  /**
   * 库塔-儒科夫斯基升力定理：L = ρ v Γ
   * Kutta-Joukowski lift theorem
   */
  public kuttaJoukowskiLift(
    rho: number,
    v: number,
    circulation: number,
  ): number {
    if (rho <= 0) throw new Error('Density must be positive');
    const L = rho * v * circulation;
    this._recordHistory(`kuttaJoukowskiLift: L=${L}`);
    return L;
  }

  /**
   * 开尔文环量定理：环量沿流体元素守恒
   * Kelvin's circulation theorem (formal)
   */
  public kelvinCirculation(
    initialCirculation: number,
    finalCirculation: number,
  ): { conserved: boolean; change: number } {
    const change = finalCirculation - initialCirculation;
    const conserved = Math.abs(change) < 1e-9;
    this._recordHistory(`kelvinCirculation: conserved=${conserved}`);
    return { conserved, change };
  }

  // ─── 流体波 ───

  /**
   * 深水表面重力波：c = √(gλ/(2π))
   * Deep water gravity wave
   */
  public deepWaterWave(wavelength: number, g: number = G_EARTH): FluidWave {
    if (wavelength <= 0) throw new Error('Wavelength must be positive');
    const k = (2 * Math.PI) / wavelength;
    const omega = Math.sqrt(g * k);
    const waveSpeed = omega / k;
    const frequency = omega / (2 * Math.PI);
    this._recordHistory(`deepWaterWave: λ=${wavelength}, c=${waveSpeed}`);
    return {
      waveSpeed,
      wavelength,
      frequency,
      dispersion: true,
    };
  }

  /**
   * 浅水波：c = √(gh)
   * Shallow water wave
   */
  public shallowWaterWave(depth: number, g: number = G_EARTH): FluidWave {
    if (depth <= 0) throw new Error('Depth must be positive');
    const waveSpeed = Math.sqrt(g * depth);
    this._recordHistory(`shallowWaterWave: h=${depth}, c=${waveSpeed}`);
    return {
      waveSpeed,
      wavelength: 0,
      frequency: 0,
      dispersion: false,
    };
  }

  // ─── 渗流 ───

  /**
   * 达西定律：Q = -k A (ΔP/ΔL) / μ
   * Darcy's law for porous media flow
   */
  public darcyLaw(
    permeability: number,
    area: number,
    deltaP: number,
    deltaL: number,
    viscosity: number,
  ): { flowRate: number; velocity: number } {
    if (deltaL <= 0 || viscosity <= 0 || area <= 0) {
      throw new Error('Parameters must be positive');
    }
    const flowRate = (permeability * area * deltaP) / (viscosity * deltaL);
    const velocity = flowRate / area;
    this._recordHistory(`darcyLaw: Q=${flowRate}`);
    return { flowRate, velocity };
  }

  // ─── 量纲分析 ───

  /**
   * 白金汉 π 定理（简化）
   * Buckingham π theorem (number of dimensionless groups)
   */
  public buckinghamPi(numVariables: number, numDimensions: number): number {
    if (numVariables < numDimensions) {
      throw new Error('Variables must be at least as many as dimensions');
    }
    const piGroups = numVariables - numDimensions;
    this._recordHistory(`buckinghamPi: ${piGroups} π groups`);
    return piGroups;
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
  /** 暴露水密度近似。 */
  public static readonly RHO_WATER = RHO_WATER;
  /** 暴露水黏度近似。 */
  public static readonly MU_WATER = MU_WATER;
  /** 暴露水表面张力近似。 */
  public static readonly GAMMA_WATER = GAMMA_WATER;
  /** 暴露标准大气压。 */
  public static readonly P_ATM = P_ATM;
}
