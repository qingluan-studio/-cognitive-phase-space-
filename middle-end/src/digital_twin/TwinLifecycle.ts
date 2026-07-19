import { DataPacket } from '../shared/types';

export interface TwinVersion {
  version: string;
  major: number;
  minor: number;
  patch: number;
  createdAt: number;
  createdBy: string;
  description: string;
  changes: string[];
  status: 'draft' | 'testing' | 'stable' | 'deprecated';
  tags: string[];
}

export interface TwinDeployment {
  id: string;
  twinId: string;
  version: string;
  environment: 'development' | 'staging' | 'production';
  status: 'pending' | 'deploying' | 'deployed' | 'failed' | 'rollback';
  deployedAt: number;
  deployedBy: string;
  targetSystem: string;
  configuration: Record<string, unknown>;
  healthChecks: { name: string; status: 'pass' | 'fail' | 'warning'; lastChecked: number }[];
}

export interface TwinMaintenance {
  id: string;
  twinId: string;
  type: 'preventive' | 'corrective' | 'adaptive' | 'perfective';
  status: 'scheduled' | 'in_progress' | 'completed' | 'failed';
  scheduledAt: number;
  startedAt: number;
  completedAt: number;
  description: string;
  operations: string[];
  performedBy: string;
  downtime: number;
}

export interface TwinLifecycleState {
  twinId: string;
  phase: 'creation' | 'deployment' | 'operation' | 'maintenance' | 'decommission';
  phaseStartTime: number;
  phaseDuration: number;
  totalLifetime: number;
  health: number;
  performance: number;
  utilization: number;
}

export interface LifecycleEvent {
  id: string;
  twinId: string;
  eventType: string;
  timestamp: number;
  description: string;
  actor: string;
  metadata: Record<string, unknown>;
}

export interface TwinLifecycleResult {
  versions: TwinVersion[];
  deployments: TwinDeployment[];
  maintenanceRecords: TwinMaintenance[];
  lifecycleStates: TwinLifecycleState[];
  events: LifecycleEvent[];
  activeTwins: number;
  retiredTwins: number;
  totalTwins: number;
  avgLifetime: number;
}

export class TwinLifecycle {
  private _versions: Map<string, TwinVersion[]> = new Map();
  private _deployments: Map<string, TwinDeployment> = new Map();
  private _maintenanceRecords: Map<string, TwinMaintenance[]> = new Map();
  private _lifecycleStates: Map<string, TwinLifecycleState> = new Map();
  private _events: LifecycleEvent[] = [];
  private _counter: number = 0;
  private _lastResult: TwinLifecycleResult | null = null;
  private _twinRegistry: Map<string, {
    name: string;
    createdAt: number;
    status: 'active' | 'retired' | 'archived';
    owner: string;
  }> = new Map();
  private _versionTemplates: Map<string, {
    type: string;
    template: Record<string, unknown>;
  }> = new Map();
  private _deploymentPipelines: Map<string, {
    name: string;
    stages: string[];
    currentStage: number;
    status: 'idle' | 'running' | 'success' | 'failed';
  }> = new Map();
  private _lifecycleStats: {
    totalCreated: number;
    totalDeployed: number;
    totalMaintained: number;
    totalRetired: number;
    avgUptime: number;
    avgDowntime: number;
  } = {
    totalCreated: 0,
    totalDeployed: 0,
    totalMaintained: 0,
    totalRetired: 0,
    avgUptime: 0,
    avgDowntime: 0,
  };

  constructor() {
    this._initVersionTemplates();
    this._initDeploymentPipelines();
  }

  private _initVersionTemplates(): void {
    const templates = [
      { name: 'initial', template: { type: 'major', description: 'Initial version', status: 'draft' } },
      { name: 'feature', template: { type: 'minor', description: 'Feature addition', status: 'testing' } },
      { name: 'bugfix', template: { type: 'patch', description: 'Bug fix', status: 'testing' } },
      { name: 'hotfix', template: { type: 'patch', description: 'Critical hotfix', status: 'stable' } },
    ];
    templates.forEach(t => this._versionTemplates.set(t.name, t));
  }

