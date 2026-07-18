/**
 * Ouroboros Logger — logs its own logging actions.
 * Infinite regress contained within a finite buffer.
 */

export type LogLevel = 'void' | 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'eschaton';

export interface LogEntry {
  readonly level: LogLevel;
  readonly module: string;
  readonly message: string;
  readonly meta?: unknown;
  readonly timestamp: number;
  readonly logId: string;
}

export class Logger {
  private static instances = new Map<string, Logger>();
  private logs: LogEntry[] = [];
  private metaLoggers: Logger[] = [];
  private maxSize = 5000;

  private constructor(private moduleName: string) {}

  static for(moduleName: string): Logger {
    if (!Logger.instances.has(moduleName)) {
      Logger.instances.set(moduleName, new Logger(moduleName));
    }
    return Logger.instances.get(moduleName)!;
  }

  static global(): Logger {
    return Logger.for('Omphalos');
  }

  attachMetaLogger(logger: Logger): void {
    this.metaLoggers.push(logger);
  }

  log(level: LogLevel, message: string, meta?: unknown): void {
    const entry: LogEntry = {
      level,
      module: this.moduleName,
      message,
      meta,
      timestamp: Date.now(),
      logId: `${this.moduleName}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    };
    this.logs.push(entry);
    if (this.logs.length > this.maxSize) this.logs.splice(0, this.maxSize / 5);
    for (const ml of this.metaLoggers) {
      ml.log('trace', `[meta-log] ${this.moduleName} logged ${level}`, { original: entry });
    }
  }

  void(message: string, meta?: unknown): void { this.log('void', message, meta); }
  trace(message: string, meta?: unknown): void { this.log('trace', message, meta); }
  debug(message: string, meta?: unknown): void { this.log('debug', message, meta); }
  info(message: string, meta?: unknown): void { this.log('info', message, meta); }
  warn(message: string, meta?: unknown): void { this.log('warn', message, meta); }
  error(message: string, meta?: unknown): void { this.log('error', message, meta); }
  eschaton(message: string, meta?: unknown): void { this.log('eschaton', message, meta); }

  query(level?: LogLevel, since?: number): LogEntry[] {
    return this.logs.filter((e) => (!level || e.level === level) && (!since || e.timestamp >= since));
  }

  tail(n = 10): LogEntry[] {
    return this.logs.slice(-n);
  }

  drain(): LogEntry[] {
    const out = [...this.logs];
    this.logs = [];
    return out;
  }
}
