import type { DataPacket, Signal, Handler } from '../shared/types';

export interface CodeSnippet {
  id: string;
  language: string;
  content: string;
  description: string;
  complexity: number;
  tags: string[];
}

export interface RefactorResult {
  original: string;
  refactored: string;
  changes: RefactorChange[];
  improvementScore: number;
  warnings: string[];
}

export interface RefactorChange {
  type: 'rename' | 'extract' | 'simplify' | 'reorder' | 'format';
  description: string;
  lineStart: number;
  lineEnd: number;
}

export interface CodeExplanation {
  summary: string;
  structure: CodeStructureNode[];
  flow: string[];
  dependencies: string[];
  complexity: number;
}

export interface CodeStructureNode {
  name: string;
  type: 'function' | 'class' | 'variable' | 'interface' | 'module';
  line: number;
  children: CodeStructureNode[];
}

export class CodeForge {
  private _snippets: Map<string, CodeSnippet>;
  private _refactorHistory: RefactorResult[];
  private _supportedLanguages: Set<string>;
  private _complexityThreshold: number;
  private _maxHistorySize: number;
  private _codeTemplates: Map<string, string>;

  constructor() {
    this._snippets = new Map();
    this._refactorHistory = [];
    this._supportedLanguages = new Set(['typescript', 'javascript', 'python', 'rust', 'go']);
    this._complexityThreshold = 10;
    this._maxHistorySize = 100;
    this._codeTemplates = new Map();
  }

  get snippetCount(): number { return this._snippets.size; }
  get supportedLanguages(): string[] { return Array.from(this._supportedLanguages); }
  get refactorHistory(): RefactorResult[] { return [...this._refactorHistory]; }

  public addSnippet(snippet: CodeSnippet): void {
    this._snippets.set(snippet.id, { ...snippet, tags: [...snippet.tags] });
  }

  public getSnippet(id: string): CodeSnippet | undefined {
    const s = this._snippets.get(id);
    return s ? { ...s, tags: [...s.tags] } : undefined;
  }

  public findSnippetsByLanguage(language: string): CodeSnippet[] {
    return Array.from(this._snippets.values())
      .filter(s => s.language === language)
      .map(s => ({ ...s, tags: [...s.tags] }));
  }

  public findSnippetsByTag(tag: string): CodeSnippet[] {
    return Array.from(this._snippets.values())
      .filter(s => s.tags.includes(tag))
      .map(s => ({ ...s, tags: [...s.tags] }));
  }

  public generateCode(prompt: string, language: string, context?: string): string {
    const template = this._codeTemplates.get(language) || '';
    const baseStructure = this._getBaseStructure(language);
    const generated = this._buildGeneratedCode(prompt, baseStructure, context);
    return template ? template.replace('{{code}}', generated) : generated;
  }

  private _getBaseStructure(language: string): string {
    switch (language) {
      case 'typescript':
        return 'function generatedFunction() {\n  // TODO: implement\n  return null;\n}\n';
      case 'python':
        return 'def generated_function():\n    # TODO: implement\n    return None\n';
      case 'rust':
        return 'fn generated_function() {\n    // TODO: implement\n}\n';
      case 'go':
        return 'func GeneratedFunction() {\n\t// TODO: implement\n}\n';
      default:
        return '// TODO: implement\n';
    }
  }

  private _buildGeneratedCode(prompt: string, structure: string, context?: string): string {
    const header = `// Generated from: ${prompt.substring(0, 60)}${prompt.length > 60 ? '...' : ''}\n`;
    const ctx = context ? `// Context: ${context.substring(0, 100)}\n` : '';
    return header + ctx + structure;
  }

  public setTemplate(language: string, template: string): void {
    this._codeTemplates.set(language, template);
  }

  public refactor(code: string, options: { mode?: 'cleanup' | 'optimize' | 'modernize' } = {}): RefactorResult {
    const mode = options.mode || 'cleanup';
    const changes: RefactorChange[] = [];
    let refactored = code;
    let improvementScore = 0;
    const warnings: string[] = [];

    const originalLines = code.split('\n').length;

    if (mode === 'cleanup' || mode === 'optimize') {
      const trimmed = this._trimTrailingWhitespace(refactored);
      if (trimmed !== refactored) {
        changes.push({ type: 'format', description: 'Removed trailing whitespace', lineStart: 1, lineEnd: originalLines });
        refactored = trimmed;
        improvementScore += 5;
      }
    }

    if (mode === 'optimize') {
      const optimized = this._optimizeImports(refactored);
      if (optimized !== refactored) {
        changes.push({ type: 'simplify', description: 'Optimized imports', lineStart: 1, lineEnd: 10 });
        refactored = optimized;
        improvementScore += 10;
      }
    }

    if (mode === 'modernize') {
      const modernized = this._modernizeSyntax(refactored);
      if (modernized !== refactored) {
        changes.push({ type: 'simplify', description: 'Modernized syntax', lineStart: 1, lineEnd: originalLines });
        refactored = modernized;
        improvementScore += 15;
      }
    }

    const complexity = this.estimateComplexity(code);
    if (complexity > this._complexityThreshold) {
      warnings.push(`Code complexity (${complexity}) exceeds threshold (${this._complexityThreshold})`);
    }

    const result: RefactorResult = {
      original: code,
      refactored,
      changes,
      improvementScore: Math.min(improvementScore, 100),
      warnings
    };

    this._refactorHistory.push(result);
    if (this._refactorHistory.length > this._maxHistorySize) {
      this._refactorHistory.shift();
    }

    return result;
  }

  private _trimTrailingWhitespace(code: string): string {
    return code.split('\n').map(line => line.trimEnd()).join('\n');
  }

