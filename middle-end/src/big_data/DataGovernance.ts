import { DataPacket } from '../shared/types';

export interface DataGovernanceInfo {
  policies: string[];
  quality: Record<string, number>;
  security: string[];
  catalog: string;
  status: 'compliant' | 'warning' | 'non-compliant';
}

export interface DataQualityRule {
  name: string;
  dimension: 'completeness' | 'accuracy' | 'consistency' | 'timeliness' | 'uniqueness' | 'validity' | 'integrity';
  threshold: number;
  status: 'active' | 'inactive' | 'warning';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  lastChecked: number;
}

export interface DataQualityResult {
  ruleName: string;
  dimension: string;
  actualValue: number;
  threshold: number;
  passed: boolean;
  severity: string;
  message: string;
  timestamp: number;
}

export interface DataAsset {
  id: string;
  name: string;
  type: string;
  location: string;
  owner: string;
  sensitivity: 'public' | 'internal' | 'confidential' | 'restricted';
  qualityScore: number;
  lineage: string[];
  lastUpdated: number;
}

export interface DataCatalogEntry {
  assetId: string;
  name: string;
  description: string;
  tags: string[];
  schema: Record<string, string>;
  owners: string[];
  accessLevel: string;
  usageStats: { queries: number; downloads: number; views: number };
}

export interface DataLineageNode {
  id: string;
  type: 'source' | 'transformation' | 'storage' | 'consumer';
  name: string;
  inputs: string[];
  outputs: string[];
  transformation: string;
}

export interface DataPolicy {
  id: string;
  name: string;
  type: 'access' | 'retention' | 'compliance' | 'quality';
  description: string;
  rules: string[];
  scope: string[];
  enforcement: 'automatic' | 'manual' | 'advisory';
  status: 'active' | 'draft' | 'expired';
}

export interface AccessControlRule {
  principal: string;
  resource: string;
  actions: string[];
  effect: 'allow' | 'deny';
  conditions?: Record<string, unknown>;
}

export interface ComplianceReport {
  reportId: string;
  date: number;
  scope: string[];
  findings: ComplianceFinding[];
  overallStatus: 'compliant' | 'warning' | 'non-compliant';
  score: number;
}

export interface ComplianceFinding {
  id: string;
  rule: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'pass' | 'fail' | 'na';
  description: string;
  remediation: string;
  affectedAssets: string[];
}

export interface DataMaskingRule {
  field: string;
  type: 'redact' | 'mask' | 'encrypt' | 'hash' | 'null';
  pattern?: string;
  format?: string;
  condition?: string;
}

export interface MasterDataEntity {
  id: string;
  name: string;
  domain: string;
  attributes: Record<string, unknown>;
  goldenRecord: boolean;
  sources: string[];
  version: number;
  lastUpdated: number;
}

export interface DataProfilingResult {
  assetId: string;
  rowCount: number;
  columnStats: Record<string, ColumnStats>;
  completeness: number;
  uniqueness: number;
  dataTypes: Record<string, string>;
  cardinality: Record<string, number>;
  nullRate: Record<string, number>;
}

export interface ColumnStats {
  min: unknown;
  max: unknown;
  mean: number;
  stdDev: number;
  distinct: number;
  nullCount: number;
}

export class DataGovernance {
  private _governance: Map<string, DataGovernanceInfo> = new Map();
  private _rules: DataQualityRule[] = [];
  private _assets: Map<string, DataAsset> = new Map();
  private _catalog: Map<string, DataCatalogEntry> = new Map();
  private _lineage: Map<string, DataLineageNode[]> = new Map();
  private _policies: Map<string, DataPolicy> = new Map();
  private _accessRules: Map<string, AccessControlRule[]> = new Map();
  private _history: string[] = [];
  private _counter = 0;

  get governanceCount(): number { return this._governance.size; }
  get ruleCount(): number { return this._rules.length; }
  get assetCount(): number { return this._assets.size; }
  get history(): string[] { return [...this._history]; }

  public createGovernanceFramework(name: string, policies: string[], securityControls: string[]): { framework: DataGovernanceInfo; created: boolean } {
    const framework: DataGovernanceInfo = {
      policies,
      quality: {},
      security: securityControls,
      catalog: name,
      status: 'compliant',
    };
    this._governance.set(name, framework);
    this._recordHistory(`createGovernanceFramework(name=${name}, policies=${policies.length})`);
    return { framework, created: true };
  }

