import { DataPacket } from '../shared/types';

export interface GeometryModel {
  id: string;
  type: 'mesh' | 'parametric' | 'volumetric' | 'point-cloud' | 'surface' | 'solid';
  vertices: number[][];
  faces: number[][];
  normals: number[][];
  uvs: number[][];
  boundingBox: { min: number[]; max: number[] };
  lodLevels: number;
  metadata: Record<string, unknown>;
}

export interface BehaviorModel {
  id: string;
  type: 'finite-state' | 'agent-based' | 'system-dynamics' | 'discrete-event' | 'continuous' | 'hybrid';
  states: string[];
  transitions: { from: string; to: string; condition: string; probability: number }[];
  parameters: Record<string, number>;
  initialState: string;
  timeStep: number;
  metadata: Record<string, unknown>;
}

export interface SimulationParameter {
  name: string;
  value: number | string | boolean | number[];
  unit: string;
  min: number;
  max: number;
  step: number;
  description: string;
  category: string;
  isConstant: boolean;
}

export interface TwinModelingResult {
  geometryModels: GeometryModel[];
  behaviorModels: BehaviorModel[];
  parameters: SimulationParameter[];
  timestamp: number;
  version: string;
  validationStatus: 'valid' | 'invalid' | 'warning';
  errors: string[];
  warnings: string[];
  performanceMetrics: Record<string, number>;
}

export interface ModelConstraint {
  id: string;
  type: 'geometric' | 'physical' | 'logical' | 'temporal' | 'spatial';
  description: string;
  expression: string;
  priority: number;
  isHard: boolean;
}

export interface ModelValidationRule {
  id: string;
  name: string;
  check: (model: GeometryModel | BehaviorModel) => boolean;
  errorMessage: string;
  severity: 'error' | 'warning' | 'info';
}

export interface ModelVersion {
  version: string;
  createdAt: number;
  author: string;
  changelog: string;
  parentVersion: string | null;
  checksum: string;
}

export interface ModelTemplate {
  id: string;
  name: string;
  category: string;
  geometryTemplate: Partial<GeometryModel>;
  behaviorTemplate: Partial<BehaviorModel>;
  defaultParameters: SimulationParameter[];
  tags: string[];
}

export class TwinModeling {
  private _geometryModels: Map<string, GeometryModel> = new Map();
  private _behaviorModels: Map<string, BehaviorModel> = new Map();
  private _parameters: Map<string, SimulationParameter> = new Map();
  private _constraints: Map<string, ModelConstraint> = new Map();
  private _validationRules: ModelValidationRule[] = [];
  private _modelVersions: Map<string, ModelVersion[]> = new Map();
  private _templates: Map<string, ModelTemplate> = new Map();
  private _lastResult: TwinModelingResult | null = null;
  private _counter: number = 0;
  private _version: string = '1.0.0';
  private _undoStack: { action: string; data: unknown }[] = [];
  private _redoStack: { action: string; data: unknown }[] = [];
  private _autoValidate: boolean = true;
  private _unitSystem: string = 'SI';
  private _snapTolerance: number = 0.001;
  private _maxUndoSteps: number = 50;
  private _parameterPresets: Map<string, Map<string, SimulationParameter[]>> = new Map();
  private _modelRelationships: Map<string, string[]> = new Map();
  private _performanceLog: { timestamp: number; operation: string; duration: number }[] = [];
  private _changeListeners: ((event: string, modelId: string) => void)[] = [];

  constructor() {
    this._initDefaultValidationRules();
    this._initDefaultTemplates();
  }

