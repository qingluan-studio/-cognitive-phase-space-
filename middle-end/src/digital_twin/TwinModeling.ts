import { DataPacket } from '../shared/types';

export interface GeometricModel {
  id: string;
  type: 'cad' | 'mesh' | 'point_cloud' | 'parametric';
  vertices: number;
  faces: number;
  precision: number;
  format: string;
  boundingBox: { min: number[]; max: number[] };
  levelOfDetail: number;
}

export interface PhysicalModel {
  id: string;
  domain: 'mechanical' | 'thermal' | 'fluid' | 'electrical' | 'chemical';
  equations: string[];
  parameters: Record<string, number>;
  boundaryConditions: Record<string, unknown>;
  materialProperties: Record<string, number>;
  solverConfig: { method: string; tolerance: number; maxIterations: number };
}

export interface BehavioralModel {
  id: string;
  paradigm: 'state_machine' | 'petri_net' | 'activity_diagram' | 'rule_based';
  states: string[];
  transitions: { from: string; to: string; condition: string; action: string }[];
  initialState: string;
  currentState: string;
  rules: { condition: string; action: string; priority: number }[];
}

export interface MultiDomainModel {
  id: string;
  domains: string[];
  couplings: { domainA: string; domainB: string; interface: string; variables: string[] }[];
  integratedSolvers: string[];
  coSimulationStrategy: string;
  timeStep: number;
}

export interface TwinModelingResult {
  geometricModels: GeometricModel[];
  physicalModels: PhysicalModel[];
  behavioralModels: BehavioralModel[];
  multiDomainModels: MultiDomainModel[];
  totalModels: number;
  modelQuality: number;
  validationStatus: 'pending' | 'validated' | 'failed';
}

export class TwinModeling {
  private _geometricModels: Map<string, GeometricModel> = new Map();
  private _physicalModels: Map<string, PhysicalModel> = new Map();
  private _behavioralModels: Map<string, BehavioralModel> = new Map();
  private _multiDomainModels: Map<string, MultiDomainModel> = new Map();
  private _counter: number = 0;
  private _modelRegistry: Map<string, { type: string; createdAt: number; lastModified: number }> = new Map();
  private _validationQueue: string[] = [];
  private _lastResult: TwinModelingResult | null = null;
  private _modelTemplates: Map<string, Record<string, unknown>> = new Map();
  private _materialLibrary: Map<string, Record<string, number>> = new Map();
  private _meshQualityMetrics: {
    aspectRatio: number;
    skewness: number;
    orthogonality: number;
    smoothness: number;
  } = {
    aspectRatio: 0,
    skewness: 0,
    orthogonality: 0,
    smoothness: 0,
  };

  constructor() {
    this._initMaterialLibrary();
    this._initModelTemplates();
  }

  private _initMaterialLibrary(): void {
    const materials = [
      { name: 'steel', properties: { density: 7850, youngsModulus: 200e9, poissonRatio: 0.3, thermalConductivity: 50, specificHeat: 450 } },
      { name: 'aluminum', properties: { density: 2700, youngsModulus: 70e9, poissonRatio: 0.33, thermalConductivity: 205, specificHeat: 900 } },
      { name: 'copper', properties: { density: 8960, youngsModulus: 110e9, poissonRatio: 0.34, thermalConductivity: 401, specificHeat: 385 } },
      { name: 'concrete', properties: { density: 2400, youngsModulus: 30e9, poissonRatio: 0.2, thermalConductivity: 1.5, specificHeat: 880 } },
      { name: 'glass', properties: { density: 2500, youngsModulus: 70e9, poissonRatio: 0.22, thermalConductivity: 1.0, specificHeat: 840 } },
      { name: 'rubber', properties: { density: 1100, youngsModulus: 0.01e9, poissonRatio: 0.49, thermalConductivity: 0.15, specificHeat: 2000 } },
      { name: 'plastic', properties: { density: 1050, youngsModulus: 2.5e9, poissonRatio: 0.35, thermalConductivity: 0.2, specificHeat: 1500 } },
      { name: 'titanium', properties: { density: 4506, youngsModulus: 116e9, poissonRatio: 0.32, thermalConductivity: 21.9, specificHeat: 520 } },
    ];
    materials.forEach(m => this._materialLibrary.set(m.name, m.properties as Record<string, number>));
  }

