import { DataPacket, KnowledgeUnit } from '../shared/types';

/**
 * DiamondForge — ◆ 菱形锻造器
 *
 * 菱形（diamond）象征稳定结晶、价值提炼与碳原子的四面体结构。
 * 模块将原始数据锻造为晶格、切割切面、抛光并按 4C 标准评估价值。
 */

/** 菱形的一个切面，代表数据的一个观察角度。 */
export interface DiamondFacet {
  id: string;
  name: string;
  clarity: number;          // 纯度 0-1
  hardness: number;         // 硬度 1-10
  refractiveIndex: number;  // 折射率
  edges: number;            // 边数
}

/** 晶格中的单个原子节点（sp3 四面体配位）。 */
export interface LatticeNode {
  id: number;
  x: number;
  y: number;
  z: number;
  element: 'C' | 'N' | 'B';
}

/** 晶格中两个节点之间的共价键。 */
export interface LatticeBond {
  from: number;
  to: number;
  strength: number;
}

/** 原子级晶格结构。 */
export interface CrystalLattice {
  nodes: LatticeNode[];
  bonds: LatticeBond[];
  stabilityScore: number;
  carbonPurity: number;
}

/** 锻造炉的热力学状态快照。 */
export interface DiamondState {
  temperature: number;
  pressure: number;
  carbonContent: number;
  impurities: number;
  facetCount: number;
  valueScore: number;
}

/** 历史操作记录。 */
export interface DiamondHistoryEntry {
  timestamp: number;
  action: string;
  valueScore: number;
}

const DIAMOND_REFRACTIVE_INDEX = 2.417;
const CRITICAL_ANGLE = Math.asin(1 / DIAMOND_REFRACTIVE_INDEX);
const BOND_LENGTH = 1.54;

export class DiamondForge {
  private _facets: Map<string, DiamondFacet> = new Map();
  private _lattice: CrystalLattice | null = null;
  private _state: DiamondState;
  private _history: DiamondHistoryEntry[] = [];
  private _temperature: number;
  private _pressure: number;
  private _counter = 0;

  constructor(temperature = 1500, pressure = 50) {
    this._temperature = temperature;
    this._pressure = pressure;
    this._state = this._createInitialState();
  }

