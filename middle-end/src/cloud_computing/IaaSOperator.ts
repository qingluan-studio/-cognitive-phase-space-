import { DataPacket, PacketMeta } from '../shared/types';

export interface VMInstance {
  id: string;
  size: string;
  region: string;
  status: string;
  ip: string;
  privateIp: string;
  subnetId: string;
  vpcId: string;
  securityGroups: string[];
  keyName: string;
  imageId: string;
  launchTime: number;
  tags: Record<string, string>;
}

export interface VPCNetwork {
  id: string;
  cidr: string;
  subnets: string[];
  gateways: string[];
  routeTables: string[];
  securityGroups: string[];
  networkAcls: string[];
  tags: Record<string, string>;
}

export interface Subnet {
  id: string;
  vpcId: string;
  cidr: string;
  availabilityZone: string;
  isPublic: boolean;
  mapPublicIpOnLaunch: boolean;
}

export interface SecurityGroup {
  id: string;
  name: string;
  description: string;
  vpcId: string;
  ingressRules: { protocol: string; port: number; source: string; description?: string }[];
  egressRules: { protocol: string; port: number; destination: string; description?: string }[];
}

export interface LoadBalancer {
  id: string;
  type: string;
  dns: string;
  targets: string[];
  listeners: { port: number; protocol: string; targetGroup: string }[];
  scheme: string;
  status: string;
}

export interface AutoScalingGroup {
  id: string;
  minSize: number;
  maxSize: number;
  desiredSize: number;
  launchTemplate: string;
  targetGroups: string[];
  policies: { name: string; type: string; metric: string; threshold: number }[];
}

export interface RouteTable {
  id: string;
  vpcId: string;
  routes: { destination: string; target: string; status: string }[];
  associations: string[];
}

export interface NATGateway {
  id: string;
  subnetId: string;
  publicIp: string;
  status: string;
  type: string;
}

export interface Volume {
  id: string;
  size: number;
  type: string;
  iops: number;
  instanceId?: string;
  status: string;
  snapshotId?: string;
  encrypted: boolean;
}

export interface Snapshot {
  id: string;
  volumeId: string;
  status: string;
  progress: number;
  createdAt: number;
  encrypted: boolean;
}

export class IaaSOperator {
  private _vms: Map<string, VMInstance> = new Map();
  private _vpcs: Map<string, VPCNetwork> = new Map();
  private _subnets: Map<string, Subnet> = new Map();
  private _securityGroups: Map<string, SecurityGroup> = new Map();
  private _loadBalancers: Map<string, LoadBalancer> = new Map();
  private _autoScalingGroups: Map<string, AutoScalingGroup> = new Map();
  private _routeTables: Map<string, RouteTable> = new Map();
  private _natGateways: Map<string, NATGateway> = new Map();
  private _volumes: Map<string, Volume> = new Map();
  private _snapshots: Map<string, Snapshot> = new Map();
  private _counter = 0;
  private _regions = ['us-east-1', 'us-west-2', 'eu-west-1', 'eu-central-1', 'ap-southeast-1', 'ap-northeast-1', 'ap-south-1'];
  private _vmSizes = {
    't2.micro': { vcpus: 1, memory: 1, storage: 8, price: 0.0116 },
    't2.small': { vcpus: 1, memory: 2, storage: 8, price: 0.023 },
    't2.medium': { vcpus: 2, memory: 4, storage: 8, price: 0.0464 },
    't3.large': { vcpus: 2, memory: 8, storage: 8, price: 0.0832 },
    'c5.xlarge': { vcpus: 4, memory: 8, storage: 8, price: 0.17 },
    'c5.2xlarge': { vcpus: 8, memory: 16, storage: 8, price: 0.34 },
    'm5.large': { vcpus: 2, memory: 8, storage: 8, price: 0.096 },
    'm5.xlarge': { vcpus: 4, memory: 16, storage: 8, price: 0.192 },
    'r5.large': { vcpus: 2, memory: 16, storage: 8, price: 0.126 },
    'p3.2xlarge': { vcpus: 8, memory: 61, storage: 600, price: 3.06 },
  };