  private _initModelTemplates(): void {
    const templates = [
      {
        name: 'cantilever_beam',
        template: {
          type: 'mechanical',
          geometry: { shape: 'beam', length: 1.0, width: 0.1, height: 0.05 },
          boundaryConditions: { fixed: { face: 'end1' }, load: { face: 'end2', force: 1000 } },
          material: 'steel',
        },
      },
      {
        name: 'heat_exchanger',
        template: {
          type: 'thermal',
          geometry: { shape: 'cylinder', radius: 0.5, length: 2.0 },
          boundaryConditions: { inlet: { temperature: 350 }, outlet: { temperature: 300 } },
          material: 'copper',
        },
      },
      {
        name: 'pipe_flow',
        template: {
          type: 'fluid',
          geometry: { shape: 'pipe', diameter: 0.1, length: 10.0 },
          boundaryConditions: { inlet: { pressure: 100000, velocity: 1.0 }, outlet: { pressure: 50000 } },
          fluid: 'water',
        },
      },
      {
        name: 'electric_motor',
        template: {
          type: 'electrical',
          parameters: { voltage: 220, current: 10, frequency: 50, efficiency: 0.85 },
          cooling: 'air',
        },
      },
    ];
    templates.forEach(t => this._modelTemplates.set(t.name, t.template as Record<string, unknown>));
  }

  get geometricModels(): GeometricModel[] {
    return Array.from(this._geometricModels.values());
  }

  get physicalModels(): PhysicalModel[] {
    return Array.from(this._physicalModels.values());
  }

  get behavioralModels(): BehavioralModel[] {
    return Array.from(this._behavioralModels.values());
  }

  get multiDomainModels(): MultiDomainModel[] {
    return Array.from(this._multiDomainModels.values());
  }

  get totalModels(): number {
    return this._geometricModels.size + this._physicalModels.size + this._behavioralModels.size + this._multiDomainModels.size;
  }

  get modelRegistry(): Map<string, { type: string; createdAt: number; lastModified: number }> {
    return new Map(this._modelRegistry);
  }

  get meshQualityMetrics(): { aspectRatio: number; skewness: number; orthogonality: number; smoothness: number } {
    return { ...this._meshQualityMetrics };
  }

  createGeometricModel(
    type: 'cad' | 'mesh' | 'point_cloud' | 'parametric',
    params: {
      vertices?: number;
      faces?: number;
      precision?: number;
      format?: string;
      boundingBox?: { min: number[]; max: number[] };
      levelOfDetail?: number;
    } = {}
  ): GeometricModel {
    const id = `geo-${Date.now()}-${this._counter++}`;
    const model: GeometricModel = {
      id,
      type,
      vertices: params.vertices ?? 0,
      faces: params.faces ?? 0,
      precision: params.precision ?? 0.001,
      format: params.format ?? 'stl',
      boundingBox: params.boundingBox ?? { min: [0, 0, 0], max: [1, 1, 1] },
      levelOfDetail: params.levelOfDetail ?? 1,
    };
    this._geometricModels.set(id, model);
    this._modelRegistry.set(id, { type: 'geometric', createdAt: Date.now(), lastModified: Date.now() });
    this._updateMeshQualityMetrics();
    return model;
  }

