/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 光学 —— 反射、折射与干涉的几何
 * Optics: The Geometry of Reflection, Refraction, and Interference
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 从费马原理到傅里叶光学，光学既是几何的也是波动的。
 * 光线在界面弯折，波前在缝隙衍射，偏振在介质中翻转——皆遵循麦克斯韦的统御。
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
   * 干涉：多波叠加
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
}