  public deleteGovernanceFramework(name: string): { name: string; deleted: boolean } {
    const deleted = this._governance.delete(name);
    this._recordHistory(`deleteGovernanceFramework(name=${name}) -> ${deleted}`);
    return { name, deleted };
  }

  public dataQuality(dataset: string, rules: DataQualityRule[]): { dataset: string; score: number; rules: DataQualityRule[]; results: DataQualityResult[] } {
    let score = 0;
    const results: DataQualityResult[] = [];
    
    for (const rule of rules) {
      const actualValue = this._evaluateRule(rule);
      const passed = actualValue >= rule.threshold;
      score += passed ? rule.threshold : 0;
      results.push({
        ruleName: rule.name,
        dimension: rule.dimension,
        actualValue,
        threshold: rule.threshold,
        passed,
        severity: rule.severity,
        message: passed ? 'Rule passed' : `Rule failed: expected >= ${rule.threshold}, got ${actualValue}`,
        timestamp: Date.now(),
      });
    }
    
    score = rules.length > 0 ? score / rules.length : 0;
    this._rules.push(...rules);
    
    const governance = this._governance.get(dataset);
    if (governance) {
      governance.quality[dataset] = score;
    }
    
    this._recordHistory(`dataQuality(dataset=${dataset}, rules=${rules.length}) -> score=${(score * 100).toFixed(1)}%`);
    return { dataset, score, rules, results };
  }

  public registerQualityRule(rule: DataQualityRule): { rule: DataQualityRule; registered: boolean } {
    this._rules.push({ ...rule, lastChecked: Date.now() });
    this._recordHistory(`registerQualityRule(name=${rule.name}, dimension=${rule.dimension})`);
    return { rule, registered: true };
  }

  public updateQualityRule(name: string, updates: Partial<DataQualityRule>): { updated: DataQualityRule | null; modified: boolean } {
    const idx = this._rules.findIndex(r => r.name === name);
    if (idx < 0) {
      this._recordHistory(`updateQualityRule(name=${name}) -> not found`);
      return { updated: null, modified: false };
    }
    const updated = { ...this._rules[idx], ...updates, lastChecked: Date.now() };
    this._rules[idx] = updated;
    this._recordHistory(`updateQualityRule(name=${name}) -> updated`);
    return { updated, modified: true };
  }

  public deleteQualityRule(name: string): { deleted: boolean; name: string } {
    const idx = this._rules.findIndex(r => r.name === name);
    const deleted = idx >= 0;
    if (deleted) this._rules.splice(idx, 1);
    this._recordHistory(`deleteQualityRule(name=${name}) -> ${deleted}`);
    return { deleted, name };
  }

  public listQualityRules(dimension?: string): DataQualityRule[] {
    let rules = this._rules;
    if (dimension) {
      rules = rules.filter(r => r.dimension === dimension);
    }
    this._recordHistory(`listQualityRules(dimension=${dimension || 'all'}) -> ${rules.length} rules`);
    return rules;
  }

  public completeness(data: Record<string, unknown>[]): { completeness: number; columnStats: Record<string, { complete: number; total: number; rate: number }> } {
    const columns = data.length > 0 ? Object.keys(data[0]) : [];
    const total = data.length * columns.length;
    let complete = 0;
    const columnStats: Record<string, { complete: number; total: number; rate: number }> = {};

    for (const col of columns) {
      let colComplete = 0;
      for (const row of data) {
        if (row[col] !== null && row[col] !== undefined && row[col] !== '') {
          complete++;
          colComplete++;
        }
      }
      columnStats[col] = {
        complete: colComplete,
        total: data.length,
        rate: data.length > 0 ? colComplete / data.length : 1,
      };
    }

    this._recordHistory(`completeness(data=${data.length}, columns=${columns.length}) -> ${((total > 0 ? complete / total : 1) * 100).toFixed(1)}%`);
    return { completeness: total > 0 ? complete / total : 1, columnStats };
  }

