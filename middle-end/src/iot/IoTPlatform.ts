import { DataPacket } from '../shared/types';

export interface PlatformConfig {
  readonly platform: string;
  readonly devices: string[];
  readonly rules: string[];
  readonly integrations: string[];
  readonly tenant: string;
  readonly region: string;
}

export interface DeviceGroup {
  readonly groupId: string;
  readonly name: string;
  readonly devices: string[];
  readonly firmwareVersion: string;
  readonly autoUpdate: boolean;
}

export interface DataModel {
  readonly modelId: string;
  readonly schema: Record<string, string>;
  readonly version: string;
  readonly telemetry: string[];
  readonly properties: Record<string, unknown>;
}

export interface IntegrationEndpoint {
  readonly endpointId: string;
  readonly protocol: string;
  readonly url: string;
  readonly authType: 'bearer' | 'api-key' | 'oauth2' | 'basic';
  readonly enabled: boolean;
  readonly retryPolicy: { maxRetries: number; backoffMs: number };
}

export interface DeviceShadow {
  readonly deviceId: string;
  readonly reported: Record<string, unknown>;
  readonly desired: Record<string, unknown>;
  readonly lastUpdated: number;
  readonly version: number;
}

export interface OTAJob {
  readonly jobId: string;
  readonly firmwareVersion: string;
  readonly targetDevices: string[];
  readonly status: 'pending' | 'in-progress' | 'completed' | 'failed' | 'rolled-back';
  readonly rolloutPercentage: number;
  readonly scheduledAt: number;
}

export class IoTPlatform {
  private _platform: PlatformConfig | null = null;
  private _devices: Set<string> = new Set();
  private _history: string[] = [];
  private _counter = 0;
  private _deviceGroups: Map<string, DeviceGroup> = new Map();
  private _dataModels: Map<string, DataModel> = new Map();
  private _integrations: Map<string, IntegrationEndpoint> = new Map();
  private _deviceShadows: Map<string, DeviceShadow> = new Map();
  private _otaJobs: Map<string, OTAJob> = new Map();
  private _workflows: Map<string, { steps: string[]; status: string; createdAt: number }> = new Map();
  private _analyticsPipeline: Map<string, { query: string; lastRun: number; results: unknown[] }> = new Map();

  get platformName(): string {
    return this._platform?.platform ?? 'none';
  }

  get deviceCount(): number {
    return this._devices.size;
  }

  get history(): string[] {
    return [...this._history];
  }

  get groupCount(): number {
    return this._deviceGroups.size;
  }

  get dataModelCount(): number {
    return this._dataModels.size;
  }

  get integrationCount(): number {
    return this._integrations.size;
  }

  get shadowCount(): number {
    return this._deviceShadows.size;
  }

  get otaJobCount(): number {
    return this._otaJobs.size;
  }

  get workflowCount(): number {
    return this._workflows.size;
  }

  get analyticsPipelineCount(): number {
    return this._analyticsPipeline.size;
  }

  public platformSetup(platform: string, config: Record<string, unknown>): { platform: string; config: Record<string, unknown>; initialized: boolean; initializedAt: number } {
    this._platform = { platform, devices: [], rules: [], integrations: [], tenant: 'default', region: 'default' };
    this._recordHistory(`platformSetup(platform=${platform}) -> initialized`);
    return { platform, config, initialized: true, initializedAt: Date.now() };
  }

  public deviceOnboard(device: string, certificate: string): { device: string; certificate: string; onboarded: boolean; provisioned: boolean } {
    this._devices.add(device);
    this._recordHistory(`deviceOnboard(device=${device}) -> onboarded`);
    return { device, certificate, onboarded: true, provisioned: true };
  }

  public deviceOffboard(device: string): { device: string; offboarded: boolean; cleanup: boolean } {
    const existed = this._devices.has(device);
    this._devices.delete(device);
    this._deviceShadows.delete(device);
    this._recordHistory(`deviceOffboard(device=${device}) -> ${existed}`);
    return { device, offboarded: existed, cleanup: true };
  }

