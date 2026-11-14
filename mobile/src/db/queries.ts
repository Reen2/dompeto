import { getDb, notifyChanged } from './index';
import type {
  Budget,
  BudgetProgress,
  Category,
  CategoryType,
  Debt,
  DebtType,
  Freq,
  Goal,
  RecurringRule,
  TransactionRow,
  TxnType,
  Wallet,
  WalletWithBalance,
  WishItem,
} from './types';
import {
  addDays,
  addMonths,
  eachDay,
  endOfMonth,
  fromISODate,
  lastNDays,
  monthKey,
  startOfMonth,
  todayISO,
  weekdayIndex,
} from '@/lib/dates';
import { nowISO, uid } from '@/lib/id';

/* ------------------------------------------------------------------ */
/* Wallets                                                             */
/* ------------------------------------------------------------------ */

const BALANCE_SQL = `
  w.opening_balance
  + COALESCE((
      SELECT SUM(CASE
        WHEN t.type = 'income' THEN t.amount
        WHEN t.type = 'expense' THEN -t.amount
        WHEN t.type = 'adjustment' THEN t.amount
        ELSE -(t.amount + t.fee)
      END)
      FROM transactions t
      WHERE t.wallet_id = w.id AND t.deleted_at IS NULL AND t.date <= ?
    ), 0)
  + COALESCE((
      SELECT SUM(t.amount) FROM transactions t
      WHERE t.to_wallet_id = w.id AND t.type = 'transfer' AND t.deleted_at IS NULL AND t.date <= ?
    ), 0)
`;

export async function listWallets(includeArchived = false): Promise<WalletWithBalance[]> {
  const db = await getDb();
  const today = todayISO();
  return db.getAllAsync<WalletWithBalance>(
    `SELECT w.*, ${BALANCE_SQL} AS balance,
       (SELECT COUNT(*) FROM transactions t WHERE t.wallet_id = w.id AND t.deleted_at IS NULL) AS txn_count
     FROM wallets w
     WHERE w.deleted_at IS NULL ${includeArchived ? '' : 'AND w.archived_at IS NULL'}
     ORDER BY w.sort_order, w.created_at`,
    today,
    today,
  );
}

export async function getWallet(id: string): Promise<Wallet | null> {
  const db = await getDb();
  return db.getFirstAsync<Wallet>('SELECT * FROM wallets WHERE id = ?', id);
}

export type WalletInput = {
  id?: string;
  name: string;
  type: string;
  icon: string;
  color: string;
  opening_balance: number;
  credit_limit?: number | null;
  statement_day?: number | null;
  due_day?: number | null;
  include_in_total?: boolean;
};

