/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 电磁学 —— 场与波的交响
 * Electromagnetism: Symphony of Fields and Waves
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 从库仑定律到麦克斯韦方程组，电磁学统一了电、磁与光。
 * 电荷激发电场，电流产生磁场，变化的场又相互感应，最终编织出光的波纹。
 */

import { DataPacket } from '../shared/types';

/** 电荷：电量与位置。 */
export interface Charge {
  readonly value: number;
  readonly position: [number, number, number];
}

/** 电场：大小、方向与源。 */
export interface ElectricField {
  readonly magnitude: number;
  readonly direction: [number, number, number];
  readonly source: string;
}

/** 磁场：矢量与强度。 */
export interface MagneticField {
  readonly bx: number;
  readonly by: number;
  readonly bz: number;
  readonly magnitude: number;
  readonly source: string;
}

/** 电磁波：电场、磁场与传播速度。 */
export interface ElectromagneticWave {
  readonly E: number;
  readonly B: number;
  readonly c: number;
  readonly frequency: number;
  readonly wavelength: number;
}

type ChargeRecord = {
  readonly id: string;
  readonly charge: Charge;
  readonly timestamp: number;
};

type FieldRecord = {
  readonly id: string;
  readonly field: ElectricField | MagneticField;
  readonly kind: 'electric' | 'magnetic';
  readonly timestamp: number;
};

type WaveRecord = {
  readonly id: string;
  readonly wave: ElectromagneticWave;
  readonly timestamp: number;
};

/** 库仑常数 k_e (N·m²/C²)。 */
const K_E = 8.9875517923e9;
/** 真空介电常数 ε_0 (F/m)。 */
const EPSILON_0 = 8.8541878128e-12;
/** 真空磁导率 μ_0 (H/m)。 */
const MU_0 = 1.25663706212e-6;
/** 真空光速 c (m/s)。 */
const C_LIGHT = 299792458;

export class Electromagnetism {
  private _charges: Map<string, ChargeRecord> = new Map();
  private _fields: Map<string, FieldRecord> = new Map();
  private _waves: Map<string, WaveRecord> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get chargeCount(): number { return this._charges.size; }
  get fieldCount(): number { return this._fields.size; }
  get waveCount(): number { return this._waves.size; }
  get history(): string[] { return [...this._history]; }

  /**
   * 库仑定律：F = k_e * q1*q2 / r^2
   * Coulomb's Law
   */
  public coulombsLaw(q1: number, q2: number, r: number): {
    force: number;
    attractive: boolean;
  } {
    if (r <= 0) throw new Error('Distance must be positive');
    const force = (K_E * q1 * q2) / (r * r);
    const attractive = q1 * q2 < 0;
    this._recordHistory(`coulombsLaw: q1=${q1}, q2=${q2}, r=${r} -> F=${force}`);
    return { force, attractive };
  }

  /**
   * 电场：E = k_e * q / r^2
   * Electric field due to a point charge
   */
  public electricField(q: number, r: number): ElectricField {
    if (r <= 0) throw new Error('Distance must be positive');
    const magnitude = (K_E * Math.abs(q)) / (r * r);
    const sign = q >= 0 ? 1 : -1;
    const direction: [number, number, number] = [sign, 0, 0];
    const field: ElectricField = { magnitude, direction, source: `point charge q=${q}` };
    const id = this._generateId();
    this._fields.set(id, { id, field, kind: 'electric', timestamp: Date.now() });
    this._recordHistory(`electricField: q=${q}, r=${r} -> |E|=${magnitude}`);
    return field;
  }

  /**
   * 高斯定律：Φ_E = Q / ε_0
   * Gauss's Law
   */
  public gaussLaw(flux: number, charge: number): { enclosedCharge: number; valid: boolean } {
    const expectedFlux = charge / EPSILON_0;
    const valid = Math.abs(flux - expectedFlux) < 1e-6 * Math.max(1, Math.abs(expectedFlux));
    this._recordHistory(`gaussLaw: Φ=${flux}, Q=${charge} -> valid=${valid}`);
    return { enclosedCharge: charge, valid };
  }

