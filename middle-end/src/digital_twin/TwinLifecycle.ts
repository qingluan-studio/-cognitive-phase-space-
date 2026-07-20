import { DataPacket } from '../shared/types';

export interface TwinVersion {
  id: string;
  version: string;
  createdAt: number;
  author: string;
  changelog: string;
  parentVersion: string | null;
  checksum: string;
  status: 'draft' | 'approved' | 'deprecated' | 'archived';
  tags: string[];
}

export interface TwinDeployment {
  id: string;
  versionId: string;
  environment: 'development' | 'staging' | 'production' | 'edge';
  deployedAt: number;
  deployedBy: string;
  rollbackVersion: string | null;
  healthCheckUrl: string;
  scalingConfig: { minInstances: number; maxInstances: number; targetCpu: number };
  status: 'deploying' | 'running' | 'scaling' | 'unhealthy' | 'stopped';
  metadata: Record<string, unknown>;
}

export interface TwinMaintenance {
  id: string;
  type: 'scheduled' | 'emergency' | 'patch' | 'upgrade';
  scheduledStart: number;
  scheduledEnd: number;
  actualStart?: number;
  actualEnd?: number;
  description: string;
  impact: 'none' | 'minimal' | 'moderate' | 'severe';
  affectedVersions: string[];
  status: 'planned' | 'in-progress' | 'completed' | 'cancelled' | 'failed';
  metadata: Record<string, unknown>;
}

export interface TwinLifecycleState {
  id: string;
  name: string;
  description: string;
  allowedTransitions: string[];
  requiredApprovals: number;
  autoDeploy: boolean;
  notifications: string[];
  metadata: Record<string, unknown>;
}

export interface LifecycleEvent {
  id: string;
  timestamp: number;
  type: 'version-created' | 'version-approved' | 'deployment-started' | 'deployment-completed' | 'maintenance-started' | 'maintenance-completed' | 'rollback-initiated' | 'state-changed';
  entityId: string;
  actor: string;
  details: string;
  metadata: Record<string, unknown>;
}

export interface ApprovalWorkflow {
  id: string;
  versionId: string;
  approvers: string[];
  approvals: { approver: string; approved: boolean; timestamp: number; comment: string }[];
  requiredCount: number;
  status: 'pending' | 'approved' | 'rejected';
  deadline: number;
}

export interface DeploymentPipeline {
  id: string;
  name: string;
  stages: { name: string; environment: string; gates: string[]; autoPromote: boolean }[];
  trigger: 'manual' | 'auto' | 'scheduled';
  rollbackStrategy: 'automatic' | 'manual' | 'none';
  metadata: Record<string, unknown>;
}

export interface EnvironmentConfig {
  id: string;
  name: string;
  type: 'development' | 'staging' | 'production' | 'edge';
  resources: { cpu: number; memory: number; storage: number; gpu: number };
  networkPolicy: string;
  secrets: string[];
  monitoringEnabled: boolean;
  backupEnabled: boolean;
}

export class TwinLifecycle {
  private _versions: Map<string, TwinVersion> = new Map();
  private _deployments: Map<string, TwinDeployment> = new Map();
  private _maintenanceWindows: Map<string, TwinMaintenance> = new Map();
  private _lifecycleStates: Map<string, TwinLifecycleState> = new Map();
  private _lifecycleEvents: LifecycleEvent[] = [];
  private _approvalWorkflows: Map<string, ApprovalWorkflow> = new Map();
  private _deploymentPipelines: Map<string, DeploymentPipeline> = new Map();
  private _environmentConfigs: Map<string, EnvironmentConfig> = new Map();
  private _lastResult: TwinVersion | null = null;
  private _counter: number = 0;
  private _versionCounter: number = 0;
  private _autoApproveMinor: boolean = false;
  private _retentionDays: number = 365;
  private _deploymentHistory: Map<string, TwinDeployment[]> = new Map();
  private _maintenanceHistory: Map<string, TwinMaintenance[]> = new Map();
  private _notificationChannels: string[] = [];
  private _complianceRules: Map<string, { rule: string; enabled: boolean }> = new Map();
  private _auditLog: { timestamp: number; action: string; user: string; details: string }[] = [];

  constructor() {
    this._initDefaultLifecycleStates();
    this._initDefaultEnvironmentConfigs();
    this._initDefaultComplianceRules();
  }

