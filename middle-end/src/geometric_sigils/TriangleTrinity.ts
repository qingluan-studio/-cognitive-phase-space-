import { DataPacket } from '../shared/types';

/**
 * TriangleTrinity — △ 三角圣器
 *
 * 三角形象征最稳定的几何结构、三力平衡与三层分形递归。
 * 模块管理三个顶点（力方向），计算三力平衡、分形细分、共振与坍缩。
 */

/** 三角形顶点，代表力的一个方向。 */
export interface TriangleVertex {
  id: string;
  label: string;
  force: number;
  direction: number;  // 角度（弧度）
  weight: number;
}

/** 三元关系：三个顶点之间力的平衡状态。 */
export interface TrinityRelation {
  vertexA: TriangleVertex;
  vertexB: TriangleVertex;
  vertexC: TriangleVertex;
  balanceScore: number;
  type: 'stable' | 'unstable' | 'critical';
}

/** 分形三角：自相似递归结构中的单个节点。 */
export interface FractalTriangle {
  id: string;
  level: number;
  parent: string | null;
  children: string[];
  area: number;
  centroid: { x: number; y: number };
  selfSimilarity: number;
}

/** 历史操作记录。 */
export interface TrinityHistoryEntry {
  timestamp: number;
  action: string;
  stabilityIndex: number;
}

const GOLDEN_RATIO = 1.618033988749;
const SUBDIVISION_COUNT = 4;

export class TriangleTrinity {
  private _vertices: Map<string, TriangleVertex> = new Map();
  private _relations: TrinityRelation[] = [];
  private _fractalTree: Map<string, FractalTriangle> = new Map();
  private _centroid: { x: number; y: number } = { x: 0, y: 0 };
  private _stabilityIndex = 0;
  private _history: TrinityHistoryEntry[] = [];
  private _counter = 0;

  constructor() {
    this._initDefaultVertices();
  }

  /** 设置三个力的标签与大小，自动按 120° 分布方向。 */
  setThreeForces(
    labelA: string, forceA: number,
    labelB: string, forceB: number,
    labelC: string, forceC: number,
  ): void {
    this._vertices.clear();
    const defs: Array<[string, number]> = [[labelA, forceA], [labelB, forceB], [labelC, forceC]];
    const total = forceA + forceB + forceC;
    const baseAngle = (2 * Math.PI) / 3;
    defs.forEach(([label, force], i) => {
      const id = `vertex-${label}-${(++this._counter).toString(36)}`;
      this._vertices.set(id, {
        id,
        label,
        force,
        direction: i * baseAngle,
        weight: total > 0 ? force / total : 1 / 3,
      });
    });
    this._centroid = this.barycenter();
    this._recordAction(`setThreeForces:${labelA},${labelB},${labelC}`);
  }

  /** 计算三力的矢量和，给出平衡分数与状态类型。 */
  computeBalance(): TrinityRelation {
    const vs = Array.from(this._vertices.values());
    if (vs.length < 3) throw new Error('Need exactly three vertices');
    const [a, b, c] = vs;
    const sumX = a.force * Math.cos(a.direction) + b.force * Math.cos(b.direction) + c.force * Math.cos(c.direction);
    const sumY = a.force * Math.sin(a.direction) + b.force * Math.sin(b.direction) + c.force * Math.sin(c.direction);
    const residual = Math.sqrt(sumX * sumX + sumY * sumY);
    const totalForce = a.force + b.force + c.force;
    const balanceScore = 1 - Math.min(1, residual / Math.max(1e-9, totalForce));
    const type: TrinityRelation['type'] =
      balanceScore > 0.9 ? 'stable' : balanceScore > 0.5 ? 'unstable' : 'critical';
    const relation: TrinityRelation = { vertexA: a, vertexB: b, vertexC: c, balanceScore, type };
    this._relations.push(relation);
    this._stabilityIndex = balanceScore;
    this._recordAction('computeBalance');
    return relation;
  }

  /** 将三角分形分裂到指定深度，返回根分形节点。 */
  fracture(depth: number): FractalTriangle {
    if (depth < 0) throw new Error('Fracture depth must be non-negative');
    const rootId = `frac-root-${(++this._counter).toString(36)}`;
    const root: FractalTriangle = {
      id: rootId,
      level: 0,
      parent: null,
      children: [],
      area: this._triangleArea(),
      centroid: { ...this._centroid },
      selfSimilarity: 1,
    };
    this._fractalTree.set(rootId, root);
    this._fractureRecursive(rootId, depth);
    this._recordAction(`fracture:${depth}`);
    return root;
  }

