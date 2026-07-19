import { DataPacket } from '../shared/types';

export interface DiscreteEventSimulation {
  id: string;
  name: string;
  events: { time: number; type: string; entity: string; data: Record<string, unknown> }[];
  entities: Map<string, { type: string; state: string; attributes: Record<string, unknown> }>;
  eventQueue: { time: number; priority: number; event: Record<string, unknown> }[];
  currentTime: number;
  endTime: number;
  status: 'ready' | 'running' | 'paused' | 'completed' | 'error';
  eventCount: number;
}

export interface ContinuousSimulation {
  id: string;
  name: string;
  stateVariables: Record<string, number>;
  derivatives: Record<string, number>;
  parameters: Record<string, number>;
  equations: string[];
  solver: 'euler' | 'rk4' | 'runge_kutta' | 'adams_bashforth';
  timeStep: number;
  currentTime: number;
  endTime: number;
  status: 'ready' | 'running' | 'paused' | 'completed' | 'error';
  stepCount: number;
}

export interface HybridSimulation {
  id: string;
  name: string;
  discreteComponents: string[];
  continuousComponents: string[];
  couplingPoints: { time: number; discreteState: string; continuousState: Record<string, number> }[];
  synchronizationInterval: number;
  currentTime: number;
  endTime: number;
  status: 'ready' | 'running' | 'paused' | 'completed' | 'error';
  syncCount: number;
}

export interface SimulationResult {
  timeSeries: { time: number; values: Record<string, number> }[];
  metrics: {
    duration: number;
    steps: number;
    computeTime: number;
    errorEstimate: number;
  };
  finalState: Record<string, number>;
}

export interface SimulationEngineResult {
  discreteSimulations: DiscreteEventSimulation[];
  continuousSimulations: ContinuousSimulation[];
  hybridSimulations: HybridSimulation[];
  totalSimulations: number;
  runningSimulations: number;
  completedSimulations: number;
  overallProgress: number;
}

export class SimulationEngine {
  private _discreteSimulations: Map<string, DiscreteEventSimulation> = new Map();
  private _continuousSimulations: Map<string, ContinuousSimulation> = new Map();
  private _hybridSimulations: Map<string, HybridSimulation> = new Map();
  private _simulationResults: Map<string, SimulationResult> = new Map();
  private _counter: number = 0;
  private _lastResult: SimulationEngineResult | null = null;
  private _eventTypes: Set<string> = new Set();
  private _solverLibrary: Map<string, { method: string; order: number; stability: string }> = new Map();
  private _simulationStats: {
    totalSimulations: number;
    totalSteps: number;
    totalComputeTime: number;
    avgErrorEstimate: number;
  } = {
    totalSimulations: 0,
    totalSteps: 0,
    totalComputeTime: 0,
    avgErrorEstimate: 0,
  };
  private _scenarioTemplates: Map<string, Record<string, unknown>> = new Map();
  private _entityPrototypes: Map<string, Record<string, unknown>> = new Map();

  constructor() {
    this._initEventTypes();
    this._initSolverLibrary();
    this._initScenarioTemplates();
    this._initEntityPrototypes();
  }

  private _initEventTypes(): void {
    const types = [
      'arrival', 'departure', 'failure', 'repair', 'start', 'stop',
      'state_change', 'resource_acquire', 'resource_release', 'timer',
      'condition_met', 'threshold_exceeded', 'completion', 'timeout',
    ];
    types.forEach(t => this._eventTypes.add(t));
  }

  private _initSolverLibrary(): void {
    const solvers = [
      { name: 'euler', config: { method: 'explicit', order: 1, stability: 'conditionally stable' } },
      { name: 'rk4', config: { method: 'explicit', order: 4, stability: 'conditionally stable' } },
      { name: 'runge_kutta', config: { method: 'adaptive', order: 5, stability: 'conditionally stable' } },
      { name: 'adams_bashforth', config: { method: 'multistep', order: 3, stability: 'conditionally stable' } },
      { name: 'backward_euler', config: { method: 'implicit', order: 1, stability: 'unconditionally stable' } },
      { name: 'crank_nicolson', config: { method: 'implicit', order: 2, stability: 'unconditionally stable' } },
    ];
    solvers.forEach(s => this._solverLibrary.set(s.name, s.config));
  }