  createPhysicalModel(
    domain: 'mechanical' | 'thermal' | 'fluid' | 'electrical' | 'chemical',
    params: {
      equations?: string[];
      parameters?: Record<string, number>;
      boundaryConditions?: Record<string, unknown>;
      materialProperties?: Record<string, number>;
      solverConfig?: { method: string; tolerance: number; maxIterations: number };
    } = {}
  ): PhysicalModel {
    const id = `phys-${Date.now()}-${this._counter++}`;
    const model: PhysicalModel = {
      id,
      domain,
      equations: params.equations ?? [],
      parameters: params.parameters ?? {},
      boundaryConditions: params.boundaryConditions ?? {},
      materialProperties: params.materialProperties ?? this._materialLibrary.get('steel') ?? {},
      solverConfig: params.solverConfig ?? { method: 'finite_element', tolerance: 1e-6, maxIterations: 1000 },
    };
    this._physicalModels.set(id, model);
    this._modelRegistry.set(id, { type: 'physical', createdAt: Date.now(), lastModified: Date.now() });
    return model;
  }

  createBehavioralModel(
    paradigm: 'state_machine' | 'petri_net' | 'activity_diagram' | 'rule_based',
    params: {
      states?: string[];
      transitions?: { from: string; to: string; condition: string; action: string }[];
      initialState?: string;
      rules?: { condition: string; action: string; priority: number }[];
    } = {}
  ): BehavioralModel {
    const id = `behav-${Date.now()}-${this._counter++}`;
    const states = params.states ?? ['idle', 'running', 'stopped', 'error'];
    const initialState = params.initialState ?? states[0];
    const model: BehavioralModel = {
      id,
      paradigm,
      states,
      transitions: params.transitions ?? [],
      initialState,
      currentState: initialState,
      rules: params.rules ?? [],
    };
    this._behavioralModels.set(id, model);
    this._modelRegistry.set(id, { type: 'behavioral', createdAt: Date.now(), lastModified: Date.now() });
    return model;
  }

  createMultiDomainModel(
    domains: string[],
    params: {
      couplings?: { domainA: string; domainB: string; interface: string; variables: string[] }[];
      integratedSolvers?: string[];
      coSimulationStrategy?: string;
      timeStep?: number;
    } = {}
  ): MultiDomainModel {
    const id = `multi-${Date.now()}-${this._counter++}`;
    const model: MultiDomainModel = {
      id,
      domains,
      couplings: params.couplings ?? [],
      integratedSolvers: params.integratedSolvers ?? [],
      coSimulationStrategy: params.coSimulationStrategy ?? 'jacobi',
      timeStep: params.timeStep ?? 0.001,
    };
    this._multiDomainModels.set(id, model);
    this._modelRegistry.set(id, { type: 'multiDomain', createdAt: Date.now(), lastModified: Date.now() });
    return model;
  }

  generateParametricGeometry(
    baseShape: string,
    parameters: Record<string, number>
  ): GeometricModel {
    const vertices = Math.floor(parameters.resolution ?? 100) * Math.floor(parameters.resolution ?? 100);
    const faces = vertices * 2;
    const boundingBox = {
      min: [0, 0, 0],
      max: [parameters.length ?? 1, parameters.width ?? 1, parameters.height ?? 1],
    };
    return this.createGeometricModel('parametric', {
      vertices,
      faces,
      precision: parameters.precision ?? 0.001,
      format: 'parametric',
      boundingBox,
      levelOfDetail: parameters.lod ?? 1,
    });
  }

  refineMesh(modelId: string, targetResolution: number): GeometricModel | null {
    const model = this._geometricModels.get(modelId);
    if (!model) return null;
    const refined: GeometricModel = {
      ...model,
      vertices: model.vertices * targetResolution,
      faces: model.faces * targetResolution,
      levelOfDetail: model.levelOfDetail + 1,
    };
    this._geometricModels.set(modelId, refined);
    this._updateModelRegistry(modelId);
    this._updateMeshQualityMetrics();
    return refined;
  }

  simplifyMesh(modelId: string, reductionRatio: number): GeometricModel | null {
    const model = this._geometricModels.get(modelId);
    if (!model || reductionRatio <= 0 || reductionRatio >= 1) return null;
    const simplified: GeometricModel = {
      ...model,
      vertices: Math.floor(model.vertices * (1 - reductionRatio)),
      faces: Math.floor(model.faces * (1 - reductionRatio)),
      levelOfDetail: Math.max(1, model.levelOfDetail - 1),
    };
    this._geometricModels.set(modelId, simplified);
    this._updateModelRegistry(modelId);
    this._updateMeshQualityMetrics();
    return simplified;
  }

