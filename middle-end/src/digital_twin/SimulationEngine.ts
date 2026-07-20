import { DataPacket } from '../shared/types';

export interface PhysicsSimulation {
  id: string;
  type: 'rigid-body' | 'soft-body' | 'fluid' | 'cloth' | 'particles' | 'multibody';
  gravity: number[];
  timeStep: number;
  substeps: number;
  solverIterations: number;
  bodies: PhysicsBody[];
  constraints: PhysicsConstraint[];
  collisionEnabled: boolean;
  frictionModel: 'coulomb' | 'sticky' | 'rolling';
  metadata: Record<string, unknown>;
}

export interface PhysicsBody {
  id: string;
  mass: number;
  inertia: number[];
  position: number[];
  rotation: number[];
  velocity: number[];
  angularVelocity: number[];
  shape: 'box' | 'sphere' | 'capsule' | 'mesh' | 'cylinder' | 'plane';
  dimensions: number[];
  isStatic: boolean;
  isKinematic: boolean;
  restitution: number;
  friction: number;
  linearDamping: number;
  angularDamping: number;
}

export interface PhysicsConstraint {
  id: string;
  type: 'fixed' | 'hinge' | 'slider' | 'spring' | 'ball-socket' | 'gear';
  bodyA: string;
  bodyB: string;
  anchorA: number[];
  anchorB: number[];
  axisA?: number[];
  axisB?: number[];
  limits?: { min: number; max: number };
  stiffness?: number;
  damping?: number;
  breakForce?: number;
}

export interface ThermalSimulation {
  id: string;
  type: 'steady-state' | 'transient' | 'conjugate-heat-transfer';
  ambientTemperature: number;
  heatTransferCoefficient: number;
  materials: ThermalMaterial[];
  heatSources: HeatSource[];
  boundaryConditions: ThermalBoundaryCondition[];
  meshResolution: number;
  convergenceTolerance: number;
  maxIterations: number;
  metadata: Record<string, unknown>;
}

export interface ThermalMaterial {
  id: string;
  name: string;
  thermalConductivity: number;
  specificHeat: number;
  density: number;
  emissivity: number;
  temperatureRange: { min: number; max: number };
}

export interface HeatSource {
  id: string;
  type: 'volumetric' | 'surface' | 'point';
  location: number[];
  power: number;
  radius: number;
  active: boolean;
  dutyCycle: number;
}

export interface ThermalBoundaryCondition {
  id: string;
  type: 'temperature' | 'heat-flux' | 'convection' | 'radiation' | 'insulated';
  surfaceId: string;
  value: number;
  coefficient?: number;
  ambientTemperature?: number;
}

export interface FluidSimulation {
  id: string;
  type: 'incompressible' | 'compressible' | 'multiphase' | 'turbulent';
  fluid: FluidProperties;
  domain: { min: number[]; max: number[] };
  inletBoundaryConditions: FluidBoundaryCondition[];
  outletBoundaryConditions: FluidBoundaryCondition[];
  wallBoundaryConditions: FluidBoundaryCondition[];
  turbulenceModel: 'laminar' | 'k-epsilon' | 'k-omega' | 'LES' | 'RANS';
  timeIntegration: 'steady' | 'unsteady';
  courantNumber: number;
  metadata: Record<string, unknown>;
}

export interface FluidProperties {
  density: number;
  dynamicViscosity: number;
  specificHeat: number;
  thermalConductivity: number;
  bulkModulus: number;
  surfaceTension: number;
  temperature: number;
  pressure: number;
}

export interface FluidBoundaryCondition {
  id: string;
  surfaceId: string;
  type: 'velocity' | 'pressure' | 'mass-flow' | 'no-slip' | 'slip' | 'symmetry';
  value: number | number[];
  temperature?: number;
  turbulentIntensity?: number;
}

export interface SimulationResult {
  simulationId: string;
  type: 'physics' | 'thermal' | 'fluid' | 'structural' | 'electromagnetic';
  timeSteps: number;
  totalTime: number;
  convergenceStatus: 'converged' | 'diverged' | 'max-iterations' | 'error';
  residuals: number[];
  outputData: Record<string, unknown[]>;
  performanceMetrics: Record<string, number>;
  timestamp: number;
  errors: string[];
  warnings: string[];
}