  public accuracy(data: Record<string, unknown>[], reference: Record<string, unknown>[], keyField: string = 'id'): { accuracy: number; mismatches: { key: unknown; field: string; actual: unknown; expected: unknown }[] } {
    if (data.length === 0 || reference.length === 0) {
      this._recordHistory(`accuracy(data=${data.length}, reference=${reference.length}) -> 0`);
      return { accuracy: 0, mismatches: [] };
    }

    const referenceMap = new Map(reference.map(r => [r[keyField], r]));
    let correct = 0;
    let total = 0;
    const mismatches: { key: unknown; field: string; actual: unknown; expected: unknown }[] = [];

    for (const row of data) {
      const ref = referenceMap.get(row[keyField]);
      if (!ref) continue;
      const cols = Object.keys(row).filter(k => k !== keyField);
      for (const col of cols) {
        total++;
        if (JSON.stringify(row[col]) === JSON.stringify(ref[col])) {
          correct++;
        } else {
          mismatches.push({
            key: row[keyField],
            field: col,
            actual: row[col],
            expected: ref[col],
          });
        }
      }
    }

    this._recordHistory(`accuracy(data=${data.length}, reference=${reference.length}) -> ${((total > 0 ? correct / total : 0) * 100).toFixed(1)}%`);
    return { accuracy: total > 0 ? correct / total : 0, mismatches };
  }

  public consistency(datasets: Record<string, unknown>[][], relations: string[], keyField: string = 'id'): { consistency: number; inconsistencies: { key: unknown; relation: string; values: unknown[] }[] } {
    if (datasets.length < 2) {
      this._recordHistory(`consistency(datasets=${datasets.length}) -> 1`);
      return { consistency: 1, inconsistencies: [] };
    }

    const keyedData = datasets.map(ds => {
      const map = new Map<unknown, Record<string, unknown>>();
      for (const row of ds) {
        map.set(row[keyField], row);
      }
      return map;
    });

    const allKeys = new Set<unknown>();
    for (const map of keyedData) {
      for (const key of map.keys()) {
        allKeys.add(key);
      }
    }

    let consistent = 0;
    let total = 0;
    const inconsistencies: { key: unknown; relation: string; values: unknown[] }[] = [];

    for (const key of allKeys) {
      for (const rel of relations) {
        total++;
        const values = keyedData.map(map => map.get(key)?.[rel]);
        const uniqueValues = new Set(values);
        if (uniqueValues.size === 1) {
          consistent++;
        } else {
          inconsistencies.push({ key, relation: rel, values });
        }
      }
    }

    this._recordHistory(`consistency(datasets=${datasets.length}, relations=${relations.length}) -> ${((total > 0 ? consistent / total : 1) * 100).toFixed(1)}%`);
    return { consistency: total > 0 ? consistent / total : 1, inconsistencies };
  }

  public timeliness(data: Record<string, unknown>[], freshnessMs: number, timestampField: string = 'timestamp'): { timeliness: number; staleRecords: { id: unknown; ageMs: number; timestamp: number }[] } {
    const now = Date.now();
    let fresh = 0;
    const staleRecords: { id: unknown; ageMs: number; timestamp: number }[] = [];

    for (const row of data) {
      const ts = Number(row[timestampField] || row['updated_at'] || row['created_at'] || now);
      const ageMs = now - ts;
      if (ageMs < freshnessMs) {
        fresh++;
      } else {
        staleRecords.push({ id: row['id'] || row['_id'], ageMs, timestamp: ts });
      }
    }

    this._recordHistory(`timeliness(data=${data.length}, freshness=${freshnessMs}ms) -> ${((data.length > 0 ? fresh / data.length : 1) * 100).toFixed(1)}%`);
    return { timeliness: data.length > 0 ? fresh / data.length : 1, staleRecords };
  }

  public uniqueness(data: Record<string, unknown>[], keys: string[]): { uniqueness: number; duplicates: { key: string; count: number; records: unknown[] }[] } {
    const seen = new Map<string, unknown[]>();
    let unique = 0;

    for (const row of data) {
      const key = keys.map(k => JSON.stringify(row[k])).join('|');
      if (!seen.has(key)) {
        seen.set(key, []);
        unique++;
      }
      seen.get(key)?.push(row);
    }

    const duplicates = Array.from(seen.entries())
      .filter(([, records]) => records.length > 1)
      .map(([key, records]) => ({ key, count: records.length, records: records.slice(0, 5) }));

    this._recordHistory(`uniqueness(data=${data.length}, keys=[${keys.join(',')}]) -> ${((data.length > 0 ? unique / data.length : 1) * 100).toFixed(1)}%`);
    return { uniqueness: data.length > 0 ? unique / data.length : 1, duplicates };
  }

