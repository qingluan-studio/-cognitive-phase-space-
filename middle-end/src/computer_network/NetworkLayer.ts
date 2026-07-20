import { DataPacket, PacketMeta } from '../shared/types';

export type IPVersion = 'IPv4' | 'IPv6';

export type ProtocolType = 'ICMP' | 'TCP' | 'UDP' | 'IGMP' | 'OSPF' | 'BGP';

export type RoutingProtocol = 'RIP' | 'OSPF' | 'BGP' | 'EIGRP';

export type NATType = 'static' | 'dynamic' | 'PAT';

export type ICMPEchoCode = 0 | 8 | 3 | 11;

export interface IPPacket {
  readonly version: IPVersion;
  readonly src: string;
  readonly dst: string;
  readonly protocol: ProtocolType;
  readonly protocolNum: number;
  readonly ttl: number;
  readonly payload: string;
  readonly checksum?: number;
  readonly fragmentOffset?: number;
  readonly flags?: {
    df: boolean;
    mf: boolean;
  };
  readonly id?: number;
}

export interface IPv6Packet {
  readonly version: 6;
  readonly trafficClass: number;
  readonly flowLabel: number;
  readonly payloadLength: number;
  readonly nextHeader: number;
  readonly hopLimit: number;
  readonly src: string;
  readonly dst: string;
  readonly payload: string;
}

export interface RoutingTableEntry {
  readonly network: string;
  readonly subnetMask: string;
  readonly nextHop: string;
  readonly interface: string;
  readonly metric: number;
  readonly protocol: RoutingProtocol;
  readonly age: number;
  readonly active: boolean;
}

export interface RoutingTable {
  readonly entries: RoutingTableEntry[];
  readonly version: number;
  readonly lastUpdate: number;
}

export interface ARPEntry {
  readonly ip: string;
  readonly mac: string;
  readonly interface: string;
  readonly type: 'static' | 'dynamic';
  readonly age: number;
}

export interface DNSRecord {
  readonly name: string;
  readonly type: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'NS' | 'TXT' | 'SRV';
  readonly ttl: number;
  readonly data: string;
}

export interface DNSZone {
  readonly name: string;
  readonly records: DNSRecord[];
  readonly primaryServer: string;
  readonly secondaryServers: string[];
}

export interface NATEntry {
  readonly internalIP: string;
  readonly internalPort: number;
  readonly externalIP: string;
  readonly externalPort: number;
  readonly protocol: 'TCP' | 'UDP';
  readonly type: NATType;
  readonly timeout: number;
  readonly createdAt: number;
}

export interface ICMPMessage {
  readonly type: number;
  readonly code: number;
  readonly checksum: number;
  readonly identifier?: number;
  readonly sequenceNumber?: number;
  readonly payload: string;
}

export interface TracerouteResult {
  readonly hop: number;
  readonly ip: string;
  readonly rtt: number;
  readonly hostname?: string;
}

export interface Fragment {
  readonly id: number;
  readonly offset: number;
  readonly mf: boolean;
  readonly payload: string;
}

export interface MulticastGroup {
  readonly groupAddress: string;
  readonly sources: string[];
  readonly receivers: string[];
  readonly interface: string;
}

export interface IPsecSA {
  readonly spi: number;
  readonly destination: string;
  readonly protocol: 'AH' | 'ESP';
  readonly mode: 'tunnel' | 'transport';
  readonly encryptionAlgorithm: string;
  readonly authenticationAlgorithm: string;
  readonly lifetime: number;
}

export class NetworkLayer {
  private _packets: IPPacket[] = [];
  private _ipv6Packets: IPv6Packet[] = [];
  private _routingTable: RoutingTable = { entries: [], version: 0, lastUpdate: Date.now() };
  private _arpTable: Map<string, ARPEntry> = new Map();
  private _dnsCache: Map<string, DNSRecord[]> = new Map();
  private _dnsZones: Map<string, DNSZone> = new Map();
  private _natTable: Map<string, NATEntry> = new Map();
  private _ipsecSAs: Map<string, IPsecSA> = new Map();
  private _multicastGroups: Map<string, MulticastGroup> = new Map();
  private _history: string[] = [];
  private _counter = 0;
  private _seqNum = 0;

  get packetCount(): number {
    return this._packets.length;
  }

  get routingVersion(): number {
    return this._routingTable.version;
  }

  get history(): string[] {
    return [...this._history];
  }

  get arpTableSize(): number {
    return this._arpTable.size;
  }

