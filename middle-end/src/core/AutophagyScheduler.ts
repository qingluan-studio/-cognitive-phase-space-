export interface ASTFragment {
  id: string;
  type: 'expression' | 'statement' | 'declaration' | 'comment' | 'whitespace';
  content: string;
  originalFile: string;
  lineNumber: number;
  metadata: Record<string, unknown>;
}

export interface DeadCodeReport {
  file: string;
  lines: number[];
  severity: 'critical' | 'warning' | 'info';
  decayScore: number;
}

export interface RecombinedModule {
  id: string;
  fragments: ASTFragment[];
  sourceCode: string;
  timestamp: number;
}

export class AutophagyScheduler {
  private _deadCodeReports: DeadCodeReport[] = [];
  private _fragments: ASTFragment[] = [];
  private _recombinedModules: Map<string, RecombinedModule> = new Map();
  private _scanInterval: ReturnType<typeof setInterval> | null = null;

  scanForDeadCode(files: string[]): DeadCodeReport[] {
    const reports: DeadCodeReport[] = [];

    for (const file of files) {
      const decayScore = this._calculateDecayScore(file);
      const severity = this._determineSeverity(decayScore);
      const lines = this._identifyDeadLines(file);

      const report: DeadCodeReport = {
        file,
        lines,
        severity,
        decayScore,
      };

      reports.push(report);
      if (severity !== 'info') {
        this._deadCodeReports.push(report);
        this._extractFragments(file, lines);
      }
    }

    return reports;
  }

  extractASTFragments(report: DeadCodeReport): ASTFragment[] {
    const fragments: ASTFragment[] = [];

    for (const line of report.lines) {
      const fragment: ASTFragment = {
        id: `${report.file}-${line}-${Date.now()}`,
        type: this._classifyFragmentType(line),
        content: this._mockLineContent(report.file, line),
        originalFile: report.file,
        lineNumber: line,
        metadata: { decayScore: report.decayScore },
      };
      fragments.push(fragment);
    }

    this._fragments.push(...fragments);
    return fragments;
  }

  recombineFragments(moduleId: string, fragmentIds: string[]): RecombinedModule {
    const fragments = fragmentIds
      .map(id => this._fragments.find(f => f.id === id))
      .filter((f): f is ASTFragment => !!f);

    const sourceCode = fragments.map(f => f.content).join('\n');

    const module: RecombinedModule = {
      id: moduleId,
      fragments,
      sourceCode,
      timestamp: Date.now(),
    };

    this._recombinedModules.set(moduleId, module);
    this._deleteConsumedFragments(fragmentIds);

    return module;
  }

  startAutophagyCycle(intervalMs: number = 60000): void {
    if (this._scanInterval) return;
    this._scanInterval = setInterval(() => {
      this._performAutophagy();
    }, intervalMs);
  }

  stopAutophagyCycle(): void {
    if (this._scanInterval) {
      clearInterval(this._scanInterval);
      this._scanInterval = null;
    }
  }

  getRecombinedModule(id: string): RecombinedModule | undefined {
    return this._recombinedModules.get(id);
  }

  private _calculateDecayScore(file: string): number {
    return Math.random() * 0.5 + 0.2;
  }

  private _determineSeverity(score: number): 'critical' | 'warning' | 'info' {
    if (score > 0.7) return 'critical';
    if (score > 0.4) return 'warning';
    return 'info';
  }

  private _identifyDeadLines(file: string): number[] {
    const lines: number[] = [];
    const count = Math.floor(Math.random() * 20) + 1;
    for (let i = 0; i < count; i++) {
      lines.push(Math.floor(Math.random() * 100) + 1);
    }
    return lines.sort((a, b) => a - b);
  }

  private _extractFragments(file: string, lines: number[]): void {
    for (const line of lines) {
      const fragment: ASTFragment = {
        id: `${file}-${line}-${Date.now()}`,
        type: 'statement',
        content: '',
        originalFile: file,
        lineNumber: line,
        metadata: {},
      };
      this._fragments.push(fragment);
    }
  }

  private _classifyFragmentType(line: number): ASTFragment['type'] {
    const types: ASTFragment['type'][] = ['expression', 'statement', 'declaration', 'comment', 'whitespace'];
    return types[Math.floor(Math.random() * types.length)];
  }

  private _mockLineContent(file: string, line: number): string {
    return `// Extracted from ${file}:${line}`;
  }

  private _deleteConsumedFragments(ids: string[]): void {
    this._fragments = this._fragments.filter(f => !ids.includes(f.id));
  }

  private _performAutophagy(): void {
    if (this._deadCodeReports.length > 0) {
      const report = this._deadCodeReports.shift()!;
      this.extractASTFragments(report);
    }
  }

  get deadCodeReportCount(): number {
    return this._deadCodeReports.length;
  }

  get fragmentCount(): number {
    return this._fragments.length;
  }

  get recombinedModuleCount(): number {
    return this._recombinedModules.size;
  }
}
