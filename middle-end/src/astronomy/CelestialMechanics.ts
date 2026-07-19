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

/** History record. */
interface AstroRecord {
  operation: string;
  timestamp: number;
}

/** Gravitational constant. */
export const G = 6.6743e-11;
/** Standard gravitational parameter of the Sun. */
export const MU_SUN = 1.32712440018e20;
/** Standard gravitational parameter of Earth. */
export const MU_EARTH = 3.986004418e14;
/** Astronomical unit (meters). */
export const AU = 1.495978707e11;

export class CelestialMechanics {
  private _orbits: Map<string, Orbit> = new Map();
  private _bodies: string[] = [];
  private _perturbations: Perturbation[] = [];
  private _history: AstroRecord[] = [];
  private _counter = 0;

  keplerFirstLaw(a: number, e: number): { perihelion: number; aphelion: number; semiMinor: number; area: number } {
    return {
      perihelion: a * (1 - e),
      aphelion: a * (1 + e),
      semiMinor: a * Math.sqrt(1 - e * e),
      area: Math.PI * a * a * Math.sqrt(1 - e * e),
    };
  }

  keplerSecondLaw(position: [number, number], velocity: [number, number]): number {
    const L = position[0] * velocity[1] - position[1] * velocity[0];
    return Math.abs(L) / 2;
  }

  keplerThirdLaw(a: number, M: number): number {
    return 2 * Math.PI * Math.sqrt(a * a * a / M);
  }

  orbitalPeriod(a: number, mu: number): number {
    return 2 * Math.PI * Math.sqrt(Math.pow(a, 3) / mu);
  }

  orbitalVelocity(r: number, a: number, mu: number): number {
    return Math.sqrt(mu * (2 / r - 1 / a));
  }

  eccentricAnomaly(M: number, e: number, tol: number = 1e-8): number {
    let E = M;
    for (let i = 0; i < 50; i++) {
      const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
      E -= dE;
      if (Math.abs(dE) < tol) break;
    }
    return E;
  }

