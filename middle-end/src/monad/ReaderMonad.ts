export interface ReaderMonadData {
  environment: number;
  value: number;
  dependencies: number;
  pure: boolean;
  composed: boolean;
}

export class ReaderMonad {
  private _environment: number;
  private _value: number;
  private _dependencies: number;
  private _pure: boolean;
  private _composed: boolean;
  private _envHistory: number[];
  private _readCount: number;
  private _config: Record<string, number>;

  constructor(initialEnv: number = 0) {
    this._environment = initialEnv;
    this._value = 0;
    this._dependencies = 1;
    this._pure = false;
    this._composed = false;
    this._envHistory = [initialEnv];
    this._readCount = 0;
    this._config = {};
  }

  get environment(): number {
    return this._environment;
  }

  get value(): number {
    return this._value;
  }

  get dependencies(): number {
    return this._dependencies;
  }

  get isPure(): boolean {
    return this._pure;
  }

  public ask(): number {
    this._readCount++;
    return this._environment;
  }

  public asks(f: (env: number) => number): number {
    this._readCount++;
    return f(this._environment);
  }

  public run(env: number): number {
    this._environment = env;
    this._envHistory.push(env);
    if (this._envHistory.length > 50) this._envHistory.shift();
    return this._value;
  }

  public pure(value: number): number {
    this._value = value;
    this._pure = true;
    return value;
  }

  public map(f: (x: number) => number): number {
    this._value = f(this._value);
    return this._value;
  }

  public bind(value: number, f: (x: number, env: number) => number): number {
    const result = f(value, this._environment);
    this._value = result;
    return result;
  }

  public flatMap(f: (x: number) => number): number {
    return f(this._value);
  }

  public local(f: (env: number) => number, computation: (env: number) => number): number {
    const modifiedEnv = f(this._environment);
    return computation(modifiedEnv);
  }

  public compose(other: ReaderMonad): ReaderMonad {
    this._composed = true;
    this._dependencies += other._dependencies;
    return this;
  }

  public setConfig(key: string, value: number): void {
    this._config[key] = value;
  }

  public getConfig(key: string): number {
    return this._config[key] || 0;
  }

  public report(): ReaderMonadData {
    return {
      environment: this._environment,
      value: this._value,
      dependencies: this._dependencies,
      pure: this._pure,
      composed: this._composed,
    };
  }

  public getReadCount(): number {
    return this._readCount;
  }

  public getEnvironmentHistory(): number[] {
    return [...this._envHistory];
  }

  public sequence(readers: ((env: number) => number)[]): number[] {
    return readers.map(r => r(this._environment));
  }

  public withEnv(newEnv: number, f: () => number): number {
    const oldEnv = this._environment;
    this._environment = newEnv;
    const result = f();
    this._environment = oldEnv;
    return result;
  }

  public reset(): void {
    this._value = 0;
    this._pure = false;
    this._composed = false;
    this._readCount = 0;
  }
}