export interface StructuralSimulation {
  id: string;
  type: 'static' | 'modal' | 'dynamic' | 'buckling' | 'fatigue';
  material: StructuralMaterial;
  mesh: StructuralMesh;
  loads: StructuralLoad[];
  constraints: StructuralConstraint[];
  solverSettings: { type: 'direct' | 'iterative'; tolerance: number; maxIterations: number };
  metadata: Record<string, unknown>;
}

export interface StructuralMaterial {
  id: string;
  name: string;
  youngsModulus: number;
  poissonRatio: number;
  density: number;
  yieldStrength: number;
  ultimateStrength: number;
  fatigueStrength?: number;
  temperatureDependent?: boolean;
}

export interface StructuralMesh {
  nodes: number[][];
  elements: number[][];
  elementType: 'tetrahedral' | 'hexahedral' | 'shell' | 'beam' | 'truss';
  nodeCount: number;
  elementCount: number;
}

export interface StructuralLoad {
  id: string;
  type: 'force' | 'pressure' | 'torque' | 'gravity' | 'thermal' | 'centrifugal';
  magnitude: number | number[];
  direction: number[];
  surfaceOrNodeIds: string[];
  timeProfile?: number[][];
}

export interface StructuralConstraint {
  id: string;
  type: 'fixed' | 'pinned' | 'roller' | 'symmetry' | 'periodic';
  nodeIds: string[];
  degreesOfFreedom: boolean[];
}

export interface ElectromagneticSimulation {
  id: string;
  type: 'electrostatic' | 'magnetostatic' | 'eddy-current' | 'full-wave' | 'thermal-electric';
  frequency: number;
  materials: EMMaterial[];
  excitations: EMExcitation[];
  boundaryConditions: EMBoundaryCondition[];
  solverSettings: { order: number; adaptiveMesh: boolean; maxRefinements: number };
  metadata: Record<string, unknown>;
}

export interface EMMaterial {
  id: string;
  name: string;
  permittivity: number;
  permeability: number;
  conductivity: number;
  lossTangent: number;
}

export interface EMExcitation {
  id: string;
  type: 'voltage' | 'current' | 'wave-port' | 'lumped-port';
  value: number | number[];
  phase: number;
  surfaceOrEdgeIds: string[];
}

export interface EMBoundaryCondition {
  id: string;
  type: 'perfect-electric-conductor' | 'perfect-magnetic-conductor' | 'absorbing' | 'periodic' | 'symmetry';
  surfaceId: string;
  parameters?: Record<string, number>;
}

export class SimulationEngine {
  private _physicsSimulations: Map<string, PhysicsSimulation> = new Map();
  private _thermalSimulations: Map<string, ThermalSimulation> = new Map();
  private _fluidSimulations: Map<string, FluidSimulation> = new Map();
  private _structuralSimulations: Map<string, StructuralSimulation> = new Map();
  private _electromagneticSimulations: Map<string, ElectromagneticSimulation> = new Map();
  private _results: Map<string, SimulationResult> = new Map();
  private _lastResult: SimulationResult | null = null;
  private _counter: number = 0;
  private _solverLibrary: string = 'default';
  private _maxThreads: number = 8;
  private _checkpointInterval: number = 300;
  private _checkpointData: Map<string, unknown> = new Map();
  private _simulationQueue: string[] = [];
  private _runningSimulations: Set<string> = new Set();
  private _gpuAcceleration: boolean = false;
  private _precision: 'single' | 'double' = 'double';
  private _logLevel: 'debug' | 'info' | 'warn' | 'error' = 'info';
  private _simulationLog: { timestamp: number; simulationId: string; message: string; level: string }[] = [];
  private _convergenceCriteria: Map<string, { tolerance: number; maxIterations: number }> = new Map();
  private _materialDatabase: Map<string, unknown> = new Map();

  constructor() {
    this._initDefaultMaterials();
    this._initConvergenceCriteria();
  }

