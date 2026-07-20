/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 相对论 —— 时空的弯曲与折叠
 * Relativity: The Bending and Folding of Spacetime
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 从洛伦兹变换到爱因斯坦场方程，相对论重写了时空的几何。
 * 时间膨胀、长度收缩、质能等价——皆是光速恒定所结出的奇异果实。
 *
 * 覆盖范围：
 *  - 狭义相对论：洛伦兹变换、时间膨胀、长度收缩、相对论质量
 *  - 相对论动量与能量、质能等价 E=mc²
 *  - 相对论速度合成、快度、托勒密的极限
 *  - 多普勒效应（相对论）、光行差
 *  - 四维矢量与不变量、四维动量、不变质量
 *  - 闵可夫斯基时空、度规张量、时空间隔
 *  - 张量分析（简化）、协变与逆变
 *  - 广义相对论：等效原理、爱因斯坦场方程
 *  - 引力时间膨胀、引力红移
 *  - 史瓦西解、黑洞、视界、奇点
 *  - 测地线方程、轨道进动（水星近日点）
 *  - 光线弯曲、引力透镜
 *  - 引力波（简化）
 *  - 宇宙学：FLRW 度规、哈勃定律、红移、临界密度
 *  - 相对论喷流、同步辐射
 *  - 双生子佯谬、车库佯谬
 *  - 协变电动力学（形式）
 */

import { DataPacket } from '../shared/types';

/** 参考系：速度、时间与长度。 */
export interface FrameOfReference {
  readonly velocity: number;
  readonly time: number;
  readonly length: number;
  readonly proper: boolean;
}

/** 洛伦兹因子 γ = 1/√(1 - v²/c²)。 */
export interface LorentzFactor {
  readonly gamma: number;
  readonly beta: number;
  readonly superluminal: boolean;
}

/** 四维矢量：能量与动量分量。 */
export interface FourVector {
  readonly energy: number;
  readonly momentum: number;
  readonly magnitude: number;
  readonly timelike: boolean;
}

/** 时空度规张量（简化为标量度规）。 */
export interface SpacetimeMetric {
  readonly g00: number;
  readonly g11: number;
  readonly g22: number;
  readonly g33: number;
  readonly signature: 'mostly-minus' | 'mostly-plus';
}

/** 时空事件。 */
export interface SpacetimeEvent {
  readonly t: number;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly intervalType: 'timelike' | 'spacelike' | 'lightlike';
}

/** 黑洞描述。 */
export interface BlackHole {
  readonly mass: number;
  readonly schwarzschildRadius: number;
  readonly photonSphere: number;
  readonly iscoRadius: number;
  readonly hawkingTemperature: number;
}

/** 引力透镜描述。 */
export interface GravitationalLens {
  readonly deflectionAngle: number;
  readonly einsteinRadius: number;
  readonly magnification: number;
}

/** 宇宙学描述。 */
export interface Cosmology {
  readonly hubbleConstant: number;
  readonly criticalDensity: number;
  readonly omegaMatter: number;
  readonly omegaLambda: number;
  readonly curvature: 'flat' | 'open' | 'closed';
}

type FrameRecord = {
  readonly id: string;
  readonly frame: FrameOfReference;
  readonly timestamp: number;
};

type TransformRecord = {
  readonly id: string;
  readonly fromFrame: number;
  readonly toFrame: number;
  readonly timestamp: number;
};

/** 真空光速 c (m/s)。 */
const C_LIGHT = 299792458;
/** 光速平方 (m²/s²)。 */
const C_SQ = C_LIGHT * C_LIGHT;
/** 万有引力常数 G (m³/(kg·s²))。 */
const G_NEWTON = 6.6743e-11;
/** 玻尔兹曼常数 (J/K)。 */
const K_B = 1.380649e-23;
/** 约化普朗克常数 (J·s)。 */
const HBAR = 1.054571817e-34;
/** 太阳质量 (kg)。 */
const M_SUN = 1.98892e30;
/** 秒差距 (m)。 */
const PARSEC = 3.0856775814913673e16;
/** 哈勃常数近似 (km/s/Mpc)。 */
const H_0 = 67.8;

export class Relativity {
  private _frames: Map<string, FrameRecord> = new Map();
  private _transformations: Map<string, TransformRecord> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get frameCount(): number { return this._frames.size; }
  get transformCount(): number { return this._transformations.size; }
  get history(): string[] { return [...this._history]; }

  // ─── 狭义相对论：基本变换 ───

