import { DataPacket } from '../shared/types';

export type IndexType = 'BPLUSTREE' | 'HASH' | 'FULLTEXT' | 'BITMAP' | 'UNIQUE' | 'COMPOSITE';

export interface IndexEntry {
  key: string;
  value: unknown;
  position: number;
  timestamp: number;
}

export interface BPlusTreeNode {
  isLeaf: boolean;
  keys: string[];
  children: BPlusTreeNode[];
  values?: unknown[];
  next?: BPlusTreeNode;
  parent?: BPlusTreeNode;
}

export interface HashIndexBucket {
  entries: IndexEntry[];
  overflow?: HashIndexBucket;
}

export interface FullTextIndexEntry {
  term: string;
  documentIds: Set<string>;
  termFrequency: Map<string, number>;
  idf: number;
}

export interface BitmapIndexEntry {
  key: string;
  bitmap: Uint8Array;
  cardinality: number;
}

export interface IndexStatistics {
  name: string;
  type: IndexType;
  size: number;
  entryCount: number;
  height?: number;
  fanout?: number;
  loadFactor?: number;
  collisionRate?: number;
  uniqueKeys: number;
  lastRebuild: number;
  accessCount: number;
  hitRate: number;
}

export interface IndexQueryResult {
  found: boolean;
  value?: unknown;
  position?: number;
  scanCount: number;
  executionTime: number;
  indexUsed: string;
}

export interface RangeQueryResult {
  results: IndexEntry[];
  count: number;
  scanCount: number;
  executionTime: number;
}

export interface DatabaseIndexState {
  indexes: Map<string, IndexStatistics>;
  totalIndexes: number;
  totalOperations: number;
  lastQuery?: { indexName: string; query: string };
  lastResult?: IndexQueryResult | RangeQueryResult;
}

export class DatabaseIndex {
  private _indexes: Map<string, IndexType> = new Map();
  private _bPlusTreeRoots: Map<string, BPlusTreeNode> = new Map();
  private _hashIndexes: Map<string, HashIndexBucket[]> = new Map();
  private _fullTextIndexes: Map<string, Map<string, FullTextIndexEntry>> = new Map();
  private _bitmapIndexes: Map<string, Map<string, BitmapIndexEntry>> = new Map();
  private _indexStats: Map<string, IndexStatistics> = new Map();
  private _totalOperations: number = 0;
  private _totalLookups: number = 0;
  private _totalHits: number = 0;
  private _counter: number = 0;
  private _order: number = 100;
  private _hashSize: number = 1024;
  private _lastIndexName: string | null = null;
  private _lastQuery: { indexName: string; query: string } | null = null;
  private _lastResult: IndexQueryResult | RangeQueryResult | null = null;

  constructor() {
    this._initializeDefaultIndexes();
  }

  private _initializeDefaultIndexes(): void {
    this.createIndex('idx_user_id', 'BPLUSTREE');
    this.createIndex('idx_username', 'UNIQUE');
    this.createIndex('idx_email_hash', 'HASH');
    this.createIndex('idx_fulltext_content', 'FULLTEXT');
    this.createIndex('idx_status_bitmap', 'BITMAP');
  }

  get totalIndexes(): number {
    return this._indexes.size;
  }

  get totalOperations(): number {
    return this._totalOperations;
  }

  get indexes(): Map<string, IndexType> {
    return this._indexes;
  }

  get indexStats(): Map<string, IndexStatistics> {
    return this._indexStats;
  }

  get overallHitRate(): number {
    return this._totalLookups > 0 ? (this._totalHits / this._totalLookups) * 100 : 0;
  }

  createIndex(name: string, type: IndexType): boolean {
    if (this._indexes.has(name)) return false;
    this._indexes.set(name, type);
    const now = Date.now();
    const stats: IndexStatistics = {
      name,
      type,
      size: 0,
      entryCount: 0,
      uniqueKeys: 0,
      lastRebuild: now,
      accessCount: 0,
      hitRate: 0
    };
    if (type === 'BPLUSTREE') {
      stats.fanout = this._order;
      stats.height = 1;
      const root: BPlusTreeNode = { isLeaf: true, keys: [], children: [] };
      this._bPlusTreeRoots.set(name, root);
    } else if (type === 'HASH') {
      stats.loadFactor = 0;
      stats.collisionRate = 0;
      const buckets: HashIndexBucket[] = [];
      for (let i = 0; i < this._hashSize; i++) {
        buckets.push({ entries: [] });
      }
      this._hashIndexes.set(name, buckets);
    } else if (type === 'FULLTEXT') {
      this._fullTextIndexes.set(name, new Map());
    } else if (type === 'BITMAP') {
      this._bitmapIndexes.set(name, new Map());
    } else if (type === 'UNIQUE') {
      const root: BPlusTreeNode = { isLeaf: true, keys: [], children: [] };
      this._bPlusTreeRoots.set(name, root);
    }
    this._indexStats.set(name, stats);
    this._totalOperations++;
    return true;
  }

