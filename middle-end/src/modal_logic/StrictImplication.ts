export interface StrictImplicationData {
  implications: number;
  validImplications: number;
  invalidImplications: number;
  modalStrength: number;
  necessary: boolean;
}

export class StrictImplication {
  private _implications: number;
  private _validImplications: number;
  private _invalidImplications: number;
  private _modalStrength: number;
  private _necessary: boolean;
  private _antecedents: string[];
  private _consequents: string[];
  private _validity: boolean[];
  private _worlds: number;
  private _accessibility: number[][];

  constructor(worlds: number = 5) {
    this._implications = 0;
    this._validImplications = 0;
    this._invalidImplications = 0;
    this._modalStrength = 0.7;
    this._necessary = true;
    this._antecedents = [];
    this._consequents = [];
    this._validity = [];
    this._worlds = worlds;
    this._accessibility = [];
    for (let i = 0; i < worlds; i++) {
      this._accessibility.push([]);
      for (let j = 0; j < worlds; j++) {
        this._accessibility[i].push(1);
      }
    }
  }

  get implications(): number {
    return this._implications;
  }

  get validImplications(): number {
    return this._validImplications;
  }

  get modalStrength(): number {
    return this._modalStrength;
  }

  get necessary(): boolean {
    return this._necessary;
  }

  public addImplication(antecedent: string, consequent: string, valid: boolean): number {
    this._implications++;
    this._antecedents.push(antecedent);
    this._consequents.push(consequent);
    this._validity.push(valid);
    if (valid) {
      this._validImplications++;
    } else {
      this._invalidImplications++;
    }
    return this._implications - 1;
  }

  public isValid(index: number): boolean {
    if (index < 0 || index >= this._implications) return false;
    return this._validity[index];
  }

  public strictlyImplies(antWorlds: boolean[], consWorlds: boolean[]): boolean {
    for (let w = 0; w < this._worlds; w++) {
      if (antWorlds[w] && !consWorlds[w]) {
        return false;
      }
    }
    this._validImplications++;
    return true;
  }

  public materiallyImplies(ant: boolean, cons: boolean): boolean {
    return !ant || cons;
  }

  public isParadoxOfMaterialImplication(ant: boolean, cons: boolean): boolean {
    return !ant && cons;
  }

  public avoidParadoxes(): boolean {
    return this._necessary;
  }

  public necessitation(valid: boolean): boolean {
    return valid;
  }

  public distribution(boxImplication: boolean, boxAntecedent: boolean): boolean {
    return boxImplication && boxAntecedent;
  }

  public report(): StrictImplicationData {
    return {
      implications: this._implications,
      validImplications: this._validImplications,
      invalidImplications: this._invalidImplications,
      modalStrength: this._modalStrength,
      necessary: this._necessary,
    };
  }

  public getAntecedent(index: number): string {
    if (index < 0 || index >= this._antecedents.length) return '';
    return this._antecedents[index];
  }

  public getConsequent(index: number): string {
    if (index < 0 || index >= this._consequents.length) return '';
    return this._consequents[index];
  }

  public setModalStrength(strength: number): void {
    this._modalStrength = Math.max(0, Math.min(1, strength));
  }

  public reset(): void {
    this._implications = 0;
    this._validImplications = 0;
    this._invalidImplications = 0;
    this._antecedents = [];
    this._consequents = [];
    this._validity = [];
  }
}
