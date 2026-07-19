import { DataPacket, PacketMeta } from '../shared/types';

export interface Query {
  type: string;
  table: string;
  columns: string[];
  where: string;
  joins: string[];
  order: string;
  limit: number;
  offset: number;
}

export interface QueryResult {
  query: string;
  rows: Record<string, unknown>[];
  affected: number;
  duration: number;
}

export class SQLQueryBuilder {
  private _queries: Query[] = [];
  private _results: QueryResult[] = [];
  private _counter = 0;

  select(table: string, columns: string[]): Query {
    const query: Query = {
      type: 'SELECT',
      table,
      columns,
      where: '',
      joins: [],
      order: '',
      limit: 0,
      offset: 0,
    };
    this._queries.push(query);
    return query;
  }

  insert(table: string, values: Record<string, unknown>): Query {
    const query: Query = {
      type: 'INSERT',
      table,
      columns: Object.keys(values),
      where: '',
      joins: [],
      order: '',
      limit: 0,
      offset: 0,
    };
    (query as Record<string, unknown>).values = Object.values(values);
    this._queries.push(query);
    return query;
  }

  update(table: string, setValues: Record<string, unknown>, where: string): Query {
    const query: Query = {
      type: 'UPDATE',
      table,
      columns: Object.keys(setValues),
      where,
      joins: [],
      order: '',
      limit: 0,
      offset: 0,
    };
    (query as Record<string, unknown>).setValues = setValues;
    this._queries.push(query);
    return query;
  }

  delete(table: string, where: string): Query {
    const query: Query = {
      type: 'DELETE',
      table,
      columns: [],
      where,
      joins: [],
      order: '',
      limit: 0,
      offset: 0,
    };
    this._queries.push(query);
    return query;
  }

  where(query: Query, condition: string, operator: string = 'AND'): Query {
    if (query.where) {
      query.where = `${query.where} ${operator} ${condition}`;
    } else {
      query.where = condition;
    }
    return query;
  }

  andWhere(query: Query, condition: string): Query {
    return this.where(query, condition, 'AND');
  }

  orWhere(query: Query, condition: string): Query {
    return this.where(query, condition, 'OR');
  }

  join(query: Query, table: string, on: string, joinType: string = 'INNER'): Query {
    query.joins.push(`${joinType} JOIN ${table} ON ${on}`);
    return query;
  }

  groupBy(query: Query, columns: string[]): Query {
    (query as Record<string, unknown>).groupBy = columns;
    return query;
  }

  having(query: Query, condition: string): Query {
    (query as Record<string, unknown>).having = condition;
    return query;
  }

  orderBy(query: Query, column: string, direction: string = 'ASC'): Query {
    query.order = `${column} ${direction}`;
    return query;
  }

  limit(query: Query, n: number, offset: number = 0): Query {
    query.limit = n;
    query.offset = offset;
    return query;
  }

  subquery(query: Query, alias: string): Query {
    (query as Record<string, unknown>).alias = alias;
    return query;
  }

  union(queries: Query[], all: boolean = false): Query {
    const query: Query = {
      type: all ? 'UNION ALL' : 'UNION',
      table: '',
      columns: [],
      where: '',
      joins: [],
      order: '',
      limit: 0,
      offset: 0,
    };
    (query as Record<string, unknown>).unionQueries = queries;
    this._queries.push(query);
    return query;
  }

  cte(query: Query, name: string): Query {
    (query as Record<string, unknown>).cte = name;
    return query;
  }

  transaction(queries: Query[], isolation: string = 'READ COMMITTED'): Query {
    const query: Query = {
      type: 'TRANSACTION',
      table: '',
      columns: [],
      where: '',
      joins: [],
      order: '',
      limit: 0,
      offset: 0,
    };
    (query as Record<string, unknown>).txQueries = queries;
    (query as Record<string, unknown>).isolation = isolation;
    this._queries.push(query);
    return query;
  }

  toPacket(): DataPacket<{
    queries: Query[];
    results: QueryResult[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['database', 'SQLQueryBuilder'],
      priority: 1,
      phase: 'sql_query_builder',
    };
    return {
      id: `sql-builder-${Date.now().toString(36)}`,
      payload: {
        queries: this._queries,
        results: this._results,
      },
      metadata,
    };
  }

  reset(): void {
    this._queries = [];
    this._results = [];
    this._counter = 0;
  }

  get queryCount(): number { return this._queries.length; }
  get resultCount(): number { return this._results.length; }
}