  dropIndex(name: string): boolean {
    if (!this._indexes.has(name)) return false;
    const type = this._indexes.get(name);
    this._indexes.delete(name);
    this._indexStats.delete(name);
    if (type === 'BPLUSTREE' || type === 'UNIQUE') {
      this._bPlusTreeRoots.delete(name);
    } else if (type === 'HASH') {
      this._hashIndexes.delete(name);
    } else if (type === 'FULLTEXT') {
      this._fullTextIndexes.delete(name);
    } else if (type === 'BITMAP') {
      this._bitmapIndexes.delete(name);
    }
    this._totalOperations++;
    return true;
  }

  bPlusTreeInsert(indexName: string, key: string, value: unknown, position: number): boolean {
    const root = this._bPlusTreeRoots.get(indexName);
    const stats = this._indexStats.get(indexName);
    if (!root || !stats) return false;
    this._totalOperations++;
    stats.accessCount++;
    const entry: IndexEntry = { key, value, position, timestamp: Date.now() };
    const result = this._bPlusInsert(root, indexName, key, entry, stats);
    if (result) {
      stats.entryCount++;
      stats.uniqueKeys = stats.entryCount;
      stats.size += 128;
    }
    return result;
  }

  private _bPlusInsert(node: BPlusTreeNode, indexName: string, key: string, entry: IndexEntry, stats: IndexStatistics): boolean {
    if (node.isLeaf) {
      let pos = 0;
      while (pos < node.keys.length && key > node.keys[pos]) pos++;
      if (pos < node.keys.length && node.keys[pos] === key) {
        if (node.values) node.values[pos] = entry;
        return false;
      }
      node.keys.splice(pos, 0, key);
      if (node.values) {
        node.values.splice(pos, 0, entry);
      } else {
        node.values = [entry];
      }
      if (node.keys.length >= this._order) {
        this._splitLeafNode(node, indexName, stats);
      }
      return true;
    }
    let childPos = 0;
    while (childPos < node.keys.length && key > node.keys[childPos]) childPos++;
    const child = node.children[childPos];
    if (!child) return false;
    const result = this._bPlusInsert(child, indexName, key, entry, stats);
    if (child.keys.length >= this._order) {
      this._splitInternalNode(node, childPos, stats);
    }
    return result;
  }

  private _splitLeafNode(node: BPlusTreeNode, indexName: string, stats: IndexStatistics): void {
    const mid = Math.floor(node.keys.length / 2);
    const newNode: BPlusTreeNode = {
      isLeaf: true,
      keys: node.keys.slice(mid),
      children: [],
      values: node.values?.slice(mid),
      next: node.next,
      parent: node.parent
    };
    node.keys = node.keys.slice(0, mid);
    node.values = node.values?.slice(0, mid);
    node.next = newNode;
    if (!node.parent) {
      const newRoot: BPlusTreeNode = {
        isLeaf: false,
        keys: [newNode.keys[0]],
        children: [node, newNode]
      };
      node.parent = newRoot;
      newNode.parent = newRoot;
      this._bPlusTreeRoots.set(indexName, newRoot);
      if (stats.height) stats.height++;
    }
  }

  private _splitInternalNode(parent: BPlusTreeNode, childPos: number, stats: IndexStatistics): void {
    const child = parent.children[childPos];
    const mid = Math.floor(child.keys.length / 2);
    const midKey = child.keys[mid];
    const newNode: BPlusTreeNode = {
      isLeaf: false,
      keys: child.keys.slice(mid + 1),
      children: child.children.slice(mid + 1),
      parent
    };
    for (const c of newNode.children) {
      c.parent = newNode;
    }
    child.keys = child.keys.slice(0, mid);
    child.children = child.children.slice(0, mid + 1);
    parent.keys.splice(childPos, 0, midKey);
    parent.children.splice(childPos + 1, 0, newNode);
  }

