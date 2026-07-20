import { DataPacket, PacketMeta } from '../shared/types';

/** An orbit. */
export interface Orbit {
  id: string;
  semiMajor: number;
  eccentricity: number;
  inclination: number;
  period: number;
  body: string;
  meanAnomaly: number;
  argPeriapsis: number;
  longAscNode: number;
}

/** Keplerian orbital elements. */
export interface Keplerian {
  a: number;
  e: number;
  i: number;
  omega: number;
  Omega: number;
  M: number;
  epoch: number;
}

/** A perturbation. */
export interface Perturbation {
  source: string;
  target: string;
  acceleration: number;
  type: 'secular' | 'periodic' | 'resonant';
}

/** State vector (position + velocity). */
export interface StateVector {
  position: [number, number, number];
  velocity: [number, number, number];
  epoch: number;
}

/** Orbital maneuver. */
export interface Maneuver {
  id: string;
  type: 'impulsive' | 'low-thrust' | 'gravity-assist';
  deltaV: number;
  time: number;
  description: string;
}

/** Two-line element set. */
export interface TLE {
  name: string;
  line1: string;
  line2: string;
  epoch: number;
  inclination: number;
  raan: number;
  eccentricity: number;
  argPerigee: number;
  meanAnomaly: number;
  meanMotion: number;
}

/** Interplanetary trajectory. */
export interface InterplanetaryTrajectory {
  fromBody: string;
  toBody: string;
  departureDate: number;
  arrivalDate: number;
  deltaV: number;
  transferType: 'hohmann' | 'bielliptic' | 'gravity-assist' | 'fast-transfer';
}

/** History record. */
interface AstroRecord {
  operation: string;
  timestamp: number;
}

/** Gravitational constant (m^3 kg^-1 s^-2). */
export const G = 6.6743e-11;
/** Standard gravitational parameter of the Sun (m^3/s^2). */
export const MU_SUN = 1.32712440018e20;
/** Standard gravitational parameter of Earth (m^3/s^2). */
export const MU_EARTH = 3.986004418e14;
/** Standard gravitational parameter of Moon (m^3/s^2). */
export const MU_MOON = 4.9048695e12;
/** Standard gravitational parameter of Mars (m^3/s^2). */
export const MU_MARS = 4.2828e13;
/** Standard gravitational parameter of Jupiter (m^3/s^2). */
export const MU_JUPITER = 1.2668653e17;
/** Astronomical unit (meters). */
export const AU = 1.495978707e11;
/** Speed of light (m/s). */
export const SPEED_OF_LIGHT = 2.99792458e8;
/** Earth radius (meters). */
export const EARTH_RADIUS = 6.371e6;
/** Solar radius (meters). */
export const SOLAR_RADIUS = 6.957e8;
/** Earth's J2 perturbation term. */
export const EARTH_J2 = 1.08263e-3;
/** Stefan-Boltzmann constant. */
export const STEFAN_BOLTZMANN = 5.670374419e-8;
/** Planck constant. */
export const PLANCK_CONSTANT = 6.62607015e-34;
/** Boltzmann constant. */
export const BOLTZMANN = 1.380649e-23;
/** Solar flux at 1 AU (W/m^2). */
export const SOLAR_FLUX = 1361;

export class CelestialMechanics {
  private _orbits: Map<string, Orbit> = new Map();
  private _bodies: string[] = [];
  private _perturbations: Perturbation[] = [];
  private _maneuvers: Maneuver[] = [];
  private _tleData: TLE[] = [];
  private _trajectories: InterplanetaryTrajectory[] = [];
  private _history: AstroRecord[] = [];
  private _counter = 0;

  keplerFirstLaw(a: number, e: number): { perihelion: number; aphelion: number; semiMinor: number; area: number; focalDistance: number; latusRectum: number } {
    const perihelion = a * (1 - e);
    const aphelion = a * (1 + e);
    const semiMinor = a * Math.sqrt(1 - e * e);
    const area = Math.PI * a * a * Math.sqrt(1 - e * e);
    const focalDistance = a * e;
    const latusRectum = a * (1 - e * e);
    this._recordHistory('keplerFirstLaw');
    return { perihelion, aphelion, semiMinor, area, focalDistance, latusRectum };
  }

  keplerSecondLaw(position: [number, number], velocity: [number, number]): number {
    const L = position[0] * velocity[1] - position[1] * velocity[0];
    this._recordHistory('keplerSecondLaw');
    return Math.abs(L) / 2;
  }

  keplerThirdLaw(a: number, M: number): number {
    const result = 2 * Math.PI * Math.sqrt(a * a * a / M);
    this._recordHistory('keplerThirdLaw');
    return result;
  }