  /**
   * 洛伦兹因子：γ = 1/√(1 - v²/c²)
   * Lorentz factor
   */
  public lorentzFactor(v: number): LorentzFactor {
    const beta = v / C_LIGHT;
    if (Math.abs(beta) >= 1) {
      this._recordHistory(`lorentzFactor: superluminal β=${beta}`);
      return { gamma: Infinity, beta, superluminal: true };
    }
    const gamma = 1 / Math.sqrt(1 - beta * beta);
    this._recordHistory(`lorentzFactor: v=${v} -> γ=${gamma}, β=${beta}`);
    return { gamma, beta, superluminal: false };
  }

  /**
   * 从 γ 反推 β：β = √(1 - 1/γ²)
   */
  public betaFromGamma(gamma: number): { beta: number; velocity: number } {
    if (gamma < 1) throw new Error('γ must be ≥ 1');
    const beta = Math.sqrt(1 - 1 / (gamma * gamma));
    const velocity = beta * C_LIGHT;
    this._recordHistory(`betaFromGamma: γ=${gamma} -> β=${beta}`);
    return { beta, velocity };
  }

  /**
   * 时间膨胀：Δt = γ * Δt_0
   * Time dilation
   */
  public timeDilation(t: number, v: number): { dilated: number; gamma: number } {
    const { gamma, superluminal } = this.lorentzFactor(v);
    if (superluminal) throw new Error('Velocity must be less than c');
    const dilated = gamma * t;
    this._recordHistory(`timeDilation: t_0=${t}, v=${v} -> Δt=${dilated}`);
    return { dilated, gamma };
  }

  /**
   * 长度收缩：L = L_0 / γ
   * Length contraction
   */
  public lengthContraction(l: number, v: number): { contracted: number; gamma: number } {
    const { gamma, superluminal } = this.lorentzFactor(v);
    if (superluminal) throw new Error('Velocity must be less than c');
    const contracted = l / gamma;
    this._recordHistory(`lengthContraction: L_0=${l}, v=${v} -> L=${contracted}`);
    return { contracted, gamma };
  }

  /**
   * 相对论质量：m = γ * m_0
   * Relativistic mass
   */
  public relativisticMass(m: number, v: number): { relativistic: number; gamma: number } {
    if (m < 0) throw new Error('Rest mass must be non-negative');
    const { gamma, superluminal } = this.lorentzFactor(v);
    if (superluminal) throw new Error('Velocity must be less than c');
    const relativistic = gamma * m;
    this._recordHistory(`relativisticMass: m_0=${m}, v=${v} -> m=${relativistic}`);
    return { relativistic, gamma };
  }

  /**
   * 相对论动量：p = γ * m * v
   * Relativistic momentum
   */
  public relativisticMomentum(m: number, v: number): number {
    if (m < 0) throw new Error('Mass must be non-negative');
    const { gamma, superluminal } = this.lorentzFactor(v);
    if (superluminal) throw new Error('Velocity must be less than c');
    const p = gamma * m * v;
    this._recordHistory(`relativisticMomentum: m=${m}, v=${v} -> p=${p}`);
    return p;
  }

  /**
   * 相对论总能量：E = γ * m * c²
   * Relativistic total energy
   */
  public relativisticEnergy(m: number, v: number): {
    total: number;
    kinetic: number;
    rest: number;
  } {
    if (m < 0) throw new Error('Mass must be non-negative');
    const { gamma, superluminal } = this.lorentzFactor(v);
    if (superluminal) throw new Error('Velocity must be less than c');
    const rest = m * C_SQ;
    const total = gamma * rest;
    const kinetic = total - rest;
    this._recordHistory(
      `relativisticEnergy: m=${m}, v=${v} -> E=${total}, KE=${kinetic}`,
    );
    return { total, kinetic, rest };
  }

  /**
   * 质能等价：E = m * c²
   * Mass-energy equivalence
   */
  public massEnergyEquiv(m: number): { energy: number; c: number } {
    if (m < 0) throw new Error('Mass must be non-negative');
    const energy = m * C_SQ;
    this._recordHistory(`massEnergyEquiv: m=${m} -> E=${energy}`);
    return { energy, c: C_LIGHT };
  }