  bPlusTreeSearch(indexName: string, key: string): IndexQueryResult {
    const startTime = Date.now();
    const root = this._bPlusTreeRoots.get(indexName);
    const stats = this._indexStats.get(indexName);
    this._totalLookups++;
    this._lastIndexName = indexName;
    this._lastQuery = { indexName, query: key };
    if (!root || !stats) {
      const result: IndexQueryResult = { found: false, scanCount: 0, executionTime: Date.now() - startTime, indexUsed: indexName };
      this._lastResult = result;
      return result;
    }
    stats.accessCount++;
    let node = root;
    let scanCount = 0;
    while (!node.isLeaf) {
      let pos = 0;
      while (pos < node.keys.length && key >= node.keys[pos]) pos++;
      node = node.children[pos];
      scanCount++;
    }
    const pos = node.keys.indexOf(key);
    const found = pos !== -1;
    if (found) this._totalHits++;
    const result: IndexQueryResult = {
      found,
      value: found && node.values ? (node.values[pos] as IndexEntry).value : undefined,
      position: found && node.values ? (node.values[pos] as IndexEntry).position : undefined,
      scanCount,
      executionTime: Date.now() - startTime,
      indexUsed: indexName
    };
    this._lastResult = result;
    return result;
  }

  bPlusTreeRangeSearch(indexName: string, startKey: string, endKey: string): RangeQueryResult {
    const startTime = Date.now();
    const root = this._bPlusTreeRoots.get(indexName);
    const stats = this._indexStats.get(indexName);
    const results: IndexEntry[] = [];
    let scanCount = 0;
    this._totalLookups++;
    this._lastIndexName = indexName;
    this._lastQuery = { indexName, query: `RANGE(${startKey}, ${endKey})` };
    if (!root || !stats) {
      const result: RangeQueryResult = { results, count: 0, scanCount: 0, executionTime: Date.now() - startTime };
      this._lastResult = result;
      return result;
    }
    stats.accessCount++;
    let node = root;
    while (!node.isLeaf) {
      let pos = 0;
      while (pos < node.keys.length && startKey >= node.keys[pos]) pos++;
      node = node.children[pos];
      scanCount++;
    }
    while (node) {
      for (let i = 0; i < node.keys.length; i++) {
        if (node.keys[i] > endKey) break;
        if (node.keys[i] >= startKey && node.values) {
          results.push(node.values[i] as IndexEntry);
        }
        scanCount++;
      }
      if (node.keys[node.keys.length - 1] > endKey) break;
      node = node.next;
    }
    if (results.length > 0) this._totalHits++;
    const result: RangeQueryResult = {
      results,
      count: results.length,
      scanCount,
      executionTime: Date.now() - startTime
    };
    this._lastResult = result;
    return result;
  }

  hashInsert(indexName: string, key: string, value: unknown, position: number): boolean {
    const buckets = this._hashIndexes.get(indexName);
    const stats = this._indexStats.get(indexName);
    if (!buckets || !stats) return false;
    this._totalOperations++;
    stats.accessCount++;
    const hash = this._simpleHash(key);
    const bucketIndex = hash % this._hashSize;
    const entry: IndexEntry = { key, value, position, timestamp: Date.now() };
    let bucket = buckets[bucketIndex];
    let current = bucket;
    while (current) {
      for (const e of current.entries) {
        if (e.key === key) {
          e.value = value;
          e.position = position;
          e.timestamp = Date.now();
          return false;
        }
      }
      if (!current.overflow) break;
      current = current.overflow;
    }
    if (bucket.entries.length < 10) {
      bucket.entries.push(entry);
    } else {
      current.overflow = { entries: [entry] };
    }
    stats.entryCount++;
    stats.size += 64;
    stats.uniqueKeys = stats.entryCount;
    const totalEntries = buckets.reduce((sum, b) => {
      let count = b.entries.length;
      let ov = b.overflow;
      while (ov) { count += ov.entries.length; ov = ov.overflow; }
      return sum + count;
    }, 0);
    stats.loadFactor = totalEntries / (this._hashSize * 10);
    return true;
  }

  hashSearch(indexName: string, key: string): IndexQueryResult {
    const startTime = Date.now();
    const buckets = this._hashIndexes.get(indexName);
    const stats = this._indexStats.get(indexName);
    this._totalLookups++;
    this._lastIndexName = indexName;
    this._lastQuery = { indexName, query: key };
    if (!buckets || !stats) {
      const result: IndexQueryResult = { found: false, scanCount: 0, executionTime: Date.now() - startTime, indexUsed: indexName };
      this._lastResult = result;
      return result;
    }
    stats.accessCount++;
    const hash = this._simpleHash(key);
    const bucketIndex = hash % this._hashSize;
    let bucket = buckets[bucketIndex];
    let scanCount = 0;
    while (bucket) {
      for (const entry of bucket.entries) {
        scanCount++;
        if (entry.key === key) {
          this._totalHits++;
          const result: IndexQueryResult = {
            found: true,
            value: entry.value,
            position: entry.position,
            scanCount,
            executionTime: Date.now() - startTime,
            indexUsed: indexName
          };
          this._lastResult = result;
          return result;
        }
      }
      bucket = bucket.overflow;
    }
    const result: IndexQueryResult = {
      found: false,
      scanCount,
      executionTime: Date.now() - startTime,
      indexUsed: indexName
    };
    this._lastResult = result;
    return result;
  }