  get dnsCacheSize(): number {
    return this._dnsCache.size;
  }

  get natEntryCount(): number {
    return this._natTable.size;
  }

  createIPPacket(
    src: string,
    dst: string,
    protocol: ProtocolType,
    payload: string,
    options?: {
      ttl?: number;
      id?: number;
      flags?: { df: boolean; mf: boolean };
      fragmentOffset?: number;
    }
  ): IPPacket {
    const protocolMap: Record<ProtocolType, number> = {
      ICMP: 1,
      TCP: 6,
      UDP: 17,
      IGMP: 2,
      OSPF: 89,
      BGP: 179,
    };

    const packet: IPPacket = {
      version: 'IPv4',
      src,
      dst,
      protocol,
      protocolNum: protocolMap[protocol],
      ttl: options?.ttl ?? 64,
      payload,
      checksum: this._calculateIPChecksum(src, dst, protocolMap[protocol], payload),
      id: options?.id ?? this._seqNum++,
      flags: options?.flags,
      fragmentOffset: options?.fragmentOffset,
    };

    this._packets.push(packet);
    this._recordHistory(`createIPPacket(${src} -> ${dst}, proto=${protocol})`);
    return packet;
  }

  private _calculateIPChecksum(src: string, dst: string, protocol: number, payload: string): number {
    let sum = 0;
    const ipToNum = (ip: string) => {
      const parts = ip.split('.').map(Number);
      return (parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3];
    };
    sum += ipToNum(src);
    sum += ipToNum(dst);
    sum += protocol;
    sum += payload.length;
    for (let i = 0; i < payload.length; i++) {
      sum += payload.charCodeAt(i);
    }
    return ~sum & 0xFFFFFFFF;
  }

  ipRouting(packet: IPPacket, routingTable?: RoutingTable): { forwarded: boolean; nextHop: string; interface: string; packet: IPPacket } {
    const table = routingTable || this._routingTable;
    const dstIP = this._parseIP(packet.dst);

    let bestMatch: RoutingTableEntry | null = null;
    let longestPrefix = -1;

    for (const entry of table.entries) {
      if (!entry.active) continue;
      const [network, prefix] = entry.network.split('/');
      const prefixLen = parseInt(prefix, 10);
      if (this._ipMatchesNetwork(dstIP, this._parseIP(network), prefixLen)) {
        if (prefixLen > longestPrefix) {
          longestPrefix = prefixLen;
          bestMatch = entry;
        } else if (prefixLen === longestPrefix && entry.metric < (bestMatch?.metric ?? Infinity)) {
          bestMatch = entry;
        }
      }
    }

    const nextHop = bestMatch?.nextHop ?? '0.0.0.0';
    const outInterface = bestMatch?.interface ?? 'eth0';
    const forwarded = packet.ttl > 1;

    if (forwarded) {
      this._packets.push({ ...packet, ttl: packet.ttl - 1 });
    }

    this._recordHistory(`ipRouting(src=${packet.src}, dst=${packet.dst}) -> nextHop=${nextHop}, iface=${outInterface}`);
    return { forwarded, nextHop, interface: outInterface, packet: { ...packet, ttl: packet.ttl - 1 } };
  }

  private _parseIP(ip: string): number[] {
    return ip.split('.').map(Number);
  }

  private _ipMatchesNetwork(ip: number[], network: number[], prefixLen: number): boolean {
    for (let i = 0; i < 4; i++) {
      const bitsInOctet = Math.min(8, Math.max(0, prefixLen - i * 8));
      const mask = bitsInOctet === 8 ? 0xFF : bitsInOctet === 0 ? 0x00 : 0xFF << (8 - bitsInOctet);
      if ((ip[i] & mask) !== (network[i] & mask)) {
        return false;
      }
    }
    return true;
  }

  staticRoute(network: string, nextHop: string, options?: { metric?: number; interface?: string; subnetMask?: string }): { network: string; nextHop: string; metric: number; interface: string; added: boolean } {
    const existingIndex = this._routingTable.entries.findIndex(e => e.network === network);
    const subnetMask = options?.subnetMask ?? this._prefixToMask(network.split('/')[1] ?? '24');

    if (existingIndex >= 0) {
      this._routingTable.entries[existingIndex] = {
        ...this._routingTable.entries[existingIndex],
        nextHop,
        metric: options?.metric ?? 1,
        interface: options?.interface ?? 'eth0',
        age: 0,
        active: true,
      };
    } else {
      this._routingTable.entries.push({
        network,
        subnetMask,
        nextHop,
        interface: options?.interface ?? 'eth0',
        metric: options?.metric ?? 1,
        protocol: 'RIP',
        age: 0,
        active: true,
      });
    }

    this._routingTable.version++;
    this._routingTable.lastUpdate = Date.now();
    this._recordHistory(`staticRoute(${network} -> ${nextHop}, metric=${options?.metric ?? 1})`);
    return { network, nextHop, metric: options?.metric ?? 1, interface: options?.interface ?? 'eth0', added: true };
  }

