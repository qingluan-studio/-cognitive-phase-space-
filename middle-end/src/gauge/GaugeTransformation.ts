export interface GaugeTransformationData {
  transformation: number;
  parameter: number;
  groupElement: number;
  invariant: boolean;
  generator: number;
}

export class GaugeTransformation {
  private _transformation: number;
  private _parameter: number;
  private _groupElement: number;
  private _invariant: boolean;
  private _generator: number;
  private _algebraBasis: number[];
  private _structureConstants: number[][];
  private _groupOrder: number;

  constructor(groupOrder: number = 1) {
    this._transformation = 0;
    this._parameter = 0;
    this._groupElement = 1;
    this._invariant = true;
    this._generator = 1;
    this._groupOrder = groupOrder;
    this._algebraBasis = [];
    for (let i = 0; i < groupOrder; i++) {
      this._algebraBasis.push(i + 1);
    }
    this._structureConstants = [];
    for (let i = 0; i < groupOrder; i++) {
      this._structureConstants.push([]);
      for (let j = 0; j < groupOrder; j++) {
        this._structureConstants[i].push(i === j ? 0 : (i - j));
      }
    }
  }

  get transformation(): number {
    return this._transformation;
  }

  get parameter(): number {
    return this._parameter;
  }

  get groupElement(): number {
    return this._groupElement;
  }

  get invariant(): boolean {
    return this._invariant;
  }

  public apply(parameter: number, field: number): number {
    this._parameter = parameter;
    this._transformation = parameter;
    this._groupElement = Math.exp(this._generator * parameter);
    const transformed = field + parameter;
    this._invariant = Math.abs(transformed - field) < 0.001;
    return transformed;
  }

  public applyLocal(parameter: number, position: number, field: number): number {
    const localParam = parameter * Math.sin(position);
    this._parameter = localParam;
    return field + localParam;
  }

  public compose(a: number, b: number): number {
    return a + b;
  }

  public inverse(element: number): number {
    return -element;
  }

  public computeLieBracket(a: number, b: number): number {
    if (a < 0 || a >= this._groupOrder || b < 0 || b >= this._groupOrder) return 0;
    return this._structureConstants[a][b];
  }

  public exponentialMap(algebraElement: number): number {
    return Math.exp(algebraElement);
  }

  public logarithmMap(groupElement: number): number {
    if (groupElement <= 0) return 0;
    return Math.log(groupElement);
  }

  public report(): GaugeTransformationData {
    return {
      transformation: this._transformation,
      parameter: this._parameter,
      groupElement: this._groupElement,
      invariant: this._invariant,
      generator: this._generator,
    };
  }

  public setGenerator(value: number): void {
    this._generator = value;
  }

  public isGaugeInvariant(fieldBefore: number, fieldAfter: number): boolean {
    return Math.abs(fieldAfter - fieldBefore) < 0.001;
  }

  public computeCovariantDerivative(field: number, gaugePotential: number, coupling: number): number {
    return field - coupling * gaugePotential * field;
  }

  public reset(): void {
    this._transformation = 0;
    this._parameter = 0;
    this._groupElement = 1;
    this._invariant = true;
  }
}