  trueAnomaly(E: number, e: number): number {
    return 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2));
  }

  orbitalElements(state: StateVector): Keplerian {
    const r = Math.sqrt(state.position[0] ** 2 + state.position[1] ** 2 + state.position[2] ** 2);
    const v2 = state.velocity[0] ** 2 + state.velocity[1] ** 2 + state.velocity[2] ** 2;
    const a = 1 / (2 / r - v2 / MU_EARTH);
    const Lx = state.position[1] * state.velocity[2] - state.position[2] * state.velocity[1];
    const Ly = state.position[2] * state.velocity[0] - state.position[0] * state.velocity[2];
    const Lz = state.position[0] * state.velocity[1] - state.position[1] * state.velocity[0];
    const L = Math.sqrt(Lx * Lx + Ly * Ly + Lz * Lz);
    const e = Math.sqrt(1 + 2 * (Lx * state.velocity[0] + Ly * state.velocity[1] + Lz * state.velocity[2]) * L / (MU_EARTH * MU_EARTH) - L * L / (MU_EARTH * MU_EARTH));
    const i = Math.acos(Lz / L);
    const Omega = Math.atan2(Lx, -Ly);
    return { a, e, i, omega: 0, Omega, M: 0, epoch: state.epoch };
  }

  stateVector(elements: Keplerian): StateVector {
    const E = this.eccentricAnomaly(elements.M, elements.e);
    const x = elements.a * (Math.cos(E) - elements.e);
    const y = elements.a * Math.sqrt(1 - elements.e * elements.e) * Math.sin(E);
    const n = Math.sqrt(MU_EARTH / Math.pow(elements.a, 3));
    const vx = -n * elements.a * Math.sin(E);
    const vy = n * elements.a * Math.sqrt(1 - elements.e * elements.e) * Math.cos(E);
    return {
      position: [x, y, 0],
      velocity: [vx, vy, 0],
      epoch: elements.epoch,
    };
  }

  hohmannTransfer(r1: number, r2: number, mu: number): { deltaV1: number; deltaV2: number; totalDeltaV: number; transferTime: number } {
    const aTransfer = (r1 + r2) / 2;
    const v1 = Math.sqrt(mu / r1);
    const v2 = Math.sqrt(mu / r2);
    const vTransfer1 = Math.sqrt(mu * (2 / r1 - 1 / aTransfer));
    const vTransfer2 = Math.sqrt(mu * (2 / r2 - 1 / aTransfer));
    const deltaV1 = Math.abs(vTransfer1 - v1);
    const deltaV2 = Math.abs(v2 - vTransfer2);
    const transferTime = Math.PI * Math.sqrt(Math.pow(aTransfer, 3) / mu);
    return { deltaV1, deltaV2, totalDeltaV: deltaV1 + deltaV2, transferTime };
  }

  biEllipticTransfer(r1: number, r2: number, rb: number, mu: number): { deltaV1: number; deltaV2: number; deltaV3: number; total: number } {
    const v1 = Math.sqrt(mu / r1);
    const v2 = Math.sqrt(mu / r2);
    const vb1 = Math.sqrt(mu * (2 / r1 - 1 / rb));
    const vb2 = Math.sqrt(mu * (2 / r2 - 1 / rb));
    const deltaV1 = Math.abs(vb1 - v1);
    const deltaV2 = Math.abs(vb2 - vb1);
    const deltaV3 = Math.abs(v2 - vb2);
    return { deltaV1, deltaV2, deltaV3, total: deltaV1 + deltaV2 + deltaV3 };
  }

  gravityAssist(spacecraft: { velocity: [number, number, number] }, planet: { velocity: [number, number, number] }): { velocity: [number, number, number]; deltaV: number } {
    const vInRel: [number, number, number] = [
      spacecraft.velocity[0] - planet.velocity[0],
      spacecraft.velocity[1] - planet.velocity[1],
      spacecraft.velocity[2] - planet.velocity[2],
    ];
    const vOutRel: [number, number, number] = [-vInRel[0], -vInRel[1], -vInRel[2]];
    const vOut: [number, number, number] = [
      vOutRel[0] + planet.velocity[0],
      vOutRel[1] + planet.velocity[1],
      vOutRel[2] + planet.velocity[2],
    ];
    const deltaV = Math.sqrt(
      (vOut[0] - spacecraft.velocity[0]) ** 2 +
      (vOut[1] - spacecraft.velocity[1]) ** 2 +
      (vOut[2] - spacecraft.velocity[2]) ** 2,
    );
    return { velocity: vOut, deltaV };
  }

  sphereOfInfluence(body: { mass: number }, sun: { mass: number }): number {
    const a = 1 * AU;
    return a * Math.pow(body.mass / sun.mass, 2 / 5);
  }

  lagrangePoints(m1: number, m2: number, r: number): { L1: [number, number]; L2: [number, number]; L3: [number, number]; L4: [number, number]; L5: [number, number] } {
    const mu = m2 / (m1 + m2);
    const L1: [number, number] = [r * (1 - Math.pow(mu / 3, 1 / 3)), 0];
    const L2: [number, number] = [r * (1 + Math.pow(mu / 3, 1 / 3)), 0];
    const L3: [number, number] = [-r * (1 + 5 * mu / 12), 0];
    const L4: [number, number] = [r * (0.5 - mu), r * Math.sqrt(3) / 2];
    const L5: [number, number] = [r * (0.5 - mu), -r * Math.sqrt(3) / 2];
    return { L1, L2, L3, L4, L5 };
  }

  rocheLimit(body: { radius: number; density: number }, satellite: { density: number }): number {
    return body.radius * 2.456 * Math.pow(body.density / satellite.density, 1 / 3);
  }

  nBody(positions: [number, number, number][], masses: number[], dt: number): [number, number, number][] {
    const accelerations: [number, number, number][] = positions.map(() => [0, 0, 0]);
    for (let i = 0; i < positions.length; i++) {
      for (let j = 0; j < positions.length; j++) {
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
    return positions.map((p, i) => [
      p[0] + 0.5 * accelerations[i][0] * dt * dt,
      p[1] + 0.5 * accelerations[i][1] * dt * dt,
      p[2] + 0.5 * accelerations[i][2] * dt * dt,
    ] as [number, number, number]);
  }

  toPacket(): DataPacket<{ orbits: Map<string, Orbit>; bodies: string[]; perturbations: Perturbation[]; history: AstroRecord[] }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['astronomy', 'CelestialMechanics'],
      priority: 1,
      phase: 'celestial_mechanics',
    };
    return {
      id: `celestial-mechanics-${Date.now().toString(36)}`,
      payload: { orbits: this._orbits, bodies: this._bodies, perturbations: this._perturbations, history: this._history },
      metadata,
    };
  }

  reset(): void {
    this._orbits = new Map();
    this._bodies = [];
    this._perturbations = [];
    this._history = [];
    this._counter = 0;
  }

  get orbitCount(): number { return this._orbits.size; }
  get bodyCount(): number { return this._bodies.length; }
  get perturbationCount(): number { return this._perturbations.length; }

  private _recordHistory(op: string): void {
    this._history.push({ operation: op, timestamp: Date.now() });
  }
}
