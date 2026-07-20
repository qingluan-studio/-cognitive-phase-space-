import { DataPacket, PacketMeta } from '../shared/types';

export type PipelineStatus = 'pending' | 'running' | 'succeeded' | 'failed' | 'cancelled' | 'paused';
export type StageStatus = 'pending' | 'running' | 'succeeded' | 'failed' | 'skipped';
export type TaskStatus = 'pending' | 'running' | 'succeeded' | 'failed' | 'skipped';
export type EnvironmentType = 'development' | 'staging' | 'production' | 'qa' | 'preprod';
export type DeploymentStrategy = 'rolling' | 'blue-green' | 'canary' | 'recreate';
export type BuildStatus = 'pending' | 'running' | 'succeeded' | 'failed' | 'cancelled';
export type TestType = 'unit' | 'integration' | 'e2e' | 'smoke' | 'performance' | 'security';
export type CodeQualitySeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type AlertLevel = 'critical' | 'warning' | 'info';

export interface SourceRepository {
  id: string;
  name: string;
  url: string;
  provider: 'github' | 'gitlab' | 'bitbucket' | 'azure';
  defaultBranch: string;
  branches: Branch[];
  tags: string[];
  createdAt: number;
}

export interface Branch {
  name: string;
  commit: string;
  lastCommitAt: number;
  isProtected: boolean;
}

export interface Commit {
  id: string;
  message: string;
  author: string;
  timestamp: number;
  filesChanged: number;
  additions: number;
  deletions: number;
}

export interface Pipeline {
  id: string;
  name: string;
  projectId: string;
  status: PipelineStatus;
  stages: Stage[];
  trigger: PipelineTrigger;
  startedAt: number;
  finishedAt?: number;
  duration: number;
  commit?: Commit;
  branch?: string;
  tags: Record<string, string>;
}

export interface PipelineTrigger {
  type: 'push' | 'pull_request' | 'manual' | 'schedule' | 'webhook';
  source?: string;
  branch?: string;
  schedule?: string;
}

export interface Stage {
  id: string;
  name: string;
  status: StageStatus;
  tasks: Task[];
  startedAt?: number;
  finishedAt?: number;
  duration: number;
}

export interface Task {
  id: string;
  name: string;
  type: string;
  status: TaskStatus;
  command?: string;
  script?: string[];
  env?: Record<string, string>;
  timeout?: number;
  startedAt?: number;
  finishedAt?: number;
  duration: number;
  output?: string;
  error?: string;
}

export interface Build {
  id: string;
  pipelineId: string;
  projectId: string;
  status: BuildStatus;
  commit: Commit;
  branch: string;
  artifacts: Artifact[];
  startedAt: number;
  finishedAt?: number;
  duration: number;
  logs: string[];
}

export interface Artifact {
  id: string;
  name: string;
  type: 'docker' | 'binary' | 'npm' | 'helm' | 'terraform' | 'generic';
  version: string;
  size: number;
  path: string;
  checksum: string;
  repository?: string;
  tag?: string;
  createdAt: number;
}

export interface TestResult {
  id: string;
  type: TestType;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  coverage: number;
  reports: TestReport[];
  errorDetails?: string[];
}

export interface TestReport {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: {
    message: string;
    stack?: string;
  };
}

export interface CodeQualityResult {
  id: string;
  tool: string;
  issues: CodeQualityIssue[];
  scannedFiles: number;
  duration: number;
}

export interface CodeQualityIssue {
  id: string;
  file: string;
  line: number;
  column: number;
  severity: CodeQualitySeverity;
  message: string;
  rule: string;
  code?: string;
}

export interface Deployment {
  id: string;
  name: string;
  projectId: string;
  environment: Environment;
  artifact: Artifact;
  strategy: DeploymentStrategy;
  status: 'pending' | 'deploying' | 'deployed' | 'failed' | 'rolled_back';
  startedAt: number;
  finishedAt?: number;
  duration: number;
  rollbackInfo?: RollbackInfo;
  canaryConfig?: CanaryConfig;
  blueGreenConfig?: BlueGreenConfig;
}

export interface Environment {
  id: string;
  name: string;
  type: EnvironmentType;
  region: string;
  resources: string[];
  variables: Record<string, string>;
  isProduction: boolean;
  createdAt: number;
}

export interface RollbackInfo {
  previousDeploymentId: string;
  reason: string;
  rolledBackAt: number;
}