  public deviceProvisioning(device: string, credentials: string): { device: string; credentials: string; provisioned: boolean; type: string } {
    this._devices.add(device);
    this._recordHistory(`deviceProvisioning(device=${device}) -> provisioned`);
    return { device, credentials, provisioned: true, type: 'x509' };
  }

  public rulesEngine(rule: string, conditions: string[]): { rule: string; conditions: number; triggered: boolean; actions: string[] } {
    const triggered = Math.random() > 0.5;
    const actions = triggered ? ['send-alert', 'update-shadow'] : [];
    this._recordHistory(`rulesEngine(rule=${rule}, conditions=${conditions.length}) -> triggered=${triggered}`);
    return { rule, conditions: conditions.length, triggered, actions };
  }

  public commandDispatch(device: string, command: string, params: Record<string, unknown>): { device: string; command: string; dispatched: boolean; params: Record<string, unknown>; acknowledged: boolean } {
    const acknowledged = Math.random() > 0.1;
    this._recordHistory(`commandDispatch(device=${device}, cmd=${command}) -> ack=${acknowledged}`);
    return { device, command, dispatched: true, params, acknowledged };
  }

  public deviceShadowUpdate(device: string, reported: Record<string, unknown>, desired: Record<string, unknown>): { device: string; updated: boolean; version: number; delta: Record<string, unknown> } {
    const existing = this._deviceShadows.get(device);
    const version = (existing?.version ?? 0) + 1;
    const shadow: DeviceShadow = { deviceId: device, reported, desired, lastUpdated: Date.now(), version };
    this._deviceShadows.set(device, shadow);
    const delta: Record<string, unknown> = {};
    for (const key of Object.keys(desired)) {
      if (desired[key] !== reported[key]) delta[key] = desired[key];
    }
    this._recordHistory(`deviceShadowUpdate(device=${device}) -> v${version}`);
    return { device, updated: true, version, delta };
  }

  public deviceShadowGet(device: string): { device: string; shadow: DeviceShadow | null; found: boolean } {
    const shadow = this._deviceShadows.get(device) ?? null;
    this._recordHistory(`deviceShadowGet(device=${device}) -> found=${!!shadow}`);
    return { device, shadow, found: !!shadow };
  }

  public telemetryIngest(device: string, telemetry: Record<string, number>): { device: string; ingested: boolean; metrics: number; timestamp: number } {
    const metrics = Object.keys(telemetry).length;
    this._recordHistory(`telemetryIngest(device=${device}, metrics=${metrics})`);
    return { device, ingested: true, metrics, timestamp: Date.now() };
  }

  public otaUpdate(device: string, firmware: string, version: string): { device: string; firmware: string; version: string; progress: number; status: string } {
    const progress = Math.floor(Math.random() * 100);
    const status = progress < 30 ? 'downloading' : progress < 90 ? 'installing' : 'completed';
    this._recordHistory(`otaUpdate(device=${device}, fw=${firmware}, ver=${version}) -> ${status}`);
    return { device, firmware, version, progress, status };
  }

  public otaRollback(device: string, previousVersion: string): { device: string; previousVersion: string; rolledBack: boolean; revertedAt: number } {
    const rolledBack = true;
    this._recordHistory(`otaRollback(device=${device}, prev=${previousVersion}) -> ${rolledBack}`);
    return { device, previousVersion, rolledBack, revertedAt: Date.now() };
  }

  public createOTAJob(jobId: string, firmwareVersion: string, targetDevices: string[], rolloutPercentage: number): { created: boolean; job: OTAJob; estimatedDuration: number } {
    const job: OTAJob = { jobId, firmwareVersion, targetDevices, status: 'pending', rolloutPercentage, scheduledAt: Date.now() };
    this._otaJobs.set(jobId, job);
    const estimatedDuration = targetDevices.length * 60;
    this._recordHistory(`createOTAJob(id=${jobId}, fw=${firmwareVersion}, devices=${targetDevices.length})`);
    return { created: true, job, estimatedDuration };
  }

