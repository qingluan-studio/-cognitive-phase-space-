import { DataPacket, PacketMeta } from '../shared/types';

export interface ServerlessFunction {
  name: string;
  runtime: string;
  trigger: string;
  memory: number;
  timeout: number;
}

export interface EventSource {
  type: string;
  source: string;
  rule: string;
  target: string;
}

export class ServerlessArch {
  private _functions: Map<string, ServerlessFunction> = new Map();
  private _events: EventSource[] = [];
  private _counter = 0;

  createFunction(name: string, code: string, runtime: string = 'nodejs'): ServerlessFunction {
    const fn: ServerlessFunction = {
      name,
      runtime,
      trigger: 'http',
      memory: 256,
      timeout: 30,
    };
    this._functions.set(name, fn);
    return fn;
  }

  invokeFunction(name: string, event: Record<string, unknown>): { name: string; result: unknown; duration: number } {
    return { name, result: { statusCode: 200, body: 'ok' }, duration: 150 };
  }

  addTrigger(funcName: string, triggerType: string, config: Record<string, unknown>): EventSource {
    const event: EventSource = {
      type: triggerType,
      source: String(config.source || 'unknown'),
      rule: String(config.rule || 'default'),
      target: funcName,
    };
    this._events.push(event);
    return event;
  }

  apiGateway(stage: string, routes: Record<string, string>): { stage: string; routes: Record<string, string>; url: string } {
    return {
      stage,
      routes,
      url: `https://api-${++this._counter}.execute-api.us-east-1.amazonaws.com/${stage}`,
    };
  }

  eventBridge(rules: string[], buses: string[]): { rules: string[]; buses: string[]; events: number } {
    return { rules, buses, events: 1000 };
  }

  stepFunctions(states: string[], definition: Record<string, unknown>): { name: string; states: string[]; status: string } {
    return { name: `sfn-${++this._counter}`, states, status: 'created' };
  }

  s3Trigger(bucket: string, event: string, functionName: string): EventSource {
    return this.addTrigger(functionName, 's3', { source: bucket, rule: event });
  }

  scheduledEvent(schedule: string, functionName: string): EventSource {
    return this.addTrigger(functionName, 'scheduled', { source: 'cloudwatch', rule: schedule });
  }

  coldStartOptimization(functionName: string, strategy: string): { function: string; strategy: string; improvement: number } {
    return { function: functionName, strategy, improvement: 50 };
  }

  provisionedConcurrency(func: string, count: number): { function: string; concurrency: number; cost: number } {
    return { function: func, concurrency: count, cost: count * 0.05 };
  }

  costOptimization(functions: string[]): { functions: string[]; savings: number; recommendations: string[] } {
    return {
      functions,
      savings: functions.length * 10,
      recommendations: ['reduce_memory', 'optimize_timeout'],
    };
  }

  functionLayers(layers: string[], functions: string[]): { layers: string[]; functions: string[]; sizeReduction: number } {
    return { layers, functions, sizeReduction: 80 };
  }

  observability(functions: string[], metrics: string[]): { functions: string[]; metrics: string[]; dashboards: number } {
    return { functions, metrics, dashboards: 2 };
  }

  toPacket(): DataPacket<{
    functions: Map<string, ServerlessFunction>;
    events: EventSource[];
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
      },
      metadata,
    };
  }

  reset(): void {
    this._functions = new Map();
    this._events = [];
    this._counter = 0;
  }

  get functionCount(): number { return this._functions.size; }
  get eventCount(): number { return this._events.length; }
}
