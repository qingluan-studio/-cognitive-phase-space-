import { DataPacket, PacketMeta } from '../shared/types';

/** Joint type descriptor. */
export interface Joint {
  readonly id: string;
  readonly type: 'revolute' | 'prismatic' | 'spherical' | 'cylindrical';
  readonly axis: [number, number, number];
  readonly limits: { min: number; max: number };
  readonly maxVelocity: number;
  readonly maxTorque: number;
}

/** Link inertial properties. */
export interface LinkInertia {
  readonly mass: number;
  readonly com: [number, number, number];
  readonly inertiaTensor: [[number, number, number], [number, number, number], [number, number, number]];
  readonly length: number;
}

/** Robot state descriptor. */
export interface RobotState {
  readonly jointPositions: number[];
  readonly jointVelocities: number[];
  readonly jointAccelerations: number[];
  readonly timestamp: number;
}

/** Dynamics solution result. */
export interface DynamicsResult {
  readonly jointTorques: number[];
  readonly massMatrix: number[][];
  readonly coriolisMatrix: number[][];
  readonly gravityVector: number[];
  readonly kineticEnergy: number;
  readonly potentialEnergy: number;
  readonly totalEnergy: number;
}

/** Trajectory dynamics descriptor. */
export interface TrajectoryDynamics {
  readonly timePoints: number[];
  readonly positions: number[][];
  readonly velocities: number[][];
  readonly accelerations: number[][];
  readonly torques: number[][];
  readonly power: number[];
}

/** Payload dynamics descriptor. */
export interface PayloadDynamics {
  readonly mass: number;
  readonly inertia: LinkInertia['inertiaTensor'];
  readonly comOffset: [number, number, number];
  readonly effectiveMass: number;
  readonly couplingFactor: number;
}

/** Friction model descriptor. */
export interface FrictionModel {
  readonly viscous: number;
  readonly coulomb: number;
  readonly stribeck: number;
  readonly stribeckVelocity: number;
}

/** Compliance descriptor. */
export interface Compliance {
  readonly stiffness: number[][];
  readonly damping: number[][];
  readonly deflection: number[];
  readonly contactForce: number[];
}

/** Vibration mode descriptor. */
export interface VibrationMode {
  readonly frequency: number;
  readonly modeShape: number[];
  readonly dampingRatio: number;
  readonly participationFactor: number;
}

/** Workspace dynamics descriptor. */
export interface WorkspaceDynamics {
  readonly maxReach: number;
  readonly maxVelocity: number;
  readonly maxAcceleration: number;
  readonly maxPayload: number;
  readonly dexterityIndex: number;
  readonly manipulability: number;
}

export class Dynamics {
  private _joints: Map<string, Joint> = new Map();
  private _links: Map<string, LinkInertia> = new Map();
  private _frictionModels: Map<string, FrictionModel> = new Map();
  private _trajectoryHistory: TrajectoryDynamics[] = [];
  private _stateHistory: RobotState[] = [];
  private _vibrationModes: VibrationMode[] = [];
  private _complianceHistory: Compliance[] = [];
  private _payload: PayloadDynamics | null = null;
  private _gravity: [number, number, number] = [0, 0, -9.81];
  private _counter = 0;

  constructor() {
    this._seedJointsAndLinks();
  }

