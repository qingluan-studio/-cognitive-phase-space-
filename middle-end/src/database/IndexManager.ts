import { DataPacket, PacketMeta } from '../shared/types';

export interface Index {
  name: string;
  table: string;
  columns: string[];
  type: string;
  size: number;
  unique: boolean;
}

export interface IndexUsage {
  indexName: string;
  table: string;
  scans: number;
  seeks: number;
  usageRatio: number;
}

export class IndexManager {
  private _indexes: Map<string, Index> = new Map();
  private _usage: IndexUsage[] = [];
  private _counter = 0;

  createIndex(table: string, columns: string[], type: string = 'btree', options: { unique?: boolean; name?: string }): Index {
    const name = options?.name || `idx_${table}_${columns.join('_')}`;
    const index: Index = {
      name,
      table,
      columns,
      type,
      size: columns.length * 1024,
      unique: options?.unique || false,
    };
    this._indexes.set(name, index);
    return index;
  }

  dropIndex(name: string): boolean {
    return this._indexes.delete(name);
  }

  rebuildIndex(name: string): Index | null {
    const idx = this._indexes.get(name);
    if (!idx) return null;
    return idx;
  }

  reorganizeIndex(name: string): Index | null {
    const idx = this._indexes.get(name);
    if (!idx) return null;
    return idx;
  }

  btreeIndex(table: string, columns: string[]): Index {
    return this.createIndex(table, columns, 'btree');
  }

  hashIndex(table: string, column: string): Index {
    return this.createIndex(table, [column], 'hash');
  }

  bitmapIndex(table: string, column: string): Index {
    return this.createIndex(table, [column], 'bitmap');
  }

  fulltextIndex(table: string, columns: string[]): Index {
    return this.createIndex(table, columns, 'fulltext');
  }

  spatialIndex(table: string, geometry: string): Index {
    return this.createIndex(table, [geometry], 'spatial');
  }

  clusteredIndex(table: string, columns: string[]): Index {
    return this.createIndex(table, columns, 'clustered');
  }

  nonClusteredIndex(table: string, columns: string[]): Index {
    return this.createIndex(table, columns, 'nonclustered');
  }

  indexScan(table: string, condition: string): { rows: number; cost: number; method: string } {
    return { rows: 1000, cost: 500, method: 'index_scan' };
  }

  indexSeek(table: string, value: string): { rows: number; cost: number; method: string } {
    return { rows: 1, cost: 5, method: 'index_seek' };
  }

  indexMerge(indexes: string[]): { indexes: string[]; cost: number; merged: boolean } {
    return { indexes, cost: 100, merged: true };
  }

  indexFragmentation(name: string): { name: string; fragmentation: number; level: string } {
    const frag = Math.random() * 30;
    return { name, fragmentation: frag, level: frag > 20 ? 'high' : frag > 10 ? 'medium' : 'low' };
  }

  indexStats(name: string): IndexUsage {
    const usage: IndexUsage = {
      indexName: name,
      table: this._indexes.get(name)?.table || '',
      scans: Math.floor(Math.random() * 1000),
      seeks: Math.floor(Math.random() * 5000),
      usageRatio: Math.random(),
    };
    this._usage.push(usage);
    return usage;
  }

  toPacket(): DataPacket<{
    indexes: Map<string, Index>;
    usage: IndexUsage[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['database', 'IndexManager'],
      priority: 1,
      phase: 'index_manager',
    };
    return {
      id: `index-manager-${Date.now().toString(36)}`,
      payload: {
        indexes: this._indexes,
        usage: this._usage,
      },
      metadata,
    };
  }

  reset(): void {
    this._indexes = new Map();
    this._usage = [];
    this._counter = 0;
  }

  get indexCount(): number { return this._indexes.size; }
  get usageCount(): number { return this._usage.length; }
}