  /**
   * 能量动量关系：E² = (pc)² + (mc²)²
   */
  public energyMomentumRelation(m: number, p: number): {
    energy: number;
    kinetic: number;
    velocity: number;
  } {
    if (m < 0) throw new Error('Mass must be non-negative');
    const restEnergy = m * C_SQ;
    const energy = Math.sqrt((p * C_LIGHT) ** 2 + restEnergy * restEnergy);
    const kinetic = energy - restEnergy;
    const velocity = energy > 0 ? (p * C_SQ) / energy : 0;
    this._recordHistory(`energyMomentumRelation: E=${energy}, v=${velocity}`);
    return { energy, kinetic, velocity };
  }

  // ─── 洛伦兹变换与速度合成 ───

  /**
   * 洛伦兹变换：x' = γ(x - vt), t' = γ(t - vx/c²)
   * Lorentz transformation
   */
  public lorentzTransformation(x: number, t: number, v: number): {
    xPrime: number;
    tPrime: number;
    gamma: number;
  } {
    const { gamma, superluminal } = this.lorentzFactor(v);
    if (superluminal) throw new Error('Velocity must be less than c');
    const xPrime = gamma * (x - v * t);
    const tPrime = gamma * (t - (v * x) / C_SQ);
    const id = this._generateId();
    this._transformations.set(id, {
      id,
      fromFrame: x,
      toFrame: xPrime,
      timestamp: Date.now(),
    });
    this._recordHistory(
      `lorentzTransformation: x=${x}, t=${t}, v=${v} -> x'=${xPrime}, t'=${tPrime}`,
    );
    return { xPrime, tPrime, gamma };
  }

  /**
   * 逆洛伦兹变换：x = γ(x' + vt'), t = γ(t' + vx'/c²)
   */
  public inverseLorentzTransformation(xPrime: number, tPrime: number, v: number): {
    x: number;
    t: number;
    gamma: number;
  } {
    const { gamma, superluminal } = this.lorentzFactor(v);
    if (superluminal) throw new Error('Velocity must be less than c');
    const x = gamma * (xPrime + v * tPrime);
    const t = gamma * (tPrime + (v * xPrime) / C_SQ);
    this._recordHistory(`inverseLorentzTransformation: x=${x}, t=${t}`);
    return { x, t, gamma };
  }

  /**
   * 相对论速度合成：u' = (u + v) / (1 + uv/c²)
   * Relativistic velocity addition
   */
  public velocityAddition(u: number, v: number): { resultant: number; superluminal: boolean } {
    if (Math.abs(u) >= C_LIGHT || Math.abs(v) >= C_LIGHT) {
      throw new Error('Input velocities must be less than c');
    }
    const resultant = (u + v) / (1 + (u * v) / C_SQ);
    const superluminal = Math.abs(resultant) >= C_LIGHT;
    this._recordHistory(`velocityAddition: u=${u}, v=${v} -> u'=${resultant}`);
    return { resultant, superluminal };
  }

  /**
   * 二维速度合成
   */
  public velocityAddition2D(
    ux: number, uy: number, v: number,
  ): { uxPrime: number; uyPrime: number; speedPrime: number } {
    if (Math.abs(v) >= C_LIGHT) throw new Error('v must be less than c');
    const { gamma } = this.lorentzFactor(v);
    const denom = 1 + (v * ux) / C_SQ;
    const uxPrime = (ux - v) / denom;
    const uyPrime = (uy / gamma) / denom;
    const speedPrime = Math.sqrt(uxPrime * uxPrime + uyPrime * uyPrime);
    this._recordHistory(`velocityAddition2D: speed'=${speedPrime}`);
    return { uxPrime, uyPrime, speedPrime };
  }

  /**
   * 快度：y = arctanh(β)
   * Rapidity (additive under collinear boosts)
   */
  public rapidity(v: number): { rapidity: number; beta: number } {
    const { beta, superluminal } = this.lorentzFactor(v);
    if (superluminal) throw new Error('Velocity must be less than c');
    const rapidity = Math.atanh(beta);
    this._recordHistory(`rapidity: v=${v} -> y=${rapidity}`);
    return { rapidity, beta };
  }

  /**
   * 快度相加（共线加速是快度相加）
   */
  public rapidityAddition(y1: number, y2: number): { rapidity: number; beta: number } {
    const y = y1 + y2;
    const beta = Math.tanh(y);
    this._recordHistory(`rapidityAddition: y=${y}, β=${beta}`);
    return { rapidity: y, beta };
  }

  // ─── 多普勒效应与光行差 ───