  public getOTAJobStatus(jobId: string): { jobId: string; status: string; progress: number; completedDevices: number; failedDevices: number } {
    const job = this._otaJobs.get(jobId);
    const progress = job ? Math.floor(Math.random() * 100) : 0;
    const completedDevices = job ? Math.floor(job.targetDevices.length * (progress / 100)) : 0;
    const failedDevices = job ? Math.floor(job.targetDevices.length * 0.05) : 0;
    this._recordHistory(`getOTAJobStatus(id=${jobId}) -> progress=${progress}%`);
    return { jobId, status: job?.status ?? 'unknown', progress, completedDevices, failedDevices };
  }

  public cancelOTAJob(jobId: string): { cancelled: boolean; jobId: string; reason: string } {
    const job = this._otaJobs.get(jobId);
    if (job) {
      this._otaJobs.set(jobId, { ...job, status: 'failed' });
    }
    this._recordHistory(`cancelOTAJob(id=${jobId}) -> ${!!job}`);
    return { cancelled: !!job, jobId, reason: 'user-requested' };
  }

  public createDeviceGroup(groupId: string, name: string, devices: string[]): { created: boolean; group: DeviceGroup; existingDevices: number; newDevices: number } {
    const existingDevices = devices.filter(d => this._devices.has(d)).length;
    const newDevices = devices.length - existingDevices;
    const group: DeviceGroup = { groupId, name, devices, firmwareVersion: '1.0.0', autoUpdate: false };
    this._deviceGroups.set(groupId, group);
    this._recordHistory(`createDeviceGroup(id=${groupId}, name=${name}, devices=${devices.length})`);
    return { created: true, group, existingDevices, newDevices };
  }

  public updateDeviceGroup(groupId: string, devicesToAdd: string[], devicesToRemove: string[]): { updated: boolean; groupId: string; added: number; removed: number; total: number } {
    const group = this._deviceGroups.get(groupId);
    let total = 0;
    if (group) {
      const updatedDevices = [...group.devices.filter(d => !devicesToRemove.includes(d)), ...devicesToAdd];
      this._deviceGroups.set(groupId, { ...group, devices: updatedDevices });
      total = updatedDevices.length;
    }
    this._recordHistory(`updateDeviceGroup(id=${groupId}, add=${devicesToAdd.length}, rem=${devicesToRemove.length})`);
    return { updated: !!group, groupId, added: devicesToAdd.length, removed: devicesToRemove.length, total };
  }

  public deleteDeviceGroup(groupId: string): { deleted: boolean; groupId: string; affectedDevices: number } {
    const group = this._deviceGroups.get(groupId);
    const affectedDevices = group?.devices.length ?? 0;
    this._deviceGroups.delete(groupId);
    this._recordHistory(`deleteDeviceGroup(id=${groupId}) -> affected=${affectedDevices}`);
    return { deleted: !!group, groupId, affectedDevices };
  }

  public defineDataModel(modelId: string, schema: Record<string, string>, telemetry: string[]): { defined: boolean; model: DataModel; fields: number } {
    const model: DataModel = { modelId, schema, version: '1.0.0', telemetry, properties: {} };
    this._dataModels.set(modelId, model);
    const fields = Object.keys(schema).length;
    this._recordHistory(`defineDataModel(id=${modelId}, fields=${fields}, telemetry=${telemetry.length})`);
    return { defined: true, model, fields };
  }

  public validateTelemetry(modelId: string, telemetry: Record<string, unknown>): { valid: boolean; modelId: string; errors: string[]; missingFields: string[]; extraFields: string[] } {
    const model = this._dataModels.get(modelId);
    const errors: string[] = [];
    const missingFields: string[] = [];
    const extraFields: string[] = [];
    if (model) {
      for (const field of Object.keys(model.schema)) {
        if (!(field in telemetry)) missingFields.push(field);
      }
      for (const field of Object.keys(telemetry)) {
        if (!model.schema[field]) extraFields.push(field);
      }
    }
    const valid = errors.length === 0 && missingFields.length === 0;
    this._recordHistory(`validateTelemetry(model=${modelId}) -> valid=${valid}`);
    return { valid, modelId, errors, missingFields, extraFields };
  }

