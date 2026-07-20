import { DataPacket, PacketMeta } from '../shared/types';

export type PodPhase = 'Pending' | 'Running' | 'Succeeded' | 'Failed' | 'Unknown';
export type ServiceType = 'ClusterIP' | 'NodePort' | 'LoadBalancer' | 'ExternalName';
export type RestartPolicy = 'Always' | 'OnFailure' | 'Never';
export type VolumeType = 'emptyDir' | 'hostPath' | 'persistentVolumeClaim' | 'configMap' | 'secret' | 'downwardAPI';
export type ResourceType = 'cpu' | 'memory' | 'ephemeral-storage';

export interface KubernetesCluster {
  id: string;
  name: string;
  version: string;
  region: string;
  status: 'provisioning' | 'running' | 'degrading' | 'stopped';
  controlPlaneNodes: Node[];
  workerNodes: Node[];
  pods: number;
  services: number;
  deployments: number;
  namespaces: Namespace[];
  createdAt: number;
  tags: Record<string, string>;
}

export interface Node {
  name: string;
  status: 'Ready' | 'NotReady' | 'SchedulingDisabled';
  ipAddress: string;
  hostname: string;
  role: 'control-plane' | 'worker';
  resources: NodeResources;
  labels: Record<string, string>;
  taints: Taint[];
  pods: string[];
  createdAt: number;
}

export interface NodeResources {
  capacity: ResourceList;
  allocatable: ResourceList;
  used: ResourceList;
}

export interface ResourceList {
  cpu: string;
  memory: string;
  pods: string;
  'ephemeral-storage'?: string;
}

export interface Taint {
  key: string;
  value?: string;
  effect: 'NoSchedule' | 'PreferNoSchedule' | 'NoExecute';
}

export interface Namespace {
  name: string;
  status: 'Active' | 'Terminating';
  labels: Record<string, string>;
  annotations: Record<string, string>;
  resourceQuota?: ResourceQuotaSpec;
  createdAt: number;
}

export interface ResourceQuotaSpec {
  hard: Record<string, string>;
  scopes?: string[];
}

export interface Pod {
  name: string;
  namespace: string;
  phase: PodPhase;
  nodeName: string;
  containers: Container[];
  initContainers?: Container[];
  volumes?: Volume[];
  restartPolicy: RestartPolicy;
  nodeSelector?: Record<string, string>;
  tolerations?: Toleration[];
  labels: Record<string, string>;
  annotations: Record<string, string>;
  createdAt: number;
  startedAt?: number;
  finishedAt?: number;
}

export interface Container {
  name: string;
  image: string;
  imagePullPolicy: 'Always' | 'Never' | 'IfNotPresent';
  command?: string[];
  args?: string[];
  ports?: ContainerPort[];
  env?: EnvVar[];
  resources?: ResourceRequirements;
  volumeMounts?: VolumeMount[];
  livenessProbe?: Probe;
  readinessProbe?: Probe;
  startupProbe?: Probe;
  status: ContainerStatus;
}

export interface ContainerPort {
  name?: string;
  containerPort: number;
  protocol: 'TCP' | 'UDP' | 'SCTP';
  hostPort?: number;
}

export interface EnvVar {
  name: string;
  value?: string;
  valueFrom?: EnvVarSource;
}

export interface EnvVarSource {
  configMapKeyRef?: ConfigMapKeySelector;
  secretKeyRef?: SecretKeySelector;
  fieldRef?: ObjectFieldSelector;
}

export interface ConfigMapKeySelector {
  name: string;
  key: string;
  optional?: boolean;
}

export interface SecretKeySelector {
  name: string;
  key: string;
  optional?: boolean;
}

export interface ObjectFieldSelector {
  fieldPath: string;
}

export interface ResourceRequirements {
  limits?: Record<ResourceType, string>;
  requests?: Record<ResourceType, string>;
}

export interface VolumeMount {
  name: string;
  mountPath: string;
  readOnly?: boolean;
  subPath?: string;
}

export interface Probe {
  httpGet?: HTTPGetAction;
  tcpSocket?: TCPSocketAction;
  exec?: ExecAction;
  initialDelaySeconds?: number;
  periodSeconds?: number;
  timeoutSeconds?: number;
  successThreshold?: number;
  failureThreshold?: number;
}

export interface HTTPGetAction {
  path: string;
  port: number | string;
  host?: string;
  scheme?: 'HTTP' | 'HTTPS';
  httpHeaders?: { name: string; value: string }[];
}

export interface TCPSocketAction {
  port: number | string;
  host?: string;
}

export interface ExecAction {
  command: string[];
}

export interface ContainerStatus {
  ready: boolean;
  restartCount: number;
  image: string;
  imageID: string;
  containerID?: string;
  lastState?: ContainerState;
  state?: ContainerState;
}

export interface ContainerState {
  running?: { startedAt: number };
  terminated?: {
    exitCode: number;
    signal?: number;
    reason?: string;
    message?: string;
    startedAt?: number;
    finishedAt: number;
  };
  waiting?: {
    reason?: string;
    message?: string;
  };
}