  private _initDefaultMaterials(): void {
    this._materialDatabase.set('steel-a36', {
      name: 'Steel A36',
      youngsModulus: 200e9,
      poissonRatio: 0.26,
      density: 7850,
      yieldStrength: 250e6,
      ultimateStrength: 400e6,
      thermalConductivity: 50,
      specificHeat: 500
    });

    this._materialDatabase.set('aluminum-6061', {
      name: 'Aluminum 6061',
      youngsModulus: 68.9e9,
      poissonRatio: 0.33,
      density: 2700,
      yieldStrength: 276e6,
      ultimateStrength: 310e6,
      thermalConductivity: 167,
      specificHeat: 896
    });

    this._materialDatabase.set('water-liquid', {
      name: 'Water (Liquid)',
      density: 998,
      dynamicViscosity: 0.001,
      specificHeat: 4186,
      thermalConductivity: 0.6,
      bulkModulus: 2.2e9,
      surfaceTension: 0.072
    });

    this._materialDatabase.set('air-standard', {
      name: 'Air (Standard Conditions)',
      density: 1.225,
      dynamicViscosity: 1.81e-5,
      specificHeat: 1005,
      thermalConductivity: 0.0257,
      bulkModulus: 101325,
      surfaceTension: 0
    });
  }

  private _initConvergenceCriteria(): void {
    this._convergenceCriteria.set('physics-default', { tolerance: 1e-6, maxIterations: 1000 });
    this._convergenceCriteria.set('thermal-default', { tolerance: 1e-5, maxIterations: 500 });
    this._convergenceCriteria.set('fluid-default', { tolerance: 1e-4, maxIterations: 2000 });
    this._convergenceCriteria.set('structural-default', { tolerance: 1e-8, maxIterations: 100 });
    this._convergenceCriteria.set('electromagnetic-default', { tolerance: 1e-6, maxIterations: 50 });
  }

  get physicsSimulations(): Map<string, PhysicsSimulation> {
    return new Map(this._physicsSimulations);
  }

  get thermalSimulations(): Map<string, ThermalSimulation> {
    return new Map(this._thermalSimulations);
  }

  get fluidSimulations(): Map<string, FluidSimulation> {
    return new Map(this._fluidSimulations);
  }

  get structuralSimulations(): Map<string, StructuralSimulation> {
    return new Map(this._structuralSimulations);
  }

  get electromagneticSimulations(): Map<string, ElectromagneticSimulation> {
    return new Map(this._electromagneticSimulations);
  }

  get results(): Map<string, SimulationResult> {
    return new Map(this._results);
  }

  get lastResult(): SimulationResult | null {
    return this._lastResult;
  }

  get solverLibrary(): string {
    return this._solverLibrary;
  }

  get maxThreads(): number {
    return this._maxThreads;
  }

  get gpuAcceleration(): boolean {
    return this._gpuAcceleration;
  }

  get precision(): 'single' | 'double' {
    return this._precision;
  }

  get runningSimulationCount(): number {
    return this._runningSimulations.size;
  }

  get queuedSimulationCount(): number {
    return this._simulationQueue.length;
  }

  get totalSimulationCount(): number {
    return this._physicsSimulations.size + this._thermalSimulations.size +
           this._fluidSimulations.size + this._structuralSimulations.size +
           this._electromagneticSimulations.size;
  }

  setSolverLibrary(library: string): void {
    this._solverLibrary = library;
  }

  setMaxThreads(threads: number): void {
    this._maxThreads = threads;
  }

  setGpuAcceleration(enabled: boolean): void {
    this._gpuAcceleration = enabled;
  }

  setPrecision(precision: 'single' | 'double'): void {
    this._precision = precision;
  }

  setLogLevel(level: 'debug' | 'info' | 'warn' | 'error'): void {
    this._logLevel = level;
  }

  addPhysicsSimulation(simulation: PhysicsSimulation): void {
    this._physicsSimulations.set(simulation.id, simulation);
    this._log('info', simulation.id, `Added physics simulation ${simulation.id}`);
  }

  addThermalSimulation(simulation: ThermalSimulation): void {
    this._thermalSimulations.set(simulation.id, simulation);
    this._log('info', simulation.id, `Added thermal simulation ${simulation.id}`);
  }

  addFluidSimulation(simulation: FluidSimulation): void {
    this._fluidSimulations.set(simulation.id, simulation);
    this._log('info', simulation.id, `Added fluid simulation ${simulation.id}`);
  }

  addStructuralSimulation(simulation: StructuralSimulation): void {
    this._structuralSimulations.set(simulation.id, simulation);
    this._log('info', simulation.id, `Added structural simulation ${simulation.id}`);
  }

