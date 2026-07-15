export interface DeonticLogicData {
  obligations: number;
  permissions: number;
  prohibitions: number;
  norms: number;
  violations: number;
}

export class DeonticLogic {
  private _obligations: number;
  private _permissions: number;
  private _prohibitions: number;
  private _norms: number;
  private _violations: number;
  private _obligated: Set<string>;
  private _permitted: Set<string>;
  private _prohibited: Set<string>;
  private _idealWorlds: number;
  private _accessibility: number[][];
  private _worlds: number;

  constructor(worlds: number = 5) {
    this._obligations = 0;
    this._permissions = 0;
    this._prohibitions = 0;
    this._norms = 0;
    this._violations = 0;
    this._obligated = new Set();
    this._permitted = new Set();
    this._prohibited = new Set();
    this._idealWorlds = Math.floor(worlds / 2);
    this._worlds = worlds;
    this._accessibility = [];
    for (let i = 0; i < worlds; i++) {
      this._accessibility.push([]);
      for (let j = 0; j < worlds; j++) {
        this._accessibility[i].push(j < this._idealWorlds ? 1 : 0);
      }
    }
  }

  get obligations(): number {
    return this._obligations;
  }

  get permissions(): number {
    return this._permissions;
  }

  get prohibitions(): number {
    return this._prohibitions;
  }

  get violations(): number {
    return this._violations;
  }

  public addObligation(action: string): void {
    this._obligations++;
    this._norms++;
    this._obligated.add(action);
    this._permitted.add(action);
  }

  public addPermission(action: string): void {
    this._permissions++;
    this._norms++;
    this._permitted.add(action);
  }

  public addProhibition(action: string): void {
    this._prohibitions++;
    this._norms++;
    this._prohibited.add(action);
  }

  public isObligatory(action: string): boolean {
    return this._obligated.has(action);
  }

  public isPermitted(action: string): boolean {
    return this._permitted.has(action);
  }

  public isProhibited(action: string): boolean {
    return this._prohibited.has(action);
  }

  public ought(action: string): boolean {
    return this.isObligatory(action);
  }

  public may(action: string): boolean {
    return this.isPermitted(action);
  }

  public mustNot(action: string): boolean {
    return this.isProhibited(action);
  }

  public violatesNorm(action: string): boolean {
    if (this._prohibited.has(action)) {
      this._violations++;
      return true;
    }
    return false;
  }

  public fulfillsObligation(action: string): boolean {
    return this._obligated.has(action);
  }

  public isOptional(action: string): boolean {
    return this._permitted.has(action) && !this._obligated.has(action);
  }

  public deonticDilemma(a: string, b: string): boolean {
    return this.isObligatory(a) && this.isObligatory(b) && this.isProhibited(a + b);
  }

  public contraryToDuty(obligation: string, violation: string, counterobligation: string): boolean {
    return this.isObligatory(obligation) && this.isProhibited(violation) && this.isObligatory(counterobligation);
  }

  public isIdealWorld(world: number): boolean {
    return world < this._idealWorlds;
  }

  public report(): DeonticLogicData {
    return {
      obligations: this._obligations,
      permissions: this._permissions,
      prohibitions: this._prohibitions,
      norms: this._norms,
      violations: this._violations,
    };
  }

  public getObligations(): string[] {
    return [...this._obligated];
  }

  public getPermissions(): string[] {
    return [...this._permitted];
  }

  public getProhibitions(): string[] {
    return [...this._prohibited];
  }

  public getNormCount(): number {
    return this._norms;
  }

  public reset(): void {
    this._obligations = 0;
    this._permissions = 0;
    this._prohibitions = 0;
    this._norms = 0;
    this._violations = 0;
    this._obligated.clear();
    this._permitted.clear();
    this._prohibited.clear();
  }
}
