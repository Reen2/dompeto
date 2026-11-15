import Dexie, { type Table } from 'dexie';
import type {
  Budget, Category, Debt, DebtPayment, Goal, GoalContribution, RecurringRule,
  SettingsMap, Transaction, Wallet, WishItem,
} from './types';

export class DompetDB extends Dexie {
  settings!: Table<{ key: string; value: string }, string>;
  wallets!: Table<Wallet, string>;
  categories!: Table<Category, string>;
  transactions!: Table<Transaction, string>;
  budgets!: Table<Budget, string>;
  recurring_rules!: Table<RecurringRule, string>;
  goals!: Table<Goal, string>;
  goal_contributions!: Table<GoalContribution, string>;
  debts!: Table<Debt, string>;
  debt_payments!: Table<DebtPayment, string>;
  wishlist!: Table<WishItem, string>;

  constructor() {
    super('dompet');
    this.version(1).stores({
      settings: 'key',
      wallets: 'id, type, archived_at, sort_order',
      categories: 'id, type, parent_id, archived_at, sort_order',
      transactions: 'id, type, wallet_id, to_wallet_id, category_id, date, deleted_at, recurring_id',
      budgets: 'id, category_id, period, archived_at',
      recurring_rules: 'id, type, wallet_id, is_bill, auto_post, archived_at, next_run',
      goals: 'id, achieved_at, archived_at',
      goal_contributions: 'id, goal_id',
      debts: 'id, type, settled_at, archived_at, due_date',
      debt_payments: 'id, debt_id',
      wishlist: 'id, purchased_at',
    });
  }
}

export const db = new DompetDB();

export async function getSetting(key: string): Promise<string | undefined> {
  const row = await db.settings.get(key);
  return row?.value;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await db.settings.put({ key, value });
}

export async function getAllSettings(): Promise<SettingsMap> {
  const rows = await db.settings.toArray();
  const out: SettingsMap = {};
  for (const r of rows) out[r.key] = r.value;
  return out;
}
