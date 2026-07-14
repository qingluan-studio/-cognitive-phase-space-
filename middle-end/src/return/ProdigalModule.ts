export interface ProdigalModuleData {
  name: string;
  welcomed: boolean;
  gifts: string[];
  lessonsLearned: string[];
  maturity: number;
  wisdomIndex: number;
}

interface _LessonEntry {
  lesson: string;
  depth: number;
  learnedAt: number;
  reinforced: number;
}

export class ProdigalModule {
  private _name: string;
  private _welcomed: boolean;
  private _gifts: string[];
  private _lessons: Map<string, _LessonEntry>;
  private _timeAway: number;
  private _wanderings: number;
  private _repentanceLevel: number;

  constructor(name: string) {
    this._name = name;
    this._welcomed = false;
    this._gifts = [];
    this._lessons = new Map<string, _LessonEntry>();
    this._timeAway = 0;
    this._wanderings = 0;
    this._repentanceLevel = 0;
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

  get maturity(): number {
    const lessonDepth = Array.from(this._lessons.values())
      .reduce((s, l) => s + l.depth * (1 + l.reinforced * 0.1), 0);
    const wanderBonus = Math.min(0.3, this._wanderings / 100);
    const repentanceBonus = this._repentanceLevel * 0.3;
    return Math.min(1, lessonDepth / 10 + wanderBonus + repentanceBonus);
  }

  get wisdomIndex(): number {
    if (this._lessons.size === 0) return 0;
    const lessons = Array.from(this._lessons.values());
    const avgDepth = lessons.reduce((s, l) => s + l.depth, 0) / lessons.length;
    const reinforcement = lessons.reduce((s, l) => s + Math.min(1, l.reinforced / 10), 0) / lessons.length;
    const recencyFactor = this._computeRecencyFactor();
    return Math.min(1, avgDepth * 0.4 + reinforcement * 0.3 + recencyFactor * 0.3);
  }

  private _computeRecencyFactor(): number {
    if (this._lessons.size === 0) return 0;
    const now = Date.now();
    let acc = 0;
    for (const l of this._lessons.values()) {
      const age = (now - l.learnedAt) / (1000 * 60 * 60 * 24 * 30);
      acc += Math.exp(-age / 6);
    }
    return acc / this._lessons.size;
  }

  public wanderAway(cycles: number): void {
    this._timeAway += cycles;
    this._wanderings += 1;
    if (this._wanderings > 3) this._repentanceLevel = Math.min(1, this._repentanceLevel + 0.1);
  }

  public learnLesson(lesson: string, depth: number = 0.5): void {
    const existing = this._lessons.get(lesson);
    if (existing) {
      existing.reinforced += 1;
      existing.depth = Math.min(1, existing.depth + 0.1);
    } else {
      this._lessons.set(lesson, {
        lesson,
        depth: Math.max(0, Math.min(1, depth)),
        learnedAt: Date.now(),
        reinforced: 0,
      });
    }
  }

  public returnHome(): void {
    this._welcomed = true;
    this._repentanceLevel = Math.min(1, this._repentanceLevel + 0.2);
  }

  public offerGift(gift: string, value: number = 0.5): void {
    this._gifts.push(`${gift}:${value.toFixed(2)}`);
  }

  public forgive(): void {
    this._welcomed = true;
    this._gifts.push('robe:1.0', 'ring:1.0', 'feast:1.0');
    this._repentanceLevel = 1;
  }

  public reconcile(): number {
    const forgivenessScore = this._welcomed ? 0.4 : 0;
    const lessonScore = this.maturity * 0.4;
    const repentanceScore = this._repentanceLevel * 0.2;
    return Math.min(1, forgivenessScore + lessonScore + repentanceScore);
  }

  public lessonsLearned(): string[] {
    return Array.from(this._lessons.keys());
  }

  public lessonDepth(lesson: string): number {
    return this._lessons.get(lesson)?.depth ?? 0;
  }

  public report(): ProdigalModuleData {
    return {
      name: this._name,
      welcomed: this._welcomed,
      gifts: [...this._gifts],
      lessonsLearned: Array.from(this._lessons.keys()),
      maturity: this.maturity,
      wisdomIndex: this.wisdomIndex,
    };
  }
}
