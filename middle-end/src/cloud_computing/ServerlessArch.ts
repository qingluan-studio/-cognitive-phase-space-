import { DataPacket, PacketMeta } from '../shared/types';

export interface ServerlessFunction {
  name: string;
  runtime: string;
  trigger: string;
  memory: number;
  timeout: number;
  arn: string;
  handler: string;
  role: string;
  layers: string[];
  environment: Record<string, string>;
  vpcConfig?: { subnetIds: string[]; securityGroupIds: string[] };
  provisionedConcurrency?: number;
  reservedConcurrency?: number;
  lastModified: number;
  version: string;
  aliases: string[];
}

export interface EventSource {
  id: string;
  type: string;
  source: string;
  rule: string;
  target: string;
  enabled: boolean;
  batchSize: number;
  startingPosition?: string;
}

export interface APIGatewayRoute {
  path: string;
  method: string;
  integration: string;
  functionName: string;
  authorizationType: string;
  apiKeyRequired: boolean;
}

export interface StepFunctionState {
  id: string;
  name: string;
  type: string;
  resource?: string;
  next?: string;
  end?: boolean;
  parameters?: Record<string, unknown>;
}

export interface StepFunctionExecution {
  executionId: string;
  stateMachineArn: string;
  status: string;
  startDate: number;
  stopDate?: number;
  input?: string;
  output?: string;
}

export interface LambdaLayer {
  name: string;
  arn: string;
  compatibleRuntimes: string[];
  size: number;
  version: number;
  description: string;
}

export interface CloudWatchEventRule {
  name: string;
  scheduleExpression: string;
  targets: string[];
  state: string;
}

export interface CloudWatchLog {
  requestId: string;
  timestamp: number;
  level: string;
  message: string;
  functionName: string;
}

export interface FunctionMetrics {
  invocations: number;
  errors: number;
  duration: number;
  throttles: number;
  coldStarts: number;
  memoryUsed: number;
}

export class ServerlessArch {
  private _functions: Map<string, ServerlessFunction> = new Map();
  private _events: EventSource[] = [];
  private _layers: Map<string, LambdaLayer> = new Map();
  private _apiGateways: Map<string, APIGatewayRoute[]> = new Map();
  private _stepFunctions: Map<string, StepFunctionState[]> = new Map();
  private _executions: Map<string, StepFunctionExecution[]> = new Map();
  private _eventRules: Map<string, CloudWatchEventRule> = new Map();
  private _logs: CloudWatchLog[] = [];
  private _counter = 0;
  private _regions = ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1'];

  get functionCount(): number { return this._functions.size; }
  get eventCount(): number { return this._events.length; }
  get layerCount(): number { return this._layers.size; }
  get apiGatewayCount(): number { return this._apiGateways.size; }

  createFunction(name: string, code: string, runtime: string = 'nodejs', config?: {
    handler?: string;
    memory?: number;
    timeout?: number;
    role?: string;
    environment?: Record<string, string>;
    vpcConfig?: { subnetIds: string[]; securityGroupIds: string[] };
    layers?: string[];
  }): ServerlessFunction {
    const fn: ServerlessFunction = {
      name,
      runtime,
      trigger: 'http',
      memory: config?.memory ?? 256,
      timeout: config?.timeout ?? 30,
      arn: `arn:aws:lambda:us-east-1:123456789:function:${name}`,
      handler: config?.handler ?? 'index.handler',
      role: config?.role ?? `arn:aws:iam::123456789:role/lambda-role`,
      layers: config?.layers ?? [],
      environment: config?.environment ?? {},
      vpcConfig: config?.vpcConfig,
      lastModified: Date.now(),
      version: '$LATEST',
      aliases: [],
    };
    this._functions.set(name, fn);
    return fn;
  }

  invokeFunction(name: string, event: Record<string, unknown>, options?: {
    invocationType?: string;
    logType?: string;
    clientContext?: string;
  }): { name: string; result: unknown; duration: number; billedDuration: number; memoryUsed: number; logResult?: string } {
    const fn = this._functions.get(name);
    if (!fn) {
      throw new Error('Function not found');
    }

    const duration = Math.floor(Math.random() * fn.timeout * 1000) + 10;
    const billedDuration = Math.ceil(duration / 100) * 100;

    this._logs.push({
      requestId: `req-${Math.random().toString(36).substring(2, 10)}`,
      timestamp: Date.now(),
      level: 'INFO',
      message: `Function ${name} invoked`,
      functionName: name,
    });

    return {
      name,
      result: { statusCode: 200, body: JSON.stringify({ message: 'ok', event }) },
      duration,
      billedDuration,
      memoryUsed: Math.floor(fn.memory * 0.6 + Math.random() * fn.memory * 0.3),
      logResult: options?.logType === 'Tail' ? 'U1RBUlQ6IFJlcXVlc3QgaW52b2tlZC4=' : undefined,
    };
  }

