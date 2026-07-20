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

/** 刚体状态：位置、速度、朝向与角速度。 */
export interface RigidBodyState {
  readonly position: [number, number, number];
  readonly velocity: [number, number, number];
  readonly orientation: [number, number, number, number];
  readonly angularVelocity: [number, number, number];
}

/** 碰撞结果：冲量、新速度与能量损失。 */
export interface CollisionResult {
  readonly impulse: [number, number, number];
  readonly velocityA: [number, number, number];
  readonly velocityB: [number, number, number];
  readonly energyLost: number;
  readonly contactPoint: [number, number, number];
}

/** 振动系统状态。 */
export interface OscillationState {
  readonly position: number;
  readonly velocity: number;
  readonly acceleration: number;
  readonly phase: number;
  readonly amplitude: number;
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

type CollisionRecord = {
  readonly id: string;
  readonly result: CollisionResult;
  readonly timestamp: number;
};

type OscillationRecord = {
  readonly id: string;
  readonly state: OscillationState;
  readonly timestamp: number;
};

/** 地球表面重力加速度 (m/s^2)。 */
const G_EARTH = 9.80665;
/** 万有引力常数 G (m³/(kg·s²))。 */
const G_UNIVERSAL = 6.6743e-11;
/** 光速 (m/s)。 */
const C_LIGHT = 299792458;

export class ClassicalMechanics {
  private _forces: Map<string, ForceRecord> = new Map();
  private _velocities: Map<string, VelocityRecord> = new Map();
  private _energies: Map<string, EnergyRecord> = new Map();
  private _collisions: Map<string, CollisionRecord> = new Map();
  private _oscillations: Map<string, OscillationRecord> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get forceCount(): number { return this._forces.size; }
  get velocityCount(): number { return this._velocities.size; }
  get energyCount(): number { return this._energies.size; }
  get collisionCount(): number { return this._collisions.size; }
  get oscillationCount(): number { return this._oscillations.size; }
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
   * 牛顿第三定律：作用力与反作用力大小相等、方向相反
   * Newton's Third Law
   */
  public newtonsThirdLaw(action: Force): { reaction: Force; actionReactionPair: boolean } {
    const reaction: Force = {
      vector: [-action.vector[0], -action.vector[1], -action.vector[2]],
      magnitude: action.magnitude,
      direction: action.direction + Math.PI,
      source: 'reaction to ' + action.source,
    };
    const id = this._generateId();
    this._forces.set(id, { id, force: reaction, timestamp: Date.now() });
    this._recordHistory(`newtonsThirdLaw: |F|=${action.magnitude}, action-reaction pair`);
    return { reaction, actionReactionPair: true };
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
   * 三维运动学：位置、速度、加速度的矢量合成
   * 3D Kinematics with vector composition
   */
  public kinematics3D(
    v0: [number, number, number],
    a: [number, number, number],
    t: number,
  ): {
    position: [number, number, number];
    velocity: [number, number, number];
    speed: number;
    distance: number;
  } {
    if (t < 0) throw new Error('Time must be non-negative');
    const vx = v0[0] + a[0] * t;
    const vy = v0[1] + a[1] * t;
    const vz = v0[2] + a[2] * t;
    const x = v0[0] * t + 0.5 * a[0] * t * t;
    const y = v0[1] * t + 0.5 * a[1] * t * t;
    const z = v0[2] * t + 0.5 * a[2] * t * t;
    const speed = Math.sqrt(vx * vx + vy * vy + vz * vz);
    const distance = Math.sqrt(x * x + y * y + z * z);
    const vel: Velocity = { vx, vy, vz, magnitude: speed };
    const id = this._generateId();
    this._velocities.set(id, { id, velocity: vel, timestamp: Date.now() });
    this._recordHistory(`kinematics3D: t=${t}, speed=${speed}, distance=${distance}`);
    return { position: [x, y, z], velocity: [vx, vy, vz], speed, distance };
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
   * 斜面上的抛体运动：考虑斜面倾角
   * Projectile motion on an inclined plane
   */
  public projectileOnIncline(
    v0: number,
    angle: number,
    inclineAngle: number,
    g: number = G_EARTH,
  ): {
    rangeAlongIncline: number;
    timeOfFlight: number;
    maxHeight: number;
    impactAngle: number;
  } {
    if (v0 < 0) throw new Error('Initial velocity must be non-negative');
    if (g <= 0) throw new Error('Gravity must be positive');
    const rad = (angle * Math.PI) / 180;
    const inclineRad = (inclineAngle * Math.PI) / 180;
    const cosIncline = Math.cos(inclineRad);
    const sinIncline = Math.sin(inclineRad);
    const cosAngle = Math.cos(rad);
    const sinAngle = Math.sin(rad);
    const timeOfFlight = (2 * v0 * (sinAngle * cosIncline - cosAngle * sinIncline)) / (g * cosIncline * cosIncline);
    if (timeOfFlight < 0) {
      this._recordHistory(`projectileOnIncline: never lands on incline (t_flight < 0)`);
      return { rangeAlongIncline: 0, timeOfFlight: 0, maxHeight: 0, impactAngle: 0 };
    }
    const rangeAlongIncline = (v0 * cosAngle * timeOfFlight) / cosIncline;
    const maxHeight = (v0 * sinAngle) * (v0 * sinAngle) / (2 * g);
    const vyImpact = v0 * sinAngle - g * timeOfFlight;
    const vxImpact = v0 * cosAngle;
    const impactAngle = Math.atan2(vyImpact, vxImpact);
    this._recordHistory(
      `projectileOnIncline: v0=${v0}, θ=${angle}, α=${inclineAngle} -> R=${rangeAlongIncline}`,
    );
    return { rangeAlongIncline, timeOfFlight, maxHeight, impactAngle };
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
   * 变力冲量：积分 F(t) dt (梯形近似)
   * Impulse from time-varying force (trapezoidal approximation)
   */
  public impulseTimeVarying(forces: { t: number; F: [number, number, number] }[]): Momentum {
    if (forces.length < 2) throw new Error('At least 2 force samples required');
    let jx = 0, jy = 0, jz = 0;
    for (let i = 1; i < forces.length; i++) {
      const dt = forces[i].t - forces[i - 1].t;
      if (dt <= 0) continue;
      const avgFx = (forces[i].F[0] + forces[i - 1].F[0]) / 2;
      const avgFy = (forces[i].F[1] + forces[i - 1].F[1]) / 2;
      const avgFz = (forces[i].F[2] + forces[i - 1].F[2]) / 2;
      jx += avgFx * dt;
      jy += avgFy * dt;
      jz += avgFz * dt;
    }
    const magnitude = Math.sqrt(jx * jx + jy * jy + jz * jz);
    this._recordHistory(`impulseTimeVarying: ${forces.length} samples -> |J|=${magnitude}`);
    return { px: jx, py: jy, pz: jz, magnitude };
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
   * 变力做功：沿路径积分
   * Work done by a variable force along a path
   */
  public workPathIntegral(
    path: { position: [number, number, number]; force: [number, number, number] }[],
  ): {
    totalWork: number;
    segments: number;
    averageForce: number;
  } {
    if (path.length < 2) throw new Error('Path must have at least 2 points');
    let totalWork = 0;
    let totalForce = 0;
    for (let i = 1; i < path.length; i++) {
      const dx = path[i].position[0] - path[i - 1].position[0];
      const dy = path[i].position[1] - path[i - 1].position[1];
      const dz = path[i].position[2] - path[i - 1].position[2];
      const avgFx = (path[i].force[0] + path[i - 1].force[0]) / 2;
      const avgFy = (path[i].force[1] + path[i - 1].force[1]) / 2;
      const avgFz = (path[i].force[2] + path[i - 1].force[2]) / 2;
      totalWork += avgFx * dx + avgFy * dy + avgFz * dz;
      totalForce += Math.sqrt(avgFx * avgFx + avgFy * avgFy + avgFz * avgFz);
    }
    const segments = path.length - 1;
    const averageForce = totalForce / segments;
    this._recordHistory(`workPathIntegral: ${segments} segments -> W=${totalWork}`);
    return { totalWork, segments, averageForce };
  }

  /**
   * 功率：P = dW/dt = F · v
   * Power as rate of work or force times velocity
   */
  public power(force: Force, velocity: Velocity): {
    instantaneous: number;
    average: number;
    direction: 'same' | 'opposite' | 'perpendicular';
  } {
    const instantaneous =
      force.vector[0] * velocity.vx +
      force.vector[1] * velocity.vy +
      force.vector[2] * velocity.vz;
    const average = instantaneous;
    const dotProduct = instantaneous;
    const product = force.magnitude * velocity.magnitude;
    let direction: 'same' | 'opposite' | 'perpendicular';
    if (Math.abs(dotProduct) < 1e-9 * Math.max(1, product)) {
      direction = 'perpendicular';
    } else if (dotProduct > 0) {
      direction = 'same';
    } else {
      direction = 'opposite';
    }
    this._recordHistory(`power: |F|=${force.magnitude}, |v|=${velocity.magnitude} -> P=${instantaneous}`);
    return { instantaneous, average, direction };
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
   * 三维动量守恒
   * Conservation of momentum in 3D
   */
  public conservationOfMomentum3D(
    m1: number,
    v1: [number, number, number],
    m2: number,
    v2: [number, number, number],
  ): {
    finalVelocity: [number, number, number];
    totalMomentum: [number, number, number];
    momentumMagnitude: number;
    kineticEnergy: number;
  } {
    if (m1 < 0 || m2 < 0) throw new Error('Masses must be non-negative');
    const totalMass = m1 + m2;
    const px = m1 * v1[0] + m2 * v2[0];
    const py = m1 * v1[1] + m2 * v2[1];
    const pz = m1 * v1[2] + m2 * v2[2];
    const vfx = totalMass > 0 ? px / totalMass : 0;
    const vfy = totalMass > 0 ? py / totalMass : 0;
    const vfz = totalMass > 0 ? pz / totalMass : 0;
    const momentumMagnitude = Math.sqrt(px * px + py * py + pz * pz);
    const ke1 = 0.5 * m1 * (v1[0] * v1[0] + v1[1] * v1[1] + v1[2] * v1[2]);
    const ke2 = 0.5 * m2 * (v2[0] * v2[0] + v2[1] * v2[1] + v2[2] * v2[2]);
    const kineticEnergy = ke1 + ke2;
    this._recordHistory(`conservationOfMomentum3D: m1=${m1}, m2=${m2} -> |p|=${momentumMagnitude}`);
    return {
      finalVelocity: [vfx, vfy, vfz],
      totalMomentum: [px, py, pz],
      momentumMagnitude,
      kineticEnergy,
    };
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
   * 引力势能：U = -GMm/r
   * Gravitational potential energy
   */
  public gravitationalPotentialEnergy(
    M: number,
    m: number,
    r: number,
  ): { potentialEnergy: number; escapeVelocity: number } {
    if (r <= 0) throw new Error('Distance must be positive');
    if (M < 0 || m < 0) throw new Error('Masses must be non-negative');
    const potentialEnergy = (-G_UNIVERSAL * M * m) / r;
    const escapeVelocity = Math.sqrt((2 * G_UNIVERSAL * M) / r);
    this._recordHistory(
      `gravitationalPotentialEnergy: M=${M}, m=${m}, r=${r} -> U=${potentialEnergy}`,
    );
    return { potentialEnergy, escapeVelocity };
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
   * 圆周运动：角位置、角速度、角加速度
   * Circular motion kinematics
   */
  public circularMotion(
    r: number,
    omega0: number,
    alpha: number,
    t: number,
  ): {
    angularPosition: number;
    angularVelocity: number;
    tangentialVelocity: number;
    centripetalAcceleration: number;
    tangentialAcceleration: number;
    totalAcceleration: number;
  } {
    if (r <= 0) throw new Error('Radius must be positive');
    if (t < 0) throw new Error('Time must be non-negative');
    const angularPosition = omega0 * t + 0.5 * alpha * t * t;
    const angularVelocity = omega0 + alpha * t;
    const tangentialVelocity = r * angularVelocity;
    const centripetalAcceleration = r * angularVelocity * angularVelocity;
    const tangentialAcceleration = r * alpha;
    const totalAcceleration = Math.sqrt(
      centripetalAcceleration * centripetalAcceleration +
      tangentialAcceleration * tangentialAcceleration,
    );
    this._recordHistory(
      `circularMotion: r=${r}, ω0=${omega0}, α=${alpha}, t=${t} -> ω=${angularVelocity}`,
    );
    return {
      angularPosition,
      angularVelocity,
      tangentialVelocity,
      centripetalAcceleration,
      tangentialAcceleration,
      totalAcceleration,
    };
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
   * 斜面上的摩擦力：考虑倾角
   * Friction on an inclined plane
   */
  public inclineFriction(
    mass: number,
    angle: number,
    muStatic: number,
    muKinetic: number,
    g: number = G_EARTH,
  ): {
    normalForce: number;
    gravityComponent: number;
    staticFriction: number;
    kineticFriction: number;
    willSlide: boolean;
    acceleration: number;
  } {
    if (mass < 0) throw new Error('Mass must be non-negative');
    const rad = (angle * Math.PI) / 180;
    const normalForce = mass * g * Math.cos(rad);
    const gravityComponent = mass * g * Math.sin(rad);
    const staticFriction = muStatic * normalForce;
    const kineticFriction = muKinetic * normalForce;
    const willSlide = gravityComponent > staticFriction;
    const acceleration = willSlide
      ? (gravityComponent - kineticFriction) / mass
      : 0;
    this._recordHistory(
      `inclineFriction: m=${mass}, θ=${angle}°, willSlide=${willSlide}, a=${acceleration}`,
    );
    return { normalForce, gravityComponent, staticFriction, kineticFriction, willSlide, acceleration };
  }

  /**
   * 空气阻力：F_d = 0.5 * ρ * v² * Cd * A
   * Air drag force
   */
  public airDrag(
    velocity: number,
    dragCoefficient: number,
    area: number,
    airDensity: number = 1.225,
  ): {
    dragForce: number;
    terminalVelocity: number;
    reynoldsEstimate: number;
  } {
    if (velocity < 0 || dragCoefficient < 0 || area < 0) {
      throw new Error('Velocity, Cd, and area must be non-negative');
    }
    const dragForce = 0.5 * airDensity * velocity * velocity * dragCoefficient * area;
    const referenceLength = Math.sqrt(area);
    const kinematicViscosity = 1.5e-5;
    const reynoldsEstimate = (velocity * referenceLength) / kinematicViscosity;
    const mass = 1;
    const terminalVelocity = Math.sqrt((2 * mass * G_EARTH) / (airDensity * dragCoefficient * area));
    this._recordHistory(`airDrag: v=${velocity}, Cd=${dragCoefficient} -> F_d=${dragForce}`);
    return { dragForce, terminalVelocity, reynoldsEstimate };
  }

  /**
   * 终端速度：重力与阻力平衡
   * Terminal velocity when drag equals gravity
   */
  public terminalVelocity(
    mass: number,
    dragCoefficient: number,
    area: number,
    airDensity: number = 1.225,
    g: number = G_EARTH,
  ): {
    vt: number;
    timeToReach: number;
    distanceToReach: number;
  } {
    if (mass <= 0 || dragCoefficient <= 0 || area <= 0) {
      throw new Error('Mass, Cd, and area must be positive');
    }
    const vt = Math.sqrt((2 * mass * g) / (airDensity * dragCoefficient * area));
    const gamma = (airDensity * dragCoefficient * area) / (2 * mass);
    const timeToReach = 5 / Math.sqrt(gamma * g);
    const distanceToReach = vt * timeToReach * (1 - Math.exp(-5));
    this._recordHistory(`terminalVelocity: m=${mass}, Cd=${dragCoefficient} -> vt=${vt}`);
    return { vt, timeToReach, distanceToReach };
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
   * 质点角动量：L = r × p
   * Angular momentum of a point particle
   */
  public angularMomentumParticle(
    r: [number, number, number],
    p: [number, number, number],
  ): {
    angularMomentum: [number, number, number];
    magnitude: number;
  } {
    const lx = r[1] * p[2] - r[2] * p[1];
    const ly = r[2] * p[0] - r[0] * p[2];
    const lz = r[0] * p[1] - r[1] * p[0];
    const magnitude = Math.sqrt(lx * lx + ly * ly + lz * lz);
    this._recordHistory(`angularMomentumParticle: |r|=${Math.hypot(...r)}, |p|=${Math.hypot(...p)} -> |L|=${magnitude}`);
    return { angularMomentum: [lx, ly, lz], magnitude };
  }

  /**
   * 转动惯量：根据几何形状计算
   * Moment of inertia by geometric shape
   */
  public momentOfInertia(
    shape: 'sphere' | 'cylinder' | 'rod' | 'ring' | 'disk' | 'rectangle' | 'thinRod' | 'hollowSphere',
    params: { mass: number; radius?: number; length?: number; width?: number; height?: number; axis?: 'center' | 'end' | 'edge' },
  ): number {
    const m = params.mass;
    if (m < 0) throw new Error('Mass must be non-negative');
    let I = 0;
    const axis = params.axis ?? 'center';
    switch (shape) {
      case 'sphere':
        I = (2 / 5) * m * Math.pow(params.radius ?? 0, 2);
        break;
      case 'hollowSphere':
        I = (2 / 3) * m * Math.pow(params.radius ?? 0, 2);
        break;
      case 'cylinder':
        I = (1 / 2) * m * Math.pow(params.radius ?? 0, 2);
        break;
      case 'ring':
        I = m * Math.pow(params.radius ?? 0, 2);
        break;
      case 'disk':
        I = (1 / 2) * m * Math.pow(params.radius ?? 0, 2);
        break;
      case 'rod':
      case 'thinRod':
        if (axis === 'center') {
          I = (1 / 12) * m * Math.pow(params.length ?? 0, 2);
        } else {
          I = (1 / 3) * m * Math.pow(params.length ?? 0, 2);
        }
        break;
      case 'rectangle':
        const w = params.width ?? 0;
        const h = params.height ?? 0;
        if (axis === 'center') {
          I = (1 / 12) * m * (w * w + h * h);
        } else {
          I = (1 / 3) * m * (w * w + h * h);
        }
        break;
    }
    this._recordHistory(`momentOfInertia: shape=${shape}, m=${m}, axis=${axis} -> I=${I}`);
    return I;
  }

  /**
   * 平行轴定理：I = I_cm + m*d²
   * Parallel axis theorem
   */
  public parallelAxisTheorem(Icm: number, mass: number, distance: number): number {
    if (mass < 0) throw new Error('Mass must be non-negative');
    if (distance < 0) throw new Error('Distance must be non-negative');
    const I = Icm + mass * distance * distance;
    this._recordHistory(`parallelAxisTheorem: I_cm=${Icm}, m=${mass}, d=${distance} -> I=${I}`);
    return I;
  }

  /**
   * 转动动能：KE = 0.5 * I * ω²
   * Rotational kinetic energy
   */
  public rotationalKineticEnergy(I: number, omega: number): {
    rotationalKE: number;
    angularMomentum: number;
  } {
    if (I < 0) throw new Error('Moment of inertia must be non-negative');
    const rotationalKE = 0.5 * I * omega * omega;
    const angularMomentum = I * omega;
    this._recordHistory(`rotationalKineticEnergy: I=${I}, ω=${omega} -> KE=${rotationalKE}`);
    return { rotationalKE, angularMomentum };
  }

  /**
   * 滚动而不滑动：平动 + 转动动能
   * Rolling without slipping
   */
  public rollingWithoutSlipping(
    mass: number,
    radius: number,
    velocity: number,
    shape: 'sphere' | 'cylinder' | 'ring',
  ): {
    totalKE: number;
    translationalKE: number;
    rotationalKE: number;
    fractionRotational: number;
  } {
    if (mass < 0 || radius <= 0) throw new Error('Mass must be non-negative, radius positive');
    const translationalKE = 0.5 * mass * velocity * velocity;
    let I: number;
    let k: number;
    switch (shape) {
      case 'sphere': I = (2 / 5) * mass * radius * radius; k = 2 / 5; break;
      case 'cylinder': I = (1 / 2) * mass * radius * radius; k = 1 / 2; break;
      case 'ring': I = mass * radius * radius; k = 1; break;
    }
    const omega = velocity / radius;
    const rotationalKE = 0.5 * I * omega * omega;
    const totalKE = translationalKE + rotationalKE;
    const fractionRotational = totalKE > 0 ? rotationalKE / totalKE : 0;
    this._recordHistory(
      `rollingWithoutSlipping: shape=${shape}, v=${velocity} -> KE_total=${totalKE}, frac_rot=${fractionRotational}`,
    );
    return { totalKE, translationalKE, rotationalKE, fractionRotational };
  }

  /**
   * 简谐运动：x(t) = A * cos(ω*t + φ)
   * Simple harmonic motion
   */
  public simpleHarmonicMotion(
    amplitude: number,
    frequency: number,
    time: number,
    phase: number = 0,
  ): { position: number; velocity: number; acceleration: number; omega: number } {
    if (amplitude < 0) throw new Error('Amplitude must be non-negative');
    const omega = 2 * Math.PI * frequency;
    const position = amplitude * Math.cos(omega * time + phase);
    const velocity = -amplitude * omega * Math.sin(omega * time + phase);
    const acceleration = -amplitude * omega * omega * Math.cos(omega * time + phase);
    const state: OscillationState = { position, velocity, acceleration, phase: omega * time + phase, amplitude };
    const id = this._generateId();
    this._oscillations.set(id, { id, state, timestamp: Date.now() });
    this._recordHistory(
      `simpleHarmonicMotion: A=${amplitude}, f=${frequency}, t=${time} -> x=${position}`,
    );
    return { position, velocity, acceleration, omega };
  }

  /**
   * 弹簧振子：ω = √(k/m)
   * Mass-spring oscillator
   */
  public massSpringOscillator(
    mass: number,
    k: number,
    amplitude: number,
    time: number,
  ): {
    position: number;
    velocity: number;
    acceleration: number;
    omega: number;
    period: number;
    frequency: number;
    energy: Energy;
  } {
    if (mass <= 0 || k <= 0) throw new Error('Mass and spring constant must be positive');
    if (amplitude < 0) throw new Error('Amplitude must be non-negative');
    const omega = Math.sqrt(k / mass);
    const period = (2 * Math.PI) / omega;
    const frequency = 1 / period;
    const position = amplitude * Math.cos(omega * time);
    const velocity = -amplitude * omega * Math.sin(omega * time);
    const acceleration = -amplitude * omega * omega * Math.cos(omega * time);
    const kineticEnergy = 0.5 * mass * velocity * velocity;
    const potentialEnergy = 0.5 * k * position * position;
    const totalEnergy = 0.5 * k * amplitude * amplitude;
    const energy: Energy = { kinetic: kineticEnergy, potential: potentialEnergy, total: totalEnergy };
    const id = this._generateId();
    this._energies.set(id, { id, energy, timestamp: Date.now() });
    this._recordHistory(`massSpringOscillator: m=${mass}, k=${k}, A=${amplitude} -> T=${period}`);
    return { position, velocity, acceleration, omega, period, frequency, energy };
  }

  /**
   * 阻尼振动：欠阻尼、临界阻尼、过阻尼
   * Damped harmonic oscillator
   */
  public dampedOscillator(
    mass: number,
    k: number,
    damping: number,
    amplitude: number,
    time: number,
  ): {
    position: number;
    velocity: number;
    regime: 'underdamped' | 'criticallyDamped' | 'overdamped';
    decayTime: number;
    frequency: number;
  } {
    if (mass <= 0 || k <= 0 || damping < 0) {
      throw new Error('Mass, k must be positive; damping non-negative');
    }
    const omega0 = Math.sqrt(k / mass);
    const gamma = damping / (2 * mass);
    let position: number;
    let velocity: number;
    let regime: 'underdamped' | 'criticallyDamped' | 'overdamped';
    let frequency: number;
    if (gamma < omega0) {
      regime = 'underdamped';
      const omegaD = Math.sqrt(omega0 * omega0 - gamma * gamma);
      frequency = omegaD / (2 * Math.PI);
      position = amplitude * Math.exp(-gamma * time) * Math.cos(omegaD * time);
      velocity = -amplitude * Math.exp(-gamma * time) *
        (gamma * Math.cos(omegaD * time) + omegaD * Math.sin(omegaD * time));
    } else if (Math.abs(gamma - omega0) < 1e-10 * omega0) {
      regime = 'criticallyDamped';
      frequency = 0;
      position = (amplitude + amplitude * omega0 * time) * Math.exp(-omega0 * time);
      velocity = -amplitude * omega0 * omega0 * time * Math.exp(-omega0 * time);
    } else {
      regime = 'overdamped';
      const delta = Math.sqrt(gamma * gamma - omega0 * omega0);
      frequency = 0;
      const c1 = amplitude * (gamma + delta) / (2 * delta);
      const c2 = amplitude * (delta - gamma) / (2 * delta);
      position = c1 * Math.exp(-(gamma - delta) * time) + c2 * Math.exp(-(gamma + delta) * time);
      velocity = -c1 * (gamma - delta) * Math.exp(-(gamma - delta) * time)
        - c2 * (gamma + delta) * Math.exp(-(gamma + delta) * time);
    }
    const decayTime = gamma > 0 ? 1 / gamma : Infinity;
    this._recordHistory(
      `dampedOscillator: m=${mass}, k=${k}, b=${damping} -> regime=${regime}`,
    );
    return { position, velocity, regime, decayTime, frequency };
  }

  /**
   * 受迫振动与共振
   * Driven harmonic oscillator and resonance
   */
  public drivenOscillator(
    mass: number,
    k: number,
    damping: number,
    drivingFreq: number,
    drivingAmp: number,
  ): {
    amplitude: number;
    phaseShift: number;
    resonantFrequency: number;
    qualityFactor: number;
    resonance: boolean;
  } {
    if (mass <= 0 || k <= 0 || damping < 0) {
      throw new Error('Mass, k must be positive; damping non-negative');
    }
    const omega0 = Math.sqrt(k / mass);
    const gamma = damping / mass;
    const omega = 2 * Math.PI * drivingFreq;
    const omegaRes = Math.sqrt(Math.max(0, omega0 * omega0 - 0.5 * gamma * gamma));
    const denom = (omega0 * omega0 - omega * omega) ** 2 + (gamma * omega) ** 2;
    const amplitude = denom > 0 ? (drivingAmp / mass) / Math.sqrt(denom) : Infinity;
    const phaseShift = Math.atan2(gamma * omega, omega0 * omega0 - omega * omega);
    const qualityFactor = gamma > 0 ? omega0 / gamma : Infinity;
    const resonance = Math.abs(omega - omegaRes) < 0.01 * omega0;
    this._recordHistory(
      `drivenOscillator: ω0=${omega0}, γ=${gamma}, ω_d=${omega} -> A=${amplitude}, Q=${qualityFactor}`,
    );
    return { amplitude, phaseShift, resonantFrequency: omegaRes / (2 * Math.PI), qualityFactor, resonance };
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
   * 单摆大角度周期：椭圆积分近似
   * Large-angle pendulum period (elliptic integral approximation)
   */
  public largeAnglePendulum(
    length: number,
    amplitude: number,
    g: number = G_EARTH,
  ): {
    period: number;
    smallAnglePeriod: number;
    correctionFactor: number;
  } {
    if (length <= 0) throw new Error('Length must be positive');
    if (g <= 0) throw new Error('Gravity must be positive');
    const T0 = 2 * Math.PI * Math.sqrt(length / g);
    const ampRad = (amplitude * Math.PI) / 180;
    const sinHalf = Math.sin(ampRad / 2);
    const correctionFactor = 1 +
      (1 / 16) * sinHalf * sinHalf +
      (11 / 3072) * Math.pow(sinHalf, 4) +
      (173 / 737280) * Math.pow(sinHalf, 6);
    const period = T0 * correctionFactor;
    this._recordHistory(
      `largeAnglePendulum: L=${length}, A=${amplitude}° -> T=${period}, correction=${correctionFactor}`,
    );
    return { period, smallAnglePeriod: T0, correctionFactor };
  }

  /**
   * 物理摆：T = 2π * √(I/(mgh))
   * Physical pendulum
   */
  public physicalPendulum(
    I: number,
    mass: number,
    distanceToCM: number,
    g: number = G_EARTH,
  ): {
    period: number;
    frequency: number;
    equivalentLength: number;
  } {
    if (mass <= 0 || distanceToCM <= 0) throw new Error('Mass and distance must be positive');
    if (I <= 0) throw new Error('Moment of inertia must be positive');
    const period = 2 * Math.PI * Math.sqrt(I / (mass * g * distanceToCM));
    const frequency = 1 / period;
    const equivalentLength = I / (mass * distanceToCM);
    this._recordHistory(
      `physicalPendulum: I=${I}, m=${mass}, h=${distanceToCM} -> T=${period}`,
    );
    return { period, frequency, equivalentLength };
  }

  /**
   * 耦合振子与正态模式
   * Coupled oscillators and normal modes
   */
  public coupledOscillators(
    m1: number,
    m2: number,
    k1: number,
    k2: number,
    kCouple: number,
  ): {
    mode1Frequency: number;
    mode2Frequency: number;
    mode1Ratio: number;
    mode2Ratio: number;
    beatFrequency: number;
  } {
    if (m1 <= 0 || m2 <= 0 || k1 <= 0 || k2 <= 0 || kCouple < 0) {
      throw new Error('Masses and spring constants must be positive');
    }
    const omega1Sq = (k1 + kCouple) / m1;
    const omega2Sq = (k2 + kCouple) / m2;
    const kcSq = kCouple * kCouple / (m1 * m2);
    const avg = (omega1Sq + omega2Sq) / 2;
    const diff = (omega1Sq - omega2Sq) / 2;
    const mode1Omega = Math.sqrt(avg + Math.sqrt(diff * diff + kcSq));
    const mode2Omega = Math.sqrt(Math.max(0, avg - Math.sqrt(diff * diff + kcSq)));
    const mode1Ratio = kCouple / (m1 * mode1Omega * mode1Omega - k1 - kCouple);
    const mode2Ratio = kCouple / (m1 * mode2Omega * mode2Omega - k1 - kCouple);
    const beatFrequency = Math.abs(mode1Omega - mode2Omega) / (2 * Math.PI);
    this._recordHistory(
      `coupledOscillators: m1=${m1}, m2=${m2}, kc=${kCouple} -> ω1=${mode1Omega}, ω2=${mode2Omega}`,
    );
    return {
      mode1Frequency: mode1Omega / (2 * Math.PI),
      mode2Frequency: mode2Omega / (2 * Math.PI),
      mode1Ratio,
      mode2Ratio,
      beatFrequency,
    };
  }

  /**
   * 弹性碰撞：一维
   * Elastic collision in 1D
   */
  public elasticCollision1D(
    m1: number,
    v1: number,
    m2: number,
    v2: number,
  ): {
    v1Final: number;
    v2Final: number;
    relativeVelocity: number;
    kineticEnergyConserved: boolean;
  } {
    if (m1 < 0 || m2 < 0) throw new Error('Masses must be non-negative');
    const totalMass = m1 + m2;
    if (totalMass === 0) throw new Error('Total mass must be positive');
    const v1Final = ((m1 - m2) * v1 + 2 * m2 * v2) / totalMass;
    const v2Final = ((m2 - m1) * v2 + 2 * m1 * v1) / totalMass;
    const relativeVelocity = v2Final - v1Final;
    const keInitial = 0.5 * m1 * v1 * v1 + 0.5 * m2 * v2 * v2;
    const keFinal = 0.5 * m1 * v1Final * v1Final + 0.5 * m2 * v2Final * v2Final;
    const kineticEnergyConserved = Math.abs(keInitial - keFinal) < 1e-9 * Math.max(1, keInitial);
    const result: CollisionResult = {
      impulse: [m1 * (v1Final - v1), 0, 0],
      velocityA: [v1Final, 0, 0],
      velocityB: [v2Final, 0, 0],
      energyLost: 0,
      contactPoint: [0, 0, 0],
    };
    const id = this._generateId();
    this._collisions.set(id, { id, result, timestamp: Date.now() });
    this._recordHistory(`elasticCollision1D: m1=${m1}, v1=${v1}, m2=${m2}, v2=${v2} -> v1'=${v1Final}, v2'=${v2Final}`);
    return { v1Final, v2Final, relativeVelocity, kineticEnergyConserved };
  }

  /**
   * 非弹性碰撞：恢复系数 e
   * Inelastic collision with coefficient of restitution
   */
  public inelasticCollision1D(
    m1: number,
    v1: number,
    m2: number,
    v2: number,
    restitution: number,
  ): {
    v1Final: number;
    v2Final: number;
    energyLost: number;
    restitutionCoefficient: number;
  } {
    if (m1 < 0 || m2 < 0) throw new Error('Masses must be non-negative');
    if (restitution < 0 || restitution > 1) throw new Error('Restitution must be in [0, 1]');
    const totalMass = m1 + m2;
    if (totalMass === 0) throw new Error('Total mass must be positive');
    const vRel = v1 - v2;
    const pTotal = m1 * v1 + m2 * v2;
    const v2Final = (pTotal + m1 * restitution * vRel) / totalMass;
    const v1Final = v2Final - restitution * vRel;
    const keInitial = 0.5 * m1 * v1 * v1 + 0.5 * m2 * v2 * v2;
    const keFinal = 0.5 * m1 * v1Final * v1Final + 0.5 * m2 * v2Final * v2Final;
    const energyLost = keInitial - keFinal;
    const result: CollisionResult = {
      impulse: [m1 * (v1Final - v1), 0, 0],
      velocityA: [v1Final, 0, 0],
      velocityB: [v2Final, 0, 0],
      energyLost,
      contactPoint: [0, 0, 0],
    };
    const id = this._generateId();
    this._collisions.set(id, { id, result, timestamp: Date.now() });
    this._recordHistory(
      `inelasticCollision1D: e=${restitution}, m1=${m1}, m2=${m2} -> ΔKE=${energyLost}`,
    );
    return { v1Final, v2Final, energyLost, restitutionCoefficient: restitution };
  }

  /**
   * 二维弹性碰撞
   * 2D elastic collision
   */
  public elasticCollision2D(
    m1: number,
    v1: [number, number],
    m2: number,
    v2: [number, number],
    contactAngle: number,
  ): {
    v1Final: [number, number];
    v2Final: [number, number];
    scatterAngle1: number;
    scatterAngle2: number;
    energyConserved: boolean;
  } {
    if (m1 <= 0 || m2 <= 0) throw new Error('Masses must be positive');
    const angleRad = (contactAngle * Math.PI) / 180;
    const n = [Math.cos(angleRad), Math.sin(angleRad)];
    const t = [-Math.sin(angleRad), Math.cos(angleRad)];
    const v1n = v1[0] * n[0] + v1[1] * n[1];
    const v1t = v1[0] * t[0] + v1[1] * t[1];
    const v2n = v2[0] * n[0] + v2[1] * n[1];
    const v2t = v2[0] * t[0] + v2[1] * t[1];
    const v1nFinal = ((m1 - m2) * v1n + 2 * m2 * v2n) / (m1 + m2);
    const v2nFinal = ((m2 - m1) * v2n + 2 * m1 * v1n) / (m1 + m2);
    const v1Final: [number, number] = [
      v1nFinal * n[0] + v1t * t[0],
      v1nFinal * n[1] + v1t * t[1],
    ];
    const v2Final: [number, number] = [
      v2nFinal * n[0] + v2t * t[0],
      v2nFinal * n[1] + v2t * t[1],
    ];
    const scatterAngle1 = Math.atan2(v1Final[1], v1Final[0]);
    const scatterAngle2 = Math.atan2(v2Final[1], v2Final[0]);
    const keInitial = 0.5 * m1 * (v1[0] * v1[0] + v1[1] * v1[1]) +
      0.5 * m2 * (v2[0] * v2[0] + v2[1] * v2[1]);
    const keFinal = 0.5 * m1 * (v1Final[0] * v1Final[0] + v1Final[1] * v1Final[1]) +
      0.5 * m2 * (v2Final[0] * v2Final[0] + v2Final[1] * v2Final[1]);
    const energyConserved = Math.abs(keInitial - keFinal) < 1e-9 * Math.max(1, keInitial);
    this._recordHistory(
      `elasticCollision2D: θ_contact=${contactAngle}°, θ1=${(scatterAngle1 * 180 / Math.PI).toFixed(2)}°`,
    );
    return { v1Final, v2Final, scatterAngle1, scatterAngle2, energyConserved };
  }

  /**
   * 开普勒第三定律：T² ∝ a³
   * Kepler's Third Law
   */
  public keplerThirdLaw(a: number, M: number): {
    period: number;
    semiMajorAxis: number;
    centralMass: number;
  } {
    if (a <= 0 || M <= 0) throw new Error('Semi-major axis and mass must be positive');
    const period = 2 * Math.PI * Math.sqrt((a * a * a) / (G_UNIVERSAL * M));
    this._recordHistory(`keplerThirdLaw: a=${a}, M=${M} -> T=${period}`);
    return { period, semiMajorAxis: a, centralMass: M };
  }

  /**
   * 轨道速度：v = √(GM/r)
   * Orbital velocity
   */
  public orbitalVelocity(M: number, r: number): {
    velocity: number;
    period: number;
    escapeVelocity: number;
  } {
    if (M <= 0 || r <= 0) throw new Error('Mass and radius must be positive');
    const velocity = Math.sqrt((G_UNIVERSAL * M) / r);
    const period = (2 * Math.PI * r) / velocity;
    const escapeVelocity = Math.sqrt(2) * velocity;
    this._recordHistory(`orbitalVelocity: M=${M}, r=${r} -> v=${velocity}`);
    return { velocity, period, escapeVelocity };
  }

  /**
   * 比耐公式与轨道类型
   * Orbit classification by eccentricity
   */
  public orbitType(specificEnergy: number, angularMomentum: number, M: number): {
    eccentricity: number;
    orbitType: 'circle' | 'ellipse' | 'parabola' | 'hyperbola';
    semiMajorAxis: number;
    periapsis: number;
    apoapsis: number;
  } {
    if (M <= 0) throw new Error('Central mass must be positive');
    const mu = G_UNIVERSAL * M;
    const h = angularMomentum;
    const epsilon = specificEnergy;
    const eccentricity = Math.sqrt(Math.max(0, 1 + (2 * epsilon * h * h) / (mu * mu)));
    let orbitType: 'circle' | 'ellipse' | 'parabola' | 'hyperbola';
    let semiMajorAxis: number;
    let periapsis: number;
    let apoapsis: number;
    if (Math.abs(eccentricity) < 1e-10) {
      orbitType = 'circle';
      semiMajorAxis = (h * h) / mu;
      periapsis = semiMajorAxis;
      apoapsis = semiMajorAxis;
    } else if (eccentricity < 1) {
      orbitType = 'ellipse';
      semiMajorAxis = -mu / (2 * epsilon);
      periapsis = semiMajorAxis * (1 - eccentricity);
      apoapsis = semiMajorAxis * (1 + eccentricity);
    } else if (Math.abs(eccentricity - 1) < 1e-10) {
      orbitType = 'parabola';
      semiMajorAxis = Infinity;
      periapsis = (h * h) / (2 * mu);
      apoapsis = Infinity;
    } else {
      orbitType = 'hyperbola';
      semiMajorAxis = mu / (2 * epsilon);
      periapsis = semiMajorAxis * (eccentricity - 1);
      apoapsis = Infinity;
    }
    this._recordHistory(
      `orbitType: e=${eccentricity.toFixed(4)} -> ${orbitType}, a=${semiMajorAxis}`,
    );
    return { eccentricity, orbitType, semiMajorAxis, periapsis, apoapsis };
  }

  /**
   * 拉格朗日量：L = T - V
   * Lagrangian of a system
   */
  public lagrangian(kinetic: number, potential: number): {
    lagrangian: number;
    actionEstimate: number;
    hamiltonian: number;
  } {
    const lagrangian = kinetic - potential;
    const hamiltonian = kinetic + potential;
    const actionEstimate = Math.abs(lagrangian) * 1;
    this._recordHistory(`lagrangian: T=${kinetic}, V=${potential} -> L=${lagrangian}`);
    return { lagrangian, actionEstimate, hamiltonian };
  }

  /**
   * 科里奥利力：F_c = -2m * (ω × v)
   * Coriolis force in rotating frame
   */
  public coriolisForce(
    mass: number,
    omega: [number, number, number],
    velocity: [number, number, number],
  ): {
    force: [number, number, number];
    magnitude: number;
    direction: string;
  } {
    if (mass < 0) throw new Error('Mass must be non-negative');
    const fx = -2 * mass * (omega[1] * velocity[2] - omega[2] * velocity[1]);
    const fy = -2 * mass * (omega[2] * velocity[0] - omega[0] * velocity[2]);
    const fz = -2 * mass * (omega[0] * velocity[1] - omega[1] * velocity[0]);
    const magnitude = Math.sqrt(fx * fx + fy * fy + fz * fz);
    const direction = 'perpendicular to both ω and v';
    const force: Force = {
      vector: [fx, fy, fz],
      magnitude,
      direction: Math.atan2(fy, fx),
      source: 'Coriolis force',
    };
    const id = this._generateId();
    this._forces.set(id, { id, force, timestamp: Date.now() });
    this._recordHistory(`coriolisForce: m=${mass}, |ω|=${Math.hypot(...omega)} -> |F|=${magnitude}`);
    return { force: [fx, fy, fz], magnitude, direction };
  }

  /**
   * 离心力：F_cf = m * ω² * r
   * Centrifugal force in rotating frame
   */
  public centrifugalForce(
    mass: number,
    omega: number,
    radius: number,
  ): {
    force: number;
    acceleration: number;
    direction: 'outward' | 'inward';
  } {
    if (mass < 0) throw new Error('Mass must be non-negative');
    if (radius < 0) throw new Error('Radius must be non-negative');
    const acceleration = omega * omega * radius;
    const force = mass * acceleration;
    this._recordHistory(`centrifugalForce: m=${mass}, ω=${omega}, r=${radius} -> F=${force}`);
    return { force, acceleration, direction: 'outward' };
  }

  /**
   * 潮汐力：引力梯度
   * Tidal force (gravitational gradient)
   */
  public tidalForce(
    M: number,
    m: number,
    R: number,
    r: number,
  ): {
    tidalForce: number;
    tidalAcceleration: number;
    ratio: number;
  } {
    if (M <= 0 || m <= 0 || R <= 0 || r <= 0) {
      throw new Error('Masses and distances must be positive');
    }
    const fg = (G_UNIVERSAL * M * m) / (R * R);
    const tidalForce = (2 * G_UNIVERSAL * M * m * r) / (R * R * R);
    const tidalAcceleration = tidalForce / m;
    const ratio = tidalForce / fg;
    this._recordHistory(`tidalForce: M=${M}, R=${R}, r=${r} -> F_tide=${tidalForce}`);
    return { tidalForce, tidalAcceleration, ratio };
  }

  /**
   * 刚体平衡条件：合力为零，合力矩为零
   * Rigid body equilibrium conditions
   */
  public rigidBodyEquilibrium(
    forces: { force: [number, number, number]; position: [number, number, number] }[],
  ): {
    netForce: [number, number, number];
    netTorque: [number, number, number];
    inEquilibrium: boolean;
    forceMagnitude: number;
    torqueMagnitude: number;
  } {
    let nfx = 0, nfy = 0, nfz = 0;
    let ntx = 0, nty = 0, ntz = 0;
    for (const f of forces) {
      nfx += f.force[0];
      nfy += f.force[1];
      nfz += f.force[2];
      const [rx, ry, rz] = f.position;
      const [fx, fy, fz] = f.force;
      ntx += ry * fz - rz * fy;
      nty += rz * fx - rx * fz;
      ntz += rx * fy - ry * fx;
    }
    const forceMagnitude = Math.sqrt(nfx * nfx + nfy * nfy + nfz * nfz);
    const torqueMagnitude = Math.sqrt(ntx * ntx + nty * nty + ntz * ntz);
    const inEquilibrium = forceMagnitude < 1e-9 && torqueMagnitude < 1e-9;
    this._recordHistory(
      `rigidBodyEquilibrium: ${forces.length} forces -> |F_net|=${forceMagnitude}, |τ_net|=${torqueMagnitude}`,
    );
    return {
      netForce: [nfx, nfy, nfz],
      netTorque: [ntx, nty, ntz],
      inEquilibrium,
      forceMagnitude,
      torqueMagnitude,
    };
  }

  /**
   * 应力与应变：胡克定律推广
   * Stress and strain (generalized Hooke's law)
   */
  public stressStrain(
    force: number,
    area: number,
    length0: number,
    deltaL: number,
    youngModulus: number,
  ): {
    stress: number;
    strain: number;
    youngModulusCheck: number;
    elasticPotentialEnergy: number;
    springConstant: number;
  } {
    if (area <= 0 || length0 <= 0) throw new Error('Area and length must be positive');
    const stress = force / area;
    const strain = deltaL / length0;
    const youngModulusCheck = strain !== 0 ? stress / strain : youngModulus;
    const springConstant = (youngModulus * area) / length0;
    const elasticPotentialEnergy = 0.5 * springConstant * deltaL * deltaL;
    this._recordHistory(
      `stressStrain: σ=${stress}, ε=${strain}, Y=${youngModulus} -> U=${elasticPotentialEnergy}`,
    );
    return { stress, strain, youngModulusCheck, elasticPotentialEnergy, springConstant };
  }

  /**
   * 泊松比：横向应变 / 纵向应变
   * Poisson's ratio
   */
  public poissonRatio(
    axialStrain: number,
    lateralStrain: number,
  ): {
    poissonRatio: number;
    bulkModulus: number;
    shearModulus: number;
    validRange: boolean;
  } {
    const nu = -lateralStrain / axialStrain;
    const validRange = nu >= -1 && nu <= 0.5;
    const E = 1;
    const bulkModulus = E / (3 * (1 - 2 * nu));
    const shearModulus = E / (2 * (1 + nu));
    this._recordHistory(`poissonRatio: ν=${nu}, valid=${validRange}`);
    return { poissonRatio: nu, bulkModulus, shearModulus, validRange };
  }

  /**
   * 万有引力：F = G*m1*m2/r²
   * Universal gravitation
   */
  public universalGravitation(m1: number, m2: number, r: number): {
    force: number;
    acceleration1: number;
    acceleration2: number;
    potentialEnergy: number;
  } {
    if (r <= 0) throw new Error('Distance must be positive');
    if (m1 < 0 || m2 < 0) throw new Error('Masses must be non-negative');
    const force = (G_UNIVERSAL * m1 * m2) / (r * r);
    const acceleration1 = m1 > 0 ? force / m1 : 0;
    const acceleration2 = m2 > 0 ? force / m2 : 0;
    const potentialEnergy = (-G_UNIVERSAL * m1 * m2) / r;
    this._recordHistory(`universalGravitation: m1=${m1}, m2=${m2}, r=${r} -> F=${force}`);
    return { force, acceleration1, acceleration2, potentialEnergy };
  }

  /**
   * 转换为数据包
   * Serialize to DataPacket
   */
  public toPacket(): DataPacket<{
    forces: number;
    velocities: number;
    energies: number;
    collisions: number;
    oscillations: number;
    history: string[];
  }> {
    return {
      id: `class-mech-${Date.now()}-${this._counter}`,
      payload: {
        forces: this._forces.size,
        velocities: this._velocities.size,
        energies: this._energies.size,
        collisions: this._collisions.size,
        oscillations: this._oscillations.size,
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
    this._collisions.clear();
    this._oscillations.clear();
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

  /** 地球重力加速度。 */
  public static readonly G_EARTH = G_EARTH;
  /** 万有引力常数。 */
  public static readonly G = G_UNIVERSAL;
  /** 光速。 */
  public static readonly C = C_LIGHT;
}
