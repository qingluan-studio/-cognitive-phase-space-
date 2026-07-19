import { DataPacket } from '../shared/types';

export interface IPPacket {
  readonly src: string;
  readonly dst: string;
  readonly protocol: number;
  readonly ttl: number;
  readonly payload: string;
}

export interface RoutingTable {
  readonly entries: { network: string; nextHop: string; metric: number; interface: string }[];
  readonly version: number;
}

export class NetworkLayer {
  private _packets: IPPacket[] = [];
  private _routingTable: RoutingTable = { entries: [], version: 0 };
  private _history: string[] = [];
  private _counter = 0;

  get packetCount(): number {
    return this._packets.length;
  }

  get routingVersion(): number {
    return this._routingTable.version;
  }

  get history(): string[] {
    return [...this._history];
  }

  public ipRouting(packet: IPPacket, routingTable: RoutingTable): { forwarded: boolean; nextHop: string; packet: IPPacket } {
    const entry = routingTable.entries.find(e => packet.dst.startsWith(e.network.split('/')[0] ?? ''));
    const nextHop = entry?.nextHop ?? 'default';
    this._packets.push({ ...packet, ttl: packet.ttl - 1 });
    this._recordHistory(`ipRouting(src=${packet.src}, dst=${packet.dst}) -> nextHop=${nextHop}`);
    return { forwarded: packet.ttl > 0, nextHop, packet: { ...packet, ttl: packet.ttl - 1 } };
  }

  public staticRoute(network: string, nextHop: string): { network: string; nextHop: string; metric: number; added: boolean } {
    this._routingTable.entries.push({ network, nextHop, metric: 1, interface: 'eth0' });
    this._routingTable.version++;
    this._recordHistory(`staticRoute(${network} -> ${nextHop})`);
    return { network, nextHop, metric: 1, added: true };
  }

  public dynamicRouting(nodes: string[], protocol: string): { routes: number; protocol: string; convergence: number } {
    const routes = nodes.length * 2;
    const convergence = protocol === 'OSPF' ? 5 : 30;
    this._recordHistory(`dynamicRouting(nodes=${nodes.length}, protocol=${protocol})`);
    return { routes, protocol, convergence };
  }

  public rip(routers: string[], updates: number, poisonReverse: boolean): { routes: number; maxHops: number; updates: number; protocol: string } {
    const routes = routers.length * 3;
    const maxHops = 15;
    this._recordHistory(`rip(routers=${routers.length}, updates=${updates}, poisonReverse=${poisonReverse})`);
    return { routes, maxHops, updates, protocol: 'RIP' };
  }

  public ospf(routers: string[], areas: number, linkState: boolean): { areas: number; routers: number; lsdbSize: number; protocol: string } {
    const lsdbSize = routers.length * routers.length;
    this._recordHistory(`ospf(routers=${routers.length}, areas=${areas})`);
    return { areas, routers: routers.length, lsdbSize, protocol: 'OSPF' };
  }

  public bgp(autonomousSystems: number, peers: number, paths: string[]): { asn: number; peers: number; paths: number; protocol: string } {
    this._recordHistory(`bgp(ASes=${autonomousSystems}, peers=${peers})`);
    return { asn: autonomousSystems, peers, paths: paths.length, protocol: 'BGP' };
  }

  public subnetting(network: string, mask: string, subnets: number): { subnets: string[]; mask: string; hostsPerSubnet: number } {
    const subnetList: string[] = [];
    const hostsPerSubnet = Math.pow(2, 32 - parseInt(mask.split('.').pop() ?? '24')) - 2;
    for (let i = 0; i < subnets; i++) {
      subnetList.push(`${network}/${mask}`);
    }
    this._recordHistory(`subnetting(network=${network}, subnets=${subnets})`);
    return { subnets: subnetList, mask, hostsPerSubnet };
  }