  private _initDefaultLifecycleStates(): void {
    this._lifecycleStates.set('draft', {
      id: 'draft',
      name: 'Draft',
      description: 'Initial version under development',
      allowedTransitions: ['review', 'deprecated'],
      requiredApprovals: 0,
      autoDeploy: false,
      notifications: ['author'],
      metadata: {}
    });

    this._lifecycleStates.set('review', {
      id: 'review',
      name: 'Under Review',
      description: 'Version pending approval',
      allowedTransitions: ['approved', 'rejected', 'deprecated'],
      requiredApprovals: 2,
      autoDeploy: false,
      notifications: ['reviewers', 'author'],
      metadata: {}
    });

    this._lifecycleStates.set('approved', {
      id: 'approved',
      name: 'Approved',
      description: 'Version approved for deployment',
      allowedTransitions: ['deployed', 'deprecated'],
      requiredApprovals: 0,
      autoDeploy: true,
      notifications: ['deploy-team', 'author'],
      metadata: {}
    });

    this._lifecycleStates.set('deployed', {
      id: 'deployed',
      name: 'Deployed',
      description: 'Version currently deployed',
      allowedTransitions: ['archived', 'rollback'],
      requiredApprovals: 0,
      autoDeploy: false,
      notifications: ['operations'],
      metadata: {}
    });

    this._lifecycleStates.set('archived', {
      id: 'archived',
      name: 'Archived',
      description: 'Historical version preserved for audit',
      allowedTransitions: [],
      requiredApprovals: 0,
      autoDeploy: false,
      notifications: [],
      metadata: {}
    });

    this._lifecycleStates.set('deprecated', {
      id: 'deprecated',
      name: 'Deprecated',
      description: 'Version no longer supported',
      allowedTransitions: ['archived'],
      requiredApprovals: 1,
      autoDeploy: false,
      notifications: ['users'],
      metadata: {}
    });
  }

  private _initDefaultEnvironmentConfigs(): void {
    this._environmentConfigs.set('dev', {
      id: 'dev',
      name: 'Development',
      type: 'development',
      resources: { cpu: 2, memory: 4, storage: 50, gpu: 0 },
      networkPolicy: 'permissive',
      secrets: ['db-dev', 'api-dev'],
      monitoringEnabled: true,
      backupEnabled: false
    });

    this._environmentConfigs.set('staging', {
      id: 'staging',
      name: 'Staging',
      type: 'staging',
      resources: { cpu: 4, memory: 8, storage: 100, gpu: 1 },
      networkPolicy: 'restricted',
      secrets: ['db-staging', 'api-staging'],
      monitoringEnabled: true,
      backupEnabled: true
    });

    this._environmentConfigs.set('production', {
      id: 'production',
      name: 'Production',
      type: 'production',
      resources: { cpu: 16, memory: 64, storage: 500, gpu: 4 },
      networkPolicy: 'strict',
      secrets: ['db-prod', 'api-prod', 'tls-cert'],
      monitoringEnabled: true,
      backupEnabled: true
    });
  }

  private _initDefaultComplianceRules(): void {
    this._complianceRules.set('require-approval', { rule: 'All production deployments require approval', enabled: true });
    this._complianceRules.set('require-tests', { rule: 'All versions must pass automated tests', enabled: true });
    this._complianceRules.set('require-docs', { rule: 'All versions must have documentation', enabled: false });
    this._complianceRules.set('require-security-scan', { rule: 'Security scan required before deployment', enabled: true });
  }

  get versions(): Map<string, TwinVersion> {
    return new Map(this._versions);
  }

  get deployments(): Map<string, TwinDeployment> {
    return new Map(this._deployments);
  }

  get maintenanceWindows(): Map<string, TwinMaintenance> {
    return new Map(this._maintenanceWindows);
  }

  get lifecycleStates(): Map<string, TwinLifecycleState> {
    return new Map(this._lifecycleStates);
  }

  get lifecycleEvents(): LifecycleEvent[] {
    return [...this._lifecycleEvents];
  }

  get approvalWorkflows(): Map<string, ApprovalWorkflow> {
    return new Map(this._approvalWorkflows);
  }

  get deploymentPipelines(): Map<string, DeploymentPipeline> {
    return new Map(this._deploymentPipelines);
  }

  get environmentConfigs(): Map<string, EnvironmentConfig> {
    return new Map(this._environmentConfigs);
  }

  get lastResult(): TwinVersion | null {
    return this._lastResult;
  }

  get autoApproveMinor(): boolean {
    return this._autoApproveMinor;
  }

  get retentionDays(): number {
    return this._retentionDays;
  }

  get versionCount(): number {
    return this._versions.size;
  }

  get activeDeploymentCount(): number {
    return Array.from(this._deployments.values()).filter(d => d.status === 'running').length;
  }

