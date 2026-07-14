/**
 * 无中生有创造者：从完全空白中建构新对象。
 * 以空集为起点，通过逐步注入属性与结构，从无中创造具有意义的新对象。
 */

export type GenesisPhase = 'void' | 'seed' | 'sprout' | 'form' | 'complete';

export interface GenesisArtifact {
  id: string;
  phase: GenesisPhase;
  structure: Record<string, unknown>;
  complexity: number;
  createdAt: number;
}

export class ExNihiloCreator {
  private _artifacts: GenesisArtifact[] = [];
  private _current: GenesisArtifact | null = null;
  private _namingCounter = 0;

  begin(): GenesisArtifact {
    this._current = {
      id: this._nextName(),
      phase: 'void',
      structure: {},
      complexity: 0,
      createdAt: Date.now(),
    };
    return this._current;
  }

  seed(key: string, value: unknown): GenesisArtifact | null {
    if (!this._current) return null;
    this._current.structure[key] = value;
    this._current.phase = 'seed';
    this._current.complexity++;
    return this._current;
  }

  sprout(nestKey: string, fields: Record<string, unknown>): GenesisArtifact | null {
    if (!this._current) return null;
    this._current.structure[nestKey] = { ...fields };
    this._current.phase = 'sprout';
    this._current.complexity += Object.keys(fields).length;
    return this._current;
  }

  shape(transformer: (s: Record<string, unknown>) => Record<string, unknown>): GenesisArtifact | null {
    if (!this._current) return null;
    this._current.structure = transformer(this._current.structure);
    this._current.phase = 'form';
    this._current.complexity = Object.keys(this._current.structure).length;
    return this._current;
  }

  finalize(): GenesisArtifact | null {
    if (!this._current) return null;
    this._current.phase = 'complete';
    this._artifacts.push(this._current);
    if (this._artifacts.length > 100) this._artifacts.shift();
    const finished = this._current;
    this._current = null;
    return finished;
  }

  abandon(): void {
    this._current = null;
  }

  private _nextName(): string {
    return `exnihilo-${(++this._namingCounter).toString(36)}-${Date.now().toString(36)}`;
  }

  getArtifacts(): GenesisArtifact[] {
    return [...this._artifacts];
  }

  getArtifact(id: string): GenesisArtifact | null {
    return this._artifacts.find(a => a.id === id) ?? null;
  }

  get current(): GenesisArtifact | null {
    return this._current;
  }

  get artifactCount(): number {
    return this._artifacts.length;
  }
}
