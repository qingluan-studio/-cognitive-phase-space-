/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 相对论 —— 时空的弯曲与折叠
 * Relativity: The Bending and Folding of Spacetime
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 从洛伦兹变换到爱因斯坦场方程，相对论重写了时空的几何。
 * 时间膨胀、长度收缩、质能等价——皆是光速恒定所结出的奇异果实。
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

export class Relativity {
  private _frames: Map<string, FrameRecord> = new Map();
  private _transformations: Map<string, TransformRecord> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get frameCount(): number { return this._frames.size; }
  get transformCount(): number { return this._transformations.size; }
  get history(): string[] { return [...this._history]; }

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
}
