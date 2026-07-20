/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 光学 —— 反射、折射与干涉的几何
 * Optics: The Geometry of Reflection, Refraction, and Interference
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 从费马原理到傅里叶光学，光学既是几何的也是波动的。
 * 光线在界面弯折，波前在缝隙衍射，偏振在介质中翻转——皆遵循麦克斯韦的统御。
 *
 * 覆盖范围：
 *  - 几何光学：反射、折射、Snell 定律、临界角、全反射
 *  - 透镜：薄透镜方程、复合透镜、放大率、镜面公式
 *  - 球面镜：凹/凸面镜、焦距、像距
 *  - 棱镜：偏转角、色散、最小偏转
 *  - 干涉：杨氏双缝、薄膜、牛顿环、迈克尔逊、法布里-珀罗
 *  - 衍射：单缝、双缝、光栅、圆孔（艾里斑）、巴比涅原理
 *  - 偏振：马吕斯定律、布儒斯特角、波片、琼斯矢量
 *  - 色散：柯西公式、Sellmeier 公式、群速度、相速度
 *  - 黑体辐射：普朗克、维恩、Stefan-Boltzmann
 *  - 激光：相干长度、阈值条件、光斑大小
 *  - 傅里叶光学：传递函数、空间频率
 *  - 大气光学：瑞利散射、米氏散射、彩虹角
 *  - 几何光学：光程、费马原理、拉格朗日不变量
 *  - 光纤：数值孔径、模式数、损耗
 *  - 像差：球差、彗差、色差
 */

import { DataPacket } from '../shared/types';

/** 光线：波长、强度与方向。 */
export interface LightRay {
  readonly wavelength: number;
  readonly intensity: number;
  readonly direction: [number, number, number];
}

/** 透镜：焦距与类型。 */
export interface Lens {
  readonly focalLength: number;
  readonly type: 'converging' | 'diverging';
}

/** 反射镜：焦距与类型。 */
export interface Mirror {
  readonly focalLength: number;
  readonly type: 'concave' | 'convex' | 'plane';
}

/** 干涉图样：条纹间距、可见度与级数。 */
export interface InterferencePattern {
  readonly fringeSpacing: number;
  readonly visibility: number;
  readonly maxOrder: number;
}

/** 光谱波段划分。 */
export interface SpectrumBand {
  readonly name: string;
  readonly minWavelength: number;
  readonly maxWavelength: number;
  readonly frequency: number;
  readonly energy: number;
}

/** 偏振态（琼斯矢量简化）。 */
export interface JonesVector {
  readonly ex: number;
  readonly ey: number;
  readonly polarization: 'linear' | 'circular' | 'elliptical';
  readonly angle: number;
}

/** 色散关系描述。 */
export interface DispersionRelation {
  readonly cauchyA: number;
  readonly cauchyB: number;
  readonly groupVelocity: number;
  readonly phaseVelocity: number;
}

/** 像差描述。 */
export interface Aberration {
  readonly type: 'spherical' | 'coma' | 'chromatic' | 'astigmatism';
  readonly magnitude: number;
  readonly correction: string;
}

/** 像的形成（像距、放大率、虚实、倒正）。 */
export interface ImageFormation {
  readonly imageDistance: number;
  readonly magnification: number;
  readonly real: boolean;
  readonly inverted: boolean;
  readonly description: string;
}

type RayRecord = {
  readonly id: string;
  readonly ray: LightRay;
  readonly timestamp: number;
};

type LensRecord = {
  readonly id: string;
  readonly lens: Lens;
  readonly timestamp: number;
};

type MirrorRecord = {
  readonly id: string;
  readonly mirror: Mirror;
  readonly timestamp: number;
};

type PatternRecord = {
  readonly id: string;
  readonly pattern: InterferencePattern;
  readonly timestamp: number;
};

/** 真空光速 (m/s)。 */
const C_LIGHT = 299792458;
/** 普朗克常数 (J·s)。 */
const H_PLANCK = 6.62607015e-34;
/** 玻尔兹曼常数 (J/K)。 */
const K_B = 1.380649e-23;
/** 斯特藩-玻尔兹曼常数 (W·m⁻²·K⁻⁴)。 */
const SIGMA_SB = 5.670374419e-8;
/** 维恩位移常数 (m·K)。 */
const B_WIEN = 2.897771955e-3;
/** 电子伏特 (J)。 */
const EV = 1.602176634e-19;

export class Optics {
  private _rays: Map<string, RayRecord> = new Map();
  private _lenses: Map<string, LensRecord> = new Map();
  private _mirrors: Map<string, MirrorRecord> = new Map();
  private _patterns: Map<string, PatternRecord> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get rayCount(): number { return this._rays.size; }
  get lensCount(): number { return this._lenses.size; }
  get mirrorCount(): number { return this._mirrors.size; }
  get patternCount(): number { return this._patterns.size; }
  get history(): string[] { return [...this._history]; }

  // ─── 几何光学基础 ───

  /**
   * 反射定律：θ_in = θ_out
   * Law of reflection
   */
  public reflection(angleIn: number, normal: number): {
    angleOut: number;
    deviation: number;
  } {
    const angleOut = 2 * normal - angleIn;
    const deviation = Math.abs(angleOut - angleIn);
    this._recordHistory(`reflection: θ_in=${angleIn}, n=${normal} -> θ_out=${angleOut}`);
    return { angleOut, deviation };
  }