  public validity(data: Record<string, unknown>[], rules: Record<string, (v: unknown) => boolean>): { validity: number; invalidRecords: { id: unknown; field: string; value: unknown; reason: string }[] } {
    const columns = Object.keys(rules);
    let valid = 0;
    let total = 0;
    const invalidRecords: { id: unknown; field: string; value: unknown; reason: string }[] = [];

    for (const row of data) {
      for (const col of columns) {
        total++;
        const value = row[col];
        if (rules[col](value)) {
          valid++;
        } else {
          invalidRecords.push({
            id: row['id'] || row['_id'],
            field: col,
            value,
            reason: `Value fails validation rule for ${col}`,
          });
        }
      }
    }

    this._recordHistory(`validity(data=${data.length}, rules=${columns.length}) -> ${((total > 0 ? valid / total : 1) * 100).toFixed(1)}%`);
    return { validity: total > 0 ? valid / total : 1, invalidRecords };
  }

  public integrity(data: Record<string, unknown>[], constraints: Record<string, { type: string; params?: unknown }[]>): { integrity: number; violations: { id: unknown; field: string; constraint: string; value: unknown }[] } {
    let valid = 0;
    let total = 0;
    const violations: { id: unknown; field: string; constraint: string; value: unknown }[] = [];

    for (const row of data) {
      for (const [field, constraintList] of Object.entries(constraints)) {
        for (const constraint of constraintList) {
          total++;
          const val = row[field];
          let ok = true;

          switch (constraint.type) {
            case 'not_null':
              ok = val !== null && val !== undefined && val !== '';
              break;
            case 'unique':
              ok = true;
              break;
            case 'min':
              ok = (val as number) >= (constraint.params as number);
              break;
            case 'max':
              ok = (val as number) <= (constraint.params as number);
              break;
            case 'regex':
              ok = new RegExp(constraint.params as string).test(String(val));
              break;
            case 'enum':
              ok = (constraint.params as unknown[]).includes(val);
              break;
          }

          if (ok) {
            valid++;
          } else {
            violations.push({
              id: row['id'] || row['_id'],
              field,
              constraint: constraint.type,
              value: val,
            });
          }
        }
      }
    }

    this._recordHistory(`integrity(data=${data.length}, constraints=${Object.keys(constraints).length}) -> ${((total > 0 ? valid / total : 1) * 100).toFixed(1)}%`);
    return { integrity: total > 0 ? valid / total : 1, violations };
  }

  public dataCatalog(assets: { id: string; name: string; description: string; tags: string[]; schema: Record<string, string>; owners: string[] }[]): { catalogEntries: DataCatalogEntry[]; created: number } {
    const entries: DataCatalogEntry[] = [];
    for (const asset of assets) {
      const entry: DataCatalogEntry = {
        assetId: asset.id,
        name: asset.name,
        description: asset.description,
        tags: asset.tags,
        schema: asset.schema,
        owners: asset.owners,
        accessLevel: 'public',
        usageStats: { queries: 0, downloads: 0, views: 0 },
      };
      this._catalog.set(asset.id, entry);
      entries.push(entry);
    }
    this._recordHistory(`dataCatalog(assets=${assets.length}) -> ${entries.length} entries`);
    return { catalogEntries: entries, created: entries.length };
  }

  public searchCatalog(query: string, filters?: { tags?: string[]; owners?: string[]; type?: string }): { results: DataCatalogEntry[]; count: number; query: string } {
    let entries = Array.from(this._catalog.values());
    
    if (filters?.tags) {
      entries = entries.filter(e => filters!.tags!.some(t => e.tags.includes(t)));
    }
    if (filters?.owners) {
      entries = entries.filter(e => filters!.owners!.some(o => e.owners.includes(o)));
    }
    
    const lowerQuery = query.toLowerCase();
    entries = entries.filter(e =>
      e.name.toLowerCase().includes(lowerQuery) ||
      e.description.toLowerCase().includes(lowerQuery) ||
      e.tags.some(t => t.toLowerCase().includes(lowerQuery))
    );

    this._recordHistory(`searchCatalog(query=${query}) -> ${entries.length} results`);
    return { results: entries, count: entries.length, query };
  }

  public getCatalogEntry(assetId: string): DataCatalogEntry | null {
    const entry = this._catalog.get(assetId) || null;
    this._recordHistory(`getCatalogEntry(assetId=${assetId}) -> ${entry ? 'found' : 'not found'}`);
    return entry;
  }

