/**
 * 原子偏斜器：引入微小随机偏斜，破坏因果链产生新可能。
 * 仿照卢克莱修的 Clinamen（原子偏斜），在严格的因果链中
 * 注入微小随机偏斜，打破决定论产生新的可能性分支。
 */

export interface Swerve {
  id: string;
  target: string;
  deviation: number;
  introducedAt: number;
  brokeCausality: boolean;
}

export interface CausalNode {
  id: string;
  cause: string;
  effect: string;
  branches: string[];
}

export class ClinamenSwerve {
  private _swerves: Swerve[] = [];
  private _causalNodes: Map<string, CausalNode> = new Map();
  private _deviationScale: number = 0.05;
  private _brokenChains: number = 0;

  /** 在因果节点上施加一次偏斜。 */
  swerve(target: string, deviation: number = this._deviationScale): Swerve {
    const clamped = Math.min(1, Math.max(0, deviation));
    const node = this._causalNodes.get(target);
    const broke = node !== undefined && clamped > 0.1;
    if (broke) {
      node!.branches.push(`branch-${this._swerves.length}`);
      this._brokenChains++;
    }
    const s: Swerve = {
      id: `swerve-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      target,
      deviation: clamped,
      introducedAt: Date.now(),
      brokeCausality: broke,
    };
    this._swerves.push(s);
    return s;
  }

  /** 显式破坏指定因果链。 */
  breakCausality(nodeId: string): boolean {
    const node = this._causalNodes.get(nodeId);
    if (!node) return false;
    node.branches.push(`break-${Date.now()}`);
    this._brokenChains++;
    return true;
  }

  /** 注册一个因果节点。 */
  introduce(node: CausalNode): CausalNode {
    this._causalNodes.set(node.id, node);
    return node;
  }

  /** 评估当前偏斜对系统的影响。 */
  evaluate(): { totalSwerves: number; brokenChains: number; averageDeviation: number } {
    const total = this._swerves.length;
    const avg = total === 0 ? 0 : this._swerves.reduce((s, x) => s + x.deviation, 0) / total;
    return { totalSwerves: total, brokenChains: this._brokenChains, averageDeviation: avg };
  }

  /** 设置偏斜幅度比例。 */
  setDeviationScale(scale: number): void {
    this._deviationScale = Math.max(0, Math.min(1, scale));
  }

  get deviation(): number {
    return this._deviationScale;
  }

  getSwerves(): Swerve[] {
    return [...this._swerves];
  }

  get brokenChains(): number {
    return this._brokenChains;
  }
}