  private _initDefaultValidationRules(): void {
    this._validationRules.push({
      id: 'geo-non-empty',
      name: 'Geometry Non-Empty',
      check: (model) => {
        if (model.type && ['mesh', 'point-cloud', 'surface', 'solid'].includes(model.type as string)) {
          const geo = model as GeometryModel;
          return geo.vertices.length > 0;
        }
        return true;
      },
      errorMessage: 'Geometry model must have at least one vertex',
      severity: 'error'
    });

    this._validationRules.push({
      id: 'geo-valid-faces',
      name: 'Valid Face Indices',
      check: (model) => {
        if (model.type === 'mesh') {
          const geo = model as GeometryModel;
          const vertexCount = geo.vertices.length;
          return geo.faces.every(face => face.every(idx => idx >= 0 && idx < vertexCount));
        }
        return true;
      },
      errorMessage: 'Face indices must reference valid vertices',
      severity: 'error'
    });

    this._validationRules.push({
      id: 'beh-initial-state',
      name: 'Initial State Defined',
      check: (model) => {
        if (model.type && ['finite-state', 'hybrid'].includes(model.type as string)) {
          const beh = model as BehaviorModel;
          return beh.states.includes(beh.initialState);
        }
        return true;
      },
      errorMessage: 'Initial state must be defined in states list',
      severity: 'error'
    });

    this._validationRules.push({
      id: 'beh-positive-timestep',
      name: 'Positive Time Step',
      check: (model) => {
        if (model.type && ['continuous', 'system-dynamics', 'hybrid'].includes(model.type as string)) {
          const beh = model as BehaviorModel;
          return beh.timeStep > 0;
        }
        return true;
      },
      errorMessage: 'Time step must be positive',
      severity: 'error'
    });

    this._validationRules.push({
      id: 'geo-bounding-box',
      name: 'Bounding Box Valid',
      check: (model) => {
        if (model.type && ['mesh', 'point-cloud', 'surface', 'solid', 'volumetric'].includes(model.type as string)) {
          const geo = model as GeometryModel;
          return geo.boundingBox.min.length === 3 && geo.boundingBox.max.length === 3;
        }
        return true;
      },
      errorMessage: 'Bounding box must have 3D min and max arrays',
      severity: 'warning'
    });
  }

  private _initDefaultTemplates(): void {
    this._templates.set('cube-mesh', {
      id: 'cube-mesh',
      name: 'Cube Mesh',
      category: 'basic-geometry',
      geometryTemplate: {
        type: 'mesh',
        vertices: [],
        faces: [],
        normals: [],
        uvs: [],
        boundingBox: { min: [-0.5, -0.5, -0.5], max: [0.5, 0.5, 0.5] },
        lodLevels: 3,
        metadata: {}
      },
      behaviorTemplate: {},
      defaultParameters: [
        { name: 'width', value: 1, unit: 'm', min: 0.001, max: 1000, step: 0.001, description: 'Cube width', category: 'dimension', isConstant: false },
        { name: 'height', value: 1, unit: 'm', min: 0.001, max: 1000, step: 0.001, description: 'Cube height', category: 'dimension', isConstant: false },
        { name: 'depth', value: 1, unit: 'm', min: 0.001, max: 1000, step: 0.001, description: 'Cube depth', category: 'dimension', isConstant: false }
      ],
      tags: ['geometry', 'primitive', 'cube']
    });

    this._templates.set('fsm-behavior', {
      id: 'fsm-behavior',
      name: 'Finite State Machine',
      category: 'behavior',
      geometryTemplate: {},
      behaviorTemplate: {
        type: 'finite-state',
        states: ['idle', 'active', 'error'],
        transitions: [
          { from: 'idle', to: 'active', condition: 'startSignal', probability: 1.0 },
          { from: 'active', to: 'idle', condition: 'stopSignal', probability: 1.0 },
          { from: 'active', to: 'error', condition: 'faultDetected', probability: 0.01 }
        ],
        parameters: {},
        initialState: 'idle',
        timeStep: 1,
        metadata: {}
      },
      defaultParameters: [
        { name: 'transitionDelay', value: 0, unit: 's', min: 0, max: 3600, step: 0.1, description: 'State transition delay', category: 'timing', isConstant: false }
      ],
      tags: ['behavior', 'fsm', 'control']
    });

    this._templates.set('particle-system', {
      id: 'particle-system',
      name: 'Particle System',
      category: 'effects',
      geometryTemplate: {
        type: 'point-cloud',
        vertices: [],
        faces: [],
        normals: [],
        uvs: [],
        boundingBox: { min: [0, 0, 0], max: [10, 10, 10] },
        lodLevels: 1,
        metadata: { maxParticles: 10000 }
      },
      behaviorTemplate: {
        type: 'continuous',
        states: ['emitting', 'paused', 'stopped'],
        transitions: [],
        parameters: { gravity: -9.81, drag: 0.1 },
        initialState: 'emitting',
        timeStep: 0.016,
        metadata: {}
      },
      defaultParameters: [
        { name: 'emissionRate', value: 100, unit: 'particles/s', min: 0, max: 100000, step: 1, description: 'Particles emitted per second', category: 'emission', isConstant: false },
        { name: 'lifetime', value: 2, unit: 's', min: 0.01, max: 60, step: 0.01, description: 'Particle lifetime', category: 'emission', isConstant: false },
        { name: 'velocity', value: [0, 5, 0], unit: 'm/s', min: -100, max: 100, step: 0.1, description: 'Initial velocity', category: 'dynamics', isConstant: false }
      ],
      tags: ['particles', 'effects', 'simulation']
    });
  }

