/**
 * 死胡同收割模块：在错误路径中收集经验。
 * 每次撞墙都把教训存入仓库，避免重蹈覆辙。
 */

export interface DeadEndHarvestData {
  lessons: string[];
  totalAttempts: number;
  yieldRate: number;
}

export interface HarvestedLesson {
  location: string;
  lesson: string;
  value: number;
}

export class DeadEndHarvest {
  private _lessons: HarvestedLesson[];
  private _attempts: number;
  private _blacklist: Set<string>;

  constructor() {
    this._lessons = [];
    this._attempts = 0;
    this._blacklist = new Set<string>();
  }

  get lessonCount(): number {
    return this._lessons.length;
  }

  get yieldRate(): number {
    return this._attempts === 0 ? 0 : this._lessons.length / this._attempts;
  }

  public hitDeadEnd(location: string, insight: string): HarvestedLesson {
    this._attempts += 1;
    this._blacklist.add(location);
    const lesson: HarvestedLesson = {
      location,
      lesson: insight,
      value: insight.length,
    };
    this._lessons.push(lesson);
    return lesson;
  }

  public isBlacklisted(location: string): boolean {
    return this._blacklist.has(location);
  }

  public filterValuable(threshold: number): HarvestedLesson[] {
    return this._lessons.filter((l) => l.value >= threshold);
  }

  public distill(): string[] {
    return this._lessons.map((l) => `[${l.location}] ${l.lesson}`);
  }

  public report(): DeadEndHarvestData {
    return {
      lessons: this.distill(),
      totalAttempts: this._attempts,
      yieldRate: this.yieldRate,
    };
  }

  public merge(other: DeadEndHarvest): void {
    for (const l of other._lessons) {
      this._lessons.push(l);
      this._blacklist.add(l.location);
    }
    this._attempts += other._attempts;
  }
}