  /**
   * 相对论多普勒效应：f' = f * √((1-β)/(1+β)) (远离)
   * Relativistic Doppler effect
   */
  public relativisticDoppler(
    f: number,
    v: number,
    direction: 'approaching' | 'receding',
  ): { observed: number; redshift: number } {
    const { beta, superluminal } = this.lorentzFactor(v);
    if (superluminal) throw new Error('Velocity must be less than c');
    const sign = direction === 'approaching' ? -1 : 1;
    const factor = Math.sqrt((1 + sign * beta) / (1 - sign * beta));
    const observed = f * factor;
    const redshift = (observed - f) / f;
    this._recordHistory(
      `relativisticDoppler: f=${f}, v=${v}, dir=${direction} -> f'=${observed}`,
    );
    return { observed, redshift };
  }

  /**
   * 横向多普勒效应（纯时间膨胀）
   * Transverse Doppler effect
   */
  public transverseDoppler(f: number, v: number): { observed: number; shift: number } {
    const { gamma, superluminal } = this.lorentzFactor(v);
    if (superluminal) throw new Error('Velocity must be less than c');
    const observed = f / gamma;
    const shift = (observed - f) / f;
    this._recordHistory(`transverseDoppler: f'=${observed}`);
    return { observed, shift };
  }

  /**
   * 相对论光行差：cos(θ') = (cos(θ) - β) / (1 - β*cos(θ))
   * Relativistic aberration of light
   */
  public relativisticAberration(theta: number, v: number): { thetaPrime: number; beta: number } {
    const { beta, superluminal } = this.lorentzFactor(v);
    if (superluminal) throw new Error('Velocity must be less than c');
    const cosTheta = Math.cos(theta);
    const cosThetaPrime = (cosTheta - beta) / (1 - beta * cosTheta);
    const thetaPrime = Math.acos(Math.max(-1, Math.min(1, cosThetaPrime)));
    this._recordHistory(
      `relativisticAberration: θ=${theta}, v=${v} -> θ'=${thetaPrime}`,
    );
    return { thetaPrime, beta };
  }

  // ─── 四维矢量与不变量 ───

  /**
   * 四维动量：P^μ = (E/c, p)
   * Four-momentum
   */
  public fourMomentum(E: number, p: number): FourVector {
    const EoverC = E / C_LIGHT;
    const magnitude = Math.sqrt(Math.abs(EoverC * EoverC - p * p));
    const timelike = EoverC * EoverC >= p * p;
    this._recordHistory(
      `fourMomentum: E=${E}, p=${p} -> |P|=${magnitude}, timelike=${timelike}`,
    );
    return { energy: EoverC, momentum: p, magnitude, timelike };
  }

  /**
   * 四维速度：U^μ = γ(c, v)
   */
  public fourVelocity(v: number): { ut: number; ux: number; magnitude: number } {
    const { gamma, superluminal } = this.lorentzFactor(v);
    if (superluminal) throw new Error('Velocity must be less than c');
    const ut = gamma * C_LIGHT;
    const ux = gamma * v;
    const magnitude = Math.sqrt(Math.abs(ut * ut - ux * ux));
    this._recordHistory(`fourVelocity: U_t=${ut}, U_x=${ux}`);
    return { ut, ux, magnitude };
  }

  /**
   * 四维位置：X^μ = (ct, x, y, z)
   */
  public fourPosition(t: number, x: number, y: number = 0, z: number = 0): {
    interval: number;
    event: SpacetimeEvent;
  } {
    const ct = C_LIGHT * t;
    const intervalSq = ct * ct - x * x - y * y - z * z;
    const interval = Math.sqrt(Math.abs(intervalSq));
    let intervalType: 'timelike' | 'spacelike' | 'lightlike';
    if (intervalSq > 0) intervalType = 'timelike';
    else if (intervalSq < 0) intervalType = 'spacelike';
    else intervalType = 'lightlike';
    this._recordHistory(`fourPosition: ds²=${intervalSq}, ${intervalType}`);
    return {
      interval,
      event: { t, x, y, z, intervalType },
    };
  }

  /**
   * 不变质量：m_0² = E²/c⁴ - p²/c²
   * Invariant (rest) mass
   */
  public invariantMass(E: number, p: number): { mass: number; valid: boolean } {
    const mSquared = (E * E) / C_SQ - p * p;
    if (mSquared < 0) {
      this._recordHistory(`invariantMass: imaginary (m²=${mSquared})`);
      return { mass: NaN, valid: false };
    }
    const mass = Math.sqrt(mSquared);
    this._recordHistory(`invariantMass: E=${E}, p=${p} -> m_0=${mass}`);
    return { mass, valid: true };
  }

  // ─── 时空度规与张量 ───