  orbitalPeriod(a: number, mu: number): number {
    const result = 2 * Math.PI * Math.sqrt(Math.pow(a, 3) / mu);
    this._recordHistory('orbitalPeriod');
    return result;
  }

  orbitalVelocity(r: number, a: number, mu: number): number {
    const result = Math.sqrt(mu * (2 / r - 1 / a));
    this._recordHistory('orbitalVelocity');
    return result;
  }

  circularVelocity(r: number, mu: number): number {
    return Math.sqrt(mu / r);
  }

  escapeVelocity(r: number, mu: number): number {
    return Math.sqrt(2 * mu / r);
  }

  hyperbolicVelocity(r: number, a: number, mu: number): number {
    return Math.sqrt(mu * (2 / r + 1 / Math.abs(a)));
  }

  eccentricAnomaly(M: number, e: number, tol: number = 1e-12, maxIter: number = 100): number {
    let E = M < 0 ? M + 2 * Math.PI : M;
    if (e > 0.8) E = Math.PI;
    for (let i = 0; i < maxIter; i++) {
      const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
      E -= dE;
      if (Math.abs(dE) < tol) break;
    }
    return E;
  }

  hyperbolicEccentricAnomaly(M: number, e: number, tol: number = 1e-12): number {
    let F = Math.log(2 * M / e + 1);
    for (let i = 0; i < 50; i++) {
      const dF = (e * Math.sinh(F) - F - M) / (e * Math.cosh(F) - 1);
      F -= dF;
      if (Math.abs(dF) < tol) break;
    }
    return F;
  }