export async function saveWallet(input: WalletInput): Promise<string> {
  const db = await getDb();
  const ts = nowISO();
  const id = input.id ?? uid();
  if (input.id) {
    await db.runAsync(
      `UPDATE wallets SET name = ?, type = ?, icon = ?, color = ?, opening_balance = ?,
        credit_limit = ?, statement_day = ?, due_day = ?, include_in_total = ?, updated_at = ?
       WHERE id = ?`,
      input.name,
      input.type,
      input.icon,
      input.color,
      input.opening_balance,
      input.credit_limit ?? null,
      input.statement_day ?? null,
      input.due_day ?? null,
      input.include_in_total === false ? 0 : 1,
      ts,
      id,
    );
  } else {
    const order = await db.getFirstAsync<{ m: number }>(
      'SELECT COALESCE(MAX(sort_order), 0) + 1 AS m FROM wallets',
    );
    await db.runAsync(
      `INSERT INTO wallets (id, name, type, icon, color, opening_balance, credit_limit, statement_day, due_day, include_in_total, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      input.name,
      input.type,
      input.icon,
      input.color,
      input.opening_balance,
      input.credit_limit ?? null,
      input.statement_day ?? null,
      input.due_day ?? null,
      input.include_in_total === false ? 0 : 1,
      order?.m ?? 0,
      ts,
      ts,
    );
  }
  notifyChanged();
  return id;
}

export async function setWalletArchived(id: string, archived: boolean) {
  const db = await getDb();
  await db.runAsync(
    'UPDATE wallets SET archived_at = ?, updated_at = ? WHERE id = ?',
    archived ? nowISO() : null,
    nowISO(),
    id,
  );
  notifyChanged();
}

export async function deleteWallet(id: string): Promise<{ ok: boolean; reason?: string }> {
  const db = await getDb();
  const usage = await db.getFirstAsync<{ c: number }>(
    'SELECT COUNT(*) AS c FROM transactions WHERE (wallet_id = ? OR to_wallet_id = ?) AND deleted_at IS NULL',
    id,
    id,
  );
  if ((usage?.c ?? 0) > 0) {
    return { ok: false, reason: 'Dompet ini punya transaksi. Arsipkan saja agar riwayat tetap utuh.' };
  }
  await db.runAsync('DELETE FROM wallets WHERE id = ?', id);
  notifyChanged();
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Categories                                                          */
/* ------------------------------------------------------------------ */

export async function listCategories(type?: CategoryType, includeArchived = false) {
  const db = await getDb();
  const params: string[] = [];
  let sql = `SELECT c.*, (SELECT COUNT(*) FROM transactions t WHERE t.category_id = c.id AND t.deleted_at IS NULL) AS usage_count
    FROM categories c WHERE 1 = 1`;
  if (type) {
    sql += ' AND c.type = ?';
    params.push(type);
  }
  if (!includeArchived) sql += ' AND c.archived_at IS NULL';
  sql += ' ORDER BY c.sort_order, c.name';
  return db.getAllAsync<Category & { usage_count: number }>(sql, params);
}

export type CategoryInput = {
  id?: string;
  name: string;
  type: CategoryType;
  icon: string;
  color: string;
};

export async function saveCategory(input: CategoryInput): Promise<string> {
  const db = await getDb();
  const ts = nowISO();
  const id = input.id ?? uid();
  if (input.id) {
    await db.runAsync(
      'UPDATE categories SET name = ?, icon = ?, color = ?, updated_at = ? WHERE id = ?',
      input.name,
      input.icon,
      input.color,
      ts,
      id,
    );
  } else {
    const order = await db.getFirstAsync<{ m: number }>(
      'SELECT COALESCE(MAX(sort_order), 0) + 1 AS m FROM categories',
    );
    await db.runAsync(
      `INSERT INTO categories (id, name, type, icon, color, is_system, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?)`,
      id,
      input.name,
      input.type,
      input.icon,
      input.color,
      order?.m ?? 0,
      ts,
      ts,
    );
  }
  notifyChanged();
  return id;
}

export async function setCategoryArchived(id: string, archived: boolean) {
  const db = await getDb();
  await db.runAsync(
    'UPDATE categories SET archived_at = ?, updated_at = ? WHERE id = ?',
    archived ? nowISO() : null,
    nowISO(),
    id,
  );
  notifyChanged();
}

export async function deleteCategory(id: string): Promise<{ ok: boolean; reason?: string }> {
  const db = await getDb();
  const usage = await db.getFirstAsync<{ c: number }>(
    'SELECT COUNT(*) AS c FROM transactions WHERE category_id = ? AND deleted_at IS NULL',
    id,
  );
  if ((usage?.c ?? 0) > 0) {
    return { ok: false, reason: 'Kategori sudah dipakai transaksi. Arsipkan saja.' };
  }
  await db.runAsync('DELETE FROM categories WHERE id = ?', id);
  notifyChanged();
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Transactions                                                        */
/* ------------------------------------------------------------------ */

export type TxnInput = {
  id?: string;
  type: TxnType;
  wallet_id: string;
  to_wallet_id?: string | null;
  category_id?: string | null;
  amount: number;
  fee?: number;
  date: string;
  time?: string | null;
  payee?: string | null;
  note?: string | null;
  tags?: string[] | null;
  attachment_uri?: string | null;
  recurring_id?: string | null;
};

export async function saveTransaction(input: TxnInput): Promise<string> {
  const db = await getDb();
  const ts = nowISO();
  const id = input.id ?? uid();
  const tags = input.tags && input.tags.length ? JSON.stringify(input.tags) : null;
  const fee = input.type === 'transfer' ? (input.fee ?? 0) : 0;
  const toWallet = input.type === 'transfer' ? (input.to_wallet_id ?? null) : null;
  const category = input.type === 'transfer' || input.type === 'adjustment' ? null : (input.category_id ?? null);

  if (input.id) {
    await db.runAsync(
      `UPDATE transactions SET type = ?, wallet_id = ?, to_wallet_id = ?, category_id = ?, amount = ?,
        fee = ?, date = ?, time = ?, payee = ?, note = ?, tags = ?, attachment_uri = ?, updated_at = ?
       WHERE id = ?`,
      input.type,
      input.wallet_id,
      toWallet,
      category,
      input.amount,
      fee,
      input.date,
      input.time ?? null,
      input.payee ?? null,
      input.note ?? null,
      tags,
      input.attachment_uri ?? null,
      ts,
      id,
    );
  } else {
    await db.runAsync(
      `INSERT INTO transactions (id, type, wallet_id, to_wallet_id, category_id, amount, fee, date, time, payee, note, tags, attachment_uri, recurring_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      input.type,
      input.wallet_id,
      toWallet,
      category,
      input.amount,
      fee,
      input.date,
      input.time ?? null,
      input.payee ?? null,
      input.note ?? null,
      tags,
      input.attachment_uri ?? null,
      input.recurring_id ?? null,
      ts,
      ts,
    );
  }
  notifyChanged();
  return id;
}

export async function deleteTransaction(id: string) {
  const db = await getDb();
  await db.runAsync(
    'UPDATE transactions SET deleted_at = ?, updated_at = ? WHERE id = ?',
    nowISO(),
    nowISO(),
    id,
  );
  notifyChanged();
}

export async function getTransaction(id: string): Promise<TransactionRow | null> {
  const db = await getDb();
  return db.getFirstAsync<TransactionRow>(
    `SELECT t.*, c.name AS category_name, c.color AS category_color, c.icon AS category_icon,
            w.name AS wallet_name, w.color AS wallet_color, tw.name AS to_wallet_name
     FROM transactions t
     JOIN wallets w ON w.id = t.wallet_id
     LEFT JOIN wallets tw ON tw.id = t.to_wallet_id
     LEFT JOIN categories c ON c.id = t.category_id
     WHERE t.id = ?`,
    id,
  );
}

export type TxnFilters = {
  from?: string;
  to?: string;
  type?: TxnType;
  walletId?: string;
  categoryId?: string;
  search?: string;
  limit?: number;
  offset?: number;
};

export async function listTransactions(filters: TxnFilters = {}): Promise<TransactionRow[]> {
  const db = await getDb();
  const where: string[] = ['t.deleted_at IS NULL'];
  const params: (string | number)[] = [];

  if (filters.from) {
    where.push('t.date >= ?');
    params.push(filters.from);
  }
  if (filters.to) {
    where.push('t.date <= ?');
    params.push(filters.to);
  }
  if (filters.type) {
    where.push('t.type = ?');
    params.push(filters.type);
  }
  if (filters.walletId) {
    where.push('(t.wallet_id = ? OR t.to_wallet_id = ?)');
    params.push(filters.walletId, filters.walletId);
  }
  if (filters.categoryId) {
    where.push('t.category_id = ?');
    params.push(filters.categoryId);
  }
  if (filters.search?.trim()) {
    const q = `%${filters.search.trim()}%`;
    where.push('(t.note LIKE ? OR t.payee LIKE ? OR c.name LIKE ? OR w.name LIKE ? OR t.tags LIKE ?)');
    params.push(q, q, q, q, q);
  }

  params.push(filters.limit ?? 200, filters.offset ?? 0);

  return db.getAllAsync<TransactionRow>(
    `SELECT t.*, c.name AS category_name, c.color AS category_color, c.icon AS category_icon,
            w.name AS wallet_name, w.color AS wallet_color, tw.name AS to_wallet_name
     FROM transactions t
     JOIN wallets w ON w.id = t.wallet_id
     LEFT JOIN wallets tw ON tw.id = t.to_wallet_id
     LEFT JOIN categories c ON c.id = t.category_id
     WHERE ${where.join(' AND ')}
     ORDER BY t.date DESC, COALESCE(t.time, '00:00') DESC, t.created_at DESC
     LIMIT ? OFFSET ?`,
    params,
  );
}

export type PeriodSummary = { income: number; expense: number; net: number; count: number };

export async function periodSummary(from: string, to: string): Promise<PeriodSummary> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ income: number; expense: number; count: number }>(
    `SELECT
       COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS income,
       COALESCE(SUM(CASE WHEN type = 'expense' THEN amount + fee ELSE 0 END), 0) AS expense,
       COUNT(*) AS count
     FROM transactions
     WHERE deleted_at IS NULL AND date BETWEEN ? AND ?`,
    from,
    to,
  );
  const income = row?.income ?? 0;
  const expense = row?.expense ?? 0;
  return { income, expense, net: income - expense, count: row?.count ?? 0 };
}

