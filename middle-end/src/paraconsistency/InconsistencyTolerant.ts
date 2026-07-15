export interface InconsistencyTolerantData {
  contradictions: number;
  usableInfo: number;
  localConsistency: number;
  globalConsistency: number;
  chunkAndPermeate: boolean;
}

export class InconsistencyTolerant {
  private _contradictions: number;
  private _usableInfo: number;
  private _localConsistency: number;
  private _globalConsistency: number;
  private _chunkAndPermeate: boolean;
  private _chunks: number[][];
  private _chunkCount: number;
  private _informationPreserved: number;

  constructor() {
    this._contradictions = 0;
    this._usableInfo = 100;
    this._localConsistency = 0.9;
    this._globalConsistency = 0.5;
    this._chunkAndPermeate = true;
    this._chunks = [];
    this._chunkCount = 0;
    this._informationPreserved = 0.7;
  }

  get contradictions(): number {
    return this._contradictions;
  }

  get usableInfo(): number {
    return this._usableInfo;
  }

  get localConsistency(): number {
    return this._localConsistency;
  }

  get globalConsistency(): number {
    return this._globalConsistency;
  }

  public addContradiction(): void {
    this._contradictions++;
    this._globalConsistency = Math.max(0, 1 - this._contradictions * 0.1);
  }

  public createChunk(): number {
    this._chunkCount++;
    this._chunks.push([]);
    return this._chunkCount - 1;
  }

  public addToChunk(chunkIndex: number, info: number): void {
    if (chunkIndex >= 0 && chunkIndex < this._chunkCount) {
      this._chunks[chunkIndex].push(info);
    }
  }

  public permeate(fromChunk: number, toChunk: number, infoIndex: number): boolean {
    if (fromChunk < 0 || fromChunk >= this._chunkCount) return false;
    if (toChunk < 0 || toChunk >= this._chunkCount) return false;
    if (infoIndex < 0 || infoIndex >= this._chunks[fromChunk].length) return false;
    const info = this._chunks[fromChunk][infoIndex];
    this._chunks[toChunk].push(info);
    return true;
  }

  public localConsistencyOf(chunkIndex: number): number {
    if (chunkIndex < 0 || chunkIndex >= this._chunkCount) return 0;
    const chunk = this._chunks[chunkIndex];
    return 1 - (chunk.length % 3) * 0.1;
  }

  public isTrivial(): boolean {
    return this._usableInfo <= 0;
  }

  public isNonTrivial(): boolean {
    return !this.isTrivial();
  }

  public computeInformationPreservation(): number {
    this._informationPreserved = this._usableInfo / 100;
    return this._informationPreserved;
  }

  public report(): InconsistencyTolerantData {
    return {
      contradictions: this._contradictions,
      usableInfo: this._usableInfo,
      localConsistency: this._localConsistency,
      globalConsistency: this._globalConsistency,
      chunkAndPermeate: this._chunkAndPermeate,
    };
  }

  public getChunkCount(): number {
    return this._chunkCount;
  }

  public getChunk(index: number): number[] {
    if (index < 0 || index >= this._chunkCount) return [];
    return [...this._chunks[index]];
  }

  public usesChunkAndPermeate(): boolean {
    return this._chunkAndPermeate;
  }

  public setUsableInfo(value: number): void {
    this._usableInfo = Math.max(0, Math.min(100, value));
  }

  public reset(): void {
    this._contradictions = 0;
    this._usableInfo = 100;
    this._localConsistency = 0.9;
    this._globalConsistency = 0.5;
    this._chunks = [];
    this._chunkCount = 0;
  }
}
