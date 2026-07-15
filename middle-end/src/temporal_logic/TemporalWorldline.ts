export interface TemporalWorldlineData {
  timeline: number;
  currentState: number;
  pastStates: number;
  futureStates: number;
  branching: number;
}

export class TemporalWorldline {
  private _timeline: number;
  private _currentState: number;
  private _pastStates: number[];
  private _futureStates: number[];
  private _branching: number;
  private _branchingPoints: number[];
  private _worldlines: number[][];
  private _presentIndex: number;

  constructor(timelineLength: number = 20) {
    this._timeline = timelineLength;
    this._currentState = 0;
    this._pastStates = [];
    this._futureStates = [];
    this._branching = 0;
    this._branchingPoints = [];
    this._worldlines = [];
    this._presentIndex = Math.floor(timelineLength / 2);
    for (let i = 0; i < timelineLength; i++) {
      this._pastStates.push(i);
      this._futureStates.push(timelineLength - i - 1);
    }
  }

  get timeline(): number {
    return this._timeline;
  }

  get currentState(): number {
    return this._currentState;
  }

  get branching(): number {
    return this._branching;
  }

  get presentIndex(): number {
    return this._presentIndex;
  }

  public setState(state: number): void {
    this._currentState = state;
  }

  public advance(): void {
    this._presentIndex++;
    if (this._presentIndex < this._timeline) {
      this._currentState = this._pastStates[this._presentIndex] || this._currentState;
    }
  }

  public rewind(): void {
    if (this._presentIndex > 0) {
      this._presentIndex--;
      this._currentState = this._pastStates[this._presentIndex] || this._currentState;
    }
  }

  public getPast(timeAgo: number): number {
    const index = this._presentIndex - timeAgo;
    if (index < 0 || index >= this._pastStates.length) return -1;
    return this._pastStates[index];
  }

  public getFuture(timeAhead: number): number {
    const index = timeAhead;
    if (index < 0 || index >= this._futureStates.length) return -1;
    return this._futureStates[index];
  }

  public createBranch(point: number): number {
    this._branching++;
    this._branchingPoints.push(point);
    const branch: number[] = [];
    for (let i = 0; i < this._timeline; i++) {
      branch.push(i < point ? i : i + this._branching * 100);
    }
    this._worldlines.push(branch);
    return this._branching - 1;
  }

  public isBranchingPoint(time: number): boolean {
    return this._branchingPoints.includes(time);
  }

  public getWorldline(branchIndex: number): number[] {
    if (branchIndex < 0 || branchIndex >= this._worldlines.length) {
      return [...this._pastStates];
    }
    return [...this._worldlines[branchIndex]];
  }

  public isLinear(): boolean {
    return this._branching === 0;
  }

  public report(): TemporalWorldlineData {
    return {
      timeline: this._timeline,
      currentState: this._currentState,
      pastStates: this._pastStates.length,
      futureStates: this._futureStates.length,
      branching: this._branching,
    };
  }

  public getBranchingPoints(): number[] {
    return [...this._branchingPoints];
  }

  public setTimelineLength(length: number): void {
    this._timeline = length;
    this._pastStates = [];
    this._futureStates = [];
    for (let i = 0; i < length; i++) {
      this._pastStates.push(i);
      this._futureStates.push(length - i - 1);
    }
  }

  public goToPresent(): void {
    this._presentIndex = Math.floor(this._timeline / 2);
  }

  public reset(): void {
    this._branching = 0;
    this._branchingPoints = [];
    this._worldlines = [];
    this._presentIndex = Math.floor(this._timeline / 2);
  }
}