  get pendingMaintenanceCount(): number {
    return Array.from(this._maintenanceWindows.values()).filter(m => m.status === 'planned' || m.status === 'in-progress').length;
  }

  setAutoApproveMinor(enabled: boolean): void {
    this._autoApproveMinor = enabled;
  }

  setRetentionDays(days: number): void {
    this._retentionDays = days;
  }

  addNotificationChannel(channel: string): void {
    if (!this._notificationChannels.includes(channel)) {
      this._notificationChannels.push(channel);
    }
  }

  removeNotificationChannel(channel: string): void {
    const idx = this._notificationChannels.indexOf(channel);
    if (idx >= 0) {
      this._notificationChannels.splice(idx, 1);
    }
  }

  createVersion(author: string, changelog: string, parentVersion?: string): TwinVersion {
    this._versionCounter++;
    const version: TwinVersion = {
      id: `version-${Date.now()}`,
      version: `1.0.${this._versionCounter}`,
      createdAt: Date.now(),
      author,
      changelog,
      parentVersion: parentVersion || null,
      checksum: `sha256-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      status: 'draft',
      tags: []
    };

    this._versions.set(version.id, version);
    this._lastResult = version;
    this._recordEvent('version-created', version.id, author, `Created version ${version.version}`);
    this._audit('create-version', author, `Created version ${version.version}`);
    return version;
  }

  updateVersionStatus(versionId: string, newStatus: TwinVersion['status'], actor: string): boolean {
    const version = this._versions.get(versionId);
    if (!version) return false;

    version.status = newStatus;
    this._versions.set(versionId, version);
    this._recordEvent('state-changed', versionId, actor, `Status changed to ${newStatus}`);
    this._audit('update-version-status', actor, `Version ${versionId} status -> ${newStatus}`);
    return true;
  }

  submitForApproval(versionId: string, approvers: string[]): ApprovalWorkflow | null {
    const version = this._versions.get(versionId);
    if (!version) return null;

    const workflow: ApprovalWorkflow = {
      id: `approval-${versionId}`,
      versionId,
      approvers,
      approvals: [],
      requiredCount: this._lifecycleStates.get('review')?.requiredApprovals || 2,
      status: 'pending',
      deadline: Date.now() + 86400000
    };

    this._approvalWorkflows.set(workflow.id, workflow);
    this.updateVersionStatus(versionId, 'approved', 'system');
    this._recordEvent('version-approved', versionId, 'system', 'Auto-approved via workflow');
    return workflow;
  }

  approveVersion(workflowId: string, approver: string, comment: string): boolean {
    const workflow = this._approvalWorkflows.get(workflowId);
    if (!workflow) return false;

    workflow.approvals.push({ approver, approved: true, timestamp: Date.now(), comment });

    if (workflow.approvals.filter(a => a.approved).length >= workflow.requiredCount) {
      workflow.status = 'approved';
      this.updateVersionStatus(workflow.versionId, 'approved', approver);
    }

    this._approvalWorkflows.set(workflowId, workflow);
    this._audit('approve-version', approver, `Approved workflow ${workflowId}`);
    return true;
  }

  rejectVersion(workflowId: string, approver: string, comment: string): boolean {
    const workflow = this._approvalWorkflows.get(workflowId);
    if (!workflow) return false;

    workflow.approvals.push({ approver, approved: false, timestamp: Date.now(), comment });
    workflow.status = 'rejected';
    this.updateVersionStatus(workflow.versionId, 'draft', approver);
    this._approvalWorkflows.set(workflowId, workflow);
    this._audit('reject-version', approver, `Rejected workflow ${workflowId}: ${comment}`);
    return true;
  }

  deployVersion(versionId: string, environment: TwinDeployment['environment'], deployedBy: string): TwinDeployment | null {
    const version = this._versions.get(versionId);
    if (!version) return null;

    const envConfig = Array.from(this._environmentConfigs.values()).find(e => e.type === environment);
    if (!envConfig) return null;

    const deployment: TwinDeployment = {
      id: `deployment-${Date.now()}`,
      versionId,
      environment,
      deployedAt: Date.now(),
      deployedBy,
      rollbackVersion: null,
      healthCheckUrl: `${envConfig.name.toLowerCase()}/health`,
      scalingConfig: { minInstances: envConfig.type === 'production' ? 3 : 1, maxInstances: envConfig.type === 'production' ? 20 : 2, targetCpu: 70 },
      status: 'deploying',
      metadata: { version: version.version }
    };

    this._deployments.set(deployment.id, deployment);
    this._addToDeploymentHistory(versionId, deployment);
    this.updateVersionStatus(versionId, 'deployed', deployedBy);
    this._recordEvent('deployment-started', deployment.id, deployedBy, `Deploying to ${environment}`);
    this._audit('deploy-version', deployedBy, `Deployed ${versionId} to ${environment}`);
    return deployment;
  }

  updateDeploymentStatus(deploymentId: string, status: TwinDeployment['status']): boolean {
    const deployment = this._deployments.get(deploymentId);
    if (!deployment) return false;

    deployment.status = status;
    this._deployments.set(deploymentId, deployment);
    this._recordEvent('deployment-completed', deploymentId, 'system', `Status: ${status}`);
    return true;
  }

  rollbackDeployment(deploymentId: string, actor: string): boolean {
    const deployment = this._deployments.get(deploymentId);
    if (!deployment) return false;

    const version = this._versions.get(deployment.versionId);
    if (!version || !version.parentVersion) return false;

    deployment.rollbackVersion = version.parentVersion;
    deployment.status = 'stopped';
    this._deployments.set(deploymentId, deployment);
    this._recordEvent('rollback-initiated', deploymentId, actor, `Rollback to ${version.parentVersion}`);
    this._audit('rollback-deployment', actor, `Rolled back ${deploymentId} to ${version.parentVersion}`);
    return true;
  }

  scheduleMaintenance(maintenance: TwinMaintenance): void {
    this._maintenanceWindows.set(maintenance.id, maintenance);
    this._addToMaintenanceHistory(maintenance.id, maintenance);
    this._recordEvent('maintenance-started', maintenance.id, 'system', `Scheduled: ${maintenance.description}`);
    this._audit('schedule-maintenance', 'system', `Scheduled maintenance ${maintenance.id}`);
  }

  updateMaintenanceStatus(maintenanceId: string, status: TwinMaintenance['status']): boolean {
    const maintenance = this._maintenanceWindows.get(maintenanceId);
    if (!maintenance) return false;

    maintenance.status = status;
    if (status === 'in-progress' && !maintenance.actualStart) {
      maintenance.actualStart = Date.now();
    }
    if (status === 'completed' && !maintenance.actualEnd) {
      maintenance.actualEnd = Date.now();
    }

    this._maintenanceWindows.set(maintenanceId, maintenance);
    this._recordEvent('maintenance-completed', maintenanceId, 'system', `Status: ${status}`);
    return true;
  }

  addDeploymentPipeline(pipeline: DeploymentPipeline): void {
    this._deploymentPipelines.set(pipeline.id, pipeline);
  }

  removeDeploymentPipeline(id: string): boolean {
    return this._deploymentPipelines.delete(id);
  }

  addEnvironmentConfig(config: EnvironmentConfig): void {
    this._environmentConfigs.set(config.id, config);
  }

  removeEnvironmentConfig(id: string): boolean {
    return this._environmentConfigs.delete(id);
  }

  addLifecycleState(state: TwinLifecycleState): void {
    this._lifecycleStates.set(state.id, state);
  }

  removeLifecycleState(id: string): boolean {
    return this._lifecycleStates.delete(id);
  }

  getVersionHistory(versionId: string): TwinVersion[] {
    const history: TwinVersion[] = [];
    let current = this._versions.get(versionId);
    while (current) {
      history.push(current);
      current = current.parentVersion ? this._versions.get(current.parentVersion) || null : null;
    }
    return history;
  }

  getDeploymentHistory(versionId: string): TwinDeployment[] {
    return this._deploymentHistory.get(versionId) || [];
  }

  private _addToDeploymentHistory(versionId: string, deployment: TwinDeployment): void {
    const history = this._deploymentHistory.get(versionId) || [];
    history.push(deployment);
    this._deploymentHistory.set(versionId, history);
  }

  private _addToMaintenanceHistory(maintenanceId: string, maintenance: TwinMaintenance): void {
    const history = this._maintenanceHistory.get(maintenanceId) || [];
    history.push(maintenance);
    this._maintenanceHistory.set(maintenanceId, history);
  }

  private _recordEvent(type: LifecycleEvent['type'], entityId: string, actor: string, details: string): void {
    this._lifecycleEvents.push({
      id: `event-${Date.now()}-${this._counter++}`,
      timestamp: Date.now(),
      type,
      entityId,
      actor,
      details,
      metadata: {}
    });

    if (this._lifecycleEvents.length > 10000) {
      this._lifecycleEvents.shift();
    }
  }

  private _audit(action: string, user: string, details: string): void {
    this._auditLog.push({ timestamp: Date.now(), action, user, details });
    if (this._auditLog.length > 10000) {
      this._auditLog.shift();
    }
  }

  getEventsByEntity(entityId: string): LifecycleEvent[] {
    return this._lifecycleEvents.filter(e => e.entityId === entityId);
  }

  getEventsByType(type: LifecycleEvent['type']): LifecycleEvent[] {
    return this._lifecycleEvents.filter(e => e.type === type);
  }

  getEventsInRange(start: number, end: number): LifecycleEvent[] {
    return this._lifecycleEvents.filter(e => e.timestamp >= start && e.timestamp <= end);
  }

  checkCompliance(versionId: string): { compliant: boolean; violations: string[] } {
    const violations: string[] = [];
    const version = this._versions.get(versionId);

    if (!version) {
      violations.push('Version not found');
      return { compliant: false, violations };
    }

    for (const [name, rule] of this._complianceRules) {
      if (!rule.enabled) continue;

      if (name === 'require-approval' && version.status === 'deployed') {
        const workflow = Array.from(this._approvalWorkflows.values()).find(w => w.versionId === versionId);
        if (!workflow || workflow.status !== 'approved') {
          violations.push(rule.rule);
        }
      }
    }

    return { compliant: violations.length === 0, violations };
  }

  setComplianceRule(name: string, enabled: boolean): void {
    const rule = this._complianceRules.get(name);
    if (rule) {
      rule.enabled = enabled;
    }
  }

  getComplianceRules(): Map<string, { rule: string; enabled: boolean }> {
    return new Map(this._complianceRules);
  }

  cleanupOldVersions(): number {
    const cutoff = Date.now() - this._retentionDays * 86400000;
    let removed = 0;

    for (const [id, version] of this._versions) {
      if (version.status === 'archived' && version.createdAt < cutoff) {
        this._versions.delete(id);
        removed++;
      }
    }

    return removed;
  }

  getHealthStatus(): Record<string, string> {
    const status: Record<string, string> = {};
    for (const [id, deployment] of this._deployments) {
      status[id] = deployment.status;
    }
    return status;
  }

  getMetrics(): Record<string, number> {
    return {
      totalVersions: this._versions.size,
      totalDeployments: this._deployments.size,
      totalMaintenanceWindows: this._maintenanceWindows.size,
      totalEvents: this._lifecycleEvents.length,
      pendingApprovals: Array.from(this._approvalWorkflows.values()).filter(w => w.status === 'pending').length,
      activeDeployments: this.activeDeploymentCount,
      failedDeployments: Array.from(this._deployments.values()).filter(d => d.status === 'unhealthy' || d.status === 'stopped').length,
      complianceViolations: Array.from(this._versions.keys()).reduce((sum, id) => sum + this.checkCompliance(id).violations.length, 0)
    };
  }

  exportVersion(versionId: string): string {
    const version = this._versions.get(versionId);
    return version ? JSON.stringify(version, null, 2) : '';
  }

  importVersion(json: string): TwinVersion | null {
    try {
      const version = JSON.parse(json) as TwinVersion;
      this._versions.set(version.id, version);
      return version;
    } catch {
      return null;
    }
  }

  toPacket(): DataPacket<TwinVersion> {
    const result = this._lastResult || {
      id: '',
      version: '',
      createdAt: Date.now(),
      author: '',
      changelog: '',
      parentVersion: null,
      checksum: '',
      status: 'draft',
      tags: []
    };
    this._counter++;
    return {
      id: `twin-lifecycle-${Date.now()}-${this._counter}`,
      payload: result,
      metadata: {
        createdAt: Date.now(),
        route: ['digital-twin', 'twin-lifecycle'],
        priority: 1,
        phase: 'lifecycle'
      }
    };
  }

  reset(): void {
    this._versions.clear();
    this._deployments.clear();
    this._maintenanceWindows.clear();
    this._lifecycleStates.clear();
    this._lifecycleEvents = [];
    this._approvalWorkflows.clear();
    this._deploymentPipelines.clear();
    this._environmentConfigs.clear();
    this._lastResult = null;
    this._counter = 0;
    this._versionCounter = 0;
    this._autoApproveMinor = false;
    this._retentionDays = 365;
    this._deploymentHistory.clear();
    this._maintenanceHistory.clear();
    this._notificationChannels = [];
    this._complianceRules.clear();
    this._auditLog = [];
    this._initDefaultLifecycleStates();
    this._initDefaultEnvironmentConfigs();
    this._initDefaultComplianceRules();
  }
}