  private _prefixToMask(prefix: string): string {
    const len = parseInt(prefix, 10);
    const mask = [];
    for (let i = 0; i < 4; i++) {
      const bits = Math.min(8, Math.max(0, len - i * 8));
      mask.push(bits === 8 ? 255 : bits === 0 ? 0 : 256 - Math.pow(2, 8 - bits));
    }
    return mask.join('.');
  }

  dynamicRouting(nodes: string[], protocol: RoutingProtocol): { routes: number; protocol: string; convergence: number; topology: string } {
    let routes = 0;
    let convergence = 0;
    let topology = 'unknown';

    switch (protocol) {
      case 'RIP':
        routes = nodes.length * 3;
        convergence = 30 + nodes.length * 2;
        topology = 'flat';
        break;
      case 'OSPF':
        routes = nodes.length * nodes.length;
        convergence = 5 + nodes.length;
        topology = 'hierarchical';
        break;
      case 'BGP':
        routes = nodes.length * 10;
        convergence = 60 + nodes.length * 5;
        topology = 'AS-based';
        break;
      case 'EIGRP':
        routes = nodes.length * 4;
        convergence = 3 + nodes.length;
        topology = 'hybrid';
        break;
    }

    this._recordHistory(`dynamicRouting(nodes=${nodes.length}, protocol=${protocol}) -> routes=${routes}`);
    return { routes, protocol, convergence, topology };
  }

  rip(routers: string[], updates: number, poisonReverse: boolean): { routes: number; maxHops: number; updates: number; protocol: string; splitHorizon: boolean } {
    const routes = routers.length * 3;
    const maxHops = 15;

    for (let i = 0; i < updates; i++) {
      const router = routers[i % routers.length];
      const cost = Math.min(15, Math.floor(Math.random() * 10) + 1);
      this._routingTable.entries.push({
        network: `${10 + i}.0.0.0/8`,
        subnetMask: '255.0.0.0',
        nextHop: router,
        interface: 'eth0',
        metric: cost,
        protocol: 'RIP',
        age: 0,
        active: true,
      });
    }

    this._routingTable.version += updates;
    this._recordHistory(`rip(routers=${routers.length}, updates=${updates}, poisonReverse=${poisonReverse})`);
    return { routes, maxHops, updates, protocol: 'RIP', splitHorizon: !poisonReverse };
  }

  ospf(routers: string[], areas: number, linkState: boolean): { areas: number; routers: number; lsdbSize: number; protocol: string; dr: string; bdr: string } {
    const lsdbSize = routers.length * routers.length;
    const dr = routers[0] ?? '';
    const bdr = routers[1] ?? '';

    for (let area = 0; area < areas; area++) {
      for (const router of routers) {
        this._routingTable.entries.push({
          network: `${192}.${168}.${area}.0/24`,
          subnetMask: '255.255.255.0',
          nextHop: router,
          interface: `eth${area}`,
          metric: Math.floor(Math.random() * 100) + 1,
          protocol: 'OSPF',
          age: 0,
          active: true,
        });
      }
    }

    this._routingTable.version += areas;
    this._recordHistory(`ospf(routers=${routers.length}, areas=${areas}, linkState=${linkState})`);
    return { areas, routers: routers.length, lsdbSize, protocol: 'OSPF', dr, bdr };
  }

  bgp(autonomousSystems: number, peers: number, paths: string[]): { asn: number; peers: number; paths: number; protocol: string; bestPath: string; communities: string[] } {
    const bestPath = paths[0] ?? '';
    const communities = ['NO_EXPORT', 'NO_ADVERTISE', 'LOCAL_AS'];

    for (let i = 0; i < paths.length; i++) {
      this._routingTable.entries.push({
        network: `${172}.${16 + i}.0.0/16`,
        subnetMask: '255.255.0.0',
        nextHop: paths[i],
        interface: 'bgp0',
        metric: i + 1,
        protocol: 'BGP',
        age: 0,
        active: true,
      });
    }

    this._routingTable.version++;
    this._recordHistory(`bgp(ASes=${autonomousSystems}, peers=${peers}, paths=${paths.length})`);
    return { asn: autonomousSystems, peers, paths: paths.length, protocol: 'BGP', bestPath, communities };
  }