  addElectromagneticSimulation(simulation: ElectromagneticSimulation): void {
    this._electromagneticSimulations.set(simulation.id, simulation);
    this._log('info', simulation.id, `Added electromagnetic simulation ${simulation.id}`);
  }

  removeSimulation(id: string): boolean {
    const removed =
      this._physicsSimulations.delete(id) ||
      this._thermalSimulations.delete(id) ||
      this._fluidSimulations.delete(id) ||
      this._structuralSimulations.delete(id) ||
      this._electromagneticSimulations.delete(id);
    if (removed) {
      this._results.delete(id);
      this._runningSimulations.delete(id);
    }
    return removed;
  }

  queueSimulation(id: string): void {
    if (!this._simulationQueue.includes(id)) {
      this._simulationQueue.push(id);
    }
  }

  runSimulation(id: string): SimulationResult {
    this._runningSimulations.add(id);
    const startTime = Date.now();

    let result: SimulationResult;

    if (this._physicsSimulations.has(id)) {
      result = this._runPhysicsSimulation(id, startTime);
    } else if (this._thermalSimulations.has(id)) {
      result = this._runThermalSimulation(id, startTime);
    } else if (this._fluidSimulations.has(id)) {
      result = this._runFluidSimulation(id, startTime);
    } else if (this._structuralSimulations.has(id)) {
      result = this._runStructuralSimulation(id, startTime);
    } else if (this._electromagneticSimulations.has(id)) {
      result = this._runElectromagneticSimulation(id, startTime);
    } else {
      result = this._createErrorResult(id, 'Simulation not found');
    }

    this._results.set(id, result);
    this._lastResult = result;
    this._runningSimulations.delete(id);
    this._counter++;
    this._log(result.convergenceStatus === 'converged' ? 'info' : 'warn', id, `Simulation ${id} completed with status ${result.convergenceStatus}`);
    return result;
  }

  private _runPhysicsSimulation(id: string, startTime: number): SimulationResult {
    const sim = this._physicsSimulations.get(id)!;
    const timeSteps = Math.floor(sim.timeStep > 0 ? 1.0 / sim.timeStep : 100);
    const residuals = Array.from({ length: timeSteps }, () => Math.random() * 0.01);
    const converged = residuals.every(r => r < 1e-4);

    return {
      simulationId: id,
      type: 'physics',
      timeSteps,
      totalTime: Date.now() - startTime,
      convergenceStatus: converged ? 'converged' : 'max-iterations',
      residuals,
      outputData: {
        positions: sim.bodies.map(b => b.position),
        velocities: sim.bodies.map(b => b.velocity),
        energies: sim.bodies.map(b => 0.5 * b.mass * (b.velocity[0] ** 2 + b.velocity[1] ** 2 + b.velocity[2] ** 2))
      },
      performanceMetrics: {
        fps: 1000 / (Date.now() - startTime + 1),
        bodyCount: sim.bodies.length,
        constraintCount: sim.constraints.length,
        collisionPairs: 0
      },
      timestamp: Date.now(),
      errors: [],
      warnings: []
    };
  }

  private _runThermalSimulation(id: string, startTime: number): SimulationResult {
    const sim = this._thermalSimulations.get(id)!;
    const maxIterations = sim.maxIterations;
    const residuals = Array.from({ length: maxIterations }, (_, i) => 1.0 / (i + 1));
    const converged = residuals[residuals.length - 1] < sim.convergenceTolerance;

    return {
      simulationId: id,
      type: 'thermal',
      timeSteps: maxIterations,
      totalTime: Date.now() - startTime,
      convergenceStatus: converged ? 'converged' : 'max-iterations',
      residuals,
      outputData: {
        temperatures: sim.heatSources.map(h => h.power / (h.radius + 1)),
        heatFluxes: sim.boundaryConditions.map(b => b.value),
        convergenceHistory: residuals
      },
      performanceMetrics: {
        nodeCount: sim.meshResolution ** 3,
        heatSourceCount: sim.heatSources.length,
        boundaryConditionCount: sim.boundaryConditions.length,
        avgTemperature: sim.ambientTemperature
      },
      timestamp: Date.now(),
      errors: [],
      warnings: []
    };
  }