export interface CanaryConfig {
  percentage: number;
  steps: CanaryStep[];
  healthCheckUrl?: string;
  stabilizationWindow?: number;
}

export interface CanaryStep {
  percentage: number;
  duration: number;
}

export interface BlueGreenConfig {
  greenEnvironmentId: string;
  switchTraffic: boolean;
  terminateBlueAfter?: number;
}

export interface DeploymentMonitor {
  deploymentId: string;
  metrics: MonitorMetric[];
  alerts: Alert[];
  healthStatus: 'healthy' | 'degrading' | 'unhealthy';
  monitoredSince: number;
}

export interface MonitorMetric {
  name: string;
  value: number;
  threshold: {
    warning: number;
    critical: number;
  };
  status: 'ok' | 'warning' | 'critical';
  timestamp: number;
}

export interface Alert {
  id: string;
  level: AlertLevel;
  message: string;
  metric: string;
  threshold: number;
  actual: number;
  triggeredAt: number;
  acknowledged?: boolean;
}

export interface InfrastructureResource {
  id: string;
  name: string;
  type: string;
  provider: 'aws' | 'azure' | 'gcp' | 'kubernetes';
  state: 'provisioning' | 'running' | 'stopped' | 'deleting' | 'failed';
  configuration: Record<string, unknown>;
  outputs: Record<string, string>;
  createdAt: number;
  updatedAt?: number;
}

export interface PullRequest {
  id: string;
  repositoryId: string;
  title: string;
  sourceBranch: string;
  targetBranch: string;
  author: string;
  status: 'open' | 'closed' | 'merged';
  reviews: Review[];
  commits: Commit[];
  checks: CheckRun[];
  createdAt: number;
  updatedAt?: number;
}

export interface Review {
  id: string;
  reviewer: string;
  status: 'approved' | 'changes_requested' | 'commented' | 'pending';
  comments: ReviewComment[];
  submittedAt: number;
}

export interface ReviewComment {
  id: string;
  file: string;
  line: number;
  body: string;
  author: string;
  createdAt: number;
}

export interface CheckRun {
  id: string;
  name: string;
  status: 'queued' | 'in_progress' | 'completed';
  conclusion?: 'success' | 'failure' | 'neutral' | 'cancelled';
  detailsUrl?: string;
  startedAt: number;
  completedAt?: number;
}

export interface Release {
  id: string;
  name: string;
  version: string;
  projectId: string;
  artifacts: Artifact[];
  changelog: string;
  status: 'draft' | 'pending' | 'released' | 'archived';
  environments: ReleasedEnvironment[];
  createdAt: number;
  releasedAt?: number;
}

export interface ReleasedEnvironment {
  environmentId: string;
  environmentName: string;
  status: 'pending' | 'deployed' | 'failed';
  deploymentId?: string;
  deployedAt?: number;
}

export interface AuditLog {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string;
  actor: string;
  timestamp: number;
  details: Record<string, unknown>;
  ipAddress?: string;
}

export interface PipelineMetrics {
  totalPipelines: number;
  successfulPipelines: number;
  failedPipelines: number;
  averageDuration: number;
  totalBuilds: number;
  totalDeployments: number;
  deploymentSuccessRate: number;
  averageTestCoverage: number;
  codeQualityIssues: number;
  activeAlerts: number;
}

export class DevOpsPipeline {
  private _repositories: Map<string, SourceRepository> = new Map();
  private _pipelines: Map<string, Pipeline> = new Map();
  private _builds: Map<string, Build> = new Map();
  private _artifacts: Map<string, Artifact> = new Map();
  private _testResults: Map<string, TestResult> = new Map();
  private _codeQualityResults: Map<string, CodeQualityResult> = new Map();
  private _deployments: Map<string, Deployment> = new Map();
  private _environments: Map<string, Environment> = new Map();
  private _monitors: Map<string, DeploymentMonitor> = new Map();
  private _infrastructureResources: Map<string, InfrastructureResource> = new Map();
  private _pullRequests: Map<string, PullRequest> = new Map();
  private _releases: Map<string, Release> = new Map();
  private _auditLogs: Map<string, AuditLog> = new Map();
  private _counter = 0;