  public addIntegration(endpointId: string, protocol: string, url: string, authType: 'bearer' | 'api-key' | 'oauth2' | 'basic'): { added: boolean; endpoint: IntegrationEndpoint; testResult: string } {
    const endpoint: IntegrationEndpoint = {
      endpointId,
      protocol,
      url,
      authType,
      enabled: true,
      retryPolicy: { maxRetries: 3, backoffMs: 1000 },
    };
    this._integrations.set(endpointId, endpoint);
    const testResult = 'connection-successful';
    this._recordHistory(`addIntegration(id=${endpointId}, protocol=${protocol}, url=${url})`);
    return { added: true, endpoint, testResult };
  }

  public removeIntegration(endpointId: string): { removed: boolean; endpointId: string; remaining: number } {
    const removed = this._integrations.delete(endpointId);
    this._recordHistory(`removeIntegration(id=${endpointId}) -> ${removed}`);
    return { removed, endpointId, remaining: this._integrations.size };
  }

  public enableIntegration(endpointId: string): { enabled: boolean; endpointId: string; previousState: boolean } {
    const endpoint = this._integrations.get(endpointId);
    const previousState = endpoint?.enabled ?? false;
    if (endpoint) {
      this._integrations.set(endpointId, { ...endpoint, enabled: true });
    }
    this._recordHistory(`enableIntegration(id=${endpointId}) -> prev=${previousState}`);
    return { enabled: !!endpoint, endpointId, previousState };
  }

  public disableIntegration(endpointId: string): { disabled: boolean; endpointId: string; previousState: boolean } {
    const endpoint = this._integrations.get(endpointId);
    const previousState = endpoint?.enabled ?? false;
    if (endpoint) {
      this._integrations.set(endpointId, { ...endpoint, enabled: false });
    }
    this._recordHistory(`disableIntegration(id=${endpointId}) -> prev=${previousState}`);
    return { disabled: !!endpoint, endpointId, previousState };
  }

  public testIntegration(endpointId: string): { tested: boolean; endpointId: string; latency: number; statusCode: number; success: boolean } {
    const latency = 50 + Math.floor(Math.random() * 200);
    const statusCode = Math.random() > 0.1 ? 200 : 503;
    const success = statusCode === 200;
    this._recordHistory(`testIntegration(id=${endpointId}) -> status=${statusCode}`);
    return { tested: true, endpointId, latency, statusCode, success };
  }

  public dataRouting(sourceTopic: string, targetEndpoints: string[], filter: string): { routed: boolean; sourceTopic: string; targets: number; matchedMessages: number; droppedMessages: number } {
    const matchedMessages = Math.floor(Math.random() * 1000);
    const droppedMessages = Math.floor(matchedMessages * 0.05);
    this._recordHistory(`dataRouting(topic=${sourceTopic}, targets=${targetEndpoints.length}) -> matched=${matchedMessages}`);
    return { routed: true, sourceTopic, targets: targetEndpoints.length, matchedMessages, droppedMessages };
  }

  public workflowEngine(workflowId: string, steps: string[]): { created: boolean; workflowId: string; steps: number; status: string } {
    this._workflows.set(workflowId, { steps, status: 'active', createdAt: Date.now() });
    this._recordHistory(`workflowEngine(id=${workflowId}, steps=${steps.length}) -> created`);
    return { created: true, workflowId, steps: steps.length, status: 'active' };
  }

  public executeWorkflowStep(workflowId: string, stepIndex: number): { executed: boolean; workflowId: string; stepIndex: number; stepName: string; nextStep: number | null } {
    const workflow = this._workflows.get(workflowId);
    const stepName = workflow?.steps[stepIndex] ?? '';
    const nextStep = workflow && stepIndex < workflow.steps.length - 1 ? stepIndex + 1 : null;
    this._recordHistory(`executeWorkflowStep(id=${workflowId}, step=${stepIndex}) -> next=${nextStep}`);
    return { executed: !!workflow, workflowId, stepIndex, stepName, nextStep };
  }