export interface Volume {
  name: string;
  emptyDir?: EmptyDirVolumeSource;
  hostPath?: HostPathVolumeSource;
  persistentVolumeClaim?: PersistentVolumeClaimVolumeSource;
  configMap?: ConfigMapVolumeSource;
  secret?: SecretVolumeSource;
}

export interface EmptyDirVolumeSource {
  medium?: 'Memory';
  sizeLimit?: string;
}

export interface HostPathVolumeSource {
  path: string;
  type?: 'DirectoryOrCreate' | 'Directory' | 'FileOrCreate' | 'File' | 'Socket';
}

export interface PersistentVolumeClaimVolumeSource {
  claimName: string;
  readOnly?: boolean;
}

export interface ConfigMapVolumeSource {
  name: string;
  items?: { key: string; path: string }[];
  defaultMode?: number;
}

export interface SecretVolumeSource {
  secretName: string;
  items?: { key: string; path: string }[];
  defaultMode?: number;
}

export interface Toleration {
  key?: string;
  operator?: 'Exists' | 'Equal';
  value?: string;
  effect?: 'NoSchedule' | 'PreferNoSchedule' | 'NoExecute';
}

export interface Deployment {
  name: string;
  namespace: string;
  replicas: number;
  readyReplicas: number;
  availableReplicas: number;
  updatedReplicas: number;
  strategy: DeploymentStrategy;
  selector: LabelSelector;
  template: PodTemplateSpec;
  status: 'available' | 'progressing' | 'failed';
  revisionHistoryLimit: number;
  createdAt: number;
}

export interface DeploymentStrategy {
  type: 'RollingUpdate' | 'Recreate';
  rollingUpdate?: RollingUpdateDeployment;
}

export interface RollingUpdateDeployment {
  maxSurge?: string | number;
  maxUnavailable?: string | number;
}

export interface LabelSelector {
  matchLabels?: Record<string, string>;
  matchExpressions?: LabelSelectorRequirement[];
}

export interface LabelSelectorRequirement {
  key: string;
  operator: 'In' | 'NotIn' | 'Exists' | 'DoesNotExist';
  values?: string[];
}

export interface PodTemplateSpec {
  metadata: {
    labels: Record<string, string>;
    annotations?: Record<string, string>;
  };
  spec: PodSpec;
}

export interface PodSpec {
  containers: Container[];
  initContainers?: Container[];
  volumes?: Volume[];
  restartPolicy: RestartPolicy;
  nodeSelector?: Record<string, string>;
  tolerations?: Toleration[];
  imagePullSecrets?: string[];
  serviceAccountName?: string;
}

export interface Service {
  name: string;
  namespace: string;
  type: ServiceType;
  clusterIP?: string;
  externalIPs?: string[];
  loadBalancerIP?: string;
  loadBalancerSourceRanges?: string[];
  ports: ServicePort[];
  selector: Record<string, string>;
  sessionAffinity?: 'ClientIP' | 'None';
  sessionAffinityConfig?: {
    clientIP?: { timeoutSeconds: number };
  };
  createdAt: number;
}

export interface ServicePort {
  name?: string;
  protocol: 'TCP' | 'UDP' | 'SCTP';
  port: number;
  targetPort: number | string;
  nodePort?: number;
}

export interface Ingress {
  name: string;
  namespace: string;
  host?: string;
  tls?: IngressTLS[];
  rules: IngressRule[];
  status: IngressStatus;
  createdAt: number;
}

export interface IngressTLS {
  hosts?: string[];
  secretName?: string;
}

export interface IngressRule {
  host?: string;
  http?: HTTPIngressRuleValue;
}

export interface HTTPIngressRuleValue {
  paths: HTTPIngressPath[];
}

export interface HTTPIngressPath {
  path?: string;
  pathType?: 'Exact' | 'Prefix' | 'ImplementationSpecific';
  backend: IngressBackend;
}

export interface IngressBackend {
  service?: IngressServiceBackend;
}

export interface IngressServiceBackend {
  name: string;
  port: ServiceBackendPort;
}

export interface ServiceBackendPort {
  number?: number;
  name?: string;
}

export interface IngressStatus {
  loadBalancer?: {
    ingress?: { ip?: string; hostname?: string }[];
  };
}

export interface ConfigMap {
  name: string;
  namespace: string;
  data: Record<string, string>;
  binaryData?: Record<string, string>;
  immutable?: boolean;
  createdAt: number;
}

export interface Secret {
  name: string;
  namespace: string;
  type: string;
  data: Record<string, string>;
  immutable?: boolean;
  createdAt: number;
}

export interface PersistentVolume {
  name: string;
  capacity: Record<string, string>;
  accessModes: string[];
  persistentVolumeReclaimPolicy: 'Retain' | 'Delete' | 'Recycle';
  storageClassName: string;
  status: 'Available' | 'Bound' | 'Released' | 'Failed';
  claimRef?: { name: string; namespace: string };
  hostPath?: { path: string };
  createdAt: number;
}

export interface PersistentVolumeClaim {
  name: string;
  namespace: string;
  status: 'Pending' | 'Bound' | 'Lost';
  volumeName?: string;
  accessModes: string[];
  resources: {
    requests: Record<string, string>;
  };
  storageClassName: string;
  selector?: LabelSelector;
  createdAt: number;
}

