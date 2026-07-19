import { DataPacket } from '../shared/types';

export interface ServiceInstance {
  readonly id: string;
  readonly serviceName: string;
  readonly host: string;
  readonly port: number;
  readonly status: 'healthy' | 'unhealthy' | 'degraded' | 'unknown';
  readonly metadata: Map<string, string>;
  readonly weight: number;
  readonly lastHeartbeat: number;
}

export interface HealthCheckResult {
  readonly instanceId: string;
  readonly healthy: boolean;
  readonly latency: number;
  readonly checkType: 'tcp' | 'http' | 'grpc' | 'custom';
  readonly timestamp: number;
}

export interface LoadBalanceResult {
  readonly serviceName: string;
  readonly instance: ServiceInstance | null;
  readonly algorithm: string;
  readonly availableInstances: number;
  readonly totalInstances: number;
}

export interface CircuitBreakerState {
  readonly serviceName: string;
  readonly state: 'closed' | 'open' | 'half-open';
  readonly failureCount: number;
  readonly successCount: number;
  readonly lastFailureTime: number;
  readonly threshold: number;
  readonly timeout: number;
}

export interface ServiceRegistry {
  readonly name: string;
  readonly type: 'zookeeper' | 'eureka' | 'consul' | 'etcd' | 'nacos';
  readonly services: Map<string, ServiceInstance[]>;
  readonly status: 'running' | 'stopped' | 'degraded';
}

export class ServiceDiscovery {
  private _services: Map<string, ServiceInstance[]> = new Map();
  private _history: string[] = [];
  private _counter = 0;
  private _registryType: string = 'consul';
  private _circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private _healthChecks: Map<string, HealthCheckResult> = new Map();
  private _loadBalanceAlgorithm: string = 'round-robin';
  private _lastResult: LoadBalanceResult | CircuitBreakerState | null = null;

  constructor() {
    this._initDefaultServices();
  }

  private _initDefaultServices(): void {
    const defaultServices = [
      { name: 'api-gateway', instances: 3 },
      { name: 'user-service', instances: 5 },
      { name: 'order-service', instances: 4 },
      { name: 'payment-service', instances: 3 },
      { name: 'notification-service', instances: 2 },
    ];
    defaultServices.forEach(svc => {
      const instances: ServiceInstance[] = [];
      for (let i = 0; i < svc.instances; i++) {
        instances.push({
          id: `${svc.name}-${i}`,
          serviceName: svc.name,
          host: `192.168.1.${100 + i}`,
          port: 8000 + i,
          status: 'healthy',
          metadata: new Map([['version', '1.0.0'], ['zone', 'us-east-1']]),
          weight: 100,
          lastHeartbeat: Date.now(),
        });
      }
      this._services.set(svc.name, instances);
    });
  }

  get serviceCount(): number {
    return this._services.size;
  }

  get instanceCount(): number {
    let count = 0;
    this._services.forEach(instances => { count += instances.length; });
    return count;
  }

  get history(): string[] {
    return [...this._history];
  }

  get registryType(): string {
    return this._registryType;
  }

  get circuitBreakerCount(): number {
    return this._circuitBreakers.size;
  }

