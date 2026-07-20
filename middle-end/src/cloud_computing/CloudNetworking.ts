import { DataPacket, PacketMeta } from '../shared/types';

export type IPAddressType = 'IPv4' | 'IPv6';
export type SubnetType = 'PUBLIC' | 'PRIVATE' | 'ISOLATED';
export type RouteTargetType = 'internet_gateway' | 'nat_gateway' | 'vpc_peering' | 'transit_gateway' | 'vpn_gateway' | 'load_balancer' | 'instance';
export type LoadBalancerType = 'ALB' | 'NLB' | 'CLB';
export type Protocol = 'HTTP' | 'HTTPS' | 'TCP' | 'UDP' | 'TLS';
export type DNSRecordType = 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'SRV' | 'NS';

export interface VPC {
  id: string;
  cidr: string;
  region: string;
  name: string;
  enableDnsHostnames: boolean;
  enableDnsSupport: boolean;
  tenancy: 'default' | 'dedicated';
  ipv6Cidr?: string;
  tags: Record<string, string>;
  createdAt: number;
}

export interface Subnet {
  id: string;
  vpcId: string;
  cidr: string;
  availabilityZone: string;
  type: SubnetType;
  mapPublicIpOnLaunch: boolean;
  ipv6Cidr?: string;
  tags: Record<string, string>;
  createdAt: number;
}

export interface RouteTable {
  id: string;
  vpcId: string;
  routes: Route[];
  associations: SubnetAssociation[];
  tags: Record<string, string>;
  createdAt: number;
}

export interface Route {
  destinationCidr: string;
  targetType: RouteTargetType;
  targetId: string;
  state: 'active' | 'blackhole';
}

export interface SubnetAssociation {
  subnetId: string;
  main: boolean;
}

export interface InternetGateway {
  id: string;
  vpcId?: string;
  attached: boolean;
  tags: Record<string, string>;
  createdAt: number;
}

export interface NatGateway {
  id: string;
  subnetId: string;
  allocationId: string;
  publicIp: string;
  state: 'pending' | 'available' | 'deleting' | 'deleted';
  tags: Record<string, string>;
  createdAt: number;
}

export interface SecurityGroup {
  id: string;
  vpcId: string;
  name: string;
  description: string;
  ingressRules: SecurityGroupRule[];
  egressRules: SecurityGroupRule[];
  tags: Record<string, string>;
  createdAt: number;
}

export interface SecurityGroupRule {
  id: string;
  protocol: Protocol | '-1';
  fromPort: number;
  toPort: number;
  source: string;
  description?: string;
}

export interface NetworkACL {
  id: string;
  vpcId: string;
  isDefault: boolean;
  ingressRules: ACLRule[];
  egressRules: ACLRule[];
  tags: Record<string, string>;
  createdAt: number;
}

export interface ACLRule {
  ruleNumber: number;
  protocol: Protocol | '-1';
  fromPort: number;
  toPort: number;
  cidr: string;
  action: 'allow' | 'deny';
}

export interface VPNConnection {
  id: string;
  type: 'ipsec.1';
  status: 'pending' | 'available' | 'deleting' | 'deleted';
  tunnelCount: number;
  vpcId: string;
  customerGatewayId: string;
  vpnGatewayId: string;
  tunnels: VPNTunnel[];
  tags: Record<string, string>;
  createdAt: number;
}

export interface VPNTunnel {
  outsideIpAddress: string;
  status: 'up' | 'down' | 'pending';
  insideCidr: string;
  preSharedKey: string;
}

export interface CustomerGateway {
  id: string;
  ipAddress: string;
  bgpAsn: number;
  type: 'ipsec.1';
  tags: Record<string, string>;
  createdAt: number;
}

export interface VPNGateway {
  id: string;
  vpcId?: string;
  attached: boolean;
  tags: Record<string, string>;
  createdAt: number;
}

export interface DirectConnectConnection {
  id: string;
  location: string;
  speed: number;
  bandwidth: string;
  status: 'ordering' | 'available' | 'down' | 'deleting';
  tags: Record<string, string>;
  createdAt: number;
}

export interface TransitGateway {
  id: string;
  description: string;
  state: 'pending' | 'available' | 'deleting' | 'deleted';
  attachments: TransitGatewayAttachment[];
  tags: Record<string, string>;
  createdAt: number;
}

export interface TransitGatewayAttachment {
  id: string;
  resourceId: string;
  resourceType: 'vpc' | 'vpn' | 'direct_connect_gateway';
  subnetIds: string[];
  state: 'pending' | 'available' | 'deleting' | 'deleted';
}

export interface VPCPeeringConnection {
  id: string;
  requesterVpcId: string;
  accepterVpcId: string;
  status: 'pending-acceptance' | 'active' | 'rejected' | 'deleted';
  tags: Record<string, string>;
  createdAt: number;
}