export interface StatefulSet {
  name: string;
  namespace: string;
  replicas: number;
  readyReplicas: number;
  updateStrategy: StatefulSetUpdateStrategy;
  selector: LabelSelector;
  serviceName: string;
  template: PodTemplateSpec;
  volumeClaimTemplates?: PersistentVolumeClaim[];
  createdAt: number;
}

export interface StatefulSetUpdateStrategy {
  type: 'RollingUpdate' | 'OnDelete';
  rollingUpdate?: RollingUpdateStatefulSetStrategy;
}

export interface RollingUpdateStatefulSetStrategy {
  partition?: number;
}

export interface DaemonSet {
  name: string;
  namespace: string;
  desiredNumberScheduled: number;
  currentNumberScheduled: number;
  readyNumber: number;
  availableNumber: number;
  updatedNumberScheduled: number;
  selector: LabelSelector;
  template: PodTemplateSpec;
  updateStrategy: DaemonSetUpdateStrategy;
  createdAt: number;
}

export interface DaemonSetUpdateStrategy {
  type: 'RollingUpdate' | 'OnDelete';
  rollingUpdate?: RollingUpdateDaemonSet;
}

export interface RollingUpdateDaemonSet {
  maxUnavailable?: number | string;
  maxSurge?: number | string;
}

export interface HorizontalPodAutoscaler {
  name: string;
  namespace: string;
  scaleTargetRef: {
    apiVersion: string;
    kind: string;
    name: string;
  };
  minReplicas: number;
  maxReplicas: number;
  currentReplicas: number;
  desiredReplicas: number;
  metrics: MetricSpec[];
  createdAt: number;
}

export interface MetricSpec {
  type: 'Resource' | 'Pods' | 'Object' | 'External';
  resource?: ResourceMetricSource;
  pods?: PodsMetricSource;
}

export interface ResourceMetricSource {
  name: ResourceType;
  target: MetricTarget;
}

export interface MetricTarget {
  type: 'Utilization' | 'AverageValue';
  averageUtilization?: number;
  averageValue?: string;
}

export interface PodsMetricSource {
  metric: {
    name: string;
  };
  target: MetricTarget;
}

export interface Job {
  name: string;
  namespace: string;
  parallelism: number;
  completions: number;
  active: number;
  succeeded: number;
  failed: number;
  template: PodTemplateSpec;
  backoffLimit: number;
  activeDeadlineSeconds?: number;
  createdAt: number;
}

export interface CronJob {
  name: string;
  namespace: string;
  schedule: string;
  concurrencyPolicy: 'Allow' | 'Forbid' | 'Replace';
  suspend: boolean;
  jobTemplate: JobTemplateSpec;
  successfulJobsHistoryLimit: number;
  failedJobsHistoryLimit: number;
  createdAt: number;
}

export interface JobTemplateSpec {
  spec: JobSpec;
}

export interface JobSpec {
  template: PodTemplateSpec;
  parallelism?: number;
  completions?: number;
  backoffLimit?: number;
}

export interface ClusterMetrics {
  totalNodes: number;
  readyNodes: number;
  totalPods: number;
  runningPods: number;
  pendingPods: number;
  failedPods: number;
  cpuUsage: number;
  memoryUsage: number;
  deployments: number;
  services: number;
}

export class ContainerOrchestration {
  private _clusters: Map<string, KubernetesCluster> = new Map();
  private _nodes: Map<string, Node> = new Map();
  private _namespaces: Map<string, Namespace> = new Map();
  private _pods: Map<string, Pod> = new Map();
  private _deployments: Map<string, Deployment> = new Map();
  private _services: Map<string, Service> = new Map();
  private _ingresses: Map<string, Ingress> = new Map();
  private _configMaps: Map<string, ConfigMap> = new Map();
  private _secrets: Map<string, Secret> = new Map();
  private _persistentVolumes: Map<string, PersistentVolume> = new Map();
  private _persistentVolumeClaims: Map<string, PersistentVolumeClaim> = new Map();
  private _statefulSets: Map<string, StatefulSet> = new Map();
  private _daemonSets: Map<string, DaemonSet> = new Map();
  private _hpas: Map<string, HorizontalPodAutoscaler> = new Map();
  private _jobs: Map<string, Job> = new Map();
  private _cronJobs: Map<string, CronJob> = new Map();
  private _counter = 0;

  createCluster(name: string, options?: {
    version?: string;
    region?: string;
    controlPlaneNodes?: number;
    workerNodes?: number;
    tags?: Record<string, string>;
  }): KubernetesCluster {
    const cpCount = options?.controlPlaneNodes || 3;
    const workerCount = options?.workerNodes || 3;
    
    const controlPlaneNodes: Node[] = [];
    for (let i = 0; i < cpCount; i++) {
      controlPlaneNodes.push(this._createNode(`${name}-control-plane-${i}`, 'control-plane', options?.region));
    }

    const workerNodes: Node[] = [];
    for (let i = 0; i < workerCount; i++) {
      workerNodes.push(this._createNode(`${name}-worker-${i}`, 'worker', options?.region));
    }

    const cluster: KubernetesCluster = {
      id: `cluster-${++this._counter}`,
      name,
      version: options?.version || '1.28.0',
      region: options?.region || 'us-east-1',
      status: 'running',
      controlPlaneNodes,
      workerNodes,
      pods: 0,
      services: 0,
      deployments: 0,
      namespaces: [],
      createdAt: Date.now(),
      tags: options?.tags || {},
    };

    this._clusters.set(cluster.id, cluster);
    this._createDefaultNamespaces(cluster);
    return cluster;
  }

