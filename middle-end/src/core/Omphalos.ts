export interface EntryPoint {
  id: string;
  name: string;
  type: 'api' | 'event' | 'direct' | 'scheduled';
  handler: (payload: unknown) => Promise<unknown> | unknown;
  priority: number;
  active: boolean;
  lastAccessed: number;
  accessCount: number;
}

export interface IntegrationPoint {
  id: string;
  entryPointId: string;
  targetModule: string;
  transformation?: (data: unknown) => unknown;
}

export interface OmphalosState {
  isOpen: boolean;
  activeEntryPoints: number;
  totalAccesses: number;
  scarDepth: number;
}

export class Omphalos {
  private _entryPoints: Map<string, EntryPoint> = new Map();
  private _integrations: Map<string, IntegrationPoint[]> = new Map();
  private _scarDepth = 0;
  private _isOpen = false;

  registerEntryPoint(entry: Omit<EntryPoint, 'lastAccessed' | 'accessCount'>): EntryPoint {
    const fullEntry: EntryPoint = {
      ...entry,
      lastAccessed: Date.now(),
      accessCount: 0,
    };
    this._entryPoints.set(entry.id, fullEntry);
    this._integrations.set(entry.id, []);
    this._scarDepth = Math.min(1, this._scarDepth + 0.01);
    return fullEntry;
  }

  unregisterEntryPoint(id: string): boolean {
    const removed = this._entryPoints.delete(id);
    this._integrations.delete(id);
    if (removed) {
      this._scarDepth = Math.max(0, this._scarDepth - 0.01);
    }
    return removed;
  }

  addIntegration(entryPointId: string, integration: Omit<IntegrationPoint, 'id'>): IntegrationPoint {
    if (!this._entryPoints.has(entryPointId)) {
      throw new Error(`Entry point not found: ${entryPointId}`);
    }

    const fullIntegration: IntegrationPoint = {
      ...integration,
      id: `${entryPointId}-${Date.now()}`,
    };
    this._integrations.get(entryPointId)?.push(fullIntegration);
    return fullIntegration;
  }

  async route(payload: unknown, entryPointId: string): Promise<unknown> {
    const entry = this._entryPoints.get(entryPointId);
    if (!entry || !entry.active) {
      throw new Error(`Entry point unavailable: ${entryPointId}`);
    }

    entry.lastAccessed = Date.now();
    entry.accessCount++;
    this._scarDepth = Math.min(1, this._scarDepth + 0.001);

    let result = await Promise.resolve(entry.handler(payload));

    const integrations = this._integrations.get(entryPointId) || [];
    for (const integration of integrations) {
      if (integration.transformation) {
        result = integration.transformation(result);
      }
    }

    return result;
  }

  open(): void {
    this._isOpen = true;
    this._scarDepth = Math.min(1, this._scarDepth + 0.1);
  }

  close(): void {
    this._isOpen = false;
  }

  getState(): OmphalosState {
    const activeCount = Array.from(this._entryPoints.values()).filter(e => e.active).length;
    const totalAccesses = Array.from(this._entryPoints.values()).reduce((sum, e) => sum + e.accessCount, 0);

    return {
      isOpen: this._isOpen,
      activeEntryPoints: activeCount,
      totalAccesses,
      scarDepth: this._scarDepth,
    };
  }

  getEntryPointById(id: string): EntryPoint | undefined {
    return this._entryPoints.get(id);
  }

  getIntegrations(entryPointId: string): IntegrationPoint[] {
    return this._integrations.get(entryPointId) || [];
  }

  get entryPointCount(): number {
    return this._entryPoints.size;
  }

  get isOpen(): boolean {
    return this._isOpen;
  }

  get scarDepth(): number {
    return this._scarDepth;
  }
}
