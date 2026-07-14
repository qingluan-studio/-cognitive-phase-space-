/**
 * 空对象受益者：通过空对象模式获得安全默认行为。
 * 提供空对象（Null Object）作为默认实现，使调用方免于 null 检查并保持安全默认行为。
 */

export interface BeneficiaryContract {
  name: string;
  perform: () => string;
  isEnabled: boolean;
}

export interface NullObjectRecord {
  consumer: string;
  invokedAt: number;
  defaultBehavior: string;
}

export class NullObjectBenefactor implements BeneficiaryContract {
  private _records: NullObjectRecord[] = [];
  private _name = 'null-object';
  private _isEnabled = false;
  private _defaultBehavior = 'noop';
  private _fallbackMap: Map<string, string> = new Map();

  registerFallback(consumer: string, behavior: string): void {
    this._fallbackMap.set(consumer, behavior);
  }

  forConsumer(consumer: string): BeneficiaryContract {
    const behavior = this._fallbackMap.get(consumer) ?? this._defaultBehavior;
    return {
      name: `${this._name}:${consumer}`,
      isEnabled: false,
      perform: () => {
        this._records.push({
          consumer,
          invokedAt: Date.now(),
          defaultBehavior: behavior,
        });
        return behavior;
      },
    };
  }

  perform(): string {
    this._records.push({
      consumer: 'default',
      invokedAt: Date.now(),
      defaultBehavior: this._defaultBehavior,
    });
    return this._defaultBehavior;
  }

  setDefaultBehavior(behavior: string): void {
    this._defaultBehavior = behavior;
  }

  getRecords(consumer?: string): NullObjectRecord[] {
    if (consumer) return this._records.filter(r => r.consumer === consumer);
    return [...this._records];
  }

  clearRecords(): number {
    const count = this._records.length;
    this._records = [];
    return count;
  }

  get name(): string {
    return this._name;
  }

  get isEnabled(): boolean {
    return this._isEnabled;
  }

  get recordCount(): number {
    return this._records.length;
  }
}