  async invokeFunctionAsync(name: string, event: Record<string, unknown>): Promise<{ name: string; invocationId: string }> {
    return {
      name,
      invocationId: `invocation-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    };
  }

  listFunctions(filter?: { runtime?: string; region?: string }): ServerlessFunction[] {
    let result = Array.from(this._functions.values());
    if (filter?.runtime) result = result.filter(f => f.runtime === filter.runtime);
    return result;
  }

  getFunction(name: string): ServerlessFunction | null {
    return this._functions.get(name) || null;
  }

  updateFunction(name: string, updates: Partial<Pick<ServerlessFunction, 'runtime' | 'memory' | 'timeout' | 'handler' | 'environment' | 'layers'>>): ServerlessFunction | null {
    const fn = this._functions.get(name);
    if (!fn) return null;
    
    if (updates.runtime) fn.runtime = updates.runtime;
    if (updates.memory) fn.memory = updates.memory;
    if (updates.timeout) fn.timeout = updates.timeout;
    if (updates.handler) fn.handler = updates.handler;
    if (updates.environment) fn.environment = updates.environment;
    if (updates.layers) fn.layers = updates.layers;
    fn.lastModified = Date.now();
    
    return fn;
  }

  deleteFunction(name: string): boolean {
    return this._functions.delete(name);
  }

  addTrigger(funcName: string, triggerType: string, config: Record<string, unknown>): EventSource {
    const event: EventSource = {
      id: `event-${++this._counter}`,
      type: triggerType,
      source: String(config.source || 'unknown'),
      rule: String(config.rule || 'default'),
      target: funcName,
      enabled: true,
      batchSize: Number(config.batchSize) || 10,
      startingPosition: String(config.startingPosition) || 'LATEST',
    };
    this._events.push(event);
    return event;
  }

  removeTrigger(eventId: string): boolean {
    const index = this._events.findIndex(e => e.id === eventId);
    if (index >= 0) {
      this._events.splice(index, 1);
      return true;
    }
    return false;
  }

  listTriggers(funcName?: string): EventSource[] {
    if (funcName) {
      return this._events.filter(e => e.target === funcName);
    }
    return [...this._events];
  }

  enableTrigger(eventId: string): boolean {
    const event = this._events.find(e => e.id === eventId);
    if (!event) return false;
    event.enabled = true;
    return true;
  }

  disableTrigger(eventId: string): boolean {
    const event = this._events.find(e => e.id === eventId);
    if (!event) return false;
    event.enabled = false;
    return true;
  }

  apiGateway(stage: string, routes: APIGatewayRoute[]): { stage: string; routes: APIGatewayRoute[]; url: string; apiId: string } {
    const apiId = `api-${++this._counter}`;
    this._apiGateways.set(apiId, routes);
    
    return {
      stage,
      routes,
      url: `https://${apiId}.execute-api.us-east-1.amazonaws.com/${stage}`,
      apiId,
    };
  }

  createApiGatewayRoute(apiId: string, route: APIGatewayRoute): boolean {
    const routes = this._apiGateways.get(apiId);
    if (!routes) return false;
    routes.push(route);
    return true;
  }

  deleteApiGatewayRoute(apiId: string, path: string, method: string): boolean {
    const routes = this._apiGateways.get(apiId);
    if (!routes) return false;
    const index = routes.findIndex(r => r.path === path && r.method === method);
    if (index >= 0) {
      routes.splice(index, 1);
      return true;
    }
    return false;
  }

  createDomainName(domainName: string, certificateArn: string): { domainName: string; certificateArn: string; hostedZoneId: string; distributionDomainName: string } {
    return {
      domainName,
      certificateArn,
      hostedZoneId: 'Z2FDTNDATAQYW2',
      distributionDomainName: `${domainName}.cloudfront.net`,
    };
  }

  createBasePathMapping(domainName: string, basePath: string, apiId: string, stage: string): { domainName: string; basePath: string; apiId: string; stage: string } {
    return { domainName, basePath, apiId, stage };
  }