  createRepository(name: string, url: string, provider: SourceRepository['provider'], options?: {
    defaultBranch?: string;
    branches?: Branch[];
    tags?: string[];
  }): SourceRepository {
    const repo: SourceRepository = {
      id: `repo-${++this._counter}`,
      name,
      url,
      provider,
      defaultBranch: options?.defaultBranch || 'main',
      branches: options?.branches || [],
      tags: options?.tags || [],
      createdAt: Date.now(),
    };
    this._repositories.set(repo.id, repo);
    this._logAudit('CREATE_REPOSITORY', 'repository', repo.id, { name, provider });
    return repo;
  }

  createPipeline(name: string, projectId: string, stages: Omit<Stage, 'id' | 'status' | 'tasks' | 'startedAt' | 'finishedAt' | 'duration'>[], options?: {
    trigger?: PipelineTrigger;
    branch?: string;
    tags?: Record<string, string>;
  }): Pipeline {
    const pipelineStages: Stage[] = stages.map((s, i) => ({
      ...s,
      id: `stage-${++this._counter}`,
      status: i === 0 ? 'pending' : 'pending',
      tasks: [],
      duration: 0,
    }));

    const pipeline: Pipeline = {
      id: `pipeline-${++this._counter}`,
      name,
      projectId,
      status: 'pending',
      stages: pipelineStages,
      trigger: options?.trigger || { type: 'manual' },
      startedAt: Date.now(),
      duration: 0,
      branch: options?.branch,
      tags: options?.tags || {},
    };

    this._pipelines.set(pipeline.id, pipeline);
    this._logAudit('CREATE_PIPELINE', 'pipeline', pipeline.id, { name, projectId });
    return pipeline;
  }

  runPipeline(pipelineId: string, options?: { commit?: Commit; branch?: string }): Pipeline | null {
    const pipeline = this._pipelines.get(pipelineId);
    if (!pipeline) return null;

    pipeline.status = 'running';
    pipeline.startedAt = Date.now();
    pipeline.commit = options?.commit;
    pipeline.branch = options?.branch || pipeline.branch;

    for (let i = 0; i < pipeline.stages.length; i++) {
      const stage = pipeline.stages[i];
      stage.status = 'running';
      stage.startedAt = Date.now();

      for (const task of stage.tasks) {
        task.status = 'running';
        task.startedAt = Date.now();
        
        const taskDuration = Math.floor(Math.random() * 30) + 5;
        task.duration = taskDuration;
        task.finishedAt = Date.now() + taskDuration * 1000;

        if (Math.random() > 0.95) {
          task.status = 'failed';
          task.error = 'Task failed unexpectedly';
          stage.status = 'failed';
          stage.finishedAt = Date.now();
          stage.duration = Date.now() - (stage.startedAt || Date.now());
          pipeline.status = 'failed';
          pipeline.finishedAt = Date.now();
          pipeline.duration = Date.now() - pipeline.startedAt;
          this._logAudit('PIPELINE_FAILED', 'pipeline', pipeline.id, { stage: stage.name });
          return pipeline;
        }

        task.status = 'succeeded';
      }

      stage.status = 'succeeded';
      stage.finishedAt = Date.now();
      stage.duration = Date.now() - (stage.startedAt || Date.now());
    }

    pipeline.status = 'succeeded';
    pipeline.finishedAt = Date.now();
    pipeline.duration = Date.now() - pipeline.startedAt;

    this._logAudit('PIPELINE_SUCCEEDED', 'pipeline', pipeline.id, { duration: pipeline.duration });
    return pipeline;
  }

  addStage(pipelineId: string, stage: Omit<Stage, 'id' | 'status' | 'tasks' | 'startedAt' | 'finishedAt' | 'duration'>): Stage | null {
    const pipeline = this._pipelines.get(pipelineId);
    if (!pipeline) return null;

    const newStage: Stage = {
      ...stage,
      id: `stage-${++this._counter}`,
      status: 'pending',
      tasks: [],
      duration: 0,
    };
    pipeline.stages.push(newStage);
    return newStage;
  }

  addTask(stageId: string, task: Omit<Task, 'id' | 'status' | 'startedAt' | 'finishedAt' | 'duration'>): Task | null {
    for (const pipeline of this._pipelines.values()) {
      const stage = pipeline.stages.find(s => s.id === stageId);
      if (stage) {
        const newTask: Task = {
          ...task,
          id: `task-${++this._counter}`,
          status: 'pending',
          duration: 0,
        };
        stage.tasks.push(newTask);
        return newTask;
      }
    }
    return null;
  }