  /**
   * 闵可夫斯基度规（默认符号 + - - -）
   */
  public minkowskiMetric(signature: 'mostly-minus' | 'mostly-plus' = 'mostly-minus'): SpacetimeMetric {
    if (signature === 'mostly-minus') {
      return { g00: 1, g11: -1, g22: -1, g33: -1, signature };
    }
    return { g00: -1, g11: 1, g22: 1, g33: 1, signature };
  }

  /**
   * 时空间隔：ds² = g_μν dx^μ dx^ν
   */
  public spacetimeInterval(
    metric: SpacetimeMetric,
    dt: number, dx: number, dy: number = 0, dz: number = 0,
  ): { interval: number; type: 'timelike' | 'spacelike' | 'lightlike' } {
    const interval =
      metric.g00 * dt * dt +
      metric.g11 * dx * dx +
      metric.g22 * dy * dy +
      metric.g33 * dz * dz;
    let type: 'timelike' | 'spacelike' | 'lightlike';
    if (Math.abs(interval) < 1e-12) type = 'lightlike';
    else if (interval > 0) type = 'timelike';
    else type = 'spacelike';
    this._recordHistory(`spacetimeInterval: ds²=${interval}, ${type}`);
    return { interval, type };
  }

  /**
   * 测地线：沿度规张量的最短路径
   * Geodesic (formal placeholder for metric-based path)
   */
  public geodesic(metric: SpacetimeMetric, coords: number[]): {
    interval: number;
    path: number[];
  } {
    if (coords.length !== 4) throw new Error('Exactly 4 coordinates required');
    const [t, x, y, z] = coords;
    const interval =
      metric.g00 * t * t +
      metric.g11 * x * x +
      metric.g22 * y * y +
      metric.g33 * z * z;
    this._recordHistory(`geodesic: ds²=${interval}, signature=${metric.signature}`);
    return { interval, path: coords };
  }

  // ─── 广义相对论 ───

  /**
   * 爱因斯坦场方程（形式）：G_μν = (8πG/c⁴) T_μν
   * Einstein field equation (formal)
   */
  public einsteinFieldEquation(): { coupling: number; description: string } {
    const coupling = (8 * Math.PI * G_NEWTON) / Math.pow(C_LIGHT, 4);
    const description = 'G_μν + Λg_μν = (8πG/c⁴) T_μν';
    this._recordHistory(`einsteinFieldEquation: κ=${coupling}`);
    return { coupling, description };
  }

  /**
   * 引力时间膨胀：t_f = t_0 * √(1 - 2GM/(rc²))
   * Gravitational time dilation (Schwarzschild)
   */
  public gravitationalTimeDilation(t: number, M: number, r: number): {
    dilated: number;
    atHorizon: boolean;
  } {
    const rs = (2 * G_NEWTON * M) / C_SQ;
    if (r <= rs) {
      this._recordHistory(`gravitationalTimeDilation: at/inside horizon (r=${r}, r_s=${rs})`);
      return { dilated: Infinity, atHorizon: true };
    }
    const factor = Math.sqrt(1 - rs / r);
    const dilated = t / factor;
    this._recordHistory(
      `gravitationalTimeDilation: t_0=${t}, M=${M}, r=${r} -> t_f=${dilated}`,
    );
    return { dilated, atHorizon: false };
  }

  /**
   * 史瓦西半径：r_s = 2GM/c²
   * Schwarzschild radius (event horizon of a black hole)
   */
  public schwarzschildRadius(M: number): { radius: number; g: number } {
    if (M < 0) throw new Error('Mass must be non-negative');
    const radius = (2 * G_NEWTON * M) / C_SQ;
    this._recordHistory(`schwarzschildRadius: M=${M} -> r_s=${radius}`);
    return { radius, g: G_NEWTON };
  }

  /**
   * 完整黑洞描述
   * Complete black hole description
   */
  public blackHole(M: number): BlackHole {
    if (M <= 0) throw new Error('Mass must be positive');
    const schwarzschildRadius = (2 * G_NEWTON * M) / C_SQ;
    const photonSphere = 1.5 * schwarzschildRadius;
    const iscoRadius = 3 * schwarzschildRadius;
    // 霍金温度 T_H = ℏc³/(8πGMk_B)
    const hawkingTemperature = (HBAR * Math.pow(C_LIGHT, 3)) /
      (8 * Math.PI * G_NEWTON * M * K_B);
    this._recordHistory(
      `blackHole: M=${M}, r_s=${schwarzschildRadius}, T_H=${hawkingTemperature}`,
    );
    return {
      mass: M,
      schwarzschildRadius,
      photonSphere,
      iscoRadius,
      hawkingTemperature,
    };
  }

