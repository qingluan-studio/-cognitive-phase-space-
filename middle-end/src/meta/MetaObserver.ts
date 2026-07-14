/**
 * 元观察者模块：观察系统的观察行为本身。
 * 记录被观察者、观察手段、观察频度，形成对观察的观察链。
 */

export interface MetaObserverData {
  observations: number;
  observingObservers: number;
  recursionDepth: number;
  log: string[];
}

export class MetaObserver {
  private _observations: number;
  private _observers: Set<string>;
  private _recursionDepth: number;
  private _log: string[];
  private _maxDepth: number;

  constructor(maxDepth: number = 3) {
    this._observations = 0;
    this._observers = new Set<string>();
    this._recursionDepth = 0;
    this._log = [];
    this._maxDepth = maxDepth;
  }

  get observationCount(): number {
    return this._observations;
  }

  get observingObservers(): number {
    return this._observers.size;
  }

  public observe(observer: string, target: string): void {
    this._observations += 1;
    this._observers.add(observer);
    this._log.push(`${observer}->${target}@depth${this._recursionDepth}`);
  }

  public ascend(): void {
    if (this._recursionDepth < this._maxDepth) this._recursionDepth += 1;
  }

  public descend(): void {
    if (this._recursionDepth > 0) this._recursionDepth -= 1;
  }

  public isObservationTooDeep(): boolean {
    return this._recursionDepth >= this._maxDepth;
  }

  public setMaxDepth(d: number): void {
    this._maxDepth = Math.max(0, d);
  }

  public clearLog(): void {
    this._log = [];
  }

  public report(): MetaObserverData {
    return {
      observations: this._observations,
      observingObservers: this.observingObservers,
      recursionDepth: this._recursionDepth,
      log: [...this._log],
    };
  }
}
