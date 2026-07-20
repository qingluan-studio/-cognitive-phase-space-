/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 电磁学 —— 场与波的交响
 * Electromagnetism: Symphony of Fields and Waves
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 从库仑定律到麦克斯韦方程组，电磁学统一了电、磁与光。
 * 电荷激发电场，电流产生磁场，变化的场又相互感应，最终编织出光的波纹。
 *
 * 本模块覆盖：库仑/高斯/欧姆/基尔霍夫定律、毕奥-萨伐尔/安培/法拉第定律、
 * 麦克斯韦方程组、电容器与电感器储能、RLC 电路、电磁波、坡印廷矢量、
 * 偶极辐射、相对论修正等。
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

/** 偶极矩：电偶极或磁偶极。 */
export interface DipoleMoment {
  readonly magnitude: number;
  readonly direction: [number, number, number];
  readonly type: 'electric' | 'magnetic';
}

/** 电路元件描述。 */
export interface CircuitElement {
  readonly kind: 'resistor' | 'capacitor' | 'inductor' | 'emf' | 'diode';
  readonly value: number;
  readonly unit: string;
  readonly label: string;
}

/** 交流电路阻抗。 */
export interface Impedance {
  readonly resistance: number;
  readonly reactance: number;
  readonly magnitude: number;
  readonly phase: number;
  readonly admittance: number;
}

/** 电容器储能描述。 */
export interface CapacitorEnergy {
  readonly energy: number;
  readonly energyDensity: number;
  readonly charge: number;
  readonly voltage: number;
}