export type CategorySlice = {
  category_id: string | null;
  name: string;
  color: string;
  icon: string;
  total: number;
};

export async function categoryBreakdown(
  from: string,
  to: string,
  type: TxnType = 'expense',
): Promise<CategorySlice[]> {
  const db = await getDb();
  return db.getAllAsync<CategorySlice>(
    `SELECT t.category_id,
            COALESCE(c.name, 'Tanpa kategori') AS name,
            COALESCE(c.color, '#8C7B62') AS color,
            COALESCE(c.icon, 'ellipsis.circle.fill') AS icon,
            SUM(t.amount + t.fee) AS total
     FROM transactions t
     LEFT JOIN categories c ON c.id = t.category_id
     WHERE t.deleted_at IS NULL AND t.type = ? AND t.date BETWEEN ? AND ?
     GROUP BY t.category_id
     ORDER BY total DESC`,
    type,
    from,
    to,
  );
}

export type DailyTotal = { date: string; income: number; expense: number };

export async function dailyTotals(from: string, to: string): Promise<DailyTotal[]> {
  const db = await getDb();
  return db.getAllAsync<DailyTotal>(
    `SELECT date,
       COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS income,
       COALESCE(SUM(CASE WHEN type = 'expense' THEN amount + fee ELSE 0 END), 0) AS expense
     FROM transactions
     WHERE deleted_at IS NULL AND date BETWEEN ? AND ?
     GROUP BY date ORDER BY date`,
    from,
    to,
  );
}

export async function monthlySeries(months: number) {
  const db = await getDb();
  const today = todayISO();
  const from = startOfMonth(addMonths(today, -(months - 1)));
  const to = endOfMonth(today);
  const rows = await db.getAllAsync<{ ym: string; income: number; expense: number }>(
    `SELECT substr(date, 1, 7) AS ym,
       COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS income,
       COALESCE(SUM(CASE WHEN type = 'expense' THEN amount + fee ELSE 0 END), 0) AS expense
     FROM transactions
     WHERE deleted_at IS NULL AND date BETWEEN ? AND ?
     GROUP BY ym ORDER BY ym`,
    from,
    to,
  );
  const map = new Map(rows.map((r) => [r.ym, r]));
  const out: { month: string; income: number; expense: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const iso = startOfMonth(addMonths(today, -i));
    const key = monthKey(iso);
    const row = map.get(key);
    out.push({ month: iso, income: row?.income ?? 0, expense: row?.expense ?? 0 });
  }
  return out;
}

