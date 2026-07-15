/**
 * 预层 —— 层的前身，从拓扑空间的开集范畴到集合范畴的反变函子。
 * 它为每个开集分配一个集合，为每个包含映射分配一个限制映射；
 * 预层是局部的记忆，尚未被层化咒语唤醒的沉睡知识。
 */

export interface PresheafData {
  /** 基空间大小 */
  baseSize: number;
  /** 开集数量 */
  openSets: number;
  /** 截面数量 */
  sections: number;
  /** 限制映射数 */
  restrictionMaps: number;
  /** 是否满足层的公理 */
  isSheaf: boolean;
  /** 层化所需步骤 */
  sheafificationSteps: number;
}

export interface OpenSet {
  id: string;
  elements: number[];
  label: string;
}

export class Presheaf {
  private _baseSize: number;
  private _openSets: Map<string, OpenSet>;
  private _sections: Map<string, number[]>;
  private _restrictionMaps: Map<string, Map<string, (s: number[]) => number[]>>;
  private _isSheaf: boolean;
  private _sheafificationSteps: number;
  private _gluingAxiom: boolean;
  private _localityAxiom: boolean;
  private _stalkValues: Map<string, number>;

  constructor(baseSize: number = 10) {
    this._baseSize = baseSize;
    this._openSets = new Map();
    this._sections = new Map();
    this._restrictionMaps = new Map();
    this._isSheaf = false;
    this._sheafificationSteps = 0;
    this._gluingAxiom = false;
    this._localityAxiom = false;
    this._stalkValues = new Map();

    for (let i = 0; i < baseSize; i++) {
      const openSet: OpenSet = {
        id: `U${i}`,
        elements: [i],
        label: `open-set-${i}`,
      };
      this._openSets.set(openSet.id, openSet);
      this._sections.set(openSet.id, [0]);
    }
  }

  get baseSize(): number {
    return this._baseSize;
  }

  get openSetCount(): number {
    return this._openSets.size;
  }

  get sectionCount(): number {
    return this._sections.size;
  }

  get isSheaf(): boolean {
    return this._isSheaf;
  }

  get sheafificationSteps(): number {
    return this._sheafificationSteps;
  }

  /** 添加开集 */
  public addOpenSet(id: string, elements: number[]): void {
    this._openSets.set(id, { id, elements, label: id });
  }

  /** 在开集上添加截面 */
  public addSection(openSetId: string, section: number[]): boolean {
    if (!this._openSets.has(openSetId)) return false;
    this._sections.set(openSetId, [...section]);
    return true;
  }

  /** 注册限制映射：res^U_V: F(U) → F(V)，当 V ⊆ U */
  public registerRestriction(
    openSetU: string,
    openSetV: string,
    restriction: (s: number[]) => number[]
  ): boolean {
    if (!this._openSets.has(openSetU) || !this._openSets.has(openSetV)) return false;
    const uSet = this._openSets.get(openSetU)!;
    const vSet = this._openSets.get(openSetV)!;
    if (!this._isSubset(vSet.elements, uSet.elements)) return false;

    if (!this._restrictionMaps.has(openSetU)) {
      this._restrictionMaps.set(openSetU, new Map());
    }
    this._restrictionMaps.get(openSetU)!.set(openSetV, restriction);
    return true;
  }

  /** 应用限制映射 */
  public restrict(section: number[], fromSet: string, toSet: string): number[] | null {
    const restrictions = this._restrictionMaps.get(fromSet);
    if (!restrictions) return null;
    const restriction = restrictions.get(toSet);
    if (!restriction) return null;
    return restriction(section);
  }

  /** 验证预层公理：恒等限制 res^U_U = id */
  public verifyIdentityRestriction(): boolean {
    for (const [openSetId, section] of this._sections) {
      const restrictions = this._restrictionMaps.get(openSetId);
      if (!restrictions) continue;
      const identity = restrictions.get(openSetId);
      if (identity) {
        const restricted = identity(section);
        if (!this._arraysEqual(restricted, section)) return false;
      }
    }
    return true;
  }

  /** 验证预层公理：限制映射的复合 res^V_W ∘ res^U_V = res^U_W */
  public verifyCompositionRestriction(): boolean {
    for (const [uId, vMaps] of this._restrictionMaps) {
      for (const [vId, resUV] of vMaps) {
        const wMaps = this._restrictionMaps.get(vId);
        if (!wMaps) continue;
        for (const [wId, resVW] of wMaps) {
          const resUW = this._restrictionMaps.get(uId)?.get(wId);
          if (!resUW) continue;
          const section = this._sections.get(uId);
          if (!section) continue;
          const left = resVW(resUV(section));
          const right = resUW(section);
          if (!this._arraysEqual(left, right)) return false;
        }
      }
    }
    return true;
  }