  private _initDeploymentPipelines(): void {
    const pipelines = [
      {
        name: 'standard',
        pipeline: {
          stages: ['build', 'test', 'staging', 'production'],
          currentStage: 0,
          status: 'idle' as const,
        },
      },
      {
        name: 'blue_green',
        pipeline: {
          stages: ['build', 'test', 'blue', 'green', 'switch'],
          currentStage: 0,
          status: 'idle' as const,
        },
      },
      {
        name: 'canary',
        pipeline: {
          stages: ['build', 'test', 'canary_10pct', 'canary_50pct', 'full'],
          currentStage: 0,
          status: 'idle' as const,
        },
      },
    ];
    pipelines.forEach(p => this._deploymentPipelines.set(p.name, p.pipeline));
  }

  get versions(): TwinVersion[] {
    const all: TwinVersion[] = [];
    for (const versionList of this._versions.values()) {
      all.push(...versionList);
    }
    return all;
  }

  get deployments(): TwinDeployment[] {
    return Array.from(this._deployments.values());
  }

  get maintenanceRecords(): TwinMaintenance[] {
    const all: TwinMaintenance[] = [];
    for (const records of this._maintenanceRecords.values()) {
      all.push(...records);
    }
    return all;
  }

  get lifecycleStates(): TwinLifecycleState[] {
    return Array.from(this._lifecycleStates.values());
  }

  get events(): LifecycleEvent[] {
    return [...this._events];
  }

  get activeTwins(): number {
    let count = 0;
    for (const state of this._lifecycleStates.values()) {
      if (state.phase === 'operation' || state.phase === 'deployment' || state.phase === 'maintenance') {
        count++;
      }
    }
    return count;
  }

  get retiredTwins(): number {
    let count = 0;
    for (const state of this._lifecycleStates.values()) {
      if (state.phase === 'decommission') count++;
    }
    return count;
  }

  get totalTwins(): number {
    return this._twinRegistry.size;
  }

  get lifecycleStats(): {
    totalCreated: number;
    totalDeployed: number;
    totalMaintained: number;
    totalRetired: number;
    avgUptime: number;
    avgDowntime: number;
  } {
    return { ...this._lifecycleStats };
  }

  createTwin(
    twinId: string,
    name: string,
    owner: string,
    initialVersion: string = '1.0.0'
  ): TwinLifecycleState {
    const now = Date.now();
    this._twinRegistry.set(twinId, {
      name,
      createdAt: now,
      status: 'active',
      owner,
    });
    const state: TwinLifecycleState = {
      twinId,
      phase: 'creation',
      phaseStartTime: now,
      phaseDuration: 0,
      totalLifetime: 0,
      health: 1,
      performance: 1,
      utilization: 0,
    };
    this._lifecycleStates.set(twinId, state);
    const [major, minor, patch] = initialVersion.split('.').map(v => parseInt(v) || 0);
    const version: TwinVersion = {
      version: initialVersion,
      major,
      minor,
      patch,
      createdAt: now,
      createdBy: owner,
      description: 'Initial version',
      changes: ['Initial creation'],
      status: 'stable',
      tags: ['initial'],
    };
    this._versions.set(twinId, [version]);
    this._addEvent(twinId, 'create', 'Twin created', owner);
    this._lifecycleStats.totalCreated++;
    return state;
  }

  createVersion(
    twinId: string,
    type: 'major' | 'minor' | 'patch',
    createdBy: string,
    description: string,
    changes: string[]
  ): TwinVersion | null {
    const versionList = this._versions.get(twinId);
    if (!versionList || versionList.length === 0) return null;
    const lastVersion = versionList[versionList.length - 1];
    let major = lastVersion.major;
    let minor = lastVersion.minor;
    let patch = lastVersion.patch;
    if (type === 'major') {
      major++;
      minor = 0;
      patch = 0;
    } else if (type === 'minor') {
      minor++;
      patch = 0;
    } else {
      patch++;
    }
    const version: TwinVersion = {
      version: `${major}.${minor}.${patch}`,
      major,
      minor,
      patch,
      createdAt: Date.now(),
      createdBy,
      description,
      changes: [...changes],
      status: 'draft',
      tags: [type],
    };
    versionList.push(version);
    this._addEvent(twinId, 'version_create', `Version ${version.version} created`, createdBy);
    return version;
  }

  getVersions(twinId: string): TwinVersion[] {
    return this._versions.get(twinId) ?? [];
  }

  getCurrentVersion(twinId: string): TwinVersion | null {
    const versionList = this._versions.get(twinId);
    if (!versionList || versionList.length === 0) return null;
    return versionList[versionList.length - 1];
  }

