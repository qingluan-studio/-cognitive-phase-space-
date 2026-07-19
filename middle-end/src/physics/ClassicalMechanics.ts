/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 经典力学 —— 运动与力的诗学
 * Classical Mechanics: The Poetics of Motion and Force
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 从牛顿三定律到拉格朗日方程，经典力学描绘了宏观物体在时空中运动的确定图景。
 * 每一次碰撞、每一次抛体、每一次简谐振动，都是力与运动的精妙对话。
 */

import { DataPacket } from '../shared/types';

/** 力的描述：矢量、大小与方向。 */
export interface Force {
  readonly vector: [number, number, number];
  readonly magnitude: number;
  readonly direction: number;
  readonly source: string;
}

/** 三维速度。 */
export interface Velocity {
  readonly vx: number;
  readonly vy: number;
  readonly vz: number;
  readonly magnitude: number;
}

/** 三维加速度。 */
export interface Acceleration {
  readonly ax: number;
  readonly ay: number;
  readonly az: number;
  readonly magnitude: number;
}

/** 三维动量。 */
export interface Momentum {
  readonly px: number;
  readonly py: number;
  readonly pz: number;
  readonly magnitude: number;
}

/** 能量：动能、势能与总能量。 */
export interface Energy {
  readonly kinetic: number;
  readonly potential: number;
  readonly total: number;
}

type ForceRecord = {
  readonly id: string;
  readonly force: Force;
  readonly timestamp: number;
};

type VelocityRecord = {
  readonly id: string;
  readonly velocity: Velocity;
  readonly timestamp: number;
};

type EnergyRecord = {
  readonly id: string;
  readonly energy: Energy;
  readonly timestamp: number;
};

/** 地球表面重力加速度 (m/s^2)。 */
const G_EARTH = 9.80665;

export class ClassicalMechanics {
  private _forces: Map<string, ForceRecord> = new Map();
  private _velocities: Map<string, VelocityRecord> = new Map();
  private _energies: Map<string, EnergyRecord> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get forceCount(): number { return this._forces.size; }
  get velocityCount(): number { return this._velocities.size; }
  get energyCount(): number { return this._energies.size; }
  get history(): string[] { return [...this._history]; }

  /**
   * 牛顿第二定律：F = m * a
   * Newton's Second Law
   */
  public newtonsSecondLaw(mass: number, acceleration: Acceleration): Force {
    if (mass < 0) throw new Error('Mass must be non-negative');
    const fx = mass * acceleration.ax;
    const fy = mass * acceleration.ay;
    const fz = mass * acceleration.az;
    const magnitude = Math.sqrt(fx * fx + fy * fy + fz * fz);
    const direction = Math.atan2(fy, fx);
    const force: Force = {
      vector: [fx, fy, fz],
      magnitude,
      direction,
      source: `F=m*a (m=${mass})`,
    };
    const id = this._generateId();
    this._forces.set(id, { id, force, timestamp: Date.now() });
    this._recordHistory(`newtonsSecondLaw: m=${mass}, |a|=${acceleration.magnitude} -> |F|=${magnitude}`);
    return force;
  }

  /**
   * 运动学：v = v0 + a*t, x = v0*t + 0.5*a*t^2
   * Kinematics in one dimension
   */
  public kinematics(v0: number, a: number, t: number): {
    velocity: number;
    displacement: number;
    averageVelocity: number;
  } {
    if (t < 0) throw new Error('Time must be non-negative');
    const velocity = v0 + a * t;
    const displacement = v0 * t + 0.5 * a * t * t;
    const averageVelocity = t === 0 ? v0 : displacement / t;
    this._recordHistory(`kinematics: v0=${v0}, a=${a}, t=${t} -> v=${velocity}, x=${displacement}`);
    return { velocity, displacement, averageVelocity };
  }

  /**
   * 抛体运动：水平匀速 + 垂直匀加速
   * Projectile motion under uniform gravity
   */
  public projectileMotion(v0: number, angle: number, g: number = G_EARTH): {
    range: number;
    maxHeight: number;
    timeOfFlight: number;
    vx: number;
    vy: number;
  } {
    if (v0 < 0) throw new Error('Initial velocity must be non-negative');
    if (g <= 0) throw new Error('Gravity must be positive');
    const rad = (angle * Math.PI) / 180;
    const vx = v0 * Math.cos(rad);
    const vy = v0 * Math.sin(rad);
    const timeOfFlight = (2 * vy) / g;
    const range = vx * timeOfFlight;
    const maxHeight = (vy * vy) / (2 * g);
    this._recordHistory(
      `projectileMotion: v0=${v0}, angle=${angle}°, g=${g} -> range=${range}, hMax=${maxHeight}`,
    );
    return { range, maxHeight, timeOfFlight, vx, vy };
  }