  addPhysicalEquation(modelId: string, equation: string): boolean {
    const model = this._physicalModels.get(modelId);
    if (!model) return false;
    model.equations.push(equation);
    this._updateModelRegistry(modelId);
    return true;
  }

  setPhysicalParameter(modelId: string, name: string, value: number): boolean {
    const model = this._physicalModels.get(modelId);
    if (!model) return false;
    model.parameters[name] = value;
    this._updateModelRegistry(modelId);
    return true;
  }

  setMaterial(modelId: string, materialName: string): boolean {
    const model = this._physicalModels.get(modelId);
    const material = this._materialLibrary.get(materialName);
    if (!model || !material) return false;
    model.materialProperties = { ...material };
    this._updateModelRegistry(modelId);
    return true;
  }

  addBehavioralState(modelId: string, state: string): boolean {
    const model = this._behavioralModels.get(modelId);
    if (!model || model.states.includes(state)) return false;
    model.states.push(state);
    this._updateModelRegistry(modelId);
    return true;
  }

  addStateTransition(
    modelId: string,
    from: string,
    to: string,
    condition: string,
    action: string
  ): boolean {
    const model = this._behavioralModels.get(modelId);
    if (!model || !model.states.includes(from) || !model.states.includes(to)) return false;
    model.transitions.push({ from, to, condition, action });
    this._updateModelRegistry(modelId);
    return true;
  }

  addBehaviorRule(
    modelId: string,
    condition: string,
    action: string,
    priority: number = 0
  ): boolean {
    const model = this._behavioralModels.get(modelId);
    if (!model) return false;
    model.rules.push({ condition, action, priority });
    model.rules.sort((a, b) => b.priority - a.priority);
    this._updateModelRegistry(modelId);
    return true;
  }

  addDomainCoupling(
    modelId: string,
    domainA: string,
    domainB: string,
    interface_: string,
    variables: string[]
  ): boolean {
    const model = this._multiDomainModels.get(modelId);
    if (!model || !model.domains.includes(domainA) || !model.domains.includes(domainB)) return false;
    model.couplings.push({ domainA, domainB, interface: interface_, variables });
    this._updateModelRegistry(modelId);
    return true;
  }

  validateModel(modelId: string): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (this._geometricModels.has(modelId)) {
      const model = this._geometricModels.get(modelId)!;
      if (model.vertices === 0) warnings.push('Geometric model has no vertices');
      if (model.faces === 0) warnings.push('Geometric model has no faces');
      if (model.precision <= 0) errors.push('Precision must be positive');
      if (model.boundingBox.min.length !== 3 || model.boundingBox.max.length !== 3) {
        errors.push('Bounding box must have 3 dimensions');
      }
    } else if (this._physicalModels.has(modelId)) {
      const model = this._physicalModels.get(modelId)!;
      if (model.equations.length === 0) warnings.push('No equations defined');
      if (Object.keys(model.parameters).length === 0) warnings.push('No parameters defined');
      if (model.solverConfig.tolerance <= 0) errors.push('Solver tolerance must be positive');
      if (model.solverConfig.maxIterations <= 0) errors.push('Max iterations must be positive');
    } else if (this._behavioralModels.has(modelId)) {
      const model = this._behavioralModels.get(modelId)!;
      if (model.states.length === 0) errors.push('No states defined');
      if (!model.states.includes(model.initialState)) errors.push('Initial state not in state list');
      if (!model.states.includes(model.currentState)) errors.push('Current state not in state list');
      for (const t of model.transitions) {
        if (!model.states.includes(t.from)) errors.push(`Transition from invalid state: ${t.from}`);
        if (!model.states.includes(t.to)) errors.push(`Transition to invalid state: ${t.to}`);
      }
    } else if (this._multiDomainModels.has(modelId)) {
      const model = this._multiDomainModels.get(modelId)!;
      if (model.domains.length < 2) warnings.push('Multi-domain model should have at least 2 domains');
      if (model.timeStep <= 0) errors.push('Time step must be positive');
    } else {
      errors.push(`Model not found: ${modelId}`);
    }