  promoteVersion(twinId: string, version: string, status: 'testing' | 'stable' | 'deprecated'): boolean {
    const versionList = this._versions.get(twinId);
    if (!versionList) return false;
    const v = versionList.find(v => v.version === version);
    if (!v) return false;
    v.status = status;
    this._addEvent(twinId, 'version_promote', `Version ${version} promoted to ${status}`, 'system');
    return true;
  }

  deployTwin(
    twinId: string,
    version: string,
    environment: 'development' | 'staging' | 'production',
    deployedBy: string,
    targetSystem: string,
    configuration: Record<string, unknown> = {}
  ): TwinDeployment | null {
    const state = this._lifecycleStates.get(twinId);
    if (!state) return null;
    const id = `deploy-${Date.now()}-${this._counter++}`;
    const deployment: TwinDeployment = {
      id,
      twinId,
      version,
      environment,
      status: 'deploying',
      deployedAt: Date.now(),
      deployedBy,
      targetSystem,
      configuration,
      healthChecks: [
        { name: 'connectivity', status: 'pass', lastChecked: Date.now() },
        { name: 'performance', status: 'warning', lastChecked: Date.now() },
        { name: 'data_sync', status: 'pass', lastChecked: Date.now() },
      ],
    };
    this._deployments.set(id, deployment);
    state.phase = 'deployment';
    state.phaseStartTime = Date.now();
    deployment.status = 'deployed';
    state.phase = 'operation';
    state.phaseStartTime = Date.now();
    this._addEvent(twinId, 'deploy', `Deployed version ${version} to ${environment}`, deployedBy);
    this._lifecycleStats.totalDeployed++;
    return deployment;
  }

  rollbackDeployment(deploymentId: string): boolean {
    const deployment = this._deployments.get(deploymentId);
    if (!deployment) return false;
    deployment.status = 'rollback';
    const state = this._lifecycleStates.get(deployment.twinId);
    if (state) {
      state.phase = 'deployment';
      state.phaseStartTime = Date.now();
    }
    this._addEvent(deployment.twinId, 'rollback', `Rollback deployment ${deploymentId}`, 'system');
    return true;
  }

  scheduleMaintenance(
    twinId: string,
    type: 'preventive' | 'corrective' | 'adaptive' | 'perfective',
    scheduledAt: number,
    description: string,
    operations: string[],
    performedBy: string
  ): TwinMaintenance | null {
    const state = this._lifecycleStates.get(twinId);
    if (!state) return null;
    const id = `maint-${Date.now()}-${this._counter++}`;
    const maintenance: TwinMaintenance = {
      id,
      twinId,
      type,
      status: 'scheduled',
      scheduledAt,
      startedAt: 0,
      completedAt: 0,
      description,
      operations: [...operations],
      performedBy,
      downtime: 0,
    };
    if (!this._maintenanceRecords.has(twinId)) {
      this._maintenanceRecords.set(twinId, []);
    }
    this._maintenanceRecords.get(twinId)!.push(maintenance);
    this._addEvent(twinId, 'maintenance_schedule', `Maintenance scheduled: ${description}`, performedBy);
    return maintenance;
  }

  startMaintenance(maintenanceId: string): boolean {
    for (const records of this._maintenanceRecords.values()) {
      const record = records.find(r => r.id === maintenanceId);
      if (record) {
        record.status = 'in_progress';
        record.startedAt = Date.now();
        const state = this._lifecycleStates.get(record.twinId);
        if (state) {
          state.phase = 'maintenance';
          state.phaseStartTime = Date.now();
        }
        this._addEvent(record.twinId, 'maintenance_start', 'Maintenance started', record.performedBy);
        return true;
      }
    }
    return false;
  }

  completeMaintenance(maintenanceId: string): boolean {
    for (const records of this._maintenanceRecords.values()) {
      const record = records.find(r => r.id === maintenanceId);
      if (record) {
        record.status = 'completed';
        record.completedAt = Date.now();
        record.downtime = record.startedAt > 0 ? record.completedAt - record.startedAt : 0;
        const state = this._lifecycleStates.get(record.twinId);
        if (state) {
          state.phase = 'operation';
          state.phaseStartTime = Date.now();
          state.health = Math.min(1, state.health + 0.1);
        }
        this._addEvent(record.twinId, 'maintenance_complete', 'Maintenance completed', record.performedBy);
        this._lifecycleStats.totalMaintained++;
        return true;
      }
    }
    return false;
  }

  getMaintenanceRecords(twinId: string): TwinMaintenance[] {
    return this._maintenanceRecords.get(twinId) ?? [];
  }