  createBuild(pipelineId: string, projectId: string, commit: Commit, branch: string, options?: {
    script?: string[];
    env?: Record<string, string>;
  }): Build {
    const build: Build = {
      id: `build-${++this._counter}`,
      pipelineId,
      projectId,
      status: 'running',
      commit,
      branch,
      artifacts: [],
      startedAt: Date.now(),
      duration: 0,
      logs: ['Starting build...', `Building commit ${commit.id}`],
    };

    const buildDuration = Math.floor(Math.random() * 120) + 60;
    build.duration = buildDuration;
    build.finishedAt = Date.now() + buildDuration * 1000;
    build.logs.push(`Build completed in ${buildDuration}s`);

    const artifact = this._createArtifact(commit.id, branch);
    build.artifacts.push(artifact);

    build.status = 'succeeded';
    this._builds.set(build.id, build);
    this._logAudit('BUILD_COMPLETED', 'build', build.id, { commit: commit.id, branch });
    return build;
  }

  private _createArtifact(commitId: string, branch: string): Artifact {
    const artifact: Artifact = {
      id: `artifact-${++this._counter}`,
      name: `app-${commitId.substring(0, 7)}`,
      type: 'docker',
      version: `1.0.${this._counter}`,
      size: Math.floor(Math.random() * 100) + 50,
      path: `artifacts/app-${commitId.substring(0, 7)}.tar.gz`,
      checksum: this._generateChecksum(),
      repository: `registry.example.com/app`,
      tag: `latest-${branch}`,
      createdAt: Date.now(),
    };
    this._artifacts.set(artifact.id, artifact);
    return artifact;
  }

  private _generateChecksum(): string {
    return Array.from({ length: 32 }, () => 
      '0123456789abcdef'[Math.floor(Math.random() * 16)]
    ).join('');
  }

  runUnitTests(codeFiles: string[], framework: string): TestResult {
    const total = codeFiles.length * 10;
    const passed = Math.floor(total * 0.95);
    const failed = total - passed - Math.floor(total * 0.02);
    const skipped = total - passed - failed;

    const result: TestResult = {
      id: `test-${++this._counter}`,
      type: 'unit',
      total,
      passed,
      failed,
      skipped,
      duration: Math.floor(Math.random() * 60) + 30,
      coverage: Math.floor(Math.random() * 20) + 75,
      reports: [],
    };

    if (failed > 0) {
      result.errorDetails = Array.from({ length: failed }, (_, i) => 
        `Test ${i + 1} failed: assertion error`
      );
    }

    this._testResults.set(result.id, result);
    return result;
  }

  runIntegrationTests(environment: string, testFiles: string[]): TestResult {
    const total = testFiles.length * 2;
    const passed = Math.floor(total * 0.9);
    const failed = total - passed;

    const result: TestResult = {
      id: `test-${++this._counter}`,
      type: 'integration',
      total,
      passed,
      failed,
      skipped: 0,
      duration: Math.floor(Math.random() * 120) + 60,
      coverage: 0,
      reports: [],
    };

    if (failed > 0) {
      result.errorDetails = Array.from({ length: failed }, (_, i) => 
        `Integration test ${i + 1} failed: service unavailable`
      );
    }

    this._testResults.set(result.id, result);
    return result;
  }

  runE2ETests(environment: string, scenarios: string[]): TestResult {
    const total = scenarios.length;
    const passed = Math.floor(total * 0.85);
    const failed = total - passed;

    const result: TestResult = {
      id: `test-${++this._counter}`,
      type: 'e2e',
      total,
      passed,
      failed,
      skipped: 0,
      duration: Math.floor(Math.random() * 300) + 120,
      coverage: 0,
      reports: [],
    };

    if (failed > 0) {
      result.errorDetails = Array.from({ length: failed }, (_, i) => 
        `E2E test ${i + 1} failed: timeout`
      );
    }

    this._testResults.set(result.id, result);
    return result;
  }

  runPerformanceTests(endpoint: string, options?: {
    concurrentUsers?: number;
    duration?: number;
  }): TestResult {
    const result: TestResult = {
      id: `test-${++this._counter}`,
      type: 'performance',
      total: 1,
      passed: Math.random() > 0.1 ? 1 : 0,
      failed: Math.random() > 0.1 ? 0 : 1,
      skipped: 0,
      duration: options?.duration || 120,
      coverage: 0,
      reports: [],
    };

    if (!result.passed) {
      result.errorDetails = ['Performance degradation detected'];
    }

    this._testResults.set(result.id, result);
    return result;
  }