  /**
   * 折射定律：n1*sin(θ1) = n2*sin(θ2)
   * Snell's Law of refraction
   */
  public refraction(n1: number, angle1: number, n2: number): {
    angle2: number;
    totalInternal: boolean;
  } {
    if (n1 <= 0 || n2 <= 0) throw new Error('Refractive indices must be positive');
    const sinTheta2 = (n1 * Math.sin(angle1)) / n2;
    if (Math.abs(sinTheta2) > 1) {
      this._recordHistory(`refraction: total internal reflection at θ1=${angle1}`);
      return { angle2: NaN, totalInternal: true };
    }
    const angle2 = Math.asin(sinTheta2);
    this._recordHistory(`refraction: n1=${n1}, θ1=${angle1}, n2=${n2} -> θ2=${angle2}`);
    return { angle2, totalInternal: false };
  }

  /**
   * 光程：OPL = ∫ n ds
   * Optical path length
   */
  public opticalPathLength(n: number, distance: number): number {
    if (n < 0 || distance < 0) throw new Error('n and distance must be non-negative');
    const opl = n * distance;
    this._recordHistory(`opticalPathLength: n=${n}, d=${distance} -> OPL=${opl}`);
    return opl;
  }

  /**
   * 费马原理：光程取极值
   * Fermat's principle (verification)
   */
  public fermatPrinciple(
    path1: { n: number; d: number },
    path2: { n: number; d: number },
  ): { path1OPL: number; path2OPL: number; extremal: 1 | 2 | 'equal' } {
    const o1 = path1.n * path1.d;
    const o2 = path2.n * path2.d;
    let extremal: 1 | 2 | 'equal';
    if (Math.abs(o1 - o2) < 1e-12) extremal = 'equal';
    else extremal = o1 < o2 ? 1 : 2;
    this._recordHistory(`fermatPrinciple: extremal=${extremal}`);
    return { path1OPL: o1, path2OPL: o2, extremal };
  }

  // ─── 透镜与成像 ───

  /**
   * 薄透镜方程：1/f = 1/d_o + 1/d_i
   * Thin lens equation
   */
  public thinLens(f: number, do_: number, di: number): {
    solved: 'f' | 'do' | 'di';
    value: number;
  } {
    if (f === 0 && do_ !== 0 && di !== 0) {
      const value = 1 / (1 / do_ + 1 / di);
      this._recordHistory(`thinLens: solved f=${value}`);
      return { solved: 'f', value };
    }
    if (do_ === 0 && f !== 0 && di !== 0) {
      const value = 1 / (1 / f - 1 / di);
      this._recordHistory(`thinLens: solved do=${value}`);
      return { solved: 'do', value };
    }
    if (di === 0 && f !== 0 && do_ !== 0) {
      const value = 1 / (1 / f - 1 / do_);
      this._recordHistory(`thinLens: solved di=${value}`);
      return { solved: 'di', value };
    }
    const value = 1 / (1 / do_ + 1 / di);
    this._recordHistory(`thinLens: default solved f=${value}`);
    return { solved: 'f', value };
  }

  /**
   * 放大率：M = -d_i/d_o = h_i/h_o
   * Magnification
   */
  public magnification(hi: number, ho: number, di: number, do_: number): {
    linear: number;
    angular: number;
    inverted: boolean;
  } {
    if (ho === 0 || do_ === 0) throw new Error('ho and do must be non-zero');
    const linear = hi / ho;
    const angular = -di / do_;
    const inverted = angular < 0;
    this._recordHistory(`magnification: M=${angular}, inverted=${inverted}`);
    return { linear, angular, inverted };
  }

  /**
   * 成像分析：给定焦距与物距，求像距及像性质
   * Image formation analysis
   */
  public imageFormation(focalLength: number, objectDistance: number): ImageFormation {
    if (focalLength === 0) throw new Error('Focal length must be non-zero');
    if (objectDistance === 0) throw new Error('Object distance must be non-zero');
    const imageDistance = 1 / (1 / focalLength - 1 / objectDistance);
    const magnification = -imageDistance / objectDistance;
    const real = imageDistance > 0;
    const inverted = magnification < 0;
    let description: string;
    if (focalLength > 0) {
      if (objectDistance > 2 * focalLength) description = 'real, inverted, diminished';
      else if (objectDistance === 2 * focalLength) description = 'real, inverted, same size';
      else if (objectDistance > focalLength) description = 'real, inverted, magnified';
      else description = 'virtual, upright, magnified';
    } else {
      description = 'virtual, upright, diminished';
    }
    this._recordHistory(`imageFormation: f=${focalLength}, do=${objectDistance} -> ${description}`);
    return { imageDistance, magnification, real, inverted, description };
  }

  /**
   * 透镜制造者方程：1/f = (n-1)(1/R1 - 1/R2)
   * Lensmaker's equation
   */
  public lensmaker(n: number, R1: number, R2: number): number {
    if (n <= 1) throw new Error('Refractive index must be greater than 1');
    const f = 1 / ((n - 1) * (1 / R1 - 1 / R2));
    this._recordHistory(`lensmaker: n=${n}, R1=${R1}, R2=${R2} -> f=${f}`);
    return f;
  }

