import { DataPacket, PacketMeta } from '../shared/types';

export interface VMInstance {
  id: string;
  size: string;
  region: string;
  status: string;
  ip: string;
}

export interface VPCNetwork {
  id: string;
  cidr: string;
  subnets: string[];
  gateways: string[];
}

export class IaaSOperator {
  private _vms: Map<string, VMInstance> = new Map();
  private _vpcs: Map<string, VPCNetwork> = new Map();
  private _counter = 0;

  createVM(config: { size: string; region: string }, provider: string = 'aws'): VMInstance {
    const vmId = `vm-${++this._counter}`;
    const vm: VMInstance = {
      id: vmId,
      size: config.size,
      region: config.region,
      status: 'running',
      ip: `10.0.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
    };
    this._vms.set(vmId, vm);
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

  resizeVM(instanceId: string, newSize: string): VMInstance | null {
    const vm = this._vms.get(instanceId);
    if (!vm) return null;
    vm.size = newSize;
    return vm;
  }

  deleteVM(instanceId: string): boolean {
    return this._vms.delete(instanceId);
  }

  createVPC(config: { cidr: string; region: string }, provider: string = 'aws'): VPCNetwork {
    const vpcId = `vpc-${++this._counter}`;
    const vpc: VPCNetwork = {
      id: vpcId,
      cidr: config.cidr,
      subnets: [],
      gateways: [`igw-${this._counter}`],
    };
    this._vpcs.set(vpcId, vpc);
    return vpc;
  }

  createSubnet(vpcId: string, config: { cidr: string; zone: string }): string | null {
    const vpc = this._vpcs.get(vpcId);
    if (!vpc) return null;
    const subnetId = `subnet-${++this._counter}`;
    vpc.subnets.push(subnetId);
    return subnetId;
  }

  createSecurityGroup(name: string, rules: { direction: string; port: number; source: string }[]): { id: string; name: string; rules: typeof rules } {
    return { id: `sg-${++this._counter}`, name, rules };
  }

  attachSecurityGroup(instanceId: string, sgId: string): boolean {
    return this._vms.has(instanceId);
  }

  loadBalancer(type: string, targets: string[]): { id: string; type: string; dns: string; targets: string[] } {
    return {
      id: `lb-${++this._counter}`,
      type,
      dns: `lb-${this._counter}.elb.amazonaws.com`,
      targets,
    };
  }

  autoScalingGroup(config: { min: number; max: number; desired: number }, policy: string): { id: string; minSize: number; maxSize: number; desiredSize: number; policy: string } {
    return {
      id: `asg-${++this._counter}`,
      minSize: config.min,
      maxSize: config.max,
      desiredSize: config.desired,
      policy,
    };
  }

  elasticIP(instanceId: string): { ip: string; instanceId: string } {
    return { ip: `52.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`, instanceId };
  }

  snapshot(volumeId: string): { id: string; volumeId: string; status: string; progress: number } {
    return { id: `snap-${++this._counter}`, volumeId, status: 'completed', progress: 100 };
  }

  amiCreate(instanceId: string, name: string): { id: string; name: string; state: string } {
    return { id: `ami-${++this._counter}`, name, state: 'available' };
  }

  crossRegionCopy(resource: string, fromRegion: string, toRegion: string): { resource: string; fromRegion: string; toRegion: string; status: string } {
    return { resource, fromRegion, toRegion, status: 'copying' };
  }

  toPacket(): DataPacket<{
    vms: Map<string, VMInstance>;
    vpcs: Map<string, VPCNetwork>;
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
      },
      metadata,
    };
  }

  reset(): void {
    this._vms = new Map();
    this._vpcs = new Map();
    this._counter = 0;
  }

  get vmCount(): number { return this._vms.size; }
  get vpcCount(): number { return this._vpcs.size; }
}