  runCodeAnalysis(sourceFiles: string[], tools: string[]): CodeQualityResult[] {
    const results: CodeQualityResult[] = [];

    for (const tool of tools) {
      const issues: CodeQualityIssue[] = [];
      const issueCount = Math.floor(Math.random() * 20);
      
      for (let i = 0; i < issueCount; i++) {
        const severities: CodeQualitySeverity[] = ['critical', 'high', 'medium', 'low', 'info'];
        issues.push({
          id: `issue-${++this._counter}`,
          file: sourceFiles[Math.floor(Math.random() * sourceFiles.length)] || 'unknown.ts',
          line: Math.floor(Math.random() * 500) + 1,
          column: Math.floor(Math.random() * 100) + 1,
          severity: severities[Math.floor(Math.random() * severities.length)],
          message: `Code quality issue detected by ${tool}`,
          rule: `${tool}-rule-${i + 1}`,
        });
      }

      const result: CodeQualityResult = {
        id: `cq-${++this._counter}`,
        tool,
        issues,
        scannedFiles: sourceFiles.length,
        duration: Math.floor(Math.random() * 30) + 10,
      };
      results.push(result);
      this._codeQualityResults.set(result.id, result);
    }

    return results;
  }

  createEnvironment(name: string, type: EnvironmentType, options?: {
    region?: string;
    variables?: Record<string, string>;
    resources?: string[];
    isProduction?: boolean;
  }): Environment {
    const env: Environment = {
      id: `env-${++this._counter}`,
      name,
      type,
      region: options?.region || 'us-east-1',
      resources: options?.resources || [],
      variables: options?.variables || {},
      isProduction: options?.isProduction || type === 'production',
      createdAt: Date.now(),
    };
    this._environments.set(env.id, env);
    this._logAudit('CREATE_ENVIRONMENT', 'environment', env.id, { name, type });
    return env;
  }

  createDeployment(name: string, projectId: string, environmentId: string, artifactId: string, strategy: DeploymentStrategy, options?: {
    canaryConfig?: CanaryConfig;
    blueGreenConfig?: BlueGreenConfig;
  }): Deployment {
    const environment = this._environments.get(environmentId);
    const artifact = this._artifacts.get(artifactId);
    
    if (!environment) throw new Error(`Environment ${environmentId} not found`);
    if (!artifact) throw new Error(`Artifact ${artifactId} not found`);

    const deployment: Deployment = {
      id: `deploy-${++this._counter}`,
      name,
      projectId,
      environment,
      artifact,
      strategy,
      status: 'deploying',
      startedAt: Date.now(),
      duration: 0,
      canaryConfig: strategy === 'canary' ? options?.canaryConfig || {
        percentage: 10,
        steps: [{ percentage: 10, duration: 300 }, { percentage: 50, duration: 600 }, { percentage: 100, duration: 0 }],
      } : undefined,
      blueGreenConfig: strategy === 'blue-green' ? options?.blueGreenConfig : undefined,
    };

    const deployDuration = this._executeDeployment(deployment);
    deployment.duration = deployDuration;
    deployment.finishedAt = Date.now();
    deployment.status = 'deployed';

    this._deployments.set(deployment.id, deployment);
    this._logAudit('DEPLOYMENT_COMPLETED', 'deployment', deployment.id, { environment: environment.name, strategy });
    
    this.startMonitoring(deployment.id);
    return deployment;
  }

  private _executeDeployment(deployment: Deployment): number {
    switch (deployment.strategy) {
      case 'canary':
        return this._executeCanaryDeployment(deployment);
      case 'blue-green':
        return this._executeBlueGreenDeployment(deployment);
      case 'rolling':
        return Math.floor(Math.random() * 120) + 60;
      case 'recreate':
        return Math.floor(Math.random() * 60) + 30;
      default:
        return 60;
    }
  }

  private _executeCanaryDeployment(deployment: Deployment): number {
    const config = deployment.canaryConfig;
    if (!config) return 60;

    let duration = 0;
    for (const step of config.steps) {
      duration += step.duration;
      if (config.healthCheckUrl) {
        duration += 30;
      }
    }
    return duration;
  }

  private _executeBlueGreenDeployment(deployment: Deployment): number {
    const config = deployment.blueGreenConfig;
    if (!config) return 60;

    let duration = 120;
    if (config.switchTraffic) {
      duration += 30;
    }
    return duration;
  }