  /**
   * 动量：p = m * v
   * Linear momentum
   */
  public momentum(mass: number, velocity: Velocity): Momentum {
    if (mass < 0) throw new Error('Mass must be non-negative');
    const px = mass * velocity.vx;
    const py = mass * velocity.vy;
    const pz = mass * velocity.vz;
    const magnitude = Math.sqrt(px * px + py * py + pz * pz);
    const momentum: Momentum = { px, py, pz, magnitude };
    this._recordHistory(`momentum: m=${mass}, |v|=${velocity.magnitude} -> |p|=${magnitude}`);
    return momentum;
  }

  /**
   * 冲量：J = F * Δt
   * Impulse equals change in momentum
   */
  public impulse(force: Force, time: number): Momentum {
    if (time < 0) throw new Error('Time must be non-negative');
    const px = force.vector[0] * time;
    const py = force.vector[1] * time;
    const pz = force.vector[2] * time;
    const magnitude = Math.sqrt(px * px + py * py + pz * pz);
    this._recordHistory(`impulse: |F|=${force.magnitude}, Δt=${time} -> |J|=${magnitude}`);
    return { px, py, pz, magnitude };
  }

  /**
   * 功与能：W = F · d
   * Work-Energy theorem
   */
  public workEnergy(force: Force, displacement: [number, number, number]): {
    work: number;
    energy: Energy;
  } {
    const work =
      force.vector[0] * displacement[0] +
      force.vector[1] * displacement[1] +
      force.vector[2] * displacement[2];
    const energy: Energy = {
      kinetic: Math.max(0, work),
      potential: Math.max(0, -work),
      total: Math.abs(work),
    };
    this._recordHistory(`workEnergy: |F|=${force.magnitude} -> W=${work}`);
    return { work, energy };
  }

  /**
   * 动量守恒：m1*v1 + m2*v2 = (m1+m2)*v_f
   * Conservation of momentum (1D inelastic collision)
   */
  public conservationOfMomentum(
    m1: number,
    v1: number,
    m2: number,
    v2: number,
  ): { finalVelocity: number; totalMomentum: number; kineticEnergy: number } {
    if (m1 < 0 || m2 < 0) throw new Error('Masses must be non-negative');
    const totalMomentum = m1 * v1 + m2 * v2;
    const totalMass = m1 + m2;
    const finalVelocity = totalMass === 0 ? 0 : totalMomentum / totalMass;
    const kineticEnergy = 0.5 * totalMass * finalVelocity * finalVelocity;
    this._recordHistory(
      `conservationOfMomentum: m1=${m1}, v1=${v1}, m2=${m2}, v2=${v2} -> vf=${finalVelocity}`,
    );
    return { finalVelocity, totalMomentum, kineticEnergy };
  }

  /**
   * 能量守恒：KE + PE = const
   * Conservation of mechanical energy
   */
  public conservationOfEnergy(ke: number, pe: number): Energy {
    if (ke < 0 || pe < 0) throw new Error('Energy components must be non-negative');
    const total = ke + pe;
    const energy: Energy = { kinetic: ke, potential: pe, total };
    const id = this._generateId();
    this._energies.set(id, { id, energy, timestamp: Date.now() });
    this._recordHistory(`conservationOfEnergy: KE=${ke}, PE=${pe} -> E=${total}`);
    return energy;
  }

  /**
   * 向心力：F_c = m * v^2 / r
   * Centripetal force for circular motion
   */
  public centripetalForce(mass: number, velocity: number, radius: number): {
    force: number;
    acceleration: number;
    angularVelocity: number;
  } {
    if (radius <= 0) throw new Error('Radius must be positive');
    if (mass < 0) throw new Error('Mass must be non-negative');
    const acceleration = (velocity * velocity) / radius;
    const force = mass * acceleration;
    const angularVelocity = velocity / radius;
    this._recordHistory(
      `centripetalForce: m=${mass}, v=${velocity}, r=${radius} -> F=${force}, a_c=${acceleration}`,
    );
    return { force, acceleration, angularVelocity };
  }

  /**
   * 摩擦力：F_f = μ * N
   * Static and kinetic friction
   */
  public frictionForce(normalForce: number, coefficient: number): {
    staticFriction: number;
    kineticFriction: number;
  } {
    if (normalForce < 0) throw new Error('Normal force must be non-negative');
    if (coefficient < 0) throw new Error('Friction coefficient must be non-negative');
    const staticFriction = coefficient * normalForce;
    const kineticFriction = 0.8 * coefficient * normalForce;
    this._recordHistory(
      `frictionForce: N=${normalForce}, μ=${coefficient} -> F_s=${staticFriction}, F_k=${kineticFriction}`,
    );
    return { staticFriction, kineticFriction };
  }