  private _initScenarioTemplates(): void {
    const scenarios = [
      {
        name: 'queueing_system',
        template: {
          type: 'discrete',
          entities: ['customers', 'servers'],
          events: ['arrival', 'service_start', 'service_end', 'departure'],
          parameters: { arrivalRate: 5, serviceRate: 6, numServers: 2 },
        },
      },
      {
        name: 'spring_mass_damper',
        template: {
          type: 'continuous',
          stateVariables: ['position', 'velocity'],
          parameters: { mass: 1, springConstant: 10, dampingCoefficient: 0.5 },
          solver: 'rk4',
        },
      },
      {
        name: 'manufacturing_line',
        template: {
          type: 'hybrid',
          discrete: ['machine_states', 'part_flow'],
          continuous: ['temperature', 'vibration', 'power_consumption'],
        },
      },
    ];
    scenarios.forEach(s => this._scenarioTemplates.set(s.name, s.template as Record<string, unknown>));
  }

  private _initEntityPrototypes(): void {
    const prototypes = [
      { name: 'machine', prototype: { type: 'resource', state: 'idle', efficiency: 0.95, mtbf: 1000, mttr: 10 } },
      { name: 'worker', prototype: { type: 'resource', state: 'available', skillLevel: 1, shiftPattern: '8h' } },
      { name: 'product', prototype: { type: 'flow_entity', state: 'created', quality: 1, priority: 0 } },
      { name: 'sensor', prototype: { type: 'monitoring', state: 'active', samplingRate: 10, accuracy: 0.99 } },
    ];
    prototypes.forEach(p => this._entityPrototypes.set(p.name, p.prototype as Record<string, unknown>));
  }

  get discreteSimulations(): DiscreteEventSimulation[] {
    return Array.from(this._discreteSimulations.values());
  }

  get continuousSimulations(): ContinuousSimulation[] {
    return Array.from(this._continuousSimulations.values());
  }

  get hybridSimulations(): HybridSimulation[] {
    return Array.from(this._hybridSimulations.values());
  }

  get totalSimulations(): number {
    return this._discreteSimulations.size + this._continuousSimulations.size + this._hybridSimulations.size;
  }

  get runningSimulations(): number {
    let count = 0;
    for (const sim of this._discreteSimulations.values()) {
      if (sim.status === 'running' || sim.status === 'paused') count++;
    }
    for (const sim of this._continuousSimulations.values()) {
      if (sim.status === 'running' || sim.status === 'paused') count++;
    }
    for (const sim of this._hybridSimulations.values()) {
      if (sim.status === 'running' || sim.status === 'paused') count++;
    }
    return count;
  }

  get completedSimulations(): number {
    let count = 0;
    for (const sim of this._discreteSimulations.values()) {
      if (sim.status === 'completed') count++;
    }
    for (const sim of this._continuousSimulations.values()) {
      if (sim.status === 'completed') count++;
    }
    for (const sim of this._hybridSimulations.values()) {
      if (sim.status === 'completed') count++;
    }
    return count;
  }

  get simulationStats(): {
    totalSimulations: number;
    totalSteps: number;
    totalComputeTime: number;
    avgErrorEstimate: number;
  } {
    return { ...this._simulationStats };
  }

  createDiscreteSimulation(
    name: string,
    endTime: number,
    params: {
      initialEvents?: { time: number; type: string; entity: string; data: Record<string, unknown> }[];
      entities?: Map<string, { type: string; state: string; attributes: Record<string, unknown> }>;
    } = {}
  ): DiscreteEventSimulation {
    const id = `des-${Date.now()}-${this._counter++}`;
    const sim: DiscreteEventSimulation = {
      id,
      name,
      events: params.initialEvents ?? [],
      entities: params.entities ?? new Map(),
      eventQueue: [],
      currentTime: 0,
      endTime,
      status: 'ready',
      eventCount: 0,
    };
    for (const event of sim.events) {
      sim.eventQueue.push({ time: event.time, priority: 0, event: event as unknown as Record<string, unknown> });
    }
    sim.eventQueue.sort((a, b) => a.time - b.time);
    this._discreteSimulations.set(id, sim);
    this._simulationStats.totalSimulations++;
    return sim;
  }