  private _seedJointsAndLinks(): void {
    const joints: Joint[] = [
      { id: 'j1', type: 'revolute', axis: [0, 0, 1], limits: { min: -Math.PI, max: Math.PI }, maxVelocity: 2.0, maxTorque: 100 },
      { id: 'j2', type: 'revolute', axis: [0, 1, 0], limits: { min: -Math.PI / 2, max: Math.PI / 2 }, maxVelocity: 1.5, maxTorque: 80 },
      { id: 'j3', type: 'revolute', axis: [0, 1, 0], limits: { min: -Math.PI, max: 0 }, maxVelocity: 2.0, maxTorque: 50 },
      { id: 'j4', type: 'revolute', axis: [1, 0, 0], limits: { min: -Math.PI, max: Math.PI }, maxVelocity: 3.0, maxTorque: 30 },
      { id: 'j5', type: 'revolute', axis: [0, 1, 0], limits: { min: -Math.PI / 2, max: Math.PI / 2 }, maxVelocity: 3.0, maxTorque: 20 },
      { id: 'j6', type: 'revolute', axis: [1, 0, 0], limits: { min: -Math.PI, max: Math.PI }, maxVelocity: 4.0, maxTorque: 10 },
    ];
    for (const j of joints) {
      this._joints.set(j.id, j);
      this._frictionModels.set(j.id, { viscous: 0.1, coulomb: 0.5, stribeck: 0.3, stribeckVelocity: 0.01 });
    }
    const links: LinkInertia[] = [
      { mass: 5.0, com: [0, 0, 0.15], inertiaTensor: [[0.1, 0, 0], [0, 0.1, 0], [0, 0, 0.05]], length: 0.3 },
      { mass: 4.0, com: [0, 0, 0.2], inertiaTensor: [[0.08, 0, 0], [0, 0.08, 0], [0, 0, 0.04]], length: 0.4 },
      { mass: 3.0, com: [0, 0, 0.1], inertiaTensor: [[0.05, 0, 0], [0, 0.05, 0], [0, 0, 0.02]], length: 0.2 },
      { mass: 2.0, com: [0, 0, 0.08], inertiaTensor: [[0.03, 0, 0], [0, 0.03, 0], [0, 0, 0.01]], length: 0.16 },
      { mass: 1.5, com: [0, 0, 0.06], inertiaTensor: [[0.02, 0, 0], [0, 0.02, 0], [0, 0, 0.008]], length: 0.12 },
      { mass: 1.0, com: [0, 0, 0.05], inertiaTensor: [[0.01, 0, 0], [0, 0.01, 0], [0, 0, 0.005]], length: 0.1 },
    ];
    for (let i = 0; i < links.length; i++) {
      this._links.set(`link-${i + 1}`, links[i]);
    }
  }

  get jointCount(): number { return this._joints.size; }
  get linkCount(): number { return this._links.size; }
  get trajectoryCount(): number { return this._trajectoryHistory.length; }
  get stateCount(): number { return this._stateHistory.length; }
  get vibrationModeCount(): number { return this._vibrationModes.length; }

  public addJoint(joint: Joint): void {
    this._joints.set(joint.id, joint);
  }

  public removeJoint(id: string): boolean {
    return this._joints.delete(id);
  }

  public getJoint(id: string): Joint | undefined {
    return this._joints.get(id);
  }

  public addLink(id: string, inertia: LinkInertia): void {
    this._links.set(id, inertia);
  }

  public removeLink(id: string): boolean {
    return this._links.delete(id);
  }

  public getLink(id: string): LinkInertia | undefined {
    return this._links.get(id);
  }