/** 电感器储能描述。 */
export interface InductorEnergy {
  readonly energy: number;
  readonly energyDensity: number;
  readonly flux: number;
  readonly current: number;
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

type CircuitRecord = {
  readonly id: string;
  readonly elements: CircuitElement[];
  readonly impedance: Impedance;
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
/** 基本电荷 e (C)。 */
const E_CHARGE = 1.602176634e-19;
/** 电子质量 m_e (kg)。 */
const M_E = 9.1093837015e-31;

export class Electromagnetism {
  private _charges: Map<string, ChargeRecord> = new Map();
  private _fields: Map<string, FieldRecord> = new Map();
  private _waves: Map<string, WaveRecord> = new Map();
  private _circuits: Map<string, CircuitRecord> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get chargeCount(): number { return this._charges.size; }
  get fieldCount(): number { return this._fields.size; }
  get waveCount(): number { return this._waves.size; }
  get circuitCount(): number { return this._circuits.size; }
  get history(): string[] { return [...this._history]; }

  /**
   * 库仑定律：F = k_e * q1*q2 / r^2
   * Coulomb's Law
   */
  public coulombsLaw(q1: number, q2: number, r: number): {
    force: number;
    attractive: boolean;
    potentialEnergy: number;
  } {
    if (r <= 0) throw new Error('Distance must be positive');
    const force = (K_E * q1 * q2) / (r * r);
    const attractive = q1 * q2 < 0;
    const potentialEnergy = (K_E * q1 * q2) / r;
    this._recordHistory(`coulombsLaw: q1=${q1}, q2=${q2}, r=${r} -> F=${force}`);
    return { force, attractive, potentialEnergy };
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
   * 多电荷叠加电场（矢量合成）
   * Net electric field from multiple point charges
   */
  public netElectricField(
    charges: Array<{ q: number; position: [number, number, number] }>,
    point: [number, number, number],
  ): { field: [number, number, number]; magnitude: number } {
    let Ex = 0, Ey = 0, Ez = 0;
    for (const c of charges) {
      const dx = point[0] - c.position[0];
      const dy = point[1] - c.position[1];
      const dz = point[2] - c.position[2];
      const r2 = dx * dx + dy * dy + dz * dz;
      if (r2 === 0) continue;
      const r = Math.sqrt(r2);
      const E = (K_E * c.q) / r2;
      Ex += E * dx / r;
      Ey += E * dy / r;
      Ez += E * dz / r;
    }
    const magnitude = Math.sqrt(Ex * Ex + Ey * Ey + Ez * Ez);
    this._recordHistory(`netElectricField: ${charges.length} charges -> |E|=${magnitude}`);
    return { field: [Ex, Ey, Ez], magnitude };
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
   * 高斯面电场（球对称）：E = Q / (4π * ε_0 * r²)
   * Gauss's law for spherical symmetry
   */
  public gaussSpherical(Q: number, r: number): { E: number; flux: number } {
    if (r <= 0) throw new Error('r must be positive');
    const E = Q / (4 * Math.PI * EPSILON_0 * r * r);
    const flux = Q / EPSILON_0;
    this._recordHistory(`gaussSpherical: Q=${Q}, r=${r} -> E=${E}`);
    return { E, flux };
  }

  /**
   * 无限长直导线电场（线电荷密度 λ）：E = λ / (2π * ε_0 * r)
   * Field of infinite line charge
   */
  public lineChargeField(lambda: number, r: number): number {
    if (r <= 0) throw new Error('r must be positive');
    const E = lambda / (2 * Math.PI * EPSILON_0 * r);
    this._recordHistory(`lineChargeField: λ=${lambda}, r=${r} -> E=${E}`);
    return E;
  }

  /**
   * 无限大平面电场（面电荷密度 σ）：E = σ / (2 * ε_0)
   * Field of infinite plane of charge
   */
  public planeChargeField(sigma: number): number {
    const E = sigma / (2 * EPSILON_0);
    this._recordHistory(`planeChargeField: σ=${sigma} -> E=${E}`);
    return E;
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
   * 多电荷叠加电势
   * Electric potential from multiple point charges
   */
  public netPotential(
    charges: Array<{ q: number; position: [number, number, number] }>,
    point: [number, number, number],
  ): number {
    let V = 0;
    for (const c of charges) {
      const dx = point[0] - c.position[0];
      const dy = point[1] - c.position[1];
      const dz = point[2] - c.position[2];
      const r = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (r === 0) continue;
      V += (K_E * c.q) / r;
    }
    this._recordHistory(`netPotential: ${charges.length} charges -> V=${V}`);
    return V;
  }

  /**
   * 电偶极子电势：V = (k_e * p * cos(θ)) / r²
   * Electric dipole potential
   */
  public dipolePotential(p: number, r: number, theta: number): number {
    if (r <= 0) throw new Error('r must be positive');
    const V = (K_E * p * Math.cos(theta)) / (r * r);
    this._recordHistory(`dipolePotential: p=${p}, r=${r}, θ=${theta} -> V=${V}`);
    return V;
  }

  /**
   * 电偶极子电场（远场近似）
   * Electric dipole field (far-field)
   */
  public dipoleField(p: number, r: number, theta: number): {
    radial: number;
    angular: number;
    magnitude: number;
  } {
    if (r <= 0) throw new Error('r must be positive');
    const Er = (2 * K_E * p * Math.cos(theta)) / (r * r * r);
    const Etheta = (K_E * p * Math.sin(theta)) / (r * r * r);
    const magnitude = Math.sqrt(Er * Er + Etheta * Etheta);
    this._recordHistory(`dipoleField: p=${p}, r=${r}, θ=${theta} -> |E|=${magnitude}`);
    return { radial: Er, angular: Etheta, magnitude };
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
   * 圆柱形电容器：C = 2π * ε * L / ln(b/a)
   * Cylindrical capacitor
   */
  public cylindricalCapacitor(epsilon: number, L: number, a: number, b: number): number {
    if (a <= 0 || b <= a || L <= 0) {
      throw new Error('Need L > 0, b > a > 0');
    }
    if (epsilon < 0) throw new Error('ε must be non-negative');
    const C = (2 * Math.PI * epsilon * L) / Math.log(b / a);
    this._recordHistory(`cylindricalCapacitor: L=${L}, a=${a}, b=${b} -> C=${C}`);
    return C;
  }

  /**
   * 球形电容器：C = 4π * ε * (a*b) / (b-a)
   * Spherical capacitor
   */
  public sphericalCapacitor(epsilon: number, a: number, b: number): number {
    if (a <= 0 || b <= a) throw new Error('Need b > a > 0');
    if (epsilon < 0) throw new Error('ε must be non-negative');
    const C = (4 * Math.PI * epsilon * a * b) / (b - a);
    this._recordHistory(`sphericalCapacitor: a=${a}, b=${b} -> C=${C}`);
    return C;
  }

  /**
   * 电容器储能：U = (1/2) * C * V² = Q²/(2C)
   * Energy stored in a capacitor
   */
  public capacitorEnergy(C: number, V: number, volume: number = 1): CapacitorEnergy {
    if (C < 0 || V < 0) throw new Error('C and V must be non-negative');
    const energy = 0.5 * C * V * V;
    const charge = C * V;
    const energyDensity = volume > 0 ? energy / volume : 0;
    this._recordHistory(`capacitorEnergy: C=${C}, V=${V} -> U=${energy}`);
    return { energy, energyDensity, charge, voltage: V };
  }

  /**
   * 电场能量密度：u = (1/2) * ε_0 * E²
   * Electric field energy density
   */
  public electricEnergyDensity(E: number, epsilon: number = EPSILON_0): number {
    if (E < 0) throw new Error('E must be non-negative');
    if (epsilon < 0) throw new Error('ε must be non-negative');
    const u = 0.5 * epsilon * E * E;
    this._recordHistory(`electricEnergyDensity: E=${E} -> u=${u}`);
    return u;
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
   * 电阻率：R = ρ * L / A
   * Resistivity and resistance
   */
  public resistance(rho: number, L: number, A: number): { R: number; conductivity: number } {
    if (A <= 0) throw new Error('A must be positive');
    if (rho < 0 || L < 0) throw new Error('ρ and L must be non-negative');
    const R = (rho * L) / A;
    const conductivity = rho > 0 ? 1 / rho : 0;
    this._recordHistory(`resistance: ρ=${rho}, L=${L}, A=${A} -> R=${R}`);
    return { R, conductivity };
  }

  /**
   * 电导率温度依赖：ρ(T) = ρ_0 * (1 + α * ΔT)
   * Temperature dependence of resistivity
   */
  public resistivityTemperature(rho0: number, alpha: number, dT: number): number {
    const rho = rho0 * (1 + alpha * dT);
    this._recordHistory(`resistivityTemperature: ρ_0=${rho0}, α=${alpha}, ΔT=${dT} -> ρ=${rho}`);
    return rho;
  }

  /**
   * 电功率：P = V * I = I² * R = V² / R
   * Electric power
   */
  public electricPower(V: number, I: number, R: number = 0): {
    powerVI: number;
    powerI2R: number;
    powerV2R: number;
  } {
    const powerVI = V * I;
    const powerI2R = I * I * R;
    const powerV2R = R > 0 ? (V * V) / R : 0;
    this._recordHistory(`electricPower: V=${V}, I=${I}, R=${R} -> P=${powerVI}`);
    return { powerVI, powerI2R, powerV2R };
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
   * 串联电容：1/C = Σ 1/C_i
   * Series capacitance
   */
  public seriesCapacitance(capacitors: number[]): number {
    if (capacitors.length === 0) throw new Error('At least one capacitor required');
    let sumReciprocal = 0;
    for (const c of capacitors) {
      if (c === 0) return 0;
      sumReciprocal += 1 / c;
    }
    const total = 1 / sumReciprocal;
    this._recordHistory(`seriesCapacitance: ${capacitors.length} capacitors -> C=${total}`);
    return total;
  }

  /**
   * 并联电容：C = Σ C_i
   * Parallel capacitance
   */
  public parallelCapacitance(capacitors: number[]): number {
    if (capacitors.length === 0) throw new Error('At least one capacitor required');
    const total = capacitors.reduce((acc, c) => acc + c, 0);
    this._recordHistory(`parallelCapacitance: ${capacitors.length} capacitors -> C=${total}`);
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
   * 载流导线在磁场中受力：F = I * L × B
   * Force on a current-carrying wire
   */
  public wireForce(I: number, L: [number, number, number], B: [number, number, number]): {
    force: [number, number, number];
    magnitude: number;
  } {
    const fx = I * (L[1] * B[2] - L[2] * B[1]);
    const fy = I * (L[2] * B[0] - L[0] * B[2]);
    const fz = I * (L[0] * B[1] - L[1] * B[0]);
    const magnitude = Math.sqrt(fx * fx + fy * fy + fz * fz);
    this._recordHistory(`wireForce: I=${I}, |L|=${Math.hypot(...L)} -> |F|=${magnitude}`);
    return { force: [fx, fy, fz], magnitude };
  }

  /**
   * 两平行导线间力：F/L = (μ_0 * I1 * I2) / (2π * d)
   * Force between two parallel wires
   */
  public parallelWiresForce(I1: number, I2: number, d: number, length: number): {
    force: number;
    forcePerLength: number;
    attractive: boolean;
  } {
    if (d <= 0) throw new Error('d must be positive');
    const forcePerLength = (MU_0 * I1 * I2) / (2 * Math.PI * d);
    const force = forcePerLength * length;
    const attractive = I1 * I2 > 0;
    this._recordHistory(`parallelWiresForce: I1=${I1}, I2=${I2}, d=${d} -> F=${force}`);
    return { force, forcePerLength, attractive };
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
   * 圆形电流回路中心磁场：B = μ_0 * I / (2 * R)
   * Magnetic field at center of circular loop
   */
  public loopField(I: number, R: number): number {
    if (R <= 0) throw new Error('R must be positive');
    const B = (MU_0 * I) / (2 * R);
    this._recordHistory(`loopField: I=${I}, R=${R} -> B=${B}`);
    return B;
  }

  /**
   * 螺线管内部磁场：B = μ_0 * n * I
   * Solenoid magnetic field (interior)
   */
  public solenoidField(I: number, n: number, mu: number = MU_0): number {
    if (n < 0) throw new Error('n must be non-negative');
    if (mu < 0) throw new Error('μ must be non-negative');
    const B = mu * n * I;
    this._recordHistory(`solenoidField: I=${I}, n=${n} -> B=${B}`);
    return B;
  }

  /**
   * 磁偶极矩：μ = N * I * A
   * Magnetic dipole moment
   */
  public magneticDipoleMoment(N: number, I: number, A: number): DipoleMoment {
    if (N < 0 || A < 0) throw new Error('N and A must be non-negative');
    const magnitude = N * I * A;
    const dipole: DipoleMoment = {
      magnitude,
      direction: [0, 0, 1],
      type: 'magnetic',
    };
    this._recordHistory(`magneticDipoleMoment: N=${N}, I=${I}, A=${A} -> μ=${magnitude}`);
    return dipole;
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
   * 动生电动势：EMF = B * L * v
   * Motional EMF
   */
  public motionalEMF(B: number, L: number, v: number, angle: number = Math.PI / 2): {
    emf: number;
    maxEmf: number;
  } {
    if (B < 0 || L < 0 || v < 0) throw new Error('B, L, v must be non-negative');
    const emf = B * L * v * Math.sin(angle);
    const maxEmf = B * L * v;
    this._recordHistory(`motionalEMF: B=${B}, L=${L}, v=${v}, θ=${angle} -> EMF=${emf}`);
    return { emf, maxEmf };
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
   * 自感：ε = -L * dI/dt
   * Self-inductance
   */
  public selfInductance(L: number, dIdt: number): { emf: number; flux: number } {
    const emf = -L * dIdt;
    const flux = L * dIdt;
    this._recordHistory(`selfInductance: L=${L}, dI/dt=${dIdt} -> EMF=${emf}`);
    return { emf, flux };
  }

  /**
   * 螺线管自感：L = μ_0 * N² * A / l
   * Self-inductance of a solenoid
   */
  public solenoidInductance(N: number, A: number, l: number, mu: number = MU_0): number {
    if (l <= 0 || A < 0) throw new Error('l must be positive, A non-negative');
    if (mu < 0) throw new Error('μ must be non-negative');
    const L = (mu * N * N * A) / l;
    this._recordHistory(`solenoidInductance: N=${N}, A=${A}, l=${l} -> L=${L}`);
    return L;
  }

  /**
   * 互感：M = N_2 * Φ_21 / I_1
   * Mutual inductance
   */
  public mutualInductance(N2: number, flux21: number, I1: number): number {
    if (I1 === 0) throw new Error('I1 must be non-zero');
    const M = (N2 * flux21) / I1;
    this._recordHistory(`mutualInductance: N2=${N2}, Φ_21=${flux21}, I1=${I1} -> M=${M}`);
    return M;
  }

  /**
   * 电感器储能：U = (1/2) * L * I²
   * Energy stored in an inductor
   */
  public inductorEnergy(L: number, I: number, volume: number = 1): InductorEnergy {
    if (L < 0 || I < 0) throw new Error('L and I must be non-negative');
    const energy = 0.5 * L * I * I;
    const flux = L * I;
    const energyDensity = volume > 0 ? energy / volume : 0;
    this._recordHistory(`inductorEnergy: L=${L}, I=${I} -> U=${energy}`);
    return { energy, energyDensity, flux, current: I };
  }

  /**
   * 磁场能量密度：u = B² / (2 * μ_0)
   * Magnetic field energy density
   */
  public magneticEnergyDensity(B: number, mu: number = MU_0): number {
    if (B < 0) throw new Error('B must be non-negative');
    if (mu <= 0) throw new Error('μ must be positive');
    const u = (B * B) / (2 * mu);
    this._recordHistory(`magneticEnergyDensity: B=${B} -> u=${u}`);
    return u;
  }

  /**
   * RL 电路时间常数：τ = L / R
   * RL circuit time constant
   */
  public rlTimeConstant(L: number, R: number): { tau: number; currentDecay: string } {
    if (R <= 0) throw new Error('R must be positive');
    if (L < 0) throw new Error('L must be non-negative');
    const tau = L / R;
    this._recordHistory(`rlTimeConstant: L=${L}, R=${R} -> τ=${tau}`);
    return { tau, currentDecay: `I(t) = I_0 * exp(-t/${tau.toFixed(4)})` };
  }

  /**
   * RC 电路时间常数：τ = R * C
   * RC circuit time constant
   */
  public rcTimeConstant(R: number, C: number): { tau: number; voltageDecay: string } {
    if (R < 0 || C < 0) throw new Error('R and C must be non-negative');
    const tau = R * C;
    this._recordHistory(`rcTimeConstant: R=${R}, C=${C} -> τ=${tau}`);
    return { tau, voltageDecay: `V(t) = V_0 * exp(-t/${tau.toFixed(4)})` };
  }

  /**
   * LC 电路振荡频率：f = 1 / (2π * √(LC))
   * LC circuit oscillation frequency
   */
  public lcFrequency(L: number, C: number): {
    frequency: number;
    angularFrequency: number;
    period: number;
  } {
    if (L <= 0 || C <= 0) throw new Error('L and C must be positive');
    const omega = 1 / Math.sqrt(L * C);
    const frequency = omega / (2 * Math.PI);
    const period = 1 / frequency;
    this._recordHistory(`lcFrequency: L=${L}, C=${C} -> f=${frequency}`);
    return { frequency, angularFrequency: omega, period };
  }

  /**
   * RLC 串联电路阻抗
   * Series RLC impedance
   */
  public rlcSeriesImpedance(R: number, L: number, C: number, frequency: number): Impedance {
    if (R < 0 || L < 0 || C < 0) throw new Error('R, L, C must be non-negative');
    if (frequency < 0) throw new Error('frequency must be non-negative');
    if (C === 0) throw new Error('C must be non-zero');
    const omega = 2 * Math.PI * frequency;
    const XL = omega * L;
    const XC = 1 / (omega * C);
    const reactance = XL - XC;
    const magnitude = Math.sqrt(R * R + reactance * reactance);
    const phase = Math.atan2(reactance, R);
    const admittance = magnitude > 0 ? 1 / magnitude : 0;
    this._recordHistory(`rlcSeriesImpedance: R=${R}, L=${L}, C=${C}, f=${frequency} -> |Z|=${magnitude}`);
    return { resistance: R, reactance, magnitude, phase, admittance };
  }

  /**
   * RLC 谐振频率：f_0 = 1 / (2π * √(LC))
   * Resonance frequency of RLC circuit
   */
  public rlcResonance(L: number, C: number, R: number): {
    resonanceFreq: number;
    qualityFactor: number;
    bandwidth: number;
  } {
    if (L <= 0 || C <= 0 || R <= 0) throw new Error('L, C, R must be positive');
    const omega0 = 1 / Math.sqrt(L * C);
    const Q = (omega0 * L) / R;
    const bandwidth = omega0 / Q;
    this._recordHistory(`rlcResonance: L=${L}, C=${C}, R=${R} -> f_0=${omega0 / (2 * Math.PI)}, Q=${Q}`);
    return {
      resonanceFreq: omega0 / (2 * Math.PI),
      qualityFactor: Q,
      bandwidth: bandwidth / (2 * Math.PI),
    };
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
   * 麦克斯韦方程组（微分形式）
   * Maxwell's Equations in differential form
   */
  public maxwellEquationsDifferential(): {
    gaussElectric: string;
    gaussMagnetic: string;
    faraday: string;
    ampereMaxwell: string;
  } {
    const result = {
      gaussElectric: '∇·E = ρ/ε_0',
      gaussMagnetic: '∇·B = 0',
      faraday: '∇×E = -∂B/∂t',
      ampereMaxwell: '∇×B = μ_0*J + μ_0*ε_0*(∂E/∂t)',
    };
    this._recordHistory('maxwellEquationsDifferential: returned differential form');
    return result;
  }

  /**
   * 位移电流：I_d = ε_0 * dΦ_E/dt
   * Displacement current (Maxwell's correction)
   */
  public displacementCurrent(dPhiE: number, dt: number): number {
    if (dt === 0) throw new Error('dt must be non-zero');
    const Id = EPSILON_0 * (dPhiE / dt);
    this._recordHistory(`displacementCurrent: dΦ_E=${dPhiE}, dt=${dt} -> I_d=${Id}`);
    return Id;
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
   * 电磁波能流密度（坡印廷矢量）：S = (1/μ_0) * E × B
   * Poynting vector
   */
  public poyntingVector(E: number, B: number, mu: number = MU_0): {
    magnitude: number;
    intensity: number;
    radiationPressure: number;
  } {
    if (mu <= 0) throw new Error('μ must be positive');
    if (E < 0 || B < 0) throw new Error('E and B must be non-negative');
    const magnitude = (E * B) / mu;
    const intensity = magnitude;
    const radiationPressure = intensity / C_LIGHT;
    this._recordHistory(`poyntingVector: E=${E}, B=${B} -> |S|=${magnitude}`);
    return { magnitude, intensity, radiationPressure };
  }

  /**
   * 电磁波辐射压强
   * Radiation pressure on a surface
   */
  public radiationPressure(intensity: number, reflectivity: number = 0): number {
    if (intensity < 0) throw new Error('intensity must be non-negative');
    if (reflectivity < 0 || reflectivity > 1) throw new Error('reflectivity must be in [0,1]');
    const pressure = (intensity / C_LIGHT) * (1 + reflectivity);
    this._recordHistory(`radiationPressure: I=${intensity}, R=${reflectivity} -> P=${pressure}`);
    return pressure;
  }

  /**
   * 电磁波谱段判断
   * Electromagnetic spectrum band classification
   */
  public emSpectrumBand(frequency: number): {
    band: string;
    wavelength: number;
    energy: number;
  } {
    if (frequency <= 0) throw new Error('frequency must be positive');
    const wavelength = C_LIGHT / frequency;
    const energy = 6.62607015e-34 * frequency;
    let band: string;
    if (frequency < 3e9) band = 'radio';
    else if (frequency < 3e11) band = 'microwave';
    else if (frequency < 4.3e14) band = 'infrared';
    else if (frequency < 7.5e14) band = 'visible';
    else if (frequency < 3e16) band = 'ultraviolet';
    else if (frequency < 3e19) band = 'X-ray';
    else band = 'gamma-ray';
    this._recordHistory(`emSpectrumBand: f=${frequency} -> band=${band}`);
    return { band, wavelength, energy };
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
   * 霍尔效应：V_H = (I * B) / (n * q * t)
   * Hall effect voltage
   */
  public hallEffect(I: number, B: number, n: number, q: number, t: number): {
    hallVoltage: number;
    hallCoefficient: number;
  } {
    if (n <= 0 || q === 0 || t === 0) {
      throw new Error('n, q, t must be non-zero; n positive');
    }
    const hallVoltage = (I * B) / (n * q * t);
    const hallCoefficient = 1 / (n * q);
    this._recordHistory(`hallEffect: I=${I}, B=${B}, n=${n} -> V_H=${hallVoltage}`);
    return { hallVoltage, hallCoefficient };
  }

  /**
   * 电子在磁场中的回旋频率：ω_c = q * B / m
   * Cyclotron frequency
   */
  public cyclotronFrequency(B: number, q: number = E_CHARGE, m: number = M_E): {
    angularFrequency: number;
    frequency: number;
    period: number;
    radius: number;
  } {
    if (B < 0) throw new Error('B must be non-negative');
    if (m <= 0) throw new Error('m must be positive');
    const omega = (q * B) / m;
    const frequency = omega / (2 * Math.PI);
    const period = frequency > 0 ? 1 / frequency : Infinity;
    const radius = 0;
    this._recordHistory(`cyclotronFrequency: B=${B}, q=${q}, m=${m} -> ω=${omega}`);
    return { angularFrequency: omega, frequency, period, radius };
  }

  /**
   * 回旋半径：r = m * v / (q * B)
   * Cyclotron radius
   */
  public cyclotronRadius(m: number, v: number, q: number, B: number): number {
    if (q === 0) throw new Error('q must be non-zero');
    if (B === 0) throw new Error('B must be non-zero');
    const r = (m * v) / Math.abs(q * B);
    this._recordHistory(`cyclotronRadius: m=${m}, v=${v}, q=${q}, B=${B} -> r=${r}`);
    return r;
  }

  /**
   * 趋肤效应深度：δ = √(2 / (μ * σ * ω))
   * Skin depth in a conductor
   */
  public skinDepth(sigma: number, mu: number, frequency: number): number {
    if (sigma <= 0 || mu <= 0 || frequency <= 0) {
      throw new Error('σ, μ, frequency must be positive');
    }
    const omega = 2 * Math.PI * frequency;
    const delta = Math.sqrt(2 / (mu * sigma * omega));
    this._recordHistory(`skinDepth: σ=${sigma}, μ=${mu}, f=${frequency} -> δ=${delta}`);
    return delta;
  }

  /**
   * 等离子体频率：ω_p = √(n * e² / (ε_0 * m_e))
   * Plasma frequency
   */
  public plasmaFrequency(n: number): {
    angularFrequency: number;
    frequency: number;
  } {
    if (n < 0) throw new Error('n must be non-negative');
    const omega = Math.sqrt((n * E_CHARGE * E_CHARGE) / (EPSILON_0 * M_E));
    this._recordHistory(`plasmaFrequency: n=${n} -> ω_p=${omega}`);
    return { angularFrequency: omega, frequency: omega / (2 * Math.PI) };
  }

  /**
   * 洛伦兹力（电磁合力）：F = q(E + v × B)
   * Lorentz force
   */
  public lorentzForce(
    q: number,
    E: [number, number, number],
    v: [number, number, number],
    B: [number, number, number],
  ): { force: [number, number, number]; magnitude: number } {
    const fx = q * (E[0] + (v[1] * B[2] - v[2] * B[1]));
    const fy = q * (E[1] + (v[2] * B[0] - v[0] * B[2]));
    const fz = q * (E[2] + (v[0] * B[1] - v[1] * B[0]));
    const magnitude = Math.sqrt(fx * fx + fy * fy + fz * fz);
    this._recordHistory(`lorentzForce: q=${q} -> |F|=${magnitude}`);
    return { force: [fx, fy, fz], magnitude };
  }

  /**
   * 磁通量：Φ = B * A * cos(θ)
   * Magnetic flux
   */
  public magneticFlux(B: number, A: number, theta: number = 0): number {
    if (B < 0 || A < 0) throw new Error('B and A must be non-negative');
    const flux = B * A * Math.cos(theta);
    this._recordHistory(`magneticFlux: B=${B}, A=${A}, θ=${theta} -> Φ=${flux}`);
    return flux;
  }

  /**
   * 电荷在电场中的电势能：U = q * V
   * Electric potential energy
   */
  public electricPotentialEnergy(q: number, V: number): number {
    const U = q * V;
    this._recordHistory(`electricPotentialEnergy: q=${q}, V=${V} -> U=${U}`);
    return U;
  }

  /**
   * 偶极子在电场中的力矩：τ = p × E
   * Torque on an electric dipole
   */
  public dipoleTorque(p: number, E: number, theta: number): {
    torque: number;
    potentialEnergy: number;
  } {
    const torque = p * E * Math.sin(theta);
    const potentialEnergy = -p * E * Math.cos(theta);
    this._recordHistory(`dipoleTorque: p=${p}, E=${E}, θ=${theta} -> τ=${torque}`);
    return { torque, potentialEnergy };
  }

  /**
   * 安培-麦克斯韦定律中的位移电流密度：J_d = ε_0 * ∂E/∂t
   * Displacement current density
   */
  public displacementCurrentDensity(dE: number, dt: number): number {
    if (dt === 0) throw new Error('dt must be non-zero');
    const Jd = EPSILON_0 * (dE / dt);
    this._recordHistory(`displacementCurrentDensity: dE=${dE}, dt=${dt} -> J_d=${Jd}`);
    return Jd;
  }

  /**
   * 电磁波总能量密度：u = (ε_0 * E² + B²/μ_0) / 2
   * Total EM energy density
   */
  public emEnergyDensity(E: number, B: number): {
    electric: number;
    magnetic: number;
    total: number;
  } {
    if (E < 0 || B < 0) throw new Error('E and B must be non-negative');
    const electric = 0.5 * EPSILON_0 * E * E;
    const magnetic = (B * B) / (2 * MU_0);
    const total = electric + magnetic;
    this._recordHistory(`emEnergyDensity: E=${E}, B=${B} -> u=${total}`);
    return { electric, magnetic, total };
  }

  /**
   * 转换为数据包
   * Serialize to DataPacket
   */
  public toPacket(): DataPacket<{
    charges: number;
    fields: number;
    waves: number;
    circuits: number;
    history: string[];
  }> {
    return {
      id: `em-${Date.now()}-${this._counter}`,
      payload: {
        charges: this._charges.size,
        fields: this._fields.size,
        waves: this._waves.size,
        circuits: this._circuits.size,
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
    this._circuits.clear();
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
  /** 暴露基本电荷。 */
  public static readonly E_CHARGE = E_CHARGE;
  /** 暴露电子质量。 */
  public static readonly M_E = M_E;
}