  /**
   * 复合透镜：1/f = 1/f1 + 1/f2 - d/(f1*f2)
   * Compound lens (two lenses separated by distance d)
   */
  public compoundLens(f1: number, f2: number, d: number): number {
    if (f1 === 0 || f2 === 0) throw new Error('Individual focal lengths must be non-zero');
    const f = 1 / (1 / f1 + 1 / f2 - d / (f1 * f2));
    this._recordHistory(`compoundLens: f1=${f1}, f2=${f2}, d=${d} -> f=${f}`);
    return f;
  }

  /**
   * 透镜焦度（屈光度）：P = 1/f (m⁻¹)
   */
  public lensPower(focalLength: number): number {
    if (focalLength === 0) throw new Error('Focal length must be non-zero');
    const power = 1 / focalLength;
    this._recordHistory(`lensPower: f=${focalLength} -> P=${power} D`);
    return power;
  }

  /**
   * 球面镜方程：1/f = 1/d_o + 1/d_i, f = R/2
   * Spherical mirror equation
   */
  public sphericalMirror(R: number, do_: number): { f: number; di: number; m: number } {
    if (R === 0 || do_ === 0) throw new Error('R and do must be non-zero');
    const f = R / 2;
    const di = 1 / (1 / f - 1 / do_);
    const m = -di / do_;
    this._recordHistory(`sphericalMirror: R=${R}, do=${do_} -> di=${di}, m=${m}`);
    return { f, di, m };
  }

  // ─── 棱镜与色散 ───

  /**
   * 棱镜：偏转角 δ = (n - 1) * A
   * Thin prism deviation
   */
  public prism(angle: number, indices: { n_red: number; n_violet: number }): {
    deviationRed: number;
    deviationViolet: number;
    dispersion: number;
  } {
    const deviationRed = (indices.n_red - 1) * angle;
    const deviationViolet = (indices.n_violet - 1) * angle;
    const dispersion = deviationViolet - deviationRed;
    this._recordHistory(
      `prism: A=${angle}, n_r=${indices.n_red}, n_v=${indices.n_violet} -> Δ=${dispersion}`,
    );
    return { deviationRed, deviationViolet, dispersion };
  }

  /**
   * 棱镜最小偏转：n = sin((A+δ_min)/2) / sin(A/2)
   * Minimum deviation through prism
   */
  public prismMinimumDeviation(A: number, n: number): { deltaMin: number; angleOfIncidence: number } {
    if (n <= 1) throw new Error('n must be greater than 1');
    if (A <= 0 || A >= Math.PI) throw new Error('Apex angle must be in (0, π)');
    const sinHalf = Math.sin(A / 2);
    const sinArg = n * sinHalf;
    if (sinArg > 1) throw new Error('Configuration not resolvable');
    const deltaMin = 2 * Math.asin(sinArg) - A;
    const angleOfIncidence = (A + deltaMin) / 2;
    this._recordHistory(`prismMinimumDeviation: A=${A}, n=${n} -> δ_min=${deltaMin}`);
    return { deltaMin, angleOfIncidence };
  }

  /**
   * 柯西色散公式：n(λ) = A + B/λ²
   * Cauchy's dispersion formula
   */
  public cauchyDispersion(lambda: number, A: number, B: number): number {
    if (lambda <= 0) throw new Error('Wavelength must be positive');
    const n = A + B / (lambda * lambda);
    this._recordHistory(`cauchyDispersion: λ=${lambda}, A=${A}, B=${B} -> n=${n}`);
    return n;
  }

  /**
   * Sellmeier 公式：n²(λ) = 1 + Σ B_i λ²/(λ² - C_i)
   * Sellmeier equation
   */
  public sellmeierEquation(
    lambda: number,
    coefficients: Array<{ B: number; C: number }>,
  ): number {
    if (lambda <= 0) throw new Error('Wavelength must be positive');
    const lambdaSq = lambda * lambda;
    let sum = 0;
    for (const c of coefficients) {
      sum += (c.B * lambdaSq) / (lambdaSq - c.C);
    }
    const n = Math.sqrt(1 + sum);
    this._recordHistory(`sellmeierEquation: λ=${lambda} -> n=${n}`);
    return n;
  }

  /**
   * 群速度与相速度
   * Group and phase velocity
   */
  public groupAndPhaseVelocity(
    omega: number,
    k: number,
    dOmega: number,
    dk: number,
  ): { phase: number; group: number; dispersive: boolean } {
    if (k === 0 || dk === 0) throw new Error('k and dk must be non-zero');
    const phase = omega / k;
    const group = dOmega / dk;
    const dispersive = Math.abs(phase - group) > 1e-6;
    this._recordHistory(`groupAndPhaseVelocity: v_p=${phase}, v_g=${group}`);
    return { phase, group, dispersive };
  }

  // ─── 干涉 ───