  rollbackDeployment(deploymentId: string, reason: string): boolean {
    const deployment = this._deployments.get(deploymentId);
    if (!deployment) return false;

    deployment.status = 'rolled_back';
    deployment.rollbackInfo = {
      previousDeploymentId: `deploy-${this._counter - 1}`,
      reason,
      rolledBackAt: Date.now(),
    };

    this._logAudit('DEPLOYMENT_ROLLBACK', 'deployment', deploymentId, { reason });
    return true;
  }

  startMonitoring(deploymentId: string): DeploymentMonitor {
    const metrics: MonitorMetric[] = [
      { name: 'cpu_usage', value: Math.floor(Math.random() * 40) + 10, threshold: { warning: 70, critical: 90 }, status: 'ok', timestamp: Date.now() },
      { name: 'memory_usage', value: Math.floor(Math.random() * 50) + 20, threshold: { warning: 80, critical: 95 }, status: 'ok', timestamp: Date.now() },
      { name: 'request_latency', value: Math.floor(Math.random() * 100) + 50, threshold: { warning: 500, critical: 1000 }, status: 'ok', timestamp: Date.now() },
      { name: 'error_rate', value: Math.random() * 2, threshold: { warning: 5, critical: 10 }, status: 'ok', timestamp: Date.now() },
      { name: 'uptime', value: 100, threshold: { warning: 99, critical: 95 }, status: 'ok', timestamp: Date.now() },
    ];

    const alerts: Alert[] = [];
    for (const metric of metrics) {
      if (metric.value >= metric.threshold.critical) {
        alerts.push({
          id: `alert-${++this._counter}`,
          level: 'critical',
          message: `${metric.name} exceeded critical threshold`,
          metric: metric.name,
          threshold: metric.threshold.critical,
          actual: metric.value,
          triggeredAt: Date.now(),
        });
      } else if (metric.value >= metric.threshold.warning) {
        alerts.push({
          id: `alert-${++this._counter}`,
          level: 'warning',
          message: `${metric.name} exceeded warning threshold`,
          metric: metric.name,
          threshold: metric.threshold.warning,
          actual: metric.value,
          triggeredAt: Date.now(),
        });
      }
    }

    const monitor: DeploymentMonitor = {
      deploymentId,
      metrics,
      alerts,
      healthStatus: alerts.some(a => a.level === 'critical') ? 'unhealthy' : 
                    alerts.some(a => a.level === 'warning') ? 'degrading' : 'healthy',
      monitoredSince: Date.now(),
    };

    this._monitors.set(deploymentId, monitor);
    return monitor;
  }

  getDeploymentStatus(deploymentId: string): DeploymentMonitor | null {
    return this._monitors.get(deploymentId) || null;
  }

  acknowledgeAlert(alertId: string): boolean {
    for (const monitor of this._monitors.values()) {
      const alert = monitor.alerts.find(a => a.id === alertId);
      if (alert) {
        alert.acknowledged = true;
        return true;
      }
    }
    return false;
  }

  applyInfrastructure(config: Record<string, unknown>, provider: 'aws' | 'azure' | 'gcp' | 'kubernetes'): InfrastructureResource[] {
    const resources: InfrastructureResource[] = [];

    for (const [name, configItem] of Object.entries(config)) {
      const resource: InfrastructureResource = {
        id: `resource-${++this._counter}`,
        name,
        type: typeof configItem === 'object' ? (configItem as any).type || 'resource' : 'resource',
        provider,
        state: 'running',
        configuration: configItem as Record<string, unknown>,
        outputs: {},
        createdAt: Date.now(),
      };
      resources.push(resource);
      this._infrastructureResources.set(resource.id, resource);
    }

    this._logAudit('INFRASTRUCTURE_APPLIED', 'infrastructure', 'batch', { provider, count: resources.length });
    return resources;
  }

  createPullRequest(repositoryId: string, title: string, sourceBranch: string, targetBranch: string, author: string): PullRequest {
    const repo = this._repositories.get(repositoryId);
    if (!repo) throw new Error(`Repository ${repositoryId} not found`);

    const pr: PullRequest = {
      id: `pr-${++this._counter}`,
      repositoryId,
      title,
      sourceBranch,
      targetBranch,
      author,
      status: 'open',
      reviews: [],
      commits: [],
      checks: [],
      createdAt: Date.now(),
    };

    this._pullRequests.set(pr.id, pr);
    this._logAudit('CREATE_PULL_REQUEST', 'pull_request', pr.id, { title, sourceBranch, targetBranch });
    return pr;
  }