  createContinuousSimulation(
    name: string,
    endTime: number,
    params: {
      initialState?: Record<string, number>;
      parameters?: Record<string, number>;
      equations?: string[];
      solver?: 'euler' | 'rk4' | 'runge_kutta' | 'adams_bashforth';
      timeStep?: number;
    } = {}
  ): ContinuousSimulation {
    const id = `cont-${Date.now()}-${this._counter++}`;
    const sim: ContinuousSimulation = {
      id,
      name,
      stateVariables: params.initialState ?? {},
      derivatives: {},
      parameters: params.parameters ?? {},
      equations: params.equations ?? [],
      solver: params.solver ?? 'rk4',
      timeStep: params.timeStep ?? 0.01,
      currentTime: 0,
      endTime,
      status: 'ready',
      stepCount: 0,
    };
    for (const key of Object.keys(sim.stateVariables)) {
      sim.derivatives[key] = 0;
    }
    this._continuousSimulations.set(id, sim);
    this._simulationStats.totalSimulations++;
    return sim;
  }

  createHybridSimulation(
    name: string,
    endTime: number,
    params: {
      discreteComponents?: string[];
      continuousComponents?: string[];
      synchronizationInterval?: number;
    } = {}
  ): HybridSimulation {
    const id = `hyb-${Date.now()}-${this._counter++}`;
    const sim: HybridSimulation = {
      id,
      name,
      discreteComponents: params.discreteComponents ?? [],
      continuousComponents: params.continuousComponents ?? [],
      couplingPoints: [],
      synchronizationInterval: params.synchronizationInterval ?? 0.1,
      currentTime: 0,
      endTime,
      status: 'ready',
      syncCount: 0,
    };
    this._hybridSimulations.set(id, sim);
    this._simulationStats.totalSimulations++;
    return sim;
  }

  scheduleEvent(
    simId: string,
    time: number,
    type: string,
    entity: string,
    data: Record<string, unknown> = {},
    priority: number = 0
  ): boolean {
    const sim = this._discreteSimulations.get(simId);
    if (!sim) return false;
    this._eventTypes.add(type);
    const event = { time, type, entity, data };
    sim.events.push(event);
    sim.eventQueue.push({ time, priority, event: event as unknown as Record<string, unknown> });
    sim.eventQueue.sort((a, b) => a.time - b.time || b.priority - a.priority);
    return true;
  }

  addEntity(
    simId: string,
    entityId: string,
    type: string,
    state: string,
    attributes: Record<string, unknown> = {}
  ): boolean {
    const sim = this._discreteSimulations.get(simId);
    if (!sim) return false;
    sim.entities.set(entityId, { type, state, attributes });
    return true;
  }

  stepDiscreteSimulation(simId: string): { eventProcessed: boolean; newEvents: number; currentTime: number } {
    const sim = this._discreteSimulations.get(simId);
    if (!sim || sim.eventQueue.length === 0 || sim.status === 'completed') {
      return { eventProcessed: false, newEvents: 0, currentTime: sim?.currentTime ?? 0 };
    }
    const nextEvent = sim.eventQueue.shift()!;
    const eventData = nextEvent.event as unknown as { time: number; type: string; entity: string; data: Record<string, unknown> };
    sim.currentTime = eventData.time;
    sim.eventCount++;
    if (sim.currentTime >= sim.endTime) {
      sim.status = 'completed';
    }
    return { eventProcessed: true, newEvents: 0, currentTime: sim.currentTime };
  }

  runDiscreteSimulation(simId: string, maxEvents: number = 1000): { processed: number; endTime: number } {
    const sim = this._discreteSimulations.get(simId);
    if (!sim) return { processed: 0, endTime: 0 };
    sim.status = 'running';
    let processed = 0;
    const startTime = Date.now();
    while (sim.eventQueue.length > 0 && processed < maxEvents && sim.currentTime < sim.endTime) {
      const result = this.stepDiscreteSimulation(simId);
      if (result.eventProcessed) {
        processed++;
      } else {
        break;
      }
    }
    const computeTime = Date.now() - startTime;
    this._simulationStats.totalSteps += processed;
    this._simulationStats.totalComputeTime += computeTime;
    if (sim.currentTime >= sim.endTime || sim.eventQueue.length === 0) {
      sim.status = 'completed';
    } else {
      sim.status = 'paused';
    }
    this._simulationResults.set(simId, {
      timeSeries: [],
      metrics: {
        duration: sim.currentTime,
        steps: processed,
        computeTime,
        errorEstimate: 0,
      },
      finalState: {},
    });
    return { processed, endTime: sim.currentTime };
  }