  public vlsm(network: string, subnets: string[], sizes: number[]): { subnets: string[]; masks: string[]; optimized: boolean } {
    const masks = sizes.map(s => `/${32 - Math.ceil(Math.log2(s + 2))}`);
    this._recordHistory(`vlsm(network=${network}, subnets=${subnets.length}) -> optimized`);
    return { subnets, masks, optimized: true };
  }

  public cidr(network: string, prefix: number): { network: string; prefix: number; hosts: number; mask: string } {
    const hosts = Math.pow(2, 32 - prefix) - 2;
    const mask = prefix;
    this._recordHistory(`cidr(${network}/${prefix}) -> hosts=${hosts}`);
    return { network, prefix, hosts, mask: `/${mask}` };
  }

  public nat(packet: IPPacket, table: Map<string, string>, type: 'static' | 'dynamic' | 'PAT'): { translated: IPPacket; type: string; entry: string } {
    const translated = { ...packet, src: table.get(packet.src) ?? packet.src };
    this._recordHistory(`nat(type=${type}, src=${packet.src})`);
    return { translated, type, entry: packet.src };
  }

  public pat(packet: IPPacket, pool: string[]): { translated: IPPacket; port: number; poolSize: number } {
    const port = 1024 + this._counter % 64511;
    const translated = { ...packet, src: pool[0] ?? packet.src };
    this._recordHistory(`pat(poolSize=${pool.length}, port=${port})`);
    return { translated, port, poolSize: pool.length };
  }

  public fragmentation(packet: IPPacket, mtu: number): { fragments: IPPacket[]; count: number; mtu: number } {
    const fragmentSize = mtu - 20;
    const count = Math.ceil(packet.payload.length / fragmentSize);
    const fragments: IPPacket[] = [];
    for (let i = 0; i < count; i++) {
      fragments.push({
        ...packet,
        payload: packet.payload.slice(i * fragmentSize, (i + 1) * fragmentSize),
        ttl: packet.ttl,
      });
    }
    this._recordHistory(`fragmentation(mtu=${mtu}, size=${packet.payload.length}) -> fragments=${count}`);
    return { fragments, count, mtu };
  }

  public icmpMessage(type: number, code: number, content: string): { type: number; code: number; content: string; protocol: number } {
    this._recordHistory(`icmp(type=${type}, code=${code})`);
    return { type, code, content, protocol: 1 };
  }

  public ping(src: string, dst: string): { sent: number; received: number; loss: number; rtt: number } {
    const sent = 4;
    const received = Math.random() > 0.1 ? 4 : 3;
    const loss = ((sent - received) / sent) * 100;
    const rtt = Math.floor(Math.random() * 50) + 10;
    this._recordHistory(`ping(${src} -> ${dst}) -> loss=${loss}%, rtt=${rtt}ms`);
    return { sent, received, loss, rtt };
  }

  public traceroute(src: string, dst: string): { hops: string[]; maxHops: number; destination: string } {
    const hops: string[] = [];
    for (let i = 0; i < 10; i++) {
      hops.push(`hop-${i}`);
    }
    hops.push(dst);
    this._recordHistory(`traceroute(${src} -> ${dst}) -> hops=${hops.length}`);
    return { hops, maxHops: 30, destination: dst };
  }

  public toPacket(): DataPacket<{
    packets: number;
    routingVersion: number;
    history: string[];
  }> {
    return {
      id: `network-layer-${Date.now()}-${this._counter}`,
      payload: {
        packets: this._packets.length,
        routingVersion: this._routingTable.version,
        history: [...this._history],
      },
      metadata: {
        createdAt: Date.now(),
        route: ['computer_network', 'network_layer', 'result'],
        priority: 0.75,
        phase: 'routing',
      },
    };
  }

  public reset(): void {
    this._packets = [];
    this._routingTable = { entries: [], version: 0 };
    this._history = [];
    this._counter = 0;
  }

  private _recordHistory(entry: string): void {
    this._counter++;
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
  }
}