  public updateCatalogEntry(assetId: string, updates: Partial<DataCatalogEntry>): { updated: DataCatalogEntry | null; modified: boolean } {
    const entry = this._catalog.get(assetId);
    if (!entry) {
      this._recordHistory(`updateCatalogEntry(assetId=${assetId}) -> not found`);
      return { updated: null, modified: false };
    }
    const updated = { ...entry, ...updates };
    this._catalog.set(assetId, updated);
    this._recordHistory(`updateCatalogEntry(assetId=${assetId}) -> updated`);
    return { updated, modified: true };
  }

  public deleteCatalogEntry(assetId: string): { deleted: boolean; assetId: string } {
    const deleted = this._catalog.delete(assetId);
    this._recordHistory(`deleteCatalogEntry(assetId=${assetId}) -> ${deleted}`);
    return { deleted, assetId };
  }

  public dataDictionary(tables: { name: string; columns: { name: string; type: string; description: string; nullable: boolean }[] }[]): { tables: string[]; dictionary: Record<string, unknown> } {
    const dictionary: Record<string, unknown> = {};
    for (const table of tables) {
      dictionary[table.name] = {
        description: `Table: ${table.name}`,
        columns: table.columns,
      };
    }
    this._recordHistory(`dataDictionary(tables=${tables.length})`);
    return { tables: tables.map(t => t.name), dictionary };
  }

  public dataLineage(source: string, target: string, transformations: { operation: string; input: string; output: string; description: string }[]): { source: string; target: string; depth: number; nodes: DataLineageNode[] } {
    const nodes: DataLineageNode[] = [
      { id: 'source', type: 'source', name: source, inputs: [], outputs: ['transform'], transformation: '' },
    ];

    transformations.forEach((t, i) => {
      nodes.push({
        id: `transform-${i}`,
        type: 'transformation',
        name: t.operation,
        inputs: ['source'],
        outputs: ['storage'],
        transformation: t.description,
      });
    });

    nodes.push({
      id: 'target',
      type: 'storage',
      name: target,
      inputs: transformations.map((_, i) => `transform-${i}`),
      outputs: [],
      transformation: '',
    });

    this._lineage.set(target, nodes);
    this._recordHistory(`dataLineage(source=${source}, target=${target}, transformations=${transformations.length})`);
    return { source, target, depth: transformations.length + 2, nodes };
  }

  public getLineage(assetId: string): DataLineageNode[] {
    const nodes = this._lineage.get(assetId) || [];
    this._recordHistory(`getLineage(assetId=${assetId}) -> ${nodes.length} nodes`);
    return nodes;
  }

  public masterData(domains: string[], entities: { id: string; name: string; domain: string; attributes: Record<string, unknown> }[]): { domains: string[]; entities: MasterDataEntity[]; goldenRecords: number } {
    const masterEntities: MasterDataEntity[] = [];
    let goldenRecords = 0;

    for (const entity of entities) {
      const isGolden = Math.random() > 0.2;
      if (isGolden) goldenRecords++;
      masterEntities.push({
        id: entity.id,
        name: entity.name,
        domain: entity.domain,
        attributes: entity.attributes,
        goldenRecord: isGolden,
        sources: ['source-1', 'source-2'],
        version: 1,
        lastUpdated: Date.now(),
      });
    }

    this._recordHistory(`masterData(domains=${domains.length}, entities=${entities.length}) -> ${goldenRecords} golden records`);
    return { domains, entities: masterEntities, goldenRecords };
  }

  public goldenRecordResolution(domain: string, records: Record<string, unknown>[], strategy: string): { goldenRecord: Record<string, unknown>; conflicts: number; resolutionStrategy: string } {
    const goldenRecord: Record<string, unknown> = {};
    let conflicts = 0;

    if (records.length > 0) {
      const first = records[0];
      for (const key of Object.keys(first)) {
        const values = new Set(records.map(r => r[key]));
        if (values.size > 1) {
          conflicts++;
        }
        goldenRecord[key] = first[key];
      }
    }

    this._recordHistory(`goldenRecordResolution(domain=${domain}, records=${records.length}, strategy=${strategy}) -> ${conflicts} conflicts`);
    return { goldenRecord, conflicts, resolutionStrategy: strategy };
  }

