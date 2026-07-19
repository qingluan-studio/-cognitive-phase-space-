import { DataPacket } from '../shared/types';

export interface SDNControllerInfo {
  readonly name: string;
  readonly switches: number;
  readonly applications: number;
  readonly topology: string;
}

export interface OpenFlowSwitch {
  readonly id: string;
  readonly dpId: string;
  readonly flows: number;
  readonly ports: number;
  readonly status: string;
}

export class SDNController {
  private _controller: SDNControllerInfo | null = null;
  private _switches: Map<string, OpenFlowSwitch> = new Map();
  private _flows: Map<string, string[]> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get switchCount(): number {
    return this._switches.size;
  }

  get flowCount(): number {
    let total = 0;
    for (const flows of this._flows.values()) {
      total += flows.length;
    }
    return total;
  }

  get history(): string[] {
    return [...this._history];
  }

  public controllerSetup(controller: string, switches: string[]): { controller: string; switches: number; connected: boolean } {
    this._controller = { name: controller, switches: switches.length, applications: 5, topology: 'tree' };
    switches.forEach(sw => {
      this._switches.set(sw, { id: sw, dpId: `dpid-${sw}`, flows: 0, ports: 8, status: 'connected' });
      this._flows.set(sw, []);
    });
    this._recordHistory(`controllerSetup(${controller}, switches=${switches.length})`);
    return { controller, switches: switches.length, connected: true };
  }

  public openFlow(switchId: string, controller: string, version: string): { switch: string; controller: string; version: string; connected: boolean } {
    this._recordHistory(`OpenFlow ${version}: ${switchId} <-> ${controller}`);
    return { switch: switchId, controller, version, connected: true };
  }

  public flowTable(switchId: string, flows: string[]): { switch: string; flows: number; tableSize: number; utilized: number } {
    this._flows.set(switchId, flows);
    const sw = this._switches.get(switchId);
    if (sw) {
      this._switches.set(switchId, { ...sw, flows: flows.length });
    }
    this._recordHistory(`flowTable(${switchId}): ${flows.length} flows`);
    return { switch: switchId, flows: flows.length, tableSize: 4096, utilized: flows.length / 4096 };
  }

  public flowRuleAdd(switchId: string, rule: string, priority: number): { switch: string; rule: string; priority: number; added: boolean } {
    const flows = this._flows.get(switchId) ?? [];
    flows.push(rule);
    this._flows.set(switchId, flows);
    const sw = this._switches.get(switchId);
    if (sw) {
      this._switches.set(switchId, { ...sw, flows: sw.flows + 1 });
    }
    this._recordHistory(`flowRuleAdd(${switchId}, priority=${priority})`);
    return { switch: switchId, rule, priority, added: true };
  }

  public flowRuleModify(switchId: string, ruleId: string, actions: string[]): { switch: string; ruleId: string; actions: string[]; modified: boolean } {
    this._recordHistory(`flowRuleModify(${switchId}, ${ruleId})`);
    return { switch: switchId, ruleId, actions, modified: true };
  }

  public flowRuleRemove(switchId: string, ruleId: string): { switch: string; ruleId: string; removed: boolean } {
    const flows = this._flows.get(switchId) ?? [];
    const idx = flows.findIndex(f => f.includes(ruleId));
    if (idx >= 0) flows.splice(idx, 1);
    this._flows.set(switchId, flows);
    this._recordHistory(`flowRuleRemove(${switchId}, ${ruleId})`);
    return { switch: switchId, ruleId, removed: idx >= 0 };
  }

  public packetIn(switchId: string, packet: string): { switch: string; packet: string; forwarded: boolean; reason: string } {
    this._recordHistory(`packetIn(${switchId}) -> controller`);
    return { switch: switchId, packet, forwarded: true, reason: 'no-match' };
  }

  public packetOut(switchId: string, port: number, packet: string): { switch: string; port: number; packet: string; sent: boolean } {
    this._recordHistory(`packetOut(${switchId}, port=${port})`);
    return { switch: switchId, port, packet, sent: true };
  }

  public topologyDiscovery(switches: string[], links: { from: string; to: string }[]): { switches: number; links: number; topology: string } {
    const topology = links.length > switches.length ? 'mesh' : 'tree';
    this._recordHistory(`topologyDiscovery: ${switches.length} switches, ${links.length} links`);
    return { switches: switches.length, links: links.length, topology };
  }

  public networkVirtualization(network: string, slices: number): { network: string; slices: number; isolated: boolean; overhead: number } {
    const overhead = 0.05;
    this._recordHistory(`networkVirtualization(${network}, slices=${slices})`);
    return { network, slices, isolated: true, overhead };
  }

  public trafficEngineering(flows: string[], demands: number[]): { flows: number; demands: number; optimized: boolean; utilization: number } {
    const utilization = 0.6 + Math.random() * 0.2;
    this._recordHistory(`trafficEngineering(flows=${flows.length}) -> utilization=${(utilization * 100).toFixed(1)}%`);
    return { flows: flows.length, demands: demands.length, optimized: true, utilization };
  }

  public loadBalancing(switches: string[], servers: string[]): { switches: number; servers: number; algorithm: string; balanced: boolean } {
    this._recordHistory(`loadBalancing(switches=${switches.length}, servers=${servers.length})`);
    return { switches: switches.length, servers: servers.length, algorithm: 'round-robin', balanced: true };
  }

  public accessControl(switches: string[], policies: string[]): { switches: number; policies: number; enforced: boolean; denied: number } {
    const denied = Math.floor(policies.length * 0.3);
    this._recordHistory(`accessControl(switches=${switches.length}, policies=${policies.length})`);
    return { switches: switches.length, policies: policies.length, enforced: true, denied };
  }

  public qualityOfService(flows: string[], classes: string[]): { flows: number; classes: number; queued: number; prioritized: boolean } {
    this._recordHistory(`qos(flows=${flows.length}, classes=${classes.length})`);
    return { flows: flows.length, classes: classes.length, queued: flows.length, prioritized: true };
  }

  public toPacket(): DataPacket<{
    switches: number;
    flows: number;
    history: string[];
    controller: string;
  }> {
    let totalFlows = 0;
    for (const flows of this._flows.values()) {
      totalFlows += flows.length;
    }
    return {
      id: `sdn-ctrl-${Date.now()}-${this._counter}`,
      payload: {
        switches: this._switches.size,
        flows: totalFlows,
        history: [...this._history],
        controller: this._controller?.name ?? 'none',
      },
      metadata: {
        createdAt: Date.now(),
        route: ['computer_network', 'sdn', 'result'],
        priority: 0.75,
        phase: 'control',
      },
    };
  }

  public reset(): void {
    this._controller = null;
    this._switches.clear();
    this._flows.clear();
    this._history = [];
    this._counter = 0;
  }

  private _recordHistory(entry: string): void {
    this._counter++;
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
  }
}