  private _createNode(name: string, role: 'control-plane' | 'worker', region?: string): Node {
    const node: Node = {
      name,
      status: 'Ready',
      ipAddress: `10.0.${role === 'control-plane' ? '0' : '1'}.${this._counter + 1}`,
      hostname: name,
      role,
      resources: {
        capacity: {
          cpu: role === 'control-plane' ? '4' : '8',
          memory: role === 'control-plane' ? '16Gi' : '32Gi',
          pods: '110',
        },
        allocatable: {
          cpu: role === 'control-plane' ? '3.8' : '7.8',
          memory: role === 'control-plane' ? '15Gi' : '31Gi',
          pods: '110',
        },
        used: {
          cpu: '0',
          memory: '0',
          pods: '0',
        },
      },
      labels: {
        'node-role.kubernetes.io/': role,
        'topology.kubernetes.io/zone': `${region || 'us-east-1'}a`,
      },
      taints: role === 'control-plane' ? [{ key: 'node-role.kubernetes.io/control-plane', effect: 'NoSchedule' }] : [],
      pods: [],
      createdAt: Date.now(),
    };
    this._nodes.set(name, node);
    return node;
  }

  private _createDefaultNamespaces(cluster: KubernetesCluster): void {
    const namespaces = ['default', 'kube-system', 'kube-public', 'kube-node-lease'];
    
    for (const ns of namespaces) {
      const namespace: Namespace = {
        name: ns,
        status: 'Active',
        labels: {},
        annotations: {},
        createdAt: Date.now(),
      };
      this._namespaces.set(`${cluster.id}/${ns}`, namespace);
      cluster.namespaces.push(namespace);
    }
  }

  createNamespace(name: string, clusterId: string, options?: {
    labels?: Record<string, string>;
    annotations?: Record<string, string>;
    resourceQuota?: ResourceQuotaSpec;
  }): Namespace {
    const cluster = this._clusters.get(clusterId);
    if (!cluster) throw new Error(`Cluster ${clusterId} not found`);

    const namespace: Namespace = {
      name,
      status: 'Active',
      labels: options?.labels || {},
      annotations: options?.annotations || {},
      resourceQuota: options?.resourceQuota,
      createdAt: Date.now(),
    };
    this._namespaces.set(`${clusterId}/${name}`, namespace);
    cluster.namespaces.push(namespace);
    return namespace;
  }

  createDeployment(name: string, namespace: string, options?: {
    replicas?: number;
    selector?: LabelSelector;
    template?: Partial<PodTemplateSpec>;
    strategy?: DeploymentStrategy;
    revisionHistoryLimit?: number;
  }): Deployment {
    const deployment: Deployment = {
      name,
      namespace,
      replicas: options?.replicas || 1,
      readyReplicas: 0,
      availableReplicas: 0,
      updatedReplicas: 0,
      strategy: options?.strategy || { type: 'RollingUpdate', rollingUpdate: { maxSurge: 1, maxUnavailable: 0 } },
      selector: options?.selector || { matchLabels: { app: name } },
      template: {
        metadata: { labels: { app: name }, ...options?.template?.metadata },
        spec: {
          containers: [],
          restartPolicy: 'Always',
          ...options?.template?.spec,
        },
      },
      status: 'progressing',
      revisionHistoryLimit: options?.revisionHistoryLimit || 10,
      createdAt: Date.now(),
    };

    this._deployments.set(`${namespace}/${name}`, deployment);
    
    for (let i = 0; i < deployment.replicas; i++) {
      this._createPodForDeployment(deployment, i);
    }

    return deployment;
  }

  private _createPodForDeployment(deployment: Deployment, index: number): Pod {
    const podName = `${deployment.name}-${this._counter}-${index}`;
    const pod: Pod = {
      name: podName,
      namespace: deployment.namespace,
      phase: 'Running',
      nodeName: this._getAvailableWorkerNode(),
      containers: deployment.template.spec.containers.map(c => ({
        ...c,
        status: {
          ready: true,
          restartCount: 0,
          image: c.image,
          imageID: `docker-pullable://${c.image}`,
          containerID: `docker://container-${this._counter}`,
        },
      })),
      restartPolicy: deployment.template.spec.restartPolicy,
      labels: deployment.template.metadata.labels,
      annotations: {},
      createdAt: Date.now(),
      startedAt: Date.now(),
    };

    this._pods.set(`${deployment.namespace}/${podName}`, pod);
    
    const node = this._nodes.get(pod.nodeName);
    if (node) {
      node.pods.push(podName);
    }

    return pod;
  }