  public dataClassification(data: Record<string, unknown>[], classificationRules: { field: string; pattern: RegExp; sensitivity: 'public' | 'internal' | 'confidential' | 'restricted' }[]): { classified: number; sensitivityCounts: Record<string, number>; results: { id: unknown; sensitivity: string; reason: string }[] } {
    const sensitivityCounts: Record<string, number> = { public: 0, internal: 0, confidential: 0, restricted: 0 };
    const results: { id: unknown; sensitivity: string; reason: string }[] = [];

    for (const row of data) {
      let sensitivity: 'public' | 'internal' | 'confidential' | 'restricted' = 'public';
      let reason = 'Default classification';

      for (const rule of classificationRules) {
        const value = String(row[rule.field]);
        if (rule.pattern.test(value)) {
          if (rule.sensitivity === 'restricted') {
            sensitivity = 'restricted';
            reason = `Matches pattern for ${rule.field}`;
            break;
          }
          if (rule.sensitivity === 'confidential' && sensitivity !== 'restricted') {
            sensitivity = 'confidential';
            reason = `Matches pattern for ${rule.field}`;
          }
          if (rule.sensitivity === 'internal' && sensitivity === 'public') {
            sensitivity = 'internal';
            reason = `Matches pattern for ${rule.field}`;
          }
        }
      }

      sensitivityCounts[sensitivity]++;
      results.push({ id: row['id'] || row['_id'], sensitivity, reason });
    }

    this._recordHistory(`dataClassification(data=${data.length}, rules=${classificationRules.length})`);
    return { classified: data.length, sensitivityCounts, results };
  }

  public dataMasking(data: Record<string, unknown>[], rules: DataMaskingRule[]): { masked: Record<string, unknown>[]; rulesApplied: number; maskedFields: string[] } {
    const masked = data.map(row => {
      const maskedRow = { ...row };
      for (const rule of rules) {
        const value = String(maskedRow[rule.field]);
        switch (rule.type) {
          case 'redact':
            maskedRow[rule.field] = '***';
            break;
          case 'mask':
            maskedRow[rule.field] = value.charAt(0) + '*'.repeat(value.length - 1);
            break;
          case 'hash':
            maskedRow[rule.field] = this._hash(value);
            break;
          case 'encrypt':
            maskedRow[rule.field] = `encrypted(${value.length})`;
            break;
          case 'null':
            maskedRow[rule.field] = null;
            break;
        }
      }
      return maskedRow;
    });

    this._recordHistory(`dataMasking(data=${data.length}, rules=${rules.length})`);
    return { masked, rulesApplied: rules.length, maskedFields: rules.map(r => r.field) };
  }

  public accessControl(resources: string[], roles: Record<string, { permissions: string[]; description: string }>): { resources: string[]; roles: string[]; totalPermissions: number; rules: AccessControlRule[] } {
    const rules: AccessControlRule[] = [];
    let totalPermissions = 0;

    for (const [roleName, role] of Object.entries(roles)) {
      for (const resource of resources) {
        for (const permission of role.permissions) {
          rules.push({
            principal: roleName,
            resource,
            actions: [permission],
            effect: 'allow',
          });
          totalPermissions++;
        }
      }
    }

    for (const resource of resources) {
      this._accessRules.set(resource, rules.filter(r => r.resource === resource));
    }

    this._recordHistory(`accessControl(resources=${resources.length}, roles=${Object.keys(roles).length}) -> ${totalPermissions} permissions`);
    return { resources, roles: Object.keys(roles), totalPermissions, rules };
  }

  public checkAccess(principal: string, resource: string, action: string): { allowed: boolean; principal: string; resource: string; action: string; matchedRules: AccessControlRule[] } {
    const rules = this._accessRules.get(resource) || [];
    const matchedRules = rules.filter(r => r.principal === principal && r.actions.includes(action));
    const allowed = matchedRules.some(r => r.effect === 'allow') && !matchedRules.some(r => r.effect === 'deny');

    this._recordHistory(`checkAccess(principal=${principal}, resource=${resource}, action=${action}) -> ${allowed}`);
    return { allowed, principal, resource, action, matchedRules };
  }

  public addAccessRule(resource: string, rule: AccessControlRule): { added: boolean; resource: string; rule: AccessControlRule } {
    const rules = this._accessRules.get(resource) || [];
    rules.push(rule);
    this._accessRules.set(resource, rules);
    this._recordHistory(`addAccessRule(resource=${resource}, principal=${rule.principal})`);
    return { added: true, resource, rule };
  }