  get vmCount(): number { return this._vms.size; }
  get vpcCount(): number { return this._vpcs.size; }
  get subnetCount(): number { return this._subnets.size; }
  get securityGroupCount(): number { return this._securityGroups.size; }
  get loadBalancerCount(): number { return this._loadBalancers.size; }
  get autoScalingGroupCount(): number { return this._autoScalingGroups.size; }
  get volumeCount(): number { return this._volumes.size; }
  get snapshotCount(): number { return this._snapshots.size; }

  createVM(config: {
    size: string;
    region: string;
    vpcId?: string;
    subnetId?: string;
    securityGroups?: string[];
    keyName?: string;
    imageId?: string;
    tags?: Record<string, string>;
  }, provider: string = 'aws'): VMInstance {
    const vmId = `vm-${++this._counter}`;
    const subnet = config.subnetId ? this._subnets.get(config.subnetId) : null;
    const vpc = config.vpcId ? this._vpcs.get(config.vpcId) : null;
    const privateIp = subnet ? `10.${parseInt(subnet.cidr.split('.')[1])}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`
      : `10.0.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
    const isPublic = subnet?.isPublic ?? true;
    
    const vm: VMInstance = {
      id: vmId,
      size: config.size,
      region: config.region,
      status: 'running',
      ip: isPublic ? `52.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}` : '',
      privateIp,
      subnetId: config.subnetId ?? '',
      vpcId: config.vpcId ?? '',
      securityGroups: config.securityGroups ?? [],
      keyName: config.keyName ?? 'default-key',
      imageId: config.imageId ?? 'ami-default',
      launchTime: Date.now(),
      tags: config.tags ?? {},
    };
    this._vms.set(vmId, vm);
    
    if (config.subnetId && vpc) {
      if (!vpc.subnets.includes(config.subnetId)) {
        vpc.subnets.push(config.subnetId);
      }
    }
    
    return vm;
  }

  startVM(instanceId: string): VMInstance | null {
    const vm = this._vms.get(instanceId);
    if (!vm) return null;
    vm.status = 'running';
    return vm;
  }

  stopVM(instanceId: string): VMInstance | null {
    const vm = this._vms.get(instanceId);
    if (!vm) return null;
    vm.status = 'stopped';
    return vm;
  }

  rebootVM(instanceId: string): VMInstance | null {
    const vm = this._vms.get(instanceId);
    if (!vm) return null;
    vm.status = 'rebooting';
    setTimeout(() => { vm.status = 'running'; }, 3000);
    return vm;
  }

  resizeVM(instanceId: string, newSize: string): VMInstance | null {
    const vm = this._vms.get(instanceId);
    if (!vm) return null;
    if (!this._vmSizes[newSize as keyof typeof this._vmSizes]) {
      return null;
    }
    vm.size = newSize;
    return vm;
  }

  deleteVM(instanceId: string): boolean {
    const vm = this._vms.get(instanceId);
    if (!vm) return false;
    
    for (const volumeId of this._volumes.keys()) {
      const vol = this._volumes.get(volumeId);
      if (vol?.instanceId === instanceId) {
        this._volumes.delete(volumeId);
      }
    }
    
    return this._vms.delete(instanceId);
  }

  describeVM(instanceId: string): VMInstance | null {
    return this._vms.get(instanceId) || null;
  }

  listVMs(filter?: { region?: string; status?: string }): VMInstance[] {
    let result = Array.from(this._vms.values());
    if (filter?.region) {
      result = result.filter(vm => vm.region === filter.region);
    }
    if (filter?.status) {
      result = result.filter(vm => vm.status === filter.status);
    }
    return result;
  }

  createVPC(config: { cidr: string; region: string; tags?: Record<string, string> }, provider: string = 'aws'): VPCNetwork {
    const vpcId = `vpc-${++this._counter}`;
    const vpc: VPCNetwork = {
      id: vpcId,
      cidr: config.cidr,
      subnets: [],
      gateways: [`igw-${this._counter}`],
      routeTables: [],
      securityGroups: [],
      networkAcls: [],
      tags: config.tags ?? {},
    };
    this._vpcs.set(vpcId, vpc);
    
    const defaultRouteTable = this.createRouteTable(vpcId);
    vpc.routeTables.push(defaultRouteTable.id);
    
    const defaultSG = this.createSecurityGroup('default', vpcId);
    vpc.securityGroups.push(defaultSG.id);
    
    return vpc;
  }

  createSubnet(vpcId: string, config: { cidr: string; zone: string; isPublic?: boolean; mapPublicIpOnLaunch?: boolean }): string | null {
    const vpc = this._vpcs.get(vpcId);
    if (!vpc) return null;
    
    const subnetId = `subnet-${++this._counter}`;
    const subnet: Subnet = {
      id: subnetId,
      vpcId,
      cidr: config.cidr,
      availabilityZone: config.zone,
      isPublic: config.isPublic ?? false,
      mapPublicIpOnLaunch: config.mapPublicIpOnLaunch ?? false,
    };
    this._subnets.set(subnetId, subnet);
    vpc.subnets.push(subnetId);
    
    return subnetId;
  }

  createSecurityGroup(name: string, vpcId: string, description: string = ''): SecurityGroup {
    const sgId = `sg-${++this._counter}`;
    const sg: SecurityGroup = {
      id: sgId,
      name,
      description: description || `Security group for ${name}`,
      vpcId,
      ingressRules: [],
      egressRules: [{ protocol: '-1', port: -1, destination: '0.0.0.0/0', description: 'Allow all outbound' }],
    };
    this._securityGroups.set(sgId, sg);
    
    const vpc = this._vpcs.get(vpcId);
    if (vpc && !vpc.securityGroups.includes(sgId)) {
      vpc.securityGroups.push(sgId);
    }
    
    return sg;
  }

  authorizeSecurityGroupIngress(sgId: string, rules: { protocol: string; port: number; source: string; description?: string }[]): boolean {
    const sg = this._securityGroups.get(sgId);
    if (!sg) return false;
    sg.ingressRules.push(...rules);
    return true;
  }

  authorizeSecurityGroupEgress(sgId: string, rules: { protocol: string; port: number; destination: string; description?: string }[]): boolean {
    const sg = this._securityGroups.get(sgId);
    if (!sg) return false;
    sg.egressRules.push(...rules);
    return true;
  }

  revokeSecurityGroupIngress(sgId: string, ruleIndex: number): boolean {
    const sg = this._securityGroups.get(sgId);
    if (!sg || ruleIndex < 0 || ruleIndex >= sg.ingressRules.length) return false;
    sg.ingressRules.splice(ruleIndex, 1);
    return true;
  }

  attachSecurityGroup(instanceId: string, sgId: string): boolean {
    const vm = this._vms.get(instanceId);
    if (!vm) return false;
    if (!vm.securityGroups.includes(sgId)) {
      vm.securityGroups.push(sgId);
    }
    return true;
  }

  createRouteTable(vpcId: string): RouteTable {
    const rtId = `rtb-${++this._counter}`;
    const rt: RouteTable = {
      id: rtId,
      vpcId,
      routes: [{ destination: 'local', target: 'local', status: 'active' }],
      associations: [],
    };
    this._routeTables.set(rtId, rt);
    
    const vpc = this._vpcs.get(vpcId);
    if (vpc && !vpc.routeTables.includes(rtId)) {
      vpc.routeTables.push(rtId);
    }
    
    return rt;
  }

  createRoute(routeTableId: string, destination: string, target: string): boolean {
    const rt = this._routeTables.get(routeTableId);
    if (!rt) return false;
    rt.routes.push({ destination, target, status: 'active' });
    return true;
  }

  associateRouteTable(routeTableId: string, subnetId: string): boolean {
    const rt = this._routeTables.get(routeTableId);
    const subnet = this._subnets.get(subnetId);
    if (!rt || !subnet) return false;
    if (!rt.associations.includes(subnetId)) {
      rt.associations.push(subnetId);
    }
    return true;
  }

  createNATGateway(subnetId: string, allocationId?: string): NATGateway {
    const subnet = this._subnets.get(subnetId);
    if (!subnet) {
      throw new Error('Subnet not found');
    }
    
    const natId = `nat-${++this._counter}`;
    const nat: NATGateway = {
      id: natId,
      subnetId,
      publicIp: `52.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
      status: 'available',
      type: 'standard',
    };
    this._natGateways.set(natId, nat);
    
    return nat;
  }

  createVolume(config: { size: number; type?: string; iops?: number; encrypted?: boolean; snapshotId?: string }): Volume {
    const volId = `vol-${++this._counter}`;
    const vol: Volume = {
      id: volId,
      size: config.size,
      type: config.type ?? 'gp3',
      iops: config.iops ?? (config.type === 'io1' ? 1000 : 3000),
      status: 'available',
      encrypted: config.encrypted ?? false,
      snapshotId: config.snapshotId,
    };
    this._volumes.set(volId, vol);
    return vol;
  }

  attachVolume(instanceId: string, volumeId: string): boolean {
    const vm = this._vms.get(instanceId);
    const vol = this._volumes.get(volumeId);
    if (!vm || !vol || vol.status !== 'available') return false;
    vol.instanceId = instanceId;
    vol.status = 'in-use';
    return true;
  }

  detachVolume(volumeId: string): boolean {
    const vol = this._volumes.get(volumeId);
    if (!vol) return false;
    vol.instanceId = undefined;
    vol.status = 'available';
    return true;
  }

  createSnapshot(volumeId: string, description?: string): Snapshot {
    const vol = this._volumes.get(volumeId);
    if (!vol) {
      throw new Error('Volume not found');
    }
    
    const snapId = `snap-${++this._counter}`;
    const snap: Snapshot = {
      id: snapId,
      volumeId,
      status: 'pending',
      progress: 0,
      createdAt: Date.now(),
      encrypted: vol.encrypted,
    };
    this._snapshots.set(snapId, snap);
    
    setTimeout(() => {
      snap.progress = 50;
      snap.status = 'completing';
    }, 1000);
    setTimeout(() => {
      snap.progress = 100;
      snap.status = 'completed';
    }, 3000);
    
    return snap;
  }

  copySnapshot(snapshotId: string, destinationRegion: string): Snapshot {
    const src = this._snapshots.get(snapshotId);
    if (!src) {
      throw new Error('Snapshot not found');
    }
    
    const snapId = `snap-${++this._counter}`;
    const snap: Snapshot = {
      id: snapId,
      volumeId: src.volumeId,
      status: 'pending',
      progress: 0,
      createdAt: Date.now(),
      encrypted: src.encrypted,
    };
    this._snapshots.set(snapId, snap);
    
    setTimeout(() => {
      snap.progress = 100;
      snap.status = 'completed';
    }, 5000);
    
    return snap;
  }

  createAMI(instanceId: string, name: string, description?: string): { id: string; name: string; state: string; createdAt: number } {
    const vm = this._vms.get(instanceId);
    if (!vm) {
      throw new Error('Instance not found');
    }
    
    return {
      id: `ami-${++this._counter}`,
      name,
      description: description || `AMI created from ${instanceId}`,
      state: 'available',
      createdAt: Date.now(),
    };
  }

  loadBalancer(type: string, targets: string[], listeners?: { port: number; protocol: string; targetGroup: string }[]): LoadBalancer {
    const lb: LoadBalancer = {
      id: `lb-${++this._counter}`,
      type,
      dns: `lb-${this._counter}.elb.amazonaws.com`,
      targets,
      listeners: listeners ?? [{ port: 80, protocol: 'HTTP', targetGroup: 'default-tg' }],
      scheme: type === 'network' ? 'internal' : 'internet-facing',
      status: 'active',
    };
    this._loadBalancers.set(lb.id, lb);
    return lb;
  }

  createTargetGroup(name: string, protocol: string, port: number, targets: string[]): { id: string; name: string; protocol: string; port: number; targets: string[] } {
    return {
      id: `tg-${++this._counter}`,
      name,
      protocol,
      port,
      targets,
    };
  }

  registerTarget(targetGroupId: string, instanceId: string): boolean {
    return true;
  }

  autoScalingGroup(config: { min: number; max: number; desired: number; launchTemplate: string }, policies?: { name: string; type: string; metric: string; threshold: number }[]): AutoScalingGroup {
    const asg: AutoScalingGroup = {
      id: `asg-${++this._counter}`,
      minSize: config.min,
      maxSize: config.max,
      desiredSize: config.desired,
      launchTemplate: config.launchTemplate,
      targetGroups: [],
      policies: policies ?? [],
    };
    this._autoScalingGroups.set(asg.id, asg);
    return asg;
  }

  createScalingPolicy(asgId: string, name: string, type: string, metric: string, threshold: number, cooldown: number = 300): boolean {
    const asg = this._autoScalingGroups.get(asgId);
    if (!asg) return false;
    asg.policies.push({ name, type, metric, threshold });
    return true;
  }

  elasticIP(instanceId?: string): { ip: string; instanceId: string | undefined; allocationId: string } {
    return {
      ip: `52.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
      instanceId,
      allocationId: `eipalloc-${++this._counter}`,
    };
  }

  associateAddress(instanceId: string, allocationId: string): boolean {
    const vm = this._vms.get(instanceId);
    if (!vm) return false;
    vm.ip = this.elasticIP(instanceId).ip;
    return true;
  }

  crossRegionCopy(resource: string, fromRegion: string, toRegion: string): { resource: string; fromRegion: string; toRegion: string; status: string; taskId: string } {
    return {
      resource,
      fromRegion,
      toRegion,
      status: 'copying',
      taskId: `copy-${++this._counter}`,
    };
  }

  createNetworkACL(vpcId: string): { id: string; vpcId: string; entries: { ruleNumber: number; protocol: string; port: number; cidr: string; ruleAction: string; egress: boolean }[] } {
    const vpc = this._vpcs.get(vpcId);
    if (!vpc) {
      throw new Error('VPC not found');
    }
    
    const naclId = `acl-${++this._counter}`;
    const entries = [
      { ruleNumber: 100, protocol: '-1', port: -1, cidr: '0.0.0.0/0', ruleAction: 'allow', egress: false },
      { ruleNumber: 100, protocol: '-1', port: -1, cidr: '0.0.0.0/0', ruleAction: 'allow', egress: true },
    ];
    
    vpc.networkAcls.push(naclId);
    
    return { id: naclId, vpcId, entries };
  }

  getVMInstanceTypeDetails(instanceType: string): typeof this._vmSizes[string] | null {
    return this._vmSizes[instanceType as keyof typeof this._vmSizes] || null;
  }

  calculateMonthlyCost(instanceType: string, hoursPerDay: number = 24, daysPerMonth: number = 30): number {
    const details = this.getVMInstanceTypeDetails(instanceType);
    if (!details) return 0;
    return details.price * hoursPerDay * daysPerMonth;
  }

  getRegionDetails(region: string): { name: string; zones: string[]; latency: number; features: string[] } | null {
    const regions: Record<string, { name: string; zones: string[]; latency: number; features: string[] }> = {
      'us-east-1': { name: 'US East (N. Virginia)', zones: ['a', 'b', 'c', 'd', 'e'], latency: 0, features: ['EC2', 'S3', 'RDS', 'DynamoDB'] },
      'us-west-2': { name: 'US West (Oregon)', zones: ['a', 'b', 'c'], latency: 50, features: ['EC2', 'S3', 'Lambda'] },
      'eu-west-1': { name: 'EU West (Ireland)', zones: ['a', 'b', 'c'], latency: 100, features: ['EC2', 'RDS', 'S3'] },
      'ap-southeast-1': { name: 'Asia Pacific (Singapore)', zones: ['a', 'b'], latency: 150, features: ['EC2', 'RDS'] },
      'ap-northeast-1': { name: 'Asia Pacific (Tokyo)', zones: ['a', 'b', 'c'], latency: 120, features: ['EC2', 'S3'] },
    };
    return regions[region] || null;
  }

  setupHighAvailability(vpcId: string, subnets: string[], instanceType: string, count: number): { vpcId: string; subnets: string[]; instances: string[]; loadBalancer: string } {
    const instances: string[] = [];
    for (let i = 0; i < count; i++) {
      const subnet = subnets[i % subnets.length];
      const vm = this.createVM({ size: instanceType, region: 'us-east-1', vpcId, subnetId: subnet });
      instances.push(vm.id);
    }
    
    const lb = this.loadBalancer('application', instances);
    
    return { vpcId, subnets, instances, loadBalancer: lb.id };
  }

  setupDisasterRecovery(sourceRegion: string, targetRegion: string, instances: string[]): { sourceRegion: string; targetRegion: string; replicatedInstances: string[]; status: string } {
    const replicatedInstances: string[] = [];
    for (const instanceId of instances) {
      const vm = this._vms.get(instanceId);
      if (vm) {
        const snapshot = this.createSnapshot(`vol-${instanceId.split('-')[1]}`);
        const copied = this.copySnapshot(snapshot.id, targetRegion);
        replicatedInstances.push(`dr-${instanceId}`);
      }
    }
    
    return { sourceRegion, targetRegion, replicatedInstances, status: 'replicating' };
  }

  getInstanceMetrics(instanceId: string): { cpu: number; memory: number; disk: number; network: number; uptime: number } {
    const vm = this._vms.get(instanceId);
    if (!vm) {
      throw new Error('Instance not found');
    }
    
    return {
      cpu: Math.floor(Math.random() * 100),
      memory: Math.floor(Math.random() * 80) + 20,
      disk: Math.floor(Math.random() * 60) + 10,
      network: Math.floor(Math.random() * 1000),
      uptime: Math.floor((Date.now() - vm.launchTime) / 1000),
    };
  }

  getVPCMetrics(vpcId: string): { instances: number; subnets: number; securityGroups: number; bandwidth: number; activeConnections: number } {
    const vpc = this._vpcs.get(vpcId);
    if (!vpc) {
      throw new Error('VPC not found');
    }
    
    return {
      instances: this.listVMs({}).filter(vm => vm.vpcId === vpcId).length,
      subnets: vpc.subnets.length,
      securityGroups: vpc.securityGroups.length,
      bandwidth: Math.floor(Math.random() * 10000),
      activeConnections: Math.floor(Math.random() * 1000),
    };
  }

  getCostReport(region?: string): { instances: number; totalCost: number; breakdown: Record<string, number>; forecast: number } {
    let vms = this.listVMs(region ? { region } : undefined);
    let totalCost = 0;
    const breakdown: Record<string, number> = {};
    
    for (const vm of vms) {
      const cost = this.calculateMonthlyCost(vm.size);
      totalCost += cost;
      breakdown[vm.size] = (breakdown[vm.size] || 0) + cost;
    }
    
    return {
      instances: vms.length,
      totalCost: Math.round(totalCost * 100) / 100,
      breakdown,
      forecast: totalCost * 1.1,
    };
  }

  optimizeInstances(): { recommendations: { instanceId: string; currentSize: string; recommendedSize: string; savings: number }[]; totalSavings: number } {
    const recommendations: { instanceId: string; currentSize: string; recommendedSize: string; savings: number }[] = [];
    let totalSavings = 0;
    
    const sizeOrder = ['t2.micro', 't2.small', 't2.medium', 't3.large', 'c5.xlarge', 'c5.2xlarge'];
    
    for (const [id, vm] of this._vms) {
      const currentIdx = sizeOrder.indexOf(vm.size);
      if (currentIdx > 0) {
        const recommendedSize = sizeOrder[currentIdx - 1];
        const currentCost = this.calculateMonthlyCost(vm.size);
        const recommendedCost = this.calculateMonthlyCost(recommendedSize);
        const savings = currentCost - recommendedCost;
        
        recommendations.push({
          instanceId: id,
          currentSize: vm.size,
          recommendedSize,
          savings: Math.round(savings * 100) / 100,
        });
        totalSavings += savings;
      }
    }
    
    return { recommendations, totalSavings: Math.round(totalSavings * 100) / 100 };
  }

  createLaunchTemplate(name: string, config: { instanceType: string; imageId: string; keyName: string; securityGroups?: string[] }): { id: string; name: string; defaultVersion: number } {
    return {
      id: `lt-${++this._counter}`,
      name,
      defaultVersion: 1,
    };
  }

  getLaunchTemplateVersion(templateId: string, version: number = 1): { templateId: string; version: number; config: Record<string, unknown> } {
    return {
      templateId,
      version,
      config: {},
    };
  }

  createPlacementGroup(name: string, strategy: string = 'cluster', partitionCount?: number): { id: string; name: string; strategy: string; state: string } {
    return {
      id: `pg-${++this._counter}`,
      name,
      strategy,
      state: 'available',
    };
  }

  createSpotFleet(config: { targetCapacity: number; instances: { instanceType: string; weight: number }[] }): { id: string; targetCapacity: number; instances: number; status: string } {
    return {
      id: `sfr-${++this._counter}`,
      targetCapacity: config.targetCapacity,
      instances: config.instances.length,
      status: 'active',
    };
  }

  createInstanceProfile(name: string, roles: string[]): { id: string; name: string; roles: string[]; status: string } {
    return {
      id: `instance-profile-${++this._counter}`,
      name,
      roles,
      status: 'active',
    };
  }

  associateInstanceProfile(instanceId: string, profileId: string): boolean {
    return true;
  }

  describeInstanceStatus(instanceIds?: string[]): { instanceId: string; state: string; systemStatus: string; instanceStatus: string }[] {
    const vms = instanceIds 
      ? instanceIds.map(id => this._vms.get(id)).filter(Boolean)
      : Array.from(this._vms.values());
    
    return vms.map(vm => ({
      instanceId: vm!.id,
      state: vm!.status,
      systemStatus: 'ok',
      instanceStatus: 'ok',
    }));
  }

  getReservedInstancesOffering(region: string, instanceType: string, term: number = 1): { offeringId: string; instanceType: string; term: number; fixedPrice: number; usagePrice: number } {
    const onDemandPrice = this.calculateMonthlyCost(instanceType);
    return {
      offeringId: `ri-${++this._counter}`,
      instanceType,
      term,
      fixedPrice: onDemandPrice * 12 * term * 0.5,
      usagePrice: 0,
    };
  }

  purchaseReservedInstances(offeringId: string, instanceCount: number = 1): { reservationId: string; offeringId: string; instanceCount: number; state: string } {
    return {
      reservationId: `res-${++this._counter}`,
      offeringId,
      instanceCount,
      state: 'payment-pending',
    };
  }

  getSpotPriceHistory(instanceType: string, region: string, hours: number = 24): { timestamp: number; price: number; instanceType: string; region: string }[] {
    const history: { timestamp: number; price: number; instanceType: string; region: string }[] = [];
    const basePrice = this.calculateMonthlyCost(instanceType) / 720;
    
    for (let i = 0; i < hours; i++) {
      history.push({
        timestamp: Date.now() - i * 3600000,
        price: basePrice * (0.3 + Math.random() * 0.4),
        instanceType,
        region,
      });
    }
    
    return history;
  }

  toPacket(): DataPacket<{
    vms: Map<string, VMInstance>;
    vpcs: Map<string, VPCNetwork>;
    subnets: Map<string, Subnet>;
    securityGroups: Map<string, SecurityGroup>;
    loadBalancers: Map<string, LoadBalancer>;
    autoScalingGroups: Map<string, AutoScalingGroup>;
    volumes: Map<string, Volume>;
    snapshots: Map<string, Snapshot>;
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['cloud_computing', 'IaaSOperator'],
      priority: 1,
      phase: 'iaas_operator',
    };
    return {
      id: `iaas-${Date.now().toString(36)}`,
      payload: {
        vms: this._vms,
        vpcs: this._vpcs,
        subnets: this._subnets,
        securityGroups: this._securityGroups,
        loadBalancers: this._loadBalancers,
        autoScalingGroups: this._autoScalingGroups,
        volumes: this._volumes,
        snapshots: this._snapshots,
      },
      metadata,
    };
  }

  reset(): void {
    this._vms = new Map();
    this._vpcs = new Map();
    this._subnets = new Map();
    this._securityGroups = new Map();
    this._loadBalancers = new Map();
    this._autoScalingGroups = new Map();
    this._routeTables = new Map();
    this._natGateways = new Map();
    this._volumes = new Map();
    this._snapshots = new Map();
    this._counter = 0;
  }
}