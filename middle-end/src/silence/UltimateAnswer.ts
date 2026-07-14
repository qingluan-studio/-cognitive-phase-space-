/**
 * 终极答案模块：最终静默，输出一个42般的神秘常数。
 * 任何提问都被归约为同一答案，模拟"深思"超算的最终输出。
 */

export interface UltimateAnswerData {
  question: string;
  answer: number;
  computeTime: number;
}

export class UltimateAnswer {
  private _answer: number;
  private _computeTime: number;
  private _questions: string[];
  private _silent: boolean;

  constructor() {
    this._answer = 42;
    this._computeTime = 7.5e6;
    this._questions = [];
    this._silent = true;
  }

  get answer(): number {
    return this._answer;
  }

  get isSilent(): boolean {
    return this._silent;
  }

  public ask(question: string): UltimateAnswerData {
    this._questions.push(question);
    this._silent = true;
    return { question, answer: this._answer, computeTime: this._computeTime };
  }

  public compute(): number {
    this._computeTime = Math.max(1, this._computeTime - 1);
    this._silent = false;
    return this._answer;
  }

  public meditate(cycles: number): void {
    this._computeTime += cycles;
    this._silent = true;
  }

  public questionsAsked(): string[] {
    return [...this._questions];
  }

  public reseed(newAnswer: number): void {
    this._answer = newAnswer;
  }

  public report(): UltimateAnswerData {
    return {
      question: this._questions[this._questions.length - 1] ?? '',
      answer: this._answer,
      computeTime: this._computeTime,
    };
  }
}