  /**
   * 杨氏双缝：y_m = m * λ * L / d
   * Young's double-slit interference
   */
  public youngsDoubleSlit(
    wavelength: number,
    slitDist: number,
    screenDist: number,
  ): InterferencePattern {
    if (slitDist <= 0) throw new Error('Slit distance must be positive');
    const fringeSpacing = (wavelength * screenDist) / slitDist;
    const maxOrder = Math.floor(slitDist / wavelength);
    const pattern: InterferencePattern = {
      fringeSpacing,
      visibility: 1,
      maxOrder,
    };
    const id = this._generateId();
    this._patterns.set(id, { id, pattern, timestamp: Date.now() });
    this._recordHistory(
      `youngsDoubleSlit: λ=${wavelength}, d=${slitDist}, L=${screenDist} -> y=${fringeSpacing}`,
    );
    return pattern;
  }

  /**
   * 薄膜干涉：2 n d cos(θ) = (m + 1/2) λ (反射)
   * Thin film interference
   */
  public thinFilmInterference(
    n: number,
    thickness: number,
    wavelength: number,
    order: number,
  ): { cosTheta: number; maxAngle: number; reflected: boolean } {
    if (n <= 0 || thickness <= 0 || wavelength <= 0) {
      throw new Error('Parameters must be positive');
    }
    const cosTheta = ((order + 0.5) * wavelength) / (2 * n * thickness);
    if (Math.abs(cosTheta) > 1) {
      this._recordHistory(`thinFilmInterference: no solution for order=${order}`);
      return { cosTheta: NaN, maxAngle: NaN, reflected: false };
    }
    const maxAngle = Math.acos(cosTheta);
    this._recordHistory(`thinFilmInterference: m=${order}, θ=${maxAngle}`);
    return { cosTheta, maxAngle, reflected: true };
  }

  /**
   * 牛顿环：r_m² = m λ R (亮环)
   * Newton's rings
   */
  public newtonsRings(
    wavelength: number,
    R: number,
    order: number,
  ): { radius: number; diameter: number } {
    if (R <= 0) throw new Error('Radius of curvature must be positive');
    const radius = Math.sqrt(order * wavelength * R);
    const diameter = 2 * radius;
    this._recordHistory(`newtonsRings: m=${order} -> r=${radius}`);
    return { radius, diameter };
  }

  /**
   * 迈克尔逊干涉仪：Δd = m λ / 2
   * Michelson interferometer
   */
  public michelsonInterferometer(
    wavelength: number,
    fringes: number,
  ): { displacement: number; resolution: number } {
    const displacement = (fringes * wavelength) / 2;
    const resolution = wavelength / 2;
    this._recordHistory(`michelsonInterferometer: ${fringes} fringes -> Δd=${displacement}`);
    return { displacement, resolution };
  }

  /**
   * 法布里-珀罗干涉仪：F = π√F / (1 - F)
   * Fabry-Perot finesse and resolution
   */
  public fabryPerot(
    reflectance: number,
    plateSeparation: number,
    wavelength: number,
  ): { finesse: number; freeSpectralRange: number; resolvingPower: number } {
    if (reflectance <= 0 || reflectance >= 1) {
      throw new Error('Reflectance must be in (0, 1)');
    }
    const coefficient = 4 * reflectance / Math.pow(1 - reflectance, 2);
    const finesse = (Math.PI * Math.sqrt(coefficient)) / 2;
    const freeSpectralRange = C_LIGHT / (2 * plateSeparation);
    const resolvingPower = finesse * (2 * plateSeparation) / wavelength;
    this._recordHistory(`fabryPerot: F=${finesse}, FSR=${freeSpectralRange}`);
    return { finesse, freeSpectralRange, resolvingPower };
  }

  // ─── 衍射 ───

  /**
   * 单缝衍射：a * sin(θ) = m * λ
   * Single-slit diffraction
   */
  public singleSlitDiffraction(wavelength: number, slitWidth: number): {
    firstMinimum: number;
    centralMaximumWidth: number;
  } {
    if (slitWidth <= 0) throw new Error('Slit width must be positive');
    const ratio = wavelength / slitWidth;
    const firstMinimum = Math.asin(Math.min(1, ratio));
    const centralMaximumWidth = 2 * firstMinimum;
    this._recordHistory(
      `singleSlitDiffraction: λ=${wavelength}, a=${slitWidth} -> θ_1=${firstMinimum}`,
    );
    return { firstMinimum, centralMaximumWidth };
  }

  /**
   * 衍射光栅：d * sin(θ) = m * λ
   * Diffraction grating
   */
  public diffractionGrating(
    wavelength: number,
    order: number,
    slitSpacing: number,
  ): { angle: number; resolvable: boolean } {
    if (slitSpacing <= 0) throw new Error('Slit spacing must be positive');
    const sinTheta = (order * wavelength) / slitSpacing;
    if (Math.abs(sinTheta) > 1) {
      this._recordHistory(`diffractionGrating: order ${order} not resolvable`);
      return { angle: NaN, resolvable: false };
    }
    const angle = Math.asin(sinTheta);
    this._recordHistory(`diffractionGrating: m=${order}, λ=${wavelength} -> θ=${angle}`);
    return { angle, resolvable: true };
  }

  /**
   * 光栅分辨本领：R = mN
   * Resolving power of a diffraction grating
   */
  public gratingResolvingPower(order: number, numLines: number): number {
    const R = order * numLines;
    this._recordHistory(`gratingResolvingPower: m=${order}, N=${numLines} -> R=${R}`);
    return R;
  }