  private _getAvailableWorkerNode(): string {
    const workers = Array.from(this._nodes.values()).filter(n => n.role === 'worker' && n.status === 'Ready');
    if (workers.length === 0) throw new Error('No available worker nodes');
    return workers[Math.floor(Math.random() * workers.length)].name;
  }

  scaleDeployment(name: string, namespace: string, replicas: number): Deployment | null {
    const deployment = this._deployments.get(`${namespace}/${name}`);
    if (!deployment) return null;

    const diff = replicas - deployment.replicas;
    
    if (diff > 0) {
      for (let i = 0; i < diff; i++) {
        this._createPodForDeployment(deployment, deployment.replicas + i);
      }
    } else if (diff < 0) {
      const pods = Array.from(this._pods.values())
        .filter(p => p.namespace === namespace && p.labels.app === name)
        .slice(replicas);
      
      for (const pod of pods) {
        this._pods.delete(`${namespace}/${pod.name}`);
        const node = this._nodes.get(pod.nodeName);
        if (node) {
          node.pods = node.pods.filter(p => p !== pod.name);
        }
      }
    }

    deployment.replicas = replicas;
    deployment.readyReplicas = replicas;
    deployment.availableReplicas = replicas;
    return deployment;
  }

  rolloutUpdate(deploymentName: string, namespace: string, newImage: string): { status: string; progress: number } {
    const deployment = this._deployments.get(`${namespace}/${deploymentName}`);
    if (!deployment) throw new Error(`Deployment ${deploymentName} not found`);

    const strategy = deployment.strategy;
    let maxSurge = 1;
    let maxUnavailable = 0;

    if (strategy.type === 'RollingUpdate' && strategy.rollingUpdate) {
      maxSurge = typeof strategy.rollingUpdate.maxSurge === 'number' ? strategy.rollingUpdate.maxSurge : 1;
      maxUnavailable = typeof strategy.rollingUpdate.maxUnavailable === 'number' ? strategy.rollingUpdate.maxUnavailable : 0;
    }

    const pods = Array.from(this._pods.values())
      .filter(p => p.namespace === namespace && p.labels.app === deploymentName);

    let updated = 0;
    
    for (let i = 0; i < pods.length; i++) {
      const pod = pods[i];
      
      for (const container of pod.containers) {
        container.image = newImage;
        container.imageID = `docker-pullable://${newImage}`;
        container.status.restartCount++;
      }
      
      updated++;
      
      if (i < pods.length - 1 && maxUnavailable > 0) {
        pod.phase = 'Pending';
        for (const container of pod.containers) {
          container.status.ready = false;
        }
      }
    }

    return { status: 'rolling_update', progress: Math.round((updated / pods.length) * 100) };
  }

  rollbackDeployment(deploymentName: string, namespace: string): Deployment | null {
    const deployment = this._deployments.get(`${namespace}/${deploymentName}`);
    if (!deployment) return null;

    deployment.status = 'available';
    return deployment;
  }

  createService(name: string, namespace: string, type: ServiceType, options?: {
    selector?: Record<string, string>;
    ports?: ServicePort[];
    clusterIP?: string;
    sessionAffinity?: 'ClientIP' | 'None';
  }): Service {
    const service: Service = {
      name,
      namespace,
      type,
      clusterIP: options?.clusterIP || this._generateClusterIP(),
      ports: options?.ports || [],
      selector: options?.selector || { app: name },
      sessionAffinity: options?.sessionAffinity || 'None',
      createdAt: Date.now(),
    };

    if (type === 'NodePort') {
      for (const port of service.ports) {
        port.nodePort = 30000 + Math.floor(Math.random() * 32767);
      }
    }

    this._services.set(`${namespace}/${name}`, service);
    return service;
  }

  private _generateClusterIP(): string {
    return `10.96.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255 + 1)}`;
  }

  createIngress(name: string, namespace: string, options?: {
    host?: string;
    tls?: IngressTLS[];
    rules?: IngressRule[];
  }): Ingress {
    const ingress: Ingress = {
      name,
      namespace,
      host: options?.host,
      tls: options?.tls,
      rules: options?.rules || [],
      status: {
        loadBalancer: {
          ingress: [{ hostname: `${name}-${this._counter}.elb.amazonaws.com` }],
        },
      },
      createdAt: Date.now(),
    };
    this._ingresses.set(`${namespace}/${name}`, ingress);
    return ingress;
  }

  createConfigMap(name: string, namespace: string, data: Record<string, string>, options?: {
    binaryData?: Record<string, string>;
    immutable?: boolean;
  }): ConfigMap {
    const configMap: ConfigMap = {
      name,
      namespace,
      data,
      binaryData: options?.binaryData,
      immutable: options?.immutable,
      createdAt: Date.now(),
    };
    this._configMaps.set(`${namespace}/${name}`, configMap);
    return configMap;
  }

  createSecret(name: string, namespace: string, data: Record<string, string>, options?: {
    type?: string;
    immutable?: boolean;
  }): Secret {
    const encodedData: Record<string, string> = {};
    for (const [key, value] of Object.entries(data)) {
      encodedData[key] = Buffer.from(value).toString('base64');
    }

    const secret: Secret = {
      name,
      namespace,
      type: options?.type || 'Opaque',
      data: encodedData,
      immutable: options?.immutable,
      createdAt: Date.now(),
    };
    this._secrets.set(`${namespace}/${name}`, secret);
    return secret;
  }