export interface LoadBalancer {
  id: string;
  type: LoadBalancerType;
  name: string;
  dnsName: string;
  scheme: 'internet-facing' | 'internal';
  securityGroups: string[];
  subnets: string[];
  listeners: LoadBalancerListener[];
  targetGroups: string[];
  tags: Record<string, string>;
  createdAt: number;
}

export interface LoadBalancerListener {
  id: string;
  protocol: Protocol;
  port: number;
  defaultActions: ListenerAction[];
}

export interface ListenerAction {
  type: 'forward' | 'redirect' | 'fixed-response';
  targetGroupArn?: string;
  redirectConfig?: {
    protocol: string;
    port: string;
    host: string;
    path: string;
    query: string;
    statusCode: string;
  };
}

export interface TargetGroup {
  id: string;
  name: string;
  protocol: Protocol;
  port: number;
  vpcId: string;
  targets: TargetGroupTarget[];
  healthCheck: HealthCheck;
  tags: Record<string, string>;
  createdAt: number;
}

export interface TargetGroupTarget {
  id: string;
  type: 'instance' | 'ip' | 'lambda';
  port?: number;
  availabilityZone?: string;
}

export interface HealthCheck {
  protocol: Protocol;
  port: number;
  path: string;
  interval: number;
  timeout: number;
  healthyThreshold: number;
  unhealthyThreshold: number;
  matcher: string;
}

export interface DNSZone {
  id: string;
  name: string;
  private: boolean;
  vpcIds?: string[];
  records: DNSRecord[];
  nameservers: string[];
  tags: Record<string, string>;
  createdAt: number;
}

export interface DNSRecord {
  name: string;
  type: DNSRecordType;
  value: string[];
  ttl: number;
  alias?: {
    hostname: string;
    hostedZoneId: string;
  };
}

export interface CloudFrontDistribution {
  id: string;
  arn: string;
  status: 'deployed' | 'in-progress';
  domainName: string;
  origins: CloudFrontOrigin[];
  defaultCacheBehavior: CacheBehavior;
  cacheBehaviors: CacheBehavior[];
  customErrorResponses: CustomErrorResponse[];
  tags: Record<string, string>;
  createdAt: number;
}

export interface CloudFrontOrigin {
  id: string;
  domainName: string;
  originPath: string;
  customHeaders?: { name: string; value: string }[];
}

export interface CacheBehavior {
  pathPattern: string;
  targetOriginId: string;
  viewerProtocolPolicy: 'allow-all' | 'redirect-to-https' | 'https-only';
  allowedMethods: string[];
  cachedMethods: string[];
  ttl: number;
  compress: boolean;
}

export interface CustomErrorResponse {
  errorCode: number;
  responseCode: number;
  responsePagePath?: string;
}

export interface GlobalAccelerator {
  id: string;
  name: string;
  status: 'deployed' | 'in-progress';
  staticIps: string[];
  listeners: AcceleratorListener[];
  endpointGroups: EndpointGroup[];
  tags: Record<string, string>;
  createdAt: number;
}

export interface AcceleratorListener {
  id: string;
  protocol: Protocol;
  port: number;
  clientAffinity: 'NONE' | 'SOURCE_IP';
}

export interface EndpointGroup {
  id: string;
  region: string;
  endpoints: Endpoint[];
  trafficDialPercentage: number;
  healthCheckInterval: number;
}

export interface Endpoint {
  id: string;
  type: 'load-balancer' | 'instance' | 'elastic-ip';
  weight?: number;
}

export interface VPCEndpoint {
  id: string;
  vpcId: string;
  serviceName: string;
  vpcEndpointType: 'Interface' | 'Gateway' | 'GatewayLoadBalancer';
  subnetIds: string[];
  securityGroupIds: string[];
  state: 'pending' | 'available' | 'deleting' | 'deleted';
  tags: Record<string, string>;
  createdAt: number;
}

export interface FlowLog {
  id: string;
  resourceId: string;
  resourceType: 'vpc' | 'subnet' | 'network_interface';
  destinationType: 'cloud-watch-logs' | 's3';
  destination: string;
  trafficType: 'ALL' | 'ACCEPT' | 'REJECT';
  status: 'active' | 'failed';
  tags: Record<string, string>;
  createdAt: number;
}

export interface NetworkMetrics {
  totalVPCs: number;
  totalSubnets: number;
  totalSecurityGroups: number;
  totalLoadBalancers: number;
  activeVPNConnections: number;
  totalDNSZones: number;
  dataTransferIn: number;
  dataTransferOut: number;
}

