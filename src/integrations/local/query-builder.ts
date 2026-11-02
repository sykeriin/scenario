import { db, ensureSeeded, getTable } from './db';
import { emitRealtime } from './realtime';
import type { Database } from '@/types/database';
import type { ProfileExtensions } from './schema-extensions';

/** Untyped row used internally by the storage layer. */
type Row = Record<string, unknown>;

type Tables = Database['public']['Tables'];

/**
 * Row type for a table. Known tables come from the generated schema types;
 * local-only tables (see schema-extensions.ts) fall back to a loose record.
 */
export type RowOf<T extends string> = T extends 'profiles'
  ? Tables['profiles']['Row'] & ProfileExtensions
  : T extends keyof Tables
    ? Tables[T]['Row']
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    : Record<string, any>;

export interface SupabaseError {
  message: string;
  code?: string;
}

export interface SupabaseResult<T> {
  data: T;
  error: SupabaseError | null;
  /** Total matching rows, set when select() is called with { count }. */
  count?: number | null;
}

export interface SelectOptions {
  count?: 'exact' | 'planned' | 'estimated';
  /** Return only the count, no rows. */
  head?: boolean;
}

export interface UpsertOptions {
  /** Comma-separated columns that identify an existing row to overwrite. */
  onConflict?: string;
}

type Filter =
  | { type: 'eq'; col: string; val: unknown }
  | { type: 'neq'; col: string; val: unknown }
  | { type: 'in'; col: string; vals: unknown[] }
  | { type: 'gt'; col: string; val: unknown }
  | { type: 'gte'; col: string; val: unknown }
  | { type: 'lte'; col: string; val: unknown }
  | { type: 'is'; col: string; val: null }
  | { type: 'not'; col: string; op: string; val: unknown }
  | { type: 'or'; expr: string };

function parseOr(expr: string, row: Row): boolean {
  const parts = expr.split(',');
  return parts.some((part) => {
    const m = part.trim().match(/^(\w+)\.eq\.(.+)$/);
    if (!m) return false;
    const [, col, val] = m;
    return String(row[col]) === val;
  });
}

function applyFilters(rows: Row[], filters: Filter[]): Row[] {
  return rows.filter((row) =>
    filters.every((f) => {
      switch (f.type) {
        case 'eq':
          return row[f.col] === f.val;
        case 'neq':
          return row[f.col] !== f.val;
        case 'in':
          return f.vals.includes(row[f.col]);
        case 'gt':
          return (row[f.col] as string | number) > (f.val as string | number);
        case 'gte':
          return (row[f.col] as string | number) >= (f.val as string | number);
        case 'lte':
          return (row[f.col] as string | number) <= (f.val as string | number);
        case 'is':
          return row[f.col] == null;
        case 'not':
          if (f.op === 'is' && f.val === null) return row[f.col] != null;
          return true;
        case 'or':
          return parseOr(f.expr, row);
        default:
          return true;
      }
    })
  );
}

function pickColumns(row: Row, cols: string): Row {
  if (cols === '*') return { ...row };
  const fields = cols.split(',').map((c) => c.trim());
  const out: Row = {};
  for (const f of fields) out[f] = row[f];
  return out;
}

function nowIso() {
  return new Date().toISOString();
}

class QueryBuilder<R = Row, D = R[]> implements PromiseLike<SupabaseResult<D | null>> {
  private table: string;
  private mode: 'select' | 'insert' | 'update' | 'upsert' | 'delete' = 'select';
  private filters: Filter[] = [];
  private selectCols = '*';
  private insertRows: Row[] = [];
  private updatePatch: Row = {};
  private upsertRow: Row = {};
  private upsertConflict: string[] = [];
  private wantCount = false;
  private headOnly = false;
  private orderCol: string | null = null;
  private orderAsc = true;
  private limitN: number | null = null;
  private singleMode: 'none' | 'single' | 'maybeSingle' = 'none';

  constructor(table: string) {
    this.table = table;
  }

  select(cols = '*', opts?: SelectOptions) {
    this.wantCount = !!opts?.count;
    this.headOnly = !!opts?.head;
    if (this.mode === 'insert' || this.mode === 'upsert') {
      this.selectCols = cols;
      return this;
    }
    this.mode = 'select';
    this.selectCols = cols;
    return this;
  }

  insert(rows: Row | Row[]) {
    this.mode = 'insert';
    this.insertRows = Array.isArray(rows) ? rows : [rows];
    return this;
  }

  update(patch: Row) {
    this.mode = 'update';
    this.updatePatch = patch;
    return this;
  }

  upsert(row: Row, opts?: UpsertOptions) {
    this.mode = 'upsert';
    this.upsertRow = row;
    this.upsertConflict = opts?.onConflict?.split(',').map((c) => c.trim()).filter(Boolean) ?? [];
    return this;
  }

  delete() {
    this.mode = 'delete';
    return this;
  }

  eq(col: string, val: unknown) {
    this.filters.push({ type: 'eq', col, val });
    return this;
  }

  neq(col: string, val: unknown) {
    this.filters.push({ type: 'neq', col, val });
    return this;
  }