  private _simpleHash(key: string): number {
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  fullTextInsert(indexName: string, documentId: string, content: string): boolean {
    const index = this._fullTextIndexes.get(indexName);
    const stats = this._indexStats.get(indexName);
    if (!index || !stats) return false;
    this._totalOperations++;
    stats.accessCount++;
    const terms = this._tokenizeText(content);
    const termFreq = new Map<string, number>();
    for (const term of terms) {
      termFreq.set(term, (termFreq.get(term) || 0) + 1);
    }
    for (const [term, freq] of termFreq) {
      if (!index.has(term)) {
        index.set(term, {
          term,
          documentIds: new Set(),
          termFrequency: new Map(),
          idf: 0
        });
        stats.uniqueKeys++;
      }
      const entry = index.get(term)!;
      entry.documentIds.add(documentId);
      entry.termFrequency.set(documentId, freq);
      stats.entryCount++;
      stats.size += term.length * 2 + 32;
    }
    const totalDocs = this._estimateTotalDocuments(index);
    for (const entry of index.values()) {
      entry.idf = Math.log((totalDocs + 1) / (entry.documentIds.size + 1)) + 1;
    }
    return true;
  }

  fullTextSearch(indexName: string, query: string, topK: number = 10): { documentId: string; score: number }[] {
    const index = this._fullTextIndexes.get(indexName);
    const stats = this._indexStats.get(indexName);
    this._totalLookups++;
    this._lastIndexName = indexName;
    this._lastQuery = { indexName, query: `FULLTEXT(${query})` };
    if (!index || !stats) {
      this._lastResult = { results: [], count: 0, scanCount: 0, executionTime: 0 } as RangeQueryResult;
      return [];
    }
    const startTime = Date.now();
    stats.accessCount++;
    const queryTerms = this._tokenizeText(query);
    const scores = new Map<string, number>();
    let scanCount = 0;
    for (const term of queryTerms) {
      const entry = index.get(term);
      if (!entry) continue;
      scanCount += entry.documentIds.size;
      const idf = entry.idf;
      for (const docId of entry.documentIds) {
        const tf = entry.termFrequency.get(docId) || 0;
        const tfidf = tf * idf;
        scores.set(docId, (scores.get(docId) || 0) + tfidf);
      }
    }
    const results = Array.from(scores.entries())
      .map(([documentId, score]) => ({ documentId, score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
    if (results.length > 0) this._totalHits++;
    this._lastResult = {
      results: results.map((r, i) => ({ key: r.documentId, value: r.score, position: i, timestamp: Date.now() })),
      count: results.length,
      scanCount,
      executionTime: Date.now() - startTime
    } as RangeQueryResult;
    return results;
  }

  private _tokenizeText(text: string): string[] {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2);
  }

  private _estimateTotalDocuments(index: Map<string, FullTextIndexEntry>): number {
    const allDocs = new Set<string>();
    for (const entry of index.values()) {
      for (const docId of entry.documentIds) {
        allDocs.add(docId);
      }
    }
    return allDocs.size;
  }

  bitmapInsert(indexName: string, key: string, rowId: number): boolean {
    const index = this._bitmapIndexes.get(indexName);
    const stats = this._indexStats.get(indexName);
    if (!index || !stats) return false;
    this._totalOperations++;
    stats.accessCount++;
    if (!index.has(key)) {
      const bitmap = new Uint8Array(Math.ceil(10000 / 8));
      index.set(key, { key, bitmap, cardinality: 0 });
      stats.uniqueKeys++;
    }
    const entry = index.get(key)!;
    const byteIndex = Math.floor(rowId / 8);
    const bitIndex = rowId % 8;
    if (byteIndex >= entry.bitmap.length) {
      const newBitmap = new Uint8Array(Math.max(entry.bitmap.length * 2, byteIndex + 1));
      newBitmap.set(entry.bitmap);
      entry.bitmap = newBitmap;
    }
    const before = entry.bitmap[byteIndex];
    entry.bitmap[byteIndex] |= (1 << bitIndex);
    if (before !== entry.bitmap[byteIndex]) {
      entry.cardinality++;
      stats.entryCount++;
      stats.size += entry.bitmap.length;
    }
    return true;
  }

  bitmapQuery(indexName: string, key: string): number[] {
    const index = this._bitmapIndexes.get(indexName);
    const stats = this._indexStats.get(indexName);
    this._totalLookups++;
    this._lastIndexName = indexName;
    this._lastQuery = { indexName, query: `BITMAP(${key})` };
    const results: number[] = [];
    if (!index || !stats) {
      this._lastResult = { results: [], count: 0, scanCount: 0, executionTime: 0 } as RangeQueryResult;
      return results;
    }
    const startTime = Date.now();
    stats.accessCount++;
    const entry = index.get(key);
    if (!entry) {
      this._lastResult = {
        results: [],
        count: 0,
        scanCount: 0,
        executionTime: Date.now() - startTime
      } as RangeQueryResult;
      return results;
    }
    let scanCount = 0;
    for (let i = 0; i < entry.bitmap.length; i++) {
      const byte = entry.bitmap[i];
      if (byte === 0) continue;
      for (let bit = 0; bit < 8; bit++) {
        scanCount++;
        if (byte & (1 << bit)) {
          results.push(i * 8 + bit);
        }
      }
    }
    if (results.length > 0) this._totalHits++;
    this._lastResult = {
      results: results.map((pos, i) => ({ key, value: pos, position: i, timestamp: Date.now() })),
      count: results.length,
      scanCount,
      executionTime: Date.now() - startTime
    } as RangeQueryResult;
    return results;
  }

  bitmapAND(indexName: string, keys: string[]): number[] {
    const index = this._bitmapIndexes.get(indexName);
    if (!index || keys.length === 0) return [];
    let resultBitmap: Uint8Array | null = null;
    for (const key of keys) {
      const entry = index.get(key);
      if (!entry) return [];
      if (!resultBitmap) {
        resultBitmap = new Uint8Array(entry.bitmap.length);
        resultBitmap.set(entry.bitmap);
      } else {
        const len = Math.min(resultBitmap.length, entry.bitmap.length);
        for (let i = 0; i < len; i++) {
          resultBitmap[i] &= entry.bitmap[i];
        }
        for (let i = len; i < resultBitmap.length; i++) {
          resultBitmap[i] = 0;
        }
      }
    }
    const results: number[] = [];
    if (resultBitmap) {
      for (let i = 0; i < resultBitmap.length; i++) {
        const byte = resultBitmap[i];
        for (let bit = 0; bit < 8; bit++) {
          if (byte & (1 << bit)) {
            results.push(i * 8 + bit);
          }
        }
      }
    }
    return results;
  }

  getIndexStats(name: string): IndexStatistics | undefined {
    return this._indexStats.get(name);
  }

  listIndexes(): string[] {
    return Array.from(this._indexes.keys());
  }

  rebuildIndex(name: string): boolean {
    const type = this._indexes.get(name);
    if (!type) return false;
    this.dropIndex(name);
    return this.createIndex(name, type);
  }

  calculateCardinality(indexName: string): number {
    const stats = this._indexStats.get(indexName);
    return stats ? stats.uniqueKeys : 0;
  }

  getIndexType(name: string): IndexType | undefined {
    return this._indexes.get(name);
  }

  toPacket(): DataPacket<DatabaseIndexState> {
    const state: DatabaseIndexState = {
      indexes: this._indexStats,
      totalIndexes: this._indexes.size,
      totalOperations: this._totalOperations,
      lastQuery: this._lastQuery || undefined,
      lastResult: this._lastResult || undefined
    };
    this._counter++;
    return {
      id: `db-index-${Date.now()}-${this._counter}`,
      payload: state,
      metadata: {
        createdAt: Date.now(),
        route: ['database', 'index'],
        priority: 1,
        phase: 'data-indexing'
      }
    };
  }

  reset(): void {
    this._indexes.clear();
    this._bPlusTreeRoots.clear();
    this._hashIndexes.clear();
    this._fullTextIndexes.clear();
    this._bitmapIndexes.clear();
    this._indexStats.clear();
    this._totalOperations = 0;
    this._totalLookups = 0;
    this._totalHits = 0;
    this._counter = 0;
    this._lastIndexName = null;
    this._lastQuery = null;
    this._lastResult = null;
    this._initializeDefaultIndexes();
  }
}