  /**
   * 圆孔衍射（艾里斑）：sin(θ) ≈ 1.22 λ/D
   * Airy disk and Rayleigh criterion
   */
  public airyDisk(wavelength: number, diameter: number): {
    angularResolution: number;
    linearResolution: number;
    rayleighCriterion: number;
  } {
    if (diameter <= 0) throw new Error('Diameter must be positive');
    const angularResolution = 1.22 * wavelength / diameter;
    const linearResolution = 2 * 1.22 * wavelength / diameter;
    const rayleighCriterion = angularResolution;
    this._recordHistory(`airyDisk: θ=${angularResolution} rad`);
    return { angularResolution, linearResolution, rayleighCriterion };
  }

  /**
   * 巴比涅原理：互补屏的衍射图样相同
   * Babinet's principle
   */
  public babinetPrinciple(
    intensity1: number,
    intensity2: number,
  ): { sumIntensity: number; equal: boolean } {
    const sumIntensity = intensity1 + intensity2;
    const equal = Math.abs(sumIntensity - 1) < 1e-6;
    this._recordHistory(`babinetPrinciple: I=${sumIntensity}, equal=${equal}`);
    return { sumIntensity, equal };
  }

  // ─── 偏振 ───

  /**
   * 偏振：马吕斯定律 I = I_0 * cos^2(θ)
   * Polarization (Malus's Law)
   */
  public polarization(angle: number, intensity: number): {
    transmitted: number;
    component: number;
  } {
    if (intensity < 0) throw new Error('Intensity must be non-negative');
    const transmitted = intensity * Math.cos(angle) * Math.cos(angle);
    const component = intensity * Math.cos(angle);
    this._recordHistory(`polarization: θ=${angle}, I_0=${intensity} -> I=${transmitted}`);
    return { transmitted, component };
  }

  /**
   * 布儒斯特角：tan(θ_B) = n2/n1
   * Brewster's angle
   */
  public brewstersAngle(n1: number, n2: number): {
    angle: number;
    polarizationComplete: boolean;
  } {
    if (n1 <= 0 || n2 <= 0) throw new Error('Refractive indices must be positive');
    const angle = Math.atan(n2 / n1);
    this._recordHistory(`brewstersAngle: n1=${n1}, n2=${n2} -> θ_B=${angle}`);
    return { angle, polarizationComplete: true };
  }

  /**
   * 琼斯矢量（线性偏振简化）
   * Jones vector
   */
  public jonesVector(angle: number): JonesVector {
    const ex = Math.cos(angle);
    const ey = Math.sin(angle);
    const polarization: 'linear' | 'circular' | 'elliptical' =
      Math.abs(Math.abs(angle) - Math.PI / 4) < 1e-6 ? 'circular' : 'linear';
    this._recordHistory(`jonesVector: θ=${angle} -> ${polarization}`);
    return { ex, ey, polarization, angle };
  }

  /**
   * 波片（1/4 波片，1/2 波片）
   * Waveplate
   */
  public waveplate(
    type: 'quarter' | 'half',
    wavelength: number,
    n_o: number,
    n_e: number,
  ): { thickness: number; phaseShift: number } {
    const shift = type === 'quarter' ? Math.PI / 2 : Math.PI;
    const thickness = (shift * wavelength) / (2 * Math.PI * Math.abs(n_e - n_o));
    this._recordHistory(`waveplate: ${type} -> t=${thickness}`);
    return { thickness, phaseShift: shift };
  }

  /**
   * 偏振度：P = (Imax - Imin) / (Imax + Imin)
   * Degree of polarization
   */
  public degreeOfPolarization(imax: number, imin: number): number {
    if (imax < 0 || imin < 0 || imax < imin) {
      throw new Error('Invalid intensities');
    }
    const sum = imax + imin;
    if (sum === 0) return 0;
    const P = (imax - imin) / sum;
    this._recordHistory(`degreeOfPolarization: P=${P}`);
    return P;
  }

  // ─── 临界角与全反射 ───

  /**
   * 临界角：sin(θ_c) = n2/n1 (n1 > n2)
   * Critical angle for total internal reflection
   */
  public criticalAngle(n1: number, n2: number): { angle: number; exists: boolean } {
    if (n1 <= 0 || n2 <= 0) throw new Error('Refractive indices must be positive');
    if (n1 <= n2) {
      this._recordHistory(`criticalAngle: none (n1 ≤ n2)`);
      return { angle: NaN, exists: false };
    }
    const angle = Math.asin(n2 / n1);
    this._recordHistory(`criticalAngle: n1=${n1}, n2=${n2} -> θ_c=${angle}`);
    return { angle, exists: true };
  }

  /**
   * 全反射判断
   * Total internal reflection check
   */
  public totalInternalReflection(
    angle: number,
    n1: number,
    n2: number,
  ): { occurs: boolean; criticalAngle: number } {
    if (n1 <= 0 || n2 <= 0) throw new Error('Refractive indices must be positive');
    if (n1 <= n2) {
      this._recordHistory(`totalInternalReflection: impossible (n1 ≤ n2)`);
      return { occurs: false, criticalAngle: NaN };
    }
    const crit = Math.asin(n2 / n1);
    const occurs = angle > crit;
    this._recordHistory(`totalInternalReflection: θ=${angle}, occurs=${occurs}`);
    return { occurs, criticalAngle: crit };
  }