  addReview(prId: string, reviewer: string, status: Review['status'], comments?: ReviewComment[]): Review | null {
    const pr = this._pullRequests.get(prId);
    if (!pr) return null;

    const review: Review = {
      id: `review-${++this._counter}`,
      reviewer,
      status,
      comments: comments || [],
      submittedAt: Date.now(),
    };
    pr.reviews.push(review);
    return review;
  }

  runPRChecks(prId: string): CheckRun[] {
    const pr = this._pullRequests.get(prId);
    if (!pr) return [];

    const checks: CheckRun[] = [
      this._createCheckRun('build'),
      this._createCheckRun('unit-tests'),
      this._createCheckRun('code-quality'),
      this._createCheckRun('security-scan'),
    ];

    pr.checks.push(...checks);
    return checks;
  }

  private _createCheckRun(name: string): CheckRun {
    const statuses: CheckRun['conclusion'][] = ['success', 'success', 'success', 'success', 'failure'];
    
    return {
      id: `check-${++this._counter}`,
      name,
      status: 'completed',
      conclusion: statuses[Math.floor(Math.random() * statuses.length)],
      startedAt: Date.now() - 60000,
      completedAt: Date.now(),
    };
  }

  mergePullRequest(prId: string): boolean {
    const pr = this._pullRequests.get(prId);
    if (!pr) return false;

    const hasApprovedReview = pr.reviews.some(r => r.status === 'approved');
    const allChecksPassed = pr.checks.every(c => c.conclusion === 'success');

    if (hasApprovedReview && allChecksPassed) {
      pr.status = 'merged';
      pr.updatedAt = Date.now();
      this._logAudit('MERGE_PULL_REQUEST', 'pull_request', prId, {});
      return true;
    }

    return false;
  }

  createRelease(name: string, version: string, projectId: string, artifacts: Artifact[], options?: {
    changelog?: string;
    environments?: string[];
  }): Release {
    const releasedEnvironments: ReleasedEnvironment[] = (options?.environments || []).map(envId => {
      const env = this._environments.get(envId);
      return {
        environmentId: envId,
        environmentName: env?.name || 'unknown',
        status: 'pending',
      };
    });

    const release: Release = {
      id: `release-${++this._counter}`,
      name,
      version,
      projectId,
      artifacts,
      changelog: options?.changelog || '',
      status: 'pending',
      environments: releasedEnvironments,
      createdAt: Date.now(),
    };

    this._releases.set(release.id, release);
    this._logAudit('CREATE_RELEASE', 'release', release.id, { version, projectId });
    return release;
  }

  releaseToEnvironment(releaseId: string, environmentId: string): boolean {
    const release = this._releases.get(releaseId);
    const environment = this._environments.get(environmentId);
    
    if (!release || !environment) return false;

    const releasedEnv = release.environments.find(e => e.environmentId === environmentId);
    if (!releasedEnv) return false;

    const artifact = release.artifacts[0];
    const deployment = this.createDeployment(
      `release-${release.version}`,
      release.projectId,
      environmentId,
      artifact.id,
      environment.isProduction ? 'canary' : 'rolling'
    );

    releasedEnv.status = 'deployed';
    releasedEnv.deploymentId = deployment.id;
    releasedEnv.deployedAt = Date.now();

    if (release.environments.every(e => e.status === 'deployed')) {
      release.status = 'released';
      release.releasedAt = Date.now();
    }

    return true;
  }

  getPipelineMetrics(): PipelineMetrics {
    const pipelines = Array.from(this._pipelines.values());
    const deployments = Array.from(this._deployments.values());
    const testResults = Array.from(this._testResults.values());
    const codeQualityResults = Array.from(this._codeQualityResults.values());

    let totalIssues = 0;
    for (const result of codeQualityResults) {
      totalIssues += result.issues.length;
    }

    let totalCoverage = 0;
    const coverageResults = testResults.filter(r => r.type === 'unit');
    if (coverageResults.length > 0) {
      totalCoverage = coverageResults.reduce((sum, r) => sum + r.coverage, 0) / coverageResults.length;
    }

    let activeAlerts = 0;
    for (const monitor of this._monitors.values()) {
      activeAlerts += monitor.alerts.filter(a => !a.acknowledged).length;
    }

    return {
      totalPipelines: pipelines.length,
      successfulPipelines: pipelines.filter(p => p.status === 'succeeded').length,
      failedPipelines: pipelines.filter(p => p.status === 'failed').length,
      averageDuration: pipelines.length > 0 
        ? Math.round(pipelines.reduce((sum, p) => sum + p.duration, 0) / pipelines.length)
        : 0,
      totalBuilds: this._builds.size,
      totalDeployments: deployments.length,
      deploymentSuccessRate: deployments.length > 0
        ? Math.round((deployments.filter(d => d.status === 'deployed').length / deployments.length) * 100)
        : 0,
      averageTestCoverage: Math.round(totalCoverage),
      codeQualityIssues: totalIssues,
      activeAlerts,
    };
  }