export class CloudNetworking {
  private _vpcs: Map<string, VPC> = new Map();
  private _subnets: Map<string, Subnet> = new Map();
  private _routeTables: Map<string, RouteTable> = new Map();
  private _internetGateways: Map<string, InternetGateway> = new Map();
  private _natGateways: Map<string, NatGateway> = new Map();
  private _securityGroups: Map<string, SecurityGroup> = new Map();
  private _networkACLs: Map<string, NetworkACL> = new Map();
  private _vpns: Map<string, VPNConnection> = new Map();
  private _customerGateways: Map<string, CustomerGateway> = new Map();
  private _vpnGateways: Map<string, VPNGateway> = new Map();
  private _directConnect: Map<string, DirectConnectConnection> = new Map();
  private _transitGateways: Map<string, TransitGateway> = new Map();
  private _peeringConnections: Map<string, VPCPeeringConnection> = new Map();
  private _loadBalancers: Map<string, LoadBalancer> = new Map();
  private _targetGroups: Map<string, TargetGroup> = new Map();
  private _dnsZones: Map<string, DNSZone> = new Map();
  private _cloudFront: Map<string, CloudFrontDistribution> = new Map();
  private _globalAccelerators: Map<string, GlobalAccelerator> = new Map();
  private _vpcEndpoints: Map<string, VPCEndpoint> = new Map();
  private _flowLogs: Map<string, FlowLog> = new Map();
  private _counter = 0;

  createVPC(cidr: string, options?: {
    name?: string;
    region?: string;
    enableDnsHostnames?: boolean;
    enableDnsSupport?: boolean;
    tenancy?: 'default' | 'dedicated';
    ipv6Cidr?: string;
    tags?: Record<string, string>;
  }): VPC {
    const vpc: VPC = {
      id: `vpc-${++this._counter}`,
      cidr,
      region: options?.region || 'us-east-1',
      name: options?.name || `vpc-${this._counter}`,
      enableDnsHostnames: options?.enableDnsHostnames || true,
      enableDnsSupport: options?.enableDnsSupport || true,
      tenancy: options?.tenancy || 'default',
      ipv6Cidr: options?.ipv6Cidr,
      tags: options?.tags || {},
      createdAt: Date.now(),
    };
    this._vpcs.set(vpc.id, vpc);
    this._createDefaultRouteTable(vpc.id);
    this._createDefaultSecurityGroup(vpc.id);
    this._createDefaultNetworkACL(vpc.id);
    return vpc;
  }

  private _createDefaultRouteTable(vpcId: string): void {
    const routeTable: RouteTable = {
      id: `rtb-${++this._counter}`,
      vpcId,
      routes: [
        {
          destinationCidr: '172.16.0.0/16',
          targetType: 'local',
          targetId: 'local',
          state: 'active',
        },
      ],
      associations: [],
      tags: { Name: 'default' },
      createdAt: Date.now(),
    };
    this._routeTables.set(routeTable.id, routeTable);
  }

  private _createDefaultSecurityGroup(vpcId: string): void {
    const sg: SecurityGroup = {
      id: `sg-${++this._counter}`,
      vpcId,
      name: 'default',
      description: 'Default security group',
      ingressRules: [],
      egressRules: [
        {
          id: `sgr-${++this._counter}`,
          protocol: '-1',
          fromPort: -1,
          toPort: -1,
          source: '0.0.0.0/0',
          description: 'Allow all outbound traffic',
        },
      ],
      tags: { Name: 'default' },
      createdAt: Date.now(),
    };
    this._securityGroups.set(sg.id, sg);
  }

  private _createDefaultNetworkACL(vpcId: string): void {
    const acl: NetworkACL = {
      id: `acl-${++this._counter}`,
      vpcId,
      isDefault: true,
      ingressRules: [
        { ruleNumber: 100, protocol: '-1', fromPort: -1, toPort: -1, cidr: '0.0.0.0/0', action: 'allow' },
      ],
      egressRules: [
        { ruleNumber: 100, protocol: '-1', fromPort: -1, toPort: -1, cidr: '0.0.0.0/0', action: 'allow' },
      ],
      tags: { Name: 'default' },
      createdAt: Date.now(),
    };
    this._networkACLs.set(acl.id, acl);
  }

  deleteVPC(vpcId: string): boolean {
    const vpc = this._vpcs.get(vpcId);
    if (!vpc) return false;

    const subnets = this._getSubnetsByVPC(vpcId);
    if (subnets.length > 0) {
      throw new Error('VPC has subnets. Delete them first.');
    }

    const igw = this._internetGateways.values().find(g => g.vpcId === vpcId);
    if (igw) {
      this.detachInternetGateway(igw.id, vpcId);
    }

    this._vpcs.delete(vpcId);
    return true;
  }