  eigrp(routers: string[], networks: string[]): { routers: number; networks: number; protocol: string; feasibleDistance: number[] } {
    const feasibleDistances = networks.map(() => Math.floor(Math.random() * 10000) + 100);

    for (let i = 0; i < networks.length; i++) {
      this._routingTable.entries.push({
        network: networks[i],
        subnetMask: '255.255.255.0',
        nextHop: routers[i % routers.length],
        interface: 'eth0',
        metric: feasibleDistances[i],
        protocol: 'EIGRP',
        age: 0,
        active: true,
      });
    }

    this._recordHistory(`eigrp(routers=${routers.length}, networks=${networks.length})`);
    return { routers: routers.length, networks: networks.length, protocol: 'EIGRP', feasibleDistance: feasibleDistances };
  }

  subnetting(network: string, mask: string, subnets: number): { subnets: string[]; mask: string; hostsPerSubnet: number; totalHosts: number; networkAddress: string; broadcastAddress: string } {
    const subnetList: string[] = [];
    const [baseIP, prefix] = network.split('/');
    const basePrefix = parseInt(prefix, 10);
    const newPrefix = basePrefix + Math.ceil(Math.log2(subnets));
    const hostsPerSubnet = Math.pow(2, 32 - newPrefix) - 2;
    const totalHosts = hostsPerSubnet * subnets;

    const ipParts = baseIP.split('.').map(Number);
    const subnetIncrement = Math.pow(2, 8 - ((newPrefix - 1) % 8));
    let currentIP = [...ipParts];
    const subnetOctet = Math.floor(newPrefix / 8) - 1;

    for (let i = 0; i < subnets; i++) {
      subnetList.push(`${currentIP.join('.')}/${newPrefix}`);
      currentIP[subnetOctet] += subnetIncrement;
      if (currentIP[subnetOctet] >= 256) {
        currentIP[subnetOctet] = 0;
        currentIP[subnetOctet - 1]++;
      }
    }

    const broadcastIP = [...ipParts];
    broadcastIP[subnetOctet] += subnetIncrement - 1;

    this._recordHistory(`subnetting(network=${network}, subnets=${subnets}) -> mask=/${newPrefix}`);
    return {
      subnets: subnetList,
      mask: `/${newPrefix}`,
      hostsPerSubnet,
      totalHosts,
      networkAddress: baseIP,
      broadcastAddress: broadcastIP.join('.'),
    };
  }

  vlsm(network: string, subnetRequirements: { name: string; hosts: number }[]): { subnets: { name: string; network: string; mask: string; hosts: number }[]; optimized: boolean; totalSubnets: number } {
    subnetRequirements.sort((a, b) => b.hosts - a.hosts);

    const subnets: { name: string; network: string; mask: string; hosts: number }[] = [];
    const [baseIP] = network.split('/');
    const ipParts = baseIP.split('.').map(Number);
    let currentIP = [...ipParts];

    for (const req of subnetRequirements) {
      const prefix = 32 - Math.ceil(Math.log2(req.hosts + 2));
      const mask = this._prefixToMask(prefix.toString());
      const subnetIncrement = Math.pow(2, 8 - ((prefix - 1) % 8));
      const subnetOctet = Math.floor(prefix / 8) - 1;

      subnets.push({
        name: req.name,
        network: `${currentIP.join('.')}/${prefix}`,
        mask,
        hosts: req.hosts,
      });

      currentIP[subnetOctet] += subnetIncrement;
      if (currentIP[subnetOctet] >= 256) {
        currentIP[subnetOctet] = 0;
        currentIP[subnetOctet - 1]++;
      }
    }

    this._recordHistory(`vlsm(network=${network}, subnets=${subnetRequirements.length}) -> optimized`);
    return { subnets, optimized: true, totalSubnets: subnets.length };
  }