  /** 按重心坐标计算三角形重心。 */
  barycenter(): { x: number; y: number } {
    const vs = Array.from(this._vertices.values());
    if (vs.length === 0) return { x: 0, y: 0 };
    const totalWeight = vs.reduce((s, v) => s + v.weight, 0) || 1;
    const x = vs.reduce((s, v) => s + v.force * Math.cos(v.direction) * v.weight, 0) / totalWeight;
    const y = vs.reduce((s, v) => s + v.force * Math.sin(v.direction) * v.weight, 0) / totalWeight;
    this._centroid = { x, y };
    return { x, y };
  }

  /** 将当前三角细分为 4 个子三角（Sierpinski 风格）。 */
  subdivide(): FractalTriangle[] {
    const rootId = `subdiv-${(++this._counter).toString(36)}-${Date.now().toString(36)}`;
    const rootArea = this._triangleArea();
    const children: FractalTriangle[] = [];
    const childArea = rootArea / SUBDIVISION_COUNT;
    for (let i = 0; i < SUBDIVISION_COUNT; i++) {
      const angle = (i * Math.PI) / 2;
      const childId = `subchild-${rootId}-${i}`;
      const child: FractalTriangle = {
        id: childId,
        level: 1,
        parent: rootId,
        children: [],
        area: childArea,
        centroid: {
          x: this._centroid.x + Math.cos(angle) * Math.sqrt(childArea),
          y: this._centroid.y + Math.sin(angle) * Math.sqrt(childArea),
        },
        selfSimilarity: 1 / GOLDEN_RATIO,
      };
      this._fractalTree.set(childId, child);
      children.push(child);
    }
    const root: FractalTriangle = {
      id: rootId,
      level: 0,
      parent: null,
      children: children.map(c => c.id),
      area: rootArea,
      centroid: { ...this._centroid },
      selfSimilarity: 1,
    };
    this._fractalTree.set(rootId, root);
    this._recordAction('subdivide');
    return children;
  }

  /** 检测两个三角圣器之间的共振度（力向量余弦 + 稳定性乘积）。 */
  detectResonance(other: TriangleTrinity): number {
    const mine = Array.from(this._vertices.values());
    const theirs = Array.from(other.vertices);
    if (mine.length === 0 || theirs.length === 0) return 0;
    const myForces = mine.map(v => v.force).sort((a, b) => a - b);
    const otherForces = theirs.map(v => v.force).sort((a, b) => a - b);
    const n = Math.min(myForces.length, otherForces.length);
    let dot = 0, magA = 0, magB = 0;
    for (let i = 0; i < n; i++) {
      dot += myForces[i] * otherForces[i];
      magA += myForces[i] ** 2;
      magB += otherForces[i] ** 2;
    }
    const denom = Math.sqrt(magA) * Math.sqrt(magB);
    if (denom === 0) return 0;
    const cosine = dot / denom;
    const stabilityProduct = this._stabilityIndex * other.getStability();
    const resonance = Math.abs(cosine) * 0.7 + stabilityProduct * 0.3;
    this._recordAction('detectResonance');
    return Math.max(0, Math.min(1, resonance));
  }

  /** 将三角坍缩为单一点（合力方向）。 */
  collapse(): TriangleVertex {
    const vs = Array.from(this._vertices.values());
    if (vs.length === 0) throw new Error('No vertices to collapse');
    const totalForce = vs.reduce((s, v) => s + v.force, 0);
    const sumX = vs.reduce((s, v) => s + v.force * Math.cos(v.direction), 0);
    const sumY = vs.reduce((s, v) => s + v.force * Math.sin(v.direction), 0);
    const collapsed: TriangleVertex = {
      id: `collapsed-${(++this._counter).toString(36)}-${Date.now().toString(36)}`,
      label: `Collapse-${vs.map(v => v.label).join('+')}`,
      force: totalForce,
      direction: Math.atan2(sumY, sumX),
      weight: 1,
    };
    this._vertices.clear();
    this._vertices.set(collapsed.id, collapsed);
    this._stabilityIndex = 1;
    this._recordAction('collapse');
    return collapsed;
  }

  /** 整体旋转三角形（每个顶点方向增加 angle）。 */
  rotate(angle: number): void {
    for (const v of this._vertices.values()) {
      v.direction += angle;
    }
    this._centroid = this.barycenter();
    this._recordAction(`rotate:${angle.toFixed(3)}`);
  }