    const valid = errors.length === 0;
    return { valid, errors, warnings };
  }

  queueValidation(modelId: string): boolean {
    if (!this._modelRegistry.has(modelId)) return false;
    if (!this._validationQueue.includes(modelId)) {
      this._validationQueue.push(modelId);
    }
    return true;
  }

  processValidationQueue(): { validated: number; passed: number; failed: number } {
    let passed = 0;
    let failed = 0;
    const toProcess = [...this._validationQueue];
    this._validationQueue = [];

    for (const modelId of toProcess) {
      const result = this.validateModel(modelId);
      if (result.valid) passed++;
      else failed++;
    }

    return { validated: toProcess.length, passed, failed };
  }

  getTemplateNames(): string[] {
    return Array.from(this._modelTemplates.keys());
  }

  getMaterialNames(): string[] {
    return Array.from(this._materialLibrary.keys());
  }

  getModelTemplate(name: string): Record<string, unknown> | null {
    return this._modelTemplates.get(name) ?? null;
  }

  getMaterialProperties(materialName: string): Record<string, number> | null {
    return this._materialLibrary.get(materialName) ?? null;
  }

  private _updateModelRegistry(modelId: string): void {
    const entry = this._modelRegistry.get(modelId);
    if (entry) {
      entry.lastModified = Date.now();
    }
  }

  private _updateMeshQualityMetrics(): void {
    const models = Array.from(this._geometricModels.values());
    if (models.length === 0) {
      this._meshQualityMetrics = { aspectRatio: 0, skewness: 0, orthogonality: 0, smoothness: 0 };
      return;
    }
    let totalAR = 0;
    let totalSkew = 0;
    let totalOrth = 0;
    let totalSmooth = 0;
    for (const model of models) {
      const quality = model.levelOfDetail * 0.15 + 0.7;
      totalAR += quality;
      totalSkew += quality + 0.05;
      totalOrth += quality - 0.05;
      totalSmooth += quality + 0.02;
    }
    this._meshQualityMetrics = {
      aspectRatio: Math.min(1, totalAR / models.length),
      skewness: Math.min(1, totalSkew / models.length),
      orthogonality: Math.min(1, totalOrth / models.length),
      smoothness: Math.min(1, totalSmooth / models.length),
    };
  }

  toPacket(): DataPacket<TwinModelingResult> {
    const result: TwinModelingResult = {
      geometricModels: Array.from(this._geometricModels.values()),
      physicalModels: Array.from(this._physicalModels.values()),
      behavioralModels: Array.from(this._behavioralModels.values()),
      multiDomainModels: Array.from(this._multiDomainModels.values()),
      totalModels: this.totalModels,
      modelQuality: (this._meshQualityMetrics.aspectRatio + this._meshQualityMetrics.orthogonality) / 2,
      validationStatus: this._validationQueue.length === 0 ? 'validated' : 'pending',
    };
    this._lastResult = result;
    this._counter++;
    return {
      id: `twin-modeling-${Date.now()}-${this._counter}`,
      payload: result,
      metadata: {
        createdAt: Date.now(),
        route: ['digital_twin', 'twin_modeling'],
        priority: 1,
        phase: 'modeling',
      },
    };
  }

  reset(): void {
    this._geometricModels.clear();
    this._physicalModels.clear();
    this._behavioralModels.clear();
    this._multiDomainModels.clear();
    this._counter = 0;
    this._modelRegistry.clear();
    this._validationQueue = [];
    this._lastResult = null;
    this._meshQualityMetrics = {
      aspectRatio: 0,
      skewness: 0,
      orthogonality: 0,
      smoothness: 0,
    };
  }
}
