import { DataPacket, PacketMeta } from '../shared/types';

export interface DataGovernance {
  policies: string[];
  quality: Record<string, number>;
  security: string[];
  catalog: string;
}

export interface DataQualityRule {
  name: string;
  dimension: string;
  threshold: number;
  status: string;
}

export class DataGovernance {
  private _governance: Map<string, DataGovernance> = new Map();
  private _rules: DataQualityRule[] = [];
  private _counter = 0;

  dataQuality(dataset: string, rules: DataQualityRule[]): { dataset: string; score: number; rules: DataQualityRule[] } {
    let score = 0;
    for (const rule of rules) {
      score += rule.threshold;
    }
    score = rules.length > 0 ? score / rules.length : 0;
    this._rules.push(...rules);
    return { dataset, score, rules };
  }

  completeness(data: Record<string, unknown>[]): number {
    const columns = data.length > 0 ? Object.keys(data[0]) : [];
    const total = data.length * columns.length;
    let complete = 0;
    for (const row of data) {
      for (const col of columns) {
        if (row[col] !== null && row[col] !== undefined) complete++;
      }
    }
    return total > 0 ? complete / total : 1;
  }

  accuracy(data: Record<string, unknown>[], reference: Record<string, unknown>[]): number {
    if (data.length === 0 || reference.length === 0) return 0;
    let correct = 0;
    const n = Math.min(data.length, reference.length);
    const cols = Object.keys(data[0] || {});
    for (let i = 0; i < n; i++) {
      for (const col of cols) {
        if (data[i][col] === reference[i][col]) correct++;
      }
    }
    const total = n * cols.length;
    return total > 0 ? correct / total : 0;
  }

  consistency(datasets: Record<string, unknown>[][], relations: string[]): number {
    if (datasets.length < 2) return 1;
    let consistent = 0;
    let total = 0;
    for (let i = 0; i < Math.min(datasets[0].length, datasets[1].length); i++) {
      for (const rel of relations) {
        total++;
        if (datasets[0][i][rel] === datasets[1][i][rel]) consistent++;
      }
    }
    return total > 0 ? consistent / total : 1;
  }

  timeliness(data: Record<string, unknown>[], freshness: number): number {
    const now = Date.now();
    let fresh = 0;
    for (const row of data) {
      const ts = Number(row['timestamp'] || row['updated_at'] || now);
      if (now - ts < freshness) fresh++;
    }
    return data.length > 0 ? fresh / data.length : 1;
  }

  uniqueness(data: Record<string, unknown>[], keys: string[]): number {
    const seen = new Set<string>();
    let unique = 0;
    for (const row of data) {
      const key = keys.map(k => row[k]).join('|');
      if (!seen.has(key)) {
        seen.add(key);
        unique++;
      }
    }
    return data.length > 0 ? unique / data.length : 1;
  }

  validity(data: Record<string, unknown>[], rules: Record<string, (v: unknown) => boolean>): number {
    const columns = Object.keys(rules);
    let valid = 0;
    let total = 0;
    for (const row of data) {
      for (const col of columns) {
        total++;
        if (rules[col](row[col])) valid++;
      }
    }
    return total > 0 ? valid / total : 1;
  }

  integrity(data: Record<string, unknown>[], constraints: Record<string, string[]>): number {
    let valid = 0;
    let total = 0;
    for (const row of data) {
      for (const [field, constraint] of Object.entries(constraints)) {
        total++;
        const val = row[field];
        let ok = true;
        for (const c of constraint) {
          if (c === 'not_null' && (val === null || val === undefined)) ok = false;
          if (c === 'unique') { }
        }
        if (ok) valid++;
      }
    }
    return total > 0 ? valid / total : 1;
  }

  dataCatalog(assets: string[], metadata: Record<string, Record<string, unknown>>): { assets: string[]; metadata: Record<string, Record<string, unknown>>; searchable: boolean } {
    return { assets, metadata, searchable: true };
  }

  dataDictionary(tables: string[], columns: Record<string, string[]>): { tables: string[]; columns: Record<string, string[]>; descriptions: Record<string, string> } {
    const descriptions: Record<string, string> = {};
    for (const t of tables) descriptions[t] = `Description for ${t}`;
    return { tables, columns, descriptions };
  }

  dataLineage(source: string, target: string, transformations: string[]): { source: string; target: string; transformations: string[]; depth: number } {
    return { source, target, transformations, depth: transformations.length };
  }

  masterData(domains: string[]): { domains: string[]; entities: Record<string, number>; goldenRecords: number } {
    const entities: Record<string, number> = {};
    let total = 0;
    for (const d of domains) {
      entities[d] = 100 + Math.floor(Math.random() * 1000);
      total += entities[d];
    }
    return { domains, entities, goldenRecords: Math.floor(total * 0.8) };
  }

  dataClassification(data: Record<string, unknown>[], sensitivity: string): { sensitivity: string; classified: number; total: number } {
    return { sensitivity, classified: data.length, total: data.length };
  }

  accessControl(datasets: string[], roles: Record<string, string[]>): { datasets: string[]; roles: Record<string, string[]>; permissions: number } {
    let perms = 0;
    for (const rolePerms of Object.values(roles)) perms += rolePerms.length;
    return { datasets, roles, permissions: perms };
  }

  toPacket(): DataPacket<{
    governance: Map<string, DataGovernance>;
    rules: DataQualityRule[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['big_data', 'DataGovernance'],
      priority: 1,
      phase: 'data_governance',
    };
    return {
      id: `data-governance-${Date.now().toString(36)}`,
      payload: {
        governance: this._governance,
        rules: this._rules,
      },
      metadata,
    };
  }

  reset(): void {
    this._governance = new Map();
    this._rules = [];
    this._counter = 0;
  }

  get governanceCount(): number { return this._governance.size; }
  get ruleCount(): number { return this._rules.length; }
}
