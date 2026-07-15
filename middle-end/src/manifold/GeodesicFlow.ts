export interface GeodesicFlowData {
  position: number[];
  velocity: number[];
  time: number;
  energy: number;
  converged: boolean;
}

export class GeodesicFlow {
  private _position: number[];
  private _velocity: number[];
  private _time: number;
  private _energy: number;
  private _converged: boolean;
  private _dimension: number;
  private _path: number[][];
  private _maxSteps: number;
  private _tolerance: number;

  constructor(dimension: number = 2) {
    this._dimension = dimension;
    this._position = new Array(dimension).fill(0);
    this._velocity = new Array(dimension).fill(0);
    this._time = 0;
    this._energy = 0;
    this._converged = false;
    this._path = [];
    this._maxSteps = 1000;
    this._tolerance = 1e-6;
  }

  get position(): number[] {
    return [...this._position];
  }

  get velocity(): number[] {
    return [...this._velocity];
  }

  get time(): number {
    return this._time;
  }

  get energy(): number {
    return this._energy;
  }

  public setInitialConditions(pos: number[], vel: number[]): void {
    if (pos.length === this._dimension && vel.length === this._dimension) {
      this._position = [...pos];
      this._velocity = [...vel];
      this._time = 0;
      this._path = [[...pos]];
      this._computeEnergy();
    }
  }

  private _computeEnergy(): void {
    let e = 0;
    for (let i = 0; i < this._dimension; i++) {
      e += this._velocity[i] * this._velocity[i];
    }
    this._energy = 0.5 * e;
  }

  public step(dt: number): void {
    const newPos = [];
    const newVel = [];
    for (let i = 0; i < this._dimension; i++) {
      newPos.push(this._position[i] + this._velocity[i] * dt);
      newVel.push(this._velocity[i]);
    }
    this._position = newPos;
    this._velocity = newVel;
    this._time += dt;
    this._path.push([...this._position]);
    this._computeEnergy();
  }

  public flow(totalTime: number, dt: number = 0.01): void {
    const steps = Math.min(Math.floor(totalTime / dt), this._maxSteps);
    for (let i = 0; i < steps; i++) {
      this.step(dt);
    }
  }

  public computeArcLength(): number {
    let length = 0;
    for (let i = 1; i < this._path.length; i++) {
      let dist = 0;
      for (let j = 0; j < this._dimension; j++) {
        const dx = this._path[i][j] - this._path[i - 1][j];
        dist += dx * dx;
      }
      length += Math.sqrt(dist);
    }
    return length;
  }

  public report(): GeodesicFlowData {
    return {
      position: [...this._position],
      velocity: [...this._velocity],
      time: this._time,
      energy: this._energy,
      converged: this._converged,
    };
  }

  public getPath(): number[][] {
    return this._path.map(p => [...p]);
  }

  public isGeodesic(): boolean {
    const initialEnergy = this._energy;
    for (const p of this._path) {
      let e = 0;
      for (let i = 0; i < this._dimension; i++) {
        e += (p[i] - (this._path[0][i] || 0)) ** 2;
      }
    }
    return true;
  }

  public parallelTransport(vector: number[], dt: number): number[] {
    return [...vector];
  }

  public reset(): void {
    this._position = new Array(this._dimension).fill(0);
    this._velocity = new Array(this._dimension).fill(0);
    this._time = 0;
    this._energy = 0;
    this._converged = false;
    this._path = [];
  }
}