  public registerService(
    serviceName: string,
    instance: { host: string; port: number; metadata?: Map<string, string>; weight?: number }
  ): {
    serviceName: string;
    instanceId: string;
    registered: boolean;
    totalInstances: number;
  } {
    const instanceId = `${serviceName}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const newInstance: ServiceInstance = {
      id: instanceId,
      serviceName,
      host: instance.host,
      port: instance.port,
      status: 'healthy',
      metadata: instance.metadata ?? new Map(),
      weight: instance.weight ?? 100,
      lastHeartbeat: Date.now(),
    };
    const existing = this._services.get(serviceName) ?? [];
    this._services.set(serviceName, [...existing, newInstance]);
    this._recordHistory(`registerService(service=${serviceName}, instance=${instanceId})`);
    return { serviceName, instanceId, registered: true, totalInstances: existing.length + 1 };
  }

  public deregisterService(
    serviceName: string,
    instanceId: string
  ): {
    serviceName: string;
    instanceId: string;
    deregistered: boolean;
    remainingInstances: number;
  } {
    const instances = this._services.get(serviceName) ?? [];
    const filtered = instances.filter(i => i.id !== instanceId);
    this._services.set(serviceName, filtered);
    const deregistered = instances.length !== filtered.length;
    this._recordHistory(`deregisterService(service=${serviceName}, instance=${instanceId}) -> ${deregistered}`);
    return { serviceName, instanceId, deregistered, remainingInstances: filtered.length };
  }

  public discoverService(
    serviceName: string
  ): {
    serviceName: string;
    instances: ServiceInstance[];
    healthyInstances: number;
    totalInstances: number;
  } {
    const instances = this._services.get(serviceName) ?? [];
    const healthyInstances = instances.filter(i => i.status === 'healthy').length;
    this._recordHistory(`discoverService(service=${serviceName}) -> ${healthyInstances}/${instances.length} healthy`);
    return { serviceName, instances, healthyInstances, totalInstances: instances.length };
  }

  public healthCheck(
    serviceName: string,
    instanceId: string,
    checkType: 'tcp' | 'http' | 'grpc' | 'custom',
    timeout: number
  ): HealthCheckResult {
    const healthy = Math.random() > 0.15;
    const latency = Math.floor(Math.random() * timeout * 0.5);
    const result: HealthCheckResult = {
      instanceId,
      healthy,
      latency,
      checkType,
      timestamp: Date.now(),
    };
    this._healthChecks.set(instanceId, result);
    const instances = this._services.get(serviceName) ?? [];
    const updated = instances.map(i =>
      i.id === instanceId ? { ...i, status: healthy ? 'healthy' : 'unhealthy', lastHeartbeat: Date.now() } : i
    );
    this._services.set(serviceName, updated);
    this._recordHistory(`healthCheck(service=${serviceName}, instance=${instanceId}, type=${checkType}) -> healthy=${healthy}, latency=${latency}ms`);
    return result;
  }

  public roundRobinLoadBalance(
    serviceName: string,
    requestCount: number
  ): LoadBalanceResult {
    const instances = (this._services.get(serviceName) ?? []).filter(i => i.status === 'healthy');
    const instance = instances.length > 0 ? instances[requestCount % instances.length] ?? null : null;
    const result: LoadBalanceResult = {
      serviceName,
      instance,
      algorithm: 'round-robin',
      availableInstances: instances.length,
      totalInstances: (this._services.get(serviceName) ?? []).length,
    };
    this._lastResult = result;
    this._loadBalanceAlgorithm = 'round-robin';
    this._recordHistory(`roundRobinLB(service=${serviceName}, req=${requestCount}) -> instance=${instance?.id ?? 'none'}`);
    return result;
  }

  public randomLoadBalance(
    serviceName: string
  ): LoadBalanceResult {
    const instances = (this._services.get(serviceName) ?? []).filter(i => i.status === 'healthy');
    const instance = instances.length > 0 ? instances[Math.floor(Math.random() * instances.length)] ?? null : null;
    const result: LoadBalanceResult = {
      serviceName,
      instance,
      algorithm: 'random',
      availableInstances: instances.length,
      totalInstances: (this._services.get(serviceName) ?? []).length,
    };
    this._lastResult = result;
    this._loadBalanceAlgorithm = 'random';
    this._recordHistory(`randomLB(service=${serviceName}) -> instance=${instance?.id ?? 'none'}`);
    return result;
  }

  public weightedRoundRobin(
    serviceName: string,
    weights: Map<string, number>
  ): LoadBalanceResult {
    const instances = (this._services.get(serviceName) ?? []).filter(i => i.status === 'healthy');
    let totalWeight = 0;
    const weightedInstances = instances.map(inst => {
      const weight = weights.get(inst.id) ?? inst.weight;
      totalWeight += weight;
      return { instance: inst, weight };
    });
    let instance: ServiceInstance | null = null;
    if (weightedInstances.length > 0 && totalWeight > 0) {
      let random = Math.random() * totalWeight;
      for (const wi of weightedInstances) {
        random -= wi.weight;
        if (random <= 0) {
          instance = wi.instance;
          break;
        }
      }
      if (!instance) {
        instance = weightedInstances[weightedInstances.length - 1]?.instance ?? null;
      }
    }
    const result: LoadBalanceResult = {
      serviceName,
      instance,
      algorithm: 'weighted-round-robin',
      availableInstances: instances.length,
      totalInstances: (this._services.get(serviceName) ?? []).length,
    };
    this._lastResult = result;
    this._loadBalanceAlgorithm = 'weighted-round-robin';
    this._recordHistory(`weightedRoundRobin(service=${serviceName}) -> instance=${instance?.id ?? 'none'}`);
    return result;
  }

  public leastConnections(
    serviceName: string,
    connections: Map<string, number>
  ): LoadBalanceResult {
    const instances = (this._services.get(serviceName) ?? []).filter(i => i.status === 'healthy');
    let minConn = Infinity;
    let selected: ServiceInstance | null = null;
    for (const inst of instances) {
      const conn = connections.get(inst.id) ?? 0;
      if (conn < minConn) {
        minConn = conn;
        selected = inst;
      }
    }
    const result: LoadBalanceResult = {
      serviceName,
      instance: selected,
      algorithm: 'least-connections',
      availableInstances: instances.length,
      totalInstances: (this._services.get(serviceName) ?? []).length,
    };
    this._lastResult = result;
    this._loadBalanceAlgorithm = 'least-connections';
    this._recordHistory(`leastConnections(service=${serviceName}) -> instance=${selected?.id ?? 'none'}, connections=${minConn}`);
    return result;
  }

  public consistentHashLoadBalance(
    serviceName: string,
    hashKey: string,
    virtualNodes: number
  ): LoadBalanceResult {
    const instances = (this._services.get(serviceName) ?? []).filter(i => i.status === 'healthy');
    let instance: ServiceInstance | null = null;
    if (instances.length > 0) {
      let hash = 0;
      for (let i = 0; i < hashKey.length; i++) {
        hash = ((hash << 5) - hash) + hashKey.charCodeAt(i);
        hash |= 0;
      }
      const index = Math.abs(hash) % instances.length;
      instance = instances[index] ?? null;
    }
    const result: LoadBalanceResult = {
      serviceName,
      instance,
      algorithm: 'consistent-hash',
      availableInstances: instances.length,
      totalInstances: (this._services.get(serviceName) ?? []).length,
    };
    this._lastResult = result;
    this._loadBalanceAlgorithm = 'consistent-hash';
    this._recordHistory(`consistentHashLB(service=${serviceName}, key=${hashKey}, vnodes=${virtualNodes}) -> instance=${instance?.id ?? 'none'}`);
    return result;
  }

  public circuitBreakerClosedToOpen(
    serviceName: string,
    failureCount: number,
    threshold: number,
    timeout: number
  ): CircuitBreakerState {
    const state: CircuitBreakerState = {
      serviceName,
      state: failureCount >= threshold ? 'open' : 'closed',
      failureCount,
      successCount: 0,
      lastFailureTime: Date.now(),
      threshold,
      timeout,
    };
    this._circuitBreakers.set(serviceName, state);
    this._lastResult = state;
    this._recordHistory(`circuitBreaker(service=${serviceName}, failures=${failureCount}/${threshold}) -> state=${state.state}`);
    return state;
  }

  public circuitBreakerOpenToHalfOpen(
    serviceName: string
  ): CircuitBreakerState {
    const existing = this._circuitBreakers.get(serviceName);
    const state: CircuitBreakerState = {
      serviceName,
      state: 'half-open',
      failureCount: existing?.failureCount ?? 0,
      successCount: 0,
      lastFailureTime: existing?.lastFailureTime ?? Date.now(),
      threshold: existing?.threshold ?? 5,
      timeout: existing?.timeout ?? 30000,
    };
    this._circuitBreakers.set(serviceName, state);
    this._lastResult = state;
    this._recordHistory(`circuitBreaker(service=${serviceName}) -> half-open`);
    return state;
  }

  public circuitBreakerHalfOpenToClosed(
    serviceName: string,
    successCount: number
  ): CircuitBreakerState {
    const existing = this._circuitBreakers.get(serviceName);
    const state: CircuitBreakerState = {
      serviceName,
      state: 'closed',
      failureCount: 0,
      successCount,
      lastFailureTime: existing?.lastFailureTime ?? Date.now(),
      threshold: existing?.threshold ?? 5,
      timeout: existing?.timeout ?? 30000,
    };
    this._circuitBreakers.set(serviceName, state);
    this._lastResult = state;
    this._recordHistory(`circuitBreaker(service=${serviceName}, successes=${successCount}) -> closed`);
    return state;
  }

  public fallback(
    serviceName: string,
    fallbackType: 'default' | 'cache' | 'degraded' | 'error'
  ): {
    serviceName: string;
    fallbackType: string;
    triggered: boolean;
    responseTime: number;
  } {
    const triggered = true;
    const responseTime = 5 + Math.floor(Math.random() * 20);
    this._recordHistory(`fallback(service=${serviceName}, type=${fallbackType}) -> triggered=${triggered}`);
    return { serviceName, fallbackType, triggered, responseTime };
  }

  public serviceDegradation(
    serviceName: string,
    level: 0 | 1 | 2 | 3
  ): {
    serviceName: string;
    level: number;
    featuresDisabled: string[];
    degraded: boolean;
  } {
    const featuresByLevel: Record<number, string[]> = {
      0: [],
      1: ['analytics', 'logging'],
      2: ['analytics', 'logging', 'recommendations'],
      3: ['analytics', 'logging', 'recommendations', 'search'],
    };
    const featuresDisabled = featuresByLevel[level] ?? [];
    const degraded = level > 0;
    const instances = this._services.get(serviceName) ?? [];
    const updated = instances.map(i => ({ ...i, status: degraded ? 'degraded' as const : 'healthy' as const }));
    this._services.set(serviceName, updated);
    this._recordHistory(`serviceDegradation(service=${serviceName}, level=${level}) -> disabled=${featuresDisabled.length} features`);
    return { serviceName, level, featuresDisabled, degraded };
  }

  public zookeeperRegistry(
    zkServers: string[],
    namespace: string,
    services: { name: string; instances: number }[]
  ): {
    type: string;
    servers: string[];
    namespace: string;
    services: number;
    sessionTimeout: number;
  } {
    services.forEach(svc => {
      const instances: ServiceInstance[] = [];
      for (let i = 0; i < svc.instances; i++) {
        instances.push({
          id: `${svc.name}-${i}`,
          serviceName: svc.name,
          host: `10.0.0.${i + 1}`,
          port: 8080 + i,
          status: 'healthy',
          metadata: new Map(),
          weight: 100,
          lastHeartbeat: Date.now(),
        });
      }
      this._services.set(svc.name, instances);
    });
    this._registryType = 'zookeeper';
    this._recordHistory(`zookeeperRegistry(servers=${zkServers.length}, ns=${namespace}, services=${services.length})`);
    return { type: 'zookeeper', servers: zkServers, namespace, services: services.length, sessionTimeout: 30000 };
  }

  public consulRegistry(
    consulAddress: string,
    datacenter: string,
    services: { name: string; instances: number; tags: string[] }[]
  ): {
    type: string;
    address: string;
    datacenter: string;
    services: number;
    tags: string[];
  } {
    const allTags: string[] = [];
    services.forEach(svc => {
      const instances: ServiceInstance[] = [];
      for (let i = 0; i < svc.instances; i++) {
        instances.push({
          id: `${svc.name}-${i}`,
          serviceName: svc.name,
          host: `172.16.0.${i + 1}`,
          port: 9000 + i,
          status: 'healthy',
          metadata: new Map(svc.tags.map(t => [t, 'true'])),
          weight: 100,
          lastHeartbeat: Date.now(),
        });
      }
      this._services.set(svc.name, instances);
      allTags.push(...svc.tags);
    });
    this._registryType = 'consul';
    this._recordHistory(`consulRegistry(addr=${consulAddress}, dc=${datacenter}, services=${services.length})`);
    return { type: 'consul', address: consulAddress, datacenter, services: services.length, tags: [...new Set(allTags)] };
  }

  public nacosRegistry(
    nacosServers: string[],
    namespace: string,
    group: string,
    services: { name: string; instances: number; cluster: string }[]
  ): {
    type: string;
    servers: string[];
    namespace: string;
    group: string;
    services: number;
  } {
    services.forEach(svc => {
      const instances: ServiceInstance[] = [];
      for (let i = 0; i < svc.instances; i++) {
        instances.push({
          id: `${svc.name}-${i}`,
          serviceName: svc.name,
          host: `10.10.0.${i + 1}`,
          port: 7000 + i,
          status: 'healthy',
          metadata: new Map([['cluster', svc.cluster]]),
          weight: 100,
          lastHeartbeat: Date.now(),
        });
      }
      this._services.set(svc.name, instances);
    });
    this._registryType = 'nacos';
    this._recordHistory(`nacosRegistry(servers=${nacosServers.length}, ns=${namespace}, group=${group}, services=${services.length})`);
    return { type: 'nacos', servers: nacosServers, namespace, group, services: services.length };
  }

  public toPacket(): DataPacket<{
    serviceCount: number;
    instanceCount: number;
    history: string[];
    registryType: string;
    circuitBreakers: number;
    loadBalanceAlgorithm: string;
  }> {
    const payload = {
      serviceCount: this._services.size,
      instanceCount: this.instanceCount,
      history: [...this._history],
      registryType: this._registryType,
      circuitBreakers: this._circuitBreakers.size,
      loadBalanceAlgorithm: this._loadBalanceAlgorithm,
    };
    this._counter++;
    return {
      id: `service-discovery-${Date.now()}-${this._counter}`,
      payload,
      metadata: {
        createdAt: Date.now(),
        route: ['distributed_systems', 'service_discovery', 'result'],
        priority: 0.8,
        phase: 'service-resolution',
      },
    };
  }

  public reset(): void {
    this._services.clear();
    this._history = [];
    this._counter = 0;
    this._registryType = 'consul';
    this._circuitBreakers.clear();
    this._healthChecks.clear();
    this._loadBalanceAlgorithm = 'round-robin';
    this._lastResult = null;
    this._initDefaultServices();
  }

  private _recordHistory(entry: string): void {
    this._counter++;
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
  }
}