  cidr(network: string, prefix: number): { network: string; prefix: number; hosts: number; mask: string; wildcard: string; networkAddress: string; broadcastAddress: string; firstHost: string; lastHost: string } {
    const hosts = Math.pow(2, 32 - prefix) - 2;
    const mask = this._prefixToMask(prefix.toString());
    const wildcard = mask.split('.').map(o => 255 - parseInt(o)).join('.');

    const ipParts = network.split('.').map(Number);
    const maskParts = mask.split('.').map(Number);
    const networkAddr = ipParts.map((ip, i) => ip & maskParts[i]).join('.');

    const broadcastAddr = ipParts.map((ip, i) => ip | (255 - maskParts[i])).join('.');
    const firstHostParts = networkAddr.split('.').map(Number);
    firstHostParts[3]++;
    const firstHost = firstHostParts.join('.');

    const lastHostParts = broadcastAddr.split('.').map(Number);
    lastHostParts[3]--;
    const lastHost = lastHostParts.join('.');

    this._recordHistory(`cidr(${network}/${prefix}) -> hosts=${hosts}`);
    return { network, prefix, hosts, mask, wildcard, networkAddress: networkAddr, broadcastAddress: broadcastAddr, firstHost, lastHost };
  }

  nat(packet: IPPacket, type: NATType, pool?: string[], mapping?: Map<string, string>): { translated: IPPacket; type: string; entry: string; poolSize?: number } {
    let translatedSrc = packet.src;
    let entry = '';

    switch (type) {
      case 'static':
        if (mapping) {
          translatedSrc = mapping.get(packet.src) ?? packet.src;
        }
        entry = `${packet.src} -> ${translatedSrc}`;
        break;
      case 'dynamic':
        if (pool && pool.length > 0) {
          translatedSrc = pool[this._counter % pool.length];
        }
        entry = `${packet.src} -> ${translatedSrc} (dynamic)`;
        break;
      case 'PAT':
        if (pool && pool.length > 0) {
          translatedSrc = pool[0];
        }
        entry = `${packet.src} -> ${translatedSrc}:${1024 + this._counter % 64511} (PAT)`;
        break;
    }

    const translated: IPPacket = { ...packet, src: translatedSrc };
    this._packets.push(translated);
    this._recordHistory(`nat(type=${type}, src=${packet.src} -> ${translatedSrc})`);
    return { translated, type, entry, poolSize: pool?.length };
  }

  pat(packet: IPPacket, externalIP: string, portRange: { start: number; end: number }): { translated: IPPacket; externalIP: string; externalPort: number; poolSize: number } {
    const externalPort = portRange.start + this._counter % (portRange.end - portRange.start);
    const translated: IPPacket = { ...packet, src: externalIP };

    const natEntry: NATEntry = {
      internalIP: packet.src,
      internalPort: this._extractPort(packet),
      externalIP,
      externalPort,
      protocol: packet.protocol === 'TCP' ? 'TCP' : 'UDP',
      type: 'PAT',
      timeout: packet.protocol === 'TCP' ? 3600 : 60,
      createdAt: Date.now(),
    };

    this._natTable.set(`${packet.src}:${this._extractPort(packet)}`, natEntry);
    this._packets.push(translated);
    this._recordHistory(`pat(${packet.src} -> ${externalIP}:${externalPort})`);
    return { translated, externalIP, externalPort, poolSize: portRange.end - portRange.start };
  }

  private _extractPort(packet: IPPacket): number {
    return 80;
  }

  fragmentation(packet: IPPacket, mtu: number): { fragments: IPPacket[]; count: number; mtu: number; reassembledSize: number } {
    const headerSize = 20;
    const fragmentSize = mtu - headerSize;
    const count = Math.ceil(packet.payload.length / fragmentSize);
    const fragments: IPPacket[] = [];

    for (let i = 0; i < count; i++) {
      const offset = i * fragmentSize;
      const payload = packet.payload.slice(offset, offset + fragmentSize);
      const mf = i < count - 1;

      fragments.push({
        ...packet,
        payload,
        fragmentOffset: offset / 8,
        flags: { df: false, mf },
        id: packet.id ?? this._seqNum,
      });
    }

    this._packets.push(...fragments);
    this._recordHistory(`fragmentation(mtu=${mtu}, size=${packet.payload.length}) -> fragments=${count}`);
    return { fragments, count, mtu, reassembledSize: packet.payload.length };
  }

  reassembly(fragments: IPPacket[]): { reassembled: IPPacket | null; fragmentsUsed: number; success: boolean } {
    if (fragments.length === 0) {
      return { reassembled: null, fragmentsUsed: 0, success: false };
    }

    const sorted = fragments.sort((a, b) => (a.fragmentOffset ?? 0) - (b.fragmentOffset ?? 0));
    let payload = '';

    for (const fragment of sorted) {
      payload += fragment.payload;
      if (!fragment.flags?.mf) break;
    }

    const reassembled: IPPacket = {
      ...sorted[0],
      payload,
      fragmentOffset: undefined,
      flags: { df: false, mf: false },
    };

    this._recordHistory(`reassembly(fragments=${fragments.length}) -> success=${payload.length > 0}`);
    return { reassembled, fragmentsUsed: sorted.length, success: payload.length > 0 };
  }