export async function topExpenses(from: string, to: string, limit = 5) {
  const db = await getDb();
  return db.getAllAsync<{
    id: string;
    amount: number;
    note: string | null;
    payee: string | null;
    date: string;
    category_name: string | null;
    category_icon: string | null;
  }>(
    `SELECT t.id, t.amount, t.note, t.payee, t.date, c.name AS category_name, c.icon AS category_icon
     FROM transactions t LEFT JOIN categories c ON c.id = t.category_id
     WHERE t.deleted_at IS NULL AND t.type = 'expense' AND t.date BETWEEN ? AND ?
     ORDER BY t.amount DESC LIMIT ?`,
    from,
    to,
    limit,
  );
}

export async function noSpendDays(from: string, to: string): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ c: number }>(
    `SELECT COUNT(*) AS c FROM (
        SELECT date FROM transactions
        WHERE deleted_at IS NULL AND type = 'expense' AND date BETWEEN ? AND ?
        GROUP BY date
      )`,
    from,
    to,
  );
  const total = eachDay(from, to).filter((d) => d <= todayISO()).length;
  return Math.max(0, total - (row?.c ?? 0));
}

/** Net worth by month: cumulative income − expense + opening balances − remaining debts. */
export async function netWorthSeries(months: number) {
  const db = await getDb();
  const today = todayISO();
  const rows = await db.getAllAsync<{ ym: string; net: number }>(
    `SELECT substr(date, 1, 7) AS ym,
       COALESCE(SUM(CASE WHEN type = 'income' THEN amount WHEN type = 'expense' THEN -(amount + fee) WHEN type = 'adjustment' THEN amount ELSE -fee END), 0) AS net
     FROM transactions WHERE deleted_at IS NULL GROUP BY ym ORDER BY ym`,
  );
  const openings = await db.getFirstAsync<{ total: number }>(
    'SELECT COALESCE(SUM(opening_balance), 0) AS total FROM wallets WHERE deleted_at IS NULL',
  );
  const debts = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(CASE WHEN type = 'receivable' THEN remaining ELSE -remaining END), 0) AS total
     FROM debts WHERE archived_at IS NULL AND settled_at IS NULL`,
  );
  const map = new Map(rows.map((r) => [r.ym, r.net]));
  const firstMonth = startOfMonth(addMonths(today, -(months - 1)));
  const firstKey = monthKey(firstMonth);

  // Start from the opening balances plus everything that happened before the window.
  let cumulative = openings?.total ?? 0;
  for (const row of rows) {
    if (row.ym < firstKey) cumulative += row.net;
  }

  const out: { month: string; value: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const iso = startOfMonth(addMonths(today, -i));
    cumulative += map.get(monthKey(iso)) ?? 0;
    out.push({ month: iso, value: cumulative + (debts?.total ?? 0) });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Budgets                                                             */
/* ------------------------------------------------------------------ */

function periodWindow(period: Budget['period'], today: string) {
  if (period === 'weekly') {
    const offset = (weekdayIndex(today) + 6) % 7;
    const start = addDays(today, -offset);
    return { start, end: addDays(start, 6) };
  }
  if (period === 'yearly') {
    const year = fromISODate(today).getFullYear();
    return { start: `${year}-01-01`, end: `${year}-12-31` };
  }
  return { start: startOfMonth(today), end: endOfMonth(today) };
}

function previousWindow(period: Budget['period'], today: string) {
  const current = periodWindow(period, today);
  if (period === 'weekly') return periodWindow(period, addDays(current.start, -1));
  if (period === 'yearly') return periodWindow(period, addDays(current.start, -1));
  return periodWindow(period, addDays(current.start, -1));
}

async function spentIn(categoryId: string | null, from: string, to: string): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(amount + fee), 0) AS total FROM transactions
     WHERE deleted_at IS NULL AND type = 'expense' AND date BETWEEN ? AND ?
       AND (? IS NULL OR category_id = ?)`,
    from,
    to,
    categoryId,
    categoryId,
  );
  return row?.total ?? 0;
}

export async function listBudgetsWithProgress(): Promise<BudgetProgress[]> {
  const db = await getDb();
  const today = todayISO();
  const budgets = await db.getAllAsync<Budget>(
    `SELECT b.*, c.name AS category_name, c.color AS category_color, c.icon AS category_icon
     FROM budgets b LEFT JOIN categories c ON c.id = b.category_id
     WHERE b.archived_at IS NULL ORDER BY b.created_at`,
  );
  const out: BudgetProgress[] = [];
  for (const b of budgets) {
    const window = periodWindow(b.period, today);
    const spent = await spentIn(b.category_id, window.start, window.end);
    let amount = b.amount;
    if (b.rollover) {
      const prev = previousWindow(b.period, today);
      const prevSpent = await spentIn(b.category_id, prev.start, prev.end);
      amount += Math.max(0, b.amount - prevSpent);
    }
    const row = b as Budget & {
      category_name: string | null;
      category_color: string | null;
      category_icon: string | null;
    };
    out.push({
      ...b,
      amount,
      category_name: row.category_name,
      category_color: row.category_color,
      category_icon: row.category_icon,
      spent,
      period_start: window.start,
      period_end: window.end,
    });
  }
  return out;
}

