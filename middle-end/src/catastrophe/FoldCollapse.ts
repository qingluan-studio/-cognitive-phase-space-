export interface FoldCollapseData {
  readonly foldId: string;
  controlParameter: number;
  foldPoint: number;
  stateValue: number;
}

export interface FoldEvent {
  controlBefore: number;
  controlAfter: number;
  stateBefore: number;
  stateAfter: number;
  collapseDepth: number;
  energyDissipated: number;
}

export class FoldCollapse {
  private _data: FoldCollapseData;
  private _events: FoldEvent[] = [];
  private _collapsed: boolean = false;
  private _collapseDepth: number = 0;
  private _stabilitySurface: number = 0;
  private _totalEnergy: number = 0;

  constructor(data: FoldCollapseData) {
    this._data = { ...data };
    this._updateStability();
  }

  get foldId(): string {
    return this._data.foldId;
  }

  get controlParameter(): number {
    return this._data.controlParameter;
  }

  get stateValue(): number {
    return this._data.stateValue;
  }

  get collapsed(): boolean {
    return this._collapsed;
  }

  get totalEnergy(): number {
    return this._totalEnergy;
  }

  private _updateStability(): void {
    const diff = this._data.controlParameter - this._data.foldPoint;
    if (diff < 0) {
      this._stabilitySurface = Math.sqrt(-diff);
      this._collapsed = false;
    } else {
      this._stabilitySurface = 0;
      this._collapsed = true;
    }
  }

  public computePotential(state: number): number {
    const diff = this._data.controlParameter - this._data.foldPoint;
    return state ** 3 / 3 + diff * state;
  }

  public computeGradient(): number {
    const diff = this._data.controlParameter - this._data.foldPoint;
    if (diff >= 0) return -1;
    return -1 / (2 * Math.sqrt(-diff));
  }

  public computeCurvature(state: number): number {
    const diff = this._data.controlParameter - this._data.foldPoint;
    return 2 * state + diff;
  }

  public adjustControl(value: number): FoldEvent | null {
    const before = { control: this._data.controlParameter, state: this._data.stateValue };
    this._data.controlParameter = value;
    const wasCollapsed = this._collapsed;
    this._updateStability();
    if (this._collapsed && !wasCollapsed) {
      const stateBefore = this._data.stateValue;
      const energy = this.computePotential(stateBefore);
      this._data.stateValue = 0;
      this._collapseDepth = stateBefore;
      this._totalEnergy += Math.abs(energy);
      const event: FoldEvent = {
        controlBefore: before.control,
        controlAfter: value,
        stateBefore,
        stateAfter: this._data.stateValue,
        collapseDepth: this._collapseDepth,
        energyDissipated: Math.abs(energy),
      };
      this._events.push(event);
      if (this._events.length > 20) this._events.shift();
      return event;
    }
    if (!this._collapsed && wasCollapsed) {
      this._data.stateValue = this._stabilitySurface;
    }
    return null;
  }

  public setFoldPoint(point: number): void {
    this._data.foldPoint = point;
    this._updateStability();
  }

  public restoreState(): boolean {
    if (!this._collapsed) return false;
    this._data.controlParameter = this._data.foldPoint - 0.1;
    this._updateStability();
    this._data.stateValue = this._stabilitySurface;
    return true;
  }

  public measureFoldProximity(): number {
    return Math.max(0, this._data.foldPoint - this._data.controlParameter);
  }

  public isApproachingFold(): boolean {
    return this.measureFoldProximity() < 0.1 && !this._collapsed;
  }

  public criticalityIndex(): number {
    const proximity = this.measureFoldProximity();
    if (proximity <= 0) return 1;
    return Math.exp(-proximity * 10);
  }

  public stabilize(): void {
    this._data.controlParameter = this._data.foldPoint - 1;
    this._updateStability();
    this._data.stateValue = this._stabilitySurface;
    this._collapseDepth = 0;
  }

  public foldReport(): Record<string, unknown> {
    return {
      foldId: this.foldId,
      controlParameter: this._data.controlParameter.toFixed(3),
      foldPoint: this._data.foldPoint.toFixed(3),
      stateValue: this._data.stateValue.toFixed(3),
      stabilitySurface: this._stabilitySurface.toFixed(3),
      collapsed: this._collapsed,
      collapseDepth: this._collapseDepth.toFixed(3),
      gradient: this.computeGradient().toFixed(3),
      foldProximity: this.measureFoldProximity().toFixed(3),
      criticalityIndex: this.criticalityIndex().toFixed(3),
      totalEnergy: this._totalEnergy.toFixed(4),
      eventCount: this._events.length,
    };
  }
}