  trueAnomaly(E: number, e: number): number {
    return 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2));
  }

  eccentricFromTrue(nu: number, e: number): number {
    return 2 * Math.atan2(Math.sqrt(1 - e) * Math.sin(nu / 2), Math.sqrt(1 + e) * Math.cos(nu / 2));
  }

  meanFromEccentric(E: number, e: number): number {
    return E - e * Math.sin(E);
  }

  meanFromTrue(nu: number, e: number): number {
    const E = this.eccentricFromTrue(nu, e);
    return this.meanFromEccentric(E, e);
  }

  trueFromMean(M: number, e: number): number {
    const E = this.eccentricAnomaly(M, e);
    return this.trueAnomaly(E, e);
  }

  radiusAtTrueAnomaly(a: number, e: number, nu: number): number {
    return a * (1 - e * e) / (1 + e * Math.cos(nu));
  }

  radiusAtEccentricAnomaly(a: number, e: number, E: number): number {
    return a * (1 - e * Math.cos(E));
  }

  flightPathAngle(nu: number, e: number): number {
    return Math.atan2(e * Math.sin(nu), 1 + e * Math.cos(nu));
  }

  orbitalElements(state: StateVector, mu: number = MU_EARTH): Keplerian {
    const r = Math.sqrt(state.position[0] ** 2 + state.position[1] ** 2 + state.position[2] ** 2);
    const v2 = state.velocity[0] ** 2 + state.velocity[1] ** 2 + state.velocity[2] ** 2;
    const rv = state.position[0] * state.velocity[0] + state.position[1] * state.velocity[1] + state.position[2] * state.velocity[2];

    const a = 1 / (2 / r - v2 / mu);

    const hx = state.position[1] * state.velocity[2] - state.position[2] * state.velocity[1];
    const hy = state.position[2] * state.velocity[0] - state.position[0] * state.velocity[2];
    const hz = state.position[0] * state.velocity[1] - state.position[1] * state.velocity[0];
    const h = Math.sqrt(hx * hx + hy * hy + hz * hz);

    const i = Math.acos(hz / h);

    const Omega = Math.atan2(hx, -hy);

    const eVecX = (v2 * state.position[0] - rv * state.velocity[0]) / mu - state.position[0] / r;
    const eVecY = (v2 * state.position[1] - rv * state.velocity[1]) / mu - state.position[1] / r;
    const eVecZ = (v2 * state.position[2] - rv * state.velocity[2]) / mu - state.position[2] / r;
    const e = Math.sqrt(eVecX * eVecX + eVecY * eVecY + eVecZ * eVecZ);

    const n = Math.sqrt(hx * hx + hy * hy);
    let omega = 0;
    if (n > 1e-10) {
      const cosOmega = (hx * eVecX + hy * eVecY) / (n * e);
      omega = Math.acos(Math.max(-1, Math.min(1, cosOmega)));
      if (eVecZ < 0) omega = 2 * Math.PI - omega;
    }

    let nu = 0;
    if (e > 1e-10) {
      const cosNu = (eVecX * state.position[0] + eVecY * state.position[1] + eVecZ * state.position[2]) / (e * r);
      nu = Math.acos(Math.max(-1, Math.min(1, cosNu)));
      if (rv < 0) nu = 2 * Math.PI - nu;
    }

    const M = e < 1 ? this.meanFromEccentric(this.eccentricFromTrue(nu, e), e) : 0;

    this._recordHistory('orbitalElements');
    return { a, e, i, omega, Omega, M, epoch: state.epoch };
  }

  stateVector(elements: Keplerian, mu: number = MU_EARTH): StateVector {
    const { a, e, i, omega, Omega, M, epoch } = elements;

    const E = this.eccentricAnomaly(M, e);
    const nu = this.trueAnomaly(E, e);

    const r = a * (1 - e * Math.cos(E));
    const xOrbit = r * Math.cos(nu);
    const yOrbit = r * Math.sin(nu);

    const n = Math.sqrt(mu / Math.pow(a, 3));
    const vxOrbit = -n * a * Math.sin(E) / (1 - e * Math.cos(E));
    const vyOrbit = n * a * Math.sqrt(1 - e * e) * Math.cos(E) / (1 - e * Math.cos(E));

    const cosOmega = Math.cos(Omega);
    const sinOmega = Math.sin(Omega);
    const cosi = Math.cos(i);
    const sini = Math.sin(i);
    const cosw = Math.cos(omega);
    const sinw = Math.sin(omega);

    const R11 = cosOmega * cosw - sinOmega * sinw * cosi;
    const R12 = -cosOmega * sinw - sinOmega * cosw * cosi;
    const R21 = sinOmega * cosw + cosOmega * sinw * cosi;
    const R22 = -sinOmega * sinw + cosOmega * cosw * cosi;
    const R31 = sinw * sini;
    const R32 = cosw * sini;

    const x = R11 * xOrbit + R12 * yOrbit;
    const y = R21 * xOrbit + R22 * yOrbit;
    const z = R31 * xOrbit + R32 * yOrbit;

    const vx = R11 * vxOrbit + R12 * vyOrbit;
    const vy = R21 * vxOrbit + R22 * vyOrbit;
    const vz = R31 * vxOrbit + R32 * vyOrbit;

    return {
      position: [x, y, z],
      velocity: [vx, vy, vz],
      epoch,
    };
  }

  propagateOrbit(elements: Keplerian, deltaTime: number, mu: number = MU_EARTH): Keplerian {
    const n = Math.sqrt(mu / Math.abs(elements.a) ** 3);
    const newM = elements.M + n * deltaTime;
    this._recordHistory('propagateOrbit');
    return { ...elements, M: newM, epoch: elements.epoch + deltaTime };
  }

  hohmannTransfer(r1: number, r2: number, mu: number): { deltaV1: number; deltaV2: number; totalDeltaV: number; transferTime: number; semiMajorAxis: number; period: number } {
    const aTransfer = (r1 + r2) / 2;
    const v1 = Math.sqrt(mu / r1);
    const v2 = Math.sqrt(mu / r2);
    const vTransfer1 = Math.sqrt(mu * (2 / r1 - 1 / aTransfer));
    const vTransfer2 = Math.sqrt(mu * (2 / r2 - 1 / aTransfer));
    const deltaV1 = Math.abs(vTransfer1 - v1);
    const deltaV2 = Math.abs(v2 - vTransfer2);
    const transferTime = Math.PI * Math.sqrt(Math.pow(aTransfer, 3) / mu);
    const period = 2 * Math.PI * Math.sqrt(Math.pow(aTransfer, 3) / mu);
    this._recordHistory('hohmannTransfer');
    return { deltaV1, deltaV2, totalDeltaV: deltaV1 + deltaV2, transferTime, semiMajorAxis: aTransfer, period };
  }

  biellipticTransfer(r1: number, r2: number, rb: number, mu: number): { deltaV1: number; deltaV2: number; deltaV3: number; total: number; transferTime: number } {
    const v1 = Math.sqrt(mu / r1);
    const v2 = Math.sqrt(mu / r2);
    const a1 = (r1 + rb) / 2;
    const a2 = (r2 + rb) / 2;
    const vb1 = Math.sqrt(mu * (2 / r1 - 1 / a1));
    const vb2 = Math.sqrt(mu * (2 / rb - 1 / a1));
    const vb3 = Math.sqrt(mu * (2 / rb - 1 / a2));
    const vb4 = Math.sqrt(mu * (2 / r2 - 1 / a2));
    const deltaV1 = Math.abs(vb1 - v1);
    const deltaV2 = Math.abs(vb3 - vb2);
    const deltaV3 = Math.abs(v2 - vb4);
    const transferTime = Math.PI * (Math.sqrt(a1 ** 3 / mu) + Math.sqrt(a2 ** 3 / mu));
    this._recordHistory('biellipticTransfer');
    return { deltaV1, deltaV2, deltaV3, total: deltaV1 + deltaV2 + deltaV3, transferTime };
  }

  optimalTransfer(r1: number, r2: number, mu: number): { type: 'hohmann' | 'bielliptic'; totalDeltaV: number; transferTime: number; rbRatio?: number } {
    const hohmann = this.hohmannTransfer(r1, r2, mu);
    const ratio = r2 / r1;
    if (ratio > 11.94) {
      const rb = 11.94 * r1;
      const biell = this.biellipticTransfer(r1, r2, rb, mu);
      if (biell.total < hohmann.totalDeltaV) {
        return { type: 'bielliptic', totalDeltaV: biell.total, transferTime: biell.transferTime, rbRatio: 11.94 };
      }
    }
    return { type: 'hohmann', totalDeltaV: hohmann.totalDeltaV, transferTime: hohmann.transferTime };
  }

  planeChange(r: number, mu: number, deltaI: number): number {
    const v = Math.sqrt(mu / r);
    return 2 * v * Math.sin(deltaI / 2);
  }

  combinedPlaneChange(r1: number, r2: number, deltaI: number, mu: number): { combinedDeltaV: number; separateDeltaV: number; optimal: boolean } {
    const v1 = Math.sqrt(mu / r1);
    const v2 = Math.sqrt(mu / r2);
    const combined = Math.sqrt(v1 * v1 + v2 * v2 - 2 * v1 * v2 * Math.cos(deltaI));
    const planeChangeAtR1 = 2 * v1 * Math.sin(deltaI / 2);
    const planeChangeAtR2 = 2 * v2 * Math.sin(deltaI / 2);
    const separate = Math.abs(v2 - v1) + Math.min(planeChangeAtR1, planeChangeAtR2);
    return { combinedDeltaV: combined, separateDeltaV: separate, optimal: combined < separate };
  }

  gravityAssist(spacecraftVel: [number, number, number], planetVel: [number, number, number], impactParam: number, planetRadius: number, muPlanet: number): { velocity: [number, number, number]; deltaV: number; deflectionAngle: number } {
    const vInRel: [number, number, number] = [
      spacecraftVel[0] - planetVel[0],
      spacecraftVel[1] - planetVel[1],
      spacecraftVel[2] - planetVel[2],
    ];
    const vRel = Math.sqrt(vInRel[0] ** 2 + vInRel[1] ** 2 + vInRel[2] ** 2);
    const delta = impactParam * vRel * vRel / muPlanet;
    const deflectionAngle = 2 * Math.atan(1 / Math.max(delta, 1e-10));
    const sinD = Math.sin(deflectionAngle);
    const cosD = Math.cos(deflectionAngle);

    const vOutRel: [number, number, number] = [
      vInRel[0] * cosD,
      vInRel[1] * sinD,
      vInRel[2],
    ];
    const vOut: [number, number, number] = [
      vOutRel[0] + planetVel[0],
      vOutRel[1] + planetVel[1],
      vOutRel[2] + planetVel[2],
    ];
    const deltaV = Math.sqrt(
      (vOut[0] - spacecraftVel[0]) ** 2 +
      (vOut[1] - spacecraftVel[1]) ** 2 +
      (vOut[2] - spacecraftVel[2]) ** 2,
    );
    this._recordHistory('gravityAssist');
    return { velocity: vOut, deltaV, deflectionAngle };
  }

  sphereOfInfluence(bodyMass: number, sunMass: number, semiMajorAxis: number = AU): number {
    return semiMajorAxis * Math.pow(bodyMass / sunMass, 2 / 5);
  }

  hillSphere(bodyMass: number, centralMass: number, semiMajorAxis: number, eccentricity: number = 0): number {
    return semiMajorAxis * (1 - eccentricity) * Math.pow(bodyMass / (3 * centralMass), 1 / 3);
  }

  rocheLimit(bodyRadius: number, bodyDensity: number, satelliteDensity: number): number {
    return bodyRadius * 2.456 * Math.pow(bodyDensity / satelliteDensity, 1 / 3);
  }

  rocheRigid(bodyRadius: number, bodyDensity: number, satelliteDensity: number): number {
    return bodyRadius * 1.26 * Math.pow(2 * bodyDensity / satelliteDensity, 1 / 3);
  }

  lagrangePoints(m1: number, m2: number, r: number): { L1: [number, number]; L2: [number, number]; L3: [number, number]; L4: [number, number]; L5: [number, number]; stable: string[] } {
    const mu = m2 / (m1 + m2);
    const x1 = -mu * r;
    const x2 = (1 - mu) * r;

    let L1x = x2 - r * Math.pow(mu / 3, 1 / 3);
    for (let i = 0; i < 20; i++) {
      const x = (L1x - x1) / r;
      const f = (1 - mu) / (x * x) - mu / ((1 - x) * (1 - x)) - x;
      const df = -2 * (1 - mu) / (x * x * x) - 2 * mu / ((1 - x) * (1 - x) * (1 - x)) - 1;
      L1x -= f / df * r;
    }

    let L2x = x2 + r * Math.pow(mu / 3, 1 / 3);
    for (let i = 0; i < 20; i++) {
      const x = (L2x - x1) / r;
      const f = (1 - mu) / (x * x) + mu / ((x - 1) * (x - 1)) - x;
      const df = -2 * (1 - mu) / (x * x * x) - 2 * mu / ((x - 1) * (x - 1) * (x - 1)) - 1;
      L2x -= f / df * r;
    }

    const L3: [number, number] = [-r * (1 + 5 * mu / 12), 0];
    const L4: [number, number] = [r * (0.5 - mu), r * Math.sqrt(3) / 2];
    const L5: [number, number] = [r * (0.5 - mu), -r * Math.sqrt(3) / 2];

    return {
      L1: [L1x, 0],
      L2: [L2x, 0],
      L3,
      L4,
      L5,
      stable: mu < 0.0385 ? ['L4', 'L5'] : [],
    };
  }

  haloOrbit(mu: number, distance: number, period: number): { amplitude: number; period: number; stability: boolean } {
    const amplitude = distance * 0.1;
    return { amplitude, period, stability: true };
  }

  nBody(positions: [number, number, number][], velocities: [number, number, number][], masses: number[], dt: number): { positions: [number, number, number][]; velocities: [number, number, number][] } {
    const n = positions.length;
    const accelerations: [number, number, number][] = positions.map(() => [0, 0, 0]);

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const dx = positions[j][0] - positions[i][0];
        const dy = positions[j][1] - positions[i][1];
        const dz = positions[j][2] - positions[i][2];
        const r2 = dx * dx + dy * dy + dz * dz + 1e-12;
        const r = Math.sqrt(r2);
        const a = G * masses[j] / r2;
        accelerations[i][0] += a * dx / r;
        accelerations[i][1] += a * dy / r;
        accelerations[i][2] += a * dz / r;
      }
    }

    const newPositions: [number, number, number][] = positions.map((p, i) => [
      p[0] + velocities[i][0] * dt + 0.5 * accelerations[i][0] * dt * dt,
      p[1] + velocities[i][1] * dt + 0.5 * accelerations[i][1] * dt * dt,
      p[2] + velocities[i][2] * dt + 0.5 * accelerations[i][2] * dt * dt,
    ] as [number, number, number]);

    const newAccelerations: [number, number, number][] = newPositions.map(() => [0, 0, 0]);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const dx = newPositions[j][0] - newPositions[i][0];
        const dy = newPositions[j][1] - newPositions[i][1];
        const dz = newPositions[j][2] - newPositions[i][2];
        const r2 = dx * dx + dy * dy + dz * dz + 1e-12;
        const r = Math.sqrt(r2);
        const a = G * masses[j] / r2;
        newAccelerations[i][0] += a * dx / r;
        newAccelerations[i][1] += a * dy / r;
        newAccelerations[i][2] += a * dz / r;
      }
    }

    const newVelocities: [number, number, number][] = velocities.map((v, i) => [
      v[0] + 0.5 * (accelerations[i][0] + newAccelerations[i][0]) * dt,
      v[1] + 0.5 * (accelerations[i][1] + newAccelerations[i][1]) * dt,
      v[2] + 0.5 * (accelerations[i][2] + newAccelerations[i][2]) * dt,
    ] as [number, number, number]);

    this._recordHistory('nBody');
    return { positions: newPositions, velocities: newVelocities };
  }

  orbitalEnergy(a: number, mu: number): number {
    return -mu / (2 * a);
  }

  specificOrbitalEnergy(r: number, v: number, mu: number): number {
    return v * v / 2 - mu / r;
  }

  specificAngularMomentum(position: [number, number, number], velocity: [number, number, number]): { vector: [number, number, number]; magnitude: number } {
    const hx = position[1] * velocity[2] - position[2] * velocity[1];
    const hy = position[2] * velocity[0] - position[0] * velocity[2];
    const hz = position[0] * velocity[1] - position[1] * velocity[0];
    const magnitude = Math.sqrt(hx * hx + hy * hy + hz * hz);
    return { vector: [hx, hy, hz], magnitude };
  }

  visVivaEquation(r: number, a: number, mu: number): number {
    return Math.sqrt(mu * (2 / r - 1 / a));
  }

  j2Perturbation(a: number, e: number, i: number, mu: number = MU_EARTH, R: number = EARTH_RADIUS, J2: number = EARTH_J2): { raanRate: number; argPerigeeRate: number; meanMotionShift: number } {
    const n = Math.sqrt(mu / a ** 3);
    const p = a * (1 - e * e);
    const raanRate = -1.5 * n * J2 * (R / p) ** 2 * Math.cos(i);
    const argPerigeeRate = 0.75 * n * J2 * (R / p) ** 2 * (5 * Math.cos(i) ** 2 - 1);
    const meanMotionShift = 0.75 * n * J2 * (R / p) ** 2 * Math.sqrt(1 - e * e) * (3 * Math.cos(i) ** 2 - 1);
    return { raanRate, argPerigeeRate, meanMotionShift };
  }

  sunSynchronousOrbit(altitude: number, mu: number = MU_EARTH, R: number = EARTH_RADIUS, J2: number = EARTH_J2): { inclination: number; period: number } {
    const a = R + altitude;
    const e = 0;
    const p = a * (1 - e * e);
    const n = Math.sqrt(mu / a ** 3);
    const sunRate = 2 * Math.PI / (365.25 * 86400);
    const cosi = -sunRate * p * p / (1.5 * n * J2 * R * R);
    const inclination = Math.acos(Math.max(-1, Math.min(1, cosi)));
    const period = 2 * Math.PI / n;
    return { inclination, period };
  }

  geostationaryOrbit(mu: number = MU_EARTH): { altitude: number; velocity: number; period: number } {
    const period = 86164;
    const a = Math.pow(mu * period * period / (4 * Math.PI * Math.PI), 1 / 3);
    const altitude = a - EARTH_RADIUS;
    const velocity = Math.sqrt(mu / a);
    return { altitude, velocity, period };
  }

  molniyaOrbit(mu: number = MU_EARTH, R: number = EARTH_RADIUS): { semiMajor: number; eccentricity: number; inclination: number; period: number; argPerigee: number } {
    const period = 43082;
    const a = Math.pow(mu * period * period / (4 * Math.PI * Math.PI), 1 / 3);
    const e = 0.74;
    const inclination = 63.4 * Math.PI / 180;
    return { semiMajor: a, eccentricity: e, inclination, period, argPerigee: 270 * Math.PI / 180 };
  }

  tleParse(name: string, line1: string, line2: string): TLE {
    const epochYear = parseInt(line1.substring(18, 20), 10);
    const epochDay = parseFloat(line1.substring(20, 32));
    const inclination = parseFloat(line2.substring(8, 16));
    const raan = parseFloat(line2.substring(17, 25));
    const eccentricity = parseFloat('0.' + line2.substring(26, 33));
    const argPerigee = parseFloat(line2.substring(34, 42));
    const meanAnomaly = parseFloat(line2.substring(43, 51));
    const meanMotion = parseFloat(line2.substring(52, 63));

    const tle: TLE = {
      name,
      line1,
      line2,
      epoch: epochYear * 365.25 + epochDay,
      inclination,
      raan,
      eccentricity,
      argPerigee,
      meanAnomaly,
      meanMotion,
    };
    this._tleData.push(tle);
    return tle;
  }

  tleToKeplerian(tle: TLE, mu: number = MU_EARTH): Keplerian {
    const meanMotionRad = tle.meanMotion * 2 * Math.PI / 86400;
    const a = Math.pow(mu / (meanMotionRad * meanMotionRad), 1 / 3);
    return {
      a,
      e: tle.eccentricity,
      i: tle.inclination * Math.PI / 180,
      omega: tle.argPerigee * Math.PI / 180,
      Omega: tle.raan * Math.PI / 180,
      M: tle.meanAnomaly * Math.PI / 180,
      epoch: tle.epoch,
    };
  }

  lambertProblem(r1: [number, number, number], r2: [number, number, number], transferTime: number, mu: number = MU_SUN, prograde: boolean = true): { v1: [number, number, number]; v2: [number, number, number] } {
    const magR1 = Math.sqrt(r1[0] ** 2 + r1[1] ** 2 + r1[2] ** 2);
    const magR2 = Math.sqrt(r2[0] ** 2 + r2[1] ** 2 + r2[2] ** 2);

    let cosDeltaNu = (r1[0] * r2[0] + r1[1] * r2[1] + r1[2] * r2[2]) / (magR1 * magR2);
    cosDeltaNu = Math.max(-1, Math.min(1, cosDeltaNu));
    const deltaNu = Math.acos(cosDeltaNu);

    const c = Math.sqrt(magR1 * magR1 + magR2 * magR2 - 2 * magR1 * magR2 * cosDeltaNu);
    const s = (magR1 + magR2 + c) / 2;

    const a = s / 2;
    const alpha = Math.PI;
    const beta = 2 * Math.asin(Math.sqrt((s - c) / (2 * a)));

    let tof = Math.sqrt(a ** 3 / mu) * (alpha - Math.sin(alpha) - (beta - Math.sin(beta)));
    if (!prograde) tof = -tof;

    const vc = Math.sqrt(mu / a);
    const v1Mag = vc * Math.sqrt((s - magR1) / (s - c));
    const v2Mag = vc * Math.sqrt((s - magR2) / (s - c));

    return {
      v1: [v1Mag * 0.1, v1Mag * 0.1, 0],
      v2: [v2Mag * 0.1, v2Mag * 0.1, 0],
    };
  }

  porkchopPlot(departureDates: number[], arrivalDates: number[], fromBody: string, toBody: string, mu: number = MU_SUN): { dates: [number, number][]; deltaV: number[]; optimalIndex: number } {
    const dates: [number, number][] = [];
    const deltaVs: number[] = [];
    let minDv = Infinity;
    let optimalIdx = 0;

    for (let i = 0; i < departureDates.length; i++) {
      for (let j = 0; j < arrivalDates.length; j++) {
        const tof = arrivalDates[j] - departureDates[i];
        if (tof <= 0) continue;
        const a = Math.pow(mu * tof * tof / (16 * Math.PI * Math.PI), 1 / 3);
        const dvEstimate = Math.abs(Math.sqrt(mu / a) - Math.sqrt(mu / a));
        dates.push([departureDates[i], arrivalDates[j]]);
        deltaVs.push(dvEstimate);
        if (dvEstimate < minDv) {
          minDv = dvEstimate;
          optimalIdx = dates.length - 1;
        }
      }
    }

    return { dates, deltaV: deltaVs, optimalIndex: optimalIdx };
  }

  planetaryFlyby(body: string, incomingV: number, closestApproach: number, mu: number): { deflectionAngle: number; outgoingV: number; deltaV: number } {
    const delta = closestApproach * incomingV * incomingV / mu;
    const deflectionAngle = 2 * Math.atan(1 / Math.max(delta, 1e-10));
    const outgoingV = incomingV;
    const deltaV = 2 * incomingV * Math.sin(deflectionAngle / 2);
    return { deflectionAngle, outgoingV, deltaV };
  }

  escapeFromPlanet(radius: number, altitude: number, mu: number): { burnDeltaV: number; hyperbolicExcess: number } {
    const r = radius + altitude;
    const vCirc = Math.sqrt(mu / r);
    const vEsc = Math.sqrt(2) * vCirc;
    return { burnDeltaV: vEsc - vCirc, hyperbolicExcess: 0 };
  }

  orbitalDecay(a: number, e: number, cd: number, area: number, mass: number, atmosphericDensity: number, mu: number = MU_EARTH, R: number = EARTH_RADIUS): { decayRate: number; lifetime: number } {
    const rp = a * (1 - e);
    const altitude = rp - R;
    const n = Math.sqrt(mu / a ** 3);
    const v = Math.sqrt(mu / a);
    const dragAccel = 0.5 * cd * area * atmosphericDensity * v * v / mass;
    const decayRate = 2 * Math.PI * a * a * dragAccel / (n * a * (1 - e * e));
    const lifetime = altitude / Math.abs(decayRate);
    return { decayRate, lifetime };
  }

  deltaVBudget(maneuvers: Maneuver[]): number {
    return maneuvers.reduce((sum, m) => sum + m.deltaV, 0);
  }

  synodicPeriod(T1: number, T2: number): number {
    if (T1 === T2) return Infinity;
    return 1 / Math.abs(1 / T1 - 1 / T2);
  }

  orbitalResonance(p: number, q: number, T: number): { periodRatio: number; resonantPeriod: number; stability: boolean } {
    const periodRatio = p / q;
    const resonantPeriod = T * q;
    const stability = p > 0 && q > 0 && p < 10 && q < 10;
    return { periodRatio, resonantPeriod, stability };
  }

  tidalForce(primaryMass: number, secondaryRadius: number, distance: number): { nearSide: number; farSide: number; differential: number } {
    const near = G * primaryMass / (distance - secondaryRadius) ** 2;
    const far = G * primaryMass / (distance + secondaryRadius) ** 2;
    return { nearSide: near, farSide: far, differential: near - far };
  }

  tidalLocking(orbitalPeriod: number, rotationPeriod: number, eccentricity: number): { locked: boolean; spinOrbitRatio: number; timeToLock: number } {
    const ratio = rotationPeriod / orbitalPeriod;
    const locked = Math.abs(ratio - 1) < 0.01 || Math.abs(ratio - 1.5) < 0.01;
    const timeToLock = orbitalPeriod * 1e6 * (1 + eccentricity);
    return { locked, spinOrbitRatio: ratio, timeToLock };
  }

  radiationPressure(flux: number, area: number, reflectivity: number, mass: number): { acceleration: number; force: number } {
    const force = flux * area * (1 + reflectivity) / SPEED_OF_LIGHT;
    const acceleration = force / mass;
    return { acceleration, force };
  }

  solarSailAcceleration(distanceAU: number, sailArea: number, sailMass: number, reflectivity: number = 0.9): number {
    const flux = SOLAR_FLUX / (distanceAU * distanceAU);
    const force = flux * sailArea * (1 + reflectivity) / SPEED_OF_LIGHT;
    return force / sailMass;
  }

  blackbodyTemperature(albedo: number, distanceAU: number, greenhouseFactor: number = 1): number {
    const flux = SOLAR_FLUX / (distanceAU * distanceAU);
    const absorbed = flux * (1 - albedo) / 4;
    const temp = Math.pow(absorbed * greenhouseFactor / STEFAN_BOLTZMANN, 0.25);
    return temp;
  }

  habitableZone(luminosity: number, starTemp: number): { inner: number; outer: number; optimisticInner: number; optimisticOuter: number } {
    const inner = Math.sqrt(luminosity / 1.1);
    const outer = Math.sqrt(luminosity / 0.53);
    const optimisticInner = Math.sqrt(luminosity / 1.5);
    const optimisticOuter = Math.sqrt(luminosity / 0.3);
    return { inner, outer, optimisticInner, optimisticOuter };
  }

  addOrbit(orbit: Orbit): void {
    this._orbits.set(orbit.id, orbit);
    if (!this._bodies.includes(orbit.body)) {
      this._bodies.push(orbit.body);
    }
    this._recordHistory('addOrbit');
  }

  addManeuver(maneuver: Maneuver): void {
    this._maneuvers.push(maneuver);
    this._recordHistory('addManeuver');
  }

  getOrbit(id: string): Orbit | null {
    return this._orbits.get(id) ?? null;
  }

  listOrbits(body?: string): Orbit[] {
    const orbits = Array.from(this._orbits.values());
    return body ? orbits.filter(o => o.body === body) : orbits;
  }

  toPacket(): DataPacket<{ orbits: Map<string, Orbit>; bodies: string[]; perturbations: Perturbation[]; maneuvers: Maneuver[]; tleData: TLE[]; trajectories: InterplanetaryTrajectory[]; history: AstroRecord[] }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['astronomy', 'CelestialMechanics'],
      priority: 1,
      phase: 'celestial_mechanics',
    };
    return {
      id: `celestial-mechanics-${Date.now().toString(36)}`,
      payload: {
        orbits: this._orbits,
        bodies: this._bodies,
        perturbations: this._perturbations,
        maneuvers: this._maneuvers,
        tleData: this._tleData,
        trajectories: this._trajectories,
        history: this._history,
      },
      metadata,
    };
  }

  reset(): void {
    this._orbits = new Map();
    this._bodies = [];
    this._perturbations = [];
    this._maneuvers = [];
    this._tleData = [];
    this._trajectories = [];
    this._history = [];
    this._counter = 0;
  }

  get orbitCount(): number { return this._orbits.size; }
  get bodyCount(): number { return this._bodies.length; }
  get perturbationCount(): number { return this._perturbations.length; }
  get maneuverCount(): number { return this._maneuvers.length; }
  get tleCount(): number { return this._tleData.length; }
  get trajectoryCount(): number { return this._trajectories.length; }
  get historyCount(): number { return this._history.length; }

  private _recordHistory(op: string): void {
    this._history.push({ operation: op, timestamp: Date.now() });
  }
}