  public analyticsPipeline(pipelineId: string, query: string): { created: boolean; pipelineId: string; query: string; estimatedRuntime: number } {
    this._analyticsPipeline.set(pipelineId, { query, lastRun: 0, results: [] });
    const estimatedRuntime = 1000 + Math.floor(Math.random() * 5000);
    this._recordHistory(`analyticsPipeline(id=${pipelineId}) -> estimated=${estimatedRuntime}ms`);
    return { created: true, pipelineId, query, estimatedRuntime };
  }

  public runAnalyticsPipeline(pipelineId: string): { executed: boolean; pipelineId: string; runtime: number; rowsProcessed: number; results: unknown[] } {
    const pipeline = this._analyticsPipeline.get(pipelineId);
    const runtime = 500 + Math.floor(Math.random() * 2000);
    const rowsProcessed = Math.floor(Math.random() * 100000);
    const results: unknown[] = pipeline ? [{ pipelineId, rowsProcessed, runtime }] : [];
    if (pipeline) {
      this._analyticsPipeline.set(pipelineId, { ...pipeline, lastRun: Date.now(), results });
    }
    this._recordHistory(`runAnalyticsPipeline(id=${pipelineId}) -> rows=${rowsProcessed}`);
    return { executed: !!pipeline, pipelineId, runtime, rowsProcessed, results };
  }

  public getDeviceReport(device: string): { device: string; onboarded: boolean; shadowVersion: number; lastTelemetry: number; groupMembership: string[] } {
    const shadow = this._deviceShadows.get(device);
    const groupMembership = Array.from(this._deviceGroups.values()).filter(g => g.devices.includes(device)).map(g => g.groupId);
    this._recordHistory(`getDeviceReport(device=${device}) -> groups=${groupMembership.length}`);
    return { device, onboarded: this._devices.has(device), shadowVersion: shadow?.version ?? 0, lastTelemetry: shadow?.lastUpdated ?? 0, groupMembership };
  }

  public listDevices(): { devices: string[]; count: number; online: number; offline: number } {
    const devices = Array.from(this._devices);
    const online = Math.floor(devices.length * 0.92);
    const offline = devices.length - online;
    this._recordHistory(`listDevices() -> total=${devices.length}`);
    return { devices, count: devices.length, online, offline };
  }

  public platformHealth(): { healthy: boolean; devices: number; shadows: number; integrations: number; otaJobs: number; workflows: number; issues: string[] } {
    const issues: string[] = [];
    if (this._devices.size === 0) issues.push('no-devices');
    if (this._integrations.size === 0) issues.push('no-integrations');
    const healthy = issues.length === 0;
    this._recordHistory(`platformHealth() -> healthy=${healthy}, issues=${issues.length}`);
    return { healthy, devices: this._devices.size, shadows: this._deviceShadows.size, integrations: this._integrations.size, otaJobs: this._otaJobs.size, workflows: this._workflows.size, issues };
  }

  public toPacket(): DataPacket<{
    platform: string;
    devices: number;
    groups: number;
    dataModels: number;
    integrations: number;
    shadows: number;
    otaJobs: number;
    workflows: number;
    analyticsPipelines: number;
    history: string[];
  }> {
    return {
      id: `iot-platform-${Date.now()}-${this._counter}`,
      payload: {
        platform: this._platform?.platform ?? 'none',
        devices: this._devices.size,
        groups: this._deviceGroups.size,
        dataModels: this._dataModels.size,
        integrations: this._integrations.size,
        shadows: this._deviceShadows.size,
        otaJobs: this._otaJobs.size,
        workflows: this._workflows.size,
        analyticsPipelines: this._analyticsPipeline.size,
        history: [...this._history],
      },
      metadata: {
        createdAt: Date.now(),
        route: ['iot', 'platform', 'result'],
        priority: 0.8,
        phase: 'management',
      },
    };
  }

  public reset(): void {
    this._platform = null;
    this._devices.clear();
    this._history = [];
    this._counter = 0;
    this._deviceGroups.clear();
    this._dataModels.clear();
    this._integrations.clear();
    this._deviceShadows.clear();
    this._otaJobs.clear();
    this._workflows.clear();
    this._analyticsPipeline.clear();
  }

  private _recordHistory(entry: string): void {
    this._counter++;
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
  }
}