export type BudgetInput = {
  id?: string;
  category_id: string | null;
  amount: number;
  period: Budget['period'];
  rollover: boolean;
  alert_pct: number;
};

export async function saveBudget(input: BudgetInput): Promise<string> {
  const db = await getDb();
  const ts = nowISO();
  const id = input.id ?? uid();
  if (input.id) {
    await db.runAsync(
      `UPDATE budgets SET category_id = ?, amount = ?, period = ?, rollover = ?, alert_pct = ?, updated_at = ?
       WHERE id = ?`,
      input.category_id,
      input.amount,
      input.period,
      input.rollover ? 1 : 0,
      input.alert_pct,
      ts,
      id,
    );
  } else {
    await db.runAsync(
      `INSERT INTO budgets (id, category_id, amount, period, start_date, rollover, alert_pct, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      input.category_id,
      input.amount,
      input.period,
      startOfMonth(todayISO()),
      input.rollover ? 1 : 0,
      input.alert_pct,
      ts,
      ts,
    );
  }
  notifyChanged();
  return id;
}

export async function deleteBudget(id: string) {
  const db = await getDb();
  await db.runAsync('DELETE FROM budgets WHERE id = ?', id);
  notifyChanged();
}

/* ------------------------------------------------------------------ */
/* Recurring rules                                                     */
/* ------------------------------------------------------------------ */

export async function listRecurring(includeArchived = false) {
  const db = await getDb();
  return db.getAllAsync<
    RecurringRule & { category_name: string | null; wallet_name: string; category_icon: string | null }
  >(
    `SELECT r.*, c.name AS category_name, c.icon AS category_icon, w.name AS wallet_name
     FROM recurring_rules r
     LEFT JOIN categories c ON c.id = r.category_id
     JOIN wallets w ON w.id = r.wallet_id
     WHERE ${includeArchived ? '1 = 1' : 'r.archived_at IS NULL'}
     ORDER BY r.next_run`,
  );
}

export type RecurringInput = {
  id?: string;
  name: string;
  type: TxnType;
  wallet_id: string;
  to_wallet_id?: string | null;
  category_id?: string | null;
  amount: number;
  note?: string | null;
  freq: Freq;
  interval_n: number;
  start_date: string;
  end_date?: string | null;
  auto_post: boolean;
  is_bill: boolean;
  reminder_days?: number[];
};

export async function saveRecurring(input: RecurringInput): Promise<string> {
  const db = await getDb();
  const ts = nowISO();
  const id = input.id ?? uid();
  const reminder = JSON.stringify(input.reminder_days ?? [3, 1, 0]);
  const nextRun = input.start_date;

  if (input.id) {
    // Editing an existing rule must not replay history: keep the current
    // next_run unless the start date itself was changed.
    const current = await db.getFirstAsync<{ start_date: string; next_run: string }>(
      'SELECT start_date, next_run FROM recurring_rules WHERE id = ?',
      input.id,
    );
    const keepNext = current && current.start_date === input.start_date ? current.next_run : nextRun;
    await db.runAsync(
      `UPDATE recurring_rules SET name = ?, type = ?, wallet_id = ?, to_wallet_id = ?, category_id = ?,
        amount = ?, note = ?, freq = ?, interval_n = ?, start_date = ?, next_run = ?, end_date = ?,
        auto_post = ?, is_bill = ?, reminder_days = ?, updated_at = ?
       WHERE id = ?`,
      input.name,
      input.type,
      input.wallet_id,
      input.to_wallet_id ?? null,
      input.category_id ?? null,
      input.amount,
      input.note ?? null,
      input.freq,
      input.interval_n,
      input.start_date,
      keepNext,
      input.end_date ?? null,
      input.auto_post ? 1 : 0,
      input.is_bill ? 1 : 0,
      reminder,
      ts,
      id,
    );
  } else {
    await db.runAsync(
      `INSERT INTO recurring_rules (id, name, type, wallet_id, to_wallet_id, category_id, amount, note, freq, interval_n,
        start_date, next_run, end_date, auto_post, is_bill, reminder_days, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      input.name,
      input.type,
      input.wallet_id,
      input.to_wallet_id ?? null,
      input.category_id ?? null,
      input.amount,
      input.note ?? null,
      input.freq,
      input.interval_n,
      nextRun,
      nextRun,
      input.end_date ?? null,
      input.auto_post ? 1 : 0,
      input.is_bill ? 1 : 0,
      reminder,
      ts,
      ts,
    );
  }
  notifyChanged();
  return id;
}

export async function deleteRecurring(id: string) {
  const db = await getDb();
  await db.runAsync('DELETE FROM recurring_rules WHERE id = ?', id);
  notifyChanged();
}

function advance(date: string, freq: Freq, interval: number): string {
  if (freq === 'daily') return addDays(date, interval);
  if (freq === 'weekly') return addDays(date, 7 * interval);
  if (freq === 'monthly') return addMonths(date, interval);
  return addMonths(date, 12 * interval);
}

/** Posts due recurring transactions (auto_post only) and advances next_run. */
export async function runRecurring(): Promise<{ posted: number; reminders: number }> {
  const db = await getDb();
  const today = todayISO();
  const rules = await db.getAllAsync<RecurringRule>(
    'SELECT * FROM recurring_rules WHERE archived_at IS NULL',
  );
  let posted = 0;
  let reminders = 0;

  for (const rule of rules) {
    let next = rule.next_run;
    if (!next || next > today) {
      if (rule.is_bill && rule.next_run <= addDays(today, 7)) reminders++;
      continue;
    }
    // Manual rules wait for the user to tap "Catat". Keeping the due date means
    // a bill is never silently skipped just because the app was opened.
    if (!rule.auto_post) {
      if (rule.is_bill) reminders++;
      continue;
    }
    let guard = 0;
    while (next <= today && (!rule.end_date || next <= rule.end_date) && guard < 60) {
      await db.runAsync(
        `INSERT INTO transactions (id, type, wallet_id, to_wallet_id, category_id, amount, fee, date, payee, note, recurring_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?, NULL, ?, ?, ?, ?)`,
        uid(),
        rule.type,
        rule.wallet_id,
        rule.to_wallet_id,
        rule.category_id,
        rule.amount,
        next,
        rule.note,
        rule.id,
        nowISO(),
        nowISO(),
      );
      posted++;
      next = advance(next, rule.freq, rule.interval_n);
      guard++;
    }
    await db.runAsync(
      'UPDATE recurring_rules SET next_run = ?, last_posted_at = ?, updated_at = ? WHERE id = ?',
      next,
      rule.auto_post ? nowISO() : rule.last_posted_at,
      nowISO(),
      rule.id,
    );
  }
  if (posted > 0) notifyChanged();
  return { posted, reminders };
}

export async function upcomingBills(days = 14) {
  const db = await getDb();
  const today = todayISO();
  return db.getAllAsync<RecurringRule & { category_name: string | null; category_icon: string | null }>(
    `SELECT r.*, c.name AS category_name, c.icon AS category_icon
     FROM recurring_rules r LEFT JOIN categories c ON c.id = r.category_id
     WHERE r.archived_at IS NULL AND r.is_bill = 1 AND r.next_run <= ?
     ORDER BY r.next_run LIMIT 10`,
    addDays(today, days),
  );
}

/** Marks the next occurrence of a bill as paid (creates the transaction). */
export async function payBill(ruleId: string) {
  const db = await getDb();
  const rule = await db.getFirstAsync<RecurringRule>(
    'SELECT * FROM recurring_rules WHERE id = ?',
    ruleId,
  );
  if (!rule) return;
  const date = rule.next_run <= todayISO() ? rule.next_run : todayISO();
  await db.runAsync(
    `INSERT INTO transactions (id, type, wallet_id, to_wallet_id, category_id, amount, fee, date, payee, note, recurring_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?, NULL, ?, ?, ?, ?)`,
    uid(),
    rule.type,
    rule.wallet_id,
    rule.to_wallet_id,
    rule.category_id,
    rule.amount,
    date,
    rule.note,
    rule.id,
    nowISO(),
    nowISO(),
  );
  await db.runAsync(
    'UPDATE recurring_rules SET next_run = ?, last_posted_at = ?, updated_at = ? WHERE id = ?',
    advance(rule.next_run, rule.freq, rule.interval_n),
    nowISO(),
    nowISO(),
    rule.id,
  );
  notifyChanged();
}

/* ------------------------------------------------------------------ */
/* Goals                                                               */
/* ------------------------------------------------------------------ */

export async function listGoals(includeArchived = false) {
  const db = await getDb();
  return db.getAllAsync<Goal>(
    `SELECT * FROM goals WHERE ${includeArchived ? '1 = 1' : 'archived_at IS NULL'} ORDER BY created_at`,
  );
}

export type GoalInput = {
  id?: string;
  name: string;
  icon: string;
  color: string;
  target_amount: number;
  target_date?: string | null;
  note?: string | null;
  saved_amount?: number;
};

export async function saveGoal(input: GoalInput): Promise<string> {
  const db = await getDb();
  const ts = nowISO();
  const id = input.id ?? uid();
  if (input.id) {
    await db.runAsync(
      `UPDATE goals SET name = ?, icon = ?, color = ?, target_amount = ?, target_date = ?, note = ?,
        archived_at = NULL, updated_at = ? WHERE id = ?`,
      input.name,
      input.icon,
      input.color,
      input.target_amount,
      input.target_date ?? null,
      input.note ?? null,
      ts,
      id,
    );
  } else {
    await db.runAsync(
      `INSERT INTO goals (id, name, icon, color, target_amount, saved_amount, target_date, note, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      input.name,
      input.icon,
      input.color,
      input.target_amount,
      input.saved_amount ?? 0,
      input.target_date ?? null,
      input.note ?? null,
      ts,
      ts,
    );
  }
  notifyChanged();
  return id;
}

export async function contributeToGoal(goalId: string, amount: number, note?: string) {
  const db = await getDb();
  const goal = await db.getFirstAsync<Goal>('SELECT * FROM goals WHERE id = ?', goalId);
  if (!goal) return;
  const saved = Math.max(0, goal.saved_amount + amount);
  await db.runAsync(
    'UPDATE goals SET saved_amount = ?, achieved_at = ?, updated_at = ? WHERE id = ?',
    saved,
    saved >= goal.target_amount ? nowISO() : null,
    nowISO(),
    goalId,
  );
  await db.runAsync(
    'INSERT INTO goal_contributions (id, goal_id, amount, date, note) VALUES (?, ?, ?, ?, ?)',
    uid(),
    goalId,
    amount,
    todayISO(),
    note ?? null,
  );
  notifyChanged();
}

export async function deleteGoal(id: string) {
  const db = await getDb();
  await db.runAsync('DELETE FROM goals WHERE id = ?', id);
  notifyChanged();
}

/* ------------------------------------------------------------------ */
/* Debts                                                               */
/* ------------------------------------------------------------------ */

export async function listDebts(includeSettled = false) {
  const db = await getDb();
  return db.getAllAsync<Debt>(
    `SELECT * FROM debts WHERE archived_at IS NULL ${includeSettled ? '' : 'AND settled_at IS NULL'}
     ORDER BY (due_date IS NULL), due_date, created_at`,
  );
}

export type DebtInput = {
  id?: string;
  type: DebtType;
  counterparty: string;
  principal: number;
  remaining?: number;
  due_date?: string | null;
  wallet_id?: string | null;
  note?: string | null;
};

export async function saveDebt(input: DebtInput): Promise<string> {
  const db = await getDb();
  const ts = nowISO();
  const id = input.id ?? uid();
  if (input.id) {
    // Keep the paid amount intact when the principal is corrected: the
    // remaining balance always equals principal minus what was already paid.
    const current = await db.getFirstAsync<{
      principal: number;
      remaining: number;
      settled_at: string | null;
    }>('SELECT principal, remaining, settled_at FROM debts WHERE id = ?', input.id);
    const paid = current ? Math.max(0, current.principal - current.remaining) : 0;
    const remaining = Math.max(0, input.principal - paid);
    await db.runAsync(
      `UPDATE debts SET type = ?, counterparty = ?, principal = ?, remaining = ?, settled_at = ?,
        due_date = ?, wallet_id = ?, note = ?, updated_at = ?
       WHERE id = ?`,
      input.type,
      input.counterparty,
      input.principal,
      remaining,
      remaining === 0 ? (current?.settled_at ?? ts) : null,
      input.due_date ?? null,
      input.wallet_id ?? null,
      input.note ?? null,
      ts,
      id,
    );
  } else {
    await db.runAsync(
      `INSERT INTO debts (id, type, counterparty, principal, remaining, due_date, wallet_id, note, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      input.type,
      input.counterparty,
      input.principal,
      input.remaining ?? input.principal,
      input.due_date ?? null,
      input.wallet_id ?? null,
      input.note ?? null,
      ts,
      ts,
    );
  }
  notifyChanged();
  return id;
}

export async function payDebt(
  debt: Debt,
  amount: number,
  walletId: string | null,
  note?: string,
) {
  const db = await getDb();
  const remaining = Math.max(0, debt.remaining - amount);
  const ts = nowISO();

  let txnId: string | null = null;
  if (walletId) {
    txnId = uid();
    await db.runAsync(
      `INSERT INTO transactions (id, type, wallet_id, category_id, amount, fee, date, payee, note, created_at, updated_at)
       VALUES (?, ?, ?, NULL, ?, 0, ?, ?, ?, ?, ?)`,
      txnId,
      debt.type === 'payable' ? 'expense' : 'income',
      walletId,
      amount,
      todayISO(),
      debt.counterparty,
      note ?? (debt.type === 'payable' ? 'Bayar utang' : 'Terima piutang'),
      ts,
      ts,
    );
  }

  await db.runAsync(
    'UPDATE debts SET remaining = ?, settled_at = ?, updated_at = ? WHERE id = ?',
    remaining,
    remaining === 0 ? ts : null,
    ts,
    debt.id,
  );
  await db.runAsync(
    'INSERT INTO debt_payments (id, debt_id, amount, paid_at, transaction_id, note) VALUES (?, ?, ?, ?, ?, ?)',
    uid(),
    debt.id,
    amount,
    todayISO(),
    txnId,
    note ?? null,
  );
  notifyChanged();
}

export async function deleteDebt(id: string) {
  const db = await getDb();
  await db.runAsync('DELETE FROM debts WHERE id = ?', id);
  notifyChanged();
}

/* ------------------------------------------------------------------ */
/* Wishlist                                                            */
/* ------------------------------------------------------------------ */

export async function listWishlist(includePurchased = false) {
  const db = await getDb();
  return db.getAllAsync<WishItem>(
    `SELECT * FROM wishlist ${includePurchased ? '' : 'WHERE purchased_at IS NULL'} ORDER BY priority DESC, created_at DESC`,
  );
}

export async function saveWish(input: {
  id?: string;
  title: string;
  amount: number;
  note?: string | null;
  priority: number;
}) {
  const db = await getDb();
  const id = input.id ?? uid();
  if (input.id) {
    await db.runAsync(
      'UPDATE wishlist SET title = ?, amount = ?, note = ?, priority = ? WHERE id = ?',
      input.title,
      input.amount,
      input.note ?? null,
      input.priority,
      id,
    );
  } else {
    await db.runAsync(
      'INSERT INTO wishlist (id, title, amount, note, priority, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      id,
      input.title,
      input.amount,
      input.note ?? null,
      input.priority,
      nowISO(),
    );
  }
  notifyChanged();
  return id;
}

export async function markWishPurchased(id: string) {
  const db = await getDb();
  await db.runAsync('UPDATE wishlist SET purchased_at = ? WHERE id = ?', nowISO(), id);
  notifyChanged();
}

export async function deleteWish(id: string) {
  const db = await getDb();
  await db.runAsync('DELETE FROM wishlist WHERE id = ?', id);
  notifyChanged();
}

/* ------------------------------------------------------------------ */
/* Settings                                                            */
/* ------------------------------------------------------------------ */

export async function readSettings(): Promise<Record<string, string>> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ key: string; value: string }>('SELECT key, value FROM settings');
  const out: Record<string, string> = {};
  for (const row of rows) out[row.key] = row.value;
  return out;
}