  eventBridge(rules: CloudWatchEventRule[], buses: string[]): { rules: CloudWatchEventRule[]; buses: string[]; events: number; ruleCount: number } {
    for (const rule of rules) {
      this._eventRules.set(rule.name, rule);
    }
    
    return {
      rules,
      buses,
      events: 1000,
      ruleCount: rules.length,
    };
  }

  createEventBridgeRule(name: string, scheduleExpression: string, targets: string[], state: string = 'ENABLED'): CloudWatchEventRule {
    const rule: CloudWatchEventRule = { name, scheduleExpression, targets, state };
    this._eventRules.set(name, rule);
    return rule;
  }

  updateEventBridgeRule(name: string, updates: Partial<CloudWatchEventRule>): CloudWatchEventRule | null {
    const rule = this._eventRules.get(name);
    if (!rule) return null;
    if (updates.scheduleExpression) rule.scheduleExpression = updates.scheduleExpression;
    if (updates.targets) rule.targets = updates.targets;
    if (updates.state) rule.state = updates.state;
    return rule;
  }

  deleteEventBridgeRule(name: string): boolean {
    return this._eventRules.delete(name);
  }

  listEventBridgeRules(): CloudWatchEventRule[] {
    return Array.from(this._eventRules.values());
  }

  stepFunctions(states: StepFunctionState[], definition: Record<string, unknown>): { name: string; states: StepFunctionState[]; status: string; arn: string } {
    const name = `sfn-${++this._counter}`;
    const arn = `arn:aws:states:us-east-1:123456789:stateMachine:${name}`;
    this._stepFunctions.set(name, states);
    this._executions.set(name, []);
    return { name, states, status: 'active', arn };
  }