  /** Compute the mass matrix M(q) using a simplified recursive Newton-Euler approach. */
  public massMatrix(jointPositions: number[]): number[][] {
    const n = this._joints.size;
    const M: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
    const links = Array.from(this._links.values());
    for (let i = 0; i < n; i++) {
      const link = links[i] ?? links[links.length - 1];
      M[i][i] += link.mass;
      for (let j = 0; j <= i; j++) {
        const coupling = link.mass * Math.cos(jointPositions[i] - jointPositions[j]) * 0.1;
        M[i][j] += coupling;
        M[j][i] += coupling;
      }
    }
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        M[i][j] = Number(M[i][j].toFixed(6));
      }
    }
    return M;
  }

  /** Compute the Coriolis and centrifugal matrix C(q, q_dot). */
  public coriolisMatrix(jointPositions: number[], jointVelocities: number[]): number[][] {
    const n = this._joints.size;
    const C: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i !== j) {
          C[i][j] = -Math.sin(jointPositions[i] - jointPositions[j]) * jointVelocities[j] * 0.5;
        }
      }
    }
    return C;
  }

  /** Compute the gravity vector G(q). */
  public gravityVector(jointPositions: number[]): number[] {
    const n = this._joints.size;
    const G: number[] = [];
    const links = Array.from(this._links.values());
    for (let i = 0; i < n; i++) {
      const link = links[i] ?? links[links.length - 1];
      const g = link.mass * Math.abs(this._gravity[2]) * Math.cos(jointPositions[i]) * link.com[2];
      G.push(Number(g.toFixed(4)));
    }
    return G;
  }

  /** Compute the complete forward dynamics M(q) * q_ddot + C(q, q_dot) * q_dot + G(q) = tau. */
  public forwardDynamics(state: RobotState, jointTorques: number[]): DynamicsResult {
    const M = this.massMatrix(state.jointPositions);
    const C = this.coriolisMatrix(state.jointPositions, state.jointVelocities);
    const G = this.gravityVector(state.jointPositions);
    const n = M.length;
    const cq = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        cq[i] += C[i][j] * state.jointVelocities[j];
      }
    }
    const qddot = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      let residual = jointTorques[i] - cq[i] - G[i];
      if (this._payload) {
        residual -= this._payload.effectiveMass * state.jointAccelerations[i] * this._payload.couplingFactor;
      }
      qddot[i] = M[i][i] > 0 ? residual / M[i][i] : 0;
    }
    const ke = this.kineticEnergy(state.jointPositions, state.jointVelocities);
    const pe = this.potentialEnergy(state.jointPositions);
    return {
      jointTorques,
      massMatrix: M,
      coriolisMatrix: C,
      gravityVector: G,
      kineticEnergy: ke,
      potentialEnergy: pe,
      totalEnergy: ke + pe,
    };
  }

  /** Compute inverse dynamics: given state, compute required torques. */
  public inverseDynamics(state: RobotState): number[] {
    const M = this.massMatrix(state.jointPositions);
    const C = this.coriolisMatrix(state.jointPositions, state.jointVelocities);
    const G = this.gravityVector(state.jointPositions);
    const n = M.length;
    const torques: number[] = [];
    for (let i = 0; i < n; i++) {
      let tau = 0;
      for (let j = 0; j < n; j++) {
        tau += M[i][j] * state.jointAccelerations[j];
        tau += C[i][j] * state.jointVelocities[j];
      }
      tau += G[i];
      if (this._payload) {
        tau += this._payload.effectiveMass * state.jointAccelerations[i] * this._payload.couplingFactor;
      }
      torques.push(Number(tau.toFixed(4)));
    }
    return torques;
  }

  /** Compute kinetic energy of the manipulator. */
  public kineticEnergy(jointPositions: number[], jointVelocities: number[]): number {
    const M = this.massMatrix(jointPositions);
    let ke = 0;
    for (let i = 0; i < M.length; i++) {
      for (let j = 0; j < M.length; j++) {
        ke += 0.5 * M[i][j] * jointVelocities[i] * jointVelocities[j];
      }
    }
    return Number(ke.toFixed(4));
  }

  /** Compute potential energy of the manipulator. */
  public potentialEnergy(jointPositions: number[]): number {
    const G = this.gravityVector(jointPositions);
    let pe = 0;
    for (let i = 0; i < G.length; i++) {
      pe += G[i] * Math.sin(jointPositions[i]);
    }
    return Number(pe.toFixed(4));
  }

  /** Compute total energy of the system. */
  public totalEnergy(state: RobotState): number {
    return this.kineticEnergy(state.jointPositions, state.jointVelocities) + this.potentialEnergy(state.jointPositions);
  }

  /** Compute friction torque for a joint. */
  public frictionTorque(jointId: string, velocity: number): number {
    const model = this._frictionModels.get(jointId);
    if (!model) return 0;
    const sign = velocity >= 0 ? 1 : -1;
    const viscous = model.viscous * velocity;
    const coulomb = model.coulomb * sign;
    const stribeck = model.stribeck * sign * Math.exp(-Math.abs(velocity) / model.stribeckVelocity);
    return Number((viscous + coulomb + stribeck).toFixed(6));
  }

  /** Compute power consumption at each joint. */
  public jointPower(state: RobotState, torques: number[]): number[] {
    const power: number[] = [];
    for (let i = 0; i < state.jointVelocities.length; i++) {
      const p = Math.abs(torques[i] * state.jointVelocities[i]);
      const frictionLoss = Math.abs(this.frictionTorque(`j${i + 1}`, state.jointVelocities[i]) * state.jointVelocities[i]);
      power.push(Number((p + frictionLoss).toFixed(4)));
    }
    return power;
  }

  /** Compute total mechanical power. */
  public totalPower(state: RobotState, torques: number[]): number {
    return this.jointPower(state, torques).reduce((s, p) => s + p, 0);
  }

  /** Set payload dynamics. */
  public setPayload(payload: PayloadDynamics): void {
    this._payload = payload;
  }

  public getPayload(): PayloadDynamics | null {
    return this._payload;
  }

  public clearPayload(): void {
    this._payload = null;
  }

  /** Compute payload effective inertia at joints. */
  public payloadInertiaAtJoints(jointPositions: number[]): number[] {
    if (!this._payload) return new Array(this._joints.size).fill(0);
    const n = this._joints.size;
    const inertia: number[] = [];
    for (let i = 0; i < n; i++) {
      const jacobian = Math.sin(jointPositions[i]);
      const I = this._payload.inertia[0][0] * jacobian * jacobian + this._payload.mass * jacobian * jacobian;
      inertia.push(Number(I.toFixed(6)));
    }
    return inertia;
  }

  /** Compute coupling torques between adjacent joints. */
  public couplingTorques(jointPositions: number[], jointVelocities: number[]): number[][] {
    const n = this._joints.size;
    const coupling: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const torque = Math.sin(jointPositions[i] - jointPositions[j]) * jointVelocities[i] * jointVelocities[j] * 0.3;
        coupling[i][j] = Number(torque.toFixed(6));
        coupling[j][i] = Number((-torque).toFixed(6));
      }
    }
    return coupling;
  }

  /** Compute centrifugal torques. */
  public centrifugalTorques(jointPositions: number[], jointVelocities: number[]): number[] {
    const n = this._joints.size;
    const torques: number[] = [];
    for (let i = 0; i < n; i++) {
      let t = 0;
      for (let j = 0; j < n; j++) {
        if (i !== j) {
          t += Math.cos(jointPositions[i] - jointPositions[j]) * jointVelocities[j] * jointVelocities[j] * 0.2;
        }
      }
      torques.push(Number(t.toFixed(6)));
    }
    return torques;
  }

  /** Simulate trajectory dynamics over a time horizon. */
  public simulateTrajectory(
    initialState: RobotState,
    timeHorizon: number,
    timeStep: number,
    torqueProfile: (t: number, q: number[], qd: number[]) => number[]
  ): TrajectoryDynamics {
    const times: number[] = [];
    const positions: number[][] = [];
    const velocities: number[][] = [];
    const accelerations: number[][] = [];
    const torques: number[][] = [];
    const power: number[] = [];
    let q = [...initialState.jointPositions];
    let qd = [...initialState.jointVelocities];
    let qdd = [...initialState.jointAccelerations];
    for (let t = 0; t <= timeHorizon; t += timeStep) {
      const tau = torqueProfile(t, q, qd);
      const state: RobotState = { jointPositions: q, jointVelocities: qd, jointAccelerations: qdd, timestamp: t };
      const dyn = this.forwardDynamics(state, tau);
      qdd = dyn.massMatrix.map((row, i) => {
        let residual = tau[i];
        for (let j = 0; j < row.length; j++) {
          if (i !== j) residual -= row[j] * qdd[j];
        }
        return row[i] > 0 ? residual / row[i] : 0;
      });
      for (let i = 0; i < q.length; i++) {
        qd[i] += qdd[i] * timeStep;
        q[i] += qd[i] * timeStep;
      }
      times.push(Number(t.toFixed(4)));
      positions.push([...q]);
      velocities.push([...qd]);
      accelerations.push([...qdd]);
      torques.push([...tau]);
      power.push(this.totalPower(state, tau));
    }
    const traj: TrajectoryDynamics = { timePoints: times, positions, velocities, accelerations, torques, power };
    this._trajectoryHistory.push(traj);
    return traj;
  }

  /** Compute natural vibration modes of the flexible joints. */
  public computeVibrationModes(stiffness: number[], damping: number[]): VibrationMode[] {
    const modes: VibrationMode[] = [];
    const n = Math.min(stiffness.length, damping.length, this._joints.size);
    for (let i = 0; i < n; i++) {
      const link = Array.from(this._links.values())[i];
      const m = link?.mass ?? 1.0;
      const omega = Math.sqrt(stiffness[i] / m);
      const freq = omega / (2 * Math.PI);
      const zeta = damping[i] / (2 * Math.sqrt(stiffness[i] * m));
      const shape = new Array(n).fill(0);
      shape[i] = 1.0;
      modes.push({
        frequency: Number(freq.toFixed(4)),
        modeShape: shape,
        dampingRatio: Number(zeta.toFixed(4)),
        participationFactor: Number((1.0 / m).toFixed(4)),
      });
    }
    this._vibrationModes = modes;
    return modes;
  }

  /** Compute compliance at the end-effector. */
  public endEffectorCompliance(jointStiffness: number[], jointDamping: number[], externalForce: number[]): Compliance {
    const n = Math.min(jointStiffness.length, this._joints.size);
    const K: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
    const C: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
    const deflection: number[] = [];
    for (let i = 0; i < n; i++) {
      K[i][i] = jointStiffness[i];
      C[i][i] = jointDamping[i];
      deflection.push(externalForce[i] / Math.max(0.001, jointStiffness[i]));
    }
    const comp: Compliance = { stiffness: K, damping: C, deflection, contactForce: externalForce };
    this._complianceHistory.push(comp);
    return comp;
  }

  /** Compute workspace dynamics metrics. */
  public workspaceDynamics(jointLimits: { min: number; max: number }[]): WorkspaceDynamics {
    const links = Array.from(this._links.values());
    let maxReach = 0;
    for (const link of links) {
      maxReach += link.length;
    }
    const maxVel = Math.min(...Array.from(this._joints.values()).map(j => j.maxVelocity));
    const maxPayload = 50;
    const dexterity = Math.max(0, 1 - Math.abs(maxReach - 1.0) / 2.0);
    const manipulability = Math.pow(maxReach, 2) * maxVel * 0.1;
    return {
      maxReach: Number(maxReach.toFixed(4)),
      maxVelocity: maxVel,
      maxAcceleration: maxVel * 2,
      maxPayload,
      dexterityIndex: Number(dexterity.toFixed(4)),
      manipulability: Number(manipulability.toFixed(4)),
    };
  }

  /** Compute Lagrangian L = T - V. */
  public lagrangian(state: RobotState): number {
    return this.kineticEnergy(state.jointPositions, state.jointVelocities) - this.potentialEnergy(state.jointPositions);
  }

  /** Compute generalized momentum p = M(q) * q_dot. */
  public generalizedMomentum(jointPositions: number[], jointVelocities: number[]): number[] {
    const M = this.massMatrix(jointPositions);
    const p: number[] = [];
    for (let i = 0; i < M.length; i++) {
      let pi = 0;
      for (let j = 0; j < M.length; j++) {
        pi += M[i][j] * jointVelocities[j];
      }
      p.push(Number(pi.toFixed(6)));
    }
    return p;
  }

  /** Compute power-form of dynamics: q_dot^T * tau = d/dt(T + V) + dissipation. */
  public powerForm(state: RobotState, torques: number[]): { mechanicalPower: number; energyRate: number; dissipation: number } {
    const mechanicalPower = this.totalPower(state, torques);
    const currentEnergy = this.totalEnergy(state);
    const prevState = this._stateHistory[this._stateHistory.length - 1];
    let energyRate = 0;
    if (prevState) {
      const prevEnergy = this.totalEnergy(prevState);
      const dt = Math.max(0.001, state.timestamp - prevState.timestamp);
      energyRate = (currentEnergy - prevEnergy) / dt;
    }
    const dissipation = mechanicalPower - energyRate;
    this._stateHistory.push(state);
    return {
      mechanicalPower: Number(mechanicalPower.toFixed(4)),
      energyRate: Number(energyRate.toFixed(4)),
      dissipation: Number(dissipation.toFixed(4)),
    };
  }

  /** Compute centrifugal and Coriolis coefficients (Christoffel symbols). */
  public christoffelSymbols(jointPositions: number[]): number[][][] {
    const n = this._joints.size;
    const gamma: number[][][] = Array.from({ length: n }, () => Array.from({ length: n }, () => Array(n).fill(0)));
    for (let k = 0; k < n; k++) {
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          if (i !== j) {
            gamma[k][i][j] = Number((0.5 * Math.sin(jointPositions[i] - jointPositions[j])).toFixed(6));
          }
        }
      }
    }
    return gamma;
  }

  /** Compute operational space inertia at the end-effector. */
  public operationalSpaceInertia(jointPositions: number[]): number[][] {
    const M = this.massMatrix(jointPositions);
    const n = M.length;
    const Lambda: number[][] = Array.from({ length: 6 }, () => Array(6).fill(0));
    for (let i = 0; i < Math.min(n, 6); i++) {
      Lambda[i][i] = 1 / Math.max(0.001, M[i][i]);
    }
    return Lambda;
  }

  /** Compute dynamic manipulability ellipsoid. */
  public dynamicManipulability(jointPositions: number[], jointVelocities: number[]): { eigenvalues: number[]; conditionNumber: number } {
    const M = this.massMatrix(jointPositions);
    const C = this.coriolisMatrix(jointPositions, jointVelocities);
    const n = M.length;
    const A: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        A[i][j] = M[i][j] + C[i][j] * 0.1;
      }
    }
    const eigenvalues: number[] = [];
    for (let i = 0; i < n; i++) {
      eigenvalues.push(Number(A[i][i].toFixed(6)));
    }
    eigenvalues.sort((a, b) => b - a);
    const conditionNumber = eigenvalues[0] / Math.max(eigenvalues[eigenvalues.length - 1], 0.0001);
    return { eigenvalues, conditionNumber: Number(conditionNumber.toFixed(4)) };
  }

  /** Compute energy dissipation due to friction. */
  public frictionDissipation(state: RobotState): number {
    let dissipation = 0;
    for (let i = 0; i < state.jointVelocities.length; i++) {
      const tau_f = this.frictionTorque(`j${i + 1}`, state.jointVelocities[i]);
      dissipation += Math.abs(tau_f * state.jointVelocities[i]);
    }
    return Number(dissipation.toFixed(4));
  }

  /** Compute torque limits feasibility. */
  public torqueFeasibility(torques: number[]): { feasible: boolean; margin: number; violations: number[] } {
    const joints = Array.from(this._joints.values());
    const violations: number[] = [];
    let maxMargin = Infinity;
    for (let i = 0; i < torques.length; i++) {
      const limit = joints[i]?.maxTorque ?? Infinity;
      const margin = limit - Math.abs(torques[i]);
      maxMargin = Math.min(maxMargin, margin);
      if (margin < 0) violations.push(i);
    }
    return { feasible: violations.length === 0, margin: Number(maxMargin.toFixed(4)), violations };
  }

  /** Compute velocity limits feasibility. */
  public velocityFeasibility(velocities: number[]): { feasible: boolean; margin: number; violations: number[] } {
    const joints = Array.from(this._joints.values());
    const violations: number[] = [];
    let maxMargin = Infinity;
    for (let i = 0; i < velocities.length; i++) {
      const limit = joints[i]?.maxVelocity ?? Infinity;
      const margin = limit - Math.abs(velocities[i]);
      maxMargin = Math.min(maxMargin, margin);
      if (margin < 0) violations.push(i);
    }
    return { feasible: violations.length === 0, margin: Number(maxMargin.toFixed(4)), violations };
  }

  /** Compute static torque required to hold a pose against gravity. */
  public staticTorque(jointPositions: number[]): number[] {
    return this.gravityVector(jointPositions);
  }

  /** Compute reflected inertia at the motor side. */
  public reflectedInertia(jointPositions: number[], gearRatio: number[]): number[] {
    const M = this.massMatrix(jointPositions);
    const reflected: number[] = [];
    for (let i = 0; i < M.length; i++) {
      const r = gearRatio[i] ?? 1;
      reflected.push(Number((M[i][i] / (r * r)).toFixed(6)));
    }
    return reflected;
  }

  /** Compute torque ripple due to gear transmission. */
  public torqueRipple(jointPosition: number, gearRatio: number, rippleAmplitude: number): number {
    return Number((rippleAmplitude * Math.sin(gearRatio * jointPosition)).toFixed(6));
  }

  /** Compute energy efficiency of a trajectory. */
  public trajectoryEfficiency(traj: TrajectoryDynamics): number {
    const totalWork = traj.power.reduce((s, p) => s + p * 0.01, 0);
    const maxWork = traj.torques.reduce((s, t) => s + Math.max(...t.map(Math.abs)) * 0.01, 0);
    return maxWork > 0 ? Number((totalWork / maxWork).toFixed(4)) : 0;
  }

  /** Compute time-optimal path parameterization (simplified). */
  public timeOptimalPath(pathLength: number, maxVelocity: number, maxAcceleration: number): { time: number; velocityProfile: number[]; accelerationProfile: number[] } {
    const accelTime = maxVelocity / maxAcceleration;
    const accelDist = 0.5 * maxAcceleration * accelTime * accelTime;
    const cruiseDist = pathLength - 2 * accelDist;
    const cruiseTime = cruiseDist > 0 ? cruiseDist / maxVelocity : 0;
    const totalTime = 2 * accelTime + cruiseTime;
    const profile: number[] = [];
    const accelProfile: number[] = [];
    const steps = 100;
    const dt = totalTime / steps;
    for (let i = 0; i <= steps; i++) {
      const t = i * dt;
      let v = 0;
      let a = 0;
      if (t < accelTime) {
        v = maxAcceleration * t;
        a = maxAcceleration;
      } else if (t < accelTime + cruiseTime) {
        v = maxVelocity;
        a = 0;
      } else {
        const td = t - (accelTime + cruiseTime);
        v = maxVelocity - maxAcceleration * td;
        a = -maxAcceleration;
      }
      profile.push(Number(v.toFixed(4)));
      accelProfile.push(Number(a.toFixed(4)));
    }
    return { time: Number(totalTime.toFixed(4)), velocityProfile: profile, accelerationProfile: accelProfile };
  }

  /** Compute recursive Newton-Euler inverse dynamics. */
  public recursiveNewtonEuler(state: RobotState): number[] {
    const n = this._joints.size;
    const links = Array.from(this._links.values());
    const omega: [number, number, number][] = [];
    const alpha: [number, number, number][] = [];
    const a: [number, number, number][] = [];
    const f: [number, number, number][] = [];
    const tau: number[] = [];
    omega.push([0, 0, state.jointVelocities[0]]);
    alpha.push([0, 0, state.jointAccelerations[0]]);
    a.push([0, 0, links[0].mass * Math.abs(this._gravity[2])]);
    for (let i = 1; i < n; i++) {
      const z = [0, 0, 1];
      const w: [number, number, number] = [omega[i - 1][0] + z[0] * state.jointVelocities[i], omega[i - 1][1] + z[1] * state.jointVelocities[i], omega[i - 1][2] + z[2] * state.jointVelocities[i]];
      omega.push(w);
      const al: [number, number, number] = [alpha[i - 1][0] + z[0] * state.jointAccelerations[i], alpha[i - 1][1] + z[1] * state.jointAccelerations[i], alpha[i - 1][2] + z[2] * state.jointAccelerations[i]];
      alpha.push(al);
      const acc: [number, number, number] = [a[i - 1][0] + al[0] * links[i].com[2], a[i - 1][1] + al[1] * links[i].com[2], a[i - 1][2] + al[2] * links[i].com[2]];
      a.push(acc);
    }
    for (let i = n - 1; i >= 0; i--) {
      const link = links[i];
      const fi: [number, number, number] = [link.mass * a[i][0], link.mass * a[i][1], link.mass * a[i][2]];
      f.push(fi);
      const ti = fi[0] * link.com[0] + fi[1] * link.com[1] + fi[2] * link.com[2];
      tau.push(Number((ti + link.inertiaTensor[2][2] * alpha[i][2]).toFixed(4)));
    }
    return tau.reverse();
  }

  /** Compute actuator sizing requirements. */
  public actuatorSizing(maxAcceleration: number[], maxVelocity: number[], safetyFactor: number = 1.5): { peakTorque: number[]; continuousTorque: number[]; ratedPower: number[] } {
    const n = this._joints.size;
    const peakTorque: number[] = [];
    const continuousTorque: number[] = [];
    const ratedPower: number[] = [];
    const links = Array.from(this._links.values());
    for (let i = 0; i < n; i++) {
      const link = links[i];
      const inertia = link.inertiaTensor[2][2] + link.mass * link.com[2] * link.com[2];
      const peak = inertia * maxAcceleration[i] * safetyFactor;
      const continuous = peak * 0.6;
      const power = continuous * maxVelocity[i];
      peakTorque.push(Number(peak.toFixed(4)));
      continuousTorque.push(Number(continuous.toFixed(4)));
      ratedPower.push(Number(power.toFixed(4)));
    }
    return { peakTorque, continuousTorque, ratedPower };
  }

  /** Compute gear ratio optimization for energy efficiency. */
  public optimizeGearRatio(loadInertia: number[], motorInertia: number[], maxSpeed: number[], maxTorque: number[]): number[] {
    const optimal: number[] = [];
    for (let i = 0; i < loadInertia.length; i++) {
      const N = Math.sqrt(loadInertia[i] / Math.max(motorInertia[i], 0.0001));
      const speedLimited = maxSpeed[i] / Math.max(maxTorque[i], 0.001);
      const optimalRatio = Math.min(N, speedLimited);
      optimal.push(Number(optimalRatio.toFixed(4)));
    }
    return optimal;
  }

  /** Compute bandwidth of each joint based on inertia and stiffness. */
  public jointBandwidth(jointStiffness: number[]): number[] {
    const links = Array.from(this._links.values());
    const bandwidth: number[] = [];
    for (let i = 0; i < jointStiffness.length; i++) {
      const inertia = links[i]?.inertiaTensor[2][2] ?? 0.01;
      const bw = Math.sqrt(jointStiffness[i] / inertia) / (2 * Math.PI);
      bandwidth.push(Number(bw.toFixed(4)));
    }
    return bandwidth;
  }

  /** Compute settling time for a step response. */
  public settlingTime(jointStiffness: number[], jointDamping: number[]): number[] {
    const links = Array.from(this._links.values());
    const times: number[] = [];
    for (let i = 0; i < jointStiffness.length; i++) {
      const inertia = links[i]?.inertiaTensor[2][2] ?? 0.01;
      const omega = Math.sqrt(jointStiffness[i] / inertia);
      const zeta = jointDamping[i] / (2 * Math.sqrt(jointStiffness[i] * inertia));
      const ts = zeta > 0 ? 4 / (zeta * omega) : 4 / omega;
      times.push(Number(ts.toFixed(4)));
    }
    return times;
  }

  /** Compute overshoot percentage for underdamped joints. */
  public overshoot(jointStiffness: number[], jointDamping: number[]): number[] {
    const links = Array.from(this._links.values());
    const overshoots: number[] = [];
    for (let i = 0; i < jointStiffness.length; i++) {
      const inertia = links[i]?.inertiaTensor[2][2] ?? 0.01;
      const zeta = jointDamping[i] / (2 * Math.sqrt(jointStiffness[i] * inertia));
      const os = zeta < 1 ? Math.exp(-zeta * Math.PI / Math.sqrt(1 - zeta * zeta)) * 100 : 0;
      overshoots.push(Number(os.toFixed(4)));
    }
    return overshoots;
  }

  public toPacket(): DataPacket<{
    joints: number;
    links: number;
    payload: PayloadDynamics | null;
    trajectories: number;
    vibrations: number;
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['robotics', 'Dynamics'],
      priority: 1,
      phase: 'dynamics',
    };
    return {
      id: `dyn-${Date.now().toString(36)}-${(++this._counter).toString(36)}`,
      payload: {
        joints: this._joints.size,
        links: this._links.size,
        payload: this._payload,
        trajectories: this._trajectoryHistory.length,
        vibrations: this._vibrationModes.length,
      },
      metadata,
    };
  }

  public reset(): void {
    this._joints.clear();
    this._links.clear();
    this._frictionModels.clear();
    this._trajectoryHistory = [];
    this._stateHistory = [];
    this._vibrationModes = [];
    this._complianceHistory = [];
    this._payload = null;
    this._counter = 0;
    this._seedJointsAndLinks();
  }
}