  /**
   * 霍金辐射功率
   * Hawking radiation power
   */
  public hawkingRadiationPower(M: number): number {
    if (M <= 0) throw new Error('Mass must be positive');
    // P = ℏc⁶/(15360π G² M²)
    const P = (HBAR * Math.pow(C_LIGHT, 6)) /
      (15360 * Math.PI * G_NEWTON * G_NEWTON * M * M);
    this._recordHistory(`hawkingRadiationPower: P=${P}`);
    return P;
  }

  /**
   * 黑洞蒸发时间：t = 5120 π G² M³ / (ℏ c⁴)
   */
  public blackHoleEvaporationTime(M: number): number {
    if (M <= 0) throw new Error('Mass must be positive');
    const t = (5120 * Math.PI * G_NEWTON * G_NEWTON * M * M * M) /
      (HBAR * Math.pow(C_LIGHT, 4));
    this._recordHistory(`blackHoleEvaporationTime: t=${t}`);
    return t;
  }

  /**
   * 引力红移：Δf/f = -GM/(rc²)
   * Gravitational redshift
   */
  public gravitationalRedshift(f: number, M: number, r: number): {
    shifted: number;
    redshift: number;
  } {
    const rs = (2 * G_NEWTON * M) / C_SQ;
    if (r <= rs) throw new Error('r must be greater than Schwarzschild radius');
    const factor = Math.sqrt(1 - rs / r);
    const shifted = f * factor;
    const redshift = (f - shifted) / f;
    this._recordHistory(
      `gravitationalRedshift: f=${f}, M=${M}, r=${r} -> f'=${shifted}`,
    );
    return { shifted, redshift };
  }

  /**
   * 水星近日点进动（每世纪）
   * Mercury perihelion precession
   */
  public perihelionPrecession(
    a: number,
    e: number,
    M: number,
    revolutions: number = 1,
  ): { precession: number; description: string } {
    if (a <= 0 || M <= 0) throw new Error('Semi-major axis and mass must be positive');
    if (e < 0 || e >= 1) throw new Error('Eccentricity must be in [0, 1)');
    // Δφ = 6π GM / (a(1-e²)c²) per orbit
    const perOrbit = (6 * Math.PI * G_NEWTON * M) / (a * (1 - e * e) * C_SQ);
    const precession = perOrbit * revolutions;
    this._recordHistory(`perihelionPrecession: Δφ=${precession} rad`);
    return {
      precession,
      description: `${revolutions} orbits, Δφ = ${precession * 180 / Math.PI}°`,
    };
  }

  /**
   * 光线弯曲（爱因斯坦 1915）：δ = 4GM/(c²b)
   * Light deflection
   */
  public lightDeflection(M: number, b: number): { angle: number; lens: GravitationalLens } {
    if (M <= 0 || b <= 0) throw new Error('M and b must be positive');
    const deflectionAngle = (4 * G_NEWTON * M) / (C_SQ * b);
    // 爱因斯坦环角半径
    const D = b;
    const einsteinRadius = Math.sqrt((4 * G_NEWTON * M * D) / C_SQ);
    const magnification = 1 + (deflectionAngle * deflectionAngle) / 4;
    this._recordHistory(`lightDeflection: δ=${deflectionAngle}`);
    return {
      angle: deflectionAngle,
      lens: { deflectionAngle, einsteinRadius, magnification },
    };
  }

  /**
   * 引力透镜分析
   * Gravitational lensing
   */
  public gravitationalLens(
    M: number,
    D_L: number,
    D_S: number,
    D_LS: number,
  ): GravitationalLens {
    if (M <= 0 || D_L <= 0 || D_S <= 0 || D_LS <= 0) {
      throw new Error('Parameters must be positive');
    }
    const deflectionAngle = (4 * G_NEWTON * M) / C_SQ;
    const einsteinRadius = Math.sqrt(
      (4 * G_NEWTON * M / C_SQ) * (D_LS / (D_L * D_S)),
    );
    const magnification = 1; // 简化
    this._recordHistory(`gravitationalLens: θ_E=${einsteinRadius}`);
    return { deflectionAngle, einsteinRadius, magnification };
  }