  icmpMessage(type: number, code: number, content: string, options?: { identifier?: number; sequenceNumber?: number }): ICMPMessage {
    const checksum = this._calculateICMPChecksum(type, code, content);

    const message: ICMPMessage = {
      type,
      code,
      checksum,
      identifier: options?.identifier,
      sequenceNumber: options?.sequenceNumber,
      payload: content,
    };

    this._recordHistory(`icmp(type=${type}, code=${code})`);
    return message;
  }

  private _calculateICMPChecksum(type: number, code: number, payload: string): number {
    let sum = type + code;
    for (let i = 0; i < payload.length; i++) {
      sum += payload.charCodeAt(i);
    }
    return ~sum & 0xFFFF;
  }

  ping(src: string, dst: string, options?: { count?: number; interval?: number; timeout?: number }): { sent: number; received: number; loss: number; rtts: number[]; avgRtt: number; minRtt: number; maxRtt: number } {
    const count = options?.count ?? 4;
    const rtts: number[] = [];
    let received = 0;

    for (let i = 0; i < count; i++) {
      const rtt = Math.floor(Math.random() * 50) + 10;
      if (Math.random() > 0.1) {
        received++;
        rtts.push(rtt);
      }
    }

    const loss = ((count - received) / count) * 100;
    const avgRtt = rtts.length > 0 ? rtts.reduce((a, b) => a + b, 0) / rtts.length : 0;
    const minRtt = rtts.length > 0 ? Math.min(...rtts) : 0;
    const maxRtt = rtts.length > 0 ? Math.max(...rtts) : 0;

    this._recordHistory(`ping(${src} -> ${dst}) -> loss=${loss.toFixed(1)}%, avgRtt=${avgRtt.toFixed(1)}ms`);
    return { sent: count, received, loss, rtts, avgRtt, minRtt, maxRtt };
  }

  traceroute(src: string, dst: string, maxHops: number = 30): TracerouteResult[] {
    const hops: TracerouteResult[] = [];
    let reached = false;

    for (let i = 1; i <= Math.min(maxHops, 20) && !reached; i++) {
      const ip = `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
      const rtt = Math.floor(Math.random() * 50) + 10;

      hops.push({ hop: i, ip, rtt, hostname: `router-${i}.example.com` });

      if (ip === dst || Math.random() > 0.85) {
        reached = true;
        hops.push({ hop: i + 1, ip: dst, rtt: Math.floor(Math.random() * 30) + 5, hostname: dst });
      }
    }

    this._recordHistory(`traceroute(${src} -> ${dst}) -> hops=${hops.length}`);
    return hops;
  }

  arpResolve(ip: string, interfaceName: string): { ip: string; mac: string; resolved: boolean; type: 'static' | 'dynamic' } {
    const cached = this._arpTable.get(ip);
    if (cached && cached.age < 300) {
      return { ip, mac: cached.mac, resolved: true, type: cached.type };
    }

    const mac = this._generateMAC();
    const entry: ARPEntry = {
      ip,
      mac,
      interface: interfaceName,
      type: 'dynamic',
      age: 0,
    };

    this._arpTable.set(ip, entry);
    this._recordHistory(`arpResolve(${ip}@${interfaceName}) -> ${mac}`);
    return { ip, mac, resolved: true, type: 'dynamic' };
  }

  private _generateMAC(): string {
    const hex = '0123456789ABCDEF';
    let mac = '';
    for (let i = 0; i < 6; i++) {
      mac += hex[Math.floor(Math.random() * 16)];
      mac += hex[Math.floor(Math.random() * 16)];
      if (i < 5) mac += ':';
    }
    return mac;
  }

  arpCache(ip: string, mac: string, interfaceName: string, type: 'static' | 'dynamic' = 'dynamic'): { added: boolean; ip: string; mac: string; type: string } {
    const entry: ARPEntry = { ip, mac, interface: interfaceName, type, age: 0 };
    this._arpTable.set(ip, entry);
    this._recordHistory(`arpCache(${ip} -> ${mac}, type=${type})`);
    return { added: true, ip, mac, type };
  }

  arpTable(): ARPEntry[] {
    return Array.from(this._arpTable.values());
  }

  dnsQuery(domain: string, type: DNSRecord['type'], resolver: string): { domain: string; type: string; resolver: string; result: string; ttl: number; cached: boolean } {
    const cached = this._dnsCache.get(domain);
    if (cached) {
      const record = cached.find(r => r.type === type);
      if (record) {
        this._recordHistory(`dnsQuery(${domain}, ${type}) -> cached ${record.data}`);
        return { domain, type, resolver, result: record.data, ttl: record.ttl, cached: true };
      }
    }

    const result = this._resolveDNS(domain, type);
    const ttl = 3600;

    if (!this._dnsCache.has(domain)) {
      this._dnsCache.set(domain, []);
    }
    this._dnsCache.get(domain)?.push({ name: domain, type, ttl, data: result });

    this._recordHistory(`dnsQuery(${domain}, ${type}) via ${resolver} -> ${result}`);
    return { domain, type, resolver, result, ttl, cached: false };
  }

  private _resolveDNS(domain: string, type: DNSRecord['type']): string {
    switch (type) {
      case 'A':
        return `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
      case 'AAAA':
        return `2001:db8:${Math.floor(Math.random() * 65535).toString(16)}::${Math.floor(Math.random() * 65535).toString(16)}`;
      case 'CNAME':
        return `www.${domain}`;
      case 'MX':
        return `mail.${domain}`;
      case 'NS':
        return `ns1.${domain}`;
      default:
        return '';
    }
  }