  /**
   * 电势：V = k_e * q / r
   * Electric potential
   */
  public potential(charge: number, r: number): number {
    if (r <= 0) throw new Error('Distance must be positive');
    const V = (K_E * charge) / r;
    this._recordHistory(`potential: q=${charge}, r=${r} -> V=${V}`);
    return V;
  }

  /**
   * 电容：C = Q / V
   * Capacitance
   */
  public capacitance(Q: number, V: number): number {
    if (V === 0) throw new Error('Voltage must be non-zero');
    const C = Q / V;
    this._recordHistory(`capacitance: Q=${Q}, V=${V} -> C=${C}`);
    return C;
  }

  /**
   * 平行板电容器：C = ε * A / d
   * Parallel-plate capacitor
   */
  public parallelPlateCapacitor(epsilon: number, A: number, d: number): number {
    if (d <= 0) throw new Error('Plate separation must be positive');
    if (epsilon < 0 || A < 0) throw new Error('epsilon and A must be non-negative');
    const C = (epsilon * A) / d;
    this._recordHistory(`parallelPlateCapacitor: ε=${epsilon}, A=${A}, d=${d} -> C=${C}`);
    return C;
  }

  /**
   * 欧姆定律：V = I * R
   * Ohm's Law — solves for whichever quantity is provided as 0
   */
  public ohmsLaw(V: number, I: number, R: number): { solved: 'V' | 'I' | 'R'; value: number } {
    let solved: 'V' | 'I' | 'R';
    let value: number;
    if (V === 0 && I !== 0 && R !== 0) {
      solved = 'V';
      value = I * R;
    } else if (I === 0 && V !== 0 && R !== 0) {
      solved = 'I';
      value = V / R;
    } else if (R === 0 && V !== 0 && I !== 0) {
      solved = 'R';
      value = V / I;
    } else {
      solved = 'V';
      value = I * R;
    }
    this._recordHistory(`ohmsLaw: V=${V}, I=${I}, R=${R} -> ${solved}=${value}`);
    return { solved, value };
  }

  /**
   * 基尔霍夫电压定律：ΣV_loop = 0
   * Kirchhoff's Voltage Law
   */
  public kirchhoffVoltage(loop: number[]): { sum: number; satisfied: boolean } {
    const sum = loop.reduce((acc, v) => acc + v, 0);
    const satisfied = Math.abs(sum) < 1e-9;
    this._recordHistory(`kirchhoffVoltage: ΣV=${sum}, satisfied=${satisfied}`);
    return { sum, satisfied };
  }

  /**
   * 基尔霍夫电流定律：ΣI_node = 0
   * Kirchhoff's Current Law
   */
  public kirchhoffCurrent(node: number[]): { sum: number; satisfied: boolean } {
    const sum = node.reduce((acc, i) => acc + i, 0);
    const satisfied = Math.abs(sum) < 1e-9;
    this._recordHistory(`kirchhoffCurrent: ΣI=${sum}, satisfied=${satisfied}`);
    return { sum, satisfied };
  }

  /**
   * 串联电阻：R = R1 + R2 + ... + Rn
   * Series resistance
   */
  public seriesResistance(resistors: number[]): number {
    if (resistors.length === 0) throw new Error('At least one resistor required');
    const total = resistors.reduce((acc, r) => acc + r, 0);
    this._recordHistory(`seriesResistance: ${resistors.length} resistors -> R=${total}`);
    return total;
  }

  /**
   * 并联电阻：1/R = 1/R1 + 1/R2 + ... + 1/Rn
   * Parallel resistance
   */
  public parallelResistance(resistors: number[]): number {
    if (resistors.length === 0) throw new Error('At least one resistor required');
    let sumReciprocal = 0;
    for (const r of resistors) {
      if (r === 0) return 0;
      sumReciprocal += 1 / r;
    }
    const total = 1 / sumReciprocal;
    this._recordHistory(`parallelResistance: ${resistors.length} resistors -> R=${total}`);
    return total;
  }