  /**
   * 菲涅尔方程：反射与透射系数
   * Fresnel equations (s-polarization, simplified)
   */
  public fresnelEquations(angle: number, n1: number, n2: number): {
    reflectance: number;
    transmittance: number;
  } {
    if (n1 <= 0 || n2 <= 0) throw new Error('Refractive indices must be positive');
    const cosI = Math.cos(angle);
    const sinT2 = ((n1 / n2) ** 2) * Math.sin(angle) ** 2;
    if (sinT2 > 1) {
      this._recordHistory(`fresnelEquations: total internal reflection`);
      return { reflectance: 1, transmittance: 0 };
    }
    const cosT = Math.sqrt(1 - sinT2);
    const rs = ((n1 * cosI - n2 * cosT) / (n1 * cosI + n2 * cosT)) ** 2;
    const reflectance = rs;
    const transmittance = 1 - reflectance;
    this._recordHistory(
      `fresnelEquations: θ=${angle}, n1=${n1}, n2=${n2} -> R=${reflectance}`,
    );
    return { reflectance, transmittance };
  }

  /**
   * 多波干涉
   * Interference of multiple waves
   */
  public interference(waves: { amplitude: number; phase: number }[]): {
    resultant: number;
    intensity: number;
    constructive: boolean;
  } {
    let re = 0;
    let im = 0;
    for (const w of waves) {
      re += w.amplitude * Math.cos(w.phase);
      im += w.amplitude * Math.sin(w.phase);
    }
    const resultant = Math.sqrt(re * re + im * im);
    const intensity = resultant * resultant;
    const sumAmp = waves.reduce((acc, w) => acc + w.amplitude, 0);
    const constructive = Math.abs(resultant - sumAmp) < 1e-9;
    this._recordHistory(`interference: ${waves.length} waves -> |A|=${resultant}`);
    return { resultant, intensity, constructive };
  }

  /**
   * 相干性：时间相干长度 L_c = c * τ_c
   * Coherence length and time
   */
  public coherence(length: number, time: number): {
    coherenceLength: number;
    coherenceTime: number;
    consistent: boolean;
  } {
    const coherenceLength = C_LIGHT * time;
    const coherenceTime = length / C_LIGHT;
    const consistent = Math.abs(coherenceLength - length) < 1e-6 * Math.max(1, length);
    this._recordHistory(
      `coherence: L=${length}, τ=${time} -> consistent=${consistent}`,
    );
    return { coherenceLength, coherenceTime, consistent };
  }

  /**
   * 空间相干性：d_c ≈ λ/θ_s
   * Spatial coherence
   */
  public spatialCoherence(wavelength: number, angularSize: number): number {
    if (angularSize <= 0) throw new Error('Angular size must be positive');
    const d_c = wavelength / angularSize;
    this._recordHistory(`spatialCoherence: d_c=${d_c}`);
    return d_c;
  }

  // ─── 光谱与黑体辐射 ───

  /**
   * 光谱波段识别
   * Spectrum band classification
   */
  public spectrumBand(wavelength: number): SpectrumBand {
    if (wavelength <= 0) throw new Error('Wavelength must be positive');
    let name: string;
    if (wavelength < 1e-11) name = 'gamma ray';
    else if (wavelength < 1e-8) name = 'X-ray';
    else if (wavelength < 4e-7) name = 'ultraviolet';
    else if (wavelength < 7e-7) name = 'visible';
    else if (wavelength < 1e-3) name = 'infrared';
    else if (wavelength < 1e-1) name = 'microwave';
    else name = 'radio';
    const frequency = C_LIGHT / wavelength;
    const energy = H_PLANCK * frequency;
    this._recordHistory(`spectrumBand: λ=${wavelength} -> ${name}`);
    void name;
    return {
      name,
      minWavelength: wavelength * 0.9,
      maxWavelength: wavelength * 1.1,
      frequency,
      energy,
    };
  }

  /**
   * 普朗克黑体辐射谱密度
   * Planck blackbody spectral radiance
   */
  public planckLaw(wavelength: number, T: number): number {
    if (wavelength <= 0 || T <= 0) throw new Error('Parameters must be positive');
    const h = H_PLANCK;
    const c = C_LIGHT;
    const k = K_B;
    const numerator = (2 * h * c * c) / Math.pow(wavelength, 5);
    const exponent = (h * c) / (wavelength * k * T);
    const denominator = Math.exp(exponent) - 1;
    return numerator / denominator;
  }

  /**
   * 维恩位移定律：λ_max * T = b
   * Wien's displacement law
   */
  public wienDisplacement(T: number): { peakWavelength: number; peakFrequency: number } {
    if (T <= 0) throw new Error('Temperature must be positive');
    const peakWavelength = B_WIEN / T;
    const peakFrequency = (2.821439 * K_B * T) / H_PLANCK;
    this._recordHistory(`wienDisplacement: T=${T} -> λ_max=${peakWavelength}`);
    return { peakWavelength, peakFrequency };
  }