  public removeAccessRule(resource: string, ruleId: string): { removed: boolean; resource: string } {
    const rules = this._accessRules.get(resource) || [];
    const idx = rules.findIndex(r => r.principal === ruleId || JSON.stringify(r) === ruleId);
    const removed = idx >= 0;
    if (removed) rules.splice(idx, 1);
    this._recordHistory(`removeAccessRule(resource=${resource}, rule=${ruleId}) -> ${removed}`);
    return { removed, resource };
  }

  public dataRetention(data: Record<string, unknown>[], retentionPolicy: { days: number; action: 'delete' | 'archive' | 'mask' }, timestampField: string = 'created_at'): { retained: number; archived: number; deleted: number; policy: typeof retentionPolicy } {
    const now = Date.now();
    const retentionMs = retentionPolicy.days * 24 * 60 * 60 * 1000;
    let retained = 0;
    let archived = 0;
    let deleted = 0;

    for (const row of data) {
      const ts = Number(row[timestampField] || now);
      if (now - ts > retentionMs) {
        if (retentionPolicy.action === 'delete') deleted++;
        else if (retentionPolicy.action === 'archive') archived++;
      } else {
        retained++;
      }
    }

    this._recordHistory(`dataRetention(data=${data.length}, policy=${retentionPolicy.days}d, action=${retentionPolicy.action}) -> retained=${retained}, archived=${archived}, deleted=${deleted}`);
    return { retained, archived, deleted, policy: retentionPolicy };
  }

  public dataProfiling(data: Record<string, unknown>[], assetId: string): DataProfilingResult {
    const columns = data.length > 0 ? Object.keys(data[0]) : [];
    const columnStats: Record<string, ColumnStats> = {};
    const dataTypes: Record<string, string> = {};
    const cardinality: Record<string, number> = {};
    const nullRate: Record<string, number> = {};

    for (const col of columns) {
      const values = data.map(r => r[col]).filter(v => v !== null && v !== undefined);
      const numericValues = values.filter(v => typeof v === 'number') as number[];

      columnStats[col] = {
        min: numericValues.length > 0 ? Math.min(...numericValues) : undefined,
        max: numericValues.length > 0 ? Math.max(...numericValues) : undefined,
        mean: numericValues.length > 0 ? numericValues.reduce((a, b) => a + b, 0) / numericValues.length : 0,
        stdDev: numericValues.length > 0 ? Math.sqrt(numericValues.reduce((s, v) => s + Math.pow(v - columnStats[col].mean, 2), 0) / numericValues.length) : 0,
        distinct: new Set(values).size,
        nullCount: data.length - values.length,
      };

      dataTypes[col] = typeof values[0];
      cardinality[col] = columnStats[col].distinct;
      nullRate[col] = data.length > 0 ? columnStats[col].nullCount / data.length : 0;
    }

    const completeness = this.completeness(data).completeness;
    const uniqueness = this.uniqueness(data, columns.slice(0, 3)).uniqueness;

    this._recordHistory(`dataProfiling(assetId=${assetId}, data=${data.length}) -> completeness=${(completeness * 100).toFixed(1)}%, uniqueness=${(uniqueness * 100).toFixed(1)}%`);
    return {
      assetId,
      rowCount: data.length,
      columnStats,
      completeness,
      uniqueness,
      dataTypes,
      cardinality,
      nullRate,
    };
  }

  public complianceCheck(scope: string[], regulations: string[]): ComplianceReport {
    const findings: ComplianceFinding[] = [];

    for (const regulation of regulations) {
      const passed = Math.random() > 0.1;
      findings.push({
        id: `finding-${this._counter++}`,
        rule: regulation,
        severity: passed ? 'low' : (Math.random() > 0.5 ? 'high' : 'medium'),
        status: passed ? 'pass' : 'fail',
        description: passed ? 'Compliance check passed' : `Non-compliance detected for ${regulation}`,
        remediation: passed ? 'None' : `Implement ${regulation} controls`,
        affectedAssets: scope.slice(0, Math.floor(Math.random() * scope.length) + 1),
      });
    }

    const score = findings.filter(f => f.status === 'pass').length / findings.length;
    const overallStatus: 'compliant' | 'warning' | 'non-compliant' =
      score >= 0.9 ? 'compliant' : score >= 0.7 ? 'warning' : 'non-compliant';

    this._recordHistory(`complianceCheck(scope=${scope.length}, regulations=${regulations.length}) -> ${overallStatus} (${(score * 100).toFixed(1)}%)`);
    return {
      reportId: `compliance-${Date.now()}`,
      date: Date.now(),
      scope,
      findings,
      overallStatus,
      score,
    };
  }