  get geometryModels(): Map<string, GeometryModel> {
    return new Map(this._geometryModels);
  }

  get behaviorModels(): Map<string, BehaviorModel> {
    return new Map(this._behaviorModels);
  }

  get parameters(): Map<string, SimulationParameter> {
    return new Map(this._parameters);
  }

  get constraints(): Map<string, ModelConstraint> {
    return new Map(this._constraints);
  }

  get templates(): Map<string, ModelTemplate> {
    return new Map(this._templates);
  }

  get lastResult(): TwinModelingResult | null {
    return this._lastResult;
  }

  get version(): string {
    return this._version;
  }

  get autoValidate(): boolean {
    return this._autoValidate;
  }

  get unitSystem(): string {
    return this._unitSystem;
  }

  get modelCount(): number {
    return this._geometryModels.size + this._behaviorModels.size;
  }

  get parameterCount(): number {
    return this._parameters.size;
  }

  get constraintCount(): number {
    return this._constraints.size;
  }

  get undoStackSize(): number {
    return this._undoStack.length;
  }

  setAutoValidate(value: boolean): void {
    this._autoValidate = value;
  }

  setUnitSystem(system: string): void {
    this._unitSystem = system;
  }

  setSnapTolerance(tolerance: number): void {
    this._snapTolerance = tolerance;
  }

  addGeometryModel(model: GeometryModel): void {
    this._pushUndo('add-geometry', { id: model.id, model });
    this._geometryModels.set(model.id, model);
    this._addVersion(model.id, `Added geometry model ${model.id}`);
    if (this._autoValidate) {
      this.validateModel(model);
    }
    this._notifyListeners('geometry-added', model.id);
  }

  addBehaviorModel(model: BehaviorModel): void {
    this._pushUndo('add-behavior', { id: model.id, model });
    this._behaviorModels.set(model.id, model);
    this._addVersion(model.id, `Added behavior model ${model.id}`);
    if (this._autoValidate) {
      this.validateModel(model);
    }
    this._notifyListeners('behavior-added', model.id);
  }

  removeGeometryModel(id: string): boolean {
    const model = this._geometryModels.get(id);
    if (!model) return false;
    this._pushUndo('remove-geometry', { id, model });
    this._geometryModels.delete(id);
    this._modelRelationships.delete(id);
    this._notifyListeners('geometry-removed', id);
    return true;
  }

  removeBehaviorModel(id: string): boolean {
    const model = this._behaviorModels.get(id);
    if (!model) return false;
    this._pushUndo('remove-behavior', { id, model });
    this._behaviorModels.delete(id);
    this._modelRelationships.delete(id);
    this._notifyListeners('behavior-removed', id);
    return true;
  }

  updateGeometryModel(id: string, updates: Partial<GeometryModel>): boolean {
    const model = this._geometryModels.get(id);
    if (!model) return false;
    this._pushUndo('update-geometry', { id, oldModel: { ...model } });
    const updated = { ...model, ...updates, id } as GeometryModel;
    this._geometryModels.set(id, updated);
    this._addVersion(id, `Updated geometry model ${id}`);
    if (this._autoValidate) {
      this.validateModel(updated);
    }
    this._notifyListeners('geometry-updated', id);
    return true;
  }

  updateBehaviorModel(id: string, updates: Partial<BehaviorModel>): boolean {
    const model = this._behaviorModels.get(id);
    if (!model) return false;
    this._pushUndo('update-behavior', { id, oldModel: { ...model } });
    const updated = { ...model, ...updates, id } as BehaviorModel;
    this._behaviorModels.set(id, updated);
    this._addVersion(id, `Updated behavior model ${id}`);
    if (this._autoValidate) {
      this.validateModel(updated);
    }
    this._notifyListeners('behavior-updated', id);
    return true;
  }

  addParameter(parameter: SimulationParameter): void {
    this._parameters.set(parameter.name, parameter);
  }

  removeParameter(name: string): boolean {
    return this._parameters.delete(name);
  }