  createPersistentVolume(name: string, options?: {
    capacity?: Record<string, string>;
    accessModes?: string[];
    storageClassName?: string;
    reclaimPolicy?: 'Retain' | 'Delete' | 'Recycle';
    hostPath?: string;
  }): PersistentVolume {
    const pv: PersistentVolume = {
      name,
      capacity: options?.capacity || { storage: '10Gi' },
      accessModes: options?.accessModes || ['ReadWriteOnce'],
      persistentVolumeReclaimPolicy: options?.reclaimPolicy || 'Retain',
      storageClassName: options?.storageClassName || '',
      status: 'Available',
      hostPath: options?.hostPath ? { path: options.hostPath } : undefined,
      createdAt: Date.now(),
    };
    this._persistentVolumes.set(name, pv);
    return pv;
  }

  createPersistentVolumeClaim(name: string, namespace: string, options?: {
    accessModes?: string[];
    resources?: { requests: Record<string, string> };
    storageClassName?: string;
    selector?: LabelSelector;
  }): PersistentVolumeClaim {
    const pvc: PersistentVolumeClaim = {
      name,
      namespace,
      status: 'Pending',
      accessModes: options?.accessModes || ['ReadWriteOnce'],
      resources: options?.resources || { requests: { storage: '10Gi' } },
      storageClassName: options?.storageClassName || '',
      selector: options?.selector,
      createdAt: Date.now(),
    };

    const availablePV = Array.from(this._persistentVolumes.values()).find(pv => 
      pv.status === 'Available' && 
      pv.storageClassName === pvc.storageClassName &&
      pv.accessModes.some(am => pvc.accessModes.includes(am))
    );

    if (availablePV) {
      pvc.status = 'Bound';
      pvc.volumeName = availablePV.name;
      availablePV.status = 'Bound';
      availablePV.claimRef = { name, namespace };
    }

    this._persistentVolumeClaims.set(`${namespace}/${name}`, pvc);
    return pvc;
  }

  createStatefulSet(name: string, namespace: string, options?: {
    replicas?: number;
    selector?: LabelSelector;
    serviceName?: string;
    template?: Partial<PodTemplateSpec>;
    volumeClaimTemplates?: PersistentVolumeClaim[];
    updateStrategy?: StatefulSetUpdateStrategy;
  }): StatefulSet {
    const statefulSet: StatefulSet = {
      name,
      namespace,
      replicas: options?.replicas || 1,
      readyReplicas: 0,
      updateStrategy: options?.updateStrategy || { type: 'RollingUpdate' },
      selector: options?.selector || { matchLabels: { app: name } },
      serviceName: options?.serviceName || `${name}-headless`,
      template: {
        metadata: { labels: { app: name }, ...options?.template?.metadata },
        spec: {
          containers: [],
          restartPolicy: 'Always',
          ...options?.template?.spec,
        },
      },
      volumeClaimTemplates: options?.volumeClaimTemplates,
      createdAt: Date.now(),
    };
    this._statefulSets.set(`${namespace}/${name}`, statefulSet);
    return statefulSet;
  }

  createDaemonSet(name: string, namespace: string, options?: {
    selector?: LabelSelector;
    template?: Partial<PodTemplateSpec>;
    updateStrategy?: DaemonSetUpdateStrategy;
  }): DaemonSet {
    const daemonSet: DaemonSet = {
      name,
      namespace,
      desiredNumberScheduled: 0,
      currentNumberScheduled: 0,
      readyNumber: 0,
      availableNumber: 0,
      updatedNumberScheduled: 0,
      selector: options?.selector || { matchLabels: { app: name } },
      template: {
        metadata: { labels: { app: name }, ...options?.template?.metadata },
        spec: {
          containers: [],
          restartPolicy: 'Always',
          tolerations: [{ key: 'node-role.kubernetes.io/control-plane', operator: 'Exists', effect: 'NoSchedule' }],
          ...options?.template?.spec,
        },
      },
      updateStrategy: options?.updateStrategy || { type: 'RollingUpdate' },
      createdAt: Date.now(),
    };

    const workerNodes = Array.from(this._nodes.values()).filter(n => n.role === 'worker');
    daemonSet.desiredNumberScheduled = workerNodes.length;
    daemonSet.currentNumberScheduled = workerNodes.length;
    daemonSet.readyNumber = workerNodes.length;
    daemonSet.availableNumber = workerNodes.length;

    this._daemonSets.set(`${namespace}/${name}`, daemonSet);
    return daemonSet;
  }

  createHorizontalPodAutoscaler(name: string, namespace: string, targetRef: {
    apiVersion: string;
    kind: string;
    name: string;
  }, options?: {
    minReplicas?: number;
    maxReplicas?: number;
    metrics?: MetricSpec[];
  }): HorizontalPodAutoscaler {
    const hpa: HorizontalPodAutoscaler = {
      name,
      namespace,
      scaleTargetRef: targetRef,
      minReplicas: options?.minReplicas || 1,
      maxReplicas: options?.maxReplicas || 10,
      currentReplicas: options?.minReplicas || 1,
      desiredReplicas: options?.minReplicas || 1,
      metrics: options?.metrics || [{ type: 'Resource', resource: { name: 'cpu', target: { type: 'Utilization', averageUtilization: 80 } } }],
      createdAt: Date.now(),
    };
    this._hpas.set(`${namespace}/${name}`, hpa);
    return hpa;
  }

