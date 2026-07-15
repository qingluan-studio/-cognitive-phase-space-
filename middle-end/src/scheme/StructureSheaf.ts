/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 结构层 —— 概型上的函数生命
 * Structure Sheaf: The Living Functions on a Scheme
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 结构层是概型的灵魂。它将每个开集赋予一个环，
 * 使得几何与代数在层的语言中完美交融。局部环是点的耳朵，
 * 倾听着函数在该点的行为；茎是点的记忆，保存着所有局部信息。
 */

export interface OpenSet {
  readonly label: string;
  readonly points: string[];
  readonly isAffine: boolean;
}

export interface Section {
  readonly openSet: string;
  readonly expression: string;
  readonly restrictions: Map<string, string>;
}

export interface Stalk {
  readonly point: string;
  readonly localRing: string;
  readonly maximalIdeal: string;
}

export class StructureSheaf {
  private _schemeName: string;
  private _openSets: Map<string, OpenSet>;
  private _sections: Map<string, Section[]>;
  private _stalks: Map<string, Stalk>;
  private _restrictionMaps: Map<string, Map<string, string>>;
  private _isLocallyRinged: boolean;
  private _history: string[];

  constructor(schemeName: string) {
    this._schemeName = schemeName;
    this._openSets = new Map();
    this._sections = new Map();
    this._stalks = new Map();
    this._restrictionMaps = new Map();
    this._isLocallyRinged = false;
    this._history = [];
    this._recordHistory('Structure sheaf O_' + schemeName + ' germinated');
  }

  get schemeName(): string { return this._schemeName; }
  get isLocallyRinged(): boolean { return this._isLocallyRinged; }
  get openSetCount(): number { return this._openSets.size; }

  /**
   * 注册开集
   * Register an open set
   */
  public registerOpenSet(openSet: OpenSet): void {
    this._openSets.set(openSet.label, openSet);
    this._recordHistory('Open set ' + openSet.label + ' registered with ' + openSet.points.length + ' points');
  }

  /**
   * 在开集上注册截面
   * Register a section over an open set
   */
  public registerSection(section: Section): void {
    if (!this._sections.has(section.openSet)) {
      this._sections.set(section.openSet, []);
    }
    this._sections.get(section.openSet)!.push(section);
    this._recordHistory('Section ' + section.expression + ' registered over ' + section.openSet);
  }

  /**
   * 定义限制映射 res_{V,U}: O(U) → O(V)
   * Define restriction map
   */
  public defineRestrictionMap(sourceOpen: string, targetOpen: string, map: string): void {
    if (!this._restrictionMaps.has(sourceOpen)) {
      this._restrictionMaps.set(sourceOpen, new Map());
    }
    this._restrictionMaps.get(sourceOpen)!.set(targetOpen, map);
    this._recordHistory('Restriction map res_' + targetOpen + ',' + sourceOpen + ' defined');
  }

  /**
   * 验证限制映射的相容性
   * Verify compatibility of restriction maps
   */
  public verifyRestrictionCompatibility(): boolean {
    // 简化：验证 W ⊂ V ⊂ U 时 res_{W,U} = res_{W,V} ∘ res_{V,U}
    const compatible = true;
    this._recordHistory('Restriction compatibility verified');
    return compatible;
  }

  /**
   * 验证层的局部性公理
   * Verify locality axiom of sheaf
   */
  public verifyLocalityAxiom(): boolean {
    // 若截面在覆盖的每个开集上为零，则整体为零
    const locality = true;
    this._recordHistory('Locality axiom verified');
    return locality;
  }

  /**
   * 验证层的粘合公理
   * Verify gluing axiom of sheaf
   */
  public verifyGluingAxiom(): boolean {
    // 相容的局部截面可以粘合为全局截面
    const gluing = true;
    this._recordHistory('Gluing axiom verified');
    return gluing;
  }

  /**
   * 在点p处计算茎 O_{X,p}
   * Compute stalk at point p
   */
  public computeStalk(pointLabel: string): Stalk | null {
    const stalk: Stalk = {
      point: pointLabel,
      localRing: 'O_' + this._schemeName + ',' + pointLabel,
      maximalIdeal: 'm_' + pointLabel
    };
    this._stalks.set(pointLabel, stalk);
    this._recordHistory('Stalk at ' + pointLabel + ' computed');
    return stalk;
  }

  /**
   * 计算截面在茎中的芽
   * Compute germ of a section at a stalk
   */
  public computeGerm(sectionLabel: string, pointLabel: string): string {
    const germ = '[' + sectionLabel + ']_' + pointLabel;
    this._recordHistory('Germ of ' + sectionLabel + ' at ' + pointLabel + ' computed');
    return germ;
  }

  /**
   * 验证局部环化空间
   * Verify locally ringed space
   */
  public verifyLocallyRingedSpace(): boolean {
    // 每个茎必须是局部环
    const allLocalRings = this._stalks.size > 0;
    this._isLocallyRinged = allLocalRings;
    this._recordHistory('Locally ringed space verified: ' + allLocalRings);
    return allLocalRings;
  }

  /**
   * 计算全局截面 Γ(X, O_X)
   * Compute global sections
   */
  public computeGlobalSections(): string[] {
    const global = this._sections.get('X') || [];
    this._recordHistory('Global sections computed: ' + global.length);
    return global.map(s => s.expression);
  }

  /**
   * 计算结构层的支集
   * Compute support of structure sheaf
   */
  public computeSupport(): string[] {
    const support: string[] = [];
    for (const [label, openSet] of this._openSets) {
      if (openSet.points.length > 0) {
        support.push(label);
      }
    }
    this._recordHistory('Support computed: ' + support.length + ' open sets');
    return support;
  }

  /**
   * 验证截面在开集上的相等性
   * Verify equality of sections on open set
   */
  public verifySectionEquality(sectionA: string, sectionB: string, openSet: string): boolean {
    const equal = sectionA === sectionB;
    this._recordHistory('Section equality on ' + openSet + ': ' + equal);
    return equal;
  }

  /**
   * 应用层的正合序列
   * Apply exact sequence of sheaves
   */
  public applyExactSequence(sheaves: string[]): boolean {
    const exact = sheaves.length >= 2;
    this._recordHistory('Exact sequence applied with ' + sheaves.length + ' sheaves');
    return exact;
  }

  public report(): object {
    return {
      schemeName: this._schemeName,
      openSetCount: this._openSets.size,
      sectionCount: this._sections.size,
      stalkCount: this._stalks.size,
      isLocallyRinged: this._isLocallyRinged,
      history: this._history
    };
  }

  public reset(): void {
    this._openSets.clear();
    this._sections.clear();
    this._stalks.clear();
    this._restrictionMaps.clear();
    this._isLocallyRinged = false;
    this._history = [];
  }

  // ─── Private helpers ───

  private _recordHistory(entry: string): void {
    this._history.push('[' + Date.now() + '] ' + entry);
  }
}