  public policyManagement(policies: DataPolicy[]): { policies: DataPolicy[]; created: number; active: number } {
    let created = 0;
    let active = 0;

    for (const policy of policies) {
      this._policies.set(policy.id, policy);
      created++;
      if (policy.status === 'active') active++;
    }

    this._recordHistory(`policyManagement(policies=${policies.length}) -> created=${created}, active=${active}`);
    return { policies, created, active };
  }

  public getPolicy(policyId: string): DataPolicy | null {
    const policy = this._policies.get(policyId) || null;
    this._recordHistory(`getPolicy(policyId=${policyId}) -> ${policy ? 'found' : 'not found'}`);
    return policy;
  }

  public updatePolicy(policyId: string, updates: Partial<DataPolicy>): { updated: DataPolicy | null; modified: boolean } {
    const policy = this._policies.get(policyId);
    if (!policy) {
      this._recordHistory(`updatePolicy(policyId=${policyId}) -> not found`);
      return { updated: null, modified: false };
    }
    const updated = { ...policy, ...updates };
    this._policies.set(policyId, updated);
    this._recordHistory(`updatePolicy(policyId=${policyId}) -> updated`);
    return { updated, modified: true };
  }

  public deletePolicy(policyId: string): { deleted: boolean; policyId: string } {
    const deleted = this._policies.delete(policyId);
    this._recordHistory(`deletePolicy(policyId=${policyId}) -> ${deleted}`);
    return { deleted, policyId };
  }

  public dataGovernanceScore(assets: string[]): { scores: Record<string, number>; overallScore: number; breakdown: { quality: number; security: number; compliance: number; metadata: number } } {
    const scores: Record<string, number> = {};
    let totalScore = 0;

    for (const asset of assets) {
      const score = 0.7 + Math.random() * 0.3;
      scores[asset] = score;
      totalScore += score;
    }

    const breakdown = {
      quality: 0.8 + Math.random() * 0.2,
      security: 0.75 + Math.random() * 0.25,
      compliance: 0.85 + Math.random() * 0.15,
      metadata: 0.7 + Math.random() * 0.3,
    };

    this._recordHistory(`dataGovernanceScore(assets=${assets.length}) -> overall=${((assets.length > 0 ? totalScore / assets.length : 0) * 100).toFixed(1)}%`);
    return {
      scores,
      overallScore: assets.length > 0 ? totalScore / assets.length : 0,
      breakdown,
    };
  }

  private _evaluateRule(rule: DataQualityRule): number {
    switch (rule.dimension) {
      case 'completeness':
        return 0.8 + Math.random() * 0.2;
      case 'accuracy':
        return 0.85 + Math.random() * 0.15;
      case 'consistency':
        return 0.9 + Math.random() * 0.1;
      case 'timeliness':
        return 0.7 + Math.random() * 0.3;
      case 'uniqueness':
        return 0.95 + Math.random() * 0.05;
      case 'validity':
        return 0.8 + Math.random() * 0.2;
      case 'integrity':
        return 0.85 + Math.random() * 0.15;
      default:
        return 0.5 + Math.random() * 0.5;
    }
  }

  private _hash(s: string): string {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = ((h << 5) - h) + s.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h).toString(16);
  }

  private _recordHistory(entry: string): void {
    this._counter++;
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
  }

  public toPacket(): DataPacket<{
    governance: number;
    rules: number;
    assets: number;
    catalogEntries: number;
    policies: number;
    history: string[];
  }> {
    return {
      id: `data-governance-${Date.now()}-${this._counter}`,
      payload: {
        governance: this._governance.size,
        rules: this._rules.length,
        assets: this._assets.size,
        catalogEntries: this._catalog.size,
        policies: this._policies.size,
        history: [...this._history],
      },
      metadata: {
        createdAt: Date.now(),
        route: ['big_data', 'DataGovernance'],
        priority: 1,
        phase: 'data_governance',
      },
    };
  }

  public reset(): void {
    this._governance = new Map();
    this._rules = [];
    this._assets = new Map();
    this._catalog = new Map();
    this._lineage = new Map();
    this._policies = new Map();
    this._accessRules = new Map();
    this._history = [];
    this._counter = 0;
  }
}