  /**
   * 磁力：F = q * v × B
   * Magnetic force on a moving charge
   */
  public magneticForce(q: number, v: [number, number, number], B: MagneticField): {
    force: [number, number, number];
    magnitude: number;
  } {
    const [vx, vy, vz] = v;
    const fx = q * (vy * B.bz - vz * B.by);
    const fy = q * (vz * B.bx - vx * B.bz);
    const fz = q * (vx * B.by - vy * B.bx);
    const magnitude = Math.sqrt(fx * fx + fy * fy + fz * fz);
    this._recordHistory(`magneticForce: q=${q}, |v|=${Math.hypot(...v)} -> |F|=${magnitude}`);
    return { force: [fx, fy, fz], magnitude };
  }

  /**
   * 毕奥-萨伐尔定律：dB = (μ_0/4π) * I*dl × r̂ / r^2
   * Biot-Savart Law (magnitude approximation)
   */
  public biotSavart(I: number, dl: number, r: number): number {
    if (r <= 0) throw new Error('Distance must be positive');
    const dB = (MU_0 / (4 * Math.PI)) * (I * dl) / (r * r);
    this._recordHistory(`biotSavart: I=${I}, dl=${dl}, r=${r} -> dB=${dB}`);
    return dB;
  }

  /**
   * 安培定律：B = μ_0 * I / (2π * r)
   * Ampère's Law (long straight wire)
   */
  public amperesLaw(I: number, r: number): number {
    if (r <= 0) throw new Error('Distance must be positive');
    const B = (MU_0 * I) / (2 * Math.PI * r);
    this._recordHistory(`amperesLaw: I=${I}, r=${r} -> B=${B}`);
    return B;
  }

  /**
   * 法拉第电磁感应定律：EMF = -dΦ/dt
   * Faraday's Law of induction
   */
  public faradaysLaw(flux: number, time: number): { emf: number; direction: 'oppose' | 'aid' } {
    if (time === 0) throw new Error('Time interval must be non-zero');
    const emf = -flux / time;
    const direction: 'oppose' | 'aid' = emf > 0 ? 'oppose' : 'aid';
    this._recordHistory(`faradaysLaw: dΦ=${flux}, dt=${time} -> EMF=${emf}`);
    return { emf, direction };
  }

  /**
   * 楞次定律：感应电流方向 opposes 磁通变化
   * Lenz's Law
   */
  public lenzLaw(change: number, direction: 'increasing' | 'decreasing'): {
    inducedDirection: string;
    inducedEmf: number;
  } {
    const sign = direction === 'increasing' ? -1 : 1;
    const inducedEmf = sign * Math.abs(change);
    const inducedDirection = direction === 'increasing' ? 'opposes increase' : 'opposes decrease';
    this._recordHistory(`lenzLaw: change=${change}, dir=${direction} -> ${inducedDirection}`);
    return { inducedDirection, inducedEmf };
  }

  /**
   * 麦克斯韦方程组（真空）
   * Maxwell's Equations (in vacuum, integral form)
   */
  public maxwellEquations(): {
    gaussElectric: string;
    gaussMagnetic: string;
    faraday: string;
    ampereMaxwell: string;
  } {
    const result = {
      gaussElectric: '∮ E·dA = Q/ε_0',
      gaussMagnetic: '∮ B·dA = 0',
      faraday: '∮ E·dl = -dΦ_B/dt',
      ampereMaxwell: '∮ B·dl = μ_0*I + μ_0*ε_0*(dΦ_E/dt)',
    };
    this._recordHistory('maxwellEquations: returned four fundamental equations');
    return result;
  }