export async function writeSetting(key: string, value: string) {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    key,
    value,
    nowISO(),
  );
}

/* ------------------------------------------------------------------ */
/* Backup / restore                                                    */
/* ------------------------------------------------------------------ */

const BACKUP_TABLES = [
  'settings',
  'wallets',
  'categories',
  'transactions',
  'budgets',
  'recurring_rules',
  'goals',
  'goal_contributions',
  'debts',
  'debt_payments',
  'wishlist',
];

export type Snapshot = {
  app: 'dompet';
  version: 1;
  exported_at: string;
  data: Record<string, Record<string, unknown>[]>;
};

export async function exportSnapshot(): Promise<Snapshot> {
  const db = await getDb();
  const data: Record<string, Record<string, unknown>[]> = {};
  for (const table of BACKUP_TABLES) {
    data[table] = await db.getAllAsync<Record<string, unknown>>(`SELECT * FROM ${table}`);
  }
  return { app: 'dompet', version: 1, exported_at: nowISO(), data };
}

export async function importSnapshot(snapshot: Snapshot, replace = true) {
  if (snapshot?.app !== 'dompet' || !snapshot.data) {
    throw new Error('File backup tidak dikenali.');
  }
  const db = await getDb();
  // Foreign keys are temporarily off so rows can be inserted in any order
  // (a subcategory may appear before its parent in the file) and the whole
  // restore stays atomic: either everything lands or nothing changes.
  await db.execAsync('PRAGMA foreign_keys = OFF');
  try {
    await db.withTransactionAsync(async () => {
      if (replace) {
        for (const table of [...BACKUP_TABLES].reverse()) {
          await db.execAsync(`DELETE FROM ${table}`);
        }
      }
      for (const table of BACKUP_TABLES) {
        const rows = snapshot.data[table];
        if (!Array.isArray(rows) || rows.length === 0) continue;
        const columns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
        const allowed = new Set(columns.map((c) => c.name));
        for (const row of rows) {
          const keys = Object.keys(row).filter((k) => allowed.has(k));
          if (!keys.length) continue;
          const placeholders = keys.map(() => '?').join(', ');
          await db.runAsync(
            `INSERT OR REPLACE INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`,
            keys.map((k) => (row[k] === undefined ? null : (row[k] as never))),
          );
        }
      }
    });
  } finally {
    await db.execAsync('PRAGMA foreign_keys = ON');
  }
  notifyChanged();
}