  generatePipelineReport(pipelineId: string): {
    pipeline: Pipeline;
    build?: Build;
    testResults: TestResult[];
    codeQualityResults: CodeQualityResult[];
    deployments: Deployment[];
  } {
    const pipeline = this._pipelines.get(pipelineId);
    if (!pipeline) throw new Error(`Pipeline ${pipelineId} not found`);

    const build = Array.from(this._builds.values()).find(b => b.pipelineId === pipelineId);
    const testResults = Array.from(this._testResults.values()).filter(r => 
      r.id.startsWith('test-')
    );
    const codeQualityResults = Array.from(this._codeQualityResults.values()).filter(r => 
      r.id.startsWith('cq-')
    );
    const deployments = Array.from(this._deployments.values()).filter(d => 
      build && d.artifact.id === build.artifacts[0]?.id
    );

    return { pipeline, build, testResults, codeQualityResults, deployments };
  }

  private _logAudit(action: string, resourceType: string, resourceId: string, details: Record<string, unknown>): void {
    const log: AuditLog = {
      id: `audit-${++this._counter}`,
      action,
      resourceType,
      resourceId,
      actor: 'system',
      timestamp: Date.now(),
      details,
    };
    this._auditLogs.set(log.id, log);
    
    if (this._auditLogs.size > 10000) {
      const oldest = Array.from(this._auditLogs.keys()).sort()[0];
      this._auditLogs.delete(oldest);
    }
  }

  getAuditLogs(options?: {
    startTime?: number;
    endTime?: number;
    action?: string;
    resourceType?: string;
    actor?: string;
  }): AuditLog[] {
    let logs = Array.from(this._auditLogs.values());

    if (options?.startTime) {
      logs = logs.filter(l => l.timestamp >= options.startTime);
    }
    if (options?.endTime) {
      logs = logs.filter(l => l.timestamp <= options.endTime);
    }
    if (options?.action) {
      logs = logs.filter(l => l.action === options.action);
    }
    if (options?.resourceType) {
      logs = logs.filter(l => l.resourceType === options.resourceType);
    }
    if (options?.actor) {
      logs = logs.filter(l => l.actor === options.actor);
    }

    return logs.sort((a, b) => b.timestamp - a.timestamp);
  }

  toPacket(): DataPacket<{
    pipelines: Map<string, Pipeline>;
    deployments: Map<string, Deployment>;
    artifacts: Map<string, Artifact>;
    metrics: PipelineMetrics;
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['cloud_computing', 'DevOpsPipeline'],
      priority: 1,
      phase: 'devops_pipeline',
    };
    return {
      id: `devops-${Date.now().toString(36)}`,
      payload: {
        pipelines: this._pipelines,
        deployments: this._deployments,
        artifacts: this._artifacts,
        metrics: this.getPipelineMetrics(),
      },
      metadata,
    };
  }

  reset(): void {
    this._repositories = new Map();
    this._pipelines = new Map();
    this._builds = new Map();
    this._artifacts = new Map();
    this._testResults = new Map();
    this._codeQualityResults = new Map();
    this._deployments = new Map();
    this._environments = new Map();
    this._monitors = new Map();
    this._infrastructureResources = new Map();
    this._pullRequests = new Map();
    this._releases = new Map();
    this._auditLogs = new Map();
    this._counter = 0;
  }

  get pipelineCount(): number { return this._pipelines.size; }
  get artifactCount(): number { return this._artifacts.size; }
  get deploymentCount(): number { return this._deployments.size; }
  get environmentCount(): number { return this._environments.size; }
  get activeAlerts(): number {
    let count = 0;
    for (const monitor of this._monitors.values()) {
      count += monitor.alerts.filter(a => !a.acknowledged).length;
    }
    return count;
  }
}