  createSubnet(vpcId: string, cidr: string, options?: {
    availabilityZone?: string;
    type?: SubnetType;
    mapPublicIpOnLaunch?: boolean;
    ipv6Cidr?: string;
    tags?: Record<string, string>;
  }): Subnet {
    const vpc = this._vpcs.get(vpcId);
    if (!vpc) throw new Error(`VPC ${vpcId} not found`);

    const subnet: Subnet = {
      id: `subnet-${++this._counter}`,
      vpcId,
      cidr,
      availabilityZone: options?.availabilityZone || `${vpc.region}a`,
      type: options?.type || 'PRIVATE',
      mapPublicIpOnLaunch: options?.mapPublicIpOnLaunch || false,
      ipv6Cidr: options?.ipv6Cidr,
      tags: options?.tags || {},
      createdAt: Date.now(),
    };
    this._subnets.set(subnet.id, subnet);

    const defaultRouteTable = this._routeTables.values().find(rt => rt.vpcId === vpcId);
    if (defaultRouteTable) {
      defaultRouteTable.associations.push({ subnetId: subnet.id, main: true });
    }

    return subnet;
  }

  private _getSubnetsByVPC(vpcId: string): Subnet[] {
    return Array.from(this._subnets.values()).filter(s => s.vpcId === vpcId);
  }

  createInternetGateway(options?: { tags?: Record<string, string> }): InternetGateway {
    const igw: InternetGateway = {
      id: `igw-${++this._counter}`,
      attached: false,
      tags: options?.tags || {},
      createdAt: Date.now(),
    };
    this._internetGateways.set(igw.id, igw);
    return igw;
  }

  attachInternetGateway(igwId: string, vpcId: string): void {
    const igw = this._internetGateways.get(igwId);
    const vpc = this._vpcs.get(vpcId);
    if (!igw || !vpc) throw new Error('Invalid internet gateway or VPC');

    igw.vpcId = vpcId;
    igw.attached = true;

    const routeTable = this._routeTables.values().find(rt => rt.vpcId === vpcId);
    if (routeTable) {
      routeTable.routes.push({
        destinationCidr: '0.0.0.0/0',
        targetType: 'internet_gateway',
        targetId: igwId,
        state: 'active',
      });
    }
  }

  detachInternetGateway(igwId: string, vpcId: string): void {
    const igw = this._internetGateways.get(igwId);
    if (!igw || igw.vpcId !== vpcId) return;

    igw.vpcId = undefined;
    igw.attached = false;

    const routeTable = this._routeTables.values().find(rt => rt.vpcId === vpcId);
    if (routeTable) {
      routeTable.routes = routeTable.routes.filter(r => r.targetId !== igwId);
    }
  }