  /**
   * 引力波频率（双星系统，简化）
   * Gravitational wave frequency from binary
   */
  public gravitationalWaveFrequency(
    m1: number,
    m2: number,
    a: number,
  ): { frequency: number; power: number } {
    if (m1 <= 0 || m2 <= 0 || a <= 0) throw new Error('Parameters must be positive');
    // 开普勒频率
    const M = m1 + m2;
    const orbitalFrequency = (1 / (2 * Math.PI)) * Math.sqrt((G_NEWTON * M) / (a * a * a));
    const frequency = 2 * orbitalFrequency;
    // 引力波功率：P = (32/5) G⁴/c⁵ * (m1 m2)² (m1+m2) / a⁵
    const power = (32 / 5) * Math.pow(G_NEWTON, 4) / Math.pow(C_LIGHT, 5) *
      (m1 * m1 * m2 * m2) * M / Math.pow(a, 5);
    this._recordHistory(`gravitationalWaveFrequency: f=${frequency}, P=${power}`);
    return { frequency, power };
  }

  // ─── 宇宙学 ───

  /**
   * 哈勃定律：v = H₀ d
   * Hubble's law
   */
  public hubbleLaw(distanceMpc: number, H0: number = H_0): { velocity: number; redshift: number } {
    const velocity = H0 * distanceMpc; // km/s
    const redshift = velocity / (C_LIGHT / 1000);
    this._recordHistory(`hubbleLaw: d=${distanceMpc} Mpc -> v=${velocity} km/s`);
    return { velocity, redshift };
  }

  /**
   * 临界密度：ρ_c = 3H²/(8πG)
   * Critical density of the universe
   */
  public criticalDensity(H0: number = H_0): { density: number; description: string } {
    const H = H0 * 1000 / PARSEC; // 转 s⁻¹
    const density = (3 * H * H) / (8 * Math.PI * G_NEWTON);
    this._recordHistory(`criticalDensity: ρ_c=${density}`);
    return {
      density,
      description: `H₀ = ${H0} km/s/Mpc, ρ_c ≈ ${density} kg/m³`,
    };
  }

  /**
   * 宇宙学分析
   * Cosmological analysis
   */
  public cosmologicalAnalysis(
    omegaMatter: number = 0.308,
    omegaLambda: number = 0.692,
    H0: number = H_0,
  ): Cosmology {
    const omegaTotal = omegaMatter + omegaLambda;
    let curvature: 'flat' | 'open' | 'closed';
    if (Math.abs(omegaTotal - 1) < 1e-6) curvature = 'flat';
    else if (omegaTotal < 1) curvature = 'open';
    else curvature = 'closed';
    const criticalDensityResult = this.criticalDensity(H0);
    this._recordHistory(`cosmologicalAnalysis: ${curvature} universe`);
    return {
      hubbleConstant: H0,
      criticalDensity: criticalDensityResult.density,
      omegaMatter,
      omegaLambda,
      curvature,
    };
  }

  /**
   * 宇宙年龄（平坦 ΛCDM 简化估计）：t_0 ≈ 2/(3 H₀ √Ω_Λ) * asinh(√(Ω_Λ/Ω_m))
   */
  public universeAge(
    omegaMatter: number = 0.308,
    omegaLambda: number = 0.692,
    H0: number = H_0,
  ): { age: number; description: string } {
    if (omegaMatter <= 0 || omegaLambda <= 0) {
      throw new Error('Omega values must be positive');
    }
    const H = H0 * 1000 / PARSEC;
    const age = (2 / (3 * H * Math.sqrt(omegaLambda))) *
      Math.asinh(Math.sqrt(omegaLambda / omegaMatter));
    const ageGyr = age / (365.25 * 24 * 3600 * 1e9);
    this._recordHistory(`universeAge: ${ageGyr} Gyr`);
    return {
      age,
      description: `≈ ${ageGyr} Gyr`,
    };
  }

  // ─── 佯谬与极限场景 ───

  /**
   * 双生子佯谬
   * Twin paradox analysis
   */
  public twinParadox(
    travelTime: number,
    velocity: number,
  ): { travelerAge: number; stayAtHomeAge: number; ageDifference: number } {
    const { gamma, superluminal } = this.lorentzFactor(velocity);
    if (superluminal) throw new Error('Velocity must be less than c');
    const stayAtHomeAge = travelTime;
    const travelerAge = travelTime / gamma;
    const ageDifference = stayAtHomeAge - travelerAge;
    this._recordHistory(
      `twinParadox: difference=${ageDifference} s`,
    );
    return { travelerAge, stayAtHomeAge, ageDifference };
  }

