/**
 * 自描述代码模块：代码完全描述自身，无需额外文档。
 * 反射式地输出自身的结构、方法、字段，实现自我说明。
 */

export interface SelfDescriptiveCodeData {
  className: string;
  methods: string[];
  properties: string[];
  lineCount: number;
}

export class SelfDescriptiveCode {
  private _className: string;
  private _methods: string[];
  private _properties: string[];
  private _descriptions: Map<string, string>;

  constructor() {
    this._className = 'SelfDescriptiveCode';
    this._methods = ['describe', 'addMethod', 'addProperty', 'removeMethod', 'signature', 'report'];
    this._properties = ['className', 'methods', 'properties'];
    this._descriptions = new Map<string, string>();
  }

  get className(): string {
    return this._className;
  }

  get methods(): string[] {
    return [...this._methods];
  }

  get properties(): string[] {
    return [...this._properties];
  }

  public describe(name: string, description: string): void {
    this._descriptions.set(name, description);
  }

  public addMethod(name: string): void {
    if (!this._methods.includes(name)) this._methods.push(name);
  }

  public addProperty(name: string): void {
    if (!this._properties.includes(name)) this._properties.push(name);
  }

  public removeMethod(name: string): void {
    this._methods = this._methods.filter((m) => m !== name);
    this._descriptions.delete(name);
  }

  public signature(): string {
    return `${this._className} { methods: [${this._methods.join(', ')}]; properties: [${this._properties.join(', ')}] }`;
  }

  public report(): SelfDescriptiveCodeData {
    return {
      className: this._className,
      methods: [...this._methods],
      properties: [...this._properties],
      lineCount: this._methods.length + this._properties.length + 10,
    };
  }
}