  private _runFluidSimulation(id: string, startTime: number): SimulationResult {
    const sim = this._fluidSimulations.get(id)!;
    const iterations = 100;
    const residuals = Array.from({ length: iterations }, (_, i) => Math.exp(-i * 0.05));

    return {
      simulationId: id,
      type: 'fluid',
      timeSteps: iterations,
      totalTime: Date.now() - startTime,
      convergenceStatus: 'converged',
      residuals,
      outputData: {
        velocities: sim.inletBoundaryConditions.map(b => Array.isArray(b.value) ? b.value : [b.value, 0, 0]),
        pressures: sim.outletBoundaryConditions.map(b => typeof b.value === 'number' ? b.value : 0),
        vorticities: []
      },
      performanceMetrics: {
        cellCount: 100000,
        reynoldsNumber: sim.fluid.density * 10 * 1 / sim.fluid.dynamicViscosity,
        courantNumber: sim.courantNumber,
        turbulenceModel: sim.turbulenceModel
      },
      timestamp: Date.now(),
      errors: [],
      warnings: []
    };
  }

  private _runStructuralSimulation(id: string, startTime: number): SimulationResult {
    const sim = this._structuralSimulations.get(id)!;
    const iterations = 50;
    const residuals = Array.from({ length: iterations }, (_, i) => Math.pow(0.5, i));

    return {
      simulationId: id,
      type: 'structural',
      timeSteps: iterations,
      totalTime: Date.now() - startTime,
      convergenceStatus: 'converged',
      residuals,
      outputData: {
        displacements: sim.mesh.nodes.map(n => n.map(v => v * 0.001)),
        stresses: sim.loads.map(l => l.magnitude),
        strains: sim.loads.map(l => (typeof l.magnitude === 'number' ? l.magnitude : l.magnitude[0]) / sim.material.youngsModulus)
      },
      performanceMetrics: {
        nodeCount: sim.mesh.nodeCount,
        elementCount: sim.mesh.elementCount,
        maxStress: 0,
        maxDisplacement: 0,
        safetyFactor: sim.material.yieldStrength / 1e6
      },
      timestamp: Date.now(),
      errors: [],
      warnings: []
    };
  }

  private _runElectromagneticSimulation(id: string, startTime: number): SimulationResult {
    const sim = this._electromagneticSimulations.get(id)!;
    const iterations = 30;
    const residuals = Array.from({ length: iterations }, (_, i) => Math.exp(-i * 0.1));

    return {
      simulationId: id,
      type: 'electromagnetic',
      timeSteps: iterations,
      totalTime: Date.now() - startTime,
      convergenceStatus: 'converged',
      residuals,
      outputData: {
        electricField: sim.excitations.map(e => e.value),
        magneticField: sim.materials.map(m => m.permeability * 1e-7),
        powerLoss: sim.materials.map(m => m.conductivity * 0.1)
      },
      performanceMetrics: {
        frequency: sim.frequency,
        wavelength: 3e8 / sim.frequency,
        meshElementCount: 50000,
        solverOrder: sim.solverSettings.order
      },
      timestamp: Date.now(),
      errors: [],
      warnings: []
    };
  }

  private _createErrorResult(id: string, error: string): SimulationResult {
    return {
      simulationId: id,
      type: 'physics',
      timeSteps: 0,
      totalTime: 0,
      convergenceStatus: 'error',
      residuals: [],
      outputData: {},
      performanceMetrics: {},
      timestamp: Date.now(),
      errors: [error],
      warnings: []
    };
  }

  runAllQueued(): SimulationResult[] {
    const results: SimulationResult[] = [];
    while (this._simulationQueue.length > 0) {
      const id = this._simulationQueue.shift()!;
      results.push(this.runSimulation(id));
    }
    return results;
  }

  stopSimulation(id: string): boolean {
    if (this._runningSimulations.has(id)) {
      this._runningSimulations.delete(id);
      this._log('warn', id, `Simulation ${id} stopped by user`);
      return true;
    }
    return false;
  }

  getResult(id: string): SimulationResult | undefined {
    return this._results.get(id);
  }

  exportResult(id: string): string {
    const result = this._results.get(id);
    return result ? JSON.stringify(result, null, 2) : '';
  }

  saveCheckpoint(simulationId: string, data: unknown): void {
    this._checkpointData.set(simulationId, data);
  }