  createJob(name: string, namespace: string, options?: {
    parallelism?: number;
    completions?: number;
    template?: Partial<PodTemplateSpec>;
    backoffLimit?: number;
    activeDeadlineSeconds?: number;
  }): Job {
    const job: Job = {
      name,
      namespace,
      parallelism: options?.parallelism || 1,
      completions: options?.completions || 1,
      active: options?.parallelism || 1,
      succeeded: 0,
      failed: 0,
      template: {
        metadata: { labels: { job: name }, ...options?.template?.metadata },
        spec: {
          containers: [],
          restartPolicy: 'OnFailure',
          ...options?.template?.spec,
        },
      },
      backoffLimit: options?.backoffLimit || 6,
      activeDeadlineSeconds: options?.activeDeadlineSeconds,
      createdAt: Date.now(),
    };
    this._jobs.set(`${namespace}/${name}`, job);
    return job;
  }

  createCronJob(name: string, namespace: string, schedule: string, options?: {
    concurrencyPolicy?: 'Allow' | 'Forbid' | 'Replace';
    suspend?: boolean;
    jobTemplate?: Partial<JobTemplateSpec>;
    successfulJobsHistoryLimit?: number;
    failedJobsHistoryLimit?: number;
  }): CronJob {
    const cronJob: CronJob = {
      name,
      namespace,
      schedule,
      concurrencyPolicy: options?.concurrencyPolicy || 'Allow',
      suspend: options?.suspend || false,
      jobTemplate: options?.jobTemplate || { spec: { template: { spec: { containers: [], restartPolicy: 'OnFailure' } } } },
      successfulJobsHistoryLimit: options?.successfulJobsHistoryLimit || 3,
      failedJobsHistoryLimit: options?.failedJobsHistoryLimit || 1,
      createdAt: Date.now(),
    };
    this._cronJobs.set(`${namespace}/${name}`, cronJob);
    return cronJob;
  }

  getClusterMetrics(clusterId: string): ClusterMetrics {
    const cluster = this._clusters.get(clusterId);
    if (!cluster) throw new Error(`Cluster ${clusterId} not found`);

    const allNodes = [...cluster.controlPlaneNodes, ...cluster.workerNodes];
    const pods = Array.from(this._pods.values()).filter(p => {
      const node = this._nodes.get(p.nodeName);
      return node && allNodes.some(n => n.name === node.name);
    });

    let totalCPU = 0;
    let totalMemory = 0;
    let usedCPU = 0;
    let usedMemory = 0;

    for (const node of allNodes) {
      totalCPU += parseFloat(node.resources.capacity.cpu);
      usedCPU += parseFloat(node.resources.used.cpu);
      const memMatch = node.resources.capacity.memory.match(/^(\d+)/);
      const usedMemMatch = node.resources.used.memory.match(/^(\d+)/);
      if (memMatch) totalMemory += parseFloat(memMatch[1]);
      if (usedMemMatch) usedMemory += parseFloat(usedMemMatch[1]);
    }

    return {
      totalNodes: allNodes.length,
      readyNodes: allNodes.filter(n => n.status === 'Ready').length,
      totalPods: pods.length,
      runningPods: pods.filter(p => p.phase === 'Running').length,
      pendingPods: pods.filter(p => p.phase === 'Pending').length,
      failedPods: pods.filter(p => p.phase === 'Failed').length,
      cpuUsage: totalCPU > 0 ? Math.round((usedCPU / totalCPU) * 100) : 0,
      memoryUsage: totalMemory > 0 ? Math.round((usedMemory / totalMemory) * 100) : 0,
      deployments: this._deployments.size,
      services: this._services.size,
    };
  }

  listPods(namespace?: string): Pod[] {
    if (namespace) {
      return Array.from(this._pods.values()).filter(p => p.namespace === namespace);
    }
    return Array.from(this._pods.values());
  }

  listDeployments(namespace?: string): Deployment[] {
    if (namespace) {
      return Array.from(this._deployments.values()).filter(d => d.namespace === namespace);
    }
    return Array.from(this._deployments.values());
  }

  listServices(namespace?: string): Service[] {
    if (namespace) {
      return Array.from(this._services.values()).filter(s => s.namespace === namespace);
    }
    return Array.from(this._services.values());
  }

  describePod(name: string, namespace: string): Pod | null {
    return this._pods.get(`${namespace}/${name}`) || null;
  }

  describeDeployment(name: string, namespace: string): Deployment | null {
    return this._deployments.get(`${namespace}/${name}`) || null;
  }

  describeService(name: string, namespace: string): Service | null {
    return this._services.get(`${namespace}/${name}`) || null;
  }

  deletePod(name: string, namespace: string): boolean {
    return this._pods.delete(`${namespace}/${name}`);
  }