  /**
   * 力矩：τ = r × F
   * Torque as the cross product of lever arm and force
   */
  public torque(force: Force, leverArm: [number, number, number]): {
    torque: [number, number, number];
    magnitude: number;
  } {
    const [rx, ry, rz] = leverArm;
    const [fx, fy, fz] = force.vector;
    const tx = ry * fz - rz * fy;
    const ty = rz * fx - rx * fz;
    const tz = rx * fy - ry * fx;
    const magnitude = Math.sqrt(tx * tx + ty * ty + tz * tz);
    this._recordHistory(`torque: r=[${rx},${ry},${rz}] -> |τ|=${magnitude}`);
    return { torque: [tx, ty, tz], magnitude };
  }

  /**
   * 角动量：L = I * ω
   * Angular momentum
   */
  public angularMomentum(I: number, omega: number): {
    magnitude: number;
    direction: 'CCW' | 'CW';
  } {
    if (I < 0) throw new Error('Moment of inertia must be non-negative');
    const magnitude = I * omega;
    const direction: 'CCW' | 'CW' = omega >= 0 ? 'CCW' : 'CW';
    this._recordHistory(`angularMomentum: I=${I}, ω=${omega} -> |L|=${magnitude}`);
    return { magnitude, direction };
  }

  /**
   * 转动惯量：根据几何形状计算
   * Moment of inertia by geometric shape
   */
  public momentOfInertia(
    shape: 'sphere' | 'cylinder' | 'rod' | 'ring' | 'disk',
    params: { mass: number; radius?: number; length?: number },
  ): number {
    const m = params.mass;
    if (m < 0) throw new Error('Mass must be non-negative');
    let I = 0;
    switch (shape) {
      case 'sphere':
        I = (2 / 5) * m * Math.pow(params.radius ?? 0, 2);
        break;
      case 'cylinder':
        I = (1 / 2) * m * Math.pow(params.radius ?? 0, 2);
        break;
      case 'rod':
        I = (1 / 12) * m * Math.pow(params.length ?? 0, 2);
        break;
      case 'ring':
        I = m * Math.pow(params.radius ?? 0, 2);
        break;
      case 'disk':
        I = (1 / 2) * m * Math.pow(params.radius ?? 0, 2);
        break;
    }
    this._recordHistory(`momentOfInertia: shape=${shape}, m=${m} -> I=${I}`);
    return I;
  }

  /**
   * 简谐运动：x(t) = A * cos(ω*t + φ)
   * Simple harmonic motion
   */
  public simpleHarmonicMotion(
    amplitude: number,
    frequency: number,
    time: number,
  ): { position: number; velocity: number; acceleration: number; omega: number } {
    if (amplitude < 0) throw new Error('Amplitude must be non-negative');
    const omega = 2 * Math.PI * frequency;
    const position = amplitude * Math.cos(omega * time);
    const velocity = -amplitude * omega * Math.sin(omega * time);
    const acceleration = -amplitude * omega * omega * Math.cos(omega * time);
    this._recordHistory(
      `simpleHarmonicMotion: A=${amplitude}, f=${frequency}, t=${time} -> x=${position}`,
    );
    return { position, velocity, acceleration, omega };
  }

  /**
   * 单摆：T = 2π * √(L/g)
   * Pendulum under small-angle approximation
   */
  public pendulum(
    length: number,
    angle: number,
    g: number = G_EARTH,
  ): {
    period: number;
    frequency: number;
    angularFrequency: number;
    restoringForce: number;
  } {
    if (length <= 0) throw new Error('Length must be positive');
    if (g <= 0) throw new Error('Gravity must be positive');
    const period = 2 * Math.PI * Math.sqrt(length / g);
    const frequency = 1 / period;
    const angularFrequency = 2 * Math.PI * frequency;
    const restoringForce = -g * Math.sin(angle) / length;
    this._recordHistory(`pendulum: L=${length}, θ=${angle}, g=${g} -> T=${period}`);
    return { period, frequency, angularFrequency, restoringForce };
  }

  /**
   * 转换为数据包
   * Serialize to DataPacket
   */
  public toPacket(): DataPacket<{
    forces: number;
    velocities: number;
    energies: number;
    history: string[];
  }> {
    return {
      id: `class-mech-${Date.now()}-${this._counter}`,
      payload: {
        forces: this._forces.size,
        velocities: this._velocities.size,
        energies: this._energies.size,
        history: [...this._history],
      },
      metadata: {
        createdAt: Date.now(),
        route: ['physics', 'classical', 'mechanics'],
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
    this._forces.clear();
    this._velocities.clear();
    this._energies.clear();
    this._history = [];
    this._counter = 0;
  }

  // ─── Private helpers ───

  private _generateId(): string {
    return `cm-${(++this._counter).toString(36)}-${Date.now().toString(36)}`;
  }

  private _recordHistory(entry: string): void {
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
  }
}