  createNatGateway(subnetId: string, options?: { tags?: Record<string, string> }): NatGateway {
    const subnet = this._subnets.get(subnetId);
    if (!subnet) throw new Error(`Subnet ${subnetId} not found`);
    if (subnet.type !== 'PUBLIC') throw new Error('NAT Gateway must be in a public subnet');

    const nat: NatGateway = {
      id: `nat-${++this._counter}`,
      subnetId,
      allocationId: `eipalloc-${++this._counter}`,
      publicIp: `1${Math.floor(Math.random() * 9)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
      state: 'available',
      tags: options?.tags || {},
      createdAt: Date.now(),
    };
    this._natGateways.set(nat.id, nat);

    return nat;
  }

  createRouteTable(vpcId: string, options?: { tags?: Record<string, string> }): RouteTable {
    const vpc = this._vpcs.get(vpcId);
    if (!vpc) throw new Error(`VPC ${vpcId} not found`);

    const routeTable: RouteTable = {
      id: `rtb-${++this._counter}`,
      vpcId,
      routes: [
        {
          destinationCidr: vpc.cidr,
          targetType: 'local',
          targetId: 'local',
          state: 'active',
        },
      ],
      associations: [],
      tags: options?.tags || {},
      createdAt: Date.now(),
    };
    this._routeTables.set(routeTable.id, routeTable);
    return routeTable;
  }

  addRoute(routeTableId: string, destinationCidr: string, targetType: RouteTargetType, targetId: string): void {
    const routeTable = this._routeTables.get(routeTableId);
    if (!routeTable) throw new Error(`Route table ${routeTableId} not found`);

    routeTable.routes.push({
      destinationCidr,
      targetType,
      targetId,
      state: 'active',
    });
  }

  associateRouteTable(routeTableId: string, subnetId: string): void {
    const routeTable = this._routeTables.get(routeTableId);
    const subnet = this._subnets.get(subnetId);
    if (!routeTable || !subnet) throw new Error('Invalid route table or subnet');

    routeTable.associations.push({ subnetId, main: false });

    const mainRouteTable = this._routeTables.values().find(rt => 
      rt.vpcId === subnet.vpcId && rt.associations.some(a => a.subnetId === subnetId && a.main)
    );
    if (mainRouteTable) {
      mainRouteTable.associations = mainRouteTable.associations.filter(a => a.subnetId !== subnetId);
    }
  }

  createSecurityGroup(vpcId: string, name: string, options?: {
    description?: string;
    tags?: Record<string, string>;
  }): SecurityGroup {
    const vpc = this._vpcs.get(vpcId);
    if (!vpc) throw new Error(`VPC ${vpcId} not found`);

    const sg: SecurityGroup = {
      id: `sg-${++this._counter}`,
      vpcId,
      name,
      description: options?.description || `Security group for ${name}`,
      ingressRules: [],
      egressRules: [
        {
          id: `sgr-${++this._counter}`,
          protocol: '-1',
          fromPort: -1,
          toPort: -1,
          source: '0.0.0.0/0',
        },
      ],
      tags: options?.tags || {},
      createdAt: Date.now(),
    };
    this._securityGroups.set(sg.id, sg);
    return sg;
  }

  authorizeIngress(securityGroupId: string, rule: {
    protocol: Protocol | '-1';
    fromPort: number;
    toPort: number;
    source: string;
    description?: string;
  }): void {
    const sg = this._securityGroups.get(securityGroupId);
    if (!sg) throw new Error(`Security group ${securityGroupId} not found`);

    sg.ingressRules.push({
      id: `sgr-${++this._counter}`,
      ...rule,
    });
  }

  authorizeEgress(securityGroupId: string, rule: {
    protocol: Protocol | '-1';
    fromPort: number;
    toPort: number;
    source: string;
    description?: string;
  }): void {
    const sg = this._securityGroups.get(securityGroupId);
    if (!sg) throw new Error(`Security group ${securityGroupId} not found`);

    sg.egressRules.push({
      id: `sgr-${++this._counter}`,
      ...rule,
    });
  }

  revokeSecurityGroupRule(securityGroupId: string, ruleId: string, direction: 'ingress' | 'egress'): void {
    const sg = this._securityGroups.get(securityGroupId);
    if (!sg) throw new Error(`Security group ${securityGroupId} not found`);

    if (direction === 'ingress') {
      sg.ingressRules = sg.ingressRules.filter(r => r.id !== ruleId);
    } else {
      sg.egressRules = sg.egressRules.filter(r => r.id !== ruleId);
    }
  }

  createNetworkACL(vpcId: string, options?: { tags?: Record<string, string> }): NetworkACL {
    const vpc = this._vpcs.get(vpcId);
    if (!vpc) throw new Error(`VPC ${vpcId} not found`);

    const acl: NetworkACL = {
      id: `acl-${++this._counter}`,
      vpcId,
      isDefault: false,
      ingressRules: [],
      egressRules: [],
      tags: options?.tags || {},
      createdAt: Date.now(),
    };
    this._networkACLs.set(acl.id, acl);
    return acl;
  }

  createCustomerGateway(ipAddress: string, bgpAsn: number, options?: { tags?: Record<string, string> }): CustomerGateway {
    const cgw: CustomerGateway = {
      id: `cgw-${++this._counter}`,
      ipAddress,
      bgpAsn,
      type: 'ipsec.1',
      tags: options?.tags || {},
      createdAt: Date.now(),
    };
    this._customerGateways.set(cgw.id, cgw);
    return cgw;
  }

  createVPNGateway(options?: { tags?: Record<string, string> }): VPNGateway {
    const vgw: VPNGateway = {
      id: `vgw-${++this._counter}`,
      attached: false,
      tags: options?.tags || {},
      createdAt: Date.now(),
    };
    this._vpnGateways.set(vgw.id, vgw);
    return vgw;
  }

  attachVPNGateway(vgwId: string, vpcId: string): void {
    const vgw = this._vpnGateways.get(vgwId);
    const vpc = this._vpcs.get(vpcId);
    if (!vgw || !vpc) throw new Error('Invalid VPN gateway or VPC');

    vgw.vpcId = vpcId;
    vgw.attached = true;
  }

  createVPNConnection(vpnGatewayId: string, customerGatewayId: string, options?: { tags?: Record<string, string> }): VPNConnection {
    const vgw = this._vpnGateways.get(vpnGatewayId);
    const cgw = this._customerGateways.get(customerGatewayId);
    if (!vgw || !cgw) throw new Error('Invalid VPN gateway or customer gateway');

    const vpn: VPNConnection = {
      id: `vpn-${++this._counter}`,
      type: 'ipsec.1',
      status: 'available',
      tunnelCount: 2,
      vpcId: vgw.vpcId!,
      customerGatewayId,
      vpnGatewayId,
      tunnels: [
        {
          outsideIpAddress: `52.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
          status: 'up',
          insideCidr: '169.254.0.0/30',
          preSharedKey: `psk-${Math.random().toString(36).substr(2, 16)}`,
        },
        {
          outsideIpAddress: `52.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
          status: 'up',
          insideCidr: '169.254.0.4/30',
          preSharedKey: `psk-${Math.random().toString(36).substr(2, 16)}`,
        },
      ],
      tags: options?.tags || {},
      createdAt: Date.now(),
    };
    this._vpns.set(vpn.id, vpn);
    return vpn;
  }

  createDirectConnectConnection(location: string, bandwidth: string, options?: { tags?: Record<string, string> }): DirectConnectConnection {
    const speedMap: Record<string, number> = {
      '1Gbps': 1000,
      '10Gbps': 10000,
      '100Gbps': 100000,
    };

    const conn: DirectConnectConnection = {
      id: `dx-${++this._counter}`,
      location,
      speed: speedMap[bandwidth] || 1000,
      bandwidth,
      status: 'available',
      tags: options?.tags || {},
      createdAt: Date.now(),
    };
    this._directConnect.set(conn.id, conn);
    return conn;
  }

  createTransitGateway(options?: {
    description?: string;
    tags?: Record<string, string>;
  }): TransitGateway {
    const tgw: TransitGateway = {
      id: `tgw-${++this._counter}`,
      description: options?.description || '',
      state: 'available',
      attachments: [],
      tags: options?.tags || {},
      createdAt: Date.now(),
    };
    this._transitGateways.set(tgw.id, tgw);
    return tgw;
  }

  attachToTransitGateway(tgwId: string, resourceId: string, resourceType: 'vpc' | 'vpn' | 'direct_connect_gateway', subnetIds: string[]): TransitGatewayAttachment {
    const tgw = this._transitGateways.get(tgwId);
    if (!tgw) throw new Error(`Transit gateway ${tgwId} not found`);

    const attachment: TransitGatewayAttachment = {
      id: `tgw-attach-${++this._counter}`,
      resourceId,
      resourceType,
      subnetIds,
      state: 'available',
    };
    tgw.attachments.push(attachment);
    return attachment;
  }

  createVPCPeeringConnection(requesterVpcId: string, accepterVpcId: string, options?: { tags?: Record<string, string> }): VPCPeeringConnection {
    const requester = this._vpcs.get(requesterVpcId);
    const accepter = this._vpcs.get(accepterVpcId);
    if (!requester || !accepter) throw new Error('Invalid VPC IDs');

    const peering: VPCPeeringConnection = {
      id: `pcx-${++this._counter}`,
      requesterVpcId,
      accepterVpcId,
      status: 'pending-acceptance',
      tags: options?.tags || {},
      createdAt: Date.now(),
    };
    this._peeringConnections.set(peering.id, peering);
    return peering;
  }

  acceptVPCPeeringConnection(peeringId: string): void {
    const peering = this._peeringConnections.get(peeringId);
    if (!peering) throw new Error(`Peering connection ${peeringId} not found`);

    peering.status = 'active';

    const requesterRT = this._routeTables.values().find(rt => rt.vpcId === peering.requesterVpcId);
    const accepterRT = this._routeTables.values().find(rt => rt.vpcId === peering.accepterVpcId);
    
    if (requesterRT && accepterRT) {
      const requesterVpc = this._vpcs.get(peering.requesterVpcId);
      const accepterVpc = this._vpcs.get(peering.accepterVpcId);
      
      if (requesterVpc && accepterVpc) {
        requesterRT.routes.push({
          destinationCidr: accepterVpc.cidr,
          targetType: 'vpc_peering',
          targetId: peeringId,
          state: 'active',
        });
        
        accepterRT.routes.push({
          destinationCidr: requesterVpc.cidr,
          targetType: 'vpc_peering',
          targetId: peeringId,
          state: 'active',
        });
      }
    }
  }

  createTargetGroup(name: string, vpcId: string, options?: {
    protocol?: Protocol;
    port?: number;
    healthCheck?: Partial<HealthCheck>;
    tags?: Record<string, string>;
  }): TargetGroup {
    const vpc = this._vpcs.get(vpcId);
    if (!vpc) throw new Error(`VPC ${vpcId} not found`);

    const defaultHealthCheck: HealthCheck = {
      protocol: options?.protocol || 'HTTP',
      port: options?.port || 80,
      path: '/health',
      interval: 30,
      timeout: 5,
      healthyThreshold: 2,
      unhealthyThreshold: 2,
      matcher: '200',
    };

    const tg: TargetGroup = {
      id: `tg-${++this._counter}`,
      name,
      protocol: options?.protocol || 'HTTP',
      port: options?.port || 80,
      vpcId,
      targets: [],
      healthCheck: { ...defaultHealthCheck, ...options?.healthCheck },
      tags: options?.tags || {},
      createdAt: Date.now(),
    };
    this._targetGroups.set(tg.id, tg);
    return tg;
  }

  registerTargets(targetGroupId: string, targets: TargetGroupTarget[]): void {
    const tg = this._targetGroups.get(targetGroupId);
    if (!tg) throw new Error(`Target group ${targetGroupId} not found`);

    tg.targets.push(...targets);
  }

  createLoadBalancer(name: string, type: LoadBalancerType, vpcId: string, subnets: string[], options?: {
    scheme?: 'internet-facing' | 'internal';
    securityGroups?: string[];
    tags?: Record<string, string>;
  }): LoadBalancer {
    const vpc = this._vpcs.get(vpcId);
    if (!vpc) throw new Error(`VPC ${vpcId} not found`);

    const lb: LoadBalancer = {
      id: `lb-${++this._counter}`,
      type,
      name,
      dnsName: `${name}-${this._counter}.elb.${vpc.region}.amazonaws.com`,
      scheme: options?.scheme || 'internet-facing',
      securityGroups: options?.securityGroups || [],
      subnets,
      listeners: [],
      targetGroups: [],
      tags: options?.tags || {},
      createdAt: Date.now(),
    };
    this._loadBalancers.set(lb.id, lb);
    return lb;
  }

  createListener(loadBalancerId: string, protocol: Protocol, port: number, defaultActions: ListenerAction[]): LoadBalancerListener {
    const lb = this._loadBalancers.get(loadBalancerId);
    if (!lb) throw new Error(`Load balancer ${loadBalancerId} not found`);

    const listener: LoadBalancerListener = {
      id: `listener-${++this._counter}`,
      protocol,
      port,
      defaultActions,
    };
    lb.listeners.push(listener);
    return listener;
  }

  createDNSZone(name: string, options?: {
    private?: boolean;
    vpcIds?: string[];
    tags?: Record<string, string>;
  }): DNSZone {
    const zone: DNSZone = {
      id: `zone-${++this._counter}`,
      name,
      private: options?.private || false,
      vpcIds: options?.vpcIds,
      records: [],
      nameservers: options?.private ? [] : [
        `ns-${this._counter}.awsdns-${Math.floor(this._counter / 4)}.org`,
        `ns-${this._counter + 1}.awsdns-${Math.floor(this._counter / 4) + 1}.com`,
        `ns-${this._counter + 2}.awsdns-${Math.floor(this._counter / 4) + 2}.net`,
        `ns-${this._counter + 3}.awsdns-${Math.floor(this._counter / 4) + 3}.co.uk`,
      ],
      tags: options?.tags || {},
      createdAt: Date.now(),
    };
    this._dnsZones.set(zone.id, zone);
    return zone;
  }

  addDNSRecord(zoneId: string, record: DNSRecord): void {
    const zone = this._dnsZones.get(zoneId);
    if (!zone) throw new Error(`DNS zone ${zoneId} not found`);

    zone.records.push(record);
  }

  createCloudFrontDistribution(origins: CloudFrontOrigin[], options?: {
    defaultCacheBehavior?: Partial<CacheBehavior>;
    customErrorResponses?: CustomErrorResponse[];
    tags?: Record<string, string>;
  }): CloudFrontDistribution {
    const defaultBehavior: CacheBehavior = {
      pathPattern: '/*',
      targetOriginId: origins[0]?.id || 'origin1',
      viewerProtocolPolicy: 'redirect-to-https',
      allowedMethods: ['GET', 'HEAD', 'OPTIONS'],
      cachedMethods: ['GET', 'HEAD'],
      ttl: 86400,
      compress: true,
      ...options?.defaultCacheBehavior,
    };

    const dist: CloudFrontDistribution = {
      id: `E${++this._counter}`,
      arn: `arn:aws:cloudfront::123456789012:distribution/E${this._counter}`,
      status: 'deployed',
      domainName: `d${this._counter}.cloudfront.net`,
      origins,
      defaultCacheBehavior: defaultBehavior,
      cacheBehaviors: [],
      customErrorResponses: options?.customErrorResponses || [],
      tags: options?.tags || {},
      createdAt: Date.now(),
    };
    this._cloudFront.set(dist.id, dist);
    return dist;
  }

  createGlobalAccelerator(name: string, options?: { tags?: Record<string, string> }): GlobalAccelerator {
    const accel: GlobalAccelerator = {
      id: `aga-${++this._counter}`,
      name,
      status: 'deployed',
      staticIps: [
        `1${Math.floor(Math.random() * 9)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        `1${Math.floor(Math.random() * 9)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
      ],
      listeners: [],
      endpointGroups: [],
      tags: options?.tags || {},
      createdAt: Date.now(),
    };
    this._globalAccelerators.set(accel.id, accel);
    return accel;
  }

  createVPCEndpoint(vpcId: string, serviceName: string, vpcEndpointType: VPCEndpoint['vpcEndpointType'], options?: {
    subnetIds?: string[];
    securityGroupIds?: string[];
    tags?: Record<string, string>;
  }): VPCEndpoint {
    const vpc = this._vpcs.get(vpcId);
    if (!vpc) throw new Error(`VPC ${vpcId} not found`);

    const ep: VPCEndpoint = {
      id: `vpce-${++this._counter}`,
      vpcId,
      serviceName,
      vpcEndpointType,
      subnetIds: options?.subnetIds || [],
      securityGroupIds: options?.securityGroupIds || [],
      state: 'available',
      tags: options?.tags || {},
      createdAt: Date.now(),
    };
    this._vpcEndpoints.set(ep.id, ep);
    return ep;
  }

  createFlowLog(resourceId: string, resourceType: FlowLog['resourceType'], destinationType: FlowLog['destinationType'], destination: string, options?: {
    trafficType?: FlowLog['trafficType'];
    tags?: Record<string, string>;
  }): FlowLog {
    const flowLog: FlowLog = {
      id: `fl-${++this._counter}`,
      resourceId,
      resourceType,
      destinationType,
      destination,
      trafficType: options?.trafficType || 'ALL',
      status: 'active',
      tags: options?.tags || {},
      createdAt: Date.now(),
    };
    this._flowLogs.set(flowLog.id, flowLog);
    return flowLog;
  }

  getMetrics(): NetworkMetrics {
    return {
      totalVPCs: this._vpcs.size,
      totalSubnets: this._subnets.size,
      totalSecurityGroups: this._securityGroups.size,
      totalLoadBalancers: this._loadBalancers.size,
      activeVPNConnections: Array.from(this._vpns.values()).filter(v => v.status === 'available').length,
      totalDNSZones: this._dnsZones.size,
      dataTransferIn: 0,
      dataTransferOut: 0,
    };
  }

  validateNetworkConfiguration(vpcId: string): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    const vpc = this._vpcs.get(vpcId);
    if (!vpc) {
      return { valid: false, issues: ['VPC not found'] };
    }

    const publicSubnets = this._getSubnetsByVPC(vpcId).filter(s => s.type === 'PUBLIC');
    const privateSubnets = this._getSubnetsByVPC(vpcId).filter(s => s.type === 'PRIVATE');

    if (publicSubnets.length > 0) {
      const hasIGW = Array.from(this._internetGateways.values()).some(g => g.vpcId === vpcId);
      if (!hasIGW) {
        issues.push('Public subnets exist but no Internet Gateway attached');
      }
    }

    if (privateSubnets.length > 0) {
      const hasNAT = Array.from(this._natGateways.values()).some(n => {
        const subnet = this._subnets.get(n.subnetId);
        return subnet?.vpcId === vpcId;
      });
      if (!hasNAT) {
        issues.push('Private subnets exist but no NAT Gateway found');
      }
    }

    const routeTables = Array.from(this._routeTables.values()).filter(rt => rt.vpcId === vpcId);
    if (routeTables.length === 0) {
      issues.push('No route tables found for VPC');
    }

    return { valid: issues.length === 0, issues };
  }

  toPacket(): DataPacket<{
    vpcs: Map<string, VPC>;
    subnets: Map<string, Subnet>;
    securityGroups: Map<string, SecurityGroup>;
    loadBalancers: Map<string, LoadBalancer>;
    metrics: NetworkMetrics;
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['cloud_computing', 'CloudNetworking'],
      priority: 1,
      phase: 'cloud_networking',
    };
    return {
      id: `cloud-networking-${Date.now().toString(36)}`,
      payload: {
        vpcs: this._vpcs,
        subnets: this._subnets,
        securityGroups: this._securityGroups,
        loadBalancers: this._loadBalancers,
        metrics: this.getMetrics(),
      },
      metadata,
    };
  }

  reset(): void {
    this._vpcs = new Map();
    this._subnets = new Map();
    this._routeTables = new Map();
    this._internetGateways = new Map();
    this._natGateways = new Map();
    this._securityGroups = new Map();
    this._networkACLs = new Map();
    this._vpns = new Map();
    this._customerGateways = new Map();
    this._vpnGateways = new Map();
    this._directConnect = new Map();
    this._transitGateways = new Map();
    this._peeringConnections = new Map();
    this._loadBalancers = new Map();
    this._targetGroups = new Map();
    this._dnsZones = new Map();
    this._cloudFront = new Map();
    this._globalAccelerators = new Map();
    this._vpcEndpoints = new Map();
    this._flowLogs = new Map();
    this._counter = 0;
  }

  get networkCount(): number { return this._vpcs.size; }
  get vpnCount(): number { return this._vpns.size; }
  get subnetCount(): number { return this._subnets.size; }
  get securityGroupCount(): number { return this._securityGroups.size; }
  get loadBalancerCount(): number { return this._loadBalancers.size; }
}