  in(col: string, vals: unknown[]) {
    this.filters.push({ type: 'in', col, vals });
    return this;
  }

  gt(col: string, val: unknown) {
    this.filters.push({ type: 'gt', col, val });
    return this;
  }

  gte(col: string, val: unknown) {
    this.filters.push({ type: 'gte', col, val });
    return this;
  }

  lte(col: string, val: unknown) {
    this.filters.push({ type: 'lte', col, val });
    return this;
  }

  is(col: string, val: null) {
    this.filters.push({ type: 'is', col, val });
    return this;
  }

  not(col: string, op: string, val: unknown) {
    this.filters.push({ type: 'not', col, op, val });
    return this;
  }

  or(expr: string) {
    this.filters.push({ type: 'or', expr });
    return this;
  }

  order(col: string, opts?: { ascending?: boolean }) {
    this.orderCol = col;
    this.orderAsc = opts?.ascending !== false;
    return this;
  }

  limit(n: number) {
    this.limitN = n;
    return this;
  }

  single(): QueryBuilder<R, R> {
    this.singleMode = 'single';
    return this as unknown as QueryBuilder<R, R>;
  }

  maybeSingle(): QueryBuilder<R, R | null> {
    this.singleMode = 'maybeSingle';
    return this as unknown as QueryBuilder<R, R | null>;
  }

  then<TResult1 = SupabaseResult<D | null>, TResult2 = never>(
    onfulfilled?: ((value: SupabaseResult<D | null>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return (this.execute() as Promise<SupabaseResult<D | null>>).then(onfulfilled, onrejected);
  }

  private async execute(): Promise<SupabaseResult<Row | Row[] | null>> {
    try {
      await ensureSeeded();
      const table = await getTable(this.table);

      if (this.mode === 'insert') {
        const saved: Row[] = [];
        for (const raw of this.insertRows) {
          const row: Row = {
            ...raw,
            id: raw.id ?? crypto.randomUUID(),
            created_at: raw.created_at ?? nowIso(),
          };
          await table.put(row);
          emitRealtime(this.table, 'INSERT', row, null);
          saved.push(pickColumns(row, this.selectCols === '*' ? '*' : this.selectCols));
        }
        if (this.singleMode === 'single') {
          if (saved.length !== 1) return { data: null, error: { message: 'Expected single row' } };
          return { data: saved[0], error: null };
        }
        return { data: saved, error: null };
      }

      if (this.mode === 'upsert') {
        // Without an explicit id, onConflict columns decide which existing row to overwrite.
        let existingId: unknown = this.upsertRow.id;
        if (existingId == null && this.upsertConflict.length > 0) {
          const match = (await table.toArray()).find((r) =>
            this.upsertConflict.every((c) => r[c] === this.upsertRow[c])
          );
          existingId = match?.id;
        }
        const row: Row = {
          ...this.upsertRow,
          id: existingId ?? crypto.randomUUID(),
          updated_at: nowIso(),
        };
        const old = await table.get(String(row.id));
        await table.put(row);
        emitRealtime(this.table, old ? 'UPDATE' : 'INSERT', row, old ?? null);
        return { data: [row], error: null };
      }

      if (this.mode === 'update') {
        let rows = await table.toArray();
        rows = applyFilters(rows, this.filters);
        const updated: Row[] = [];
        for (const old of rows) {
          const row = { ...old, ...this.updatePatch, updated_at: nowIso() };
          await table.put(row);
          emitRealtime(this.table, 'UPDATE', row, old);
          updated.push(row);
        }
        if (this.singleMode === 'single') {
          return { data: updated[0] ?? null, error: updated[0] ? null : { message: 'No rows updated' } };
        }
        return { data: updated, error: null };
      }

      if (this.mode === 'delete') {
        let rows = await table.toArray();
        rows = applyFilters(rows, this.filters);
        for (const old of rows) {
          await table.delete(String(old.id));
          emitRealtime(this.table, 'DELETE', null, old);
        }
        return { data: null, error: null };
      }

      // select
      let rows = await table.toArray();
      rows = applyFilters(rows, this.filters);
      if (this.orderCol) {
        const col = this.orderCol;
        rows.sort((a, b) => {
          const av = a[col] as string | number;
          const bv = b[col] as string | number;
          if (av < bv) return this.orderAsc ? -1 : 1;
          if (av > bv) return this.orderAsc ? 1 : -1;
          return 0;
        });
      }
      const total = rows.length;
      if (this.headOnly) return { data: null, error: null, count: total };
      if (this.limitN != null) rows = rows.slice(0, this.limitN);
      rows = rows.map((r) => pickColumns(r, this.selectCols));
      const count = this.wantCount ? total : undefined;

      if (this.singleMode === 'single') {
        if (rows.length !== 1) return { data: null, error: { message: 'JSON object requested, multiple (or no) rows returned' } };
        return { data: rows[0], error: null, count };
      }
      if (this.singleMode === 'maybeSingle') {
        return { data: rows[0] ?? null, error: null, count };
      }
      return { data: rows, error: null, count };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Query failed';
      return { data: null, error: { message } };
    }
  }
}

export function from<T extends string>(table: T) {
  return new QueryBuilder<RowOf<T>>(table);
}