  dnsResolve(domain: string, recordType: DNSRecord['type']): { domain: string; recordType: string; records: DNSRecord[]; ttl: number } {
    const records: DNSRecord[] = [];

    for (let i = 0; i < 3; i++) {
      const data = this._resolveDNS(domain, recordType);
      records.push({
        name: domain,
        type: recordType,
        ttl: 3600 - i * 600,
        data,
      });
    }

    this._recordHistory(`dnsResolve(${domain}, ${recordType}) -> ${records.length} records`);
    return { domain, recordType, records, ttl: 3600 };
  }

  dnsZoneCreate(name: string, primaryServer: string, secondaryServers: string[]): { zone: string; created: boolean; records: number } {
    const zone: DNSZone = { name, records: [], primaryServer, secondaryServers };
    this._dnsZones.set(name, zone);
    this._recordHistory(`dnsZoneCreate(${name}, primary=${primaryServer})`);
    return { zone: name, created: true, records: 0 };
  }

  dnsZoneAddRecord(zoneName: string, record: DNSRecord): { zone: string; recordType: string; added: boolean; totalRecords: number } {
    const zone = this._dnsZones.get(zoneName);
    if (!zone) {
      return { zone: zoneName, recordType: record.type, added: false, totalRecords: 0 };
    }

    zone.records.push(record);
    this._recordHistory(`dnsZoneAddRecord(${zoneName}, ${record.type} ${record.name})`);
    return { zone: zoneName, recordType: record.type, added: true, totalRecords: zone.records.length };
  }

  ipv6Packet(
    src: string,
    dst: string,
    payload: string,
    options?: { trafficClass?: number; flowLabel?: number; nextHeader?: number; hopLimit?: number }
  ): IPv6Packet {
    const packet: IPv6Packet = {
      version: 6,
      trafficClass: options?.trafficClass ?? 0,
      flowLabel: options?.flowLabel ?? 0,
      payloadLength: payload.length,
      nextHeader: options?.nextHeader ?? 6,
      hopLimit: options?.hopLimit ?? 128,
      src,
      dst,
      payload,
    };

    this._ipv6Packets.push(packet);
    this._recordHistory(`ipv6Packet(${src} -> ${dst})`);
    return packet;
  }

  ipv6Routing(packet: IPv6Packet): { forwarded: boolean; nextHop: string; hopLimit: number } {
    const nextHop = '::1';
    const forwarded = packet.hopLimit > 1;

    if (forwarded) {
      this._ipv6Packets.push({ ...packet, hopLimit: packet.hopLimit - 1 });
    }

    this._recordHistory(`ipv6Routing(${packet.src} -> ${packet.dst}) -> nextHop=${nextHop}`);
    return { forwarded, nextHop, hopLimit: packet.hopLimit - 1 };
  }

  ipv6AddressAutoconfig(prefix: string): { address: string; type: 'SLAAC' | 'DHCPv6'; prefix: string; validLifetime: number; preferredLifetime: number } {
    const randomPart = Math.floor(Math.random() * 0xFFFFFFFF).toString(16);
    const address = `${prefix}:${randomPart}`;

    this._recordHistory(`ipv6AddressAutoconfig(${prefix}) -> ${address}`);
    return { address, type: 'SLAAC', prefix, validLifetime: 86400, preferredLifetime: 43200 };
  }