  private _optimizeImports(code: string): string {
    return code.replace(/import\s*{([^}]+)}\s*from\s*['"]([^'"]+)['"]/g, (match, names, path) => {
      const sorted = names.split(',').map((n: string) => n.trim()).sort().join(', ');
      return `import { ${sorted} } from '${path}'`;
    });
  }

  private _modernizeSyntax(code: string): string {
    return code
      .replace(/function\s+(\w+)\s*\(([^)]*)\)\s*\{/g, 'const $1 = ($2) => {')
      .replace(/var\s+/g, 'let ');
  }

  public explain(code: string, language: string = 'typescript'): CodeExplanation {
    const structure = this._parseStructure(code, language);
    const flow = this._extractFlow(code);
    const dependencies = this._extractDependencies(code, language);
    const complexity = this.estimateComplexity(code);
    const summary = this._generateSummary(structure, complexity);

    return {
      summary,
      structure,
      flow,
      dependencies,
      complexity
    };
  }

  private _parseStructure(code: string, language: string): CodeStructureNode[] {
    const nodes: CodeStructureNode[] = [];
    const lines = code.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const funcMatch = line.match(/^(?:export\s+)?(?:function|const)\s+(\w+)/);
      const classMatch = line.match(/^(?:export\s+)?class\s+(\w+)/);
      const interfaceMatch = line.match(/^(?:export\s+)?interface\s+(\w+)/);

      if (classMatch) {
        const children = this._extractClassMembers(lines, i + 1);
        nodes.push({ name: classMatch[1], type: 'class', line: i + 1, children });
      } else if (interfaceMatch) {
        nodes.push({ name: interfaceMatch[1], type: 'interface', line: i + 1, children: [] });
      } else if (funcMatch) {
        nodes.push({ name: funcMatch[1], type: 'function', line: i + 1, children: [] });
      }
    }

    return nodes;
  }

  private _extractClassMembers(lines: string[], startLine: number): CodeStructureNode[] {
    const members: CodeStructureNode[] = [];
    let depth = 0;
    for (let i = startLine; i < lines.length; i++) {
      if (lines[i].includes('{')) depth++;
      if (lines[i].includes('}')) {
        if (depth === 0) break;
        depth--;
      }
      const methodMatch = lines[i].trim().match(/^(?:public|private|protected)?\s*(\w+)\s*\(/);
      if (methodMatch && !methodMatch[1].startsWith('_') && depth > 0) {
        members.push({ name: methodMatch[1], type: 'function', line: i + 1, children: [] });
      }
    }
    return members;
  }

  private _extractFlow(code: string): string[] {
    const flow: string[] = [];
    const keywords = ['if', 'for', 'while', 'switch', 'try', 'catch', 'return', 'await', 'throw'];
    const lines = code.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      for (const kw of keywords) {
        if (trimmed.startsWith(kw) || trimmed.includes(` ${kw} `)) {
          flow.push(`Line ${i + 1}: ${kw} - ${trimmed.substring(0, 50)}`);
          break;
        }
      }
    }
    return flow.slice(0, 20);
  }

  private _extractDependencies(code: string, language: string): string[] {
    const deps: string[] = [];
    const lines = code.split('\n');
    for (const line of lines) {
      const importMatch = line.match(/from\s+['"]([^'"]+)['"]/);
      const requireMatch = line.match(/require\s*\(\s*['"]([^'"]+)['"]\s*\)/);
      if (importMatch) deps.push(importMatch[1]);
      if (requireMatch) deps.push(requireMatch[1]);
    }
    return [...new Set(deps)];
  }

  private _generateSummary(structure: CodeStructureNode[], complexity: number): string {
    const types = structure.map(s => s.type);
    const classCount = types.filter(t => t === 'class').length;
    const funcCount = types.filter(t => t === 'function').length;
    const ifaceCount = types.filter(t => t === 'interface').length;
    return `Code contains ${classCount} classes, ${funcCount} functions, and ${ifaceCount} interfaces. Estimated complexity: ${complexity}.`;
  }

  public estimateComplexity(code: string): number {
    const lines = code.split('\n');
    let complexity = 1;
    for (const line of lines) {
      const trimmed = line.trim();
      if (/^(if|else if|for|while|switch|case|catch|&&|\|\||\?)/.test(trimmed)) {
        complexity++;
      }
    }
    return Math.min(complexity, 50);
  }

  public formatCode(code: string, language: string = 'typescript'): string {
    const lines = code.split('\n');
    let indentLevel = 0;
    const result: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('}') || trimmed.startsWith(')') || trimmed.startsWith(']')) {
        indentLevel = Math.max(0, indentLevel - 1);
      }
      const indent = '  '.repeat(indentLevel);
      result.push(indent + trimmed);
      if (trimmed.endsWith('{') || trimmed.endsWith('(') || trimmed.endsWith('[')) {
        indentLevel++;
      }
    }

    return result.join('\n');
  }

  public detectSignalFromCode(code: string): Signal {
    const complexity = this.estimateComplexity(code);
    const lines = code.split('\n').length;
    return {
      source: 'code-forge',
      magnitude: Math.min(1, lines / 100),
      entropy: Math.min(1, complexity / 20),
      timestamp: Date.now()
    };
  }

  public processPacket(packet: DataPacket<string>): DataPacket<CodeExplanation> {
    const explanation = this.explain(packet.payload);
    return {
      id: `exp-${packet.id}`,
      payload: explanation,
      metadata: {
        createdAt: Date.now(),
        route: [...packet.metadata.route, 'code-forge'],
        priority: packet.metadata.priority,
        phase: 'explained'
      }
    };
  }

  public clearHistory(): void {
    this._refactorHistory = [];
  }

  public reset(): void {
    this._snippets.clear();
    this._refactorHistory = [];
    this._codeTemplates.clear();
  }
}