  stepContinuousSimulation(simId: string): { state: Record<string, number>; time: number; step: number } {
    const sim = this._continuousSimulations.get(simId);
    if (!sim || sim.status === 'completed') {
      return { state: sim?.stateVariables ?? {}, time: sim?.currentTime ?? 0, step: sim?.stepCount ?? 0 };
    }
    const dt = sim.timeStep;
    const newState: Record<string, number> = {};
    for (const key of Object.keys(sim.stateVariables)) {
      const derivative = this._computeDerivative(sim, key, sim.stateVariables, sim.currentTime);
      sim.derivatives[key] = derivative;
      if (sim.solver === 'euler') {
        newState[key] = sim.stateVariables[key] + derivative * dt;
      } else {
        newState[key] = this._rk4Step(sim, key, dt);
      }
    }
    sim.stateVariables = newState;
    sim.currentTime += dt;
    sim.stepCount++;
    if (sim.currentTime >= sim.endTime) {
      sim.status = 'completed';
    }
    return { state: { ...sim.stateVariables }, time: sim.currentTime, step: sim.stepCount };
  }

  private _computeDerivative(
    sim: ContinuousSimulation,
    variable: string,
    state: Record<string, number>,
    time: number
  ): number {
    const params = sim.parameters;
    if (variable === 'velocity' && state['position'] !== undefined) {
      return -(params['springConstant'] ?? 10) / (params['mass'] ?? 1) * state['position']
        - (params['dampingCoefficient'] ?? 0) / (params['mass'] ?? 1) * state['velocity'];
    }
    if (variable === 'position') {
      return state['velocity'] ?? 0;
    }
    return -0.1 * (state[variable] ?? 0);
  }

  private _rk4Step(sim: ContinuousSimulation, variable: string, dt: number): number {
    const y = sim.stateVariables[variable] ?? 0;
    const k1 = this._computeDerivative(sim, variable, sim.stateVariables, sim.currentTime);
    const state2 = { ...sim.stateVariables };
    for (const k of Object.keys(state2)) {
      state2[k] += k1 * dt / 2;
    }
    const k2 = this._computeDerivative(sim, variable, state2, sim.currentTime + dt / 2);
    const state3 = { ...sim.stateVariables };
    for (const k of Object.keys(state3)) {
      state3[k] += k2 * dt / 2;
    }
    const k3 = this._computeDerivative(sim, variable, state3, sim.currentTime + dt / 2);
    const state4 = { ...sim.stateVariables };
    for (const k of Object.keys(state4)) {
      state4[k] += k3 * dt;
    }
    const k4 = this._computeDerivative(sim, variable, state4, sim.currentTime + dt);
    return y + (dt / 6) * (k1 + 2 * k2 + 2 * k3 + k4);
  }

  runContinuousSimulation(simId: string, maxSteps: number = 10000): { steps: number; endTime: number; finalState: Record<string, number> } {
    const sim = this._continuousSimulations.get(simId);
    if (!sim) return { steps: 0, endTime: 0, finalState: {} };
    sim.status = 'running';
    let steps = 0;
    const timeSeries: { time: number; values: Record<string, number> }[] = [];
    const startTime = Date.now();
    while (steps < maxSteps && sim.currentTime < sim.endTime) {
      const result = this.stepContinuousSimulation(simId);
      steps++;
      if (steps % 10 === 0) {
        timeSeries.push({ time: result.time, values: { ...result.state } });
      }
    }
    const computeTime = Date.now() - startTime;
    this._simulationStats.totalSteps += steps;
    this._simulationStats.totalComputeTime += computeTime;
    if (sim.currentTime >= sim.endTime) {
      sim.status = 'completed';
    } else {
      sim.status = 'paused';
    }
    const errorEstimate = sim.solver === 'rk4' ? 1e-6 : 1e-3;
    this._simulationResults.set(simId, {
      timeSeries,
      metrics: {
        duration: sim.currentTime,
        steps,
        computeTime,
        errorEstimate,
      },
      finalState: { ...sim.stateVariables },
    });
    this._updateAvgError(errorEstimate);
    return { steps, endTime: sim.currentTime, finalState: { ...sim.stateVariables } };
  }