  multicastJoin(groupAddress: string, source: string, interfaceName: string): { joined: boolean; group: string; source: string; interface: string } {
    let group = this._multicastGroups.get(groupAddress);
    if (!group) {
      group = { groupAddress, sources: [], receivers: [], interface: interfaceName };
      this._multicastGroups.set(groupAddress, group);
    }

    if (!group.sources.includes(source)) {
      group.sources.push(source);
    }

    this._recordHistory(`multicastJoin(${groupAddress}, source=${source})`);
    return { joined: true, group: groupAddress, source, interface: interfaceName };
  }

  multicastLeave(groupAddress: string, source: string): { left: boolean; group: string; remainingSources: number } {
    const group = this._multicastGroups.get(groupAddress);
    if (!group) {
      return { left: false, group: groupAddress, remainingSources: 0 };
    }

    const idx = group.sources.indexOf(source);
    if (idx >= 0) {
      group.sources.splice(idx, 1);
    }

    this._recordHistory(`multicastLeave(${groupAddress}, source=${source})`);
    return { left: idx >= 0, group: groupAddress, remainingSources: group.sources.length };
  }

  ipsecSA(spi: number, destination: string, protocol: 'AH' | 'ESP', mode: 'tunnel' | 'transport'): { created: boolean; spi: number; destination: string; protocol: string; mode: string } {
    const sa: IPsecSA = {
      spi,
      destination,
      protocol,
      mode,
      encryptionAlgorithm: 'AES-256-GCM',
      authenticationAlgorithm: 'SHA-256',
      lifetime: 3600,
    };

    this._ipsecSAs.set(`${destination}:${spi}`, sa);
    this._recordHistory(`ipsecSA(dst=${destination}, spi=${spi}, ${protocol}/${mode})`);
    return { created: true, spi, destination, protocol, mode };
  }

  getRoutingTable(): RoutingTable {
    return { ...this._routingTable, entries: [...this._routingTable.entries] };
  }

  getNATTable(): NATEntry[] {
    return Array.from(this._natTable.values());
  }

  cleanupStaleEntries(): { arpCleaned: number; natCleaned: number; dnsCleaned: number } {
    let arpCleaned = 0;
    let natCleaned = 0;
    let dnsCleaned = 0;
    const now = Date.now();

    for (const [ip, entry] of this._arpTable.entries()) {
      if (entry.age > 300) {
        this._arpTable.delete(ip);
        arpCleaned++;
      }
    }

    for (const [key, entry] of this._natTable.entries()) {
      if (now - entry.createdAt > entry.timeout * 1000) {
        this._natTable.delete(key);
        natCleaned++;
      }
    }

    for (const [domain, records] of this._dnsCache.entries()) {
      const validRecords = records.filter(r => r.ttl > 0);
      if (validRecords.length === 0) {
        this._dnsCache.delete(domain);
        dnsCleaned++;
      } else {
        this._dnsCache.set(domain, validRecords);
      }
    }

    this._recordHistory(`cleanupStaleEntries: arp=${arpCleaned}, nat=${natCleaned}, dns=${dnsCleaned}`);
    return { arpCleaned, natCleaned, dnsCleaned };
  }

  toPacket(): DataPacket<{
    packets: number;
    routingVersion: number;
    arpTableSize: number;
    dnsCacheSize: number;
    natEntryCount: number;
    history: string[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['computer_network', 'network_layer', 'result'],
      priority: 0.75,
      phase: 'routing',
    };

    return {
      id: `network-layer-${Date.now().toString(36)}-${this._counter}`,
      payload: {
        packets: this._packets.length,
        routingVersion: this._routingTable.version,
        arpTableSize: this._arpTable.size,
        dnsCacheSize: this._dnsCache.size,
        natEntryCount: this._natTable.size,
        history: [...this._history],
      },
      metadata,
    };
  }

  reset(): void {
    this._packets = [];
    this._ipv6Packets = [];
    this._routingTable = { entries: [], version: 0, lastUpdate: Date.now() };
    this._arpTable.clear();
    this._dnsCache.clear();
    this._dnsZones.clear();
    this._natTable.clear();
    this._ipsecSAs.clear();
    this._multicastGroups.clear();
    this._history = [];
    this._counter = 0;
    this._seqNum = 0;
  }

  private _recordHistory(entry: string): void {
    this._counter++;
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
  }
}