/** CSV of transactions for spreadsheet exports. */
export async function exportTransactionsCsv(): Promise<string> {
  const rows = await listTransactions({ limit: 100000 });
  const header = ['Tanggal', 'Tipe', 'Dompet', 'Tujuan', 'Kategori', 'Jumlah', 'Biaya', 'Catatan', 'Merchant'];
  const lines = [header.join(',')];
  for (const t of rows) {
    const cells = [
      t.date,
      t.type,
      t.wallet_name,
      t.to_wallet_name ?? '',
      t.category_name ?? '',
      String(t.amount),
      String(t.fee),
      t.note ?? '',
      t.payee ?? '',
    ].map((cell) => `"${cell.replace(/"/g, '""')}"`);
    lines.push(cells.join(','));
  }
  return lines.join('\n');
}

/** Suggests the most used category for a given merchant/note. */
export async function suggestCategory(text: string): Promise<string | null> {
  if (!text.trim()) return null;
  const db = await getDb();
  const row = await db.getFirstAsync<{ category_id: string }>(
    `SELECT category_id, COUNT(*) AS c FROM transactions
     WHERE deleted_at IS NULL AND type = 'expense' AND category_id IS NOT NULL
       AND (note LIKE ? OR payee LIKE ?)
     GROUP BY category_id ORDER BY c DESC LIMIT 1`,
    `%${text.trim()}%`,
    `%${text.trim()}%`,
  );
  return row?.category_id ?? null;
}

export function upcomingDays(days: number) {
  return lastNDays(days);
}