  loadCheckpoint(simulationId: string): unknown | undefined {
    return this._checkpointData.get(simulationId);
  }

  getMaterialProperties(name: string): unknown | undefined {
    return this._materialDatabase.get(name);
  }

  addMaterialProperties(name: string, properties: unknown): void {
    this._materialDatabase.set(name, properties);
  }

  getConvergenceCriteria(type: string): { tolerance: number; maxIterations: number } | undefined {
    return this._convergenceCriteria.get(type);
  }

  setConvergenceCriteria(type: string, criteria: { tolerance: number; maxIterations: number }): void {
    this._convergenceCriteria.set(type, criteria);
  }

  getSimulationLog(simulationId?: string): { timestamp: number; simulationId: string; message: string; level: string }[] {
    if (simulationId) {
      return this._simulationLog.filter(l => l.simulationId === simulationId);
    }
    return [...this._simulationLog];
  }

  private _log(level: string, simulationId: string, message: string): void {
    if (this._logLevel === 'error' && level !== 'error') return;
    if (this._logLevel === 'warn' && level === 'info') return;
    if (this._logLevel === 'warn' && level === 'debug') return;
    if (this._logLevel === 'info' && level === 'debug') return;

    this._simulationLog.push({ timestamp: Date.now(), simulationId, message, level });
    if (this._simulationLog.length > 10000) {
      this._simulationLog.shift();
    }
  }

  estimateMemoryUsage(simulationId: string): number {
    const physics = this._physicsSimulations.get(simulationId);
    if (physics) {
      return physics.bodies.length * 1024 + physics.constraints.length * 512;
    }
    const thermal = this._thermalSimulations.get(simulationId);
    if (thermal) {
      return thermal.meshResolution ** 3 * 64;
    }
    const fluid = this._fluidSimulations.get(simulationId);
    if (fluid) {
      return 100000 * 128;
    }
    const structural = this._structuralSimulations.get(simulationId);
    if (structural) {
      return structural.mesh.nodeCount * 256 + structural.mesh.elementCount * 128;
    }
    const em = this._electromagneticSimulations.get(simulationId);
    if (em) {
      return 50000 * 192;
    }
    return 0;
  }

  compareResults(id1: string, id2: string): { match: boolean; differences: string[] } {
    const r1 = this._results.get(id1);
    const r2 = this._results.get(id2);
    if (!r1 || !r2) return { match: false, differences: ['One or both results not found'] };

    const differences: string[] = [];
    if (r1.type !== r2.type) differences.push('Simulation types differ');
    if (r1.convergenceStatus !== r2.convergenceStatus) differences.push('Convergence statuses differ');
    if (Math.abs(r1.totalTime - r2.totalTime) > 1000) differences.push('Total times differ significantly');

    return { match: differences.length === 0, differences };
  }

  toPacket(): DataPacket<SimulationResult> {
    const result = this._lastResult || {
      simulationId: '',
      type: 'physics',
      timeSteps: 0,
      totalTime: 0,
      convergenceStatus: 'error',
      residuals: [],
      outputData: {},
      performanceMetrics: {},
      timestamp: Date.now(),
      errors: [],
      warnings: []
    };
    this._counter++;
    return {
      id: `simulation-engine-${Date.now()}-${this._counter}`,
      payload: result,
      metadata: {
        createdAt: Date.now(),
        route: ['digital-twin', 'simulation-engine'],
        priority: 1,
        phase: 'simulation'
      }
    };
  }

  reset(): void {
    this._physicsSimulations.clear();
    this._thermalSimulations.clear();
    this._fluidSimulations.clear();
    this._structuralSimulations.clear();
    this._electromagneticSimulations.clear();
    this._results.clear();
    this._lastResult = null;
    this._counter = 0;
    this._solverLibrary = 'default';
    this._maxThreads = 8;
    this._checkpointInterval = 300;
    this._checkpointData.clear();
    this._simulationQueue = [];
    this._runningSimulations.clear();
    this._gpuAcceleration = false;
    this._precision = 'double';
    this._logLevel = 'info';
    this._simulationLog = [];
    this._convergenceCriteria.clear();
    this._materialDatabase.clear();
    this._initDefaultMaterials();
    this._initConvergenceCriteria();
  }
}