  /** 将原始数据结晶为四面体晶格。 */
  crystallize(rawMaterial: DataPacket): CrystalLattice {
    const carbonCount = this._estimateCarbon(rawMaterial.payload);
    const nodes: LatticeNode[] = [];
    const bonds: LatticeBond[] = [];

    // 构建类四面体晶格：每个 shell 4 个原子，沿 z 轴堆叠
    for (let i = 0; i < carbonCount; i++) {
      const shell = Math.floor(i / 4);
      const local = i % 4;
      const theta = (local * Math.PI) / 2;
      const r = BOND_LENGTH * (shell + 1);
      const impurityRoll = Math.random();
      nodes.push({
        id: i,
        x: r * Math.cos(theta),
        y: r * Math.sin(theta),
        z: shell * BOND_LENGTH * Math.sqrt(2 / 3),
        element: impurityRoll < 0.03 ? 'N' : impurityRoll < 0.06 ? 'B' : 'C',
      });
    }
    // 每个节点与最近的最多 4 个邻居形成 sp3 键
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const d = this._distance(nodes[i], nodes[j]);
        if (d < BOND_LENGTH * 1.2) {
          bonds.push({ from: i, to: j, strength: 1 / (1 + d) });
        }
      }
    }

    const carbonFraction = nodes.filter(n => n.element === 'C').length / Math.max(1, nodes.length);
    const lattice: CrystalLattice = {
      nodes,
      bonds,
      stabilityScore: Math.min(1, bonds.length / Math.max(1, carbonCount * 2)),
      carbonPurity: carbonFraction,
    };
    this._lattice = lattice;
    this._state.carbonContent = carbonFraction;
    this._state.impurities = 1 - carbonFraction;
    this._recordAction('crystallize');
    return lattice;
  }

  /** 以指定角度与深度切割新的切面。 */
  cutFacet(angle: number, depth: number): DiamondFacet {
    const id = `facet-${(++this._counter).toString(36)}-${Date.now().toString(36)}`;
    const edges = 3 + Math.floor(((angle % 360) + 360) % 360 / 60);
    const facet: DiamondFacet = {
      id,
      name: `Facet-${this._facets.size + 1}`,
      clarity: Math.max(0, Math.min(1, 0.5 + depth * 0.3 - Math.abs(angle) * 0.001)),
      hardness: Math.min(10, 8 + depth * 2),
      refractiveIndex: DIAMOND_REFRACTIVE_INDEX + (Math.random() - 0.5) * 0.02,
      edges,
    };
    this._facets.set(id, facet);
    this._state.facetCount = this._facets.size;
    this._recordAction(`cutFacet:${angle.toFixed(2)}`);
    return facet;
  }

  /** 抛光某个面以提升纯度与硬度。 */
  polish(facetId: string): DiamondFacet {
    const facet = this._facets.get(facetId);
    if (!facet) throw new Error(`Facet not found: ${facetId}`);
    facet.clarity = Math.min(1, facet.clarity + 0.1);
    facet.hardness = Math.min(10, facet.hardness + 0.2);
    facet.refractiveIndex = DIAMOND_REFRACTIVE_INDEX + (facet.clarity - 0.5) * 0.03;
    this._recordAction(`polish:${facetId}`);
    return facet;
  }

  /** 按 4C 标准（Clarity / Carat / Cut / Color）评估钻石价值。 */
  appraise(): { totalValue: number; clarity: number; carat: number; cut: number; color: string } {
    const facets = Array.from(this._facets.values());
    if (facets.length === 0) {
      return { totalValue: 0, clarity: 0, carat: 0, cut: 0, color: 'D' };
    }
    const clarity = this._meanClarity(facets);
    const carat = this._estimateCarat();
    const cut = this._estimateCut(facets);
    const color = this._gradeColor(this._lattice?.carbonPurity ?? 1);
    const totalValue = this._composeValue(clarity, cut, carat);
    this._state.valueScore = totalValue;
    this._recordAction('appraise');
    return { totalValue, clarity, carat, cut, color };
  }

  /** 模拟光线以 inputAngle 入射后的折射、色散与明亮度。 */
  refractLight(inputAngle: number): { refractedAngle: number; dispersion: number; brilliance: number } {
    const sinIn = Math.sin(inputAngle);
    const sinOut = sinIn / DIAMOND_REFRACTIVE_INDEX;
    const refractedAngle = Math.asin(Math.max(-1, Math.min(1, sinOut)));
    const dispersion = DIAMOND_REFRACTIVE_INDEX * 0.044 * Math.abs(sinIn);
    const brilliance = Math.abs(inputAngle) > CRITICAL_ANGLE ? 1 : Math.abs(inputAngle) / CRITICAL_ANGLE;
    this._recordAction('refractLight');
    return { refractedAngle, dispersion, brilliance };
  }

  /** 高压压缩碳原子数组为金刚石晶格。 */
  compress(carbonData: number[]): CrystalLattice {
    const nodes: LatticeNode[] = carbonData.map((v, i) => ({
      id: i,
      x: Math.cos(i) * v,
      y: Math.sin(i) * v,
      z: v * 0.5,
      element: 'C' as const,
    }));
    const bonds: LatticeBond[] = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < Math.min(nodes.length, i + 5); j++) {
        bonds.push({ from: i, to: j, strength: 0.5 + this._pressure / 100 });
      }
    }
    const lattice: CrystalLattice = {
      nodes,
      bonds,
      stabilityScore: Math.min(1, this._pressure / 80),
      carbonPurity: 1,
    };
    this._lattice = lattice;
    this._state.carbonContent = 1;
    this._state.pressure = this._pressure;
    this._recordAction('compress');
    return lattice;
  }

  /** 击碎一个面为多个更小、更暗淡的切面。 */
  shatter(facetId: string): DiamondFacet[] {
    const facet = this._facets.get(facetId);
    if (!facet) throw new Error(`Facet not found: ${facetId}`);
    const shards: DiamondFacet[] = [];
    const pieces = Math.max(2, Math.floor(facet.edges / 2));
    for (let i = 0; i < pieces; i++) {
      const shardId = `shard-${(++this._counter).toString(36)}-${Date.now().toString(36)}-${i}`;
      const shard: DiamondFacet = {
        id: shardId,
        name: `${facet.name}-shard-${i + 1}`,
        clarity: facet.clarity * 0.7,
        hardness: facet.hardness * 0.9,
        refractiveIndex: facet.refractiveIndex * 0.95,
        edges: 3,
      };
      this._facets.set(shardId, shard);
      shards.push(shard);
    }
    this._facets.delete(facetId);
    this._state.facetCount = this._facets.size;
    this._recordAction(`shatter:${facetId}`);
    return shards;
  }

  /** 融合多个面为一个更大的面，硬度取最大、纯度取均值。 */
  fuse(facetIds: string[]): DiamondFacet {
    const fused = facetIds
      .map(id => this._facets.get(id))
      .filter((f): f is DiamondFacet => f !== undefined);
    if (fused.length < 2) throw new Error('Need at least 2 facets to fuse');
    const id = `fused-${(++this._counter).toString(36)}-${Date.now().toString(36)}`;
    const merged: DiamondFacet = {
      id,
      name: `Fused-${fused.map(f => f.name).join('+')}`,
      clarity: fused.reduce((s, f) => s + f.clarity, 0) / fused.length,
      hardness: Math.max(...fused.map(f => f.hardness)),
      refractiveIndex: fused.reduce((s, f) => s + f.refractiveIndex, 0) / fused.length,
      edges: fused.reduce((s, f) => s + f.edges, 0),
    };
    for (const fid of facetIds) this._facets.delete(fid);
    this._facets.set(id, merged);
    this._state.facetCount = this._facets.size;
    this._recordAction(`fuse:${facetIds.length}`);
    return merged;
  }

  /** 获取当前最硬的切面。 */
  getHardestFacet(): DiamondFacet | null {
    const facets = Array.from(this._facets.values());
    if (facets.length === 0) return null;
    return facets.reduce((best, f) => (f.hardness > best.hardness ? f : best));
  }

  /** 将当前锻造产物打包为 DataPacket。 */
  toPacket(): DataPacket {
    const appraisal = this.appraise();
    return {
      id: `diamond-${(++this._counter).toString(36)}-${Date.now().toString(36)}`,
      payload: {
        facets: Array.from(this._facets.values()),
        lattice: this._lattice,
        state: { ...this._state },
        appraisal,
      },
      metadata: {
        createdAt: Date.now(),
        route: ['DiamondForge'],
        priority: Math.max(1, Math.floor(appraisal.totalValue * 10)),
        phase: 'crystallized',
      },
    };
  }

  reset(): void {
    this._facets.clear();
    this._lattice = null;
    this._history = [];
    this._counter = 0;
    this._temperature = 1500;
    this._pressure = 50;
    this._state = this._createInitialState();
  }

  get facets(): DiamondFacet[] {
    return Array.from(this._facets.values());
  }

  get lattice(): CrystalLattice | null {
    if (!this._lattice) return null;
    return {
      nodes: this._lattice.nodes.map(n => ({ ...n })),
      bonds: this._lattice.bonds.map(b => ({ ...b })),
      stabilityScore: this._lattice.stabilityScore,
      carbonPurity: this._lattice.carbonPurity,
    };
  }

  get state(): DiamondState {
    return { ...this._state };
  }

  get history(): DiamondHistoryEntry[] {
    return [...this._history];
  }

  private _createInitialState(): DiamondState {
    return {
      temperature: this._temperature,
      pressure: this._pressure,
      carbonContent: 0,
      impurities: 0,
      facetCount: 0,
      valueScore: 0,
    };
  }

  private _estimateCarbon(payload: unknown): number {
    if (Array.isArray(payload)) return Math.max(8, Math.min(64, payload.length * 4));
    if (payload && typeof payload === 'object' && 'vector' in payload) {
      const vec = (payload as KnowledgeUnit).vector ?? [];
      return Math.max(8, Math.min(64, vec.length * 4));
    }
    return 16;
  }

  private _distance(a: LatticeNode, b: LatticeNode): number {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
  }

  private _meanClarity(facets: DiamondFacet[]): number {
    return facets.reduce((s, f) => s + f.clarity, 0) / facets.length;
  }

  private _estimateCarat(): number {
    return (this._lattice?.nodes.length ?? 0) * 0.01;
  }

  private _estimateCut(facets: DiamondFacet[]): number {
    const avgHardness = facets.reduce((s, f) => s + f.hardness, 0) / facets.length;
    // 58 是理想明亮式切割的切面数
    return Math.min(1, (avgHardness / 10) * (facets.length / 58));
  }

  private _gradeColor(carbonPurity: number): string {
    const grades = ['D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'];
    const idx = Math.min(grades.length - 1, Math.max(0, Math.floor((1 - carbonPurity) * grades.length)));
    return grades[idx];
  }

  private _composeValue(clarity: number, cut: number, carat: number): number {
    const colorTerm = 1 - this._state.impurities;
    return clarity * 0.4 + cut * 0.3 + Math.min(1, carat / 2) * 0.2 + colorTerm * 0.1;
  }

  private _recordAction(action: string): void {
    this._history.push({
      timestamp: Date.now(),
      action,
      valueScore: this._state.valueScore,
    });
  }
}