  /** 验证局部性公理：若截面在覆盖的每个开集上限制相等，则整体相等 */
  public verifyLocality(covering: string[], openSetId: string): boolean {
    const sectionA = this._sections.get(openSetId);
    const sectionB = this._sections.get(`${openSetId}-copy`);
    if (!sectionA || !sectionB) return false;

    for (const coverSet of covering) {
      const resA = this.restrict(sectionA, openSetId, coverSet);
      const resB = this.restrict(sectionB, openSetId, coverSet);
      if (!resA || !resB) return false;
      if (!this._arraysEqual(resA, resB)) return true;
    }
    this._localityAxiom = this._arraysEqual(sectionA, sectionB);
    return this._localityAxiom;
  }

  /** 验证粘合公理：相容的局部截面可粘合成全局截面 */
  public verifyGluing(covering: string[], openSetId: string): boolean {
    const localSections: number[][] = [];
    for (const coverSet of covering) {
      const sec = this._sections.get(coverSet);
      if (sec) localSections.push(sec);
    }

    const glued = this._glueSections(localSections, covering);
    if (glued) {
      this._sections.set(openSetId, glued);
      this._gluingAxiom = true;
      return true;
    }
    return false;
  }

  /** 层化：将预层转化为层，如同唤醒沉睡的知识 */
  public sheafify(maxSteps: number = 100): boolean {
    this._sheafificationSteps = 0;
    for (let step = 0; step < maxSteps; step++) {
      this._sheafificationSteps++;
      let improved = false;

      for (const [openSetId, section] of this._sections) {
        const covering = this._findCovering(openSetId);
        if (covering.length > 1) {
          if (this.verifyGluing(covering, openSetId)) {
            improved = true;
          }
        }
      }

      if (!improved) break;
    }

    this._isSheaf = this._gluingAxiom && this._localityAxiom;
    return this._isSheaf;
  }

  /** 计算茎：在点x处的茎是正向极限 F_x = colim_{U∋x} F(U) */
  public computeStalk(point: number): number {
    const relevantSections: number[] = [];
    for (const [openSetId, openSet] of this._openSets) {
      if (openSet.elements.includes(point)) {
        const section = this._sections.get(openSetId);
        if (section && section.length > 0) {
          relevantSections.push(section[0]);
        }
      }
    }
    const stalkValue = relevantSections.length > 0
      ? relevantSections.reduce((a, b) => a + b, 0) / relevantSections.length
      : 0;
    this._stalkValues.set(`stalk-${point}`, stalkValue);
    return stalkValue;
  }

  /** 逐点截面存在性：判断每一点是否都有非零茎 */
  public hasNonZeroStalks(): boolean {
    for (let i = 0; i < this._baseSize; i++) {
      const stalk = this.computeStalk(i);
      if (Math.abs(stalk) < 1e-10) return false;
    }
    return true;
  }

  /** 计算截面环：若截面取值于环，则截面集构成环 */
  public sectionRing(openSetId: string): { addition: number[]; multiplication: number[] } | null {
    const section = this._sections.get(openSetId);
    if (!section) return null;
    const addition = section.map(v => v + v);
    const multiplication = section.map(v => v * v);
    return { addition, multiplication };
  }

  /** 比较两个预层：是否同构 */
  public isIsomorphicTo(other: Presheaf): boolean {
    return this._baseSize === other._baseSize && this._sections.size === other._sections.size;
  }

  private _isSubset(a: number[], b: number[]): boolean {
    return a.every(elem => b.includes(elem));
  }

  private _arraysEqual(a: number[], b: number[]): boolean {
    if (a.length !== b.length) return false;
    return a.every((val, i) => Math.abs(val - b[i]) < 1e-10);
  }

  private _glueSections(sections: number[][], covering: string[]): number[] | null {
    if (sections.length === 0) return null;
    const maxLen = Math.max(...sections.map(s => s.length));
    const glued = new Array(maxLen).fill(0);
    const counts = new Array(maxLen).fill(0);

    for (const sec of sections) {
      for (let i = 0; i < sec.length; i++) {
        glued[i] += sec[i];
        counts[i]++;
      }
    }

    for (let i = 0; i < maxLen; i++) {
      if (counts[i] > 0) glued[i] /= counts[i];
    }
    return glued;
  }

  private _findCovering(openSetId: string): string[] {
    const openSet = this._openSets.get(openSetId);
    if (!openSet) return [];
    const covering: string[] = [];
    for (const [id, os] of this._openSets) {
      if (id !== openSetId && this._isSubset(os.elements, openSet.elements) && os.elements.length > 0) {
        covering.push(id);
      }
    }
    return covering;
  }

  public report(): PresheafData {
    return {
      baseSize: this._baseSize,
      openSets: this._openSets.size,
      sections: this._sections.size,
      restrictionMaps: this._restrictionMaps.size,
      isSheaf: this._isSheaf,
      sheafificationSteps: this._sheafificationSteps,
    };
  }

  public reset(): void {
    this._sections.clear();
    this._restrictionMaps.clear();
    this._isSheaf = false;
    this._sheafificationSteps = 0;
    this._gluingAxiom = false;
    this._localityAxiom = false;
    this._stalkValues.clear();
  }
}