  startExecution(stateMachineName: string, input?: string): StepFunctionExecution {
    const executions = this._executions.get(stateMachineName);
    if (!executions) {
      throw new Error('State machine not found');
    }

    const execution: StepFunctionExecution = {
      executionId: `exec-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      stateMachineArn: `arn:aws:states:us-east-1:123456789:stateMachine:${stateMachineName}`,
      status: 'RUNNING',
      startDate: Date.now(),
      input,
    };
    executions.push(execution);

    setTimeout(() => {
      execution.status = 'SUCCEEDED';
      execution.stopDate = Date.now();
      execution.output = JSON.stringify({ result: 'success' });
    }, 5000);

    return execution;
  }

  getExecutionHistory(stateMachineName: string, executionId: string): StepFunctionExecution | null {
    const executions = this._executions.get(stateMachineName);
    if (!executions) return null;
    return executions.find(e => e.executionId === executionId) || null;
  }

  listExecutions(stateMachineName: string, statusFilter?: string): StepFunctionExecution[] {
    const executions = this._executions.get(stateMachineName);
    if (!executions) return [];
    if (statusFilter) {
      return executions.filter(e => e.status === statusFilter);
    }
    return [...executions];
  }

  stopExecution(stateMachineName: string, executionId: string, cause?: string): boolean {
    const executions = this._executions.get(stateMachineName);
    if (!executions) return false;
    const execution = executions.find(e => e.executionId === executionId);
    if (!execution) return false;
    execution.status = 'ABORTED';
    execution.stopDate = Date.now();
    return true;
  }

  s3Trigger(bucket: string, event: string, functionName: string): EventSource {
    return this.addTrigger(functionName, 's3', { source: bucket, rule: event });
  }

  scheduledEvent(schedule: string, functionName: string): EventSource {
    return this.addTrigger(functionName, 'scheduled', { source: 'cloudwatch', rule: schedule });
  }

  snsTrigger(topicArn: string, functionName: string): EventSource {
    return this.addTrigger(functionName, 'sns', { source: topicArn, rule: 'all' });
  }

  kinesisTrigger(streamArn: string, functionName: string, batchSize?: number): EventSource {
    return this.addTrigger(functionName, 'kinesis', { source: streamArn, rule: 'stream', batchSize: batchSize || 100 });
  }

  dynamodbTrigger(tableName: string, functionName: string): EventSource {
    return this.addTrigger(functionName, 'dynamodb', { source: tableName, rule: 'stream', startingPosition: 'TRIM_HORIZON' });
  }

  coldStartOptimization(functionName: string, strategy: string): { function: string; strategy: string; improvement: number; warmDuration: number; coldDuration: number } {
    const coldDuration = 500 + Math.floor(Math.random() * 1000);
    const warmDuration = strategy === 'provisioned' ? 50 : strategy === 'keep-alive' ? 100 : coldDuration * 0.5;
    
    return {
      function: functionName,
      strategy,
      improvement: Math.round((1 - warmDuration / coldDuration) * 100),
      warmDuration,
      coldDuration,
    };
  }

  provisionedConcurrency(funcName: string, count: number, qualifier?: string): { function: string; qualifier: string; concurrency: number; status: string; cost: number } {
    const fn = this._functions.get(funcName);
    if (!fn) {
      throw new Error('Function not found');
    }

    fn.provisionedConcurrency = count;
    
    const hourlyRate = (fn.memory / 1024) * 0.0000021;
    const dailyCost = count * hourlyRate * 24;
    const monthlyCost = dailyCost * 30;

    return {
      function: funcName,
      qualifier: qualifier || '$LATEST',
      concurrency: count,
      status: 'IN_PROGRESS',
      cost: Math.round(monthlyCost * 100) / 100,
    };
  }

  reservedConcurrency(funcName: string, count: number): { function: string; concurrency: number; status: string } {
    const fn = this._functions.get(funcName);
    if (!fn) {
      throw new Error('Function not found');
    }

    fn.reservedConcurrency = count;
    return { function: funcName, concurrency: count, status: 'success' };
  }

  removeReservedConcurrency(funcName: string): boolean {
    const fn = this._functions.get(funcName);
    if (!fn) return false;
    fn.reservedConcurrency = undefined;
    return true;
  }

  costOptimization(functions: string[]): { functions: string[]; savings: number; recommendations: { functionName: string; currentMemory: number; recommendedMemory: number; savings: number }[] } {
    const recommendations: { functionName: string; currentMemory: number; recommendedMemory: number; savings: number }[] = [];
    let totalSavings = 0;

    for (const funcName of functions) {
      const fn = this._functions.get(funcName);
      if (!fn) continue;

      const currentMemory = fn.memory;
      const recommendedMemory = Math.max(128, currentMemory - 128);
      const hourlyCostCurrent = (currentMemory / 1024) * 0.0000166667;
      const hourlyCostRecommended = (recommendedMemory / 1024) * 0.0000166667;
      const monthlySavings = (hourlyCostCurrent - hourlyCostRecommended) * 24 * 30;

      recommendations.push({
        functionName: funcName,
        currentMemory,
        recommendedMemory,
        savings: Math.round(monthlySavings * 100) / 100,
      });
      totalSavings += monthlySavings;
    }

    return {
      functions,
      savings: Math.round(totalSavings * 100) / 100,
      recommendations,
    };
  }

  functionLayers(layers: { name: string; compatibleRuntimes: string[]; content: string }[], functions: string[]): { layers: LambdaLayer[]; functions: string[]; sizeReduction: number } {
    const createdLayers: LambdaLayer[] = [];

    for (const layer of layers) {
      const lambdaLayer: LambdaLayer = {
        name: layer.name,
        arn: `arn:aws:lambda:us-east-1:123456789:layer:${layer.name}:1`,
        compatibleRuntimes: layer.compatibleRuntimes,
        size: layer.content.length,
        version: 1,
        description: `${layer.name} layer`,
      };
      this._layers.set(layer.name, lambdaLayer);
      createdLayers.push(lambdaLayer);

      for (const funcName of functions) {
        const fn = this._functions.get(funcName);
        if (fn && !fn.layers.includes(lambdaLayer.arn)) {
          fn.layers.push(lambdaLayer.arn);
        }
      }
    }

    return {
      layers: createdLayers,
      functions,
      sizeReduction: 80,
    };
  }

  createLayer(name: string, compatibleRuntimes: string[], content: string, description?: string): LambdaLayer {
    const layer: LambdaLayer = {
      name,
      arn: `arn:aws:lambda:us-east-1:123456789:layer:${name}:1`,
      compatibleRuntimes,
      size: content.length,
      version: 1,
      description: description || `${name} layer`,
    };
    this._layers.set(name, layer);
    return layer;
  }

  getLayer(name: string, version?: number): LambdaLayer | null {
    return this._layers.get(name) || null;
  }

  listLayers(): LambdaLayer[] {
    return Array.from(this._layers.values());
  }

  deleteLayer(name: string): boolean {
    return this._layers.delete(name);
  }

  observability(functions: string[], metrics: string[]): { functions: string[]; metrics: string[]; dashboards: number; alarms: number; logs: number } {
    return {
      functions,
      metrics,
      dashboards: 2,
      alarms: functions.length * 3,
      logs: 1000,
    };
  }

  getFunctionLogs(functionName: string, startTime?: number, endTime?: number, limit?: number): CloudWatchLog[] {
    let logs = this._logs.filter(l => l.functionName === functionName);
    if (startTime) logs = logs.filter(l => l.timestamp >= startTime);
    if (endTime) logs = logs.filter(l => l.timestamp <= endTime);
    if (limit) logs = logs.slice(-limit);
    return logs;
  }

  putFunctionLog(functionName: string, message: string, level: string = 'INFO'): void {
    this._logs.push({
      requestId: `req-${Math.random().toString(36).substring(2, 10)}`,
      timestamp: Date.now(),
      level,
      message,
      functionName,
    });
  }

  getFunctionMetrics(functionName: string, period?: number, startTime?: number, endTime?: number): FunctionMetrics {
    return {
      invocations: Math.floor(Math.random() * 10000),
      errors: Math.floor(Math.random() * 100),
      duration: Math.floor(Math.random() * 200) + 50,
      throttles: Math.floor(Math.random() * 10),
      coldStarts: Math.floor(Math.random() * 50),
      memoryUsed: Math.floor(Math.random() * 200) + 128,
    };
  }

  createFunctionVersion(functionName: string, description?: string): { functionName: string; version: string; description?: string; createdDate: number } {
    const fn = this._functions.get(functionName);
    if (!fn) {
      throw new Error('Function not found');
    }

    const version = `v${++this._counter}`;
    fn.version = version;
    
    return {
      functionName,
      version,
      description,
      createdDate: Date.now(),
    };
  }

  createFunctionAlias(functionName: string, name: string, functionVersion: string, description?: string): { functionName: string; name: string; functionVersion: string; description?: string } {
    const fn = this._functions.get(functionName);
    if (!fn) {
      throw new Error('Function not found');
    }

    if (!fn.aliases.includes(name)) {
      fn.aliases.push(name);
    }

    return {
      functionName,
      name,
      functionVersion,
      description,
    };
  }

  updateFunctionAlias(functionName: string, name: string, functionVersion: string): { functionName: string; name: string; functionVersion: string } {
    return { functionName, name, functionVersion };
  }

  deleteFunctionAlias(functionName: string, name: string): boolean {
    const fn = this._functions.get(functionName);
    if (!fn) return false;
    fn.aliases = fn.aliases.filter(a => a !== name);
    return true;
  }

  listFunctionAliases(functionName: string): { name: string; functionVersion: string }[] {
    const fn = this._functions.get(functionName);
    if (!fn) return [];
    return fn.aliases.map(name => ({ name, functionVersion: fn.version }));
  }

  createLambdaAuthorizer(apiId: string, name: string, type: string, functionName: string): { id: string; name: string; type: string; functionName: string } {
    return {
      id: `auth-${++this._counter}`,
      name,
      type,
      functionName,
    };
  }

  createCorsConfiguration(apiId: string, origins: string[], methods: string[], headers: string[]): { apiId: string; origins: string[]; methods: string[]; headers: string[] } {
    return { apiId, origins, methods, headers };
  }

  createUsagePlan(name: string, apiStages: { apiId: string; stage: string }[], quota?: { limit: number; period: string }): { id: string; name: string; apiStages: typeof apiStages; quota?: typeof quota } {
    return {
      id: `usage-plan-${++this._counter}`,
      name,
      apiStages,
      quota,
    };
  }

  createApiKey(name: string, enabled: boolean = true): { id: string; name: string; value: string; enabled: boolean; createdDate: number } {
    return {
      id: `api-key-${++this._counter}`,
      name,
      value: `sk-${Math.random().toString(36).substring(2, 34)}`,
      enabled,
      createdDate: Date.now(),
    };
  }

  toPacket(): DataPacket<{
    functions: Map<string, ServerlessFunction>;
    events: EventSource[];
    layers: Map<string, LambdaLayer>;
    apiGateways: Map<string, APIGatewayRoute[]>;
    stepFunctions: Map<string, StepFunctionState[]>;
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['cloud_computing', 'ServerlessArch'],
      priority: 1,
      phase: 'serverless_arch',
    };
    return {
      id: `serverless-${Date.now().toString(36)}`,
      payload: {
        functions: this._functions,
        events: this._events,
        layers: this._layers,
        apiGateways: this._apiGateways,
        stepFunctions: this._stepFunctions,
      },
      metadata,
    };
  }

  reset(): void {
    this._functions = new Map();
    this._events = [];
    this._layers = new Map();
    this._apiGateways = new Map();
    this._stepFunctions = new Map();
    this._executions = new Map();
    this._eventRules = new Map();
    this._logs = [];
    this._counter = 0;
  }
}