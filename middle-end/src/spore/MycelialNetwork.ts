/**
 * 菌丝网络模块：在地下连接各个分散的孢子节点，
 * 实现资源、信号与基因信息的横向传递。仿生自真菌菌丝网。
 */

export interface MycelialNode {
  id: string;
  sporeId: string;
  resources: number;
  depth: number;
}

export interface MycelialLink {
  from: string;
  to: string;
  bandwidth: number;
  active: boolean;
}

export interface ResourceFlow {
  from: string;
  to: string;
  amount: number;
  routedAt: number;
}

export class MycelialNetwork {
  private _nodes: Map<string, MycelialNode> = new Map();
  private _links: MycelialLink[] = [];
  private _flows: ResourceFlow[] = [];
  private _maxBandwidth = 100;

  plantNode(node: MycelialNode): void {
    this._nodes.set(node.id, node);
  }

  connect(from: string, to: string, bandwidth: number): MycelialLink | null {
    if (!this._nodes.has(from) || !this._nodes.has(to)) return null;
    const link: MycelialLink = {
      from,
      to,
      bandwidth: Math.min(bandwidth, this._maxBandwidth),
      active: true,
    };
    this._links.push(link);
    return link;
  }

  findPath(start: string, end: string): string[] | null {
    if (!this._nodes.has(start) || !this._nodes.has(end)) return null;
    const visited = new Set<string>();
    const queue: { id: string; path: string[] }[] = [{ id: start, path: [start] }];
    while (queue.length > 0) {
      const { id, path } = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);
      if (id === end) return path;
      for (const link of this._links) {
        if (!link.active) continue;
        if (link.from === id && !visited.has(link.to)) {
          queue.push({ id: link.to, path: [...path, link.to] });
        }
        if (link.to === id && !visited.has(link.from)) {
          queue.push({ id: link.from, path: [...path, link.from] });
        }
      }
    }
    return null;
  }

  routeResource(from: string, to: string, amount: number): ResourceFlow | null {
    const path = this.findPath(from, to);
    if (!path) return null;
    const sender = this._nodes.get(from);
    const receiver = this._nodes.get(to);
    if (!sender || !receiver) return null;
    if (sender.resources < amount) return null;
    sender.resources -= amount;
    receiver.resources += amount;
    const flow: ResourceFlow = { from, to, amount, routedAt: Date.now() };
    this._flows.push(flow);
    if (this._flows.length > 300) this._flows.shift();
    return flow;
  }

  distributeSurplus(donorId: string): ResourceFlow[] {
    const donor = this._nodes.get(donorId);
    if (!donor || donor.resources <= 10) return [];
    const flows: ResourceFlow[] = [];
    for (const node of this._nodes.values()) {
      if (node.id === donorId) continue;
      if (node.resources < 5 && this.findPath(donorId, node.id)) {
        const flow = this.routeResource(donorId, node.id, 5);
        if (flow) flows.push(flow);
      }
    }
    return flows;
  }

  pruneInactiveLinks(): number {
    const before = this._links.length;
    this._links = this._links.filter(l => l.active);
    return before - this._links.length;
  }

  severLink(from: string, to: string): boolean {
    const link = this._links.find(l => l.from === from && l.to === to);
    if (!link) return false;
    link.active = false;
    return true;
  }

  getNode(id: string): MycelialNode | null {
    return this._nodes.get(id) ?? null;
  }

  get nodeCount(): number {
    return this._nodes.size;
  }

  get linkCount(): number {
    return this._links.filter(l => l.active).length;
  }
}
