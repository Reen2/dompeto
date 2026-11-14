import * as SQLite from 'expo-sqlite';
import { useEffect, useReducer, useState } from 'react';

import { MIGRATIONS, SEED_CATEGORIES } from './schema';
import { nowISO, uid } from '@/lib/id';

const DATABASE_NAME = 'dompet.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;
let version = 0;
const listeners = new Set<() => void>();

/** Call after every mutation so mounted queries re-run. */
export function notifyChanged() {
  version++;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Re-renders the component whenever data changes anywhere in the app. */
export function useDbVersion(): number {
  const [, force] = useReducer((n: number) => n + 1, 0);
  useEffect(() => subscribe(force), []);
  return version;
}

export type QueryState<T> = {
  data: T | undefined;
  loading: boolean;
  error: string | null;
  reload: () => void;
};

/**
 * Small reactive query hook: re-runs when the global data version changes
 * or when `deps` change.
 */
export function useQuery<T>(loader: () => Promise<T>, deps: unknown[] = []): QueryState<T> {
  const v = useDbVersion();
  const [tick, setTick] = useState(0);
  // A single string key encodes every reason to re-run: data version, manual
  // reload, and caller deps. Comparing it against the last stored result lets
  // the hook derive `loading` without setting state synchronously in an effect.
  const key = `${v}:${tick}:${JSON.stringify(deps)}`;
  const [entry, setEntry] = useState<{ key: string; data?: T; error: string | null }>({
    key: '',
    error: null,
  });

  useEffect(() => {
    let alive = true;
    loader()
      .then((data) => {
        if (alive) setEntry({ key, data, error: null });
      })
      .catch((error: unknown) => {
        if (alive) setEntry({ key, data: undefined, error: String(error) });
      });
    return () => {
      alive = false;
    };
    // `key` already encodes every dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const fresh = entry.key === key;
  return {
    // Keep serving the previous result while the next one loads (no flicker).
    data: entry.data,
    loading: !fresh,
    error: fresh ? entry.error : null,
    reload: () => setTick((n) => n + 1),
  };
}

async function openAndMigrate(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;

  if (current < MIGRATIONS.length) {
    for (let i = current; i < MIGRATIONS.length; i++) {
      await db.execAsync(MIGRATIONS[i]);
    }
    await db.execAsync(`PRAGMA user_version = ${MIGRATIONS.length}`);
  }

  const categoryCount = await db.getFirstAsync<{ c: number }>(
    'SELECT COUNT(*) as c FROM categories',
  );
  if ((categoryCount?.c ?? 0) === 0) {
    await seed(db);
  }

  return db;
}

async function seed(db: SQLite.SQLiteDatabase) {
  const ts = nowISO();
  await db.withTransactionAsync(async () => {
    for (let i = 0; i < SEED_CATEGORIES.length; i++) {
      const c = SEED_CATEGORIES[i];
      await db.runAsync(
        `INSERT INTO categories (id, name, type, icon, color, is_system, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)`,
        uid(),
        c.name,
        c.type,
        c.icon,
        c.color,
        i,
        ts,
        ts,
      );
    }
    await db.runAsync(
      `INSERT INTO wallets (id, name, type, icon, color, currency, opening_balance, include_in_total, sort_order, created_at, updated_at)
       VALUES (?, 'Tunai', 'cash', 'banknote.fill', '#A8813C', 'IDR', 0, 1, 0, ?, ?)`,
      uid(),
      ts,
      ts,
    );
  });
}

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = openAndMigrate().catch((error) => {
      dbPromise = null;
      throw error;
    });
  }
  return dbPromise;
}

/** Wipes every table and re-seeds defaults. Used by "Reset semua data". */
export async function resetDatabase() {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    const tables = [
      'debt_payments',
      'debts',
      'goal_contributions',
      'goals',
      'recurring_rules',
      'budgets',
      'transactions',
      'categories',
      'wallets',
      'wishlist',
      'settings',
    ];
    for (const table of tables) {
      await db.execAsync(`DELETE FROM ${table}`);
    }
  });
  await seed(db);
  notifyChanged();
}

export { DATABASE_NAME };