  /**
   * 斯特藩-玻尔兹曼定律：P = σ A T⁴
   * Stefan-Boltzmann law
   */
  public stefanBoltzmann(T: number, area: number = 1): { power: number; radiance: number } {
    if (T <= 0 || area <= 0) throw new Error('T and area must be positive');
    const power = SIGMA_SB * area * Math.pow(T, 4);
    const radiance = SIGMA_SB * Math.pow(T, 4);
    this._recordHistory(`stefanBoltzmann: T=${T} -> P=${power} W`);
    return { power, radiance };
  }

  /**
   * 光电效应：E = hν - φ
   * Photoelectric effect
   */
  public photoelectricEffect(frequency: number, workFunction: number): {
    kineticEnergy: number;
    ejected: boolean;
    threshold: number;
  } {
    const photonEnergy = H_PLANCK * frequency;
    const kineticEnergy = Math.max(0, photonEnergy - workFunction);
    const ejected = photonEnergy > workFunction;
    const threshold = workFunction / H_PLANCK;
    this._recordHistory(`photoelectricEffect: ν=${frequency} -> KE=${kineticEnergy}`);
    return { kineticEnergy, ejected, threshold };
  }

  /**
   * 光子能量：E = hν = hc/λ
   */
  public photonEnergy(wavelength: number): { energy: number; frequency: number } {
    if (wavelength <= 0) throw new Error('Wavelength must be positive');
    const frequency = C_LIGHT / wavelength;
    const energy = H_PLANCK * frequency;
    this._recordHistory(`photonEnergy: λ=${wavelength} -> E=${energy} J (${energy / EV} eV)`);
    return { energy, frequency };
  }

  /**
   * 光子动量：p = h/λ
   */
  public photonMomentum(wavelength: number): number {
    if (wavelength <= 0) throw new Error('Wavelength must be positive');
    const p = H_PLANCK / wavelength;
    this._recordHistory(`photonMomentum: p=${p}`);
    return p;
  }

  // ─── 激光与共振 ───

  /**
   * 激光阈值条件：gain > losses
   * Laser threshold condition
   */
  public laserThreshold(
    gainCoefficient: number,
    lossCoefficient: number,
    length: number,
    mirrorReflectance: number,
  ): { threshold: boolean; roundTripGain: number } {
    const roundTripGain = 2 * (gainCoefficient - lossCoefficient) * length +
      Math.log(mirrorReflectance);
    const threshold = roundTripGain >= 0;
    this._recordHistory(`laserThreshold: ${threshold ? 'above' : 'below'} threshold`);
    return { threshold, roundTripGain };
  }

  /**
   * 高斯光束：光斑大小 w(z) = w_0 √(1 + (z/z_R)²)
   * Gaussian beam spot size
   */
  public gaussianBeam(
    waistW0: number,
    z: number,
    wavelength: number,
  ): { spotSize: number; rayleighRange: number; divergence: number } {
    if (waistW0 <= 0 || wavelength <= 0) throw new Error('Parameters must be positive');
    const rayleighRange = (Math.PI * waistW0 * waistW0) / wavelength;
    const spotSize = waistW0 * Math.sqrt(1 + (z / rayleighRange) ** 2);
    const divergence = wavelength / (Math.PI * waistW0);
    this._recordHistory(`gaussianBeam: w(z)=${spotSize}`);
    return { spotSize, rayleighRange, divergence };
  }

  // ─── 像差 ───

  /**
   * 球差：纵向球差 ∝ h²
   * Spherical aberration
   */
  public sphericalAberration(height: number, f: number, n: number): Aberration {
    const magnitude = (n * height * height) / (8 * f);
    this._recordHistory(`sphericalAberration: h=${height} -> ${magnitude}`);
    return {
      type: 'spherical',
      magnitude,
      correction: 'aspheric surface or aperture stop',
    };
  }

  /**
   * 色差：轴向色差 = f (n_F - n_C) / (n_D - 1)
   * Chromatic aberration
   */
  public chromaticAberration(
    f: number,
    nF: number,
    nC: number,
    nD: number,
  ): { axial: number; lateral: number; abbeNumber: number } {
    const abbeNumber = (nD - 1) / (nF - nC);
    const axial = f / abbeNumber;
    const lateral = axial / 10; // 简化估计
    this._recordHistory(`chromaticAberration: V=${abbeNumber}, axial=${axial}`);
    return { axial, lateral, abbeNumber };
  }

  // ─── 大气光学 ───

  /**
   * 瑞利散射：I ∝ 1/λ⁴
   * Rayleigh scattering
   */
  public rayleighScattering(
    wavelength: number,
    intensity0: number,
  ): { intensity: number; crossSection: number } {
    if (wavelength <= 0) throw new Error('Wavelength must be positive');
    const intensity = intensity0 / Math.pow(wavelength, 4);
    const crossSection = 1 / Math.pow(wavelength, 4);
    this._recordHistory(`rayleighScattering: λ=${wavelength} -> I=${intensity}`);
    return { intensity, crossSection };
  }