  runHybridSimulation(simId: string, maxSyncs: number = 1000): { syncs: number; endTime: number } {
    const sim = this._hybridSimulations.get(simId);
    if (!sim) return { syncs: 0, endTime: 0 };
    sim.status = 'running';
    let syncs = 0;
    const startTime = Date.now();
    while (syncs < maxSyncs && sim.currentTime < sim.endTime) {
      sim.currentTime += sim.synchronizationInterval;
      sim.couplingPoints.push({
        time: sim.currentTime,
        discreteState: 'running',
        continuousState: {},
      });
      sim.syncCount++;
      syncs++;
    }
    const computeTime = Date.now() - startTime;
    this._simulationStats.totalSteps += syncs;
    this._simulationStats.totalComputeTime += computeTime;
    if (sim.currentTime >= sim.endTime) {
      sim.status = 'completed';
    } else {
      sim.status = 'paused';
    }
    this._simulationResults.set(simId, {
      timeSeries: [],
      metrics: {
        duration: sim.currentTime,
        steps: syncs,
        computeTime,
        errorEstimate: 1e-4,
      },
      finalState: {},
    });
    return { syncs, endTime: sim.currentTime };
  }

  pauseSimulation(simId: string): boolean {
    const sims: Map<string, { status: string }>[] = [
      this._discreteSimulations as unknown as Map<string, { status: string }>,
      this._continuousSimulations as unknown as Map<string, { status: string }>,
      this._hybridSimulations as unknown as Map<string, { status: string }>,
    ];
    for (const simMap of sims) {
      const sim = simMap.get(simId);
      if (sim && sim.status === 'running') {
        sim.status = 'paused';
        return true;
      }
    }
    return false;
  }

  resumeSimulation(simId: string): boolean {
    const sims: Map<string, { status: string }>[] = [
      this._discreteSimulations as unknown as Map<string, { status: string }>,
      this._continuousSimulations as unknown as Map<string, { status: string }>,
      this._hybridSimulations as unknown as Map<string, { status: string }>,
    ];
    for (const simMap of sims) {
      const sim = simMap.get(simId);
      if (sim && sim.status === 'paused') {
        sim.status = 'running';
        return true;
      }
    }
    return false;
  }

  getSimulationResult(simId: string): SimulationResult | null {
    return this._simulationResults.get(simId) ?? null;
  }

  getSolverNames(): string[] {
    return Array.from(this._solverLibrary.keys());
  }

  getScenarioNames(): string[] {
    return Array.from(this._scenarioTemplates.keys());
  }

  getEntityPrototypeNames(): string[] {
    return Array.from(this._entityPrototypes.keys());
  }

  getEventTypeNames(): string[] {
    return Array.from(this._eventTypes);
  }

  private _updateAvgError(error: number): void {
    const total = this._simulationStats.totalSimulations;
    this._simulationStats.avgErrorEstimate =
      (this._simulationStats.avgErrorEstimate * (total - 1) + error) / total;
  }

  toPacket(): DataPacket<SimulationEngineResult> {
    const result: SimulationEngineResult = {
      discreteSimulations: Array.from(this._discreteSimulations.values()),
      continuousSimulations: Array.from(this._continuousSimulations.values()),
      hybridSimulations: Array.from(this._hybridSimulations.values()),
      totalSimulations: this.totalSimulations,
      runningSimulations: this.runningSimulations,
      completedSimulations: this.completedSimulations,
      overallProgress:
        this.totalSimulations > 0 ? this.completedSimulations / this.totalSimulations : 0,
    };
    this._lastResult = result;
    this._counter++;
    return {
      id: `simulation-engine-${Date.now()}-${this._counter}`,
      payload: result,
      metadata: {
        createdAt: Date.now(),
        route: ['digital_twin', 'simulation_engine'],
        priority: 1,
        phase: 'simulation',
      },
    };
  }

  reset(): void {
    this._discreteSimulations.clear();
    this._continuousSimulations.clear();
    this._hybridSimulations.clear();
    this._simulationResults.clear();
    this._counter = 0;
    this._lastResult = null;
    this._eventTypes.clear();
    this._simulationStats = {
      totalSimulations: 0,
      totalSteps: 0,
      totalComputeTime: 0,
      avgErrorEstimate: 0,
    };
  }
}
