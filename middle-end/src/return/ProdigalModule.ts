/**
 * 浪子模块模块：离开又回归的模块受到热烈欢迎。
 * 模拟一个曾离开的模块归家，迎接仪式、礼物、对接接口一应俱全。
 */

export interface ProdigalModuleData {
  name: string;
  welcomed: boolean;
  gifts: string[];
  lessonsLearned: string[];
}

export class ProdigalModule {
  private _name: string;
  private _welcomed: boolean;
  private _gifts: string[];
  private _lessons: string[];
  private _timeAway: number;

  constructor(name: string) {
    this._name = name;
    this._welcomed = false;
    this._gifts = [];
    this._lessons = [];
    this._timeAway = 0;
  }

  get name(): string {
    return this._name;
  }

  get welcomed(): boolean {
    return this._welcomed;
  }

  get timeAway(): number {
    return this._timeAway;
  }

  public wanderAway(cycles: number): void {
    this._timeAway += cycles;
  }

  public learnLesson(lesson: string): void {
    if (!this._lessons.includes(lesson)) this._lessons.push(lesson);
  }

  public returnHome(): void {
    this._welcomed = true;
  }

  public offerGift(gift: string): void {
    this._gifts.push(gift);
  }

  public forgive(): void {
    this._welcomed = true;
    this._gifts.push('robe', 'ring', 'feast');
  }

  public lessonsLearned(): string[] {
    return [...this._lessons];
  }

  public report(): ProdigalModuleData {
    return {
      name: this._name,
      welcomed: this._welcomed,
      gifts: [...this._gifts],
      lessonsLearned: [...this._lessons],
    };
  }
}