  /**
   * 车库佯谬（同时的相对性）
   * Ladder/garage paradox
   */
  public ladderParadox(
    properLength: number,
    garageLength: number,
    velocity: number,
  ): { observerSeesFits: boolean; ladderSeesGarage: number; description: string } {
    const { gamma, superluminal } = this.lorentzFactor(velocity);
    if (superluminal) throw new Error('Velocity must be less than c');
    const contractedLength = properLength / gamma;
    const observerSeesFits = contractedLength <= garageLength;
    // 梯子参考系下车库长度
    const ladderSeesGarage = garageLength / gamma;
    const description = observerSeesFits
      ? 'Observer sees ladder fit in garage'
      : 'Observer sees ladder does not fit';
    this._recordHistory(`ladderParadox: ${description}`);
    return { observerSeesFits, ladderSeesGarage, description };
  }

  // ─── 极端相对论 ───

  /**
   * 相对论喷流多普勒增强
   * Relativistic beaming
   */
  public relativisticBeaming(
    luminosity: number,
    velocity: number,
    angle: number,
  ): { observedLuminosity: number; dopplerFactor: number } {
    const { gamma, superluminal } = this.lorentzFactor(velocity);
    if (superluminal) throw new Error('Velocity must be less than c');
    const beta = velocity / C_LIGHT;
    const dopplerFactor = 1 / (gamma * (1 - beta * Math.cos(angle)));
    const observedLuminosity = luminosity * Math.pow(dopplerFactor, 4);
    this._recordHistory(`relativisticBeaming: δ=${dopplerFactor}`);
    return { observedLuminosity, dopplerFactor };
  }

  /**
   * 超光速视运动
   * Superluminal apparent motion
   */
  public superluminalApparentMotion(
    velocity: number,
    angle: number,
  ): { apparentVelocity: number; superluminal: boolean } {
    if (Math.abs(velocity) >= C_LIGHT) throw new Error('True velocity must be < c');
    const { gamma } = this.lorentzFactor(velocity);
    const beta = velocity / C_LIGHT;
    const betaApp = (beta * Math.sin(angle)) / (1 - beta * Math.cos(angle));
    const apparentVelocity = betaApp * C_LIGHT;
    this._recordHistory(`superluminalApparentMotion: β_app=${betaApp}`);
    return { apparentVelocity, superluminal: betaApp > 1 };
  }

  /**
   * 能量阈值（粒子反应）：√s = √(2 m₁ c² E₂)
   * Center-of-mass energy
   */
  public centerOfMassEnergy(
    m1: number, E2: number,
  ): { cmsEnergy: number; threshold: number } {
    if (m1 < 0 || E2 < 0) throw new Error('Parameters must be non-negative');
    const cmsEnergy = Math.sqrt(2 * m1 * C_SQ * E2);
    this._recordHistory(`centerOfMassEnergy: √s=${cmsEnergy}`);
    return { cmsEnergy, threshold: 2 * m1 * C_SQ };
  }

  // ─── 序列化与重置 ───

  /**
   * 转换为数据包
   * Serialize to DataPacket
   */
  public toPacket(): DataPacket<{
    frames: number;
    transformations: number;
    history: string[];
  }> {
    return {
      id: `rel-${Date.now()}-${this._counter}`,
      payload: {
        frames: this._frames.size,
        transformations: this._transformations.size,
        history: [...this._history],
      },
      metadata: {
        createdAt: Date.now(),
        route: ['physics', 'relativity'],
        priority: 0.9,
        phase: 'analysis',
      },
    };
  }

  /**
   * 重置状态
   * Reset internal state
   */
  public reset(): void {
    this._frames.clear();
    this._transformations.clear();
    this._history = [];
    this._counter = 0;
  }

  // ─── Private helpers ───

  private _generateId(): string {
    return `rel-${(++this._counter).toString(36)}-${Date.now().toString(36)}`;
  }

  private _recordHistory(entry: string): void {
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
  }

  /** 暴露真空光速。 */
  public static readonly C = C_LIGHT;
  /** 暴露光速平方。 */
  public static readonly C_SQUARED = C_SQ;
  /** 暴露万有引力常数。 */
  public static readonly G = G_NEWTON;
  /** 暴露约化普朗克常数。 */
  public static readonly HBAR = HBAR;
  /** 暴露太阳质量。 */
  public static readonly M_SUN = M_SUN;
  /** 暴露秒差距。 */
  public static readonly PARSEC = PARSEC;
  /** 暴露哈勃常数。 */
  public static readonly H_0 = H_0;
}
