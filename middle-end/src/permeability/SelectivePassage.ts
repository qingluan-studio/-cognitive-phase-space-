/**
 * SelectivePassage - 选择性通道
 * 只允许符合特定条件的信息通过，依据内容签名、优先级、
 * 来源可信度等多维标准进行过滤决策。
 */

export interface SelectivePassageData {
  readonly passageId: string;
  allowedCategories: string[];
  minPriority: number;
  trustedSources: string[];
}

export interface PassageItem {
  readonly itemId: string;
  category: string;
  priority: number;
  source: string;
  contentSize: number;
}

export class SelectivePassage {
  private _data: SelectivePassageData;
  private _passedItems: PassageItem[] = [];
  private _rejectedItems: PassageItem[] = [];
  private _throughput: number = 0;
  private _rejectionRate: number = 0;

  constructor(data: SelectivePassageData) {
    this._data = {
      ...data,
      allowedCategories: [...data.allowedCategories],
      trustedSources: [...data.trustedSources],
    };
  }

  get passageId(): string {
    return this._data.passageId;
  }

  get passedCount(): number {
    return this._passedItems.length;
  }

  get rejectedCount(): number {
    return this._rejectedItems.length;
  }

  public evaluate(item: PassageItem): boolean {
    const categoryOk = this._data.allowedCategories.includes(item.category);
    const priorityOk = item.priority >= this._data.minPriority;
    const sourceTrusted = this._data.trustedSources.includes(item.source);
    const passes = categoryOk && priorityOk && sourceTrusted;
    if (passes) {
      this._passedItems.push({ ...item });
      this._throughput += item.contentSize;
    } else {
      this._rejectedItems.push({ ...item });
    }
    this._updateRejectionRate();
    return passes;
  }

  private _updateRejectionRate(): void {
    const total = this._passedItems.length + this._rejectedItems.length;
    this._rejectionRate = total === 0 ? 0 : this._rejectedItems.length / total;
  }

  public addCategory(category: string): void {
    if (!this._data.allowedCategories.includes(category)) {
      this._data.allowedCategories.push(category);
    }
  }

  public trustSource(source: string): void {
    if (!this._data.trustedSources.includes(source)) {
      this._data.trustedSources.push(source);
    }
  }

  public setMinPriority(priority: number): void {
    this._data.minPriority = Math.max(0, Math.min(10, priority));
  }

  public flushHistory(): void {
    this._passedItems = [];
    this._rejectedItems = [];
    this._throughput = 0;
    this._rejectionRate = 0;
  }

  public bulkEvaluate(items: PassageItem[]): number {
    let passed = 0;
    items.forEach((item) => {
      if (this.evaluate(item)) {
        passed++;
      }
    });
    return passed;
  }

  public computeSelectivity(): number {
    return 1 - this._rejectionRate;
  }

  public passageReport(): Record<string, unknown> {
    return {
      passageId: this.passageId,
      allowedCategories: this._data.allowedCategories.length,
      trustedSources: this._data.trustedSources.length,
      minPriority: this._data.minPriority,
      passedCount: this.passedCount,
      rejectedCount: this.rejectedCount,
      throughput: this._throughput.toFixed(2),
      rejectionRate: this._rejectionRate.toFixed(3),
      selectivity: this.computeSelectivity().toFixed(3),
    };
  }
}