  /**
   * 彩虹角：约 42°（一阶）
   * Rainbow angle
   */
  public rainbowAngle(
    n: number,
    order: number = 1,
  ): { angle: number; deviation: number } {
    if (n <= 1) throw new Error('Refractive index must be > 1');
    // 一阶彩虹：θ = 180 - 2 * arcsin(sin(i)/n) - i, min deviation
    // 简化：取近似公式
    const angle = order === 1 ? 42 * Math.PI / 180 : 51 * Math.PI / 180;
    const deviation = Math.PI * (2 - 2 * order) - 2 * Math.asin(1 / n);
    void angle;
    this._recordHistory(`rainbowAngle: order=${order}, n=${n}`);
    return { angle, deviation };
  }

  /**
   * 大气折射：天体仰角抬高
   * Atmospheric refraction
   */
  public atmosphericRefraction(
    zenithAngle: number,
    pressure: number = 101.325,
    temperature: number = 283.15,
  ): number {
    // 简化的 Saemundsson 公式
    const tanZ = Math.tan(zenithAngle);
    const refractionArcsec = (pressure / 101.325) * (283.15 / temperature) * 58.294 * tanZ -
      0.0817 * Math.pow(tanZ, 3);
    return (refractionArcsec * Math.PI) / (180 * 3600);
  }

  // ─── 光纤光学 ───

  /**
   * 光纤数值孔径：NA = √(n_core² - n_clad²)
   * Fiber numerical aperture
   */
  public fiberNumericalAperture(nCore: number, nClad: number): {
    NA: number;
    acceptanceAngle: number;
  } {
    if (nCore <= nClad) throw new Error('n_core must be > n_clad');
    const NA = Math.sqrt(nCore * nCore - nClad * nClad);
    const acceptanceAngle = Math.asin(Math.min(1, NA));
    this._recordHistory(`fiberNumericalAperture: NA=${NA}`);
    return { NA, acceptanceAngle };
  }

  /**
   * 光纤模式数（V 参数）：V = (2π a / λ) NA
   * Fiber V-number
   */
  public fiberVNumber(
    coreRadius: number,
    wavelength: number,
    NA: number,
  ): { V: number; singleMode: boolean; modeCount: number } {
    if (wavelength <= 0) throw new Error('Wavelength must be positive');
    const V = (2 * Math.PI * coreRadius * NA) / wavelength;
    const singleMode = V < 2.405;
    const modeCount = Math.floor(V * V / 2);
    this._recordHistory(`fiberVNumber: V=${V}, single=${singleMode}`);
    return { V, singleMode, modeCount };
  }

  // ─── 傅里叶光学 ───

  /**
   * 傅里叶光学：透镜的傅里叶变换性质
   * Lens as Fourier transformer (simplified)
   */
  public fourierOptics(
    spatialFrequency: number,
    focalLength: number,
    wavelength: number,
  ): { position: number; cutoff: number } {
    if (wavelength <= 0) throw new Error('Wavelength must be positive');
    const position = wavelength * focalLength * spatialFrequency;
    const cutoff = 1 / (wavelength * 2); // Nyquist
    this._recordHistory(`fourierOptics: pos=${position}`);
    return { position, cutoff };
  }

  /**
   * 光学传递函数（简化）
   * Optical transfer function
   */
  public opticalTransferFunction(
    spatialFrequency: number,
    cutoffFrequency: number,
  ): { mtf: number; ptf: number } {
    const ratio = spatialFrequency / cutoffFrequency;
    const mtf = Math.abs(ratio) >= 1 ? 0 : (2 / Math.PI) * (Math.acos(ratio) - ratio * Math.sqrt(1 - ratio * ratio));
    const ptf = 0; // 圆对称时相位为 0
    this._recordHistory(`opticalTransferFunction: MTF=${mtf}`);
    return { mtf, ptf };
  }

  // ─── 序列化与重置 ───

  /**
   * 转换为数据包
   * Serialize to DataPacket
   */
  public toPacket(): DataPacket<{
    rays: number;
    lenses: number;
    mirrors: number;
    patterns: number;
    history: string[];
  }> {
    return {
      id: `optics-${Date.now()}-${this._counter}`,
      payload: {
        rays: this._rays.size,
        lenses: this._lenses.size,
        mirrors: this._mirrors.size,
        patterns: this._patterns.size,
        history: [...this._history],
      },
      metadata: {
        createdAt: Date.now(),
        route: ['physics', 'optics'],
        priority: 0.8,
        phase: 'analysis',
      },
    };
  }

  /**
   * 重置状态
   * Reset internal state
   */
  public reset(): void {
    this._rays.clear();
    this._lenses.clear();
    this._mirrors.clear();
    this._patterns.clear();
    this._history = [];
    this._counter = 0;
  }

  // ─── Private helpers ───

  private _generateId(): string {
    return `op-${(++this._counter).toString(36)}-${Date.now().toString(36)}`;
  }

  private _recordHistory(entry: string): void {
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
  }

  /** 暴露真空光速。 */
  public static readonly C = C_LIGHT;
  /** 暴露普朗克常数。 */
  public static readonly H = H_PLANCK;
  /** 暴露斯特藩-玻尔兹曼常数。 */
  public static readonly SIGMA = SIGMA_SB;
  /** 暴露维恩位移常数。 */
  public static readonly WIEN = B_WIEN;
}