  /**
   * 电磁波：E/B = c, c = 1/√(μ_0 ε_0)
   * Electromagnetic wave relation
   */
  public electromagneticWave(E: number, B: number, c: number = C_LIGHT): ElectromagneticWave {
    const frequency = c > 0 ? (E / Math.max(Math.abs(B), 1e-30)) / (2 * Math.PI) : 0;
    const wavelength = frequency > 0 ? c / frequency : 0;
    const wave: ElectromagneticWave = { E, B, c, frequency, wavelength };
    const id = this._generateId();
    this._waves.set(id, { id, wave, timestamp: Date.now() });
    this._recordHistory(`electromagneticWave: E=${E}, B=${B}, c=${c}`);
    return wave;
  }

  /**
   * 斯涅尔定律：n1*sin(θ1) = n2*sin(θ2)
   * Snell's Law (note: also covered in Optics; here for completeness)
   */
  public snellsLaw(n1: number, theta1: number, n2: number): {
    theta2: number;
    criticalRefraction: boolean;
  } {
    if (n1 <= 0 || n2 <= 0) throw new Error('Refractive indices must be positive');
    const sinTheta2 = (n1 * Math.sin(theta1)) / n2;
    if (Math.abs(sinTheta2) > 1) {
      this._recordHistory(`snellsLaw: total internal reflection (sin θ2=${sinTheta2})`);
      return { theta2: NaN, criticalRefraction: true };
    }
    const theta2 = Math.asin(sinTheta2);
    this._recordHistory(`snellsLaw: n1=${n1}, θ1=${theta1}, n2=${n2} -> θ2=${theta2}`);
    return { theta2, criticalRefraction: false };
  }

  /**
   * 透镜方程：1/f = 1/d_o + 1/d_i
   * Thin lens equation
   */
  public lensEquation(f: number, do_: number, di: number): {
    solved: 'f' | 'do' | 'di';
    value: number;
  } {
    if (f === 0 && do_ !== 0 && di !== 0) {
      const value = 1 / (1 / do_ + 1 / di);
      this._recordHistory(`lensEquation: solved f=${value}`);
      return { solved: 'f', value };
    }
    if (do_ === 0 && f !== 0 && di !== 0) {
      const value = 1 / (1 / f - 1 / di);
      this._recordHistory(`lensEquation: solved do=${value}`);
      return { solved: 'do', value };
    }
    if (di === 0 && f !== 0 && do_ !== 0) {
      const value = 1 / (1 / f - 1 / do_);
      this._recordHistory(`lensEquation: solved di=${value}`);
      return { solved: 'di', value };
    }
    const value = 1 / (1 / do_ + 1 / di);
    this._recordHistory(`lensEquation: default solved f=${value}`);
    return { solved: 'f', value };
  }

  /**
   * 转换为数据包
   * Serialize to DataPacket
   */
  public toPacket(): DataPacket<{
    charges: number;
    fields: number;
    waves: number;
    history: string[];
  }> {
    return {
      id: `em-${Date.now()}-${this._counter}`,
      payload: {
        charges: this._charges.size,
        fields: this._fields.size,
        waves: this._waves.size,
        history: [...this._history],
      },
      metadata: {
        createdAt: Date.now(),
        route: ['physics', 'electromagnetism'],
        priority: 0.85,
        phase: 'analysis',
      },
    };
  }

  /**
   * 重置状态
   * Reset internal state
   */
  public reset(): void {
    this._charges.clear();
    this._fields.clear();
    this._waves.clear();
    this._history = [];
    this._counter = 0;
  }

  // ─── Private helpers ───

  private _generateId(): string {
    return `em-${(++this._counter).toString(36)}-${Date.now().toString(36)}`;
  }

  private _recordHistory(entry: string): void {
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
  }

  /** 暴露库仑常数。 */
  public static readonly COULOMB = K_E;
  /** 暴露真空介电常数。 */
  public static readonly EPSILON_0 = EPSILON_0;
  /** 暴露真空磁导率。 */
  public static readonly MU_0 = MU_0;
  /** 暴露光速。 */
  public static readonly C = C_LIGHT;
}