  updateHealth(twinId: string, health: number): boolean {
    const state = this._lifecycleStates.get(twinId);
    if (!state) return false;
    state.health = Math.max(0, Math.min(1, health));
    return true;
  }

  updatePerformance(twinId: string, performance: number): boolean {
    const state = this._lifecycleStates.get(twinId);
    if (!state) return false;
    state.performance = Math.max(0, Math.min(1, performance));
    return true;
  }

  updateUtilization(twinId: string, utilization: number): boolean {
    const state = this._lifecycleStates.get(twinId);
    if (!state) return false;
    state.utilization = Math.max(0, Math.min(1, utilization));
    return true;
  }

  decommissionTwin(twinId: string, actor: string): boolean {
    const state = this._lifecycleStates.get(twinId);
    if (!state) return false;
    state.phase = 'decommission';
    state.phaseStartTime = Date.now();
    const twinInfo = this._twinRegistry.get(twinId);
    if (twinInfo) {
      twinInfo.status = 'retired';
    }
    this._addEvent(twinId, 'decommission', 'Twin decommissioned', actor);
    this._lifecycleStats.totalRetired++;
    return true;
  }

  getLifecycleState(twinId: string): TwinLifecycleState | null {
    return this._lifecycleStates.get(twinId) ?? null;
  }

  getDeployment(deploymentId: string): TwinDeployment | null {
    return this._deployments.get(deploymentId) ?? null;
  }

  getDeploymentsForTwin(twinId: string): TwinDeployment[] {
    const result: TwinDeployment[] = [];
    for (const deployment of this._deployments.values()) {
      if (deployment.twinId === twinId) {
        result.push(deployment);
      }
    }
    return result.sort((a, b) => b.deployedAt - a.deployedAt);
  }

  getEvents(twinId: string, limit?: number): LifecycleEvent[] {
    const filtered = this._events.filter(e => e.twinId === twinId);
    if (limit === undefined) return filtered;
    return filtered.slice(-limit);
  }

  addHealthCheck(
    deploymentId: string,
    name: string,
    status: 'pass' | 'fail' | 'warning'
  ): boolean {
    const deployment = this._deployments.get(deploymentId);
    if (!deployment) return false;
    const existing = deployment.healthChecks.find(h => h.name === name);
    if (existing) {
      existing.status = status;
      existing.lastChecked = Date.now();
    } else {
      deployment.healthChecks.push({ name, status, lastChecked: Date.now() });
    }
    return true;
  }

  getVersionTemplateNames(): string[] {
    return Array.from(this._versionTemplates.keys());
  }

  getPipelineNames(): string[] {
    return Array.from(this._deploymentPipelines.keys());
  }

  private _addEvent(
    twinId: string,
    eventType: string,
    description: string,
    actor: string,
    metadata: Record<string, unknown> = {}
  ): void {
    const event: LifecycleEvent = {
      id: `event-${Date.now()}-${this._counter++}`,
      twinId,
      eventType,
      timestamp: Date.now(),
      description,
      actor,
      metadata,
    };
    this._events.push(event);
    if (this._events.length > 1000) {
      this._events.shift();
    }
  }

  toPacket(): DataPacket<TwinLifecycleResult> {
    const result: TwinLifecycleResult = {
      versions: this.versions,
      deployments: this.deployments,
      maintenanceRecords: this.maintenanceRecords,
      lifecycleStates: this.lifecycleStates,
      events: this._events,
      activeTwins: this.activeTwins,
      retiredTwins: this.retiredTwins,
      totalTwins: this.totalTwins,
      avgLifetime: 0,
    };
    this._lastResult = result;
    this._counter++;
    return {
      id: `twin-lifecycle-${Date.now()}-${this._counter}`,
      payload: result,
      metadata: {
        createdAt: Date.now(),
        route: ['digital_twin', 'twin_lifecycle'],
        priority: 1,
        phase: 'lifecycle',
      },
    };
  }

  reset(): void {
    this._versions.clear();
    this._deployments.clear();
    this._maintenanceRecords.clear();
    this._lifecycleStates.clear();
    this._events = [];
    this._counter = 0;
    this._lastResult = null;
    this._twinRegistry.clear();
    this._lifecycleStats = {
      totalCreated: 0,
      totalDeployed: 0,
      totalMaintained: 0,
      totalRetired: 0,
      avgUptime: 0,
      avgDowntime: 0,
    };
  }
}