  deleteDeployment(name: string, namespace: string): boolean {
    const deleted = this._deployments.delete(`${namespace}/${name}`);
    if (deleted) {
      const pods = Array.from(this._pods.values())
        .filter(p => p.namespace === namespace && p.labels.app === name);
      for (const pod of pods) {
        this._pods.delete(`${namespace}/${pod.name}`);
      }
    }
    return deleted;
  }

  deleteService(name: string, namespace: string): boolean {
    return this._services.delete(`${namespace}/${name}`);
  }

  cordonNode(nodeName: string): boolean {
    const node = this._nodes.get(nodeName);
    if (!node) return false;
    node.status = 'SchedulingDisabled';
    return true;
  }

  uncordonNode(nodeName: string): boolean {
    const node = this._nodes.get(nodeName);
    if (!node) return false;
    node.status = 'Ready';
    return true;
  }

  drainNode(nodeName: string, options?: { deleteLocalData?: boolean; ignoreDaemonSets?: boolean }): { evictedPods: string[]; errors: string[] } {
    const node = this._nodes.get(nodeName);
    if (!node) return { evictedPods: [], errors: ['Node not found'] };

    const evictedPods: string[] = [];
    const errors: string[] = [];

    for (const podName of [...node.pods]) {
      const pod = Array.from(this._pods.values()).find(p => p.name === podName);
      if (!pod) continue;

      const isDaemonSet = Array.from(this._daemonSets.values()).some(ds => 
        ds.selector.matchLabels && Object.entries(ds.selector.matchLabels).every(
          ([k, v]) => pod!.labels[k] === v
        )
      );

      if (isDaemonSet && (options?.ignoreDaemonSets !== false)) {
        continue;
      }

      if (pod.spec?.volumes?.some(v => v.hostPath) && !(options?.deleteLocalData)) {
        errors.push(`Cannot evict ${podName}: has local data`);
        continue;
      }

      this._pods.delete(`${pod.namespace}/${podName}`);
      node.pods = node.pods.filter(p => p !== podName);
      evictedPods.push(podName);
    }

    return { evictedPods, errors };
  }

  getEvents(namespace?: string): { timestamp: number; type: string; reason: string; message: string; involvedObject: { kind: string; name: string } }[] {
    const events: { timestamp: number; type: string; reason: string; message: string; involvedObject: { kind: string; name: string } }[] = [];
    
    for (const pod of this._pods.values()) {
      if (namespace && pod.namespace !== namespace) continue;
      
      events.push({
        timestamp: pod.createdAt,
        type: 'Normal',
        reason: 'Scheduled',
        message: `Successfully assigned ${pod.namespace}/${pod.name} to ${pod.nodeName}`,
        involvedObject: { kind: 'Pod', name: pod.name },
      });

      for (const container of pod.containers) {
        if (container.status.containerID) {
          events.push({
            timestamp: pod.startedAt || Date.now(),
            type: 'Normal',
            reason: 'Pulled',
            message: `Successfully pulled image "${container.image}"`,
            involvedObject: { kind: 'Pod', name: pod.name },
          });
          events.push({
            timestamp: pod.startedAt || Date.now(),
            type: 'Normal',
            reason: 'Created',
            message: `Created container ${container.name}`,
            involvedObject: { kind: 'Pod', name: pod.name },
          });
          events.push({
            timestamp: pod.startedAt || Date.now(),
            type: 'Normal',
            reason: 'Started',
            message: `Started container ${container.name}`,
            involvedObject: { kind: 'Pod', name: pod.name },
          });
        }
      }
    }

    return events.sort((a, b) => b.timestamp - a.timestamp);
  }

  toPacket(): DataPacket<{
    clusters: Map<string, KubernetesCluster>;
    pods: Map<string, Pod>;
    deployments: Map<string, Deployment>;
    services: Map<string, Service>;
    metrics: ClusterMetrics;
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['cloud_computing', 'ContainerOrchestration'],
      priority: 1,
      phase: 'container_orchestration',
    };
    return {
      id: `k8s-${Date.now().toString(36)}`,
      payload: {
        clusters: this._clusters,
        pods: this._pods,
        deployments: this._deployments,
        services: this._services,
        metrics: this.getClusterMetrics(Array.from(this._clusters.keys())[0] || ''),
      },
      metadata,
    };
  }

  reset(): void {
    this._clusters = new Map();
    this._nodes = new Map();
    this._namespaces = new Map();
    this._pods = new Map();
    this._deployments = new Map();
    this._services = new Map();
    this._ingresses = new Map();
    this._configMaps = new Map();
    this._secrets = new Map();
    this._persistentVolumes = new Map();
    this._persistentVolumeClaims = new Map();
    this._statefulSets = new Map();
    this._daemonSets = new Map();
    this._hpas = new Map();
    this._jobs = new Map();
    this._cronJobs = new Map();
    this._counter = 0;
  }

  get clusterCount(): number { return this._clusters.size; }
  get podCount(): number { return this._pods.size; }
  get deploymentCount(): number { return this._deployments.size; }
  get serviceCount(): number { return this._services.size; }
  get nodeCount(): number { return this._nodes.size; }
}