  updateParameter(name: string, updates: Partial<SimulationParameter>): boolean {
    const param = this._parameters.get(name);
    if (!param) return false;
    this._parameters.set(name, { ...param, ...updates, name });
    return true;
  }

  addConstraint(constraint: ModelConstraint): void {
    this._constraints.set(constraint.id, constraint);
  }

  removeConstraint(id: string): boolean {
    return this._constraints.delete(id);
  }

  validateModel(model: GeometryModel | BehaviorModel): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const rule of this._validationRules) {
      const passed = rule.check(model);
      if (!passed) {
        if (rule.severity === 'error') {
          errors.push(rule.errorMessage);
        } else if (rule.severity === 'warning') {
          warnings.push(rule.errorMessage);
        }
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  validateAll(): { valid: boolean; errors: string[]; warnings: string[] } {
    const allErrors: string[] = [];
    const allWarnings: string[] = [];
    let valid = true;

    for (const model of this._geometryModels.values()) {
      const result = this.validateModel(model);
      if (!result.valid) valid = false;
      allErrors.push(...result.errors.map(e => `[Geometry ${model.id}] ${e}`));
      allWarnings.push(...result.warnings.map(w => `[Geometry ${model.id}] ${w}`));
    }

    for (const model of this._behaviorModels.values()) {
      const result = this.validateModel(model);
      if (!result.valid) valid = false;
      allErrors.push(...result.errors.map(e => `[Behavior ${model.id}] ${e}`));
      allWarnings.push(...result.warnings.map(w => `[Behavior ${model.id}] ${w}`));
    }

    return { valid, errors: allErrors, warnings: allWarnings };
  }

  addValidationRule(rule: ModelValidationRule): void {
    this._validationRules.push(rule);
  }

  removeValidationRule(id: string): boolean {
    const idx = this._validationRules.findIndex(r => r.id === id);
    if (idx >= 0) {
      this._validationRules.splice(idx, 1);
      return true;
    }
    return false;
  }

  setModelRelationship(sourceId: string, targetIds: string[]): void {
    this._modelRelationships.set(sourceId, [...targetIds]);
  }

  getModelRelationships(sourceId: string): string[] {
    return this._modelRelationships.get(sourceId) || [];
  }

  computeBoundingBox(modelId: string): { min: number[]; max: number[] } | null {
    const model = this._geometryModels.get(modelId);
    if (!model) return null;
    if (model.vertices.length === 0) return { min: [0, 0, 0], max: [0, 0, 0] };

    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];

    for (const vertex of model.vertices) {
      for (let i = 0; i < 3; i++) {
        if (vertex[i] < min[i]) min[i] = vertex[i];
        if (vertex[i] > max[i]) max[i] = vertex[i];
      }
    }

    return { min, max };
  }

  computeModelVolume(modelId: string): number {
    const model = this._geometryModels.get(modelId);
    if (!model || model.type !== 'mesh') return 0;

    let volume = 0;
    for (const face of model.faces) {
      if (face.length >= 3) {
        const v0 = model.vertices[face[0]];
        const v1 = model.vertices[face[1]];
        const v2 = model.vertices[face[2]];
        if (v0 && v1 && v2) {
          const cross = [
            v1[1] * v2[2] - v1[2] * v2[1],
            v1[2] * v2[0] - v1[0] * v2[2],
            v1[0] * v2[1] - v1[1] * v2[0]
          ];
          volume += Math.abs(v0[0] * cross[0] + v0[1] * cross[1] + v0[2] * cross[2]) / 6;
        }
      }
    }
    return volume;
  }

  generateFromTemplate(templateId: string, overrides?: Partial<ModelTemplate>): { geometry?: GeometryModel; behavior?: BehaviorModel } | null {
    const template = this._templates.get(templateId);
    if (!template) return null;

    const result: { geometry?: GeometryModel; behavior?: BehaviorModel } = {};
    const id = `${templateId}-${Date.now()}`;

    if (template.geometryTemplate.type) {
      result.geometry = {
        ...template.geometryTemplate,
        id,
        metadata: { ...template.geometryTemplate.metadata, templateId }
      } as GeometryModel;
    }

    if (template.behaviorTemplate.type) {
      result.behavior = {
        ...template.behaviorTemplate,
        id,
        metadata: { ...template.behaviorTemplate.metadata, templateId }
      } as BehaviorModel;
    }

    if (overrides?.defaultParameters) {
      for (const param of overrides.defaultParameters) {
        this.addParameter(param);
      }
    } else {
      for (const param of template.defaultParameters) {
        this.addParameter({ ...param });
      }
    }

    return result;
  }

  addTemplate(template: ModelTemplate): void {
    this._templates.set(template.id, template);
  }

  removeTemplate(id: string): boolean {
    return this._templates.delete(id);
  }

  cloneModel(modelId: string, newId: string): GeometryModel | BehaviorModel | null {
    const geo = this._geometryModels.get(modelId);
    if (geo) {
      const cloned = { ...geo, id: newId, metadata: { ...geo.metadata, clonedFrom: modelId } };
      this.addGeometryModel(cloned);
      return cloned;
    }

    const beh = this._behaviorModels.get(modelId);
    if (beh) {
      const cloned = { ...beh, id: newId, metadata: { ...beh.metadata, clonedFrom: modelId } };
      this.addBehaviorModel(cloned);
      return cloned;
    }

    return null;
  }

  mergeModels(sourceIds: string[], targetId: string): GeometryModel | null {
    const geometries = sourceIds.map(id => this._geometryModels.get(id)).filter(Boolean) as GeometryModel[];
    if (geometries.length === 0) return null;

    const merged: GeometryModel = {
      id: targetId,
      type: 'mesh',
      vertices: [],
      faces: [],
      normals: [],
      uvs: [],
      boundingBox: { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] },
      lodLevels: Math.max(...geometries.map(g => g.lodLevels)),
      metadata: { mergedFrom: sourceIds }
    };

    let vertexOffset = 0;
    for (const geo of geometries) {
      merged.vertices.push(...geo.vertices);
      merged.faces.push(...geo.faces.map(face => face.map(idx => idx + vertexOffset)));
      merged.normals.push(...geo.normals);
      merged.uvs.push(...geo.uvs);
      vertexOffset += geo.vertices.length;

      for (let i = 0; i < 3; i++) {
        if (geo.boundingBox.min[i] < merged.boundingBox.min[i]) merged.boundingBox.min[i] = geo.boundingBox.min[i];
        if (geo.boundingBox.max[i] > merged.boundingBox.max[i]) merged.boundingBox.max[i] = geo.boundingBox.max[i];
      }
    }

    this.addGeometryModel(merged);
    return merged;
  }

  exportModel(modelId: string): string {
    const geo = this._geometryModels.get(modelId);
    if (geo) return JSON.stringify(geo, null, 2);
    const beh = this._behaviorModels.get(modelId);
    if (beh) return JSON.stringify(beh, null, 2);
    return '';
  }

  importModel(json: string): GeometryModel | BehaviorModel | null {
    try {
      const data = JSON.parse(json);
      if (data.vertices) {
        this.addGeometryModel(data as GeometryModel);
        return data as GeometryModel;
      } else if (data.states) {
        this.addBehaviorModel(data as BehaviorModel);
        return data as BehaviorModel;
      }
    } catch {
      return null;
    }
    return null;
  }

  undo(): boolean {
    if (this._undoStack.length === 0) return false;
    const action = this._undoStack.pop()!;
    this._redoStack.push(action);

    switch (action.action) {
      case 'add-geometry':
        this._geometryModels.delete((action.data as { id: string }).id);
        break;
      case 'add-behavior':
        this._behaviorModels.delete((action.data as { id: string }).id);
        break;
      case 'remove-geometry':
        this._geometryModels.set((action.data as { id: string }).id, (action.data as { model: GeometryModel }).model);
        break;
      case 'remove-behavior':
        this._behaviorModels.set((action.data as { id: string }).id, (action.data as { model: BehaviorModel }).model);
        break;
    }

    return true;
  }

  redo(): boolean {
    if (this._redoStack.length === 0) return false;
    const action = this._redoStack.pop()!;
    this._undoStack.push(action);
    return true;
  }

  private _pushUndo(action: string, data: unknown): void {
    this._undoStack.push({ action, data });
    if (this._undoStack.length > this._maxUndoSteps) {
      this._undoStack.shift();
    }
    this._redoStack = [];
  }

  private _addVersion(modelId: string, changelog: string): void {
    const versions = this._modelVersions.get(modelId) || [];
    versions.push({
      version: `${this._version}.${versions.length}`,
      createdAt: Date.now(),
      author: 'system',
      changelog,
      parentVersion: versions.length > 0 ? versions[versions.length - 1].version : null,
      checksum: `${modelId}-${Date.now()}`
    });
    this._modelVersions.set(modelId, versions);
  }

  getModelVersions(modelId: string): ModelVersion[] {
    return this._modelVersions.get(modelId) || [];
  }

  addChangeListener(listener: (event: string, modelId: string) => void): void {
    this._changeListeners.push(listener);
  }

  removeChangeListener(listener: (event: string, modelId: string) => void): void {
    const idx = this._changeListeners.indexOf(listener);
    if (idx >= 0) this._changeListeners.splice(idx, 1);
  }

  private _notifyListeners(event: string, modelId: string): void {
    for (const listener of this._changeListeners) {
      listener(event, modelId);
    }
  }

  logPerformance(operation: string, duration: number): void {
    this._performanceLog.push({ timestamp: Date.now(), operation, duration });
    if (this._performanceLog.length > 1000) {
      this._performanceLog.shift();
    }
  }

  getPerformanceLog(): { timestamp: number; operation: string; duration: number }[] {
    return [...this._performanceLog];
  }

  getAveragePerformance(operation: string): number {
    const entries = this._performanceLog.filter(p => p.operation === operation);
    if (entries.length === 0) return 0;
    return entries.reduce((sum, p) => sum + p.duration, 0) / entries.length;
  }

  saveParameterPreset(name: string, params: SimulationParameter[]): void {
    const presetMap = new Map<string, SimulationParameter[]>();
    for (const param of params) {
      presetMap.set(param.name, [{ ...param }]);
    }
    this._parameterPresets.set(name, presetMap);
  }

  loadParameterPreset(name: string): SimulationParameter[] | null {
    const preset = this._parameterPresets.get(name);
    if (!preset) return null;
    const result: SimulationParameter[] = [];
    for (const params of preset.values()) {
      result.push(...params);
    }
    return result;
  }

  removeParameterPreset(name: string): boolean {
    return this._parameterPresets.delete(name);
  }

  getParameterPresetNames(): string[] {
    return Array.from(this._parameterPresets.keys());
  }

  process(): TwinModelingResult {
    const startTime = Date.now();
    const validation = this.validateAll();

    const result: TwinModelingResult = {
      geometryModels: Array.from(this._geometryModels.values()),
      behaviorModels: Array.from(this._behaviorModels.values()),
      parameters: Array.from(this._parameters.values()),
      timestamp: Date.now(),
      version: this._version,
      validationStatus: validation.valid ? 'valid' : 'invalid',
      errors: validation.errors,
      warnings: validation.warnings,
      performanceMetrics: {
        geometryCount: this._geometryModels.size,
        behaviorCount: this._behaviorModels.size,
        parameterCount: this._parameters.size,
        constraintCount: this._constraints.size,
        processingTime: Date.now() - startTime,
        totalVertices: Array.from(this._geometryModels.values()).reduce((sum, g) => sum + g.vertices.length, 0),
        totalFaces: Array.from(this._geometryModels.values()).reduce((sum, g) => sum + g.faces.length, 0)
      }
    };

    this._lastResult = result;
    this._counter++;
    this.logPerformance('process', result.performanceMetrics.processingTime as number);
    return result;
  }

  toPacket(): DataPacket<TwinModelingResult> {
    const result = this._lastResult || {
      geometryModels: [],
      behaviorModels: [],
      parameters: [],
      timestamp: Date.now(),
      version: this._version,
      validationStatus: 'valid',
      errors: [],
      warnings: [],
      performanceMetrics: {}
    };
    this._counter++;
    return {
      id: `twin-modeling-${Date.now()}-${this._counter}`,
      payload: result,
      metadata: {
        createdAt: Date.now(),
        route: ['digital-twin', 'twin-modeling'],
        priority: 1,
        phase: 'modeling'
      }
    };
  }

  reset(): void {
    this._geometryModels.clear();
    this._behaviorModels.clear();
    this._parameters.clear();
    this._constraints.clear();
    this._validationRules = [];
    this._modelVersions.clear();
    this._templates.clear();
    this._lastResult = null;
    this._counter = 0;
    this._version = '1.0.0';
    this._undoStack = [];
    this._redoStack = [];
    this._autoValidate = true;
    this._unitSystem = 'SI';
    this._snapTolerance = 0.001;
    this._parameterPresets.clear();
    this._modelRelationships.clear();
    this._performanceLog = [];
    this._changeListeners = [];
    this._initDefaultValidationRules();
    this._initDefaultTemplates();
  }
}