  /** 向上升级到更高层（按黄金比放大面积）。 */
  escalate(level: number): FractalTriangle {
    if (level < 0) throw new Error('Level must be non-negative');
    const id = `escalate-${(++this._counter).toString(36)}-${Date.now().toString(36)}`;
    const escalated: FractalTriangle = {
      id,
      level,
      parent: null,
      children: [],
      area: this._triangleArea() * Math.pow(GOLDEN_RATIO, level),
      centroid: { ...this._centroid },
      selfSimilarity: Math.pow(1 / GOLDEN_RATIO, level),
    };
    this._fractalTree.set(id, escalated);
    this._recordAction(`escalate:${level}`);
    return escalated;
  }

  getStability(): number {
    return this._stabilityIndex;
  }

  toPacket(): DataPacket {
    return {
      id: `trinity-${(++this._counter).toString(36)}-${Date.now().toString(36)}`,
      payload: {
        vertices: Array.from(this._vertices.values()),
        relations: [...this._relations],
        fractalTree: Array.from(this._fractalTree.values()),
        centroid: { ...this._centroid },
        stabilityIndex: this._stabilityIndex,
      },
      metadata: {
        createdAt: Date.now(),
        route: ['TriangleTrinity'],
        priority: Math.max(1, Math.floor(this._stabilityIndex * 10)),
        phase: 'trinitized',
      },
    };
  }

  reset(): void {
    this._vertices.clear();
    this._relations = [];
    this._fractalTree.clear();
    this._centroid = { x: 0, y: 0 };
    this._stabilityIndex = 0;
    this._history = [];
    this._counter = 0;
    this._initDefaultVertices();
  }

  get vertices(): TriangleVertex[] {
    return Array.from(this._vertices.values());
  }

  get relations(): TrinityRelation[] {
    return [...this._relations];
  }

  get fractalTree(): FractalTriangle[] {
    return Array.from(this._fractalTree.values());
  }

  get stabilityIndex(): number {
    return this._stabilityIndex;
  }

  get history(): TrinityHistoryEntry[] {
    return [...this._history];
  }

  private _initDefaultVertices(): void {
    const labels = ['Alpha', 'Beta', 'Gamma'];
    const baseAngle = (2 * Math.PI) / 3;
    labels.forEach((label, i) => {
      const id = `vertex-${label}-${(++this._counter).toString(36)}`;
      this._vertices.set(id, {
        id,
        label,
        force: 1,
        direction: i * baseAngle,
        weight: 1 / 3,
      });
    });
    this._centroid = this.barycenter();
  }

  private _fractureRecursive(parentId: string, remaining: number): void {
    if (remaining <= 0) return;
    const parent = this._fractalTree.get(parentId);
    if (!parent) return;
    for (let i = 0; i < SUBDIVISION_COUNT; i++) {
      const angle = (i * Math.PI) / 2;
      const childId = `frac-${(++this._counter).toString(36)}-${parentId}-${i}`;
      const child: FractalTriangle = {
        id: childId,
        level: parent.level + 1,
        parent: parentId,
        children: [],
        area: parent.area / SUBDIVISION_COUNT,
        centroid: {
          x: parent.centroid.x + (Math.cos(angle) * Math.sqrt(parent.area)) / 4,
          y: parent.centroid.y + (Math.sin(angle) * Math.sqrt(parent.area)) / 4,
        },
        selfSimilarity: Math.pow(1 / GOLDEN_RATIO, parent.level + 1),
      };
      this._fractalTree.set(childId, child);
      parent.children.push(childId);
      this._fractureRecursive(childId, remaining - 1);
    }
  }

  private _triangleArea(): number {
    const vs = Array.from(this._vertices.values());
    if (vs.length < 3) return 0;
    const pts = vs.slice(0, 3).map(v => ({
      x: v.force * Math.cos(v.direction),
      y: v.force * Math.sin(v.direction),
    }));
    return 0.5 * Math.abs(
      pts[0].x * (pts[1].y - pts[2].y) +
      pts[1].x * (pts[2].y - pts[0].y) +
      pts[2].x * (pts[0].y - pts[1].y),
    );
  }

  private _recordAction(action: string): void {
    this._history.push({
      timestamp: Date.now(),
      action,
      stabilityIndex: this._stabilityIndex,
    });
  }
}
